import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { MapPin, MessageCircle } from 'lucide-react';
import api, { facilitiesQuery, kosQuery } from '../../api';
import FacilityIcon from '../../components/FacilityIcon';
import RoomCard from '../../components/RoomCard';
import type { Room } from '../../types';
import { formatRupiah, whatsappUrl } from '../../utils';

export default function Home() {
  const { data: kos, isLoading: kosLoading } = useQuery(kosQuery);
  const { data: facilities } = useQuery(facilitiesQuery);
  const { data: rooms, isLoading: roomsLoading } = useQuery({
    queryKey: ['rooms', 'available', 'price_asc'],
    queryFn: () => api.get<Room[]>('/api/rooms', { params: { status: 'available', sort: 'price_asc' } }).then((res) => res.data),
  });

  const rules = kos?.rules?.split('\n').map((rule) => rule.trim()).filter(Boolean) ?? [];

  return (
    <div>
      <section className="bg-teal-900 text-white">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-14 md:grid-cols-[1fr_auto] md:items-end md:py-20">
          <div>
            {kosLoading ? (
              <div className="h-12 w-64 animate-pulse rounded-lg bg-teal-800" />
            ) : (
              <h1 className="text-4xl font-bold md:text-5xl">{kos?.name ?? 'Kos'}</h1>
            )}
            <p className="mt-3 max-w-xl text-lg text-teal-50">{kos?.tagline}</p>
            <Link to="/rooms" className="btn mt-6 bg-amber-400 text-stone-900 hover:bg-amber-300">
              Lihat Kamar
            </Link>
          </div>
          {rooms && rooms.length > 0 && (
            <dl className="flex gap-8 border-t border-teal-700 pt-4 md:border-l md:border-t-0 md:pl-8 md:pt-0">
              <div>
                <dt className="text-sm text-teal-100">Kamar kosong</dt>
                <dd className="text-2xl font-bold">{rooms.length}</dd>
              </div>
              <div>
                <dt className="text-sm text-teal-100">Mulai dari</dt>
                <dd className="text-2xl font-bold">{formatRupiah(rooms[0].price_monthly)}</dd>
              </div>
            </dl>
          )}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-12">
        <div className="mb-6 flex items-end justify-between gap-4">
          <h2 className="text-2xl font-bold text-stone-900">Kamar tersedia</h2>
          <Link to="/rooms" className="text-sm font-medium text-teal-800 underline">
            Semua kamar
          </Link>
        </div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {roomsLoading && [1, 2, 3].map((item) => <div key={item} className="skeleton aspect-4/3" />)}
          {rooms?.slice(0, 3).map((room) => <RoomCard key={room.id} room={room} />)}
        </div>
        {rooms?.length === 0 && <p className="text-stone-600">Saat ini semua kamar sedang terisi.</p>}
      </section>

      {facilities && facilities.length > 0 && (
        <section className="border-y border-stone-200 bg-white">
          <div className="mx-auto max-w-6xl px-4 py-12">
            <h2 className="mb-6 text-2xl font-bold text-stone-900">Fasilitas</h2>
            <ul className="grid grid-cols-2 gap-x-6 gap-y-4 md:grid-cols-4">
              {facilities.map((facility) => (
                <li key={facility.id} className="flex items-center gap-3 text-stone-800">
                  <FacilityIcon name={facility.icon} className="h-5 w-5 shrink-0 text-teal-700" />
                  {facility.name}
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      <section className="mx-auto grid max-w-6xl gap-10 px-4 py-12 md:grid-cols-2">
        <div>
          <h2 className="mb-4 text-2xl font-bold text-stone-900">Aturan kos</h2>
          {rules.length > 0 ? (
            <ul className="list-disc space-y-2 pl-5 text-stone-700">
              {rules.map((rule) => <li key={rule}>{rule}</li>)}
            </ul>
          ) : (
            <p className="text-stone-600">Aturan kos belum dicantumkan.</p>
          )}
        </div>
        <div>
          <h2 className="mb-4 text-2xl font-bold text-stone-900">Lokasi dan kontak</h2>
          {kos && (
            <p className="flex gap-2 text-stone-700">
              <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-teal-700" aria-hidden />
              {kos.address}, {kos.city}
            </p>
          )}
          <div className="mt-4 flex flex-wrap gap-2">
            {kos?.whatsapp && (
              <a href={whatsappUrl(kos.whatsapp)} target="_blank" rel="noopener noreferrer" className="btn btn-primary">
                <MessageCircle className="h-4 w-4" aria-hidden />
                Hubungi via WhatsApp
              </a>
            )}
            {kos?.maps_url && (
              <a href={kos.maps_url} target="_blank" rel="noopener noreferrer" className="btn btn-secondary">
                <MapPin className="h-4 w-4" aria-hidden />
                Buka Google Maps
              </a>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
