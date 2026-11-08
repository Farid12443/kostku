import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from app.database import Base, get_db
from app.main import app
from app.models import User, Room, Booking, Payment, KosProfile
from app.security import get_password_hash, create_access_token
from datetime import date, datetime, timedelta
from dateutil.relativedelta import relativedelta

SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

@pytest.fixture
def db_session():
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()

@pytest.fixture
def client(db_session):
    def override_get_db():
        try:
            yield db_session
        finally:
            pass
    
    app.dependency_overrides[get_db] = override_get_db
    yield TestClient(app)
    app.dependency_overrides.clear()

@pytest.fixture
def admin_user(db_session):
    user = User(
        name="Admin Test",
        email="admin@test.com",
        password_hash=get_password_hash("Admin123"),
        role="admin",
        is_active=True
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user

@pytest.fixture
def regular_user(db_session):
    user = User(
        name="User Test",
        email="user@test.com",
        password_hash=get_password_hash("User12345"),
        role="user",
        is_active=True
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user

@pytest.fixture
def admin_token(admin_user):
    return create_access_token(data={"sub": admin_user.email})

@pytest.fixture
def user_token(regular_user):
    return create_access_token(data={"sub": regular_user.email})

@pytest.fixture
def kos_profile(db_session):
    profile = KosProfile(
        id=1,
        name="Kos Test",
        address="Jl. Test No. 1",
        city="Jakarta",
        bank_name="BCA",
        bank_account_number="1234567890",
        bank_account_name="Pemilik"
    )
    db_session.add(profile)
    db_session.commit()
    db_session.refresh(profile)
    return profile

@pytest.fixture
def test_room(db_session):
    room = Room(
        name="Kamar Test",
        floor=1,
        room_type="campur",
        size_m2=3.5,
        price_monthly=1000000,
        deposit=500000,
        status="available",
        is_published=True
    )
    db_session.add(room)
    db_session.commit()
    db_session.refresh(room)
    return room

def test_register_login(client):
    response = client.post("/api/auth/register", json={
        "name": "New User",
        "email": "newuser@test.com",
        "password": "Password123"
    })
    assert response.status_code == 200
    data = response.json()
    assert data["email"] == "newuser@test.com"
    
    response = client.post("/api/auth/login", json={
        "email": "newuser@test.com",
        "password": "Password123"
    })
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data

def test_create_room(client, admin_token):
    response = client.post(
        "/api/admin/rooms",
        json={
            "name": "Kamar Baru",
            "floor": 1,
            "room_type": "putra",
            "price_monthly": 1200000,
            "deposit": 600000,
            "status": "available",
            "is_published": True,
            "facility_ids": []
        },
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "Kamar Baru"

def test_create_booking(client, user_token, test_room):
    start_date = date.today() + timedelta(days=7)
    response = client.post(
        "/api/bookings",
        json={
            "room_id": test_room.id,
            "start_date": start_date.isoformat(),
            "duration_months": 3,
            "note": "Test booking"
        },
        headers={"Authorization": f"Bearer {user_token}"}
    )
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "pending"
    assert data["monthly_price"] == test_room.price_monthly

def test_booking_overlap(client, user_token, test_room):
    start_date = date.today() + timedelta(days=7)
    
    booking1 = Booking(
        code="KOS-TEST-001",
        user_id=1,
        room_id=test_room.id,
        start_date=start_date,
        duration_months=3,
        end_date=start_date + relativedelta(months=3),
        monthly_price=test_room.price_monthly,
        deposit=test_room.deposit,
        total_amount=test_room.price_monthly * 3 + test_room.deposit,
        status="approved"
    )
    
    response = client.post(
        "/api/bookings",
        json={
            "room_id": test_room.id,
            "start_date": start_date.isoformat(),
            "duration_months": 2,
            "note": "Overlapping booking"
        },
        headers={"Authorization": f"Bearer {user_token}"}
    )
    assert response.status_code == 400

def test_approve_booking(client, admin_token, db_session, regular_user, test_room):
    start_date = date.today() + timedelta(days=7)
    booking = Booking(
        code="KOS-TEST-002",
        user_id=regular_user.id,
        room_id=test_room.id,
        start_date=start_date,
        duration_months=3,
        end_date=start_date + relativedelta(months=3),
        monthly_price=test_room.price_monthly,
        deposit=test_room.deposit,
        total_amount=test_room.price_monthly * 3 + test_room.deposit,
        status="pending"
    )
    db_session.add(booking)
    db_session.commit()
    db_session.refresh(booking)
    
    response = client.post(
        f"/api/admin/bookings/{booking.id}/approve",
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert response.status_code == 200
    
    db_session.refresh(booking)
    assert booking.status == "approved"
    
    db_session.refresh(test_room)
    assert test_room.status == "occupied"

def test_upload_payment_verify(client, admin_token, user_token, db_session, regular_user, test_room):
    start_date = date.today() + timedelta(days=7)
    booking = Booking(
        code="KOS-TEST-003",
        user_id=regular_user.id,
        room_id=test_room.id,
        start_date=start_date,
        duration_months=3,
        end_date=start_date + relativedelta(months=3),
        monthly_price=test_room.price_monthly,
        deposit=test_room.deposit,
        total_amount=test_room.price_monthly * 3 + test_room.deposit,
        status="approved"
    )
    db_session.add(booking)
    db_session.commit()
    db_session.refresh(booking)
    
    import io
    from PIL import Image
    
    img = Image.new('RGB', (100, 100), color='red')
    img_byte_arr = io.BytesIO()
    img.save(img_byte_arr, format='JPEG')
    img_byte_arr.seek(0)
    
    payment = Payment(
        booking_id=booking.id,
        amount=test_room.deposit,
        proof_path="proofs/test.jpg",
        status="pending",
        paid_at=datetime.utcnow()
    )
    db_session.add(payment)
    db_session.commit()
    db_session.refresh(payment)
    
    response = client.post(
        f"/api/admin/payments/{payment.id}/verify",
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert response.status_code == 200
    
    db_session.refresh(payment)
    assert payment.status == "verified"

def test_dashboard(client, admin_token, kos_profile):
    response = client.get(
        "/api/admin/dashboard",
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert response.status_code == 200
    data = response.json()
    assert "rooms" in data
    assert "pending_bookings" in data
    assert "revenue_by_month" in data
