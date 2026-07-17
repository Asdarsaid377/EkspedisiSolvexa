"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import {
	BarChart,
	Bar,
	XAxis,
	YAxis,
	Tooltip,
	ResponsiveContainer,
	Cell,
} from "recharts";
import { Trophy, Wrench, Package, Award, Tag } from "lucide-react";

interface TukangStat {
	nama: string;
	total: number;
	selesai: number;
	proses: number;
	batal: number;
	unit: number;
	kategoriTerbanyak: string;
}

const KATEGORI_LABEL: Record<string, string> = {
	pabrik: "Pabrik",
	premium: "Premium",
	semi_premium: "Semi Premium",
	jati: "Jati",
};

const MEDAL = [
	{ bg: "from-amber-400 to-yellow-300", border: "border-amber-300", text: "text-amber-700", badge: "bg-amber-400 text-white", icon: "🥇", label: "1st" },
	{ bg: "from-gray-300 to-gray-200",    border: "border-gray-300",  text: "text-gray-600",  badge: "bg-gray-400 text-white",  icon: "🥈", label: "2nd" },
	{ bg: "from-amber-700 to-amber-600",  border: "border-amber-600", text: "text-amber-100", badge: "bg-amber-700 text-white",  icon: "🥉", label: "3rd" },
];

const BAR_COLORS = [
	"#6366f1","#8b5cf6","#a855f7","#d946ef",
	"#ec4899","#f43f5e","#f97316","#f59e0b","#84cc16","#22c55e",
];

const LAP_ROLES = ["superadmin", "keuangan", "produksi"];

