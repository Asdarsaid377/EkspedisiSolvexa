-- ============================================================
-- FASE 3 — Manifest & Armada
-- Grouping banyak pengiriman ke satu perjalanan/trip, ditugaskan ke
-- kendaraan (armada) & sopir/kurir tertentu. Aksi "Berangkat"/"Selesai"
-- di manifest melakukan bulk-update milestone semua pengiriman terkait.
-- ============================================================

CREATE TABLE armada (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plat_nomor      TEXT UNIQUE NOT NULL,
  jenis_kendaraan TEXT,
  kapasitas_kg    NUMERIC(10,2),
  kapasitas_m3    NUMERIC(10,2),
  status          TEXT NOT NULL DEFAULT 'tersedia'
                    CHECK (status IN ('tersedia','maintenance','nonaktif')),
  sopir_id        UUID REFERENCES profiles(id),  -- sopir/kurir default (opsional), bisa dioverride per manifest
  catatan         TEXT,
  aktif           BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER update_armada_updated_at BEFORE UPDATE ON armada
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE armada ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_all_armada" ON armada FOR ALL USING (auth.uid() IS NOT NULL);

-- ── Nomor manifest, pola sama dengan generate_nomor_pengiriman() ──
CREATE SEQUENCE IF NOT EXISTS nomor_manifest_seq;

CREATE OR REPLACE FUNCTION generate_nomor_manifest()
RETURNS trigger AS $$
BEGIN
  IF NEW.nomor_manifest IS NULL OR NEW.nomor_manifest = '' THEN
    NEW.nomor_manifest := 'MNF-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(NEXTVAL('nomor_manifest_seq')::TEXT, 4, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TABLE manifest (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nomor_manifest    TEXT UNIQUE NOT NULL,
  armada_id         UUID REFERENCES armada(id),
  sopir_id          UUID REFERENCES profiles(id),  -- petugas trip ini (sopir atau kurir)
  rute              TEXT,
  tanggal_berangkat DATE,
  status            TEXT NOT NULL DEFAULT 'draft'
                      CHECK (status IN ('draft','berangkat','selesai','batal')),
  catatan           TEXT,
  created_by        UUID REFERENCES profiles(id),
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER set_nomor_manifest BEFORE INSERT ON manifest
  FOR EACH ROW EXECUTE FUNCTION generate_nomor_manifest();
CREATE TRIGGER update_manifest_updated_at BEFORE UPDATE ON manifest
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE INDEX idx_manifest_status ON manifest (status);

ALTER TABLE manifest ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_all_manifest" ON manifest FOR ALL USING (auth.uid() IS NOT NULL);

CREATE TABLE manifest_item (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  manifest_id    UUID NOT NULL REFERENCES manifest(id) ON DELETE CASCADE,
  pengiriman_id  UUID NOT NULL REFERENCES pengiriman(id) ON DELETE CASCADE,
  urutan         INTEGER DEFAULT 0,
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (manifest_id, pengiriman_id)
);

CREATE INDEX idx_manifest_item_pengiriman ON manifest_item (pengiriman_id);

ALTER TABLE manifest_item ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_all_manifest_item" ON manifest_item FOR ALL USING (auth.uid() IS NOT NULL);

NOTIFY pgrst, 'reload schema';
