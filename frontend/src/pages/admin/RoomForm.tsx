import { useRef, useState } from 'react';
import type { DragEvent, FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Star, Trash2, Upload } from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import api, { facilitiesQuery } from '../../api';
import ConfirmDialog from '../../components/ConfirmDialog';
import { useToast } from '../../components/Toast';
import type { Room, RoomMedia } from '../../types';
import { errorMessage } from '../../utils';

function MediaManager({ room }: { room: Room }) {
  const toast = useToast();
  const queryClient = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);
  const [deleting, setDeleting] = useState<RoomMedia | null>(null);

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['admin-room', String(room.id)] });
    queryClient.invalidateQueries({ queryKey: ['admin-rooms'] });
    queryClient.invalidateQueries({ queryKey: ['rooms'] });
    queryClient.invalidateQueries({ queryKey: ['room', String(room.id)] });
  };

  const upload = useMutation({
    mutationFn: (files: File[]) => {
      const body = new FormData();
      files.forEach((file) => body.append('files', file));
      return api.post(`/api/admin/rooms/${room.id}/media`, body, {
        onUploadProgress: (event) => setProgress(event.total ? Math.round((event.loaded / event.total) * 100) : null),
      });
    },
    onSuccess: () => {
      toast.success('Media berhasil diupload');
      refresh();
    },
    onError: (error) => toast.error(errorMessage(error, 'Upload gagal.')),
    onSettled: () => setProgress(null),
  });

  const setCover = useMutation({
    mutationFn: (media: RoomMedia) => api.patch(`/api/admin/media/${media.id}`, { is_cover: true }),
    onSuccess: () => {
      toast.success('Cover diperbarui');
      refresh();
    },
    onError: (error) => toast.error(errorMessage(error)),
  });

  const remove = useMutation({
    mutationFn: (media: RoomMedia) => api.delete(`/api/admin/media/${media.id}`),
    onSuccess: () => {
      toast.success('Media dihapus');
      setDeleting(null);
      refresh();
    },
    onError: (error) => toast.error(errorMessage(error)),
  });

  const sendFiles = (list: FileList | null) => {
    if (list && list.length > 0) upload.mutate(Array.from(list));
  };

  const handleDrop = (event: DragEvent) => {
    event.preventDefault();
    setDragging(false);
    sendFiles(event.dataTransfer.files);
  };

  return (
    <section className="card space-y-4 p-5">
      <h2 className="text-lg font-semibold text-stone-900">Foto dan video</h2>

      <div
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        className={`rounded-xl border-2 border-dashed p-8 text-center transition-colors ${dragging ? 'border-teal-700 bg-teal-50' : 'border-stone-300'}`}
      >
        <p className="text-stone-700">Tarik file ke sini atau pilih dari perangkat</p>
        <p className="text-sm text-stone-600">Foto jpg, png, webp. Video mp4, webm.</p>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept=".jpg,.jpeg,.png,.webp,.mp4,.webm"
          className="sr-only"
          aria-label="Pilih file media"
          onChange={(e) => {
            sendFiles(e.target.files);
            e.target.value = '';
          }}
        />
        <button type="button" className="btn btn-secondary mt-3" disabled={upload.isPending} onClick={() => inputRef.current?.click()}>
          <Upload className="h-4 w-4" aria-hidden />
          Pilih file
        </button>
        {upload.isPending && (
          <div className="mx-auto mt-4 max-w-sm" role="progressbar" aria-valuenow={progress ?? 0} aria-valuemin={0} aria-valuemax={100} aria-label="Progress upload">
            <div className="h-2 overflow-hidden rounded-full bg-stone-200">
              <div className="h-full origin-left bg-teal-700 transition-transform" style={{ transform: `scaleX(${(progress ?? 0) / 100})` }} />
            </div>
            <p className="mt-1 text-sm text-stone-600">{progress ?? 0}%</p>
          </div>
        )}
      </div>

      {room.media.length === 0 ? (
        <p className="text-sm text-stone-600">Belum ada media. Kamar menampilkan placeholder di halaman publik.</p>
      ) : (
        <ul className="grid grid-cols-2 gap-3 md:grid-cols-3">
          {room.media.map((media) => (
            <li key={media.id} className="overflow-hidden rounded-lg border border-stone-200">
              {media.media_type === 'photo' ? (
                <img src={media.url} alt="" className="aspect-video w-full object-cover" />
              ) : (
                <video src={media.url} controls preload="metadata" className="aspect-video w-full bg-stone-900" />
              )}
              <div className="flex items-center justify-between gap-1 p-2">
                {media.media_type === 'photo' &&
                  (media.is_cover ? (
                    <span className="flex items-center gap-1 text-xs font-semibold text-teal-800">
                      <Star className="h-3.5 w-3.5" aria-hidden />
                      Cover
                    </span>
                  ) : (
                    <button type="button" className="text-xs font-medium text-teal-800 underline" disabled={setCover.isPending} onClick={() => setCover.mutate(media)}>
                      Jadikan cover
                    </button>
                  ))}
                {media.media_type === 'video' && <span className="text-xs text-stone-600">Video</span>}
                <button type="button" className="rounded p-1 text-red-800 hover:bg-red-50" aria-label="Hapus media" onClick={() => setDeleting(media)}>
                  <Trash2 className="h-4 w-4" aria-hidden />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {deleting && (
        <ConfirmDialog
          title="Hapus media"
          message="File akan dihapus permanen."
          confirmLabel="Hapus"
          danger
          isLoading={remove.isPending}
          onClose={() => setDeleting(null)}
          onConfirm={() => remove.mutate(deleting)}
        />
      )}
    </section>
  );
}

function RoomEditor({ room }: { room?: Room }) {
  const toast = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: facilities } = useQuery(facilitiesQuery);
  const [form, setForm] = useState({
    name: room?.name ?? '',
    floor: String(room?.floor ?? 1),
    room_type: room?.room_type ?? 'campur',
    size_m2: room?.size_m2 != null ? String(room.size_m2) : '',
    price_monthly: room ? String(room.price_monthly) : '',
    deposit: String(room?.deposit ?? 0),
    status: room?.status ?? 'available',
    description: room?.description ?? '',
    is_published: room?.is_published ?? true,
  });
  const [facilityIds, setFacilityIds] = useState<number[]>(room?.facilities.map((f) => f.id) ?? []);

  const update = (field: keyof typeof form, value: string | boolean) => setForm({ ...form, [field]: value });
  const toggleFacility = (id: number) =>
    setFacilityIds((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));

  const save = useMutation({
    mutationFn: () => {
      const body = {
        ...form,
        floor: Number(form.floor),
        size_m2: form.size_m2 ? Number(form.size_m2) : null,
        price_monthly: Number(form.price_monthly),
        deposit: Number(form.deposit),
        description: form.description || null,
        facility_ids: facilityIds,
      };
      return (room ? api.put<Room>(`/api/admin/rooms/${room.id}`, body) : api.post<Room>('/api/admin/rooms', body)).then((res) => res.data);
    },
    onSuccess: (saved) => {
      toast.success(room ? 'Kamar diperbarui' : 'Kamar dibuat, sekarang tambahkan foto dan video');
      queryClient.invalidateQueries({ queryKey: ['admin-rooms'] });
      queryClient.invalidateQueries({ queryKey: ['admin-room', String(saved.id)] });
      queryClient.invalidateQueries({ queryKey: ['rooms'] });
      queryClient.invalidateQueries({ queryKey: ['room', String(saved.id)] });
      if (!room) navigate(`/admin/rooms/${saved.id}/edit`, { replace: true });
    },
    onError: (error) => toast.error(errorMessage(error, 'Gagal menyimpan kamar.')),
  });

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    save.mutate();
  };

  return (
    <div className="max-w-3xl space-y-4">
      <Link to="/admin/rooms" className="text-sm font-medium text-teal-800 underline">
        Kembali ke daftar kamar
      </Link>
      <h1 className="text-2xl font-bold text-stone-900">{room ? `Edit ${room.name}` : 'Tambah kamar'}</h1>

      <form onSubmit={handleSubmit} className="card grid gap-4 p-5 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="label" htmlFor="name">Nama kamar</label>
          <input id="name" required maxLength={100} className="input" value={form.name} onChange={(e) => update('name', e.target.value)} />
        </div>
        <div>
          <label className="label" htmlFor="room_type">Tipe</label>
          <select id="room_type" className="input" value={form.room_type} onChange={(e) => update('room_type', e.target.value)}>
            <option value="putra">Putra</option>
            <option value="putri">Putri</option>
            <option value="campur">Campur</option>
          </select>
        </div>
        <div>
          <label className="label" htmlFor="status">Status</label>
          <select id="status" className="input" value={form.status} onChange={(e) => update('status', e.target.value)}>
            <option value="available">Tersedia</option>
            <option value="occupied">Terisi</option>
            <option value="maintenance">Perbaikan</option>
          </select>
        </div>
        <div>
          <label className="label" htmlFor="floor">Lantai</label>
          <input id="floor" type="number" required className="input" value={form.floor} onChange={(e) => update('floor', e.target.value)} />
        </div>
        <div>
          <label className="label" htmlFor="size_m2">Luas (m²)</label>
          <input id="size_m2" type="number" min={0.1} step={0.1} className="input" value={form.size_m2} onChange={(e) => update('size_m2', e.target.value)} />
        </div>
        <div>
          <label className="label" htmlFor="price_monthly">Harga per bulan (Rp)</label>
          <input id="price_monthly" type="number" min={0} required className="input" value={form.price_monthly} onChange={(e) => update('price_monthly', e.target.value)} />
        </div>
        <div>
          <label className="label" htmlFor="deposit">Deposit (Rp)</label>
          <input id="deposit" type="number" min={0} required className="input" value={form.deposit} onChange={(e) => update('deposit', e.target.value)} />
        </div>
        <div className="sm:col-span-2">
          <label className="label" htmlFor="description">Deskripsi</label>
          <textarea id="description" rows={3} className="input" value={form.description} onChange={(e) => update('description', e.target.value)} />
        </div>
        <fieldset className="sm:col-span-2">
          <legend className="label">Fasilitas</legend>
          <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
            {facilities?.map((facility) => (
              <label key={facility.id} className="flex items-center gap-2 text-sm text-stone-800">
                <input type="checkbox" className="h-4 w-4 accent-teal-700" checked={facilityIds.includes(facility.id)} onChange={() => toggleFacility(facility.id)} />
                {facility.name}
              </label>
            ))}
          </div>
        </fieldset>
        <label className="flex items-center gap-2 text-sm text-stone-800 sm:col-span-2">
          <input type="checkbox" className="h-4 w-4 accent-teal-700" checked={form.is_published} onChange={(e) => update('is_published', e.target.checked)} />
          Tampilkan di halaman publik
        </label>
        <div className="sm:col-span-2">
          <button type="submit" className="btn btn-primary" disabled={save.isPending}>
            {save.isPending ? 'Menyimpan...' : 'Simpan kamar'}
          </button>
        </div>
      </form>

      {room ? (
        <MediaManager room={room} />
      ) : (
        <p className="text-sm text-stone-600">Foto dan video bisa ditambahkan setelah kamar disimpan.</p>
      )}
    </div>
  );
}

export default function RoomForm() {
  const { id } = useParams();
  const { data: room, isLoading } = useQuery({
    queryKey: ['admin-room', id],
    queryFn: () => api.get<Room>(`/api/admin/rooms/${id}`).then((res) => res.data),
    enabled: Boolean(id),
  });

  if (id && isLoading) return <div className="skeleton h-96 max-w-3xl" />;
  if (id && !room) return <p className="text-stone-700">Kamar tidak ditemukan.</p>;
  return <RoomEditor key={room?.id ?? 'new'} room={room} />;
}
