import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const { kode } = await req.json()
    if (!kode || typeof kode !== 'string') {
      return NextResponse.json({ ok: false })
    }

    // Gunakan service role agar bisa baca owner_settings tanpa auth
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { data } = await supabase
      .from('owner_settings')
      .select('value')
      .eq('key', 'kode_internal_produk')
      .single()

    if (!data) {
      return NextResponse.json({ ok: false, message: 'Kode belum dikonfigurasi.' }, { status: 404 })
    }

    if (data.value === kode.trim()) {
      return NextResponse.json({ ok: true })
    }

    return NextResponse.json({ ok: false }, { status: 401 })
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 })
  }
}
