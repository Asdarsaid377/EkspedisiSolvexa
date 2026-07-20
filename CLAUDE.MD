# CLAUDE.md — ExpedisiBunganaik (Sistem Manajemen Expedisi)

## Project Overview

**ExpedisiBunganaik** adalah sistem manajemen operasional perusahaan expedisi/logistik
berbasis web — terima order kiriman, hitung tarif, susun manifest/rute, lacak status
kiriman sampai selesai (termasuk gagal kirim & retur), dan kelola keuangan terkait (COD,
klaim). Proyek ini adalah hasil pivot dari **BungaNaik** (sistem stok & penjualan
furniture) — riwayat pivot lengkap ada di `expedisi.md`. Modul furniture sudah dihapus
total dari kode & database (Fase 16-17, lihat Roadmap) — tidak ada lagi tabel/halaman
furniture di codebase ini.

Dibangun dengan **Next.js 14 (App Router) + Supabase (PostgreSQL + Auth + Storage)**.

---

## Tech Stack

| Layer      | Teknologi                                                                         |
| ---------- | --------------------------------------------------------------------------------- |
| Frontend   | Next.js 14 App Router, TypeScript, Tailwind CSS                                   |
| Backend/DB | Supabase (PostgreSQL, Auth, RLS, Storage)                                         |
| Auth       | Supabase Auth + SSR (`@supabase/ssr`)                                             |
| Charts     | Recharts                                                                          |
| Icons      | Lucide React                                                                      |
| QR Code    | `qrcode.react` (`QRCodeCanvas`, generate) + `@zxing/browser` (scan kamera, `/dashboard/manifest/[id]` & `/tugas`) |
| Face ID    | `face-api.js` (deteksi & descriptor wajah client-side, model di `/public/models`) |
| Dev Server | Next.js dengan Turbopack (`next dev --turbo`)                                     |

---

## Project Structure

```
/
├── app/
│   ├── layout.tsx
│   ├── page.tsx                        # Redirect ke /dashboard
│   ├── login/page.tsx
│   ├── cek-resi/page.tsx               # Form publik cari nomor resi → redirect /resi/[nomor]
│   ├── resi/
│   │   └── [nomor]/page.tsx           # Tracking pengiriman publik — milestone, gagal/retur, foto, riwayat
│   ├── tugas/                          # Mobile-first, khusus sopir/kurir — TANPA Sidebar
│   │   ├── layout.tsx                 # Auth boundary terpisah dari /dashboard (role sopir/kurir only)
│   │   └── page.tsx                   # Daftar tugas aktif + tab "Selesai Hari Ini" (lib/pengirimanAksi.ts) + tombol "Scan untuk Muat" (manifest aktif hari ini, ScanQRManifestOverlay)
│   ├── booking/                        # Mobile-first, customer booking mandiri — TANPA Sidebar (spec 10)
│   │   ├── layout.tsx                 # Auth boundary TERPISAH TOTAL dari Supabase Auth — cek /api/booking-auth/me
│   │   ├── login/page.tsx
│   │   ├── register/page.tsx          # Honeypot field (§4.1) disembunyikan via CSS
│   │   ├── page.tsx                   # Riwayat booking_request + pengiriman milik customer
│   │   ├── baru/page.tsx              # Form booking baru — field pengirim TIDAK editable (snapshot dari akun)
│   │   └── profil/page.tsx            # Edit nama/telepon/alamat/kota sendiri
│   ├── dashboard/
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   ├── pengiriman/
│   │   │   ├── page.tsx               # List + create pengiriman — kartu ringkasan milestone, filter, export
│   │   │   └── [id]/page.tsx          # Detail — milestone bercabang, POD, pelunasan, rollback, delete
│   │   ├── tarif-zona/page.tsx         # Pricing engine reguler/express (superadmin only)
│   │   ├── armada/page.tsx             # CRUD kendaraan (superadmin + gudang)
│   │   ├── manifest/
│   │   │   ├── page.tsx               # List manifest + create
│   │   │   └── [id]/page.tsx          # Detail — assign kiriman (search manual + scan QR via ScanQRManifestOverlay), Berangkat/Selesai/Batalkan
│   │   ├── cod/page.tsx                # Setoran COD per sopir/kurir
│   │   ├── klaim/page.tsx              # Lapor & proses klaim barang hilang/rusak
│   │   ├── booking/page.tsx            # Review booking mandiri — konfirmasi (jadi pengiriman) / tolak (spec 10)
│   │   ├── customer/page.tsx           # CRUD master pengirim & piutang
│   │   ├── piutang/page.tsx            # Aging piutang + pelunasan massal + cetak rekap
│   │   ├── cabang/page.tsx             # CRUD cabang (superadmin only, label/filter)
│   │   ├── aktivitas/page.tsx          # Log Aktivitas read-only (superadmin + keuangan)
│   │   ├── lacak-pengiriman/page.tsx   # Lacak GPS sopir
│   │   ├── absensi/page.tsx            # Absensi wajah + geofencing
│   │   ├── laporan/
│   │   │   ├── sopir/page.tsx          # Laporan Petugas
│   │   │   ├── keterlambatan/page.tsx
│   │   │   └── laba-trip/page.tsx
│   │   ├── keuangan/
│   │   │   ├── laporan/page.tsx       # Pemasukan/Beban/Neto expedisi (cash basis), tren 12 bln, biaya per armada
│   │   │   └── pengeluaran/page.tsx   # Kategori expedisi (gaji/sewa/maintenance_armada/dst), superadmin+keuangan
│   │   └── pengguna/page.tsx
│   └── api/
│       ├── create-user/route.ts
│       ├── booking-auth/               # register/login/logout/me/profil — service role, JWT booking_session (spec 10 §2)
│       └── booking/                    # submit/riwayat — customer_id SELALU dari JWT, tidak pernah dari body (§4.1)
├── components/
│   ├── Sidebar.tsx                     # NavLink & SubNavLink di luar komponen (no unmount/remount)
│   └── ScanQRManifestOverlay.tsx       # Overlay kamera scan QR — dipakai BERSAMA /dashboard/manifest/[id] & /tugas
├── contexts/
│   ├── AuthContext.tsx                 # onAuthStateChange only, singleton client, skip TOKEN_REFRESHED (staf)
│   └── BookingAuthContext.tsx          # fetch /api/booking-auth/me, TIDAK terkait Supabase Auth (customer)
├── lib/
│   ├── supabase/client.ts             # Singleton createClient() — satu instance per tab
│   ├── supabase/server.ts
│   ├── supabase/middleware.ts
│   ├── types.ts
│   ├── roles.ts                        # Satu sumber kebenaran daftar role (ROLES, Role, ROLE_LABELS, TUGAS_ROLES)
│   ├── pengirimanConstants.ts          # TRANSISI_MILESTONE, getNextMilestones(), ALASAN_GAGAL_CFG
│   ├── pengirimanAksi.ts               # submitSelesaiPOD()/submitGagalKirim() — dipakai BERSAMA /tugas & /dashboard/pengiriman/[id]
│   ├── manifestAksi.ts                 # findEligibleCandidates()/scanLookupManifest()/addManifestItem() — dipakai BERSAMA /dashboard/manifest/[id] & /tugas
│   ├── tarifAksi.ts                    # lookupTarifOngkir()/hitungBeratEfektif() — dipakai BERSAMA /dashboard/pengiriman & /dashboard/booking (modal konfirmasi)
│   ├── bookingAuth.ts                  # signBookingSession()/verifyBookingSession()/getBookingCustomerId() — JWT (jose), TERPISAH dari Supabase Auth
│   ├── bookingRateLimit.ts             # Rate limit in-memory endpoint booking-auth (per-IP/per-email + backstop global)
│   ├── aktivitas.ts                    # logAktivitas() — audit trail aksi sensitif, lihat §RLS
│   ├── printPengirimanInvoice.ts / printPengirimanResi.ts / printTagihanCustomer.ts
│   └── utils.ts                        # formatRupiah, formatDate, waLink(), generateNomorResi(), insertPengirimanWithResi()
├── middleware.ts                       # Proteksi /dashboard & /tugas — /resi & /booking bebas (booking auth-nya sendiri, lihat §Auth & Role)
└── supabase/migrations/                # Migration ter-versi (Fase 1-5 + spec-driven, lihat expedisi.md §7)
```

---

## Database Schema

### Tabel Utama

#### `profiles`

```sql
id UUID (FK -> auth.users)
name TEXT
role TEXT CHECK ('superadmin' | 'kasir' | 'keuangan' | 'cs' | 'gudang' | 'kurir' | 'sopir')
created_at TIMESTAMPTZ
```

#### `owner_settings`

Key-value store konfigurasi. Sejak Fase 17 (20 Jul 2026) HANYA menyimpan konfigurasi
absensi — key siklus audit/stock-opname (fitur Owner Workspace furniture) sudah dihapus.

```sql
key TEXT PRIMARY KEY
value TEXT NOT NULL
updated_by UUID FK -> profiles
updated_at TIMESTAMPTZ DEFAULT NOW()
```

**Keys yang digunakan:**

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

### Entitas Expedisi

#### `pengiriman`

```sql
id                    UUID PRIMARY KEY DEFAULT gen_random_uuid()
nomor_faktur          TEXT UNIQUE NOT NULL     -- trigger, prefix PGM-YYYYMMDD-XXXX
nomor_resi            TEXT UNIQUE              -- trigger, format BNG-XXXXXXXX
tanggal               TIMESTAMPTZ DEFAULT NOW()
jenis_layanan         TEXT CHECK ('reguler'|'express'|'kargo') DEFAULT 'reguler'
pengirim_nama         TEXT NOT NULL
pengirim_telepon      TEXT
pengirim_alamat       TEXT
pengirim_kota         TEXT
penerima_nama         TEXT NOT NULL
penerima_telepon      TEXT
penerima_alamat       TEXT
penerima_kota         TEXT
berat_kg              NUMERIC(10,2) NOT NULL DEFAULT 0
panjang_cm            NUMERIC(10,2)
lebar_cm              NUMERIC(10,2)
tinggi_cm             NUMERIC(10,2)
berat_volumetrik_kg   NUMERIC(10,2) GENERATED ALWAYS AS (panjang*lebar*tinggi/6000) STORED
isi_barang            TEXT
nilai_barang          NUMERIC(15,2) DEFAULT 0   -- dasar klaim/asuransi
ongkir                NUMERIC(15,2) DEFAULT 0
biaya_asuransi        NUMERIC(15,2) DEFAULT 0
total_tagihan         NUMERIC(15,2) DEFAULT 0
status_bayar          TEXT CHECK ('lunas'|'dp'|'belum_bayar') DEFAULT 'belum_bayar'
metode_bayar          TEXT CHECK ('transfer'|'cod'|'cash') DEFAULT 'transfer'
uang_dp               NUMERIC(15,2) DEFAULT 0
milestone             TEXT CHECK ('diproses'|'dijemput'|'dikirim'|'gagal_kirim'|'retur'|'selesai') DEFAULT 'diproses'
jumlah_gagal          INTEGER DEFAULT 0   -- counter, +1 tiap transisi ke gagal_kirim (app-level, bukan trigger)
pod_penerima_nama     TEXT    -- nama penerima AKTUAL (bisa beda dari penerima_nama), wajib diisi UI saat selesai
pod_foto_url          TEXT    -- foto bukti serah terima, wajib diisi UI saat selesai
petugas_id            UUID FK -> profiles   -- nullable, role sopir/kurir (lihat §Petugas & Keterlambatan)
petugas_nama          TEXT    -- snapshot nama (dari profiles.name kalau petugas_id ada, atau teks bebas kalau "Lainnya")
petugas_telepon       TEXT
estimasi_hari         INTEGER -- SNAPSHOT dari tarif_zona saat kiriman dibuat, NULL utk kargo/rute tanpa tarif
catatan               TEXT
catatan_internal       TEXT
customer_id           UUID FK -> customer   -- nullable, lihat §`customer`
cabang_id             UUID FK -> cabang     -- nullable, label/filter saja
created_by            UUID FK -> profiles
created_at, updated_at TIMESTAMPTZ
```

**Peta transisi milestone** (bercabang sejak fitur Gagal Kirim/Retur/POD):

```
diproses    → dijemput
dijemput    → dikirim
dikirim     → selesai | gagal_kirim
gagal_kirim → dikirim (kirim ulang) | retur
retur       → (terminal)
selesai     → (terminal, WAJIB POD — lihat §Business Logic)
```

Role per transisi:

- `superadmin`: semua transisi
- `gudang` / `kurir`: `diproses → dijemput`
- `gudang` / `kurir` / `keuangan` / `sopir` / `kasir`: `dijemput → dikirim`
- `sopir` / `kurir` / `kasir` / `keuangan`: `dikirim → gagal_kirim`
- `sopir` / `kurir` / `keuangan` / `kasir`: `dikirim → selesai` (dengan POD)
- `gudang` / `kurir` / `sopir`: `gagal_kirim → dikirim` (kirim ulang manual,
  juga role bulk manifest yang sama utk aksi Berangkat)
- `cs` / `gudang`: `gagal_kirim → retur`

`pengiriman_tracking` — satu baris per event milestone, kolom `alasan_gagal`
(nullable, CHECK 5 pilihan: `penerima_tidak_ada`/`alamat_salah`/
`tidak_bisa_dihubungi`/`ditolak_penerima`/`lainnya`) diisi hanya untuk baris
`milestone = 'gagal_kirim'` — label internal & label ramah publik ada di
`lib/pengirimanConstants.ts` (`ALASAN_GAGAL_CFG`). `pengiriman_pembayaran`
adalah riwayat termin pembayaran (lihat §Metode Pembayaran).

`insertPengirimanWithResi()` di `lib/utils.ts` — retry-on-collision 5x,
reuse `generateNomorResi()` (table-agnostic).

#### Petugas FK & Definisi Terlambat

- `petugas_id` FK nullable ke `profiles` (role `sopir`/`kurir`) — form
  `/dashboard/pengiriman` dropdown staf + opsi "Lainnya / Ketik Manual"
  (fallback teks bebas, `petugas_id` tetap `NULL`) — `petugas_telepon`
  selalu manual/opsional, tidak pernah di-autofill.
- **Definisi terlambat** (`lib/pengirimanConstants.ts`: `getStatusKeterlambatan()`,
  `hitungSelisihHari()`, `hitungBatasEstimasi()`):
  ```
  batas    = DATE(tanggal) + estimasi_hari (hari kalender)
  selesai  → terlambat jika DATE(waktu tracking milestone 'selesai') > batas
  aktif    → terlambat jika CURRENT_DATE > batas dan milestone belum selesai/retur
  estimasi_hari NULL, atau milestone retur → "tidak_berlaku" (dikecualikan,
    bukan dihitung on-time)
  ```
  Waktu selesai diambil dari `pengiriman_tracking.created_at` baris
  milestone `selesai` paling awal. On-time rate = selesai tepat waktu /
  (selesai tepat waktu + selesai terlambat) — HANYA baris yang punya
  `estimasi_hari`, kiriman aktif yang belum lewat batas ("dalam_proses")
  tidak masuk pembilang/penyebut.
- Estimasi COD (`/dashboard/cod`): matching diutamakan `petugas_id`, fallback
  pencocokan nama HANYA untuk baris `petugas_id IS NULL` — lihat §Business
  Logic bagian COD & Klaim untuk detail lengkap.

#### `customer` — Master Pengirim & Piutang

```sql
id            UUID PRIMARY KEY DEFAULT gen_random_uuid()
nama          TEXT NOT NULL          -- TIDAK unique — dedup dijaga di UI, bukan constraint
tipe          TEXT CHECK ('umum'|'korporat') DEFAULT 'umum'
telepon       TEXT
alamat        TEXT
kota          TEXT
pic_nama      TEXT                   -- kontak person, relevan utk korporat
pic_telepon   TEXT
term_hari     INTEGER DEFAULT 0      -- tempo pembayaran; 0 = tunai/langsung
catatan       TEXT
aktif         BOOLEAN DEFAULT true
email         TEXT                   -- nullable, akun booking mandiri (spec 10)
password_hash TEXT                   -- bcrypt, HANYA diverifikasi lewat app/api/booking-auth/*
created_by    UUID FK -> profiles
created_at, updated_at TIMESTAMPTZ
UNIQUE (LOWER(email)) WHERE email IS NOT NULL  -- partial index, customer lama tanpa akun tetap NULL
```

> `email`/`password_hash` **BUKAN** mekanisme Supabase Auth apa pun —
> murni kolom data biasa, diverifikasi manual di API route service-role.
> Lihat §Auth & Role "Auth Customer — Booking Mandiri" untuk rasional
> lengkap kenapa ini harus 100% terpisah dari `auth.users`. RLS
> `auth_all_customer` yang sudah ada TIDAK diubah — dua kolom ini tetap
> staff-only dari sisi client Supabase biasa, akses customer sendiri
> HANYA lewat `app/api/booking-auth/*` (service role).

