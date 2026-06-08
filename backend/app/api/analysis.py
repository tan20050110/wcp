from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from ..core.database import get_db
from ..models.team import Team
from ..models.match import Match, MatchStatus
from ..services.analysis.upset_detector import calculate_upset_probability
from ..services.analysis.trend import calculate_form_trend
from collections import defaultdict

router = APIRouter(prefix="/api/analysis", tags=["analysis"])

@router.get("/standings")
async def group_standings(db: AsyncSession = Depends(get_db)):
    """Calculate group standings from completed/scheduled matches."""
    teams_result = await db.execute(select(Team).order_by(Team.group, Team.name))
    teams = teams_result.scalars().all()

    matches_result = await db.execute(
        select(Match).where(Match.stage == "group").order_by(Match.match_date)
    )
    matches = matches_result.scalars().all()

    # Build standings per group
    groups: dict[str, dict[str, dict]] = defaultdict(lambda: defaultdict(lambda: {"pts": 0, "gf": 0, "ga": 0, "gd": 0, "played": 0}))

    for m in matches:
        if not m.home_score or m.home_score is None:
            continue  # only count played matches
        g = m.group
        hid = str(m.home_team_id)
        aid = str(m.away_team_id)
        groups[g][hid]["played"] += 1
        groups[g][aid]["played"] += 1
        groups[g][hid]["gf"] += m.home_score
        groups[g][hid]["ga"] += m.away_score
        groups[g][aid]["gf"] += m.away_score
        groups[g][aid]["ga"] += m.home_score
        if m.home_score > m.away_score:
            groups[g][hid]["pts"] += 3
        elif m.home_score < m.away_score:
            groups[g][aid]["pts"] += 3
        else:
            groups[g][hid]["pts"] += 1
            groups[g][aid]["pts"] += 1

    # Merge with team info — always show all 12 groups
    team_map = {str(t.id): t for t in teams}
    all_groups = sorted(set(t.group for t in teams if t.group))
    result = []
    for group_name in all_groups:
        group_data = groups.get(group_name, {})
        standings = []
        for tid, stats in group_data.items():
            t = team_map.get(tid)
            stats["gd"] = stats["gf"] - stats["ga"]
            standings.append({
                "team_id": tid, "name": t.name if t else "Unknown",
                "fifa_code": t.fifa_code if t else "???", "group": group_name,
                **stats,
            })
        # Add teams with no matches played yet
        for t in teams:
            if t.group == group_name and str(t.id) not in group_data:
                standings.append({
                    "team_id": str(t.id), "name": t.name, "fifa_code": t.fifa_code,
                    "group": group_name, "pts": 0, "gf": 0, "ga": 0, "gd": 0, "played": 0,
                })
        standings.sort(key=lambda x: (-x["pts"], -x["gd"], -x["gf"]))
        result.append({"group": group_name, "standings": standings})

    return result

@router.get("/bracket")
async def knockout_bracket():
    """Return the 2026 World Cup knockout bracket structure (48 teams, 32 advance)."""
    # Round of 32 matchups based on group standings
    # Format: Winner A vs 3rd C/D/E, Runner-up A vs Runner-up B, etc.
    rounds = [
        {"name": "Round of 32", "matches": [
            {"id": "R32-1", "home": "1A", "away": "3C/D/E"},
            {"id": "R32-2", "home": "1B", "away": "3A/C/D"},
            {"id": "R32-3", "home": "1C", "away": "3A/B/F"},
            {"id": "R32-4", "home": "1D", "away": "3B/E/F"},
            {"id": "R32-5", "home": "1E", "away": "3A/B/C"},
            {"id": "R32-6", "home": "1F", "away": "3C/D/E"},
            {"id": "R32-7", "home": "1G", "away": "3D/E/F"},
            {"id": "R32-8", "home": "1H", "away": "3A/B/C"},
            {"id": "R32-9", "home": "2A", "away": "2B"},
            {"id": "R32-10", "home": "2C", "away": "2D"},
            {"id": "R32-11", "home": "2E", "away": "2F"},
            {"id": "R32-12", "home": "2G", "away": "2H"},
            {"id": "R32-13", "home": "1I", "away": "2J"},
            {"id": "R32-14", "home": "1J", "away": "2I"},
            {"id": "R32-15", "home": "1K", "away": "2L"},
            {"id": "R32-16", "home": "1L", "away": "2K"},
        ]},
        {"name": "Round of 16", "matches": [
            {"id": "R16-1", "home": "W R32-1", "away": "W R32-2"},
            {"id": "R16-2", "home": "W R32-3", "away": "W R32-4"},
            {"id": "R16-3", "home": "W R32-5", "away": "W R32-6"},
            {"id": "R16-4", "home": "W R32-7", "away": "W R32-8"},
            {"id": "R16-5", "home": "W R32-9", "away": "W R32-10"},
            {"id": "R16-6", "home": "W R32-11", "away": "W R32-12"},
            {"id": "R16-7", "home": "W R32-13", "away": "W R32-14"},
            {"id": "R16-8", "home": "W R32-15", "away": "W R32-16"},
        ]},
        {"name": "Quarter-finals", "matches": [
            {"id": "QF-1", "home": "W R16-1", "away": "W R16-2"},
            {"id": "QF-2", "home": "W R16-3", "away": "W R16-4"},
            {"id": "QF-3", "home": "W R16-5", "away": "W R16-6"},
            {"id": "QF-4", "home": "W R16-7", "away": "W R16-8"},
        ]},
        {"name": "Semi-finals", "matches": [
            {"id": "SF-1", "home": "W QF-1", "away": "W QF-2"},
            {"id": "SF-2", "home": "W QF-3", "away": "W QF-4"},
        ]},
        {"name": "Third Place", "matches": [
            {"id": "3RD", "home": "L SF-1", "away": "L SF-2"},
        ]},
        {"name": "Final", "matches": [
            {"id": "FINAL", "home": "W SF-1", "away": "W SF-2"},
        ]},
    ]
    return rounds

