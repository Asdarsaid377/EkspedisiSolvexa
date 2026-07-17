"use client";

import { useCallback, useEffect, useState } from "react";
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
	Legend,
} from "recharts";

// Potongan laba otomatis untuk biaya marketing & sedekah — di luar Pengeluaran & HPP,
// dipotong per unit terjual (bukan per transaksi)
const BIAYA_MARKETING_PER_UNIT = 100_000;
const BIAYA_SEDEKAH_PER_UNIT = 100_000;

const MONTH_NAMES_SHORT = [
	"Jan",
	"Feb",
	"Mar",
	"Apr",
	"Mei",
	"Jun",
	"Jul",
	"Agt",
	"Sep",
	"Okt",
	"Nov",
	"Des",
];

interface Summary {
	omset: number;
	modal: number;
	labaKotor: number;
	pengeluaranTotal: number;
	totalUnit: number;
	biayaMarketing: number;
	biayaSedekah: number;
	labaBersih: number;
}

interface TrendItem {
	label: string;
	omset: number;
	laba: number;
	pengeluaran: number;
}

const KEU_ROLES = ["superadmin", "keuangan"];

export default function LaporanKeuanganPage() {
	const supabase = createClient();
	const { isSuperAdmin, role, loading: authLoading } = useAuth();
	const router = useRouter();

	useEffect(() => {
		if (!authLoading && !KEU_ROLES.includes(role ?? ""))
			router.replace("/dashboard");
	}, [role, authLoading, router]);

	if (authLoading || !KEU_ROLES.includes(role ?? "")) return null;
	const now = new Date();

	const defaultDari = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
	const defaultSampai = new Date(now.getFullYear(), now.getMonth() + 1, 0)
		.toISOString()
		.split("T")[0];

	const [filter, setFilter] = useState({
		dari: defaultDari,
		sampai: defaultSampai,
	});
	const [summary, setSummary] = useState<Summary>({
		omset: 0,
		modal: 0,
		labaKotor: 0,
		pengeluaranTotal: 0,
		totalUnit: 0,
		biayaMarketing: 0,
		biayaSedekah: 0,
		labaBersih: 0,
	});
	const [aset, setAset] = useState({ nilaiStok: 0, piutang: 0 });
	const [trendData, setTrendData] = useState<TrendItem[]>([]);
	const [loading, setLoading] = useState(true);

	const load = useCallback(async () => {
		setLoading(true);

		const [penjualanRes, pengeluaranRes, produkRes, piutangRes] =
			await Promise.all([
				supabase
					.from("penjualan")
					.select("total_harga_jual, items:penjualan_item(harga_modal, jumlah)")
					.gte("tanggal", filter.dari + "T00:00:00")
					.lte("tanggal", filter.sampai + "T23:59:59"),
				supabase
					.from("pengeluaran")
					.select("jumlah")
					.gte("tanggal", filter.dari)
					.lte("tanggal", filter.sampai),
				supabase
					.from("produk")
					.select("stok, harga_modal")
					.eq("aktif", true)
					.gt("stok", 0),
				supabase
					.from("penjualan")
					.select("total_harga_jual, uang_dp")
					.neq("status_bayar", "lunas"),
			]);

		let omset = 0,
			modalTotal = 0,
			totalUnit = 0;
		for (const p of penjualanRes.data || []) {
			omset += p.total_harga_jual || 0;
			for (const item of (p.items || []) as any[]) {
				modalTotal += (item.harga_modal || 0) * (item.jumlah || 0);
				totalUnit += item.jumlah || 0;
			}
		}
		const pengeluaranTotal = (pengeluaranRes.data || []).reduce(
			(s: number, p: any) => s + (p.jumlah || 0),
			0,
		);
		const labaKotor = omset - modalTotal;
		const biayaMarketing = totalUnit * BIAYA_MARKETING_PER_UNIT;
		const biayaSedekah = totalUnit * BIAYA_SEDEKAH_PER_UNIT;
		setSummary({
			omset,
			modal: modalTotal,
			labaKotor,
			pengeluaranTotal,
			totalUnit,
			biayaMarketing,
			biayaSedekah,
			labaBersih: labaKotor - pengeluaranTotal - biayaMarketing - biayaSedekah,
		});

		const nilaiStok = (produkRes.data || []).reduce(
			(s, p) => s + (p.stok || 0) * (p.harga_modal || 0),
			0,
		);
		const piutang = (piutangRes.data || []).reduce(
			(s, p) => s + ((p.total_harga_jual || 0) - (p.uang_dp || 0)),
			0,
		);
		setAset({ nilaiStok, piutang });

		// Trend 6 bulan
		const trendMonths: { bulan: number; tahun: number }[] = [];
		let tm = now.getMonth() + 1,
			ty = now.getFullYear();
		for (let i = 0; i < 6; i++) {
			trendMonths.unshift({ bulan: tm, tahun: ty });
			tm--;
			if (tm === 0) {
				tm = 12;
				ty--;
			}
		}
		const oldest = trendMonths[0];
		const newest = trendMonths[trendMonths.length - 1];
		const newestLastDay = new Date(newest.tahun, newest.bulan, 0).getDate();
		const tStart = `${oldest.tahun}-${String(oldest.bulan).padStart(2, "0")}-01`;
		const tEnd = `${newest.tahun}-${String(newest.bulan).padStart(2, "0")}-${String(newestLastDay).padStart(2, "0")}`;

		const [tPenjRes, tPengRes] = await Promise.all([
			supabase
				.from("penjualan")
				.select(
					"tanggal, total_harga_jual, items:penjualan_item(harga_modal, jumlah)",
				)
				.gte("tanggal", tStart + "T00:00:00")
				.lte("tanggal", tEnd + "T23:59:59"),
			supabase
				.from("pengeluaran")
				.select("tanggal, jumlah")
				.gte("tanggal", tStart)
				.lte("tanggal", tEnd),
		]);

		const omsetMap: Record<string, number> = {};
		const labaKotorMap: Record<string, number> = {};
		const unitMap: Record<string, number> = {};
		for (const p of tPenjRes.data || []) {
			const d = new Date(p.tanggal);
			const key = `${d.getFullYear()}-${d.getMonth() + 1}`;
			const items = (p.items || []) as any[];
			const itemModal = items.reduce(
				(s: number, i: any) => s + (i.harga_modal || 0) * (i.jumlah || 0),
				0,
			);
			const itemUnit = items.reduce((s: number, i: any) => s + (i.jumlah || 0), 0);
			omsetMap[key] = (omsetMap[key] || 0) + (p.total_harga_jual || 0);
			labaKotorMap[key] =
				(labaKotorMap[key] || 0) + ((p.total_harga_jual || 0) - itemModal);
			unitMap[key] = (unitMap[key] || 0) + itemUnit;
		}
		const pengMap: Record<string, number> = {};
		for (const p of tPengRes.data || []) {
			const d = new Date(p.tanggal + "T00:00:00");
			const key = `${d.getFullYear()}-${d.getMonth() + 1}`;
			pengMap[key] = (pengMap[key] || 0) + (p.jumlah || 0);
		}

		setTrendData(
			trendMonths.map(({ bulan, tahun }) => {
				const key = `${tahun}-${bulan}`;
				const peng = pengMap[key] || 0;
				const biayaMkt = (unitMap[key] || 0) * BIAYA_MARKETING_PER_UNIT;
				const biayaSdk = (unitMap[key] || 0) * BIAYA_SEDEKAH_PER_UNIT;
				return {
					label: MONTH_NAMES_SHORT[bulan - 1],
					omset: Math.round((omsetMap[key] || 0) / 1_000_000),
					laba: Math.round(
						Math.max(0, (labaKotorMap[key] || 0) - peng - biayaMkt - biayaSdk) / 1_000_000,
					),
					pengeluaran: Math.round(peng / 1_000_000),
				};
			}),
		);

		setLoading(false);
	}, [filter]);

	useEffect(() => {
		load();
	}, [load]);

	if (!isSuperAdmin) {
		return (
			<div className="text-center py-20 text-gray-400">
				Halaman ini hanya dapat diakses oleh owner.
			</div>
		);
	}

	const totalAset = aset.nilaiStok + aset.piutang;
	const marginKotor =
		summary.omset > 0 ? (summary.labaKotor / summary.omset) * 100 : 0;
	const marginBersih =
		summary.omset > 0 ? (summary.labaBersih / summary.omset) * 100 : 0;

	return (
		<div>
			<div className="mb-8">
				<h1 className="text-2xl font-bold text-gray-900">Laporan Keuangan</h1>
				<p className="text-gray-500 mt-1">
					Ringkasan omset, laba, dan kondisi aset bisnis
				</p>
			</div>

			{/* Filter */}
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
				<button
					onClick={() =>
						setFilter({ dari: defaultDari, sampai: defaultSampai })
					}
					className="px-4 py-2 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50 transition">
					Reset Bulan Ini
				</button>
			</div>

			{loading ? (
				<div className="text-center py-20 text-gray-400">Memuat laporan...</div>
			) : (
				<>
					{/* Summary Cards */}
					<div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-3 mb-6">
						<div className="bg-blue-50 rounded-2xl p-4 border border-blue-100">
							<p className="text-xs font-semibold text-blue-500 mb-1">Omset</p>
							<p className="text-lg font-bold text-blue-700">
								{formatRupiah(summary.omset)}
							</p>
						</div>
						<div className="bg-red-50 rounded-2xl p-4 border border-red-100">
							<p className="text-xs font-semibold text-red-500 mb-1">
								Modal (HPP)
							</p>
							<p className="text-lg font-bold text-red-600">
								{formatRupiah(summary.modal)}
							</p>
						</div>
						<div className="bg-gray-50 rounded-2xl p-4 border border-gray-200">
							<p className="text-xs font-semibold text-gray-500 mb-1">
								Laba Kotor
							</p>
							<p className="text-lg font-bold text-gray-800">
								{formatRupiah(summary.labaKotor)}
							</p>
							<p className="text-xs text-gray-400">{marginKotor.toFixed(1)}%</p>
						</div>
						<div className="bg-orange-50 rounded-2xl p-4 border border-orange-100">
							<p className="text-xs font-semibold text-orange-500 mb-1">
								Pengeluaran
							</p>
							<p className="text-lg font-bold text-orange-600">
								{formatRupiah(summary.pengeluaranTotal)}
							</p>
						</div>
						<div className="bg-purple-50 rounded-2xl p-4 border border-purple-100">
							<p className="text-xs font-semibold text-purple-500 mb-1">
								Biaya Marketing
							</p>
							<p className="text-lg font-bold text-purple-600">
								{formatRupiah(summary.biayaMarketing)}
							</p>
							<p className="text-xs text-purple-400">
								{summary.totalUnit} unit × Rp100rb
							</p>
						</div>
						<div className="bg-teal-50 rounded-2xl p-4 border border-teal-100">
							<p className="text-xs font-semibold text-teal-500 mb-1">
								Biaya Sedekah
							</p>
							<p className="text-lg font-bold text-teal-600">
								{formatRupiah(summary.biayaSedekah)}
							</p>
							<p className="text-xs text-teal-400">
								{summary.totalUnit} unit × Rp100rb
							</p>
						</div>
						<div
							className={`rounded-2xl p-4 border-2 ${summary.labaBersih >= 0 ? "bg-green-50 border-green-300" : "bg-red-50 border-red-300"}`}>
							<p
								className={`text-xs font-semibold mb-1 ${summary.labaBersih >= 0 ? "text-green-600" : "text-red-500"}`}>
								Laba Bersih
							</p>
							<p
								className={`text-lg font-bold ${summary.labaBersih >= 0 ? "text-green-700" : "text-red-600"}`}>
								{formatRupiah(summary.labaBersih)}
							</p>
							<p
								className={`text-xs ${summary.labaBersih >= 0 ? "text-green-400" : "text-red-400"}`}>
								{marginBersih.toFixed(1)}%
							</p>
						</div>
					</div>

					{/* P&L Waterfall */}
					<div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 mb-6">
						<h2 className="text-base font-semibold text-gray-900 mb-5">
							Rincian Laba Rugi
						</h2>
						<div className="space-y-2.5">
							<div className="flex items-center justify-between px-5 py-4 bg-blue-50 rounded-xl border border-blue-100">
								<div>
									<p className="text-sm font-semibold text-blue-800">
										Omset Penjualan
									</p>
									<p className="text-xs text-blue-500 mt-0.5">
										Total nilai transaksi terjual dalam periode
									</p>
								</div>
								<p className="text-xl font-bold text-blue-700">
									{formatRupiah(summary.omset)}
								</p>
							</div>

							<div className="flex items-center justify-between px-5 py-4 bg-red-50 rounded-xl border-l-4 border-red-300">
								<div>
									<p className="text-sm font-semibold text-red-700">
										— Modal / HPP
									</p>
									<p className="text-xs text-red-400 mt-0.5">
										Harga beli barang yang sudah terjual
									</p>
								</div>
								<p className="text-xl font-bold text-red-500">
									({formatRupiah(summary.modal)})
								</p>
							</div>

							<div className="flex items-center justify-between px-5 py-4 bg-gray-50 rounded-xl border border-dashed border-gray-300">
								<div>
									<p className="text-sm font-semibold text-gray-700">
										= Laba Kotor
									</p>
									<p className="text-xs text-gray-400 mt-0.5">
										Margin kotor {marginKotor.toFixed(1)}%
									</p>
								</div>
								<p
									className={`text-xl font-bold ${summary.labaKotor >= 0 ? "text-gray-800" : "text-red-600"}`}>
									{formatRupiah(summary.labaKotor)}
								</p>
							</div>

							<div className="flex items-center justify-between px-5 py-4 bg-orange-50 rounded-xl border-l-4 border-orange-300">
								<div>
									<p className="text-sm font-semibold text-orange-700">
										— Pengeluaran Operasional
									</p>
									<p className="text-xs text-orange-400 mt-0.5">
										Gaji, transport, operasional, dll
									</p>
								</div>
								<p className="text-xl font-bold text-orange-500">
									({formatRupiah(summary.pengeluaranTotal)})
								</p>
							</div>

							<div className="flex items-center justify-between px-5 py-4 bg-purple-50 rounded-xl border-l-4 border-purple-300">
								<div>
									<p className="text-sm font-semibold text-purple-700">
										— Biaya Marketing
									</p>
									<p className="text-xs text-purple-400 mt-0.5">
										Otomatis Rp100.000 × {summary.totalUnit} unit terjual
									</p>
								</div>
								<p className="text-xl font-bold text-purple-500">
									({formatRupiah(summary.biayaMarketing)})
								</p>
							</div>

							<div className="flex items-center justify-between px-5 py-4 bg-teal-50 rounded-xl border-l-4 border-teal-300">
								<div>
									<p className="text-sm font-semibold text-teal-700">
										— Biaya Sedekah
									</p>
									<p className="text-xs text-teal-400 mt-0.5">
										Otomatis Rp100.000 × {summary.totalUnit} unit terjual
									</p>
								</div>
								<p className="text-xl font-bold text-teal-500">
									({formatRupiah(summary.biayaSedekah)})
								</p>
							</div>

							<div
								className={`flex items-center justify-between px-5 py-5 rounded-xl border-2 ${
									summary.labaBersih >= 0
										? "bg-green-50 border-green-300"
										: "bg-red-50 border-red-300"
								}`}>
								<div>
									<p
										className={`text-sm font-bold ${summary.labaBersih >= 0 ? "text-green-800" : "text-red-800"}`}>
										= Laba Bersih
									</p>
									<p
										className={`text-xs mt-0.5 ${summary.labaBersih >= 0 ? "text-green-500" : "text-red-400"}`}>
										Margin bersih {marginBersih.toFixed(1)}%
									</p>
								</div>
								<p
									className={`text-2xl font-bold ${summary.labaBersih >= 0 ? "text-green-700" : "text-red-600"}`}>
									{formatRupiah(summary.labaBersih)}
								</p>
							</div>
						</div>
					</div>

					{/* Kondisi Aset */}
					<div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 mb-6">
						<div className="mb-5">
							<h2 className="text-base font-semibold text-gray-900">
								Kondisi Aset
							</h2>
							<p className="text-xs text-gray-400 mt-0.5">
								Snapshot saat ini — tidak terpengaruh filter periode
							</p>
						</div>
						<div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
							<div className="bg-indigo-50 rounded-xl p-5 border border-indigo-100">
								<p className="text-xs font-semibold text-indigo-500 mb-2">
									Nilai Stok Barang
								</p>
								<p className="text-2xl font-bold text-indigo-700">
									{formatRupiah(aset.nilaiStok)}
								</p>
								<p className="text-xs text-indigo-400 mt-1.5">
									Total stok aktif × harga modal
								</p>
							</div>
							<div className="bg-amber-50 rounded-xl p-5 border border-amber-100">
								<p className="text-xs font-semibold text-amber-500 mb-2">
									Piutang Belum Lunas
								</p>
								<p className="text-2xl font-bold text-amber-700">
									{formatRupiah(aset.piutang)}
								</p>
								<p className="text-xs text-amber-400 mt-1.5">
									Sisa tagihan reseller belum bayar
								</p>
							</div>
							<div className="bg-green-50 rounded-xl p-5 border-2 border-green-300">
								<p className="text-xs font-semibold text-green-600 mb-2">
									Total Aset Lancar
								</p>
								<p className="text-2xl font-bold text-green-700">
									{formatRupiah(totalAset)}
								</p>
								<p className="text-xs text-green-400 mt-1.5">Stok + Piutang</p>
							</div>
						</div>
					</div>

					{/* Trend 6 Bulan */}
					<div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
						<h2 className="text-base font-semibold text-gray-900 mb-1">
							Trend 6 Bulan Terakhir
						</h2>
						<p className="text-xs text-gray-400 mb-5">Dalam jutaan rupiah</p>
						<ResponsiveContainer width="100%" height={240}>
							<BarChart
								data={trendData}
								margin={{ left: 0, right: 0, top: 0, bottom: 0 }}>
								<XAxis
									dataKey="label"
									tick={{ fontSize: 12 }}
									axisLine={false}
									tickLine={false}
								/>
								<YAxis
									tick={{ fontSize: 11 }}
									axisLine={false}
									tickLine={false}
									tickFormatter={(v) => `${v}jt`}
								/>
								<Tooltip
									formatter={(v: number, name: string) => [
										formatRupiah(v * 1_000_000),
										name === "omset"
											? "Omset"
											: name === "laba"
												? "Laba Bersih"
												: "Pengeluaran",
									]}
								/>
								<Legend
									formatter={(v) =>
										v === "omset"
											? "Omset"
											: v === "laba"
												? "Laba Bersih"
												: "Pengeluaran"
									}
								/>
								<Bar dataKey="omset" fill="#6366f1" radius={[4, 4, 0, 0]} />
								<Bar dataKey="laba" fill="#22c55e" radius={[4, 4, 0, 0]} />
								<Bar
									dataKey="pengeluaran"
									fill="#f97316"
									radius={[4, 4, 0, 0]}
								/>
							</BarChart>
						</ResponsiveContainer>
					</div>
				</>
			)}
		</div>
	);
}
