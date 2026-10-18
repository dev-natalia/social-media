import pytest

from tests.conftest import login


@pytest.fixture
def ctx(user_client):
    cid = user_client.post("/api/clients", json={"name": "Padaria", "color": "#aabbcc"}).json()["id"]
    types = user_client.get("/api/content-types").json()
    plats = user_client.get("/api/platforms").json()
    return user_client, cid, types, plats


def _create(c, cid, types, **over):
    body = {"title": "Pão", "date": "2026-11-03", "content_type_id": types[0]["id"]} | over
    r = c.post(f"/api/clients/{cid}/posts", json=body)
    return r


def test_create_and_list_in_range(ctx):
    c, cid, types, plats = ctx
    r = _create(c, cid, types, time="10:00", platform_ids=[plats[0]["id"], plats[1]["id"]], format="Reels")
    assert r.status_code == 201, r.text
    p = r.json()
    assert p["status"] == "a_fazer"
    assert p["time"] == "10:00:00"
    assert p["content_type"]["name"] == "Dica"
    assert [x["name"] for x in p["platforms"]] == ["Instagram", "TikTok"]
    assert p["checklist"] == {k: False for k in ("roteiro", "captacao", "edicao", "aprovacao", "agendamento")}
    _create(c, cid, types, date="2026-11-20")
    got = c.get(f"/api/clients/{cid}/posts", params={"start": "2026-11-01", "end": "2026-11-07"}).json()
    assert [x["id"] for x in got] == [p["id"]]


def test_list_order_time_nulls_last(ctx):
    c, cid, types, _ = ctx
    a = _create(c, cid, types, title="sem hora").json()
    b = _create(c, cid, types, title="18h", time="18:00").json()
    d = _create(c, cid, types, title="9h", time="09:00").json()
    got = c.get(f"/api/clients/{cid}/posts", params={"start": "2026-11-03", "end": "2026-11-03"}).json()
    assert [x["id"] for x in got] == [d["id"], b["id"], a["id"]]


def test_status_filter_multi(ctx):
    c, cid, types, _ = ctx
    _create(c, cid, types, status="a_fazer")
    _create(c, cid, types, status="editando")
    _create(c, cid, types, status="postado")
    got = c.get(
        f"/api/clients/{cid}/posts",
        params=[("start", "2026-11-01"), ("end", "2026-11-07"), ("status", "a_fazer"), ("status", "editando")],
    ).json()
    assert sorted(x["status"] for x in got) == ["a_fazer", "editando"]


def test_patch_date_moves_post(ctx):
    c, cid, types, _ = ctx
    p = _create(c, cid, types).json()
    r = c.patch(f"/api/posts/{p['id']}", json={"date": "2026-11-06"})
    assert r.status_code == 200
    assert r.json()["date"] == "2026-11-06"
    assert r.json()["title"] == "Pão"


def test_checklist_partial_update_keeps_others(ctx):
    c, cid, types, _ = ctx
    p = _create(c, cid, types, checklist={"roteiro": True}).json()
    assert p["checklist"]["roteiro"] is True
    r = c.patch(f"/api/posts/{p['id']}", json={"checklist": {"aprovacao": True}})
    assert r.json()["checklist"] == {
        "roteiro": True, "captacao": False, "edicao": False, "aprovacao": True, "agendamento": False
    }


def test_checklist_unknown_key_422(ctx):
    c, cid, types, _ = ctx
    assert _create(c, cid, types, checklist={"foo": True}).status_code == 422


def test_status_independent_of_checklist(ctx):
    c, cid, types, _ = ctx
    p = _create(c, cid, types).json()
    r = c.patch(f"/api/posts/{p['id']}", json={"status": "postado"})
    assert r.status_code == 200
    assert r.json()["status"] == "postado"
    assert not any(r.json()["checklist"].values())


@pytest.mark.parametrize(
    "url,code",
    [("javascript:alert(1)", 422), ("drive.google.com/x", 422), ("https://drive.google.com/x", 201), ("", 201)],
)
def test_drive_url_validation(ctx, url, code):
    c, cid, types, _ = ctx
    r = _create(c, cid, types, drive_url=url)
    assert r.status_code == code
    if code == 201:
        assert r.json()["drive_url"] == (url or None)


def test_update_platforms_and_clear_time(ctx):
    c, cid, types, plats = ctx
    p = _create(c, cid, types, time="10:00", platform_ids=[plats[0]["id"]]).json()
    r = c.patch(f"/api/posts/{p['id']}", json={"time": None, "platform_ids": [plats[2]["id"]]})
    assert r.json()["time"] is None
    assert [x["name"] for x in r.json()["platforms"]] == ["Facebook"]


def test_duplicate(ctx):
    c, cid, types, _ = ctx
    p = _create(c, cid, types, status="postado", checklist={"roteiro": True}, description="txt").json()
    r = c.post(f"/api/posts/{p['id']}/duplicate")
    assert r.status_code == 201
    d = r.json()
    assert d["id"] != p["id"]
    assert d["title"] == "Pão (cópia)"
    assert d["status"] == "a_fazer"
    assert not any(d["checklist"].values())
    assert d["date"] == p["date"]
    assert d["description"] == "txt"


def test_delete(ctx):
    c, cid, types, _ = ctx
    p = _create(c, cid, types).json()
    assert c.delete(f"/api/posts/{p['id']}").status_code == 204
    assert c.get(f"/api/clients/{cid}/posts", params={"start": "2026-11-01", "end": "2026-11-30"}).json() == []


def test_foreign_content_type_422(ctx, make_user):
    c, cid, types, plats = ctx
    make_user("bia@x.com")
    # ids do seed da Bia vêm depois dos da Ana
    foreign_type = max(t["id"] for t in types) + 5
    foreign_plat = max(p["id"] for p in plats) + 5
    r = _create(c, cid, types, content_type_id=foreign_type)
    assert r.status_code == 422
    assert r.json()["detail"] == "Tipo ou rede inválidos"
    assert _create(c, cid, types, platform_ids=[foreign_plat]).status_code == 422


def test_other_user_post_404(client, make_user):
    make_user("bia@x.com")
    login(client, "bia@x.com")
    cid = client.post("/api/clients", json={"name": "B", "color": "#aabbcc"}).json()["id"]
    tid = client.get("/api/content-types").json()[0]["id"]
    pid = client.post(f"/api/clients/{cid}/posts", json={"title": "x", "date": "2026-11-03", "content_type_id": tid}).json()["id"]
    client.post("/api/auth/logout")
    make_user("ana@x.com")
    login(client, "ana@x.com")
    assert client.patch(f"/api/posts/{pid}", json={"title": "hack"}).status_code == 404
    assert client.delete(f"/api/posts/{pid}").status_code == 404
    assert client.post(f"/api/posts/{pid}/duplicate").status_code == 404
    assert client.get(f"/api/clients/{cid}/posts", params={"start": "2026-11-01", "end": "2026-11-07"}).status_code == 404
