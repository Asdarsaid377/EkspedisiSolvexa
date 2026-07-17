'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Plus, Pencil, Users, Phone, MapPin, Search } from 'lucide-react'
import type { Reseller } from '@/types'

export default function ResellersPage() {
  const [resellers, setResellers] = useState<Reseller[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [modal, setModal] = useState<'add' | 'edit' | null>(null)
  const [selected, setSelected] = useState<Reseller | null>(null)
  const [form, setForm] = useState({ name: '', phone: '', address: '', city: '', notes: '' })
  const [saving, setSaving] = useState(false)
  const supabase = createClient()

  const fetchResellers = async () => {
    const { data } = await supabase
      .from('resellers')
      .select('*')
      .eq('is_active', true)
      .order('name')
    setResellers(data ?? [])
    setLoading(false)
  }

  useEffect(() => { fetchResellers() }, [])

  const filtered = resellers.filter(r =>
    r.name.toLowerCase().includes(search.toLowerCase()) ||
    (r.city ?? '').toLowerCase().includes(search.toLowerCase())
  )

  const openAdd = () => {
    setForm({ name: '', phone: '', address: '', city: '', notes: '' })
    setModal('add')
  }

  const openEdit = (r: Reseller) => {
    setSelected(r)
    setForm({ name: r.name, phone: r.phone ?? '', address: r.address ?? '', city: r.city ?? '', notes: r.notes ?? '' })
    setModal('edit')
  }

  const handleSave = async () => {
    if (!form.name) return
    setSaving(true)
    const payload = {
      name: form.name,
      phone: form.phone || null,
      address: form.address || null,
      city: form.city || null,
      notes: form.notes || null,
    }

    if (modal === 'add') {
      await supabase.from('resellers').insert(payload)
    } else {
      await supabase.from('resellers').update({ ...payload, updated_at: new Date().toISOString() })
        .eq('id', selected!.id)
    }

    setSaving(false)
    setModal(null)
    fetchResellers()
  }

  const handleDeactivate = async (id: string) => {
    if (!confirm('Hapus reseller ini?')) return
    await supabase.from('resellers').update({ is_active: false }).eq('id', id)
    fetchResellers()
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reseller</h1>
          <p className="text-gray-500 text-sm mt-0.5">{resellers.length} reseller aktif</p>
        </div>
        <button onClick={openAdd} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> Tambah Reseller
        </button>
      </div>

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input className="input pl-9" placeholder="Cari nama atau kota..." value={search}
          onChange={e => setSearch(e.target.value)} />
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.length === 0 ? (
            <div className="col-span-3 card py-16 text-center text-gray-400">
              <Users className="w-8 h-8 mx-auto mb-2 opacity-40" />
              Tidak ada reseller
            </div>
          ) : (
            filtered.map(r => (
              <div key={r.id} className="card p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="w-10 h-10 bg-brand-100 rounded-full flex items-center justify-center">
                    <span className="text-brand-700 font-semibold text-sm">
                      {r.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => openEdit(r)}
                      className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg">
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleDeactivate(r.id)}
                      className="p-1.5 text-red-400 hover:bg-red-50 rounded-lg text-xs">
                      ✕
                    </button>
                  </div>
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">{r.name}</h3>
                {r.phone && (
                  <div className="flex items-center gap-1.5 text-sm text-gray-500 mb-1">
                    <Phone className="w-3.5 h-3.5" /> {r.phone}
                  </div>
                )}
                {r.city && (
                  <div className="flex items-center gap-1.5 text-sm text-gray-500">
                    <MapPin className="w-3.5 h-3.5" /> {r.city}
                  </div>
                )}
                {r.notes && (
                  <p className="text-xs text-gray-400 mt-2 border-t border-gray-100 pt-2">{r.notes}</p>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* Modal */}
      {modal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="px-6 py-4 border-b border-gray-100">
              <h2 className="font-semibold text-gray-900">
                {modal === 'add' ? 'Tambah Reseller' : 'Edit Reseller'}
              </h2>
            </div>
            <div className="px-6 py-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nama *</label>
                <input className="input" value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">No. HP</label>
                <input className="input" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})}
                  placeholder="08xx-xxxx-xxxx" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Kota</label>
                <input className="input" value={form.city} onChange={e => setForm({...form, city: e.target.value})} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Alamat</label>
                <textarea className="input resize-none" rows={2} value={form.address}
                  onChange={e => setForm({...form, address: e.target.value})} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Catatan</label>
                <input className="input" value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} />
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-100 flex gap-3 justify-end">
              <button onClick={() => setModal(null)} className="btn-secondary">Batal</button>
              <button onClick={handleSave} disabled={saving || !form.name} className="btn-primary">
                {saving ? 'Menyimpan...' : 'Simpan'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
