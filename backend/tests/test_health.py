from app.config import normalize_db_url


def test_health(client):
    assert client.get("/api/health").json() == {"ok": True}


def test_normalize_db_url():
    assert normalize_db_url("postgres://u:p@h/db") == "postgresql+psycopg://u:p@h/db"
    assert (
        normalize_db_url("postgresql://u:p@h/db?sslmode=require")
        == "postgresql+psycopg://u:p@h/db?sslmode=require"
    )
