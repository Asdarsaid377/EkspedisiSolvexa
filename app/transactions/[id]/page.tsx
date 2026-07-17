'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/lib/auth-context'
import { formatRupiah, formatDate } from '@/lib/utils'
import { ArrowLeft, Printer } from 'lucide-react'
import Link from 'next/link'
import type { Transaction, TransactionItem } from '@/types'

export default function TransactionDetailPage() {
  const { id } = useParams()
  const { isSuperadmin } = useAuth()
  const [tx, setTx] = useState<Transaction | null>(null)
  const [items, setItems] = useState<TransactionItem[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    const fetch = async () => {
      const { data: txData } = await supabase
        .from('transactions')
        .select('*')
        .eq('id', id)
        .single()

      const { data: itemsData } = await supabase
        .from('transaction_items')
        .select('*')
        .eq('transaction_id', id)

      setTx(txData)
      setItems(itemsData ?? [])
      setLoading(false)
    }
    fetch()
  }, [id])

  if (loading) return (
    <div className="flex justify-center py-20">
      <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  if (!tx) return (
    <div className="text-center py-20 text-gray-400">Transaksi tidak ditemukan</div>
  )

  const totalKatalog = items.reduce((s, i) => s + i.harga_katalog * i.quantity, 0)
  const totalBonus = items.reduce((s, i) => s + i.bonus_reseller * i.quantity, 0)
  const totalLaba = items.reduce((s, i) => s + i.laba_toko * i.quantity, 0)
  const grandTotal = totalKatalog + tx.ongkir

  return (
    <div>
      <div className="flex items-center gap-4 mb-6">
        <Link href="/transactions" className="p-2 hover:bg-gray-100 rounded-lg text-gray-500">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900">Detail Transaksi</h1>
          <p className="text-gray-500 text-sm mt-0.5">{formatDate(tx.created_at)}</p>
        </div>
        <button
          onClick={() => window.print()}
          className="btn-secondary flex items-center gap-2"
        >
          <Printer className="w-4 h-4" /> Print
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Items */}
        <div className="lg:col-span-2">
          <div className="card overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
              <h2 className="font-semibold text-gray-900 text-sm">Item Barang</h2>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left px-4 py-2.5 font-medium text-gray-500 text-xs">Produk</th>
                  <th className="text-center px-4 py-2.5 font-medium text-gray-500 text-xs">Qty</th>
                  <th className="text-right px-4 py-2.5 font-medium text-gray-500 text-xs">Harga Katalog</th>
                  <th className="text-right px-4 py-2.5 font-medium text-gray-500 text-xs">Harga Jual</th>
                  <th className="text-right px-4 py-2.5 font-medium text-gray-500 text-xs">Bonus</th>
                  {isSuperadmin && <th className="text-right px-4 py-2.5 font-medium text-gray-500 text-xs">Laba</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {items.map(item => (
                  <tr key={item.id}>
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900">{item.product_name}</p>
                      {item.product_color && <p className="text-xs text-gray-400">{item.product_color}</p>}
                    </td>
                    <td className="px-4 py-3 text-center font-mono">{item.quantity}</td>
                    <td className="px-4 py-3 text-right font-mono text-gray-700">
                      {formatRupiah(item.harga_katalog * item.quantity)}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-gray-900">
                      {formatRupiah(item.harga_jual_reseller * item.quantity)}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-orange-600">
                      {item.bonus_reseller > 0 ? formatRupiah(item.bonus_reseller * item.quantity) : '—'}
                      {item.bonus_override && <span className="text-xs text-gray-400 ml-1">(M)</span>}
                    </td>
                    {isSuperadmin && (
                      <td className="px-4 py-3 text-right font-mono text-brand-700 font-medium">
                        {formatRupiah(item.laba_toko * item.quantity)}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
              <tfoot className="border-t-2 border-gray-200">
                <tr>
                  <td colSpan={2} className="px-4 py-3 text-sm font-semibold text-gray-700">Total</td>
                  <td className="px-4 py-3 text-right font-mono font-semibold">{formatRupiah(totalKatalog)}</td>
                  <td className="px-4 py-3 text-right font-mono font-semibold">{formatRupiah(items.reduce((s,i) => s + i.harga_jual_reseller * i.quantity, 0))}</td>
                  <td className="px-4 py-3 text-right font-mono text-orange-600 font-semibold">{formatRupiah(totalBonus)}</td>
                  {isSuperadmin && <td className="px-4 py-3 text-right font-mono text-brand-700 font-semibold">{formatRupiah(totalLaba)}</td>}
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* Info sidebar */}
        <div className="space-y-4">
          <div className="card p-4 space-y-3">
            <h2 className="font-semibold text-gray-900 text-sm border-b border-gray-100 pb-2">Info Transaksi</h2>
            <InfoRow label="Reseller" value={tx.reseller_name ?? '—'} />
            <InfoRow label="Tujuan" value={tx.destination ?? '—'} />
            <InfoRow label="Sopir" value={tx.driver ?? '—'} />
            <InfoRow label="Metode" value={
              <span className={tx.status === 'TRANSFER' ? 'badge-blue' : 'badge-yellow'}>{tx.status}</span>
            } />
            <InfoRow label="Pembayaran" value={
              <span className={tx.payment_status === 'LUNAS' ? 'badge-green' : 'badge-red'}>{tx.payment_status}</span>
            } />
            {tx.uang_dp > 0 && <InfoRow label="DP" value={<span className="font-mono">{formatRupiah(tx.uang_dp)}</span>} />}
            {tx.notes && <InfoRow label="Catatan" value={tx.notes} />}
          </div>

          <div className="card p-4 space-y-2">
            <h2 className="font-semibold text-gray-900 text-sm border-b border-gray-100 pb-2">Ringkasan Keuangan</h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Total harga katalog</span>
                <span className="font-mono">{formatRupiah(totalKatalog)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Ongkir</span>
                <span className="font-mono">{formatRupiah(tx.ongkir)}</span>
              </div>
              <div className="flex justify-between font-semibold pt-1 border-t border-gray-100">
                <span>Total tagihan</span>
                <span className="font-mono text-brand-700">{formatRupiah(grandTotal)}</span>
              </div>
              {tx.uang_dp > 0 && (
                <div className="flex justify-between text-red-600">
                  <span>Sisa</span>
                  <span className="font-mono">{formatRupiah(grandTotal - tx.uang_dp)}</span>
                </div>
              )}
              <div className="flex justify-between pt-1 border-t border-gray-100 text-orange-600">
                <span>Total bonus reseller</span>
                <span className="font-mono">{formatRupiah(totalBonus)}</span>
              </div>
              {isSuperadmin && (
                <div className="flex justify-between font-semibold text-brand-700 pt-1 border-t border-gray-100">
                  <span>Total laba toko</span>
                  <span className="font-mono">{formatRupiah(totalLaba)}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between items-center text-sm">
      <span className="text-gray-500">{label}</span>
      <span className="font-medium text-gray-900 text-right">{value}</span>
    </div>
  )
}
