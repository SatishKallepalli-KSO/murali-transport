"""Pytest suite for API auth, redaction, and assignment."""

from __future__ import annotations

import os
from pathlib import Path

# Must set before app/db import
_TEST_DIR = Path(__file__).resolve().parent
_TEST_DB = _TEST_DIR / "_pytest_murali.db"
if _TEST_DB.exists():
    _TEST_DB.unlink()

os.environ["ADMIN_PIN"] = "test-admin-pin-strong1"
os.environ["DATABASE_URL"] = f"sqlite:///{_TEST_DB}"
os.environ["PUBLIC_WRITE_BURST_MAX"] = "100"
os.environ["PUBLIC_WRITE_SHORT_MAX"] = "100"
os.environ["PUBLIC_WRITE_MAX_ATTEMPTS"] = "100"
os.environ.pop("RENDER", None)
os.environ.pop("RENDER_SERVICE_ID", None)
os.environ.pop("ALLOW_INSECURE_DEFAULT_PIN", None)

import app.auth as auth_mod  # noqa: E402
import app.db as db_mod  # noqa: E402

auth_mod._cached_pin = None

from fastapi.testclient import TestClient  # noqa: E402
from app.db import init_db  # noqa: E402
from app.main import app  # noqa: E402
from app.matching import location_match_score  # noqa: E402

init_db()
client = TestClient(app)


def _admin_token() -> str:
    res = client.post("/v1/admin/login", json={"pin": "test-admin-pin-strong1"})
    assert res.status_code == 200, res.text
    return res.json()["access_token"]


def test_healthz() -> None:
    res = client.get("/healthz")
    assert res.status_code == 200
    assert res.json()["status"] == "ok"


def test_location_match_exact() -> None:
    score, reason = location_match_score("Dommeru", "Dommeru")
    assert score == 1.0
    assert "Exact" in reason


def test_public_vehicle_list_redacts_pii() -> None:
    create = client.post(
        "/v1/vehicles",
        json={
            "owner_name": "Ravi Kumar",
            "owner_phone": "9999999999",
            "driver_name": "Driver One",
            "driver_phone": "8888888888",
            "plate_number": "AP39AB1234",
            "vehicle_type": "mini_lorry",
            "capacity_tons": 2,
            "current_location": "Dommeru",
            "notes": "secret note",
        },
    )
    assert create.status_code == 201, create.text

    public = client.get("/v1/vehicles")
    assert public.status_code == 200
    rows = public.json()
    assert rows
    row = next(r for r in rows if "1234" in r["plate_number"] or "**" in r["plate_number"])
    assert row["owner_phone"] == ""
    assert row["driver_phone"] == ""
    assert "9999999999" not in row["owner_phone"]
    assert row["notes"] == ""
    assert "*" in row["plate_number"]
    assert "secret" not in row["notes"]