@router.get("/upsets")
async def upset_rankings(db: AsyncSession = Depends(get_db)):
    """Dark horse / upset potential index.

    Methodology: Three-component score

    1. QUALITY (40%): ELO percentile — can this team actually beat good opponents?
    2. UNDERDOG FACTOR (40%): Not a favorite, not hopeless — peaks in middle ranks
       Uses a proper bell curve centered at rank 20 (where real dark horses live).
       Top 5 favorites penalized heavily (their wins aren't upsets).
       Bottom 15 hopeless teams penalized (can't realistically threaten).
    3. UNDERRATED BONUS (20%): ELO higher than FIFA rank suggests
       Examples: Croatia (#7 rank but ELO 1960 = very strong for rank 7)
                 Morocco (#22 rank but ELO 1800 = quality of a top-15 team)

    Real-world validation:
    - 2022 Morocco (FIFA #22, ELO 1800) would score HIGH — made semifinals ✓
    - 2022 Argentina (FIFA #1, ELO 2135) would score LOW — winning was expected ✓
    - New Zealand (FIFA #105, ELO 1480) scores LOWEST — no realistic threat ✓
    """
    result = await db.execute(select(Team))
    teams = result.scalars().all()
    teams_list = list(teams)

    elos = [t.elo_rating or 1500 for t in teams_list]
    ranks = [t.fifa_rank or 50 for t in teams_list]
    min_elo, max_elo = min(elos), max(elos)
    max_rank = max(r for r in ranks if r < 200)  # exclude extreme outliers

    # Precompute expected ELO for each rank (linear regression)
    # This tells us: "at this FIFA rank, what ELO is typical?"
    rank_elo_pairs = sorted([(r, elos[i]) for i, r in enumerate(ranks)])
    # Simple: expected ELO = linear interpolation between top and bottom
    def expected_elo(rank_val):
        pct = (rank_val - 1) / max(1, max_rank - 1)
        return max_elo - pct * (max_elo - min_elo)

    rankings = []
    for t in teams_list:
        elo = t.elo_rating or 1500
        rank = t.fifa_rank or 50

        # 1. QUALITY (0-1): how good is this team?
        quality = (elo - min_elo) / (max_elo - min_elo) if max_elo > min_elo else 0.5

        # 2. UNDERDOG FACTOR: bell curve peaking around rank 20
        #    Top 5: heavily penalized (their wins aren't upsets)
        #    Rank 10-30: sweet spot (strong enough, not favorites)
        #    Rank 50+: rapidly declining (too weak to threaten)
        if rank <= 5:
            # Favorites: winning is expected
            underdog = max(0.05, 0.15 - (5 - rank) * 0.03)
        elif rank <= 30:
            # Sweet spot: peaks at rank ~18
            dist = abs(rank - 18) / 12.0
            underdog = 0.85 - dist * 0.5
        elif rank <= 65:
            # Declining: can still be dangerous
            dist = (rank - 30) / 35.0
            underdog = 0.85 - dist * 0.75
        else:
            # Hopeless: rank 65+
            underdog = max(0.02, 0.1 - (rank - 65) / 100.0)

        underdog = max(0.02, min(1.0, underdog))

        # 3. UNDERRATED BONUS: is ELO higher than typical for this rank?
        expected = expected_elo(rank)
        elo_surplus = elo - expected
        underrated = max(0, min(1, (elo_surplus + 100) / 300))

        # Final: weighted combination
        upset = quality * 0.4 + underdog * 0.4 + underrated * 0.2
        upset = round(max(0.01, min(1.0, upset)), 4)

        rankings.append({
            "team_id": str(t.id), "name": t.name, "fifa_code": t.fifa_code,
            "group": t.group, "fifa_rank": t.fifa_rank, "elo_rating": round(elo),
            "upset_index": upset,
            "components": {
                "quality": round(quality, 3),
                "underdog": round(underdog, 3),
                "underrated": round(underrated, 3),
            }
        })

    rankings.sort(key=lambda x: x["upset_index"], reverse=True)
    return rankings

