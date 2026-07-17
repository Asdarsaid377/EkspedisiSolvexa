-- ============================================================
-- FASE 2 — Pricing Engine (tarif_zona)
-- Tarif otomatis untuk jenis_layanan reguler/express berdasarkan
-- pasangan kota asal-tujuan + berat efektif (max berat aktual vs volumetrik).
-- Kargo TIDAK memakai tabel ini — tetap manual quote per keputusan Fase 1.
-- ============================================================

CREATE TABLE tarif_zona (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kota_asal       TEXT NOT NULL,
  kota_tujuan     TEXT NOT NULL,
  jenis_layanan   TEXT NOT NULL CHECK (jenis_layanan IN ('reguler','express')),
  harga_per_kg    NUMERIC(15,2) NOT NULL DEFAULT 0,
  harga_flat_min  NUMERIC(15,2) NOT NULL DEFAULT 0,  -- ongkir minimum (floor), dipakai kalau harga_per_kg*berat < ini
  estimasi_hari   INTEGER,
  aktif           BOOLEAN NOT NULL DEFAULT true,
  created_by      UUID REFERENCES profiles(id),
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Unique case-insensitive per (kota_asal, kota_tujuan, jenis_layanan) — cegah duplikat
-- tarif yang beda cuma di kapitalisasi ("Makassar" vs "makassar").
CREATE UNIQUE INDEX idx_tarif_zona_unique
  ON tarif_zona (LOWER(kota_asal), LOWER(kota_tujuan), jenis_layanan);

CREATE INDEX idx_tarif_zona_lookup
  ON tarif_zona (LOWER(kota_asal), LOWER(kota_tujuan), jenis_layanan)
  WHERE aktif = true;

CREATE TRIGGER update_tarif_zona_updated_at BEFORE UPDATE ON tarif_zona
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE tarif_zona ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_all_tarif_zona" ON tarif_zona FOR ALL USING (auth.uid() IS NOT NULL);

NOTIFY pgrst, 'reload schema';
