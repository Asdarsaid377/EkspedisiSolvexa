"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import ChatWidget from "@/components/ChatWidget";
import { cariKoreksiOtomatis } from "@/lib/utils";
import {
	Crown,
	Star,
	Shield,
	User,
	TrendingUp,
	Package,
	CheckCircle,
	Clock,
	Truck,
	Loader,
	AlertCircle,
	Phone,
	MapPin,
	ChevronDown,
	ChevronUp,
	Wallet,
	Gift,
	AlertTriangle,
	Calendar,
	Trophy,
	Megaphone,
	X,
	CheckSquare,
	Square,
	StickyNote,
} from "lucide-react";
import {
	BarChart,
	Bar,
	XAxis,
	YAxis,
	Tooltip,
	ResponsiveContainer,
	Cell,
} from "recharts";

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

// ─── Tier helpers ──────────────────────────────────────────────────────────────

type Tier = "reguler" | "silver" | "gold" | "platinum";

const TIER_META: Record<
	Tier,
	{ label: string; icon: any; badge: string; bg: string; border: string }
> = {
	reguler: {
		label: "Reguler",
		icon: User,
		badge: "bg-gray-100 text-gray-600",
		bg: "bg-gray-50",
		border: "border-gray-200",
	},
	silver: {
		label: "Silver",
		icon: Shield,
		badge: "bg-slate-100 text-slate-700",
		bg: "bg-slate-50",
		border: "border-slate-200",
	},
	gold: {
		label: "Gold",
		icon: Star,
		badge: "bg-amber-100 text-amber-700",
		bg: "bg-amber-50",
		border: "border-amber-200",
	},
	platinum: {
		label: "Platinum",
		icon: Crown,
		badge: "bg-indigo-100 text-indigo-700",
		bg: "bg-indigo-50",
		border: "border-indigo-300",
	},
};

function hitungTier(
	omset: number,
	th: { silver: number; gold: number; platinum: number },
): Tier {
	if (omset >= th.platinum) return "platinum";
	if (omset >= th.gold) return "gold";
	if (omset >= th.silver) return "silver";
	return "reguler";
}

function formatRp(n: number) {
	return new Intl.NumberFormat("id-ID", {
		style: "currency",
		currency: "IDR",
		minimumFractionDigits: 0,
	}).format(n);
}

function formatTgl(s: string) {
	return new Date(s).toLocaleDateString("id-ID", {
		day: "numeric",
		month: "short",
		year: "numeric",
	});
}

function formatPeriode(s: string) {
	const [y, m] = s.split("-");
	const bulan = [
		"Jan",
		"Feb",
		"Mar",
		"Apr",
		"Mei",
		"Jun",
		"Jul",
		"Agu",
		"Sep",
		"Okt",
		"Nov",
		"Des",
	];
	return `${bulan[Number(m) - 1]} ${y}`;
}

const MILESTONE_META: Record<
	string,
	{ label: string; icon: any; color: string }
> = {
	diproses: {
		label: "Diproses",
		icon: Clock,
		color: "text-gray-500 bg-gray-100",
	},
	diproduksi: {
		label: "Diproduksi",
		icon: Package,
		color: "text-blue-600 bg-blue-50",
	},
	dikirim: {
		label: "Dikirim",
		icon: Truck,
		color: "text-amber-600 bg-amber-50",
	},
	selesai: {
		label: "Selesai",
		icon: CheckCircle,
		color: "text-green-600 bg-green-50",
	},
};

const STATUS_BAYAR_META: Record<string, { label: string; color: string }> = {
	lunas: { label: "Lunas", color: "bg-green-100 text-green-700" },
	dp: { label: "DP", color: "bg-amber-100 text-amber-700" },
	belum_bayar: { label: "Belum Bayar", color: "bg-red-100 text-red-600" },
};

// ─── Komponen utama ────────────────────────────────────────────────────────────

