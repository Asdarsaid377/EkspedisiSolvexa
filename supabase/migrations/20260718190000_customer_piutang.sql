-- =====================================================================
-- A. Master customer (pengirim terdaftar)
-- =====================================================================
CREATE TABLE IF NOT EXISTS customer (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nama          TEXT NOT NULL,
  tipe          TEXT CHECK (tipe IN ('umum','korporat')) DEFAULT 'umum',
  telepon       TEXT,
  alamat        TEXT,
  kota          TEXT,
  pic_nama      TEXT,              -- kontak person (korporat)
  pic_telepon   TEXT,
  term_hari     INTEGER DEFAULT 0, -- tempo pembayaran; 0 = tunai/langsung
  catatan       TEXT,
  aktif         BOOLEAN DEFAULT true,
  created_by    UUID REFERENCES profiles(id),
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);
-- TIDAK ada UNIQUE pada nama (dua toko bisa bernama sama beda kota) —
-- dedup dijaga lewat pencarian di UI saat menambah, bukan constraint.

ALTER TABLE customer ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_all_customer" ON customer FOR ALL USING (auth.uid() IS NOT NULL);
-- Staff-only, TIDAK ada akses anon. Role gating di React (konsisten codebase).

-- =====================================================================
-- B. Link di pengiriman (nullable — walk-in tetap teks bebas)
-- =====================================================================
ALTER TABLE pengiriman ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES customer(id);
  -- default NO ACTION: customer yang masih direferensikan tidak bisa dihapus
CREATE INDEX IF NOT EXISTS idx_pengiriman_customer_id ON pengiriman (customer_id);

NOTIFY pgrst, 'reload schema';
