"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { formatRupiah, formatDate } from "@/lib/utils";
import {
	BarChart, Bar, XAxis, YAxis, CartesianGrid,
	Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import {
	TrendingUp, TrendingDown, Minus,
	Factory, Package, BarChart2, AlertTriangle,
} from "lucide-react";

// ── Types ──────────────────────────────────────────────────────────────────

interface BatchRow {
	id: string;
	nomor_batch: string;
	nama_produk: string;
	target_unit: number;
	unit_selesai: number;
	hpp_standar_per_unit: number | null;
	hpp_aktual_per_unit: number | null;
	total_biaya_bahan: number;
	upah_borongan: number;
	total_hpp: number;
	tanggal_selesai: string | null;
	tanggal_mulai: string | null;
}

interface BahanVariance {
	nama_bahan: string;
	satuan: string;
	total_standar: number;
	total_aktual: number;
	total_selisih: number;
	total_biaya: number;
}

// ── Helpers ────────────────────────────────────────────────────────────────

const BULAN = [
	"Januari","Februari","Maret","April","Mei","Juni",
	"Juli","Agustus","September","Oktober","November","Desember",
];

function varianceColor(v: number | null) {
	if (v === null) return "text-gray-400";
	if (Math.abs(v) < 100) return "text-gray-500";
	return v > 0 ? "text-red-600" : "text-green-600";
}

function varianceBg(v: number | null) {
	if (v === null || Math.abs(v) < 100) return "";
	return v > 0 ? "bg-red-50" : "bg-green-50";
}

function varIcon(v: number | null) {
	if (v === null || Math.abs(v) < 100) return <Minus size={12} className="text-gray-300" />;
	return v > 0
		? <TrendingUp size={12} className="text-red-500" />
		: <TrendingDown size={12} className="text-green-500" />;
}

// ── Component ──────────────────────────────────────────────────────────────

export default function LaporanHPPPage() {
	const supabase = createClient();
	const { isSuperAdmin } = useAuth();

	const now = new Date();
	const [bulan, setBulan] = useState(now.getMonth() + 1);
	const [tahun, setTahun] = useState(now.getFullYear());

	const [batches, setBatches] = useState<BatchRow[]>([]);
	const [bahanVariance, setBahanVariance] = useState<BahanVariance[]>([]);
	const [loading, setLoading] = useState(true);

	useEffect(() => { load(); }, [bulan, tahun]);

	const load = async () => {
		setLoading(true);

		const start = `${tahun}-${String(bulan).padStart(2, "0")}-01`;
		const end = new Date(tahun, bulan, 1).toISOString().split("T")[0]; // first day of next month

		// Batch selesai dalam periode
		const { data: batchData } = await supabase
			.from("batch_produksi")
			.select("id, nomor_batch, nama_produk, target_unit, unit_selesai, hpp_standar_per_unit, hpp_aktual_per_unit, total_biaya_bahan, upah_borongan, total_hpp, tanggal_selesai, tanggal_mulai")
			.eq("status", "selesai")
			.gte("tanggal_selesai", start)
			.lt("tanggal_selesai", end)
			.order("tanggal_selesai", { ascending: false });

		setBatches(batchData || []);

		// Pemakaian bahan dari batch yang selesai dalam periode
		if ((batchData || []).length > 0) {
			const batchIds = (batchData || []).map((b) => b.id);
			const { data: pemakaianData } = await supabase
				.from("batch_pemakaian_bahan")
				.select("nama_bahan, satuan, jumlah_standar, jumlah_aktual, selisih, subtotal")
				.in("batch_id", batchIds);

			// Aggregate per nama_bahan
			const map: Record<string, BahanVariance> = {};
			(pemakaianData || []).forEach((p: any) => {
				if (!map[p.nama_bahan]) {
					map[p.nama_bahan] = {
						nama_bahan: p.nama_bahan,
						satuan: p.satuan,
						total_standar: 0,
						total_aktual: 0,
						total_selisih: 0,
						total_biaya: 0,
					};
				}
				map[p.nama_bahan].total_standar += Number(p.jumlah_standar) || 0;
				map[p.nama_bahan].total_aktual  += Number(p.jumlah_aktual)  || 0;
				map[p.nama_bahan].total_selisih += Number(p.selisih)        || 0;
				map[p.nama_bahan].total_biaya   += Number(p.subtotal)       || 0;
			});

			// Sort by absolute selisih desc (boros terbesar dulu)
			const sorted = Object.values(map).sort(
				(a, b) => Math.abs(b.total_selisih) - Math.abs(a.total_selisih)
			);
			setBahanVariance(sorted);
		} else {
			setBahanVariance([]);
		}

		setLoading(false);
	};

	// ── Computed ──────────────────────────────────────────────────────────────

	const totalUnit      = batches.reduce((s, b) => s + b.unit_selesai, 0);
	const totalHpp       = batches.reduce((s, b) => s + b.total_hpp, 0);
	const totalBiayaBahan = batches.reduce((s, b) => s + b.total_biaya_bahan, 0);
	const totalUpah      = batches.reduce((s, b) => s + b.upah_borongan, 0);

	const batchesWithVariance = batches.filter(
		(b) => b.hpp_aktual_per_unit != null && b.hpp_standar_per_unit != null
	);
	const avgVariancePct = batchesWithVariance.length > 0
		? batchesWithVariance.reduce((s, b) => {
			const pct = b.hpp_standar_per_unit! > 0
				? ((b.hpp_aktual_per_unit! - b.hpp_standar_per_unit!) / b.hpp_standar_per_unit!) * 100
				: 0;
			return s + pct;
		  }, 0) / batchesWithVariance.length
		: 0;

	const borosBatches = batches.filter(
		(b) => b.hpp_aktual_per_unit != null && b.hpp_standar_per_unit != null &&
			b.hpp_aktual_per_unit > b.hpp_standar_per_unit + 100
	).length;

	// Chart data — HPP standar vs aktual per batch (superadmin only)
	const chartData = batches
		.filter((b) => b.hpp_standar_per_unit != null && b.hpp_aktual_per_unit != null)
		.slice(0, 10) // max 10 di chart
		.reverse()
		.map((b) => ({
			name: b.nomor_batch.replace("BATCH-", "").slice(-8), // short label
			"HPP Standar": Math.round(b.hpp_standar_per_unit!),
			"HPP Aktual":  Math.round(b.hpp_aktual_per_unit!),
		}));

	const tahunOptions = Array.from({ length: 4 }, (_, i) => now.getFullYear() - i);

	// ─────────────────────────────────────────────────────────────────────────

	return (
		<div>
			{/* Header */}
			<div className="flex flex-wrap items-start justify-between gap-4 mb-6">
				<div>
					<h1 className="text-2xl font-bold text-gray-900">Laporan HPP</h1>
					<p className="text-gray-500 mt-1">Analisis biaya produksi dan variance per periode</p>
				</div>
				{/* Filter periode */}
				<div className="flex items-center gap-2">
					<select
						value={bulan}
						onChange={(e) => setBulan(Number(e.target.value))}
						className="px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
						{BULAN.map((b, i) => (
							<option key={i} value={i + 1}>{b}</option>
						))}
					</select>
					<select
						value={tahun}
						onChange={(e) => setTahun(Number(e.target.value))}
						className="px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
						{tahunOptions.map((y) => (
							<option key={y} value={y}>{y}</option>
						))}
					</select>
				</div>
			</div>

			{loading ? (
				<div className="text-center py-24 text-gray-400">
					<Factory size={36} className="mx-auto mb-3 text-gray-200 animate-pulse" />
					<p>Memuat laporan...</p>
				</div>
			) : batches.length === 0 ? (
				<div className="text-center py-24 text-gray-400">
					<BarChart2 size={40} className="mx-auto mb-3 text-gray-200" />
					<p className="font-medium">Tidak ada batch selesai di periode ini</p>
					<p className="text-sm mt-1">Pilih periode lain atau selesaikan batch produksi terlebih dahulu.</p>
				</div>
			) : (
				<div className="space-y-6">
					{/* ── Stat Cards ── */}
					<div className={`grid gap-4 ${isSuperAdmin ? "grid-cols-2 lg:grid-cols-4" : "grid-cols-2"}`}>
						<div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
							<div className="flex items-center gap-2 mb-2">
								<Factory size={16} className="text-indigo-500" />
								<p className="text-xs text-gray-500 font-medium">Batch Selesai</p>
							</div>
							<p className="text-2xl font-bold text-indigo-700">{batches.length}</p>
						</div>
						<div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
							<div className="flex items-center gap-2 mb-2">
								<Package size={16} className="text-green-500" />
								<p className="text-xs text-gray-500 font-medium">Total Unit Diproduksi</p>
							</div>
							<p className="text-2xl font-bold text-green-700">{totalUnit.toLocaleString()}</p>
						</div>
						{isSuperAdmin && (
							<>
								<div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
									<div className="flex items-center gap-2 mb-2">
										<BarChart2 size={16} className="text-purple-500" />
										<p className="text-xs text-gray-500 font-medium">Total HPP</p>
									</div>
									<p className="text-2xl font-bold text-purple-700">{formatRupiah(totalHpp)}</p>
									<p className="text-xs text-gray-400 mt-0.5">Bahan {formatRupiah(totalBiayaBahan)} · Upah {formatRupiah(totalUpah)}</p>
								</div>
								<div className={`bg-white rounded-2xl p-5 shadow-sm border ${borosBatches > 0 ? "border-red-100 bg-red-50" : "border-gray-100"}`}>
									<div className="flex items-center gap-2 mb-2">
										<AlertTriangle size={16} className={borosBatches > 0 ? "text-red-500" : "text-gray-400"} />
										<p className="text-xs text-gray-500 font-medium">Batch Boros</p>
									</div>
									<p className={`text-2xl font-bold ${borosBatches > 0 ? "text-red-600" : "text-gray-400"}`}>
										{borosBatches}
									</p>
									<p className="text-xs text-gray-400 mt-0.5">
										Rata-rata variance: {avgVariancePct > 0 ? "+" : ""}{avgVariancePct.toFixed(1)}%
									</p>
								</div>
							</>
						)}
					</div>

					{/* ── Chart HPP (superadmin) ── */}
					{isSuperAdmin && chartData.length > 0 && (
						<div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
							<h2 className="font-semibold text-gray-800 mb-4">HPP Standar vs Aktual per Batch</h2>
							<ResponsiveContainer width="100%" height={280}>
								<BarChart data={chartData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
									<CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
									<XAxis dataKey="name" tick={{ fontSize: 11 }} />
									<YAxis
										tick={{ fontSize: 11 }}
										tickFormatter={(v) => formatRupiah(v).replace("Rp", "").trim()}
									/>
									<Tooltip
										formatter={(v: number) => formatRupiah(v)}
										contentStyle={{ borderRadius: 12, border: "1px solid #e5e7eb" }}
									/>
									<Legend wrapperStyle={{ fontSize: 12 }} />
									<Bar dataKey="HPP Standar" fill="#a5b4fc" radius={[4, 4, 0, 0]} />
									<Bar dataKey="HPP Aktual"  fill="#6366f1" radius={[4, 4, 0, 0]} />
								</BarChart>
							</ResponsiveContainer>
						</div>
					)}

					{/* ── Tabel Batch ── */}
					<div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
						<div className="px-5 py-4 border-b border-gray-100">
							<h2 className="font-semibold text-gray-800">Detail Batch Selesai</h2>
						</div>
						<div className="overflow-x-auto">
							<table className="w-full text-sm">
								<thead className="bg-gray-50 border-b border-gray-100">
									<tr>
										<th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Batch</th>
										<th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Produk</th>
										<th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Unit</th>
										<th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Selesai</th>
										{isSuperAdmin && (
											<>
												<th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">HPP Standar/unit</th>
												<th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">HPP Aktual/unit</th>
												<th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Variance</th>
												<th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Total HPP</th>
											</>
										)}
									</tr>
								</thead>
								<tbody className="divide-y divide-gray-50">
									{batches.map((b) => {
										const variance = b.hpp_aktual_per_unit != null && b.hpp_standar_per_unit != null
											? b.hpp_aktual_per_unit - b.hpp_standar_per_unit
											: null;
										const variancePct = variance != null && b.hpp_standar_per_unit! > 0
											? (variance / b.hpp_standar_per_unit!) * 100
											: null;

										return (
											<tr key={b.id} className={`hover:bg-gray-50 transition ${isSuperAdmin ? varianceBg(variance) : ""}`}>
												<td className="px-5 py-3.5">
													<p className="font-mono text-xs font-semibold text-indigo-600">{b.nomor_batch}</p>
													{b.tanggal_selesai && (
														<p className="text-xs text-gray-400">{formatDate(b.tanggal_selesai)}</p>
													)}
												</td>
												<td className="px-5 py-3.5 font-medium text-gray-900">{b.nama_produk}</td>
												<td className="px-4 py-3.5 text-center text-gray-500">
													{b.target_unit}
												</td>
												<td className="px-4 py-3.5 text-center font-semibold text-green-700">
													{b.unit_selesai}
												</td>
												{isSuperAdmin && (
													<>
														<td className="px-4 py-3.5 text-right text-gray-500 text-xs">
															{b.hpp_standar_per_unit != null
																? formatRupiah(b.hpp_standar_per_unit)
																: "—"}
														</td>
														<td className="px-4 py-3.5 text-right font-semibold text-indigo-700">
															{b.hpp_aktual_per_unit != null
																? formatRupiah(b.hpp_aktual_per_unit)
																: "—"}
														</td>
														<td className="px-4 py-3.5 text-right">
															{variance === null ? (
																<span className="text-gray-300">—</span>
															) : (
																<div className={`flex items-center justify-end gap-1 ${varianceColor(variance)}`}>
																	{varIcon(variance)}
																	<span className="font-semibold text-xs">
																		{variance > 0 ? "+" : ""}{formatRupiah(variance)}
																	</span>
																	{variancePct !== null && (
																		<span className="text-xs opacity-70">
																			({variancePct > 0 ? "+" : ""}{variancePct.toFixed(1)}%)
																		</span>
																	)}
																</div>
															)}
														</td>
														<td className="px-4 py-3.5 text-right font-bold text-gray-900">
															{formatRupiah(b.total_hpp)}
														</td>
													</>
												)}
											</tr>
										);
									})}
								</tbody>
								{isSuperAdmin && batches.length > 1 && (
									<tfoot className="bg-gray-50 border-t-2 border-gray-200">
										<tr>
											<td colSpan={4} className="px-5 py-3 text-sm font-semibold text-right text-gray-600">
												TOTAL
											</td>
											<td colSpan={3} />
											<td className="px-4 py-3 text-right font-bold text-gray-900">
												{formatRupiah(totalHpp)}
											</td>
										</tr>
									</tfoot>
								)}
							</table>
						</div>
					</div>

					{/* ── Variance per Bahan Baku (superadmin) ── */}
					{isSuperAdmin && bahanVariance.length > 0 && (
						<div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
							<div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
								<h2 className="font-semibold text-gray-800">Variance Pemakaian Bahan Baku</h2>
								<p className="text-xs text-gray-400">Akumulasi semua batch periode ini</p>
							</div>
							<div className="overflow-x-auto">
								<table className="w-full text-sm">
									<thead className="bg-gray-50 border-b border-gray-100">
										<tr>
											<th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Bahan Baku</th>
											<th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Standar</th>
											<th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Aktual</th>
											<th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Selisih</th>
											<th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Total Biaya</th>
										</tr>
									</thead>
									<tbody className="divide-y divide-gray-50">
										{bahanVariance.map((b) => {
											const boros = b.total_selisih > 0.001;
											const hemat = b.total_selisih < -0.001;
											return (
												<tr key={b.nama_bahan} className={`hover:bg-gray-50 transition ${boros ? "bg-red-50/50" : hemat ? "bg-green-50/50" : ""}`}>
													<td className="px-5 py-3.5">
														<p className="font-medium text-gray-900">{b.nama_bahan}</p>
														<p className="text-xs text-gray-400">{b.satuan}</p>
													</td>
													<td className="px-4 py-3.5 text-right text-gray-500 text-xs">
														{b.total_standar % 1 === 0 ? b.total_standar : b.total_standar.toFixed(3)}
													</td>
													<td className="px-4 py-3.5 text-right font-semibold text-gray-900">
														{b.total_aktual % 1 === 0 ? b.total_aktual : b.total_aktual.toFixed(3)}
													</td>
													<td className="px-4 py-3.5 text-right">
														{Math.abs(b.total_selisih) < 0.001 ? (
															<span className="text-gray-300 flex items-center justify-end gap-1">
																<Minus size={12} /> 0
															</span>
														) : (
															<span className={`flex items-center justify-end gap-1 font-semibold text-xs ${boros ? "text-red-600" : "text-green-600"}`}>
																{boros ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
																{boros ? "+" : ""}
																{b.total_selisih % 1 === 0 ? b.total_selisih : b.total_selisih.toFixed(3)}
																{" "}{b.satuan}
															</span>
														)}
													</td>
													<td className="px-4 py-3.5 text-right font-medium text-gray-700">
														{b.total_biaya > 0 ? formatRupiah(b.total_biaya) : "—"}
													</td>
												</tr>
											);
										})}
									</tbody>
								</table>
							</div>
						</div>
					)}
				</div>
			)}
		</div>
	);
}
