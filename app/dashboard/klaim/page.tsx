"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { KlaimTipe, KlaimStatus } from "@/lib/types";
import { formatRupiah, formatDateOnly } from "@/lib/utils";
import { logAktivitas } from "@/lib/aktivitas";
import {
	Plus,
	X,
	Search,
	Trash2,
	PackageX,
	AlertTriangle,
	CheckCircle2,
	XCircle,
	ShieldAlert,
	Calendar,
} from "lucide-react";

const STATUS_CFG: Record<KlaimStatus, { label: string; color: string }> = {
	pending: { label: "Pending", color: "bg-yellow-100 text-yellow-700" },
	disetujui: { label: "Disetujui", color: "bg-green-100 text-green-700" },
	ditolak: { label: "Ditolak", color: "bg-red-100 text-red-700" },
	selesai: { label: "Selesai", color: "bg-blue-100 text-blue-700" },
};

const TIPE_CFG: Record<KlaimTipe, { label: string; color: string; icon: any }> = {
	hilang: { label: "Hilang", color: "bg-gray-100 text-gray-600", icon: PackageX },
	rusak: { label: "Rusak", color: "bg-orange-100 text-orange-700", icon: AlertTriangle },
};

const emptyLaporForm = {
	pengiriman_id: "",
	pengiriman_nomor_resi: "",
	pengiriman_penerima_nama: "",
	tipe: "hilang" as KlaimTipe,
	nilai_klaim: "",
	kronologi: "",
};

