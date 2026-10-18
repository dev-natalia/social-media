from collections.abc import Iterator

from sqlalchemy import Engine, create_engine, event
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.config import normalize_db_url


class Base(DeclarativeBase):
    pass


def make_engine(url: str) -> Engine:
    url = normalize_db_url(url)
    if url.startswith("sqlite"):
        engine = create_engine(
            url, connect_args={"check_same_thread": False}, poolclass=StaticPool
        )

        @event.listens_for(engine, "connect")
        def _fk_on(dbapi_conn, _record):
            dbapi_conn.execute("PRAGMA foreign_keys=ON")

        return engine
    return create_engine(url, pool_pre_ping=True)


_engine: Engine | None = None
_SessionLocal: sessionmaker | None = None


def get_db() -> Iterator[Session]:
    global _engine, _SessionLocal
    if _SessionLocal is None:
        from app.config import get_settings

        _engine = make_engine(get_settings().database_url)
        _SessionLocal = sessionmaker(bind=_engine)
    with _SessionLocal() as session:
        yield session
