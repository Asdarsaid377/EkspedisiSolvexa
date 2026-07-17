"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { formatRupiah } from "@/lib/utils";
import {
	Package,
	AlertTriangle,
	Truck,
	ClipboardList,
	History,
	RefreshCw,
	Loader2,
	ExternalLink,
	CheckCircle2,
	ShoppingCart,
	Navigation,
	ArrowDownCircle,
	ArrowUpCircle,
	RotateCcw,
} from "lucide-react";

const GUDANG_ROLES = ["superadmin", "gudang"];

const daysSince = (dateStr: string | null): number | null => {
	if (!dateStr) return null;
	return Math.floor(
		(Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24),
	);
};

const labelHari = (days: number | null): string => {
	if (days === null) return "-";
	if (days === 0) return "Hari ini";
	if (days === 1) return "Kemarin";
	return `${days} hari lalu`;
};

const MILESTONE_LABEL: Record<string, string> = {
	diproses: "Diproses",
	diproduksi: "Diproduksi",
	dikirim: "Dikirim",
	selesai: "Selesai",
};
const MILESTONE_COLOR: Record<string, string> = {
	diproses: "bg-gray-100 text-gray-500",
	diproduksi: "bg-blue-50 text-blue-600",
};

const PRIORITAS_ORDER: Record<string, number> = {
	urgent: 0,
	tinggi: 1,
	normal: 2,
	rendah: 3,
};
const PRIORITAS_BADGE: Record<string, { label: string; color: string }> = {
	rendah: { label: "Rendah", color: "bg-gray-100 text-gray-500" },
	normal: { label: "Normal", color: "bg-blue-100 text-blue-600" },
	tinggi: { label: "Tinggi", color: "bg-amber-100 text-amber-700" },
	urgent: { label: "Urgent", color: "bg-red-100 text-red-600" },
};

const MUTASI_ICON: Record<string, { icon: any; color: string }> = {
	masuk: { icon: ArrowDownCircle, color: "text-green-500" },
	keluar: { icon: ArrowUpCircle, color: "text-red-500" },
	koreksi: { icon: RotateCcw, color: "text-amber-500" },
};

interface ProdukStok {
	id: string;
	nama: string;
	kategori: string | null;
	satuan: string;
	stok: number;
	stok_minimum: number;
	harga_modal: number;
}

interface PenjualanSiapKirim {
	id: string;
	nomor_faktur: string;
	tanggal: string;
	tujuan: string | null;
	milestone: string;
	sopir: string | null;
	nama_customer: string | null;
	reseller: { nama: string } | null;
}

interface PoAktif {
	id: string;
	nomor_po: string;
	tanggal_estimasi: string | null;
	status: string;
	prioritas: string;
	pemohon_nama: string | null;
	reseller: { nama: string } | null;
	items: { id: string }[];
}

interface MutasiRow {
	id: string;
	tipe: string;
	jumlah: number;
	keterangan: string | null;
	created_at: string;
	produk: { nama: string } | null;
}

