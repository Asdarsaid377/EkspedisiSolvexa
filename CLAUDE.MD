# CLAUDE.md — BungaNaik Stock Management System

## Project Overview

**BungaNaik** adalah sistem manajemen stok dan penjualan berbasis web untuk toko furniture.
Dibangun dengan **Next.js 14 (App Router) + Supabase (PostgreSQL + Auth + Storage)**.

---

## Tech Stack

| Layer      | Teknologi                                       |
| ---------- | ----------------------------------------------- |
| Frontend   | Next.js 14 App Router, TypeScript, Tailwind CSS |
| Backend/DB | Supabase (PostgreSQL, Auth, RLS, Storage)       |
| Auth       | Supabase Auth + SSR (`@supabase/ssr`)           |
| Charts     | Recharts                                        |
| Icons      | Lucide React                                    |
| QR Code    | `qrcode.react` (`QRCodeCanvas`)                 |
| Face ID    | `face-api.js` (deteksi & descriptor wajah client-side, model di `/public/models`) |
| Dev Server | Next.js dengan Turbopack (`next dev --turbo`)   |

---

## Project Structure

```
/
├── app/
│   ├── layout.tsx
│   ├── page.tsx                        # Redirect ke /dashboard
│   ├── login/page.tsx
│   ├── katalog/page.tsx                # Katalog reseller — harga_katalog, cart bunganik_cart
│   ├── toko/
│   │   ├── page.tsx                   # Katalog umum pembeli umum — harga +25%, cart bng_toko_cart
│   │   └── [id]/page.tsx              # Detail produk pembeli umum — gallery, cart, WA checkout
│   ├── etalase/
│   │   ├── page.tsx                   # Katalog publik kedua — harga +35%, cart bng_etalase_cart
│   │   └── [id]/page.tsx              # Detail produk Etalase — gallery, cart, WA checkout
│   ├── landing/page.tsx                # Landing page marketing — hero, fitur, cara kerja, CTA WA/Etalase
│   ├── produk/
│   │   ├── layout.tsx                  # Minimal wrapper (html/body saja)
│   │   └── [id]/page.tsx              # Detail produk QR scan — GATED kode internal, gallery, +25%
│   ├── resi/
│   │   └── [nomor]/page.tsx           # Tracking pesanan publik — milestone, foto, riwayat update
│   ├── dashboard/
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   ├── produk/page.tsx             # CRUD produk + multi-foto + rek. harga jual +25%
│   │   ├── reseller/page.tsx
│   │   ├── pelanggan/page.tsx          # Database customer dikelompokkan per reseller
│   │   ├── penjualan/
│   │   │   ├── page.tsx               # Input + monitoring penjualan + pelunasan (superadmin/kasir/keuangan)
│   │   │   └── [id]/page.tsx          # Detail invoice + milestone + review + delete + pelunasan + foto bukti
│   │   ├── po/page.tsx                 # Purchase Order + prioritas badge
│   │   ├── target/page.tsx
│   │   ├── pencocokan/page.tsx         # Audit nota oleh owner (setelah proses)
│   │   ├── owner/
│   │   │   └── workspace/page.tsx     # Meja Kerja Owner — reminder, monitoring, catatan
│   │   ├── laporan/
│   │   │   ├── page.tsx
│   │   │   ├── reseller/page.tsx
│   │   │   ├── produk/page.tsx
│   │   │   ├── sopir/page.tsx
│   │   │   └── review/page.tsx        # Laporan kritik & saran — satisfaction rate, donut chart
│   │   ├── stock-aging/page.tsx
│   │   ├── keuangan/
│   │   │   ├── laporan/page.tsx
│   │   │   └── pengeluaran/page.tsx
│   │   ├── hpp/
│   │   │   ├── bahan-baku/page.tsx    # Master bahan baku + mutasi stok (inline icon buttons)
│   │   │   ├── pembelian/page.tsx     # Pembelian bahan baku
│   │   │   ├── bom/page.tsx           # Bill of Materials per produk — estimasi biaya per unit
│   │   │   ├── batch/page.tsx         # Batch produksi + HPP aktual vs standar
│   │   │   └── laporan/page.tsx       # Laporan HPP + variance bahan per periode
│   │   └── pengguna/page.tsx
│   └── api/
│       ├── create-user/route.ts
│       └── verify-kode/route.ts       # POST — verifikasi kode internal produk (service role)
├── components/Sidebar.tsx             # NavLink & SubNavLink di luar komponen (no unmount/remount)
├── contexts/AuthContext.tsx           # onAuthStateChange only, singleton client, skip TOKEN_REFRESHED
├── lib/
│   ├── supabase/client.ts             # Singleton createClient() — satu instance per tab
│   ├── supabase/server.ts
│   ├── supabase/middleware.ts
│   ├── types.ts
│   └── utils.ts                       # formatRupiah, formatDate, waLink(), generateNomorResi(), insertPenjualanWithResi()
├── middleware.ts                       # Hanya proteksi /dashboard — /toko, /katalog, /resi, /produk bebas
└── supabase-schema.sql
```

---

## Database Schema

### Tabel Utama

#### `profiles`

```sql
id UUID (FK -> auth.users)
name TEXT
role TEXT CHECK ('superadmin' | 'kasir' | 'keuangan' | 'cs' | 'gudang' | 'pengiriman' | 'produksi' | 'sopir')
created_at TIMESTAMPTZ
```

#### `produk`

```sql
id UUID PRIMARY KEY
nama TEXT UNIQUE
kategori TEXT
satuan TEXT DEFAULT 'unit'
harga_modal NUMERIC
harga_katalog NUMERIC
stok INTEGER
stok_minimum INTEGER DEFAULT 0
deskripsi TEXT
foto_url TEXT              -- kolom lama, fallback jika produk_foto kosong
aktif BOOLEAN DEFAULT true
created_at, updated_at TIMESTAMPTZ
```

#### `produk_foto`

Foto produk multiple — diupload via Supabase Storage bucket `BungaNaik`.

```sql
id UUID PRIMARY KEY DEFAULT gen_random_uuid()
produk_id UUID FK -> produk (ON DELETE CASCADE)
url TEXT NOT NULL          -- public URL dari Supabase Storage
urutan INTEGER DEFAULT 0   -- urutan tampil, dipakai ORDER BY urutan
created_at TIMESTAMPTZ DEFAULT NOW()
```

**RLS policies yang perlu dijalankan:**

```sql
CREATE POLICY "auth_all_produk_foto" ON produk_foto FOR ALL USING (auth.uid() IS NOT NULL);
CREATE POLICY "anon_read_produk_foto" ON produk_foto FOR SELECT TO anon USING (true);

CREATE POLICY "auth_upload_foto" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'BungaNaik');
CREATE POLICY "auth_delete_foto" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'BungaNaik');
CREATE POLICY "public_read_foto" ON storage.objects FOR SELECT TO public
  USING (bucket_id = 'BungaNaik');
```

#### `resellers`

```sql
id UUID PRIMARY KEY
nama TEXT
telepon TEXT
alamat TEXT
kota TEXT
catatan TEXT
aktif BOOLEAN DEFAULT true
koreksi_admin NUMERIC(15,2) DEFAULT 0     -- koreksi/potongan total bonus (bukan per transaksi)
koreksi_asisten NUMERIC(15,2) DEFAULT 0   -- koreksi/potongan total bonus (bukan per transaksi)
sedekah_mimbar NUMERIC(15,2) DEFAULT 0    -- koreksi/potongan total bonus (bukan per transaksi)
created_at, updated_at TIMESTAMPTZ
```

#### `penjualan`

```sql
id UUID PRIMARY KEY
nomor_faktur TEXT UNIQUE        -- auto: INV-YYYYMMDD-XXXX
nomor_resi TEXT UNIQUE          -- auto: BNG-XXXXXXXX (8 char, charset tanpa O/0/I/1)
reseller_id UUID FK -> resellers
po_id UUID FK -> purchase_orders (nullable)
tanggal TIMESTAMPTZ
milestone TEXT CHECK ('diproses' | 'diproduksi' | 'dikirim' | 'selesai') DEFAULT 'diproses'
total_harga_katalog NUMERIC
total_harga_jual NUMERIC
total_ongkir NUMERIC
total_bonus NUMERIC
total_laba NUMERIC
bonus_terbayar NUMERIC DEFAULT 0
bonus_owner NUMERIC DEFAULT 0   -- bonus manual dari owner (superadmin only)
catatan_bonus_owner TEXT
uang_dp NUMERIC DEFAULT 0
status_bayar TEXT CHECK ('lunas' | 'dp' | 'belum_bayar')
metode_bayar TEXT CHECK ('transfer' | 'cod' | 'cash')
sopir TEXT
telepon_sopir TEXT
tujuan TEXT
nama_customer TEXT             -- nama customer end-user (opsional)
telepon_customer TEXT          -- telepon customer (opsional, link WA)
catatan TEXT
catatan_internal TEXT          -- catatan internal (tidak tampil ke customer)
created_by UUID FK -> profiles
created_at, updated_at TIMESTAMPTZ
```

