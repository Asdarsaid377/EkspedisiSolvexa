'use client'

import { useAuth } from '@/contexts/AuthContext'
import { useRouter, usePathname } from 'next/navigation'
import { useEffect } from 'react'
import Sidebar from '@/components/Sidebar'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const isPOS = pathname?.startsWith('/dashboard/pos')

  useEffect(() => {
    if (!loading && !user) router.push('/login')
  }, [user, loading])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-gray-500 text-sm">Memuat...</p>
        </div>
      </div>
    )
  }

  if (!user) return null

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar overlayMode={isPOS} />
      <main className={isPOS ? 'min-h-screen' : 'lg:ml-64 min-h-screen'}>
        <div className={isPOS ? 'p-4 lg:p-8 pt-16' : 'p-4 lg:p-8 pt-16 lg:pt-8'}>
          {children}
        </div>
      </main>
    </div>
  )
}
