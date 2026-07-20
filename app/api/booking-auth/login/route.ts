import { createClient } from "@supabase/supabase-js";
import bcrypt from "bcryptjs";
import { NextRequest, NextResponse } from "next/server";
import {
	BOOKING_SESSION_COOKIE,
	bookingSessionCookieOptions,
	signBookingSession,
} from "@/lib/bookingAuth";
import { isRateLimited, recordAttempt, resetAttempts } from "@/lib/bookingRateLimit";

const LOGIN_LIMIT = 5;
const LOGIN_WINDOW_MS = 15 * 60 * 1000; // 15 menit, per email

// Backstop topology-independent, pola sama dengan register (lihat komentar
// di app/api/booking-auth/register/route.ts) — TAMBAHAN di luar §4.1 poin 3
// literal (yang cuma menyebut limit per-email), ditambahkan proaktif karena
// gap yang sama kelasnya: limit per-email tidak menahan penyerang yang
// mencoba banyak email BERBEDA sekali per akun (credential stuffing) —
// tiap percobaan tetap memaksa satu bcrypt.compare penuh (~300ms CPU),
// jadi tanpa backstop ini endpoint bisa dibanjiri untuk menghabiskan CPU
// server walau tidak melanggar limit per-email manapun. Hitung SEMUA
// percobaan (bukan cuma yang gagal) karena tujuannya membatasi total kerja
// bcrypt, bukan cuma brute-force satu akun.
const LOGIN_GLOBAL_LIMIT = 60;
const LOGIN_GLOBAL_WINDOW_MS = 5 * 60 * 1000; // 5 menit
const LOGIN_GLOBAL_KEY = "login:global";

// §4.1 poin 4 — pesan error login SELALU generik, tidak pernah membedakan
// "email tidak terdaftar" vs "password salah".
const GENERIC_ERROR = "Email atau password salah";

// Hash bcrypt valid dari string acak (bukan password siapa pun, aman
// nempel di kode). Dipakai supaya bcrypt.compare TETAP dijalankan penuh
// walau email tidak ditemukan — kalau di-skip, waktu respons "email tidak
// terdaftar" akan jauh lebih cepat dari "password salah" dan jadi timing
// side-channel yang membocorkan email mana saja yang terdaftar.
const DUMMY_HASH =
	"$2b$12$OwrrREs8XiH57klvv4ZaX.YF/fv8YfkdfaILiQh79vlQEKoLPIlpG";

export async function POST(req: NextRequest) {
	try {
		const body = await req.json().catch(() => null);
		if (!body || typeof body !== "object") {
			return NextResponse.json({ error: GENERIC_ERROR }, { status: 400 });
		}

		const email =
			typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
		const password = typeof body.password === "string" ? body.password : "";
		if (!email || !password) {
			return NextResponse.json({ error: GENERIC_ERROR }, { status: 400 });
		}

		// Backstop global dicek LEBIH DULU (lihat komentar di atas) — paling
		// murah, dan melindungi dari flood lintas-email sebelum kita bahkan
		// tahu email mana yang diserang.
		if (isRateLimited(LOGIN_GLOBAL_KEY, LOGIN_GLOBAL_LIMIT, LOGIN_GLOBAL_WINDOW_MS)) {
			return NextResponse.json(
				{ error: "Terlalu banyak percobaan login. Coba lagi dalam beberapa menit." },
				{ status: 429 },
			);
		}

		// §4.1 poin 3 — 5 percobaan gagal / 15 menit PER EMAIL, dicek
		// sebelum verifikasi password apapun dijalankan.
		const rateLimitKey = `login:${email}`;
		if (isRateLimited(rateLimitKey, LOGIN_LIMIT, LOGIN_WINDOW_MS)) {
			return NextResponse.json(
				{ error: "Terlalu banyak percobaan login. Coba lagi dalam beberapa menit." },
				{ status: 429 },
			);
		}
		recordAttempt(LOGIN_GLOBAL_KEY, LOGIN_GLOBAL_WINDOW_MS);

		const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
		if (!serviceKey) {
			return NextResponse.json(
				{ error: "Konfigurasi server belum lengkap" },
				{ status: 500 },
			);
		}
		const adminClient = createClient(
			process.env.NEXT_PUBLIC_SUPABASE_URL!,
			serviceKey,
		);

		const { data: customer } = await adminClient
			.from("customer")
			.select("id, nama, email, password_hash")
			.ilike("email", email)
			.not("password_hash", "is", null)
			.maybeSingle();

		// bcrypt.compare SELALU dijalankan (lihat komentar DUMMY_HASH di atas).
		const validPassword = await bcrypt.compare(
			password,
			customer?.password_hash ?? DUMMY_HASH,
		);

		if (!customer || !validPassword) {
			recordAttempt(rateLimitKey, LOGIN_WINDOW_MS);
			return NextResponse.json({ error: GENERIC_ERROR }, { status: 401 });
		}

		resetAttempts(rateLimitKey);
		const token = await signBookingSession(customer.id);
		const res = NextResponse.json({
			success: true,
			customer: { id: customer.id, nama: customer.nama, email: customer.email },
		});
		res.cookies.set(
			BOOKING_SESSION_COOKIE,
			token,
			bookingSessionCookieOptions(),
		);
		return res;
	} catch {
		return NextResponse.json({ error: GENERIC_ERROR }, { status: 500 });
	}
}
