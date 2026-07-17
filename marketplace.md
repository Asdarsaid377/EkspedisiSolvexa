# marketplace.md — Persiapan BungaNaik → Marketplace Umum

Catatan kerja untuk membahas & merencanakan transformasi BungaNaik dari **sistem internal single-tenant** (satu toko furniture, staff internal + reseller) menjadi **marketplace multi-vendor untuk umum** (banyak toko/vendor, banyak pembeli publik, transaksi self-service).

Ini bukan rencana implementasi final — ini daftar hal yang **harus didiskusikan & diputuskan dulu** sebelum mulai coding, karena beberapa keputusan di sini akan menentukan arsitektur dari nol (sulit diubah belakangan).

---

## 1. Kondisi Saat Ini (as-is) — kenapa ini bukan sekadar "tambah fitur"

BungaNaik saat ini dirancang sebagai **sistem operasional satu toko**:

- Semua tabel (`produk`, `penjualan`, `resellers`, `purchase_orders`, dst) tidak punya konsep "pemilik toko" — semua data dianggap milik satu entitas bisnis.
- RLS hanya bertingkat `auth.uid() IS NOT NULL` (siapa saja yang login sebagai staff internal bisa akses semua baris) — bukan `auth.uid() = milik_saya`.
- Role (`superadmin`, `kasir`, `gudang`, dst) adalah role **staf internal BungaNaik**, bukan role "vendor A", "vendor B".
- Reseller mengakses lewat token per-link (`/r/[token]`), bukan akun login publik dengan password.
- Pembeli umum (`/toko`, `/etalase`) tidak login sama sekali — checkout murni via WhatsApp, tidak ada akun, keranjang, atau riwayat pesanan pribadi.
- Pembayaran dicatat **manual oleh kasir/keuangan** setelah transfer masuk — tidak ada payment gateway.
- Ongkir dicatat manual per transaksi (input angka), tidak dihitung otomatis oleh API kurir.
- Satu produk = satu pemilik modal (`harga_modal`, `stok`) — tidak ada konsep "produk yang sama dijual banyak vendor dengan harga beda".

Jika langsung "dibuka untuk umum" tanpa perubahan ini, risiko: vendor bisa saling melihat/mengubah data satu sama lain, tidak ada cara memisahkan siapa berjualan apa, dan tidak ada mekanisme pembayaran/aman transaksi yang bisa dipercaya pembeli asing (bukan reseller yang sudah kenal toko).

---

## 2. Perubahan Fundamental yang Perlu Dibahas

### 2.1 Model Multi-Tenant / Multi-Vendor
- [ ] Tabel baru `vendors` (atau `tenants`/`toko`): nama toko, slug/subdomain, pemilik (user_id), status verifikasi, rekening bank, komisi rate.
- [ ] Setiap `produk` perlu `vendor_id` FK. Stok, harga, dan modal jadi milik vendor masing-masing.
- [ ] **RLS harus diubah total**: dari `auth.uid() IS NOT NULL` → `vendor_id = (SELECT vendor_id FROM vendor_users WHERE user_id = auth.uid())`. Ini pekerjaan besar karena hampir semua tabel & query di codebase saat ini asumsi "single tenant".
- [ ] Apakah BungaNaik (toko furniture asli) jadi salah satu vendor di marketplace-nya sendiri, atau tetap terpisah dari platform?

### 2.2 Autentikasi & Peran Pengguna
- [ ] **Akun pembeli publik** (register/login email atau nomor HP) — saat ini tidak ada sama sekali. Perlu: signup, verifikasi, lupa password, riwayat pesanan pribadi, alamat tersimpan.
- [ ] **Akun vendor** (login terpisah dari staff internal BungaNaik) dengan dashboard sendiri: kelola produk, pesanan masuk, saldo, penarikan dana.
- [ ] **Role platform admin** (beda dari `superadmin` toko saat ini): approve vendor baru, suspend vendor bermasalah, monitor semua transaksi lintas vendor, moderasi konten.
- [ ] Apakah reseller/portal existing (`/r/[token]`) tetap dipertahankan sebagai model B2B terpisah, atau dilebur ke sistem akun vendor/pembeli baru?

### 2.3 Skema Database — dampak ke tabel existing
- [ ] `produk` → tambah `vendor_id`, pertimbangkan constraint unique nama **per vendor** (bukan global lagi — saat ini `produk.nama` UNIQUE global, akan konflik kalau 2 vendor jual produk dengan nama sama).
- [ ] `penjualan` → satu order bisa berisi produk dari **beberapa vendor sekaligus**. Perlu split jadi sub-order per vendor (mis. tabel `order_groups` per vendor di dalam satu `order` induk), masing-masing dengan status pengiriman & pembayaran sendiri.
- [ ] `mutasi_stok`, `bahan_baku`, `bom`, `batch_produksi` (modul HPP) → ini murni internal-produksi BungaNaik, kemungkinan **tidak relevan buat vendor lain** kecuali semua vendor pakai alur produksi sama. Perlu diputuskan: modul HPP tetap privat punya BungaNaik saja, atau jadi fitur opsional per vendor.
- [ ] Foto produk, kategori, satuan — perlu standardisasi kategori lintas vendor (taxonomy bersama) supaya pencarian/filter across-vendor masuk akal.

