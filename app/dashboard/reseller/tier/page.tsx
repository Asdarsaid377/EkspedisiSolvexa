"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
	Award, TrendingUp, TrendingDown, Minus,
	ChevronRight, Settings, Save, RefreshCw,
	Crown, Star, Shield, User,
	Calendar, BarChart2, History,
} from "lucide-react";
import { formatRupiah } from "@/lib/utils";

// ─── Tier helpers ──────────────────────────────────────────────────────────────

type Tier = "reguler" | "silver" | "gold" | "platinum";

function hitungTier(omset: number, thresholds: TierThresholds): Tier {
	if (omset >= thresholds.platinum) return "platinum";
	if (omset >= thresholds.gold) return "gold";
	if (omset >= thresholds.silver) return "silver";
	return "reguler";
}

interface TierThresholds {
	silver: number;
	gold: number;
	platinum: number;
}

const TIER_META: Record<Tier, { label: string; icon: any; badge: string; row: string; text: string }> = {
	reguler:  { label: "Reguler",  icon: User,   badge: "bg-gray-100 text-gray-600",    row: "", text: "text-gray-500" },
	silver:   { label: "Silver",   icon: Shield, badge: "bg-slate-100 text-slate-600",  row: "bg-slate-50", text: "text-slate-600" },
	gold:     { label: "Gold",     icon: Star,   badge: "bg-amber-100 text-amber-700",  row: "bg-amber-50", text: "text-amber-700" },
	platinum: { label: "Platinum", icon: Crown,  badge: "bg-indigo-100 text-indigo-700", row: "bg-indigo-50", text: "text-indigo-700" },
};

