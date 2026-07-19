"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { formatRupiah } from "@/lib/utils";
import { PENGELUARAN_KATEGORI_CFG, MANIFEST_BIAYA_KATEGORI_CFG } from "@/lib/pengirimanConstants";
import {
	ChevronDown,
	ChevronRight,
	ExternalLink,
	Wallet,
	Receipt,
	Truck,
	ShieldAlert,
} from "lucide-react";
import {
	BarChart,
	Bar,
	XAxis,
	YAxis,
	Tooltip,
	Legend,
	ResponsiveContainer,
} from "recharts";

const BULAN_NAMA = [
	"Januari", "Februari", "Maret", "April", "Mei", "Juni",
	"Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

const METODE_LABEL: Record<string, string> = {
	transfer: "Transfer",
	cod: "COD",
	cash: "Cash",
};

// Kategori pengeluaran/biaya trip lama (arsip, atau di luar daftar baru) —
// tampilkan apa adanya, bukan error.
function kategoriPengeluaranLabel(kat: string): string {
	return PENGELUARAN_KATEGORI_CFG[kat as keyof typeof PENGELUARAN_KATEGORI_CFG]?.label ?? kat;
}
function kategoriBiayaTripLabel(kat: string): string {
	return MANIFEST_BIAYA_KATEGORI_CFG[kat as keyof typeof MANIFEST_BIAYA_KATEGORI_CFG]?.label ?? kat;
}

interface Summary {
	pemasukan: number;
	pemasukanPerMetode: Record<string, number>;
	bebanPengeluaran: number;
	bebanPengeluaranPerKategori: Record<string, number>;
	bebanBiayaTrip: number;
	bebanBiayaTripPerKategori: Record<string, number>;
	bebanKlaim: number;
}

interface ArmadaBiaya {
	armada_id: string;
	plat_nomor: string;
	total: number;
	jumlahTransaksi: number;
}

interface TrendItem {
	label: string;
	pemasukan: number;
	beban: number;
}

const emptySummary: Summary = {
	pemasukan: 0,
	pemasukanPerMetode: {},
	bebanPengeluaran: 0,
	bebanPengeluaranPerKategori: {},
	bebanBiayaTrip: 0,
	bebanBiayaTripPerKategori: {},
	bebanKlaim: 0,
};

const KEU_ROLES = ["superadmin", "keuangan"];

export default function LaporanKeuanganPage() {
	const supabase = createClient();
	const { role, loading: authLoading } = useAuth();
	const router = useRouter();

	useEffect(() => {
		if (!authLoading && !KEU_ROLES.includes(role ?? ""))
			router.replace("/dashboard");
	}, [role, authLoading, router]);

	const now = new Date();
	const [filterBulan, setFilterBulan] = useState({
		bulan: now.getMonth() + 1,
		tahun: now.getFullYear(),
	});
	const [cabangList, setCabangList] = useState<any[]>([]);
	const [filterCabang, setFilterCabang] = useState("semua");
	const [summary, setSummary] = useState<Summary>(emptySummary);
	const [armadaBiaya, setArmadaBiaya] = useState<ArmadaBiaya[]>([]);
	const [trendData, setTrendData] = useState<TrendItem[]>([]);
	const [loading, setLoading] = useState(true);
	const [openSection, setOpenSection] = useState<
		"pengeluaran" | "biaya_trip" | "klaim" | null
	>("pengeluaran");

	useEffect(() => {
		supabase
			.from("cabang")
			.select("id, nama")
			.eq("aktif", true)
			.order("nama")
			.then(({ data }) => setCabangList(data || []));
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	const load = useCallback(async () => {
		setLoading(true);
		const { bulan, tahun } = filterBulan;
		const dariTgl = `${tahun}-${String(bulan).padStart(2, "0")}-01`;
		const lastDay = new Date(tahun, bulan, 0).getDate();
		const sampaiTgl = `${tahun}-${String(bulan).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
		const dariTs = `${dariTgl}T00:00:00`;
		const sampaiTs = `${sampaiTgl}T23:59:59`;

		const [bayarRes, pengeluaranRes, biayaTripRes, klaimRes] = await Promise.all([
			// Pemasukan = pengiriman_pembayaran per created_at (cash basis, BUKAN total_tagihan)
			supabase
				.from("pengiriman_pembayaran")
				.select("jumlah, metode, created_at, pengiriman:pengiriman_id(cabang_id)")
				.gte("created_at", dariTs)
				.lte("created_at", sampaiTs),
			// Beban 1: pengeluaran (dicatat langsung di modul ini)
			supabase
				.from("pengeluaran")
				.select("jumlah, kategori, cabang_id, armada_id, armada:armada_id(plat_nomor)")
				.gte("tanggal", dariTgl)
				.lte("tanggal", sampaiTgl),
			// Beban 2: manifest_biaya — BACA SAJA, dicatat di modul Manifest (spec 04)
			supabase
				.from("manifest_biaya")
				.select("jumlah, kategori, created_at, manifest:manifest_id(cabang_id)")
				.gte("created_at", dariTs)
				.lte("created_at", sampaiTs),
			// Beban 3: klaim selesai — BACA SAJA, dicatat di modul Klaim. Cash-basis:
			// masuk beban pada periode SELESAI (selesai_at), bukan periode kejadian.
			// TIDAK difilter cabang — klaim tidak punya cabang_id (di luar scope
			// spec 06 untuk menambahkannya, lihat rule anti-scope-creep).
			supabase
				.from("klaim")
				.select("nilai_disetujui, selesai_at")
				.eq("status", "selesai")
				.gte("selesai_at", dariTs)
				.lte("selesai_at", sampaiTs),
		]);

		const cabangFilter = filterCabang !== "semua" ? filterCabang : null;

		const pemasukanRows = (bayarRes.data || []).filter(
			(b: any) => !cabangFilter || b.pengiriman?.cabang_id === cabangFilter,
		);
		const pemasukanPerMetode: Record<string, number> = {};
		let pemasukan = 0;
		for (const b of pemasukanRows) {
			pemasukan += Number(b.jumlah) || 0;
			pemasukanPerMetode[b.metode] = (pemasukanPerMetode[b.metode] || 0) + Number(b.jumlah);
		}

		const pengeluaranRows = (pengeluaranRes.data || []).filter(
			(p: any) => !cabangFilter || p.cabang_id === cabangFilter,
		);
		const bebanPengeluaranPerKategori: Record<string, number> = {};
		let bebanPengeluaran = 0;
		const armadaBiayaMap: Record<string, ArmadaBiaya> = {};
		for (const p of pengeluaranRows) {
			bebanPengeluaran += Number(p.jumlah) || 0;
			bebanPengeluaranPerKategori[p.kategori] =
				(bebanPengeluaranPerKategori[p.kategori] || 0) + Number(p.jumlah);
			if (p.armada_id) {
				const existing = armadaBiayaMap[p.armada_id];
				armadaBiayaMap[p.armada_id] = {
					armada_id: p.armada_id,
					plat_nomor: p.armada?.plat_nomor || "-",
					total: (existing?.total || 0) + Number(p.jumlah),
					jumlahTransaksi: (existing?.jumlahTransaksi || 0) + 1,
				};
			}
		}
		setArmadaBiaya(
			Object.values(armadaBiayaMap).sort((a, b) => b.total - a.total),
		);

		const biayaTripRows = (biayaTripRes.data || []).filter(
			(b: any) => !cabangFilter || b.manifest?.cabang_id === cabangFilter,
		);
		const bebanBiayaTripPerKategori: Record<string, number> = {};
		let bebanBiayaTrip = 0;
		for (const b of biayaTripRows) {
			bebanBiayaTrip += Number(b.jumlah) || 0;
			bebanBiayaTripPerKategori[b.kategori] =
				(bebanBiayaTripPerKategori[b.kategori] || 0) + Number(b.jumlah);
		}

		const bebanKlaim = (klaimRes.data || []).reduce(
			(s: number, k: any) => s + (Number(k.nilai_disetujui) || 0),
			0,
		);

		setSummary({
			pemasukan,
			pemasukanPerMetode,
			bebanPengeluaran,
			bebanPengeluaranPerKategori,
			bebanBiayaTrip,
			bebanBiayaTripPerKategori,
			bebanKlaim,
		});
		setLoading(false);
	}, [filterBulan, filterCabang]);

	useEffect(() => {
		load();
	}, [load]);

	// Grafik tren 12 bulan — trailing dari bulan/tahun terpilih (anchor
	// filterBulan), bukan selalu "hari ini". Pakai formula anti-dobel yang
	// SAMA persis dgn load() (pengeluaran + manifest_biaya BACA SAJA +
	// klaim selesai_at), cuma dibucket per bulan, bukan satu total periode.
	const loadTrend = useCallback(async () => {
		const { bulan, tahun } = filterBulan;
		const months: { bulan: number; tahun: number }[] = [];
		let tm = bulan,
			ty = tahun;
		for (let i = 0; i < 12; i++) {
			months.unshift({ bulan: tm, tahun: ty });
			tm--;
			if (tm === 0) {
				tm = 12;
				ty--;
			}
		}
		const oldest = months[0];
		const newest = months[months.length - 1];
		const newestLastDay = new Date(newest.tahun, newest.bulan, 0).getDate();
		const tStart = `${oldest.tahun}-${String(oldest.bulan).padStart(2, "0")}-01`;
		const tEnd = `${newest.tahun}-${String(newest.bulan).padStart(2, "0")}-${String(newestLastDay).padStart(2, "0")}`;
		const tStartTs = `${tStart}T00:00:00`;
		const tEndTs = `${tEnd}T23:59:59`;

		const cabangFilter = filterCabang !== "semua" ? filterCabang : null;

		const [bayarRes, pengeluaranRes, biayaTripRes, klaimRes] = await Promise.all([
			supabase
				.from("pengiriman_pembayaran")
				.select("jumlah, created_at, pengiriman:pengiriman_id(cabang_id)")
				.gte("created_at", tStartTs)
				.lte("created_at", tEndTs),
			supabase
				.from("pengeluaran")
				.select("jumlah, tanggal, cabang_id")
				.gte("tanggal", tStart)
				.lte("tanggal", tEnd),
			supabase
				.from("manifest_biaya")
				.select("jumlah, created_at, manifest:manifest_id(cabang_id)")
				.gte("created_at", tStartTs)
				.lte("created_at", tEndTs),
			supabase
				.from("klaim")
				.select("nilai_disetujui, selesai_at")
				.eq("status", "selesai")
				.gte("selesai_at", tStartTs)
				.lte("selesai_at", tEndTs),
		]);

		const monthKey = (d: Date) => `${d.getFullYear()}-${d.getMonth() + 1}`;

		const pemasukanMap: Record<string, number> = {};
		for (const b of (bayarRes.data as any[]) || []) {
			if (cabangFilter && b.pengiriman?.cabang_id !== cabangFilter) continue;
			const key = monthKey(new Date(b.created_at));
			pemasukanMap[key] = (pemasukanMap[key] || 0) + Number(b.jumlah);
		}

		const bebanMap: Record<string, number> = {};
		for (const p of (pengeluaranRes.data as any[]) || []) {
			if (cabangFilter && p.cabang_id !== cabangFilter) continue;
			const key = monthKey(new Date(p.tanggal + "T00:00:00"));
			bebanMap[key] = (bebanMap[key] || 0) + Number(p.jumlah);
		}
		for (const b of (biayaTripRes.data as any[]) || []) {
			if (cabangFilter && b.manifest?.cabang_id !== cabangFilter) continue;
			const key = monthKey(new Date(b.created_at));
			bebanMap[key] = (bebanMap[key] || 0) + Number(b.jumlah);
		}
		for (const k of (klaimRes.data as any[]) || []) {
			if (!k.selesai_at) continue;
			const key = monthKey(new Date(k.selesai_at));
			bebanMap[key] = (bebanMap[key] || 0) + (Number(k.nilai_disetujui) || 0);
		}

		setTrendData(
			months.map(({ bulan: b, tahun: t }) => {
				const key = `${t}-${b}`;
				return {
					label: BULAN_NAMA[b - 1].slice(0, 3),
					pemasukan: Math.round((pemasukanMap[key] || 0) / 1_000_000),
					beban: Math.round((bebanMap[key] || 0) / 1_000_000),
				};
			}),
		);
	}, [filterBulan, filterCabang]);

	useEffect(() => {
		loadTrend();
	}, [loadTrend]);

	if (authLoading || !KEU_ROLES.includes(role ?? "")) return null;

	const bebanTotal = summary.bebanPengeluaran + summary.bebanBiayaTrip + summary.bebanKlaim;
	const neto = summary.pemasukan - bebanTotal;

	const toggleSection = (s: "pengeluaran" | "biaya_trip" | "klaim") =>
		setOpenSection(openSection === s ? null : s);

	return (
		<div>
			<div className="flex items-center justify-between mb-8 flex-wrap gap-3">
				<div>
					<h1 className="text-2xl font-bold text-gray-900">Laporan Keuangan</h1>
					<p className="text-gray-500 mt-1">
						Pemasukan &amp; beban expedisi — basis kas (cash basis)
					</p>
				</div>
				<div className="flex items-center gap-2">
					<select
						value={filterBulan.bulan}
						onChange={(e) =>
							setFilterBulan((f) => ({ ...f, bulan: Number(e.target.value) }))
						}
						className="px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
						{BULAN_NAMA.map((nama, i) => (
							<option key={i} value={i + 1}>
								{nama}
							</option>
						))}
					</select>
					<select
						value={filterBulan.tahun}
						onChange={(e) =>
							setFilterBulan((f) => ({ ...f, tahun: Number(e.target.value) }))
						}
						className="px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
						{[2024, 2025, 2026, 2027].map((y) => (
							<option key={y} value={y}>
								{y}
							</option>
						))}
					</select>
					{cabangList.length > 0 && (
						<select
							value={filterCabang}
							onChange={(e) => setFilterCabang(e.target.value)}
							className="px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
							<option value="semua">Semua Cabang</option>
							{cabangList.map((c) => (
								<option key={c.id} value={c.id}>
									{c.nama}
								</option>
							))}
						</select>
					)}
				</div>
			</div>

			{loading ? (
				<div className="text-center py-20 text-gray-400">Memuat laporan...</div>
			) : (
				<>
					{/* Stat cards: Pemasukan / Beban / Neto */}
					<div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
						<div className="bg-blue-50 rounded-2xl p-5 border border-blue-100">
							<div className="flex items-center justify-between mb-2">
								<p className="text-sm font-semibold text-blue-600">Pemasukan</p>
								<Wallet size={18} className="text-blue-400" />
							</div>
							<p className="text-2xl font-bold text-blue-700">
								{formatRupiah(summary.pemasukan)}
							</p>
							<p className="text-xs text-blue-400 mt-1">
								Kas diterima (pembayaran pengiriman)
							</p>
						</div>
						<div className="bg-orange-50 rounded-2xl p-5 border border-orange-100">
							<div className="flex items-center justify-between mb-2">
								<p className="text-sm font-semibold text-orange-600">Beban</p>
								<Receipt size={18} className="text-orange-400" />
							</div>
							<p className="text-2xl font-bold text-orange-700">
								{formatRupiah(bebanTotal)}
							</p>
							<p className="text-xs text-orange-400 mt-1">
								Pengeluaran + Biaya Trip + Klaim
							</p>
						</div>
						<div
							className={`rounded-2xl p-5 border-2 ${neto >= 0 ? "bg-green-50 border-green-300" : "bg-red-50 border-red-300"}`}>
							<div className="flex items-center justify-between mb-2">
								<p
									className={`text-sm font-semibold ${neto >= 0 ? "text-green-600" : "text-red-600"}`}>
									Neto
								</p>
							</div>
							<p
								className={`text-2xl font-bold ${neto >= 0 ? "text-green-700" : "text-red-600"}`}>
								{formatRupiah(neto)}
							</p>
							<p className={`text-xs mt-1 ${neto >= 0 ? "text-green-400" : "text-red-400"}`}>
								Pemasukan − Beban
							</p>
						</div>
					</div>

					{/* Breakdown Pemasukan per Metode */}
					<div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 mb-6">
						<h2 className="text-base font-semibold text-gray-900 mb-4">
							Pemasukan per Metode Pembayaran
						</h2>
						{Object.keys(summary.pemasukanPerMetode).length === 0 ? (
							<p className="text-sm text-gray-400">Tidak ada pemasukan di periode ini</p>
						) : (
							<div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
								{Object.entries(summary.pemasukanPerMetode).map(([metode, jumlah]) => (
									<div key={metode} className="bg-blue-50/60 rounded-xl p-4">
										<p className="text-xs font-medium text-blue-500 mb-1">
											{METODE_LABEL[metode] || metode}
										</p>
										<p className="text-lg font-bold text-blue-700">
											{formatRupiah(jumlah)}
										</p>
									</div>
								))}
							</div>
						)}
					</div>

					{/* Beban — 3 kelompok terpisah, TIDAK dilebur */}
					<div className="bg-white rounded-2xl shadow-sm border border-gray-100 mb-6 divide-y divide-gray-100">
						<div className="px-6 py-4">
							<h2 className="text-base font-semibold text-gray-900">
								Rincian Beban
							</h2>
							<p className="text-xs text-gray-400 mt-0.5">
								3 sumber terpisah — tidak ada pencatatan ganda antar modul
							</p>
						</div>

						{/* Kelompok 1: Pengeluaran */}
						<div>
							<button
								onClick={() => toggleSection("pengeluaran")}
								className="w-full flex items-center justify-between px-6 py-4 hover:bg-gray-50 transition">
								<div className="flex items-center gap-2">
									{openSection === "pengeluaran" ? (
										<ChevronDown size={16} className="text-gray-400" />
									) : (
										<ChevronRight size={16} className="text-gray-400" />
									)}
									<span className="text-sm font-medium text-gray-800">
										Pengeluaran
									</span>
									<Link
										href="/dashboard/keuangan/pengeluaran"
										onClick={(e) => e.stopPropagation()}
										className="text-xs text-indigo-500 hover:underline flex items-center gap-1">
										kelola <ExternalLink size={10} />
									</Link>
								</div>
								<span className="text-sm font-bold text-orange-600">
									{formatRupiah(summary.bebanPengeluaran)}
								</span>
							</button>
							{openSection === "pengeluaran" && (
								<div className="px-6 pb-4 pl-11 space-y-1.5">
									{Object.keys(summary.bebanPengeluaranPerKategori).length === 0 ? (
										<p className="text-xs text-gray-400">Tidak ada pengeluaran di periode ini</p>
									) : (
										Object.entries(summary.bebanPengeluaranPerKategori)
											.sort((a, b) => b[1] - a[1])
											.map(([kat, jumlah]) => (
												<div key={kat} className="flex items-center justify-between text-sm">
													<span className="text-gray-600">{kategoriPengeluaranLabel(kat)}</span>
													<span className="font-medium text-gray-800">{formatRupiah(jumlah)}</span>
												</div>
											))
									)}
								</div>
							)}
						</div>

						{/* Kelompok 2: Biaya Trip (READ-ONLY, dari manifest_biaya) */}
						<div>
							<button
								onClick={() => toggleSection("biaya_trip")}
								className="w-full flex items-center justify-between px-6 py-4 hover:bg-gray-50 transition">
								<div className="flex items-center gap-2">
									{openSection === "biaya_trip" ? (
										<ChevronDown size={16} className="text-gray-400" />
									) : (
										<ChevronRight size={16} className="text-gray-400" />
									)}
									<Truck size={14} className="text-gray-400" />
									<span className="text-sm font-medium text-gray-800">
										Biaya Trip
									</span>
									<Link
										href="/dashboard/manifest"
										onClick={(e) => e.stopPropagation()}
										className="text-xs text-indigo-500 hover:underline flex items-center gap-1">
										kelola di Manifest <ExternalLink size={10} />
									</Link>
								</div>
								<span className="text-sm font-bold text-orange-600">
									{formatRupiah(summary.bebanBiayaTrip)}
								</span>
							</button>
							{openSection === "biaya_trip" && (
								<div className="px-6 pb-4 pl-11 space-y-1.5">
									{Object.keys(summary.bebanBiayaTripPerKategori).length === 0 ? (
										<p className="text-xs text-gray-400">Tidak ada biaya trip di periode ini</p>
									) : (
										Object.entries(summary.bebanBiayaTripPerKategori)
											.sort((a, b) => b[1] - a[1])
											.map(([kat, jumlah]) => (
												<div key={kat} className="flex items-center justify-between text-sm">
													<span className="text-gray-600">{kategoriBiayaTripLabel(kat)}</span>
													<span className="font-medium text-gray-800">{formatRupiah(jumlah)}</span>
												</div>
											))
									)}
								</div>
							)}
						</div>

						{/* Kelompok 3: Klaim selesai (READ-ONLY, dari klaim) */}
						<div>
							<button
								onClick={() => toggleSection("klaim")}
								className="w-full flex items-center justify-between px-6 py-4 hover:bg-gray-50 transition">
								<div className="flex items-center gap-2">
									{openSection === "klaim" ? (
										<ChevronDown size={16} className="text-gray-400" />
									) : (
										<ChevronRight size={16} className="text-gray-400" />
									)}
									<ShieldAlert size={14} className="text-gray-400" />
									<span className="text-sm font-medium text-gray-800">
										Klaim (ganti rugi selesai)
									</span>
									<Link
										href="/dashboard/klaim"
										onClick={(e) => e.stopPropagation()}
										className="text-xs text-indigo-500 hover:underline flex items-center gap-1">
										kelola di Klaim <ExternalLink size={10} />
									</Link>
								</div>
								<span className="text-sm font-bold text-orange-600">
									{formatRupiah(summary.bebanKlaim)}
								</span>
							</button>
							{openSection === "klaim" && (
								<div className="px-6 pb-4 pl-11">
									<p className="text-xs text-gray-400">
										Nilai disetujui dari klaim berstatus "selesai" pada periode ini
										(basis tanggal ditandai selesai, bukan tanggal kejadian). Tidak
										difilter cabang — klaim belum punya atribut cabang.
									</p>
								</div>
							)}
						</div>
					</div>

					{/* Grafik tren 12 bulan */}
					<div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 mb-6">
						<h2 className="text-base font-semibold text-gray-900 mb-1">
							Tren 12 Bulan — Pemasukan vs Beban
						</h2>
						<p className="text-xs text-gray-400 mb-5">
							Dalam jutaan rupiah, trailing dari {BULAN_NAMA[filterBulan.bulan - 1]}{" "}
							{filterBulan.tahun}
						</p>
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
										name === "pemasukan" ? "Pemasukan" : "Beban",
									]}
								/>
								<Legend
									formatter={(v) => (v === "pemasukan" ? "Pemasukan" : "Beban")}
								/>
								<Bar dataKey="pemasukan" fill="#6366f1" radius={[4, 4, 0, 0]} />
								<Bar dataKey="beban" fill="#f97316" radius={[4, 4, 0, 0]} />
							</BarChart>
						</ResponsiveContainer>
					</div>

					{/* Tabel biaya per armada — dari pengeluaran.armada_id (maintenance/pajak), BUKAN manifest_biaya */}
					<div className="bg-white rounded-2xl shadow-sm border border-gray-100 mb-6 overflow-hidden">
						<div className="px-6 py-4 border-b border-gray-100">
							<h2 className="text-base font-semibold text-gray-900">
								Biaya per Armada
							</h2>
							<p className="text-xs text-gray-400 mt-0.5">
								Dari Pengeluaran ber-armada (maintenance/pajak) pada periode ini —
								beda dari Biaya Trip (BBM/tol/dll, lihat Laporan Laba per Trip)
							</p>
						</div>
						{armadaBiaya.length === 0 ? (
							<div className="text-center py-8 text-gray-400 text-sm">
								Tidak ada pengeluaran ber-armada di periode ini
							</div>
						) : (
							<table className="w-full text-sm">
								<thead className="bg-gray-50 border-b border-gray-100">
									<tr>
										<th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">
											Armada
										</th>
										<th className="text-center px-6 py-3 text-xs font-semibold text-gray-500 uppercase">
											Jumlah Transaksi
										</th>
										<th className="text-right px-6 py-3 text-xs font-semibold text-gray-500 uppercase">
											Total Biaya
										</th>
									</tr>
								</thead>
								<tbody className="divide-y divide-gray-50">
									{armadaBiaya.map((a) => (
										<tr key={a.armada_id} className="hover:bg-gray-50">
											<td className="px-6 py-3 font-medium text-gray-800">
												{a.plat_nomor}
											</td>
											<td className="px-6 py-3 text-center text-gray-500">
												{a.jumlahTransaksi}
											</td>
											<td className="px-6 py-3 text-right font-semibold text-gray-900">
												{formatRupiah(a.total)}
											</td>
										</tr>
									))}
								</tbody>
							</table>
						)}
					</div>

					<p className="text-xs text-gray-400">
						Data pemasukan/pengeluaran furniture arsip (sebelum pivot expedisi)
						tidak digabung ke laporan ini — lihat halaman Penjualan lama kalau
						perlu referensi.
					</p>
				</>
			)}
		</div>
	);
}
