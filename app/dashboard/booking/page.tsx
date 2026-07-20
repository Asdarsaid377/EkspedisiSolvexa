"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { createClient } from "@/lib/supabase/client";
import { insertPengirimanWithResi, formatRupiah, formatDate } from "@/lib/utils";
import { lookupTarifOngkir } from "@/lib/tarifAksi";
import { logAktivitas } from "@/lib/aktivitas";
import type { BookingRequest, BookingStatus, JenisLayanan } from "@/lib/types";
import {
	Inbox,
	Package,
	Zap,
	Truck,
	Clock,
	CheckCircle2,
	XCircle,
	X,
	AlertCircle,
} from "lucide-react";

// Role yang bisa lihat & proses halaman ini — sama dengan CRUD customer
// (Keputusan Terbuka #1 spec 10, dikonfirmasi: usulan diterima).
const BOOKING_STAFF_ROLES = ["superadmin", "cs", "kasir", "keuangan"];

const JENIS_LAYANAN_CFG: Record<JenisLayanan, { label: string; icon: any; color: string }> = {
	reguler: { label: "Reguler", icon: Package, color: "bg-blue-100 text-blue-700" },
	express: { label: "Express", icon: Zap, color: "bg-amber-100 text-amber-700" },
	kargo: { label: "Kargo", icon: Truck, color: "bg-purple-100 text-purple-700" },
};

const STATUS_CFG: Record<BookingStatus, { label: string; color: string; icon: any }> = {
	pending: { label: "Menunggu", color: "bg-amber-100 text-amber-700", icon: Clock },
	dikonfirmasi: {
		label: "Dikonfirmasi",
		color: "bg-green-100 text-green-700",
		icon: CheckCircle2,
	},
	ditolak: { label: "Ditolak", color: "bg-red-100 text-red-700", icon: XCircle },
};

function initConfirmForm(b: BookingRequest) {
	return {
		jenis_layanan: b.jenis_layanan,
		cabang_id: "",
		pengirim_nama: b.pengirim_nama,
		pengirim_telepon: b.pengirim_telepon || "",
		pengirim_alamat: b.pengirim_alamat || "",
		pengirim_kota: b.pengirim_kota || "",
		penerima_nama: b.penerima_nama,
		penerima_telepon: b.penerima_telepon || "",
		penerima_alamat: b.penerima_alamat || "",
		penerima_kota: b.penerima_kota || "",
		berat_kg: String(b.berat_kg ?? 0),
		panjang_cm: b.panjang_cm != null ? String(b.panjang_cm) : "",
		lebar_cm: b.lebar_cm != null ? String(b.lebar_cm) : "",
		tinggi_cm: b.tinggi_cm != null ? String(b.tinggi_cm) : "",
		isi_barang: b.isi_barang || "",
		nilai_barang: String(b.nilai_barang ?? 0),
		ongkir: String(b.ongkir_estimasi ?? 0),
		biaya_asuransi: "0",
		metode_bayar: "transfer",
		status_bayar: "belum_bayar",
		uang_dp: "0",
		petugas_id: "",
		petugas_nama: "",
		petugas_telepon: "",
		catatan: b.catatan || "",
	};
}

