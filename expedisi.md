# Rencana Perombakan — ExpedisiBunganaik

> Dokumen perencanaan untuk merombak sistem **BungaNaik** (stock management
> furniture) menjadi sistem manajemen **perusahaan expedisi** (freight /
> logistik / pengiriman barang). Ini living document — update terus seiring
> keputusan diambil.

---

## 1. Status Saat Ini

- Project ini (`ExpedisiBunganaik`) adalah hasil fork dari `/Users/asdarsaid/BungaNaik`.
  Git history dimulai baru di sini (tidak menyambung ke history BungaNaik asli).
- Data production sudah dimigrasikan dari Supabase self-hosted di VPS ke
  Supabase CLI local (`supabase start`, port default 54321-54327) untuk
  development:
  - Database: `public` + `auth` + `storage` schema, full data (350 produk,
    100 reseller, 59 penjualan, 9 user, dst).
  - Storage: 258 file bucket `BungaNaik` di-upload ke storage local.
  - **Catatan teknis kalau perlu migrasi ulang di masa depan** (biar tidak
    kejadian lagi):
    - `pg_dump` dengan `--no-privileges` akan menghapus semua GRANT ke
      `anon`/`authenticated`/`service_role` di schema `public` — harus di
      re-apply manual setelah restore (`GRANT ALL ON ALL TABLES ...`, dst).
    - Tabel yang punya FK ke tabel lain yang urutan dump-nya belakangan
      (mis. `auth.identities` → `auth.users`) bisa gagal ter-COPY karena FK
      violation — cek row count tiap tabel penting setelah restore, jangan
      asumsi restore penuh berhasil hanya dari exit code.
    - Restore ke local sebaiknya jangan pakai `--clean` untuk schema
      `auth`/`storage` (tabel-tabel itu dimiliki role `supabase_auth_admin`
      / `supabase_storage_admin`, bukan `postgres` — DROP/ALTER akan gagal
      "must be owner"). Cukup COPY data ke tabel yang sudah dibuat oleh
      `supabase start`.
- Foto produk/tracking/PO **sudah tidak jadi prioritas** — domain furniture
  ini akan ditinggalkan seiring pivot ke expedisi.
- Sidebar (`components/Sidebar.tsx`) sudah di-trim: modul furniture-specific
  di-comment out (bukan dihapus, lihat §5).

---

## 2. Visi Target

Mengubah BungaNaik dari **sistem stok & penjualan furniture** menjadi
**sistem operasional perusahaan expedisi**: menerima order kiriman,
menghitung tarif, menyusun manifest/rute, melacak status kiriman sampai
selesai, dan mengelola keuangan (termasuk COD) terkait.

### Keputusan besar yang masih perlu diambil

- [ ] **Full pivot vs modul tambahan** — apakah `penjualan`/`produk` di-refactor
  total jadi `pengiriman`, atau dua bisnis (furniture + expedisi) jalan
  berdampingan di codebase yang sama? *(Asumsi kerja saat ini: full pivot,
  sesuai arahan "betul-betul ingin merombak")*.
- [x] **Model bisnis: Campuran kurir/paket DAN kargo/pindahan.** Konsekuensi:
  `pengiriman.jenis_layanan` menentukan alur harga —
  `reguler`/`express` → hitung otomatis dari `tarif_zona` (zona+berat);
  `kargo` → field harga diisi manual (quote), lewati pricing engine.
  Pricing engine (Fase 2 §7) harus mendukung dua jalur ini sejak awal,
  bukan ditambah belakangan.
- [ ] Apakah ada jaringan cabang/agen fisik, atau operasi terpusat dari satu
  titik saja (gudang/kantor tunggal + armada sendiri)?

---

## 3. Modul Sistem — Rencana

### 3.1 Tetap dipakai / direpurpose dari sistem lama

| Modul lama | Status | Catatan |
|---|---|---|
| Absensi Karyawan | Tetap | Sudah generic, tinggal pakai untuk staf & sopir expedisi |
| Meja Kerja Owner | Tetap | Reminder, monitoring — generic ke bisnis apapun |
| Keuangan (workspace, laporan, pengeluaran) | Tetap | Generic, tinggal sesuaikan kategori pengeluaran |
| Laporan Sopir | Tetap, diperluas | Sudah cocok, akan jadi laporan performa kurir/sopir |
| Laporan Wilayah | Tetap, diperluas | Cocok untuk laporan per zona/rute pengiriman |
| Kritik & Saran | Tetap | Generic complaint/review |
| Pengguna (role management) | Tetap | Role list perlu diubah, lihat §4 |
| `nomor_resi` + milestone tracking + `/resi/[nomor]` | **Fondasi utama** | Ini paling dekat dengan kebutuhan expedisi — tinggal generalisasi dari "tracking penjualan produk" jadi "tracking pengiriman apapun" |
| Penjualan (invoice, split payment, pelunasan) | Direfactor jadi `pengiriman` | Struktur bisnis (nomor_faktur, milestone, uang_dp, status_bayar) tetap relevan, tapi field-field terkait produk (harga_katalog, bonus reseller) tidak dipakai |

### 3.2 Di-deprecate — ✅ DIHAPUS PERMANEN di Fase 16 (20 Jul 2026),
kecuali 2 pengecualian eksplisit

**Dihapus permanen** (kode + tabel database, lihat §7 poin 16 untuk
rincian & backup): Produk & Stok, Meja Kerja Gudang, Reseller +
Pengumuman + Tier + Top Reseller, Pelanggan (grouped by reseller),
Purchase Order (halaman manajemen — tabelnya sendiri TETAP ADA, lihat
pengecualian di bawah), Target Penjualan, Pencocokan Nota, Laporan
Produk, Usia Barang, Laporan Tukang, seluruh modul **HPP Produksi**
(bahan baku, pembelian BB, BOM, batch produksi, laporan HPP), katalog
publik (`/katalog`, `/toko`, `/etalase`, `/produk/[id]`), landing page
marketing furniture, reseller portal (`/r/[token]`), chat widget AI.

