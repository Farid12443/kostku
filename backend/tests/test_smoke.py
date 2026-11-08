import os
from datetime import date, timedelta
from pathlib import Path

# Harus sebelum import app, agar test tidak bergantung pada .env dan tidak menyentuh database asli.
os.environ.update(
    DATABASE_URL="sqlite:///:memory:",
    SECRET_KEY="kunci-khusus-test-yang-panjangnya-cukup-aman",
    ADMIN_EMAIL="admin@kos.local",
    ADMIN_PASSWORD="Admin12345",
    ADMIN_NAME="Pemilik Kos",
)

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app import storage
from app.database import Base, get_db
from app.main import app
from app.seed import seed_data

JPEG = ("kamar.jpg", b"\xff\xd8\xff-foto", "image/jpeg")
MP4 = ("tur.mp4", b"\x00\x00\x00\x18ftypmp4-video", "video/mp4")


@pytest.fixture
def client(tmp_path, monkeypatch):
    engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
    event.listen(engine, "connect", lambda conn, _: conn.execute("PRAGMA foreign_keys=ON"))
    Session = sessionmaker(bind=engine, autoflush=False)
    Base.metadata.create_all(engine)
    with Session() as db:
        seed_data(db)

    for folder in ("photos", "videos", "proofs"):
        (tmp_path / folder).mkdir()
    monkeypatch.setattr(storage, "UPLOAD_DIR", tmp_path)

    def override_get_db():
        with Session() as db:
            yield db

    app.dependency_overrides[get_db] = override_get_db
    yield TestClient(app)
    app.dependency_overrides.clear()
    engine.dispose()


def auth(client, email, password):
    response = client.post("/api/auth/login", json={"email": email, "password": password})
    assert response.status_code == 200, response.text
    return {"Authorization": f"Bearer {response.json()['access_token']}"}


def admin_auth(client):
    return auth(client, "admin@kos.local", "Admin12345")


def new_user(client, name):
    email = f"{name}@contoh.com"
    response = client.post("/api/auth/register", json={"name": name, "email": email, "password": "Password123"})
    assert response.status_code == 200, response.text
    assert response.json()["role"] == "user"
    return auth(client, email, "Password123")


def new_room(client, admin, name="Kamar Uji"):
    response = client.post(
        "/api/admin/rooms",
        headers=admin,
        json={"name": name, "room_type": "campur", "price_monthly": 1000000, "deposit": 500000, "facility_ids": [1, 2]},
    )
    assert response.status_code == 200, response.text
    return response.json()


def book(client, headers, room_id, days=7, months=3):
    start = (date.today() + timedelta(days=days)).isoformat()
    return client.post(
        "/api/bookings", headers=headers, json={"room_id": room_id, "start_date": start, "duration_months": months}
    )


def test_full_flow(client):
    admin = admin_auth(client)
    room = new_room(client, admin)
    assert [f["id"] for f in room["facilities"]] == [1, 2]
    alice, bob = new_user(client, "alice"), new_user(client, "bob")

    first = book(client, alice, room["id"])
    assert first.status_code == 200, first.text
    booking = first.json()
    assert booking["status"] == "pending"
    assert booking["total_amount"] == 3500000
    assert booking["code"].startswith("KOS-")

    # Dua pending boleh bersamaan, tetapi hanya satu yang bisa di-approve
    second = book(client, bob, room["id"])
    assert second.status_code == 200, second.text

    approve = client.post(f"/api/admin/bookings/{booking['id']}/approve", headers=admin)
    assert approve.status_code == 200, approve.text
    assert client.post(f"/api/admin/bookings/{second.json()['id']}/approve", headers=admin).status_code == 400
    assert book(client, bob, room["id"], days=14).status_code == 400
    assert client.get(f"/api/rooms/{room['id']}").json()["status"] == "occupied"

    paid = client.post(
        f"/api/bookings/{booking['id']}/payments", headers=alice,
        data={"amount": "3500000"}, files={"proof": ("bukti.png", b"\x89PNG-bukti", "image/png")},
    )
    assert paid.status_code == 200, paid.text
    payment = paid.json()
    assert payment["proof_url"] == f"/uploads/{payment['proof_path']}"
    assert (storage.UPLOAD_DIR / payment["proof_path"]).exists()

    verify = client.post(f"/api/admin/payments/{payment['id']}/verify", headers=admin)
    assert verify.status_code == 200, verify.text

    detail = client.get(f"/api/bookings/{booking['id']}", headers=alice).json()
    assert detail["status"] == "active"
    assert detail["total_paid"] == 3500000
    assert detail["remaining_balance"] == 0
    assert detail["kos_profile"]["bank_name"]
    assert client.get(f"/api/rooms/{room['id']}").json()["status"] == "occupied"

    stats = client.get("/api/admin/dashboard", headers=admin).json()
    assert stats["revenue_this_month"] == 3500000
    assert stats["active_tenants"] == 1
    assert len(stats["revenue_by_month"]) == 6

    assert client.get(f"/api/admin/bookings/{booking['id']}", headers=admin).status_code == 200
    assert client.get("/api/admin/bookings?q=alice", headers=admin).json()["total"] == 1
    assert client.get("/api/admin/payments?status=verified", headers=admin).json()["total"] == 1


