# Spec: Biaya Trip Manifest & Laporan Laba per Trip

> Status: ✅ SELESAI & DIARSIPKAN (18 Jul 2026). Ringkasan sudah dipindahkan
> ke `CLAUDE.MD` (§Database Schema bagian `manifest_biaya`, §Business Logic
> "Biaya Trip & Laba per Manifest", §Fitur Per Halaman "Manifest"/"Laporan
> Laba per Trip", §Known Issues #19-20, §Hal-hal yang JANGAN Dilakukan
> #18-20, §Roadmap) dan ditandai ✅ di `expedisi.md` §7 poin 9. File ini
> disimpan sebagai arsip riwayat keputusan, bukan dokumen kerja aktif.

---

## 1. Tujuan & Masalah yang Diselesaikan

Manifest sudah mengumpulkan revenue (ongkir kiriman-kiriman di dalamnya)
tapi tidak ada tempat mencatat biaya trip: uang jalan sopir, BBM, tol,
kuli, parkir. Akibatnya profitabilitas per rute/keberangkatan — metrik
nomor satu bisnis kargo — tidak bisa dihitung sama sekali. Owner tidak
bisa menjawab "rute Makassar–Pare tiap Selasa itu untung atau buntung?"

Spec ini menambahkan pencatatan biaya per manifest + panel margin di
detail manifest + laporan laba per trip. Sengaja ringan: ledger biaya
polos, tanpa alur approval/advance/reimburse.

## 2. Perubahan Skema

Migration baru: `supabase/migrations/2026XXXXXXXXXX_manifest_biaya.sql`

```sql
CREATE TABLE IF NOT EXISTS manifest_biaya (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  manifest_id  UUID NOT NULL REFERENCES manifest(id),
    -- default NO ACTION (BUKAN CASCADE): manifest yang sudah punya catatan
    -- biaya = pengeluaran uang nyata, tidak boleh hilang diam-diam ikut
    -- delete manifest. Hapus manifest ber-biaya akan gagal FK — pesan error
    -- mengarahkan hapus/pindahkan biayanya dulu secara sadar (pola sama
    -- seperti cabang yang masih dipakai).
  kategori     TEXT NOT NULL CHECK (kategori IN
                 ('uang_jalan','bbm','tol','kuli','parkir','lainnya')),
  jumlah       NUMERIC(15,2) NOT NULL CHECK (jumlah > 0),
  keterangan   TEXT,
  foto_bukti   TEXT,   -- struk/nota, path: manifest-biaya/{manifest_id}/{timestamp}.{ext}
  created_by   UUID REFERENCES profiles(id),
  created_at   TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_manifest_biaya_manifest ON manifest_biaya (manifest_id);

ALTER TABLE manifest_biaya ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_all_manifest_biaya" ON manifest_biaya
  FOR ALL USING (auth.uid() IS NOT NULL);
-- Staff-only. Role gating di React (konsisten codebase; hardening = spec 05).

NOTIFY pgrst, 'reload schema';
```

**Yang TIDAK disentuh:** tabel `manifest`/`manifest_item`/`pengiriman`
(tidak ada kolom baru di sana — semua agregat dihitung saat query), modul
Pengeluaran keuangan existing (lihat Keputusan Terbuka #2), views publik
(biaya trip TIDAK PERNAH publik).

## 3. Business Rules

- **Biaya bisa diinput di semua status manifest** (draft/berangkat/selesai)
  — sopir mencatat sepanjang jalan, koreksi setelah selesai tetap boleh
  (oleh role koreksi). Manifest `batal` tetap bisa punya biaya (trip yang
  batal di tengah jalan sudah keluar uang BBM).
- **Kategori**: `uang_jalan`, `bbm`, `tol`, `kuli`, `parkir`, `lainnya`
  (wajib isi `keterangan` jika `lainnya`). Foto struk opsional.
- **Revenue trip** = SUM `pengiriman.ongkir` semua kiriman di
  `manifest_item` manifest tsb (lihat Keputusan Terbuka #1 soal
  `biaya_asuransi`). Kiriman `gagal_kirim`/`retur` TETAP dihitung revenue
  — konsisten keputusan spec 01 (ongkir tetap ditagih); kalau keputusan
  spec 01 kamu berbeda, sesuaikan di sini juga.
- **Laba trip** = Revenue − SUM `manifest_biaya.jumlah`. Margin % =
  laba/revenue. Margin negatif ditampilkan merah.
- **Tidak ada sinkronisasi otomatis ke modul Pengeluaran** keuangan —
  kebijakan pencatatan: biaya operasional trip dicatat HANYA di
  `manifest_biaya`, jangan dobel di Pengeluaran (lihat Keputusan Terbuka
  #2; tulis kebijakan finalnya ke CLAUDE.md di Step 6).
- Nilai biaya tidak divalidasi terhadap apapun (tidak ada budget/plafon) —
  murni pencatatan.

## 4. Role & Permission

| Aksi                                        | Role                                                                                    | Enforce |
| ------------------------------------------- | --------------------------------------------------------------------------------------- | ------- |
| Input biaya di detail manifest              | superadmin, gudang, sopir, kurir, keuangan                                              | React   |
| Edit/hapus biaya (koreksi)                  | superadmin, keuangan (pola sama dgn koreksi `cod_setoran`)                              | React   |
| Lihat panel Revenue/Laba di detail manifest | superadmin, keuangan (role lain hanya lihat daftar & total biaya, TANPA revenue/margin) | React   |
| Laporan Laba per Trip                       | superadmin, keuangan                                                                    | React   |

## 5. Perubahan UI

- **`/dashboard/manifest/[id]`**: section baru "Biaya Trip" — daftar baris
  biaya (badge kategori, jumlah, keterangan, foto, siapa & kapan), form
  tambah inline (kategori + jumlah + keterangan + foto), ikon hapus/edit
  per baris (role koreksi). Di atasnya panel ringkas 3 angka: Revenue
  (ongkir terkumpul), Total Biaya, Laba/Margin — panel revenue/laba hanya
  render untuk superadmin/keuangan (§4).
- **`/dashboard/laporan/laba-trip` (baru)**: filter periode + cabang +
  status manifest; stat cards (total trip, total revenue, total biaya,
  total laba); tabel per manifest — nomor, tanggal, rute, armada, sopir,
  jumlah kiriman, revenue, biaya (breakdown per kategori di expand/detail),
  laba, margin % (merah jika negatif), sort default laba terkecil (yang
  rugi muncul duluan). Baris link ke detail manifest.
- **Sidebar**: "Laba per Trip" di grup Laporan (visible superadmin/keuangan).

## 6. Checklist Implementasi (urutan eksekusi)

- [x] **Step 1** — Migration §2 di local. Verifikasi: insert biaya via SQL;
      coba `DELETE` manifest yang punya biaya → harus gagal FK.
- [x] **Step 2** — `lib/types.ts`: interface `ManifestBiaya` + konstanta
      kategori & label di `lib/pengirimanConstants.ts`.
- [x] **Step 3** — Section Biaya Trip di `/dashboard/manifest/[id]` (input +
      daftar + hapus/edit). Uji: input sebagai role sopir (boleh), hapus
      sebagai sopir (tidak boleh), hapus sebagai keuangan (boleh).
- [x] **Step 4** — Panel Revenue/Total Biaya/Laba di detail manifest
      (role-gated). Uji: login role gudang → panel revenue tidak tampil.
- [x] **Step 5** — `/dashboard/laporan/laba-trip` + sidebar. Uji dengan
      minimal 2 manifest: satu margin positif, satu negatif (butuh seed
      biaya > revenue).
- [x] **Step 6** — Update CLAUDE.md (skema, §Business Logic formula laba
      trip + kebijakan anti-dobel dgn Pengeluaran, §Fitur Per Halaman) &
      expedisi.md ✅. Arsipkan spec ini.

## Keputusan Terbuka

1. **Revenue trip: `ongkir` saja, atau `ongkir + biaya_asuransi`?**
   _(Usulan: ongkir saja — asuransi adalah fee dengan liabilitas klaim di
   baliknya, mencampurnya membuat margin trip terlihat lebih gemuk dari
   kenyataan. Asuransi cukup terlihat di laporan keuangan umum.)_
2. **Kebijakan anti-dobel dengan modul Pengeluaran**: biaya trip dicatat
   hanya di `manifest_biaya` (usulan), ATAU tetap direkap manual ke
   Pengeluaran oleh keuangan tiap periode? Tentukan satu, tulis ke
   CLAUDE.md — dua sumber pencatatan tanpa aturan = angka keuangan ganda.
3. **Sopir boleh edit/hapus biaya yang dia input sendiri** (misal salah
   ketik, sebelum manifest selesai)? _(Usulan: tidak — biar sederhana,
   salah input minta koreksi ke keuangan; kalau di lapangan terbukti
   merepotkan baru dilonggarkan jadi "boleh hapus baris sendiri selama
   manifest belum selesai".)_
4. **Uang jalan yang diberikan di muka (advance)**: dicatat sebagai biaya
   saat diberikan, dan kalau ada sisa dikembalikan bagaimana? _(Usulan:
   catat advance penuh sebagai `uang_jalan`; sisa yang dikembalikan dicatat
   keuangan sebagai koreksi/edit nilai baris tsb — tanpa entitas advance
   terpisah. Kalau praktik advance ternyata rutin dan nilainya besar, baru
   layak spec sendiri.)_
