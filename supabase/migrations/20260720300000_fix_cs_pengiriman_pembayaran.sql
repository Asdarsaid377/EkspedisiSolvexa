-- Fix: role `cs` tidak bisa INSERT pengiriman_pembayaran.
--
-- Ditemukan saat verifikasi spec 10 (booking mandiri, 20 Jul 2026) — role
-- `cs` termasuk BOOKING_STAFF_ROLES di /dashboard/booking (bisa
-- konfirmasi booking jadi pengiriman), tapi RLS INSERT
-- pengiriman_pembayaran (dari hardening spec 05,
-- 20260718230000_hardening_pembayaran_delete_pengiriman.sql) cuma
-- mengizinkan superadmin/kasir/keuangan. Kalau cs mengkonfirmasi booking
-- dengan status_bayar dp/lunas, insert baris riwayat pembayaran ditolak
-- RLS secara senyap (fire-and-forget) — gap ini juga sudah ada sejak
-- lama di form staf biasa /dashboard/pengiriman (bukan spesifik ke
-- booking), karena INSERT `pengiriman` sendiri terbuka untuk SEMUA staf
-- termasuk cs, jadi cs sudah lama bisa bikin pengiriman lunas/dp tanpa
-- baris ledger-nya ikut tercatat.
--
-- Fix: tambah cs ke role yang boleh INSERT pengiriman_pembayaran, biar
-- konsisten dengan kemampuan cs bikin pengiriman (termasuk yang sudah
-- dibayar) di tempat lain. TIDAK menyentuh DELETE (rollback) — itu aksi
-- koreksi yang lebih sensitif, di luar scope temuan ini, tetap
-- superadmin/kasir/keuangan saja.
--
-- WAJIB DROP dulu (policy Postgres PERMISSIVE/di-OR) — lihat §RLS
-- CLAUDE.md untuk jebakan ini.
DROP POLICY IF EXISTS "insert_pengiriman_pembayaran" ON pengiriman_pembayaran;

CREATE POLICY "insert_pengiriman_pembayaran" ON pengiriman_pembayaran FOR INSERT
  WITH CHECK (user_has_role(ARRAY['superadmin','kasir','keuangan','cs']));

NOTIFY pgrst, 'reload schema';
