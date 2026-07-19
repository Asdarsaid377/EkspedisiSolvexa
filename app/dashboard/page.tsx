"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { formatRupiah, formatDate } from "@/lib/utils";
import {
	Package,
	TrendingUp,
	AlertTriangle,
	AlertCircle,
	PackageX,
	Undo2,
} from "lucide-react";
import {
	BarChart,
	Bar,
	XAxis,
	YAxis,
	Tooltip,
	Legend,
	ResponsiveContainer,
	CartesianGrid,
} from "recharts";
import Link from "next/link";
import { MilestonePengiriman } from "@/lib/types";

const BULAN_NAMA = [
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
];

const MILESTONE_LABEL: Record<MilestonePengiriman, string> = {
	diproses: "Diproses",
	dijemput: "Dijemput",
	dikirim: "Dikirim",
	gagal_kirim: "Gagal Kirim",
	retur: "Retur",
	selesai: "Selesai",
};

const MILESTONE_BADGE: Record<MilestonePengiriman, string> = {
	diproses: "bg-blue-100 text-blue-700",
	dijemput: "bg-purple-100 text-purple-700",
	dikirim: "bg-indigo-100 text-indigo-700",
	gagal_kirim: "bg-red-100 text-red-700",
	retur: "bg-orange-100 text-orange-700",
	selesai: "bg-green-100 text-green-700",
};

interface Stats {
	kirimanPeriode: number;
	revenueOngkir: number;
	gagalKirimAktif: number;
	retur: number;
}

