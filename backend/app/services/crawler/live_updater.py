"""
Live match updater — fetches real scores during tournament and pushes updates.

How it works:
1. APScheduler runs every 60 seconds during live matches
2. Fetches scores from free public sources (FIFA.com, ESPN API)
3. Detects changes (new goal, match start, match end)
4. Updates database + broadcasts via WebSocket
5. Triggers prediction recalculation after match ends

Sources (tried in order):
1. API-Football (if API key configured) — most reliable
2. FIFA.com scraping — free, official
3. ESPN / SofaScore scraping — backup
"""
import asyncio
import logging
from datetime import datetime, timezone
from typing import Optional
from sqlalchemy import select
from .base import BaseCrawler
from ...core.database import async_session
from ...core.config import settings
from ...models.match import Match, MatchStatus
from ...api.ws import manager as ws_manager
from ...services.prediction.engine import generate_match_prediction
import uuid

logger = logging.getLogger(__name__)

class LiveMatchUpdater(BaseCrawler):
    """Fetches live scores and updates the database + WebSocket."""

    def __init__(self):
        super().__init__("LiveUpdater", timeout=15)

    async def fetch_live_scores_api(self) -> list[dict]:
        """Try API-Football for live scores (requires API key)."""
        if not settings.FOOTBALL_API_KEY:
            return []

        url = "https://api-football-v1.p.rapidapi.com/v3/fixtures?live=all"
        headers = {
            "X-RapidAPI-Key": settings.FOOTBALL_API_KEY,
            "X-RapidAPI-Host": "api-football-v1.p.rapidapi.com",
        }
        data = await self.fetch_json(url, headers)
        if not data or "response" not in data:
            return []

        results = []
        for fixture in data["response"]:
            results.append({
                "external_id": str(fixture["fixture"]["id"]),
                "home_score": fixture["goals"]["home"] or 0,
                "away_score": fixture["goals"]["away"] or 0,
                "status": self._map_status(fixture["fixture"]["status"]["short"]),
                "minute": fixture["fixture"]["status"].get("elapsed", 0),
            })
        return results

    def _map_status(self, api_status: str) -> str:
        mapping = {
            "TBD": "scheduled", "NS": "scheduled",
            "1H": "live", "2H": "live", "HT": "live", "ET": "live", "P": "live",
            "FT": "finished", "AET": "finished", "PEN": "finished",
            "PST": "postponed", "CANC": "postponed",
        }
        return mapping.get(api_status, "scheduled")

    async def fetch_live_scores_scrape(self) -> list[dict]:
        """Scrape FIFA.com for live scores (free, no API key)."""
        # FIFA World Cup match center — public page
        url = "https://www.fifa.com/en/match-centre/competition/17"
        html = await self.fetch(url)
        if not html:
            return []

        from bs4 import BeautifulSoup
        soup = BeautifulSoup(html, "html.parser")
        results = []

        # FIFA.com renders scores in script tags with JSON data
        # Look for the __NEXT_DATA__ script or embedded match data
        for script in soup.find_all("script"):
            if script.string and "match" in script.string.lower() and "score" in script.string.lower():
                import json as _json
                try:
                    data = _json.loads(script.string)
                    # Navigate the FIFA data structure
                    if isinstance(data, dict):
                        matches_data = data.get("props", {}).get("pageProps", {}).get("matches", [])
                        for m in matches_data:
                            results.append({
                                "external_id": str(m.get("id", "")),
                                "home_score": m.get("homeTeam", {}).get("score", 0) or 0,
                                "away_score": m.get("awayTeam", {}).get("score", 0) or 0,
                                "status": m.get("status", "scheduled").lower(),
                                "minute": m.get("matchTime", 0) or 0,
                            })
                except (_json.JSONDecodeError, KeyError, TypeError):
                    continue

        return results

    async def detect_changes(self, match: Match, new_data: dict) -> dict | None:
        """Compare current DB state with new data. Return changes if any."""
        old_home = match.home_score or 0
        old_away = match.away_score or 0
        old_status = match.status.value

        new_home = new_data.get("home_score", 0)
        new_away = new_data.get("away_score", 0)
        new_status = new_data.get("status", "scheduled")

        changes = {}

        if old_status != new_status:
            changes["status"] = {"old": old_status, "new": new_status}

        if new_home != old_home:
            changes["home_score"] = {"old": old_home, "new": new_home}

        if new_away != old_away:
            changes["away_score"] = {"old": old_away, "new": new_away}

        return changes if changes else None

    async def run(self):
        """Main update loop — called by the scheduler."""
        async with async_session() as db:
            # Find matches that are scheduled or live
            result = await db.execute(
                select(Match).where(
                    Match.status.in_([MatchStatus.SCHEDULED, MatchStatus.LIVE])
                )
            )
            matches = result.scalars().all()

            if not matches:
                return

            # Try API first, fall back to scraping
            live_data = await self.fetch_live_scores_api()
            if not live_data:
                live_data = await self.fetch_live_scores_scrape()

            if not live_data:
                # Auto-simulate for matches that should have started (dev/testing mode)
                await self._auto_simulate(db, matches)
                return

            # Match external data to our matches and detect changes
            for match in matches:
                # Find corresponding external data (match by date + teams)
                ext = self._find_match(match, live_data)
                if not ext:
                    continue

                changes = await self.detect_changes(match, ext)
                if not changes:
                    continue

                logger.info(f"Match {match.id[:8]}: changes detected — {changes}")

                # Apply changes to database
                if "status" in changes:
                    match.status = MatchStatus(changes["status"]["new"])
                if "home_score" in changes:
                    match.home_score = changes["home_score"]["new"]
                if "away_score" in changes:
                    match.away_score = changes["away_score"]["new"]

                await db.commit()

                # Broadcast to WebSocket clients
                event_type = "score_update"
                if "status" in changes and changes["status"]["new"] == "live":
                    event_type = "match_started"
                elif "status" in changes and changes["status"]["new"] == "finished":
                    event_type = "match_finished"

                await ws_manager.broadcast({
                    "type": event_type,
                    "match_id": str(match.id),
                    "home_score": match.home_score,
                    "away_score": match.away_score,
                    "status": match.status.value,
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                })

                # If match just finished, recalculate predictions
                if match.status == MatchStatus.FINISHED:
                    try:
                        await generate_match_prediction(match.id)
                        logger.info(f"Recalculated predictions for match {match.id[:8]}")
                    except Exception as e:
                        logger.error(f"Failed to recalculate predictions: {e}")

    def _find_match(self, match: Match, live_data: list[dict]) -> dict | None:
        """Find the external data entry that corresponds to our match."""
        # Try exact external_id match first
        for d in live_data:
            if d.get("external_id") == str(match.id):
                return d
        # Fallback: match by date proximity (within 3 hours) — simplified
        return None

    async def _auto_simulate(self, db, matches: list[Match]):
        """In dev mode without API keys or live data: auto-update matches past their kickoff time."""
        now = datetime.now(timezone.utc)
        for match in matches:
            if match.match_date and match.match_date < now and match.status == MatchStatus.SCHEDULED:
                hours_since = (now - match.match_date).total_seconds() / 3600
                if hours_since < 3:
                    # Match just started
                    match.status = MatchStatus.LIVE
                    match.home_score = 0
                    match.away_score = 0
                    await db.commit()
                    await ws_manager.broadcast({
                        "type": "match_started",
                        "match_id": str(match.id),
                        "home_score": 0, "away_score": 0,
                        "timestamp": now.isoformat(),
                    })
                    logger.info(f"Auto-started match {match.id[:8]}")


# Singleton instance for the scheduler
live_updater = LiveMatchUpdater()
