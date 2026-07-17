-- ============================================================
-- GPS TRACKING SOPIR — Traccar Client (protokol OsmAnd)
-- Tidak ada Traccar Server — endpoint /api/tracking menerima
-- request langsung dari HP sopir dan insert via service role.
-- ============================================================

CREATE TABLE sopir_devices (
  device_id  TEXT PRIMARY KEY,
  user_id    UUID REFERENCES auth.users(id),
  nama_sopir TEXT NOT NULL,
  aktif      BOOLEAN DEFAULT true
);

CREATE TABLE tracking_sopir (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id   TEXT NOT NULL REFERENCES sopir_devices(device_id),
  lat         DOUBLE PRECISION NOT NULL,
  lng         DOUBLE PRECISION NOT NULL,
  accuracy    DOUBLE PRECISION,
  battery     INT,
  recorded_at TIMESTAMPTZ NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_tracking_device_time ON tracking_sopir (device_id, recorded_at DESC);
ALTER TABLE tracking_sopir ADD CONSTRAINT uq_tracking_device_time UNIQUE (device_id, recorded_at);

-- RLS: hanya dashboard (authenticated) yang boleh SELECT.
-- Tidak ada policy INSERT/UPDATE/DELETE untuk client — insert
-- baris tracking hanya lewat service role di app/api/tracking/route.ts,
-- yang melewati RLS sepenuhnya.
ALTER TABLE sopir_devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE tracking_sopir ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth_read_sopir_devices" ON sopir_devices
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "auth_read_tracking_sopir" ON tracking_sopir
  FOR SELECT USING (auth.uid() IS NOT NULL);

NOTIFY pgrst, 'reload schema';
