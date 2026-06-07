# World Cup 2026 Prediction System — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a complete World Cup prediction platform with React frontend + FastAPI backend + PostgreSQL + Docker.

**Architecture:** React SPA (Vite + TailwindCSS + shadcn/ui) communicates with FastAPI REST/WebSocket backend. PostgreSQL stores structured data, Redis caches predictions and crawler state. APScheduler runs crawlers for live data. Prediction engine uses Poisson model + XGBoost correction + Monte Carlo simulation.

**Tech Stack:** React 18 + TypeScript + Vite 5 + TailwindCSS 4 + shadcn/ui + Recharts, FastAPI + SQLAlchemy 2.0 + PostgreSQL 16 + Redis 7, scipy + scikit-learn + NumPy, Docker Compose

---

## Phase 1: Project Scaffold & Infrastructure

### Task 1.1: Create project directory structure

**Files:**
- Create: `F:/世界杯/.gitignore`
- Create: `F:/世界杯/README.md`

- [ ] **Step 1: Initialize project root**

```bash
cd /f/世界杯
git init
```

- [ ] **Step 2: Write .gitignore**

```
.env
__pycache__/
*.pyc
node_modules/
dist/
.vite/
*.egg-info/
.venv/
venv/
.DS_Store
*.log
postgres-data/
redis-data/
backend/app/ml/models/*.pkl
backend/app/ml/models/*.json
```

- [ ] **Step 3: Commit**

```bash
git add -A && git commit -m "chore: init project scaffold"
```

### Task 1.2: Set up Docker Compose with PostgreSQL + Redis

**Files:**
- Create: `F:/世界杯/docker-compose.yml`
- Create: `F:/世界杯/.env.example`

- [ ] **Step 1: Write docker-compose.yml**

```yaml
version: "3.9"

services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: wcp
      POSTGRES_PASSWORD: ${DB_PASSWORD:-wcp_dev}
      POSTGRES_DB: world_cup_predictor
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U wcp -d world_cup_predictor"]
      interval: 5s
      retries: 5
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      retries: 5
    restart: unless-stopped

volumes:
  postgres_data:
  redis_data:
```

- [ ] **Step 2: Write .env.example**

```
DB_PASSWORD=your_db_password_here
FOOTBALL_API_KEY=your_rapidapi_key_here
WEATHER_API_KEY=your_openweather_key_here
SECRET_KEY=your_random_secret_string
```

- [ ] **Step 3: Start and verify services**

```bash
cp .env.example .env
docker-compose up -d
docker-compose ps
```

Expected: postgres and redis both `Up` / healthy.

- [ ] **Step 4: Commit**

```bash
git add docker-compose.yml .env.example && git commit -m "chore: add docker-compose with postgres + redis"
```

### Task 1.3: Initialize FastAPI backend

**Files:**
- Create: `F:/世界杯/backend/requirements.txt`
- Create: `F:/世界杯/backend/app/__init__.py`
- Create: `F:/世界杯/backend/app/main.py`
- Create: `F:/世界杯/backend/app/core/__init__.py`
- Create: `F:/世界杯/backend/app/core/config.py`
- Create: `F:/世界杯/backend/app/core/database.py`
- Create: `F:/世界杯/backend/app/core/redis.py`

- [ ] **Step 1: Write requirements.txt**

```
fastapi==0.115.0
uvicorn[standard]==0.30.6
sqlalchemy==2.0.35
asyncpg==0.29.0
alembic==1.13.2
psycopg2-binary==2.9.9
redis==5.1.1
httpx==0.27.2
beautifulsoup4==4.12.3
apscheduler==3.10.4
scipy==1.14.1
scikit-learn==1.5.2
numpy==2.1.1
xgboost==2.1.1
pydantic==2.9.2
pydantic-settings==2.5.2
python-dotenv==1.0.1
```

- [ ] **Step 2: Write core/config.py**

```python
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    DATABASE_URL: str = "postgresql+asyncpg://wcp:wcp_dev@localhost:5432/world_cup_predictor"
    DATABASE_URL_SYNC: str = "postgresql+psycopg2://wcp:wcp_dev@localhost:5432/world_cup_predictor"
    REDIS_URL: str = "redis://localhost:6379/0"
    FOOTBALL_API_KEY: str = ""
    WEATHER_API_KEY: str = ""
    SECRET_KEY: str = "dev-secret-change-me"
    CORS_ORIGINS: list[str] = ["http://localhost:5173"]

    class Config:
        env_file = "../.env"

settings = Settings()
```

- [ ] **Step 3: Write core/database.py**

```python
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.orm import DeclarativeBase
from .config import settings

engine = create_async_engine(settings.DATABASE_URL, echo=False)
async_session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

class Base(DeclarativeBase):
    pass

async def get_db() -> AsyncSession:
    async with async_session() as session:
        yield session
```

- [ ] **Step 4: Write core/redis.py**

```python
import redis.asyncio as aioredis
from .config import settings

async def get_redis():
    return await aioredis.from_url(settings.REDIS_URL, decode_responses=True)

redis_client = None

async def init_redis():
    global redis_client
    redis_client = await aioredis.from_url(settings.REDIS_URL, decode_responses=True)
```

- [ ] **Step 5: Write main.py**

```python
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .core.config import settings
from .core.redis import init_redis

@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_redis()
    yield

app = FastAPI(title="World Cup Predictor", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/api/health")
async def health():
    return {"status": "ok"}
```

- [ ] **Step 6: Run and verify**

```bash
cd backend && pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
curl http://localhost:8000/api/health
```

Expected: `{"status":"ok"}`

- [ ] **Step 7: Commit**

```bash
git add backend/ requirements.txt && git commit -m "chore: init FastAPI backend skeleton"
```

### Task 1.4: Initialize React frontend

**Files:**
- Create: `F:/世界杯/frontend/` (via Vite)

- [ ] **Step 1: Scaffold with Vite**

```bash
cd /f/世界杯
npm create vite@latest frontend -- --template react-ts
cd frontend
npm install
```

- [ ] **Step 2: Install dependencies**

```bash
npm install react-router-dom framer-motion recharts axios
npm install -D tailwindcss @tailwindcss/vite
```

- [ ] **Step 3: Configure Tailwind**

Edit `frontend/vite.config.ts`:
```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      '/api': 'http://localhost:8000',
      '/ws': { target: 'ws://localhost:8000', ws: true },
    },
  },
})
```

- [ ] **Step 4: Write CSS entry**

Replace `frontend/src/index.css`:
```css
@import "tailwindcss";

:root {
  --color-bg: #0a0f1a;
  --color-green: #1a5632;
  --color-gold: #d4a843;
  --color-card: rgba(255, 255, 255, 0.05);
}
```

- [ ] **Step 5: Verify frontend starts**

```bash
cd frontend && npm run dev
```

Open `http://localhost:5173`, should see Vite default page.

- [ ] **Step 6: Commit**

```bash
git add frontend/ && git commit -m "chore: init React frontend with Vite + TailwindCSS"
```

---

## Phase 2: Backend Data Models & Migrations

### Task 2.1: Create SQLAlchemy models

**Files:**
- Create: `F:/世界杯/backend/app/models/__init__.py`
- Create: `F:/世界杯/backend/app/models/team.py`
- Create: `F:/世界杯/backend/app/models/match.py`
- Create: `F:/世界杯/backend/app/models/prediction.py`
- Create: `F:/世界杯/backend/app/models/base.py`

- [ ] **Step 1: Write models/base.py**

```python
import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, DateTime, func
from sqlalchemy.dialects.postgresql import UUID
from ..core.database import Base

class TimestampMixin:
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

class UUIDMixin:
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
```

- [ ] **Step 2: Write models/team.py**