#### `penjualan_item`

```sql
id UUID PRIMARY KEY
penjualan_id UUID FK -> penjualan (ON DELETE CASCADE)
produk_id UUID FK -> produk
jumlah INTEGER
harga_modal NUMERIC         -- snapshot, diupdate via rekalkulasi_laba()
harga_katalog NUMERIC       -- snapshot
harga_jual NUMERIC
ongkir NUMERIC DEFAULT 0
bonus NUMERIC DEFAULT 0
laba NUMERIC DEFAULT 0      -- BUKAN generated column (REST API tidak support UPDATE tanpa WHERE)
created_at TIMESTAMPTZ
```

#### `penjualan_pembayaran`

```sql
id UUID PRIMARY KEY
penjualan_id UUID FK -> penjualan (ON DELETE CASCADE)
jumlah NUMERIC(15,2)
metode TEXT CHECK ('transfer' | 'cod' | 'cash')
catatan TEXT
foto_url TEXT               -- path: pelunasan/{penjualan_id}/{timestamp}.{ext} (nullable)
created_at TIMESTAMPTZ
```

#### `reseller_reviews`

Review/komplain/pujian per transaksi.

```sql
id UUID PRIMARY KEY DEFAULT gen_random_uuid()
penjualan_id UUID FK -> penjualan (ON DELETE CASCADE)
tipe TEXT CHECK ('komplain' | 'pujian' | 'catatan')
isi TEXT NOT NULL
resolved BOOLEAN DEFAULT false
status TEXT                    -- 'resolved' saat diselesaikan
resolved_at TIMESTAMPTZ
created_by UUID FK -> profiles
created_at TIMESTAMPTZ DEFAULT NOW()
```

#### `mutasi_stok`

```sql
id UUID PRIMARY KEY
produk_id UUID FK -> produk (ON DELETE CASCADE)
tipe TEXT CHECK ('masuk' | 'keluar' | 'koreksi')
jumlah INTEGER
stok_sebelum INTEGER
stok_sesudah INTEGER
keterangan TEXT
referensi_id UUID
created_by UUID FK -> profiles
created_at TIMESTAMPTZ
```

#### `purchase_orders`

```sql
id UUID PRIMARY KEY
nomor_po TEXT UNIQUE            -- auto client-side: PO-YYYYMMDD-XXXX
pemohon_tipe TEXT CHECK ('reseller' | 'customer')
pemohon_nama TEXT
reseller_id UUID FK -> resellers (nullable)
tanggal_po TIMESTAMPTZ
tanggal_estimasi DATE           -- nama kolom: tanggal_estimasi (bukan estimasi_selesai)
prioritas TEXT CHECK ('rendah' | 'normal' | 'tinggi' | 'urgent') DEFAULT 'normal'
status TEXT CHECK ('pending' | 'proses' | 'selesai' | 'batal') DEFAULT 'pending'
catatan TEXT
foto_url TEXT                   -- foto referensi PO, path: po-foto/{po_id}/{timestamp}.{ext}
created_by UUID FK -> profiles
created_at, updated_at TIMESTAMPTZ
```

#### `purchase_order_items`

```sql
id UUID PRIMARY KEY
po_id UUID FK -> purchase_orders (ON DELETE CASCADE)
produk_id UUID FK -> produk (nullable)  -- null jika produk custom
nama_produk TEXT
jumlah INTEGER
satuan TEXT
catatan TEXT
created_at TIMESTAMPTZ
```

#### `tracking_progress`

Update milestone per penjualan — diisi oleh staff sesuai role.

```sql
id UUID PRIMARY KEY DEFAULT gen_random_uuid()
penjualan_id UUID FK -> penjualan (ON DELETE CASCADE)
milestone TEXT CHECK ('diproses' | 'diproduksi' | 'dikirim' | 'selesai')
persentase INTEGER              -- untuk milestone diproduksi (0-100)
catatan TEXT
foto_url TEXT                  -- path: tracking/{penjualan_id}/{timestamp}.{ext}
created_by UUID FK -> profiles
created_at TIMESTAMPTZ DEFAULT NOW()
```

#### `owner_reminders`

Reminder manual dan otomatis untuk owner.

```sql
id UUID PRIMARY KEY DEFAULT gen_random_uuid()
tipe TEXT CHECK ('audit_nota' | 'stock_opname' | 'catatan_kebijakan')
judul TEXT NOT NULL
isi TEXT
status TEXT CHECK ('pending' | 'selesai' | 'terlewat') DEFAULT 'pending'
due_date DATE
created_by UUID FK -> profiles
created_at TIMESTAMPTZ DEFAULT NOW()
updated_at TIMESTAMPTZ DEFAULT NOW()
```

#### `audit_log`

Riwayat immutable kapan audit/opname diselesaikan.

```sql
id UUID PRIMARY KEY DEFAULT gen_random_uuid()
tipe TEXT CHECK ('audit_nota' | 'stock_opname')
catatan TEXT
created_by UUID FK -> profiles
created_at TIMESTAMPTZ DEFAULT NOW()
```

#### `owner_settings`

Key-value store untuk konfigurasi owner.

```sql
key TEXT PRIMARY KEY
value TEXT NOT NULL
updated_by UUID FK -> profiles
updated_at TIMESTAMPTZ DEFAULT NOW()
```

**Keys yang digunakan:**

- `siklus_audit_nota_hari` — default `"14"`
- `siklus_stock_opname_hari` — default `"30"`
- `kode_internal_produk` — kode akses gate halaman `/produk/[id]` (QR scan)
- `absensi_lat`, `absensi_lng` — koordinat lokasi absensi (kantor/toko)
- `absensi_radius_meter` — radius toleransi absen dalam meter (default `"100"`)

#### `face_enrollment`

Data pendaftaran wajah karyawan untuk verifikasi absensi. **Menyimpan
descriptor wajah (128 angka desimal / face embedding), BUKAN foto** —
tidak ada gambar wajah yang pernah disimpan di server.

```sql
profile_id UUID PRIMARY KEY FK -> profiles (ON DELETE CASCADE)
descriptor JSONB NOT NULL        -- array 128 angka float (face-api.js descriptor)
created_at, updated_at TIMESTAMPTZ
```

#### `absensi`

Log absensi masuk/pulang karyawan, hasil verifikasi wajah + lokasi.

```sql
id UUID PRIMARY KEY DEFAULT gen_random_uuid()
profile_id UUID FK -> profiles (ON DELETE CASCADE)
tipe TEXT CHECK ('masuk' | 'pulang')
waktu TIMESTAMPTZ DEFAULT NOW()
lat NUMERIC(10,7) NOT NULL
lng NUMERIC(10,7) NOT NULL
jarak_meter NUMERIC(10,2)        -- jarak dari lokasi absensi saat itu
created_at TIMESTAMPTZ DEFAULT NOW()
```

---

### Views Publik

#### `tracking_publik`

Diakses oleh anon (customer) untuk cek status pesanan.

```sql
CREATE VIEW tracking_publik AS
SELECT
    pj.nomor_resi,
    pj.milestone,
    pj.tujuan,
    pj.tanggal          AS tanggal_pesan,
    po.tanggal_estimasi,
    p.nama              AS nama_produk,
    pi.jumlah,
    pj.total_harga_jual AS grand_total
FROM penjualan pj
LEFT JOIN penjualan_item pi  ON pi.penjualan_id = pj.id
LEFT JOIN produk p           ON p.id = pi.produk_id
LEFT JOIN purchase_orders po ON po.id = pj.po_id
WHERE pj.nomor_resi IS NOT NULL;

GRANT SELECT ON tracking_publik TO anon;
```

#### `tracking_riwayat_publik`

Riwayat update milestone per resi.

```sql
CREATE VIEW tracking_riwayat_publik AS
SELECT
    pj.nomor_resi,
    tp.milestone,
    tp.persentase,
    tp.catatan,
    tp.foto_url,
    tp.created_at
FROM tracking_progress tp
JOIN penjualan pj ON pj.id = tp.penjualan_id
WHERE pj.nomor_resi IS NOT NULL;

GRANT SELECT ON tracking_riwayat_publik TO anon;
```

> **PENTING — Views publik TIDAK BOLEH mengekspos**: `harga_modal`, `total_laba`, `total_bonus`, `bonus_owner`, `nama_customer`, `telepon_customer`, `harga_katalog`. Selalu `DROP VIEW IF EXISTS` sebelum recreate jika struktur kolom berubah.

---

### Tabel Modul HPP

