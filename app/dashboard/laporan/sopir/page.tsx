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
import { Trophy, Truck, Award, UserX } from "lucide-react";
import { MilestonePengiriman } from "@/lib/types";
import { getStatusKeterlambatan } from "@/lib/pengirimanConstants";

interface PetugasStat {
	id: string;
	nama: string;
	totalKiriman: number;
	selesai: number;
	gagalKirim: number; // SUM jumlah_gagal — total kejadian gagal, bukan cuma status akhir
	retur: number;
	onTimeCount: number;
	onTimeEligible: number; // selesai yang punya estimasi_hari (basis on-time rate)
}

const TANPA_PETUGAS_ID = "__tanpa_petugas__";

const MEDAL = [
	{ bg: "from-amber-400 to-yellow-300", border: "border-amber-300", text: "text-amber-700", badge: "bg-amber-400 text-white", icon: "🥇" },
	{ bg: "from-gray-300 to-gray-200",    border: "border-gray-300",  text: "text-gray-600",  badge: "bg-gray-400 text-white",  icon: "🥈" },
	{ bg: "from-amber-700 to-amber-600",  border: "border-amber-600", text: "text-amber-100", badge: "bg-amber-700 text-white",  icon: "🥉" },
];

const BAR_COLORS = [
	"#6366f1","#8b5cf6","#a855f7","#d946ef",
	"#ec4899","#f43f5e","#f97316","#f59e0b","#84cc16","#22c55e",
];

const LAP_ROLES = ["superadmin", "keuangan", "cs"];

function onTimeRateLabel(stat: PetugasStat): string {
	if (stat.onTimeEligible === 0) return "-";
	return `${Math.round((stat.onTimeCount / stat.onTimeEligible) * 100)}%`;
}

