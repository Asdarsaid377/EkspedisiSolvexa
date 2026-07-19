-- =====================================================================
-- A. petugas_id FK + snapshot estimasi_hari di pengiriman
-- =====================================================================
ALTER TABLE pengiriman ADD COLUMN IF NOT EXISTS petugas_id UUID REFERENCES profiles(id);
  -- nullable: petugas non-staff (freelance/harian) tetap boleh teks bebas
  -- TIDAK ON DELETE CASCADE/SET NULL eksplisit → default NO ACTION:
  -- profile yang masih direferensikan pengiriman tidak bisa dihapus (aman)

ALTER TABLE pengiriman ADD COLUMN IF NOT EXISTS estimasi_hari INTEGER;
  -- SNAPSHOT dari tarif_zona saat pengiriman dibuat (bukan JOIN saat query,
  -- karena tarif bisa berubah/dihapus). NULL untuk kargo & baris lama.

CREATE INDEX IF NOT EXISTS idx_pengiriman_petugas_id ON pengiriman (petugas_id);
CREATE INDEX IF NOT EXISTS idx_pengiriman_cabang_id  ON pengiriman (cabang_id);
CREATE INDEX IF NOT EXISTS idx_pengiriman_tanggal    ON pengiriman (tanggal);

-- =====================================================================
-- B. Backfill petugas_id dari pencocokan nama (SEKALI, data masih sedikit)
-- =====================================================================
UPDATE pengiriman pg
SET petugas_id = pr.id
FROM profiles pr
WHERE pg.petugas_id IS NULL
  AND pg.petugas_nama IS NOT NULL
  AND LOWER(TRIM(pg.petugas_nama)) = LOWER(TRIM(pr.name))
  AND pr.role IN ('sopir','kurir');

-- Verifikasi sisa yang tidak ke-match (perbaiki manual kalau typo nama):
-- SELECT id, nomor_faktur, petugas_nama FROM pengiriman
-- WHERE petugas_id IS NULL AND petugas_nama IS NOT NULL;

NOTIFY pgrst, 'reload schema';