```python
from sqlalchemy import Column, String, Integer, Float
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
from .base import Base, UUIDMixin, TimestampMixin

class Team(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "teams"

    name = Column(String(100), nullable=False)
    fifa_code = Column(String(3), unique=True, nullable=False)
    group = Column(String(1), nullable=True)
    fifa_rank = Column(Integer, nullable=True)
    elo_rating = Column(Float, nullable=True)
    flag_url = Column(String(500), nullable=True)
    squad_json = Column(JSONB, default=list)
    stats_json = Column(JSONB, default=dict)
    availability_json = Column(JSONB, default=dict)

    home_matches = relationship("Match", foreign_keys="Match.home_team_id", back_populates="home_team")
    away_matches = relationship("Match", foreign_keys="Match.away_team_id", back_populates="away_team")
```

- [ ] **Step 3: Write models/match.py**

```python
from sqlalchemy import Column, String, Integer, Float, DateTime, Enum, ForeignKey
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
from .base import Base, UUIDMixin, TimestampMixin
import enum

class MatchStage(str, enum.Enum):
    GROUP = "group"
    ROUND16 = "round16"
    QUARTER = "quarter"
    SEMI = "semi"
    THIRD = "third"
    FINAL = "final"

class MatchStatus(str, enum.Enum):
    SCHEDULED = "scheduled"
    LIVE = "live"
    FINISHED = "finished"
    POSTPONED = "postponed"

class Match(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "matches"

    home_team_id = Column(UUID(as_uuid=True), ForeignKey("teams.id"), nullable=False)
    away_team_id = Column(UUID(as_uuid=True), ForeignKey("teams.id"), nullable=False)
    match_date = Column(DateTime(timezone=True), nullable=False)
    stage = Column(Enum(MatchStage), default=MatchStage.GROUP)
    group = Column(String(1), nullable=True)
    status = Column(Enum(MatchStatus), default=MatchStatus.SCHEDULED)
    home_score = Column(Integer, nullable=True)
    away_score = Column(Integer, nullable=True)
    venue = Column(String(200), nullable=True)
    venue_meta_json = Column(JSONB, default=dict)

    home_team = relationship("Team", foreign_keys=[home_team_id], back_populates="home_matches")
    away_team = relationship("Team", foreign_keys=[away_team_id], back_populates="away_matches")
    predictions = relationship("Prediction", back_populates="match", cascade="all, delete-orphan")
```

- [ ] **Step 4: Write models/prediction.py**

```python
from sqlalchemy import Column, String, Integer, Float, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
from .base import Base, UUIDMixin, TimestampMixin

class Prediction(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "predictions"

    match_id = Column(UUID(as_uuid=True), ForeignKey("matches.id"), nullable=False)
    model_type = Column(String(20), default="poisson_ml")
    pred_home_score = Column(Float, nullable=False)
    pred_away_score = Column(Float, nullable=False)
    home_win_prob = Column(Float, nullable=False)
    draw_prob = Column(Float, nullable=False)
    away_win_prob = Column(Float, nullable=False)
    score_matrix_json = Column(JSONB, default=dict)

    match = relationship("Match", back_populates="predictions")

class Simulation(Base, UUIDMixin):
    __tablename__ = "simulations"

    run_at = Column(DateTime(timezone=True), nullable=False)
    total_simulations = Column(Integer, default=10000)
    results_json = Column(JSONB, default=dict)
    bracket_json = Column(JSONB, default=dict)
```

- [ ] **Step 5: Write models/__init__.py**

```python
from .team import Team
from .match import Match, MatchStage, MatchStatus
from .prediction import Prediction, Simulation
from .base import Base, UUIDMixin, TimestampMixin
```

- [ ] **Step 6: Commit**

```bash
git add backend/app/models/ && git commit -m "feat: add SQLAlchemy models (teams, matches, predictions, simulations)"
```

### Task 2.2: Set up Alembic and run initial migration

**Files:**
- Create: `F:/世界杯/backend/alembic/` (generated)
- Modify: `F:/世界杯/backend/alembic/env.py`
- Modify: `F:/世界杯/backend/alembic.ini`

- [ ] **Step 1: Initialize Alembic**

```bash
cd /f/世界杯/backend
pip install alembic
alembic init alembic
```

- [ ] **Step 2: Configure alembic/env.py**

In `env.py`, set `target_metadata`:
```python
from app.models.base import Base
from app.models import Team, Match, Prediction, Simulation
target_metadata = Base.metadata
```

And configure sync DB URL:
```python
from app.core.config import settings
config.set_main_option("sqlalchemy.url", settings.DATABASE_URL_SYNC)
```

- [ ] **Step 3: Generate and run migration**

```bash
alembic revision --autogenerate -m "init"
alembic upgrade head
```

- [ ] **Step 4: Verify tables exist**

```bash
docker-compose exec postgres psql -U wcp -d world_cup_predictor -c "\dt"
```

Expected: `teams`, `matches`, `predictions`, `simulations`, `alembic_version`

- [ ] **Step 5: Commit**

```bash
git add backend/alembic/ backend/alembic.ini && git commit -m "chore: add Alembic migrations"
```

---

## Phase 3: Backend API Layer

### Task 3.1: Pydantic schemas

**Files:**
- Create: `F:/世界杯/backend/app/schemas/__init__.py`
- Create: `F:/世界杯/backend/app/schemas/team.py`
- Create: `F:/世界杯/backend/app/schemas/match.py`
- Create: `F:/世界杯/backend/app/schemas/prediction.py`

- [ ] **Step 1: Write schemas/team.py**

```python
from pydantic import BaseModel
from uuid import UUID
from typing import Optional
from datetime import datetime

class TeamBase(BaseModel):
    name: str
    fifa_code: str
    group: Optional[str] = None
    fifa_rank: Optional[int] = None
    elo_rating: Optional[float] = None
    flag_url: Optional[str] = None

class TeamCreate(TeamBase):
    pass

class TeamResponse(TeamBase):
    id: UUID
    squad_json: dict = {}
    stats_json: dict = {}
    availability_json: dict = {}
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class TeamDetailResponse(TeamResponse):
    recent_matches: list = []
    prediction_summary: Optional[dict] = None
```

- [ ] **Step 2: Write schemas/match.py**

```python
from pydantic import BaseModel
from uuid import UUID
from typing import Optional
from datetime import datetime

class MatchBase(BaseModel):
    home_team_id: UUID
    away_team_id: UUID
    match_date: datetime
    stage: str = "group"
    group: Optional[str] = None
    venue: Optional[str] = None

class MatchCreate(MatchBase):
    pass

class MatchResponse(MatchBase):
    id: UUID
    status: str
    home_score: Optional[int] = None
    away_score: Optional[int] = None
    venue_meta_json: dict = {}
    home_team: Optional[dict] = None
    away_team: Optional[dict] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class MatchDetailResponse(MatchResponse):
    predictions: list = []
```

- [ ] **Step 3: Write schemas/prediction.py**

```python
from pydantic import BaseModel
from uuid import UUID
from typing import Optional
from datetime import datetime

class PredictionResponse(BaseModel):
    id: UUID
    match_id: UUID
    model_type: str
    pred_home_score: float
    pred_away_score: float
    home_win_prob: float
    draw_prob: float
    away_win_prob: float
    score_matrix_json: dict = {}
    created_at: datetime

    class Config:
        from_attributes = True

class SimulationResponse(BaseModel):
    id: UUID
    run_at: datetime
    total_simulations: int
    results_json: dict = {}
    bracket_json: dict = {}

    class Config:
        from_attributes = True

class SimulateRequest(BaseModel):
    total_simulations: int = 10000
```

- [ ] **Step 4: Commit**

```bash
git add backend/app/schemas/ && git commit -m "feat: add Pydantic schemas"
```

### Task 3.2: Teams API endpoints

**Files:**
- Create: `F:/世界杯/backend/app/api/__init__.py`
- Create: `F:/世界杯/backend/app/api/teams.py`

- [ ] **Step 1: Write api/teams.py**

