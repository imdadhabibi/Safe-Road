# Integrasi Geometri Jalan Blacklink dari GeoPackage

**Berkas sumber pengguna:** `10 Jalan Terbaik.gpkg`  
**Layer:** `jalan_ln_25k`  
**Tanggal metadata GeoPackage:** 30 April 2026  
**Branch integrasi:** `qc/phase-0-audit`

## Hasil pemeriksaan sumber

| Pemeriksaan | Hasil |
|---|---:|
| Jumlah fitur GeoPackage | 64 |
| Jenis geometri | MultiLineString |
| Nama ruas unik | 10 |
| Sistem koordinat sumber | EPSG:32749 — WGS 84 / UTM zone 49S |
| Validitas geometri sumber | 64 dari 64 valid |
| Bounding box WGS84 | 108.639446–109.346636 BT; 7.727854–7.298745 LS |

GeoPackage mendeklarasikan EPSG:32749 pada `gpkg_geometry_columns` dan `gpkg_contents`. Geometri dikonversi ke EPSG:4326/WGS84 untuk digunakan oleh Leaflet. Koordinat disederhanakan ringan dan dibulatkan hingga 6 angka desimal; atribut yang dimasukkan ke GeoJSON dibatasi pada nama jalan, ID fitur sumber, kelas jalan jika tersedia, serta CRS sumber.

## 10 ruas yang memiliki geometri pada file ini

| Nama ruas | Jumlah fitur garis |
|---|---:|
| Jl. A. Yani Adipala | 8 |
| Jl. Diponegoro | 9 |
| Jl. Gatot Subroto | 3 |
| Jl. Gerilya | 1 |
| Jl. Jenderal Sudirman | 6 |
| Jl. Nasional III | 17 |
| Jl. Patimuan-Kedungreja | 4 |
| Jl. Raya Cilacap - Wangon | 1 |
| Jl. Raya Kawunganten | 7 |
| Jl. Tentara Pelajar | 8 |
| **Jumlah** | **64** |

Seluruh 10 nama ruas tersebut cocok dengan nama ruas yang berstatus Blacklink pada sheet `EAN & UCL`.

## Hubungan dengan daftar Blacklink 23 ruas

GeoPackage ini menyediakan geometri untuk **10 dari 23** ruas Blacklink. Sebanyak **13 ruas lainnya tetap ditampilkan pada tabel analisis**, tetapi tidak dibuatkan garis perkiraan:

1. Jl. Raya Bantarsari
2. Jl. Majenang - Cimanggu
3. Jl. Cisumur
4. Jl. Kesugihan - Maos - Sampang
5. Jl. Karangpucung - Sidareja
6. Jl. Lingkar Timur
7. Jl. Dr. Soetomo
8. Jl. Lengkong
9. Jl. Tegal - Cilacap
10. Jalur Gumilir - Purwokerto
11. Jl. Bhayangkara
12. Jl. Majenang - Wanarej
13. Jl. Ampera

Nama daftar dan klasifikasi Blacklink tetap bersumber dari sheet `EAN & UCL`; GeoPackage hanya melengkapi geometri garis untuk 10 nama jalan yang cocok.

## Implementasi di website

- Layer peta ungu bernama **Jalan Blacklink** telah diaktifkan.
- Data disimpan pada `data/blacklink-geometry-10-roads.geojson.gz.b64`.
- Loader menggunakan `DecompressionStream('gzip')`, kemudian membaca GeoJSON melalui Leaflet.
- Klik garis akan menampilkan nama jalan, ID segmen fitur sumber, dan sistem koordinat asal.
- Kontrol layer dapat diaktifkan/nonaktifkan oleh pengguna.
- Daftar 23 ruas tetap dipertahankan pada tabel analisis.

## Batasan dan langkah berikutnya

1. Jangan menyimpulkan bahwa 64 fitur GeoPackage merupakan 64 ruas berbeda; 64 fitur tersebut membentuk 10 nama ruas.
2. Jangan menganggap GeoPackage menyediakan geometri seluruh 23 Blacklink.
3. Garis yang ditampilkan merupakan geometri sumber yang diberikan pengguna dan cocok nama ruasnya dengan klasifikasi Blacklink Excel. Kesesuaian posisi terhadap batas administrasi, nama ruas di lapangan, serta kontinuitas ruas tetap perlu diperiksa secara visual/QGIS sebelum digunakan sebagai dasar peringatan GPS atau keputusan keselamatan operasional.
4. Untuk 13 ruas yang belum memiliki geometri, minta sumber GIS tambahan atau telusuri dari sumber yang dapat dipertanggungjawabkan, lalu lakukan validasi sebelum dipublikasikan sebagai garis.
5. Geometri Blacklink belum digunakan sebagai pemicu peringatan GPS pada milestone ini.

## Berkas terkait

- `data/blacklink-geometry-10-roads.geojson.gz.b64` — geometri 64 fitur / 10 ruas untuk Leaflet.
- `data/blacklink-roads.json.gz.b64` — atribut 23 ruas dari Excel EAN & UCL.
- [PRD SafeRoad](PRD_SafeRoad.md).
