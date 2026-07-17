"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { formatRupiah, formatDateOnly } from "@/lib/utils";
import { Plus, X, Trash2, Wallet, Calendar, User, Info } from "lucide-react";

const emptyForm = {
	sopir_id: "",
	jumlah: "",
	tanggal_setor: "",
	catatan: "",
};

export default function CodPage() {
	const { isSuperAdmin, role, profile } = useAuth();
	const supabase = createClient();

	const canInputSetoran =
		isSuperAdmin || role === "keuangan" || role === "kurir" || role === "sopir";
	const canEditDeleteSetoran = isSuperAdmin || role === "keuangan";

	const [list, setList] = useState<any[]>([]);
	const [petugasList, setPetugasList] = useState<any[]>([]);
	const [estimasi, setEstimasi] = useState<Record<string, number>>({});
	const [loading, setLoading] = useState(true);
	const [filterSopir, setFilterSopir] = useState("semua");
	const [filterTanggal, setFilterTanggal] = useState({ dari: "", sampai: "" });
	const [modal, setModal] = useState<"form" | null>(null);
	const [form, setForm] = useState(emptyForm);
	const [saving, setSaving] = useState(false);
	const [buktiFile, setBuktiFile] = useState<File | null>(null);
	const [buktiPreview, setBuktiPreview] = useState<string | null>(null);

	useEffect(() => {
		const now = new Date();
		const sampai = now.toISOString().split("T")[0];
		const dari = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate())
			.toISOString()
			.split("T")[0];
		setFilterTanggal({ dari, sampai });
		loadAll();
	}, []);

	const loadAll = async () => {
		setLoading(true);
		const [{ data: setoran }, { data: petugas }] = await Promise.all([
			supabase
				.from("cod_setoran")
				.select(
					"*, sopir:profiles!sopir_id(name), creator:profiles!created_by(name)",
				)
				.order("tanggal_setor", { ascending: false }),
			supabase
				.from("profiles")
				.select("id, name, role")
				.in("role", ["sopir", "kurir"])
				.order("name"),
		]);
		setList(setoran || []);
		setPetugasList(petugas || []);
		await loadEstimasi(petugas || []);
		setLoading(false);
	};

	// Estimasi COD terkumpul per petugas — mencocokkan pengiriman.petugas_nama (text)
	// terhadap nama profile, BUKAN link presisi (pengiriman tidak punya petugas_id).
	// Ditandai jelas sebagai "Estimasi" di UI, bukan angka otoritatif.
	const loadEstimasi = async (petugas: any[]) => {
		if (petugas.length === 0) {
			setEstimasi({});
			return;
		}
		const { data: bayar } = await supabase
			.from("pengiriman_pembayaran")
			.select("jumlah, pengiriman:pengiriman(petugas_nama)")
			.eq("metode", "cod");
		const result: Record<string, number> = {};
		for (const p of petugas) {
			const nama = (p.name || "").trim().toLowerCase();
			if (!nama) continue;
			result[p.id] = (bayar || [])
				.filter(
					(b: any) =>
						(b.pengiriman?.petugas_nama || "").trim().toLowerCase() === nama,
				)
				.reduce((s: number, b: any) => s + Number(b.jumlah), 0);
		}
		setEstimasi(result);
	};

	const openForm = () => {
		setForm({
			...emptyForm,
			sopir_id: role === "sopir" || role === "kurir" ? profile?.id || "" : "",
			tanggal_setor: new Date().toISOString().split("T")[0],
		});
		setBuktiFile(null);
		setBuktiPreview(null);
		setModal("form");
	};

	const saveForm = async () => {
		if (!form.sopir_id || !form.jumlah || Number(form.jumlah) <= 0) return;
		setSaving(true);

		let foto_bukti: string | null = null;
		if (buktiFile) {
			const ext = buktiFile.name.split(".").pop();
			const path = `cod-setoran/${form.sopir_id}/${Date.now()}.${ext}`;
			const { error: upErr } = await supabase.storage
				.from("BungaNaik")
				.upload(path, buktiFile);
			if (!upErr) {
				const { data: urlData } = supabase.storage
					.from("BungaNaik")
					.getPublicUrl(path);
				foto_bukti = urlData.publicUrl;
			}
		}

		await supabase.from("cod_setoran").insert({
			sopir_id: form.sopir_id,
			jumlah: Number(form.jumlah),
			tanggal_setor: form.tanggal_setor || new Date().toISOString().split("T")[0],
			catatan: form.catatan || null,
			foto_bukti,
			created_by: profile?.id,
		});

		setSaving(false);
		setModal(null);
		loadAll();
	};

	const hapusSetoran = async (id: string) => {
		if (!confirm("Yakin hapus catatan setoran ini?")) return;
		await supabase.from("cod_setoran").delete().eq("id", id);
		loadAll();
	};

	const filtered = list
		.filter((s) => (filterSopir === "semua" ? true : s.sopir_id === filterSopir))
		.filter((s) => {
			if (filterTanggal.dari && s.tanggal_setor < filterTanggal.dari) return false;
			if (filterTanggal.sampai && s.tanggal_setor > filterTanggal.sampai)
				return false;
			return true;
		});

	const totalSetoranFiltered = filtered.reduce((s, r) => s + Number(r.jumlah), 0);

	return (
		<div>
			<div className="flex items-center justify-between mb-6">
				<div>
					<h1 className="text-2xl font-bold text-gray-900">Setoran COD</h1>
					<p className="text-gray-500 mt-1">{list.length} catatan setoran</p>
				</div>
				{canInputSetoran && (
					<button
						onClick={openForm}
						className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition">
						<Plus size={16} /> Catat Setoran
					</button>
				)}
			</div>

			<div className="flex items-start gap-2 bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded-xl text-sm mb-6">
				<Info size={15} className="mt-0.5 flex-shrink-0" />
				<p>
					&quot;Estimasi COD Terkumpul&quot; dihitung dari pencocokan nama petugas
					di data pengiriman — bukan angka final/otoritatif. Gunakan sebagai
					referensi kasar, bukan dasar audit.
				</p>
			</div>

			{/* Kartu ringkasan per petugas */}
			<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
				{petugasList.map((p) => {
					const terkumpul = estimasi[p.id] || 0;
					const totalSetor = list
						.filter((s) => s.sopir_id === p.id)
						.reduce((s, r) => s + Number(r.jumlah), 0);
					const sisa = terkumpul - totalSetor;
					return (
						<div
							key={p.id}
							className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
							<div className="flex items-center gap-2 mb-3">
								<div className="w-8 h-8 rounded-full bg-indigo-50 flex items-center justify-center flex-shrink-0">
									<User size={14} className="text-indigo-500" />
								</div>
								<p className="text-sm font-semibold text-gray-900 truncate">
									{p.name}
								</p>
								<span className="text-[10px] px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-500 uppercase font-semibold">
									{p.role}
								</span>
							</div>
							<div className="space-y-1 text-xs">
								<div className="flex justify-between">
									<span className="text-gray-500">Estimasi Terkumpul</span>
									<span className="font-medium text-gray-700">
										{formatRupiah(terkumpul)}
									</span>
								</div>
								<div className="flex justify-between">
									<span className="text-gray-500">Total Setoran</span>
									<span className="font-medium text-green-600">
										{formatRupiah(totalSetor)}
									</span>
								</div>
								<div className="flex justify-between border-t border-gray-100 pt-1">
									<span className="font-semibold text-gray-600">
										Sisa (estimasi)
									</span>
									<span
										className={`font-bold ${sisa > 0 ? "text-red-600" : "text-gray-400"}`}>
										{formatRupiah(Math.max(0, sisa))}
									</span>
								</div>
							</div>
						</div>
					);
				})}
				{petugasList.length === 0 && (
					<p className="text-sm text-gray-400 italic col-span-full">
						Belum ada staf dengan role sopir/kurir.
					</p>
				)}
			</div>

			<div className="flex flex-wrap gap-3 mb-5">
				<select
					value={filterSopir}
					onChange={(e) => setFilterSopir(e.target.value)}
					className="px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
					<option value="semua">Semua Petugas</option>
					{petugasList.map((p) => (
						<option key={p.id} value={p.id}>
							{p.name}
						</option>
					))}
				</select>
				<input
					type="date"
					value={filterTanggal.dari}
					onChange={(e) =>
						setFilterTanggal((f) => ({ ...f, dari: e.target.value }))
					}
					className="px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
				/>
				<span className="text-gray-400 text-sm self-center">—</span>
				<input
					type="date"
					value={filterTanggal.sampai}
					onChange={(e) =>
						setFilterTanggal((f) => ({ ...f, sampai: e.target.value }))
					}
					className="px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
				/>
			</div>

			<div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
				<div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
					<p className="text-sm font-semibold text-gray-700">Riwayat Setoran</p>
					<p className="text-sm text-gray-500">
						Total:{" "}
						<span className="font-bold text-gray-800">
							{formatRupiah(totalSetoranFiltered)}
						</span>
					</p>
				</div>
				<div className="divide-y divide-gray-50">
					{loading ? (
						<div className="text-center py-12 text-gray-400">Memuat...</div>
					) : filtered.length === 0 ? (
						<div className="text-center py-12 text-gray-400">
							Belum ada setoran
						</div>
					) : (
						filtered.map((s) => (
							<div
								key={s.id}
								className="flex items-center justify-between px-5 py-3.5">
								<div className="flex items-center gap-3 min-w-0">
									<div className="w-9 h-9 rounded-xl bg-green-50 flex items-center justify-center flex-shrink-0">
										<Wallet size={16} className="text-green-600" />
									</div>
									<div className="min-w-0">
										<p className="text-sm font-medium text-gray-900">
											{s.sopir?.name || "-"}{" "}
											<span className="font-bold text-green-600">
												{formatRupiah(s.jumlah)}
											</span>
										</p>
										<p className="text-xs text-gray-500 flex items-center gap-1.5 mt-0.5">
											<Calendar size={11} /> {formatDateOnly(s.tanggal_setor)}
											{s.catatan ? ` · ${s.catatan}` : ""}
											{s.creator?.name ? ` · dicatat oleh ${s.creator.name}` : ""}
										</p>
									</div>
								</div>
								<div className="flex items-center gap-2 flex-shrink-0">
									{s.foto_bukti && (
										<a
											href={s.foto_bukti}
											target="_blank"
											rel="noopener noreferrer"
											className="text-xs text-indigo-600 hover:underline">
											Lihat Bukti
										</a>
									)}
									{canEditDeleteSetoran && (
										<button
											onClick={() => hapusSetoran(s.id)}
											className="p-2 hover:bg-red-50 rounded-lg text-red-500 transition"
											title="Hapus">
											<Trash2 size={14} />
										</button>
									)}
								</div>
							</div>
						))
					)}
				</div>
			</div>

			{modal === "form" && (
				<div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
					<div className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
						<div className="flex items-center justify-between p-6 border-b border-gray-100">
							<h2 className="text-lg font-semibold">Catat Setoran COD</h2>
							<button
								onClick={() => setModal(null)}
								className="p-2 hover:bg-gray-100 rounded-lg">
								<X size={18} />
							</button>
						</div>
						<div className="p-6 space-y-4">
							<div>
								<label className="block text-sm font-medium text-gray-700 mb-1">
									Sopir / Kurir
								</label>
								<select
									value={form.sopir_id}
									onChange={(e) =>
										setForm({ ...form, sopir_id: e.target.value })
									}
									className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
									<option value="">— Pilih —</option>
									{petugasList.map((p) => (
										<option key={p.id} value={p.id}>
											{p.name}
										</option>
									))}
								</select>
							</div>
							<div>
								<label className="block text-sm font-medium text-gray-700 mb-1">
									Jumlah Setoran
								</label>
								<input
									type="number"
									value={form.jumlah}
									onChange={(e) => setForm({ ...form, jumlah: e.target.value })}
									className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
								/>
							</div>
							<div>
								<label className="block text-sm font-medium text-gray-700 mb-1">
									Tanggal Setor
								</label>
								<input
									type="date"
									value={form.tanggal_setor}
									onChange={(e) =>
										setForm({ ...form, tanggal_setor: e.target.value })
									}
									className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
								/>
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
							<div>
								<label className="block text-sm font-medium text-gray-700 mb-1">
									Foto Bukti Setor
								</label>
								<input
									type="file"
									accept="image/*"
									onChange={(e) => {
										const f = e.target.files?.[0] ?? null;
										setBuktiFile(f);
										setBuktiPreview(f ? URL.createObjectURL(f) : null);
									}}
									className="w-full text-sm text-gray-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-medium file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
								/>
								{buktiPreview && (
									<img
										src={buktiPreview}
										alt="Preview bukti"
										className="mt-2 h-28 w-44 object-cover rounded-xl border border-gray-200"
									/>
								)}
							</div>
						</div>
						<div className="flex gap-3 p-6 pt-0">
							<button
								onClick={() => setModal(null)}
								className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium hover:bg-gray-50">
								Batal
							</button>
							<button
								onClick={saveForm}
								disabled={saving || !form.sopir_id || !form.jumlah}
								className="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white px-4 py-2.5 rounded-xl text-sm font-medium">
								{saving ? "Menyimpan..." : "Simpan Setoran"}
							</button>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}
