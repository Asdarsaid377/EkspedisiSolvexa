"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Package, Zap, Truck, CheckCircle2 } from "lucide-react";
import { useBookingAuth } from "@/contexts/BookingAuthContext";
import { formatRupiah } from "@/lib/utils";
import type { JenisLayanan } from "@/lib/types";

const JENIS_LAYANAN_OPTIONS: { value: JenisLayanan; label: string; icon: any }[] = [
	{ value: "reguler", label: "Reguler", icon: Package },
	{ value: "express", label: "Express", icon: Zap },
	{ value: "kargo", label: "Kargo", icon: Truck },
];

const emptyForm = {
	jenis_layanan: "reguler" as JenisLayanan,
	penerima_nama: "",
	penerima_telepon: "",
	penerima_alamat: "",
	penerima_kota: "",
	berat_kg: "",
	panjang_cm: "",
	lebar_cm: "",
	tinggi_cm: "",
	isi_barang: "",
	nilai_barang: "",
	catatan: "",
};

export default function BookingBaruPage() {
	const { customer } = useBookingAuth();
	const [form, setForm] = useState(emptyForm);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState("");
	const [sukses, setSukses] = useState<{
		penerima_nama: string;
		ongkir_estimasi: number | null;
		jenis_layanan: JenisLayanan;
	} | null>(null);
	const router = useRouter();

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setLoading(true);
		setError("");

		try {
			const res = await fetch("/api/booking/submit", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(form),
			});
			const data = await res.json();
			if (!res.ok) {
				setError(data.error || "Gagal mengirim booking, coba lagi");
				setLoading(false);
				return;
			}
			setSukses({
				penerima_nama: data.booking.penerima_nama,
				ongkir_estimasi: data.booking.ongkir_estimasi,
				jenis_layanan: data.booking.jenis_layanan,
			});
		} catch {
			setError("Gagal mengirim booking, coba lagi");
		} finally {
			setLoading(false);
		}
	};

	if (sukses) {
		return (
			<div className="bg-white border border-gray-100 rounded-2xl p-6 text-center">
				<div className="inline-flex items-center justify-center w-14 h-14 bg-green-100 rounded-2xl mb-4">
					<CheckCircle2 className="w-7 h-7 text-green-600" />
				</div>
				<h1 className="text-lg font-bold text-gray-900">Booking Terkirim</h1>
				<p className="text-sm text-gray-500 mt-1">
					Pengajuan kiriman untuk <strong>{sukses.penerima_nama}</strong> sudah kami
					terima dan sedang menunggu konfirmasi staf.
				</p>
				{sukses.jenis_layanan === "kargo" ? (
					<p className="text-sm text-gray-600 mt-3">
						Kargo perlu dihitung manual — staf kami akan menghubungi Anda untuk quote
						harga.
					</p>
				) : sukses.ongkir_estimasi != null ? (
					<p className="text-sm text-gray-600 mt-3">
						Estimasi ongkir:{" "}
						<span className="font-semibold text-gray-900">
							{formatRupiah(sukses.ongkir_estimasi)}
						</span>{" "}
						(harga final ditentukan saat konfirmasi)
					</p>
				) : (
					<p className="text-sm text-gray-600 mt-3">
						Belum ada tarif otomatis untuk rute ini — staf akan menghubungi Anda untuk
						konfirmasi harga.
					</p>
				)}
				<div className="flex gap-2 mt-6">
					<button
						onClick={() => {
							setForm(emptyForm);
							setSukses(null);
						}}
						className="flex-1 border border-gray-200 text-gray-700 font-semibold py-2.5 rounded-xl hover:bg-gray-50 transition">
						Booking Lagi
					</button>
					<Link
						href="/booking"
						className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2.5 rounded-xl transition text-center">
						Lihat Riwayat
					</Link>
				</div>
			</div>
		);
	}

	return (
		<div className="space-y-5">
			<h1 className="text-lg font-bold text-gray-900">Booking Baru</h1>

			<div className="bg-gray-50 border border-gray-100 rounded-2xl p-3.5 text-xs text-gray-500">
				<p className="font-medium text-gray-600 mb-0.5">Dikirim dari (data akun Anda)</p>
				<p>{customer?.nama}</p>
				<p>
					{customer?.kota || "Kota belum diisi"}
					{customer?.telepon ? ` · ${customer.telepon}` : ""}
				</p>
				<Link href="/booking/profil" className="text-indigo-600 hover:underline">
					Ubah di halaman Profil
				</Link>
			</div>

			<form onSubmit={handleSubmit} className="space-y-4">
				<div>
					<label className="block text-sm font-medium text-gray-700 mb-1.5">
						Jenis Layanan
					</label>
					<div className="grid grid-cols-3 gap-2">
						{JENIS_LAYANAN_OPTIONS.map((opt) => {
							const Icon = opt.icon;
							const active = form.jenis_layanan === opt.value;
							return (
								<button
									key={opt.value}
									type="button"
									onClick={() => setForm({ ...form, jenis_layanan: opt.value })}
									className={`flex flex-col items-center gap-1 py-2.5 rounded-xl border text-xs font-medium transition ${
										active
											? "border-indigo-500 bg-indigo-50 text-indigo-700"
											: "border-gray-200 text-gray-500 hover:bg-gray-50"
									}`}>
									<Icon size={16} />
									{opt.label}
								</button>
							);
						})}
					</div>
				</div>

				<div>
					<label className="block text-sm font-medium text-gray-700 mb-1">
						Nama Penerima
					</label>
					<input
						type="text"
						value={form.penerima_nama}
						onChange={(e) => setForm({ ...form, penerima_nama: e.target.value })}
						required
						minLength={2}
						maxLength={200}
						className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
						placeholder="Nama penerima"
					/>
				</div>
				<div className="grid grid-cols-2 gap-3">
					<div>
						<label className="block text-sm font-medium text-gray-700 mb-1">
							Telepon Penerima
						</label>
						<input
							type="tel"
							value={form.penerima_telepon}
							onChange={(e) => setForm({ ...form, penerima_telepon: e.target.value })}
							className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
							placeholder="08xxxxxxxxxx"
						/>
					</div>
					<div>
						<label className="block text-sm font-medium text-gray-700 mb-1">
							Kota Tujuan
						</label>
						<input
							type="text"
							value={form.penerima_kota}
							onChange={(e) => setForm({ ...form, penerima_kota: e.target.value })}
							className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
							placeholder="Surabaya"
						/>
					</div>
				</div>
				<div>
					<label className="block text-sm font-medium text-gray-700 mb-1">
						Alamat Tujuan
					</label>
					<textarea
						value={form.penerima_alamat}
						onChange={(e) => setForm({ ...form, penerima_alamat: e.target.value })}
						rows={2}
						className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
						placeholder="Alamat lengkap penerima"
					/>
				</div>

				<div className="grid grid-cols-2 gap-3">
					<div>
						<label className="block text-sm font-medium text-gray-700 mb-1">
							Berat (kg)
						</label>
						<input
							type="number"
							step="0.01"
							min="0.01"
							max="10000"
							value={form.berat_kg}
							onChange={(e) => setForm({ ...form, berat_kg: e.target.value })}
							required
							className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
							placeholder="1"
						/>
					</div>
					<div>
						<label className="block text-sm font-medium text-gray-700 mb-1">
							Nilai Barang (opsional)
						</label>
						<input
							type="number"
							min="0"
							value={form.nilai_barang}
							onChange={(e) => setForm({ ...form, nilai_barang: e.target.value })}
							className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
							placeholder="Rp"
						/>
					</div>
				</div>

				<div>
					<label className="block text-sm font-medium text-gray-700 mb-1">
						Dimensi cm (opsional, utk hitung berat volumetrik)
					</label>
					<div className="grid grid-cols-3 gap-2">
						<input
							type="number"
							min="0.01"
							max="1000"
							value={form.panjang_cm}
							onChange={(e) => setForm({ ...form, panjang_cm: e.target.value })}
							className="w-full px-3 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
							placeholder="P"
						/>
						<input
							type="number"
							min="0.01"
							max="1000"
							value={form.lebar_cm}
							onChange={(e) => setForm({ ...form, lebar_cm: e.target.value })}
							className="w-full px-3 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
							placeholder="L"
						/>
						<input
							type="number"
							min="0.01"
							max="1000"
							value={form.tinggi_cm}
							onChange={(e) => setForm({ ...form, tinggi_cm: e.target.value })}
							className="w-full px-3 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
							placeholder="T"
						/>
					</div>
				</div>

				<div>
					<label className="block text-sm font-medium text-gray-700 mb-1">
						Isi Barang (opsional)
					</label>
					<input
						type="text"
						value={form.isi_barang}
						onChange={(e) => setForm({ ...form, isi_barang: e.target.value })}
						className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
						placeholder="mis. Dokumen, Pakaian"
					/>
				</div>
				<div>
					<label className="block text-sm font-medium text-gray-700 mb-1">
						Catatan (opsional)
					</label>
					<textarea
						value={form.catatan}
						onChange={(e) => setForm({ ...form, catatan: e.target.value })}
						rows={2}
						className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
						placeholder="Instruksi khusus"
					/>
				</div>

				{form.jenis_layanan === "kargo" && (
					<p className="text-xs text-amber-600 bg-amber-50 rounded-xl px-3 py-2">
						Kargo tidak punya estimasi harga otomatis — staf akan menghubungi Anda
						untuk quote setelah booking dikonfirmasi.
					</p>
				)}

				{error && (
					<div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl text-sm">
						{error}
					</div>
				)}

				<button
					type="submit"
					disabled={loading}
					className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white font-semibold py-3 rounded-xl transition">
					{loading ? "Mengirim..." : "Kirim Booking"}
				</button>
			</form>
		</div>
	);
}