### 2.4 Pembayaran & Keamanan Transaksi
- [ ] Saat ini: transfer manual → staff cek mutasi rekening → catat lunas. **Tidak scalable & tidak aman untuk pembeli asing** (tidak ada jaminan barang datang/dana balik kalau vendor nakal).
- [ ] Perlu payment gateway (Midtrans/Xendit/dsb.) dengan **escrow**: dana pembeli ditahan platform, baru diteruskan ke vendor setelah barang diterima/dikonfirmasi.
- [ ] Kebijakan refund & pembatalan sepihak (pembeli vs vendor) harus jelas sebelum go-live.
- [ ] Split payment ke banyak vendor dalam satu transaksi checkout (kalau keranjang berisi produk lintas vendor).

### 2.5 Komisi & Payout Vendor
- [ ] Berapa % komisi platform per transaksi? Flat atau tiered per kategori/omset (mirip tier reseller yang sudah ada sekarang)?
- [ ] Jadwal pencairan dana ke vendor (harian/mingguan?), potongan biaya admin/payment gateway siapa yang tanggung.
- [ ] Laporan keuangan per vendor (mirip modul `laporan/keuangan` sekarang, tapi perlu scoped per vendor + laporan komisi platform terpisah).

### 2.6 Ongkir & Logistik
- [ ] Saat ini ongkir input manual angka per transaksi. Marketplace umum butuh **kalkulasi otomatis** (integrasi RajaOngkir/Biteship/sejenis) berdasarkan berat, dimensi, & lokasi asal (tiap vendor punya alamat gudang beda-beda).
- [ ] Satu order lintas vendor = ongkir dihitung terpisah per vendor (barang dikirim dari lokasi berbeda-beda).
- [ ] Resi tracking (`nomor_resi`, `tracking_progress`) yang sudah ada sekarang berbasis update manual staf — apakah tetap manual per vendor, atau integrasi API kurir untuk update otomatis?

### 2.7 Onboarding & Verifikasi Vendor
- [ ] Alur pendaftaran vendor baru: form profil toko, upload dokumen legal (KTP/NPWP/NIB), rekening bank untuk pencairan dana.
- [ ] Proses approval (siapa yang approve? platform admin manual atau otomatis dengan syarat tertentu?).
- [ ] Kebijakan penalti/suspend vendor: kriteria apa yang bikin akun vendor dibekukan (komplain menumpuk, barang tidak sesuai, dsb — mirip konsep `reseller_reviews` sekarang tapi perlu punya konsekuensi nyata, bukan cuma catatan).

### 2.8 Rating & Review Publik
- [ ] `reseller_reviews` sekarang sifatnya internal (dicatat staf di modal detail penjualan). Marketplace umum butuh **review publik dari pembeli asli** yang tampil di halaman produk/toko — rentan fake review, perlu validasi (hanya pembeli yang benar-benar beli produk itu boleh review).
- [ ] Rating agregat per vendor & per produk, dampaknya ke ranking pencarian.

### 2.9 Pencarian & Discovery Lintas Vendor
- [ ] Katalog (`/toko`, `/etalase`) sekarang single-store — perlu didesain ulang jadi **marketplace-wide search**: filter kategori, harga, vendor, rating, lokasi.
- [ ] Perlu index pencarian (full-text search Postgres / Algolia / Meilisearch) kalau jumlah produk sudah besar lintas vendor.
- [ ] Rekomendasi produk, produk terlaris lintas vendor, dsb — fitur discovery yang saat ini tidak ada sama sekali (katalog sekarang murni statis per kategori).

### 2.10 Keamanan & Isolasi Data (paling kritis, teknis)
- [ ] Audit ulang **semua RLS policy** di `supabase-schema.sql` — hampir semuanya `auth.uid() IS NOT NULL`, harus diganti jadi scoped per vendor. Ini bukan tambal-sulam, ini rewrite security model dari nol.
- [ ] Rate limiting untuk API publik (`/api/reseller-portal`, `/api/verify-kode`, checkout, dsb.) supaya tidak disalahgunakan (scraping harga vendor lain, brute-force token, dll).
- [ ] Storage bucket `BungaNaik` sekarang satu bucket flat untuk semua foto — perlu dipisah per vendor dengan policy upload/delete yang scoped, supaya vendor A tidak bisa hapus foto vendor B.