```sql
CREATE TABLE bahan_baku (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kode TEXT UNIQUE,
  nama TEXT NOT NULL UNIQUE,
  satuan TEXT NOT NULL,
  harga_beli_terakhir NUMERIC(15,2) DEFAULT 0,
  stok NUMERIC(15,3) DEFAULT 0,       -- NUMERIC bukan INT (bisa pecahan: 0.5 meter)
  stok_minimum NUMERIC(15,3) DEFAULT 0,
  catatan TEXT,
  aktif BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE pembelian_bahan_baku (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nomor_pembelian TEXT UNIQUE NOT NULL,
  tanggal TIMESTAMPTZ DEFAULT NOW(),
  supplier TEXT,
  total_nilai NUMERIC(15,2) DEFAULT 0,
  catatan TEXT,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE pembelian_bahan_baku_item (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pembelian_id UUID REFERENCES pembelian_bahan_baku(id) ON DELETE CASCADE,
  bahan_baku_id UUID REFERENCES bahan_baku(id),
  jumlah NUMERIC(15,3) NOT NULL,
  harga_satuan NUMERIC(15,2) NOT NULL,
  subtotal NUMERIC(15,2) GENERATED ALWAYS AS (jumlah * harga_satuan) STORED,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE mutasi_bahan_baku (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bahan_baku_id UUID REFERENCES bahan_baku(id) ON DELETE CASCADE,
  tipe TEXT CHECK (tipe IN ('masuk', 'keluar', 'koreksi')) NOT NULL,
  jumlah NUMERIC(15,3) NOT NULL,
  stok_sebelum NUMERIC(15,3) NOT NULL,
  stok_sesudah NUMERIC(15,3) NOT NULL,
  harga_satuan NUMERIC(15,2) DEFAULT 0,
  keterangan TEXT,
  referensi_id UUID,
  referensi_tipe TEXT,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE bom (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  produk_id UUID REFERENCES produk(id) ON DELETE CASCADE,
  bahan_baku_id UUID REFERENCES bahan_baku(id),
  jumlah_standar NUMERIC(15,3) NOT NULL,
  catatan TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(produk_id, bahan_baku_id)
);
ALTER TABLE bom ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_all_bom" ON bom FOR ALL USING (auth.uid() IS NOT NULL);

CREATE TABLE batch_produksi (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nomor_batch TEXT UNIQUE NOT NULL,
  produk_id UUID REFERENCES produk(id),
  nama_produk TEXT NOT NULL,
  target_unit INTEGER NOT NULL,
  unit_selesai INTEGER DEFAULT 0,
  status TEXT CHECK (status IN ('draft', 'proses', 'selesai', 'batal')) DEFAULT 'draft',
  tanggal_mulai DATE,
  tanggal_selesai DATE,
  upah_borongan NUMERIC(15,2) DEFAULT 0,
  catatan_upah TEXT,
  hpp_standar_per_unit NUMERIC(15,2),
  hpp_aktual_per_unit NUMERIC(15,2),
  total_biaya_bahan NUMERIC(15,2) DEFAULT 0,
  total_biaya_upah NUMERIC(15,2) DEFAULT 0,
  total_hpp NUMERIC(15,2) DEFAULT 0,
  catatan TEXT,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE batch_produksi ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_all_batch" ON batch_produksi FOR ALL USING (auth.uid() IS NOT NULL);

CREATE TABLE batch_pemakaian_bahan (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id UUID REFERENCES batch_produksi(id) ON DELETE CASCADE,
  bahan_baku_id UUID REFERENCES bahan_baku(id),
  nama_bahan TEXT NOT NULL,
  satuan TEXT NOT NULL,
  jumlah_standar NUMERIC(15,3),
  jumlah_aktual NUMERIC(15,3) DEFAULT 0,
  harga_satuan NUMERIC(15,2) DEFAULT 0,
  subtotal NUMERIC(15,2) DEFAULT 0,
  selisih NUMERIC(15,3),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE batch_pemakaian_bahan ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_all_batch_bahan" ON batch_pemakaian_bahan FOR ALL USING (auth.uid() IS NOT NULL);
```

---

## SQL Functions

### `rekalkulasi_laba()`

```sql
CREATE OR REPLACE FUNCTION rekalkulasi_laba()
RETURNS void AS $$
BEGIN
  UPDATE penjualan_item pi
  SET harga_modal = p.harga_modal
  FROM produk p WHERE pi.produk_id = p.id;

  UPDATE penjualan_item
  SET laba = harga_katalog - harga_modal
  WHERE id IS NOT NULL;

  UPDATE penjualan pj
  SET total_laba = (
    SELECT COALESCE(SUM(laba), 0)
    FROM penjualan_item WHERE penjualan_id = pj.id
  )
  WHERE pj.id IS NOT NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
   SET search_path = public
   SET row_security = off;
```

### `generate_nomor_faktur()` — Trigger BEFORE INSERT pada `penjualan`

Format: `INV-YYYYMMDD-0001`

### `handle_new_user()` — Trigger AFTER INSERT pada `auth.users`

---

## SQL yang Perlu Dijalankan di Supabase

