# Spec: Tugas Saya — Halaman Mobile untuk Kurir/Sopir

> Status: ✅ SELESAI & DIARSIPKAN (19 Jul 2026). Ringkasan sudah
> dipindahkan ke `CLAUDE.md` (§Project Structure; §Business Logic "Gagal
> Kirim, Retur & POD" — catatan ekstraksi `lib/pengirimanAksi.ts`;
> §Auth & Role System; §Fitur Per Halaman "Tugas Saya"; §Known Issues
> #26-27; §Roadmap) dan ditandai ✅ di `expedisi.md` §7 poin 12. File ini
> disimpan sebagai arsip riwayat keputusan, bukan dokumen kerja aktif.
>
> Prasyarat: spec 01 (milestone gagal_kirim/retur + POD) dan spec 02
> (petugas_id) SELESAI — halaman ini murni UI baru di atas keduanya.

---

## 1. Tujuan & Masalah yang Diselesaikan

Sejak spec 01, menyelesaikan kiriman wajib POD (nama penerima + foto) per
kiriman — tidak bisa lagi bulk dari manifest. Tapi satu-satunya jalan
melakukan itu sekarang adalah `/dashboard/pengiriman/[id]`, halaman
desktop-oriented (sidebar, tabel padat) yang dibuka kurir dari HP di jalan.
Kalau prosesnya terasa berat, risiko nyatanya: kurir menunda update sampai
akhir hari atau melewatinya — dan POD yang jadi alasan seluruh spec 01
tidak pernah benar-benar terisi dengan disiplin.

Spec ini membuat satu halaman ringan, mobile-first: kurir/sopir login →
langsung lihat daftar tugas miliknya hari ini → satu tap besar untuk
Selesai (kamera langsung) atau Gagal Kirim (dropdown alasan). Tanpa
sidebar, tanpa tabel, tanpa fitur yang tidak relevan buat mereka.

## 2. Perubahan Skema

**Tidak ada tabel/kolom baru.** Spec ini murni UI di atas skema `pengiriman`

- `pengiriman_tracking` yang sudah ada sejak spec 01/02.

```sql
-- Satu index tambahan untuk mempercepat query utama halaman ini
-- (petugas_id + milestone aktif, diakses setiap buka halaman):
CREATE INDEX IF NOT EXISTS idx_pengiriman_petugas_milestone
  ON pengiriman (petugas_id, milestone);
```

**Yang TIDAK disentuh:** tidak ada migration lain, tidak ada perubahan RLS
(halaman ini query dengan kondisi user sendiri, RLS existing sudah cukup),
tidak ada perubahan ke `/dashboard/pengiriman/[id]` (tetap ada, dipakai
role non-lapangan).

## 3. Business Rules

- **Daftar tugas** = `pengiriman` WHERE `petugas_id = auth.uid()` AND
  `milestone IN ('dijemput','dikirim','gagal_kirim')` — ini "kerjaan
  aktif". Kiriman `selesai`/`retur` pindah ke tab riwayat (lihat §5),
  bukan hilang.
- **Kiriman dengan `petugas_id` NULL tidak muncul di halaman siapa pun** —
  konsekuensi jujur dari opsi "Lainnya" di form pengiriman (Keputusan
  Terbuka #1 spec 02). Kalau opsi itu masih dipakai di lapangan, kiriman
  non-staf harus tetap dikelola dari `/dashboard/pengiriman` biasa. Catat
  ini sebagai keterbatasan yang diketahui, bukan bug.
- **Aksi Gagal Kirim & Selesai memanggil logika yang SAMA PERSIS** dengan
  `/dashboard/pengiriman/[id]` dari spec 01 (validasi wajib alasan, wajib
  POD nama+foto) — bungkus ulang komponennya untuk tampilan mobile
  (`lib/pengirimanAksi.ts` baru berisi fungsi bersama, dipanggil dari
  kedua halaman), JANGAN duplikasi logika jadi dua implementasi terpisah
  yang bisa divergen.
- **Kamera langsung aktif** saat tap "Selesai" (bukan pilih file dari
  galeri sebagai default) — pola sama dengan absensi wajah, pakai
  `capture="environment"` pada input file atau native camera API kalau
  tersedia. Tetap sediakan fallback pilih dari galeri untuk device yang
  tidak dukung.
- **Tanpa dukungan offline** di versi ini (lihat Keputusan Terbuka #2) —
  kalau sinyal hilang di tengah upload foto, tampilkan error jelas + tombol
  coba lagi, jangan silent fail.
- **Urutan daftar**: kiriman `gagal_kirim` (butuh tindak lanjut) di paling
  atas, lalu `dikirim`, lalu `dijemput` — bukan urut tanggal, supaya yang
  paling butuh perhatian selalu terlihat duluan.

## 4. Role & Permission

| Akses                            | Role                                           | Enforce                                    |
| -------------------------------- | ---------------------------------------------- | ------------------------------------------ |
| Buka `/tugas`                    | sopir, kurir                                   | React (redirect role lain ke `/dashboard`) |
| Lihat & aksi hanya tugas sendiri | otomatis dari filter `petugas_id = auth.uid()` | Query-level (bukan RLS baru di spec ini)   |

Superadmin/keuangan/dst TIDAK mengakses `/tugas` — mereka tetap pakai
`/dashboard/pengiriman/[id]` untuk kebutuhan non-lapangan.

## 5. Perubahan UI

- **`/tugas` (baru, route terpisah — lihat asumsi arsitektur di atas)**:
  - Layout minimal sendiri (`app/tugas/layout.tsx`) — TANPA Sidebar,
    header ringkas (nama user + tombol logout), viewport mobile-first.
  - Tab "Aktif" (default) / "Selesai Hari Ini" (riwayat ringkas, read-only).
  - Tiap kiriman = kartu besar: resi, penerima + kota tujuan, badge
    milestone, dua tombol besar full-width — "Gagal Kirim" (outline merah)
    dan "Selesai" (solid hijau, kalau milestone memungkinkan).
  - Tap "Selesai" → sheet/modal mobile: kamera aktif, field nama penerima,
    tombol Simpan (disabled sampai keduanya terisi — konsisten aturan
    spec 01).
  - Tap "Gagal Kirim" → sheet/modal mobile: dropdown alasan (5 pilihan
    spec 01), catatan opsional, tombol Simpan.
  - Tap kartu (bukan tombol) → detail ringkas: alamat lengkap tujuan +
    telepon penerima dengan tombol telepon langsung (`tel:`) dan WA
    (`waLink()` existing) — kurir sering perlu menghubungi penerima
    sebelum sampai.
- **Login**: gunakan alur login existing; SETELAH login, kalau role
  sopir/kurir DAN device terdeteksi mobile (viewport sempit) → redirect
  otomatis ke `/tugas` alih-alih `/dashboard` (lihat Keputusan Terbuka #3).
  Tetap sediakan link kecil "Buka Dashboard Lengkap" untuk kurir yang
  sesekali perlu akses fitur lain.
- Tidak ada perubahan pada `/dashboard/pengiriman/[id]` — tetap berfungsi
  penuh sebagai jalur non-lapangan.

## 6. Checklist Implementasi (urutan eksekusi)

- [x] **Step 1** — Migration index §2. Ekstrak logika bersama Gagal
      Kirim/Selesai dari `/dashboard/pengiriman/[id]` ke
      `lib/pengirimanAksi.ts` TANPA mengubah perilaku halaman itu — uji
      halaman lama masih berfungsi identik setelah refactor ini.
- [x] **Step 2** — `app/tugas/layout.tsx` + halaman dasar: fetch & tampilkan
      daftar tugas aktif (kartu, tanpa aksi dulu). Uji: login sebagai
      sopir dengan kiriman ber-`petugas_id` dirinya → muncul; kiriman milik
      petugas lain → tidak muncul.
- [x] **Step 3** — Modal Selesai (kamera + nama + POD) memanggil
      `lib/pengirimanAksi.ts`. Uji: submit tanpa foto → tertahan; submit
      lengkap → milestone berubah, foto tersimpan, cek dari
      `/dashboard/pengiriman/[id]` datanya konsisten.
- [x] **Step 4** — Modal Gagal Kirim. Uji serupa Step 3.
- [x] **Step 5** — Tab riwayat "Selesai Hari Ini" + detail ringkas (telepon/WA).
- [x] **Step 6** — Redirect otomatis pasca-login sesuai Keputusan Terbuka #3.
- [x] **Step 7** — Update CLAUDE.md (§Fitur Per Halaman: `/tugas`, catatan
      shared logic di `pengirimanAksi.ts`, keterbatasan petugas_id NULL) &
      expedisi.md ✅. Arsipkan spec ini.

## Keputusan Terbuka

1. **Konfirmasi arsitektur route**: saya asumsikan `/tugas` terpisah dari
   `/dashboard` (layout ringan sendiri). Kalau ternyata kamu mau tetap di
   bawah `/dashboard` dengan sidebar yang collapse otomatis di mobile,
   beri tahu sebelum Step 2 — pendekatan Step 2 berubah signifikan.
2. **Dukungan offline**: perlu sekarang, atau nanti kalau sinyal lapangan
   terbukti jadi masalah nyata? _(Usulan: nanti — PWA/offline-queue adalah
   pekerjaan besar sendiri, jangan digabung ke spec yang sudah punya tujuan
   jelas ini.)_
3. **Redirect otomatis pasca-login**: berdasarkan role saja, atau role +
   deteksi viewport mobile? _(Usulan: role saja lebih sederhana dan lebih
   bisa diprediksi — sopir/kurir yang login dari HP maupun laptop kantor
   sama-sama diarahkan ke `/tugas`, dengan link jelas ke dashboard lengkap
   kalau memang perlu.)_
4. **Kiriman `petugas_id` NULL untuk sopir/kurir**: opsi "Lainnya" di form
   pengiriman (spec 02) masih mau dipertahankan? Kalau di lapangan semua
   petugas sudah pasti staf terdaftar, ini saat yang tepat menghapus opsi
   itu — sehingga tidak ada lagi kiriman yang "tidak kelihatan" di `/tugas`
   siapa pun.
