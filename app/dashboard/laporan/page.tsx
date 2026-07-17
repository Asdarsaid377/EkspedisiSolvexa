"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { formatRupiah, formatDate } from "@/lib/utils";
import {
	BarChart,
	Bar,
	XAxis,
	YAxis,
	Tooltip,
	ResponsiveContainer,
	CartesianGrid,
	LineChart,
	Line,
} from "recharts";
import { Download, Calendar } from "lucide-react";
import Link from "next/link";

const LAP_ROLES = ["superadmin","keuangan","gudang"];

export default function LaporanPage() {
	const { isSuperAdmin, role, loading: authLoading } = useAuth();
	const router = useRouter();
	const supabase = createClient();

	useEffect(() => {
		if (!authLoading && !LAP_ROLES.includes(role ?? "")) router.replace("/dashboard");
	}, [role, authLoading, router]);

	if (authLoading || !LAP_ROLES.includes(role ?? "")) return null;
	const [loading, setLoading] = useState(true);
	const [filter, setFilter] = useState({
		dari: "",
		sampai: "",
		reseller_id: "",
	});
	const [resellerList, setResellerList] = useState<any[]>([]);
	const [data, setData] = useState<any[]>([]);
	const [ringkasan, setRingkasan] = useState({
		total_transaksi: 0,
		total_penjualan: 0,
		total_laba: 0,
		total_bonus: 0,
		total_ongkir: 0,
	});
	const [topProduk, setTopProduk] = useState<any[]>([]);
	const [topReseller, setTopReseller] = useState<any[]>([]);
	const [chartData, setChartData] = useState<any[]>([]);

	// Default: current month
	useEffect(() => {
		const now = new Date();
		const y = now.getFullYear(),
			m = now.getMonth();
		const dari = new Date(y, m, 1).toISOString().split("T")[0];
		const sampai = new Date(y, m + 1, 0).toISOString().split("T")[0];
		setFilter((f) => ({ ...f, dari, sampai }));
	}, []);

	useEffect(() => {
		supabase
			.from("resellers")
			.select("id, nama")
			.eq("aktif", true)
			.order("nama")
			.then((r) => setResellerList(r.data || []));
	}, []);

	useEffect(() => {
		if (filter.dari && filter.sampai) loadLaporan();
	}, [filter]);

	const loadLaporan = async () => {
		setLoading(true);
		let q = supabase
			.from("penjualan")
			.select(
				"*, reseller:resellers(nama), items:penjualan_item(*, produk:produk(nama))",
			)
			.gte("tanggal", filter.dari + "T00:00:00")
			.lte("tanggal", filter.sampai + "T23:59:59")
			.order("tanggal", { ascending: false });

		if (filter.reseller_id) q = q.eq("reseller_id", filter.reseller_id);

		const { data: penjualan } = await q;
		const rows = penjualan || [];
		setData(rows);

		setRingkasan({
			total_transaksi: rows.length,
			total_penjualan: rows.reduce(
				(s: number, p: any) => s + p.total_harga_katalog,
				0,
			),
			total_laba: rows.reduce((s: number, p: any) => s + p.total_laba, 0),
			total_bonus: rows
				.filter((p: any) => p.status_bayar === "lunas")
				.reduce((s: number, p: any) => s + p.total_bonus, 0),
			total_ongkir: rows.reduce((s: number, p: any) => s + p.total_ongkir, 0),
		});

		// Top produk
		const produkMap: Record<
			string,
			{ nama: string; jumlah: number; total: number }
		> = {};
		rows.forEach((p: any) => {
			p.items?.forEach((item: any) => {
				const nama = item.produk?.nama || "Unknown";
				if (!produkMap[nama]) produkMap[nama] = { nama, jumlah: 0, total: 0 };
				produkMap[nama].jumlah += item.jumlah;
				produkMap[nama].total += item.harga_katalog * item.jumlah;
			});
		});
		setTopProduk(
			Object.values(produkMap)
				.sort((a, b) => b.total - a.total)
				.slice(0, 5),
		);

		// Top reseller
		const resellerMap: Record<
			string,
			{ nama: string; total: number; bonus: number }
		> = {};
		rows.forEach((p: any) => {
			const nama = p.reseller?.nama || "Umum";
			if (!resellerMap[nama]) resellerMap[nama] = { nama, total: 0, bonus: 0 };
			resellerMap[nama].total += p.total_harga_katalog;
			if (p.status_bayar === "lunas") resellerMap[nama].bonus += p.total_bonus;
		});
		setTopReseller(
			Object.values(resellerMap)
				.sort((a, b) => b.total - a.total)
				.slice(0, 5),
		);

		// Chart by day
		const dayMap: Record<
			string,
			{ tanggal: string; penjualan: number; laba: number }
		> = {};
		rows.forEach((p: any) => {
			const day = p.tanggal.split("T")[0];
			if (!dayMap[day]) dayMap[day] = { tanggal: day, penjualan: 0, laba: 0 };
			dayMap[day].penjualan += p.total_harga_katalog / 1e6;
			dayMap[day].laba += p.total_laba / 1e6;
		});
		setChartData(
			Object.values(dayMap).sort((a, b) => a.tanggal.localeCompare(b.tanggal)),
		);

		setLoading(false);
	};

	return (
		<div>
			<div className="flex items-center justify-between mb-8">
				<div>
					<h1 className="text-2xl font-bold text-gray-900">
						Laporan Penjualan
					</h1>
					<p className="text-gray-500 mt-1">Analisis performa & keuangan</p>
				</div>
			</div>

			{/* Filter */}
			<div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 mb-6">
				<div className="flex flex-wrap gap-4 items-end">
					<div>
						<label className="block text-xs font-medium text-gray-500 mb-1">
							Dari Tanggal
						</label>
						<input
							type="date"
							value={filter.dari}
							onChange={(e) => setFilter({ ...filter, dari: e.target.value })}
							className="px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
						/>
					</div>
					<div>
						<label className="block text-xs font-medium text-gray-500 mb-1">
							Sampai Tanggal
						</label>
						<input
							type="date"
							value={filter.sampai}
							onChange={(e) => setFilter({ ...filter, sampai: e.target.value })}
							className="px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
						/>
					</div>
					<div>
						<label className="block text-xs font-medium text-gray-500 mb-1">
							Reseller
						</label>
						<select
							value={filter.reseller_id}
							onChange={(e) =>
								setFilter({ ...filter, reseller_id: e.target.value })
							}
							className="px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
							<option value="">Semua Reseller</option>
							{resellerList.map((r) => (
								<option key={r.id} value={r.id}>
									{r.nama}
								</option>
							))}
						</select>
					</div>
				</div>
			</div>

			{loading ? (
				<div className="text-center py-20 text-gray-400">Memuat laporan...</div>
			) : (
				<>
					{/* Ringkasan */}
					<div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
						{[
							{
								label: "Transaksi",
								value: ringkasan.total_transaksi,
								isMoney: false,
								color: "text-indigo-600",
							},
							{
								label: "Total Penjualan",
								value: ringkasan.total_penjualan,
								isMoney: true,
								color: "text-blue-600",
							},
							...(isSuperAdmin
								? [
										{
											label: "Total Keuntungan",
											value: ringkasan.total_laba,
											isMoney: true,
											color: "text-green-600",
										},
									]
								: []),
							{
								label: "Total Bonus",
								value: ringkasan.total_bonus,
								isMoney: true,
								color: "text-purple-600",
							},
							{
								label: "Total Ongkir",
								value: ringkasan.total_ongkir,
								isMoney: true,
								color: "text-orange-600",
							},
						].map((s, i) => (
							<div
								key={i}
								className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
								<p className="text-xs text-gray-500 mb-1">{s.label}</p>
								<p className={`text-lg font-bold ${s.color}`}>
									{s.isMoney ? formatRupiah(s.value as number) : s.value}
								</p>
							</div>
						))}
					</div>

					{/* Chart */}
					{chartData.length > 1 && (
						<div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 mb-8">
							<h2 className="text-base font-semibold text-gray-900 mb-4">
								Trend Penjualan (Juta Rupiah)
							</h2>
							<ResponsiveContainer width="100%" height={220}>
								<LineChart data={chartData}>
									<CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
									<XAxis dataKey="tanggal" tick={{ fontSize: 11 }} />
									<YAxis tick={{ fontSize: 11 }} />
									<Tooltip formatter={(v: number) => `Rp ${v.toFixed(1)}jt`} />
									<Line
										type="monotone"
										dataKey="penjualan"
										stroke="#6366f1"
										name="Penjualan"
										strokeWidth={2}
										dot={false}
									/>
									{isSuperAdmin && (
										<Line
											type="monotone"
											dataKey="laba"
											stroke="#22c55e"
											name="Laba"
											strokeWidth={2}
											dot={false}
										/>
									)}
								</LineChart>
							</ResponsiveContainer>
						</div>
					)}

					<div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
						{/* Top Produk */}
						<div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
							<h2 className="text-base font-semibold text-gray-900 mb-4">
								Top 5 Produk
							</h2>
							{topProduk.length === 0 ? (
								<p className="text-gray-400 text-sm">Tidak ada data</p>
							) : (
								<div className="space-y-3">
									{topProduk.map((p, i) => (
										<div key={i} className="flex items-center justify-between">
											<div className="flex items-center gap-3">
												<span className="w-6 h-6 bg-indigo-100 rounded-full text-xs font-bold text-indigo-600 flex items-center justify-center">
													{i + 1}
												</span>
												<div>
													<p className="text-sm font-medium text-gray-900">
														{p.nama}
													</p>
													<p className="text-xs text-gray-500">
														{p.jumlah} unit terjual
													</p>
												</div>
											</div>
											<p className="text-sm font-semibold text-gray-900">
												{formatRupiah(p.total)}
											</p>
										</div>
									))}
								</div>
							)}
						</div>

						{/* Top Reseller */}
						<div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
							<h2 className="text-base font-semibold text-gray-900 mb-4">
								Top 5 Reseller
							</h2>
							{topReseller.length === 0 ? (
								<p className="text-gray-400 text-sm">Tidak ada data</p>
							) : (
								<div className="space-y-3">
									{topReseller.map((r, i) => (
										<div key={i} className="flex items-center justify-between">
											<div className="flex items-center gap-3">
												<span className="w-6 h-6 bg-purple-100 rounded-full text-xs font-bold text-purple-600 flex items-center justify-center">
													{i + 1}
												</span>
												<div>
													<p className="text-sm font-medium text-gray-900">
														{r.nama}
													</p>
													<p className="text-xs text-purple-500">
														Bonus: {formatRupiah(r.bonus)}
													</p>
												</div>
											</div>
											<p className="text-sm font-semibold text-gray-900">
												{formatRupiah(r.total)}
											</p>
										</div>
									))}
								</div>
							)}
						</div>
					</div>

					{/* Tabel Transaksi */}
					<div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
						<div className="p-5 border-b border-gray-100">
							<h2 className="text-base font-semibold text-gray-900">
								Detail Transaksi ({data.length})
							</h2>
						</div>
						<div className="overflow-x-auto">
							<table className="w-full text-sm">
								<thead className="bg-gray-50 border-b border-gray-100">
									<tr>
										<th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">
											Faktur
										</th>
										<th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">
											Reseller
										</th>
										<th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">
											Tanggal
										</th>
										<th className="text-right px-5 py-3 text-xs font-semibold text-gray-500 uppercase">
											Total
										</th>
										<th className="text-right px-5 py-3 text-xs font-semibold text-gray-500 uppercase">
											Ongkir
										</th>
										<th className="text-right px-5 py-3 text-xs font-semibold text-gray-500 uppercase">
											Bonus
										</th>
										{isSuperAdmin && (
											<th className="text-right px-5 py-3 text-xs font-semibold text-gray-500 uppercase">
												Keuntungan
											</th>
										)}
									</tr>
								</thead>
								<tbody className="divide-y divide-gray-50">
									{data.length === 0 ? (
										<tr>
											<td
												colSpan={7}
												className="text-center py-10 text-gray-400">
												Tidak ada data
											</td>
										</tr>
									) : (
										data.map((p) => (
											<tr key={p.id} className="hover:bg-gray-50">
												<td className="px-5 py-3 font-mono text-xs">
													<Link href={`/dashboard/penjualan/${p.id}`} className="text-indigo-600 hover:underline">
														{p.nomor_faktur}
													</Link>
												</td>
												<td className="px-5 py-3">
													{p.reseller?.nama || "Umum"}
												</td>
												<td className="px-5 py-3 text-gray-500 text-xs">
													{formatDate(p.tanggal)}
												</td>
												<td className="px-5 py-3 text-right font-medium">
													{formatRupiah(p.total_harga_katalog)}
												</td>
												<td className="px-5 py-3 text-right text-orange-600">
													{formatRupiah(p.total_ongkir)}
												</td>
												<td className="px-5 py-3 text-right text-purple-600">
													{formatRupiah(p.total_bonus)}
												</td>
												{isSuperAdmin && (
													<td className="px-5 py-3 text-right text-green-600 font-medium">
														{formatRupiah(p.total_laba)}
													</td>
												)}
											</tr>
										))
									)}
								</tbody>
							</table>
						</div>
					</div>
				</>
			)}
		</div>
	);
}
