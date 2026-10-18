import datetime as dt

import pytest
from sqlalchemy import select

from app.models import Client, ContentType, Platform, Post, User

RESOURCES = [
    ("/api/content-types", ContentType, ["Dica", "Tutorial", "Bastidores", "Promoção", "Enquete"]),
    ("/api/platforms", Platform, ["Instagram", "TikTok", "Facebook", "LinkedIn", "YouTube"]),
]


@pytest.fixture(params=RESOURCES, ids=["content_types", "platforms"])
def resource(request):
    return request.param


def _ana(db):
    return db.scalar(select(User).where(User.email == "ana@x.com"))


def test_list_returns_seeded_in_order(user_client, resource):
    url, _, names = resource
    r = user_client.get(url)
    assert r.status_code == 200
    assert [i["name"] for i in r.json()] == names
    assert [i["position"] for i in r.json()] == [0, 1, 2, 3, 4]


def test_create_and_update(user_client, resource):
    url, _, _ = resource
    r = user_client.post(url, json={"name": "Novo", "color": "#ABCDEF"})
    assert r.status_code == 201
    item = r.json()
    assert item["color"] == "#abcdef"
    assert item["position"] == 5
    r = user_client.patch(f"{url}/{item['id']}", json={"name": "Renomeado"})
    assert r.json()["name"] == "Renomeado"
    assert r.json()["color"] == "#abcdef"


@pytest.mark.parametrize("color", ["red", "#12345", "#gggggg"])
def test_invalid_color_422(user_client, resource, color):
    url, _, _ = resource
    assert user_client.post(url, json={"name": "X", "color": color}).status_code == 422


def test_delete_unused_204(user_client, resource):
    url, _, _ = resource
    item = user_client.get(url).json()[0]
    assert user_client.delete(f"{url}/{item['id']}").status_code == 204
    assert len(user_client.get(url).json()) == 4


def test_delete_in_use_409(user_client, resource, db_session):
    url, model, _ = resource
    ana = _ana(db_session)
    ctype = db_session.scalar(select(ContentType).where(ContentType.user_id == ana.id))
    plat = db_session.scalar(select(Platform).where(Platform.user_id == ana.id))
    client = Client(user_id=ana.id, name="Padaria", color="#aabbcc")
    db_session.add(client)
    db_session.flush()
    post = Post(client_id=client.id, title="P", date=dt.date(2026, 11, 3), content_type_id=ctype.id)
    post.platforms = [plat]
    db_session.add(post)
    db_session.commit()
    target = ctype if model is ContentType else plat
    r = user_client.delete(f"{url}/{target.id}")
    assert r.status_code == 409
    assert r.json()["detail"] == "Em uso por 1 post(s)"
    db_session.expire_all()
    assert db_session.get(model, target.id) is not None


def test_reorder(user_client, resource):
    url, _, names = resource
    ids = [i["id"] for i in user_client.get(url).json()]
    r = user_client.put(f"{url}/reorder", json={"ids": list(reversed(ids))})
    assert r.status_code == 204
    assert [i["name"] for i in user_client.get(url).json()] == list(reversed(names))


def test_other_user_item_404(user_client, resource, make_user, db_session):
    url, model, _ = resource
    bia = make_user("bia@x.com")
    theirs = db_session.scalar(select(model).where(model.user_id == bia.id))
    assert user_client.patch(f"{url}/{theirs.id}", json={"name": "hack"}).status_code == 404
    assert user_client.delete(f"{url}/{theirs.id}").status_code == 404
    db_session.expire_all()
    assert db_session.get(model, theirs.id).name != "hack"


def test_requires_login(client, resource):
    url, _, _ = resource
    assert client.get(url).status_code == 401
