import { useState } from 'react';
import type { FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import api from '../../api';
import ConfirmDialog from '../../components/ConfirmDialog';
import StatusBadge from '../../components/StatusBadge';
import { useToast } from '../../components/Toast';
import type { BookingDetail as BookingDetailData } from '../../types';
import { errorMessage, formatDate, formatDateTime, formatRupiah } from '../../utils';

export default function BookingDetail() {
  const { id } = useParams();
  const toast = useToast();
  const queryClient = useQueryClient();
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [amount, setAmount] = useState('');
  const [proof, setProof] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  const chooseProof = (file: File | null) => {
    if (preview) URL.revokeObjectURL(preview);
    setProof(file);
    setPreview(file ? URL.createObjectURL(file) : null);
  };

  const { data: booking, isLoading } = useQuery({
    queryKey: ['booking', id],
    queryFn: () => api.get<BookingDetailData>(`/api/bookings/${id}`).then((res) => res.data),
  });

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['booking', id] });
    queryClient.invalidateQueries({ queryKey: ['my-bookings'] });
  };

  const cancel = useMutation({
    mutationFn: () => api.post(`/api/bookings/${id}/cancel`),
    onSuccess: () => {
      toast.success('Booking dibatalkan');
      setConfirmCancel(false);
      refresh();
    },
    onError: (error) => toast.error(errorMessage(error)),
  });

  const upload = useMutation({
    mutationFn: () => {
      const body = new FormData();
      body.append('amount', amount);
      body.append('proof', proof as File);
      return api.post(`/api/bookings/${id}/payments`, body);
    },
    onSuccess: () => {
      toast.success('Bukti bayar terkirim, menunggu verifikasi');
      setAmount('');
      chooseProof(null);
      refresh();
    },
    onError: (error) => toast.error(errorMessage(error, 'Gagal mengirim bukti bayar.')),
  });

  const handleUpload = (event: FormEvent) => {
    event.preventDefault();
    if (proof) upload.mutate();
  };

  if (isLoading) {
    return (
      <div className="mx-auto max-w-4xl space-y-4 px-4 py-8">
        <div className="skeleton h-32" />
        <div className="skeleton h-64" />
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="px-4 py-20 text-center">
        <p className="text-stone-700">Booking tidak ditemukan.</p>
        <Link to="/my/bookings" className="btn btn-secondary mt-3">
          Kembali
        </Link>
      </div>
    );
  }

  const kos = booking.kos_profile;
  const canPay = booking.status === 'approved' || booking.status === 'active';
  const canCancel = booking.status === 'pending' || booking.status === 'approved';
  const rows = [
    { label: `Sewa ${booking.duration_months} bulan`, value: booking.monthly_price * booking.duration_months },
    { label: 'Deposit', value: booking.deposit },
    { label: 'Total tagihan', value: booking.total_amount },
    { label: 'Sudah dibayar', value: booking.total_paid },
  ];

  return (
    <div className="mx-auto max-w-4xl space-y-5 px-4 py-8">
      <Link to="/my/bookings" className="text-sm font-medium text-teal-800 underline">
        Kembali ke booking saya
      </Link>

      <section className="card p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-stone-900">{booking.room?.name}</h1>
            <p className="text-sm text-stone-600">Kode {booking.code}</p>
          </div>
          <StatusBadge status={booking.status} />
        </div>
        <p className="mt-3 text-stone-700">
          {formatDate(booking.start_date)} sampai {formatDate(booking.end_date)}
        </p>
        {booking.note && <p className="mt-2 text-sm text-stone-700">Catatan Anda: {booking.note}</p>}
        {booking.admin_note && <p className="mt-2 rounded-lg bg-red-50 p-3 text-sm text-red-800">Catatan pemilik: {booking.admin_note}</p>}
        {canCancel && (
          <button type="button" className="btn btn-secondary mt-4" onClick={() => setConfirmCancel(true)}>
            Batalkan booking
          </button>
        )}
      </section>

      <div className="grid gap-5 md:grid-cols-2">
        <section className="card p-5">
          <h2 className="mb-3 text-lg font-semibold text-stone-900">Rincian tagihan</h2>
          <dl className="space-y-2 text-sm">
            {rows.map((row) => (
              <div key={row.label} className="flex justify-between gap-4">
                <dt className="text-stone-600">{row.label}</dt>
                <dd className="font-medium">{formatRupiah(row.value)}</dd>
              </div>
            ))}
            <div className="flex justify-between gap-4 border-t border-stone-200 pt-2 text-base font-bold text-stone-900">
              <dt>Sisa tagihan</dt>
              <dd>{formatRupiah(booking.remaining_balance)}</dd>
            </div>
          </dl>
        </section>

        <section className="card p-5">
          <h2 className="mb-3 text-lg font-semibold text-stone-900">Rekening pembayaran</h2>
          {kos?.bank_account_number ? (
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-stone-600">Bank</dt>
                <dd className="font-medium">{kos.bank_name}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-stone-600">Nomor rekening</dt>
                <dd className="font-medium">{kos.bank_account_number}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-stone-600">Atas nama</dt>
                <dd className="font-medium">{kos.bank_account_name}</dd>
              </div>
            </dl>
          ) : (
            <p className="text-sm text-stone-600">Info rekening belum tersedia, hubungi pemilik kos.</p>
          )}
        </section>
      </div>

      {canPay && (
        <section className="card p-5">
          <h2 className="mb-3 text-lg font-semibold text-stone-900">Upload bukti bayar</h2>
          <form onSubmit={handleUpload} className="grid gap-4 md:grid-cols-2">
            <div className="space-y-4">
              <div>
                <label className="label" htmlFor="amount">Nominal dibayar (Rp)</label>
                <input id="amount" type="number" min={1} required className="input" value={amount} onChange={(e) => setAmount(e.target.value)} />
              </div>
              <div>
                <label className="label" htmlFor="proof">Foto bukti (jpg, png, webp)</label>
                <input
                  key={proof ? 'selected' : 'empty'}
                  id="proof"
                  type="file"
                  required
                  accept=".jpg,.jpeg,.png,.webp"
                  className="input"
                  onChange={(e) => chooseProof(e.target.files?.[0] ?? null)}
                />
              </div>
              <button type="submit" className="btn btn-primary" disabled={upload.isPending || !proof}>
                {upload.isPending ? 'Mengirim...' : 'Kirim bukti bayar'}
              </button>
            </div>
            {preview && <img src={preview} alt="Pratinjau bukti bayar" className="max-h-64 rounded-lg border border-stone-200 object-contain" />}
          </form>
        </section>
      )}

      <section className="card p-5">
        <h2 className="mb-3 text-lg font-semibold text-stone-900">Riwayat pembayaran</h2>
        {booking.payments.length === 0 ? (
          <p className="text-sm text-stone-600">Belum ada pembayaran.</p>
        ) : (
          <ul className="divide-y divide-stone-100">
            {booking.payments.map((payment) => (
              <li key={payment.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div>
                  <p className="font-semibold text-stone-900">{formatRupiah(payment.amount)}</p>
                  <p className="text-sm text-stone-600">{formatDateTime(payment.paid_at)}</p>
                  {payment.admin_note && <p className="text-sm text-red-800">{payment.admin_note}</p>}
                </div>
                <div className="flex items-center gap-3">
                  <a href={payment.proof_url} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-teal-800 underline">
                    Lihat bukti
                  </a>
                  <StatusBadge status={payment.status} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {confirmCancel && (
        <ConfirmDialog
          title="Batalkan booking"
          message="Booking yang dibatalkan tidak bisa diaktifkan kembali."
          confirmLabel="Batalkan booking"
          danger
          isLoading={cancel.isPending}
          onClose={() => setConfirmCancel(false)}
          onConfirm={() => cancel.mutate()}
        />
      )}
    </div>
  );
}
