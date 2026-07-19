import {
  MilestonePengiriman,
  AlasanGagal,
  ManifestBiayaKategori,
  PengeluaranKategori,
} from "./types";

// Peta transisi milestone — lihat docs/spec/01-gagal-kirim-pod.md §3.
// retur & selesai adalah terminal (tidak ada transisi keluar).
export const TRANSISI_MILESTONE: Record<MilestonePengiriman, MilestonePengiriman[]> = {
  diproses: ["dijemput"],
  dijemput: ["dikirim"],
  dikirim: ["selesai", "gagal_kirim"],
  gagal_kirim: ["dikirim", "retur"],
  retur: [],
  selesai: [],
};

export function getNextMilestones(current: MilestonePengiriman): MilestonePengiriman[] {
  return TRANSISI_MILESTONE[current] ?? [];
}

// labelPublik dipakai di tracking publik (/resi/[nomor]) — bahasa ramah customer,
// bukan istilah internal staff.
export const ALASAN_GAGAL_CFG: Record<AlasanGagal, { label: string; labelPublik: string }> = {
  penerima_tidak_ada: {
    label: "Penerima Tidak Ada",
    labelPublik: "Penerima tidak ada di tempat",
  },
  alamat_salah: {
    label: "Alamat Salah",
    labelPublik: "Alamat tidak ditemukan / salah",
  },
  tidak_bisa_dihubungi: {
    label: "Tidak Bisa Dihubungi",
    labelPublik: "Penerima tidak dapat dihubungi",
  },
  ditolak_penerima: {
    label: "Ditolak Penerima",
    labelPublik: "Ditolak oleh penerima",
  },
  lainnya: {
    label: "Lainnya",
    labelPublik: "Kendala pengiriman lainnya",
  },
};

// Definisi terlambat — lihat docs/spec/02-petugas-id-dashboard.md §3.
// batas = DATE(tanggal) + estimasi_hari (hari kalender). estimasi_hari NULL
// (kargo / rute tanpa tarif / baris lama) → dikecualikan ("tidak_berlaku"),
// bukan dihitung on-time. retur juga dikecualikan (bukan aktif, bukan selesai).
export type StatusKeterlambatan =
  | "on_time" // selesai, sebelum/pas batas
  | "terlambat_selesai" // selesai, lewat batas
  | "terlambat_aktif" // belum selesai/retur, sudah lewat batas
  | "dalam_proses" // belum selesai/retur, belum lewat batas
  | "tidak_berlaku"; // estimasi_hari NULL, atau milestone retur

function tanggalSaja(d: Date | string): string {
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toISOString().slice(0, 10);
}

export function hitungBatasEstimasi(tanggal: string, estimasiHari: number): Date {
  const batas = new Date(tanggal);
  batas.setUTCDate(batas.getUTCDate() + estimasiHari);
  return batas;
}

// Selisih hari antara waktu referensi (waktu selesai, atau hari ini untuk kiriman
// aktif) dengan batas estimasi. Positif = terlambat sejumlah hari, negatif/0 = tepat waktu.
export function hitungSelisihHari(
  tanggal: string,
  estimasiHari: number,
  referensiWaktu: string | Date
): number {
  const batasStr = tanggalSaja(hitungBatasEstimasi(tanggal, estimasiHari));
  const refStr = tanggalSaja(referensiWaktu);
  const msPerHari = 1000 * 60 * 60 * 24;
  return Math.round(
    (new Date(refStr).getTime() - new Date(batasStr).getTime()) / msPerHari
  );
}

export function getStatusKeterlambatan(params: {
  tanggal: string;
  estimasiHari?: number | null;
  milestone: MilestonePengiriman;
  waktuSelesai?: string | null; // pengiriman_tracking.created_at baris milestone 'selesai' paling awal
}): StatusKeterlambatan {
  const { tanggal, estimasiHari, milestone, waktuSelesai } = params;
  if (estimasiHari == null) return "tidak_berlaku";
  if (milestone === "retur") return "tidak_berlaku";

  const batasStr = tanggalSaja(hitungBatasEstimasi(tanggal, estimasiHari));

  if (milestone === "selesai") {
    if (!waktuSelesai) return "tidak_berlaku";
    return tanggalSaja(waktuSelesai) > batasStr ? "terlambat_selesai" : "on_time";
  }

  // milestone aktif: diproses / dijemput / dikirim / gagal_kirim
  const hariIniStr = tanggalSaja(new Date());
  return hariIniStr > batasStr ? "terlambat_aktif" : "dalam_proses";
}

