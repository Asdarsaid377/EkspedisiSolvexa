# Spec: Petugas FK, Dashboard Pengiriman & Laporan Operasional

> Status: ✅ SELESAI & DIARSIPKAN (18 Jul 2026). Ringkasan sudah dipindahkan
> ke `CLAUDE.MD` (§Database Schema bagian "Petugas FK & Definisi Terlambat",
> §Business Logic "COD & Klaim", §Fitur Per Halaman "Dashboard"/"Laporan
> Petugas"/"Laporan Keterlambatan", §Known Issues #16, §Roadmap) dan
> ditandai ✅ di `expedisi.md` §7 poin 7. File ini disimpan sebagai arsip
> riwayat keputusan, bukan dokumen kerja aktif.

---

## 1. Tujuan & Masalah yang Diselesaikan

Tiga masalah sekaligus:

1. **`pengiriman.petugas_nama` adalah TEXT bebas** — estimasi COD berbasis
   pencocokan nama (didokumentasikan sendiri sebagai "estimasi, bukan
   otoritatif"), dan laporan performa per kurir/sopir tidak mungkin presisi.
   Utang ini makin mahal seiring data bertambah.
2. **Dashboard utama & laporan masih baca `penjualan` furniture yang beku**
   sejak 17 Jul — owner membuka dashboard dan melihat angka yang berhenti
   bergerak. Sistem terlihat mati bagi orang yang paling menentukan
   kelanjutan proyek.
3. **`tarif_zona.estimasi_hari` tidak pernah dipakai** — tidak ada laporan
   keterlambatan, padahal ketepatan waktu adalah metrik layanan nomor satu
   expedisi.

## 2. Perubahan Skema

Migration baru: `supabase/migrations/2026XXXXXXXXXX_petugas_dashboard.sql`

```sql
-- =====================================================================
-- A. petugas_id FK + snapshot estimasi_hari di pengiriman
-- =====================================================================
ALTER TABLE pengiriman ADD COLUMN IF NOT EXISTS petugas_id UUID REFERENCES profiles(id);
  -- nullable: petugas non-staff (freelance/harian) tetap boleh teks bebas
  -- TIDAK ON DELETE CASCADE/SET NULL eksplisit → default NO ACTION:
  -- profile yang masih direferensikan pengiriman tidak bisa dihapus (aman)

ALTER TABLE pengiriman ADD COLUMN IF NOT EXISTS estimasi_hari INTEGER;
  -- SNAPSHOT dari tarif_zona saat pengiriman dibuat (bukan JOIN saat query,
  -- karena tarif bisa berubah/dihapus). NULL untuk kargo & baris lama.

CREATE INDEX IF NOT EXISTS idx_pengiriman_petugas_id ON pengiriman (petugas_id);
CREATE INDEX IF NOT EXISTS idx_pengiriman_cabang_id  ON pengiriman (cabang_id);
CREATE INDEX IF NOT EXISTS idx_pengiriman_tanggal    ON pengiriman (tanggal);

-- =====================================================================
-- B. Backfill petugas_id dari pencocokan nama (SEKALI, data masih sedikit)
-- =====================================================================
UPDATE pengiriman pg
SET petugas_id = pr.id
FROM profiles pr
WHERE pg.petugas_id IS NULL
  AND pg.petugas_nama IS NOT NULL
  AND LOWER(TRIM(pg.petugas_nama)) = LOWER(TRIM(pr.name))
  AND pr.role IN ('sopir','kurir');

-- Verifikasi sisa yang tidak ke-match (perbaiki manual kalau typo nama):
-- SELECT id, nomor_faktur, petugas_nama FROM pengiriman
-- WHERE petugas_id IS NULL AND petugas_nama IS NOT NULL;

NOTIFY pgrst, 'reload schema';
```

**Yang TIDAK disentuh:** `petugas_nama`/`petugas_telepon` TETAP ADA sebagai
snapshot display (jangan dihapus — print resi/invoice & baris lama
memakainya). Views publik tidak berubah (petugas tetap tidak diekspos).
Tabel `penjualan` & semua laporan furniture lama tidak diubah (arsip).

## 3. Business Rules

- **Form pengiriman — pemilihan petugas**: dropdown berisi `profiles` role
  `sopir`/`kurir` (+ opsi "Lainnya / bukan staf" → input teks bebas seperti
  sekarang). Pilih dari dropdown → set `petugas_id` + auto-fill
  `petugas_nama` (dari `profiles.name`); pilih "Lainnya" → `petugas_id`
  NULL, teks manual. `petugas_telepon` tetap manual/opsional.
- **Snapshot `estimasi_hari`**: saat lookup `tarif_zona` sukses
  (reguler/express), simpan `estimasi_hari` tarif tsb ke kolom pengiriman.
  Kargo & rute tanpa tarif → NULL. Nilai TIDAK di-update kalau tarif
  berubah belakangan (snapshot, konsisten dengan pola `harga_modal` lama).
- **Definisi terlambat** (laporan keterlambatan):
  ```
  batas    = DATE(tanggal) + estimasi_hari (hari kalender)
  selesai  → terlambat jika DATE(waktu tracking milestone 'selesai') > batas
  aktif    → terlambat jika CURRENT_DATE > batas dan milestone belum
             selesai/retur
  estimasi_hari NULL → dikecualikan dari laporan (bukan dihitung on-time)
  ```
  Waktu selesai diambil dari `pengiriman_tracking.created_at` baris
  milestone `selesai` (paling awal jika ada duplikat).
- **Metrik performa petugas** (basis `petugas_id`, baris `petugas_id` NULL
  masuk bucket "Tanpa Petugas Terdaftar"):
  - Total kiriman ditangani (periode terpilih)
  - Selesai, Gagal kirim (pakai `jumlah_gagal` — total kejadian gagal,
    bukan hanya status akhir), Retur
  - On-time rate = selesai tepat waktu / selesai yang punya `estimasi_hari`
- **Estimasi COD** (`/dashboard/cod`): logika matching diubah jadi —
  utamakan `petugas_id = profile.id`; fallback pencocokan nama HANYA untuk
  baris `petugas_id IS NULL` (data lama/non-staff). Disclaimer "estimasi"
  di UI tetap dipertahankan selama masih ada baris fallback.
- **Dashboard utama** (`/dashboard`) di-rewrite baca `pengiriman`:
  - Filter bulan/tahun (pola lama dipertahankan) + filter cabang baru
  - Stat cards: kiriman bulan ini, revenue ongkir (SUM `total_tagihan`
    kiriman non-retur — lihat Keputusan Terbuka #2), belum lunas (jumlah +
    nominal sisa), gagal kirim aktif, retur
  - Grafik batang kiriman per hari + breakdown per `jenis_layanan`
  - 5 pengiriman terbaru, `nomor_faktur` link ke `/dashboard/pengiriman/[id]`
  - Widget arsip furniture lama DIHAPUS dari dashboard (datanya tetap
    diakses via `/dashboard/penjualan`)
- **Halaman laporan**: `/dashboard/laporan/sopir` di-rewrite in-place jadi
  "Laporan Petugas" berbasis `pengiriman` (halaman lama basis `penjualan`
  tidak dipertahankan — datanya beku, tidak ada nilai). Laporan
  keterlambatan jadi halaman baru `/dashboard/laporan/keterlambatan`.
  Laporan furniture lain (Penjualan, Top Reseller, Review) TIDAK disentuh
  di spec ini.
- **Meja Kerja Owner: DI LUAR SCOPE** spec ini — restrukturisasi terpisah.

## 4. Role & Permission

| Halaman/aksi                                            | Role                                                                                                                                                            | Enforce |
| ------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- |
| Dashboard utama (angka finansial: revenue, belum lunas) | semua role tetap bisa buka dashboard; angka revenue/laba mengikuti pola visibilitas lama (superadmin/keuangan lihat nominal penuh — lihat Keputusan Terbuka #3) | React   |
| Laporan Petugas                                         | superadmin, keuangan, cs (set sama dgn laporan lama)                                                                                                            | React   |
| Laporan Keterlambatan                                   | superadmin, keuangan, cs                                                                                                                                        | React   |
| Form pengiriman — dropdown petugas                      | mengikuti akses form existing                                                                                                                                   | React   |
| `/dashboard/cod`                                        | tidak berubah                                                                                                                                                   | React   |

RLS tidak berubah di spec ini (hardening = spec 05).

## 5. Perubahan UI

- **Form `/dashboard/pengiriman`**: field "Kurir/Sopir" teks bebas diganti
  dropdown staf + opsi "Lainnya" (fallback teks). Simpan `petugas_id` +
  snapshot `estimasi_hari` dari hasil lookup tarif yang sudah ada.
- **`/dashboard` (rewrite)**: lihat §3. Ikuti pola visual dashboard lama
  (stat cards + Recharts bar) — jangan desain ulang dari nol.
- **`/dashboard/laporan/sopir` (rewrite in-place)**: podium top 3 + tabel
  peringkat dipertahankan polanya, kolom baru: selesai / gagal / retur /
  on-time rate. Filter periode + cabang.
- **`/dashboard/laporan/keterlambatan` (baru)**: stat cards (terlambat
  aktif, terlambat selesai, on-time rate keseluruhan), tabel kiriman
  terlambat (resi, penerima kota, petugas, umur vs estimasi, selisih hari)
  — default sort selisih terbesar. Filter periode + cabang + jenis layanan.
  Baris resi link ke detail pengiriman.
- **`/dashboard/cod`**: tidak ada perubahan visual — hanya logika matching
  (§3). Sidebar: tambah "Keterlambatan" di grup Laporan.

## 6. Checklist Implementasi (urutan eksekusi)

- [x] **Step 1** — Migration §2 di Supabase local. Verifikasi: jalankan
      query sisa backfill — baris yang tidak ke-match diperbaiki manual
      atau dibiarkan sadar (non-staff).
- [x] **Step 2** — `lib/types.ts`: `Pengiriman` + `petugas_id`,
      `estimasi_hari`. Helper hitung terlambat di `lib/pengirimanConstants.ts`.
- [x] **Step 3** — Form `/dashboard/pengiriman`: dropdown petugas +
      snapshot `estimasi_hari`. Uji: buat kiriman reguler dgn tarif →
      kolom terisi; kargo → NULL; petugas "Lainnya" → `petugas_id` NULL.
- [x] **Step 4** — `/dashboard/cod`: matching prefer `petugas_id`. Uji
      dengan 1 setoran + 1 kiriman COD ber-`petugas_id`.
- [x] **Step 5** — Rewrite `/dashboard`. Uji dengan data pengiriman local +
      filter cabang.
- [x] **Step 6** — Rewrite `/dashboard/laporan/sopir` jadi Laporan Petugas.
- [x] **Step 7** — Halaman baru `/dashboard/laporan/keterlambatan` +
      sidebar.
- [x] **Step 8** — Update CLAUDE.md (skema pengiriman, §Business Logic
      matching COD & definisi terlambat, §Fitur Per Halaman dashboard +
      2 laporan) & expedisi.md ✅. Arsipkan spec ini.

## Keputusan Terbuka

1. **Dropdown petugas: wajib pilih staf, atau tetap boleh "Lainnya" teks
   bebas?** _(Usulan: boleh "Lainnya" — kalau ada kurir harian lepas.
   Kalau semua petugas pasti staf terdaftar, hapus opsi Lainnya supaya
   `petugas_id` selalu terisi dan disclaimer estimasi COD bisa dihapus
   sepenuhnya untuk data baru.)_
2. **Revenue dashboard: kiriman `retur` dihitung revenue atau tidak?**
   Terkait Keputusan Terbuka #1 spec 01 (ongkir retur tetap ditagih).
   _(Usulan: konsisten dengan keputusan spec 01 — kalau ongkir retur tetap
   ditagih, masuk revenue.)_
3. **Visibilitas nominal di dashboard**: dulu harga modal/laba disembunyikan
   dari kasir. Di expedisi tidak ada harga modal — apakah revenue ongkir &
   total belum-lunas boleh dilihat semua role, atau dibatasi
   superadmin/keuangan? _(Usulan: revenue agregat superadmin/keuangan only;
   jumlah kiriman & status boleh semua role.)_
4. **Bucket "Tanpa Petugas Terdaftar"** di Laporan Petugas: ditampilkan
   sebagai baris sendiri, atau disembunyikan? _(Usulan: tampilkan — supaya
   terlihat berapa banyak kiriman yang datanya bolong dan tim terdorong
   mengisi dropdown dengan benar.)_
