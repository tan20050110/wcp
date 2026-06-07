import numpy as np
from scipy.stats import poisson
from dataclasses import dataclass

@dataclass
class MatchPrediction:
    home_win_prob: float
    draw_prob: float
    away_win_prob: float
    pred_home_score: float
    pred_away_score: float
    score_matrix: list[list[float]]
    most_likely_score: str

GOAL_CAP = 10

def compute_lambda(team_elo: float, opponent_elo: float, home_advantage: bool = True) -> float:
    elo_diff = (team_elo - opponent_elo) / 400.0
    base_lambda = 1.5 * (10 ** (elo_diff / 2.0))
    if home_advantage:
        base_lambda *= 1.15
    return max(0.3, base_lambda)

def predict_match(home_elo: float, away_elo: float, home_attack: float = 1.0,
                  away_defense: float = 1.0, away_attack: float = 1.0, home_defense: float = 1.0) -> MatchPrediction:
    lambda_h = compute_lambda(home_elo, away_elo, True) * home_attack / away_defense
    lambda_a = compute_lambda(away_elo, home_elo, False) * away_attack / home_defense

    max_goals = GOAL_CAP
    prob_matrix = [[float(poisson.pmf(i, lambda_h) * poisson.pmf(j, lambda_a))
                    for j in range(max_goals + 1)] for i in range(max_goals + 1)]

    home_win = sum(prob_matrix[i][j] for i in range(max_goals + 1) for j in range(i))
    draw = sum(prob_matrix[i][i] for i in range(max_goals + 1))
    away_win = sum(prob_matrix[i][j] for i in range(max_goals + 1) for j in range(i + 1, max_goals + 1))

    total = home_win + draw + away_win
    home_win /= total; draw /= total; away_win /= total

    most_likely = max(
        ((i, j, prob_matrix[i][j]) for i in range(max_goals + 1) for j in range(max_goals + 1)),
        key=lambda x: x[2]
    )

    return MatchPrediction(
        home_win_prob=round(home_win, 4),
        draw_prob=round(draw, 4),
        away_win_prob=round(away_win, 4),
        pred_home_score=round(lambda_h, 2),
        pred_away_score=round(lambda_a, 2),
        score_matrix=[[round(p, 6) for p in row] for row in prob_matrix],
        most_likely_score=f"{most_likely[0]}-{most_likely[1]}",
    )