**PENGECUALIAN — sengaja DIPERTAHANKAN** (bukan kelalaian): Kasir (POS)
dan Penjualan (arsip, `/dashboard/penjualan`) TIDAK dihapus, karena
keduanya bukan viewer read-only pasif — masih fitur create/edit penuh
(termasuk "buat dari PO", foto produk, restore stok saat hapus item).
Mempertahankan kedua halaman ini berarti 11 tabel intinya juga ikut
dipertahankan: `produk`, `produk_foto`, `resellers`, `purchase_orders`,
`purchase_order_items`, `mutasi_stok`, `penjualan`, `penjualan_item`,
`penjualan_pembayaran`, `reseller_reviews`, `tracking_progress` — 3
halaman lain yang masih baca tabel-tabel ini ("Kritik & Saran", "Laporan
Wilayah", sebagian "Meja Kerja Owner") jadi TIDAK terdampak sama sekali
oleh Fase 16, nol perubahan kode di ketiganya.

> Sebelum Fase 16: belum dihapus dari database/kode, cuma di-comment di
> sidebar — dipakai referensi pola (CRUD, modal, RLS) saat membangun
> modul baru sepanjang Fase 1-15. Setelah dikonfirmasi genuinely tidak
> dibutuhkan lagi (kecuali kluster pengecualian di atas), dihapus
> permanen di Fase 16.

### 3.3 Modul baru yang perlu dibangun

**Prioritas tinggi (core operasional):**

- [ ] **Manajemen Pengiriman** — generalisasi `penjualan`: pengirim,
  penerima (nama, telepon, alamat lengkap asal & tujuan), berat, dimensi
  (panjang×lebar×tinggi → volumetrik), jenis layanan, nilai barang
  (untuk asuransi/klaim), instruksi khusus.
- [ ] **Pricing Engine** — tarif berdasarkan zona asal-tujuan × berat/volume
  (ambil yang lebih besar antara berat aktual vs volumetrik) × jenis
  layanan (reguler/express/kargo). Tabel tarif per rute atau formula
  jarak, tergantung jawaban §2.
- [ ] **Manifest & Rute** — kelompokkan banyak resi ke satu perjalanan,
  sopir scan/checklist banyak resi sekaligus per keberangkatan.
- [ ] **Armada & Sopir** — data kendaraan (plat, jenis, kapasitas
  berat/volume), riwayat maintenance, penugasan sopir ke rute/manifest.

**Prioritas menengah (finansial & kepercayaan):**

- [ ] **COD & Rekonsiliasi** — saldo COD yang dipegang sopir/agen,
  setoran ke kas, alur beda dari `penjualan_pembayaran` yang ada
  sekarang (itu untuk pelunasan invoice, bukan uang titipan COD).
- [ ] **Klaim/Asuransi** — proses klaim barang hilang/rusak, ganti rugi,
  terhubung ke `nilai barang` yang dicatat saat order dibuat.
- [ ] **Cabang/Agen** — kalau ada titik pickup/drop-off selain kantor
  pusat: stok resi per cabang, saldo COD per cabang, laporan per cabang.

**Prioritas rendah (nice-to-have):**

- [ ] Booking mandiri oleh customer (self-service form, bukan cuma
  dibuatkan staf).
- [ ] Notifikasi WA otomatis tiap perubahan milestone (sekarang masih
  manual via tombol "Bagikan ke Customer").

---

## 4. Auth & Role — SUDAH DIKERJAKAN (17 Jul 2026)

Role lama: `superadmin, kasir, keuangan, cs, gudang, pengiriman, produksi, sopir`.

Role baru (final, sudah diimplementasi — bukan lagi rencana):

- `superadmin` — tetap, full access
- `keuangan` — tetap
- `cs` — terima order, input data pengirim/penerima, booking
- `kasir` — tetap
- `gudang` — tetap, **plus** mengambil alih transisi milestone
  `diproses → diproduksi` yang dulu jadi milik role `produksi`
- `kurir` — **rename dari `pengiriman`** (bukan digabung dengan `sopir`,
  karena model bisnis campuran: kurir untuk paket reguler/express, sopir
  tetap terpisah untuk kargo/manifest truk besar)
- `sopir` — tetap, terpisah dari `kurir`
- ~~`produksi`~~ — **dihapus total**, tidak relevan untuk expedisi

### Yang sudah dikerjakan

- [x] `lib/roles.ts` dibuat sebagai satu sumber kebenaran (`ROLES`, `Role` type,
  `ROLE_LABELS`) — sebelumnya role di-duplikasi manual sebagai string literal
  di ~15 file (`PO_ROLES`, `KEU_ROLES`, `LAP_ROLES`, array `roles:[...]` di
  Sidebar, dst). File baru mana pun yang butuh role harus import dari sini.
- [x] `lib/types.ts` re-export `Role` dari `lib/roles.ts`
- [x] DB: constraint `profiles_role_check` diupdate ke 7 role baru; 2 baris
  data lama (`pengiriman`→`kurir`, `produksi`→`gudang` sementara) dimigrasikan
- [x] `contexts/AuthContext.tsx`: `isPengiriman`→`isKurir`, `isProduksi` dihapus,
  `canAccessPenjualan`/`canAccessPO` diupdate
- [x] Semua konsumen role di `app/dashboard/**` & `components/Sidebar.tsx`
  di-rename/disesuaikan (pengguna page picklist, PO pages, penjualan list +
  detail, milestone transition logic, reseller page)
- [x] Kode mati dihapus sekaligus (provider tidak pernah ter-mount, jadi
  tidak fungsional): `lib/auth-context.tsx`, `types/index.ts`,
  `app/products/*`, `app/transactions/*`, `app/resellers/*`,
  `components/layout/Sidebar.tsx`
- [x] `CLAUDE.MD` disinkronkan ke role & role-gate milestone yang baru

### Belum dikerjakan / masih sesuai rencana lama

- Milestone **value** (`diproses|diproduksi|dikirim|selesai`) belum diubah
  namanya — itu bagian dari Fase 1 (redesain skema `pengiriman`), sengaja
  belum disentuh di langkah ini supaya scope role-refactor tetap kecil.
- Akun staf lama yang tadinya `role='produksi'` sekarang `gudang` — cek
  manual lewat halaman Pengguna apakah orangnya masih relevan/perlu role lain.

---

## 5. Sidebar — Status Saat Ini

Sudah dikerjakan di sesi sebelumnya (`components/Sidebar.tsx`):

**Disembunyikan** (comment out, mudah dikembalikan): Meja Kerja Gudang,
Produk & Stok, Kasir (POS), Reseller + Pengumuman + Pelanggan, Purchase
Order, Target Penjualan, Pencocokan Nota, Top Reseller, Tier Reseller,
Laporan Produk, Usia Barang, Laporan Tukang, seluruh HPP Produksi, link
"Lihat Katalog Publik".

**Masih tampil**: Dashboard, Absensi, Lacak Pengiriman, Penjualan (jadi
basis `pengiriman` nanti), Laporan Penjualan, Laporan Sopir, Laporan
Wilayah, Kritik & Saran, Keuangan (3 sub-menu), Meja Kerja Owner +
Asisten Owner, Pengguna.

---

## 6. Skema Database

### `pengiriman` — SUDAH DIIMPLEMENTASI (Fase 1, 17 Jul 2026)

Migration: `supabase/migrations/20260717120000_pengiriman_fase1.sql`. Tabel
baru terpisah total dari `penjualan` (bukan rename) — lihat §7 Fase 1 untuk
detail lengkap & rasional keputusan.

```
pengiriman
  id, nomor_faktur (trigger, prefix PGM-), nomor_resi (BNG-XXXXXXXX, sama seperti penjualan), tanggal
  jenis_layanan (reguler|express|kargo)
  pengirim_nama*, pengirim_telepon, pengirim_alamat, pengirim_kota
  penerima_nama*, penerima_telepon, penerima_alamat, penerima_kota
  berat_kg, panjang_cm, lebar_cm, tinggi_cm, berat_volumetrik_kg (generated, /6000)
  isi_barang, nilai_barang        -- dasar klaim/asuransi (Fase 4)
  ongkir, biaya_asuransi, total_tagihan   -- ongkir otomatis dari tarif_zona (reguler/express, Fase 2) atau manual (kargo)
  status_bayar, metode_bayar, uang_dp     -- enum sama seperti penjualan, default status_bayar='belum_bayar'
  milestone (diproses|dijemput|dikirim|selesai)  -- 4 tahap linear, tanpa percabangan
  petugas_nama, petugas_telepon   -- kurir/sopir yang menangani
  catatan, catatan_internal, created_by, created_at, updated_at
  (* = NOT NULL)

pengiriman_tracking   -- mirip tracking_progress lama, FK pengiriman_id (bukan penjualan_id)
pengiriman_pembayaran -- mirip penjualan_pembayaran lama, FK pengiriman_id

-- Views publik (dipakai /resi/[nomor]):
pengiriman_publik, pengiriman_riwayat_publik
  -- TIDAK expose: alamat lengkap, telepon siapapun, nilai_barang, breakdown ongkir/asuransi,
  -- data petugas — hanya kota tujuan + status + total_tagihan (parity dgn disiplin view lama)
```

**Belum ada** (menyusul di fase terkait): `manifest`/`armada` (Fase 3),
`cod_amount` terpisah & `klaim` (Fase 4). Field `nilai_barang` sudah
disiapkan sekarang supaya Fase 4 tidak perlu backfill data lama.

### `tarif_zona` — SUDAH DIIMPLEMENTASI (Fase 2, 17 Jul 2026)

Migration: `supabase/migrations/20260717130000_tarif_zona_fase2.sql`.

```
tarif_zona
  id, kota_asal, kota_tujuan, jenis_layanan (reguler|express)  -- kargo TIDAK pakai tabel ini
  harga_per_kg, harga_flat_min (floor/minimum ongkir), estimasi_hari, aktif
  created_by, created_at, updated_at
  UNIQUE (LOWER(kota_asal), LOWER(kota_tujuan), jenis_layanan)  -- case-insensitive
```

RLS: `auth_all_tarif_zona` (staff-only, `auth.uid() IS NOT NULL`) — tidak ada
akses anon sama sekali (beda dari `pengiriman_publik`), karena data harga
per-kg adalah info internal, bukan untuk publik.

### `armada` / `manifest` / `manifest_item` — SUDAH DIIMPLEMENTASI (Fase 3, 17 Jul 2026)

Migration: `supabase/migrations/20260717140000_manifest_armada_fase3.sql`.

```
armada
  id, plat_nomor (unique), jenis_kendaraan, kapasitas_kg, kapasitas_m3
  status (tersedia|maintenance|nonaktif), sopir_id (default, opsional)
  catatan, aktif, created_at, updated_at

manifest
  id, nomor_manifest (trigger, prefix MNF-), armada_id, sopir_id (per-trip, bisa beda dari default armada)
  rute, tanggal_berangkat, status (draft|berangkat|selesai|batal)
  catatan, created_by, created_at, updated_at

manifest_item
  id, manifest_id, pengiriman_id, urutan
  UNIQUE (manifest_id, pengiriman_id)
```

RLS ketiganya: `auth_all_*` (staff-only, tidak ada view publik — tidak
relevan untuk customer). Role buat/edit isi manifest: `superadmin`+`gudang`.
Role tandai berangkat/selesai/batal: `superadmin`+`gudang`+`sopir`+`kurir`.

### `klaim` / `cod_setoran` — SUDAH DIIMPLEMENTASI (Fase 4, 18 Jul 2026)

Migration: `supabase/migrations/20260718150000_cod_klaim_fase4.sql`.

```
klaim
  id, nomor_klaim (trigger, prefix KLM-YYYYMMDD-0001)
  pengiriman_id (FK pengiriman, ON DELETE SET NULL — beda dari pola cascade Fase 1)
  pengiriman_nomor_resi, pengiriman_penerima_nama   -- snapshot saat dibuat
  tipe (hilang|rusak), status (pending|disetujui|ditolak|selesai)
  nilai_klaim, nilai_disetujui, kronologi, catatan_approval, foto_bukti
  created_by, approved_by, approved_at, created_at, updated_at

cod_setoran   -- ledger setoran per sopir/kurir, sengaja tanpa nomor dokumen formal
  id, sopir_id (FK profiles, NOT NULL), jumlah, tanggal_setor
  catatan, foto_bukti, created_by, created_at
```

Sesuai jawaban §8 (COD bukan metode mayoritas, dipegang sopir/kurir saja —
bukan agen), field `agen_id` di draft awal **tidak jadi dipakai**. RLS
keduanya: `auth_all_klaim`/`auth_all_cod_setoran` (staff-only, konsisten
dengan `armada`/`manifest`). Detail keputusan desain (kenapa `ON DELETE SET
NULL` + snapshot, kenapa estimasi COD berbasis pencocokan nama bukan FK) ada
di §7 poin 4 di bawah.

### `cabang` — SUDAH DIIMPLEMENTASI (Fase 5, 18 Jul 2026)

Migration: `supabase/migrations/20260718160000_cabang_fase5.sql`.

```
cabang
  id, nama (UNIQUE), kota, alamat, telepon, catatan
  aktif BOOLEAN DEFAULT true, created_at, updated_at

-- Kolom label/filter nullable di tabel existing:
pengiriman.cabang_id, manifest.cabang_id, armada.cabang_id  -- semua FK -> cabang
```

Sesuai jawaban §8: jumlah cabang **dinamis** (bukan hardcode 2), CRUD
`/dashboard/cabang` **superadmin only**. **Cabang cuma label/filter, bukan
isolasi data** — tidak ada RLS atau app-level partisi akses berdasarkan
cabang staf, semua staf tetap bisa lihat/kelola semua cabang seperti biasa.
Sengaja **tidak ada `profiles.cabang_id`** — tidak ada fitur konkret yang
butuh itu sekarang (tidak ada isolasi akses), dan `/dashboard/pengguna`
belum punya fitur edit user sama sekali (cuma create), jadi menambah field
di sana berarti membangun fitur yang tidak diminta. RLS `cabang`:
`auth_all_cabang` (staff-only, semua staf boleh `SELECT` untuk dropdown).

Tabel yang **kemungkinan besar tidak dipakai lagi** setelah pivot penuh:
`produk`, `produk_foto`, `resellers`, `bahan_baku`, `bom`, `batch_produksi`,
`purchase_orders`, `purchase_order_items`, dan seluruh tabel HPP.

---

## 7. Fase Implementasi (usulan urutan)

1. **Fase 1 — Fondasi entitas kiriman — ✅ SELESAI (17 Jul 2026)**:
   - Tabel `pengiriman`+`pengiriman_tracking`+`pengiriman_pembayaran` baru
     (terpisah total dari `penjualan`, bukan rename — data furniture lama
     tidak disentuh, tetap ada sebagai arsip)
   - `insertPengirimanWithResi()` baru di `lib/utils.ts` (fungsi lama
     `insertPenjualanWithResi` tidak diubah)
   - `lib/types.ts`: interface `Pengiriman`/`PengirimanTracking`/`PengirimanPembayaran`
   - Halaman baru: `/dashboard/pengiriman` (list+create, form disederhanakan
     tanpa cart/produk/reseller) dan `/dashboard/pengiriman/[id]` (detail —
     milestone 4-tahap linear, pelunasan, rollback, delete, catatan internal)
   - `/resi/[nomor]` di-rewrite in-place ke view `pengiriman_publik`/
     `pengiriman_riwayat_publik` baru — **resi lama (transaksi furniture)
     sengaja jadi "tidak ditemukan"**, sesuai keputusan
   - Print helper baru: `lib/printPengirimanInvoice.ts`,
     `lib/printPengirimanResi.ts` (file lama `printInvoice.ts`/`printResi.ts`
     tidak diubah)
   - Sidebar: nav baru "Pengiriman" (flat, semua role operasional). Nav GPS
     lama "Lacak Pengiriman" di-rename jadi "Lacak GPS Sopir" biar tidak
     rancu dengan entitas baru ini
   - **Sengaja dibiarkan tidak disentuh**: Dashboard utama, Meja Kerja Owner
     (+ Asisten), semua Laporan, Pencocokan, Target, Pelanggan — masih baca
     `penjualan`/`produk` lama, datanya jadi "beku" (tidak nambah lagi ke
     depan). Direstrukturisasi di fase terpisah, bukan bagian Fase 1.
   - Detail lengkap keputusan desain (kenapa tabel terpisah, kenapa milestone
     disederhanakan jadi 4 tahap tanpa hub, dsb) ada di riwayat percakapan
     sesi ini — ringkasannya di §6 di atas.
2. **Fase 2 — Pricing engine — ✅ SELESAI (17 Jul 2026)**:
   - Tabel `tarif_zona` (kota_asal, kota_tujuan, jenis_layanan, harga_per_kg,
     harga_flat_min, estimasi_hari, aktif) — unique constraint case-insensitive
     per (kota_asal, kota_tujuan, jenis_layanan), RLS staff-only (`auth_all_tarif_zona`)
   - **Hanya untuk `reguler`/`express`** — kargo tetap manual quote (keputusan
     Fase 1 dipertahankan)
   - Formula: `ongkir = max(harga_per_kg × berat_efektif, harga_flat_min)`,
     `berat_efektif = max(berat_kg, berat_volumetrik_kg)`
   - Halaman admin `/dashboard/tarif-zona` (superadmin only, sama seperti pola
     "Target Penjualan" lama): CRUD tarif + toggle aktif/nonaktif
   - Form `/dashboard/pengiriman`: lookup otomatis (ilike case-insensitive)
     begitu kota asal+tujuan+berat+jenis layanan terisi, auto-fill `ongkir`
     **tapi tetap bisa di-override manual**. Kalau rute belum ada tarifnya,
     form tidak diblokir — cuma notice "isi manual"
   - Sidebar: nav "Tarif Zona" ditambahkan ke grup Admin (bareng "Pengguna")
3. **Fase 3 — Manifest & Armada — ✅ SELESAI (17 Jul 2026)**:
   - Tabel `armada` (plat, jenis, kapasitas, status, sopir default opsional),
     `manifest` (nomor_manifest trigger `MNF-`, armada+sopir per-trip, rute,
     tanggal, status `draft|berangkat|selesai|batal`), `manifest_item`
     (junction ke `pengiriman`, unique per pasangan)
   - Halaman admin `/dashboard/armada` (CRUD, superadmin+gudang) dan
     `/dashboard/manifest` + `/dashboard/manifest/[id]` (assign kiriman,
     bulk aksi Berangkat/Selesai/Batalkan)
   - **Bulk milestone update**: tombol "Berangkat" set semua kiriman di
     manifest (yang masih `diproses`/`dijemput`) jadi `dikirim` sekaligus +
     catat `pengiriman_tracking` per item; "Selesai" set jadi `selesai`.
     "Batalkan" cuma ubah status manifest, **tidak** mengembalikan milestone
     kiriman yang terlanjur ter-update (staff perlu perbaiki manual kalau perlu)
   - Kiriman yang sudah ada di manifest lain yang masih aktif (`draft`/
     `berangkat`) dikecualikan dari hasil pencarian "tambah kiriman" —
     dicegah di level aplikasi (client-side filter), bukan constraint DB
   - Sidebar: section collapsible lama "Pengiriman" (isinya cuma Lacak GPS
     Sopir) di-**rename jadi "Operasional Armada"** sekalian beresin
     naming collision yang sempat diflag di Fase 1 — sekarang isinya Lacak
     GPS Sopir + Armada + Manifest
4. **Fase 4 — COD & Klaim — ✅ SELESAI (18 Jul 2026)**: alur keuangan khusus
   expedisi. COD bukan metode mayoritas (transfer/cash lebih dominan) — modul
   sengaja ringan: pencatatan saldo titipan + setoran, tanpa dashboard
   rekonsiliasi harian yang rumit. Dikerjakan **sebelum** Fase 5 — tabel
   `cod_setoran`/`klaim` dibuat tanpa konsep hub (`cabang_id` menyusul di
   Fase 5 kalau perlu partisi data).
   - Tabel `klaim` (nomor trigger `KLM-YYYYMMDD-0001`, status
     `pending→disetujui/ditolak→selesai` — vokabulari sama seperti
     `purchase_orders.status`) dan `cod_setoran` (ledger polos per
     sopir/kurir, tanpa nomor dokumen formal)
   - `klaim.pengiriman_id` pakai `ON DELETE SET NULL` (bukan CASCADE seperti
     child table `pengiriman` lain) + snapshot `pengiriman_nomor_resi`/
     `pengiriman_penerima_nama` saat dibuat — klaim adalah catatan finansial
     yang tidak boleh hilang diam-diam kalau pengiriman induknya terhapus
   - **Tidak menyentuh tabel/form `pengiriman`** sama sekali (tidak ada
     `petugas_id` FK baru) — supaya scope tetap ringan sesuai arahan. Efek
     sampingnya: "Estimasi COD Terkumpul" di `/dashboard/cod` dihitung dari
     pencocokan teks `pengiriman.petugas_nama` terhadap `profiles.name`,
     bukan link presisi — **ditandai jelas sebagai estimasi di UI**, bukan
     angka otoritatif. `cod_setoran` sendiri (sisi setoran) tetap presisi
     karena `sopir_id` benar-benar FK ke `profiles`
   - Halaman baru `/dashboard/klaim` (lapor klaim oleh staf manapun, approve
     nilai ganti rugi khusus superadmin, tandai selesai superadmin/keuangan,
     hapus superadmin only) dan `/dashboard/cod` (catat setoran — input oleh
     superadmin/keuangan/kurir/sopir, edit/hapus superadmin/keuangan only)
   - Sidebar: group collapsible baru "COD & Klaim" (Setoran COD + Klaim)
5. **Fase 5 — Cabang/Agen — ✅ SELESAI (18 Jul 2026)**: jumlah cabang
   **dinamis** (CRUD superadmin only, mulai dari 1 dan bisa bertambah
   kapan saja — bukan hardcode). Tabel `cabang` baru + kolom `cabang_id`
   nullable di `pengiriman`/`manifest`/`armada`.
   - **Cabang cuma label/filter, BUKAN isolasi data** — semua staf
     (non-superadmin sekalipun) tetap bisa lihat & kelola pengiriman/
     manifest/armada di semua cabang seperti sekarang. `cabang_id` dipakai
     untuk filter list `/dashboard/pengiriman` & penugasan armada saja,
     tidak ada RLS/app-level partisi akses berdasarkan cabang staf. Ini
     sengaja dipilih supaya scope tetap ringan (tim masih kecil, saling
     koordinasi lintas cabang).
   - **Tidak jadi ada `profiles.cabang_id`** (beda dari rencana awal) —
     tidak ada fitur isolasi akses yang butuh itu, dan `/dashboard/pengguna`
     belum punya fitur edit user sama sekali sehingga menambah field di
     sana berarti membangun fitur baru yang tidak diminta
   - Halaman baru `/dashboard/cabang` (superadmin only, pola tabel sama
     seperti Tarif Zona: nama/kota/telepon/toggle-aktif + modal form)
   - Dropdown "Cabang (opsional)" ditambahkan ke form
     `/dashboard/pengiriman`, `/dashboard/armada`, dan form-create +
     detail-edit `/dashboard/manifest` — di manifest, `cabang_id` auto-fill
     dari armada terpilih (pola sama seperti auto-fill `sopir_id`), tetap
     bisa di-override manual
   - Filter "Semua Cabang" baru di list `/dashboard/pengiriman`
   - Sidebar: item baru "Cabang" di section Admin (bareng Pengguna +
     Tarif Zona)
   - Hapus cabang yang masih dipakai pengiriman/armada/manifest sengaja
     gagal (FK constraint default Postgres, tidak di-`ON DELETE CASCADE`
     atau `SET NULL`) — pesan error mengarahkan nonaktifkan saja
6. **Gagal Kirim, Retur & POD — ✅ SELESAI (18 Jul 2026)**: spec terpisah
   `docs/spec/01-gagal-kirim-pod.md` (sudah diarsipkan). Menambah 2
   milestone baru (`gagal_kirim`, `retur`) dan mewajibkan bukti serah
   terima (POD) saat kiriman ditandai `selesai`.
   - Peta transisi jadi bercabang (bukan linear lagi):
     `dikirim → selesai | gagal_kirim`, `gagal_kirim → dikirim (kirim
     ulang) | retur`, `retur` & `selesai` sama-sama terminal
   - Kolom baru: `pengiriman.jumlah_gagal` (counter, +1 tiap transisi ke
     `gagal_kirim`, **tidak** naik lagi saat retry — baik manual maupun
     lewat manifest), `pengiriman.pod_penerima_nama` +
     `pengiriman.pod_foto_url` (wajib diisi UI saat `selesai`, **di-enforce
     app-level, bukan DB**), `pengiriman_tracking.alasan_gagal` (5 pilihan
     terstruktur, CHECK constraint di DB)
   - `/dashboard/pengiriman/[id]`: 3 modal baru (Gagal Kirim, Selesai+POD,
     Retur), badge `jumlah_gagal`, blok POD setelah selesai
   - `/dashboard/pengiriman` (list): 2 kartu ringkasan baru (Gagal Kirim,
     Retur), keduanya klik-untuk-filter
   - `/dashboard/manifest/[id]`: pencarian & aksi "Berangkat" sekarang
     menyertakan kiriman `gagal_kirim` (kirim ulang lewat manifest); aksi
     "Tandai Selesai" **berhenti bulk-update milestone kiriman** — cuma
     menutup `manifest.status`, karena `selesai` sekarang wajib POD
     per-kiriman (mustahil dikumpulkan bulk). **Breaking change alur kerja
     sopir/gudang** — kiriman harus di-POD satu-per-satu dari halaman detail
   - `/resi/[nomor]`: banner kuning "Pengiriman Gagal" (+ alasan label
     ramah) untuk `gagal_kirim`; banner abu terminal "Dikembalikan ke
     Pengirim" untuk `retur`
   - Retur **tidak** otomatis membuat `klaim` atau mengubah `status_bayar`
     — penyesuaian tagihan (kalau ada) tetap manual via rollback pembayaran
7. **Petugas FK, Dashboard & Laporan Operasional — ✅ SELESAI (18 Jul 2026)**:
   spec terpisah `docs/spec/02-petugas-id-dashboard.md` (sudah diarsipkan).
   Menutup 3 utang: `petugas_nama` TEXT bebas (estimasi COD tidak presisi),
   dashboard utama masih baca `penjualan` beku, dan `tarif_zona.estimasi_hari`
   tidak pernah dipakai (tidak ada laporan ketepatan waktu).
   - Kolom baru `pengiriman.petugas_id` (FK `profiles`, nullable — role
     `sopir`/`kurir` DEFAULT, tetap boleh `NULL` utk petugas non-staf/harian)
     dan `pengiriman.estimasi_hari` (snapshot dari `tarif_zona` saat kiriman
     dibuat, NULL utk kargo/rute tanpa tarif). Backfill sekali dari
     pencocokan nama (case-insensitive) — baris yang tidak ke-match
     dibiarkan `NULL`, tidak diblokir
   - `petugas_nama`/`petugas_telepon` **tetap ada** sebagai snapshot display
     (print resi/invoice) — bukan dihapus, cuma tidak lagi jadi satu-satunya
     sumber matching
   - Form `/dashboard/pengiriman`: field teks bebas diganti dropdown staf +
     opsi "Lainnya / Ketik Manual" (fallback, `petugas_id` tetap `NULL`)
   - **Definisi terlambat** baru (`lib/pengirimanConstants.ts`): batas =
     tanggal + estimasi_hari (hari kalender); selesai terlambat kalau waktu
     tracking milestone `selesai` (paling awal) lewat batas; aktif terlambat
     kalau hari ini sudah lewat batas dan belum selesai/retur; `estimasi_hari`
     NULL atau milestone `retur` dikecualikan total (bukan dihitung on-time)
   - `/dashboard/cod`: matching **diutamakan** `petugas_id`, fallback nama
     HANYA utk baris `petugas_id IS NULL` — disclaimer "estimasi" di UI
     otomatis hilang begitu tidak ada lagi baris fallback
   - **Dashboard utama (`/dashboard`) full rewrite** ke `pengiriman` (dulu
     baca `penjualan`, beku sejak Fase 1) — filter bulan/tahun + cabang baru,
     5 stat card (kiriman, revenue ongkir **termasuk retur** karena ongkir
     retur tetap ditagih penuh, belum lunas, gagal kirim aktif, retur),
     chart batang stacked per jenis layanan, 5 pengiriman terbaru. Widget
     nominal (revenue, rincian belum lunas) **superadmin/keuangan only**;
     count/status tetap semua role. Widget arsip furniture lama dihapus total
   - `/dashboard/laporan/sopir` **rewrite in-place** jadi **Laporan Petugas**
     (role akses berubah jadi `superadmin`/`keuangan`/`cs`, bukan `gudang`
     lagi) — podium & tabel peringkat dipertahankan polanya, kolom baru
     selesai/gagal kirim (SUM `jumlah_gagal`)/retur/on-time rate. Baris
     `petugas_id IS NULL` masuk bucket "Tanpa Petugas Terdaftar" (baris
     terpisah di akhir tabel, di luar podium/ranking)
   - Halaman baru `/dashboard/laporan/keterlambatan` (role sama: superadmin/
     keuangan/cs) — stat card terlambat aktif/terlambat selesai/on-time rate
     keseluruhan, tabel kiriman terlambat (resi, kota, petugas, umur vs
     estimasi, selisih hari) default sort selisih terbesar, filter periode +
     cabang + jenis layanan
   - Sidebar: label "Laporan Sopir" → "Laporan Petugas", item baru
     "Keterlambatan" di grup Laporan
8. **Master Customer, Piutang Aging & Tagihan Korporat — ✅ SELESAI (18 Jul
   2026)**: spec terpisah `docs/spec/03-customer-korporat.md` (sudah
   diarsipkan). Menutup utang `pengirim_nama` TEXT bebas (pengirim
   berulang tidak bisa direkap/ditagih bulanan) + tidak ada laporan
   piutang aging sebelumnya.
   - Tabel `customer` baru (tipe `umum`/`korporat`, `term_hari` tempo
     pembayaran default 0, TIDAK ada UNIQUE pada nama — dedup dijaga di
     UI) + kolom `pengiriman.customer_id` (nullable, FK, default NO
     ACTION). **TIDAK ada backfill otomatis** dari data pengiriman lama
     (keputusan sengaja — pencocokan nama+telepon otomatis rawan
     duplikat kotor)
   - Kolom `pengirim_*` di `pengiriman` **tetap ada** sebagai snapshot per
     kiriman — bahkan kiriman dengan `customer_id` terisi tetap simpan
     snapshot sendiri, master `customer` tidak pernah ikut berubah
   - Form `/dashboard/pengiriman`: search-dropdown customer (cari
     nama/telepon) + quick-add modal (nama+telepon+tipe saja) + auto-fill
     snapshot pengirim yang tetap editable setelah dipilih
   - **Aging piutang**: jatuh tempo = `tanggal + term_hari` (term diambil
     dari master SAAT QUERY, bukan snapshot — ubah term_hari langsung
     berlaku ke tagihan berjalan). 4 bucket: belum jatuh tempo, 1-7 hari,
     8-30 hari, >30 hari. Kiriman `retur` tetap masuk piutang (konsisten
     keputusan spec 01 — ongkir retur tetap ditagih)
   - Halaman baru `/dashboard/customer` (CRUD + panel ringkas: total
     kiriman + total piutang + kiriman terakhir) dan `/dashboard/piutang`
     (4 stat card aging bucket, tabel per customer sort sisa terbesar +
     baris "Walk-in/Tanpa Customer", drill-down)
   - **Pelunasan Massal** di drill-down piutang: checkbox multi-kiriman →
     insert `pengiriman_pembayaran` sebesar sisa PENUH per kiriman (bukan
     alokasi sebagian), reuse mekanisme pelunasan satuan yang sudah ada
     dipanggil berulang — **tidak ada entitas invoice formal baru**.
     Rollback pembayaran existing tetap berfungsi identik untuk baris ini
   - `lib/printTagihanCustomer.ts` — print helper baru format A4 (beda
     dari `printPengirimanInvoice.ts` yang half-page dot-matrix), tombol
     "Cetak Rekap Tagihan" di drill-down
   - Sidebar: "Customer" nav flat dekat "Pengiriman"; "Piutang" ditaruh di
     grup "Laporan" (bukan "Keuangan" seperti rencana awal spec — grup
     Keuangan sudah di-hide dari sidebar sebelum step ini dikerjakan)
9. **Biaya Trip Manifest & Laporan Laba per Trip — ✅ SELESAI (18 Jul
   2026)**: spec terpisah `docs/spec/04-biaya-trip.md` (sudah diarsipkan).
   Menutup utang: manifest mengumpulkan revenue (ongkir kiriman) tapi
   tidak ada tempat mencatat biaya trip (uang jalan, BBM, tol, kuli,
   parkir), jadi profitabilitas per rute/keberangkatan tidak bisa dihitung.
   - Tabel `manifest_biaya` baru (kategori uang_jalan/bbm/tol/kuli/parkir/
     lainnya, `jumlah > 0`). **FK `manifest_id` sengaja `NO ACTION` bukan
     CASCADE** — biaya trip adalah catatan finansial, hapus manifest yang
     masih ada biayanya akan gagal FK (pola sama seperti `cabang` yang
     masih dipakai)
   - **Tidak ada kolom baru** di `manifest`/`manifest_item`/`pengiriman` —
     Revenue (SUM `ongkir`, **termasuk** kiriman `gagal_kirim`/`retur`,
     konsisten spec 01) dan Laba (Revenue − Total Biaya) **selalu
     dihitung saat query**, bukan snapshot
   - Revenue trip sengaja **cuma `ongkir`, bukan `total_tagihan`** —
     `biaya_asuransi` dikeluarkan supaya margin trip tidak terlihat lebih
     gemuk dari kenyataan (asuransi punya liabilitas klaim di baliknya)
   - **Kebijakan anti-dobel dengan modul Pengeluaran keuangan**: biaya
     trip HANYA dicatat di `manifest_biaya` — TIDAK direkap ulang manual
     ke Pengeluaran, supaya tidak ada angka keuangan ganda
   - Section "Biaya Trip" baru di `/dashboard/manifest/[id]` (input:
     `superadmin`/`gudang`/`sopir`/`kurir`/`keuangan`; edit/hapus koreksi:
     `superadmin`/`keuangan` only — sopir yang input sendiri TIDAK bisa
     edit/hapus, keputusan sengaja biar sederhana) + panel Revenue/Total
     Biaya/Laba (role-gated `superadmin`/`keuangan`, role lain cuma lihat
     daftar & Total Biaya polos)
   - Halaman baru `/dashboard/laporan/laba-trip` (role `superadmin`/
     `keuangan`) — stat card (total trip/revenue/biaya/laba) + tabel per
     manifest sort laba terkecil (trip rugi muncul duluan) + expand inline
     breakdown biaya per kategori
   - Sidebar: "Laba per Trip" di grup Laporan
10. **Hardening RLS Tabel Finansial & Audit Trail — ✅ SELESAI (18 Jul
    2026)**: spec terpisah `docs/spec/05-hardening-rls.md` (sudah
    diarsipkan). Bukan fitur baru — mengencangkan RLS tabel finansial yang
    sebelumnya cuma digating `auth.uid() IS NOT NULL` (role gate cuma di
    React, staf mana pun secara teknis bisa hit REST API langsung untuk
    approve klaimnya sendiri, edit tarif, hapus setoran COD, dst).
    - Function baru `user_has_role(roles TEXT[])` (SECURITY DEFINER) —
      helper dipakai semua policy RLS baru
    - Tabel baru `aktivitas_log` (append-only, TANPA policy UPDATE/DELETE
      sama sekali — immutable kecuali `service_role`) + `logAktivitas()`
      di `lib/aktivitas.ts`, disisipkan ke 10 titik aksi sensitif existing
      (delete pengiriman, rollback pembayaran, approve/tolak klaim, hapus
      setoran COD, edit/hapus tarif, edit/hapus biaya trip)
    - RLS dipersempit per-operasi (SELECT tetap terbuka semua staf,
      TIDAK ada perubahan baca) untuk: `tarif_zona`, `cabang`,
      `pengiriman_pembayaran`, DELETE `pengiriman`, `klaim`,
      `cod_setoran`, `manifest_biaya` — migration terpisah per kelompok
      tabel (bukan satu file besar) supaya bisa direvert sebagian
    - **Breaking change**: DELETE `pengiriman` turun dari 5 role
      (`superadmin|kasir|kurir|gudang|keuangan`) jadi cuma 2
      (`superadmin|keuangan`) — tombol Delete di frontend **sengaja
      tidak diubah** (tetap terlihat utk role lama), DB yang menolak;
      halaman detail menampilkan pesan error, halaman list saat ini diam
    - Halaman baru `/dashboard/aktivitas` (`superadmin`/`keuangan`) — log
      read-only, filter tanggal/aksi/staf, expand detail JSON. Butuh
      function tambahan `get_staf_aktivitas()` (SECURITY DEFINER, expose
      HANYA `{id, name}`) karena RLS `profiles` yang sudah ada sebelum
      spec ini (tidak disentuh) cuma izinkan baca profil sendiri atau
      semua profil kalau `superadmin` — `keuangan` butuh jalur terpisah
      untuk resolve nama staf lain di log
    - **Tidak disentuh** (di luar scope, bisa menyusul sesi terpisah):
      RLS `armada`/`manifest`/`manifest_item`/`customer`/
      `pengiriman_tracking`, dan RLS `profiles` itu sendiri
    - Lihat CLAUDE.md §RLS untuk matriks lengkap per tabel + jebakan
      permissive-policy (policy Postgres di-OR, DROP `auth_all_*` lama
      WAJIB sebelum CREATE policy sempit baru — kalau tidak, TIDAK ADA
      EFEK sama sekali)
11. **Perombakan Pengeluaran & Laporan Keuangan Expedisi — ✅ SELESAI (18
    Jul 2026)**: spec terpisah `docs/spec/06-keuangan-expedisi.md` (sudah
    diarsipkan). Modul Pengeluaran & Laporan Keuangan sebelumnya masih
    basis furniture (kategori warisan lama, laporan baca `penjualan` yang
    beku sejak Fase 1) — dirombak jadi basis expedisi, **cash basis**,
    **tanpa pencatatan ganda**.
    - Tabel `pengeluaran` **REUSE** (bukan tabel baru, 90 baris data
      pra-pivot tetap ada sebagai arsip dgn kategori lama) — kolom baru
      `armada_id` (FK, wajib app-level utk kategori maintenance/pajak
      armada), `cabang_id` (opsional), `foto_bukti` (opsional). 8 kategori
      baru divalidasi di aplikasi saja, bukan CHECK DB (biar data arsip
      tidak bikin constraint gagal)
    - RLS `pengeluaran` di-harden pola spec 05: `user_has_role()`, policy
      lama `authenticated_access` (FOR ALL, jebakan permissive) di-DROP
      dulu → SELECT semua staf, INSERT/UPDATE/DELETE superadmin+keuangan
    - `klaim` dapat kolom `selesai_at` (diisi bareng `status='selesai'`)
      — basis cash-basis beban klaim (masuk beban di periode SELESAI,
      bukan periode kejadian). Backfill baris lama dari `updated_at`
      (aproksimasi sadar). **Tidak ada perubahan lain ke `klaim`/
      `manifest_biaya`** — keduanya tetap BACA SAJA di Laporan Keuangan
    - **Peta sumber angka**: Pemasukan = `pengiriman_pembayaran` (SUM per
      `created_at`, BUKAN `total_tagihan` pengiriman — DP & pelunasan di
      bulan berbeda = 2 pemasukan terpisah). Beban = Pengeluaran +
      `manifest_biaya` (baca saja) + klaim selesai (baca saja,
      `nilai_disetujui`) — 3 kelompok, TIDAK PERNAH dilebur atau disalin
      ulang ke `pengeluaran`
    - **Kebijakan Maintenance Armada final** (dari diskusi Fase 9→11):
      SEMUA maintenance armada, termasuk yang terjadi di tengah trip
      (ban pecah dsb), masuk `pengeluaran` dengan `armada_id` — BUKAN
      `manifest_biaya`, supaya tidak merusak margin trip yang manfaatnya
      lintas puluhan trip
    - `/dashboard/keuangan/pengeluaran` & `/dashboard/keuangan/laporan`
      **rewrite in-place total** — versi furniture lama (omset/HPP,
      potongan marketing & sedekah otomatis per unit, kondisi
      stok+piutang furniture) **dihapus**, bukan diarsipkan terpisah
      (satu laporan hidup lebih baik dari dua yang membingungkan; data
      lama tetap bisa dilihat dari halaman Penjualan arsip)
    - Laporan baru: stat card Pemasukan/Beban/Neto, breakdown pemasukan
      per metode, 3 kelompok beban collapsible (Pengeluaran bisa
      dikelola langsung; Biaya Trip & Klaim **read-only** dgn link
      "kelola di Manifest/Klaim"), grafik tren 12 bulan (trailing dari
      bulan filter), tabel Biaya per Armada (basis `pengeluaran.
      armada_id`, beda dari Laporan Laba per Trip yang basis
      `manifest_biaya`)
    - Klaim sengaja **tidak difilter cabang** di Laporan Keuangan (tidak
      ada kolom `cabang_id`, di luar scope nambah kolom ke `klaim`)
    - **2 bug lama diperbaiki sekalian saat rewrite**: kontradiksi role
      gate di `laporan/page.tsx` (guard luar izinkan keuangan, tapi ada
      early-return kedua yang efektif superadmin-only) dan pelanggaran
      Rules of Hooks di `pengeluaran/page.tsx` (early-return sempat ada
      sebelum deklarasi hook lain)
12. **Tugas Saya — Halaman Mobile Kurir/Sopir — ✅ SELESAI (19 Jul 2026)**:
    spec terpisah `docs/spec/archive/07-tugas-saya-mobile.md` (sudah
    diarsipkan). **Tidak ada tabel/kolom baru** — murni UI mobile-first di
    atas skema `pengiriman`/`pengiriman_tracking` yang sudah ada, plus satu
    index (`idx_pengiriman_petugas_milestone` pada `petugas_id, milestone`).
    - Logika Selesai (POD)/Gagal Kirim **diekstrak** ke `lib/pengirimanAksi.ts`
      (`submitSelesaiPOD`, `submitGagalKirim`) — dipakai BERSAMA oleh
      `/tugas` (baru) dan `/dashboard/pengiriman/[id]` (existing, spec 01),
      bukan diduplikasi. Validasi wajib (alasan gagal, nama+foto POD) sama
      persis di kedua tempat.
    - Halaman baru `/tugas` (route terpisah, layout sendiri
      `app/tugas/layout.tsx` — TANPA Sidebar), khusus role `sopir`/`kurir`.
      Daftar tugas = `pengiriman` WHERE `petugas_id = auth.uid()` AND
      `milestone IN ('dijemput','dikirim','gagal_kirim')`, urut
      `gagal_kirim` → `dikirim` → `dijemput` (bukan tanggal). Tab "Selesai
      Hari Ini" (baca `pengiriman_tracking`, bukan `pengiriman.milestone`,
      supaya benar-benar terbatas ke hari ini). Tap kartu → detail ringkas
      (alamat lengkap + tombol telepon `tel:`/WhatsApp `waLink()`).
    - Kamera langsung aktif saat "Selesai" (`capture="environment"`, pola
      sama absensi wajah) — bukan pilih galeri sebagai default.
    - **Tanpa dukungan offline** (keputusan sadar, bukan gap) — kegagalan
      network saat submit menampilkan error jelas + form tetap terisi utk
      coba lagi, tidak silent fail.
    - **Redirect pasca-login berbasis role** (bukan deteksi viewport,
      lebih sederhana & konsisten) — `sopir`/`kurir` langsung ke `/tugas`
      setelah login, role lain tetap ke `/dashboard`. Konstanta
      `TUGAS_ROLES` di `lib/roles.ts` jadi satu sumber kebenaran, dipakai
      baik oleh guard route maupun redirect login. `middleware.ts` juga
      didaftarkan proteksi utk `/tugas` (pola sama seperti `/dashboard`).
    - **Keterbatasan yang diketahui, bukan bug**: kiriman dengan
      `petugas_id IS NULL` (opsional "Lainnya" di form pengiriman, spec 02)
      tidak muncul di `/tugas` siapa pun — tetap harus dikelola dari
      `/dashboard/pengiriman` biasa.
