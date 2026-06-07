from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from ..core.database import get_db
from ..models.team import Team
from ..services.analysis.upset_detector import calculate_upset_probability
from ..services.analysis.trend import calculate_form_trend

router = APIRouter(prefix="/api/analysis", tags=["analysis"])

@router.get("/upsets")
async def upset_rankings(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Team))
    teams = result.scalars().all()
    rankings = []
    for t in teams:
        upset_index = round(abs((t.fifa_rank or 50) - 50) / 100 + (2000 - (t.elo_rating or 1500)) / 2000, 3)
        rankings.append({
            "team_id": str(t.id), "name": t.name, "fifa_code": t.fifa_code,
            "upset_index": max(0, min(1, upset_index))
        })
    rankings.sort(key=lambda x: x["upset_index"], reverse=True)
    return rankings[:10]

@router.get("/trends/{team_id}")
async def team_trend(team_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Team).where(Team.id == team_id))
    team = result.scalar_one_or_none()
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")
    stats = team.stats_json or {}
    trend = calculate_form_trend(stats.get("recent_form", []))
    return {"team_id": str(team.id), "name": team.name, **trend, "elo_rating": team.elo_rating}