```sql
-- Kolom tambahan di penjualan
ALTER TABLE penjualan ADD COLUMN IF NOT EXISTS telepon_sopir TEXT;
ALTER TABLE penjualan ADD COLUMN IF NOT EXISTS nama_customer TEXT;
ALTER TABLE penjualan ADD COLUMN IF NOT EXISTS telepon_customer TEXT;
ALTER TABLE penjualan ADD COLUMN IF NOT EXISTS nomor_resi TEXT UNIQUE;
ALTER TABLE penjualan ADD COLUMN IF NOT EXISTS milestone TEXT DEFAULT 'diproses';
ALTER TABLE penjualan ADD COLUMN IF NOT EXISTS po_id UUID REFERENCES purchase_orders(id);
ALTER TABLE penjualan ADD COLUMN IF NOT EXISTS catatan_internal TEXT;

-- Kolom foto bukti transfer di penjualan_pembayaran
ALTER TABLE penjualan_pembayaran ADD COLUMN IF NOT EXISTS foto_url TEXT;

-- Kolom lama foto produk (fallback)
ALTER TABLE produk ADD COLUMN IF NOT EXISTS foto_url TEXT;

-- Kolom prioritas di purchase_orders
ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS prioritas TEXT
  CHECK (prioritas IN ('rendah','normal','tinggi','urgent')) DEFAULT 'normal';

-- Kolom foto referensi di purchase_orders
ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS foto_url TEXT;

-- Nama kolom estimasi di purchase_orders: tanggal_estimasi (bukan estimasi_selesai)

-- Index performa
CREATE INDEX IF NOT EXISTS idx_penjualan_nomor_resi ON penjualan (nomor_resi);

-- RLS katalog publik (produk)
CREATE POLICY "anon_read_produk_aktif" ON produk
  FOR SELECT TO anon USING (aktif = true);

-- Tabel tracking progress
CREATE TABLE IF NOT EXISTS tracking_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  penjualan_id UUID REFERENCES penjualan(id) ON DELETE CASCADE,
  milestone TEXT CHECK (milestone IN ('diproses','diproduksi','dikirim','selesai')),
  persentase INTEGER,
  catatan TEXT,
  foto_url TEXT,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE tracking_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_all_tracking" ON tracking_progress FOR ALL USING (auth.uid() IS NOT NULL);

-- Views publik tracking
DROP VIEW IF EXISTS tracking_publik;
DROP VIEW IF EXISTS tracking_riwayat_publik;
CREATE VIEW tracking_publik AS
SELECT pj.nomor_resi, pj.milestone, pj.tujuan, pj.tanggal AS tanggal_pesan,
       po.tanggal_estimasi, p.nama AS nama_produk, pi.jumlah, pj.total_harga_jual AS grand_total
FROM penjualan pj
LEFT JOIN penjualan_item pi  ON pi.penjualan_id = pj.id
LEFT JOIN produk p           ON p.id = pi.produk_id
LEFT JOIN purchase_orders po ON po.id = pj.po_id
WHERE pj.nomor_resi IS NOT NULL;

CREATE VIEW tracking_riwayat_publik AS
SELECT pj.nomor_resi, tp.milestone, tp.persentase, tp.catatan, tp.foto_url, tp.created_at
FROM tracking_progress tp
JOIN penjualan pj ON pj.id = tp.penjualan_id
WHERE pj.nomor_resi IS NOT NULL;

GRANT SELECT ON tracking_publik TO anon;
GRANT SELECT ON tracking_riwayat_publik TO anon;

-- Tabel owner workspace
CREATE TABLE IF NOT EXISTS owner_reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tipe TEXT CHECK (tipe IN ('audit_nota','stock_opname','catatan_kebijakan')),
  judul TEXT NOT NULL,
  isi TEXT,
  status TEXT CHECK (status IN ('pending','selesai','terlewat')) DEFAULT 'pending',
  due_date DATE,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE owner_reminders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_all_reminders" ON owner_reminders FOR ALL USING (auth.uid() IS NOT NULL);

CREATE TABLE IF NOT EXISTS audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tipe TEXT CHECK (tipe IN ('audit_nota','stock_opname')),
  catatan TEXT,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_all_audit_log" ON audit_log FOR ALL USING (auth.uid() IS NOT NULL);

CREATE TABLE IF NOT EXISTS owner_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_by UUID REFERENCES profiles(id),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE owner_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_all_owner_settings" ON owner_settings FOR ALL USING (auth.uid() IS NOT NULL);

-- Kode internal untuk gate halaman /produk/[id]
INSERT INTO owner_settings (key, value, updated_by)
VALUES ('kode_internal_produk', 'BUNGA2024', NULL)
ON CONFLICT (key) DO NOTHING;

-- Tabel absensi karyawan (face verification + geofencing)
CREATE TABLE IF NOT EXISTS face_enrollment (
  profile_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  descriptor JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE face_enrollment ENABLE ROW LEVEL SECURITY;
-- Descriptor wajah data sensitif: hanya pemilik & superadmin yang boleh akses
CREATE POLICY "own_face_enrollment" ON face_enrollment FOR ALL
  USING (
    auth.uid() = profile_id
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'superadmin')
  );

CREATE TABLE IF NOT EXISTS absensi (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  tipe TEXT CHECK (tipe IN ('masuk','pulang')) NOT NULL,
  waktu TIMESTAMPTZ DEFAULT NOW(),
  lat NUMERIC(10,7) NOT NULL,
  lng NUMERIC(10,7) NOT NULL,
  jarak_meter NUMERIC(10,2),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE absensi ENABLE ROW LEVEL SECURITY;
-- Insert hanya untuk diri sendiri (cegah karyawan absen-kan orang lain lewat API langsung)
CREATE POLICY "insert_own_absensi" ON absensi FOR INSERT WITH CHECK (auth.uid() = profile_id);
-- Baca: baris sendiri, atau superadmin baca semua (untuk tab "Semua Karyawan")
CREATE POLICY "select_absensi" ON absensi FOR SELECT USING (
  auth.uid() = profile_id
  OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'superadmin')
);
-- Log absensi tidak boleh diubah/dihapus kecuali oleh superadmin (koreksi manual)
CREATE POLICY "modify_absensi_superadmin" ON absensi FOR UPDATE USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'superadmin')
);
CREATE POLICY "delete_absensi_superadmin" ON absensi FOR DELETE USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'superadmin')
);

-- Koreksi total bonus reseller (bukan per transaksi) — dipotong dari total rekapan bonus
ALTER TABLE resellers ADD COLUMN IF NOT EXISTS koreksi_admin NUMERIC(15,2) DEFAULT 0;
ALTER TABLE resellers ADD COLUMN IF NOT EXISTS koreksi_asisten NUMERIC(15,2) DEFAULT 0;
ALTER TABLE resellers ADD COLUMN IF NOT EXISTS sedekah_mimbar NUMERIC(15,2) DEFAULT 0;

-- Fix RLS Purchase Order — tabel ini pernah dibuat tanpa policy (RLS enabled, 0 policy = semua insert ditolak)
ALTER TABLE purchase_orders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "auth_all_purchase_orders" ON purchase_orders;
CREATE POLICY "auth_all_purchase_orders" ON purchase_orders FOR ALL USING (auth.uid() IS NOT NULL);

ALTER TABLE purchase_order_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "auth_all_purchase_order_items" ON purchase_order_items;
CREATE POLICY "auth_all_purchase_order_items" ON purchase_order_items FOR ALL USING (auth.uid() IS NOT NULL);

ALTER TABLE po_progress ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "auth_all_po_progress" ON po_progress;
CREATE POLICY "auth_all_po_progress" ON po_progress FOR ALL USING (auth.uid() IS NOT NULL);

-- Notify PostgREST reload schema cache (jalankan setelah CREATE TABLE baru)
NOTIFY pgrst, 'reload schema';
```

---

## Business Logic

### Kalkulasi Harga

```
Laba Toko per item      = harga_katalog - harga_modal
Bonus Reseller per item = harga_jual - harga_katalog - ongkir (min 0)
Grand Total transaksi   = total_harga_jual   ← BUKAN ditambah ongkir
Sisa Tagihan            = Grand Total - uang_dp
Status lunas bonus      = bonus_terbayar >= total_bonus + bonus_owner
Rek. Harga Jual         = Math.ceil(harga_katalog × 1.25)  ← +25%, hardcoded
Harga Umum (/toko)      = Math.ceil(harga_katalog × 1.25)  ← sama, TIDAK tampilkan harga_katalog asli
```

### Katalog vs Toko vs Etalase — Perbedaan

| Halaman         | Akses                 | Harga tampil                             | Cart key           |
| --------------- | --------------------- | ----------------------------------------- | ------------------ |
| `/katalog`      | Publik (reseller)     | `harga_katalog`                           | `bunganik_cart`    |
| `/toko`         | Publik (pembeli umum) | `Math.ceil(harga_katalog × 1.25)`        | `bng_toko_cart`    |
| `/etalase`      | Publik (pembeli umum) | `Math.ceil(harga_katalog × 1.35)`        | `bng_etalase_cart` |
| `/produk/[id]`  | Butuh kode internal   | `Math.ceil(harga_katalog × 1.25)` (rek.) | `bunganik_cart`    |

> `/etalase` adalah katalog publik terpisah dari `/toko` (markup lebih tinggi, +35%), dipromosikan lewat landing page `/landing`. Tidak saling terhubung dengan `/toko` — cart, halaman, dan markup-nya independen. Aksen warna amber dipakai untuk membedakan visual dari `/toko` (indigo).

### Foto Produk (Multi-foto)

- Foto disimpan di Supabase Storage bucket `BungaNaik`, path: `{produk_id}/{timestamp}-{random}.{ext}`
- Record di tabel `produk_foto` dengan `urutan` untuk menentukan urutan tampil
- Thumbnail di tabel/grid produk = foto pertama (ORDER BY urutan LIMIT 1)
- **Fallback chain**: `produk_foto` → `produk.foto_url` → placeholder gradien

### Foto Pelunasan / Bukti Transfer

- Upload ke Storage bucket `BungaNaik`, path: `pelunasan/{penjualan_id}/{timestamp}.{ext}`
- Disimpan di kolom `penjualan_pembayaran.foto_url`
- Ditampilkan di riwayat pembayaran pada detail penjualan

### Tracking Resi & Milestone

- `nomor_resi` di-generate saat penjualan disimpan via `insertPenjualanWithResi()` di `lib/utils.ts`
- Format: `BNG-XXXXXXXX` (8 karakter, charset tanpa huruf O/I dan angka 0/1 agar mudah dibaca)
- Collision retry: max 5x, jika unique violation coba resi baru
- Foto tracking disimpan di Storage path: `tracking/{penjualan_id}/{timestamp}.{ext}`
- Flow milestone: `diproses → diproduksi (opsional, hanya jika ada PO) → dikirim → selesai`
- Role yang boleh update milestone:
  - `produksi`: → diproduksi (hanya jika `po_id` ada)
  - `gudang` / `pengiriman`: → dikirim
  - `sopir`: → selesai
  - `superadmin`: semua milestone

### Delete Penjualan

- Akses: `superadmin`, `kasir`, `pengiriman`, `gudang`, `keuangan`
- Alur: fetch semua `penjualan_item` → untuk tiap item: `UPDATE produk SET stok += jumlah` + `INSERT mutasi_stok (tipe:'masuk', keterangan: 'Pembatalan penjualan ${nomor_faktur}')` → `DELETE penjualan`
- Setelah delete → `router.push('/dashboard/penjualan')`

### Pelunasan / Catat Pembayaran

- Akses: `superadmin`, `kasir`, `keuangan`
- Tersedia di: halaman daftar penjualan + halaman detail penjualan
- Alur: validasi jumlah ≤ sisa → upload foto (opsional) → `INSERT penjualan_pembayaran` → `UPDATE penjualan SET uang_dp += jumlah` → recalculate `status_bayar`
- `metode_bayar` di tabel `penjualan` TIDAK pernah dioverwrite

### Rollback Pembayaran (koreksi salah catat pelunasan)

- Akses: `superadmin`, `kasir`, `keuangan` (sama seperti akses pelunasan)
- Lokasi: tombol ikon (`RotateCcw`) di setiap baris "Riwayat Pembayaran"
  pada halaman detail penjualan (`/dashboard/penjualan/[id]`) — tetap
  muncul walau `status_bayar` sudah `lunas`, untuk kasus miskomunikasi
  (dikira lunas padahal belum)
