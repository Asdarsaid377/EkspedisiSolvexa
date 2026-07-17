"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { formatRupiah } from "@/lib/utils";
import { imgUrl } from "@/lib/image";
import {
	CheckCircle2,
	Loader2,
	Package,
	MapPin,
	Calendar,
	Clock,
	X,
	ChevronLeft,
	ChevronRight,
	ImageOff,
	Flag,
	ThumbsUp,
	StickyNote,
	Send,
} from "lucide-react";

const REVIEW_TIPE_CFG = {
	pujian: { label: "Pujian", Icon: ThumbsUp, active: "bg-green-600 text-white border-green-600" },
	catatan: { label: "Catatan", Icon: StickyNote, active: "bg-blue-600 text-white border-blue-600" },
	komplain: { label: "Komplain", Icon: Flag, active: "bg-red-600 text-white border-red-600" },
} as const;

type Milestone = "diproses" | "diproduksi" | "dikirim" | "selesai";

const MILESTONE_CFG: Record<Milestone, { label: string; desc: string }> = {
	diproses: { label: "Diproses", desc: "Pesanan sedang disiapkan" },
	diproduksi: { label: "Diproduksi", desc: "Barang sedang diproduksi" },
	dikirim: { label: "Dikirim", desc: "Barang dalam perjalanan" },
	selesai: { label: "Selesai", desc: "Pesanan telah diterima" },
};

const ALL_MILESTONES: Milestone[] = ["diproses", "diproduksi", "dikirim", "selesai"];

function fmtDate(s: string) {
	return new Date(s).toLocaleDateString("id-ID", {
		day: "numeric", month: "long", year: "numeric",
	});
}