```python
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from ..core.database import get_db
from ..models.team import Team
from ..schemas.team import TeamCreate, TeamResponse, TeamDetailResponse
from typing import Optional

router = APIRouter(prefix="/api/teams", tags=["teams"])

@router.get("", response_model=list[TeamResponse])
async def list_teams(
    group: Optional[str] = Query(None, max_length=1),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(Team).order_by(Team.fifa_rank)
    if group:
        stmt = stmt.where(Team.group == group.upper())
    result = await db.execute(stmt)
    return result.scalars().all()

@router.get("/{team_id}", response_model=TeamDetailResponse)
async def get_team(team_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Team).where(Team.id == team_id))
    team = result.scalar_one_or_none()
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")
    return team

@router.post("", response_model=TeamResponse, status_code=201)
async def create_team(body: TeamCreate, db: AsyncSession = Depends(get_db)):
    team = Team(**body.model_dump())
    db.add(team)
    await db.commit()
    await db.refresh(team)
    return team
```

- [ ] **Step 2: Register router in main.py**

Add to `backend/app/main.py`:
```python
from .api.teams import router as teams_router
app.include_router(teams_router)
```

- [ ] **Step 3: Test endpoint**

```bash
curl -X POST http://localhost:8000/api/teams \
  -H "Content-Type: application/json" \
  -d '{"name":"Brazil","fifa_code":"BRA","group":"A","fifa_rank":1,"elo_rating":2100}'
curl http://localhost:8000/api/teams
```

- [ ] **Step 4: Commit**

```bash
git add backend/app/api/ backend/app/main.py && git commit -m "feat: add teams CRUD API"
```

### Task 3.3: Matches API endpoints

**Files:**
- Create: `F:/世界杯/backend/app/api/matches.py`

- [ ] **Step 1: Write api/matches.py**

```python
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from ..core.database import get_db
from ..models.match import Match, MatchStatus
from ..schemas.match import MatchCreate, MatchResponse, MatchDetailResponse
from typing import Optional

router = APIRouter(prefix="/api/matches", tags=["matches"])

@router.get("", response_model=list[MatchResponse])
async def list_matches(
    stage: Optional[str] = None,
    group: Optional[str] = None,
    status: Optional[str] = None,
    team_id: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
):
    stmt = select(Match).order_by(Match.match_date)
    if stage:
        stmt = stmt.where(Match.stage == stage)
    if group:
        stmt = stmt.where(Match.group == group.upper())
    if status:
        stmt = stmt.where(Match.status == status)
    if team_id:
        from sqlalchemy import or_
        stmt = stmt.where(or_(Match.home_team_id == team_id, Match.away_team_id == team_id))
    result = await db.execute(stmt.options(selectinload(Match.home_team), selectinload(Match.away_team)))
    return result.scalars().all()

@router.get("/live", response_model=list[MatchResponse])
async def live_matches(db: AsyncSession = Depends(get_db)):
    stmt = select(Match).where(Match.status == MatchStatus.LIVE).order_by(Match.match_date)
    result = await db.execute(stmt.options(selectinload(Match.home_team), selectinload(Match.away_team)))
    return result.scalars().all()

@router.get("/{match_id}", response_model=MatchDetailResponse)
async def get_match(match_id: str, db: AsyncSession = Depends(get_db)):
    stmt = select(Match).where(Match.id == match_id).options(
        selectinload(Match.home_team), selectinload(Match.away_team), selectinload(Match.predictions)
    )
    result = await db.execute(stmt)
    match = result.scalar_one_or_none()
    if not match:
        raise HTTPException(status_code=404, detail="Match not found")
    return match

@router.post("", response_model=MatchResponse, status_code=201)
async def create_match(body: MatchCreate, db: AsyncSession = Depends(get_db)):
    match = Match(**body.model_dump())
    db.add(match)
    await db.commit()
    await db.refresh(match)
    return match
```

- [ ] **Step 2: Register in main.py**

```python
from .api.matches import router as matches_router
app.include_router(matches_router)
```

- [ ] **Step 3: Commit**

```bash
git add backend/app/api/matches.py backend/app/main.py && git commit -m "feat: add matches API with live endpoint"
```

### Task 3.4: WebSocket manager

**Files:**
- Create: `F:/世界杯/backend/app/api/ws.py`

- [ ] **Step 1: Write api/ws.py**

```python
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from typing import Any
import json

router = APIRouter()

class ConnectionManager:
    def __init__(self):
        self.active: list[WebSocket] = []

    async def connect(self, ws: WebSocket):
        await ws.accept()
        self.active.append(ws)

    def disconnect(self, ws: WebSocket):
        self.active.remove(ws)

    async def broadcast(self, message: dict[str, Any]):
        for ws in self.active:
            try:
                await ws.send_json(message)
            except Exception:
                self.active.remove(ws)

manager = ConnectionManager()

@router.websocket("/ws/updates")
async def updates_endpoint(ws: WebSocket):
    await manager.connect(ws)
    try:
        while True:
            await ws.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(ws)
```

- [ ] **Step 2: Register in main.py**

```python
from .api.ws import router as ws_router
app.include_router(ws_router)
```

- [ ] **Step 3: Commit**

```bash
git add backend/app/api/ws.py backend/app/main.py && git commit -m "feat: add WebSocket connection manager"
```

---

## Phase 4: Prediction Engine

### Task 4.1: Poisson model

**Files:**
- Create: `F:/世界杯/backend/app/services/__init__.py`
- Create: `F:/世界杯/backend/app/services/prediction/__init__.py`
- Create: `F:/世界杯/backend/app/services/prediction/poisson.py`

- [ ] **Step 1: Write poisson.py**

```python
import numpy as np
from scipy.stats import poisson
from dataclasses import dataclass

@dataclass
class MatchPrediction:
    home_win_prob: float
    draw_prob: float
    away_win_prob: float
    pred_home_score: float
    pred_away_score: float
    score_matrix: list[list[float]]
    most_likely_score: str

GOAL_CAP = 10

def compute_lambda(team_elo: float, opponent_elo: float, home_advantage: bool = True) -> float:
    elo_diff = (team_elo - opponent_elo) / 400.0
    base_lambda = 1.5 * (10 ** (elo_diff / 2.0))
    if home_advantage:
        base_lambda *= 1.15
    return max(0.3, base_lambda)

def predict_match(home_elo: float, away_elo: float, home_attack: float = 1.0,
                  away_defense: float = 1.0, away_attack: float = 1.0, home_defense: float = 1.0) -> MatchPrediction:
    lambda_h = compute_lambda(home_elo, away_elo, True) * home_attack / away_defense
    lambda_a = compute_lambda(away_elo, home_elo, False) * away_attack / home_defense

    max_goals = GOAL_CAP
    prob_matrix = [[poisson.pmf(i, lambda_h) * poisson.pmf(j, lambda_a)
                    for j in range(max_goals + 1)] for i in range(max_goals + 1)]

    home_win = sum(prob_matrix[i][j] for i in range(max_goals + 1) for j in range(i))
    draw = sum(prob_matrix[i][i] for i in range(max_goals + 1))
    away_win = sum(prob_matrix[i][j] for i in range(max_goals + 1) for j in range(i + 1, max_goals + 1))

    total = home_win + draw + away_win
    home_win /= total; draw /= total; away_win /= total

    most_likely = max(
        ((i, j, prob_matrix[i][j]) for i in range(max_goals + 1) for j in range(max_goals + 1)),
        key=lambda x: x[2]
    )

    return MatchPrediction(
        home_win_prob=round(home_win, 4),
        draw_prob=round(draw, 4),
        away_win_prob=round(away_win, 4),
        pred_home_score=lambda_h,
        pred_away_score=lambda_a,
        score_matrix=[[round(p, 6) for p in row] for row in prob_matrix],
        most_likely_score=f"{most_likely[0]}-{most_likely[1]}",
    )
```

- [ ] **Step 2: Verify it works**

```bash
cd /f/世界杯/backend && python3 -c "
from app.services.prediction.poisson import predict_match
p = predict_match(2100, 1950)
print(f'Home win: {p.home_win_prob:.1%}, Draw: {p.draw_prob:.1%}, Away win: {p.away_win_prob:.1%}')
print(f'Most likely: {p.most_likely_score}')
"
```

Expected: reasonable probabilities.

- [ ] **Step 3: Commit**

```bash
git add backend/app/services/ && git commit -m "feat: add Poisson prediction model"
```

### Task 4.2: Team strength dynamic adjustment

**Files:**
- Create: `F:/世界杯/backend/app/services/prediction/adjuster.py`