export default function ResellerPortalPage() {
	const { token } = useParams<{ token: string }>();

	const [loading, setLoading] = useState(true);
	const [error, setError] = useState("");
	const [data, setData] = useState<any>(null);

	// Filter penjualan
	const [filterStatus, setFilterStatus] = useState<
		"semua" | "lunas" | "belum" | "dp"
	>("semua");
	const [filterBulan, setFilterBulan] = useState("");
	const [showTierHistory, setShowTierHistory] = useState(false);
	const [lbView, setLbView] = useState<"omset" | "unit">("omset");
	const [showPengumuman, setShowPengumuman] = useState(false);
	const [approvingId, setApprovingId] = useState<string | null>(null);
	const [expandedRincian, setExpandedRincian] = useState<Set<string>>(
		new Set(),
	);
	const toggleRincian = (id: string) => {
		setExpandedRincian((prev) => {
			const next = new Set(prev);
			if (next.has(id)) next.delete(id);
			else next.add(id);
			return next;
		});
	};

	const dismissKey = `bng_pengumuman_dismissed_${token}`;

	useEffect(() => {
		if (!token) return;
		fetch("/api/reseller-portal", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ token }),
		})
			.then((r) => r.json())
			.then((json) => {
				if (json.error) {
					setError(json.error);
				} else {
					setData(json);
					const dismissed: string[] = JSON.parse(
						localStorage.getItem(dismissKey) || "[]",
					);
					const belumDilihat = (json.pengumuman || []).some(
						(p: any) => !dismissed.includes(p.id),
					);
					if (belumDilihat) setShowPengumuman(true);
				}
				setLoading(false);
			})
			.catch(() => {
				setError("Gagal memuat data.");
				setLoading(false);
			});
	}, [token]);

	const tutupPengumuman = () => {
		const ids = (data?.pengumuman || []).map((p: any) => p.id);
		localStorage.setItem(dismissKey, JSON.stringify(ids));
		setShowPengumuman(false);
	};

	const toggleApproval = async (p: any) => {
		const next = !p.bonus_disetujui_reseller;
		setApprovingId(p.id);
		try {
			const res = await fetch("/api/reseller-portal/approve-bonus", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ token, penjualan_id: p.id, approved: next }),
			});
			const json = await res.json();
			if (!json.error) {
				setData((d: any) => ({
					...d,
					penjualan: d.penjualan.map((x: any) =>
						x.id === p.id
							? { ...x, bonus_disetujui_reseller: json.bonus_disetujui_reseller, bonus_disetujui_at: json.bonus_disetujui_at }
							: x,
					),
				}));
			}
		} finally {
			setApprovingId(null);
		}
	};

	if (loading) {
		return (
			<div className="min-h-screen bg-gray-50 flex items-center justify-center">
				<div className="text-center">
					<Loader
						size={32}
						className="mx-auto animate-spin text-indigo-500 mb-3"
					/>
					<p className="text-gray-500 text-sm">Memuat data...</p>
				</div>
			</div>
		);
	}

	if (error || !data) {
		return (
			<div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
				<div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 max-w-sm w-full text-center">
					<AlertCircle size={40} className="mx-auto text-red-400 mb-3" />
					<h2 className="font-bold text-gray-900 mb-1">Link Tidak Ditemukan</h2>
					<p className="text-sm text-gray-500">
						{error || "Link ini tidak valid atau sudah direset oleh admin."}
					</p>
					<p className="text-xs text-gray-400 mt-4">
						Hubungi BungaNaik untuk mendapatkan link baru.
					</p>
				</div>
			</div>
		);
	}

	const {
		reseller,
		penjualan,
		tierHistory,
		thresholds,
		pengumuman = [],
	} = data;

	// Hitung omset bulan ini
	const now = new Date();
	const bulanIni = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
	const omsetBulanIni = penjualan
		.filter((p: any) => p.tanggal?.startsWith(bulanIni))
		.reduce((s: number, p: any) => s + (p.total_harga_jual || 0), 0);

	const tierSaatIni = hitungTier(omsetBulanIni, thresholds);
	const tierMeta = TIER_META[tierSaatIni];
	const TierIcon = tierMeta.icon;

	// Progress ke tier berikut
	let sisaKeTier = 0,
		tierBerikut: Tier | null = null,
		persen = 100;
	if (tierSaatIni === "reguler") {
		sisaKeTier = thresholds.silver - omsetBulanIni;
		tierBerikut = "silver";
		persen = Math.min(100, (omsetBulanIni / thresholds.silver) * 100);
	} else if (tierSaatIni === "silver") {
		sisaKeTier = thresholds.gold - omsetBulanIni;
		tierBerikut = "gold";
		persen = Math.min(
			100,
			((omsetBulanIni - thresholds.silver) /
				(thresholds.gold - thresholds.silver)) *
				100,
		);
	} else if (tierSaatIni === "gold") {
		sisaKeTier = thresholds.platinum - omsetBulanIni;
		tierBerikut = "platinum";
		persen = Math.min(
			100,
			((omsetBulanIni - thresholds.gold) /
				(thresholds.platinum - thresholds.gold)) *
				100,
		);
	}

	// Ringkasan bonus — hanya nota yang sudah lunas yang terhitung sebagai bonus
	const penjualanLunas = penjualan.filter(
		(p: any) => p.status_bayar === "lunas",
	);
	const totalBonusKotor = penjualanLunas.reduce(
		(s: number, p: any) => s + (p.total_bonus || 0) + (p.bonus_owner || 0),
		0,
	);
	const referensiKoreksi = cariKoreksiOtomatis(totalBonusKotor);
	const koreksiAdmin = referensiKoreksi?.admin || 0;
	const koreksiAsisten = referensiKoreksi?.asisten || 0;
	const sedekahMimbar = referensiKoreksi?.team || 0;
	const totalKoreksi = koreksiAdmin + koreksiAsisten + sedekahMimbar;
	const totalBonus = totalBonusKotor - totalKoreksi;
	const bonusTerbayar = penjualanLunas.reduce(
		(s: number, p: any) => s + (p.bonus_terbayar || 0),
		0,
	);
	const bonusBelum = Math.max(0, totalBonus - bonusTerbayar);

	// Filter penjualan
	const bulanOptions = Array.from(
		new Set(penjualan.map((p: any) => p.tanggal?.slice(0, 7))),
	)
		.sort()
		.reverse() as string[];
	const pjFiltered = penjualan.filter((p: any) => {
		if (filterStatus === "lunas" && p.status_bayar !== "lunas") return false;
		if (filterStatus === "belum" && p.status_bayar !== "belum_bayar")
			return false;
		if (filterStatus === "dp" && p.status_bayar !== "dp") return false;
		if (filterBulan && !p.tanggal?.startsWith(filterBulan)) return false;
		return true;
	});

	// Papan peringkat reseller bulan ini
	const leaderboard = (data.leaderboard || []) as Array<{
		id: string;
		nama: string;
		jumlah_transaksi: number;
		total_omset: number;
		total_unit: number;
	}>;
	const lbSorted = [...leaderboard].sort((a, b) =>
		lbView === "omset"
			? b.total_omset - a.total_omset
			: b.total_unit - a.total_unit,
	);
	const lbTop10 = lbSorted.slice(0, 10).map((r) => ({
		id: r.id,
		nama: r.nama.length > 16 ? r.nama.slice(0, 16) + "…" : r.nama,
		value: lbView === "omset" ? Math.round(r.total_omset / 1000) : r.total_unit,
	}));
	const myRank = lbSorted.findIndex((r) => r.id === reseller.id) + 1;
	const lbChartHeight = Math.min(10, lbTop10.length) * 42 + 24;

	return (
		<div className="min-h-screen bg-gray-50">
			{/* ── Modal Pengumuman ── */}
			{showPengumuman && pengumuman.length > 0 && (
				<div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
					<div className="bg-white rounded-2xl w-full max-w-md shadow-2xl max-h-[80vh] flex flex-col">
						<div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 flex-shrink-0">
							<p className="font-semibold text-gray-900 flex items-center gap-2">
								<Megaphone size={16} className="text-indigo-600" /> Pengumuman
							</p>
							<button
								onClick={tutupPengumuman}
								className="p-1.5 hover:bg-gray-100 rounded-lg">
								<X size={16} />
							</button>
						</div>
						<div className="flex-1 overflow-y-auto p-5 space-y-4">
							{pengumuman.map((p: any) => (
								<div
									key={p.id}
									className="bg-indigo-50 border border-indigo-100 rounded-xl p-4">
									<p className="font-semibold text-gray-900 text-sm mb-1">
										{p.judul}
									</p>
									<p className="text-sm text-gray-700 whitespace-pre-line">
										{p.isi}
									</p>
									<p className="text-xs text-gray-400 mt-2">
										{formatTgl(p.created_at)}
									</p>
								</div>
							))}
						</div>
						<div className="px-5 pb-5 flex-shrink-0">
							<button
								onClick={tutupPengumuman}
								className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold transition">
								Mengerti
							</button>
						</div>
					</div>
				</div>
			)}

			{/* ── Header ── */}
			<div className={`${tierMeta.bg} border-b ${tierMeta.border}`}>
				<div className="max-w-2xl mx-auto px-4 py-6">
					<p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">
						Portal Mitra
					</p>
					<h1 className="text-2xl font-bold text-gray-900">{reseller.nama}</h1>
					<div className="flex items-center gap-3 mt-2 flex-wrap">
						{reseller.kota && (
							<span className="flex items-center gap-1 text-sm text-gray-500">
								<MapPin size={13} /> {reseller.kota}
							</span>
						)}
						{reseller.telepon && (
							<span className="flex items-center gap-1 text-sm text-gray-500">
								<Phone size={13} /> {reseller.telepon}
							</span>
						)}
						<span
							className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-semibold ${tierMeta.badge}`}>
							<TierIcon size={13} /> {tierMeta.label}
						</span>
					</div>
				</div>
			</div>

			<div className="max-w-2xl mx-auto px-4 py-5 space-y-4">
				{/* ── Catatan Khusus dari BungaNaik ── */}
				{reseller.catatan && (
					<div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3">
						<div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-600 flex items-center justify-center flex-shrink-0">
							<StickyNote size={15} />
						</div>
						<div className="min-w-0">
							<span className="inline-block text-[10px] font-bold uppercase tracking-wider text-amber-600 bg-amber-100 px-2 py-0.5 rounded-full mb-1">
								Catatan Khusus untuk Anda
							</span>
							<p className="text-sm text-amber-900 whitespace-pre-line">{reseller.catatan}</p>
						</div>
					</div>
				)}

				{/* ── Pengumuman ── */}
				{pengumuman.length > 0 && (
					<div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
						<p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
							<Megaphone size={12} /> Pengumuman Owner
						</p>
						<div className="space-y-3">
							{pengumuman.map((p: any) => (
								<div
									key={p.id}
									className="bg-indigo-50 border border-indigo-100 rounded-xl p-4">
									<p className="font-semibold text-gray-900 text-sm mb-1">
										{p.judul}
									</p>
									<p className="text-sm text-gray-700 whitespace-pre-line">
										{p.isi}
									</p>
									<p className="text-xs text-gray-400 mt-2">
										{formatTgl(p.created_at)}
									</p>
								</div>
							))}
						</div>
					</div>
				)}

				{/* ── Omset & Tier bulan ini ── */}
				<div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
					<p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
						<TrendingUp size={12} /> Performa Bulan Ini
					</p>
					<div className="flex items-end justify-between mb-3">
						<div>
							<p className="text-3xl font-bold text-gray-900">
								{formatRp(omsetBulanIni)}
							</p>
							<p className="text-sm text-gray-500 mt-0.5">
								Total omset{" "}
								{new Date().toLocaleDateString("id-ID", {
									month: "long",
									year: "numeric",
								})}
							</p>
						</div>
						<span
							className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-bold ${tierMeta.badge}`}>
							<TierIcon size={14} /> {tierMeta.label}
						</span>
					</div>

					{/* Progress ke tier berikut */}
					{tierBerikut && (
						<div>
							<div className="flex justify-between text-xs text-gray-500 mb-1.5">
								<span>
									Progress ke{" "}
									<span
										className={`font-semibold ${TIER_META[tierBerikut].badge.split(" ")[1]}`}>
										{TIER_META[tierBerikut].label}
									</span>
								</span>
								<span>kurang {formatRp(sisaKeTier)}</span>
							</div>
							<div className="h-2 bg-gray-100 rounded-full overflow-hidden">
								<div
									className="h-full bg-indigo-500 rounded-full transition-all"
									style={{ width: `${persen}%` }}
								/>
							</div>
						</div>
					)}
					{!tierBerikut && (
						<div className="text-center py-2 text-indigo-600 text-sm font-semibold">
							🏆 Anda sudah mencapai tier tertinggi!
						</div>
					)}
				</div>

				{/* ── Papan Peringkat Reseller ── */}
				{leaderboard.length > 0 && (
					<div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
						<div className="flex items-center justify-between mb-1">
							<p className="text-xs font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
								<Trophy size={12} className="text-amber-500" /> Papan Peringkat
								Bulan Ini
							</p>
							<div className="flex rounded-lg border border-gray-200 overflow-hidden text-xs">
								<button
									onClick={() => setLbView("omset")}
									className={`px-3 py-1.5 font-medium transition ${lbView === "omset" ? "bg-indigo-600 text-white" : "bg-white text-gray-600 hover:bg-gray-50"}`}>
									Omset
								</button>
								<button
									onClick={() => setLbView("unit")}
									className={`px-3 py-1.5 font-medium transition ${lbView === "unit" ? "bg-indigo-600 text-white" : "bg-white text-gray-600 hover:bg-gray-50"}`}>
									Unit
								</button>
							</div>
						</div>
						{myRank > 0 && (
							<p className="text-sm text-gray-500 mb-3">
								Peringkat Anda:{" "}
								<span className="font-bold text-indigo-600">#{myRank}</span>{" "}
								dari {lbSorted.length} reseller
							</p>
						)}
						<ResponsiveContainer width="100%" height={lbChartHeight}>
							<BarChart
								data={lbTop10}
								layout="vertical"
								margin={{ left: 12, right: 24, top: 0, bottom: 0 }}>
								<XAxis
									type="number"
									tick={{ fontSize: 10 }}
									tickFormatter={(v) =>
										lbView === "omset"
											? v >= 1000
												? `${(v / 1000).toFixed(0)}jt`
												: `${v}rb`
											: String(v)
									}
								/>
								<YAxis
									type="category"
									dataKey="nama"
									width={110}
									tick={{ fontSize: 11 }}
								/>
								<Tooltip
									formatter={(v: number) =>
										lbView === "omset" ? formatRp(v * 1000) : `${v} unit`
									}
								/>
								<Bar dataKey="value" radius={[0, 6, 6, 0]}>
									{lbTop10.map((r, i) => (
										<Cell
											key={i}
											fill={
												r.id === reseller.id
													? "#4f46e5"
													: BAR_COLORS[i % BAR_COLORS.length]
											}
										/>
									))}
								</Bar>
							</BarChart>
						</ResponsiveContainer>
						{myRank > 10 && (
							<p className="text-xs text-gray-400 mt-2 text-center">
								Anda belum masuk top 10 — terus tingkatkan penjualan untuk
								bersaing! 💪
							</p>
						)}
					</div>
				)}

				{/* ── Riwayat Tier ── */}
				{tierHistory.length > 0 && (
					<div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
						<button
							onClick={() => setShowTierHistory(!showTierHistory)}
							className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition">
							<p className="text-sm font-semibold text-gray-800 flex items-center gap-2">
								<Crown size={14} className="text-indigo-500" /> Riwayat Tier
							</p>
							{showTierHistory ? (
								<ChevronUp size={16} className="text-gray-400" />
							) : (
								<ChevronDown size={16} className="text-gray-400" />
							)}
						</button>
						{showTierHistory && (
							<div className="border-t border-gray-100 divide-y divide-gray-50">
								{tierHistory.map((h: any, i: number) => {
									const m = TIER_META[h.tier as Tier];
									const Icon = m.icon;
									return (
										<div
											key={i}
											className="flex items-center justify-between px-5 py-3">
											<div className="flex items-center gap-3">
												<span
													className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${m.badge}`}>
													<Icon size={10} /> {m.label}
												</span>
												<span className="text-sm text-gray-500">
													{formatPeriode(h.periode)}
												</span>
											</div>
											<span className="text-sm font-semibold text-gray-700">
												{formatRp(h.omset)}
											</span>
										</div>
									);
								})}
							</div>
						)}
					</div>
				)}

				{/* ── Riwayat Penjualan ── */}
				<div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
					<div className="px-5 py-4 border-b border-gray-100">
						<p className="text-sm font-semibold text-gray-800 flex items-center gap-2 mb-3">
							<Wallet size={14} className="text-indigo-500" /> Riwayat Transaksi
							<span className="ml-auto text-xs font-normal text-gray-400">
								{pjFiltered.length} transaksi
							</span>
						</p>
						{/* Filter */}
						<div className="flex flex-wrap gap-2">
							<div className="flex rounded-xl border border-gray-200 overflow-hidden text-xs">
								{[
									{ v: "semua", l: "Semua" },
									{ v: "lunas", l: "Lunas" },
									{ v: "dp", l: "DP" },
									{ v: "belum", l: "Belum Bayar" },
								].map(({ v, l }) => (
									<button
										key={v}
										onClick={() => setFilterStatus(v as any)}
										className={`px-3 py-1.5 font-medium transition ${filterStatus === v ? "bg-indigo-600 text-white" : "bg-white text-gray-600 hover:bg-gray-50"}`}>
										{l}
									</button>
								))}
							</div>
							{bulanOptions.length > 1 && (
								<select
									value={filterBulan}
									onChange={(e) => setFilterBulan(e.target.value)}
									className="border border-gray-200 rounded-xl px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500">
									<option value="">Semua Bulan</option>
									{bulanOptions.map((b) => (
										<option key={b} value={b}>
											{formatPeriode(b)}
										</option>
									))}
								</select>
							)}
						</div>
					</div>

					{pjFiltered.length === 0 ? (
						<div className="text-center py-10 text-gray-400 text-sm">
							Tidak ada transaksi
						</div>
					) : (
						<div className="divide-y divide-gray-50">
							{pjFiltered.map((p: any) => {
								const ms =
									MILESTONE_META[p.milestone] || MILESTONE_META.diproses;
								const MsIcon = ms.icon;
								const sb =
									STATUS_BAYAR_META[p.status_bayar] ||
									STATUS_BAYAR_META.belum_bayar;
								const bonusTotal = (p.total_bonus || 0) + (p.bonus_owner || 0);
								const belumLunas = p.status_bayar !== "lunas";
								const bonusSisa = Math.max(
									0,
									bonusTotal - (p.bonus_terbayar || 0),
								);
								const namaBarang = (p.penjualan_item || [])
									.map((it: any) => it.produk?.nama)
									.filter(Boolean)
									.join(", ");
								return (
									<div key={p.id} className="px-5 py-4">
										<div className="flex items-start justify-between gap-2 mb-2">
											<div>
												<p className="text-sm font-bold text-gray-900">
													{p.nomor_faktur}
												</p>
												<p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
													<Calendar size={11} /> {formatTgl(p.tanggal)}
													{p.tujuan && (
														<span className="ml-1">· {p.tujuan}</span>
													)}
												</p>
												{namaBarang && (
													<p className="text-xs text-gray-500 mt-0.5">
														{namaBarang}
													</p>
												)}
											</div>
											<div className="flex items-center gap-1.5 flex-shrink-0">
												<span
													className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${sb.color}`}>
													{sb.label}
												</span>
												<span
													className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium ${ms.color}`}>
													<MsIcon size={10} />
													{ms.label}
												</span>
											</div>
										</div>
										<div className="flex items-end justify-between">
											<div>
												<p className="text-base font-bold text-gray-900">
													{formatRp(p.total_harga_jual || 0)}
												</p>
							{bonusTotal > 0 && (
													<p
														className={`text-xs mt-0.5 ${belumLunas ? "text-gray-400" : bonusSisa > 0 ? "text-amber-600" : "text-green-600"}`}>
														{belumLunas
															? `Bonus ${formatRp(bonusTotal)} · Belum lunas, belum terhitung`
															: `Bonus ${formatRp(bonusTotal)}${bonusSisa > 0 ? ` · Belum dibayar ${formatRp(bonusSisa)}` : " · Lunas ✓"}`}
													</p>
												)}
											</div>
											{(p.penjualan_item || []).length > 0 && (
												<button
													onClick={() => toggleRincian(p.id)}
													className="flex items-center gap-1 text-xs font-medium text-indigo-600 hover:underline">
													Rincian Bonus
													{expandedRincian.has(p.id) ? (
														<ChevronUp size={13} />
													) : (
														<ChevronDown size={13} />
													)}
												</button>
											)}
										</div>
										{expandedRincian.has(p.id) && (
											<div className="mt-2.5 rounded-xl border border-gray-100 overflow-hidden">
												<table className="w-full text-xs">
													<thead>
														<tr className="bg-gray-50 text-gray-500">
															<th className="text-left font-medium px-3 py-2">
																Barang
															</th>
															<th className="text-right font-medium px-3 py-2">
																Katalog
															</th>
															<th className="text-right font-medium px-3 py-2">
																Ongkir
															</th>
															<th className="text-right font-medium px-3 py-2">
																Jual
															</th>
															<th className="text-right font-medium px-3 py-2">
																Bonus
															</th>
														</tr>
													</thead>
													<tbody className="divide-y divide-gray-50">
														{(p.penjualan_item || []).map(
															(it: any, idx: number) => (
																<tr key={idx}>
																	<td className="px-3 py-2 text-gray-700">
																		{it.produk?.nama || "-"}
																		{it.jumlah > 1 && (
																			<span className="text-gray-400">
																				{" "}
																				×{it.jumlah}
																			</span>
																		)}
																	</td>
																	<td className="px-3 py-2 text-right text-gray-500">
																		{formatRp(it.harga_katalog || 0)}
																	</td>
																	<td className="px-3 py-2 text-right text-gray-500">
																		{formatRp(it.ongkir || 0)}
																	</td>
																	<td className="px-3 py-2 text-right text-gray-500">
																		{formatRp(it.harga_jual || 0)}
																	</td>
																	<td className="px-3 py-2 text-right font-semibold text-purple-600">
																		{formatRp(it.bonus || 0)}
																	</td>
																</tr>
															),
														)}
													</tbody>
												</table>
											</div>
										)}
										{bonusTotal > 0 && (
											belumLunas ? (
												<div className="mt-2.5 flex items-center gap-2 bg-gray-50 rounded-xl px-3 py-2 text-xs text-gray-400">
													<AlertTriangle size={13} className="flex-shrink-0" />
													Nota belum lunas — bonus belum terhitung
												</div>
											) : (
											<div className="mt-2.5 flex items-center justify-between gap-2 bg-gray-50 rounded-xl px-3 py-2">
												<div className="min-w-0">
													<p className="text-xs font-medium text-gray-600">Persetujuan Bonus</p>
													{p.bonus_disetujui_reseller && p.bonus_disetujui_at && (
														<p className="text-[11px] text-gray-400 mt-0.5">
															Disetujui {formatTgl(p.bonus_disetujui_at)}
														</p>
													)}
												</div>
												<button
													onClick={() => toggleApproval(p)}
													disabled={approvingId === p.id}
													className={`flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-full border transition flex-shrink-0 disabled:opacity-50 ${
														p.bonus_disetujui_reseller
															? "bg-green-100 text-green-700 border-green-200"
															: "bg-white text-gray-500 border-gray-200 hover:border-indigo-300 hover:text-indigo-600"
													}`}>
													{p.bonus_disetujui_reseller ? <CheckSquare size={14} /> : <Square size={14} />}
													{p.bonus_disetujui_reseller ? "Disetujui" : "Setujui Bonus Ini"}
												</button>
											</div>
											)
										)}
									</div>
								);
							})}
						</div>
					)}
				</div>

				{/* ── Ringkasan Bonus ── */}
				<div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
					<p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
						<Gift size={12} /> Ringkasan Bonus
					</p>
					<div className="grid grid-cols-3 gap-3">
						<div className="bg-gray-50 rounded-xl p-3 text-center">
							<p className="text-xs text-gray-400 mb-1">Total Bonus</p>
							<p className="font-bold text-gray-900 text-sm">
								{formatRp(totalBonus)}
							</p>
						</div>
						<div className="bg-green-50 rounded-xl p-3 text-center">
							<p className="text-xs text-gray-400 mb-1">Terbayar</p>
							<p className="font-bold text-green-600 text-sm">
								{formatRp(bonusTerbayar)}
							</p>
						</div>
						<div
							className={`rounded-xl p-3 text-center ${bonusBelum > 0 ? "bg-red-50" : "bg-gray-50"}`}>
							<p className="text-xs text-gray-400 mb-1">Belum Dibayar</p>
							<p
								className={`font-bold text-sm ${bonusBelum > 0 ? "text-red-600" : "text-gray-400"}`}>
								{formatRp(bonusBelum)}
							</p>
						</div>
					</div>
					{totalKoreksi > 0 && (
						<div className="mt-3 space-y-1 text-xs bg-gray-50 rounded-xl px-3 py-2.5">
							<p className="font-semibold text-gray-500 mb-1">
								Rincian Koreksi
							</p>
							<div className="flex justify-between text-gray-500">
								<span>Bonus Kotor</span>
								<span className="font-medium text-gray-700">
									{formatRp(totalBonusKotor)}
								</span>
							</div>
							{koreksiAdmin > 0 && (
								<div className="flex justify-between text-red-500">
									<span>Koreksi Admin</span>
									<span>− {formatRp(koreksiAdmin)}</span>
								</div>
							)}
							{koreksiAsisten > 0 && (
								<div className="flex justify-between text-red-500">
									<span>Koreksi Asisten</span>
									<span>− {formatRp(koreksiAsisten)}</span>
								</div>
							)}
							{sedekahMimbar > 0 && (
								<div className="flex justify-between text-red-500">
									<span>Sedekah Mimbar</span>
									<span>− {formatRp(sedekahMimbar)}</span>
								</div>
							)}
							{referensiKoreksi && (
								<p className="text-[11px] text-gray-400 pt-1.5 mt-1.5 border-t border-gray-200">
									Sesuai tabel Rekap Titipan, interval{" "}
									{formatRp(referensiKoreksi.min)}–{formatRp(referensiKoreksi.max)}
								</p>
							)}
						</div>
					)}
					{bonusBelum > 0 && (
						<div className="mt-3 flex items-start gap-2 text-xs text-amber-700 bg-amber-50 rounded-xl px-3 py-2.5">
							<AlertTriangle size={13} className="mt-0.5 flex-shrink-0" />
							<span>
								Ada bonus yang belum dibayarkan. Hubungi BungaNaik untuk
								konfirmasi.
							</span>
						</div>
					)}
				</div>

				{/* Footer */}
				<div className="text-center pb-6">
					<p className="text-xs text-gray-400">
						Data ini bersifat pribadi dan hanya dapat diakses melalui link
						khusus Anda.
					</p>
					<p className="text-xs text-gray-400 mt-1">
						Jika ada pertanyaan, hubungi BungaNaik.
					</p>
				</div>
			</div>

			<ChatWidget accent="indigo" />
		</div>
	);
}
