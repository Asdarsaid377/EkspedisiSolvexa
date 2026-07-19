-- ============================================================
-- Spec 05 — Hardening RLS — Step 5, kelompok C:
-- klaim + cod_setoran + manifest_biaya
--
-- WAJIB drop policy "auth_all_*" (FOR ALL) lama dulu — policy Postgres
-- bersifat PERMISSIVE (di-OR), jadi kalau tidak di-drop, policy baru yang
-- sempit TIDAK ADA EFEK sama sekali (policy lama tetap meloloskan semua).
-- ============================================================

-- ── klaim ───────────────────────────────────────────────────
-- INSERT (lapor klaim) tetap terbuka semua staf. UPDATE (approve/tolak/
-- tandai selesai — RLS tidak bisa bedakan kolom, granularitas approve
-- superadmin-only vs tandai-selesai keuangan tetap app-level, lihat §2
-- spec) dipersempit superadmin+keuangan. DELETE superadmin only.
DROP POLICY IF EXISTS "auth_all_klaim" ON klaim;

CREATE POLICY "select_klaim" ON klaim FOR SELECT
  USING (auth.uid() IS NOT NULL);
CREATE POLICY "insert_klaim" ON klaim FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "update_klaim" ON klaim FOR UPDATE
  USING (user_has_role(ARRAY['superadmin','keuangan']))
  WITH CHECK (user_has_role(ARRAY['superadmin','keuangan']));
CREATE POLICY "delete_klaim" ON klaim FOR DELETE
  USING (user_has_role(ARRAY['superadmin']));

-- ── cod_setoran ─────────────────────────────────────────────
-- INSERT: superadmin/keuangan boleh catat setoran siapa saja; kurir/sopir
-- HANYA boleh catat setoran diri sendiri (sopir_id = auth.uid()) — cegah
-- kurir/kurir lain input setoran atas nama orang lain lewat API langsung.
DROP POLICY IF EXISTS "auth_all_cod_setoran" ON cod_setoran;

CREATE POLICY "select_cod_setoran" ON cod_setoran FOR SELECT
  USING (auth.uid() IS NOT NULL);
CREATE POLICY "insert_cod_setoran" ON cod_setoran FOR INSERT
  WITH CHECK (
    user_has_role(ARRAY['superadmin','keuangan'])
    OR (user_has_role(ARRAY['kurir','sopir']) AND sopir_id = auth.uid())
  );
CREATE POLICY "update_cod_setoran" ON cod_setoran FOR UPDATE
  USING (user_has_role(ARRAY['superadmin','keuangan']))
  WITH CHECK (user_has_role(ARRAY['superadmin','keuangan']));
CREATE POLICY "delete_cod_setoran" ON cod_setoran FOR DELETE
  USING (user_has_role(ARRAY['superadmin','keuangan']));

-- ── manifest_biaya ──────────────────────────────────────────
-- INSERT: superadmin/gudang/sopir/kurir/keuangan boleh input biaya trip.
-- Edit/hapus (koreksi) superadmin/keuangan only — sopir/kurir yang input
-- TIDAK BISA edit/hapus baris sendiri (disengaja, lihat CLAUDE.md).
DROP POLICY IF EXISTS "auth_all_manifest_biaya" ON manifest_biaya;

CREATE POLICY "select_manifest_biaya" ON manifest_biaya FOR SELECT
  USING (auth.uid() IS NOT NULL);
CREATE POLICY "insert_manifest_biaya" ON manifest_biaya FOR INSERT
  WITH CHECK (user_has_role(ARRAY['superadmin','gudang','sopir','kurir','keuangan']));
CREATE POLICY "update_manifest_biaya" ON manifest_biaya FOR UPDATE
  USING (user_has_role(ARRAY['superadmin','keuangan']))
  WITH CHECK (user_has_role(ARRAY['superadmin','keuangan']));
CREATE POLICY "delete_manifest_biaya" ON manifest_biaya FOR DELETE
  USING (user_has_role(ARRAY['superadmin','keuangan']));

NOTIFY pgrst, 'reload schema';
