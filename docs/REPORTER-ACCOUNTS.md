# SafeRoad — Akun Pelapor dan Riwayat Laporan

## Dua cara mengirim dan melacak laporan
1. **Tanpa akun:** pengguna mengirim laporan dan menerima kode pelacakan rahasia acak. Kode dapat digunakan dari perangkat lain pada bagian "Lacak laporan tanpa login".
2. **Dengan akun:** pengguna mendaftar/login di `akun.html`. Laporan yang dikirim saat sesi login terhubung ke `auth.uid()` dan tampil pada riwayat akun.

## Keamanan
- Kode pelacakan dibuat dengan 32 byte acak kriptografis (256 bit); database hanya menyimpan SHA-256-nya.
- RPC pelacakan hanya mengembalikan ID, nama ruas, status, dan waktu; tidak mengembalikan nama/kontak, deskripsi, koordinat, foto, maupun catatan admin.
- Pengguna terdaftar hanya dapat membaca kolom status laporan miliknya sendiri melalui RLS.
- Admin tetap menggunakan halaman login terpisah dan role `app_metadata.role = admin`.
- Foto tetap berada di bucket privat; URL foto hanya dibuat untuk admin.
- Publishable key boleh berada di browser; jangan pernah menaruh service_role/secret key di source publik.

## Database
Migrasi `20261120060000_reporter_accounts_tracking.sql` telah diterapkan pada project Supabase SafeRoad. Kolom tambahan:
- `reporter_user_id`: UUID akun pelapor, NULL untuk laporan tamu.
- `tracking_token_hash`: hash kode pelacakan; token asli hanya ditampilkan saat pengiriman.

## Catatan penggunaan
- Kode pelacakan hanya ditampilkan sekali setelah pengiriman. Pelapor harus menyimpannya.
- Laporan lama yang dibuat sebelum fitur ini tidak otomatis memiliki token atau pemilik akun; laporan tersebut tetap tersedia untuk admin, tetapi tidak bisa ditautkan ke akun secara otomatis.
- Jika konfirmasi email Supabase aktif, pendaftar harus mengonfirmasi email sebelum login.
- Deployment branch ini belum otomatis berarti website publik sudah diperbarui. Publikasikan branch `feature/supabase-reports-v2` setelah pengujian.
