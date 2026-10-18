from tests.conftest import login


def _admin(client, make_user):
    admin = make_user("admin@x.com", is_admin=True)
    login(client, "admin@x.com")
    return admin


def test_non_admin_gets_403(user_client):
    assert user_client.get("/api/users").status_code == 403
    assert user_client.post("/api/users", json={"email": "b@x.com", "password": "12345678"}).status_code == 403


def test_admin_creates_user_who_can_login(client, make_user):
    _admin(client, make_user)
    r = client.post("/api/users", json={"email": "Bia@X.com", "password": "12345678"})
    assert r.status_code == 201
    assert r.json()["email"] == "bia@x.com"
    assert r.json()["is_active"] is True
    emails = [u["email"] for u in client.get("/api/users").json()]
    assert emails == ["admin@x.com", "bia@x.com"]
    client.post("/api/auth/logout")
    login(client, "bia@x.com", "12345678")


def test_short_password_422(client, make_user):
    _admin(client, make_user)
    r = client.post("/api/users", json={"email": "b@x.com", "password": "123"})
    assert r.status_code == 422


def test_duplicate_email_409(client, make_user):
    _admin(client, make_user)
    client.post("/api/users", json={"email": "b@x.com", "password": "12345678"})
    r = client.post("/api/users", json={"email": "b@x.com", "password": "12345678"})
    assert r.status_code == 409
    assert r.json()["detail"] == "E-mail já cadastrado"


def test_reset_password(client, make_user):
    _admin(client, make_user)
    uid = client.post("/api/users", json={"email": "b@x.com", "password": "12345678"}).json()["id"]
    assert client.patch(f"/api/users/{uid}", json={"password": "novasenha1"}).status_code == 200
    client.post("/api/auth/logout")
    login(client, "b@x.com", "novasenha1")


def test_deactivate_blocks_login(client, make_user):
    _admin(client, make_user)
    uid = client.post("/api/users", json={"email": "b@x.com", "password": "12345678"}).json()["id"]
    r = client.patch(f"/api/users/{uid}", json={"is_active": False})
    assert r.json()["is_active"] is False
    client.post("/api/auth/logout")
    r = client.post("/api/auth/login", json={"email": "b@x.com", "password": "12345678"})
    assert r.status_code == 401


def test_admin_cannot_deactivate_self(client, make_user):
    admin = _admin(client, make_user)
    r = client.patch(f"/api/users/{admin.id}", json={"is_active": False})
    assert r.status_code == 400


def test_patch_unknown_user_404(client, make_user):
    _admin(client, make_user)
    assert client.patch("/api/users/999", json={"is_active": False}).status_code == 404
