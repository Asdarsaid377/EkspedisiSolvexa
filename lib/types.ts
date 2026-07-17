export type Role = 'superadmin' | 'kasir' | 'keuangan' | 'cs' | 'gudang' | 'pengiriman' | 'produksi' | 'sopir'

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

export interface DashboardStats {
  total_penjualan: number
  total_laba: number
  total_bonus: number
  total_produk: number
  stok_menipis: number
  penjualan_hari_ini: number
}