`pengiriman.customer_id` — FK nullable ke `customer.id` (default NO ACTION,
customer yang masih direferensikan tidak bisa dihapus — nonaktifkan saja).
Kolom `pengirim_*` (nama/telepon/alamat/kota) **TETAP ADA** sebagai snapshot
per kiriman — walk-in (tanpa customer terdaftar) tetap murni teks bebas
seperti sebelumnya, dan bahkan kiriman dengan `customer_id` terisi tetap
menyimpan snapshot-nya sendiri (bisa beda dari master, mis. jemput dari
gudang lain) — master `customer` tidak pernah ikut berubah saat snapshot
di-edit per kiriman. RLS `auth_all_customer` (staff-only, **tidak ada akses
anon** — views publik tidak pernah mengekspos data customer).

**TIDAK ada backfill otomatis** dari data `pengiriman` lama — pencocokan
`pengirim_nama`+`telepon` otomatis rawan duplikat kotor (typo, nama sama).
Staff membuat customer secara organik saat order berikutnya masuk; kiriman
lama dibiarkan `customer_id` NULL selamanya kalau tidak diisi manual.

**Aging piutang** (`lib/pengirimanConstants.ts`: `getAgingBucket()`,
`hitungJatuhTempo()`):
```
jatuh_tempo = DATE(tanggal) + term_hari   -- term diambil dari master SAAT QUERY,
                                          -- BUKAN snapshot — ubah term_hari customer
                                          -- langsung berlaku ke tagihan berjalan
customer term_hari = 0 / kiriman walk-in (customer_id NULL) → jatuh_tempo = tanggal kirim
Bucket: belum_jatuh_tempo | 1_7_hari | 8_30_hari | lebih_30_hari
```
Basis piutang = semua `pengiriman` dengan `status_bayar != 'lunas'` — kiriman
`retur` **tetap ikut dihitung** (ongkir retur tetap ditagih penuh).

#### `tarif_zona` — pricing engine

```sql
id             UUID PRIMARY KEY DEFAULT gen_random_uuid()
kota_asal      TEXT NOT NULL
kota_tujuan    TEXT NOT NULL
jenis_layanan  TEXT CHECK ('reguler'|'express')   -- kargo TIDAK pakai tabel ini, tetap manual quote
harga_per_kg   NUMERIC(15,2) DEFAULT 0
harga_flat_min NUMERIC(15,2) DEFAULT 0   -- floor/minimum ongkir
estimasi_hari  INTEGER
aktif          BOOLEAN DEFAULT true
created_by     UUID FK -> profiles
created_at, updated_at TIMESTAMPTZ
UNIQUE (LOWER(kota_asal), LOWER(kota_tujuan), jenis_layanan)  -- case-insensitive
```

**Kalkulasi ongkir otomatis** (dipakai di form `/dashboard/pengiriman`, hanya
untuk `jenis_layanan` reguler/express):

```
berat_efektif = MAX(berat_kg, berat_volumetrik_kg)
ongkir        = MAX(harga_per_kg × berat_efektif, harga_flat_min)
```

Lookup pakai `.ilike()` (case-insensitive exact match, bukan wildcard) pada
`kota_asal`/`kota_tujuan` — cocok dengan behavior unique constraint di DB.
Kalau tidak ada tarif untuk pasangan kota tsb, form **tidak diblokir**,
staff isi `ongkir` manual (ada notice di UI). RLS: `auth_all_tarif_zona`
(staff-only) — **tidak ada akses anon**, beda dari view tracking publik,
karena harga per-kg adalah info internal.

CRUD tarif di `/dashboard/tarif-zona` (superadmin only).

#### `armada` / `manifest` / `manifest_item`

```sql
-- armada
id              UUID PRIMARY KEY DEFAULT gen_random_uuid()
plat_nomor      TEXT UNIQUE NOT NULL
jenis_kendaraan TEXT
kapasitas_kg    NUMERIC(10,2)
kapasitas_m3    NUMERIC(10,2)
status          TEXT CHECK ('tersedia'|'maintenance'|'nonaktif') DEFAULT 'tersedia'
sopir_id        UUID FK -> profiles   -- sopir/kurir DEFAULT, opsional, bisa dioverride per manifest
cabang_id       UUID FK -> cabang     -- nullable, label/filter
catatan, aktif, created_at, updated_at

-- manifest
id                UUID PRIMARY KEY DEFAULT gen_random_uuid()
nomor_manifest    TEXT UNIQUE NOT NULL   -- trigger, prefix MNF-YYYYMMDD-XXXX
armada_id         UUID FK -> armada
sopir_id          UUID FK -> profiles   -- petugas TRIP ini, boleh beda dari armada.sopir_id
rute              TEXT
tanggal_berangkat DATE
status            TEXT CHECK ('draft'|'berangkat'|'selesai'|'batal') DEFAULT 'draft'
cabang_id         UUID FK -> cabang     -- nullable, auto-fill dari armada.cabang_id
catatan, created_by, created_at, updated_at

-- manifest_item (junction, banyak pengiriman per manifest)
id             UUID PRIMARY KEY DEFAULT gen_random_uuid()
manifest_id    UUID FK -> manifest (ON DELETE CASCADE)
pengiriman_id  UUID FK -> pengiriman (ON DELETE CASCADE)
urutan         INTEGER DEFAULT 0
UNIQUE (manifest_id, pengiriman_id)
```

RLS: `auth_all_armada`/`auth_all_manifest`/`auth_all_manifest_item` (staff-only,
tidak ada view publik — tidak relevan untuk customer).

**Bulk milestone update dari manifest** (`/dashboard/manifest/[id]`):

- Tombol **Berangkat** (status manifest `draft → berangkat`): update SEMUA
  `pengiriman` dalam manifest yang masih `diproses`/`dijemput`/`gagal_kirim`
  jadi `dikirim`, insert 1 baris `pengiriman_tracking` per item (`catatan:
  "Update massal via manifest {nomor_manifest}"`). Retry kiriman gagal
  lewat manifest TIDAK menambah `jumlah_gagal`. SETELAH bulk-update, kalau
  `manifest.cabang_id` terisi, insert otomatis event transit "berangkat"
  (lihat §Riwayat Transit Multi-Hub).
- Tombol **Tandai Selesai** (`berangkat → selesai`): **TIDAK LAGI**
  bulk-update milestone kiriman (breaking change sejak fitur Gagal
  Kirim/POD — `selesai` wajib POD per-kiriman, mustahil dikumpulkan bulk)
  — cuma mengubah `manifest.status`. Kiriman yang belum di-POD tetap
  `dikirim`, diselesaikan satu-per-satu dari halaman detail.
- Tombol **Batalkan** (`→ batal`): **hanya** ubah `manifest.status` — milestone
  `pengiriman` yang sudah terlanjur ter-update TIDAK otomatis dikembalikan
  (staff perbaiki manual per-kiriman kalau perlu)
- Role gate aksi bulk: `superadmin`, `gudang`, `sopir`, `kurir`. Role gate
  tambah/hapus isi manifest (hanya saat status `draft`): `superadmin`, `gudang`

**Cegah kiriman dobel-manifest**: saat cari kiriman untuk ditambahkan,
kiriman yang sudah ada di manifest LAIN berstatus `draft`/`berangkat`
dikecualikan dari hasil pencarian. Ini dicek di level aplikasi (2 query +
filter client-side), **bukan** constraint DB — jadi kalau ada API/jalur lain
yang insert `manifest_item` langsung, pengecekan ini terlewati.

#### `manifest_biaya` — Biaya Trip & Laba per Manifest

```sql
id           UUID PRIMARY KEY DEFAULT gen_random_uuid()
manifest_id  UUID NOT NULL FK -> manifest   -- default NO ACTION, BUKAN CASCADE (sengaja)
kategori     TEXT CHECK ('uang_jalan'|'bbm'|'tol'|'kuli'|'parkir'|'lainnya') NOT NULL
jumlah       NUMERIC(15,2) NOT NULL CHECK (jumlah > 0)
keterangan   TEXT   -- wajib diisi UI kalau kategori = 'lainnya' (app-level, bukan DB)
foto_bukti   TEXT   -- struk/nota, path: manifest-biaya/{manifest_id}/{timestamp}.{ext}
created_by   UUID FK -> profiles
created_at   TIMESTAMPTZ DEFAULT NOW()
```

**FK `manifest_id` sengaja `NO ACTION` (bukan CASCADE)** — beda dari
`manifest_item` yang cascade ke `pengiriman`. Biaya trip adalah catatan
finansial (uang sudah keluar beneran) yang tidak boleh hilang diam-diam
kalau manifest induknya dihapus — hapus manifest yang masih punya baris
biaya akan **gagal FK**, pesan error mengarahkan hapus/pindahkan biayanya
dulu. **Jangan diubah jadi CASCADE** meski terasa "lebih rapi" — itu
breaking rule yang disengaja.

Tidak ada kolom baru di `manifest`/`manifest_item`/`pengiriman` untuk fitur
ini — Revenue & Laba trip **selalu dihitung saat query** (SUM `ongkir` via
join `manifest_item`→`pengiriman`, SUM `manifest_biaya.jumlah`), tidak ada
snapshot/kolom agregat yang disimpan. RLS `auth_all_manifest_biaya`
(staff-only, tidak ada akses anon — biaya trip tidak pernah publik).

#### `klaim` / `cod_setoran`

```sql
klaim
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid()
  nomor_klaim               TEXT UNIQUE NOT NULL     -- trigger, prefix KLM-YYYYMMDD-0001
  pengiriman_id             UUID REFERENCES pengiriman(id) ON DELETE SET NULL
  pengiriman_nomor_resi     TEXT   -- snapshot saat dibuat, tetap tampil walau pengiriman induk dihapus
  pengiriman_penerima_nama  TEXT   -- snapshot
  tipe                      TEXT CHECK ('hilang'|'rusak')
  status                    TEXT CHECK ('pending'|'disetujui'|'ditolak'|'selesai') DEFAULT 'pending'
  nilai_klaim               NUMERIC(15,2) DEFAULT 0   -- nilai yang diajukan
  nilai_disetujui           NUMERIC(15,2)             -- diisi superadmin saat approve
  kronologi                 TEXT
  catatan_approval          TEXT
  foto_bukti                TEXT
  created_by, approved_by   UUID FK -> profiles
  approved_at               TIMESTAMPTZ
  selesai_at                TIMESTAMPTZ   -- diisi bersama status='selesai' — basis
                                          -- cash-basis Laporan Keuangan, klaim masuk
                                          -- beban di periode SELESAI, bukan periode kejadian
  created_at, updated_at    TIMESTAMPTZ

cod_setoran
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid()
  sopir_id       UUID FK -> profiles (NOT NULL)   -- sopir ATAU kurir yang menyetor
  jumlah         NUMERIC(15,2) NOT NULL
  tanggal_setor  DATE DEFAULT CURRENT_DATE
  catatan        TEXT
  foto_bukti     TEXT
  created_by     UUID FK -> profiles
  created_at     TIMESTAMPTZ
```

> **`klaim.pengiriman_id` pakai `ON DELETE SET NULL`, BUKAN CASCADE** — beda
> dari `pengiriman_tracking`/`pengiriman_pembayaran` yang cascade. Klaim
> adalah catatan finansial yang tidak boleh hilang diam-diam kalau ada yang
> menghapus pengiriman terkait. Karena itu `pengiriman_nomor_resi`
> dan `pengiriman_penerima_nama` di-snapshot ke baris `klaim` saat dibuat.
>
> **`cod_setoran` sengaja tanpa nomor dokumen formal** (beda dari
> `klaim`/`manifest`/`pengiriman` yang punya nomor trigger) — cukup ledger
> sederhana per sopir/kurir, karena COD bukan metode pembayaran mayoritas
> di bisnis ini (transfer/cash lebih dominan). "Estimasi COD Terkumpul" yang
> ditampilkan di `/dashboard/cod` dihitung dengan mencocokkan
> `pengiriman.petugas_nama` (TEXT bebas, bukan FK) terhadap `profiles.name`
> milik sopir/kurir — **ini estimasi, bukan angka otoritatif**. `cod_setoran`
> sendiri (sisi setoran) tetap presisi karena `sopir_id` benar-benar FK ke
> `profiles`.

RLS `klaim`/`cod_setoran`: granular per-operasi (`user_has_role()`) — lihat
matriks lengkap di §RLS.

#### `cabang`

```sql
cabang
  id, nama (UNIQUE), kota, alamat, telepon, catatan
  aktif BOOLEAN DEFAULT true
  created_at, updated_at TIMESTAMPTZ
```

> **PENTING — `cabang` cuma dimensi label/filter, BUKAN isolasi data.**
> Jumlah cabang dinamis (CRUD superadmin only di `/dashboard/cabang`, bisa
> mulai dari 1 dan bertambah kapan saja — bukan hardcode). Semua staf
> (non-superadmin sekalipun) tetap bisa lihat & kelola pengiriman/manifest/
> armada di **semua** cabang seperti biasa — tidak ada RLS atau filter
> otomatis berdasarkan cabang staf. `cabang_id` di `pengiriman`/`manifest`/
> `armada` semuanya nullable, murni dipakai untuk filter list & auto-fill
> `manifest.cabang_id` dari `armada.cabang_id` terpilih. **Tidak ada
> `profiles.cabang_id`** — sengaja tidak dibuat karena tidak ada fitur
> isolasi akses yang butuh itu.

RLS `cabang`: SELECT tetap semua staf (isi dropdown form pengiriman/armada/
manifest); INSERT/UPDATE/DELETE granular `superadmin` only (`user_has_role()`)
— lihat §RLS.

#### `pengeluaran`

