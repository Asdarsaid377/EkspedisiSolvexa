'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { formatRupiah, formatDate } from '@/lib/utils'
import { Plus, Eye, ShoppingCart } from 'lucide-react'
import Link from 'next/link'
import type { Transaction } from '@/types'

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase
        .from('transactions')
        .select(`*, transaction_items(harga_katalog, quantity, bonus_reseller)`)
        .order('created_at', { ascending: false })
      setTransactions(data ?? [])
      setLoading(false)
    }
    fetch()
  }, [])

  const getTotal = (tx: any) => {
    return tx.transaction_items?.reduce((s: number, i: any) => s + i.harga_katalog * i.quantity, 0) ?? 0
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Transaksi</h1>
          <p className="text-gray-500 text-sm mt-0.5">{transactions.length} transaksi</p>
        </div>
        <Link href="/transactions/new" className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> Transaksi Baru
        </Link>
      </div>

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
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Tanggal</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Reseller</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Tujuan</th>
                  <th className="text-center px-4 py-3 font-medium text-gray-600">Status</th>
                  <th className="text-center px-4 py-3 font-medium text-gray-600">Bayar</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600">Total</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600">Ongkir</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {transactions.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-16 text-gray-400">
                      <ShoppingCart className="w-8 h-8 mx-auto mb-2 opacity-40" />
                      Belum ada transaksi
                    </td>
                  </tr>
                ) : (
                  transactions.map(tx => (
                    <tr key={tx.id} className="hover:bg-gray-50/50">
                      <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                        {formatDate(tx.created_at)}
                      </td>
                      <td className="px-4 py-3 font-medium text-gray-900">
                        {tx.reseller_name ?? '—'}
                      </td>
                      <td className="px-4 py-3 text-gray-500">{tx.destination ?? '—'}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={tx.status === 'TRANSFER' ? 'badge-blue' : 'badge-yellow'}>
                          {tx.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={tx.payment_status === 'LUNAS' ? 'badge-green' : 'badge-red'}>
                          {tx.payment_status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-medium text-gray-900">
                        {formatRupiah(getTotal(tx))}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-gray-500">
                        {tx.ongkir > 0 ? formatRupiah(tx.ongkir) : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <Link href={`/transactions/${tx.id}`}
                          className="p-1.5 text-gray-400 hover:text-brand-600 hover:bg-brand-50 rounded-lg inline-flex">
                          <Eye className="w-4 h-4" />
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
