# SimpleCRM AI — PostgreSQL + Railway

MVP CRM tim sales berbasis **Next.js 15, Prisma 6, Auth.js 5, PostgreSQL, OpenAI API**. Tidak menggunakan Supabase.

## Fitur
- Login email/password dengan password di-hash bcrypt, session JWT HttpOnly via Auth.js
- Admin dapat membuat akun sales, input leads dan assign ke sales
- Sales dapat input leads sendiri dan hanya mengakses leads yang ditugaskan kepadanya
- Dashboard, pipeline 4 status, catatan aktivitas, jadwal follow-up, riwayat status
- AI Analyst ringkasan 30 hari terakhir (angka dihitung di server; akses mengikuti role)

## Struktur
- `app/` halaman dan server actions
- `app/api/ai/route.ts` integrasi OpenAI server-side
- `auth.ts` login credentials Auth.js
- `prisma/schema.prisma` model database
- `prisma/migrations/` SQL migration awal
- `prisma/seed.ts` membuat admin pertama secara aman, sekali saja
- `railway.json` perintah build, migrasi, dan start
- `Dockerfile` memastikan folder Prisma ikut ter-copy saat build Railway

## Setup lokal
1. Install Node.js 22 dan PostgreSQL.
2. `npm install`
3. `cp .env.example .env` lalu isi `DATABASE_URL` dan `AUTH_SECRET` (generate: `openssl rand -base64 32`).
4. `npm run db:migrate`
5. Isi `ADMIN_EMAIL`, `ADMIN_PASSWORD` (acak, minimal 16 karakter) dan `ADMIN_NAME` di `.env`.
6. `npm run db:seed` (hanya membuat admin jika belum ada admin).
7. `npm run dev`, buka `http://localhost:3000/login`.

## Deploy Railway dari GitHub
1. Upload **seluruh isi ZIP setelah diekstrak** ke root repository GitHub. Pastikan `prisma/schema.prisma` terlihat di GitHub (bukan hanya `package.json`). Untuk upload folder lengkap secara aman, gunakan GitHub Desktop: File > Add Local Repository (atau Create Repository from Existing Folder) > Publish repository.
2. Railway > New Project > **Deploy from GitHub Repo** > pilih repository.
3. Di project Railway, tambahkan service **PostgreSQL**.
4. Di service Next.js > Variables, set `DATABASE_URL` sebagai **reference variable** ke `DATABASE_URL` service PostgreSQL (contoh Railway: `${{Postgres.DATABASE_URL}}`; sesuaikan nama service). Gunakan koneksi privat internal Railway.
5. Set `AUTH_SECRET` (hasil `openssl rand -base64 32`), `AUTH_TRUST_HOST=true`, `OPENAI_API_KEY`, dan `OPENAI_MODEL=gpt-4.1-mini`.
6. Deploy. `railway.json` menjalankan `prisma migrate deploy` pada **pre-deploy** sebelum server mulai. Jangan jalankan `prisma migrate dev` di production.
7. Settings > Networking > Generate Domain.
8. **Buat admin pertama:** dari lingkungan yang bisa terhubung ke database (mis. Railway CLI dengan variable service yang sesuai atau terminal lokal memakai public database URL sementara), jalankan `npm run db:seed` dengan `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `ADMIN_NAME` tersedia sebagai environment variables. Jangan simpan password seed dalam GitHub; hapus `ADMIN_PASSWORD` dari Railway Variables setelah seed. Jangan pernah menjalankan seed pada setiap deploy.
9. Login sebagai admin; buka menu Pengaturan untuk membuat akun sales.

### Penting untuk Railway
- `DATABASE_URL` harus dapat diakses pada tahap pre-deploy dan runtime.
- `AUTH_SECRET` wajib tetap sama antar deployment supaya sesi tidak terputus.
- Build membutuhkan `prisma generate`, sudah disertakan dalam `npm run build`.
- Bila pre-deploy gagal, periksa `DATABASE_URL`, kesiapan PostgreSQL, dan log migrasi.
- Jika ingin membuat admin lewat Railway CLI, gunakan perintah `railway run npm run db:seed` pada direktori repo dengan service aplikasi terpilih, **tetapi** Railway CLI dapat meneruskan internal URL yang tidak bisa diakses dari laptop. Gunakan shell/container Railway atau URL publik DB yang dibatasi jika perlu.

## Security / batasan MVP
- Semua akses data melalui server actions / server API dan memeriksa role/ownership di server, **bukan** mengandalkan filter browser.
- Tidak ada public signup. Admin awal dibuat via seed; akun sales dibuat admin.
- Password admin tidak di-hardcode dan seed menolak membuat admin kedua.
- Simpan `.env` secara privat. Jangan pernah memasukkan `OPENAI_API_KEY` di client.
- Gunakan HTTPS, backup database, dan batasi akses PostgreSQL publik.
- **Sebelum dipakai produksi:** tambahkan rate limiting login & AI, audit trail perubahan penugasan, reset password yang aman, proteksi brute-force, pengujian akses otomatis, monitoring dan backup terjadwal. Input form menggunakan server validation sederhana; perkuat lagi sesuai kebutuhan bisnis.
- AI saat ini menganalisis maksimal 2.000 leads yang dibuat dalam 30 hari terakhir; laporan ini bukan keseluruhan histori. `closingRate` = won / leads baru periode tersebut, bukan cohort conversion yang matang.
- Versi ini belum diuji deployment end-to-end di akun Railway Anda.

## Migration SQL
Lihat `prisma/migrations/20261024000000_init/migration.sql`. Prisma mengelola versi migration pada tabel `_prisma_migrations`.