13. **Scan QR Resi — Muat Manifest & Checklist — ✅ SELESAI (19 Jul
    2026)**: spec terpisah `docs/spec/archive/08-scan-qr-manifest.md`
    (sudah diarsipkan). **Tidak ada perubahan skema** selain satu index
    (`idx_pengiriman_petugas_milestone`, dipakai juga spec 07). **Format
    QR di `printPengirimanResi` TIDAK diubah** — tetap `nomor_resi` polos,
    scan cuma mengisi ulang alur pencarian & tambah-kiriman yang sudah
    ada dari Fase 3.
    - Library `@zxing/browser` (kamera belakang HP, mode continuous scan
      — kamera tetap aktif setelah tiap scan, bukan modal blocking).
    - Logika tambah-kiriman **diekstrak** ke `lib/manifestAksi.ts`
      (`findEligibleCandidates()`, `scanLookupManifest()`,
      `addManifestItem()`) — satu-satunya jalur validasi eligibility
      (milestone `diproses`/`dijemput`/`gagal_kirim` + exclude dobel-
      manifest) dan insert `manifest_item`, dipakai BERSAMA oleh search
      manual DAN scan QR, di KEDUA halaman (`/dashboard/manifest/[id]`
      dan tombol "Scan untuk Muat" baru di `/tugas`).
    - Komponen UI `components/ScanQRManifestOverlay.tsx` juga dipakai
      bersama kedua halaman — bukan cuma logic-nya yang reuse, tampilan &
      alur scan-nya identik.
    - Feedback per scan: getar (`navigator.vibrate`) + beep pendek (Web
      Audio, silent no-op kalau diblokir) + flash hijau/merah pada target
      box + toast teks — TIDAK ada dialog konfirmasi yang menghentikan
      sesi. Debounce: resi sama ter-scan ulang <2 detik diabaikan. Scan
      resi tidak eligible (sudah di manifest lain/status tidak sesuai/
      tidak ditemukan) TIDAK menghentikan sesi scan.
    - **Checklist "sudah dicek" (opsional di spec, tapi user minta
      dikerjakan langsung, tidak ditunda)**: scan ULANG resi yang sudah
      ada di manifest **INI** (beda dari sudah ada di manifest LAIN yang
      tetap dianggap gagal) ditandai "sudah dicek" — state lokal browser
      murni (`useState<Set>`), **TIDAK ADA kolom/tabel DB**, reset saat
      reload. Bisa juga dicentang manual lewat checkbox di list "Kiriman"
      `/dashboard/manifest/[id]`. Sengaja dangkal, tanpa jejak
      siapa-kapan.
    - **Manifest aktif di `/tugas` ditentukan OTOMATIS** (KT #3 spec 08,
      dijawab 19 Jul 2026) — asumsi satu sopir/kurir = satu trip aktif
      per hari (`manifest.sopir_id = auth.uid()`, status draft/berangkat,
      `tanggal_berangkat` = hari ini). Lebih dari satu match (di luar
      asumsi) → ambil yang paling baru dibuat, tidak ada UI pilih manual.
      Tidak ada manifest aktif → tombol tetap tampil tapi disabled dengan
      pesan jelas.
    - Scanner USB/hardware sengaja tidak didukung khusus — scanner fisik
      yang mengetik+Enter otomatis jalan lewat search box manual existing.
