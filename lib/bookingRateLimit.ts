import type { NextRequest } from "next/server";

// Rate limit sederhana in-memory untuk endpoint auth publik (§4.1 poin 3:
// 5 percobaan login gagal/15 menit per email, 10 registrasi/jam per IP).
//
// CATATAN PENTING: state ini hidup di memory proses Node, jadi (1) hilang
// total tiap restart server, dan (2) TIDAK sinkron across instance kalau
// suatu saat deploy jadi multi-instance/serverless (tiap instance punya
// counter sendiri-sendiri). Spec 10 §4.1 poin 3 secara eksplisit
// menyebutkan "in-memory/DB counter" sebagai pilihan yang cukup untuk v1 —
// kalau nanti pindah ke deployment multi-instance, ganti basis penyimpanan
// ke tabel DB (atau Redis), BUKAN ubah logika limit-nya.

type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();

function sweep(now: number) {
	buckets.forEach((bucket, key) => {
		if (bucket.resetAt <= now) buckets.delete(key);
	});
}

/** true = sudah kena limit (tolak request), false = masih boleh lanjut. */
export function isRateLimited(
	key: string,
	limit: number,
	windowMs: number,
): boolean {
	const now = Date.now();
	const bucket = buckets.get(key);
	if (!bucket || bucket.resetAt <= now) return false;
	return bucket.count >= limit;
}

/** Catat satu percobaan (gagal login, atau satu kali submit registrasi). */
export function recordAttempt(key: string, windowMs: number): void {
	const now = Date.now();
	if (buckets.size > 5000) sweep(now); // guard kasar, jarang kena di trafik normal

	const bucket = buckets.get(key);
	if (!bucket || bucket.resetAt <= now) {
		buckets.set(key, { count: 1, resetAt: now + windowMs });
		return;
	}
	bucket.count += 1;
}

/** Reset counter (dipanggil setelah login sukses). */
export function resetAttempts(key: string): void {
	buckets.delete(key);
}

// Next.js App Router tidak menyediakan req.ip di luar Vercel — baca header
// proxy standar. Kalau tidak ada satupun (mis. dev server tanpa proxy),
// jatuh ke "unknown" — semua request tanpa header ini berbagi satu bucket,
// bukan celah keamanan (cuma bikin limit lebih ketat untuk kasus itu, bukan
// lebih longgar).
export function getClientIp(req: NextRequest): string {
	const forwardedFor = req.headers.get("x-forwarded-for");
	if (forwardedFor) return forwardedFor.split(",")[0].trim();
	const realIp = req.headers.get("x-real-ip");
	if (realIp) return realIp.trim();
	return "unknown";
}
