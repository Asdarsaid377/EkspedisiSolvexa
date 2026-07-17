"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { formatDate } from "@/lib/utils";
import {
	Plus,
	Search,
	X,
	Clock,
	CheckCircle2,
	XCircle,
	AlertCircle,
	Calendar,
	User,
	Users,
	Package,
	Printer,
	Trash2,
	ChevronDown,
	MoreVertical,
	ClipboardList,
	CircleDot,
	Activity,
	TrendingUp,
	Edit,
	Image as ImageIcon,
	Wrench,
} from "lucide-react";

type POStatus = "pending" | "proses" | "selesai" | "batal";
type POPrioritas = "rendah" | "normal" | "tinggi" | "urgent";
type TipePemohon = "reseller" | "customer";
type KategoriPO = "pabrik" | "premium" | "semi_premium" | "jati";

const PRIORITAS_CONFIG: Record<POPrioritas, { label: string; color: string; dot: string }> = {
	rendah:  { label: "Rendah",  color: "bg-gray-100 text-gray-500",    dot: "bg-gray-400"  },
	normal:  { label: "Normal",  color: "bg-blue-100 text-blue-600",    dot: "bg-blue-500"  },
	tinggi:  { label: "Tinggi",  color: "bg-amber-100 text-amber-700",  dot: "bg-amber-500" },
	urgent:  { label: "Urgent",  color: "bg-red-100 text-red-600",      dot: "bg-red-500"   },
};

const KATEGORI_PO_CONFIG: Record<KategoriPO, { label: string; color: string }> = {
	pabrik:       { label: "Pabrik",       color: "bg-slate-100 text-slate-600" },
	premium:      { label: "Premium",      color: "bg-amber-100 text-amber-700" },
	semi_premium: { label: "Semi Premium", color: "bg-cyan-100 text-cyan-700"  },
	jati:         { label: "Jati",         color: "bg-orange-100 text-orange-700" },
};

const PO_EDIT_ROLES = ["superadmin", "keuangan", "cs"];

interface POItem {
	produk_id: string | null;
	nama_produk: string;
	jumlah: number;
	satuan: string;
	keterangan: string;
}

const STATUS_CONFIG: Record<POStatus, { label: string; color: string; icon: any }> = {
	pending: { label: "Pending", color: "bg-gray-100 text-gray-600", icon: Clock },
	proses: { label: "Diproses", color: "bg-blue-100 text-blue-700", icon: CircleDot },
	selesai: { label: "Selesai", color: "bg-green-100 text-green-700", icon: CheckCircle2 },
	batal: { label: "Dibatalkan", color: "bg-red-100 text-red-600", icon: XCircle },
};

function isOverdue(tanggal_estimasi: string | null, status: POStatus) {
	if (!tanggal_estimasi || status === "selesai" || status === "batal") return false;
	return new Date(tanggal_estimasi) < new Date(new Date().toDateString());
}

function fmtDateOnly(s: string) {
	return new Date(s).toLocaleDateString("id-ID", {
		day: "numeric",
		month: "short",
		year: "numeric",
	});
}

function daysUntil(dateStr: string) {
	const diff = Math.ceil(
		(new Date(dateStr).getTime() - new Date(new Date().toDateString()).getTime()) /
			86400000,
	);
	if (diff === 0) return "Hari ini";
	if (diff < 0) return `${Math.abs(diff)} hari lalu`;
	return `${diff} hari lagi`;
}

// Tier 0 = sudah terlambat (paling atas), 1 = mendekati deadline, 2 = tanpa estimasi, 3 = selesai/batal (paling bawah)
function urgencyRank(po: any): [number, number] {
	if (po.status === "selesai" || po.status === "batal") {
		return [3, -new Date(po.created_at).getTime()];
	}
	if (!po.tanggal_estimasi) {
		return [2, -new Date(po.created_at).getTime()];
	}
	const estTime = new Date(po.tanggal_estimasi).getTime();
	const todayTime = new Date(new Date().toDateString()).getTime();
	return estTime < todayTime ? [0, estTime] : [1, estTime];
}

const PO_ROLES = ["superadmin","cs","gudang","produksi","pengiriman","keuangan","kasir"];

