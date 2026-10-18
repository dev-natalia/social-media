import datetime as dt

from sqlalchemy import func, select

from app.holidays import ensure_year
from app.models import Holiday
from tests.conftest import FINADOS_2026, FakeFetcher, login


def _count(db):
    return db.scalar(select(func.count()).select_from(Holiday))


def test_ensure_year_caches(db_session):
    f = FakeFetcher(FINADOS_2026)
    assert ensure_year(db_session, 2026, f) is True
    assert ensure_year(db_session, 2026, f) is True
    assert f.calls == [2026]
    assert _count(db_session) == 3


def test_fetch_failure_not_cached(db_session):
    assert ensure_year(db_session, 2026, FakeFetcher(fail=True), now=lambda: 0) is False
    assert _count(db_session) == 0
    assert ensure_year(db_session, 2026, FakeFetcher(FINADOS_2026), now=lambda: 601) is True
    assert _count(db_session) == 3


def test_failure_backs_off_for_ten_minutes(db_session):
    ensure_year(db_session, 2026, FakeFetcher(fail=True), now=lambda: 0)
    retry = FakeFetcher(FINADOS_2026)
    assert ensure_year(db_session, 2026, retry, now=lambda: 300) is False
    assert retry.calls == []
    assert ensure_year(db_session, 2026, retry, now=lambda: 601) is True
    assert retry.calls == [2026]


def test_empty_result_not_cached(db_session):
    assert ensure_year(db_session, 2026, FakeFetcher({})) is False
    assert _count(db_session) == 0


def test_only_national_kept(db_session):
    f = FakeFetcher({2026: [
        {"date": "2026-11-02", "name": "Finados", "type": "national"},
        {"date": "2026-11-03", "name": "Outro", "type": "optional"},
    ]})
    ensure_year(db_session, 2026, f)
    assert [h.name for h in db_session.scalars(select(Holiday))] == ["Finados"]


def test_year_list_with_hidden_flag(user_client, fetcher):
    r = user_client.get("/api/holidays", params={"year": 2026})
    assert r.status_code == 200
    assert [h["name"] for h in r.json()] == ["Finados", "Proclamação da República", "Dia da consciência negra"]
    assert all(h["hidden"] is False for h in r.json())


def _client(c):
    return c.post("/api/clients", json={"name": "Padaria", "color": "#aabbcc"}).json()["id"]


def test_hide_and_unhide(user_client, fetcher):
    c = user_client
    cid = _client(c)
    assert c.post("/api/holidays/2026-11-02/hide").status_code == 204
    cal = c.get(f"/api/clients/{cid}/calendar", params={"start": "2026-11-01", "end": "2026-11-30"}).json()
    assert [h["name"] for h in cal["holidays"]] == ["Proclamação da República", "Dia da consciência negra"]
    year = c.get("/api/holidays", params={"year": 2026}).json()
    assert year[0] == {"date": "2026-11-02", "name": "Finados", "hidden": True}
    assert c.delete("/api/holidays/2026-11-02/hide").status_code == 204
    cal = c.get(f"/api/clients/{cid}/calendar", params={"start": "2026-11-01", "end": "2026-11-30"}).json()
    assert len(cal["holidays"]) == 3


def test_hide_twice_is_ok(user_client, fetcher):
    user_client.get("/api/holidays", params={"year": 2026})
    assert user_client.post("/api/holidays/2026-11-02/hide").status_code == 204
    assert user_client.post("/api/holidays/2026-11-02/hide").status_code == 204


def test_hidden_is_per_user(client, make_user, fetcher):
    make_user("bia@x.com")
    login(client, "bia@x.com")
    client.get("/api/holidays", params={"year": 2026})
    client.post("/api/holidays/2026-11-02/hide")
    client.post("/api/auth/logout")
    make_user("ana@x.com")
    login(client, "ana@x.com")
    year = client.get("/api/holidays", params={"year": 2026}).json()
    assert year[0]["hidden"] is False
