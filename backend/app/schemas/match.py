from pydantic import BaseModel
from uuid import UUID
from typing import Optional
from datetime import datetime

class MatchBase(BaseModel):
    home_team_id: UUID
    away_team_id: UUID
    match_date: datetime
    stage: str = "group"
    group: Optional[str] = None
    venue: Optional[str] = None

class MatchCreate(MatchBase):
    pass

class MatchResponse(MatchBase):
    id: UUID
    status: str
    home_score: Optional[int] = None
    away_score: Optional[int] = None
    venue_meta_json: dict = {}
    home_team: Optional[dict] = None
    away_team: Optional[dict] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class MatchDetailResponse(MatchResponse):
    predictions: list = []
