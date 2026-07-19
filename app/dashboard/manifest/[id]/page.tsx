"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { formatDateOnly, formatRupiah } from "@/lib/utils";
import { MANIFEST_BIAYA_KATEGORI_CFG } from "@/lib/pengirimanConstants";
import { logAktivitas } from "@/lib/aktivitas";
import { ManifestBiayaKategori } from "@/lib/types";
import { findEligibleCandidates, addManifestItem } from "@/lib/manifestAksi";
import ScanQRManifestOverlay from "@/components/ScanQRManifestOverlay";
import Link from "next/link";
import {
	ArrowLeft,
	Truck,
	User,
	MapPin,
	Calendar,
	Package,
	Search,
	Plus,
	Trash2,
	PlayCircle,
	CheckCircle2,
	Ban,
	Loader2,
	AlertCircle,
	Building2,
	Wallet,
	Edit3,
	QrCode,
} from "lucide-react";

const STATUS_CFG: Record<string, { label: string; color: string }> = {
	draft: { label: "Draft", color: "bg-gray-100 text-gray-600" },
	berangkat: { label: "Berangkat", color: "bg-indigo-100 text-indigo-700" },
	selesai: { label: "Selesai", color: "bg-green-100 text-green-700" },
	batal: { label: "Batal", color: "bg-red-100 text-red-700" },
};

const MILESTONE_LABEL: Record<string, string> = {
	diproses: "Diproses",
	dijemput: "Dijemput",
	dikirim: "Dikirim",
	gagal_kirim: "Gagal Kirim",
	retur: "Retur",
	selesai: "Selesai",
};

