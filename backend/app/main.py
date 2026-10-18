from fastapi import FastAPI
from starlette.middleware.sessions import SessionMiddleware

from app.config import Settings, get_settings


def create_app(settings: Settings | None = None) -> FastAPI:
    settings = settings or get_settings()
    app = FastAPI(title="Planner Social")
    app.state.settings = settings
    app.add_middleware(
        SessionMiddleware,
        secret_key=settings.secret_key,
        session_cookie="planner_session",
        max_age=60 * 60 * 24 * 30,
        same_site="lax",
        https_only=settings.cookie_secure,
    )

    from app.routers import auth, clients, content_types, platforms, posts, users

    app.include_router(auth.router)
    for module in (users, content_types, platforms, clients, posts):
        app.include_router(module.router)

    @app.get("/api/health")
    def health():
        return {"ok": True}

    return app
