"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { MilestonePengiriman, AlasanGagal } from "@/lib/types";
import { submitSelesaiPOD, submitGagalKirim } from "@/lib/pengirimanAksi";
import { ALASAN_GAGAL_CFG } from "@/lib/pengirimanConstants";
import { waLink } from "@/lib/utils";
import ScanQRManifestOverlay from "@/components/ScanQRManifestOverlay";
import {
	PackageX,
	Truck,
	PackageCheck,
	MapPin,
	Camera,
	X,
	Loader2,
	AlertCircle,
	CheckCircle2,
	Phone,
	MessageCircle,
	QrCode,
} from "lucide-react";

const MILESTONE_LABEL: Record<string, string> = {
	dijemput: "Dijemput",
	dikirim: "Dikirim",
	gagal_kirim: "Gagal Kirim",
};

const MILESTONE_BADGE: Record<string, string> = {
	dijemput: "bg-purple-100 text-purple-700",
	dikirim: "bg-indigo-100 text-indigo-700",
	gagal_kirim: "bg-red-100 text-red-700",
};

const MILESTONE_ICON: Record<string, any> = {
	dijemput: PackageCheck,
	dikirim: Truck,
	gagal_kirim: PackageX,
};

// Urutan tampil: gagal_kirim (butuh tindak lanjut) paling atas, bukan
// urut tanggal — lihat spec 07 §3.
const MILESTONE_PRIORITY: Record<string, number> = {
	gagal_kirim: 0,
	dikirim: 1,
	dijemput: 2,
};

