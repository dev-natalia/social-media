from fastapi import FastAPI

from app.config import Settings, get_settings


def create_app(settings: Settings | None = None) -> FastAPI:
    settings = settings or get_settings()
    app = FastAPI(title="Planner Social")
    app.state.settings = settings

    @app.get("/api/health")
    def health():
        return {"ok": True}

    return app
