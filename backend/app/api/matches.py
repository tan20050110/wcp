from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_
from sqlalchemy.orm import selectinload
from ..core.database import get_db
from ..models.match import Match, MatchStatus
from ..schemas.match import MatchCreate, MatchResponse, MatchDetailResponse
from typing import Optional

router = APIRouter(prefix="/api/matches", tags=["matches"])

@router.get("", response_model=list[MatchResponse])
async def list_matches(
    stage: Optional[str] = None,
    group: Optional[str] = None,
    status: Optional[str] = None,
    team_id: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
):
    stmt = select(Match).order_by(Match.match_date)
    if stage:
        stmt = stmt.where(Match.stage == stage)
    if group:
        stmt = stmt.where(Match.group == group.upper())
    if status:
        stmt = stmt.where(Match.status == status)
    if team_id:
        stmt = stmt.where(or_(Match.home_team_id == team_id, Match.away_team_id == team_id))
    result = await db.execute(stmt.options(selectinload(Match.home_team), selectinload(Match.away_team)))
    return result.scalars().all()

@router.get("/live", response_model=list[MatchResponse])
async def live_matches(db: AsyncSession = Depends(get_db)):
    stmt = select(Match).where(Match.status == MatchStatus.LIVE).order_by(Match.match_date)
    result = await db.execute(stmt.options(selectinload(Match.home_team), selectinload(Match.away_team)))
    return result.scalars().all()

@router.get("/{match_id}", response_model=MatchDetailResponse)
async def get_match(match_id: str, db: AsyncSession = Depends(get_db)):
    stmt = select(Match).where(Match.id == match_id).options(
        selectinload(Match.home_team), selectinload(Match.away_team), selectinload(Match.predictions)
    )
    result = await db.execute(stmt)
    match = result.scalar_one_or_none()
    if not match:
        raise HTTPException(status_code=404, detail="Match not found")
    return match

@router.post("", response_model=MatchResponse, status_code=201)
async def create_match(body: MatchCreate, db: AsyncSession = Depends(get_db)):
    match = Match(**body.model_dump())
    db.add(match)
    await db.commit()
    await db.refresh(match)
    return match
