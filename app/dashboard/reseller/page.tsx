"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Reseller } from "@/lib/types";
import {
	Plus,
	Search,
	Edit,
	Trash2,
	X,
	Phone,
	MapPin,
	User,
	Crown,
	Star,
	Shield,
	Award,
	ChevronRight,
	Link2,
	RefreshCw,
	Copy,
	Check,
	Landmark,
	AlertTriangle,
} from "lucide-react";
import { formatRupiah, waLink, cariKoreksiOtomatis } from "@/lib/utils";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";

// Charset sama dengan nomor resi — tanpa O/0/I/1
const TOKEN_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
function generateToken(len = 10): string {
	let result = "";
	for (let i = 0; i < len; i++)
		result += TOKEN_CHARS[Math.floor(Math.random() * TOKEN_CHARS.length)];
	return result;
}


type TierLevel = "reguler" | "silver" | "gold" | "platinum";
const TIER_META: Record<
	TierLevel,
	{ label: string; icon: any; badge: string }
> = {
	reguler: { label: "Reguler", icon: User, badge: "bg-gray-100 text-gray-500" },
	silver: {
		label: "Silver",
		icon: Shield,
		badge: "bg-slate-100 text-slate-600",
	},
	gold: { label: "Gold", icon: Star, badge: "bg-amber-100 text-amber-700" },
	platinum: {
		label: "Platinum",
		icon: Crown,
		badge: "bg-indigo-100 text-indigo-700",
	},
};
function TierBadge({ tier }: { tier: TierLevel }) {
	const m = TIER_META[tier];
	const Icon = m.icon;
	return (
		<span
			className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold ${m.badge}`}>
			<Icon size={10} />
			{m.label}
		</span>
	);
}

export default function ResellerPage() {
	const supabase = createClient();
	const { isSuperAdmin, role } = useAuth();
	const canBayarBonus =
		isSuperAdmin ||
		role === "keuangan" ||
		role === "kasir" ||
		role === "gudang" ||
		role === "kurir";
	const canAksesLinkReseller =
		canBayarBonus ||
		role === "kasir" ||
		role === "gudang" ||
		role === "kurir";
	const [resellers, setResellers] = useState<Reseller[]>([]);
	const [loading, setLoading] = useState(true);
	const [search, setSearch] = useState("");
	const [modal, setModal] = useState<"tambah" | "edit" | null>(null);
	const [selected, setSelected] = useState<Reseller | null>(null);
	const [form, setForm] = useState({
		nama: "",
		telepon: "",
		alamat: "",
		kota: "",
		catatan: "",
		nama_bank: "",
		no_rekening: "",
	});
	const [saving, setSaving] = useState(false);
	const [bonusModal, setBonusModal] = useState<Reseller | null>(null);
	const [bonusData, setBonusData] = useState<any[]>([]);
	const [bonusLoading, setBonusLoading] = useState(false);
	const [bayarBonus, setBayarBonus] = useState<Record<string, string>>({});
	const [savingBonus, setSavingBonus] = useState(false);
	const [bonusSummary, setBonusSummary] = useState<
		Record<string, { total: number; terbayar: number }>
	>({});
	const [filterBonus, setFilterBonus] = useState<
		"semua" | "ada_bonus" | "tidak_ada_bonus"
	>("semua");
	const [filterKota, setFilterKota] = useState("");
	const [filterDari, setFilterDari] = useState("");
	const [filterSampai, setFilterSampai] = useState("");
	const [omsetMap, setOmsetMap] = useState<Record<string, number>>({});
	const [thresholds, setThresholds] = useState({
		silver: 5_000_000,
		gold: 15_000_000,
		platinum: 30_000_000,
	});
	// token state: reseller.id → token string (dari DB, diisi saat loadResellers)
	const [tokenMap, setTokenMap] = useState<Record<string, string | null>>({});
	const [tokenLoading, setTokenLoading] = useState<string | null>(null); // id reseller yang sedang diproses
	const [copiedId, setCopiedId] = useState<string | null>(null);

	const hitungTier = (omset: number): TierLevel => {
		if (omset >= thresholds.platinum) return "platinum";
		if (omset >= thresholds.gold) return "gold";
		if (omset >= thresholds.silver) return "silver";
		return "reguler";
	};

	useEffect(() => {
		loadResellers();
		loadTierData();
	}, []);

	const loadTierData = async () => {
		const now = new Date();
		const y = now.getFullYear();
		const m = now.getMonth() + 1;
		const awal = `${y}-${String(m).padStart(2, "0")}-01`;
		const lastDay = new Date(y, m, 0).getDate();
		const akhir = `${y}-${String(m).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}T23:59:59`;

		const [pjRes, settingRes] = await Promise.all([
			supabase
				.from("penjualan")
				.select("reseller_id, total_harga_jual")
				.not("reseller_id", "is", null)
				.gte("tanggal", awal)
				.lte("tanggal", akhir),
			supabase
				.from("owner_settings")
				.select("key, value")
				.in("key", ["tier_silver_min", "tier_gold_min", "tier_platinum_min"]),
		]);

		const map: Record<string, number> = {};
		for (const p of pjRes.data || []) {
			map[p.reseller_id] =
				(map[p.reseller_id] || 0) + (p.total_harga_jual || 0);
		}
		setOmsetMap(map);

		if (settingRes.data?.length) {
			const s = Object.fromEntries(
				settingRes.data.map((r: any) => [r.key, Number(r.value)]),
			);
			setThresholds({
				silver: s.tier_silver_min || 5_000_000,
				gold: s.tier_gold_min || 15_000_000,
				platinum: s.tier_platinum_min || 30_000_000,
			});
		}
	};

	useEffect(() => {
		loadBonusSummary(filterDari, filterSampai);
	}, [filterDari, filterSampai]);

	const loadBonusSummary = async (dari: string, sampai: string) => {
		let query = supabase
			.from("penjualan")
			.select("reseller_id, total_bonus, bonus_owner, bonus_terbayar, status_bayar")
			.not("reseller_id", "is", null)
			.or("total_bonus.gt.0,bonus_owner.gt.0");
		if (dari) query = query.gte("tanggal", dari);
		if (sampai) query = query.lte("tanggal", sampai + "T23:59:59");
		const { data: bonusRows } = await query;
		const summary: Record<string, { total: number; terbayar: number }> = {};
		for (const row of bonusRows || []) {
			// Bonus baru terhitung setelah nota lunas
			if (row.status_bayar !== "lunas") continue;
			if (!summary[row.reseller_id])
				summary[row.reseller_id] = { total: 0, terbayar: 0 };
			summary[row.reseller_id].total +=
				row.total_bonus + (row.bonus_owner || 0);
			summary[row.reseller_id].terbayar += row.bonus_terbayar || 0;
		}
		setBonusSummary(summary);
	};

	const loadResellers = async () => {
		const { data } = await supabase
			.from("resellers")
			.select("*, token")
			.eq("aktif", true)
			.order("nama");
		setResellers(data || []);
		// Bangun token map
		const tmap: Record<string, string | null> = {};
		for (const r of data || []) tmap[r.id] = r.token || null;
		setTokenMap(tmap);
		await loadBonusSummary(filterDari, filterSampai);
		setLoading(false);
	};

	const openTambah = () => {
		setForm({
			nama: "",
			telepon: "",
			alamat: "",
			kota: "",
			catatan: "",
			nama_bank: "",
			no_rekening: "",
		});
		setSelected(null);
		setModal("tambah");
	};

	const openEdit = (r: Reseller) => {
		setForm({
			nama: r.nama,
			telepon: r.telepon || "",
			alamat: r.alamat || "",
			kota: r.kota || "",
			catatan: r.catatan || "",
			nama_bank: r.nama_bank || "",
			no_rekening: r.no_rekening || "",
		});
		setSelected(r);
		setModal("edit");
	};

	const save = async () => {
		setSaving(true);
		if (modal === "tambah") {
			await supabase.from("resellers").insert(form);
		} else if (selected) {
			await supabase.from("resellers").update(form).eq("id", selected.id);
		}
		setSaving(false);
		setModal(null);
		loadResellers();
	};

	const hapus = async (id: string) => {
		if (!confirm("Yakin hapus reseller ini?")) return;
		await supabase.from("resellers").update({ aktif: false }).eq("id", id);
		loadResellers();
	};

	const openBonus = async (r: Reseller) => {
		setBonusModal(r);
		setBonusLoading(true);
		setBayarBonus({});
		const { data } = await supabase
			.from("penjualan")
			.select(
				"id, nomor_faktur, tanggal, total_bonus, bonus_owner, catatan_bonus_owner, bonus_terbayar, status_bayar, penjualan_item(jumlah, produk(nama))",
			)
			.eq("reseller_id", r.id)
			.or("total_bonus.gt.0,bonus_owner.gt.0")
			.order("tanggal", { ascending: false });
		setBonusData(data || []);
		setBonusLoading(false);
	};

	const saveBayarBonus = async (
		penjualanId: string,
		currentTerbayar: number,
		totalBonus: number,
	) => {
		const tambahan = Number(bayarBonus[penjualanId]);
		if (!tambahan || tambahan <= 0) return;
		setSavingBonus(true);
		const terbayarBaru = Math.min(currentTerbayar + tambahan, totalBonus);
		await supabase
			.from("penjualan")
			.update({ bonus_terbayar: terbayarBaru })
			.eq("id", penjualanId);
		const { data } = await supabase
			.from("penjualan")
			.select(
				"id, nomor_faktur, tanggal, total_bonus, bonus_owner, catatan_bonus_owner, bonus_terbayar, status_bayar, penjualan_item(jumlah, produk(nama))",
			)
			.eq("reseller_id", bonusModal!.id)
			.or("total_bonus.gt.0,bonus_owner.gt.0")
			.order("tanggal", { ascending: false });
		setBonusData(data || []);
		setBayarBonus((prev) => ({ ...prev, [penjualanId]: "" }));
		setSavingBonus(false);
	};

	const generateLink = async (resellerId: string) => {
		setTokenLoading(resellerId);
		const token = generateToken();
		await supabase.from("resellers").update({ token }).eq("id", resellerId);
		setTokenMap((prev) => ({ ...prev, [resellerId]: token }));
		setTokenLoading(null);
	};

	const resetLink = async (resellerId: string) => {
		if (!confirm("Reset link reseller ini? Link lama akan tidak bisa diakses."))
			return;
		setTokenLoading(resellerId);
		const token = generateToken();
		await supabase.from("resellers").update({ token }).eq("id", resellerId);
		setTokenMap((prev) => ({ ...prev, [resellerId]: token }));
		setTokenLoading(null);
	};

	const copyLink = async (resellerId: string, token: string) => {
		const url = `${window.location.origin}/r/${token}`;
		await navigator.clipboard.writeText(url);
		setCopiedId(resellerId);
		setTimeout(() => setCopiedId(null), 2000);
	};

	const kotaList = Array.from(
		new Set(resellers.map((r) => r.kota).filter(Boolean)),
	).sort() as string[];

	const filtered = resellers
		.filter(
			(r) =>
				r.nama.toLowerCase().includes(search.toLowerCase()) ||
				(r.kota || "").toLowerCase().includes(search.toLowerCase()) ||
				(r.telepon || "").includes(search),
		)
		.filter((r) => !filterKota || r.kota === filterKota)
		.filter((r) => {
			if (filterBonus === "ada_bonus") return !!bonusSummary[r.id];
			if (filterBonus === "tidak_ada_bonus") return !bonusSummary[r.id];
			return true;
		});

	// Bonus baru terhitung setelah nota lunas
	const bonusDataLunas = bonusData.filter((p) => p.status_bayar === "lunas");
	const totalBonusTransaksi = bonusDataLunas.reduce(
		(s, p) => s + p.total_bonus + (p.bonus_owner || 0),
		0,
	);
	const totalTerbayarBonus = bonusDataLunas.reduce(
		(s, p) => s + (p.bonus_terbayar || 0),
		0,
	);
	const referensiKoreksi = cariKoreksiOtomatis(totalBonusTransaksi);
	const totalKoreksi = referensiKoreksi
		? referensiKoreksi.admin + referensiKoreksi.asisten + referensiKoreksi.team
		: 0;
	const totalBonusBersih = totalBonusTransaksi - totalKoreksi;
	const sisaBonusBersih = totalBonusBersih - totalTerbayarBonus;

	return (
		<div>
			<div className="flex items-center justify-between mb-8">
				<div>
					<h1 className="text-2xl font-bold text-gray-900">Reseller</h1>
					<p className="text-gray-500 mt-1">
						{filtered.length !== resellers.length
							? `${filtered.length} dari ${resellers.length} reseller`
							: `${resellers.length} reseller aktif`}
						{filterKota && (
							<span className="ml-2 text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full font-medium">
								{filterKota}
							</span>
						)}
					</p>
				</div>
				<button
					onClick={openTambah}
					className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition">
					<Plus size={16} /> Tambah Reseller
				</button>
			</div>

			<div className="relative mb-6">
				<div className="flex flex-wrap gap-3 mb-4">
					<div className="relative flex-1 min-w-48">
						<Search
							size={16}
							className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
						/>
						<input
							value={search}
							onChange={(e) => setSearch(e.target.value)}
							placeholder="Cari nama, kota, atau telepon..."
							className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
						/>
					</div>
					<div className="flex rounded-xl border border-gray-200 overflow-hidden">
						{[
							{ v: "semua", label: "Semua" },
							{ v: "ada_bonus", label: "Ada Bonus" },
							{ v: "tidak_ada_bonus", label: "Tanpa Bonus" },
						].map((opt) => (
							<button
								key={opt.v}
								onClick={() => setFilterBonus(opt.v as any)}
								className={`px-4 py-2.5 text-sm font-medium transition ${filterBonus === opt.v ? "bg-indigo-600 text-white" : "bg-white text-gray-600 hover:bg-gray-50"}`}>
								{opt.label}
							</button>
						))}
					</div>
				</div>
				{/* Filter kota */}
				{kotaList.length > 0 && (
					<div className="flex flex-wrap items-center gap-2 mb-4">
						<span className="text-sm text-gray-500 font-medium flex items-center gap-1.5">
							<MapPin size={13} /> Kota:
						</span>
						<button
							onClick={() => setFilterKota("")}
							className={`px-3 py-1.5 rounded-full text-xs font-semibold transition ${
								!filterKota
									? "bg-indigo-600 text-white"
									: "bg-gray-100 text-gray-600 hover:bg-gray-200"
							}`}>
							Semua
							{!filterKota && (
								<span className="ml-1.5 bg-indigo-500 text-white text-[10px] px-1.5 py-0.5 rounded-full">
									{resellers.length}
								</span>
							)}
						</button>
						{kotaList.map((kota) => {
							const count = resellers.filter((r) => r.kota === kota).length;
							return (
								<button
									key={kota}
									onClick={() => setFilterKota(filterKota === kota ? "" : kota)}
									className={`px-3 py-1.5 rounded-full text-xs font-semibold transition flex items-center gap-1.5 ${
										filterKota === kota
											? "bg-indigo-600 text-white"
											: "bg-gray-100 text-gray-600 hover:bg-gray-200"
									}`}>
									{kota}
									<span
										className={`text-[10px] px-1.5 py-0.5 rounded-full ${filterKota === kota ? "bg-indigo-500 text-white" : "bg-gray-200 text-gray-500"}`}>
										{count}
									</span>
								</button>
							);
						})}
					</div>
				)}

				{/* Filter tanggal bonus */}
				<div className="flex flex-wrap items-center gap-3 mb-6">
					<span className="text-sm text-gray-500 font-medium">
						Filter bonus:
					</span>
					<div className="flex items-center gap-2">
						<input
							type="date"
							value={filterDari}
							onChange={(e) => setFilterDari(e.target.value)}
							className="px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
						/>
						<span className="text-gray-400 text-sm">–</span>
						<input
							type="date"
							value={filterSampai}
							onChange={(e) => setFilterSampai(e.target.value)}
							className="px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
						/>
					</div>
					{(filterDari || filterSampai) && (
						<button
							onClick={() => {
								setFilterDari("");
								setFilterSampai("");
							}}
							className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1 transition">
							<X size={12} /> Reset tanggal
						</button>
					)}
				</div>
			</div>

			<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
				{loading ? (
					<p className="col-span-3 text-center py-12 text-gray-400">
						Memuat...
					</p>
				) : filtered.length === 0 ? (
					<p className="col-span-3 text-center py-12 text-gray-400">
						Tidak ada reseller
					</p>
				) : (
					filtered.map((r) => (
						<div
							key={r.id}
							className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition">
							<div className="flex items-start justify-between mb-3">
								<div className="flex items-center gap-3">
									<div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center text-indigo-600 font-bold">
										{r.nama.charAt(0).toUpperCase()}
									</div>
									<div>
										<div className="flex items-center gap-2">
											<p className="font-semibold text-gray-900">{r.nama}</p>
											<TierBadge tier={hitungTier(omsetMap[r.id] || 0)} />
										</div>
										{r.kota && (
											<p className="text-xs text-gray-500 flex items-center gap-1">
												<MapPin size={10} />
												{r.kota}
											</p>
										)}
									</div>
								</div>
								<div className="flex gap-1">
									<button
										onClick={() => openEdit(r)}
										className="p-1.5 hover:bg-yellow-50 rounded-lg text-yellow-600 transition">
										<Edit size={14} />
									</button>

									<button
										onClick={() => hapus(r.id)}
										className="p-1.5 hover:bg-red-50 rounded-lg text-red-500 transition">
										<Trash2 size={14} />
									</button>
								</div>
							</div>
							{r.telepon && (
								<p className="text-sm text-gray-500 flex items-center gap-2 mt-2">
									<Phone size={13} /> {r.telepon}
								</p>
							)}
							{r.alamat && (
								<p className="text-xs text-gray-400 mt-1 line-clamp-2">
									{r.alamat}
								</p>
							)}
							{(r.nama_bank || r.no_rekening) && (
								<p className="text-xs text-gray-500 flex items-center gap-2 mt-1">
									<Landmark size={13} />
									{r.nama_bank}
									{r.nama_bank && r.no_rekening && " - "}
									{r.no_rekening}
								</p>
							)}
							{r.catatan && (
								<p className="text-xs text-indigo-500 mt-2 bg-indigo-50 px-2 py-1 rounded-lg">
									{r.catatan}
								</p>
							)}
							<div className="mt-3 pt-3 border-t border-gray-100">
								{bonusSummary[r.id] && (
									<div className="grid grid-cols-2 gap-2 mb-2 text-xs">
										<div className="bg-green-50 rounded-lg px-3 py-2">
											<p className="text-gray-500">Terbayar</p>
											<p className="font-bold text-green-600">
												{formatRupiah(bonusSummary[r.id].terbayar)}
											</p>
										</div>
										<div className="bg-red-50 rounded-lg px-3 py-2">
											<p className="text-gray-500">Belum Dibayar</p>
											<p className="font-bold text-red-600">
												{formatRupiah(
													bonusSummary[r.id].total -
														bonusSummary[r.id].terbayar,
												)}
											</p>
										</div>
									</div>
								)}
								<button
									onClick={() => openBonus(r)}
									className="w-full flex items-center justify-between text-xs px-3 py-2 rounded-lg bg-purple-50 hover:bg-purple-100 transition mb-1.5">
									<span className="text-purple-700 font-medium">
										Lihat Bonus
									</span>
									<span className="text-purple-600">Klik untuk detail →</span>
								</button>
								<Link
									href="/dashboard/reseller/tier"
									className="w-full flex items-center justify-between text-xs px-3 py-2 rounded-lg bg-indigo-50 hover:bg-indigo-100 transition mb-1.5">
									<span className="text-indigo-700 font-medium flex items-center gap-1.5">
										<Award size={11} />
										Riwayat Tier
									</span>
									<ChevronRight size={12} className="text-indigo-400" />
								</Link>

								{/* Token / Link Reseller — superadmin, keuangan, kasir, gudang, pengiriman */}
								{canAksesLinkReseller &&
									(tokenMap[r.id] ? (
										<div className="flex gap-1.5">
											<button
												onClick={() => copyLink(r.id, tokenMap[r.id]!)}
												className="flex-1 flex items-center justify-center gap-1.5 text-xs px-3 py-2 rounded-lg bg-green-50 hover:bg-green-100 text-green-700 font-medium transition">
												{copiedId === r.id ? (
													<Check size={11} />
												) : (
													<Copy size={11} />
												)}
												{copiedId === r.id ? "Tersalin!" : "Salin Link"}
											</button>
											<button
												onClick={() => resetLink(r.id)}
												disabled={tokenLoading === r.id}
												title="Reset link — link lama tidak aktif"
												className="flex items-center justify-center gap-1 text-xs px-2.5 py-2 rounded-lg bg-gray-100 hover:bg-red-50 text-gray-500 hover:text-red-600 transition disabled:opacity-50">
												<RefreshCw
													size={11}
													className={
														tokenLoading === r.id ? "animate-spin" : ""
													}
												/>
											</button>
										</div>
									) : (
										<button
											onClick={() => generateLink(r.id)}
											disabled={tokenLoading === r.id}
											className="w-full flex items-center justify-center gap-1.5 text-xs px-3 py-2 rounded-lg bg-gray-100 hover:bg-green-50 text-gray-500 hover:text-green-700 font-medium transition disabled:opacity-50">
											<Link2
												size={11}
												className={tokenLoading === r.id ? "animate-spin" : ""}
											/>
											{tokenLoading === r.id
												? "Membuat link..."
												: "Buat Link Akses"}
										</button>
									))}
							</div>
						</div>
					))
				)}
			</div>

			{/* Modal */}
			{modal && (
				<div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
					<div className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
						<div className="flex items-center justify-between p-6 border-b border-gray-100">
							<h2 className="text-lg font-semibold">
								{modal === "tambah" ? "Tambah Reseller" : "Edit Reseller"}
							</h2>
							<button
								onClick={() => setModal(null)}
								className="p-2 hover:bg-gray-100 rounded-lg">
								<X size={18} />
							</button>
						</div>
						<div className="p-6 space-y-4">
							{[
								{
									key: "nama",
									label: "Nama Reseller *",
									placeholder: "Nama reseller",
								},
								{ key: "telepon", label: "Telepon", placeholder: "08xx" },
								{ key: "kota", label: "Kota", placeholder: "Kota domisili" },
								{
									key: "alamat",
									label: "Alamat",
									placeholder: "Alamat lengkap",
								},
								{
									key: "nama_bank",
									label: "Nama Bank",
									placeholder: "mis. BCA, Mandiri, BRI",
								},
								{
									key: "no_rekening",
									label: "No. Rekening",
									placeholder: "Nomor rekening",
								},
								{
									key: "catatan",
									label: "Catatan",
									placeholder: "Catatan tambahan",
								},
							].map((f) => (
								<div key={f.key}>
									<label className="block text-sm font-medium text-gray-700 mb-1">
										{f.label}
									</label>
									<input
										value={(form as any)[f.key]}
										onChange={(e) =>
											setForm({ ...form, [f.key]: e.target.value })
										}
										placeholder={f.placeholder}
										className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
									/>
								</div>
							))}
						</div>
						<div className="flex gap-3 p-6 pt-0">
							<button
								onClick={() => setModal(null)}
								className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium hover:bg-gray-50">
								Batal
							</button>
							<button
								onClick={save}
								disabled={saving || !form.nama}
								className="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white px-4 py-2.5 rounded-xl text-sm font-medium">
								{saving ? "Menyimpan..." : "Simpan"}
							</button>
						</div>
					</div>
				</div>
			)}
			{bonusModal && (
				<div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
					<div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl max-h-[85vh] flex flex-col">
						<div className="flex items-center justify-between p-6 border-b border-gray-100">
							<div>
								<h2 className="text-lg font-semibold">Bonus Reseller</h2>
								<p className="text-sm text-gray-500">{bonusModal.nama}</p>
							</div>
							<button
								onClick={() => setBonusModal(null)}
								className="p-2 hover:bg-gray-100 rounded-lg">
								<X size={18} />
							</button>
						</div>
						<div className="flex-1 overflow-y-auto p-6 space-y-3">
							{bonusLoading ? (
								<p className="text-center text-gray-400 py-8">Memuat...</p>
							) : bonusData.length === 0 ? (
								<p className="text-center text-gray-400 py-8">
									Tidak ada bonus
								</p>
							) : (
								bonusData.map((p) => {
									const terbayar = p.bonus_terbayar || 0;
									const bonusOwner = p.bonus_owner || 0;
									const totalBonusFull = p.total_bonus + bonusOwner;
									const sisa = totalBonusFull - terbayar;
									const notaBelumLunas = p.status_bayar !== "lunas";
									const lunas = !notaBelumLunas && sisa <= 0;
									const namaBarang = (p.penjualan_item || [])
										.map((it: any) => it.produk?.nama)
										.filter(Boolean)
										.join(", ");
									return (
										<div
											key={p.id}
											className={`rounded-xl border p-4 ${notaBelumLunas ? "border-gray-200 bg-gray-50" : lunas ? "border-green-200 bg-green-50" : "border-gray-200 bg-gray-50"}`}>
											<div className="flex items-center justify-between mb-2">
												<div>
													<Link
														href={`/dashboard/penjualan/${p.id}`}
														className="font-mono text-xs font-medium text-indigo-600 hover:underline">
														{p.nomor_faktur}
													</Link>
													{namaBarang && (
														<p className="text-xs text-gray-500 mt-0.5">
															{namaBarang}
														</p>
													)}
												</div>
												<div className="flex items-center gap-1.5">
													{bonusOwner > 0 && (
														<span className="text-xs px-2 py-0.5 rounded-full font-medium bg-amber-100 text-amber-700">
															+Bonus Owner
														</span>
													)}
													<span
														className={`text-xs px-2 py-0.5 rounded-full font-medium ${notaBelumLunas ? "bg-gray-200 text-gray-500" : lunas ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"}`}>
														{notaBelumLunas ? "Nota Belum Lunas" : lunas ? "Lunas" : "Belum Lunas"}
													</span>
												</div>
											</div>
											{notaBelumLunas && (
												<p className="text-xs text-gray-400 mb-2 flex items-center gap-1.5">
													<AlertTriangle size={12} className="flex-shrink-0" />
													Nota belum lunas — bonus {formatRupiah(totalBonusFull)}{" "}
													belum terhitung
												</p>
											)}
											{bonusOwner > 0 && (
												<div className="flex items-center gap-2 mb-2 px-2 py-1.5 bg-amber-50 rounded-lg border border-amber-100">
													<span className="text-xs text-amber-700 font-medium">
														Bonus dari Owner: {formatRupiah(bonusOwner)}
													</span>
													{p.catatan_bonus_owner && (
														<span className="text-xs text-amber-500">
															— {p.catatan_bonus_owner}
														</span>
													)}
												</div>
											)}
											<div className="grid grid-cols-3 gap-2 text-sm mb-3">
												<div>
													<p className="text-xs text-gray-500">Total Bonus</p>
													<p className="font-semibold text-purple-600">
														{formatRupiah(totalBonusFull)}
													</p>
												</div>
												<div>
													<p className="text-xs text-gray-500">Terbayar</p>
													<p className="font-semibold text-green-600">
														{formatRupiah(terbayar)}
													</p>
												</div>
												<div>
													<p className="text-xs text-gray-500">Sisa</p>
													<p
														className={`font-semibold ${lunas ? "text-gray-400" : "text-red-600"}`}>
														{formatRupiah(sisa)}
													</p>
												</div>
											</div>
											{!lunas && !notaBelumLunas && canBayarBonus && (
												<div className="flex gap-2">
													<input
														type="number"
														placeholder={`Bayar (maks ${formatRupiah(sisa)})`}
														value={bayarBonus[p.id] || ""}
														onChange={(e) =>
															setBayarBonus((prev) => ({
																...prev,
																[p.id]: e.target.value,
															}))
														}
														className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-purple-500"
													/>
													<button
														onClick={() =>
															saveBayarBonus(p.id, terbayar, totalBonusFull)
														}
														className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-300 text-white rounded-lg text-sm font-medium transition">
														{savingBonus ? "..." : "Bayar"}
													</button>
												</div>
											)}
										</div>
									);
								})
							)}
						</div>

						{/* Ringkasan total */}
						{bonusData.length > 0 && (
							<div className="p-4 border-t border-gray-100 bg-gray-50 rounded-b-2xl space-y-3">
								{canBayarBonus && (
									<div className="bg-white rounded-xl border border-gray-200 p-3 space-y-2">
										<p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
											Koreksi Titipan (otomatis sesuai tabel, tidak disimpan)
										</p>
										{referensiKoreksi ? (
											<div className="space-y-1 text-xs">
												<p className="text-gray-400">
													Interval {formatRupiah(referensiKoreksi.min)}–
													{formatRupiah(referensiKoreksi.max)}
												</p>
												<div className="grid grid-cols-3 gap-2">
													<div className="bg-gray-50 rounded-lg p-2 text-center">
														<p className="text-[11px] text-gray-400">Admin</p>
														<p className="font-semibold text-red-500">
															− {formatRupiah(referensiKoreksi.admin)}
														</p>
													</div>
													<div className="bg-gray-50 rounded-lg p-2 text-center">
														<p className="text-[11px] text-gray-400">Asisten</p>
														<p className="font-semibold text-red-500">
															− {formatRupiah(referensiKoreksi.asisten)}
														</p>
													</div>
													<div className="bg-gray-50 rounded-lg p-2 text-center">
														<p className="text-[11px] text-gray-400">
															Sedekah Mimbar
														</p>
														<p className="font-semibold text-red-500">
															− {formatRupiah(referensiKoreksi.team)}
														</p>
													</div>
												</div>
											</div>
										) : (
											<p className="text-[11px] text-gray-400">
												Bonus kotor {formatRupiah(totalBonusTransaksi)} di luar
												tabel referensi (300rb–15jt) — tidak ada koreksi.
											</p>
										)}
									</div>
								)}

								<div className="grid grid-cols-3 gap-3 text-sm">
									<div className="text-center">
										<p className="text-xs text-gray-500">Total Bonus</p>
										<p className="font-bold text-purple-600">
											{formatRupiah(totalBonusBersih)}
										</p>
									</div>
									<div className="text-center">
										<p className="text-xs text-gray-500">Terbayar</p>
										<p className="font-bold text-green-600">
											{formatRupiah(totalTerbayarBonus)}
										</p>
									</div>
									<div className="text-center">
										<p className="text-xs text-gray-500">Sisa</p>
										<p className="font-bold text-red-600">
											{formatRupiah(Math.max(0, sisaBonusBersih))}
										</p>
									</div>
								</div>
								{totalKoreksi > 0 && (
									<p className="text-[11px] text-gray-400 text-center">
										Bonus kotor {formatRupiah(totalBonusTransaksi)} − koreksi{" "}
										{formatRupiah(totalKoreksi)} ={" "}
										{formatRupiah(totalBonusBersih)}
									</p>
								)}
							</div>
						)}
					</div>
				</div>
			)}
		</div>
	);
}
