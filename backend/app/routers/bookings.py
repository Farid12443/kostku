from datetime import date, datetime, timedelta
from dateutil.relativedelta import relativedelta
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_
from ..database import get_db
from ..models import Booking, User, Room, Payment, KosProfile
from ..schemas import Booking, BookingDetail, Payment
from ..security import get_current_user
from ..services import check_overlap, sync_room_status, calculate_totals
import random
import string

router = APIRouter(prefix="/api/bookings", tags=["bookings"])

def generate_booking_code() -> str:
    date_str = datetime.utcnow().strftime("%Y%m%d")
    random_str = ''.join(random.choices(string.ascii_uppercase + string.digits, k=4))
    return f"KOS-{date_str}-{random_str}"

@router.post("", response_model=Booking)
async def create_booking(
    data: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role != "user":
        raise HTTPException(status_code=403, detail="Only users can create bookings")
    
    room_id = data.get("room_id")
    start_date = datetime.fromisoformat(data.get("start_date")).date() if isinstance(data.get("start_date"), str) else data.get("start_date")
    duration_months = data.get("duration_months")
    note = data.get("note")
    
    if start_date < date.today():
        raise HTTPException(status_code=400, detail="Start date cannot be in the past")
    if not (1 <= duration_months <= 24):
        raise HTTPException(status_code=400, detail="Duration must be between 1 and 24 months")
    
    room = db.query(Room).filter(Room.id == room_id).first()
    if not room or not room.is_published or room.status == "maintenance":
        raise HTTPException(status_code=400, detail="Room not available")
    
    end_date = start_date + relativedelta(months=duration_months)
    
    overlapping = db.query(Booking).filter(
        Booking.room_id == room_id,
        Booking.status.in_(["approved", "active"]),
        and_(Booking.start_date < end_date, Booking.end_date > start_date)
    ).first()
    if overlapping:
        raise HTTPException(status_code=400, detail="Date range overlaps with existing booking")
    
    pending_approved = db.query(Booking).filter(
        Booking.user_id == current_user.id,
        Booking.status.in_(["pending", "approved"])
    ).count()
    if pending_approved >= 3:
        raise HTTPException(status_code=400, detail="Maximum 3 pending/approved bookings allowed")
    
    booking = Booking(
        code=generate_booking_code(),
        user_id=current_user.id,
        room_id=room_id,
        start_date=start_date,
        duration_months=duration_months,
        end_date=end_date,
        monthly_price=room.price_monthly,
        deposit=room.deposit,
        total_amount=room.price_monthly * duration_months + room.deposit,
        status="pending",
        note=note
    )
    db.add(booking)
    db.commit()
    db.refresh(booking)
    return booking

@router.get("/me", response_model=list[Booking])
async def my_bookings(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    bookings = db.query(Booking).filter(Booking.user_id == current_user.id).order_by(Booking.created_at.desc()).all()
    return bookings

@router.get("/{booking_id}", response_model=BookingDetail)
async def get_booking(
    booking_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    booking = db.query(Booking).filter(Booking.id == booking_id).first()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    if booking.user_id != current_user.id and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Not authorized")
    
    payments = db.query(Payment).filter(Payment.booking_id == booking_id).all()
    totals = calculate_totals(booking, db)
    kos = db.query(KosProfile).first()
    
    return BookingDetail(
        **booking.__dict__,
        payments=payments,
        total_paid=totals["total_paid"],
        remaining_balance=totals["remaining_balance"],
        kos_profile=kos
    )

@router.post("/{booking_id}/cancel")
async def cancel_booking(
    booking_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    booking = db.query(Booking).filter(Booking.id == booking_id).first()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    if booking.user_id != current_user.id and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Not authorized")
    if booking.status not in ["pending", "approved"]:
        raise HTTPException(status_code=400, detail="Can only cancel pending or approved bookings")
    
    booking.status = "cancelled"
    db.commit()
    sync_room_status(db, booking.room)
    return {"detail": "Booking cancelled"}

@router.post("/{booking_id}/payments")
async def upload_payment(
    booking_id: int,
    amount: int,
    file: any,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    from ..storage import save_file, validate_file
    
    booking = db.query(Booking).filter(Booking.id == booking_id).first()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    if booking.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")
    if booking.status not in ["approved", "active"]:
        raise HTTPException(status_code=400, detail="Can only upload proof for approved or active bookings")
    
    validate_file(file, 5, ["image/jpeg", "image/png", "image/webp"])
    file_path = await save_file(file, "proofs")
    
    payment = Payment(
        booking_id=booking_id,
        amount=amount,
        proof_path=file_path,
        status="pending",
        paid_at=datetime.utcnow()
    )
    db.add(payment)
    db.commit()
    db.refresh(payment)
    return payment
