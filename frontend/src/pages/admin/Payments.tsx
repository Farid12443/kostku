import { useState } from 'react';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../../api';
import DataTable from '../../components/DataTable';
import type { Column } from '../../components/DataTable';
import Modal from '../../components/Modal';
import ReasonDialog from '../../components/ReasonDialog';
import StatusBadge from '../../components/StatusBadge';
import { useToast } from '../../components/Toast';
import type { Page, PaymentAdmin } from '../../types';
import { errorMessage, formatDateTime, formatRupiah } from '../../utils';

const PAGE_SIZE = 10;

export default function Payments() {
  const toast = useToast();
  const queryClient = useQueryClient();
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [viewing, setViewing] = useState<PaymentAdmin | null>(null);
  const [rejecting, setRejecting] = useState<PaymentAdmin | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-payments', status, page],
    queryFn: () =>
      api
        .get<Page<PaymentAdmin>>('/api/admin/payments', { params: { status: status || undefined, page, page_size: PAGE_SIZE } })
        .then((res) => res.data),
    placeholderData: keepPreviousData,
  });

  const refresh = () => {
    for (const key of ['admin-payments', 'admin-dashboard', 'admin-bookings', 'admin-booking', 'admin-rooms']) {
      queryClient.invalidateQueries({ queryKey: [key] });
    }
  };

  const verify = useMutation({
    mutationFn: (payment: PaymentAdmin) => api.post(`/api/admin/payments/${payment.id}/verify`),
    onSuccess: () => {
      toast.success('Pembayaran diverifikasi');
      refresh();
    },
    onError: (error) => toast.error(errorMessage(error)),
  });

  const reject = useMutation({
    mutationFn: ({ payment, admin_note }: { payment: PaymentAdmin; admin_note: string }) =>
      api.post(`/api/admin/payments/${payment.id}/reject`, { admin_note }),
    onSuccess: () => {
      toast.success('Pembayaran ditolak');
      setRejecting(null);
      refresh();
    },
    onError: (error) => toast.error(errorMessage(error)),
  });

  const columns: Column<PaymentAdmin>[] = [
    { header: 'Booking', render: (payment) => <span className="font-medium text-stone-900">{payment.booking.code}</span> },
    { header: 'Penyewa', render: (payment) => payment.booking.user?.name },
    { header: 'Nominal', render: (payment) => formatRupiah(payment.amount) },
    { header: 'Waktu', render: (payment) => formatDateTime(payment.paid_at) },
    { header: 'Status', render: (payment) => <StatusBadge status={payment.status} /> },
    {
      header: 'Aksi',
      render: (payment) => (
        <div className="flex flex-wrap gap-1.5">
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => setViewing(payment)}>
            Lihat bukti
          </button>
          {payment.status === 'pending' && (
            <>
              <button type="button" className="btn btn-primary btn-sm" disabled={verify.isPending} onClick={() => verify.mutate(payment)}>
                Verify
              </button>
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => setRejecting(payment)}>
                Reject
              </button>
            </>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-stone-900">Pembayaran</h1>

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
        <option value="verified">Terverifikasi</option>
        <option value="rejected">Ditolak</option>
      </select>

      <DataTable
        columns={columns}
        rows={data?.items}
        rowKey={(payment) => payment.id}
        isLoading={isLoading}
        emptyText="Tidak ada pembayaran."
        page={page}
        pageSize={PAGE_SIZE}
        total={data?.total}
        onPageChange={setPage}
      />

      {viewing && (
        <Modal title={`Bukti bayar ${viewing.booking.code}`} onClose={() => setViewing(null)} wide>
          <img src={viewing.proof_url} alt="Bukti pembayaran" className="mx-auto max-h-[70vh] rounded-lg object-contain" />
          {viewing.admin_note && <p className="mt-3 text-sm text-stone-700">Catatan: {viewing.admin_note}</p>}
        </Modal>
      )}
      {rejecting && (
        <ReasonDialog
          title="Tolak pembayaran"
          isLoading={reject.isPending}
          onClose={() => setRejecting(null)}
          onSubmit={(reason) => reject.mutate({ payment: rejecting, admin_note: reason })}
        />
      )}
    </div>
  );
}
