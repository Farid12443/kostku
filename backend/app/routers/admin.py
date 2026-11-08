from datetime import datetime
from typing import List, Optional

from dateutil.relativedelta import relativedelta
from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile
from sqlalchemy import func
from sqlalchemy.orm import Session

from .. import models, schemas
from ..database import get_db
from ..models import Booking, Facility, KosProfile, Payment, Room, RoomMedia, User, utcnow
from ..security import require_admin
from ..services import BLOCKING_STATUSES, booking_detail, find_overlap, sync_room_status, total_verified, transition
from ..storage import VIDEO_TYPES, delete_file, extension_of, save_photo, save_video

router = APIRouter(prefix="/api/admin", tags=["admin"], dependencies=[Depends(require_admin)])

BOOKING_STATUSES = ("pending", "approved", "active", "rejected", "cancelled", "finished")
NULLABLE_ROOM_FIELDS = {"size_m2", "description"}


def paginate(query, page: int, page_size: int) -> dict:
    total = query.order_by(None).count()
    items = query.offset((page - 1) * page_size).limit(page_size).all()
    return {"items": items, "total": total, "page": page, "page_size": page_size}


def get_or_404(db: Session, model, item_id: int, label: str):
    item = db.get(model, item_id)
    if not item:
        raise HTTPException(status_code=404, detail=f"{label} tidak ditemukan")
    return item


def revenue_between(db: Session, start: datetime, end: datetime) -> int:
    total = db.query(func.sum(Payment.amount)).filter(
        Payment.status == "verified", Payment.verified_at >= start, Payment.verified_at < end
    ).scalar()
    return int(total or 0)


@router.get("/dashboard", response_model=schemas.DashboardStats)
def dashboard(db: Session = Depends(get_db)):
    room_counts = dict(db.query(Room.status, func.count(Room.id)).group_by(Room.status).all())
    booking_counts = dict(db.query(Booking.status, func.count(Booking.id)).group_by(Booking.status).all())
    month_start = utcnow().replace(day=1, hour=0, minute=0, second=0, microsecond=0)

    revenue_by_month = []
    for months_ago in range(5, -1, -1):
        start = month_start - relativedelta(months=months_ago)
        total = revenue_between(db, start, start + relativedelta(months=1))
        revenue_by_month.append({"month": f"{start:%Y-%m}", "total": total})

    return {
        "rooms": {
            "total": sum(room_counts.values()),
            "available": room_counts.get("available", 0),
            "occupied": room_counts.get("occupied", 0),
            "maintenance": room_counts.get("maintenance", 0),
        },
        "pending_bookings": booking_counts.get("pending", 0),
        "pending_payments": db.query(Payment).filter(Payment.status == "pending").count(),
        "active_tenants": booking_counts.get("active", 0),
        "revenue_this_month": revenue_by_month[-1]["total"],
        "revenue_by_month": revenue_by_month,
        "bookings_by_status": {status: booking_counts.get(status, 0) for status in BOOKING_STATUSES},
        "recent_bookings": db.query(Booking).order_by(Booking.created_at.desc(), Booking.id.desc()).limit(5).all(),
    }


@router.put("/kos", response_model=schemas.KosProfile)
def update_kos(data: schemas.KosProfileUpdate, db: Session = Depends(get_db)):
    profile = db.query(KosProfile).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Profil kos belum tersedia")
    for key, value in data.model_dump().items():
        setattr(profile, key, value)
    db.commit()
    db.refresh(profile)
    return profile


def ensure_room_name_free(db: Session, name: str, room_id: Optional[int] = None) -> None:
    query = db.query(Room.id).filter(Room.name == name)
    if room_id is not None:
        query = query.filter(Room.id != room_id)
    if query.first():
        raise HTTPException(status_code=400, detail="Nama kamar sudah dipakai")