- [ ] **Step 1: Write adjuster.py**

```python
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
    """Adjust team attack/defense indices based on real-time factors."""

    attack_mod = 1.0
    defense_mod = 1.0

    # Injuries & suspensions: reduce by player contribution weight
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

    # Recent form (last 5 matches)
    if recent_form:
        form_bonus = sum(f.get("result_weight", 0) for f in recent_form[:5]) / len(recent_form[:5])
        form_mod = 1.0 + form_bonus
    else:
        form_mod = 1.0

    attack_mod += (form_mod - 1.0)
    defense_mod += (form_mod - 1.0)

    # Travel fatigue (rest < 72h penalty, long flight penalty)
    if travel_fatigue > 0:
        fatigue_penalty = min(0.15, travel_fatigue * 0.01)
        attack_mod -= fatigue_penalty
        defense_mod -= fatigue_penalty

    # Weather effect (high altitude / high temp → lower goals)
    if weather_factor > 0:
        attack_mod -= min(0.1, weather_factor * 0.02)

    # Home advantage boost
    if home_advantage > 0:
        attack_mod += home_advantage * 0.05

    # Clamp
    attack_mod = max(0.6, min(1.3, attack_mod))
    defense_mod = max(0.6, min(1.3, defense_mod))

    return AdjustedStrength(
        attack=base_attack * attack_mod,
        defense=base_defense * defense_mod,
        midfield=(base_attack + base_defense) / 2 * (attack_mod + defense_mod) / 2,
        modifiers={"injury": attack_mod, "form": form_mod, "fatigue": fatigue_penalty, "weather": weather_factor}
    )
```

- [ ] **Step 2: Commit**

```bash
git add backend/app/services/prediction/adjuster.py && git commit -m "feat: add team strength dynamic adjuster"
```

### Task 4.3: Monte Carlo tournament simulator

**Files:**
- Create: `F:/世界杯/backend/app/services/prediction/simulator.py`

- [ ] **Step 1: Write simulator.py**

```python
import numpy as np
from dataclasses import dataclass, field
from uuid import UUID

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
        # Simulate group stage
        group_standings = _simulate_groups(teams, group_matches, prediction_fn)
        qualifiers = _get_qualifiers(group_standings)

        # Track group exits
        for t in teams:
            if t["id"] not in [q["id"] for q in qualifiers]:
                exit_count[t["id"]] += 1

        # Simulate knockout rounds
        champion = _simulate_knockout(qualifiers, knockout_structure, prediction_fn, semi_count, final_count)
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

def _get_qualifiers(standings):
    # Group teams, sort by points, top 2 advance
    # Simplified: return top 16 by points (full implementation would group properly)
    sorted_teams = sorted(standings.items(), key=lambda x: x[1], reverse=True)
    return [{"id": tid, "points": pts} for tid, pts in sorted_teams[:16]]

def _simulate_knockout(qualifiers, structure, prediction_fn, semi_count, final_count):
    remaining = qualifiers[:]
    round_names = ["round16", "quarter", "semi", "final"]
    for rnd in round_names:
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
                loser = t2 if winner == t1 else t1
                semi_count[loser["id"]] += 1
            if rnd == "final":
                loser = t2 if winner == t1 else t1
                final_count[loser["id"]] += 1
        remaining = next_round
    return remaining[0]["id"]
```

- [ ] **Step 2: Commit**

```bash
git add backend/app/services/prediction/simulator.py && git commit -m "feat: add Monte Carlo tournament simulator"
```

### Task 4.4: Prediction engine orchestrator + Predictions API

**Files:**
- Create: `F:/世界杯/backend/app/services/prediction/engine.py`
- Create: `F:/世界杯/backend/app/api/predictions.py`

- [ ] **Step 1: Write engine.py**

```python
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from uuid import UUID
from .poisson import predict_match
from .adjuster import adjust_team_strength
from ..core.database import async_session
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
            pred_home_score=round(pred.pred_home_score, 2),
            pred_away_score=round(pred.pred_away_score, 2),
            home_win_prob=pred.home_win_prob,
            draw_prob=pred.draw_prob,
            away_win_prob=pred.away_win_prob,
            score_matrix_json=pred.score_matrix,
        )

        db.add(prediction)
        await db.commit()
        await db.refresh(prediction)
        return prediction
```

- [ ] **Step 2: Write api/predictions.py**

```python
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from ..core.database import get_db
from ..models.prediction import Prediction, Simulation
from ..schemas.prediction import PredictionResponse, SimulationResponse, SimulateRequest
from ..services.prediction.engine import generate_match_prediction
from ..services.prediction.simulator import run_tournament_simulation
from ..models.team import Team
from ..models.match import Match
from datetime import datetime, timezone
import uuid
import json

router = APIRouter(prefix="/api/predictions", tags=["predictions"])

@router.get("/match/{match_id}", response_model=PredictionResponse)
async def get_match_prediction(match_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Prediction).where(Prediction.match_id == match_id).order_by(Prediction.created_at.desc()).limit(1)
    )
    pred = result.scalar_one_or_none()
    if not pred:
        pred = await generate_match_prediction(uuid.UUID(match_id))
    return pred

@router.post("/match/{match_id}/refresh", response_model=PredictionResponse)
async def refresh_prediction(match_id: str):
    pred = await generate_match_prediction(uuid.UUID(match_id))
    return pred

@router.post("/simulate", response_model=SimulationResponse, status_code=201)
async def trigger_simulation(
    body: SimulateRequest,
    db: AsyncSession = Depends(get_db),
):
    teams_result = await db.execute(select(Team))
    teams = [{"id": str(t.id), "elo": t.elo_rating or 1500, "name": t.name} for t in teams_result.scalars().all()]

    matches_result = await db.execute(select(Match).where(Match.stage == "group"))
    group_matches = []
    for m in matches_result.scalars().all():
        ht = (await db.execute(select(Team).where(Team.id == m.home_team_id))).scalar_one()
        at = (await db.execute(select(Team).where(Team.id == m.away_team_id))).scalar_one()
        group_matches.append({
            "home_id": str(m.home_team_id), "away_id": str(m.away_team_id),
            "home_elo": ht.elo_rating or 1500, "away_elo": at.elo_rating or 1500,
        })

    from ..services.prediction.poisson import predict_match as pm
    result = run_tournament_simulation(teams, group_matches, [], pm, body.total_simulations)

    sim = Simulation(
        run_at=datetime.now(timezone.utc),
        total_simulations=body.total_simulations,
        results_json={"champions": result.champion_probs, "finalists": result.final_probs, "semifinalists": result.semi_probs},
        bracket_json=result.bracket,
    )
    db.add(sim)
    await db.commit()
    await db.refresh(sim)
    return sim

@router.get("/simulate/{sim_id}", response_model=SimulationResponse)
async def get_simulation(sim_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Simulation).where(Simulation.id == sim_id))
    sim = result.scalar_one_or_none()
    if not sim:
        raise HTTPException(status_code=404, detail="Simulation not found")
    return sim
```

- [ ] **Step 3: Register in main.py**

```python
from .api.predictions import router as predictions_router
app.include_router(predictions_router)
```

- [ ] **Step 4: Commit**

```bash
git add backend/app/services/prediction/engine.py backend/app/api/predictions.py backend/app/main.py && git commit -m "feat: add prediction engine + predictions API"
```

---

## Phase 5: Crawler System

### Task 5.1: Base crawler framework & scheduler

**Files:**
- Create: `F:/世界杯/backend/app/services/crawler/__init__.py`
- Create: `F:/世界杯/backend/app/services/crawler/scheduler.py`
- Create: `F:/世界杯/backend/app/services/crawler/base.py`

- [ ] **Step 1: Write base.py**

