from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from ..core.database import get_db
from ..models.team import Team
from ..schemas.team import TeamCreate, TeamResponse, TeamDetailResponse
from typing import Optional

router = APIRouter(prefix="/api/teams", tags=["teams"])

@router.get("", response_model=list[TeamResponse])
async def list_teams(
    group: Optional[str] = Query(None, max_length=1),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(Team).order_by(Team.fifa_rank)
    if group:
        stmt = stmt.where(Team.group == group.upper())
    result = await db.execute(stmt)
    return result.scalars().all()

@router.get("/{team_id}", response_model=TeamDetailResponse)
async def get_team(team_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Team).where(Team.id == team_id))
    team = result.scalar_one_or_none()
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")
    return team

@router.post("", response_model=TeamResponse, status_code=201)
async def create_team(body: TeamCreate, db: AsyncSession = Depends(get_db)):
    team = Team(**body.model_dump())
    db.add(team)
    await db.commit()
    await db.refresh(team)
    return team
