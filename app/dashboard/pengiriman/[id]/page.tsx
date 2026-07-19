"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { formatRupiah, formatDate, waLink } from "@/lib/utils";
import { printPengirimanInvoice } from "@/lib/printPengirimanInvoice";
import { printPengirimanResi } from "@/lib/printPengirimanResi";
import { MilestonePengiriman, AlasanGagal, TransitTipeEvent } from "@/lib/types";
import { getNextMilestones, ALASAN_GAGAL_CFG } from "@/lib/pengirimanConstants";
import { logAktivitas } from "@/lib/aktivitas";
import { submitGagalKirim as submitGagalKirimAksi, submitSelesaiPOD as submitSelesaiPodAksi } from "@/lib/pengirimanAksi";
import { QRCodeCanvas } from "qrcode.react";
import {
	ArrowLeft,
	Printer,
	Tag,
	CheckCircle2,
	AlertCircle,
	Plus,
	Phone,
	User,
	MapPin,
	Send,
	Truck,
	Package,
	Weight,
	CreditCard,
	Copy,
	Share2,
	ChevronRight,
	Loader2,
	Edit3,
	Check,
	Trash2,
	X,
	RotateCcw,
	StickyNote,
	Clock,
	PackageX,
	Undo2,
	Camera,
	ArrowDownToLine,
	ArrowUpFromLine,
} from "lucide-react";
import Link from "next/link";

type Milestone = MilestonePengiriman;

// Node visual stepper (jalur sukses) — gagal_kirim/retur ditampilkan sebagai
// banner terpisah di bawah stepper, bukan node ke-5/6 (lihat §3 spec POD).
const HAPPY_PATH: Milestone[] = ["diproses", "dijemput", "dikirim", "selesai"];

const MILESTONE_LABEL: Record<Milestone, string> = {
	diproses: "Diproses",
	dijemput: "Dijemput",
	dikirim: "Dikirim",
	gagal_kirim: "Gagal Kirim",
	retur: "Retur",
	selesai: "Selesai",
};

const JENIS_LAYANAN_LABEL: Record<string, string> = {
	reguler: "Reguler",
	express: "Express",
	kargo: "Kargo",
};