- Alur: konfirmasi → `DELETE` baris `penjualan_pembayaran` yang dipilih
  → `uang_dp` dikurangi sejumlah pembayaran tsb (floor di 0) →
  `status_bayar` dihitung ulang: `belum_bayar` jika sisa uang_dp ~0,
  `lunas` jika uang_dp masih ≥ total_harga_jual, selain itu `dp`
- Ini adalah operasi correction manual (rollback), bukan penghapusan
  transaksi — baris penjualan & item tidak berubah, hanya riwayat
  pembayaran & status bayar

### Kode Internal — Gate `/produk/[id]`

- Halaman `/produk/[id]` (diakses via QR code) memerlukan kode internal sebelum detail produk terlihat
- Kode disimpan di `owner_settings.kode_internal_produk`
- Verifikasi server-side via `POST /api/verify-kode` menggunakan service role key — kode tidak pernah dikirim ke client
- Setelah berhasil: `sessionStorage.setItem('bng_access_verified', '1')` — berlaku per tab, tidak persisten
- Gate hilang otomatis saat tab ditutup

### Pencocokan Nota

- Pencocokan adalah **AUDIT SETELAH PROSES**, bukan approval sebelum proses
- Tidak ada logic di gudang/pengiriman/sopir yang memblokir berdasarkan `status_pencocokan`
- Status: `belum_dicocokkan` → `cocok` | `selisih`

### Owner Workspace — Reminder Logic

- `owner_settings` menyimpan `siklus_audit_nota_hari` dan `siklus_stock_opname_hari`
- Reminder `pending` auto-insert jika: hari sejak audit terakhir ≥ threshold DAN belum ada reminder `pending`/`terlewat` sejak audit itu
- Reminder auto-mark `terlewat` jika `due_date` sudah lewat dan status masih `pending`
- Section F workspace: owner bisa edit threshold siklus langsung dari UI

### Purchase Order — Prioritas

```typescript
type POPrioritas = "rendah" | "normal" | "tinggi" | "urgent";
// Urutan sort di workspace: urgent=0, tinggi=1, normal=2, rendah=3
```

### Review & Komplain

- Dibuat di modal detail penjualan, tersimpan di `reseller_reviews`
- Tipe: `komplain` (merah), `pujian` (hijau), `catatan` (biru)
- Badge titik merah di tabel penjualan jika ada komplain belum di-resolve

### Customer Database

- Field `nama_customer` + `telepon_customer` di tabel `penjualan` (opsional)
- Halaman `/dashboard/pelanggan`: aggregasi client-side, group by reseller
- Key unik: `${telepon || nama}__${reseller_id}` untuk identify customer unik per reseller

### waLink() & Resi Utility

```typescript
// lib/utils.ts
export function waLink(telepon: string): string { ... }
export function generateNomorResi(): string { ... }        // BNG-XXXXXXXX
export async function insertPenjualanWithResi(             // insert + retry collision
  supabase, payload, maxRetry = 5
): Promise<{ data, error }>
```

### Stok Produk

- Berkurang otomatis saat penjualan disimpan
- Dikembalikan otomatis saat penjualan **dihapus** (superadmin, kasir, pengiriman, gudang, keuangan) + catat `mutasi_stok`
- Setiap perubahan tercatat di `mutasi_stok`

### Metode Pembayaran (Split)

- `penjualan.metode_bayar` = metode **pertama**, tidak pernah dioverwrite
- Setiap termin pembayaran → insert ke `penjualan_pembayaran`
- `uang_dp` = akumulasi total terbayar

### Business Logic Modul HPP

#### Alur Pembelian Bahan Baku

```
INSERT pembelian_bahan_baku + item
→ UPDATE bahan_baku.stok += jumlah
→ UPDATE bahan_baku.harga_beli_terakhir = harga_satuan
→ INSERT mutasi_bahan_baku (tipe: 'masuk')
```

#### Alur Batch Produksi

```
Buka batch → INSERT batch_produksi (status: 'proses')
           → Auto-generate batch_pemakaian_bahan dari BOM × target_unit

Selesaikan → UPDATE bahan_baku.stok -= jumlah_aktual (per item pemakaian)
           → INSERT mutasi_bahan_baku (tipe: 'keluar') per item
           → total_hpp = total_biaya_bahan + upah_borongan
           → hpp_aktual_per_unit = total_hpp / unit_selesai
           → UPDATE batch_produksi (status: 'selesai', tanggal_selesai, hpp_aktual_per_unit)
```

> **Stok bahan baku HANYA dikurangi saat batch SELESAI**, tidak saat batch dibuka/diproses.

---

## Auth & Role System

### Roles

- `superadmin`: Full access — harga modal & laba, kelola pengguna, rekalkuasi laba, bonus owner, semua milestone, delete penjualan, kode internal
- `kasir`: Input penjualan, pelunasan, delete penjualan, tidak lihat harga modal & laba
- `keuangan`: Akses laporan keuangan + penjualan + pelunasan + delete penjualan
- `cs`: Katalog, reseller, pelanggan, PO
- `gudang`: Produk & stok, PO, update milestone → dikirim, delete penjualan
- `pengiriman`: Penjualan (monitoring), PO, update milestone → dikirim, delete penjualan
- `produksi`: PO, update milestone → diproduksi (jika ada po_id)
- `sopir`: Penjualan (monitoring), update milestone → selesai

### Context

```typescript
const { user, profile, isSuperAdmin, role, signOut } = useAuth();
// role adalah string langsung: 'superadmin' | 'kasir' | 'keuangan' | dst
```

### Auth — Implementasi Saat Ini

- `createClient()` di `lib/supabase/client.ts` adalah **singleton** (module-level `_client`) — satu instance per tab, mencegah duplikasi listener `onAuthStateChange`
- `AuthContext` hanya menggunakan `onAuthStateChange` (termasuk event `INITIAL_SESSION` saat mount) — tidak ada `init()` / `getUser()` paralel
- Event `TOKEN_REFRESHED` di-skip agar refresh token background tidak trigger re-render sidebar
- `setLoading(false)` hanya dipanggil **setelah profile selesai di-fetch** — sidebar tidak flash kosong
- Timeout fallback 2 detik (turun dari 5 detik)
- Middleware hapus cookie `sb-*` saat redirect ke `/login`
- `NavLink` dan `SubNavLink` di `Sidebar.tsx` didefinisikan di luar komponen — mencegah unmount/remount tiap auth update

### RLS

Semua tabel dashboard: policy `auth.uid() IS NOT NULL`. Views publik tracking: `GRANT SELECT TO anon`. Function `rekalkulasi_laba`: `SET row_security = off`.

---

