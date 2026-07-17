"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { formatRupiah, waLink } from "@/lib/utils";
import {
	AlertTriangle,
	CheckCircle2,
	Clock,
	CheckSquare,
	ShoppingBag,
	MessageSquare,
	Users,
	UserCircle,
	Trophy,
	ChevronDown,
	ChevronRight,
	ExternalLink,
	RefreshCw,
	Loader2,
	Wallet,
	Phone,
	CreditCard,
} from "lucide-react";

// ── Helpers ────────────────────────────────────────────────
const daysSince = (dateStr: string | null): number | null => {
	if (!dateStr) return null;
	return Math.floor((Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24));
};

export default function AsistenOwnerPage() {
	const { isSuperAdmin, loading: authLoading } = useAuth();
	const router = useRouter();
	const supabase = createClient();

	const [loading, setLoading] = useState(true);

	// Data reseller belum lengkap
	const [resellerBelumLengkap, setResellerBelumLengkap] = useState<any[]>([]);
	// Pencocokan nota
	const [notaBelumCount, setNotaBelumCount] = useState(0);
	const [notaSelisih, setNotaSelisih] = useState<any[]>([]);
	// Tagihan belum lunas
	const [belumBayar, setBelumBayar] = useState<any[]>([]);
	// Komplain belum resolve
	const [komplainOpen, setKomplainOpen] = useState<any[]>([]);
	// PO mendekati/lewat estimasi
	const [poTerlambat, setPoTerlambat] = useState<any[]>([]);
	const [poMendekati, setPoMendekati] = useState<any[]>([]);
	// CRM pelanggan
	const [totalCustomer, setTotalCustomer] = useState(0);
	const [followUpDue, setFollowUpDue] = useState(0);
	// Reseller baru
	const [resellerBaru, setResellerBaru] = useState<any[]>([]);
	// Top reseller bulan ini
	const [topReseller, setTopReseller] = useState<any[]>([]);

	const [dResellerBaruOpen, setDResellerBaruOpen] = useState(false);
	const [dTopResellerOpen, setDTopResellerOpen] = useState(true);

	useEffect(() => {
		if (authLoading) return;
		if (!isSuperAdmin) {
			router.replace("/dashboard");
			return;
		}
		load();
	}, [isSuperAdmin, authLoading]);

	if (authLoading || !isSuperAdmin) return null;

	const load = async () => {
		setLoading(true);
		const now = new Date();
		const todayStr = now.toISOString().split("T")[0];
		const bulanIni = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
		const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
		const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000)
			.toISOString()
			.split("T")[0];

		const [
			resellerRes,
			notaBelumRes,
			notaSelisihRes,
			belumBayarRes,
			komplainRes,
			poAktifRes,
			customerRes,
			crmRes,
			resellerBaruRes,
			topResellerRes,
		] = await Promise.all([
			supabase
				.from("resellers")
				.select("id, nama, kota, telepon, nama_bank, no_rekening")
				.eq("aktif", true)
				.order("nama"),
			supabase
				.from("penjualan")
				.select("*", { count: "exact", head: true })
				.eq("status_pencocokan", "belum_dicocokkan"),
			supabase
				.from("penjualan")
				.select("id, nomor_faktur, total_harga_jual, catatan_pencocokan, tanggal, reseller:resellers(nama)")
				.eq("status_pencocokan", "selisih")
				.order("created_at", { ascending: true }),
			supabase
				.from("penjualan")
				.select("id, nomor_faktur, tanggal, total_harga_jual, uang_dp, status_bayar, reseller:resellers(nama), nama_customer, telepon_customer")
				.in("status_bayar", ["belum_bayar", "dp"])
				.order("tanggal", { ascending: true }),
			supabase
				.from("reseller_reviews")
				.select("id, isi, created_at, penjualan:penjualan(id, nomor_faktur, reseller:resellers(nama))")
				.eq("tipe", "komplain")
				.eq("status", "open")
				.order("created_at", { ascending: true }),
			supabase
				.from("purchase_orders")
				.select("id, nomor_po, tanggal_estimasi, status, pemohon_nama, reseller:resellers(nama)")
				.in("status", ["pending", "proses"])
				.order("tanggal_estimasi", { ascending: true, nullsFirst: false }),
			supabase
				.from("penjualan")
				.select("nama_customer, telepon_customer, reseller_id")
				.not("nama_customer", "is", null)
				.neq("nama_customer", ""),
			supabase
				.from("pelanggan_crm")
				.select("id, follow_up_at, follow_up_selesai")
				.eq("follow_up_selesai", false)
				.not("follow_up_at", "is", null)
				.lte("follow_up_at", todayStr),
			supabase
				.from("resellers")
				.select("id, nama, kota, created_at")
				.gte("created_at", sevenDaysAgo)
				.eq("aktif", true)
				.order("created_at", { ascending: false }),
			supabase
				.from("penjualan")
				.select("reseller_id, reseller:resellers(nama), total_harga_katalog")
				.gte("tanggal", bulanIni)
				.not("reseller_id", "is", null),
		]);

		// Reseller data belum lengkap: tidak ada telepon ATAU tidak ada info rekening
		setResellerBelumLengkap(
			(resellerRes.data || []).filter(
				(r: any) => !r.telepon || (!r.nama_bank && !r.no_rekening),
			),
		);

		setNotaBelumCount(notaBelumRes.count || 0);
		setNotaSelisih(notaSelisihRes.data || []);
		setBelumBayar(belumBayarRes.data || []);
		setKomplainOpen(komplainRes.data || []);

		const allAktif = poAktifRes.data || [];
		setPoTerlambat(allAktif.filter((po: any) => po.tanggal_estimasi && po.tanggal_estimasi < todayStr));
		setPoMendekati(
			allAktif.filter(
				(po: any) =>
					po.tanggal_estimasi &&
					po.tanggal_estimasi >= todayStr &&
					po.tanggal_estimasi <= threeDaysFromNow,
			),
		);

		// CRM — hitung customer unik
		const keyOf = (nama: string | null, telepon: string | null, resellerId: string | null) =>
			`${(telepon || nama || "").trim()}__${resellerId || ""}`;
		const uniqueKeys = new Set(
			(customerRes.data || []).map((p: any) => keyOf(p.nama_customer, p.telepon_customer, p.reseller_id)),
		);
		setTotalCustomer(uniqueKeys.size);
		setFollowUpDue((crmRes.data || []).length);

		setResellerBaru(resellerBaruRes.data || []);

		// Top reseller bulan ini (by omset)
		const map: Record<string, { id: string; nama: string; total_omset: number; jumlah: number }> = {};
		for (const p of topResellerRes.data || []) {
			const id = p.reseller_id as string;
			const nama = (p.reseller as any)?.nama || "Unknown";
			if (!map[id]) map[id] = { id, nama, total_omset: 0, jumlah: 0 };
			map[id].total_omset += (p.total_harga_katalog as number) || 0;
			map[id].jumlah += 1;
		}
		setTopReseller(
			Object.values(map)
				.sort((a, b) => b.total_omset - a.total_omset)
				.slice(0, 5),
		);

		setLoading(false);
	};

	const totalPending =
		resellerBelumLengkap.length +
		(notaBelumCount > 0 ? 1 : 0) +
		notaSelisih.length +
		(belumBayar.length > 0 ? 1 : 0) +
		komplainOpen.length +
		poTerlambat.length +
		(followUpDue > 0 ? 1 : 0);

	if (loading) {
		return (
			<div className="flex items-center justify-center min-h-[60vh]">
				<Loader2 size={24} className="animate-spin text-gray-400" />
			</div>
		);
	}

	return (
		<div className="max-w-4xl mx-auto space-y-5 pb-10">
			{/* ── Header ── */}
			<div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
				<div className="flex items-start justify-between gap-4">
					<div>
						<div className="flex items-center gap-3 flex-wrap">
							<h1 className="text-2xl font-bold text-gray-900">Meja Kerja Asisten Owner</h1>
							{totalPending > 0 ? (
								<span className="bg-red-500 text-white text-xs font-bold px-2.5 py-1 rounded-full">
									{totalPending} perlu ditindaklanjuti
								</span>
							) : (
								<span className="bg-green-100 text-green-700 text-xs font-semibold px-2.5 py-1 rounded-full flex items-center gap-1">
									<CheckCircle2 size={11} /> Semua beres
								</span>
							)}
						</div>
						<p className="text-sm text-gray-500 mt-1">
							Tugas administratif harian untuk supporting owner — data reseller, pencocokan nota,
							follow-up tagihan/komplain, monitoring PO, dan CRM pelanggan.
						</p>
					</div>
					<button
						onClick={load}
						className="p-2 hover:bg-gray-100 rounded-xl text-gray-400 hover:text-gray-600 transition"
						title="Refresh data">
						<RefreshCw size={16} />
					</button>
				</div>
			</div>

			{/* ── Data Reseller Belum Lengkap ── */}
			{resellerBelumLengkap.length > 0 && (
				<div className="bg-white rounded-2xl border border-amber-200 shadow-sm overflow-hidden">
					<div className="flex items-center justify-between px-6 py-4 border-b border-amber-100">
						<div className="flex items-center gap-2.5">
							<CreditCard size={15} className="text-amber-600" />
							<p className="font-semibold text-gray-900 text-sm">
								{resellerBelumLengkap.length} Reseller Data Belum Lengkap
							</p>
						</div>
						<Link
							href="/dashboard/reseller"
							className="text-xs text-indigo-600 hover:text-indigo-800 font-medium flex items-center gap-1 transition">
							Kelola Reseller <ExternalLink size={11} />
						</Link>
					</div>
					<div className="px-6 py-2.5 bg-amber-50 border-b border-amber-100">
						<p className="text-xs text-amber-700">
							Lengkapi no. telepon dan/atau data rekening bank supaya pembayaran bonus & komunikasi
							lancar.
						</p>
					</div>
					<div className="divide-y divide-gray-50 max-h-72 overflow-y-auto">
						{resellerBelumLengkap.map((r) => (
							<div key={r.id} className="flex items-center justify-between gap-3 px-6 py-3">
								<div className="min-w-0">
									<p className="text-sm font-medium text-gray-800">{r.nama}</p>
									<p className="text-xs text-gray-400">{r.kota || "—"}</p>
								</div>
								<div className="flex items-center gap-1.5 flex-shrink-0">
									{!r.telepon && (
										<span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-red-100 text-red-600 flex items-center gap-1">
											<Phone size={9} /> No. Telp
										</span>
									)}
									{!r.nama_bank && !r.no_rekening && (
										<span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-red-100 text-red-600 flex items-center gap-1">
											<CreditCard size={9} /> Rekening
										</span>
									)}
								</div>
							</div>
						))}
					</div>
				</div>
			)}

			{/* ── Pencocokan Nota ── */}
			{(notaBelumCount > 0 || notaSelisih.length > 0) && (
				<div className="bg-white rounded-2xl border border-red-200 shadow-sm overflow-hidden">
					<div className="flex items-center justify-between px-6 py-4 border-b border-red-100">
						<div className="flex items-center gap-2.5">
							<CheckSquare size={15} className="text-red-500" />
							<p className="font-semibold text-gray-900 text-sm">Pencocokan Nota Penjualan</p>
						</div>
						<Link
							href="/dashboard/pencocokan"
							className="text-xs text-indigo-600 hover:text-indigo-800 font-medium flex items-center gap-1 transition">
							Buka Pencocokan <ExternalLink size={11} />
						</Link>
					</div>
					<div className="flex items-center gap-3 px-6 py-3 bg-red-50 border-b border-red-100 flex-wrap">
						{notaBelumCount > 0 && (
							<span className="flex items-center gap-1.5 text-xs font-semibold text-amber-700 bg-amber-100 px-3 py-1 rounded-full">
								<Clock size={10} /> {notaBelumCount} Belum Dicocokkan
							</span>
						)}
						{notaSelisih.length > 0 && (
							<span className="flex items-center gap-1.5 text-xs font-semibold text-red-700 bg-red-100 px-3 py-1 rounded-full">
								<AlertTriangle size={10} /> {notaSelisih.length} Selisih
							</span>
						)}
					</div>
					{notaSelisih.length > 0 && (
						<div className="divide-y divide-gray-50 max-h-56 overflow-y-auto">
							{notaSelisih.map((nota) => (
								<div key={nota.id} className="flex items-start justify-between gap-4 px-6 py-3">
									<div className="min-w-0">
										<div className="flex items-center gap-2 flex-wrap">
											<span className="font-mono text-sm font-semibold text-gray-900">
												{nota.nomor_faktur}
											</span>
											<span className="text-xs text-gray-500">{nota.reseller?.nama || "Umum"}</span>
										</div>
										<p className="text-sm font-semibold text-gray-700 mt-0.5">
											{formatRupiah(nota.total_harga_jual)}
										</p>
										{nota.catatan_pencocokan && (
											<p className="text-xs text-red-600 mt-1">{nota.catatan_pencocokan}</p>
										)}
									</div>
									<Link
										href={`/dashboard/penjualan/${nota.id}`}
										className="flex-shrink-0 text-xs text-indigo-600 hover:text-indigo-800 font-medium transition">
										Detail
									</Link>
								</div>
							))}
						</div>
					)}
				</div>
			)}

			{/* ── Tagihan Belum Lunas / DP ── */}
			{belumBayar.length > 0 &&
				(() => {
					const totalSisa = belumBayar.reduce(
						(s, p) => s + ((p.total_harga_jual || 0) - (p.uang_dp || 0)),
						0,
					);
					return (
						<div className="bg-white rounded-2xl border border-red-200 shadow-sm overflow-hidden">
							<div className="flex items-center justify-between px-6 py-4 border-b border-red-100">
								<div className="flex items-center gap-2.5">
									<Wallet size={15} className="text-red-500" />
									<p className="font-semibold text-gray-900 text-sm">
										{belumBayar.length} Tagihan Perlu Follow-up
									</p>
								</div>
								<Link
									href="/dashboard/penjualan"
									className="text-xs text-indigo-600 hover:text-indigo-800 font-medium flex items-center gap-1 transition">
									Buka Penjualan <ExternalLink size={11} />
								</Link>
							</div>
							<div className="px-6 py-2.5 bg-red-50 border-b border-red-100 flex items-center justify-between">
								<p className="text-xs text-red-700">
									Hubungi reseller/customer untuk menagih — pencatatan pelunasan tetap oleh
									kasir/keuangan.
								</p>
								<span className="text-xs font-bold text-red-700 flex-shrink-0">
									Total: {formatRupiah(totalSisa)}
								</span>
							</div>
							<div className="divide-y divide-gray-50 max-h-64 overflow-y-auto">
								{belumBayar.map((p) => {
									const sisa = (p.total_harga_jual || 0) - (p.uang_dp || 0);
									const telepon = p.telepon_customer;
									return (
										<div key={p.id} className="flex items-center justify-between gap-3 px-6 py-3">
											<div className="min-w-0">
												<Link
													href={`/dashboard/penjualan/${p.id}`}
													className="font-mono text-sm font-semibold text-indigo-600 hover:underline">
													{p.nomor_faktur}
												</Link>
												<span className="text-xs text-gray-500 ml-2">
													{p.reseller?.nama || p.nama_customer || "Umum"}
												</span>
											</div>
											<div className="flex items-center gap-2 flex-shrink-0">
												<span className="text-sm font-semibold text-red-700">
													{formatRupiah(sisa)}
												</span>
												{telepon && (
													<a
														href={waLink(telepon)}
														target="_blank"
														rel="noopener noreferrer"
														className="p-1.5 bg-green-50 hover:bg-green-100 text-green-600 rounded-lg transition"
														title="Chat WhatsApp">
														<Phone size={13} />
													</a>
												)}
											</div>
										</div>
									);
								})}
							</div>
						</div>
					);
				})()}

			{/* ── Komplain Belum Diresolve ── */}
			{komplainOpen.length > 0 && (
				<div className="bg-white rounded-2xl border border-orange-200 shadow-sm overflow-hidden">
					<div className="flex items-center justify-between px-6 py-4 border-b border-orange-100">
						<div className="flex items-center gap-2.5">
							<MessageSquare size={15} className="text-orange-500" />
							<p className="font-semibold text-gray-900 text-sm">
								{komplainOpen.length} Komplain Belum Diresolve
							</p>
						</div>
						<Link
							href="/dashboard/laporan/review"
							className="text-xs text-indigo-600 hover:text-indigo-800 font-medium flex items-center gap-1 transition">
							Lihat Semua <ExternalLink size={11} />
						</Link>
					</div>
					<div className="divide-y divide-gray-50 max-h-52 overflow-y-auto">
						{komplainOpen.map((r) => (
							<div key={r.id} className="flex items-start justify-between gap-3 px-6 py-3">
								<div className="min-w-0">
									<p className="text-sm text-gray-800 line-clamp-2">{r.isi}</p>
									<p className="text-xs text-gray-400 mt-0.5">
										{r.penjualan?.reseller?.nama || "Umum"} ·{" "}
										{new Date(r.created_at).toLocaleDateString("id-ID", { day: "numeric", month: "short" })}
									</p>
								</div>
								{r.penjualan?.id && (
									<Link
										href={`/dashboard/penjualan/${r.penjualan.id}`}
										className="flex-shrink-0 text-xs text-indigo-600 hover:text-indigo-800 font-medium font-mono transition">
										{r.penjualan.nomor_faktur}
									</Link>
								)}
							</div>
						))}
					</div>
				</div>
			)}

			{/* ── Monitoring PO Mendekati/Lewat Estimasi ── */}
			{(poTerlambat.length > 0 || poMendekati.length > 0) && (
				<div className="bg-white rounded-2xl border border-orange-200 shadow-sm overflow-hidden">
					<div className="flex items-center justify-between px-6 py-4 border-b border-orange-100">
						<div className="flex items-center gap-2.5">
							<ShoppingBag size={15} className="text-orange-500" />
							<p className="font-semibold text-gray-900 text-sm">Monitoring PO — Estimasi Selesai</p>
						</div>
						<Link
							href="/dashboard/po"
							className="text-xs text-indigo-600 hover:text-indigo-800 font-medium flex items-center gap-1 transition">
							Buka PO <ExternalLink size={11} />
						</Link>
					</div>
					<div className="px-6 py-2.5 bg-orange-50 border-b border-orange-100">
						<p className="text-xs text-orange-700">
							Ingatkan/dorong tim produksi — asisten tidak mengubah status PO, hanya memantau.
						</p>
					</div>
					<div className="divide-y divide-gray-50 max-h-64 overflow-y-auto">
						{poTerlambat.map((po) => (
							<div key={po.id} className="flex items-center justify-between gap-3 px-6 py-3">
								<div className="flex items-center gap-2.5 min-w-0">
									<div className="w-1.5 h-1.5 rounded-full bg-red-400 flex-shrink-0" />
									<div className="min-w-0">
										<span className="font-mono text-sm font-semibold text-gray-800">{po.nomor_po}</span>
										<span className="text-xs text-gray-500 ml-2">
											{po.reseller?.nama || po.pemohon_nama || "Umum"}
										</span>
									</div>
								</div>
								<span className="text-xs font-semibold text-red-600 bg-red-50 px-2 py-0.5 rounded-full flex-shrink-0">
									+{daysSince(po.tanggal_estimasi)} hari terlambat
								</span>
							</div>
						))}
						{poMendekati.map((po) => (
							<div key={po.id} className="flex items-center justify-between gap-3 px-6 py-3">
								<div className="flex items-center gap-2.5 min-w-0">
									<div className="w-1.5 h-1.5 rounded-full bg-amber-400 flex-shrink-0" />
									<div className="min-w-0">
										<span className="font-mono text-sm font-semibold text-gray-800">{po.nomor_po}</span>
										<span className="text-xs text-gray-500 ml-2">
											{po.reseller?.nama || po.pemohon_nama || "Umum"}
										</span>
									</div>
								</div>
								<span className="text-xs font-medium text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full flex-shrink-0">
									Est.{" "}
									{new Date(po.tanggal_estimasi).toLocaleDateString("id-ID", {
										day: "numeric",
										month: "short",
									})}
								</span>
							</div>
						))}
					</div>
				</div>
			)}

			{/* ── CRM Pelanggan ── */}
			<div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
				<div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
					<div className="flex items-center gap-2.5">
						<UserCircle size={15} className="text-indigo-500" />
						<p className="font-semibold text-gray-900 text-sm">Kelola CRM Pelanggan</p>
					</div>
					<Link
						href="/dashboard/pelanggan"
						className="text-xs text-indigo-600 hover:text-indigo-800 font-medium flex items-center gap-1 transition">
						Buka CRM <ExternalLink size={11} />
					</Link>
				</div>
				<div className="grid grid-cols-2 gap-4 px-6 py-5">
					<div className="bg-gray-50 rounded-xl p-4 text-center">
						<p className="text-2xl font-bold text-gray-900">{totalCustomer}</p>
						<p className="text-xs text-gray-500 mt-0.5">Total Customer</p>
					</div>
					<div
						className={`rounded-xl p-4 text-center ${followUpDue > 0 ? "bg-red-50" : "bg-gray-50"}`}>
						<p className={`text-2xl font-bold ${followUpDue > 0 ? "text-red-600" : "text-gray-900"}`}>
							{followUpDue}
						</p>
						<p className="text-xs text-gray-500 mt-0.5">Follow-up Jatuh Tempo</p>
					</div>
				</div>
			</div>

			{/* ── Top Reseller Bulan Ini ── */}
			<div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
				<button
					onClick={() => setDTopResellerOpen(!dTopResellerOpen)}
					className="w-full flex items-center justify-between px-6 py-4 hover:bg-gray-50 transition">
					<div className="flex items-center gap-2.5">
						<Trophy size={15} className="text-amber-500" />
						<span className="font-semibold text-gray-800 text-sm">Top 5 Reseller Bulan Ini (Omset)</span>
					</div>
					{dTopResellerOpen ? (
						<ChevronDown size={15} className="text-gray-400" />
					) : (
						<ChevronRight size={15} className="text-gray-400" />
					)}
				</button>
				{dTopResellerOpen && (
					<div className="border-t border-gray-100">
						{topReseller.length === 0 ? (
							<p className="text-sm text-gray-400 text-center py-6">Belum ada penjualan reseller bulan ini</p>
						) : (
							<div className="divide-y divide-gray-50">
								{topReseller.map((r, i) => (
									<div key={r.id} className="flex items-center justify-between px-6 py-3">
										<div className="flex items-center gap-3">
											<span className="w-6 h-6 flex items-center justify-center rounded-full bg-indigo-50 text-indigo-600 text-xs font-bold flex-shrink-0">
												{i + 1}
											</span>
											<div>
												<p className="text-sm font-medium text-gray-800">{r.nama}</p>
												<p className="text-xs text-gray-400">{r.jumlah}x transaksi</p>
											</div>
										</div>
										<span className="text-sm font-semibold text-indigo-600">
											{formatRupiah(r.total_omset)}
										</span>
									</div>
								))}
							</div>
						)}
						<div className="px-6 py-3 bg-gray-50 border-t border-gray-100">
							<Link
								href="/dashboard/laporan/reseller"
								className="text-xs text-indigo-600 hover:text-indigo-800 font-medium flex items-center gap-1 transition">
								Lihat laporan lengkap <ExternalLink size={11} />
							</Link>
						</div>
					</div>
				)}
			</div>

			{/* ── Reseller Baru (7 Hari) ── */}
			<div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
				<button
					onClick={() => setDResellerBaruOpen(!dResellerBaruOpen)}
					className="w-full flex items-center justify-between px-6 py-4 hover:bg-gray-50 transition">
					<div className="flex items-center gap-2.5">
						<Users size={15} className="text-blue-500" />
						<span className="font-semibold text-gray-800 text-sm">Reseller Baru (7 Hari Terakhir)</span>
						{resellerBaru.length > 0 && (
							<span className="bg-blue-100 text-blue-700 text-xs font-semibold px-2 py-0.5 rounded-full">
								{resellerBaru.length}
							</span>
						)}
					</div>
					{dResellerBaruOpen ? (
						<ChevronDown size={15} className="text-gray-400" />
					) : (
						<ChevronRight size={15} className="text-gray-400" />
					)}
				</button>
				{dResellerBaruOpen && (
					<div className="border-t border-gray-100">
						{resellerBaru.length === 0 ? (
							<p className="text-sm text-gray-400 text-center py-6">
								Tidak ada reseller baru dalam 7 hari terakhir
							</p>
						) : (
							<div className="divide-y divide-gray-50">
								{resellerBaru.map((r) => (
									<div key={r.id} className="flex items-center justify-between px-6 py-3">
										<div>
											<p className="text-sm font-medium text-gray-800">{r.nama}</p>
											<p className="text-xs text-gray-400">{r.kota || "—"}</p>
										</div>
										<span className="text-xs text-gray-400">
											{new Date(r.created_at).toLocaleDateString("id-ID", { day: "numeric", month: "short" })}
										</span>
									</div>
								))}
							</div>
						)}
						<div className="px-6 py-3 bg-blue-50 border-t border-blue-100">
							<p className="text-xs text-blue-600">
								Follow-up onboarding/perkenalan untuk reseller baru ini.
							</p>
						</div>
					</div>
				)}
			</div>
		</div>
	);
}
