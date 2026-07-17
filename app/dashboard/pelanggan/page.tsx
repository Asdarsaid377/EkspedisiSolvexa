"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { formatRupiah, waLink } from "@/lib/utils";
import {
	Search,
	X,
	Users,
	Phone,
	ChevronDown,
	ChevronRight,
	User,
	Star,
	AlertCircle,
	MessageSquare,
	Wallet,
	CalendarClock,
	CheckCircle2,
	StickyNote,
	UserPlus,
	Repeat,
	Crown,
	ShieldAlert,
} from "lucide-react";

type Tag = "reguler" | "vip" | "prospek" | "waspada";

const TAG_CONFIG: Record<Tag, { label: string; color: string; icon: any }> = {
	reguler: { label: "Reguler", color: "bg-gray-100 text-gray-600", icon: User },
	vip: { label: "VIP", color: "bg-amber-100 text-amber-700", icon: Crown },
	prospek: { label: "Prospek", color: "bg-blue-100 text-blue-700", icon: UserPlus },
	waspada: { label: "Perlu Perhatian", color: "bg-red-100 text-red-600", icon: ShieldAlert },
};

const HARI_DORMANT = 90; // dianggap "sudah lama tidak beli" kalau > 90 hari

interface Transaksi {
	id: string;
	nomor_faktur: string;
	tanggal: string;
	total_harga_jual: number;
	uang_dp: number;
	status_bayar: string;
	milestone: string;
}

interface CRMRecord {
	id: string;
	tag: Tag;
	catatan: string | null;
	follow_up_at: string | null;
	follow_up_selesai: boolean;
}

interface CustomerStat {
	key: string;
	nama: string;
	telepon: string;
	reseller_id: string;
	reseller_nama: string;
	transaksi: Transaksi[];
	total_belanja: number;
	belum_lunas: number;
	last_purchase: string;
	komplain_belum_resolve: number;
	crm: CRMRecord | null;
}

interface ResellerGroup {
	reseller_id: string;
	reseller_nama: string;
	customers: CustomerStat[];
}

function segmen(jumlahTransaksi: number): { label: string; color: string; icon: any } {
	if (jumlahTransaksi <= 1) return { label: "Baru", color: "bg-blue-100 text-blue-700", icon: UserPlus };
	if (jumlahTransaksi >= 5) return { label: "Loyal", color: "bg-purple-100 text-purple-700", icon: Crown };
	return { label: "Repeat", color: "bg-green-100 text-green-700", icon: Repeat };
}

function isDormant(lastPurchase: string) {
	const diffHari = (Date.now() - new Date(lastPurchase).getTime()) / 86400000;
	return diffHari > HARI_DORMANT;
}

function perluDitindaklanjuti(c: CustomerStat) {
	const followUpDue =
		!!c.crm?.follow_up_at && !c.crm.follow_up_selesai && c.crm.follow_up_at <= new Date().toISOString().split("T")[0];
	return followUpDue || c.komplain_belum_resolve > 0;
}