def test_admin_sees_full_vehicle() -> None:
    token = _admin_token()
    res = client.get("/v1/vehicles", headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 200
    rows = res.json()
    assert any(r.get("owner_phone") == "9999999999" for r in rows)


def test_patch_location_requires_admin() -> None:
    listed = client.get("/v1/vehicles").json()
    assert listed
    vid = listed[0]["id"]
    denied = client.patch(
        f"/v1/vehicles/{vid}/location",
        json={"current_location": "Kovvur"},
    )
    assert denied.status_code == 401

    token = _admin_token()
    ok = client.patch(
        f"/v1/vehicles/{vid}/location",
        json={"current_location": "Kovvur"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert ok.status_code == 200
    assert ok.json()["current_location"] == "Kovvur"


def test_bookings_list_requires_admin() -> None:
    assert client.get("/v1/bookings").status_code == 401
    token = _admin_token()
    assert client.get(
        "/v1/bookings",
        headers={"Authorization": f"Bearer {token}"},
    ).status_code == 200


def test_wrong_pin() -> None:
    res = client.post("/v1/admin/login", json={"pin": "wrong-pin-value"})
    assert res.status_code == 401


def test_assign_and_complete() -> None:
    token = _admin_token()
    headers = {"Authorization": f"Bearer {token}"}

    load = client.post(
        "/v1/loads",
        json={
            "requestor_name": "Sita",
            "requestor_phone": "7777777777",
            "pickup": "Dommeru",
            "dropoff": "Rajahmundry",
            "cargo": "Rice",
            "weight_tons": 1.5,
            "vehicle_preference": "any",
        },
    )
    assert load.status_code == 201, load.text
    load_id = load.json()["id"]

    vehicles = client.get("/v1/vehicles", headers=headers).json()
    vehicle = next(v for v in vehicles if v["status"] == "available")
    assigned = client.post(
        "/v1/assignments",
        headers=headers,
        json={"load_id": load_id, "vehicle_id": vehicle["id"]},
    )
    assert assigned.status_code == 201, assigned.text
    assignment_id = assigned.json()["id"]

    done = client.post(
        f"/v1/assignments/{assignment_id}/complete",
        headers=headers,
    )
    assert done.status_code == 200
    assert done.json()["status"] == "completed"


def test_admin_update_and_delete_load_vehicle() -> None:
    token = _admin_token()
    headers = {"Authorization": f"Bearer {token}"}

    load = client.post(
        "/v1/loads",
        json={
            "requestor_name": "Edit Me",
            "requestor_phone": "7000000001",
            "pickup": "Dommeru",
            "dropoff": "Eluru",
            "cargo": "Boxes",
            "weight_tons": 1.0,
        },
    )
    assert load.status_code == 201
    load_id = load.json()["id"]

    patched = client.patch(
        f"/v1/loads/{load_id}",
        headers=headers,
        json={"cargo": "Updated boxes", "status": "cancelled"},
    )
    assert patched.status_code == 200, patched.text
    assert patched.json()["cargo"] == "Updated boxes"
    assert patched.json()["status"] == "cancelled"

    vehicle = client.post(
        "/v1/vehicles",
        json={
            "owner_name": "Fleet Owner",
            "owner_phone": "7000000002",
            "driver_name": "Driver",
            "driver_phone": "7000000003",
            "plate_number": "AP39DEL999",
            "capacity_tons": 3,
            "current_location": "Dommeru",
        },
    )
    assert vehicle.status_code == 201
    vehicle_id = vehicle.json()["id"]

    vpatch = client.patch(
        f"/v1/vehicles/{vehicle_id}",
        headers=headers,
        json={"current_location": "Kovvur", "status": "offline"},
    )
    assert vpatch.status_code == 200, vpatch.text
    assert vpatch.json()["current_location"] == "Kovvur"

    assert client.delete(f"/v1/loads/{load_id}", headers=headers).status_code == 200
    assert client.get(f"/v1/loads/{load_id}", headers=headers).status_code == 404
    assert client.delete(f"/v1/vehicles/{vehicle_id}", headers=headers).status_code == 200
    assert client.get(f"/v1/vehicles/{vehicle_id}", headers=headers).status_code == 404


def test_public_cannot_delete() -> None:
    assert client.delete("/v1/loads/1").status_code == 401
    assert client.delete("/v1/vehicles/1").status_code == 401

    res = client.get("/v1/loads?status=open")
    assert res.status_code == 200
    for row in res.json():
        assert row["requestor_phone"] == ""
        assert row["requestor_name"] == "Customer"
        assert row["cargo"] == "Freight"
        assert row["preferred_date"] == ""
        assert "*" in row["pickup"]
        assert "*" in row["dropoff"]
        assert "Coconut" not in row["cargo"]
        assert "7777777777" not in row["requestor_phone"]


def test_public_write_burst_rate_limit() -> None:
    import app.rate_limit as rl

    rl.reset_all()
    previous = (
        rl.PUBLIC_WRITE_BURST_MAX,
        rl.PUBLIC_WRITE_SHORT_MAX,
        rl.PUBLIC_WRITE_MAX,
    )
    rl.PUBLIC_WRITE_BURST_MAX = 1
    rl.PUBLIC_WRITE_SHORT_MAX = 3
    rl.PUBLIC_WRITE_MAX = 8
    try:
        first = client.post(
            "/v1/loads",
            json={
                "requestor_name": "Rate Limit One",
                "requestor_phone": "9000000001",
                "pickup": "Dommeru",
                "dropoff": "Rajahmundry",
                "cargo": "Rice",
                "weight_tons": 2,
                "vehicle_preference": "any",
                "preferred_date": "",
                "notes": "",
            },
        )
        assert first.status_code == 201, first.text

        second = client.post(
            "/v1/loads",
            json={
                "requestor_name": "Rate Limit Two",
                "requestor_phone": "9000000002",
                "pickup": "Dommeru",
                "dropoff": "Eluru",
                "cargo": "Cement",
                "weight_tons": 3,
                "vehicle_preference": "truck",
                "preferred_date": "",
                "notes": "",
            },
        )
        assert second.status_code == 429, second.text
        assert "minute" in second.json()["detail"].lower()
        assert second.headers.get("retry-after")
    finally:
        (
            rl.PUBLIC_WRITE_BURST_MAX,
            rl.PUBLIC_WRITE_SHORT_MAX,
            rl.PUBLIC_WRITE_MAX,
        ) = previous
        rl.reset_all()


def test_analytics_hit_and_admin_summary() -> None:
    import app.rate_limit as rl

    rl.reset_all()
    hit = client.post("/v1/analytics/hit", json={"path": "home"})
    assert hit.status_code == 200, hit.text
    assert hit.json()["status"] == "ok"

    skipped = client.post("/v1/analytics/hit", json={"path": "admin"})
    assert skipped.status_code == 200
    assert skipped.json()["status"] == "skipped"

    denied = client.get("/v1/admin/analytics")
    assert denied.status_code == 401

    token = _admin_token()
    summary = client.get(
        "/v1/admin/analytics?days=7",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert summary.status_code == 200, summary.text
    body = summary.json()
    assert body["today"]["hits"] >= 1
    assert body["totals"]["hits"] >= 1
    assert "privacy" in body
    assert "ip" not in str(body).lower() or "No IP" in body["privacy"]
    rl.reset_all()
