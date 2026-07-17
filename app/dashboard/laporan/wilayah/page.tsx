"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { formatRupiah } from "@/lib/utils";
import {
	BarChart,
	Bar,
	XAxis,
	YAxis,
	Tooltip,
	ResponsiveContainer,
	Cell,
} from "recharts";
import { MapPin } from "lucide-react";

interface WilayahStat {
	tujuan: string;
	jumlah_transaksi: number;
	total_omset: number;
	total_unit: number;
}

const MEDAL_COLORS = [
	"bg-amber-400 text-white",
	"bg-gray-300 text-gray-700",
	"bg-amber-700/70 text-white",
];

const BAR_COLORS = [
	"#6366f1",
	"#8b5cf6",
	"#a855f7",
	"#d946ef",
	"#ec4899",
	"#f43f5e",
	"#f97316",
	"#f59e0b",
	"#84cc16",
	"#22c55e",
];

const LAP_ROLES = ["superadmin", "keuangan", "gudang"];

export default function LaporanWilayahPage() {
	const { role, loading: authLoading } = useAuth();
	const router = useRouter();
	const supabase = createClient();
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		if (!authLoading && !LAP_ROLES.includes(role ?? "")) router.replace("/dashboard");
	}, [role, authLoading, router]);

	if (authLoading || !LAP_ROLES.includes(role ?? "")) return null;
	const [filter, setFilter] = useState({ dari: "", sampai: "" });
	const [view, setView] = useState<"omset" | "unit">("omset");
	const [stats, setStats] = useState<WilayahStat[]>([]);

	useEffect(() => {
		const now = new Date();
		const y = now.getFullYear(),
			m = now.getMonth();
		const dari = new Date(y, m, 1).toISOString().split("T")[0];
		const sampai = new Date(y, m + 1, 0).toISOString().split("T")[0];
		setFilter({ dari, sampai });
	}, []);

	useEffect(() => {
		if (filter.dari && filter.sampai) load();
	}, [filter]);

	const load = async () => {
		setLoading(true);
		const { data } = await supabase
			.from("penjualan")
			.select("tujuan, total_harga_jual, items:penjualan_item(jumlah)")
			.gte("tanggal", filter.dari + "T00:00:00")
			.lte("tanggal", filter.sampai + "T23:59:59");

		const map: Record<string, WilayahStat> = {};
		for (const p of data || []) {
			const raw = (p.tujuan || "").trim();
			const key = raw ? raw.toLowerCase() : "tidak diketahui";
			const tujuan = raw
				? raw.replace(/\w\S*/g, (t: string) => t.charAt(0).toUpperCase() + t.slice(1).toLowerCase())
				: "Tidak Diketahui";
			if (!map[key])
				map[key] = {
					tujuan,
					jumlah_transaksi: 0,
					total_omset: 0,
					total_unit: 0,
				};
			map[key].jumlah_transaksi += 1;
			map[key].total_omset += p.total_harga_jual || 0;
			map[key].total_unit += (p.items || []).reduce(
				(s: number, i: any) => s + i.jumlah,
				0,
			);
		}

		setStats(Object.values(map));
		setLoading(false);
	};

	const sorted = [...stats]
		.sort((a, b) =>
			view === "omset"
				? b.total_omset - a.total_omset
				: b.total_unit - a.total_unit,
		)
		.slice(0, 20);

	const chartTop10 = sorted.slice(0, 10).map((r) => ({
		tujuan: r.tujuan.length > 16 ? r.tujuan.slice(0, 16) + "…" : r.tujuan,
		value:
			view === "omset"
				? Math.round(r.total_omset / 1000)
				: r.total_unit,
	}));

	const chartLabel = view === "omset" ? "Omset (Ribu Rp)" : "Unit Terjual";
	const chartHeight = Math.min(10, sorted.length) * 46 + 24;

	return (
		<div>
			<div className="mb-8">
				<h1 className="text-2xl font-bold text-gray-900">
					Laporan Wilayah Penjualan
				</h1>
				<p className="text-gray-500 mt-1">
					Peringkat wilayah (tujuan pengiriman) berdasarkan omset & unit penjualan
				</p>
			</div>

			{/* Filter + Toggle */}
			<div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 mb-6 flex flex-wrap gap-4 items-end">
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
				<div className="flex rounded-xl border border-gray-200 overflow-hidden ml-auto">
					<button
						onClick={() => setView("omset")}
						className={`px-5 py-2 text-sm font-medium transition ${view === "omset" ? "bg-indigo-600 text-white" : "bg-white text-gray-600 hover:bg-gray-50"}`}>
						By Omset
					</button>
					<button
						onClick={() => setView("unit")}
						className={`px-5 py-2 text-sm font-medium transition ${view === "unit" ? "bg-indigo-600 text-white" : "bg-white text-gray-600 hover:bg-gray-50"}`}>
						By Unit
					</button>
				</div>
			</div>

			{loading ? (
				<div className="text-center py-20 text-gray-400">
					Memuat laporan...
				</div>
			) : sorted.length === 0 ? (
				<div className="text-center py-20 text-gray-400">
					Tidak ada data pada periode ini
				</div>
			) : (
				<>
					{/* Bar Chart Top 10 */}
					<div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 mb-6">
						<h2 className="text-base font-semibold text-gray-900 mb-5">
							Top {Math.min(10, sorted.length)} Wilayah —{" "}
							<span className="text-indigo-600">{chartLabel}</span>
						</h2>
						<ResponsiveContainer width="100%" height={chartHeight}>
							<BarChart
								data={chartTop10}
								layout="vertical"
								margin={{ left: 12, right: 32, top: 0, bottom: 0 }}>
								<XAxis
									type="number"
									tick={{ fontSize: 11 }}
									tickFormatter={(v) =>
										view === "omset"
											? v >= 1000
												? `${(v / 1000).toFixed(0)}jt`
												: `${v}rb`
											: String(v)
									}
								/>
								<YAxis
									type="category"
									dataKey="tujuan"
									width={130}
									tick={{ fontSize: 12 }}
								/>
								<Tooltip
									formatter={(v: number) =>
										view === "omset"
											? formatRupiah(v * 1000)
											: `${v} unit`
									}
								/>
								<Bar dataKey="value" radius={[0, 6, 6, 0]}>
									{chartTop10.map((_, i) => (
										<Cell
											key={i}
											fill={BAR_COLORS[i % BAR_COLORS.length]}
										/>
									))}
								</Bar>
							</BarChart>
						</ResponsiveContainer>
					</div>

					{/* Table Top 20 */}
					<div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
						<div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
							<MapPin size={16} className="text-amber-500" />
							<h2 className="text-base font-semibold text-gray-900">
								Top {sorted.length} Wilayah —{" "}
								{view === "omset" ? "By Omset" : "By Unit Penjualan"}
							</h2>
						</div>
						<div className="overflow-x-auto">
							<table className="w-full text-sm">
								<thead className="bg-gray-50 border-b border-gray-100">
									<tr>
										<th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase w-12">
											#
										</th>
										<th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">
											Wilayah
										</th>
										<th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase">
											Transaksi
										</th>
										<th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">
											Unit Terjual
										</th>
										<th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">
											Total Omset
										</th>
									</tr>
								</thead>
								<tbody className="divide-y divide-gray-50">
									{sorted.map((r, i) => (
										<tr
											key={r.tujuan}
											className={`hover:bg-gray-50 transition ${i < 3 ? "bg-amber-50/40" : ""}`}>
											<td className="px-4 py-3 text-center">
												{i < 3 ? (
													<span
														className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold ${MEDAL_COLORS[i]}`}>
														{i + 1}
													</span>
												) : (
													<span className="text-gray-400 font-medium">
														{i + 1}
													</span>
												)}
											</td>
											<td className="px-4 py-3 font-medium text-gray-900">
												{r.tujuan}
											</td>
											<td className="px-4 py-3 text-center text-gray-500">
												{r.jumlah_transaksi}x
											</td>
											<td className="px-4 py-3 text-right font-medium text-gray-900">
												{r.total_unit.toLocaleString("id-ID")}{" "}
												<span className="text-gray-400 text-xs font-normal">
													unit
												</span>
											</td>
											<td className="px-4 py-3 text-right font-semibold text-indigo-600">
												{formatRupiah(r.total_omset)}
											</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>
					</div>
				</>
			)}
		</div>
	);
}
