# Spec: Gagal Kirim, Retur & Proof of Delivery (POD)

> Status: ✅ SELESAI & DIARSIPKAN (18 Jul 2026). Ringkasan sudah dipindahkan
> ke `CLAUDE.MD` (§Database Schema bagian `pengiriman`, §Business Logic
> "Gagal Kirim, Retur & POD", §Fitur Per Halaman, §Known Issues #22,
> §Roadmap) dan ditandai ✅ di `expedisi.md` §7 poin 6. File ini disimpan
> sebagai arsip riwayat keputusan, bukan dokumen kerja aktif.

---

## 1. Tujuan & Masalah yang Diselesaikan

Milestone `pengiriman` saat ini (`diproses → dijemput → dikirim → selesai`)
mengasumsikan semua kiriman sukses. Di operasional nyata, gagal kirim
(penerima tidak ada, alamat salah, ditolak) dan retur ke pengirim adalah
kejadian rutin — tanpa status untuk itu, staff memaksa data ke `selesai`
atau membiarkannya menggantung di `dikirim`, sehingga laporan dan tracking
publik tidak akurat. Selain itu, transisi ke `selesai` sekarang bisa
dilakukan tanpa bukti apa pun — padahal modul Klaim (Fase 4) butuh POD
sebagai dasar memvalidasi/menolak klaim.

Fitur ini menambahkan: (a) dua milestone baru `gagal_kirim` dan `retur`,
(b) alasan gagal terstruktur + counter percobaan, (c) POD wajib (nama
penerima aktual + foto) saat transisi ke `selesai`.

## 2. Perubahan Skema

Migration baru: `supabase/migrations/2026XXXXXXXXXX_gagal_kirim_pod.sql`

```sql
-- =====================================================================
-- A. Perluas CHECK milestone di pengiriman & pengiriman_tracking
--    (constraint lama harus di-DROP dulu — ALTER CHECK tidak bisa in-place)
-- =====================================================================
ALTER TABLE pengiriman DROP CONSTRAINT IF EXISTS pengiriman_milestone_check;
ALTER TABLE pengiriman ADD CONSTRAINT pengiriman_milestone_check
  CHECK (milestone IN ('diproses','dijemput','dikirim','gagal_kirim','retur','selesai'));

ALTER TABLE pengiriman_tracking DROP CONSTRAINT IF EXISTS pengiriman_tracking_milestone_check;
ALTER TABLE pengiriman_tracking ADD CONSTRAINT pengiriman_tracking_milestone_check
  CHECK (milestone IN ('diproses','dijemput','dikirim','gagal_kirim','retur','selesai'));

-- CATATAN: cek dulu nama constraint aktual di DB:
--   SELECT conname FROM pg_constraint WHERE conrelid = 'pengiriman'::regclass;
-- Nama auto-generated Postgres bisa berbeda dari asumsi di atas.

-- =====================================================================
-- B. Kolom baru di pengiriman
-- =====================================================================
ALTER TABLE pengiriman ADD COLUMN IF NOT EXISTS jumlah_gagal INTEGER DEFAULT 0;
  -- counter: +1 setiap transisi ke gagal_kirim (di-update aplikasi, bukan trigger)
ALTER TABLE pengiriman ADD COLUMN IF NOT EXISTS pod_penerima_nama TEXT;
  -- nama orang yang BENAR-BENAR menerima (bisa beda dari penerima_nama)
ALTER TABLE pengiriman ADD COLUMN IF NOT EXISTS pod_foto_url TEXT;
  -- path Storage: tracking/{pengiriman_id}/{timestamp}.{ext} (reuse path lama)

-- =====================================================================
-- C. Kolom alasan gagal di pengiriman_tracking
--    (nullable — hanya diisi untuk baris milestone = 'gagal_kirim')
-- =====================================================================
ALTER TABLE pengiriman_tracking ADD COLUMN IF NOT EXISTS alasan_gagal TEXT
  CHECK (alasan_gagal IS NULL OR alasan_gagal IN
    ('penerima_tidak_ada','alamat_salah','tidak_bisa_dihubungi','ditolak_penerima','lainnya'));

-- =====================================================================
-- D. Recreate views publik (struktur kolom berubah → WAJIB DROP dulu,
--    jangan CREATE OR REPLACE — lihat larangan #16 di CLAUDE.md)
-- =====================================================================
DROP VIEW IF EXISTS pengiriman_riwayat_publik;
CREATE VIEW pengiriman_riwayat_publik AS
SELECT p.nomor_resi, pt.milestone, pt.alasan_gagal, pt.catatan, pt.foto_url, pt.created_at
FROM pengiriman_tracking pt
JOIN pengiriman p ON p.id = pt.pengiriman_id
WHERE p.nomor_resi IS NOT NULL;
GRANT SELECT ON pengiriman_riwayat_publik TO anon;

-- pengiriman_publik TIDAK berubah (milestone baru otomatis lewat kolom yang sama).
-- TETAP TIDAK expose: pod_penerima_nama & jumlah_gagal di view utama
-- (nama penerima aktual = data pribadi; jumlah gagal = detail internal).

NOTIFY pgrst, 'reload schema';
```

