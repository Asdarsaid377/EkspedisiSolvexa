"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { formatRupiah, formatDate } from "@/lib/utils";
import {
	Plus,
	Search,
	X,
	Trash2,
	Edit3,
	Building,
	Power,
	User,
} from "lucide-react";

const emptyForm = {
	nama: "",
	tipe: "umum" as "umum" | "korporat",
	telepon: "",
	alamat: "",
	kota: "",
	pic_nama: "",
	pic_telepon: "",
	term_hari: "0",
	catatan: "",
	aktif: true,
};

export default function CustomerPage() {
	const { role, isSuperAdmin, loading: authLoading } = useAuth();
	const router = useRouter();
	const supabase = createClient();

	const canManage =
		isSuperAdmin || role === "cs" || role === "kasir" || role === "keuangan";
	const canNonaktifkanHapus = isSuperAdmin || role === "keuangan";

	const [list, setList] = useState<any[]>([]);
	const [loading, setLoading] = useState(true);
	const [search, setSearch] = useState("");
	const [modal, setModal] = useState<"form" | null>(null);
	const [editingId, setEditingId] = useState<string | null>(null);
	const [form, setForm] = useState(emptyForm);
	const [saving, setSaving] = useState(false);
	const [formError, setFormError] = useState("");
	const [listError, setListError] = useState("");

	const [selected, setSelected] = useState<any | null>(null);
	const [ringkasan, setRingkasan] = useState<{
		totalKiriman: number;
		totalPiutang: number;
		terakhir: any[];
	} | null>(null);
	const [ringkasanLoading, setRingkasanLoading] = useState(false);

	useEffect(() => {
		if (authLoading) return;
		if (!canManage) {
			router.replace("/dashboard");
			return;
		}
		loadAll();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [canManage, authLoading]);

	if (authLoading || !canManage) return null;

	const loadAll = async () => {
		const { data } = await supabase.from("customer").select("*").order("nama");
		setList(data || []);
		setLoading(false);
	};

	const openForm = (row?: any) => {
		setFormError("");
		if (row) {
			setEditingId(row.id);
			setForm({
				nama: row.nama,
				tipe: row.tipe,
				telepon: row.telepon || "",
				alamat: row.alamat || "",
				kota: row.kota || "",
				pic_nama: row.pic_nama || "",
				pic_telepon: row.pic_telepon || "",
				term_hari: String(row.term_hari ?? 0),
				catatan: row.catatan || "",
				aktif: row.aktif,
			});
		} else {
			setEditingId(null);
			setForm(emptyForm);
		}
		setModal("form");
	};

	const saveForm = async () => {
		if (!form.nama.trim()) return;
		setSaving(true);
		setFormError("");

		const payload = {
			nama: form.nama.trim(),
			tipe: form.tipe,
			telepon: form.telepon || null,
			alamat: form.alamat || null,
			kota: form.kota || null,
			pic_nama: form.pic_nama || null,
			pic_telepon: form.pic_telepon || null,
			term_hari: Number(form.term_hari) || 0,
			catatan: form.catatan || null,
			aktif: form.aktif,
		};

		const { error } = editingId
			? await supabase.from("customer").update(payload).eq("id", editingId)
			: await supabase.from("customer").insert(payload);

		if (error) {
			setFormError("Gagal menyimpan: " + error.message);
			setSaving(false);
			return;
		}

		setSaving(false);
		setModal(null);
		loadAll();
	};

	const toggleAktif = async (row: any) => {
		await supabase.from("customer").update({ aktif: !row.aktif }).eq("id", row.id);
		loadAll();
	};

	const hapus = async (id: string) => {
		if (!confirm("Hapus customer ini?")) return;
		setListError("");
		const { error } = await supabase.from("customer").delete().eq("id", id);
		if (error) {
			setListError(
				error.code === "23503"
					? "Customer ini masih dipakai oleh pengiriman — nonaktifkan saja, jangan dihapus."
					: "Gagal menghapus: " + error.message,
			);
			return;
		}
		loadAll();
	};

	const openRingkasan = async (row: any) => {
		setSelected(row);
		setRingkasan(null);
		setRingkasanLoading(true);

		const [{ count }, { data: belumLunas }, { data: terakhir }] = await Promise.all([
			supabase
				.from("pengiriman")
				.select("id", { count: "exact", head: true })
				.eq("customer_id", row.id),
			supabase
				.from("pengiriman")
				.select("total_tagihan, uang_dp")
				.eq("customer_id", row.id)
				.neq("status_bayar", "lunas"),
			supabase
				.from("pengiriman")
				.select(
					"id, nomor_faktur, nomor_resi, tanggal, total_tagihan, uang_dp, status_bayar, milestone",
				)
				.eq("customer_id", row.id)
				.order("tanggal", { ascending: false })
				.limit(10),
		]);

		const totalPiutang = (belumLunas || []).reduce(
			(s, p) => s + (p.total_tagihan - p.uang_dp),
			0,
		);

		setRingkasan({
			totalKiriman: count || 0,
			totalPiutang,
			terakhir: terakhir || [],
		});
		setRingkasanLoading(false);
	};

	const filtered = list.filter(
		(r) =>
			r.nama.toLowerCase().includes(search.toLowerCase()) ||
			(r.telepon || "").toLowerCase().includes(search.toLowerCase()) ||
			(r.kota || "").toLowerCase().includes(search.toLowerCase()),
	);

	return (
		<div>
			<div className="flex items-center justify-between mb-6">
				<div>
					<h1 className="text-2xl font-bold text-gray-900">Customer</h1>
					<p className="text-gray-500 mt-1">
						{list.length} customer — pengirim terdaftar, dipakai di form pengiriman & laporan piutang
					</p>
				</div>
				<button
					onClick={() => openForm()}
					className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition">
					<Plus size={16} /> Customer Baru
				</button>
			</div>

			{listError && (
				<div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm mb-6">
					{listError}
				</div>
			)}

			<div className="relative mb-6 max-w-md">
				<Search
					size={16}
					className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
				/>
				<input
					value={search}
					onChange={(e) => setSearch(e.target.value)}
					placeholder="Cari nama / telepon / kota..."
					className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
				/>
			</div>

			<div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
				{loading ? (
					<div className="text-center py-12 text-gray-400">Memuat...</div>
				) : filtered.length === 0 ? (
					<div className="text-center py-12 text-gray-400">Belum ada customer</div>
				) : (
					<table className="w-full text-sm">
						<thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
							<tr>
								<th className="text-left px-5 py-3">Nama</th>
								<th className="text-left px-5 py-3">Tipe</th>
								<th className="text-left px-5 py-3">Telepon</th>
								<th className="text-left px-5 py-3">Kota</th>
								<th className="text-center px-5 py-3">Term (hari)</th>
								<th className="text-center px-5 py-3">Status</th>
								<th className="text-right px-5 py-3">Aksi</th>
							</tr>
						</thead>
						<tbody className="divide-y divide-gray-50">
							{filtered.map((r) => (
								<tr
									key={r.id}
									onClick={() => openRingkasan(r)}
									className={`cursor-pointer hover:bg-gray-50 transition ${!r.aktif ? "opacity-50" : ""}`}>
									<td className="px-5 py-3">
										<div className="flex items-center gap-1.5 font-medium text-gray-900">
											<Building size={13} className="text-gray-400" />
											{r.nama}
										</div>
									</td>
									<td className="px-5 py-3">
										<span
											className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
												r.tipe === "korporat"
													? "bg-blue-100 text-blue-700"
													: "bg-gray-100 text-gray-600"
											}`}>
											{r.tipe === "korporat" ? "Korporat" : "Umum"}
										</span>
									</td>
									<td className="px-5 py-3 text-gray-600">{r.telepon || "-"}</td>
									<td className="px-5 py-3 text-gray-600">{r.kota || "-"}</td>
									<td className="px-5 py-3 text-center text-gray-600">{r.term_hari}</td>
									<td className="px-5 py-3 text-center">
										{canNonaktifkanHapus ? (
											<button
												onClick={(e) => {
													e.stopPropagation();
													toggleAktif(r);
												}}
												className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-semibold transition ${
													r.aktif
														? "bg-green-100 text-green-700 hover:bg-green-200"
														: "bg-gray-100 text-gray-500 hover:bg-gray-200"
												}`}>
												<Power size={10} /> {r.aktif ? "Aktif" : "Nonaktif"}
											</button>
										) : (
											<span
												className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
													r.aktif
														? "bg-green-100 text-green-700"
														: "bg-gray-100 text-gray-500"
												}`}>
												{r.aktif ? "Aktif" : "Nonaktif"}
											</span>
										)}
									</td>
									<td className="px-5 py-3">
										<div className="flex items-center justify-end gap-1">
											<button
												onClick={(e) => {
													e.stopPropagation();
													openForm(r);
												}}
												className="p-1.5 hover:bg-indigo-50 rounded-lg text-indigo-600 transition">
												<Edit3 size={14} />
											</button>
											{canNonaktifkanHapus && (
												<button
													onClick={(e) => {
														e.stopPropagation();
														hapus(r.id);
													}}
													className="p-1.5 hover:bg-red-50 rounded-lg text-red-500 transition">
													<Trash2 size={14} />
												</button>
											)}
										</div>
									</td>
								</tr>
							))}
						</tbody>
					</table>
				)}
			</div>

			{/* Modal Form */}
			{modal === "form" && (
				<div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
					<div className="bg-white rounded-2xl w-full max-w-md shadow-2xl max-h-[90vh] flex flex-col">
						<div className="flex items-center justify-between p-6 border-b border-gray-100">
							<h2 className="text-lg font-semibold">
								{editingId ? "Edit Customer" : "Customer Baru"}
							</h2>
							<button
								onClick={() => setModal(null)}
								className="p-2 hover:bg-gray-100 rounded-lg">
								<X size={18} />
							</button>
						</div>
						<div className="flex-1 overflow-y-auto p-6 space-y-4">
							<div>
								<label className="block text-sm font-medium text-gray-700 mb-1">
									Nama
								</label>
								<input
									value={form.nama}
									onChange={(e) => setForm({ ...form, nama: e.target.value })}
									placeholder="Nama toko/perusahaan/perorangan"
									className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
								/>
							</div>
							<div>
								<label className="block text-sm font-medium text-gray-700 mb-1">
									Tipe
								</label>
								<div className="grid grid-cols-2 gap-3">
									{(["umum", "korporat"] as const).map((t) => (
										<button
											key={t}
											type="button"
											onClick={() => setForm({ ...form, tipe: t })}
											className={`py-2.5 rounded-xl border-2 text-sm font-medium transition ${
												form.tipe === t
													? "border-indigo-500 bg-indigo-50 text-indigo-700"
													: "border-gray-200 text-gray-600 hover:border-gray-300"
											}`}>
											{t === "korporat" ? "Korporat" : "Umum"}
										</button>
									))}
								</div>
							</div>
							<div className="grid grid-cols-2 gap-3">
								<div>
									<label className="block text-sm font-medium text-gray-700 mb-1">
										Telepon
									</label>
									<input
										value={form.telepon}
										onChange={(e) => setForm({ ...form, telepon: e.target.value })}
										className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
									/>
								</div>
								<div>
									<label className="block text-sm font-medium text-gray-700 mb-1">
										Kota
									</label>
									<input
										value={form.kota}
										onChange={(e) => setForm({ ...form, kota: e.target.value })}
										className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
									/>
								</div>
							</div>
							<div>
								<label className="block text-sm font-medium text-gray-700 mb-1">
									Alamat
								</label>
								<input
									value={form.alamat}
									onChange={(e) => setForm({ ...form, alamat: e.target.value })}
									placeholder="Opsional"
									className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
								/>
							</div>
							{form.tipe === "korporat" && (
								<div className="grid grid-cols-2 gap-3">
									<div>
										<label className="block text-sm font-medium text-gray-700 mb-1">
											Nama PIC
										</label>
										<input
											value={form.pic_nama}
											onChange={(e) => setForm({ ...form, pic_nama: e.target.value })}
											placeholder="Opsional"
											className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
										/>
									</div>
									<div>
										<label className="block text-sm font-medium text-gray-700 mb-1">
											Telepon PIC
										</label>
										<input
											value={form.pic_telepon}
											onChange={(e) => setForm({ ...form, pic_telepon: e.target.value })}
											placeholder="Opsional"
											className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
										/>
									</div>
								</div>
							)}
							<div>
								<label className="block text-sm font-medium text-gray-700 mb-1">
									Term Pembayaran (hari)
								</label>
								<input
									type="number"
									min={0}
									value={form.term_hari}
									onChange={(e) => setForm({ ...form, term_hari: e.target.value })}
									className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
								/>
								<p className="text-xs text-gray-400 mt-1">
									0 = tunai/langsung. Dipakai menghitung jatuh tempo di laporan Piutang.
								</p>
							</div>
							<div>
								<label className="block text-sm font-medium text-gray-700 mb-1">
									Catatan
								</label>
								<input
									value={form.catatan}
									onChange={(e) => setForm({ ...form, catatan: e.target.value })}
									placeholder="Opsional"
									className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
								/>
							</div>
							{formError && (
								<div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2.5 rounded-xl text-sm">
									{formError}
								</div>
							)}
						</div>
						<div className="flex gap-3 p-6 pt-4 border-t border-gray-100">
							<button
								onClick={() => setModal(null)}
								className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium hover:bg-gray-50">
								Batal
							</button>
							<button
								onClick={saveForm}
								disabled={saving || !form.nama.trim()}
								className="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white px-4 py-2.5 rounded-xl text-sm font-medium">
								{saving ? "Menyimpan..." : "Simpan"}
							</button>
						</div>
					</div>
				</div>
			)}

			{/* Panel Ringkas */}
			{selected && (
				<div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
					<div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl max-h-[90vh] flex flex-col">
						<div className="flex items-center justify-between p-6 border-b border-gray-100">
							<div>
								<h2 className="text-lg font-semibold flex items-center gap-2">
									{selected.nama}
									<span
										className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
											selected.tipe === "korporat"
												? "bg-blue-100 text-blue-700"
												: "bg-gray-100 text-gray-600"
										}`}>
										{selected.tipe === "korporat" ? "Korporat" : "Umum"}
									</span>
								</h2>
								<p className="text-sm text-gray-500 mt-0.5">
									{selected.telepon || "-"}
									{selected.kota ? ` · ${selected.kota}` : ""}
									{selected.pic_nama ? ` · PIC: ${selected.pic_nama}` : ""}
								</p>
							</div>
							<button
								onClick={() => setSelected(null)}
								className="p-2 hover:bg-gray-100 rounded-lg">
								<X size={18} />
							</button>
						</div>
						<div className="flex-1 overflow-y-auto p-6">
							{ringkasanLoading || !ringkasan ? (
								<div className="text-center py-12 text-gray-400">Memuat ringkasan...</div>
							) : (
								<>
									<div className="grid grid-cols-2 gap-4 mb-6">
										<div className="bg-gray-50 rounded-xl p-4">
											<p className="text-xs text-gray-500 mb-1">Total Kiriman</p>
											<p className="text-xl font-bold text-gray-900">
												{ringkasan.totalKiriman}
											</p>
										</div>
										<div className="bg-red-50 rounded-xl p-4">
											<p className="text-xs text-red-500 mb-1">Total Piutang</p>
											<p className="text-xl font-bold text-red-600">
												{formatRupiah(ringkasan.totalPiutang)}
											</p>
										</div>
									</div>

									<p className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
										<User size={14} className="text-gray-400" /> Kiriman Terakhir
									</p>
									{ringkasan.terakhir.length === 0 ? (
										<p className="text-sm text-gray-400 italic">
											Belum ada kiriman untuk customer ini.
										</p>
									) : (
										<div className="space-y-2">
											{ringkasan.terakhir.map((p) => {
												const sisa = p.total_tagihan - p.uang_dp;
												return (
													<div
														key={p.id}
														className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-2.5 text-sm">
														<div>
															<p className="font-mono text-xs font-medium text-gray-700">
																{p.nomor_faktur}
															</p>
															<p className="text-xs text-gray-400">{formatDate(p.tanggal)}</p>
														</div>
														<div className="text-right">
															<p className="font-semibold text-gray-800">
																{formatRupiah(p.total_tagihan)}
															</p>
															<span
																className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
																	p.status_bayar === "lunas"
																		? "bg-green-100 text-green-700"
																		: "bg-red-100 text-red-700"
																}`}>
																{p.status_bayar === "lunas"
																	? "Lunas"
																	: `Sisa ${formatRupiah(sisa)}`}
															</span>
														</div>
													</div>
												);
											})}
										</div>
									)}
								</>
							)}
						</div>
					</div>
				</div>
			)}
		</div>
	);
}
