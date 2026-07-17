"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { imgUrl } from "@/lib/image";
import { useAuth } from "@/contexts/AuthContext";
import { Produk, Reseller, PenjualanItem } from "@/lib/types";
import { formatRupiah, waLink, insertPenjualanWithResi } from "@/lib/utils";
import { printInvoice } from "@/lib/printInvoice";
import {
	Search,
	X,
	Plus,
	Minus,
	Trash2,
	ShoppingCart,
	PackageCheck,
	CheckCircle2,
	Copy,
	Link2,
	Printer,
	ImageIcon,
	ChevronDown,
	ChevronUp,
	Truck,
	Gift,
	RotateCcw,
} from "lucide-react";

interface CartItem extends PenjualanItem {
	produk_nama: string;
	produk_satuan: string;
	foto_url?: string | null;
}

const initialHeader = {
	reseller_id: "",
	nama_customer: "",
	telepon_customer: "",
	tujuan: "",
	metode_bayar: "transfer",
	status_bayar: "lunas",
	uang_dp: "0",
	catatan: "",
	sopir: "",
	telepon_sopir: "",
	bonus_owner: "0",
	catatan_bonus_owner: "",
};

export default function POSPage() {
	const { isSuperAdmin, canAccessPenjualan, role, loading: authLoading } = useAuth();
	const router = useRouter();
	const supabase = createClient();

	useEffect(() => {
		if (!authLoading && !canAccessPenjualan) router.replace("/dashboard");
	}, [authLoading, canAccessPenjualan, router]);

	const [produkList, setProdukList] = useState<Produk[]>([]);
	const [produkFotos, setProdukFotos] = useState<Record<string, string>>({});
	const [resellerList, setResellerList] = useState<Reseller[]>([]);
	const [poList, setPoList] = useState<any[]>([]);
	const [loading, setLoading] = useState(true);

	const [produkSearch, setProdukSearch] = useState("");
	const [kategoriFilter, setKategoriFilter] = useState("Semua");

	const [cart, setCart] = useState<CartItem[]>([]);
	const [formHeader, setFormHeader] = useState(initialHeader);

	const [resellerSearch, setResellerSearch] = useState("");
	const [showResellerDropdown, setShowResellerDropdown] = useState(false);
	const [modalTambahReseller, setModalTambahReseller] = useState(false);
	const [formReseller, setFormReseller] = useState({ nama: "", telepon: "" });
	const [savingReseller, setSavingReseller] = useState(false);

	const [formDariPO, setFormDariPO] = useState(false);
	const [formPoId, setFormPoId] = useState("");

	const [showInfoSection, setShowInfoSection] = useState(false);
	const [showBonusOwner, setShowBonusOwner] = useState(false);

	const [saving, setSaving] = useState(false);
	const [resiSukses, setResiSukses] = useState<string | null>(null);
	const [resiTeleponCustomer, setResiTeleponCustomer] = useState<string | null>(null);
	const [lastSaved, setLastSaved] = useState<any | null>(null);

	useEffect(() => {
		loadAll();
	}, []);

	const loadAll = async () => {
		const [produkRes, fotoRes, resellerRes, poRes] = await Promise.all([
			supabase.from("produk").select("*").eq("aktif", true).order("nama"),
			supabase.from("produk_foto").select("produk_id, url").order("urutan"),
			supabase.from("resellers").select("*").eq("aktif", true).order("nama"),
			supabase
				.from("purchase_orders")
				.select("id, nomor_po, nama_customer, status, reseller:resellers(nama)")
				.neq("status", "batal")
				.order("created_at", { ascending: false }),
		]);
		setProdukList(produkRes.data || []);
		const fotoMap: Record<string, string> = {};
		for (const f of fotoRes.data || []) {
			if (!fotoMap[f.produk_id]) fotoMap[f.produk_id] = f.url;
		}
		setProdukFotos(fotoMap);
		setResellerList(resellerRes.data || []);
		setPoList(poRes.data || []);
		setLoading(false);
	};

	const resetTransaksi = () => {
		setCart([]);
		setFormHeader(initialHeader);
		setResellerSearch("");
		setShowResellerDropdown(false);
		setFormDariPO(false);
		setFormPoId("");
		setProdukSearch("");
		setKategoriFilter("Semua");
		setShowInfoSection(false);
		setShowBonusOwner(false);
	};

	const selectedReseller = resellerList.find((r) => r.id === formHeader.reseller_id);
	const filteredResellerSearch = resellerList
		.filter((r) => r.nama.toLowerCase().includes(resellerSearch.toLowerCase()))
		.slice(0, 6);

	const saveReseller = async () => {
		setSavingReseller(true);
		const { data } = await supabase
			.from("resellers")
			.insert({ ...formReseller, aktif: true })
			.select()
			.single();
		if (data) {
			setResellerList((prev) => [...prev, data].sort((a, b) => a.nama.localeCompare(b.nama)));
			setFormHeader((f) => ({ ...f, reseller_id: data.id }));
			setResellerSearch(data.nama);
		}
		setSavingReseller(false);
		setModalTambahReseller(false);
		setFormReseller({ nama: "", telepon: "" });
	};

	const handlePoSelect = async (poId: string) => {
		setFormPoId(poId);
		if (!poId) {
			setCart([]);
			return;
		}
		const { data: poItems } = await supabase
			.from("purchase_order_items")
			.select("*, produk:produk(*)")
			.eq("po_id", poId);

		const newCart: CartItem[] = [];
		for (const item of poItems || []) {
			if (!item.produk_id || !item.produk) continue;
			const p = item.produk;
			newCart.push({
				produk_id: p.id,
				produk_nama: p.nama,
				produk_satuan: p.satuan,
				jumlah: item.jumlah,
				harga_modal: p.harga_modal,
				harga_katalog: p.harga_katalog,
				harga_jual: p.harga_katalog,
				ongkir: 0,
				bonus: 0,
				foto_url: produkFotos[p.id] || null,
			});
		}
		setCart(newCart);
	};

	const addToCart = (p: Produk) => {
		if (p.stok <= 0) return;
		const existing = cart.findIndex((c) => c.produk_id === p.id);
		if (existing >= 0) {
			const updated = [...cart];
			updated[existing] = { ...updated[existing], jumlah: updated[existing].jumlah + 1 };
			setCart(updated);
			return;
		}
		setCart([
			...cart,
			{
				produk_id: p.id,
				produk_nama: p.nama,
				produk_satuan: p.satuan,
				jumlah: 1,
				harga_modal: p.harga_modal,
				harga_katalog: p.harga_katalog,
				harga_jual: p.harga_katalog,
				ongkir: 0,
				bonus: 0,
				foto_url: produkFotos[p.id] || null,
			},
		]);
	};

	const updateCartItem = (idx: number, field: string, value: any) => {
		const updated = [...cart];
		updated[idx] = { ...updated[idx], [field]: Number(value) };
		// Recalculate bonus: harga_jual - harga_katalog - ongkir
		updated[idx].bonus = Math.max(
			0,
			updated[idx].harga_jual - updated[idx].harga_katalog - updated[idx].ongkir,
		);
		setCart(updated);
	};

	const removeFromCart = (idx: number) => setCart(cart.filter((_, i) => i !== idx));

	const kosongkanKeranjang = () => {
		if (cart.length === 0) return;
		if (!confirm("Kosongkan semua item di keranjang?")) return;
		setCart([]);
	};

	const totals = cart.reduce(
		(acc, item) => ({
			katalog: acc.katalog + item.harga_katalog * item.jumlah,
			jual: acc.jual + item.harga_jual * item.jumlah,
			ongkir: acc.ongkir + item.ongkir,
			bonus: acc.bonus + item.bonus * item.jumlah,
			laba: acc.laba + (item.harga_katalog - item.harga_modal) * item.jumlah,
		}),
		{ katalog: 0, jual: 0, ongkir: 0, bonus: 0, laba: 0 },
	);
	const grandTotalCart = totals.jual;

	const kategoriList = useMemo(() => {
		const set = new Set<string>();
		for (const p of produkList) if (p.kategori) set.add(p.kategori);
		return ["Semua", ...Array.from(set).sort()];
	}, [produkList]);

	const filteredProduk = produkList.filter((p) => {
		const matchSearch = p.nama.toLowerCase().includes(produkSearch.toLowerCase());
		const matchKategori = kategoriFilter === "Semua" || p.kategori === kategoriFilter;
		return matchSearch && matchKategori;
	});

	const savePenjualan = async () => {
		if (cart.length === 0) return;
		setSaving(true);

		const milestoneAwal = formDariPO && formPoId ? "diproduksi" : "diproses";
		const customerSnapshot = {
			nama: formHeader.nama_customer,
			telepon: formHeader.telepon_customer,
		};
		const resellerSnapshot = selectedReseller
			? { nama: selectedReseller.nama, telepon: selectedReseller.telepon }
			: null;

		const { data: pj, error } = await insertPenjualanWithResi(supabase, {
			reseller_id: formHeader.reseller_id || null,
			nama_customer: formHeader.nama_customer || null,
			telepon_customer: formHeader.telepon_customer || null,
			tujuan: formHeader.tujuan,
			metode_bayar: formHeader.metode_bayar,
			status_bayar: formHeader.status_bayar,
			uang_dp: Number(formHeader.uang_dp),
			sopir: formHeader.sopir,
			telepon_sopir: formHeader.telepon_sopir || null,
			catatan: formHeader.catatan,
			total_harga_katalog: totals.katalog,
			total_harga_jual: totals.jual,
			total_ongkir: totals.ongkir,
			total_bonus: totals.bonus,
			total_laba: totals.laba,
			bonus_owner: Number(formHeader.bonus_owner) || 0,
			catatan_bonus_owner: formHeader.catatan_bonus_owner || null,
			po_id: formDariPO && formPoId ? formPoId : null,
			milestone: milestoneAwal,
		});

		if (error || !pj) {
			setSaving(false);
			return;
		}

		// Catat pembayaran awal
		const jumlahBayarAwal =
			formHeader.status_bayar === "lunas" ? totals.jual : Number(formHeader.uang_dp);
		if (jumlahBayarAwal > 0) {
			await supabase.from("penjualan_pembayaran").insert({
				penjualan_id: pj.id,
				jumlah: jumlahBayarAwal,
				metode: formHeader.metode_bayar,
				catatan: formHeader.status_bayar === "dp" ? "DP awal" : null,
			});
		}

		await supabase.from("penjualan_item").insert(
			cart.map((item) => ({
				penjualan_id: pj.id,
				produk_id: item.produk_id,
				jumlah: item.jumlah,
				harga_modal: item.harga_modal,
				harga_katalog: item.harga_katalog,
				harga_jual: item.harga_jual,
				ongkir: item.ongkir,
				bonus: item.bonus,
			})),
		);

		for (const item of cart) {
			const produk = produkList.find((p) => p.id === item.produk_id);
			if (!produk) continue;
			const stokBaru = produk.stok - item.jumlah;
			await supabase.from("produk").update({ stok: stokBaru }).eq("id", item.produk_id);
			await supabase.from("mutasi_stok").insert({
				produk_id: item.produk_id,
				tipe: "keluar",
				jumlah: item.jumlah,
				stok_sebelum: produk.stok,
				stok_sesudah: stokBaru,
				keterangan: `Penjualan ${pj.nomor_faktur}`,
				referensi_id: pj.id,
			});
		}

		// Reflect stok terbaru di grid tanpa perlu reload penuh
		setProdukList((prev) =>
			prev.map((p) => {
				const item = cart.find((c) => c.produk_id === p.id);
				return item ? { ...p, stok: p.stok - item.jumlah } : p;
			}),
		);

		setLastSaved({
			nomor_faktur: pj.nomor_faktur,
			tanggal: pj.tanggal,
			status_bayar: formHeader.status_bayar,
			metode_bayar: formHeader.metode_bayar,
			total_harga_jual: totals.jual,
			total_ongkir: totals.ongkir,
			uang_dp: jumlahBayarAwal,
			catatan: formHeader.catatan,
			tujuan: formHeader.tujuan,
			sopir: formHeader.sopir,
			telepon_sopir: formHeader.telepon_sopir,
			customer: customerSnapshot,
			reseller: resellerSnapshot,
			items: cart.map((item) => ({
				jumlah: item.jumlah,
				harga_jual: item.harga_jual,
				ongkir: item.ongkir,
				produk: { nama: item.produk_nama, satuan: item.produk_satuan },
			})),
		});

		resetTransaksi();
		setSaving(false);
		setResiSukses(pj.nomor_resi);
		setResiTeleponCustomer(customerSnapshot.telepon || null);
	};

	const tutupSukses = () => {
		setResiSukses(null);
		setLastSaved(null);
	};

	if (authLoading || !canAccessPenjualan) return null;

	return (
		<div>
			<div className="flex items-center justify-between mb-6">
				<div>
					<h1 className="text-2xl font-bold text-gray-900">Kasir (Point of Sale)</h1>
					<p className="text-gray-500 mt-1">
						{produkList.length} produk · {cart.length} item di keranjang
					</p>
				</div>
			</div>

			<div className="flex flex-col lg:flex-row gap-6 lg:h-[calc(100vh-11rem)]">
				{/* Panel Produk */}
				<div className="flex-1 flex flex-col min-h-0">
					<div className="flex flex-wrap gap-3 mb-4">
						<div className="relative flex-1 min-w-48">
							<Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
							<input
								value={produkSearch}
								onChange={(e) => setProdukSearch(e.target.value)}
								placeholder="Cari produk..."
								className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm bg-white"
							/>
						</div>
						<select
							value={kategoriFilter}
							onChange={(e) => setKategoriFilter(e.target.value)}
							className="px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white">
							{kategoriList.map((k) => (
								<option key={k} value={k}>
									{k}
								</option>
							))}
						</select>
					</div>

					<div className="flex-1 overflow-y-auto pr-1">
						{loading ? (
							<div className="text-center py-16 text-gray-400 text-sm">Memuat produk...</div>
						) : filteredProduk.length === 0 ? (
							<div className="text-center py-16 text-gray-400 text-sm">Tidak ada produk ditemukan</div>
						) : (
							<div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3 pb-4">
								{filteredProduk.map((p) => {
									const cartItem = cart.find((c) => c.produk_id === p.id);
									const habis = p.stok <= 0;
									const foto = produkFotos[p.id];
									return (
										<button
											key={p.id}
											onClick={() => addToCart(p)}
											disabled={habis}
											className={`text-left bg-white border rounded-xl overflow-hidden transition ${
												habis
													? "opacity-50 cursor-not-allowed border-gray-200"
													: cartItem
														? "border-indigo-400 ring-1 ring-indigo-200 hover:shadow-md"
														: "border-gray-200 hover:border-indigo-300 hover:shadow-md"
											}`}>
											<div className="relative w-full aspect-square bg-gray-100">
												{foto ? (
													<img
														src={imgUrl(foto, 400)}
														alt=""
														loading="lazy"
														className="absolute inset-0 w-full h-full object-cover"
													/>
												) : (
													<div className="w-full h-full flex items-center justify-center">
														<ImageIcon size={24} className="text-gray-300" />
													</div>
												)}
												{cartItem && (
													<span className="absolute top-1.5 right-1.5 bg-indigo-600 text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">
														{cartItem.jumlah}
													</span>
												)}
												{habis && (
													<span className="absolute inset-0 flex items-center justify-center bg-black/40 text-white text-xs font-semibold">
														Stok Habis
													</span>
												)}
											</div>
											<div className="p-2.5">
												<p className="text-sm font-medium text-gray-900 truncate">{p.nama}</p>
												<p className="text-xs text-gray-400 truncate">{p.kategori || "-"}</p>
												<div className="flex items-center justify-between mt-1">
													<span className="text-sm font-semibold text-indigo-600">
														{formatRupiah(p.harga_katalog)}
													</span>
													<span className="text-[10px] text-gray-400">Stok {p.stok}</span>
												</div>
											</div>
										</button>
									);
								})}
							</div>
						)}
					</div>
				</div>

				{/* Panel Keranjang & Checkout */}
				<div className="w-full lg:w-[420px] flex-shrink-0 bg-white rounded-2xl border border-gray-100 shadow-sm flex flex-col min-h-0 lg:h-full">
					<div className="p-4 border-b border-gray-100 space-y-3">
						<div className="flex items-center justify-between">
							<h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
								<ShoppingCart size={16} className="text-indigo-600" /> Keranjang ({cart.length})
							</h2>
							{cart.length > 0 && (
								<button
									onClick={kosongkanKeranjang}
									className="text-xs text-red-500 hover:text-red-600 flex items-center gap-1">
									<Trash2 size={12} /> Kosongkan
								</button>
							)}
						</div>

						{/* Reseller search */}
						<div className="relative">
							<Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
							<input
								value={resellerSearch}
								onChange={(e) => {
									setResellerSearch(e.target.value);
									setShowResellerDropdown(true);
									setFormHeader((f) => ({ ...f, reseller_id: "" }));
								}}
								onFocus={() => setShowResellerDropdown(true)}
								placeholder="Cari reseller..."
								className="w-full pl-8 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
							/>
							{showResellerDropdown && (
								<div className="absolute z-20 w-full bg-white border border-gray-200 rounded-xl mt-1 shadow-lg overflow-hidden">
									{resellerSearch && !filteredResellerSearch.length ? (
										<button
											onClick={() => {
												setFormReseller({ nama: resellerSearch, telepon: "" });
												setModalTambahReseller(true);
												setShowResellerDropdown(false);
											}}
											className="w-full flex items-center gap-2 px-4 py-3 text-sm text-indigo-600 hover:bg-indigo-50">
											<Plus size={14} /> Tambah "{resellerSearch}" sebagai reseller baru
										</button>
									) : (
										<>
											<button
												onClick={() => {
													setFormHeader((f) => ({ ...f, reseller_id: "" }));
													setResellerSearch("");
													setShowResellerDropdown(false);
												}}
												className="w-full text-left px-4 py-3 text-sm text-gray-400 hover:bg-gray-50 border-b border-gray-50">
												Tanpa Reseller
											</button>
											{filteredResellerSearch.map((r) => (
												<button
													key={r.id}
													onClick={() => {
														setFormHeader((f) => ({ ...f, reseller_id: r.id }));
														setResellerSearch(r.nama);
														setShowResellerDropdown(false);
													}}
													className={`w-full flex items-center justify-between px-4 py-3 text-sm hover:bg-indigo-50 border-b border-gray-50 last:border-0 ${
														formHeader.reseller_id === r.id ? "bg-indigo-50" : ""
													}`}>
													<div className="text-left">
														<p className="font-medium text-gray-900">{r.nama}</p>
														{r.telepon && <p className="text-xs text-gray-400">{r.telepon}</p>}
													</div>
													{formHeader.reseller_id === r.id && (
														<span className="text-indigo-500 text-xs">✓</span>
													)}
												</button>
											))}
											<button
												onClick={() => {
													setFormReseller({ nama: resellerSearch, telepon: "" });
													setModalTambahReseller(true);
													setShowResellerDropdown(false);
												}}
												className="w-full flex items-center gap-2 px-4 py-3 text-sm text-indigo-600 hover:bg-indigo-50 border-t border-gray-100">
												<Plus size={14} /> Tambah reseller baru
											</button>
										</>
									)}
								</div>
							)}
						</div>
						{formHeader.reseller_id && (
							<p className="text-xs text-indigo-600 -mt-1">✓ {selectedReseller?.nama}</p>
						)}

						{/* Toggle Barang dari PO */}
						<div className="border border-gray-200 rounded-xl p-3">
							<button
								type="button"
								onClick={() => {
									setFormDariPO(!formDariPO);
									setFormPoId("");
								}}
								className="w-full flex items-center justify-between transition">
								<div className="flex items-center gap-2">
									<PackageCheck size={15} className={formDariPO ? "text-indigo-600" : "text-gray-400"} />
									<span className={`text-xs font-medium ${formDariPO ? "text-indigo-700" : "text-gray-600"}`}>
										Barang dari PO?
									</span>
								</div>
								<div
									className={`w-9 h-5 rounded-full transition-colors flex-shrink-0 ${
										formDariPO ? "bg-indigo-500" : "bg-gray-200"
									}`}>
									<div
										className={`w-4 h-4 bg-white rounded-full shadow-sm mt-0.5 transition-transform ${
											formDariPO ? "translate-x-4" : "translate-x-0.5"
										}`}
									/>
								</div>
							</button>
							{formDariPO && (
								<div className="mt-2.5">
									<select
										value={formPoId}
										onChange={(e) => handlePoSelect(e.target.value)}
										className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500">
										<option value="">-- Pilih PO --</option>
										{poList.map((po) => (
											<option key={po.id} value={po.id}>
												{po.nomor_po} · {po.reseller?.nama || po.nama_customer || "Umum"} [{po.status}]
											</option>
										))}
									</select>
									<p className="text-xs text-indigo-600 mt-1.5">
										Milestone awal akan diset ke <strong>Diproduksi</strong>
									</p>
								</div>
							)}
						</div>
					</div>

					<div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0">
						{cart.length === 0 ? (
							<div className="text-center py-10 text-gray-400 text-sm">
								Klik produk di sebelah kiri untuk menambah ke keranjang
							</div>
						) : (
							cart.map((item, idx) => (
								<div key={idx} className="bg-gray-50 rounded-xl p-3">
									<div className="flex items-start gap-2.5 mb-2.5">
										<div className="relative w-10 h-10 rounded-lg bg-gray-200 overflow-hidden flex-shrink-0">
											{item.foto_url ? (
												<img
													src={imgUrl(item.foto_url, 100)}
													alt=""
													loading="lazy"
													className="absolute inset-0 w-full h-full object-cover"
												/>
											) : (
												<div className="w-full h-full flex items-center justify-center">
													<ImageIcon size={14} className="text-gray-400" />
												</div>
											)}
										</div>
										<div className="flex-1 min-w-0">
											<p className="text-sm font-medium text-gray-900 truncate">{item.produk_nama}</p>
											<p className="text-xs text-gray-500">Katalog: {formatRupiah(item.harga_katalog)}</p>
										</div>
										<button
											onClick={() => removeFromCart(idx)}
											className="p-1.5 hover:bg-red-100 rounded-lg text-red-500 flex-shrink-0">
											<Trash2 size={14} />
										</button>
									</div>

									<div className="flex items-center gap-1.5 mb-2.5">
										<button
											onClick={() => updateCartItem(idx, "jumlah", Math.max(1, item.jumlah - 1))}
											className="w-7 h-7 flex items-center justify-center border border-gray-200 rounded-lg text-gray-500 hover:bg-gray-100 bg-white">
											<Minus size={12} />
										</button>
										<input
											type="number"
											min="1"
											value={item.jumlah}
											onChange={(e) => updateCartItem(idx, "jumlah", e.target.value || 1)}
											className="w-12 text-center py-1.5 border border-gray-200 rounded-lg text-sm bg-white"
										/>
										<button
											onClick={() => updateCartItem(idx, "jumlah", item.jumlah + 1)}
											className="w-7 h-7 flex items-center justify-center border border-gray-200 rounded-lg text-gray-500 hover:bg-gray-100 bg-white">
											<Plus size={12} />
										</button>
										<span className="ml-auto text-sm font-semibold text-gray-900">
											{formatRupiah(item.harga_jual * item.jumlah)}
										</span>
									</div>

									<div className="grid grid-cols-3 gap-1.5">
										<div>
											<label className="block text-[10px] text-gray-500 mb-0.5">Harga Jual</label>
											<input
												type="number"
												value={item.harga_jual}
												onChange={(e) => updateCartItem(idx, "harga_jual", e.target.value)}
												className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white"
											/>
										</div>
										<div>
											<label className="block text-[10px] text-gray-500 mb-0.5">Ongkir</label>
											<input
												type="number"
												value={item.ongkir}
												onChange={(e) => updateCartItem(idx, "ongkir", e.target.value)}
												className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white"
											/>
										</div>
										<div>
											<label className="block text-[10px] text-gray-500 mb-0.5">Bonus</label>
											<input
												type="number"
												value={item.bonus}
												onChange={(e) => {
													const u = [...cart];
													u[idx] = { ...u[idx], bonus: Number(e.target.value) };
													setCart(u);
												}}
												className="w-full px-2 py-1.5 border border-indigo-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white"
											/>
										</div>
									</div>
								</div>
							))
						)}

						{/* Info Customer & Pengiriman (collapsible) */}
						<div className="border-t border-gray-100 pt-3">
							<button
								onClick={() => setShowInfoSection((s) => !s)}
								className="w-full flex items-center justify-between text-sm font-medium text-gray-700">
								<span className="flex items-center gap-2">
									<Truck size={14} className="text-gray-400" /> Info Customer &amp; Pengiriman
								</span>
								{showInfoSection ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
							</button>
							{showInfoSection && (
								<div className="grid grid-cols-2 gap-2.5 mt-3">
									<div className="col-span-2">
										<label className="block text-xs text-gray-500 mb-1">Nama Customer</label>
										<input
											value={formHeader.nama_customer}
											onChange={(e) => setFormHeader({ ...formHeader, nama_customer: e.target.value })}
											placeholder="Opsional"
											className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
										/>
									</div>
									<div>
										<label className="block text-xs text-gray-500 mb-1">No. Telepon Customer</label>
										<input
											value={formHeader.telepon_customer}
											onChange={(e) => setFormHeader({ ...formHeader, telepon_customer: e.target.value })}
											placeholder="08xx"
											className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
										/>
									</div>
									<div>
										<label className="block text-xs text-gray-500 mb-1">Tujuan Pengiriman</label>
										<input
											value={formHeader.tujuan}
											onChange={(e) => setFormHeader({ ...formHeader, tujuan: e.target.value })}
											placeholder="Kota tujuan"
											className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
										/>
									</div>
									<div>
										<label className="block text-xs text-gray-500 mb-1">Sopir</label>
										<input
											value={formHeader.sopir}
											onChange={(e) => setFormHeader({ ...formHeader, sopir: e.target.value })}
											placeholder="Nama sopir"
											className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
										/>
									</div>
									<div>
										<label className="block text-xs text-gray-500 mb-1">No. Telepon Sopir</label>
										<input
											value={formHeader.telepon_sopir}
											onChange={(e) => setFormHeader({ ...formHeader, telepon_sopir: e.target.value })}
											placeholder="08xx"
											className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
										/>
									</div>
									<div className="col-span-2">
										<label className="block text-xs text-gray-500 mb-1">Catatan</label>
										<input
											value={formHeader.catatan}
											onChange={(e) => setFormHeader({ ...formHeader, catatan: e.target.value })}
											placeholder="Opsional"
											className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
										/>
									</div>
								</div>
							)}
						</div>

						{/* Pembayaran */}
						<div className="border-t border-gray-100 pt-3 space-y-2.5">
							<p className="text-sm font-medium text-gray-700">Pembayaran</p>
							<div className="grid grid-cols-2 gap-2.5">
								<div>
									<label className="block text-xs text-gray-500 mb-1">Metode Bayar</label>
									<select
										value={formHeader.metode_bayar}
										onChange={(e) => setFormHeader({ ...formHeader, metode_bayar: e.target.value })}
										className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
										<option value="transfer">Transfer</option>
										<option value="cod">COD</option>
										<option value="cash">Cash</option>
									</select>
								</div>
								<div>
									<label className="block text-xs text-gray-500 mb-1">Status Bayar</label>
									<select
										value={formHeader.status_bayar}
										onChange={(e) => setFormHeader({ ...formHeader, status_bayar: e.target.value })}
										className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
										<option value="lunas">Lunas</option>
										<option value="dp">DP</option>
										<option value="belum_bayar">Belum Bayar</option>
									</select>
								</div>
								{formHeader.status_bayar === "dp" && (
									<div className="col-span-2">
										<label className="block text-xs text-gray-500 mb-1">Uang DP</label>
										<input
											type="number"
											value={formHeader.uang_dp}
											onChange={(e) => setFormHeader({ ...formHeader, uang_dp: e.target.value })}
											className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
										/>
									</div>
								)}
							</div>
						</div>

						{/* Bonus dari Owner (superadmin only, collapsible) */}
						{isSuperAdmin && (
							<div className="border-t border-gray-100 pt-3">
								<button
									onClick={() => setShowBonusOwner((s) => !s)}
									className="w-full flex items-center justify-between text-sm font-medium text-amber-700">
									<span className="flex items-center gap-2">
										<Gift size={14} /> Bonus dari Owner (Opsional)
									</span>
									{showBonusOwner ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
								</button>
								{showBonusOwner && (
									<div className="grid grid-cols-2 gap-2.5 mt-3">
										<div>
											<label className="block text-xs text-gray-500 mb-1">Nominal Bonus</label>
											<input
												type="number"
												min="0"
												value={formHeader.bonus_owner}
												onChange={(e) => setFormHeader({ ...formHeader, bonus_owner: e.target.value })}
												placeholder="0"
												className="w-full px-3 py-2 border border-amber-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 bg-amber-50"
											/>
										</div>
										<div>
											<label className="block text-xs text-gray-500 mb-1">Catatan</label>
											<input
												type="text"
												value={formHeader.catatan_bonus_owner}
												onChange={(e) => setFormHeader({ ...formHeader, catatan_bonus_owner: e.target.value })}
												placeholder="Misal: apresiasi"
												className="w-full px-3 py-2 border border-amber-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 bg-amber-50"
											/>
										</div>
									</div>
								)}
							</div>
						)}
					</div>

					{/* Ringkasan Total & Checkout */}
					<div className="p-4 border-t border-gray-100 space-y-3">
						<div className="bg-indigo-50 rounded-xl p-3.5 space-y-1.5">
							<div className="flex justify-between text-sm">
								<span className="text-gray-600">Total Harga Jual Reseller</span>
								<span className="font-medium">{formatRupiah(totals.jual)}</span>
							</div>
							<div className="flex justify-between text-sm">
								<span className="text-gray-600">Total Ongkir</span>
								<span className="font-medium">{formatRupiah(totals.ongkir)}</span>
							</div>
							<div className="flex justify-between text-sm font-semibold border-t border-indigo-200 pt-1.5">
								<span>Grand Total</span>
								<span>{formatRupiah(grandTotalCart)}</span>
							</div>
							{formHeader.status_bayar === "dp" && (
								<>
									<div className="flex justify-between text-sm">
										<span className="text-yellow-600">DP</span>
										<span className="text-yellow-600">{formatRupiah(Number(formHeader.uang_dp))}</span>
									</div>
									<div className="flex justify-between text-sm font-semibold text-red-600">
										<span>Sisa Tagihan</span>
										<span>{formatRupiah(grandTotalCart - Number(formHeader.uang_dp))}</span>
									</div>
								</>
							)}
							<div className="flex justify-between text-sm text-purple-600">
								<span>Total Bonus Reseller</span>
								<span>{formatRupiah(totals.bonus)}</span>
							</div>
							{isSuperAdmin && Number(formHeader.bonus_owner) > 0 && (
								<div className="flex justify-between text-sm text-amber-600">
									<span>Bonus dari Owner</span>
									<span>{formatRupiah(Number(formHeader.bonus_owner))}</span>
								</div>
							)}
							{isSuperAdmin && (
								<div className="flex justify-between text-sm text-green-700 font-medium border-t border-indigo-200 pt-1.5">
									<span>Total Laba Toko</span>
									<span>{formatRupiah(totals.laba)}</span>
								</div>
							)}
						</div>
						<button
							onClick={savePenjualan}
							disabled={saving || cart.length === 0}
							className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white px-4 py-3 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition">
							<ShoppingCart size={16} />
							{saving ? "Memproses..." : "Proses Transaksi"}
						</button>
					</div>
				</div>
			</div>

			{/* Modal Tambah Reseller */}
			{modalTambahReseller && (
				<div className="fixed inset-0 bg-black/40 z-[60] flex items-center justify-center p-4">
					<div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl">
						<div className="flex items-center justify-between p-5 border-b border-gray-100">
							<h2 className="text-base font-semibold">Tambah Reseller Baru</h2>
							<button onClick={() => setModalTambahReseller(false)} className="p-1.5 hover:bg-gray-100 rounded-lg">
								<X size={16} />
							</button>
						</div>
						<div className="p-5 space-y-3">
							<div>
								<label className="block text-sm font-medium text-gray-700 mb-1">Nama *</label>
								<input
									value={formReseller.nama}
									onChange={(e) => setFormReseller((f) => ({ ...f, nama: e.target.value }))}
									className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
								/>
							</div>
							<div>
								<label className="block text-sm font-medium text-gray-700 mb-1">Telepon</label>
								<input
									value={formReseller.telepon}
									onChange={(e) => setFormReseller((f) => ({ ...f, telepon: e.target.value }))}
									placeholder="08xx"
									className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
								/>
							</div>
						</div>
						<div className="flex gap-3 p-5 pt-0">
							<button
								onClick={() => setModalTambahReseller(false)}
								className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium hover:bg-gray-50">
								Batal
							</button>
							<button
								onClick={saveReseller}
								disabled={savingReseller || !formReseller.nama}
								className="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white px-4 py-2.5 rounded-xl text-sm font-medium">
								{savingReseller ? "Menyimpan..." : "Simpan"}
							</button>
						</div>
					</div>
				</div>
			)}

			{/* Modal Sukses Resi */}
			{resiSukses &&
				(() => {
					const trackingUrl = `${typeof window !== "undefined" ? window.location.origin : ""}/resi/${resiSukses}`;
					const pesanWA = `Halo! Pesanan Anda sedang diproses. Pantau status pengiriman Anda di link berikut:%0A${encodeURIComponent(trackingUrl)}`;
					return (
						<div className="fixed inset-0 bg-black/50 z-[80] flex items-center justify-center p-4">
							<div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl text-center overflow-hidden">
								<div className="bg-green-50 px-6 pt-8 pb-6">
									<div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
										<CheckCircle2 size={28} className="text-green-600" />
									</div>
									<h3 className="text-lg font-bold text-gray-900">Transaksi Tersimpan!</h3>
									<p className="text-sm text-gray-500 mt-1">Nomor resi tracking customer:</p>
									<div className="mt-3 bg-white border-2 border-green-200 rounded-xl px-4 py-3">
										<p className="text-xl font-bold font-mono tracking-widest text-green-700">{resiSukses}</p>
									</div>
								</div>
								<div className="px-6 py-5 space-y-3">
									<button
										onClick={() => navigator.clipboard.writeText(trackingUrl)}
										className="w-full flex items-center justify-center gap-2 py-2.5 border-2 border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition">
										<Copy size={15} /> Copy Link Tracking
									</button>
									{resiTeleponCustomer && (
										<a
											href={waLink(resiTeleponCustomer) + `?text=${pesanWA}`}
											target="_blank"
											rel="noopener noreferrer"
											className="w-full flex items-center justify-center gap-2 py-2.5 bg-green-500 hover:bg-green-600 text-white rounded-xl text-sm font-semibold transition">
											<Link2 size={15} /> Kirim ke Customer via WA
										</a>
									)}
									{lastSaved && (
										<button
											onClick={() => printInvoice(lastSaved)}
											className="w-full flex items-center justify-center gap-2 py-2.5 border-2 border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition">
											<Printer size={15} /> Cetak Invoice
										</button>
									)}
									<button
										onClick={tutupSukses}
										className="w-full flex items-center justify-center gap-2 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold transition">
										<RotateCcw size={15} /> Transaksi Baru
									</button>
								</div>
							</div>
						</div>
					);
				})()}
		</div>
	);
}
