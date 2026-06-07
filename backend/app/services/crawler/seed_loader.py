import json
import logging
from pathlib import Path
from sqlalchemy import select
from ...models.team import Team
from ...models.match import Match, MatchStage, MatchStatus
from ...core.database import async_session
from datetime import datetime

logger = logging.getLogger(__name__)
SEED_DIR = Path(__file__).parent.parent.parent.parent / "data"

async def load_seed_teams():
    seed_path = SEED_DIR / "teams_2026.json"
    if not seed_path.exists():
        logger.warning(f"Seed file not found: {seed_path}")
        return

    with open(seed_path, encoding="utf-8") as f:
        teams_data = json.load(f)

    async with async_session() as db:
        for t in teams_data:
            existing = (await db.execute(select(Team).where(Team.fifa_code == t["fifa_code"]))).scalar_one_or_none()
            if not existing:
                team = Team(
                    name=t["name"], fifa_code=t["fifa_code"], group=t.get("group"),
                    fifa_rank=t.get("fifa_rank"), elo_rating=t.get("elo_rating"),
                    stats_json=t.get("stats", {}),
                )
                db.add(team)
                logger.info(f"Added team: {t['name']}")
        await db.commit()
    logger.info("Seed teams loaded")

async def load_seed_schedule():
    seed_path = SEED_DIR / "matches_2026.json"
    if not seed_path.exists():
        logger.warning(f"Seed file not found: {seed_path}")
        return

    with open(seed_path, encoding="utf-8") as f:
        matches_data = json.load(f)

    async with async_session() as db:
        for m in matches_data:
            home = (await db.execute(select(Team).where(Team.fifa_code == m["home_code"]))).scalar_one_or_none()
            away = (await db.execute(select(Team).where(Team.fifa_code == m["away_code"]))).scalar_one_or_none()
            if not home or not away:
                continue
            existing = (await db.execute(
                select(Match).where(Match.home_team_id == home.id, Match.away_team_id == away.id,
                                    Match.stage == m.get("stage", "group"))
            )).scalar_one_or_none()
            if not existing:
                match = Match(
                    home_team_id=home.id, away_team_id=away.id,
                    match_date=datetime.fromisoformat(m["match_date"]),
                    stage=MatchStage(m.get("stage", "group")),
                    group=m.get("group"), venue=m.get("venue"),
                    status=MatchStatus.SCHEDULED,
                )
                db.add(match)
        await db.commit()
    logger.info("Seed schedule loaded")
