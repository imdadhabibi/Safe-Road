# SafeRoad — Audit Implementasi Website & Supabase
Tanggal pemeriksaan: 20 November 2026
Branch: `feature/supabase-reports-v2`
Project Supabase: `saferoad-cilacap` (`ixilgqkkmbovdezfwovx`)

## 1. Status ringkas
Audit dilakukan pada source branch pengembangan dan project Supabase aktif. Tampilan utama V2 dipertahankan; pemeriksaan ini tidak mengubah desain antarmuka.

| Komponen | Hasil audit |
|---|---|
| Repository | Publik, branch pengembangan tersedia |
| Supabase project | ACTIVE_HEALTHY |
| Database | Tabel `public.reports`, RLS aktif |
| Struktur laporan | 18 kolom termasuk pemilik akun dan hash token |
| Baris laporan saat audit | 1 |
| Pengguna Auth | 1 akun, 1 akun memiliki role admin |
| Storage | Bucket `report-photos` privat; batas 5 MB; JPEG/PNG/WEBP |
| Objek foto | 1 objek saat audit |
| Riwayat migrasi DB | 3 migrasi tercatat |
| Sumber migrasi tambahan | File migrasi reporter tracking ada di branch; versi 20261120060000 belum tercatat pada daftar migrasi Supabase saat audit |
| Pengujian end-to-end | Belum dilakukan |
| Status rilis | Belum dinyatakan siap produksi/publik |

## 2. Inventaris dataset yang ditemukan pada branch

| Dataset | File/format di repository | Isi/angka yang diketahui dari dokumentasi dan metadata | Batasan |
|---|---|---:|---|
| Kecelakaan historis 2025 | `accidents-coordinates.json` + 6 part base64 terkompresi | 1.081 pasangan koordinat publik | Koordinat saja; bukan workbook lengkap |
| Arsip KML kecelakaan | `accidents-kml-2025.json.gz.b64` | Arsip hasil konversi | Perlu validasi isi dan perbandingan dengan manifest |
| Blackspot analisis CUSSUM | `blackspot-segments.json.gz.b64` | 122 segmen Blackspot dari total 421 segmen | CRS kolom X/Y belum dikonfirmasi |
| Titik Blackspot KML terbaru | `blackspot-sta-10-jalan.compact.gz.b64` | 232 titik pada 10 ruas menurut pembacaan aplikasi | Angka titik KML berbeda satuan dengan 122 segmen CUSSUM; jangan disamakan |
| Blacklink | `blacklink-roads.json.gz.b64` | 23 ruas dari EAN & UCL | Atribut analisis, bukan geometri lengkap |
| Geometri Blacklink | `blacklink-geometry-10-roads.geojson.gz.b64` | 64 fitur garis pada 10 ruas | 13 dari 23 ruas belum memiliki geometri pada sumber yang tersedia |
| QA publik | `public-data-qa.json.gz.b64` | Arsip QA terkompresi | Perlu dibuka dan dicocokkan dengan workbook sumber sebelum dijadikan bukti sanitasi final |

Workbook mentah tidak ditemukan dalam inventaris repository yang diperiksa. Ini baik untuk mengurangi risiko publikasi data pribadi, tetapi workbook sumber dan catatan sanitasi perlu disimpan secara aman di folder bukti terpisah, bukan repository publik.

## 3. Struktur dan kontrol database

Tabel `public.reports` memiliki kolom:
- Identitas: `id`
- Pelapor: `reporter_name`, `reporter_contact`, `reporter_user_id`
- Lokasi/deskripsi: `road_name`, `description`, `latitude`, `longitude`
- Foto: `photo_path`, `photo_type`
- Status dan audit: `status`, `admin_note`, `history`, `created_at`, `updated_at`, `verified_at`, `verified_by`
- Pelacakan tamu: `tracking_token_hash`

RLS aktif. Kebijakan yang ditemukan:
- Anon: insert laporan tamu dengan status awal dan kolom admin kosong; select hanya baris Terverifikasi.
- Authenticated: insert laporan yang dikaitkan ke auth.uid(); select laporan milik sendiri atau admin; admin read/update/delete berdasarkan `app_metadata.role = admin`.
- Storage: anon dan authenticated dapat upload foto ke folder `incoming/`; hanya admin dapat membaca dan menghapus foto.
- Bucket privat, bukan public.

### Perbaikan audit yang dilakukan
Audit menemukan bahwa query layer publik memilih kolom `status`, sedangkan grant SELECT anon sebelumnya hanya mencakup id, road_name, latitude, longitude, created_at. Kondisi ini berpotensi menggagalkan query layer laporan terverifikasi. Grant SELECT kolom `status` untuk anon telah ditambahkan langsung ke database dan diverifikasi melalui `information_schema.column_privileges`. File `supabase/setup.sql` dan file migrasi di branch juga diperbarui agar konfigurasi baru konsisten.

