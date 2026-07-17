-- ============================================================
-- FASE 4 — COD & Klaim
-- COD bukan metode pembayaran mayoritas (transfer/cash lebih dominan) —
-- modul ini sengaja ringan: cod_setoran cuma ledger setoran per sopir/kurir
-- (tanpa nomor dokumen formal), klaim pakai vokabulari status yang sama
-- dengan purchase_orders (pending -> disetujui/ditolak -> selesai).
-- Dibuat SEBELUM Fase 5 (Cabang/Agen) — belum ada konsep cabang_id di sini.
-- ============================================================

-- klaim: nomor sequence + trigger, pola sama seperti generate_nomor_manifest()
CREATE SEQUENCE IF NOT EXISTS nomor_klaim_seq;

CREATE OR REPLACE FUNCTION generate_nomor_klaim()
RETURNS trigger AS $$
BEGIN
  IF NEW.nomor_klaim IS NULL OR NEW.nomor_klaim = '' THEN
    NEW.nomor_klaim := 'KLM-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(NEXTVAL('nomor_klaim_seq')::TEXT, 4, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TABLE klaim (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nomor_klaim               TEXT UNIQUE NOT NULL,
  -- ON DELETE SET NULL (bukan CASCADE seperti pengiriman_tracking/pengiriman_pembayaran) —
  -- klaim adalah catatan finansial yang tidak boleh hilang diam-diam kalau pengiriman
  -- induknya terhapus (akses delete pengiriman cukup luas). Snapshot 2 kolom di bawah
  -- supaya klaim tetap bisa ditampilkan walau pengiriman induk sudah tidak ada.
  pengiriman_id             UUID REFERENCES pengiriman(id) ON DELETE SET NULL,
  pengiriman_nomor_resi     TEXT,
  pengiriman_penerima_nama  TEXT,
  tipe                      TEXT NOT NULL CHECK (tipe IN ('hilang','rusak')),
  status                    TEXT NOT NULL DEFAULT 'pending'
                               CHECK (status IN ('pending','disetujui','ditolak','selesai')),
  nilai_klaim               NUMERIC(15,2) NOT NULL DEFAULT 0,
  nilai_disetujui           NUMERIC(15,2),
  kronologi                 TEXT,
  catatan_approval          TEXT,
  foto_bukti                TEXT,
  created_by                UUID REFERENCES profiles(id),
  approved_by               UUID REFERENCES profiles(id),
  approved_at               TIMESTAMPTZ,
  created_at                TIMESTAMPTZ DEFAULT NOW(),
  updated_at                TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER set_nomor_klaim BEFORE INSERT ON klaim
  FOR EACH ROW EXECUTE FUNCTION generate_nomor_klaim();
CREATE TRIGGER update_klaim_updated_at BEFORE UPDATE ON klaim
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE INDEX idx_klaim_status ON klaim (status);
CREATE INDEX idx_klaim_pengiriman ON klaim (pengiriman_id);

ALTER TABLE klaim ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_all_klaim" ON klaim FOR ALL USING (auth.uid() IS NOT NULL);

-- cod_setoran: ledger setoran COD per sopir/kurir yang menyetor
CREATE TABLE cod_setoran (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sopir_id       UUID NOT NULL REFERENCES profiles(id),  -- sopir ATAU kurir, nama kolom ikut konvensi manifest.sopir_id
  jumlah         NUMERIC(15,2) NOT NULL,
  tanggal_setor  DATE NOT NULL DEFAULT CURRENT_DATE,
  catatan        TEXT,
  foto_bukti     TEXT,
  created_by     UUID REFERENCES profiles(id),
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_cod_setoran_sopir ON cod_setoran (sopir_id);

ALTER TABLE cod_setoran ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_all_cod_setoran" ON cod_setoran FOR ALL USING (auth.uid() IS NOT NULL);

NOTIFY pgrst, 'reload schema';
