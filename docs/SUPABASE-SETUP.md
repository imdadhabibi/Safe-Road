# Setup Supabase untuk SafeRoad V2

Dokumen ini memasang backend multi-perangkat tanpa mengubah desain utama SafeRoad.

## 1. Buat proyek Supabase

1. Buat proyek di https://supabase.com/dashboard.
2. Buka **Project Settings → API Keys**.
3. Salin **Project URL** dan **Publishable key** (atau legacy anon key).
4. Isi kedua nilai tersebut di `js/supabase-config.js`.
5. Jangan pernah menaruh `service_role` atau secret key di kode browser atau repository.

Contoh:

```js
window.SafeRoadSupabaseConfig = {
  url: "https://PROJECT-REF.supabase.co",
  publishableKey: "sb_publishable_..."
};
```

## 2. Buat database dan aturan keamanan

1. Buka **SQL Editor → New query** di Supabase.
2. Salin seluruh isi `supabase/setup.sql` ke SQL Editor dan jalankan.
3. Pastikan tabel `public.reports` dan bucket privat `report-photos` sudah dibuat.
4. Gunakan proyek baru/kosong atau periksa serta hapus kebijakan/grant lama yang lebih longgar pada tabel dan `storage.objects`; kebijakan permissive lain dapat memberi akses tambahan.

Hak akses:
- Publik dapat mengirim laporan baru. Status awal ditetapkan database.
- Publik hanya dapat membaca kolom minimum laporan yang sudah **Terverifikasi** untuk layer peta; laporan menunggu, data pelapor, catatan admin, dan foto tidak dapat dibaca publik.
- Foto di bucket privat hanya dapat dibaca admin melalui signed URL sementara.
- Admin dapat membaca seluruh antrean, memperbarui status/catatan, dan menghapus laporan.

## 3. Buat akun admin

1. Buka **Authentication → Users → Add user**.
2. Buat akun email dan kata sandi untuk admin.
3. Di SQL Editor, jalankan perintah ini dan ganti email-nya:

```sql
update auth.users
set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || '{"role":"admin"}'::jsonb
where email = 'email-admin-kamu@example.com';
```

4. Sign out lalu sign in kembali agar JWT baru memuat role admin.
5. Nonaktifkan public sign-up di **Authentication → Settings** bila akun hanya dibuat oleh petugas.

Hak admin dibaca dari `app_metadata`, bukan `user_metadata`, sehingga pengguna tidak dapat menaikkan hak aksesnya sendiri melalui formulir publik.

## 4. Jalankan dan uji

1. Jalankan `start-local.bat` atau Live Server.
2. Buka website SafeRoad, lalu kirim laporan uji dari HP/browser lain.
3. Masuk melalui tombol **Admin** dengan akun Supabase yang sudah diberi role admin.
4. Laporan dari semua perangkat akan muncul pada antrean admin.
5. Ubah status menjadi **Terverifikasi** untuk menampilkan titiknya pada layer jalan berlubang publik.

## 5. Uji akses sebelum publikasi

- Dari sesi tanpa login, coba baca daftar laporan: hanya titik yang berstatus `Terverifikasi` dan kolom publik minimum yang boleh kembali.
- Dari sesi tanpa login, coba ubah status, baca identitas pelapor, atau unduh foto: semuanya harus ditolak.
- Dari akun admin, pastikan antrean semua status, foto, dan perubahan status dapat diakses.
- Coba dari dua perangkat berbeda untuk memastikan laporan uji masuk ke antrean yang sama.

## 6. Keamanan

- URL proyek dan Publishable/anon key memang digunakan di browser. Jangan gunakan Secret/service_role key.
- Jangan mengubah bucket foto menjadi public.
- RLS adalah batas keamanan utama; pemeriksaan role di JavaScript hanya untuk navigasi UI.
- Jangan menonaktifkan RLS.
- Backup dan retensi foto/database perlu ditentukan sebelum penggunaan operasional resmi.

## Dokumentasi resmi

- Auth: https://supabase.com/docs/guides/auth
- Storage access control: https://supabase.com/docs/guides/storage/security/access-control
- JavaScript client: https://supabase.com/docs/reference/javascript/installing