14. **Riwayat Transit Multi-Hub — ✅ SELESAI (19 Jul 2026)**: spec
    terpisah `docs/spec/archive/09-transit-hub.md` (sudah diarsipkan).
    Log transit **TERPISAH TOTAL dari milestone** — murni informatif,
    TIDAK PERNAH mengubah `pengiriman.milestone` atau CHECK constraint-
    nya. Milestone (spec 01) dan transit (spec 09) sengaja dua sistem
    paralel, bukan digabung.
    - Tabel baru `pengiriman_transit` (`tipe_event` tiba/berangkat, FK
      `pengiriman_id` **ON DELETE CASCADE** — beda dari `manifest_biaya`/
      `klaim` yang `NO ACTION`, karena log operasional melekat ke siklus
      hidup kiriman bukan catatan finansial independen). Reuse tabel
      `cabang` sebagai hub, tidak ada entitas hub terpisah, tidak ada
      kolom pembeda `cabang.tipe` (jumlah cabang masih sedikit).
    - View publik baru `pengiriman_transit_publik` — HANYA expose
      `hub_kota`, tidak pernah nama cabang/alamat. View lama
      `pengiriman_riwayat_publik` **tidak disentuh sama sekali**.
    - Section "Riwayat Transit" baru di `/dashboard/pengiriman/[id]`
      (daftar event + form tambah manual, role sama dengan akses transisi
      milestone `dikirim`: superadmin/gudang/kurir/sopir, cs read-only).
    - Integrasi manifest Berangkat: SETELAH bulk-update milestone Fase 3
      (fungsi itu sendiri tidak diubah), insert otomatis event
      "berangkat" untuk SETIAP kiriman dalam manifest — HANYA kalau
      `manifest.cabang_id` terisi. `cabang_id` NULL → dilewati total,
      dibuktikan via simulasi SQL dalam transaksi yang di-ROLLBACK (nol
      perubahan perilaku ke manifest lama yang belum pernah diisi cabang).
    - Timeline publik `/resi/[nomor]`: gabungan `pengiriman_riwayat_
      publik` + `pengiriman_transit_publik`, digabung & diurutkan
      `created_at` di level APLIKASI (dua query + `.sort()` JS, BUKAN
      `UNION` di database — nol risiko regresi ke view lama).
    - **Keputusan sadar v1**: tidak ada validasi urutan tiba/berangkat,
      tidak ada perencanaan rute di muka, tidak ada transisi status
      manifest baru untuk "tiba di hub" (event tiba selalu input manual
      staf hub penerima) — ketiganya bisa diperluas nanti kalau terbukti
      dibutuhkan, bukan dikerjakan sekarang.
