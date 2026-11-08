from datetime import date, datetime, timezone
from typing import Annotated, Generic, List, Literal, Optional, TypeVar

from pydantic import BaseModel, ConfigDict, EmailStr, Field, PlainSerializer, computed_field, field_validator

T = TypeVar("T")

RoomType = Literal["putra", "putri", "campur"]
RoomStatus = Literal["available", "occupied", "maintenance"]

# Kolom menyimpan UTC tanpa tzinfo. Tandai UTC agar browser mengonversi ke waktu lokal dengan benar.
UtcDatetime = Annotated[
    datetime,
    PlainSerializer(lambda v: v.replace(tzinfo=timezone.utc).isoformat(), return_type=str),
]


class ORMModel(BaseModel):
    model_config = ConfigDict(from_attributes=True)


class UserRegister(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    email: EmailStr
    phone: Optional[str] = Field(default=None, max_length=30)
    password: str = Field(min_length=8)

    @field_validator("password")
    @classmethod
    def password_fits_bcrypt(cls, value: str) -> str:
        if len(value.encode("utf-8")) > 72:
            raise ValueError("Password maksimal 72 byte")
        return value


class UserLogin(BaseModel):
    # Sengaja str: EmailStr menolak domain khusus seperti akun seed @kos.local.
    email: str
    password: str


class UserUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=1, max_length=100)
    phone: Optional[str] = Field(default=None, max_length=30)


class UserAdminUpdate(BaseModel):
    is_active: bool


class User(ORMModel):
    id: int
    name: str
    email: str
    phone: Optional[str] = None
    role: str
    is_active: bool
    created_at: UtcDatetime


class Token(BaseModel):
    access_token: str
    token_type: str
    user: User


class KosProfileUpdate(BaseModel):
    name: str = Field(min_length=1, max_length=150)
    tagline: Optional[str] = Field(default=None, max_length=200)
    description: Optional[str] = None
    address: str = Field(min_length=1)
    city: str = Field(min_length=1, max_length=100)
    maps_url: Optional[str] = None
    whatsapp: Optional[str] = Field(default=None, max_length=30)
    email: Optional[str] = None
    rules: Optional[str] = None
    bank_name: Optional[str] = None
    bank_account_number: Optional[str] = None
    bank_account_name: Optional[str] = None


class KosProfile(ORMModel, KosProfileUpdate):
    id: int
    updated_at: UtcDatetime


class FacilityCreate(BaseModel):
    name: str = Field(min_length=1, max_length=80)
    icon: Optional[str] = Field(default=None, max_length=50)


class Facility(ORMModel, FacilityCreate):
    id: int


class MediaUpdate(BaseModel):
    is_cover: Optional[bool] = None
    sort_order: Optional[int] = None


class RoomMedia(ORMModel):
    id: int
    room_id: int
    media_type: str
    file_path: str
    is_cover: bool
    sort_order: int
    created_at: UtcDatetime

    @computed_field
    @property
    def url(self) -> str:
        return f"/uploads/{self.file_path}"


class RoomBase(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    floor: int = 1
    room_type: RoomType
    size_m2: Optional[float] = Field(default=None, gt=0)
    price_monthly: int = Field(ge=0)
    deposit: int = Field(default=0, ge=0)
    status: RoomStatus = "available"
    description: Optional[str] = None
    is_published: bool = True


class RoomCreate(RoomBase):
    facility_ids: List[int] = []


class RoomUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=1, max_length=100)
    floor: Optional[int] = None
    room_type: Optional[RoomType] = None
    size_m2: Optional[float] = Field(default=None, gt=0)
    price_monthly: Optional[int] = Field(default=None, ge=0)
    deposit: Optional[int] = Field(default=None, ge=0)
    status: Optional[RoomStatus] = None
    description: Optional[str] = None
    is_published: Optional[bool] = None
    facility_ids: Optional[List[int]] = None


class Room(ORMModel, RoomBase):
    id: int
    created_at: UtcDatetime
    updated_at: UtcDatetime
    facilities: List[Facility] = []
    media: List[RoomMedia] = []

    @computed_field
    @property
    def cover_url(self) -> Optional[str]:
        cover = next((m for m in self.media if m.is_cover), None)
        return cover.url if cover else None


class BookingCreate(BaseModel):
    room_id: int
    start_date: date
    duration_months: int = Field(ge=1, le=24)
    note: Optional[str] = None


class AdminNote(BaseModel):
    admin_note: str = Field(min_length=1)


class Booking(ORMModel):
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
    created_at: UtcDatetime
    updated_at: UtcDatetime
    user: Optional[User] = None
    room: Optional[Room] = None


class Payment(ORMModel):
    id: int
    booking_id: int
    amount: int
    proof_path: str
    status: str
    admin_note: Optional[str] = None
    paid_at: UtcDatetime
    verified_at: Optional[UtcDatetime] = None

    @computed_field
    @property
    def proof_url(self) -> str:
        return f"/uploads/{self.proof_path}"


class PaymentAdmin(Payment):
    booking: Booking


class BookingDetail(Booking):
    payments: List[Payment] = []
    total_paid: int = 0
    remaining_balance: int = 0
    kos_profile: Optional[KosProfile] = None


class RoomStats(BaseModel):
    total: int
    available: int
    occupied: int
    maintenance: int


class RevenueMonth(BaseModel):
    month: str
    total: int


class DashboardStats(BaseModel):
    rooms: RoomStats
    pending_bookings: int
    pending_payments: int
    active_tenants: int
    revenue_this_month: int
    revenue_by_month: List[RevenueMonth]
    bookings_by_status: dict[str, int]
    recent_bookings: List[Booking]


class Page(BaseModel, Generic[T]):
    items: List[T]
    total: int
    page: int
    page_size: int
