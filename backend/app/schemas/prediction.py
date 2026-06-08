from pydantic import BaseModel
from uuid import UUID
from typing import Optional, Any
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
    score_matrix_json: Any = {}
    created_at: datetime

    class Config:
        from_attributes = True

class SimulationResponse(BaseModel):
    id: UUID
    run_at: datetime
    total_simulations: int
    results_json: Any = {}
    bracket_json: Any = {}

    class Config:
        from_attributes = True

class SimulateRequest(BaseModel):
    total_simulations: int = 10000


class LivePredictRequest(BaseModel):
    home_score: int = 0
    away_score: int = 0
    minute: int = 0  # 0–90, 0 = pre-match


class LivePredictResponse(BaseModel):
    home_win_prob: float
    draw_prob: float
    away_win_prob: float
    pred_final_home: float
    pred_final_away: float
    minute: int
    home_score: int
    away_score: int
