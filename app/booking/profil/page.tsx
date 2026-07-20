"use client";

import { useEffect, useState } from "react";
import { useBookingAuth } from "@/contexts/BookingAuthContext";

export default function BookingProfilPage() {
	const { customer, loading: authLoading, refresh } = useBookingAuth();
	const [form, setForm] = useState({ nama: "", telepon: "", alamat: "", kota: "" });
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState("");
	const [sukses, setSukses] = useState(false);

	useEffect(() => {
		if (!customer) return;
		setForm({
			nama: customer.nama ?? "",
			telepon: customer.telepon ?? "",
			alamat: customer.alamat ?? "",
			kota: customer.kota ?? "",
		});
	}, [customer]);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setSaving(true);
		setError("");
		setSukses(false);

		try {
			const res = await fetch("/api/booking-auth/profil", {
				method: "PATCH",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(form),
			});
			const data = await res.json();
			if (!res.ok) {
				setError(data.error || "Gagal memperbarui profil");
				setSaving(false);
				return;
			}
			await refresh();
			setSukses(true);
		} catch {
			setError("Gagal memperbarui profil");
		} finally {
			setSaving(false);
		}
	};

	if (authLoading) {
		return <div className="text-center py-12 text-gray-400 text-sm">Memuat...</div>;
	}

	return (
		<div className="space-y-5">
			<div>
				<h1 className="text-lg font-bold text-gray-900">Profil Saya</h1>
				<p className="text-xs text-gray-400 mt-0.5">{customer?.email} (tidak bisa diubah)</p>
			</div>

			<form onSubmit={handleSubmit} className="space-y-4">
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
					/>
				</div>
				<div>
					<label className="block text-sm font-medium text-gray-700 mb-1">
						Telepon
					</label>
					<input
						type="tel"
						value={form.telepon}
						onChange={(e) => setForm({ ...form, telepon: e.target.value })}
						className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
					/>
				</div>
				<div>
					<label className="block text-sm font-medium text-gray-700 mb-1">Kota</label>
					<input
						type="text"
						value={form.kota}
						onChange={(e) => setForm({ ...form, kota: e.target.value })}
						className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
					/>
				</div>
				<div>
					<label className="block text-sm font-medium text-gray-700 mb-1">
						Alamat
					</label>
					<textarea
						value={form.alamat}
						onChange={(e) => setForm({ ...form, alamat: e.target.value })}
						rows={3}
						className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
					/>
				</div>

				<p className="text-xs text-gray-400">
					Kota &amp; alamat dipakai sebagai data pengirim default saat Anda membuat
					booking baru — perubahan di sini tidak mengubah booking yang sudah pernah
					dikirim sebelumnya.
				</p>

				{error && (
					<div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl text-sm">
						{error}
					</div>
				)}
				{sukses && (
					<div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl text-sm">
						Profil berhasil diperbarui.
					</div>
				)}

				<button
					type="submit"
					disabled={saving}
					className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white font-semibold py-3 rounded-xl transition">
					{saving ? "Menyimpan..." : "Simpan Perubahan"}
				</button>
			</form>
		</div>
	);
}
