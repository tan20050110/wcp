import numpy as np
from dataclasses import dataclass

@dataclass
class SimulationResult:
    champion_probs: dict[str, float]
    final_probs: dict[str, float]
    semi_probs: dict[str, float]
    group_exit_probs: dict[str, float]
    bracket: list[dict]
    total_runs: int

def run_tournament_simulation(
    teams: list[dict],
    group_matches: list[dict],
    knockout_structure: list[dict],
    prediction_fn,
    n_sim: int = 10000,
) -> SimulationResult:
    champion_count: dict[str, int] = {t["id"]: 0 for t in teams}
    final_count: dict[str, int] = {t["id"]: 0 for t in teams}
    semi_count: dict[str, int] = {t["id"]: 0 for t in teams}
    exit_count: dict[str, int] = {t["id"]: 0 for t in teams}

    for _ in range(n_sim):
        group_standings = _simulate_groups(teams, group_matches, prediction_fn)
        qualifiers = _get_qualifiers(group_standings, teams)

        for t in teams:
            if t["id"] not in [q["id"] for q in qualifiers]:
                exit_count[t["id"]] += 1

        champion = _simulate_knockout(qualifiers, prediction_fn, semi_count, final_count)
        champion_count[champion] += 1

    total = n_sim
    return SimulationResult(
        champion_probs={k: round(v / total, 4) for k, v in champion_count.items()},
        final_probs={k: round(v / total, 4) for k, v in final_count.items()},
        semi_probs={k: round(v / total, 4) for k, v in semi_count.items()},
        group_exit_probs={k: round(v / total, 4) for k, v in exit_count.items()},
        bracket=[],
        total_runs=n_sim,
    )

def _simulate_groups(teams, matches, prediction_fn):
    points = {t["id"]: 0 for t in teams}
    for m in matches:
        pred = prediction_fn(m["home_elo"], m["away_elo"])
        r = np.random.random()
        if r < pred.home_win_prob:
            points[m["home_id"]] += 3
        elif r < pred.home_win_prob + pred.draw_prob:
            points[m["home_id"]] += 1
            points[m["away_id"]] += 1
        else:
            points[m["away_id"]] += 3
    return points

def _get_qualifiers(standings, teams):
    sorted_teams = sorted(standings.items(), key=lambda x: x[1], reverse=True)
    team_map = {t["id"]: t for t in teams}
    return [{"id": tid, "name": team_map.get(tid, {}).get("name", ""), "elo": team_map.get(tid, {}).get("elo", 1500)}
            for tid, _ in sorted_teams[:16]]

def _simulate_knockout(qualifiers, prediction_fn, semi_count, final_count):
    remaining = qualifiers[:]
    for rnd_idx, rnd in enumerate(["round16", "quarter", "semi", "final"]):
        next_round = []
        for i in range(0, len(remaining), 2):
            if i + 1 >= len(remaining):
                next_round.append(remaining[i])
                continue
            t1, t2 = remaining[i], remaining[i + 1]
            pred = prediction_fn(t1.get("elo", 1500), t2.get("elo", 1500))
            winner = t1 if np.random.random() < pred.home_win_prob + pred.draw_prob * 0.5 else t2
            next_round.append(winner)
            if rnd == "semi":
                semi_count[t2["id"] if winner == t1 else t1["id"]] += 1
            if rnd == "final":
                final_count[t2["id"] if winner == t1 else t1["id"]] += 1
        remaining = next_round
    return remaining[0]["id"]
