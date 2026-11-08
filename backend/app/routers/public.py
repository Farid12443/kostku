from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import KosProfile, Facility, Room, RoomMedia
from ..schemas import KosProfile, Facility, Room
from typing import List, Optional

router = APIRouter(prefix="/api", tags=["public"])

@router.get("/kos", response_model=KosProfile)
async def get_kos(db: Session = Depends(get_db)):
    profile = db.query(KosProfile).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Kos profile not found")
    return profile

@router.get("/facilities", response_model=List[Facility])
async def list_facilities(db: Session = Depends(get_db)):
    return db.query(Facility).all()

@router.get("/rooms", response_model=List[Room])
async def list_rooms(
    room_type: Optional[str] = None,
    status: Optional[str] = None,
    min_price: Optional[int] = None,
    max_price: Optional[int] = None,
    facility_ids: Optional[str] = None,
    q: Optional[str] = None,
    sort: Optional[str] = None,
    db: Session = Depends(get_db)
):
    query = db.query(Room).filter(Room.is_published == True)
    if room_type:
        query = query.filter(Room.room_type == room_type)
    if status:
        query = query.filter(Room.status == status)
    if min_price:
        query = query.filter(Room.price_monthly >= min_price)
    if max_price:
        query = query.filter(Room.price_monthly <= max_price)
    if q:
        query = query.filter(Room.name.ilike(f"%{q}%"))
    if facility_ids:
        ids = [int(i) for i in facility_ids.split(',') if i]
        query = query.join(Room.facilities).filter(Facility.id.in_(ids))
    if sort == "price_asc":
        query = query.order_by(Room.price_monthly.asc())
    elif sort == "price_desc":
        query = query.order_by(Room.price_monthly.desc())
    elif sort == "newest":
        query = query.order_by(Room.created_at.desc())
    return query.all()

@router.get("/rooms/{room_id}", response_model=Room)
async def get_room(room_id: int, db: Session = Depends(get_db)):
    room = db.query(Room).filter(Room.id == room_id, Room.is_published == True).first()
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")
    return room