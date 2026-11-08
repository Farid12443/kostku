from datetime import datetime, date
from dateutil.relativedelta import relativedelta
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, and_
from ..database import get_db
from ..models import KosProfile, Room, Facility, RoomMedia, Booking, Payment, User
from ..schemas import KosProfile, Room, Facility, Payment, DashboardStats, PaginatedResponse
from ..security import require_admin
from ..services import sync_room_status, calculate_totals
from ..storage import save_file, validate_file, delete_file
import os

router = APIRouter(prefix="/api/admin", tags=["admin"])

@router.get("/dashboard", response_model=DashboardStats)
async def dashboard(db: Session = Depends(require_admin)):
    rooms_count = db.query(Room).count()
    available = db.query(Room).filter(Room.status == "available").count()
    occupied = db.query(Room).filter(Room.status == "occupied").count()
    maintenance = db.query(Room).filter(Room.status == "maintenance").count()
    
    pending_bookings = db.query(Booking).filter(Booking.status == "pending").count()
    pending_payments = db.query(Payment).filter(Payment.status == "pending").count()
    active_tenants = db.query(Booking).filter(Booking.status == "active").count()
    
    today = datetime.utcnow()
    month_start = date(today.year, today.month, 1)
    month_end = month_start + relativedelta(months=1)
    revenue_this_month = db.query(func.sum(Payment.amount)).filter(
        Payment.status == "verified",
        Payment.verified_at >= month_start,
        Payment.verified_at < month_end
    ).scalar() or 0
    
    revenue_by_month = []
    for i in range(5, -1, -1):
        m = today - relativedelta(months=i)
        m_start = date(m.year, m.month, 1)
        m_end = m_start + relativedelta(months=1)
        total = db.query(func.sum(Payment.amount)).filter(
            Payment.status == "verified",
            Payment.verified_at >= m_start,
            Payment.verified_at < m_end
        ).scalar() or 0
        revenue_by_month.append({"month": m.strftime("%Y-%m"), "total": total})
    
    bookings_by_status = {}
    for status in ["pending", "approved", "active", "rejected", "cancelled", "finished"]:
        bookings_by_status[status] = db.query(Booking).filter(Booking.status == status).count()
    
    recent_bookings = db.query(Booking).order_by(Booking.created_at.desc()).limit(5).all()
    
    return {
        "rooms": {"total": rooms_count, "available": available, "occupied": occupied, "maintenance": maintenance},
        "pending_bookings": pending_bookings,
        "pending_payments": pending_payments,
        "active_tenants": active_tenants,
        "revenue_this_month": revenue_this_month,
        "revenue_by_month": revenue_by_month,
        "bookings_by_status": bookings_by_status,
        "recent_bookings": recent_bookings
    }

@router.get("/kos", response_model=KosProfile)
async def get_kos(db: Session = Depends(require_admin)):
    profile = db.query(KosProfile).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Kos profile not found")
    return profile

@router.put("/kos", response_model=KosProfile)
async def update_kos(data: dict, db: Session = Depends(require_admin)):
    profile = db.query(KosProfile).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Kos profile not found")
    
    for key, value in data.items():
        if hasattr(profile, key):
            setattr(profile, key, value)
    profile.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(profile)
    return profile

@router.get("/rooms", response_model=PaginatedResponse)
async def list_rooms(
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    status: str = None,
    q: str = None,
    db: Session = Depends(require_admin)
):
    query = db.query(Room)
    if status:
        query = query.filter(Room.status == status)
    if q:
        query = query.filter(Room.name.ilike(f"%{q}%"))
    
    total = query.count()
    rooms = query.offset((page - 1) * page_size).limit(page_size).all()
    return {"items": rooms, "total": total, "page": page, "page_size": page_size}

