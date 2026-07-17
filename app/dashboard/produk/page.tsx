"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Produk } from "@/lib/types";
import { formatRupiah, formatDate, exportToExcel } from "@/lib/utils";
import { imgUrl } from "@/lib/image";
import {
	Plus,
	Search,
	Edit,
	Trash2,
	TrendingUp,
	TrendingDown,
	Package,
	X,
	History,
	RefreshCw,
	MoreVertical,
	Printer,
	CheckSquare,
	Upload,
	ImageIcon,
} from "lucide-react";
import {
	AlertTriangle,
	List,
	LayoutGrid,
	QrCode,
	CheckCircle,
	FileSpreadsheet,
} from "lucide-react";
import { QRCodeCanvas } from "qrcode.react";

type ModalType = "tambah" | "edit" | "stok" | "mutasi" | null;

export default function ProdukPage() {
	const { isSuperAdmin } = useAuth();
	const supabase = createClient();
	const [produk, setProduk] = useState<Produk[]>([]);
	const [loading, setLoading] = useState(true);
	const [search, setSearch] = useState("");
	const [modal, setModal] = useState<ModalType>(null);
	const [selected, setSelected] = useState<Produk | null>(null);
	const [mutasiList, setMutasiList] = useState<any[]>([]);
	const [form, setForm] = useState({
		nama: "",
		kategori: "",
		satuan: "unit",
		harga_modal: "",
		harga_katalog: "",
		stok: "",
		stok_minimum: "0",
		deskripsi: "",
	});
	const [stokForm, setStokForm] = useState({
		tipe: "masuk",
		jumlah: "",
		keterangan: "",
	});
	const [saving, setSaving] = useState(false);
	const [formError, setFormError] = useState("");
	const [viewMode, setViewMode] = useState<"table" | "grid">("table");
	const [filterMenipis, setFilterMenipis] = useState(false);
	const [filterReady, setFilterReady] = useState(false);
	const [filterKategori, setFilterKategori] = useState("");
	const [rekalkulasi, setRekalkulasi] = useState(false);
	const [qrProduct, setQrProduct] = useState<{
		id: string;
		nama: string;
		harga_katalog: number;
	} | null>(null);
	const qrContainerRef = useRef<HTMLDivElement>(null);
	const [actionMenu, setActionMenu] = useState<string | null>(null);
	const [menuPos, setMenuPos] = useState<{ top: number; right: number } | null>(
		null,
	);
	const [selectMode, setSelectMode] = useState(false);
	const [selectedQR, setSelectedQR] = useState<Set<string>>(new Set());
	const qrPrintRef = useRef<HTMLDivElement>(null);

	const FOTO_BUCKET = "BungaNaik";
	const [fotoFiles, setFotoFiles] = useState<File[]>([]);
	const [existingFotos, setExistingFotos] = useState<
		{ id: string; url: string; urutan: number }[]
	>([]);
	const [produkFotos, setProdukFotos] = useState<Record<string, string>>({});

	const jalankanRekalkulasi = async () => {
		if (
			!confirm(
				"Rekalkuasi laba semua penjualan berdasarkan harga modal terbaru?",
			)
		)
			return;
		setRekalkulasi(true);
		const { data, error } = await supabase.rpc("rekalkulasi_laba");
		console.log("rekalkulasi result:", data, error);
		if (error) alert("Error: " + error.message);
		else alert("Rekalkulasi selesai!");
		setRekalkulasi(false);
	};

	useEffect(() => {
		loadProduk();
	}, []);

	const loadProduk = async () => {
		const [produkRes, fotoRes] = await Promise.all([
			supabase.from("produk").select("*").eq("aktif", true).order("nama"),
			supabase.from("produk_foto").select("produk_id, url").order("urutan"),
		]);
		setProduk(produkRes.data || []);
		const fotoMap: Record<string, string> = {};
		for (const f of fotoRes.data || []) {
			if (!fotoMap[f.produk_id]) fotoMap[f.produk_id] = f.url;
		}
		setProdukFotos(fotoMap);
		setLoading(false);
	};

	const openTambah = () => {
		setForm({
			nama: "",
			kategori: "",
			satuan: "unit",
			harga_modal: "",
			harga_katalog: "",
			stok: "",
			stok_minimum: "0",
			deskripsi: "",
		});
		setFormError("");
		setSelected(null);
		setFotoFiles([]);
		setExistingFotos([]);
		setModal("tambah");
	};

	const openEdit = async (p: Produk) => {
		setForm({
			nama: p.nama,
			kategori: p.kategori || "",
			satuan: p.satuan,
			harga_modal: String(p.harga_modal),
			harga_katalog: String(p.harga_katalog),
			stok: String(p.stok),
			stok_minimum: String(p.stok_minimum),
			deskripsi: p.deskripsi || "",
		});
		setFormError("");
		setSelected(p);
		setFotoFiles([]);
		const { data: fotos } = await supabase
			.from("produk_foto")
			.select("id, url, urutan")
			.eq("produk_id", p.id)
			.order("urutan");
		setExistingFotos(fotos || []);
		setModal("edit");
	};

	const openStok = (p: Produk) => {
		setSelected(p);
		setStokForm({ tipe: "masuk", jumlah: "", keterangan: "" });
		setModal("stok");
	};

	const openMutasi = async (p: Produk) => {
		setSelected(p);
		const { data } = await supabase
			.from("mutasi_stok")
			.select("*, profiles(name)")
			.eq("produk_id", p.id)
			.order("created_at", { ascending: false })
			.limit(20);
		setMutasiList(data || []);
		setModal("mutasi");
	};

	const uploadFotos = async (produkId: string): Promise<string | null> => {
		if (fotoFiles.length === 0) return null;
		const { data: existing } = await supabase
			.from("produk_foto")
			.select("urutan")
			.eq("produk_id", produkId)
			.order("urutan", { ascending: false })
			.limit(1);
		let nextUrutan = (existing?.[0]?.urutan ?? -1) + 1;
		for (const file of fotoFiles) {
			const ext = file.name.split(".").pop();
			const path = `${produkId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
			const { error: uploadError } = await supabase.storage
				.from(FOTO_BUCKET)
				.upload(path, file, { cacheControl: "31536000" });
			if (uploadError) return uploadError.message;
			const { data: urlData } = supabase.storage
				.from(FOTO_BUCKET)
				.getPublicUrl(path);
			await supabase.from("produk_foto").insert({
				produk_id: produkId,
				url: urlData.publicUrl,
				urutan: nextUrutan++,
			});
		}
		setFotoFiles([]);
		return null;
	};

	const deleteFoto = async (fotoId: string, url: string) => {
		const marker = `/storage/v1/object/public/${FOTO_BUCKET}/`;
		const path = url.includes(marker) ? url.split(marker)[1] : null;
		if (path) await supabase.storage.from(FOTO_BUCKET).remove([path]);
		await supabase.from("produk_foto").delete().eq("id", fotoId);
		setExistingFotos((prev) => prev.filter((f) => f.id !== fotoId));
	};

	const saveProduk = async () => {
		setSaving(true);

		// Kasir tidak bisa update harga_modal
		const payload = isSuperAdmin
			? {
					nama: form.nama,
					kategori: form.kategori,
					satuan: form.satuan,
					harga_modal: Number(form.harga_modal),
					harga_katalog: Number(form.harga_katalog),
					stok_minimum: Number(form.stok_minimum),
					deskripsi: form.deskripsi,
				}
			: {
					nama: form.nama,
					kategori: form.kategori,
					satuan: form.satuan,
					harga_katalog: Number(form.harga_katalog),
					stok_minimum: Number(form.stok_minimum),
					deskripsi: form.deskripsi,
				};

		if (modal === "tambah") {
			const { data, error } = await supabase
				.from("produk")
				.insert({
					...payload,
					harga_modal: isSuperAdmin ? Number(form.harga_modal) : 0,
					stok: Number(form.stok),
				})
				.select()
				.single();

			if (error) {
				if (error.code === "23505") {
					setFormError(
						`Produk "${form.nama}" sudah ada. Gunakan nama yang berbeda.`,
					);
				} else {
					setFormError("Gagal menyimpan: " + error.message);
				}
				setSaving(false);
				return;
			}

			if (data && Number(form.stok) > 0) {
				await supabase.from("mutasi_stok").insert({
					produk_id: data.id,
					tipe: "masuk",
					jumlah: Number(form.stok),
					stok_sebelum: 0,
					stok_sesudah: Number(form.stok),
					keterangan: "Stok awal",
				});
			}
			if (data) {
				const uploadErr = await uploadFotos(data.id);
				if (uploadErr) {
					setFormError(
						"Produk tersimpan, tapi upload foto gagal: " + uploadErr,
					);
					setSaving(false);
					loadProduk();
					return;
				}
			}
		} else if (selected) {
			const { error } = await supabase
				.from("produk")
				.update(payload)
				.eq("id", selected.id);
			if (error) {
				if (error.code === "23505") {
					alert(`Nama "${form.nama}" sudah digunakan produk lain.`);
				} else {
					alert("Gagal menyimpan: " + error.message);
				}
				setSaving(false);
				return;
			}
			const uploadErr = await uploadFotos(selected.id);
			if (uploadErr) {
				setFormError("Produk tersimpan, tapi upload foto gagal: " + uploadErr);
				setSaving(false);
				loadProduk();
				return;
			}
		}

		setSaving(false);
		setModal(null);
		loadProduk();
	};

	const saveStok = async () => {
		if (!selected) return;
		setSaving(true);
		const jumlah = Number(stokForm.jumlah);
		const stokSebelum = selected.stok;
		const stokSesudah =
			stokForm.tipe === "masuk"
				? stokSebelum + jumlah
				: stokForm.tipe === "keluar"
					? stokSebelum - jumlah
					: jumlah;

		await supabase
			.from("produk")
			.update({ stok: stokSesudah })
			.eq("id", selected.id);
		await supabase.from("mutasi_stok").insert({
			produk_id: selected.id,
			tipe: stokForm.tipe,
			jumlah:
				stokForm.tipe === "koreksi"
					? Math.abs(stokSesudah - stokSebelum)
					: jumlah,
			stok_sebelum: stokSebelum,
			stok_sesudah: stokSesudah,
			keterangan: stokForm.keterangan,
		});

		setSaving(false);
		setModal(null);
		loadProduk();
	};

	const hapusProduk = async (id: string) => {
		if (!confirm("Yakin hapus produk ini?")) return;
		await supabase.from("produk").update({ aktif: false }).eq("id", id);
		loadProduk();
	};

	const toggleSelectQR = (id: string) => {
		setSelectedQR((prev) => {
			const next = new Set(prev);
			if (next.has(id)) next.delete(id);
			else next.add(id);
			return next;
		});
	};

	const exitSelectMode = () => {
		setSelectMode(false);
		setSelectedQR(new Set());
	};

	const handleCetakQR = () => {
		const selectedProducts = produk.filter((p) => selectedQR.has(p.id));
		const container = qrPrintRef.current;
		if (!container || selectedProducts.length === 0) return;

		const items = selectedProducts.map((p) => {
			const wrapper = container.querySelector(`[data-qr-id="${p.id}"]`);
			const canvas = wrapper?.querySelector(
				"canvas",
			) as HTMLCanvasElement | null;
			return { ...p, imgSrc: canvas ? canvas.toDataURL("image/png") : "" };
		});

		const gridHTML = items
			.map(
				(p) => `<div class="label">
				${p.imgSrc ? `<img src="${p.imgSrc}" width="160" height="160" />` : ""}
				<p class="nama">${p.nama}</p>
			</div>`,
			)
			.join("");

		const w = window.open("", "_blank");
		if (!w) return;
		w.document.write(`<!DOCTYPE html><html><head>
			<title>Cetak QR — BungaNaik</title>
			<style>
				*{box-sizing:border-box;margin:0;padding:0}
				body{font-family:Arial,sans-serif;padding:12px;background:#fff}
				h2{font-size:13px;color:#6b7280;margin-bottom:12px}
				.grid{display:grid;grid-template-columns:repeat(4,1fr);gap:10px}
				.label{border:1px solid #e5e7eb;border-radius:8px;padding:12px;text-align:center;page-break-inside:avoid;break-inside:avoid}
				.label img{display:block;margin:0 auto}
				.nama{font-size:11px;font-weight:700;margin-top:8px;line-height:1.3;color:#111827}
				.harga{font-size:11px;color:#4f46e5;margin-top:3px}
				@media print{body{padding:0}h2{display:none}.grid{gap:6px}}
			</style>
		</head><body>
			<h2>BungaNaik — ${items.length} QR Code</h2>
			<div class="grid">${gridHTML}</div>
			<script>window.onload=function(){window.print();setTimeout(function(){window.close()},800)}</script>
		</body></html>`);
		w.document.close();
	};

	const kategoriList = Array.from(
		new Set(produk.map((p) => p.kategori).filter(Boolean)),
	);

	const filtered = produk
		.filter(
			(p) =>
				p.nama.toLowerCase().includes(search.toLowerCase()) ||
				(p.kategori || "").toLowerCase().includes(search.toLowerCase()),
		)
		.filter((p) => (filterReady ? p.stok > 0 : true))
		.filter((p) => (filterMenipis ? p.stok <= p.stok_minimum : true))
		.filter((p) => (filterKategori ? p.kategori === filterKategori : true));

	const handleExportExcel = () => {
		const rows = filtered.map((p) => {
			const row: Record<string, any> = {
				Nama: p.nama,
				Kategori: p.kategori || "-",
				Satuan: p.satuan,
				Stok: p.stok,
				"Stok Minimum": p.stok_minimum,
				"Harga Katalog": p.harga_katalog,
				"Rekomendasi Harga Jual (+25%)": Math.ceil(p.harga_katalog * 1.25),
			};
			if (isSuperAdmin) {
				row["Harga Modal"] = p.harga_modal;
				row["Keuntungan / Unit"] = p.harga_katalog - p.harga_modal;
			}
			row["Status"] = p.stok <= p.stok_minimum ? "Menipis" : "Aman";
			return row;
		});
		exportToExcel(`Produk_${new Date().toISOString().slice(0, 10)}`, "Produk", rows);
	};

	return (
		<div>
			{/* ── Header ── */}
			<div className="flex items-start justify-between gap-3 mb-3">
				<div>
					<h1 className="text-2xl font-bold text-gray-900">Produk & Stok</h1>
					<p className="text-gray-500 mt-1">{produk.length} produk aktif</p>
				</div>
				<button
					onClick={openTambah}
					className="flex-shrink-0 flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition">
					<Plus size={16} />
					<span className="hidden sm:inline">Tambah Produk</span>
					<span className="sm:hidden">Tambah</span>
				</button>
			</div>

			{/* ── Aksi sekunder ── */}
			<div className="flex flex-wrap gap-2 mb-4">
				<button
					onClick={handleExportExcel}
					disabled={filtered.length === 0}
					className="flex items-center gap-1.5 border border-gray-200 text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed px-3 py-2 rounded-xl text-sm font-medium transition">
					<FileSpreadsheet size={15} className="text-green-600" /> Export Excel
				</button>
				<button
					onClick={() => {
						setSelectMode(true);
						setSelectedQR(new Set());
					}}
					className="flex items-center gap-1.5 border border-purple-200 text-purple-600 hover:bg-purple-50 px-3 py-2 rounded-xl text-sm font-medium transition">
					<Printer size={15} /> Cetak QR
				</button>
				{isSuperAdmin && (
					<button
						onClick={jalankanRekalkulasi}
						disabled={rekalkulasi}
						className="flex items-center gap-1.5 bg-green-600 hover:bg-green-700 disabled:bg-green-300 text-white px-3 py-2 rounded-xl text-sm font-medium transition">
						<RefreshCw
							size={15}
							className={rekalkulasi ? "animate-spin" : ""}
						/>
						<span className="hidden sm:inline">
							{rekalkulasi ? "Memproses..." : "Rekalkuasi Laba"}
						</span>
						<span className="sm:hidden">
							{rekalkulasi ? "..." : "Rekalkuasi"}
						</span>
					</button>
				)}
			</div>

			{/* ── Search ── */}
			<div className="relative mb-3">
				<Search
					size={16}
					className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
				/>
				<input
					value={search}
					onChange={(e) => setSearch(e.target.value)}
					placeholder="Cari produk atau kategori..."
					className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
				/>
			</div>

			{/* ── Filter pills (scroll horizontal di mobile) ── */}
			<div className="flex items-center gap-2 overflow-x-auto pb-2 mb-6">
				<select
					value={filterKategori}
					onChange={(e) => setFilterKategori(e.target.value)}
					className="flex-shrink-0 px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white">
					<option value="">Semua Kategori</option>
					{kategoriList.map((k) => (
						<option key={k} value={k!}>
							{k}
						</option>
					))}
				</select>

				<button
					onClick={() => setFilterReady(!filterReady)}
					className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition border ${
						filterReady
							? "bg-green-500 text-white border-green-500"
							: "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
					}`}>
					<CheckCircle size={14} />
					Ready
				</button>

				<button
					onClick={() => setFilterMenipis(!filterMenipis)}
					className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition border ${
						filterMenipis
							? "bg-red-500 text-white border-red-500"
							: "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
					}`}>
					<AlertTriangle size={14} />
					Stok Menipis
				</button>

				<div className="flex-shrink-0 flex rounded-xl border border-gray-200 overflow-hidden">
					<button
						onClick={() => setViewMode("table")}
						className={`px-3 py-2 transition ${viewMode === "table" ? "bg-indigo-600 text-white" : "bg-white text-gray-600 hover:bg-gray-50"}`}>
						<List size={15} />
					</button>
					<button
						onClick={() => setViewMode("grid")}
						className={`px-3 py-2 transition ${viewMode === "grid" ? "bg-indigo-600 text-white" : "bg-white text-gray-600 hover:bg-gray-50"}`}>
						<LayoutGrid size={15} />
					</button>
				</div>
			</div>

			{viewMode === "table" ? (
				<div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
					<table className="w-full text-sm">
						<thead className="bg-gray-50 border-b border-gray-100">
							<tr>
								{selectMode && (
									<th className="px-4 py-3 w-10">
										<input
											type="checkbox"
											checked={
												filtered.length > 0 &&
												filtered.every((p) => selectedQR.has(p.id))
											}
											onChange={(e) => {
												if (e.target.checked)
													setSelectedQR(new Set(filtered.map((p) => p.id)));
												else setSelectedQR(new Set());
											}}
											className="w-4 h-4 rounded accent-purple-600 cursor-pointer"
										/>
									</th>
								)}
								<th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">
									Produk
								</th>
								<th className="text-right px-6 py-3 text-xs font-semibold text-gray-500 uppercase">
									Stok
								</th>
								{isSuperAdmin && (
									<th className="text-right px-6 py-3 text-xs font-semibold text-gray-500 uppercase">
										Modal
									</th>
								)}
								<th className="text-right px-6 py-3 text-xs font-semibold text-gray-500 uppercase">
									Katalog
								</th>
								<th className="text-right px-6 py-3 text-xs font-semibold text-orange-500 uppercase">
									Rek. Jual +25%
								</th>
								{isSuperAdmin && (
									<th className="text-right px-6 py-3 text-xs font-semibold text-gray-500 uppercase">
										Keuntungan/Unit
									</th>
								)}
								<th className="text-center px-6 py-3 text-xs font-semibold text-gray-500 uppercase">
									Aksi
								</th>
							</tr>
						</thead>
						<tbody className="divide-y divide-gray-50">
							{loading ? (
								<tr>
									<td colSpan={6} className="text-center py-12 text-gray-400">
										Memuat...
									</td>
								</tr>
							) : filtered.length === 0 ? (
								<tr>
									<td colSpan={6} className="text-center py-12 text-gray-400">
										Tidak ada produk
									</td>
								</tr>
							) : (
								filtered.map((p) => (
									<tr
										key={p.id}
										className={`hover:bg-gray-50 transition ${selectMode && selectedQR.has(p.id) ? "bg-purple-50" : ""}`}>
										{selectMode && (
											<td className="px-4 py-4">
												<input
													type="checkbox"
													checked={selectedQR.has(p.id)}
													onChange={() => toggleSelectQR(p.id)}
													className="w-4 h-4 rounded accent-purple-600 cursor-pointer"
												/>
											</td>
										)}
										<td
											className="px-6 py-4"
											onClick={
												selectMode ? () => toggleSelectQR(p.id) : undefined
											}
											style={selectMode ? { cursor: "pointer" } : undefined}>
											<Link
												href={`/dashboard/produk/${p.id}`}
												onClick={(e) => {
													if (selectMode) e.preventDefault();
												}}
												className="flex items-center gap-3 group">
												{produkFotos[p.id] ? (
													<img
														src={imgUrl(produkFotos[p.id], 100)}
														alt=""
														loading="lazy"
														className="w-9 h-9 object-cover rounded-lg border border-gray-200 flex-shrink-0"
													/>
												) : (
													<div className="w-9 h-9 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
														<ImageIcon size={14} className="text-gray-400" />
													</div>
												)}
												<div>
													<p className="font-medium text-gray-900 group-hover:text-indigo-600 transition">
														{p.nama}
													</p>
													<p className="text-xs text-gray-500">
														{p.kategori || "-"} · {p.satuan}
													</p>
												</div>
											</Link>
										</td>
										<td className="px-6 py-4 text-right">
											<span
												className={`font-semibold ${p.stok <= p.stok_minimum ? "text-red-600" : "text-gray-900"}`}>
												{p.stok}
											</span>
											{p.stok <= p.stok_minimum && (
												<p className="text-xs text-red-500">Menipis!</p>
											)}
										</td>
										{isSuperAdmin && (
											<td className="px-6 py-4 text-right text-gray-600">
												{formatRupiah(p.harga_modal)}
											</td>
										)}
										<td className="px-6 py-4 text-right font-medium text-gray-900">
											{formatRupiah(p.harga_katalog)}
										</td>
										<td className="px-6 py-4 text-right">
											<span className="font-semibold text-orange-600">
												{formatRupiah(Math.ceil(p.harga_katalog * 1.25))}
											</span>
										</td>
										{isSuperAdmin && (
											<td className="px-6 py-4 text-right">
												<span className="text-green-600 font-medium">
													{formatRupiah(p.harga_katalog - p.harga_modal)}
												</span>
											</td>
										)}
										<td className="px-6 py-4">
											<div className="flex justify-center">
												<button
													onClick={(e) => {
														if (actionMenu === p.id) {
															setActionMenu(null);
														} else {
															const rect = (
																e.currentTarget as HTMLElement
															).getBoundingClientRect();
															setMenuPos({
																top: rect.bottom + 4,
																right: window.innerWidth - rect.right,
															});
															setActionMenu(p.id);
														}
													}}
													className="p-2 hover:bg-gray-100 rounded-lg text-gray-500 transition">
													<MoreVertical size={16} />
												</button>
												{actionMenu === p.id && (
													<>
														<div
															className="fixed inset-0 z-10"
															onClick={() => setActionMenu(null)}
														/>
														<div
															className="fixed z-[9999] bg-white border border-gray-200 rounded-xl shadow-lg py-1 w-44 text-sm"
															style={{
																top: menuPos?.top,
																right: menuPos?.right,
															}}>
															<button
																onClick={() => {
																	openStok(p);
																	setActionMenu(null);
																}}
																className="w-full flex items-center gap-2.5 px-4 py-2 hover:bg-indigo-50 text-indigo-600">
																<Package size={14} /> Kelola Stok
															</button>
															<button
																onClick={() => {
																	openMutasi(p);
																	setActionMenu(null);
																}}
																className="w-full flex items-center gap-2.5 px-4 py-2 hover:bg-gray-50 text-gray-700">
																<History size={14} /> Riwayat Stok
															</button>
															<button
																onClick={() => {
																	setQrProduct({
																		id: p.id,
																		nama: p.nama,
																		harga_katalog: p.harga_katalog,
																	});
																	setActionMenu(null);
																}}
																className="w-full flex items-center gap-2.5 px-4 py-2 hover:bg-purple-50 text-purple-600">
																<QrCode size={14} /> QR Code
															</button>
															<button
																onClick={() => {
																	openEdit(p);
																	setActionMenu(null);
																}}
																className="w-full flex items-center gap-2.5 px-4 py-2 hover:bg-yellow-50 text-yellow-600">
																<Edit size={14} /> Edit
															</button>
															{isSuperAdmin && (
																<>
																	<div className="my-1 border-t border-gray-100" />
																	<button
																		onClick={() => {
																			hapusProduk(p.id);
																			setActionMenu(null);
																		}}
																		className="w-full flex items-center gap-2.5 px-4 py-2 hover:bg-red-50 text-red-500">
																		<Trash2 size={14} /> Hapus
																	</button>
																</>
															)}
														</div>
													</>
												)}
											</div>
										</td>
									</tr>
								))
							)}
						</tbody>
					</table>
				</div>
			) : (
				<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
					{loading ? (
						<p className="col-span-3 text-center py-12 text-gray-400">
							Memuat...
						</p>
					) : filtered.length === 0 ? (
						<p className="col-span-3 text-center py-12 text-gray-400">
							Tidak ada produk
						</p>
					) : (
						filtered.map((p) => (
							<div
								key={p.id}
								onClick={selectMode ? () => toggleSelectQR(p.id) : undefined}
								className={`relative bg-white rounded-2xl p-5 shadow-sm border hover:shadow-md transition ${
									selectMode ? "cursor-pointer" : ""
								} ${
									selectMode && selectedQR.has(p.id)
										? "border-purple-400 bg-purple-50"
										: p.stok <= p.stok_minimum
											? "border-red-200"
											: "border-gray-100"
								}`}>
								{selectMode && (
									<div className="absolute top-3 right-3 z-10">
										<input
											type="checkbox"
											checked={selectedQR.has(p.id)}
											onChange={() => toggleSelectQR(p.id)}
											onClick={(e) => e.stopPropagation()}
											className="w-5 h-5 rounded accent-purple-600 cursor-pointer"
										/>
									</div>
								)}
								<Link
									href={`/dashboard/produk/${p.id}`}
									onClick={(e) => {
										if (selectMode) e.preventDefault();
									}}
									className="block group">
									{produkFotos[p.id] ? (
										<img
											src={imgUrl(produkFotos[p.id], 400)}
											alt=""
											loading="lazy"
											className="w-full h-28 object-cover rounded-xl border border-gray-100 mb-3"
										/>
									) : (
										<div className="w-full h-20 bg-gray-50 rounded-xl flex items-center justify-center mb-3">
											<ImageIcon size={24} className="text-gray-300" />
										</div>
									)}
								</Link>
								<div className="flex items-start justify-between mb-3">
									<div>
										<Link
											href={`/dashboard/produk/${p.id}`}
											onClick={(e) => {
												if (selectMode) e.preventDefault();
											}}>
											<p className="font-semibold text-gray-900 hover:text-indigo-600 transition">{p.nama}</p>
										</Link>
										<p className="text-xs text-gray-500">
											{p.kategori || "-"} · {p.satuan}
										</p>
									</div>
									<div
										className={`flex gap-1 ${selectMode ? "invisible" : ""}`}>
										<button
											onClick={() => openStok(p)}
											className="p-1.5 hover:bg-indigo-50 rounded-lg text-indigo-600">
											<Package size={14} />
										</button>
										<button
											onClick={() => openMutasi(p)}
											className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-500">
											<History size={14} />
										</button>
										<button
											onClick={() =>
												setQrProduct({
													id: p.id,
													nama: p.nama,
													harga_katalog: p.harga_katalog,
												})
											}
											title="QR Code"
											className="p-1.5 hover:bg-purple-50 rounded-lg text-purple-500">
											<QrCode size={14} />
										</button>
										<button
											onClick={() => openEdit(p)}
											className="p-1.5 hover:bg-yellow-50 rounded-lg text-yellow-600">
											<Edit size={14} />
										</button>
										{isSuperAdmin && (
											<button
												onClick={() => hapusProduk(p.id)}
												className="p-1.5 hover:bg-red-50 rounded-lg text-red-500">
												<Trash2 size={14} />
											</button>
										)}
									</div>
								</div>
								<div className="grid grid-cols-2 gap-2 mt-3">
									<div className="bg-gray-50 rounded-xl p-3">
										<p className="text-xs text-gray-500">Stok</p>
										<p
											className={`text-lg font-bold ${p.stok <= p.stok_minimum ? "text-red-600" : "text-gray-900"}`}>
											{p.stok} {p.satuan}
											{p.stok <= p.stok_minimum && (
												<span className="text-xs font-normal ml-1">
													⚠ Menipis
												</span>
											)}
										</p>
									</div>
									<div className="bg-gray-50 rounded-xl p-3">
										<p className="text-xs text-gray-500">Harga Katalog</p>
										<p className="text-sm font-bold text-gray-900">
											{formatRupiah(p.harga_katalog)}
										</p>
									</div>
									<div className="col-span-2 bg-orange-50 rounded-xl p-3">
										<p className="text-xs text-orange-500">
											Rekomendasi Harga Jual (+25%)
										</p>
										<p className="text-sm font-bold text-orange-700">
											{formatRupiah(Math.ceil(p.harga_katalog * 1.25))}
										</p>
									</div>
									{isSuperAdmin && (
										<>
											<div className="bg-gray-50 rounded-xl p-3">
												<p className="text-xs text-gray-500">Modal</p>
												<p className="text-sm font-medium text-gray-600">
													{formatRupiah(p.harga_modal)}
												</p>
											</div>
											<div className="bg-green-50 rounded-xl p-3">
												<p className="text-xs text-gray-500">Laba/Unit</p>
												<p className="text-sm font-bold text-green-600">
													{formatRupiah(p.harga_katalog - p.harga_modal)}
												</p>
											</div>
										</>
									)}
								</div>
							</div>
						))
					)}
				</div>
			)}

			{/* Modal Tambah/Edit */}
			{(modal === "tambah" || modal === "edit") && (
				<div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
					<div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl">
						<div className="flex items-center justify-between p-6 border-b border-gray-100">
							<h2 className="text-lg font-semibold">
								{modal === "tambah" ? "Tambah Produk" : "Edit Produk"}
							</h2>
							<button
								onClick={() => setModal(null)}
								className="p-2 hover:bg-gray-100 rounded-lg">
								<X size={18} />
							</button>
						</div>
						<div className="p-6 space-y-4">
							<div className="grid grid-cols-2 gap-4">
								<div className="col-span-2">
									<label className="block text-sm font-medium text-gray-700 mb-1">
										Nama Produk *
									</label>
									<input
										value={form.nama}
										onChange={(e) => setForm({ ...form, nama: e.target.value })}
										className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
									/>
								</div>
								<div>
									<label className="block text-sm font-medium text-gray-700 mb-1">
										Kategori
									</label>
									<input
										value={form.kategori}
										onChange={(e) =>
											setForm({ ...form, kategori: e.target.value })
										}
										className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
									/>
								</div>
								<div>
									<label className="block text-sm font-medium text-gray-700 mb-1">
										Satuan
									</label>
									<input
										value={form.satuan}
										onChange={(e) =>
											setForm({ ...form, satuan: e.target.value })
										}
										className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
									/>
								</div>

								{/* Harga Modal — superadmin only */}
								{isSuperAdmin && (
									<div>
										<label className="block text-sm font-medium text-gray-700 mb-1">
											Harga Modal *
										</label>
										<input
											type="number"
											value={form.harga_modal}
											onChange={(e) =>
												setForm({ ...form, harga_modal: e.target.value })
											}
											className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
										/>
									</div>
								)}

								<div>
									<label className="block text-sm font-medium text-gray-700 mb-1">
										Harga Katalog *
									</label>
									<input
										type="number"
										value={form.harga_katalog}
										onChange={(e) =>
											setForm({ ...form, harga_katalog: e.target.value })
										}
										className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
									/>
								</div>

								{modal === "tambah" && (
									<div>
										<label className="block text-sm font-medium text-gray-700 mb-1">
											Stok Awal
										</label>
										<input
											type="number"
											value={form.stok}
											onChange={(e) =>
												setForm({ ...form, stok: e.target.value })
											}
											className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
										/>
									</div>
								)}

								<div>
									<label className="block text-sm font-medium text-gray-700 mb-1">
										Stok Minimum
									</label>
									<input
										type="number"
										value={form.stok_minimum}
										onChange={(e) =>
											setForm({ ...form, stok_minimum: e.target.value })
										}
										className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
									/>
								</div>

								{/* Laba preview — superadmin only */}
								{isSuperAdmin && form.harga_modal && form.harga_katalog && (
									<div className="col-span-2 bg-green-50 rounded-xl px-4 py-3">
										<p className="text-xs text-green-700">
											Laba per unit:{" "}
											<span className="font-bold">
												{formatRupiah(
													Number(form.harga_katalog) - Number(form.harga_modal),
												)}
											</span>
										</p>
									</div>
								)}

								{/* Foto produk */}
								<div className="col-span-2">
									<label className="block text-sm font-medium text-gray-700 mb-2">
										Foto Produk
									</label>
									{(existingFotos.length > 0 || fotoFiles.length > 0) && (
										<div className="flex gap-2 flex-wrap mb-2">
											{existingFotos.map((f) => (
												<div key={f.id} className="relative group">
													<img
														src={imgUrl(f.url, 150)}
														alt=""
														loading="lazy"
														className="w-16 h-16 object-cover rounded-xl border border-gray-200"
													/>
													<button
														type="button"
														onClick={() => deleteFoto(f.id, f.url)}
														className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
														<X size={10} />
													</button>
												</div>
											))}
											{fotoFiles.map((f, i) => (
												<div key={i} className="relative group">
													<img
														src={URL.createObjectURL(f)}
														alt=""
														className="w-16 h-16 object-cover rounded-xl border-2 border-indigo-300"
													/>
													<button
														type="button"
														onClick={() =>
															setFotoFiles((prev) =>
																prev.filter((_, idx) => idx !== i),
															)
														}
														className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
														<X size={10} />
													</button>
												</div>
											))}
										</div>
									)}
									<label className="flex items-center gap-2 px-4 py-2.5 border-2 border-dashed border-gray-300 rounded-xl text-sm text-gray-500 hover:border-indigo-400 hover:text-indigo-600 cursor-pointer transition w-fit">
										<Upload size={15} />
										<span>Pilih Foto</span>
										<input
											type="file"
											accept="image/*"
											multiple
											className="hidden"
											onChange={(e) => {
												const files = Array.from(e.target.files || []);
												setFotoFiles((prev) => [...prev, ...files]);
												e.target.value = "";
											}}
										/>
									</label>
									{fotoFiles.length > 0 && (
										<p className="text-xs text-indigo-600 mt-1">
											{fotoFiles.length} foto baru siap diupload
										</p>
									)}
								</div>
							</div>
						</div>
						{formError && (
							<div className="mx-6 mb-4 flex items-start gap-3 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
								<span className="mt-0.5 flex-shrink-0">⚠️</span>
								<p>{formError}</p>
							</div>
						)}
						<div className="flex gap-3 p-6 pt-0">
							<button
								onClick={() => setModal(null)}
								className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium hover:bg-gray-50">
								Batal
							</button>
							<button
								onClick={saveProduk}
								disabled={saving || !form.nama}
								className="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white px-4 py-2.5 rounded-xl text-sm font-medium">
								{saving ? "Menyimpan..." : "Simpan"}
							</button>
						</div>
					</div>
				</div>
			)}

			{/* Modal Kelola Stok */}
			{modal === "stok" && selected && (
				<div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
					<div className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
						<div className="flex items-center justify-between p-6 border-b border-gray-100">
							<h2 className="text-lg font-semibold">
								Kelola Stok: {selected.nama}
							</h2>
							<button
								onClick={() => setModal(null)}
								className="p-2 hover:bg-gray-100 rounded-lg">
								<X size={18} />
							</button>
						</div>
						<div className="p-6 space-y-4">
							<div className="bg-gray-50 rounded-xl p-4 text-center">
								<p className="text-sm text-gray-500">Stok Saat Ini</p>
								<p className="text-3xl font-bold text-gray-900">
									{selected.stok} {selected.satuan}
								</p>
							</div>
							<div>
								<label className="block text-sm font-medium text-gray-700 mb-2">
									Jenis Mutasi
								</label>
								<div className="grid grid-cols-3 gap-2">
									{[
										{ v: "masuk", label: "Masuk", color: "bg-green-500" },
										{ v: "keluar", label: "Keluar", color: "bg-red-500" },
										{ v: "koreksi", label: "Koreksi", color: "bg-yellow-500" },
									].map((opt) => (
										<button
											key={opt.v}
											onClick={() => setStokForm({ ...stokForm, tipe: opt.v })}
											className={`py-2 rounded-xl text-sm font-medium transition ${stokForm.tipe === opt.v ? `${opt.color} text-white` : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
											{opt.label}
										</button>
									))}
								</div>
							</div>
							<div>
								<label className="block text-sm font-medium text-gray-700 mb-1">
									{stokForm.tipe === "koreksi" ? "Stok Baru" : "Jumlah"}
								</label>
								<input
									type="number"
									value={stokForm.jumlah}
									onChange={(e) =>
										setStokForm({ ...stokForm, jumlah: e.target.value })
									}
									className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
									placeholder="0"
								/>
							</div>
							<div>
								<label className="block text-sm font-medium text-gray-700 mb-1">
									Keterangan
								</label>
								<input
									value={stokForm.keterangan}
									onChange={(e) =>
										setStokForm({ ...stokForm, keterangan: e.target.value })
									}
									className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
									placeholder="Opsional"
								/>
							</div>
							{stokForm.jumlah && (
								<div className="bg-indigo-50 rounded-xl p-3 text-sm text-indigo-700">
									Stok sesudah:{" "}
									<span className="font-bold">
										{stokForm.tipe === "masuk"
											? selected.stok + Number(stokForm.jumlah)
											: stokForm.tipe === "keluar"
												? selected.stok - Number(stokForm.jumlah)
												: Number(stokForm.jumlah)}{" "}
										{selected.satuan}
									</span>
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
								onClick={saveStok}
								disabled={saving || !stokForm.jumlah}
								className="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white px-4 py-2.5 rounded-xl text-sm font-medium">
								{saving ? "Menyimpan..." : "Simpan"}
							</button>
						</div>
					</div>
				</div>
			)}

			{/* Modal Riwayat Mutasi */}
			{modal === "mutasi" && selected && (
				<div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
					<div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl max-h-[80vh] flex flex-col">
						<div className="flex items-center justify-between p-6 border-b border-gray-100">
							<h2 className="text-lg font-semibold">
								Riwayat Stok: {selected.nama}
							</h2>
							<button
								onClick={() => setModal(null)}
								className="p-2 hover:bg-gray-100 rounded-lg">
								<X size={18} />
							</button>
						</div>
						<div className="flex-1 overflow-y-auto p-6">
							{mutasiList.length === 0 ? (
								<p className="text-center text-gray-400 py-8">
									Belum ada mutasi
								</p>
							) : (
								mutasiList.map((m) => (
									<div
										key={m.id}
										className="flex items-center gap-4 py-3 border-b border-gray-50 last:border-0">
										<div
											className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
												m.tipe === "masuk"
													? "bg-green-100"
													: m.tipe === "keluar"
														? "bg-red-100"
														: "bg-yellow-100"
											}`}>
											{m.tipe === "masuk" ? (
												<TrendingUp size={14} className="text-green-600" />
											) : m.tipe === "keluar" ? (
												<TrendingDown size={14} className="text-red-600" />
											) : (
												<Package size={14} className="text-yellow-600" />
											)}
										</div>
										<div className="flex-1">
											<p className="text-sm font-medium capitalize text-gray-900">
												{m.tipe} {m.jumlah} unit
											</p>
											<p className="text-xs text-gray-500">
												{m.keterangan || "-"} · {formatDate(m.created_at)}
											</p>
										</div>
										<div className="text-right text-sm">
											<p className="text-gray-500">
												{m.stok_sebelum} →{" "}
												<span className="font-semibold text-gray-900">
													{m.stok_sesudah}
												</span>
											</p>
										</div>
									</div>
								))
							)}
						</div>
					</div>
				</div>
			)}

			{/* Floating bar mode pilih QR */}
			{selectMode && (
				<div className="fixed bottom-0 left-0 lg:left-64 right-0 z-40 bg-white border-t border-gray-200 shadow-lg px-6 py-4">
					<div className="max-w-5xl mx-auto flex items-center justify-between gap-4">
						<div className="flex items-center gap-3">
							<CheckSquare size={20} className="text-purple-600" />
							<span className="text-sm font-medium text-gray-700">
								{selectedQR.size > 0
									? `${selectedQR.size} produk dipilih`
									: "Pilih produk untuk cetak QR"}
							</span>
							{selectedQR.size > 0 && (
								<button
									onClick={() => setSelectedQR(new Set())}
									className="text-xs text-gray-400 hover:text-gray-600 underline">
									Hapus pilihan
								</button>
							)}
						</div>
						<div className="flex items-center gap-2">
							<button
								onClick={exitSelectMode}
								className="px-4 py-2 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition">
								Batal
							</button>
							<button
								onClick={handleCetakQR}
								disabled={selectedQR.size === 0}
								className="flex items-center gap-2 px-5 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-200 text-white rounded-xl text-sm font-medium transition">
								<Printer size={15} />
								Cetak {selectedQR.size > 0 ? `${selectedQR.size} QR` : "QR"}
							</button>
						</div>
					</div>
				</div>
			)}

			{/* Hidden area untuk render QR canvas sebelum print */}
			<div ref={qrPrintRef} className="hidden" aria-hidden="true">
				{Array.from(selectedQR).map((id) => {
					const p = produk.find((x) => x.id === id);
					if (!p) return null;
					return (
						<div key={id} data-qr-id={id}>
							<QRCodeCanvas
								value={`${window.location.origin}/produk/${id}`}
								size={200}
								level="M"
							/>
						</div>
					);
				})}
			</div>

			{/* QR Code Modal */}
			{qrProduct && (
				<div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
					<div className="bg-white rounded-2xl shadow-xl w-full max-w-sm">
						<div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
							<h3 className="font-semibold text-gray-900">QR Code Produk</h3>
							<button
								onClick={() => setQrProduct(null)}
								className="text-gray-400 hover:text-gray-600">
								<X size={20} />
							</button>
						</div>
						<div className="p-6 flex flex-col items-center gap-4">
							<div
								ref={qrContainerRef}
								className="p-4 bg-white rounded-xl border-2 border-gray-100 shadow-sm">
								<QRCodeCanvas
									value={`${window.location.origin}/produk/${qrProduct.id}`}
									size={200}
									level="M"
								/>
							</div>
							<div className="text-center">
								<p className="font-semibold text-gray-900">{qrProduct.nama}</p>
								{/* <p className="text-sm text-indigo-600 font-medium mt-0.5">
									{formatRupiah(qrProduct.harga_katalog)}
								</p> */}
								<p className="text-xs text-gray-400 mt-1 break-all">
									{window.location.origin}/produk/{qrProduct.id}
								</p>
							</div>
							<div className="flex gap-2 w-full">
								<button
									onClick={() => {
										const canvas = qrContainerRef.current?.querySelector(
											"canvas",
										) as HTMLCanvasElement;
										if (!canvas) return;
										const a = document.createElement("a");
										a.href = canvas.toDataURL("image/png");
										a.download = `QR-${qrProduct.nama}.png`;
										a.click();
									}}
									className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition">
									Unduh PNG
								</button>
								<button
									onClick={() => {
										const canvas = qrContainerRef.current?.querySelector(
											"canvas",
										) as HTMLCanvasElement;
										if (!canvas) return;
										const img = canvas.toDataURL("image/png");
										const w = window.open("", "_blank");
										if (!w) return;
										w.document
											.write(`<!DOCTYPE html><html><head><title>Label - ${qrProduct.nama}</title>
										<style>body{font-family:sans-serif;text-align:center;padding:24px;margin:0}img{width:180px;height:180px}.nama{font-size:16px;font-weight:700;margin:10px 0 4px}.harga{font-size:18px;font-weight:800;color:#1a1a1a}.brand{font-size:10px;color:#999;margin-top:6px}</style>
										</head><body><img src="${img}"/><p class="nama">${qrProduct.nama}</p><p class="harga">${new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(qrProduct.harga_katalog)}</p><p class="brand">BungaNaik</p>
										<script>window.onload=function(){window.print();setTimeout(function(){window.close()},500)}</script></body></html>`);
										w.document.close();
									}}
									className="flex-1 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 transition">
									Cetak Label
								</button>
							</div>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}
