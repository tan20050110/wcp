from sqlalchemy import Column, String, Integer, DateTime, Enum, ForeignKey
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
from .base import Base, UUIDMixin, TimestampMixin
import enum

class MatchStage(str, enum.Enum):
    GROUP = "group"
    ROUND16 = "round16"
    QUARTER = "quarter"
    SEMI = "semi"
    THIRD = "third"
    FINAL = "final"

class MatchStatus(str, enum.Enum):
    SCHEDULED = "scheduled"
    LIVE = "live"
    FINISHED = "finished"
    POSTPONED = "postponed"

class Match(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "matches"

    home_team_id = Column(UUID(as_uuid=True), ForeignKey("teams.id"), nullable=False)
    away_team_id = Column(UUID(as_uuid=True), ForeignKey("teams.id"), nullable=False)
    match_date = Column(DateTime(timezone=True), nullable=False)
    stage = Column(Enum(MatchStage), default=MatchStage.GROUP)
    group = Column(String(1), nullable=True)
    status = Column(Enum(MatchStatus), default=MatchStatus.SCHEDULED)
    home_score = Column(Integer, nullable=True)
    away_score = Column(Integer, nullable=True)
    venue = Column(String(200), nullable=True)
    venue_meta_json = Column(JSONB, default=dict)

    home_team = relationship("Team", foreign_keys=[home_team_id], back_populates="home_matches")
    away_team = relationship("Team", foreign_keys=[away_team_id], back_populates="away_matches")
    predictions = relationship("Prediction", back_populates="match", cascade="all, delete-orphan")