def test_seed_public_data(client):
    rooms = client.get("/api/rooms").json()
    assert len(rooms) == 6
    prices = [room["price_monthly"] for room in rooms]
    assert min(prices) == 800000 and max(prices) == 1800000
    assert all(room["cover_url"] is None for room in rooms)
    assert len(client.get("/api/facilities").json()) == 8
    assert client.get("/api/kos").json()["name"] == "Kos Contoh"
    assert auth(client, "user@kos.local", "User12345")


def test_room_filters(client):
    both = client.get("/api/rooms", params={"facility_ids": "2,8"}).json()
    assert {room["name"] for room in both} == {"Kamar B1", "Kamar C1"}
    ordered = client.get("/api/rooms", params={"sort": "price_desc"}).json()
    assert ordered[0]["name"] == "Kamar C1"
    assert client.get("/api/rooms", params={"facility_ids": "abc"}).status_code == 400


def test_media_rules(client):
    admin = admin_auth(client)
    room = new_room(client, admin)
    url = f"/api/admin/rooms/{room['id']}/media"

    uploaded = client.post(url, headers=admin, files=[("files", JPEG), ("files", JPEG), ("files", MP4)])
    assert uploaded.status_code == 200, uploaded.text
    media = uploaded.json()
    assert [m["media_type"] for m in media] == ["photo", "photo", "video"]
    assert [m["is_cover"] for m in media] == [True, False, False]
    assert (storage.UPLOAD_DIR / media[2]["file_path"]).exists()

    assert client.post(url, headers=admin, files=[("files", ("x.exe", b"MZ", "image/jpeg"))]).status_code == 400
    assert client.post(url, headers=admin, files=[("files", ("x.jpg", b"x", "text/plain"))]).status_code == 400

    too_big = ("besar.jpg", b"0" * (5 * 1024 * 1024 + 1), "image/jpeg")
    assert client.post(url, headers=admin, files=[("files", too_big)]).status_code == 400
    assert len(list(Path(storage.UPLOAD_DIR, "photos").iterdir())) == 2

    assert client.patch(f"/api/admin/media/{media[2]['id']}", headers=admin, json={"is_cover": True}).status_code == 400
    assert client.patch(f"/api/admin/media/{media[1]['id']}", headers=admin, json={"is_cover": True}).status_code == 200
    detail = client.get(f"/api/rooms/{room['id']}").json()
    assert detail["cover_url"] == media[1]["url"]
    assert sum(m["is_cover"] for m in detail["media"]) == 1

    assert client.delete(f"/api/admin/media/{media[1]['id']}", headers=admin).status_code == 200
    assert not (storage.UPLOAD_DIR / media[1]["file_path"]).exists()
    assert client.get(f"/api/rooms/{room['id']}").json()["cover_url"] == media[0]["url"]


