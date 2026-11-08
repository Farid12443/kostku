import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import api from '../../api';
import BookingActions from '../../components/BookingActions';
import DataTable from '../../components/DataTable';
import type { Column } from '../../components/DataTable';
import StatusBadge from '../../components/StatusBadge';
import type { Booking, DashboardStats } from '../../types';
import { formatDate, formatRupiah } from '../../utils';

// Lolos validasi palet (kontras dan buta warna) terhadap permukaan putih
const ROOM_COLORS = { available: '#0d9488', occupied: '#d97706', maintenance: '#7c3aed' };
const compactNumber = new Intl.NumberFormat('id-ID', { notation: 'compact' });
const monthName = new Intl.DateTimeFormat('id-ID', { month: 'short', timeZone: 'UTC' });

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="card p-4">
      <p className="text-sm text-stone-600">{label}</p>
      <p className="mt-1 text-2xl font-bold text-stone-900">{value}</p>
    </div>
  );
}

export default function Dashboard() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['admin-dashboard'],
    queryFn: () => api.get<DashboardStats>('/api/admin/dashboard').then((res) => res.data),
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[1, 2, 3, 4].map((item) => <div key={item} className="skeleton h-24" />)}
        </div>
        <div className="skeleton h-72" />
      </div>
    );
  }
  if (isError || !data) return <p className="text-red-800">Gagal memuat dashboard.</p>;

  const revenue = data.revenue_by_month.map((item) => ({
    ...item,
    label: monthName.format(new Date(`${item.month}-01`)),
  }));
  const roomStatus = [
    { key: 'available', name: 'Tersedia', value: data.rooms.available, color: ROOM_COLORS.available },
    { key: 'occupied', name: 'Terisi', value: data.rooms.occupied, color: ROOM_COLORS.occupied },
    { key: 'maintenance', name: 'Perbaikan', value: data.rooms.maintenance, color: ROOM_COLORS.maintenance },
  ];

  const columns: Column<Booking>[] = [
    { header: 'Kode', render: (booking) => <span className="font-medium text-stone-900">{booking.code}</span> },
    { header: 'Penyewa', render: (booking) => booking.user?.name },
    { header: 'Kamar', render: (booking) => booking.room?.name },
    { header: 'Mulai', render: (booking) => formatDate(booking.start_date) },
    { header: 'Status', render: (booking) => <StatusBadge status={booking.status} /> },
    { header: 'Aksi cepat', render: (booking) => <BookingActions booking={booking} /> },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-stone-900">Dashboard</h1>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Pendapatan bulan ini" value={formatRupiah(data.revenue_this_month)} />
        <Stat label="Penyewa aktif" value={data.active_tenants} />
        <Stat label="Booking menunggu" value={data.pending_bookings} />
        <Stat label="Pembayaran menunggu" value={data.pending_payments} />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <section className="card p-4 lg:col-span-2">
          <h2 className="mb-3 font-semibold text-stone-900">Pendapatan 6 bulan terakhir</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={revenue} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
                <CartesianGrid vertical={false} stroke="#e7e5e4" />
                <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fill: '#57534e', fontSize: 12 }} />
                <YAxis
                  width={48}
                  tickLine={false}
                  axisLine={false}
                  allowDecimals={false}
                  tick={{ fill: '#57534e', fontSize: 12 }}
                  tickFormatter={(value) => compactNumber.format(Number(value))}
                />
                <Tooltip cursor={{ fill: '#f5f5f4' }} formatter={(value) => [formatRupiah(Number(value)), 'Pendapatan']} />
                <Bar dataKey="total" fill={ROOM_COLORS.available} radius={[4, 4, 0, 0]} maxBarSize={40} isAnimationActive={false} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="card p-4">
          <h2 className="mb-3 font-semibold text-stone-900">Status kamar</h2>
          <div className="relative h-44">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={roomStatus} dataKey="value" nameKey="name" innerRadius={52} outerRadius={78} stroke="#ffffff" strokeWidth={2} isAnimationActive={false}>
                  {roomStatus.map((item) => <Cell key={item.key} fill={item.color} />)}
                </Pie>
                <Tooltip formatter={(value, name) => [`${value} kamar`, name]} />
              </PieChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-2xl font-bold text-stone-900">{data.rooms.total}</span>
              <span className="text-xs text-stone-600">kamar</span>
            </div>
          </div>
          <ul className="mt-3 space-y-1.5 text-sm">
            {roomStatus.map((item) => (
              <li key={item.key} className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-stone-700">
                  <span className="h-3 w-3 rounded-sm" style={{ backgroundColor: item.color }} aria-hidden />
                  {item.name}
                </span>
                <span className="font-semibold text-stone-900">{item.value}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <section className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-semibold text-stone-900">Booking terbaru</h2>
          <Link to="/admin/bookings" className="text-sm font-medium text-teal-800 underline">
            Semua booking
          </Link>
        </div>
        <DataTable columns={columns} rows={data.recent_bookings} rowKey={(booking) => booking.id} emptyText="Belum ada booking." />
      </section>
    </div>
  );
}
