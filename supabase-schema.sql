-- =============================================
-- TOKO STOCK MANAGEMENT SYSTEM - SUPABASE SCHEMA
-- Run this in Supabase SQL Editor
-- =============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- PROFILES (extends Supabase Auth)
-- =============================================
CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('superadmin', 'kasir')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, name, role)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'name', NEW.email), COALESCE(NEW.raw_user_meta_data->>'role', 'kasir'));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- =============================================
-- RESELLERS
-- =============================================
CREATE TABLE resellers (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  nama TEXT NOT NULL,
  telepon TEXT,
  alamat TEXT,
  kota TEXT,
  catatan TEXT,
  aktif BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- PRODUCTS
-- =============================================
CREATE TABLE produk (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  nama TEXT NOT NULL,
  kategori TEXT,
  satuan TEXT DEFAULT 'unit',
  harga_modal NUMERIC(15,2) NOT NULL DEFAULT 0,
  harga_katalog NUMERIC(15,2) NOT NULL DEFAULT 0,
  stok INTEGER NOT NULL DEFAULT 0,
  stok_minimum INTEGER DEFAULT 0,
  deskripsi TEXT,
  aktif BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- STOCK MUTATIONS (history of stock in/out)
-- =============================================
CREATE TABLE mutasi_stok (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  produk_id UUID REFERENCES produk(id) ON DELETE CASCADE NOT NULL,
  tipe TEXT NOT NULL CHECK (tipe IN ('masuk', 'keluar', 'koreksi')),
  jumlah INTEGER NOT NULL,
  stok_sebelum INTEGER NOT NULL,
  stok_sesudah INTEGER NOT NULL,
  keterangan TEXT,
  referensi_id UUID, -- penjualan_id if related to sale
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- SALES (PENJUALAN)
-- =============================================
CREATE TABLE penjualan (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  nomor_faktur TEXT UNIQUE NOT NULL,
  reseller_id UUID REFERENCES resellers(id),
  tanggal TIMESTAMPTZ DEFAULT NOW(),
  total_harga_katalog NUMERIC(15,2) DEFAULT 0,
  total_harga_jual NUMERIC(15,2) DEFAULT 0,
  total_ongkir NUMERIC(15,2) DEFAULT 0,
  total_bonus NUMERIC(15,2) DEFAULT 0,
  total_laba NUMERIC(15,2) DEFAULT 0,
  uang_dp NUMERIC(15,2) DEFAULT 0,
  status_bayar TEXT DEFAULT 'lunas' CHECK (status_bayar IN ('lunas', 'dp', 'belum_bayar')),
  metode_bayar TEXT DEFAULT 'transfer' CHECK (metode_bayar IN ('transfer', 'cod', 'cash')),
  tujuan TEXT,
  catatan TEXT,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- SALES ITEMS (DETAIL PENJUALAN)
-- =============================================
CREATE TABLE penjualan_item (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  penjualan_id UUID REFERENCES penjualan(id) ON DELETE CASCADE NOT NULL,
  produk_id UUID REFERENCES produk(id) NOT NULL,
  jumlah INTEGER NOT NULL DEFAULT 1,
  harga_modal NUMERIC(15,2) NOT NULL,
  harga_katalog NUMERIC(15,2) NOT NULL,
  harga_jual NUMERIC(15,2) NOT NULL,
  ongkir NUMERIC(15,2) DEFAULT 0,
  bonus NUMERIC(15,2) DEFAULT 0,
  laba NUMERIC(15,2) GENERATED ALWAYS AS (harga_katalog - harga_modal) STORED,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- AUTO-UPDATE TIMESTAMPS
-- =============================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_resellers_updated_at BEFORE UPDATE ON resellers FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_produk_updated_at BEFORE UPDATE ON produk FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_penjualan_updated_at BEFORE UPDATE ON penjualan FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =============================================
-- AUTO-GENERATE NOMOR FAKTUR
-- =============================================
CREATE SEQUENCE nomor_faktur_seq;

CREATE OR REPLACE FUNCTION generate_nomor_faktur()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.nomor_faktur IS NULL OR NEW.nomor_faktur = '' THEN
    NEW.nomor_faktur := 'INV-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(NEXTVAL('nomor_faktur_seq')::TEXT, 4, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_nomor_faktur BEFORE INSERT ON penjualan FOR EACH ROW EXECUTE FUNCTION generate_nomor_faktur();

-- =============================================
-- ROW LEVEL SECURITY
-- =============================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE resellers ENABLE ROW LEVEL SECURITY;
ALTER TABLE produk ENABLE ROW LEVEL SECURITY;
ALTER TABLE mutasi_stok ENABLE ROW LEVEL SECURITY;
ALTER TABLE penjualan ENABLE ROW LEVEL SECURITY;
ALTER TABLE penjualan_item ENABLE ROW LEVEL SECURITY;

-- Profiles: users can read their own, superadmin reads all
CREATE POLICY "profiles_select" ON profiles FOR SELECT USING (auth.uid() = id OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'superadmin'));
CREATE POLICY "profiles_insert" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_update" ON profiles FOR UPDATE USING (auth.uid() = id OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'superadmin'));

-- All authenticated users can CRUD resellers, produk, penjualan
CREATE POLICY "resellers_all" ON resellers FOR ALL USING (auth.uid() IS NOT NULL);
CREATE POLICY "produk_all" ON produk FOR ALL USING (auth.uid() IS NOT NULL);
CREATE POLICY "mutasi_all" ON mutasi_stok FOR ALL USING (auth.uid() IS NOT NULL);
CREATE POLICY "penjualan_all" ON penjualan FOR ALL USING (auth.uid() IS NOT NULL);
CREATE POLICY "penjualan_item_all" ON penjualan_item FOR ALL USING (auth.uid() IS NOT NULL);

-- =============================================
-- SAMPLE DATA
-- =============================================
-- Note: Create a superadmin user via Supabase Auth first, then update their role:
-- UPDATE profiles SET role = 'superadmin' WHERE id = '<your-user-id>';
