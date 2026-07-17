export type Role = 'superadmin' | 'kasir'

export interface Profile {
  id: string
  name: string
  role: Role
  created_at: string
}

export interface Product {
  id: string
  name: string
  category: string | null
  unit: string
  harga_modal: number       // only visible to superadmin
  harga_katalog: number
  stock: number
  color: string | null
  description: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Reseller {
  id: string
  name: string
  phone: string | null
  address: string | null
  city: string | null
  notes: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface TransactionItem {
  id: string
  transaction_id: string
  product_id: string
  product_name: string
  product_color: string | null
  quantity: number
  harga_modal: number
  harga_katalog: number
  harga_jual_reseller: number
  bonus_reseller: number
  bonus_override: boolean
  laba_toko: number
  created_at: string
}

export interface Transaction {
  id: string
  reseller_id: string | null
  reseller_name: string | null
  status: 'TRANSFER' | 'COD'
  payment_status: 'LUNAS' | 'DP' | 'BELUM LUNAS'
  uang_dp: number
  ongkir: number
  destination: string | null
  driver: string | null
  notes: string | null
  created_by: string
  created_at: string
  updated_at: string
  transaction_items?: TransactionItem[]
}

export interface StockMovement {
  id: string
  product_id: string
  product_name: string
  type: 'IN' | 'OUT' | 'ADJUSTMENT'
  quantity: number
  reference_id: string | null
  notes: string | null
  created_by: string
  created_at: string
}

// Cart item for new transaction form
export interface CartItem {
  product: Product
  quantity: number
  harga_jual_reseller: number
  bonus_reseller: number
  bonus_override: boolean
}

export interface DashboardStats {
  total_penjualan: number
  total_laba: number
  total_transaksi: number
  total_produk: number
  stok_menipis: number
}