@router.post("/rooms", response_model=Room)
async def create_room(data: dict, db: Session = Depends(require_admin)):
    facility_ids = data.pop("facility_ids", [])
    room = Room(**data)
    
    if facility_ids:
        facilities = db.query(Facility).filter(Facility.id.in_(facility_ids)).all()
        room.facilities = facilities
    
    db.add(room)
    db.commit()
    db.refresh(room)
    return room

@router.get("/rooms/{room_id}", response_model=Room)
async def get_room(room_id: int, db: Session = Depends(require_admin)):
    room = db.query(Room).filter(Room.id == room_id).first()
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")
    return room

@router.put("/rooms/{room_id}", response_model=Room)
async def update_room(room_id: int, data: dict, db: Session = Depends(require_admin)):
    room = db.query(Room).filter(Room.id == room_id).first()
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")
    
    facility_ids = data.pop("facility_ids", None)
    for key, value in data.items():
        if hasattr(room, key):
            setattr(room, key, value)
    
    if facility_ids is not None:
        room.facilities = db.query(Facility).filter(Facility.id.in_(facility_ids)).all()
    
    room.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(room)
    return room

@router.delete("/rooms/{room_id}")
async def delete_room(room_id: int, db: Session = Depends(require_admin)):
    room = db.query(Room).filter(Room.id == room_id).first()
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")
    
    active_booking = db.query(Booking).filter(
        Booking.room_id == room_id,
        Booking.status.in_(["approved", "active"])
    ).first()
    if active_booking:
        raise HTTPException(status_code=400, detail="Cannot delete room with active bookings")
    
    for media in room.media:
        delete_file(media.file_path)
    
    db.delete(room)
    db.commit()
    return {"detail": "Room deleted"}

@router.post("/rooms/{room_id}/media")
async def upload_media(
    room_id: int,
    files: list[UploadFile] = File(...),
    db: Session = Depends(require_admin)
):
    room = db.query(Room).filter(Room.id == room_id).first()
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")
    
    saved_media = []
    for file in files:
        if file.content_type.startswith("image/"):
            validate_file(file, 5, ["image/jpeg", "image/png", "image/webp"])
            file_path = await save_file(file, "photos")
            
            has_cover = db.query(RoomMedia).filter(RoomMedia.room_id == room_id, RoomMedia.is_cover == True).first()
            is_cover = not bool(has_cover)
            
            media = RoomMedia(room_id=room_id, media_type="photo", file_path=file_path, is_cover=is_cover)
            db.add(media)
            saved_media.append(media)
        elif file.content_type.startswith("video/"):
            validate_file(file, 50, ["video/mp4", "video/webm"])
            file_path = await save_file(file, "videos")
            media = RoomMedia(room_id=room_id, media_type="video", file_path=file_path)
            db.add(media)
            saved_media.append(media)
    
    db.commit()
    return {"detail": "Media uploaded", "count": len(saved_media)}

@router.patch("/media/{media_id}")
async def update_media(media_id: int, data: dict, db: Session = Depends(require_admin)):
    media = db.query(RoomMedia).filter(RoomMedia.id == media_id).first()
    if not media:
        raise HTTPException(status_code=404, detail="Media not found")
    
    if data.get("is_cover") and media.media_type == "photo":
        old_cover = db.query(RoomMedia).filter(
            RoomMedia.room_id == media.room_id,
            RoomMedia.is_cover == True
        ).first()
        if old_cover:
            old_cover.is_cover = False
        media.is_cover = True
    
    if "sort_order" in data:
        media.sort_order = data["sort_order"]
    
    db.commit()
    db.refresh(media)
    return media

@router.delete("/media/{media_id}")
async def delete_media(media_id: int, db: Session = Depends(require_admin)):
    media = db.query(RoomMedia).filter(RoomMedia.id == media_id).first()
    if not media:
        raise HTTPException(status_code=404, detail="Media not found")
    
    delete_file(media.file_path)
    db.delete(media)
    db.commit()
    return {"detail": "Media deleted"}

