# PRD SafeRoad — Sistem Informasi Keselamatan Jalan Kabupaten Cilacap

**Versi:** 1.0  
**Status:** Draft kebutuhan disepakati untuk pengembangan bertahap  
**Wilayah:** Kabupaten Cilacap, Jawa Tengah  
**Data historis utama:** kecelakaan tahun 2025

## 1. Ringkasan produk

SafeRoad adalah website informasi keselamatan jalan yang menggabungkan data kecelakaan historis, hasil analisis Jalan Blackspot dan Jalan Blacklink, lokasi pengguna melalui GPS, serta pelaporan jalan berlubang oleh masyarakat yang diverifikasi admin.

Riwayat kecelakaan dan laporan jalan berlubang harus disimpan dan dikelola terpisah. Data historis tidak boleh berubah ketika laporan masyarakat masuk. Laporan yang belum diverifikasi tidak boleh diperlakukan sebagai bahaya terkonfirmasi.

## 2. Pengguna dan peran

### Pengunjung publik
Dapat membuka beranda, peta keselamatan, data kecelakaan historis, Jalan Blackspot, dan Jalan Blacklink tanpa login.

### Pengguna terdaftar
Wajib login untuk mengirim laporan jalan berlubang dan melihat riwayat/status laporannya sendiri. Form memuat foto, nama ruas, deskripsi, koordinat GPS atau pin peta, waktu otomatis, dan persetujuan pelaporan.

### Admin petugas
Terdapat beberapa akun admin dengan hak verifikasi yang sama. Akses admin harus melalui autentikasi dan otorisasi sisi server/database, bukan hanya tab tersembunyi di frontend.

## 3. Cakupan fitur

### 3.1 Peta keselamatan
Peta menggunakan Leaflet dan tile OpenStreetMap dengan atribusi yang sesuai. Layer yang dapat diaktifkan/nonaktifkan:
- Riwayat kecelakaan: merah.
- Jalan Blackspot: merah tua.
- Jalan Blacklink: ungu.
- Jalan berlubang terverifikasi: kuning/oranye.
- Posisi pengguna: biru.

Peta menyediakan detail objek saat marker/ruas dipilih. Data historis dan laporan dinamis tetap dibedakan secara visual dan struktural.

### 3.2 GPS dan peringatan
- Tampilkan posisi pengguna setelah izin lokasi diberikan.
- Ambil koordinat otomatis ketika mengirim laporan, dengan opsi penyesuaian pin.
- Berikan peringatan ketika mendekati Blackspot, Blacklink, atau lubang jalan yang telah terverifikasi.
- GPS/alert hanya dijanjikan bekerja saat website aktif dan izin lokasi diberikan. Jangan menjanjikan alert ketika browser ditutup atau layar terkunci.
- Radius peringatan harus menjadi konfigurasi dan diuji di lapangan.
- Jangan mengaktifkan geofence dari koordinat/geometry yang CRS atau validitasnya belum dikonfirmasi.

### 3.3 Pelaporan jalan berlubang
- Cakupan laporan: seluruh Kabupaten Cilacap.
- Pengguna wajib login.
- Wajib foto, deskripsi dan lokasi; koordinat GPS otomatis, dengan opsi pin manual.
- Simpan waktu pelaporan dan nomor laporan unik.
- Simpan status awal Menunggu Verifikasi.
- Deteksi potensi duplikat untuk membantu admin, bukan secara otomatis menyimpulkan laporan palsu.
- Hanya laporan Terverifikasi yang ditampilkan sebagai hazard terkonfirmasi pada peta publik.
- Laporan Menunggu Verifikasi/Perlu Pemeriksaan Lebih Lanjut hanya terlihat oleh pelapor dan admin.

### 3.4 Verifikasi admin
Admin dapat melihat antrean, foto, lokasi, waktu, deskripsi, kemungkinan duplikasi, dan riwayat laporan. Setiap keputusan harus mencatat admin, waktu, status lama/baru, dan alasan.

Status:
1. Menunggu Verifikasi
2. Terverifikasi
3. Perlu Pemeriksaan Lebih Lanjut
4. Ditolak
5. Sudah Ditangani

Terverifikasi tidak berarti jalan sudah diperbaiki. Sudah Ditangani memerlukan konfirmasi atau bukti terpisah.

### 3.5 Notifikasi
Notifikasi WhatsApp kepada pelapor dilakukan melalui provider/API resmi, hanya setelah nomor tersedia dan persetujuan penerima tercatat. Rahasia API disimpan di server-side, bukan frontend.

## 4. Sumber data resmi untuk aplikasi

| Fitur | Sheet Excel | Ketentuan |
|---|---|---|
| Titik kecelakaan historis | `Fix` | 1.081 kejadian; gunakan koordinat lintang/bujur sumber |
| Jalan Blackspot | `CUSSUM` | 122 segmen; gunakan label dan atribut sumber |
| Rekap Jalan Blackspot | `CUSSUM` | Rekap mengikuti hasil CUSSUM yang dipilih pemilik produk |
| Jalan Blacklink | `EAN & UCL` | 23 ruas; geometri perlu divalidasi |