## Environment Variables

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
NEXT_PUBLIC_WA_TOKO=6289630085814
```

---

## Coding Conventions

- **Client components**: `import { createClient } from '@/lib/supabase/client'`
- **Server/API routes**: `import { createClient } from '@/lib/supabase/server'`
- API routes yang butuh akses tanpa RLS: gunakan `createClient(url, serviceRoleKey)` dari `@supabase/supabase-js`
- Semua halaman dashboard = `'use client'`
- Modal pattern: `const [modal, setModal] = useState<'tambah' | 'edit' | null>(null)`
- Error handling: gunakan `setFormError()` inline, **jangan `alert()`**
- **Snippet only** saat diminta modifikasi — jangan generate file lengkap kecuali diminta eksplisit
- WA link: selalu gunakan `waLink()` dari `@/lib/utils`, jangan buat manual

### Sidebar — Collapsible Groups

```typescript
// navItems (urutan): Dashboard, Meja Kerja Owner, Produk, Reseller, Pelanggan,
//                    Penjualan, PO, Target, Pencocokan Nota
// laporanItems: Penjualan, Top Reseller, Produk, Usia Barang, Sopir, Kritik & Saran
// keuanganItems: Laporan Keuangan, Pengeluaran
// hppItems: Bahan Baku, Pembelian BB, Bill of Materials, Batch Produksi, Laporan HPP
// adminItems: Pengguna (superadmin only)
// NavLink & SubNavLink: fungsi di luar Sidebar — jangan dipindah ke dalam komponen
```

### Foto — Storage Paths

```typescript
const FOTO_BUCKET = "BungaNaik";
// Foto produk:   `${produkId}/${Date.now()}-${random}.${ext}`
// Foto tracking: `tracking/${penjualanId}/${Date.now()}.${ext}`
// Foto bukti pelunasan: `pelunasan/${penjualanId}/${Date.now()}.${ext}`
```

---

## Fitur Per Halaman

### Absensi Karyawan (`/dashboard/absensi`)

Diakses oleh semua role internal. Menggunakan verifikasi wajah (face
descriptor via `face-api.js`, model dimuat dari `/public/models`) +
geofencing lokasi — **tidak pernah menyimpan/upload foto** untuk
absensi harian maupun saat pendaftaran wajah (hanya representasi angka
descriptor 128-dimensi yang disimpan di `face_enrollment`).

- **Tab Absen**: jika karyawan belum punya `face_enrollment`, tampil
  alur "Daftarkan Wajah" (kamera aktif ~2 detik, ambil beberapa sample
  descriptor lalu dirata-rata, simpan, kamera langsung dimatikan).
  Setelah terdaftar, tombol Absen Masuk/Pulang akan: (1) ambil lokasi
  browser via `navigator.geolocation`, (2) hitung jarak ke lokasi
  absensi (`haversineDistanceMeters` di `lib/geo.ts`) — jika di luar
  radius (`owner_settings.absensi_radius_meter`), absen ditolak; (3)
  jika dalam radius, kamera aktif sebentar untuk ambil satu descriptor
  wajah, dibandingkan (`faceapi.euclideanDistance`) dengan descriptor
  terdaftar — jika jarak wajah <= `FACE_MATCH_THRESHOLD` (0.5), absensi
  tersimpan ke tabel `absensi`; kamera langsung ditutup setelah proses,
  tidak ada gambar yang disimpan.
- **Tab Riwayat Saya**: riwayat absensi masuk/pulang milik user sendiri.
- **Tab Semua Karyawan** (superadmin only): rekap absensi semua staff
  per tanggal.
- **Tab Pengaturan Lokasi** (superadmin only): set titik koordinat +
  radius toleransi (meter) untuk lokasi absensi — bisa isi manual atau
  tombol "Gunakan Lokasi Saya Saat Ini".
- Satu record `masuk` dan satu `pulang` per hari per karyawan; setelah
  keduanya terisi, tombol absen dinonaktifkan untuk hari itu.

### Dashboard (`/dashboard`)

Filter bulan/tahun (superadmin), widget belum lunas, kartu statistik, grafik batang, 5 penjualan terbaru. Semua `nomor_faktur` adalah `<Link>` ke `/dashboard/penjualan/[id]`.

### Produk (`/dashboard/produk`)

- CRUD + role-based field visibility (harga modal superadmin only)
- Multi-foto, QR code, bulk print QR, rekalkuasi laba, toggle list/grid

### Reseller (`/dashboard/reseller`)

CRUD, filter kota + bonus + tanggal, summary bonus per kartu, `nomor_faktur` clickable.

- **Koreksi Total Bonus** (superadmin only, di footer modal "Bonus Reseller"): 3 field — **Koreksi Admin**, **Koreksi Asisten**, **Sedekah Mimbar** — disimpan per reseller di tabel `resellers` (bukan per transaksi/invoice). Ketiganya dipotong dari total bonus kotor hasil rekap (`SUM(total_bonus + bonus_owner)` seluruh transaksi reseller tsb) untuk menghasilkan "Total Bonus" & "Sisa" bersih yang ditampilkan.
- Detail rincian koreksi (bonus kotor − tiap komponen koreksi) ikut tampil di halaman portal publik reseller `/r/[token]` pada bagian "Ringkasan Bonus", diambil dari `/api/reseller-portal` (field `koreksi_admin`, `koreksi_asisten`, `sedekah_mimbar` di tabel `resellers`).

### Pelanggan (`/dashboard/pelanggan`)

Aggregasi client-side dari `nama_customer`+`telepon_customer` di penjualan, dikelompokkan per reseller (accordion), WA link.

### Penjualan (`/dashboard/penjualan`)

- Input penjualan dengan `nomor_resi` auto-generate
- Filter tanggal, search, toggle status, kartu ringkasan belum lunas
- Split payment, cetak invoice, badge merah komplain
- Tombol pelunasan inline di tabel: `superadmin` | `kasir` | `keuangan` saat `status_bayar !== 'lunas'`
- Modal pelunasan: input jumlah (prefill sisa), pilih metode, catatan, upload foto bukti

### Detail Penjualan (`/dashboard/penjualan/[id]`)

- Full-page: info transaksi, riwayat pembayaran (termasuk foto bukti), review/komplain, catatan internal
- **Milestone tracking**: tombol update milestone sesuai role, input keterangan + foto + persentase (untuk diproduksi)
- **Tombol Delete** (superadmin only): konfirmasi modal, restore stok semua item, catat mutasi_stok
- **Tombol Catat Pembayaran**: `superadmin` | `kasir` | `keuangan`, upload foto bukti transfer (opsional)
- Tombol "Bagikan ke Customer" → copy link `/resi/{nomor_resi}`
- Print invoice

### Tracking Publik (`/resi/[nomor]`)

- Halaman tanpa auth untuk customer
- Step indicator milestone (diproses → diproduksi → dikirim → selesai)
- Progress bar produksi (jika milestone diproduksi + ada persentase)
- Riwayat update + foto per milestone, lightbox foto
- Data dari view `tracking_publik` + `tracking_riwayat_publik`

### Katalog Reseller (`/katalog`)

Grid responsif, filter kategori, cart localStorage `bunganik_cart`, checkout WA. Menampilkan `harga_katalog`.

### Katalog Umum — Pembeli Umum (`/toko`)

- Halaman publik tanpa auth untuk pembeli umum (non-reseller)
- Harga ditampilkan sebagai `Math.ceil(harga_katalog × 1.25)` — `harga_katalog` asli **tidak pernah tampil**
- Filter kategori, search produk, badge Stok Habis
- Cart localStorage `bng_toko_cart` (terpisah dari cart reseller)
- Slide-over cart dengan qty picker + checkout via WhatsApp
- Floating cart button saat ada item di cart

### Detail Produk Publik — Pembeli Umum (`/toko/[id]`)

- Gallery foto multi-foto + lightbox, thumbnail strip
- Harga umum (`+25%`) tampil di kotak biru — tanpa `harga_katalog`
- Badge Tersedia / Stok Habis
- Qty picker, tombol Tambah ke Keranjang
- "Tanya via WhatsApp" langsung untuk tanya per produk
- Cart terintegrasi dengan `/toko`

### Landing Page Marketing (`/landing`)

- Halaman publik tanpa auth, murni marketing/promosi — bukan bagian dari `/` (root tetap redirect ke `/dashboard` untuk staff)
- Hero, 6 kartu fitur (PO custom, cicilan, custom desain, pengantaran cepat, Etalase online, kualitas terjamin), 4 langkah "Cara Kerja", section kepercayaan, **section Ulasan/Testimoni**, CTA banner, footer
- Semua CTA mengarah ke WhatsApp (`NEXT_PUBLIC_WA_TOKO`) atau ke `/etalase`
- Sengaja **tidak mencantumkan angka markup harga** (mis. "35%") sebagai copy — itu detail pricing internal, bukan value proposition untuk customer; copy fokus ke manfaat (custom, cicilan, cepat, transparan/bisa dilacak)
- **Section Ulasan** (`#ulasan`, konstanta `TESTIMONI` di file): 6 kartu testimoni dengan nama Indonesia, rating bintang, avatar inisial berwarna. **Ini konten ilustratif/placeholder**, bukan ulasan customer asli — ganti dengan ulasan nyata begitu tersedia agar tidak menampilkan social proof palsu ke calon pembeli.

### Etalase — Katalog Publik Kedua (`/etalase`, `/etalase/[id]`)

- Sama strukturnya dengan `/toko` (grid produk, filter kategori, search, cart slide-over, checkout WhatsApp) tapi **terpisah total**: markup `+35%`, cart key `bng_etalase_cart`, aksen warna amber
- Dipromosikan sebagai tujuan belanja dari landing page `/landing`
- Tidak berbagi cart/state dengan `/toko` — reseller/pembeli yang datang dari `/landing` diarahkan ke sini, bukan ke `/toko`
- **Stok habis tetap bisa dipesan sebagai PO/Custom**: beda dengan `/toko` (yang menyembunyikan tombol beli saat stok habis), di `/etalase` tombol berubah jadi "Pesan Custom/PO" (outline amber, ikon `ClipboardList`) dan customer tetap bisa memasukkannya ke keranjang. Item cart diberi flag `custom: true` (`CartItem.custom`), ditandai badge "PO/Custom" di slide-over cart, dan pesan checkout WhatsApp otomatis menambahkan keterangan `(PO/Custom — stok kosong)` per item + kalimat minta estimasi proses. Ini murni penandaan di pesan WA — tidak membuat record `purchase_orders` otomatis di dashboard, staff yang follow up manual dari chat WA.

### Detail Produk QR Scan (`/produk/[id]`)

- **Gate kode internal**: full-screen lock sebelum detail terlihat
- Kode diverifikasi server-side via `POST /api/verify-kode` (service role, kode tidak bocor ke client)
- Setelah unlock: `sessionStorage` `bng_access_verified = "1"` — per tab
- Menampilkan rekomendasi harga jual `+25%` dari `harga_katalog`
- Gallery foto + lightbox, cart `bunganik_cart`

