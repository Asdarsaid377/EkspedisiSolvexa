CREATE TABLE IF NOT EXISTS manifest_biaya (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  manifest_id  UUID NOT NULL REFERENCES manifest(id),
    -- default NO ACTION (BUKAN CASCADE): manifest yang sudah punya catatan
    -- biaya = pengeluaran uang nyata, tidak boleh hilang diam-diam ikut
    -- delete manifest. Hapus manifest ber-biaya akan gagal FK — pesan error
    -- mengarahkan hapus/pindahkan biayanya dulu secara sadar (pola sama
    -- seperti cabang yang masih dipakai).
  kategori     TEXT NOT NULL CHECK (kategori IN
                 ('uang_jalan','bbm','tol','kuli','parkir','lainnya')),
  jumlah       NUMERIC(15,2) NOT NULL CHECK (jumlah > 0),
  keterangan   TEXT,
  foto_bukti   TEXT,   -- struk/nota, path: manifest-biaya/{manifest_id}/{timestamp}.{ext}
  created_by   UUID REFERENCES profiles(id),
  created_at   TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_manifest_biaya_manifest ON manifest_biaya (manifest_id);

ALTER TABLE manifest_biaya ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_all_manifest_biaya" ON manifest_biaya
  FOR ALL USING (auth.uid() IS NOT NULL);
-- Staff-only. Role gating di React (konsisten codebase; hardening = spec 05).

NOTIFY pgrst, 'reload schema';