export default function DashboardPage() {
	const { isSuperAdmin, role } = useAuth();
	const canLihatFinansial = isSuperAdmin || role === "keuangan";
	const supabase = createClient();

	const [stats, setStats] = useState<Stats>({
		kirimanPeriode: 0,
		revenueOngkir: 0,
		gagalKirimAktif: 0,
		retur: 0,
	});
	const [chartData, setChartData] = useState<any[]>([]);
	const [recent, setRecent] = useState<any[]>([]);
	const [belumLunas, setBelumLunas] = useState<any[]>([]);
	const [cabangList, setCabangList] = useState<any[]>([]);
	const [filterCabang, setFilterCabang] = useState("semua");
	const [loading, setLoading] = useState(true);
	const now = new Date();
	const [filterBulan, setFilterBulan] = useState({
		bulan: now.getMonth() + 1,
		tahun: now.getFullYear(),
	});

	useEffect(() => {
		supabase
			.from("cabang")
			.select("id, nama")
			.eq("aktif", true)
			.order("nama")
			.then(({ data }) => setCabangList(data || []));
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	useEffect(() => {
		loadDashboard(filterBulan.bulan, filterBulan.tahun, filterCabang);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [filterBulan, filterCabang]);

	const loadDashboard = async (bulan: number, tahun: number, cabangId: string) => {
		const dariStr = `${tahun}-${String(bulan).padStart(2, "0")}-01T00:00:00`;
		const sampaiDate = new Date(tahun, bulan, 0); // hari terakhir bulan
		const sampaiStr = `${tahun}-${String(bulan).padStart(2, "0")}-${String(sampaiDate.getDate()).padStart(2, "0")}T23:59:59`;

		let periodeQuery = supabase
			.from("pengiriman")
			.select("id, tanggal, jenis_layanan, milestone, total_tagihan")
			.gte("tanggal", dariStr)
			.lte("tanggal", sampaiStr);
		let belumLunasQuery = supabase
			.from("pengiriman")
			.select(
				"id, nomor_faktur, penerima_nama, total_tagihan, uang_dp, status_bayar",
			)
			.neq("status_bayar", "lunas")
			.order("created_at", { ascending: false });
		let recentQuery = supabase
			.from("pengiriman")
			.select(
				"id, nomor_faktur, penerima_nama, penerima_kota, tanggal, milestone, total_tagihan",
			)
			.order("created_at", { ascending: false })
			.limit(5);

		if (cabangId !== "semua") {
			periodeQuery = periodeQuery.eq("cabang_id", cabangId);
			belumLunasQuery = belumLunasQuery.eq("cabang_id", cabangId);
			recentQuery = recentQuery.eq("cabang_id", cabangId);
		}

		const [periodeRes, blRes, recentRes] = await Promise.all([
			periodeQuery,
			belumLunasQuery,
			recentQuery,
		]);

		const periodeData = periodeRes.data || [];

		setStats({
			kirimanPeriode: periodeData.length,
			revenueOngkir: periodeData.reduce((s, p) => s + (p.total_tagihan || 0), 0),
			gagalKirimAktif: periodeData.filter((p) => p.milestone === "gagal_kirim")
				.length,
			retur: periodeData.filter((p) => p.milestone === "retur").length,
		});

		setBelumLunas(blRes.data || []);
		setRecent(recentRes.data || []);

		// Chart: kiriman per hari, breakdown per jenis layanan
		const daysInMonth = sampaiDate.getDate();
		setChartData(
			Array.from({ length: daysInMonth }, (_, i) => {
				const d = new Date(tahun, bulan - 1, i + 1);
				const next = new Date(d);
				next.setDate(next.getDate() + 1);
				const dayData = periodeData.filter(
					(p) => p.tanggal >= d.toISOString() && p.tanggal < next.toISOString(),
				);
				return {
					tanggal: d.toLocaleDateString("id-ID", { day: "2-digit" }),
					reguler: dayData.filter((p) => p.jenis_layanan === "reguler").length,
					express: dayData.filter((p) => p.jenis_layanan === "express").length,
					kargo: dayData.filter((p) => p.jenis_layanan === "kargo").length,
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
		(s, p) => s + (p.total_tagihan - p.uang_dp),
		0,
	);

	const statCards = [
		{
			label: `Kiriman (${BULAN_NAMA[filterBulan.bulan - 1]} ${filterBulan.tahun})`,
			value: stats.kirimanPeriode,
			icon: Package,
			color: "bg-indigo-500",
			bg: "bg-indigo-50",
		},
		...(canLihatFinansial
			? [
					{
						label: "Revenue Ongkir",
						value: formatRupiah(stats.revenueOngkir),
						icon: TrendingUp,
						color: "bg-green-500",
						bg: "bg-green-50",
					},
				]
			: []),
		{
			label: "Belum Lunas",
			value: belumLunas.length,
			icon: AlertTriangle,
			color: belumLunas.length > 0 ? "bg-red-500" : "bg-gray-400",
			bg: belumLunas.length > 0 ? "bg-red-50" : "bg-gray-50",
		},
		{
			label: "Gagal Kirim Aktif",
			value: stats.gagalKirimAktif,
			icon: PackageX,
			color: stats.gagalKirimAktif > 0 ? "bg-red-500" : "bg-gray-400",
			bg: stats.gagalKirimAktif > 0 ? "bg-red-50" : "bg-gray-50",
		},
		{
			label: "Retur",
			value: stats.retur,
			icon: Undo2,
			color: stats.retur > 0 ? "bg-orange-500" : "bg-gray-400",
			bg: stats.retur > 0 ? "bg-orange-50" : "bg-gray-50",
		},
	];

	return (
		<div>
			<div className="flex items-center justify-between mb-8 flex-wrap gap-3">
				<div>
					<h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
					<p className="text-gray-500 mt-1">Ringkasan operasional pengiriman</p>
				</div>
				<div className="flex items-center gap-2">
					<select
						value={filterBulan.bulan}
						onChange={(e) =>
							setFilterBulan((f) => ({ ...f, bulan: Number(e.target.value) }))
						}
						className="px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
						{BULAN_NAMA.map((nama, i) => (
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
					{cabangList.length > 0 && (
						<select
							value={filterCabang}
							onChange={(e) => setFilterCabang(e.target.value)}
							className="px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
							<option value="semua">Semua Cabang</option>
							{cabangList.map((c) => (
								<option key={c.id} value={c.id}>
									{c.nama}
								</option>
							))}
						</select>
					)}
				</div>
			</div>

			{/* Widget Belum Lunas — nominal & rincian hanya untuk role finansial */}
			{canLihatFinansial && belumLunas.length > 0 && (
				<div className="bg-red-50 border border-red-200 rounded-2xl p-5 mb-6">
					<div className="flex items-center justify-between mb-4">
						<div className="flex items-center gap-2">
							<AlertCircle size={18} className="text-red-500" />
							<h2 className="font-semibold text-red-800">
								Tagihan Belum Lunas
							</h2>
						</div>
						<Link
							href="/dashboard/pengiriman"
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
							const sisa = p.total_tagihan - p.uang_dp;
							return (
								<div
									key={p.id}
									className="flex items-center justify-between bg-white/70 rounded-xl px-4 py-2.5 text-sm">
									<div>
										<Link
											href={`/dashboard/pengiriman/${p.id}`}
											className="font-mono text-xs font-medium text-indigo-600 hover:underline">
											{p.nomor_faktur}
										</Link>
										<span className="text-gray-500 mx-2">·</span>
										<span className="text-gray-600">{p.penerima_nama}</span>
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
			<div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 mb-8">
				<h2 className="text-lg font-semibold text-gray-900 mb-6">
					Kiriman per Hari · {BULAN_NAMA[filterBulan.bulan - 1]}{" "}
					{filterBulan.tahun}
				</h2>
				<ResponsiveContainer width="100%" height={250}>
					<BarChart data={chartData} barGap={2}>
						<CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
						<XAxis dataKey="tanggal" tick={{ fontSize: 12 }} />
						<YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
						<Tooltip />
						<Legend wrapperStyle={{ fontSize: 12 }} />
						<Bar
							dataKey="reguler"
							stackId="jenis"
							fill="#6366f1"
							radius={[0, 0, 0, 0]}
							name="Reguler"
						/>
						<Bar
							dataKey="express"
							stackId="jenis"
							fill="#f59e0b"
							radius={[0, 0, 0, 0]}
							name="Express"
						/>
						<Bar
							dataKey="kargo"
							stackId="jenis"
							fill="#a855f7"
							radius={[4, 4, 0, 0]}
							name="Kargo"
						/>
					</BarChart>
				</ResponsiveContainer>
			</div>

			{/* Recent Pengiriman */}
			<div className="bg-white rounded-2xl shadow-sm border border-gray-100">
				<div className="p-6 border-b border-gray-100">
					<h2 className="text-lg font-semibold text-gray-900">
						Pengiriman Terbaru
					</h2>
				</div>
				<div className="divide-y divide-gray-50">
					{recent.length === 0 ? (
						<p className="text-center py-8 text-gray-400">
							Belum ada pengiriman
						</p>
					) : (
						recent.map((p) => (
							<div
								key={p.id}
								className="px-6 py-4 flex items-center justify-between">
								<div>
									<Link
										href={`/dashboard/pengiriman/${p.id}`}
										className="font-medium text-indigo-600 hover:underline text-sm">
										{p.nomor_faktur}
									</Link>
									<p className="text-xs text-gray-500">
										{p.penerima_nama}
										{p.penerima_kota ? ` · ${p.penerima_kota}` : ""} ·{" "}
										{formatDate(p.tanggal)}
									</p>
								</div>
								<div className="text-right">
									<p className="font-semibold text-gray-900 text-sm">
										{formatRupiah(p.total_tagihan)}
									</p>
									<span
										className={`text-xs px-2 py-0.5 rounded-full ${MILESTONE_BADGE[p.milestone as MilestonePengiriman]}`}>
										{MILESTONE_LABEL[p.milestone as MilestonePengiriman]}
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
