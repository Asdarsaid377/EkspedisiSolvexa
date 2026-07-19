"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { formatRupiah, formatDate, formatDateOnly } from "@/lib/utils";
import {
	AgingBucket,
	AGING_BUCKET_CFG,
	getAgingBucket,
} from "@/lib/pengirimanConstants";
import Link from "next/link";
import { printTagihanCustomer } from "@/lib/printTagihanCustomer";
import {
	AlertCircle,
	AlertTriangle,
	Clock,
	Flame,
	X,
	Wallet,
	CreditCard,
	Printer,
} from "lucide-react";

const LAP_ROLES = ["superadmin", "keuangan", "kasir"];

const WALKIN_KEY = "__walkin__";

const BUCKET_ORDER: AgingBucket[] = [
	"belum_jatuh_tempo",
	"1_7_hari",
	"8_30_hari",
	"lebih_30_hari",
];

const BUCKET_ICON: Record<AgingBucket, any> = {
	belum_jatuh_tempo: Clock,
	"1_7_hari": AlertCircle,
	"8_30_hari": AlertTriangle,
	lebih_30_hari: Flame,
};

const BUCKET_COLOR: Record<AgingBucket, { bg: string; text: string; chip: string }> = {
	belum_jatuh_tempo: { bg: "bg-gray-50", text: "text-gray-500", chip: "bg-gray-100 text-gray-600" },
	"1_7_hari": { bg: "bg-yellow-50", text: "text-yellow-600", chip: "bg-yellow-100 text-yellow-700" },
	"8_30_hari": { bg: "bg-orange-50", text: "text-orange-600", chip: "bg-orange-100 text-orange-700" },
	lebih_30_hari: { bg: "bg-red-50", text: "text-red-600", chip: "bg-red-100 text-red-700" },
};

interface KirimanPiutang {
	id: string;
	nomor_faktur: string;
	nomor_resi?: string;
	tanggal: string;
	penerima_kota?: string;
	total_tagihan: number;
	uang_dp: number;
	sisa: number;
	bucket: AgingBucket;
}

interface CustomerPiutang {
	key: string;
	nama: string;
	tipe?: "umum" | "korporat";
	totalSisa: number;
	jumlahKiriman: number;
	bucketNominal: Record<AgingBucket, number>;
	tanggalTertua: string;
	kiriman: KirimanPiutang[];
}

const emptyBucketNominal = (): Record<AgingBucket, number> => ({
	belum_jatuh_tempo: 0,
	"1_7_hari": 0,
	"8_30_hari": 0,
	lebih_30_hari: 0,
});

