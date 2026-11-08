import { useState } from 'react';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../../api';
import { useAuth } from '../../auth';
import DataTable from '../../components/DataTable';
import type { Column } from '../../components/DataTable';
import { useToast } from '../../components/Toast';
import type { Page, User } from '../../types';
import { errorMessage, formatDateTime } from '../../utils';

const PAGE_SIZE = 10;

export default function Users() {
  const { user: currentUser } = useAuth();
  const toast = useToast();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-users', page],
    queryFn: () => api.get<Page<User>>('/api/admin/users', { params: { page, page_size: PAGE_SIZE } }).then((res) => res.data),
    placeholderData: keepPreviousData,
  });

  const toggle = useMutation({
    mutationFn: (user: User) => api.patch(`/api/admin/users/${user.id}`, { is_active: !user.is_active }),
    onSuccess: (_data, user) => {
      toast.success(user.is_active ? 'Akun dinonaktifkan' : 'Akun diaktifkan');
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
    },
    onError: (error) => toast.error(errorMessage(error)),
  });

  const columns: Column<User>[] = [
    { header: 'Nama', render: (user) => <span className="font-medium text-stone-900">{user.name}</span> },
    { header: 'Email', render: (user) => user.email },
    { header: 'No. HP', render: (user) => user.phone || 'Tidak ada' },
    { header: 'Peran', render: (user) => (user.role === 'admin' ? 'Admin' : 'Penyewa') },
    { header: 'Terdaftar', render: (user) => formatDateTime(user.created_at) },
    { header: 'Status', render: (user) => (user.is_active ? 'Aktif' : 'Nonaktif') },
    {
      header: 'Aksi',
      render: (user) =>
        user.id === currentUser?.id ? (
          <span className="text-stone-600">Akun Anda</span>
        ) : (
          <button type="button" className="btn btn-secondary btn-sm" disabled={toggle.isPending} onClick={() => toggle.mutate(user)}>
            {user.is_active ? 'Nonaktifkan' : 'Aktifkan'}
          </button>
        ),
    },
  ];

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-stone-900">Penyewa</h1>
      <DataTable
        columns={columns}
        rows={data?.items}
        rowKey={(user) => user.id}
        isLoading={isLoading}
        emptyText="Belum ada pengguna."
        page={page}
        pageSize={PAGE_SIZE}
        total={data?.total}
        onPageChange={setPage}
      />
    </div>
  );
}
