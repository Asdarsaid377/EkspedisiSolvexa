"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { formatRupiah } from "@/lib/utils";
import {
	AlertTriangle,
	CheckCircle2,
	Clock,
	ClipboardCheck,
	Package,
	MessageSquare,
	ShoppingBag,
	Users,
	FileText,
	ChevronDown,
	ChevronRight,
	Check,
	X,
	StickyNote,
	RefreshCw,
	Loader2,
	ExternalLink,
	TrendingUp,
	Calendar,
	Wallet,
	Gift,
} from "lucide-react";

// ── Types ──────────────────────────────────────────────────
interface AuditEntry {
	id: string;
	tipe: string;
	catatan: string | null;
	created_at: string;
}

interface Reminder {
	id: string;
	tipe: string;
	judul: string;
	status: string;
	due_date: string | null;
	periode: string | null;
	selesai_at: string | null;
	catatan: string | null;
	created_at: string;
}

// ── Helpers ────────────────────────────────────────────────
const daysSince = (dateStr: string | null): number | null => {
	if (!dateStr) return null;
	return Math.floor(
		(Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24),
	);
};

const labelHari = (days: number | null): string => {
	if (days === null) return "Belum pernah";
	if (days === 0) return "Hari ini";
	if (days === 1) return "Kemarin";
	return `${days} hari lalu`;
};