export default function GudangWorkspacePage() {
	const { role, isSuperAdmin, loading: authLoading } = useAuth();
	const router = useRouter();
	const supabase = createClient();

	const [loading, setLoading] = useState(true);
	const [stokMenipis, setStokMenipis] = useState<ProdukStok[]>([]);
	const [siapKirim, setSiapKirim] = useState<PenjualanSiapKirim[]>([]);
	const [poPending, setPoPending] = useState<PoAktif[]>([]);
	const [poProses, setPoProses] = useState<PoAktif[]>([]);
	const [mutasiTerbaru, setMutasiTerbaru] = useState<MutasiRow[]>([]);

	useEffect(() => {
		if (authLoading) return;
		if (!GUDANG_ROLES.includes(role ?? "")) {
			router.replace("/dashboard");
			return;
		}
		load();
	}, [role, authLoading]);

	if (authLoading || !GUDANG_ROLES.includes(role ?? "")) return null;

	const load = useCallback(async () => {
		setLoading(true);
		const todayStr = new Date().toISOString().split("T")[0];

		const [produkRes, siapKirimRes, poRes, mutasiRes] = await Promise.all([
			supabase
				.from("produk")
				.select("id, nama, kategori, satuan, stok, stok_minimum, harga_modal")
				.eq("aktif", true)
				.order("stok", { ascending: true }),
			supabase
				.from("penjualan")
				.select(
					"id, nomor_faktur, tanggal, tujuan, milestone, sopir, nama_customer, reseller:resellers(nama)",
				)
				.in("milestone", ["diproses", "diproduksi"])
				.order("tanggal", { ascending: true }),
			supabase
				.from("purchase_orders")
				.select(
					"id, nomor_po, tanggal_estimasi, status, prioritas, pemohon_nama, reseller:resellers(nama), items:purchase_order_items(id)",
				)
				.in("status", ["pending", "proses"])
				.order("tanggal_estimasi", { ascending: true, nullsFirst: false }),
			supabase
				.from("mutasi_stok")
				.select("id, tipe, jumlah, keterangan, created_at, produk:produk(nama)")
				.order("created_at", { ascending: false })
				.limit(10),
		]);

		setStokMenipis(
			((produkRes.data as ProdukStok[]) || []).filter(
				(p) => p.stok <= p.stok_minimum,
			),
		);
		setSiapKirim((siapKirimRes.data as any) || []);
		const allPo = (poRes.data as PoAktif[]) || [];
		setPoPending(allPo.filter((po) => po.status === "pending"));
		setPoProses(allPo.filter((po) => po.status === "proses"));
		setMutasiTerbaru((mutasiRes.data as any) || []);

		setLoading(false);
	}, []);

	if (loading) {
		return (
			<div className="flex items-center justify-center min-h-[60vh]">
				<Loader2 size={24} className="animate-spin text-gray-400" />
			</div>
		);
	}

	const todayStr = new Date().toISOString().split("T")[0];
	const stokHabis = stokMenipis.filter((p) => p.stok <= 0);
	const nilaiStokMenipis = stokMenipis.reduce(
		(s, p) => s + p.stok * p.harga_modal,
		0,
	);
	const totalTugas = stokMenipis.length + siapKirim.length;

	return (
		<div className="max-w-4xl mx-auto space-y-5 pb-10">
			{/* ══════════════════════════════════════
			    Header
			══════════════════════════════════════ */}
			<div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
				<div className="flex items-start justify-between gap-4">
					<div>
						<div className="flex items-center gap-3 flex-wrap">
							<h1 className="text-2xl font-bold text-gray-900">
								Meja Kerja Gudang
							</h1>
							{totalTugas > 0 ? (
								<span className="bg-red-500 text-white text-xs font-bold px-2.5 py-1 rounded-full">
									{totalTugas} tugas pending
								</span>
							) : (
								<span className="bg-green-100 text-green-700 text-xs font-semibold px-2.5 py-1 rounded-full flex items-center gap-1">
									<CheckCircle2 size={11} /> Semua beres
								</span>
							)}
						</div>
						<p className="text-sm text-gray-500 mt-1">
							{new Date().toLocaleDateString("id-ID", {
								weekday: "long",
								day: "numeric",
								month: "long",
								year: "numeric",
							})}
						</p>
					</div>
					<button
						onClick={load}
						className="p-2 hover:bg-gray-100 rounded-xl text-gray-400 hover:text-gray-600 transition"
						title="Refresh data">
						<RefreshCw size={16} />
					</button>
				</div>

				<div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
					<div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3">
						<p className="text-xs font-medium text-red-600 mb-0.5">
							Stok Habis
						</p>
						<p className="text-lg font-bold text-red-700">{stokHabis.length}</p>
					</div>
					<div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
						<p className="text-xs font-medium text-amber-600 mb-0.5">
							Stok Menipis
						</p>
						<p className="text-lg font-bold text-amber-700">
							{stokMenipis.length}
						</p>
					</div>
					<div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3">
						<p className="text-xs font-medium text-blue-600 mb-0.5">
							Siap Dikirim
						</p>
						<p className="text-lg font-bold text-blue-700">
							{siapKirim.length}
						</p>
					</div>
					<div className="bg-orange-50 border border-orange-200 rounded-xl px-4 py-3">
						<p className="text-xs font-medium text-orange-600 mb-0.5">
							PO Aktif
						</p>
						<p className="text-lg font-bold text-orange-700">
							{poPending.length + poProses.length}
						</p>
					</div>
				</div>
			</div>

			{/* ══════════════════════════════════════
			    Stok Menipis / Habis
			══════════════════════════════════════ */}
			{stokMenipis.length > 0 && (
				<div className="bg-white rounded-2xl border border-amber-200 shadow-sm overflow-hidden">
					<div className="flex items-center justify-between px-6 py-4 border-b border-amber-100">
						<div className="flex items-center gap-2.5">
							<AlertTriangle size={15} className="text-amber-500" />
							<p className="font-semibold text-gray-900 text-sm">
								{stokMenipis.length} Produk Stok Menipis / Habis
							</p>
						</div>
						<Link
							href="/dashboard/produk"
							className="text-xs text-indigo-600 hover:text-indigo-800 font-medium flex items-center gap-1 transition">
							Kelola Produk <ExternalLink size={11} />
						</Link>
					</div>
					{isSuperAdmin && (
						<div className="px-6 py-2.5 bg-amber-50 border-b border-amber-100">
							<p className="text-xs text-amber-700">
								Estimasi nilai modal stok tersisa:{" "}
								<strong>{formatRupiah(nilaiStokMenipis)}</strong>
							</p>
						</div>
					)}
					<div className="divide-y divide-gray-50 max-h-72 overflow-y-auto">
						{stokMenipis.slice(0, 15).map((p) => {
							const habis = p.stok <= 0;
							return (
								<div
									key={p.id}
									className="flex items-center justify-between gap-3 px-6 py-3">
									<div className="flex items-center gap-2.5 min-w-0">
										<div
											className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${habis ? "bg-red-500" : "bg-amber-400"}`}
										/>
										<div className="min-w-0">
											<p className="text-sm font-medium text-gray-800 truncate">
												{p.nama}
											</p>
											{p.kategori && (
												<span className="text-xs text-gray-400">
													{p.kategori}
												</span>
											)}
										</div>
									</div>
									<div className="flex items-center gap-2 flex-shrink-0">
										<span className="text-xs text-gray-400">
											min. {p.stok_minimum} {p.satuan}
										</span>
										<span
											className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
												habis
													? "bg-red-100 text-red-700"
													: "bg-amber-100 text-amber-700"
											}`}>
											{habis ? "Habis" : `${p.stok} ${p.satuan}`}
										</span>
									</div>
								</div>
							);
						})}
					</div>
					{stokMenipis.length > 15 && (
						<div className="px-6 py-2 border-t border-amber-100 text-center">
							<span className="text-xs text-amber-600">
								Menampilkan 15 dari {stokMenipis.length} — buka halaman Produk
								untuk lihat semua
							</span>
						</div>
					)}
				</div>
			)}

			{/* ══════════════════════════════════════
			    Pesanan Menunggu Dikirim
			══════════════════════════════════════ */}
			<div className="bg-white rounded-2xl border border-blue-200 shadow-sm overflow-hidden">
				<div className="flex items-center justify-between px-6 py-4 border-b border-blue-100">
					<div className="flex items-center gap-2.5">
						<Truck size={15} className="text-blue-500" />
						<p className="font-semibold text-gray-900 text-sm">
							Pesanan Menunggu Dikirim
						</p>
					</div>
					<Link
						href="/dashboard/penjualan"
						className="text-xs text-indigo-600 hover:text-indigo-800 font-medium flex items-center gap-1 transition">
						Buka Penjualan <ExternalLink size={11} />
					</Link>
				</div>
				{siapKirim.length === 0 ? (
					<div className="flex flex-col items-center justify-center py-8 text-center px-6">
						<CheckCircle2 size={28} className="text-green-400 mb-2" />
						<p className="text-sm font-medium text-gray-600">
							Tidak ada pesanan menunggu
						</p>
						<p className="text-xs text-gray-400 mt-1">
							Semua pesanan sudah dikirim atau selesai
						</p>
					</div>
				) : (
					<div className="divide-y divide-gray-50 max-h-80 overflow-y-auto">
						{siapKirim.slice(0, 20).map((p) => (
							<div
								key={p.id}
								className="flex items-center justify-between gap-3 px-6 py-3">
								<div className="flex items-center gap-2.5 min-w-0">
									<div className="w-1.5 h-1.5 rounded-full bg-blue-400 flex-shrink-0" />
									<div className="min-w-0">
										<Link
											href={`/dashboard/penjualan/${p.id}`}
											className="font-mono text-sm font-semibold text-indigo-600 hover:underline">
											{p.nomor_faktur}
										</Link>
										<span className="text-xs text-gray-500 ml-2">
											{p.reseller?.nama || p.nama_customer || "Umum"}
											{p.tujuan ? ` · ${p.tujuan}` : ""}
										</span>
									</div>
								</div>
								<div className="flex items-center gap-2 flex-shrink-0">
									<span
										className={`text-xs px-2 py-0.5 rounded-full font-medium ${MILESTONE_COLOR[p.milestone] ?? MILESTONE_COLOR.diproses}`}>
										{MILESTONE_LABEL[p.milestone] ?? p.milestone}
									</span>
									<span className="text-xs text-gray-400 w-20 text-right">
										{labelHari(daysSince(p.tanggal))}
									</span>
								</div>
							</div>
						))}
					</div>
				)}
				<div className="px-6 py-3 bg-blue-50 border-t border-blue-100">
					<p className="text-xs text-blue-700">
						Update milestone ke <strong>Dikirim</strong> dari halaman detail
						penjualan setelah barang selesai dikemas & diserahkan ke sopir.
					</p>
				</div>
			</div>

			{/* ══════════════════════════════════════
			    PO Aktif — Menunggu Disiapkan
			══════════════════════════════════════ */}
			<div className="bg-white rounded-2xl border border-orange-200 shadow-sm overflow-hidden">
				<div className="flex items-center justify-between px-6 py-4 border-b border-orange-100">
					<div className="flex items-center gap-2.5">
						<ClipboardList size={15} className="text-orange-500" />
						<p className="font-semibold text-gray-900 text-sm">
							Purchase Order Aktif
						</p>
					</div>
					<Link
						href="/dashboard/po"
						className="text-xs text-indigo-600 hover:text-indigo-800 font-medium flex items-center gap-1 transition">
						Buka PO <ExternalLink size={11} />
					</Link>
				</div>

				<div className="flex items-center gap-3 px-6 py-3 bg-orange-50 border-b border-orange-100 flex-wrap">
					<span className="flex items-center gap-1.5 text-xs font-semibold text-gray-600 bg-gray-100 px-3 py-1 rounded-full">
						<span className="w-2 h-2 bg-gray-400 rounded-full" />
						{poPending.length} Pending
					</span>
					<span className="flex items-center gap-1.5 text-xs font-semibold text-blue-700 bg-blue-100 px-3 py-1 rounded-full">
						<span className="w-2 h-2 bg-blue-500 rounded-full" />
						{poProses.length} Diproses
					</span>
				</div>

				{poPending.length === 0 && poProses.length === 0 ? (
					<div className="flex flex-col items-center justify-center py-8 text-center px-6">
						<CheckCircle2 size={28} className="text-green-400 mb-2" />
						<p className="text-sm font-medium text-gray-600">
							Tidak ada PO aktif saat ini
						</p>
					</div>
				) : (
					<div className="divide-y divide-gray-50 max-h-72 overflow-y-auto">
						{[...poPending, ...poProses]
							.sort(
								(a, b) =>
									(PRIORITAS_ORDER[a.prioritas ?? "normal"] ?? 2) -
									(PRIORITAS_ORDER[b.prioritas ?? "normal"] ?? 2),
							)
							.map((po) => {
								const terlambat =
									po.tanggal_estimasi && po.tanggal_estimasi < todayStr;
								const pb = PRIORITAS_BADGE[po.prioritas ?? "normal"];
								return (
									<div
										key={po.id}
										className="flex items-center justify-between gap-3 px-6 py-3">
										<div className="flex items-center gap-2.5 min-w-0">
											<div
												className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${terlambat ? "bg-red-400" : "bg-orange-300"}`}
											/>
											<div className="min-w-0">
												<span className="font-mono text-sm font-semibold text-gray-800">
													{po.nomor_po}
												</span>
												<span className="text-xs text-gray-500 ml-2">
													{po.reseller?.nama || po.pemohon_nama || "Umum"}
												</span>
												{po.items?.length > 0 && (
													<span className="text-xs text-gray-400 ml-1.5">
														({po.items.length} item)
													</span>
												)}
											</div>
										</div>
										<div className="flex items-center gap-2 flex-shrink-0">
											<span
												className={`text-xs font-semibold px-2 py-0.5 rounded-full ${pb.color}`}>
												{pb.label}
											</span>
											{terlambat && (
												<span className="text-xs font-semibold text-red-600 bg-red-50 px-2 py-0.5 rounded-full flex items-center gap-1">
													<AlertTriangle size={9} /> Terlambat
												</span>
											)}
										</div>
									</div>
								);
							})}
					</div>
				)}
			</div>

			{/* ══════════════════════════════════════
			    Mutasi Stok Terbaru
			══════════════════════════════════════ */}
			<div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
				<div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
					<div className="flex items-center gap-2.5">
						<History size={15} className="text-gray-500" />
						<p className="font-semibold text-gray-900 text-sm">
							Mutasi Stok Terbaru
						</p>
					</div>
				</div>
				{mutasiTerbaru.length === 0 ? (
					<p className="text-sm text-gray-400 text-center py-8">
						Belum ada mutasi stok tercatat
					</p>
				) : (
					<div className="divide-y divide-gray-50">
						{mutasiTerbaru.map((m) => {
							const conf = MUTASI_ICON[m.tipe] ?? MUTASI_ICON.koreksi;
							const Icon = conf.icon;
							return (
								<div
									key={m.id}
									className="flex items-center justify-between gap-3 px-6 py-3">
									<div className="flex items-center gap-2.5 min-w-0">
										<Icon size={16} className={`flex-shrink-0 ${conf.color}`} />
										<div className="min-w-0">
											<p className="text-sm text-gray-800 truncate">
												{m.produk?.nama || "Produk dihapus"}
											</p>
											{m.keterangan && (
												<p className="text-xs text-gray-400 truncate">
													{m.keterangan}
												</p>
											)}
										</div>
									</div>
									<div className="flex items-center gap-2 flex-shrink-0 text-right">
										<span
											className={`text-sm font-semibold ${conf.color}`}>
											{m.tipe === "keluar" ? "-" : "+"}
											{m.jumlah}
										</span>
										<span className="text-xs text-gray-400 w-16 text-right">
											{new Date(m.created_at).toLocaleDateString("id-ID", {
												day: "numeric",
												month: "short",
											})}
										</span>
									</div>
								</div>
							);
						})}
					</div>
				)}
			</div>

			{/* ══════════════════════════════════════
			    Shortcut Cepat
			══════════════════════════════════════ */}
			<div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
				<p className="font-semibold text-gray-800 text-sm mb-4">
					Shortcut Cepat
				</p>
				<div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
					{[
						{ href: "/dashboard/produk", label: "Produk & Stok", icon: Package },
						{
							href: "/dashboard/po",
							label: "Purchase Order",
							icon: ClipboardList,
						},
						{
							href: "/dashboard/penjualan",
							label: "Penjualan",
							icon: ShoppingCart,
						},
						{
							href: "/dashboard/lacak-pengiriman",
							label: "Lacak Pengiriman",
							icon: Navigation,
						},
					].map((s) => (
						<Link
							key={s.href}
							href={s.href}
							className="flex flex-col items-center gap-2 p-4 rounded-xl border border-gray-100 hover:border-indigo-200 hover:bg-indigo-50 transition text-center">
							<s.icon size={18} className="text-indigo-500" />
							<span className="text-xs font-medium text-gray-700">
								{s.label}
							</span>
						</Link>
					))}
				</div>
			</div>
		</div>
	);
}
