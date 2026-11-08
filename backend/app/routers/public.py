from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from .. import models, schemas
from ..database import get_db

router = APIRouter(prefix="/api", tags=["public"])


@router.get("/kos", response_model=schemas.KosProfile)
def get_kos(db: Session = Depends(get_db)):
    profile = db.query(models.KosProfile).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Profil kos belum tersedia")
    return profile


@router.get("/facilities", response_model=List[schemas.Facility])
def list_facilities(db: Session = Depends(get_db)):
    return db.query(models.Facility).order_by(models.Facility.id).all()


@router.get("/rooms", response_model=List[schemas.Room])
def list_rooms(
    room_type: Optional[str] = None,
    status: Optional[str] = None,
    min_price: Optional[int] = None,
    max_price: Optional[int] = None,
    facility_ids: Optional[str] = None,
    q: Optional[str] = None,
    sort: Optional[str] = None,
    db: Session = Depends(get_db),
):
    Room = models.Room
    query = db.query(Room).filter(Room.is_published.is_(True))
    if room_type:
        query = query.filter(Room.room_type == room_type)
    if status:
        query = query.filter(Room.status == status)
    if min_price is not None:
        query = query.filter(Room.price_monthly >= min_price)
    if max_price is not None:
        query = query.filter(Room.price_monthly <= max_price)
    if q:
        query = query.filter(Room.name.icontains(q, autoescape=True))
    if facility_ids:
        try:
            ids = [int(value) for value in facility_ids.split(",") if value.strip()]
        except ValueError:
            raise HTTPException(status_code=400, detail="facility_ids harus berupa angka dipisah koma")
        # Kamar harus memiliki semua fasilitas yang dipilih
        for facility_id in ids:
            query = query.filter(Room.facilities.any(models.Facility.id == facility_id))

    order = {
        "price_asc": Room.price_monthly.asc(),
        "price_desc": Room.price_monthly.desc(),
        "newest": Room.created_at.desc(),
    }.get(sort or "", Room.id.asc())
    return query.order_by(order, Room.id.asc()).all()


@router.get("/rooms/{room_id}", response_model=schemas.Room)
def get_room(room_id: int, db: Session = Depends(get_db)):
    room = db.query(models.Room).filter(models.Room.id == room_id, models.Room.is_published.is_(True)).first()
    if not room:
        raise HTTPException(status_code=404, detail="Kamar tidak ditemukan")
    return room