15. **Fase 15 — Self-service booking — ✅ SELESAI bagian 1 (20 Jul 2026)**:
    spec terpisah `docs/spec/10-booking-mandiri.md` (sudah diarsipkan).
    Aslinya menggabung self-service booking + notifikasi WA otomatis —
    **notifikasi WA DIKELUARKAN dari scope** (keputusan sesi ini), butuh
    provider WA Business API pihak ketiga berbayar yang belum dipilih,
    jadi menyusul sebagai fase terpisah setelah provider ditentukan
    (tetap di roadmap `CLAUDE.md` bagian "Prioritas Rendah").
    - **Keputusan arsitektur terbesar**: akun customer booking mandiri
      **100% terpisah dari Supabase Auth** (`auth.users`) — hampir semua
      RLS tabel dashboard mengasumsikan "punya sesi Supabase Auth = staf
      terpercaya" (banyak tabel masih `auth.uid() IS NOT NULL` tanpa role
      gate), jadi kalau customer login lewat mekanisme sama mereka
      otomatis lolos semua policy longgar itu. Sebagai gantinya: kolom
      `customer.email`/`password_hash` (bukan tabel baru) + JWT sendiri
      (`jose`, cookie `booking_session`) yang diterbitkan/diverifikasi
      lewat API route service-role (`app/api/booking-auth/*`) — RLS
      existing TIDAK PERLU disentuh sama sekali karena customer tidak
      pernah punya sesi Supabase Auth. `middleware.ts` sengaja TIDAK
      mendaftarkan `/booking` (proteksinya murni client-side, benteng
      sesungguhnya di tiap API route).
    - Tabel baru `booking_request` (draft order customer, WAJIB
      dikonfirmasi staf sebelum jadi `pengiriman` sungguhan — bukan
      milestone baru, biar tidak merembet ke manifest/laporan/RLS. Pola
      sama alasan `pengiriman_transit` dipisah dari milestone di spec 09).
      API baru `app/api/booking/submit` & `app/api/booking/riwayat` —
      identitas customer SELALU dari JWT terverifikasi, tidak pernah dari
      body/query; `pengirim_*` juga diambil server-side dari tabel
      `customer`, bukan dipercaya dari body (form booking memang sengaja
      tidak membuat field itu editable).
    - **Keamanan endpoint publik** (register/login): rate limit per-IP/
      per-email PLUS backstop global topology-independent — ditambahkan
      di tengah eksekusi setelah dikonfirmasi deployment TIDAK ADA
      reverse proxy di depan app (jadi `X-Forwarded-For` sepenuhnya bisa
      dipalsu client, dibuktikan lewat tes manual bahwa limit per-IP saja
      trivial dilewati). Plus honeypot field register, bcrypt cost 12,
      pesan error login generik (tidak bedakan email tak terdaftar vs
      password salah, `bcrypt.compare` tetap jalan penuh thd hash dummy
      utk cegah timing side-channel).
    - `lib/tarifAksi.ts` (`lookupTarifOngkir()`) **diekstrak** dari form
      staf `/dashboard/pengiriman` (regresi check dibuktikan: 0 perubahan
      perilaku form staf) — dipakai ulang di form booking customer
      (estimasi ongkir, kargo selalu manual) DAN modal konfirmasi staf
      `/dashboard/booking` (live recalculate, prefill dari
      `ongkir_estimasi`).
    - Halaman baru `/booking/*` (customer: register/login/riwayat/form
      baru/profil, TANPA Sidebar, mobile-first pola sama `/tugas`) dan
      `/dashboard/booking` (staf: `superadmin`/`cs`/`kasir`/`keuangan`,
      konfirmasi reuse `insertPengirimanWithResi()` yang sudah ada — bukan
      jalur insert baru — atau tolak dengan alasan wajib). Sidebar: nav
      "Booking Masuk" dengan badge jumlah pending. 2 aksi `aktivitas_log`
      baru: `konfirmasi_booking`/`tolak_booking`.
    - **Gap ditemukan saat verifikasi end-to-end** (login sungguhan
      sebagai tiap role staf, bukan cuma dugaan) **— sudah DIPERBAIKI di
      sesi yang sama (20 Jul 2026)**: role `cs` bisa konfirmasi booking
      tapi awalnya TIDAK masuk RLS INSERT `pengiriman_pembayaran`
      (`superadmin`/`kasir`/`keuangan` saja sejak hardening spec 05) —
      insert riwayat pembayaran ditolak RLS secara senyap untuk booking
      dgn pembayaran awal. Gap pre-existing yang sama persis terjadi kalau
      `cs` bikin pengiriman `lunas` langsung dari form staf biasa, bukan
      spesifik fitur ini. **Fix**: migration
      `20260720300000_fix_cs_pengiriman_pembayaran.sql` menambah `cs` ke
      policy INSERT `pengiriman_pembayaran` — DELETE/rollback sengaja
      TIDAK diikutkan (aksi koreksi lebih sensitif, tetap
      `superadmin`/`kasir`/`keuangan` saja). Diverifikasi ulang dengan
      sesi RLS sungguhan: `cs` sekarang bisa INSERT, DELETE masih ditolak
      (dibuktikan lewat query row-count admin, bukan cuma cek ada/tidaknya
      error — `.delete()` Supabase tidak error kalau RLS memfilter 0
      baris, sempat bikin tes pertama salah simpul).
    - **Registrasi TIDAK PERNAH mencocokkan/merge ke `customer` lama** —
      selalu insert baris baru, konsisten keputusan Fase 8 (pencocokan
      otomatis rawan duplikat kotor). **Tidak ada reset password mandiri**
      di v1 (belum ada infrastruktur email/WA terverifikasi). **Tidak ada
      pembatalan booking oleh customer** setelah submit.
    Spec: `docs/spec/10-booking-mandiri.md` (diarsipkan ke
    `docs/spec/archive/`)
