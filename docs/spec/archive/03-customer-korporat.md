# Spec: Master Customer, Piutang Aging & Tagihan Korporat

> Status: ✅ SELESAI & DIARSIPKAN (18 Jul 2026). Ringkasan sudah dipindahkan
> ke `CLAUDE.MD` (§Database Schema bagian `customer`, §Business Logic
> "Pelunasan Massal", §Fitur Per Halaman "Customer"/"Piutang", §Known
> Issues #17-18, §Hal-hal yang JANGAN Dilakukan #15-17, §Roadmap) dan
> ditandai ✅ di `expedisi.md` §7 poin 8. File ini disimpan sebagai arsip
> riwayat keputusan, bukan dokumen kerja aktif.

---

## 1. Tujuan & Masalah yang Diselesaikan

`pengirim_nama` adalah TEXT bebas per transaksi — pengirim berulang (toko
online, distributor) diketik ulang setiap kali, tidak bisa direkap, dan
tidak bisa ditagih bulanan. Padahal segmen korporat/berulang biasanya
penyumbang revenue terbesar expedisi dan mengharapkan: data tersimpan,
tagihan gabungan per periode, dan term pembayaran (tempo).

Selain itu tidak ada jawaban untuk "siapa yang harus ditagih minggu ini" —
kartu belum-lunas hanya total agregat. Spec ini menambahkan: (a) master
`customer`, (b) link `pengiriman.customer_id`, (c) halaman Piutang dengan
aging bucket per customer + cetak rekap tagihan + pelunasan massal.

## 2. Perubahan Skema

Migration baru: `supabase/migrations/2026XXXXXXXXXX_customer_piutang.sql`

```sql
-- =====================================================================
-- A. Master customer (pengirim terdaftar)
-- =====================================================================
CREATE TABLE IF NOT EXISTS customer (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nama          TEXT NOT NULL,
  tipe          TEXT CHECK (tipe IN ('umum','korporat')) DEFAULT 'umum',
  telepon       TEXT,
  alamat        TEXT,
  kota          TEXT,
  pic_nama      TEXT,              -- kontak person (korporat)
  pic_telepon   TEXT,
  term_hari     INTEGER DEFAULT 0, -- tempo pembayaran; 0 = tunai/langsung
  catatan       TEXT,
  aktif         BOOLEAN DEFAULT true,
  created_by    UUID REFERENCES profiles(id),
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);
-- TIDAK ada UNIQUE pada nama (dua toko bisa bernama sama beda kota) —
-- dedup dijaga lewat pencarian di UI saat menambah, bukan constraint.

ALTER TABLE customer ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_all_customer" ON customer FOR ALL USING (auth.uid() IS NOT NULL);
-- Staff-only, TIDAK ada akses anon. Role gating di React (konsisten codebase).

-- =====================================================================
-- B. Link di pengiriman (nullable — walk-in tetap teks bebas)
-- =====================================================================
ALTER TABLE pengiriman ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES customer(id);
  -- default NO ACTION: customer yang masih direferensikan tidak bisa dihapus
CREATE INDEX IF NOT EXISTS idx_pengiriman_customer_id ON pengiriman (customer_id);

NOTIFY pgrst, 'reload schema';
```

**Yang TIDAK disentuh:** kolom `pengirim_*` TETAP ADA sebagai snapshot per
kiriman (alamat jemput bisa beda per transaksi; print & views memakainya).
Views publik tidak berubah — `customer` TIDAK PERNAH diekspos ke anon.
Tabel `pelanggan` furniture lama (`nama_customer` di `penjualan`) tidak
disentuh — arsip. TIDAK ada backfill otomatis dari data pengiriman lama
(lihat Keputusan Terbuka #1).

## 3. Business Rules

- **Form pengiriman — pemilihan pengirim**: search-dropdown customer aktif
  (cari nama/telepon) + opsi "Pengirim baru / walk-in" (teks bebas seperti
  sekarang, `customer_id` NULL). Pilih customer → auto-fill snapshot
  `pengirim_nama/telepon/alamat/kota` dari master, **tetap bisa diedit**
  per kiriman (misal jemput dari gudang berbeda) — yang tersimpan di
  `pengiriman` adalah nilai final di form, master tidak berubah.
- **Quick-add**: tombol "+ Customer baru" di form pengiriman membuka modal
  mini (nama + telepon + tipe saja) — supaya CS tidak perlu pindah halaman
  di tengah input order. Field lain dilengkapi belakangan di halaman Customer.
- **Jatuh tempo** = `DATE(tanggal) + term_hari` (term diambil dari master
  saat query, bukan snapshot — perubahan term berlaku ke tagihan berjalan).
  Customer `term_hari = 0` dan kiriman walk-in → jatuh tempo = tanggal kirim.
- **Aging bucket** (basis kiriman `status_bayar != 'lunas'`, dihitung dari
  jatuh tempo): `Belum jatuh tempo`, `1–7 hari`, `8–30 hari`, `> 30 hari`.
  Kiriman `retur` tetap masuk piutang (konsisten keputusan spec 01: ongkir
  retur tetap ditagih) kecuali diputuskan lain di sana.
- **Rekap tagihan (statement)**: per customer per rentang tanggal — daftar
  kiriman (resi, tanggal, tujuan, total, terbayar, sisa) + grand total sisa.
  Cetak via print helper baru `lib/printTagihanCustomer.ts` (pola file
  print existing, jangan modifikasi print lama).
- **Pelunasan massal**: di drill-down customer, pilih beberapa kiriman
  (checkbox) → satu aksi "Catat Pelunasan Terpilih" → untuk TIAP kiriman
  terpilih insert `pengiriman_pembayaran` sebesar sisa masing-masing
  (metode + catatan sama, catatan otomatis diberi ref "Pelunasan massal
  {tanggal}") + update `uang_dp`/`status_bayar` per kiriman — mekanisme
  per-kiriman yang sudah ada, dipanggil berulang. TIDAK ada entitas
  invoice/tagihan formal baru (lihat Keputusan Terbuka #2).
- Tidak ada perubahan pada alur pelunasan satuan, rollback pembayaran,
  maupun aturan `metode_bayar` (tetap tidak dioverwrite).

## 4. Role & Permission

| Halaman/aksi                            | Role                                                        | Enforce |
| --------------------------------------- | ----------------------------------------------------------- | ------- |
| CRUD customer (`/dashboard/customer`)   | superadmin, cs, kasir, keuangan                             | React   |
| Nonaktifkan/hapus customer              | superadmin, keuangan                                        | React   |
| Quick-add customer dari form pengiriman | role yang bisa buat pengiriman                              | React   |
| Halaman Piutang + cetak rekap           | superadmin, keuangan, kasir                                 | React   |
| Pelunasan massal                        | superadmin, kasir, keuangan (set sama dgn pelunasan satuan) | React   |

RLS tetap `auth_all_customer` — hardening per-role = spec 05.

## 5. Perubahan UI

- **`/dashboard/customer` (baru)**: tabel CRUD pola sama seperti Cabang/
  Tarif Zona — search nama/telepon/kota, badge tipe (Umum abu / Korporat
  biru), kolom term hari, toggle aktif. Klik baris → panel/halaman ringkas:
  data customer + ringkasan (total kiriman, total piutang) + daftar kiriman
  terakhir.
- **Form `/dashboard/pengiriman`**: blok "Pengirim" diubah — search-dropdown
  customer + tombol quick-add + fallback walk-in. Field snapshot tetap
  tampil & editable setelah pilih.
- **`/dashboard/piutang` (baru)**: stat cards per bucket aging (nominal +
  jumlah kiriman), tabel per customer (nama, tipe, total sisa, sebaran
  bucket, kiriman tertua) sort default sisa terbesar — termasuk baris
  "Walk-in / Tanpa Customer" untuk kiriman `customer_id` NULL yang belum
  lunas. Drill-down per customer: daftar kiriman belum lunas + checkbox +
  aksi Catat Pelunasan Terpilih + tombol Cetak Rekap Tagihan.
- **Sidebar**: "Customer" di grup nav utama (dekat Pengiriman); "Piutang"
  di grup Keuangan.

## 6. Checklist Implementasi (urutan eksekusi)

- [x] **Step 1** — Migration §2 di local. Verifikasi: insert customer via
      SQL, tambah `customer_id` ke satu pengiriman uji.
- [x] **Step 2** — `lib/types.ts`: interface `Customer`, `Pengiriman` +
      `customer_id`. Helper aging bucket di `lib/pengirimanConstants.ts`.
- [x] **Step 3** — `/dashboard/customer`: CRUD + panel ringkas.
- [x] **Step 4** — Form pengiriman: search-dropdown + quick-add + snapshot
      auto-fill. Uji: pilih customer → snapshot terisi & editable; walk-in
      → `customer_id` NULL; quick-add dari form langsung terpilih.
- [x] **Step 5** — `/dashboard/piutang`: stat cards + tabel per customer +
      drill-down. (Pelunasan massal & cetak belum.)
- [x] **Step 6** — Pelunasan massal di drill-down. Uji: 2 kiriman dipilih →
      2 baris `pengiriman_pembayaran`, status masing-masing `lunas`,
      rollback per baris tetap berfungsi.
- [x] **Step 7** — `lib/printTagihanCustomer.ts` + tombol Cetak Rekap.
- [x] **Step 8** — Update CLAUDE.md (skema customer, §Business Logic aging
      & pelunasan massal, §Fitur Per Halaman customer + piutang, sidebar)
      & expedisi.md ✅. Arsipkan spec ini.

## Keputusan Terbuka

1. **Backfill customer dari data pengiriman lama?** Grouping otomatis by
   `pengirim_nama+telepon` rawan duplikat kotor (typo, nama sama).
   _(Usulan: TIDAK ada backfill otomatis — staf membuat customer untuk
   pengirim berulang secara organik saat order berikutnya masuk; data lama
   dibiarkan `customer_id` NULL.)_
2. **Perlu entitas invoice/tagihan formal bernomor** (mis. `TGH-YYYYMM-001`
   yang membekukan daftar kiriman + punya status sendiri), atau cukup rekap
   dinamis + pelunasan massal seperti spec ini? _(Usulan: cukup rekap
   dinamis dulu — entitas invoice formal menambah masalah alokasi
   pembayaran dan sinkronisasi status ganda; bangun nanti HANYA kalau
   customer korporat menuntut nomor tagihan resmi.)_
3. **Pelunasan massal: wajib bayar penuh sisa semua yang dipilih**, atau
   boleh bayar sebagian dari total (perlu logika alokasi urut-tertua)?
   _(Usulan: penuh per kiriman terpilih saja — bayar sebagian tetap lewat
   pelunasan satuan yang sudah ada. Alokasi otomatis = kompleksitas yang
   belum dibutuhkan.)_
4. **Kiriman retur di piutang**: konfirmasi ulang konsistensi dengan
   keputusan final spec 01 #1 — kalau di sana kamu memutuskan ongkir retur
   TIDAK ditagih, maka retur harus dikeluarkan dari aging & rekap tagihan
   di spec ini.
