import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.config import Settings
from app.db import get_db
from app.main import create_app


@pytest.fixture
def spa_client(tmp_path, engine):
    (tmp_path / "index.html").write_text("<html>app</html>", encoding="utf-8")
    (tmp_path / "assets").mkdir()
    (tmp_path / "assets" / "a.js").write_text("console.log(1)", encoding="utf-8")
    (tmp_path / "sw.js").write_text("// sw", encoding="utf-8")
    (tmp_path / "manifest.webmanifest").write_text("{}", encoding="utf-8")
    settings = Settings(database_url="sqlite://", secret_key="x", static_dir=str(tmp_path))
    app = create_app(settings)

    def override_get_db():
        with Session(engine) as session:
            yield session

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as c:
        yield c


def test_spa_route_serves_index(spa_client):
    r = spa_client.get("/clientes/3")
    assert r.status_code == 200
    assert "app" in r.text
    assert r.headers["content-type"].startswith("text/html")


def test_root_serves_index(spa_client):
    assert "app" in spa_client.get("/").text


def test_assets_served(spa_client):
    r = spa_client.get("/assets/a.js")
    assert r.status_code == 200
    assert r.text == "console.log(1)"


def test_root_files_served(spa_client):
    r = spa_client.get("/sw.js")
    assert r.text == "// sw"
    assert r.headers["cache-control"] == "no-cache"
    assert spa_client.get("/manifest.webmanifest").text == "{}"


def test_unknown_api_is_json_404(spa_client):
    r = spa_client.get("/api/nao-existe")
    assert r.status_code == 404
    assert r.json() == {"detail": "Not Found"}


def test_path_traversal_blocked(spa_client, tmp_path):
    (tmp_path.parent / "secret.txt").write_text("segredo", encoding="utf-8")
    r = spa_client.get("/..%2fsecret.txt")
    assert "segredo" not in r.text


def test_no_static_dir_no_spa(client):
    assert client.get("/clientes/3").status_code == 404


def test_api_routes_win_over_spa(spa_client):
    assert spa_client.get("/api/health").json() == {"ok": True}
    assert spa_client.get("/api/auth/me").status_code == 401
