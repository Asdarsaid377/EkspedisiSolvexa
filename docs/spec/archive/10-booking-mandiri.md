# Spec: Self-Service Booking (Fase 15)

> Status: ✅ SELESAI & DIARSIPKAN (20 Jul 2026). Ringkasan sudah
> dipindahkan ke `CLAUDE.md` (§Database Schema `customer.email`/
> `password_hash` + `booking_request`; §Business Logic "Booking Mandiri —
> Self-Service Customer"; §Auth & Role "Auth Customer — Booking Mandiri";
> §RLS bagian "Tidak disentuh"; §Fitur Per Halaman "Booking Mandiri
> (`/booking/*`)" & "Booking Masuk (`/dashboard/booking`)"; §Known Issues
> #34-36; §Hal-hal yang JANGAN Dilakukan #36-40; §Roadmap) dan ditandai ✅
> di `expedisi.md` §7 poin 15. File ini disimpan sebagai arsip riwayat
> keputusan, bukan dokumen kerja aktif.
>
> Bagian dari roadmap Fase 15 (`expedisi.md` §7 poin 15), yang aslinya
> menggabung booking mandiri + notifikasi WA otomatis. **Notifikasi WA
> DIKELUARKAN dari spec ini** (keputusan sesi ini) — butuh provider WA
> Business API pihak ketiga berbayar yang belum dipilih; jadi fase
> terpisah setelah provider ditentukan (tetap di `CLAUDE.md` §Roadmap
> "Prioritas Rendah").
>
> Prasyarat: `customer` (Fase 8), `tarif_zona` (Fase 2), milestone/POD
> (spec 01) SELESAI.

---

## 1. Tujuan & Masalah yang Diselesaikan

Saat ini SEMUA order `pengiriman` dibuat oleh staf (`cs`/`kasir`/dst) lewat
`/dashboard/pengiriman` — customer tidak bisa membuat order sendiri, harus
selalu hubungi staf dulu (telepon/WA manual). Spec ini menambah jalur
**self-service**: customer punya akun sendiri, login, isi form booking,
lalu **staf tetap mengkonfirmasi sebelum jadi order resmi** (bukan
langsung masuk alur milestone) — mencegah spam/data kotor.

## 2. Keputusan Arsitektur Terbesar — Auth Customer TERPISAH dari Supabase Auth

**Ini keputusan paling penting di spec ini, wajib dikonfirmasi dulu sebelum
langkah lain jalan.**

Staf login lewat Supabase Auth (`auth.users` + `profiles`), dan **hampir
semua RLS di database mengasumsikan "siapa pun yang punya sesi Supabase
Auth = staf terpercaya"** — banyak tabel (`armada`, `manifest`,
`manifest_item`, `customer`, `pengiriman_tracking`, dan SELECT `pengiriman`
sendiri) masih berpolicy selonggar `auth.uid() IS NOT NULL` tanpa role gate
sama sekali (lihat CLAUDE.md §RLS bagian "Tidak disentuh"). Kalau akun
customer dibuat lewat Supabase Auth juga (`auth.users`), maka **begitu
customer login, `auth.uid()` mereka otomatis lolos semua policy longgar
itu** — customer bisa baca SEMUA data pengiriman/manifest/armada semua
orang lewat REST API langsung, bukan cuma miliknya sendiri. Ini lubang
keamanan serius yang butuh audit ulang RLS di banyak tabel sekaligus kalau
dipaksakan.

**Usulan: auth customer 100% terpisah, tidak menyentuh `auth.users` sama
sekali.**

- Tambah kolom di `customer`: `email` (unique saat terisi), `password_hash`
  (bcrypt). Bukan tabel baru — `customer` sudah jadi master data yang tepat.
- Login/register lewat API route baru (`/api/booking-auth/*`) yang pakai
  **service role key** (pola sama `/api/create-user/route.ts`) — verifikasi
  password manual, lalu terbitkan **JWT sendiri** (bukan token Supabase) di
  cookie httpOnly terpisah (mis. `booking_session`), signed pakai secret
  env baru (`BOOKING_JWT_SECRET`). Butuh tambah dependency `jose` (belum
  ada di `package.json` sekarang, dicek — tidak ada `jose`/`jsonwebtoken`/
  `bcrypt` terpasang).
