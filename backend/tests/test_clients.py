from tests.conftest import add_post, login

PNG = b"\x89PNG\r\n\x1a\n" + b"0" * 100


def _new_client(c, name="Padaria Trigo", color="#C9B6F2"):
    r = c.post("/api/clients", json={"name": name, "color": color})
    assert r.status_code == 201, r.text
    return r.json()


def test_create_returns_summary(user_client):
    c = _new_client(user_client)
    assert c["name"] == "Padaria Trigo"
    assert c["color"] == "#c9b6f2"
    assert c["has_logo"] is False
    assert c["week_total"] == 0
    assert c["counts"] == {"a_fazer": 0, "editando": 0, "agendado": 0, "postado": 0}
    assert c["next_post"] is None


def test_summary_counts_and_next_post(user_client, db_session):
    cid = _new_client(user_client)["id"]
    add_post(db_session, cid, "2026-11-03", "agendado", "Pão")
    add_post(db_session, cid, "2026-11-04", "editando", "Aniversário")
    add_post(db_session, cid, "2026-11-10", "a_fazer", "Depois")
    r = user_client.get("/api/clients", params={"week_start": "2026-11-01", "today": "2026-11-04"})
    [c] = r.json()
    assert c["week_total"] == 2
    assert c["counts"] == {"a_fazer": 0, "editando": 1, "agendado": 1, "postado": 0}
    assert c["next_post"] == {"date": "2026-11-04", "title": "Aniversário"}


def test_list_sorted_by_name(user_client):
    _new_client(user_client, "Zeta")
    _new_client(user_client, "alfa")
    names = [c["name"] for c in user_client.get("/api/clients").json()]
    assert names == ["alfa", "Zeta"]


def test_archived_hidden_by_default(user_client):
    cid = _new_client(user_client)["id"]
    assert user_client.patch(f"/api/clients/{cid}", json={"archived": True}).status_code == 200
    assert user_client.get("/api/clients").json() == []
    archived = user_client.get("/api/clients", params={"archived": True}).json()
    assert [c["id"] for c in archived] == [cid]


def test_logo_roundtrip(user_client):
    cid = _new_client(user_client)["id"]
    r = user_client.put(f"/api/clients/{cid}/logo", files={"file": ("l.png", PNG, "image/png")})
    assert r.status_code == 200
    assert r.json()["has_logo"] is True
    v1 = r.json()["logo_version"]
    assert v1
    g = user_client.get(f"/api/clients/{cid}/logo")
    assert g.content == PNG
    assert g.headers["content-type"] == "image/png"
    assert "max-age" in g.headers["cache-control"]
    assert user_client.delete(f"/api/clients/{cid}/logo").status_code == 204
    assert user_client.get(f"/api/clients/{cid}/logo").status_code == 404


def test_logo_too_big_413(user_client):
    cid = _new_client(user_client)["id"]
    big = b"0" * (300 * 1024 + 1)
    r = user_client.put(f"/api/clients/{cid}/logo", files={"file": ("l.png", big, "image/png")})
    assert r.status_code == 413


def test_logo_wrong_type_422(user_client):
    cid = _new_client(user_client)["id"]
    r = user_client.put(f"/api/clients/{cid}/logo", files={"file": ("l.svg", b"<svg/>", "image/svg+xml")})
    assert r.status_code == 422


def test_delete_client(user_client):
    cid = _new_client(user_client)["id"]
    assert user_client.delete(f"/api/clients/{cid}").status_code == 204
    assert user_client.get("/api/clients").json() == []


def test_other_user_client_404(client, make_user):
    make_user("bia@x.com")
    login(client, "bia@x.com")
    cid = _new_client(client)["id"]
    client.put(f"/api/clients/{cid}/logo", files={"file": ("l.png", PNG, "image/png")})
    client.post("/api/auth/logout")
    make_user("ana@x.com")
    login(client, "ana@x.com")
    assert client.get("/api/clients").json() == []
    assert client.get(f"/api/clients/{cid}/logo").status_code == 404
    assert client.patch(f"/api/clients/{cid}", json={"name": "hack"}).status_code == 404
    assert client.delete(f"/api/clients/{cid}").status_code == 404
    assert client.put(f"/api/clients/{cid}/logo", files={"file": ("l.png", PNG, "image/png")}).status_code == 404


def test_invalid_color_422(user_client):
    assert user_client.post("/api/clients", json={"name": "X", "color": "azul"}).status_code == 422


def test_get_single_client(user_client, make_user):
    cid = _new_client(user_client)["id"]
    r = user_client.get(f"/api/clients/{cid}")
    assert r.status_code == 200
    assert r.json()["name"] == "Padaria Trigo"
    assert user_client.get("/api/clients/9999").status_code == 404