export default function DetailPengirimanPage() {
	const { id } = useParams<{ id: string }>();
	const router = useRouter();
	const supabase = createClient();
	const { isSuperAdmin, role, profile } = useAuth();

	const [data, setData] = useState<any>(null);
	const [loading, setLoading] = useState(true);
	const [notFound, setNotFound] = useState(false);
	const resiQrRef = useRef<HTMLDivElement>(null);

	// Catatan internal
	const [catatanInternalEdit, setCatatanInternalEdit] = useState(false);
	const [catatanInternalInput, setCatatanInternalInput] = useState("");
	const [savingCatatan, setSavingCatatan] = useState(false);

	// Pelunasan
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

	// Delete
	const [deleteModal, setDeleteModal] = useState(false);
	const [deleting, setDeleting] = useState(false);
	const [deleteError, setDeleteError] = useState("");

	// Tracking / milestone (generic — dipakai utk diproses→dijemput, dijemput→dikirim,
	// dan gagal_kirim→dikirim kirim ulang manual)
	const [trackingList, setTrackingList] = useState<any[]>([]);
	const [modalMilestone, setModalMilestone] = useState(false);
	const [msTarget, setMsTarget] = useState<Milestone | null>(null);
	const [msKeterangan, setMsKeterangan] = useState("");
	const [msFotoFile, setMsFotoFile] = useState<File | null>(null);
	const [msFotoPreview, setMsFotoPreview] = useState<string | null>(null);
	const [msSaving, setMsSaving] = useState(false);
	const [msError, setMsError] = useState("");

	// Riwayat Transit (spec 09) — log paralel, TIDAK PERNAH mengubah
	// milestone. Form manual: superadmin/gudang/kurir/sopir (§4 spec 09).
	const [transitList, setTransitList] = useState<any[]>([]);
	const [cabangList, setCabangList] = useState<{ id: string; nama: string; kota: string | null }[]>(
		[],
	);
	const [transitCabangId, setTransitCabangId] = useState("");
	const [transitTipe, setTransitTipe] = useState<TransitTipeEvent>("tiba");
	const [transitCatatan, setTransitCatatan] = useState("");
	const [transitSaving, setTransitSaving] = useState(false);
	const [transitError, setTransitError] = useState("");

	// Modal Gagal Kirim (dikirim → gagal_kirim)
	const [modalGagal, setModalGagal] = useState(false);
	const [gagalAlasan, setGagalAlasan] = useState<AlasanGagal | "">("");
	const [gagalCatatan, setGagalCatatan] = useState("");
	const [gagalFotoFile, setGagalFotoFile] = useState<File | null>(null);
	const [gagalFotoPreview, setGagalFotoPreview] = useState<string | null>(null);
	const [gagalSaving, setGagalSaving] = useState(false);
	const [gagalError, setGagalError] = useState("");

	// Modal Tandai Selesai — POD wajib (dikirim → selesai)
	const [modalSelesai, setModalSelesai] = useState(false);
	const [podNama, setPodNama] = useState("");
	const [podCatatan, setPodCatatan] = useState("");
	const [podFotoFile, setPodFotoFile] = useState<File | null>(null);
	const [podFotoPreview, setPodFotoPreview] = useState<string | null>(null);
	const [podSaving, setPodSaving] = useState(false);
	const [podError, setPodError] = useState("");

	// Modal Retur ke Pengirim (gagal_kirim → retur, terminal)
	const [modalRetur, setModalRetur] = useState(false);
	const [returCatatan, setReturCatatan] = useState("");
	const [returSaving, setReturSaving] = useState(false);
	const [returError, setReturError] = useState("");

	useEffect(() => {
		if (!id) return;
		load();
	}, [id]);

	const load = async () => {
		setLoading(true);
		const [{ data: pg }, { data: tracking }, { data: transit }, { data: cabang }] =
			await Promise.all([
				supabase
					.from("pengiriman")
					.select("*, pembayaran:pengiriman_pembayaran(*)")
					.eq("id", id)
					.single(),
				supabase
					.from("pengiriman_tracking")
					.select("*, creator:profiles!created_by(name)")
					.eq("pengiriman_id", id)
					.order("created_at", { ascending: true }),
				supabase
					.from("pengiriman_transit")
					.select(
						"*, cabang:cabang(nama, kota), creator:profiles!created_by(name), manifest:manifest(nomor_manifest)",
					)
					.eq("pengiriman_id", id)
					.order("created_at", { ascending: true }),
				supabase.from("cabang").select("id, nama, kota").eq("aktif", true).order("nama"),
			]);
		if (!pg) {
			setNotFound(true);
			setLoading(false);
			return;
		}
		setData(pg);
		setTrackingList(tracking || []);
		setTransitList(transit || []);
		setCabangList(cabang || []);
		setLoading(false);
	};

	const saveCatatanInternal = async () => {
		if (!data) return;
		setSavingCatatan(true);
		await supabase
			.from("pengiriman")
			.update({ catatan_internal: catatanInternalInput.trim() || null })
			.eq("id", data.id);
		setData((d: any) => ({
			...d,
			catatan_internal: catatanInternalInput.trim() || null,
		}));
		setSavingCatatan(false);
		setCatatanInternalEdit(false);
	};

	// ── Milestone logic — peta transisi bercabang, lihat docs/spec/01-gagal-kirim-pod.md §3/§4 ──
	const canTransition = (from: Milestone, to: Milestone): boolean => {
		if (isSuperAdmin) return true;
		if (from === "diproses" && to === "dijemput")
			return role === "gudang" || role === "kurir";
		if (from === "dijemput" && to === "dikirim")
			return ["gudang", "kurir", "keuangan", "sopir", "kasir"].includes(role ?? "");
		if (from === "dikirim" && to === "selesai")
			return ["sopir", "kurir", "keuangan", "kasir"].includes(role ?? "");
		if (from === "dikirim" && to === "gagal_kirim")
			return ["sopir", "kurir", "kasir", "keuangan"].includes(role ?? "");
		if (from === "gagal_kirim" && to === "dikirim")
			return ["gudang", "kurir", "sopir"].includes(role ?? "");
		if (from === "gagal_kirim" && to === "retur")
			return ["cs", "gudang"].includes(role ?? "");
		return false;
	};

	const reloadTracking = async () => {
		const { data: tracking } = await supabase
			.from("pengiriman_tracking")
			.select("*, creator:profiles!created_by(name)")
			.eq("pengiriman_id", id)
			.order("created_at", { ascending: true });
		setTrackingList(tracking || []);
	};

	// Riwayat Transit (spec 09) — log paralel, TIDAK PERNAH menyentuh
	// milestone/pengiriman_tracking. §4: role sama dengan akses transisi
	// milestone dikirim (superadmin, gudang, kurir, sopir) — cs TIDAK bisa.
	const canInputTransit = isSuperAdmin || ["gudang", "kurir", "sopir"].includes(role ?? "");

	const reloadTransit = async () => {
		const { data: transit } = await supabase
			.from("pengiriman_transit")
			.select(
				"*, cabang:cabang(nama, kota), creator:profiles!created_by(name), manifest:manifest(nomor_manifest)",
			)
			.eq("pengiriman_id", id)
			.order("created_at", { ascending: true });
		setTransitList(transit || []);
	};

	const addTransit = async () => {
		if (!transitCabangId) {
			setTransitError("Pilih hub/cabang terlebih dahulu.");
			return;
		}
		setTransitSaving(true);
		setTransitError("");

		const { error } = await supabase.from("pengiriman_transit").insert({
			pengiriman_id: id,
			cabang_id: transitCabangId,
			tipe_event: transitTipe,
			catatan: transitCatatan.trim() || null,
			created_by: profile?.id,
		});

		if (error) {
			setTransitError("Gagal menyimpan: " + error.message);
			setTransitSaving(false);
			return;
		}

		setTransitCabangId("");
		setTransitTipe("tiba");
		setTransitCatatan("");
		setTransitSaving(false);
		await reloadTransit();
	};

	const submitMilestone = async () => {
		if (!data || !msTarget) return;
		const next = msTarget;
		setMsSaving(true);
		setMsError("");

		let foto_url: string | null = null;
		if (msFotoFile) {
			const ext = msFotoFile.name.split(".").pop();
			const path = `pengiriman-tracking/${data.id}/${Date.now()}.${ext}`;
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

		await supabase.from("pengiriman_tracking").insert({
			pengiriman_id: data.id,
			milestone: next,
			catatan: msKeterangan.trim() || null,
			foto_url,
			created_by: profile?.id,
		});

		await supabase.from("pengiriman").update({ milestone: next }).eq("id", data.id);

		setData((d: any) => ({ ...d, milestone: next }));
		await reloadTracking();

		setMsSaving(false);
		setModalMilestone(false);
		setMsTarget(null);
		setMsKeterangan("");
		setMsFotoFile(null);
		setMsFotoPreview(null);
	};

	const submitGagalKirim = async () => {
		if (!data) return;
		if (!gagalAlasan) {
			setGagalError("Alasan gagal wajib dipilih.");
			return;
		}
		setGagalSaving(true);
		setGagalError("");

		const result = await submitGagalKirimAksi(supabase, {
			pengirimanId: data.id,
			jumlahGagalSebelum: data.jumlah_gagal || 0,
			alasan: gagalAlasan,
			catatan: gagalCatatan,
			fotoFile: gagalFotoFile,
			createdBy: profile?.id,
		});
		if (!result.ok) {
			setGagalError(result.error || "Gagal menyimpan.");
			setGagalSaving(false);
			return;
		}

		setGagalSaving(false);
		setModalGagal(false);
		setGagalAlasan("");
		setGagalCatatan("");
		setGagalFotoFile(null);
		setGagalFotoPreview(null);
		load();
	};

	const submitSelesaiPOD = async () => {
		if (!data) return;
		if (podNama.trim().length < 2) {
			setPodError("Nama penerima wajib diisi (minimal 2 karakter).");
			return;
		}
		if (!podFotoFile) {
			setPodError("Foto bukti serah terima (POD) wajib diupload.");
			return;
		}
		setPodSaving(true);
		setPodError("");

		const result = await submitSelesaiPodAksi(supabase, {
			pengirimanId: data.id,
			podNama,
			podCatatan,
			podFotoFile,
			createdBy: profile?.id,
		});
		if (!result.ok) {
			setPodError(result.error || "Gagal menyimpan.");
			setPodSaving(false);
			return;
		}

		setPodSaving(false);
		setModalSelesai(false);
		setPodNama("");
		setPodCatatan("");
		setPodFotoFile(null);
		setPodFotoPreview(null);
		load();
	};

	const submitRetur = async () => {
		if (!data) return;
		setReturSaving(true);
		setReturError("");

		await supabase.from("pengiriman_tracking").insert({
			pengiriman_id: data.id,
			milestone: "retur",
			catatan: returCatatan.trim() || null,
			created_by: profile?.id,
		});

		await supabase.from("pengiriman").update({ milestone: "retur" }).eq("id", data.id);

		setReturSaving(false);
		setModalRetur(false);
		setReturCatatan("");
		load();
	};

	const savePelunasan = async () => {
		if (!data) return;
		const jumlah = parseFloat(pelunasanJumlah);
		if (!jumlah || jumlah <= 0) {
			setPelunasanError("Jumlah pembayaran harus lebih dari 0.");
			return;
		}
		const sisa = data.total_tagihan - (data.uang_dp || 0);
		if (jumlah > sisa + 0.01) {
			setPelunasanError(`Jumlah melebihi sisa tagihan (${formatRupiah(sisa)}).`);
			return;
		}
		setSavingPelunasan(true);
		setPelunasanError("");

		let foto_url: string | null = null;
		if (pelunasanFotoFile) {
			const ext = pelunasanFotoFile.name.split(".").pop();
			const path = `pengiriman-pembayaran/${data.id}/${Date.now()}.${ext}`;
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

		const { error: insErr } = await supabase.from("pengiriman_pembayaran").insert({
			pengiriman_id: data.id,
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
		const newStatus = newUangDp >= data.total_tagihan - 0.01 ? "lunas" : "dp";

		await supabase
			.from("pengiriman")
			.update({ uang_dp: newUangDp, status_bayar: newStatus })
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
		const sisa = data.total_tagihan - (data.uang_dp || 0);
		if (sisa <= 0) return;
		if (
			!confirm(
				`Tandai pengiriman ini LUNAS? Sisa tagihan ${formatRupiah(sisa)} akan dicatat sebagai pembayaran.`,
			)
		)
			return;

		setSavingLunas(true);

		const { error: insErr } = await supabase.from("pengiriman_pembayaran").insert({
			pengiriman_id: data.id,
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
			.from("pengiriman")
			.update({ uang_dp: data.total_tagihan, status_bayar: "lunas" })
			.eq("id", data.id);

		setSavingLunas(false);
		load();
	};

	const rollbackPembayaran = async (p: any) => {
		if (!data) return;
		if (
			!confirm(
				`Rollback pembayaran ${formatRupiah(p.jumlah)} ini? Status pembayaran akan disesuaikan kembali.`,
			)
		)
			return;

		setRollbackError("");
		setRollbackingId(p.id);

		const { error: delErr } = await supabase
			.from("pengiriman_pembayaran")
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
				: newUangDp >= data.total_tagihan - 0.01
					? "lunas"
					: "dp";

		await supabase
			.from("pengiriman")
			.update({ uang_dp: newUangDp, status_bayar: newStatus })
			.eq("id", data.id);

		await logAktivitas(supabase, {
			aksi: "rollback_pembayaran",
			entitas: "pengiriman_pembayaran",
			entitas_id: p.id,
			ref: data.nomor_faktur,
			detail: {
				jumlah: p.jumlah,
				metode: p.metode,
				uang_dp_sebelum: data.uang_dp,
				uang_dp_sesudah: newUangDp,
				status_bayar_sebelum: data.status_bayar,
				status_bayar_sesudah: newStatus,
			},
			created_by: profile?.id,
		});

		setRollbackingId(null);
		load();
	};

	const deletePengiriman = async () => {
		if (!data) return;
		setDeleting(true);
		setDeleteError("");

		const { error } = await supabase.from("pengiriman").delete().eq("id", data.id);
		if (error) {
			setDeleteError("Gagal menghapus: " + error.message);
			setDeleting(false);
			return;
		}

		await logAktivitas(supabase, {
			aksi: "delete_pengiriman",
			entitas: "pengiriman",
			entitas_id: data.id,
			ref: data.nomor_faktur,
			detail: {
				nomor_resi: data.nomor_resi,
				penerima_nama: data.penerima_nama,
				total_tagihan: data.total_tagihan,
				status_bayar: data.status_bayar,
				milestone: data.milestone,
			},
			created_by: profile?.id,
		});

		router.push("/dashboard/pengiriman");
	};

	const handlePrint = () => {
		if (!data) return;
		printPengirimanInvoice(data);
	};

	const handlePrintResi = () => {
		if (!data || !data.nomor_resi) return;
		const canvas = resiQrRef.current?.querySelector(
			"canvas",
		) as HTMLCanvasElement | null;
		if (!canvas) return;
		printPengirimanResi({ ...data, qrDataUrl: canvas.toDataURL("image/png") });
	};

	if (loading) {
		return (
			<div className="flex items-center justify-center min-h-[60vh]">
				<p className="text-gray-400">Memuat detail pengiriman...</p>
			</div>
		);
	}

	if (notFound || !data) {
		return (
			<div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
				<p className="text-gray-500 font-medium">Pengiriman tidak ditemukan</p>
				<Link
					href="/dashboard/pengiriman"
					className="text-sm text-indigo-600 hover:underline">
					← Kembali ke Pengiriman
				</Link>
			</div>
		);
	}

	const sisa = data.total_tagihan - (data.uang_dp || 0);
	const current: Milestone = data.milestone ?? "diproses";
	const isBranch = current === "gagal_kirim" || current === "retur";
	// Node stepper hanya render jalur sukses — saat gagal_kirim/retur, node
	// diproses/dijemput/dikirim tampil "selesai" (hijau) tapi node terakhir
	// tidak aktif; state sebenarnya dijelaskan lewat banner di bawah stepper.
	const currentIdx = isBranch ? HAPPY_PATH.length - 1 : HAPPY_PATH.indexOf(current);
	const nextOptions = getNextMilestones(current).filter((n) => canTransition(current, n));
	const latestGagal = [...trackingList]
		.reverse()
		.find((t) => t.milestone === "gagal_kirim");

	return (
		<div className="max-w-4xl mx-auto">
			{/* ── Header ── */}
			<div className="mb-6">
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
							<span className="text-xs px-2.5 py-1 rounded-full font-semibold bg-indigo-100 text-indigo-700">
								{JENIS_LAYANAN_LABEL[data.jenis_layanan] || data.jenis_layanan}
							</span>
							<span className="text-xs text-gray-400">
								{formatDate(data.tanggal)}
							</span>
						</div>
					</div>
				</div>

				<div className="flex items-center gap-2 flex-wrap pl-11">
					{data.nomor_resi && (
						<button
							onClick={() => {
								const url = `${window.location.origin}/resi/${data.nomor_resi}`;
								if (data.penerima_telepon) {
									const pesan = `Halo! Pantau status pengiriman Anda di: ${url}`;
									window.open(
										waLink(data.penerima_telepon) +
											`?text=${encodeURIComponent(pesan)}`,
										"_blank",
									);
								} else {
									navigator.clipboard.writeText(url);
								}
							}}
							className="flex items-center gap-1.5 px-3 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-sm font-medium transition border border-indigo-200">
							<Share2 size={14} />
							{data.penerima_telepon ? "Kirim ke Penerima" : "Copy Link Tracking"}
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
					{(isSuperAdmin ||
						role === "kasir" ||
						role === "kurir" ||
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

			<div className="space-y-4">
				{/* ── Info Pengiriman ── */}
				<div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
					<h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">
						Informasi Pengiriman
					</h2>
					<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
						<div className="flex items-start gap-3">
							<div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center flex-shrink-0">
								<Send size={15} className="text-indigo-500" />
							</div>
							<div>
								<p className="text-xs text-gray-400">Pengirim</p>
								<p className="text-sm font-semibold text-gray-900 mt-0.5">
									{data.pengirim_nama}
								</p>
								{data.pengirim_telepon && (
									<a
										href={waLink(data.pengirim_telepon)}
										target="_blank"
										rel="noopener noreferrer"
										className="flex items-center gap-1 text-xs text-green-600 hover:underline mt-0.5">
										<Phone size={11} /> {data.pengirim_telepon}
									</a>
								)}
								{(data.pengirim_alamat || data.pengirim_kota) && (
									<p className="text-xs text-gray-500 mt-0.5">
										{data.pengirim_alamat}
										{data.pengirim_kota ? `, ${data.pengirim_kota}` : ""}
									</p>
								)}
							</div>
						</div>

						<div className="flex items-start gap-3">
							<div className="w-8 h-8 rounded-lg bg-rose-50 flex items-center justify-center flex-shrink-0">
								<MapPin size={15} className="text-rose-500" />
							</div>
							<div>
								<p className="text-xs text-gray-400">Penerima</p>
								<p className="text-sm font-semibold text-gray-900 mt-0.5">
									{data.penerima_nama}
								</p>
								{data.penerima_telepon && (
									<a
										href={waLink(data.penerima_telepon)}
										target="_blank"
										rel="noopener noreferrer"
										className="flex items-center gap-1 text-xs text-green-600 hover:underline mt-0.5">
										<Phone size={11} /> {data.penerima_telepon}
									</a>
								)}
								{(data.penerima_alamat || data.penerima_kota) && (
									<p className="text-xs text-gray-500 mt-0.5">
										{data.penerima_alamat}
										{data.penerima_kota ? `, ${data.penerima_kota}` : ""}
									</p>
								)}
							</div>
						</div>

						{data.isi_barang && (
							<div className="flex items-start gap-3">
								<div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center flex-shrink-0">
									<Package size={15} className="text-amber-500" />
								</div>
								<div>
									<p className="text-xs text-gray-400">Isi Barang</p>
									<p className="text-sm font-semibold text-gray-900 mt-0.5">
										{data.isi_barang}
									</p>
								</div>
							</div>
						)}

						<div className="flex items-start gap-3">
							<div className="w-8 h-8 rounded-lg bg-purple-50 flex items-center justify-center flex-shrink-0">
								<Weight size={15} className="text-purple-500" />
							</div>
							<div>
								<p className="text-xs text-gray-400">Berat</p>
								<p className="text-sm font-semibold text-gray-900 mt-0.5">
									{data.berat_kg} kg
									{data.berat_volumetrik_kg
										? ` (volumetrik: ${data.berat_volumetrik_kg} kg)`
										: ""}
								</p>
							</div>
						</div>

						{data.petugas_nama && (
							<div className="flex items-start gap-3">
								<div className="w-8 h-8 rounded-lg bg-cyan-50 flex items-center justify-center flex-shrink-0">
									<Truck size={15} className="text-cyan-500" />
								</div>
								<div>
									<p className="text-xs text-gray-400">Kurir / Sopir</p>
									<p className="text-sm font-semibold text-gray-900 mt-0.5">
										{data.petugas_nama}
									</p>
									{data.petugas_telepon && (
										<a
											href={waLink(data.petugas_telepon)}
											target="_blank"
											rel="noopener noreferrer"
											className="flex items-center gap-1 text-xs text-green-600 hover:underline mt-0.5">
											<Phone size={11} /> {data.petugas_telepon}
										</a>
									)}
								</div>
							</div>
						)}
					</div>

					<div className="flex flex-wrap gap-x-6 gap-y-1 mt-4 pt-4 border-t border-gray-100 text-sm text-gray-600">
						<span>
							Ongkir <b className="text-gray-900">{formatRupiah(data.ongkir)}</b>
						</span>
						{data.biaya_asuransi > 0 && (
							<span>
								Asuransi{" "}
								<b className="text-gray-900">
									{formatRupiah(data.biaya_asuransi)}
								</b>
							</span>
						)}
						<span>
							Total Tagihan{" "}
							<b className="text-gray-900">{formatRupiah(data.total_tagihan)}</b>
						</span>
						{data.nilai_barang > 0 && (
							<span>
								Nilai Barang{" "}
								<b className="text-gray-900">{formatRupiah(data.nilai_barang)}</b>
							</span>
						)}
					</div>
					{data.catatan && (
						<p className="text-sm text-gray-600 mt-3 bg-gray-50 rounded-xl px-3 py-2">
							{data.catatan}
						</p>
					)}
				</div>

				{/* ── Status Pengiriman (milestone stepper) ── */}
				<div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
					<div className="flex items-center justify-between mb-5">
						<h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">
							Status Pengiriman
						</h2>
						<div className="flex items-center gap-2">
							{(data.jumlah_gagal || 0) > 0 && (
								<span
									className={`flex items-center gap-1 text-xs px-2 py-1 rounded-lg font-semibold ${
										data.jumlah_gagal >= 3
											? "bg-red-100 text-red-700"
											: "bg-amber-100 text-amber-700"
									}`}>
									<PackageX size={12} /> {data.jumlah_gagal}x Gagal Kirim
								</span>
							)}
							{data.nomor_resi && (
								<span className="text-xs font-mono text-gray-400 bg-gray-50 px-2 py-1 rounded-lg">
									{data.nomor_resi}
								</span>
							)}
						</div>
					</div>

					<div className="flex items-center mb-5">
						{HAPPY_PATH.map((step, idx) => {
							const done = idx < currentIdx;
							const active = idx === currentIdx && !isBranch;
							return (
								<div key={step} className="flex items-center flex-1 last:flex-none">
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
													<Loader2 size={16} className="text-white animate-spin" />
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
									{idx < HAPPY_PATH.length - 1 && (
										<div
											className={`h-0.5 flex-1 mx-1 mb-4 ${idx < currentIdx ? "bg-green-400" : "bg-gray-200"}`}
										/>
									)}
								</div>
							);
						})}
					</div>

					{current === "gagal_kirim" && (
						<div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm mb-4">
							<PackageX size={16} className="mt-0.5 flex-shrink-0" />
							<div>
								<p className="font-semibold">Gagal Kirim</p>
								{latestGagal?.alasan_gagal && (
									<p className="mt-0.5">
										{ALASAN_GAGAL_CFG[latestGagal.alasan_gagal as AlasanGagal]?.label}
									</p>
								)}
							</div>
						</div>
					)}
					{current === "retur" && (
						<div className="flex items-center gap-2 bg-gray-100 border border-gray-200 text-gray-700 px-4 py-3 rounded-xl text-sm mb-4">
							<Undo2 size={16} className="flex-shrink-0" />
							<p className="font-semibold">Diretur ke Pengirim</p>
						</div>
					)}

					{current === "selesai" && (data.pod_penerima_nama || data.pod_foto_url) && (
						<div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 mb-4">
							<p className="text-xs font-semibold text-emerald-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
								<Camera size={12} /> Bukti Serah Terima (POD)
							</p>
							<div className="flex items-center gap-3">
								{data.pod_foto_url && (
									<a href={data.pod_foto_url} target="_blank" rel="noopener noreferrer">
										<img
											src={data.pod_foto_url}
											alt="Bukti POD"
											className="h-16 w-24 object-cover rounded-lg border border-emerald-200 hover:opacity-80 transition"
										/>
									</a>
								)}
								<div>
									<p className="text-xs text-gray-500">Diterima oleh</p>
									<p className="text-sm font-semibold text-gray-900">
										{data.pod_penerima_nama || "-"}
									</p>
								</div>
							</div>
						</div>
					)}

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
											<span className="text-xs text-gray-400">
												·{" "}
												{new Date(t.created_at).toLocaleDateString("id-ID", {
													day: "numeric",
													month: "short",
													year: "numeric",
												})}
											</span>
											{t.creator?.name && (
												<span className="text-xs text-gray-400">
													· {t.creator.name}
												</span>
											)}
										</div>
										{t.alasan_gagal && (
											<p className="text-sm text-red-600 font-medium mt-0.5">
												{ALASAN_GAGAL_CFG[t.alasan_gagal as AlasanGagal]?.label}
											</p>
										)}
										{t.catatan && (
											<p className="text-sm text-gray-700 mt-0.5">{t.catatan}</p>
										)}
										{t.foto_url && (
											<a href={t.foto_url} target="_blank" rel="noopener noreferrer">
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

					{nextOptions.length > 0 && (
						<div className="flex flex-wrap gap-2">
							{nextOptions.map((n) => {
								if (n === "selesai") {
									return (
										<button
											key={n}
											onClick={() => {
												setPodNama("");
												setPodCatatan("");
												setPodFotoFile(null);
												setPodFotoPreview(null);
												setPodError("");
												setModalSelesai(true);
											}}
											className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-semibold transition">
											<CheckCircle2 size={15} />
											Tandai Selesai (POD)
										</button>
									);
								}
								if (n === "gagal_kirim") {
									return (
										<button
											key={n}
											onClick={() => {
												setGagalAlasan("");
												setGagalCatatan("");
												setGagalFotoFile(null);
												setGagalFotoPreview(null);
												setGagalError("");
												setModalGagal(true);
											}}
											className="flex items-center gap-2 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-semibold transition">
											<PackageX size={15} />
											Tandai Gagal Kirim
										</button>
									);
								}
								if (n === "retur") {
									return (
										<button
											key={n}
											onClick={() => {
												setReturCatatan("");
												setReturError("");
												setModalRetur(true);
											}}
											className="flex items-center gap-2 px-4 py-2.5 bg-gray-700 hover:bg-gray-800 text-white rounded-xl text-sm font-semibold transition">
											<Undo2 size={15} />
											Retur ke Pengirim
										</button>
									);
								}
								return (
									<button
										key={n}
										onClick={() => {
											setMsTarget(n);
											setMsKeterangan("");
											setMsFotoFile(null);
											setMsFotoPreview(null);
											setMsError("");
											setModalMilestone(true);
										}}
										className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold transition">
										<ChevronRight size={15} />
										Update ke: {MILESTONE_LABEL[n]}
									</button>
								);
							})}
						</div>
					)}
				</div>

				{/* ── Riwayat Transit (spec 09) — log paralel, TIDAK PERNAH menyentuh milestone ── */}
				<div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
					<h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4 flex items-center gap-2">
						<Truck size={14} className="text-indigo-500" /> Riwayat Transit
					</h2>

					{transitList.length === 0 ? (
						<p className="text-sm text-gray-400 italic py-2 mb-3">
							Belum ada riwayat transit
						</p>
					) : (
						<div className="space-y-2 mb-4">
							{transitList.map((t: any) => (
								<div
									key={t.id}
									className="flex gap-3 bg-gray-50 rounded-xl p-3 border border-gray-100">
									<div
										className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${
											t.tipe_event === "tiba" ? "bg-emerald-400" : "bg-indigo-400"
										}`}
									/>
									<div className="flex-1 min-w-0">
										<div className="flex items-center gap-2 flex-wrap">
											<span
												className={`flex items-center gap-1 text-xs font-semibold px-1.5 py-0.5 rounded-full ${
													t.tipe_event === "tiba"
														? "bg-emerald-100 text-emerald-700"
														: "bg-indigo-100 text-indigo-700"
												}`}>
												{t.tipe_event === "tiba" ? (
													<ArrowDownToLine size={11} />
												) : (
													<ArrowUpFromLine size={11} />
												)}
												{t.tipe_event === "tiba" ? "Tiba" : "Berangkat"}
											</span>
											<span className="text-sm font-medium text-gray-900">
												{t.cabang?.nama || "-"}
												{t.cabang?.kota ? ` · ${t.cabang.kota}` : ""}
											</span>
											<span className="text-xs text-gray-400">
												·{" "}
												{new Date(t.created_at).toLocaleDateString("id-ID", {
													day: "numeric",
													month: "short",
													year: "numeric",
													hour: "2-digit",
													minute: "2-digit",
												})}
											</span>
										</div>
										<p className="text-xs text-gray-400 mt-0.5">
											{t.manifest?.nomor_manifest
												? `Otomatis via manifest ${t.manifest.nomor_manifest}`
												: "Input manual"}
											{t.creator?.name ? ` · ${t.creator.name}` : ""}
										</p>
										{t.catatan && (
											<p className="text-sm text-gray-700 mt-1">{t.catatan}</p>
										)}
									</div>
								</div>
							))}
						</div>
					)}

					{canInputTransit && (
						<div className="bg-gray-50 rounded-xl p-4 space-y-3">
							<div className="grid grid-cols-2 gap-3">
								<div>
									<label className="block text-xs text-gray-500 mb-1">Hub/Cabang</label>
									<select
										value={transitCabangId}
										onChange={(e) => setTransitCabangId(e.target.value)}
										className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white">
										<option value="">— Pilih —</option>
										{cabangList.map((c) => (
											<option key={c.id} value={c.id}>
												{c.nama}
												{c.kota ? ` (${c.kota})` : ""}
											</option>
										))}
									</select>
								</div>
								<div>
									<label className="block text-xs text-gray-500 mb-1">Tipe Event</label>
									<select
										value={transitTipe}
										onChange={(e) => setTransitTipe(e.target.value as TransitTipeEvent)}
										className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white">
										<option value="tiba">Tiba</option>
										<option value="berangkat">Berangkat</option>
									</select>
								</div>
							</div>
							<div>
								<label className="block text-xs text-gray-500 mb-1">
									Catatan (opsional)
								</label>
								<input
									value={transitCatatan}
									onChange={(e) => setTransitCatatan(e.target.value)}
									className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
								/>
							</div>
							{transitError && (
								<div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-xl text-sm">
									{transitError}
								</div>
							)}
							<button
								onClick={addTransit}
								disabled={transitSaving || !transitCabangId}
								className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white px-4 py-2 rounded-xl text-sm font-medium">
								<Plus size={14} />
								{transitSaving ? "Menyimpan..." : "Tambah Event Transit"}
							</button>
						</div>
					)}
				</div>

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
												const s = data.total_tagihan - (data.uang_dp || 0);
												setPelunasanJumlah(String(s > 0 ? s : ""));
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
														{new Date(p.created_at).toLocaleDateString("id-ID", {
															day: "numeric",
															month: "short",
															year: "numeric",
															hour: "2-digit",
															minute: "2-digit",
														})}
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
								className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-600">
								<Edit3 size={14} />
							</button>
						)}
					</div>
					{catatanInternalEdit ? (
						<div className="space-y-2">
							<textarea
								value={catatanInternalInput}
								onChange={(e) => setCatatanInternalInput(e.target.value)}
								rows={3}
								placeholder="Catatan internal (tidak tampil ke customer)..."
								className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
							/>
							<div className="flex gap-2">
								<button
									onClick={() => setCatatanInternalEdit(false)}
									className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50">
									Batal
								</button>
								<button
									onClick={saveCatatanInternal}
									disabled={savingCatatan}
									className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold">
									<Check size={12} /> {savingCatatan ? "Menyimpan..." : "Simpan"}
								</button>
							</div>
						</div>
					) : (
						<p className="text-sm text-gray-600">
							{data.catatan_internal || (
								<span className="text-gray-300 italic">Belum ada catatan</span>
							)}
						</p>
					)}
				</div>
			</div>

			{/* ── Modal Update Milestone ── */}
			{modalMilestone &&
				msTarget &&
				(() => (
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
											{MILESTONE_LABEL[msTarget]}
										</span>
									</p>
								</div>
								<button
									onClick={() => setModalMilestone(false)}
									className="p-2 hover:bg-gray-100 rounded-lg">
									<X size={18} className="text-gray-400" />
								</button>
							</div>
							<div className="p-6 space-y-4">
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
									{msSaving ? "Menyimpan..." : `Konfirmasi: ${MILESTONE_LABEL[msTarget]}`}
								</button>
							</div>
						</div>
					</div>
				))()}

			{/* ── Modal Gagal Kirim ── */}
			{modalGagal && (
				<div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
					<div className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
						<div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
							<h3 className="font-semibold text-gray-900">Tandai Gagal Kirim</h3>
							<button
								onClick={() => setModalGagal(false)}
								className="p-2 hover:bg-gray-100 rounded-lg">
								<X size={18} className="text-gray-400" />
							</button>
						</div>
						<div className="p-6 space-y-4">
							<div>
								<label className="block text-xs font-medium text-gray-600 mb-1">
									Alasan Gagal *
								</label>
								<select
									value={gagalAlasan}
									onChange={(e) => setGagalAlasan(e.target.value as AlasanGagal)}
									className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
									<option value="">— Pilih alasan —</option>
									{(Object.keys(ALASAN_GAGAL_CFG) as AlasanGagal[]).map((a) => (
										<option key={a} value={a}>
											{ALASAN_GAGAL_CFG[a].label}
										</option>
									))}
								</select>
							</div>
							<div>
								<label className="block text-xs font-medium text-gray-600 mb-1">
									Catatan (opsional)
								</label>
								<textarea
									value={gagalCatatan}
									onChange={(e) => setGagalCatatan(e.target.value)}
									rows={2}
									placeholder="Detail kejadian..."
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
									onChange={(e) => {
										const f = e.target.files?.[0] ?? null;
										setGagalFotoFile(f);
										setGagalFotoPreview(f ? URL.createObjectURL(f) : null);
									}}
									className="w-full text-sm text-gray-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-medium file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
								/>
								{gagalFotoPreview && (
									<img
										src={gagalFotoPreview}
										alt="Preview"
										className="mt-2 h-24 w-36 object-cover rounded-xl border border-gray-200"
									/>
								)}
							</div>
							{gagalError && (
								<div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 px-3 py-2.5 rounded-xl text-sm">
									<AlertCircle size={14} /> {gagalError}
								</div>
							)}
						</div>
						<div className="flex gap-3 px-6 pb-6">
							<button
								onClick={() => setModalGagal(false)}
								className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition">
								Batal
							</button>
							<button
								onClick={submitGagalKirim}
								disabled={gagalSaving || !gagalAlasan}
								className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 disabled:bg-red-300 text-white rounded-xl text-sm font-semibold transition flex items-center justify-center gap-2">
								{gagalSaving ? (
									<Loader2 size={15} className="animate-spin" />
								) : (
									<PackageX size={15} />
								)}
								{gagalSaving ? "Menyimpan..." : "Konfirmasi Gagal Kirim"}
							</button>
						</div>
					</div>
				</div>
			)}

			{/* ── Modal Tandai Selesai (POD wajib) ── */}
			{modalSelesai && (
				<div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
					<div className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
						<div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
							<h3 className="font-semibold text-gray-900">
								Tandai Selesai — Bukti Serah Terima (POD)
							</h3>
							<button
								onClick={() => setModalSelesai(false)}
								className="p-2 hover:bg-gray-100 rounded-lg">
								<X size={18} className="text-gray-400" />
							</button>
						</div>
						<div className="p-6 space-y-4">
							<div>
								<label className="block text-xs font-medium text-gray-600 mb-1">
									Nama Penerima Aktual *
								</label>
								<input
									value={podNama}
									onChange={(e) => setPodNama(e.target.value)}
									placeholder="Nama orang yang menerima barang"
									className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
								/>
							</div>
							<div>
								<label className="block text-xs font-medium text-gray-600 mb-1">
									Foto Bukti Serah Terima *
								</label>
								<input
									type="file"
									accept="image/*"
									onChange={(e) => {
										const f = e.target.files?.[0] ?? null;
										setPodFotoFile(f);
										setPodFotoPreview(f ? URL.createObjectURL(f) : null);
									}}
									className="w-full text-sm text-gray-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-medium file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
								/>
								{podFotoPreview && (
									<img
										src={podFotoPreview}
										alt="Preview"
										className="mt-2 h-24 w-36 object-cover rounded-xl border border-gray-200"
									/>
								)}
							</div>
							<div>
								<label className="block text-xs font-medium text-gray-600 mb-1">
									Catatan (opsional)
								</label>
								<textarea
									value={podCatatan}
									onChange={(e) => setPodCatatan(e.target.value)}
									rows={2}
									placeholder="Keterangan tambahan..."
									className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
								/>
							</div>
							{podError && (
								<div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 px-3 py-2.5 rounded-xl text-sm">
									<AlertCircle size={14} /> {podError}
								</div>
							)}
						</div>
						<div className="flex gap-3 px-6 pb-6">
							<button
								onClick={() => setModalSelesai(false)}
								className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition">
								Batal
							</button>
							<button
								onClick={submitSelesaiPOD}
								disabled={podSaving || podNama.trim().length < 2 || !podFotoFile}
								className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-300 text-white rounded-xl text-sm font-semibold transition flex items-center justify-center gap-2">
								{podSaving ? (
									<Loader2 size={15} className="animate-spin" />
								) : (
									<CheckCircle2 size={15} />
								)}
								{podSaving ? "Menyimpan..." : "Konfirmasi Selesai"}
							</button>
						</div>
					</div>
				</div>
			)}

			{/* ── Modal Retur ke Pengirim ── */}
			{modalRetur && (
				<div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
					<div className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
						<div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
							<h3 className="font-semibold text-gray-900">Retur ke Pengirim</h3>
							<button
								onClick={() => setModalRetur(false)}
								className="p-2 hover:bg-gray-100 rounded-lg">
								<X size={18} className="text-gray-400" />
							</button>
						</div>
						<div className="p-6 space-y-4">
							<p className="text-sm text-gray-600 bg-gray-50 rounded-xl px-3 py-2.5">
								Kiriman ini akan ditandai <b>Retur</b> — status terminal, tidak bisa
								diubah lagi setelah ini.
							</p>
							<div>
								<label className="block text-xs font-medium text-gray-600 mb-1">
									Catatan (opsional)
								</label>
								<textarea
									value={returCatatan}
									onChange={(e) => setReturCatatan(e.target.value)}
									rows={2}
									placeholder="Alasan retur..."
									className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
								/>
							</div>
							{returError && (
								<div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 px-3 py-2.5 rounded-xl text-sm">
									<AlertCircle size={14} /> {returError}
								</div>
							)}
						</div>
						<div className="flex gap-3 px-6 pb-6">
							<button
								onClick={() => setModalRetur(false)}
								className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition">
								Batal
							</button>
							<button
								onClick={submitRetur}
								disabled={returSaving}
								className="flex-1 py-2.5 bg-gray-700 hover:bg-gray-800 disabled:bg-gray-400 text-white rounded-xl text-sm font-semibold transition flex items-center justify-center gap-2">
								{returSaving ? (
									<Loader2 size={15} className="animate-spin" />
								) : (
									<Undo2 size={15} />
								)}
								{returSaving ? "Menyimpan..." : "Konfirmasi Retur"}
							</button>
						</div>
					</div>
				</div>
			)}

			{/* ── Modal Pelunasan ── */}
			{modalPelunasan && (
				<div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
					<div className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
						<div className="flex items-center justify-between p-6 border-b border-gray-100">
							<h2 className="text-lg font-semibold">Catat Pembayaran</h2>
							<button
								onClick={() => setModalPelunasan(false)}
								className="p-2 hover:bg-gray-100 rounded-lg">
								<X size={18} />
							</button>
						</div>
						<div className="p-6 space-y-4">
							<div className="bg-gray-50 rounded-xl p-4 space-y-2 text-sm">
								<div className="flex justify-between">
									<span className="text-gray-500">Total Tagihan</span>
									<span className="font-semibold">
										{formatRupiah(data.total_tagihan)}
									</span>
								</div>
								<div className="flex justify-between">
									<span className="text-gray-500">DP Terbayar</span>
									<span className="text-yellow-600 font-medium">
										{formatRupiah(data.uang_dp || 0)}
									</span>
								</div>
								<div className="flex justify-between border-t border-gray-200 pt-2">
									<span className="text-red-600 font-semibold">Sisa Tagihan</span>
									<span className="text-red-600 font-bold">{formatRupiah(sisa)}</span>
								</div>
							</div>
							<div>
								<label className="block text-sm font-medium text-gray-700 mb-1">
									Jumlah Bayar
								</label>
								<input
									type="number"
									value={pelunasanJumlah}
									onChange={(e) => setPelunasanJumlah(e.target.value)}
									className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
								/>
							</div>
							<div>
								<label className="block text-sm font-medium text-gray-700 mb-1">
									Metode Bayar
								</label>
								<select
									value={pelunasanMetode}
									onChange={(e) => setPelunasanMetode(e.target.value as any)}
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
									value={pelunasanCatatan}
									onChange={(e) => setPelunasanCatatan(e.target.value)}
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
										setPelunasanFotoFile(f);
										setPelunasanFotoPreview(f ? URL.createObjectURL(f) : null);
									}}
									className="w-full text-sm text-gray-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-medium file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
								/>
								{pelunasanFotoPreview && (
									<img
										src={pelunasanFotoPreview}
										alt="Preview"
										className="mt-2 h-28 w-44 object-cover rounded-xl border border-gray-200"
									/>
								)}
							</div>
							{pelunasanError && (
								<div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 px-3 py-2.5 rounded-xl text-sm">
									<AlertCircle size={14} /> {pelunasanError}
								</div>
							)}
						</div>
						<div className="flex gap-3 p-6 pt-0">
							<button
								onClick={() => setModalPelunasan(false)}
								className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium hover:bg-gray-50">
								Batal
							</button>
							<button
								onClick={savePelunasan}
								disabled={savingPelunasan || !pelunasanJumlah}
								className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-green-300 text-white px-4 py-2.5 rounded-xl text-sm font-medium flex items-center justify-center gap-2">
								<CreditCard size={15} />
								{savingPelunasan ? "Menyimpan..." : "Simpan Pembayaran"}
							</button>
						</div>
					</div>
				</div>
			)}

			{/* ── Modal Delete ── */}
			{deleteModal && (
				<div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
					<div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl">
						<div className="px-6 py-5 space-y-3">
							<div className="w-12 h-12 bg-red-100 rounded-2xl flex items-center justify-center mb-4">
								<Trash2 size={22} className="text-red-600" />
							</div>
							<h3 className="text-base font-semibold text-gray-900">
								Hapus Pengiriman?
							</h3>
							<p className="text-sm text-gray-500 leading-relaxed">
								Faktur{" "}
								<span className="font-mono font-semibold text-gray-700">
									{data.nomor_faktur}
								</span>{" "}
								akan dihapus permanen beserta riwayat tracking & pembayarannya.
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
								onClick={deletePengiriman}
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

			{/* Hidden area untuk render QR canvas resi sebelum print */}
			{data.nomor_resi && (
				<div ref={resiQrRef} className="hidden" aria-hidden="true">
					<QRCodeCanvas value={`${typeof window !== "undefined" ? window.location.origin : ""}/resi/${data.nomor_resi}`} size={200} />
				</div>
			)}
		</div>
	);
}
