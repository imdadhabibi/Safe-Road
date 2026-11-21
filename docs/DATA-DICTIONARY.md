# Data Dictionary SafeRoad

Dokumen ini mendeskripsikan struktur yang dapat diverifikasi pada source repository dan database Supabase saat audit 21 November 2026. Nama/tipe kolom database mengikuti schema aktual `public.reports`. Struktur atribut lengkap file historis terkompresi masih perlu diekstrak dan dibandingkan dengan workbook sumber sebelum dianggap final.

## A. Database dinamis: public.reports

| Kolom | Tipe PostgreSQL | Null | Keterangan |
|---|---|---:|---|
| id | text (PK) | Tidak | ID laporan SafeRoad, dibuat aplikasi |
| reporter_name | text | Ya | Nama pelapor; maksimum 80 karakter |
| reporter_contact | text | Ya | Kontak pelapor opsional; maksimum 25 karakter |
| road_name | text | Tidak | Nama ruas jalan; 1–120 karakter |
| description | text | Tidak | Deskripsi kerusakan; 1–1.200 karakter |
| latitude | double precision | Tidak | Latitude WGS84; rentang -90 sampai 90 |
| longitude | double precision | Tidak | Longitude WGS84; rentang -180 sampai 180 |
| photo_path | text | Tidak | Path objek foto pada bucket privat; harus diawali incoming/ |
| photo_type | text | Tidak | MIME foto: image/jpeg, image/png, atau image/webp |
| status | text | Tidak | Menunggu Verifikasi, Terverifikasi, Perlu Pemeriksaan Lebih Lanjut, Ditolak, atau Sudah Ditangani |
| admin_note | text | Ya | Catatan pemeriksaan admin; tidak untuk publik |
| history | jsonb | Tidak | Array riwayat perubahan status |
| created_at | timestamptz | Tidak | Waktu laporan dibuat; default now() |
| updated_at | timestamptz | Ya | Waktu perubahan terakhir |
| verified_at | timestamptz | Ya | Waktu laporan diverifikasi |
| verified_by | uuid | Ya | ID akun admin yang memverifikasi; FK auth.users |
| reporter_user_id | uuid | Ya | ID akun pelapor; FK auth.users; NULL untuk laporan tamu |
| tracking_token_hash | text | Ya | Hash SHA-256 kode pelacakan tamu/pelaporan; token asli tidak disimpan |

### Nilai status
- `Menunggu Verifikasi`: laporan baru dan belum diperiksa.
- `Terverifikasi`: laporan dinyatakan valid oleh admin.
- `Perlu Pemeriksaan Lebih Lanjut`: bukti/lokasi perlu ditinjau.
- `Ditolak`: laporan tidak memenuhi kriteria; admin sebaiknya mencatat alasan.
- `Sudah Ditangani`: kerusakan telah ditangani; catatan penanganan perlu diisi.

## B. Dataset historis publik

| Dataset | Sumber yang disebut dalam dokumentasi | Isi yang diketahui | Batasan |
|---|---|---|---|
| Titik kecelakaan | Sheet Fix | 1.081 catatan; file koordinat publik menyimpan pasangan koordinat dengan presisi 6 desimal | File manifest menyatakan gzip+base64 JSON coordinate pairs. Atribut detail lainnya belum dipastikan dari manifest saja |
| Blackspot | Sheet CUSSUM | 122 segmen berstatus Blackspot | Kolom Q adalah pasangan X/Y proyeksi; CRS belum dikonfirmasi. Jangan tafsirkan sebagai latitude/longitude |
| Blacklink | Sheet EAN & UCL | 23 ruas dengan atribut analisis EAN/UCL | Geometri garis tersedia hanya untuk 10 nama ruas pada GeoPackage; 13 ruas lain jangan diberi garis perkiraan |
| Geometri Blacklink | GeoPackage layer jalan_ln_25k | 64 fitur MultiLineString, 10 nama ruas, sumber EPSG:32749; dikonversi ke WGS84 | Perlu pemeriksaan visual lapangan/QGIS untuk kesesuaian ruas |

### Metadata koordinat
- Latitude: derajat lintang WGS84, rentang -90 sampai 90.
- Longitude: derajat bujur WGS84, rentang -180 sampai 180.
- EPSG:4326: koordinat geografis WGS84 yang digunakan oleh Leaflet.
- EPSG:32749: WGS 84 / UTM zone 49S; satuan meter, bukan derajat.
- CRS koordinat X/Y CUSSUM: belum terkonfirmasi; jangan dipakai sebagai koordinat peta sampai ada metadata sumber.

## C. Penyimpanan foto
Bucket `report-photos` bersifat privat, batas ukuran 5 MB, tipe JPG/JPEG/PNG/WEBP. Publik dapat mengunggah foto ke folder `incoming/`; pembacaan foto dibatasi untuk admin melalui signed URL.

## D. Peran dan akses
- `anon`: mengirim laporan tamu; membaca kolom minimum laporan berstatus Terverifikasi untuk layer publik.
- `authenticated` pelapor: membuat laporan dengan `reporter_user_id = auth.uid()` dan membaca laporan miliknya.
- `authenticated` admin: role `app_metadata.role = admin`; membaca antrean dan mengelola status sesuai kebijakan RLS.

## E. Status kelengkapan dokumentasi
Struktur tabel di bagian A diperiksa dari schema database aktif pada 21 November 2026. Kamus atribut internal lengkap dataset historis perlu dilengkapi setelah struktur file terkompresi diekstrak dan dicocokkan dengan kolom workbook sumber. Workbook mentah tidak boleh dimasukkan ke repository publik.
