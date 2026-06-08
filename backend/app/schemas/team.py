from pydantic import BaseModel
from uuid import UUID
from typing import Optional, Any
from datetime import datetime

class TeamBase(BaseModel):
    name: str
    fifa_code: str
    group: Optional[str] = None
    fifa_rank: Optional[int] = None
    elo_rating: Optional[float] = None
    flag_url: Optional[str] = None
    coach_name: Optional[str] = None

class TeamCreate(TeamBase):
    pass

class TeamResponse(TeamBase):
    id: UUID
    squad_json: Any = {}
    stats_json: Any = {}
    availability_json: Any = {}
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class TeamDetailResponse(TeamResponse):
    recent_matches: list = []
    prediction_summary: Optional[dict] = None
