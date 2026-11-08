import { useState } from 'react';
import type { FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import api from '../../api';
import { useAuth } from '../../auth';
import FacilityIcon from '../../components/FacilityIcon';
import MediaGallery from '../../components/MediaGallery';
import StatusBadge from '../../components/StatusBadge';
import { useToast } from '../../components/Toast';
import type { Booking, Room } from '../../types';
import { ROOM_TYPE_LABELS, errorMessage, formatRupiah, todayIso } from '../../utils';

export default function RoomDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const [startDate, setStartDate] = useState('');
  const [duration, setDuration] = useState(1);
  const [note, setNote] = useState('');

  const { data: room, isLoading } = useQuery({
    queryKey: ['room', id],
    queryFn: () => api.get<Room>(`/api/rooms/${id}`).then((res) => res.data),
  });

  const booking = useMutation({
    mutationFn: () =>
      api
        .post<Booking>('/api/bookings', { room_id: room?.id, start_date: startDate, duration_months: duration, note: note || null })
        .then((res) => res.data),
    onSuccess: (created) => {
      toast.success('Booking berhasil dibuat, menunggu persetujuan pemilik');
      queryClient.invalidateQueries({ queryKey: ['my-bookings'] });
      navigate(`/my/bookings/${created.id}`);
    },
    onError: (error) => toast.error(errorMessage(error, 'Booking gagal.')),
  });

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (!user) {
      navigate('/login', { state: { from: location } });
      return;
    }
    booking.mutate();
  };

  if (isLoading) {
    return (
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-8 lg:grid-cols-3">
        <div className="skeleton aspect-video lg:col-span-2" />
        <div className="skeleton h-80" />
      </div>
    );
  }

  if (!room) {
    return (
      <div className="px-4 py-20 text-center">
        <p className="text-stone-700">Kamar tidak ditemukan.</p>
        <Link to="/rooms" className="btn btn-secondary mt-3">
          Kembali ke daftar kamar
        </Link>
      </div>
    );
  }

  const specs = [
    { label: 'Tipe', value: ROOM_TYPE_LABELS[room.room_type] },
    { label: 'Lantai', value: String(room.floor) },
    { label: 'Luas', value: room.size_m2 != null ? `${room.size_m2} m²` : 'Tidak dicantumkan' },
    { label: 'Deposit', value: formatRupiah(room.deposit) },
  ];
  const inMaintenance = room.status === 'maintenance';
  const total = room.price_monthly * duration + room.deposit;

  return (
    <div className="mx-auto grid max-w-6xl gap-8 px-4 py-8 lg:grid-cols-3">
      <div className="min-w-0 space-y-6 lg:col-span-2">
        <MediaGallery media={room.media} roomName={room.name} />

        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-3xl font-bold text-stone-900">{room.name}</h1>
            <StatusBadge status={room.status} />
          </div>
          {room.description && <p className="mt-2 max-w-prose text-stone-700">{room.description}</p>}
        </div>

        <dl className="grid grid-cols-2 gap-4 border-y border-stone-200 py-4 md:grid-cols-4">
          {specs.map((spec) => (
            <div key={spec.label}>
              <dt className="text-sm text-stone-600">{spec.label}</dt>
              <dd className="font-semibold text-stone-900">{spec.value}</dd>
            </div>
          ))}
        </dl>

        <div>
          <h2 className="mb-3 text-xl font-semibold text-stone-900">Fasilitas kamar</h2>
          {room.facilities.length > 0 ? (
            <ul className="grid gap-3 sm:grid-cols-2">
              {room.facilities.map((facility) => (
                <li key={facility.id} className="flex items-center gap-3 text-stone-800">
                  <FacilityIcon name={facility.icon} className="h-5 w-5 text-teal-700" />
                  {facility.name}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-stone-600">Fasilitas belum dicantumkan.</p>
          )}
        </div>
      </div>

      <aside>
        <form onSubmit={handleSubmit} className="card space-y-4 p-5 lg:sticky lg:top-24">
          <p className="text-2xl font-bold text-teal-800">
            {formatRupiah(room.price_monthly)}
            <span className="text-sm font-normal text-stone-600"> per bulan</span>
          </p>

          <div>
            <label className="label" htmlFor="start_date">Tanggal mulai</label>
            <input id="start_date" type="date" required min={todayIso()} className="input" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </div>
          <div>
            <label className="label" htmlFor="duration">Durasi</label>
            <select id="duration" className="input" value={duration} onChange={(e) => setDuration(Number(e.target.value))}>
              {Array.from({ length: 24 }, (_, index) => index + 1).map((month) => (
                <option key={month} value={month}>{month} bulan</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="note">Catatan (opsional)</label>
            <textarea id="note" rows={2} className="input" value={note} onChange={(e) => setNote(e.target.value)} />
          </div>

          <dl className="space-y-1.5 border-t border-stone-200 pt-3 text-sm">
            <div className="flex justify-between">
              <dt className="text-stone-600">Sewa {duration} bulan</dt>
              <dd className="font-medium">{formatRupiah(room.price_monthly * duration)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-stone-600">Deposit</dt>
              <dd className="font-medium">{formatRupiah(room.deposit)}</dd>
            </div>
            <div className="flex justify-between text-base font-bold text-stone-900">
              <dt>Total</dt>
              <dd>{formatRupiah(total)}</dd>
            </div>
          </dl>

          {inMaintenance && <p className="text-sm text-stone-700">Kamar sedang dalam perbaikan dan belum bisa disewa.</p>}
          {room.status === 'occupied' && <p className="text-sm text-stone-700">Kamar sedang terisi. Anda tetap bisa mengajukan sewa untuk tanggal setelah masa sewa berakhir.</p>}
          {user?.role === 'admin' && <p className="text-sm text-stone-700">Akun admin tidak dapat membuat booking.</p>}

          <button type="submit" className="btn btn-primary w-full" disabled={inMaintenance || user?.role === 'admin' || booking.isPending}>
            {booking.isPending ? 'Memproses...' : 'Sewa Sekarang'}
          </button>
        </form>
      </aside>
    </div>
  );
}
