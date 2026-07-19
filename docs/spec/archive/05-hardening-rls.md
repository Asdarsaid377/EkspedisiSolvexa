# Spec: Hardening RLS Tabel Finansial & Audit Trail Aksi Sensitif

> Status: ✅ SELESAI & DIARSIPKAN (18 Jul 2026). Ringkasan sudah
> dipindahkan ke `CLAUDE.MD` (§RLS — rewrite total: matriks per tabel,
> jebakan permissive-policy, `user_has_role()`, granularitas app-level,
> `aktivitas_log`/`logAktivitas()`, gotcha RETURNING+RLS,
> `get_staf_aktivitas()`; §Auth & Role System bagian Roles; §Known Issues
> #21-23; §Hal-hal yang JANGAN Dilakukan #21-24; §Roadmap) dan ditandai ✅
> di `expedisi.md` §7 poin 10. File ini disimpan sebagai arsip riwayat
> keputusan, bukan dokumen kerja aktif.
>
> Prasyarat: spec 04 selesai (manifest_biaya ikut dicakup hardening ini).
>
> ⚠️ SIFAT SPEC INI BEDA dari spec 01-04: bukan fitur baru, tapi
> mengencangkan yang sudah jalan. Risiko utamanya REGRESI — RLS yang salah
> membuat halaman yang tadinya berfungsi tiba-tiba kosong/error 403.
> Karena itu: eksekusi per kelompok tabel, uji per role setelah TIAP step,
> dan siapkan akun uji per role di local SEBELUM mulai.

---

## 1. Tujuan & Masalah yang Diselesaikan

Semua tabel finansial expedisi (`tarif_zona`, `klaim`, `cod_setoran`,
`pengiriman_pembayaran`, `manifest_biaya`, `pengiriman`) hanya digating
`auth.uid() IS NOT NULL` — role gate cuma di React. Artinya staf role
apapun yang memegang JWT-nya sendiri bisa hit REST API PostgREST langsung
untuk: approve klaimnya sendiri, edit tarif, hapus setoran COD, atau hapus
pengiriman beserta seluruh riwayat pembayarannya (cascade) tanpa jejak.
Untuk sistem yang memegang uang titipan COD dan klaim ganti rugi, ini
vektor fraud nyata, bukan sekadar kerapian.

Dua lapis perbaikan: (a) RLS per-role untuk operasi TULIS di tabel
finansial — SELECT tetap longgar untuk semua staf (tidak ada perubahan
perilaku baca), (b) tabel `aktivitas_log` yang mencatat siapa-kapan-apa
untuk aksi sensitif, supaya aksi yang _sah_ tapi mencurigakan tetap
terlihat.

## 2. Perubahan Skema

> **JEBAKAN RLS PALING PENTING**: policy Postgres bersifat PERMISSIVE
> (di-OR). Menambah policy sempit TANPA men-drop `auth_all_*` FOR ALL yang
> lama = TIDAK ADA EFEK APAPUN — policy lama tetap meloloskan semua.
> Setiap tabel yang di-harden WAJIB: DROP policy lama → CREATE ulang
> per-operasi (SELECT/INSERT/UPDATE/DELETE) dengan role set masing-masing.
> Catatan: `service_role` (API routes) bypass RLS — tidak terpengaruh.

Migration: **SATU FILE PER KELOMPOK** sesuai step di §6 — supaya bisa
di-revert per kelompok kalau ada regresi.

```sql
-- =====================================================================
-- Helper: cek role user aktif (dipakai semua policy di bawah)
-- =====================================================================
CREATE OR REPLACE FUNCTION user_has_role(roles TEXT[])
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = ANY(roles)
  );
$$ LANGUAGE sql SECURITY DEFINER SET search_path = public STABLE;

-- =====================================================================
-- Tabel aktivitas_log (append-only)
-- NAMA SENGAJA BUKAN audit_log — tabel audit_log sudah ada untuk
-- audit_nota/stock_opname furniture, jangan disentuh/dicampur.
-- =====================================================================
CREATE TABLE IF NOT EXISTS aktivitas_log (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  aksi        TEXT NOT NULL,      -- 'delete_pengiriman' | 'rollback_pembayaran'
                                  -- | 'approve_klaim' | 'tolak_klaim'
                                  -- | 'edit_setoran_cod' | 'hapus_setoran_cod'
                                  -- | 'edit_tarif' | 'hapus_tarif'
                                  -- | 'edit_biaya_trip' | 'hapus_biaya_trip'
  entitas     TEXT NOT NULL,      -- nama tabel terkait
  entitas_id  UUID,
  ref         TEXT,               -- nomor dokumen (resi/faktur/klaim) utk display
  detail      JSONB,              -- snapshot nilai penting sebelum/sesudah
  created_by  UUID REFERENCES profiles(id),
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_aktivitas_log_created ON aktivitas_log (created_at DESC);

ALTER TABLE aktivitas_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "insert_aktivitas_log" ON aktivitas_log FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL AND created_by = auth.uid());
CREATE POLICY "select_aktivitas_log" ON aktivitas_log FOR SELECT
  USING (user_has_role(ARRAY['superadmin','keuangan']));
-- SENGAJA tidak ada policy UPDATE/DELETE = log immutable untuk semua
-- kecuali service_role. Ini bukan kelalaian.

NOTIFY pgrst, 'reload schema';
```

**Matriks RLS target per tabel.** SELECT semua tabel TETAP semua staf
(`auth.uid() IS NOT NULL`) kecuali disebut lain — tidak ada perubahan
perilaku baca:

| Tabel                   | INSERT                                                                                                  | UPDATE                                                               | DELETE                                 |
| ----------------------- | ------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- | -------------------------------------- |
| `tarif_zona`            | superadmin                                                                                              | superadmin                                                           | superadmin                             |
| `cabang`                | superadmin                                                                                              | superadmin                                                           | superadmin                             |
| `pengiriman_pembayaran` | superadmin, kasir, keuangan                                                                             | — (tanpa policy = tidak bisa; memang tidak ada alur edit pembayaran) | superadmin, kasir, keuangan (rollback) |
| `pengiriman`            | tidak berubah (semua staf operasional)                                                                  | tidak dipersempit di spec ini (milestone dkk tetap app-level)        | lihat Keputusan Terbuka #1             |
| `klaim`                 | semua staf                                                                                              | superadmin, keuangan                                                 | superadmin                             |
| `cod_setoran`           | superadmin, keuangan, kurir, sopir — plus `WITH CHECK`: kurir/sopir hanya boleh `sopir_id = auth.uid()` | superadmin, keuangan                                                 | superadmin, keuangan                   |
| `manifest_biaya`        | superadmin, gudang, sopir, kurir, keuangan                                                              | superadmin, keuangan                                                 | superadmin, keuangan                   |

**Granularitas yang RLS TIDAK bisa jaga** (tetap app-level, tulis ke
CLAUDE.md di Step 7): approve vs tandai-selesai klaim sama-sama UPDATE —
RLS tidak membedakan kolom, jadi "approve superadmin only" tetap dijaga
React saja (keuangan secara teknis bisa UPDATE via API; diterima sadar,
terekam di log).

**Yang TIDAK disentuh:** RLS tabel furniture lama, `absensi`/
`face_enrollment` (sudah granular), views publik, tabel non-finansial
(`armada`/`manifest`/`manifest_item`/`customer`/`pengiriman_tracking` —
bisa menyusul nanti, JANGAN perluas scope sekarang).

## 3. Business Rules

- **Logging via helper `logAktivitas()`** (file baru `lib/aktivitas.ts`) —
  dipanggil SETELAH aksi sensitif sukses, fire-and-forget: gagal log tidak
  membatalkan aksi utama, cukup `console.error`. Daftar titik sisip =
  daftar nilai `aksi` di skema atas.
- **Keterbatasan jujur**: logging app-level bisa di-bypass oleh yang hit
  REST API langsung — tapi dikombinasi RLS baru, yang bisa bypass logging
  hanyalah role yang memang berwenang melakukan aksinya. Trigger DB (tak
  bisa di-bypass) = upgrade masa depan, di luar scope.
- **Nol perubahan perilaku untuk pengguna berwenang** — kalau setelah
  hardening ada halaman error/kosong untuk role yang seharusnya boleh, itu
  regresi: perbaiki dulu sebelum lanjut step berikutnya.

## 4. Role & Permission

Matriks §2 ADALAH permission-nya — enforce di **RLS (DB)**. Role gate React
existing dipertahankan apa adanya sebagai lapisan UX. Halaman baru
`/dashboard/aktivitas`: superadmin + keuangan (Keputusan Terbuka #3).

## 5. Perubahan UI

- **`/dashboard/aktivitas` (baru)**: tabel log read-only — waktu, staf,
  badge aksi, ref (link ke entitas kalau masih ada), detail expand (JSON
  ringkas). Filter: rentang tanggal, jenis aksi, staf. Tanpa aksi tulis
  apapun. Sidebar: "Log Aktivitas" di grup Admin.
- Tidak ada perubahan UI lain — semua halaman existing harus terlihat dan
  berperilaku persis sama untuk role yang berwenang.

## 6. Checklist Implementasi (urutan eksekusi)

- [ ] **Step 0** — Siapkan akun uji per role di local (kasir, keuangan,
      gudang, kurir, sopir, cs) kalau belum ada. Tanpa ini step berikutnya
      tidak bisa diverifikasi.
- [ ] **Step 1** — Migration: `user_has_role()` + `aktivitas_log`.
      Verifikasi: insert log sebagai app-user OK; UPDATE/DELETE log → gagal.
- [ ] **Step 2** — `logAktivitas()` + sisipkan ke semua titik aksi sensitif
      existing. Verifikasi: lakukan 1 rollback pembayaran → baris log muncul
      dengan ref & detail benar.
- [ ] **Step 3** — Hardening kelompok A: `tarif_zona` + `cabang` (migration
      sendiri). Uji: sebagai kasir, hit REST UPDATE tarif → tertolak;
      superadmin CRUD dari halaman → tetap normal.
- [ ] **Step 4** — Hardening kelompok B: `pengiriman_pembayaran` +
      `pengiriman` DELETE. Uji per role: pelunasan satuan kasir OK,
      pelunasan massal (spec 03) OK, rollback OK; role di luar daftar →
      tertolak di DB.
- [ ] **Step 5** — Hardening kelompok C: `klaim` + `cod_setoran` +
      `manifest_biaya`. Uji: sopir setoran diri sendiri OK, atas nama orang
      lain → tertolak; sopir input biaya trip OK, hapus biaya → tertolak;
      alur approve klaim superadmin dari halaman → normal.
- [ ] **Step 6** — Halaman `/dashboard/aktivitas` + sidebar.
- [ ] **Step 7** — Update CLAUDE.md (§RLS di-rewrite total: matriks per
      tabel + jebakan permissive-policy + granularitas yang tetap
      app-level + keberadaan `user_has_role()`) & expedisi.md ✅. Arsipkan
      spec ini.

## Keputusan Terbuka

1. **DELETE `pengiriman` dipersempit jadi siapa?** Sekarang 5 role bisa
   menghapus record finansial + cascade seluruh riwayat pembayarannya.
   _(Usulan: superadmin + keuangan saja. Kasir/kurir/gudang yang salah
   input minta hapus ke atasan — friksi kecil, perlindungan besar.)_
2. **Soft-delete `pengiriman`** (kolom `dibatalkan_at`) sebagai ganti hard
   delete? _(Usulan: TIDAK di spec ini — perubahannya menyebar ke semua
   query list/laporan/view. `aktivitas_log` + DELETE dipersempit sudah
   menutup risiko utama. Evaluasi lagi kalau kasus salah-hapus ternyata
   terjadi.)_
3. **Siapa boleh baca Log Aktivitas?** _(Usulan: superadmin + keuangan.
   Kalau owner mau log untuk dirinya saja → superadmin only.)_
4. **Retensi log**: dibiarkan tumbuh, atau ada kebijakan arsip? _(Usulan:
   biarkan dulu — volume kecil; evaluasi setahun lagi.)_