### 2.11 Customer Support & Dispute Resolution
- [ ] `ChatWidget` (AI CS) sekarang hardcode jawab soal toko BungaNaik sendiri — di marketplace, CS harus bisa arahkan ke vendor yang benar atau eskalasi ke platform kalau ada sengketa pembeli-vendor.
- [ ] Perlu alur komplain resmi: pembeli lapor barang tidak sesuai → platform jadi penengah → refund/vendor ditegur, bukan cuma catatan `reseller_reviews` seperti sekarang.

### 2.12 Notifikasi
- [ ] Saat ini notifikasi status pesanan ke customer murni manual via link WA (`waLink()`) yang dikirim staf. Marketplace butuh notifikasi otomatis (email/SMS/WA Business API/push) untuk: order masuk ke vendor, status berubah, pembayaran diterima, dsb — tidak bisa mengandalkan staf kirim manual satu-satu lagi kalau volume besar.

### 2.13 Legal & Kepatuhan (Indonesia)
- [ ] Pendaftaran PSE (Penyelenggara Sistem Elektronik) ke Kominfo — wajib untuk platform marketplace yang melayani transaksi publik di Indonesia.
- [ ] Syarat & Ketentuan, Kebijakan Privasi, kebijakan pengembalian barang — dokumen legal yang mengikat platform-vendor-pembeli.
- [ ] Kewajiban pajak (PPN atas komisi platform, laporan ke vendor untuk pajak penghasilan mereka sendiri).
- [ ] Apakah platform bertanggung jawab atas kualitas produk vendor, atau murni perantara (posisi hukum ini menentukan banyak keputusan produk).

### 2.14 Migrasi Data Existing
- [ ] Data BungaNaik yang sudah ada (`produk`, `resellers`, riwayat `penjualan`) perlu dipetakan jadi "vendor pertama" di sistem baru — rencana migrasi tanpa kehilangan riwayat transaksi/laporan yang sudah ada.
- [ ] Modul internal (HPP, absensi karyawan, PO produksi) kemungkinan tetap jalan terpisah sebagai "back office BungaNaik sebagai vendor", bukan bagian dari platform marketplace umum.

### 2.15 Skalabilitas & Performa
- [ ] Query yang sekarang scan tabel penuh (banyak halaman laporan pakai agregasi client-side, lihat catatan "Pelanggan: aggregasi client-side") tidak akan tahan kalau data sudah lintas ratusan vendor — perlu pindah ke agregasi server-side/materialized view.
- [ ] Index database untuk kolom yang akan sering difilter (`vendor_id`, kategori, harga).

### 2.16 Branding & Model Bisnis
- [ ] Nama & domain marketplace — beda dari brand "BungaNaik" (toko spesifik) atau tetap pakai nama itu sebagai payung?
- [ ] Model monetisasi: komisi per transaksi saja, atau ada biaya langganan vendor (subscription tier), iklan/featured listing, dsb?
- [ ] Target pasar: tetap furniture saja (marketplace niche) atau multi-kategori?

---

## 3. Pertanyaan Kunci yang Perlu Dijawab Owner Sebelum Mulai

Ini keputusan yang akan menentukan arsitektur — sebaiknya dijawab dulu sebelum baris kode pertama ditulis:

1. Apakah BungaNaik (toko asli) tetap jalan sebagai sistem internal terpisah, dan marketplace dibangun sebagai **produk/aplikasi baru** yang memakai sebagian komponen ini — atau benar-benar migrasi in-place?
2. Niche furniture saja, atau multi-kategori?
3. Siapa yang tanggung jawab hukum kalau barang dari vendor bermasalah — platform atau murni vendor?
4. Model pembayaran: escrow penuh (dana ditahan sampai barang diterima) atau langsung teruskan ke vendor?
5. Skala target di 6-12 bulan pertama (berapa vendor, berapa transaksi/hari) — ini menentukan seberapa serius infrastruktur (search engine, payment gateway, dsb.) perlu disiapkan dari awal vs. bisa menyusul.
6. Apakah reseller program yang sudah ada (tier, bonus, portal token) tetap dipertahankan sebagai jalur B2B terpisah dari marketplace B2C yang baru?

---

## 4. Usulan Urutan Pengerjaan (kalau sudah diputuskan lanjut)

1. **Fondasi**: skema multi-tenant (`vendors`, `vendor_id` di tabel terkait) + rewrite RLS policy + akun login vendor & pembeli publik.
2. **Transaksi inti**: payment gateway + escrow, split order per vendor, ongkir otomatis.
3. **Tools vendor**: dashboard vendor (kelola produk/pesanan/saldo), alur onboarding & verifikasi.
4. **Pengalaman publik**: pencarian lintas vendor, review publik, notifikasi otomatis, CS/dispute resolution.
5. **Legal & scale-up**: pendaftaran PSE, dokumen legal, optimasi performa untuk volume lebih besar.

Setiap fase sebaiknya dibahas & disepakati sebelum mulai coding fase berikutnya, karena keputusan di fase 1 (terutama model multi-tenant & RLS) akan sulit diubah kalau sudah ada fase 2-4 dibangun di atasnya.
