-- ============================================================
-- Spec 05 — Hardening RLS — Step 3, kelompok A: tarif_zona + cabang
-- SELECT tetap semua staf (auth.uid() IS NOT NULL) — tidak berubah.
-- INSERT/UPDATE/DELETE dipersempit ke superadmin only (lihat matriks §2).
--
-- WAJIB drop policy "auth_all_*" (FOR ALL) lama dulu — policy Postgres
-- bersifat PERMISSIVE (di-OR), jadi kalau tidak di-drop, policy baru yang
-- sempit TIDAK ADA EFEK sama sekali (policy lama tetap meloloskan semua).
-- ============================================================

-- ── tarif_zona ──────────────────────────────────────────────
DROP POLICY IF EXISTS "auth_all_tarif_zona" ON tarif_zona;

CREATE POLICY "select_tarif_zona" ON tarif_zona FOR SELECT
  USING (auth.uid() IS NOT NULL);
CREATE POLICY "insert_tarif_zona" ON tarif_zona FOR INSERT
  WITH CHECK (user_has_role(ARRAY['superadmin']));
CREATE POLICY "update_tarif_zona" ON tarif_zona FOR UPDATE
  USING (user_has_role(ARRAY['superadmin']))
  WITH CHECK (user_has_role(ARRAY['superadmin']));
CREATE POLICY "delete_tarif_zona" ON tarif_zona FOR DELETE
  USING (user_has_role(ARRAY['superadmin']));

-- ── cabang ──────────────────────────────────────────────────
DROP POLICY IF EXISTS "auth_all_cabang" ON cabang;

CREATE POLICY "select_cabang" ON cabang FOR SELECT
  USING (auth.uid() IS NOT NULL);
CREATE POLICY "insert_cabang" ON cabang FOR INSERT
  WITH CHECK (user_has_role(ARRAY['superadmin']));
CREATE POLICY "update_cabang" ON cabang FOR UPDATE
  USING (user_has_role(ARRAY['superadmin']))
  WITH CHECK (user_has_role(ARRAY['superadmin']));
CREATE POLICY "delete_cabang" ON cabang FOR DELETE
  USING (user_has_role(ARRAY['superadmin']));

NOTIFY pgrst, 'reload schema';
