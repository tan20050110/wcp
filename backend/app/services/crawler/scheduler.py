"""Smart scheduler — only polls during live matches, sleeps otherwise."""
import logging
from datetime import datetime, timezone, timedelta
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.interval import IntervalTrigger
from sqlalchemy import select
from ...core.database import async_session
from ...models.match import Match, MatchStatus

logger = logging.getLogger(__name__)
scheduler = AsyncIOScheduler()

# Adaptive polling frequency
POLL_FAST = 30     # seconds — during live matches
POLL_MEDIUM = 300  # 5 min — within 1 hour of kickoff
POLL_SLOW = 3600   # 1 hour — off-season / no matches today


async def smart_update():
    """Check for match activity and poll accordingly."""
    from .live_updater import live_updater

    async with async_session() as db:
        now = datetime.now(timezone.utc)
        upcoming_window = now + timedelta(hours=1)

        # Find live matches
        live_result = await db.execute(
            select(Match).where(Match.status == MatchStatus.LIVE)
        )
        live_matches = live_result.scalars().all()

        # Find matches starting within 1 hour
        upcoming_result = await db.execute(
            select(Match).where(
                Match.status == MatchStatus.SCHEDULED,
                Match.match_date <= upcoming_window,
                Match.match_date >= now - timedelta(hours=2),
            )
        )
        upcoming = upcoming_result.scalars().all()

        # Determine polling frequency
        if live_matches:
            # Fast mode: matches are ongoing
            await live_updater.run()
            _set_interval(POLL_FAST)
            logger.info(f"FAST mode: {len(live_matches)} live matches")

        elif upcoming:
            # Medium mode: matches about to start
            await live_updater.run()
            _set_interval(POLL_MEDIUM)
            logger.info(f"MEDIUM mode: {len(upcoming)} upcoming matches")

        else:
            # Slow mode: no matches happening or soon
            _set_interval(POLL_SLOW)
            logger.debug("SLOW mode: no active matches")


def _set_interval(seconds: int):
    """Update the scheduler job interval dynamically."""
    job = scheduler.get_job("smart_updater")
    if job:
        job.reschedule(trigger=IntervalTrigger(seconds=seconds))


def start_scheduler():
    """Start background tasks when FastAPI starts."""
    if scheduler.running:
        return

    scheduler.add_job(
        smart_update,
        trigger="interval",
        seconds=POLL_SLOW,  # Start slow, auto-adjusts
        id="smart_updater",
        name="Smart Match Updater",
        replace_existing=True,
        next_run_time=datetime.now(timezone.utc) + timedelta(seconds=3),
    )

    scheduler.start()
    logger.info("Smart scheduler started — adapts to match activity")


def stop_scheduler():
    if scheduler.running:
        scheduler.shutdown(wait=False)
        logger.info("Scheduler stopped")
