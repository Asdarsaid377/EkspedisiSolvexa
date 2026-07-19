# Spec: Riwayat Transit Multi-Hub

> Status: ✅ SELESAI & DIARSIPKAN (19 Jul 2026). Ringkasan sudah
> dipindahkan ke `CLAUDE.md` (§Database Schema `pengiriman_transit`;
> §Views Publik `pengiriman_transit_publik`; §Business Logic "Riwayat
> Transit Multi-Hub"; §Fitur Per Halaman "Detail Pengiriman"/"Manifest"/
> "Tracking Publik"; §Known Issues #31-33; §Hal-hal yang JANGAN Dilakukan
> #32-35; §Roadmap) dan ditandai ✅ di `expedisi.md` §7 poin 14. File ini
> disimpan sebagai arsip riwayat keputusan, bukan dokumen kerja aktif.
>
> Prasyarat: `cabang` (Fase 5) dan milestone/POD (spec 01) SELESAI. Selaras
> dengan spec 08 (scan QR) tapi tidak wajib — bisa jalan dengan input manual.

---

## 1. Tujuan & Masalah yang Diselesaikan

Milestone `dikirim` sekarang adalah kotak hitam — sekali status masuk
`dikirim`, tidak ada info apa pun sampai `selesai`, padahal kiriman lintas
kota sering melewati beberapa hub transit (gudang sortir) sebelum sampai
tujuan. Customer & staff tidak bisa melihat "barang sekarang di mana",
padahal ini ekspektasi standar industri (JNE/J&T menampilkan timeline
"tiba di gudang transit [kota]", "berangkat dari gudang transit", dst).

Spec ini menambahkan **log transit** yang terpisah dari milestone — murni
informatif, tidak mengubah alur bisnis/role-gate yang sudah ada.

## 2. Perubahan Skema

Migration baru: `supabase/migrations/2026XXXXXXXXXX_transit_hub.sql`

```sql
CREATE TABLE IF NOT EXISTS pengiriman_transit (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pengiriman_id UUID NOT NULL REFERENCES pengiriman(id) ON DELETE CASCADE,
    -- CASCADE (bukan NO ACTION seperti manifest_biaya/klaim) — ini log
    -- operasional yang melekat ke siklus hidup kiriman, bukan catatan
    -- finansial independen; pola sama dengan pengiriman_tracking.
  cabang_id    UUID NOT NULL REFERENCES cabang(id),
    -- reuse tabel cabang sebagai hub — TIDAK ada entitas hub terpisah
  tipe_event   TEXT NOT NULL CHECK (tipe_event IN ('tiba','berangkat')),
  manifest_id  UUID REFERENCES manifest(id),
    -- nullable: terisi otomatis kalau event lahir dari aksi manifest
    -- (§3), NULL kalau diinput manual oleh staf hub
  catatan      TEXT,
  created_by   UUID REFERENCES profiles(id),
  created_at   TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_pengiriman_transit_pengiriman
  ON pengiriman_transit (pengiriman_id, created_at);

ALTER TABLE pengiriman_transit ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_all_pengiriman_transit" ON pengiriman_transit
  FOR ALL USING (auth.uid() IS NOT NULL);
-- Staff-only untuk tulis; role gate presisi di React (§4).

-- View publik BARU — TIDAK menyentuh pengiriman_riwayat_publik existing
-- (aman, tidak ada risiko regresi ke apa pun yang sudah bergantung padanya)
CREATE VIEW pengiriman_transit_publik AS
SELECT pt.pengiriman_id,
       p.nomor_resi,
       c.kota AS hub_kota,     -- HANYA kota, bukan nama/alamat cabang lengkap
       pt.tipe_event,
       pt.created_at
FROM pengiriman_transit pt
JOIN pengiriman p ON p.id = pt.pengiriman_id
JOIN cabang c ON c.id = pt.cabang_id
WHERE p.nomor_resi IS NOT NULL;

GRANT SELECT ON pengiriman_transit_publik TO anon;

NOTIFY pgrst, 'reload schema';
```

**Yang TIDAK disentuh:** kolom `milestone` di `pengiriman` (tidak ada nilai
baru), `pengiriman_tracking` & `pengiriman_riwayat_publik` existing (tetap
apa adanya — timeline publik digabung di level aplikasi, lihat §3), tabel
`cabang` (tidak ada kolom pembeda "hub" vs "cabang biasa" — lihat Keputusan
Terbuka #1).

## 3. Business Rules

- **Transit TIDAK PERNAH mengubah `milestone`** — murni log paralel.
  Transisi milestone tetap sepenuhnya diatur aturan spec 01 (POD wajib ke
  `selesai`, dsb), tidak terpengaruh event transit apa pun.
- **Tidak ada validasi urutan ketat** (mis. mencegah "berangkat" sebelum
  ada "tiba" untuk hub yang sama) — staf operasional kadang input belakangan
  atau salah urutan; ini risiko yang diterima untuk kesederhanaan v1, bukan
  kelalaian (lihat Keputusan Terbuka #3 untuk kapan ini perlu diperketat).
- **Rute TIDAK direncanakan di muka** — tidak ada "hub A → hub B → hub C"
  yang didefinisikan saat kiriman dibuat. Staf mencatat kejadian aktual
  sesuai perjalanan sungguhan. Perencanaan rute adalah fitur jauh lebih
  besar, eksplisit di luar scope (Keputusan Terbuka #2 & roadmap terpisah).
- **Integrasi dengan manifest**: saat tombol **Berangkat** di
  `/dashboard/manifest/[id]` ditekan (Fase 3, bulk update ke `dikirim`) —
  DITAMBAHKAN: kalau `manifest.cabang_id` terisi, insert 1 baris
  `pengiriman_transit` (`tipe_event: 'berangkat'`, `cabang_id` dari
  manifest, `manifest_id` terisi) untuk SETIAP kiriman dalam manifest,
  di transaksi yang sama dengan bulk update milestone yang sudah ada. Kalau
  `manifest.cabang_id` NULL, lewati (tidak ada regresi ke perilaku manifest
  existing yang belum pernah diisi cabang).
- **Tidak ada aksi manifest otomatis untuk event "tiba"** — manifest Fase 3
  tidak punya transisi status yang merepresentasikan "tiba di hub" (hanya
  draft/berangkat/selesai/batal). Event "tiba" HANYA diinput manual oleh
  staf hub penerima (lihat Keputusan Terbuka #4 untuk opsi memperluas ini
  nanti).
- **Timeline publik** di `/resi/[nomor]` = gabungan `pengiriman_riwayat_publik`
  (milestone) + `pengiriman_transit_publik` (transit), digabung & diurutkan
  `created_at` di level aplikasi (dua query, bukan UNION di DB — lebih aman,
  tidak menyentuh view lama). Label: "Tiba di [kota]" / "Berangkat dari
  [kota]" — TIDAK pernah menampilkan nama cabang internal atau alamat.

## 4. Role & Permission

| Aksi                               | Role                                                                                  | Enforce                     |
| ---------------------------------- | ------------------------------------------------------------------------------------- | --------------------------- |
| Input event transit manual         | superadmin, gudang, kurir, sopir (set sama dengan akses transisi milestone `dikirim`) | React                       |
| Auto-insert via manifest Berangkat | mengikuti role bulk-aksi manifest existing (superadmin, gudang, sopir, kurir)         | React                       |
| Lihat riwayat transit (internal)   | semua staf                                                                            | React                       |
| Lihat riwayat transit (publik)     | siapa saja via `/resi/[nomor]`                                                        | View `GRANT SELECT TO anon` |

RLS tabel `auth_all_pengiriman_transit` — hardening per-role lebih presisi
(kalau dibutuhkan) menyusul di siklus hardening berikutnya, konsisten pola
spec 05.

## 5. Perubahan UI

- **`/dashboard/pengiriman/[id]`**: section baru "Riwayat Transit" — daftar
  event (badge Tiba/Berangkat + nama hub + kota + waktu + catatan + asal:
  manual/manifest), form tambah manual (dropdown cabang + tipe event +
  catatan) untuk role yang berwenang (§4).
- **`/dashboard/manifest/[id]`**: tidak ada UI baru — insert transit di
  Step manifest Berangkat berjalan otomatis di balik layar (§3).
- **`/resi/[nomor]`**: timeline riwayat digabung milestone + transit,
  urut waktu, ikon berbeda untuk tiap jenis event (mis. truk untuk
  transit, checkmark untuk milestone) — tetap dalam step indicator
  milestone 4-tahap yang sudah ada sebagai kerangka utama, transit
  tampil sebagai detail tambahan di antara tahap `dikirim`.

## 6. Checklist Implementasi (urutan eksekusi)

- [x] **Step 1** — Migration §2 di local. Verifikasi: insert transit
      manual via SQL, cek view publik menampilkan kota (bukan alamat cabang).
- [x] **Step 2** — `lib/types.ts`: interface `PengirimanTransit`. Section
      Riwayat Transit + form manual di `/dashboard/pengiriman/[id]`. Uji:
      role sopir bisa tambah, role cs tidak (sesuai §4).
- [x] **Step 3** — Auto-insert transit di aksi Berangkat manifest. Uji:
      manifest dengan `cabang_id` terisi → transit muncul di semua kiriman
      anggotanya; manifest tanpa `cabang_id` → tidak ada perubahan
      perilaku (regresi check terhadap Fase 3).
- [x] **Step 4** — Gabung timeline di `/resi/[nomor]` (dua query + merge +
      sort client-side). Uji: kiriman dengan & tanpa event transit
      tampil benar, urutan waktu konsisten.
- [x] **Step 5** — Update CLAUDE.md (skema `pengiriman_transit`,
      §Business Logic aturan transit, §Fitur Per Halaman detail pengiriman + resi publik + integrasi manifest) & expedisi.md ✅. Arsipkan spec ini.

## Keputusan Terbuka

1. **Reuse `cabang` sebagai hub, tanpa pembeda** — konfirmasi ini cukup,
   atau perlu kolom `cabang.tipe` (`cabang_operasional` vs `hub_transit`)
   supaya dropdown pemilihan hub tidak bercampur dengan cabang yang
   sebenarnya kantor staf? _(Usulan: tidak perlu dulu — kalau jumlah
   cabang masih sedikit, satu dropdown gabungan cukup jelas; pisahkan
   nanti kalau daftarnya sudah panjang dan membingungkan.)_
2. **Perencanaan rute di muka** (hub mana saja yang akan dilalui,
   ditentukan saat kiriman dibuat) — dibutuhkan sekarang atau nanti?
   _(Usulan: nanti — ini fitur besar sendiri, versi ad-hoc di spec ini
   sudah memberi visibilitas nyata tanpa kompleksitas perencanaan rute.)_
3. **Validasi urutan tiba/berangkat**: dibiarkan longgar seperti §3, atau
   perlu peringatan (bukan blokir keras) kalau staf input "berangkat" tanpa
   ada "tiba" sebelumnya di hub yang sama? _(Usulan: longgar dulu, evaluasi
   setelah dipakai — kalau kesalahan input ternyata sering, tambah
   peringatan lembut, bukan validasi keras yang bisa menghalangi kerja
   lapangan yang sah.)_
4. **Event "tiba" via manifest**: sekarang hanya "berangkat" yang otomatis
   dari aksi manifest. Perlu ditambah alur formal "manifest tiba di hub
   tujuan" (transisi status baru di manifest), atau cukup staf hub input
   manual "tiba" saat barang benar-benar sampai? _(Usulan: manual dulu —
   menambah transisi status manifest baru adalah perubahan lebih besar
   yang layak dievaluasi terpisah setelah pola pemakaian manual ini
   terbukti kurang.)_
