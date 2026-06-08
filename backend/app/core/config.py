from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    DATABASE_URL: str = "postgresql+asyncpg://wcp:wcp_dev@localhost:5432/world_cup_predictor"
    DATABASE_URL_SYNC: str = ""
    REDIS_URL: str = "redis://localhost:6379/0"
    FOOTBALL_API_KEY: str = ""
    WEATHER_API_KEY: str = ""
    SECRET_KEY: str = "dev-secret-change-me"
    CORS_ORIGINS: list[str] = ["http://localhost:5173"]

    class Config:
        env_file = ".env"
        extra = "ignore"

settings = Settings()
