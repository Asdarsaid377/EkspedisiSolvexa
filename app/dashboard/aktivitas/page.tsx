"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { formatDate } from "@/lib/utils";
import { ClipboardList, ChevronDown, ChevronRight } from "lucide-react";
import { AksiLog } from "@/lib/aktivitas";

const AKTIVITAS_ROLES = ["superadmin", "keuangan"];

const AKSI_CFG: Record<AksiLog, { label: string; color: string }> = {
	delete_pengiriman: { label: "Hapus Pengiriman", color: "bg-red-100 text-red-700" },
	rollback_pembayaran: { label: "Rollback Pembayaran", color: "bg-orange-100 text-orange-700" },
	approve_klaim: { label: "Setujui Klaim", color: "bg-green-100 text-green-700" },
	tolak_klaim: { label: "Tolak Klaim", color: "bg-red-100 text-red-700" },
	edit_setoran_cod: { label: "Edit Setoran COD", color: "bg-blue-100 text-blue-700" },
	hapus_setoran_cod: { label: "Hapus Setoran COD", color: "bg-red-100 text-red-700" },
	edit_tarif: { label: "Edit Tarif", color: "bg-blue-100 text-blue-700" },
	hapus_tarif: { label: "Hapus Tarif", color: "bg-red-100 text-red-700" },
	edit_biaya_trip: { label: "Edit Biaya Trip", color: "bg-blue-100 text-blue-700" },
	hapus_biaya_trip: { label: "Hapus Biaya Trip", color: "bg-red-100 text-red-700" },
	konfirmasi_booking: { label: "Konfirmasi Booking", color: "bg-green-100 text-green-700" },
	tolak_booking: { label: "Tolak Booking", color: "bg-red-100 text-red-700" },
};

interface LogRow {
	id: string;
	aksi: AksiLog;
	entitas: string;
	entitas_id: string | null;
	ref: string | null;
	detail: Record<string, any> | null;
	created_by: string | null;
	created_at: string;
}

// Hanya entitas dgn detail route yg stabil yang dapat link — sisanya tampil
// sbg teks biasa (mis. klaim/tarif_zona/manifest_biaya tidak punya halaman
// detail per-id, cuma list+modal).
function getEntitasLink(row: LogRow): string | null {
	if (row.entitas === "pengiriman" && row.entitas_id) {
		return `/dashboard/pengiriman/${row.entitas_id}`;
	}
	return null;
}

