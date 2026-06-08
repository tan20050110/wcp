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

# Calibrated from World Cup 2010-2022: average goals per team per match ≈ 1.35
LEAGUE_AVG_GOALS = 1.35


def compute_lambda(team_elo: float, opponent_elo: float, home_advantage: bool = True) -> float:
    """
    Expected goals based on ELO difference.

    Uses 2^(elo_diff / 2.5) instead of 10^(elo_diff / 2) — the softer
    exponent avoids the extreme score blowouts the old formula produced.
    Every 400 ELO gap ≈ 1.5x goal multiplier, not 10x.
    """
    elo_diff = (team_elo - opponent_elo) / 400.0
    base_lambda = LEAGUE_AVG_GOALS * (2.0 ** (elo_diff / 2.5))
    if home_advantage:
        base_lambda *= 1.15
    return max(0.3, min(5.5, base_lambda))


def predict_match(home_elo: float, away_elo: float, home_attack: float = 1.0,
                  away_defense: float = 1.0, away_attack: float = 1.0,
                  home_defense: float = 1.0) -> MatchPrediction:
    # Clamp attack/defense ratio to [0.5, 2.0] so a single stat can't
    # swing expected goals by more than 2x in either direction.
    h_ratio = min(2.0, max(0.5, home_attack / max(0.3, away_defense)))
    a_ratio = min(2.0, max(0.5, away_attack / max(0.3, home_defense)))

    lambda_h = compute_lambda(home_elo, away_elo, True) * h_ratio
    lambda_a = compute_lambda(away_elo, home_elo, False) * a_ratio

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


def live_predict(home_elo: float, away_elo: float, home_attack: float, away_defense: float,
                 away_attack: float, home_defense: float, home_goals: int, away_goals: int,
                 minute: int) -> MatchPrediction:
    """In-play prediction: given current score and minute, compute updated probabilities.

    Scales remaining expected goals by (90 - minute) / 90, then convolves
    with current score to find P(home win | current state).
    """
    remaining = max(1, 90 - minute) / 90.0

    # Full-match lambdas (same as pre-match)
    h_ratio = min(2.0, max(0.5, home_attack / max(0.3, away_defense)))
    a_ratio = min(2.0, max(0.5, away_attack / max(0.3, home_defense)))
    lambda_h = compute_lambda(home_elo, away_elo, True) * h_ratio * remaining
    lambda_a = compute_lambda(away_elo, home_elo, False) * a_ratio * remaining

    max_g = GOAL_CAP
    # P(home wins) = Σ P(home scores i more in remaining time AND away scores j more)
    #   such that home_goals + i > away_goals + j
    home_win = 0.0
    draw = 0.0
    away_win = 0.0

    for i in range(max_g + 1):
        pi = poisson.pmf(i, lambda_h)
        for j in range(max_g + 1):
            pj = poisson.pmf(j, lambda_a)
            prob = pi * pj
            if home_goals + i > away_goals + j:
                home_win += prob
            elif home_goals + i == away_goals + j:
                draw += prob
            else:
                away_win += prob

    total = home_win + draw + away_win
    if total > 0:
        home_win /= total
        draw /= total
        away_win /= total

    return MatchPrediction(
        home_win_prob=round(home_win, 4),
        draw_prob=round(draw, 4),
        away_win_prob=round(away_win, 4),
        pred_home_score=round(lambda_h + home_goals, 2),
        pred_away_score=round(lambda_a + away_goals, 2),
        score_matrix=[],
        most_likely_score="live",
    )
