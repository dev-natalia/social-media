from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
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

    from app.routers import auth, clients, content_types, holidays, important_dates, platforms, posts, users

    app.include_router(auth.router)
    for module in (users, content_types, platforms, clients, posts, important_dates, holidays):
        app.include_router(module.router)

    @app.get("/api/health")
    def health():
        return {"ok": True}

    # Por último: a rota curinga do SPA não pode encobrir as rotas da API.
    if settings.static_dir:
        mount_spa(app, Path(settings.static_dir))

    return app


def mount_spa(app: FastAPI, root: Path) -> None:
    """Serve o build do frontend: /assets, arquivos da raiz e index.html para as rotas do SPA."""
    root = root.resolve()
    app.mount("/assets", StaticFiles(directory=root / "assets", check_dir=False), name="assets")

    @app.get("/{path:path}", include_in_schema=False)
    def spa(path: str):
        if path.startswith("api/") or path == "api":
            raise HTTPException(404, "Not Found")
        file = (root / path).resolve()
        if path and file.is_file() and file.is_relative_to(root):
            headers = {"Cache-Control": "no-cache"} if file.name in ("sw.js", "index.html") else None
            return FileResponse(file, headers=headers)
        return FileResponse(root / "index.html", headers={"Cache-Control": "no-cache"})
