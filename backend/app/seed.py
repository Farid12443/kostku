from sqlalchemy.orm import Session

from .config import settings
from .models import Facility, KosProfile, Room, User
from .security import get_password_hash

FACILITIES = [
    ("WiFi", "wifi"),
    ("AC", "air-vent"),
    ("Kasur", "bed"),
    ("Lemari", "archive"),
    ("Kamar Mandi Dalam", "bath"),
    ("Meja Belajar", "lamp-desk"),
    ("Parkir Motor", "bike"),
    ("Dapur Bersama", "utensils"),
]

# facilities berisi indeks dari daftar FACILITIES
ROOMS = [
    dict(name="Kamar A1", floor=1, room_type="putra", size_m2=9.0, price_monthly=800000, deposit=500000,
         status="available", description="Kamar standar yang rapi dan terang.", facilities=[0, 2, 3, 5, 6]),
    dict(name="Kamar A2", floor=1, room_type="putri", size_m2=10.5, price_monthly=1000000, deposit=500000,
         status="available", description="Kamar dengan AC dan kamar mandi dalam.", facilities=[0, 1, 2, 3, 4, 5]),
    dict(name="Kamar B1", floor=2, room_type="campur", size_m2=12.0, price_monthly=1200000, deposit=800000,
         status="occupied", description="Kamar luas dengan fasilitas lengkap.", facilities=[0, 1, 2, 3, 4, 5, 6, 7]),
    dict(name="Kamar B2", floor=2, room_type="putra", size_m2=10.5, price_monthly=1100000, deposit=700000,
         status="available", description="Kamar nyaman di lantai 2.", facilities=[0, 1, 2, 3, 4, 5]),
    dict(name="Kamar C1", floor=3, room_type="putri", size_m2=15.0, price_monthly=1800000, deposit=1000000,
         status="available", description="Kamar paling luas dengan pemandangan kota.", facilities=[0, 1, 2, 3, 4, 5, 6, 7]),
    dict(name="Kamar C2", floor=3, room_type="campur", size_m2=9.0, price_monthly=900000, deposit=500000,
         status="maintenance", description="Kamar sedang dalam perbaikan.", facilities=[0, 2, 3]),
]


def seed_data(db: Session) -> None:
    """Hanya berjalan saat tabel users kosong, dan disimpan dalam satu transaksi."""
    if db.query(User.id).first() is not None:
        return

    db.add_all([
        User(name=settings.ADMIN_NAME, email=settings.ADMIN_EMAIL.lower(),
             password_hash=get_password_hash(settings.ADMIN_PASSWORD), role="admin"),
        User(name="User Demo", email="user@kos.local", phone="081200000000",
             password_hash=get_password_hash("User12345"), role="user"),
        KosProfile(
            id=1,
            name="Kos Contoh",
            tagline="Kamar nyaman, dekat kampus dan pusat kota",
            description="Kos dengan fasilitas lengkap di lokasi yang mudah dijangkau.",
            address="Jl. Contoh No. 123, Kelurahan Contoh",
            city="Jakarta",
            maps_url="https://www.google.com/maps/search/?api=1&query=Jakarta",
            whatsapp="6281234567890",
            email="info@koscontoh.com",
            rules="Dilarang membawa tamu menginap\nJam malam pukul 22.00\nJaga kebersihan bersama\nBayar sewa tepat waktu",
            bank_name="Bank BCA",
            bank_account_number="1234567890",
            bank_account_name="Pemilik Kos",
        ),
    ])

    facilities = [Facility(name=name, icon=icon) for name, icon in FACILITIES]
    db.add_all(facilities)

    for data in ROOMS:
        indexes = data["facilities"]
        fields = {key: value for key, value in data.items() if key != "facilities"}
        db.add(Room(**fields, is_published=True, facilities=[facilities[i] for i in indexes]))

    db.commit()