export default function PiutangPage() {
	const { role, loading: authLoading } = useAuth();
	const router = useRouter();
	const supabase = createClient();
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		if (!authLoading && !LAP_ROLES.includes(role ?? "")) router.replace("/dashboard");
	}, [role, authLoading, router]);

	const [customers, setCustomers] = useState<CustomerPiutang[]>([]);
	const [bucketStats, setBucketStats] = useState<
		Record<AgingBucket, { nominal: number; jumlah: number }>
	>({
		belum_jatuh_tempo: { nominal: 0, jumlah: 0 },
		"1_7_hari": { nominal: 0, jumlah: 0 },
		"8_30_hari": { nominal: 0, jumlah: 0 },
		lebih_30_hari: { nominal: 0, jumlah: 0 },
	});
	const [selected, setSelected] = useState<CustomerPiutang | null>(null);

	// Pelunasan massal — pilih beberapa kiriman di drill-down, satu aksi
	// insert pengiriman_pembayaran per kiriman (mekanisme yang sudah ada,
	// dipanggil berulang). Selalu bayar PENUH sisa masing-masing (Keputusan
	// Terbuka #3) — tidak ada alokasi sebagian di sini.
	const [selectedKiriman, setSelectedKiriman] = useState<Set<string>>(new Set());
	const [pelunasanMassalForm, setPelunasanMassalForm] = useState({
		metode: "transfer",
		catatan: "",
	});
	const [pelunasanMassalSaving, setPelunasanMassalSaving] = useState(false);
	const [pelunasanMassalError, setPelunasanMassalError] = useState("");

	const bukaDrillDown = (c: CustomerPiutang) => {
		setSelected(c);
		setSelectedKiriman(new Set());
		setPelunasanMassalForm({
			metode: "transfer",
			catatan: `Pelunasan massal ${formatDateOnly(new Date().toISOString())}`,
		});
		setPelunasanMassalError("");
	};

	const toggleKiriman = (id: string) => {
		setSelectedKiriman((prev) => {
			const next = new Set(prev);
			if (next.has(id)) next.delete(id);
			else next.add(id);
			return next;
		});
	};

	const toggleSemuaKiriman = () => {
		if (!selected) return;
		setSelectedKiriman((prev) =>
			prev.size === selected.kiriman.length
				? new Set()
				: new Set(selected.kiriman.map((k) => k.id)),
		);
	};

	const totalTerpilih = selected
		? selected.kiriman
				.filter((k) => selectedKiriman.has(k.id))
				.reduce((s, k) => s + k.sisa, 0)
		: 0;

	const savePelunasanMassal = async () => {
		if (!selected || selectedKiriman.size === 0) return;
		setPelunasanMassalSaving(true);
		setPelunasanMassalError("");

		const terpilih = selected.kiriman.filter((k) => selectedKiriman.has(k.id));

		for (const k of terpilih) {
			const { error: errBayar } = await supabase.from("pengiriman_pembayaran").insert({
				pengiriman_id: k.id,
				jumlah: k.sisa,
				metode: pelunasanMassalForm.metode,
				catatan: pelunasanMassalForm.catatan || null,
			});
			if (errBayar) {
				setPelunasanMassalError(
					`Gagal mencatat pelunasan ${k.nomor_faktur}: ${errBayar.message}`,
				);
				setPelunasanMassalSaving(false);
				return;
			}

			const { error: errUpdate } = await supabase
				.from("pengiriman")
				.update({ uang_dp: k.total_tagihan, status_bayar: "lunas" })
				.eq("id", k.id);
			if (errUpdate) {
				setPelunasanMassalError(
					`Gagal update status ${k.nomor_faktur}: ${errUpdate.message}`,
				);
				setPelunasanMassalSaving(false);
				return;
			}
		}

		setPelunasanMassalSaving(false);
		setSelected(null);
		setSelectedKiriman(new Set());
		load();
	};

	const load = useCallback(async () => {
		setLoading(true);
		const { data } = await supabase
			.from("pengiriman")
			.select(
				"id, nomor_faktur, nomor_resi, tanggal, penerima_kota, total_tagihan, uang_dp, customer_id, customer:customer(nama, tipe, term_hari)",
			)
			.neq("status_bayar", "lunas")
			.order("tanggal", { ascending: true });

		const rows = data || [];
		const groupMap: Record<string, CustomerPiutang> = {};
		const stats: Record<AgingBucket, { nominal: number; jumlah: number }> = {
			belum_jatuh_tempo: { nominal: 0, jumlah: 0 },
			"1_7_hari": { nominal: 0, jumlah: 0 },
			"8_30_hari": { nominal: 0, jumlah: 0 },
			lebih_30_hari: { nominal: 0, jumlah: 0 },
		};

		for (const r of rows) {
			const cust = r.customer as any;
			const key = r.customer_id || WALKIN_KEY;
			const termHari = cust?.term_hari ?? 0;
			const sisa = r.total_tagihan - r.uang_dp;
			const bucket = getAgingBucket(r.tanggal, termHari);

			stats[bucket].nominal += sisa;
			stats[bucket].jumlah += 1;

			if (!groupMap[key]) {
				groupMap[key] = {
					key,
					nama: cust?.nama || "Walk-in / Tanpa Customer",
					tipe: cust?.tipe,
					totalSisa: 0,
					jumlahKiriman: 0,
					bucketNominal: emptyBucketNominal(),
					tanggalTertua: r.tanggal,
					kiriman: [],
				};
			}
			const grp = groupMap[key];
			grp.totalSisa += sisa;
			grp.jumlahKiriman += 1;
			grp.bucketNominal[bucket] += sisa;
			if (r.tanggal < grp.tanggalTertua) grp.tanggalTertua = r.tanggal;
			grp.kiriman.push({
				id: r.id,
				nomor_faktur: r.nomor_faktur,
				nomor_resi: r.nomor_resi,
				tanggal: r.tanggal,
				penerima_kota: r.penerima_kota,
				total_tagihan: r.total_tagihan,
				uang_dp: r.uang_dp,
				sisa,
				bucket,
			});
		}

		setBucketStats(stats);
		setCustomers(
			Object.values(groupMap).sort((a, b) => b.totalSisa - a.totalSisa),
		);
		setLoading(false);
	}, [supabase]);

	useEffect(() => {
		if (!authLoading && LAP_ROLES.includes(role ?? "")) load();
	}, [authLoading, role, load]);

	if (authLoading || !LAP_ROLES.includes(role ?? "")) return null;

	return (
		<div>
			<div className="mb-6">
				<h1 className="text-2xl font-bold text-gray-900">Piutang</h1>
				<p className="text-gray-500 mt-1">
					Rekap tagihan belum lunas per customer, dikelompokkan berdasarkan umur jatuh tempo
				</p>
			</div>

			{/* Stat cards per aging bucket */}
			<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
				{BUCKET_ORDER.map((bucket) => {
					const Icon = BUCKET_ICON[bucket];
					const color = BUCKET_COLOR[bucket];
					const stat = bucketStats[bucket];
					return (
						<div
							key={bucket}
							className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
							<div className="flex items-center justify-between mb-4">
								<p className="text-sm text-gray-500">{AGING_BUCKET_CFG[bucket].label}</p>
								<div className={`${color.bg} p-2 rounded-xl`}>
									<Icon size={18} className={color.text} />
								</div>
							</div>
							<p className="text-xl font-bold text-gray-900">
								{formatRupiah(stat.nominal)}
							</p>
							<p className="text-xs text-gray-400 mt-1">{stat.jumlah} kiriman</p>
						</div>
					);
				})}
			</div>

			{/* Tabel per customer */}
			<div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
				<div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
					<Wallet size={16} className="text-red-500" />
					<h2 className="font-semibold text-gray-800">Piutang per Customer</h2>
					<span className="ml-auto text-sm text-gray-400">
						{customers.length} customer
					</span>
				</div>
				{loading ? (
					<div className="text-center py-12 text-gray-400">Memuat...</div>
				) : customers.length === 0 ? (
					<div className="text-center py-12 text-gray-400">
						Tidak ada piutang — semua kiriman sudah lunas
					</div>
				) : (
					<table className="w-full text-sm">
						<thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
							<tr>
								<th className="text-left px-5 py-3">Customer</th>
								<th className="text-center px-5 py-3">Kiriman</th>
								<th className="text-right px-5 py-3">Total Sisa</th>
								<th className="text-left px-5 py-3">Sebaran Umur</th>
								<th className="text-left px-5 py-3">Kiriman Tertua</th>
							</tr>
						</thead>
						<tbody className="divide-y divide-gray-50">
							{customers.map((c) => (
								<tr
									key={c.key}
									onClick={() => bukaDrillDown(c)}
									className="cursor-pointer hover:bg-gray-50 transition">
									<td className="px-5 py-3">
										<div className="flex items-center gap-1.5 font-medium text-gray-900">
											{c.nama}
											{c.tipe && (
												<span
													className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
														c.tipe === "korporat"
															? "bg-blue-100 text-blue-700"
															: "bg-gray-100 text-gray-600"
													}`}>
													{c.tipe === "korporat" ? "Korporat" : "Umum"}
												</span>
											)}
										</div>
									</td>
									<td className="px-5 py-3 text-center text-gray-600">
										{c.jumlahKiriman}
									</td>
									<td className="px-5 py-3 text-right font-bold text-red-600">
										{formatRupiah(c.totalSisa)}
									</td>
									<td className="px-5 py-3">
										<div className="flex flex-wrap gap-1">
											{BUCKET_ORDER.filter((b) => c.bucketNominal[b] > 0).map((b) => (
												<span
													key={b}
													className={`text-xs px-2 py-0.5 rounded-full font-medium ${BUCKET_COLOR[b].chip}`}>
													{AGING_BUCKET_CFG[b].label}: {formatRupiah(c.bucketNominal[b])}
												</span>
											))}
										</div>
									</td>
									<td className="px-5 py-3 text-gray-600">
										{formatDate(c.tanggalTertua)}
									</td>
								</tr>
							))}
						</tbody>
					</table>
				)}
			</div>

			{/* Drill-down per customer */}
			{selected && (
				<div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
					<div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl max-h-[90vh] flex flex-col">
						<div className="flex items-center justify-between p-6 border-b border-gray-100">
							<div>
								<h2 className="text-lg font-semibold flex items-center gap-2">
									{selected.nama}
									{selected.tipe && (
										<span
											className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
												selected.tipe === "korporat"
													? "bg-blue-100 text-blue-700"
													: "bg-gray-100 text-gray-600"
											}`}>
											{selected.tipe === "korporat" ? "Korporat" : "Umum"}
										</span>
									)}
								</h2>
								<p className="text-sm text-gray-500 mt-0.5">
									{selected.jumlahKiriman} kiriman belum lunas · Total sisa{" "}
									<span className="font-semibold text-red-600">
										{formatRupiah(selected.totalSisa)}
									</span>
								</p>
							</div>
							<div className="flex items-center gap-2 flex-shrink-0">
								<button
									onClick={() =>
										printTagihanCustomer({
											customer_nama: selected.nama,
											customer_tipe: selected.tipe,
											kiriman: selected.kiriman.map((k) => ({
												nomor_faktur: k.nomor_faktur,
												nomor_resi: k.nomor_resi,
												tanggal: k.tanggal,
												penerima_kota: k.penerima_kota,
												total_tagihan: k.total_tagihan,
												uang_dp: k.uang_dp,
											})),
										})
									}
									className="flex items-center gap-1.5 px-3 py-2 border border-gray-200 rounded-lg text-xs font-medium text-gray-600 hover:bg-gray-50 transition">
									<Printer size={14} /> Cetak Rekap Tagihan
								</button>
								<button
									onClick={() => setSelected(null)}
									className="p-2 hover:bg-gray-100 rounded-lg">
									<X size={18} />
								</button>
							</div>
						</div>
						<div className="flex-1 overflow-y-auto p-6">
							<label className="flex items-center gap-2 text-xs text-gray-500 mb-2 cursor-pointer select-none">
								<input
									type="checkbox"
									checked={selectedKiriman.size === selected.kiriman.length}
									onChange={toggleSemuaKiriman}
									className="rounded border-gray-300"
								/>
								Pilih semua
							</label>
							<div className="space-y-2">
								{selected.kiriman.map((k) => {
									const color = BUCKET_COLOR[k.bucket];
									return (
										<div
											key={k.id}
											className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-3 text-sm">
											<div className="flex items-center gap-3 min-w-0">
												<input
													type="checkbox"
													checked={selectedKiriman.has(k.id)}
													onChange={() => toggleKiriman(k.id)}
													className="rounded border-gray-300 flex-shrink-0"
												/>
												<div className="min-w-0">
													<Link
														href={`/dashboard/pengiriman/${k.id}`}
														className="font-mono text-xs font-medium text-indigo-600 hover:underline">
														{k.nomor_resi || k.nomor_faktur}
													</Link>
													<p className="text-xs text-gray-400 mt-0.5">
														{formatDate(k.tanggal)}
														{k.penerima_kota ? ` · ${k.penerima_kota}` : ""}
													</p>
												</div>
											</div>
											<div className="text-right flex-shrink-0">
												<p className="text-gray-500 text-xs">
													Tagihan {formatRupiah(k.total_tagihan)} · Terbayar{" "}
													{formatRupiah(k.uang_dp)}
												</p>
												<p className="font-bold text-red-600">
													Sisa {formatRupiah(k.sisa)}
												</p>
											</div>
											<span
												className={`text-xs px-2 py-0.5 rounded-full font-semibold ml-3 flex-shrink-0 ${color.chip}`}>
												{AGING_BUCKET_CFG[k.bucket].label}
											</span>
										</div>
									);
								})}
							</div>
						</div>

						{selectedKiriman.size > 0 && (
							<div className="border-t border-gray-100 p-6 space-y-3">
								<div className="flex items-center justify-between text-sm">
									<span className="text-gray-600">
										{selectedKiriman.size} kiriman dipilih
									</span>
									<span className="font-bold text-gray-900">
										Total {formatRupiah(totalTerpilih)}
									</span>
								</div>
								<div className="grid grid-cols-2 gap-3">
									<div>
										<label className="block text-xs font-medium text-gray-700 mb-1">
											Metode Bayar
										</label>
										<select
											value={pelunasanMassalForm.metode}
											onChange={(e) =>
												setPelunasanMassalForm((f) => ({
													...f,
													metode: e.target.value,
												}))
											}
											className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
											<option value="transfer">Transfer</option>
											<option value="cod">COD</option>
											<option value="cash">Cash</option>
										</select>
									</div>
									<div>
										<label className="block text-xs font-medium text-gray-700 mb-1">
											Catatan
										</label>
										<input
											value={pelunasanMassalForm.catatan}
											onChange={(e) =>
												setPelunasanMassalForm((f) => ({
													...f,
													catatan: e.target.value,
												}))
											}
											className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
										/>
									</div>
								</div>
								{pelunasanMassalError && (
									<div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2.5 rounded-xl text-sm">
										{pelunasanMassalError}
									</div>
								)}
								<button
									onClick={savePelunasanMassal}
									disabled={pelunasanMassalSaving}
									className="w-full flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 disabled:bg-green-300 text-white px-4 py-2.5 rounded-xl text-sm font-medium">
									<CreditCard size={15} />
									{pelunasanMassalSaving
										? "Menyimpan..."
										: `Catat Pelunasan ${selectedKiriman.size} Kiriman Terpilih`}
								</button>
							</div>
						)}
					</div>
				</div>
			)}
		</div>
	);
}