export default function LaporanPetugasPage() {
	const { role, loading: authLoading } = useAuth();
	const router = useRouter();
	const supabase = createClient();
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		if (!authLoading && !LAP_ROLES.includes(role ?? "")) router.replace("/dashboard");
	}, [role, authLoading, router]);

	const [filter, setFilter] = useState({ dari: "", sampai: "" });
	const [cabangList, setCabangList] = useState<any[]>([]);
	const [filterCabang, setFilterCabang] = useState("semua");
	const [stats, setStats] = useState<PetugasStat[]>([]);
	const [tanpaPetugas, setTanpaPetugas] = useState<PetugasStat | null>(null);

	useEffect(() => {
		const now = new Date();
		const dari = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];
		const sampai = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split("T")[0];
		setFilter({ dari, sampai });
		supabase
			.from("cabang")
			.select("id, nama")
			.eq("aktif", true)
			.order("nama")
			.then(({ data }) => setCabangList(data || []));
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	const load = useCallback(async () => {
		if (!filter.dari || !filter.sampai) return;
		setLoading(true);

		let query = supabase
			.from("pengiriman")
			.select(
				"id, tanggal, milestone, jumlah_gagal, estimasi_hari, petugas_id, petugas:profiles!petugas_id(name)",
			)
			.gte("tanggal", filter.dari)
			.lte("tanggal", filter.sampai + "T23:59:59");
		if (filterCabang !== "semua") query = query.eq("cabang_id", filterCabang);

		const { data } = await query;
		const rows = data || [];

		// Waktu selesai per pengiriman — baris pengiriman_tracking milestone 'selesai' paling awal
		const idsSelesai = rows
			.filter((r) => r.milestone === "selesai")
			.map((r) => r.id);
		let waktuSelesaiMap: Record<string, string> = {};
		if (idsSelesai.length > 0) {
			const { data: tracking } = await supabase
				.from("pengiriman_tracking")
				.select("pengiriman_id, created_at")
				.eq("milestone", "selesai")
				.in("pengiriman_id", idsSelesai)
				.order("created_at", { ascending: true });
			for (const t of tracking || []) {
				if (!waktuSelesaiMap[t.pengiriman_id]) {
					waktuSelesaiMap[t.pengiriman_id] = t.created_at;
				}
			}
		}

		const map: Record<string, PetugasStat> = {};
		for (const r of rows) {
			const key = r.petugas_id || TANPA_PETUGAS_ID;
			const nama = r.petugas_id
				? (r.petugas as any)?.name || "-"
				: "Tanpa Petugas Terdaftar";
			if (!map[key]) {
				map[key] = {
					id: key,
					nama,
					totalKiriman: 0,
					selesai: 0,
					gagalKirim: 0,
					retur: 0,
					onTimeCount: 0,
					onTimeEligible: 0,
				};
			}
			const stat = map[key];
			stat.totalKiriman++;
			stat.gagalKirim += r.jumlah_gagal || 0;
			if (r.milestone === "selesai") stat.selesai++;
			if (r.milestone === "retur") stat.retur++;

			const statusKeterlambatan = getStatusKeterlambatan({
				tanggal: r.tanggal,
				estimasiHari: r.estimasi_hari,
				milestone: r.milestone as MilestonePengiriman,
				waktuSelesai: waktuSelesaiMap[r.id] || null,
			});
			if (statusKeterlambatan === "on_time" || statusKeterlambatan === "terlambat_selesai") {
				stat.onTimeEligible++;
				if (statusKeterlambatan === "on_time") stat.onTimeCount++;
			}
		}

		const { [TANPA_PETUGAS_ID]: tanpa, ...rest } = map;
		setTanpaPetugas(tanpa || null);
		setStats(Object.values(rest).sort((a, b) => b.totalKiriman - a.totalKiriman));
		setLoading(false);
	}, [filter, filterCabang]);

	useEffect(() => { load(); }, [load]);

	if (authLoading || !LAP_ROLES.includes(role ?? "")) return null;

	const top3 = stats.slice(0, 3);
	const chartData = stats.slice(0, 10).map((s) => ({
		nama: s.nama.length > 14 ? s.nama.slice(0, 13) + "…" : s.nama,
		namaFull: s.nama,
		totalKiriman: s.totalKiriman,
	}));

	// Podium order: 2nd - 1st - 3rd
	const podiumOrder = [top3[1], top3[0], top3[2]];
	const podiumHeights = ["h-28", "h-36", "h-20"];
	const podiumMedal = [MEDAL[1], MEDAL[0], MEDAL[2]];
	const podiumRank = [1, 0, 2];

	return (
		<div>
			{/* Header */}
			<div className="flex items-center justify-between mb-6 flex-wrap gap-3">
				<div>
					<h1 className="text-2xl font-bold text-gray-900">Laporan Petugas</h1>
					<p className="text-gray-500 mt-1">Peringkat performa kurir/sopir berdasarkan pengiriman</p>
				</div>
				<div className="flex items-center gap-2 flex-wrap">
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
					{cabangList.length > 0 && (
						<select
							value={filterCabang}
							onChange={(e) => setFilterCabang(e.target.value)}
							className="px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
							<option value="semua">Semua Cabang</option>
							{cabangList.map((c) => (
								<option key={c.id} value={c.id}>{c.nama}</option>
							))}
						</select>
					)}
				</div>
			</div>

			{loading ? (
				<div className="text-center py-20 text-gray-400">Memuat data...</div>
			) : stats.length === 0 && !tanpaPetugas ? (
				<div className="text-center py-20">
					<Truck size={48} className="mx-auto text-gray-300 mb-3" />
					<p className="text-gray-500 font-medium">Tidak ada data pengiriman di periode ini</p>
					<p className="text-sm text-gray-400 mt-1">Pastikan petugas dipilih dari dropdown saat input pengiriman</p>
				</div>
			) : (
				<div className="space-y-6">
					{/* ─── PODIUM TOP 3 ─── */}
					{top3.length > 0 && (
						<div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
							<div className="flex items-center gap-2 mb-6">
								<Trophy size={18} className="text-amber-500" />
								<h2 className="font-semibold text-gray-800">Top 3 Petugas Terbaik</h2>
							</div>

							{/* Podium visual */}
							<div className="flex items-end justify-center gap-3 mb-6">
								{podiumOrder.map((petugas, i) => {
									if (!petugas) return <div key={i} className="w-36" />;
									const medal = podiumMedal[i];
									const rank = podiumRank[i];
									return (
										<div key={petugas.id} className="flex flex-col items-center w-36">
											<div className={`w-full bg-gradient-to-b ${medal.bg} rounded-2xl p-4 text-center border ${medal.border} shadow-sm mb-2`}>
												<div className="text-2xl mb-1">{medal.icon}</div>
												<p className={`font-bold text-sm leading-snug ${rank === 0 ? "text-amber-900" : rank === 1 ? medal.text : "text-amber-100"}`}>
													{petugas.nama}
												</p>
												<p className={`text-2xl font-black mt-2 ${rank === 0 ? "text-amber-800" : rank === 1 ? "text-gray-700" : "text-amber-200"}`}>
													{petugas.totalKiriman}
												</p>
												<p className={`text-xs mt-0.5 ${rank === 0 ? "text-amber-700" : rank === 1 ? "text-gray-500" : "text-amber-300"}`}>
													kiriman ditangani
												</p>
												<div className={`mt-2 pt-2 border-t text-xs ${rank === 0 ? "border-amber-300 text-amber-700" : rank === 1 ? "border-gray-300 text-gray-500" : "border-amber-500 text-amber-300"}`}>
													{petugas.selesai} selesai · {onTimeRateLabel(petugas)} on-time
												</div>
											</div>
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

							<div className="grid grid-cols-3 gap-3">
								{top3.map((s) => (
									<div key={s.id} className="bg-gray-50 rounded-xl p-3 text-center">
										<p className="text-xs text-gray-400 mb-1">Gagal Kirim / Retur</p>
										<p className="font-bold text-gray-900">
											{s.gagalKirim} / {s.retur}
										</p>
									</div>
								))}
							</div>
						</div>
					)}

					{/* ─── BAR CHART ─── */}
					{chartData.length > 0 && (
						<div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
							<h2 className="font-semibold text-gray-800 mb-5">
								Top {chartData.length} Petugas — Jumlah Kiriman
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
										formatter={(value: number) => [`${value} kiriman`, "Jumlah Kiriman"]}
										labelFormatter={(label: string, payload: any[]) =>
											payload?.[0]?.payload?.namaFull || label
										}
									/>
									<Bar dataKey="totalKiriman" radius={[0, 6, 6, 0]}>
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
							<span className="ml-auto text-sm text-gray-400">{stats.length} petugas</span>
						</div>
						<table className="w-full text-sm">
							<thead className="bg-gray-50 border-b border-gray-100">
								<tr>
									<th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase w-12">#</th>
									<th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Nama Petugas</th>
									<th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Total Kiriman</th>
									<th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Selesai</th>
									<th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Gagal Kirim</th>
									<th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Retur</th>
									<th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase">On-time Rate</th>
								</tr>
							</thead>
							<tbody className="divide-y divide-gray-50">
								{stats.map((s, i) => {
									const isTop3 = i < 3;
									const medal = MEDAL[i];
									return (
										<tr
											key={s.id}
											className={`transition ${isTop3 ? "bg-amber-50/40 hover:bg-amber-50" : "hover:bg-gray-50"}`}>
											<td className="px-4 py-3.5 text-center">
												{isTop3 ? (
													<span className="text-lg">{medal.icon}</span>
												) : (
													<span className="text-sm font-bold text-gray-400">{i + 1}</span>
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
													<span className="font-bold text-gray-900 text-base">{s.totalKiriman}</span>
													<div className="w-16 h-1 bg-gray-100 rounded-full mt-1">
														<div
															className="h-full bg-indigo-400 rounded-full"
															style={{ width: `${stats[0] ? (s.totalKiriman / stats[0].totalKiriman) * 100 : 0}%` }}
														/>
													</div>
												</div>
											</td>
											<td className="px-4 py-3.5 text-center">
												<span className="font-semibold text-green-600">{s.selesai}</span>
											</td>
											<td className="px-4 py-3.5 text-center">
												<span className={`font-semibold ${s.gagalKirim > 0 ? "text-red-600" : "text-gray-400"}`}>
													{s.gagalKirim}
												</span>
											</td>
											<td className="px-4 py-3.5 text-center">
												<span className={`font-semibold ${s.retur > 0 ? "text-orange-600" : "text-gray-400"}`}>
													{s.retur}
												</span>
											</td>
											<td className="px-4 py-3.5 text-center">
												<span className="text-sm font-medium text-gray-700">
													{onTimeRateLabel(s)}
												</span>
											</td>
										</tr>
									);
								})}
								{tanpaPetugas && (
									<tr className="bg-gray-50/70">
										<td className="px-4 py-3.5 text-center">
											<UserX size={15} className="mx-auto text-gray-400" />
										</td>
										<td className="px-4 py-3.5">
											<span className="italic text-gray-500">{tanpaPetugas.nama}</span>
										</td>
										<td className="px-4 py-3.5 text-center">
											<span className="font-bold text-gray-600">{tanpaPetugas.totalKiriman}</span>
										</td>
										<td className="px-4 py-3.5 text-center">
											<span className="font-semibold text-gray-500">{tanpaPetugas.selesai}</span>
										</td>
										<td className="px-4 py-3.5 text-center">
											<span className="font-semibold text-gray-500">{tanpaPetugas.gagalKirim}</span>
										</td>
										<td className="px-4 py-3.5 text-center">
											<span className="font-semibold text-gray-500">{tanpaPetugas.retur}</span>
										</td>
										<td className="px-4 py-3.5 text-center">
											<span className="text-sm font-medium text-gray-500">
												{onTimeRateLabel(tanpaPetugas)}
											</span>
										</td>
									</tr>
								)}
							</tbody>
						</table>
					</div>
				</div>
			)}
		</div>
	);
}