export default function TrackingPage() {
	const { nomor } = useParams<{ nomor: string }>();
	const supabase = createClient();

	const [rows, setRows] = useState<any[]>([]);
	const [riwayat, setRiwayat] = useState<any[]>([]);
	const [loading, setLoading] = useState(true);
	const [notFound, setNotFound] = useState(false);

	// Lightbox
	const [lightbox, setLightbox] = useState<string[] | null>(null);
	const [lightboxIdx, setLightboxIdx] = useState(0);

	// Review pasca-pesanan selesai (publik, tanpa login)
	const [reviewTipe, setReviewTipe] = useState<keyof typeof REVIEW_TIPE_CFG>("pujian");
	const [reviewIsi, setReviewIsi] = useState("");
	const [reviewSaving, setReviewSaving] = useState(false);
	const [reviewError, setReviewError] = useState("");
	const [reviewSent, setReviewSent] = useState(false);

	useEffect(() => {
		if (!nomor) return;
		load();
		if (typeof window !== "undefined" && localStorage.getItem(`bng_resi_review_${nomor.toUpperCase()}`)) {
			setReviewSent(true);
		}
	}, [nomor]);

	const submitReview = async () => {
		if (!reviewIsi.trim()) return;
		setReviewSaving(true);
		setReviewError("");
		try {
			const res = await fetch("/api/resi-review", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					nomor_resi: nomor.toUpperCase(),
					tipe: reviewTipe,
					isi: reviewIsi.trim(),
				}),
			});
			const json = await res.json();
			if (!res.ok) {
				setReviewError(json.detail ? `${json.error} (${json.detail})` : json.error || "Gagal mengirim review.");
				return;
			}
			localStorage.setItem(`bng_resi_review_${nomor.toUpperCase()}`, "1");
			setReviewSent(true);
		} catch {
			setReviewError("Gagal mengirim review. Periksa koneksi Anda.");
		} finally {
			setReviewSaving(false);
		}
	};

	const load = async () => {
		setLoading(true);
		const [{ data: publik }, { data: history }] = await Promise.all([
			supabase
				.from("tracking_publik")
				.select("*")
				.eq("nomor_resi", nomor.toUpperCase()),
			supabase
				.from("tracking_riwayat_publik")
				.select("*")
				.eq("nomor_resi", nomor.toUpperCase())
				.order("created_at", { ascending: true }),
		]);

		if (!publik || publik.length === 0) {
			setNotFound(true);
			setLoading(false);
			return;
		}
		setRows(publik);
		setRiwayat(history || []);
		setLoading(false);
	};

	if (loading) {
		return (
			<div className="min-h-screen bg-gray-50 flex items-center justify-center">
				<div className="flex flex-col items-center gap-3 text-gray-400">
					<Loader2 size={32} className="animate-spin" />
					<p className="text-sm">Memuat data pesanan...</p>
				</div>
			</div>
		);
	}

	if (notFound) {
		return (
			<div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
				<div className="text-center max-w-xs">
					<div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
						<Package size={28} className="text-gray-400" />
					</div>
					<h1 className="text-lg font-bold text-gray-900 mb-2">
						Nomor Resi Tidak Ditemukan
					</h1>
					<p className="text-sm text-gray-500 mb-1">
						Kode <span className="font-mono font-bold">{nomor.toUpperCase()}</span> tidak ada dalam sistem kami.
					</p>
					<p className="text-xs text-gray-400">
						Pastikan nomor resi sudah benar atau hubungi toko.
					</p>
				</div>
			</div>
		);
	}

	// Ambil info dari baris pertama (semua baris punya data header yang sama)
	const info = rows[0];
	const current: Milestone = info.milestone ?? "diproses";
	const hasDiproduksi = riwayat.some((r) => r.milestone === "diproduksi");
	const steps = hasDiproduksi
		? ALL_MILESTONES
		: ALL_MILESTONES.filter((m) => m !== "diproduksi");
	const currentIdx = steps.indexOf(current);

	// Progress persentase terbaru (jika ada)
	const latestPersen = [...riwayat]
		.reverse()
		.find((r) => r.persentase != null)?.persentase;

	// Foto dikelompokkan per milestone
	const fotoPerMilestone = riwayat.reduce<Record<string, string[]>>((acc, r) => {
		if (r.foto_url) {
			if (!acc[r.milestone]) acc[r.milestone] = [];
			acc[r.milestone].push(r.foto_url);
		}
		return acc;
	}, {});
	const semuaFoto = riwayat.filter((r) => r.foto_url).map((r) => r.foto_url);

	const openLightbox = (url: string) => {
		const idx = semuaFoto.indexOf(url);
		setLightbox(semuaFoto);
		setLightboxIdx(idx >= 0 ? idx : 0);
	};

	return (
		<div className="min-h-screen bg-gray-50">
			{/* Header brand */}
			<div className="bg-white border-b border-gray-100 px-4 py-4 flex items-center justify-between">
				<div>
					<p className="text-xs text-gray-400 uppercase tracking-widest font-medium">BungaNaik Furniture</p>
					<h1 className="text-base font-bold text-gray-900 leading-tight">Tracking Pesanan</h1>
				</div>
				<div className="bg-indigo-50 px-3 py-1.5 rounded-xl">
					<p className="text-xs text-indigo-400 font-medium">Resi</p>
					<p className="text-sm font-bold font-mono text-indigo-700 tracking-wider">{nomor.toUpperCase()}</p>
				</div>
			</div>

			<div className="max-w-lg mx-auto px-4 py-5 space-y-4">

				{/* Status card */}
				<div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
					{/* Step indicator */}
					<div className="flex items-center mb-5">
						{steps.map((step, idx) => {
							const done = idx < currentIdx;
							const active = idx === currentIdx;
							return (
								<div key={step} className="flex items-center flex-1 last:flex-none">
									<div className="flex flex-col items-center">
										<div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 transition-all ${
											done
												? "bg-green-500 shadow-sm shadow-green-200"
												: active
												? "bg-indigo-600 shadow-sm shadow-indigo-200"
												: "bg-gray-100"
										}`}>
											{done ? (
												<CheckCircle2 size={18} className="text-white" />
											) : active ? (
												current === "selesai"
													? <CheckCircle2 size={18} className="text-white" />
													: <Loader2 size={16} className="text-white animate-spin" />
											) : (
												<span className="text-xs font-bold text-gray-300">{idx + 1}</span>
											)}
										</div>
										<span className={`text-[10px] mt-1.5 font-semibold text-center whitespace-nowrap leading-tight max-w-[60px] ${
											done ? "text-green-600" : active ? "text-indigo-700" : "text-gray-300"
										}`}>
											{MILESTONE_CFG[step].label}
										</span>
									</div>
									{idx < steps.length - 1 && (
										<div className={`h-0.5 flex-1 mx-1 mb-5 rounded-full transition-all ${
											idx < currentIdx ? "bg-green-400" : "bg-gray-100"
										}`} />
									)}
								</div>
							);
						})}
					</div>

					{/* Status aktif */}
					<div className={`rounded-xl px-4 py-3 ${current === "selesai" ? "bg-green-50 border border-green-100" : "bg-indigo-50 border border-indigo-100"}`}>
						<p className={`text-xs font-semibold uppercase tracking-wide ${current === "selesai" ? "text-green-600" : "text-indigo-600"}`}>
							Status Saat Ini
						</p>
						<p className={`text-base font-bold mt-0.5 ${current === "selesai" ? "text-green-800" : "text-indigo-800"}`}>
							{MILESTONE_CFG[current].label}
						</p>
						<p className={`text-xs mt-0.5 ${current === "selesai" ? "text-green-600" : "text-indigo-500"}`}>
							{MILESTONE_CFG[current].desc}
						</p>
					</div>

					{/* Progress bar produksi */}
					{current === "diproduksi" && latestPersen != null && (
						<div className="mt-4">
							<div className="flex justify-between text-xs mb-1.5">
								<span className="text-gray-500 font-medium">Progress Produksi</span>
								<span className="font-bold text-indigo-700">{latestPersen}%</span>
							</div>
							<div className="h-3 bg-gray-100 rounded-full overflow-hidden">
								<div
									className="h-full bg-indigo-500 rounded-full transition-all duration-500"
									style={{ width: `${latestPersen}%` }}
								/>
							</div>
						</div>
					)}
				</div>

				{/* Info pesanan */}
				<div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
					<h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-4">
						Informasi Pesanan
					</h2>
					<div className="space-y-3">
						{info.tujuan && (
							<div className="flex items-start gap-3">
								<div className="w-8 h-8 bg-orange-50 rounded-xl flex items-center justify-center flex-shrink-0">
									<MapPin size={14} className="text-orange-500" />
								</div>
								<div>
									<p className="text-xs text-gray-400">Tujuan Pengiriman</p>
									<p className="text-sm font-semibold text-gray-900 mt-0.5">{info.tujuan}</p>
								</div>
							</div>
						)}
						<div className="flex items-start gap-3">
							<div className="w-8 h-8 bg-blue-50 rounded-xl flex items-center justify-center flex-shrink-0">
								<Calendar size={14} className="text-blue-500" />
							</div>
							<div>
								<p className="text-xs text-gray-400">Tanggal Pesan</p>
								<p className="text-sm font-semibold text-gray-900 mt-0.5">{fmtDate(info.tanggal_pesan)}</p>
							</div>
						</div>
						{info.tanggal_estimasi && (
							<div className="flex items-start gap-3">
								<div className="w-8 h-8 bg-purple-50 rounded-xl flex items-center justify-center flex-shrink-0">
									<Clock size={14} className="text-purple-500" />
								</div>
								<div>
									<p className="text-xs text-gray-400">Estimasi Selesai</p>
									<p className="text-sm font-semibold text-gray-900 mt-0.5">{fmtDate(info.tanggal_estimasi)}</p>
								</div>
							</div>
						)}
					</div>
				</div>

				{/* Daftar produk */}
				<div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
					<h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
						Item Pesanan ({rows.length} produk)
					</h2>
					<div className="space-y-2">
						{rows.map((row, i) => (
							<div key={i} className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-3 border border-gray-100">
								<div className="flex items-center gap-3">
									<div className="w-7 h-7 bg-indigo-100 rounded-full flex items-center justify-center flex-shrink-0">
										<span className="text-xs font-bold text-indigo-600">{i + 1}</span>
									</div>
									<p className="text-sm font-medium text-gray-900">{row.nama_produk || "—"}</p>
								</div>
								<span className="text-sm font-bold text-gray-700 flex-shrink-0 ml-2">
									×{row.jumlah}
								</span>
							</div>
						))}
					</div>
					<div className="mt-3 pt-3 border-t border-gray-100 flex justify-between items-center">
						<span className="text-sm text-gray-500">Total Pembayaran</span>
						<span className="text-base font-bold text-gray-900">{formatRupiah(info.grand_total)}</span>
					</div>
				</div>

				{/* Riwayat & foto per milestone */}
				{riwayat.length > 0 && (
					<div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
						<h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-4">
							Riwayat Update
						</h2>
						<div className="space-y-4">
							{riwayat.map((r, i) => (
								<div key={i} className="flex gap-3">
									<div className="flex flex-col items-center">
										<div className="w-2.5 h-2.5 rounded-full bg-indigo-400 mt-1.5 flex-shrink-0" />
										{i < riwayat.length - 1 && (
											<div className="w-0.5 bg-gray-100 flex-1 mt-1" />
										)}
									</div>
									<div className="flex-1 pb-2">
										<div className="flex items-center gap-2 flex-wrap">
											<span className="text-xs font-bold text-indigo-700">
												{MILESTONE_CFG[r.milestone as Milestone]?.label ?? r.milestone}
											</span>
											{r.persentase != null && (
												<span className="text-[10px] bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded-full font-semibold">
													{r.persentase}%
												</span>
											)}
											<span className="text-[11px] text-gray-400">
												{fmtDate(r.created_at)}
											</span>
										</div>
										{r.catatan && (
											<p className="text-sm text-gray-700 mt-1 leading-relaxed">{r.catatan}</p>
										)}
										{r.foto_url && (
											<button
												onClick={() => openLightbox(r.foto_url)}
												className="mt-2 block">
												<img
													src={imgUrl(r.foto_url, 300)}
													alt="Foto update"
													loading="lazy"
													className="h-24 w-36 object-cover rounded-xl border border-gray-200 hover:opacity-90 transition"
												/>
											</button>
										)}
									</div>
								</div>
							))}
						</div>
					</div>
				)}

				{/* Review pasca-pesanan selesai (publik, tanpa login) */}
				{current === "selesai" && (
					<div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
						<h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">
							Beri Ulasan Pesanan
						</h2>
						{reviewSent ? (
							<div className="text-center py-6">
								<CheckCircle2 size={32} className="mx-auto text-green-500 mb-2" />
								<p className="text-sm font-semibold text-gray-900">Terima kasih atas ulasan Anda!</p>
								<p className="text-xs text-gray-400 mt-1">Masukan Anda sangat berarti bagi kami.</p>
							</div>
						) : (
							<div className="mt-3 space-y-3">
								<div className="flex gap-2">
									{(Object.keys(REVIEW_TIPE_CFG) as Array<keyof typeof REVIEW_TIPE_CFG>).map((t) => {
										const cfg = REVIEW_TIPE_CFG[t];
										const Icon = cfg.Icon;
										return (
											<button
												key={t}
												onClick={() => setReviewTipe(t)}
												className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-2 rounded-xl border text-xs font-semibold transition ${
													reviewTipe === t ? cfg.active : "border-gray-200 text-gray-500 hover:bg-gray-50"
												}`}>
												<Icon size={13} /> {cfg.label}
											</button>
										);
									})}
								</div>
								<textarea
									value={reviewIsi}
									onChange={(e) => setReviewIsi(e.target.value)}
									maxLength={1000}
									rows={3}
									placeholder="Ceritakan pengalaman Anda dengan pesanan ini..."
									className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
								/>
								{reviewError && (
									<p className="text-xs text-red-500">{reviewError}</p>
								)}
								<button
									onClick={submitReview}
									disabled={reviewSaving || !reviewIsi.trim()}
									className="w-full flex items-center justify-center gap-2 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white rounded-xl text-sm font-semibold transition">
									{reviewSaving ? (
										<Loader2 size={15} className="animate-spin" />
									) : (
										<Send size={15} />
									)}
									{reviewSaving ? "Mengirim..." : "Kirim Ulasan"}
								</button>
							</div>
						)}
					</div>
				)}

				{/* Footer */}
				<div className="text-center pb-6">
					<p className="text-xs text-gray-400">
						Bunganaik Furniture · Tracking Pesanan
					</p>
					<p className="text-[10px] text-gray-300 mt-0.5">
						Halaman ini hanya untuk memantau status pesanan Anda
					</p>
				</div>

			</div>

			{/* Lightbox */}
			{lightbox && lightbox.length > 0 && (
				<div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4">
					<button
						onClick={() => setLightbox(null)}
						className="absolute top-4 right-4 w-10 h-10 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white transition">
						<X size={20} />
					</button>

					{lightbox.length > 1 && (
						<>
							<button
								onClick={() => setLightboxIdx((i) => (i - 1 + lightbox.length) % lightbox.length)}
								className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white transition">
								<ChevronLeft size={20} />
							</button>
							<button
								onClick={() => setLightboxIdx((i) => (i + 1) % lightbox.length)}
								className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white transition">
								<ChevronRight size={20} />
							</button>
						</>
					)}

					<img
						src={imgUrl(lightbox[lightboxIdx], 1200)}
						alt="Foto pengiriman"
						className="max-w-full max-h-[80vh] object-contain rounded-xl"
					/>

					{lightbox.length > 1 && (
						<div className="absolute bottom-6 flex gap-1.5">
							{lightbox.map((_, i) => (
								<button
									key={i}
									onClick={() => setLightboxIdx(i)}
									className={`w-2 h-2 rounded-full transition-all ${i === lightboxIdx ? "bg-white" : "bg-white/30"}`}
								/>
							))}
						</div>
					)}
				</div>
			)}
		</div>
	);
}
