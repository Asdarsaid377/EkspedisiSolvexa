"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AlertTriangle, Clock, CheckCircle2, PackageX } from "lucide-react";
import { JenisLayanan, MilestonePengiriman } from "@/lib/types";
import {
	getStatusKeterlambatan,
	hitungSelisihHari,
} from "@/lib/pengirimanConstants";

const LAP_ROLES = ["superadmin", "keuangan", "cs"];

interface KirimanTerlambat {
	id: string;
	nomor_faktur: string;
	nomor_resi?: string;
	penerima_kota?: string;
	petugasNama: string;
	status: "terlambat_aktif" | "terlambat_selesai";
	umurHari: number;
	estimasiHari: number;
	selisihHari: number;
}

export default function LaporanKeterlambatanPage() {
	const { role, loading: authLoading } = useAuth();
	const router = useRouter();
	const supabase = createClient();
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		if (!authLoading && !LAP_ROLES.includes(role ?? "")) router.replace("/dashboard");
	}, [role, authLoading, router]);

	const [filter, setFilter] = useState({ dari: "", sampai: "" });
	const [filterJenis, setFilterJenis] = useState<"semua" | JenisLayanan>("semua");
	const [cabangList, setCabangList] = useState<any[]>([]);
	const [filterCabang, setFilterCabang] = useState("semua");

	const [rows, setRows] = useState<KirimanTerlambat[]>([]);
	const [onTimeCount, setOnTimeCount] = useState(0);
	const [terlambatSelesaiCount, setTerlambatSelesaiCount] = useState(0);
	const [terlambatAktifCount, setTerlambatAktifCount] = useState(0);

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
				"id, nomor_faktur, nomor_resi, tanggal, jenis_layanan, milestone, estimasi_hari, penerima_kota, petugas_id, petugas_nama, petugas:profiles!petugas_id(name)",
			)
			.not("estimasi_hari", "is", null)
			.gte("tanggal", filter.dari)
			.lte("tanggal", filter.sampai + "T23:59:59");
		if (filterCabang !== "semua") query = query.eq("cabang_id", filterCabang);
		if (filterJenis !== "semua") query = query.eq("jenis_layanan", filterJenis);

		const { data } = await query;
		const list = data || [];

		const idsSelesai = list.filter((r) => r.milestone === "selesai").map((r) => r.id);
		let waktuSelesaiMap: Record<string, string> = {};
		if (idsSelesai.length > 0) {
			const { data: tracking } = await supabase
				.from("pengiriman_tracking")
				.select("pengiriman_id, created_at")
				.eq("milestone", "selesai")
				.in("pengiriman_id", idsSelesai)
				.order("created_at", { ascending: true });
			for (const t of tracking || []) {
				if (!waktuSelesaiMap[t.pengiriman_id]) waktuSelesaiMap[t.pengiriman_id] = t.created_at;
			}
		}

		let onTime = 0;
		let terlambatSelesai = 0;
		let terlambatAktif = 0;
		const terlambatRows: KirimanTerlambat[] = [];

		for (const r of list) {
			const estimasiHari = r.estimasi_hari as number;
			const waktuSelesai = waktuSelesaiMap[r.id] || null;
			const status = getStatusKeterlambatan({
				tanggal: r.tanggal,
				estimasiHari,
				milestone: r.milestone as MilestonePengiriman,
				waktuSelesai,
			});

			if (status === "on_time") onTime++;
			if (status === "terlambat_selesai") terlambatSelesai++;
			if (status === "terlambat_aktif") terlambatAktif++;

			if (status === "terlambat_aktif" || status === "terlambat_selesai") {
				const referensi = status === "terlambat_selesai" ? waktuSelesai! : new Date();
				const selisihHari = hitungSelisihHari(r.tanggal, estimasiHari, referensi);
				terlambatRows.push({
					id: r.id,
					nomor_faktur: r.nomor_faktur,
					nomor_resi: r.nomor_resi,
					penerima_kota: r.penerima_kota,
					petugasNama: r.petugas_id
						? (r.petugas as any)?.name || "-"
						: r.petugas_nama || "-",
					status,
					estimasiHari,
					selisihHari,
					umurHari: selisihHari + estimasiHari,
				});
			}
		}

		terlambatRows.sort((a, b) => b.selisihHari - a.selisihHari);

		setOnTimeCount(onTime);
		setTerlambatSelesaiCount(terlambatSelesai);
		setTerlambatAktifCount(terlambatAktif);
		setRows(terlambatRows);
		setLoading(false);
	}, [filter, filterCabang, filterJenis]);

	useEffect(() => {
		load();
	}, [load]);

	if (authLoading || !LAP_ROLES.includes(role ?? "")) return null;

	const totalSelesaiEligible = onTimeCount + terlambatSelesaiCount;
	const onTimeRate =
		totalSelesaiEligible > 0 ? Math.round((onTimeCount / totalSelesaiEligible) * 100) : null;

	return (
		<div>
			<div className="flex items-center justify-between mb-6 flex-wrap gap-3">
				<div>
					<h1 className="text-2xl font-bold text-gray-900">Laporan Keterlambatan</h1>
					<p className="text-gray-500 mt-1">
						Kiriman yang melewati estimasi hari pengantaran
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
						value={filterJenis}
						onChange={(e) => setFilterJenis(e.target.value as any)}
						className="px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
						<option value="semua">Semua Jenis Layanan</option>
						<option value="reguler">Reguler</option>
						<option value="express">Express</option>
						<option value="kargo">Kargo</option>
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
			<div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
				<div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
					<div className="flex items-center justify-between mb-4">
						<p className="text-sm text-gray-500">Terlambat Aktif</p>
						<div className={`${terlambatAktifCount > 0 ? "bg-red-50" : "bg-gray-50"} p-2 rounded-xl`}>
							<PackageX size={18} className={terlambatAktifCount > 0 ? "text-red-500" : "text-gray-400"} />
						</div>
					</div>
					<p className="text-2xl font-bold text-gray-900">{terlambatAktifCount}</p>
				</div>
				<div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
					<div className="flex items-center justify-between mb-4">
						<p className="text-sm text-gray-500">Terlambat Selesai</p>
						<div className={`${terlambatSelesaiCount > 0 ? "bg-orange-50" : "bg-gray-50"} p-2 rounded-xl`}>
							<Clock size={18} className={terlambatSelesaiCount > 0 ? "text-orange-500" : "text-gray-400"} />
						</div>
					</div>
					<p className="text-2xl font-bold text-gray-900">{terlambatSelesaiCount}</p>
				</div>
				<div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
					<div className="flex items-center justify-between mb-4">
						<p className="text-sm text-gray-500">On-time Rate Keseluruhan</p>
						<div className="bg-green-50 p-2 rounded-xl">
							<CheckCircle2 size={18} className="text-green-500" />
						</div>
					</div>
					<p className="text-2xl font-bold text-gray-900">
						{onTimeRate === null ? "-" : `${onTimeRate}%`}
					</p>
				</div>
			</div>

			{/* Table */}
			<div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
				<div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
					<AlertTriangle size={16} className="text-red-500" />
					<h2 className="font-semibold text-gray-800">Kiriman Terlambat</h2>
					<span className="ml-auto text-sm text-gray-400">{rows.length} kiriman</span>
				</div>
				{loading ? (
					<div className="text-center py-12 text-gray-400">Memuat data...</div>
				) : rows.length === 0 ? (
					<div className="text-center py-12 text-gray-400">
						Tidak ada kiriman terlambat di periode ini
					</div>
				) : (
					<table className="w-full text-sm">
						<thead className="bg-gray-50 border-b border-gray-100">
							<tr>
								<th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Resi</th>
								<th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Penerima Kota</th>
								<th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Petugas</th>
								<th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
								<th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Umur vs Estimasi</th>
								<th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Selisih Hari</th>
							</tr>
						</thead>
						<tbody className="divide-y divide-gray-50">
							{rows.map((r) => (
								<tr key={r.id} className="hover:bg-gray-50">
									<td className="px-4 py-3.5">
										<Link
											href={`/dashboard/pengiriman/${r.id}`}
											className="font-mono text-xs font-medium text-indigo-600 hover:underline">
											{r.nomor_resi || r.nomor_faktur}
										</Link>
									</td>
									<td className="px-4 py-3.5 text-gray-600">{r.penerima_kota || "-"}</td>
									<td className="px-4 py-3.5 text-gray-600">{r.petugasNama}</td>
									<td className="px-4 py-3.5 text-center">
										<span
											className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
												r.status === "terlambat_aktif"
													? "bg-red-100 text-red-700"
													: "bg-orange-100 text-orange-700"
											}`}>
											{r.status === "terlambat_aktif" ? "Aktif" : "Selesai"}
										</span>
									</td>
									<td className="px-4 py-3.5 text-center text-gray-600">
										{r.umurHari} hari{" "}
										<span className="text-gray-400">/ estimasi {r.estimasiHari} hari</span>
									</td>
									<td className="px-4 py-3.5 text-center">
										<span className="font-bold text-red-600">+{r.selisihHari} hari</span>
									</td>
								</tr>
							))}
						</tbody>
					</table>
				)}
			</div>
		</div>
	);
}
