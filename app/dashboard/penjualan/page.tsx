"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Produk, Reseller, PenjualanItem } from "@/lib/types";
import {
	formatRupiah,
	formatDate,
	waLink,
	insertPenjualanWithResi,
	exportToExcel,
} from "@/lib/utils";
import { printInvoice } from "@/lib/printInvoice";
import Link from "next/link";
import {
	Plus,
	Search,
	X,
	Trash2,
	Eye,
	ShoppingCart,
	CreditCard,
	AlertCircle,
	Printer,
	Flag,
	ThumbsUp,
	StickyNote,
	CheckCircle2,
	MessageSquare,
	Link2,
	Copy,
	PackageCheck,
	Gift,
	FileSpreadsheet,
	Package,
	Users,
	Calendar,
	Image as ImageIcon,
	Clock,
	Factory,
	Truck,
} from "lucide-react";

interface CartItem extends PenjualanItem {
	produk_nama: string;
	produk_satuan: string;
}

export default function PenjualanPage() {
	const { isSuperAdmin, profile, role } = useAuth();
	const supabase = createClient();
	const [penjualan, setPenjualan] = useState<any[]>([]);
	const [fotoMap, setFotoMap] = useState<Record<string, string>>({});
	const [produkList, setProdukList] = useState<Produk[]>([]);
	const [resellerList, setResellerList] = useState<Reseller[]>([]);
	const [loading, setLoading] = useState(true);
	const [search, setSearch] = useState("");
	const [filterStatus, setFilterStatus] = useState<"semua" | "belum_lunas">(
		"semua",
	);
	const [filterMilestone, setFilterMilestone] = useState<
		"semua" | "diproses" | "diproduksi" | "dikirim" | "selesai"
	>("semua");
	const [modal, setModal] = useState<
		"form" | "detail" | "pelunasan" | "bonus_owner" | null
	>(null);
	const [bonusOwnerForm, setBonusOwnerForm] = useState({
		bonus_owner: "0",
		catatan_bonus_owner: "",
	});
	const [savingBonus, setSavingBonus] = useState(false);
	const [selected, setSelected] = useState<any | null>(null);
	const [saving, setSaving] = useState(false);
	const [filterTanggal, setFilterTanggal] = useState({ dari: "", sampai: "" });
	useEffect(() => {
		const now = new Date();
		const sampai = now.toISOString().split("T")[0];
		const dari = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate())
			.toISOString()
			.split("T")[0];
		setFilterTanggal({ dari, sampai });
	}, []);

	// Pelunasan form
	const [pelunasanForm, setPelunasanForm] = useState({
		tambahan_bayar: "",
		metode_bayar: "transfer",
		catatan: "",
	});
	const [buktiFile, setBuktiFile] = useState<File | null>(null);
	const [buktiPreview, setBuktiPreview] = useState<string | null>(null);

	// Review form
	const [reviewForm, setReviewForm] = useState({ tipe: "komplain", isi: "" });
	const [savingReview, setSavingReview] = useState(false);
	const [showReviewForm, setShowReviewForm] = useState(false);

	// Form state
	const [cart, setCart] = useState<CartItem[]>([]);
	const [formHeader, setFormHeader] = useState({
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
	});
	const [produkSearch, setProdukSearch] = useState("");
	const [showProdukDropdown, setShowProdukDropdown] = useState(false);
	const [resellerSearch, setResellerSearch] = useState("");
	const [showResellerDropdown, setShowResellerDropdown] = useState(false);
	const [modalTambahReseller, setModalTambahReseller] = useState(false);
	const [formReseller, setFormReseller] = useState({ nama: "", telepon: "" });
	const [savingReseller, setSavingReseller] = useState(false);

	// PO linking
	const [formDariPO, setFormDariPO] = useState(false);
	const [formPoId, setFormPoId] = useState("");
	const [poSelesaiList, setPoSelesaiList] = useState<any[]>([]);

	// Modal sukses resi
	const [resiSukses, setResiSukses] = useState<string | null>(null);
	const [resiTeleponCustomer, setResiTeleponCustomer] = useState<string | null>(
		null,
	);
	const [resiTujuan, setResiTujuan] = useState<string | null>(null);

	useEffect(() => {
		loadAll();
	}, []);

	const loadAll = async () => {
		const [penjualanRes, produkRes, resellerRes, reviewRes] = await Promise.all(
			[
				supabase
					.from("penjualan")
					.select(
						"*, reseller:resellers(nama), items:penjualan_item(id, produk_id, jumlah, produk:produk(nama, foto_url))",
					)
					.order("created_at", { ascending: false })
					.limit(100),
				supabase.from("produk").select("*").eq("aktif", true).order("nama"),
				supabase.from("resellers").select("*").eq("aktif", true).order("nama"),
				supabase
					.from("reseller_reviews")
					.select("penjualan_id, tipe")
					.eq("status", "open"),
			],
		);
		const openKomplain = new Set(
			(reviewRes.data || [])
				.filter((r) => r.tipe === "komplain")
				.map((r) => r.penjualan_id),
		);
		setPenjualan(
			(penjualanRes.data || []).map((p) => ({
				...p,
				has_open_komplain: openKomplain.has(p.id),
			})),
		);

		const produkIds = Array.from(
			new Set(
				(penjualanRes.data || []).flatMap((p: any) =>
					(p.items || [])
						.map((i: any) => i.produk_id)
						.filter((v: any): v is string => !!v),
				),
			),
		);
		if (produkIds.length) {
			const { data: fotos } = await supabase
				.from("produk_foto")
				.select("produk_id, url")
				.in("produk_id", produkIds)
				.order("urutan");
			const map: Record<string, string> = {};
			(fotos || []).forEach((f: any) => {
				if (!map[f.produk_id]) map[f.produk_id] = f.url;
			});
			setFotoMap(map);
		}

		setProdukList(produkRes.data || []);
		setResellerList(resellerRes.data || []);
		setLoading(false);
	};

	const openForm = () => {
		setCart([]);
		setFormHeader({
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
		});
		setProdukSearch("");
		setFormDariPO(false);
		setFormPoId("");
		supabase
			.from("purchase_orders")
			.select("id, nomor_po, nama_customer, status, reseller:resellers(nama)")
			.neq("status", "batal")
			.order("created_at", { ascending: false })
			.then(({ data }) => setPoSelesaiList(data || []));
		setModal("form");
	};
	const saveReseller = async () => {
		setSavingReseller(true);
		const { data } = await supabase
			.from("resellers")
			.insert({ ...formReseller, aktif: true })
			.select()
			.single();
		if (data) {
			setResellerList((prev) =>
				[...prev, data].sort((a, b) => a.nama.localeCompare(b.nama)),
			);
			setFormHeader((f) => ({ ...f, reseller_id: data.id }));
			setResellerSearch(data.nama);
		}
		setSavingReseller(false);
		setModalTambahReseller(false);
		setFormReseller({ nama: "", telepon: "" });
	};

	const selectedReseller = resellerList.find(
		(r) => r.id === formHeader.reseller_id,
	);

	const filteredResellerSearch = resellerList
		.filter((r) => r.nama.toLowerCase().includes(resellerSearch.toLowerCase()))
		.slice(0, 6);

	const openDetail = async (id: string) => {
		const [{ data }, { data: reviews }] = await Promise.all([
			supabase
				.from("penjualan")
				.select(
					"*, reseller:resellers(*), items:penjualan_item(*, produk:produk(nama, satuan)), pembayaran:penjualan_pembayaran(*)",
				)
				.eq("id", id)
				.single(),
			supabase
				.from("reseller_reviews")
				.select("*, creator:profiles!created_by(name)")
				.eq("penjualan_id", id)
				.order("created_at", { ascending: false }),
		]);
		setSelected({ ...data, reviews: reviews || [] });
		setShowReviewForm(false);
		setReviewForm({ tipe: "komplain", isi: "" });
		setModal("detail");
	};

	const saveReview = async () => {
		if (!selected || !reviewForm.isi.trim()) return;
		setSavingReview(true);
		const { data } = await supabase
			.from("reseller_reviews")
			.insert({
				penjualan_id: selected.id,
				reseller_id: selected.reseller_id || null,
				tipe: reviewForm.tipe,
				isi: reviewForm.isi.trim(),
			})
			.select("*, creator:profiles!created_by(name)")
			.single();
		if (data) {
			setSelected((s: any) => ({
				...s,
				reviews: [data, ...(s.reviews || [])],
			}));
			if (reviewForm.tipe === "komplain") {
				setPenjualan((prev) =>
					prev.map((p) =>
						p.id === selected.id ? { ...p, has_open_komplain: true } : p,
					),
				);
			}
			setReviewForm({ tipe: "komplain", isi: "" });
			setShowReviewForm(false);
		}
		setSavingReview(false);
	};

	const resolveReview = async (reviewId: string) => {
		await supabase
			.from("reseller_reviews")
			.update({ status: "resolved", resolved_at: new Date().toISOString() })
			.eq("id", reviewId);
		setSelected((s: any) => ({
			...s,
			reviews: s.reviews.map((r: any) =>
				r.id === reviewId ? { ...r, status: "resolved" } : r,
			),
		}));
		// Recalculate badge: if no more open complaints for this penjualan
		const stillOpen = selected.reviews?.some(
			(r: any) =>
				r.id !== reviewId && r.status === "open" && r.tipe === "komplain",
		);
		if (!stillOpen) {
			setPenjualan((prev) =>
				prev.map((p) =>
					p.id === selected.id ? { ...p, has_open_komplain: false } : p,
				),
			);
		}
	};

	const openPelunasan = async (p: any) => {
		const grandTotal = p.total_harga_jual;
		const sisa = grandTotal - p.uang_dp;
		setSelected({ ...p, grand_total: grandTotal, sisa_tagihan: sisa });
		setPelunasanForm({
			tambahan_bayar: String(sisa),
			metode_bayar: "transfer",
			catatan: "",
		});
		setBuktiFile(null);
		setBuktiPreview(null);
		setModal("pelunasan");
	};

	const openBonusOwner = (p: any) => {
		setSelected(p);
		setBonusOwnerForm({
			bonus_owner: String(p.bonus_owner || 0),
			catatan_bonus_owner: p.catatan_bonus_owner || "",
		});
		setModal("bonus_owner");
	};

	const saveBonusOwner = async () => {
		if (!selected) return;
		setSavingBonus(true);
		await supabase
			.from("penjualan")
			.update({
				bonus_owner: Number(bonusOwnerForm.bonus_owner) || 0,
				catatan_bonus_owner: bonusOwnerForm.catatan_bonus_owner || null,
			})
			.eq("id", selected.id);
		setSavingBonus(false);
		setModal(null);
		// Update lokal agar tabel langsung reflect tanpa reload penuh
		setPenjualan((prev) =>
			prev.map((p) =>
				p.id === selected.id
					? {
							...p,
							bonus_owner: Number(bonusOwnerForm.bonus_owner) || 0,
							catatan_bonus_owner: bonusOwnerForm.catatan_bonus_owner,
						}
					: p,
			),
		);
	};

	const savePelunasan = async () => {
		if (!selected) return;
		setSaving(true);
		const tambahan = Number(pelunasanForm.tambahan_bayar);
		const totalDibayar = selected.uang_dp + tambahan;
		const grandTotal = selected.grand_total;
		const statusBaru = totalDibayar >= grandTotal ? "lunas" : "dp";

		let foto_url: string | null = null;
		if (buktiFile) {
			const ext = buktiFile.name.split(".").pop();
			const path = `pelunasan/${selected.id}/${Date.now()}.${ext}`;
			const { error: upErr } = await supabase.storage
				.from("BungaNaik")
				.upload(path, buktiFile);
			if (!upErr) {
				const { data: urlData } = supabase.storage
					.from("BungaNaik")
					.getPublicUrl(path);
				foto_url = urlData.publicUrl;
			}
		}

		await supabase
			.from("penjualan")
			.update({ uang_dp: totalDibayar, status_bayar: statusBaru })
			.eq("id", selected.id);

		await supabase.from("penjualan_pembayaran").insert({
			penjualan_id: selected.id,
			jumlah: tambahan,
			metode: pelunasanForm.metode_bayar,
			catatan: pelunasanForm.catatan || null,
			foto_url,
		});

		setSaving(false);
		setModal(null);
		setBuktiFile(null);
		setBuktiPreview(null);
		loadAll();
	};

	const hapusPenjualan = async (id: string) => {
		if (!confirm("Yakin hapus penjualan ini? Stok akan dikembalikan.")) return;
		const { data: items } = await supabase
			.from("penjualan_item")
			.select("*, produk:produk(stok)")
			.eq("penjualan_id", id);

		for (const item of items || []) {
			const stokBaru = (item.produk?.stok || 0) + item.jumlah;
			await supabase
				.from("produk")
				.update({ stok: stokBaru })
				.eq("id", item.produk_id);
			await supabase.from("mutasi_stok").insert({
				produk_id: item.produk_id,
				tipe: "masuk",
				jumlah: item.jumlah,
				stok_sebelum: item.produk?.stok || 0,
				stok_sesudah: stokBaru,
				keterangan: "Pembatalan penjualan",
			});
		}
		await supabase.from("penjualan").delete().eq("id", id);
		loadAll();
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
			});
		}
		setCart(newCart);
	};

	const addToCart = (p: Produk) => {
		if (cart.find((c) => c.produk_id === p.id)) return;
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
			},
		]);
		setProdukSearch("");
		setShowProdukDropdown(false);
	};

	const updateCartItem = (idx: number, field: string, value: any) => {
		const updated = [...cart];
		updated[idx] = { ...updated[idx], [field]: Number(value) };
		// Recalculate bonus: harga_jual - harga_katalog - ongkir
		updated[idx].bonus = Math.max(
			0,
			updated[idx].harga_jual -
				updated[idx].harga_katalog -
				updated[idx].ongkir,
		);
		setCart(updated);
	};

	const removeFromCart = (idx: number) =>
		setCart(cart.filter((_, i) => i !== idx));

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

	const savePenjualan = async () => {
		if (cart.length === 0) return;
		setSaving(true);

		const milestoneAwal = formDariPO && formPoId ? "diproduksi" : "diproses";

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
			formHeader.status_bayar === "lunas"
				? totals.jual
				: Number(formHeader.uang_dp);
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
			await supabase
				.from("produk")
				.update({ stok: stokBaru })
				.eq("id", item.produk_id);
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

		setSaving(false);
		setModal(null);
		setResiSukses(pj.nomor_resi);
		setResiTeleponCustomer(formHeader.telepon_customer || null);
		setResiTujuan(formHeader.tujuan || null);
		loadAll();
	};

	// Summary stats untuk belum lunas
	const belumLunas = penjualan.filter((p) => p.status_bayar !== "lunas");
	const totalDP = belumLunas.reduce((s, p) => s + p.uang_dp, 0);
	const totalSisa = belumLunas.reduce(
		(s, p) => s + (p.total_harga_jual - p.uang_dp),
		0,
	);

	// Summary stats per milestone pengiriman
	const countDiproses = penjualan.filter(
		(p) => p.milestone === "diproses",
	).length;
	const countDiproduksi = penjualan.filter(
		(p) => p.milestone === "diproduksi",
	).length;
	const countDikirim = penjualan.filter(
		(p) => p.milestone === "dikirim",
	).length;
	const countSelesai = penjualan.filter(
		(p) => p.milestone === "selesai",
	).length;

	const filteredProdukSearch = produkList
		.filter(
			(p) =>
				p.nama.toLowerCase().includes(produkSearch.toLowerCase()) && p.stok > 0,
		)
		.slice(0, 6);

	const filtered = penjualan
		.filter((p) =>
			filterStatus === "semua" ? true : p.status_bayar !== "lunas",
		)
		.filter((p) =>
			filterMilestone === "semua" ? true : p.milestone === filterMilestone,
		)
		.filter((p) => {
			if (filterTanggal.dari && p.tanggal < filterTanggal.dari + "T00:00:00")
				return false;
			if (
				filterTanggal.sampai &&
				p.tanggal > filterTanggal.sampai + "T23:59:59"
			)
				return false;
			return true;
		})
		.filter(
			(p) =>
				p.nomor_faktur.toLowerCase().includes(search.toLowerCase()) ||
				(p.reseller?.nama || "").toLowerCase().includes(search.toLowerCase()) ||
				(p.tujuan || "").toLowerCase().includes(search.toLowerCase()),
		);

	const handleExportExcel = () => {
		const rows = filtered.map((p) => {
			const grandTotal = p.total_harga_jual;
			const sisa = grandTotal - p.uang_dp;
			const row: Record<string, any> = {
				"No. Faktur": p.nomor_faktur,
				"No. Resi": p.nomor_resi || "-",
				Reseller: p.reseller?.nama || "Umum",
				Tanggal: formatDate(p.tanggal),
				"Grand Total": grandTotal,
				DP: p.uang_dp,
				Ongkir: p.total_ongkir,
				Sisa: p.status_bayar === "lunas" ? 0 : sisa,
				"Status Bayar":
					p.status_bayar === "lunas"
						? "Lunas"
						: p.status_bayar === "dp"
							? "DP"
							: "Belum Bayar",
				"Metode Bayar": p.metode_bayar,
				Milestone: p.milestone || "-",
				Tujuan: p.tujuan || "-",
			};
			if (isSuperAdmin) {
				row["Laba"] = p.total_laba;
				row["Bonus Reseller"] = p.total_bonus;
				row["Bonus Owner"] = p.bonus_owner || 0;
			}
			return row;
		});
		exportToExcel(
			`Penjualan_${new Date().toISOString().slice(0, 10)}`,
			"Penjualan",
			rows,
		);
	};

	return (
		<div>
			<div className="flex items-center justify-between mb-6">
				<div>
					<h1 className="text-2xl font-bold text-gray-900">Penjualan</h1>
					<p className="text-gray-500 mt-1">{penjualan.length} transaksi</p>
				</div>
				<div className="flex items-center gap-2">
					<button
						onClick={handleExportExcel}
						disabled={filtered.length === 0}
						className="flex items-center gap-2 border border-gray-200 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed text-gray-700 px-4 py-2.5 rounded-xl text-sm font-medium transition">
						<FileSpreadsheet size={16} className="text-green-600" /> Export
						Excel
					</button>
					<button
						onClick={openForm}
						className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition">
						<Plus size={16} /> Penjualan Baru
					</button>
				</div>
			</div>

			{/* Kartu Ringkasan Belum Lunas */}
			{belumLunas.length > 0 && (
				<div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
					<div className="bg-red-50 border border-red-200 rounded-2xl p-4">
						<div className="flex items-center gap-2 mb-1">
							<AlertCircle size={16} className="text-red-500" />
							<p className="text-sm font-medium text-red-700">
								Transaksi Belum Lunas
							</p>
						</div>
						<p className="text-2xl font-bold text-red-600">
							{belumLunas.length}
						</p>
					</div>
					<div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-4">
						<p className="text-sm font-medium text-yellow-700 mb-1">
							Total DP Terkumpul
						</p>
						<p className="text-2xl font-bold text-yellow-600">
							{formatRupiah(totalDP)}
						</p>
					</div>
					<div className="bg-orange-50 border border-orange-200 rounded-2xl p-4">
						<p className="text-sm font-medium text-orange-700 mb-1">
							Total Sisa Tagihan
						</p>
						<p className="text-2xl font-bold text-orange-600">
							{formatRupiah(totalSisa)}
						</p>
					</div>
				</div>
			)}

			{/* Kartu Ringkasan Milestone Pengiriman — klik untuk filter */}
			<div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
				{[
					{
						v: "diproses" as const,
						label: "Diproses",
						count: countDiproses,
						icon: Clock,
						active: "border-blue-300 bg-blue-50 ring-2 ring-blue-200",
						idle: "border-gray-100 hover:border-blue-200",
						iconColor: "text-blue-500",
						textColor: "text-blue-600",
					},
					{
						v: "diproduksi" as const,
						label: "Diproduksi",
						count: countDiproduksi,
						icon: Factory,
						active: "border-purple-300 bg-purple-50 ring-2 ring-purple-200",
						idle: "border-gray-100 hover:border-purple-200",
						iconColor: "text-purple-500",
						textColor: "text-purple-600",
					},
					{
						v: "dikirim" as const,
						label: "Sudah Dikirim",
						count: countDikirim,
						icon: Truck,
						active: "border-indigo-300 bg-indigo-50 ring-2 ring-indigo-200",
						idle: "border-gray-100 hover:border-indigo-200",
						iconColor: "text-indigo-500",
						textColor: "text-indigo-600",
					},
					{
						v: "selesai" as const,
						label: "Selesai",
						count: countSelesai,
						icon: CheckCircle2,
						active: "border-green-300 bg-green-50 ring-2 ring-green-200",
						idle: "border-gray-100 hover:border-green-200",
						iconColor: "text-green-500",
						textColor: "text-green-600",
					},
				].map((card) => {
					const Icon = card.icon;
					const isActive = filterMilestone === card.v;
					return (
						<button
							key={card.v}
							onClick={() => setFilterMilestone(isActive ? "semua" : card.v)}
							className={`text-left bg-white border rounded-2xl p-4 transition ${
								isActive ? card.active : card.idle
							}`}>
							<div className="flex items-center gap-2 mb-1">
								<Icon size={16} className={card.iconColor} />
								<p className={`text-sm font-medium ${card.textColor}`}>
									{card.label}
								</p>
							</div>
							<p className="text-2xl font-bold text-gray-900">{card.count}</p>
						</button>
					);
				})}
			</div>

			{/* Tambahkan setelah div toggle Semua/Belum Lunas */}
			<div className="flex items-center gap-2 mb-5">
				<input
					type="date"
					value={filterTanggal.dari}
					onChange={(e) =>
						setFilterTanggal((f) => ({ ...f, dari: e.target.value }))
					}
					className="px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
				/>
				<span className="text-gray-400 text-sm">—</span>
				<input
					type="date"
					value={filterTanggal.sampai}
					onChange={(e) =>
						setFilterTanggal((f) => ({ ...f, sampai: e.target.value }))
					}
					className="px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
				/>
				{(filterTanggal.dari || filterTanggal.sampai) && (
					<button
						onClick={() => setFilterTanggal({ dari: "", sampai: "" })}
						className="p-2 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-600">
						<X size={15} />
					</button>
				)}
			</div>

			{/* Filter & Search */}
			<div className="flex flex-wrap gap-3 mb-6">
				<div className="relative flex-1 min-w-48">
					<Search
						size={16}
						className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
					/>
					<input
						value={search}
						onChange={(e) => setSearch(e.target.value)}
						placeholder="Cari faktur, reseller, tujuan..."
						className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
					/>
				</div>
				<div className="flex rounded-xl border border-gray-200 overflow-hidden">
					{[
						{ v: "semua", label: "Semua" },
						{ v: "belum_lunas", label: `Belum Lunas (${belumLunas.length})` },
					].map((opt) => (
						<button
							key={opt.v}
							onClick={() => setFilterStatus(opt.v as any)}
							className={`px-4 py-2.5 text-sm font-medium transition ${filterStatus === opt.v ? "bg-indigo-600 text-white" : "bg-white text-gray-600 hover:bg-gray-50"}`}>
							{opt.label}
						</button>
					))}
				</div>
				{filterMilestone !== "semua" && (
					<button
						onClick={() => setFilterMilestone("semua")}
						className="flex items-center gap-1.5 px-3 py-2.5 bg-indigo-50 text-indigo-700 rounded-xl text-sm font-medium hover:bg-indigo-100 transition">
						Milestone: {filterMilestone}
						<X size={13} />
					</button>
				)}
			</div>

			{/* Daftar Penjualan */}
			<div className="space-y-3">
				{loading ? (
					<div className="text-center py-12 text-gray-400">Memuat...</div>
				) : filtered.length === 0 ? (
					<div className="text-center py-12 text-gray-400">
						Tidak ada penjualan
					</div>
				) : (
					filtered.map((p) => {
						const grandTotal = p.total_harga_jual;
						const sisa = grandTotal - p.uang_dp;
						const firstItem = (p.items || [])[0];
						const foto =
							firstItem &&
							((firstItem.produk_id && fotoMap[firstItem.produk_id]) ||
								firstItem.produk?.foto_url);
						const totalBonus = (p.total_bonus || 0) + (p.bonus_owner || 0);
						const bonusSisa = Math.max(0, totalBonus - (p.bonus_terbayar || 0));
						const bonusLunas = totalBonus > 0 && bonusSisa === 0;
						return (
							<div
								key={p.id}
								className={`bg-white rounded-2xl p-5 shadow-sm border transition hover:shadow-md ${
									p.status_bayar !== "lunas"
										? "border-red-100 bg-red-50/20"
										: "border-gray-100"
								}`}>
								<div className="flex items-start gap-4">
									{/* Foto barang */}
									<div className="w-28 h-28 rounded-xl overflow-hidden bg-gray-50 border border-gray-200 flex items-center justify-center flex-shrink-0">
										{foto ? (
											<img
												src={foto}
												alt=""
												className="w-full h-full object-cover"
											/>
										) : (
											<ImageIcon size={26} className="text-gray-300" />
										)}
									</div>

									<div className="flex-1 min-w-0 flex items-start justify-between gap-3">
										<div className="flex-1 min-w-0">
											{/* Faktur + status */}
											<div className="flex items-center gap-2 flex-wrap">
												<Link
													href={`/dashboard/penjualan/${p.id}`}
													className="font-bold text-gray-900 hover:text-indigo-600 hover:underline">
													{p.nomor_faktur}
												</Link>
												{p.has_open_komplain && (
													<span
														title="Ada komplain terbuka"
														className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0"
													/>
												)}
												<span
													className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
														p.status_bayar === "lunas"
															? "bg-green-100 text-green-700"
															: p.status_bayar === "dp"
																? "bg-yellow-100 text-yellow-700"
																: "bg-red-100 text-red-700"
													}`}>
													{p.status_bayar === "lunas"
														? "Lunas"
														: p.status_bayar === "dp"
															? "DP"
															: "Belum Bayar"}
												</span>
											</div>

											{/* Reseller + tanggal */}
											<div className="flex items-center gap-4 mt-2 flex-wrap text-sm text-gray-600">
												<span className="flex items-center gap-1.5">
													<Users size={13} className="text-indigo-500" />
													{p.reseller?.nama || (
														<span className="text-gray-400">Umum</span>
													)}
												</span>
												<span className="flex items-center gap-1.5 text-gray-500">
													<Calendar size={13} /> {formatDate(p.tanggal)}
												</span>
											</div>

											{/* Nama barang */}
											{(p.items || []).length > 0 && (
												<div className="mt-2 space-y-0.5">
													{p.items.map((item: any, i: number) => (
														<p
															key={item.id || i}
															className="text-xs text-gray-700 flex items-center gap-1.5">
															<Package
																size={11}
																className="text-gray-400 flex-shrink-0"
															/>
															{item.produk?.nama || "Produk dihapus"}
															<span className="text-gray-400">
																×{item.jumlah}
															</span>
														</p>
													))}
												</div>
											)}

											{/* Ringkasan nominal */}
											<div className="flex flex-wrap gap-x-4 gap-y-1 mt-2.5 text-xs text-gray-500">
												<span>
													Grand Total{" "}
													<b className="text-gray-800">
														{formatRupiah(grandTotal)}
													</b>
												</span>
												<span>
													Harga Katalog{" "}
													<b className="text-gray-800">
														{formatRupiah(p.total_harga_katalog)}
													</b>
												</span>
												{p.uang_dp > 0 && (
													<span>
														DP{" "}
														<b className="text-yellow-600">
															{formatRupiah(p.uang_dp)}
														</b>
													</span>
												)}
												{p.total_ongkir > 0 && (
													<span>
														Ongkir{" "}
														<b className="text-yellow-600">
															{formatRupiah(p.total_ongkir)}
														</b>
													</span>
												)}
												{p.status_bayar !== "lunas" && sisa > 0 && (
													<span>
														Sisa{" "}
														<b className="text-red-600">{formatRupiah(sisa)}</b>
													</span>
												)}
												{isSuperAdmin && (
													<span>
														Laba{" "}
														<b className="text-green-600">
															{formatRupiah(p.total_laba)}
														</b>
													</span>
												)}
												{isSuperAdmin && totalBonus > 0 && (
													<span>
														Bonus{" "}
														<b className="text-gray-700">
															{formatRupiah(totalBonus)}
														</b>{" "}
														{bonusLunas ? (
															<span className="text-green-600 font-semibold">
																(Lunas)
															</span>
														) : (
															<span className="text-amber-600 font-semibold">
																(Sisa {formatRupiah(bonusSisa)})
															</span>
														)}
														{p.bonus_owner > 0 && (
															<span className="text-indigo-500">
																{" "}
																+{formatRupiah(p.bonus_owner)} owner
															</span>
														)}
														{p.reseller_id && (
															<span
																className={`ml-1 font-semibold ${p.bonus_disetujui_reseller ? "text-green-600" : "text-gray-400"}`}>
																{p.bonus_disetujui_reseller
																	? "· ✓ Disetujui reseller"
																	: "· Belum disetujui"}
															</span>
														)}
													</span>
												)}
											</div>
										</div>

										{/* Aksi */}
										<div className="flex items-center gap-1 flex-shrink-0">
											<button
												onClick={() => openDetail(p.id)}
												className="p-2 hover:bg-indigo-50 rounded-lg text-indigo-600 transition"
												title="Detail">
												<Eye size={15} />
											</button>
											{p.nomor_resi && (
												<button
													onClick={() => {
														const url = `${window.location.origin}/resi/${p.nomor_resi}`;
														navigator.clipboard.writeText(url);
													}}
													className="p-2 hover:bg-purple-50 rounded-lg text-purple-500 transition"
													title={`Copy link resi: ${p.nomor_resi}`}>
													<Copy size={15} />
												</button>
											)}
											<button
												onClick={async () => {
													const { data } = await supabase
														.from("penjualan")
														.select(
															"*, reseller:resellers(*), items:penjualan_item(*, produk:produk(nama, satuan)), pembayaran:penjualan_pembayaran(*)",
														)
														.eq("id", p.id)
														.single();
													if (data) printInvoice(data);
												}}
												className="p-2 hover:bg-gray-100 rounded-lg text-gray-600 transition"
												title="Cetak Invoice">
												<Printer size={15} />
											</button>
											{(isSuperAdmin ||
												role === "kasir" ||
												role === "keuangan" ||
												role === "gudang") &&
												p.status_bayar !== "lunas" && (
													<button
														onClick={() => openPelunasan(p)}
														className="p-2 hover:bg-green-50 rounded-lg text-green-600 transition"
														title="Pelunasan">
														<CreditCard size={15} />
													</button>
												)}
											{isSuperAdmin && (
												<button
													onClick={() => openBonusOwner(p)}
													className="p-2 hover:bg-amber-50 rounded-lg text-amber-500 transition"
													title="Edit Bonus Owner">
													<Gift size={15} />
												</button>
											)}
											{(isSuperAdmin ||
												role === "kasir" ||
												role === "kurir" ||
												role === "gudang" ||
												role === "keuangan") && (
												<button
													onClick={() => hapusPenjualan(p.id)}
													className="p-2 hover:bg-red-50 rounded-lg text-red-500 transition"
													title="Hapus">
													<Trash2 size={15} />
												</button>
											)}
										</div>
									</div>
								</div>
							</div>
						);
					})
				)}
			</div>

			{/* Modal Form Penjualan */}
			{modal === "form" && (
				<div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
					<div className="bg-white rounded-2xl w-full max-w-4xl shadow-2xl max-h-[90vh] flex flex-col">
						<div className="flex items-center justify-between p-6 border-b border-gray-100">
							<h2 className="text-lg font-semibold">Penjualan Baru</h2>
							<button
								onClick={() => setModal(null)}
								className="p-2 hover:bg-gray-100 rounded-lg">
								<X size={18} />
							</button>
						</div>
						<div className="flex-1 overflow-y-auto p-6 space-y-6">
							<div className="grid grid-cols-2 md:grid-cols-3 gap-4">
								<div className="col-span-2 md:col-span-1">
									<label className="block text-sm font-medium text-gray-700 mb-1">
										Reseller
									</label>
									<div className="relative">
										<Search
											size={14}
											className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
										/>
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
															setFormReseller({
																nama: resellerSearch,
																telepon: "",
															});
															setModalTambahReseller(true);
															setShowResellerDropdown(false);
														}}
														className="w-full flex items-center gap-2 px-4 py-3 text-sm text-indigo-600 hover:bg-indigo-50">
														<Plus size={14} /> Tambah "{resellerSearch}" sebagai
														reseller baru
													</button>
												) : (
													<>
														<button
															onClick={() => {
																setFormHeader((f) => ({
																	...f,
																	reseller_id: "",
																}));
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
																	setFormHeader((f) => ({
																		...f,
																		reseller_id: r.id,
																	}));
																	setResellerSearch(r.nama);
																	setShowResellerDropdown(false);
																}}
																className={`w-full flex items-center justify-between px-4 py-3 text-sm hover:bg-indigo-50 border-b border-gray-50 last:border-0 ${formHeader.reseller_id === r.id ? "bg-indigo-50" : ""}`}>
																<div className="text-left">
																	<p className="font-medium text-gray-900">
																		{r.nama}
																	</p>
																	{r.telepon && (
																		<p className="text-xs text-gray-400">
																			{r.telepon}
																		</p>
																	)}
																</div>
																{formHeader.reseller_id === r.id && (
																	<span className="text-indigo-500 text-xs">
																		✓
																	</span>
																)}
															</button>
														))}
														<button
															onClick={() => {
																setFormReseller({
																	nama: resellerSearch,
																	telepon: "",
																});
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
										<p className="text-xs text-indigo-600 mt-1">
											✓ {selectedReseller?.nama}
										</p>
									)}
								</div>
								<div>
									<label className="block text-sm font-medium text-gray-700 mb-1">
										Nama Customer
									</label>
									<input
										value={formHeader.nama_customer}
										onChange={(e) =>
											setFormHeader({
												...formHeader,
												nama_customer: e.target.value,
											})
										}
										placeholder="Nama end customer (opsional)"
										className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
									/>
								</div>
								<div>
									<label className="block text-sm font-medium text-gray-700 mb-1">
										No. Telepon Customer
									</label>
									<input
										value={formHeader.telepon_customer}
										onChange={(e) =>
											setFormHeader({
												...formHeader,
												telepon_customer: e.target.value,
											})
										}
										placeholder="08xx (opsional)"
										className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
									/>
								</div>
								<div>
									<label className="block text-sm font-medium text-gray-700 mb-1">
										Tujuan Pengiriman
									</label>
									<input
										value={formHeader.tujuan}
										onChange={(e) =>
											setFormHeader({ ...formHeader, tujuan: e.target.value })
										}
										placeholder="Kota tujuan"
										className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
									/>
								</div>
								<div>
									<label className="block text-sm font-medium text-gray-700 mb-1">
										Metode Bayar
									</label>
									<select
										value={formHeader.metode_bayar}
										onChange={(e) =>
											setFormHeader({
												...formHeader,
												metode_bayar: e.target.value,
											})
										}
										className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
										<option value="transfer">Transfer</option>
										<option value="cod">COD</option>
										<option value="cash">Cash</option>
									</select>
								</div>
								<div>
									<label className="block text-sm font-medium text-gray-700 mb-1">
										Status Bayar
									</label>
									<select
										value={formHeader.status_bayar}
										onChange={(e) =>
											setFormHeader({
												...formHeader,
												status_bayar: e.target.value,
											})
										}
										className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
										<option value="lunas">Lunas</option>
										<option value="dp">DP</option>
										<option value="belum_bayar">Belum Bayar</option>
									</select>
								</div>
								{formHeader.status_bayar === "dp" && (
									<div>
										<label className="block text-sm font-medium text-gray-700 mb-1">
											Uang DP
										</label>
										<input
											type="number"
											value={formHeader.uang_dp}
											onChange={(e) =>
												setFormHeader({
													...formHeader,
													uang_dp: e.target.value,
												})
											}
											className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
										/>
									</div>
								)}
								<div>
									<label className="block text-sm font-medium text-gray-700 mb-1">
										Sopir
									</label>
									<input
										value={formHeader.sopir}
										onChange={(e) =>
											setFormHeader({ ...formHeader, sopir: e.target.value })
										}
										placeholder="Nama sopir"
										className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
									/>
								</div>
								<div>
									<label className="block text-sm font-medium text-gray-700 mb-1">
										No. Telepon Sopir
									</label>
									<input
										value={formHeader.telepon_sopir}
										onChange={(e) =>
											setFormHeader({
												...formHeader,
												telepon_sopir: e.target.value,
											})
										}
										placeholder="Contoh: 08123456789"
										className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
									/>
								</div>
								<div>
									<label className="block text-sm font-medium text-gray-700 mb-1">
										Catatan
									</label>
									<input
										value={formHeader.catatan}
										onChange={(e) =>
											setFormHeader({ ...formHeader, catatan: e.target.value })
										}
										placeholder="Opsional"
										className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
									/>
								</div>
							</div>

							{/* Toggle Barang dari PO */}
							<div className="border border-gray-200 rounded-xl p-4">
								<button
									type="button"
									onClick={() => {
										setFormDariPO(!formDariPO);
										setFormPoId("");
									}}
									className={`w-full flex items-center justify-between transition`}>
									<div className="flex items-center gap-2.5">
										<PackageCheck
											size={16}
											className={
												formDariPO ? "text-indigo-600" : "text-gray-400"
											}
										/>
										<span
											className={`text-sm font-medium ${formDariPO ? "text-indigo-700" : "text-gray-600"}`}>
											Barang dari PO?
										</span>
									</div>
									<div
										className={`w-10 h-5 rounded-full transition-colors flex-shrink-0 ${formDariPO ? "bg-indigo-500" : "bg-gray-200"}`}>
										<div
											className={`w-4 h-4 bg-white rounded-full shadow-sm mt-0.5 transition-transform ${formDariPO ? "translate-x-5" : "translate-x-0.5"}`}
										/>
									</div>
								</button>
								{formDariPO && (
									<div className="mt-3">
										<label className="block text-xs font-medium text-gray-600 mb-1">
											Pilih PO
										</label>
										<select
											value={formPoId}
											onChange={(e) => handlePoSelect(e.target.value)}
											className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
											<option value="">-- Pilih PO --</option>
											{poSelesaiList.map((po) => (
												<option key={po.id} value={po.id}>
													{po.nomor_po} ·{" "}
													{po.reseller?.nama || po.nama_customer || "Umum"} [
													{po.status}]
												</option>
											))}
										</select>
										{formDariPO && (
											<p className="text-xs text-indigo-600 mt-1.5">
												Milestone awal akan diset ke <strong>Diproduksi</strong>
											</p>
										)}
									</div>
								)}
							</div>

							<div>
								<label className="block text-sm font-medium text-gray-700 mb-1">
									Tambah Produk
								</label>
								<div className="relative">
									<Search
										size={16}
										className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
									/>
									<input
										value={produkSearch}
										onChange={(e) => {
											setProdukSearch(e.target.value);
											setShowProdukDropdown(true);
										}}
										onFocus={() => setShowProdukDropdown(true)}
										placeholder="Cari produk..."
										className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
									/>
									{showProdukDropdown && filteredProdukSearch.length > 0 && (
										<div className="absolute z-10 w-full bg-white border border-gray-200 rounded-xl mt-1 shadow-lg overflow-hidden">
											{filteredProdukSearch.map((p) => (
												<button
													key={p.id}
													onClick={() => addToCart(p)}
													className="w-full flex items-center justify-between px-4 py-3 hover:bg-indigo-50 text-left transition border-b border-gray-50 last:border-0">
													<div>
														<p className="text-sm font-medium text-gray-900">
															{p.nama}
														</p>
														<p className="text-xs text-gray-500">
															Stok: {p.stok} · {formatRupiah(p.harga_katalog)}
														</p>
													</div>
													<Plus size={14} className="text-indigo-500" />
												</button>
											))}
										</div>
									)}
								</div>
							</div>

							{cart.length > 0 && (
								<div>
									<p className="text-sm font-medium text-gray-700 mb-2">
										Item ({cart.length})
									</p>
									<div className="space-y-3">
										{cart.map((item, idx) => (
											<div key={idx} className="bg-gray-50 rounded-xl p-4">
												<div className="flex items-center justify-between mb-3">
													<div>
														<p className="font-medium text-gray-900 text-sm">
															{item.produk_nama}
														</p>
														<p className="text-xs text-gray-500">
															Katalog: {formatRupiah(item.harga_katalog)}
														</p>
													</div>
													<button
														onClick={() => removeFromCart(idx)}
														className="p-1.5 hover:bg-red-100 rounded-lg text-red-500">
														<Trash2 size={14} />
													</button>
												</div>
												<div className="grid grid-cols-2 md:grid-cols-4 gap-3">
													<div>
														<label className="block text-xs text-gray-500 mb-1">
															Jumlah
														</label>
														<input
															type="number"
															min="1"
															value={item.jumlah}
															onChange={(e) =>
																updateCartItem(idx, "jumlah", e.target.value)
															}
															className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white"
														/>
													</div>
													<div>
														<label className="block text-xs text-gray-500 mb-1">
															Harga Jual Reseller
														</label>
														<input
															type="number"
															value={item.harga_jual}
															onChange={(e) =>
																updateCartItem(
																	idx,
																	"harga_jual",
																	e.target.value,
																)
															}
															className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white"
														/>
													</div>
													<div>
														<label className="block text-xs text-gray-500 mb-1">
															Ongkir
														</label>
														<input
															type="number"
															value={item.ongkir}
															onChange={(e) =>
																updateCartItem(idx, "ongkir", e.target.value)
															}
															className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white"
														/>
													</div>
													<div>
														<label className="block text-xs text-gray-500 mb-1">
															Bonus (auto/manual)
														</label>
														<input
															type="number"
															value={item.bonus}
															onChange={(e) => {
																const u = [...cart];
																u[idx] = {
																	...u[idx],
																	bonus: Number(e.target.value),
																};
																setCart(u);
															}}
															className="w-full px-3 py-2 border border-indigo-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white"
														/>
													</div>
												</div>
											</div>
										))}
									</div>

									<div className="bg-indigo-50 rounded-xl p-4 mt-4 space-y-2">
										<div className="flex justify-between text-sm">
											<span className="text-gray-600">
												Total Harga Jual Reseller
											</span>
											<span className="font-medium">
												{formatRupiah(totals.jual)}
											</span>
										</div>
										<div className="flex justify-between text-sm">
											<span className="text-gray-600">Total Ongkir</span>
											<span className="font-medium">
												{formatRupiah(totals.ongkir)}
											</span>
										</div>
										<div className="flex justify-between text-sm font-semibold border-t border-indigo-200 pt-2">
											<span>Grand Total</span>
											<span>{formatRupiah(grandTotalCart)}</span>
										</div>
										{formHeader.status_bayar === "dp" && (
											<>
												<div className="flex justify-between text-sm">
													<span className="text-yellow-600">DP</span>
													<span className="text-yellow-600">
														{formatRupiah(Number(formHeader.uang_dp))}
													</span>
												</div>
												<div className="flex justify-between text-sm font-semibold text-red-600">
													<span>Sisa Tagihan</span>
													<span>
														{formatRupiah(
															grandTotalCart - Number(formHeader.uang_dp),
														)}
													</span>
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
												<span>
													{formatRupiah(Number(formHeader.bonus_owner))}
												</span>
											</div>
										)}
										{isSuperAdmin && (
											<div className="flex justify-between text-sm text-green-700 font-medium border-t border-indigo-200 pt-2">
												<span>Total Laba Toko</span>
												<span>{formatRupiah(totals.laba)}</span>
											</div>
										)}
									</div>
								</div>
							)}
						</div>

						{isSuperAdmin && (
							<div className="px-6 pb-4 border-t border-gray-100 pt-4 space-y-3">
								<p className="text-xs font-semibold text-amber-700 uppercase tracking-wide">
									Bonus dari Owner (Opsional)
								</p>
								<div className="grid grid-cols-2 gap-3">
									<div>
										<label className="block text-xs text-gray-500 mb-1">
											Nominal Bonus
										</label>
										<input
											type="number"
											min="0"
											value={formHeader.bonus_owner}
											onChange={(e) =>
												setFormHeader({
													...formHeader,
													bonus_owner: e.target.value,
												})
											}
											placeholder="0"
											className="w-full px-3 py-2 border border-amber-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 bg-amber-50"
										/>
									</div>
									<div>
										<label className="block text-xs text-gray-500 mb-1">
											Catatan
										</label>
										<input
											type="text"
											value={formHeader.catatan_bonus_owner}
											onChange={(e) =>
												setFormHeader({
													...formHeader,
													catatan_bonus_owner: e.target.value,
												})
											}
											placeholder="Misal: apresiasi penjualan"
											className="w-full px-3 py-2 border border-amber-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 bg-amber-50"
										/>
									</div>
								</div>
							</div>
						)}
						<div className="flex gap-3 p-6 border-t border-gray-100">
							<button
								onClick={() => setModal(null)}
								className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium hover:bg-gray-50">
								Batal
							</button>
							<button
								onClick={savePenjualan}
								disabled={saving || cart.length === 0}
								className="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white px-4 py-2.5 rounded-xl text-sm font-medium flex items-center justify-center gap-2">
								<ShoppingCart size={15} />
								{saving ? "Menyimpan..." : "Simpan Penjualan"}
							</button>
						</div>
					</div>
				</div>
			)}

			{/* Modal Edit Bonus Owner */}
			{modal === "bonus_owner" && selected && (
				<div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
					<div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl">
						<div className="flex items-center justify-between p-5 border-b border-gray-100">
							<div>
								<h2 className="text-base font-semibold">Bonus dari Owner</h2>
								<p className="text-xs text-gray-400 mt-0.5">
									{selected.nomor_faktur}
								</p>
							</div>
							<button
								onClick={() => setModal(null)}
								className="p-2 hover:bg-gray-100 rounded-lg">
								<X size={16} />
							</button>
						</div>
						<div className="p-5 space-y-4">
							{/* Info bonus otomatis */}
							<div className="bg-gray-50 rounded-xl px-4 py-3 text-sm">
								<div className="flex justify-between text-gray-500 mb-1">
									<span>Bonus Reseller (auto)</span>
									<span className="font-medium text-gray-700">
										{formatRupiah(selected.total_bonus || 0)}
									</span>
								</div>
								<div className="flex justify-between text-gray-500">
									<span>Sudah Dibayar</span>
									<span className="font-medium text-green-600">
										{formatRupiah(selected.bonus_terbayar || 0)}
									</span>
								</div>
							</div>

							{/* Input bonus owner */}
							<div>
								<label className="block text-sm font-medium text-gray-700 mb-1.5">
									Bonus Tambahan dari Owner{" "}
									<span className="text-gray-400 font-normal">(manual)</span>
								</label>
								<input
									type="number"
									min="0"
									step="1000"
									value={bonusOwnerForm.bonus_owner}
									onChange={(e) =>
										setBonusOwnerForm({
											...bonusOwnerForm,
											bonus_owner: e.target.value,
										})
									}
									className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
									placeholder="0"
								/>
							</div>
							<div>
								<label className="block text-sm font-medium text-gray-700 mb-1.5">
									Keterangan Bonus Owner
								</label>
								<input
									type="text"
									value={bonusOwnerForm.catatan_bonus_owner}
									onChange={(e) =>
										setBonusOwnerForm({
											...bonusOwnerForm,
											catatan_bonus_owner: e.target.value,
										})
									}
									className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
									placeholder="Misal: Bonus pencapaian target Q2"
								/>
							</div>

							{/* Preview total */}
							{(Number(bonusOwnerForm.bonus_owner) > 0 ||
								(selected.total_bonus || 0) > 0) && (
								<div className="bg-indigo-50 rounded-xl px-4 py-3 text-sm">
									<div className="flex justify-between font-semibold text-indigo-800">
										<span>Total Bonus ke Reseller</span>
										<span>
											{formatRupiah(
												(selected.total_bonus || 0) +
													(Number(bonusOwnerForm.bonus_owner) || 0),
											)}
										</span>
									</div>
									{(() => {
										const sisa = Math.max(
											0,
											(selected.total_bonus || 0) +
												(Number(bonusOwnerForm.bonus_owner) || 0) -
												(selected.bonus_terbayar || 0),
										);
										return sisa > 0 ? (
											<div className="flex justify-between text-amber-600 mt-1">
												<span>Belum dibayar</span>
												<span>{formatRupiah(sisa)}</span>
											</div>
										) : null;
									})()}
								</div>
							)}

							<div className="flex gap-2 pt-1">
								<button
									onClick={() => setModal(null)}
									className="flex-1 border border-gray-200 rounded-xl py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50 transition">
									Batal
								</button>
								<button
									onClick={saveBonusOwner}
									disabled={savingBonus}
									className="flex-1 bg-indigo-600 text-white rounded-xl py-2.5 text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition">
									{savingBonus ? "Menyimpan..." : "Simpan"}
								</button>
							</div>
						</div>
					</div>
				</div>
			)}

			{/* Modal Pelunasan */}
			{modal === "pelunasan" && selected && (
				<div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
					<div className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
						<div className="flex items-center justify-between p-6 border-b border-gray-100">
							<div>
								<h2 className="text-lg font-semibold">Update Pelunasan</h2>
								<p className="text-sm text-gray-500">{selected.nomor_faktur}</p>
							</div>
							<button
								onClick={() => setModal(null)}
								className="p-2 hover:bg-gray-100 rounded-lg">
								<X size={18} />
							</button>
						</div>
						<div className="p-6 space-y-4">
							{/* Ringkasan tagihan */}
							<div className="bg-gray-50 rounded-xl p-4 space-y-2 text-sm">
								<div className="flex justify-between">
									<span className="text-gray-500">Reseller</span>
									<span className="font-medium">
										{selected.reseller?.nama || "Umum"}
									</span>
								</div>
								<div className="flex justify-between">
									<span className="text-gray-500">Grand Total</span>
									<span className="font-semibold">
										{formatRupiah(selected.grand_total)}
									</span>
								</div>
								<div className="flex justify-between">
									<span className="text-gray-500">DP Terbayar</span>
									<span className="text-yellow-600 font-medium">
										{formatRupiah(selected.uang_dp)}
									</span>
								</div>
								<div className="flex justify-between border-t border-gray-200 pt-2">
									<span className="text-red-600 font-semibold">
										Sisa Tagihan
									</span>
									<span className="text-red-600 font-bold">
										{formatRupiah(selected.sisa_tagihan)}
									</span>
								</div>
							</div>

							<div>
								<label className="block text-sm font-medium text-gray-700 mb-1">
									Jumlah Bayar Sekarang
								</label>
								<input
									type="number"
									value={pelunasanForm.tambahan_bayar}
									onChange={(e) =>
										setPelunasanForm({
											...pelunasanForm,
											tambahan_bayar: e.target.value,
										})
									}
									className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
								/>
							</div>

							<div>
								<label className="block text-sm font-medium text-gray-700 mb-1">
									Metode Bayar
								</label>
								<select
									value={pelunasanForm.metode_bayar}
									onChange={(e) =>
										setPelunasanForm({
											...pelunasanForm,
											metode_bayar: e.target.value,
										})
									}
									className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
									<option value="transfer">Transfer</option>
									<option value="cod">COD</option>
									<option value="cash">Cash</option>
								</select>
							</div>

							<div>
								<label className="block text-sm font-medium text-gray-700 mb-1">
									Catatan
								</label>
								<input
									value={pelunasanForm.catatan}
									onChange={(e) =>
										setPelunasanForm({
											...pelunasanForm,
											catatan: e.target.value,
										})
									}
									placeholder="Opsional"
									className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
								/>
							</div>

							<div>
								<label className="block text-sm font-medium text-gray-700 mb-1">
									Bukti Transfer / No. Resi
								</label>
								<input
									type="file"
									accept="image/*"
									// capture="environment"
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

							{pelunasanForm.tambahan_bayar && (
								<div
									className={`rounded-xl p-3 text-sm ${
										selected.uang_dp + Number(pelunasanForm.tambahan_bayar) >=
										selected.grand_total
											? "bg-green-50 text-green-700"
											: "bg-yellow-50 text-yellow-700"
									}`}>
									Total terbayar:{" "}
									<span className="font-bold">
										{formatRupiah(
											selected.uang_dp + Number(pelunasanForm.tambahan_bayar),
										)}
									</span>
									{" · "}
									{selected.uang_dp + Number(pelunasanForm.tambahan_bayar) >=
									selected.grand_total
										? "✓ Akan menjadi LUNAS"
										: `Sisa: ${formatRupiah(selected.grand_total - selected.uang_dp - Number(pelunasanForm.tambahan_bayar))}`}
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
								onClick={savePelunasan}
								disabled={saving || !pelunasanForm.tambahan_bayar}
								className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-green-300 text-white px-4 py-2.5 rounded-xl text-sm font-medium flex items-center justify-center gap-2">
								<CreditCard size={15} />
								{saving ? "Menyimpan..." : "Simpan Pelunasan"}
							</button>
						</div>
					</div>
				</div>
			)}

			{/* Modal Detail */}
			{modal === "detail" && selected && (
				<div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
					<div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl max-h-[90vh] flex flex-col">
						<div className="flex items-center justify-between p-6 border-b border-gray-100">
							<div>
								<h2 className="text-lg font-semibold">
									{selected.nomor_faktur}
								</h2>
								<p className="text-sm text-gray-500">
									{formatDate(selected.tanggal)}
								</p>
							</div>
							<div className="flex items-center gap-2">
								<button
									onClick={() => printInvoice(selected)}
									title="Cetak Invoice & Surat Jalan"
									className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-800 hover:bg-gray-900 text-white rounded-lg text-xs font-medium transition">
									<Printer size={14} /> Cetak
								</button>
								<button
									onClick={() => setModal(null)}
									className="p-2 hover:bg-gray-100 rounded-lg">
									<X size={18} />
								</button>
							</div>
						</div>
						<div className="flex-1 overflow-y-auto p-6">
							<div className="grid grid-cols-2 gap-3 mb-6 text-sm">
								<div>
									<span className="text-gray-500">Reseller:</span>{" "}
									<span className="font-medium">
										{selected.reseller?.nama || "Umum"}
									</span>
								</div>
								<div>
									<span className="text-gray-500">Tujuan:</span>{" "}
									<span className="font-medium">{selected.tujuan || "-"}</span>
								</div>
								{selected.nama_customer && (
									<div>
										<span className="text-gray-500">Customer:</span>{" "}
										<span className="font-medium">
											{selected.nama_customer}
										</span>
									</div>
								)}
								{selected.telepon_customer && (
									<div>
										<span className="text-gray-500">Telp Customer:</span>{" "}
										<a
											href={waLink(selected.telepon_customer)}
											target="_blank"
											rel="noopener noreferrer"
											className="text-green-600 font-semibold hover:underline text-sm">
											WA {selected.telepon_customer}
										</a>
									</div>
								)}
								{selected.sopir && (
									<div>
										<span className="text-gray-500">Sopir:</span>{" "}
										<span className="font-medium">{selected.sopir}</span>
										{selected.telepon_sopir && (
											<a
												href={waLink(selected.telepon_sopir)}
												target="_blank"
												rel="noopener noreferrer"
												className="ml-2 text-xs text-green-600 font-semibold hover:underline">
												WA {selected.telepon_sopir}
											</a>
										)}
									</div>
								)}
								<div>
									<span className="text-gray-500">Metode:</span>{" "}
									<span className="font-medium capitalize">
										{selected.metode_bayar}
									</span>
								</div>
								<div>
									<span className="text-gray-500">Status:</span>
									<span
										className={`ml-1 px-2 py-0.5 rounded-full text-xs font-medium ${
											selected.status_bayar === "lunas"
												? "bg-green-100 text-green-700"
												: selected.status_bayar === "dp"
													? "bg-yellow-100 text-yellow-700"
													: "bg-red-100 text-red-700"
										}`}>
										{selected.status_bayar === "lunas"
											? "Lunas"
											: selected.status_bayar === "dp"
												? "DP"
												: "Belum Bayar"}
									</span>
								</div>
							</div>

							<div className="space-y-3 mb-6">
								{(selected.items || []).map((item: any) => (
									<div key={item.id} className="bg-gray-50 rounded-xl p-4">
										<div className="flex justify-between mb-2">
											<p className="font-medium text-gray-900 text-sm">
												{item.produk?.nama}
											</p>
											<p className="text-sm font-semibold">
												{formatRupiah(item.harga_jual * item.jumlah)}
											</p>
										</div>
										<div className="grid grid-cols-3 gap-2 text-xs text-gray-500">
											<span>
												Jml: {item.jumlah} {item.produk?.satuan}
											</span>
											<span>Katalog: {formatRupiah(item.harga_katalog)}</span>
											<span>Jual: {formatRupiah(item.harga_jual)}</span>
											<span>Ongkir: {formatRupiah(item.ongkir)}</span>
											<span className="text-purple-600">
												Bonus: {formatRupiah(item.bonus)}
											</span>
											{isSuperAdmin && (
												<span className="text-green-600">
													Laba: {formatRupiah(item.laba)}
												</span>
											)}
										</div>
									</div>
								))}
							</div>

							<div className="bg-indigo-50 rounded-xl p-4 space-y-2 text-sm">
								<div className="flex justify-between">
									<span>Total Harga Jual Reseller</span>
									<span className="font-medium">
										{formatRupiah(selected.total_harga_jual)}
									</span>
								</div>
								<div className="flex justify-between">
									<span>Total Ongkir</span>
									<span className="font-medium">
										{formatRupiah(selected.total_ongkir)}
									</span>
								</div>
								<div className="flex justify-between font-semibold border-t border-indigo-200 pt-2">
									<span>Grand Total</span>
									<span>{formatRupiah(selected.total_harga_jual)}</span>
								</div>
								{selected.uang_dp > 0 && (
									<>
										<div className="flex justify-between text-yellow-600">
											<span>DP Terbayar</span>
											<span className="font-medium">
												{formatRupiah(selected.uang_dp)}
											</span>
										</div>
										<div className="flex justify-between text-red-600 font-semibold">
											<span>Sisa Tagihan</span>
											<span>
												{formatRupiah(
													selected.total_harga_jual - selected.uang_dp,
												)}
											</span>
										</div>
									</>
								)}
								<div className="flex justify-between text-purple-600 border-t border-indigo-200 pt-2">
									<span>Bonus Reseller</span>
									<span className="font-medium">
										{formatRupiah(selected.total_bonus)}
									</span>
								</div>
								{selected.bonus_owner > 0 && (
									<div className="flex justify-between text-amber-600">
										<span>
											Bonus dari Owner
											{selected.catatan_bonus_owner && (
												<span className="ml-1 text-xs text-amber-400">
													({selected.catatan_bonus_owner})
												</span>
											)}
										</span>
										<span className="font-medium">
											{formatRupiah(selected.bonus_owner)}
										</span>
									</div>
								)}
								{(selected.total_bonus > 0 || selected.bonus_owner > 0) && (
									<div className="flex justify-between text-purple-700 font-semibold">
										<span>Total Bonus</span>
										<span>
											{formatRupiah(
												selected.total_bonus + (selected.bonus_owner || 0),
											)}
										</span>
									</div>
								)}
								{isSuperAdmin && (
									<div className="flex justify-between text-green-700 font-semibold">
										<span>Total Laba</span>
										<span>{formatRupiah(selected.total_laba)}</span>
									</div>
								)}
							</div>

							{/* ─── Review & Komplain ─── */}
							<div className="mt-5 border-t border-gray-100 pt-4">
								<div className="flex items-center justify-between mb-3">
									<div className="flex items-center gap-2">
										<p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
											Review & Komplain
										</p>
										{selected.reviews?.some(
											(r: any) => r.status === "open" && r.tipe === "komplain",
										) && (
											<span className="text-xs bg-red-100 text-red-600 font-semibold px-2 py-0.5 rounded-full">
												Ada komplain
											</span>
										)}
									</div>
									{!showReviewForm && (
										<button
											onClick={() => setShowReviewForm(true)}
											className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 font-medium">
											<Plus size={13} /> Tambah
										</button>
									)}
								</div>

								{/* Form tambah review */}
								{showReviewForm && (
									<div className="bg-gray-50 rounded-xl p-4 mb-3 space-y-3 border border-gray-200">
										<div className="flex gap-2">
											{[
												{
													v: "komplain",
													label: "😤 Komplain",
													color: "bg-red-100 text-red-700 border-red-300",
												},
												{
													v: "pujian",
													label: "👍 Pujian",
													color: "bg-green-100 text-green-700 border-green-300",
												},
												{
													v: "catatan",
													label: "📝 Catatan",
													color: "bg-blue-100 text-blue-700 border-blue-300",
												},
											].map((opt) => (
												<button
													key={opt.v}
													onClick={() =>
														setReviewForm((f) => ({ ...f, tipe: opt.v }))
													}
													className={`flex-1 text-xs font-medium py-1.5 rounded-lg border transition ${
														reviewForm.tipe === opt.v
															? opt.color + " border-2"
															: "bg-white text-gray-500 border-gray-200 hover:bg-gray-50"
													}`}>
													{opt.label}
												</button>
											))}
										</div>
										<textarea
											value={reviewForm.isi}
											onChange={(e) =>
												setReviewForm((f) => ({ ...f, isi: e.target.value }))
											}
											rows={3}
											placeholder={
												reviewForm.tipe === "komplain"
													? "Ceritakan apa yang dikomplain customer..."
													: reviewForm.tipe === "pujian"
														? "Ceritakan hal positif dari reseller ini..."
														: "Tambah catatan untuk faktur ini..."
											}
											className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
										/>
										<div className="flex gap-2 justify-end">
											<button
												onClick={() => {
													setShowReviewForm(false);
													setReviewForm({ tipe: "komplain", isi: "" });
												}}
												className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">
												Batal
											</button>
											<button
												onClick={saveReview}
												disabled={savingReview || !reviewForm.isi.trim()}
												className="px-4 py-1.5 text-sm bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white rounded-lg font-medium transition">
												{savingReview ? "Menyimpan..." : "Simpan"}
											</button>
										</div>
									</div>
								)}

								{/* Daftar review */}
								{(!selected.reviews || selected.reviews.length === 0) &&
								!showReviewForm ? (
									<p className="text-sm text-gray-400 text-center py-4">
										Belum ada review untuk faktur ini
									</p>
								) : (
									<div className="space-y-2">
										{(selected.reviews || []).map((r: any) => {
											const tipeConfig: Record<
												string,
												{ icon: any; bg: string; text: string; label: string }
											> = {
												komplain: {
													icon: Flag,
													bg: "bg-red-50 border-red-100",
													text: "text-red-600",
													label: "Komplain",
												},
												pujian: {
													icon: ThumbsUp,
													bg: "bg-green-50 border-green-100",
													text: "text-green-600",
													label: "Pujian",
												},
												catatan: {
													icon: StickyNote,
													bg: "bg-blue-50 border-blue-100",
													text: "text-blue-600",
													label: "Catatan",
												},
											};
											const cfg = tipeConfig[r.tipe] || tipeConfig.catatan;
											const Icon = cfg.icon;
											return (
												<div
													key={r.id}
													className={`border rounded-xl p-3 ${cfg.bg}`}>
													<div className="flex items-start justify-between gap-2">
														<div className="flex items-center gap-2 flex-wrap">
															<span
																className={`flex items-center gap-1 text-xs font-semibold ${cfg.text}`}>
																<Icon size={12} /> {cfg.label}
															</span>
															<span className="text-xs text-gray-400">
																{new Date(r.created_at).toLocaleDateString(
																	"id-ID",
																	{
																		day: "numeric",
																		month: "short",
																		year: "numeric",
																	},
																)}
															</span>
															{r.creator?.name && (
																<span className="text-xs text-gray-400">
																	· {r.creator.name}
																</span>
															)}
														</div>
														<div className="flex items-center gap-2 flex-shrink-0">
															{r.status === "resolved" ? (
																<span className="flex items-center gap-1 text-xs text-green-600 font-medium">
																	<CheckCircle2 size={12} /> Selesai
																</span>
															) : isSuperAdmin ? (
																<button
																	onClick={() => resolveReview(r.id)}
																	className="text-xs text-gray-500 hover:text-green-600 font-medium border border-gray-200 hover:border-green-300 px-2 py-0.5 rounded-lg transition">
																	Tandai Selesai
																</button>
															) : (
																<span className="text-xs bg-orange-100 text-orange-600 font-medium px-2 py-0.5 rounded-full">
																	Open
																</span>
															)}
														</div>
													</div>
													<p className="text-sm text-gray-700 mt-2 leading-relaxed">
														{r.isi}
													</p>
												</div>
											);
										})}
									</div>
								)}
							</div>

							{/* Riwayat Pembayaran */}
							{selected.pembayaran?.length > 0 && (
								<div className="mt-4">
									<p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 px-1">
										Riwayat Pembayaran
									</p>
									<div className="space-y-2">
										{[...selected.pembayaran]
											.sort(
												(a: any, b: any) =>
													new Date(a.created_at).getTime() -
													new Date(b.created_at).getTime(),
											)
											.map((p: any, i: number) => (
												<div
													key={p.id}
													className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-2.5 text-sm border border-gray-100">
													<div className="flex items-center gap-3">
														<span className="w-5 h-5 bg-indigo-100 rounded-full text-xs font-bold text-indigo-600 flex items-center justify-center flex-shrink-0">
															{i + 1}
														</span>
														<div>
															<div className="flex items-center gap-1.5">
																<span className="font-medium text-gray-900 capitalize">
																	{p.metode}
																</span>
																{p.catatan && (
																	<span className="text-xs text-gray-400">
																		— {p.catatan}
																	</span>
																)}
															</div>
															<p className="text-xs text-gray-400 mt-0.5">
																{new Date(p.created_at).toLocaleDateString(
																	"id-ID",
																	{
																		day: "numeric",
																		month: "short",
																		year: "numeric",
																		hour: "2-digit",
																		minute: "2-digit",
																	},
																)}
															</p>
														</div>
													</div>
													<span className="font-semibold text-gray-900">
														{formatRupiah(p.jumlah)}
													</span>
												</div>
											))}
										<div className="flex justify-between px-4 py-2 text-sm font-semibold text-gray-700 border-t border-gray-100 mt-1">
											<span>Total Terbayar</span>
											<span>
												{formatRupiah(
													selected.pembayaran.reduce(
														(s: number, p: any) => s + p.jumlah,
														0,
													),
												)}
											</span>
										</div>
									</div>
								</div>
							)}
						</div>
					</div>
				</div>
			)}
			{modalTambahReseller && (
				<div className="fixed inset-0 bg-black/40 z-[60] flex items-center justify-center p-4">
					<div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl">
						<div className="flex items-center justify-between p-5 border-b border-gray-100">
							<h2 className="text-base font-semibold">Tambah Reseller Baru</h2>
							<button
								onClick={() => setModalTambahReseller(false)}
								className="p-1.5 hover:bg-gray-100 rounded-lg">
								<X size={16} />
							</button>
						</div>
						<div className="p-5 space-y-3">
							<div>
								<label className="block text-sm font-medium text-gray-700 mb-1">
									Nama *
								</label>
								<input
									value={formReseller.nama}
									onChange={(e) =>
										setFormReseller((f) => ({ ...f, nama: e.target.value }))
									}
									className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
								/>
							</div>
							<div>
								<label className="block text-sm font-medium text-gray-700 mb-1">
									Telepon
								</label>
								<input
									value={formReseller.telepon}
									onChange={(e) =>
										setFormReseller((f) => ({ ...f, telepon: e.target.value }))
									}
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
			{/* ─── MODAL SUKSES RESI ─── */}
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
									<h3 className="text-lg font-bold text-gray-900">
										Penjualan Tersimpan!
									</h3>
									<p className="text-sm text-gray-500 mt-1">
										Nomor resi tracking customer:
									</p>
									<div className="mt-3 bg-white border-2 border-green-200 rounded-xl px-4 py-3">
										<p className="text-xl font-bold font-mono tracking-widest text-green-700">
											{resiSukses}
										</p>
									</div>
								</div>
								<div className="px-6 py-5 space-y-3">
									<button
										onClick={() => {
											navigator.clipboard.writeText(trackingUrl);
										}}
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
									<button
										onClick={() => setResiSukses(null)}
										className="w-full py-2.5 text-sm text-gray-400 hover:text-gray-600 transition">
										Tutup
									</button>
								</div>
							</div>
						</div>
					);
				})()}
		</div>
	);
}
