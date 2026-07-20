import { NextResponse } from "next/server";
import { BOOKING_SESSION_COOKIE, bookingSessionClearOptions } from "@/lib/bookingAuth";

// Tidak perlu verifikasi sesi dulu — clear cookie aman & idempoten dipanggil
// baik sedang login maupun tidak.
export async function POST() {
	const res = NextResponse.json({ success: true });
	res.cookies.set(BOOKING_SESSION_COOKIE, "", bookingSessionClearOptions());
	return res;
}
