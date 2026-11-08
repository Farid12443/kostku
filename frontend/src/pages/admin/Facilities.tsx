import { useState } from 'react';
import type { FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import api from '../../api';
import ConfirmDialog from '../../components/ConfirmDialog';
import DataTable from '../../components/DataTable';
import type { Column } from '../../components/DataTable';
import FacilityIcon, { FACILITY_ICONS } from '../../components/FacilityIcon';
import Modal from '../../components/Modal';
import { useToast } from '../../components/Toast';
import type { Facility } from '../../types';
import { errorMessage } from '../../utils';

function FacilityModal({ facility, onClose, onSaved }: { facility: Facility | null; onClose: () => void; onSaved: () => void }) {
  const toast = useToast();
  const [name, setName] = useState(facility?.name ?? '');
  const [icon, setIcon] = useState(facility?.icon ?? 'wifi');

  const save = useMutation({
    mutationFn: () => {
      const body = { name, icon };
      return facility ? api.put(`/api/admin/facilities/${facility.id}`, body) : api.post('/api/admin/facilities', body);
    },
    onSuccess: () => {
      toast.success(facility ? 'Fasilitas diperbarui' : 'Fasilitas ditambahkan');
      onSaved();
    },
    onError: (error) => toast.error(errorMessage(error)),
  });

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    save.mutate();
  };

  return (
    <Modal title={facility ? 'Edit fasilitas' : 'Tambah fasilitas'} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="label" htmlFor="facility-name">Nama</label>
          <input id="facility-name" required maxLength={80} className="input" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div>
          <label className="label" htmlFor="facility-icon">Ikon</label>
          <div className="flex items-center gap-3">
            <FacilityIcon name={icon} className="h-6 w-6 shrink-0 text-teal-700" />
            <select id="facility-icon" className="input" value={icon} onChange={(e) => setIcon(e.target.value)}>
              {Object.keys(FACILITY_ICONS).map((key) => (
                <option key={key} value={key}>{key}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Batal
          </button>
          <button type="submit" className="btn btn-primary" disabled={save.isPending}>
            {save.isPending ? 'Menyimpan...' : 'Simpan'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

export default function Facilities() {
  const toast = useToast();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<Facility | 'new' | null>(null);
  const [deleting, setDeleting] = useState<Facility | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-facilities'],
    queryFn: () => api.get<Facility[]>('/api/admin/facilities').then((res) => res.data),
  });

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['admin-facilities'] });
    queryClient.invalidateQueries({ queryKey: ['facilities'] });
  };

  const remove = useMutation({
    mutationFn: (facility: Facility) => api.delete(`/api/admin/facilities/${facility.id}`),
    onSuccess: () => {
      toast.success('Fasilitas dihapus');
      setDeleting(null);
      refresh();
    },
    onError: (error) => toast.error(errorMessage(error)),
  });

  const columns: Column<Facility>[] = [
    { header: 'Ikon', render: (facility) => <FacilityIcon name={facility.icon} className="h-5 w-5 text-teal-700" /> },
    { header: 'Nama', render: (facility) => <span className="font-medium text-stone-900">{facility.name}</span> },
    {
      header: 'Aksi',
      render: (facility) => (
        <div className="flex gap-1.5">
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => setEditing(facility)}>
            Edit
          </button>
          <button type="button" className="btn btn-secondary btn-sm text-red-800" onClick={() => setDeleting(facility)}>
            Hapus
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-stone-900">Fasilitas</h1>
        <button type="button" className="btn btn-primary" onClick={() => setEditing('new')}>
          <Plus className="h-4 w-4" aria-hidden />
          Tambah fasilitas
        </button>
      </div>

      <DataTable columns={columns} rows={data} rowKey={(facility) => facility.id} isLoading={isLoading} emptyText="Belum ada fasilitas." />

      {editing && (
        <FacilityModal
          facility={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            refresh();
          }}
        />
      )}
      {deleting && (
        <ConfirmDialog
          title="Hapus fasilitas"
          message={`${deleting.name} akan dihapus dari semua kamar.`}
          confirmLabel="Hapus"
          danger
          isLoading={remove.isPending}
          onClose={() => setDeleting(null)}
          onConfirm={() => remove.mutate(deleting)}
        />
      )}
    </div>
  );
}
