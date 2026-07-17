"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { formatRupiah, formatDate } from "@/lib/utils";
import {
	Package,
	ShoppingCart,
	TrendingUp,
	AlertTriangle,
	DollarSign,
	AlertCircle,
} from "lucide-react";
import {
	BarChart,
	Bar,
	XAxis,
	YAxis,
	Tooltip,
	ResponsiveContainer,
	CartesianGrid,
} from "recharts";
import Link from "next/link";

interface Stats {
	totalPenjualan: number;
	totalLaba: number;
	totalBonus: number;
	jumlahProduk: number;
	stokMenuipis: number;
	penjualanHariIni: number;
}

export default function DashboardPage() {
	const { isSuperAdmin } = useAuth();
	const [stats, setStats] = useState<Stats>({
		totalPenjualan: 0,
		totalLaba: 0,
		totalBonus: 0,
		jumlahProduk: 0,
		stokMenuipis: 0,
		penjualanHariIni: 0,
	});
	const [chartData, setChartData] = useState<any[]>([]);
	const [recentSales, setRecentSales] = useState<any[]>([]);
	const [belumLunas, setBelumLunas] = useState<any[]>([]);
	const [loading, setLoading] = useState(true);
	const now = new Date();
	const [filterBulan, setFilterBulan] = useState({
		bulan: now.getMonth() + 1,
		tahun: now.getFullYear(),
	});
	const supabase = createClient();

	useEffect(() => {
		loadDashboard(filterBulan.bulan, filterBulan.tahun);
	}, [filterBulan]);

	const loadDashboard = async (bulan: number, tahun: number) => {
		const today = new Date();
		today.setHours(0, 0, 0, 0);

		const dariStr = `${tahun}-${String(bulan).padStart(2, "0")}-01T00:00:00`;
		const sampaiDate = new Date(tahun, bulan, 0); // last day of month
		const sampaiStr = `${tahun}-${String(bulan).padStart(2, "0")}-${String(sampaiDate.getDate()).padStart(2, "0")}T23:59:59`;

		const [penjualanRes, produkRes, stokRes, blRes, recentRes] =
			await Promise.all([
				supabase
					.from("penjualan")
					.select(
						"total_harga_katalog, total_laba, total_bonus, tanggal, status_bayar",
					)
					.gte("tanggal", dariStr)
					.lte("tanggal", sampaiStr),
				supabase.from("produk").select("id").eq("aktif", true),
				supabase
					.from("produk")
					.select("id")
					.eq("aktif", true)
					.filter("stok", "lte", "stok_minimum"),
				supabase
					.from("penjualan")
					.select("*, reseller:resellers(nama)")
					.neq("status_bayar", "lunas")
					.order("created_at", { ascending: false }),
				supabase
					.from("penjualan")
					.select("*, reseller:resellers(nama)")
					.order("created_at", { ascending: false })
					.limit(5),
			]);

		const penjualanData = penjualanRes.data || [];
		const todayStr = today.toISOString();
		const hariIni = penjualanData.filter((p) => p.tanggal >= todayStr);

		setStats({
			totalPenjualan: penjualanData.reduce(
				(s, p) => s + (p.total_harga_katalog || 0),
				0,
			),
			totalLaba: isSuperAdmin
				? penjualanData.reduce((s, p) => s + (p.total_laba || 0), 0)
				: 0,
			totalBonus: penjualanData
				.filter((p) => p.status_bayar === "lunas")
				.reduce((s, p) => s + (p.total_bonus || 0), 0),
			jumlahProduk: produkRes.data?.length || 0,
			stokMenuipis: stokRes.data?.length || 0,
			penjualanHariIni: hariIni.reduce(
				(s, p) => s + (p.total_harga_katalog || 0),
				0,
			),
		});

		setBelumLunas(blRes.data || []);
		setRecentSales(recentRes.data || []);

		// Chart: per hari dalam bulan yang dipilih
		const daysInMonth = sampaiDate.getDate();
		const chartDays = Array.from({ length: daysInMonth }, (_, i) => {
			const d = new Date(tahun, bulan - 1, i + 1);
			return d;
		});
		setChartData(
			chartDays.map((d) => {
				const next = new Date(d);
				next.setDate(next.getDate() + 1);
				const dayData = penjualanData.filter(
					(p) => p.tanggal >= d.toISOString() && p.tanggal < next.toISOString(),
				);
				return {
					tanggal: d.toLocaleDateString("id-ID", { day: "2-digit" }),
					penjualan:
						dayData.reduce((s, p) => s + (p.total_harga_katalog || 0), 0) / 1e6,
					laba: dayData.reduce((s, p) => s + (p.total_laba || 0), 0) / 1e6,
				};
			}),
		);

		setLoading(false);
	};

	if (loading)
		return (
			<div className="text-center py-20 text-gray-400">Memuat dashboard...</div>
		);

	const totalDP = belumLunas.reduce((s, p) => s + p.uang_dp, 0);
	const totalSisa = belumLunas.reduce(
		(s, p) => s + (p.total_harga_jual - p.uang_dp),
		0,
	);

	const statCards = [
		{
			label: `Total Penjualan (${["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"][filterBulan.bulan - 1]} ${filterBulan.tahun})`,
			value: formatRupiah(stats.totalPenjualan),
			icon: ShoppingCart,
			color: "bg-blue-500",
			bg: "bg-blue-50",
		},
		...(isSuperAdmin
			? [
					{
						label: "Total Keuntungan",
						value: formatRupiah(stats.totalLaba),
						icon: TrendingUp,
						color: "bg-green-500",
						bg: "bg-green-50",
					},
				]
			: []),
		{
			label: "Total Bonus Reseller",
			value: formatRupiah(stats.totalBonus),
			icon: DollarSign,
			color: "bg-purple-500",
			bg: "bg-purple-50",
		},
		{
			label: "Penjualan Hari Ini",
			value: formatRupiah(stats.penjualanHariIni),
			icon: TrendingUp,
			color: "bg-orange-500",
			bg: "bg-orange-50",
		},
		{
			label: "Jumlah Produk Aktif",
			value: stats.jumlahProduk,
			icon: Package,
			color: "bg-indigo-500",
			bg: "bg-indigo-50",
		},
		{
			label: "Stok Menipis",
			value: stats.stokMenuipis,
			icon: AlertTriangle,
			color: stats.stokMenuipis > 0 ? "bg-red-500" : "bg-gray-400",
			bg: stats.stokMenuipis > 0 ? "bg-red-50" : "bg-gray-50",
		},
	];

	return (
		<div>
			<div className="flex items-center justify-between mb-8">
				<div>
					<h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
					<p className="text-gray-500 mt-1">Ringkasan performa toko</p>
				</div>
				{isSuperAdmin && (
					<div className="flex items-center gap-2">
						<select
							value={filterBulan.bulan}
							onChange={(e) =>
								setFilterBulan((f) => ({ ...f, bulan: Number(e.target.value) }))
							}
							className="px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
							{[
								"Januari",
								"Februari",
								"Maret",
								"April",
								"Mei",
								"Juni",
								"Juli",
								"Agustus",
								"September",
								"Oktober",
								"November",
								"Desember",
							].map((nama, i) => (
								<option key={i} value={i + 1}>
									{nama}
								</option>
							))}
						</select>
						<select
							value={filterBulan.tahun}
							onChange={(e) =>
								setFilterBulan((f) => ({ ...f, tahun: Number(e.target.value) }))
							}
							className="px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
							{[2024, 2025, 2026, 2027].map((y) => (
								<option key={y} value={y}>
									{y}
								</option>
							))}
						</select>
					</div>
				)}
			</div>

			{/* Widget Belum Lunas */}
			{isSuperAdmin && belumLunas.length > 0 && (
				<div className="bg-red-50 border border-red-200 rounded-2xl p-5 mb-6">
					<div className="flex items-center justify-between mb-4">
						<div className="flex items-center gap-2">
							<AlertCircle size={18} className="text-red-500" />
							<h2 className="font-semibold text-red-800">
								Tagihan Belum Lunas
							</h2>
						</div>
						<Link
							href="/dashboard/penjualan"
							className="text-xs text-red-600 hover:underline font-medium">
							Lihat semua →
						</Link>
					</div>
					<div className="grid grid-cols-3 gap-4 mb-4">
						<div>
							<p className="text-xs text-red-500 mb-0.5">Jumlah Transaksi</p>
							<p className="text-xl font-bold text-red-700">
								{belumLunas.length}
							</p>
						</div>
						<div>
							<p className="text-xs text-red-500 mb-0.5">Total DP Terkumpul</p>
							<p className="text-xl font-bold text-yellow-700">
								{formatRupiah(totalDP)}
							</p>
						</div>
						<div>
							<p className="text-xs text-red-500 mb-0.5">Total Sisa Tagihan</p>
							<p className="text-xl font-bold text-red-700">
								{formatRupiah(totalSisa)}
							</p>
						</div>
					</div>
					<div className="space-y-2 max-h-40 overflow-y-auto">
						{belumLunas.slice(0, 5).map((p) => {
							const grandTotal = p.total_harga_jual;
							const sisa = grandTotal - p.uang_dp;
							return (
								<div
									key={p.id}
									className="flex items-center justify-between bg-white/70 rounded-xl px-4 py-2.5 text-sm">
									<div>
										<Link
											href={`/dashboard/penjualan/${p.id}`}
											className="font-mono text-xs font-medium text-indigo-600 hover:underline">
											{p.nomor_faktur}
										</Link>
										<span className="text-gray-500 mx-2">·</span>
										<span className="text-gray-600">
											{p.reseller?.nama || "Umum"}
										</span>
									</div>
									<div className="text-right">
										<span className="text-red-600 font-semibold">
											{formatRupiah(sisa)}
										</span>
										<span
											className={`ml-2 text-xs px-2 py-0.5 rounded-full ${p.status_bayar === "dp" ? "bg-yellow-100 text-yellow-700" : "bg-red-100 text-red-700"}`}>
											{p.status_bayar === "dp" ? "DP" : "Belum Bayar"}
										</span>
									</div>
								</div>
							);
						})}
					</div>
				</div>
			)}

			{/* Stats Grid */}
			<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
				{statCards.map((card, i) => (
					<div
						key={i}
						className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
						<div className="flex items-center justify-between mb-4">
							<p className="text-sm text-gray-500">{card.label}</p>
							<div className={`${card.bg} p-2 rounded-xl`}>
								<card.icon
									size={18}
									className={card.color.replace("bg-", "text-")}
								/>
							</div>
						</div>
						<p className="text-2xl font-bold text-gray-900">{card.value}</p>
					</div>
				))}
			</div>

			{/* Chart */}
			{isSuperAdmin && (
				<div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 mb-8">
					<h2 className="text-lg font-semibold text-gray-900 mb-6">
						Penjualan & Laba 7 Hari Terakhir (Juta)
					</h2>
					<ResponsiveContainer width="100%" height={250}>
						<BarChart data={chartData} barGap={4}>
							<CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
							<XAxis dataKey="tanggal" tick={{ fontSize: 12 }} />
							<YAxis tick={{ fontSize: 12 }} />
							<Tooltip formatter={(v: number) => `Rp ${v.toFixed(1)}jt`} />
							<Bar
								dataKey="penjualan"
								fill="#6366f1"
								radius={[4, 4, 0, 0]}
								name="Penjualan"
							/>
							<Bar
								dataKey="laba"
								fill="#22c55e"
								radius={[4, 4, 0, 0]}
								name="Laba"
							/>
						</BarChart>
					</ResponsiveContainer>
				</div>
			)}

			{/* Recent Sales */}
			<div className="bg-white rounded-2xl shadow-sm border border-gray-100">
				<div className="p-6 border-b border-gray-100">
					<h2 className="text-lg font-semibold text-gray-900">
						Penjualan Terbaru
					</h2>
				</div>
				<div className="divide-y divide-gray-50">
					{recentSales.length === 0 ? (
						<p className="text-center py-8 text-gray-400">
							Belum ada penjualan
						</p>
					) : (
						recentSales.map((sale) => (
							<div
								key={sale.id}
								className="px-6 py-4 flex items-center justify-between">
								<div>
									<Link
										href={`/dashboard/penjualan/${sale.id}`}
										className="font-medium text-indigo-600 hover:underline text-sm">
										{sale.nomor_faktur}
									</Link>
									<p className="text-xs text-gray-500">
										{sale.reseller?.nama || "Umum"} · {formatDate(sale.tanggal)}
									</p>
								</div>
								<div className="text-right">
									<p className="font-semibold text-gray-900 text-sm">
										{formatRupiah(sale.total_harga_jual)}
									</p>
									<span
										className={`text-xs px-2 py-0.5 rounded-full ${
											sale.status_bayar === "lunas"
												? "bg-green-100 text-green-700"
												: sale.status_bayar === "dp"
													? "bg-yellow-100 text-yellow-700"
													: "bg-red-100 text-red-700"
										}`}>
										{sale.status_bayar === "lunas"
											? "Lunas"
											: sale.status_bayar === "dp"
												? "DP"
												: "Belum Bayar"}
									</span>
								</div>
							</div>
						))
					)}
				</div>
			</div>
		</div>
	);
}
