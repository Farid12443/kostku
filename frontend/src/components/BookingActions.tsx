import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../api';
import type { Booking } from '../types';
import { errorMessage } from '../utils';
import ConfirmDialog from './ConfirmDialog';
import ReasonDialog from './ReasonDialog';
import { useToast } from './Toast';

type Action = 'approve' | 'reject' | 'activate' | 'finish' | 'cancel';

const SUCCESS_TEXT: Record<Action, string> = {
  approve: 'Booking disetujui',
  reject: 'Booking ditolak',
  activate: 'Booking diaktifkan',
  finish: 'Booking diselesaikan',
  cancel: 'Booking dibatalkan',
};

export default function BookingActions({ booking }: { booking: Booking }) {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [dialog, setDialog] = useState<'reject' | 'finish' | 'cancel' | null>(null);

  const mutation = useMutation({
    mutationFn: ({ action, admin_note }: { action: Action; admin_note?: string }) =>
      api.post(`/api/admin/bookings/${booking.id}/${action}`, action === 'reject' ? { admin_note } : undefined),
    onSuccess: (_data, { action }) => {
      toast.success(SUCCESS_TEXT[action]);
      setDialog(null);
      for (const key of ['admin-bookings', 'admin-booking', 'admin-dashboard', 'admin-rooms']) {
        queryClient.invalidateQueries({ queryKey: [key] });
      }
    },
    onError: (error) => toast.error(errorMessage(error)),
  });

  return (
    <div className="flex flex-wrap gap-1.5">
      {booking.status === 'pending' && (
        <>
          <button type="button" className="btn btn-primary btn-sm" disabled={mutation.isPending} onClick={() => mutation.mutate({ action: 'approve' })}>
            Approve
          </button>
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => setDialog('reject')}>
            Reject
          </button>
        </>
      )}
      {booking.status === 'approved' && (
        <>
          <button type="button" className="btn btn-primary btn-sm" disabled={mutation.isPending} onClick={() => mutation.mutate({ action: 'activate' })}>
            Aktifkan
          </button>
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => setDialog('cancel')}>
            Batalkan
          </button>
        </>
      )}
      {booking.status === 'active' && (
        <button type="button" className="btn btn-primary btn-sm" onClick={() => setDialog('finish')}>
          Selesai
        </button>
      )}

      {dialog === 'reject' && (
        <ReasonDialog
          title={`Tolak booking ${booking.code}`}
          isLoading={mutation.isPending}
          onClose={() => setDialog(null)}
          onSubmit={(reason) => mutation.mutate({ action: 'reject', admin_note: reason })}
        />
      )}
      {dialog === 'cancel' && (
        <ConfirmDialog
          title="Batalkan booking"
          message={`Booking ${booking.code} akan dibatalkan dan status ini tidak bisa diubah lagi.`}
          confirmLabel="Batalkan booking"
          danger
          isLoading={mutation.isPending}
          onClose={() => setDialog(null)}
          onConfirm={() => mutation.mutate({ action: 'cancel' })}
        />
      )}
      {dialog === 'finish' && (
        <ConfirmDialog
          title="Selesaikan booking"
          message={`Masa sewa ${booking.code} akan ditandai selesai dan kamar kembali tersedia.`}
          confirmLabel="Tandai selesai"
          isLoading={mutation.isPending}
          onClose={() => setDialog(null)}
          onConfirm={() => mutation.mutate({ action: 'finish' })}
        />
      )}
    </div>
  );
}