16. **Pembersihan — ✅ SELESAI (20 Jul 2026)**: langkah terakhir pivot,
    hapus modul & tabel furniture yang sudah dipastikan tidak dipakai
    (§3.2). Dikerjakan lewat 3 putaran diskusi terkonfirmasi: (1) hapus
    kode + DROP tabel database (bukan cuma sembunyikan), (2) pg_dump
    backup dulu sebelum DROP apapun, (3) prinsip pemilahan "hilangkan
    yang betul-betul tidak digunakan" — bukan penghapusan membabi buta,
    bukan juga mempertahankan berlebihan.
    - **Investigasi sebelum eksekusi** (bukan asumsi): grep referensi
      kode ke tiap tabel/halaman kandidat + query FK graph penuh
      (`information_schema`) buat pastikan tidak ada tabel yang mau
      di-DROP masih py inbound FK dari tabel yang dipertahankan.
      Ditemukan 2 kejutan signifikan yang mengubah rencana awal: (a)
      `sopir_devices`/`tracking_sopir` terlihat furniture tapi ternyata
      infrastruktur aktif "Lacak GPS Sopir" — TIDAK disentuh; (b)
      `/dashboard/penjualan` & `/dashboard/pos` bukan viewer arsip pasif
      seperti diasumsikan — masih py fitur create/edit penuh (buat dari
      PO, foto produk, restore stok), jadi mempertahankan keduanya
      ternyata butuh 11 tabel furniture inti, bukan cuma `penjualan` itu
      sendiri sebagaimana disangka semula.
    - **Backup**: `docs/backup/furniture-pembersihan-20260720.sql`
      (pg_dump schema+data 14 tabel yang di-DROP), diverifikasi baris demi
      baris cocok persis dengan isi tabel asli sebelum migration
      dijalankan (bukan cuma cek file tidak kosong).
    - **DROP 14 tabel** (migration
      `supabase/migrations/20260720310000_pembersihan_furniture.sql`,
      urutan child-dulu tanpa CASCADE — biar gagal keras kalau ada
      dependency yang kelewat, bukan cascade diam-diam): seluruh modul
      HPP Produksi (`bahan_baku`, `batch_pemakaian_bahan`,
      `batch_produksi`, `bom`, `mutasi_bahan_baku`,
      `pembelian_bahan_baku`, `pembelian_bahan_baku_item`), chat widget
      (`chat_ai_messages`, `chat_ai_sessions`), `pelanggan_crm`,
      `pengumuman`, `po_progress`, `target_penjualan`, `pengiriman_foto`
      (0 baris — nama mirip `pengiriman` tapi FK-nya ke `penjualan`,
      sisa furniture yang genuinely mati, zero referensi kode).
    - **KEEP 11 tabel** (lihat §3.2 untuk daftar lengkap + alasan) —
      `/dashboard/penjualan`, `/dashboard/pos`, "Kritik & Saran",
      "Laporan Wilayah", sebagian "Meja Kerja Owner" nol regresi, kode
      ketiganya TIDAK disentuh sama sekali.
    - **Kode dihapus**: ~20 halaman/direktori (`app/dashboard/{produk,
      gudang,reseller,pengumuman,pelanggan,po,target,pencocokan,
      stock-aging,hpp/*,owner/asisten}`, `app/dashboard/laporan/{produk,
      tukang,reseller,page.tsx}`, `app/{katalog,toko,etalase,produk,
      landing,r}`), 4 API route (`chat`, `reseller-portal`, `resi-review`
      — dikonfirmasi ZERO caller, sudah mati sejak `/resi/[nomor]`
      dialihkan, `verify-kode`), 2 komponen (`ChatWidget`,
      `CatalogToolbar`). `lib/utils.ts`: hapus 2 export furniture-only
      (`BONUS_KOREKSI_TABLE`, `cariKoreksiOtomatis`) — sisanya (termasuk
      `insertPenjualanWithResi` yang masih dipakai Penjualan/POS) tidak
      disentuh. `lib/types.ts`: **nol perubahan** (5 interface furniture
      masih dipakai halaman yang dipertahankan).
    - **`components/Sidebar.tsx`**: array `resellerItems`/`kontrolItems`/
      `hppItems` dihapus TOTAL (bukan cuma di-comment lagi) karena akan
      permanen kosong selamanya — state/JSX pendukungnya (toggle
      collapsible, computed active-flag) ikut dihapus. `penjualanItems` &
      entri "Meja Kerja Owner" di `ownerItems` TIDAK disentuh (masih
      merujuk halaman yang dipertahankan). 14 import ikon lucide-react
      yang jadi genuinely tidak terpakai ikut dibersihkan.
    - **Storage bucket `BungaNaik` sengaja TIDAK disentuh** — bercampur
      furniture & expedisi, ratusan folder ber-nama UUID yang tidak bisa
      diklasifikasi tanpa cross-reference mendalam per baris DB, risiko
      salah hapus lebih besar dari manfaatnya. Folder `po-progress/`
      (4 file) jadi orphaned tapi filenya tidak dihapus.
    - **Verifikasi**: `tsc --noEmit` bersih (termasuk setelah clear cache
      `.next` yang sempat menampilkan error basi dari route yang sudah
      dihapus), grep nol sisa referensi ke 14 tabel yang di-DROP di
      seluruh `app/`/`lib/`/`components/`, smoke-test semua halaman aktif
      (termasuk yang dipertahankan) render normal tanpa crash.
    - **Temuan sampingan di luar scope** (dicatat, tidak diperbaiki):
      dokumentasi lama CLAUDE.md menyebut "Log Aktivitas" render terpisah
      di Sidebar, ternyata TIDAK ADA link sidebar untuk
      `/dashboard/aktivitas` sama sekali di kode saat ini — bukan
      furniture, jadi tidak diperbaiki sesi ini, cuma dicatat supaya
      tidak jadi asumsi keliru lagi.