### Purchase Order (`/dashboard/po`)

- CRUD PO + badge prioritas (rendah/normal/tinggi/urgent)
- Quick-change prioritas dari action dropdown
- Status flow: `pending → proses → selesai | batal`
- `nomor_po` di list adalah `<Link>` ke halaman detail `/dashboard/po/[id]`

### Detail Purchase Order (`/dashboard/po/[id]`)

- Full-page detail, diakses dari klik `nomor_po` atau "Lihat Detail" di dropdown list
- **Foto barang yang diminta**: tiap item menampilkan foto produk (dari `produk_foto` urutan pertama, fallback `produk.foto_url`), atau ikon placeholder jika item custom (tidak terhubung produk)
- **Foto Referensi PO**: foto umum yang diupload saat membuat PO (kolom `purchase_orders.foto_url`)
- Detail peminta: nama pemohon (reseller/customer), telepon dengan `waLink()`, tanggal PO, estimasi selesai, dibuat oleh
- Progress produksi: riwayat + form tambah update (role `produksi`/`superadmin`), sama seperti modal Progress di halaman list
- Aksi: Mulai Proses, Tandai Selesai (dengan preview & opsi tambah stok — sama seperti modal Selesai di list), Batalkan, ubah prioritas, Hapus, Cetak PO

### Pencocokan Nota (`/dashboard/pencocokan`)

- Audit nota oleh owner setelah transaksi selesai
- Status: `belum_dicocokkan` → `cocok` | `selisih`
- Tidak memblokir proses operasional apapun

### Meja Kerja Owner (`/dashboard/owner/workspace`)

- **Section A**: Status reminder hari ini (audit nota & stock opname)
- **Section C2**: Tagihan belum lunas / DP
- **Section C5**: Monitoring PO aktif — bridge ke produksi (selalu tampil)
- **Section D**: Reseller baru 7 hari + ringkasan kinerja bulan ini
- **Section E**: Checklist bulanan manual + notepad catatan kebijakan
- **Section F**: Pengaturan siklus reminder (audit nota & stock opname) — collapsible
- Reminder auto-insert dan auto-mark terlewat berdasarkan `owner_settings`

### Laporan Penjualan (`/dashboard/laporan`)

Filter periode + reseller, grafik trend, top 5 produk & reseller, tabel detail. `nomor_faktur` clickable.

### Top Reseller (`/dashboard/laporan/reseller`)

Toggle By Omset / By Unit, bar chart horizontal top 10, tabel top 20 dengan medali top 3.

### Laporan Sopir (`/dashboard/laporan/sopir`)

Podium top 3, bar chart horizontal, tabel peringkat dengan progress bar.

### Kritik & Saran (`/dashboard/laporan/review`)

Satisfaction rate, donut chart, bar chart reseller komplain, tabel detail filter tipe + date range. `nomor_faktur` clickable.

### Stock Aging (`/dashboard/stock-aging`)

Usia stok dari mutasi terakhir, kategori Segar/Normal/Perhatian/Kritis, nilai modal (superadmin).

### HPP — Bahan Baku (`/dashboard/hpp/bahan-baku`)

Master bahan baku + mutasi stok. Action buttons inline (Layers/History/Edit/X) — bukan dropdown — karena `overflow-hidden` di wrapper tabel akan memotong dropdown.

### HPP — Bill of Materials (`/dashboard/hpp/bom`)

- Daftar semua produk aktif + badge jumlah bahan baku di BOM
- Modal per produk: search bahan baku, add dengan `jumlah_standar`, inline edit, delete
- Estimasi biaya per unit (superadmin only): `SUM(jumlah_standar × harga_beli_terakhir)`

### HPP — Batch Produksi (`/dashboard/hpp/batch`)

- Master-detail: list batch → klik → detail view + back button
- Nomor batch: `BATCH-YYYYMMDD-{suffix}`
- Buat batch: pilih produk yang punya BOM, input `target_unit` → auto-generate `batch_pemakaian_bahan` dari BOM × target
- Edit pemakaian aktual per bahan sebelum diselesaikan
- Selesaikan: kurangi stok bahan baku, hitung HPP aktual, update status `selesai`
- Batalkan: update status `batal`, stok TIDAK dikembalikan (sudah tidak dikurangi saat buka batch)

### HPP — Laporan HPP (`/dashboard/hpp/laporan`)

- Filter periode (bulan + tahun)
- Stat cards: total batch, unit diproduksi, total HPP, rata-rata HPP/unit
- Bar chart HPP Standar vs Aktual per batch (Recharts, superadmin only)
- Tabel batch dengan variance per unit (merah = boros, hijau = efisien)
- Agregasi variance per bahan baku (client-side)

### Pengguna (`/dashboard/pengguna`) — Superadmin Only

Daftar user, tambah via `/api/create-user` dengan `SUPABASE_SERVICE_ROLE_KEY`.

---

## Known Issues & Gotchas

1. **Laba tidak berubah setelah edit harga modal** → jalankan Rekalkuasi Laba
2. **RLS memblokir function SQL** → gunakan `SET row_security = off` + `WHERE id IS NOT NULL`
3. **Turbopack & @opentelemetry/api** → `npm install @opentelemetry/api`
4. **Generated column tidak bisa diupdate via REST API** → pakai column biasa + update via function
5. **Nomor faktur tidak reset per hari** → sequence global naik terus (by design)
6. **`metode_bayar` tidak berubah saat pelunasan** → disengaja, setiap termin ke `penjualan_pembayaran`
7. **`bonus_terbayar` vs `total_bonus + bonus_owner`** → selalu gunakan formula gabungan
8. **Auth flash / sidebar kosong sebentar** → pastikan tidak membuat `init()` + `onAuthStateChange` paralel; `setLoading(false)` harus dipanggil setelah profile di-set
9. **Katalog publik tidak load produk** → jalankan `anon_read_produk_aktif` RLS policy
10. **Upload foto gagal (403)** → tambahkan storage policies untuk bucket `BungaNaik`
11. **Tracking resi "Tidak Ditemukan"** → pastikan view `tracking_publik` sudah dibuat + `GRANT SELECT TO anon`
12. **`CREATE OR REPLACE VIEW` gagal** jika kolom berubah → `DROP VIEW IF EXISTS` dulu baru recreate
13. **`PromiseLike` vs `Promise`** — Supabase insert/update return `PostgrestFilterBuilder` (thenable bukan Promise penuh) → gunakan `PromiseLike<any>[]` bukan `Promise<any>[]`
14. **Kolom estimasi PO** → nama kolom adalah `tanggal_estimasi`, bukan `estimasi_selesai`
15. **BOM/batch table tidak ditemukan** → jalankan CREATE TABLE + `NOTIFY pgrst, 'reload schema'`
16. **Dropdown terpotong di dalam tabel** → tabel pakai `overflow-hidden`; solusi: ganti dropdown dengan inline icon buttons
17. **`createClient()` dipanggil di banyak komponen** → aman, sudah singleton — semua panggilan kembalikan instance yang sama
18. **Absensi selalu gagal "wajah tidak terdeteksi"** → pastikan folder `public/models` berisi file model `face-api.js` (tiny_face_detector, face_landmark_68, face_recognition) — tanpa ini model gagal dimuat dari `/models`
19. **Absensi ditolak walau di lokasi kantor** → pastikan `owner_settings.absensi_lat/lng/radius_meter` sudah diisi lewat tab Pengaturan Lokasi; radius terlalu kecil juga bisa menolak GPS phone yang akurasinya rendah
20. **Build warning `Can't resolve 'fs'/'encoding'`** dari `face-api.js`/`node-fetch` → aman diabaikan, itu kode fallback Node.js yang tidak dipakai di browser
21. **"Gagal menyimpan: new row violates row-level security policy for table 'purchase_orders'"** → tabel `purchase_orders`/`purchase_order_items`/`po_progress` dibuat tanpa RLS policy (RLS enabled tapi 0 policy = semua operasi ditolak) → jalankan SQL fix RLS Purchase Order di atas

---

## Roadmap

### Prioritas Tinggi

- [ ] **Export laporan ke Excel/PDF**
- [ ] **Edit penjualan** — saat ini hanya bisa hapus + input ulang
- [ ] **Notifikasi stok menipis** — email/push otomatis
- [ ] **AI Customer Service** — chat widget di katalog publik, auto-reply via Claude API (Haiku), riwayat di Supabase

### Prioritas Sedang

- [ ] **Integrasi HPP ke laporan laba rugi**
- [ ] **Cetak faktur PDF** via `@react-pdf/renderer`
- [ ] **Filter penjualan by reseller**
- [ ] **Varian produk**

### Prioritas Rendah

