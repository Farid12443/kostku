from datetime import datetime
from sqlalchemy.orm import Session
from .models import User, KosProfile, Facility, Room
from .security import get_password_hash
from .config import settings

def seed_data(db: Session):
    existing_users = db.query(User).count()
    if existing_users > 0:
        return
    
    admin = User(
        name=settings.ADMIN_NAME,
        email=settings.ADMIN_EMAIL,
        password_hash=get_password_hash(settings.ADMIN_PASSWORD),
        role="admin",
        is_active=True
    )
    db.add(admin)
    
    user = User(
        name="User Demo",
        email="user@kos.local",
        password_hash=get_password_hash("User12345"),
        role="user",
        is_active=True
    )
    db.add(user)
    
    kos = KosProfile(
        id=1,
        name="Kos Contoh",
        tagline="Kos Nyaman, Strategis, dan Terjangkau",
        description="Kos dengan fasilitas lengkap di lokasi strategis dekat kampus dan pusat kota.",
        address="Jl. Contoh No. 123, Kelurahan Contoh",
        city="Jakarta",
        maps_url="https://maps.google.com",
        whatsapp="6281234567890",
        email="info@koscontoh.com",
        rules="1. Dilarang membawa tamu menginap\n2. Jam malam pukul 22.00\n3. Jaga kebersihan bersama\n4. Bayar tepat waktu",
        bank_name="Bank BCA",
        bank_account_number="1234567890",
        bank_account_name="Pemilik Kos",
        updated_at=datetime.utcnow()
    )
    db.add(kos)
    
    facilities_data = [
        {"name": "WiFi", "icon": "wifi"},
        {"name": "AC", "icon": "wind"},
        {"name": "Kasur", "icon": "bed"},
        {"name": "Lemari", "icon": "cabinet"},
        {"name": "Kamar Mandi Dalam", "icon": "bath"},
        {"name": "Meja Belajar", "icon": "desk"},
        {"name": "Parkir Motor", "icon": "bike"},
        {"name": "Dapur Bersama", "icon": "utensils"}
    ]
    facilities = []
    for f in facilities_data:
        facility = Facility(**f)
        db.add(facility)
        facilities.append(facility)
    
    db.commit()
    
    rooms_data = [
        {
            "name": "Kamar A1",
            "floor": 1,
            "room_type": "putra",
            "size_m2": 3.0,
            "price_monthly": 800000,
            "deposit": 500000,
            "status": "available",
            "description": "Kamar standar dengan fasilitas lengkap",
            "is_published": True,
            "facility_ids": [1, 3, 4, 5, 6, 7]
        },
        {
            "name": "Kamar A2",
            "floor": 1,
            "room_type": "putri",
            "size_m2": 3.5,
            "price_monthly": 1000000,
            "deposit": 500000,
            "status": "available",
            "description": "Kamar dengan AC dan kamar mandi dalam",
            "is_published": True,
            "facility_ids": [1, 2, 3, 4, 5, 6, 7]
        },
        {
            "name": "Kamar B1",
            "floor": 2,
            "room_type": "campur",
            "size_m2": 4.0,
            "price_monthly": 1200000,
            "deposit": 800000,
            "status": "occupied",
            "description": "Kamar premium dengan fasilitas lengkap",
            "is_published": True,
            "facility_ids": [1, 2, 3, 4, 5, 6, 7, 8]
        },
        {
            "name": "Kamar B2",
            "floor": 2,
            "room_type": "putra",
            "size_m2": 3.5,
            "price_monthly": 1100000,
            "deposit": 700000,
            "status": "available",
            "description": "Kamar nyaman di lantai 2",
            "is_published": True,
            "facility_ids": [1, 2, 3, 4, 5, 6]
        },
        {
            "name": "Kamar C1",
            "floor": 3,
            "room_type": "putri",
            "size_m2": 5.0,
            "price_monthly": 1500000,
            "deposit": 1000000,
            "status": "available",
            "description": "Kamar eksklusif dengan view bagus",
            "is_published": True,
            "facility_ids": [1, 2, 3, 4, 5, 6, 7, 8]
        },
        {
            "name": "Kamar C2",
            "floor": 3,
            "room_type": "campur",
            "size_m2": 3.0,
            "price_monthly": 900000,
            "deposit": 500000,
            "status": "maintenance",
            "description": "Kamar sedang dalam perbaikan",
            "is_published": False,
            "facility_ids": [1, 3, 4]
        }
    ]
    
    for room_data in rooms_data:
        facility_ids = room_data.pop("facility_ids")
        room = Room(**room_data)
        room.facilities = [f for f in facilities if facilities_data[facilities.index(f)]["name"] in 
                          [facilities_data[i]["name"] for i in range(len(facility_ids))]]
        
        selected_facilities = []
        for fid in facility_ids:
            if fid <= len(facilities):
                selected_facilities.append(facilities[fid - 1])
        room.facilities = selected_facilities
        
        db.add(room)
    
    db.commit()
