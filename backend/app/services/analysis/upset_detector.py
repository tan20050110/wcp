def calculate_upset_probability(home_team: dict, away_team: dict, match_prediction: dict) -> float:
    elo_gap = abs(home_team.get("elo_rating", 1500) - away_team.get("elo_rating", 1500))
    favorite = "home" if home_team.get("elo_rating", 1500) > away_team.get("elo_rating", 1500) else "away"
    underdog_win_prob = match_prediction.get("away_win_prob" if favorite == "home" else "home_win_prob", 0)
    rank_gap = abs(home_team.get("fifa_rank", 50) - away_team.get("fifa_rank", 50))

    elo_factor = min(1.0, elo_gap / 400)
    rank_factor = min(1.0, rank_gap / 80)
    base_upset = underdog_win_prob * (1 + elo_factor * 2 + rank_factor)
    return round(min(1.0, base_upset), 4)
