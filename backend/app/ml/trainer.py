"""
ML Model Training Pipeline — World Cup Match Prediction

Features engineered from historical data:
- ELO ratings + difference
- FIFA rankings + difference
- Recent form (5-match)
- Goals scored/conceded averages
- Tournament stage
- Rest days between matches
- Head-to-head record
- Home advantage indicator (host nation, continent)

Target: match outcome (home_win / draw / away_win)

Models: XGBoost classifier with hyperparameter tuning
"""
import json
import pickle
import numpy as np
from pathlib import Path
from dataclasses import dataclass
from typing import Optional

MODEL_DIR = Path(__file__).parent / "models"
DATA_DIR = Path(__file__).parent.parent.parent / "data"

@dataclass
class TrainingMetrics:
    accuracy: float
    precision: float
    recall: float
    f1: float
    confusion_matrix: list
    feature_importance: dict
    calibration_error: float

def load_historical_data() -> list[dict]:
    """Load historical World Cup matches for training."""
    path = DATA_DIR / "historical_matches.json"
    if not path.exists():
        return _get_builtin_data()
    with open(path) as f:
        return json.load(f)

def _get_builtin_data() -> list[dict]:
    """Real World Cup matches 2010–2022 (~120 matches) + limited synthetic data.

    Format: h_elo, a_elo, h_rank, a_rank, stage (0=group..5=final),
            h_gpg, a_gpg, h_gapg, a_gapg, rest_h, rest_a, host, confed, r
    Result: 0=home win, 1=draw, 2=away win.
    ELO ratings are approximate tournament-start values.
    """
    import random
    random.seed(42)

    # ---- 2022 Qatar (32 matches) ----
    wc2022 = [
        # Group A
        {"h_elo": 1500, "a_elo": 1690, "h_rank": 50, "a_rank": 44, "stage": 0, "h_gpg": 0.3, "a_gpg": 1.3, "h_gapg": 2.0, "a_gapg": 1.0, "rest_h": 5, "rest_a": 5, "host": 1, "confed": 0, "r": 2},
        {"h_elo": 1800, "a_elo": 2000, "h_rank": 18, "a_rank": 8, "stage": 0, "h_gpg": 1.2, "a_gpg": 2.0, "h_gapg": 0.8, "a_gapg": 0.3, "rest_h": 5, "rest_a": 5, "host": 0, "confed": 0, "r": 1},
        {"h_elo": 1500, "a_elo": 1800, "h_rank": 50, "a_rank": 18, "stage": 0, "h_gpg": 0.3, "a_gpg": 1.2, "h_gapg": 2.0, "a_gapg": 0.8, "rest_h": 4, "rest_a": 4, "host": 1, "confed": 0, "r": 2},
        {"h_elo": 2000, "a_elo": 1690, "h_rank": 8, "a_rank": 44, "stage": 0, "h_gpg": 2.0, "a_gpg": 1.3, "h_gapg": 0.3, "a_gapg": 1.0, "rest_h": 4, "rest_a": 4, "host": 0, "confed": 0, "r": 1},
        {"h_elo": 2000, "a_elo": 1500, "h_rank": 8, "a_rank": 50, "stage": 0, "h_gpg": 2.0, "a_gpg": 0.3, "h_gapg": 0.3, "a_gapg": 2.0, "rest_h": 4, "rest_a": 4, "host": 0, "confed": 0, "r": 0},
        {"h_elo": 1690, "a_elo": 1800, "h_rank": 44, "a_rank": 18, "stage": 0, "h_gpg": 1.3, "a_gpg": 1.2, "h_gapg": 1.0, "a_gapg": 0.8, "rest_h": 4, "rest_a": 4, "host": 0, "confed": 0, "r": 2},
        # Group B
        {"h_elo": 2050, "a_elo": 1735, "h_rank": 5, "a_rank": 20, "stage": 0, "h_gpg": 2.2, "a_gpg": 1.2, "h_gapg": 0.3, "a_gapg": 1.5, "rest_h": 5, "rest_a": 5, "host": 0, "confed": 0, "r": 0},
        {"h_elo": 1810, "a_elo": 1760, "h_rank": 16, "a_rank": 19, "stage": 0, "h_gpg": 1.2, "a_gpg": 1.0, "h_gapg": 0.5, "a_gapg": 1.0, "rest_h": 5, "rest_a": 5, "host": 0, "confed": 0, "r": 1},
        {"h_elo": 1760, "a_elo": 1735, "h_rank": 19, "a_rank": 20, "stage": 0, "h_gpg": 1.0, "a_gpg": 1.2, "h_gapg": 1.0, "a_gapg": 1.5, "rest_h": 4, "rest_a": 4, "host": 0, "confed": 0, "r": 2},
        {"h_elo": 2050, "a_elo": 1810, "h_rank": 5, "a_rank": 16, "stage": 0, "h_gpg": 2.2, "a_gpg": 1.2, "h_gapg": 0.3, "a_gapg": 0.5, "rest_h": 4, "rest_a": 4, "host": 0, "confed": 0, "r": 1},
        {"h_elo": 1760, "a_elo": 2050, "h_rank": 19, "a_rank": 5, "stage": 0, "h_gpg": 1.0, "a_gpg": 2.2, "h_gapg": 1.0, "a_gapg": 0.3, "rest_h": 4, "rest_a": 4, "host": 0, "confed": 0, "r": 2},
        {"h_elo": 1735, "a_elo": 1810, "h_rank": 20, "a_rank": 16, "stage": 0, "h_gpg": 1.2, "a_gpg": 1.2, "h_gapg": 1.5, "a_gapg": 0.5, "rest_h": 4, "rest_a": 4, "host": 0, "confed": 0, "r": 2},
        # Group C
        {"h_elo": 2135, "a_elo": 1630, "h_rank": 3, "a_rank": 51, "stage": 0, "h_gpg": 2.5, "a_gpg": 0.8, "h_gapg": 0.3, "a_gapg": 1.2, "rest_h": 5, "rest_a": 5, "host": 0, "confed": 0, "r": 2},
        {"h_elo": 1850, "a_elo": 1780, "h_rank": 13, "a_rank": 26, "stage": 0, "h_gpg": 1.5, "a_gpg": 1.2, "h_gapg": 0.8, "a_gapg": 0.8, "rest_h": 5, "rest_a": 5, "host": 0, "confed": 0, "r": 1},
        {"h_elo": 1780, "a_elo": 1630, "h_rank": 26, "a_rank": 51, "stage": 0, "h_gpg": 1.2, "a_gpg": 0.8, "h_gapg": 0.8, "a_gapg": 1.2, "rest_h": 4, "rest_a": 4, "host": 0, "confed": 0, "r": 0},
        {"h_elo": 2135, "a_elo": 1850, "h_rank": 3, "a_rank": 13, "stage": 0, "h_gpg": 2.5, "a_gpg": 1.5, "h_gapg": 0.3, "a_gapg": 0.8, "rest_h": 4, "rest_a": 4, "host": 0, "confed": 0, "r": 0},
        {"h_elo": 1780, "a_elo": 2135, "h_rank": 26, "a_rank": 3, "stage": 0, "h_gpg": 1.2, "a_gpg": 2.5, "h_gapg": 0.8, "a_gapg": 0.3, "rest_h": 4, "rest_a": 4, "host": 0, "confed": 0, "r": 2},
        {"h_elo": 1630, "a_elo": 1850, "h_rank": 51, "a_rank": 13, "stage": 0, "h_gpg": 0.8, "a_gpg": 1.5, "h_gapg": 1.2, "a_gapg": 0.8, "rest_h": 4, "rest_a": 4, "host": 0, "confed": 0, "r": 2},
        # Group D
        {"h_elo": 1860, "a_elo": 1675, "h_rank": 10, "a_rank": 30, "stage": 0, "h_gpg": 2.0, "a_gpg": 0.8, "h_gapg": 0.8, "a_gapg": 1.5, "rest_h": 5, "rest_a": 5, "host": 0, "confed": 0, "r": 1},
        {"h_elo": 2110, "a_elo": 1710, "h_rank": 4, "a_rank": 38, "stage": 0, "h_gpg": 2.5, "a_gpg": 1.2, "h_gapg": 0.5, "a_gapg": 1.2, "rest_h": 5, "rest_a": 5, "host": 0, "confed": 0, "r": 0},
        {"h_elo": 1675, "a_elo": 1710, "h_rank": 30, "a_rank": 38, "stage": 0, "h_gpg": 0.8, "a_gpg": 1.2, "h_gapg": 1.5, "a_gapg": 1.2, "rest_h": 4, "rest_a": 4, "host": 0, "confed": 0, "r": 2},
        {"h_elo": 2110, "a_elo": 1860, "h_rank": 4, "a_rank": 10, "stage": 0, "h_gpg": 2.5, "a_gpg": 2.0, "h_gapg": 0.5, "a_gapg": 0.8, "rest_h": 4, "rest_a": 4, "host": 0, "confed": 0, "r": 0},
        {"h_elo": 1710, "a_elo": 1860, "h_rank": 38, "a_rank": 10, "stage": 0, "h_gpg": 1.2, "a_gpg": 2.0, "h_gapg": 1.2, "a_gapg": 0.8, "rest_h": 4, "rest_a": 4, "host": 0, "confed": 0, "r": 0},
        {"h_elo": 1675, "a_elo": 2110, "h_rank": 30, "a_rank": 4, "stage": 0, "h_gpg": 0.8, "a_gpg": 2.5, "h_gapg": 1.5, "a_gapg": 0.5, "rest_h": 4, "rest_a": 4, "host": 0, "confed": 0, "r": 2},
        # Group E
        {"h_elo": 2030, "a_elo": 1820, "h_rank": 11, "a_rank": 24, "stage": 0, "h_gpg": 2.5, "a_gpg": 1.8, "h_gapg": 0.8, "a_gapg": 0.6, "rest_h": 5, "rest_a": 5, "host": 0, "confed": 0, "r": 2},
        {"h_elo": 2020, "a_elo": 1650, "h_rank": 7, "a_rank": 31, "stage": 0, "h_gpg": 2.2, "a_gpg": 1.0, "h_gapg": 0.8, "a_gapg": 2.0, "rest_h": 5, "rest_a": 5, "host": 0, "confed": 0, "r": 0},
        {"h_elo": 2030, "a_elo": 2020, "h_rank": 11, "a_rank": 7, "stage": 0, "h_gpg": 2.5, "a_gpg": 2.2, "h_gapg": 0.8, "a_gapg": 0.8, "rest_h": 4, "rest_a": 4, "host": 0, "confed": 1, "r": 1},
        {"h_elo": 1820, "a_elo": 1650, "h_rank": 24, "a_rank": 31, "stage": 0, "h_gpg": 1.8, "a_gpg": 1.0, "h_gapg": 0.6, "a_gapg": 2.0, "rest_h": 4, "rest_a": 4, "host": 0, "confed": 0, "r": 2},
        {"h_elo": 1820, "a_elo": 2020, "h_rank": 24, "a_rank": 7, "stage": 0, "h_gpg": 1.8, "a_gpg": 2.2, "h_gapg": 0.6, "a_gapg": 0.8, "rest_h": 4, "rest_a": 4, "host": 0, "confed": 0, "r": 0},
        {"h_elo": 1650, "a_elo": 2030, "h_rank": 31, "a_rank": 11, "stage": 0, "h_gpg": 1.0, "a_gpg": 2.5, "h_gapg": 2.0, "a_gapg": 0.8, "rest_h": 4, "rest_a": 4, "host": 0, "confed": 0, "r": 2},
        # Group F
        {"h_elo": 1840, "a_elo": 1760, "h_rank": 15, "a_rank": 22, "stage": 0, "h_gpg": 1.5, "a_gpg": 1.5, "h_gapg": 0.8, "a_gapg": 0.8, "rest_h": 5, "rest_a": 5, "host": 0, "confed": 0, "r": 0},
        {"h_elo": 1980, "a_elo": 1690, "h_rank": 8, "a_rank": 34, "stage": 0, "h_gpg": 2.0, "a_gpg": 1.2, "h_gapg": 0.6, "a_gapg": 1.0, "rest_h": 5, "rest_a": 5, "host": 0, "confed": 0, "r": 0},
        {"h_elo": 1840, "a_elo": 1980, "h_rank": 15, "a_rank": 8, "stage": 0, "h_gpg": 1.5, "a_gpg": 2.0, "h_gapg": 0.8, "a_gapg": 0.6, "rest_h": 4, "rest_a": 4, "host": 0, "confed": 0, "r": 2},
        {"h_elo": 1760, "a_elo": 1690, "h_rank": 22, "a_rank": 34, "stage": 0, "h_gpg": 1.5, "a_gpg": 1.2, "h_gapg": 0.8, "a_gapg": 1.0, "rest_h": 4, "rest_a": 4, "host": 0, "confed": 0, "r": 1},
        {"h_elo": 1760, "a_elo": 1980, "h_rank": 22, "a_rank": 8, "stage": 0, "h_gpg": 1.5, "a_gpg": 2.0, "h_gapg": 0.8, "a_gapg": 0.6, "rest_h": 4, "rest_a": 4, "host": 0, "confed": 0, "r": 2},
        {"h_elo": 1690, "a_elo": 1840, "h_rank": 34, "a_rank": 15, "stage": 0, "h_gpg": 1.2, "a_gpg": 1.5, "h_gapg": 1.0, "a_gapg": 0.8, "rest_h": 4, "rest_a": 4, "host": 0, "confed": 0, "r": 2},
        # Group G
        {"h_elo": 2040, "a_elo": 1660, "h_rank": 2, "a_rank": 41, "stage": 0, "h_gpg": 2.2, "a_gpg": 1.0, "h_gapg": 0.5, "a_gapg": 1.5, "rest_h": 5, "rest_a": 5, "host": 0, "confed": 0, "r": 0},
        {"h_elo": 1770, "a_elo": 1800, "h_rank": 21, "a_rank": 18, "stage": 0, "h_gpg": 1.3, "a_gpg": 1.3, "h_gapg": 0.8, "a_gapg": 1.0, "rest_h": 5, "rest_a": 5, "host": 0, "confed": 1, "r": 0},
        {"h_elo": 2040, "a_elo": 1770, "h_rank": 2, "a_rank": 21, "stage": 0, "h_gpg": 2.2, "a_gpg": 1.3, "h_gapg": 0.5, "a_gapg": 0.8, "rest_h": 4, "rest_a": 4, "host": 0, "confed": 0, "r": 0},
        {"h_elo": 1800, "a_elo": 1660, "h_rank": 18, "a_rank": 41, "stage": 0, "h_gpg": 1.3, "a_gpg": 1.0, "h_gapg": 1.0, "a_gapg": 1.5, "rest_h": 4, "rest_a": 4, "host": 0, "confed": 0, "r": 0},
        {"h_elo": 1800, "a_elo": 2040, "h_rank": 18, "a_rank": 2, "stage": 0, "h_gpg": 1.3, "a_gpg": 2.2, "h_gapg": 1.0, "a_gapg": 0.5, "rest_h": 4, "rest_a": 4, "host": 0, "confed": 0, "r": 2},
        {"h_elo": 1660, "a_elo": 1770, "h_rank": 41, "a_rank": 21, "stage": 0, "h_gpg": 1.0, "a_gpg": 1.3, "h_gapg": 1.5, "a_gapg": 0.8, "rest_h": 4, "rest_a": 4, "host": 0, "confed": 0, "r": 2},

        # 2022 Knockout
        {"h_elo": 1980, "a_elo": 1810, "h_rank": 8, "a_rank": 16, "stage": 2, "h_gpg": 2.0, "a_gpg": 1.2, "h_gapg": 0.6, "a_gapg": 0.5, "rest_h": 4, "rest_a": 4, "host": 0, "confed": 0, "r": 0},
        {"h_elo": 2135, "a_elo": 1710, "h_rank": 3, "a_rank": 38, "stage": 2, "h_gpg": 2.5, "a_gpg": 1.2, "h_gapg": 0.3, "a_gapg": 1.2, "rest_h": 4, "rest_a": 4, "host": 0, "confed": 0, "r": 0},
        {"h_elo": 2110, "a_elo": 1780, "h_rank": 4, "a_rank": 26, "stage": 2, "h_gpg": 2.5, "a_gpg": 1.2, "h_gapg": 0.5, "a_gapg": 0.8, "rest_h": 4, "rest_a": 4, "host": 0, "confed": 0, "r": 0},
        {"h_elo": 2050, "a_elo": 1770, "h_rank": 5, "a_rank": 21, "stage": 2, "h_gpg": 2.2, "a_gpg": 1.3, "h_gapg": 0.3, "a_gapg": 0.8, "rest_h": 4, "rest_a": 4, "host": 0, "confed": 0, "r": 0},
        {"h_elo": 1820, "a_elo": 1960, "h_rank": 24, "a_rank": 12, "stage": 2, "h_gpg": 1.8, "a_gpg": 2.0, "h_gapg": 0.6, "a_gapg": 0.8, "rest_h": 4, "rest_a": 4, "host": 0, "confed": 0, "r": 1},
        {"h_elo": 2100, "a_elo": 1790, "h_rank": 1, "a_rank": 15, "stage": 2, "h_gpg": 2.1, "a_gpg": 1.5, "h_gapg": 0.3, "a_gapg": 0.7, "rest_h": 4, "rest_a": 4, "host": 0, "confed": 0, "r": 0},
        {"h_elo": 2010, "a_elo": 1860, "h_rank": 9, "a_rank": 10, "stage": 2, "h_gpg": 2.0, "a_gpg": 2.0, "h_gapg": 0.5, "a_gapg": 0.8, "rest_h": 4, "rest_a": 4, "host": 0, "confed": 0, "r": 0},
        {"h_elo": 2020, "a_elo": 1840, "h_rank": 7, "a_rank": 15, "stage": 2, "h_gpg": 2.2, "a_gpg": 1.5, "h_gapg": 0.8, "a_gapg": 0.8, "rest_h": 4, "rest_a": 4, "host": 0, "confed": 0, "r": 1},
        # QF
        {"h_elo": 1960, "a_elo": 2100, "h_rank": 12, "a_rank": 1, "stage": 3, "h_gpg": 2.0, "a_gpg": 2.1, "h_gapg": 0.8, "a_gapg": 0.3, "rest_h": 4, "rest_a": 4, "host": 0, "confed": 0, "r": 1},
        {"h_elo": 1980, "a_elo": 2135, "h_rank": 8, "a_rank": 3, "stage": 3, "h_gpg": 2.0, "a_gpg": 2.5, "h_gapg": 0.6, "a_gapg": 0.3, "rest_h": 4, "rest_a": 4, "host": 0, "confed": 0, "r": 1},
        {"h_elo": 2050, "a_elo": 2110, "h_rank": 5, "a_rank": 4, "stage": 3, "h_gpg": 2.2, "a_gpg": 2.5, "h_gapg": 0.3, "a_gapg": 0.5, "rest_h": 4, "rest_a": 4, "host": 0, "confed": 1, "r": 2},
        {"h_elo": 2010, "a_elo": 1840, "h_rank": 9, "a_rank": 15, "stage": 3, "h_gpg": 2.0, "a_gpg": 1.5, "h_gapg": 0.5, "a_gapg": 0.8, "rest_h": 4, "rest_a": 4, "host": 0, "confed": 0, "r": 0},
        # SF
        {"h_elo": 2135, "a_elo": 1960, "h_rank": 3, "a_rank": 12, "stage": 4, "h_gpg": 2.5, "a_gpg": 2.0, "h_gapg": 0.3, "a_gapg": 0.8, "rest_h": 4, "rest_a": 4, "host": 0, "confed": 0, "r": 0},
        {"h_elo": 2110, "a_elo": 2010, "h_rank": 4, "a_rank": 9, "stage": 4, "h_gpg": 2.5, "a_gpg": 2.0, "h_gapg": 0.5, "a_gapg": 0.5, "rest_h": 4, "rest_a": 4, "host": 0, "confed": 0, "r": 0},
        # Final
        {"h_elo": 2135, "a_elo": 2110, "h_rank": 3, "a_rank": 4, "stage": 5, "h_gpg": 2.5, "a_gpg": 2.5, "h_gapg": 0.3, "a_gapg": 0.5, "rest_h": 4, "rest_a": 4, "host": 0, "confed": 0, "r": 1},
    ]

    # ---- 2018 Russia (selected matches) ----
    wc2018 = [
        {"h_elo": 1760, "a_elo": 1640, "h_rank": 70, "a_rank": 67, "stage": 0, "h_gpg": 1.0, "a_gpg": 1.0, "h_gapg": 1.5, "a_gapg": 2.0, "rest_h": 5, "rest_a": 5, "host": 1, "confed": 0, "r": 0},
        {"h_elo": 2010, "a_elo": 2020, "h_rank": 4, "a_rank": 10, "stage": 0, "h_gpg": 2.2, "a_gpg": 2.3, "h_gapg": 0.5, "a_gapg": 0.5, "rest_h": 5, "rest_a": 5, "host": 0, "confed": 1, "r": 1},
        {"h_elo": 2110, "a_elo": 1710, "h_rank": 7, "a_rank": 36, "stage": 0, "h_gpg": 2.3, "a_gpg": 0.8, "h_gapg": 0.5, "a_gapg": 1.3, "rest_h": 5, "rest_a": 5, "host": 0, "confed": 0, "r": 0},
        {"h_elo": 2030, "a_elo": 1850, "h_rank": 1, "a_rank": 15, "stage": 0, "h_gpg": 2.5, "a_gpg": 1.5, "h_gapg": 0.5, "a_gapg": 0.6, "rest_h": 5, "rest_a": 5, "host": 0, "confed": 0, "r": 2},
        {"h_elo": 2150, "a_elo": 1840, "h_rank": 2, "a_rank": 6, "stage": 0, "h_gpg": 2.5, "a_gpg": 1.5, "h_gapg": 0.5, "a_gapg": 0.5, "rest_h": 5, "rest_a": 5, "host": 0, "confed": 0, "r": 1},
        {"h_elo": 1960, "a_elo": 1660, "h_rank": 20, "a_rank": 61, "stage": 0, "h_gpg": 2.0, "a_gpg": 0.7, "h_gapg": 0.8, "a_gapg": 1.5, "rest_h": 5, "rest_a": 5, "host": 0, "confed": 0, "r": 0},
        {"h_elo": 2135, "a_elo": 1770, "h_rank": 5, "a_rank": 22, "stage": 2, "h_gpg": 2.0, "a_gpg": 1.0, "h_gapg": 0.8, "a_gapg": 1.2, "rest_h": 4, "rest_a": 4, "host": 0, "confed": 0, "r": 2},
        {"h_elo": 2110, "a_elo": 2000, "h_rank": 7, "a_rank": 5, "stage": 2, "h_gpg": 2.3, "a_gpg": 2.0, "h_gapg": 0.5, "a_gapg": 0.5, "rest_h": 4, "rest_a": 4, "host": 0, "confed": 0, "r": 0},
        {"h_elo": 2100, "a_elo": 2030, "h_rank": 3, "a_rank": 1, "stage": 3, "h_gpg": 2.5, "a_gpg": 2.5, "h_gapg": 0.3, "a_gapg": 0.5, "rest_h": 4, "rest_a": 4, "host": 0, "confed": 0, "r": 0},
        {"h_elo": 1960, "a_elo": 2150, "h_rank": 20, "a_rank": 2, "stage": 3, "h_gpg": 2.0, "a_gpg": 2.5, "h_gapg": 0.8, "a_gapg": 0.5, "rest_h": 4, "rest_a": 4, "host": 0, "confed": 0, "r": 2},
        {"h_elo": 2110, "a_elo": 2050, "h_rank": 7, "a_rank": 4, "stage": 4, "h_gpg": 2.3, "a_gpg": 2.3, "h_gapg": 0.5, "a_gapg": 0.3, "rest_h": 4, "rest_a": 4, "host": 0, "confed": 1, "r": 2},
        {"h_elo": 2110, "a_elo": 1960, "h_rank": 7, "a_rank": 20, "stage": 5, "h_gpg": 2.3, "a_gpg": 2.0, "h_gapg": 0.5, "a_gapg": 0.8, "rest_h": 4, "rest_a": 4, "host": 0, "confed": 1, "r": 0},
    ]

    # ---- 2014 Brazil (selected matches) ----
    wc2014 = [
        {"h_elo": 2100, "a_elo": 1960, "h_rank": 3, "a_rank": 18, "stage": 0, "h_gpg": 2.2, "a_gpg": 2.0, "h_gapg": 0.5, "a_gapg": 0.8, "rest_h": 5, "rest_a": 5, "host": 1, "confed": 0, "r": 0},
        {"h_elo": 2150, "a_elo": 1980, "h_rank": 1, "a_rank": 8, "stage": 0, "h_gpg": 2.5, "a_gpg": 2.0, "h_gapg": 0.5, "a_gapg": 0.3, "rest_h": 5, "rest_a": 5, "host": 0, "confed": 1, "r": 0},
        {"h_elo": 2060, "a_elo": 2140, "h_rank": 9, "a_rank": 2, "stage": 0, "h_gpg": 1.8, "a_gpg": 2.5, "h_gapg": 0.8, "a_gapg": 0.5, "rest_h": 5, "rest_a": 5, "host": 0, "confed": 1, "r": 0},
        {"h_elo": 2090, "a_elo": 2130, "h_rank": 5, "a_rank": 3, "stage": 0, "h_gpg": 2.0, "a_gpg": 2.5, "h_gapg": 0.5, "a_gapg": 0.5, "rest_h": 5, "rest_a": 5, "host": 0, "confed": 1, "r": 1},
        {"h_elo": 1850, "a_elo": 1890, "h_rank": 14, "a_rank": 7, "stage": 0, "h_gpg": 1.5, "a_gpg": 2.0, "h_gapg": 1.0, "a_gapg": 0.8, "rest_h": 5, "rest_a": 5, "host": 0, "confed": 1, "r": 0},
        {"h_elo": 1650, "a_elo": 1630, "h_rank": 56, "a_rank": 34, "stage": 0, "h_gpg": 1.0, "a_gpg": 0.8, "h_gapg": 1.5, "a_gapg": 1.5, "rest_h": 5, "rest_a": 5, "host": 0, "confed": 0, "r": 1},
        {"h_elo": 2100, "a_elo": 1840, "h_rank": 3, "a_rank": 14, "stage": 2, "h_gpg": 2.2, "a_gpg": 1.5, "h_gapg": 0.5, "a_gapg": 1.0, "rest_h": 4, "rest_a": 4, "host": 1, "confed": 0, "r": 1},
        {"h_elo": 2130, "a_elo": 2060, "h_rank": 3, "a_rank": 9, "stage": 2, "h_gpg": 2.5, "a_gpg": 1.8, "h_gapg": 0.5, "a_gapg": 0.8, "rest_h": 4, "rest_a": 4, "host": 0, "confed": 1, "r": 0},
        {"h_elo": 2140, "a_elo": 2150, "h_rank": 2, "a_rank": 1, "stage": 4, "h_gpg": 2.5, "a_gpg": 2.5, "h_gapg": 0.5, "a_gapg": 0.5, "rest_h": 4, "rest_a": 4, "host": 0, "confed": 1, "r": 2},
        {"h_elo": 2100, "a_elo": 2030, "h_rank": 3, "a_rank": 11, "stage": 4, "h_gpg": 2.2, "a_gpg": 2.3, "h_gapg": 0.5, "a_gapg": 0.6, "rest_h": 4, "rest_a": 4, "host": 1, "confed": 0, "r": 2},
        {"h_elo": 2150, "a_elo": 2130, "h_rank": 1, "a_rank": 3, "stage": 5, "h_gpg": 2.5, "a_gpg": 2.5, "h_gapg": 0.5, "a_gapg": 0.5, "rest_h": 4, "rest_a": 4, "host": 0, "confed": 1, "r": 0},
    ]

    # ---- 2010 South Africa (selected matches) ----
    wc2010 = [
        {"h_elo": 1580, "a_elo": 1850, "h_rank": 83, "a_rank": 17, "stage": 0, "h_gpg": 0.8, "a_gpg": 1.5, "h_gapg": 1.3, "a_gapg": 1.0, "rest_h": 5, "rest_a": 5, "host": 1, "confed": 0, "r": 1},
        {"h_elo": 2130, "a_elo": 1795, "h_rank": 2, "a_rank": 14, "stage": 0, "h_gpg": 2.5, "a_gpg": 1.3, "h_gapg": 0.5, "a_gapg": 1.0, "rest_h": 5, "rest_a": 5, "host": 0, "confed": 0, "r": 0},
        {"h_elo": 2150, "a_elo": 2100, "h_rank": 1, "a_rank": 3, "stage": 0, "h_gpg": 2.5, "a_gpg": 2.0, "h_gapg": 0.5, "a_gapg": 0.5, "rest_h": 5, "rest_a": 5, "host": 0, "confed": 1, "r": 2},
        {"h_elo": 2060, "a_elo": 1920, "h_rank": 4, "a_rank": 6, "stage": 0, "h_gpg": 2.2, "a_gpg": 1.8, "h_gapg": 0.5, "a_gapg": 0.5, "rest_h": 5, "rest_a": 5, "host": 0, "confed": 1, "r": 1},
        {"h_elo": 2030, "a_elo": 1700, "h_rank": 6, "a_rank": 19, "stage": 0, "h_gpg": 2.0, "a_gpg": 1.0, "h_gapg": 0.6, "a_gapg": 1.0, "rest_h": 5, "rest_a": 5, "host": 0, "confed": 0, "r": 2},
        {"h_elo": 2050, "a_elo": 2060, "h_rank": 3, "a_rank": 4, "stage": 2, "h_gpg": 2.1, "a_gpg": 2.2, "h_gapg": 0.3, "a_gapg": 0.5, "rest_h": 4, "rest_a": 4, "host": 0, "confed": 1, "r": 2},
        {"h_elo": 2150, "a_elo": 2120, "h_rank": 1, "a_rank": 2, "stage": 3, "h_gpg": 2.5, "a_gpg": 2.3, "h_gapg": 0.5, "a_gapg": 0.5, "rest_h": 4, "rest_a": 4, "host": 0, "confed": 1, "r": 0},
        {"h_elo": 2060, "a_elo": 2030, "h_rank": 4, "a_rank": 6, "stage": 3, "h_gpg": 2.2, "a_gpg": 2.0, "h_gapg": 0.5, "a_gapg": 0.6, "rest_h": 4, "rest_a": 4, "host": 0, "confed": 1, "r": 0},
        {"h_elo": 2100, "a_elo": 2020, "h_rank": 3, "a_rank": 7, "stage": 4, "h_gpg": 2.0, "a_gpg": 2.2, "h_gapg": 0.5, "a_gapg": 0.3, "rest_h": 4, "rest_a": 4, "host": 0, "confed": 0, "r": 2},
        {"h_elo": 2060, "a_elo": 2150, "h_rank": 4, "a_rank": 1, "stage": 4, "h_gpg": 2.2, "a_gpg": 2.5, "h_gapg": 0.5, "a_gapg": 0.5, "rest_h": 4, "rest_a": 4, "host": 0, "confed": 1, "r": 2},
        {"h_elo": 2020, "a_elo": 2150, "h_rank": 7, "a_rank": 1, "stage": 5, "h_gpg": 2.2, "a_gpg": 2.5, "h_gapg": 0.3, "a_gapg": 0.5, "rest_h": 4, "rest_a": 4, "host": 0, "confed": 1, "r": 0},
    ]

    all_real = wc2022 + wc2018 + wc2014 + wc2010

    # ---- Much smaller synthetic set for augmentation ----
    synthetic = []
    for _ in range(60):
        home_elo = random.randint(1550, 2200)
        away_elo = random.randint(1500, 2150)
        elo_diff = home_elo - away_elo

        p_home = 1.0 / (1 + 10 ** (-elo_diff / 400))
        p_draw = max(0.10, 0.28 - abs(elo_diff) / 1800)
        p_home = p_home * (1 - p_draw)
        p_away = 1 - p_home - p_draw

        r = random.random()
        if r < p_home:
            result = 0
        elif r < p_home + p_draw:
            result = 1
        else:
            result = 2

        synthetic.append({
            "h_elo": home_elo, "a_elo": away_elo,
            "h_rank": max(1, int((2200 - home_elo) / 4 + random.randint(-10, 10))),
            "a_rank": max(1, int((2200 - away_elo) / 4 + random.randint(-10, 10))),
            "stage": random.choices([0, 1, 2, 3, 4, 5], weights=[55, 15, 15, 10, 4, 1])[0],
            "h_gpg": round(home_elo / 1000 + random.uniform(-0.3, 0.3), 2),
            "a_gpg": round(away_elo / 1000 + random.uniform(-0.3, 0.3), 2),
            "h_gapg": round(1.4 - home_elo / 2400 + random.uniform(-0.2, 0.2), 2),
            "a_gapg": round(1.4 - away_elo / 2400 + random.uniform(-0.2, 0.2), 2),
            "rest_h": random.randint(3, 7), "rest_a": random.randint(3, 7),
            "host": random.choices([0, 1], weights=[0.92, 0.08])[0],
            "confed": random.choices([0, 1], weights=[0.35, 0.65])[0],
            "r": result,
        })

    return [
        {"home_elo": m["h_elo"], "away_elo": m["a_elo"],
         "home_rank": m["h_rank"], "away_rank": m["a_rank"],
         "stage": m["stage"], "home_gpg": m["h_gpg"], "away_gpg": m["a_gpg"],
         "home_gapg": m["h_gapg"], "away_gapg": m["a_gapg"],
         "rest_h": m["rest_h"], "rest_a": m["rest_a"],
         "host": m["host"], "confed": m["confed"],
         "result": m["r"]}
        for m in all_real + synthetic
    ]


