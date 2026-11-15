# SafeRoad — Kabupaten Cilacap

Sistem informasi keselamatan jalan berbasis data kecelakaan historis dan verifikasi laporan jalan berlubang.

## Dokumen
- [PRD SafeRoad](docs/PRD_SafeRoad.md)
- [Laporan QC Milestone 0](docs/qc/PHASE-0-AUDIT-REPORT.md)

## Status pengembangan
Milestone 0 — audit: PASS WITH ISSUES. Pekerjaan selanjutnya adalah data processing dan validasi GIS.

## Keamanan data
Workbook sumber, data kecelakaan mentah, identitas petugas, NRP, nomor laporan polisi, nomor kendaraan, narasi pribadi, dan kredensial tidak boleh disimpan di repository publik. File sensitif dikecualikan oleh `.gitignore`.

## Teknologi sasaran
GitHub Pages, Supabase Auth/PostgreSQL/Storage/Edge Functions, Leaflet, dan OpenStreetMap.

## Aturan kontribusi
Kerjakan per milestone, jalankan pengujian, lampirkan laporan QC, dan jangan mengubah branch `main` sebelum pemeriksaan lulus.
