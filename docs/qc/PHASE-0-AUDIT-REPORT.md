# SafeRoad — Phase 0 Audit & QC Report

**Status:** PASS WITH ISSUES  
**Tanggal audit:** 15 November 2026  
**Repository:** imdadhabibi/Safe-Road  
**Branch yang diperiksa:** main

## 1. Ringkasan eksekutif

Repository produksi saat audit hanya memiliki satu file `index.html`. Belum ada Vite/React, struktur `src/`, test suite, Supabase, database, autentikasi, maupun penyimpanan laporan. Prototipe adalah satu file HTML/CSS/JavaScript dan belum siap untuk operasional multi-pengguna.

Sumber historis operasional wajib mengikuti keputusan produk:
- `Fix`: titik kecelakaan (1.081 kejadian).
- `CUSSUM`: 122 segmen Blackspot.
- `EAN & UCL`: 23 ruas Blacklink.

Jangan gunakan script dan JSON analisis versi lama sebagai sumber data produksi karena metode dan jumlah hasilnya berbeda dari sumber yang dipilih pemilik produk.

## 2. Audit repository dan prototipe

| Area | Temuan |
|---|---|
| Repository main | Hanya `index.html` |
| Framework/build | Belum ada package.json, Vite, React, atau konfigurasi build |
| Peta | SVG skematik, bukan Leaflet/OSM |
| Data peta | Data contoh ditanam pada JavaScript |
| GPS | Ada getCurrentPosition, tetapi koordinat submit masih memakai slider simulasi |
| Peringatan | Mengikuti posisi simulasi, belum GPS aktual/watchPosition |
| Laporan | Disimpan dalam array JavaScript di memori; tidak persisten |
| Foto | Input file ada, tetapi belum diunggah ke object storage |
| Admin | Tab verifikasi tidak memiliki autentikasi/otorisasi server |
| Notifikasi | Belum ada integrasi WhatsApp |
| Pengujian | Belum ada test suite/build process |

## 3. Validasi sheet Fix

| Pemeriksaan | Hasil |
|---|---:|
| Record | 1.081 |
| Tanggal minimum | 1 Januari 2025 |
| Tanggal maksimum | 26 Desember 2025 |
| Koordinat lintang/bujur kosong | 0 / 0 |
| Koordinat numerik tidak valid | 0 |
| Duplikat pasangan koordinat (7 desimal) | 0 |
| Korban meninggal | 195 |
| Kolom jumlah luka berat | 0 |
| Korban luka ringan | 1.331 |
| Tingkat Kecelakaan | 898 Ringan; 183 Berat |

Kolom publik yang berpotensi digunakan: tanggal/waktu kejadian, lintang, bujur, Kelompok Jalan, Status Jalan, Tipe/Kategori Kecelakaan, serta agregat korban sesuai persetujuan publikasi. Jangan publikasikan nomor LP, nama pembuat, nama petugas, NRP, nomor polisi, alamat/narasi detail yang mengidentifikasi orang.

Delapan record memiliki longitude < 108.65 sehingga berada di luar bounding box lama pada instruksi prototipe. Batas wilayah final wajib menggunakan poligon administrasi Kabupaten Cilacap, bukan bounding box lama.

Data berakhir pada 26 Desember 2025. Jangan menyebut periode lengkap 1–31 Desember sebelum memastikan ketersediaan data 27–31 Desember.

## 4. Validasi sheet CUSSUM

| Pemeriksaan | Hasil |
|---|---:|
| Total segmen | 421 |
| Blackspot | 122 |
| Bukan Blackspot | 299 |
| Ruas unik yang teridentifikasi | 10 |
| Baris Blackspot tanpa pasangan X/Y | 0 |

Rekap 122 Blackspot:
- Jl. Nasional III: 44
- Jl. Raya Kawunganten: 23
- Jl. Diponegoro: 13
- Jl. Jenderal Sudirman: 10
- Jl. Patimuan-Kedungreja: 9
- Jl. Tentara Pelajar: 7
- Jl. Gatot Subroto: 5
- Jl. Raya Cilacap - Wangon: 5
- Jl. A. Yani Adipala: 3
- Jl. Gerilya: 3

Kolom Q memuat pasangan teks X,Y dan kolom N/O memuat komponen numerik. Nilainya berupa koordinat proyeksi dalam satuan meter, bukan latitude/longitude. Nilainya konsisten secara numerik dengan dugaan Web Mercator/EPSG:3857, tetapi CRS tidak dinyatakan secara eksplisit pada workbook. Simpan X/Y mentah dan jangan gunakan untuk publikasi atau geofence GPS sebelum CRS dikonfirmasi dari sumber GIS.

