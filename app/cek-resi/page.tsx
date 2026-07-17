"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Package, Search, ArrowRight, Loader2 } from "lucide-react";

export default function CekResiPage() {
	const router = useRouter();
	const [input, setInput] = useState("");
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState("");

	const handleCek = () => {
		const nomor = input.trim().toUpperCase();
		if (!nomor) {
			setError("Masukkan nomor resi terlebih dahulu.");
			return;
		}
		if (!nomor.startsWith("BNG-") || nomor.length < 5) {
			setError("Format nomor resi tidak valid. Contoh: BNG-AB12CD34");
			return;
		}
		setError("");
		setLoading(true);
		router.push(`/resi/${nomor}`);
	};

	const handleKeyDown = (e: React.KeyboardEvent) => {
		if (e.key === "Enter") handleCek();
	};

	return (
		<div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex flex-col">
			{/* Header */}
			<div className="bg-white border-b border-gray-100 px-6 py-4 flex items-center gap-3">
				<div className="w-9 h-9 bg-indigo-600 rounded-xl flex items-center justify-center">
					<Package size={18} className="text-white" />
				</div>
				<div>
					<p className="text-xs text-gray-400 font-medium tracking-widest uppercase">BungaNaik Furniture</p>
					<p className="text-sm font-bold text-gray-900 leading-tight">Cek Status Pesanan</p>
				</div>
			</div>

			{/* Main */}
			<div className="flex-1 flex items-center justify-center px-4 py-12">
				<div className="w-full max-w-md">
					{/* Icon + Title */}
					<div className="text-center mb-8">
						<div className="w-20 h-20 bg-indigo-100 rounded-3xl flex items-center justify-center mx-auto mb-5">
							<Search size={36} className="text-indigo-600" />
						</div>
						<h1 className="text-2xl font-bold text-gray-900 mb-2">
							Lacak Pesanan Anda
						</h1>
						<p className="text-gray-500 text-sm leading-relaxed">
							Masukkan nomor resi yang Anda terima dari toko untuk
							melihat status terbaru pesanan Anda.
						</p>
					</div>

					{/* Card */}
					<div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6">
						<label className="block text-sm font-semibold text-gray-700 mb-2">
							Nomor Resi
						</label>
						<input
							type="text"
							value={input}
							onChange={(e) => {
								setInput(e.target.value);
								setError("");
							}}
							onKeyDown={handleKeyDown}
							placeholder="Contoh: BNG-AB12CD34"
							className="w-full px-4 py-3.5 border border-gray-200 rounded-2xl text-sm font-mono tracking-wider focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition placeholder:font-sans placeholder:tracking-normal"
							autoFocus
							autoComplete="off"
							autoCapitalize="characters"
						/>

						{error && (
							<p className="text-red-500 text-xs mt-2 flex items-center gap-1">
								<span>⚠</span> {error}
							</p>
						)}

						<button
							onClick={handleCek}
							disabled={loading}
							className="mt-4 w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white font-semibold py-3.5 rounded-2xl text-sm transition">
							{loading ? (
								<><Loader2 size={16} className="animate-spin" /> Memuat...</>
							) : (
								<><Search size={16} /> Cek Status Pesanan <ArrowRight size={15} /></>
							)}
						</button>

						<div className="mt-4 bg-indigo-50 rounded-xl px-4 py-3 text-xs text-indigo-600">
							<p className="font-semibold mb-0.5">Tips</p>
							<p className="text-indigo-500">Nomor resi dimulai dengan <span className="font-mono font-bold">BNG-</span> dan terdiri dari 12 karakter. Cek kembali pesan WhatsApp dari toko.</p>
						</div>
					</div>

					{/* Bantuan */}
					<p className="text-center text-xs text-gray-400 mt-6">
						Tidak menemukan pesanan? Hubungi toko kami melalui WhatsApp.
					</p>
				</div>
			</div>

			{/* Footer */}
			<div className="text-center pb-8">
				<p className="text-xs text-gray-300">BungaNaik Furniture · Tracking Pesanan</p>
			</div>
		</div>
	);
}