export default function LaporanTukangPage() {
	const { role, loading: authLoading } = useAuth();
	const router = useRouter();
	const supabase = createClient();
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		if (!authLoading && !LAP_ROLES.includes(role ?? "")) router.replace("/dashboard");
	}, [role, authLoading, router]);

	if (authLoading || !LAP_ROLES.includes(role ?? "")) return null;
	const [filter, setFilter] = useState({ dari: "", sampai: "" });
	const [stats, setStats] = useState<TukangStat[]>([]);

	useEffect(() => {
		const now = new Date();
		const dari = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];
		const sampai = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split("T")[0];
		setFilter({ dari, sampai });
	}, []);

	const load = useCallback(async () => {
		if (!filter.dari || !filter.sampai) return;
		setLoading(true);

		const { data } = await supabase
			.from("purchase_orders")
			.select("nama_tukang, status, kategori_po, tanggal_po, items:purchase_order_items(jumlah)")
			.not("nama_tukang", "is", null)
			.neq("nama_tukang", "")
			.gte("tanggal_po", filter.dari)
			.lte("tanggal_po", filter.sampai + "T23:59:59");

		// Agregasi per tukang
		const map: Record<string, { total: number; selesai: number; proses: number; batal: number; unit: number; kategori: Record<string, number> }> = {};

		for (const po of data || []) {
			const nama = (po.nama_tukang as string).trim();
			if (!nama) continue;
			if (!map[nama]) map[nama] = { total: 0, selesai: 0, proses: 0, batal: 0, unit: 0, kategori: {} };
			map[nama].total++;
			if (po.status === "selesai") map[nama].selesai++;
			if (po.status === "proses") map[nama].proses++;
			if (po.status === "batal") map[nama].batal++;
			for (const item of (po.items as any[]) || []) {
				map[nama].unit += item.jumlah || 0;
			}
			if (po.kategori_po) {
				const k = po.kategori_po as string;
				map[nama].kategori[k] = (map[nama].kategori[k] || 0) + 1;
			}
		}

		const result: TukangStat[] = Object.entries(map)
			.map(([nama, d]) => ({
				nama,
				total: d.total,
				selesai: d.selesai,
				proses: d.proses,
				batal: d.batal,
				unit: d.unit,
				kategoriTerbanyak: Object.entries(d.kategori).sort((a, b) => b[1] - a[1])[0]?.[0] || "-",
			}))
			.sort((a, b) => b.total - a.total);

		setStats(result);
		setLoading(false);
	}, [filter]);

	useEffect(() => { load(); }, [load]);

	const top3 = stats.slice(0, 3);
	const chartData = stats.slice(0, 10).map((s) => ({
		nama: s.nama.length > 14 ? s.nama.slice(0, 13) + "…" : s.nama,
		namaFull: s.nama,
		total: s.total,
		unit: s.unit,
	}));

	// Podium order: 2nd - 1st - 3rd
	const podiumOrder = [top3[1], top3[0], top3[2]];
	const podiumHeights = ["h-28", "h-36", "h-20"];
	const podiumMedal = [MEDAL[1], MEDAL[0], MEDAL[2]];
	const podiumRank = [1, 0, 2];

	return (
		<div>
			{/* Header */}
			<div className="flex items-center justify-between mb-6">
				<div>
					<h1 className="text-2xl font-bold text-gray-900">Laporan Tukang</h1>
					<p className="text-gray-500 mt-1">Peringkat tukang berdasarkan jumlah PO yang dikerjakan</p>
				</div>
				<div className="flex items-center gap-2">
					<input
						type="date"
						value={filter.dari}
						onChange={(e) => setFilter((f) => ({ ...f, dari: e.target.value }))}
						className="px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
					/>
					<span className="text-gray-400">–</span>
					<input
						type="date"
						value={filter.sampai}
						onChange={(e) => setFilter((f) => ({ ...f, sampai: e.target.value }))}
						className="px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
					/>
				</div>
			</div>

			{loading ? (
				<div className="text-center py-20 text-gray-400">Memuat data...</div>
			) : stats.length === 0 ? (
				<div className="text-center py-20">
					<Wrench size={48} className="mx-auto text-gray-300 mb-3" />
					<p className="text-gray-500 font-medium">Tidak ada data tukang di periode ini</p>
					<p className="text-sm text-gray-400 mt-1">Isi nama tukang saat menekan "Mulai Proses" pada PO</p>
				</div>
			) : (
				<div className="space-y-6">
					{/* ─── PODIUM TOP 3 ─── */}
					{top3.length > 0 && (
						<div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
							<div className="flex items-center gap-2 mb-6">
								<Trophy size={18} className="text-amber-500" />
								<h2 className="font-semibold text-gray-800">Top 3 Tukang Terbaik</h2>
							</div>

							{/* Podium visual */}
							<div className="flex items-end justify-center gap-3 mb-6">
								{podiumOrder.map((tukang, i) => {
									if (!tukang) return <div key={i} className="w-36" />;
									const medal = podiumMedal[i];
									const rank = podiumRank[i];
									return (
										<div key={tukang.nama} className="flex flex-col items-center w-36">
											{/* Card di atas podium */}
											<div className={`w-full bg-gradient-to-b ${medal.bg} rounded-2xl p-4 text-center border ${medal.border} shadow-sm mb-2`}>
												<div className="text-2xl mb-1">{medal.icon}</div>
												<p className={`font-bold text-sm leading-snug ${rank === 0 ? "text-amber-900" : rank === 1 ? medal.text : "text-amber-100"}`}>
													{tukang.nama}
												</p>
												<p className={`text-2xl font-black mt-2 ${rank === 0 ? "text-amber-800" : rank === 1 ? "text-gray-700" : "text-amber-200"}`}>
													{tukang.total}
												</p>
												<p className={`text-xs mt-0.5 ${rank === 0 ? "text-amber-700" : rank === 1 ? "text-gray-500" : "text-amber-300"}`}>
													PO dikerjakan
												</p>
												<div className={`mt-2 pt-2 border-t text-xs ${rank === 0 ? "border-amber-300 text-amber-700" : rank === 1 ? "border-gray-300 text-gray-500" : "border-amber-500 text-amber-300"}`}>
													{tukang.selesai} selesai · {tukang.unit} unit
												</div>
											</div>
											{/* Podium block */}
											<div className={`w-full ${podiumHeights[i]} ${
												rank === 0 ? "bg-amber-400" : rank === 1 ? "bg-gray-300" : "bg-amber-700/70"
											} rounded-t-xl flex items-center justify-center shadow-inner`}>
												<span className="font-black text-white text-xl">
													{rank + 1}
												</span>
											</div>
										</div>
									);
								})}
							</div>

							{/* Stats mini row untuk top 3 */}
							<div className="grid grid-cols-3 gap-3">
								{top3.map((s) => (
									<div key={s.nama} className="bg-gray-50 rounded-xl p-3 text-center">
										<p className="text-xs text-gray-400 mb-1">Sedang Diproses</p>
										<p className="font-bold text-gray-900">{s.proses} PO</p>
										{s.kategoriTerbanyak !== "-" && (
											<p className="text-xs text-gray-400 mt-1 flex items-center justify-center gap-1">
												<Tag size={10} /> {KATEGORI_LABEL[s.kategoriTerbanyak] || s.kategoriTerbanyak}
											</p>
										)}
									</div>
								))}
							</div>
						</div>
					)}

					{/* ─── BAR CHART ─── */}
					{chartData.length > 0 && (
						<div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
							<h2 className="font-semibold text-gray-800 mb-5">
								Top {chartData.length} Tukang — Jumlah PO Dikerjakan
							</h2>
							<ResponsiveContainer width="100%" height={chartData.length * 44 + 20}>
								<BarChart
									data={chartData}
									layout="vertical"
									margin={{ left: 8, right: 32, top: 0, bottom: 0 }}>
									<XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
									<YAxis
										type="category"
										dataKey="nama"
										tick={{ fontSize: 12, fontWeight: 500 }}
										width={120}
									/>
									<Tooltip
										formatter={(value: number) => [`${value} PO`, "Jumlah Dikerjakan"]}
										labelFormatter={(label: string, payload: any[]) =>
											payload?.[0]?.payload?.namaFull || label
										}
									/>
									<Bar dataKey="total" radius={[0, 6, 6, 0]}>
										{chartData.map((_, i) => (
											<Cell key={i} fill={BAR_COLORS[i % BAR_COLORS.length]} />
										))}
									</Bar>
								</BarChart>
							</ResponsiveContainer>
						</div>
					)}

					{/* ─── TABEL LENGKAP ─── */}
					<div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
						<div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
							<Award size={16} className="text-indigo-500" />
							<h2 className="font-semibold text-gray-800">Peringkat Lengkap</h2>
							<span className="ml-auto text-sm text-gray-400">{stats.length} tukang</span>
						</div>
						<div className="overflow-x-auto">
							<table className="w-full text-sm">
								<thead className="bg-gray-50 border-b border-gray-100">
									<tr>
										<th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase w-12">
											#
										</th>
										<th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">
											Nama Tukang
										</th>
										<th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase">
											Total PO
										</th>
										<th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase">
											Selesai
										</th>
										<th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase">
											Diproses
										</th>
										<th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase">
											Total Unit
										</th>
										<th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">
											Kategori Terbanyak
										</th>
									</tr>
								</thead>
								<tbody className="divide-y divide-gray-50">
									{stats.map((s, i) => {
										const isTop3 = i < 3;
										const medal = MEDAL[i];
										return (
											<tr
												key={s.nama}
												className={`transition ${isTop3 ? "bg-amber-50/40 hover:bg-amber-50" : "hover:bg-gray-50"}`}>
												<td className="px-4 py-3.5 text-center">
													{isTop3 ? (
														<span className="text-lg">{medal.icon}</span>
													) : (
														<span className="text-sm font-bold text-gray-400">
															{i + 1}
														</span>
													)}
												</td>
												<td className="px-4 py-3.5">
													<div className="flex items-center gap-2.5">
														<div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
															isTop3
																? `bg-gradient-to-br ${medal.bg} ${medal.text}`
																: "bg-gray-100 text-gray-500"
														}`}>
															{s.nama.charAt(0).toUpperCase()}
														</div>
														<span className="font-medium text-gray-900">{s.nama}</span>
													</div>
												</td>
												<td className="px-4 py-3.5 text-center">
													<div className="flex flex-col items-center">
														<span className="font-bold text-gray-900 text-base">{s.total}</span>
														<div className="w-16 h-1 bg-gray-100 rounded-full mt-1">
															<div
																className="h-full bg-indigo-400 rounded-full"
																style={{ width: `${stats[0] ? (s.total / stats[0].total) * 100 : 0}%` }}
															/>
														</div>
													</div>
												</td>
												<td className="px-4 py-3.5 text-center">
													<span className="font-semibold text-green-600">{s.selesai}</span>
												</td>
												<td className="px-4 py-3.5 text-center">
													<span className="font-semibold text-blue-600">{s.proses}</span>
												</td>
												<td className="px-4 py-3.5 text-center">
													<span className="font-semibold text-gray-700">{s.unit}</span>
													<span className="text-xs text-gray-400 ml-1">unit</span>
												</td>
												<td className="px-4 py-3.5">
													{s.kategoriTerbanyak !== "-" ? (
														<span className="flex items-center gap-1 text-sm text-gray-600">
															<Package size={12} className="text-gray-400 flex-shrink-0" />
															{KATEGORI_LABEL[s.kategoriTerbanyak] || s.kategoriTerbanyak}
														</span>
													) : (
														<span className="text-gray-300 text-xs">—</span>
													)}
												</td>
											</tr>
										);
									})}
								</tbody>
							</table>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}
