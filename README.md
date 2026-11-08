# Web Sewa Kamar Kos

Website sewa kamar untuk satu kos milik satu pemilik. Calon penyewa bisa melihat kamar lengkap dengan foto dan video, booking, lalu upload bukti bayar. Pemilik mengelola semuanya lewat dashboard admin.

## Fitur

**Penyewa (user)**
- Register dan login
- Cari dan filter kamar (tipe, harga, fasilitas)
- Lihat detail kamar: galeri foto, video tur, fasilitas, harga
- Ajukan sewa (tanggal mulai dan durasi)
- Upload bukti pembayaran, pantau status booking dan sisa tagihan

**Pemilik (admin)**
- Dashboard: jumlah kamar (tersedia, terisi, perawatan), booking dan pembayaran pending, pendapatan bulanan
- CRUD kamar dan fasilitas, upload banyak foto dan video per kamar, atur foto cover
- Approve, tolak, aktifkan, dan selesaikan booking
- Verifikasi atau tolak bukti pembayaran
- Kelola penyewa dan profil kos (alamat, kontak, aturan, rekening)

## Tech Stack

| Bagian | Teknologi |
|---|---|
| Backend | Python 3.11+, FastAPI, SQLAlchemy 2, Pydantic v2, JWT |
| Database | PostgreSQL |
| Frontend | React, Vite, TypeScript, Tailwind CSS, React Router, TanStack Query |

## Prasyarat

- Python 3.11 atau lebih baru
- Node.js 18 atau lebih baru (disarankan 20 LTS)
- PostgreSQL berjalan di lokal

## Struktur Folder

```
.
├── AGENTS.md        instruksi lengkap untuk AI agent
├── README.md
├── backend/         API FastAPI
│   ├── app/         kode aplikasi (models, routers, services, seed)
│   ├── tests/
│   ├── uploads/     file foto, video, bukti bayar (dibuat otomatis)
│   └── requirements.txt
└── frontend/        aplikasi React
    └── src/
```

## Cara Menjalankan

### 1. Buat database

Jalankan sekali lewat psql atau pgAdmin:

```sql
CREATE DATABASE kos;
```

### 2. Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env             # Windows: copy .env.example .env
```

Buka `backend/.env`, sesuaikan `DATABASE_URL` dengan user dan password PostgreSQL kamu, lalu ganti `SECRET_KEY` dengan string acak yang panjang.

```bash
uvicorn app.main:app --reload --port 8000
```

Saat pertama kali jalan, tabel dibuat otomatis dan data awal (seed) dimasukkan.

- API: http://localhost:8000
- Dokumentasi API (Swagger): http://localhost:8000/docs

### 3. Frontend

Buka terminal baru:

```bash
cd frontend
npm install
npm run dev
```

Buka http://localhost:5173. Request ke `/api` dan `/uploads` otomatis diteruskan ke backend lewat proxy Vite.

## Akun Awal (Seed)

| Role | Email | Password |
|---|---|---|
| Admin | admin@kos.local | Admin12345 |
| User | user@kos.local | User12345 |

Ganti password admin lewat `ADMIN_PASSWORD` di `.env` sebelum database pertama kali dibuat, atau ubah langsung di database setelahnya. Akun user demo hanya untuk uji coba, hapus sebelum dipakai sungguhan.

Seed juga mengisi profil kos contoh, 8 fasilitas, dan 6 kamar contoh tanpa media. Kamar tanpa foto menampilkan placeholder.

## Konfigurasi (`backend/.env`)

| Variabel | Fungsi |
|---|---|
| `DATABASE_URL` | Koneksi PostgreSQL, contoh `postgresql+psycopg://postgres:postgres@localhost:5432/kos` |
| `SECRET_KEY` | Kunci penandatangan JWT, wajib diganti |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | Masa berlaku token login |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `ADMIN_NAME` | Akun admin yang dibuat saat seed |
| `CORS_ORIGINS` | Origin frontend yang diizinkan |
| `MAX_PHOTO_MB`, `MAX_VIDEO_MB`, `MAX_PROOF_MB` | Batas ukuran upload |

## Alur Penggunaan

