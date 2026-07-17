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

### 3.2 Di-deprecate (sudah di-comment di sidebar, tabel masih ada di DB)

Produk & Stok, Meja Kerja Gudang, Kasir (POS), Reseller + Pengumuman +
Tier + Top Reseller, Pelanggan (grouped by reseller), Purchase Order,
Target Penjualan, Pencocokan Nota, Laporan Produk, Usia Barang,
Laporan Tukang, seluruh modul **HPP Produksi** (bahan baku, pembelian BB,
BOM, batch produksi, laporan HPP), katalog publik (`/katalog`, `/toko`,
`/etalase`, `/produk/[id]`), landing page marketing furniture.

> Belum dihapus dari database/kode — masih bisa dipakai referensi pola
> (CRUD, modal, RLS) saat membangun modul baru. Hapus permanen setelah
> pivot data model selesai dan dikonfirmasi tidak dibutuhkan lagi.

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
5. **Fase 5 — Cabang/Agen**: 2 hub tetap bisa jadi cabang dinamis dan bisa bertambah,
   **operasional penuh** — tiap hub punya staf, armada, dan pengiriman
   sendiri, jadi perlu kolom `cabang_id` di `pengiriman`/`manifest`/`armada`/
   `profiles` (bukan sekadar field referensi ringan).
6. **Fase 6 — Self-service booking + notifikasi WA otomatis**.
7. **Pembersihan**: hapus modul & tabel furniture yang sudah dipastikan
   tidak dipakai (§3.2).

---

## 8. Open Questions

- [x] Model bisnis kurir/paket vs kargo/pindahan? → **Campuran**, ditandai
  field `jenis_layanan` (reguler/express = tarif otomatis nanti di Fase 2,
  kargo = manual quote)
- [x] Ada berapa titik pickup/drop-off / cabang saat ini? → **2 hub**,
  dibuat dulu dengan jumlah tetap 2 (bukan jaringan cabang dinamis besar).
  Relevan untuk Fase 5.
- [x] Apakah COD jadi metode pembayaran utama, atau mayoritas transfer? →
  **Transfer/cash lebih dominan**, COD tetap ada tapi bukan mayoritas —
  modul rekonsiliasi COD di Fase 4 tidak perlu dirancang seberat kalau COD
  jadi metode utama (cukup pencatatan saldo titipan + setoran, tanpa
  reminder/dashboard rekonsiliasi harian yang rumit).
- [ ] Target role staf: berapa banyak sopir/kurir aktif saat ini?
- [ ] Nama & branding final — tetap "BungaNaik" sebagai nama internal
  sistem, atau rebrand penuh (termasuk di UI, invoice, dst)?