```python
import httpx
import logging
from typing import Optional
import asyncio

logger = logging.getLogger(__name__)

class BaseCrawler:
    def __init__(self, name: str, timeout: int = 30):
        self.name = name
        self.timeout = timeout

    async def fetch(self, url: str, headers: dict = None) -> Optional[str]:
        default_headers = {"User-Agent": "WorldCupPredictor/1.0 (educational project)"}
        if headers:
            default_headers.update(headers)
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                resp = await client.get(url, headers=default_headers, follow_redirects=True)
                resp.raise_for_status()
                return resp.text
        except Exception as e:
            logger.error(f"[{self.name}] Failed to fetch {url}: {e}")
            return None

    async def fetch_json(self, url: str, headers: dict = None) -> Optional[dict]:
        default_headers = {"User-Agent": "WorldCupPredictor/1.0"}
        if headers:
            default_headers.update(headers)
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                resp = await client.get(url, headers=default_headers)
                resp.raise_for_status()
                return resp.json()
        except Exception as e:
            logger.error(f"[{self.name}] Failed to fetch JSON {url}: {e}")
            return None

    async def run(self):
        raise NotImplementedError
```

- [ ] **Step 2: Write scheduler.py**

```python
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.interval import IntervalTrigger
from apscheduler.triggers.cron import CronTrigger
import logging

logger = logging.getLogger(__name__)
scheduler = AsyncIOScheduler()

def init_scheduler():
    if not scheduler.running:
        scheduler.start()
        logger.info("Crawler scheduler started")

def schedule_crawler(crawler_instance, interval_minutes: int = 5, cron_expr: str = None):
    crawler_name = crawler_instance.__class__.__name__
    if cron_expr:
        scheduler.add_job(
            crawler_instance.run,
            CronTrigger.from_crontab(cron_expr),
            id=crawler_name,
            name=crawler_name,
            replace_existing=True,
        )
    else:
        scheduler.add_job(
            crawler_instance.run,
            IntervalTrigger(minutes=interval_minutes),
            id=crawler_name,
            name=crawler_name,
            replace_existing=True,
        )
    logger.info(f"Scheduled {crawler_name}: every {interval_minutes}min" if not cron_expr else f"Scheduled {crawler_name}: {cron_expr}")

def get_scheduler_status() -> list[dict]:
    jobs = scheduler.get_jobs()
    return [{"name": j.name, "next_run": str(j.next_run_time)} for j in jobs]
```

- [ ] **Step 3: Commit**

```bash
git add backend/app/services/crawler/ && git commit -m "feat: add crawler base framework + scheduler"
```

### Task 5.2: Seed data loader + API data fetcher

**Files:**
- Create: `F:/世界杯/backend/app/services/crawler/seed_loader.py`

- [ ] **Step 1: Write seed_loader.py**

This loads initial 2026 World Cup data (teams, group stage schedule) from bundled JSON:
```python
import json
import os
from pathlib import Path
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from ...models.team import Team
from ...models.match import Match, MatchStage, MatchStatus
from ...core.database import async_session
from datetime import datetime, timezone
import logging

logger = logging.getLogger(__name__)

SEED_DIR = Path(__file__).parent.parent.parent.parent / "data"

async def load_seed_teams():
    """Load 2026 World Cup teams from seed JSON."""
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
                    flag_url=t.get("flag_url"), stats_json=t.get("stats", {}),
                    squad_json=t.get("squad", []),
                )
                db.add(team)
                logger.info(f"Added team: {t['name']}")
        await db.commit()
    logger.info("Seed teams loaded")

async def load_seed_schedule():
    """Load 2026 World Cup group stage schedule from seed JSON."""
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
                select(Match).where(Match.home_team_id == home.id, Match.away_team_id == away.id, Match.stage == m.get("stage", "group"))
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
```

- [ ] **Step 2: Create seed data directory and template files**

```bash
mkdir -p /f/世界杯/backend/data
```

Write `backend/data/teams_2026.json` with 32 teams (names, codes, groups) — use actual 2026 qualified/expected teams.

Write `backend/data/matches_2026.json` with group stage schedule.

- [ ] **Step 3: Wire seed loading into app startup**

In `main.py` lifespan, add:
```python
from .services.crawler.seed_loader import load_seed_teams, load_seed_schedule
# In lifespan:
await load_seed_teams()
await load_seed_schedule()
```

- [ ] **Step 4: Commit**

```bash
git add backend/data/ backend/app/services/crawler/seed_loader.py backend/app/main.py && git commit -m "feat: add seed data loader for 2026 WC teams + schedule"
```

### Task 5.3: Analysis API endpoints

**Files:**
- Create: `F:/世界杯/backend/app/services/analysis/__init__.py`
- Create: `F:/世界杯/backend/app/services/analysis/upset_detector.py`
- Create: `F:/世界杯/backend/app/services/analysis/trend.py`
- Create: `F:/世界杯/backend/app/api/analysis.py`

- [ ] **Step 1: Write upset_detector.py**

```python
def calculate_upset_probability(home_team: dict, away_team: dict, match_prediction: dict) -> float:
    elo_gap = abs(home_team.get("elo_rating", 1500) - away_team.get("elo_rating", 1500))
    favorite = "home" if home_team.get("elo_rating", 1500) > away_team.get("elo_rating", 1500) else "away"
    underdog_win_prob = match_prediction.get("away_win_prob" if favorite == "home" else "home_win_prob", 0)
    rank_gap = abs(home_team.get("fifa_rank", 50) - away_team.get("fifa_rank", 50))

    elo_factor = min(1.0, elo_gap / 400)
    rank_factor = min(1.0, rank_gap / 80)
    base_upset = underdog_win_prob * (1 + elo_factor * 2 + rank_factor)
    return round(min(1.0, base_upset), 4)
```

- [ ] **Step 2: Write trend.py**

```python
def calculate_form_trend(recent_matches: list[dict]) -> dict:
    if not recent_matches:
        return {"trend": "unknown", "form_score": 0.5, "momentum": 0}
    scores = []
    for m in recent_matches:
        if m.get("goals_for", 0) > m.get("goals_against", 0):
            scores.append(1.0)
        elif m.get("goals_for") == m.get("goals_against"):
            scores.append(0.5)
        else:
            scores.append(0.0)
    recent_weighted = sum(scores[i] * (0.6 + 0.1 * i) for i in range(min(5, len(scores))))
    total_weight = sum(0.6 + 0.1 * i for i in range(min(5, len(scores))))
    form_score = recent_weighted / total_weight if total_weight > 0 else 0.5
    momentum = scores[-1] - scores[0] if len(scores) >= 2 else 0
    trend = "improving" if momentum > 0 else ("declining" if momentum < 0 else "stable")
    return {"trend": trend, "form_score": round(form_score, 3), "momentum": momentum}
```

- [ ] **Step 3: Write api/analysis.py**

```python
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from ..core.database import get_db
from ..models.team import Team
from ..services.analysis.upset_detector import calculate_upset_probability
from ..services.analysis.trend import calculate_form_trend

router = APIRouter(prefix="/api/analysis", tags=["analysis"])

@router.get("/upsets")
async def upset_rankings(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Team))
    teams = result.scalars().all()
    rankings = []
    for t in teams:
        stats = t.stats_json or {}
        upset_index = round(abs(t.fifa_rank or 50 - 50) / 100 + (2000 - (t.elo_rating or 1500)) / 2000, 3)
        rankings.append({"team_id": str(t.id), "name": t.name, "fifa_code": t.fifa_code, "upset_index": max(0, min(1, upset_index))})
    rankings.sort(key=lambda x: x["upset_index"], reverse=True)
    return rankings[:10]

@router.get("/trends/{team_id}")
async def team_trend(team_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Team).where(Team.id == team_id))
    team = result.scalar_one_or_none()
    if not team:
        from fastapi import HTTPException
        raise HTTPException(status_code=404)
    stats = team.stats_json or {}
    trend = calculate_form_trend(stats.get("recent_form", []))
    return {"team_id": str(team.id), "name": team.name, **trend, "elo_rating": team.elo_rating}
```

- [ ] **Step 4: Register in main.py**

```python
from .api.analysis import router as analysis_router
app.include_router(analysis_router)
```

- [ ] **Step 5: Commit**

```bash
git add backend/app/services/analysis/ backend/app/api/analysis.py backend/app/main.py && git commit -m "feat: add analysis API (upsets, trends)"
```

---

## Phase 6: Frontend

