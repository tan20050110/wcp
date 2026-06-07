import uuid
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from ..core.database import get_db
from ..models.prediction import Prediction, Simulation
from ..models.team import Team
from ..models.match import Match
from ..schemas.prediction import PredictionResponse, SimulationResponse, SimulateRequest
from ..services.prediction.engine import generate_match_prediction
from ..services.prediction.simulator import run_tournament_simulation
from ..services.prediction.poisson import predict_match as pm

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

@router.post("/simulate", response_model=SimulationResponse, status_code=201)
async def trigger_simulation(body: SimulateRequest, db: AsyncSession = Depends(get_db)):
    teams_result = await db.execute(select(Team))
    teams = [{"id": str(t.id), "elo": t.elo_rating or 1500, "name": t.name}
             for t in teams_result.scalars().all()]

    matches_result = await db.execute(select(Match).where(Match.stage == "group"))
    group_matches = []
    for m in matches_result.scalars().all():
        ht = (await db.execute(select(Team).where(Team.id == m.home_team_id))).scalar_one()
        at = (await db.execute(select(Team).where(Team.id == m.away_team_id))).scalar_one()
        group_matches.append({
            "home_id": str(m.home_team_id), "away_id": str(m.away_team_id),
            "home_elo": ht.elo_rating or 1500, "away_elo": at.elo_rating or 1500,
        })

    result = run_tournament_simulation(teams, group_matches, [], pm, body.total_simulations)

    sim = Simulation(
        run_at=datetime.now(timezone.utc),
        total_simulations=body.total_simulations,
        results_json={
            "champions": result.champion_probs,
            "finalists": result.final_probs,
            "semifinalists": result.semi_probs
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
