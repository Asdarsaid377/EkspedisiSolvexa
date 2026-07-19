# Spec: Scan QR Resi — Muat Manifest & Update Posisi Cepat

> Status: ✅ SELESAI & DIARSIPKAN (19 Jul 2026). Ringkasan sudah
> dipindahkan ke `CLAUDE.md` (§Tech Stack; §Project Structure;
> §Business Logic "Scan QR — Muat Manifest & Checklist"; §Fitur Per
> Halaman "Manifest" & "Tugas Saya"; §Known Issues #28-30; §Hal-hal yang
> JANGAN Dilakukan #28-31; §Roadmap) dan ditandai ✅ di `expedisi.md` §7
> poin 13. File ini disimpan sebagai arsip riwayat keputusan, bukan
> dokumen kerja aktif.
>
> Prasyarat: spec 01 SELESAI (milestone gagal_kirim ikut alur scan-muat).
> Spec 07 sudah SELESAI juga sebelum Step 4 dikerjakan — scan dipakai juga
> dari `/tugas` (lihat §5).

---

## 1. Tujuan & Masalah yang Diselesaikan

Resi sudah dicetak dengan QR sejak awal (`printPengirimanResi`), tapi
seluruh alur manifest masih pakai search ketik manual — di gudang dengan
20-30 paket menunggu dimuat, ini lambat dan rawan salah pilih (nama
penerima mirip, resi tertukar). QR yang sudah ada di tiap resi belum
dimanfaatkan sama sekali untuk mempercepat kerja fisik ini.

Spec ini menambahkan mode scan kamera untuk dua titik: (a) menambah
kiriman ke manifest saat muat barang, (b) opsional — checklist cepat
"barang sudah difoto/dicek" tanpa mengubah milestone (lihat §3, dibatasi
sengaja supaya tidak tumpang tindih dengan POD spec 01).

## 2. Perubahan Skema

**Tidak ada perubahan skema.** QR yang dicetak sudah berisi `nomor_resi`
(format `BNG-XXXXXXXX`) — scan hanya mengisi field pencarian yang sudah
ada di form manifest, lalu memanggil alur tambah-kiriman existing dari
Fase 3. Tidak ada tabel baru.

**Yang TIDAK disentuh:** format/isi QR di `printPengirimanResi` (tetap
`nomor_resi` polos — jangan diubah jadi JSON/URL, itu breaking change ke
semua resi yang sudah tercetak dan beredar), logika exclude kiriman yang
sudah ada di manifest aktif lain (Fase 3, dipakai apa adanya).

## 3. Business Rules

- **Scan HANYA mengisi kembali alur pencarian existing**, bukan langsung
  insert `manifest_item` — hasil scan tetap melalui validasi yang sama
  (milestone `diproses`/`dijemput`/`gagal_kirim`, exclude dobel-manifest).
  Scan sukses tapi kiriman tidak eligible → tampilkan alasan singkat
  ("sudah ada di manifest MNF-...") sebagai toast, JANGAN blokir sesi
  scan — lanjut ke scan berikutnya otomatis.
- **Mode scan berurutan (continuous)**: kamera tetap aktif setelah satu
  scan sukses, siap untuk resi berikutnya — supaya staf gudang bisa scan
  belasan paket berturut-turut tanpa buka-tutup kamera. Feedback per scan:
  getar (kalau device dukung) + suara pendek + flash hijau/merah di layar
  — bukan dialog konfirmasi yang menghentikan alur.
- **Debounce**: resi yang sama ter-scan dua kali berturut-turut dalam <2
  detik diabaikan (bukan error) — mencegah duplikat akibat kamera membaca
  QR yang sama beberapa frame.
- **Checklist "sudah dicek" (opsional, lihat Keputusan Terbuka #1)**: TIDAK
  mengubah `milestone` maupun tabel apa pun — murni state lokal sesi
  loading di browser (misalnya dicentang di `manifest_item` yang sudah ada
  lewat kolom UI-only, atau ditandai via `urutan` terisi saat itu). Sengaja
  dangkal: kalau kebutuhannya berkembang jadi "checklist resmi dengan
  jejak siapa-kapan", itu spec terpisah, bukan diperluas di sini.
- **Library scanning**: pakai library QR/barcode client-side yang jalan di
  browser mobile (mis. `@zxing/browser` atau `html5-qrcode`) — pilih satu,
  jangan campur dua. Perlu izin kamera browser; tampilkan pesan jelas kalau
  ditolak, dengan fallback ke pencarian ketik manual yang sudah ada (jangan
  buat scan jadi satu-satunya jalan).

## 4. Role & Permission

Tidak ada perubahan role — scan hanyalah cara input alternatif untuk aksi
"tambah kiriman ke manifest" yang role-nya sudah diatur (superadmin,
gudang) di Fase 3. Tidak ada permission baru.

## 5. Perubahan UI

- **`/dashboard/manifest/[id]`**: di panel "Tambah Kiriman" existing,
  tambah toggle/tombol "Scan QR" di samping search box — membuka overlay
  kamera full-screen dengan area target + counter "X kiriman ditambahkan
  sesi ini". Tombol "Selesai Scan" menutup overlay, kembali ke tampilan
  manifest dengan daftar terbarui.
- **Kalau spec 07 sudah berjalan**: sisipkan entry-point sama di `/tugas`
  untuk skenario sopir yang memuat barang sendiri ke armadanya tanpa lewat
  staf gudang — tombol "Scan untuk Muat" di halaman tugas, alur & validasi
  identik, hanya konteks manifest yang aktif untuk sopir tsb (lihat
  Keputusan Terbuka #3, karena butuh cara memilih/konfirmasi manifest
  aktif dari sisi sopir).
- Tidak ada perubahan pada `printPengirimanResi` (QR-nya sudah cukup).

## 6. Checklist Implementasi (urutan eksekusi)

- [x] **Step 1** — Install & uji coba minimal library scan pilihan (§3) di
      halaman percobaan sederhana — pastikan jalan di kamera belakang HP
      Android & iOS Safari sebelum diintegrasikan ke fitur nyata.
- [x] **Step 2** — Overlay scan di `/dashboard/manifest/[id]`: baca QR →
      lookup `nomor_resi` → panggil fungsi tambah-kiriman existing (reuse,
      JANGAN duplikasi logika Fase 3) → feedback sukses/gagal → lanjut scan.
      Uji: scan resi eligible → masuk manifest; scan resi yang sudah di
      manifest lain → toast gagal, kamera tetap aktif; scan resi sama 2×
      cepat → hanya diproses sekali.
- [x] **Step 3** — Checklist "sudah dicek" opsional (kalau Keputusan
      Terbuka #1 dijawab ya) — state UI-only, tidak sentuh DB.
- [x] **Step 4** — (Kondisional, kalau spec 07 sudah ada & KT #3 dijawab)
      Entry-point scan dari `/tugas`.
- [x] **Step 5** — Update CLAUDE.md (§Fitur Per Halaman: mode scan di
      manifest, library dipakai, batasan checklist UI-only) & expedisi.md
      ✅. Arsipkan spec ini.

## Keputusan Terbuka

1. **Checklist "sudah dicek" §3 diperlukan sekarang, atau scan-untuk-tambah
   saja sudah cukup?** _(Usulan: mulai dari scan-untuk-tambah saja — Step
   3 opsional, tunda sampai terbukti dibutuhkan di lapangan setelah Step 2
   dipakai beberapa minggu.)_
   **Jawaban (19 Jul 2026): dikerjakan sekarang** (user minta lanjut Step 3
   langsung, tidak ditunda) — lihat implementasi di §6 Step 3.
2. **Scanner USB/hardware** (yang berperilaku seperti keyboard input) perlu
   didukung juga di form manifest desktop, selain kamera HP? _(Usulan:
   kamera HP dulu — kalau gudang punya scanner fisik, itu sebenarnya sudah
   otomatis bekerja lewat search box existing karena scanner USB umumnya
   mengetik lalu Enter; cukup pastikan search box auto-submit saat Enter,
   tidak perlu kerja tambahan.)_
   **Jawaban (implisit): kamera HP dulu**, sesuai usulan — tidak ada
   pekerjaan tambahan untuk scanner USB di versi ini.
3. **Scan dari `/tugas` (spec 07)**: sopir butuh pilih manifest yang mana
   dulu sebelum scan, atau sistem otomatis pakai manifest aktif miliknya
   hari ini (asumsi satu sopir = satu trip aktif per hari)? Kalau bisa
   dobel-trip sehari, perlu pemilihan eksplisit.
   **Jawaban (19 Jul 2026): otomatis pakai manifest aktif hari ini** —
   asumsi satu sopir/kurir = satu trip aktif per hari diterima. Kalau ada
   lebih dari satu manifest draft/berangkat dengan `tanggal_berangkat`
   hari ini untuk sopir yang sama (di luar asumsi), sistem ambil yang
   PALING BARU dibuat — TIDAK ada UI pemilihan manual di versi ini. Lihat
   `app/tugas/page.tsx` (query manifest aktif) & implementasi Step 4 di §6.