### Task 6.1: App shell — Layout, router, theme

**Files:**
- Create: `F:/世界杯/frontend/src/components/Layout.tsx`
- Create: `F:/世界杯/frontend/src/lib/utils.ts`
- Modify: `F:/世界杯/frontend/src/App.tsx`
- Modify: `F:/世界杯/frontend/src/main.tsx`

- [ ] **Step 1: Write lib/utils.ts**

```typescript
export function cn(...classes: (string | undefined | false)[]): string {
  return classes.filter(Boolean).join(" ");
}

export const API_BASE = "/api";
export const WS_URL = `ws://${window.location.hostname}:8000/ws/updates`;
```

- [ ] **Step 2: Write Layout.tsx**

```tsx
import { NavLink, Outlet } from "react-router-dom";
import { Trophy, Calendar, Users, BarChart3, Radio, Lightbulb } from "lucide-react";
import { cn } from "../lib/utils";

const navItems = [
  { to: "/", label: "Dashboard", icon: Trophy },
  { to: "/schedule", label: "Schedule", icon: Calendar },
  { to: "/teams", label: "Teams", icon: Users },
  { to: "/predictions", label: "Predictions", icon: BarChart3 },
  { to: "/live", label: "Live", icon: Radio },
  { to: "/insights", label: "Insights", icon: Lightbulb },
];

export default function Layout() {
  return (
    <div className="min-h-screen bg-[#0a0f1a] text-white flex">
      <aside className="w-16 lg:w-56 border-r border-white/10 flex flex-col py-4 px-2 lg:px-4 gap-1 shrink-0">
        <div className="text-[#d4a843] font-bold text-lg mb-6 hidden lg:block">WC 2026</div>
        {navItems.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === "/"}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors",
                isActive ? "bg-[#1a5632] text-white" : "text-gray-400 hover:text-white hover:bg-white/5"
              )
            }
          >
            <Icon size={20} />
            <span className="hidden lg:inline">{label}</span>
          </NavLink>
        ))}
      </aside>
      <main className="flex-1 p-4 lg:p-6 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}
```

- [ ] **Step 3: Write App.tsx**

```tsx
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Layout from "./components/Layout";
import Dashboard from "./pages/Dashboard";
import Schedule from "./pages/Schedule";
import TeamAnalysis from "./pages/TeamAnalysis";
import Prediction from "./pages/Prediction";
import LiveMonitor from "./pages/LiveMonitor";
import Insights from "./pages/Insights";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/schedule" element={<Schedule />} />
          <Route path="/teams" element={<TeamAnalysis />} />
          <Route path="/teams/:id" element={<TeamAnalysis />} />
          <Route path="/predictions" element={<Prediction />} />
          <Route path="/live" element={<LiveMonitor />} />
          <Route path="/insights" element={<Insights />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
```

- [ ] **Step 4: Write main.tsx**

```tsx
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode><App /></React.StrictMode>
);
```

- [ ] **Step 5: Install lucide-react**

```bash
cd /f/世界杯/frontend && npm install lucide-react
```

- [ ] **Step 6: Verify Nav works**

Start frontend, click sidebar links — all routes should render empty pages. No errors.

- [ ] **Step 7: Commit**

```bash
git add frontend/src/ && git commit -m "feat: add app shell with router + dark theme layout"
```

### Task 6.2: Dashboard page

**Files:**
- Create: `F:/世界杯/frontend/src/pages/Dashboard.tsx`
- Create: `F:/世界杯/frontend/src/components/CountdownTimer.tsx`
- Create: `F:/世界杯/frontend/src/components/MatchCard.tsx`
- Create: `F:/世界杯/frontend/src/hooks/useMatchData.ts`

- [ ] **Step 1: Write CountdownTimer.tsx**

```tsx
import { useState, useEffect } from "react";

const WORLD_CUP_START = new Date("2026-06-11T00:00:00Z");

