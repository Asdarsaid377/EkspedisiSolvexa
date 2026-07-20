export type { Role } from './roles'
import type { Role } from './roles'

export interface Profile {
  id: string
  name: string
  role: Role
  created_at: string
}

export type JenisLayanan = 'reguler' | 'express' | 'kargo'
export type MilestonePengiriman =
  | 'diproses'
  | 'dijemput'
  | 'dikirim'
  | 'gagal_kirim'
  | 'retur'
  | 'selesai'

export type AlasanGagal =
  | 'penerima_tidak_ada'
  | 'alamat_salah'
  | 'tidak_bisa_dihubungi'
  | 'ditolak_penerima'
  | 'lainnya'

export interface Pengiriman {
  id: string
  nomor_faktur: string
  nomor_resi?: string
  tanggal: string

  jenis_layanan: JenisLayanan

  pengirim_nama: string
  pengirim_telepon?: string
  pengirim_alamat?: string
  pengirim_kota?: string
  customer_id?: string
  customer?: { nama: string; tipe: CustomerTipe }

  penerima_nama: string
  penerima_telepon?: string
  penerima_alamat?: string
  penerima_kota?: string

  berat_kg: number
  panjang_cm?: number
  lebar_cm?: number
  tinggi_cm?: number
  berat_volumetrik_kg?: number

  isi_barang?: string
  nilai_barang?: number

  ongkir: number
  biaya_asuransi: number
  total_tagihan: number

  status_bayar: 'lunas' | 'dp' | 'belum_bayar'
  metode_bayar: 'transfer' | 'cod' | 'cash'
  uang_dp: number

  milestone: MilestonePengiriman
  jumlah_gagal?: number
  pod_penerima_nama?: string
  pod_foto_url?: string

  petugas_nama?: string
  petugas_telepon?: string
  petugas_id?: string
  petugas?: { name: string }

  estimasi_hari?: number

  catatan?: string
  catatan_internal?: string
  created_by?: string
  created_at: string
  updated_at: string

  cabang_id?: string
  cabang?: { nama: string }

  pembayaran?: PengirimanPembayaran[]
  profile?: Profile
}

export type CustomerTipe = 'umum' | 'korporat'

export interface Customer {
  id: string
  nama: string
  tipe: CustomerTipe
  telepon?: string
  alamat?: string
  kota?: string
  pic_nama?: string
  pic_telepon?: string
  term_hari: number
  catatan?: string
  aktif: boolean
  created_by?: string
  created_at: string
  updated_at: string
}

export interface Cabang {
  id: string
  nama: string
  kota?: string
  alamat?: string
  telepon?: string
  catatan?: string
  aktif: boolean
  created_at: string
  updated_at: string
}

export interface PengirimanTracking {
  id: string
  pengiriman_id: string
  milestone: MilestonePengiriman
  alasan_gagal?: AlasanGagal
  catatan?: string
  foto_url?: string
  created_by?: string
  created_at: string
  creator?: { name: string }
}

// Log transit multi-hub — TERPISAH dari milestone (spec 09), murni
// informatif. TIDAK PERNAH mengubah pengiriman.milestone.
export type TransitTipeEvent = 'tiba' | 'berangkat'

export interface PengirimanTransit {
  id: string
  pengiriman_id: string
  cabang_id: string
  tipe_event: TransitTipeEvent
  manifest_id?: string
  catatan?: string
  created_by?: string
  created_at: string
  cabang?: { nama: string; kota?: string }
  creator?: { name: string }
  manifest?: { nomor_manifest: string }
}

export interface PengirimanPembayaran {
  id: string
  pengiriman_id: string
  jumlah: number
  metode: 'transfer' | 'cod' | 'cash'
  catatan?: string
  foto_url?: string
  created_at: string
}

export type KlaimTipe = 'hilang' | 'rusak'
export type KlaimStatus = 'pending' | 'disetujui' | 'ditolak' | 'selesai'

export interface Klaim {
  id: string
  nomor_klaim: string
  pengiriman_id: string | null
  pengiriman_nomor_resi?: string
  pengiriman_penerima_nama?: string
  tipe: KlaimTipe
  status: KlaimStatus
  nilai_klaim: number
  nilai_disetujui?: number
  kronologi?: string
  catatan_approval?: string
  foto_bukti?: string
  created_by?: string
  approved_by?: string
  approved_at?: string
  selesai_at?: string
  created_at: string
  updated_at: string
  creator?: { name: string }
  approver?: { name: string }
}

export interface CodSetoran {
  id: string
  sopir_id: string
  jumlah: number
  tanggal_setor: string
  catatan?: string
  foto_bukti?: string
  created_by?: string
  created_at: string
  sopir?: { name: string }
  creator?: { name: string }
}

export type ManifestBiayaKategori =
  | 'uang_jalan'
  | 'bbm'
  | 'tol'
  | 'kuli'
  | 'parkir'
  | 'lainnya'

export interface ManifestBiaya {
  id: string
  manifest_id: string
  kategori: ManifestBiayaKategori
  jumlah: number
  keterangan?: string
  foto_bukti?: string
  created_by?: string
  created_at: string
  creator?: { name: string }
}

export type PengeluaranKategori =
  | 'gaji'
  | 'sewa'
  | 'utilitas'
  | 'maintenance_armada'
  | 'pajak_armada'
  | 'perlengkapan'
  | 'pemasaran'
  | 'lainnya'

export interface Pengeluaran {
  id: string
  tanggal: string
  kategori: PengeluaranKategori
  keterangan: string
  jumlah: number
  armada_id?: string
  cabang_id?: string
  foto_bukti?: string
  created_by?: string
  created_at: string
  updated_at: string
  armada?: { plat_nomor: string }
  cabang?: { nama: string }
  creator?: { name: string }
}

// Booking mandiri customer (spec 10) — draft order, wajib dikonfirmasi
// staf sebelum jadi baris Pengiriman sungguhan (lihat pengiriman_id).
export type BookingStatus = 'pending' | 'dikonfirmasi' | 'ditolak'

export interface BookingRequest {
  id: string
  customer_id?: string
  jenis_layanan: JenisLayanan
  pengirim_nama: string
  pengirim_telepon?: string
  pengirim_alamat?: string
  pengirim_kota?: string
  penerima_nama: string
  penerima_telepon?: string
  penerima_alamat?: string
  penerima_kota?: string
  berat_kg: number
  panjang_cm?: number
  lebar_cm?: number
  tinggi_cm?: number
  isi_barang?: string
  nilai_barang?: number
  ongkir_estimasi?: number
  catatan?: string
  status: BookingStatus
  catatan_penolakan?: string
  pengiriman_id?: string
  processed_by?: string
  processed_at?: string
  created_at: string
  customer?: { nama: string; email?: string; telepon?: string }
}
