-- Fase 16 — Pembersihan Furniture (20 Jul 2026)
--
-- Menghapus 14 tabel furniture yang dikonfirmasi genuinely tidak dipakai:
-- zero referensi kode ke tabel/halaman yang memakainya, dan zero inbound
-- FK dari tabel manapun di kluster yang DIPERTAHANKAN (dibuktikan lewat
-- query information_schema FK graph penuh sebelum migration ini ditulis).
--
-- Backup pg_dump (schema + data) sudah dibuat SEBELUM migration ini
-- dijalankan, tersimpan di docs/backup/furniture-pembersihan-20260720.sql
-- dan diverifikasi baris-per-baris cocok dengan isi tabel asli.
--
-- KLUSTER YANG DIPERTAHANKAN (JANGAN DROP — masih dipakai
-- /dashboard/penjualan, /dashboard/pos, "Kritik & Saran", "Laporan
-- Wilayah", sebagian "Meja Kerja Owner"): produk, produk_foto,
-- resellers, purchase_orders, purchase_order_items, mutasi_stok,
-- penjualan, penjualan_item, penjualan_pembayaran, reseller_reviews,
-- tracking_progress.
--
-- Urutan DROP: child dulu (tanpa CASCADE — FK graph sudah dipastikan
-- bersih di luar kluster ini, jadi kalau ternyata ada dependency yang
-- kelewat, migration ini akan GAGAL KERAS di sini, bukan diam-diam
-- cascade menghapus sesuatu yang tidak terduga).

DROP TABLE IF EXISTS batch_pemakaian_bahan;
DROP TABLE IF EXISTS pembelian_bahan_baku_item;
DROP TABLE IF EXISTS mutasi_bahan_baku;
DROP TABLE IF EXISTS bom;
DROP TABLE IF EXISTS batch_produksi;
DROP TABLE IF EXISTS bahan_baku;
DROP TABLE IF EXISTS pembelian_bahan_baku;
DROP TABLE IF EXISTS chat_ai_messages;
DROP TABLE IF EXISTS chat_ai_sessions;
DROP TABLE IF EXISTS pelanggan_crm;
DROP TABLE IF EXISTS pengumuman;
DROP TABLE IF EXISTS po_progress;
DROP TABLE IF EXISTS target_penjualan;
DROP TABLE IF EXISTS pengiriman_foto;

NOTIFY pgrst, 'reload schema';
