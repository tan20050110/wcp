from pydantic import BaseModel
from uuid import UUID
from typing import Optional
from datetime import datetime

class PredictionResponse(BaseModel):
    id: UUID
    match_id: UUID
    model_type: str
    pred_home_score: float
    pred_away_score: float
    home_win_prob: float
    draw_prob: float
    away_win_prob: float
    score_matrix_json: dict = {}
    created_at: datetime

    class Config:
        from_attributes = True

class SimulationResponse(BaseModel):
    id: UUID
    run_at: datetime
    total_simulations: int
    results_json: dict = {}
    bracket_json: dict = {}

    class Config:
        from_attributes = True

class SimulateRequest(BaseModel):
    total_simulations: int = 10000
