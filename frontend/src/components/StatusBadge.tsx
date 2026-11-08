const STYLES: Record<string, { label: string; className: string }> = {
  available: { label: 'Tersedia', className: 'bg-teal-100 text-teal-900' },
  occupied: { label: 'Terisi', className: 'bg-amber-100 text-amber-900' },
  maintenance: { label: 'Perbaikan', className: 'bg-stone-200 text-stone-800' },
  pending: { label: 'Menunggu', className: 'bg-amber-100 text-amber-900' },
  approved: { label: 'Disetujui', className: 'bg-sky-100 text-sky-900' },
  active: { label: 'Aktif', className: 'bg-teal-100 text-teal-900' },
  verified: { label: 'Terverifikasi', className: 'bg-teal-100 text-teal-900' },
  rejected: { label: 'Ditolak', className: 'bg-red-100 text-red-900' },
  cancelled: { label: 'Dibatalkan', className: 'bg-stone-200 text-stone-800' },
  finished: { label: 'Selesai', className: 'bg-stone-200 text-stone-800' },
};

export default function StatusBadge({ status }: { status: string }) {
  const style = STYLES[status] ?? { label: status, className: 'bg-stone-200 text-stone-800' };
  return (
    <span className={`inline-block whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ${style.className}`}>
      {style.label}
    </span>
  );
}