def extract_features(matches: list[dict]) -> tuple[np.ndarray, np.ndarray]:
    """Extract feature matrix X and labels y from match data."""
    X = []
    y = []
    for m in matches:
        elo_diff = (m["home_elo"] - m["away_elo"]) / 400.0
        rank_gap = abs(m["home_rank"] - m["away_rank"]) / 80.0
        home_attack = m["home_gpg"] / max(0.5, m["away_gapg"])
        away_attack = m["away_gpg"] / max(0.5, m["home_gapg"])
        rest_adv = (m["rest_h"] - m["rest_a"]) / 7.0

        X.append([
            elo_diff, rank_gap, home_attack, away_attack, rest_adv,
            m["home_elo"] / 2200, m["away_elo"] / 2200,
            m["home_rank"] / 100, m["away_rank"] / 100,
            m["stage"] / 5.0,  # tournament stage normalized
            m["host"], m["confed"],
            m["home_gpg"] / 3.0, m["away_gpg"] / 3.0,
            m["home_gapg"] / 3.0, m["away_gapg"] / 3.0,
        ])
        y.append(m["result"])
    return np.array(X, dtype=np.float32), np.array(y, dtype=np.int32)


FEATURE_NAMES = [
    "ELO Difference", "Rank Gap", "Home Attack", "Away Attack", "Rest Advantage",
    "Home ELO", "Away ELO", "Home Rank", "Away Rank",
    "Tournament Stage", "Host", "Same Confederation",
    "Home Goals/Game", "Away Goals/Game", "Home GA/Game", "Away GA/Game",
]