1. Penyewa memilih kamar, mengisi tanggal mulai dan durasi, lalu menekan **Sewa Sekarang**. Booking berstatus `pending`.
2. Admin meninjau booking lalu **Approve** atau **Reject**. Saat di-approve, kamar otomatis berstatus `occupied`.
3. Penyewa membuka detail booking, melihat info rekening kos, transfer, lalu upload bukti bayar.
4. Admin memverifikasi pembayaran. Jika total pembayaran terverifikasi sudah menutup tagihan, booking otomatis menjadi `active`.
5. Setelah masa sewa berakhir, admin menandai booking `finished` dan kamar kembali `available`.

Status booking: `pending`, `approved`, `active`, `finished`, `rejected`, `cancelled`.

## Aturan Upload

| Jenis | Format | Batas default |
|---|---|---|
| Foto kamar | jpg, jpeg, png, webp | 5 MB |
| Video kamar | mp4, webm | 50 MB |
| Bukti bayar | jpg, jpeg, png, webp | 5 MB |

File disimpan di `backend/uploads/` dengan nama acak dan diakses lewat `/uploads/...`.

## Testing

```bash
cd backend
pytest
```

Test memakai SQLite in-memory, jadi data PostgreSQL kamu tidak tersentuh. Cakupan utama: alur login, booking, cegah double booking, approve, pembayaran, dan perubahan status kamar.

Untuk memastikan frontend bisa di-build:

```bash
cd frontend
npm run build
```

## Troubleshooting

| Masalah | Solusi |
|---|---|
| Backend gagal start dengan error koneksi | Cek PostgreSQL sudah jalan, database `kos` sudah dibuat, dan `DATABASE_URL` di `.env` benar |
| `password authentication failed` | User atau password di `DATABASE_URL` tidak cocok dengan PostgreSQL lokal |
| Frontend tidak bisa memanggil API | Pastikan backend jalan di port 8000 dan frontend dijalankan lewat `npm run dev` (proxy aktif) |
| Upload video ditolak | Cek format mp4 atau webm dan ukuran di bawah `MAX_VIDEO_MB` |
| Foto atau video tidak tampil | Pastikan folder `backend/uploads/` ada dan backend berjalan |

## Deploy Singkat

- Jalankan backend dengan `uvicorn app.main:app --host 0.0.0.0 --port 8000` di belakang Nginx atau reverse proxy lain.
- Build frontend dengan `npm run build`, lalu sajikan folder `frontend/dist` lewat Nginx dan arahkan `/api` serta `/uploads` ke backend.
- Wajib ganti `SECRET_KEY` dan password admin, dan pakai HTTPS.
- Backup rutin database PostgreSQL dan folder `backend/uploads/`.

## Catatan Keputusan

- Database memakai PostgreSQL sesuai tech stack. `.env.example` diarahkan ke PostgreSQL walaupun contoh di AGENTS.md memakai SQLite. Kode tetap mendukung SQLite lewat `DATABASE_URL`.
- SQLAlchemy 2.1 memakai driver `psycopg` (versi 3) untuk URL `postgresql://`, jadi `requirements.txt` memakai `psycopg[binary]`.
- Login menerima email sebagai teks biasa karena validator email menolak domain khusus seperti akun seed `@kos.local`. Register publik tetap memvalidasi format email.
- Filter fasilitas pada `/api/rooms` menampilkan kamar yang memiliki semua fasilitas yang dipilih.
- Menghapus kamar hanya ditolak jika ada booking `approved` atau `active`. Booking lain beserta pembayaran dan file buktinya ikut terhapus.
- Bukti bayar yang ditolak tetap disimpan agar riwayat dan alasan penolakan bisa dilihat. File baru dihapus saat data pembayarannya dihapus.
- Bukti bayar dilayani lewat static mount `/uploads` sesuai spesifikasi, dilindungi nama file UUID dan bukan oleh login.
- Menghapus foto cover otomatis menjadikan foto berikutnya sebagai cover.
- `GET /api/admin/facilities` mengembalikan daftar biasa karena datanya kecil. Daftar admin lain memakai paginasi.

## Rencana Pengembangan

Payment gateway, notifikasi email atau WhatsApp otomatis, ulasan penyewa, migrasi database dengan Alembic, dan Docker.