export default function DashboardBookingPage() {
	const { role, user, loading: authLoading } = useAuth();
	const router = useRouter();
	const supabase = createClient();

	useEffect(() => {
		if (!authLoading && !BOOKING_STAFF_ROLES.includes(role ?? "")) {
			router.replace("/dashboard");
		}
	}, [authLoading, role, router]);

	const [list, setList] = useState<BookingRequest[]>([]);
	const [loading, setLoading] = useState(true);
	const [filterStatus, setFilterStatus] = useState<"semua" | BookingStatus>("pending");
	const [cabangList, setCabangList] = useState<any[]>([]);
	const [petugasList, setPetugasList] = useState<any[]>([]);

	const [modal, setModal] = useState<"konfirmasi" | "tolak" | null>(null);
	const [selected, setSelected] = useState<BookingRequest | null>(null);
	const [confirmForm, setConfirmForm] = useState(initConfirmForm({} as BookingRequest));
	const [rejectReason, setRejectReason] = useState("");
	const [saving, setSaving] = useState(false);
	const [formError, setFormError] = useState("");
	const [resiSukses, setResiSukses] = useState<string | null>(null);

	const [tarifInfo, setTarifInfo] = useState<{
		found: boolean;
		estimasi_hari?: number | null;
	} | null>(null);
	const [tarifLoading, setTarifLoading] = useState(false);

	const loadAll = async () => {
		setLoading(true);
		const [{ data }, { data: cabang }, { data: petugas }] = await Promise.all([
			supabase
				.from("booking_request")
				.select("*, customer:customer_id(nama, email, telepon)")
				.order("created_at", { ascending: false })
				.limit(200),
			supabase.from("cabang").select("id, nama").eq("aktif", true).order("nama"),
			supabase
				.from("profiles")
				.select("id, name, role")
				.in("role", ["sopir", "kurir"])
				.order("name"),
		]);
		setList((data as any) || []);
		setCabangList(cabang || []);
		setPetugasList(petugas || []);
		setLoading(false);
	};

	useEffect(() => {
		if (BOOKING_STAFF_ROLES.includes(role ?? "")) loadAll();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [role]);

	// Live ongkir lookup di modal konfirmasi — reuse SAMA PERSIS logika form
	// staf /dashboard/pengiriman (Step 3, lib/tarifAksi.ts). Prefill awal
	// datang dari booking_request.ongkir_estimasi (§4 Business Rules), tapi
	// tetap dihitung ulang live kalau staf mengubah kota/berat/dimensi di
	// modal ini — parity penuh dengan form staf, bukan cuma prefill statis.
	useEffect(() => {
		if (modal !== "konfirmasi") return;
		if (confirmForm.jenis_layanan === "kargo") {
			setTarifInfo(null);
			return;
		}
		const asal = confirmForm.pengirim_kota.trim();
		const tujuan = confirmForm.penerima_kota.trim();
		if (!asal || !tujuan) {
			setTarifInfo(null);
			return;
		}

		let cancelled = false;
		const lookup = async () => {
			setTarifLoading(true);
			const result = await lookupTarifOngkir(supabase, {
				jenisLayanan: confirmForm.jenis_layanan,
				kotaAsal: asal,
				kotaTujuan: tujuan,
				beratKg: confirmForm.berat_kg,
				panjangCm: confirmForm.panjang_cm,
				lebarCm: confirmForm.lebar_cm,
				tinggiCm: confirmForm.tinggi_cm,
			});
			if (cancelled) return;
			setTarifLoading(false);

			if (!result.found) {
				setTarifInfo({ found: false });
				return;
			}
			setConfirmForm((f) => ({ ...f, ongkir: String(result.ongkir) }));
			setTarifInfo({ found: true, estimasi_hari: result.estimasi_hari });
		};
		lookup();
		return () => {
			cancelled = true;
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [
		modal,
		confirmForm.jenis_layanan,
		confirmForm.pengirim_kota,
		confirmForm.penerima_kota,
		confirmForm.berat_kg,
		confirmForm.panjang_cm,
		confirmForm.lebar_cm,
		confirmForm.tinggi_cm,
	]);

	const openKonfirmasi = (b: BookingRequest) => {
		setSelected(b);
		setConfirmForm(initConfirmForm(b));
		setTarifInfo(null);
		setFormError("");
		setModal("konfirmasi");
	};

	const openTolak = (b: BookingRequest) => {
		setSelected(b);
		setRejectReason("");
		setFormError("");
		setModal("tolak");
	};

	const totalTagihanForm =
		(Number(confirmForm.ongkir) || 0) + (Number(confirmForm.biaya_asuransi) || 0);

	const handleKonfirmasi = async () => {
		if (!selected) return;
		if (!confirmForm.pengirim_nama.trim() || !confirmForm.penerima_nama.trim()) {
			setFormError("Nama pengirim & penerima wajib diisi");
			return;
		}
		setSaving(true);
		setFormError("");

		const { data: pg, error } = await insertPengirimanWithResi(supabase, {
			jenis_layanan: confirmForm.jenis_layanan,
			cabang_id: confirmForm.cabang_id || null,
			customer_id: selected.customer_id || null,
			pengirim_nama: confirmForm.pengirim_nama,
			pengirim_telepon: confirmForm.pengirim_telepon || null,
			pengirim_alamat: confirmForm.pengirim_alamat || null,
			pengirim_kota: confirmForm.pengirim_kota || null,
			penerima_nama: confirmForm.penerima_nama,
			penerima_telepon: confirmForm.penerima_telepon || null,
			penerima_alamat: confirmForm.penerima_alamat || null,
			penerima_kota: confirmForm.penerima_kota || null,
			berat_kg: Number(confirmForm.berat_kg) || 0,
			panjang_cm: confirmForm.panjang_cm ? Number(confirmForm.panjang_cm) : null,
			lebar_cm: confirmForm.lebar_cm ? Number(confirmForm.lebar_cm) : null,
			tinggi_cm: confirmForm.tinggi_cm ? Number(confirmForm.tinggi_cm) : null,
			isi_barang: confirmForm.isi_barang || null,
			nilai_barang: Number(confirmForm.nilai_barang) || 0,
			ongkir: Number(confirmForm.ongkir) || 0,
			biaya_asuransi: Number(confirmForm.biaya_asuransi) || 0,
			total_tagihan: totalTagihanForm,
			metode_bayar: confirmForm.metode_bayar,
			status_bayar: confirmForm.status_bayar,
			uang_dp: Number(confirmForm.uang_dp) || 0,
			petugas_id: confirmForm.petugas_id || null,
			petugas_nama: confirmForm.petugas_nama || null,
			petugas_telepon: confirmForm.petugas_telepon || null,
			estimasi_hari: tarifInfo?.found ? (tarifInfo.estimasi_hari ?? null) : null,
			catatan: confirmForm.catatan || null,
			catatan_internal: `Dikonfirmasi dari booking mandiri customer (booking_request ${selected.id.slice(0, 8)})`,
		});

		if (error || !pg) {
			setSaving(false);
			setFormError("Gagal membuat pengiriman, coba lagi");
			return;
		}

		const jumlahBayarAwal =
			confirmForm.status_bayar === "lunas"
				? totalTagihanForm
				: Number(confirmForm.uang_dp) || 0;
		if (jumlahBayarAwal > 0) {
			await supabase.from("pengiriman_pembayaran").insert({
				pengiriman_id: pg.id,
				jumlah: jumlahBayarAwal,
				metode: confirmForm.metode_bayar,
				catatan: confirmForm.status_bayar === "dp" ? "DP awal" : null,
			});
		}

		await supabase
			.from("booking_request")
			.update({
				status: "dikonfirmasi",
				pengiriman_id: pg.id,
				processed_by: user?.id ?? null,
				processed_at: new Date().toISOString(),
			})
			.eq("id", selected.id);

		await logAktivitas(supabase, {
			aksi: "konfirmasi_booking",
			entitas: "booking_request",
			entitas_id: selected.id,
			ref: pg.nomor_resi,
			detail: { pengiriman_id: pg.id },
			created_by: user?.id,
		});

		setSaving(false);
		setModal(null);
		setResiSukses(pg.nomor_resi);
		loadAll();
	};

	const handleTolak = async () => {
		if (!selected) return;
		if (!rejectReason.trim()) {
			setFormError("Alasan penolakan wajib diisi");
			return;
		}
		setSaving(true);
		setFormError("");

		const { error } = await supabase
			.from("booking_request")
			.update({
				status: "ditolak",
				catatan_penolakan: rejectReason.trim(),
				processed_by: user?.id ?? null,
				processed_at: new Date().toISOString(),
			})
			.eq("id", selected.id);

		if (error) {
			setSaving(false);
			setFormError("Gagal menolak booking, coba lagi");
			return;
		}

		await logAktivitas(supabase, {
			aksi: "tolak_booking",
			entitas: "booking_request",
			entitas_id: selected.id,
			detail: { alasan: rejectReason.trim() },
			created_by: user?.id,
		});

		setSaving(false);
		setModal(null);
		loadAll();
	};

	if (authLoading || !BOOKING_STAFF_ROLES.includes(role ?? "")) return null;

	const filtered = list.filter((b) => filterStatus === "semua" || b.status === filterStatus);
	const pendingCount = list.filter((b) => b.status === "pending").length;

	return (
		<div className="p-4 md:p-6 space-y-5">
			<div className="flex items-center gap-3">
				<div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center">
					<Inbox size={20} className="text-indigo-600" />
				</div>
				<div>
					<h1 className="text-lg font-bold text-gray-900">Booking Masuk</h1>
					<p className="text-sm text-gray-500">
						Pengajuan booking mandiri dari customer — {pendingCount} menunggu konfirmasi
					</p>
				</div>
			</div>

			<div className="flex gap-2 flex-wrap">
				{(["pending", "dikonfirmasi", "ditolak", "semua"] as const).map((s) => (
					<button
						key={s}
						onClick={() => setFilterStatus(s)}
						className={`px-3 py-1.5 rounded-xl text-sm font-medium transition ${
							filterStatus === s
								? "bg-indigo-600 text-white"
								: "bg-gray-100 text-gray-600 hover:bg-gray-200"
						}`}>
						{s === "semua" ? "Semua" : STATUS_CFG[s].label}
					</button>
				))}
			</div>

			{loading ? (
				<div className="text-center py-12 text-gray-400 text-sm">Memuat...</div>
			) : filtered.length === 0 ? (
				<div className="text-center py-12 text-gray-400 text-sm bg-white border border-gray-100 rounded-2xl">
					Tidak ada booking di status ini.
				</div>
			) : (
				<div className="space-y-2">
					{filtered.map((b) => {
						const cfg = JENIS_LAYANAN_CFG[b.jenis_layanan];
						const Icon = cfg?.icon ?? Package;
						const statusCfg = STATUS_CFG[b.status];
						return (
							<div
								key={b.id}
								className="bg-white border border-gray-100 rounded-2xl p-4">
								<div className="flex items-start justify-between gap-2">
									<div className="min-w-0">
										<p className="text-sm font-semibold text-gray-900 flex items-center gap-1.5">
											<Icon size={14} className="text-gray-400" />
											{b.customer?.nama || "Customer"}
											<span
												className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${cfg?.color}`}>
												{cfg?.label}
											</span>
										</p>
										<p className="text-xs text-gray-500 mt-0.5 truncate">
											Ke: {b.penerima_nama}
											{b.penerima_kota ? ` · ${b.penerima_kota}` : ""} ·{" "}
											{b.berat_kg} kg
										</p>
										{b.customer?.email && (
											<p className="text-xs text-gray-400">{b.customer.email}</p>
										)}
									</div>
									<span
										className={`text-xs font-medium px-2 py-1 rounded-lg whitespace-nowrap ${statusCfg.color}`}>
										{statusCfg.label}
									</span>
								</div>

								{b.status === "ditolak" && b.catatan_penolakan && (
									<p className="text-xs text-red-600 bg-red-50 rounded-lg px-2 py-1.5 mt-2">
										Alasan: {b.catatan_penolakan}
									</p>
								)}

								<div className="flex items-center justify-between mt-2">
									<span className="text-xs text-gray-400">{formatDate(b.created_at)}</span>
									{b.ongkir_estimasi != null && (
										<span className="text-xs font-medium text-gray-600">
											Estimasi {formatRupiah(b.ongkir_estimasi)}
										</span>
									)}
								</div>

								{b.status === "pending" && (
									<div className="flex gap-2 mt-3">
										<button
											onClick={() => openTolak(b)}
											className="flex-1 border border-gray-200 text-gray-600 text-sm font-medium py-2 rounded-xl hover:bg-gray-50 transition">
											Tolak
										</button>
										<button
											onClick={() => openKonfirmasi(b)}
											className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold py-2 rounded-xl transition">
											Konfirmasi
										</button>
									</div>
								)}
							</div>
						);
					})}
				</div>
			)}

			{/* Modal Tolak */}
			{modal === "tolak" && selected && (
				<div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
					<div className="bg-white rounded-2xl w-full max-w-md p-6">
						<div className="flex items-center justify-between mb-4">
							<h2 className="text-lg font-bold text-gray-900">Tolak Booking</h2>
							<button onClick={() => setModal(null)} className="text-gray-400 hover:text-gray-600">
								<X size={20} />
							</button>
						</div>
						<p className="text-sm text-gray-500 mb-3">
							Booking dari <b>{selected.customer?.nama}</b> untuk {selected.penerima_nama}
						</p>
						<label className="block text-sm font-medium text-gray-700 mb-1">
							Alasan Penolakan
						</label>
						<textarea
							value={rejectReason}
							onChange={(e) => setRejectReason(e.target.value)}
							rows={3}
							className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
							placeholder="mis. Rute belum kami layani, data kurang lengkap, dst."
						/>
						{formError && (
							<div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-600 px-3 py-2 rounded-xl text-sm mt-3">
								<AlertCircle size={16} /> {formError}
							</div>
						)}
						<div className="flex gap-2 mt-5">
							<button
								onClick={() => setModal(null)}
								className="flex-1 border border-gray-200 text-gray-700 font-semibold py-2.5 rounded-xl hover:bg-gray-50 transition">
								Batal
							</button>
							<button
								onClick={handleTolak}
								disabled={saving}
								className="flex-1 bg-red-600 hover:bg-red-700 disabled:bg-red-300 text-white font-semibold py-2.5 rounded-xl transition">
								{saving ? "Memproses..." : "Tolak Booking"}
							</button>
						</div>
					</div>
				</div>
			)}

			{/* Modal Konfirmasi */}
			{modal === "konfirmasi" && selected && (
				<div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50 overflow-y-auto">
					<div className="bg-white rounded-2xl w-full max-w-2xl p-6 my-8">
						<div className="flex items-center justify-between mb-4">
							<h2 className="text-lg font-bold text-gray-900">Konfirmasi Booking</h2>
							<button onClick={() => setModal(null)} className="text-gray-400 hover:text-gray-600">
								<X size={20} />
							</button>
						</div>

						<div className="space-y-4">
							<div>
								<label className="block text-sm font-medium text-gray-700 mb-1.5">
									Jenis Layanan
								</label>
								<div className="grid grid-cols-3 gap-2">
									{(Object.keys(JENIS_LAYANAN_CFG) as JenisLayanan[]).map((jl) => {
										const cfg = JENIS_LAYANAN_CFG[jl];
										const Icon = cfg.icon;
										const active = confirmForm.jenis_layanan === jl;
										return (
											<button
												key={jl}
												type="button"
												onClick={() => setConfirmForm({ ...confirmForm, jenis_layanan: jl })}
												className={`flex flex-col items-center gap-1 py-2 rounded-xl border text-xs font-medium transition ${
													active
														? "border-indigo-500 bg-indigo-50 text-indigo-700"
														: "border-gray-200 text-gray-500 hover:bg-gray-50"
												}`}>
												<Icon size={16} />
												{cfg.label}
											</button>
										);
									})}
								</div>
							</div>

							<div className="grid grid-cols-2 gap-4">
								<div className="space-y-2">
									<p className="text-xs font-semibold text-gray-400 uppercase">Pengirim</p>
									<input
										value={confirmForm.pengirim_nama}
										onChange={(e) =>
											setConfirmForm({ ...confirmForm, pengirim_nama: e.target.value })
										}
										placeholder="Nama pengirim"
										className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
									/>
									<input
										value={confirmForm.pengirim_telepon}
										onChange={(e) =>
											setConfirmForm({ ...confirmForm, pengirim_telepon: e.target.value })
										}
										placeholder="Telepon"
										className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
									/>
									<input
										value={confirmForm.pengirim_kota}
										onChange={(e) =>
											setConfirmForm({ ...confirmForm, pengirim_kota: e.target.value })
										}
										placeholder="Kota asal"
										className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
									/>
									<textarea
										value={confirmForm.pengirim_alamat}
										onChange={(e) =>
											setConfirmForm({ ...confirmForm, pengirim_alamat: e.target.value })
										}
										placeholder="Alamat"
										rows={2}
										className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
									/>
								</div>
								<div className="space-y-2">
									<p className="text-xs font-semibold text-gray-400 uppercase">Penerima</p>
									<input
										value={confirmForm.penerima_nama}
										onChange={(e) =>
											setConfirmForm({ ...confirmForm, penerima_nama: e.target.value })
										}
										placeholder="Nama penerima"
										className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
									/>
									<input
										value={confirmForm.penerima_telepon}
										onChange={(e) =>
											setConfirmForm({ ...confirmForm, penerima_telepon: e.target.value })
										}
										placeholder="Telepon"
										className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
									/>
									<input
										value={confirmForm.penerima_kota}
										onChange={(e) =>
											setConfirmForm({ ...confirmForm, penerima_kota: e.target.value })
										}
										placeholder="Kota tujuan"
										className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
									/>
									<textarea
										value={confirmForm.penerima_alamat}
										onChange={(e) =>
											setConfirmForm({ ...confirmForm, penerima_alamat: e.target.value })
										}
										placeholder="Alamat"
										rows={2}
										className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
									/>
								</div>
							</div>

							<div className="grid grid-cols-4 gap-3">
								<div>
									<label className="block text-xs font-medium text-gray-700 mb-1">
										Berat (kg)
									</label>
									<input
										type="number"
										value={confirmForm.berat_kg}
										onChange={(e) =>
											setConfirmForm({ ...confirmForm, berat_kg: e.target.value })
										}
										className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
									/>
								</div>
								<div>
									<label className="block text-xs font-medium text-gray-700 mb-1">P (cm)</label>
									<input
										type="number"
										value={confirmForm.panjang_cm}
										onChange={(e) =>
											setConfirmForm({ ...confirmForm, panjang_cm: e.target.value })
										}
										className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
									/>
								</div>
								<div>
									<label className="block text-xs font-medium text-gray-700 mb-1">L (cm)</label>
									<input
										type="number"
										value={confirmForm.lebar_cm}
										onChange={(e) =>
											setConfirmForm({ ...confirmForm, lebar_cm: e.target.value })
										}
										className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
									/>
								</div>
								<div>
									<label className="block text-xs font-medium text-gray-700 mb-1">T (cm)</label>
									<input
										type="number"
										value={confirmForm.tinggi_cm}
										onChange={(e) =>
											setConfirmForm({ ...confirmForm, tinggi_cm: e.target.value })
										}
										className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
									/>
								</div>
							</div>

							<div className="grid grid-cols-2 gap-4">
								<div>
									<label className="block text-xs font-medium text-gray-700 mb-1">
										Isi Barang
									</label>
									<input
										value={confirmForm.isi_barang}
										onChange={(e) =>
											setConfirmForm({ ...confirmForm, isi_barang: e.target.value })
										}
										className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
									/>
								</div>
								<div>
									<label className="block text-xs font-medium text-gray-700 mb-1">
										Nilai Barang
									</label>
									<input
										type="number"
										value={confirmForm.nilai_barang}
										onChange={(e) =>
											setConfirmForm({ ...confirmForm, nilai_barang: e.target.value })
										}
										className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
									/>
								</div>
							</div>

							<div className="grid grid-cols-2 gap-4">
								<div>
									<label className="block text-xs font-medium text-gray-700 mb-1">
										Ongkir{" "}
										{tarifLoading && <span className="text-gray-400">(menghitung...)</span>}
										{tarifInfo?.found === false && (
											<span className="text-amber-600">(tarif tidak ditemukan, isi manual)</span>
										)}
									</label>
									<input
										type="number"
										value={confirmForm.ongkir}
										onChange={(e) =>
											setConfirmForm({ ...confirmForm, ongkir: e.target.value })
										}
										className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
									/>
								</div>
								<div>
									<label className="block text-xs font-medium text-gray-700 mb-1">
										Biaya Asuransi
									</label>
									<input
										type="number"
										value={confirmForm.biaya_asuransi}
										onChange={(e) =>
											setConfirmForm({ ...confirmForm, biaya_asuransi: e.target.value })
										}
										className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
									/>
								</div>
							</div>

							<div className="grid grid-cols-3 gap-3">
								<div>
									<label className="block text-xs font-medium text-gray-700 mb-1">
										Metode Bayar
									</label>
									<select
										value={confirmForm.metode_bayar}
										onChange={(e) =>
											setConfirmForm({ ...confirmForm, metode_bayar: e.target.value })
										}
										className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
										<option value="transfer">Transfer</option>
										<option value="cod">COD</option>
										<option value="cash">Cash</option>
									</select>
								</div>
								<div>
									<label className="block text-xs font-medium text-gray-700 mb-1">
										Status Bayar
									</label>
									<select
										value={confirmForm.status_bayar}
										onChange={(e) =>
											setConfirmForm({ ...confirmForm, status_bayar: e.target.value })
										}
										className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
										<option value="belum_bayar">Belum Bayar</option>
										<option value="dp">DP</option>
										<option value="lunas">Lunas</option>
									</select>
								</div>
								<div>
									<label className="block text-xs font-medium text-gray-700 mb-1">
										{confirmForm.status_bayar === "dp" ? "Jumlah DP" : "Cabang"}
									</label>
									{confirmForm.status_bayar === "dp" ? (
										<input
											type="number"
											value={confirmForm.uang_dp}
											onChange={(e) =>
												setConfirmForm({ ...confirmForm, uang_dp: e.target.value })
											}
											className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
										/>
									) : (
										<select
											value={confirmForm.cabang_id}
											onChange={(e) =>
												setConfirmForm({ ...confirmForm, cabang_id: e.target.value })
											}
											className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
											<option value="">Tanpa Cabang</option>
											{cabangList.map((c) => (
												<option key={c.id} value={c.id}>
													{c.nama}
												</option>
											))}
										</select>
									)}
								</div>
							</div>

							<div className="grid grid-cols-2 gap-4">
								<div>
									<label className="block text-xs font-medium text-gray-700 mb-1">
										Kurir / Sopir
									</label>
									<select
										value={confirmForm.petugas_id}
										onChange={(e) => {
											const v = e.target.value;
											if (!v) {
												setConfirmForm({ ...confirmForm, petugas_id: "" });
												return;
											}
											const staff = petugasList.find((p) => p.id === v);
											setConfirmForm({
												...confirmForm,
												petugas_id: v,
												petugas_nama: staff?.name || "",
											});
										}}
										className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
										<option value="">Lainnya / Belum Ditentukan</option>
										{petugasList.map((p) => (
											<option key={p.id} value={p.id}>
												{p.name} ({p.role})
											</option>
										))}
									</select>
								</div>
								<div>
									<label className="block text-xs font-medium text-gray-700 mb-1">Cabang</label>
									{confirmForm.status_bayar === "dp" ? (
										<select
											value={confirmForm.cabang_id}
											onChange={(e) =>
												setConfirmForm({ ...confirmForm, cabang_id: e.target.value })
											}
											className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
											<option value="">Tanpa Cabang</option>
											{cabangList.map((c) => (
												<option key={c.id} value={c.id}>
													{c.nama}
												</option>
											))}
										</select>
									) : (
										<p className="text-xs text-gray-400 py-2">
											Sudah dipilih di kolom sebelumnya
										</p>
									)}
								</div>
							</div>

							<div>
								<label className="block text-xs font-medium text-gray-700 mb-1">Catatan</label>
								<textarea
									value={confirmForm.catatan}
									onChange={(e) =>
										setConfirmForm({ ...confirmForm, catatan: e.target.value })
									}
									rows={2}
									className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
								/>
							</div>

							<div className="bg-gray-50 rounded-xl px-4 py-3 flex items-center justify-between">
								<span className="text-sm text-gray-500">Total Tagihan</span>
								<span className="text-lg font-bold text-gray-900">
									{formatRupiah(totalTagihanForm)}
								</span>
							</div>

							{formError && (
								<div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-600 px-3 py-2 rounded-xl text-sm">
									<AlertCircle size={16} /> {formError}
								</div>
							)}

							<div className="flex gap-2">
								<button
									onClick={() => setModal(null)}
									className="flex-1 border border-gray-200 text-gray-700 font-semibold py-2.5 rounded-xl hover:bg-gray-50 transition">
									Batal
								</button>
								<button
									onClick={handleKonfirmasi}
									disabled={saving}
									className="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white font-semibold py-2.5 rounded-xl transition">
									{saving ? "Memproses..." : "Buat Pengiriman"}
								</button>
							</div>
						</div>
					</div>
				</div>
			)}

			{/* Sukses */}
			{resiSukses && (
				<div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
					<div className="bg-white rounded-2xl w-full max-w-sm p-6 text-center">
						<div className="inline-flex items-center justify-center w-14 h-14 bg-green-100 rounded-2xl mb-4">
							<CheckCircle2 className="w-7 h-7 text-green-600" />
						</div>
						<h2 className="text-lg font-bold text-gray-900">Pengiriman Dibuat</h2>
						<p className="text-sm text-gray-500 mt-1">
							Nomor resi: <span className="font-mono font-semibold">{resiSukses}</span>
						</p>
						<button
							onClick={() => setResiSukses(null)}
							className="w-full mt-5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2.5 rounded-xl transition">
							Tutup
						</button>
					</div>
				</div>
			)}
		</div>
	);
}
