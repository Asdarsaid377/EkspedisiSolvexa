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
import { Package } from "lucide-react";

type SortView = "unit" | "omset" | "laba";

interface ProdukStat {
	id: string;
	nama: string;
	kategori?: string;
	satuan: string;
	total_unit: number;
	total_omset: number;
	total_laba: number;
	jumlah_transaksi: number;
}

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

const MEDAL_COLORS = [
	"bg-amber-400 text-white",
	"bg-gray-300 text-gray-700",
	"bg-amber-700/70 text-white",
];

const VIEW_CONFIG: Record<SortView, { label: string; chartLabel: string }> = {
	unit: { label: "By Unit Terjual", chartLabel: "Unit Terjual" },
	omset: { label: "By Omset", chartLabel: "Omset (Ribu Rp)" },
	laba: { label: "By Laba", chartLabel: "Laba (Ribu Rp)" },
};

const LAP_ROLES = ["superadmin","keuangan","gudang"];

export default function LaporanProdukPage() {
	const supabase = createClient();
	const { isSuperAdmin, role, loading: authLoading } = useAuth();
	const router = useRouter();

	useEffect(() => {
		if (!authLoading && !LAP_ROLES.includes(role ?? "")) router.replace("/dashboard");
	}, [role, authLoading, router]);

	if (authLoading || !LAP_ROLES.includes(role ?? "")) return null;
	const [loading, setLoading] = useState(true);
	const [filter, setFilter] = useState({ dari: "", sampai: "" });
	const [view, setView] = useState<SortView>("unit");
	const [filterKategori, setFilterKategori] = useState("");
	const [stats, setStats] = useState<ProdukStat[]>([]);

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
		const { data: penjualanList } = await supabase
			.from("penjualan")
			.select(
				"id, items:penjualan_item(jumlah, harga_katalog, harga_modal, produk:produk(id, nama, kategori, satuan))",
			)
			.gte("tanggal", filter.dari + "T00:00:00")
			.lte("tanggal", filter.sampai + "T23:59:59");

		const map: Record<string, ProdukStat> = {};
		for (const p of penjualanList || []) {
			for (const item of (p.items || []) as any[]) {
				const produk = item.produk;
				if (!produk) continue;
				const id = produk.id;
				if (!map[id]) {
					map[id] = {
						id,
						nama: produk.nama,
						kategori: produk.kategori,
						satuan: produk.satuan || "unit",
						total_unit: 0,
						total_omset: 0,
						total_laba: 0,
						jumlah_transaksi: 0,
					};
				}
				map[id].total_unit += item.jumlah;
				map[id].total_omset += item.harga_katalog * item.jumlah;
				map[id].total_laba +=
					(item.harga_katalog - item.harga_modal) * item.jumlah;
				map[id].jumlah_transaksi += 1;
			}
		}

		setStats(Object.values(map));
		setLoading(false);
	};

	const kategoriList = Array.from(
		new Set(stats.map((s) => s.kategori).filter(Boolean)),
	) as string[];

	const filtered = stats.filter(
		(s) => !filterKategori || s.kategori === filterKategori,
	);

	const sorted = [...filtered]
		.sort((a, b) => {
			if (view === "unit") return b.total_unit - a.total_unit;
			if (view === "omset") return b.total_omset - a.total_omset;
			return b.total_laba - a.total_laba;
		})
		.slice(0, 20);

	const chartTop10 = sorted.slice(0, 10).map((s) => ({
		nama: s.nama.length > 16 ? s.nama.slice(0, 16) + "…" : s.nama,
		value:
			view === "unit"
				? s.total_unit
				: Math.round((view === "omset" ? s.total_omset : s.total_laba) / 1000),
	}));

	const totalUnit = filtered.reduce((s, p) => s + p.total_unit, 0);
	const totalOmset = filtered.reduce((s, p) => s + p.total_omset, 0);
	const totalLaba = filtered.reduce((s, p) => s + p.total_laba, 0);

	const viewOptions: SortView[] = isSuperAdmin
		? ["unit", "omset", "laba"]
		: ["unit", "omset"];

	return (
		<div>
			<div className="mb-8">
				<h1 className="text-2xl font-bold text-gray-900">Laporan Produk</h1>
				<p className="text-gray-500 mt-1">
					Pemantauan produk terjual, omset, dan laba per periode
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
				{kategoriList.length > 0 && (
					<div>
						<label className="block text-xs font-medium text-gray-500 mb-1">
							Kategori
						</label>
						<select
							value={filterKategori}
							onChange={(e) => setFilterKategori(e.target.value)}
							className="px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white">
							<option value="">Semua Kategori</option>
							{kategoriList.map((k) => (
								<option key={k} value={k}>
									{k}
								</option>
							))}
						</select>
					</div>
				)}
				<div className="flex rounded-xl border border-gray-200 overflow-hidden ml-auto">
					{viewOptions.map((v) => (
						<button
							key={v}
							onClick={() => setView(v)}
							className={`px-4 py-2 text-sm font-medium transition ${
								view === v
									? "bg-indigo-600 text-white"
									: "bg-white text-gray-600 hover:bg-gray-50"
							}`}>
							{v === "unit"
								? "By Unit"
								: v === "omset"
									? "By Omset"
									: "By Laba"}
						</button>
					))}
				</div>
			</div>

			{loading ? (
				<div className="text-center py-20 text-gray-400">Memuat laporan...</div>
			) : sorted.length === 0 ? (
				<div className="text-center py-20 text-gray-400">
					Tidak ada data pada periode ini
				</div>
			) : (
				<>
					{/* Summary Cards */}
					<div
						className={`grid grid-cols-2 ${isSuperAdmin ? "lg:grid-cols-4" : "lg:grid-cols-3"} gap-4 mb-8`}>
						<div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
							<p className="text-xs text-gray-500 mb-1">Jenis Produk Terjual</p>
							<p className="text-3xl font-bold text-indigo-600">
								{filtered.length}
							</p>
							<p className="text-xs text-gray-400 mt-0.5">jenis produk</p>
						</div>
						<div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
							<p className="text-xs text-gray-500 mb-1">Total Unit Terjual</p>
							<p className="text-3xl font-bold text-blue-600">
								{totalUnit.toLocaleString("id-ID")}
							</p>
							<p className="text-xs text-gray-400 mt-0.5">unit</p>
						</div>
						<div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
							<p className="text-xs text-gray-500 mb-1">Total Omset</p>
							<p className="text-xl font-bold text-purple-600">
								{formatRupiah(totalOmset)}
							</p>
						</div>
						{isSuperAdmin && (
							<div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
								<p className="text-xs text-gray-500 mb-1">Total Laba</p>
								<p className="text-xl font-bold text-green-600">
									{formatRupiah(totalLaba)}
								</p>
							</div>
						)}
					</div>

					{/* Chart */}
					<div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 mb-6">
						<h2 className="text-base font-semibold text-gray-900 mb-5">
							Top {Math.min(10, sorted.length)} Produk —{" "}
							<span className="text-indigo-600">
								{VIEW_CONFIG[view].chartLabel}
							</span>
						</h2>
						<ResponsiveContainer
							width="100%"
							height={Math.min(10, sorted.length) * 46 + 24}>
							<BarChart
								data={chartTop10}
								layout="vertical"
								margin={{ left: 12, right: 32, top: 0, bottom: 0 }}>
								<XAxis
									type="number"
									tick={{ fontSize: 11 }}
									tickFormatter={(v) =>
										view === "unit"
											? String(v)
											: v >= 1000
												? `${(v / 1000).toFixed(0)}jt`
												: `${v}rb`
									}
								/>
								<YAxis
									type="category"
									dataKey="nama"
									width={145}
									tick={{ fontSize: 12 }}
								/>
								<Tooltip
									formatter={(v: number) =>
										view === "unit" ? `${v} unit` : formatRupiah(v * 1000)
									}
								/>
								<Bar dataKey="value" radius={[0, 6, 6, 0]}>
									{chartTop10.map((_, i) => (
										<Cell key={i} fill={BAR_COLORS[i % BAR_COLORS.length]} />
									))}
								</Bar>
							</BarChart>
						</ResponsiveContainer>
					</div>

					{/* Table */}
					<div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
						<div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
							<Package size={16} className="text-indigo-500" />
							<h2 className="text-base font-semibold text-gray-900">
								Top {sorted.length} Produk — {VIEW_CONFIG[view].label}
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
											Produk
										</th>
										<th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">
											Kategori
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
										{isSuperAdmin && (
											<th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">
												Total Laba
											</th>
										)}
									</tr>
								</thead>
								<tbody className="divide-y divide-gray-50">
									{sorted.map((p, i) => (
										<tr
											key={p.id}
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
												{p.nama}
											</td>
											<td className="px-4 py-3 text-xs text-gray-500">
												{p.kategori || <span className="text-gray-300">—</span>}
											</td>
											<td className="px-4 py-3 text-center text-gray-500">
												{p.jumlah_transaksi}x
											</td>
											<td className="px-4 py-3 text-right font-medium text-gray-900">
												{p.total_unit.toLocaleString("id-ID")}{" "}
												<span className="text-gray-400 text-xs font-normal">
													{p.satuan}
												</span>
											</td>
											<td className="px-4 py-3 text-right font-semibold text-indigo-600">
												{formatRupiah(p.total_omset)}
											</td>
											{isSuperAdmin && (
												<td className="px-4 py-3 text-right font-semibold text-green-600">
													{formatRupiah(p.total_laba)}
												</td>
											)}
										</tr>
									))}
								</tbody>
								<tfoot className="border-t-2 border-gray-200 bg-gray-50/80">
									<tr>
										<td
											colSpan={4}
											className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">
											Total semua produk
										</td>
										<td className="px-4 py-3 text-right font-bold text-gray-900">
											{totalUnit.toLocaleString("id-ID")}{" "}
											<span className="text-gray-400 text-xs font-normal">
												unit
											</span>
										</td>
										<td className="px-4 py-3 text-right font-bold text-indigo-600">
											{formatRupiah(totalOmset)}
										</td>
										{isSuperAdmin && (
											<td className="px-4 py-3 text-right font-bold text-green-600">
												{formatRupiah(totalLaba)}
											</td>
										)}
									</tr>
								</tfoot>
							</table>
						</div>
					</div>
				</>
			)}
		</div>
	);
}
