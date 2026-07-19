-- ============================================================
-- Seed data lokal — dijalankan otomatis oleh `supabase db reset`
-- (lihat supabase/config.toml [db.seed] sql_paths). Aman dijalankan
-- berulang (ON CONFLICT DO NOTHING pakai unique index yang sama dgn
-- tarif_zona: lower(kota_asal), lower(kota_tujuan), jenis_layanan).
-- ============================================================

-- 30 baris tarif_zona — 15 rute × reguler/express, kota-kota besar
-- Indonesia. Rute dekat/satu pulau: estimasi lebih cepat & lebih murah.
-- Rute jauh/antar pulau: estimasi lebih lama & lebih mahal.
INSERT INTO tarif_zona (kota_asal, kota_tujuan, jenis_layanan, harga_per_kg, harga_flat_min, estimasi_hari, aktif)
VALUES
  ('Jakarta', 'Bandung', 'reguler', 7000, 30000, 2, true),
  ('Jakarta', 'Bandung', 'express', 14000, 50000, 1, true),

  ('Jakarta', 'Surabaya', 'reguler', 16000, 55000, 4, true),
  ('Jakarta', 'Surabaya', 'express', 28000, 95000, 2, true),

  ('Jakarta', 'Semarang', 'reguler', 12000, 45000, 3, true),
  ('Jakarta', 'Semarang', 'express', 22000, 80000, 2, true),

  ('Jakarta', 'Yogyakarta', 'reguler', 13000, 45000, 3, true),
  ('Jakarta', 'Yogyakarta', 'express', 24000, 85000, 2, true),

  ('Jakarta', 'Medan', 'reguler', 25000, 70000, 5, true),
  ('Jakarta', 'Medan', 'express', 42000, 130000, 3, true),

  ('Jakarta', 'Makassar', 'reguler', 27000, 75000, 5, true),
  ('Jakarta', 'Makassar', 'express', 45000, 140000, 3, true),

  ('Jakarta', 'Denpasar', 'reguler', 18000, 60000, 4, true),
  ('Jakarta', 'Denpasar', 'express', 32000, 100000, 2, true),

  ('Surabaya', 'Malang', 'reguler', 6000, 25000, 1, true),
  ('Surabaya', 'Malang', 'express', 11000, 40000, 1, true),

  ('Surabaya', 'Denpasar', 'reguler', 10000, 40000, 2, true),
  ('Surabaya', 'Denpasar', 'express', 18000, 65000, 1, true),

  ('Bandung', 'Semarang', 'reguler', 9000, 35000, 2, true),
  ('Bandung', 'Semarang', 'express', 17000, 60000, 1, true),

  ('Semarang', 'Yogyakarta', 'reguler', 6000, 25000, 1, true),
  ('Semarang', 'Yogyakarta', 'express', 11000, 40000, 1, true),

  ('Medan', 'Pekanbaru', 'reguler', 14000, 50000, 3, true),
  ('Medan', 'Pekanbaru', 'express', 24000, 85000, 2, true),

  ('Makassar', 'Manado', 'reguler', 20000, 65000, 4, true),
  ('Makassar', 'Manado', 'express', 35000, 110000, 2, true),

  ('Balikpapan', 'Banjarmasin', 'reguler', 15000, 50000, 3, true),
  ('Balikpapan', 'Banjarmasin', 'express', 26000, 90000, 2, true),

  ('Palembang', 'Jakarta', 'reguler', 15000, 50000, 3, true),
  ('Palembang', 'Jakarta', 'express', 26000, 90000, 2, true)
ON CONFLICT (lower(kota_asal), lower(kota_tujuan), jenis_layanan) DO NOTHING;
