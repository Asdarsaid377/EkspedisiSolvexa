"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { formatRupiah } from "@/lib/utils";
import {
	Wallet,
	TrendingUp,
	TrendingDown,
	Receipt,
	Gift,
	AlertTriangle,
	RefreshCw,
	Loader2,
	ExternalLink,
	CheckCircle2,
	Plus,
	ShoppingCart,
	Users,
	FileSpreadsheet,
} from "lucide-react";

const KEU_ROLES = ["superadmin", "keuangan"];

const KATEGORI_COLORS: Record<string, string> = {
	Operasional: "bg-blue-50 text-blue-700",
	"Gaji / Upah": "bg-green-50 text-green-700",
	"Transport & Pengiriman": "bg-yellow-50 text-yellow-700",
	Utilitas: "bg-cyan-50 text-cyan-700",
	"Marketing & Promosi": "bg-pink-50 text-pink-700",
	"Pembelian Perlengkapan": "bg-purple-50 text-purple-700",
	Lainnya: "bg-gray-100 text-gray-600",
};

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

interface Piutang {
	id: string;
	nomor_faktur: string;
	tanggal: string;
	total_harga_jual: number;
	uang_dp: number;
	status_bayar: string;
	nama_customer: string | null;
	reseller: { nama: string } | null;
}

interface BonusReseller {
	reseller_id: string;
	nama: string;
	sisa: number;
}

interface PengeluaranRow {
	id: string;
	tanggal: string;
	kategori: string;
	keterangan: string;
	jumlah: number;
}

