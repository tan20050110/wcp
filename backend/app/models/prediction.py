from sqlalchemy import Column, String, Integer, Float, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
from .base import Base, UUIDMixin, TimestampMixin

class Prediction(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "predictions"

    match_id = Column(UUID(as_uuid=True), ForeignKey("matches.id"), nullable=False)
    model_type = Column(String(20), default="poisson_ml")
    pred_home_score = Column(Float, nullable=False)
    pred_away_score = Column(Float, nullable=False)
    home_win_prob = Column(Float, nullable=False)
    draw_prob = Column(Float, nullable=False)
    away_win_prob = Column(Float, nullable=False)
    score_matrix_json = Column(JSONB, default=dict)

    match = relationship("Match", back_populates="predictions")

class Simulation(Base, UUIDMixin):
    __tablename__ = "simulations"

    run_at = Column(DateTime(timezone=True), nullable=False)
    total_simulations = Column(Integer, default=10000)
    results_json = Column(JSONB, default=dict)
    bracket_json = Column(JSONB, default=dict)
