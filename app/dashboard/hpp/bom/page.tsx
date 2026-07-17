"use client";

import { useEffect, useState, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { formatRupiah } from "@/lib/utils";
import {
	Search, X, Plus, Edit2, Trash2,
	CheckCircle2, GitBranch, Package, AlertCircle,
	Check,
} from "lucide-react";

interface Produk {
	id: string;
	nama: string;
	kategori: string | null;
	satuan: string;
	bom_count: number;
}

interface BomItem {
	id: string;
	produk_id: string;
	bahan_baku_id: string;
	jumlah_standar: number;
	catatan: string | null;
	bahan_baku: { nama: string; satuan: string; harga_beli_terakhir: number } | null;
}

interface BahanBaku {
	id: string;
	nama: string;
	satuan: string;
	harga_beli_terakhir: number;
}

export default function BomPage() {
	const supabase = createClient();
	const { isSuperAdmin } = useAuth();

	const [produkList, setProdukList] = useState<Produk[]>([]);
	const [loading, setLoading] = useState(true);
	const [search, setSearch] = useState("");
	const [filterBelumBOM, setFilterBelumBOM] = useState(false);

	// Modal BOM detail
	const [selectedProduk, setSelectedProduk] = useState<Produk | null>(null);
	const [bomItems, setBomItems] = useState<BomItem[]>([]);
	const [loadingBom, setLoadingBom] = useState(false);

	// Form tambah / edit bahan di BOM
	const [editingId, setEditingId] = useState<string | null>(null);  // id bom item yang sedang diedit
	const [editJumlah, setEditJumlah] = useState("");
	const [editCatatan, setEditCatatan] = useState("");
	const [saving, setSaving] = useState(false);
	const [formError, setFormError] = useState("");

	// Search bahan baku untuk tambah ke BOM
	const [bahanSearch, setBahanSearch] = useState("");
	const [bahanList, setBahanList] = useState<BahanBaku[]>([]);
	const [bahanDropdown, setBahanDropdown] = useState(false);
	const [addingBahan, setAddingBahan] = useState<BahanBaku | null>(null);
	const [addJumlah, setAddJumlah] = useState("");
	const [addCatatan, setAddCatatan] = useState("");
	const bahanRef = useRef<HTMLDivElement>(null);

	useEffect(() => { loadProduk(); }, []);

	useEffect(() => {
		const handleClick = (e: MouseEvent) => {
			if (bahanRef.current && !bahanRef.current.contains(e.target as Node))
				setBahanDropdown(false);
		};
		document.addEventListener("mousedown", handleClick);
		return () => document.removeEventListener("mousedown", handleClick);
	}, []);

	const loadProduk = async () => {
		setLoading(true);
		const { data: produk } = await supabase
			.from("produk")
			.select("id, nama, kategori, satuan")
			.eq("aktif", true)
			.order("nama");

		const { data: bomCounts } = await supabase
			.from("bom")
			.select("produk_id");

		const countMap: Record<string, number> = {};
		(bomCounts || []).forEach((b) => {
			countMap[b.produk_id] = (countMap[b.produk_id] || 0) + 1;
		});

		setProdukList(
			(produk || []).map((p) => ({ ...p, bom_count: countMap[p.id] || 0 }))
		);
		setLoading(false);
	};

	const loadBom = async (produkId: string) => {
		setLoadingBom(true);
		const { data } = await supabase
			.from("bom")
			.select("*, bahan_baku:bahan_baku(nama, satuan, harga_beli_terakhir)")
			.eq("produk_id", produkId)
			.order("created_at");
		setBomItems(data || []);
		setLoadingBom(false);
	};

	const openBom = (p: Produk) => {
		setSelectedProduk(p);
		setBomItems([]);
		setEditingId(null);
		setAddingBahan(null);
		setBahanSearch("");
		setFormError("");
		loadBom(p.id);
	};

	// ── Search bahan baku ─────────────────────────────────────────────────────

	const handleBahanSearch = async (val: string) => {
		setBahanSearch(val);
		setBahanDropdown(true);
		const { data } = await supabase
			.from("bahan_baku")
			.select("id, nama, satuan, harga_beli_terakhir")
			.eq("aktif", true)
			.ilike("nama", `%${val}%`)
			.order("nama")
			.limit(20);
		setBahanList(data || []);
	};

	const pilihBahan = (b: BahanBaku) => {
		if (bomItems.some((i) => i.bahan_baku_id === b.id)) {
			setFormError(`${b.nama} sudah ada di BOM ini.`);
			setBahanDropdown(false);
			setBahanSearch("");
			return;
		}
		setAddingBahan(b);
		setAddJumlah("");
		setAddCatatan("");
		setBahanSearch("");
		setBahanDropdown(false);
		setFormError("");
	};

	// ── Simpan bahan baru ke BOM ──────────────────────────────────────────────

	const saveTambahBahan = async () => {
		if (!selectedProduk || !addingBahan) return;
		const jumlah = parseFloat(addJumlah);
		if (!jumlah || jumlah <= 0) {
			setFormError("Jumlah standar harus lebih dari 0.");
			return;
		}
		setSaving(true);
		setFormError("");
		const { error } = await supabase.from("bom").insert({
			produk_id: selectedProduk.id,
			bahan_baku_id: addingBahan.id,
			jumlah_standar: jumlah,
			catatan: addCatatan.trim() || null,
		});
		if (error) {
			setFormError("Gagal menyimpan: " + error.message);
			setSaving(false);
			return;
		}
		setAddingBahan(null);
		setAddJumlah("");
		setAddCatatan("");
		await loadBom(selectedProduk.id);
		loadProduk();
		setSaving(false);
	};

	// ── Edit jumlah inline ────────────────────────────────────────────────────

	const startEdit = (item: BomItem) => {
		setEditingId(item.id);
		setEditJumlah(String(item.jumlah_standar));
		setEditCatatan(item.catatan || "");
		setFormError("");
	};

	const saveEdit = async () => {
		if (!editingId || !selectedProduk) return;
		const jumlah = parseFloat(editJumlah);
		if (!jumlah || jumlah <= 0) {
			setFormError("Jumlah harus lebih dari 0.");
			return;
		}
		setSaving(true);
		setFormError("");
		await supabase
			.from("bom")
			.update({
				jumlah_standar: jumlah,
				catatan: editCatatan.trim() || null,
				updated_at: new Date().toISOString(),
			})
			.eq("id", editingId);
		setEditingId(null);
		await loadBom(selectedProduk.id);
		setSaving(false);
	};

	// ── Hapus bahan dari BOM ──────────────────────────────────────────────────

	const hapusBahan = async (item: BomItem) => {
		if (!selectedProduk) return;
		if (!confirm(`Hapus ${item.bahan_baku?.nama} dari BOM produk ini?`)) return;
		await supabase.from("bom").delete().eq("id", item.id);
		await loadBom(selectedProduk.id);
		loadProduk();
	};

	// ── Kalkulasi biaya standar per unit ─────────────────────────────────────

	const biayaStandar = bomItems.reduce(
		(s, i) => s + i.jumlah_standar * (i.bahan_baku?.harga_beli_terakhir || 0),
		0
	);

	// ── Filter ────────────────────────────────────────────────────────────────

	const filtered = produkList.filter((p) => {
		if (filterBelumBOM && p.bom_count > 0) return false;
		if (search) return p.nama.toLowerCase().includes(search.toLowerCase());
		return true;
	});

	const sudahBOM = produkList.filter((p) => p.bom_count > 0).length;
	const belumBOM = produkList.filter((p) => p.bom_count === 0).length;

	// ─────────────────────────────────────────────────────────────────────────

	return (
		<div>
			{/* ── Header ── */}
			<div className="mb-6">
				<h1 className="text-2xl font-bold text-gray-900">Bill of Materials</h1>
				<p className="text-gray-500 mt-1">Standar kebutuhan bahan baku per produk</p>
			</div>

			{/* ── Stat Cards ── */}
			<div className="grid grid-cols-3 gap-4 mb-6">
				<div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
					<p className="text-xs text-gray-500 mb-1">Total Produk</p>
					<p className="text-2xl font-bold text-indigo-600">{produkList.length}</p>
				</div>
				<div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
					<p className="text-xs text-gray-500 mb-1">Sudah ada BOM</p>
					<p className="text-2xl font-bold text-green-600">{sudahBOM}</p>
				</div>
				<div
					onClick={() => setFilterBelumBOM(!filterBelumBOM)}
					className={`bg-white rounded-2xl p-4 shadow-sm border cursor-pointer transition ${belumBOM > 0 ? "border-amber-200 bg-amber-50" : "border-gray-100"}`}>
					<p className="text-xs text-gray-500 mb-1">Belum ada BOM</p>
					<p className={`text-2xl font-bold ${belumBOM > 0 ? "text-amber-600" : "text-gray-400"}`}>{belumBOM}</p>
				</div>
			</div>

			{/* ── Filter ── */}
			<div className="flex gap-3 mb-4">
				<div className="relative flex-1">
					<Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
					<input
						value={search}
						onChange={(e) => setSearch(e.target.value)}
						placeholder="Cari nama produk..."
						className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
					/>
					{search && (
						<button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
							<X size={14} />
						</button>
					)}
				</div>
				<button
					onClick={() => setFilterBelumBOM(!filterBelumBOM)}
					className={`flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-sm font-medium border transition flex-shrink-0 ${
						filterBelumBOM
							? "bg-amber-500 text-white border-amber-500"
							: "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
					}`}>
					<AlertCircle size={14} />
					Belum BOM
				</button>
			</div>

			{/* ── Tabel produk ── */}
			<div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
				<table className="w-full text-sm">
					<thead className="bg-gray-50 border-b border-gray-100">
						<tr>
							<th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Produk</th>
							<th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Kategori</th>
							<th className="text-center px-5 py-3 text-xs font-semibold text-gray-500 uppercase">BOM</th>
							<th className="text-center px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Aksi</th>
						</tr>
					</thead>
					<tbody className="divide-y divide-gray-50">
						{loading ? (
							<tr><td colSpan={4} className="text-center py-12 text-gray-400">Memuat...</td></tr>
						) : filtered.length === 0 ? (
							<tr>
								<td colSpan={4} className="text-center py-12">
									<Package size={32} className="mx-auto text-gray-200 mb-2" />
									<p className="text-gray-400">Tidak ada produk ditemukan</p>
								</td>
							</tr>
						) : (
							filtered.map((p) => (
								<tr key={p.id} className="hover:bg-gray-50 transition">
									<td className="px-5 py-3.5">
										<p className="font-medium text-gray-900">{p.nama}</p>
										<p className="text-xs text-gray-400">{p.satuan}</p>
									</td>
									<td className="px-5 py-3.5 text-gray-500 text-sm">
										{p.kategori || <span className="text-gray-300">—</span>}
									</td>
									<td className="px-5 py-3.5 text-center">
										{p.bom_count > 0 ? (
											<span className="inline-flex items-center gap-1 bg-green-50 text-green-700 text-xs font-semibold px-2.5 py-1 rounded-full">
												<CheckCircle2 size={11} />
												{p.bom_count} bahan
											</span>
										) : (
											<span className="inline-flex items-center gap-1 bg-amber-50 text-amber-600 text-xs font-semibold px-2.5 py-1 rounded-full">
												<AlertCircle size={11} />
												Belum diisi
											</span>
										)}
									</td>
									<td className="px-5 py-3.5 text-center">
										<button
											onClick={() => openBom(p)}
											className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-lg text-xs font-semibold transition">
											<GitBranch size={13} />
											{p.bom_count > 0 ? "Kelola" : "Buat BOM"}
										</button>
									</td>
								</tr>
							))
						)}
					</tbody>
				</table>
			</div>

			{/* ══ MODAL BOM DETAIL ═════════════════════════════════════════════════ */}
			{selectedProduk && (
				<div className="fixed inset-0 bg-black/40 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
					<div className="bg-white rounded-t-3xl sm:rounded-2xl w-full sm:max-w-xl shadow-2xl max-h-[95vh] flex flex-col">

						{/* Header modal */}
						<div className="flex items-start justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
							<div>
								<h2 className="text-lg font-semibold">Bill of Materials</h2>
								<p className="text-sm text-indigo-600 font-medium mt-0.5">{selectedProduk.nama}</p>
							</div>
							<button
								onClick={() => setSelectedProduk(null)}
								className="p-2 hover:bg-gray-100 rounded-xl mt-0.5">
								<X size={18} />
							</button>
						</div>

						{/* Body */}
						<div className="overflow-y-auto flex-1 px-6 py-5 space-y-4">

							{/* Biaya standar per unit */}
							{bomItems.length > 0 && isSuperAdmin && (
								<div className="bg-indigo-50 rounded-xl px-4 py-3 flex items-center justify-between">
									<p className="text-sm text-indigo-600 font-medium">Estimasi Biaya Bahan / unit</p>
									<p className="text-base font-bold text-indigo-800">{formatRupiah(biayaStandar)}</p>
								</div>
							)}

							{/* List BOM items */}
							{loadingBom ? (
								<p className="text-center text-gray-400 py-6">Memuat BOM...</p>
							) : bomItems.length === 0 ? (
								<div className="text-center py-6 border-2 border-dashed border-gray-200 rounded-xl text-gray-400 text-sm">
									Belum ada bahan baku di BOM ini.<br />
									<span className="text-xs">Cari bahan di bawah untuk menambahkan.</span>
								</div>
							) : (
								<div className="border border-gray-200 rounded-xl overflow-hidden">
									<table className="w-full text-sm">
										<thead className="bg-gray-50">
											<tr>
												<th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500">Bahan Baku</th>
												<th className="text-right px-4 py-2.5 text-xs font-semibold text-gray-500">Jumlah Standar</th>
												{isSuperAdmin && (
													<th className="text-right px-4 py-2.5 text-xs font-semibold text-gray-500">Est. Biaya</th>
												)}
												<th className="px-2 py-2.5" />
											</tr>
										</thead>
										<tbody className="divide-y divide-gray-100">
											{bomItems.map((item) => (
												<tr key={item.id} className="hover:bg-gray-50">
													<td className="px-4 py-3">
														<p className="font-medium text-gray-900">{item.bahan_baku?.nama}</p>
														{item.catatan && (
															<p className="text-xs text-gray-400">{item.catatan}</p>
														)}
													</td>
													<td className="px-4 py-3 text-right">
														{editingId === item.id ? (
															<div className="flex items-center gap-2 justify-end">
																<input
																	type="number"
																	step="0.001"
																	min="0"
																	value={editJumlah}
																	onChange={(e) => setEditJumlah(e.target.value)}
																	className="w-20 px-2 py-1 border border-indigo-300 rounded-lg text-sm text-right focus:outline-none focus:ring-2 focus:ring-indigo-500"
																	autoFocus
																	onKeyDown={(e) => {
																		if (e.key === "Enter") saveEdit();
																		if (e.key === "Escape") setEditingId(null);
																	}}
																/>
																<span className="text-xs text-gray-400">{item.bahan_baku?.satuan}</span>
																<button
																	onClick={saveEdit}
																	disabled={saving}
																	className="p-1 bg-green-500 hover:bg-green-600 text-white rounded-lg transition">
																	<Check size={13} />
																</button>
																<button
																	onClick={() => setEditingId(null)}
																	className="p-1 hover:bg-gray-100 rounded-lg text-gray-400">
																	<X size={13} />
																</button>
															</div>
														) : (
															<span className="font-semibold text-gray-900">
																{item.jumlah_standar % 1 === 0 ? item.jumlah_standar : Number(item.jumlah_standar).toFixed(3)}{" "}
																<span className="font-normal text-gray-400 text-xs">{item.bahan_baku?.satuan}</span>
															</span>
														)}
													</td>
													{isSuperAdmin && (
														<td className="px-4 py-3 text-right text-gray-500 text-xs">
															{item.bahan_baku?.harga_beli_terakhir
																? formatRupiah(item.jumlah_standar * item.bahan_baku.harga_beli_terakhir)
																: "—"}
														</td>
													)}
													<td className="px-2 py-3">
														<div className="flex items-center gap-1">
															<button
																onClick={() => startEdit(item)}
																className="p-1.5 hover:bg-indigo-50 rounded-lg text-indigo-500 transition">
																<Edit2 size={13} />
															</button>
															<button
																onClick={() => hapusBahan(item)}
																className="p-1.5 hover:bg-red-50 rounded-lg text-red-400 transition">
																<Trash2 size={13} />
															</button>
														</div>
													</td>
												</tr>
											))}
										</tbody>
									</table>
								</div>
							)}

							{/* Form tambah bahan */}
							<div className="border-t border-gray-100 pt-4">
								<p className="text-sm font-semibold text-gray-700 mb-2">Tambah Bahan ke BOM</p>

								{/* Search bahan */}
								{!addingBahan ? (
									<div ref={bahanRef} className="relative">
										<Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
										<input
											value={bahanSearch}
											onChange={(e) => handleBahanSearch(e.target.value)}
											onFocus={() => { setBahanDropdown(true); if (!bahanSearch) handleBahanSearch(""); }}
											placeholder="Cari bahan baku..."
											className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
										/>
										{bahanDropdown && bahanList.length > 0 && (
											<div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-20 max-h-44 overflow-y-auto">
												{bahanList
													.filter((b) => !bomItems.some((i) => i.bahan_baku_id === b.id))
													.map((b) => (
														<button
															key={b.id}
															onClick={() => pilihBahan(b)}
															className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-indigo-50 text-left transition">
															<div>
																<p className="text-sm font-medium text-gray-900">{b.nama}</p>
																<p className="text-xs text-gray-400">{b.satuan}</p>
															</div>
															{isSuperAdmin && b.harga_beli_terakhir > 0 && (
																<span className="text-xs text-gray-400 ml-2 flex-shrink-0">
																	{formatRupiah(b.harga_beli_terakhir)}/{b.satuan}
																</span>
															)}
														</button>
													))}
											</div>
										)}
									</div>
								) : (
									/* Form input jumlah setelah pilih bahan */
									<div className="bg-indigo-50 rounded-xl p-4 space-y-3">
										<div className="flex items-center justify-between">
											<p className="font-semibold text-indigo-800">{addingBahan.nama}</p>
											<button
												onClick={() => setAddingBahan(null)}
												className="text-indigo-400 hover:text-indigo-600">
												<X size={16} />
											</button>
										</div>
										<div className="grid grid-cols-2 gap-3">
											<div>
												<label className="block text-xs font-medium text-gray-600 mb-1">
													Jumlah Standar ({addingBahan.satuan}) *
												</label>
												<input
													type="number"
													step="0.001"
													min="0"
													value={addJumlah}
													onChange={(e) => setAddJumlah(e.target.value)}
													placeholder="0"
													autoFocus
													onKeyDown={(e) => { if (e.key === "Enter") saveTambahBahan(); }}
													className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
												/>
											</div>
											<div>
												<label className="block text-xs font-medium text-gray-600 mb-1">Catatan</label>
												<input
													value={addCatatan}
													onChange={(e) => setAddCatatan(e.target.value)}
													placeholder="Opsional"
													className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
												/>
											</div>
										</div>
										{isSuperAdmin && addJumlah && addingBahan.harga_beli_terakhir > 0 && (
											<p className="text-xs text-indigo-600">
												Est. biaya: <strong>{formatRupiah((parseFloat(addJumlah) || 0) * addingBahan.harga_beli_terakhir)}</strong>
											</p>
										)}
										<div className="flex gap-2">
											<button
												onClick={() => setAddingBahan(null)}
												className="flex-1 px-3 py-2 border border-gray-200 bg-white rounded-xl text-sm font-medium hover:bg-gray-50">
												Batal
											</button>
											<button
												onClick={saveTambahBahan}
												disabled={saving || !addJumlah}
												className="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white px-3 py-2 rounded-xl text-sm font-semibold transition">
												{saving ? "Menyimpan..." : "Tambahkan"}
											</button>
										</div>
									</div>
								)}
							</div>

							{formError && (
								<div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
									{formError}
								</div>
							)}
						</div>

						<div className="px-6 py-4 border-t border-gray-100 flex-shrink-0">
							<button
								onClick={() => setSelectedProduk(null)}
								className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium hover:bg-gray-50">
								Tutup
							</button>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}
