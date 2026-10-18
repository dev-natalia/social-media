from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


def normalize_db_url(url: str) -> str:
    for prefix in ("postgres://", "postgresql://"):
        if url.startswith(prefix):
            return "postgresql+psycopg://" + url[len(prefix):]
    return url


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str
    secret_key: str
    static_dir: str | None = None
    cookie_secure: bool = False
    brasilapi_url: str = "https://brasilapi.com.br/api/feriados/v1"


@lru_cache
def get_settings() -> Settings:
    return Settings()
