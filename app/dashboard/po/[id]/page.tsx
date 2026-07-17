"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { formatDateOnly, waLink } from "@/lib/utils";
import {
	ArrowLeft,
	Printer,
	Trash2,
	Clock,
	CheckCircle2,
	XCircle,
	CircleDot,
	AlertCircle,
	Calendar,
	User,
	Users,
	Package,
	MessageCircle,
	Image as ImageIcon,
	TrendingUp,
	Activity,
	X,
	Pencil,
	Check,
} from "lucide-react";

type POStatus = "pending" | "proses" | "selesai" | "batal";
type POPrioritas = "rendah" | "normal" | "tinggi" | "urgent";

const STATUS_CONFIG: Record<
	POStatus,
	{ label: string; color: string; icon: any }
> = {
	pending: {
		label: "Pending",
		color: "bg-gray-100 text-gray-600",
		icon: Clock,
	},
	proses: {
		label: "Diproses",
		color: "bg-blue-100 text-blue-700",
		icon: CircleDot,
	},
	selesai: {
		label: "Selesai",
		color: "bg-green-100 text-green-700",
		icon: CheckCircle2,
	},
	batal: {
		label: "Dibatalkan",
		color: "bg-red-100 text-red-600",
		icon: XCircle,
	},
};

const PRIORITAS_CONFIG: Record<
	POPrioritas,
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

type KategoriPO = "pabrik" | "premium" | "semi_premium" | "jati";

const KATEGORI_PO_CONFIG: Record<KategoriPO, { label: string; color: string }> =
	{
		pabrik: { label: "Pabrik", color: "bg-slate-100 text-slate-600" },
		premium: { label: "Premium", color: "bg-amber-100 text-amber-700" },
		semi_premium: { label: "Semi Premium", color: "bg-cyan-100 text-cyan-700" },
		jati: { label: "Jati", color: "bg-orange-100 text-orange-700" },
	};

const PO_ROLES = [
	"superadmin",
	"cs",
	"gudang",
	"kurir",
	"keuangan",
	"kasir",
];
const PO_EDIT_ROLES = ["superadmin", "keuangan", "cs", "kasir", "gudang"];

function isOverdue(tanggal_estimasi: string | null, status: POStatus) {
	if (!tanggal_estimasi || status === "selesai" || status === "batal")
		return false;
	return new Date(tanggal_estimasi) < new Date(new Date().toDateString());
}

function daysUntil(dateStr: string) {
	const diff = Math.ceil(
		(new Date(dateStr).getTime() -
			new Date(new Date().toDateString()).getTime()) /
			86400000,
	);
	if (diff === 0) return "Hari ini";
	if (diff < 0) return `${Math.abs(diff)} hari lalu`;
	return `${diff} hari lagi`;
}

