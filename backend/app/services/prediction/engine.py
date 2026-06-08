from uuid import UUID
import numpy as np
from sqlalchemy import select
from .poisson import predict_match
from .adjuster import adjust_team_strength
from ...core.database import async_session
from ...models.team import Team
from ...models.match import Match
from ...models.prediction import Prediction

async def _get_ml_correction(home_team: Team, away_team: Team) -> dict | None:
    """Get ML model prediction if available, else return None."""
    try:
        from ...ml.trainer import load_model
        model = load_model()
        if model is None:
            return None

        h_stats = home_team.stats_json or {}
        a_stats = away_team.stats_json or {}

        features = np.array([[
            (home_team.elo_rating - away_team.elo_rating) / 400 if home_team.elo_rating and away_team.elo_rating else 0,
            abs((home_team.fifa_rank or 50) - (away_team.fifa_rank or 50)) / 80,
            h_stats.get("attack", 1) / max(0.5, a_stats.get("defense", 1)),
            a_stats.get("attack", 1) / max(0.5, h_stats.get("defense", 1)),
            0, (home_team.elo_rating or 1500) / 2200, (away_team.elo_rating or 1500) / 2200,
            (home_team.fifa_rank or 50) / 100, (away_team.fifa_rank or 50) / 100,
            0.2, 0, 0,
            h_stats.get("attack", 1) / 3, a_stats.get("attack", 1) / 3,
            h_stats.get("defense", 1) / 3, a_stats.get("defense", 1) / 3,
        ]], dtype=np.float32)

        proba = model.predict_proba(features)[0]
        return {"home_win": float(proba[0]), "draw": float(proba[1]), "away_win": float(proba[2])}
    except Exception:
        return None


async def generate_match_prediction(match_id: UUID) -> Prediction:
    async with async_session() as db:
        match = (await db.execute(
            select(Match).where(Match.id == match_id)
        )).scalar_one()

        home_team = (await db.execute(
            select(Team).where(Team.id == match.home_team_id)
        )).scalar_one()
        away_team = (await db.execute(
            select(Team).where(Team.id == match.away_team_id)
        )).scalar_one()

        home_stats = home_team.stats_json or {}
        away_stats = away_team.stats_json or {}
        home_avail = home_team.availability_json or {}
        away_avail = away_team.availability_json or {}

        home_adj = adjust_team_strength(
            base_attack=home_stats.get("attack", 1.0),
            base_defense=home_stats.get("defense", 1.0),
            availability_json=home_avail,
            recent_form=home_stats.get("recent_form", []),
            travel_fatigue=0,
            weather_factor=0,
            home_advantage=1.0,
        )
        away_adj = adjust_team_strength(
            base_attack=away_stats.get("attack", 1.0),
            base_defense=away_stats.get("defense", 1.0),
            availability_json=away_avail,
            recent_form=away_stats.get("recent_form", []),
            travel_fatigue=0,
            weather_factor=0,
            home_advantage=0,
        )

        pred = predict_match(
            home_elo=home_team.elo_rating or 1500,
            away_elo=away_team.elo_rating or 1500,
            home_attack=home_adj.attack,
            home_defense=home_adj.defense,
            away_attack=away_adj.attack,
            away_defense=away_adj.defense,
        )

        # Blend with ML model if available, weighted by calibration quality
        ml = await _get_ml_correction(home_team, away_team)
        if ml:
            # Higher blend when ML is well-calibrated; fallback to 0.35 default
            try:
                from ...ml.trainer import load_metrics
                m = load_metrics()
                cal_err = m.get("calibration_error", 0.25) if m else 0.25
                # Lower calibration error → trust ML more (cap between 0.25 and 0.55)
                blend_weight = round(max(0.25, min(0.55, 0.55 - cal_err * 0.8)), 2)
            except Exception:
                blend_weight = 0.35
            final_home = pred.home_win_prob * (1 - blend_weight) + ml["home_win"] * blend_weight
            final_draw = pred.draw_prob * (1 - blend_weight) + ml["draw"] * blend_weight
            final_away = pred.away_win_prob * (1 - blend_weight) + ml["away_win"] * blend_weight
            model_type = f"ml_blend_{blend_weight}"
        else:
            final_home = pred.home_win_prob
            final_draw = pred.draw_prob
            final_away = pred.away_win_prob
            model_type = "poisson"

        prediction = Prediction(
            match_id=match.id,
            model_type=model_type,
            pred_home_score=pred.pred_home_score,
            pred_away_score=pred.pred_away_score,
            home_win_prob=round(final_home, 4),
            draw_prob=round(final_draw, 4),
            away_win_prob=round(final_away, 4),
            score_matrix_json=pred.score_matrix,
        )

        db.add(prediction)
        await db.commit()
        await db.refresh(prediction)
        return prediction
