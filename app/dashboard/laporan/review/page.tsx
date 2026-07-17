"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
	PieChart,
	Pie,
	Cell,
	BarChart,
	Bar,
	XAxis,
	YAxis,
	Tooltip,
	ResponsiveContainer,
} from "recharts";
import {
	Flag,
	ThumbsUp,
	StickyNote,
	CheckCircle2,
	AlertCircle,
	Search,
	X,
	MessageSquare,
	TrendingUp,
} from "lucide-react";

const TIPE_CFG = {
	komplain: {
		label: "Komplain",
		color: "#ef4444",
		bg: "bg-red-50",
		border: "border-red-100",
		text: "text-red-600",
		badge: "bg-red-100 text-red-700",
		Icon: Flag,
	},
	pujian: {
		label: "Pujian",
		color: "#22c55e",
		bg: "bg-green-50",
		border: "border-green-100",
		text: "text-green-600",
		badge: "bg-green-100 text-green-700",
		Icon: ThumbsUp,
	},
	catatan: {
		label: "Catatan",
		color: "#3b82f6",
		bg: "bg-blue-50",
		border: "border-blue-100",
		text: "text-blue-600",
		badge: "bg-blue-100 text-blue-700",
		Icon: StickyNote,
	},
} as const;

const BAR_COLORS = ["#ef4444", "#f97316", "#f59e0b", "#84cc16", "#22c55e", "#06b6d4", "#6366f1"];

const LAP_ROLES = ["superadmin","keuangan","gudang"];

