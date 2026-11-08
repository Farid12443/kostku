import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import api from '../../api';
import StatusBadge from '../../components/StatusBadge';
import type { Booking } from '../../types';
import { formatDate, formatRupiah } from '../../utils';

export default function MyBookings() {
  const { data: bookings, isLoading, isError } = useQuery({
    queryKey: ['my-bookings'],
    queryFn: () => api.get<Booking[]>('/api/bookings/me').then((res) => res.data),
  });

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="mb-5 text-3xl font-bold text-stone-900">Booking saya</h1>

      {isLoading && (
        <div className="space-y-3">
          {[1, 2, 3].map((item) => <div key={item} className="skeleton h-24" />)}
        </div>
      )}
      {isError && <p className="text-red-800">Gagal memuat booking.</p>}
      {bookings?.length === 0 && (
        <div className="card p-10 text-center">
          <p className="text-stone-600">Anda belum punya booking.</p>
          <Link to="/rooms" className="btn btn-primary mt-3">
            Cari kamar
          </Link>
        </div>
      )}

      <div className="space-y-3">
        {bookings?.map((booking) => (
          <Link key={booking.id} to={`/my/bookings/${booking.id}`} className="card block p-4 transition-shadow hover:shadow-md">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <h2 className="text-lg font-semibold text-stone-900">{booking.room?.name}</h2>
                <p className="text-sm text-stone-600">Kode {booking.code}</p>
              </div>
              <StatusBadge status={booking.status} />
            </div>
            <div className="mt-2 flex flex-wrap justify-between gap-x-4 text-sm text-stone-700">
              <span>
                {formatDate(booking.start_date)} sampai {formatDate(booking.end_date)}
              </span>
              <span className="font-semibold">{formatRupiah(booking.total_amount)}</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
