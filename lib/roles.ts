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
