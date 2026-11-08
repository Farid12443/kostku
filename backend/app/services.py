from datetime import date
from sqlalchemy.orm import Session
from .models import Room, Booking, Payment

def check_overlap(start_a: date, end_a: date, start_b: date, end_b: date) -> bool:
    return start_a < end_b and start_b < end_a

def sync_room_status(db: Session, room: Room):
    if room.status == "maintenance":
        return
    
    active_booking = db.query(Booking).filter(
        Booking.room_id == room.id,
        Booking.status.in_(["approved", "active"])
    ).first()
    
    if active_booking:
        room.status = "occupied"
    else:
        room.status = "available"
    db.commit()

def calculate_totals(booking: Booking, db: Session) -> dict:
    payments = db.query(Payment).filter(
        Payment.booking_id == booking.id,
        Payment.status == "verified"
    ).all()
    total_paid = sum(p.amount for p in payments)
    remaining = booking.total_amount - total_paid
    return {
        "total_paid": total_paid,
        "remaining_balance": max(0, remaining)
    }
