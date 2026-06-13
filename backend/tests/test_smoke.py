"""Backend smoke tests for GeoAI API."""

from fastapi.testclient import TestClient

from app.main import app
from app.core.security import create_access_token

client = TestClient(app)


def test_health():
    r = client.get("/health")
    assert r.status_code == 200
    assert r.json()["status"] == "ok"


def test_auth_token():
    r = client.post("/api/auth/token", json={"user_id": 1})
    assert r.status_code == 200
    body = r.json()
    assert "access_token" in body


def test_projects_crud():
    r = client.post(
        "/api/projects",
        json={"name": "Test Flyover", "project_type": "flyover", "location_name": "Test"},
    )
    assert r.status_code == 201
    project = r.json()
    pid = project["id"]

    r2 = client.get(f"/api/projects/{pid}")
    assert r2.status_code == 200

    r3 = client.get("/api/projects/summaries")
    assert r3.status_code == 200
    assert isinstance(r3.json(), list)

    client.delete(f"/api/projects/{pid}")


def test_site_suggestions():
    r = client.post(
        "/api/projects",
        json={
            "name": "Suggest Test",
            "project_type": "building",
            "center_lat": 12.97,
            "center_lng": 77.59,
        },
    )
    pid = r.json()["id"]
    sr = client.post(f"/api/projects/{pid}/site-suggestions", json={"lng": 77.59, "lat": 12.97})
    assert sr.status_code == 200
    assert len(sr.json()["suggestions"]) > 0
    client.delete(f"/api/projects/{pid}")


def test_ai_chat_stream():
    r = client.post(
        "/api/projects",
        json={"name": "AI Test", "project_type": "flyover"},
    )
    pid = r.json()["id"]
    sr = client.post(f"/api/projects/{pid}/ai/chat/stream", json={"message": "4 lanes"})
    assert sr.status_code == 200
    assert "data:" in sr.text
    client.delete(f"/api/projects/{pid}")


def test_jwt_auth_header():
    token = create_access_token(1)
    r = client.get("/api/projects", headers={"Authorization": f"Bearer {token}"})
    assert r.status_code == 200