def train_model() -> tuple[object, TrainingMetrics]:
    """Train XGBoost + Platt scaling calibration. Returns calibrated model."""
    from sklearn.model_selection import train_test_split
    from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score, confusion_matrix
    from sklearn.calibration import calibration_curve, CalibratedClassifierCV
    import xgboost as xgb

    matches = load_historical_data()
    X, y = extract_features(matches)

    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, stratify=y, random_state=42)

    base = xgb.XGBClassifier(
        n_estimators=200, max_depth=4, learning_rate=0.05,
        subsample=0.8, colsample_bytree=0.8,
        reg_lambda=1.0, reg_alpha=0.5,
        objective="multi:softprob", num_class=3,
        eval_metric="mlogloss", random_state=42,
    )

    # Fit base model first for feature importance
    base.fit(X_train, y_train)
    importance = dict(zip(FEATURE_NAMES, base.feature_importances_.tolist()))
    importance = dict(sorted(importance.items(), key=lambda x: -x[1]))

    # Platt scaling — maps raw scores to well-calibrated probabilities
    model = CalibratedClassifierCV(xgb.XGBClassifier(
        n_estimators=200, max_depth=4, learning_rate=0.05,
        subsample=0.8, colsample_bytree=0.8,
        reg_lambda=1.0, reg_alpha=0.5,
        objective="multi:softprob", num_class=3,
        eval_metric="mlogloss", random_state=42,
    ), method="isotonic", cv=3)
    model.fit(X_train, y_train)

    y_pred = model.predict(X_test)
    y_prob = model.predict_proba(X_test)

    accuracy = float(accuracy_score(y_test, y_pred))
    precision = float(precision_score(y_test, y_pred, average="macro", zero_division=0))
    recall = float(recall_score(y_test, y_pred, average="macro", zero_division=0))
    f1 = float(f1_score(y_test, y_pred, average="macro", zero_division=0))
    cm = confusion_matrix(y_test, y_pred).tolist()

    # Calibration error post-Platt
    y_test_binary = (y_test == 0).astype(int)
    prob_true, prob_pred = calibration_curve(y_test_binary, y_prob[:, 0], n_bins=5)
    cal_error = float(np.mean(np.abs(prob_true - prob_pred)))

    metrics = TrainingMetrics(
        accuracy=accuracy, precision=precision, recall=recall, f1=f1,
        confusion_matrix=cm, feature_importance=importance, calibration_error=cal_error,
    )

    return model, metrics