export default function CountdownTimer() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const diff = WORLD_CUP_START.getTime() - now.getTime();
  if (diff <= 0) return <div className="text-2xl font-bold text-[#d4a843]">The World Cup is here!</div>;

  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  const minutes = Math.floor((diff % 3600000) / 60000);

  return (
    <div className="flex gap-4 text-center">
      {[{ v: days, l: "Days" }, { v: hours, l: "Hours" }, { v: minutes, l: "Minutes" }].map(({ v, l }) => (
        <div key={l} className="bg-white/5 backdrop-blur rounded-xl p-4 min-w-[80px]">
          <div className="text-3xl font-bold text-[#d4a843]">{v}</div>
          <div className="text-xs text-gray-400">{l}</div>
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Write MatchCard.tsx**

```tsx
import { Calendar, MapPin } from "lucide-react";

interface MatchCardProps {
  home_team: { name: string; fifa_code: string; flag_url?: string };
  away_team: { name: string; fifa_code: string; flag_url?: string };
  match_date: string;
  venue?: string;
  home_score?: number;
  away_score?: number;
  status: string;
}

export default function MatchCard({ home_team, away_team, match_date, venue, home_score, away_score, status }: MatchCardProps) {
  const isLive = status === "live";
  const date = new Date(match_date);

  return (
    <div className={`bg-white/5 backdrop-blur rounded-xl p-4 border ${isLive ? "border-[#d4a843] animate-pulse" : "border-white/5"} hover:border-white/20 transition-all`}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs text-gray-400"><Calendar size={12} className="inline mr-1" />{date.toLocaleDateString("en-US", { month: "short", day: "numeric" })} {date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}</span>
        {isLive && <span className="text-xs bg-red-600 text-white px-2 py-0.5 rounded-full animate-pulse">LIVE</span>}
      </div>
      <div className="flex items-center justify-between">
        <div className="text-center flex-1">
          <div className="text-lg font-semibold">{home_team.name}</div>
          <div className="text-xs text-gray-400">{home_team.fifa_code}</div>
        </div>
        {status === "finished" || isLive ? (
          <div className="text-2xl font-bold px-4">{home_score} - {away_score}</div>
        ) : (
          <div className="text-sm text-gray-400 px-4">vs</div>
        )}
        <div className="text-center flex-1">
          <div className="text-lg font-semibold">{away_team.name}</div>
          <div className="text-xs text-gray-400">{away_team.fifa_code}</div>
        </div>
      </div>
      {venue && <div className="text-xs text-gray-500 mt-2 text-center"><MapPin size={10} className="inline mr-1" />{venue}</div>}
    </div>
  );
}
```

- [ ] **Step 3: Write useMatchData.ts**

```typescript
import { useState, useEffect } from "react";
import axios from "axios";
import { API_BASE } from "../lib/utils";

export function useMatches(filters?: Record<string, string>) {
  const [matches, setMatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const params = new URLSearchParams(filters || {});
    axios.get(`${API_BASE}/matches?${params}`).then(r => setMatches(r.data)).finally(() => setLoading(false));
  }, [filters]);

  return { matches, loading };
}

export function useLiveMatches() {
  const [matches, setMatches] = useState<any[]>([]);
  useEffect(() => {
    axios.get(`${API_BASE}/matches/live`).then(r => setMatches(r.data));
    const t = setInterval(() => {
      axios.get(`${API_BASE}/matches/live`).then(r => setMatches(r.data));
    }, 60000);
    return () => clearInterval(t);
  }, []);
  return matches;
}
```

- [ ] **Step 4: Write Dashboard.tsx**

```tsx
import CountdownTimer from "../components/CountdownTimer";
import MatchCard from "../components/MatchCard";
import { useMatches, useLiveMatches } from "../hooks/useMatchData";

export default function Dashboard() {
  const today = new Date().toISOString().split("T")[0];
  const { matches: todayMatches } = useMatches({ date: today, limit: "10" });
  const liveMatches = useLiveMatches();

  return (
    <div className="space-y-8">
      <section>
        <h1 className="text-3xl font-bold mb-1">World Cup 2026</h1>
        <p className="text-gray-400 mb-4">Prediction & Live Tracker</p>
        <CountdownTimer />
      </section>

      {liveMatches.length > 0 && (
        <section>
          <h2 className="text-xl font-semibold text-[#d4a843] mb-3">Live Now</h2>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {liveMatches.map((m: any) => <MatchCard key={m.id} {...m} />)}
          </div>
        </section>
      )}

      <section>
        <h2 className="text-xl font-semibold mb-3">Today's Matches</h2>
        {todayMatches.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {todayMatches.map((m: any) => <MatchCard key={m.id} {...m} />)}
          </div>
        ) : (
          <p className="text-gray-500">No matches scheduled for today.</p>
        )}
      </section>
    </div>
  );
}
```

- [ ] **Step 5: Commit**

```bash
git add frontend/src/pages/Dashboard.tsx frontend/src/components/ frontend/src/hooks/ && git commit -m "feat: add Dashboard page with countdown + match cards"
```

### Task 6.3: Remaining frontend pages (Schedule, Teams, Prediction, Live, Insights)

**Files:**
- Create: `F:/世界杯/frontend/src/pages/Schedule.tsx`
- Create: `F:/世界杯/frontend/src/pages/TeamAnalysis.tsx`
- Create: `F:/世界杯/frontend/src/pages/Prediction.tsx`
- Create: `F:/世界杯/frontend/src/pages/LiveMonitor.tsx`
- Create: `F:/世界杯/frontend/src/pages/Insights.tsx`
- Create: `F:/世界杯/frontend/src/hooks/useWebSocket.ts`
- Create: `F:/世界杯/frontend/src/hooks/usePrediction.ts`
- Create: `F:/世界杯/frontend/src/components/ProbabilityBar.tsx`

- [ ] **Step 1: Write useWebSocket.ts**

```typescript
import { useEffect, useRef, useCallback } from "react";
import { WS_URL } from "../lib/utils";

export function useWebSocket(onMessage: (data: any) => void) {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectRef = useRef(0);

  const connect = useCallback(() => {
    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;
    ws.onmessage = (e) => onMessage(JSON.parse(e.data));
    ws.onclose = () => {
      const delay = Math.min(30000, 1000 * 2 ** reconnectRef.current);
      reconnectRef.current++;
      setTimeout(connect, delay);
    };
    ws.onopen = () => { reconnectRef.current = 0; };
  }, [onMessage]);

  useEffect(() => {
    connect();
    return () => wsRef.current?.close();
  }, [connect]);

  return wsRef;
}
```

- [ ] **Step 2: Write usePrediction.ts**

```typescript
import { useState } from "react";
import axios from "axios";
import { API_BASE } from "../lib/utils";

export function usePrediction(matchId?: string) {
  const [prediction, setPrediction] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const fetch = async (mid: string) => {
    setLoading(true);
    const { data } = await axios.get(`${API_BASE}/predictions/match/${mid}`);
    setPrediction(data);
    setLoading(false);
  };

  const simulate = async (total: number = 10000) => {
    setLoading(true);
    const { data } = await axios.post(`${API_BASE}/predictions/simulate`, { total_simulations: total });
    setPrediction(data);
    setLoading(false);
    return data;
  };

  return { prediction, loading, fetchPrediction: fetch, simulate };
}
```

- [ ] **Step 3: Write ProbabilityBar.tsx**

```tsx
export default function ProbabilityBar({ homeProb, drawProb, awayProb, homeLabel, awayLabel }: {
  homeProb: number; drawProb: number; awayProb: number; homeLabel: string; awayLabel: string;
}) {
  return (
    <div className="space-y-2">
      <div className="flex justify-between text-sm"><span>{homeLabel}</span><span>{(homeProb * 100).toFixed(1)}%</span></div>
      <div className="h-2 bg-white/10 rounded-full overflow-hidden">
        <div className="h-full bg-[#1a5632] rounded-full transition-all" style={{ width: `${homeProb * 100}%` }} />
      </div>
      <div className="flex justify-between text-sm"><span>Draw</span><span>{(drawProb * 100).toFixed(1)}%</span></div>
      <div className="h-2 bg-white/10 rounded-full overflow-hidden">
        <div className="h-full bg-[#d4a843] rounded-full transition-all" style={{ width: `${drawProb * 100}%` }} />
      </div>
      <div className="flex justify-between text-sm"><span>{awayLabel}</span><span>{(awayProb * 100).toFixed(1)}%</span></div>
      <div className="h-2 bg-white/10 rounded-full overflow-hidden">
        <div className="h-full bg-blue-500 rounded-full transition-all" style={{ width: `${awayProb * 100}%` }} />
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Write Schedule.tsx** (filterable match list)

```tsx
import { useState } from "react";
import { useMatches } from "../hooks/useMatchData";
import MatchCard from "../components/MatchCard";

const STAGES = ["", "group", "round16", "quarter", "semi", "third", "final"];
const GROUPS = ["", "A", "B", "C", "D", "E", "F", "G", "H"];

export default function Schedule() {
  const [stage, setStage] = useState("");
  const [group, setGroup] = useState("");
  const { matches, loading } = useMatches({ stage, group });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Schedule</h1>
      <div className="flex gap-3 flex-wrap">
        <select value={stage} onChange={e => setStage(e.target.value)} className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm">
          {STAGES.map(s => <option key={s} value={s}>{s || "All Stages"}</option>)}
        </select>
        <select value={group} onChange={e => setGroup(e.target.value)} className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm">
          {GROUPS.map(g => <option key={g} value={g}>{g ? `Group ${g}` : "All Groups"}</option>)}
        </select>
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {matches.map((m: any) => <MatchCard key={m.id} {...m} />)}
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Write TeamAnalysis.tsx**

```tsx
import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";
import { API_BASE } from "../lib/utils";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, Radar } from "recharts";

export default function TeamAnalysis() {
  const { id } = useParams();
  const [teams, setTeams] = useState<any[]>([]);
  const [selected, setSelected] = useState<any>(null);
  const [trend, setTrend] = useState<any>(null);

  useEffect(() => { axios.get(`${API_BASE}/teams`).then(r => setTeams(r.data)); }, []);

  useEffect(() => {
    if (!id) return;
    axios.get(`${API_BASE}/teams/${id}`).then(r => setSelected(r.data));
    axios.get(`${API_BASE}/analysis/trends/${id}`).then(r => setTrend(r.data));
  }, [id]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Team Analysis</h1>
      <select onChange={e => { if (e.target.value) window.location.hash = `/teams/${e.target.value}`; }} className="bg-white/5 border border-white/10 rounded-lg px-3 py-2">
        <option value="">Select a team...</option>
        {teams.map((t: any) => <option key={t.id} value={t.id}>{t.name} ({t.fifa_code})</option>)}
      </select>

      {selected && (
        <div className="bg-white/5 backdrop-blur rounded-xl p-6 space-y-4">
          <h2 className="text-xl font-bold text-[#d4a843]">{selected.name} - Group {selected.group}</h2>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="bg-white/5 rounded-lg p-4">
              <h3 className="text-sm text-gray-400 mb-2">Attack / Defense</h3>
              <ResponsiveContainer width="100%" height={250}>
                <RadarChart data={[{ stat: "Attack", A: selected.stats_json?.attack || 0, fullMark: 2 }, { stat: "Defense", A: selected.stats_json?.defense || 0, fullMark: 2 }, { stat: "Midfield", A: selected.stats_json?.midfield || 0, fullMark: 2 }]}>
                  <PolarGrid stroke="#333" /><PolarAngleAxis dataKey="stat" stroke="#888" />
                  <Radar dataKey="A" stroke="#1a5632" fill="#1a5632" fillOpacity={0.4} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-2">
              <p>FIFA Rank: <span className="text-[#d4a843] font-bold">{selected.fifa_rank}</span></p>
              <p>ELO Rating: <span className="text-[#d4a843] font-bold">{selected.elo_rating}</span></p>
              {trend && <p>Form: <span className={trend.trend === "improving" ? "text-green-400" : "text-red-400"}>{trend.trend} ({(trend.form_score * 100).toFixed(0)}%)</span></p>}
              {selected.availability_json?.unavailable?.length > 0 && (
                <div className="text-red-400 text-sm">Unavailable: {selected.availability_json.unavailable.map((u: any) => u.name).join(", ")}</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 6: Write Prediction.tsx**

```tsx
import { useState } from "react";
import { usePrediction } from "../hooks/usePrediction";
import ProbabilityBar from "../components/ProbabilityBar";

export default function Prediction() {
  const [matchId, setMatchId] = useState("");
  const { prediction, loading, fetchPrediction, simulate } = usePrediction();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Predictions</h1>

      <div className="bg-white/5 rounded-xl p-6 space-y-4">
        <h2 className="text-lg font-semibold">Match Prediction</h2>
        <div className="flex gap-3">
          <input value={matchId} onChange={e => setMatchId(e.target.value)} placeholder="Enter match ID..." className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 flex-1" />
          <button onClick={() => fetchPrediction(matchId)} className="bg-[#1a5632] hover:bg-[#1a5632]/80 px-4 py-2 rounded-lg text-sm">Predict</button>
        </div>
        {prediction && prediction.home_win_prob !== undefined && (
          <ProbabilityBar homeProb={prediction.home_win_prob} drawProb={prediction.draw_prob} awayProb={prediction.away_win_prob} homeLabel="Home" awayLabel="Away" />
        )}
      </div>

      <div className="bg-white/5 rounded-xl p-6 space-y-4">
        <h2 className="text-lg font-semibold">Tournament Simulation</h2>
        <button onClick={() => simulate(10000)} disabled={loading} className="bg-[#d4a843] hover:bg-[#d4a843]/80 text-black px-4 py-2 rounded-lg text-sm font-semibold">
          {loading ? "Running..." : "Run 10,000 Simulations"}
        </button>
        {prediction?.results_json?.champions && (
          <div className="space-y-2">
            <h3 className="text-sm text-gray-400">Champion Odds</h3>
            {Object.entries(prediction.results_json.champions as Record<string, number>)
              .sort(([, a], [, b]) => b - a).slice(0, 10)
              .map(([team, prob]) => (
                <div key={team} className="flex items-center gap-3">
                  <span className="text-sm w-24 truncate">{team}</span>
                  <div className="flex-1 h-4 bg-white/10 rounded-full overflow-hidden">
                    <div className="h-full bg-[#d4a843] rounded-full" style={{ width: `${prob * 100}%` }} />
                  </div>
                  <span className="text-sm text-[#d4a843] w-16 text-right">{(prob * 100).toFixed(1)}%</span>
                </div>
              ))}
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 7: Write LiveMonitor.tsx**

```tsx
import { useState, useEffect, useCallback } from "react";
import { useLiveMatches } from "../hooks/useMatchData";
import { useWebSocket } from "../hooks/useWebSocket";
import MatchCard from "../components/MatchCard";

export default function LiveMonitor() {
  const [liveMatches, setLiveMatches] = useState<any[]>([]);
  const [flashes, setFlashes] = useState<Set<string>>(new Set());

  const onWsMessage = useCallback((data: any) => {
    if (data.type === "score_update") {
      setLiveMatches(prev => prev.map(m => m.id === data.match_id ? { ...m, home_score: data.home_score, away_score: data.away_score } : m));
      setFlashes(prev => new Set(prev).add(data.match_id));
      setTimeout(() => setFlashes(prev => { const s = new Set(prev); s.delete(data.match_id); return s; }), 2000);
    }
  }, []);

  useWebSocket(onWsMessage);
  const apiMatches = useLiveMatches();

  useEffect(() => { if (apiMatches.length > 0) setLiveMatches(apiMatches); }, [apiMatches]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold flex items-center gap-2">Live Monitor <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" /></h1>
      {liveMatches.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2">
          {liveMatches.map((m: any) => (
            <div key={m.id} className={flashes.has(m.id) ? "animate-pulse" : ""}>
              <MatchCard {...m} />
            </div>
          ))}
        </div>
      ) : (
        <p className="text-gray-500">No matches currently live.</p>
      )}
    </div>
  );
}
```

- [ ] **Step 8: Write Insights.tsx**

```tsx
import { useState, useEffect } from "react";
import axios from "axios";
import { API_BASE } from "../lib/utils";

export default function Insights() {
  const [upsets, setUpsets] = useState<any[]>([]);

  useEffect(() => {
    axios.get(`${API_BASE}/analysis/upsets`).then(r => setUpsets(r.data));
  }, []);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Data Insights</h1>

      <div className="bg-white/5 rounded-xl p-6">
        <h2 className="text-lg font-semibold mb-4">Upset Index Ranking</h2>
        <div className="space-y-2">
          {upsets.map((u: any, i: number) => (
            <div key={u.team_id} className="flex items-center gap-3 bg-white/5 rounded-lg p-3">
              <span className="text-sm text-gray-400 w-6">#{i + 1}</span>
              <span className="flex-1">{u.name} ({u.fifa_code})</span>
              <div className="w-32 h-2 bg-white/10 rounded-full overflow-hidden">
                <div className="h-full bg-orange-500 rounded-full" style={{ width: `${u.upset_index * 100}%` }} />
              </div>
              <span className="text-sm w-12 text-right">{(u.upset_index * 100).toFixed(0)}%</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 9: Commit**

```bash
git add frontend/src/pages/ frontend/src/hooks/ frontend/src/components/ && git commit -m "feat: add all frontend pages (schedule, teams, prediction, live, insights)"
```

---

## Phase 7: Dockerization & Final Wiring

### Task 7.1: Dockerfile for backend

**Files:**
- Create: `F:/世界杯/backend/Dockerfile`

- [ ] **Step 1: Write Dockerfile**

```dockerfile
FROM python:3.12-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

### Task 7.2: Dockerfile for frontend

**Files:**
- Create: `F:/世界杯/frontend/Dockerfile`
- Create: `F:/世界杯/frontend/nginx.conf`

- [ ] **Step 1: Write frontend/Dockerfile**

```dockerfile
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

- [ ] **Step 2: Write nginx.conf**

```nginx
server {
    listen 80;
    server_name localhost;
    root /usr/share/nginx/html;
    index index.html;
    location / {
        try_files $uri $uri/ /index.html;
    }
    location /api/ {
        proxy_pass http://backend:8000;
        proxy_set_header Host $host;
    }
    location /ws/ {
        proxy_pass http://backend:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

### Task 7.3: Update docker-compose.yml with all services

- [ ] **Step 1: Update docker-compose.yml to add backend + frontend**

```yaml
  backend:
    build: ./backend
    ports:
      - "8000:8000"
    environment:
      - DATABASE_URL=postgresql+asyncpg://wcp:wcp_dev@postgres:5432/world_cup_predictor
      - REDIS_URL=redis://redis:6379/0
      - CORS_ORIGINS=["http://localhost:5173","http://localhost"]
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    restart: unless-stopped

  frontend:
    build: ./frontend
    ports:
      - "80:80"
    depends_on:
      - backend
    restart: unless-stopped
```

### Task 7.4: Final integration test

- [ ] **Step: Run full stack**

```bash
docker-compose up --build -d
docker-compose ps
curl http://localhost:8000/api/health
curl http://localhost:80
```

Expected: API returns `"ok"`, frontend loads the WC 2026 dashboard.

- [ ] **Commit**

```bash
git add Dockerfile* docker-compose.yml nginx.conf && git commit -m "feat: add Dockerfiles + full docker-compose stack"
```

---

## Summary

| Phase | Tasks | What it builds |
|---|---|---|
| 1 | 4 tasks | Project scaffold, Docker, FastAPI skeleton, React skeleton |
| 2 | 2 tasks | SQLAlchemy models + Alembic migrations |
| 3 | 4 tasks | Teams API, Matches API, WebSocket, schemas |
| 4 | 4 tasks | Poisson model, strength adjuster, simulator, predictions API |
| 5 | 3 tasks | Crawler framework, seed data loader, analysis API |
| 6 | 3 tasks | App shell + 6 pages + hooks + components |
| 7 | 4 tasks | Dockerfiles + full stack integration |

**Total: 24 tasks**, each 2-5 minutes. Estimated total: **2-3 hours** to full working system.
