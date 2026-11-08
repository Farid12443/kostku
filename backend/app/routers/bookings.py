import secrets
import string
from datetime import date
from typing import List

from dateutil.relativedelta import relativedelta
from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from sqlalchemy.orm import Session

from .. import models, schemas
from ..database import get_db
from ..models import utcnow
from ..security import get_current_user
from ..services import booking_detail, find_overlap, transition
from ..storage import delete_file, save_proof

router = APIRouter(prefix="/api/bookings", tags=["bookings"])

MAX_OPEN_BOOKINGS = 3


def generate_booking_code(db: Session) -> str:
    alphabet = string.ascii_uppercase + string.digits
    while True:
        suffix = "".join(secrets.choice(alphabet) for _ in range(4))
        code = f"KOS-{utcnow():%Y%m%d}-{suffix}"
        if not db.query(models.Booking.id).filter(models.Booking.code == code).first():
            return code


def get_owned_booking(booking_id: int, db: Session, user: models.User) -> models.Booking:
    booking = db.get(models.Booking, booking_id)
    if not booking:
        raise HTTPException(status_code=404, detail="Booking tidak ditemukan")
    if booking.user_id != user.id:
        raise HTTPException(status_code=403, detail="Booking ini bukan milik Anda")
    return booking


@router.post("", response_model=schemas.Booking)
def create_booking(
    data: schemas.BookingCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    if current_user.role != "user":
        raise HTTPException(status_code=403, detail="Hanya penyewa yang bisa membuat booking")
    if data.start_date < date.today():
        raise HTTPException(status_code=400, detail="Tanggal mulai tidak boleh di masa lalu")

    room = db.get(models.Room, data.room_id)
    if not room or not room.is_published or room.status == "maintenance":
        raise HTTPException(status_code=400, detail="Kamar tidak tersedia untuk disewa")

    end_date = data.start_date + relativedelta(months=data.duration_months)
    if find_overlap(db, room.id, data.start_date, end_date):
        raise HTTPException(status_code=400, detail="Tanggal bentrok dengan booking lain pada kamar ini")

    open_count = db.query(models.Booking).filter(
        models.Booking.user_id == current_user.id,
        models.Booking.status.in_(("pending", "approved")),
    ).count()
    if open_count >= MAX_OPEN_BOOKINGS:
        raise HTTPException(status_code=400, detail="Maksimal 3 booking berstatus pending atau approved")

    booking = models.Booking(
        code=generate_booking_code(db),
        user_id=current_user.id,
        room_id=room.id,
        start_date=data.start_date,
        duration_months=data.duration_months,
        end_date=end_date,
        monthly_price=room.price_monthly,
        deposit=room.deposit,
        total_amount=room.price_monthly * data.duration_months + room.deposit,
        status="pending",
        note=data.note,
    )
    db.add(booking)
    db.commit()
    db.refresh(booking)
    return booking


@router.get("/me", response_model=List[schemas.Booking])
def my_bookings(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    return (
        db.query(models.Booking)
        .filter(models.Booking.user_id == current_user.id)
        .order_by(models.Booking.created_at.desc(), models.Booking.id.desc())
        .all()
    )


@router.get("/{booking_id}", response_model=schemas.BookingDetail)
def get_booking(
    booking_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    return booking_detail(db, get_owned_booking(booking_id, db, current_user))


@router.post("/{booking_id}/cancel", response_model=schemas.Booking)
def cancel_booking(
    booking_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    booking = get_owned_booking(booking_id, db, current_user)
    return transition(db, booking, "cancelled", ("pending", "approved"))


@router.post("/{booking_id}/payments", response_model=schemas.Payment)
def upload_payment(
    booking_id: int,
    amount: int = Form(gt=0),
    proof: UploadFile = File(),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    booking = get_owned_booking(booking_id, db, current_user)
    if booking.status not in ("approved", "active"):
        raise HTTPException(status_code=400, detail="Bukti bayar hanya untuk booking approved atau active")

    proof_path = save_proof(proof)
    payment = models.Payment(booking_id=booking.id, amount=amount, proof_path=proof_path, status="pending")
    db.add(payment)
    try:
        db.commit()
    except Exception:
        db.rollback()
        delete_file(proof_path)
        raise
    db.refresh(payment)
    return payment
