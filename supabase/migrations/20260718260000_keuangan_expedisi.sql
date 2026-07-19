-- ============================================================
-- Spec 06 — Perombakan Pengeluaran & Laporan Keuangan Expedisi — Step 1
--
-- A. Perluas tabel pengeluaran existing (REUSE, bukan tabel baru — data
--    pengeluaran furniture lama tetap ada sebagai arsip, tidak disentuh).
--    Hasil inspeksi Step 0: kolom kategori TIDAK punya CHECK constraint
--    (bebas teks, validasi daftar kategori baru cukup di aplikasi) —
--    tidak ada yang perlu di-DROP. Tidak ada kolom foto existing —
--    ditambahkan sekarang (foto_bukti, pola sama dgn klaim/cod_setoran/
--    manifest_biaya), opsional.
-- ============================================================
ALTER TABLE pengeluaran ADD COLUMN IF NOT EXISTS armada_id UUID REFERENCES armada(id);
  -- WAJIB diisi (enforce di form, Step 3) untuk kategori maintenance_armada/
  -- pajak_armada, NULL untuk kategori lain — memungkinkan laporan biaya per kendaraan
ALTER TABLE pengeluaran ADD COLUMN IF NOT EXISTS cabang_id UUID REFERENCES cabang(id);
  -- opsional, konsisten pola label cabang Fase 5
ALTER TABLE pengeluaran ADD COLUMN IF NOT EXISTS foto_bukti TEXT;
  -- opsional, path storage bucket BungaNaik: pengeluaran/{pengeluaran_id}/{timestamp}.{ext}

-- ============================================================
-- B. Timestamp penutupan klaim (dibutuhkan cash-basis beban klaim — klaim
--    masuk beban pada periode SELESAI, bukan periode kejadian). Hasil
--    inspeksi Step 0: klaim 0 baris di DB lokal saat ini, jadi backfill
--    di bawah adalah no-op lokal — tetap disertakan utk konsistensi
--    dengan environment lain yang sudah punya data klaim selesai.
-- ============================================================
ALTER TABLE klaim ADD COLUMN IF NOT EXISTS selesai_at TIMESTAMPTZ;
-- Diisi aplikasi saat tombol "Tandai Selesai" (bersama status='selesai', Step 2).
-- Backfill baris lama yang sudah selesai: pakai updated_at (aproksimasi
-- sadar, dicatat di CLAUDE.md).
UPDATE klaim SET selesai_at = updated_at
WHERE status = 'selesai' AND selesai_at IS NULL;

-- ============================================================
-- C. RLS pengeluaran — pola spec 05 (user_has_role()). Hasil inspeksi
--    Step 0: policy lama "authenticated_access" FOR ALL (roles
--    {authenticated}, auth.uid() IS NOT NULL) adalah jebakan permissive-
--    policy yang sama diperingatkan spec 05 — WAJIB di-DROP dulu.
--    SELECT tetap terbuka semua staf (tidak ada perubahan baca).
-- ============================================================
DROP POLICY IF EXISTS "authenticated_access" ON pengeluaran;

CREATE POLICY "select_pengeluaran" ON pengeluaran FOR SELECT
  USING (auth.uid() IS NOT NULL);
CREATE POLICY "insert_pengeluaran" ON pengeluaran FOR INSERT
  WITH CHECK (user_has_role(ARRAY['superadmin','keuangan']));
CREATE POLICY "update_pengeluaran" ON pengeluaran FOR UPDATE
  USING (user_has_role(ARRAY['superadmin','keuangan']))
  WITH CHECK (user_has_role(ARRAY['superadmin','keuangan']));
CREATE POLICY "delete_pengeluaran" ON pengeluaran FOR DELETE
  USING (user_has_role(ARRAY['superadmin','keuangan']));

NOTIFY pgrst, 'reload schema';