> Berisi data pra-pivot lama (kategori bebas TEXT tanpa CHECK, mis. "Transport
> & Pengiriman") — dibiarkan apa adanya, badge abu default di UI. Kategori
> BARU expedisi cuma divalidasi di aplikasi, BUKAN CHECK DB (supaya data
> lama tidak bikin constraint gagal).

```sql
id          UUID PRIMARY KEY DEFAULT gen_random_uuid()
tanggal     DATE NOT NULL DEFAULT CURRENT_DATE
kategori    TEXT NOT NULL DEFAULT 'Operasional'   -- gaji|sewa|utilitas|
                                                  -- maintenance_armada|pajak_armada|
                                                  -- perlengkapan|pemasaran|lainnya
                                                  -- (daftar baru, app-level only)
keterangan  TEXT NOT NULL
jumlah      NUMERIC(15,2) NOT NULL CHECK (jumlah > 0)
armada_id   UUID FK -> armada    -- WAJIB (app-level) utk kategori maintenance_armada/
                                 -- pajak_armada, NULL utk kategori lain
cabang_id   UUID FK -> cabang    -- opsional
foto_bukti  TEXT                 -- opsional, storage bucket BungaNaik:
                                 -- pengeluaran/{uuid-acak}/{timestamp}.{ext}
created_by  UUID FK -> profiles
created_at, updated_at TIMESTAMPTZ
```

RLS `pengeluaran`: SELECT semua staf; INSERT/UPDATE/DELETE `superadmin`/
`keuangan` only (`user_has_role()`) — lihat §RLS.

#### `pengiriman_transit`

> **Log transit TERPISAH TOTAL dari milestone** — murni informatif untuk
> visibilitas "barang sekarang di mana" selama kiriman berstatus `dikirim`.
> **TIDAK PERNAH** mengubah kolom `pengiriman.milestone` maupun menambah
> nilai baru ke CHECK constraint-nya — dua sistem paralel yang sengaja
> dipisah, bukan digabung "biar rapi".

```sql
id            UUID PRIMARY KEY DEFAULT gen_random_uuid()
pengiriman_id UUID NOT NULL FK -> pengiriman ON DELETE CASCADE
                              -- CASCADE (beda dari manifest_biaya/klaim yang
                              -- NO ACTION) — ini log operasional yang melekat
                              -- ke siklus hidup kiriman, pola sama pengiriman_tracking
cabang_id     UUID NOT NULL FK -> cabang     -- reuse cabang sbg hub, TIDAK ada
                                              -- entitas hub terpisah
tipe_event    TEXT NOT NULL CHECK ('tiba'|'berangkat')
manifest_id   UUID FK -> manifest            -- nullable: terisi OTOMATIS kalau
                                              -- lahir dari aksi manifest Berangkat,
                                              -- NULL kalau input manual staf hub
catatan       TEXT
created_by    UUID FK -> profiles
created_at    TIMESTAMPTZ DEFAULT NOW()
```

RLS `auth_all_pengiriman_transit` (staff-only baca-tulis, `auth.uid() IS
NOT NULL`) — role gate presisi siapa boleh INPUT MANUAL (`superadmin`/
`gudang`/`kurir`/`sopir`, sama dengan akses transisi milestone `dikirim`)
tetap di React, belum di-harden granular.

**Tidak ada validasi urutan tiba/berangkat** — staf bisa input "berangkat"
tanpa "tiba" sebelumnya di hub yang sama, atau input belakangan/salah
urutan. Diterima sadar untuk kesederhanaan v1 — bukan kelalaian. **Tidak
ada perencanaan rute di muka** — staf mencatat kejadian aktual, bukan rute
yang didefinisikan saat kiriman dibuat.

**Tidak ada aksi manifest otomatis untuk event "tiba"** — manifest tidak
punya transisi status yang merepresentasikan "tiba di hub" (cuma
draft/berangkat/selesai/batal). Event "tiba" **HANYA input manual** oleh
staf hub penerima, dari `/dashboard/pengiriman/[id]`.

#### `booking_request`

> **Draft order dari customer, WAJIB dikonfirmasi staf sebelum jadi baris
> `pengiriman` sungguhan** — bukan milestone baru. Menambah milestone
> ke-7 (`menunggu_konfirmasi`) akan merembet ke manifest/laporan/`/tugas`/
> RLS; tabel terpisah + insert `pengiriman` HANYA saat staf konfirmasi
> (reuse `insertPengirimanWithResi()` yang sudah ada) jauh lebih aman —
> pola sama alasan `pengiriman_transit` dipisah dari milestone.

```sql
id                UUID PRIMARY KEY DEFAULT gen_random_uuid()
customer_id       UUID NOT NULL FK -> customer
jenis_layanan     TEXT CHECK ('reguler'|'express'|'kargo') NOT NULL

-- Snapshot pengirim, diambil SERVER-SIDE dari profil customer SAAT SUBMIT
-- (bukan dari body request) — TIDAK auto-update kalau master customer
-- berubah belakangan, pola sama pengiriman.pengirim_*
pengirim_nama     TEXT NOT NULL
pengirim_telepon  TEXT
pengirim_alamat   TEXT
pengirim_kota     TEXT

penerima_nama     TEXT NOT NULL
penerima_telepon  TEXT
penerima_alamat   TEXT
penerima_kota     TEXT

berat_kg          NUMERIC(10,2) NOT NULL DEFAULT 0
panjang_cm, lebar_cm, tinggi_cm NUMERIC(10,2)

isi_barang        TEXT
nilai_barang      NUMERIC(15,2) DEFAULT 0
ongkir_estimasi   NUMERIC(15,2)   -- hasil lookupTarifOngkir() saat submit (reguler/express);
                                  -- NULL utk kargo — staf isi manual saat konfirmasi. TIDAK
                                  -- PERNAH kolom mentah tarif_zona (harga_per_kg dst) yang
                                  -- keluar ke customer, cuma angka hasil hitung (§4.1 poin 2)
catatan           TEXT

status            TEXT CHECK ('pending'|'dikonfirmasi'|'ditolak') DEFAULT 'pending'
catatan_penolakan TEXT
pengiriman_id     UUID FK -> pengiriman   -- terisi saat dikonfirmasi
processed_by      UUID FK -> profiles
processed_at      TIMESTAMPTZ
created_at        TIMESTAMPTZ DEFAULT NOW()
```

RLS `auth_all_booking_request` (staff-only, `auth.uid() IS NOT NULL`) — ini
**aman** meski longgar karena customer TIDAK PERNAH mengakses tabel ini
lewat client Supabase — selalu lewat `app/api/booking/*` (service role),
lihat §Auth & Role. Role yang bisa lihat/proses di `/dashboard/booking`
(`superadmin`/`cs`/`kasir`/`keuangan`) tetap app-level saja, sama seperti
role gate transisi milestone `pengiriman`.

**Konfirmasi** (`/dashboard/booking`): staf buka detail (form pre-filled
dari `booking_request`, semua field editable termasuk ongkir — reuse
`lookupTarifOngkir()` live sama seperti form staf) → submit memanggil
`insertPengirimanWithResi()` **yang sudah ada** (bukan jalur insert baru)
dengan `customer_id` dari `booking_request.customer_id` → `UPDATE
booking_request SET status='dikonfirmasi', pengiriman_id=..., processed_by,
processed_at`. **Penolakan**: `catatan_penolakan` wajib diisi →
`status='ditolak'`, tidak ada `pengiriman` yang dibuat. Kedua aksi dicatat
ke `aktivitas_log` (`konfirmasi_booking`/`tolak_booking`).

**Registrasi customer TIDAK PERNAH mencocokkan/merge ke `customer` lama**
(nama/telepon sama) — insert baris `customer` BARU selalu (pencocokan
otomatis rawan duplikat kotor). Bisa menghasilkan 2 baris `customer` untuk
orang yang sama (satu dibuat staf, satu self-register) — staf gabungkan
manual kalau perlu, di luar scope v1.

> `cs` sudah masuk RLS INSERT `pengiriman_pembayaran` (lihat §RLS) —
> sebelumnya ada gap di mana `cs` bisa konfirmasi booking dengan
> `status_bayar` `dp`/`lunas` tapi insert riwayat pembayarannya ditolak
> RLS secara senyap. Sudah di-fix (`supabase/migrations/
> 20260720300000_fix_cs_pengiriman_pembayaran.sql`).

---

### Views Publik

> **PENTING — Views publik TIDAK BOLEH mengekspos** data finansial/pribadi
> internal. Selalu `DROP VIEW IF EXISTS` sebelum recreate jika struktur
> kolom berubah — jangan `CREATE OR REPLACE VIEW`.

#### `pengiriman_publik` & `pengiriman_riwayat_publik`

Dipakai oleh `/resi/[nomor]`.

```sql
CREATE VIEW pengiriman_publik AS
SELECT p.nomor_resi, p.milestone, p.jenis_layanan, p.tanggal AS tanggal_pesan,
       p.penerima_nama, p.penerima_kota, p.isi_barang, p.berat_kg,
       p.total_tagihan AS grand_total
FROM pengiriman p WHERE p.nomor_resi IS NOT NULL;

CREATE VIEW pengiriman_riwayat_publik AS
SELECT p.nomor_resi, pt.milestone, pt.alasan_gagal, pt.catatan, pt.foto_url, pt.created_at
FROM pengiriman_tracking pt
JOIN pengiriman p ON p.id = pt.pengiriman_id
WHERE p.nomor_resi IS NOT NULL;
```

**Tidak mengekspos** (disiplin sama untuk semua view publik expedisi):
`pengirim_*` (identitas pengirim), `penerima_telepon`,
`penerima_alamat` (hanya kota), `nilai_barang` (declared value — risiko
target pencurian kalau link resi disebar), breakdown `ongkir`/`biaya_asuransi`
(cuma `grand_total` gabungan), `petugas_nama`/`petugas_telepon`,
`catatan_internal`, `nomor_faktur`, `pod_penerima_nama`/`jumlah_gagal`.
`alasan_gagal` di `pengiriman_riwayat_publik` ditampilkan dengan label ramah
customer (`ALASAN_GAGAL_CFG[...].labelPublik` di `lib/pengirimanConstants.ts`),
bukan istilah internal staff.

#### `pengiriman_transit_publik`

> View **BARU terpisah** — `pengiriman_riwayat_publik` di atas TIDAK
> disentuh sama sekali. `/resi/[nomor]` menggabung KEDUA view ini di level
> aplikasi (dua query + merge + sort client-side berdasarkan `created_at`),
> **BUKAN** lewat `UNION` di database — lebih aman, nol risiko regresi ke
> view lama.

```sql
CREATE VIEW pengiriman_transit_publik AS
SELECT pt.pengiriman_id, p.nomor_resi,
       c.kota AS hub_kota,     -- HANYA kota, TIDAK PERNAH nama/alamat cabang
       pt.tipe_event, pt.created_at
FROM pengiriman_transit pt
JOIN pengiriman p ON p.id = pt.pengiriman_id
JOIN cabang c ON c.id = pt.cabang_id
WHERE p.nomor_resi IS NOT NULL;
```

**Tidak mengekspos** (sama disiplinnya dengan view lain): `cabang.nama`
(nama hub internal), `cabang.alamat`, `catatan` (bisa berisi detail
internal staf), `manifest_id`, `created_by`. Label di UI publik selalu
"Tiba di [kota]" / "Berangkat dari [kota]" — tidak pernah nama cabang.

---

## SQL Functions

### `handle_new_user()` — Trigger AFTER INSERT pada `auth.users`

Membuat baris `profiles` otomatis saat user baru dibuat lewat Supabase Auth.

---

## SQL yang Perlu Dijalankan di Supabase

```sql
CREATE TABLE IF NOT EXISTS owner_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_by UUID REFERENCES profiles(id),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE owner_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_all_owner_settings" ON owner_settings FOR ALL USING (auth.uid() IS NOT NULL);

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

NOTIFY pgrst, 'reload schema';
```

> Migration entitas expedisi (tabel `pengiriman`, `tarif_zona`,
> `armada`/`manifest`, `cod_setoran`/`klaim`, `cabang`, dst.) sudah dijalankan
> sebagai file migration terpisah di `supabase/migrations/` — tidak diulang
> di sini. Lihat §"Entitas Expedisi" di atas + `expedisi.md` untuk riwayat lengkap.

---

## Business Logic

### Foto Bukti Transfer (Pelunasan Pengiriman)

- Upload ke Storage bucket `BungaNaik`, path: `pelunasan/{pengiriman_id}/{timestamp}.{ext}`
- Disimpan di kolom `pengiriman_pembayaran.foto_url`
- Ditampilkan di riwayat pembayaran pada detail pengiriman

### Pelunasan / Catat Pembayaran (Pengiriman)

- Akses: `superadmin`, `kasir`, `keuangan`
- Tersedia di: halaman daftar pengiriman + halaman detail pengiriman
- Alur: validasi jumlah ≤ sisa → upload foto (opsional) → `INSERT pengiriman_pembayaran` → `UPDATE pengiriman SET uang_dp += jumlah` → recalculate `status_bayar`
- `metode_bayar` di tabel `pengiriman` TIDAK pernah dioverwrite

### Rollback Pembayaran (koreksi salah catat pelunasan)

- Akses: `superadmin`, `kasir`, `keuangan` (sama seperti akses pelunasan)
- Lokasi: tombol ikon (`RotateCcw`) di setiap baris "Riwayat Pembayaran"
  pada halaman detail pengiriman (`/dashboard/pengiriman/[id]`) — tetap
  muncul walau `status_bayar` sudah `lunas`, untuk kasus miskomunikasi
  (dikira lunas padahal belum)
- Alur: konfirmasi → `DELETE` baris `pengiriman_pembayaran` yang dipilih
  → `uang_dp` dikurangi sejumlah pembayaran tsb (floor di 0) →
  `status_bayar` dihitung ulang: `belum_bayar` jika sisa uang_dp ~0,
  `lunas` jika uang_dp masih ≥ total_tagihan, selain itu `dp`
- Ini adalah operasi correction manual (rollback), bukan penghapusan
  transaksi — baris pengiriman tidak berubah, hanya riwayat
  pembayaran & status bayar
- **Rollback tetap berfungsi identik untuk baris yang dibuat lewat Pelunasan
  Massal** — logikanya generik terhadap tabel `pengiriman_pembayaran` apa
  pun asal-usulnya (single atau massal), tidak ada penanganan khusus.

### Pelunasan Massal (`/dashboard/piutang`)

- Di drill-down customer: checkbox per kiriman belum lunas + "Pilih Semua"
  → satu aksi "Catat Pelunasan Terpilih". Untuk **setiap** kiriman
  terpilih: `INSERT pengiriman_pembayaran` sebesar **sisa penuh** kiriman
  itu (metode + catatan sama utk semua baris, catatan default
  `"Pelunasan massal {tanggal cetak}"` tapi tetap bisa diedit) →
  `UPDATE pengiriman SET uang_dp = total_tagihan, status_bayar = 'lunas'`
  — reuse mekanisme pelunasan satuan yang sudah ada, dipanggil berulang
  per baris (bukan satu transaksi DB, bukan RPC).
- **Selalu bayar penuh** sisa masing-masing kiriman yang dipilih — TIDAK
  ada alokasi pembayaran sebagian ke beberapa kiriman sekaligus. Bayar
  sebagian tetap lewat pelunasan satuan yang sudah ada di
  `/dashboard/pengiriman`.
- **TIDAK ada entitas invoice/tagihan formal baru** (nomor tagihan
  gabungan, dsb) — rekap tetap dinamis dihitung ulang tiap query, bukan
  dibekukan jadi dokumen.
- Role: `superadmin`, `kasir`, `keuangan` — sama dengan gate halaman
  `/dashboard/piutang` itu sendiri, tidak ada pembatasan tambahan.

### COD & Klaim

- **Setoran COD** (`/dashboard/cod`): ledger setoran COD per sopir/kurir
  (`cod_setoran`). "Estimasi COD Terkumpul" per petugas dihitung dari
  `pengiriman_pembayaran` bermetode `cod`, matching **diutamakan**
  `pengiriman.petugas_id = profile.id` (presisi) — fallback pencocokan nama
  (case-insensitive terhadap `petugas_nama`) **hanya** untuk baris
  `petugas_id IS NULL` (data lama/non-staf, lihat §Database Schema bagian
  Petugas FK). Disclaimer "estimasi" di UI cuma tampil selama masih ada
  baris fallback — begitu semua kiriman COD sudah ber-`petugas_id`,
  disclaimer hilang otomatis. "Sisa Saldo (estimasi)" = Estimasi Terkumpul
  − Total Setoran.
- Role input setoran: `superadmin` | `keuangan` | `kurir` | `sopir`. Role
  edit/hapus (koreksi): `superadmin` | `keuangan`.
- **Klaim** (`/dashboard/klaim`): laporan barang hilang/rusak, tersimpan
  di `klaim`, terhubung ke `pengiriman_id` (opsional — bisa `NULL` kalau
  pengiriman induk sudah dihapus, lihat snapshot di §Database Schema).
- Alur status: `pending` (siapa saja staf lapor) → `disetujui` | `ditolak`
  (**superadmin only**, isi `nilai_disetujui` + `catatan_approval`) →
  `selesai` (`superadmin` | `keuangan`, menandakan ganti rugi sudah
  dibayar/kasus ditutup — tidak otomatis terhubung ke `pengeluaran`, staff
  catat manual kalau ada pembayaran keluar).
- Role hapus klaim: `superadmin` only.
- Field `pengiriman.nilai_barang` jadi acuan wajar saat mengisi
  `nilai_klaim`, tapi tidak divalidasi otomatis (staff isi manual).

### Biaya Trip & Laba per Manifest

- **Revenue trip** = SUM `pengiriman.ongkir` (bukan `total_tagihan` — **tidak**
  termasuk `biaya_asuransi`, keputusan sengaja: asuransi adalah fee dengan
  liabilitas klaim di baliknya, mencampurnya ke margin trip membuatnya
  terlihat lebih gemuk dari kenyataan) untuk semua kiriman yang ada di
  `manifest_item` manifest tsb. Kiriman `gagal_kirim`/`retur` **tetap
  dihitung** (ongkir tetap ditagih penuh).
- **Total Biaya** = SUM `manifest_biaya.jumlah` manifest tsb. **Laba** =
  Revenue − Total Biaya. **Margin %** = Laba / Revenue × 100 — ditampilkan
  merah kalau negatif (rugi).
- **Kebijakan anti-dobel dengan modul Pengeluaran (keuangan)**: biaya trip
  (uang jalan, BBM, tol, kuli, parkir) dicatat **HANYA** di
  `manifest_biaya` — **JANGAN** direkap ulang secara manual ke
  `pengeluaran` oleh keuangan. Dua sumber pencatatan untuk biaya yang sama
  tanpa aturan ini akan menghasilkan angka keuangan ganda (double count)
  di laporan gabungan.
- Biaya bisa diinput di semua status manifest (`draft`/`berangkat`/
  `selesai`/`batal` — trip yang batal di tengah jalan tetap sudah keluar
  BBM). Kategori `lainnya` wajib isi `keterangan` (**app-level, bukan DB
  CHECK**). Nilai biaya **tidak divalidasi** terhadap budget/plafon apapun
  — murni pencatatan (ledger polos, sengaja tanpa alur approval/advance/
  reimburse).
- **Sopir/kurir yang input biaya TIDAK BISA edit/hapus baris sendiri** —
  keputusan sengaja biar sederhana; salah input minta koreksi ke
  `superadmin`/`keuangan` (role yang sama dengan koreksi `cod_setoran`).
- **Uang jalan di muka (advance)**: dicatat penuh sebagai kategori
  `uang_jalan` saat diberikan; kalau ada sisa yang dikembalikan, dicatat
  keuangan sebagai **koreksi/edit nilai baris tsb** — **tidak ada entitas
  advance terpisah**.
- Panel Revenue/Total Biaya/Laba di `/dashboard/manifest/[id]` hanya
  render untuk `superadmin`/`keuangan` — role lain (`gudang`/`sopir`/
  `kurir`) tetap lihat daftar biaya & Total Biaya polos, TANPA revenue/margin.

### Scan QR — Muat Manifest & Checklist

> **Format/isi QR di `printPengirimanResi` TIDAK berubah** — tetap
> `nomor_resi` polos (`BNG-XXXXXXXX`), bukan JSON/URL. Ini breaking change
> ke semua resi yang sudah tercetak dan beredar kalau diubah — **jangan
> diubah**.

- **Satu sumber logika, dua entry-point**: `lib/manifestAksi.ts`
  (`findEligibleCandidates()`, `scanLookupManifest()`, `addManifestItem()`)
  dipakai BERSAMA oleh search manual & overlay scan di
  `/dashboard/manifest/[id]`, MAUPUN tombol "Scan untuk Muat" di `/tugas`.
  `addManifestItem()` adalah **satu-satunya** jalur INSERT `manifest_item`
  — jangan tulis jalur insert terpisah di tempat lain. Komponen UI-nya
  (`components/ScanQRManifestOverlay.tsx`) juga dipakai bersama, bukan
  cuma logic-nya — alur & tampilan scan identik di kedua halaman.
- **Validasi eligibility scan = validasi search manual**: kiriman
  harus bermilestone `diproses`/`dijemput`/`gagal_kirim` DAN belum ada di
  manifest lain yang masih `draft`/`berangkat`. Scan cuma cara input
  alternatif — tidak ada pelonggaran aturan.
- **Mode scan continuous, bukan modal blocking**: kamera tetap aktif
  setelah satu scan sukses/gagal, siap untuk resi berikutnya. Feedback per
  scan: `navigator.vibrate()` + beep pendek (Web Audio, silently no-op
  kalau diblokir browser) + flash hijau/merah pada target box + toast teks
  — TIDAK ada dialog konfirmasi yang menghentikan sesi.
- **Debounce**: resi yang sama ter-scan ulang dalam <2 detik diabaikan
  (bukan error) — kamera bisa membaca QR yang sama beberapa frame
  berturut-turut.
- **Scan resi tidak eligible TIDAK menghentikan sesi** — toast merah
  dengan alasan singkat ("Sudah ada di manifest MNF-...", "Status kiriman
  tidak sesuai (...)", "Resi ... tidak ditemukan"), kamera tetap aktif.
- **Checklist "sudah dicek" (opsional)**: scan ULANG resi yang sudah ada
  di manifest **INI** (beda dari "sudah ada di manifest LAIN" yang tetap
  error) ditandai "sudah dicek" — state lokal `useState<Set>` di level
  halaman `/dashboard/manifest/[id]` (badge hijau + checkbox manual di
  list "Kiriman"), **TIDAK ADA kolom/tabel DB apa pun**, reset saat
  reload. `/tugas` tidak menampilkan list kiriman manifest, jadi
  checklist di sana cuma berupa toast feedback instan, tidak ada state
  yang di-lift. **Jangan** kembangkan ini jadi checklist resmi dengan
  jejak siapa-kapan tanpa spec terpisah — sengaja dangkal.
- **Manifest aktif di `/tugas` ditentukan otomatis** — asumsi satu
  sopir/kurir = satu trip aktif per hari (`manifest.sopir_id =
  auth.uid()`, `status IN ('draft','berangkat')`, `tanggal_berangkat` =
  hari ini). Kalau ternyata ada lebih dari satu (di luar asumsi), diambil
  yang paling baru dibuat — **tidak ada UI pemilihan manual**.
- **Kamera butuh secure context** (HTTPS atau `localhost`) — `getUserMedia`
  akan gagal/tidak muncul prompt izin sama sekali kalau diakses lewat
  `http://<lan-ip>:port` dari HP. Lihat §Known Issues.
- **Scanner USB/hardware** sengaja tidak didukung khusus — kalau gudang
  pakai scanner fisik yang mengetik+Enter, itu otomatis jalan lewat search
  box manual existing tanpa kerja tambahan.

### Riwayat Transit Multi-Hub

> **ATURAN PALING PENTING**: `pengiriman_transit` TIDAK PERNAH mengubah
> kolom `pengiriman.milestone`, dan TIDAK PERNAH menambah nilai baru ke
> CHECK constraint milestone. Milestone dan transit adalah **dua sistem
> paralel yang sengaja dipisah** — kalau ada ide "lebih rapi kalau
> tiba/berangkat jadi bagian milestone", itu salah arah, tolak dari awal.

- **Tujuan**: milestone `dikirim` sebelumnya kotak hitam (tidak ada info
  apa pun sampai `selesai`), padahal kiriman lintas kota sering lewat
  beberapa hub transit. Log ini **murni informatif** untuk visibilitas
  "barang sekarang di mana", tanpa mengubah alur bisnis/role-gate
  milestone yang sudah ada sama sekali.
- **Reuse `cabang` sebagai hub** — tidak ada entitas hub terpisah, tidak
  ada kolom pembeda `cabang.tipe` (cukup satu dropdown gabungan selama
  jumlah cabang belum banyak; pisahkan nanti kalau daftarnya sudah
  panjang & membingungkan).
- **Input manual**: role `superadmin`/`gudang`/`kurir`/`sopir` (sama
  dengan akses transisi milestone `dikirim`) — `cs`/`kasir`/`keuangan`
  bisa lihat riwayat transit tapi tidak bisa menambah.
- **Timeline publik** `/resi/[nomor]` = gabungan `pengiriman_riwayat_publik`
  (milestone) + `pengiriman_transit_publik` (transit), digabung & diurutkan
  `created_at` **di level aplikasi** (dua query terpisah + `.sort()` JS,
  bukan `UNION` di database — nol risiko regresi ke view lama). Step
  indicator 4-tahap tetap kerangka utama; transit tampil sebagai baris
  tambahan di section "Riwayat Update", bukan node baru di stepper. Label
  selalu "Tiba di [kota]" / "Berangkat dari [kota]" — tidak pernah nama
  cabang internal atau alamat (dijamin by construction karena view publik
  cuma expose `hub_kota`).

### Peta Sumber Angka & Cash Basis (Laporan Keuangan)

**Cash basis** (uang dihitung saat diterima/dikeluarkan, bukan saat
kiriman dibuat) dan **tanpa pencatatan ganda** — tiap jenis beban punya
SATU rumah:

```
PEMASUKAN  = pengiriman_pembayaran (SUM per created_at)      ← kas diterima,
                                                              BUKAN total_tagihan
BEBAN      = pengeluaran            (biaya umum non-trip, dicatat di sini)
           + manifest_biaya         (biaya operasional trip — BACA SAJA,
                                     dicatat di modul Manifest)
           + klaim selesai          (ganti rugi — BACA SAJA, nilai_disetujui,
                                     dicatat di modul Klaim, basis selesai_at)
NETO       = PEMASUKAN − BEBAN
```

- **Pemasukan**: DP bulan lalu + pelunasan bulan ini = dua pemasukan di dua
  periode berbeda (bukan dicatat sekali saat kiriman dibuat). Breakdown per
  `metode` (transfer/cod/cash).
- **Beban klaim pakai `klaim.selesai_at`** (bukan `created_at`/tanggal
  kejadian) — klaim yang baru `disetujui` tapi belum `selesai` TIDAK masuk
  beban periode manapun sampai ditandai selesai.
- **Aturan anti-dobel (final)**: `manifest_biaya` dan `klaim` **TIDAK
  PERNAH** dicatat ulang sebagai baris di `pengeluaran` — Laporan Keuangan
  cuma MEMBACA kedua tabel itu lewat query gabungan saat dibuka, bukan
  menyalin datanya. **Jangan** "sinkronkan ke pengeluaran saat klaim
  selesai" — itu pendekatan yang secara eksplisit ditolak.
- **Kebijakan Maintenance Armada (final)**: SEMUA maintenance armada —
  **termasuk yang terjadi di tengah trip** (ban pecah dsb) — dicatat di
  `pengeluaran` dengan `armada_id` (kategori `maintenance_armada`/
  `pajak_armada`), **BUKAN** di `manifest_biaya`. Alasan: biaya
  maintenance yang nyangkut di satu trip merusak margin trip itu padahal
  manfaatnya lintas puluhan trip ke depan. `manifest_biaya` khusus
  habis-pakai perjalanan (uang jalan/BBM/tol/kuli/parkir).
- **Klaim TIDAK difilter cabang** di Laporan Keuangan — tabel `klaim` tidak
  punya kolom `cabang_id` (sengaja, di luar scope). Filter cabang cuma
  berlaku ke Pemasukan (via `pengiriman.cabang_id`), Pengeluaran
  (`pengeluaran.cabang_id`), dan Biaya Trip (via `manifest.cabang_id`).
- **Tabel "Biaya per Armada"** di Laporan Keuangan basisnya
  `pengeluaran.armada_id` (maintenance/pajak) — **BEDA** dari revenue/laba
  per kendaraan di Laporan Laba per Trip (basis `manifest_biaya`). Dua
  tampilan berbeda, sengaja tidak digabung jadi satu angka.

### Gagal Kirim, Retur & POD

Lihat peta transisi & role lengkap di §Database Schema bagian `pengiriman`.

- **Transisi ke `gagal_kirim` WAJIB** mengisi `alasan_gagal` (dropdown 5
  pilihan: `penerima_tidak_ada`/`alamat_salah`/`tidak_bisa_dihubungi`/
  `ditolak_penerima`/`lainnya`) — `catatan` dan foto opsional. Aplikasi
  meng-increment `pengiriman.jumlah_gagal += 1` dalam update yang sama.
- **Transisi ke `selesai` WAJIB POD**: `pod_penerima_nama` (min 2 karakter)
  - `pod_foto_url` (upload wajib). **Di-enforce di level aplikasi saja —
    DB tidak memvalidasi ini** (lihat §Known Issues).
- **Transisi ke `retur`** adalah keputusan bisnis manual (bukan otomatis
  setelah N kali gagal), terminal — tidak ada transisi keluar dari `retur`.
  **Tidak** otomatis membuat `klaim` dan **tidak** mengubah `status_bayar`
  — penyesuaian tagihan (kalau ada) tetap manual via rollback pembayaran.
- `jumlah_gagal` **tidak bertambah** saat retry (`gagal_kirim → dikirim`),
  baik manual dari halaman detail maupun bulk lewat aksi "Berangkat" di
  manifest — counter cuma naik saat transisi MASUK ke `gagal_kirim`.
- Badge merah kalau `jumlah_gagal >= 3` di panel info & kartu ringkasan list
  (bukan blocking/reminder otomatis — murni visual, keputusan retur tetap manual).
- `alasan_gagal` tampil di tracking publik (`/resi/[nomor]`) dengan label
  ramah customer (`ALASAN_GAGAL_CFG[...].labelPublik` di
  `lib/pengirimanConstants.ts`), beda dari label internal staff
  (`ALASAN_GAGAL_CFG[...].label`) yang tampil di dashboard.
- Laporan/summary: `retur` dihitung terpisah dari `selesai` — jangan
  digabung sebagai "beres", retur adalah kegagalan layanan yang perlu
  terlihat di metrik.
- **Logika transisi di-ekstrak ke `lib/pengirimanAksi.ts`**:
  `submitSelesaiPOD()` dan `submitGagalKirim()` dipakai BERSAMA oleh
  `/dashboard/pengiriman/[id]` dan `/tugas` (halaman mobile kurir/sopir)
  — validasi wajib (alasan gagal, nama+foto POD) hidup di SATU tempat.
  Kalau menambah jalur baru yang mengubah milestone ke
  `selesai`/`gagal_kirim`, panggil fungsi ini, **jangan** tulis ulang
  logika `INSERT pengiriman_tracking` + `UPDATE pengiriman` secara
  terpisah — risiko divergen dari aturan spec 01.

### waLink() & Resi Utility

```typescript
// lib/utils.ts
export function waLink(telepon: string): string { ... }
export function generateNomorResi(): string { ... }        // BNG-XXXXXXXX, table-agnostic
export async function insertPengirimanWithResi(            // insert + retry collision
  supabase, payload, maxRetry = 5
): Promise<{ data, error }>
```

### Metode Pembayaran (Split) — Pengiriman

- `pengiriman.metode_bayar` = metode **pertama**, tidak pernah dioverwrite
- Setiap termin pembayaran → insert ke `pengiriman_pembayaran`
- `uang_dp` = akumulasi total terbayar

### Booking Mandiri — Self-Service Customer

> **Notifikasi WA status booking SENGAJA belum ada** — butuh provider WA
> Business API pihak ketiga berbayar yang belum dipilih (fase terpisah).
> Customer harus buka `/booking` manual untuk cek status dikonfirmasi/
> ditolak. Lihat §Database Schema `booking_request` untuk skema & alur
> konfirmasi/tolak lengkap, dan §Auth & Role "Auth Customer" untuk
> arsitektur auth-nya.

- **Ongkir**: reguler/express → `lookupTarifOngkir()` (`lib/tarifAksi.ts`)
  dijalankan server-side saat submit, ditampilkan ke customer sebagai
  **"Estimasi"**, bukan harga final — staf tetap bisa ubah bebas saat
  konfirmasi. Kargo → tidak ada estimasi sama sekali, customer diberi
  tahu "akan dihubungi untuk quote".
- **Validasi server wajib di `/api/booking/submit`** (§4.1 poin 5,
  independen dari validasi form): `berat_kg` > 0 dan <= 10000 kg,
  panjang/lebar/tinggi > 0 dan <= 1000 cm (kalau diisi), `nilai_barang` >=
  0, string dipangkas (nama/kota <= 200, alamat/catatan <= 2000) — bukan
  ditolak, kecuali `penerima_nama` yang wajib diisi 2-200 karakter.
- **Tidak ada pembatalan booking oleh customer** setelah submit (v1) —
  hubungi staf manual kalau salah isi.
- **Tidak ada fitur reset password mandiri** (v1) — belum ada
  infrastruktur email/WA terverifikasi untuk alur reset yang aman.
  Customer yang lupa password hubungi staf; staf reset manual lewat query
  SQL langsung kalau sering terjadi (jangan bangun alur reset email
  sebelum ada pengiriman email yang benar-benar terverifikasi).
- **Riwayat customer** (`/booking`, via `/api/booking/riwayat`): gabungan
  `booking_request` + `pengiriman` milik customer tsb, dua query terpisah
  di-merge di response (bukan SQL JOIN/UNION) — pola sama `/resi/[nomor]`.
  Kolom `pengiriman` yang dikembalikan ke customer **allowlist
  eksplisit** persis sama larangannya dengan view `pengiriman_publik`:
  TIDAK PERNAH `catatan_internal`/`petugas_*`/breakdown ongkir-asuransi/
  `nomor_faktur`.

---

## Auth & Role System

### Roles

- `superadmin`: Full access — kelola pengguna, semua milestone pengiriman (termasuk `gagal_kirim`/`retur`), approve/tolak klaim, CRUD tarif zona & cabang & armada, delete pengiriman, baca Log Aktivitas
- `kasir`: Input pengiriman, pelunasan, rollback pembayaran
- `keuangan`: Laporan keuangan + pengiriman + pelunasan + delete pengiriman, edit/hapus setoran COD, tandai klaim `selesai`, baca Log Aktivitas
- `cs`: Pengiriman (monitoring), manifest, lapor klaim
- `gudang`: CRUD armada, update milestone → `dijemput`
- `kurir`: Update milestone (`dijemput` → `dikirim` → `selesai`), input setoran COD, lapor klaim
- `sopir`: Update milestone → `dikirim`/`selesai`, input setoran COD, lapor klaim

> **DELETE `pengiriman` di level DB (RLS) cuma `superadmin`/`keuangan`**
> — tombol Delete di frontend untuk `kasir`/`gudang`/`kurir` **sengaja
> tidak disembunyikan** (breaking change yang diterima sadar), jadi
> role-role itu masih *lihat* tombolnya tapi klik-nya akan ditolak DB.

Lihat §"Entitas Expedisi" (Database Schema) untuk detail lengkap role gate per transisi milestone, dan §"COD & Klaim" (Business Logic) untuk role gate setoran/klaim.

> **`sopir`/`kurir` diarahkan ke `/tugas`** (halaman mobile, bukan
> `/dashboard`) langsung setelah login — tetap bisa buka `/dashboard`
> lewat link "Buka Dashboard Lengkap" kalau perlu fitur lain.
> `TUGAS_ROLES` di `lib/roles.ts` adalah satu sumber kebenaran untuk
> daftar role ini.

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
- Timeout fallback 2 detik
- Middleware hapus cookie `sb-*` saat redirect ke `/login`
- `NavLink` dan `SubNavLink` di `Sidebar.tsx` didefinisikan di luar komponen — mencegah unmount/remount tiap auth update

### Auth Customer — Booking Mandiri

> **ATURAN ARSITEKTUR MUTLAK**: akun customer booking mandiri TIDAK
> PERNAH menyentuh Supabase Auth (`auth.users`) dalam bentuk apa pun.
> Kalau terasa "lebih mudah" pakai Supabase Auth untuk customer juga —
> itu SALAH, tolak dari awal. Lihat rasional lengkap di bawah.

Hampir semua RLS di database (lihat matriks §RLS di bawah) mengasumsikan
"siapa pun yang punya sesi Supabase Auth = staf terpercaya" — banyak
tabel (`armada`, `manifest`, `manifest_item`, `customer`,
`pengiriman_tracking`, `booking_request`, dan SELECT `pengiriman` sendiri)
masih berpolicy selonggar `auth.uid() IS NOT NULL` **tanpa role gate sama
sekali**. Kalau akun customer dibuat lewat Supabase Auth juga, begitu
customer login, `auth.uid()` mereka otomatis lolos SEMUA policy longgar
itu — customer bisa baca seluruh data pengiriman/manifest/armada semua
orang lewat REST API langsung, bukan cuma miliknya sendiri.

**Desain yang dipakai — 100% terpisah**:

- Kolom `customer.email`/`customer.password_hash` (bukan tabel baru) —
  diverifikasi manual (bcrypt) di API route, BUKAN mekanisme Supabase Auth.
- Login/register lewat `app/api/booking-auth/*` yang pakai **service role
  key** (pola sama `/api/create-user/route.ts`) — menerbitkan **JWT
  sendiri** (`jose`, bukan token Supabase) di cookie httpOnly terpisah
  `booking_session`, signed pakai `BOOKING_JWT_SECRET` (env, WAJIB beda
  dari secret lain manapun). Payload JWT SENGAJA minimal: `sub` (customer
  id) + `exp` (7 hari), tidak ada data sensitif.
- **SEMUA akses data customer** (submit booking, riwayat, edit profil)
  lewat `app/api/booking/*` atau `app/api/booking-auth/*` yang pakai
  service role + validasi JWT manual (`lib/bookingAuth.ts:
  getBookingCustomerId()`) — BUKAN lewat `createClient()` Supabase browser
  client biasa. RLS tabel existing **TIDAK PERLU disentuh sama sekali**
  untuk fitur ini — customer tidak pernah punya sesi Supabase Auth.
- `middleware.ts` **SENGAJA TIDAK** mendaftarkan `/booking` sebagai route
  terproteksi (beda dari `/dashboard`/`/tugas`) — `updateSession()` di
  situ cuma cek sesi Supabase Auth staf, customer tidak pernah punya itu.
  Proteksi `/booking/*` murni client-side (`app/booking/layout.tsx` cek
  `/api/booking-auth/me`) — UX saja, BUKAN lapisan keamanan (lapisan
  keamanan sesungguhnya ada di tiap API route, lihat poin di atas).

**Aturan keamanan wajib di SETIAP endpoint `booking-auth`/`booking` baru**
(kalau menambah endpoint baru di jalur ini, semua ini WAJIB dipenuhi
ulang, bukan cuma di endpoint yang sudah ada):

1. Identitas customer **HANYA** dari `getBookingCustomerId(req)` (JWT
   cookie terverifikasi) — TIDAK PERNAH dari `customer_id` di body/query.
2. Response yang mengandung data `pengiriman` selalu pakai `.select()`
   allowlist kolom eksplisit — jangan `select("*")`.
3. Endpoint publik tanpa auth (`register`/`login`) WAJIB rate limit +
   honeypot (register). Selain limit per-IP/per-email, ada **backstop
   global topology-independent** (`register`: 30/5 menit, `login`: 60/5
   menit, key konstan bukan per-identitas) — ditambahkan karena deployment
   TIDAK ADA reverse proxy, jadi `X-Forwarded-For` sepenuhnya bisa
   dipalsu client dan limit per-IP saja trivial dilewati (dibuktikan lewat
   tes manual). Trade-off yang diterima sadar: penyerang bisa sengaja
   memicu limit global untuk memblokir registrasi/login semua orang
   selama window aktif — lebih baik daripada flood tak terbatas yang
   menghabiskan CPU lewat bcrypt cost-12 di tiap percobaan.
4. Password minimal 8 karakter, bcrypt cost >= 10 (dipakai: 12). Pesan
   error login SELALU generik ("email atau password salah") — jangan
   bedakan email tak terdaftar vs password salah, dan `bcrypt.compare`
   tetap dijalankan penuh terhadap hash dummy kalau email tidak ditemukan
   (cegah timing side-channel).
5. Validasi batas input di server (§Business Logic "Booking Mandiri"),
   independen dari validasi form — form yang beda/di-bypass tidak boleh
   melewati batas ini.

`lib/bookingRateLimit.ts` pakai **in-memory Map**, bukan tabel DB/Redis —
cukup untuk deployment single-instance sekarang. State hilang tiap restart
dan TIDAK sinkron kalau nanti pindah ke multi-instance/serverless — kalau
itu terjadi, ganti basis penyimpanan (bukan ubah logika limit-nya).

### RLS

**⚠️ JEBAKAN PALING PENTING kalau menambah/mengubah RLS di masa depan**:
policy Postgres bersifat **PERMISSIVE (di-OR)**. Menambah policy sempit
TANPA men-`DROP` policy `auth_all_*` FOR ALL yang lama = **TIDAK ADA EFEK
APAPUN** — policy lama tetap meloloskan semua. Tabel yang mau di-harden
WAJIB: `DROP POLICY` lama dulu → `CREATE POLICY` baru per-operasi
(SELECT/INSERT/UPDATE/DELETE). Setelah migration, verifikasi dengan
`SELECT policyname, cmd, qual FROM pg_policies WHERE tablename = '...'`
— jangan cuma percaya migration jalan tanpa error.

`user_has_role(roles TEXT[])` (SQL, `SECURITY DEFINER`, di `profiles`) —
helper dipakai semua policy RLS granular:
```sql
CREATE OR REPLACE FUNCTION user_has_role(roles TEXT[]) RETURNS BOOLEAN AS $$
  SELECT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = ANY(roles))
$$ LANGUAGE sql SECURITY DEFINER SET search_path = public STABLE;
```

**Matriks RLS tabel yang sudah di-harden.** SELECT semua tabel di bawah
**tetap terbuka semua staf** (`auth.uid() IS NOT NULL`):

| Tabel                   | INSERT                                                                                                  | UPDATE                       | DELETE                       |
| ----------------------- | --------------------------------------------------------------------------------------------------------| ----------------------------- | ----------------------------- |
| `tarif_zona`            | superadmin                                                                                               | superadmin                    | superadmin                    |
| `cabang`                | superadmin                                                                                               | superadmin                    | superadmin                    |
| `pengiriman_pembayaran` | superadmin, kasir, keuangan, cs                                                                          | **tidak ada policy** (memang tidak ada alur edit pembayaran) | superadmin, kasir, keuangan (rollback — `cs` SENGAJA TIDAK ditambah di sini, cuma INSERT) |
| `pengiriman`            | semua staf                                                                                                | tidak dipersempit (milestone dkk tetap app-level) | **superadmin, keuangan saja** |
| `klaim`                 | semua staf                                                                                                | superadmin, keuangan          | superadmin only               |
| `cod_setoran`           | superadmin, keuangan, kurir/sopir (kurir/sopir **hanya** `sopir_id = auth.uid()`, cegah setor atas nama orang lain) | superadmin, keuangan | superadmin, keuangan |
| `manifest_biaya`        | superadmin, gudang, sopir, kurir, keuangan                                                               | superadmin, keuangan          | superadmin, keuangan          |
| `aktivitas_log`         | siapa saja, **hanya** `created_by = auth.uid()`                                                          | **tidak ada policy** (immutable) | **tidak ada policy** (immutable) |

**Breaking change DELETE `pengiriman`**: hanya `superadmin|keuangan`.
Tombol Delete di frontend **sengaja tidak diubah** untuk role yang sudah
tidak berwenang (mereka masih lihat tombolnya) — DB yang menolak.

**Granularitas yang RLS TIDAK bisa jaga** (tetap app-level, by design):
approve vs tandai-selesai klaim sama-sama `UPDATE klaim` — RLS tidak bisa
membedakan kolom/nilai, jadi "approve nilai ganti rugi superadmin only"
tetap dijaga React saja (keuangan secara teknis bisa `UPDATE klaim` lewat
API langsung, misalnya isi `nilai_disetujui`; diterima sadar, minimal
terekam di `aktivitas_log`). Sama untuk transisi milestone `pengiriman`
(role per transisi tetap app-level, lihat §Entitas Expedisi).

**Tidak disentuh** (masih `auth_all_*` FOR ALL, `auth.uid() IS NOT NULL`
— bisa menyusul sesi terpisah): `armada`, `manifest`, `manifest_item`,
`customer`, `pengiriman_tracking`, `pengiriman_transit`, `booking_request`
(aman meski longgar karena customer TIDAK PERNAH mengakses tabel ini
langsung, selalu lewat `app/api/booking/*` service role, lihat §Auth
Customer Booking Mandiri). `absensi`/`face_enrollment` sudah granular dari
awal (lihat §SQL yang Perlu Dijalankan). Views publik tracking: `GRANT
SELECT TO anon`, tidak berubah.

**`profiles` RLS (TIDAK diubah)**: cuma izinkan baca profil sendiri ATAU
semua profil kalau `superadmin` — `keuangan` **tidak bisa** join langsung
ke `profiles` utk resolve nama staf lain. Karena itu ada
`get_staf_aktivitas()` (SECURITY DEFINER, self-gated
`superadmin`/`keuangan`, HANYA expose `{id, name}`) khusus untuk
kebutuhan halaman `/dashboard/aktivitas` — kalau nanti ada halaman lain
yang butuh resolve nama staf untuk role `keuangan`, jangan melonggarkan
`profiles_select` secara umum, buat function sempit serupa.

**Audit trail — `aktivitas_log`** (append-only, TANPA policy UPDATE/
DELETE sama sekali — immutable kecuali `service_role`): dicatat lewat
`logAktivitas()` di `lib/aktivitas.ts`, dipanggil **setelah** aksi
sensitif sukses, fire-and-forget (gagal log tidak membatalkan aksi utama,
cukup `console.error`). Titik sisip existing: delete pengiriman, rollback
pembayaran, approve/tolak klaim, hapus setoran COD, edit/hapus tarif,
edit/hapus biaya trip. Halaman baca: `/dashboard/aktivitas`
(`superadmin`/`keuangan`, filter tanggal/aksi/staf, expand detail JSON).

> **Gotcha `INSERT ... RETURNING` + RLS**: Postgres mensyaratkan baris
> yang baru di-insert **juga** lolos policy SELECT tabel tsb kalau query
> minta `RETURNING`/`Prefer: return=representation` (termasuk
> `.insert(...).select()` di supabase-js) — gagalnya muncul sebagai error
> RLS generik yang sama dengan gagal INSERT biasa, gampang bikin bingung.
> Karena `select_aktivitas_log` dibatasi `superadmin`/`keuangan`,
> `logAktivitas()` **WAJIB** pakai `.insert(...)` **tanpa** `.select()` —
> kalau tidak, log utk aksi role lain (sopir, kurir, dst) akan gagal diam-
> diam padahal justru itu yang paling penting diaudit.

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

### Sidebar

```typescript
// navItems: Dashboard, Absensi
// pengirimanEntitasItems: Pengiriman, Customer, Booking Masuk (flat nav,
//   dekat satu sama lain) — Booking Masuk punya badge jumlah `pending`,
//   satu-satunya item dengan badge; NavLink dapat prop `badge?: number`
//   opsional utk ini, di-pass di render call, BUKAN di array data
// pengirimanItems "Operasional Armada": Lacak GPS Sopir, Armada, Manifest
// codKlaimItems "COD & Klaim": Setoran COD, Klaim
// laporanItems: Laporan Petugas, Piutang, Keterlambatan, Laba per Trip
// Grup "Admin" (isSuperAdmin only): adminItems (Pengguna, Tarif Zona, Cabang)
// keuanganItems (superadmin + keuangan): Laporan Keuangan, Pengeluaran
// NavLink & SubNavLink: fungsi di luar Sidebar — jangan dipindah ke dalam komponen
```

### Foto — Storage Paths

```typescript
const FOTO_BUCKET = "BungaNaik";
// Foto tracking/gagal-kirim/POD: `pengiriman-tracking/${pengirimanId}/${Date.now()}.${ext}`
// Foto bukti pelunasan:          `pelunasan/${pengirimanId}/${Date.now()}.${ext}`
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

- Filter bulan/tahun + filter cabang, bisa diakses **semua role**
- 5 stat card: **Kiriman** (jumlah, periode terpilih), **Revenue Ongkir**
  (SUM `total_tagihan` — **termasuk kiriman `retur`**, karena ongkir retur
  tetap ditagih penuh), **Belum Lunas** (jumlah), **Gagal Kirim Aktif**, **Retur**
- **Revenue Ongkir** & widget rincian "Tagihan Belum Lunas" (nominal DP/sisa
  + daftar 5 invoice) — **superadmin/keuangan only**. Role lain tetap lihat
  card "Belum Lunas" (jumlah transaksi saja, tanpa nominal agregat) dan
  semua card count lainnya — figur per-baris (mis. total tagihan di
  "Pengiriman Terbaru") tetap tampil semua role, konsisten dengan halaman
  `/dashboard/pengiriman` yang juga tidak menyembunyikan nominal per-invoice
- Grafik batang kiriman per hari, stacked per `jenis_layanan`
  (reguler/express/kargo)
- 5 pengiriman terbaru, `nomor_faktur` link ke `/dashboard/pengiriman/[id]`,
  badge milestone

### Pengiriman (`/dashboard/pengiriman`)

- Input pengiriman baru: pengirim, penerima, jenis layanan (reguler/express/kargo),
  berat + dimensi (berat volumetrik dihitung otomatis oleh DB), isi barang,
  nilai barang, ongkir, biaya asuransi, metode/status bayar, kurir/sopir, catatan
- **Pemilihan pengirim via customer terdaftar**: search-dropdown
  customer aktif (cari nama/telepon) di atas field Pengirim — pilih salah
  satu → `customer_id` ke-set + snapshot `pengirim_nama/telepon/alamat/kota`
  auto-fill dari master, **field snapshot tetap `<input>` biasa & bisa
  diedit lagi** setelahnya (edit tidak mengubah master). Ketik ulang di
  kolom cari setelah customer terpilih otomatis reset `customer_id`
  (balik ke mode walk-in) — field snapshot yang sudah terisi TIDAK ikut
  dihapus. Opsi "+ Customer baru" di bawah hasil pencarian membuka modal
  quick-add (nama + telepon + tipe saja, field lain dilengkapi belakangan
  di `/dashboard/customer`) dan langsung memilih customer yang baru dibuat.
- **Ongkir otomatis**: begitu kota asal+tujuan+berat+jenis layanan
  (reguler/express) terisi, form lookup `tarif_zona` dan auto-fill `ongkir`
  — tetap bisa di-override manual, dan kalau rute belum ada tarifnya form
  tidak diblokir (notice "isi manual"). Kargo selalu manual, tidak pernah lookup.
- `nomor_resi` auto-generate via `insertPengirimanWithResi()`
- Kartu ringkasan per milestone (Diproses/Dijemput/Dikirim/**Gagal Kirim**/
  **Retur**/Selesai — klik utk filter), kartu ringkasan belum lunas, filter
  tanggal + search + Export Excel
- Modal sukses resi setelah simpan → copy link tracking / kirim WA ke penerima
- Tombol pelunasan inline: `superadmin` | `kasir` | `keuangan`

### Detail Pengiriman (`/dashboard/pengiriman/[id]`)

- Full-page: info pengirim/penerima/barang, riwayat pembayaran, catatan internal
- **Milestone tracking bercabang** (lihat peta transisi lengkap & role di
  §Database Schema bagian `pengiriman`) — stepper visual tetap 4-node
  jalur sukses; saat `gagal_kirim`/`retur`, node diproses/dijemput/dikirim
  tampil selesai (hijau) dan status sebenarnya dijelaskan lewat banner
  merah/abu terpisah di bawahnya
- 3 modal aksi: **Tandai Gagal Kirim** (alasan wajib + catatan/foto
  opsional), **Tandai Selesai** (POD wajib: nama penerima aktual + foto),
  **Retur ke Pengirim** (terminal, catatan opsional)
- Badge `Nx Gagal Kirim` (merah jika ≥3) di panel status; blok "Bukti Serah
  Terima (POD)" tampil setelah `selesai`
- **Tombol Delete**: `superadmin` | `kasir` | `kurir` | `gudang` | `keuangan`
  di frontend (DB tetap ditolak untuk role selain `superadmin`/`keuangan`,
  lihat §RLS) — `DELETE` cascade ke tracking & pembayaran
- **Tombol Catat Pembayaran** + **Tandai Lunas** + **Rollback Pembayaran**
- Print invoice (`printPengirimanInvoice`) & cetak resi + QR (`printPengirimanResi`)
- **Section "Riwayat Transit"**: card terpisah dari Milestone tracking —
  daftar event (badge hijau "Tiba"/biru "Berangkat" + nama hub + kota +
  waktu + catatan + sumber "Input manual" atau "Otomatis via manifest
  MNF-..."), tampil untuk **semua staf** (read-only kalau tidak
  berwenang). Form tambah manual (dropdown hub/cabang + tipe event +
  catatan) hanya untuk `superadmin`/`gudang`/`kurir`/`sopir`. **Murni log
  paralel — tidak pernah mengubah milestone** di card sebelahnya.

### Tugas Saya (`/tugas`)

> Halaman mobile-first khusus role `sopir`/`kurir` — jalur lapangan untuk
> update milestone tanpa membuka `/dashboard/pengiriman/[id]` (desktop-
> oriented). **Bukan** di bawah `/dashboard` — route terpisah dengan layout
> sendiri (`app/tugas/layout.tsx`, TANPA Sidebar).

- Akses: role `sopir`/`kurir` saja (React, redirect role lain ke
  `/dashboard`); `middleware.ts` juga memproteksi `/tugas` seperti
  `/dashboard`
- **Redirect otomatis pasca-login**: `sopir`/`kurir` langsung ke `/tugas`
  setelah login sukses. `TUGAS_ROLES` (`lib/roles.ts`) jadi satu sumber
  kebenaran, dipakai baik oleh guard route (`app/tugas/layout.tsx`)
  maupun redirect di `app/login/page.tsx`
- **Tab "Aktif"** (default): `pengiriman` WHERE `petugas_id = auth.uid()`
  AND `milestone IN ('dijemput','dikirim','gagal_kirim')` — urut
  `gagal_kirim` → `dikirim` → `dijemput`. Kartu besar per kiriman: resi,
  penerima + kota, badge milestone, tombol **Gagal Kirim**/**Selesai**
  (hanya tampil saat `milestone = 'dikirim'`)
- **Tab "Selesai Hari Ini"**: read-only, dimulai dari query
  `pengiriman_tracking` (`milestone = 'selesai'`, `created_at` >= awal
  hari ini) baru di-cross-reference ke `pengiriman` milik petugas ini —
  BUKAN filter `pengiriman.milestone = 'selesai'` langsung
- **Aksi Gagal Kirim & Selesai** memanggil `submitGagalKirim()`/
  `submitSelesaiPOD()` dari `lib/pengirimanAksi.ts` — validasi identik
  `/dashboard/pengiriman/[id]`. Foto POD: kamera langsung aktif
  (`capture="environment"`), fallback pilih galeri tetap tersedia
- **Tap kartu** (bukan tombol aksi — tombol pakai `stopPropagation()`) →
  sheet detail ringkas: alamat lengkap tujuan + tombol **Telepon**
  (`tel:`) dan **WhatsApp** (`waLink()` existing)
- **Tanpa dukungan offline** (keputusan sadar) — gagal upload/network saat
  submit menampilkan error jelas + tombol coba lagi, form tidak direset
- **Keterbatasan yang diketahui, bukan bug**: kiriman dengan `petugas_id
  IS NULL` (opsi "Lainnya — Ketik Manual" di form `/dashboard/pengiriman`)
  **tidak muncul di `/tugas` siapa pun**
- **Tombol "Scan untuk Muat"**: entry-point sama dengan overlay scan di
  `/dashboard/manifest/[id]` (`components/ScanQRManifestOverlay.tsx`,
  komponen bersama). Manifest yang dipakai ditentukan **OTOMATIS**, bukan
  dipilih manual — lihat §Business Logic "Scan QR — Muat Manifest &
  Checklist".

### Booking Mandiri (`/booking/*`) — customer-facing

> Route TERPISAH dari `/dashboard`/`/tugas` — layout sendiri
> (`app/booking/layout.tsx`, TANPA Sidebar, mobile-first pola sama
> `/tugas`) tapi auth-nya beda sumber total, lihat §Auth & Role "Auth
> Customer — Booking Mandiri". `middleware.ts` **tidak** memproteksi rute
> ini (proteksinya client-side).

- `/booking/register`, `/booking/login`: form biasa + honeypot field
  tersembunyi (register) — lihat §Auth & Role untuk aturan keamanan
  lengkap (rate limit, bcrypt, pesan error generik).
- `/booking` (setelah login): riwayat gabungan `booking_request` +
  `pengiriman` milik customer (`/api/booking/riwayat`), badge status per
  booking (Menunggu/Dikonfirmasi/Ditolak — beserta alasan penolakan kalau
  ada), kiriman aktif klik → buka `/resi/[nomor]` (tab baru).
- `/booking/baru`: form booking — jenis layanan, data penerima, berat/
  dimensi, isi barang, nilai barang, catatan. **Field pengirim TIDAK
  editable** (ringkasan read-only dari data akun + link "Ubah di Profil")
  — konsisten dengan `/api/booking/submit` yang memang tidak pernah baca
  `pengirim_*` dari body sama sekali. Submit sukses → tampilkan estimasi
  ongkir (atau notice "akan dihubungi" utk kargo/rute tanpa tarif), TIDAK
  auto-redirect supaya customer sempat baca estimasi.
- `/booking/profil`: edit nama/telepon/alamat/kota sendiri
  (`PATCH /api/booking-auth/profil`) — email read-only (tidak bisa
  diubah dari sini, tidak ada alur ganti email di v1).
- **Tidak ada notifikasi push/WA** saat status booking berubah — customer
  harus buka `/booking` manual untuk cek.

### Booking Masuk (`/dashboard/booking`) — staf

> Role akses (lihat & proses): `superadmin`, `cs`, `kasir`, `keuangan` —
> sama dengan CRUD `customer`. RLS `booking_request` belum di-harden
> granular (lihat §RLS), jadi role gate ini murni app-level React.

- Filter tab status (Pending default/Dikonfirmasi/Ditolak/Semua). Sidebar:
  badge jumlah `pending` di nav "Booking Masuk" (fetch sekali per mount,
  bukan polling).
- **Konfirmasi**: modal form pre-filled dari `booking_request` (semua
  field editable, termasuk ongkir — reuse `lookupTarifOngkir()` LIVE sama
  persis form `/dashboard/pengiriman`, prefill awal dari
  `ongkir_estimasi`), metode/status bayar, kurir/sopir, cabang. Submit
  reuse `insertPengirimanWithResi()` yang sudah ada → `catatan_internal`
  otomatis berisi jejak balik ke `booking_request` id → `UPDATE
  booking_request` jadi `dikonfirmasi` + `pengiriman_id` →
  `logAktivitas('konfirmasi_booking')`.
- **Tolak**: alasan wajib diisi (`catatan_penolakan`) → `UPDATE
  booking_request` jadi `ditolak` → `logAktivitas('tolak_booking')`. Tidak
  ada `pengiriman` yang dibuat.

### Customer (`/dashboard/customer`)

- CRUD pola sama seperti Cabang/Tarif Zona: search nama/telepon/kota, badge
  tipe (Umum abu / Korporat biru), kolom term hari, toggle aktif. Field
  PIC (nama+telepon) hanya tampil di form saat tipe "Korporat" dipilih
- Klik baris → panel ringkas: total kiriman, total piutang (SUM sisa
  kiriman `status_bayar != 'lunas'`), daftar 10 kiriman terakhir
- Role CRUD (create/edit): `superadmin`, `cs`, `kasir`, `keuangan`. Role
  nonaktifkan/hapus (lebih sempit): `superadmin`, `keuangan`
- Hapus customer yang masih dipakai `pengiriman` gagal (FK constraint,
  pesan error mengarahkan nonaktifkan saja)
- Sidebar: nav flat "Customer" dekat "Pengiriman" (bukan collapsible)

### Tarif Zona (`/dashboard/tarif-zona`) — superadmin only

- CRUD tarif per pasangan kota asal-tujuan + jenis layanan (reguler/express saja)
- Field: harga per kg, minimum ongkir (floor), estimasi hari, toggle aktif/nonaktif
- Dipakai otomatis oleh form `/dashboard/pengiriman` — lihat kalkulasi di
  §"Entitas Expedisi" bagian `tarif_zona`

### Cabang (`/dashboard/cabang`) — superadmin only

- CRUD cabang: nama (unique), kota, alamat, telepon, catatan, toggle
  aktif/nonaktif
- Hapus cabang yang masih dipakai `pengiriman`/`armada`/`manifest` akan
  gagal (FK constraint) — nonaktifkan saja
- **Cuma label/filter** — dropdown "Cabang (opsional)" muncul di form
  `/dashboard/pengiriman`, `/dashboard/armada`, dan `/dashboard/manifest`
  (auto-fill dari armada terpilih, bisa di-override), plus filter cabang
  di list `/dashboard/pengiriman`. Tidak ada pembatasan akses staf per cabang

### Armada (`/dashboard/armada`) — superadmin + gudang

- CRUD kendaraan: plat nomor (unique), jenis kendaraan, kapasitas kg/m³,
  status (Tersedia/Maintenance/Nonaktif), sopir/kurir default (opsional)
- Grid card per kendaraan, search plat/jenis

### Manifest (`/dashboard/manifest`, `/dashboard/manifest/[id]`)

- List: filter status (Draft/Berangkat/Selesai/Batal), search nomor/rute/plat/sopir,
  jumlah kiriman per manifest
- Buat manifest baru → pilih armada (auto-prefill sopir default armada tsb,
  bisa diganti), sopir/kurir untuk trip ini, rute, tanggal berangkat → redirect ke detail
- Detail: edit info (armada/sopir/rute/tanggal, hanya saat status Draft),
  tambah kiriman (search nomor faktur/resi/nama penerima — kiriman
  bermilestone `diproses`/`dijemput`/**`gagal_kirim`** & belum ada di
  manifest aktif lain), hapus kiriman dari manifest (hanya saat Draft)
- **Scan QR untuk tambah kiriman**: tombol "Scan QR" di samping search box
  → overlay kamera fullscreen (`@zxing/browser`, komponen
  `components/ScanQRManifestOverlay.tsx`, **dipakai bersama** `/tugas`) —
  lihat §Business Logic "Scan QR — Muat Manifest & Checklist" untuk alur
  lengkap.
- **Checklist "sudah dicek" (opsional)**: lihat §Business Logic — murni
  `useState<Set>`, tidak ada kolom DB.
- **Tombol Berangkat**, **Tandai Selesai**, **Batalkan**: lihat §Database
  Schema bagian `armada`/`manifest`/`manifest_item` untuk perilaku
  lengkap tiap tombol.
- **Section "Biaya Trip"**: daftar baris biaya (badge kategori, jumlah,
  keterangan, foto, siapa & kapan) + form tambah inline. Input:
  `superadmin`/`gudang`/`sopir`/`kurir`/`keuangan`. Edit/hapus (koreksi):
  `superadmin`/`keuangan` only. Panel ringkas Revenue/Total Biaya/Laba
  (margin % merah kalau negatif) — panel ini **hanya render untuk
  `superadmin`/`keuangan`**, role lain tetap lihat daftar & Total Biaya
  polos. Lihat §Business Logic "Biaya Trip & Laba per Manifest" untuk
  formula lengkap.

### Setoran COD (`/dashboard/cod`)

- Kartu ringkasan per sopir/kurir: Estimasi COD Terkumpul, Total Setoran,
  Sisa Saldo (estimasi) — lihat disclaimer perhitungan di §Business Logic
- Filter petugas + rentang tanggal, riwayat setoran dengan foto bukti
- Modal "Catat Setoran": pilih sopir/kurir (prefill diri sendiri kalau
  yang login role `sopir`/`kurir`), jumlah, tanggal, catatan, foto opsional
- Role input: `superadmin` | `keuangan` | `kurir` | `sopir`. Role
  edit/hapus: `superadmin` | `keuangan`

### Klaim (`/dashboard/klaim`)

- Filter status (Semua/Pending/Disetujui/Ditolak/Selesai) + tipe
  (Hilang/Rusak), search nomor klaim/resi/penerima
- Modal "Lapor Klaim": search + pilih pengiriman terkait (nomor
  faktur/resi/nama penerima), pilih tipe, isi nilai klaim + kronologi,
  foto bukti opsional — bisa dibuat oleh staf role manapun
- Modal "Proses Klaim" (khusus superadmin): isi nilai disetujui + catatan,
  tombol Setujui/Tolak
- Tombol "Tandai Selesai" (superadmin/keuangan, saat status Disetujui) —
  set `status='selesai'` **dan** `selesai_at` dalam update yang sama,
  basis cash-basis Laporan Keuangan
- Hapus klaim: superadmin only

### Pencatatan Pengeluaran (`/dashboard/keuangan/pengeluaran`)

- Role: `superadmin`/`keuangan` (RLS + React)
- Form: kategori dari daftar baru (`PENGELUARAN_KATEGORI_CFG` di
  `lib/pengirimanConstants.ts`) — pilih `maintenance_armada`/
  `pajak_armada` → dropdown Armada **wajib muncul & wajib diisi**
  (`setFormError`, blocking save, **app-level only, bukan DB CHECK**);
  kategori lain → dropdown armada tersembunyi & `armada_id` di-reset ke
  kosong otomatis saat ganti kategori. Cabang opsional. Foto nota
  opsional (upload sebelum insert, path pakai UUID acak)
- Filter: periode (dari-sampai), kategori (via chip breakdown, dinamis
  dari data), Armada (dropdown)
- Kolom tabel: Armada (plat nomor via join, `-` kalau kosong)

### Laporan Keuangan (`/dashboard/keuangan/laporan`)

- Role: `superadmin`/`keuangan`
- Filter: bulan/tahun (dropdown) + cabang
- 3 stat card: Pemasukan / Beban (total 3 kelompok) / Neto — lihat
  formula lengkap di §Business Logic "Peta Sumber Angka & Cash Basis"
- Breakdown Pemasukan per metode pembayaran (Transfer/COD/Cash)
- Rincian Beban: 3 kelompok collapsible terpisah — **Pengeluaran**
  (breakdown kategori, link "kelola" ke halaman Pengeluaran), **Biaya
  Trip** (breakdown kategori, **READ-ONLY**, link "kelola di Manifest"),
  **Klaim** (**READ-ONLY**, link "kelola di Klaim") — angka klaim & biaya
  trip tidak pernah bisa diedit dari halaman ini
- Grafik tren 12 bulan (Pemasukan vs Beban, bar chart) — trailing dari
  bulan/tahun yang dipilih di filter
- Tabel "Biaya per Armada" — basis `pengeluaran.armada_id`, **beda** dari
  Laporan Laba per Trip (basis `manifest_biaya`)

### Tracking Publik (`/resi/[nomor]`)

- Halaman tanpa auth untuk customer
- Step indicator milestone 4-tahap (diproses → dijemput → dikirim → selesai)
- **Banner gagal/retur**: kalau milestone saat ini `gagal_kirim` → banner
  kuning "Pengiriman Gagal — akan dijadwalkan ulang / menunggu keputusan"
  + alasan (label ramah customer); kalau `retur` → banner abu terminal
  "Dikembalikan ke Pengirim". Stepper tetap tampil jalur sukses sampai
  node "Dikirim" sebagai selesai (hijau)
- Badge jenis layanan (Reguler/Express/Kargo)
- Riwayat update + foto per milestone (termasuk `alasan_gagal` dengan label
  ramah customer untuk baris Gagal Kirim), lightbox foto
- **Timeline gabungan**: section "Riwayat Update" menggabung milestone
  (`pengiriman_riwayat_publik`) + transit (`pengiriman_transit_publik`),
  digabung & diurutkan `created_at` di level aplikasi (dua query +
  `.sort()` JS, bukan `UNION` di DB). Entri transit tampil dengan label
  "Tiba di [kota]"/"Berangkat dari [kota]", ikon panah masuk/keluar —
  tidak pernah nama cabang/alamat. Stepper 4-tahap tetap kerangka utama,
  transit murni baris tambahan di riwayat
- Data dari view `pengiriman_publik` + `pengiriman_riwayat_publik` +
  `pengiriman_transit_publik`

### Laporan Petugas (`/dashboard/laporan/sopir`)

> Role akses: `superadmin`, `keuangan`, `cs`.

- Filter periode + cabang. Podium top 3 & tabel peringkat lengkap
  (medali, progress bar) — basis ranking tetap total kiriman ditangani
- Agregasi basis `pengiriman.petugas_id`; baris `petugas_id IS NULL`
  dikumpulkan jadi bucket **"Tanpa Petugas Terdaftar"**, ditampilkan
  terpisah di baris akhir tabel (bukan ikut podium/ranking)
- Kolom metrik per petugas: **Total Kiriman**, **Selesai**, **Gagal Kirim**
  (SUM `jumlah_gagal` — total kejadian gagal, bukan cuma status akhir
  sekarang), **Retur**, **On-time Rate** (lihat definisi terlambat di
  §Database Schema bagian Petugas FK & Definisi Terlambat)

### Laporan Keterlambatan (`/dashboard/laporan/keterlambatan`)

> Role akses: `superadmin`, `keuangan`, `cs`.

- 3 stat card: **Terlambat Aktif** (kiriman belum selesai/retur, sudah
  lewat batas estimasi), **Terlambat Selesai** (selesai tapi lewat batas),
  **On-time Rate Keseluruhan**
- Tabel kiriman terlambat: Resi (link ke detail pengiriman), Penerima Kota,
  Petugas, Status (Aktif/Selesai), Umur vs Estimasi, Selisih Hari — default
  sort selisih hari terbesar. Hanya baris yang benar-benar terlambat yang
  tampil (kiriman aktif yang belum lewat batas TIDAK muncul di tabel,
  meski masih dalam proses)
- Filter periode + cabang + jenis layanan
- Kiriman `retur` dan baris `estimasi_hari` NULL (kargo/rute tanpa tarif)
  dikecualikan total dari laporan ini (bukan terlambat, bukan on-time)

### Piutang (`/dashboard/piutang`)

> Role akses (termasuk pelunasan massal & cetak rekap): `superadmin`,
> `keuangan`, `kasir`.

- Snapshot LIVE (bukan periode terpilih) dari semua `pengiriman` dengan
  `status_bayar != 'lunas'`, termasuk `retur` (ongkir retur tetap ditagih)
- 4 stat card aging bucket (nominal + jumlah kiriman): Belum Jatuh Tempo,
  1–7 Hari, 8–30 Hari, > 30 Hari
- Tabel per customer (nama + badge tipe, jumlah kiriman, total sisa,
  sebaran nominal per bucket, tanggal kiriman tertua) — sort default total
  sisa terbesar. Kiriman `customer_id` NULL dikumpulkan jadi baris
  "Walk-in / Tanpa Customer"
- Klik baris → drill-down: daftar kiriman belum lunas (resi→link ke detail,
  tagihan/terbayar/sisa, badge bucket), checkbox + "Pilih Semua" +
  **Pelunasan Massal** (lihat §Business Logic), tombol **Cetak Rekap
  Tagihan** (`lib/printTagihanCustomer.ts`, format A4)

### Laporan Laba per Trip (`/dashboard/laporan/laba-trip`)

> Role akses: `superadmin`, `keuangan`.

- Filter periode (`tanggal_berangkat`) + cabang + status manifest
- 4 stat card: Total Trip, Total Revenue, Total Biaya, Total Laba (merah
  kalau negatif)
- Tabel per manifest: nomor (link ke detail manifest), status+tanggal,
  rute, armada+sopir, jumlah kiriman, revenue, biaya, laba, margin %
  (merah kalau negatif) — sort default **laba terkecil** (trip rugi
  muncul duluan)
- Klik baris → expand inline (bukan modal) menampilkan breakdown biaya
  per kategori untuk trip tsb
- Lihat §Business Logic "Biaya Trip & Laba per Manifest" untuk formula
  revenue/laba lengkap

### Pengguna (`/dashboard/pengguna`) — Superadmin Only

Daftar user, tambah via `/api/create-user` dengan `SUPABASE_SERVICE_ROLE_KEY`.

---

## Known Issues & Gotchas

1. **Turbopack & @opentelemetry/api** → `npm install @opentelemetry/api`
2. **Generated column tidak bisa diupdate via REST API** → pakai column biasa + update via function (lihat `pengiriman.berat_volumetrik_kg`)
3. **Nomor faktur/resi tidak reset per hari** → sequence global naik terus (by design)
4. **`metode_bayar` tidak berubah saat pelunasan** → disengaja, setiap termin masuk ke `pengiriman_pembayaran`
5. **Auth flash / sidebar kosong sebentar** → pastikan tidak membuat `init()` + `onAuthStateChange` paralel; `setLoading(false)` harus dipanggil setelah profile di-set
6. **Upload foto gagal (403)** → tambahkan storage policies untuk bucket `BungaNaik`
7. **Tracking resi "Tidak Ditemukan"** → pastikan view `pengiriman_publik`/`pengiriman_riwayat_publik` sudah dibuat + `GRANT SELECT TO anon`
8. **`CREATE OR REPLACE VIEW` gagal** jika kolom berubah → `DROP VIEW IF EXISTS` dulu baru recreate
9. **`PromiseLike` vs `Promise`** — Supabase insert/update return `PostgrestFilterBuilder` (thenable bukan Promise penuh) → gunakan `PromiseLike<any>[]` bukan `Promise<any>[]`
10. **Dropdown terpotong di dalam tabel** → tabel pakai `overflow-hidden`; solusi: ganti dropdown dengan inline icon buttons
11. **`createClient()` dipanggil di banyak komponen** → aman, sudah singleton — semua panggilan kembalikan instance yang sama
12. **Absensi selalu gagal "wajah tidak terdeteksi"** → pastikan folder `public/models` berisi file model `face-api.js` (tiny_face_detector, face_landmark_68, face_recognition) — tanpa ini model gagal dimuat dari `/models`
13. **Absensi ditolak walau di lokasi kantor** → pastikan `owner_settings.absensi_lat/lng/radius_meter` sudah diisi lewat tab Pengaturan Lokasi; radius terlalu kecil juga bisa menolak GPS phone yang akurasinya rendah
14. **Build warning `Can't resolve 'fs'/'encoding'`** dari `face-api.js`/`node-fetch` → aman diabaikan, itu kode fallback Node.js yang tidak dipakai di browser
15. **POD (`pod_penerima_nama`/`pod_foto_url`) bisa kosong walau milestone `selesai`** → wajib-nya POD di-enforce di **level aplikasi** (tombol Simpan disabled di modal), **bukan** constraint DB — kalau ada API/jalur lain yang update `pengiriman.milestone = 'selesai'` langsung (SQL manual, script, dsb), validasi ini terlewati sepenuhnya
16. **Kiriman lama tidak muncul di Laporan Petugas/Keterlambatan sesuai ekspektasi** → cek `petugas_id`/`estimasi_hari` terisi atau tidak; baris `petugas_id NULL` masuk bucket "Tanpa Petugas Terdaftar" (Laporan Petugas) dan baris `estimasi_hari NULL` dikecualikan total dari Laporan Keterlambatan (bukan bug, by design)
17. **Pelunasan Massal berhenti di tengah (sebagian kiriman terupdate, sisanya belum)** → loop `insert`+`update` per kiriman **bukan satu transaksi DB** (client-side, bukan RPC) — kalau salah satu baris gagal (mis. network putus), baris sebelumnya di loop yang sama sudah terlanjur tercatat lunas. Cek manual `pengiriman_pembayaran`/`status_bayar` kiriman yang tersisa di drill-down, lalu ulangi hanya untuk yang belum
18. **Mengubah `customer.term_hari` mengubah jatuh tempo kiriman LAMA juga** → disengaja (snapshot bukan di kolom `pengiriman`, term diambil dari master saat query) — kalau butuh histori term yang tidak berubah-ubah, itu di luar scope
19. **Hapus manifest gagal dengan FK violation error** → manifest tsb masih punya baris `manifest_biaya` (FK sengaja `NO ACTION`, bukan CASCADE) — hapus/pindahkan dulu catatan biayanya secara sadar, **jangan ubah FK jadi CASCADE**
20. **Laba trip di Laporan Laba per Trip tidak termasuk `biaya_asuransi`** → disengaja (Revenue trip = `ongkir` saja, bukan `total_tagihan`) — lihat §Business Logic "Biaya Trip & Laba per Manifest" untuk rasionalnya
21. **Insert ke tabel yang RLS SELECT-nya lebih sempit dari RLS INSERT-nya gagal dengan error RLS generik, padahal insert-nya sendiri sah** → itu gotcha `RETURNING`+RLS (lihat §RLS): kalau kode minta row balik (`.select()`/`Prefer: return=representation`), Postgres ikut mensyaratkan SELECT policy lolos juga. Solusi: jangan minta `RETURNING` kalau pemanggilnya tidak dijamin lolos SELECT policy tabel tsb (khususnya `aktivitas_log`, yang SELECT-nya dibatasi `superadmin`/`keuangan` tapi INSERT-nya terbuka semua staf)
22. **Role `kasir`/`gudang`/`kurir` klik tombol Delete pengiriman tapi gagal/tidak ada efek** → DELETE `pengiriman` di DB cuma `superadmin`/`keuangan` — tombol di frontend sengaja tidak disembunyikan untuk role lama (breaking change diterima sadar), bukan bug. Lihat §RLS
23. **Kolom "Staf" di `/dashboard/aktivitas` kosong utk beberapa baris padahal login sebagai keuangan** → kemungkinan `get_staf_aktivitas()` belum di-deploy/`NOTIFY pgrst, 'reload schema'` belum jalan setelah migration — RLS `profiles` bawaan tidak cukup utk keuangan resolve nama staf lain (lihat §RLS), halaman ini WAJIB lewat RPC itu, bukan join langsung ke `profiles`
24. **Klaim yang sudah `disetujui` tidak muncul sebagai beban di Laporan Keuangan** → disengaja (by design, bukan bug) — beban klaim basisnya `selesai_at`, bukan `approved_at`/tanggal kejadian. Klaim harus ditandai "Selesai" dulu (bukan cuma disetujui) baru masuk periode beban manapun
25. **Kategori pengeluaran lama tampil dengan badge abu generik, bukan warna kategori yang sesuai** → disengaja, `KATEGORI_COLORS`/`PENGELUARAN_KATEGORI_CFG` cuma mendefinisikan 8 kode baru (snake_case) — kategori lama (capitalized, bebas teks, tidak ada CHECK constraint) tidak dipetakan ulang, tampil apa adanya
26. **Kiriman tidak muncul di `/tugas` sopir/kurir manapun padahal sudah `dijemput`/`dikirim`** → cek `petugas_id` kiriman tsb, kemungkinan `NULL` (dipilih "Lainnya — Ketik Manual" di form pengiriman alih-alih staf terdaftar). Bukan bug — kiriman `petugas_id NULL` sengaja tidak tampil di halaman siapa pun, harus dikelola dari `/dashboard/pengiriman` biasa
27. **Kiriman yang baru selesai hari ini tidak muncul di tab "Selesai Hari Ini" `/tugas`** → tab itu query `pengiriman_tracking.created_at` (bukan `pengiriman.updated_at`) untuk baris milestone `selesai` — pastikan insert ke `pengiriman_tracking` benar-benar terjadi (lewat `submitSelesaiPOD()` di `lib/pengirimanAksi.ts`, bukan update `pengiriman.milestone` langsung)
28. **Overlay Scan QR tidak minta izin kamera sama sekali / langsung error di HP** → `getUserMedia` butuh secure context (HTTPS atau `localhost`) — akses lewat `http://<ip-lan>:port` dari HP TIDAK akan memicu prompt izin kamera di browser modern. Untuk uji di HP asli: jalankan `next dev --experimental-https` (butuh approve `mkcert -install` sekali di keychain Mac), atau pakai tunnel HTTPS
29. **Tombol "Scan untuk Muat" di `/tugas` selalu disabled ("Tidak ada manifest aktif hari ini") padahal sopir sudah ditugaskan** → cek `manifest.sopir_id` (harus persis `profile.id` sopir tsb, BUKAN `armada.sopir_id` default) DAN `manifest.tanggal_berangkat` (harus = hari ini) DAN `manifest.status` (harus `draft`/`berangkat`, bukan `selesai`/`batal`) — ketiganya harus cocok bersamaan
30. **Checklist "sudah dicek" di `/dashboard/manifest/[id]` hilang setelah reload halaman** → disengaja (by design, bukan bug) — checklist murni state lokal browser, tidak pernah disimpan ke DB
31. **Manifest Berangkat sukses tapi tidak ada Riwayat Transit yang muncul di kiriman anggotanya** → cek `manifest.cabang_id` — kalau NULL, insert transit otomatis memang DILEWATI TOTAL by design. Isi `cabang_id` manifest-nya kalau memang butuh event "berangkat" tercatat
32. **Event "tiba" tidak pernah muncul otomatis, harus selalu input manual** → disengaja (by design, bukan bug) — manifest tidak punya transisi status yang merepresentasikan "tiba di hub", cuma "berangkat" yang otomatis dari tombol Berangkat manifest. Staf hub penerima input manual dari `/dashboard/pengiriman/[id]`
33. **Riwayat Transit di `/resi/[nomor]` urutannya tampak salah/tidak berurutan** → cek jam server saat insert (`created_at` masing-masing baris) — timeline digabung & diurutkan murni berdasarkan `created_at`, TIDAK ada validasi urutan tiba/berangkat di level input (sengaja longgar), jadi staf yang input belakangan/salah urutan akan tampil apa adanya sesuai waktu insert sebenarnya
34. ~~Staf role `cs` konfirmasi booking mandiri dengan status_bayar dp/lunas, tapi "Riwayat Pembayaran" di detail pengiriman kosong~~ → **FIXED** (`supabase/migrations/20260720300000_fix_cs_pengiriman_pembayaran.sql`) — `cs` sekarang masuk RLS INSERT `pengiriman_pembayaran`. Lihat §RLS untuk detail. Kalau masih kejadian setelah migration ini di-apply, cek migration benar-benar jalan (`SELECT policyname, with_check FROM pg_policies WHERE tablename='pengiriman_pembayaran' AND policyname='insert_pengiriman_pembayaran'` harus menunjukkan `cs` di array)
35. **`/booking/*` selalu redirect ke `/booking/login` walau `BOOKING_JWT_SECRET` sudah diisi** → cek endpoint `/api/booking-auth/me` langsung (harus `{authenticated:true,...}` setelah login) — kalau selalu `false`, kemungkinan `BOOKING_JWT_SECRET` beda antara saat token di-sign (`signBookingSession()`) dan saat diverifikasi (`verifyBookingSession()`), mis. env var berubah setelah customer login (invalidate semua sesi booking aktif, ini efek samping yang diterima — bukan bug)
36. **Registrasi/login booking mandiri kena "Terlalu banyak percobaan" padahal baru sekali coba** → `lib/bookingRateLimit.ts` pakai backstop GLOBAL topology-independent (bukan cuma per-IP/per-email) yang bisa terpicu penyerang lain dari IP manapun (lihat §Auth & Role "Auth Customer" poin 3) — cek log/waktu, tunggu window reset (register 5 menit, login 5 menit), atau restart server (state in-memory, hilang tiap restart)
37. **`supabase-js` `.delete()`/`.update()` tidak mengembalikan error walau RLS memblokir & 0 baris benar-benar berubah** → RLS `USING` clause pada DELETE/UPDATE cuma memfilter baris mana yang "terlihat" untuk operasi itu; kalau baris target tidak lolos filter, Postgres/PostgREST tetap balas sukses dengan 0 baris terpengaruh, BUKAN error (beda dari INSERT yang gagal `WITH CHECK` — itu genuinely error). Kalau perlu memastikan sebuah DELETE/UPDATE benar-benar mengenai baris (bukan cuma "tidak error"), pakai `{ count: 'exact' }` dan cek `count`, atau `.select()` lalu cek panjang array hasil — jangan cuma percaya `!error`

---

## Roadmap

### Prioritas Tinggi

- [ ] **Export laporan ke Excel/PDF**

### Prioritas Sedang

- [ ] **Cetak faktur PDF** via `@react-pdf/renderer`

### Prioritas Rendah

- [ ] **Integrasi WhatsApp notifikasi** — termasuk notifikasi status
      booking mandiri (dikonfirmasi/ditolak), butuh provider WA Business
      API pihak ketiga berbayar yang belum dipilih
- [ ] **Mobile app (PWA)**

### Sudah Selesai

> Ringkas — detail lengkap tiap fase ada di `expedisi.md` §7 dan
> `docs/spec/archive/*.md`. Fitur/aturan yang masih berlaku sudah
> didokumentasikan penuh di section-section di atas; di sini cuma jejak
> kapan & apa yang berubah.

- [x] **Fase 17 — Pembersihan Final Furniture** (20 Jul 2026) — 11 tabel
      furniture terakhir (`produk`, `produk_foto`, `resellers`,
      `penjualan`, `penjualan_item`, `penjualan_pembayaran`,
      `reseller_reviews`, `mutasi_stok`, `purchase_orders`,
      `purchase_order_items`, `tracking_progress`) yang di Fase 16
      sengaja dipertahankan sudah di-DROP permanen — bisnis furniture
      resmi tidak dipakai lagi. Ikut dihapus: 2 tabel Owner Workspace
      (`owner_reminders`, `audit_log`), 2 view legacy pra-pivot
      (`tracking_publik`, `tracking_riwayat_publik`, ditemukan saat
      migration — dependency tak terduga terhadap tabel yang di-drop),
      3 key furniture di `owner_settings`. Halaman & lib yang ikut
      dihapus: `/dashboard/{penjualan,pos,owner/workspace,keuangan/workspace,
      laporan/review,laporan/wilayah}`, `/auth/login` (dead code
      pra-pivot), `lib/{printInvoice,printResi}.ts`. Backup pg_dump di
      `docs/backup/furniture-final-20260720.sql` (13 tabel, diverifikasi
      full restore ke scratch DB — row count cocok persis). `owner_settings`
      **dipertahankan** (masih dipakai konfigurasi absensi).
- [x] **Fase 16 — Pembersihan** (20 Jul 2026) — 14 tabel furniture LAIN
      (HPP produksi, chat widget, reseller portal/pengumuman/CRM
      pelanggan, target penjualan, pencocokan nota) di-DROP permanen +
      halaman terkait dihapus (`/dashboard/{produk,gudang,reseller,
      pengumuman,pelanggan,po,target,pencocokan,stock-aging,hpp/*}`,
      katalog publik, reseller portal, chat widget). Backup:
      `docs/backup/furniture-pembersihan-20260720.sql`.
- [x] **Booking Mandiri — Self-Service Customer** (20 Jul 2026) —
      customer punya akun sendiri, TERPISAH TOTAL dari Supabase Auth
      (lihat §Auth & Role). Tabel `booking_request` + kolom
      `customer.email`/`password_hash`. Spec: `docs/spec/10-booking-mandiri.md`.
- [x] **Pivot Expedisi Fase 1-5** (17-18 Jul 2026) — entitas `pengiriman`
      baru (terpisah dari `penjualan` lama, sudah di-DROP di Fase 17),
      pricing engine (`tarif_zona`), manifest & armada, COD & klaim,
      cabang. Lihat `expedisi.md` §7.
- [x] **Gagal Kirim, Retur & POD** (18 Jul 2026) — 2 milestone baru,
      peta transisi bercabang, POD wajib (app-level). Spec:
      `docs/spec/archive/01-gagal-kirim-pod.md`.
- [x] **Petugas FK, Dashboard & Laporan Operasional** (18 Jul 2026) —
      `pengiriman.petugas_id`/`estimasi_hari`, dashboard utama rewrite
      ke `pengiriman`, Laporan Petugas, Laporan Keterlambatan. Spec:
      `docs/spec/archive/02-petugas-id-dashboard.md`.
- [x] **Master Customer, Piutang Aging & Tagihan Korporat** (18 Jul 2026)
      — tabel `customer`, halaman Customer & Piutang. Spec:
      `docs/spec/archive/03-customer-korporat.md`.
- [x] **Biaya Trip Manifest & Laporan Laba per Trip** (18 Jul 2026) —
      `manifest_biaya`, Laporan Laba per Trip. Spec:
      `docs/spec/archive/04-biaya-trip.md`.
- [x] **Hardening RLS Tabel Finansial & Audit Trail** (18 Jul 2026) —
      `user_has_role()`, tabel `aktivitas_log`, RLS dipersempit per-operasi
      untuk 7 tabel finansial. Spec: `docs/spec/archive/05-hardening-rls.md`.
- [x] **Perombakan Pengeluaran & Laporan Keuangan Expedisi** (18 Jul 2026)
      — cash basis, tanpa pencatatan ganda (lihat §Business Logic "Peta
      Sumber Angka & Cash Basis"). Spec: `docs/spec/archive/06-keuangan-expedisi.md`.
- [x] **Tugas Saya — Halaman Mobile Kurir/Sopir** (19 Jul 2026) — route
      `/tugas`, `lib/pengirimanAksi.ts`. Spec:
      `docs/spec/archive/07-tugas-saya-mobile.md`.
- [x] **Scan QR Resi — Muat Manifest & Checklist** (19 Jul 2026) —
      `@zxing/browser`, `lib/manifestAksi.ts`,
      `components/ScanQRManifestOverlay.tsx`. Spec:
      `docs/spec/archive/08-scan-qr-manifest.md`.
- [x] **Riwayat Transit Multi-Hub** (19 Jul 2026) — tabel
      `pengiriman_transit`, terpisah total dari milestone. Spec:
      `docs/spec/archive/09-transit-hub.md`.
- [x] Review & komplain, Laporan Wilayah/Penjualan (arsip furniture,
      dihapus Fase 17) — sudah tidak ada padanan aktif untuk `pengiriman`.
- [x] **Absensi Karyawan** (`/dashboard/absensi`) — verifikasi wajah
      client-side (`face-api.js`, tanpa upload foto) + geofencing
      (`lib/geo.ts`)
- [x] **Multi-role system** — superadmin, kasir, keuangan, cs, gudang,
      kurir, sopir
- [x] **Fix auth race condition** — singleton `createClient()`, hanya
      `onAuthStateChange`, skip `TOKEN_REFRESHED`
- [x] **Fix Sidebar render** — `NavLink`/`SubNavLink` di luar komponen

---

## Development Commands

```bash
npm install
npm run dev          # Turbopack sudah dikonfigurasi di package.json
npm run build
npm install @opentelemetry/api   # jika ada error module not found
```

---

-- Manifest yang masih punya biaya (cek dulu sebelum coba hapus manifest)
SELECT DISTINCT m.nomor_manifest
FROM manifest m JOIN manifest_biaya b ON b.manifest_id = m.id;
```

---

## Hal-hal yang JANGAN Dilakukan

1. **Jangan ubah format `nomor_faktur`/`nomor_resi`** — sudah ada data production di `pengiriman`
2. **Jangan matikan RLS** — gunakan policy per tabel (lihat §RLS)
3. **Jangan generate file lengkap saat diminta fix** — snippet saja kecuali diminta eksplisit
4. **Jangan pakai `alert()` untuk error** — gunakan `setFormError()` inline di modal
5. **Jangan overwrite `pengiriman.metode_bayar` saat pelunasan** — metode pertama, setiap termin baru masuk `pengiriman_pembayaran`
6. **`pengiriman.total_tagihan` = `ongkir + biaya_asuransi`** — pastikan konsisten saat baca/tulis
7. **Jangan hapus cookie `sb-*` tanpa redirect ke `/login`**
8. **Jangan buat WA link manual** — selalu gunakan `waLink()` dari `@/lib/utils`
9. **Jangan `CREATE OR REPLACE VIEW` jika struktur kolom berubah** — selalu `DROP VIEW IF EXISTS` dulu (berlaku untuk `pengiriman_publik`/`pengiriman_riwayat_publik`/`pengiriman_transit_publik`)
10. **Jangan buat `init()` + `onAuthStateChange` berjalan paralel di AuthContext** — hanya gunakan `onAuthStateChange` (termasuk `INITIAL_SESSION`)
11. **Jangan pindahkan `NavLink`/`SubNavLink` ke dalam komponen `Sidebar`** — harus di luar agar referensi stabil dan tidak unmount/remount tiap render
12. **Jangan expose `pengirim_*`, `penerima_telepon`/`penerima_alamat` (selain kota), `nilai_barang`, breakdown `ongkir`/`biaya_asuransi`, `petugas_nama`/`petugas_telepon`, `catatan_internal`, `nomor_faktur`, data `customer` (nama/telepon/alamat/PIC/term_hari) di views publik manapun** — lihat §Views Publik untuk daftar lengkap
13. **Jangan buat logika yang memblokir milestone `pengiriman` berdasarkan status pencocokan/audit apapun** — audit selalu terjadi setelah proses, bukan approval sebelum proses
14. **Jangan hapus kolom `petugas_nama`/`petugas_telepon`** — tetap dipakai sebagai snapshot display (print resi/invoice, baris lama sebelum `petugas_id` ada) meski `petugas_id` sudah jadi sumber kebenaran utama untuk matching COD & laporan petugas
15. **Jangan hapus kolom `pengirim_*`** — tetap snapshot per kiriman meski `customer_id` terisi (alamat jemput bisa beda per transaksi dari alamat master customer)
16. **Jangan buat backfill otomatis `customer_id` dari `pengirim_nama`/`pengirim_telepon` data lama** — keputusan sengaja: pencocokan otomatis rawan duplikat kotor (typo, nama sama beda orang); biarkan `NULL`, staf isi manual secara organik
17. **Jangan buat pelunasan massal mendukung alokasi sebagian ke beberapa kiriman** — selalu bayar penuh sisa per kiriman terpilih; bayar sebagian tetap lewat pelunasan satuan yang sudah ada
18. **Jangan ubah FK `manifest_biaya.manifest_id` jadi `ON DELETE CASCADE`** — sengaja `NO ACTION`, biaya trip adalah catatan finansial yang tidak boleh hilang diam-diam saat manifest induknya dihapus
19. **Jangan rekap ulang biaya trip (`manifest_biaya`) secara manual ke modul Pengeluaran** — dua sumber pencatatan untuk biaya yang sama tanpa aturan ini menghasilkan angka keuangan ganda; biaya trip HANYA dicatat di `manifest_biaya`
20. **Jangan tambah kolom agregat (revenue/biaya/laba) di tabel `manifest`** — Revenue & Laba trip selalu dihitung saat query (SUM `pengiriman.ongkir` via `manifest_item`, SUM `manifest_biaya.jumlah`), bukan snapshot/kolom tersimpan
21. **Jangan tambah policy sempit di tabel yang masih punya `auth_all_*` FOR ALL tanpa men-`DROP` yang lama dulu** — policy Postgres bersifat PERMISSIVE (di-OR), jadi policy lama akan tetap meloloskan semua dan policy baru TIDAK ADA EFEK sama sekali. Lihat §RLS untuk pola migration hardening yang benar
22. **Jangan tambah policy UPDATE/DELETE ke `aktivitas_log`** — sengaja immutable (append-only) kecuali `service_role`, ini bukan kelalaian
23. **Jangan panggil `.insert(...).select()` (atau apa pun yang minta `RETURNING`) di `logAktivitas()`/insert ke `aktivitas_log`** — `select_aktivitas_log` dibatasi `superadmin`/`keuangan`, jadi RETURNING akan gagal utk role lain meski insert-nya sendiri sah (lihat gotcha di §RLS)
24. **Jangan longgarkan `profiles_select` secara umum supaya `keuangan` bisa baca semua profil** — kalau butuh resolve nama staf lain untuk role `keuangan` di halaman baru, buat function `SECURITY DEFINER` sempit (pola `get_staf_aktivitas()`) yang HANYA expose kolom yang dibutuhkan, jangan buka akses penuh ke tabel `profiles`
25. **Jangan catat ulang `manifest_biaya` atau `klaim` (nilai_disetujui) sebagai baris baru di `pengeluaran`** — aturan anti-dobel final: Laporan Keuangan MEMBACA kedua tabel itu lewat query gabungan saat dibuka, tidak pernah menyalin datanya. "Sinkronkan ke pengeluaran saat klaim selesai" adalah pendekatan yang secara eksplisit ditolak — kalau muncul lagi sebagai ide "solusi termudah", itu salah
26. **Jangan pindahkan biaya maintenance armada (termasuk yang terjadi di tengah trip) ke `manifest_biaya`** — SEMUA maintenance armada, kapan pun terjadinya, masuk `pengeluaran` dengan `armada_id` (kategori `maintenance_armada`/`pajak_armada`). `manifest_biaya` khusus habis-pakai perjalanan (uang jalan/BBM/tol/kuli/parkir)
27. **Jangan tambah kolom `cabang_id` ke `klaim`** hanya supaya Laporan Keuangan bisa filter klaim per cabang — di luar scope. Klaim di Laporan Keuangan sengaja tidak difilter cabang, itu keterbatasan yang diterima sadar, bukan bug untuk "diperbaiki"
28. **Jangan ubah format/isi QR di `printPengirimanResi`** (tetap `nomor_resi` polos, bukan JSON/URL) — breaking change ke semua resi yang sudah tercetak dan beredar di lapangan
29. **Jangan buat jalur INSERT `manifest_item` baru di luar `addManifestItem()` (`lib/manifestAksi.ts`)** — itu satu-satunya jalur insert, dipakai bersama search manual & scan QR di kedua halaman (`/dashboard/manifest/[id]` dan `/tugas`). Begitu juga validasi eligibility: selalu lewat `findEligibleCandidates()`/`scanLookupManifest()`, jangan tulis query exclude dobel-manifest/milestone yang serupa di tempat lain
30. **Jangan campur `@zxing/browser` dengan library scan QR lain** (mis. `html5-qrcode`) di halaman/komponen manapun — satu library terpilih untuk seluruh fitur scan, konsisten di `components/ScanQRManifestOverlay.tsx`
31. **Jangan simpan checklist "sudah dicek" ke kolom/tabel DB** — sengaja state lokal browser murni (`useState<Set>`), reset tiap reload. Kalau ada permintaan "biar tidak hilang saat refresh" atau "biar kelihatan siapa yang centang", itu perubahan scope besar (checklist resmi) yang butuh spec terpisah, bukan nambah kolom diam-diam ke sini
32. **Jangan tambah nilai baru ke CHECK constraint `pengiriman.milestone`** untuk merepresentasikan event transit (mis. `'tiba_hub'`/`'transit'`) — milestone dan `pengiriman_transit` adalah dua sistem paralel yang SENGAJA dipisah. Kalau terasa "lebih rapi digabung", itu arah yang salah, tolak dari awal
33. **Jangan ubah FK `pengiriman_transit.pengiriman_id` jadi `ON DELETE NO ACTION`** — sengaja `CASCADE` (beda dari `manifest_biaya`/`klaim` yang `NO ACTION`), karena ini log operasional yang melekat ke siklus hidup kiriman, bukan catatan finansial independen
34. **Jangan gabung `pengiriman_riwayat_publik` dan `pengiriman_transit_publik` lewat `UNION` di database** — timeline publik `/resi/[nomor]` WAJIB digabung di level aplikasi (dua query + `.sort()` JS). `UNION` di DB mengunci bentuk kolom kedua view jadi harus identik selamanya dan menaikkan risiko regresi ke view lama tiap kali salah satunya berubah
35. **Jangan expose `cabang.nama`/`cabang.alamat`/`pengiriman_transit.catatan`/`manifest_id`/`created_by` di `pengiriman_transit_publik`** — view itu HANYA boleh punya `hub_kota` sebagai info lokasi. Nama cabang internal & alamat tidak pernah untuk konsumsi publik
36. **Jangan buat akun customer booking mandiri lewat Supabase Auth (`auth.users`) dalam bentuk apa pun** — aturan arsitektur mutlak (lihat §Auth & Role "Auth Customer — Booking Mandiri"). Hampir semua RLS tabel dashboard mengasumsikan "punya sesi Supabase Auth = staf terpercaya"; kalau customer login lewat mekanisme itu juga, mereka otomatis lolos semua policy longgar `auth.uid() IS NOT NULL` di tabel yang belum di-harden dan bisa baca data staf/customer lain
37. **Jangan percaya `customer_id` (atau field identitas apa pun) dari body/query di endpoint `app/api/booking/*`/`app/api/booking-auth/*` manapun** — SELALU ambil dari `getBookingCustomerId(req)` (`lib/bookingAuth.ts`, JWT cookie `booking_session` terverifikasi). RLS tidak melindungi jalur ini sama sekali (tabel `booking_request`/`customer` diakses via service role) — endpoint itu sendiri adalah satu-satunya benteng
38. **Jangan `select("*")` atau kembalikan kolom `pengiriman`/`booking_request` mentah ke customer di endpoint booking manapun** — selalu allowlist eksplisit, sama larangannya dengan view `pengiriman_publik` (lihat §Database Schema `booking_request`, §Business Logic "Booking Mandiri")
39. **Jangan tambah endpoint baru di `app/api/booking/*`/`app/api/booking-auth/*` tanpa menerapkan ulang aturan §Auth & Role "Auth Customer" poin 1-5** (identitas dari JWT saja, allowlist kolom, rate limit + honeypot utk endpoint publik, bcrypt cost >= 10 + pesan error generik, validasi batas input di server) — endpoint publik yang menulis ke DB tanpa ini adalah pintu spam/brute-force/resource-exhaustion
40. **Jangan buat `booking_request` langsung jadi `pengiriman` tanpa lewat konfirmasi staf di `/dashboard/booking`** — draft WAJIB direview (cegah spam/data kotor jadi order resmi). Jangan juga tambah milestone baru (mis. `menunggu_konfirmasi`) ke `pengiriman.milestone` untuk merepresentasikan status ini — `booking_request` sengaja tabel terpisah, pola sama kenapa `pengiriman_transit` dipisah dari milestone