def load_facilities(db: Session, facility_ids: List[int]) -> List[Facility]:
    if not facility_ids:
        return []
    return db.query(Facility).filter(Facility.id.in_(facility_ids)).all()


@router.get("/rooms", response_model=schemas.Page[schemas.Room])
def list_rooms(
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    status: Optional[str] = None,
    q: Optional[str] = None,
    db: Session = Depends(get_db),
):
    query = db.query(Room)
    if status:
        query = query.filter(Room.status == status)
    if q:
        query = query.filter(Room.name.icontains(q, autoescape=True))
    return paginate(query.order_by(Room.id), page, page_size)


@router.post("/rooms", response_model=schemas.Room)
def create_room(data: schemas.RoomCreate, db: Session = Depends(get_db)):
    ensure_room_name_free(db, data.name)
    room = Room(**data.model_dump(exclude={"facility_ids"}), facilities=load_facilities(db, data.facility_ids))
    db.add(room)
    db.commit()
    db.refresh(room)
    return room


@router.get("/rooms/{room_id}", response_model=schemas.Room)
def get_room(room_id: int, db: Session = Depends(get_db)):
    return get_or_404(db, Room, room_id, "Kamar")


@router.put("/rooms/{room_id}", response_model=schemas.Room)
def update_room(room_id: int, data: schemas.RoomUpdate, db: Session = Depends(get_db)):
    room = get_or_404(db, Room, room_id, "Kamar")
    values = data.model_dump(exclude_unset=True)
    facility_ids = values.pop("facility_ids", None)
    if values.get("name"):
        ensure_room_name_free(db, values["name"], room_id)
    for key, value in values.items():
        if value is not None or key in NULLABLE_ROOM_FIELDS:
            setattr(room, key, value)
    if facility_ids is not None:
        room.facilities = load_facilities(db, facility_ids)
    db.commit()
    db.refresh(room)
    return room


@router.delete("/rooms/{room_id}")
def delete_room(room_id: int, db: Session = Depends(get_db)):
    room = get_or_404(db, Room, room_id, "Kamar")
    if any(booking.status in BLOCKING_STATUSES for booking in room.bookings):
        raise HTTPException(status_code=400, detail="Kamar masih punya booking approved atau active")

    # Sesuai aturan, hanya booking approved/active yang menghalangi. Riwayat lain ikut terhapus.
    files = [media.file_path for media in room.media]
    for booking in room.bookings:
        files += [payment.proof_path for payment in booking.payments]
        db.delete(booking)
    db.delete(room)
    db.commit()
    for path in files:
        delete_file(path)
    return {"detail": "Kamar dihapus"}


@router.post("/rooms/{room_id}/media", response_model=List[schemas.RoomMedia])
def upload_media(room_id: int, files: List[UploadFile] = File(), db: Session = Depends(get_db)):
    room = get_or_404(db, Room, room_id, "Kamar")
    has_cover = any(media.is_cover for media in room.media)
    next_order = max((media.sort_order for media in room.media), default=-1) + 1

    created: List[RoomMedia] = []
    try:
        for offset, file in enumerate(files):
            is_video = extension_of(file) in VIDEO_TYPES
            path = save_video(file) if is_video else save_photo(file)
            is_cover = not is_video and not has_cover
            has_cover = has_cover or is_cover
            media = RoomMedia(
                room_id=room.id,
                media_type="video" if is_video else "photo",
                file_path=path,
                is_cover=is_cover,
                sort_order=next_order + offset,
            )
            db.add(media)
            created.append(media)
        db.commit()
    except Exception:
        db.rollback()
        for media in created:
            delete_file(media.file_path)
        raise

    for media in created:
        db.refresh(media)
    return created


