-- Spec 10 — Self-Service Booking (Fase 15), Step 1: skema.
--
-- ATURAN ARSITEKTUR (lihat docs/spec/10-booking-mandiri.md §2): akun
-- customer TIDAK PERNAH lewat Supabase Auth (auth.users). email/
-- password_hash di sini murni kolom data biasa, diverifikasi manual di
-- API route (service role) — BUKAN mekanisme Supabase Auth apa pun.
-- Konsekuensinya: TIDAK ADA RLS baru untuk mengizinkan customer membaca/
-- menulis apa pun di sini. RLS existing tabel `customer` (auth_all_customer,
-- staff-only) TIDAK disentuh sama sekali.

-- =====================================================================
-- A. Kolom akun login di customer (nullable — customer lama tanpa akun
--    booking mandiri tetap ada apa adanya)
-- =====================================================================
ALTER TABLE customer ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE customer ADD COLUMN IF NOT EXISTS password_hash TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_customer_email_unique
  ON customer (LOWER(email)) WHERE email IS NOT NULL;
-- Partial unique index (bukan UNIQUE constraint biasa) supaya banyak
-- baris customer lama dengan email NULL tidak saling bentrok.

-- =====================================================================
-- B. booking_request — draft order dari customer, wajib dikonfirmasi
--    staf sebelum jadi baris `pengiriman` sungguhan. Terpisah total dari
--    `pengiriman` (bukan milestone baru) — lihat rasional di spec §3.
-- =====================================================================
CREATE TABLE IF NOT EXISTS booking_request (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id       UUID NOT NULL REFERENCES customer(id),
  jenis_layanan     TEXT CHECK (jenis_layanan IN ('reguler','express','kargo')) NOT NULL,

  -- Snapshot pengirim, prefill dari customer saat submit (§4) — TIDAK
  -- auto-update kalau master customer berubah belakangan, pola sama
  -- pengiriman.pengirim_* (Fase 8).
  pengirim_nama     TEXT NOT NULL,
  pengirim_telepon  TEXT,
  pengirim_alamat   TEXT,
  pengirim_kota     TEXT,

  penerima_nama     TEXT NOT NULL,
  penerima_telepon  TEXT,
  penerima_alamat   TEXT,
  penerima_kota     TEXT,

  berat_kg          NUMERIC(10,2) NOT NULL DEFAULT 0,
  panjang_cm        NUMERIC(10,2),
  lebar_cm          NUMERIC(10,2),
  tinggi_cm         NUMERIC(10,2),

  isi_barang        TEXT,
  nilai_barang      NUMERIC(15,2) DEFAULT 0,
  ongkir_estimasi   NUMERIC(15,2),  -- hasil lookup tarif_zona saat submit
                                    -- (reguler/express); NULL utk kargo
  catatan           TEXT,

  status            TEXT CHECK (status IN ('pending','dikonfirmasi','ditolak')) NOT NULL DEFAULT 'pending',
  catatan_penolakan TEXT,
  pengiriman_id     UUID REFERENCES pengiriman(id),  -- terisi saat dikonfirmasi
  processed_by      UUID REFERENCES profiles(id),
  processed_at      TIMESTAMPTZ,

  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_booking_request_status
  ON booking_request (status, created_at);
CREATE INDEX IF NOT EXISTS idx_booking_request_customer
  ON booking_request (customer_id, created_at);

ALTER TABLE booking_request ENABLE ROW LEVEL SECURITY;
-- Staff-only, pola sama tabel operasional yang belum di-harden granular
-- (armada/manifest) — customer TIDAK PERNAH mengakses tabel ini langsung
-- lewat client Supabase, selalu lewat API route service-role (§4.1), jadi
-- policy longgar di sini tidak membuka apa pun ke customer.
CREATE POLICY "auth_all_booking_request" ON booking_request
  FOR ALL USING (auth.uid() IS NOT NULL);

NOTIFY pgrst, 'reload schema';
