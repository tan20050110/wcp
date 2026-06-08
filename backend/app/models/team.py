from sqlalchemy import Column, String, Integer, Float
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
from .base import Base, UUIDMixin, TimestampMixin

class Team(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "teams"

    name = Column(String(100), nullable=False)
    fifa_code = Column(String(3), unique=True, nullable=False)
    group = Column(String(1), nullable=True)
    fifa_rank = Column(Integer, nullable=True)
    elo_rating = Column(Float, nullable=True)
    flag_url = Column(String(500), nullable=True)
    coach_name = Column(String(100), nullable=True)
    squad_json = Column(JSONB, default=list)
    stats_json = Column(JSONB, default=dict)
    availability_json = Column(JSONB, default=dict)

    home_matches = relationship("Match", foreign_keys="Match.home_team_id", back_populates="home_team")
    away_matches = relationship("Match", foreign_keys="Match.away_team_id", back_populates="away_team")