@router.get("/facilities", response_model=PaginatedResponse)
async def list_facilities(
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    db: Session = Depends(require_admin)
):
    query = db.query(Facility)
    total = query.count()
    facilities = query.offset((page - 1) * page_size).limit(page_size).all()
    return {"items": facilities, "total": total, "page": page, "page_size": page_size}

@router.post("/facilities", response_model=Facility)
async def create_facility(data: dict, db: Session = Depends(require_admin)):
    facility = Facility(**data)
    db.add(facility)
    db.commit()
    db.refresh(facility)
    return facility

@router.put("/facilities/{facility_id}", response_model=Facility)
async def update_facility(facility_id: int, data: dict, db: Session = Depends(require_admin)):
    facility = db.query(Facility).filter(Facility.id == facility_id).first()
    if not facility:
        raise HTTPException(status_code=404, detail="Facility not found")
    for key, value in data.items():
        if hasattr(facility, key):
            setattr(facility, key, value)
    db.commit()
    db.refresh(facility)
    return facility

@router.delete("/facilities/{facility_id}")
async def delete_facility(facility_id: int, db: Session = Depends(require_admin)):
    facility = db.query(Facility).filter(Facility.id == facility_id).first()
    if not facility:
        raise HTTPException(status_code=404, detail="Facility not found")
    db.delete(facility)
    db.commit()
    return {"detail": "Facility deleted"}

@router.get("/bookings", response_model=PaginatedResponse)
async def list_bookings(
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    status: str = None,
    room_id: int = None,
    q: str = None,
    db: Session = Depends(require_admin)
):
    query = db.query(Booking)
    if status:
        query = query.filter(Booking.status == status)
    if room_id:
        query = query.filter(Booking.room_id == room_id)
    if q:
        query = query.join(Booking.user).filter(
            (Booking.code.ilike(f"%{q}%")) | (User.name.ilike(f"%{q}%"))
        )
    
    total = query.count()
    bookings = query.order_by(Booking.created_at.desc()).offset((page - 1) * page_size).limit(page_size).all()
    return {"items": bookings, "total": total, "page": page, "page_size": page_size}

@router.get("/bookings/{booking_id}")
async def get_booking_admin(booking_id: int, db: Session = Depends(require_admin)):
    booking = db.query(Booking).filter(Booking.id == booking_id).first()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    payments = db.query(Payment).filter(Payment.booking_id == booking_id).all()
    totals = calculate_totals(booking, db)
    return {
        **booking.__dict__,
        "payments": payments,
        "total_paid": totals["total_paid"],
        "remaining_balance": totals["remaining_balance"]
    }

@router.post("/bookings/{booking_id}/approve")
async def approve_booking(booking_id: int, db: Session = Depends(require_admin)):
    booking = db.query(Booking).filter(Booking.id == booking_id).first()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    if booking.status != "pending":
        raise HTTPException(status_code=400, detail="Only pending bookings can be approved")
    
    overlapping = db.query(Booking).filter(
        Booking.room_id == booking.room_id,
        Booking.id != booking_id,
        Booking.status.in_(["approved", "active"]),
        and_(Booking.start_date < booking.end_date, Booking.end_date > booking.start_date)
    ).first()
    if overlapping:
        raise HTTPException(status_code=400, detail="Date range overlaps with existing booking")
    
    booking.status = "approved"
    db.commit()
    sync_room_status(db, booking.room)
    return {"detail": "Booking approved"}

@router.post("/bookings/{booking_id}/reject")
async def reject_booking(booking_id: int, data: dict, db: Session = Depends(require_admin)):
    booking = db.query(Booking).filter(Booking.id == booking_id).first()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    if booking.status != "pending":
        raise HTTPException(status_code=400, detail="Only pending bookings can be rejected")
    
    booking.status = "rejected"
    booking.admin_note = data.get("admin_note")
    db.commit()
    sync_room_status(db, booking.room)
    return {"detail": "Booking rejected"}