@router.patch("/media/{media_id}", response_model=schemas.RoomMedia)
def update_media(media_id: int, data: schemas.MediaUpdate, db: Session = Depends(get_db)):
    media = get_or_404(db, RoomMedia, media_id, "Media")
    if data.is_cover is True:
        if media.media_type != "photo":
            raise HTTPException(status_code=400, detail="Hanya foto yang bisa dijadikan cover")
        db.query(RoomMedia).filter(RoomMedia.room_id == media.room_id, RoomMedia.id != media.id).update(
            {RoomMedia.is_cover: False}
        )
        media.is_cover = True
    elif data.is_cover is False:
        media.is_cover = False
    if data.sort_order is not None:
        media.sort_order = data.sort_order
    db.commit()
    db.refresh(media)
    return media


@router.delete("/media/{media_id}")
def delete_media(media_id: int, db: Session = Depends(get_db)):
    media = get_or_404(db, RoomMedia, media_id, "Media")
    path = media.file_path
    if media.is_cover:
        replacement = db.query(RoomMedia).filter(
            RoomMedia.room_id == media.room_id, RoomMedia.id != media.id, RoomMedia.media_type == "photo"
        ).order_by(RoomMedia.sort_order, RoomMedia.id).first()
        if replacement:
            replacement.is_cover = True
    db.delete(media)
    db.commit()
    delete_file(path)
    return {"detail": "Media dihapus"}


def ensure_facility_name_free(db: Session, name: str, facility_id: Optional[int] = None) -> None:
    query = db.query(Facility.id).filter(Facility.name == name)
    if facility_id is not None:
        query = query.filter(Facility.id != facility_id)
    if query.first():
        raise HTTPException(status_code=400, detail="Nama fasilitas sudah dipakai")


@router.get("/facilities", response_model=List[schemas.Facility])
def list_facilities(db: Session = Depends(get_db)):
    return db.query(Facility).order_by(Facility.id).all()


@router.post("/facilities", response_model=schemas.Facility)
def create_facility(data: schemas.FacilityCreate, db: Session = Depends(get_db)):
    ensure_facility_name_free(db, data.name)
    facility = Facility(**data.model_dump())
    db.add(facility)
    db.commit()
    db.refresh(facility)
    return facility


@router.put("/facilities/{facility_id}", response_model=schemas.Facility)
def update_facility(facility_id: int, data: schemas.FacilityCreate, db: Session = Depends(get_db)):
    facility = get_or_404(db, Facility, facility_id, "Fasilitas")
    ensure_facility_name_free(db, data.name, facility_id)
    facility.name = data.name
    facility.icon = data.icon
    db.commit()
    db.refresh(facility)
    return facility


@router.delete("/facilities/{facility_id}")
def delete_facility(facility_id: int, db: Session = Depends(get_db)):
    db.delete(get_or_404(db, Facility, facility_id, "Fasilitas"))
    db.commit()
    return {"detail": "Fasilitas dihapus"}


@router.get("/bookings", response_model=schemas.Page[schemas.Booking])
def list_bookings(
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    status: Optional[str] = None,
    room_id: Optional[int] = None,
    q: Optional[str] = None,
    db: Session = Depends(get_db),
):
    query = db.query(Booking)
    if status:
        query = query.filter(Booking.status == status)
    if room_id:
        query = query.filter(Booking.room_id == room_id)
    if q:
        query = query.join(Booking.user).filter(
            Booking.code.icontains(q, autoescape=True) | User.name.icontains(q, autoescape=True)
        )
    return paginate(query.order_by(Booking.created_at.desc(), Booking.id.desc()), page, page_size)


@router.get("/bookings/{booking_id}", response_model=schemas.BookingDetail)
def get_booking(booking_id: int, db: Session = Depends(get_db)):
    return booking_detail(db, get_or_404(db, Booking, booking_id, "Booking"))