function TierBadge({ tier }: { tier: Tier }) {
	const m = TIER_META[tier];
	const Icon = m.icon;
	return (
		<span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${m.badge}`}>
			<Icon size={11} />
			{m.label}
		</span>
	);
}

function TierIcon({ tier }: { tier: Tier }) {
	const m = TIER_META[tier];
	const Icon = m.icon;
	return <Icon size={14} className={m.text} />;
}

function periodeStr(y: number, m: number) {
	return `${y}-${String(m).padStart(2, "0")}`;
}

function formatPeriode(str: string) {
	const [y, m] = str.split("-");
	const bulan = ["Jan","Feb","Mar","Apr","Mei","Jun","Jul","Agu","Sep","Okt","Nov","Des"];
	return `${bulan[Number(m) - 1]} ${y}`;
}

// ─── Komponen utama ────────────────────────────────────────────────────────────

export default function TierResellerPage() {
	const supabase = createClient();
	const { isSuperAdmin } = useAuth();

	const now = new Date();
	const [tahun, setTahun] = useState(now.getFullYear());
	const [bulan, setBulan] = useState(now.getMonth() + 1);

	// Thresholds dari owner_settings
	const [thresholds, setThresholds] = useState<TierThresholds>({ silver: 5_000_000, gold: 15_000_000, platinum: 30_000_000 });
	const [editThresholds, setEditThresholds] = useState<TierThresholds | null>(null);
	const [savingThresholds, setSavingThresholds] = useState(false);
	const [thresholdOpen, setThresholdOpen] = useState(false);

	// Data reseller
	const [resellers, setResellers] = useState<any[]>([]);
	// omset per reseller untuk periode yang dipilih
	const [omsetMap, setOmsetMap] = useState<Record<string, number>>({});
	// omset bulan sebelumnya (untuk deteksi perubahan)
	const [omsetPrevMap, setOmsetPrevMap] = useState<Record<string, number>>({});
	// history tier dari DB
	const [history, setHistory] = useState<any[]>([]);
	const [loading, setLoading] = useState(true);
	const [savingSnapshot, setSavingSnapshot] = useState(false);
	const [snapshotMsg, setSnapshotMsg] = useState("");

	useEffect(() => { loadAll(); }, [tahun, bulan]);

	const loadAll = async () => {
		setLoading(true);
		await Promise.all([loadThresholds(), loadResellers(), loadHistory()]);
		setLoading(false);
	};

	const loadThresholds = async () => {
		const keys = ["tier_silver_min", "tier_gold_min", "tier_platinum_min"];
		const { data } = await supabase.from("owner_settings").select("key, value").in("key", keys);
		if (data?.length) {
			const map = Object.fromEntries(data.map((r: any) => [r.key, Number(r.value)]));
			setThresholds({
				silver:   map.tier_silver_min   ?? 5_000_000,
				gold:     map.tier_gold_min     ?? 15_000_000,
				platinum: map.tier_platinum_min ?? 30_000_000,
			});
		}
	};

	const loadResellers = async () => {
		const { data: rs } = await supabase.from("resellers").select("id, nama, kota").eq("aktif", true).order("nama");
		setResellers(rs || []);

		// Omset periode yang dipilih
		const awal = `${tahun}-${String(bulan).padStart(2, "0")}-01`;
		const akhir = new Date(tahun, bulan, 0);
		const akhirStr = `${tahun}-${String(bulan).padStart(2, "0")}-${String(akhir.getDate()).padStart(2, "0")}`;

		const { data: pj } = await supabase
			.from("penjualan")
			.select("reseller_id, total_harga_jual")
			.not("reseller_id", "is", null)
			.gte("tanggal", awal)
			.lte("tanggal", akhirStr + "T23:59:59");

		const map: Record<string, number> = {};
		for (const p of (pj || [])) {
			map[p.reseller_id] = (map[p.reseller_id] || 0) + (p.total_harga_jual || 0);
		}
		setOmsetMap(map);

		// Omset bulan sebelumnya
		const prevBulan = bulan === 1 ? 12 : bulan - 1;
		const prevTahun = bulan === 1 ? tahun - 1 : tahun;
		const prevAwal = `${prevTahun}-${String(prevBulan).padStart(2, "0")}-01`;
		const prevAkhir = new Date(prevTahun, prevBulan, 0);
		const prevAkhirStr = `${prevTahun}-${String(prevBulan).padStart(2, "0")}-${String(prevAkhir.getDate()).padStart(2, "0")}`;

		const { data: pjPrev } = await supabase
			.from("penjualan")
			.select("reseller_id, total_harga_jual")
			.not("reseller_id", "is", null)
			.gte("tanggal", prevAwal)
			.lte("tanggal", prevAkhirStr + "T23:59:59");

		const prevMap: Record<string, number> = {};
		for (const p of (pjPrev || [])) {
			prevMap[p.reseller_id] = (prevMap[p.reseller_id] || 0) + (p.total_harga_jual || 0);
		}
		setOmsetPrevMap(prevMap);
	};

	const loadHistory = async () => {
		const { data } = await supabase
			.from("reseller_tier_history")
			.select("*, resellers(nama)")
			.order("created_at", { ascending: false })
			.limit(50);
		setHistory(data || []);
	};

	// Simpan snapshot tier bulan ini ke history
	const simpanSnapshot = async () => {
		setSavingSnapshot(true);
		setSnapshotMsg("");
		const periode = periodeStr(tahun, bulan);
		let inserted = 0;

		for (const r of resellers) {
			const omset = omsetMap[r.id] || 0;
			const tier = hitungTier(omset, thresholds);

			// Cek apakah sudah ada snapshot untuk periode + reseller ini
			const { data: existing } = await supabase
				.from("reseller_tier_history")
				.select("id, tier")
				.eq("reseller_id", r.id)
				.eq("periode", periode)
				.single();

			if (!existing) {
				// Belum ada → insert baru
				await supabase.from("reseller_tier_history").insert({
					reseller_id: r.id,
					periode,
					tier,
					omset,
				});
				inserted++;
			} else if (existing.tier !== tier) {
				// Sudah ada tapi tier berubah → update
				await supabase.from("reseller_tier_history")
					.update({ tier, omset })
					.eq("id", existing.id);
				inserted++;
			}
		}

		await loadHistory();
		setSavingSnapshot(false);
		setSnapshotMsg(`${inserted} record diperbarui untuk periode ${formatPeriode(periode)}.`);
		setTimeout(() => setSnapshotMsg(""), 4000);
	};

	const saveThresholds = async () => {
		if (!editThresholds) return;
		setSavingThresholds(true);
		const upserts = [
			{ key: "tier_silver_min",   value: String(editThresholds.silver) },
			{ key: "tier_gold_min",     value: String(editThresholds.gold) },
			{ key: "tier_platinum_min", value: String(editThresholds.platinum) },
		];
		for (const u of upserts) {
			await supabase.from("owner_settings").upsert(u, { onConflict: "key" });
		}
		setThresholds(editThresholds);
		setSavingThresholds(false);
		setEditThresholds(null);
		setThresholdOpen(false);
	};

	// Reseller dengan tier saat ini + perubahan vs bulan lalu
	const rows = resellers.map((r) => {
		const omset = omsetMap[r.id] || 0;
		const omsetPrev = omsetPrevMap[r.id] || 0;
		const tier = hitungTier(omset, thresholds);
		const tierPrev = hitungTier(omsetPrev, thresholds);
		const tierOrder: Record<Tier, number> = { reguler: 0, silver: 1, gold: 2, platinum: 3 };
		const delta = tierOrder[tier] - tierOrder[tierPrev];
		return { ...r, omset, omsetPrev, tier, tierPrev, delta };
	}).sort((a, b) => b.omset - a.omset);

	// Ringkasan tier
	const tierCount: Record<Tier, number> = { reguler: 0, silver: 0, gold: 0, platinum: 0 };
	rows.forEach((r) => { tierCount[r.tier as Tier]++; });

	// Reseller yang naik/turun tier vs bulan lalu
	const naik  = rows.filter((r) => r.delta > 0);
	const turun = rows.filter((r) => r.delta < 0);

	const tahunList = Array.from({ length: 5 }, (_, i) => now.getFullYear() - i);
	const bulanLabel = ["Jan","Feb","Mar","Apr","Mei","Jun","Jul","Agu","Sep","Okt","Nov","Des"];

	if (loading) {
		return (
			<div className="flex items-center justify-center h-64">
				<div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
			</div>
		);
	}

	return (
		<div className="space-y-6">
			{/* ── Header ── */}
			<div className="flex flex-wrap items-start justify-between gap-4">
				<div>
					<h1 className="text-2xl font-bold text-gray-900">Tier Reseller</h1>
					<p className="text-gray-500 mt-1 text-sm">Klasifikasi otomatis berdasarkan omset bulanan</p>
				</div>
				<div className="flex items-center gap-2 flex-wrap">
					{/* Filter periode */}
					<select
						value={bulan}
						onChange={(e) => setBulan(Number(e.target.value))}
						className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
						{bulanLabel.map((b, i) => <option key={i} value={i + 1}>{b}</option>)}
					</select>
					<select
						value={tahun}
						onChange={(e) => setTahun(Number(e.target.value))}
						className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
						{tahunList.map((y) => <option key={y} value={y}>{y}</option>)}
					</select>
					<button
						onClick={() => loadAll()}
						className="flex items-center gap-1.5 px-3 py-2 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50 transition">
						<RefreshCw size={14} />
						Refresh
					</button>
					{isSuperAdmin && (
						<button
							onClick={simpanSnapshot}
							disabled={savingSnapshot}
							className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-medium transition disabled:opacity-60">
							<Save size={14} />
							{savingSnapshot ? "Menyimpan..." : "Simpan Snapshot"}
						</button>
					)}
				</div>
			</div>

			{snapshotMsg && (
				<div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl text-sm">
					{snapshotMsg}
				</div>
			)}

			{/* ── Stat Cards ── */}
			<div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
				{(["platinum", "gold", "silver", "reguler"] as Tier[]).map((t) => {
					const m = TIER_META[t];
					const Icon = m.icon;
					return (
						<div key={t} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center gap-3">
							<div className={`w-10 h-10 rounded-xl flex items-center justify-center ${m.badge}`}>
								<Icon size={18} />
							</div>
							<div>
								<p className="text-2xl font-bold text-gray-900">{tierCount[t]}</p>
								<p className="text-xs text-gray-500">{m.label}</p>
							</div>
						</div>
					);
				})}
			</div>

			{/* ── Alert Tier Naik/Turun ── */}
			{(naik.length > 0 || turun.length > 0) && (
				<div className="grid sm:grid-cols-2 gap-4">
					{naik.length > 0 && (
						<div className="bg-green-50 border border-green-200 rounded-2xl p-4">
							<div className="flex items-center gap-2 mb-3">
								<TrendingUp size={16} className="text-green-600" />
								<p className="font-semibold text-green-800 text-sm">{naik.length} Reseller Naik Tier</p>
								<span className="text-xs text-green-600 bg-green-100 px-2 py-0.5 rounded-full">vs bulan lalu</span>
							</div>
							<div className="space-y-2">
								{naik.map((r) => (
									<div key={r.id} className="flex items-center justify-between text-sm">
										<span className="font-medium text-gray-800">{r.nama}</span>
										<div className="flex items-center gap-1.5">
											<TierBadge tier={r.tierPrev} />
											<ChevronRight size={12} className="text-gray-400" />
											<TierBadge tier={r.tier} />
										</div>
									</div>
								))}
							</div>
						</div>
					)}
					{turun.length > 0 && (
						<div className="bg-red-50 border border-red-200 rounded-2xl p-4">
							<div className="flex items-center gap-2 mb-3">
								<TrendingDown size={16} className="text-red-600" />
								<p className="font-semibold text-red-800 text-sm">{turun.length} Reseller Turun Tier</p>
								<span className="text-xs text-red-600 bg-red-100 px-2 py-0.5 rounded-full">vs bulan lalu</span>
							</div>
							<div className="space-y-2">
								{turun.map((r) => (
									<div key={r.id} className="flex items-center justify-between text-sm">
										<span className="font-medium text-gray-800">{r.nama}</span>
										<div className="flex items-center gap-1.5">
											<TierBadge tier={r.tierPrev} />
											<ChevronRight size={12} className="text-gray-400" />
											<TierBadge tier={r.tier} />
										</div>
									</div>
								))}
							</div>
						</div>
					)}
				</div>
			)}

			{/* ── Config Threshold (superadmin) ── */}
			{isSuperAdmin && (
				<div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
					<button
						onClick={() => {
							setThresholdOpen(!thresholdOpen);
							if (!thresholdOpen) setEditThresholds({ ...thresholds });
						}}
						className="w-full flex items-center justify-between px-6 py-4 hover:bg-gray-50 transition">
						<div className="flex items-center gap-2">
							<Settings size={16} className="text-gray-500" />
							<span className="font-semibold text-gray-800 text-sm">Konfigurasi Batas Tier</span>
						</div>
						<ChevronRight size={16} className={`text-gray-400 transition-transform ${thresholdOpen ? "rotate-90" : ""}`} />
					</button>
					{thresholdOpen && editThresholds && (
						<div className="px-6 pb-6 border-t border-gray-100 pt-4 space-y-4">
							<div className="grid grid-cols-3 gap-4">
								{(["silver", "gold", "platinum"] as const).map((t) => {
									const m = TIER_META[t];
									const Icon = m.icon;
									return (
										<div key={t}>
											<label className="text-xs font-semibold text-gray-500 mb-1.5 flex items-center gap-1.5">
												<span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${m.badge}`}>
													<Icon size={10} /> {m.label}
												</span>
												<span className="text-gray-400 font-normal">min. omset/bulan</span>
											</label>
											<input
												type="number"
												value={editThresholds[t]}
												onChange={(e) => setEditThresholds({ ...editThresholds, [t]: Number(e.target.value) })}
												className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
											/>
											<p className="text-xs text-gray-400 mt-1">{formatRupiah(editThresholds[t])}</p>
										</div>
									);
								})}
							</div>
							<div className="flex gap-2 pt-1">
								<button
									onClick={saveThresholds}
									disabled={savingThresholds}
									className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-medium transition disabled:opacity-60">
									<Save size={14} />
									{savingThresholds ? "Menyimpan..." : "Simpan"}
								</button>
								<button
									onClick={() => { setThresholdOpen(false); setEditThresholds(null); }}
									className="px-4 py-2 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50 transition">
									Batal
								</button>
							</div>
						</div>
					)}
				</div>
			)}

			{/* ── Tabel Reseller + Tier ── */}
			<div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
				<div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
					<BarChart2 size={16} className="text-indigo-600" />
					<h2 className="font-semibold text-gray-800">
						Tier {bulanLabel[bulan - 1]} {tahun}
					</h2>
					<span className="ml-auto text-xs text-gray-400">{resellers.length} reseller</span>
				</div>
				<div className="overflow-x-auto">
					<table className="w-full text-sm">
						<thead>
							<tr className="border-b border-gray-100 bg-gray-50">
								<th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Peringkat</th>
								<th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Reseller</th>
								<th className="text-right px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Omset Bulan Ini</th>
								<th className="text-right px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Omset Bulan Lalu</th>
								<th className="text-center px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Tier Ini</th>
								<th className="text-center px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Perubahan</th>
								<th className="text-right px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Ke Tier Berikut</th>
							</tr>
						</thead>
						<tbody className="divide-y divide-gray-50">
							{rows.map((r, idx) => {
								// Hitung sisa omset ke tier berikutnya
								let sisaKeTier: number | null = null;
								let tierBerikut: Tier | null = null;
								if (r.tier === "reguler") { sisaKeTier = thresholds.silver - r.omset; tierBerikut = "silver"; }
								else if (r.tier === "silver") { sisaKeTier = thresholds.gold - r.omset; tierBerikut = "gold"; }
								else if (r.tier === "gold")   { sisaKeTier = thresholds.platinum - r.omset; tierBerikut = "platinum"; }

								return (
									<tr key={r.id} className={`transition hover:bg-gray-50 ${TIER_META[r.tier as Tier].row}`}>
										<td className="px-6 py-4">
											<span className="text-gray-400 font-medium">#{idx + 1}</span>
										</td>
										<td className="px-6 py-4">
											<p className="font-semibold text-gray-900">{r.nama}</p>
											{r.kota && <p className="text-xs text-gray-400">{r.kota}</p>}
										</td>
										<td className="px-6 py-4 text-right font-semibold text-gray-900">
											{r.omset > 0 ? formatRupiah(r.omset) : <span className="text-gray-300">—</span>}
										</td>
										<td className="px-6 py-4 text-right text-gray-500">
											{r.omsetPrev > 0 ? formatRupiah(r.omsetPrev) : <span className="text-gray-300">—</span>}
										</td>
										<td className="px-6 py-4 text-center">
											<TierBadge tier={r.tier} />
										</td>
										<td className="px-6 py-4 text-center">
											{r.delta > 0 ? (
												<span className="inline-flex items-center gap-1 text-green-600 text-xs font-semibold">
													<TrendingUp size={13} /> Naik
												</span>
											) : r.delta < 0 ? (
												<span className="inline-flex items-center gap-1 text-red-500 text-xs font-semibold">
													<TrendingDown size={13} /> Turun
												</span>
											) : (
												<span className="text-gray-300"><Minus size={14} /></span>
											)}
										</td>
										<td className="px-6 py-4 text-right">
											{sisaKeTier !== null && tierBerikut ? (
												<div className="text-right">
													<p className="text-xs text-gray-500">
														+{formatRupiah(sisaKeTier)} ke <span className={`font-semibold ${TIER_META[tierBerikut].text}`}>{TIER_META[tierBerikut].label}</span>
													</p>
													<div className="mt-1 h-1.5 bg-gray-100 rounded-full w-24 ml-auto">
														<div
															className="h-full bg-indigo-400 rounded-full"
															style={{
																width: `${Math.min(100, (r.omset / (r.tier === "reguler" ? thresholds.silver : r.tier === "silver" ? thresholds.gold : thresholds.platinum)) * 100)}%`
															}}
														/>
													</div>
												</div>
											) : (
												<span className="text-xs text-indigo-500 font-semibold">Top Tier ✓</span>
											)}
										</td>
									</tr>
								);
							})}
						</tbody>
					</table>
					{rows.length === 0 && (
						<div className="text-center py-12 text-gray-400">
							<Award size={32} className="mx-auto mb-2 text-gray-200" />
							<p className="text-sm">Belum ada data reseller</p>
						</div>
					)}
				</div>
			</div>

			{/* ── Batas Tier Info ── */}
			<div className="grid grid-cols-3 gap-3">
				{(["silver", "gold", "platinum"] as const).map((t) => {
					const m = TIER_META[t];
					const Icon = m.icon;
					const prevTier = t === "silver" ? "reguler" : t === "gold" ? "silver" : "gold";
					const prevVal = t === "silver" ? 0 : t === "gold" ? thresholds.silver : thresholds.gold;
					return (
						<div key={t} className={`rounded-2xl border p-4 ${m.row || "bg-white"} border-gray-100`}>
							<div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold mb-2 ${m.badge}`}>
								<Icon size={11} /> {m.label}
							</div>
							<p className="text-sm font-bold text-gray-900">{formatRupiah(thresholds[t])}<span className="text-xs text-gray-400 font-normal">/bulan</span></p>
							<p className="text-xs text-gray-400 mt-0.5">Naik dari {TIER_META[prevTier as Tier].label}</p>
						</div>
					);
				})}
			</div>

			{/* ── Riwayat Snapshot ── */}
			{history.length > 0 && (
				<div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
					<div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
						<History size={16} className="text-gray-500" />
						<h2 className="font-semibold text-gray-800">Riwayat Tier</h2>
						<span className="ml-auto text-xs text-gray-400">{history.length} entri terakhir</span>
					</div>
					<div className="overflow-x-auto">
						<table className="w-full text-sm">
							<thead>
								<tr className="border-b border-gray-100 bg-gray-50">
									<th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Reseller</th>
									<th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Periode</th>
									<th className="text-center px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Tier</th>
									<th className="text-right px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Omset</th>
									<th className="text-right px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Dicatat</th>
								</tr>
							</thead>
							<tbody className="divide-y divide-gray-50">
								{history.map((h) => (
									<tr key={h.id} className="hover:bg-gray-50 transition">
										<td className="px-6 py-3 font-medium text-gray-900">{h.resellers?.nama || "-"}</td>
										<td className="px-6 py-3 text-gray-500">{formatPeriode(h.periode)}</td>
										<td className="px-6 py-3 text-center"><TierBadge tier={h.tier as Tier} /></td>
										<td className="px-6 py-3 text-right text-gray-700">{formatRupiah(h.omset)}</td>
										<td className="px-6 py-3 text-right text-gray-400 text-xs">
											{new Date(h.created_at).toLocaleDateString("id-ID", { day: "numeric", month: "short" })}
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				</div>
			)}
		</div>
	);
}