**Yang TIDAK disentuh:** tabel `penjualan`/`tracking_progress` lama (arsip
furniture), `pengiriman_pembayaran`, `klaim`, `cod_setoran`, `manifest*`,
semua trigger nomor faktur/resi.

## 3. Business Rules

- **Peta transisi milestone baru** (menggantikan flow linear lama):
  ```
  diproses    → dijemput
  dijemput    → dikirim
  dikirim     → selesai | gagal_kirim
  gagal_kirim → dikirim (kirim ulang) | retur
  retur       → (terminal)
  selesai     → (terminal)
  ```
- **Transisi ke `gagal_kirim` WAJIB** mengisi `alasan_gagal` (dropdown 5
  pilihan) — `catatan` dan foto opsional. Aplikasi meng-increment
  `pengiriman.jumlah_gagal += 1` dalam update yang sama.
- **Transisi ke `selesai` WAJIB POD**: `pod_penerima_nama` (TEXT, min 2
  karakter) + `pod_foto_url` (upload wajib). Tanpa keduanya, tombol Simpan
  di-disable. Enforce di **level aplikasi** (konsisten dengan pola role-gate
  codebase — DB tidak memvalidasi; sebutkan ini di CLAUDE.md gotchas).
- **Transisi ke `retur`** = keputusan bisnis, bukan otomatis. Terminal —
  tidak ada transisi keluar dari `retur`.
- `alasan_gagal` **tampil di tracking publik** dengan label ramah customer
  (mis. `penerima_tidak_ada` → "Penerima tidak ada di tempat"). Mapping
  label di `lib/pengirimanConstants.ts` (file baru, lihat §6).
- **Manifest — dua perubahan perilaku**:
  1. Pencarian "tambah kiriman" di manifest sekarang juga menyertakan
     milestone `gagal_kirim` (kiriman yang mau dikirim ulang), dan tombol
     **Berangkat** ikut mentransisikan `gagal_kirim → dikirim` (tanpa
     increment `jumlah_gagal` — counter hanya naik saat gagal, bukan saat
     coba lagi).
  2. Tombol **Tandai Selesai** di manifest **TIDAK LAGI bulk-update
     milestone kiriman ke `selesai`** — karena `selesai` sekarang wajib POD
     per kiriman, yang mustahil dikumpulkan secara bulk. Tombol itu hanya
     mengubah `manifest.status → selesai` (trip ditutup). Kiriman yang
     belum di-POD tetap `dikirim` dan harus diselesaikan satu-per-satu dari
     halaman detail pengiriman. **Ini breaking change alur kerja sopir —
     komunikasikan ke tim sebelum deploy.**
- Retur **tidak** otomatis membuat `klaim` dan **tidak** mengubah
  `status_bayar` — lihat Keputusan Terbuka #1.
- Laporan/summary: `retur` dihitung terpisah dari `selesai` (jangan
  digabung sebagai "beres" — retur adalah kegagalan layanan yang perlu
  terlihat di metrik).

## 4. Role & Permission

