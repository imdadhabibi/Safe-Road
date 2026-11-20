# Panduan GitHub Pages — SafeRoad

## File yang wajib berada di root repository

```text
repository-root/
├── index.html
├── admin.html
├── styles.css
├── js/
│   ├── app.js
│   ├── admin.js
│   └── store.js
└── data/
    ├── accidents-coordinates.json
    ├── accidents-coordinates.part-01.b64 ... part-06.b64
    ├── blackspot-segments.json.gz.b64
    ├── blacklink-roads.json.gz.b64
    └── public-data-qa.json.gz.b64
```

**Jangan unggah hanya `index.html` dan `admin.html`.** Keduanya membutuhkan stylesheet, JavaScript, dan berkas data di lokasi persis seperti struktur di atas.

## Cara mengaktifkan hosting

1. Buka repository GitHub.
2. Pilih branch yang ingin diterbitkan, saat ini `qc/phase-0-audit`.
3. Buka **Settings → Pages**.
4. Di bagian Build and deployment pilih **Deploy from a branch**.
5. Pilih branch `qc/phase-0-audit` dan folder `/(root)`.
6. Klik **Save**.
7. Buka tab **Actions** dan tunggu workflow Pages berhasil.
8. URL project site biasanya `https://USERNAME.github.io/REPOSITORY/`.

Mengaktifkan Pages dari branch pengembangan akan memublikasikan semua file yang berada di branch tersebut. Pastikan tidak ada file rahasia sebelum diaktifkan.

## Peringatan admin demo

`admin.html` di branch ini masih dashboard demo lokal tanpa login atau keamanan server. Jika GitHub Pages diaktifkan, URL `/admin.html` dapat dibuka oleh siapa pun. Data demo berada pada IndexedDB browser lokal; halaman ini bukan panel admin yang aman dan tidak dapat menerima laporan lintas perangkat.

Untuk uji visual publik, pertimbangkan menghapus tombol/link Admin dan jangan menganggap demo sebagai alur verifikasi nyata. Sebelum dashboard admin dibuka untuk petugas, implementasikan Supabase Auth, role admin yang diverifikasi server-side, RLS, Storage policies, dan audit trail database.

## Fitur laporan saat ini

Form dapat digunakan untuk pengujian demo pada browser yang sama. Laporan, foto, dan status tersimpan di IndexedDB lokal. Data tersebut tidak dikirim ke server dan tidak terlihat di browser/perangkat lain.

## Keamanan data

Workbook Excel mentah tidak terdapat pada repository. Jangan mengunggah `.xlsx`, `.xls`, `.env`, API key, nomor laporan polisi, NRP, nama petugas, nomor polisi kendaraan, atau data pribadi lainnya. Periksa daftar file yang akan di-commit sebelum menekan Commit changes.
