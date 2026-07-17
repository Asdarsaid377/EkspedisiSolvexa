"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Pengiriman, JenisLayanan } from "@/lib/types";
import {
	formatRupiah,
	formatDate,
	waLink,
	insertPengirimanWithResi,
	exportToExcel,
} from "@/lib/utils";
import { printPengirimanInvoice } from "@/lib/printPengirimanInvoice";
import Link from "next/link";
import {
	Plus,
	Search,
	X,
	Trash2,
	Eye,
	CreditCard,
	AlertCircle,
	Printer,
	CheckCircle2,
	Link2,
	Copy,
	FileSpreadsheet,
	Calendar,
	Clock,
	Truck,
	Zap,
	Package,
	Send,
	MapPin,
	Phone,
	User,
	Weight,
} from "lucide-react";

const JENIS_LAYANAN_CFG: Record<
	JenisLayanan,
	{ label: string; icon: any; color: string }
> = {
	reguler: { label: "Reguler", icon: Package, color: "bg-blue-100 text-blue-700" },
	express: { label: "Express", icon: Zap, color: "bg-amber-100 text-amber-700" },
	kargo: { label: "Kargo", icon: Truck, color: "bg-purple-100 text-purple-700" },
};

const emptyForm = {
	jenis_layanan: "reguler" as JenisLayanan,
	pengirim_nama: "",
	pengirim_telepon: "",
	pengirim_alamat: "",
	pengirim_kota: "",
	penerima_nama: "",
	penerima_telepon: "",
	penerima_alamat: "",
	penerima_kota: "",
	berat_kg: "1",
	panjang_cm: "",
	lebar_cm: "",
	tinggi_cm: "",
	isi_barang: "",
	nilai_barang: "0",
	ongkir: "0",
	biaya_asuransi: "0",
	metode_bayar: "transfer",
	status_bayar: "belum_bayar",
	uang_dp: "0",
	petugas_nama: "",
	petugas_telepon: "",
	catatan: "",
};

