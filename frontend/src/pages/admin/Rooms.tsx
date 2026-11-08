import { useDeferredValue, useState } from 'react';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { Link } from 'react-router-dom';
import api from '../../api';
import ConfirmDialog from '../../components/ConfirmDialog';
import DataTable from '../../components/DataTable';
import type { Column } from '../../components/DataTable';
import StatusBadge from '../../components/StatusBadge';
import { useToast } from '../../components/Toast';
import type { Page, Room } from '../../types';
import { ROOM_TYPE_LABELS, errorMessage, formatRupiah } from '../../utils';

const PAGE_SIZE = 10;

export default function AdminRooms() {
  const toast = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [deleting, setDeleting] = useState<Room | null>(null);
  const q = useDeferredValue(search);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-rooms', q, status, page],
    queryFn: () =>
      api
        .get<Page<Room>>('/api/admin/rooms', { params: { q: q || undefined, status: status || undefined, page, page_size: PAGE_SIZE } })
        .then((res) => res.data),
    placeholderData: keepPreviousData,
  });

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['admin-rooms'] });
    queryClient.invalidateQueries({ queryKey: ['rooms'] });
  };

  const togglePublish = useMutation({
    mutationFn: (room: Room) => api.put(`/api/admin/rooms/${room.id}`, { is_published: !room.is_published }),
    onSuccess: (_data, room) => {
      toast.success(room.is_published ? 'Kamar disembunyikan' : 'Kamar dipublikasikan');
      refresh();
    },
    onError: (error) => toast.error(errorMessage(error)),
  });

  const remove = useMutation({
    mutationFn: (room: Room) => api.delete(`/api/admin/rooms/${room.id}`),
    onSuccess: () => {
      toast.success('Kamar dihapus');
      setDeleting(null);
      refresh();
    },
    onError: (error) => {
      toast.error(errorMessage(error));
      setDeleting(null);
    },
  });

  const columns: Column<Room>[] = [
    { header: 'Kamar', render: (room) => <span className="font-medium text-stone-900">{room.name}</span> },
    { header: 'Tipe', render: (room) => ROOM_TYPE_LABELS[room.room_type] },
    { header: 'Harga', render: (room) => formatRupiah(room.price_monthly) },
    { header: 'Status', render: (room) => <StatusBadge status={room.status} /> },
    {
      header: 'Publikasi',
      render: (room) => (
        <button type="button" className="btn btn-secondary btn-sm" disabled={togglePublish.isPending} onClick={() => togglePublish.mutate(room)}>
          {room.is_published ? 'Tampil' : 'Tersembunyi'}
        </button>
      ),
    },
    {
      header: 'Aksi',
      render: (room) => (
        <div className="flex gap-1.5">
          <Link to={`/admin/rooms/${room.id}/edit`} className="btn btn-secondary btn-sm">
            Edit
          </Link>
          <button type="button" className="btn btn-secondary btn-sm text-red-800" onClick={() => setDeleting(room)}>
            Hapus
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-stone-900">Kamar</h1>
        <Link to="/admin/rooms/new" className="btn btn-primary">
          <Plus className="h-4 w-4" aria-hidden />
          Tambah kamar
        </Link>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <input
          className="input sm:max-w-xs"
          placeholder="Cari nama kamar"
          aria-label="Cari nama kamar"
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
          <option value="available">Tersedia</option>
          <option value="occupied">Terisi</option>
          <option value="maintenance">Perbaikan</option>
        </select>
      </div>

      <DataTable
        columns={columns}
        rows={data?.items}
        rowKey={(room) => room.id}
        isLoading={isLoading}
        emptyText="Tidak ada kamar."
        page={page}
        pageSize={PAGE_SIZE}
        total={data?.total}
        onPageChange={setPage}
      />

      {deleting && (
        <ConfirmDialog
          title="Hapus kamar"
          message={`${deleting.name} beserta foto, video, dan riwayat booking yang sudah tidak aktif akan dihapus permanen.`}
          confirmLabel="Hapus kamar"
          danger
          isLoading={remove.isPending}
          onClose={() => setDeleting(null)}
          onConfirm={() => remove.mutate(deleting)}
        />
      )}
    </div>
  );
}
