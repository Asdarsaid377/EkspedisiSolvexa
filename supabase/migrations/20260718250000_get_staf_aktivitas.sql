-- ============================================================
-- Spec 05 — Hardening RLS — Step 6: halaman /dashboard/aktivitas
--
-- Masalah: RLS profiles yang sudah ada (di luar scope spec ini, TIDAK
-- diubah) cuma izinkan baca profil sendiri ATAU semua profil kalau
-- superadmin. keuangan (salah satu dari 2 role yang boleh akses halaman
-- aktivitas) tidak bisa join ke profiles utk resolve nama staf lain.
--
-- Solusi sempit: function SECURITY DEFINER yang HANYA expose {id, name}
-- (bukan seluruh kolom profiles) untuk kebutuhan tabel & filter staf di
-- halaman aktivitas — tidak melonggarkan RLS profiles itu sendiri sama
-- sekali. Function menegakkan role gate yang sama dgn select_aktivitas_log
-- (superadmin/keuangan) — pemanggil di luar 2 role itu dapat 0 baris.
-- ============================================================
CREATE OR REPLACE FUNCTION get_staf_aktivitas()
RETURNS TABLE(id UUID, name TEXT) AS $$
  SELECT p.id, p.name FROM profiles p
  WHERE user_has_role(ARRAY['superadmin','keuangan']);
$$ LANGUAGE sql SECURITY DEFINER SET search_path = public STABLE;

NOTIFY pgrst, 'reload schema';
