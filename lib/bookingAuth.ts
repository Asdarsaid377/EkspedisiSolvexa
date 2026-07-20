import { SignJWT, jwtVerify } from "jose";
import type { NextRequest } from "next/server";

// Auth customer booking mandiri (spec 10) — SENGAJA 100% terpisah dari
// Supabase Auth (auth.users). Lihat docs/spec/10-booking-mandiri.md §2
// untuk rasional lengkap: hampir semua RLS existing mengasumsikan "punya
// sesi Supabase Auth = staf terpercaya" (auth.uid() IS NOT NULL tanpa role
// gate di banyak tabel) — kalau customer login lewat Supabase Auth juga,
// mereka otomatis lolos semua policy longgar itu. Jangan "disederhanakan"
// jadi Supabase Auth apapun alasannya.

export const BOOKING_SESSION_COOKIE = "booking_session";
const SESSION_DURATION_SECONDS = 7 * 24 * 60 * 60; // 7 hari

function getSecretKey() {
	const secret = process.env.BOOKING_JWT_SECRET;
	if (!secret) {
		throw new Error(
			"BOOKING_JWT_SECRET belum dikonfigurasi di .env.local — lihat .env.example",
		);
	}
	return new TextEncoder().encode(secret);
}

// Payload JWT SENGAJA minimal (§4.1 poin 4) — cuma customer_id (sebagai
// `sub`) + `exp`, tidak ada nama/email/data lain di dalam token.
export async function signBookingSession(customerId: string): Promise<string> {
	return new SignJWT({})
		.setProtectedHeader({ alg: "HS256" })
		.setSubject(customerId)
		.setIssuedAt()
		.setExpirationTime(`${SESSION_DURATION_SECONDS}s`)
		.sign(getSecretKey());
}

// Satu-satunya jalur untuk mengubah token jadi customer_id. Kembalikan
// null untuk APAPUN yang tidak valid (expired, signature salah, payload
// aneh) — pemanggil selalu memperlakukan null sebagai "tidak login",
// tidak pernah melempar ke response.
export async function verifyBookingSession(
	token: string | undefined | null,
): Promise<string | null> {
	if (!token) return null;
	try {
		const { payload } = await jwtVerify(token, getSecretKey());
		return typeof payload.sub === "string" ? payload.sub : null;
	} catch {
		return null;
	}
}

// Helper dipakai di SEMUA endpoint booking customer (register/login di sini,
// submit/riwayat/profil di Step 4) — customer_id SELALU diturunkan dari
// cookie yang sudah diverifikasi, TIDAK PERNAH dari body/query request
// (§4.1 poin 1). Endpoint yang butuh identitas customer wajib manggil ini,
// bukan baca `req.json().customer_id` atau semacamnya.
export async function getBookingCustomerId(
	req: NextRequest,
): Promise<string | null> {
	const token = req.cookies.get(BOOKING_SESSION_COOKIE)?.value;
	return verifyBookingSession(token);
}

export function bookingSessionCookieOptions() {
	return {
		httpOnly: true,
		secure: process.env.NODE_ENV === "production",
		sameSite: "lax" as const,
		path: "/",
		maxAge: SESSION_DURATION_SECONDS,
	};
}

export function bookingSessionClearOptions() {
	return {
		httpOnly: true,
		secure: process.env.NODE_ENV === "production",
		sameSite: "lax" as const,
		path: "/",
		maxAge: 0,
	};
}
