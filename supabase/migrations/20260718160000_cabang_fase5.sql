-- ============================================================
-- FASE 5 — Cabang
-- Cabang murni dimensi label/filter (bukan isolasi data) — semua staf
-- tetap bisa lihat & kelola pengiriman/manifest/armada di semua cabang.
-- Jumlah cabang dinamis (CRUD superadmin only), bukan hardcode 2.
-- ============================================================

CREATE TABLE cabang (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nama        TEXT UNIQUE NOT NULL,
  kota        TEXT,
  alamat      TEXT,
  telepon     TEXT,
  catatan     TEXT,
  aktif       BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER update_cabang_updated_at BEFORE UPDATE ON cabang
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE cabang ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_all_cabang" ON cabang FOR ALL USING (auth.uid() IS NOT NULL);

-- Kolom label/filter, semua nullable — tidak wajib diisi, tidak memblokir
-- form pengiriman/armada/manifest yang sudah ada kalau belum ada cabang dibuat.
ALTER TABLE pengiriman ADD COLUMN cabang_id UUID REFERENCES cabang(id);
ALTER TABLE manifest   ADD COLUMN cabang_id UUID REFERENCES cabang(id);
ALTER TABLE armada     ADD COLUMN cabang_id UUID REFERENCES cabang(id);

CREATE INDEX idx_pengiriman_cabang ON pengiriman (cabang_id);
CREATE INDEX idx_manifest_cabang   ON manifest (cabang_id);
CREATE INDEX idx_armada_cabang     ON armada (cabang_id);

NOTIFY pgrst, 'reload schema';