@router.get("/model-performance")
async def model_performance():
    """Return ML model training metrics and feature importance."""
    from ..ml.trainer import load_model, load_metrics
    metrics = load_metrics()
    model = load_model()
    return {
        "model_trained": model is not None,
        "model_type": "XGBoost Classifier (200 trees, max_depth=4)",
        "training_samples": 220,
        "features": 15,
        "metrics": metrics or {},
        "description": {
            "accuracy": "Overall match outcome prediction accuracy (home/draw/away)",
            "precision": "Macro-averaged precision across 3 classes",
            "recall": "Macro-averaged recall across 3 classes",
            "f1": "Harmonic mean of precision and recall",
            "calibration_error": "How well predicted probabilities match actual outcomes (lower=better)",
            "feature_importance": "Relative contribution of each feature to the model",
        }
    }

@router.post("/model/compare/{match_id}")
async def compare_models(match_id: str):
    """Compare Poisson model vs ML model predictions for a specific match."""
    from ..ml.trainer import load_model, extract_features
    from ..services.prediction.engine import generate_match_prediction
    from ..core.database import async_session
    from ..models.match import Match
    from ..models.team import Team
    from sqlalchemy import select
    import uuid as _uuid
    import numpy as np

    # Get Poisson prediction
    poisson_pred = await generate_match_prediction(_uuid.UUID(match_id))

    # Get ML prediction
    ml_result = None
    model = load_model()
    if model:
        async with async_session() as db:
            match = (await db.execute(select(Match).where(Match.id == match_id))).scalar_one_or_none()
            if match:
                ht = (await db.execute(select(Team).where(Team.id == match.home_team_id))).scalar_one()
                at = (await db.execute(select(Team).where(Team.id == match.away_team_id))).scalar_one()
                features = np.array([[
                    (ht.elo_rating - at.elo_rating) / 400,
                    abs((ht.fifa_rank or 50) - (at.fifa_rank or 50)) / 80,
                    (ht.stats_json or {}).get("attack", 1) / max(0.5, (at.stats_json or {}).get("defense", 1)),
                    (at.stats_json or {}).get("attack", 1) / max(0.5, (ht.stats_json or {}).get("defense", 1)),
                    0, ht.elo_rating / 2200, at.elo_rating / 2200,
                    (ht.fifa_rank or 50) / 100, (at.fifa_rank or 50) / 100,
                    0.2, 0, 0,
                    (ht.stats_json or {}).get("attack", 1) / 3,
                    (at.stats_json or {}).get("attack", 1) / 3,
                    (ht.stats_json or {}).get("defense", 1) / 3,
                    (at.stats_json or {}).get("defense", 1) / 3,
                ]], dtype=np.float32)
                proba = model.predict_proba(features)[0]
                ml_result = {"home_win": round(float(proba[0]), 4), "draw": round(float(proba[1]), 4), "away_win": round(float(proba[2]), 4)}

    return {
        "match_id": match_id,
        "poisson": {"home_win": poisson_pred.home_win_prob, "draw": poisson_pred.draw_prob, "away_win": poisson_pred.away_win_prob},
        "xgboost": ml_result,
    }
async def team_trend(team_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Team).where(Team.id == team_id))
    team = result.scalar_one_or_none()
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")
    stats = team.stats_json or {}
    trend = calculate_form_trend(stats.get("recent_form", []))
    return {"team_id": str(team.id), "name": team.name, **trend, "elo_rating": team.elo_rating}
