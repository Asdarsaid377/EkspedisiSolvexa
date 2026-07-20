-- Fase 17 — Pembersihan Final Furniture (20 Jul 2026)
--
-- Menghapus PERMANEN 11 tabel furniture yang di Fase 16 sengaja
-- dipertahankan (masih dipakai /dashboard/penjualan, /dashboard/pos,
-- "Kritik & Saran", "Laporan Wilayah", sebagian "Meja Kerja Owner") +
-- 2 tabel owner (owner_reminders, audit_log) — bisnis furniture sudah
-- resmi tidak dipakai sama sekali, halaman-halaman itu sudah dihapus
-- duluan di Step 1 (kode aplikasi).
--
-- Backup pg_dump (schema + data, 13 tabel) sudah dibuat SEBELUM migration
-- ini dijalankan, tersimpan di docs/backup/furniture-final-20260720.sql,
-- diverifikasi baris-per-baris (COPY count vs live COUNT(*)) DAN full
-- restore ke scratch database terpisah — semua 13 tabel cocok persis.
--
-- FK graph (query information_schema.table_constraints penuh terhadap DB
-- live) dicek SEBELUM migration ini ditulis: seluruh FK yang menyentuh 13
-- tabel ini isolated total ke dalam kluster furniture itu sendiri (+
-- created_by -> profiles, satu arah, aman) — NOL inbound FK dari tabel
-- expedisi aktif manapun.
--
-- owner_settings TIDAK di-DROP (lihat DELETE terpisah di bawah) — tabel
-- itu juga menyimpan absensi_lat/absensi_lng/absensi_radius_meter yang
-- aktif dipakai fitur Absensi, cuma 2 baris key furniture-nya yang dihapus.
--
-- Urutan DROP: child dulu (tanpa CASCADE — FK graph sudah dipastikan
-- bersih di luar kluster ini, jadi kalau ternyata ada dependency yang
-- kelewat, migration ini akan GAGAL KERAS di sini, bukan diam-diam
-- cascade menghapus sesuatu yang tidak terduga). Terbukti jalan: percobaan
-- pertama migration ini GAGAL KERAS persis di titik ini karena view
-- `tracking_publik` (dependency tak terduga, lihat di bawah) — bukti
-- desainnya bekerja, bukan kelemahan.
--
-- 2 view legacy pra-pivot ditemukan saat percobaan pertama migration ini
-- (dependency tak terduga terhadap penjualan_item/penjualan/produk/
-- purchase_orders/tracking_progress): `tracking_publik` dan
-- `tracking_riwayat_publik` — keduanya sudah digantikan total oleh
-- `pengiriman_publik`/`pengiriman_riwayat_publik` sejak pivot Fase 1 (17
-- Jul 2026, lihat catatan lama di CLAUDE.md §Detail Penjualan: "link ini
-- sekarang akan 'tidak ditemukan' karena /resi/[nomor] sudah dialihkan
-- baca pengiriman_publik, bukan tracking_publik lagi"). Zero referensi
-- kode ke nama kedua view ini. Di-DROP duluan di sini karena keduanya
-- cuma view (bukan tabel dengan data), aman dihapus.
DROP VIEW IF EXISTS tracking_publik;
DROP VIEW IF EXISTS tracking_riwayat_publik;

BEGIN;

DROP TABLE IF EXISTS penjualan_item;
DROP TABLE IF EXISTS penjualan_pembayaran;
DROP TABLE IF EXISTS reseller_reviews;
DROP TABLE IF EXISTS tracking_progress;
DROP TABLE IF EXISTS mutasi_stok;
DROP TABLE IF EXISTS produk_foto;
DROP TABLE IF EXISTS purchase_order_items;
DROP TABLE IF EXISTS penjualan;
DROP TABLE IF EXISTS produk;
DROP TABLE IF EXISTS purchase_orders;
DROP TABLE IF EXISTS resellers;
DROP TABLE IF EXISTS owner_reminders;
DROP TABLE IF EXISTS audit_log;

-- owner_settings dipertahankan — hapus key furniture (siklus audit nota /
-- stock opname, ditemukan saat inventaris: kode_internal_produk juga
-- furniture, zero referensi kode, lolos dari Fase 16), sisa key
-- (absensi_lat/lng/radius_meter) tidak disentuh.
DELETE FROM owner_settings WHERE key IN ('siklus_audit_nota_hari', 'siklus_stock_opname_hari', 'kode_internal_produk');

COMMIT;

NOTIFY pgrst, 'reload schema';
