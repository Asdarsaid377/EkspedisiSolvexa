"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { formatRupiah, formatDate, waLink } from "@/lib/utils";
import { printInvoice } from "@/lib/printInvoice";
import { printResi } from "@/lib/printResi";
import { QRCodeCanvas } from "qrcode.react";
import {
	ArrowLeft,
	Printer,
	Tag,
	Flag,
	ThumbsUp,
	StickyNote,
	CheckCircle2,
	AlertCircle,
	Plus,
	Phone,
	User,
	MapPin,
	Truck,
	CreditCard,
	Camera,
	Copy,
	Share2,
	ChevronRight,
	Loader2,
	AlertTriangle,
	Edit3,
	Check,
	Trash2,
	X,
	Gift,
	RotateCcw,
} from "lucide-react";
import Link from "next/link";

const TIPE_CFG = {
	komplain: { label: "Komplain", badge: "bg-red-100 text-red-700", Icon: Flag },
	pujian: {
		label: "Pujian",
		badge: "bg-green-100 text-green-700",
		Icon: ThumbsUp,
	},
	catatan: {
		label: "Catatan",
		badge: "bg-blue-100 text-blue-700",
		Icon: StickyNote,
	},
} as const;

export default function DetailPenjualanPage() {
	const { id } = useParams<{ id: string }>();
	const router = useRouter();
	const supabase = createClient();
	const { isSuperAdmin, role, profile } = useAuth();

	const [data, setData] = useState<any>(null);
	const [loading, setLoading] = useState(true);
	const [notFound, setNotFound] = useState(false);
	const resiQrRef = useRef<HTMLDivElement>(null);

	// Review states
	const [reviewForm, setReviewForm] = useState({ tipe: "komplain", isi: "" });
	const [savingReview, setSavingReview] = useState(false);
	const [showReviewForm, setShowReviewForm] = useState(false);

	// Catatan internal
	const [catatanInternalEdit, setCatatanInternalEdit] = useState(false);
	const [catatanInternalInput, setCatatanInternalInput] = useState("");
	const [savingCatatan, setSavingCatatan] = useState(false);

	// Pelunasan states
	const [modalPelunasan, setModalPelunasan] = useState(false);
	const [pelunasanJumlah, setPelunasanJumlah] = useState("");
	const [pelunasanMetode, setPelunasanMetode] = useState<
		"transfer" | "cod" | "cash"
	>("transfer");
	const [pelunasanCatatan, setPelunasanCatatan] = useState("");
	const [pelunasanFotoFile, setPelunasanFotoFile] = useState<File | null>(null);
	const [pelunasanFotoPreview, setPelunasanFotoPreview] = useState<
		string | null
	>(null);
	const [savingPelunasan, setSavingPelunasan] = useState(false);
	const [pelunasanError, setPelunasanError] = useState("");
	const [savingLunas, setSavingLunas] = useState(false);
	const [rollbackingId, setRollbackingId] = useState<string | null>(null);
	const [rollbackError, setRollbackError] = useState("");

	// Delete states
	const [deleteModal, setDeleteModal] = useState(false);
	const [deleting, setDeleting] = useState(false);
	const [deleteError, setDeleteError] = useState("");

	// Bonus owner states
	const [modalBonusOwner, setModalBonusOwner] = useState(false);
	const [bonusOwnerInput, setBonusOwnerInput] = useState("0");
	const [bonusOwnerCatatan, setBonusOwnerCatatan] = useState("");
	const [savingBonusOwner, setSavingBonusOwner] = useState(false);

	// Tracking / milestone states
	const [trackingList, setTrackingList] = useState<any[]>([]);
	const [modalMilestone, setModalMilestone] = useState(false);
	const [msKeterangan, setMsKeterangan] = useState("");
	const [msPersentase, setMsPersentase] = useState(100);
	const [msFotoFile, setMsFotoFile] = useState<File | null>(null);
	const [msFotoPreview, setMsFotoPreview] = useState<string | null>(null);
	const [msSaving, setMsSaving] = useState(false);
	const [msError, setMsError] = useState("");

	useEffect(() => {
		if (!id) return;
		load();
	}, [id]);

	const load = async () => {
		setLoading(true);
		const [{ data: pj }, { data: reviews }, { data: tracking }] =
			await Promise.all([
				supabase
					.from("penjualan")
					.select(
						"*, reseller:resellers(*), items:penjualan_item(*, produk:produk(nama, satuan)), pembayaran:penjualan_pembayaran(*)",
					)
					.eq("id", id)
					.single(),
				supabase
					.from("reseller_reviews")
					.select("*, creator:profiles!created_by(name)")
					.eq("penjualan_id", id)
					.order("created_at", { ascending: false }),
				supabase
					.from("tracking_progress")
					.select("*, creator:profiles!created_by(name)")
					.eq("penjualan_id", id)
					.order("created_at", { ascending: true }),
			]);
		if (!pj) {
			setNotFound(true);
			setLoading(false);
			return;
		}
		setData({ ...pj, reviews: reviews || [] });
		setTrackingList(tracking || []);
		setLoading(false);
	};

	const openBonusOwner = () => {
		setBonusOwnerInput(String(data?.bonus_owner || 0));
		setBonusOwnerCatatan(data?.catatan_bonus_owner || "");
		setModalBonusOwner(true);
	};

	const saveBonusOwner = async () => {
		if (!data) return;
		setSavingBonusOwner(true);
		await supabase
			.from("penjualan")
			.update({
				bonus_owner: Number(bonusOwnerInput) || 0,
				catatan_bonus_owner: bonusOwnerCatatan || null,
			})
			.eq("id", data.id);
		setSavingBonusOwner(false);
		setModalBonusOwner(false);
		setData((prev: any) => ({
			...prev,
			bonus_owner: Number(bonusOwnerInput) || 0,
			catatan_bonus_owner: bonusOwnerCatatan || null,
		}));
	};

	const saveReview = async () => {
		if (!data || !reviewForm.isi.trim()) return;
		setSavingReview(true);
		const { data: rev } = await supabase
			.from("reseller_reviews")
			.insert({
				penjualan_id: data.id,
				reseller_id: data.reseller_id || null,
				tipe: reviewForm.tipe,
				isi: reviewForm.isi.trim(),
			})
			.select("*, creator:profiles!created_by(name)")
			.single();
		if (rev) {
			setData((d: any) => ({ ...d, reviews: [rev, ...d.reviews] }));
			setReviewForm({ tipe: "komplain", isi: "" });
			setShowReviewForm(false);
		}
		setSavingReview(false);
	};

	const resolveReview = async (reviewId: string) => {
		await supabase
			.from("reseller_reviews")
			.update({ status: "resolved", resolved_at: new Date().toISOString() })
			.eq("id", reviewId);
		setData((d: any) => ({
			...d,
			reviews: d.reviews.map((r: any) =>
				r.id === reviewId ? { ...r, status: "resolved" } : r,
			),
		}));
	};

	const saveCatatanInternal = async () => {
		if (!data) return;
		setSavingCatatan(true);
		await supabase
			.from("penjualan")
			.update({ catatan_internal: catatanInternalInput.trim() || null })
			.eq("id", data.id);
		setData((d: any) => ({
			...d,
			catatan_internal: catatanInternalInput.trim() || null,
		}));
		setSavingCatatan(false);
		setCatatanInternalEdit(false);
	};

	// ── Milestone logic ──
	const MILESTONES = ["diproses", "diproduksi", "dikirim", "selesai"] as const;
	type Milestone = (typeof MILESTONES)[number];

	const MILESTONE_LABEL: Record<Milestone, string> = {
		diproses: "Diproses",
		diproduksi: "Diproduksi",
		dikirim: "Dikirim",
		selesai: "Selesai",
	};

	const getNextMilestone = (
		current: Milestone,
		hasPO: boolean,
	): Milestone | null => {
		if (current === "diproses") return hasPO ? "diproduksi" : "dikirim";
		if (current === "diproduksi") return "dikirim";
		if (current === "dikirim") return "selesai";
		return null;
	};

	const canUpdate = (
		current: Milestone,
		next: Milestone | null,
		hasPO: boolean,
	): boolean => {
		if (!next) return false;
		if (isSuperAdmin) return true;
		if (next === "diproduksi") return role === "produksi" && hasPO;
		if (next === "dikirim")
			return (
				role === "gudang" ||
				role === "pengiriman" ||
				role === "keuangan" ||
				role === "sopir" ||
				role === "kasir"
			);
		if (next === "selesai")
			return (
				role === "sopir" ||
				role === "pengiriman" ||
				role === "keuangan" ||
				role === "kasir"
			);
		return false;
	};

	const submitMilestone = async () => {
		if (!data) return;
		const hasPO = !!data.po_id;
		const next = getNextMilestone(data.milestone ?? "diproses", hasPO);
		if (!next) return;
		setMsSaving(true);
		setMsError("");

		let foto_url: string | null = null;
		if (msFotoFile) {
			const ext = msFotoFile.name.split(".").pop();
			const path = `tracking/${data.id}/${Date.now()}.${ext}`;
			const { error: upErr } = await supabase.storage
				.from("BungaNaik")
				.upload(path, msFotoFile);
			if (upErr) {
				setMsError("Gagal upload foto: " + upErr.message);
				setMsSaving(false);
				return;
			}
			const { data: urlData } = supabase.storage
				.from("BungaNaik")
				.getPublicUrl(path);
			foto_url = urlData.publicUrl;
		}

		await supabase.from("tracking_progress").insert({
			penjualan_id: data.id,
			milestone: next,
			persentase: next === "diproduksi" ? msPersentase : null,
			catatan: msKeterangan.trim() || null,
			foto_url,
			created_by: profile?.id,
		});

		await supabase
			.from("penjualan")
			.update({ milestone: next })
			.eq("id", data.id);

		setData((d: any) => ({ ...d, milestone: next }));
		const { data: tracking } = await supabase
			.from("tracking_progress")
			.select("*, creator:profiles!created_by(name)")
			.eq("penjualan_id", data.id)
			.order("created_at", { ascending: true });
		setTrackingList(tracking || []);

		setMsSaving(false);
		setModalMilestone(false);
		setMsKeterangan("");
		setMsFotoFile(null);
		setMsFotoPreview(null);
		setMsPersentase(100);
	};

	const savePelunasan = async () => {
		if (!data) return;
		const jumlah = parseFloat(pelunasanJumlah);
		if (!jumlah || jumlah <= 0) {
			setPelunasanError("Jumlah pembayaran harus lebih dari 0.");
			return;
		}
		const sisa = data.total_harga_jual - (data.uang_dp || 0);
		if (jumlah > sisa + 0.01) {
			setPelunasanError(
				`Jumlah melebihi sisa tagihan (${formatRupiah(sisa)}).`,
			);
			return;
		}
		setSavingPelunasan(true);
		setPelunasanError("");

		let foto_url: string | null = null;
		if (pelunasanFotoFile) {
			const ext = pelunasanFotoFile.name.split(".").pop();
			const path = `pelunasan/${data.id}/${Date.now()}.${ext}`;
			const { error: upErr } = await supabase.storage
				.from("BungaNaik")
				.upload(path, pelunasanFotoFile);
			if (!upErr) {
				const { data: urlData } = supabase.storage
					.from("BungaNaik")
					.getPublicUrl(path);
				foto_url = urlData.publicUrl;
			}
		}

		const { error: insErr } = await supabase
			.from("penjualan_pembayaran")
			.insert({
				penjualan_id: data.id,
				jumlah,
				metode: pelunasanMetode,
				catatan: pelunasanCatatan.trim() || null,
				foto_url,
			});
		if (insErr) {
			setPelunasanError("Gagal menyimpan: " + insErr.message);
			setSavingPelunasan(false);
			return;
		}

		const newUangDp = (data.uang_dp || 0) + jumlah;
		const newStatus =
			newUangDp >= data.total_harga_jual - 0.01 ? "lunas" : "dp";

		await supabase
			.from("penjualan")
			.update({
				uang_dp: newUangDp,
				status_bayar: newStatus,
			})
			.eq("id", data.id);

		setSavingPelunasan(false);
		setModalPelunasan(false);
		setPelunasanJumlah("");
		setPelunasanCatatan("");
		setPelunasanMetode("transfer");
		setPelunasanFotoFile(null);
		setPelunasanFotoPreview(null);
		load();
	};

	const tandaiLunas = async () => {
		if (!data) return;
		const sisa = data.total_harga_jual - (data.uang_dp || 0);
		if (sisa <= 0) return;
		if (
			!confirm(
				`Tandai transaksi ini LUNAS? Sisa tagihan ${formatRupiah(sisa)} akan dicatat sebagai pembayaran.`,
			)
		)
			return;

		setSavingLunas(true);

		const { error: insErr } = await supabase
			.from("penjualan_pembayaran")
			.insert({
				penjualan_id: data.id,
				jumlah: sisa,
				metode: data.metode_bayar,
				catatan: "Pelunasan",
			});
		if (insErr) {
			alert("Gagal menandai lunas: " + insErr.message);
			setSavingLunas(false);
			return;
		}

		await supabase
			.from("penjualan")
			.update({
				uang_dp: data.total_harga_jual,
				status_bayar: "lunas",
			})
			.eq("id", data.id);

		setSavingLunas(false);
		load();
	};

	const rollbackPembayaran = async (p: any) => {
		if (!data) return;
		if (
			!confirm(
				`Rollback pembayaran ${formatRupiah(p.jumlah)} ini? Status pembayaran akan disesuaikan kembali (misal dari Lunas menjadi belum lunas).`,
			)
		)
			return;

		setRollbackError("");
		setRollbackingId(p.id);

		const { error: delErr } = await supabase
			.from("penjualan_pembayaran")
			.delete()
			.eq("id", p.id);
		if (delErr) {
			setRollbackError("Gagal rollback: " + delErr.message);
			setRollbackingId(null);
			return;
		}

		const newUangDp = Math.max(0, (data.uang_dp || 0) - p.jumlah);
		const newStatus =
			newUangDp <= 0.01
				? "belum_bayar"
				: newUangDp >= data.total_harga_jual - 0.01
					? "lunas"
					: "dp";

		await supabase
			.from("penjualan")
			.update({ uang_dp: newUangDp, status_bayar: newStatus })
			.eq("id", data.id);

		setRollbackingId(null);
		load();
	};

	const deletePenjualan = async () => {
		if (!data) return;
		setDeleting(true);
		setDeleteError("");

		// Kembalikan stok produk per item
		for (const item of data.items || []) {
			if (!item.produk_id) continue;
			const { data: produk } = await supabase
				.from("produk")
				.select("stok")
				.eq("id", item.produk_id)
				.single();
			const stokSebelum = produk?.stok ?? 0;
			const stokSesudah = stokSebelum + item.jumlah;
			await supabase
				.from("produk")
				.update({ stok: stokSesudah })
				.eq("id", item.produk_id);
			await supabase.from("mutasi_stok").insert({
				produk_id: item.produk_id,
				tipe: "masuk",
				jumlah: item.jumlah,
				stok_sebelum: stokSebelum,
				stok_sesudah: stokSesudah,
				keterangan: `Pembatalan penjualan ${data.nomor_faktur}`,
				referensi_id: data.id,
				created_by: profile?.id,
			});
		}

		const { error } = await supabase
			.from("penjualan")
			.delete()
			.eq("id", data.id);
		if (error) {
			setDeleteError("Gagal menghapus: " + error.message);
			setDeleting(false);
			return;
		}

		router.push("/dashboard/penjualan");
	};

	const handlePrint = () => {
		if (!data) return;
		printInvoice(data);
	};

	const handlePrintResi = () => {
		if (!data || !data.nomor_resi) return;
		const canvas = resiQrRef.current?.querySelector(
			"canvas",
		) as HTMLCanvasElement | null;
		if (!canvas) return;
		printResi({ ...data, qrDataUrl: canvas.toDataURL("image/png") });
	};

	if (loading) {
		return (
			<div className="flex items-center justify-center min-h-[60vh]">
				<p className="text-gray-400">Memuat detail transaksi...</p>
			</div>
		);
	}

	if (notFound || !data) {
		return (
			<div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
				<p className="text-gray-500 font-medium">Transaksi tidak ditemukan</p>
				<Link
					href="/dashboard/penjualan"
					className="text-sm text-indigo-600 hover:underline">
					← Kembali ke Penjualan
				</Link>
			</div>
		);
	}

	const grandTotal = data.total_harga_jual;
	const sisa = grandTotal - (data.uang_dp || 0);
	const totalBonus = (data.total_bonus || 0) + (data.bonus_owner || 0);

	return (
		<div className="max-w-4xl mx-auto">
			{/* ── Header ── */}
			<div className="mb-6">
				{/* Baris 1: back + nomor faktur + badge */}
				<div className="flex items-start gap-3 mb-3">
					<button
						onClick={() => router.back()}
						className="mt-0.5 p-2 hover:bg-gray-100 rounded-xl transition text-gray-500 flex-shrink-0">
						<ArrowLeft size={18} />
					</button>
					<div className="min-w-0">
						<h1 className="text-xl font-bold text-gray-900 font-mono">
							{data.nomor_faktur}
						</h1>
						<div className="flex items-center gap-2 flex-wrap mt-1.5">
							<span
								className={`text-xs px-2.5 py-1 rounded-full font-semibold ${
									data.status_bayar === "lunas"
										? "bg-green-100 text-green-700"
										: data.status_bayar === "dp"
											? "bg-yellow-100 text-yellow-700"
											: "bg-red-100 text-red-700"
								}`}>
								{data.status_bayar === "lunas"
									? "Lunas"
									: data.status_bayar === "dp"
										? "DP"
										: "Belum Bayar"}
							</span>
							{data.status_pencocokan === "cocok" && (
								<span className="text-xs px-2.5 py-1 rounded-full font-semibold bg-green-100 text-green-700 flex items-center gap-1">
									<CheckCircle2 size={11} /> Dicocokkan
								</span>
							)}
							{data.status_pencocokan === "selisih" && (
								<span className="text-xs px-2.5 py-1 rounded-full font-semibold bg-red-100 text-red-700 flex items-center gap-1">
									<AlertTriangle size={11} /> Selisih
								</span>
							)}
							{(!data.status_pencocokan ||
								data.status_pencocokan === "belum_dicocokkan") && (
								<span className="text-xs px-2.5 py-1 rounded-full font-semibold bg-gray-100 text-gray-500">
									Belum Dicocokkan
								</span>
							)}
							<span className="text-xs text-gray-400">
								{formatDate(data.tanggal)}
							</span>
						</div>
					</div>
				</div>

				{/* Baris 2: tombol aksi */}
				<div className="flex items-center gap-2 flex-wrap pl-11">
					{data.nomor_resi && (
						<button
							onClick={() => {
								const url = `${window.location.origin}/resi/${data.nomor_resi}`;
								if (data.telepon_customer) {
									const pesan = `Halo! Pantau status pesanan Anda di: ${url}`;
									window.open(
										waLink(data.telepon_customer) +
											`?text=${encodeURIComponent(pesan)}`,
										"_blank",
									);
								} else {
									navigator.clipboard.writeText(url);
								}
							}}
							className="flex items-center gap-1.5 px-3 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-sm font-medium transition border border-indigo-200">
							<Share2 size={14} />
							{data.telepon_customer
								? "Kirim ke Customer"
								: "Copy Link Tracking"}
						</button>
					)}
					<button
						onClick={handlePrint}
						className="flex items-center gap-1.5 px-3 py-2 bg-gray-800 hover:bg-gray-900 text-white rounded-xl text-sm font-medium transition">
						<Printer size={14} /> Cetak
					</button>
					{data.nomor_resi && (
						<button
							onClick={handlePrintResi}
							className="flex items-center gap-1.5 px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-sm font-medium transition border border-gray-200">
							<Tag size={14} /> Cetak Resi
						</button>
					)}
					{isSuperAdmin && (
						<button
							onClick={openBonusOwner}
							className="flex items-center gap-1.5 px-3 py-2 bg-amber-50 hover:bg-amber-100 text-amber-600 rounded-xl text-sm font-medium transition border border-amber-200">
							<Gift size={14} /> Bonus Owner
						</button>
					)}
					{(isSuperAdmin ||
						role === "kasir" ||
						role === "pengiriman" ||
						role === "gudang" ||
						role === "keuangan") && (
						<button
							onClick={() => {
								setDeleteError("");
								setDeleteModal(true);
							}}
							className="flex items-center gap-1.5 px-3 py-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl text-sm font-medium transition border border-red-200">
							<Trash2 size={14} /> Hapus
						</button>
					)}
				</div>
			</div>

			{/* ── Warning Selisih ── */}
			{data.status_pencocokan === "selisih" && data.catatan_pencocokan && (
				<div className="bg-red-50 border border-red-200 rounded-2xl p-4 mb-4 flex items-start gap-3">
					<AlertTriangle
						size={18}
						className="text-red-500 flex-shrink-0 mt-0.5"
					/>
					<div>
						<p className="text-sm font-semibold text-red-700 mb-0.5">
							Ada Selisih — Perlu Ditindaklanjuti
						</p>
						<p className="text-sm text-red-600">{data.catatan_pencocokan}</p>
					</div>
				</div>
			)}

			<div className="space-y-4">
				{/* ── Info Transaksi ── */}
				<div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
					<h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">
						Informasi Transaksi
					</h2>
					<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
						{/* Reseller */}
						<div className="flex items-start gap-3">
							<div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center flex-shrink-0">
								<User size={15} className="text-indigo-500" />
							</div>
							<div>
								<p className="text-xs text-gray-400">Reseller</p>
								<p className="text-sm font-semibold text-gray-900 mt-0.5">
									{data.reseller?.nama || "Tanpa Reseller"}
								</p>
								{data.reseller?.telepon && (
									<a
										href={waLink(data.reseller.telepon)}
										target="_blank"
										rel="noopener noreferrer"
										className="flex items-center gap-1 text-xs text-green-600 hover:underline mt-0.5">
										<Phone size={11} /> {data.reseller.telepon}
									</a>
								)}
							</div>
						</div>

						{/* Customer */}
						{data.nama_customer && (
							<div className="flex items-start gap-3">
								<div className="w-8 h-8 rounded-lg bg-purple-50 flex items-center justify-center flex-shrink-0">
									<User size={15} className="text-purple-500" />
								</div>
								<div>
									<p className="text-xs text-gray-400">Customer</p>
									<p className="text-sm font-semibold text-gray-900 mt-0.5">
										{data.nama_customer}
									</p>
									{data.telepon_customer && (
										<a
											href={waLink(data.telepon_customer)}
											target="_blank"
											rel="noopener noreferrer"
											className="flex items-center gap-1 text-xs text-green-600 hover:underline mt-0.5">
											<Phone size={11} /> {data.telepon_customer}
										</a>
									)}
								</div>
							</div>
						)}

						{/* Tujuan */}
						{data.tujuan && (
							<div className="flex items-start gap-3">
								<div className="w-8 h-8 rounded-lg bg-orange-50 flex items-center justify-center flex-shrink-0">
									<MapPin size={15} className="text-orange-500" />
								</div>
								<div>
									<p className="text-xs text-gray-400">Tujuan Pengiriman</p>
									<p className="text-sm font-semibold text-gray-900 mt-0.5">
										{data.tujuan}
									</p>
								</div>
							</div>
						)}

						{/* Sopir */}
						{data.sopir && (
							<div className="flex items-start gap-3">
								<div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
									<Truck size={15} className="text-gray-500" />
								</div>
								<div>
									<p className="text-xs text-gray-400">Sopir</p>
									<p className="text-sm font-semibold text-gray-900 mt-0.5">
										{data.sopir}
									</p>
									{data.telepon_sopir && (
										<a
											href={waLink(data.telepon_sopir)}
											target="_blank"
											rel="noopener noreferrer"
											className="flex items-center gap-1 text-xs text-green-600 hover:underline mt-0.5">
											<Phone size={11} /> {data.telepon_sopir}
										</a>
									)}
								</div>
							</div>
						)}

						{/* Metode */}
						<div className="flex items-start gap-3">
							<div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
								<CreditCard size={15} className="text-blue-500" />
							</div>
							<div>
								<p className="text-xs text-gray-400">Metode Bayar</p>
								<p className="text-sm font-semibold text-gray-900 capitalize mt-0.5">
									{data.metode_bayar}
								</p>
							</div>
						</div>

						{/* Catatan */}
						{data.catatan && (
							<div className="sm:col-span-2 bg-gray-50 rounded-xl px-4 py-3 text-sm text-gray-600">
								<span className="text-xs font-medium text-gray-400 block mb-0.5">
									Catatan
								</span>
								{data.catatan}
							</div>
						)}
					</div>
				</div>

				{/* ── Tabel Item ── */}
				<div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
					<div className="px-6 py-4 border-b border-gray-100">
						<h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">
							Daftar Produk
						</h2>
					</div>
					<div className="overflow-x-auto">
						<table className="w-full text-sm">
							<thead className="bg-gray-50">
								<tr>
									<th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">
										Produk
									</th>
									<th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase">
										Qty
									</th>
									<th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">
										Harga Katalog
									</th>
									<th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">
										Harga Jual
									</th>
									<th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">
										Ongkir
									</th>
									<th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">
										Bonus
									</th>
									<th className="text-right px-6 py-3 text-xs font-semibold text-gray-500 uppercase">
										Subtotal
									</th>
									{isSuperAdmin && (
										<th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">
											Laba
										</th>
									)}
								</tr>
							</thead>
							<tbody className="divide-y divide-gray-50">
								{(data.items || []).map((item: any) => (
									<tr key={item.id} className="hover:bg-gray-50">
										<td className="px-6 py-3.5 font-medium text-gray-900">
											{item.produk?.nama || "-"}
											<span className="ml-1.5 text-xs text-gray-400">
												/{item.produk?.satuan || "unit"}
											</span>
										</td>
										<td className="px-4 py-3.5 text-center text-gray-700 font-semibold">
											{item.jumlah}
										</td>
										<td className="px-4 py-3.5 text-right text-gray-500">
											{formatRupiah(item.harga_katalog)}
										</td>
										<td className="px-4 py-3.5 text-right text-gray-700">
											{formatRupiah(item.harga_jual)}
										</td>
										<td className="px-4 py-3.5 text-right text-gray-500">
											{item.ongkir > 0 ? (
												formatRupiah(item.ongkir)
											) : (
												<span className="text-gray-300">—</span>
											)}
										</td>
										<td className="px-4 py-3.5 text-right text-amber-600">
											{item.bonus > 0 ? (
												formatRupiah(item.bonus)
											) : (
												<span className="text-gray-300">—</span>
											)}
										</td>
										<td className="px-6 py-3.5 text-right font-semibold text-gray-900">
											{formatRupiah(item.harga_jual * item.jumlah)}
										</td>
										{isSuperAdmin && (
											<td className="px-4 py-3.5 text-right text-green-600">
												{formatRupiah(item.laba * item.jumlah)}
											</td>
										)}
									</tr>
								))}
							</tbody>
						</table>
					</div>

					{/* Totals */}
					<div className="border-t border-gray-100 px-6 py-4 space-y-2">
						<div className="flex justify-between text-sm text-gray-600">
							<span>Total Penjualan</span>
							<span className="font-bold text-gray-900 text-base">
								{formatRupiah(grandTotal)}
							</span>
						</div>
						{data.total_ongkir > 0 && (
							<div className="flex justify-between text-sm text-gray-500">
								<span>Info Ongkir</span>
								<span>{formatRupiah(data.total_ongkir)}</span>
							</div>
						)}
						{data.uang_dp > 0 && (
							<>
								<div className="flex justify-between text-sm text-yellow-600">
									<span>Dibayar</span>
									<span className="font-semibold">
										{formatRupiah(data.uang_dp)}
									</span>
								</div>
								{data.status_bayar !== "lunas" && (
									<div className="flex justify-between text-sm text-red-600">
										<span>Sisa Tagihan</span>
										<span className="font-bold">{formatRupiah(sisa)}</span>
									</div>
								)}
							</>
						)}
						{totalBonus > 0 && (
							<div className="flex justify-between text-sm text-amber-600 border-t border-gray-100 pt-2 mt-2">
								<span>Total Bonus Reseller</span>
								<span className="font-semibold">
									{formatRupiah(totalBonus)}
								</span>
							</div>
						)}
						{totalBonus > 0 && (
							<div className="flex items-center justify-between text-xs pt-1">
								<span className="text-gray-400">Persetujuan Reseller</span>
								{data.bonus_disetujui_reseller ? (
									<span className="flex items-center gap-1 font-semibold text-green-600">
										<CheckCircle2 size={12} /> Disetujui
										{data.bonus_disetujui_at && (
											<span className="text-gray-400 font-normal ml-1">
												· {formatDate(data.bonus_disetujui_at)}
											</span>
										)}
									</span>
								) : (
									<span className="flex items-center gap-1 font-semibold text-gray-400">
										<AlertCircle size={12} /> Belum disetujui
									</span>
								)}
							</div>
						)}
						{isSuperAdmin && (
							<div className="flex justify-between text-sm text-green-600 border-t border-gray-100 pt-2 mt-2">
								<span>Total Laba Toko</span>
								<span className="font-bold">
									{formatRupiah(data.total_laba)}
								</span>
							</div>
						)}
					</div>
				</div>

				{/* ── Milestone Tracking ── */}
				{(() => {
					const hasPO = !!data.po_id;
					const current: Milestone = data.milestone ?? "diproses";
					const next = getNextMilestone(current, hasPO);
					const canUpd = canUpdate(current, next, hasPO);
					const steps = hasPO
						? MILESTONES
						: MILESTONES.filter((m) => m !== "diproduksi");
					const currentIdx = (steps as readonly string[]).indexOf(current);
					const latestPersen = [...trackingList]
						.reverse()
						.find((t) => t.persentase != null)?.persentase;

					return (
						<div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
							<div className="flex items-center justify-between mb-5">
								<h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">
									Status Pengiriman
								</h2>
								{data.nomor_resi && (
									<span className="text-xs font-mono text-gray-400 bg-gray-50 px-2 py-1 rounded-lg">
										{data.nomor_resi}
									</span>
								)}
							</div>

							{/* Step indicator */}
							<div className="flex items-center mb-5">
								{steps.map((step, idx) => {
									const done = idx < currentIdx;
									const active = idx === currentIdx;
									return (
										<div
											key={step}
											className="flex items-center flex-1 last:flex-none">
											<div className="flex flex-col items-center">
												<div
													className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
														done
															? "bg-green-500"
															: active
																? "bg-indigo-600"
																: "bg-gray-100"
													}`}>
													{done ? (
														<CheckCircle2 size={16} className="text-white" />
													) : active ? (
														current === "selesai" ? (
															<CheckCircle2 size={16} className="text-white" />
														) : (
															<Loader2
																size={16}
																className="text-white animate-spin"
															/>
														)
													) : (
														<span className="text-xs font-bold text-gray-400">
															{idx + 1}
														</span>
													)}
												</div>
												<span
													className={`text-[10px] mt-1 font-medium whitespace-nowrap ${
														done
															? "text-green-600"
															: active
																? "text-indigo-700"
																: "text-gray-400"
													}`}>
													{MILESTONE_LABEL[step]}
												</span>
											</div>
											{idx < steps.length - 1 && (
												<div
													className={`h-0.5 flex-1 mx-1 mb-4 ${idx < currentIdx ? "bg-green-400" : "bg-gray-200"}`}
												/>
											)}
										</div>
									);
								})}
							</div>

							{/* Progress bar jika diproduksi */}
							{current === "diproduksi" && latestPersen != null && (
								<div className="mb-4">
									<div className="flex justify-between text-xs text-gray-500 mb-1">
										<span>Progress produksi</span>
										<span className="font-bold text-indigo-700">
											{latestPersen}%
										</span>
									</div>
									<div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
										<div
											className="h-full bg-indigo-500 rounded-full transition-all"
											style={{ width: `${latestPersen}%` }}
										/>
									</div>
								</div>
							)}

							{/* Riwayat tracking */}
							{trackingList.length > 0 && (
								<div className="space-y-2 mb-4">
									{trackingList.map((t) => (
										<div
											key={t.id}
											className="flex gap-3 bg-gray-50 rounded-xl p-3 border border-gray-100">
											<div className="w-2 h-2 rounded-full bg-indigo-400 mt-2 flex-shrink-0" />
											<div className="flex-1 min-w-0">
												<div className="flex items-center gap-2 flex-wrap">
													<span className="text-xs font-semibold text-indigo-700">
														{MILESTONE_LABEL[t.milestone as Milestone]}
													</span>
													{t.persentase != null && (
														<span className="text-xs text-gray-500">
															{t.persentase}%
														</span>
													)}
													<span className="text-xs text-gray-400">
														·{" "}
														{new Date(t.created_at).toLocaleDateString(
															"id-ID",
															{
																day: "numeric",
																month: "short",
																year: "numeric",
															},
														)}
													</span>
													{t.creator?.name && (
														<span className="text-xs text-gray-400">
															· {t.creator.name}
														</span>
													)}
												</div>
												{t.catatan && (
													<p className="text-sm text-gray-700 mt-0.5">
														{t.catatan}
													</p>
												)}
												{t.foto_url && (
													<a
														href={t.foto_url}
														target="_blank"
														rel="noopener noreferrer">
														<img
															src={t.foto_url}
															alt="Bukti"
															className="mt-2 h-16 w-24 object-cover rounded-lg border border-gray-200 hover:opacity-80 transition"
														/>
													</a>
												)}
											</div>
										</div>
									))}
								</div>
							)}

							{/* Tombol update milestone */}
							{canUpd && next && current !== "selesai" && (
								<button
									onClick={() => {
										setMsKeterangan("");
										setMsFotoFile(null);
										setMsFotoPreview(null);
										setMsPersentase(50);
										setMsError("");
										setModalMilestone(true);
									}}
									className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold transition">
									<ChevronRight size={15} />
									Update ke: {MILESTONE_LABEL[next]}
								</button>
							)}
						</div>
					);
				})()}

				{/* ── Riwayat Pembayaran ── */}
				{(data.pembayaran?.length > 0 || data.status_bayar !== "lunas") && (
					<div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
						<div className="flex items-center justify-between mb-4">
							<h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">
								Riwayat Pembayaran
							</h2>
							{data.status_bayar !== "lunas" &&
								(isSuperAdmin ||
									role === "kasir" ||
									role === "keuangan" ||
									role === "gudang") && (
									<div className="flex items-center gap-2">
										<button
											onClick={tandaiLunas}
											disabled={savingLunas}
											className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-300 text-white rounded-xl text-xs font-semibold transition">
											<CheckCircle2 size={13} />{" "}
											{savingLunas ? "Memproses..." : "Tandai Lunas"}
										</button>
										<button
											onClick={() => {
												const sisa =
													data.total_harga_jual - (data.uang_dp || 0);
												setPelunasanJumlah(String(sisa > 0 ? sisa : ""));
												setPelunasanMetode("transfer");
												setPelunasanCatatan("");
												setPelunasanFotoFile(null);
												setPelunasanFotoPreview(null);
												setPelunasanError("");
												setModalPelunasan(true);
											}}
											className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-xl text-xs font-semibold transition">
											<Plus size={13} /> Catat Pembayaran
										</button>
									</div>
								)}
						</div>
						{rollbackError && (
							<div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 px-4 py-2.5 rounded-xl text-sm mb-3">
								<AlertCircle size={14} />
								{rollbackError}
							</div>
						)}
						<div className="space-y-2">
							{(!data.pembayaran || data.pembayaran.length === 0) && (
								<p className="text-sm text-gray-400 italic py-2">
									Belum ada catatan pembayaran
								</p>
							)}
							{[...(data.pembayaran || [])]
								.sort(
									(a: any, b: any) =>
										new Date(a.created_at).getTime() -
										new Date(b.created_at).getTime(),
								)
								.map((p: any, i: number) => (
									<div
										key={p.id}
										className="bg-gray-50 rounded-xl px-4 py-3 border border-gray-100">
										<div className="flex items-center justify-between">
											<div className="flex items-center gap-3">
												<span className="w-6 h-6 bg-indigo-100 rounded-full text-xs font-bold text-indigo-600 flex items-center justify-center flex-shrink-0">
													{i + 1}
												</span>
												<div>
													<div className="flex items-center gap-2 text-sm">
														<span className="font-medium text-gray-900 capitalize">
															{p.metode}
														</span>
														{p.catatan && (
															<span className="text-gray-400 text-xs">
																— {p.catatan}
															</span>
														)}
													</div>
													<p className="text-xs text-gray-400 mt-0.5">
														{new Date(p.created_at).toLocaleDateString(
															"id-ID",
															{
																day: "numeric",
																month: "short",
																year: "numeric",
																hour: "2-digit",
																minute: "2-digit",
															},
														)}
													</p>
												</div>
											</div>
											<div className="flex items-center gap-2">
												<span className="font-bold text-gray-900">
													{formatRupiah(p.jumlah)}
												</span>
												{(isSuperAdmin ||
													role === "kasir" ||
													role === "keuangan" ||
													role === "gudang") && (
													<button
														onClick={() => rollbackPembayaran(p)}
														disabled={rollbackingId === p.id}
														title="Rollback pembayaran ini"
														className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition disabled:opacity-50">
														{rollbackingId === p.id ? (
															<Loader2 size={14} className="animate-spin" />
														) : (
															<RotateCcw size={14} />
														)}
													</button>
												)}
											</div>
										</div>
										{p.foto_url && (
											<a
												href={p.foto_url}
												target="_blank"
												rel="noopener noreferrer"
												className="mt-2 block">
												<img
													src={p.foto_url}
													alt="Bukti pembayaran"
													className="h-20 w-32 object-cover rounded-xl border border-gray-200 hover:opacity-80 transition"
												/>
											</a>
										)}
									</div>
								))}
						</div>
					</div>
				)}

				{/* ── Catatan Internal ── */}
				<div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
					<div className="flex items-center justify-between mb-3">
						<h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-2">
							<StickyNote size={14} /> Catatan Internal
						</h2>
						{!catatanInternalEdit && (
							<button
								onClick={() => {
									setCatatanInternalInput(data.catatan_internal || "");
									setCatatanInternalEdit(true);
								}}
								className="flex items-center gap-1.5 text-xs text-indigo-600 hover:text-indigo-800 font-medium transition">
								<Edit3 size={12} /> {data.catatan_internal ? "Edit" : "Tambah"}
							</button>
						)}
					</div>
					{catatanInternalEdit ? (
						<div className="space-y-2">
							<textarea
								value={catatanInternalInput}
								onChange={(e) => setCatatanInternalInput(e.target.value)}
								rows={3}
								placeholder="Catatan pendukung untuk owner saat audit, misal: customer minta kirim sore, sudah konfirmasi via WA..."
								className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
							/>
							<div className="flex gap-2">
								<button
									onClick={() => setCatatanInternalEdit(false)}
									className="px-3 py-1.5 border border-gray-200 rounded-lg text-xs font-medium hover:bg-gray-50">
									Batal
								</button>
								<button
									onClick={saveCatatanInternal}
									disabled={savingCatatan}
									className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white rounded-lg text-xs font-medium transition">
									{savingCatatan ? (
										<Loader2 size={12} className="animate-spin" />
									) : (
										<Check size={12} />
									)}
									Simpan
								</button>
							</div>
						</div>
					) : data.catatan_internal ? (
						<p className="text-sm text-gray-700 whitespace-pre-wrap">
							{data.catatan_internal}
						</p>
					) : (
						<p className="text-sm text-gray-400 italic">
							Belum ada catatan internal
						</p>
					)}
				</div>

				{/* ── Review & Komplain ── */}
				<div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
					<div className="flex items-center justify-between mb-4">
						<div className="flex items-center gap-2">
							<h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">
								Review & Komplain
							</h2>
							{data.reviews?.some(
								(r: any) => r.status === "open" && r.tipe === "komplain",
							) && (
								<span className="text-xs bg-red-100 text-red-600 font-semibold px-2 py-0.5 rounded-full">
									Ada komplain
								</span>
							)}
						</div>
						{!showReviewForm && (
							<button
								onClick={() => setShowReviewForm(true)}
								className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 font-medium">
								<Plus size={13} /> Tambah
							</button>
						)}
					</div>

					{/* Form tambah */}
					{showReviewForm && (
						<div className="bg-gray-50 rounded-xl p-4 mb-4 space-y-3 border border-gray-200">
							<div className="flex gap-2">
								{(["komplain", "pujian", "catatan"] as const).map((t) => {
									const colors = {
										komplain: "bg-red-100 text-red-700 border-red-300",
										pujian: "bg-green-100 text-green-700 border-green-300",
										catatan: "bg-blue-100 text-blue-700 border-blue-300",
									};
									const emojis = {
										komplain: "😤 Komplain",
										pujian: "👍 Pujian",
										catatan: "📝 Catatan",
									};
									return (
										<button
											key={t}
											onClick={() => setReviewForm((f) => ({ ...f, tipe: t }))}
											className={`flex-1 text-xs font-medium py-1.5 rounded-lg border transition ${
												reviewForm.tipe === t
													? colors[t] + " border-2"
													: "bg-white text-gray-500 border-gray-200 hover:bg-gray-50"
											}`}>
											{emojis[t]}
										</button>
									);
								})}
							</div>
							<textarea
								value={reviewForm.isi}
								onChange={(e) =>
									setReviewForm((f) => ({ ...f, isi: e.target.value }))
								}
								rows={3}
								placeholder="Ceritakan detail..."
								className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
							/>
							<div className="flex gap-2 justify-end">
								<button
									onClick={() => {
										setShowReviewForm(false);
										setReviewForm({ tipe: "komplain", isi: "" });
									}}
									className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">
									Batal
								</button>
								<button
									onClick={saveReview}
									disabled={savingReview || !reviewForm.isi.trim()}
									className="px-4 py-1.5 text-sm bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white rounded-lg font-medium transition">
									{savingReview ? "Menyimpan..." : "Simpan"}
								</button>
							</div>
						</div>
					)}

					{(!data.reviews || data.reviews.length === 0) && !showReviewForm ? (
						<p className="text-sm text-gray-400 text-center py-6">
							Belum ada review untuk faktur ini
						</p>
					) : (
						<div className="space-y-2">
							{(data.reviews || []).map((r: any) => {
								const cfg =
									TIPE_CFG[r.tipe as keyof typeof TIPE_CFG] || TIPE_CFG.catatan;
								const Icon = cfg.Icon;
								return (
									<div
										key={r.id}
										className="border border-gray-100 rounded-xl p-4">
										<div className="flex items-start justify-between gap-2">
											<div className="flex items-center gap-2 flex-wrap">
												<span
													className={`flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${cfg.badge}`}>
													<Icon size={11} /> {cfg.label}
												</span>
												<span className="text-xs text-gray-400">
													{new Date(r.created_at).toLocaleDateString("id-ID", {
														day: "numeric",
														month: "short",
														year: "numeric",
													})}
												</span>
												{r.creator?.name && (
													<span className="text-xs text-gray-400">
														· {r.creator.name}
													</span>
												)}
											</div>
											<div className="flex-shrink-0">
												{r.tipe === "komplain" &&
													(r.status === "resolved" ? (
														<span className="flex items-center gap-1 text-xs text-green-600 font-medium">
															<CheckCircle2 size={12} /> Selesai
														</span>
													) : isSuperAdmin ? (
														<button
															onClick={() => resolveReview(r.id)}
															className="text-xs text-gray-500 hover:text-green-600 border border-gray-200 hover:border-green-300 px-2 py-0.5 rounded-lg transition">
															Tandai Selesai
														</button>
													) : (
														<span className="text-xs bg-orange-50 text-orange-600 px-2 py-0.5 rounded-full">
															Open
														</span>
													))}
											</div>
										</div>
										<p className="text-sm text-gray-700 mt-2 leading-relaxed">
											{r.isi}
										</p>
									</div>
								);
							})}
						</div>
					)}
				</div>
			</div>

			{/* ─── MODAL PELUNASAN ─── */}
			{modalPelunasan &&
				(() => {
					const sisa = data.total_harga_jual - (data.uang_dp || 0);
					return (
						<div className="fixed inset-0 bg-black/40 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
							<div className="bg-white rounded-t-3xl sm:rounded-2xl w-full sm:max-w-md shadow-2xl">
								<div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
									<div>
										<h3 className="font-semibold text-gray-900">
											Catat Pembayaran
										</h3>
										<p className="text-sm text-gray-400 mt-0.5">
											Sisa tagihan:{" "}
											<span className="font-semibold text-red-600">
												{formatRupiah(sisa)}
											</span>
										</p>
									</div>
									<button
										onClick={() => setModalPelunasan(false)}
										className="p-2 hover:bg-gray-100 rounded-xl">
										<X size={18} />
									</button>
								</div>
								<div className="px-6 py-5 space-y-4">
									{/* Jumlah */}
									<div>
										<label className="block text-sm font-medium text-gray-700 mb-1">
											Jumlah Pembayaran *
										</label>
										<input
											type="number"
											min="1"
											value={pelunasanJumlah}
											onChange={(e) => {
												setPelunasanJumlah(e.target.value);
												setPelunasanError("");
											}}
											placeholder="0"
											autoFocus
											className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
										/>
										{pelunasanJumlah &&
											parseFloat(pelunasanJumlah) >= sisa - 0.01 && (
												<p className="text-xs text-green-600 mt-1 font-medium">
													✓ Transaksi akan lunas
												</p>
											)}
									</div>
									{/* Metode */}
									<div>
										<label className="block text-sm font-medium text-gray-700 mb-1">
											Metode Pembayaran *
										</label>
										<div className="grid grid-cols-3 gap-2">
											{(["transfer", "cash", "cod"] as const).map((m) => (
												<button
													key={m}
													onClick={() => setPelunasanMetode(m)}
													className={`py-2 rounded-xl text-sm font-medium border transition capitalize ${
														pelunasanMetode === m
															? "bg-green-600 text-white border-green-600"
															: "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
													}`}>
													{m}
												</button>
											))}
										</div>
									</div>
									{/* Catatan */}
									<div>
										<label className="block text-sm font-medium text-gray-700 mb-1">
											Catatan
										</label>
										<input
											value={pelunasanCatatan}
											onChange={(e) => setPelunasanCatatan(e.target.value)}
											placeholder="Misal: Pelunasan via BCA, no. rek. 123..."
											className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
										/>
									</div>
									{/* Foto bukti */}
									<div>
										<label className="block text-sm font-medium text-gray-700 mb-1">
											Bukti Transfer / No. Resi
										</label>
										<input
											type="file"
											accept="image/*"
											// capture="environment"
											onChange={(e) => {
												const f = e.target.files?.[0] ?? null;
												setPelunasanFotoFile(f);
												setPelunasanFotoPreview(
													f ? URL.createObjectURL(f) : null,
												);
											}}
											className="w-full text-sm text-gray-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-medium file:bg-green-50 file:text-green-700 hover:file:bg-green-100"
										/>
										{pelunasanFotoPreview && (
											<img
												src={pelunasanFotoPreview}
												alt="Preview bukti"
												className="mt-2 h-28 w-44 object-cover rounded-xl border border-gray-200"
											/>
										)}
									</div>
									{pelunasanError && (
										<p className="text-sm text-red-600 bg-red-50 border border-red-200 px-3 py-2 rounded-xl">
											{pelunasanError}
										</p>
									)}
								</div>
								<div className="flex gap-3 px-6 pb-5">
									<button
										onClick={() => setModalPelunasan(false)}
										disabled={savingPelunasan}
										className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition">
										Batal
									</button>
									<button
										onClick={savePelunasan}
										disabled={savingPelunasan || !pelunasanJumlah}
										className="flex-1 py-2.5 bg-green-600 hover:bg-green-700 disabled:bg-green-300 text-white rounded-xl text-sm font-semibold transition flex items-center justify-center gap-2">
										{savingPelunasan ? (
											<>
												<Loader2 size={14} className="animate-spin" />
												Menyimpan...
											</>
										) : (
											<>
												<CreditCard size={14} />
												Simpan Pembayaran
											</>
										)}
									</button>
								</div>
							</div>
						</div>
					);
				})()}

			{/* ─── MODAL HAPUS PENJUALAN ─── */}
			{deleteModal && (
				<div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
					<div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl">
						<div className="px-6 py-5 space-y-3">
							<div className="w-12 h-12 bg-red-100 rounded-2xl flex items-center justify-center mb-4">
								<Trash2 size={22} className="text-red-600" />
							</div>
							<h3 className="text-base font-semibold text-gray-900">
								Hapus Penjualan?
							</h3>
							<p className="text-sm text-gray-500 leading-relaxed">
								Faktur{" "}
								<span className="font-mono font-semibold text-gray-700">
									{data.nomor_faktur}
								</span>{" "}
								akan dihapus permanen. Stok produk akan dikembalikan otomatis.
							</p>
							{deleteError && (
								<p className="text-sm text-red-600 bg-red-50 border border-red-200 px-3 py-2 rounded-xl">
									{deleteError}
								</p>
							)}
						</div>
						<div className="flex gap-3 px-6 pb-5">
							<button
								onClick={() => setDeleteModal(false)}
								disabled={deleting}
								className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition">
								Batal
							</button>
							<button
								onClick={deletePenjualan}
								disabled={deleting}
								className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 disabled:bg-red-300 text-white rounded-xl text-sm font-semibold transition flex items-center justify-center gap-2">
								{deleting ? (
									<>
										<Loader2 size={14} className="animate-spin" />
										Menghapus...
									</>
								) : (
									<>
										<Trash2 size={14} />
										Ya, Hapus
									</>
								)}
							</button>
						</div>
					</div>
				</div>
			)}

			{/* ─── MODAL BONUS OWNER ─── */}
			{modalBonusOwner && data && (
				<div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
					<div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl">
						<div className="flex items-center justify-between p-5 border-b border-gray-100">
							<div>
								<h3 className="font-semibold text-gray-900">
									Bonus dari Owner
								</h3>
								<p className="text-xs text-gray-400 mt-0.5">
									{data.nomor_faktur}
								</p>
							</div>
							<button
								onClick={() => setModalBonusOwner(false)}
								className="p-2 hover:bg-gray-100 rounded-lg">
								<X size={16} />
							</button>
						</div>
						<div className="p-5 space-y-4">
							{/* Info bonus otomatis */}
							<div className="bg-gray-50 rounded-xl px-4 py-3 text-sm">
								<div className="flex justify-between text-gray-500 mb-1">
									<span>Bonus Reseller (auto)</span>
									<span className="font-medium text-gray-700">
										{formatRupiah(data.total_bonus || 0)}
									</span>
								</div>
								<div className="flex justify-between text-gray-500">
									<span>Sudah Dibayar</span>
									<span className="font-medium text-green-600">
										{formatRupiah(data.bonus_terbayar || 0)}
									</span>
								</div>
							</div>

							<div>
								<label className="block text-sm font-medium text-gray-700 mb-1.5">
									Bonus Tambahan dari Owner{" "}
									<span className="text-gray-400 font-normal">(manual)</span>
								</label>
								<input
									type="number"
									min="0"
									step="1000"
									value={bonusOwnerInput}
									onChange={(e) => setBonusOwnerInput(e.target.value)}
									className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
									placeholder="0"
								/>
							</div>
							<div>
								<label className="block text-sm font-medium text-gray-700 mb-1.5">
									Keterangan
								</label>
								<input
									type="text"
									value={bonusOwnerCatatan}
									onChange={(e) => setBonusOwnerCatatan(e.target.value)}
									className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
									placeholder="Misal: Bonus pencapaian target bulan ini"
								/>
							</div>

							{/* Preview total */}
							{(data.total_bonus || 0) + (Number(bonusOwnerInput) || 0) > 0 && (
								<div className="bg-indigo-50 rounded-xl px-4 py-3 text-sm">
									<div className="flex justify-between font-semibold text-indigo-800">
										<span>Total Bonus ke Reseller</span>
										<span>
											{formatRupiah(
												(data.total_bonus || 0) +
													(Number(bonusOwnerInput) || 0),
											)}
										</span>
									</div>
									{(() => {
										const sisa = Math.max(
											0,
											(data.total_bonus || 0) +
												(Number(bonusOwnerInput) || 0) -
												(data.bonus_terbayar || 0),
										);
										return sisa > 0 ? (
											<div className="flex justify-between text-amber-600 mt-1">
												<span>Belum dibayar</span>
												<span>{formatRupiah(sisa)}</span>
											</div>
										) : null;
									})()}
								</div>
							)}

							<div className="flex gap-2 pt-1">
								<button
									onClick={() => setModalBonusOwner(false)}
									className="flex-1 border border-gray-200 rounded-xl py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50 transition">
									Batal
								</button>
								<button
									onClick={saveBonusOwner}
									disabled={savingBonusOwner}
									className="flex-1 bg-indigo-600 text-white rounded-xl py-2.5 text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition flex items-center justify-center gap-2">
									{savingBonusOwner ? (
										<>
											<Loader2 size={13} className="animate-spin" />
											Menyimpan...
										</>
									) : (
										<>
											<Gift size={13} />
											Simpan Bonus
										</>
									)}
								</button>
							</div>
						</div>
					</div>
				</div>
			)}

			{/* ─── MODAL UPDATE MILESTONE ─── */}
			{modalMilestone &&
				(() => {
					const hasPO = !!data.po_id;
					const current: Milestone = data.milestone ?? "diproses";
					const next = getNextMilestone(current, hasPO);
					if (!next) return null;
					return (
						<div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
							<div className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
								<div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
									<div>
										<h3 className="font-semibold text-gray-900">
											Update Status Pengiriman
										</h3>
										<p className="text-sm text-gray-400 mt-0.5">
											{MILESTONE_LABEL[current]}{" "}
											<ChevronRight size={12} className="inline" />{" "}
											<span className="text-indigo-600 font-medium">
												{MILESTONE_LABEL[next]}
											</span>
										</p>
									</div>
									<button
										onClick={() => setModalMilestone(false)}
										className="p-2 hover:bg-gray-100 rounded-lg">
										<AlertCircle size={18} className="text-gray-400" />
									</button>
								</div>
								<div className="p-6 space-y-4">
									{next === "diproduksi" && (
										<div>
											<label className="block text-xs font-medium text-gray-600 mb-1">
												Persentase Produksi:{" "}
												<span className="font-bold text-indigo-700">
													{msPersentase}%
												</span>
											</label>
											<input
												type="range"
												min={0}
												max={100}
												step={5}
												value={msPersentase}
												onChange={(e) =>
													setMsPersentase(Number(e.target.value))
												}
												className="w-full accent-indigo-600"
											/>
										</div>
									)}
									<div>
										<label className="block text-xs font-medium text-gray-600 mb-1">
											Catatan (opsional)
										</label>
										<textarea
											value={msKeterangan}
											onChange={(e) => setMsKeterangan(e.target.value)}
											rows={2}
											placeholder="Keterangan update status..."
											className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
										/>
									</div>
									<div>
										<label className="block text-xs font-medium text-gray-600 mb-1">
											Foto (opsional)
										</label>
										<input
											type="file"
											accept="image/*"
											// capture="environment"
											onChange={(e) => {
												const f = e.target.files?.[0] ?? null;
												setMsFotoFile(f);
												setMsFotoPreview(f ? URL.createObjectURL(f) : null);
											}}
											className="w-full text-sm text-gray-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-medium file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
										/>
										{msFotoPreview && (
											<img
												src={msFotoPreview}
												alt="Preview"
												className="mt-2 h-24 w-36 object-cover rounded-xl border border-gray-200"
											/>
										)}
									</div>
									{msError && (
										<div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 px-3 py-2.5 rounded-xl text-sm">
											<AlertCircle size={14} /> {msError}
										</div>
									)}
								</div>
								<div className="flex gap-3 px-6 pb-6">
									<button
										onClick={() => setModalMilestone(false)}
										className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition">
										Batal
									</button>
									<button
										onClick={submitMilestone}
										disabled={msSaving}
										className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white rounded-xl text-sm font-semibold transition flex items-center justify-center gap-2">
										{msSaving ? (
											<Loader2 size={15} className="animate-spin" />
										) : (
											<CheckCircle2 size={15} />
										)}
										{msSaving
											? "Menyimpan..."
											: `Konfirmasi: ${MILESTONE_LABEL[next]}`}
									</button>
								</div>
							</div>
						</div>
					);
				})()}

			{/* Hidden area untuk render QR canvas resi sebelum print */}
			{data.nomor_resi && (
				<div ref={resiQrRef} className="hidden" aria-hidden="true">
					<QRCodeCanvas
						value={`${typeof window !== "undefined" ? window.location.origin : ""}/resi/${data.nomor_resi}`}
						size={200}
						level="M"
					/>
				</div>
			)}
		</div>
	);
}
