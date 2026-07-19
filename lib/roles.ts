// Satu sumber kebenaran untuk role staf — jangan duplikasi literal role di file lain,
// import dari sini. Constraint DB (profiles.role CHECK) harus selalu disinkronkan manual
// dengan daftar ini kalau berubah.
export const ROLES = [
  "superadmin",
  "kasir",
  "keuangan",
  "cs",
  "gudang",
  "kurir",
  "sopir",
] as const;

export type Role = (typeof ROLES)[number];

export const ROLE_LABELS: Record<Role, string> = {
  superadmin: "Super Admin",
  kasir: "Kasir",
  keuangan: "Keuangan",
  cs: "CS",
  gudang: "Gudang",
  kurir: "Kurir",
  sopir: "Sopir",
};

// Role yang diarahkan ke /tugas (halaman mobile lapangan) — dipakai baik
// oleh guard route (app/tugas/layout.tsx) maupun redirect pasca-login
// (app/login/page.tsx), lihat spec 07 KT #3.
export const TUGAS_ROLES: string[] = ["sopir", "kurir"];