export default function POPage() {
	const { profile, role, loading: authLoading } = useAuth();
	const router = useRouter();
	const supabase = createClient();

	useEffect(() => {
		if (!authLoading && !PO_ROLES.includes(role ?? "")) router.replace("/dashboard");
	}, [role, authLoading, router]);

	if (authLoading || !PO_ROLES.includes(role ?? "")) return null;

	const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);
	const [poList, setPoList] = useState<any[]>([]);
	const [resellerList, setResellerList] = useState<any[]>([]);
	const [produkList, setProdukList] = useState<any[]>([]);
	const [loading, setLoading] = useState(true);
	const [modal, setModal] = useState<"form" | "edit" | null>(null);
	const [actionMenu, setActionMenu] = useState<string | null>(null);
	const [saving, setSaving] = useState(false);

	// Modal konfirmasi selesai + stok
	const [modalSelesai, setModalSelesai] = useState<any | null>(null);
	const [selesaiMasukStok, setSelesaiMasukStok] = useState(true);
	const [selesaiLoading, setSelesaiLoading] = useState(false);

	// Modal mulai proses + input tukang
	const [modalMulaiProses, setModalMulaiProses] = useState<any | null>(null);
	const [tukangInput, setTukangInput] = useState("");
	const [mulaiProsesLoading, setMulaiProsesLoading] = useState(false);

	// Modal progress PO
	const [modalProgress, setModalProgress] = useState<any | null>(null);
	const [progressList, setProgressList] = useState<any[]>([]);
	const [progressLoading, setProgressLoading] = useState(false);
	const [progTanggal, setProgTanggal] = useState("");
	const [progPersen, setProgPersen] = useState(0);
	const [progKeterangan, setProgKeterangan] = useState("");
	const [progFotoFile, setProgFotoFile] = useState<File | null>(null);
	const [progFotoPreview, setProgFotoPreview] = useState<string | null>(null);
	const [progSaving, setProgSaving] = useState(false);
	const [progError, setProgError] = useState("");

	const canAddProgress = role === "produksi" || role === "superadmin";
	const canEditPO = PO_EDIT_ROLES.includes(role ?? "");

	// Edit PO
	const [editingId, setEditingId] = useState<string | null>(null);

	// Filters
	const [search, setSearch] = useState("");
	const [filterStatus, setFilterStatus] = useState<"semua" | POStatus>("semua");
	const [filterKategori, setFilterKategori] = useState<"semua" | KategoriPO>("semua");
	const [filterDari, setFilterDari] = useState("");
	const [filterSampai, setFilterSampai] = useState("");

	// Form
	const [formPrioritas, setFormPrioritas] = useState<POPrioritas>("normal");
	const [formKategori, setFormKategori] = useState<KategoriPO>("pabrik");
	const [formTipe, setFormTipe] = useState<TipePemohon>("reseller");
	const [formResellerId, setFormResellerId] = useState("");
	const [formResellerSearch, setFormResellerSearch] = useState("");
	const [showResellerDrop, setShowResellerDrop] = useState(false);
	const [formNamaCustomer, setFormNamaCustomer] = useState("");
	const [formTeleponCustomer, setFormTeleponCustomer] = useState("");
	const [formTanggalPO, setFormTanggalPO] = useState("");
	const [formTanggalEstimasi, setFormTanggalEstimasi] = useState("");
	const [formCatatan, setFormCatatan] = useState("");
	const [formItems, setFormItems] = useState<POItem[]>([]);
	const [produkSearch, setProdukSearch] = useState("");
	const [showProdukDrop, setShowProdukDrop] = useState(false);
	const [formFotoFile, setFormFotoFile] = useState<File | null>(null);
	const [formFotoPreview, setFormFotoPreview] = useState<string | null>(null);
	const [formError, setFormError] = useState("");

	const load = useCallback(async () => {
		const { data } = await supabase
			.from("purchase_orders")
			.select(
				"*, reseller:resellers(nama, telepon), items:purchase_order_items(id, nama_produk, jumlah, satuan)",
			)
			.order("created_at", { ascending: false });
		setPoList(data || []);
		setLoading(false);
	}, []);

	useEffect(() => {
		load();
		supabase.from("resellers").select("id, nama, telepon").eq("aktif", true).order("nama")
			.then(({ data }) => setResellerList(data || []));
		supabase.from("produk").select("id, nama, satuan").eq("aktif", true).order("nama")
			.then(({ data }) => setProdukList(data || []));
	}, [load]);

	const openForm = () => {
		const today = new Date().toISOString().split("T")[0];
		setEditingId(null);
		setFormPrioritas("normal");
		setFormKategori("pabrik");
		setFormTipe("reseller");
		setFormResellerId("");
		setFormResellerSearch("");
		setFormNamaCustomer("");
		setFormTeleponCustomer("");
		setFormTanggalPO(today);
		setFormTanggalEstimasi("");
		setFormCatatan("");
		setFormItems([{ produk_id: null, nama_produk: "", jumlah: 1, satuan: "unit", keterangan: "" }]);
		setProdukSearch("");
		setFormFotoFile(null);
		setFormFotoPreview(null);
		setFormError("");
		setModal("form");
	};

	const openEdit = async (poId: string) => {
		const { data: po } = await supabase
			.from("purchase_orders")
			.select("*, items:purchase_order_items(*)")
			.eq("id", poId)
			.single();
		if (!po) return;

		setEditingId(po.id);
		setFormPrioritas((po.prioritas as POPrioritas) ?? "normal");
		setFormKategori((po.kategori_po as KategoriPO) ?? "pabrik");
		setFormTipe(po.tipe_pemohon);
		setFormResellerId(po.reseller_id || "");
		setFormResellerSearch(
			po.tipe_pemohon === "reseller"
				? resellerList.find((r) => r.id === po.reseller_id)?.nama || ""
				: "",
		);
		setFormNamaCustomer(po.nama_customer || "");
		setFormTeleponCustomer(po.telepon_customer || "");
		setFormTanggalPO(po.tanggal_po?.split("T")[0] || "");
		setFormTanggalEstimasi(po.tanggal_estimasi || "");
		setFormCatatan(po.catatan || "");
		setFormItems(
			(po.items || []).length
				? po.items.map((i: any) => ({
						produk_id: i.produk_id,
						nama_produk: i.nama_produk,
						jumlah: i.jumlah,
						satuan: i.satuan,
						keterangan: i.keterangan || "",
					}))
				: [{ produk_id: null, nama_produk: "", jumlah: 1, satuan: "unit", keterangan: "" }],
		);
		setProdukSearch("");
		setFormFotoFile(null);
		setFormFotoPreview(po.foto_url || null);
		setFormError("");
		setModal("edit");
	};

	const printPOById = async (id: string) => {
		const { data } = await supabase
			.from("purchase_orders")
			.select("*, reseller:resellers(*), items:purchase_order_items(*, produk:produk(nama, satuan))")
			.eq("id", id)
			.single();
		if (data) handlePrintPO(data);
	};

	const generateNomorPO = async () => {
		const d = new Date();
		const dateStr =
			d.getFullYear().toString() +
			(d.getMonth() + 1).toString().padStart(2, "0") +
			d.getDate().toString().padStart(2, "0");
		const { data } = await supabase
			.from("purchase_orders")
			.select("nomor_po")
			.like("nomor_po", `PO-${dateStr}-%`)
			.order("nomor_po", { ascending: false })
			.limit(1);
		const lastSeq = data?.[0]?.nomor_po
			? parseInt(data[0].nomor_po.split("-")[2], 10) || 0
			: 0;
		const seq = (lastSeq + 1).toString().padStart(4, "0");
		return `PO-${dateStr}-${seq}`;
	};

	const savePO = async () => {
		const validItems = formItems.filter((i) => i.nama_produk.trim());
		if (!validItems.length) { setFormError("Tambahkan minimal 1 item"); return; }
		if (formTipe === "reseller" && !formResellerId) { setFormError("Pilih reseller"); return; }
		if (formTipe === "customer" && !formNamaCustomer.trim()) { setFormError("Isi nama customer"); return; }

		setSaving(true);

		let po: any = null;
		let error: any = null;
		for (let attempt = 0; attempt < 5; attempt++) {
			const nomor_po = await generateNomorPO();
			const res = await supabase
				.from("purchase_orders")
				.insert({
					nomor_po,
					tipe_pemohon: formTipe,
					reseller_id: formTipe === "reseller" ? formResellerId : null,
					nama_customer: formTipe === "customer" ? formNamaCustomer.trim() : null,
					telepon_customer: formTipe === "customer" ? formTeleponCustomer.trim() || null : null,
					tanggal_po: formTanggalPO,
					tanggal_estimasi: formTanggalEstimasi || null,
					status: "pending",
					prioritas: formPrioritas,
					kategori_po: formKategori,
					catatan: formCatatan.trim() || null,
					created_by: profile?.id,
				})
				.select()
				.single();
			po = res.data;
			error = res.error;
			if (!error || error.code !== "23505") break;
		}

		if (error) { setFormError("Gagal menyimpan: " + error.message); setSaving(false); return; }

		await supabase.from("purchase_order_items").insert(
			validItems.map((i) => ({
				po_id: po.id,
				produk_id: i.produk_id || null,
				nama_produk: i.nama_produk,
				jumlah: i.jumlah,
				satuan: i.satuan,
				keterangan: i.keterangan || null,
			})),
		);

		if (formFotoFile) {
			const ext = formFotoFile.name.split(".").pop();
			const path = `po-foto/${po.id}/${Date.now()}.${ext}`;
			const { error: upErr } = await supabase.storage.from("BungaNaik").upload(path, formFotoFile);
			if (!upErr) {
				const { data: urlData } = supabase.storage.from("BungaNaik").getPublicUrl(path);
				await supabase.from("purchase_orders").update({ foto_url: urlData.publicUrl }).eq("id", po.id);
			}
		}

		setSaving(false);
		setModal(null);
		load();
	};

	const saveEditPO = async () => {
		if (!editingId) return;
		const validItems = formItems.filter((i) => i.nama_produk.trim());
		if (!validItems.length) { setFormError("Tambahkan minimal 1 item"); return; }
		if (formTipe === "reseller" && !formResellerId) { setFormError("Pilih reseller"); return; }
		if (formTipe === "customer" && !formNamaCustomer.trim()) { setFormError("Isi nama customer"); return; }

		setSaving(true);

		let foto_url: string | undefined;
		if (formFotoFile) {
			const ext = formFotoFile.name.split(".").pop();
			const path = `po-foto/${editingId}/${Date.now()}.${ext}`;
			const { error: upErr } = await supabase.storage.from("BungaNaik").upload(path, formFotoFile);
			if (upErr) { setFormError("Gagal upload foto: " + upErr.message); setSaving(false); return; }
			const { data: urlData } = supabase.storage.from("BungaNaik").getPublicUrl(path);
			foto_url = urlData.publicUrl;
			
		}

		const { error } = await supabase
			.from("purchase_orders")
			.update({
				tipe_pemohon: formTipe,
				reseller_id: formTipe === "reseller" ? formResellerId : null,
				nama_customer: formTipe === "customer" ? formNamaCustomer.trim() : null,
				telepon_customer: formTipe === "customer" ? formTeleponCustomer.trim() || null : null,
				tanggal_po: formTanggalPO,
				tanggal_estimasi: formTanggalEstimasi || null,
				prioritas: formPrioritas,
				kategori_po: formKategori,
				catatan: formCatatan.trim() || null,
				...(foto_url ? { foto_url } : {}),
			})
			.eq("id", editingId);

		if (error) { setFormError("Gagal menyimpan: " + error.message); setSaving(false); return; }

		await supabase.from("purchase_order_items").delete().eq("po_id", editingId);
		await supabase.from("purchase_order_items").insert(
			validItems.map((i) => ({
				po_id: editingId,
				produk_id: i.produk_id || null,
				nama_produk: i.nama_produk,
				jumlah: i.jumlah,
				satuan: i.satuan,
				keterangan: i.keterangan || null,
			})),
		);

		setSaving(false);
		setModal(null);
		setEditingId(null);
		load();
	};

	const updateStatus = async (id: string, status: POStatus) => {
		await supabase.from("purchase_orders").update({ status }).eq("id", id);
		setPoList((prev) => prev.map((p) => (p.id === id ? { ...p, status } : p)));
	};

	const openMulaiProses = (po: any) => {
		setModalMulaiProses(po);
		setTukangInput(po.nama_tukang || "");
	};

	const submitMulaiProses = async () => {
		if (!modalMulaiProses) return;
		setMulaiProsesLoading(true);
		const nama_tukang = tukangInput.trim() || null;
		await supabase
			.from("purchase_orders")
			.update({ status: "proses", nama_tukang })
			.eq("id", modalMulaiProses.id);
		setPoList((prev) =>
			prev.map((p) => (p.id === modalMulaiProses.id ? { ...p, status: "proses", nama_tukang } : p)),
		);
		setMulaiProsesLoading(false);
		setModalMulaiProses(null);
	};

	const updatePrioritas = async (id: string, prioritas: POPrioritas) => {
		await supabase.from("purchase_orders").update({ prioritas }).eq("id", id);
		setPoList((prev) => prev.map((p) => (p.id === id ? { ...p, prioritas } : p)));
	};

	const openSelesai = async (poId: string) => {
		const { data } = await supabase
			.from("purchase_orders")
			.select(
				"*, reseller:resellers(nama), items:purchase_order_items(*, produk:produk(id, nama, satuan, stok))",
			)
			.eq("id", poId)
			.single();
		setModalSelesai(data);
		setSelesaiMasukStok(true);
	};

	const handleSelesaikan = async () => {
		if (!modalSelesai) return;
		setSelesaiLoading(true);

		await supabase
			.from("purchase_orders")
			.update({ status: "selesai" })
			.eq("id", modalSelesai.id);

		if (selesaiMasukStok) {
			const linkedItems = (modalSelesai.items || []).filter(
				(i: any) => i.produk_id && i.produk,
			);
			for (const item of linkedItems) {
				const stokSebelum = item.produk.stok ?? 0;
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
					keterangan: `Penerimaan PO ${modalSelesai.nomor_po}`,
					created_by: profile?.id,
				});
			}
		}

		setPoList((prev) =>
			prev.map((p) => (p.id === modalSelesai.id ? { ...p, status: "selesai" } : p)),
		);

		setSelesaiLoading(false);
		setModalSelesai(null);
	};

	const openProgress = async (po: any) => {
		setModalProgress(po);
		setProgressLoading(true);
		setProgTanggal(new Date().toISOString().split("T")[0]);
		setProgPersen(0);
		setProgKeterangan("");
		setProgFotoFile(null);
		setProgFotoPreview(null);
		setProgError("");
		const { data } = await supabase
			.from("po_progress")
			.select("*, creator:profiles(name)")
			.eq("po_id", po.id)
			.order("tanggal", { ascending: false });
		setProgressList(data || []);
		setProgressLoading(false);
	};

	const saveProgress = async () => {
		if (!modalProgress) return;
		setProgError("");
		if (!progKeterangan.trim()) { setProgError("Keterangan wajib diisi"); return; }
		setProgSaving(true);

		let foto_url: string | null = null;
		if (progFotoFile) {
			const ext = progFotoFile.name.split(".").pop();
			const path = `po-progress/${modalProgress.id}/${Date.now()}.${ext}`;
			const { error: upErr } = await supabase.storage.from("BungaNaik").upload(path, progFotoFile);
			if (upErr) { setProgError("Gagal upload foto: " + upErr.message); setProgSaving(false); return; }
			const { data: urlData } = supabase.storage.from("BungaNaik").getPublicUrl(path);
			foto_url = urlData.publicUrl;
		}

		const { error } = await supabase.from("po_progress").insert({
			po_id: modalProgress.id,
			tanggal: progTanggal,
			persentase: progPersen,
			keterangan: progKeterangan.trim(),
			foto_url,
			created_by: profile?.id,
		});

		if (error) { setProgError("Gagal menyimpan: " + error.message); setProgSaving(false); return; }

		const { data } = await supabase
			.from("po_progress")
			.select("*, creator:profiles(name)")
			.eq("po_id", modalProgress.id)
			.order("tanggal", { ascending: false });
		setProgressList(data || []);
		setProgTanggal(new Date().toISOString().split("T")[0]);
		setProgPersen(0);
		setProgKeterangan("");
		setProgFotoFile(null);
		setProgFotoPreview(null);
		setProgSaving(false);
	};

	const hapusPO = async (id: string) => {
		if (!confirm("Hapus PO ini?")) return;
		await supabase.from("purchase_orders").delete().eq("id", id);
		setPoList((prev) => prev.filter((p) => p.id !== id));
	};

	const handlePrintPO = (data: any) => {
		const items = data.items || [];
		const pemohon =
			data.tipe_pemohon === "reseller"
				? data.reseller?.nama || "-"
				: data.nama_customer || "-";
		const telepon =
			data.tipe_pemohon === "reseller"
				? data.reseller?.telepon || ""
				: data.telepon_customer || "";

		const rows = items
			.map(
				(item: any, i: number) => `<tr>
			<td class="tc">${i + 1}</td>
			<td>${item.nama_produk}</td>
			<td class="tc">${item.jumlah}</td>
			<td class="tc">${item.satuan}</td>
			<td>${item.keterangan || ""}</td>
		</tr>`,
			)
			.join("");

		const w = window.open("", "_blank");
		if (!w) return;
		w.document.write(`<!DOCTYPE html><html lang="id"><head>
<title>PO ${data.nomor_po}</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:Arial,sans-serif;font-size:11px;color:#000;padding:20px;max-width:700px;margin:0 auto}
.header{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid #000;padding-bottom:12px;margin-bottom:14px}
.brand{font-size:18px;font-weight:900}.brand-sub{font-size:9px;color:#666;margin-top:2px}
.doc-title{font-size:16px;font-weight:800;text-align:right;letter-spacing:1px}
.doc-no{font-size:10px;color:#444;text-align:right;margin-top:3px}
.info{display:grid;grid-template-columns:110px 1fr;gap:4px 8px;margin-bottom:14px;font-size:10.5px}
.lbl{color:#555}.val{font-weight:600}
.badge{display:inline-block;border:1px solid #000;padding:1px 8px;border-radius:3px;font-size:9px;font-weight:700;letter-spacing:.5px}
table{width:100%;border-collapse:collapse;margin:10px 0}
th{background:#eeeeee;border:1px solid #bbb;padding:5px 7px;font-size:10.5px;font-weight:700}
td{border:1px solid #ccc;padding:5px 7px;font-size:10.5px;vertical-align:top}
.tc{text-align:center}
.catatan{margin-top:10px;padding:8px;border:1px dashed #bbb;font-size:10px;color:#444;border-radius:3px}
.sign{display:grid;grid-template-columns:1fr 1fr 1fr;gap:16px;margin-top:28px}
.sign-box{text-align:center}
.sign-title{font-weight:700;font-size:10.5px;margin-bottom:42px}
.sign-line{border-top:1px solid #000;padding-top:4px;font-size:9.5px;color:#555}
.footer{text-align:center;font-size:9px;color:#999;margin-top:20px;border-top:1px solid #eee;padding-top:8px}
@media print{body{padding:6px}button{display:none}}
</style>
</head><body>
<div class="header">
  <div>
    <div class="brand">BungaNaik</div>
    <div class="brand-sub">Furniture Store</div>
  </div>
  <div>
    <div class="doc-title">PURCHASE ORDER</div>
    <div class="doc-no">No: <b>${data.nomor_po}</b></div>
    <div class="doc-no">Tgl PO: ${fmtDateOnly(data.tanggal_po)}</div>
    ${data.tanggal_estimasi ? `<div class="doc-no">Est. Selesai: <b>${fmtDateOnly(data.tanggal_estimasi)}</b></div>` : ""}
    <div class="doc-no" style="margin-top:4px"><span class="badge">${STATUS_CONFIG[data.status as POStatus]?.label || data.status}</span></div>
  </div>
</div>

<div class="info">
  <span class="lbl">Pemohon</span>
  <span class="val">${data.tipe_pemohon === "reseller" ? "Reseller" : "Customer"}: ${pemohon}</span>
  ${telepon ? `<span class="lbl">Telepon</span><span class="val">${telepon}</span>` : ""}
</div>

<table>
  <thead><tr>
    <th class="tc" style="width:28px">No</th>
    <th>Nama Barang / Spesifikasi</th>
    <th class="tc" style="width:45px">Qty</th>
    <th class="tc" style="width:55px">Satuan</th>
    <th>Keterangan</th>
  </tr></thead>
  <tbody>${rows}</tbody>
</table>

${data.catatan ? `<div class="catatan">Catatan: ${data.catatan}</div>` : ""}

<div class="sign">
  <div class="sign-box">
    <div class="sign-title">Admin Gudang</div>
    <div class="sign-line">( ................................. )<br>Admin Gudang</div>
  </div>
  <div class="sign-box">
    <div class="sign-title">Disetujui Oleh</div>
    <div class="sign-line">( ................................. )<br>Produksi</div>
  </div>
  <div class="sign-box">
    <div class="sign-title">Sopir</div>
    <div class="sign-line">( ................................. )<br>Sopir</div>
  </div>
</div>

<div class="footer">Dokumen ini dicetak oleh sistem BungaNaik · ${new Date().toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}</div>

<script>window.onload=function(){window.print();setTimeout(function(){window.close()},800)}</script>
</body></html>`);
		w.document.close();
	};

	// Filters
	const filtered = poList
		.filter((p) => filterStatus === "semua" || p.status === filterStatus)
		.filter((p) => filterKategori === "semua" || p.kategori_po === filterKategori)
		.filter((p) => {
			if (!filterDari && !filterSampai) return true;
			const d = p.tanggal_po;
			if (filterDari && d < filterDari) return false;
			if (filterSampai && d > filterSampai) return false;
			return true;
		})
		.filter((p) => {
			if (!search) return true;
			const q = search.toLowerCase();
			return (
				p.nomor_po?.toLowerCase().includes(q) ||
				p.reseller?.nama?.toLowerCase().includes(q) ||
				p.nama_customer?.toLowerCase().includes(q)
			);
		})
		.sort((a, b) => {
			const [tierA, valA] = urgencyRank(a);
			const [tierB, valB] = urgencyRank(b);
			return tierA !== tierB ? tierA - tierB : valA - valB;
		});

	// Summary
	const counts = {
		pending: poList.filter((p) => p.status === "pending").length,
		proses: poList.filter((p) => p.status === "proses").length,
		selesai: poList.filter((p) => p.status === "selesai").length,
		overdue: poList.filter(
			(p) => isOverdue(p.tanggal_estimasi, p.status),
		).length,
	};

	const filteredReseller = resellerList.filter((r) =>
		r.nama.toLowerCase().includes(formResellerSearch.toLowerCase()),
	);
	const filteredProduk = produkList.filter((p) =>
		p.nama.toLowerCase().includes(produkSearch.toLowerCase()),
	);

	const addItem = () =>
		setFormItems((prev) => [
			...prev,
			{ produk_id: null, nama_produk: "", jumlah: 1, satuan: "unit", keterangan: "" },
		]);

	const removeItem = (idx: number) =>
		setFormItems((prev) => prev.filter((_, i) => i !== idx));

	const updateItem = (idx: number, field: string, value: any) =>
		setFormItems((prev) =>
			prev.map((item, i) => (i === idx ? { ...item, [field]: value } : item)),
		);

	const selectProdukForItem = (idx: number, p: any) => {
		updateItem(idx, "produk_id", p.id);
		updateItem(idx, "nama_produk", p.nama);
		updateItem(idx, "satuan", p.satuan);
		setProdukSearch("");
		setShowProdukDrop(false);
	};

	return (
		<div>
			{/* Header */}
			<div className="flex items-center justify-between mb-6">
				<div>
					<h1 className="text-2xl font-bold text-gray-900">Purchase Order</h1>
					<p className="text-gray-500 mt-1">{poList.length} PO terdaftar</p>
				</div>
				<button
					onClick={openForm}
					className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition">
					<Plus size={16} /> Buat PO Baru
				</button>
			</div>

			{/* Summary cards */}
			<div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
				{[
					{ label: "Pending", value: counts.pending, icon: Clock, color: "text-gray-600 bg-gray-50", filter: "pending" as POStatus },
					{ label: "Diproses", value: counts.proses, icon: CircleDot, color: "text-blue-600 bg-blue-50", filter: "proses" as POStatus },
					{ label: "Selesai", value: counts.selesai, icon: CheckCircle2, color: "text-green-600 bg-green-50", filter: "selesai" as POStatus },
					{ label: "Terlambat", value: counts.overdue, icon: AlertCircle, color: "text-red-600 bg-red-50", filter: null },
				].map((card) => (
					<button
						key={card.label}
						onClick={() => card.filter && setFilterStatus(filterStatus === card.filter ? "semua" : card.filter)}
						className={`bg-white rounded-2xl p-4 shadow-sm border text-left transition hover:shadow-md ${
							filterStatus === card.filter ? "border-indigo-300 ring-1 ring-indigo-300" : "border-gray-100"
						}`}>
						<div className={`w-9 h-9 ${card.color} rounded-xl flex items-center justify-center mb-2`}>
							<card.icon size={18} />
						</div>
						<p className="text-2xl font-bold text-gray-900">{card.value}</p>
						<p className="text-sm text-gray-500 mt-0.5">{card.label}</p>
					</button>
				))}
			</div>

			{/* Filter bar */}
			<div className="flex flex-wrap gap-3 mb-5">
				<div className="relative flex-1 min-w-48">
					<Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
					<input
						value={search}
						onChange={(e) => setSearch(e.target.value)}
						placeholder="Cari nomor PO, reseller, customer..."
						className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
					/>
				</div>
				<input
					type="date"
					value={filterDari}
					onChange={(e) => setFilterDari(e.target.value)}
					className="px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
				/>
				<input
					type="date"
					value={filterSampai}
					onChange={(e) => setFilterSampai(e.target.value)}
					className="px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
				/>
				{(filterDari || filterSampai || filterStatus !== "semua" || filterKategori !== "semua" || search) && (
					<button
						onClick={() => { setSearch(""); setFilterDari(""); setFilterSampai(""); setFilterStatus("semua"); setFilterKategori("semua"); }}
						className="px-4 py-2.5 text-sm text-gray-500 hover:text-gray-700 border border-gray-200 rounded-xl hover:bg-gray-50 transition">
						Reset
					</button>
				)}
			</div>

			{/* Status tabs */}
			<div className="flex gap-2 mb-3 flex-wrap">
				{[
					{ v: "semua", label: "Semua" },
					{ v: "pending", label: "Pending" },
					{ v: "proses", label: "Diproses" },
					{ v: "selesai", label: "Selesai" },
					{ v: "batal", label: "Dibatalkan" },
				].map((tab) => (
					<button
						key={tab.v}
						onClick={() => setFilterStatus(tab.v as any)}
						className={`px-4 py-1.5 rounded-full text-xs font-semibold transition ${
							filterStatus === tab.v
								? "bg-indigo-600 text-white"
								: "bg-gray-100 text-gray-600 hover:bg-gray-200"
						}`}>
						{tab.label}
					</button>
				))}
			</div>

			{/* Kategori PO tabs */}
			<div className="flex items-center gap-2 mb-4 flex-wrap">
				<span className="text-xs text-gray-400 font-medium">Kategori PO:</span>
				{(["semua", ...Object.keys(KATEGORI_PO_CONFIG)] as Array<"semua" | KategoriPO>).map((k) => (
					<button
						key={k}
						onClick={() => setFilterKategori(k)}
						className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition ${
							filterKategori === k
								? "bg-indigo-600 text-white"
								: "bg-gray-100 text-gray-600 hover:bg-gray-200"
						}`}>
						{k === "semua" ? "Semua" : KATEGORI_PO_CONFIG[k].label}
					</button>
				))}
			</div>

			{/* PO List */}
			<div className="space-y-3">
				{loading ? (
					<div className="text-center py-12 text-gray-400">Memuat...</div>
				) : filtered.length === 0 ? (
					<div className="text-center py-16">
						<ClipboardList size={40} className="mx-auto text-gray-300 mb-3" />
						<p className="text-gray-500 font-medium">Belum ada Purchase Order</p>
					</div>
				) : (
					filtered.map((po) => {
						const overdue = isOverdue(po.tanggal_estimasi, po.status);
						const sc = STATUS_CONFIG[po.status as POStatus];
						const pemohon =
							po.tipe_pemohon === "reseller"
								? po.reseller?.nama || "-"
								: po.nama_customer || "-";
						return (
							<div
								key={po.id}
								className={`bg-white rounded-2xl p-5 shadow-sm border transition hover:shadow-md ${
									overdue ? "border-red-200 bg-red-50/30" : "border-gray-100"
								}`}>
								<div className="flex items-start gap-4">
									{/* Foto referensi PO */}
									<div className="w-28 h-28 rounded-xl overflow-hidden bg-gray-50 border border-gray-200 flex items-center justify-center flex-shrink-0">
										{po.foto_url ? (
											<button
												type="button"
												onClick={() => setLightboxSrc(po.foto_url)}
												className="w-full h-full block">
												<img
													src={po.foto_url}
													alt={`Foto referensi ${po.nomor_po}`}
													className="w-full h-full object-cover hover:opacity-90 transition"
												/>
											</button>
										) : (
											<ImageIcon size={26} className="text-gray-300" />
										)}
									</div>

									<div className="flex-1 min-w-0 flex items-start justify-between gap-3">
									<div className="flex-1 min-w-0">
										<div className="flex items-center gap-2.5 flex-wrap">
											<Link
											href={`/dashboard/po/${po.id}`}
											className="font-bold text-gray-900 hover:text-indigo-600 hover:underline">
											{po.nomor_po}
										</Link>
											<span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${sc?.color}`}>
												{sc?.label}
											</span>
											{(() => {
												const pc = PRIORITAS_CONFIG[(po.prioritas as POPrioritas) ?? "normal"];
												return (
													<span className={`text-xs px-2 py-0.5 rounded-full font-semibold flex items-center gap-1 ${pc.color}`}>
														<span className={`w-1.5 h-1.5 rounded-full ${pc.dot}`} />
														{pc.label}
													</span>
												);
											})()}
											{po.kategori_po && (
												<span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${KATEGORI_PO_CONFIG[po.kategori_po as KategoriPO]?.color}`}>
													{KATEGORI_PO_CONFIG[po.kategori_po as KategoriPO]?.label}
												</span>
											)}
											{overdue && (
												<span className="text-xs px-2 py-0.5 rounded-full font-semibold bg-red-100 text-red-600 flex items-center gap-1">
													<AlertCircle size={10} /> Terlambat
												</span>
											)}
										</div>
										<div className="flex items-center gap-4 mt-2 flex-wrap text-sm text-gray-600">
											<span className="flex items-center gap-1.5">
												{po.tipe_pemohon === "reseller" ? (
													<Users size={13} className="text-indigo-500" />
												) : (
													<User size={13} className="text-purple-500" />
												)}
												<span className="font-medium text-gray-800">{pemohon}</span>
												<span className="text-xs text-gray-400 capitalize">
													({po.tipe_pemohon})
												</span>
											</span>
											<span className="flex items-center gap-1.5 text-gray-500">
												<Calendar size={13} />
												PO: {fmtDateOnly(po.tanggal_po)}
											</span>
											{po.tanggal_estimasi && (
												<span className={`flex items-center gap-1.5 text-xs font-medium ${overdue ? "text-red-600" : "text-gray-500"}`}>
													<Clock size={12} />
													Est: {fmtDateOnly(po.tanggal_estimasi)}
													<span className={`px-1.5 py-0.5 rounded-full text-[10px] ${overdue ? "bg-red-100 text-red-600" : "bg-gray-100 text-gray-500"}`}>
														{daysUntil(po.tanggal_estimasi)}
													</span>
												</span>
											)}
											{po.status !== "pending" && (
												po.nama_tukang ? (
													<span className="flex items-center gap-1.5 text-xs font-medium text-gray-500">
														<Wrench size={12} />
														Tukang: {po.nama_tukang}
													</span>
												) : (
													<span className="flex items-center gap-1.5 text-xs font-medium text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-full">
														<Wrench size={11} />
														Tukang belum diisi
													</span>
												)
											)}
										</div>
										{(po.items || []).length > 0 && (
											<div className="mt-2.5 space-y-1">
												{(po.items || []).map((item: any) => (
													<p key={item.id} className="text-sm text-gray-700 flex items-center gap-1.5">
														<Package size={12} className="text-gray-400 flex-shrink-0" />
														<span className="font-medium">{item.nama_produk}</span>
														<span className="text-gray-400">— {item.jumlah} {item.satuan}</span>
													</p>
												))}
											</div>
										)}
										{po.catatan && (
											<p className="text-xs text-gray-400 mt-1.5 line-clamp-1">
												📝 {po.catatan}
											</p>
										)}
									</div>

									<div className="flex items-center gap-2 flex-shrink-0">
										{/* Tombol Progress */}
										<button
											onClick={() => openProgress(po)}
											className="px-3 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 rounded-lg text-xs font-semibold transition flex items-center gap-1">
											<Activity size={12} /> Progress
										</button>

										{/* Status quick actions */}
										{po.status === "pending" && (
											<button
												onClick={() => openMulaiProses(po)}
												className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold transition">
												Mulai Proses
											</button>
										)}
										{po.status === "proses" && (
											<button
												onClick={() => openSelesai(po.id)}
												className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-xs font-semibold transition">
												Tandai Selesai
											</button>
										)}

										{/* Dropdown menu */}
										<div className="relative">
											<button
												onClick={() => setActionMenu(actionMenu === po.id ? null : po.id)}
												className="p-2 hover:bg-gray-100 rounded-lg text-gray-500 transition">
												<MoreVertical size={16} />
											</button>
											{actionMenu === po.id && (
												<>
													<div className="fixed inset-0 z-10" onClick={() => setActionMenu(null)} />
													<div className="absolute right-0 top-9 z-20 bg-white border border-gray-200 rounded-xl shadow-lg py-1 w-44 text-sm">
														<button
															onClick={() => { router.push(`/dashboard/po/${po.id}`); setActionMenu(null); }}
															className="w-full flex items-center gap-2.5 px-4 py-2 hover:bg-gray-50 text-gray-700">
															<ClipboardList size={14} /> Lihat Detail
														</button>
														<button
															onClick={() => { printPOById(po.id); setActionMenu(null); }}
															className="w-full flex items-center gap-2.5 px-4 py-2 hover:bg-gray-50 text-gray-700">
															<Printer size={14} /> Cetak PO
														</button>
														{canEditPO && (
															<button
																onClick={() => { openEdit(po.id); setActionMenu(null); }}
																className="w-full flex items-center gap-2.5 px-4 py-2 hover:bg-gray-50 text-gray-700">
																<Edit size={14} /> Edit PO
															</button>
														)}
														{po.status !== "batal" && po.status !== "selesai" && (
																					<>
																												<div className="my-1 border-t border-gray-100" />
																												<p className="px-4 py-1 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Prioritas</p>
																												{(Object.keys(PRIORITAS_CONFIG) as POPrioritas[]).map((pk) => {
																													const pc = PRIORITAS_CONFIG[pk];
																													const active = (po.prioritas ?? "normal") === pk;
																													return (
																														<button key={pk}
																															onClick={() => { updatePrioritas(po.id, pk); setActionMenu(null); }}
																															className={'w-full flex items-center gap-2.5 px-4 py-2 text-sm transition ' + (active ? "bg-gray-50 font-semibold" : "hover:bg-gray-50")}>
																															<span className={'w-2 h-2 rounded-full flex-shrink-0 ' + pc.dot} />
																															<span className={active ? "text-gray-900" : "text-gray-600"}>{pc.label}</span>
																															{active && <span className="ml-auto text-indigo-500 text-xs">✓</span>}
																														</button>
																													);
																												})}
																												<div className="my-1 border-t border-gray-100" />
																												<button
																													onClick={() => { updateStatus(po.id, "batal"); setActionMenu(null); }}
																													className="w-full flex items-center gap-2.5 px-4 py-2 hover:bg-orange-50 text-orange-600">
																													<XCircle size={14} /> Batalkan
																												</button>
																					</>
																				)}
																				<div className="my-1 border-t border-gray-100" />
														<button
															onClick={() => { hapusPO(po.id); setActionMenu(null); }}
															className="w-full flex items-center gap-2.5 px-4 py-2 hover:bg-red-50 text-red-500">
															<Trash2 size={14} /> Hapus
														</button>
													</div>
												</>
											)}
										</div>
									</div>
									</div>
								</div>
							</div>
						);
					})
				)}
			</div>

			{/* ─── MODAL MULAI PROSES + TUKANG ─── */}
			{modalMulaiProses && (
				<div className="fixed inset-0 bg-black/40 z-[60] flex items-center justify-center p-4">
					<div className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
						<div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
							<div>
								<h3 className="font-semibold text-gray-900">Mulai Proses PO</h3>
								<p className="text-sm text-gray-400 mt-0.5">{modalMulaiProses.nomor_po}</p>
							</div>
							<button
								onClick={() => setModalMulaiProses(null)}
								className="p-2 hover:bg-gray-100 rounded-lg">
								<X size={18} />
							</button>
						</div>

						<div className="p-6 space-y-3">
							<label className="block text-sm font-medium text-gray-700">
								Nama Tukang yang Mengerjakan
							</label>
							<input
								value={tukangInput}
								onChange={(e) => setTukangInput(e.target.value)}
								autoFocus
								placeholder="Contoh: Pak Slamet (opsional, bisa diisi belakangan)"
								className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
							/>
							<p className="text-xs text-gray-400">
								Boleh dikosongkan dulu — bisa diisi/diedit nanti dari halaman detail PO.
							</p>
						</div>

						<div className="flex gap-3 px-6 pb-6">
							<button
								onClick={() => setModalMulaiProses(null)}
								className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition">
								Batal
							</button>
							<button
								onClick={submitMulaiProses}
								disabled={mulaiProsesLoading}
								className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white rounded-xl text-sm font-semibold transition">
								{mulaiProsesLoading ? "Memproses..." : "Mulai Proses"}
							</button>
						</div>
					</div>
				</div>
			)}

			{/* ─── MODAL SELESAI + STOK ─── */}
			{modalSelesai && (
				<div className="fixed inset-0 bg-black/40 z-[60] flex items-center justify-center p-4">
					<div className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
						<div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
							<div>
								<h3 className="font-semibold text-gray-900">Selesaikan PO</h3>
								<p className="text-sm text-gray-400 mt-0.5">{modalSelesai.nomor_po}</p>
							</div>
							<button
								onClick={() => setModalSelesai(null)}
								className="p-2 hover:bg-gray-100 rounded-lg">
								<X size={18} />
							</button>
						</div>

						<div className="p-6 space-y-4">
							{/* Toggle masuk stok */}
							<button
								onClick={() => setSelesaiMasukStok(!selesaiMasukStok)}
								className={`w-full flex items-center justify-between px-4 py-3.5 rounded-xl border-2 transition ${
									selesaiMasukStok
										? "border-green-500 bg-green-50"
										: "border-gray-200 bg-gray-50"
								}`}>
								<div className="flex items-center gap-3 text-left">
									<div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${selesaiMasukStok ? "bg-green-100" : "bg-gray-100"}`}>
										<Package size={18} className={selesaiMasukStok ? "text-green-600" : "text-gray-400"} />
									</div>
									<div>
										<p className={`text-sm font-semibold ${selesaiMasukStok ? "text-green-800" : "text-gray-600"}`}>
											Tambahkan item ke stok
										</p>
										<p className="text-xs text-gray-400 mt-0.5">
											Stok produk terhubung akan otomatis bertambah
										</p>
									</div>
								</div>
								<div className={`w-11 h-6 rounded-full transition-colors flex-shrink-0 ${selesaiMasukStok ? "bg-green-500" : "bg-gray-300"}`}>
									<div className={`w-5 h-5 bg-white rounded-full shadow-sm mt-0.5 transition-transform ${selesaiMasukStok ? "translate-x-5" : "translate-x-0.5"}`} />
								</div>
							</button>

							{/* Preview item */}
							{selesaiMasukStok && (
								<div className="space-y-2">
									<p className="text-xs font-semibold text-gray-500 uppercase tracking-wide px-1">
										Preview perubahan stok
									</p>
									{(modalSelesai.items || []).map((item: any) => {
										const linked = item.produk_id && item.produk;
										const stokLama = item.produk?.stok ?? 0;
										const stokBaru = stokLama + item.jumlah;
										return (
											<div
												key={item.id}
												className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm ${
													linked ? "bg-green-50 border border-green-100" : "bg-gray-50 border border-gray-100"
												}`}>
												<div className="flex-1 min-w-0">
													<p className="font-medium text-gray-900 truncate">
														{item.nama_produk}
													</p>
													{!linked && (
														<p className="text-xs text-amber-500 mt-0.5 flex items-center gap-1">
															<AlertCircle size={11} />
															Tidak terhubung ke produk — stok tidak diubah
														</p>
													)}
												</div>
												{linked ? (
													<div className="flex items-center gap-2 flex-shrink-0 text-sm">
														<span className="text-gray-400">{stokLama}</span>
														<span className="text-gray-300">→</span>
														<span className="font-bold text-green-600">
															{stokBaru}
														</span>
														<span className="text-xs text-gray-400">{item.satuan}</span>
													</div>
												) : (
													<span className="text-xs text-gray-400 flex-shrink-0">Dilewati</span>
												)}
											</div>
										);
									})}
									{(modalSelesai.items || []).filter((i: any) => i.produk_id && i.produk).length === 0 && (
										<div className="px-4 py-3 bg-amber-50 border border-amber-100 rounded-xl text-sm text-amber-700 flex items-center gap-2">
											<AlertCircle size={15} />
											Tidak ada item yang terhubung ke produk
										</div>
									)}
								</div>
							)}
						</div>

						<div className="flex gap-3 px-6 pb-6">
							<button
								onClick={() => setModalSelesai(null)}
								className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition">
								Batal
							</button>
							<button
								onClick={handleSelesaikan}
								disabled={selesaiLoading}
								className="flex-1 py-2.5 bg-green-600 hover:bg-green-700 disabled:bg-green-300 text-white rounded-xl text-sm font-semibold transition flex items-center justify-center gap-2">
								<CheckCircle2 size={15} />
								{selesaiLoading
									? "Memproses..."
									: selesaiMasukStok
									? "Selesai + Tambah Stok"
									: "Selesai Saja"}
							</button>
						</div>
					</div>
				</div>
			)}

			{/* ─── MODAL FORM ─── */}
			{(modal === "form" || modal === "edit") && (
				<div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
					<div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl max-h-[90vh] flex flex-col">
						<div className="flex items-center justify-between p-6 border-b border-gray-100">
							<h2 className="text-lg font-semibold">
								{modal === "edit" ? "Edit Purchase Order" : "Buat Purchase Order Baru"}
							</h2>
							<button onClick={() => setModal(null)} className="p-2 hover:bg-gray-100 rounded-lg">
								<X size={18} />
							</button>
						</div>

						<div className="flex-1 overflow-y-auto p-6 space-y-5">
							{/* Tipe pemohon */}
							<div>
								<label className="block text-sm font-medium text-gray-700 mb-2">
									Tipe Pemohon
								</label>
								<div className="flex gap-2">
									{(["reseller", "customer"] as TipePemohon[]).map((t) => (
										<button
											key={t}
											onClick={() => setFormTipe(t)}
											className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium border-2 transition ${
												formTipe === t
													? "border-indigo-600 bg-indigo-50 text-indigo-700"
													: "border-gray-200 text-gray-600 hover:bg-gray-50"
											}`}>
											{t === "reseller" ? <Users size={15} /> : <User size={15} />}
											{t === "reseller" ? "Reseller" : "Customer Umum"}
										</button>
									))}
								</div>
							</div>

							{/* Pemohon detail */}
							{formTipe === "reseller" ? (
								<div className="relative">
									<label className="block text-sm font-medium text-gray-700 mb-1">
										Reseller *
									</label>
									<input
										value={formResellerSearch}
										onChange={(e) => { setFormResellerSearch(e.target.value); setShowResellerDrop(true); setFormResellerId(""); }}
										onFocus={() => setShowResellerDrop(true)}
										placeholder="Cari reseller..."
										className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
									/>
									{showResellerDrop && filteredReseller.length > 0 && (
										<>
											<div className="fixed inset-0 z-10" onClick={() => setShowResellerDrop(false)} />
											<div className="absolute z-20 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-40 overflow-y-auto">
												{filteredReseller.slice(0, 6).map((r) => (
													<button
														key={r.id}
														onClick={() => { setFormResellerId(r.id); setFormResellerSearch(r.nama); setShowResellerDrop(false); }}
														className="w-full text-left px-4 py-2.5 hover:bg-indigo-50 text-sm">
														<p className="font-medium text-gray-900">{r.nama}</p>
														{r.telepon && <p className="text-xs text-gray-400">{r.telepon}</p>}
													</button>
												))}
											</div>
										</>
									)}
								</div>
							) : (
								<div className="grid grid-cols-2 gap-3">
									<div>
										<label className="block text-sm font-medium text-gray-700 mb-1">
											Nama Customer *
										</label>
										<input
											value={formNamaCustomer}
											onChange={(e) => setFormNamaCustomer(e.target.value)}
											placeholder="Nama lengkap"
											className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
										/>
									</div>
									<div>
										<label className="block text-sm font-medium text-gray-700 mb-1">
											Telepon
										</label>
										<input
											value={formTeleponCustomer}
											onChange={(e) => setFormTeleponCustomer(e.target.value)}
											placeholder="08xx..."
											className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
										/>
									</div>
								</div>
							)}

							{/* Tanggal */}
							<div className="grid grid-cols-2 gap-3">
								<div>
									<label className="block text-sm font-medium text-gray-700 mb-1">
										Tanggal PO *
									</label>
									<input
										type="date"
										value={formTanggalPO}
										onChange={(e) => setFormTanggalPO(e.target.value)}
										className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
									/>
								</div>
								<div>
									<label className="block text-sm font-medium text-gray-700 mb-1">
										Estimasi Selesai
									</label>
									<input
										type="date"
										value={formTanggalEstimasi}
										onChange={(e) => setFormTanggalEstimasi(e.target.value)}
										min={formTanggalPO}
										className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
									/>
								</div>
							</div>

							{/* Prioritas */}
							<div>
								<label className="block text-sm font-medium text-gray-700 mb-2">Prioritas Pengerjaan</label>
								<div className="grid grid-cols-4 gap-2">
									{(Object.keys(PRIORITAS_CONFIG) as POPrioritas[]).map((pk) => {
										const pc = PRIORITAS_CONFIG[pk];
										const active = formPrioritas === pk;
										return (
											<button key={pk} type="button" onClick={() => setFormPrioritas(pk)}
												className={`flex flex-col items-center gap-1.5 px-2 py-2.5 rounded-xl border-2 text-xs font-semibold transition ${
													active ? "border-indigo-500 bg-indigo-50 text-indigo-700" : "border-gray-200 text-gray-500 hover:border-gray-300"
												}`}>
												<span className={`w-3 h-3 rounded-full ${pc.dot}`} />
												{pc.label}
											</button>
										);
									})}
								</div>
							</div>

							{/* Kategori PO */}
							<div>
								<label className="block text-sm font-medium text-gray-700 mb-2">Kategori PO</label>
								<div className="grid grid-cols-4 gap-2">
									{(Object.keys(KATEGORI_PO_CONFIG) as KategoriPO[]).map((kk) => {
										const kc = KATEGORI_PO_CONFIG[kk];
										const active = formKategori === kk;
										return (
											<button key={kk} type="button" onClick={() => setFormKategori(kk)}
												className={`px-2 py-2.5 rounded-xl border-2 text-xs font-semibold transition ${
													active ? "border-indigo-500 bg-indigo-50 text-indigo-700" : "border-gray-200 text-gray-500 hover:border-gray-300"
												}`}>
												{kc.label}
											</button>
										);
									})}
								</div>
							</div>

							{/* Items */}
							<div>
								<div className="flex items-center justify-between mb-2">
									<label className="text-sm font-medium text-gray-700">
										Item yang Dipesan *
									</label>
									<button
										onClick={addItem}
										className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-700 font-medium">
										<Plus size={13} /> Tambah Baris
									</button>
								</div>

								<div className="space-y-3">
									{formItems.map((item, idx) => (
										<div
											key={idx}
											className="bg-gray-50 rounded-xl p-3 space-y-2 border border-gray-100">
											<div className="flex gap-2">
												{/* Product search / free text */}
												<div className="relative flex-1">
													<input
														value={item.nama_produk}
														onChange={(e) => { updateItem(idx, "nama_produk", e.target.value); updateItem(idx, "produk_id", null); }}
														onFocus={() => { setProdukSearch(item.nama_produk); setShowProdukDrop(true); }}
														placeholder="Cari produk atau ketik nama barang..."
														className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
													/>
													{showProdukDrop && filteredProduk.length > 0 && (
														<>
															<div className="fixed inset-0 z-10" onClick={() => setShowProdukDrop(false)} />
															<div className="absolute z-20 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-36 overflow-y-auto">
																{filteredProduk.slice(0, 6).map((p) => (
																	<button
																		key={p.id}
																		onClick={() => selectProdukForItem(idx, p)}
																		className="w-full text-left px-3 py-2 hover:bg-indigo-50 text-sm">
																		{p.nama}{" "}
																		<span className="text-gray-400 text-xs">/ {p.satuan}</span>
																	</button>
																))}
															</div>
														</>
													)}
												</div>
												<input
													type="number"
													value={item.jumlah}
													min={1}
													onChange={(e) => updateItem(idx, "jumlah", Number(e.target.value))}
													className="w-20 px-3 py-2 border border-gray-200 rounded-lg text-sm text-center focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
												/>
												<input
													value={item.satuan}
													onChange={(e) => updateItem(idx, "satuan", e.target.value)}
													className="w-20 px-3 py-2 border border-gray-200 rounded-lg text-sm text-center focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
													placeholder="Satuan"
												/>
												{formItems.length > 1 && (
													<button
														onClick={() => removeItem(idx)}
														className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition">
														<X size={14} />
													</button>
												)}
											</div>
											<input
												value={item.keterangan}
												onChange={(e) => updateItem(idx, "keterangan", e.target.value)}
												placeholder="Keterangan / spesifikasi (opsional)"
												className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
											/>
										</div>
									))}
								</div>
							</div>

							{/* Catatan */}
							<div>
								<label className="block text-sm font-medium text-gray-700 mb-1">
									Catatan
								</label>
								<textarea
									value={formCatatan}
									onChange={(e) => setFormCatatan(e.target.value)}
									rows={2}
									placeholder="Catatan tambahan untuk PO ini..."
									className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
								/>
							</div>

							{/* Foto referensi */}
							<div>
								<label className="block text-sm font-medium text-gray-700 mb-1">
									Foto Referensi (opsional)
								</label>
								<input
									type="file"
									accept="image/*"
									onChange={(e) => {
										const f = e.target.files?.[0] ?? null;
										setFormFotoFile(f);
										setFormFotoPreview(f ? URL.createObjectURL(f) : null);
									}}
									className="w-full text-sm text-gray-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-medium file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
								/>
								{formFotoPreview && (
									<div className="mt-2 relative w-fit">
										<img src={formFotoPreview} alt="Preview" className="h-24 w-36 object-cover rounded-xl border border-gray-200" />
										<button
											onClick={() => { setFormFotoFile(null); setFormFotoPreview(null); }}
											className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center text-xs hover:bg-red-600">
											<X size={10} />
										</button>
									</div>
								)}
							</div>

							{formError && (
								<div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
									<AlertCircle size={15} />
									{formError}
								</div>
							)}
						</div>

						<div className="flex gap-3 p-6 pt-0 border-t border-gray-100 mt-0">
							<button
								onClick={() => setModal(null)}
								className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium hover:bg-gray-50 transition">
								Batal
							</button>
							<button
								onClick={modal === "edit" ? saveEditPO : savePO}
								disabled={saving}
								className="flex-1 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white rounded-xl text-sm font-medium transition">
								{saving
									? "Menyimpan..."
									: modal === "edit"
										? "Simpan Perubahan"
										: "Simpan PO"}
							</button>
						</div>
					</div>
				</div>
			)}

			{/* ─── MODAL PROGRESS PO ─── */}
			{modalProgress && (
				<div className="fixed inset-0 bg-black/40 z-[70] flex items-center justify-center p-4">
					<div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl max-h-[90vh] flex flex-col">
						<div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
							<div>
								<h3 className="font-semibold text-gray-900 flex items-center gap-2">
									<Activity size={16} className="text-purple-600" />
									Progress Produksi
								</h3>
								<p className="text-sm text-gray-400 mt-0.5">{modalProgress.nomor_po}</p>
							</div>
							<button onClick={() => setModalProgress(null)} className="p-2 hover:bg-gray-100 rounded-lg">
								<X size={18} />
							</button>
						</div>

						<div className="flex-1 overflow-y-auto p-6 space-y-6">
							{/* Progress bar terbaru */}
							{progressList.length > 0 && (() => {
								const latest = progressList[0];
								const pct = latest.persentase ?? 0;
								return (
									<div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
										<div className="flex items-center justify-between mb-2">
											<span className="text-sm font-semibold text-gray-700">Progress Terkini</span>
											<span className={`text-lg font-bold ${pct >= 100 ? "text-green-600" : "text-blue-600"}`}>
												{pct}%
											</span>
										</div>
										<div className="h-3 bg-gray-200 rounded-full overflow-hidden">
											<div
												className={`h-full rounded-full transition-all ${pct >= 100 ? "bg-green-500" : "bg-blue-500"}`}
												style={{ width: `${Math.min(pct, 100)}%` }}
											/>
										</div>
										<p className="text-xs text-gray-400 mt-1.5">{latest.keterangan}</p>
									</div>
								);
							})()}

							{/* Riwayat */}
							<div>
								<p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Riwayat Update</p>
								{progressLoading ? (
									<p className="text-sm text-gray-400 text-center py-4">Memuat...</p>
								) : progressList.length === 0 ? (
									<p className="text-sm text-gray-400 text-center py-6">Belum ada progress dicatat</p>
								) : (
									<div className="space-y-3">
										{progressList.map((prog) => (
											<div key={prog.id} className="flex gap-3 bg-gray-50 rounded-xl p-3 border border-gray-100">
												<div className={`flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold ${
													prog.persentase >= 100 ? "bg-green-100 text-green-700" : "bg-blue-100 text-blue-700"
												}`}>
													{prog.persentase}%
												</div>
												<div className="flex-1 min-w-0">
													<div className="flex items-center gap-2 flex-wrap">
														<span className="text-xs text-gray-500">
															{new Date(prog.tanggal).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}
														</span>
														{prog.creator?.name && <span className="text-xs text-gray-400">· {prog.creator.name}</span>}
													</div>
													<p className="text-sm text-gray-700 mt-0.5">{prog.keterangan}</p>
													{prog.foto_url && (
														<button
															type="button"
															onClick={() => setLightboxSrc(prog.foto_url)}>
															<img src={prog.foto_url} alt="Foto progress" className="mt-2 h-20 w-28 object-cover rounded-lg border border-gray-200 hover:opacity-80 transition" />
														</button>
													)}
												</div>
											</div>
										))}
									</div>
								)}
							</div>

							{/* Form tambah progress */}
							{canAddProgress && (
								<div className="border-t border-gray-100 pt-5 space-y-4">
									<p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Tambah Update Progress</p>

									<div className="grid grid-cols-2 gap-3">
										<div>
											<label className="block text-xs font-medium text-gray-600 mb-1">Tanggal</label>
											<input
												type="date"
												value={progTanggal}
												onChange={(e) => setProgTanggal(e.target.value)}
												className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
											/>
										</div>
										<div>
											<label className="block text-xs font-medium text-gray-600 mb-1">
												Persentase: <span className="font-bold text-purple-700">{progPersen}%</span>
											</label>
											<input
												type="range" min={0} max={100} step={5}
												value={progPersen}
												onChange={(e) => setProgPersen(Number(e.target.value))}
												className="w-full mt-2 accent-purple-600"
											/>
										</div>
									</div>

									<div>
										<label className="block text-xs font-medium text-gray-600 mb-1">Keterangan *</label>
										<textarea
											value={progKeterangan}
											onChange={(e) => setProgKeterangan(e.target.value)}
											rows={2}
											placeholder="Deskripsi update progress hari ini..."
											className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
										/>
									</div>

									<div>
										<label className="block text-xs font-medium text-gray-600 mb-1">Foto (opsional)</label>
										<input
											type="file"
											accept="image/*"
											onChange={(e) => {
												const f = e.target.files?.[0] ?? null;
												setProgFotoFile(f);
												setProgFotoPreview(f ? URL.createObjectURL(f) : null);
											}}
											className="w-full text-sm text-gray-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-medium file:bg-purple-50 file:text-purple-700 hover:file:bg-purple-100"
										/>
										{progFotoPreview && (
											<div className="mt-2 relative w-fit">
												<img src={progFotoPreview} alt="Preview" className="h-24 w-36 object-cover rounded-xl border border-gray-200" />
												<button
													onClick={() => { setProgFotoFile(null); setProgFotoPreview(null); }}
													className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center text-xs hover:bg-red-600">
													<X size={10} />
												</button>
											</div>
										)}
									</div>

									{progError && (
										<div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 px-3 py-2.5 rounded-xl text-sm">
											<AlertCircle size={14} /> {progError}
										</div>
									)}

									<button
										onClick={saveProgress}
										disabled={progSaving}
										className="w-full py-2.5 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-300 text-white rounded-xl text-sm font-semibold transition flex items-center justify-center gap-2">
										<TrendingUp size={15} />
										{progSaving ? "Menyimpan..." : "Simpan Progress"}
									</button>
								</div>
							)}
						</div>
					</div>
				</div>
			)}

			{/* ── Lightbox Foto ── */}
			{lightboxSrc && (
				<div
					className="fixed inset-0 bg-black/90 z-[60] flex items-center justify-center p-4"
					onClick={() => setLightboxSrc(null)}>
					<button
						onClick={() => setLightboxSrc(null)}
						className="absolute top-4 right-4 text-white/70 hover:text-white">
						<X size={28} />
					</button>
					<img
						src={lightboxSrc}
						alt=""
						className="max-w-full max-h-full object-contain rounded-lg"
					/>
				</div>
			)}
		</div>
	);
}
