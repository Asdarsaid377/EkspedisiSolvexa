"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { formatRupiah } from "@/lib/utils";
import { Plus, Pencil, Trash2, X, Save, Search } from "lucide-react";

const KATEGORI_OPTIONS = [
	"Operasional",
	"Gaji / Upah",
	"Transport & Pengiriman",
	"Utilitas",
	"Marketing & Promosi",
	"Pembelian Perlengkapan",
	"Lainnya",
];

const KATEGORI_COLORS: Record<string, string> = {
	Operasional: "bg-blue-50 text-blue-700",
	"Gaji / Upah": "bg-green-50 text-green-700",
	"Transport & Pengiriman": "bg-yellow-50 text-yellow-700",
	Utilitas: "bg-cyan-50 text-cyan-700",
	"Marketing & Promosi": "bg-pink-50 text-pink-700",
	"Pembelian Perlengkapan": "bg-purple-50 text-purple-700",
	Lainnya: "bg-gray-100 text-gray-600",
};

interface Pengeluaran {
	id: string;
	tanggal: string;
	kategori: string;
	keterangan: string;
	jumlah: number;
}

const emptyForm = {
	tanggal: new Date().toISOString().split("T")[0],
	kategori: KATEGORI_OPTIONS[0],
	keterangan: "",
	jumlah: "",
};

const KEU_ROLES = ["superadmin", "keuangan"];

