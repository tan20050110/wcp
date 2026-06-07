from uuid import UUID
from sqlalchemy import select
from .poisson import predict_match
from .adjuster import adjust_team_strength
from ...core.database import async_session
from ...models.team import Team
from ...models.match import Match
from ...models.prediction import Prediction

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

        prediction = Prediction(
            match_id=match.id,
            model_type="poisson_ml",
            pred_home_score=pred.pred_home_score,
            pred_away_score=pred.pred_away_score,
            home_win_prob=pred.home_win_prob,
            draw_prob=pred.draw_prob,
            away_win_prob=pred.away_win_prob,
            score_matrix_json=pred.score_matrix,
        )

        db.add(prediction)
        await db.commit()
        await db.refresh(prediction)
        return prediction
