import { useState } from 'react';
import type { FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api, { kosQuery } from '../../api';
import { useToast } from '../../components/Toast';
import type { KosProfile } from '../../types';
import { errorMessage } from '../../utils';

const TEXT_FIELDS = ['name', 'tagline', 'city', 'maps_url', 'whatsapp', 'email'] as const;
const BANK_FIELDS = ['bank_name', 'bank_account_number', 'bank_account_name'] as const;

const LABELS: Record<string, string> = {
  name: 'Nama kos',
  tagline: 'Tagline',
  city: 'Kota',
  maps_url: 'Link Google Maps',
  whatsapp: 'WhatsApp (contoh 6281234567890)',
  email: 'Email',
  bank_name: 'Nama bank',
  bank_account_number: 'Nomor rekening',
  bank_account_name: 'Atas nama',
};

const REQUIRED = new Set(['name', 'city', 'address']);

function SettingsForm({ kos }: { kos: KosProfile }) {
  const toast = useToast();
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    name: kos.name,
    tagline: kos.tagline ?? '',
    description: kos.description ?? '',
    address: kos.address,
    city: kos.city,
    maps_url: kos.maps_url ?? '',
    whatsapp: kos.whatsapp ?? '',
    email: kos.email ?? '',
    rules: kos.rules ?? '',
    bank_name: kos.bank_name ?? '',
    bank_account_number: kos.bank_account_number ?? '',
    bank_account_name: kos.bank_account_name ?? '',
  });

  const save = useMutation({
    mutationFn: () => {
      const body = Object.fromEntries(Object.entries(form).map(([key, value]) => [key, value.trim() || null]));
      return api.put('/api/admin/kos', body);
    },
    onSuccess: () => {
      toast.success('Profil kos disimpan');
      queryClient.invalidateQueries({ queryKey: ['kos'] });
    },
    onError: (error) => toast.error(errorMessage(error, 'Gagal menyimpan profil.')),
  });

  const update = (field: keyof typeof form, value: string) => setForm({ ...form, [field]: value });
  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    save.mutate();
  };

  const renderInput = (field: (typeof TEXT_FIELDS)[number] | (typeof BANK_FIELDS)[number]) => (
    <div key={field}>
      <label className="label" htmlFor={field}>{LABELS[field]}</label>
      <input id={field} required={REQUIRED.has(field)} className="input" value={form[field]} onChange={(e) => update(field, e.target.value)} />
    </div>
  );

  return (
    <form onSubmit={handleSubmit} className="max-w-3xl space-y-4">
      <h1 className="text-2xl font-bold text-stone-900">Profil kos</h1>

      <section className="card grid gap-4 p-5 sm:grid-cols-2">
        {TEXT_FIELDS.map(renderInput)}
        <div className="sm:col-span-2">
          <label className="label" htmlFor="address">Alamat</label>
          <textarea id="address" required rows={2} className="input" value={form.address} onChange={(e) => update('address', e.target.value)} />
        </div>
        <div className="sm:col-span-2">
          <label className="label" htmlFor="description">Deskripsi</label>
          <textarea id="description" rows={3} className="input" value={form.description} onChange={(e) => update('description', e.target.value)} />
        </div>
        <div className="sm:col-span-2">
          <label className="label" htmlFor="rules">Aturan kos (satu aturan per baris)</label>
          <textarea id="rules" rows={5} className="input" value={form.rules} onChange={(e) => update('rules', e.target.value)} />
        </div>
      </section>

      <section className="card p-5">
        <h2 className="mb-3 text-lg font-semibold text-stone-900">Rekening pembayaran</h2>
        <div className="grid gap-4 sm:grid-cols-2">{BANK_FIELDS.map(renderInput)}</div>
      </section>

      <button type="submit" className="btn btn-primary" disabled={save.isPending}>
        {save.isPending ? 'Menyimpan...' : 'Simpan perubahan'}
      </button>
    </form>
  );
}

export default function Settings() {
  const { data: kos, isLoading } = useQuery(kosQuery);
  if (isLoading) return <div className="skeleton h-96 max-w-3xl" />;
  if (!kos) return <p className="text-stone-700">Profil kos belum tersedia.</p>;
  return <SettingsForm kos={kos} />;
}