Catatan: ini adalah pemeriksaan privilege metadata; belum merupakan uji request browser/API sebagai anon. File migrasi yang diubah perlu diselaraskan dengan riwayat migrasi Supabase sebelum workflow deployment/migrasi otomatis digunakan.

## 4. Temuan keamanan

| Temuan | Dampak / keputusan |
|---|---|
| Fungsi `public.get_report_tracking(text)` SECURITY DEFINER dapat dipanggil anon dan authenticated | Disengaja untuk pelacakan laporan tamu; fungsi hanya mengembalikan ID, ruas, status, dan waktu berdasarkan token acak. Tetap menjadi peringatan advisor dan perlu review desain lanjutan. |
| Leaked Password Protection nonaktif | Perlu diaktifkan pada Auth password security sebelum rilis publik. |
| Bucket foto privat | Sesuai prinsip least exposure. |
| Role admin menggunakan app_metadata | Sesuai; bukan user_metadata yang dapat diubah pengguna. |
| Publishable key berada di frontend | Diperbolehkan dengan RLS. Tidak ditemukan service_role/secret key pada file konfigurasi yang diperiksa. |

Jangan menutup peringatan SECURITY DEFINER hanya dengan menyembunyikan fungsi atau menonaktifkan pelacakan. Jika fungsi diubah, lakukan uji bahwa token acak hanya mengembalikan laporan yang cocok dan tidak pernah mengungkap identitas, foto, deskripsi, koordinat, atau catatan admin.

## 5. Temuan kualitas data dan dokumentasi

1. Angka 232 titik KML terbaru tidak sama unitnya dengan 122 segmen Blackspot dari CUSSUM. UI perlu memberi label yang jelas: titik KML untuk peta, segmen CUSSUM untuk tabel analisis.
2. Data Blacklink memiliki 23 ruas, sedangkan GeoPackage menyediakan 64 fitur garis pada 10 ruas. Tiga belas ruas belum boleh digambar sebagai garis perkiraan.
3. CRS dan arti koordinat X/Y Blackspot dari CUSSUM masih harus dikonfirmasi sebelum digunakan sebagai geometri peta atau geofence.
4. Dokumentasi lama `PHASE-0-AUDIT-REPORT.md` menyebut branch main dan tanggal audit lama; laporan ini adalah audit implementasi tambahan dan tidak menghapus hasil audit sumber.
5. Tidak ada bukti yang cukup dalam audit ini untuk menyatakan sanitasi workbook sumber telah selesai. Perlu bukti kolom yang dihapus/disamarkan, jumlah record sebelum-sesudah, dan pemeriksaan duplikat/koordinat.
6. Admin UI menyediakan tombol hapus seluruh laporan. Fitur destruktif ini harus dipertimbangkan untuk dinonaktifkan atau diberi perlindungan ekstra pada deployment operasional.

## 6. Pengujian yang belum dilakukan

Belum dilakukan pengujian nyata terhadap:
- 10 skenario laporan (normal, foto, GPS, data wajib kosong, duplikat, palsu, koordinat tidak valid, lintas perangkat, perubahan status).
- Uji signup/login dan riwayat akun pada perangkat berbeda.
- Uji token pelacakan guest pada perangkat lain.
- Uji upload foto sebagai anon/authenticated, pembacaan foto admin, dan penolakan akses non-admin.
- Uji verifikasi lima lokasi lapangan.
- Uji browser untuk layer peta setelah grant status diperbaiki.
- Uji deployment publik.

Jangan mengisi hasil PASS sebelum setiap skenario benar-benar dijalankan dan bukti screenshot/log dicatat.

## 7. Langkah berikutnya

1. Sinkronkan file migrasi `20261120060000_reporter_accounts_tracking.sql` dengan riwayat migrasi Supabase yang saat ini baru menampilkan tiga versi.
2. Jalankan uji request API/browser anon setelah grant status ditambahkan.
3. Aktifkan leaked password protection dan review fungsi SECURITY DEFINER.
4. Buat data dictionary untuk tabel laporan dan seluruh dataset historis.
5. Lengkapi bukti sanitasi dataset dan rekonsiliasi angka/titik/segmen.
6. Jalankan 10 skenario uji dan simpan log aktual.
7. Verifikasi lima lokasi lapangan dengan foto, koordinat, tanggal, dan hasil pemeriksaan.
8. Lakukan uji akses publik/pelapor/admin sebelum publikasi.

## 8. Kesimpulan
Fondasi backend dan role akses SafeRoad telah tersedia, dan satu masalah grant kolom status untuk layer publik telah diperbaiki. Namun, audit ini belum membuktikan seluruh alur end-to-end berjalan, belum membuktikan sanitasi workbook secara penuh, dan belum menghasilkan log 10 pengujian maupun verifikasi lima lokasi. Status yang tepat saat ini adalah **AUDIT AWAL SELESAI — PERLU PERBAIKAN DAN PENGUJIAN LANJUTAN**.