// Aging piutang — lihat docs/spec/03-customer-korporat.md §3.
// Jatuh tempo = DATE(tanggal) + term_hari (term diambil dari master customer
// saat query, BUKAN snapshot — perubahan term_hari berlaku ke tagihan
// berjalan). Customer term_hari = 0 / kiriman walk-in → jatuh tempo = tanggal kirim.
// Kiriman retur TETAP masuk aging (konsisten keputusan spec 01: ongkir retur
// tetap ditagih) — tidak ada pengecualian milestone di helper ini, filtering
// "yang masuk piutang" (status_bayar != 'lunas') adalah urusan level query.
export type AgingBucket =
  | "belum_jatuh_tempo"
  | "1_7_hari"
  | "8_30_hari"
  | "lebih_30_hari";

export const AGING_BUCKET_CFG: Record<AgingBucket, { label: string }> = {
  belum_jatuh_tempo: { label: "Belum Jatuh Tempo" },
  "1_7_hari": { label: "1–7 Hari" },
  "8_30_hari": { label: "8–30 Hari" },
  lebih_30_hari: { label: "> 30 Hari" },
};

export function hitungJatuhTempo(tanggal: string, termHari: number): Date {
  const jatuhTempo = new Date(tanggal);
  jatuhTempo.setUTCDate(jatuhTempo.getUTCDate() + termHari);
  return jatuhTempo;
}

export function getAgingBucket(
  tanggal: string,
  termHari: number,
  referensiWaktu: string | Date = new Date()
): AgingBucket {
  const jatuhTempoStr = tanggalSaja(hitungJatuhTempo(tanggal, termHari));
  const refStr = tanggalSaja(referensiWaktu);
  if (refStr <= jatuhTempoStr) return "belum_jatuh_tempo";

  const msPerHari = 1000 * 60 * 60 * 24;
  const selisihHari = Math.round(
    (new Date(refStr).getTime() - new Date(jatuhTempoStr).getTime()) / msPerHari
  );
  if (selisihHari <= 7) return "1_7_hari";
  if (selisihHari <= 30) return "8_30_hari";
  return "lebih_30_hari";
}

// Biaya trip manifest — lihat docs/spec/04-biaya-trip.md §3.
export const MANIFEST_BIAYA_KATEGORI_CFG: Record<ManifestBiayaKategori, { label: string }> = {
  uang_jalan: { label: "Uang Jalan" },
  bbm: { label: "BBM" },
  tol: { label: "Tol" },
  kuli: { label: "Kuli" },
  parkir: { label: "Parkir" },
  lainnya: { label: "Lainnya" },
};

// Kategori pengeluaran expedisi — lihat docs/spec/06-keuangan-expedisi.md §2-3.
// wajibArmada: true → form WAJIB tampilkan & isi dropdown armada (maintenance/
// pajak kendaraan). SEMUA maintenance armada (termasuk yang terjadi di tengah
// trip) masuk sini, BUKAN manifest_biaya — biar tidak merusak margin trip
// padahal manfaatnya lintas puluhan trip (kebijakan final spec 04/06).
export const PENGELUARAN_KATEGORI_CFG: Record<
  PengeluaranKategori,
  { label: string; wajibArmada: boolean }
> = {
  gaji: { label: "Gaji", wajibArmada: false },
  sewa: { label: "Sewa", wajibArmada: false },
  utilitas: { label: "Utilitas", wajibArmada: false },
  maintenance_armada: { label: "Maintenance Armada", wajibArmada: true },
  pajak_armada: { label: "Pajak Armada", wajibArmada: true },
  perlengkapan: { label: "Perlengkapan", wajibArmada: false },
  pemasaran: { label: "Pemasaran", wajibArmada: false },
  lainnya: { label: "Lainnya", wajibArmada: false },
};
