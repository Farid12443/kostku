import { useState } from 'react';
import { BedDouble } from 'lucide-react';
import type { RoomMedia } from '../types';

export default function MediaGallery({ media, roomName }: { media: RoomMedia[]; roomName: string }) {
  const photos = media.filter((m) => m.media_type === 'photo').sort((a, b) => Number(b.is_cover) - Number(a.is_cover));
  const videos = media.filter((m) => m.media_type === 'video');
  const [selected, setSelected] = useState(0);
  const current = photos[Math.min(selected, photos.length - 1)];

  return (
    <div className="space-y-3">
      <div className="aspect-video overflow-hidden rounded-xl bg-stone-200">
        {current ? (
          <img src={current.url} alt={`Foto ${roomName}`} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-stone-600">
            <BedDouble className="h-16 w-16" aria-hidden />
            <span>Foto kamar belum tersedia</span>
          </div>
        )}
      </div>

      {photos.length > 1 && (
        <div className="flex gap-2 overflow-x-auto p-0.5">
          {photos.map((photo, index) => (
            <button
              key={photo.id}
              type="button"
              onClick={() => setSelected(index)}
              aria-label={`Tampilkan foto ${index + 1}`}
              aria-current={photo.id === current?.id}
              className={`h-16 w-24 shrink-0 overflow-hidden rounded-lg border-2 ${
                photo.id === current?.id ? 'border-teal-700' : 'border-transparent'
              }`}
            >
              <img src={photo.url} alt="" loading="lazy" className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      )}

      {videos.map((video) => (
        <video key={video.id} src={video.url} controls preload="metadata" className="aspect-video w-full rounded-xl bg-stone-900" />
      ))}
    </div>
  );
}