Satu pasangan koordinat referensi per STA bukan otomatis geometri garis atau titik awal/akhir segmen.

## 5. Validasi sheet EAN & UCL

Ditemukan 23 ruas dengan status Blacklink dan 23 nama ruas unik. Sheet ini menjadi sumber daftar dan atribut analisis Blacklink (total kecelakaan, EAN, UCL, BKA, rank, hasil perbandingan, dan penentuan).

Geometri garis lengkap tidak tersedia dalam sheet. Tiga belas ruas tidak muncul sebagai nama ruas di CUSSUM. Seluruh 23 ruas membutuhkan sumber geometri centerline yang dapat dipertanggungjawabkan dan validasi sebelum digambar sebagai garis atau digunakan untuk peringatan.

## 6. Konflik prototipe/script lama dengan PRD terbaru

Script lama menggunakan DBSCAN radius 150 m untuk membuat 8 klaster Blackspot dan menghitung 5 Blacklink menggunakan jendela 2 km. Ini bukan sumber operasional yang disepakati. JSON lama juga menampilkan angka jalan berlubang dari atribut kondisi permukaan pada data kecelakaan; ini bukan laporan pengguna terverifikasi.

**Keputusan QC:** gunakan hasil sheet CUSSUM dan EAN & UCL sesuai PRD. Jangan menghasilkan label Blackspot/Blacklink baru memakai algoritma lama untuk menggantikan hasil Excel. Riwayat kecelakaan dan laporan jalan berlubang harus tetap terpisah.

## 7. Blocker sebelum implementasi produksi

| ID | Masalah | Tindakan |
|---|---|---|
| B-01 | CRS CUSSUM Q/N/O belum dikonfirmasi | Minta file GIS/metadata atau konfirmasi sumber data |
| B-02 | Geometri garis 23 Blacklink belum lengkap | Telusuri centerline dari sumber GIS dan validasi |
| B-03 | Bounding box lama menolak 8 titik kecelakaan Cilacap | Gunakan poligon batas administrasi Cilacap |
| B-04 | 183 label kecelakaan Berat, tetapi jumlah luka berat 0 | Klarifikasi definisi kolom |
| B-05 | Data berhenti 26 Desember 2025 | Konfirmasi kelengkapan 27–31 Desember |
| B-06 | Bobot IKK pada prototipe adalah asumsi | Jangan tampilkan sebagai indeks resmi tanpa persetujuan |
| B-07 | GPS laporan tidak dipakai saat submit | Implementasikan penyimpanan posisi GPS aktual |
| B-08 | Verifikasi berada di frontend tanpa otorisasi | Gunakan Supabase Auth, RLS dan fungsi server |
| B-09 | Tidak ada backend persisten | Siapkan database dan storage sebelum membuka laporan publik |

## 8. Keputusan arsitektur QC

1. Data historis: `Fix`, `CUSSUM`, dan `EAN & UCL`.
2. Jangan gunakan JSON/script lama sebagai sumber produksi.
3. Pisahkan tabel historis dari laporan dinamis.
4. Bentuk data publik memakai whitelist kolom.
5. Validasi wilayah dengan poligon administrasi.
6. Jangan aktifkan geofence dari koordinat referensi yang belum tervalidasi.
7. Verifikasi harus dilakukan di server/database, bukan sekadar menyembunyikan tombol pada frontend.
8. Lanjutkan pekerjaan pada branch pengembangan; jangan mengubah `main` sebelum QC lulus.

## 9. Rencana Milestone 1

- Buat data dictionary publik/privat.
- Siapkan ekspor tersanitasi 1.081 titik kecelakaan, simpan sebagai staging.
- Siapkan 122 Blackspot dengan STA, atribut, X/Y mentah, dan flag CRS belum dikonfirmasi.
- Siapkan daftar 23 Blacklink dan atribut EAN/UCL/BKA/rank.
- Inventarisasi 23 geometri; tandai yang belum ada.
- Cari poligon batas administrasi Cilacap dengan sumber/metadata.
- Buat QA report koordinat, baris kosong, dan cakupan.

**Batasan:** jangan mengarang koordinat/geometri; jangan menaruh workbook mentah di repository publik; jangan mengaktifkan peringatan GPS sebelum CRS, geometri, dan batas administrasi tervalidasi.

## 10. Kesimpulan

Milestone 0: **PASS WITH ISSUES**. Audit selesai, tetapi B-01 sampai B-06 harus diselesaikan atau diberi status batasan yang disetujui sebelum peta dan analisis dipublikasikan. Tahap berikutnya adalah Milestone 1 — data processing & GIS validation.
