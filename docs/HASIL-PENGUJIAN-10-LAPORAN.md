# Rencana dan Hasil Pengujian 10 Laporan SafeRoad

**Status:** template pengujian; belum diklaim lulus.  
**Target:** 10 skenario sesuai arahan dosen.  
**Tanggal pelaksanaan:** isi setelah pengujian aktual.

## Skenario uji

| No | Skenario | Langkah ringkas | Hasil yang diharapkan | Hasil aktual | Bukti |
|---:|---|---|---|---|---|
| 1 | Laporan normal | Kirim laporan dengan ruas, deskripsi, koordinat dan foto valid | Record tersimpan dengan status Menunggu Verifikasi | Belum diuji | Screenshot/form + record |
| 2 | Laporan dengan foto | Unggah JPG/PNG/WEBP maksimal 5 MB | Foto masuk bucket privat dan dapat dilihat admin | Belum diuji | Bukti Storage |
| 3 | Koordinat GPS | Kirim dengan koordinat perangkat yang diizinkan | Latitude/longitude tersimpan sesuai posisi yang dipilih | Belum diuji | Form + record |
| 4 | Laporan tanpa akun | Kirim sebagai tamu | Laporan tersimpan dan kode pelacakan dapat digunakan | Belum diuji | Kode disamarkan + hasil tracking |
| 5 | Laporan dengan akun | Login, kirim laporan, buka halaman akun | reporter_user_id terisi dan laporan tampil di riwayat akun | Belum diuji | Halaman akun + record |
| 6 | Duplikat | Kirim dua laporan uji pada lokasi dan kerusakan yang sama | Duplikat dapat diidentifikasi dan ditinjau admin; jangan mengklaim deteksi otomatis jika belum dibuat | Belum diuji | Dua ID laporan |
| 7 | Laporan palsu/simulasi tidak valid | Kirim data simulasi yang sengaja tidak benar, tandai untuk pemeriksaan | Admin dapat menolak dengan alasan tertulis; tidak dipublikasikan sebagai bahaya terverifikasi | Belum diuji | Status Ditolak + catatan |
| 8 | Validasi input wajib | Kosongkan nama ruas/deskripsi atau masukkan koordinat di luar rentang | Form/database menolak data tidak valid | Belum diuji | Pesan validasi |
| 9 | Lintas perangkat | Kirim dari perangkat A, buka dashboard admin dari perangkat B | Laporan yang sama muncul di antrean online | Belum diuji | Screenshot kedua perangkat |
| 10 | Perubahan status | Admin ubah status dan menulis catatan | Status, updated_at, verified_at/verified_by, dan history sesuai aksi tersimpan | Belum diuji | Detail + riwayat |

## Prosedur aman
1. Lakukan pengujian pada periode yang disepakati dan tandai seluruh data sebagai data uji.
2. Jangan menggunakan nama, nomor telepon, atau foto orang sungguhan tanpa persetujuan.
3. Jangan menghapus laporan produksi yang sudah ada. Hapus data uji hanya setelah identitasnya diverifikasi dan mendapat persetujuan.
4. Catat ID laporan, waktu, akun/perangkat, hasil aktual, dan tautan/screenshot bukti.
5. Untuk duplikat, dokumentasikan apakah deteksi dilakukan manual atau otomatis. Source yang diaudit belum menunjukkan mekanisme deteksi duplikat otomatis.
6. Untuk laporan palsu, gunakan simulasi aman; admin harus menolak dan mengisi alasan.

## Ringkasan hasil
- Total skenario: 10
- Lulus: belum dinilai
- Gagal: belum dinilai
- Tidak dapat diuji: belum dinilai
- Catatan: isi setelah seluruh pengujian benar-benar dijalankan.