| Transisi                                         | Role                                                                              | Enforce |
| ------------------------------------------------ | --------------------------------------------------------------------------------- | ------- |
| `dikirim → gagal_kirim`                          | superadmin, sopir, kurir, kasir, keuangan (sama dgn set `dikirim → selesai` lama) | React   |
| `gagal_kirim → dikirim` (kirim ulang manual)     | superadmin, gudang, kurir, sopir                                                  | React   |
| `gagal_kirim → dikirim` (via manifest Berangkat) | role bulk manifest existing: superadmin, gudang, sopir, kurir                     | React   |
| `gagal_kirim → retur`                            | superadmin, cs, gudang _(usulan — lihat Keputusan Terbuka #2)_                    | React   |
| `dikirim → selesai` (dengan POD)                 | tidak berubah: superadmin, sopir, kurir, keuangan, kasir                          | React   |

RLS tabel tidak berubah di spec ini (tetap `auth_all_*`) — hardening RLS
per-role adalah spec terpisah (`05-hardening-rls.md`), jangan dicampur.

## 5. Perubahan UI

- **`/dashboard/pengiriman/[id]`** (perubahan terbesar):
  - Ganti logika tombol milestone linear jadi peta transisi §3 (buat helper
    `getNextMilestones(current)` di `lib/pengirimanConstants.ts`).
  - Modal baru "Gagal Kirim": dropdown alasan (wajib) + catatan + foto
    opsional — ikuti pola modal update milestone yang sudah ada.
  - Modal "Tandai Selesai" di-upgrade: field nama penerima aktual (wajib) +
    upload foto POD (wajib) — ikuti pola upload foto bukti pelunasan.
  - Tombol "Retur ke Pengirim" (role sesuai §4) dengan konfirmasi + catatan.
  - Panel info: tampilkan badge `jumlah_gagal` (jika > 0) dan blok POD
    (nama penerima aktual + foto, setelah selesai).
- **`/dashboard/pengiriman`** (list):
  - Kartu ringkasan milestone: tambah kartu "Gagal Kirim" (merah) dan
    "Retur" (abu/oranye), tetap klik-untuk-filter.
- **`/dashboard/manifest/[id]`**:
  - Query pencarian kiriman: tambah `gagal_kirim` ke filter milestone.
  - Aksi Berangkat: sertakan kiriman `gagal_kirim` dalam bulk update.
  - Aksi Tandai Selesai: hapus bulk milestone update (lihat §3).
- **`/resi/[nomor]`** (publik):
  - Step indicator 4-tahap tetap untuk jalur sukses; jika milestone saat
    ini `gagal_kirim` → tampilkan banner kuning "Pengiriman gagal — akan
    dijadwalkan ulang / menunggu keputusan" + alasan (label ramah); jika
    `retur` → banner terminal "Dikembalikan ke pengirim".
  - Riwayat: render `alasan_gagal` (label ramah) di baris gagal kirim.

## 6. Checklist Implementasi (urutan eksekusi)

- [x] **Step 1** — Migration §2 (cek nama constraint aktual dulu!), jalankan
      di Supabase local, verifikasi: insert tracking `gagal_kirim` +
      `alasan_gagal` berhasil, view riwayat publik punya kolom baru.
- [x] **Step 2** — `lib/pengirimanConstants.ts` (baru): type `Milestone`
      diperluas, `TRANSISI_MILESTONE` map, `ALASAN_GAGAL` + label publik,
      `getNextMilestones()`. Update interface `Pengiriman`/
      `PengirimanTracking` di `lib/types.ts` (kolom baru §2).
- [x] **Step 3** — `/dashboard/pengiriman/[id]`: peta transisi + 3 modal
      (gagal / selesai-POD / retur) + panel info POD & jumlah_gagal.
- [x] **Step 4** — `/dashboard/pengiriman`: kartu ringkasan + filter 2
      status baru.
- [x] **Step 5** — `/dashboard/manifest/[id]`: include `gagal_kirim` di
      search & Berangkat; lepas bulk-selesai milestone dari Tandai Selesai.
- [x] **Step 6** — `/resi/[nomor]`: banner gagal/retur + alasan di riwayat.
- [x] **Step 7** — Update CLAUDE.md: §pengiriman (kolom & milestone baru),
      §Business Logic (aturan POD + peta transisi), §Fitur Per Halaman
      (manifest & resi), §Known Issues (POD enforce app-level, bukan DB).
      Tandai ✅ di expedisi.md §7. Arsipkan spec ini.

## Keputusan Terbuka

1. **Retur & tagihan ongkir**: kalau kiriman diretur, apakah ongkir tetap
   ditagih penuh, sebagian, atau dibebaskan? Mempengaruhi apakah perlu aksi
   penyesuaian `total_tagihan`/`status_bayar` saat retur. _(Usulan default:
   tetap ditagih penuh, penyesuaian manual via rollback pembayaran — tanpa
   logic otomatis dulu.)_
2. **Siapa yang berwenang memutuskan retur?** Usulan: superadmin + cs +
   gudang. Konfirmasi.
3. **Batas percobaan kirim**: apakah setelah N kali gagal (mis. 3×) sistem
   menandai/mengingatkan untuk retur, atau murni keputusan manual?
   _(Usulan: manual dulu, cukup badge merah `jumlah_gagal ≥ 3` di list.)_
4. **POD untuk kargo**: kiriman kargo besar kadang diterima gudang/proyek —
   apakah aturan POD sama (nama + foto), atau kargo cukup foto saja?
   _(Usulan: aturan sama untuk semua jenis_layanan — konsisten lebih mudah.)_