Jangan mengganti data sumber tersebut dengan hasil algoritma alternatif. Jangan geocode ulang koordinat kecelakaan yang telah tersedia.

Kolom Q pada CUSSUM berisi pasangan X,Y proyeksi dalam meter. CRS belum dinyatakan secara eksplisit. Simpan X/Y mentah; konfirmasi CRS sebelum mengubahnya ke WGS84 atau memakai hasilnya untuk peta publik/geofence.

Tiga belas dari 23 ruas Blacklink belum memiliki geometri ruas yang dapat dipastikan dari workbook. Telusuri geometri melalui sumber peta/GIS yang dapat dipertanggungjawabkan dan lakukan validasi sebelum menampilkan garis operasional.

## 5. Privasi dan keamanan data

Jangan menampilkan kepada publik atau mengirim ke payload frontend:
- Nomor laporan kecelakaan/kepolisian.
- Nama petugas/pelapor dari data sumber.
- NRP petugas.
- Nomor polisi kendaraan.
- Narasi kejadian yang memuat informasi pribadi.
- Alamat/nama individu atau atribut lain yang mengidentifikasi seseorang.

Buat whitelist kolom publik dan validasi di sisi server. Workbook asli tidak boleh disimpan di repository publik, folder public, atau hosting. Terapkan Supabase Auth, Row Level Security, aturan Storage, dan audit trail.

## 6. Teknologi yang disepakati

- GitHub Pages: frontend statis.
- Supabase Auth: registrasi/login pengguna dan login admin.
- Supabase PostgreSQL + RLS: penyimpanan dan kontrol akses.
- Supabase Storage: foto laporan.
- Supabase Edge Functions: logika sensitif dan notifikasi WhatsApp.
- Leaflet + OpenStreetMap: peta.

GitHub Pages tidak menjadi backend dan tidak menyimpan laporan pengguna secara aman dengan sendirinya.

## 7. Entitas database yang direncanakan

- `profiles`: profil pengguna.
- `admins`: daftar akun petugas/admin terotorisasi.
- `accident_events`: titik kecelakaan historis dengan kolom publik tersaring.
- `blackspot_segments`: segmen Blackspot, STA, atribut, koordinat dan status validasi CRS.
- `blacklink_roads`: 23 ruas Blacklink, atribut analisis, geometri dan status validasi.
- `pothole_reports`: laporan jalan berlubang.
- `report_status_history`: audit trail keputusan/status.
- `notification_log`: catatan pengiriman notifikasi.
- `system_settings`: radius peringatan dan pengaturan sistem.

## 8. Kriteria penerimaan utama

1. Peta menampilkan titik kecelakaan dan data Blackspot/Blacklink sesuai sheet sumber, tidak memakai data simulasi.
2. Geometri yang belum tervalidasi tidak digambar sebagai garis pasti dan tidak memicu geofence.
3. GPS laporan memakai posisi perangkat aktual atau pin yang secara eksplisit dipilih pengguna, bukan slider simulasi.
4. Hanya pengguna terautentikasi dapat mengirim dan memeriksa laporan miliknya.
5. Hanya admin terotorisasi yang dapat mengubah status laporan.
6. Setiap perubahan status menghasilkan audit trail.
7. Data pribadi tidak pernah masuk ke data publik.
8. Laporan belum diverifikasi tidak muncul sebagai hazard terkonfirmasi kepada publik.
9. Layout berfungsi pada ponsel dan desktop.
10. Build dan pengujian otomatis lulus sebelum deployment.

## 9. Keputusan yang masih terbuka

- Konfirmasi CRS CUSSUM dan arti lokasi koordinat relatif terhadap STA.
- Validasi geometri 23 Blacklink.
- Sumber poligon batas administrasi Kabupaten Cilacap.
- Klarifikasi kolom kategori kecelakaan Berat versus jumlah luka berat = 0.
- Konfirmasi apakah data 27–31 Desember 2025 tidak tersedia.
- Persetujuan bobot/definisi IKK sebelum ditampilkan sebagai indeks resmi.
- Radius peringatan final melalui uji lapangan.
- SOP admin, bukti minimal verifikasi, dan konfirmasi status Sudah Ditangani.
- Provider WhatsApp resmi, template, persetujuan dan anggaran.

## 10. Rencana milestone

0. Audit repository dan validasi awal data.
1. Data processing aman, CRS, batas administrasi dan GIS.
2. Frontend, peta dan layer.
3. Supabase, autentikasi dan hak akses.
4. Form laporan, dashboard admin dan audit trail.
5. GPS/geofence dan WhatsApp.
6. Uji lapangan, evaluasi kebutuhan masyarakat dan deployment.

Setiap milestone harus melewati QC sebelum tahap berikutnya dimulai.
