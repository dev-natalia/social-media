import os

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

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
