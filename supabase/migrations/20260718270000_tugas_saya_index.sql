-- ============================================================
-- Spec 07 — Tugas Saya (halaman mobile kurir/sopir) — Step 1
-- Tidak ada tabel/kolom baru — murni UI di atas skema pengiriman
-- existing. Satu index tambahan untuk mempercepat query utama halaman
-- /tugas (petugas_id + milestone aktif, diakses setiap buka halaman).
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_pengiriman_petugas_milestone
  ON pengiriman (petugas_id, milestone);