- [ ] **Multi-toko**
- [ ] **Integrasi WhatsApp notifikasi**
- [ ] **Mobile app (PWA)**

### Sudah Selesai

- [x] Multi-foto produk (Supabase Storage + tabel `produk_foto`)
- [x] Rekomendasi harga jual +25% di produk & detail publik
- [x] Gallery foto di katalog publik + detail produk publik dengan lightbox
- [x] Review & komplain per penjualan (`reseller_reviews`)
- [x] Laporan Kritik & Saran (`/dashboard/laporan/review`)
- [x] Database customer (`nama_customer`, `telepon_customer`, `/dashboard/pelanggan`)
- [x] `waLink()` utility + `generateNomorResi()` + `insertPenjualanWithResi()`
- [x] Halaman detail invoice (`/dashboard/penjualan/[id]`) — semua `nomor_faktur` clickable
- [x] **Tracking resi publik** (`/resi/[nomor]`) — milestone, progress, foto, lightbox
- [x] **Milestone penjualan** — flow diproses→diproduksi→dikirim→selesai, role-based update, foto per update
- [x] **Absensi Karyawan** (`/dashboard/absensi`) — verifikasi wajah client-side (`face-api.js`, tanpa upload foto) + geofencing lokasi (`lib/geo.ts`), pendaftaran wajah sekali, riwayat pribadi, rekap semua karyawan & pengaturan lokasi (superadmin)
- [x] **Landing page marketing** (`/landing`) + **katalog Etalase** (`/etalase`, markup +35%, terpisah dari `/toko`)
- [x] **Purchase Order prioritas** — badge rendah/normal/tinggi/urgent, quick-change
- [x] **Pencocokan Nota** (`/dashboard/pencocokan`) — audit setelah proses
- [x] **Meja Kerja Owner** (`/dashboard/owner/workspace`) — reminder, monitoring PO, tagihan, siklus settings
- [x] **Modul HPP lengkap** — bahan baku (inline buttons), pembelian, BOM (estimasi biaya), batch produksi (HPP aktual), laporan HPP (variance chart)
- [x] **Multi-role system** — superadmin, kasir, keuangan, cs, gudang, pengiriman, produksi, sopir
- [x] **Delete penjualan** (superadmin, kasir, pengiriman, gudang, keuangan) — restore stok otomatis + catat mutasi_stok
- [x] **Pelunasan / Catat Pembayaran** — superadmin + kasir + keuangan, upload foto bukti transfer
- [x] **Kode internal gate** pada `/produk/[id]` — server-side verify, sessionStorage per tab
- [x] **Katalog umum `/toko`** — pembeli umum, harga +25%, cart terpisah, WA checkout
- [x] **Fix auth race condition** — singleton `createClient()`, hanya `onAuthStateChange`, skip `TOKEN_REFRESHED`
- [x] **Fix Sidebar render** — `NavLink`/`SubNavLink` di luar komponen, `sidebarContent` sebagai JSX var

---

## Development Commands

```bash
npm install
npm run dev          # Turbopack sudah dikonfigurasi di package.json
npm run build
npm install @opentelemetry/api   # jika ada error module not found
```

---

## Supabase SQL Quick Reference

```sql
-- Set role user
UPDATE profiles SET role = 'superadmin' WHERE id = 'user-uuid';
-- role lain: kasir | keuangan | cs | gudang | pengiriman | produksi | sopir

-- Konfirmasi email
UPDATE auth.users SET email_confirmed_at = NOW() WHERE email = 'user@email.com';

-- Reset password
UPDATE auth.users
SET encrypted_password = crypt('NewPassword123!', gen_salt('bf', 10))
WHERE email = 'user@email.com';

-- Cek duplikat produk
SELECT nama, COUNT(*) FROM produk GROUP BY nama HAVING COUNT(*) > 1;

-- Rekalkuasi laba
SELECT rekalkulasi_laba();

-- Stok menipis
SELECT nama, stok, stok_minimum FROM produk
WHERE aktif = true AND stok <= stok_minimum ORDER BY stok;

-- Transaksi belum lunas
SELECT nomor_faktur, total_harga_jual, uang_dp,
       (total_harga_jual - uang_dp) as sisa
FROM penjualan WHERE status_bayar != 'lunas' ORDER BY created_at DESC;

-- Bonus belum dibayar
SELECT nomor_faktur, (total_bonus + COALESCE(bonus_owner,0)) as total_full,
       bonus_terbayar,
       (total_bonus + COALESCE(bonus_owner,0) - bonus_terbayar) as sisa_bonus
FROM penjualan
WHERE bonus_terbayar < (total_bonus + COALESCE(bonus_owner,0));

-- Cek resi penjualan
SELECT nomor_faktur, nomor_resi, milestone FROM penjualan
WHERE nomor_resi IS NOT NULL ORDER BY created_at DESC;

-- Review/komplain belum resolve
SELECT r.tipe, r.isi, r.created_at, p.nomor_faktur
FROM reseller_reviews r
JOIN penjualan p ON p.id = r.penjualan_id
WHERE r.resolved = false ORDER BY r.created_at DESC;

-- PO aktif per prioritas
SELECT nomor_po, pemohon_nama, prioritas, status, tanggal_estimasi
FROM purchase_orders
WHERE status IN ('pending','proses')
ORDER BY CASE prioritas WHEN 'urgent' THEN 0 WHEN 'tinggi' THEN 1
         WHEN 'normal' THEN 2 ELSE 3 END;

-- Ganti kode internal produk
UPDATE owner_settings SET value = 'KODE_BARU' WHERE key = 'kode_internal_produk';

-- Cek batch produksi aktif
SELECT nomor_batch, nama_produk, target_unit, unit_selesai, status, tanggal_mulai
FROM batch_produksi WHERE status IN ('proses','draft') ORDER BY created_at DESC;

-- HPP variance per batch (bulan ini)
SELECT nomor_batch, nama_produk, hpp_standar_per_unit, hpp_aktual_per_unit,
       (hpp_aktual_per_unit - hpp_standar_per_unit) as variance
FROM batch_produksi
WHERE status = 'selesai'
  AND DATE_TRUNC('month', tanggal_selesai) = DATE_TRUNC('month', CURRENT_DATE)
ORDER BY variance DESC;
```

---

## Hal-hal yang JANGAN Dilakukan

1. **Jangan ubah `penjualan_item.laba` menjadi generated column**
2. **Jangan hapus constraint UNIQUE pada `produk.nama`**
3. **Jangan ubah format nomor faktur** — sudah ada data production
4. **Jangan matikan RLS** — gunakan policy atau `SET row_security = off` di function spesifik
5. **Jangan generate file lengkap saat diminta fix** — snippet saja kecuali diminta eksplisit
6. **Jangan pakai `alert()` untuk error** — gunakan `setFormError()` inline di modal
7. **Jangan overwrite `penjualan.metode_bayar` saat pelunasan**
8. **Jangan hitung Grand Total dengan menambah ongkir** — Grand Total = `total_harga_jual` saja
9. **Jangan bandingkan `bonus_terbayar` hanya ke `total_bonus`** — gunakan `total_bonus + bonus_owner`
10. **Jangan hapus cookie `sb-*` tanpa redirect ke `/login`**
11. **Jangan delete bahan_baku yang punya history** — gunakan `aktif = false`
12. **Jangan pakai INTEGER untuk stok bahan baku** — gunakan `NUMERIC(15,3)` (bisa pecahan)
13. **Jangan kurangi stok bahan baku saat batch dibuka** — kurangi hanya saat batch SELESAI
14. **Jangan buat WA link manual** — selalu gunakan `waLink()` dari `@/lib/utils`
15. **Jangan buat logika yang memblokir proses berdasarkan `status_pencocokan`** — pencocokan adalah audit setelah proses, bukan approval sebelum proses
16. **Jangan `CREATE OR REPLACE VIEW` jika struktur kolom berubah** — selalu `DROP VIEW IF EXISTS` dulu
17. **Jangan pakai nama kolom `estimasi_selesai` untuk purchase_orders** — nama kolom yang benar adalah `tanggal_estimasi`
18. **Jangan tampilkan `harga_katalog` di halaman `/toko` dan `/toko/[id]`** — tampilkan hanya `Math.ceil(harga_katalog × 1.25)` sebagai "Harga"
19. **Jangan buat `init()` + `onAuthStateChange` berjalan paralel di AuthContext** — hanya gunakan `onAuthStateChange` (termasuk `INITIAL_SESSION`)
20. **Jangan pindahkan `NavLink`/`SubNavLink` ke dalam komponen `Sidebar`** — harus di luar agar referensi stabil dan tidak unmount/remount tiap render
21. **Jangan expose `harga_modal`, `total_laba`, `total_bonus`, `bonus_owner` di views/endpoint publik manapun**
