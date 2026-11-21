# SafeRoad — Sistem Informasi Keselamatan Jalan Kabupaten Cilacap

Proyek website SafeRoad mengikuti rancangan visual yang telah disetujui: header putih, hero dua kolom, kartu peta risiko, empat statistik, peta Leaflet, panel layer, tabel analisis, form pelaporan, dan halaman admin.

## Struktur repository

```text
Safe-Road/
├── index.html
├── admin.html
├── login.html
├── styles.css
├── js/
│   ├── app.js
│   ├── admin.js
│   ├── store.js
│   ├── supabase-config.js
│   ├── supabase-client.js
│   └── admin-gate.js
├── data/
│   ├── accidents-coordinates.json
│   ├── accidents-coordinates.part-01.b64 ... part-06.b64
│   ├── blackspot-segments.json.gz.b64
│   ├── blacklink-roads.json.gz.b64
│   └── public-data-qa.json.gz.b64
├── supabase/
│   └── setup.sql
├── docs/
│   └── SUPABASE-SETUP.md
│   ├── PRD_SafeRoad.md
│   └── qc/PHASE-0-AUDIT-REPORT.md
├── scripts/
├── package.json
├── .gitignore
├── README.md
└── GITHUB-PAGES.md
```

## Data publik

- 1.081 titik kecelakaan historis berasal dari sheet `Fix`. Arsip peta berisi pasangan koordinat publik saja; tidak menyertakan nomor laporan polisi, NRP, nama petugas, nomor kendaraan, atau narasi pribadi.
- 122 segmen Jalan Blackspot berasal dari sheet `CUSSUM`; ditampilkan pada tabel analisis. Titik/garis belum digambar pada peta karena CRS dan makna kolom Q terhadap STA masih perlu konfirmasi.
- 23 ruas Jalan Blacklink berasal dari sheet `EAN & UCL`; ditampilkan pada tabel analisis. Geometri dari GeoPackage tersedia sebagai 64 segmen pada 10 ruas dan ditampilkan sebagai layer ungu. Tiga belas ruas lainnya tetap ada di tabel tanpa garis perkiraan.
- Titik kecelakaan historis bukan otomatis Blackspot atau Blacklink.

## Menjalankan secara lokal di Windows

1. Clone repository atau unduh source branch ini.
2. Buka folder repository di VS Code.
3. Jalankan `start-local.bat` (memerlukan Python) atau extension Live Server.
4. Buka alamat lokal yang ditampilkan, biasanya `http://localhost:5500`.

Jangan membuka HTML menggunakan skema `file://`, karena browser dapat memblokir pemuatan GeoJSON/JSON melalui `fetch()`.

## Fungsi yang dapat diuji

- Peta Leaflet + OpenStreetMap, 1.081 titik historis, 64 segmen garis Blacklink pada 10 ruas (layer ungu), dan tombol GPS.
- Tabel 122 Blackspot dan 23 Blacklink.
- Form laporan foto, deskripsi, nama ruas, GPS atau pin manual, dan persetujuan.
- Source form laporan mengirim data dan foto ke Supabase; uji end-to-end lintas perangkat masih perlu dilakukan.
- Admin masuk menggunakan Supabase Auth, lalu dapat membaca antrean, memeriksa foto/koordinat, mengubah status, dan menyimpan riwayat status pada database online.

## Batasan penting

**Status audit 21 November 2026:** proyek Supabase aktif dan tabel `public.reports` sudah tersedia dengan RLS aktif. Source frontend menggunakan Supabase Auth, Database, dan Storage. Meski demikian, alur end-to-end lintas perangkat, email confirmation, dan seluruh skenario pengujian masih harus dibuktikan sebelum penggunaan operasional.

- Konfigurasi frontend menggunakan Project URL dan Publishable Key pada `js/supabase-config.js`. Jangan pernah menaruh Secret/service_role key di browser.
- `admin.html` dilindungi Supabase Auth dan PostgreSQL Row Level Security. Admin harus dibuat di Supabase Auth lalu diberi `app_metadata.role = admin` sesuai `docs/SUPABASE-SETUP.md`.
- Public hanya dapat mengirim laporan dan melihat titik bahaya yang sudah terverifikasi (kolom publik minimum). Hanya admin yang dapat melihat antrean, identitas pelapor, foto privat, catatan verifikasi, mengubah status, dan menghapus laporan.
- GPS memerlukan izin browser dan HTTPS atau localhost.
- Peta dasar memerlukan internet untuk Leaflet CDN dan tile OpenStreetMap.
- Radius peringatan GPS masih merupakan pratinjau; Blackspot/Blacklink belum digunakan sebagai pemicu peringatan.
- Geometri Blacklink dari GeoPackage sudah tersedia untuk 10 dari 23 ruas (64 fitur garis), dikonversi EPSG:32749 ke WGS84 dan ditampilkan sebagai layer ungu. Tiga belas ruas lain tetap ada di tabel tanpa garis. Geometri Blackspot dari kolom Q CUSSUM masih menunggu konfirmasi CRS.

## Privasi

Workbook Excel mentah tidak disertakan dalam repository. Jangan mengunggah file Excel asli, kredensial, `.env`, identitas petugas, NRP, nomor laporan polisi, nomor kendaraan, atau narasi pribadi. `.gitignore` melindungi beberapa pola file saat menggunakan Git, tetapi upload manual melalui GitHub tetap perlu diperiksa.

## Setup backend Supabase

Ikuti [panduan setup Supabase](docs/SUPABASE-SETUP.md). Salin `js/supabase-config.js` dan isi Project URL serta Publishable Key. Jangan pernah menaruh `service_role` atau Secret key pada kode browser.

## Dokumentasi

- [PRD SafeRoad](docs/PRD_SafeRoad.md)
- [Laporan Audit dan QC Milestone 0](docs/qc/PHASE-0-AUDIT-REPORT.md)
- [Panduan GitHub Pages](GITHUB-PAGES.md)
- [Validasi dan integrasi GeoPackage Blacklink](docs/GIS-BLACKLINK-GEOPACKAGE.md)
- [Data Dictionary](docs/DATA-DICTIONARY.md)
- [Rencana pengujian 10 laporan](docs/HASIL-PENGUJIAN-10-LAPORAN.md)
- [Verifikasi lima lokasi Blackspot](docs/VERIFIKASI-5-LOKASI-BLACKSPOT.md)
