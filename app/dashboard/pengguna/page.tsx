'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/contexts/AuthContext'
import { Profile } from '@/lib/types'
import { Plus, Shield, User, X, Eye, EyeOff, Wallet, MessageCircle, Package, Truck, Factory, Car } from 'lucide-react'
import { useRouter } from 'next/navigation'

const ROLES: { value: string; label: string; color: string; Icon: any }[] = [
  { value: 'superadmin', label: 'Superadmin',  color: 'bg-purple-100 text-purple-700', Icon: Shield },
  { value: 'kasir',      label: 'Kasir',        color: 'bg-blue-100 text-blue-700',    Icon: User },
  { value: 'keuangan',   label: 'Keuangan',     color: 'bg-emerald-100 text-emerald-700', Icon: Wallet },
  { value: 'cs',         label: 'CS',           color: 'bg-pink-100 text-pink-700',    Icon: MessageCircle },
  { value: 'gudang',     label: 'Gudang',       color: 'bg-amber-100 text-amber-700',  Icon: Package },
  { value: 'pengiriman', label: 'Pengiriman',   color: 'bg-cyan-100 text-cyan-700',    Icon: Truck },
  { value: 'produksi',   label: 'Produksi',     color: 'bg-orange-100 text-orange-700',Icon: Factory },
  { value: 'sopir',      label: 'Sopir',        color: 'bg-gray-100 text-gray-700',    Icon: Car },
]

function RoleBadge({ role }: { role: string }) {
  const cfg = ROLES.find(r => r.value === role) ?? ROLES[1]
  const { label, color, Icon } = cfg
  return (
    <span className={`flex items-center gap-1.5 w-fit px-3 py-1 rounded-full text-xs font-medium ${color}`}>
      <Icon size={11} /> {label}
    </span>
  )
}

export default function PenggunaPage() {
  const { isSuperAdmin, loading: authLoading } = useAuth()
  const router = useRouter()
  const supabase = createClient()
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState({ nama: '', email: '', password: '', role: 'kasir' })
  const [showPass, setShowPass] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (authLoading) return
    if (!isSuperAdmin) { router.replace('/dashboard'); return }
    loadUsers()
  }, [isSuperAdmin, authLoading])

  if (authLoading || !isSuperAdmin) return null

  const loadUsers = async () => {
    const { data } = await supabase.from('profiles').select('*').order('created_at')
    setProfiles(data || [])
    setLoading(false)
  }

  const save = async () => {
    setSaving(true)
    setError('')
    // Note: user creation via auth requires service role key in production
    // For demo: use Supabase Dashboard or invite flow
    // Here we show the UI; actual signup requires backend API route
    const res = await fetch('/api/create-user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form)
    })
    const json = await res.json()
    if (!res.ok) {
      setError(json.error || 'Gagal membuat pengguna')
    } else {
      setModal(false)
      loadUsers()
    }
    setSaving(false)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Pengguna</h1>
          <p className="text-gray-500 mt-1">Kelola akun dan role pengguna</p>
        </div>
        <button onClick={() => { setForm({ nama: '', email: '', password: '', role: 'kasir' }); setError(''); setModal(true) }}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition">
          <Plus size={16} /> Tambah Pengguna
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Nama</th>
              <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Role</th>
              <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Bergabung</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {loading ? (
              <tr><td colSpan={3} className="text-center py-12 text-gray-400">Memuat...</td></tr>
            ) : profiles.map(p => (
              <tr key={p.id} className="hover:bg-gray-50">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center text-xs font-bold text-indigo-600">
                      {p.name?.charAt(0).toUpperCase()}
                    </div>
                    <span className="font-medium text-gray-900">{p.name}</span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <RoleBadge role={p.role} />
                </td>
                <td className="px-6 py-4 text-gray-500 text-sm">{new Date(p.created_at).toLocaleDateString('id-ID')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h2 className="text-lg font-semibold">Tambah Pengguna</h2>
              <button onClick={() => setModal(false)} className="p-2 hover:bg-gray-100 rounded-lg"><X size={18} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nama</label>
                <input value={form.nama} onChange={e => setForm({ ...form, nama: e.target.value })}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                <div className="relative">
                  <input type={showPass ? 'text' : 'password'} value={form.password} onChange={e => setForm({ ...form, password: e.target.value })}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 pr-10" />
                  <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                    {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                <select value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                  {ROLES.map(r => (
                    <option key={r.value} value={r.value}>{r.label}</option>
                  ))}
                </select>
              </div>
              {error && <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl text-sm">{error}</div>}
            </div>
            <div className="flex gap-3 p-6 pt-0">
              <button onClick={() => setModal(false)} className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium hover:bg-gray-50">Batal</button>
              <button onClick={save} disabled={saving || !form.nama || !form.email || !form.password}
                className="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white px-4 py-2.5 rounded-xl text-sm font-medium">
                {saving ? 'Menyimpan...' : 'Buat Akun'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
