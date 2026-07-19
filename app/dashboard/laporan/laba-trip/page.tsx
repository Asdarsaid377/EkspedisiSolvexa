"use client";

import { Fragment, useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { formatRupiah, formatDateOnly } from "@/lib/utils";
import { MANIFEST_BIAYA_KATEGORI_CFG } from "@/lib/pengirimanConstants";
import { ManifestBiayaKategori } from "@/lib/types";
import Link from "next/link";
import {
	TrendingUp,
	TrendingDown,
	Wallet,
	Package,
	ChevronDown,
	ChevronRight,
} from "lucide-react";

const LAP_ROLES = ["superadmin", "keuangan"];

const STATUS_CFG: Record<string, { label: string; color: string }> = {
	draft: { label: "Draft", color: "bg-gray-100 text-gray-600" },
	berangkat: { label: "Berangkat", color: "bg-indigo-100 text-indigo-700" },
	selesai: { label: "Selesai", color: "bg-green-100 text-green-700" },
	batal: { label: "Batal", color: "bg-red-100 text-red-700" },
};

interface TripLaba {
	id: string;
	nomor_manifest: string;
	tanggal_berangkat: string | null;
	rute: string | null;
	status: string;
	armadaPlat: string | null;
	sopirNama: string | null;
	jumlahKiriman: number;
	revenue: number;
	totalBiaya: number;
	biayaPerKategori: Record<ManifestBiayaKategori, number>;
	laba: number;
	marginPercent: number | null;
}

const emptyBiayaPerKategori = (): Record<ManifestBiayaKategori, number> => ({
	uang_jalan: 0,
	bbm: 0,
	tol: 0,
	kuli: 0,
	parkir: 0,
	lainnya: 0,
});

export default function LaporanLabaTripPage() {
	const { role, loading: authLoading } = useAuth();
	const router = useRouter();
	const supabase = createClient();
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		if (!authLoading && !LAP_ROLES.includes(role ?? "")) router.replace("/dashboard");
	}, [role, authLoading, router]);

	const [filter, setFilter] = useState({ dari: "", sampai: "" });
	const [filterCabang, setFilterCabang] = useState("semua");
	const [filterStatus, setFilterStatus] = useState("semua");
	const [cabangList, setCabangList] = useState<any[]>([]);
	const [trips, setTrips] = useState<TripLaba[]>([]);
	const [expandedId, setExpandedId] = useState<string | null>(null);

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
			.from("manifest")
			.select(
				"id, nomor_manifest, tanggal_berangkat, rute, status, cabang_id, armada:armada(plat_nomor), sopir:profiles!sopir_id(name)",
			)
			.gte("tanggal_berangkat", filter.dari)
			.lte("tanggal_berangkat", filter.sampai);
		if (filterCabang !== "semua") query = query.eq("cabang_id", filterCabang);
		if (filterStatus !== "semua") query = query.eq("status", filterStatus);

		const { data: manifestRows } = await query;
		const manifests = manifestRows || [];
		const ids = manifests.map((m) => m.id);

		let itemRows: any[] = [];
		let biayaRows: any[] = [];
		if (ids.length > 0) {
			const [{ data: items }, { data: biaya }] = await Promise.all([
				supabase
					.from("manifest_item")
					.select("manifest_id, pengiriman:pengiriman(ongkir)")
					.in("manifest_id", ids),
				supabase
					.from("manifest_biaya")
					.select("manifest_id, kategori, jumlah")
					.in("manifest_id", ids),
			]);
			itemRows = items || [];
			biayaRows = biaya || [];
		}

		const result: TripLaba[] = manifests.map((m) => {
			const myItems = itemRows.filter((it) => it.manifest_id === m.id);
			const myBiaya = biayaRows.filter((b) => b.manifest_id === m.id);

			const revenue = myItems.reduce((s, it) => s + (it.pengiriman?.ongkir || 0), 0);
			const biayaPerKategori = emptyBiayaPerKategori();
			for (const b of myBiaya) {
				biayaPerKategori[b.kategori as ManifestBiayaKategori] += Number(b.jumlah);
			}
			const totalBiaya = myBiaya.reduce((s, b) => s + Number(b.jumlah), 0);
			const laba = revenue - totalBiaya;
			const marginPercent = revenue > 0 ? (laba / revenue) * 100 : null;

			return {
				id: m.id,
				nomor_manifest: m.nomor_manifest,
				tanggal_berangkat: m.tanggal_berangkat,
				rute: m.rute,
				status: m.status,
				armadaPlat: (m.armada as any)?.plat_nomor || null,
				sopirNama: (m.sopir as any)?.name || null,
				jumlahKiriman: myItems.length,
				revenue,
				totalBiaya,
				biayaPerKategori,
				laba,
				marginPercent,
			};
		});

		result.sort((a, b) => a.laba - b.laba);
		setTrips(result);
		setLoading(false);
	}, [filter, filterCabang, filterStatus, supabase]);

	useEffect(() => {
		if (!authLoading && LAP_ROLES.includes(role ?? "")) load();
	}, [authLoading, role, load]);

	if (authLoading || !LAP_ROLES.includes(role ?? "")) return null;

	const totalRevenue = trips.reduce((s, t) => s + t.revenue, 0);
	const totalBiayaSemua = trips.reduce((s, t) => s + t.totalBiaya, 0);
	const totalLaba = trips.reduce((s, t) => s + t.laba, 0);

	return (
		<div>
			<div className="flex items-center justify-between mb-6 flex-wrap gap-3">
				<div>
					<h1 className="text-2xl font-bold text-gray-900">Laporan Laba per Trip</h1>
					<p className="text-gray-500 mt-1">
						Profitabilitas tiap manifest — revenue ongkir dikurangi biaya trip
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
						onChange={(e) => setFilter((f) => ({ ...f, sampai: e.target.value }))}
						className="px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
					/>
					<select
						value={filterStatus}
						onChange={(e) => setFilterStatus(e.target.value)}
						className="px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
						<option value="semua">Semua Status</option>
						<option value="draft">Draft</option>
						<option value="berangkat">Berangkat</option>
						<option value="selesai">Selesai</option>
						<option value="batal">Batal</option>
					</select>
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

			{/* Stat cards */}
			<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
				<div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
					<div className="flex items-center justify-between mb-4">
						<p className="text-sm text-gray-500">Total Trip</p>
						<div className="bg-indigo-50 p-2 rounded-xl">
							<Package size={18} className="text-indigo-500" />
						</div>
					</div>
					<p className="text-2xl font-bold text-gray-900">{trips.length}</p>
				</div>
				<div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
					<div className="flex items-center justify-between mb-4">
						<p className="text-sm text-gray-500">Total Revenue</p>
						<div className="bg-green-50 p-2 rounded-xl">
							<TrendingUp size={18} className="text-green-500" />
						</div>
					</div>
					<p className="text-xl font-bold text-gray-900">{formatRupiah(totalRevenue)}</p>
				</div>
				<div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
					<div className="flex items-center justify-between mb-4">
						<p className="text-sm text-gray-500">Total Biaya</p>
						<div className="bg-amber-50 p-2 rounded-xl">
							<Wallet size={18} className="text-amber-500" />
						</div>
					</div>
					<p className="text-xl font-bold text-gray-900">{formatRupiah(totalBiayaSemua)}</p>
				</div>
				<div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
					<div className="flex items-center justify-between mb-4">
						<p className="text-sm text-gray-500">Total Laba</p>
						<div className={`${totalLaba < 0 ? "bg-red-50" : "bg-green-50"} p-2 rounded-xl`}>
							{totalLaba < 0 ? (
								<TrendingDown size={18} className="text-red-500" />
							) : (
								<TrendingUp size={18} className="text-green-500" />
							)}
						</div>
					</div>
					<p className={`text-xl font-bold ${totalLaba < 0 ? "text-red-600" : "text-gray-900"}`}>
						{formatRupiah(totalLaba)}
					</p>
				</div>
			</div>

			{/* Tabel per manifest */}
			<div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
				<div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
					<h2 className="font-semibold text-gray-800">Laba per Trip</h2>
					<span className="ml-auto text-sm text-gray-400">{trips.length} trip</span>
				</div>
				{loading ? (
					<div className="text-center py-12 text-gray-400">Memuat...</div>
				) : trips.length === 0 ? (
					<div className="text-center py-12 text-gray-400">
						Tidak ada manifest di periode/filter ini
					</div>
				) : (
					<table className="w-full text-sm">
						<thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
							<tr>
								<th className="text-left px-4 py-3 w-8"></th>
								<th className="text-left px-4 py-3">Manifest</th>
								<th className="text-left px-4 py-3">Rute</th>
								<th className="text-left px-4 py-3">Armada / Sopir</th>
								<th className="text-center px-4 py-3">Kiriman</th>
								<th className="text-right px-4 py-3">Revenue</th>
								<th className="text-right px-4 py-3">Biaya</th>
								<th className="text-right px-4 py-3">Laba</th>
								<th className="text-right px-4 py-3">Margin</th>
							</tr>
						</thead>
						<tbody className="divide-y divide-gray-50">
							{trips.map((t) => {
								const st = STATUS_CFG[t.status] || STATUS_CFG.draft;
								const isExpanded = expandedId === t.id;
								const breakdownAktif = (
									Object.keys(t.biayaPerKategori) as ManifestBiayaKategori[]
								).filter((k) => t.biayaPerKategori[k] > 0);
								return (
									<Fragment key={t.id}>
										<tr
											onClick={() => setExpandedId(isExpanded ? null : t.id)}
											className="cursor-pointer hover:bg-gray-50 transition">
											<td className="px-4 py-3.5 text-gray-400">
												{isExpanded ? (
													<ChevronDown size={14} />
												) : (
													<ChevronRight size={14} />
												)}
											</td>
											<td className="px-4 py-3.5">
												<Link
													href={`/dashboard/manifest/${t.id}`}
													onClick={(e) => e.stopPropagation()}
													className="font-mono text-xs font-medium text-indigo-600 hover:underline">
													{t.nomor_manifest}
												</Link>
												<div className="flex items-center gap-2 mt-1">
													<span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${st.color}`}>
														{st.label}
													</span>
													<span className="text-xs text-gray-400">
														{t.tanggal_berangkat ? formatDateOnly(t.tanggal_berangkat) : "-"}
													</span>
												</div>
											</td>
											<td className="px-4 py-3.5 text-gray-600">{t.rute || "-"}</td>
											<td className="px-4 py-3.5 text-gray-600">
												{t.armadaPlat || "-"}
												{t.sopirNama ? ` · ${t.sopirNama}` : ""}
											</td>
											<td className="px-4 py-3.5 text-center text-gray-600">
												{t.jumlahKiriman}
											</td>
											<td className="px-4 py-3.5 text-right text-gray-800">
												{formatRupiah(t.revenue)}
											</td>
											<td className="px-4 py-3.5 text-right text-gray-800">
												{formatRupiah(t.totalBiaya)}
											</td>
											<td
												className={`px-4 py-3.5 text-right font-bold ${t.laba < 0 ? "text-red-600" : "text-green-700"}`}>
												{formatRupiah(t.laba)}
											</td>
											<td
												className={`px-4 py-3.5 text-right font-semibold ${t.laba < 0 ? "text-red-600" : "text-green-700"}`}>
												{t.marginPercent !== null ? `${t.marginPercent.toFixed(1)}%` : "-"}
											</td>
										</tr>
										{isExpanded && (
											<tr className="bg-gray-50/70">
												<td colSpan={9} className="px-4 py-3">
													{breakdownAktif.length === 0 ? (
														<p className="text-xs text-gray-400 italic">
															Belum ada biaya dicatat untuk trip ini.
														</p>
													) : (
														<div className="flex flex-wrap gap-2">
															{breakdownAktif.map((k) => (
																<span
																	key={k}
																	className="text-xs px-2.5 py-1 rounded-full bg-white border border-gray-200 font-medium text-gray-700">
																	{MANIFEST_BIAYA_KATEGORI_CFG[k].label}:{" "}
																	<span className="font-semibold">
																		{formatRupiah(t.biayaPerKategori[k])}
																	</span>
																</span>
															))}
														</div>
													)}
												</td>
											</tr>
										)}
									</Fragment>
								);
							})}
						</tbody>
					</table>
				)}
			</div>
		</div>
	);
}
