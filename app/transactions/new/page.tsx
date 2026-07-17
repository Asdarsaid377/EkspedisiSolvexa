'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/lib/auth-context'
import { formatRupiah } from '@/lib/utils'
import { Plus, Trash2, Search, ChevronDown } from 'lucide-react'
import type { Product, Reseller, CartItem } from '@/types'

export default function NewTransactionPage() {
  const router = useRouter()
  const { user } = useAuth()
  const [products, setProducts] = useState<Product[]>([])
  const [resellers, setResellers] = useState<Reseller[]>([])
  const [cart, setCart] = useState<CartItem[]>([])
  const [saving, setSaving] = useState(false)
  const [productSearch, setProductSearch] = useState('')
  const [showProductSearch, setShowProductSearch] = useState(false)

  // Transaction header
  const [resellerId, setResellerId] = useState('')
  const [resellerName, setResellerName] = useState('')
  const [status, setStatus] = useState<'TRANSFER' | 'COD'>('TRANSFER')
  const [paymentStatus, setPaymentStatus] = useState<'LUNAS' | 'DP' | 'BELUM LUNAS'>('LUNAS')
  const [uangDp, setUangDp] = useState('')
  const [ongkir, setOngkir] = useState('')
  const [destination, setDestination] = useState('')
  const [driver, setDriver] = useState('')
  const [notes, setNotes] = useState('')

  const supabase = createClient()

  useEffect(() => {
    const fetchData = async () => {
      const [{ data: p }, { data: r }] = await Promise.all([
        supabase.from('products').select('*').eq('is_active', true).gt('stock', 0).order('name'),
        supabase.from('resellers').select('*').eq('is_active', true).order('name'),
      ])
      setProducts(p ?? [])
      setResellers(r ?? [])
    }
    fetchData()
  }, [])

  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(productSearch.toLowerCase())
  )

  const addToCart = (product: Product) => {
    const existing = cart.find(c => c.product.id === product.id)
    if (existing) {
      setCart(cart.map(c => c.product.id === product.id
        ? { ...c, quantity: c.quantity + 1 }
        : c
      ))
    } else {
      const hargaJual = product.harga_katalog
      const bonusReseller = 0 // default 0, user can set
      setCart([...cart, {
        product,
        quantity: 1,
        harga_jual_reseller: hargaJual,
        bonus_reseller: bonusReseller,
        bonus_override: false,
      }])
    }
    setShowProductSearch(false)
    setProductSearch('')
  }

  const updateCartItem = (idx: number, field: string, value: string | number) => {
    setCart(cart.map((c, i) => {
      if (i !== idx) return c
      const updated = { ...c, [field]: value }
      // Auto-calculate bonus if not overridden
      if (field === 'harga_jual_reseller' && !c.bonus_override) {
        updated.bonus_reseller = Math.max(0, Number(value) - c.product.harga_katalog)
      }
      if (field === 'bonus_reseller') {
        updated.bonus_override = true
      }
      return updated
    }))
  }

  const removeFromCart = (idx: number) => {
    setCart(cart.filter((_, i) => i !== idx))
  }

  const totalKatalog = cart.reduce((s, c) => s + c.product.harga_katalog * c.quantity, 0)
  const totalJualReseller = cart.reduce((s, c) => s + c.harga_jual_reseller * c.quantity, 0)
  const totalBonus = cart.reduce((s, c) => s + c.bonus_reseller * c.quantity, 0)
  const totalTagihan = totalKatalog + Number(ongkir || 0)

  const handleSubmit = async () => {
    if (cart.length === 0) return alert('Keranjang kosong')
    setSaving(true)

    // Get reseller name
    const selectedReseller = resellers.find(r => r.id === resellerId)
    const rName = selectedReseller?.name ?? resellerName ?? null

    // Insert transaction
    const { data: tx, error } = await supabase
      .from('transactions')
      .insert({
        reseller_id: resellerId || null,
        reseller_name: rName,
        status,
        payment_status: paymentStatus,
        uang_dp: paymentStatus === 'DP' ? Number(uangDp) : 0,
        ongkir: Number(ongkir || 0),
        destination: destination || null,
        driver: driver || null,
        notes: notes || null,
        created_by: user?.id,
      })
      .select()
      .single()

    if (error || !tx) {
      alert('Gagal menyimpan transaksi')
      setSaving(false)
      return
    }

    // Insert items
    const items = cart.map(c => ({
      transaction_id: tx.id,
      product_id: c.product.id,
      product_name: c.product.name,
      product_color: c.product.color,
      quantity: c.quantity,
      harga_modal: c.product.harga_modal,
      harga_katalog: c.product.harga_katalog,
      harga_jual_reseller: c.harga_jual_reseller,
      bonus_reseller: c.bonus_reseller,
      bonus_override: c.bonus_override,
    }))

    await supabase.from('transaction_items').insert(items)

    // Reduce stock for each item
    const movements = cart.map(c => ({
      product_id: c.product.id,
      product_name: c.product.name,
      type: 'OUT' as const,
      quantity: c.quantity,
      reference_id: tx.id,
      notes: `Terjual ke ${rName}`,
      created_by: user?.id,
    }))

    await supabase.from('stock_movements').insert(movements)

    setSaving(false)
    router.push(`/transactions/${tx.id}`)
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Transaksi Baru</h1>
        <p className="text-gray-500 text-sm mt-0.5">Buat penjualan ke reseller</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* LEFT: Items */}
        <div className="lg:col-span-2 space-y-4">

          {/* Product search */}
          <div className="card p-4">
            <h2 className="font-semibold text-gray-900 mb-3">Pilih Produk</h2>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                className="input pl-9"
                placeholder="Cari dan tambah produk..."
                value={productSearch}
                onChange={e => { setProductSearch(e.target.value); setShowProductSearch(true) }}
                onFocus={() => setShowProductSearch(true)}
              />
              {showProductSearch && productSearch && (
                <div className="absolute top-full left-0 right-0 bg-white border border-gray-200 rounded-lg shadow-lg z-10 max-h-48 overflow-y-auto mt-1">
                  {filteredProducts.length === 0 ? (
                    <p className="px-4 py-3 text-sm text-gray-400">Produk tidak ditemukan</p>
                  ) : (
                    filteredProducts.map(p => (
                      <button
                        key={p.id}
                        onClick={() => addToCart(p)}
                        className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-gray-50 text-sm text-left"
                      >
                        <div>
                          <span className="font-medium text-gray-900">{p.name}</span>
                          {p.color && <span className="text-gray-400 ml-2">({p.color})</span>}
                        </div>
                        <div className="text-right">
                          <p className="font-mono text-gray-700">{formatRupiah(p.harga_katalog)}</p>
                          <p className="text-xs text-gray-400">stok: {p.stock}</p>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Cart items */}
          {cart.length > 0 && (
            <div className="card overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
                <div className="grid grid-cols-12 gap-2 text-xs font-medium text-gray-500 uppercase tracking-wide">
                  <div className="col-span-3">Produk</div>
                  <div className="col-span-1 text-center">Qty</div>
                  <div className="col-span-3 text-right">Harga Katalog</div>
                  <div className="col-span-3 text-right">Harga Jual Reseller</div>
                  <div className="col-span-2 text-right">Bonus</div>
                </div>
              </div>
              <div className="divide-y divide-gray-50">
                {cart.map((item, idx) => (
                  <div key={idx} className="px-4 py-3">
                    <div className="grid grid-cols-12 gap-2 items-center">
                      <div className="col-span-3">
                        <p className="text-sm font-medium text-gray-900 leading-tight">{item.product.name}</p>
                        {item.product.color && <p className="text-xs text-gray-400">{item.product.color}</p>}
                      </div>
                      <div className="col-span-1">
                        <input
                          type="number"
                          min="1"
                          max={item.product.stock}
                          value={item.quantity}
                          onChange={e => updateCartItem(idx, 'quantity', Number(e.target.value))}
                          className="input text-center px-2 py-1.5 text-sm font-mono"
                        />
                      </div>
                      <div className="col-span-3 text-right">
                        <p className="font-mono text-sm text-gray-700">{formatRupiah(item.product.harga_katalog)}</p>
                        <p className="text-xs text-gray-400">per unit</p>
                      </div>
                      <div className="col-span-3">
                        <input
                          type="number"
                          value={item.harga_jual_reseller}
                          onChange={e => updateCartItem(idx, 'harga_jual_reseller', Number(e.target.value))}
                          className="input text-right px-2 py-1.5 text-sm font-mono"
                        />
                        {item.harga_jual_reseller < item.product.harga_katalog && (
                          <p className="text-xs text-red-500 mt-0.5">Di bawah harga katalog</p>
                        )}
                      </div>
                      <div className="col-span-2 flex items-center gap-1">
                        <input
                          type="number"
                          value={item.bonus_reseller}
                          onChange={e => updateCartItem(idx, 'bonus_reseller', Number(e.target.value))}
                          className="input text-right px-2 py-1.5 text-sm font-mono flex-1"
                        />
                        <button onClick={() => removeFromCart(idx)}
                          className="p-1.5 text-red-400 hover:bg-red-50 rounded flex-shrink-0">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                    {item.bonus_override && (
                      <p className="text-xs text-orange-500 mt-1">⚡ Bonus diinput manual</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* RIGHT: Transaction details */}
        <div className="space-y-4">
          <div className="card p-4 space-y-4">
            <h2 className="font-semibold text-gray-900">Detail Transaksi</h2>

            {/* Reseller */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Reseller</label>
              <select
                className="input"
                value={resellerId}
                onChange={e => {
                  setResellerId(e.target.value)
                  const r = resellers.find(r => r.id === e.target.value)
                  setResellerName(r?.name ?? '')
                  if (r?.city) setDestination(r.city)
                }}
              >
                <option value="">-- Pilih Reseller --</option>
                {resellers.map(r => (
                  <option key={r.id} value={r.id}>{r.name}</option>
                ))}
              </select>
              {!resellerId && (
                <input className="input mt-2" placeholder="Atau ketik nama reseller..."
                  value={resellerName}
                  onChange={e => setResellerName(e.target.value)} />
              )}
            </div>

            {/* Status */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Metode</label>
                <select className="input" value={status} onChange={e => setStatus(e.target.value as any)}>
                  <option value="TRANSFER">Transfer</option>
                  <option value="COD">COD</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Pembayaran</label>
                <select className="input" value={paymentStatus} onChange={e => setPaymentStatus(e.target.value as any)}>
                  <option value="LUNAS">Lunas</option>
                  <option value="DP">DP</option>
                  <option value="BELUM LUNAS">Belum Lunas</option>
                </select>
              </div>
            </div>

            {paymentStatus === 'DP' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Uang DP</label>
                <input className="input font-mono" type="number" value={uangDp}
                  onChange={e => setUangDp(e.target.value)} placeholder="0" />
              </div>
            )}

            {/* Ongkir */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Ongkir</label>
              <input className="input font-mono" type="number" value={ongkir}
                onChange={e => setOngkir(e.target.value)} placeholder="0" />
            </div>

            {/* Tujuan & Sopir */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tujuan</label>
              <input className="input" value={destination} onChange={e => setDestination(e.target.value)}
                placeholder="Kota tujuan" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Sopir / Ekspedisi</label>
              <input className="input" value={driver} onChange={e => setDriver(e.target.value)}
                placeholder="Nama sopir atau ekspedisi" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Catatan</label>
              <textarea className="input resize-none" rows={2} value={notes}
                onChange={e => setNotes(e.target.value)} />
            </div>
          </div>

          {/* Summary */}
          {cart.length > 0 && (
            <div className="card p-4 space-y-2">
              <h2 className="font-semibold text-gray-900 mb-3">Ringkasan</h2>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Total harga katalog</span>
                <span className="font-mono">{formatRupiah(totalKatalog)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Total jual reseller</span>
                <span className="font-mono text-gray-700">{formatRupiah(totalJualReseller)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Total bonus reseller</span>
                <span className="font-mono text-orange-600">{formatRupiah(totalBonus)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Ongkir</span>
                <span className="font-mono">{formatRupiah(Number(ongkir || 0))}</span>
              </div>
              <div className="flex justify-between text-sm font-semibold pt-2 border-t border-gray-100">
                <span>Total tagihan</span>
                <span className="font-mono text-brand-700">{formatRupiah(totalTagihan)}</span>
              </div>
              {paymentStatus === 'DP' && uangDp && (
                <div className="flex justify-between text-sm text-red-600">
                  <span>Sisa</span>
                  <span className="font-mono">{formatRupiah(totalTagihan - Number(uangDp))}</span>
                </div>
              )}
            </div>
          )}

          <button
            onClick={handleSubmit}
            disabled={saving || cart.length === 0}
            className="btn-primary w-full py-3 text-base disabled:opacity-60"
          >
            {saving ? 'Menyimpan...' : 'Simpan Transaksi'}
          </button>
        </div>
      </div>

      {/* Close dropdown on outside click */}
      {showProductSearch && (
        <div className="fixed inset-0 z-0" onClick={() => setShowProductSearch(false)} />
      )}
    </div>
  )
}
