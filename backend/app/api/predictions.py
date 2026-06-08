import uuid
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from ..core.database import get_db
from ..models.prediction import Prediction, Simulation
from ..models.team import Team
from ..models.match import Match
from ..schemas.prediction import PredictionResponse, SimulationResponse, SimulateRequest, LivePredictRequest, LivePredictResponse
from ..services.prediction.engine import generate_match_prediction
from ..services.prediction.simulator import run_tournament_simulation
from ..services.prediction.poisson import predict_match as pm, live_predict

router = APIRouter(prefix="/api/predictions", tags=["predictions"])

@router.get("/match/{match_id}", response_model=PredictionResponse)
async def get_match_prediction(match_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Prediction).where(Prediction.match_id == match_id)
        .order_by(Prediction.created_at.desc()).limit(1)
    )
    pred = result.scalar_one_or_none()
    if not pred:
        pred = await generate_match_prediction(uuid.UUID(match_id))
    return pred

@router.post("/match/{match_id}/refresh", response_model=PredictionResponse)
async def refresh_prediction(match_id: str):
    pred = await generate_match_prediction(uuid.UUID(match_id))
    return pred


@router.post("/match/{match_id}/live", response_model=LivePredictResponse)
async def live_prediction(match_id: str, body: LivePredictRequest, db: AsyncSession = Depends(get_db)):
    """In-play prediction: recalculates win probability given current score + minute."""
    match = (await db.execute(select(Match).where(Match.id == match_id))).scalar_one_or_none()
    if not match:
        raise HTTPException(404, "Match not found")

    home = (await db.execute(select(Team).where(Team.id == match.home_team_id))).scalar_one()
    away = (await db.execute(select(Team).where(Team.id == match.away_team_id))).scalar_one()

    hs = home.stats_json or {}
    aws = away.stats_json or {}

    result = live_predict(
        home_elo=home.elo_rating or 1500,
        away_elo=away.elo_rating or 1500,
        home_attack=hs.get("attack", 1.0),
        away_defense=aws.get("defense", 1.0),
        away_attack=aws.get("attack", 1.0),
        home_defense=hs.get("defense", 1.0),
        home_goals=body.home_score,
        away_goals=body.away_score,
        minute=body.minute,
    )

    return LivePredictResponse(
        home_win_prob=result.home_win_prob,
        draw_prob=result.draw_prob,
        away_win_prob=result.away_win_prob,
        pred_final_home=result.pred_home_score,
        pred_final_away=result.pred_away_score,
        minute=body.minute,
        home_score=body.home_score,
        away_score=body.away_score,
    )

@router.post("/simulate", response_model=SimulationResponse, status_code=201)
async def trigger_simulation(body: SimulateRequest, db: AsyncSession = Depends(get_db)):
    teams_result = await db.execute(select(Team))
    all_teams = teams_result.scalars().all()
    teams = [{"id": str(t.id), "elo": t.elo_rating or 1500, "name": t.name,
              "code": t.fifa_code, "group": t.group or "Z",
              "attack": (t.stats_json or {}).get("attack", 1.0),
              "defense": (t.stats_json or {}).get("defense", 1.0)}
             for t in all_teams]

    matches_result = await db.execute(select(Match).where(Match.stage == "group"))
    group_matches = [{
        "home_id": str(m.home_team_id), "away_id": str(m.away_team_id),
        "group": m.group or "",
    } for m in matches_result.scalars().all()]

    result = run_tournament_simulation(teams, group_matches, [], pm, body.total_simulations)

    # Convert UUID keys to readable team names with codes
    team_map = {t["id"]: {"name": t["name"], "code": t.get("code", "")} for t in teams}
    # Also map by name for existing simulation results
    team_map_by_name = {t["name"]: t for t in teams}

    def name_champions(probs):
        named = {}
        for tid, prob in probs.items():
            info = team_map.get(tid, {})
            name = info.get("name", tid)
            if name:
                named[name] = prob
        return dict(sorted(named.items(), key=lambda x: -x[1]))

    sim = Simulation(
        run_at=datetime.now(timezone.utc),
        total_simulations=body.total_simulations,
        results_json={
            "champions": name_champions(result.champion_probs),
            "finalists": name_champions(result.final_probs),
            "semifinalists": name_champions(result.semi_probs)
        },
        bracket_json=result.bracket,
    )
    db.add(sim)
    await db.commit()
    await db.refresh(sim)
    return sim

@router.get("/simulate/{sim_id}", response_model=SimulationResponse)
async def get_simulation(sim_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Simulation).where(Simulation.id == sim_id))
    sim = result.scalar_one_or_none()
    if not sim:
        raise HTTPException(status_code=404, detail="Simulation not found")
    return sim
