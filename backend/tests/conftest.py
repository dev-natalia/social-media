import os

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app import models  # noqa: F401  (registra as tabelas)
from app.config import Settings
from app.db import Base, get_db, make_engine
from app.main import create_app

TEST_DATABASE_URL = os.environ.get("TEST_DATABASE_URL", "sqlite://")


@pytest.fixture
def engine():
    eng = make_engine(TEST_DATABASE_URL)
    Base.metadata.drop_all(eng)
    Base.metadata.create_all(eng)
    yield eng
    Base.metadata.drop_all(eng)
    eng.dispose()


@pytest.fixture
def db_session(engine):
    with Session(engine) as session:
        yield session


@pytest.fixture
def settings():
    return Settings(database_url=TEST_DATABASE_URL, secret_key="test-secret")


@pytest.fixture
def app(engine, settings):
    application = create_app(settings)

    def override_get_db():
        with Session(engine) as session:
            yield session

    application.dependency_overrides[get_db] = override_get_db
    return application


@pytest.fixture
def client(app):
    with TestClient(app) as c:
        yield c


@pytest.fixture
def make_user(db_session):
    from app.seed import create_user

    def _make(email: str, password: str = "senha123", is_admin: bool = False):
        user = create_user(db_session, email, password, is_admin=is_admin)
        db_session.commit()
        return user

    return _make


def login(client, email: str, password: str = "senha123"):
    r = client.post("/api/auth/login", json={"email": email, "password": password})
    assert r.status_code == 200, r.text
    return r


@pytest.fixture
def user_client(client, make_user):
    """Cliente HTTP já logado como ana@x.com."""
    make_user("ana@x.com")
    login(client, "ana@x.com")
    return client
