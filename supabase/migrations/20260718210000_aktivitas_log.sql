-- ============================================================
-- Spec 05 — Hardening RLS & Audit Trail — Step 1
-- Helper user_has_role() + tabel aktivitas_log (append-only).
-- Ini SATU-SATUNYA migration di step ini — belum ada perubahan RLS
-- tabel lain, itu step 3-5 terpisah (per kelompok, biar bisa direvert
-- sendiri-sendiri kalau ada regresi).
-- ============================================================

-- =====================================================================
-- Helper: cek role user aktif (dipakai semua policy hardening berikutnya)
-- =====================================================================
CREATE OR REPLACE FUNCTION user_has_role(roles TEXT[])
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = ANY(roles)
  );
$$ LANGUAGE sql SECURITY DEFINER SET search_path = public STABLE;

-- =====================================================================
-- Tabel aktivitas_log (append-only)
-- NAMA SENGAJA BUKAN audit_log — tabel audit_log sudah ada untuk
-- audit_nota/stock_opname furniture, jangan disentuh/dicampur.
-- =====================================================================
CREATE TABLE IF NOT EXISTS aktivitas_log (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  aksi        TEXT NOT NULL,      -- 'delete_pengiriman' | 'rollback_pembayaran'
                                  -- | 'approve_klaim' | 'tolak_klaim'
                                  -- | 'edit_setoran_cod' | 'hapus_setoran_cod'
                                  -- | 'edit_tarif' | 'hapus_tarif'
                                  -- | 'edit_biaya_trip' | 'hapus_biaya_trip'
  entitas     TEXT NOT NULL,      -- nama tabel terkait
  entitas_id  UUID,
  ref         TEXT,               -- nomor dokumen (resi/faktur/klaim) utk display
  detail      JSONB,              -- snapshot nilai penting sebelum/sesudah
  created_by  UUID REFERENCES profiles(id),
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_aktivitas_log_created ON aktivitas_log (created_at DESC);

ALTER TABLE aktivitas_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "insert_aktivitas_log" ON aktivitas_log FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL AND created_by = auth.uid());
CREATE POLICY "select_aktivitas_log" ON aktivitas_log FOR SELECT
  USING (user_has_role(ARRAY['superadmin','keuangan']));
-- SENGAJA tidak ada policy UPDATE/DELETE = log immutable untuk semua
-- kecuali service_role. Ini bukan kelalaian.

NOTIFY pgrst, 'reload schema';
