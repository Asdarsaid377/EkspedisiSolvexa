"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import {
	Target,
	TrendingUp,
	TrendingDown,
	AlertTriangle,
	CheckCircle2,
	ChevronLeft,
	ChevronRight,
	Edit2,
	Save,
	X,
} from "lucide-react";
import {
	BarChart,
	Bar,
	XAxis,
	YAxis,
	Tooltip,
	ResponsiveContainer,
	ReferenceLine,
	Cell,
} from "recharts";

const MONTH_NAMES = [
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

function getDaysInMonth(year: number, month: number) {
	return new Date(year, month, 0).getDate();
}

type Status = "tercapai" | "on_track" | "perlu_usaha" | "kritis" | "no_target";

interface DailyData {
	day: number;
	units: number;
}
interface HistoryItem {
	bulan: number;
	tahun: number;
	target: number;
	actual: number;
}

const STATUS_CONFIG: Record<
	Status,
	{ label: string; boxColor: string; badge: string; barColor: string }
> = {
	tercapai: {
		label: "Target Tercapai!",
		boxColor: "bg-green-50 border-green-200",
		badge: "bg-green-100 text-green-700",
		barColor: "bg-green-500",
	},
	on_track: {
		label: "On Track",
		boxColor: "bg-blue-50 border-blue-200",
		badge: "bg-blue-100 text-blue-700",
		barColor: "bg-blue-500",
	},
	perlu_usaha: {
		label: "Perlu Kejar",
		boxColor: "bg-yellow-50 border-yellow-200",
		badge: "bg-yellow-100 text-yellow-700",
		barColor: "bg-yellow-400",
	},
	kritis: {
		label: "Kritis",
		boxColor: "bg-red-50 border-red-200",
		badge: "bg-red-100 text-red-700",
		barColor: "bg-red-500",
	},
	no_target: {
		label: "Belum Ada Target",
		boxColor: "bg-gray-50 border-gray-200",
		badge: "bg-gray-100 text-gray-600",
		barColor: "bg-gray-300",
	},
};

export default function TargetPage() {
	const supabase = createClient();
	const { isSuperAdmin, role, loading: authLoading } = useAuth();
	const router = useRouter();

	useEffect(() => {
		if (!authLoading && role !== "superadmin") router.replace("/dashboard");
	}, [role, authLoading, router]);

	if (authLoading || role !== "superadmin") return null;
	const now = new Date();

	const [viewMonth, setViewMonth] = useState(now.getMonth() + 1);
	const [viewYear, setViewYear] = useState(now.getFullYear());
	const [targetUnit, setTargetUnit] = useState(0);
	const [targetId, setTargetId] = useState<string | null>(null);
	const [targetCatatan, setTargetCatatan] = useState("");
	const [editMode, setEditMode] = useState(false);
	const [editValue, setEditValue] = useState("");
	const [editCatatan, setEditCatatan] = useState("");
	const [saving, setSaving] = useState(false);
	const [dailyData, setDailyData] = useState<DailyData[]>([]);
	const [history, setHistory] = useState<HistoryItem[]>([]);
	const [loading, setLoading] = useState(true);

	const isCurrentMonth =
		viewMonth === now.getMonth() + 1 && viewYear === now.getFullYear();
	const isFutureMonth =
		viewYear > now.getFullYear() ||
		(viewYear === now.getFullYear() && viewMonth > now.getMonth() + 1);

	const totalDays = getDaysInMonth(viewYear, viewMonth);
	const daysPassed = isCurrentMonth
		? now.getDate()
		: isFutureMonth
			? 0
			: totalDays;
	const daysRemaining = Math.max(0, totalDays - daysPassed);

	const totalUnitsSold = dailyData.reduce((s, d) => s + d.units, 0);
	const actualRatePerDay = daysPassed > 0 ? totalUnitsSold / daysPassed : 0;
	const targetPerDay = targetUnit > 0 ? targetUnit / totalDays : 0;
	const unitsNeeded = Math.max(0, targetUnit - totalUnitsSold);
	const neededPerDayRemaining =
		daysRemaining > 0 ? unitsNeeded / daysRemaining : 0;
	const projectedTotal = totalUnitsSold + actualRatePerDay * daysRemaining;
	const achievementPct =
		targetUnit > 0 ? Math.min(100, (totalUnitsSold / targetUnit) * 100) : 0;

	const status: Status = (() => {
		if (targetUnit === 0 || isFutureMonth) return "no_target";
		if (totalUnitsSold >= targetUnit) return "tercapai";
		if (daysRemaining === 0)
			return totalUnitsSold >= targetUnit * 0.95 ? "on_track" : "kritis";
		if (projectedTotal >= targetUnit * 0.95) return "on_track";
		if (projectedTotal >= targetUnit * 0.7) return "perlu_usaha";
		return "kritis";
	})();

	const cfg = STATUS_CONFIG[status];

	const load = useCallback(async () => {
		setLoading(true);
		const totalDaysLocal = getDaysInMonth(viewYear, viewMonth);

		// Target bulan ini
		const { data: tgt } = await supabase
			.from("target_penjualan")
			.select("*")
			.eq("bulan", viewMonth)
			.eq("tahun", viewYear)
			.maybeSingle();

		setTargetUnit(tgt?.target_unit || 0);
		setTargetId(tgt?.id || null);
		setTargetCatatan(tgt?.catatan || "");

		// Penjualan harian bulan ini
		const mm = String(viewMonth).padStart(2, "0");
		const dd = String(totalDaysLocal).padStart(2, "0");
		const startDate = `${viewYear}-${mm}-01T00:00:00`;
		const endDate = `${viewYear}-${mm}-${dd}T23:59:59`;

		const { data: penjualanData } = await supabase
			.from("penjualan")
			.select("tanggal, items:penjualan_item(jumlah)")
			.gte("tanggal", startDate)
			.lte("tanggal", endDate);

		const dayMap: Record<number, number> = {};
		for (const p of penjualanData || []) {
			const day = new Date(p.tanggal).getDate();
			const units = ((p.items || []) as any[]).reduce(
				(s: number, i: any) => s + (i.jumlah || 0),
				0,
			);
			dayMap[day] = (dayMap[day] || 0) + units;
		}
		setDailyData(
			Array.from({ length: totalDaysLocal }, (_, i) => ({
				day: i + 1,
				units: dayMap[i + 1] || 0,
			})),
		);

		// Riwayat 6 bulan sebelum bulan yang sedang dilihat
		const histMonths: { bulan: number; tahun: number }[] = [];
		let hm = viewMonth,
			hy = viewYear;
		for (let i = 0; i < 6; i++) {
			hm--;
			if (hm === 0) {
				hm = 12;
				hy--;
			}
			histMonths.push({ bulan: hm, tahun: hy });
		}
		const oldestHist = histMonths[histMonths.length - 1];
		const newestHist = histMonths[0];
		const newestLastDay = getDaysInMonth(newestHist.tahun, newestHist.bulan);

		const histStart = `${oldestHist.tahun}-${String(oldestHist.bulan).padStart(2, "0")}-01T00:00:00`;
		const histEnd = `${newestHist.tahun}-${String(newestHist.bulan).padStart(2, "0")}-${String(newestLastDay).padStart(2, "0")}T23:59:59`;

		const [targetsRes, histPenj] = await Promise.all([
			supabase
				.from("target_penjualan")
				.select("bulan, tahun, target_unit")
				.gte("tahun", oldestHist.tahun)
				.lte("tahun", newestHist.tahun),
			supabase
				.from("penjualan")
				.select("tanggal, items:penjualan_item(jumlah)")
				.gte("tanggal", histStart)
				.lte("tanggal", histEnd),
		]);

		const targetMap: Record<string, number> = {};
		for (const t of targetsRes.data || []) {
			targetMap[`${t.tahun}-${t.bulan}`] = t.target_unit;
		}

		const actualMap: Record<string, number> = {};
		for (const p of histPenj.data || []) {
			const d = new Date(p.tanggal);
			const key = `${d.getFullYear()}-${d.getMonth() + 1}`;
			const units = ((p.items || []) as any[]).reduce(
				(s: number, i: any) => s + (i.jumlah || 0),
				0,
			);
			actualMap[key] = (actualMap[key] || 0) + units;
		}

		setHistory(
			histMonths.map(({ bulan, tahun }) => ({
				bulan,
				tahun,
				target: targetMap[`${tahun}-${bulan}`] || 0,
				actual: actualMap[`${tahun}-${bulan}`] || 0,
			})),
		);

		setLoading(false);
	}, [viewMonth, viewYear]);

	useEffect(() => {
		load();
	}, [load]);

	const saveTarget = async () => {
		setSaving(true);
		const payload = {
			bulan: viewMonth,
			tahun: viewYear,
			target_unit: Number(editValue) || 0,
			catatan: editCatatan || null,
		};
		if (targetId) {
			await supabase
				.from("target_penjualan")
				.update({ ...payload, updated_at: new Date().toISOString() })
				.eq("id", targetId);
		} else {
			const { data } = await supabase
				.from("target_penjualan")
				.insert(payload)
				.select()
				.single();
			if (data) setTargetId(data.id);
		}
		setTargetUnit(Number(editValue) || 0);
		setTargetCatatan(editCatatan);
		setEditMode(false);
		setSaving(false);
	};

	const prevMonth = () => {
		setViewMonth((m) => {
			if (m === 1) {
				setViewYear((y) => y - 1);
				return 12;
			}
			return m - 1;
		});
	};

	const nextMonth = () => {
		setViewMonth((m) => {
			if (m === 12) {
				setViewYear((y) => y + 1);
				return 1;
			}
			return m + 1;
		});
	};

	const getRecommendations = (): string[] => {
		const rate = actualRatePerDay.toFixed(1);
		const needed = Math.ceil(neededPerDayRemaining);
		const proj = Math.round(projectedTotal);

		switch (status) {
			case "tercapai":
				return [
					`Target ${targetUnit.toLocaleString("id-ID")} unit sudah tercapai — total terjual ${totalUnitsSold.toLocaleString("id-ID")} unit bulan ini.`,
					"Pertimbangkan menaikkan target bulan depan untuk memacu pertumbuhan lebih tinggi.",
					"Identifikasi produk terlaris bulan ini dan pastikan stok cukup untuk bulan depan.",
					"Apresiasi reseller yang paling banyak berkontribusi di bulan ini.",
				];
			case "on_track":
				return [
					`Pertahankan ritme ${rate} unit/hari — proyeksi akhir bulan ${proj.toLocaleString("id-ID")} unit dari target ${targetUnit.toLocaleString("id-ID")}.`,
					"Monitor penjualan harian agar momentum tidak melambat di akhir bulan.",
					"Dorong repeat order dari reseller yang sudah aktif transaksi bulan ini.",
					"Mulai rencanakan target dan ketersediaan stok untuk bulan depan.",
				];
			case "perlu_usaha":
				return [
					`Perlu menjual minimal ${needed} unit/hari selama ${daysRemaining} hari tersisa (saat ini rata-rata ${rate}/hari).`,
					"Hubungi reseller yang belum order dalam minggu ini untuk follow-up.",
					"Tawarkan insentif atau promo khusus akhir bulan untuk mendorong order lebih cepat.",
					"Fokus pada produk dengan stok melimpah dan permintaan pasar tinggi.",
					"Aktifkan kembali reseller yang belum transaksi bulan ini.",
				];
			case "kritis":
				return [
					`Butuh ${needed} unit/hari selama ${daysRemaining} hari tersisa — jauh di atas rata-rata aktual ${rate}/hari.`,
					"Lakukan follow-up intensif ke semua reseller aktif sesegera mungkin.",
					"Pertimbangkan promo volume: semakin banyak beli, semakin menarik harganya.",
					"Pastikan stok produk terlaris tidak kosong saat ada permintaan masuk.",
					daysRemaining <= 5
						? "Dengan sisa waktu sangat terbatas, fokus ke reseller berkapasitas beli terbesar."
						: "Evaluasi apakah target perlu disesuaikan dengan kapasitas aktual tim penjualan.",
				];
			default:
				return [];
		}
	};

	const recommendations = getRecommendations();

	const chartData = isCurrentMonth
		? dailyData.slice(0, daysPassed)
		: isFutureMonth
			? []
			: dailyData;

	return (
		<div>
			{/* Page Header */}
			<div className="mb-8 flex flex-wrap items-start justify-between gap-4">
				<div>
					<h1 className="text-2xl font-bold text-gray-900">Target Penjualan</h1>
					<p className="text-gray-500 mt-1">
						Pantau progress dan ambil keputusan berdasarkan data aktual
					</p>
				</div>
				<div className="flex items-center gap-2 bg-white border border-gray-200 rounded-2xl px-4 py-2.5 shadow-sm">
					<button
						onClick={prevMonth}
						className="p-1 hover:bg-gray-100 rounded-lg transition">
						<ChevronLeft size={18} />
					</button>
					<span className="font-semibold text-gray-900 min-w-[9rem] text-center text-sm">
						{MONTH_NAMES[viewMonth - 1]} {viewYear}
					</span>
					<button
						onClick={nextMonth}
						className="p-1 hover:bg-gray-100 rounded-lg transition">
						<ChevronRight size={18} />
					</button>
				</div>
			</div>

			{/* Target Setting Card */}
			<div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 mb-6">
				{editMode ? (
					<div className="flex flex-wrap items-end gap-4">
						<div>
							<label className="block text-xs font-medium text-gray-500 mb-1">
								Target Unit / Bulan
							</label>
							<input
								type="number"
								value={editValue}
								onChange={(e) => setEditValue(e.target.value)}
								className="w-40 px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
								autoFocus
								min={0}
								placeholder="500"
							/>
						</div>
						<div className="flex-1 min-w-[12rem]">
							<label className="block text-xs font-medium text-gray-500 mb-1">
								Catatan (opsional)
							</label>
							<input
								value={editCatatan}
								onChange={(e) => setEditCatatan(e.target.value)}
								placeholder="Misal: target akhir kuartal"
								className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
							/>
						</div>
						<div className="flex gap-2">
							<button
								onClick={saveTarget}
								disabled={saving}
								className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition">
								<Save size={14} />
								{saving ? "Menyimpan..." : "Simpan"}
							</button>
							<button
								onClick={() => setEditMode(false)}
								className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50 transition">
								<X size={14} />
								Batal
							</button>
						</div>
					</div>
				) : (
					<div className="flex items-center justify-between">
						<div>
							<p className="text-xs text-gray-500 mb-1">
								Target {MONTH_NAMES[viewMonth - 1]} {viewYear}
							</p>
							{targetUnit > 0 ? (
								<>
									<p className="text-2xl font-bold text-gray-900">
										{targetUnit.toLocaleString("id-ID")}{" "}
										<span className="text-base font-normal text-gray-400">
											unit / bulan
										</span>
									</p>
									{targetCatatan && (
										<p className="text-xs text-gray-400 mt-0.5">
											{targetCatatan}
										</p>
									)}
								</>
							) : (
								<p className="text-sm text-gray-400 italic">
									{isSuperAdmin
										? "Belum ada target — klik tombol untuk set target"
										: "Target belum diset untuk bulan ini"}
								</p>
							)}
						</div>
						{isSuperAdmin && (
							<button
								onClick={() => {
									setEditValue(targetUnit > 0 ? String(targetUnit) : "");
									setEditCatatan(targetCatatan);
									setEditMode(true);
								}}
								className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50 transition">
								<Edit2 size={14} />
								{targetUnit > 0 ? "Edit Target" : "Set Target"}
							</button>
						)}
					</div>
				)}
			</div>

			{loading ? (
				<div className="text-center py-20 text-gray-400">Memuat data...</div>
			) : targetUnit === 0 ? (
				<div className="text-center py-20">
					<Target size={56} className="mx-auto mb-4 text-gray-200" />
					<p className="text-gray-500 font-medium">
						{isSuperAdmin
							? "Set target untuk mulai memantau progress penjualan"
							: "Target penjualan belum diset untuk bulan ini"}
					</p>
					{isSuperAdmin && (
						<button
							onClick={() => {
								setEditValue("");
								setEditCatatan("");
								setEditMode(true);
							}}
							className="mt-4 px-6 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 transition">
							Set Target Sekarang
						</button>
					)}
				</div>
			) : (
				<>
					{/* Summary Cards */}
					<div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
						<div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
							<p className="text-xs text-gray-500 mb-1">Target Bulan Ini</p>
							<p className="text-2xl font-bold text-indigo-600">
								{targetUnit.toLocaleString("id-ID")}
							</p>
							<p className="text-xs text-gray-400 mt-0.5">
								≈ {targetPerDay.toFixed(1)} unit/hari
							</p>
						</div>
						<div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
							<p className="text-xs text-gray-500 mb-1">Sudah Terjual</p>
							<p className="text-2xl font-bold text-gray-900">
								{totalUnitsSold.toLocaleString("id-ID")}
							</p>
							<p className="text-xs text-gray-400 mt-0.5">
								{achievementPct.toFixed(1)}% dari target
							</p>
						</div>
						<div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
							<p className="text-xs text-gray-500 mb-1">
								{isCurrentMonth
									? "Hari Tersisa"
									: isFutureMonth
										? "Total Hari"
										: "Total Hari"}
							</p>
							<p className="text-2xl font-bold text-gray-900">
								{isCurrentMonth ? daysRemaining : totalDays}
							</p>
							<p className="text-xs text-gray-400 mt-0.5">
								{isCurrentMonth
									? `dari ${totalDays} hari (hari ke-${daysPassed})`
									: `di ${MONTH_NAMES[viewMonth - 1]}`}
							</p>
						</div>
						<div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
							<p className="text-xs text-gray-500 mb-1">
								{isFutureMonth ? "Belum Mulai" : "Proyeksi Akhir Bulan"}
							</p>
							{isFutureMonth ? (
								<p className="text-2xl font-bold text-gray-300">—</p>
							) : (
								<>
									<p
										className={`text-2xl font-bold ${
											projectedTotal >= targetUnit
												? "text-green-600"
												: "text-red-500"
										}`}>
										{Math.round(projectedTotal).toLocaleString("id-ID")}
									</p>
									<p className="text-xs text-gray-400 mt-0.5">
										{projectedTotal >= targetUnit
											? `+${Math.round(projectedTotal - targetUnit).toLocaleString("id-ID")} unit lebih`
											: `kurang ${Math.round(targetUnit - projectedTotal).toLocaleString("id-ID")} unit`}
									</p>
								</>
							)}
						</div>
					</div>

					{/* Progress + Daily Metrics */}
					{!isFutureMonth && (
						<div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 mb-6">
							<div className="flex items-center justify-between mb-3">
								<span className="text-sm font-semibold text-gray-700">
									Progress Penjualan
								</span>
								<span
									className={`text-xs font-bold px-3 py-1 rounded-full ${cfg.badge}`}>
									{cfg.label}
								</span>
							</div>
							<div className="relative h-5 bg-gray-100 rounded-full overflow-hidden">
								<div
									className={`h-full rounded-full transition-all duration-700 ${
										status === "tercapai"
											? "bg-green-500"
											: status === "on_track"
												? "bg-blue-500"
												: status === "perlu_usaha"
													? "bg-yellow-400"
													: "bg-red-500"
									}`}
									style={{ width: `${Math.min(100, achievementPct)}%` }}
								/>
							</div>
							<div className="flex justify-between mt-2 text-xs">
								<span className="text-gray-400">0</span>
								<span className="font-semibold text-gray-700">
									{totalUnitsSold.toLocaleString("id-ID")} /{" "}
									{targetUnit.toLocaleString("id-ID")} unit (
									{achievementPct.toFixed(1)}%)
								</span>
								<span className="text-gray-400">
									{targetUnit.toLocaleString("id-ID")}
								</span>
							</div>

							{/* Daily rate metrics */}
							<div className="mt-6 pt-5 border-t border-gray-100 grid grid-cols-3 gap-4">
								{[
									{
										label: "Target / Hari",
										value: targetPerDay.toFixed(1),
										sub: "unit (rata rata)",
										color: "text-gray-700",
									},
									{
										label: "Aktual / Hari",
										value:
											daysPassed > 0 ? actualRatePerDay.toFixed(1) : "—",
										sub:
											daysPassed > 0
												? actualRatePerDay >= targetPerDay
													? "✓ sesuai target"
													: "↓ di bawah target"
												: "belum ada data",
										color:
											daysPassed === 0
												? "text-gray-400"
												: actualRatePerDay >= targetPerDay
													? "text-green-600"
													: "text-red-500",
									},
									{
										label: "Butuh / Hari Sisa",
										value:
											daysRemaining > 0
												? Math.ceil(neededPerDayRemaining).toString()
												: "—",
										sub:
											daysRemaining > 0
												? `untuk ${daysRemaining} hari tersisa`
												: "bulan berakhir",
										color:
											daysRemaining === 0
												? "text-gray-400"
												: neededPerDayRemaining <= targetPerDay
													? "text-green-600"
													: neededPerDayRemaining <= targetPerDay * 1.5
														? "text-yellow-500"
														: "text-red-500",
									},
								].map((m) => (
									<div key={m.label} className="text-center">
										<p className="text-xs text-gray-400 mb-1">{m.label}</p>
										<p className={`text-2xl font-bold ${m.color}`}>{m.value}</p>
										<p className="text-xs text-gray-400 mt-0.5">{m.sub}</p>
									</div>
								))}
							</div>
						</div>
					)}

					{/* Decision Support */}
					{recommendations.length > 0 && !isFutureMonth && (
						<div
							className={`rounded-2xl p-6 border-2 mb-6 ${cfg.boxColor}`}>
							<div className="flex items-center gap-3 mb-4">
								{status === "tercapai" && (
									<CheckCircle2 size={22} className="text-green-500 flex-shrink-0" />
								)}
								{status === "on_track" && (
									<TrendingUp size={22} className="text-blue-500 flex-shrink-0" />
								)}
								{status === "perlu_usaha" && (
									<AlertTriangle size={22} className="text-yellow-500 flex-shrink-0" />
								)}
								{status === "kritis" && (
									<TrendingDown size={22} className="text-red-500 flex-shrink-0" />
								)}
								<h2 className="font-bold text-base text-gray-800">
									{status === "tercapai" && "Selamat — Target Tercapai!"}
									{status === "on_track" && "On Track — Pertahankan Momentum"}
									{status === "perlu_usaha" && "Langkah Mengejar Target"}
									{status === "kritis" && "Keputusan Diperlukan — Kondisi Kritis"}
								</h2>
							</div>
							<ol className="space-y-3">
								{recommendations.map((r, i) => (
									<li key={i} className="flex gap-3 text-sm text-gray-700">
										<span className="flex-shrink-0 mt-0.5 w-5 h-5 rounded-full bg-white/70 flex items-center justify-center text-xs font-bold text-gray-500 border border-gray-200">
											{i + 1}
										</span>
										<span className="leading-relaxed">{r}</span>
									</li>
								))}
							</ol>
						</div>
					)}

					{/* Daily Chart */}
					{chartData.length > 0 && (
						<div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 mb-6">
							<h2 className="text-base font-semibold text-gray-900 mb-1">
								Penjualan Harian — {MONTH_NAMES[viewMonth - 1]} {viewYear}
							</h2>
							<div className="flex flex-wrap gap-4 text-xs text-gray-400 mb-5">
								<span className="flex items-center gap-1.5">
									<span className="inline-block w-3 h-3 rounded-sm bg-green-500" />
									≥ target/hari
								</span>
								<span className="flex items-center gap-1.5">
									<span className="inline-block w-3 h-3 rounded-sm bg-red-400" />
									di bawah target
								</span>
								<span className="flex items-center gap-1.5">
									<span
										style={{
											display: "inline-block",
											width: 24,
											borderTop: "2px dashed #6366f1",
										}}
									/>
									<span>
										target/hari ({targetPerDay.toFixed(1)} unit)
									</span>
								</span>
							</div>
							<ResponsiveContainer width="100%" height={220}>
								<BarChart
									data={chartData}
									margin={{ left: 0, right: 16, top: 8, bottom: 0 }}>
									<XAxis
										dataKey="day"
										tick={{ fontSize: 11 }}
										tickLine={false}
										axisLine={false}
										interval={
											chartData.length > 20
												? 4
												: chartData.length > 10
													? 1
													: 0
										}
									/>
									<YAxis
										tick={{ fontSize: 11 }}
										allowDecimals={false}
										axisLine={false}
										tickLine={false}
									/>
									<Tooltip
										formatter={(v: number) => [`${v} unit`, "Terjual"]}
										labelFormatter={(l) => `Tanggal ${l}`}
										cursor={{ fill: "rgba(0,0,0,0.04)" }}
									/>
									<ReferenceLine
										y={targetPerDay}
										stroke="#6366f1"
										strokeDasharray="5 3"
										strokeWidth={1.5}
									/>
									<Bar dataKey="units" radius={[4, 4, 0, 0]}>
										{chartData.map((d, i) => (
											<Cell
												key={i}
												fill={d.units >= targetPerDay ? "#22c55e" : "#f87171"}
											/>
										))}
									</Bar>
								</BarChart>
							</ResponsiveContainer>
						</div>
					)}

					{/* History */}
					{history.some((h) => h.actual > 0 || h.target > 0) && (
						<div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
							<div className="px-6 py-4 border-b border-gray-100">
								<h2 className="text-base font-semibold text-gray-900">
									Riwayat 6 Bulan Terakhir
								</h2>
							</div>
							<div className="overflow-x-auto">
								<table className="w-full text-sm">
									<thead className="bg-gray-50 border-b border-gray-100">
										<tr>
											<th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">
												Bulan
											</th>
											<th className="text-right px-6 py-3 text-xs font-semibold text-gray-500 uppercase">
												Target
											</th>
											<th className="text-right px-6 py-3 text-xs font-semibold text-gray-500 uppercase">
												Aktual
											</th>
											<th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">
												Pencapaian
											</th>
											<th className="text-center px-6 py-3 text-xs font-semibold text-gray-500 uppercase">
												Status
											</th>
										</tr>
									</thead>
									<tbody className="divide-y divide-gray-50">
										{history.map((h) => {
											const pct =
												h.target > 0 ? (h.actual / h.target) * 100 : 0;
											const achieved = h.target > 0 && h.actual >= h.target;
											return (
												<tr
													key={`${h.tahun}-${h.bulan}`}
													className="hover:bg-gray-50 transition">
													<td className="px-6 py-3 font-medium text-gray-900">
														{MONTH_NAMES[h.bulan - 1]} {h.tahun}
													</td>
													<td className="px-6 py-3 text-right text-gray-500">
														{h.target > 0 ? (
															`${h.target.toLocaleString("id-ID")} unit`
														) : (
															<span className="text-gray-300 italic text-xs">
																—
															</span>
														)}
													</td>
													<td className="px-6 py-3 text-right font-semibold text-gray-900">
														{h.actual.toLocaleString("id-ID")} unit
													</td>
													<td className="px-6 py-3">
														{h.target > 0 ? (
															<div className="flex items-center gap-2">
																<div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
																	<div
																		className={`h-full rounded-full ${achieved ? "bg-green-500" : "bg-red-400"}`}
																		style={{
																			width: `${Math.min(100, pct)}%`,
																		}}
																	/>
																</div>
																<span className="text-xs font-semibold text-gray-600 w-10 text-right">
																	{pct.toFixed(0)}%
																</span>
															</div>
														) : (
															<span className="text-xs text-gray-300">
																No target
															</span>
														)}
													</td>
													<td className="px-6 py-3 text-center">
														{h.target === 0 ? (
															<span className="text-xs text-gray-300">—</span>
														) : achieved ? (
															<span className="text-xs font-semibold text-green-600 bg-green-50 px-2.5 py-1 rounded-full">
																✓ Tercapai
															</span>
														) : (
															<span className="text-xs font-semibold text-red-500 bg-red-50 px-2.5 py-1 rounded-full">
																✗ Belum
															</span>
														)}
													</td>
												</tr>
											);
										})}
									</tbody>
								</table>
							</div>
						</div>
					)}
				</>
			)}
		</div>
	);
}
