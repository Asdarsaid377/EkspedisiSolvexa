"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { formatRupiah, formatDate } from "@/lib/utils";
import {
	Plus, X, Search, ChevronLeft, CheckCircle2,
	AlertCircle, Clock, XCircle, Package,
	Factory, TrendingUp, TrendingDown, Minus,
	Loader2, Check,
} from "lucide-react";

// ── Types ──────────────────────────────────────────────────────────────────

interface Batch {
	id: string;
	nomor_batch: string;
	produk_id: string | null;
	nama_produk: string;
	target_unit: number;
	unit_selesai: number;
	status: "draft" | "proses" | "selesai" | "batal";
	tanggal_mulai: string | null;
	tanggal_selesai: string | null;
	upah_borongan: number;
	catatan_upah: string | null;
	hpp_standar_per_unit: number | null;
	hpp_aktual_per_unit: number | null;
	total_biaya_bahan: number;
	total_biaya_upah: number;
	total_hpp: number;
	catatan: string | null;
	created_at: string;
}

interface Pemakaian {
	id: string;
	batch_id: string;
	bahan_baku_id: string | null;
	nama_bahan: string;
	satuan: string;
	jumlah_standar: number;
	jumlah_aktual: number;
	harga_satuan: number;
	subtotal: number;
	selisih: number | null;
}

interface ProdukWithBOM {
	id: string;
	nama: string;
	satuan: string;
	bom_count: number;
}

// ── Helpers ────────────────────────────────────────────────────────────────

function generateNomorBatch(): string {
	const now = new Date();
	const y = now.getFullYear();
	const m = String(now.getMonth() + 1).padStart(2, "0");
	const d = String(now.getDate()).padStart(2, "0");
	return `BATCH-${y}${m}${d}-${String(Date.now()).slice(-4)}`;
}

const STATUS_CFG = {
	draft:   { label: "Draft",   color: "bg-gray-100 text-gray-600",   dot: "bg-gray-400",   icon: Clock },
	proses:  { label: "Proses",  color: "bg-blue-100 text-blue-700",   dot: "bg-blue-500",   icon: Factory },
	selesai: { label: "Selesai", color: "bg-green-100 text-green-700", dot: "bg-green-500",  icon: CheckCircle2 },
	batal:   { label: "Batal",   color: "bg-red-100 text-red-600",     dot: "bg-red-400",    icon: XCircle },
};

// ── Component ──────────────────────────────────────────────────────────────

