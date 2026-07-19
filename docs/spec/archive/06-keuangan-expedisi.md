# Spec: Perombakan Pengeluaran & Laporan Keuangan Expedisi

> Status: ✅ SELESAI & DIARSIPKAN (18 Jul 2026). Ringkasan sudah
> dipindahkan ke `CLAUDE.MD` (§Database Schema bagian `pengeluaran` +
> `klaim.selesai_at`; §Business Logic "Peta Sumber Angka & Cash Basis";
> §Fitur Per Halaman "Pencatatan Pengeluaran"/"Laporan Keuangan"; §Known
> Issues #24-25; §Hal-hal yang JANGAN Dilakukan #25-27; §Roadmap) dan
> ditandai ✅ di `expedisi.md` §7 poin 11. File ini disimpan sebagai arsip
> riwayat keputusan, bukan dokumen kerja aktif.
>
> Prasyarat: spec 04 SELESAI (batas wilayah manifest_biaya sudah final) dan
> spec 05 SELESAI (tabel keuangan baru langsung lahir dengan RLS per-role,
> bukan auth_all lalu di-harden ulang).

---

## 1. Tujuan & Masalah yang Diselesaikan

Modul Pengeluaran & Laporan Keuangan existing masih berbasis bisnis
furniture: kategori pengeluarannya warisan lama, dan laporan keuangannya
membaca `penjualan` yang beku sejak 17 Jul — angka pemasukan berhenti
bergerak. Owner tidak punya satu layar yang menjawab "bulan ini uang masuk
berapa, keluar berapa, dari mana saja".

Spec ini merombak keduanya jadi berbasis expedisi dengan prinsip **cash
basis** (uang dihitung saat diterima/dikeluarkan, bukan saat kiriman
dibuat) dan **tanpa pencatatan ganda**: tiap jenis beban punya SATU rumah.

**Peta sumber angka (kunci seluruh spec):**

```
PEMASUKAN  = pengiriman_pembayaran (per created_at)          ← kas diterima
BEBAN      = pengeluaran            (biaya umum non-trip)
           + manifest_biaya          (biaya operasional trip — BACA SAJA,
                                      dicatat di modul manifest, spec 04)
           + klaim selesai           (ganti rugi — BACA SAJA, nilai_disetujui)
NETO       = PEMASUKAN − BEBAN
```

Aturan anti-dobel (final, dari spec 04): biaya trip HANYA di
`manifest_biaya`; ganti rugi klaim HANYA di `klaim`; modul Pengeluaran
TIDAK boleh berisi keduanya.

## 2. Perubahan Skema

Migration baru: `supabase/migrations/2026XXXXXXXXXX_keuangan_expedisi.sql`

> **STEP 0 WAJIB SEBELUM MENULIS MIGRATION**: skema tabel `pengeluaran`
> existing TIDAK terdokumentasi di CLAUDE.md. Inspeksi dulu
> (`\d pengeluaran` / query information_schema), laporkan strukturnya,
> baru sesuaikan ALTER di bawah dengan kenyataan. Jangan berasumsi.

```sql
-- =====================================================================
-- A. Perluas tabel pengeluaran existing (REUSE, bukan tabel baru —
--    data pengeluaran furniture lama tetap ada sebagai arsip, dibedakan
--    lewat kategori lama vs baru)
-- =====================================================================
ALTER TABLE pengeluaran ADD COLUMN IF NOT EXISTS armada_id UUID REFERENCES armada(id);
  -- WAJIB diisi (enforce di form) untuk kategori maintenance/pajak armada,
  -- NULL untuk lainnya — memungkinkan laporan biaya per kendaraan
ALTER TABLE pengeluaran ADD COLUMN IF NOT EXISTS cabang_id UUID REFERENCES cabang(id);
  -- opsional, konsisten pola label cabang Fase 5

-- Kategori baru expedisi (validasi DAFTAR di aplikasi, bukan CHECK DB —
-- kategori lama furniture di data arsip tidak boleh membuat constraint
-- gagal; cek dulu di Step 0 apakah kolom kategori punya CHECK lama —
-- kalau ada, DROP):
--   gaji | sewa | utilitas | maintenance_armada | pajak_armada
--   | perlengkapan | pemasaran | lainnya

-- =====================================================================
-- B. Timestamp penutupan klaim (dibutuhkan cash-basis beban klaim —
--    klaim masuk beban pada periode SELESAI, bukan periode kejadian)
-- =====================================================================
ALTER TABLE klaim ADD COLUMN IF NOT EXISTS selesai_at TIMESTAMPTZ;
-- Diisi aplikasi saat tombol "Tandai Selesai" (bersama status='selesai').
-- Backfill baris lama yang sudah selesai: pakai updated_at (aproksimasi
-- sadar — catat di CLAUDE.md):
UPDATE klaim SET selesai_at = updated_at
WHERE status = 'selesai' AND selesai_at IS NULL;

NOTIFY pgrst, 'reload schema';
```

**RLS `pengeluaran`** (langsung pola spec 05, pakai `user_has_role()`):
SELECT semua staf; INSERT/UPDATE/DELETE superadmin + keuangan. Cek dulu
policy existing di Step 0 — drop `auth_all_*` lama kalau ada (jebakan
permissive-policy, lihat spec 05).

**Yang TIDAK disentuh:** `manifest_biaya` & `klaim` selain kolom
`selesai_at` (keduanya sumber BACA di laporan, pencatatannya tetap di
modulnya masing-masing), `pengiriman_pembayaran`, data pengeluaran
furniture lama (arsip — tetap muncul kalau filter periode lama).

## 3. Business Rules

- **Pemasukan** = SUM `pengiriman_pembayaran.jumlah` per `created_at` di
  periode — bukan `total_tagihan` pengiriman. DP bulan lalu + pelunasan
  bulan ini = dua pemasukan di dua periode. Breakdown per `metode`
  (transfer/cod/cash).
- **Beban gabungan** per periode = `pengeluaran.tanggal` (atau kolom
  tanggal existing hasil Step 0) + `manifest_biaya.created_at` +
  `klaim.selesai_at` (status `selesai`, nilai = `nilai_disetujui`).
  Ketiganya ditampilkan sebagai kelompok terpisah di laporan — jangan
  dilebur jadi satu angka tanpa rincian.
- **Form pengeluaran**: kategori dari daftar baru; pilih
  `maintenance_armada`/`pajak_armada` → dropdown armada WAJIB muncul &
  terisi. Foto nota opsional (pola foto existing kalau sudah ada).
- **Kebijakan maintenance** (final dari diskusi spec 04): SEMUA maintenance
  armada — termasuk yang terjadi di tengah trip (ban pecah dsb) — dicatat
  di Pengeluaran dengan `armada_id`, BUKAN di `manifest_biaya`. Biaya
  maintenance yang nyangkut di satu trip merusak margin trip padahal
  manfaatnya lintas puluhan trip. `manifest_biaya` khusus habis-pakai
  perjalanan (uang jalan/BBM/tol/kuli/parkir). Tulis ke CLAUDE.md.
- **Laporan keuangan** menampilkan, per periode terpilih: Pemasukan
  (breakdown metode), Beban (3 kelompok + breakdown kategori pengeluaran +
  breakdown kategori manifest_biaya), Neto, grafik tren bulanan
  pemasukan-vs-beban, dan tabel biaya per armada (dari `armada_id`).
- Data furniture lama: pemasukan `penjualan_pembayaran` & pengeluaran
  kategori lama TIDAK digabungkan ke laporan baru (arsip terpisah — kalau
  butuh dilihat, dari halaman arsip lama).

## 4. Role & Permission

| Halaman/aksi                     | Role                                                                     | Enforce          |
| -------------------------------- | ------------------------------------------------------------------------ | ---------------- |
| CRUD pengeluaran                 | superadmin, keuangan                                                     | RLS (§2) + React |
| Laporan Keuangan                 | superadmin, keuangan (set existing dipertahankan — cek aktual di Step 0) | React            |
| Lihat breakdown beban per armada | superadmin, keuangan                                                     | React            |

## 5. Perubahan UI

- **`/dashboard/keuangan/pengeluaran` (rewrite in-place)**: pola halaman
  dipertahankan (tabel + modal), diganti: daftar kategori baru, dropdown
  armada kondisional, dropdown cabang opsional, filter kategori + armada +
  periode.
- **`/dashboard/keuangan/laporan` (rewrite in-place)**: stat cards
  (Pemasukan / Beban / Neto), breakdown pemasukan per metode, beban per
  kelompok sumber (collapsible: Pengeluaran per kategori, Biaya Trip per
  kategori, Klaim), grafik tren 12 bulan, tabel biaya per armada. Filter
  bulan/tahun + cabang. Angka klaim & biaya trip di sini READ-ONLY dengan
  link ke modulnya ("kelola di Klaim/Manifest").
- Sidebar: tidak berubah (dua halaman sudah ada di grup Keuangan).

## 6. Checklist Implementasi (urutan eksekusi)

- [ ] **Step 0** — Inspeksi & laporkan: skema tabel `pengeluaran` existing
      (kolom, CHECK, policy RLS) + role gate halaman keuangan existing.
      BERHENTI setelah lapor — tunggu konfirmasi sebelum menulis migration.
- [ ] **Step 1** — Migration §2 (disesuaikan hasil Step 0) + RLS
      pengeluaran pola spec 05. Verifikasi: kolom baru ada; UPDATE
      pengeluaran sebagai kasir → tertolak; backfill `selesai_at` terisi.
- [ ] **Step 2** — `lib/types.ts` + konstanta kategori baru + set
      `selesai_at` di aksi "Tandai Selesai" klaim (`/dashboard/klaim`).
- [ ] **Step 3** — Rewrite `/dashboard/keuangan/pengeluaran`. Uji: kategori
      maintenance tanpa armada → tertahan; kategori gaji → dropdown armada
      tidak muncul.
- [ ] **Step 4** — Rewrite `/dashboard/keuangan/laporan` — pemasukan +
      beban 3 kelompok + neto. (Grafik & per-armada belum.)
- [ ] **Step 5** — Grafik tren 12 bulan + tabel biaya per armada. Uji
      dengan seed: 1 pembayaran, 1 pengeluaran maintenance ber-armada,
      1 biaya trip, 1 klaim selesai — semua di bulan sama → Neto benar,
      tidak ada angka dobel.
- [ ] **Step 6** — Update CLAUDE.md (skema pengeluaran + selesai_at, peta
      sumber angka §1, kebijakan maintenance, §Fitur Per Halaman kedua
      halaman) & expedisi.md ✅. Arsipkan spec ini.

## Keputusan Terbuka

1. **Pemasukan non-pengiriman** (jual kardus bekas, bunga bank, dll) —
   perlu pencatatan "Pemasukan Lain" sekarang, atau nanti? _(Usulan: nanti
   — jangan perluas scope; kalau kejadian, sementara catat sebagai
   pengeluaran negatif TIDAK boleh — tunggu modulnya.)_
2. **Kategori daftar final** — konfirmasi/koreksi daftar §2 sesuai
   pengeluaran nyata bisnis kamu sebulan terakhir (lihat buku kas manual
   kalau ada). Kategori yang tidak pernah dipakai = noise di laporan.
3. **Gaji sopir/kurir vs uang jalan**: gaji bulanan → Pengeluaran (jelas).
   Tapi kalau ada skema "upah per trip" (bukan gaji tetap), itu masuk
   `manifest_biaya.uang_jalan` atau Pengeluaran `gaji`? _(Usulan: upah
   per-trip = `uang_jalan` di manifest_biaya — melekat ke profitabilitas
   trip; gaji tetap bulanan = Pengeluaran. Konfirmasi sesuai praktik
   penggajian kamu.)_
4. **Laporan keuangan arsip furniture**: halaman lama basis `penjualan`
   dihapus total, atau disimpan di route arsip (mis.
   `/dashboard/keuangan/laporan-arsip`)? _(Usulan: rewrite in-place tanpa
   arsip — data pemasukan furniture tetap bisa dilihat dari halaman
   penjualan lama; satu laporan keuangan yang hidup lebih baik daripada
   dua yang membingungkan.)_
