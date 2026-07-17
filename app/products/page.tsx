'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/lib/auth-context'
import { formatRupiah } from '@/lib/utils'
import { Plus, Pencil, TrendingUp, TrendingDown, Search, Package } from 'lucide-react'
import type { Product, StockMovement } from '@/types'

type ModalType = 'add' | 'edit' | 'stock-in' | 'stock-out' | null

export default function ProductsPage() {
  const { isSuperadmin, user } = useAuth()
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [modal, setModal] = useState<ModalType>(null)
  const [selected, setSelected] = useState<Product | null>(null)
  const [form, setForm] = useState({
    name: '', category: '', unit: 'pcs',
    harga_modal: '', harga_katalog: '', stock: '0', color: '', description: ''
  })
  const [stockQty, setStockQty] = useState('')
  const [stockNote, setStockNote] = useState('')
  const [saving, setSaving] = useState(false)
  const supabase = createClient()

  const fetchProducts = async () => {
    const { data } = await supabase
      .from('products')
      .select('*')
      .eq('is_active', true)
      .order('name')
    setProducts(data ?? [])
    setLoading(false)
  }

  useEffect(() => { fetchProducts() }, [])

  const filtered = products.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    (p.category ?? '').toLowerCase().includes(search.toLowerCase())
  )

  const openAdd = () => {
    setForm({ name: '', category: '', unit: 'pcs', harga_modal: '', harga_katalog: '', stock: '0', color: '', description: '' })
    setModal('add')
  }

  const openEdit = (p: Product) => {
    setSelected(p)
    setForm({
      name: p.name, category: p.category ?? '', unit: p.unit,
      harga_modal: p.harga_modal.toString(), harga_katalog: p.harga_katalog.toString(),
      stock: p.stock.toString(), color: p.color ?? '', description: p.description ?? ''
    })
    setModal('edit')
  }

  const openStock = (p: Product, type: 'stock-in' | 'stock-out') => {
    setSelected(p)
    setStockQty('')
    setStockNote('')
    setModal(type)
  }

  const handleSaveProduct = async () => {
    if (!form.name || !form.harga_katalog) return
    setSaving(true)

    const payload = {
      name: form.name,
      category: form.category || null,
      unit: form.unit,
      harga_modal: isSuperadmin ? Number(form.harga_modal) : (selected?.harga_modal ?? 0),
      harga_katalog: Number(form.harga_katalog),
      color: form.color || null,
      description: form.description || null,
    }

    if (modal === 'add') {
      const { data, error } = await supabase
        .from('products')
        .insert({ ...payload, stock: Number(form.stock) })
        .select()
        .single()

      // If initial stock > 0, record movement
      if (!error && data && Number(form.stock) > 0) {
        await supabase.from('stock_movements').insert({
          product_id: data.id,
          product_name: data.name,
          type: 'IN',
          quantity: Number(form.stock),
          notes: 'Stok awal',
          created_by: user?.id,
        })
      }
    } else {
      await supabase.from('products').update({ ...payload, updated_at: new Date().toISOString() })
        .eq('id', selected!.id)
    }

    setSaving(false)
    setModal(null)
    fetchProducts()
  }

  const handleStockMovement = async () => {
    if (!stockQty || !selected) return
    setSaving(true)
    const qty = Number(stockQty)

    await supabase.from('stock_movements').insert({
      product_id: selected.id,
      product_name: selected.name,
      type: modal === 'stock-in' ? 'IN' : 'OUT',
      quantity: qty,
      notes: stockNote || null,
      created_by: user?.id,
    })

    setSaving(false)
    setModal(null)
    fetchProducts()
  }

  const handleDeactivate = async (id: string) => {
    if (!confirm('Nonaktifkan produk ini?')) return
    await supabase.from('products').update({ is_active: false }).eq('id', id)
    fetchProducts()
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Produk & Stock</h1>
          <p className="text-gray-500 text-sm mt-0.5">{products.length} produk aktif</p>
        </div>
        <button onClick={openAdd} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> Tambah Produk
        </button>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          className="input pl-9"
          placeholder="Cari produk atau kategori..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Produk</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Kategori</th>
                  {isSuperadmin && <th className="text-right px-4 py-3 font-medium text-gray-600">Harga Modal</th>}
                  <th className="text-right px-4 py-3 font-medium text-gray-600">Harga Katalog</th>
                  {isSuperadmin && <th className="text-right px-4 py-3 font-medium text-gray-600">Laba</th>}
                  <th className="text-center px-4 py-3 font-medium text-gray-600">Stock</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-12 text-gray-400">
                      <Package className="w-8 h-8 mx-auto mb-2 opacity-40" />
                      Tidak ada produk
                    </td>
                  </tr>
                ) : (
                  filtered.map(p => {
                    const laba = p.harga_katalog - p.harga_modal
                    return (
                      <tr key={p.id} className="hover:bg-gray-50/50">
                        <td className="px-4 py-3">
                          <p className="font-medium text-gray-900">{p.name}</p>
                          {p.color && <p className="text-xs text-gray-400">{p.color}</p>}
                        </td>
                        <td className="px-4 py-3 text-gray-500">{p.category ?? '—'}</td>
                        {isSuperadmin && (
                          <td className="px-4 py-3 text-right font-mono text-gray-700">
                            {formatRupiah(p.harga_modal)}
                          </td>
                        )}
                        <td className="px-4 py-3 text-right font-mono font-medium text-gray-900">
                          {formatRupiah(p.harga_katalog)}
                        </td>
                        {isSuperadmin && (
                          <td className="px-4 py-3 text-right font-mono text-brand-700 font-medium">
                            {formatRupiah(laba)}
                          </td>
                        )}
                        <td className="px-4 py-3 text-center">
                          <span className={`font-mono font-semibold ${p.stock < 5 ? 'text-red-600' : 'text-gray-900'}`}>
                            {p.stock}
                          </span>
                          <span className="text-gray-400 text-xs ml-1">{p.unit}</span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => openStock(p, 'stock-in')}
                              className="p-1.5 text-brand-600 hover:bg-brand-50 rounded-lg"
                              title="Tambah stok"
                            >
                              <TrendingUp className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => openStock(p, 'stock-out')}
                              className="p-1.5 text-orange-600 hover:bg-orange-50 rounded-lg"
                              title="Kurangi stok"
                            >
                              <TrendingDown className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => openEdit(p)}
                              className="p-1.5 text-gray-500 hover:bg-gray-100 rounded-lg"
                              title="Edit produk"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            {isSuperadmin && (
                              <button
                                onClick={() => handleDeactivate(p.id)}
                                className="p-1.5 text-red-400 hover:bg-red-50 rounded-lg text-xs font-medium"
                                title="Nonaktifkan"
                              >
                                ✕
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Product Modal */}
      {(modal === 'add' || modal === 'edit') && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-100">
              <h2 className="font-semibold text-gray-900">
                {modal === 'add' ? 'Tambah Produk' : 'Edit Produk'}
              </h2>
            </div>
            <div className="px-6 py-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nama Produk *</label>
                <input className="input" value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Kategori</label>
                  <input className="input" value={form.category} onChange={e => setForm({...form, category: e.target.value})} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Satuan</label>
                  <input className="input" value={form.unit} onChange={e => setForm({...form, unit: e.target.value})} />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Warna</label>
                <input className="input" value={form.color} onChange={e => setForm({...form, color: e.target.value})} placeholder="Putih, Hitam, dll" />
              </div>
              {isSuperadmin && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Harga Modal (dari supplier)</label>
                  <input className="input font-mono" type="number" value={form.harga_modal}
                    onChange={e => setForm({...form, harga_modal: e.target.value})} />
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Harga Katalog (ke reseller) *</label>
                <input className="input font-mono" type="number" value={form.harga_katalog}
                  onChange={e => setForm({...form, harga_katalog: e.target.value})} />
              </div>
              {isSuperadmin && form.harga_modal && form.harga_katalog && (
                <div className="bg-brand-50 border border-brand-200 rounded-lg px-3 py-2 text-sm">
                  <span className="text-brand-700">Laba per unit: </span>
                  <span className="font-mono font-semibold text-brand-800">
                    {formatRupiah(Number(form.harga_katalog) - Number(form.harga_modal))}
                  </span>
                </div>
              )}
              {modal === 'add' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Stok Awal</label>
                  <input className="input font-mono" type="number" value={form.stock}
                    onChange={e => setForm({...form, stock: e.target.value})} />
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Keterangan</label>
                <textarea className="input resize-none" rows={2} value={form.description}
                  onChange={e => setForm({...form, description: e.target.value})} />
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-100 flex gap-3 justify-end">
              <button onClick={() => setModal(null)} className="btn-secondary">Batal</button>
              <button onClick={handleSaveProduct} disabled={saving} className="btn-primary">
                {saving ? 'Menyimpan...' : 'Simpan'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Stock Movement Modal */}
      {(modal === 'stock-in' || modal === 'stock-out') && selected && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm">
            <div className="px-6 py-4 border-b border-gray-100">
              <h2 className="font-semibold text-gray-900">
                {modal === 'stock-in' ? '📦 Tambah Stok' : '📤 Kurangi Stok'}
              </h2>
              <p className="text-sm text-gray-500 mt-0.5">{selected.name}</p>
            </div>
            <div className="px-6 py-4 space-y-4">
              <div className="bg-gray-50 rounded-lg px-4 py-3 text-sm">
                Stok saat ini: <span className="font-mono font-bold text-gray-900">{selected.stock} {selected.unit}</span>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Jumlah *</label>
                <input className="input font-mono text-lg" type="number" min="1" value={stockQty}
                  onChange={e => setStockQty(e.target.value)} autoFocus />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Keterangan</label>
                <input className="input" value={stockNote}
                  onChange={e => setStockNote(e.target.value)}
                  placeholder="Misal: Restock dari supplier" />
              </div>
              {stockQty && (
                <div className={`rounded-lg px-3 py-2 text-sm ${modal === 'stock-in' ? 'bg-brand-50 text-brand-700' : 'bg-orange-50 text-orange-700'}`}>
                  Stok setelah: <span className="font-mono font-bold">
                    {modal === 'stock-in'
                      ? selected.stock + Number(stockQty)
                      : selected.stock - Number(stockQty)
                    } {selected.unit}
                  </span>
                </div>
              )}
            </div>
            <div className="px-6 py-4 border-t border-gray-100 flex gap-3 justify-end">
              <button onClick={() => setModal(null)} className="btn-secondary">Batal</button>
              <button onClick={handleStockMovement} disabled={saving || !stockQty}
                className={modal === 'stock-in' ? 'btn-primary' : 'btn-danger'}>
                {saving ? 'Menyimpan...' : modal === 'stock-in' ? 'Tambah Stok' : 'Kurangi Stok'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