// ── Component ──────────────────────────────────────────────
export default function OwnerWorkspacePage() {
	const { isSuperAdmin, loading: authLoading, profile } = useAuth();
	const router = useRouter();
	const supabase = createClient();

	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState<string | null>(null);
	const [formError, setFormError] = useState("");

	// ── Data state ──
	const [lastAuditNota, setLastAuditNota] = useState<AuditEntry | null>(null);
	const [lastStockOpname, setLastStockOpname] = useState<AuditEntry | null>(
		null,
	);
	const [notaSelisih, setNotaSelisih] = useState<any[]>([]);
	const [notaBelumCount, setNotaBelumCount] = useState(0);
	const [produkTanpaModal, setProdukTanpaModal] = useState<any[]>([]);
	const [komplainOpen, setKomplainOpen] = useState<any[]>([]);
	const [poTerlambat, setPoTerlambat] = useState<any[]>([]);
	const [poInProses, setPoInProses] = useState<any[]>([]);
	const [poPending, setPoPending] = useState<any[]>([]);
	const [poSelesaiBulan, setPoSelesaiBulan] = useState(0);
	const [belumBayar, setBelumBayar] = useState<any[]>([]);
	const [penjualanTanpaBonus, setPenjualanTanpaBonus] = useState<any[]>([]);
	const [resellerBaru, setResellerBaru] = useState<any[]>([]);
	const [reminders, setReminders] = useState<Reminder[]>([]);
	const [statsNota, setStatsNota] = useState<any[]>([]);

	// ── UI state ──
	const [auditModal, setAuditModal] = useState<
		"audit_nota" | "stock_opname" | null
	>(null);
	const [auditCatatan, setAuditCatatan] = useState("");
	const [dInfoOpen, setDInfoOpen] = useState(false);
	const [dKinerjaOpen, setDKinerjaOpen] = useState(false);
	const [eCatatanOpen, setECatatanOpen] = useState(false);
	const [catatanBaru, setCatatanBaru] = useState("");
	const [eChecklistOpen, setEChecklistOpen] = useState(false);
	const [checklistChecked, setChecklistChecked] = useState<
		Record<string, boolean>
	>({});
	const [savingChecklist, setSavingChecklist] = useState<string | null>(null);
	const [fSettingsOpen, setFSettingsOpen] = useState(false);
	const [siklusAuditNota, setSiklusAuditNota] = useState(14);
	const [siklusStockOpname, setSiklusStockOpname] = useState(30);
	const [settingsInput, setSettingsInput] = useState({
		audit_nota: 14,
		stock_opname: 30,
	});
	const [savingSettings, setSavingSettings] = useState(false);

	useEffect(() => {
		if (authLoading) return;
		if (!isSuperAdmin) {
			router.replace("/dashboard");
			return;
		}
		load();
	}, [isSuperAdmin, authLoading]);

	if (authLoading || !isSuperAdmin) return null;

	const load = async () => {
		setLoading(true);
		const now = new Date();
		const todayStr = now.toISOString().split("T")[0];
		const bulanIni = new Date(
			now.getFullYear(),
			now.getMonth(),
			1,
		).toISOString();
		const sevenDaysAgo = new Date(
			now.getTime() - 7 * 24 * 60 * 60 * 1000,
		).toISOString();

		// 60 hari terakhir — untuk penjualan tanpa bonus
		const sixtyDaysAgo = new Date(
			now.getTime() - 30 * 24 * 60 * 60 * 1000,
		).toISOString();

		const [
			auditNotaRes,
			auditStockRes,
			notaSelisihRes,
			notaBelumRes,
			produkRes,
			komplainRes,
			poAktifRes,
			poSelesaiBulanRes,
			belumBayarRes,
			tanpaBonusRes,
			resellerRes,
			remindersRes,
			statsRes,
			settingsRes,
		] = await Promise.all([
			supabase
				.from("audit_log")
				.select("*")
				.eq("tipe", "audit_nota")
				.order("created_at", { ascending: false })
				.limit(1),
			supabase
				.from("audit_log")
				.select("*")
				.eq("tipe", "stock_opname")
				.order("created_at", { ascending: false })
				.limit(1),
			supabase
				.from("penjualan")
				.select(
					"id, nomor_faktur, total_harga_jual, catatan_pencocokan, tanggal, reseller:resellers(nama)",
				)
				.eq("status_pencocokan", "selisih")
				.order("created_at", { ascending: true }),
			supabase
				.from("penjualan")
				.select("*", { count: "exact", head: true })
				.eq("status_pencocokan", "belum_dicocokkan"),
			supabase
				.from("produk")
				.select("id, nama, kategori")
				.eq("harga_modal", 0)
				.eq("aktif", true)
				.order("nama"),
			supabase
				.from("reseller_reviews")
				.select(
					"id, isi, created_at, penjualan:penjualan(id, nomor_faktur, reseller:resellers(nama))",
				)
				.eq("tipe", "komplain")
				.eq("status", "open")
				.order("created_at", { ascending: true }),
			// Semua PO aktif (pending + proses) — digunakan untuk monitoring bridge PO→Produksi
			supabase
				.from("purchase_orders")
				.select(
					"id, nomor_po, tanggal_estimasi, status, pemohon_tipe, pemohon_nama, catatan, reseller:resellers(nama), items:purchase_order_items(id)",
				)
				.in("status", ["pending", "proses"])
				.order("tanggal_estimasi", { ascending: true, nullsFirst: false }),
			// PO selesai bulan ini
			supabase
				.from("purchase_orders")
				.select("*", { count: "exact", head: true })
				.eq("status", "selesai")
				.gte("updated_at", bulanIni),
			// Penjualan belum terbayar penuh
			supabase
				.from("penjualan")
				.select(
					"id, nomor_faktur, tanggal, total_harga_jual, uang_dp, status_bayar, reseller:resellers(nama), nama_customer",
				)
				.in("status_bayar", ["belum_bayar", "dp"])
				.order("tanggal", { ascending: true }),
			// Penjualan reseller 60 hari tanpa bonus (total_bonus=0 dan bonus_owner=0)
			supabase
				.from("penjualan")
				.select(
					"id, nomor_faktur, tanggal, total_harga_jual, milestone, reseller:resellers(nama)",
				)
				.not("reseller_id", "is", null)
				.eq("total_bonus", 0)
				.or("bonus_owner.is.null,bonus_owner.eq.0")
				.gte("tanggal", sixtyDaysAgo)
				.order("tanggal", { ascending: false })
				.limit(50),
			supabase
				.from("resellers")
				.select("id, nama, kota, created_at")
				.gte("created_at", sevenDaysAgo)
				.eq("aktif", true)
				.order("created_at", { ascending: false }),
			supabase
				.from("owner_reminders")
				.select("*")
				.order("created_at", { ascending: false }),
			supabase
				.from("penjualan")
				.select("total_harga_jual, status_pencocokan")
				.gte("created_at", bulanIni),
			supabase.from("owner_settings").select("key, value"),
		]);

		setLastAuditNota(auditNotaRes.data?.[0] ?? null);
		setLastStockOpname(auditStockRes.data?.[0] ?? null);
		setNotaSelisih(notaSelisihRes.data || []);
		setNotaBelumCount(notaBelumRes.count || 0);
		setProdukTanpaModal(produkRes.data || []);
		setKomplainOpen(komplainRes.data || []);
		const allAktif = poAktifRes.data || [];
		setPoTerlambat(
			allAktif.filter(
				(po) => po.tanggal_estimasi && po.tanggal_estimasi < todayStr,
			),
		);
		setPoInProses(allAktif.filter((po) => po.status === "proses"));
		setPoPending(allAktif.filter((po) => po.status === "pending"));
		setPoSelesaiBulan(poSelesaiBulanRes.count || 0);
		setBelumBayar(belumBayarRes.data || []);
		setPenjualanTanpaBonus(tanpaBonusRes.data || []);
		setResellerBaru(resellerRes.data || []);
		setReminders(remindersRes.data || []);
		setStatsNota(statsRes.data || []);

		// Load settings siklus
		const settingsMap: Record<string, string> = {};
		(settingsRes.data || []).forEach((s: any) => {
			settingsMap[s.key] = s.value;
		});
		const auditHari = parseInt(
			settingsMap["siklus_audit_nota_hari"] ?? "14",
			10,
		);
		const opnameHari = parseInt(
			settingsMap["siklus_stock_opname_hari"] ?? "30",
			10,
		);
		setSiklusAuditNota(auditHari);
		setSiklusStockOpname(opnameHari);
		setSettingsInput({ audit_nota: auditHari, stock_opname: opnameHari });

		// ── Langkah 5: Auto-insert & auto-expire reminders ──
		if (profile) {
			const existingReminders: Reminder[] = remindersRes.data || [];
			const lastNota = auditNotaRes.data?.[0] ?? null;
			const lastStock = auditStockRes.data?.[0] ?? null;

			const SIKLUS: Array<{
				tipe: "audit_nota" | "stock_opname";
				last: AuditEntry | null;
				threshold: number;
				judul: string;
			}> = [
				{
					tipe: "audit_nota",
					last: lastNota,
					threshold: auditHari,
					judul: `Audit Nota — siklus ${auditHari} hari terlewat`,
				},
				{
					tipe: "stock_opname",
					last: lastStock,
					threshold: opnameHari,
					judul: `Stock Opname — siklus ${opnameHari} hari terlewat`,
				},
			];

			const ops: PromiseLike<any>[] = [];

			for (const siklus of SIKLUS) {
				const days = daysSince(siklus.last?.created_at ?? null);
				const overdue = days === null || days >= siklus.threshold;
				const lastAuditDate = siklus.last?.created_at ?? null;

				// Hanya insert SATU reminder per siklus (sejak audit terakhir)
				// agar tidak bising tiap hari buka halaman
				const hasSinceLastAudit = existingReminders.some(
					(r) =>
						r.tipe === siklus.tipe &&
						(r.status === "pending" || r.status === "terlewat") &&
						(!lastAuditDate || r.created_at > lastAuditDate),
				);

				if (overdue && !hasSinceLastAudit) {
					ops.push(
						supabase.from("owner_reminders").insert({
							tipe: siklus.tipe,
							judul: siklus.judul,
							due_date: todayStr,
							status: "pending",
							created_by: profile.id,
						}),
					);
				}
			}

			// Tandai terlewat: pending reminders yang due_date-nya sudah lewat hari ini
			// (reminder ini sudah dibuat di hari sebelumnya dan belum diselesaikan)
			for (const r of existingReminders) {
				if (r.status === "pending" && r.due_date && r.due_date < todayStr) {
					ops.push(
						supabase
							.from("owner_reminders")
							.update({ status: "terlewat" })
							.eq("id", r.id),
					);
				}
			}

			if (ops.length > 0) {
				await Promise.all(ops);
				// Reload reminders agar tampilan sinkron
				const fresh = await supabase
					.from("owner_reminders")
					.select("*")
					.order("created_at", { ascending: false });
				setReminders(fresh.data || []);
			}
		}

		setLoading(false);
	};

	// ── Computed values ──
	const todayStr = new Date().toISOString().split("T")[0];
	const PRIORITAS_ORDER: Record<string, number> = {
		urgent: 0,
		tinggi: 1,
		normal: 2,
		rendah: 3,
	};
	const PRIORITAS_BADGE: Record<
		string,
		{ label: string; color: string; dot: string }
	> = {
		rendah: {
			label: "Rendah",
			color: "bg-gray-100 text-gray-500",
			dot: "bg-gray-400",
		},
		normal: {
			label: "Normal",
			color: "bg-blue-100 text-blue-600",
			dot: "bg-blue-500",
		},
		tinggi: {
			label: "Tinggi",
			color: "bg-amber-100 text-amber-700",
			dot: "bg-amber-500",
		},
		urgent: {
			label: "Urgent",
			color: "bg-red-100 text-red-600",
			dot: "bg-red-500",
		},
	};
	const daysAuditNota = daysSince(lastAuditNota?.created_at ?? null);
	const daysStockOpname = daysSince(lastStockOpname?.created_at ?? null);
	const auditNotaTerlambat =
		daysAuditNota === null || daysAuditNota >= siklusAuditNota;
	const stockOpnameTerlambat =
		daysStockOpname === null || daysStockOpname >= siklusStockOpname;

	const totalKritis =
		(auditNotaTerlambat ? 1 : 0) +
		(stockOpnameTerlambat ? 1 : 0) +
		notaSelisih.length;

	const totalPerluPerhatian =
		(notaBelumCount > 0 ? 1 : 0) +
		(produkTanpaModal.length > 0 ? 1 : 0) +
		(komplainOpen.length > 0 ? 1 : 0) +
		(poTerlambat.length > 0 ? 1 : 0);

	const totalPending = totalKritis + totalPerluPerhatian;

	// ── Actions ──
	const tandaiAuditSelesai = async () => {
		if (!profile || !auditModal) return;
		setSaving("audit");
		setFormError("");
		const { error } = await supabase.from("audit_log").insert({
			tipe: auditModal,
			catatan: auditCatatan.trim() || null,
			created_by: profile.id,
		});
		if (error) {
			setFormError("Gagal menyimpan: " + error.message);
			setSaving(null);
			return;
		}
		await supabase
			.from("owner_reminders")
			.update({ status: "selesai", selesai_at: new Date().toISOString() })
			.eq("tipe", auditModal)
			.eq("status", "pending");
		setSaving(null);
		setAuditModal(null);
		setAuditCatatan("");
		load();
	};

	const tambahCatatanKebijakan = async () => {
		if (!profile || !catatanBaru.trim()) return;
		setSaving("catatan");
		await supabase.from("owner_reminders").insert({
			tipe: "catatan_kebijakan",
			judul: catatanBaru.trim(),
			status: "selesai",
			created_by: profile.id,
		});
		setSaving(null);
		setCatatanBaru("");
		load();
	};

	const hapusCatatanKebijakan = async (id: string) => {
		await supabase.from("owner_reminders").delete().eq("id", id);
		load();
	};

	const saveSettings = async () => {
		if (!profile) return;
		const auditVal = Math.max(1, Math.min(365, settingsInput.audit_nota));
		const opnameVal = Math.max(1, Math.min(365, settingsInput.stock_opname));
		setSavingSettings(true);
		await Promise.all([
			supabase.from("owner_settings").upsert(
				{
					key: "siklus_audit_nota_hari",
					value: String(auditVal),
					updated_by: profile.id,
					updated_at: new Date().toISOString(),
				},
				{ onConflict: "key" },
			),
			supabase.from("owner_settings").upsert(
				{
					key: "siklus_stock_opname_hari",
					value: String(opnameVal),
					updated_by: profile.id,
					updated_at: new Date().toISOString(),
				},
				{ onConflict: "key" },
			),
		]);
		setSiklusAuditNota(auditVal);
		setSiklusStockOpname(opnameVal);
		setSavingSettings(false);
	};

	const CHECKLIST_BULANAN = [
		"Rekap laporan penjualan bulan lalu",
		"Verifikasi stok opname fisik vs sistem",
		"Cek bonus reseller yang belum dibayar",
		"Review nota selisih & pencocokan tertunda",
		"Update target penjualan bulan berjalan",
		"Cek PO yang terlambat diselesaikan",
		"Review komplain/kritik yang belum di-resolve",
	];

	const toggleChecklist = async (item: string) => {
		if (!profile) return;
		const key = item;
		const prev = checklistChecked[key] ?? false;
		setSavingChecklist(key);
		setChecklistChecked((p) => ({ ...p, [key]: !prev }));
		setSavingChecklist(null);
	};

	if (loading) {
		return (
			<div className="flex items-center justify-center min-h-[60vh]">
				<Loader2 size={24} className="animate-spin text-gray-400" />
			</div>
		);
	}

	return (
		<div className="max-w-4xl mx-auto space-y-5 pb-10">
			{/* ══════════════════════════════════════
			    BAGIAN A — Header & Status Bar
			══════════════════════════════════════ */}
			<div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
				<div className="flex items-start justify-between gap-4">
					<div>
						<div className="flex items-center gap-3 flex-wrap">
							<h1 className="text-2xl font-bold text-gray-900">
								Workspace Owner
							</h1>
							{totalPending > 0 ? (
								<span className="bg-red-500 text-white text-xs font-bold px-2.5 py-1 rounded-full">
									{totalPending} tugas pending
								</span>
							) : (
								<span className="bg-green-100 text-green-700 text-xs font-semibold px-2.5 py-1 rounded-full flex items-center gap-1">
									<CheckCircle2 size={11} /> Semua beres
								</span>
							)}
						</div>
						<p className="text-sm text-gray-500 mt-1">
							{new Date().toLocaleDateString("id-ID", {
								weekday: "long",
								day: "numeric",
								month: "long",
								year: "numeric",
							})}
						</p>
					</div>
					<button
						onClick={load}
						className="p-2 hover:bg-gray-100 rounded-xl text-gray-400 hover:text-gray-600 transition"
						title="Refresh data">
						<RefreshCw size={16} />
					</button>
				</div>

				{/* Riwayat reminder terlewat — tampil jika ada */}
				{(() => {
					const terlewat = reminders.filter(
						(r) =>
							(r.tipe === "audit_nota" || r.tipe === "stock_opname") &&
							r.status === "terlewat",
					);
					if (terlewat.length === 0) return null;
					return (
						<div className="mt-3 flex items-center gap-2 text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-xl px-4 py-2">
							<AlertTriangle size={12} />
							<span>
								<strong>{terlewat.length} siklus audit pernah terlewat</strong>{" "}
								tanpa ditindaklanjuti — periksa riwayat dan tingkatkan
								kedisiplinan pengecekan.
							</span>
						</div>
					);
				})()}

				{/* Status siklus berkala */}
				<div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
					<div
						className={`flex items-center gap-3 px-4 py-3 rounded-xl border ${
							auditNotaTerlambat
								? "bg-red-50 border-red-200"
								: "bg-green-50 border-green-200"
						}`}>
						<ClipboardCheck
							size={16}
							className={auditNotaTerlambat ? "text-red-500" : "text-green-500"}
						/>
						<div>
							<p className="text-xs font-medium text-gray-500">
								Audit Nota Terakhir
							</p>
							<p
								className={`text-sm font-bold ${auditNotaTerlambat ? "text-red-700" : "text-green-700"}`}>
								{labelHari(daysAuditNota)}
								{auditNotaTerlambat && daysAuditNota !== null && (
									<span className="text-xs font-normal ml-1 text-red-500">
										(terlambat, siklus 14 hari)
									</span>
								)}
								{daysAuditNota === null && (
									<span className="text-xs font-normal ml-1 text-red-500">
										(belum pernah dilakukan)
									</span>
								)}
							</p>
						</div>
					</div>
					<div
						className={`flex items-center gap-3 px-4 py-3 rounded-xl border ${
							stockOpnameTerlambat
								? "bg-red-50 border-red-200"
								: "bg-green-50 border-green-200"
						}`}>
						<Package
							size={16}
							className={
								stockOpnameTerlambat ? "text-red-500" : "text-green-500"
							}
						/>
						<div>
							<p className="text-xs font-medium text-gray-500">
								Stock Opname Terakhir
							</p>
							<p
								className={`text-sm font-bold ${stockOpnameTerlambat ? "text-red-700" : "text-green-700"}`}>
								{labelHari(daysStockOpname)}
								{stockOpnameTerlambat && daysStockOpname !== null && (
									<span className="text-xs font-normal ml-1 text-red-500">
										(terlambat, siklus 30 hari)
									</span>
								)}
								{daysStockOpname === null && (
									<span className="text-xs font-normal ml-1 text-red-500">
										(belum pernah dilakukan)
									</span>
								)}
							</p>
						</div>
					</div>
				</div>
			</div>

			{/* ══════════════════════════════════════
			    BAGIAN B1 — Audit Berkala Terlambat
			══════════════════════════════════════ */}
			{(auditNotaTerlambat || stockOpnameTerlambat) && (
				<div className="space-y-3">
					{auditNotaTerlambat && (
						<div className="bg-red-50 border border-red-200 rounded-2xl p-5 flex items-start justify-between gap-4">
							<div className="flex items-start gap-3">
								<div className="w-9 h-9 bg-red-100 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5">
									<ClipboardCheck size={17} className="text-red-600" />
								</div>
								<div>
									<p className="font-semibold text-red-800 text-sm">
										Audit Nota Acak Terlambat
									</p>
									<p className="text-xs text-red-600 mt-0.5">
										{daysAuditNota === null
											? "Belum pernah dilakukan sejak sistem digunakan"
											: `Sudah ${daysAuditNota} hari — siklus wajib setiap ${siklusAuditNota} hari`}
									</p>
									{lastAuditNota && (
										<p className="text-xs text-red-400 mt-1">
											Terakhir:{" "}
											{new Date(lastAuditNota.created_at).toLocaleDateString(
												"id-ID",
												{ day: "numeric", month: "long", year: "numeric" },
											)}
											{lastAuditNota.catatan && ` — ${lastAuditNota.catatan}`}
										</p>
									)}
								</div>
							</div>
							<button
								onClick={() => {
									setAuditModal("audit_nota");
									setAuditCatatan("");
									setFormError("");
								}}
								className="flex-shrink-0 flex items-center gap-1.5 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-semibold transition">
								<Check size={13} /> Tandai Selesai
							</button>
						</div>
					)}

					{stockOpnameTerlambat && (
						<div className="bg-red-50 border border-red-200 rounded-2xl p-5 flex items-start justify-between gap-4">
							<div className="flex items-start gap-3">
								<div className="w-9 h-9 bg-red-100 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5">
									<Package size={17} className="text-red-600" />
								</div>
								<div>
									<p className="font-semibold text-red-800 text-sm">
										Stock Opname Fisik Terlambat
									</p>
									<p className="text-xs text-red-600 mt-0.5">
										{daysStockOpname === null
											? "Belum pernah dilakukan sejak sistem digunakan"
											: `Sudah ${daysStockOpname} hari — siklus wajib setiap ${siklusStockOpname} hari`}
									</p>
									{lastStockOpname && (
										<p className="text-xs text-red-400 mt-1">
											Terakhir:{" "}
											{new Date(lastStockOpname.created_at).toLocaleDateString(
												"id-ID",
												{ day: "numeric", month: "long", year: "numeric" },
											)}
											{lastStockOpname.catatan &&
												` — ${lastStockOpname.catatan}`}
										</p>
									)}
								</div>
							</div>
							<button
								onClick={() => {
									setAuditModal("stock_opname");
									setAuditCatatan("");
									setFormError("");
								}}
								className="flex-shrink-0 flex items-center gap-1.5 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-semibold transition">
								<Check size={13} /> Tandai Selesai
							</button>
						</div>
					)}
				</div>
			)}

			{/* ══════════════════════════════════════
			    BAGIAN B2 — Nota Berselisih
			══════════════════════════════════════ */}
			{notaSelisih.length > 0 && (
				<div className="bg-white rounded-2xl border border-red-200 shadow-sm overflow-hidden">
					<div className="flex items-center gap-3 px-6 py-4 bg-red-50 border-b border-red-200">
						<AlertTriangle size={16} className="text-red-600 flex-shrink-0" />
						<div className="flex-1">
							<p className="font-semibold text-red-800 text-sm">
								{notaSelisih.length} Nota Berselisih — Perlu Ditindaklanjuti
							</p>
							<p className="text-xs text-red-500 mt-0.5">
								Nota ini sudah ditandai selisih saat pencocokan. Selidiki dan
								ubah statusnya dari halaman pencocokan.
							</p>
						</div>
						<Link
							href="/dashboard/pencocokan"
							className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-semibold transition">
							Buka Pencocokan <ExternalLink size={11} />
						</Link>
					</div>
					<div className="divide-y divide-gray-50">
						{notaSelisih.map((nota) => (
							<div
								key={nota.id}
								className="flex items-start justify-between gap-4 px-6 py-4 hover:bg-red-50/30 transition">
								<div className="flex items-start gap-3 min-w-0">
									<div className="w-1.5 h-1.5 bg-red-500 rounded-full mt-2 flex-shrink-0" />
									<div className="min-w-0">
										<div className="flex items-center gap-2 flex-wrap">
											<span className="font-mono text-sm font-semibold text-gray-900">
												{nota.nomor_faktur}
											</span>
											<span className="text-xs text-gray-400">
												{new Date(nota.tanggal).toLocaleDateString("id-ID", {
													day: "numeric",
													month: "short",
													year: "numeric",
												})}
											</span>
											<span className="text-xs text-gray-500">
												{nota.reseller?.nama || "Umum"}
											</span>
										</div>
										<p className="text-sm font-semibold text-gray-700 mt-0.5">
											{formatRupiah(nota.total_harga_jual)}
										</p>
										{nota.catatan_pencocokan && (
											<p className="text-xs text-red-600 mt-1 flex items-start gap-1">
												<AlertTriangle
													size={11}
													className="flex-shrink-0 mt-0.5"
												/>
												{nota.catatan_pencocokan}
											</p>
										)}
									</div>
								</div>
								<Link
									href={`/dashboard/penjualan/${nota.id}`}
									className="flex-shrink-0 flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 font-medium transition">
									Detail <ExternalLink size={11} />
								</Link>
							</div>
						))}
					</div>
				</div>
			)}

			{/* ══════════════════════════════════════
			    BAGIAN C1 — Nota Belum Dicocokkan
			══════════════════════════════════════ */}
			{notaBelumCount > 0 && (
				<div className="bg-white rounded-2xl border border-amber-200 shadow-sm p-5 flex items-center justify-between gap-4">
					<div className="flex items-center gap-4">
						<div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center flex-shrink-0">
							<Clock size={20} className="text-amber-600" />
						</div>
						<div>
							<p className="font-semibold text-gray-900">
								{notaBelumCount} Nota Belum Dicocokkan
							</p>
							<p className="text-xs text-gray-500 mt-0.5">
								Cocokkan dengan surat jalan fisik & mutasi rekening pribadi
							</p>
						</div>
					</div>
					<Link
						href="/dashboard/pencocokan"
						className="flex-shrink-0 flex items-center gap-1.5 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-sm font-semibold transition">
						Buka Pencocokan <ExternalLink size={13} />
					</Link>
				</div>
			)}

			{/* ══════════════════════════════════════
			    BAGIAN C2 — Tagihan Belum Terbayar
			══════════════════════════════════════ */}
			{belumBayar.length > 0 &&
				(() => {
					const totalSisa = belumBayar.reduce(
						(s, p) => s + ((p.total_harga_jual || 0) - (p.uang_dp || 0)),
						0,
					);
					const countDp = belumBayar.filter(
						(p) => p.status_bayar === "dp",
					).length;
					const countBelum = belumBayar.filter(
						(p) => p.status_bayar === "belum_bayar",
					).length;
					return (
						<div className="bg-white rounded-2xl border border-red-200 shadow-sm overflow-hidden">
							{/* Header */}
							<div className="flex items-center justify-between px-6 py-4 border-b border-red-100">
								<div className="flex items-center gap-2.5">
									<Wallet size={15} className="text-red-500" />
									<p className="font-semibold text-gray-900 text-sm">
										{belumBayar.length} Transaksi Belum Lunas
									</p>
								</div>
								<Link
									href="/dashboard/penjualan"
									className="text-xs text-indigo-600 hover:text-indigo-800 font-medium flex items-center gap-1 transition">
									Buka Penjualan <ExternalLink size={11} />
								</Link>
							</div>

							{/* Summary */}
							<div className="flex items-center gap-3 px-6 py-3 bg-red-50 border-b border-red-100 flex-wrap">
								{countBelum > 0 && (
									<span className="flex items-center gap-1.5 text-xs font-semibold text-red-700 bg-red-100 px-3 py-1 rounded-full">
										<span className="w-2 h-2 bg-red-500 rounded-full" />
										{countBelum} Belum Bayar
									</span>
								)}
								{countDp > 0 && (
									<span className="flex items-center gap-1.5 text-xs font-semibold text-amber-700 bg-amber-100 px-3 py-1 rounded-full">
										<span className="w-2 h-2 bg-amber-500 rounded-full" />
										{countDp} Baru DP
									</span>
								)}
								<span className="ml-auto text-xs font-bold text-red-700">
									Total sisa: {formatRupiah(totalSisa)}
								</span>
							</div>

							{/* List */}
							<div className="divide-y divide-gray-50 max-h-64 overflow-y-auto">
								{belumBayar.map((p) => {
									const sisa = (p.total_harga_jual || 0) - (p.uang_dp || 0);
									const dp = p.status_bayar === "dp";
									const hariLalu = daysSince(p.tanggal);
									return (
										<div
											key={p.id}
											className="flex items-center justify-between gap-3 px-6 py-3">
											<div className="flex items-center gap-2.5 min-w-0">
												<div
													className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${dp ? "bg-amber-400" : "bg-red-400"}`}
												/>
												<div className="min-w-0">
													<Link
														href={`/dashboard/penjualan/${p.id}`}
														className="font-mono text-sm font-semibold text-indigo-600 hover:underline">
														{p.nomor_faktur}
													</Link>
													<span className="text-xs text-gray-500 ml-2">
														{p.reseller?.nama || p.nama_customer || "Umum"}
													</span>
												</div>
											</div>
											<div className="flex items-center gap-3 flex-shrink-0 text-right">
												<div>
													<p className="text-sm font-semibold text-red-700">
														{formatRupiah(sisa)}
													</p>
													<p className="text-xs text-gray-400">
														{hariLalu === 0
															? "Hari ini"
															: hariLalu === 1
																? "Kemarin"
																: `${hariLalu} hari lalu`}
													</p>
												</div>
												<span
													className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${
														dp
															? "bg-amber-100 text-amber-700"
															: "bg-red-100 text-red-700"
													}`}>
													{dp ? "DP" : "Belum Bayar"}
												</span>
											</div>
										</div>
									);
								})}
							</div>
						</div>
					);
				})()}

			{/* ══════════════════════════════════════
			    BAGIAN C2b — Penjualan Reseller Tanpa Bonus
			══════════════════════════════════════ */}
			{penjualanTanpaBonus.length > 0 && (
				<div className="bg-white rounded-2xl border border-amber-200 shadow-sm overflow-hidden">
					<div className="flex items-center justify-between px-6 py-4 border-b border-amber-100">
						<div className="flex items-center gap-2.5">
							<Gift size={15} className="text-amber-500" />
							<p className="font-semibold text-gray-900 text-sm">
								{penjualanTanpaBonus.length} Penjualan Reseller Belum Ada Bonus
							</p>
						</div>
						<Link
							href="/dashboard/penjualan"
							className="text-xs text-indigo-600 hover:text-indigo-800 font-medium flex items-center gap-1 transition">
							Kelola Bonus <ExternalLink size={11} />
						</Link>
					</div>

					<div className="px-6 py-2.5 bg-amber-50 border-b border-amber-100">
						<p className="text-xs text-amber-700">
							Transaksi reseller 30 hari terakhir yang belum memiliki bonus
							(auto maupun manual). Klik <strong>Kelola Bonus</strong> lalu klik
							ikon <Gift size={11} className="inline mx-0.5" /> pada baris
							faktur untuk mengisi bonus.
						</p>
					</div>

					<div className="divide-y divide-gray-50 max-h-72 overflow-y-auto">
						{penjualanTanpaBonus.map((p) => {
							const hariLalu = daysSince(p.tanggal);
							const MILESTONE_COLOR: Record<string, string> = {
								diproses: "bg-gray-100 text-gray-500",
								diproduksi: "bg-blue-50 text-blue-600",
								dikirim: "bg-amber-50 text-amber-600",
								selesai: "bg-green-50 text-green-600",
							};
							const MILESTONE_LABEL: Record<string, string> = {
								diproses: "Diproses",
								diproduksi: "Diproduksi",
								dikirim: "Dikirim",
								selesai: "Selesai",
							};
							return (
								<div
									key={p.id}
									className="flex items-center justify-between gap-3 px-6 py-3">
									<div className="flex items-center gap-2.5 min-w-0">
										<div className="w-1.5 h-1.5 rounded-full bg-amber-400 flex-shrink-0" />
										<div className="min-w-0">
											<Link
												href={`/dashboard/penjualan/${p.id}`}
												className="font-mono text-sm font-semibold text-indigo-600 hover:underline">
												{p.nomor_faktur}
											</Link>
											<span className="text-xs text-gray-500 ml-2">
												{p.reseller?.nama || "—"}
											</span>
										</div>
									</div>
									<div className="flex items-center gap-2 flex-shrink-0">
										<span
											className={`text-xs px-2 py-0.5 rounded-full font-medium ${MILESTONE_COLOR[p.milestone] ?? MILESTONE_COLOR.diproses}`}>
											{MILESTONE_LABEL[p.milestone] ?? p.milestone}
										</span>
										<div className="text-right">
											<p className="text-sm font-semibold text-gray-700">
												{formatRupiah(p.total_harga_jual || 0)}
											</p>
											<p className="text-xs text-gray-400">
												{hariLalu === 0
													? "Hari ini"
													: hariLalu === 1
														? "Kemarin"
														: `${hariLalu} hari lalu`}
											</p>
										</div>
									</div>
								</div>
							);
						})}
					</div>

					{penjualanTanpaBonus.length >= 50 && (
						<div className="px-6 py-2 border-t border-amber-100 text-center">
							<span className="text-xs text-amber-600">
								Menampilkan 50 terakhir — buka halaman Penjualan untuk lihat
								semua
							</span>
						</div>
					)}
				</div>
			)}

			{/* ══════════════════════════════════════
			    BAGIAN C3 — Produk Tanpa Harga Modal (lama → C3)
			══════════════════════════════════════ */}
			{produkTanpaModal.length > 0 && (
				<div className="bg-white rounded-2xl border border-amber-200 shadow-sm overflow-hidden">
					<div className="flex items-center justify-between px-6 py-4 border-b border-amber-100">
						<div className="flex items-center gap-2.5">
							<Package size={15} className="text-amber-600" />
							<p className="font-semibold text-gray-900 text-sm">
								{produkTanpaModal.length} Produk Belum Ada Harga Modal
							</p>
						</div>
						<Link
							href="/dashboard/produk"
							className="text-xs text-indigo-600 hover:text-indigo-800 font-medium flex items-center gap-1 transition">
							Kelola Produk <ExternalLink size={11} />
						</Link>
					</div>
					<div className="divide-y divide-gray-50 max-h-48 overflow-y-auto">
						{produkTanpaModal.map((p) => (
							<div key={p.id} className="flex items-center gap-3 px-6 py-3">
								<div className="w-1.5 h-1.5 bg-amber-400 rounded-full flex-shrink-0" />
								<span className="text-sm text-gray-800 font-medium">
									{p.nama}
								</span>
								{p.kategori && (
									<span className="text-xs text-gray-400">{p.kategori}</span>
								)}
							</div>
						))}
					</div>
					<div className="px-6 py-3 bg-amber-50 border-t border-amber-100">
						<p className="text-xs text-amber-700">
							Harga modal = 0 berarti laporan laba tidak akurat. Isi segera via
							halaman Produk (superadmin only).
						</p>
					</div>
				</div>
			)}

			{/* ══════════════════════════════════════
			    BAGIAN C4 — Komplain Belum Diresolve
			══════════════════════════════════════ */}
			{komplainOpen.length > 0 && (
				<div className="bg-white rounded-2xl border border-orange-200 shadow-sm overflow-hidden">
					<div className="flex items-center justify-between px-6 py-4 border-b border-orange-100">
						<div className="flex items-center gap-2.5">
							<MessageSquare size={15} className="text-orange-500" />
							<p className="font-semibold text-gray-900 text-sm">
								{komplainOpen.length} Komplain Belum Diresolve
							</p>
						</div>
						<Link
							href="/dashboard/laporan/review"
							className="text-xs text-indigo-600 hover:text-indigo-800 font-medium flex items-center gap-1 transition">
							Lihat Semua <ExternalLink size={11} />
						</Link>
					</div>
					<div className="divide-y divide-gray-50 max-h-52 overflow-y-auto">
						{komplainOpen.map((r) => (
							<div
								key={r.id}
								className="flex items-start justify-between gap-3 px-6 py-3">
								<div className="flex items-start gap-2.5 min-w-0">
									<div className="w-1.5 h-1.5 bg-orange-400 rounded-full mt-1.5 flex-shrink-0" />
									<div className="min-w-0">
										<p className="text-sm text-gray-800 line-clamp-2">
											{r.isi}
										</p>
										<p className="text-xs text-gray-400 mt-0.5">
											{r.penjualan?.reseller?.nama || "Umum"} ·{" "}
											{new Date(r.created_at).toLocaleDateString("id-ID", {
												day: "numeric",
												month: "short",
											})}
										</p>
									</div>
								</div>
								{r.penjualan?.id && (
									<Link
										href={`/dashboard/penjualan/${r.penjualan.id}`}
										className="flex-shrink-0 text-xs text-indigo-600 hover:text-indigo-800 font-medium font-mono transition">
										{r.penjualan.nomor_faktur}
									</Link>
								)}
							</div>
						))}
					</div>
				</div>
			)}

			{/* ══════════════════════════════════════
			    BAGIAN C5 — Monitoring PO → Produksi
			══════════════════════════════════════ */}
			<div className="bg-white rounded-2xl border border-orange-200 shadow-sm overflow-hidden">
				{/* Header */}
				<div className="flex items-center justify-between px-6 py-4 border-b border-orange-100">
					<div className="flex items-center gap-2.5">
						<ShoppingBag size={15} className="text-orange-500" />
						<p className="font-semibold text-gray-900 text-sm">
							Monitoring PO → Produksi
						</p>
					</div>
					<Link
						href="/dashboard/po"
						className="text-xs text-indigo-600 hover:text-indigo-800 font-medium flex items-center gap-1 transition">
						Buka PO <ExternalLink size={11} />
					</Link>
				</div>

				{/* Summary pill row */}
				<div className="flex items-center gap-3 px-6 py-3 bg-orange-50 border-b border-orange-100 flex-wrap">
					<span className="flex items-center gap-1.5 text-xs font-semibold text-gray-600 bg-gray-100 px-3 py-1 rounded-full">
						<span className="w-2 h-2 bg-gray-400 rounded-full" />
						{poPending.length} Pending
					</span>
					<span className="flex items-center gap-1.5 text-xs font-semibold text-blue-700 bg-blue-100 px-3 py-1 rounded-full">
						<span className="w-2 h-2 bg-blue-500 rounded-full" />
						{poInProses.length} In-Proses
					</span>
					{poTerlambat.length > 0 && (
						<span className="flex items-center gap-1.5 text-xs font-semibold text-orange-700 bg-orange-100 px-3 py-1 rounded-full">
							<AlertTriangle size={10} />
							{poTerlambat.length} Terlambat
						</span>
					)}
					<span className="flex items-center gap-1.5 text-xs font-semibold text-green-700 bg-green-100 px-3 py-1 rounded-full">
						<CheckCircle2 size={10} />
						{poSelesaiBulan} Selesai bulan ini
					</span>
				</div>

				{/* PO In-Proses — sedang dikerjakan produksi */}
				{poInProses.length > 0 && (
					<div>
						<p className="px-6 pt-3 pb-1 text-xs font-semibold text-blue-600 uppercase tracking-wider">
							Sedang Dikerjakan Produksi
						</p>
						<div className="divide-y divide-gray-50">
							{[...poInProses]
								.sort(
									(a, b) =>
										(PRIORITAS_ORDER[a.prioritas ?? "normal"] ?? 2) -
										(PRIORITAS_ORDER[b.prioritas ?? "normal"] ?? 2),
								)
								.map((po) => {
									const terlambat =
										po.tanggal_estimasi && po.tanggal_estimasi < todayStr;
									const hariSisa = po.tanggal_estimasi
										? Math.ceil(
												(new Date(po.tanggal_estimasi).getTime() - Date.now()) /
													86400000,
											)
										: null;
									return (
										<div
											key={po.id}
											className="flex items-center justify-between gap-3 px-6 py-3">
											<div className="flex items-center gap-2.5 min-w-0">
												<div
													className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${terlambat ? "bg-orange-400" : "bg-blue-400"}`}
												/>
												<div className="min-w-0">
													<span className="font-mono text-sm font-semibold text-gray-800">
														{po.nomor_po}
													</span>
													<span className="text-xs text-gray-500 ml-2">
														{po.reseller?.nama || po.pemohon_nama || "Umum"}
													</span>
													{po.items?.length > 0 && (
														<span className="text-xs text-gray-400 ml-1.5">
															({po.items.length} item)
														</span>
													)}
												</div>
											</div>
											<div className="flex items-center gap-2 flex-shrink-0">
												{(() => {
													const pb = PRIORITAS_BADGE[po.prioritas ?? "normal"];
													return (
														<span
															className={`text-xs font-semibold px-2 py-0.5 rounded-full flex items-center gap-1 ${pb.color}`}>
															<span
																className={`w-1.5 h-1.5 rounded-full ${pb.dot}`}
															/>
															{pb.label}
														</span>
													);
												})()}
												{po.tanggal_estimasi ? (
													terlambat ? (
														<span className="text-xs font-semibold text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full">
															+{daysSince(po.tanggal_estimasi)} hari terlambat
														</span>
													) : (
														<span className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
															{hariSisa === 0
																? "Jatuh tempo hari ini"
																: `${hariSisa} hari lagi`}
														</span>
													)
												) : (
													<span className="text-xs text-gray-400">
														Tanpa estimasi
													</span>
												)}
											</div>
										</div>
									);
								})}
						</div>
					</div>
				)}

				{/* PO Pending — menunggu diproses */}
				{poPending.length > 0 && (
					<div
						className={poInProses.length > 0 ? "border-t border-gray-100" : ""}>
						<p className="px-6 pt-3 pb-1 text-xs font-semibold text-gray-500 uppercase tracking-wider">
							Menunggu Diproses
						</p>
						<div className="divide-y divide-gray-50">
							{[...poPending]
								.sort(
									(a, b) =>
										(PRIORITAS_ORDER[a.prioritas ?? "normal"] ?? 2) -
										(PRIORITAS_ORDER[b.prioritas ?? "normal"] ?? 2),
								)
								.map((po) => {
									const terlambat =
										po.tanggal_estimasi && po.tanggal_estimasi < todayStr;
									return (
										<div
											key={po.id}
											className="flex items-center justify-between gap-3 px-6 py-3">
											<div className="flex items-center gap-2.5 min-w-0">
												<div
													className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${terlambat ? "bg-orange-400" : "bg-gray-400"}`}
												/>
												<div className="min-w-0">
													<span className="font-mono text-sm font-semibold text-gray-800">
														{po.nomor_po}
													</span>
													<span className="text-xs text-gray-500 ml-2">
														{po.reseller?.nama || po.pemohon_nama || "Umum"}
													</span>
												</div>
											</div>
											<div className="flex items-center gap-2 flex-shrink-0">
												{(() => {
													const pb = PRIORITAS_BADGE[po.prioritas ?? "normal"];
													return (
														<span
															className={`text-xs font-semibold px-2 py-0.5 rounded-full flex items-center gap-1 ${pb.color}`}>
															<span
																className={`w-1.5 h-1.5 rounded-full ${pb.dot}`}
															/>
															{pb.label}
														</span>
													);
												})()}
												{terlambat ? (
													<span className="text-xs font-semibold text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full">
														<AlertTriangle size={9} className="inline mr-0.5" />
														+{daysSince(po.tanggal_estimasi)} hari
													</span>
												) : po.tanggal_estimasi ? (
													<span className="text-xs text-gray-400">
														Est.{" "}
														{new Date(po.tanggal_estimasi).toLocaleDateString(
															"id-ID",
															{ day: "numeric", month: "short" },
														)}
													</span>
												) : (
													<span className="text-xs text-gray-400">
														Tanpa estimasi
													</span>
												)}
											</div>
										</div>
									);
								})}
						</div>
					</div>
				)}

				{/* Empty state */}
				{poPending.length === 0 && poInProses.length === 0 && (
					<div className="flex flex-col items-center justify-center py-8 text-center px-6">
						<CheckCircle2 size={28} className="text-green-400 mb-2" />
						<p className="text-sm font-medium text-gray-600">
							Semua PO sudah selesai
						</p>
						<p className="text-xs text-gray-400 mt-1">
							Tidak ada PO yang pending atau sedang diproses saat ini
						</p>
					</div>
				)}

				{/* Catatan bridge */}
				<div className="px-6 py-3 bg-orange-50 border-t border-orange-100">
					<p className="text-xs text-orange-700">
						Owner berperan sebagai jembatan antara PO masuk dan tim produksi —
						pastikan setiap PO yang <em>pending</em> segera dikomunikasikan ke
						produksi.
					</p>
				</div>
			</div>

			{/* ══════════════════════════════════════
			    BAGIAN D1 — Reseller Baru (7 Hari)
			══════════════════════════════════════ */}
			<div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
				<button
					onClick={() => setDInfoOpen(!dInfoOpen)}
					className="w-full flex items-center justify-between px-6 py-4 hover:bg-gray-50 transition">
					<div className="flex items-center gap-2.5">
						<Users size={15} className="text-blue-500" />
						<span className="font-semibold text-gray-800 text-sm">
							Reseller Baru (7 Hari Terakhir)
						</span>
						{resellerBaru.length > 0 && (
							<span className="bg-blue-100 text-blue-700 text-xs font-semibold px-2 py-0.5 rounded-full">
								{resellerBaru.length}
							</span>
						)}
					</div>
					{dInfoOpen ? (
						<ChevronDown size={15} className="text-gray-400" />
					) : (
						<ChevronRight size={15} className="text-gray-400" />
					)}
				</button>
				{dInfoOpen && (
					<div className="border-t border-gray-100">
						{resellerBaru.length === 0 ? (
							<p className="text-sm text-gray-400 text-center py-6">
								Tidak ada reseller baru dalam 7 hari terakhir
							</p>
						) : (
							<div className="divide-y divide-gray-50">
								{resellerBaru.map((r) => (
									<div
										key={r.id}
										className="flex items-center justify-between px-6 py-3">
										<div>
											<p className="text-sm font-medium text-gray-800">
												{r.nama}
											</p>
											<p className="text-xs text-gray-400">{r.kota || "—"}</p>
										</div>
										<span className="text-xs text-gray-400">
											{new Date(r.created_at).toLocaleDateString("id-ID", {
												day: "numeric",
												month: "short",
											})}
										</span>
									</div>
								))}
							</div>
						)}
						<div className="px-6 py-3 bg-blue-50 border-t border-blue-100">
							<p className="text-xs text-blue-600">
								Info saja — verifikasi detail reseller dilakukan tim internal.
							</p>
						</div>
					</div>
				)}
			</div>

			{/* ══════════════════════════════════════
			    BAGIAN D2 — Ringkasan Kinerja Bulan Ini
			══════════════════════════════════════ */}
			<div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
				<button
					onClick={() => setDKinerjaOpen(!dKinerjaOpen)}
					className="w-full flex items-center justify-between px-6 py-4 hover:bg-gray-50 transition">
					<div className="flex items-center gap-2.5">
						<TrendingUp size={15} className="text-blue-500" />
						<span className="font-semibold text-gray-800 text-sm">
							Ringkasan Kinerja Bulan Ini
						</span>
					</div>
					{dKinerjaOpen ? (
						<ChevronDown size={15} className="text-gray-400" />
					) : (
						<ChevronRight size={15} className="text-gray-400" />
					)}
				</button>
				{dKinerjaOpen &&
					(() => {
						const totalNota = statsNota.length;
						const totalOmset = statsNota.reduce(
							(s, n) => s + (n.total_harga_jual || 0),
							0,
						);
						const notaCocok = statsNota.filter(
							(n) => n.status_pencocokan === "cocok",
						).length;
						const pctCocok =
							totalNota > 0 ? Math.round((notaCocok / totalNota) * 100) : 0;
						const poOnTime = poTerlambat.length === 0;
						return (
							<div className="border-t border-gray-100 px-6 py-5">
								<div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
									<div className="text-center">
										<p className="text-2xl font-bold text-gray-900">
											{totalNota}
										</p>
										<p className="text-xs text-gray-500 mt-0.5">Total Nota</p>
										<Link
											href="/dashboard/laporan"
											className="text-xs text-indigo-500 hover:underline">
											Lihat laporan
										</Link>
									</div>
									<div className="text-center">
										<p className="text-2xl font-bold text-gray-900">
											{formatRupiah(totalOmset)}
										</p>
										<p className="text-xs text-gray-500 mt-0.5">Total Omset</p>
										<Link
											href="/dashboard/keuangan/laporan"
											className="text-xs text-indigo-500 hover:underline">
											Lihat keuangan
										</Link>
									</div>
									<div className="text-center">
										<p
											className={`text-2xl font-bold ${pctCocok >= 80 ? "text-green-600" : pctCocok >= 50 ? "text-amber-600" : "text-red-600"}`}>
											{pctCocok}%
										</p>
										<p className="text-xs text-gray-500 mt-0.5">
											Nota Dicocokkan
										</p>
										<Link
											href="/dashboard/pencocokan"
											className="text-xs text-indigo-500 hover:underline">
											Buka pencocokan
										</Link>
									</div>
									<div className="text-center">
										<p
											className={`text-2xl font-bold ${poOnTime ? "text-green-600" : "text-red-600"}`}>
											{poOnTime ? "On-Time" : `${poTerlambat.length} Late`}
										</p>
										<p className="text-xs text-gray-500 mt-0.5">Status PO</p>
										<Link
											href="/dashboard/po"
											className="text-xs text-indigo-500 hover:underline">
											Buka PO
										</Link>
									</div>
								</div>
							</div>
						);
					})()}
			</div>

			{/* ══════════════════════════════════════
			    BAGIAN E1 — Checklist Bulanan Manual
			══════════════════════════════════════ */}
			<div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
				<button
					onClick={() => setEChecklistOpen(!eChecklistOpen)}
					className="w-full flex items-center justify-between px-6 py-4 hover:bg-gray-50 transition">
					<div className="flex items-center gap-2.5">
						<ClipboardCheck size={15} className="text-violet-500" />
						<span className="font-semibold text-gray-800 text-sm">
							Checklist Bulanan
						</span>
						{Object.values(checklistChecked).filter(Boolean).length > 0 && (
							<span className="bg-violet-100 text-violet-700 text-xs font-semibold px-2 py-0.5 rounded-full">
								{Object.values(checklistChecked).filter(Boolean).length}/
								{CHECKLIST_BULANAN.length}
							</span>
						)}
					</div>
					{eChecklistOpen ? (
						<ChevronDown size={15} className="text-gray-400" />
					) : (
						<ChevronRight size={15} className="text-gray-400" />
					)}
				</button>
				{eChecklistOpen && (
					<div className="border-t border-gray-100 px-6 py-4 space-y-2.5">
						{CHECKLIST_BULANAN.map((item) => {
							const checked = checklistChecked[item] ?? false;
							const saving = savingChecklist === item;
							return (
								<label
									key={item}
									className={`flex items-center gap-3 cursor-pointer group px-3 py-2.5 rounded-xl transition ${checked ? "bg-green-50" : "hover:bg-gray-50"}`}>
									<button
										type="button"
										disabled={saving}
										onClick={() => toggleChecklist(item)}
										className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition flex-shrink-0 ${checked ? "bg-green-500 border-green-500" : "border-gray-300 group-hover:border-gray-400"}`}>
										{checked && <Check size={11} className="text-white" />}
									</button>
									<span
										className={`text-sm transition ${checked ? "line-through text-gray-400" : "text-gray-700"}`}>
										{item}
									</span>
								</label>
							);
						})}
						<div className="pt-2 border-t border-gray-100 mt-3">
							<p className="text-xs text-gray-400">
								Centang mereset otomatis saat halaman dibuka ulang — untuk
								tracking refleksi sesi saat ini saja.
							</p>
						</div>
					</div>
				)}
			</div>

			{/* ══════════════════════════════════════
			    BAGIAN E2 — Catatan Kebijakan (Notepad)
			══════════════════════════════════════ */}
			<div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
				<button
					onClick={() => setECatatanOpen(!eCatatanOpen)}
					className="w-full flex items-center justify-between px-6 py-4 hover:bg-gray-50 transition">
					<div className="flex items-center gap-2.5">
						<StickyNote size={15} className="text-violet-500" />
						<span className="font-semibold text-gray-800 text-sm">
							Catatan Kebijakan
						</span>
						{reminders.filter((r) => r.tipe === "catatan_kebijakan").length >
							0 && (
							<span className="bg-violet-100 text-violet-700 text-xs font-semibold px-2 py-0.5 rounded-full">
								{reminders.filter((r) => r.tipe === "catatan_kebijakan").length}
							</span>
						)}
					</div>
					{eCatatanOpen ? (
						<ChevronDown size={15} className="text-gray-400" />
					) : (
						<ChevronRight size={15} className="text-gray-400" />
					)}
				</button>
				{eCatatanOpen && (
					<div className="border-t border-gray-100 px-6 py-4 space-y-3">
						{/* Input catatan baru */}
						<div className="flex gap-2">
							<input
								value={catatanBaru}
								onChange={(e) => setCatatanBaru(e.target.value)}
								onKeyDown={(e) => {
									if (e.key === "Enter" && catatanBaru.trim())
										tambahCatatanKebijakan();
								}}
								placeholder="Tulis catatan kebijakan baru..."
								className="flex-1 px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
							/>
							<button
								onClick={tambahCatatanKebijakan}
								disabled={!catatanBaru.trim() || saving === "catatan"}
								className="px-4 py-2 bg-violet-600 hover:bg-violet-700 disabled:bg-violet-200 text-white rounded-xl text-sm font-medium transition">
								{saving === "catatan" ? "..." : "Tambah"}
							</button>
						</div>
						{/* Daftar catatan tersimpan */}
						{reminders.filter((r) => r.tipe === "catatan_kebijakan").length ===
						0 ? (
							<p className="text-sm text-gray-400 text-center py-4">
								Belum ada catatan kebijakan
							</p>
						) : (
							<div className="space-y-2">
								{reminders
									.filter((r) => r.tipe === "catatan_kebijakan")
									.map((r) => (
										<div
											key={r.id}
											className="flex items-start gap-3 px-3 py-2.5 bg-violet-50 rounded-xl group">
											<StickyNote
												size={13}
												className="text-violet-400 mt-0.5 flex-shrink-0"
											/>
											<p className="text-sm text-gray-700 flex-1">{r.judul}</p>
											<button
												onClick={() => hapusCatatanKebijakan(r.id)}
												className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-500 transition">
												<X size={13} />
											</button>
										</div>
									))}
							</div>
						)}
					</div>
				)}
			</div>

			{/* ══════════════════════════════════════
			    MODAL — Tandai Audit Selesai
			══════════════════════════════════════ */}
			{auditModal && (
				<div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
					<div className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
						<div className="flex items-center justify-between p-6 border-b border-gray-100">
							<div className="flex items-center gap-2.5">
								{auditModal === "audit_nota" ? (
									<ClipboardCheck size={18} className="text-green-600" />
								) : (
									<Package size={18} className="text-green-600" />
								)}
								<h2 className="font-semibold text-gray-900">
									{auditModal === "audit_nota"
										? "Tandai Audit Nota Selesai"
										: "Tandai Stock Opname Selesai"}
								</h2>
							</div>
							<button
								onClick={() => setAuditModal(null)}
								className="p-1.5 hover:bg-gray-100 rounded-lg">
								<X size={16} />
							</button>
						</div>
						<div className="p-6 space-y-4">
							<p className="text-sm text-gray-600">
								{auditModal === "audit_nota"
									? "Konfirmasi bahwa audit acak nota sudah dilakukan. Waktu selesai akan dicatat sekarang."
									: "Konfirmasi bahwa stock opname fisik gudang sudah dilakukan dan hasilnya cocok dengan catatan sistem."}
							</p>
							<div>
								<label className="block text-xs font-medium text-gray-600 mb-1">
									Catatan (opsional)
								</label>
								<textarea
									value={auditCatatan}
									onChange={(e) => setAuditCatatan(e.target.value)}
									rows={3}
									placeholder={
										auditModal === "audit_nota"
											? "Misal: audit 10 nota acak bulan Juni, semua cocok"
											: "Misal: opname 45 SKU, selisih minor di rak B3 sudah dikoreksi"
									}
									className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
								/>
							</div>
							{formError && (
								<div className="bg-red-50 border border-red-200 text-red-600 px-4 py-2.5 rounded-xl text-sm">
									{formError}
								</div>
							)}
						</div>
						<div className="flex gap-3 p-6 pt-0">
							<button
								onClick={() => setAuditModal(null)}
								className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium hover:bg-gray-50">
								Batal
							</button>
							<button
								onClick={tandaiAuditSelesai}
								disabled={saving === "audit"}
								className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-green-300 text-white px-4 py-2.5 rounded-xl text-sm font-medium flex items-center justify-center gap-2 transition">
								{saving === "audit" ? (
									<>
										<Loader2 size={14} className="animate-spin" /> Menyimpan...
									</>
								) : (
									<>
										<CheckCircle2 size={14} /> Konfirmasi Selesai
									</>
								)}
							</button>
						</div>
					</div>
				</div>
			)}

			{/* ══════════════════════════════════════
			    BAGIAN F — Pengaturan Siklus Reminder
			══════════════════════════════════════ */}
			<div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
				<button
					onClick={() => setFSettingsOpen(!fSettingsOpen)}
					className="w-full flex items-center justify-between px-6 py-4 hover:bg-gray-50 transition">
					<div className="flex items-center gap-2.5">
						<RefreshCw size={15} className="text-gray-500" />
						<span className="font-semibold text-gray-800 text-sm">
							Pengaturan Siklus Reminder
						</span>
					</div>
					<div className="flex items-center gap-2">
						<span className="text-xs text-gray-400">
							Audit {siklusAuditNota}h · Opname {siklusStockOpname}h
						</span>
						{fSettingsOpen ? (
							<ChevronDown size={15} className="text-gray-400" />
						) : (
							<ChevronRight size={15} className="text-gray-400" />
						)}
					</div>
				</button>

				{fSettingsOpen && (
					<div className="border-t border-gray-100 px-6 py-5 space-y-5">
						{/* Audit Nota */}
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-1">
								Siklus Audit Nota Acak
							</label>
							<p className="text-xs text-gray-400 mb-2">
								Reminder muncul jika sudah X hari sejak audit terakhir
								dilakukan.
							</p>
							<div className="flex items-center gap-3">
								<input
									type="number"
									min={1}
									max={365}
									value={settingsInput.audit_nota}
									onChange={(e) =>
										setSettingsInput((p) => ({
											...p,
											audit_nota: parseInt(e.target.value) || 1,
										}))
									}
									className="w-24 px-3 py-2 border border-gray-200 rounded-xl text-sm text-center font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
								/>
								<span className="text-sm text-gray-500">hari</span>
								<div className="flex gap-2 flex-wrap">
									{[7, 14, 30].map((d) => (
										<button
											key={d}
											onClick={() =>
												setSettingsInput((p) => ({ ...p, audit_nota: d }))
											}
											className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${settingsInput.audit_nota === d ? "bg-indigo-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
											{d} hari
										</button>
									))}
								</div>
							</div>
						</div>

						{/* Stock Opname */}
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-1">
								Siklus Stock Opname Fisik
							</label>
							<p className="text-xs text-gray-400 mb-2">
								Reminder muncul jika sudah X hari sejak opname terakhir
								dilakukan.
							</p>
							<div className="flex items-center gap-3">
								<input
									type="number"
									min={1}
									max={365}
									value={settingsInput.stock_opname}
									onChange={(e) =>
										setSettingsInput((p) => ({
											...p,
											stock_opname: parseInt(e.target.value) || 1,
										}))
									}
									className="w-24 px-3 py-2 border border-gray-200 rounded-xl text-sm text-center font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
								/>
								<span className="text-sm text-gray-500">hari</span>
								<div className="flex gap-2 flex-wrap">
									{[7, 30, 90].map((d) => (
										<button
											key={d}
											onClick={() =>
												setSettingsInput((p) => ({ ...p, stock_opname: d }))
											}
											className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${settingsInput.stock_opname === d ? "bg-indigo-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
											{d} hari
										</button>
									))}
								</div>
							</div>
						</div>

						{/* Info preview */}
						<div className="bg-gray-50 rounded-xl px-4 py-3 text-xs text-gray-500 space-y-1">
							<p>
								· Audit Nota: reminder setiap{" "}
								<strong>{settingsInput.audit_nota} hari</strong> sekali
							</p>
							<p>
								· Stock Opname: reminder setiap{" "}
								<strong>{settingsInput.stock_opname} hari</strong> sekali
							</p>
						</div>

						<div className="flex justify-end">
							<button
								onClick={saveSettings}
								disabled={savingSettings}
								className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white rounded-xl text-sm font-semibold transition">
								{savingSettings ? (
									<>
										<Loader2 size={14} className="animate-spin" /> Menyimpan...
									</>
								) : (
									<>
										<Check size={14} /> Simpan Pengaturan
									</>
								)}
							</button>
						</div>
					</div>
				)}
			</div>
		</div>
	);
}
