"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Truck, Eye, EyeOff, User, Lock, ArrowRight } from "lucide-react";
import { useBookingAuth } from "@/contexts/BookingAuthContext";
import BookingButton from "@/components/booking/BookingButton";
import BookingInput from "@/components/booking/BookingInput";

// Restyle Stitch (login.png) — logika di bawah ini IDENTIK dengan versi
// sebelum restyling: field email/password, fetch ke /api/booking-auth/login,
// redirect ke /booking setelah sukses. TIDAK ADA perubahan handler/validasi.
//
// Penyesuaian sengaja dari mockup (bukan restyling murni, dicatat karena
// menyimpang dari .png):
// - Label field tetap "Email" (bukan "Nomor Telepon atau Email" seperti
//   mockup) — /api/booking-auth/login cuma mencari berdasarkan kolom
//   email, tidak ada lookup berdasarkan nomor telepon sama sekali.
// - "Lupa Kata Sandi?" TIDAK diimplementasikan — tidak ada alur reset
//   password (lihat CLAUDE.md §Business Logic "Booking Mandiri").
// - Tombol "Google"/"Facebook" TIDAK diimplementasikan — auth booking
//   mandiri sengaja 100% terpisah dari provider OAuth apapun (spec 10 §2).
export default function BookingLoginPage() {
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [showPassword, setShowPassword] = useState(false);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState("");
	const router = useRouter();
	const { refresh } = useBookingAuth();

	const handleLogin = async (e: React.FormEvent) => {
		e.preventDefault();
		setLoading(true);
		setError("");

		try {
			const res = await fetch("/api/booking-auth/login", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ email, password }),
			});
			const data = await res.json();
			if (!res.ok) {
				setError(data.error || "Gagal masuk, coba lagi");
				setLoading(false);
				return;
			}
			await refresh();
			router.push("/booking");
		} catch {
			setError("Gagal masuk, coba lagi");
			setLoading(false);
		}
	};

	return (
		<div className="min-h-screen bg-booking-surface">
			<div className="bg-gradient-to-b from-booking-tint to-booking-surface px-6 pt-12 pb-8 text-center">
				<div className="flex items-center justify-center gap-2">
					<Truck className="text-booking-primary" size={24} strokeWidth={2.5} />
					<span className="text-xl font-extrabold text-booking-primary">
						Ekspedisi
					</span>
				</div>
			</div>

			<div className="max-w-md mx-auto px-6 pb-10">
				<h1 className="text-2xl font-bold text-booking-text">Masuk ke Akun</h1>
				<p className="mt-1 text-sm text-booking-muted">
					Silakan masukkan detail akun Anda untuk melanjutkan pengiriman.
				</p>

				<form onSubmit={handleLogin} className="mt-6 space-y-4">
					<BookingInput
						label="Email"
						type="email"
						value={email}
						onChange={(e) => setEmail(e.target.value)}
						required
						placeholder="Contoh: nama@email.com"
						leftIcon={<User size={18} />}
					/>
					<BookingInput
						label="Kata Sandi"
						type={showPassword ? "text" : "password"}
						value={password}
						onChange={(e) => setPassword(e.target.value)}
						required
						placeholder="••••••••"
						leftIcon={<Lock size={18} />}
						rightElement={
							<button
								type="button"
								onClick={() => setShowPassword(!showPassword)}
								className="text-booking-muted hover:text-booking-text">
								{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
							</button>
						}
					/>

					{error && (
						<div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600">
							{error}
						</div>
					)}

					<BookingButton type="submit" loading={loading}>
						{loading ? (
							"Memproses..."
						) : (
							<>
								Masuk <ArrowRight size={16} />
							</>
						)}
					</BookingButton>
				</form>

				<p className="mt-6 text-center text-sm text-booking-muted">
					Belum punya akun?{" "}
					<Link
						href="/booking/register"
						className="font-semibold text-booking-primary hover:underline">
						Daftar Sekarang
					</Link>
				</p>
			</div>
		</div>
	);
}
