'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { User } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'
import { Profile } from '@/lib/types'

interface AuthContextType {
  user: User | null
  profile: Profile | null
  loading: boolean
  signOut: () => Promise<void>
  role: string | null
  isSuperAdmin: boolean
  isKeuangan: boolean
  isCS: boolean
  isGudang: boolean
  isKurir: boolean
  isSopir: boolean
  canAccessPenjualan: boolean
  canAccessPO: boolean
  canAccessStok: boolean
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  loading: true,
  signOut: async () => {},
  role: null,
  isSuperAdmin: false,
  isKeuangan: false,
  isCS: false,
  isGudang: false,
  isKurir: false,
  isSopir: false,
  canAccessPenjualan: false,
  canAccessPO: false,
  canAccessStok: false,
})

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    // Fallback jika INITIAL_SESSION tidak pernah fire (jaringan putus, dll)
    const timeout = setTimeout(() => setLoading(false), 2000)

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      // TOKEN_REFRESHED hanya refresh JWT di background — skip agar tidak trigger re-render sidebar
      if (event === 'TOKEN_REFRESHED') return

      // Stop fallback timeout karena auth sudah merespons
      clearTimeout(timeout)

      const currentUser = session?.user ?? null
      setUser(currentUser)

      if (currentUser) {
        const { data } = await supabase.from('profiles').select('*').eq('id', currentUser.id).single()
        setProfile(data)
      } else {
        setProfile(null)
      }

      // Set loading=false setelah profile tersedia — sidebar tidak flash kosong
      setLoading(false)
    })

    return () => {
      clearTimeout(timeout)
      subscription.unsubscribe()
    }
  }, [])

  const signOut = async () => {
    await supabase.auth.signOut()
  }

  const r = profile?.role ?? null

  return (
    <AuthContext.Provider value={{
      user, profile, loading, signOut,
      role: r,
      isSuperAdmin:      r === 'superadmin',
      isKeuangan:        r === 'keuangan',
      isCS:              r === 'cs',
      isGudang:          r === 'gudang',
      isKurir:           r === 'kurir',
      isSopir:           r === 'sopir',
      canAccessPenjualan: ['superadmin','keuangan','kurir','sopir','kasir','gudang'].includes(r ?? ''),
      canAccessPO:        ['superadmin','cs','gudang','kurir'].includes(r ?? ''),
      canAccessStok:      ['superadmin','gudang','kasir'].includes(r ?? ''),
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
