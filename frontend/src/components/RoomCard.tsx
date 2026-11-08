import { Link } from 'react-router-dom';
import { BedDouble } from 'lucide-react';
import type { Room } from '../types';
import { ROOM_TYPE_LABELS, formatRupiah } from '../utils';
import StatusBadge from './StatusBadge';

export default function RoomCard({ room }: { room: Room }) {
  return (
    <Link to={`/rooms/${room.id}`} className="card group block overflow-hidden transition-shadow hover:shadow-md">
      <div className="relative aspect-4/3 bg-stone-200">
        {room.cover_url ? (
          <img src={room.cover_url} alt={room.name} loading="lazy" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-1 text-stone-600">
            <BedDouble className="h-10 w-10" aria-hidden />
            <span className="text-sm">Belum ada foto</span>
          </div>
        )}
        <div className="absolute left-3 top-3">
          <StatusBadge status={room.status} />
        </div>
      </div>
      <div className="space-y-2 p-4">
        <h3 className="text-lg font-semibold text-stone-900 group-hover:text-teal-800">{room.name}</h3>
        <p className="text-lg font-bold text-teal-800">
          {formatRupiah(room.price_monthly)}
          <span className="text-sm font-normal text-stone-600"> per bulan</span>
        </p>
        <dl className="flex flex-wrap gap-x-4 text-sm text-stone-600">
          <div className="flex gap-1">
            <dt>Tipe</dt>
            <dd className="font-medium text-stone-800">{ROOM_TYPE_LABELS[room.room_type]}</dd>
          </div>
          <div className="flex gap-1">
            <dt>Lantai</dt>
            <dd className="font-medium text-stone-800">{room.floor}</dd>
          </div>
          {room.size_m2 != null && (
            <div className="flex gap-1">
              <dt>Luas</dt>
              <dd className="font-medium text-stone-800">{room.size_m2} m²</dd>
            </div>
          )}
        </dl>
        <p className="text-sm text-stone-600">{room.facilities.slice(0, 4).map((f) => f.name).join(', ')}</p>
      </div>
    </Link>
  );
}
