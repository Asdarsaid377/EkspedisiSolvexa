export type { Role } from './roles'
import type { Role } from './roles'

export interface Profile {
  id: string
  name: string
  role: Role
  created_at: string
}

export interface Reseller {
  id: string
  nama: string
  telepon?: string
  alamat?: string
  kota?: string
  catatan?: string
  nama_bank?: string
  no_rekening?: string
  aktif: boolean
  created_at: string
  updated_at: string
  koreksi_admin?: number
  koreksi_asisten?: number
  sedekah_mimbar?: number
}

export interface Produk {
  id: string
  nama: string
  kategori?: string
  satuan: string
  harga_modal: number
  harga_katalog: number
  stok: number
  stok_minimum: number
  deskripsi?: string
  aktif: boolean
  created_at: string
  updated_at: string
}

export interface MutasiStok {
  id: string
  produk_id: string
  tipe: 'masuk' | 'keluar' | 'koreksi'
  jumlah: number
  stok_sebelum: number
  stok_sesudah: number
  keterangan?: string
  referensi_id?: string
  created_by?: string
  created_at: string
  produk?: Produk
  profile?: Profile
}

export interface PenjualanItem {
  id?: string
  penjualan_id?: string
  produk_id: string
  jumlah: number
  harga_modal: number
  harga_katalog: number
  harga_jual: number
  ongkir: number
  bonus: number
  laba?: number
  produk?: Produk
}

export interface Penjualan {
  id: string
  nomor_faktur: string
  reseller_id?: string
  tanggal: string
  total_harga_katalog: number
  total_harga_jual: number
  total_ongkir: number
  total_bonus: number
  total_laba: number
  uang_dp: number
  status_bayar: 'lunas' | 'dp' | 'belum_bayar'
  metode_bayar: 'transfer' | 'cod' | 'cash'
  tujuan?: string
  catatan?: string
  created_by?: string
  created_at: string
  updated_at: string
  reseller?: Reseller
  items?: PenjualanItem[]
  profile?: Profile
}

export type JenisLayanan = 'reguler' | 'express' | 'kargo'
export type MilestonePengiriman = 'diproses' | 'dijemput' | 'dikirim' | 'selesai'

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

  petugas_nama?: string
  petugas_telepon?: string

  catatan?: string
  catatan_internal?: string
  created_by?: string
  created_at: string
  updated_at: string

  pembayaran?: PengirimanPembayaran[]
  profile?: Profile
}

export interface PengirimanTracking {
  id: string
  pengiriman_id: string
  milestone: MilestonePengiriman
  catatan?: string
  foto_url?: string
  created_by?: string
  created_at: string
  creator?: { name: string }
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

export interface DashboardStats {
  total_penjualan: number
  total_laba: number
  total_bonus: number
  total_produk: number
  stok_menipis: number
  penjualan_hari_ini: number
}
