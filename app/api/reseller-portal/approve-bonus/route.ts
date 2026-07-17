import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const { token, penjualan_id, approved } = await req.json()
    if (!token || typeof token !== 'string' || !penjualan_id || typeof approved !== 'boolean') {
      return NextResponse.json({ error: 'Data tidak valid.' }, { status: 400 })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { data: reseller } = await supabase
      .from('resellers')
      .select('id')
      .eq('token', token.trim().toUpperCase())
      .eq('aktif', true)
      .single()

    if (!reseller) {
      return NextResponse.json({ error: 'Link tidak ditemukan atau sudah tidak aktif.' }, { status: 404 })
    }

    // Pastikan transaksi ini benar-benar milik reseller pemegang token — cegah reseller lain approve invoice orang lain
    const { data: penjualan } = await supabase
      .from('penjualan')
      .select('id, reseller_id')
      .eq('id', penjualan_id)
      .single()

    if (!penjualan || penjualan.reseller_id !== reseller.id) {
      return NextResponse.json({ error: 'Transaksi tidak ditemukan.' }, { status: 404 })
    }

    const bonus_disetujui_at = approved ? new Date().toISOString() : null
    const { error } = await supabase
      .from('penjualan')
      .update({ bonus_disetujui_reseller: approved, bonus_disetujui_at })
      .eq('id', penjualan_id)

    if (error) {
      return NextResponse.json({ error: 'Gagal menyimpan persetujuan.' }, { status: 500 })
    }

    return NextResponse.json({ bonus_disetujui_reseller: approved, bonus_disetujui_at })
  } catch {
    return NextResponse.json({ error: 'Terjadi kesalahan.' }, { status: 500 })
  }
}
