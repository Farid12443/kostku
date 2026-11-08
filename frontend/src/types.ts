export interface User {
  id: number;
  name: str;
  email: str;
  phone?: str;
  role: 'admin' | 'user';
  is_active: boolean;
  created_at: str;
}

export interface KosProfile {
  id: number;
  name: str;
  tagline?: str;
  description?: str;
  address: str;
  city: str;
  maps_url?: str;
  whatsapp?: str;
  email?: str;
  rules?: str;
  bank_name?: str;
  bank_account_number?: str;
  bank_account_name?: str;
  updated_at: str;
}

export interface Facility {
  id: number;
  name: str;
  icon?: str;
}

export interface RoomMedia {
  id: number;
  room_id: number;
  media_type: 'photo' | 'video';
  file_path: str;
  is_cover: boolean;
  sort_order: number;
  created_at: str;
}

export interface Room {
  id: number;
  name: str;
  floor: number;
  room_type: 'putra' | 'putri' | 'campur';
  size_m2?: number;
  price_monthly: number;
  deposit: number;
  status: 'available' | 'occupied' | 'maintenance';
  description?: str;
  is_published: boolean;
  created_at: str;
  updated_at: str;
  facilities: Facility[];
  media: RoomMedia[];
}

export interface Booking {
  id: number;
  code: str;
  user_id: number;
  room_id: number;
  start_date: str;
  duration_months: number;
  end_date: str;
  monthly_price: number;
  deposit: number;
  total_amount: number;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled' | 'active' | 'finished';
  note?: str;
  admin_note?: str;
  created_at: str;
  updated_at: str;
  user?: User;
  room?: Room;
}

export interface Payment {
  id: number;
  booking_id: number;
  amount: number;
  proof_path: str;
  status: 'pending' | 'verified' | 'rejected';
  admin_note?: str;
  paid_at: str;
  verified_at?: str;
}

export interface BookingDetail extends Booking {
  payments: Payment[];
  total_paid: number;
  remaining_balance: number;
  kos_profile?: KosProfile;
}

export interface DashboardStats {
  rooms: {
    total: number;
    available: number;
    occupied: number;
    maintenance: number;
  };
  pending_bookings: number;
  pending_payments: number;
  active_tenants: number;
  revenue_this_month: number;
  revenue_by_month: { month: str; total: number }[];
  bookings_by_status: Record<str, number>;
  recent_bookings: Booking[];
}
