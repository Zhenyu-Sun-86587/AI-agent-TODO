from conftest import auth_headers


def test_register_success_returns_user_and_token(client):
    response = client.post(
        "/api/auth/register",
        json={"username": "alice", "email": "alice@example.com", "password": "12345678"},
    )

    assert response.status_code == 201
    body = response.json()
    assert body["code"] == 0
    assert body["data"]["user"]["username"] == "alice"
    assert body["data"]["user"]["email"] == "alice@example.com"
    assert "password_hash" not in body["data"]["user"]
    assert body["data"]["access_token"]
    assert body["data"]["token_type"] == "bearer"


def test_register_duplicate_user_fails(client):
    auth_headers(client)

    response = client.post(
        "/api/auth/register",
        json={"username": "alice", "email": "alice@example.com", "password": "12345678"},
    )

    assert response.status_code == 409
    assert response.json()["code"] == 2001


def test_login_success_with_email(client):
    auth_headers(client)

    response = client.post(
        "/api/auth/login",
        json={"account": "alice@example.com", "password": "12345678"},
    )

    assert response.status_code == 200
    assert response.json()["data"]["user"]["username"] == "alice"
    assert response.json()["data"]["access_token"]


def test_login_wrong_password_fails(client):
    auth_headers(client)

    response = client.post(
        "/api/auth/login",
        json={"account": "alice", "password": "wrong-password"},
    )

    assert response.status_code == 401
    assert response.json()["code"] == 2002


def test_current_user_requires_authentication(client):
    response = client.get("/api/users/me")

    assert response.status_code == 401
    assert response.json()["code"] == 1002


def test_get_and_update_current_user(client):
    headers = auth_headers(client)

    response = client.get("/api/users/me", headers=headers)
    assert response.status_code == 200
    assert response.json()["data"]["username"] == "alice"

    response = client.put(
        "/api/users/me",
        headers=headers,
        json={"username": "alice_new", "email": "alice_new@example.com"},
    )
    assert response.status_code == 200
    assert response.json()["data"]["username"] == "alice_new"
    assert response.json()["data"]["email"] == "alice_new@example.com"
