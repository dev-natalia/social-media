from tests.conftest import add_post


def _client(c):
    return c.post("/api/clients", json={"name": "Padaria", "color": "#aabbcc"}).json()["id"]


def test_calendar_combines_all(user_client, fetcher, db_session):
    c = user_client
    cid = _client(c)
    c.post("/api/important-dates", json={"date": "2026-11-04", "name": "Aniversário da loja", "client_id": cid})
    add_post(db_session, cid, "2026-11-03", "agendado", "Pão")
    add_post(db_session, cid, "2026-11-04", "postado", "Bolo")
    r = c.get(f"/api/clients/{cid}/calendar", params={"start": "2026-11-01", "end": "2026-11-07"})
    assert r.status_code == 200
    cal = r.json()
    assert [p["title"] for p in cal["posts"]] == ["Pão", "Bolo"]
    assert cal["holidays"] == [{"date": "2026-11-02", "name": "Finados", "hidden": False}]
    assert [(d["date"], d["name"]) for d in cal["important_dates"]] == [("2026-11-04", "Aniversário da loja")]


def test_calendar_status_filter(user_client, fetcher, db_session):
    cid = _client(user_client)
    add_post(db_session, cid, "2026-11-03", "agendado", "Pão")
    add_post(db_session, cid, "2026-11-04", "postado", "Bolo")
    cal = user_client.get(
        f"/api/clients/{cid}/calendar", params=[("start", "2026-11-01"), ("end", "2026-11-07"), ("status", "postado")]
    ).json()
    assert [p["title"] for p in cal["posts"]] == ["Bolo"]


def test_calendar_works_when_brasilapi_down(user_client, fetcher):
    fetcher.fail = True
    cid = _client(user_client)
    r = user_client.get(f"/api/clients/{cid}/calendar", params={"start": "2026-11-01", "end": "2026-11-07"})
    assert r.status_code == 200
    assert r.json()["holidays"] == []


def test_calendar_range_limit_400(user_client, fetcher):
    cid = _client(user_client)
    url = f"/api/clients/{cid}/calendar"
    assert user_client.get(url, params={"start": "2026-11-07", "end": "2026-11-01"}).status_code == 400
    assert user_client.get(url, params={"start": "2026-01-01", "end": "2026-03-05"}).status_code == 400
    assert user_client.get(url, params={"start": "2026-10-25", "end": "2026-12-05"}).status_code == 200


def test_calendar_spanning_two_years(user_client, fetcher):
    cid = _client(user_client)
    r = user_client.get(f"/api/clients/{cid}/calendar", params={"start": "2026-12-27", "end": "2027-01-02"})
    assert r.status_code == 200
    assert sorted(fetcher.calls) == [2026, 2027]
