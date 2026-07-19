-- ============================================================
-- Spec 05 — Hardening RLS — Step 4, kelompok B:
-- pengiriman_pembayaran + DELETE pengiriman
--
-- WAJIB drop policy "auth_all_*" (FOR ALL) lama dulu — policy Postgres
-- bersifat PERMISSIVE (di-OR), jadi kalau tidak di-drop, policy baru yang
-- sempit TIDAK ADA EFEK sama sekali (policy lama tetap meloloskan semua).
-- ============================================================

-- ── pengiriman_pembayaran ───────────────────────────────────
-- INSERT/DELETE (rollback) dipersempit ke superadmin/kasir/keuangan.
-- SENGAJA TIDAK ADA policy UPDATE — tidak ada alur edit pembayaran
-- di aplikasi (koreksi selalu lewat rollback = delete, bukan update).
DROP POLICY IF EXISTS "auth_all_pengiriman_pembayaran" ON pengiriman_pembayaran;

CREATE POLICY "select_pengiriman_pembayaran" ON pengiriman_pembayaran FOR SELECT
  USING (auth.uid() IS NOT NULL);
CREATE POLICY "insert_pengiriman_pembayaran" ON pengiriman_pembayaran FOR INSERT
  WITH CHECK (user_has_role(ARRAY['superadmin','kasir','keuangan']));
CREATE POLICY "delete_pengiriman_pembayaran" ON pengiriman_pembayaran FOR DELETE
  USING (user_has_role(ARRAY['superadmin','kasir','keuangan']));

-- ── pengiriman ──────────────────────────────────────────────
-- HANYA DELETE yang dipersempit (Keputusan Terbuka #1: superadmin +
-- keuangan saja — turun dari 5 role sebelumnya). SELECT/INSERT/UPDATE
-- TIDAK berubah, tetap terbuka semua staf (auth.uid() IS NOT NULL) —
-- milestone dkk tetap app-level, tidak disentuh spec ini.
DROP POLICY IF EXISTS "auth_all_pengiriman" ON pengiriman;

CREATE POLICY "select_pengiriman" ON pengiriman FOR SELECT
  USING (auth.uid() IS NOT NULL);
CREATE POLICY "insert_pengiriman" ON pengiriman FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "update_pengiriman" ON pengiriman FOR UPDATE
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "delete_pengiriman" ON pengiriman FOR DELETE
  USING (user_has_role(ARRAY['superadmin','keuangan']));

NOTIFY pgrst, 'reload schema';