export default function KeuanganWorkspacePage() {
	const { role, loading: authLoading } = useAuth();
	const router = useRouter();
	const supabase = createClient();

	const [loading, setLoading] = useState(true);

	const [omsetBulanIni, setOmsetBulanIni] = useState(0);
	const [labaKotorBulanIni, setLabaKotorBulanIni] = useState(0);
	const [pengeluaranBulanIni, setPengeluaranBulanIni] = useState(0);
	const [pengeluaranTerbaru, setPengeluaranTerbaru] = useState<
		PengeluaranRow[]
	>([]);
	const [piutang, setPiutang] = useState<Piutang[]>([]);
	const [bonusBelumDibayar, setBonusBelumDibayar] = useState<BonusReseller[]>(
		[],
	);

	useEffect(() => {
		if (authLoading) return;
		if (!KEU_ROLES.includes(role ?? "")) {
			router.replace("/dashboard");
			return;
		}
		load();
	}, [role, authLoading]);

	if (authLoading || !KEU_ROLES.includes(role ?? "")) return null;

	const load = useCallback(async () => {
		setLoading(true);
		const now = new Date();
		const bulanIni = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;

		const [penjualanBulanRes, pengeluaranBulanRes, piutangRes, bonusRes] =
			await Promise.all([
				supabase
					.from("penjualan")
					.select("total_harga_jual, items:penjualan_item(harga_modal, jumlah)")
					.gte("tanggal", bulanIni + "T00:00:00"),
				supabase.from("pengeluaran").select("*").gte("tanggal", bulanIni),
				supabase
					.from("penjualan")
					.select(
						"id, nomor_faktur, tanggal, total_harga_jual, uang_dp, status_bayar, nama_customer, reseller:resellers(nama)",
					)
					.neq("status_bayar", "lunas")
					.order("tanggal", { ascending: true }),
				supabase
					.from("penjualan")
					.select(
						"reseller_id, total_bonus, bonus_owner, bonus_terbayar, reseller:resellers(nama)",
					)
					.not("reseller_id", "is", null),
			]);

		let omset = 0,
			modal = 0;
		for (const p of penjualanBulanRes.data || []) {
			omset += p.total_harga_jual || 0;
			for (const item of (p.items || []) as any[]) {
				modal += (item.harga_modal || 0) * (item.jumlah || 0);
			}
		}
		setOmsetBulanIni(omset);
		setLabaKotorBulanIni(omset - modal);

		const totalPengeluaran = (pengeluaranBulanRes.data || []).reduce(
			(s: number, p: any) => s + (p.jumlah || 0),
			0,
		);
		setPengeluaranBulanIni(totalPengeluaran);
		setPengeluaranTerbaru(
			[...(pengeluaranBulanRes.data || [])]
				.sort((a: any, b: any) => (a.tanggal < b.tanggal ? 1 : -1))
				.slice(0, 8),
		);

		setPiutang((piutangRes.data as any) || []);

		// Aggregasi bonus tersisa per reseller — total_bonus + bonus_owner - bonus_terbayar
		const bonusMap = new Map<string, BonusReseller>();
		for (const p of (bonusRes.data as any[]) || []) {
			if (!p.reseller_id) continue;
			const sisa =
				(p.total_bonus || 0) + (p.bonus_owner || 0) - (p.bonus_terbayar || 0);
			const existing = bonusMap.get(p.reseller_id);
			bonusMap.set(p.reseller_id, {
				reseller_id: p.reseller_id,
				nama: p.reseller?.nama || "-",
				sisa: (existing?.sisa || 0) + sisa,
			});
		}
		setBonusBelumDibayar(
			Array.from(bonusMap.values())
				.filter((b) => b.sisa > 0)
				.sort((a, b) => b.sisa - a.sisa)
				.slice(0, 8),
		);

		setLoading(false);
	}, []);

	if (loading) {
		return (
			<div className="flex items-center justify-center min-h-[60vh]">
				<Loader2 size={24} className="animate-spin text-gray-400" />
			</div>
		);
	}

	const totalPiutang = piutang.reduce(
		(s, p) => s + (p.total_harga_jual - p.uang_dp),
		0,
	);
	const countDp = piutang.filter((p) => p.status_bayar === "dp").length;
	const countBelum = piutang.filter(
		(p) => p.status_bayar === "belum_bayar",
	).length;
	const totalBonusBelumDibayar = bonusBelumDibayar.reduce(
		(s, b) => s + b.sisa,
		0,
	);

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
								Meja Kerja Keuangan
							</h1>
							{piutang.length > 0 ? (
								<span className="bg-red-500 text-white text-xs font-bold px-2.5 py-1 rounded-full">
									{piutang.length} tagihan belum lunas
								</span>
							) : (
								<span className="bg-green-100 text-green-700 text-xs font-semibold px-2.5 py-1 rounded-full flex items-center gap-1">
									<CheckCircle2 size={11} /> Semua tagihan lunas
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
			</div>

			{/* ══════════════════════════════════════
			    Ringkasan Bulan Ini
			══════════════════════════════════════ */}
			<div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
				<div className="flex items-center justify-between mb-4">
					<p className="font-semibold text-gray-800 text-sm">
						Ringkasan Bulan Ini
					</p>
					<Link
						href="/dashboard/keuangan/laporan"
						className="text-xs text-indigo-600 hover:text-indigo-800 font-medium flex items-center gap-1 transition">
						Laporan Lengkap <ExternalLink size={11} />
					</Link>
				</div>
				<div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
					<div className="bg-indigo-50 rounded-xl p-4">
						<div className="flex items-center gap-1.5 mb-1">
							<TrendingUp size={13} className="text-indigo-500" />
							<p className="text-xs font-medium text-indigo-600">Omset</p>
						</div>
						<p className="text-base font-bold text-indigo-700">
							{formatRupiah(omsetBulanIni)}
						</p>
					</div>
					<div className="bg-green-50 rounded-xl p-4">
						<div className="flex items-center gap-1.5 mb-1">
							<Wallet size={13} className="text-green-500" />
							<p className="text-xs font-medium text-green-600">Laba Kotor</p>
						</div>
						<p className="text-base font-bold text-green-700">
							{formatRupiah(labaKotorBulanIni)}
						</p>
					</div>
					<div className="bg-orange-50 rounded-xl p-4">
						<div className="flex items-center gap-1.5 mb-1">
							<TrendingDown size={13} className="text-orange-500" />
							<p className="text-xs font-medium text-orange-600">
								Pengeluaran
							</p>
						</div>
						<p className="text-base font-bold text-orange-700">
							{formatRupiah(pengeluaranBulanIni)}
						</p>
					</div>
					<div className="bg-red-50 rounded-xl p-4">
						<div className="flex items-center gap-1.5 mb-1">
							<AlertTriangle size={13} className="text-red-500" />
							<p className="text-xs font-medium text-red-600">
								Piutang Berjalan
							</p>
						</div>
						<p className="text-base font-bold text-red-700">
							{formatRupiah(totalPiutang)}
						</p>
					</div>
				</div>
			</div>

			{/* ══════════════════════════════════════
			    Tagihan Belum Lunas
			══════════════════════════════════════ */}
			{piutang.length > 0 && (
				<div className="bg-white rounded-2xl border border-red-200 shadow-sm overflow-hidden">
					<div className="flex items-center justify-between px-6 py-4 border-b border-red-100">
						<div className="flex items-center gap-2.5">
							<Wallet size={15} className="text-red-500" />
							<p className="font-semibold text-gray-900 text-sm">
								{piutang.length} Transaksi Belum Lunas
							</p>
						</div>
						<Link
							href="/dashboard/penjualan"
							className="text-xs text-indigo-600 hover:text-indigo-800 font-medium flex items-center gap-1 transition">
							Buka Penjualan <ExternalLink size={11} />
						</Link>
					</div>

					<div className="flex items-center gap-3 px-6 py-3 bg-red-50 border-b border-red-100 flex-wrap">
						{countBelum > 0 && (
							<span className="flex items-center gap-1.5 text-xs font-semibold text-red-700 bg-red-100 px-3 py-1 rounded-full">
								<span className="w-2 h-2 bg-red-500 rounded-full" />
								{countBelum} Belum Bayar
							</span>
						)}
						{countDp > 0 && (
							<span className="flex items-center gap-1.5 text-xs font-semibold text-amber-700 bg-amber-100 px-3 py-1 rounded-full">
								<span className="w-2 h-2 bg-amber-500 rounded-full" />
								{countDp} Baru DP
							</span>
						)}
						<span className="ml-auto text-xs font-bold text-red-700">
							Total sisa: {formatRupiah(totalPiutang)}
						</span>
					</div>

					<div className="divide-y divide-gray-50 max-h-72 overflow-y-auto">
						{piutang.slice(0, 15).map((p) => {
							const sisa = p.total_harga_jual - p.uang_dp;
							const dp = p.status_bayar === "dp";
							return (
								<div
									key={p.id}
									className="flex items-center justify-between gap-3 px-6 py-3">
									<div className="flex items-center gap-2.5 min-w-0">
										<div
											className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${dp ? "bg-amber-400" : "bg-red-400"}`}
										/>
										<div className="min-w-0">
											<Link
												href={`/dashboard/penjualan/${p.id}`}
												className="font-mono text-sm font-semibold text-indigo-600 hover:underline">
												{p.nomor_faktur}
											</Link>
											<span className="text-xs text-gray-500 ml-2">
												{p.reseller?.nama || p.nama_customer || "Umum"}
											</span>
										</div>
									</div>
									<div className="flex items-center gap-3 flex-shrink-0 text-right">
										<div>
											<p className="text-sm font-semibold text-red-700">
												{formatRupiah(sisa)}
											</p>
											<p className="text-xs text-gray-400">
												{labelHari(daysSince(p.tanggal))}
											</p>
										</div>
										<span
											className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${
												dp
													? "bg-amber-100 text-amber-700"
													: "bg-red-100 text-red-700"
											}`}>
											{dp ? "DP" : "Belum Bayar"}
										</span>
									</div>
								</div>
							);
						})}
					</div>
					{piutang.length > 15 && (
						<div className="px-6 py-2 border-t border-red-100 text-center">
							<span className="text-xs text-red-500">
								Menampilkan 15 dari {piutang.length} — buka halaman Penjualan
								untuk lihat semua
							</span>
						</div>
					)}
				</div>
			)}

			{/* ══════════════════════════════════════
			    Bonus Reseller Belum Dibayar
			══════════════════════════════════════ */}
			{bonusBelumDibayar.length > 0 && (
				<div className="bg-white rounded-2xl border border-amber-200 shadow-sm overflow-hidden">
					<div className="flex items-center justify-between px-6 py-4 border-b border-amber-100">
						<div className="flex items-center gap-2.5">
							<Gift size={15} className="text-amber-500" />
							<p className="font-semibold text-gray-900 text-sm">
								Bonus Reseller Belum Dibayar
							</p>
						</div>
						<Link
							href="/dashboard/reseller"
							className="text-xs text-indigo-600 hover:text-indigo-800 font-medium flex items-center gap-1 transition">
							Buka Reseller <ExternalLink size={11} />
						</Link>
					</div>
					<div className="px-6 py-2.5 bg-amber-50 border-b border-amber-100">
						<p className="text-xs text-amber-700">
							Total sisa bonus semua reseller:{" "}
							<strong>{formatRupiah(totalBonusBelumDibayar)}</strong>
						</p>
					</div>
					<div className="divide-y divide-gray-50 max-h-64 overflow-y-auto">
						{bonusBelumDibayar.map((b) => (
							<div
								key={b.reseller_id}
								className="flex items-center justify-between gap-3 px-6 py-3">
								<div className="flex items-center gap-2.5 min-w-0">
									<div className="w-1.5 h-1.5 rounded-full bg-amber-400 flex-shrink-0" />
									<span className="text-sm font-medium text-gray-800 truncate">
										{b.nama}
									</span>
								</div>
								<p className="text-sm font-semibold text-amber-700 flex-shrink-0">
									{formatRupiah(b.sisa)}
								</p>
							</div>
						))}
					</div>
				</div>
			)}

			{/* ══════════════════════════════════════
			    Pengeluaran Bulan Ini
			══════════════════════════════════════ */}
			<div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
				<div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
					<div className="flex items-center gap-2.5">
						<Receipt size={15} className="text-orange-500" />
						<p className="font-semibold text-gray-900 text-sm">
							Pengeluaran Bulan Ini
						</p>
					</div>
					<Link
						href="/dashboard/keuangan/pengeluaran"
						className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold transition">
						<Plus size={12} /> Kelola Pengeluaran
					</Link>
				</div>
				{pengeluaranTerbaru.length === 0 ? (
					<p className="text-sm text-gray-400 text-center py-8">
						Belum ada pengeluaran tercatat bulan ini
					</p>
				) : (
					<div className="divide-y divide-gray-50 max-h-72 overflow-y-auto">
						{pengeluaranTerbaru.map((p) => (
							<div
								key={p.id}
								className="flex items-center justify-between gap-3 px-6 py-3">
								<div className="flex items-center gap-2.5 min-w-0">
									<span
										className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${
											KATEGORI_COLORS[p.kategori] || KATEGORI_COLORS.Lainnya
										}`}>
										{p.kategori}
									</span>
									<span className="text-sm text-gray-700 truncate">
										{p.keterangan}
									</span>
								</div>
								<div className="flex items-center gap-3 flex-shrink-0 text-right">
									<p className="text-sm font-semibold text-gray-800">
										{formatRupiah(p.jumlah)}
									</p>
									<p className="text-xs text-gray-400 w-16 text-right">
										{new Date(p.tanggal).toLocaleDateString("id-ID", {
											day: "numeric",
											month: "short",
										})}
									</p>
								</div>
							</div>
						))}
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
						{
							href: "/dashboard/keuangan/laporan",
							label: "Laporan Keuangan",
							icon: FileSpreadsheet,
						},
						{
							href: "/dashboard/keuangan/pengeluaran",
							label: "Pengeluaran",
							icon: Receipt,
						},
						{
							href: "/dashboard/penjualan",
							label: "Penjualan & Pelunasan",
							icon: ShoppingCart,
						},
						{
							href: "/dashboard/reseller",
							label: "Reseller & Bonus",
							icon: Users,
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
