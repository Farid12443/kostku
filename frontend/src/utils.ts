import axios from 'axios';

const numberFormat = new Intl.NumberFormat('id-ID');

export function formatRupiah(value: number): string {
  return `Rp ${numberFormat.format(value)}`;
}

// Tanggal tanpa jam dari backend (YYYY-MM-DD), dibaca sebagai UTC agar harinya tidak bergeser
export function formatDate(value: string): string {
  return new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeZone: 'UTC' }).format(new Date(value));
}

export function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}

export function todayIso(): string {
  const now = new Date();
  return new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}

export function whatsappUrl(phone: string): string {
  return `https://wa.me/${phone.replace(/\D/g, '')}`;
}

export function errorMessage(error: unknown, fallback = 'Terjadi kesalahan, coba lagi.'): string {
  if (axios.isAxiosError(error)) {
    const detail = error.response?.data?.detail;
    if (typeof detail === 'string') return detail;
    if (Array.isArray(detail) && detail[0]?.loc) {
      return `Periksa kembali isian: ${detail[0].loc[detail[0].loc.length - 1]}`;
    }
    if (!error.response) return 'Tidak dapat terhubung ke server.';
  }
  return fallback;
}

export const ROOM_TYPE_LABELS: Record<string, string> = {
  putra: 'Putra',
  putri: 'Putri',
  campur: 'Campur',
};