export default function KlaimPage() {
	const { isSuperAdmin, role, profile } = useAuth();
	const supabase = createClient();

	const canApproveKlaim = isSuperAdmin;
	const canSelesaikanKlaim = isSuperAdmin || role === "keuangan";
	const canDeleteKlaim = isSuperAdmin;

	const [list, setList] = useState<any[]>([]);
	const [loading, setLoading] = useState(true);
	const [search, setSearch] = useState("");
	const [filterStatus, setFilterStatus] = useState<"semua" | KlaimStatus>("semua");
	const [filterTipe, setFilterTipe] = useState<"semua" | KlaimTipe>("semua");
	const [modal, setModal] = useState<"lapor" | "proses" | null>(null);
	const [selected, setSelected] = useState<any | null>(null);
	const [saving, setSaving] = useState(false);

	// Lapor klaim
	const [laporForm, setLaporForm] = useState(emptyLaporForm);
	const [pgSearch, setPgSearch] = useState("");
	const [pgCandidates, setPgCandidates] = useState<any[]>([]);
	const [pgSearching, setPgSearching] = useState(false);
	const [buktiFile, setBuktiFile] = useState<File | null>(null);
	const [buktiPreview, setBuktiPreview] = useState<string | null>(null);

	// Proses klaim (approve/tolak)
	const [prosesForm, setProsesForm] = useState({
		nilai_disetujui: "",
		catatan_approval: "",
	});

	useEffect(() => {
		loadAll();
	}, []);

	const loadAll = async () => {
		setLoading(true);
		const { data } = await supabase
			.from("klaim")
			.select(
				"*, creator:profiles!created_by(name), approver:profiles!approved_by(name)",
			)
			.order("created_at", { ascending: false });
		setList(data || []);
		setLoading(false);
	};

	const openLapor = () => {
		setLaporForm(emptyLaporForm);
		setPgSearch("");
		setPgCandidates([]);
		setBuktiFile(null);
		setBuktiPreview(null);
		setModal("lapor");
	};

	const searchPengiriman = async (q: string) => {
		setPgSearch(q);
		if (!q.trim()) {
			setPgCandidates([]);
			return;
		}
		setPgSearching(true);
		const { data } = await supabase
			.from("pengiriman")
			.select("id, nomor_faktur, nomor_resi, penerima_nama, penerima_kota")
			.or(
				`nomor_faktur.ilike.%${q}%,nomor_resi.ilike.%${q}%,penerima_nama.ilike.%${q}%`,
			)
			.limit(20);
		setPgCandidates(data || []);
		setPgSearching(false);
	};

	const pickPengiriman = (p: any) => {
		setLaporForm((f) => ({
			...f,
			pengiriman_id: p.id,
			pengiriman_nomor_resi: p.nomor_resi || p.nomor_faktur,
			pengiriman_penerima_nama: p.penerima_nama,
		}));
		setPgSearch("");
		setPgCandidates([]);
	};

	const saveLapor = async () => {
		if (
			!laporForm.pengiriman_id ||
			!laporForm.nilai_klaim ||
			Number(laporForm.nilai_klaim) <= 0
		)
			return;
		setSaving(true);

		let foto_bukti: string | null = null;
		if (buktiFile) {
			const ext = buktiFile.name.split(".").pop();
			const path = `klaim/${laporForm.pengiriman_id}/${Date.now()}.${ext}`;
			const { error: upErr } = await supabase.storage
				.from("BungaNaik")
				.upload(path, buktiFile);
			if (!upErr) {
				const { data: urlData } = supabase.storage
					.from("BungaNaik")
					.getPublicUrl(path);
				foto_bukti = urlData.publicUrl;
			}
		}

		await supabase.from("klaim").insert({
			pengiriman_id: laporForm.pengiriman_id,
			pengiriman_nomor_resi: laporForm.pengiriman_nomor_resi || null,
			pengiriman_penerima_nama: laporForm.pengiriman_penerima_nama || null,
			tipe: laporForm.tipe,
			nilai_klaim: Number(laporForm.nilai_klaim) || 0,
			kronologi: laporForm.kronologi || null,
			foto_bukti,
			created_by: profile?.id,
		});

		setSaving(false);
		setModal(null);
		loadAll();
	};

	const openProses = (k: any) => {
		setSelected(k);
		setProsesForm({
			nilai_disetujui: String(k.nilai_klaim),
			catatan_approval: "",
		});
		setModal("proses");
	};

	const approveKlaim = async (status: "disetujui" | "ditolak") => {
		if (!selected) return;
		setSaving(true);
		const payload = {
			status,
			nilai_disetujui:
				status === "disetujui" ? Number(prosesForm.nilai_disetujui) || 0 : null,
			catatan_approval: prosesForm.catatan_approval || null,
			approved_by: profile?.id,
			approved_at: new Date().toISOString(),
		};
		await supabase.from("klaim").update(payload).eq("id", selected.id);

		await logAktivitas(supabase, {
			aksi: status === "disetujui" ? "approve_klaim" : "tolak_klaim",
			entitas: "klaim",
			entitas_id: selected.id,
			ref: selected.nomor_klaim,
			detail: {
				tipe: selected.tipe,
				nilai_klaim: selected.nilai_klaim,
				nilai_disetujui: payload.nilai_disetujui,
				catatan_approval: payload.catatan_approval,
			},
			created_by: profile?.id,
		});

		setList((rows) =>
			rows.map((r) => (r.id === selected.id ? { ...r, ...payload } : r)),
		);
		setSaving(false);
		setModal(null);
		setSelected(null);
	};

	const tandaiSelesai = async (k: any) => {
		const selesaiAt = new Date().toISOString();
		await supabase
			.from("klaim")
			.update({ status: "selesai", selesai_at: selesaiAt })
			.eq("id", k.id);
		setList((rows) =>
			rows.map((r) =>
				r.id === k.id ? { ...r, status: "selesai", selesai_at: selesaiAt } : r,
			),
		);
	};

	const hapusKlaim = async (id: string) => {
		if (!confirm("Yakin hapus klaim ini?")) return;
		await supabase.from("klaim").delete().eq("id", id);
		loadAll();
	};

	const filtered = list
		.filter((k) => (filterStatus === "semua" ? true : k.status === filterStatus))
		.filter((k) => (filterTipe === "semua" ? true : k.tipe === filterTipe))
		.filter(
			(k) =>
				k.nomor_klaim.toLowerCase().includes(search.toLowerCase()) ||
				(k.pengiriman_nomor_resi || "")
					.toLowerCase()
					.includes(search.toLowerCase()) ||
				(k.pengiriman_penerima_nama || "")
					.toLowerCase()
					.includes(search.toLowerCase()),
		);

	return (
		<div>
			<div className="flex items-center justify-between mb-6">
				<div>
					<h1 className="text-2xl font-bold text-gray-900">Klaim</h1>
					<p className="text-gray-500 mt-1">{list.length} klaim tercatat</p>
				</div>
				<button
					onClick={openLapor}
					className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition">
					<Plus size={16} /> Lapor Klaim
				</button>
			</div>

			<div className="flex flex-wrap gap-2 mb-4">
				{(["semua", "pending", "disetujui", "ditolak", "selesai"] as const).map(
					(s) => {
						const count =
							s === "semua" ? list.length : list.filter((k) => k.status === s).length;
						const label = s === "semua" ? "Semua" : STATUS_CFG[s].label;
						return (
							<button
								key={s}
								onClick={() => setFilterStatus(s)}
								className={`px-3.5 py-2 rounded-xl text-sm font-medium transition ${
									filterStatus === s
										? "bg-indigo-600 text-white"
										: "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
								}`}>
								{label} ({count})
							</button>
						);
					},
				)}
			</div>

			<div className="flex flex-wrap gap-3 mb-6">
				<div className="relative flex-1 min-w-48">
					<Search
						size={16}
						className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
					/>
					<input
						value={search}
						onChange={(e) => setSearch(e.target.value)}
						placeholder="Cari nomor klaim, resi, penerima..."
						className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
					/>
				</div>
				<div className="flex rounded-xl border border-gray-200 overflow-hidden">
					{(["semua", "hilang", "rusak"] as const).map((t) => (
						<button
							key={t}
							onClick={() => setFilterTipe(t)}
							className={`px-4 py-2.5 text-sm font-medium transition ${
								filterTipe === t
									? "bg-indigo-600 text-white"
									: "bg-white text-gray-600 hover:bg-gray-50"
							}`}>
							{t === "semua" ? "Semua Tipe" : TIPE_CFG[t].label}
						</button>
					))}
				</div>
			</div>

			<div className="space-y-3">
				{loading ? (
					<div className="text-center py-12 text-gray-400">Memuat...</div>
				) : filtered.length === 0 ? (
					<div className="text-center py-12 text-gray-400">Belum ada klaim</div>
				) : (
					filtered.map((k) => {
						const st = STATUS_CFG[k.status as KlaimStatus] || STATUS_CFG.pending;
						const tp = TIPE_CFG[k.tipe as KlaimTipe] || TIPE_CFG.hilang;
						const TpIcon = tp.icon;
						return (
							<div
								key={k.id}
								className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 transition hover:shadow-md">
								<div className="flex items-start gap-4">
									<div className="w-11 h-11 rounded-xl bg-red-50 flex items-center justify-center flex-shrink-0">
										<TpIcon size={19} className="text-red-500" />
									</div>
									<div className="flex-1 min-w-0 flex items-start justify-between gap-3">
										<div className="flex-1 min-w-0">
											<div className="flex items-center gap-2 flex-wrap">
												<span className="font-bold text-gray-900 font-mono">
													{k.nomor_klaim}
												</span>
												<span
													className={`text-xs px-2 py-0.5 rounded-full font-semibold ${tp.color}`}>
													{tp.label}
												</span>
												<span
													className={`text-xs px-2 py-0.5 rounded-full font-semibold ${st.color}`}>
													{st.label}
												</span>
											</div>
											<div className="flex items-center gap-3 mt-2 flex-wrap text-sm text-gray-600">
												<span>
													{k.pengiriman_nomor_resi || "-"} ·{" "}
													{k.pengiriman_penerima_nama || "penerima tidak tercatat"}
												</span>
												<span className="flex items-center gap-1 text-gray-400">
													<Calendar size={12} /> {formatDateOnly(k.created_at)}
												</span>
											</div>
											{k.kronologi && (
												<p className="mt-2 text-xs text-gray-500 line-clamp-2">
													{k.kronologi}
												</p>
											)}
											<div className="flex flex-wrap gap-x-4 gap-y-1 mt-2.5 text-xs text-gray-500">
												<span>
													Nilai Diajukan{" "}
													<b className="text-gray-800">
														{formatRupiah(k.nilai_klaim)}
													</b>
												</span>
												{k.nilai_disetujui != null && (
													<span>
														Nilai Disetujui{" "}
														<b className="text-green-600">
															{formatRupiah(k.nilai_disetujui)}
														</b>
													</span>
												)}
												{k.creator?.name && <span>Lapor: {k.creator.name}</span>}
												{k.approver?.name && (
													<span>Proses: {k.approver.name}</span>
												)}
												{k.foto_bukti && (
													<a
														href={k.foto_bukti}
														target="_blank"
														rel="noopener noreferrer"
														className="text-indigo-600 hover:underline">
														Lihat Foto Bukti
													</a>
												)}
											</div>
										</div>
										<div className="flex items-center gap-1 flex-shrink-0">
											{canApproveKlaim && k.status === "pending" && (
												<button
													onClick={() => openProses(k)}
													className="p-2 hover:bg-indigo-50 rounded-lg text-indigo-600 transition"
													title="Proses Klaim">
													<ShieldAlert size={15} />
												</button>
											)}
											{canSelesaikanKlaim && k.status === "disetujui" && (
												<button
													onClick={() => tandaiSelesai(k)}
													className="p-2 hover:bg-blue-50 rounded-lg text-blue-600 transition"
													title="Tandai Selesai">
													<CheckCircle2 size={15} />
												</button>
											)}
											{canDeleteKlaim && (
												<button
													onClick={() => hapusKlaim(k.id)}
													className="p-2 hover:bg-red-50 rounded-lg text-red-500 transition"
													title="Hapus">
													<Trash2 size={15} />
												</button>
											)}
										</div>
									</div>
								</div>
							</div>
						);
					})
				)}
			</div>

			{/* Modal Lapor Klaim */}
			{modal === "lapor" && (
				<div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
					<div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl max-h-[90vh] flex flex-col">
						<div className="flex items-center justify-between p-6 border-b border-gray-100">
							<h2 className="text-lg font-semibold">Lapor Klaim</h2>
							<button
								onClick={() => setModal(null)}
								className="p-2 hover:bg-gray-100 rounded-lg">
								<X size={18} />
							</button>
						</div>
						<div className="flex-1 overflow-y-auto p-6 space-y-4">
							<div>
								<label className="block text-sm font-medium text-gray-700 mb-1">
									Pengiriman Terkait
								</label>
								{laporForm.pengiriman_id ? (
									<div className="flex items-center justify-between px-3 py-2.5 bg-indigo-50 border border-indigo-200 rounded-xl text-sm">
										<span>
											{laporForm.pengiriman_nomor_resi} ·{" "}
											{laporForm.pengiriman_penerima_nama}
										</span>
										<button
											onClick={() =>
												setLaporForm((f) => ({
													...f,
													pengiriman_id: "",
													pengiriman_nomor_resi: "",
													pengiriman_penerima_nama: "",
												}))
											}
											className="text-indigo-500 hover:text-indigo-700">
											<X size={14} />
										</button>
									</div>
								) : (
									<>
										<div className="relative">
											<Search
												size={15}
												className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
											/>
											<input
												value={pgSearch}
												onChange={(e) => searchPengiriman(e.target.value)}
												placeholder="Cari nomor faktur, resi, atau nama penerima..."
												className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
											/>
										</div>
										{pgSearching && (
											<p className="text-xs text-gray-400 mt-2">Mencari...</p>
										)}
										{pgCandidates.length > 0 && (
											<div className="mt-2 space-y-1.5 max-h-40 overflow-y-auto">
												{pgCandidates.map((p) => (
													<button
														key={p.id}
														type="button"
														onClick={() => pickPengiriman(p)}
														className="w-full flex items-center justify-between px-3.5 py-2 bg-gray-50 hover:bg-indigo-50 rounded-xl text-left transition">
														<div>
															<p className="text-sm font-medium text-gray-900">
																{p.nomor_faktur}{" "}
																{p.nomor_resi ? `· ${p.nomor_resi}` : ""}
															</p>
															<p className="text-xs text-gray-500">
																{p.penerima_nama}
																{p.penerima_kota ? ` · ${p.penerima_kota}` : ""}
															</p>
														</div>
													</button>
												))}
											</div>
										)}
									</>
								)}
							</div>

							<div>
								<label className="block text-sm font-medium text-gray-700 mb-2">
									Tipe Klaim
								</label>
								<div className="grid grid-cols-2 gap-3">
									{(["hilang", "rusak"] as const).map((t) => {
										const cfg = TIPE_CFG[t];
										const Icon = cfg.icon;
										const active = laporForm.tipe === t;
										return (
											<button
												key={t}
												type="button"
												onClick={() => setLaporForm((f) => ({ ...f, tipe: t }))}
												className={`flex flex-col items-center gap-1.5 py-3 rounded-xl border-2 transition ${
													active
														? "border-indigo-500 bg-indigo-50"
														: "border-gray-200 hover:border-gray-300"
												}`}>
												<Icon
													size={18}
													className={active ? "text-indigo-600" : "text-gray-400"}
												/>
												<span
													className={`text-xs font-medium ${active ? "text-indigo-700" : "text-gray-600"}`}>
													{cfg.label}
												</span>
											</button>
										);
									})}
								</div>
							</div>

							<div>
								<label className="block text-sm font-medium text-gray-700 mb-1">
									Nilai Klaim yang Diajukan
								</label>
								<input
									type="number"
									value={laporForm.nilai_klaim}
									onChange={(e) =>
										setLaporForm((f) => ({ ...f, nilai_klaim: e.target.value }))
									}
									className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
								/>
							</div>

							<div>
								<label className="block text-sm font-medium text-gray-700 mb-1">
									Kronologi Kejadian
								</label>
								<textarea
									value={laporForm.kronologi}
									onChange={(e) =>
										setLaporForm((f) => ({ ...f, kronologi: e.target.value }))
									}
									rows={3}
									placeholder="Ceritakan kejadiannya..."
									className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
								/>
							</div>

							<div>
								<label className="block text-sm font-medium text-gray-700 mb-1">
									Foto Bukti (opsional)
								</label>
								<input
									type="file"
									accept="image/*"
									onChange={(e) => {
										const f = e.target.files?.[0] ?? null;
										setBuktiFile(f);
										setBuktiPreview(f ? URL.createObjectURL(f) : null);
									}}
									className="w-full text-sm text-gray-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-medium file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
								/>
								{buktiPreview && (
									<img
										src={buktiPreview}
										alt="Preview bukti"
										className="mt-2 h-28 w-44 object-cover rounded-xl border border-gray-200"
									/>
								)}
							</div>
						</div>
						<div className="flex gap-3 p-6 pt-4 border-t border-gray-100">
							<button
								onClick={() => setModal(null)}
								className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium hover:bg-gray-50">
								Batal
							</button>
							<button
								onClick={saveLapor}
								disabled={
									saving || !laporForm.pengiriman_id || !laporForm.nilai_klaim
								}
								className="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white px-4 py-2.5 rounded-xl text-sm font-medium">
								{saving ? "Menyimpan..." : "Simpan Klaim"}
							</button>
						</div>
					</div>
				</div>
			)}

			{/* Modal Proses Klaim (approve/tolak) — khusus superadmin */}
			{modal === "proses" && selected && (
				<div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
					<div className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
						<div className="flex items-center justify-between p-6 border-b border-gray-100">
							<div>
								<h2 className="text-lg font-semibold">Proses Klaim</h2>
								<p className="text-sm text-gray-500 font-mono">
									{selected.nomor_klaim}
								</p>
							</div>
							<button
								onClick={() => setModal(null)}
								className="p-2 hover:bg-gray-100 rounded-lg">
								<X size={18} />
							</button>
						</div>
						<div className="p-6 space-y-4">
							<div className="bg-gray-50 rounded-xl p-4 space-y-2 text-sm">
								<div className="flex justify-between">
									<span className="text-gray-500">Pengiriman</span>
									<span className="font-medium">
										{selected.pengiriman_nomor_resi || "-"}
									</span>
								</div>
								<div className="flex justify-between">
									<span className="text-gray-500">Penerima</span>
									<span className="font-medium">
										{selected.pengiriman_penerima_nama || "-"}
									</span>
								</div>
								<div className="flex justify-between">
									<span className="text-gray-500">Nilai Diajukan</span>
									<span className="font-semibold">
										{formatRupiah(selected.nilai_klaim)}
									</span>
								</div>
								{selected.kronologi && (
									<p className="text-xs text-gray-500 border-t border-gray-200 pt-2">
										{selected.kronologi}
									</p>
								)}
							</div>

							<div>
								<label className="block text-sm font-medium text-gray-700 mb-1">
									Nilai Disetujui
								</label>
								<input
									type="number"
									value={prosesForm.nilai_disetujui}
									onChange={(e) =>
										setProsesForm({ ...prosesForm, nilai_disetujui: e.target.value })
									}
									className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
								/>
							</div>

							<div>
								<label className="block text-sm font-medium text-gray-700 mb-1">
									Catatan
								</label>
								<textarea
									value={prosesForm.catatan_approval}
									onChange={(e) =>
										setProsesForm({
											...prosesForm,
											catatan_approval: e.target.value,
										})
									}
									rows={2}
									placeholder="Opsional"
									className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
								/>
							</div>
						</div>
						<div className="flex gap-3 p-6 pt-0">
							<button
								onClick={() => approveKlaim("ditolak")}
								disabled={saving}
								className="flex-1 flex items-center justify-center gap-2 bg-red-50 hover:bg-red-100 disabled:opacity-50 text-red-600 px-4 py-2.5 rounded-xl text-sm font-semibold border border-red-200">
								<XCircle size={15} /> Tolak
							</button>
							<button
								onClick={() => approveKlaim("disetujui")}
								disabled={saving || !prosesForm.nilai_disetujui}
								className="flex-1 flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 disabled:bg-green-300 text-white px-4 py-2.5 rounded-xl text-sm font-semibold">
								<CheckCircle2 size={15} /> Setujui
							</button>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}