- **Semua akses data customer (booking baru, riwayat kiriman sendiri) lewat
  API route baru yang pakai service role + validasi JWT manual** — BUKAN
  lewat `createClient()` Supabase browser client biasa. Ini artinya RLS
  tabel-tabel existing **TIDAK PERLU disentuh sama sekali** — customer
  tidak pernah punya sesi Supabase Auth, jadi tidak pernah lolos
  `auth.uid() IS NOT NULL` di tabel manapun secara langsung.
- `middleware.ts`/`lib/supabase/middleware.ts` (proteksi `/dashboard` &
  `/tugas` berbasis Supabase session) **tidak disentuh** — proteksi
  `/booking/*` dicek terpisah di `app/booking/layout.tsx` (client-side,
  call `/api/booking-auth/me`), pola serupa `app/tugas/layout.tsx` tapi
  authnya beda sumber.

**Konsekuensi yang perlu diterima**: customer TIDAK bisa dikelola dari
halaman `/dashboard/pengguna` (itu khusus Supabase Auth staf) — akun
booking dikelola implisit lewat kolom baru di `customer` (staf bisa lihat
statusnya, tapi tidak ada UI reset password khusus di v1, lihat Keputusan
Terbuka #3).

## 3. Perubahan Skema

Migration baru: `supabase/migrations/2026XXXXXXXXXX_booking_mandiri.sql`

```sql
-- Kolom akun login di customer (nullable — customer lama tanpa akun tetap ada)
ALTER TABLE customer ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE customer ADD COLUMN IF NOT EXISTS password_hash TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS idx_customer_email_unique
  ON customer (LOWER(email)) WHERE email IS NOT NULL;
-- TIDAK ada RLS baru untuk kolom ini — akses baca/tulis customer.email/
-- password_hash HANYA lewat API route service-role (§2), tidak pernah
-- lewat client Supabase biasa dari sisi customer maupun staf.

CREATE TABLE IF NOT EXISTS booking_request (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id       UUID NOT NULL REFERENCES customer(id),
  jenis_layanan     TEXT CHECK (jenis_layanan IN ('reguler','express','kargo')) NOT NULL,

  -- snapshot pengirim, prefill dari customer saat submit, TIDAK auto-update kalau master berubah
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
  ongkir_estimasi   NUMERIC(15,2),  -- hasil lookup tarif_zona saat submit (reguler/express);
                                    -- NULL untuk kargo — staf isi manual saat konfirmasi
  catatan           TEXT,

  status            TEXT CHECK (status IN ('pending','dikonfirmasi','ditolak')) DEFAULT 'pending',
  catatan_penolakan TEXT,
  pengiriman_id     UUID REFERENCES pengiriman(id),  -- terisi saat dikonfirmasi
  processed_by      UUID REFERENCES profiles(id),
  processed_at      TIMESTAMPTZ,

  created_at        TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_booking_request_status ON booking_request (status, created_at);
CREATE INDEX IF NOT EXISTS idx_booking_request_customer ON booking_request (customer_id, created_at);

ALTER TABLE booking_request ENABLE ROW LEVEL SECURITY;
-- Staff-only, pola sama tabel operasional lain yang belum di-harden (armada/manifest) —
-- customer TIDAK PERNAH mengakses tabel ini langsung, selalu lewat API route service-role.
CREATE POLICY "auth_all_booking_request" ON booking_request
  FOR ALL USING (auth.uid() IS NOT NULL);

NOTIFY pgrst, 'reload schema';
```

**Kenapa `booking_request` tabel terpisah, bukan insert langsung ke
`pengiriman` dengan status baru**: `pengiriman.milestone` sudah punya CHECK
constraint 6 nilai dan seluruh sistem (manifest, laporan, `/tugas`, dst)
mengasumsikan baris `pengiriman` = order yang SUDAH sah diproses staf.
Menambah milestone ke-7 (`menunggu_konfirmasi`) akan merembet ke banyak
tempat (filter dashboard, laporan, `/tugas`, RLS, dst). Tabel terpisah +
insert ke `pengiriman` HANYA saat staf konfirmasi (reuse
`insertPengirimanWithResi()` yang sudah ada) jauh lebih aman — pola sama
dengan kenapa `pengiriman_transit` dipisah dari milestone (spec 09).

## 4. Business Rules

- **Registrasi**: customer isi email + password + data profil (nama,
  telepon, alamat, kota, tipe selalu `umum` — tipe `korporat` tetap hanya
  staf yang bisa set dari `/dashboard/customer`) → insert baris `customer`
  BARU. **Tidak ada pencocokan/merge ke `customer` lama** (nama/telepon
  sama) — konsisten dengan keputusan Fase 8 (JANGAN #16 di CLAUDE.md:
  pencocokan otomatis rawan duplikat kotor). Kalau ternyata orang yang
  sama sudah jadi customer lama (dibuat staf), akan ada 2 baris `customer`
  terpisah — staf gabungkan manual kalau perlu (di luar scope v1).
- **Ongkir**: reguler/express → lookup `tarif_zona` sama persis formula
  form staf (`ongkir = max(harga_per_kg × berat_efektif, harga_flat_min)`,
  `berat_efektif = max(berat_kg, berat_volumetrik)`) — ditampilkan ke
  customer sebagai **"Estimasi Ongkir"**, jelas bukan harga final. Kargo:
  tidak ada estimasi ditampilkan sama sekali, teks "akan dihubungi untuk
  quote" — staf isi ongkir manual saat konfirmasi (pola sama form staf
  yang sudah ada).
