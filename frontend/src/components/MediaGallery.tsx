import { useEffect, useRef, useState } from 'react';
import type { KeyboardEvent, TouchEvent } from 'react';
import { BedDouble, ChevronLeft, ChevronRight, Play } from 'lucide-react';
import type { RoomMedia } from '../types';

const SWIPE_THRESHOLD = 40;
const arrowClass =
  'absolute top-1/2 -translate-y-1/2 rounded-full bg-stone-900/70 p-2 text-white hover:bg-stone-900 focus-visible:outline-white';

export default function MediaGallery({ media, roomName }: { media: RoomMedia[]; roomName: string }) {
  const photos = media.filter((m) => m.media_type === 'photo').sort((a, b) => Number(b.is_cover) - Number(a.is_cover));
  const slides = [...photos, ...media.filter((m) => m.media_type === 'video')];
  const [selected, setSelected] = useState(0);
  const index = Math.min(selected, Math.max(slides.length - 1, 0));

  const trackRef = useRef<HTMLDivElement>(null);
  const thumbsRef = useRef<HTMLDivElement>(null);
  const touchStartX = useRef<number | null>(null);

  useEffect(() => {
    const strip = thumbsRef.current;
    const thumb = strip?.children[index] as HTMLElement | undefined;
    if (strip && thumb) strip.scrollTo({ left: thumb.offsetLeft - (strip.clientWidth - thumb.offsetWidth) / 2 });
  }, [index]);

  if (slides.length === 0) {
    return (
      <div className="flex aspect-video flex-col items-center justify-center gap-2 rounded-xl bg-stone-200 text-stone-600">
        <BedDouble className="h-16 w-16" aria-hidden />
        <span>Foto kamar belum tersedia</span>
      </div>
    );
  }

  const goTo = (next: number) => {
    trackRef.current?.querySelectorAll('video').forEach((video) => video.pause());
    setSelected((next + slides.length) % slides.length);
  };

  const handleKeyDown = (event: KeyboardEvent) => {
    // Tombol panah di dalam video dipakai pemutar untuk maju dan mundur
    if ((event.target as HTMLElement).tagName === 'VIDEO') return;
    if (event.key === 'ArrowLeft') goTo(index - 1);
    if (event.key === 'ArrowRight') goTo(index + 1);
  };

  const handleTouchStart = (event: TouchEvent) => {
    const onVideo = (event.target as HTMLElement).tagName === 'VIDEO';
    touchStartX.current = onVideo ? null : event.touches[0].clientX;
  };

  const handleTouchEnd = (event: TouchEvent) => {
    if (touchStartX.current === null) return;
    const distance = event.changedTouches[0].clientX - touchStartX.current;
    touchStartX.current = null;
    if (Math.abs(distance) >= SWIPE_THRESHOLD) goTo(index + (distance < 0 ? 1 : -1));
  };

  const hasMany = slides.length > 1;

  return (
    <div className="space-y-3" role="group" aria-roledescription="carousel" aria-label={`Foto dan video ${roomName}`} onKeyDown={handleKeyDown}>
      <div className="relative aspect-video overflow-hidden rounded-xl bg-stone-900" onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
        <div ref={trackRef} className="flex h-full transition-transform duration-200 ease-out" style={{ transform: `translateX(-${index * 100}%)` }}>
          {slides.map((slide, position) => (
            <div key={slide.id} className="h-full w-full shrink-0" inert={position !== index} aria-hidden={position !== index}>
              {slide.media_type === 'photo' ? (
                <img src={slide.url} alt={`Foto ${position + 1} ${roomName}`} loading={position === 0 ? 'eager' : 'lazy'} className="h-full w-full object-cover" />
              ) : (
                <video src={slide.url} controls preload="metadata" aria-label={`Video ${roomName}`} className="h-full w-full" />
              )}
            </div>
          ))}
        </div>

        {hasMany && (
          <>
            <button type="button" onClick={() => goTo(index - 1)} aria-label="Sebelumnya" className={`${arrowClass} left-3`}>
              <ChevronLeft className="h-5 w-5" aria-hidden />
            </button>
            <button type="button" onClick={() => goTo(index + 1)} aria-label="Berikutnya" className={`${arrowClass} right-3`}>
              <ChevronRight className="h-5 w-5" aria-hidden />
            </button>
            <p className="absolute right-3 top-3 rounded-full bg-stone-900/70 px-2.5 py-1 text-xs font-medium text-white" aria-live="polite">
              {index + 1} dari {slides.length}
            </p>
          </>
        )}
      </div>

      {hasMany && (
        <div ref={thumbsRef} className="relative flex gap-2 overflow-x-auto p-0.5">
          {slides.map((slide, position) => (
            <button
              key={slide.id}
              type="button"
              onClick={() => goTo(position)}
              aria-label={`Tampilkan ${slide.media_type === 'photo' ? 'foto' : 'video'} ${position + 1}`}
              aria-current={position === index}
              className={`relative h-16 w-24 shrink-0 overflow-hidden rounded-lg border-2 bg-stone-900 ${
                position === index ? 'border-teal-700' : 'border-transparent'
              }`}
            >
              {slide.media_type === 'photo' ? (
                <img src={slide.url} alt="" loading="lazy" className="h-full w-full object-cover" />
              ) : (
                <>
                  <video src={slide.url} muted preload="metadata" tabIndex={-1} className="pointer-events-none h-full w-full object-cover" />
                  <span className="absolute inset-0 flex items-center justify-center text-white">
                    <Play className="h-5 w-5 fill-current" aria-hidden />
                  </span>
                </>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