export default function PODetailPage() {
	const { id } = useParams<{ id: string }>();
	const { profile, role, loading: authLoading } = useAuth();
	const router = useRouter();
	const supabase = createClient();

	useEffect(() => {
		if (!authLoading && !PO_ROLES.includes(role ?? ""))
			router.replace("/dashboard");
	}, [role, authLoading, router]);

	const canEditPO = PO_EDIT_ROLES.includes(role ?? "");

	const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);
	const [po, setPo] = useState<any | null>(null);
	const [fotoMap, setFotoMap] = useState<Record<string, string>>({});
	const [loading, setLoading] = useState(true);

	const [modalSelesai, setModalSelesai] = useState(false);
	const [selesaiMasukStok, setSelesaiMasukStok] = useState(true);
	const [selesaiLoading, setSelesaiLoading] = useState(false);

	const canAddProgress = role === "gudang" || role === "superadmin";
	const [progressList, setProgressList] = useState<any[]>([]);
	const [progressLoading, setProgressLoading] = useState(false);
	const [progTanggal, setProgTanggal] = useState("");
	const [progPersen, setProgPersen] = useState(0);
	const [progKeterangan, setProgKeterangan] = useState("");
	const [progFotoFile, setProgFotoFile] = useState<File | null>(null);
	const [progFotoPreview, setProgFotoPreview] = useState<string | null>(null);
	const [progSaving, setProgSaving] = useState(false);
	const [progError, setProgError] = useState("");

	// Edit foto referensi PO
	const [uploadingFoto, setUploadingFoto] = useState(false);

	// Edit tanggal estimasi selesai
	const [editingEstimasi, setEditingEstimasi] = useState(false);
	const [estimasiValue, setEstimasiValue] = useState("");
	const [savingEstimasi, setSavingEstimasi] = useState(false);

	// Edit nama barang per item
	const [editingItemId, setEditingItemId] = useState<string | null>(null);
	const [editItemName, setEditItemName] = useState("");
	const [savingItem, setSavingItem] = useState(false);

	// Edit nama tukang
	const [editingTukang, setEditingTukang] = useState(false);
	const [tukangValue, setTukangValue] = useState("");
	const [savingTukang, setSavingTukang] = useState(false);

	// Modal mulai proses + input tukang
	const [modalMulaiProses, setModalMulaiProses] = useState(false);
	const [tukangInput, setTukangInput] = useState("");
	const [mulaiProsesLoading, setMulaiProsesLoading] = useState(false);

	const load = useCallback(async () => {
		const { data } = await supabase
			.from("purchase_orders")
			.select(
				"*, reseller:resellers(*), creator:profiles(name), items:purchase_order_items(*, produk:produk(id, nama, satuan, foto_url, stok))",
			)
			.eq("id", id)
			.single();
		setPo(data);

		const produkIds = (data?.items || [])
			.map((i: any) => i.produk_id)
			.filter((v: string | null): v is string => !!v);
		if (produkIds.length) {
			const { data: fotos } = await supabase
				.from("produk_foto")
				.select("produk_id, url")
				.in("produk_id", produkIds)
				.order("urutan");
			const map: Record<string, string> = {};
			(fotos || []).forEach((f: any) => {
				if (!map[f.produk_id]) map[f.produk_id] = f.url;
			});
			setFotoMap(map);
		}
		setLoading(false);
	}, [id]);

	const loadProgress = useCallback(async () => {
		setProgressLoading(true);
		const { data } = await supabase
			.from("po_progress")
			.select("*, creator:profiles(name)")
			.eq("po_id", id)
			.order("tanggal", { ascending: false });
		setProgressList(data || []);
		setProgressLoading(false);
	}, [id]);

	useEffect(() => {
		load();
		loadProgress();
		setProgTanggal(new Date().toISOString().split("T")[0]);
	}, [load, loadProgress]);

	if (authLoading || !PO_ROLES.includes(role ?? "")) return null;

	const updateStatus = async (status: POStatus) => {
		await supabase.from("purchase_orders").update({ status }).eq("id", id);
		setPo((p: any) => ({ ...p, status }));
	};

	const updatePrioritas = async (prioritas: POPrioritas) => {
		await supabase.from("purchase_orders").update({ prioritas }).eq("id", id);
		setPo((p: any) => ({ ...p, prioritas }));
	};

	const updateKategori = async (kategori_po: KategoriPO) => {
		await supabase.from("purchase_orders").update({ kategori_po }).eq("id", id);
		setPo((p: any) => ({ ...p, kategori_po }));
	};

	const handleFotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (!file) return;
		setUploadingFoto(true);
		const ext = file.name.split(".").pop();
		const path = `po-foto/${id}/${Date.now()}.${ext}`;
		const { error: upErr } = await supabase.storage
			.from("BungaNaik")
			.upload(path, file);
		if (!upErr) {
			const { data: urlData } = supabase.storage
				.from("BungaNaik")
				.getPublicUrl(path);
			await supabase
				.from("purchase_orders")
				.update({ foto_url: urlData.publicUrl })
				.eq("id", id);
			setPo((p: any) => ({ ...p, foto_url: urlData.publicUrl }));
		}
		setUploadingFoto(false);
		e.target.value = "";
	};

	const saveEstimasi = async () => {
		setSavingEstimasi(true);
		const { error } = await supabase
			.from("purchase_orders")
			.update({ tanggal_estimasi: estimasiValue || null })
			.eq("id", id);
		if (!error)
			setPo((p: any) => ({ ...p, tanggal_estimasi: estimasiValue || null }));
		setSavingEstimasi(false);
		setEditingEstimasi(false);
	};

	const saveTukang = async () => {
		setSavingTukang(true);
		const nama_tukang = tukangValue.trim() || null;
		const { error } = await supabase
			.from("purchase_orders")
			.update({ nama_tukang })
			.eq("id", id);
		if (!error) setPo((p: any) => ({ ...p, nama_tukang }));
		setSavingTukang(false);
		setEditingTukang(false);
	};

	const openMulaiProses = () => {
		setTukangInput(po?.nama_tukang || "");
		setModalMulaiProses(true);
	};

	const submitMulaiProses = async () => {
		setMulaiProsesLoading(true);
		const nama_tukang = tukangInput.trim() || null;
		await supabase
			.from("purchase_orders")
			.update({ status: "proses", nama_tukang })
			.eq("id", id);
		setPo((p: any) => ({ ...p, status: "proses", nama_tukang }));
		setMulaiProsesLoading(false);
		setModalMulaiProses(false);
	};

	const saveItemName = async (itemId: string) => {
		if (!editItemName.trim()) return;
		setSavingItem(true);
		const { error } = await supabase
			.from("purchase_order_items")
			.update({ nama_produk: editItemName.trim() })
			.eq("id", itemId);
		if (!error) {
			setPo((p: any) => ({
				...p,
				items: p.items.map((i: any) =>
					i.id === itemId ? { ...i, nama_produk: editItemName.trim() } : i,
				),
			}));
		}
		setSavingItem(false);
		setEditingItemId(null);
	};

	const handleSelesaikan = async () => {
		if (!po) return;
		setSelesaiLoading(true);

		await supabase
			.from("purchase_orders")
			.update({ status: "selesai" })
			.eq("id", po.id);

		if (selesaiMasukStok) {
			const linkedItems = (po.items || []).filter(
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
					keterangan: `Penerimaan PO ${po.nomor_po}`,
					created_by: profile?.id,
				});
			}
		}

		setPo((p: any) => ({ ...p, status: "selesai" }));
		setSelesaiLoading(false);
		setModalSelesai(false);
	};

	const hapusPO = async () => {
		if (!confirm("Hapus PO ini?")) return;
		await supabase.from("purchase_orders").delete().eq("id", id);
		router.push("/dashboard/po");
	};

	const saveProgress = async () => {
		if (!po) return;
		setProgError("");
		if (!progKeterangan.trim()) {
			setProgError("Keterangan wajib diisi");
			return;
		}
		setProgSaving(true);

		let foto_url: string | null = null;
		if (progFotoFile) {
			const ext = progFotoFile.name.split(".").pop();
			const path = `po-progress/${po.id}/${Date.now()}.${ext}`;
			const { error: upErr } = await supabase.storage
				.from("BungaNaik")
				.upload(path, progFotoFile);
			if (upErr) {
				setProgError("Gagal upload foto: " + upErr.message);
				setProgSaving(false);
				return;
			}
			const { data: urlData } = supabase.storage
				.from("BungaNaik")
				.getPublicUrl(path);
			foto_url = urlData.publicUrl;
		}

		const { error } = await supabase.from("po_progress").insert({
			po_id: po.id,
			tanggal: progTanggal,
			persentase: progPersen,
			keterangan: progKeterangan.trim(),
			foto_url,
			created_by: profile?.id,
		});

		if (error) {
			setProgError("Gagal menyimpan: " + error.message);
			setProgSaving(false);
			return;
		}

		await loadProgress();
		setProgTanggal(new Date().toISOString().split("T")[0]);
		setProgPersen(0);
		setProgKeterangan("");
		setProgFotoFile(null);
		setProgFotoPreview(null);
		setProgSaving(false);
	};

	const handlePrint = () => {
		if (!po) return;
		const items = po.items || [];
		const pemohon =
			po.tipe_pemohon === "reseller"
				? po.reseller?.nama || "-"
				: po.nama_customer || "-";
		const telepon =
			po.tipe_pemohon === "reseller"
				? po.reseller?.telepon || ""
				: po.telepon_customer || "";

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
<title>PO ${po.nomor_po}</title>
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
    <div class="doc-no">No: <b>${po.nomor_po}</b></div>
    <div class="doc-no">Tgl PO: ${formatDateOnly(po.tanggal_po)}</div>
    ${po.tanggal_estimasi ? `<div class="doc-no">Est. Selesai: <b>${formatDateOnly(po.tanggal_estimasi)}</b></div>` : ""}
    <div class="doc-no" style="margin-top:4px"><span class="badge">${STATUS_CONFIG[po.status as POStatus]?.label || po.status}</span></div>
  </div>
</div>

<div class="info">
  <span class="lbl">Pemohon</span>
  <span class="val">${po.tipe_pemohon === "reseller" ? "Reseller" : "Customer"}: ${pemohon}</span>
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

${po.catatan ? `<div class="catatan">Catatan: ${po.catatan}</div>` : ""}

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

	if (loading)
		return <div className="text-center py-16 text-gray-400">Memuat...</div>;
	if (!po)
		return (
			<div className="text-center py-16 text-gray-400">PO tidak ditemukan</div>
		);

	const overdue = isOverdue(po.tanggal_estimasi, po.status);
	const sc = STATUS_CONFIG[po.status as POStatus];
	const pc = PRIORITAS_CONFIG[(po.prioritas as POPrioritas) ?? "normal"];
	const pemohon =
		po.tipe_pemohon === "reseller"
			? po.reseller?.nama || "-"
			: po.nama_customer || "-";
	const telepon =
		po.tipe_pemohon === "reseller"
			? po.reseller?.telepon || ""
			: po.telepon_customer || "";

	return (
		<div className="max-w-4xl mx-auto">
			{/* Header */}
			<div className="flex items-center justify-between mb-6">
				<div className="flex items-center gap-3">
					<Link
						href="/dashboard/po"
						className="p-2 hover:bg-gray-100 rounded-lg text-gray-500 transition">
						<ArrowLeft size={18} />
					</Link>
					<div>
						<div className="flex items-center gap-2 flex-wrap">
							<h1 className="text-xl font-bold text-gray-900">{po.nomor_po}</h1>
							<span
								className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-semibold ${sc?.color}`}>
								<sc.icon size={12} />
								{sc?.label}
							</span>
							<span
								className={`text-xs px-2.5 py-1 rounded-full font-semibold flex items-center gap-1 ${pc.color}`}>
								<span className={`w-1.5 h-1.5 rounded-full ${pc.dot}`} />
								{pc.label}
							</span>
							{po.kategori_po && (
								<span
									className={`text-xs px-2.5 py-1 rounded-full font-semibold ${KATEGORI_PO_CONFIG[po.kategori_po as KategoriPO]?.color}`}>
									{KATEGORI_PO_CONFIG[po.kategori_po as KategoriPO]?.label}
								</span>
							)}
							{overdue && (
								<span className="text-xs px-2.5 py-1 rounded-full bg-red-100 text-red-600 font-semibold flex items-center gap-1">
									<AlertCircle size={11} /> Terlambat
								</span>
							)}
						</div>
						<p className="text-sm text-gray-400 mt-0.5">
							Dibuat {formatDateOnly(po.tanggal_po)}
						</p>
					</div>
				</div>
				<div className="flex items-center gap-2">
					<button
						onClick={handlePrint}
						className="flex items-center gap-1.5 px-3 py-2 bg-gray-800 hover:bg-gray-900 text-white rounded-lg text-sm font-medium transition">
						<Printer size={14} /> Cetak PO
					</button>
					<button
						onClick={hapusPO}
						className="flex items-center gap-1.5 px-3 py-2 border border-red-200 text-red-500 hover:bg-red-50 rounded-lg text-sm font-medium transition">
						<Trash2 size={14} /> Hapus
					</button>
				</div>
			</div>

			{/* Status actions */}
			<div className="flex items-center gap-2 flex-wrap mb-6">
				{po.status === "pending" && (
					<button
						onClick={openMulaiProses}
						className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold transition">
						Mulai Proses
					</button>
				)}
				{po.status === "proses" && (
					<button
						onClick={() => setModalSelesai(true)}
						className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-semibold transition">
						Tandai Selesai
					</button>
				)}
				{po.status !== "batal" && po.status !== "selesai" && (
					<button
						onClick={() => updateStatus("batal")}
						className="px-4 py-2 border border-red-200 text-red-500 hover:bg-red-50 rounded-lg text-sm font-semibold transition">
						Batalkan
					</button>
				)}
				{po.status !== "batal" && po.status !== "selesai" && (
					<div className="flex items-center gap-1.5 ml-auto">
						{(Object.keys(PRIORITAS_CONFIG) as POPrioritas[]).map((pk) => {
							const cfg = PRIORITAS_CONFIG[pk];
							const active = (po.prioritas ?? "normal") === pk;
							return (
								<button
									key={pk}
									onClick={() => updatePrioritas(pk)}
									className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition ${
										active
											? "border-indigo-400 bg-indigo-50 text-indigo-700"
											: "border-gray-200 text-gray-500 hover:bg-gray-50"
									}`}>
									<span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
									{cfg.label}
								</button>
							);
						})}
					</div>
				)}
			</div>

			{canEditPO && po.status !== "batal" && po.status !== "selesai" && (
				<div className="flex items-center gap-1.5 mb-6 -mt-3">
					<span className="text-xs text-gray-400 font-medium mr-1">
						Kategori PO:
					</span>
					{(Object.keys(KATEGORI_PO_CONFIG) as KategoriPO[]).map((kk) => {
						const kc = KATEGORI_PO_CONFIG[kk];
						const active = (po.kategori_po ?? "pabrik") === kk;
						return (
							<button
								key={kk}
								onClick={() => updateKategori(kk)}
								className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition ${
									active
										? "border-indigo-400 bg-indigo-50 text-indigo-700"
										: "border-gray-200 text-gray-500 hover:bg-gray-50"
								}`}>
								{kc.label}
							</button>
						);
					})}
				</div>
			)}

			<div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
				<div className="lg:col-span-2 space-y-5">
					{/* Info pemohon & customer */}
					<div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
						<p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
							Detail Peminta / Customer
						</p>
						<div className="grid grid-cols-2 gap-4 text-sm">
							<div>
								<p className="text-gray-400 text-xs mb-0.5">Nama Peminta</p>
								<p className="font-semibold text-gray-900 flex items-center gap-1.5">
									{po.tipe_pemohon === "reseller" ? (
										<Users size={13} className="text-indigo-500" />
									) : (
										<User size={13} className="text-purple-500" />
									)}
									{pemohon}
									<span className="text-xs text-gray-400 font-normal capitalize">
										({po.tipe_pemohon})
									</span>
								</p>
							</div>
							<div>
								<p className="text-gray-400 text-xs mb-0.5">Telepon</p>
								{telepon ? (
									<a
										href={waLink(telepon)}
										target="_blank"
										rel="noopener noreferrer"
										className="font-medium text-green-600 hover:underline flex items-center gap-1.5">
										<MessageCircle size={13} /> {telepon}
									</a>
								) : (
									<p className="font-medium text-gray-400">-</p>
								)}
							</div>
							<div>
								<p className="text-gray-400 text-xs mb-0.5">Tanggal PO</p>
								<p className="font-medium text-gray-700 flex items-center gap-1.5">
									<Calendar size={13} className="text-gray-400" />
									{formatDateOnly(po.tanggal_po)}
								</p>
							</div>
							<div>
								<div className="flex items-center gap-1.5 mb-0.5">
									<p className="text-gray-400 text-xs">Estimasi Selesai</p>
									{canEditPO && !editingEstimasi && (
										<button
											onClick={() => {
												setEstimasiValue(po.tanggal_estimasi || "");
												setEditingEstimasi(true);
											}}
											className="text-gray-300 hover:text-indigo-600 transition">
											<Pencil size={11} />
										</button>
									)}
								</div>
								{editingEstimasi ? (
									<div className="flex items-center gap-1.5">
										<input
											type="date"
											value={estimasiValue}
											onChange={(e) => setEstimasiValue(e.target.value)}
											autoFocus
											className="px-2 py-1 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
										/>
										<button
											onClick={saveEstimasi}
											disabled={savingEstimasi}
											className="p-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg flex-shrink-0">
											<Check size={12} />
										</button>
										<button
											onClick={() => setEditingEstimasi(false)}
											className="p-1.5 text-gray-400 hover:text-gray-600 flex-shrink-0">
											<X size={12} />
										</button>
									</div>
								) : (
									<p
										className={`font-medium ${overdue ? "text-red-600" : "text-gray-700"}`}>
										{po.tanggal_estimasi ? (
											<>
												{formatDateOnly(po.tanggal_estimasi)}
												<span className="text-xs ml-1 text-gray-400">
													({daysUntil(po.tanggal_estimasi)})
												</span>
											</>
										) : (
											"-"
										)}
									</p>
								)}
							</div>
							{po.status !== "pending" && (
								<div>
									<div className="flex items-center gap-1.5 mb-0.5">
										<p className="text-gray-400 text-xs">Tukang</p>
										{canEditPO && !editingTukang && (
											<button
												onClick={() => {
													setTukangValue(po.nama_tukang || "");
													setEditingTukang(true);
												}}
												className="text-gray-300 hover:text-indigo-600 transition">
												<Pencil size={11} />
											</button>
										)}
									</div>
									{editingTukang ? (
										<div className="flex items-center gap-1.5">
											<input
												value={tukangValue}
												onChange={(e) => setTukangValue(e.target.value)}
												autoFocus
												placeholder="Nama tukang"
												className="px-2 py-1 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 min-w-0 flex-1"
											/>
											<button
												onClick={saveTukang}
												disabled={savingTukang}
												className="p-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg flex-shrink-0">
												<Check size={12} />
											</button>
											<button
												onClick={() => setEditingTukang(false)}
												className="p-1.5 text-gray-400 hover:text-gray-600 flex-shrink-0">
												<X size={12} />
											</button>
										</div>
									) : po.nama_tukang ? (
										<p className="font-medium text-gray-700">{po.nama_tukang}</p>
									) : (
										<p className="text-amber-600 text-sm font-medium">Belum diisi</p>
									)}
								</div>
							)}
							{po.creator?.name && (
								<div className="col-span-2">
									<p className="text-gray-400 text-xs mb-0.5">Dibuat oleh</p>
									<p className="font-medium text-gray-700">{po.creator.name}</p>
								</div>
							)}
						</div>
						{po.catatan && (
							<div className="mt-4 bg-amber-50 border border-amber-100 rounded-xl px-4 py-3 text-sm text-amber-800">
								<span className="font-semibold">Catatan: </span>
								{po.catatan}
							</div>
						)}
					</div>

					{/* Item barang diminta */}
					<div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
						<p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
							Barang yang Diminta ({(po.items || []).length} item)
						</p>
						<div className="space-y-3">
							{(po.items || []).map((item: any, i: number) => {
								const foto =
									(item.produk_id && fotoMap[item.produk_id]) ||
									item.produk?.foto_url ||
									null;
								return (
									<div
										key={item.id}
										className="flex items-start gap-4 bg-gray-50 rounded-xl p-3 border border-gray-100">
										<div className="w-16 h-16 rounded-lg overflow-hidden bg-white border border-gray-200 flex-shrink-0 flex items-center justify-center">
											{foto ? (
												<button
													type="button"
													onClick={() => setLightboxSrc(foto)}
													className="w-full h-full block">
													<img
														src={foto}
														alt={item.nama_produk}
														className="w-full h-full object-cover hover:opacity-90 transition"
													/>
												</button>
											) : (
												<ImageIcon size={20} className="text-gray-300" />
											)}
										</div>
										<div className="flex-1 min-w-0">
											<div className="flex items-center justify-between gap-2">
												{editingItemId === item.id ? (
													<div className="flex items-center gap-1.5 flex-1">
														<input
															value={editItemName}
															onChange={(e) => setEditItemName(e.target.value)}
															autoFocus
															className="flex-1 min-w-0 px-2 py-1 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
														/>
														<button
															onClick={() => saveItemName(item.id)}
															disabled={savingItem}
															className="p-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg flex-shrink-0">
															<Check size={12} />
														</button>
														<button
															onClick={() => setEditingItemId(null)}
															className="p-1.5 text-gray-400 hover:text-gray-600 flex-shrink-0">
															<X size={12} />
														</button>
													</div>
												) : (
													<>
														<p className="font-semibold text-gray-900 text-sm flex items-center gap-1.5">
															{item.nama_produk}
															{canEditPO && (
																<button
																	onClick={() => {
																		setEditingItemId(item.id);
																		setEditItemName(item.nama_produk);
																	}}
																	className="text-gray-300 hover:text-indigo-600 transition">
																	<Pencil size={11} />
																</button>
															)}
														</p>
														<span className="flex-shrink-0 text-sm font-bold text-gray-700">
															{item.jumlah}{" "}
															<span className="font-normal text-gray-400">
																{item.satuan}
															</span>
														</span>
													</>
												)}
											</div>
											{item.keterangan && (
												<p className="text-xs text-gray-500 mt-1">
													{item.keterangan}
												</p>
											)}
											<span
												className={`inline-block mt-1.5 text-[10px] px-2 py-0.5 rounded-full font-medium ${
													item.produk_id
														? "bg-indigo-50 text-indigo-600"
														: "bg-gray-100 text-gray-500"
												}`}>
												{item.produk_id ? "Produk terdaftar" : "Item custom"}
											</span>
										</div>
									</div>
								);
							})}
						</div>
					</div>
				</div>

				<div className="space-y-5">
					{/* Foto referensi umum PO */}
					<div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
						<div className="flex items-center justify-between mb-3">
							<p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
								Foto Referensi PO
							</p>
							{canEditPO && (
								<label className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-700 font-medium cursor-pointer">
									<Pencil size={11} /> {po.foto_url ? "Ganti" : "Tambah"}
									<input
										type="file"
										accept="image/*"
										className="hidden"
										onChange={handleFotoChange}
									/>
								</label>
							)}
						</div>
						{uploadingFoto ? (
							<div className="flex flex-col items-center justify-center py-8 text-gray-400">
								<p className="text-xs">Mengunggah...</p>
							</div>
						) : po.foto_url ? (
							<button
								type="button"
								onClick={() => setLightboxSrc(po.foto_url)}
								className="block w-full">
								<img
									src={po.foto_url}
									alt="Foto referensi PO"
									className="w-full max-h-56 object-cover rounded-xl border border-gray-200 hover:opacity-90 transition"
								/>
							</button>
						) : (
							<div className="flex flex-col items-center justify-center py-8 text-gray-300">
								<ImageIcon size={28} />
								<p className="text-xs text-gray-400 mt-2">
									Tidak ada foto referensi
								</p>
							</div>
						)}
					</div>

					{/* Progress produksi */}
					<div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
						<p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3 flex items-center gap-1.5">
							<Activity size={13} className="text-purple-600" /> Progress
							Produksi
						</p>

						{progressList.length > 0 &&
							(() => {
								const latest = progressList[0];
								const pct = latest.persentase ?? 0;
								return (
									<div className="bg-gray-50 rounded-xl p-3 border border-gray-100 mb-3">
										<div className="flex items-center justify-between mb-1.5">
											<span className="text-xs font-semibold text-gray-600">
												Progress Terkini
											</span>
											<span
												className={`text-sm font-bold ${pct >= 100 ? "text-green-600" : "text-blue-600"}`}>
												{pct}%
											</span>
										</div>
										<div className="h-2.5 bg-gray-200 rounded-full overflow-hidden">
											<div
												className={`h-full rounded-full transition-all ${pct >= 100 ? "bg-green-500" : "bg-blue-500"}`}
												style={{ width: `${Math.min(pct, 100)}%` }}
											/>
										</div>
									</div>
								);
							})()}

						{progressLoading ? (
							<p className="text-sm text-gray-400 text-center py-4">
								Memuat...
							</p>
						) : progressList.length === 0 ? (
							<p className="text-sm text-gray-400 text-center py-4">
								Belum ada progress dicatat
							</p>
						) : (
							<div className="space-y-2 max-h-72 overflow-y-auto">
								{progressList.map((prog) => (
									<div
										key={prog.id}
										className="flex gap-2.5 bg-gray-50 rounded-xl p-2.5 border border-gray-100">
										<div
											className={`flex-shrink-0 w-9 h-9 rounded-lg flex items-center justify-center text-xs font-bold ${
												prog.persentase >= 100
													? "bg-green-100 text-green-700"
													: "bg-blue-100 text-blue-700"
											}`}>
											{prog.persentase}%
										</div>
										<div className="flex-1 min-w-0">
											<div className="flex items-center gap-1.5 flex-wrap">
												<span className="text-xs text-gray-500">
													{new Date(prog.tanggal).toLocaleDateString("id-ID", {
														day: "numeric",
														month: "short",
													})}
												</span>
												{prog.creator?.name && (
													<span className="text-xs text-gray-400">
														· {prog.creator.name}
													</span>
												)}
											</div>
											<p className="text-xs text-gray-700 mt-0.5">
												{prog.keterangan}
											</p>
											{prog.foto_url && (
												<button
													type="button"
													onClick={() => setLightboxSrc(prog.foto_url)}>
													<img
														src={prog.foto_url}
														alt="Foto progress"
														className="mt-1.5 h-14 w-20 object-cover rounded-lg border border-gray-200 hover:opacity-80 transition"
													/>
												</button>
											)}
										</div>
									</div>
								))}
							</div>
						)}

						{canAddProgress && (
							<div className="border-t border-gray-100 mt-4 pt-4 space-y-3">
								<p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">
									Tambah Update Progress
								</p>
								<div className="grid grid-cols-2 gap-2">
									<input
										type="date"
										value={progTanggal}
										onChange={(e) => setProgTanggal(e.target.value)}
										className="w-full px-2.5 py-2 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-purple-500"
									/>
									<div>
										<input
											type="range"
											min={0}
											max={100}
											step={5}
											value={progPersen}
											onChange={(e) => setProgPersen(Number(e.target.value))}
											className="w-full mt-2.5 accent-purple-600"
										/>
										<p className="text-[10px] text-right text-purple-700 font-bold">
											{progPersen}%
										</p>
									</div>
								</div>
								<textarea
									value={progKeterangan}
									onChange={(e) => setProgKeterangan(e.target.value)}
									rows={2}
									placeholder="Deskripsi update progress..."
									className="w-full px-2.5 py-2 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
								/>
								<div>
									<input
										type="file"
										accept="image/*"
										onChange={(e) => {
											const f = e.target.files?.[0] ?? null;
											setProgFotoFile(f);
											setProgFotoPreview(f ? URL.createObjectURL(f) : null);
										}}
										className="w-full text-xs text-gray-500 file:mr-2 file:py-1 file:px-2.5 file:rounded-lg file:border-0 file:text-xs file:font-medium file:bg-purple-50 file:text-purple-700 hover:file:bg-purple-100"
									/>
									{progFotoPreview && (
										<div className="mt-2 relative w-fit">
											<img
												src={progFotoPreview}
												alt="Preview"
												className="h-16 w-24 object-cover rounded-lg border border-gray-200"
											/>
											<button
												onClick={() => {
													setProgFotoFile(null);
													setProgFotoPreview(null);
												}}
												className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center text-xs hover:bg-red-600">
												<X size={10} />
											</button>
										</div>
									)}
								</div>
								{progError && (
									<div className="flex items-center gap-1.5 bg-red-50 border border-red-200 text-red-700 px-2.5 py-2 rounded-lg text-xs">
										<AlertCircle size={12} /> {progError}
									</div>
								)}
								<button
									onClick={saveProgress}
									disabled={progSaving}
									className="w-full py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-300 text-white rounded-lg text-xs font-semibold transition flex items-center justify-center gap-1.5">
									<TrendingUp size={13} />
									{progSaving ? "Menyimpan..." : "Simpan Progress"}
								</button>
							</div>
						)}
					</div>
				</div>
			</div>

			{/* Modal mulai proses + tukang */}
			{modalMulaiProses && (
				<div className="fixed inset-0 bg-black/40 z-[60] flex items-center justify-center p-4">
					<div className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
						<div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
							<div>
								<h3 className="font-semibold text-gray-900">Mulai Proses PO</h3>
								<p className="text-sm text-gray-400 mt-0.5">{po.nomor_po}</p>
							</div>
							<button onClick={() => setModalMulaiProses(false)} className="p-2 hover:bg-gray-100 rounded-lg">
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
								Boleh dikosongkan dulu — bisa diisi/diedit nanti dari halaman ini.
							</p>
						</div>

						<div className="flex gap-3 px-6 pb-6">
							<button
								onClick={() => setModalMulaiProses(false)}
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

			{/* Modal selesai + stok */}
			{modalSelesai && (
				<div className="fixed inset-0 bg-black/40 z-[60] flex items-center justify-center p-4">
					<div className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
						<div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
							<div>
								<h3 className="font-semibold text-gray-900">Selesaikan PO</h3>
								<p className="text-sm text-gray-400 mt-0.5">{po.nomor_po}</p>
							</div>
							<button
								onClick={() => setModalSelesai(false)}
								className="p-2 hover:bg-gray-100 rounded-lg">
								<X size={18} />
							</button>
						</div>

						<div className="p-6 space-y-4">
							<button
								onClick={() => setSelesaiMasukStok(!selesaiMasukStok)}
								className={`w-full flex items-center justify-between px-4 py-3.5 rounded-xl border-2 transition ${
									selesaiMasukStok
										? "border-green-500 bg-green-50"
										: "border-gray-200 bg-gray-50"
								}`}>
								<div className="flex items-center gap-3 text-left">
									<div
										className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${selesaiMasukStok ? "bg-green-100" : "bg-gray-100"}`}>
										<Package
											size={18}
											className={
												selesaiMasukStok ? "text-green-600" : "text-gray-400"
											}
										/>
									</div>
									<div>
										<p
											className={`text-sm font-semibold ${selesaiMasukStok ? "text-green-800" : "text-gray-600"}`}>
											Tambahkan item ke stok
										</p>
										<p className="text-xs text-gray-400 mt-0.5">
											Stok produk terhubung akan otomatis bertambah
										</p>
									</div>
								</div>
								<div
									className={`w-11 h-6 rounded-full transition-colors flex-shrink-0 ${selesaiMasukStok ? "bg-green-500" : "bg-gray-300"}`}>
									<div
										className={`w-5 h-5 bg-white rounded-full shadow-sm mt-0.5 transition-transform ${selesaiMasukStok ? "translate-x-5" : "translate-x-0.5"}`}
									/>
								</div>
							</button>

							{selesaiMasukStok && (
								<div className="space-y-2">
									<p className="text-xs font-semibold text-gray-500 uppercase tracking-wide px-1">
										Preview perubahan stok
									</p>
									{(po.items || []).map((item: any) => {
										const linked = item.produk_id && item.produk;
										const stokLama = item.produk?.stok ?? 0;
										const stokBaru = stokLama + item.jumlah;
										return (
											<div
												key={item.id}
												className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm ${
													linked
														? "bg-green-50 border border-green-100"
														: "bg-gray-50 border border-gray-100"
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
														<span className="text-xs text-gray-400">
															{item.satuan}
														</span>
													</div>
												) : (
													<span className="text-xs text-gray-400 flex-shrink-0">
														Dilewati
													</span>
												)}
											</div>
										);
									})}
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
