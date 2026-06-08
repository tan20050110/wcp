"""Monte Carlo tournament simulator — 2026 World Cup format.

48 teams, 12 groups of 4, top 2 + 8 best 3rd-place → R32 knockout.
Uses the Poisson model for match-level simulation with per-day reproducibility.
"""
import hashlib
import datetime
import numpy as np
from collections import defaultdict
from dataclasses import dataclass
from .poisson import compute_lambda


@dataclass
class SimulationResult:
    champion_probs: dict[str, float]
    final_probs: dict[str, float]
    semi_probs: dict[str, float]
    group_exit_probs: dict[str, float]
    bracket: list[dict]
    total_runs: int


def _date_seed() -> int:
    """Per-day deterministic seed — reproducible within a day, varies across days."""
    today = datetime.date.today().isoformat()
    return int(hashlib.md5(today.encode()).hexdigest()[:8], 16) % (2 ** 31)


def _sim_match(home: dict, away: dict, rng: np.random.RandomState) -> tuple[int, int]:
    """Simulate one match via Poisson, using ELO + attack/defense stats."""
    h_ratio = min(2.0, max(0.5, home.get("attack", 1.0) / max(0.3, away.get("defense", 1.0))))
    a_ratio = min(2.0, max(0.5, away.get("attack", 1.0) / max(0.3, home.get("defense", 1.0))))
    lh = compute_lambda(home["elo"], away["elo"], True) * h_ratio
    la = compute_lambda(away["elo"], home["elo"], False) * a_ratio
    return int(rng.poisson(lh)), int(rng.poisson(la))


def _sim_knockout(home: dict, away: dict, rng: np.random.RandomState) -> tuple[int, int]:
    """Knockout match — redraw until result is not a draw."""
    h, a = _sim_match(home, away, rng)
    while h == a:
        h, a = _sim_match(home, away, rng)
    return h, a


def _points_sort_key(t: dict, points: dict, gf: dict, ga: dict, rng_tie: float) -> tuple:
    return (points[t["id"]], gf[t["id"]] - ga[t["id"]], gf[t["id"]], -rng_tie)


