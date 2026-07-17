"use client";

import { useEffect, useState, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { formatRupiah, formatDate } from "@/lib/utils";
import {
	Plus, Search, X, Trash2, Eye,
	ShoppingBag, FileText, TrendingUp, ChevronDown,
} from "lucide-react";

interface Pembelian {
	id: string;
	nomor_pembelian: string;
	tanggal: string;
	supplier: string | null;
	total_nilai: number;
	catatan: string | null;
	created_at: string;
	items?: PembelianItem[];
}

interface PembelianItem {
	id: string;
	bahan_baku_id: string;
	jumlah: number;
	harga_satuan: number;
	subtotal: number;
	bahan_baku?: { nama: string; satuan: string };
}

interface BahanBaku {
	id: string;
	nama: string;
	satuan: string;
	harga_beli_terakhir: number;
	stok: number;
}

interface FormItem {
	bahan_baku_id: string;
	nama: string;
	satuan: string;
	jumlah: string;
	harga_satuan: string;
}

function generateNomorPembelian(): string {
	const now = new Date();
	const y = now.getFullYear();
	const m = String(now.getMonth() + 1).padStart(2, "0");
	const d = String(now.getDate()).padStart(2, "0");
	const suffix = String(Date.now()).slice(-4);
	return `PBB-${y}${m}${d}-${suffix}`;
}

const today = new Date().toISOString().split("T")[0];
const firstOfMonth = today.slice(0, 7) + "-01";

export default function PembelianPage() {
	const supabase = createClient();
	const { profile, isSuperAdmin } = useAuth();

	const [list, setList] = useState<Pembelian[]>([]);
	const [loading, setLoading] = useState(true);
	const [search, setSearch] = useState("");
	const [dari, setDari] = useState(firstOfMonth);
	const [sampai, setSampai] = useState(today);

	const [modal, setModal] = useState<"tambah" | "detail" | null>(null);
	const [selected, setSelected] = useState<Pembelian | null>(null);
	const [saving, setSaving] = useState(false);
	const [formError, setFormError] = useState("");

	// Form tambah
	const [formHeader, setFormHeader] = useState({
		nomor_pembelian: "",
		tanggal: today,
		supplier: "",
		catatan: "",
	});
	const [formItems, setFormItems] = useState<FormItem[]>([]);

	// Bahan baku search untuk tambah item
	const [bahanList, setBahanList] = useState<BahanBaku[]>([]);
	const [bahanSearch, setBahanSearch] = useState("");
	const [bahanDropdown, setBahanDropdown] = useState(false);
	const bahanRef = useRef<HTMLDivElement>(null);

	useEffect(() => { load(); }, [dari, sampai]);

	useEffect(() => {
		const handleClick = (e: MouseEvent) => {
			if (bahanRef.current && !bahanRef.current.contains(e.target as Node))
				setBahanDropdown(false);
		};
		document.addEventListener("mousedown", handleClick);
		return () => document.removeEventListener("mousedown", handleClick);
	}, []);

	const load = async () => {
		setLoading(true);
		const { data } = await supabase
			.from("pembelian_bahan_baku")
			.select("*, items:pembelian_bahan_baku_item(*, bahan_baku:bahan_baku(nama, satuan))")
			.gte("tanggal", dari)
			.lte("tanggal", sampai + "T23:59:59")
			.order("tanggal", { ascending: false });
		setList(data || []);
		setLoading(false);
	};

	const loadBahan = async (q: string) => {
		const { data } = await supabase
			.from("bahan_baku")
			.select("id, nama, satuan, harga_beli_terakhir, stok")
			.eq("aktif", true)
			.ilike("nama", `%${q}%`)
			.order("nama")
			.limit(20);
		setBahanList(data || []);
	};

	const filtered = list.filter((p) => {
		if (!search) return true;
		const s = search.toLowerCase();
		return (
			p.nomor_pembelian.toLowerCase().includes(s) ||
			(p.supplier || "").toLowerCase().includes(s)
		);
	});

	// Stats
	const totalNilai = filtered.reduce((s, p) => s + p.total_nilai, 0);
	const supplierUnik = new Set(filtered.map((p) => p.supplier).filter(Boolean)).size;

	// ── Open modal ────────────────────────────────────────────────────────────

	const openTambah = () => {
		setFormHeader({
			nomor_pembelian: generateNomorPembelian(),
			tanggal: today,
			supplier: "",
			catatan: "",
		});
		setFormItems([]);
		setBahanSearch("");
		setFormError("");
		setModal("tambah");
	};

	const openDetail = (p: Pembelian) => {
		setSelected(p);
		setModal("detail");
	};

	// ── Bahan baku search ─────────────────────────────────────────────────────

	const handleBahanSearch = (val: string) => {
		setBahanSearch(val);
		setBahanDropdown(true);
		loadBahan(val);
	};

	const pilihBahan = (b: BahanBaku) => {
		// Cek duplikat
		if (formItems.some((i) => i.bahan_baku_id === b.id)) {
			setFormError(`${b.nama} sudah ada di daftar.`);
			setBahanDropdown(false);
			setBahanSearch("");
			return;
		}
		setFormItems((prev) => [
			...prev,
			{
				bahan_baku_id: b.id,
				nama: b.nama,
				satuan: b.satuan,
				jumlah: "",
				harga_satuan: b.harga_beli_terakhir > 0 ? String(b.harga_beli_terakhir) : "",
			},
		]);
		setBahanSearch("");
		setBahanDropdown(false);
		setFormError("");
	};

	const hapusItem = (idx: number) => {
		setFormItems((prev) => prev.filter((_, i) => i !== idx));
	};

	const updateItem = (idx: number, field: "jumlah" | "harga_satuan", val: string) => {
		setFormItems((prev) =>
			prev.map((item, i) => (i === idx ? { ...item, [field]: val } : item))
		);
	};

	// ── Kalkulasi ─────────────────────────────────────────────────────────────

	const getSubtotal = (item: FormItem) => {
		const j = parseFloat(item.jumlah) || 0;
		const h = parseFloat(item.harga_satuan) || 0;
		return j * h;
	};

	const grandTotal = formItems.reduce((s, i) => s + getSubtotal(i), 0);

	// ── Save pembelian ────────────────────────────────────────────────────────

	const savePembelian = async () => {
		if (!formHeader.nomor_pembelian.trim()) {
			setFormError("Nomor pembelian wajib diisi.");
			return;
		}
		if (formItems.length === 0) {
			setFormError("Tambahkan minimal 1 bahan baku.");
			return;
		}
		const invalidItem = formItems.find(
			(i) => !parseFloat(i.jumlah) || parseFloat(i.jumlah) <= 0
		);
		if (invalidItem) {
			setFormError(`Jumlah untuk "${invalidItem.nama}" belum diisi.`);
			return;
		}

		setSaving(true);
		setFormError("");

		// 1. Insert header
		const { data: pbb, error: pbbErr } = await supabase
			.from("pembelian_bahan_baku")
			.insert({
				nomor_pembelian: formHeader.nomor_pembelian.trim(),
				tanggal: formHeader.tanggal,
				supplier: formHeader.supplier.trim() || null,
				total_nilai: grandTotal,
				catatan: formHeader.catatan.trim() || null,
				created_by: profile?.id,
			})
			.select()
			.single();

		if (pbbErr) {
			setFormError(
				pbbErr.code === "23505"
					? `Nomor pembelian "${formHeader.nomor_pembelian}" sudah digunakan.`
					: "Gagal menyimpan: " + pbbErr.message
			);
			setSaving(false);
			return;
		}

		// 2. Insert items + update stok + insert mutasi
		for (const item of formItems) {
			const jumlah = parseFloat(item.jumlah);
			const hargaSatuan = parseFloat(item.harga_satuan) || 0;
			const subtotal = jumlah * hargaSatuan;

			// Insert item
			await supabase.from("pembelian_bahan_baku_item").insert({
				pembelian_id: pbb.id,
				bahan_baku_id: item.bahan_baku_id,
				jumlah,
				harga_satuan: hargaSatuan,
				subtotal,
			});

			// Ambil stok sekarang
			const { data: bb } = await supabase
				.from("bahan_baku")
				.select("stok")
				.eq("id", item.bahan_baku_id)
				.single();

			const stokSebelum = bb?.stok ?? 0;
			const stokSesudah = stokSebelum + jumlah;

			// Update stok + harga_beli_terakhir
			const updateBahan: any = { stok: stokSesudah };
			if (hargaSatuan > 0) updateBahan.harga_beli_terakhir = hargaSatuan;
			await supabase.from("bahan_baku").update(updateBahan).eq("id", item.bahan_baku_id);

			// Insert mutasi
			await supabase.from("mutasi_bahan_baku").insert({
				bahan_baku_id: item.bahan_baku_id,
				tipe: "masuk",
				jumlah,
				stok_sebelum: stokSebelum,
				stok_sesudah: stokSesudah,
				harga_satuan: hargaSatuan,
				keterangan: `Pembelian ${formHeader.nomor_pembelian}${formHeader.supplier ? " dari " + formHeader.supplier : ""}`,
				referensi_id: pbb.id,
				referensi_tipe: "pembelian",
				created_by: profile?.id,
			});
		}

		setSaving(false);
		setModal(null);
		load();
	};

	// ── Hapus pembelian ───────────────────────────────────────────────────────

	const hapusPembelian = async (p: Pembelian) => {
		if (!confirm(`Hapus pembelian ${p.nomor_pembelian}?\n\nStok bahan baku akan DIKURANGI kembali sesuai jumlah pembelian ini.`)) return;

		// Balik stok tiap item
		const items = p.items || [];
		for (const item of items) {
			const { data: bb } = await supabase
				.from("bahan_baku")
				.select("stok")
				.eq("id", item.bahan_baku_id)
				.single();

			const stokSebelum = bb?.stok ?? 0;
			const stokSesudah = Math.max(0, stokSebelum - item.jumlah);

			await supabase.from("bahan_baku").update({ stok: stokSesudah }).eq("id", item.bahan_baku_id);
			await supabase.from("mutasi_bahan_baku").insert({
				bahan_baku_id: item.bahan_baku_id,
				tipe: "keluar",
				jumlah: item.jumlah,
				stok_sebelum: stokSebelum,
				stok_sesudah: stokSesudah,
				keterangan: `Hapus pembelian ${p.nomor_pembelian}`,
				referensi_id: p.id,
				referensi_tipe: "pembelian",
				created_by: profile?.id,
			});
		}

		await supabase.from("pembelian_bahan_baku").delete().eq("id", p.id);
		load();
	};

	// ─────────────────────────────────────────────────────────────────────────

	return (
		<div>
			{/* ── Header ── */}
			<div className="flex items-start justify-between gap-3 mb-6">
				<div>
					<h1 className="text-2xl font-bold text-gray-900">Pembelian Bahan Baku</h1>
					<p className="text-gray-500 mt-1">Riwayat pembelian & penambahan stok material</p>
				</div>
				<button
					onClick={openTambah}
					className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition flex-shrink-0">
					<Plus size={16} />
					<span className="hidden sm:inline">Tambah Pembelian</span>
					<span className="sm:hidden">Tambah</span>
				</button>
			</div>

			{/* ── Stat Cards ── */}
			<div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-6">
				<div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
					<p className="text-xs text-gray-500 mb-1">Total Transaksi</p>
					<p className="text-2xl font-bold text-indigo-600">{filtered.length}</p>
				</div>
				<div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
					<p className="text-xs text-gray-500 mb-1">Total Nilai</p>
					<p className="text-lg font-bold text-green-600">{formatRupiah(totalNilai)}</p>
				</div>
				<div className="col-span-2 sm:col-span-1 bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
					<p className="text-xs text-gray-500 mb-1">Supplier Aktif</p>
					<p className="text-2xl font-bold text-gray-700">{supplierUnik}</p>
				</div>
			</div>

			{/* ── Filter ── */}
			<div className="flex flex-wrap gap-3 mb-4">
				<div className="relative flex-1 min-w-[180px]">
					<Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
					<input
						value={search}
						onChange={(e) => setSearch(e.target.value)}
						placeholder="Cari nomor atau supplier..."
						className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
					/>
					{search && (
						<button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
							<X size={14} />
						</button>
					)}
				</div>
				<input
					type="date"
					value={dari}
					onChange={(e) => setDari(e.target.value)}
					className="px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
				/>
				<span className="self-center text-gray-400 text-sm">–</span>
				<input
					type="date"
					value={sampai}
					onChange={(e) => setSampai(e.target.value)}
					className="px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
				/>
			</div>

			{/* ── Tabel ── */}
			<div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
				<table className="w-full text-sm">
					<thead className="bg-gray-50 border-b border-gray-100">
						<tr>
							<th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">No. Pembelian</th>
							<th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Supplier</th>
							<th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Tanggal</th>
							<th className="text-center px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Item</th>
							{isSuperAdmin && (
								<th className="text-right px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Total Nilai</th>
							)}
							<th className="text-center px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Aksi</th>
						</tr>
					</thead>
					<tbody className="divide-y divide-gray-50">
						{loading ? (
							<tr><td colSpan={6} className="text-center py-12 text-gray-400">Memuat...</td></tr>
						) : filtered.length === 0 ? (
							<tr>
								<td colSpan={6} className="text-center py-12">
									<ShoppingBag size={32} className="mx-auto text-gray-200 mb-2" />
									<p className="text-gray-400">Belum ada pembelian pada periode ini</p>
								</td>
							</tr>
						) : (
							filtered.map((p) => (
								<tr key={p.id} className="hover:bg-gray-50 transition">
									<td className="px-5 py-3.5">
										<p className="font-mono text-sm font-semibold text-indigo-600">{p.nomor_pembelian}</p>
										{p.catatan && <p className="text-xs text-gray-400 truncate max-w-[160px]">{p.catatan}</p>}
									</td>
									<td className="px-5 py-3.5 text-gray-700">
										{p.supplier || <span className="text-gray-400">—</span>}
									</td>
									<td className="px-5 py-3.5 text-gray-500 text-xs whitespace-nowrap">
										{formatDate(p.tanggal)}
									</td>
									<td className="px-5 py-3.5 text-center">
										<span className="bg-indigo-50 text-indigo-600 text-xs font-semibold px-2.5 py-1 rounded-full">
											{(p.items || []).length} item
										</span>
									</td>
									{isSuperAdmin && (
										<td className="px-5 py-3.5 text-right font-semibold text-green-700">
											{formatRupiah(p.total_nilai)}
										</td>
									)}
									<td className="px-5 py-3.5">
										<div className="flex items-center justify-center gap-1">
											<button
												onClick={() => openDetail(p)}
												className="p-2 hover:bg-indigo-50 rounded-lg text-indigo-600 transition"
												title="Lihat Detail">
												<Eye size={15} />
											</button>
											{isSuperAdmin && (
												<button
													onClick={() => hapusPembelian(p)}
													className="p-2 hover:bg-red-50 rounded-lg text-red-500 transition"
													title="Hapus">
													<Trash2 size={15} />
												</button>
											)}
										</div>
									</td>
								</tr>
							))
						)}
					</tbody>
				</table>
			</div>

			{/* ══ MODAL TAMBAH ═════════════════════════════════════════════════════ */}
			{modal === "tambah" && (
				<div className="fixed inset-0 bg-black/40 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
					<div className="bg-white rounded-t-3xl sm:rounded-2xl w-full sm:max-w-2xl shadow-2xl max-h-[95vh] flex flex-col">
						<div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
							<div>
								<h2 className="text-lg font-semibold">Tambah Pembelian</h2>
								<p className="text-xs text-gray-400 font-mono">{formHeader.nomor_pembelian}</p>
							</div>
							<button onClick={() => setModal(null)} className="p-2 hover:bg-gray-100 rounded-xl">
								<X size={18} />
							</button>
						</div>

						<div className="overflow-y-auto flex-1 px-6 py-5 space-y-5">
							{/* Header form */}
							<div className="grid grid-cols-2 gap-4">
								<div>
									<label className="block text-sm font-medium text-gray-700 mb-1">Tanggal *</label>
									<input
										type="date"
										value={formHeader.tanggal}
										onChange={(e) => setFormHeader({ ...formHeader, tanggal: e.target.value })}
										className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
									/>
								</div>
								<div>
									<label className="block text-sm font-medium text-gray-700 mb-1">Supplier</label>
									<input
										value={formHeader.supplier}
										onChange={(e) => setFormHeader({ ...formHeader, supplier: e.target.value })}
										placeholder="Nama toko / supplier"
										className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
									/>
								</div>
								<div className="col-span-2">
									<label className="block text-sm font-medium text-gray-700 mb-1">Catatan</label>
									<input
										value={formHeader.catatan}
										onChange={(e) => setFormHeader({ ...formHeader, catatan: e.target.value })}
										placeholder="Keterangan tambahan (opsional)"
										className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
									/>
								</div>
							</div>

							{/* Cari & tambah bahan baku */}
							<div>
								<label className="block text-sm font-medium text-gray-700 mb-2">Tambah Bahan Baku</label>
								<div ref={bahanRef} className="relative">
									<Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
									<input
										value={bahanSearch}
										onChange={(e) => handleBahanSearch(e.target.value)}
										onFocus={() => { setBahanDropdown(true); if (!bahanSearch) loadBahan(""); }}
										placeholder="Ketik nama bahan baku..."
										className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
									/>
									{bahanDropdown && bahanList.length > 0 && (
										<div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-20 max-h-48 overflow-y-auto">
											{bahanList.map((b) => (
												<button
													key={b.id}
													onClick={() => pilihBahan(b)}
													className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-indigo-50 text-left transition">
													<div>
														<p className="text-sm font-medium text-gray-900">{b.nama}</p>
														<p className="text-xs text-gray-400">Stok: {b.stok} {b.satuan}</p>
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
							</div>

							{/* Tabel items */}
							{formItems.length > 0 && (
								<div className="border border-gray-200 rounded-xl overflow-hidden">
									<table className="w-full text-sm">
										<thead className="bg-gray-50">
											<tr>
												<th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500">Bahan Baku</th>
												<th className="text-right px-4 py-2.5 text-xs font-semibold text-gray-500">Jumlah</th>
												{isSuperAdmin && (
													<th className="text-right px-4 py-2.5 text-xs font-semibold text-gray-500">Harga/Satuan</th>
												)}
												{isSuperAdmin && (
													<th className="text-right px-4 py-2.5 text-xs font-semibold text-gray-500">Subtotal</th>
												)}
												<th className="px-2 py-2.5" />
											</tr>
										</thead>
										<tbody className="divide-y divide-gray-100">
											{formItems.map((item, idx) => (
												<tr key={idx} className="bg-white">
													<td className="px-4 py-2.5">
														<p className="font-medium text-gray-900 text-sm">{item.nama}</p>
														<p className="text-xs text-gray-400">{item.satuan}</p>
													</td>
													<td className="px-4 py-2.5">
														<input
															type="number"
															step="0.001"
															min="0"
															value={item.jumlah}
															onChange={(e) => updateItem(idx, "jumlah", e.target.value)}
															placeholder="0"
															className="w-24 px-2.5 py-1.5 border border-gray-200 rounded-lg text-sm text-right focus:outline-none focus:ring-2 focus:ring-indigo-500 ml-auto block"
														/>
													</td>
													{isSuperAdmin && (
														<td className="px-4 py-2.5">
															<input
																type="number"
																min="0"
																value={item.harga_satuan}
																onChange={(e) => updateItem(idx, "harga_satuan", e.target.value)}
																placeholder="0"
																className="w-28 px-2.5 py-1.5 border border-gray-200 rounded-lg text-sm text-right focus:outline-none focus:ring-2 focus:ring-indigo-500 ml-auto block"
															/>
														</td>
													)}
													{isSuperAdmin && (
														<td className="px-4 py-2.5 text-right text-green-700 font-semibold whitespace-nowrap">
															{formatRupiah(getSubtotal(item))}
														</td>
													)}
													<td className="px-2 py-2.5">
														<button
															onClick={() => hapusItem(idx)}
															className="p-1.5 hover:bg-red-50 rounded-lg text-red-400 transition">
															<X size={14} />
														</button>
													</td>
												</tr>
											))}
										</tbody>
										{isSuperAdmin && (
											<tfoot className="bg-gray-50 border-t border-gray-100">
												<tr>
													<td colSpan={3} className="px-4 py-2.5 text-sm font-semibold text-gray-700 text-right">Total</td>
													<td className="px-4 py-2.5 text-right font-bold text-green-700">{formatRupiah(grandTotal)}</td>
													<td />
												</tr>
											</tfoot>
										)}
									</table>
								</div>
							)}

							{formItems.length === 0 && (
								<div className="text-center py-6 text-gray-400 text-sm border-2 border-dashed border-gray-200 rounded-xl">
									Belum ada bahan baku ditambahkan
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
								onClick={() => setModal(null)}
								className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium hover:bg-gray-50">
								Batal
							</button>
							<button
								onClick={savePembelian}
								disabled={saving || formItems.length === 0}
								className="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition">
								{saving ? "Menyimpan..." : "Simpan Pembelian"}
							</button>
						</div>
					</div>
				</div>
			)}

			{/* ══ MODAL DETAIL ═════════════════════════════════════════════════════ */}
			{modal === "detail" && selected && (
				<div className="fixed inset-0 bg-black/40 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
					<div className="bg-white rounded-t-3xl sm:rounded-2xl w-full sm:max-w-lg shadow-2xl max-h-[90vh] flex flex-col">
						<div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
							<div>
								<h2 className="text-lg font-semibold">Detail Pembelian</h2>
								<p className="text-xs font-mono text-indigo-600 mt-0.5">{selected.nomor_pembelian}</p>
							</div>
							<button onClick={() => setModal(null)} className="p-2 hover:bg-gray-100 rounded-xl">
								<X size={18} />
							</button>
						</div>

						<div className="overflow-y-auto flex-1 px-6 py-5 space-y-4">
							{/* Info header */}
							<div className="grid grid-cols-2 gap-3 text-sm">
								<div className="bg-gray-50 rounded-xl px-4 py-3">
									<p className="text-xs text-gray-400 mb-0.5">Tanggal</p>
									<p className="font-semibold text-gray-900">{formatDate(selected.tanggal)}</p>
								</div>
								<div className="bg-gray-50 rounded-xl px-4 py-3">
									<p className="text-xs text-gray-400 mb-0.5">Supplier</p>
									<p className="font-semibold text-gray-900">{selected.supplier || "—"}</p>
								</div>
								{selected.catatan && (
									<div className="col-span-2 bg-yellow-50 rounded-xl px-4 py-3">
										<p className="text-xs text-yellow-600 mb-0.5">Catatan</p>
										<p className="text-sm text-gray-800">{selected.catatan}</p>
									</div>
								)}
							</div>

							{/* Tabel item */}
							<div className="border border-gray-200 rounded-xl overflow-hidden">
								<table className="w-full text-sm">
									<thead className="bg-gray-50">
										<tr>
											<th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500">Bahan Baku</th>
											<th className="text-right px-4 py-2.5 text-xs font-semibold text-gray-500">Jumlah</th>
											{isSuperAdmin && (
												<th className="text-right px-4 py-2.5 text-xs font-semibold text-gray-500">Harga</th>
											)}
											{isSuperAdmin && (
												<th className="text-right px-4 py-2.5 text-xs font-semibold text-gray-500">Subtotal</th>
											)}
										</tr>
									</thead>
									<tbody className="divide-y divide-gray-100">
										{(selected.items || []).map((item) => (
											<tr key={item.id} className="hover:bg-gray-50">
												<td className="px-4 py-3">
													<p className="font-medium text-gray-900">{item.bahan_baku?.nama || "—"}</p>
												</td>
												<td className="px-4 py-3 text-right font-semibold text-gray-900">
													{item.jumlah % 1 === 0 ? item.jumlah : Number(item.jumlah).toFixed(3)}{" "}
													<span className="font-normal text-gray-500 text-xs">{item.bahan_baku?.satuan}</span>
												</td>
												{isSuperAdmin && (
													<td className="px-4 py-3 text-right text-gray-500 text-xs">
														{item.harga_satuan > 0 ? formatRupiah(item.harga_satuan) : "—"}
													</td>
												)}
												{isSuperAdmin && (
													<td className="px-4 py-3 text-right font-semibold text-green-700">
														{item.subtotal > 0 ? formatRupiah(item.subtotal) : "—"}
													</td>
												)}
											</tr>
										))}
									</tbody>
									{isSuperAdmin && selected.total_nilai > 0 && (
										<tfoot className="bg-gray-50 border-t border-gray-200">
											<tr>
												<td colSpan={3} className="px-4 py-2.5 text-sm font-semibold text-right text-gray-700">Total Nilai</td>
												<td className="px-4 py-2.5 text-right font-bold text-green-700">{formatRupiah(selected.total_nilai)}</td>
											</tr>
										</tfoot>
									)}
								</table>
							</div>
						</div>

						<div className="px-6 py-4 border-t border-gray-100 flex-shrink-0">
							<button
								onClick={() => setModal(null)}
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
