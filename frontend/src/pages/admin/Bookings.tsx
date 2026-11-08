import { useDeferredValue, useState } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import api from '../../api';
import BookingActions from '../../components/BookingActions';
import DataTable from '../../components/DataTable';
import type { Column } from '../../components/DataTable';
import Modal from '../../components/Modal';
import StatusBadge from '../../components/StatusBadge';
import type { Booking, BookingDetail, Page } from '../../types';
import { formatDate, formatDateTime, formatRupiah } from '../../utils';

const PAGE_SIZE = 10;

function BookingModal({ bookingId, onClose }: { bookingId: number; onClose: () => void }) {
  const { data: booking, isLoading } = useQuery({
    queryKey: ['admin-booking', bookingId],
    queryFn: () => api.get<BookingDetail>(`/api/admin/bookings/${bookingId}`).then((res) => res.data),
  });

  const rows: [string, string][] = booking
    ? [
        ['Penyewa', `${booking.user?.name ?? ''} (${booking.user?.email ?? ''})`],
        ['No. HP', booking.user?.phone || 'Tidak ada'],
        ['Kamar', booking.room?.name ?? ''],
        ['Periode', `${formatDate(booking.start_date)} sampai ${formatDate(booking.end_date)}`],
        ['Total tagihan', formatRupiah(booking.total_amount)],
        ['Sudah dibayar', formatRupiah(booking.total_paid)],
        ['Sisa tagihan', formatRupiah(booking.remaining_balance)],
      ]
    : [];

  return (
    <Modal title={booking ? `Booking ${booking.code}` : 'Detail booking'} onClose={onClose} wide>
      {isLoading && <div className="skeleton h-48" />}
      {booking && (
        <div className="space-y-4">
          <StatusBadge status={booking.status} />
          <dl className="space-y-2 text-sm">
            {rows.map(([label, value]) => (
              <div key={label} className="flex justify-between gap-4">
                <dt className="text-stone-600">{label}</dt>
                <dd className="text-right font-medium text-stone-900">{value}</dd>
              </div>
            ))}
          </dl>
          {booking.note && <p className="text-sm text-stone-700">Catatan penyewa: {booking.note}</p>}
          {booking.admin_note && <p className="text-sm text-stone-700">Catatan admin: {booking.admin_note}</p>}
          {booking.payments.length > 0 && (
            <div>
              <h3 className="mb-1 font-semibold text-stone-900">Pembayaran</h3>
              <ul className="divide-y divide-stone-100 text-sm">
                {booking.payments.map((payment) => (
                  <li key={payment.id} className="flex items-center justify-between gap-3 py-2">
                    <span>
                      {formatRupiah(payment.amount)}
                      <span className="block text-stone-600">{formatDateTime(payment.paid_at)}</span>
                    </span>
                    <StatusBadge status={payment.status} />
                  </li>
                ))}
              </ul>
            </div>
          )}
          <BookingActions booking={booking} />
        </div>
      )}
    </Modal>
  );
}

export default function AdminBookings() {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [detailId, setDetailId] = useState<number | null>(null);
  const q = useDeferredValue(search);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-bookings', q, status, page],
    queryFn: () =>
      api
        .get<Page<Booking>>('/api/admin/bookings', { params: { q: q || undefined, status: status || undefined, page, page_size: PAGE_SIZE } })
        .then((res) => res.data),
    placeholderData: keepPreviousData,
  });

  const columns: Column<Booking>[] = [
    {
      header: 'Kode',
      render: (booking) => (
        <button type="button" className="font-medium text-teal-800 underline" onClick={() => setDetailId(booking.id)}>
          {booking.code}
        </button>
      ),
    },
    { header: 'Penyewa', render: (booking) => booking.user?.name },
    { header: 'Kamar', render: (booking) => booking.room?.name },
    { header: 'Mulai', render: (booking) => formatDate(booking.start_date) },
    { header: 'Total', render: (booking) => formatRupiah(booking.total_amount) },
    { header: 'Status', render: (booking) => <StatusBadge status={booking.status} /> },
    { header: 'Aksi', render: (booking) => <BookingActions booking={booking} /> },
  ];

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-stone-900">Booking</h1>

      <div className="flex flex-col gap-3 sm:flex-row">
        <input
          className="input sm:max-w-xs"
          placeholder="Cari kode atau nama penyewa"
          aria-label="Cari kode atau nama penyewa"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
        />
        <select
          className="input sm:max-w-48"
          aria-label="Filter status"
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(1);
          }}
        >
          <option value="">Semua status</option>
          <option value="pending">Menunggu</option>
          <option value="approved">Disetujui</option>
          <option value="active">Aktif</option>
          <option value="finished">Selesai</option>
          <option value="rejected">Ditolak</option>
          <option value="cancelled">Dibatalkan</option>
        </select>
      </div>

      <DataTable
        columns={columns}
        rows={data?.items}
        rowKey={(booking) => booking.id}
        isLoading={isLoading}
        emptyText="Tidak ada booking."
        page={page}
        pageSize={PAGE_SIZE}
        total={data?.total}
        onPageChange={setPage}
      />

      {detailId !== null && <BookingModal bookingId={detailId} onClose={() => setDetailId(null)} />}
    </div>
  );
}
