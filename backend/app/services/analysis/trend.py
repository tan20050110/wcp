def calculate_form_trend(recent_matches: list[dict]) -> dict:
    if not recent_matches:
        return {"trend": "unknown", "form_score": 0.5, "momentum": 0}
    scores = []
    for m in recent_matches:
        gf = m.get("goals_for", 0)
        ga = m.get("goals_against", 0)
        if gf > ga:
            scores.append(1.0)
        elif gf == ga:
            scores.append(0.5)
        else:
            scores.append(0.0)
    recent_weighted = sum(scores[i] * (0.6 + 0.1 * i) for i in range(min(5, len(scores))))
    total_weight = sum(0.6 + 0.1 * i for i in range(min(5, len(scores))))
    form_score = recent_weighted / total_weight if total_weight > 0 else 0.5
    momentum = scores[-1] - scores[0] if len(scores) >= 2 else 0
    trend = "improving" if momentum > 0 else ("declining" if momentum < 0 else "stable")
    return {"trend": trend, "form_score": round(form_score, 3), "momentum": momentum}
