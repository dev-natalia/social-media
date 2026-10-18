import datetime as dt

from app.dates import expand_occurrences
from app.models import ImportantDate
from tests.conftest import login

D = dt.date.fromisoformat


def _item(id, day, name="X", recurring=False, client_id=None):
    return ImportantDate(id=id, user_id=1, client_id=client_id, date=D(day), name=name, recurring_yearly=recurring)


def test_expand_non_recurring_in_and_out_of_range():
    items = [_item(1, "2026-11-04", "Dentro"), _item(2, "2026-11-20", "Fora")]
    occ = expand_occurrences(items, D("2026-11-01"), D("2026-11-07"))
    assert [(o.id, o.date, o.name) for o in occ] == [(1, D("2026-11-04"), "Dentro")]


def test_expand_yearly_across_year_boundary():
    items = [_item(1, "2025-12-25", "Natal", recurring=True)]
    occ = expand_occurrences(items, D("2026-12-20"), D("2027-01-05"))
    assert [o.date for o in occ] == [D("2026-12-25")]


def test_expand_yearly_multiple_years():
    items = [_item(1, "2025-03-10", "Aniv", recurring=True)]
    occ = expand_occurrences(items, D("2026-01-01"), D("2027-12-31"))
    assert [o.date for o in occ] == [D("2026-03-10"), D("2027-03-10")]


def test_expand_yearly_not_before_first():
    items = [_item(1, "2027-05-01", "Novo", recurring=True)]
    assert expand_occurrences(items, D("2026-01-01"), D("2026-12-31")) == []


def test_feb29_on_non_leap_year():
    items = [_item(1, "2024-02-29", "Bissexto", recurring=True)]
    occ = expand_occurrences(items, D("2026-02-01"), D("2026-02-28"))
    assert [o.date for o in occ] == [D("2026-02-28")]


def test_sorted_by_date_then_name():
    items = [_item(1, "2026-11-04", "b"), _item(2, "2026-11-04", "a"), _item(3, "2026-11-02", "z")]
    occ = expand_occurrences(items, D("2026-11-01"), D("2026-11-07"))
    assert [o.name for o in occ] == ["z", "a", "b"]


def _client(c, name="Padaria"):
    return c.post("/api/clients", json={"name": name, "color": "#aabbcc"}).json()["id"]


def test_crud_and_list_filters(user_client):
    c = user_client
    cid = _client(c)
    g = c.post("/api/important-dates", json={"date": "2026-05-10", "name": "Dia das Mães", "recurring_yearly": True})
    assert g.status_code == 201
    assert g.json()["client_id"] is None
    k = c.post("/api/important-dates", json={"date": "2026-11-04", "name": "Aniversário", "client_id": cid})
    assert k.status_code == 201
    assert [x["name"] for x in c.get("/api/important-dates", params={"client_id": "general"}).json()] == ["Dia das Mães"]
    assert [x["name"] for x in c.get("/api/important-dates", params={"client_id": cid}).json()] == ["Aniversário"]
    r = c.patch(f"/api/important-dates/{k.json()['id']}", json={"name": "Aniversário da loja"})
    assert r.json()["name"] == "Aniversário da loja"
    assert c.delete(f"/api/important-dates/{g.json()['id']}").status_code == 204
    assert c.get("/api/important-dates", params={"client_id": "general"}).json() == []


def test_occurrences_merge_general_and_client_only(user_client, db_session):
    from app.routers.important_dates import occurrences_for_client
    from app.models import Client, User
    from sqlalchemy import select

    c = user_client
    cid = _client(c, "A")
    other = _client(c, "B")
    c.post("/api/important-dates", json={"date": "2026-11-02", "name": "Geral"})
    c.post("/api/important-dates", json={"date": "2026-11-04", "name": "Do A", "client_id": cid})
    c.post("/api/important-dates", json={"date": "2026-11-05", "name": "Do B", "client_id": other})
    user = db_session.scalar(select(User).where(User.email == "ana@x.com"))
    occ = occurrences_for_client(db_session, user, db_session.get(Client, cid), D("2026-11-01"), D("2026-11-07"))
    assert [o.name for o in occ] == ["Geral", "Do A"]


def test_other_user_date_404(client, make_user):
    make_user("bia@x.com")
    login(client, "bia@x.com")
    bcid = _client(client)
    did = client.post("/api/important-dates", json={"date": "2026-11-02", "name": "B"}).json()["id"]
    client.post("/api/auth/logout")
    make_user("ana@x.com")
    login(client, "ana@x.com")
    assert client.patch(f"/api/important-dates/{did}", json={"name": "hack"}).status_code == 404
    assert client.delete(f"/api/important-dates/{did}").status_code == 404
    assert client.get("/api/important-dates", params={"client_id": "general"}).json() == []
    assert client.get("/api/important-dates", params={"client_id": bcid}).status_code == 404
    r = client.post("/api/important-dates", json={"date": "2026-11-02", "name": "x", "client_id": bcid})
    assert r.status_code == 404
