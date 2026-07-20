import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { getBookingCustomerId } from "@/lib/bookingAuth";

// Dipakai app/booking/layout.tsx (Step 5) untuk cek status login di
// client-side sebelum render halaman customer. Selalu 200 (bukan 401
// untuk kasus "tidak login") — ini endpoint cek status, bukan endpoint
// yang butuh proteksi.
export async function GET(req: NextRequest) {
	// customer_id HANYA dari cookie terverifikasi (§4.1 poin 1).
	const customerId = await getBookingCustomerId(req);
	if (!customerId) {
		return NextResponse.json({ authenticated: false });
	}

	const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
	if (!serviceKey) {
		return NextResponse.json({ authenticated: false });
	}
	const adminClient = createClient(
		process.env.NEXT_PUBLIC_SUPABASE_URL!,
		serviceKey,
	);

	// Column allowlist eksplisit (§4.1 poin 2) — password_hash TIDAK PERNAH
	// keluar dari server sama sekali, tidak cuma "tidak dikirim ke client".
	const { data: customer } = await adminClient
		.from("customer")
		.select("id, nama, email, telepon, alamat, kota")
		.eq("id", customerId)
		.maybeSingle();

	if (!customer) {
		// Token valid tapi baris customer sudah tidak ada (kasus langka,
		// mis. dihapus manual lewat SQL) — perlakukan sebagai tidak login.
		return NextResponse.json({ authenticated: false });
	}

	return NextResponse.json({ authenticated: true, customer });
}
