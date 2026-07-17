import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const TIPE_VALID = ['komplain', 'pujian', 'catatan']

export async function POST(req: NextRequest) {
  try {
    const { nomor_resi, tipe, isi } = await req.json()

    if (!nomor_resi || typeof nomor_resi !== 'string') {
      return NextResponse.json({ error: 'Nomor resi tidak valid.' }, { status: 400 })
    }
    if (!TIPE_VALID.includes(tipe)) {
      return NextResponse.json({ error: 'Tipe review tidak valid.' }, { status: 400 })
    }
    if (!isi || typeof isi !== 'string' || !isi.trim()) {
      return NextResponse.json({ error: 'Isi review tidak boleh kosong.' }, { status: 400 })
    }
    if (isi.trim().length > 1000) {
      return NextResponse.json({ error: 'Isi review terlalu panjang (maks 1000 karakter).' }, { status: 400 })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { data: penjualan } = await supabase
      .from('penjualan')
      .select('id, reseller_id, milestone')
      .eq('nomor_resi', nomor_resi.trim().toUpperCase())
      .single()

    if (!penjualan) {
      return NextResponse.json({ error: 'Pesanan tidak ditemukan.' }, { status: 404 })
    }
    if (penjualan.milestone !== 'selesai') {
      return NextResponse.json({ error: 'Review hanya bisa diisi setelah pesanan berstatus Selesai.' }, { status: 400 })
    }

    const { error: insertError } = await supabase.from('reseller_reviews').insert({
      penjualan_id: penjualan.id,
      reseller_id: penjualan.reseller_id || null,
      tipe,
      isi: isi.trim(),
      created_by: null,
    })

    if (insertError) {
      console.error('resi-review insert error:', insertError)
      return NextResponse.json({ error: 'Gagal menyimpan review.', detail: insertError.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('resi-review error:', err)
    return NextResponse.json({ error: 'Terjadi kesalahan.' }, { status: 500 })
  }
}
