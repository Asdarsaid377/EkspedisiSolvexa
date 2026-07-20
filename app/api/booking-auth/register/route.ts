import { createClient } from "@supabase/supabase-js";
import bcrypt from "bcryptjs";
import { NextRequest, NextResponse } from "next/server";
import {
	BOOKING_SESSION_COOKIE,
	bookingSessionCookieOptions,
	signBookingSession,
} from "@/lib/bookingAuth";
import { getClientIp, isRateLimited, recordAttempt } from "@/lib/bookingRateLimit";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const REGISTER_LIMIT = 10;
const REGISTER_WINDOW_MS = 60 * 60 * 1000; // 1 jam, per IP

// Backstop topology-independent (ditambahkan setelah dikonfirmasi TIDAK ADA
// reverse proxy di depan app ini — lihat docs/spec/10-booking-mandiri.md
// §4.1 poin 3). Tanpa proxy tepercaya yang menimpa header masuk,
// `X-Forwarded-For` sepenuhnya dikontrol client — dibuktikan lewat tes
// manual (Step 2): spoof header beda tiap request membuat limit per-IP di
// atas trivial dilewati. Counter GLOBAL ini tidak bergantung identitas
// client sama sekali, jadi tidak bisa dilewati dengan cara yang sama.
// Trade-off yang diterima sadar: penyerang bisa sengaja memicu limit
// global untuk memblokir SEMUA registrasi (termasuk customer asli) selama
// window aktif — tapi itu lebih baik daripada flood tak terbatas yang
// menghabiskan CPU lewat bcrypt cost-12 di tiap percobaan.
const REGISTER_GLOBAL_LIMIT = 30;
const REGISTER_GLOBAL_WINDOW_MS = 5 * 60 * 1000; // 5 menit
const REGISTER_GLOBAL_KEY = "register:global";

function truncate(value: string, max: number): string {
	return value.slice(0, max);
}

export async function POST(req: NextRequest) {
	try {
		// §4.1 poin 3 — rate limit registrasi, dicek PALING AWAL sebelum
		// parsing body/bcrypt/query DB, supaya request yang sudah kena limit
		// tidak ikut membebani apapun di belakangnya. Backstop global dicek
		// LEBIH DULU (lihat komentar di atas) — kalau sudah kena, tidak perlu
		// lanjut cek per-IP sama sekali.
		if (isRateLimited(REGISTER_GLOBAL_KEY, REGISTER_GLOBAL_LIMIT, REGISTER_GLOBAL_WINDOW_MS)) {
			return NextResponse.json(
				{ error: "Terlalu banyak percobaan registrasi. Coba lagi nanti." },
				{ status: 429 },
			);
		}

		const ip = getClientIp(req);
		const rateLimitKey = `register:${ip}`;
		if (isRateLimited(rateLimitKey, REGISTER_LIMIT, REGISTER_WINDOW_MS)) {
			return NextResponse.json(
				{ error: "Terlalu banyak percobaan registrasi. Coba lagi nanti." },
				{ status: 429 },
			);
		}
		recordAttempt(REGISTER_GLOBAL_KEY, REGISTER_GLOBAL_WINDOW_MS);
		recordAttempt(rateLimitKey, REGISTER_WINDOW_MS);

		const body = await req.json().catch(() => null);
		if (!body || typeof body !== "object") {
			return NextResponse.json({ error: "Data tidak valid" }, { status: 400 });
		}

		// Honeypot (§4.1 poin 3) — field `website` disembunyikan lewat CSS
		// di form asli (app/booking/register/page.tsx, Step 5), BUKAN
		// type="hidden" (bot form-filler sering skip input hidden secara
		// eksplisit). Terisi apapun → tolak diam-diam dengan pesan generik
		// yang identik dengan error validasi biasa, tidak ada sinyal ke bot.
		if (typeof body.website === "string" && body.website.trim() !== "") {
			return NextResponse.json(
				{ error: "Registrasi gagal, coba lagi" },
				{ status: 400 },
			);
		}

		const email =
			typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
		const password = typeof body.password === "string" ? body.password : "";
		const nama = typeof body.nama === "string" ? body.nama.trim() : "";
		const telepon =
			typeof body.telepon === "string" ? truncate(body.telepon.trim(), 50) : null;
		const alamat =
			typeof body.alamat === "string" ? truncate(body.alamat.trim(), 2000) : null;
		const kota =
			typeof body.kota === "string" ? truncate(body.kota.trim(), 200) : null;

		// Validasi server (§4.1 poin 5 — jangan cuma andalkan form).
		if (!EMAIL_RE.test(email) || email.length > 200) {
			return NextResponse.json({ error: "Email tidak valid" }, { status: 400 });
		}
		if (password.length < 8 || password.length > 200) {
			return NextResponse.json(
				{ error: "Password minimal 8 karakter" },
				{ status: 400 },
			);
		}
		if (nama.length < 2 || nama.length > 200) {
			return NextResponse.json(
				{ error: "Nama wajib diisi (2-200 karakter)" },
				{ status: 400 },
			);
		}

		const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
		if (!serviceKey) {
			return NextResponse.json(
				{ error: "Konfigurasi server belum lengkap" },
				{ status: 500 },
			);
		}
		// Service role — HARUS dipakai (jalur ini insert ke `customer`
		// sebelum identitas customer eksis, RLS auth_all_customer tidak
		// bisa dilewati dengan cara lain). Tidak ada RETURNING beresiko di
		// sini karena service role bypass RLS sepenuhnya (beda dari gotcha
		// aktivitas_log di CLAUDE.md §RLS, itu soal client authenticated
		// biasa, bukan service role).
		const adminClient = createClient(
			process.env.NEXT_PUBLIC_SUPABASE_URL!,
			serviceKey,
		);

		// §4.1 poin 4 — bcrypt cost 12 (di atas floor minimum >= 10 di spec).
		const passwordHash = await bcrypt.hash(password, 12);

		const { data: customer, error } = await adminClient
			.from("customer")
			.insert({
				nama,
				email,
				password_hash: passwordHash,
				telepon,
				alamat,
				kota,
				tipe: "umum",
			})
			.select("id, nama, email")
			.single();

		if (error) {
			// 23505 = unique_violation pada idx_customer_email_unique.
			if (error.code === "23505") {
				return NextResponse.json(
					{ error: "Email sudah terdaftar" },
					{ status: 409 },
				);
			}
			return NextResponse.json(
				{ error: "Registrasi gagal, coba lagi" },
				{ status: 500 },
			);
		}

		const token = await signBookingSession(customer.id);
		const res = NextResponse.json({ success: true, customer });
		res.cookies.set(
			BOOKING_SESSION_COOKIE,
			token,
			bookingSessionCookieOptions(),
		);
		return res;
	} catch {
		return NextResponse.json(
			{ error: "Registrasi gagal, coba lagi" },
			{ status: 500 },
		);
	}
}
