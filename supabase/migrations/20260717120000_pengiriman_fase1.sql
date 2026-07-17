-- ============================================================
-- FASE 1 — Entitas Pengiriman (pivot expedisi)
-- Tabel BARU, terpisah total dari penjualan/penjualan_item/produk.
-- penjualan & tabel terkait TIDAK disentuh sama sekali di migrasi ini —
-- Dashboard, Owner Workspace, Laporan, Pencocokan, Target, Pelanggan
-- tetap baca data lama seperti biasa (frozen, tidak diupdate lagi ke depan).
-- ============================================================

-- ── Sequence + trigger nomor_faktur (pola identik dgn penjualan.generate_nomor_faktur(),
--    sequence baru & prefix baru PGM- supaya nomor tidak campur/collide secara visual) ──
CREATE SEQUENCE IF NOT EXISTS nomor_pengiriman_seq;

CREATE OR REPLACE FUNCTION generate_nomor_pengiriman()
RETURNS trigger AS $$
BEGIN
  IF NEW.nomor_faktur IS NULL OR NEW.nomor_faktur = '' THEN
    NEW.nomor_faktur := 'PGM-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(NEXTVAL('nomor_pengiriman_seq')::TEXT, 4, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ── Tabel utama ──
CREATE TABLE pengiriman (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nomor_faktur          TEXT UNIQUE NOT NULL,
  nomor_resi            TEXT UNIQUE,
  tanggal               TIMESTAMPTZ DEFAULT NOW(),

  jenis_layanan         TEXT NOT NULL DEFAULT 'reguler'
                          CHECK (jenis_layanan IN ('reguler','express','kargo')),

  -- Pengirim
  pengirim_nama         TEXT NOT NULL,
  pengirim_telepon      TEXT,
  pengirim_alamat       TEXT,
  pengirim_kota         TEXT,

  -- Penerima
  penerima_nama         TEXT NOT NULL,
  penerima_telepon      TEXT,
  penerima_alamat       TEXT,
  penerima_kota         TEXT,

  -- Berat & dimensi (utk pricing engine Fase 2 — berat_volumetrik = maks(berat aktual, volumetrik))
  berat_kg              NUMERIC(10,2) NOT NULL DEFAULT 0,
  panjang_cm            NUMERIC(10,2),
  lebar_cm              NUMERIC(10,2),
  tinggi_cm             NUMERIC(10,2),
  berat_volumetrik_kg   NUMERIC(10,2) GENERATED ALWAYS AS (
                          CASE WHEN panjang_cm IS NOT NULL AND lebar_cm IS NOT NULL AND tinggi_cm IS NOT NULL
                               THEN ROUND((panjang_cm * lebar_cm * tinggi_cm) / 6000.0, 2)
                               ELSE NULL END
                        ) STORED,

  isi_barang            TEXT,
  nilai_barang          NUMERIC(15,2) DEFAULT 0,

  -- Biaya (ongkir MANUAL di Fase 1 — pricing engine otomatis baru Fase 2)
  ongkir                NUMERIC(15,2) DEFAULT 0,
  biaya_asuransi        NUMERIC(15,2) DEFAULT 0,
  total_tagihan         NUMERIC(15,2) DEFAULT 0,

  -- Pembayaran — reuse enum yang sama persis dgn penjualan
  status_bayar          TEXT DEFAULT 'belum_bayar'
                          CHECK (status_bayar IN ('lunas','dp','belum_bayar')),
  metode_bayar          TEXT DEFAULT 'transfer'
                          CHECK (metode_bayar IN ('transfer','cod','cash')),
  uang_dp               NUMERIC(15,2) DEFAULT 0,

  -- Milestone — 4 tahap, tanpa percabangan
  milestone             TEXT DEFAULT 'diproses'
                          CHECK (milestone IN ('diproses','dijemput','dikirim','selesai')),

  -- Petugas lapangan (kurir utk reguler/express, sopir utk kargo) — free text, pola sama dgn `sopir` lama
  petugas_nama          TEXT,
  petugas_telepon       TEXT,

  catatan               TEXT,
  catatan_internal      TEXT,

  created_by            UUID REFERENCES profiles(id),
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_pengiriman_nomor_resi ON pengiriman (nomor_resi);
CREATE INDEX idx_pengiriman_milestone ON pengiriman (milestone);

CREATE TRIGGER set_nomor_pengiriman BEFORE INSERT ON pengiriman
  FOR EACH ROW EXECUTE FUNCTION generate_nomor_pengiriman();

-- update_updated_at() sudah ada di DB (dipakai penjualan) — reuse, tidak perlu dibuat ulang.
CREATE TRIGGER update_pengiriman_updated_at BEFORE UPDATE ON pengiriman
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE pengiriman ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_all_pengiriman" ON pengiriman FOR ALL USING (auth.uid() IS NOT NULL);

-- ── Tracking / riwayat milestone ──
CREATE TABLE pengiriman_tracking (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pengiriman_id  UUID NOT NULL REFERENCES pengiriman(id) ON DELETE CASCADE,
  milestone      TEXT NOT NULL CHECK (milestone IN ('diproses','dijemput','dikirim','selesai')),
  catatan        TEXT,
  foto_url       TEXT,
  created_by     UUID REFERENCES profiles(id),
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE pengiriman_tracking ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_all_pengiriman_tracking" ON pengiriman_tracking FOR ALL USING (auth.uid() IS NOT NULL);
-- Sengaja TIDAK ada policy anon langsung di tabel ini (beda dgn tracking_progress lama
-- yang -- ternyata, tidak terdokumentasi di CLAUDE.MD -- punya policy "anon_read_tracking"
-- FOR SELECT TO anon USING (true) langsung ke tabel mentah). Akses publik hanya lewat
-- view pengiriman_riwayat_publik di bawah, sesuai disiplin yang seharusnya dari awal.

-- ── Pembayaran / pelunasan ──
CREATE TABLE pengiriman_pembayaran (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pengiriman_id  UUID NOT NULL REFERENCES pengiriman(id) ON DELETE CASCADE,
  jumlah         NUMERIC(15,2) NOT NULL,
  metode         TEXT NOT NULL CHECK (metode IN ('transfer','cod','cash')),
  catatan        TEXT,
  foto_url       TEXT,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE pengiriman_pembayaran ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_all_pengiriman_pembayaran" ON pengiriman_pembayaran FOR ALL USING (auth.uid() IS NOT NULL);

-- ── Views publik tracking — dipakai HANYA oleh /resi/[nomor] baru, HANYA baca pengiriman ──
DROP VIEW IF EXISTS pengiriman_publik;
DROP VIEW IF EXISTS pengiriman_riwayat_publik;

CREATE VIEW pengiriman_publik AS
SELECT
  p.nomor_resi,
  p.milestone,
  p.jenis_layanan,
  p.tanggal        AS tanggal_pesan,
  p.penerima_nama,
  p.penerima_kota,
  p.isi_barang,
  p.berat_kg,
  p.total_tagihan  AS grand_total
FROM pengiriman p
WHERE p.nomor_resi IS NOT NULL;

CREATE VIEW pengiriman_riwayat_publik AS
SELECT
  p.nomor_resi,
  pt.milestone,
  pt.catatan,
  pt.foto_url,
  pt.created_at
FROM pengiriman_tracking pt
JOIN pengiriman p ON p.id = pt.pengiriman_id
WHERE p.nomor_resi IS NOT NULL;

GRANT SELECT ON pengiriman_publik TO anon;
GRANT SELECT ON pengiriman_riwayat_publik TO anon;

NOTIFY pgrst, 'reload schema';
