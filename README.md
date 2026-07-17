# Toko Management System

Sistem pemantauan stok dan laporan keuangan berbasis Next.js + Supabase.

## Fitur
- Dashboard ringkasan penjualan & laba
- Manajemen produk & stok (mutasi masuk/keluar/koreksi + riwayat)
- Manajemen reseller
- Input penjualan dengan harga jual reseller, ongkir, dan bonus otomatis/manual
- Laporan keuangan dengan filter tanggal & reseller
- 2 Role: Superadmin (full access + lihat harga modal) & Kasir (tidak lihat harga modal)

## Cara Setup

### 1. Buat Project Supabase
Buka https://supabase.com → New Project → catat URL dan Anon Key.

### 2. Jalankan Schema Database
Di Supabase Dashboard → SQL Editor → paste isi file `supabase-schema.sql` → Run.

### 3. Konfigurasi Environment
```bash
cp .env.local.example .env.local
```
Isi `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key  # untuk buat user baru
```
Service role key: Supabase Dashboard → Settings → API → service_role key.

### 4. Buat Akun Superadmin Pertama
Di Supabase Dashboard → Authentication → Users → Add User → isi email & password.
Lalu di SQL Editor:
```sql
UPDATE profiles SET role = 'superadmin' WHERE id = 'user-id-dari-auth';
```

### 5. Install & Jalankan
```bash
npm install
npm run dev
```
Buka http://localhost:3000

## Struktur Harga
| Komponen | Keterangan |
|---|---|
| Harga Modal | Harga beli dari supplier |
| Harga Katalog | Harga toko ke reseller (harga jual toko) |
| Harga Jual Reseller | Harga reseller jual ke customer (input per transaksi) |
| Laba Toko | Harga Katalog - Harga Modal (otomatis) |
| Bonus Reseller | Harga Jual Reseller - Harga Katalog (auto, bisa override) |
| Ongkir | Input manual per transaksi |
# Client-BungaNaik
