-- ============================================================
-- Spec 09 — Riwayat Transit Multi-Hub — Step 1
-- Log transit TERPISAH dari milestone — murni informatif, tidak pernah
-- mengubah kolom pengiriman.milestone maupun CHECK constraint-nya.
-- Reuse tabel `cabang` sebagai hub (tidak ada entitas hub terpisah,
-- lihat Keputusan Terbuka #1 spec 09).
-- ============================================================

CREATE TABLE IF NOT EXISTS pengiriman_transit (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pengiriman_id UUID NOT NULL REFERENCES pengiriman(id) ON DELETE CASCADE,
    -- CASCADE (bukan NO ACTION seperti manifest_biaya/klaim) — ini log
    -- operasional yang melekat ke siklus hidup kiriman, bukan catatan
    -- finansial independen; pola sama dengan pengiriman_tracking.
  cabang_id     UUID NOT NULL REFERENCES cabang(id),
    -- reuse tabel cabang sebagai hub — TIDAK ada entitas hub terpisah
  tipe_event    TEXT NOT NULL CHECK (tipe_event IN ('tiba','berangkat')),
  manifest_id   UUID REFERENCES manifest(id),
    -- nullable: terisi otomatis kalau event lahir dari aksi manifest
    -- Berangkat (spec 09 §3 Step 3), NULL kalau diinput manual staf hub
  catatan       TEXT,
  created_by    UUID REFERENCES profiles(id),
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pengiriman_transit_pengiriman
  ON pengiriman_transit (pengiriman_id, created_at);

ALTER TABLE pengiriman_transit ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_all_pengiriman_transit" ON pengiriman_transit
  FOR ALL USING (auth.uid() IS NOT NULL);
-- Staff-only untuk tulis; role gate presisi (superadmin/gudang/kurir/sopir
-- utk input manual) tetap di React, sama pola dgn tabel lain yg belum
-- di-harden granular (armada/manifest/manifest_item/customer/dst).

-- View publik BARU — TIDAK menyentuh pengiriman_riwayat_publik existing
-- (view lama & semua yang bergantung padanya tetap apa adanya). Timeline
-- publik di /resi/[nomor] menggabung KEDUA view ini di level aplikasi
-- (dua query + merge + sort client-side), BUKAN lewat UNION di database.
DROP VIEW IF EXISTS pengiriman_transit_publik;
CREATE VIEW pengiriman_transit_publik AS
SELECT pt.pengiriman_id,
       p.nomor_resi,
       c.kota AS hub_kota,     -- HANYA kota, TIDAK PERNAH nama/alamat cabang
       pt.tipe_event,
       pt.created_at
FROM pengiriman_transit pt
JOIN pengiriman p ON p.id = pt.pengiriman_id
JOIN cabang c ON c.id = pt.cabang_id
WHERE p.nomor_resi IS NOT NULL;

GRANT SELECT ON pengiriman_transit_publik TO anon;

NOTIFY pgrst, 'reload schema';