export default function LaporanReviewPage() {
	const supabase = createClient();
	const { isSuperAdmin, role, loading: authLoading } = useAuth();
	const router = useRouter();

	useEffect(() => {
		if (!authLoading && !LAP_ROLES.includes(role ?? "")) router.replace("/dashboard");
	}, [role, authLoading, router]);

	if (authLoading || !LAP_ROLES.includes(role ?? "")) return null;

	const [loading, setLoading] = useState(true);
	const [reviews, setReviews] = useState<any[]>([]);
	const [filter, setFilter] = useState({ dari: "", sampai: "", tipe: "" });
	const [search, setSearch] = useState("");

	// Default: 3 bulan terakhir
	useEffect(() => {
		const now = new Date();
		const dari = new Date(now.getFullYear(), now.getMonth() - 2, 1)
			.toISOString()
			.split("T")[0];
		const sampai = now.toISOString().split("T")[0];
		setFilter((f) => ({ ...f, dari, sampai }));
	}, []);

	const load = useCallback(async () => {
		if (!filter.dari || !filter.sampai) return;
		setLoading(true);
		const { data } = await supabase
			.from("reseller_reviews")
			.select(
				"*, penjualan:penjualan_id(nomor_faktur, tanggal), reseller:reseller_id(nama), creator:profiles!created_by(name)",
			)
			.gte("created_at", filter.dari + "T00:00:00")
			.lte("created_at", filter.sampai + "T23:59:59")
			.order("created_at", { ascending: false });
		setReviews(data || []);
		setLoading(false);
	}, [filter.dari, filter.sampai]);

	useEffect(() => {
		load();
	}, [load]);

	// ── Agregasi ──
	const total = reviews.length;
	const jKomplain = reviews.filter((r) => r.tipe === "komplain").length;
	const jPujian = reviews.filter((r) => r.tipe === "pujian").length;
	const jCatatan = reviews.filter((r) => r.tipe === "catatan").length;
	const openKomplain = reviews.filter(
		(r) => r.tipe === "komplain" && r.status === "open",
	).length;
	const resolvedKomplain = jKomplain - openKomplain;

	// Satisfaction index: pujian / (pujian + komplain) * 100 (exclude catatan)
	const satisfactionRate =
		jPujian + jKomplain > 0
			? Math.round((jPujian / (jPujian + jKomplain)) * 100)
			: null;

	const satisfactionColor =
		satisfactionRate === null
			? "text-gray-300"
			: satisfactionRate >= 70
			? "text-green-500"
			: satisfactionRate >= 40
			? "text-yellow-500"
			: "text-red-500";

	const satisfactionLabel =
		satisfactionRate === null
			? "—"
			: satisfactionRate >= 70
			? "Baik"
			: satisfactionRate >= 40
			? "Perlu Perhatian"
			: "Kritis";

	// Pie chart
	const pieData = [
		{ name: "Komplain", value: jKomplain, color: "#ef4444" },
		{ name: "Pujian", value: jPujian, color: "#22c55e" },
		{ name: "Catatan", value: jCatatan, color: "#3b82f6" },
	].filter((d) => d.value > 0);

	// Reseller stats
	const resellerMap: Record<
		string,
		{ nama: string; komplain: number; pujian: number; catatan: number }
	> = {};
	for (const r of reviews) {
		const nama = r.reseller?.nama || "Tanpa Reseller";
		if (!resellerMap[nama])
			resellerMap[nama] = { nama, komplain: 0, pujian: 0, catatan: 0 };
		if (r.tipe === "komplain") resellerMap[nama].komplain++;
		if (r.tipe === "pujian") resellerMap[nama].pujian++;
		if (r.tipe === "catatan") resellerMap[nama].catatan++;
	}
	const resellerStats = Object.values(resellerMap)
		.sort((a, b) => b.komplain - a.komplain)
		.slice(0, 8);

	// Filtered table
	const filteredReviews = reviews
		.filter((r) => !filter.tipe || r.tipe === filter.tipe)
		.filter((r) => {
			if (!search) return true;
			const s = search.toLowerCase();
			return (
				(r.isi || "").toLowerCase().includes(s) ||
				(r.penjualan?.nomor_faktur || "").toLowerCase().includes(s) ||
				(r.reseller?.nama || "").toLowerCase().includes(s)
			);
		});

	// Custom pie label
	const renderPieLabel = ({
		cx,
		cy,
		midAngle,
		innerRadius,
		outerRadius,
		percent,
		name,
	}: any) => {
		if (percent < 0.05) return null;
		const RADIAN = Math.PI / 180;
		const radius = innerRadius + (outerRadius - innerRadius) * 0.55;
		const x = cx + radius * Math.cos(-midAngle * RADIAN);
		const y = cy + radius * Math.sin(-midAngle * RADIAN);
		return (
			<text
				x={x}
				y={y}
				fill="white"
				textAnchor="middle"
				dominantBaseline="central"
				fontSize={12}
				fontWeight={700}>
				{`${Math.round(percent * 100)}%`}
			</text>
		);
	};

	return (
		<div>
			{/* ── Header ── */}
			<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
				<div>
					<h1 className="text-2xl font-bold text-gray-900">Kritik & Saran</h1>
					<p className="text-gray-500 mt-1">
						Laporan review kepuasan customer per reseller
					</p>
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
						onChange={(e) =>
							setFilter((f) => ({ ...f, sampai: e.target.value }))
						}
						className="px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
					/>
				</div>
			</div>

			{loading ? (
				<div className="text-center py-20 text-gray-400">Memuat data...</div>
			) : (
				<div className="space-y-6">
					{/* ── Kartu Statistik ── */}
					<div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
						{/* Kepuasan */}
						<div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 flex flex-col justify-between">
							<div>
								<div className="flex items-center gap-2 mb-3">
									<TrendingUp size={16} className="text-indigo-500" />
									<p className="text-sm font-medium text-gray-600">
										Tingkat Kepuasan
									</p>
								</div>
								<p className={`text-4xl font-black ${satisfactionColor}`}>
									{satisfactionRate !== null ? `${satisfactionRate}%` : "—"}
								</p>
								{satisfactionRate !== null && (
									<>
										<div className="mt-2 h-2 bg-gray-100 rounded-full overflow-hidden">
											<div
												className={`h-full rounded-full transition-all ${
													satisfactionRate >= 70
														? "bg-green-400"
														: satisfactionRate >= 40
														? "bg-yellow-400"
														: "bg-red-400"
												}`}
												style={{ width: `${satisfactionRate}%` }}
											/>
										</div>
										<p
											className={`text-xs font-semibold mt-1.5 ${satisfactionColor}`}>
											{satisfactionLabel}
										</p>
									</>
								)}
							</div>
							<p className="text-xs text-gray-400 mt-3">
								dari {jPujian + jKomplain} penilaian
							</p>
						</div>

						{/* Komplain */}
						<div className="bg-red-50 border border-red-100 rounded-2xl p-5">
							<div className="flex items-center gap-2 mb-3">
								<Flag size={15} className="text-red-500" />
								<p className="text-sm font-medium text-red-700">Komplain</p>
							</div>
							<p className="text-4xl font-black text-red-600">{jKomplain}</p>
							<div className="mt-2 space-y-0.5">
								{openKomplain > 0 && (
									<p className="text-xs text-red-500 font-semibold">
										⚠ {openKomplain} masih open
									</p>
								)}
								{resolvedKomplain > 0 && (
									<p className="text-xs text-gray-400">
										✓ {resolvedKomplain} selesai
									</p>
								)}
							</div>
						</div>

						{/* Pujian */}
						<div className="bg-green-50 border border-green-100 rounded-2xl p-5">
							<div className="flex items-center gap-2 mb-3">
								<ThumbsUp size={15} className="text-green-500" />
								<p className="text-sm font-medium text-green-700">Pujian</p>
							</div>
							<p className="text-4xl font-black text-green-600">{jPujian}</p>
							<p className="text-xs text-gray-400 mt-2">
								{total > 0
									? `${Math.round((jPujian / total) * 100)}% dari total review`
									: "—"}
							</p>
						</div>

						{/* Catatan */}
						<div className="bg-blue-50 border border-blue-100 rounded-2xl p-5">
							<div className="flex items-center gap-2 mb-3">
								<StickyNote size={15} className="text-blue-500" />
								<p className="text-sm font-medium text-blue-700">Catatan</p>
							</div>
							<p className="text-4xl font-black text-blue-600">{jCatatan}</p>
							<p className="text-xs text-gray-400 mt-2">
								Total review: {total}
							</p>
						</div>
					</div>

					{total === 0 ? (
						<div className="bg-white rounded-2xl p-16 shadow-sm border border-gray-100 text-center">
							<MessageSquare
								size={48}
								className="mx-auto text-gray-300 mb-3"
							/>
							<p className="text-gray-500 font-medium">
								Belum ada review di periode ini
							</p>
							<p className="text-sm text-gray-400 mt-1">
								Review dapat ditambahkan dari halaman detail penjualan
							</p>
						</div>
					) : (
						<>
							{/* ── Charts ── */}
							<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
								{/* Pie chart distribusi */}
								{pieData.length > 0 && (
									<div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
										<h2 className="font-semibold text-gray-800 mb-5">
											Distribusi Tipe Review
										</h2>
										<div className="flex items-center gap-6">
											<ResponsiveContainer width={180} height={180}>
												<PieChart>
													<Pie
														data={pieData}
														cx="50%"
														cy="50%"
														innerRadius={50}
														outerRadius={85}
														paddingAngle={2}
														dataKey="value"
														labelLine={false}
														label={renderPieLabel}>
														{pieData.map((entry, i) => (
															<Cell key={i} fill={entry.color} />
														))}
													</Pie>
												</PieChart>
											</ResponsiveContainer>
											<div className="flex-1 space-y-3">
												{pieData.map((d) => (
													<div key={d.name} className="flex items-center gap-3">
														<div
															className="w-3 h-3 rounded-full flex-shrink-0"
															style={{ background: d.color }}
														/>
														<div className="flex-1">
															<div className="flex justify-between text-sm">
																<span className="text-gray-700 font-medium">
																	{d.name}
																</span>
																<span className="font-bold text-gray-900">
																	{d.value}
																</span>
															</div>
															<div className="h-1.5 bg-gray-100 rounded-full mt-1">
																<div
																	className="h-full rounded-full"
																	style={{
																		width: `${Math.round((d.value / total) * 100)}%`,
																		background: d.color,
																	}}
																/>
															</div>
														</div>
													</div>
												))}
											</div>
										</div>
									</div>
								)}

								{/* Bar chart komplain per reseller */}
								{resellerStats.some((r) => r.komplain > 0) && (
									<div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
										<h2 className="font-semibold text-gray-800 mb-5">
											Komplain per Reseller
										</h2>
										<ResponsiveContainer
											width="100%"
											height={resellerStats.length * 40 + 20}>
											<BarChart
												data={resellerStats}
												layout="vertical"
												margin={{ left: 0, right: 24, top: 0, bottom: 0 }}>
												<XAxis
													type="number"
													tick={{ fontSize: 11 }}
													allowDecimals={false}
												/>
												<YAxis
													type="category"
													dataKey="nama"
													tick={{ fontSize: 12 }}
													width={110}
												/>
												<Tooltip
													formatter={(v: number, name: string) => [
														`${v} komplain`,
														name,
													]}
												/>
												<Bar dataKey="komplain" radius={[0, 6, 6, 0]}>
													{resellerStats.map((_, i) => (
														<Cell
															key={i}
															fill={BAR_COLORS[i % BAR_COLORS.length]}
														/>
													))}
												</Bar>
											</BarChart>
										</ResponsiveContainer>
									</div>
								)}
							</div>

							{/* ── Tabel Review ── */}
							<div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
								{/* Filter bar */}
								<div className="p-4 border-b border-gray-100 flex flex-wrap gap-3">
									<div className="relative flex-1 min-w-48">
										<Search
											size={15}
											className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
										/>
										<input
											value={search}
											onChange={(e) => setSearch(e.target.value)}
											placeholder="Cari isi review, faktur, reseller..."
											className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
										/>
										{search && (
											<button
												onClick={() => setSearch("")}
												className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
												<X size={14} />
											</button>
										)}
									</div>
									<div className="flex rounded-xl border border-gray-200 overflow-hidden">
										{[
											{ v: "", label: `Semua (${total})` },
											{ v: "komplain", label: `😤 Komplain (${jKomplain})` },
											{ v: "pujian", label: `👍 Pujian (${jPujian})` },
											{ v: "catatan", label: `📝 Catatan (${jCatatan})` },
										].map((opt) => (
											<button
												key={opt.v}
												onClick={() =>
													setFilter((f) => ({ ...f, tipe: opt.v }))
												}
												className={`px-3 py-2 text-xs font-medium transition ${
													filter.tipe === opt.v
														? "bg-indigo-600 text-white"
														: "bg-white text-gray-600 hover:bg-gray-50"
												}`}>
												{opt.label}
											</button>
										))}
									</div>
								</div>

								{filteredReviews.length === 0 ? (
									<div className="text-center py-12 text-gray-400">
										Tidak ada review yang cocok
									</div>
								) : (
									<div className="divide-y divide-gray-50">
										{filteredReviews.map((r) => {
											const cfg =
												TIPE_CFG[r.tipe as keyof typeof TIPE_CFG] ||
												TIPE_CFG.catatan;
											const Icon = cfg.Icon;
											return (
												<div key={r.id} className="px-6 py-4 hover:bg-gray-50 transition">
													<div className="flex items-start justify-between gap-3">
														<div className="flex items-start gap-3 flex-1 min-w-0">
															{/* Type badge */}
															<span
																className={`flex-shrink-0 flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${cfg.badge}`}>
																<Icon size={11} />
																{cfg.label}
															</span>
															<div className="flex-1 min-w-0">
																<p className="text-sm text-gray-800 leading-relaxed">
																	{r.isi}
																</p>
																<div className="flex items-center flex-wrap gap-x-3 gap-y-0.5 mt-1.5">
																	{r.penjualan?.nomor_faktur ? (
																		<Link href={`/dashboard/penjualan/${r.penjualan_id}`} className="font-mono text-xs text-indigo-600 font-medium hover:underline">
																			{r.penjualan.nomor_faktur}
																		</Link>
																	) : <span className="text-xs text-gray-300">—</span>}
																	{r.reseller?.nama && (
																		<span className="text-xs text-gray-500">
																			· {r.reseller.nama}
																		</span>
																	)}
																	{r.creator?.name && (
																		<span className="text-xs text-gray-400">
																			· oleh {r.creator.name}
																		</span>
																	)}
																	<span className="text-xs text-gray-400">
																		·{" "}
																		{new Date(r.created_at).toLocaleDateString(
																			"id-ID",
																			{
																				day: "numeric",
																				month: "short",
																				year: "numeric",
																			},
																		)}
																	</span>
																</div>
															</div>
														</div>
														{/* Status */}
														<div className="flex-shrink-0">
															{r.tipe === "komplain" ? (
																r.status === "resolved" ? (
																	<span className="flex items-center gap-1 text-xs text-green-600 font-medium bg-green-50 px-2.5 py-1 rounded-full">
																		<CheckCircle2 size={11} /> Selesai
																	</span>
																) : (
																	<span className="flex items-center gap-1 text-xs text-orange-600 font-medium bg-orange-50 px-2.5 py-1 rounded-full">
																		<AlertCircle size={11} /> Open
																	</span>
																)
															) : null}
														</div>
													</div>
												</div>
											);
										})}
									</div>
								)}

								<div className="px-6 py-3 border-t border-gray-100 text-xs text-gray-400">
									Menampilkan {filteredReviews.length} dari {total} review
								</div>
							</div>
						</>
					)}
				</div>
			)}
		</div>
	);
}
