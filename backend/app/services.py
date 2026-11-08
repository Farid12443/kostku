from datetime import date
from typing import Optional

from fastapi import HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session

from . import schemas
from .models import Booking, KosProfile, Payment, Room

BLOCKING_STATUSES = ("approved", "active")


def find_overlap(
    db: Session, room_id: int, start: date, end: date, exclude_id: Optional[int] = None
) -> Optional[Booking]:
    """Rentang [start, end) bentrok jika start < end_lain dan start_lain < end."""
    query = db.query(Booking).filter(
        Booking.room_id == room_id,
        Booking.status.in_(BLOCKING_STATUSES),
        Booking.start_date < end,
        Booking.end_date > start,
    )
    if exclude_id is not None:
        query = query.filter(Booking.id != exclude_id)
    return query.first()


def sync_room_status(db: Session, room: Room) -> None:
    if room.status == "maintenance":
        return
    db.flush()
    has_booking = db.query(Booking.id).filter(
        Booking.room_id == room.id, Booking.status.in_(BLOCKING_STATUSES)
    ).first()
    room.status = "occupied" if has_booking else "available"


def transition(db: Session, booking: Booking, target: str, allowed_from: tuple[str, ...]) -> Booking:
    """Ubah status booking, sinkronkan status kamar, lalu commit."""
    if booking.status not in allowed_from:
        raise HTTPException(
            status_code=400, detail=f"Booking berstatus {booking.status} tidak bisa diubah menjadi {target}"
        )
    booking.status = target
    sync_room_status(db, booking.room)
    db.commit()
    db.refresh(booking)
    return booking


def total_verified(db: Session, booking_id: int) -> int:
    total = db.query(func.sum(Payment.amount)).filter(
        Payment.booking_id == booking_id, Payment.status == "verified"
    ).scalar()
    return int(total or 0)


def booking_detail(db: Session, booking: Booking) -> schemas.BookingDetail:
    paid = total_verified(db, booking.id)
    fields = {name: getattr(booking, name) for name in schemas.Booking.model_fields}
    return schemas.BookingDetail.model_validate(
        {
            **fields,
            "payments": booking.payments,
            "total_paid": paid,
            "remaining_balance": max(0, booking.total_amount - paid),
            "kos_profile": db.query(KosProfile).first(),
        },
        from_attributes=True,
    )