---

## 8. Open Questions

- [x] Model bisnis kurir/paket vs kargo/pindahan? → **Campuran**, ditandai
  field `jenis_layanan` (reguler/express = tarif otomatis nanti di Fase 2,
  kargo = manual quote)
- [x] Ada berapa titik pickup/drop-off / cabang saat ini? → **Dinamis**,
  jumlah cabang tidak di-hardcode — superadmin bisa tambah/kurangi kapan
  saja (mulai dari 1). Relevan untuk Fase 5, ta
  bel `cabang` perlu CRUD
  sendiri (bukan cuma seed baris tetap).
- [x] Cabang jadi isolasi data atau cuma label? → **Cuma label/filter**,
  tidak ada pembatasan akses staf per cabang — semua staf tetap bisa lihat
  semua data seperti sekarang. `cabang_id` hanya dipakai untuk filter
  laporan & penugasan armada.
- [x] Siapa yang CRUD daftar cabang? → **Superadmin only**, konsisten
  dengan pola halaman admin lain (Tarif Zona, Pengguna).
- [x] Apakah COD jadi metode pembayaran utama, atau mayoritas transfer? →
  **Transfer/cash lebih dominan**, COD tetap ada tapi bukan mayoritas —
  modul rekonsiliasi COD di Fase 4 tidak perlu dirancang seberat kalau COD
  jadi metode utama (cukup pencatatan saldo titipan + setoran, tanpa
  reminder/dashboard rekonsiliasi harian yang rumit).
- [ ] Target role staf: berapa banyak sopir/kurir aktif saat ini?
- [ ] Nama & branding final — tetap "BungaNaik" sebagai nama internal
  sistem, atau rebrand penuh (termasuk di UI, invoice, dst)?