- **Konfirmasi oleh staf**: booking `pending` → staf buka detail di
  `/dashboard/booking`, form pre-filled dari `booking_request` (semua
  field editable, termasuk ongkir/biaya asuransi/metode bayar — sama
  seperti mengisi form `/dashboard/pengiriman` normal) → submit memanggil
  `insertPengirimanWithResi()` yang **sudah ada** (bukan jalur insert
  baru) dengan `customer_id` terisi dari `booking_request.customer_id` →
  `UPDATE booking_request SET status='dikonfirmasi', pengiriman_id=...,
  processed_by=auth.uid(), processed_at=NOW()`.
- **Penolakan**: staf isi `catatan_penolakan` (wajib, alasan singkat) →
  `status='ditolak'`. Tidak ada `pengiriman` yang dibuat. Customer lihat
  status + alasan di halaman riwayat booking mereka sendiri (tidak ada
  notifikasi push/WA — customer harus cek manual, konsisten dengan
  keputusan menunda WA di spec ini).
- **Riwayat customer**: `/booking` (setelah login) menampilkan daftar
  `booking_request` milik customer tsb (status pending/dikonfirmasi/
  ditolak) **dan** daftar `pengiriman` yang `customer_id`-nya cocok (untuk
  yang sudah dikonfirmasi, supaya bisa lihat milestone/tracking) — dua
  query terpisah lewat API route, di-merge di response, bukan di database.
- **Tidak ada pembatalan booking oleh customer** setelah submit (v1) —
  kalau salah isi, customer hubungi staf manual untuk minta ditolak/revisi.

## 4.1 Aturan Keamanan API (WAJIB — service role membypass semua RLS,
API route adalah SATU-SATUNYA lapisan keamanan sisi customer)

1. **`customer_id` HANYA dari JWT, TIDAK PERNAH dari request body/query.**
   Semua endpoint booking (submit, riwayat, profil) mengambil identitas
   dari cookie `booking_session` yang terverifikasi — parameter
   `customer_id` apapun yang dikirim client diabaikan/ditolak.
2. **Column allowlist untuk data pengiriman yang dikembalikan ke
   customer.** Endpoint riwayat men-`SELECT` kolom eksplisit: `nomor_resi`,
   `milestone`, `jenis_layanan`, `tanggal`, `penerima_nama`,
   `penerima_kota`, `isi_barang`, `berat_kg`, `total_tagihan`,
   `status_bayar`. **TIDAK PERNAH**: `catatan_internal`, `petugas_*`,
   breakdown ongkir/asuransi, `nomor_faktur`, data pengirim customer lain.
   Larangan yang sama dengan view `pengiriman_publik` berlaku.