export default function AktivitasPage() {
	const { role, loading: authLoading } = useAuth();
	const router = useRouter();
	const supabase = createClient();

	useEffect(() => {
		if (!authLoading && !AKTIVITAS_ROLES.includes(role ?? "")) router.replace("/dashboard");
	}, [role, authLoading, router]);

	const [loading, setLoading] = useState(true);
	const [rows, setRows] = useState<LogRow[]>([]);
	const [stafList, setStafList] = useState<{ id: string; name: string }[]>([]);
	const [expandedId, setExpandedId] = useState<string | null>(null);

	const [filter, setFilter] = useState({ dari: "", sampai: "" });
	const [filterAksi, setFilterAksi] = useState<"semua" | AksiLog>("semua");
	const [filterStaf, setFilterStaf] = useState("semua");

	useEffect(() => {
		supabase
			.rpc("get_staf_aktivitas")
			.then(({ data }) => setStafList(data || []));
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	const load = useCallback(async () => {
		setLoading(true);
		let query = supabase
			.from("aktivitas_log")
			.select("*")
			.order("created_at", { ascending: false })
			.limit(500);

		if (filterAksi !== "semua") query = query.eq("aksi", filterAksi);
		if (filterStaf !== "semua") query = query.eq("created_by", filterStaf);
		if (filter.dari) query = query.gte("created_at", filter.dari);
		if (filter.sampai) query = query.lte("created_at", filter.sampai + "T23:59:59");

		const { data } = await query;
		setRows(data || []);
		setLoading(false);
	}, [filter, filterAksi, filterStaf]);

	useEffect(() => {
		load();
	}, [load]);

	if (authLoading || !AKTIVITAS_ROLES.includes(role ?? "")) return null;

	const stafName = (id: string | null) =>
		(id && stafList.find((s) => s.id === id)?.name) || "-";

	return (
		<div>
			<div className="flex items-center justify-between mb-6 flex-wrap gap-3">
				<div>
					<h1 className="text-2xl font-bold text-gray-900">Log Aktivitas</h1>
					<p className="text-gray-500 mt-1">
						Riwayat aksi sensitif — hapus/rollback/approve/edit data finansial
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
						value={filterAksi}
						onChange={(e) => setFilterAksi(e.target.value as any)}
						className="px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
						<option value="semua">Semua Aksi</option>
						{Object.entries(AKSI_CFG).map(([key, cfg]) => (
							<option key={key} value={key}>
								{cfg.label}
							</option>
						))}
					</select>
					<select
						value={filterStaf}
						onChange={(e) => setFilterStaf(e.target.value)}
						className="px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
						<option value="semua">Semua Staf</option>
						{stafList.map((s) => (
							<option key={s.id} value={s.id}>
								{s.name}
							</option>
						))}
					</select>
				</div>
			</div>

			<div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
				<div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
					<ClipboardList size={16} className="text-indigo-500" />
					<h2 className="font-semibold text-gray-800">Riwayat Aktivitas</h2>
					<span className="ml-auto text-sm text-gray-400">{rows.length} baris</span>
				</div>
				{loading ? (
					<div className="text-center py-12 text-gray-400">Memuat data...</div>
				) : rows.length === 0 ? (
					<div className="text-center py-12 text-gray-400">
						Tidak ada aktivitas pada rentang/filter ini
					</div>
				) : (
					<table className="w-full text-sm">
						<thead className="bg-gray-50 border-b border-gray-100">
							<tr>
								<th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Waktu</th>
								<th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Staf</th>
								<th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Aksi</th>
								<th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Ref</th>
								<th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Detail</th>
							</tr>
						</thead>
						<tbody className="divide-y divide-gray-50">
							{rows.map((r) => {
								const link = getEntitasLink(r);
								const isExpanded = expandedId === r.id;
								return (
									<>
										<tr key={r.id} className="hover:bg-gray-50">
											<td className="px-4 py-3.5 text-gray-600 whitespace-nowrap">
												{formatDate(r.created_at)}
											</td>
											<td className="px-4 py-3.5 text-gray-700">{stafName(r.created_by)}</td>
											<td className="px-4 py-3.5">
												<span
													className={`text-xs px-2 py-0.5 rounded-full font-semibold ${AKSI_CFG[r.aksi]?.color || "bg-gray-100 text-gray-700"}`}>
													{AKSI_CFG[r.aksi]?.label || r.aksi}
												</span>
											</td>
											<td className="px-4 py-3.5 text-gray-600">
												{link ? (
													<Link
														href={link}
														className="font-mono text-xs font-medium text-indigo-600 hover:underline">
														{r.ref || "-"}
													</Link>
												) : (
													<span className="font-mono text-xs">{r.ref || "-"}</span>
												)}
											</td>
											<td className="px-4 py-3.5 text-center">
												{r.detail && (
													<button
														onClick={() => setExpandedId(isExpanded ? null : r.id)}
														className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-500 transition inline-flex items-center gap-1">
														{isExpanded ? (
															<ChevronDown size={14} />
														) : (
															<ChevronRight size={14} />
														)}
													</button>
												)}
											</td>
										</tr>
										{isExpanded && r.detail && (
											<tr key={`${r.id}-detail`} className="bg-gray-50">
												<td colSpan={5} className="px-4 py-3">
													<pre className="text-xs bg-white border border-gray-100 rounded-xl p-3 overflow-x-auto text-gray-600">
														{JSON.stringify(r.detail, null, 2)}
													</pre>
												</td>
											</tr>
										)}
									</>
								);
							})}
						</tbody>
					</table>
				)}
			</div>
		</div>
	);
}