@router.post("/bookings/{booking_id}/activate")
async def activate_booking(booking_id: int, db: Session = Depends(require_admin)):
    booking = db.query(Booking).filter(Booking.id == booking_id).first()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    if booking.status != "approved":
        raise HTTPException(status_code=400, detail="Only approved bookings can be activated")
    
    booking.status = "active"
    db.commit()
    sync_room_status(db, booking.room)
    return {"detail": "Booking activated"}

@router.post("/bookings/{booking_id}/finish")
async def finish_booking(booking_id: int, db: Session = Depends(require_admin)):
    booking = db.query(Booking).filter(Booking.id == booking_id).first()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    if booking.status != "active":
        raise HTTPException(status_code=400, detail="Only active bookings can be finished")
    
    booking.status = "finished"
    db.commit()
    sync_room_status(db, booking.room)
    return {"detail": "Booking finished"}

@router.post("/bookings/{booking_id}/cancel")
async def cancel_booking_admin(booking_id: int, db: Session = Depends(require_admin)):
    booking = db.query(Booking).filter(Booking.id == booking_id).first()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    if booking.status in ["rejected", "cancelled", "finished"]:
        raise HTTPException(status_code=400, detail="Cannot cancel final status bookings")
    
    booking.status = "cancelled"
    db.commit()
    sync_room_status(db, booking.room)
    return {"detail": "Booking cancelled"}

@router.get("/payments", response_model=PaginatedResponse)
async def list_payments(
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    status: str = None,
    db: Session = Depends(require_admin)
):
    query = db.query(Payment)
    if status:
        query = query.filter(Payment.status == status)
    
    total = query.count()
    payments = query.order_by(Payment.paid_at.desc()).offset((page - 1) * page_size).limit(page_size).all()
    return {"items": payments, "total": total, "page": page, "page_size": page_size}

@router.post("/payments/{payment_id}/verify")
async def verify_payment(payment_id: int, db: Session = Depends(require_admin)):
    payment = db.query(Payment).filter(Payment.id == payment_id).first()
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")
    if payment.status != "pending":
        raise HTTPException(status_code=400, detail="Only pending payments can be verified")
    
    payment.status = "verified"
    payment.verified_at = datetime.utcnow()
    db.commit()
    
    booking = payment.booking
    totals = calculate_totals(booking, db)
    if totals["total_paid"] >= booking.total_amount and booking.status == "approved":
        booking.status = "active"
        db.commit()
        sync_room_status(db, booking.room)
    
    return {"detail": "Payment verified"}

@router.post("/payments/{payment_id}/reject")
async def reject_payment(payment_id: int, data: dict, db: Session = Depends(require_admin)):
    payment = db.query(Payment).filter(Payment.id == payment_id).first()
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")
    if payment.status != "pending":
        raise HTTPException(status_code=400, detail="Only pending payments can be rejected")
    
    payment.status = "rejected"
    payment.admin_note = data.get("admin_note")
    db.commit()
    
    delete_file(payment.proof_path)
    
    return {"detail": "Payment rejected"}

@router.get("/users", response_model=PaginatedResponse)
async def list_users(
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    db: Session = Depends(require_admin)
):
    query = db.query(User)
    total = query.count()
    users = query.offset((page - 1) * page_size).limit(page_size).all()
    return {"items": users, "total": total, "page": page, "page_size": page_size}

@router.patch("/users/{user_id}")
async def update_user(user_id: int, data: dict, db: Session = Depends(require_admin)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    current_user = require_admin
    if user.role == "admin" and user_id == current_user.id and data.get("is_active") == False:
        raise HTTPException(status_code=400, detail="Cannot deactivate yourself")
    
    if "is_active" in data:
        user.is_active = data["is_active"]
    
    db.commit()
    db.refresh(user)
    return user
