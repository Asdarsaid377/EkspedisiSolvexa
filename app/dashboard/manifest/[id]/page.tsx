"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { formatDateOnly } from "@/lib/utils";
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

	const [data, setData] = useState<any>(null);
	const [items, setItems] = useState<any[]>([]);
	const [armadaList, setArmadaList] = useState<any[]>([]);
	const [sopirList, setSopirList] = useState<any[]>([]);
	const [loading, setLoading] = useState(true);
	const [notFound, setNotFound] = useState(false);
	const [saving, setSaving] = useState(false);
	const [actionError, setActionError] = useState("");

	// Edit info (hanya saat draft)
	const [editArmada, setEditArmada] = useState("");
	const [editSopir, setEditSopir] = useState("");
	const [editRute, setEditRute] = useState("");
	const [editTanggal, setEditTanggal] = useState("");
	const [savingInfo, setSavingInfo] = useState(false);

	// Tambah kiriman
	const [search, setSearch] = useState("");
	const [candidates, setCandidates] = useState<any[]>([]);
	const [searching, setSearching] = useState(false);

	useEffect(() => {
		if (!id) return;
		load();
	}, [id]);

	const load = async () => {
		setLoading(true);
		const [{ data: m }, { data: armada }, { data: sopir }] = await Promise.all([
			supabase
				.from("manifest")
				.select(
					"*, armada:armada(id, plat_nomor, jenis_kendaraan), sopir:profiles!sopir_id(id, name)",
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

		setData(m);
		setItems(itemRows || []);
		setArmadaList(armada || []);
		setSopirList(sopir || []);
		setEditArmada(m.armada_id || "");
		setEditSopir(m.sopir_id || "");
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
				rute: editRute || null,
				tanggal_berangkat: editTanggal || null,
			})
			.eq("id", data.id);
		setSavingInfo(false);
		load();
	};

	const searchPengiriman = async (q: string) => {
		setSearch(q);
		if (!q.trim()) {
			setCandidates([]);
			return;
		}
		setSearching(true);

		// Kiriman yang sudah ada di manifest lain yang masih aktif (draft/berangkat) — dikecualikan
		const { data: taken } = await supabase
			.from("manifest_item")
			.select("pengiriman_id, manifest:manifest(status)")
			.neq("manifest_id", id);
		const takenIds = new Set(
			(taken || [])
				.filter((t: any) => t.manifest?.status === "draft" || t.manifest?.status === "berangkat")
				.map((t: any) => t.pengiriman_id),
		);
		const alreadyInThis = new Set(items.map((i) => i.pengiriman.id));

		const { data: found } = await supabase
			.from("pengiriman")
			.select("id, nomor_faktur, nomor_resi, penerima_nama, penerima_kota, milestone, berat_kg")
			.in("milestone", ["diproses", "dijemput"])
			.or(
				`nomor_faktur.ilike.%${q}%,nomor_resi.ilike.%${q}%,penerima_nama.ilike.%${q}%`,
			)
			.limit(20);

		setCandidates(
			(found || []).filter(
				(p) => !takenIds.has(p.id) && !alreadyInThis.has(p.id),
			),
		);
		setSearching(false);
	};

	const addItem = async (pengirimanId: string) => {
		await supabase.from("manifest_item").insert({
			manifest_id: id,
			pengiriman_id: pengirimanId,
			urutan: items.length,
		});
		setSearch("");
		setCandidates([]);
		load();
	};

	const removeItem = async (itemId: string) => {
		await supabase.from("manifest_item").delete().eq("id", itemId);
		load();
	};

	const bulkUpdateMilestone = async (
		next: "dikirim" | "selesai",
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
		await bulkUpdateMilestone("dikirim", ["diproses", "dijemput"]);
		await supabase.from("manifest").update({ status: "berangkat" }).eq("id", data.id);
		setSaving(false);
		load();
	};

	const tandaiSelesai = async () => {
		await bulkUpdateMilestone("selesai", ["dikirim", "diproses", "dijemput"]);
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
						<div className="relative">
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
					<h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
						Kiriman ({items.length})
					</h2>
					{items.length === 0 ? (
						<p className="text-sm text-gray-400 italic py-2">Belum ada kiriman</p>
					) : (
						<div className="space-y-2">
							{items.map((it) => {
								const p = it.pengiriman;
								return (
									<div
										key={it.id}
										className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-3 border border-gray-100">
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
			</div>
		</div>
	);
}