export default function ManifestDetailPage() {
	const { id } = useParams<{ id: string }>();
	const router = useRouter();
	const supabase = createClient();
	const { isSuperAdmin, role, profile, loading: authLoading } = useAuth();

	const canManage = isSuperAdmin || role === "gudang";
	const canAct =
		isSuperAdmin || role === "gudang" || role === "sopir" || role === "kurir";
	const canInputBiaya =
		isSuperAdmin ||
		role === "gudang" ||
		role === "sopir" ||
		role === "kurir" ||
		role === "keuangan";
	const canEditHapusBiaya = isSuperAdmin || role === "keuangan";
	const canLihatRevenue = isSuperAdmin || role === "keuangan";

	const [data, setData] = useState<any>(null);
	const [items, setItems] = useState<any[]>([]);
	const [armadaList, setArmadaList] = useState<any[]>([]);
	const [sopirList, setSopirList] = useState<any[]>([]);
	const [cabangList, setCabangList] = useState<any[]>([]);
	const [biayaList, setBiayaList] = useState<any[]>([]);
	const [loading, setLoading] = useState(true);
	const [notFound, setNotFound] = useState(false);
	const [saving, setSaving] = useState(false);
	const [actionError, setActionError] = useState("");

	// Biaya Trip
	const emptyBiayaForm = { kategori: "bbm" as ManifestBiayaKategori, jumlah: "", keterangan: "" };
	const [biayaForm, setBiayaForm] = useState(emptyBiayaForm);
	const [biayaFile, setBiayaFile] = useState<File | null>(null);
	const [biayaSaving, setBiayaSaving] = useState(false);
	const [biayaError, setBiayaError] = useState("");
	const [editingBiayaId, setEditingBiayaId] = useState<string | null>(null);
	const [editBiayaForm, setEditBiayaForm] = useState(emptyBiayaForm);

	// Edit info (hanya saat draft)
	const [editArmada, setEditArmada] = useState("");
	const [editSopir, setEditSopir] = useState("");
	const [editCabang, setEditCabang] = useState("");
	const [editRute, setEditRute] = useState("");
	const [editTanggal, setEditTanggal] = useState("");
	const [savingInfo, setSavingInfo] = useState(false);

	// Tambah kiriman
	const [search, setSearch] = useState("");
	const [candidates, setCandidates] = useState<any[]>([]);
	const [searching, setSearching] = useState(false);

	// Scan QR (Step 2, spec 08) — HANYA cara input alternatif untuk alur
	// tambah-kiriman di atas. Kamera/feedback/lifecycle ada di komponen
	// bersama ScanQRManifestOverlay (dipakai juga /tugas, Step 4) — halaman
	// ini cuma toggle buka/tutup overlay-nya.
	const [scanOpen, setScanOpen] = useState(false);

	// Checklist "sudah dicek" (Step 3, spec 08) — Set pengiriman_id, MURNI
	// state lokal browser (bukan kolom DB, tidak persist ke localStorage
	// juga) — sengaja dangkal, reset tiap reload halaman.
	const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set());

	useEffect(() => {
		if (!id) return;
		load();
	}, [id]);

	const load = async () => {
		setLoading(true);
		const [{ data: m }, { data: armada }, { data: sopir }, { data: cabang }] =
			await Promise.all([
				supabase
					.from("manifest")
					.select(
						"*, armada:armada(id, plat_nomor, jenis_kendaraan), sopir:profiles!sopir_id(id, name), cabang:cabang(id, nama)",
					)
					.eq("id", id)
					.single(),
				supabase
					.from("armada")
					.select("id, plat_nomor, jenis_kendaraan")
					.eq("aktif", true)
					.order("plat_nomor"),
				supabase
					.from("profiles")
					.select("id, name, role")
					.in("role", ["sopir", "kurir"])
					.order("name"),
				supabase.from("cabang").select("id, nama").eq("aktif", true).order("nama"),
			]);
		if (!m) {
			setNotFound(true);
			setLoading(false);
			return;
		}
		const { data: itemRows } = await supabase
			.from("manifest_item")
			.select("id, pengiriman:pengiriman(*)")
			.eq("manifest_id", id)
			.order("urutan");

		const { data: biayaRows } = await supabase
			.from("manifest_biaya")
			.select("*, creator:profiles!created_by(name)")
			.eq("manifest_id", id)
			.order("created_at", { ascending: false });

		setData(m);
		setItems(itemRows || []);
		setArmadaList(armada || []);
		setSopirList(sopir || []);
		setCabangList(cabang || []);
		setBiayaList(biayaRows || []);
		setEditArmada(m.armada_id || "");
		setEditSopir(m.sopir_id || "");
		setEditCabang(m.cabang_id || "");
		setEditRute(m.rute || "");
		setEditTanggal(m.tanggal_berangkat || "");
		setLoading(false);
	};

	const saveInfo = async () => {
		if (!data) return;
		setSavingInfo(true);
		await supabase
			.from("manifest")
			.update({
				armada_id: editArmada || null,
				sopir_id: editSopir || null,
				cabang_id: editCabang || null,
				rute: editRute || null,
				tanggal_berangkat: editTanggal || null,
			})
			.eq("id", data.id);
		setSavingInfo(false);
		load();
	};

	// Search manual — validasi eligibility via findEligibleCandidates() dari
	// lib/manifestAksi.ts (reuse, sama dengan yang dipakai overlay scan).
	const searchPengiriman = async (q: string) => {
		setSearch(q);
		if (!q.trim()) {
			setCandidates([]);
			return;
		}
		setSearching(true);
		const { eligible } = await findEligibleCandidates(supabase, id, q);
		setCandidates(eligible);
		setSearching(false);
	};

	const addItem = async (pengirimanId: string) => {
		await addManifestItem(supabase, id, pengirimanId);
		setSearch("");
		setCandidates([]);
		load();
	};

	// Checklist "sudah dicek" (opsional, Step 3 spec 08) — MURNI state lokal
	// sesi browser, TIDAK ada INSERT/UPDATE ke tabel apa pun (bukan bagian
	// dari milestone tracking spec 01). Reset begitu halaman di-reload.
	const toggleChecked = (pengirimanId: string) => {
		setCheckedIds((prev) => {
			const next = new Set(prev);
			if (next.has(pengirimanId)) next.delete(pengirimanId);
			else next.add(pengirimanId);
			return next;
		});
	};

	const openScan = () => setScanOpen(true);
	const closeScan = () => setScanOpen(false);

	const removeItem = async (itemId: string) => {
		await supabase.from("manifest_item").delete().eq("id", itemId);
		load();
	};

	const saveBiaya = async () => {
		if (!biayaForm.jumlah || Number(biayaForm.jumlah) <= 0) return;
		if (biayaForm.kategori === "lainnya" && !biayaForm.keterangan.trim()) {
			setBiayaError("Keterangan wajib diisi untuk kategori Lainnya.");
			return;
		}
		setBiayaSaving(true);
		setBiayaError("");

		let foto_bukti: string | null = null;
		if (biayaFile) {
			const ext = biayaFile.name.split(".").pop();
			const path = `manifest-biaya/${id}/${Date.now()}.${ext}`;
			const { error: upErr } = await supabase.storage
				.from("BungaNaik")
				.upload(path, biayaFile);
			if (upErr) {
				setBiayaError("Gagal upload foto: " + upErr.message);
				setBiayaSaving(false);
				return;
			}
			const { data: urlData } = supabase.storage.from("BungaNaik").getPublicUrl(path);
			foto_bukti = urlData.publicUrl;
		}

		const { error } = await supabase.from("manifest_biaya").insert({
			manifest_id: id,
			kategori: biayaForm.kategori,
			jumlah: Number(biayaForm.jumlah),
			keterangan: biayaForm.keterangan || null,
			foto_bukti,
			created_by: profile?.id,
		});

		if (error) {
			setBiayaError("Gagal menyimpan: " + error.message);
			setBiayaSaving(false);
			return;
		}

		setBiayaForm(emptyBiayaForm);
		setBiayaFile(null);
		setBiayaSaving(false);
		load();
	};

	const hapusBiaya = async (b: any) => {
		if (!confirm("Hapus catatan biaya ini?")) return;
		const { error } = await supabase.from("manifest_biaya").delete().eq("id", b.id);
		if (error) return;

		await logAktivitas(supabase, {
			aksi: "hapus_biaya_trip",
			entitas: "manifest_biaya",
			entitas_id: b.id,
			ref: data?.nomor_manifest,
			detail: { kategori: b.kategori, jumlah: b.jumlah, keterangan: b.keterangan },
			created_by: profile?.id,
		});

		load();
	};

	const mulaiEditBiaya = (b: any) => {
		setEditingBiayaId(b.id);
		setEditBiayaForm({
			kategori: b.kategori,
			jumlah: String(b.jumlah),
			keterangan: b.keterangan || "",
		});
	};

	const simpanEditBiaya = async () => {
		if (!editingBiayaId || !editBiayaForm.jumlah || Number(editBiayaForm.jumlah) <= 0) return;
		if (editBiayaForm.kategori === "lainnya" && !editBiayaForm.keterangan.trim()) {
			setBiayaError("Keterangan wajib diisi untuk kategori Lainnya.");
			return;
		}
		const before = biayaList.find((b) => b.id === editingBiayaId);
		const sesudah = {
			kategori: editBiayaForm.kategori,
			jumlah: Number(editBiayaForm.jumlah),
			keterangan: editBiayaForm.keterangan || null,
		};
		const { error } = await supabase
			.from("manifest_biaya")
			.update(sesudah)
			.eq("id", editingBiayaId);
		if (error) return;

		await logAktivitas(supabase, {
			aksi: "edit_biaya_trip",
			entitas: "manifest_biaya",
			entitas_id: editingBiayaId,
			ref: data?.nomor_manifest,
			detail: {
				sebelum: before
					? { kategori: before.kategori, jumlah: before.jumlah, keterangan: before.keterangan }
					: null,
				sesudah,
			},
			created_by: profile?.id,
		});

		setEditingBiayaId(null);
		load();
	};

	const bulkUpdateMilestone = async (
		next: "dikirim",
		fromMilestones: string[],
	) => {
		setActionError("");
		setSaving(true);
		const targets = items.filter((i) => fromMilestones.includes(i.pengiriman.milestone));
		for (const item of targets) {
			await supabase.from("pengiriman_tracking").insert({
				pengiriman_id: item.pengiriman.id,
				milestone: next,
				catatan: `Update massal via manifest ${data.nomor_manifest}`,
				created_by: profile?.id,
			});
			await supabase
				.from("pengiriman")
				.update({ milestone: next })
				.eq("id", item.pengiriman.id);
		}
		return targets.length;
	};

	const mulaiBerangkat = async () => {
		if (!data || items.length === 0) {
			setActionError("Tambahkan minimal 1 kiriman sebelum berangkat.");
			return;
		}
		if (!data.armada_id || !data.sopir_id) {
			setActionError("Armada dan sopir/kurir harus diisi sebelum berangkat.");
			return;
		}
		await bulkUpdateMilestone("dikirim", ["diproses", "dijemput", "gagal_kirim"]);

		// Riwayat Transit (spec 09 §3) — event "berangkat" OTOMATIS untuk
		// SETIAP kiriman dalam manifest, HANYA kalau manifest.cabang_id
		// terisi. cabang_id NULL → lewati total, TIDAK ADA perubahan
		// perilaku dari Fase 3 (regresi check wajib, lihat CLAUDE.md).
		// Murni log paralel — TIDAK PERNAH menyentuh milestone di atas, dan
		// kegagalan insert ini tidak boleh membatalkan aksi Berangkat yang
		// sudah berjalan (fire-and-forget, pola sama seperti logAktivitas()).
		if (data.cabang_id) {
			const { error: transitError } = await supabase.from("pengiriman_transit").insert(
				items.map((item) => ({
					pengiriman_id: item.pengiriman.id,
					cabang_id: data.cabang_id,
					tipe_event: "berangkat",
					manifest_id: data.id,
					created_by: profile?.id,
				})),
			);
			if (transitError) {
				console.error("Gagal mencatat riwayat transit (berangkat):", transitError);
			}
		}

		await supabase.from("manifest").update({ status: "berangkat" }).eq("id", data.id);
		setSaving(false);
		load();
	};

	// Tidak lagi bulk-update milestone kiriman ke "selesai" — sejak POD wajib
	// (lihat docs/spec/01-gagal-kirim-pod.md §3), setiap kiriman harus di-POD
	// satu-per-satu dari halaman detail pengiriman. Tombol ini cuma menutup trip.
	const tandaiSelesai = async () => {
		setSaving(true);
		await supabase.from("manifest").update({ status: "selesai" }).eq("id", data.id);
		setSaving(false);
		load();
	};

	const batalkan = async () => {
		if (!confirm("Batalkan manifest ini? Milestone kiriman yang sudah terlanjur diupdate TIDAK otomatis dikembalikan.")) return;
		setSaving(true);
		await supabase.from("manifest").update({ status: "batal" }).eq("id", data.id);
		setSaving(false);
		load();
	};

	if (authLoading || loading) {
		return (
			<div className="flex items-center justify-center min-h-[60vh]">
				<p className="text-gray-400">Memuat detail manifest...</p>
			</div>
		);
	}

	if (notFound || !data) {
		return (
			<div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
				<p className="text-gray-500 font-medium">Manifest tidak ditemukan</p>
				<Link href="/dashboard/manifest" className="text-sm text-indigo-600 hover:underline">
					← Kembali ke Manifest
				</Link>
			</div>
		);
	}

	const st = STATUS_CFG[data.status] || STATUS_CFG.draft;
	const isDraft = data.status === "draft";

	// Revenue trip = SUM ongkir semua kiriman di manifest (termasuk gagal_kirim/retur
	// — ongkir tetap ditagih, konsisten spec 01). Laba = revenue - total biaya.
	const revenueTrip = items.reduce((s, it) => s + (it.pengiriman?.ongkir || 0), 0);
	const totalBiayaTrip = biayaList.reduce((s, b) => s + Number(b.jumlah), 0);
	const labaTrip = revenueTrip - totalBiayaTrip;
	const marginPercent = revenueTrip > 0 ? (labaTrip / revenueTrip) * 100 : null;

	return (
		<div className="max-w-3xl mx-auto">
			<div className="flex items-start gap-3 mb-6">
				<button
					onClick={() => router.back()}
					className="mt-0.5 p-2 hover:bg-gray-100 rounded-xl transition text-gray-500 flex-shrink-0">
					<ArrowLeft size={18} />
				</button>
				<div>
					<h1 className="text-xl font-bold text-gray-900 font-mono">
						{data.nomor_manifest}
					</h1>
					<span
						className={`inline-block mt-1.5 text-xs px-2.5 py-1 rounded-full font-semibold ${st.color}`}>
						{st.label}
					</span>
				</div>
			</div>

			{actionError && (
				<div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 px-4 py-2.5 rounded-xl text-sm mb-4">
					<AlertCircle size={14} /> {actionError}
				</div>
			)}

			<div className="space-y-4">
				{/* Info manifest */}
				<div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
					<h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">
						Info Perjalanan
					</h2>
					{isDraft && canManage ? (
						<div className="space-y-3">
							<div className="grid grid-cols-2 gap-3">
								<div>
									<label className="block text-xs text-gray-500 mb-1">Armada</label>
									<select
										value={editArmada}
										onChange={(e) => setEditArmada(e.target.value)}
										className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
										<option value="">— Pilih —</option>
										{armadaList.map((a) => (
											<option key={a.id} value={a.id}>
												{a.plat_nomor}
											</option>
										))}
									</select>
								</div>
								<div>
									<label className="block text-xs text-gray-500 mb-1">
										Sopir/Kurir
									</label>
									<select
										value={editSopir}
										onChange={(e) => setEditSopir(e.target.value)}
										className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
										<option value="">— Pilih —</option>
										{sopirList.map((s) => (
											<option key={s.id} value={s.id}>
												{s.name}
											</option>
										))}
									</select>
								</div>
								<div>
									<label className="block text-xs text-gray-500 mb-1">
										Cabang
									</label>
									<select
										value={editCabang}
										onChange={(e) => setEditCabang(e.target.value)}
										className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
										<option value="">— Pilih —</option>
										{cabangList.map((c) => (
											<option key={c.id} value={c.id}>
												{c.nama}
											</option>
										))}
									</select>
								</div>
								<div>
									<label className="block text-xs text-gray-500 mb-1">Rute</label>
									<input
										value={editRute}
										onChange={(e) => setEditRute(e.target.value)}
										className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
									/>
								</div>
								<div>
									<label className="block text-xs text-gray-500 mb-1">
										Tanggal Berangkat
									</label>
									<input
										type="date"
										value={editTanggal}
										onChange={(e) => setEditTanggal(e.target.value)}
										className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
									/>
								</div>
							</div>
							<button
								onClick={saveInfo}
								disabled={savingInfo}
								className="text-sm bg-gray-800 hover:bg-gray-900 text-white px-4 py-2 rounded-xl font-medium">
								{savingInfo ? "Menyimpan..." : "Simpan Info"}
							</button>
						</div>
					) : (
						<div className="grid grid-cols-2 gap-4 text-sm">
							<div className="flex items-center gap-2">
								<Truck size={14} className="text-indigo-500" />
								{data.armada?.plat_nomor || <span className="text-gray-300">-</span>}
							</div>
							<div className="flex items-center gap-2">
								<User size={14} className="text-gray-400" />
								{data.sopir?.name || <span className="text-gray-300">-</span>}
							</div>
							<div className="flex items-center gap-2">
								<Building2 size={14} className="text-indigo-400" />
								{data.cabang?.nama || <span className="text-gray-300">-</span>}
							</div>
							<div className="flex items-center gap-2">
								<MapPin size={14} className="text-rose-500" />
								{data.rute || <span className="text-gray-300">-</span>}
							</div>
							<div className="flex items-center gap-2">
								<Calendar size={14} className="text-gray-400" />
								{data.tanggal_berangkat
									? formatDateOnly(data.tanggal_berangkat)
									: <span className="text-gray-300">-</span>}
							</div>
						</div>
					)}
				</div>

				{/* Aksi */}
				{canAct && data.status !== "selesai" && data.status !== "batal" && (
					<div className="flex items-center gap-2 flex-wrap">
						{isDraft && (
							<button
								onClick={mulaiBerangkat}
								disabled={saving}
								className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white rounded-xl text-sm font-semibold transition">
								{saving ? <Loader2 size={15} className="animate-spin" /> : <PlayCircle size={15} />}
								Berangkat
							</button>
						)}
						{data.status === "berangkat" && (
							<button
								onClick={tandaiSelesai}
								disabled={saving}
								className="flex items-center gap-2 px-4 py-2.5 bg-green-600 hover:bg-green-700 disabled:bg-green-300 text-white rounded-xl text-sm font-semibold transition">
								{saving ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle2 size={15} />}
								Tandai Selesai
							</button>
						)}
						<button
							onClick={batalkan}
							disabled={saving}
							className="flex items-center gap-2 px-4 py-2.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl text-sm font-semibold transition border border-red-200">
							<Ban size={15} /> Batalkan
						</button>
					</div>
				)}

				{/* Tambah kiriman (hanya draft) */}
				{isDraft && canManage && (
					<div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
						<h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
							Tambah Kiriman
						</h2>
						<div className="flex items-center gap-2">
							<div className="relative flex-1">
								<Search
									size={15}
									className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
								/>
								<input
									value={search}
									onChange={(e) => searchPengiriman(e.target.value)}
									placeholder="Cari nomor faktur, resi, atau nama penerima..."
									className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
								/>
							</div>
							<button
								onClick={openScan}
								className="flex items-center gap-1.5 px-3.5 py-2.5 border border-indigo-200 text-indigo-600 hover:bg-indigo-50 rounded-xl text-sm font-semibold flex-shrink-0 transition">
								<QrCode size={15} />
								Scan QR
							</button>
						</div>
						{searching && <p className="text-xs text-gray-400 mt-2">Mencari...</p>}
						{candidates.length > 0 && (
							<div className="mt-3 space-y-2 max-h-64 overflow-y-auto">
								{candidates.map((p) => (
									<button
										key={p.id}
										onClick={() => addItem(p.id)}
										className="w-full flex items-center justify-between px-4 py-2.5 bg-gray-50 hover:bg-indigo-50 rounded-xl text-left transition">
										<div>
											<p className="text-sm font-medium text-gray-900">
												{p.nomor_faktur} {p.nomor_resi ? `· ${p.nomor_resi}` : ""}
											</p>
											<p className="text-xs text-gray-500">
												{p.penerima_nama}
												{p.penerima_kota ? ` · ${p.penerima_kota}` : ""} · {p.berat_kg} kg
											</p>
										</div>
										<Plus size={15} className="text-indigo-500 flex-shrink-0" />
									</button>
								))}
							</div>
						)}
					</div>
				)}

				{/* Daftar kiriman */}
				<div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
					<div className="flex items-center justify-between mb-3">
						<h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">
							Kiriman ({items.length})
						</h2>
						{canAct && items.length > 0 && (
							<span className="text-xs text-gray-400">
								{checkedIds.size}/{items.length} sudah dicek
							</span>
						)}
					</div>
					{items.length === 0 ? (
						<p className="text-sm text-gray-400 italic py-2">Belum ada kiriman</p>
					) : (
						<div className="space-y-2">
							{items.map((it) => {
								const p = it.pengiriman;
								const checked = checkedIds.has(p.id);
								return (
									<div
										key={it.id}
										className={`flex items-center justify-between rounded-xl px-4 py-3 border transition ${
											checked
												? "bg-green-50 border-green-200"
												: "bg-gray-50 border-gray-100"
										}`}>
										<div className="flex items-center gap-3 min-w-0">
											{canAct && (
												<button
													type="button"
													onClick={() => toggleChecked(p.id)}
													title="Tandai sudah dicek/difoto (sesi ini saja, tidak mengubah status pengiriman)"
													className={`w-5 h-5 flex-shrink-0 rounded-md border-2 flex items-center justify-center transition ${
														checked
															? "bg-green-500 border-green-500 text-white"
															: "border-gray-300 hover:border-indigo-400"
													}`}>
													{checked && <CheckCircle2 size={13} />}
												</button>
											)}
											<div className="min-w-0">
												<div className="flex items-center gap-2">
													<Link
														href={`/dashboard/pengiriman/${p.id}`}
														className="text-sm font-semibold text-gray-900 hover:text-indigo-600 hover:underline font-mono">
														{p.nomor_faktur}
													</Link>
													<span className="text-xs px-1.5 py-0.5 rounded-full bg-indigo-100 text-indigo-700 font-medium">
														{MILESTONE_LABEL[p.milestone] || p.milestone}
													</span>
												</div>
												<p className="text-xs text-gray-500 mt-0.5 flex items-center gap-1">
													<Package size={11} /> {p.penerima_nama}
													{p.penerima_kota ? ` · ${p.penerima_kota}` : ""} · {p.berat_kg} kg
												</p>
											</div>
										</div>
										{isDraft && canManage && (
											<button
												onClick={() => removeItem(it.id)}
												className="p-1.5 hover:bg-red-50 rounded-lg text-red-500 transition flex-shrink-0">
												<Trash2 size={14} />
											</button>
										)}
									</div>
								);
							})}
						</div>
					)}
				</div>

				{/* Biaya Trip */}
				<div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
					<h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
						<Wallet size={14} className="text-amber-500" /> Biaya Trip
					</h2>

					{canLihatRevenue && (
						<div className="grid grid-cols-3 gap-3 mb-4">
							<div className="bg-gray-50 rounded-xl p-3">
								<p className="text-xs text-gray-500 mb-0.5">Revenue</p>
								<p className="text-base font-bold text-gray-900">
									{formatRupiah(revenueTrip)}
								</p>
							</div>
							<div className="bg-gray-50 rounded-xl p-3">
								<p className="text-xs text-gray-500 mb-0.5">Total Biaya</p>
								<p className="text-base font-bold text-gray-900">
									{formatRupiah(totalBiayaTrip)}
								</p>
							</div>
							<div
								className={`rounded-xl p-3 ${labaTrip < 0 ? "bg-red-50" : "bg-green-50"}`}>
								<p
									className={`text-xs mb-0.5 ${labaTrip < 0 ? "text-red-500" : "text-green-600"}`}>
									Laba{marginPercent !== null ? ` (${marginPercent.toFixed(1)}%)` : ""}
								</p>
								<p
									className={`text-base font-bold ${labaTrip < 0 ? "text-red-600" : "text-green-700"}`}>
									{formatRupiah(labaTrip)}
								</p>
							</div>
						</div>
					)}

					{canInputBiaya && (
						<div className="bg-gray-50 rounded-xl p-4 mb-4 space-y-3">
							<div className="grid grid-cols-2 gap-3">
								<div>
									<label className="block text-xs text-gray-500 mb-1">Kategori</label>
									<select
										value={biayaForm.kategori}
										onChange={(e) =>
											setBiayaForm({
												...biayaForm,
												kategori: e.target.value as ManifestBiayaKategori,
											})
										}
										className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
										{(Object.keys(MANIFEST_BIAYA_KATEGORI_CFG) as ManifestBiayaKategori[]).map(
											(k) => (
												<option key={k} value={k}>
													{MANIFEST_BIAYA_KATEGORI_CFG[k].label}
												</option>
											),
										)}
									</select>
								</div>
								<div>
									<label className="block text-xs text-gray-500 mb-1">Jumlah</label>
									<input
										type="number"
										value={biayaForm.jumlah}
										onChange={(e) => setBiayaForm({ ...biayaForm, jumlah: e.target.value })}
										placeholder="0"
										className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
									/>
								</div>
							</div>
							<div>
								<label className="block text-xs text-gray-500 mb-1">
									Keterangan{biayaForm.kategori === "lainnya" ? " *" : " (opsional)"}
								</label>
								<input
									value={biayaForm.keterangan}
									onChange={(e) =>
										setBiayaForm({ ...biayaForm, keterangan: e.target.value })
									}
									className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
								/>
							</div>
							<div>
								<label className="block text-xs text-gray-500 mb-1">
									Foto Struk/Nota (opsional)
								</label>
								<input
									type="file"
									accept="image/*"
									onChange={(e) => setBiayaFile(e.target.files?.[0] ?? null)}
									className="w-full text-sm text-gray-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-medium file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
								/>
							</div>
							{biayaError && (
								<div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-xl text-sm">
									{biayaError}
								</div>
							)}
							<button
								onClick={saveBiaya}
								disabled={biayaSaving || !biayaForm.jumlah}
								className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white px-4 py-2 rounded-xl text-sm font-medium">
								<Plus size={14} />
								{biayaSaving ? "Menyimpan..." : "Tambah Biaya"}
							</button>
						</div>
					)}

					{biayaList.length === 0 ? (
						<p className="text-sm text-gray-400 italic py-2">Belum ada biaya dicatat</p>
					) : (
						<div className="space-y-2">
							{biayaList.map((b) => (
								<div
									key={b.id}
									className="bg-gray-50 rounded-xl px-4 py-3 border border-gray-100">
									{editingBiayaId === b.id ? (
										<div className="space-y-2">
											<div className="grid grid-cols-2 gap-2">
												<select
													value={editBiayaForm.kategori}
													onChange={(e) =>
														setEditBiayaForm({
															...editBiayaForm,
															kategori: e.target.value as ManifestBiayaKategori,
														})
													}
													className="px-2 py-1.5 border border-gray-200 rounded-lg text-sm">
													{(
														Object.keys(MANIFEST_BIAYA_KATEGORI_CFG) as ManifestBiayaKategori[]
													).map((k) => (
														<option key={k} value={k}>
															{MANIFEST_BIAYA_KATEGORI_CFG[k].label}
														</option>
													))}
												</select>
												<input
													type="number"
													value={editBiayaForm.jumlah}
													onChange={(e) =>
														setEditBiayaForm({ ...editBiayaForm, jumlah: e.target.value })
													}
													className="px-2 py-1.5 border border-gray-200 rounded-lg text-sm"
												/>
											</div>
											<input
												value={editBiayaForm.keterangan}
												onChange={(e) =>
													setEditBiayaForm({ ...editBiayaForm, keterangan: e.target.value })
												}
												placeholder="Keterangan"
												className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-sm"
											/>
											<div className="flex gap-2">
												<button
													onClick={simpanEditBiaya}
													className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-lg text-xs font-medium">
													Simpan
												</button>
												<button
													onClick={() => setEditingBiayaId(null)}
													className="flex-1 border border-gray-200 hover:bg-gray-100 px-3 py-1.5 rounded-lg text-xs font-medium">
													Batal
												</button>
											</div>
										</div>
									) : (
										<div className="flex items-center justify-between">
											<div className="min-w-0">
												<div className="flex items-center gap-2">
													<span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-semibold">
														{MANIFEST_BIAYA_KATEGORI_CFG[b.kategori as ManifestBiayaKategori]
															?.label || b.kategori}
													</span>
													<span className="text-sm font-bold text-gray-900">
														{formatRupiah(b.jumlah)}
													</span>
												</div>
												{b.keterangan && (
													<p className="text-xs text-gray-500 mt-1">{b.keterangan}</p>
												)}
												<p className="text-xs text-gray-400 mt-0.5">
													{b.creator?.name || "-"} · {formatDateOnly(b.created_at)}
													{b.foto_bukti && (
														<>
															{" · "}
															<a
																href={b.foto_bukti}
																target="_blank"
																rel="noopener noreferrer"
																className="text-indigo-600 hover:underline">
																Lihat Bukti
															</a>
														</>
													)}
												</p>
											</div>
											{canEditHapusBiaya && (
												<div className="flex items-center gap-1 flex-shrink-0">
													<button
														onClick={() => mulaiEditBiaya(b)}
														className="p-1.5 hover:bg-indigo-50 rounded-lg text-indigo-600 transition">
														<Edit3 size={13} />
													</button>
													<button
														onClick={() => hapusBiaya(b)}
														className="p-1.5 hover:bg-red-50 rounded-lg text-red-500 transition">
														<Trash2 size={13} />
													</button>
												</div>
											)}
										</div>
									)}
								</div>
							))}
							<div className="flex justify-between pt-2 border-t border-gray-100 text-sm">
								<span className="font-medium text-gray-600">Total Biaya</span>
								<span className="font-bold text-gray-900">
									{formatRupiah(biayaList.reduce((s, b) => s + Number(b.jumlah), 0))}
								</span>
							</div>
						</div>
					)}
				</div>
			</div>

			<ScanQRManifestOverlay
				open={scanOpen}
				manifestId={id}
				onClose={closeScan}
				onItemAdded={() => load()}
				onItemChecked={(pid) => setCheckedIds((prev) => new Set(prev).add(pid))}
			/>
		</div>
	);
}