def run_tournament_simulation(
    teams: list[dict],
    group_matches: list[dict],
    knockout_structure: list[dict],
    prediction_fn,
    n_sim: int = 5000,
) -> SimulationResult:
    team_by_id: dict[str, dict] = {t["id"]: t for t in teams}
    team_ids = list(team_by_id.keys())
    n_teams = len(team_ids)

    # Group teams by their group letter
    groups: dict[str, list[dict]] = defaultdict(list)
    for t in teams:
        g = t.get("group", "Z")
        groups[g].append(t)

    # Build group match schedule
    group_schedule: dict[str, list[dict]] = defaultdict(list)
    for m in group_matches:
        g = m.get("group", "")
        if g:
            group_schedule[g].append(m)

    # Fallback: if no schedule from DB, generate round-robin per group
    if not any(group_schedule.values()):
        for g, gteams in groups.items():
            for i in range(len(gteams)):
                for j in range(i + 1, len(gteams)):
                    group_schedule[g].append({
                        "home_id": gteams[i]["id"],
                        "away_id": gteams[j]["id"],
                        "group": g,
                    })

    rng = np.random.RandomState(_date_seed())

    champion_count: dict[str, int] = defaultdict(int)
    final_count: dict[str, int] = defaultdict(int)
    semi_count: dict[str, int] = defaultdict(int)
    exit_count: dict[str, int] = defaultdict(int)

    for _ in range(n_sim):
        # ---- group stage ----
        points: dict[str, int] = defaultdict(int)
        gf: dict[str, int] = defaultdict(int)
        ga: dict[str, int] = defaultdict(int)

        for g, matches in group_schedule.items():
            for m in matches:
                hid, aid = m["home_id"], m["away_id"]
                if hid not in team_by_id or aid not in team_by_id:
                    continue
                hg, ag = _sim_match(team_by_id[hid], team_by_id[aid], rng)

                gf[hid] += hg; ga[hid] += ag
                gf[aid] += ag; ga[aid] += hg
                if hg > ag:
                    points[hid] += 3
                elif ag > hg:
                    points[aid] += 3
                else:
                    points[hid] += 1
                    points[aid] += 1

        # ---- rank within each group ----
        group_standings: dict[str, list[dict]] = {}
        all_thirds: list[dict] = []
        for g, gteams in groups.items():
            ranked = sorted(gteams, key=lambda t: (
                points[t["id"]],
                gf[t["id"]] - ga[t["id"]],
                gf[t["id"]],
            ), reverse=True)
            # Break ties randomly but deterministically per simulation
            if len(ranked) >= 3:
                # Add random jitter for tied teams
                ranked = sorted(gteams, key=lambda t: (
                    points[t["id"]],
                    gf[t["id"]] - ga[t["id"]],
                    gf[t["id"]],
                    rng.random(),
                ), reverse=True)
            group_standings[g] = ranked
            if len(ranked) >= 3:
                all_thirds.append(ranked[2])

        # ---- qualifiers ----
        qualifiers: list[dict] = []
        winners: list[dict] = []
        runners_up: list[dict] = []
        for g, ranked in group_standings.items():
            winners.append(ranked[0])
            runners_up.append(ranked[1])
            qualifiers.append(ranked[0])
            qualifiers.append(ranked[1])

        # 8 best 3rd-place teams by points, GD, GF
        all_thirds.sort(key=lambda t: (
            points[t["id"]],
            gf[t["id"]] - ga[t["id"]],
            gf[t["id"]],
        ), reverse=True)
        third_place = all_thirds[:8]
        qualifiers.extend(third_place)

        qualified_ids = {t["id"] for t in qualifiers}
        for tid in team_ids:
            if tid not in qualified_ids:
                exit_count[tid] += 1

        # ---- knockout bracket ----
        # Sort winners and runners-up by group stage performance
        def perf_key(t):
            return (points[t["id"]], gf[t["id"]] - ga[t["id"]], gf[t["id"]])

        winners.sort(key=perf_key, reverse=True)
        runners_up.sort(key=perf_key, reverse=True)
        third_place.sort(key=perf_key, reverse=True)

        # R32: top 8 winners vs 3rd place; remaining 4 winners + 12 runners up paired
        r32_winners = winners[:8]
        r32_remaining = winners[8:] + runners_up

        r32: list[tuple[dict, dict]] = []
        # 8 matches: winner vs 3rd (top winner vs worst 3rd, etc.)
        for i in range(8):
            r32.append((r32_winners[i], third_place[7 - i]))
        # 8 matches: remaining teams snake-seeded
        r32_remaining.sort(key=perf_key, reverse=True)
        for i in range(8):
            r32.append((r32_remaining[i], r32_remaining[15 - i]))

        # ---- simulate knockout rounds ----
        current = r32
        semi_losers: list[dict] = []
        final_loser: dict | None = None

        for rnd_idx in range(5):  # R32, R16, QF, SF, Final
            next_round: list[dict] = []
            is_semi = (rnd_idx == 3)
            is_final = (rnd_idx == 4)

            for home, away in current:
                if is_final:
                    hg, ag = _sim_knockout(home, away, rng)
                else:
                    hg, ag = _sim_match(home, away, rng)
                    while hg == ag:
                        hg, ag = _sim_match(home, away, rng)

                winner = home if hg > ag else away
                loser = away if winner is home else home
                next_round.append(winner)

                if is_semi:
                    semi_losers.append(loser)
                if is_final:
                    final_loser = loser

            # Stop after the final — no more pairing needed
            if is_final:
                break

            # Pair up for next round
            current = [(next_round[i], next_round[i + 1]) for i in range(0, len(next_round), 2)]

        champion = next_round[0]
        runner_up = final_loser

        champion_count[champion["id"]] += 1
        if runner_up:
            final_count[runner_up["id"]] += 1
        for t in semi_losers:
            semi_count[t["id"]] += 1

    total = n_sim
    return SimulationResult(
        champion_probs={tid: round(float(champion_count[tid]) / total, 4)
                        for tid in team_ids if champion_count[tid] > 0},
        final_probs={tid: round(float(final_count[tid]) / total, 4)
                     for tid in team_ids if final_count[tid] > 0},
        semi_probs={tid: round(float(semi_count[tid]) / total, 4)
                    for tid in team_ids if semi_count[tid] > 0},
        group_exit_probs={tid: round(float(exit_count[tid]) / total, 4)
                          for tid in team_ids if exit_count[tid] > 0},
        bracket=[],
        total_runs=n_sim,
    )