export default function PengirimanPage() {
	const { isSuperAdmin, role } = useAuth();
	const supabase = createClient();
	const [list, setList] = useState<any[]>([]);
	const [loading, setLoading] = useState(true);
	const [search, setSearch] = useState("");
	const [filterStatus, setFilterStatus] = useState<"semua" | "belum_lunas">(
		"semua",
	);
	const [filterMilestone, setFilterMilestone] = useState<
		"semua" | "diproses" | "dijemput" | "dikirim" | "selesai"
	>("semua");
	const [filterTanggal, setFilterTanggal] = useState({ dari: "", sampai: "" });
	const [modal, setModal] = useState<"form" | "pelunasan" | null>(null);
	const [form, setForm] = useState(emptyForm);
	const [saving, setSaving] = useState(false);
	const [selected, setSelected] = useState<any | null>(null);

	// Pelunasan form
	const [pelunasanForm, setPelunasanForm] = useState({
		tambahan_bayar: "",
		metode_bayar: "transfer",
		catatan: "",
	});
	const [buktiFile, setBuktiFile] = useState<File | null>(null);
	const [buktiPreview, setBuktiPreview] = useState<string | null>(null);

	// Modal sukses resi
	const [resiSukses, setResiSukses] = useState<string | null>(null);
	const [resiTeleponPenerima, setResiTeleponPenerima] = useState<string | null>(
		null,
	);

	// Fase 2 — pricing engine: hasil lookup tarif_zona untuk reguler/express
	const [tarifInfo, setTarifInfo] = useState<{
		found: boolean;
		estimasi_hari?: number | null;
	} | null>(null);
	const [tarifLoading, setTarifLoading] = useState(false);

	useEffect(() => {
		// Kargo selalu manual quote — tidak pernah lookup tarif_zona (keputusan Fase 1)
		if (form.jenis_layanan === "kargo") {
			setTarifInfo(null);
			return;
		}
		const asal = form.pengirim_kota.trim();
		const tujuan = form.penerima_kota.trim();
		if (!asal || !tujuan) {
			setTarifInfo(null);
			return;
		}

		let cancelled = false;
		const lookup = async () => {
			setTarifLoading(true);
			const { data } = await supabase
				.from("tarif_zona")
				.select("harga_per_kg, harga_flat_min, estimasi_hari")
				.ilike("kota_asal", asal)
				.ilike("kota_tujuan", tujuan)
				.eq("jenis_layanan", form.jenis_layanan)
				.eq("aktif", true)
				.maybeSingle();
			if (cancelled) return;
			setTarifLoading(false);

			if (!data) {
				setTarifInfo({ found: false });
				return;
			}

			const beratAktual = Number(form.berat_kg) || 0;
			const beratVolumetrik =
				form.panjang_cm && form.lebar_cm && form.tinggi_cm
					? (Number(form.panjang_cm) * Number(form.lebar_cm) * Number(form.tinggi_cm)) /
						6000
					: 0;
			const beratEfektif = Math.max(beratAktual, beratVolumetrik);
			const ongkirOtomatis = Math.round(
				Math.max(data.harga_per_kg * beratEfektif, data.harga_flat_min),
			);

			setForm((f) => ({ ...f, ongkir: String(ongkirOtomatis) }));
			setTarifInfo({ found: true, estimasi_hari: data.estimasi_hari });
		};
		lookup();
		return () => {
			cancelled = true;
		};
	}, [
		form.jenis_layanan,
		form.pengirim_kota,
		form.penerima_kota,
		form.berat_kg,
		form.panjang_cm,
		form.lebar_cm,
		form.tinggi_cm,
	]);

	useEffect(() => {
		const now = new Date();
		const sampai = now.toISOString().split("T")[0];
		const dari = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate())
			.toISOString()
			.split("T")[0];
		setFilterTanggal({ dari, sampai });
		loadAll();
	}, []);

	const loadAll = async () => {
		const { data } = await supabase
			.from("pengiriman")
			.select("*")
			.order("created_at", { ascending: false })
			.limit(200);
		setList(data || []);
		setLoading(false);
	};

	const openForm = () => {
		setForm(emptyForm);
		setTarifInfo(null);
		setModal("form");
	};

	const totalTagihanForm =
		(Number(form.ongkir) || 0) + (Number(form.biaya_asuransi) || 0);

	const saveForm = async () => {
		if (!form.pengirim_nama.trim() || !form.penerima_nama.trim()) return;
		setSaving(true);

		const { data: pg, error } = await insertPengirimanWithResi(supabase, {
			jenis_layanan: form.jenis_layanan,
			pengirim_nama: form.pengirim_nama,
			pengirim_telepon: form.pengirim_telepon || null,
			pengirim_alamat: form.pengirim_alamat || null,
			pengirim_kota: form.pengirim_kota || null,
			penerima_nama: form.penerima_nama,
			penerima_telepon: form.penerima_telepon || null,
			penerima_alamat: form.penerima_alamat || null,
			penerima_kota: form.penerima_kota || null,
			berat_kg: Number(form.berat_kg) || 0,
			panjang_cm: form.panjang_cm ? Number(form.panjang_cm) : null,
			lebar_cm: form.lebar_cm ? Number(form.lebar_cm) : null,
			tinggi_cm: form.tinggi_cm ? Number(form.tinggi_cm) : null,
			isi_barang: form.isi_barang || null,
			nilai_barang: Number(form.nilai_barang) || 0,
			ongkir: Number(form.ongkir) || 0,
			biaya_asuransi: Number(form.biaya_asuransi) || 0,
			total_tagihan: totalTagihanForm,
			metode_bayar: form.metode_bayar,
			status_bayar: form.status_bayar,
			uang_dp: Number(form.uang_dp) || 0,
			petugas_nama: form.petugas_nama || null,
			petugas_telepon: form.petugas_telepon || null,
			catatan: form.catatan || null,
		});

		if (error || !pg) {
			setSaving(false);
			return;
		}

		const jumlahBayarAwal =
			form.status_bayar === "lunas"
				? totalTagihanForm
				: Number(form.uang_dp) || 0;
		if (jumlahBayarAwal > 0) {
			await supabase.from("pengiriman_pembayaran").insert({
				pengiriman_id: pg.id,
				jumlah: jumlahBayarAwal,
				metode: form.metode_bayar,
				catatan: form.status_bayar === "dp" ? "DP awal" : null,
			});
		}

		setSaving(false);
		setModal(null);
		setResiSukses(pg.nomor_resi);
		setResiTeleponPenerima(form.penerima_telepon || null);
		loadAll();
	};

	const openPelunasan = (p: any) => {
		const sisa = p.total_tagihan - p.uang_dp;
		setSelected({ ...p, sisa_tagihan: sisa });
		setPelunasanForm({
			tambahan_bayar: String(sisa),
			metode_bayar: "transfer",
			catatan: "",
		});
		setBuktiFile(null);
		setBuktiPreview(null);
		setModal("pelunasan");
	};

	const savePelunasan = async () => {
		if (!selected) return;
		setSaving(true);
		const tambahan = Number(pelunasanForm.tambahan_bayar);
		const totalDibayar = selected.uang_dp + tambahan;
		const statusBaru = totalDibayar >= selected.total_tagihan ? "lunas" : "dp";

		let foto_url: string | null = null;
		if (buktiFile) {
			const ext = buktiFile.name.split(".").pop();
			const path = `pengiriman-pembayaran/${selected.id}/${Date.now()}.${ext}`;
			const { error: upErr } = await supabase.storage
				.from("BungaNaik")
				.upload(path, buktiFile);
			if (!upErr) {
				const { data: urlData } = supabase.storage
					.from("BungaNaik")
					.getPublicUrl(path);
				foto_url = urlData.publicUrl;
			}
		}

		await supabase
			.from("pengiriman")
			.update({ uang_dp: totalDibayar, status_bayar: statusBaru })
			.eq("id", selected.id);

		await supabase.from("pengiriman_pembayaran").insert({
			pengiriman_id: selected.id,
			jumlah: tambahan,
			metode: pelunasanForm.metode_bayar,
			catatan: pelunasanForm.catatan || null,
			foto_url,
		});

		setSaving(false);
		setModal(null);
		setBuktiFile(null);
		setBuktiPreview(null);
		loadAll();
	};

	const hapusPengiriman = async (id: string) => {
		if (!confirm("Yakin hapus pengiriman ini?")) return;
		await supabase.from("pengiriman").delete().eq("id", id);
		loadAll();
	};

	// Summary belum lunas
	const belumLunas = list.filter((p) => p.status_bayar !== "lunas");
	const totalDP = belumLunas.reduce((s, p) => s + p.uang_dp, 0);
	const totalSisa = belumLunas.reduce(
		(s, p) => s + (p.total_tagihan - p.uang_dp),
		0,
	);

	// Summary per milestone
	const countDiproses = list.filter((p) => p.milestone === "diproses").length;
	const countDijemput = list.filter((p) => p.milestone === "dijemput").length;
	const countDikirim = list.filter((p) => p.milestone === "dikirim").length;
	const countSelesai = list.filter((p) => p.milestone === "selesai").length;

	const filtered = list
		.filter((p) =>
			filterStatus === "semua" ? true : p.status_bayar !== "lunas",
		)
		.filter((p) =>
			filterMilestone === "semua" ? true : p.milestone === filterMilestone,
		)
		.filter((p) => {
			if (filterTanggal.dari && p.tanggal < filterTanggal.dari + "T00:00:00")
				return false;
			if (
				filterTanggal.sampai &&
				p.tanggal > filterTanggal.sampai + "T23:59:59"
			)
				return false;
			return true;
		})
		.filter(
			(p) =>
				p.nomor_faktur.toLowerCase().includes(search.toLowerCase()) ||
				(p.pengirim_nama || "").toLowerCase().includes(search.toLowerCase()) ||
				(p.penerima_nama || "").toLowerCase().includes(search.toLowerCase()) ||
				(p.penerima_kota || "").toLowerCase().includes(search.toLowerCase()),
		);

	const handleExportExcel = () => {
		const rows = filtered.map((p) => ({
			"No. Faktur": p.nomor_faktur,
			"No. Resi": p.nomor_resi || "-",
			"Jenis Layanan": JENIS_LAYANAN_CFG[p.jenis_layanan as JenisLayanan]?.label,
			Pengirim: p.pengirim_nama,
			Penerima: p.penerima_nama,
			"Kota Tujuan": p.penerima_kota || "-",
			"Berat (kg)": p.berat_kg,
			Ongkir: p.ongkir,
			"Total Tagihan": p.total_tagihan,
			DP: p.uang_dp,
			Sisa: p.status_bayar === "lunas" ? 0 : p.total_tagihan - p.uang_dp,
			"Status Bayar":
				p.status_bayar === "lunas"
					? "Lunas"
					: p.status_bayar === "dp"
						? "DP"
						: "Belum Bayar",
			Milestone: p.milestone,
			Tanggal: formatDate(p.tanggal),
		}));
		exportToExcel(
			`Pengiriman_${new Date().toISOString().slice(0, 10)}`,
			"Pengiriman",
			rows,
		);
	};

	return (
		<div>
			<div className="flex items-center justify-between mb-6">
				<div>
					<h1 className="text-2xl font-bold text-gray-900">Pengiriman</h1>
					<p className="text-gray-500 mt-1">{list.length} pengiriman</p>
				</div>
				<div className="flex items-center gap-2">
					<button
						onClick={handleExportExcel}
						disabled={filtered.length === 0}
						className="flex items-center gap-2 border border-gray-200 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed text-gray-700 px-4 py-2.5 rounded-xl text-sm font-medium transition">
						<FileSpreadsheet size={16} className="text-green-600" /> Export
						Excel
					</button>
					<button
						onClick={openForm}
						className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition">
						<Plus size={16} /> Pengiriman Baru
					</button>
				</div>
			</div>

			{belumLunas.length > 0 && (
				<div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
					<div className="bg-red-50 border border-red-200 rounded-2xl p-4">
						<div className="flex items-center gap-2 mb-1">
							<AlertCircle size={16} className="text-red-500" />
							<p className="text-sm font-medium text-red-700">
								Pengiriman Belum Lunas
							</p>
						</div>
						<p className="text-2xl font-bold text-red-600">
							{belumLunas.length}
						</p>
					</div>
					<div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-4">
						<p className="text-sm font-medium text-yellow-700 mb-1">
							Total DP Terkumpul
						</p>
						<p className="text-2xl font-bold text-yellow-600">
							{formatRupiah(totalDP)}
						</p>
					</div>
					<div className="bg-orange-50 border border-orange-200 rounded-2xl p-4">
						<p className="text-sm font-medium text-orange-700 mb-1">
							Total Sisa Tagihan
						</p>
						<p className="text-2xl font-bold text-orange-600">
							{formatRupiah(totalSisa)}
						</p>
					</div>
				</div>
			)}

			{/* Kartu Ringkasan Milestone — klik untuk filter */}
			<div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
				{[
					{
						v: "diproses" as const,
						label: "Diproses",
						count: countDiproses,
						icon: Clock,
						active: "border-blue-300 bg-blue-50 ring-2 ring-blue-200",
						idle: "border-gray-100 hover:border-blue-200",
						iconColor: "text-blue-500",
						textColor: "text-blue-600",
					},
					{
						v: "dijemput" as const,
						label: "Dijemput",
						count: countDijemput,
						icon: Package,
						active: "border-purple-300 bg-purple-50 ring-2 ring-purple-200",
						idle: "border-gray-100 hover:border-purple-200",
						iconColor: "text-purple-500",
						textColor: "text-purple-600",
					},
					{
						v: "dikirim" as const,
						label: "Dikirim",
						count: countDikirim,
						icon: Truck,
						active: "border-indigo-300 bg-indigo-50 ring-2 ring-indigo-200",
						idle: "border-gray-100 hover:border-indigo-200",
						iconColor: "text-indigo-500",
						textColor: "text-indigo-600",
					},
					{
						v: "selesai" as const,
						label: "Selesai",
						count: countSelesai,
						icon: CheckCircle2,
						active: "border-green-300 bg-green-50 ring-2 ring-green-200",
						idle: "border-gray-100 hover:border-green-200",
						iconColor: "text-green-500",
						textColor: "text-green-600",
					},
				].map((card) => {
					const Icon = card.icon;
					const isActive = filterMilestone === card.v;
					return (
						<button
							key={card.v}
							onClick={() => setFilterMilestone(isActive ? "semua" : card.v)}
							className={`text-left bg-white border rounded-2xl p-4 transition ${
								isActive ? card.active : card.idle
							}`}>
							<div className="flex items-center gap-2 mb-1">
								<Icon size={16} className={card.iconColor} />
								<p className={`text-sm font-medium ${card.textColor}`}>
									{card.label}
								</p>
							</div>
							<p className="text-2xl font-bold text-gray-900">{card.count}</p>
						</button>
					);
				})}
			</div>

			<div className="flex items-center gap-2 mb-5">
				<input
					type="date"
					value={filterTanggal.dari}
					onChange={(e) =>
						setFilterTanggal((f) => ({ ...f, dari: e.target.value }))
					}
					className="px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
				/>
				<span className="text-gray-400 text-sm">—</span>
				<input
					type="date"
					value={filterTanggal.sampai}
					onChange={(e) =>
						setFilterTanggal((f) => ({ ...f, sampai: e.target.value }))
					}
					className="px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
				/>
				{(filterTanggal.dari || filterTanggal.sampai) && (
					<button
						onClick={() => setFilterTanggal({ dari: "", sampai: "" })}
						className="p-2 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-600">
						<X size={15} />
					</button>
				)}
			</div>

			<div className="flex flex-wrap gap-3 mb-6">
				<div className="relative flex-1 min-w-48">
					<Search
						size={16}
						className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
					/>
					<input
						value={search}
						onChange={(e) => setSearch(e.target.value)}
						placeholder="Cari faktur, pengirim, penerima, kota..."
						className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
					/>
				</div>
				<div className="flex rounded-xl border border-gray-200 overflow-hidden">
					{[
						{ v: "semua", label: "Semua" },
						{ v: "belum_lunas", label: `Belum Lunas (${belumLunas.length})` },
					].map((opt) => (
						<button
							key={opt.v}
							onClick={() => setFilterStatus(opt.v as any)}
							className={`px-4 py-2.5 text-sm font-medium transition ${filterStatus === opt.v ? "bg-indigo-600 text-white" : "bg-white text-gray-600 hover:bg-gray-50"}`}>
							{opt.label}
						</button>
					))}
				</div>
				{filterMilestone !== "semua" && (
					<button
						onClick={() => setFilterMilestone("semua")}
						className="flex items-center gap-1.5 px-3 py-2.5 bg-indigo-50 text-indigo-700 rounded-xl text-sm font-medium hover:bg-indigo-100 transition">
						Milestone: {filterMilestone}
						<X size={13} />
					</button>
				)}
			</div>

			<div className="space-y-3">
				{loading ? (
					<div className="text-center py-12 text-gray-400">Memuat...</div>
				) : filtered.length === 0 ? (
					<div className="text-center py-12 text-gray-400">
						Tidak ada pengiriman
					</div>
				) : (
					filtered.map((p) => {
						const sisa = p.total_tagihan - p.uang_dp;
						const jl = JENIS_LAYANAN_CFG[p.jenis_layanan as JenisLayanan];
						const JlIcon = jl?.icon || Package;
						return (
							<div
								key={p.id}
								className={`bg-white rounded-2xl p-5 shadow-sm border transition hover:shadow-md ${
									p.status_bayar !== "lunas"
										? "border-red-100 bg-red-50/20"
										: "border-gray-100"
								}`}>
								<div className="flex items-start gap-4">
									<div className="w-12 h-12 rounded-xl bg-indigo-50 flex items-center justify-center flex-shrink-0">
										<JlIcon size={20} className="text-indigo-500" />
									</div>

									<div className="flex-1 min-w-0 flex items-start justify-between gap-3">
										<div className="flex-1 min-w-0">
											<div className="flex items-center gap-2 flex-wrap">
												<Link
													href={`/dashboard/pengiriman/${p.id}`}
													className="font-bold text-gray-900 hover:text-indigo-600 hover:underline">
													{p.nomor_faktur}
												</Link>
												<span
													className={`text-xs px-2 py-0.5 rounded-full font-semibold ${jl?.color || "bg-gray-100 text-gray-600"}`}>
													{jl?.label || p.jenis_layanan}
												</span>
												<span
													className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
														p.status_bayar === "lunas"
															? "bg-green-100 text-green-700"
															: p.status_bayar === "dp"
																? "bg-yellow-100 text-yellow-700"
																: "bg-red-100 text-red-700"
													}`}>
													{p.status_bayar === "lunas"
														? "Lunas"
														: p.status_bayar === "dp"
															? "DP"
															: "Belum Bayar"}
												</span>
											</div>

											<div className="flex items-center gap-4 mt-2 flex-wrap text-sm text-gray-600">
												<span className="flex items-center gap-1.5">
													<Send size={13} className="text-indigo-500" />
													{p.pengirim_nama}
												</span>
												<span className="text-gray-300">→</span>
												<span className="flex items-center gap-1.5">
													<MapPin size={13} className="text-rose-500" />
													{p.penerima_nama}
													{p.penerima_kota ? ` · ${p.penerima_kota}` : ""}
												</span>
												<span className="flex items-center gap-1.5 text-gray-500">
													<Calendar size={13} /> {formatDate(p.tanggal)}
												</span>
											</div>

											{p.isi_barang && (
												<p className="mt-2 text-xs text-gray-700 flex items-center gap-1.5">
													<Package size={11} className="text-gray-400" />
													{p.isi_barang}
												</p>
											)}

											<div className="flex flex-wrap gap-x-4 gap-y-1 mt-2.5 text-xs text-gray-500">
												<span className="flex items-center gap-1">
													<Weight size={11} /> {p.berat_kg} kg
												</span>
												<span>
													Total Tagihan{" "}
													<b className="text-gray-800">
														{formatRupiah(p.total_tagihan)}
													</b>
												</span>
												{p.uang_dp > 0 && (
													<span>
														DP{" "}
														<b className="text-yellow-600">
															{formatRupiah(p.uang_dp)}
														</b>
													</span>
												)}
												{p.status_bayar !== "lunas" && sisa > 0 && (
													<span>
														Sisa{" "}
														<b className="text-red-600">{formatRupiah(sisa)}</b>
													</span>
												)}
											</div>
										</div>

										<div className="flex items-center gap-1 flex-shrink-0">
											<Link
												href={`/dashboard/pengiriman/${p.id}`}
												className="p-2 hover:bg-indigo-50 rounded-lg text-indigo-600 transition"
												title="Detail">
												<Eye size={15} />
											</Link>
											{p.nomor_resi && (
												<button
													onClick={() => {
														const url = `${window.location.origin}/resi/${p.nomor_resi}`;
														navigator.clipboard.writeText(url);
													}}
													className="p-2 hover:bg-purple-50 rounded-lg text-purple-500 transition"
													title={`Copy link resi: ${p.nomor_resi}`}>
													<Copy size={15} />
												</button>
											)}
											<button
												onClick={() => printPengirimanInvoice(p)}
												className="p-2 hover:bg-gray-100 rounded-lg text-gray-600 transition"
												title="Cetak Invoice">
												<Printer size={15} />
											</button>
											{(isSuperAdmin ||
												role === "kasir" ||
												role === "keuangan") &&
												p.status_bayar !== "lunas" && (
													<button
														onClick={() => openPelunasan(p)}
														className="p-2 hover:bg-green-50 rounded-lg text-green-600 transition"
														title="Pelunasan">
														<CreditCard size={15} />
													</button>
												)}
											{(isSuperAdmin ||
												role === "kasir" ||
												role === "kurir" ||
												role === "gudang" ||
												role === "keuangan") && (
												<button
													onClick={() => hapusPengiriman(p.id)}
													className="p-2 hover:bg-red-50 rounded-lg text-red-500 transition"
													title="Hapus">
													<Trash2 size={15} />
												</button>
											)}
										</div>
									</div>
								</div>
							</div>
						);
					})
				)}
			</div>

			{/* Modal Form Pengiriman Baru */}
			{modal === "form" && (
				<div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
					<div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl max-h-[90vh] flex flex-col">
						<div className="flex items-center justify-between p-6 border-b border-gray-100">
							<h2 className="text-lg font-semibold">Pengiriman Baru</h2>
							<button
								onClick={() => setModal(null)}
								className="p-2 hover:bg-gray-100 rounded-lg">
								<X size={18} />
							</button>
						</div>
						<div className="flex-1 overflow-y-auto p-6 space-y-6">
							{/* Jenis Layanan */}
							<div>
								<label className="block text-sm font-medium text-gray-700 mb-2">
									Jenis Layanan
								</label>
								<div className="grid grid-cols-3 gap-3">
									{(Object.keys(JENIS_LAYANAN_CFG) as JenisLayanan[]).map(
										(jl) => {
											const cfg = JENIS_LAYANAN_CFG[jl];
											const Icon = cfg.icon;
											const active = form.jenis_layanan === jl;
											return (
												<button
													key={jl}
													type="button"
													onClick={() =>
														setForm((f) => ({ ...f, jenis_layanan: jl }))
													}
													className={`flex flex-col items-center gap-1.5 py-3 rounded-xl border-2 transition ${
														active
															? "border-indigo-500 bg-indigo-50"
															: "border-gray-200 hover:border-gray-300"
													}`}>
													<Icon
														size={18}
														className={active ? "text-indigo-600" : "text-gray-400"}
													/>
													<span
														className={`text-xs font-medium ${active ? "text-indigo-700" : "text-gray-600"}`}>
														{cfg.label}
													</span>
												</button>
											);
										},
									)}
								</div>
								{form.jenis_layanan === "kargo" && (
									<p className="text-xs text-amber-600 mt-1.5">
										Kargo: ongkir diisi manual (quote/negosiasi), bukan otomatis.
									</p>
								)}
							</div>

							{/* Pengirim */}
							<div className="border border-gray-200 rounded-xl p-4">
								<p className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
									<Send size={14} className="text-indigo-500" /> Pengirim
								</p>
								<div className="grid grid-cols-2 gap-3">
									<input
										value={form.pengirim_nama}
										onChange={(e) =>
											setForm({ ...form, pengirim_nama: e.target.value })
										}
										placeholder="Nama pengirim *"
										className="col-span-2 px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
									/>
									<input
										value={form.pengirim_telepon}
										onChange={(e) =>
											setForm({ ...form, pengirim_telepon: e.target.value })
										}
										placeholder="No. telepon"
										className="px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
									/>
									<input
										value={form.pengirim_kota}
										onChange={(e) =>
											setForm({ ...form, pengirim_kota: e.target.value })
										}
										placeholder="Kota asal"
										className="px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
									/>
									<input
										value={form.pengirim_alamat}
										onChange={(e) =>
											setForm({ ...form, pengirim_alamat: e.target.value })
										}
										placeholder="Alamat lengkap"
										className="col-span-2 px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
									/>
								</div>
							</div>

							{/* Penerima */}
							<div className="border border-gray-200 rounded-xl p-4">
								<p className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
									<MapPin size={14} className="text-rose-500" /> Penerima
								</p>
								<div className="grid grid-cols-2 gap-3">
									<input
										value={form.penerima_nama}
										onChange={(e) =>
											setForm({ ...form, penerima_nama: e.target.value })
										}
										placeholder="Nama penerima *"
										className="col-span-2 px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
									/>
									<input
										value={form.penerima_telepon}
										onChange={(e) =>
											setForm({ ...form, penerima_telepon: e.target.value })
										}
										placeholder="No. telepon"
										className="px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
									/>
									<input
										value={form.penerima_kota}
										onChange={(e) =>
											setForm({ ...form, penerima_kota: e.target.value })
										}
										placeholder="Kota tujuan"
										className="px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
									/>
									<input
										value={form.penerima_alamat}
										onChange={(e) =>
											setForm({ ...form, penerima_alamat: e.target.value })
										}
										placeholder="Alamat lengkap"
										className="col-span-2 px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
									/>
								</div>
							</div>

							{/* Barang */}
							<div className="border border-gray-200 rounded-xl p-4">
								<p className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
									<Package size={14} className="text-gray-500" /> Barang
								</p>
								<div className="grid grid-cols-2 md:grid-cols-4 gap-3">
									<input
										value={form.isi_barang}
										onChange={(e) =>
											setForm({ ...form, isi_barang: e.target.value })
										}
										placeholder="Isi barang"
										className="col-span-2 md:col-span-4 px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
									/>
									<div>
										<label className="block text-xs text-gray-500 mb-1">
											Berat (kg)
										</label>
										<input
											type="number"
											step="0.1"
											value={form.berat_kg}
											onChange={(e) =>
												setForm({ ...form, berat_kg: e.target.value })
											}
											className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
										/>
									</div>
									<div>
										<label className="block text-xs text-gray-500 mb-1">
											Panjang (cm)
										</label>
										<input
											type="number"
											value={form.panjang_cm}
											onChange={(e) =>
												setForm({ ...form, panjang_cm: e.target.value })
											}
											className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
										/>
									</div>
									<div>
										<label className="block text-xs text-gray-500 mb-1">
											Lebar (cm)
										</label>
										<input
											type="number"
											value={form.lebar_cm}
											onChange={(e) =>
												setForm({ ...form, lebar_cm: e.target.value })
											}
											className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
										/>
									</div>
									<div>
										<label className="block text-xs text-gray-500 mb-1">
											Tinggi (cm)
										</label>
										<input
											type="number"
											value={form.tinggi_cm}
											onChange={(e) =>
												setForm({ ...form, tinggi_cm: e.target.value })
											}
											className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
										/>
									</div>
									<div className="col-span-2 md:col-span-4">
										<label className="block text-xs text-gray-500 mb-1">
											Nilai Barang (dasar klaim, opsional)
										</label>
										<input
											type="number"
											value={form.nilai_barang}
											onChange={(e) =>
												setForm({ ...form, nilai_barang: e.target.value })
											}
											className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
										/>
									</div>
								</div>
							</div>

							{/* Biaya & Pembayaran */}
							<div className="grid grid-cols-2 md:grid-cols-3 gap-4">
								<div>
									<label className="block text-sm font-medium text-gray-700 mb-1">
										Ongkir
									</label>
									<input
										type="number"
										value={form.ongkir}
										onChange={(e) =>
											setForm({ ...form, ongkir: e.target.value })
										}
										className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
									/>
									{form.jenis_layanan !== "kargo" && tarifLoading && (
										<p className="text-xs text-gray-400 mt-1">Cek tarif...</p>
									)}
									{form.jenis_layanan !== "kargo" &&
										!tarifLoading &&
										tarifInfo?.found && (
											<p className="text-xs text-green-600 mt-1 flex items-center gap-1">
												<CheckCircle2 size={11} /> Otomatis dari tarif zona
												{tarifInfo.estimasi_hari
													? ` · estimasi ${tarifInfo.estimasi_hari} hari`
													: ""}
											</p>
										)}
									{form.jenis_layanan !== "kargo" &&
										!tarifLoading &&
										tarifInfo?.found === false && (
											<p className="text-xs text-amber-600 mt-1">
												Tidak ada tarif untuk rute ini — isi manual
											</p>
										)}
								</div>
								<div>
									<label className="block text-sm font-medium text-gray-700 mb-1">
										Biaya Asuransi
									</label>
									<input
										type="number"
										value={form.biaya_asuransi}
										onChange={(e) =>
											setForm({ ...form, biaya_asuransi: e.target.value })
										}
										className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
									/>
								</div>
								<div>
									<label className="block text-sm font-medium text-gray-700 mb-1">
										Total Tagihan
									</label>
									<div className="px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold text-gray-800">
										{formatRupiah(totalTagihanForm)}
									</div>
								</div>
								<div>
									<label className="block text-sm font-medium text-gray-700 mb-1">
										Metode Bayar
									</label>
									<select
										value={form.metode_bayar}
										onChange={(e) =>
											setForm({ ...form, metode_bayar: e.target.value })
										}
										className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
										<option value="transfer">Transfer</option>
										<option value="cod">COD</option>
										<option value="cash">Cash</option>
									</select>
								</div>
								<div>
									<label className="block text-sm font-medium text-gray-700 mb-1">
										Status Bayar
									</label>
									<select
										value={form.status_bayar}
										onChange={(e) =>
											setForm({ ...form, status_bayar: e.target.value })
										}
										className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
										<option value="belum_bayar">Belum Bayar</option>
										<option value="dp">DP</option>
										<option value="lunas">Lunas</option>
									</select>
								</div>
								{form.status_bayar === "dp" && (
									<div>
										<label className="block text-sm font-medium text-gray-700 mb-1">
											Uang DP
										</label>
										<input
											type="number"
											value={form.uang_dp}
											onChange={(e) =>
												setForm({ ...form, uang_dp: e.target.value })
											}
											className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
										/>
									</div>
								)}
							</div>

							{/* Petugas & Catatan */}
							<div className="grid grid-cols-2 gap-4">
								<div>
									<label className="block text-sm font-medium text-gray-700 mb-1">
										Kurir / Sopir
									</label>
									<input
										value={form.petugas_nama}
										onChange={(e) =>
											setForm({ ...form, petugas_nama: e.target.value })
										}
										placeholder="Nama petugas"
										className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
									/>
								</div>
								<div>
									<label className="block text-sm font-medium text-gray-700 mb-1">
										No. Telepon Petugas
									</label>
									<input
										value={form.petugas_telepon}
										onChange={(e) =>
											setForm({ ...form, petugas_telepon: e.target.value })
										}
										placeholder="08xx"
										className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
									/>
								</div>
								<div className="col-span-2">
									<label className="block text-sm font-medium text-gray-700 mb-1">
										Catatan
									</label>
									<input
										value={form.catatan}
										onChange={(e) =>
											setForm({ ...form, catatan: e.target.value })
										}
										placeholder="Opsional"
										className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
									/>
								</div>
							</div>
						</div>
						<div className="flex gap-3 p-6 pt-4 border-t border-gray-100">
							<button
								onClick={() => setModal(null)}
								className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium hover:bg-gray-50">
								Batal
							</button>
							<button
								onClick={saveForm}
								disabled={
									saving || !form.pengirim_nama.trim() || !form.penerima_nama.trim()
								}
								className="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white px-4 py-2.5 rounded-xl text-sm font-medium">
								{saving ? "Menyimpan..." : "Simpan Pengiriman"}
							</button>
						</div>
					</div>
				</div>
			)}

			{/* Modal Pelunasan */}
			{modal === "pelunasan" && selected && (
				<div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
					<div className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
						<div className="flex items-center justify-between p-6 border-b border-gray-100">
							<div>
								<h2 className="text-lg font-semibold">Update Pelunasan</h2>
								<p className="text-sm text-gray-500">{selected.nomor_faktur}</p>
							</div>
							<button
								onClick={() => setModal(null)}
								className="p-2 hover:bg-gray-100 rounded-lg">
								<X size={18} />
							</button>
						</div>
						<div className="p-6 space-y-4">
							<div className="bg-gray-50 rounded-xl p-4 space-y-2 text-sm">
								<div className="flex justify-between">
									<span className="text-gray-500">Penerima</span>
									<span className="font-medium">{selected.penerima_nama}</span>
								</div>
								<div className="flex justify-between">
									<span className="text-gray-500">Total Tagihan</span>
									<span className="font-semibold">
										{formatRupiah(selected.total_tagihan)}
									</span>
								</div>
								<div className="flex justify-between">
									<span className="text-gray-500">DP Terbayar</span>
									<span className="text-yellow-600 font-medium">
										{formatRupiah(selected.uang_dp)}
									</span>
								</div>
								<div className="flex justify-between border-t border-gray-200 pt-2">
									<span className="text-red-600 font-semibold">
										Sisa Tagihan
									</span>
									<span className="text-red-600 font-bold">
										{formatRupiah(selected.sisa_tagihan)}
									</span>
								</div>
							</div>

							<div>
								<label className="block text-sm font-medium text-gray-700 mb-1">
									Jumlah Bayar Sekarang
								</label>
								<input
									type="number"
									value={pelunasanForm.tambahan_bayar}
									onChange={(e) =>
										setPelunasanForm({
											...pelunasanForm,
											tambahan_bayar: e.target.value,
										})
									}
									className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
								/>
							</div>

							<div>
								<label className="block text-sm font-medium text-gray-700 mb-1">
									Metode Bayar
								</label>
								<select
									value={pelunasanForm.metode_bayar}
									onChange={(e) =>
										setPelunasanForm({
											...pelunasanForm,
											metode_bayar: e.target.value,
										})
									}
									className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
									<option value="transfer">Transfer</option>
									<option value="cod">COD</option>
									<option value="cash">Cash</option>
								</select>
							</div>

							<div>
								<label className="block text-sm font-medium text-gray-700 mb-1">
									Catatan
								</label>
								<input
									value={pelunasanForm.catatan}
									onChange={(e) =>
										setPelunasanForm({
											...pelunasanForm,
											catatan: e.target.value,
										})
									}
									placeholder="Opsional"
									className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
								/>
							</div>

							<div>
								<label className="block text-sm font-medium text-gray-700 mb-1">
									Bukti Transfer
								</label>
								<input
									type="file"
									accept="image/*"
									onChange={(e) => {
										const f = e.target.files?.[0] ?? null;
										setBuktiFile(f);
										setBuktiPreview(f ? URL.createObjectURL(f) : null);
									}}
									className="w-full text-sm text-gray-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-medium file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
								/>
								{buktiPreview && (
									<img
										src={buktiPreview}
										alt="Preview bukti"
										className="mt-2 h-28 w-44 object-cover rounded-xl border border-gray-200"
									/>
								)}
							</div>

							{pelunasanForm.tambahan_bayar && (
								<div
									className={`rounded-xl p-3 text-sm ${
										selected.uang_dp + Number(pelunasanForm.tambahan_bayar) >=
										selected.total_tagihan
											? "bg-green-50 text-green-700"
											: "bg-yellow-50 text-yellow-700"
									}`}>
									Total terbayar:{" "}
									<span className="font-bold">
										{formatRupiah(
											selected.uang_dp + Number(pelunasanForm.tambahan_bayar),
										)}
									</span>
									{" · "}
									{selected.uang_dp + Number(pelunasanForm.tambahan_bayar) >=
									selected.total_tagihan
										? "✓ Akan menjadi LUNAS"
										: `Sisa: ${formatRupiah(selected.total_tagihan - selected.uang_dp - Number(pelunasanForm.tambahan_bayar))}`}
								</div>
							)}
						</div>
						<div className="flex gap-3 p-6 pt-0">
							<button
								onClick={() => setModal(null)}
								className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium hover:bg-gray-50">
								Batal
							</button>
							<button
								onClick={savePelunasan}
								disabled={saving || !pelunasanForm.tambahan_bayar}
								className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-green-300 text-white px-4 py-2.5 rounded-xl text-sm font-medium flex items-center justify-center gap-2">
								<CreditCard size={15} />
								{saving ? "Menyimpan..." : "Simpan Pelunasan"}
							</button>
						</div>
					</div>
				</div>
			)}

			{/* Modal Sukses Resi */}
			{resiSukses &&
				(() => {
					const trackingUrl = `${typeof window !== "undefined" ? window.location.origin : ""}/resi/${resiSukses}`;
					const pesanWA = `Halo! Pengiriman Anda sedang diproses. Pantau status pengiriman di link berikut:%0A${encodeURIComponent(trackingUrl)}`;
					return (
						<div className="fixed inset-0 bg-black/50 z-[80] flex items-center justify-center p-4">
							<div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl text-center overflow-hidden">
								<div className="bg-green-50 px-6 pt-8 pb-6">
									<div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
										<CheckCircle2 size={28} className="text-green-600" />
									</div>
									<h3 className="text-lg font-bold text-gray-900">
										Pengiriman Tersimpan!
									</h3>
									<p className="text-sm text-gray-500 mt-1">
										Nomor resi tracking:
									</p>
									<div className="mt-3 bg-white border-2 border-green-200 rounded-xl px-4 py-3">
										<p className="text-xl font-bold font-mono tracking-widest text-green-700">
											{resiSukses}
										</p>
									</div>
								</div>
								<div className="px-6 py-5 space-y-3">
									<button
										onClick={() => {
											navigator.clipboard.writeText(trackingUrl);
										}}
										className="w-full flex items-center justify-center gap-2 py-2.5 border-2 border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition">
										<Copy size={15} /> Copy Link Tracking
									</button>
									{resiTeleponPenerima && (
										<a
											href={waLink(resiTeleponPenerima) + `?text=${pesanWA}`}
											target="_blank"
											rel="noopener noreferrer"
											className="w-full flex items-center justify-center gap-2 py-2.5 bg-green-500 hover:bg-green-600 text-white rounded-xl text-sm font-semibold transition">
											<Link2 size={15} /> Kirim ke Penerima via WA
										</a>
									)}
									<button
										onClick={() => setResiSukses(null)}
										className="w-full py-2.5 text-sm text-gray-400 hover:text-gray-600 transition">
										Tutup
									</button>
								</div>
							</div>
						</div>
					);
				})()}
		</div>
	);
}
