# PATRAHNIBATA

Aplikasi web untuk membuat dan mengelola silsilah keluarga dengan kanvas drag-and-drop.

## Supabase Setup

Secara default aplikasi tetap bisa berjalan dengan penyimpanan lokal browser. Untuk penyimpanan permanen di database:

1. Buat project di Supabase.
2. Buka Supabase SQL Editor, lalu jalankan isi [supabase/schema.sql](/Users/mac/patrahnibata/supabase/schema.sql).
3. Duplikasi `.env.example` menjadi `.env`.
4. Isi `VITE_SUPABASE_URL` dan `VITE_SUPABASE_ANON_KEY` dari Supabase Project Settings.
5. Restart dev server.

Header aplikasi akan menampilkan status penyimpanan:

- `Supabase`: data tersimpan ke Supabase.
- `Lokal`: Supabase belum dikonfigurasi, data tersimpan di browser.
- `Offline`: Supabase dikonfigurasi, tetapi request terakhir gagal sehingga cadangan lokal tetap dipakai.

Catatan keamanan: schema saat ini dibuat untuk prototype tanpa login. Untuk data keluarga sungguhan yang sensitif, langkah berikutnya adalah menambahkan Supabase Auth agar setiap user hanya bisa membaca dan mengubah data miliknya sendiri.

## Development

```bash
npm run dev
```

## Build

```bash
npm run build
```
