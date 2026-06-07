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

from .api.teams import router as teams_router
from .api.matches import router as matches_router
from .api.predictions import router as predictions_router
from .api.analysis import router as analysis_router
from .api.ws import router as ws_router

app.include_router(teams_router)
app.include_router(matches_router)
app.include_router(predictions_router)
app.include_router(analysis_router)
app.include_router(ws_router)

@app.get("/api/health")
async def health():
    return {"status": "ok"}