3. **Rate limiting endpoint auth**: login & register dibatasi per-IP
   (sederhana: in-memory/DB counter, mis. 5 percobaan login gagal / 15
   menit per email, 10 registrasi / jam per IP). Register juga diberi
   honeypot field. Tanpa ini, endpoint publik = pintu brute-force & spam.
   **Update Step 2 (dikonfirmasi 20 Jul 2026)**: deployment TIDAK ADA
   reverse proxy di depan app — `X-Forwarded-For` sepenuhnya dikontrol
   client, dibuktikan lewat tes manual (spoof header beda tiap request
   melewati limit per-IP dengan mudah). Karena itu ditambah **backstop
   global topology-independent** (tidak bergantung IP/email sama sekali)
   di `register` (30/5 menit) DAN `login` (60/5 menit, hitung semua
   percobaan bukan cuma yang gagal — melindungi dari flood lintas-email
   yang tiap percobaannya tetap memaksa satu bcrypt.compare penuh).
   Trade-off yang diterima sadar: penyerang bisa sengaja memicu limit
   global untuk memblokir registrasi/login SEMUA orang selama window
   aktif — diterima karena lebih baik dari flood tak terbatas yang
   menghabiskan CPU server. Limit per-IP/per-email yang sudah ada
   **tetap dipertahankan** sebagai lapis pertama (masih efektif menahan
   bot naif yang tidak repot spoofing header).
4. **Kebersihan auth**: password minimal 8 karakter; pesan error login
   generik ("email atau password salah" — tidak membedakan email tak
   terdaftar vs password salah); bcrypt cost >= 10; JWT berisi hanya
   `customer_id` + `exp` (7 hari), tidak ada data sensitif;
   `BOOKING_JWT_SECRET` wajib beda dari semua secret lain.
5. **Validasi input submit booking**: `berat_kg > 0` dan `<= 10000`;
   panjang/lebar/tinggi `<= 1000`; `nilai_barang >= 0`; string dipangkas
   panjangnya (nama/kota `<= 200`, alamat/catatan `<= 2000`). Ditolak di
   server, bukan cuma di form.

## 5. Role & Permission

| Aksi                                          | Role                                 | Enforce                                  |
| ---------------------------------------------- | ------------------------------------- | ----------------------------------------- |
| Register/login booking mandiri                | Publik (siapa saja)                   | API route `/api/booking-auth/*`           |
| Submit booking request                        | Customer dengan sesi `booking_session` valid | API route, cek JWT                 |
| Lihat riwayat booking + pengiriman sendiri     | Customer dengan sesi valid            | API route, scoped `customer_id` dari JWT  |
| Lihat daftar `booking_request` (semua)         | **Usulan**: `superadmin`, `cs`, `kasir`, `keuangan` (role sama seperti CRUD `customer`) | React                |
| Konfirmasi/Tolak `booking_request`             | **Usulan**: sama seperti baris atas   | React + RLS `auth_all_booking_request` (belum granular per-role, pola sama `armada`/`manifest` yang belum di-harden) |

## 6. Perubahan UI

- **Route baru `/booking`** (layout terpisah TANPA Sidebar, pola sama
  `/tugas` tapi auth-nya beda sumber — lihat §2):
  - `/booking/register`, `/booking/login`
  - `/booking` (setelah login): daftar riwayat booking + pengiriman
    sendiri, badge status, tombol "Buat Booking Baru"
  - `/booking/baru`: form booking (jenis layanan, data penerima, berat/
    dimensi, isi barang, nilai barang, catatan) — field pengirim
    prefilled dari akun customer (read-only ringkas + link "edit profil"
    terpisah, TIDAK inline-editable di form booking supaya form tetap
    sederhana)
  - `/booking/profil`: edit data profil customer sendiri (nama, telepon,
    alamat, kota) — terpisah dari form booking
- **Halaman baru `/dashboard/booking`** (staf): daftar `booking_request`
  filter status (default tampilkan `pending` dulu), klik → modal/detail
  konfirmasi (form pre-filled, sama field dengan create `pengiriman`) atau
  tolak (textarea alasan).
- **Sidebar**: item baru "Booking Masuk" (badge jumlah `pending`) di dekat
  nav "Pengiriman"/"Customer".
