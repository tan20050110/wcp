from fastapi import APIRouter, WebSocket, WebSocketDisconnect, HTTPException
from typing import Any
from datetime import datetime, timezone
import asyncio
import random

router = APIRouter()

class ConnectionManager:
    def __init__(self):
        self.active: list[WebSocket] = []
        self.broadcast_task: asyncio.Task | None = None

    async def connect(self, ws: WebSocket):
        await ws.accept()
        self.active.append(ws)

    def disconnect(self, ws: WebSocket):
        if ws in self.active:
            self.active.remove(ws)

    async def broadcast(self, message: dict[str, Any]):
        dead = []
        for ws in self.active:
            try:
                await ws.send_json(message)
            except Exception:
                dead.append(ws)
        for ws in dead:
            self.active.remove(ws)

    @property
    def connected_count(self) -> int:
        return len(self.active)

manager = ConnectionManager()

# Simulated match engine — runs in background, updates random match every 30s
running_matches: dict[str, dict] = {}  # match_id -> {home_score, away_score, minute}

@router.post("/api/matches/{match_id}/start")
async def start_match(match_id: str):
    """Simulate starting a match (for testing real-time updates)."""
    from ..core.database import async_session
    from ..models.match import Match, MatchStatus
    from sqlalchemy import select

    async with async_session() as db:
        from sqlalchemy.orm import selectinload
        result = await db.execute(
            select(Match).where(Match.id == match_id)
            .options(selectinload(Match.home_team), selectinload(Match.away_team))
        )
        match = result.scalar_one_or_none()
        if not match:
            raise HTTPException(404, "Match not found")

        match.status = MatchStatus.LIVE
        match.home_score = 0
        match.away_score = 0
        await db.commit()

        running_matches[match_id] = {"home": 0, "away": 0, "minute": 0}

        await manager.broadcast({
            "type": "match_started",
            "match_id": match_id,
            "home_team": match.home_team.name if match.home_team else "Home",
            "away_team": match.away_team.name if match.away_team else "Away",
            "timestamp": datetime.now(timezone.utc).isoformat(),
        })
        return {"status": "started", "match_id": match_id}

@router.post("/api/matches/{match_id}/goal")
async def add_goal(match_id: str, team: str = "home"):
    """Simulate a goal (for testing real-time updates)."""
    if match_id not in running_matches:
        running_matches[match_id] = {"home": 0, "away": 0, "minute": random.randint(1, 90)}

    m = running_matches[match_id]
    if team == "home":
        m["home"] += 1
    else:
        m["away"] += 1
    m["minute"] = min(90, m["minute"] + random.randint(1, 15))

    await manager.broadcast({
        "type": "goal",
        "match_id": match_id,
        "team": team,
        "home_score": m["home"],
        "away_score": m["away"],
        "minute": m["minute"],
        "timestamp": datetime.now(timezone.utc).isoformat(),
    })
    return m

@router.post("/api/matches/{match_id}/finish")
async def finish_match(match_id: str):
    """Simulate match ending."""
    from ..core.database import async_session
    from ..models.match import Match, MatchStatus
    from sqlalchemy import select

    m = running_matches.pop(match_id, {"home": 0, "away": 0, "minute": 90})

    async with async_session() as db:
        result = await db.execute(select(Match).where(Match.id == match_id))
        match = result.scalar_one_or_none()
        if match:
            match.status = MatchStatus.FINISHED
            match.home_score = m["home"]
            match.away_score = m["away"]
            await db.commit()

    await manager.broadcast({
        "type": "match_finished",
        "match_id": match_id,
        "home_score": m["home"],
        "away_score": m["away"],
        "timestamp": datetime.now(timezone.utc).isoformat(),
    })
    return {"status": "finished", **m}

@router.get("/api/ws/status")
async def ws_status():
    """Get WebSocket connection count, running matches, and scheduler state."""
    from ..services.crawler.scheduler import scheduler
    jobs = scheduler.get_jobs() if scheduler.running else []
    return {
        "connections": manager.connected_count,
        "running_matches": len(running_matches),
        "scheduler_running": scheduler.running,
        "scheduler_jobs": [{"id": j.id, "name": j.name, "next_run": str(j.next_run_time)} for j in jobs],
    }

@router.websocket("/ws/updates")
async def updates_endpoint(ws: WebSocket):
    await manager.connect(ws)
    try:
        while True:
            await ws.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(ws)
