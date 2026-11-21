# Verifikasi Lima Lokasi Blackspot SafeRoad

**Status:** belum diverifikasi pada peta.  
**Sumber klasifikasi:** sheet CUSSUM, sesuai laporan progres sebelumnya.  
**Jumlah populasi:** 122 segmen berstatus Blackspot.

## Peringatan data koordinat
Dokumentasi QC menyatakan kolom Q CUSSUM berisi pasangan X/Y proyeksi dalam satuan meter. CRS tidak dinyatakan secara eksplisit pada workbook. Karena itu, pasangan tersebut tidak boleh langsung dimasukkan sebagai latitude/longitude EPSG:4326 atau digunakan sebagai geofence. Satu pasangan koordinat referensi per STA juga tidak otomatis membentuk geometri garis/segmen.

## Daftar verifikasi
Pilih lima segmen dari data CUSSUM setelah metadata CRS atau sumber geometri yang sah diperoleh.

| No. | ID/STA sumber | Nama ruas | X/Y sumber | CRS terkonfirmasi | Koordinat WGS84 hasil transformasi | Cocok di peta/lapangan | Bukti |
|---:|---|---|---|---|---|---|---|
| 1 | Belum dipilih | Belum dipilih | Belum diverifikasi | Belum | Belum | Belum | - |
| 2 | Belum dipilih | Belum dipilih | Belum diverifikasi | Belum | Belum | Belum | - |
| 3 | Belum dipilih | Belum dipilih | Belum diverifikasi | Belum | Belum | Belum | - |
| 4 | Belum dipilih | Belum dipilih | Belum diverifikasi | Belum | Belum | Belum | - |
| 5 | Belum dipilih | Belum dipilih | Belum diverifikasi | Belum | Belum | Belum | - |

## Kriteria penerimaan
- Identitas segmen/STA cocok dengan sumber CUSSUM.
- CRS dikonfirmasi dari metadata/sumber otoritatif, bukan tebakan.
- Transformasi ke EPSG:4326 dilakukan dengan perangkat GIS dan parameter yang benar.
- Titik/garis hasil transformasi berada pada ruas jalan yang dimaksud.
- Hasil dibandingkan dengan basemap/citra atau sumber jalan yang relevan dan, bila memungkinkan, pemeriksaan lapangan.
- Screenshot QGIS dan peta SafeRoad disimpan untuk setiap lokasi.
- Tidak ada geometri yang dibuat dengan perkiraan.

## Bukti yang harus dilampirkan
1. Cuplikan tabel sumber CUSSUM untuk lima segmen.
2. Informasi CRS layer dan proses transformasi.
3. Screenshot QGIS dengan lima lokasi.
4. Screenshot peta SafeRoad setelah geometri yang sah dimuat.
5. Catatan selisih/ketidakpastian posisi dan keputusan validasi.

**Catatan:** sebelum CRS dikonfirmasi, status kelima lokasi tetap "Belum diverifikasi". Jangan menampilkan koordinat palsu hanya untuk mengisi tabel.
