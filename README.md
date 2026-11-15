# SafeRoad — Sistem Informasi Keselamatan Jalan Kabupaten Cilacap

Proyek website SafeRoad mengikuti rancangan visual yang telah disetujui: header putih, hero dua kolom, kartu peta risiko, empat statistik, peta Leaflet, panel layer, tabel analisis, form pelaporan, dan halaman admin demo.

## Struktur repository

```text
Safe-Road/
├── index.html
├── admin.html
├── styles.css
├── js/
│   ├── app.js
│   ├── admin.js
│   └── store.js
├── data/
│   ├── accidents-coordinates.json
│   ├── accidents-coordinates.part-01.b64 ... part-06.b64
│   ├── blackspot-segments.json.gz.b64
│   ├── blacklink-roads.json.gz.b64
│   └── public-data-qa.json.gz.b64
├── docs/
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
- 23 ruas Jalan Blacklink berasal dari sheet `EAN & UCL`; ditampilkan pada tabel analisis. Geometri garis belum dipublikasikan karena 13 ruas belum memiliki geometri yang tervalidasi.
- Titik kecelakaan historis bukan otomatis Blackspot atau Blacklink.

## Menjalankan secara lokal di Windows

1. Clone repository atau unduh source branch ini.
2. Buka folder repository di VS Code.
3. Jalankan `start-local.bat` (memerlukan Python) atau extension Live Server.
4. Buka alamat lokal yang ditampilkan, biasanya `http://localhost:5500`.

Jangan membuka HTML menggunakan skema `file://`, karena browser dapat memblokir pemuatan GeoJSON/JSON melalui `fetch()`.

## Fungsi yang dapat diuji

- Peta Leaflet + OpenStreetMap, 1.081 titik historis, dan tombol GPS.
- Tabel 122 Blackspot dan 23 Blacklink.
- Form laporan foto, deskripsi, nama ruas, GPS atau pin manual, dan persetujuan.
- Laporan disimpan menggunakan IndexedDB pada browser/perangkat yang sama.
- Admin demo dapat membaca antrean, memeriksa foto/koordinat, mengubah status, dan menyimpan riwayat status pada browser yang sama.

## Batasan penting

**Ini prototipe demo, belum menjadi sistem multi-pengguna produksi.**

- IndexedDB menyimpan data secara lokal di perangkat/browser. Laporan dari HP tidak otomatis terlihat di laptop atau petugas lain.
- `admin.html` adalah dashboard DEMO tanpa autentikasi dan otorisasi server. Siapa pun yang membuka halaman tersebut dapat mengakses layar demo; jangan digunakan untuk operasi petugas sesungguhnya.
- Sebelum aplikasi digunakan publik untuk menerima laporan nyata, wajib integrasikan Supabase Auth, PostgreSQL + Row Level Security, Storage policies, dan server-side admin roles.
- GPS memerlukan izin browser dan HTTPS atau localhost.
- Peta dasar memerlukan internet untuk Leaflet CDN dan tile OpenStreetMap.
- Radius peringatan GPS masih merupakan pratinjau; Blackspot/Blacklink belum digunakan sebagai pemicu peringatan.
- Koordinat proyeksi CUSSUM dan centerline Blacklink belum tervalidasi sehingga layer tersebut hanya tersedia di tabel analisis.

## Privasi

Workbook Excel mentah tidak disertakan dalam repository. Jangan mengunggah file Excel asli, kredensial, `.env`, identitas petugas, NRP, nomor laporan polisi, nomor kendaraan, atau narasi pribadi. `.gitignore` melindungi beberapa pola file saat menggunakan Git, tetapi upload manual melalui GitHub tetap perlu diperiksa.

## Dokumentasi

- [PRD SafeRoad](docs/PRD_SafeRoad.md)
- [Laporan Audit dan QC Milestone 0](docs/qc/PHASE-0-AUDIT-REPORT.md)
- [Panduan GitHub Pages](GITHUB-PAGES.md)
