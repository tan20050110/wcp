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
    matches = result.scalars().all()
    return [_serialize_match(m) for m in matches]

def _serialize_match(m: Match) -> dict:
    return {
        "id": str(m.id), "home_team_id": str(m.home_team_id), "away_team_id": str(m.away_team_id),
        "match_date": m.match_date.isoformat(), "stage": m.stage.value, "group": m.group,
        "status": m.status.value, "home_score": m.home_score, "away_score": m.away_score,
        "venue": m.venue, "venue_meta_json": m.venue_meta_json or {},
        "home_team": {"name": m.home_team.name, "fifa_code": m.home_team.fifa_code, "flag_url": m.home_team.flag_url} if m.home_team else None,
        "away_team": {"name": m.away_team.name, "fifa_code": m.away_team.fifa_code, "flag_url": m.away_team.flag_url} if m.away_team else None,
        "created_at": m.created_at.isoformat(), "updated_at": m.updated_at.isoformat(),
    }

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
