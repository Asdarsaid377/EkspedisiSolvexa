"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
	Plus,
	Search,
	X,
	Trash2,
	Edit3,
	Truck,
	User,
} from "lucide-react";

const STATUS_CFG: Record<string, { label: string; color: string }> = {
	tersedia: { label: "Tersedia", color: "bg-green-100 text-green-700" },
	maintenance: { label: "Maintenance", color: "bg-amber-100 text-amber-700" },
	nonaktif: { label: "Nonaktif", color: "bg-gray-100 text-gray-600" },
};

const emptyForm = {
	plat_nomor: "",
	jenis_kendaraan: "",
	kapasitas_kg: "",
	kapasitas_m3: "",
	status: "tersedia",
	sopir_id: "",
	catatan: "",
};

export default function ArmadaPage() {
	const { isSuperAdmin, role, loading: authLoading } = useAuth();
	const router = useRouter();
	const supabase = createClient();

	const canManage = isSuperAdmin || role === "gudang";

	const [list, setList] = useState<any[]>([]);
	const [sopirList, setSopirList] = useState<any[]>([]);
	const [loading, setLoading] = useState(true);
	const [search, setSearch] = useState("");
	const [modal, setModal] = useState<"form" | null>(null);
	const [editingId, setEditingId] = useState<string | null>(null);
	const [form, setForm] = useState(emptyForm);
	const [saving, setSaving] = useState(false);
	const [formError, setFormError] = useState("");

	useEffect(() => {
		if (authLoading) return;
		if (!canManage) {
			router.replace("/dashboard");
			return;
		}
		loadAll();
	}, [authLoading, canManage]);

	if (authLoading || !canManage) return null;

	const loadAll = async () => {
		const [{ data }, { data: sopir }] = await Promise.all([
			supabase
				.from("armada")
				.select("*, sopir:profiles!sopir_id(name)")
				.order("plat_nomor"),
			supabase
				.from("profiles")
				.select("id, name, role")
				.in("role", ["sopir", "kurir"])
				.order("name"),
		]);
		setList(data || []);
		setSopirList(sopir || []);
		setLoading(false);
	};

	const openForm = (row?: any) => {
		setFormError("");
		if (row) {
			setEditingId(row.id);
			setForm({
				plat_nomor: row.plat_nomor,
				jenis_kendaraan: row.jenis_kendaraan || "",
				kapasitas_kg: row.kapasitas_kg ? String(row.kapasitas_kg) : "",
				kapasitas_m3: row.kapasitas_m3 ? String(row.kapasitas_m3) : "",
				status: row.status,
				sopir_id: row.sopir_id || "",
				catatan: row.catatan || "",
			});
		} else {
			setEditingId(null);
			setForm(emptyForm);
		}
		setModal("form");
	};

	const saveForm = async () => {
		if (!form.plat_nomor.trim()) return;
		setSaving(true);
		setFormError("");

		const payload = {
			plat_nomor: form.plat_nomor.trim().toUpperCase(),
			jenis_kendaraan: form.jenis_kendaraan || null,
			kapasitas_kg: form.kapasitas_kg ? Number(form.kapasitas_kg) : null,
			kapasitas_m3: form.kapasitas_m3 ? Number(form.kapasitas_m3) : null,
			status: form.status,
			sopir_id: form.sopir_id || null,
			catatan: form.catatan || null,
		};

		const { error } = editingId
			? await supabase.from("armada").update(payload).eq("id", editingId)
			: await supabase.from("armada").insert(payload);

		if (error) {
			setFormError(
				error.code === "23505"
					? "Plat nomor ini sudah terdaftar."
					: "Gagal menyimpan: " + error.message,
			);
			setSaving(false);
			return;
		}

		setSaving(false);
		setModal(null);
		loadAll();
	};

	const hapus = async (id: string) => {
		if (!confirm("Hapus armada ini?")) return;
		await supabase.from("armada").delete().eq("id", id);
		loadAll();
	};

	const filtered = list.filter(
		(r) =>
			r.plat_nomor.toLowerCase().includes(search.toLowerCase()) ||
			(r.jenis_kendaraan || "").toLowerCase().includes(search.toLowerCase()),
	);

	return (
		<div>
			<div className="flex items-center justify-between mb-6">
				<div>
					<h1 className="text-2xl font-bold text-gray-900">Armada</h1>
					<p className="text-gray-500 mt-1">{list.length} kendaraan</p>
				</div>
				<button
					onClick={() => openForm()}
					className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition">
					<Plus size={16} /> Armada Baru
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
					placeholder="Cari plat nomor / jenis kendaraan..."
					className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
				/>
			</div>

			<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
				{loading ? (
					<div className="col-span-full text-center py-12 text-gray-400">
						Memuat...
					</div>
				) : filtered.length === 0 ? (
					<div className="col-span-full text-center py-12 text-gray-400">
						Belum ada armada
					</div>
				) : (
					filtered.map((r) => {
						const st = STATUS_CFG[r.status] || STATUS_CFG.tersedia;
						return (
							<div
								key={r.id}
								className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
								<div className="flex items-start justify-between mb-3">
									<div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center">
										<Truck size={18} className="text-indigo-500" />
									</div>
									<span
										className={`text-xs px-2 py-0.5 rounded-full font-semibold ${st.color}`}>
										{st.label}
									</span>
								</div>
								<p className="font-bold text-gray-900 font-mono">{r.plat_nomor}</p>
								{r.jenis_kendaraan && (
									<p className="text-sm text-gray-500 mt-0.5">
										{r.jenis_kendaraan}
									</p>
								)}
								<div className="flex flex-wrap gap-x-3 gap-y-1 mt-2 text-xs text-gray-500">
									{r.kapasitas_kg && <span>{r.kapasitas_kg} kg</span>}
									{r.kapasitas_m3 && <span>{r.kapasitas_m3} m³</span>}
								</div>
								{r.sopir?.name && (
									<p className="flex items-center gap-1.5 text-xs text-gray-600 mt-2">
										<User size={11} className="text-gray-400" /> {r.sopir.name}
									</p>
								)}
								<div className="flex items-center gap-1 mt-3 pt-3 border-t border-gray-100">
									<button
										onClick={() => openForm(r)}
										className="flex-1 flex items-center justify-center gap-1.5 py-1.5 hover:bg-indigo-50 rounded-lg text-indigo-600 text-xs font-medium transition">
										<Edit3 size={13} /> Edit
									</button>
									<button
										onClick={() => hapus(r.id)}
										className="flex-1 flex items-center justify-center gap-1.5 py-1.5 hover:bg-red-50 rounded-lg text-red-500 text-xs font-medium transition">
										<Trash2 size={13} /> Hapus
									</button>
								</div>
							</div>
						);
					})
				)}
			</div>

			{modal === "form" && (
				<div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
					<div className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
						<div className="flex items-center justify-between p-6 border-b border-gray-100">
							<h2 className="text-lg font-semibold">
								{editingId ? "Edit Armada" : "Armada Baru"}
							</h2>
							<button
								onClick={() => setModal(null)}
								className="p-2 hover:bg-gray-100 rounded-lg">
								<X size={18} />
							</button>
						</div>
						<div className="p-6 space-y-4">
							<div>
								<label className="block text-sm font-medium text-gray-700 mb-1">
									Plat Nomor
								</label>
								<input
									value={form.plat_nomor}
									onChange={(e) =>
										setForm({ ...form, plat_nomor: e.target.value })
									}
									placeholder="DD 1234 XX"
									className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
								/>
							</div>
							<div>
								<label className="block text-sm font-medium text-gray-700 mb-1">
									Jenis Kendaraan
								</label>
								<input
									value={form.jenis_kendaraan}
									onChange={(e) =>
										setForm({ ...form, jenis_kendaraan: e.target.value })
									}
									placeholder="Truk Engkel, Motor, Mobil Box, dst"
									className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
								/>
							</div>
							<div className="grid grid-cols-2 gap-3">
								<div>
									<label className="block text-sm font-medium text-gray-700 mb-1">
										Kapasitas (kg)
									</label>
									<input
										type="number"
										value={form.kapasitas_kg}
										onChange={(e) =>
											setForm({ ...form, kapasitas_kg: e.target.value })
										}
										className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
									/>
								</div>
								<div>
									<label className="block text-sm font-medium text-gray-700 mb-1">
										Kapasitas (m³)
									</label>
									<input
										type="number"
										value={form.kapasitas_m3}
										onChange={(e) =>
											setForm({ ...form, kapasitas_m3: e.target.value })
										}
										className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
									/>
								</div>
							</div>
							<div>
								<label className="block text-sm font-medium text-gray-700 mb-1">
									Status
								</label>
								<select
									value={form.status}
									onChange={(e) => setForm({ ...form, status: e.target.value })}
									className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
									<option value="tersedia">Tersedia</option>
									<option value="maintenance">Maintenance</option>
									<option value="nonaktif">Nonaktif</option>
								</select>
							</div>
							<div>
								<label className="block text-sm font-medium text-gray-700 mb-1">
									Sopir/Kurir Default (opsional)
								</label>
								<select
									value={form.sopir_id}
									onChange={(e) =>
										setForm({ ...form, sopir_id: e.target.value })
									}
									className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
									<option value="">— Tidak ada —</option>
									{sopirList.map((s) => (
										<option key={s.id} value={s.id}>
											{s.name} ({s.role})
										</option>
									))}
								</select>
							</div>
							<div>
								<label className="block text-sm font-medium text-gray-700 mb-1">
									Catatan
								</label>
								<input
									value={form.catatan}
									onChange={(e) => setForm({ ...form, catatan: e.target.value })}
									placeholder="Opsional"
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
								disabled={saving || !form.plat_nomor.trim()}
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