export default function PengeluaranPage() {
	const supabase = createClient();
	const { isSuperAdmin, role, loading: authLoading } = useAuth();
	console.log(role);
	const router = useRouter();

	useEffect(() => {
		if (!authLoading && !KEU_ROLES.includes(role ?? ""))
			router.replace("/dashboard");
	}, [role, authLoading, router]);

	if (authLoading || !KEU_ROLES.includes(role ?? "")) return null;
	const now = new Date();

	const defaultDari = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
	const defaultSampai = new Date(now.getFullYear(), now.getMonth() + 1, 0)
		.toISOString()
		.split("T")[0];

	const [filter, setFilter] = useState({
		dari: defaultDari,
		sampai: defaultSampai,
	});
	const [search, setSearch] = useState("");
	const [filterKategori, setFilterKategori] = useState("");
	const [list, setList] = useState<Pengeluaran[]>([]);
	const [loading, setLoading] = useState(true);

	const [activeModal, setActiveModal] = useState<"tambah" | "edit" | null>(
		null,
	);
	const [editingId, setEditingId] = useState<string | null>(null);
	const [formData, setFormData] = useState(emptyForm);
	const [saving, setSaving] = useState(false);
	const [formError, setFormError] = useState("");
	const [deletingId, setDeletingId] = useState<string | null>(null);

	const load = useCallback(async () => {
		setLoading(true);
		const { data } = await supabase
			.from("pengeluaran")
			.select("*")
			.gte("tanggal", filter.dari)
			.lte("tanggal", filter.sampai)
			.order("tanggal", { ascending: false })
			.order("created_at", { ascending: false });
		setList(data || []);
		setLoading(false);
	}, [filter]);

	useEffect(() => {
		load();
	}, [load]);

	const openTambah = () => {
		setFormData({ ...emptyForm, tanggal: now.toISOString().split("T")[0] });
		setFormError("");
		setEditingId(null);
		setActiveModal("tambah");
	};

	const openEdit = (p: Pengeluaran) => {
		setFormData({
			tanggal: p.tanggal,
			kategori: p.kategori,
			keterangan: p.keterangan,
			jumlah: String(p.jumlah),
		});
		setFormError("");
		setEditingId(p.id);
		setActiveModal("edit");
	};

	const save = async () => {
		if (!formData.keterangan.trim()) {
			setFormError("Keterangan wajib diisi");
			return;
		}
		if (!formData.jumlah || Number(formData.jumlah) <= 0) {
			setFormError("Jumlah harus lebih dari 0");
			return;
		}
		setSaving(true);
		const payload = {
			tanggal: formData.tanggal,
			kategori: formData.kategori,
			keterangan: formData.keterangan.trim(),
			jumlah: Number(formData.jumlah),
		};
		if (editingId) {
			await supabase
				.from("pengeluaran")
				.update({ ...payload, updated_at: new Date().toISOString() })
				.eq("id", editingId);
		} else {
			await supabase.from("pengeluaran").insert(payload);
		}
		setActiveModal(null);
		setSaving(false);
		load();
	};

	const hapus = async (id: string) => {
		await supabase.from("pengeluaran").delete().eq("id", id);
		setDeletingId(null);
		load();
	};

	if (!authLoading && !KEU_ROLES.includes(role ?? "")) {
		return (
			<div className="text-center py-20 text-gray-400">
				Halaman ini hanya dapat diakses oleh owner.
			</div>
		);
	}

	// Aggregasi per kategori
	const byKategori = list.reduce<Record<string, number>>((acc, p) => {
		acc[p.kategori] = (acc[p.kategori] || 0) + p.jumlah;
		return acc;
	}, {});

	const totalSemua = list.reduce((s, p) => s + p.jumlah, 0);

	const filtered = list.filter((p) => {
		if (filterKategori && p.kategori !== filterKategori) return false;
		if (search && !p.keterangan.toLowerCase().includes(search.toLowerCase()))
			return false;
		return true;
	});

	const totalFiltered = filtered.reduce((s, p) => s + p.jumlah, 0);

	return (
		<div>
			<div className="mb-8">
				<h1 className="text-2xl font-bold text-gray-900">
					Pencatatan Pengeluaran
				</h1>
				<p className="text-gray-500 mt-1">
					Catat dan pantau semua pengeluaran operasional bisnis
				</p>
			</div>

			{/* Filter periode */}
			<div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 mb-6 flex flex-wrap gap-4 items-end">
				<div>
					<label className="block text-xs font-medium text-gray-500 mb-1">
						Dari Tanggal
					</label>
					<input
						type="date"
						value={filter.dari}
						onChange={(e) => setFilter({ ...filter, dari: e.target.value })}
						className="px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
					/>
				</div>
				<div>
					<label className="block text-xs font-medium text-gray-500 mb-1">
						Sampai Tanggal
					</label>
					<input
						type="date"
						value={filter.sampai}
						onChange={(e) => setFilter({ ...filter, sampai: e.target.value })}
						className="px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
					/>
				</div>
				<button
					onClick={() =>
						setFilter({ dari: defaultDari, sampai: defaultSampai })
					}
					className="px-4 py-2 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50 transition">
					Reset Bulan Ini
				</button>
				<button
					onClick={openTambah}
					className="ml-auto flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 transition">
					<Plus size={15} />
					Tambah Pengeluaran
				</button>
			</div>

			{loading ? (
				<div className="text-center py-20 text-gray-400">Memuat data...</div>
			) : (
				<>
					{/* Summary cards */}
					<div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
						<div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
							<p className="text-xs text-gray-500 mb-1">Total Pengeluaran</p>
							<p className="text-xl font-bold text-orange-600">
								{formatRupiah(totalSemua)}
							</p>
							<p className="text-xs text-gray-400 mt-0.5">
								{list.length} transaksi
							</p>
						</div>
						{Object.entries(byKategori)
							.sort((a, b) => b[1] - a[1])
							.slice(0, 3)
							.map(([kat, total]) => (
								<div
									key={kat}
									className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
									<p className="text-xs text-gray-500 mb-1 truncate">{kat}</p>
									<p className="text-xl font-bold text-gray-800">
										{formatRupiah(total)}
									</p>
									<p className="text-xs text-gray-400 mt-0.5">
										{totalSemua > 0
											? ((total / totalSemua) * 100).toFixed(0)
											: 0}
										% dari total
									</p>
								</div>
							))}
					</div>

					{/* Breakdown per kategori — chips */}
					{Object.keys(byKategori).length > 0 && (
						<div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 mb-6">
							<p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
								Breakdown per Kategori
							</p>
							<div className="flex flex-wrap gap-2">
								<button
									onClick={() => setFilterKategori("")}
									className={`px-3 py-1.5 rounded-full text-xs font-semibold transition ${
										filterKategori === ""
											? "bg-indigo-600 text-white"
											: "bg-gray-100 text-gray-600 hover:bg-gray-200"
									}`}>
									Semua ({list.length})
								</button>
								{Object.entries(byKategori)
									.sort((a, b) => b[1] - a[1])
									.map(([kat, total]) => (
										<button
											key={kat}
											onClick={() =>
												setFilterKategori(filterKategori === kat ? "" : kat)
											}
											className={`px-3 py-1.5 rounded-full text-xs font-semibold transition ${
												filterKategori === kat
													? "bg-indigo-600 text-white"
													: `${KATEGORI_COLORS[kat] || "bg-gray-100 text-gray-600"} hover:opacity-80`
											}`}>
											{kat}: {formatRupiah(total)}
										</button>
									))}
							</div>
						</div>
					)}

					{/* Search + table */}
					<div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
						<div className="px-6 py-4 border-b border-gray-100 flex flex-wrap items-center gap-3">
							<div className="relative flex-1 min-w-48">
								<Search
									size={15}
									className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
								/>
								<input
									value={search}
									onChange={(e) => setSearch(e.target.value)}
									placeholder="Cari keterangan..."
									className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
								/>
							</div>
							{(filterKategori || search) && (
								<p className="text-sm text-gray-500">
									{filtered.length} item —{" "}
									<span className="font-semibold text-orange-600">
										{formatRupiah(totalFiltered)}
									</span>
								</p>
							)}
						</div>

						{filtered.length === 0 ? (
							<div className="text-center py-12 text-gray-400 text-sm">
								{list.length === 0
									? "Belum ada pengeluaran dicatat pada periode ini"
									: "Tidak ada hasil yang sesuai filter"}
							</div>
						) : (
							<div className="overflow-x-auto">
								<table className="w-full text-sm">
									<thead className="bg-gray-50 border-b border-gray-100">
										<tr>
											<th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">
												Tanggal
											</th>
											<th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">
												Kategori
											</th>
											<th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">
												Keterangan
											</th>
											<th className="text-right px-6 py-3 text-xs font-semibold text-gray-500 uppercase">
												Jumlah
											</th>
											<th className="px-6 py-3 w-20" />
										</tr>
									</thead>
									<tbody className="divide-y divide-gray-50">
										{filtered.map((p) =>
											deletingId === p.id ? (
												<tr key={p.id} className="bg-red-50">
													<td
														colSpan={4}
														className="px-6 py-3 text-sm text-red-700">
														Hapus <strong>{p.keterangan}</strong> (
														{formatRupiah(p.jumlah)})?
													</td>
													<td className="px-6 py-3">
														<div className="flex gap-2 justify-end">
															<button
																onClick={() => hapus(p.id)}
																className="px-3 py-1 bg-red-600 text-white rounded-lg text-xs font-medium hover:bg-red-700 transition">
																Hapus
															</button>
															<button
																onClick={() => setDeletingId(null)}
																className="px-3 py-1 border border-gray-200 rounded-lg text-xs text-gray-600 hover:bg-gray-50 transition">
																Batal
															</button>
														</div>
													</td>
												</tr>
											) : (
												<tr key={p.id} className="hover:bg-gray-50 transition">
													<td className="px-6 py-3 text-gray-500 whitespace-nowrap">
														{new Date(
															p.tanggal + "T00:00:00",
														).toLocaleDateString("id-ID", {
															day: "numeric",
															month: "short",
															year: "numeric",
														})}
													</td>
													<td className="px-6 py-3">
														<span
															className={`text-xs font-medium px-2.5 py-1 rounded-full whitespace-nowrap ${KATEGORI_COLORS[p.kategori] || "bg-gray-100 text-gray-600"}`}>
															{p.kategori}
														</span>
													</td>
													<td className="px-6 py-3 text-gray-700">
														{p.keterangan}
													</td>
													<td className="px-6 py-3 text-right font-semibold text-gray-900 whitespace-nowrap">
														{formatRupiah(p.jumlah)}
													</td>
													<td className="px-6 py-3">
														<div className="flex gap-1 justify-end">
															<button
																onClick={() => openEdit(p)}
																className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition">
																<Pencil size={14} />
															</button>
															<button
																onClick={() => setDeletingId(p.id)}
																className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition">
																<Trash2 size={14} />
															</button>
														</div>
													</td>
												</tr>
											),
										)}
									</tbody>
									<tfoot className="border-t-2 border-gray-200 bg-gray-50/80">
										<tr>
											<td
												colSpan={3}
												className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">
												{filterKategori || search
													? "Total yang tampil"
													: "Total Pengeluaran"}
											</td>
											<td className="px-6 py-3 text-right font-bold text-orange-600">
												{formatRupiah(totalFiltered)}
											</td>
											<td />
										</tr>
									</tfoot>
								</table>
							</div>
						)}
					</div>
				</>
			)}

			{/* Modal Tambah / Edit */}
			{activeModal && (
				<div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
					<div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
						<div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
							<h3 className="font-semibold text-gray-900">
								{activeModal === "tambah"
									? "Tambah Pengeluaran"
									: "Edit Pengeluaran"}
							</h3>
							<button
								onClick={() => setActiveModal(null)}
								className="text-gray-400 hover:text-gray-600">
								<X size={20} />
							</button>
						</div>
						<div className="p-6 space-y-4">
							<div className="grid grid-cols-2 gap-4">
								<div>
									<label className="block text-sm font-medium text-gray-700 mb-1">
										Tanggal
									</label>
									<input
										type="date"
										value={formData.tanggal}
										onChange={(e) =>
											setFormData({ ...formData, tanggal: e.target.value })
										}
										className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
									/>
								</div>
								<div>
									<label className="block text-sm font-medium text-gray-700 mb-1">
										Kategori
									</label>
									<select
										value={formData.kategori}
										onChange={(e) =>
											setFormData({ ...formData, kategori: e.target.value })
										}
										className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white">
										{KATEGORI_OPTIONS.map((k) => (
											<option key={k} value={k}>
												{k}
											</option>
										))}
									</select>
								</div>
							</div>
							<div>
								<label className="block text-sm font-medium text-gray-700 mb-1">
									Keterangan
								</label>
								<input
									value={formData.keterangan}
									onChange={(e) =>
										setFormData({ ...formData, keterangan: e.target.value })
									}
									placeholder="Misal: Gaji karyawan Juni, Bensin pengiriman..."
									className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
								/>
							</div>
							<div>
								<label className="block text-sm font-medium text-gray-700 mb-1">
									Jumlah (Rp)
								</label>
								<input
									type="number"
									value={formData.jumlah}
									onChange={(e) =>
										setFormData({ ...formData, jumlah: e.target.value })
									}
									placeholder="0"
									min={0}
									className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
								/>
							</div>
							{formError && <p className="text-sm text-red-500">{formError}</p>}
						</div>
						<div className="flex gap-3 px-6 pb-6">
							<button
								onClick={save}
								disabled={saving}
								className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition">
								<Save size={15} />
								{saving ? "Menyimpan..." : "Simpan"}
							</button>
							<button
								onClick={() => setActiveModal(null)}
								className="px-5 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50 transition">
								Batal
							</button>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}
