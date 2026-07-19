-- ============================================================
-- Gagal Kirim, Retur & Proof of Delivery (POD)
-- Lihat docs/spec/01-gagal-kirim-pod.md untuk rationale lengkap.
-- Milestone baru: gagal_kirim, retur. POD wajib saat transisi ke selesai
-- (di-enforce di level aplikasi, bukan DB — lihat spec §3).
-- ============================================================

-- =====================================================================
-- A. Perluas CHECK milestone di pengiriman & pengiriman_tracking
--    (nama constraint dikonfirmasi dulu via pg_constraint, sesuai spec)
-- =====================================================================
ALTER TABLE pengiriman DROP CONSTRAINT IF EXISTS pengiriman_milestone_check;
ALTER TABLE pengiriman ADD CONSTRAINT pengiriman_milestone_check
  CHECK (milestone IN ('diproses','dijemput','dikirim','gagal_kirim','retur','selesai'));

ALTER TABLE pengiriman_tracking DROP CONSTRAINT IF EXISTS pengiriman_tracking_milestone_check;
ALTER TABLE pengiriman_tracking ADD CONSTRAINT pengiriman_tracking_milestone_check
  CHECK (milestone IN ('diproses','dijemput','dikirim','gagal_kirim','retur','selesai'));

-- =====================================================================
-- B. Kolom baru di pengiriman
-- =====================================================================
ALTER TABLE pengiriman ADD COLUMN IF NOT EXISTS jumlah_gagal INTEGER DEFAULT 0;
  -- counter: +1 setiap transisi ke gagal_kirim (di-update aplikasi, bukan trigger)
ALTER TABLE pengiriman ADD COLUMN IF NOT EXISTS pod_penerima_nama TEXT;
  -- nama orang yang BENAR-BENAR menerima (bisa beda dari penerima_nama)
ALTER TABLE pengiriman ADD COLUMN IF NOT EXISTS pod_foto_url TEXT;
  -- path Storage: tracking/{pengiriman_id}/{timestamp}.{ext} (reuse path lama)

-- =====================================================================
-- C. Kolom alasan gagal di pengiriman_tracking
--    (nullable — hanya diisi untuk baris milestone = 'gagal_kirim')
-- =====================================================================
ALTER TABLE pengiriman_tracking ADD COLUMN IF NOT EXISTS alasan_gagal TEXT
  CHECK (alasan_gagal IS NULL OR alasan_gagal IN
    ('penerima_tidak_ada','alamat_salah','tidak_bisa_dihubungi','ditolak_penerima','lainnya'));

-- =====================================================================
-- D. Recreate views publik (struktur kolom berubah → WAJIB DROP dulu,
--    jangan CREATE OR REPLACE — lihat larangan #16 di CLAUDE.md)
-- =====================================================================
DROP VIEW IF EXISTS pengiriman_riwayat_publik;
CREATE VIEW pengiriman_riwayat_publik AS
SELECT p.nomor_resi, pt.milestone, pt.alasan_gagal, pt.catatan, pt.foto_url, pt.created_at
FROM pengiriman_tracking pt
JOIN pengiriman p ON p.id = pt.pengiriman_id
WHERE p.nomor_resi IS NOT NULL;
GRANT SELECT ON pengiriman_riwayat_publik TO anon;

-- pengiriman_publik TIDAK berubah (milestone baru otomatis lewat kolom yang sama).
-- TETAP TIDAK expose: pod_penerima_nama & jumlah_gagal di view utama
-- (nama penerima aktual = data pribadi; jumlah gagal = detail internal).

NOTIFY pgrst, 'reload schema';
