import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const { token } = await req.json()
    if (!token || typeof token !== 'string') {
      return NextResponse.json({ error: 'Token tidak valid.' }, { status: 400 })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Cari reseller berdasarkan token
    const { data: reseller } = await supabase
      .from('resellers')
      .select('id, nama, kota, telepon, alamat, catatan')
      .eq('token', token.trim().toUpperCase())
      .eq('aktif', true)
      .single()

    if (!reseller) {
      return NextResponse.json({ error: 'Link tidak ditemukan atau sudah tidak aktif.' }, { status: 404 })
    }

    // Omset + penjualan — tidak sertakan harga_modal, total_laba, catatan_internal
    const { data: penjualan } = await supabase
      .from('penjualan')
      .select(`
        id, nomor_faktur, tanggal,
        total_harga_jual, total_bonus, bonus_owner, bonus_terbayar,
        status_bayar, milestone, tujuan, nama_customer, sopir,
        bonus_disetujui_reseller, bonus_disetujui_at,
        penjualan_item(jumlah, harga_katalog, harga_jual, ongkir, bonus, produk(nama))
      `)
      .eq('reseller_id', reseller.id)
      .order('tanggal', { ascending: false })
      .limit(120)

    // Tier history
    const { data: tierHistory } = await supabase
      .from('reseller_tier_history')
      .select('periode, tier, omset')
      .eq('reseller_id', reseller.id)
      .order('periode', { ascending: false })
      .limit(12)

    // Threshold tier dari owner_settings
    const { data: settings } = await supabase
      .from('owner_settings')
      .select('key, value')
      .in('key', ['tier_silver_min', 'tier_gold_min', 'tier_platinum_min'])

    const thresholds = { silver: 5_000_000, gold: 15_000_000, platinum: 30_000_000 }
    for (const s of (settings || [])) {
      if (s.key === 'tier_silver_min')   thresholds.silver   = Number(s.value)
      if (s.key === 'tier_gold_min')     thresholds.gold     = Number(s.value)
      if (s.key === 'tier_platinum_min') thresholds.platinum = Number(s.value)
    }

    // Papan peringkat reseller bulan ini — hanya omset/unit, TIDAK sertakan bonus reseller lain
    const now = new Date()
    const awalBulan = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
    const { data: penjualanBulanIni } = await supabase
      .from('penjualan')
      .select('reseller_id, reseller:resellers(nama), total_harga_katalog, items:penjualan_item(jumlah)')
      .gte('tanggal', awalBulan)
      .not('reseller_id', 'is', null)

    const lbMap: Record<string, { id: string; nama: string; jumlah_transaksi: number; total_omset: number; total_unit: number }> = {}
    for (const p of penjualanBulanIni || []) {
      const id = p.reseller_id as string
      const nama = (p.reseller as any)?.nama || 'Unknown'
      if (!lbMap[id]) lbMap[id] = { id, nama, jumlah_transaksi: 0, total_omset: 0, total_unit: 0 }
      lbMap[id].jumlah_transaksi += 1
      lbMap[id].total_omset += p.total_harga_katalog || 0
      lbMap[id].total_unit += (p.items || []).reduce((s: number, i: any) => s + i.jumlah, 0)
    }
    const leaderboard = Object.values(lbMap)

    // Pengumuman aktif untuk semua reseller
    const { data: pengumuman } = await supabase
      .from('pengumuman')
      .select('id, judul, isi, created_at')
      .eq('aktif', true)
      .order('created_at', { ascending: false })

    return NextResponse.json({ reseller, penjualan: penjualan || [], tierHistory: tierHistory || [], thresholds, leaderboard, pengumuman: pengumuman || [] })
  } catch {
    return NextResponse.json({ error: 'Terjadi kesalahan.' }, { status: 500 })
  }
}
