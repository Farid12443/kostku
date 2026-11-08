from datetime import datetime, date
from typing import List, Optional, Any
from pydantic import BaseModel, ConfigDict, EmailStr, Field

class UserBase(BaseModel):
    name: str
    email: EmailStr
    phone: Optional[str] = None

class UserRegister(UserBase):
    password: str = Field(..., min_length=8)

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None

class User(UserBase):
    id: int
    role: str
    is_active: bool
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

class Token(BaseModel):
    access_token: str
    token_type: str
    user: User

class KosProfileBase(BaseModel):
    name: str
    tagline: Optional[str] = None
    description: Optional[str] = None
    address: str
    city: str
    maps_url: Optional[str] = None
    whatsapp: Optional[str] = None
    email: Optional[str] = None
    rules: Optional[str] = None
    bank_name: Optional[str] = None
    bank_account_number: Optional[str] = None
    bank_account_name: Optional[str] = None

class KosProfile(KosProfileBase):
    id: int
    updated_at: datetime
    model_config = ConfigDict(from_attributes=True)

class FacilityBase(BaseModel):
    name: str
    icon: Optional[str] = None

class Facility(FacilityBase):
    id: int
    model_config = ConfigDict(from_attributes=True)

class RoomMediaBase(BaseModel):
    media_type: str
    file_path: str
    is_cover: bool = False
    sort_order: int = 0

class RoomMedia(RoomMediaBase):
    id: int
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

class RoomBase(BaseModel):
    name: str
    floor: int = 1
    room_type: str
    size_m2: Optional[float] = None
    price_monthly: int
    deposit: int = 0
    status: str = "available"
    description: Optional[str] = None
    is_published: bool = True

class RoomCreate(RoomBase):
    facility_ids: List[int] = []

class RoomUpdate(BaseModel):
    name: Optional[str] = None
    floor: Optional[int] = None
    room_type: Optional[str] = None
    size_m2: Optional[float] = None
    price_monthly: Optional[int] = None
    deposit: Optional[int] = None
    status: Optional[str] = None
    description: Optional[str] = None
    is_published: Optional[bool] = None
    facility_ids: Optional[List[int]] = None

class Room(RoomBase):
    id: int
    created_at: datetime
    updated_at: datetime
    facilities: List[Facility] = []
    media: List[RoomMedia] = []
    model_config = ConfigDict(from_attributes=True)

class BookingBase(BaseModel):
    room_id: int
    start_date: date
    duration_months: int = Field(..., ge=1, le=24)
    note: Optional[str] = None

class Booking(BaseModel):
    id: int
    code: str
    user_id: int
    room_id: int
    start_date: date
    duration_months: int
    end_date: date
    monthly_price: int
    deposit: int
    total_amount: int
    status: str
    note: Optional[str] = None
    admin_note: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    user: Optional[User] = None
    room: Optional[Room] = None
    model_config = ConfigDict(from_attributes=True)

class BookingDetail(Booking):
    payments: List["Payment"] = []
    total_paid: int = 0
    remaining_balance: int = 0
    kos_profile: Optional[KosProfile] = None

class PaymentBase(BaseModel):
    amount: int

class Payment(PaymentBase):
    id: int
    booking_id: int
    proof_path: str
    status: str
    admin_note: Optional[str] = None
    paid_at: datetime
    verified_at: Optional[datetime] = None
    model_config = ConfigDict(from_attributes=True)

class DashboardStats(BaseModel):
    rooms: dict
    pending_bookings: int
    pending_payments: int
    active_tenants: int
    revenue_this_month: int
    revenue_by_month: List[dict]
    bookings_by_status: dict
    recent_bookings: List[Booking]

class PaginatedResponse(BaseModel):
    items: List[Any]
    total: int
    page: int
    page_size: int