- **Link publik**: perlu tempat customer tahu URL `/booking/register` ada
  (mis. dicantumkan di footer `/resi/[nomor]` atau bahan promosi offline)
  — di luar scope teknis spec ini.

## 7. Reuse & Extraksi Kode

- **`insertPengirimanWithResi()`** (`lib/utils.ts`) dipakai apa adanya saat
  staf konfirmasi — tidak ada jalur insert `pengiriman` baru.
- **Lookup ongkir `tarif_zona`** saat ini inline di
  `app/dashboard/pengiriman/page.tsx` (`useEffect` baris ~147-205), belum
  diekstrak. Spec ini akan **mengekstraknya** jadi fungsi bersama (mis.
  `lib/tarifAksi.ts: lookupTarifOngkir()`) supaya dipakai BERSAMA oleh form
  staf (`/dashboard/pengiriman`) dan form booking publik (`/booking/baru`)
  — konsisten pola "satu sumber logika, dua entry-point" yang sudah
  dipakai di `pengirimanAksi.ts`/`manifestAksi.ts`. Refactor ini
  **tidak mengubah perilaku form staf yang sudah ada** (regresi check
  wajib).

## 8. Checklist Implementasi (usulan urutan eksekusi)

- [x] **Step 1** — Migration §3 (kolom `customer.email`/`password_hash` +
      tabel `booking_request`) di local. Tambah dependency `jose` (JWT)
      dan `bcryptjs` (hash password, pure-JS supaya aman dipakai di API
      route Next.js tanpa native binding).
- [x] **Step 2** — `/api/booking-auth/register`, `/api/booking-auth/login`,
      `/api/booking-auth/logout`, `/api/booking-auth/me` — service role
      client, JWT cookie `booking_session` (httpOnly, secure, `SameSite=Lax`).
      **Terapkan §4.1 poin 3 & 4 di sini**: rate limit login/register
      per-IP, honeypot field register, pesan error login generik, bcrypt
      cost >= 10, JWT payload minimal (`customer_id` + `exp` 7 hari),
      `BOOKING_JWT_SECRET` baru & unik di `.env`. **Tambahan saat eksekusi**
      (dikonfirmasi user): backstop rate limit GLOBAL topology-independent
      di register (30/5 menit) & login (60/5 menit) — lihat update §4.1
      poin 3 di atas, deployment tidak ada reverse proxy jadi
      `X-Forwarded-For` sepenuhnya bisa dipalsu client.
- [x] **Step 3** — Ekstrak `lookupTarifOngkir()` ke `lib/tarifAksi.ts`,
      pasang ulang di form staf existing (regresi check) — juga dipakai
      ulang di Step 6 (modal konfirmasi staf).
- [x] **Step 4** — `/api/booking/submit`, `/api/booking/riwayat` — service
      role, validasi JWT dari cookie, scoped `customer_id`. **Terapkan
      §4.1 poin 1, 2 & 5 di sini**: `customer_id` diambil HANYA dari JWT
      terverifikasi (tolak kalau ada di body/query), riwayat pakai
      `.select()` allowlist kolom eksplisit (bukan `select("*")`), submit
      validasi batas berat/dimensi/nilai/panjang string di server sebelum
      insert. `pengirim_*` juga TIDAK PERNAH dibaca dari body — diambil
      server-side dari tabel `customer` memakai `customer_id` dari JWT.
- [x] **Step 5** — Route `/booking/*` (register, login, dashboard, form
      baru, edit profil) — `app/booking/layout.tsx` cek sesi via
      `/api/booking-auth/me`. **Tambahan di luar checklist awal**
      (dikonfirmasi user sebelum ditulis): endpoint baru
      `PATCH /api/booking-auth/profil` — sebelumnya cuma ada
      `GET /api/booking-auth/me` (read-only), jadi `/booking/profil` tidak
      akan fungsional tanpa ini. Rigor §4.1 yang sama diterapkan (identity
      dari JWT saja, update pakai objek literal 4 kolom, bukan spread body).
