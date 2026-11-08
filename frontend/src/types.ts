export interface User {
  id: number;
  name: string;
  email: string;
  phone?: string | null;
  role: 'admin' | 'user';
  is_active: boolean;
  created_at: string;
}

export interface KosProfile {
  id: number;
  name: string;
  tagline?: string | null;
  description?: string | null;
  address: string;
  city: string;
  maps_url?: string | null;
  whatsapp?: string | null;
  email?: string | null;
  rules?: string | null;
  bank_name?: string | null;
  bank_account_number?: string | null;
  bank_account_name?: string | null;
  updated_at: string;
}

export interface Facility {
  id: number;
  name: string;
  icon?: string | null;
}

export interface RoomMedia {
  id: number;
  room_id: number;
  media_type: 'photo' | 'video';
  file_path: string;
  url: string;
  is_cover: boolean;
  sort_order: number;
  created_at: string;
}

export type RoomStatus = 'available' | 'occupied' | 'maintenance';
export type RoomType = 'putra' | 'putri' | 'campur';

export interface Room {
  id: number;
  name: string;
  floor: number;
  room_type: RoomType;
  size_m2?: number | null;
  price_monthly: number;
  deposit: number;
  status: RoomStatus;
  description?: string | null;
  is_published: boolean;
  created_at: string;
  updated_at: string;
  facilities: Facility[];
  media: RoomMedia[];
  cover_url?: string | null;
}

export type BookingStatus = 'pending' | 'approved' | 'rejected' | 'cancelled' | 'active' | 'finished';

export interface Booking {
  id: number;
  code: string;
  user_id: number;
  room_id: number;
  start_date: string;
  duration_months: number;
  end_date: string;
  monthly_price: number;
  deposit: number;
  total_amount: number;
  status: BookingStatus;
  note?: string | null;
  admin_note?: string | null;
  created_at: string;
  updated_at: string;
  user?: User | null;
  room?: Room | null;
}

export interface Payment {
  id: number;
  booking_id: number;
  amount: number;
  proof_path: string;
  proof_url: string;
  status: 'pending' | 'verified' | 'rejected';
  admin_note?: string | null;
  paid_at: string;
  verified_at?: string | null;
}

export interface PaymentAdmin extends Payment {
  booking: Booking;
}

export interface BookingDetail extends Booking {
  payments: Payment[];
  total_paid: number;
  remaining_balance: number;
  kos_profile?: KosProfile | null;
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
  revenue_by_month: { month: string; total: number }[];
  bookings_by_status: Record<string, number>;
  recent_bookings: Booking[];
}

export interface Page<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
}
