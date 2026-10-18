from sqlalchemy import select

from app.models import ContentType, Platform
from tests.conftest import login


def test_login_ok_then_me(client, make_user):
    make_user("ana@x.com")
    r = login(client, "ana@x.com")
    assert r.json()["email"] == "ana@x.com"
    me = client.get("/api/auth/me")
    assert me.status_code == 200
    assert me.json() == {"id": r.json()["id"], "email": "ana@x.com", "is_admin": False}


def test_me_without_session_401(client):
    assert client.get("/api/auth/me").status_code == 401


def test_login_wrong_password_401(client, make_user):
    make_user("ana@x.com")
    r = client.post("/api/auth/login", json={"email": "ana@x.com", "password": "errada"})
    assert r.status_code == 401
    assert r.json() == {"detail": "E-mail ou senha inválidos"}


def test_login_unknown_email_401(client):
    r = client.post("/api/auth/login", json={"email": "ninguem@x.com", "password": "x"})
    assert r.json() == {"detail": "E-mail ou senha inválidos"}


def test_login_inactive_401(client, make_user, db_session):
    user = make_user("ana@x.com")
    user.is_active = False
    db_session.commit()
    r = client.post("/api/auth/login", json={"email": "ana@x.com", "password": "senha123"})
    assert r.status_code == 401


def test_logout_clears_session(client, make_user):
    make_user("ana@x.com")
    login(client, "ana@x.com")
    assert client.post("/api/auth/logout").status_code == 204
    assert client.get("/api/auth/me").status_code == 401


def test_create_user_seeds_defaults(make_user, db_session):
    user = make_user("ana@x.com")
    types = db_session.scalars(
        select(ContentType).where(ContentType.user_id == user.id).order_by(ContentType.position)
    ).all()
    assert [(t.name, t.color) for t in types] == [
        ("Dica", "#3b82f6"),
        ("Tutorial", "#e86a7a"),
        ("Bastidores", "#4fb06d"),
        ("Promoção", "#e0b100"),
        ("Enquete", "#8b5cf6"),
    ]
    plats = db_session.scalars(
        select(Platform).where(Platform.user_id == user.id).order_by(Platform.position)
    ).all()
    assert [(p.name, p.color) for p in plats] == [
        ("Instagram", "#e1306c"),
        ("TikTok", "#111111"),
        ("Facebook", "#1877f2"),
        ("LinkedIn", "#0a66c2"),
        ("YouTube", "#ff0000"),
    ]


def test_email_normalized(client, make_user):
    make_user("ana@x.com")
    login(client, " Ana@X.com ")


def test_duplicate_email_raises(make_user):
    import pytest

    make_user("ana@x.com")
    with pytest.raises(ValueError, match="email_taken"):
        make_user("ANA@x.com")