export default function PelangganPage() {
	const { profile } = useAuth();
	const supabase = createClient();
	const [loading, setLoading] = useState(true);
	const [resellerGroups, setResellerGroups] = useState<ResellerGroup[]>([]);
	const [search, setSearch] = useState("");
	const [filterReseller, setFilterReseller] = useState("");
	const [filterTag, setFilterTag] = useState<"semua" | Tag>("semua");
	const [filterTindakLanjut, setFilterTindakLanjut] = useState(false);
	const [expandedResellers, setExpandedResellers] = useState<Set<string>>(new Set());
	const [totalCustomer, setTotalCustomer] = useState(0);

	// Detail / CRM modal
	const [detail, setDetail] = useState<CustomerStat | null>(null);
	const [catatanDraft, setCatatanDraft] = useState("");
	const [followUpDraft, setFollowUpDraft] = useState("");
	const [savingCrm, setSavingCrm] = useState(false);

	const load = useCallback(async () => {
		setLoading(true);

		const [{ data: penjualan }, { data: reviews }, { data: crmRows }] = await Promise.all([
			supabase
				.from("penjualan")
				.select(
					"id, nomor_faktur, nama_customer, telepon_customer, reseller_id, reseller:resellers(nama), total_harga_jual, uang_dp, status_bayar, milestone, tanggal",
				)
				.not("nama_customer", "is", null)
				.neq("nama_customer", "")
				.order("tanggal", { ascending: false }),
			supabase
				.from("reseller_reviews")
				.select("id, resolved, tipe, penjualan:penjualan(nama_customer, telepon_customer, reseller_id)")
				.eq("tipe", "komplain")
				.eq("resolved", false),
			supabase.from("pelanggan_crm").select("*"),
		]);

		const crmMap: Record<string, CRMRecord> = {};
		(crmRows || []).forEach((r: any) => {
			crmMap[r.pelanggan_key] = {
				id: r.id,
				tag: r.tag ?? "reguler",
				catatan: r.catatan,
				follow_up_at: r.follow_up_at,
				follow_up_selesai: r.follow_up_selesai,
			};
		});

		const keyOf = (nama: string | null, telepon: string | null, resellerId: string | null) =>
			`${(telepon || nama || "").trim()}__${resellerId || ""}`;

		const komplainCount: Record<string, number> = {};
		(reviews || []).forEach((r: any) => {
			const p = r.penjualan;
			if (!p) return;
			const key = keyOf(p.nama_customer, p.telepon_customer, p.reseller_id);
			komplainCount[key] = (komplainCount[key] || 0) + 1;
		});

		const map: Record<string, CustomerStat> = {};
		for (const p of penjualan || []) {
			const key = keyOf(p.nama_customer as string, p.telepon_customer as string, p.reseller_id as string);
			if (!map[key]) {
				map[key] = {
					key,
					nama: (p.nama_customer as string).trim(),
					telepon: (p.telepon_customer as string) || "",
					reseller_id: (p.reseller_id as string) || "",
					reseller_nama: (p.reseller as any)?.nama || "Tanpa Reseller",
					transaksi: [],
					total_belanja: 0,
					belum_lunas: 0,
					last_purchase: p.tanggal as string,
					komplain_belum_resolve: komplainCount[key] || 0,
					crm: crmMap[key] || null,
				};
			}
			map[key].transaksi.push({
				id: p.id as string,
				nomor_faktur: p.nomor_faktur as string,
				tanggal: p.tanggal as string,
				total_harga_jual: p.total_harga_jual as number,
				uang_dp: (p.uang_dp as number) || 0,
				status_bayar: p.status_bayar as string,
				milestone: p.milestone as string,
			});
			map[key].total_belanja += (p.total_harga_jual as number) || 0;
			if (p.status_bayar !== "lunas") {
				map[key].belum_lunas += ((p.total_harga_jual as number) || 0) - ((p.uang_dp as number) || 0);
			}
			if ((p.tanggal as string) > map[key].last_purchase) {
				map[key].last_purchase = p.tanggal as string;
			}
		}

		const allCustomers = Object.values(map).sort((a, b) => b.last_purchase.localeCompare(a.last_purchase));

		const groupMap: Record<string, ResellerGroup> = {};
		for (const c of allCustomers) {
			const key = c.reseller_id || "__umum";
			if (!groupMap[key]) {
				groupMap[key] = { reseller_id: c.reseller_id, reseller_nama: c.reseller_nama, customers: [] };
			}
			groupMap[key].customers.push(c);
		}

		const groups = Object.values(groupMap).sort((a, b) => b.customers.length - a.customers.length);

		setResellerGroups(groups);
		setTotalCustomer(allCustomers.length);
		setExpandedResellers(new Set(groups.map((g) => g.reseller_id || "__umum")));
		setLoading(false);
	}, []);

	useEffect(() => {
		load();
	}, [load]);

	const allCustomersFlat = useMemo(() => resellerGroups.flatMap((g) => g.customers), [resellerGroups]);

	const stats = useMemo(() => {
		const baru = allCustomersFlat.filter((c) => c.transaksi.length <= 1).length;
		const vip = allCustomersFlat.filter((c) => c.crm?.tag === "vip").length;
		const perluTindakLanjut = allCustomersFlat.filter(perluDitindaklanjuti).length;
		return { baru, vip, perluTindakLanjut };
	}, [allCustomersFlat]);

	const toggleExpand = (key: string) => {
		setExpandedResellers((prev) => {
			const next = new Set(prev);
			if (next.has(key)) next.delete(key);
			else next.add(key);
			return next;
		});
	};

	const resellerList = resellerGroups.map((g) => g.reseller_nama);

	const filteredGroups = resellerGroups
		.filter((g) => !filterReseller || g.reseller_nama === filterReseller)
		.map((g) => ({
			...g,
			customers: g.customers.filter((c) => {
				if (filterTag !== "semua" && (c.crm?.tag ?? "reguler") !== filterTag) return false;
				if (filterTindakLanjut && !perluDitindaklanjuti(c)) return false;
				if (!search) return true;
				const s = search.toLowerCase();
				return c.nama.toLowerCase().includes(s) || c.telepon.toLowerCase().includes(s);
			}),
		}))
		.filter((g) => g.customers.length > 0);

	const totalFiltered = filteredGroups.reduce((s, g) => s + g.customers.length, 0);

	const openDetail = (c: CustomerStat) => {
		setDetail(c);
		setCatatanDraft(c.crm?.catatan || "");
		setFollowUpDraft(c.crm?.follow_up_at || "");
	};

	const upsertCrm = async (fields: Partial<{ tag: Tag; catatan: string | null; follow_up_at: string | null; follow_up_selesai: boolean }>) => {
		if (!detail) return;
		setSavingCrm(true);
		if (detail.crm?.id) {
			await supabase
				.from("pelanggan_crm")
				.update({ ...fields, updated_at: new Date().toISOString() })
				.eq("id", detail.crm.id);
		} else {
			await supabase.from("pelanggan_crm").insert({
				pelanggan_key: detail.key,
				nama: detail.nama,
				telepon: detail.telepon || null,
				reseller_id: detail.reseller_id || null,
				tag: "reguler",
				...fields,
				created_by: profile?.id,
			});
		}
		await load();
		setSavingCrm(false);
	};

	// Sinkronkan modal detail dengan data terbaru setelah reload
	useEffect(() => {
		if (!detail) return;
		const fresh = allCustomersFlat.find((c) => c.key === detail.key);
		if (fresh) setDetail(fresh);
	}, [resellerGroups]); // eslint-disable-line react-hooks/exhaustive-deps

	return (
		<div>
			{/* ── Header ── */}
			<div className="flex items-start justify-between gap-3 mb-6 flex-wrap">
				<div>
					<h1 className="text-2xl font-bold text-gray-900">Pelanggan</h1>
					<p className="text-gray-500 mt-1">CRM mini — kelola tag, catatan, dan tindak lanjut customer</p>
				</div>
				<div className="flex items-center gap-2 bg-indigo-50 border border-indigo-100 rounded-2xl px-4 py-2.5">
					<Users size={16} className="text-indigo-500" />
					<span className="text-sm font-bold text-indigo-700">{totalCustomer}</span>
					<span className="text-sm text-indigo-500">customer</span>
				</div>
			</div>

			{/* ── Stat cards ── */}
			<div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
				<div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
					<div className="w-9 h-9 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center mb-2">
						<UserPlus size={18} />
					</div>
					<p className="text-2xl font-bold text-gray-900">{stats.baru}</p>
					<p className="text-sm text-gray-500 mt-0.5">Customer Baru</p>
				</div>
				<div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
					<div className="w-9 h-9 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center mb-2">
						<Crown size={18} />
					</div>
					<p className="text-2xl font-bold text-gray-900">{stats.vip}</p>
					<p className="text-sm text-gray-500 mt-0.5">Tag VIP</p>
				</div>
				<button
					onClick={() => setFilterTindakLanjut((v) => !v)}
					className={`bg-white rounded-2xl p-4 shadow-sm border text-left transition hover:shadow-md ${
						filterTindakLanjut ? "border-red-300 ring-1 ring-red-300" : "border-gray-100"
					}`}>
					<div className="w-9 h-9 bg-red-50 text-red-600 rounded-xl flex items-center justify-center mb-2">
						<AlertCircle size={18} />
					</div>
					<p className="text-2xl font-bold text-gray-900">{stats.perluTindakLanjut}</p>
					<p className="text-sm text-gray-500 mt-0.5">Perlu Ditindaklanjuti</p>
				</button>
				<div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
					<div className="w-9 h-9 bg-green-50 text-green-600 rounded-xl flex items-center justify-center mb-2">
						<Repeat size={18} />
					</div>
					<p className="text-2xl font-bold text-gray-900">
						{totalCustomer > 0 ? Math.round(((totalCustomer - stats.baru) / totalCustomer) * 100) : 0}%
					</p>
					<p className="text-sm text-gray-500 mt-0.5">Repeat Rate</p>
				</div>
			</div>

			{/* ── Filter ── */}
			<div className="flex flex-wrap gap-3 mb-6">
				<div className="relative flex-1 min-w-48">
					<Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
					<input
						value={search}
						onChange={(e) => setSearch(e.target.value)}
						placeholder="Cari nama atau no. telepon customer..."
						className="w-full pl-10 pr-8 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
					/>
					{search && (
						<button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
							<X size={14} />
						</button>
					)}
				</div>
				<select
					value={filterReseller}
					onChange={(e) => setFilterReseller(e.target.value)}
					className="px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white">
					<option value="">Semua Reseller</option>
					{resellerList.map((r) => (
						<option key={r} value={r}>{r}</option>
					))}
				</select>
				<select
					value={filterTag}
					onChange={(e) => setFilterTag(e.target.value as any)}
					className="px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white">
					<option value="semua">Semua Tag</option>
					{(Object.keys(TAG_CONFIG) as Tag[]).map((t) => (
						<option key={t} value={t}>{TAG_CONFIG[t].label}</option>
					))}
				</select>
				{filterTindakLanjut && (
					<button
						onClick={() => setFilterTindakLanjut(false)}
						className="flex items-center gap-1.5 px-3 py-2.5 bg-red-50 border border-red-200 text-red-600 rounded-xl text-sm font-medium">
						<AlertCircle size={14} /> Perlu Ditindaklanjuti <X size={13} />
					</button>
				)}
			</div>

			{loading ? (
				<div className="text-center py-20 text-gray-400">Memuat data...</div>
			) : totalCustomer === 0 ? (
				<div className="bg-white rounded-2xl p-16 shadow-sm border border-gray-100 text-center">
					<User size={48} className="mx-auto text-gray-300 mb-3" />
					<p className="text-gray-500 font-medium">Belum ada data customer</p>
					<p className="text-sm text-gray-400 mt-1">Isi nama customer saat input penjualan baru untuk mulai membangun database</p>
				</div>
			) : filteredGroups.length === 0 ? (
				<div className="text-center py-16 text-gray-400">Tidak ada customer yang cocok</div>
			) : (
				<div className="space-y-4">
					{(search || filterReseller || filterTag !== "semua" || filterTindakLanjut) && (
						<p className="text-sm text-gray-500">
							Menampilkan <span className="font-semibold text-gray-700">{totalFiltered}</span> customer dari {totalCustomer} total
						</p>
					)}

					{filteredGroups.map((group) => {
						const key = group.reseller_id || "__umum";
						const isExpanded = expandedResellers.has(key);
						const totalGroupBelanja = group.customers.reduce((s, c) => s + c.total_belanja, 0);
						const totalGroupTranaksi = group.customers.reduce((s, c) => s + c.transaksi.length, 0);

						return (
							<div key={key} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
								<button
									onClick={() => toggleExpand(key)}
									className="w-full flex items-center justify-between px-6 py-4 hover:bg-gray-50 transition text-left">
									<div className="flex items-center gap-3">
										<div className="w-9 h-9 rounded-xl bg-indigo-100 flex items-center justify-center flex-shrink-0">
											<Users size={16} className="text-indigo-600" />
										</div>
										<div>
											<p className="font-semibold text-gray-900">{group.reseller_nama}</p>
											<p className="text-xs text-gray-400 mt-0.5">
												{group.customers.length} customer · {totalGroupTranaksi} transaksi · {formatRupiah(totalGroupBelanja)}
											</p>
										</div>
									</div>
									<div className="flex items-center gap-3">
										<span className="text-xs font-bold bg-indigo-600 text-white px-2.5 py-1 rounded-full">
											{group.customers.length}
										</span>
										{isExpanded ? <ChevronDown size={16} className="text-gray-400" /> : <ChevronRight size={16} className="text-gray-400" />}
									</div>
								</button>

								{isExpanded && (
									<div className="border-t border-gray-100">
										<table className="w-full text-sm">
											<thead className="bg-gray-50">
												<tr>
													<th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Nama Customer</th>
													<th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">No. Telepon</th>
													<th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
													<th className="text-center px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Transaksi</th>
													<th className="text-right px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Total Belanja</th>
													<th className="text-right px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Terakhir Beli</th>
												</tr>
											</thead>
											<tbody className="divide-y divide-gray-50">
												{group.customers.map((c) => {
													const seg = segmen(c.transaksi.length);
													const dormant = isDormant(c.last_purchase);
													const tag = TAG_CONFIG[c.crm?.tag ?? "reguler"];
													const perluTL = perluDitindaklanjuti(c);
													return (
														<tr
															key={c.key}
															onClick={() => openDetail(c)}
															className="hover:bg-indigo-50/30 transition cursor-pointer">
															<td className="px-6 py-3.5">
																<div className="flex items-center gap-2.5">
																	<div className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
																		{c.nama.charAt(0).toUpperCase()}
																	</div>
																	<span className="font-medium text-gray-900">{c.nama}</span>
																</div>
															</td>
															<td className="px-6 py-3.5">
																{c.telepon ? (
																	<a
																		href={waLink(c.telepon)}
																		target="_blank"
																		rel="noopener noreferrer"
																		onClick={(e) => e.stopPropagation()}
																		className="flex items-center gap-1.5 text-green-600 hover:text-green-800 font-medium transition">
																		<Phone size={13} />
																		{c.telepon}
																	</a>
																) : (
																	<span className="text-gray-300 text-xs">—</span>
																)}
															</td>
															<td className="px-6 py-3.5">
																<div className="flex items-center gap-1.5 flex-wrap">
																	<span className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-semibold ${seg.color}`}>
																		<seg.icon size={10} /> {seg.label}
																	</span>
																	{(c.crm?.tag ?? "reguler") !== "reguler" && (
																		<span className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-semibold ${tag.color}`}>
																			<tag.icon size={10} /> {tag.label}
																		</span>
																	)}
																	{dormant && (
																		<span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-semibold bg-gray-100 text-gray-500">
																			Lama Tidak Beli
																		</span>
																	)}
																	{c.belum_lunas > 0 && (
																		<span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-semibold bg-orange-100 text-orange-600">
																			<Wallet size={10} /> Ada Tagihan
																		</span>
																	)}
																	{c.komplain_belum_resolve > 0 && (
																		<span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-semibold bg-red-100 text-red-600">
																			<MessageSquare size={10} /> Komplain
																		</span>
																	)}
																	{perluTL && (
																		<span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-semibold bg-red-50 text-red-500 border border-red-200">
																			<CalendarClock size={10} /> Follow-up
																		</span>
																	)}
																</div>
															</td>
															<td className="px-6 py-3.5 text-center">
																<span className="font-semibold text-gray-700">{c.transaksi.length}x</span>
															</td>
															<td className="px-6 py-3.5 text-right font-semibold text-gray-900">{formatRupiah(c.total_belanja)}</td>
															<td className="px-6 py-3.5 text-right text-xs text-gray-400">
																{new Date(c.last_purchase).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}
															</td>
														</tr>
													);
												})}
											</tbody>
										</table>
									</div>
								)}
							</div>
						);
					})}
				</div>
			)}

			{/* ── Modal Detail / CRM ── */}
			{detail && (
				<div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
					<div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl max-h-[85vh] flex flex-col">
						<div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
							<div className="flex items-center gap-3">
								<div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white font-bold flex-shrink-0">
									{detail.nama.charAt(0).toUpperCase()}
								</div>
								<div>
									<p className="font-semibold text-gray-900">{detail.nama}</p>
									<p className="text-xs text-gray-400">{detail.reseller_nama}</p>
								</div>
							</div>
							<button onClick={() => setDetail(null)} className="p-2 hover:bg-gray-100 rounded-lg">
								<X size={18} />
							</button>
						</div>

						<div className="flex-1 overflow-y-auto p-6 space-y-5">
							{/* Ringkasan */}
							<div className="grid grid-cols-3 gap-2.5">
								<div className="bg-gray-50 rounded-xl p-3 text-center">
									<p className="text-xs text-gray-400 mb-1">Transaksi</p>
									<p className="font-bold text-gray-900">{detail.transaksi.length}x</p>
								</div>
								<div className="bg-gray-50 rounded-xl p-3 text-center">
									<p className="text-xs text-gray-400 mb-1">Total Belanja</p>
									<p className="font-bold text-gray-900 text-sm">{formatRupiah(detail.total_belanja)}</p>
								</div>
								<div className={`rounded-xl p-3 text-center ${detail.belum_lunas > 0 ? "bg-orange-50" : "bg-gray-50"}`}>
									<p className="text-xs text-gray-400 mb-1">Tagihan</p>
									<p className={`font-bold text-sm ${detail.belum_lunas > 0 ? "text-orange-600" : "text-gray-400"}`}>
										{formatRupiah(detail.belum_lunas)}
									</p>
								</div>
							</div>

							{detail.telepon && (
								<a
									href={waLink(detail.telepon)}
									target="_blank"
									rel="noopener noreferrer"
									className="flex items-center justify-center gap-2 py-2.5 bg-green-50 hover:bg-green-100 text-green-700 rounded-xl text-sm font-semibold transition">
									<Phone size={14} /> Chat WhatsApp {detail.telepon}
								</a>
							)}

							{/* Tag */}
							<div>
								<p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Tag Customer</p>
								<div className="grid grid-cols-4 gap-2">
									{(Object.keys(TAG_CONFIG) as Tag[]).map((t) => {
										const cfg = TAG_CONFIG[t];
										const active = (detail.crm?.tag ?? "reguler") === t;
										return (
											<button
												key={t}
												disabled={savingCrm}
												onClick={() => upsertCrm({ tag: t })}
												className={`flex flex-col items-center gap-1 px-2 py-2.5 rounded-xl border-2 text-[11px] font-semibold transition ${
													active ? "border-indigo-500 bg-indigo-50 text-indigo-700" : "border-gray-200 text-gray-500 hover:border-gray-300"
												}`}>
												<cfg.icon size={14} />
												{cfg.label}
											</button>
										);
									})}
								</div>
							</div>

							{/* Follow-up */}
							<div>
								<p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 flex items-center gap-1.5">
									<CalendarClock size={12} /> Tindak Lanjut
								</p>
								<div className="flex items-center gap-2">
									<input
										type="date"
										value={followUpDraft}
										onChange={(e) => setFollowUpDraft(e.target.value)}
										className="flex-1 px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
									/>
									<button
										disabled={savingCrm}
										onClick={() => upsertCrm({ follow_up_at: followUpDraft || null, follow_up_selesai: false })}
										className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs font-semibold transition">
										Simpan
									</button>
								</div>
								{detail.crm?.follow_up_at && (
									<div className="flex items-center justify-between mt-2 bg-gray-50 rounded-xl px-3 py-2">
										<span className={`text-xs ${perluDitindaklanjuti(detail) ? "text-red-600 font-semibold" : "text-gray-500"}`}>
											Dijadwalkan: {new Date(detail.crm.follow_up_at).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}
											{detail.crm.follow_up_selesai && " · Selesai"}
										</span>
										{!detail.crm.follow_up_selesai && (
											<button
												disabled={savingCrm}
												onClick={() => upsertCrm({ follow_up_selesai: true })}
												className="flex items-center gap-1 text-xs text-green-600 hover:text-green-700 font-semibold">
												<CheckCircle2 size={13} /> Tandai Selesai
											</button>
										)}
									</div>
								)}
							</div>

							{/* Catatan */}
							<div>
								<p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 flex items-center gap-1.5">
									<StickyNote size={12} /> Catatan Internal
								</p>
								<textarea
									value={catatanDraft}
									onChange={(e) => setCatatanDraft(e.target.value)}
									rows={3}
									placeholder="Preferensi, riwayat komplain, atau info penting lain tentang customer ini..."
									className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
								/>
								<button
									disabled={savingCrm}
									onClick={() => upsertCrm({ catatan: catatanDraft.trim() || null })}
									className="mt-2 w-full py-2 bg-gray-100 hover:bg-gray-200 disabled:opacity-50 text-gray-700 rounded-xl text-xs font-semibold transition">
									Simpan Catatan
								</button>
							</div>

							{/* Riwayat transaksi */}
							<div>
								<p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
									Riwayat Transaksi ({detail.transaksi.length})
								</p>
								<div className="space-y-2">
									{[...detail.transaksi]
										.sort((a, b) => b.tanggal.localeCompare(a.tanggal))
										.map((t) => (
											<Link
												key={t.id}
												href={`/dashboard/penjualan/${t.id}`}
												className="flex items-center justify-between bg-gray-50 hover:bg-indigo-50 rounded-xl px-3.5 py-2.5 border border-gray-100 transition">
												<div>
													<p className="text-sm font-semibold text-indigo-600">{t.nomor_faktur}</p>
													<p className="text-xs text-gray-400">
														{new Date(t.tanggal).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}
													</p>
												</div>
												<div className="text-right">
													<p className="text-sm font-bold text-gray-900">{formatRupiah(t.total_harga_jual)}</p>
													<span
														className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${
															t.status_bayar === "lunas"
																? "bg-green-100 text-green-700"
																: t.status_bayar === "dp"
																? "bg-amber-100 text-amber-700"
																: "bg-red-100 text-red-600"
														}`}>
														{t.status_bayar === "lunas" ? "Lunas" : t.status_bayar === "dp" ? "DP" : "Belum Bayar"}
													</span>
												</div>
											</Link>
										))}
								</div>
							</div>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}