export default function TugasPage() {
	const supabase = createClient();
	const { profile } = useAuth();
	const [tab, setTab] = useState<"aktif" | "riwayat">("aktif");
	const [list, setList] = useState<any[]>([]);
	const [loading, setLoading] = useState(true);
	const [riwayat, setRiwayat] = useState<any[]>([]);
	const [riwayatLoading, setRiwayatLoading] = useState(false);

	// Detail ringkas (tap kartu) — alamat lengkap + telepon/WA penerima, lihat spec 07 §5
	const [detailTarget, setDetailTarget] = useState<any | null>(null);

	// "Scan untuk Muat" (Step 4, spec 08) — manifest aktif ditentukan
	// OTOMATIS (bukan dipilih manual), asumsi satu sopir/kurir = satu trip
	// aktif per hari (KT #3 spec 08, dijawab 19 Jul 2026). Overlay-nya reuse
	// komponen yang sama dengan /dashboard/manifest/[id] — alur & validasi
	// identik, cuma konteks manifest-nya beda.
	const [manifestAktif, setManifestAktif] = useState<{ id: string; nomor: string } | null>(
		null,
	);
	const [manifestAktifLoaded, setManifestAktifLoaded] = useState(false);
	const [scanOpen, setScanOpen] = useState(false);

	// Modal Selesai (POD) — dikirim -> selesai, kamera langsung aktif
	const [selesaiTarget, setSelesaiTarget] = useState<any | null>(null);
	const [podNama, setPodNama] = useState("");
	const [podCatatan, setPodCatatan] = useState("");
	const [podFotoFile, setPodFotoFile] = useState<File | null>(null);
	const [podFotoPreview, setPodFotoPreview] = useState<string | null>(null);
	const [podSaving, setPodSaving] = useState(false);
	const [podError, setPodError] = useState("");

	// Modal Gagal Kirim — dikirim -> gagal_kirim, alasan wajib
	const [gagalTarget, setGagalTarget] = useState<any | null>(null);
	const [gagalAlasan, setGagalAlasan] = useState<AlasanGagal | "">("");
	const [gagalCatatan, setGagalCatatan] = useState("");
	const [gagalSaving, setGagalSaving] = useState(false);
	const [gagalError, setGagalError] = useState("");

	const load = useCallback(async () => {
		if (!profile?.id) return;
		setLoading(true);
		const { data } = await supabase
			.from("pengiriman")
			.select(
				"id, nomor_faktur, nomor_resi, penerima_nama, penerima_kota, penerima_telepon, penerima_alamat, milestone, jumlah_gagal",
			)
			.eq("petugas_id", profile.id)
			.in("milestone", ["dijemput", "dikirim", "gagal_kirim"]);
		const sorted = [...(data || [])].sort(
			(a, b) => MILESTONE_PRIORITY[a.milestone] - MILESTONE_PRIORITY[b.milestone],
		);
		setList(sorted);
		setLoading(false);
	}, [profile?.id]);

	useEffect(() => {
		load();
	}, [load]);

	// Manifest aktif hari ini milik sopir/kurir ini (KT #3 spec 08) — status
	// draft/berangkat, tanggal_berangkat = hari ini. Kalau ada lebih dari
	// satu (di luar asumsi "satu trip aktif/hari"), ambil yang PALING BARU
	// dibuat — tidak ada UI pemilihan manual di versi ini.
	useEffect(() => {
		if (!profile?.id) return;
		const todayStr = new Date().toISOString().split("T")[0];
		supabase
			.from("manifest")
			.select("id, nomor_manifest")
			.eq("sopir_id", profile.id)
			.in("status", ["draft", "berangkat"])
			.eq("tanggal_berangkat", todayStr)
			.order("created_at", { ascending: false })
			.limit(1)
			.maybeSingle()
			.then(({ data }) => {
				setManifestAktif(data ? { id: data.id, nomor: data.nomor_manifest } : null);
				setManifestAktifLoaded(true);
			});
	}, [profile?.id]);

	// "Selesai Hari Ini" — riwayat ringkas read-only (spec 07 §5). Dimulai dari
	// pengiriman_tracking (bukan pengiriman.milestone) supaya query terbatas ke
	// baris yang selesai HARI INI, bukan seluruh histori selesai petugas ini
	// (pola sama seperti Laporan Keterlambatan — lihat CLAUDE.md §Definisi
	// Terlambat: waktu selesai = pengiriman_tracking.created_at).
	const loadRiwayat = useCallback(async () => {
		if (!profile?.id) return;
		setRiwayatLoading(true);
		const startOfToday = new Date();
		startOfToday.setHours(0, 0, 0, 0);

		const { data: tracking } = await supabase
			.from("pengiriman_tracking")
			.select("pengiriman_id, created_at")
			.eq("milestone", "selesai")
			.gte("created_at", startOfToday.toISOString());

		const waktuMap: Record<string, string> = {};
		for (const t of tracking || []) {
			if (!waktuMap[t.pengiriman_id] || t.created_at < waktuMap[t.pengiriman_id]) {
				waktuMap[t.pengiriman_id] = t.created_at;
			}
		}
		const ids = Object.keys(waktuMap);

		if (ids.length === 0) {
			setRiwayat([]);
			setRiwayatLoading(false);
			return;
		}

		const { data } = await supabase
			.from("pengiriman")
			.select(
				"id, nomor_faktur, nomor_resi, penerima_nama, penerima_kota, penerima_telepon, penerima_alamat, milestone, pod_penerima_nama",
			)
			.eq("petugas_id", profile.id)
			.eq("milestone", "selesai")
			.in("id", ids);

		const merged = (data || [])
			.map((p) => ({ ...p, waktuSelesai: waktuMap[p.id] }))
			.sort((a, b) => (b.waktuSelesai || "").localeCompare(a.waktuSelesai || ""));

		setRiwayat(merged);
		setRiwayatLoading(false);
	}, [profile?.id]);

	useEffect(() => {
		if (tab === "riwayat") loadRiwayat();
	}, [tab, loadRiwayat]);

	const jamSelesai = (iso: string) =>
		new Intl.DateTimeFormat("id-ID", { hour: "2-digit", minute: "2-digit" }).format(
			new Date(iso),
		);

	const openSelesai = (p: any) => {
		setSelesaiTarget(p);
		setPodNama("");
		setPodCatatan("");
		setPodFotoFile(null);
		setPodFotoPreview(null);
		setPodError("");
	};

	const closeSelesai = () => {
		if (podSaving) return;
		setSelesaiTarget(null);
	};

	const handlePodFotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const f = e.target.files?.[0] ?? null;
		setPodFotoFile(f);
		setPodFotoPreview(f ? URL.createObjectURL(f) : null);
	};

	const submitSelesai = async () => {
		if (!selesaiTarget) return;
		if (podNama.trim().length < 2) {
			setPodError("Nama penerima wajib diisi (minimal 2 karakter).");
			return;
		}
		if (!podFotoFile) {
			setPodError("Foto bukti serah terima wajib diambil.");
			return;
		}
		setPodSaving(true);
		setPodError("");

		const result = await submitSelesaiPOD(supabase, {
			pengirimanId: selesaiTarget.id,
			podNama,
			podCatatan,
			podFotoFile,
			createdBy: profile?.id,
		});

		if (!result.ok) {
			// Tanpa dukungan offline (spec 07 KT #2) — tampilkan error jelas,
			// form tetap terisi supaya tombol Simpan yang sama bisa dipakai
			// coba lagi tanpa mengulang isi form dari awal.
			setPodError(result.error || "Gagal menyimpan, coba lagi.");
			setPodSaving(false);
			return;
		}

		setPodSaving(false);
		setSelesaiTarget(null);
		load();
	};

	const openGagal = (p: any) => {
		setGagalTarget(p);
		setGagalAlasan("");
		setGagalCatatan("");
		setGagalError("");
	};

	const closeGagal = () => {
		if (gagalSaving) return;
		setGagalTarget(null);
	};

	const submitGagal = async () => {
		if (!gagalTarget) return;
		if (!gagalAlasan) {
			setGagalError("Alasan gagal wajib dipilih.");
			return;
		}
		setGagalSaving(true);
		setGagalError("");

		const result = await submitGagalKirim(supabase, {
			pengirimanId: gagalTarget.id,
			jumlahGagalSebelum: gagalTarget.jumlah_gagal || 0,
			alasan: gagalAlasan,
			catatan: gagalCatatan,
			fotoFile: null,
			createdBy: profile?.id,
		});

		if (!result.ok) {
			// Tanpa dukungan offline (spec 07 KT #2) — error jelas, form tetap
			// terisi, tombol yang sama jadi jalur coba lagi.
			setGagalError(result.error || "Gagal menyimpan, coba lagi.");
			setGagalSaving(false);
			return;
		}

		setGagalSaving(false);
		setGagalTarget(null);
		load();
	};

	return (
		<div>
			<h1 className="text-lg font-bold text-gray-900 mb-1">Tugas Saya</h1>
			<p className="text-sm text-gray-500 mb-4">
				{tab === "aktif"
					? loading
						? "Memuat..."
						: `${list.length} kiriman aktif`
					: riwayatLoading
						? "Memuat..."
						: `${riwayat.length} selesai hari ini`}
			</p>

			{manifestAktifLoaded && (
				<button
					onClick={() => manifestAktif && setScanOpen(true)}
					disabled={!manifestAktif}
					title={
						manifestAktif
							? undefined
							: "Belum ada manifest (draft/berangkat) untuk hari ini atas nama kamu"
					}
					className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold mb-4 transition ${
						manifestAktif
							? "bg-indigo-600 hover:bg-indigo-700 text-white"
							: "bg-gray-100 text-gray-400 cursor-not-allowed"
					}`}>
					<QrCode size={16} />
					{manifestAktif
						? `Scan untuk Muat — ${manifestAktif.nomor}`
						: "Tidak ada manifest aktif hari ini"}
				</button>
			)}

			<div className="flex gap-1 mb-4 bg-gray-100 rounded-xl p-1">
				<button
					onClick={() => setTab("aktif")}
					className={`flex-1 py-2 rounded-lg text-sm font-semibold transition ${
						tab === "aktif" ? "bg-white shadow-sm text-gray-900" : "text-gray-500"
					}`}>
					Aktif
				</button>
				<button
					onClick={() => setTab("riwayat")}
					className={`flex-1 py-2 rounded-lg text-sm font-semibold transition ${
						tab === "riwayat" ? "bg-white shadow-sm text-gray-900" : "text-gray-500"
					}`}>
					Selesai Hari Ini
				</button>
			</div>

			{tab === "aktif" ? (
				loading ? (
					<div className="text-center py-16 text-gray-400 text-sm">Memuat tugas...</div>
				) : list.length === 0 ? (
					<div className="text-center py-16 text-gray-400 text-sm">
						Tidak ada tugas aktif saat ini
					</div>
				) : (
					<div className="space-y-3">
						{list.map((p) => {
							const Icon = MILESTONE_ICON[p.milestone] || Truck;
							return (
								<div
									key={p.id}
									onClick={() => setDetailTarget(p)}
									className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 cursor-pointer active:bg-gray-50">
									<div className="flex items-start justify-between gap-3 mb-2">
										<span className="font-mono text-xs text-gray-400">
											{p.nomor_resi || p.nomor_faktur}
										</span>
										<span
											className={`flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-semibold flex-shrink-0 ${MILESTONE_BADGE[p.milestone] || "bg-gray-100 text-gray-600"}`}>
											<Icon size={12} />
											{MILESTONE_LABEL[p.milestone] || p.milestone}
											{p.milestone === "gagal_kirim" && (p.jumlah_gagal || 0) >= 3
												? ` (${p.jumlah_gagal}x)`
												: ""}
										</span>
									</div>
									<p className="text-base font-semibold text-gray-900">
										{p.penerima_nama}
									</p>
									{p.penerima_kota && (
										<p className="flex items-center gap-1 text-sm text-gray-500 mt-0.5">
											<MapPin size={13} /> {p.penerima_kota}
										</p>
									)}
									{p.milestone === "dikirim" && (
										<div className="flex gap-2 mt-3">
											<button
												onClick={(e) => {
													e.stopPropagation();
													openGagal(p);
												}}
												className="flex-1 flex items-center justify-center gap-2 py-3 border-2 border-red-500 text-red-600 hover:bg-red-50 rounded-xl text-sm font-semibold transition">
												<PackageX size={16} />
												Gagal Kirim
											</button>
											<button
												onClick={(e) => {
													e.stopPropagation();
													openSelesai(p);
												}}
												className="flex-1 flex items-center justify-center gap-2 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-semibold transition">
												<CheckCircle2 size={16} />
												Selesai
											</button>
										</div>
									)}
								</div>
							);
						})}
					</div>
				)
			) : riwayatLoading ? (
				<div className="text-center py-16 text-gray-400 text-sm">Memuat riwayat...</div>
			) : riwayat.length === 0 ? (
				<div className="text-center py-16 text-gray-400 text-sm">
					Belum ada kiriman yang diselesaikan hari ini
				</div>
			) : (
				<div className="space-y-3">
					{riwayat.map((p) => (
						<div
							key={p.id}
							onClick={() => setDetailTarget(p)}
							className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 cursor-pointer active:bg-gray-50">
							<div className="flex items-start justify-between gap-3 mb-2">
								<span className="font-mono text-xs text-gray-400">
									{p.nomor_resi || p.nomor_faktur}
								</span>
								<span className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-semibold flex-shrink-0 bg-emerald-100 text-emerald-700">
									<CheckCircle2 size={12} />
									Selesai {jamSelesai(p.waktuSelesai)}
								</span>
							</div>
							<p className="text-base font-semibold text-gray-900">{p.penerima_nama}</p>
							{p.penerima_kota && (
								<p className="flex items-center gap-1 text-sm text-gray-500 mt-0.5">
									<MapPin size={13} /> {p.penerima_kota}
								</p>
							)}
							{p.pod_penerima_nama && (
								<p className="text-xs text-gray-400 mt-1">
									Diterima oleh: {p.pod_penerima_nama}
								</p>
							)}
						</div>
					))}
				</div>
			)}

			{/* ── Sheet Selesai (POD) — kamera langsung aktif ── */}
			{selesaiTarget && (
				<div className="fixed inset-0 bg-black/40 z-50 flex items-end sm:items-center justify-center">
					<div className="bg-white rounded-t-3xl sm:rounded-2xl w-full max-w-lg shadow-2xl max-h-[92vh] overflow-y-auto">
						<div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 sticky top-0 bg-white rounded-t-3xl">
							<div className="min-w-0">
								<h3 className="font-semibold text-gray-900">
									Selesai — Bukti Serah Terima
								</h3>
								<p className="text-xs text-gray-400 truncate">
									{selesaiTarget.penerima_nama}
								</p>
							</div>
							<button
								onClick={closeSelesai}
								disabled={podSaving}
								className="p-2 hover:bg-gray-100 rounded-lg disabled:opacity-50 flex-shrink-0">
								<X size={18} className="text-gray-400" />
							</button>
						</div>

						<div className="p-5 space-y-4">
							<div>
								<label className="block text-xs font-medium text-gray-600 mb-1.5">
									Foto Bukti Serah Terima *
								</label>
								{podFotoPreview ? (
									<div className="relative">
										<img
											src={podFotoPreview}
											alt="Preview bukti"
											className="w-full h-52 object-cover rounded-xl border border-gray-200"
										/>
										<label className="absolute bottom-2 right-2 flex items-center gap-1.5 px-3 py-2 bg-white/95 rounded-lg text-xs font-medium text-gray-700 shadow cursor-pointer">
											<Camera size={13} /> Ambil Ulang
											<input
												type="file"
												accept="image/*"
												capture="environment"
												onChange={handlePodFotoChange}
												className="hidden"
											/>
										</label>
									</div>
								) : (
									<label className="flex flex-col items-center justify-center gap-2 h-40 border-2 border-dashed border-gray-300 rounded-xl text-gray-400 cursor-pointer hover:bg-gray-50 transition">
										<Camera size={28} />
										<span className="text-sm font-medium">Buka Kamera</span>
										<input
											type="file"
											accept="image/*"
											capture="environment"
											onChange={handlePodFotoChange}
											className="hidden"
										/>
									</label>
								)}
							</div>

							<div>
								<label className="block text-xs font-medium text-gray-600 mb-1.5">
									Nama Penerima *
								</label>
								<input
									value={podNama}
									onChange={(e) => setPodNama(e.target.value)}
									placeholder="Nama orang yang menerima barang"
									className="w-full px-4 py-3 border border-gray-200 rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-indigo-500"
								/>
							</div>

							<div>
								<label className="block text-xs font-medium text-gray-600 mb-1.5">
									Catatan (opsional)
								</label>
								<textarea
									value={podCatatan}
									onChange={(e) => setPodCatatan(e.target.value)}
									rows={2}
									placeholder="Keterangan tambahan..."
									className="w-full px-4 py-3 border border-gray-200 rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
								/>
							</div>

							{podError && (
								<div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
									<AlertCircle size={15} className="mt-0.5 flex-shrink-0" />
									<span>{podError}</span>
								</div>
							)}
						</div>

						<div className="p-5 pt-0 sticky bottom-0 bg-white">
							<button
								onClick={submitSelesai}
								disabled={podSaving || podNama.trim().length < 2 || !podFotoFile}
								className="w-full flex items-center justify-center gap-2 py-3.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-300 text-white rounded-xl text-base font-semibold transition">
								{podSaving ? (
									<Loader2 size={18} className="animate-spin" />
								) : (
									<CheckCircle2 size={18} />
								)}
								{podSaving
									? "Menyimpan..."
									: podError
										? "Coba Lagi"
										: "Konfirmasi Selesai"}
							</button>
						</div>
					</div>
				</div>
			)}

			{/* ── Sheet Gagal Kirim — alasan wajib ── */}
			{gagalTarget && (
				<div className="fixed inset-0 bg-black/40 z-50 flex items-end sm:items-center justify-center">
					<div className="bg-white rounded-t-3xl sm:rounded-2xl w-full max-w-lg shadow-2xl max-h-[92vh] overflow-y-auto">
						<div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 sticky top-0 bg-white rounded-t-3xl">
							<div className="min-w-0">
								<h3 className="font-semibold text-gray-900">Tandai Gagal Kirim</h3>
								<p className="text-xs text-gray-400 truncate">
									{gagalTarget.penerima_nama}
								</p>
							</div>
							<button
								onClick={closeGagal}
								disabled={gagalSaving}
								className="p-2 hover:bg-gray-100 rounded-lg disabled:opacity-50 flex-shrink-0">
								<X size={18} className="text-gray-400" />
							</button>
						</div>

						<div className="p-5 space-y-4">
							<div>
								<label className="block text-xs font-medium text-gray-600 mb-1.5">
									Alasan Gagal *
								</label>
								<select
									value={gagalAlasan}
									onChange={(e) => setGagalAlasan(e.target.value as AlasanGagal)}
									className="w-full px-4 py-3 border border-gray-200 rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white">
									<option value="">— Pilih alasan —</option>
									{(Object.keys(ALASAN_GAGAL_CFG) as AlasanGagal[]).map((a) => (
										<option key={a} value={a}>
											{ALASAN_GAGAL_CFG[a].label}
										</option>
									))}
								</select>
							</div>

							<div>
								<label className="block text-xs font-medium text-gray-600 mb-1.5">
									Catatan (opsional)
								</label>
								<textarea
									value={gagalCatatan}
									onChange={(e) => setGagalCatatan(e.target.value)}
									rows={2}
									placeholder="Detail kejadian..."
									className="w-full px-4 py-3 border border-gray-200 rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
								/>
							</div>

							{gagalError && (
								<div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
									<AlertCircle size={15} className="mt-0.5 flex-shrink-0" />
									<span>{gagalError}</span>
								</div>
							)}
						</div>

						<div className="p-5 pt-0 sticky bottom-0 bg-white">
							<button
								onClick={submitGagal}
								disabled={gagalSaving || !gagalAlasan}
								className="w-full flex items-center justify-center gap-2 py-3.5 bg-red-600 hover:bg-red-700 disabled:bg-red-300 text-white rounded-xl text-base font-semibold transition">
								{gagalSaving ? (
									<Loader2 size={18} className="animate-spin" />
								) : (
									<PackageX size={18} />
								)}
								{gagalSaving
									? "Menyimpan..."
									: gagalError
										? "Coba Lagi"
										: "Konfirmasi Gagal Kirim"}
							</button>
						</div>
					</div>
				</div>
			)}

				{/* ── Sheet Detail Ringkas (tap kartu) — alamat + telepon/WA penerima ── */}
				{detailTarget && (
					<div
						className="fixed inset-0 bg-black/40 z-50 flex items-end sm:items-center justify-center"
						onClick={() => setDetailTarget(null)}>
						<div
							onClick={(e) => e.stopPropagation()}
							className="bg-white rounded-t-3xl sm:rounded-2xl w-full max-w-lg shadow-2xl max-h-[92vh] overflow-y-auto">
							<div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 sticky top-0 bg-white rounded-t-3xl">
								<div className="min-w-0">
									<h3 className="font-semibold text-gray-900">Detail Tujuan</h3>
									<p className="font-mono text-xs text-gray-400 truncate">
										{detailTarget.nomor_resi || detailTarget.nomor_faktur}
									</p>
								</div>
								<button
									onClick={() => setDetailTarget(null)}
									className="p-2 hover:bg-gray-100 rounded-lg flex-shrink-0">
									<X size={18} className="text-gray-400" />
								</button>
							</div>

							<div className="p-5 space-y-4">
								<div>
									<p className="text-xs font-medium text-gray-500 mb-1">Penerima</p>
									<p className="text-base font-semibold text-gray-900">
										{detailTarget.penerima_nama}
									</p>
								</div>

								<div>
									<p className="text-xs font-medium text-gray-500 mb-1">Alamat Tujuan</p>
									<p className="text-sm text-gray-700">
										{detailTarget.penerima_alamat || "-"}
										{detailTarget.penerima_kota ? `, ${detailTarget.penerima_kota}` : ""}
									</p>
								</div>

								{detailTarget.waktuSelesai && (
									<div>
										<p className="text-xs font-medium text-gray-500 mb-1">
											Diselesaikan
										</p>
										<p className="text-sm text-gray-700">
											{jamSelesai(detailTarget.waktuSelesai)}
											{detailTarget.pod_penerima_nama
												? ` — diterima oleh ${detailTarget.pod_penerima_nama}`
												: ""}
										</p>
									</div>
								)}

								{detailTarget.penerima_telepon && (
									<div className="flex gap-2 pt-2">
										<a
											href={`tel:${detailTarget.penerima_telepon}`}
											className="flex-1 flex items-center justify-center gap-2 py-3 border-2 border-indigo-500 text-indigo-600 hover:bg-indigo-50 rounded-xl text-sm font-semibold transition">
											<Phone size={16} />
											Telepon
										</a>
										<a
											href={waLink(detailTarget.penerima_telepon)}
											target="_blank"
											rel="noopener noreferrer"
											className="flex-1 flex items-center justify-center gap-2 py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl text-sm font-semibold transition">
											<MessageCircle size={16} />
											WhatsApp
										</a>
									</div>
								)}
							</div>
						</div>
					</div>
				)}

			{manifestAktif && (
				<ScanQRManifestOverlay
					open={scanOpen}
					manifestId={manifestAktif.id}
					onClose={() => setScanOpen(false)}
					onItemAdded={() => {
						// Kiriman baru ditambahkan ke manifest via scan — tidak
						// mengubah milestone-nya (masih diproses/dijemput/gagal_kirim),
						// jadi belum tentu langsung relevan ke daftar tugas aktif.
						// Refresh tetap dipanggil biar konsisten kalau kebetulan sudah
						// eligible (mis. sudah dijemput sebelumnya).
						load();
					}}
				/>
			)}
		</div>
	);
}