def test_status_transitions(client):
    admin, user = admin_auth(client), new_user(client, "carol")
    room = new_room(client, admin)
    booking = book(client, user, room["id"]).json()
    path = f"/api/admin/bookings/{booking['id']}"

    assert client.post(f"{path}/activate", headers=admin).status_code == 400
    assert client.post(f"{path}/finish", headers=admin).status_code == 400
    assert client.post(f"{path}/cancel", headers=admin).status_code == 400
    assert client.post(f"{path}/reject", headers=admin, json={}).status_code == 422

    assert client.post(f"{path}/approve", headers=admin).status_code == 200
    assert client.post(f"{path}/activate", headers=admin).status_code == 200
    assert client.post(f"{path}/cancel", headers=admin).status_code == 400
    assert client.post(f"/api/bookings/{booking['id']}/cancel", headers=user).status_code == 400
    assert client.post(f"{path}/finish", headers=admin).status_code == 200
    assert client.get(f"/api/rooms/{room['id']}").json()["status"] == "available"
    assert client.post(f"{path}/approve", headers=admin).status_code == 400


def test_booking_validation(client):
    admin, user = admin_auth(client), new_user(client, "dina")
    room = new_room(client, admin)

    assert book(client, user, room["id"], days=-1).status_code == 400
    assert book(client, user, room["id"], months=25).status_code == 422
    assert book(client, admin, room["id"]).status_code == 403
    maintenance = next(r for r in client.get("/api/rooms").json() if r["status"] == "maintenance")
    assert book(client, user, maintenance["id"]).status_code == 400

    for offset in (0, 120, 240):
        assert book(client, user, room["id"], days=7 + offset).status_code == 200
    assert book(client, user, room["id"], days=500).status_code == 400


def test_access_and_room_delete(client):
    admin, user = admin_auth(client), new_user(client, "eko")
    other = new_user(client, "fani")
    room = new_room(client, admin)
    booking = book(client, user, room["id"]).json()

    assert client.get("/api/admin/dashboard").status_code == 401
    assert client.get("/api/admin/dashboard", headers=user).status_code == 403
    assert client.get(f"/api/bookings/{booking['id']}", headers=other).status_code == 403
    assert client.post(f"/api/bookings/{booking['id']}/cancel", headers=other).status_code == 403
    assert client.post("/api/auth/login", json={"email": "admin@kos.local", "password": "salah-sekali"}).status_code == 401

    client.post(f"/api/admin/bookings/{booking['id']}/approve", headers=admin)
    assert client.delete(f"/api/admin/rooms/{room['id']}", headers=admin).status_code == 400
    assert client.post(f"/api/bookings/{booking['id']}/cancel", headers=user).status_code == 200
    assert client.delete(f"/api/admin/rooms/{room['id']}", headers=admin).status_code == 200

    me = client.get("/api/auth/me", headers=admin).json()
    assert client.patch(f"/api/admin/users/{me['id']}", headers=admin, json={"is_active": False}).status_code == 400
    target = client.get("/api/auth/me", headers=other).json()
    assert client.patch(f"/api/admin/users/{target['id']}", headers=admin, json={"is_active": False}).status_code == 200
    assert client.get("/api/auth/me", headers=other).status_code == 403


def test_payment_rejection_keeps_proof(client):
    admin, user = admin_auth(client), new_user(client, "gita")
    room = new_room(client, admin)
    booking = book(client, user, room["id"]).json()
    payment_url = f"/api/bookings/{booking['id']}/payments"
    files = {"proof": JPEG}

    assert client.post(payment_url, headers=user, data={"amount": "1000"}, files=files).status_code == 400
    client.post(f"/api/admin/bookings/{booking['id']}/approve", headers=admin)
    assert client.post(payment_url, headers=user, data={"amount": "0"}, files=files).status_code == 422

    payment = client.post(payment_url, headers=user, data={"amount": "1000"}, files=files).json()
    rejected = client.post(f"/api/admin/payments/{payment['id']}/reject", headers=admin, json={"admin_note": "Buram"})
    assert rejected.status_code == 200, rejected.text
    assert rejected.json()["admin_note"] == "Buram"
    assert (storage.UPLOAD_DIR / payment["proof_path"]).exists()
    assert client.post(f"/api/admin/payments/{payment['id']}/verify", headers=admin).status_code == 400