@router.post("/bookings/{booking_id}/approve", response_model=schemas.Booking)
def approve_booking(booking_id: int, db: Session = Depends(get_db)):
    booking = get_or_404(db, Booking, booking_id, "Booking")
    # Kunci baris kamar agar dua approve bersamaan tidak lolos cek overlap
    db.query(Room).filter(Room.id == booking.room_id).with_for_update().one()
    if booking.status == "pending" and find_overlap(
        db, booking.room_id, booking.start_date, booking.end_date, exclude_id=booking.id
    ):
        raise HTTPException(status_code=400, detail="Tanggal bentrok dengan booking lain pada kamar ini")
    return transition(db, booking, "approved", ("pending",))


@router.post("/bookings/{booking_id}/reject", response_model=schemas.Booking)
def reject_booking(booking_id: int, data: schemas.AdminNote, db: Session = Depends(get_db)):
    booking = get_or_404(db, Booking, booking_id, "Booking")
    if booking.status == "pending":
        booking.admin_note = data.admin_note
    return transition(db, booking, "rejected", ("pending",))


@router.post("/bookings/{booking_id}/activate", response_model=schemas.Booking)
def activate_booking(booking_id: int, db: Session = Depends(get_db)):
    return transition(db, get_or_404(db, Booking, booking_id, "Booking"), "active", ("approved",))


@router.post("/bookings/{booking_id}/finish", response_model=schemas.Booking)
def finish_booking(booking_id: int, db: Session = Depends(get_db)):
    return transition(db, get_or_404(db, Booking, booking_id, "Booking"), "finished", ("active",))


@router.post("/bookings/{booking_id}/cancel", response_model=schemas.Booking)
def cancel_booking(booking_id: int, db: Session = Depends(get_db)):
    return transition(db, get_or_404(db, Booking, booking_id, "Booking"), "cancelled", ("approved",))


@router.get("/payments", response_model=schemas.Page[schemas.PaymentAdmin])
def list_payments(
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    status: Optional[str] = None,
    db: Session = Depends(get_db),
):
    query = db.query(Payment)
    if status:
        query = query.filter(Payment.status == status)
    return paginate(query.order_by(Payment.paid_at.desc(), Payment.id.desc()), page, page_size)


def get_pending_payment(db: Session, payment_id: int) -> Payment:
    payment = get_or_404(db, Payment, payment_id, "Pembayaran")
    if payment.status != "pending":
        raise HTTPException(status_code=400, detail="Pembayaran ini sudah diproses")
    return payment


@router.post("/payments/{payment_id}/verify", response_model=schemas.Payment)
def verify_payment(payment_id: int, db: Session = Depends(get_db)):
    payment = get_pending_payment(db, payment_id)
    payment.status = "verified"
    payment.verified_at = utcnow()
    db.flush()

    booking = payment.booking
    if booking.status == "approved" and total_verified(db, booking.id) >= booking.total_amount:
        booking.status = "active"
        sync_room_status(db, booking.room)
    db.commit()
    db.refresh(payment)
    return payment


@router.post("/payments/{payment_id}/reject", response_model=schemas.Payment)
def reject_payment(payment_id: int, data: schemas.AdminNote, db: Session = Depends(get_db)):
    payment = get_pending_payment(db, payment_id)
    payment.status = "rejected"
    payment.admin_note = data.admin_note
    db.commit()
    db.refresh(payment)
    return payment


@router.get("/users", response_model=schemas.Page[schemas.User])
def list_users(
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    db: Session = Depends(get_db),
):
    return paginate(db.query(User).order_by(User.id), page, page_size)


@router.patch("/users/{user_id}", response_model=schemas.User)
def update_user(
    user_id: int,
    data: schemas.UserAdminUpdate,
    db: Session = Depends(get_db),
    admin: models.User = Depends(require_admin),
):
    user = get_or_404(db, User, user_id, "Pengguna")
    if user.id == admin.id and not data.is_active:
        raise HTTPException(status_code=400, detail="Admin tidak boleh menonaktifkan dirinya sendiri")
    user.is_active = data.is_active
    db.commit()
    db.refresh(user)
    return user
