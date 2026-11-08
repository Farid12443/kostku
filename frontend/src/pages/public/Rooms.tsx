import { useDeferredValue, useState } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { Search } from 'lucide-react';
import api, { facilitiesQuery } from '../../api';
import RoomCard from '../../components/RoomCard';
import type { Room } from '../../types';

const EMPTY_FILTERS = { q: '', room_type: '', status: '', min_price: '', max_price: '', sort: 'newest' };

export default function Rooms() {
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [facilityIds, setFacilityIds] = useState<number[]>([]);
  const deferredFilters = useDeferredValue(filters);
  const { data: facilities } = useQuery(facilitiesQuery);

  const { data: rooms, isLoading, isError } = useQuery({
    queryKey: ['rooms', deferredFilters, facilityIds],
    queryFn: () => {
      const params: Record<string, string> = {};
      for (const [key, value] of Object.entries(deferredFilters)) {
        if (value) params[key] = value;
      }
      if (facilityIds.length) params.facility_ids = facilityIds.join(',');
      return api.get<Room[]>('/api/rooms', { params }).then((res) => res.data);
    },
    placeholderData: keepPreviousData,
  });

  const update = (field: keyof typeof EMPTY_FILTERS, value: string) => setFilters({ ...filters, [field]: value });
  const toggleFacility = (id: number) =>
    setFacilityIds((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));
  const reset = () => {
    setFilters(EMPTY_FILTERS);
    setFacilityIds([]);
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="mb-5 text-3xl font-bold text-stone-900">Cari kamar</h1>

      <div className="card space-y-4 p-4">
        <div className="relative">
          <Search className="absolute left-3 top-3 h-5 w-5 text-stone-500" aria-hidden />
          <input className="input pl-10" placeholder="Cari nama kamar" aria-label="Cari nama kamar" value={filters.q} onChange={(e) => update('q', e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
          <div>
            <label className="label" htmlFor="room_type">Tipe</label>
            <select id="room_type" className="input" value={filters.room_type} onChange={(e) => update('room_type', e.target.value)}>
              <option value="">Semua</option>
              <option value="putra">Putra</option>
              <option value="putri">Putri</option>
              <option value="campur">Campur</option>
            </select>
          </div>
          <div>
            <label className="label" htmlFor="status">Status</label>
            <select id="status" className="input" value={filters.status} onChange={(e) => update('status', e.target.value)}>
              <option value="">Semua</option>
              <option value="available">Tersedia</option>
              <option value="occupied">Terisi</option>
              <option value="maintenance">Perbaikan</option>
            </select>
          </div>
          <div>
            <label className="label" htmlFor="min_price">Harga minimum</label>
            <input id="min_price" type="number" min={0} step={50000} className="input" value={filters.min_price} onChange={(e) => update('min_price', e.target.value)} />
          </div>
          <div>
            <label className="label" htmlFor="max_price">Harga maksimum</label>
            <input id="max_price" type="number" min={0} step={50000} className="input" value={filters.max_price} onChange={(e) => update('max_price', e.target.value)} />
          </div>
          <div className="col-span-2 md:col-span-1">
            <label className="label" htmlFor="sort">Urutkan</label>
            <select id="sort" className="input" value={filters.sort} onChange={(e) => update('sort', e.target.value)}>
              <option value="newest">Terbaru</option>
              <option value="price_asc">Harga terendah</option>
              <option value="price_desc">Harga tertinggi</option>
            </select>
          </div>
        </div>
        <fieldset>
          <legend className="label">Fasilitas</legend>
          <div className="flex flex-wrap gap-2">
            {facilities?.map((facility) => (
              <label
                key={facility.id}
                className={`cursor-pointer rounded-full border px-3 py-1.5 text-sm has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-teal-700 ${
                  facilityIds.includes(facility.id) ? 'border-teal-700 bg-teal-700 text-white' : 'border-stone-300 text-stone-700 hover:bg-stone-100'
                }`}
              >
                <input type="checkbox" className="sr-only" checked={facilityIds.includes(facility.id)} onChange={() => toggleFacility(facility.id)} />
                {facility.name}
              </label>
            ))}
          </div>
        </fieldset>
      </div>

      <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {isLoading && [1, 2, 3, 4, 5, 6].map((item) => <div key={item} className="skeleton aspect-4/3" />)}
        {rooms?.map((room) => <RoomCard key={room.id} room={room} />)}
      </div>

      {isError && <p className="py-16 text-center text-red-800">Gagal memuat kamar. Coba muat ulang halaman.</p>}
      {rooms?.length === 0 && (
        <div className="py-16 text-center">
          <p className="text-stone-600">Tidak ada kamar yang cocok dengan filter ini.</p>
          <button type="button" className="btn btn-secondary mt-3" onClick={reset}>
            Hapus filter
          </button>
        </div>
      )}
    </div>
  );
}
