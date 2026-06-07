from dataclasses import dataclass, field

@dataclass
class AdjustedStrength:
    attack: float
    defense: float
    midfield: float
    modifiers: dict = field(default_factory=dict)

def adjust_team_strength(
    base_attack: float,
    base_defense: float,
    availability_json: dict,
    recent_form: list[dict],
    travel_fatigue: float,
    weather_factor: float,
    home_advantage: float,
) -> AdjustedStrength:
    attack_mod = 1.0
    defense_mod = 1.0

    for issue in availability_json.get("unavailable", []):
        weight = issue.get("contribution_weight", 0.05)
        if issue.get("type") == "injury":
            if issue.get("position") in ("forward", "striker"):
                attack_mod -= weight
            elif issue.get("position") in ("defender", "goalkeeper"):
                defense_mod -= weight
            else:
                attack_mod -= weight * 0.5
                defense_mod -= weight * 0.5
        elif issue.get("type") == "suspension":
            if issue.get("position") in ("defender", "goalkeeper"):
                defense_mod -= weight * 1.2
            else:
                attack_mod -= weight * 0.8

    if recent_form:
        form_bonus = sum(f.get("result_weight", 0) for f in recent_form[:5]) / len(recent_form[:5])
        form_mod = 1.0 + form_bonus
    else:
        form_mod = 1.0

    attack_mod += (form_mod - 1.0)
    defense_mod += (form_mod - 1.0)

    if travel_fatigue > 0:
        fatigue_penalty = min(0.15, travel_fatigue * 0.01)
        attack_mod -= fatigue_penalty
        defense_mod -= fatigue_penalty

    if weather_factor > 0:
        attack_mod -= min(0.1, weather_factor * 0.02)

    if home_advantage > 0:
        attack_mod += home_advantage * 0.05

    attack_mod = max(0.6, min(1.3, attack_mod))
    defense_mod = max(0.6, min(1.3, defense_mod))

    return AdjustedStrength(
        attack=base_attack * attack_mod,
        defense=base_defense * defense_mod,
        midfield=(base_attack + base_defense) / 2 * (attack_mod + defense_mod) / 2,
        modifiers={"injury": round(attack_mod, 3), "form": round(form_mod, 3),
                    "fatigue": round(fatigue_penalty if travel_fatigue > 0 else 0, 3),
                    "weather": round(weather_factor, 3)}
    )