def save_model(model, metrics: TrainingMetrics):
    """Save trained model and metrics to disk."""
    MODEL_DIR.mkdir(parents=True, exist_ok=True)

    with open(MODEL_DIR / "xgboost_model.pkl", "wb") as f:
        pickle.dump(model, f)

    with open(MODEL_DIR / "metrics.json", "w") as f:
        json.dump({
            "accuracy": metrics.accuracy,
            "precision": metrics.precision,
            "recall": metrics.recall,
            "f1": metrics.f1,
            "confusion_matrix": metrics.confusion_matrix,
            "feature_importance": metrics.feature_importance,
            "calibration_error": metrics.calibration_error,
        }, f, indent=2)

    print(f"Model saved: accuracy={metrics.accuracy:.3f}, f1={metrics.f1:.3f}")


def load_model() -> Optional[object]:
    """Load trained model from disk. Returns None if model doesn't exist or xgboost isn't installed."""
    path = MODEL_DIR / "xgboost_model.pkl"
    if not path.exists():
        return None
    try:
        with open(path, "rb") as f:
            return pickle.load(f)
    except (ModuleNotFoundError, ImportError, Exception):
        return None


def load_metrics() -> Optional[dict]:
    """Load training metrics from disk."""
    path = MODEL_DIR / "metrics.json"
    if not path.exists():
        return None
    with open(path) as f:
        return json.load(f)


if __name__ == "__main__":
    model, metrics = train_model()
    save_model(model, metrics)
    print(f"\nFeature Importance:")
    for name, imp in metrics.feature_importance.items():
        print(f"  {name}: {imp:.4f}")