- [x] **Step 6** — `/dashboard/booking` (staf: list + konfirmasi + tolak),
      sidebar nav baru (badge jumlah pending, fetch sekali per mount —
      pertama kalinya Sidebar.tsx melakukan data fetch, sebelumnya murni
      statis). Modal konfirmasi reuse penuh `lookupTarifOngkir()` (Step 3)
      untuk live ongkir lookup, dan `insertPengirimanWithResi()` yang sudah
      ada — tidak ada jalur insert `pengiriman` baru. 2 aksi baru
      `AksiLog`: `konfirmasi_booking`/`tolak_booking` (`lib/aktivitas.ts` +
      `AKSI_CFG` di `/dashboard/aktivitas`).
      **Temuan penting dari verifikasi RLS end-to-end** (bukan bug baru,
      gap pre-existing yang kena di fitur ini): role `cs` termasuk
      `BOOKING_STAFF_ROLES` (bisa konfirmasi booking) TAPI **tidak** masuk
      RLS INSERT `pengiriman_pembayaran` (`superadmin`/`kasir`/`keuangan`
      saja, lihat CLAUDE.md §RLS). Kalau staf `cs` mengkonfirmasi booking
      dengan `status_bayar` `dp`/`lunas`, insert baris riwayat
      `pengiriman_pembayaran` akan DITOLAK RLS secara senyap (pola
      fire-and-forget yang sama seperti form staf `/dashboard/pengiriman`
      asli — bukan regresi dari Step 6, sudah ada sejak hardening RLS spec
      05). `pengiriman.uang_dp`/`status_bayar` tetap benar (kolom itu ikut
      payload insert utama, insert terpisah), jadi total tagihan TIDAK
      salah hitung — cuma baris "Riwayat Pembayaran" di detail pengiriman
      akan kosong untuk kasus ini. Dibuktikan lewat script tsx sekali-pakai
      yang login sungguhan sebagai staf `cs` uji coba (dihapus setelah
      dipakai) — bukan cuma dugaan.
- [x] **Step 7** — Update CLAUDE.md (skema `booking_request` +
      `customer.email`/`password_hash`, §Business Logic booking mandiri,
      §Auth & Role bagian auth customer terpisah, §Fitur Per Halaman
      `/booking/*` + `/dashboard/booking`) & `expedisi.md` §7 poin 15.
      Arsipkan spec ini ke `docs/spec/archive/`.

## Keputusan Terbuka

1. **Role staf yang bisa lihat & proses `/dashboard/booking`** — usulan
   §5 (`superadmin`/`cs`/`kasir`/`keuangan`, sama dengan CRUD `customer`)
   cukup, atau perlu dipersempit/diperluas?
2. **Registrasi selalu bikin baris `customer` baru** (tanpa cek
   duplikat/merge ke customer lama) — diterima sesuai pola Fase 8, atau
   perlu pencarian manual "sudah pernah jadi customer kami?" saat
   registrasi (customer pilih sendiri dari hasil cari, staf tidak perlu
   gabungkan manual belakangan)? _(Usulan: terima duplikat dulu — sama
   seperti keputusan Fase 8, evaluasi kalau ternyata jadi masalah nyata.)_
3. **Lupa password**: tidak ada infrastruktur email/WA terverifikasi di
   v1 ini (WA ditunda), jadi tidak ada alur "reset password mandiri" yang
   aman. _(Usulan: v1 tidak ada fitur reset — customer yang lupa password
   hubungi staf, staf reset manual lewat query SQL langsung/tool kecil
   superadmin-only nanti kalau sering terjadi. Jangan bangun alur reset
   email sekarang karena belum ada pengiriman email terverifikasi.)_
4. **Booking `kargo` tanpa estimasi harga sama sekali** — customer submit
   \"buta\" tanpa gambaran harga. Cukup? Atau perlu field opsional
   \"budget perkiraan\" dari customer supaya staf punya konteks saat
   quote? _(Usulan: tidak perlu — form staf yang sudah ada untuk kargo
   juga tidak ada bantuan estimasi apapun, konsisten.)_
5. **Notifikasi status booking** (dikonfirmasi/ditolak) ke customer —
   sekarang customer harus buka `/booking` manual untuk cek. Cukup untuk
   v1, menyusul dengan WA di fase terpisah nanti? _(Usulan: ya, cukup —
   ini persis alasan kenapa WA dipisah jadi fase sendiri.)_
