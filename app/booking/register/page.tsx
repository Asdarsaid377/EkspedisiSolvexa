"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Package, Eye, EyeOff } from "lucide-react";
import { useBookingAuth } from "@/contexts/BookingAuthContext";

export default function BookingRegisterPage() {
	const [form, setForm] = useState({
		nama: "",
		email: "",
		password: "",
		telepon: "",
		kota: "",
		website: "", // honeypot — lihat komentar di bawah, JANGAN dihapus
	});
	const [showPassword, setShowPassword] = useState(false);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState("");
	const router = useRouter();
	const { refresh } = useBookingAuth();

	const handleRegister = async (e: React.FormEvent) => {
		e.preventDefault();
		setLoading(true);
		setError("");

		try {
			const res = await fetch("/api/booking-auth/register", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(form),
			});
			const data = await res.json();
			if (!res.ok) {
				setError(data.error || "Gagal mendaftar, coba lagi");
				setLoading(false);
				return;
			}
			await refresh();
			router.push("/booking");
		} catch {
			setError("Gagal mendaftar, coba lagi");
			setLoading(false);
		}
	};

	return (
		<div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
			<div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-8">
				<div className="text-center mb-8">
					<div className="inline-flex items-center justify-center w-16 h-16 bg-indigo-100 rounded-2xl mb-4">
						<Package className="w-8 h-8 text-indigo-600" />
					</div>
					<h1 className="text-2xl font-bold text-gray-900">Daftar Akun</h1>
					<p className="text-gray-500 mt-1">Buat akun untuk booking kiriman sendiri</p>
				</div>

				<form onSubmit={handleRegister} className="space-y-4">
					<div>
						<label className="block text-sm font-medium text-gray-700 mb-1">
							Nama Lengkap
						</label>
						<input
							type="text"
							value={form.nama}
							onChange={(e) => setForm({ ...form, nama: e.target.value })}
							required
							minLength={2}
							maxLength={200}
							className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
							placeholder="Nama Anda"
						/>
					</div>
					<div>
						<label className="block text-sm font-medium text-gray-700 mb-1">
							Email
						</label>
						<input
							type="email"
							value={form.email}
							onChange={(e) => setForm({ ...form, email: e.target.value })}
							required
							className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
							placeholder="email@anda.com"
						/>
					</div>
					<div>
						<label className="block text-sm font-medium text-gray-700 mb-1">
							Password
						</label>
						<div className="relative">
							<input
								type={showPassword ? "text" : "password"}
								value={form.password}
								onChange={(e) => setForm({ ...form, password: e.target.value })}
								required
								minLength={8}
								className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition pr-12"
								placeholder="Minimal 8 karakter"
							/>
							<button
								type="button"
								onClick={() => setShowPassword(!showPassword)}
								className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
								{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
							</button>
						</div>
					</div>
					<div className="grid grid-cols-2 gap-3">
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-1">
								Telepon
							</label>
							<input
								type="tel"
								value={form.telepon}
								onChange={(e) => setForm({ ...form, telepon: e.target.value })}
								className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
								placeholder="08xxxxxxxxxx"
							/>
						</div>
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-1">
								Kota
							</label>
							<input
								type="text"
								value={form.kota}
								onChange={(e) => setForm({ ...form, kota: e.target.value })}
								className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
								placeholder="Jakarta"
							/>
						</div>
					</div>

					{/*
						Honeypot (§4.1 poin 3) — disembunyikan lewat CSS off-screen,
						SENGAJA BUKAN type="hidden" (banyak bot form-filler skip input
						hidden secara eksplisit, tapi tetap isi input teks biasa yang
						cuma disembunyikan visual). Manusia tidak akan pernah melihat
						atau mengisi field ini lewat browser normal.
					*/}
					<div
						style={{
							position: "absolute",
							left: "-9999px",
							width: "1px",
							height: "1px",
							overflow: "hidden",
						}}
						aria-hidden="true">
						<label htmlFor="website">Website</label>
						<input
							type="text"
							id="website"
							name="website"
							tabIndex={-1}
							autoComplete="off"
							value={form.website}
							onChange={(e) => setForm({ ...form, website: e.target.value })}
						/>
					</div>

					{error && (
						<div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl text-sm">
							{error}
						</div>
					)}

					<button
						type="submit"
						disabled={loading}
						className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white font-semibold py-3 rounded-xl transition">
						{loading ? "Memproses..." : "Daftar"}
					</button>
				</form>

				<p className="text-center text-sm text-gray-500 mt-6">
					Sudah punya akun?{" "}
					<Link href="/booking/login" className="text-indigo-600 font-medium hover:underline">
						Masuk
					</Link>
				</p>
			</div>
		</div>
	);
}
