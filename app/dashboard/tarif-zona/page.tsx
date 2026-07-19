"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { formatRupiah } from "@/lib/utils";
import { logAktivitas } from "@/lib/aktivitas";
import {
	Plus,
	Search,
	X,
	Trash2,
	Edit3,
	MapPin,
	Zap,
	Package,
	Power,
} from "lucide-react";

const emptyForm = {
	kota_asal: "",
	kota_tujuan: "",
	jenis_layanan: "reguler" as "reguler" | "express",
	harga_per_kg: "",
	harga_flat_min: "",
	estimasi_hari: "",
	aktif: true,
};

export default function TarifZonaPage() {
	const { isSuperAdmin, loading: authLoading, profile } = useAuth();
	const router = useRouter();
	const supabase = createClient();

	const [list, setList] = useState<any[]>([]);
	const [loading, setLoading] = useState(true);
	const [search, setSearch] = useState("");
	const [modal, setModal] = useState<"form" | null>(null);
	const [editingId, setEditingId] = useState<string | null>(null);
	const [form, setForm] = useState(emptyForm);
	const [saving, setSaving] = useState(false);
	const [formError, setFormError] = useState("");

	useEffect(() => {
		if (authLoading) return;
		if (!isSuperAdmin) {
			router.replace("/dashboard");
			return;
		}
		loadAll();
	}, [isSuperAdmin, authLoading]);

	if (authLoading || !isSuperAdmin) return null;

	const loadAll = async () => {
		const { data } = await supabase
			.from("tarif_zona")
			.select("*")
			.order("kota_asal")
			.order("kota_tujuan");
		setList(data || []);
		setLoading(false);
	};

	const openForm = (row?: any) => {
		setFormError("");
		if (row) {
			setEditingId(row.id);
			setForm({
				kota_asal: row.kota_asal,
				kota_tujuan: row.kota_tujuan,
				jenis_layanan: row.jenis_layanan,
				harga_per_kg: String(row.harga_per_kg),
				harga_flat_min: String(row.harga_flat_min),
				estimasi_hari: row.estimasi_hari ? String(row.estimasi_hari) : "",
				aktif: row.aktif,
			});
		} else {
			setEditingId(null);
			setForm(emptyForm);
		}
		setModal("form");
	};

	const saveForm = async () => {
		if (!form.kota_asal.trim() || !form.kota_tujuan.trim()) return;
		setSaving(true);
		setFormError("");

		const payload = {
			kota_asal: form.kota_asal.trim(),
			kota_tujuan: form.kota_tujuan.trim(),
			jenis_layanan: form.jenis_layanan,
			harga_per_kg: Number(form.harga_per_kg) || 0,
			harga_flat_min: Number(form.harga_flat_min) || 0,
			estimasi_hari: form.estimasi_hari ? Number(form.estimasi_hari) : null,
			aktif: form.aktif,
		};

		const before = editingId ? list.find((r) => r.id === editingId) : null;

		const { error } = editingId
			? await supabase.from("tarif_zona").update(payload).eq("id", editingId)
			: await supabase.from("tarif_zona").insert(payload);

		if (error) {
			setFormError(
				error.code === "23505"
					? "Tarif untuk pasangan kota & jenis layanan ini sudah ada."
					: "Gagal menyimpan: " + error.message,
			);
			setSaving(false);
			return;
		}

		if (editingId) {
			await logAktivitas(supabase, {
				aksi: "edit_tarif",
				entitas: "tarif_zona",
				entitas_id: editingId,
				ref: `${payload.kota_asal} → ${payload.kota_tujuan} (${payload.jenis_layanan})`,
				detail: { sebelum: before, sesudah: payload },
				created_by: profile?.id,
			});
		}

		setSaving(false);
		setModal(null);
		loadAll();
	};

	const toggleAktif = async (row: any) => {
		await supabase
			.from("tarif_zona")
			.update({ aktif: !row.aktif })
			.eq("id", row.id);
		loadAll();
	};

	const hapus = async (row: any) => {
		if (!confirm("Hapus tarif ini?")) return;
		const { error } = await supabase.from("tarif_zona").delete().eq("id", row.id);
		if (error) return;

		await logAktivitas(supabase, {
			aksi: "hapus_tarif",
			entitas: "tarif_zona",
			entitas_id: row.id,
			ref: `${row.kota_asal} → ${row.kota_tujuan} (${row.jenis_layanan})`,
			detail: {
				harga_per_kg: row.harga_per_kg,
				harga_flat_min: row.harga_flat_min,
				estimasi_hari: row.estimasi_hari,
			},
			created_by: profile?.id,
		});

		loadAll();
	};

	const filtered = list.filter(
		(r) =>
			r.kota_asal.toLowerCase().includes(search.toLowerCase()) ||
			r.kota_tujuan.toLowerCase().includes(search.toLowerCase()),
	);

	return (
		<div>
			<div className="flex items-center justify-between mb-6">
				<div>
					<h1 className="text-2xl font-bold text-gray-900">Tarif Zona</h1>
					<p className="text-gray-500 mt-1">
						{list.length} tarif — dipakai untuk hitung ongkir otomatis layanan
						Reguler & Express (Kargo tetap manual quote)
					</p>
				</div>
				<button
					onClick={() => openForm()}
					className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition">
					<Plus size={16} /> Tarif Baru
				</button>
			</div>

			<div className="relative mb-6 max-w-md">
				<Search
					size={16}
					className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
				/>
				<input
					value={search}
					onChange={(e) => setSearch(e.target.value)}
					placeholder="Cari kota asal/tujuan..."
					className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
				/>
			</div>

			<div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
				{loading ? (
					<div className="text-center py-12 text-gray-400">Memuat...</div>
				) : filtered.length === 0 ? (
					<div className="text-center py-12 text-gray-400">Belum ada tarif</div>
				) : (
					<table className="w-full text-sm">
						<thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
							<tr>
								<th className="text-left px-5 py-3">Rute</th>
								<th className="text-left px-5 py-3">Layanan</th>
								<th className="text-right px-5 py-3">Harga/kg</th>
								<th className="text-right px-5 py-3">Min. Ongkir</th>
								<th className="text-center px-5 py-3">Estimasi</th>
								<th className="text-center px-5 py-3">Status</th>
								<th className="text-right px-5 py-3">Aksi</th>
							</tr>
						</thead>
						<tbody className="divide-y divide-gray-50">
							{filtered.map((r) => (
								<tr key={r.id} className={!r.aktif ? "opacity-50" : ""}>
									<td className="px-5 py-3">
										<div className="flex items-center gap-1.5 font-medium text-gray-900">
											<MapPin size={13} className="text-gray-400" />
											{r.kota_asal} <span className="text-gray-300">→</span>{" "}
											{r.kota_tujuan}
										</div>
									</td>
									<td className="px-5 py-3">
										<span
											className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-semibold ${
												r.jenis_layanan === "express"
													? "bg-amber-100 text-amber-700"
													: "bg-blue-100 text-blue-700"
											}`}>
											{r.jenis_layanan === "express" ? (
												<Zap size={10} />
											) : (
												<Package size={10} />
											)}
											{r.jenis_layanan === "express" ? "Express" : "Reguler"}
										</span>
									</td>
									<td className="px-5 py-3 text-right">
										{formatRupiah(r.harga_per_kg)}
									</td>
									<td className="px-5 py-3 text-right">
										{formatRupiah(r.harga_flat_min)}
									</td>
									<td className="px-5 py-3 text-center text-gray-500">
										{r.estimasi_hari ? `${r.estimasi_hari} hari` : "-"}
									</td>
									<td className="px-5 py-3 text-center">
										<button
											onClick={() => toggleAktif(r)}
											className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-semibold transition ${
												r.aktif
													? "bg-green-100 text-green-700 hover:bg-green-200"
													: "bg-gray-100 text-gray-500 hover:bg-gray-200"
											}`}>
											<Power size={10} /> {r.aktif ? "Aktif" : "Nonaktif"}
										</button>
									</td>
									<td className="px-5 py-3">
										<div className="flex items-center justify-end gap-1">
											<button
												onClick={() => openForm(r)}
												className="p-1.5 hover:bg-indigo-50 rounded-lg text-indigo-600 transition">
												<Edit3 size={14} />
											</button>
											<button
												onClick={() => hapus(r)}
												className="p-1.5 hover:bg-red-50 rounded-lg text-red-500 transition">
												<Trash2 size={14} />
											</button>
										</div>
									</td>
								</tr>
							))}
						</tbody>
					</table>
				)}
			</div>

			{modal === "form" && (
				<div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
					<div className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
						<div className="flex items-center justify-between p-6 border-b border-gray-100">
							<h2 className="text-lg font-semibold">
								{editingId ? "Edit Tarif" : "Tarif Baru"}
							</h2>
							<button
								onClick={() => setModal(null)}
								className="p-2 hover:bg-gray-100 rounded-lg">
								<X size={18} />
							</button>
						</div>
						<div className="p-6 space-y-4">
							<div className="grid grid-cols-2 gap-3">
								<div>
									<label className="block text-sm font-medium text-gray-700 mb-1">
										Kota Asal
									</label>
									<input
										value={form.kota_asal}
										onChange={(e) =>
											setForm({ ...form, kota_asal: e.target.value })
										}
										placeholder="Makassar"
										className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
									/>
								</div>
								<div>
									<label className="block text-sm font-medium text-gray-700 mb-1">
										Kota Tujuan
									</label>
									<input
										value={form.kota_tujuan}
										onChange={(e) =>
											setForm({ ...form, kota_tujuan: e.target.value })
										}
										placeholder="Jakarta"
										className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
									/>
								</div>
							</div>
							<div>
								<label className="block text-sm font-medium text-gray-700 mb-2">
									Jenis Layanan
								</label>
								<div className="grid grid-cols-2 gap-3">
									{(["reguler", "express"] as const).map((jl) => (
										<button
											key={jl}
											type="button"
											onClick={() => setForm({ ...form, jenis_layanan: jl })}
											className={`flex items-center justify-center gap-1.5 py-2.5 rounded-xl border-2 text-sm font-medium transition ${
												form.jenis_layanan === jl
													? "border-indigo-500 bg-indigo-50 text-indigo-700"
													: "border-gray-200 text-gray-500 hover:border-gray-300"
											}`}>
											{jl === "express" ? <Zap size={14} /> : <Package size={14} />}
											{jl === "express" ? "Express" : "Reguler"}
										</button>
									))}
								</div>
							</div>
							<div className="grid grid-cols-2 gap-3">
								<div>
									<label className="block text-sm font-medium text-gray-700 mb-1">
										Harga per kg
									</label>
									<input
										type="number"
										value={form.harga_per_kg}
										onChange={(e) =>
											setForm({ ...form, harga_per_kg: e.target.value })
										}
										className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
									/>
								</div>
								<div>
									<label className="block text-sm font-medium text-gray-700 mb-1">
										Minimum Ongkir
									</label>
									<input
										type="number"
										value={form.harga_flat_min}
										onChange={(e) =>
											setForm({ ...form, harga_flat_min: e.target.value })
										}
										className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
									/>
								</div>
							</div>
							<div>
								<label className="block text-sm font-medium text-gray-700 mb-1">
									Estimasi Hari (opsional)
								</label>
								<input
									type="number"
									value={form.estimasi_hari}
									onChange={(e) =>
										setForm({ ...form, estimasi_hari: e.target.value })
									}
									className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
								/>
							</div>
							{formError && (
								<div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2.5 rounded-xl text-sm">
									{formError}
								</div>
							)}
						</div>
						<div className="flex gap-3 p-6 pt-0">
							<button
								onClick={() => setModal(null)}
								className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium hover:bg-gray-50">
								Batal
							</button>
							<button
								onClick={saveForm}
								disabled={
									saving || !form.kota_asal.trim() || !form.kota_tujuan.trim()
								}
								className="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white px-4 py-2.5 rounded-xl text-sm font-medium">
								{saving ? "Menyimpan..." : "Simpan"}
							</button>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}