export default function BatchPage() {
	const supabase = createClient();
	const { profile, isSuperAdmin } = useAuth();

	const [list, setList] = useState<Batch[]>([]);
	const [loading, setLoading] = useState(true);
	const [search, setSearch] = useState("");
	const [filterStatus, setFilterStatus] = useState<string>("semua");

	// Detail panel
	const [selectedBatch, setSelectedBatch] = useState<Batch | null>(null);
	const [pemakaian, setPemakaian] = useState<Pemakaian[]>([]);
	const [loadingDetail, setLoadingDetail] = useState(false);

	// Edit pemakaian (local state sebelum disimpan)
	const [edited, setEdited] = useState<Record<string, { jumlah_aktual: string; harga_satuan: string }>>({});
	const [savingPemakaian, setSavingPemakaian] = useState(false);

	// Upah borongan edit
	const [upahInput, setUpahInput] = useState("");
	const [upahCatatanInput, setUpahCatatanInput] = useState("");
	const [editingUpah, setEditingUpah] = useState(false);
	const [savingUpah, setSavingUpah] = useState(false);

	// Modal buat batch
	const [modalBuat, setModalBuat] = useState(false);
	const [produkList, setProdukList] = useState<ProdukWithBOM[]>([]);
	const [produkSearch, setProdukSearch] = useState("");
	const [formProduk, setFormProduk] = useState<ProdukWithBOM | null>(null);
	const [formTarget, setFormTarget] = useState("");
	const [formCatatan, setFormCatatan] = useState("");
	const [saving, setSaving] = useState(false);
	const [formError, setFormError] = useState("");

	// Modal selesaikan
	const [modalSelesai, setModalSelesai] = useState(false);
	const [unitSelesaiInput, setUnitSelesaiInput] = useState("");
	const [selesaiError, setSelesaiError] = useState("");
	const [selesaiSaving, setSelesaiSaving] = useState(false);

	useEffect(() => { load(); }, []);

	const load = async () => {
		setLoading(true);
		const { data } = await supabase
			.from("batch_produksi")
			.select("*")
			.order("created_at", { ascending: false });
		setList(data || []);
		setLoading(false);
	};

	const loadDetail = async (batch: Batch) => {
		setLoadingDetail(true);
		setSelectedBatch(batch);
		setEdited({});
		setEditingUpah(false);
		setUpahInput(String(batch.upah_borongan || ""));
		setUpahCatatanInput(batch.catatan_upah || "");
		const { data } = await supabase
			.from("batch_pemakaian_bahan")
			.select("*")
			.eq("batch_id", batch.id)
			.order("created_at");
		setPemakaian(data || []);
		setLoadingDetail(false);
	};

	// ── Muat produk yang ada BOM untuk modal buat ─────────────────────────────

	const loadProdukBOM = async () => {
		const { data: produk } = await supabase
			.from("produk")
			.select("id, nama, satuan")
			.eq("aktif", true)
			.order("nama");
		const { data: bomCounts } = await supabase
			.from("bom")
			.select("produk_id");
		const countMap: Record<string, number> = {};
		(bomCounts || []).forEach((b: any) => {
			countMap[b.produk_id] = (countMap[b.produk_id] || 0) + 1;
		});
		setProdukList(
			(produk || [])
				.map((p: any) => ({ ...p, bom_count: countMap[p.id] || 0 }))
				.filter((p: any) => p.bom_count > 0)
		);
	};

	const openBuat = () => {
		setFormProduk(null);
		setFormTarget("");
		setFormCatatan("");
		setProdukSearch("");
		setFormError("");
		setModalBuat(true);
		loadProdukBOM();
	};

	// ── Buat batch baru ───────────────────────────────────────────────────────

	const saveBuat = async () => {
		if (!formProduk) { setFormError("Pilih produk terlebih dahulu."); return; }
		const target = parseInt(formTarget);
		if (!target || target <= 0) { setFormError("Target unit harus lebih dari 0."); return; }

		setSaving(true);
		setFormError("");

		// Ambil BOM produk
		const { data: bomData } = await supabase
			.from("bom")
			.select("*, bahan_baku:bahan_baku(nama, satuan, harga_beli_terakhir)")
			.eq("produk_id", formProduk.id);

		if (!bomData || bomData.length === 0) {
			setFormError("Produk ini belum memiliki BOM.");
			setSaving(false);
			return;
		}

		// Hitung HPP standar
		const hppStandar = bomData.reduce(
			(s: number, b: any) => s + (b.jumlah_standar * target * (b.bahan_baku?.harga_beli_terakhir || 0)),
			0
		);
		const hppStandarPerUnit = hppStandar / target;

		// Insert batch
		const { data: batch, error: batchErr } = await supabase
			.from("batch_produksi")
			.insert({
				nomor_batch: generateNomorBatch(),
				produk_id: formProduk.id,
				nama_produk: formProduk.nama,
				target_unit: target,
				unit_selesai: 0,
				status: "proses",
				tanggal_mulai: new Date().toISOString().split("T")[0],
				hpp_standar_per_unit: hppStandarPerUnit,
				total_biaya_bahan: 0,
				total_biaya_upah: 0,
				total_hpp: 0,
				catatan: formCatatan.trim() || null,
				created_by: profile?.id,
			})
			.select()
			.single();

		if (batchErr) {
			setFormError("Gagal membuat batch: " + batchErr.message);
			setSaving(false);
			return;
		}

		// Insert pemakaian dari BOM × target
		const pemakaianRows = bomData.map((b: any) => ({
			batch_id: batch.id,
			bahan_baku_id: b.bahan_baku_id,
			nama_bahan: b.bahan_baku?.nama || "—",
			satuan: b.bahan_baku?.satuan || "",
			jumlah_standar: b.jumlah_standar * target,
			jumlah_aktual: b.jumlah_standar * target, // pre-fill sama dengan standar
			harga_satuan: b.bahan_baku?.harga_beli_terakhir || 0,
			subtotal: (b.jumlah_standar * target) * (b.bahan_baku?.harga_beli_terakhir || 0),
			selisih: 0,
		}));

		await supabase.from("batch_pemakaian_bahan").insert(pemakaianRows);

		// Update total_biaya_bahan
		const totalBahan = pemakaianRows.reduce((s: number, r: any) => s + r.subtotal, 0);
		await supabase
			.from("batch_produksi")
			.update({ total_biaya_bahan: totalBahan, total_hpp: totalBahan })
			.eq("id", batch.id);

		setSaving(false);
		setModalBuat(false);
		await load();
		// Buka detail langsung
		const { data: batchFresh } = await supabase
			.from("batch_produksi")
			.select("*")
			.eq("id", batch.id)
			.single();
		if (batchFresh) loadDetail(batchFresh);
	};

	// ── Edit pemakaian ────────────────────────────────────────────────────────

	const getEditVal = (id: string, field: "jumlah_aktual" | "harga_satuan", fallback: number) =>
		edited[id]?.[field] ?? String(fallback);

	const setEditVal = (id: string, field: "jumlah_aktual" | "harga_satuan", val: string) =>
		setEdited((prev) => ({
			...prev,
			[id]: { jumlah_aktual: getEditVal(id, "jumlah_aktual", 0), harga_satuan: getEditVal(id, "harga_satuan", 0), [field]: val },
		}));

	const savePemakaian = async () => {
		if (!selectedBatch) return;
		setSavingPemakaian(true);

		for (const p of pemakaian) {
			const jumlahAktual = parseFloat(getEditVal(p.id, "jumlah_aktual", p.jumlah_aktual)) || 0;
			const hargaSatuan  = parseFloat(getEditVal(p.id, "harga_satuan",  p.harga_satuan))  || 0;
			const subtotal = jumlahAktual * hargaSatuan;
			const selisih  = jumlahAktual - p.jumlah_standar;

			await supabase.from("batch_pemakaian_bahan").update({
				jumlah_aktual: jumlahAktual,
				harga_satuan:  hargaSatuan,
				subtotal,
				selisih,
			}).eq("id", p.id);
		}

		// Recalculate total biaya bahan
		const { data: fresh } = await supabase
			.from("batch_pemakaian_bahan")
			.select("subtotal")
			.eq("batch_id", selectedBatch.id);
		const totalBahan = (fresh || []).reduce((s, r) => s + r.subtotal, 0);
		const totalHpp   = totalBahan + selectedBatch.upah_borongan;

		await supabase.from("batch_produksi").update({
			total_biaya_bahan: totalBahan,
			total_hpp: totalHpp,
		}).eq("id", selectedBatch.id);

		setEdited({});
		setSavingPemakaian(false);

		// Reload
		const { data: batchFresh } = await supabase
			.from("batch_produksi").select("*").eq("id", selectedBatch.id).single();
		if (batchFresh) { setSelectedBatch(batchFresh); }
		const { data: pm } = await supabase
			.from("batch_pemakaian_bahan").select("*").eq("batch_id", selectedBatch.id).order("created_at");
		setPemakaian(pm || []);
		load();
	};

	// ── Simpan upah borongan ──────────────────────────────────────────────────

	const saveUpah = async () => {
		if (!selectedBatch) return;
		setSavingUpah(true);
		const upah = parseFloat(upahInput) || 0;
		const totalHpp = selectedBatch.total_biaya_bahan + upah;
		await supabase.from("batch_produksi").update({
			upah_borongan: upah,
			total_biaya_upah: upah,
			total_hpp: totalHpp,
			catatan_upah: upahCatatanInput.trim() || null,
		}).eq("id", selectedBatch.id);
		const { data: batchFresh } = await supabase
			.from("batch_produksi").select("*").eq("id", selectedBatch.id).single();
		if (batchFresh) setSelectedBatch(batchFresh);
		setEditingUpah(false);
		setSavingUpah(false);
		load();
	};

	// ── Selesaikan batch ──────────────────────────────────────────────────────

	const selesaikanBatch = async () => {
		if (!selectedBatch) return;
		const unit = parseInt(unitSelesaiInput);
		if (!unit || unit <= 0) { setSelesaiError("Jumlah unit selesai harus lebih dari 0."); return; }
		if (unit > selectedBatch.target_unit) { setSelesaiError(`Maksimal ${selectedBatch.target_unit} unit (target).`); return; }

		setSelesaiSaving(true);
		setSelesaiError("");

		// Kurangi stok bahan baku
		for (const p of pemakaian) {
			if (!p.bahan_baku_id) continue;
			const { data: bb } = await supabase
				.from("bahan_baku").select("stok").eq("id", p.bahan_baku_id).single();
			const stokSebelum = bb?.stok ?? 0;
			const stokSesudah = Math.max(0, stokSebelum - p.jumlah_aktual);

			await supabase.from("bahan_baku").update({ stok: stokSesudah }).eq("id", p.bahan_baku_id);
			await supabase.from("mutasi_bahan_baku").insert({
				bahan_baku_id: p.bahan_baku_id,
				tipe: "keluar",
				jumlah: p.jumlah_aktual,
				stok_sebelum: stokSebelum,
				stok_sesudah: stokSesudah,
				harga_satuan: p.harga_satuan,
				keterangan: `Produksi ${selectedBatch.nomor_batch} — ${selectedBatch.nama_produk}`,
				referensi_id: selectedBatch.id,
				referensi_tipe: "produksi",
				created_by: profile?.id,
			});
		}

		const totalHpp = selectedBatch.total_biaya_bahan + selectedBatch.upah_borongan;
		const hppAktualPerUnit = unit > 0 ? totalHpp / unit : 0;

		await supabase.from("batch_produksi").update({
			status: "selesai",
			unit_selesai: unit,
			tanggal_selesai: new Date().toISOString().split("T")[0],
			total_hpp: totalHpp,
			hpp_aktual_per_unit: hppAktualPerUnit,
		}).eq("id", selectedBatch.id);

		const { data: batchFresh } = await supabase
			.from("batch_produksi").select("*").eq("id", selectedBatch.id).single();
		if (batchFresh) setSelectedBatch(batchFresh);

		setSelesaiSaving(false);
		setModalSelesai(false);
		setUnitSelesaiInput("");
		load();
	};

	// ── Batalkan batch ────────────────────────────────────────────────────────

	const batalkanBatch = async () => {
		if (!selectedBatch) return;
		if (!confirm("Batalkan batch ini? Stok bahan baku tidak akan dikurangi.")) return;
		await supabase.from("batch_produksi")
			.update({ status: "batal" })
			.eq("id", selectedBatch.id);
		const { data: batchFresh } = await supabase
			.from("batch_produksi").select("*").eq("id", selectedBatch.id).single();
		if (batchFresh) setSelectedBatch(batchFresh);
		load();
	};

	// ── Computed values ───────────────────────────────────────────────────────

	const totalBiayaBahanPreview = pemakaian.reduce((s, p) => {
		const j = parseFloat(getEditVal(p.id, "jumlah_aktual", p.jumlah_aktual)) || p.jumlah_aktual;
		const h = parseFloat(getEditVal(p.id, "harga_satuan",  p.harga_satuan))  || p.harga_satuan;
		return s + j * h;
	}, 0);

	const hasEdits = Object.keys(edited).length > 0;

	const filteredList = list.filter((b) => {
		if (filterStatus !== "semua" && b.status !== filterStatus) return false;
		if (search) {
			const s = search.toLowerCase();
			return b.nomor_batch.toLowerCase().includes(s) || b.nama_produk.toLowerCase().includes(s);
		}
		return true;
	});

	const inProses  = list.filter((b) => b.status === "proses").length;
	const selesaiBulan = list.filter((b) => {
		if (b.status !== "selesai") return false;
		const bulan = new Date().toISOString().slice(0, 7);
		return (b.tanggal_selesai || "").startsWith(bulan);
	}).length;

	// ─────────────────────────────────────────────────────────────────────────

	if (selectedBatch) {
		const cfg = STATUS_CFG[selectedBatch.status];
		const isProses  = selectedBatch.status === "proses";
		const isSelesai = selectedBatch.status === "selesai";
		const variance  = selectedBatch.hpp_aktual_per_unit != null && selectedBatch.hpp_standar_per_unit != null
			? selectedBatch.hpp_aktual_per_unit - selectedBatch.hpp_standar_per_unit
			: null;

		return (
			<div>
				{/* ── Back + Header ── */}
				<div className="flex items-center gap-3 mb-6">
					<button
						onClick={() => setSelectedBatch(null)}
						className="p-2 hover:bg-gray-100 rounded-xl text-gray-500 transition">
						<ChevronLeft size={20} />
					</button>
					<div className="flex-1">
						<div className="flex items-center gap-3">
							<h1 className="text-xl font-bold text-gray-900">{selectedBatch.nomor_batch}</h1>
							<span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${cfg.color}`}>
								<span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
								{cfg.label}
							</span>
						</div>
						<p className="text-gray-500 text-sm mt-0.5">{selectedBatch.nama_produk} · Target {selectedBatch.target_unit} unit</p>
					</div>
					{isProses && (
						<div className="flex gap-2">
							<button
								onClick={batalkanBatch}
								className="px-3 py-2 border border-red-200 text-red-500 hover:bg-red-50 rounded-xl text-sm font-medium transition">
								Batalkan
							</button>
							<button
								onClick={() => { setUnitSelesaiInput(String(selectedBatch.target_unit)); setSelesaiError(""); setModalSelesai(true); }}
								className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-xl text-sm font-semibold transition">
								<CheckCircle2 size={15} />
								Selesaikan
							</button>
						</div>
					)}
				</div>

				<div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
					{/* ── Kolom kiri: Pemakaian Bahan ── */}
					<div className="lg:col-span-2 space-y-4">
						<div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
							<div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
								<h2 className="font-semibold text-gray-800">Pemakaian Bahan Baku</h2>
								{isProses && hasEdits && (
									<button
										onClick={savePemakaian}
										disabled={savingPemakaian}
										className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white rounded-lg text-xs font-semibold transition">
										{savingPemakaian ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
										Simpan Perubahan
									</button>
								)}
							</div>

							{loadingDetail ? (
								<div className="text-center py-10 text-gray-400">
									<Loader2 size={24} className="animate-spin mx-auto mb-2" />
								</div>
							) : pemakaian.length === 0 ? (
								<div className="text-center py-10 text-gray-400">Tidak ada data pemakaian</div>
							) : (
								<div className="overflow-x-auto">
									<table className="w-full text-sm">
										<thead className="bg-gray-50 border-b border-gray-100">
											<tr>
												<th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Bahan Baku</th>
												<th className="text-right px-4 py-3 text-xs font-semibold text-gray-500">Standar</th>
												<th className="text-right px-4 py-3 text-xs font-semibold text-gray-500">Aktual</th>
												{isSuperAdmin && (
													<th className="text-right px-4 py-3 text-xs font-semibold text-gray-500">Harga/Sat</th>
												)}
												{isSuperAdmin && (
													<th className="text-right px-4 py-3 text-xs font-semibold text-gray-500">Subtotal</th>
												)}
												<th className="text-right px-4 py-3 text-xs font-semibold text-gray-500">Selisih</th>
											</tr>
										</thead>
										<tbody className="divide-y divide-gray-50">
											{pemakaian.map((p) => {
												const aktualVal  = parseFloat(getEditVal(p.id, "jumlah_aktual", p.jumlah_aktual)) || p.jumlah_aktual;
												const hargaVal   = parseFloat(getEditVal(p.id, "harga_satuan",  p.harga_satuan))  || p.harga_satuan;
												const subtotalPrev = aktualVal * hargaVal;
												const selisih    = aktualVal - p.jumlah_standar;
												const boros      = selisih > 0.001;
												const hemat      = selisih < -0.001;

												return (
													<tr key={p.id} className="hover:bg-gray-50">
														<td className="px-4 py-3">
															<p className="font-medium text-gray-900">{p.nama_bahan}</p>
															<p className="text-xs text-gray-400">{p.satuan}</p>
														</td>
														<td className="px-4 py-3 text-right text-gray-500 text-xs">
															{p.jumlah_standar % 1 === 0 ? p.jumlah_standar : p.jumlah_standar.toFixed(3)}
														</td>
														<td className="px-4 py-3 text-right">
															{isProses ? (
																<input
																	type="number"
																	step="0.001"
																	min="0"
																	value={getEditVal(p.id, "jumlah_aktual", p.jumlah_aktual)}
																	onChange={(e) => setEditVal(p.id, "jumlah_aktual", e.target.value)}
																	className="w-24 px-2 py-1 border border-gray-200 rounded-lg text-sm text-right focus:outline-none focus:ring-2 focus:ring-indigo-500"
																/>
															) : (
																<span className="font-semibold text-gray-900">
																	{p.jumlah_aktual % 1 === 0 ? p.jumlah_aktual : Number(p.jumlah_aktual).toFixed(3)}
																</span>
															)}
														</td>
														{isSuperAdmin && (
															<td className="px-4 py-3 text-right">
																{isProses ? (
																	<input
																		type="number"
																		min="0"
																		value={getEditVal(p.id, "harga_satuan", p.harga_satuan)}
																		onChange={(e) => setEditVal(p.id, "harga_satuan", e.target.value)}
																		className="w-28 px-2 py-1 border border-gray-200 rounded-lg text-sm text-right focus:outline-none focus:ring-2 focus:ring-indigo-500"
																	/>
																) : (
																	<span className="text-gray-500 text-xs">
																		{p.harga_satuan > 0 ? formatRupiah(p.harga_satuan) : "—"}
																	</span>
																)}
															</td>
														)}
														{isSuperAdmin && (
															<td className="px-4 py-3 text-right text-green-700 font-semibold text-xs">
																{subtotalPrev > 0 ? formatRupiah(subtotalPrev) : "—"}
															</td>
														)}
														<td className="px-4 py-3 text-right">
															{Math.abs(selisih) < 0.001 ? (
																<span className="text-gray-300 text-xs flex items-center justify-end gap-1"><Minus size={12} />0</span>
															) : boros ? (
																<span className="text-red-600 text-xs font-semibold flex items-center justify-end gap-1">
																	<TrendingUp size={12} />+{selisih % 1 === 0 ? selisih : selisih.toFixed(3)}
																</span>
															) : (
																<span className="text-green-600 text-xs font-semibold flex items-center justify-end gap-1">
																	<TrendingDown size={12} />{selisih % 1 === 0 ? selisih : selisih.toFixed(3)}
																</span>
															)}
														</td>
													</tr>
												);
											})}
										</tbody>
										{isSuperAdmin && (
											<tfoot className="bg-gray-50 border-t border-gray-200">
												<tr>
													<td colSpan={isSuperAdmin ? 4 : 2} className="px-4 py-2.5 text-xs font-semibold text-right text-gray-600">
														Total Biaya Bahan
													</td>
													<td className="px-4 py-2.5 text-right font-bold text-green-700">
														{formatRupiah(totalBiayaBahanPreview)}
													</td>
													<td />
												</tr>
											</tfoot>
										)}
									</table>
								</div>
							)}
						</div>
					</div>

					{/* ── Kolom kanan: HPP Summary ── */}
					<div className="space-y-4">
						{/* Info batch */}
						<div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 space-y-3 text-sm">
							<h2 className="font-semibold text-gray-800 mb-1">Info Batch</h2>
							<div className="flex justify-between">
								<span className="text-gray-500">Mulai</span>
								<span className="font-medium">{selectedBatch.tanggal_mulai ? formatDate(selectedBatch.tanggal_mulai) : "—"}</span>
							</div>
							{isSelesai && (
								<div className="flex justify-between">
									<span className="text-gray-500">Selesai</span>
									<span className="font-medium">{selectedBatch.tanggal_selesai ? formatDate(selectedBatch.tanggal_selesai) : "—"}</span>
								</div>
							)}
							<div className="flex justify-between">
								<span className="text-gray-500">Target</span>
								<span className="font-medium">{selectedBatch.target_unit} unit</span>
							</div>
							{isSelesai && (
								<div className="flex justify-between">
									<span className="text-gray-500">Unit Selesai</span>
									<span className="font-bold text-green-700">{selectedBatch.unit_selesai} unit</span>
								</div>
							)}
						</div>

						{/* Upah borongan */}
						<div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
							<div className="flex items-center justify-between mb-3">
								<h2 className="font-semibold text-gray-800 text-sm">Upah Borongan</h2>
								{isProses && !editingUpah && (
									<button
										onClick={() => setEditingUpah(true)}
										className="text-xs text-indigo-600 hover:underline">
										Edit
									</button>
								)}
							</div>
							{editingUpah ? (
								<div className="space-y-2">
									<input
										type="number"
										min="0"
										value={upahInput}
										onChange={(e) => setUpahInput(e.target.value)}
										placeholder="0"
										className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
									/>
									<input
										value={upahCatatanInput}
										onChange={(e) => setUpahCatatanInput(e.target.value)}
										placeholder="Catatan upah (opsional)"
										className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
									/>
									<div className="flex gap-2">
										<button onClick={() => setEditingUpah(false)}
											className="flex-1 px-3 py-1.5 border border-gray-200 rounded-lg text-xs font-medium hover:bg-gray-50">
											Batal
										</button>
										<button onClick={saveUpah} disabled={savingUpah}
											className="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white px-3 py-1.5 rounded-lg text-xs font-semibold">
											{savingUpah ? "..." : "Simpan"}
										</button>
									</div>
								</div>
							) : (
								<div>
									<p className="text-xl font-bold text-gray-900">
										{formatRupiah(selectedBatch.upah_borongan)}
									</p>
									{selectedBatch.catatan_upah && (
										<p className="text-xs text-gray-400 mt-1">{selectedBatch.catatan_upah}</p>
									)}
								</div>
							)}
						</div>

						{/* HPP Summary — superadmin only */}
						{isSuperAdmin && (
							<div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 space-y-3 text-sm">
								<h2 className="font-semibold text-gray-800 mb-1">Ringkasan HPP</h2>
								<div className="flex justify-between">
									<span className="text-gray-500">Biaya Bahan</span>
									<span className="font-medium">{formatRupiah(selectedBatch.total_biaya_bahan)}</span>
								</div>
								<div className="flex justify-between">
									<span className="text-gray-500">Upah Borongan</span>
									<span className="font-medium">{formatRupiah(selectedBatch.upah_borongan)}</span>
								</div>
								<div className="flex justify-between border-t border-gray-100 pt-3">
									<span className="font-semibold text-gray-700">Total HPP</span>
									<span className="font-bold text-gray-900">{formatRupiah(selectedBatch.total_hpp)}</span>
								</div>
								{selectedBatch.hpp_standar_per_unit != null && (
									<div className="flex justify-between">
										<span className="text-gray-500">HPP Standar/unit</span>
										<span className="font-medium">{formatRupiah(selectedBatch.hpp_standar_per_unit)}</span>
									</div>
								)}
								{selectedBatch.hpp_aktual_per_unit != null && (
									<div className="flex justify-between">
										<span className="text-gray-500">HPP Aktual/unit</span>
										<span className="font-bold text-indigo-700">{formatRupiah(selectedBatch.hpp_aktual_per_unit)}</span>
									</div>
								)}
								{variance != null && (
									<div className={`flex justify-between rounded-xl px-3 py-2 ${variance > 0 ? "bg-red-50" : "bg-green-50"}`}>
										<span className={`font-semibold text-xs ${variance > 0 ? "text-red-600" : "text-green-600"}`}>
											Variance/unit
										</span>
										<span className={`font-bold text-sm ${variance > 0 ? "text-red-700" : "text-green-700"}`}>
											{variance > 0 ? "+" : ""}{formatRupiah(variance)}
											<span className="text-xs ml-1">{variance > 0 ? "boros" : "hemat"}</span>
										</span>
									</div>
								)}
							</div>
						)}
					</div>
				</div>

				{/* ── Modal Selesaikan ── */}
				{modalSelesai && (
					<div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
						<div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl">
							<div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
								<h2 className="text-base font-semibold">Selesaikan Batch</h2>
								<button onClick={() => setModalSelesai(false)} className="p-2 hover:bg-gray-100 rounded-xl">
									<X size={16} />
								</button>
							</div>
							<div className="px-6 py-5 space-y-4">
								<div className="bg-amber-50 rounded-xl px-4 py-3 text-sm text-amber-700">
									Stok bahan baku akan <strong>dikurangi</strong> sesuai jumlah aktual pemakaian. Aksi ini tidak dapat dibatalkan.
								</div>
								<div>
									<label className="block text-sm font-medium text-gray-700 mb-1">
										Unit yang berhasil diproduksi *
									</label>
									<input
										type="number"
										min="1"
										max={selectedBatch.target_unit}
										value={unitSelesaiInput}
										onChange={(e) => { setUnitSelesaiInput(e.target.value); setSelesaiError(""); }}
										placeholder={`Maks. ${selectedBatch.target_unit}`}
										className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
										autoFocus
									/>
									<p className="text-xs text-gray-400 mt-1">Target: {selectedBatch.target_unit} unit</p>
								</div>
								{selesaiError && (
									<p className="text-red-600 text-sm">{selesaiError}</p>
								)}
							</div>
							<div className="flex gap-3 px-6 py-4 border-t border-gray-100">
								<button
									onClick={() => setModalSelesai(false)}
									className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium hover:bg-gray-50">
									Batal
								</button>
								<button
									onClick={selesaikanBatch}
									disabled={selesaiSaving}
									className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-green-300 text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition">
									{selesaiSaving ? <><Loader2 size={14} className="animate-spin inline mr-1" />Memproses...</> : "Selesaikan"}
								</button>
							</div>
						</div>
					</div>
				)}
			</div>
		);
	}

	// ── LIST VIEW ─────────────────────────────────────────────────────────────

	return (
		<div>
			<div className="flex items-start justify-between gap-3 mb-6">
				<div>
					<h1 className="text-2xl font-bold text-gray-900">Batch Produksi</h1>
					<p className="text-gray-500 mt-1">Kelola proses produksi dan hitung HPP aktual</p>
				</div>
				<button
					onClick={openBuat}
					className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition flex-shrink-0">
					<Plus size={16} />
					<span className="hidden sm:inline">Buat Batch</span>
					<span className="sm:hidden">Buat</span>
				</button>
			</div>

			{/* Stat Cards */}
			<div className="grid grid-cols-3 gap-4 mb-6">
				<div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
					<p className="text-xs text-gray-500 mb-1">Sedang Proses</p>
					<p className="text-2xl font-bold text-blue-600">{inProses}</p>
				</div>
				<div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
					<p className="text-xs text-gray-500 mb-1">Selesai Bulan Ini</p>
					<p className="text-2xl font-bold text-green-600">{selesaiBulan}</p>
				</div>
				<div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
					<p className="text-xs text-gray-500 mb-1">Total Batch</p>
					<p className="text-2xl font-bold text-gray-700">{list.length}</p>
				</div>
			</div>

			{/* Filter */}
			<div className="flex flex-wrap gap-3 mb-4">
				<div className="relative flex-1 min-w-[180px]">
					<Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
					<input
						value={search}
						onChange={(e) => setSearch(e.target.value)}
						placeholder="Cari nomor batch atau produk..."
						className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
					/>
					{search && (
						<button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
							<X size={14} />
						</button>
					)}
				</div>
				<div className="flex gap-2">
					{["semua", "proses", "selesai", "batal"].map((s) => (
						<button
							key={s}
							onClick={() => setFilterStatus(s)}
							className={`px-3 py-2 rounded-xl text-xs font-semibold capitalize transition border ${
								filterStatus === s
									? "bg-indigo-600 text-white border-indigo-600"
									: "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
							}`}>
							{s === "semua" ? "Semua" : STATUS_CFG[s as keyof typeof STATUS_CFG]?.label}
						</button>
					))}
				</div>
			</div>

			{/* Tabel */}
			<div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
				<table className="w-full text-sm">
					<thead className="bg-gray-50 border-b border-gray-100">
						<tr>
							<th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Batch</th>
							<th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Produk</th>
							<th className="text-center px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Target</th>
							<th className="text-center px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
							{isSuperAdmin && (
								<th className="text-right px-5 py-3 text-xs font-semibold text-gray-500 uppercase">HPP/unit</th>
							)}
							<th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Mulai</th>
							<th className="text-center px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Aksi</th>
						</tr>
					</thead>
					<tbody className="divide-y divide-gray-50">
						{loading ? (
							<tr><td colSpan={7} className="text-center py-12 text-gray-400">Memuat...</td></tr>
						) : filteredList.length === 0 ? (
							<tr>
								<td colSpan={7} className="text-center py-12">
									<Factory size={32} className="mx-auto text-gray-200 mb-2" />
									<p className="text-gray-400">Belum ada batch produksi</p>
								</td>
							</tr>
						) : (
							filteredList.map((b) => {
								const cfg = STATUS_CFG[b.status];
								return (
									<tr key={b.id} className="hover:bg-gray-50 transition">
										<td className="px-5 py-3.5">
											<p className="font-mono text-xs font-semibold text-indigo-600">{b.nomor_batch}</p>
											<p className="text-xs text-gray-400">{formatDate(b.created_at)}</p>
										</td>
										<td className="px-5 py-3.5 font-medium text-gray-900">{b.nama_produk}</td>
										<td className="px-5 py-3.5 text-center text-gray-700">
											{b.status === "selesai" ? (
												<span>{b.unit_selesai}<span className="text-gray-400">/{b.target_unit}</span></span>
											) : (
												<span>{b.target_unit} unit</span>
											)}
										</td>
										<td className="px-5 py-3.5 text-center">
											<span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${cfg.color}`}>
												<span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
												{cfg.label}
											</span>
										</td>
										{isSuperAdmin && (
											<td className="px-5 py-3.5 text-right text-gray-700 font-medium">
												{b.hpp_aktual_per_unit != null
													? formatRupiah(b.hpp_aktual_per_unit)
													: b.hpp_standar_per_unit != null
													? <span className="text-gray-400 text-xs">~{formatRupiah(b.hpp_standar_per_unit)}</span>
													: "—"}
											</td>
										)}
										<td className="px-5 py-3.5 text-gray-400 text-xs">
											{b.tanggal_mulai ? formatDate(b.tanggal_mulai) : "—"}
										</td>
										<td className="px-5 py-3.5 text-center">
											<button
												onClick={() => loadDetail(b)}
												className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-lg text-xs font-semibold transition">
												Detail
											</button>
										</td>
									</tr>
								);
							})
						)}
					</tbody>
				</table>
			</div>

			{/* ── Modal Buat Batch ── */}
			{modalBuat && (
				<div className="fixed inset-0 bg-black/40 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
					<div className="bg-white rounded-t-3xl sm:rounded-2xl w-full sm:max-w-md shadow-2xl max-h-[90vh] flex flex-col">
						<div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
							<h2 className="text-lg font-semibold">Buat Batch Produksi</h2>
							<button onClick={() => setModalBuat(false)} className="p-2 hover:bg-gray-100 rounded-xl">
								<X size={18} />
							</button>
						</div>
						<div className="overflow-y-auto flex-1 px-6 py-5 space-y-4">
							{/* Pilih produk */}
							<div>
								<label className="block text-sm font-medium text-gray-700 mb-2">Produk *</label>
								<input
									value={produkSearch}
									onChange={(e) => setProdukSearch(e.target.value)}
									placeholder="Cari produk..."
									className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 mb-2"
								/>
								<div className="border border-gray-200 rounded-xl overflow-hidden max-h-40 overflow-y-auto">
									{produkList
										.filter((p) => p.nama.toLowerCase().includes(produkSearch.toLowerCase()))
										.map((p) => (
											<button
												key={p.id}
												onClick={() => setFormProduk(p)}
												className={`w-full flex items-center justify-between px-4 py-2.5 text-left text-sm transition border-b border-gray-50 last:border-0 ${
													formProduk?.id === p.id
														? "bg-indigo-50 text-indigo-700"
														: "hover:bg-gray-50 text-gray-800"
												}`}>
												<span className="font-medium">{p.nama}</span>
												{formProduk?.id === p.id && <Check size={14} className="text-indigo-600" />}
											</button>
										))}
									{produkList.length === 0 && (
										<p className="text-center py-4 text-gray-400 text-xs">
											Tidak ada produk dengan BOM. Buat BOM dulu di menu Bill of Materials.
										</p>
									)}
								</div>
							</div>

							{/* Target unit */}
							<div>
								<label className="block text-sm font-medium text-gray-700 mb-1">Target Produksi (unit) *</label>
								<input
									type="number"
									min="1"
									value={formTarget}
									onChange={(e) => setFormTarget(e.target.value)}
									placeholder="Misal: 5"
									className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
								/>
							</div>

							{/* Catatan */}
							<div>
								<label className="block text-sm font-medium text-gray-700 mb-1">Catatan</label>
								<input
									value={formCatatan}
									onChange={(e) => setFormCatatan(e.target.value)}
									placeholder="Keterangan batch (opsional)"
									className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
								/>
							</div>

							{formProduk && (
								<div className="bg-indigo-50 rounded-xl px-4 py-3 text-xs text-indigo-600">
									<p className="font-semibold">{formProduk.nama}</p>
									<p className="mt-0.5 text-indigo-400">{formProduk.bom_count} bahan baku terdaftar di BOM</p>
								</div>
							)}

							{formError && (
								<div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
									{formError}
								</div>
							)}
						</div>
						<div className="flex gap-3 px-6 py-4 border-t border-gray-100 flex-shrink-0">
							<button
								onClick={() => setModalBuat(false)}
								className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium hover:bg-gray-50">
								Batal
							</button>
							<button
								onClick={saveBuat}
								disabled={saving || !formProduk || !formTarget}
								className="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition">
								{saving ? <><Loader2 size={14} className="animate-spin inline mr-1" />Membuat...</> : "Buat Batch"}
							</button>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}
