"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { formatRupiah, formatDate } from "@/lib/utils";
import {
	Plus,
	Search,
	Edit,
	X,
	History,
AlertTriangle,
	Package,
	TrendingDown,
	TrendingUp,
	Layers,
} from "lucide-react";

interface BahanBaku {
	id: string;
	kode: string | null;
	nama: string;
	satuan: string;
	harga_beli_terakhir: number;
	stok: number;
	stok_minimum: number;
	catatan: string | null;
	aktif: boolean;
}

const SATUAN_PRESETS = ["unit", "meter", "kg", "lembar", "liter", "batang", "buah", "roll", "set"];

type ModalType = "tambah" | "edit" | "stok" | "mutasi" | null;

export default function BahanBakuPage() {
	const { isSuperAdmin } = useAuth();
	const supabase = createClient();

	const [list, setList] = useState<BahanBaku[]>([]);
	const [loading, setLoading] = useState(true);
	const [search, setSearch] = useState("");
	const [filterMenipis, setFilterMenipis] = useState(false);
	const [modal, setModal] = useState<ModalType>(null);
	const [selected, setSelected] = useState<BahanBaku | null>(null);
	const [mutasiList, setMutasiList] = useState<any[]>([]);
const [saving, setSaving] = useState(false);
	const [formError, setFormError] = useState("");

	const [form, setForm] = useState({
		kode: "",
		nama: "",
		satuan: "unit",
		satuan_custom: "",
		harga_beli_terakhir: "",
		stok_minimum: "0",
		catatan: "",
	});

	const [stokForm, setStokForm] = useState({
		tipe: "masuk" as "masuk" | "keluar" | "koreksi",
		jumlah: "",
		harga_satuan: "",
		keterangan: "",
	});

	useEffect(() => {
		load();
	}, []);

	const load = async () => {
		const { data } = await supabase
			.from("bahan_baku")
			.select("*")
			.eq("aktif", true)
			.order("nama");
		setList(data || []);
		setLoading(false);
	};

	const filtered = list.filter((b) => {
		if (filterMenipis && b.stok > b.stok_minimum) return false;
		if (search) {
			const s = search.toLowerCase();
			return b.nama.toLowerCase().includes(s) || (b.kode || "").toLowerCase().includes(s);
		}
		return true;
	});

	const totalNilai = list.reduce((s, b) => s + b.stok * b.harga_beli_terakhir, 0);
	const jumlahMenipis = list.filter((b) => b.stok <= b.stok_minimum).length;

	// ── Helpers ──────────────────────────────────────────────────────────────

	const getSatuan = () =>
		form.satuan === "__custom" ? form.satuan_custom.trim() : form.satuan;

	const openTambah = () => {
		setForm({ kode: "", nama: "", satuan: "unit", satuan_custom: "", harga_beli_terakhir: "", stok_minimum: "0", catatan: "" });
		setFormError("");
		setSelected(null);
		setModal("tambah");
	};

	const openEdit = (b: BahanBaku) => {
		const isPreset = SATUAN_PRESETS.includes(b.satuan);
		setForm({
			kode: b.kode || "",
			nama: b.nama,
			satuan: isPreset ? b.satuan : "__custom",
			satuan_custom: isPreset ? "" : b.satuan,
			harga_beli_terakhir: String(b.harga_beli_terakhir),
			stok_minimum: String(b.stok_minimum),
			catatan: b.catatan || "",
		});
		setFormError("");
		setSelected(b);
		setModal("edit");
	};

	const openStok = (b: BahanBaku) => {
		setSelected(b);
		setStokForm({ tipe: "masuk", jumlah: "", harga_satuan: "", keterangan: "" });
		setModal("stok");
	};

	const openMutasi = async (b: BahanBaku) => {
		setSelected(b);
		const { data } = await supabase
			.from("mutasi_bahan_baku")
			.select("*, profiles(name)")
			.eq("bahan_baku_id", b.id)
			.order("created_at", { ascending: false })
			.limit(30);
		setMutasiList(data || []);
		setModal("mutasi");
	};

	// ── Save Bahan Baku ───────────────────────────────────────────────────────

	const saveBahanBaku = async () => {
		if (!form.nama.trim()) { setFormError("Nama wajib diisi"); return; }
		const satuan = getSatuan();
		if (!satuan) { setFormError("Satuan wajib diisi"); return; }

		setSaving(true);
		setFormError("");

		const payload = {
			kode: form.kode.trim() || null,
			nama: form.nama.trim(),
			satuan,
			harga_beli_terakhir: parseFloat(form.harga_beli_terakhir) || 0,
			stok_minimum: parseFloat(form.stok_minimum) || 0,
			catatan: form.catatan.trim() || null,
		};

		if (modal === "tambah") {
			const { error } = await supabase.from("bahan_baku").insert({ ...payload, stok: 0 });
			if (error) {
				setFormError(error.code === "23505" ? `Nama "${form.nama}" sudah ada.` : "Gagal menyimpan: " + error.message);
				setSaving(false);
				return;
			}
		} else if (selected) {
			const { error } = await supabase.from("bahan_baku").update(payload).eq("id", selected.id);
			if (error) {
				setFormError("Gagal menyimpan: " + error.message);
				setSaving(false);
				return;
			}
		}

		setSaving(false);
		setModal(null);
		load();
	};

	// ── Save Stok ─────────────────────────────────────────────────────────────

	const saveStok = async () => {
		if (!selected) return;
		const jumlah = parseFloat(stokForm.jumlah);
		if (!jumlah || jumlah <= 0) { setFormError("Jumlah harus lebih dari 0"); return; }

		setSaving(true);
		setFormError("");

		const stokSebelum = selected.stok;
		const stokSesudah =
			stokForm.tipe === "masuk"
				? stokSebelum + jumlah
				: stokForm.tipe === "keluar"
				? stokSebelum - jumlah
				: jumlah; // koreksi = set langsung

		const hargaSatuan = parseFloat(stokForm.harga_satuan) || 0;

		// Update stok + harga_beli_terakhir (jika masuk)
		const updatePayload: any = { stok: stokSesudah };
		if (stokForm.tipe === "masuk" && hargaSatuan > 0) {
			updatePayload.harga_beli_terakhir = hargaSatuan;
		}
		await supabase.from("bahan_baku").update(updatePayload).eq("id", selected.id);

		// Insert mutasi
		await supabase.from("mutasi_bahan_baku").insert({
			bahan_baku_id: selected.id,
			tipe: stokForm.tipe,
			jumlah,
			stok_sebelum: stokSebelum,
			stok_sesudah: stokSesudah,
			harga_satuan: hargaSatuan,
			keterangan: stokForm.keterangan.trim() || null,
			referensi_tipe: "koreksi",
		});

		setSaving(false);
		setModal(null);
		load();
	};

	// ── Hapus (soft delete) ───────────────────────────────────────────────────

	const hapusBahanBaku = async (id: string) => {
		if (!confirm("Nonaktifkan bahan baku ini? Data riwayat akan tetap tersimpan.")) return;
		await supabase.from("bahan_baku").update({ aktif: false }).eq("id", id);
		load();
	};

	// ─────────────────────────────────────────────────────────────────────────

	return (
		<div>
			{/* ── Header ── */}
			<div className="flex items-start justify-between gap-3 mb-6">
				<div>
					<h1 className="text-2xl font-bold text-gray-900">Bahan Baku</h1>
					<p className="text-gray-500 mt-1">Master material untuk produksi</p>
				</div>
				<button
					onClick={openTambah}
					className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition flex-shrink-0">
					<Plus size={16} />
					<span className="hidden sm:inline">Tambah Bahan</span>
					<span className="sm:hidden">Tambah</span>
				</button>
			</div>

			{/* ── Stat Cards ── */}
			<div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-6">
				<div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
					<p className="text-xs text-gray-500 mb-1">Total Jenis Bahan</p>
					<p className="text-2xl font-bold text-indigo-600">{list.length}</p>
				</div>
				<div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
					<p className="text-xs text-gray-500 mb-1">Nilai Stok</p>
					<p className="text-lg font-bold text-green-600">{formatRupiah(totalNilai)}</p>
				</div>
				<div
					onClick={() => setFilterMenipis(!filterMenipis)}
					className={`col-span-2 sm:col-span-1 bg-white rounded-2xl p-4 shadow-sm border cursor-pointer transition ${
						jumlahMenipis > 0 ? "border-red-200 bg-red-50" : "border-gray-100"
					}`}>
					<p className="text-xs text-gray-500 mb-1">Stok Menipis</p>
					<p className={`text-2xl font-bold ${jumlahMenipis > 0 ? "text-red-600" : "text-gray-400"}`}>
						{jumlahMenipis}
					</p>
				</div>
			</div>

			{/* ── Filter ── */}
			<div className="flex gap-3 mb-4">
				<div className="relative flex-1">
					<Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
					<input
						value={search}
						onChange={(e) => setSearch(e.target.value)}
						placeholder="Cari nama atau kode bahan..."
						className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
					/>
					{search && (
						<button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
							<X size={14} />
						</button>
					)}
				</div>
				<button
					onClick={() => setFilterMenipis(!filterMenipis)}
					className={`flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-sm font-medium border transition flex-shrink-0 ${
						filterMenipis
							? "bg-red-600 text-white border-red-600"
							: "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
					}`}>
					<AlertTriangle size={14} />
					Menipis
				</button>
			</div>

			{/* ── Tabel ── */}
			<div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
				<table className="w-full text-sm">
					<thead className="bg-gray-50 border-b border-gray-100">
						<tr>
							<th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Bahan Baku</th>
							<th className="text-center px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Satuan</th>
							<th className="text-right px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Stok</th>
							<th className="text-right px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Nilai Stok</th>
							{isSuperAdmin && (
								<th className="text-right px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Harga Beli</th>
							)}
							<th className="text-right px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Min</th>
							<th className="text-center px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Aksi</th>
						</tr>
					</thead>
					<tbody className="divide-y divide-gray-50">
						{loading ? (
							<tr><td colSpan={7} className="text-center py-12 text-gray-400">Memuat...</td></tr>
						) : filtered.length === 0 ? (
							<tr><td colSpan={7} className="text-center py-12 text-gray-400">Tidak ada bahan baku</td></tr>
						) : (
							filtered.map((b) => {
								const menipis = b.stok <= b.stok_minimum;
								return (
									<tr key={b.id} className="hover:bg-gray-50 transition">
										<td className="px-5 py-3.5">
											<p className="font-medium text-gray-900">{b.nama}</p>
											{b.kode && <p className="text-xs text-gray-400">{b.kode}</p>}
										</td>
										<td className="px-5 py-3.5 text-center">
											<span className="bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded-full font-medium">
												{b.satuan}
											</span>
										</td>
										<td className="px-5 py-3.5 text-right">
											<span className={`font-semibold ${menipis ? "text-red-600" : "text-gray-900"}`}>
												{b.stok % 1 === 0 ? b.stok : b.stok.toFixed(3)}
											</span>
											{menipis && <p className="text-xs text-red-500 font-medium">Menipis!</p>}
										</td>
										<td className="px-5 py-3.5 text-right text-green-700 font-medium">
											{formatRupiah(b.stok * b.harga_beli_terakhir)}
										</td>
										{isSuperAdmin && (
											<td className="px-5 py-3.5 text-right text-gray-600">
												{formatRupiah(b.harga_beli_terakhir)}
											</td>
										)}
										<td className="px-5 py-3.5 text-right text-gray-400 text-xs">
											{b.stok_minimum % 1 === 0 ? b.stok_minimum : b.stok_minimum.toFixed(3)}
										</td>
										<td className="px-4 py-3.5">
											<div className="flex items-center justify-center gap-1">
												<button
													onClick={() => openStok(b)}
													title="Kelola Stok"
													className="p-1.5 hover:bg-indigo-50 rounded-lg text-indigo-500 transition">
													<Layers size={15} />
												</button>
												<button
													onClick={() => openMutasi(b)}
													title="Riwayat Mutasi"
													className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-500 transition">
													<History size={15} />
												</button>
												<button
													onClick={() => openEdit(b)}
													title="Edit"
													className="p-1.5 hover:bg-yellow-50 rounded-lg text-yellow-600 transition">
													<Edit size={15} />
												</button>
												{isSuperAdmin && (
													<button
														onClick={() => hapusBahanBaku(b.id)}
														title="Nonaktifkan"
														className="p-1.5 hover:bg-red-50 rounded-lg text-red-400 transition">
														<X size={15} />
													</button>
												)}
											</div>
										</td>
									</tr>
								);
							})
						)}
					</tbody>
				</table>
			</div>

			{/* ══ MODAL TAMBAH / EDIT ══════════════════════════════════════════════ */}
			{(modal === "tambah" || modal === "edit") && (
				<div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
					<div className="bg-white rounded-2xl w-full max-w-md shadow-2xl max-h-[90vh] flex flex-col">
						<div className="flex items-center justify-between p-6 border-b border-gray-100 flex-shrink-0">
							<h2 className="text-lg font-semibold">
								{modal === "tambah" ? "Tambah Bahan Baku" : "Edit Bahan Baku"}
							</h2>
							<button onClick={() => setModal(null)} className="p-2 hover:bg-gray-100 rounded-lg">
								<X size={18} />
							</button>
						</div>
						<div className="p-6 space-y-4 overflow-y-auto flex-1">
							<div className="grid grid-cols-2 gap-4">
								{/* Nama */}
								<div className="col-span-2">
									<label className="block text-sm font-medium text-gray-700 mb-1">Nama Bahan Baku *</label>
									<input
										value={form.nama}
										onChange={(e) => setForm({ ...form, nama: e.target.value })}
										placeholder="Kayu Rangka, Kain Sofa, Busa..."
										className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
									/>
								</div>
								{/* Kode */}
								<div>
									<label className="block text-sm font-medium text-gray-700 mb-1">Kode</label>
									<input
										value={form.kode}
										onChange={(e) => setForm({ ...form, kode: e.target.value })}
										placeholder="BB-001 (opsional)"
										className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
									/>
								</div>
								{/* Satuan */}
								<div>
									<label className="block text-sm font-medium text-gray-700 mb-1">Satuan *</label>
									<select
										value={form.satuan}
										onChange={(e) => setForm({ ...form, satuan: e.target.value })}
										className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white">
										{SATUAN_PRESETS.map((s) => <option key={s} value={s}>{s}</option>)}
										<option value="__custom">Lainnya...</option>
									</select>
									{form.satuan === "__custom" && (
										<input
											value={form.satuan_custom}
											onChange={(e) => setForm({ ...form, satuan_custom: e.target.value })}
											placeholder="Ketik satuan..."
											className="mt-2 w-full px-3 py-2.5 border border-indigo-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
											autoFocus
										/>
									)}
								</div>
								{/* Harga Beli */}
								{isSuperAdmin && (
									<div>
										<label className="block text-sm font-medium text-gray-700 mb-1">Harga Beli Terakhir</label>
										<input
											type="number"
											value={form.harga_beli_terakhir}
											onChange={(e) => setForm({ ...form, harga_beli_terakhir: e.target.value })}
											placeholder="0"
											className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
										/>
									</div>
								)}
								{/* Stok Minimum */}
								<div>
									<label className="block text-sm font-medium text-gray-700 mb-1">Stok Minimum</label>
									<input
										type="number"
										step="0.001"
										value={form.stok_minimum}
										onChange={(e) => setForm({ ...form, stok_minimum: e.target.value })}
										className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
									/>
								</div>
								{/* Catatan */}
								<div className="col-span-2">
									<label className="block text-sm font-medium text-gray-700 mb-1">Catatan</label>
									<textarea
										value={form.catatan}
										onChange={(e) => setForm({ ...form, catatan: e.target.value })}
										rows={2}
										placeholder="Spesifikasi, supplier, keterangan lain..."
										className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
									/>
								</div>
							</div>
						</div>
						{formError && (
							<div className="mx-6 mb-4 flex items-start gap-3 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm flex-shrink-0">
								<span className="mt-0.5">⚠️</span>
								<p>{formError}</p>
							</div>
						)}
						<div className="flex gap-3 p-6 pt-0 flex-shrink-0">
							<button onClick={() => setModal(null)} className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium hover:bg-gray-50">
								Batal
							</button>
							<button
								onClick={saveBahanBaku}
								disabled={saving || !form.nama}
								className="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white px-4 py-2.5 rounded-xl text-sm font-medium">
								{saving ? "Menyimpan..." : "Simpan"}
							</button>
						</div>
					</div>
				</div>
			)}

			{/* ══ MODAL KELOLA STOK ════════════════════════════════════════════════ */}
			{modal === "stok" && selected && (
				<div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
					<div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl">
						<div className="flex items-center justify-between p-6 border-b border-gray-100">
							<div>
								<h2 className="text-lg font-semibold">Kelola Stok</h2>
								<p className="text-sm text-gray-500 mt-0.5">{selected.nama}</p>
							</div>
							<button onClick={() => setModal(null)} className="p-2 hover:bg-gray-100 rounded-lg">
								<X size={18} />
							</button>
						</div>
						<div className="p-6 space-y-4">
							{/* Stok saat ini */}
							<div className="bg-gray-50 rounded-xl p-4 text-center">
								<p className="text-sm text-gray-500">Stok Saat Ini</p>
								<p className="text-3xl font-bold text-gray-900 mt-1">
									{selected.stok % 1 === 0 ? selected.stok : selected.stok.toFixed(3)}{" "}
									<span className="text-base font-normal text-gray-500">{selected.satuan}</span>
								</p>
							</div>

							{/* Tipe */}
							<div>
								<label className="block text-sm font-medium text-gray-700 mb-2">Tipe Mutasi</label>
								<div className="grid grid-cols-3 gap-2">
									{(["masuk", "keluar", "koreksi"] as const).map((t) => (
										<button
											key={t}
											onClick={() => setStokForm({ ...stokForm, tipe: t })}
											className={`py-2 rounded-xl text-xs font-semibold capitalize transition ${
												stokForm.tipe === t
													? t === "masuk"
														? "bg-green-600 text-white"
														: t === "keluar"
														? "bg-red-600 text-white"
														: "bg-orange-500 text-white"
													: "bg-gray-100 text-gray-600 hover:bg-gray-200"
											}`}>
											{t === "masuk" ? "Masuk" : t === "keluar" ? "Keluar" : "Koreksi"}
										</button>
									))}
								</div>
							</div>

							{/* Jumlah */}
							<div>
								<label className="block text-sm font-medium text-gray-700 mb-1">
									{stokForm.tipe === "koreksi" ? "Stok Baru" : "Jumlah"} ({selected.satuan})
								</label>
								<input
									type="number"
									step="0.001"
									min="0"
									value={stokForm.jumlah}
									onChange={(e) => setStokForm({ ...stokForm, jumlah: e.target.value })}
									placeholder="0"
									className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
								/>
							</div>

							{/* Harga Satuan — hanya saat masuk */}
							{stokForm.tipe === "masuk" && isSuperAdmin && (
								<div>
									<label className="block text-sm font-medium text-gray-700 mb-1">
										Harga Beli (/{selected.satuan}) — akan update harga terakhir
									</label>
									<input
										type="number"
										value={stokForm.harga_satuan}
										onChange={(e) => setStokForm({ ...stokForm, harga_satuan: e.target.value })}
										placeholder={String(selected.harga_beli_terakhir)}
										className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
									/>
								</div>
							)}

							{/* Preview stok sesudah */}
							{stokForm.jumlah && parseFloat(stokForm.jumlah) > 0 && (
								<div className="bg-indigo-50 rounded-xl px-4 py-3 text-sm">
									<span className="text-gray-500">Stok sesudah: </span>
									<span className="font-bold text-indigo-700">
										{(() => {
											const j = parseFloat(stokForm.jumlah);
											const hasil =
												stokForm.tipe === "masuk"
													? selected.stok + j
													: stokForm.tipe === "keluar"
													? selected.stok - j
													: j;
											return `${hasil % 1 === 0 ? hasil : hasil.toFixed(3)} ${selected.satuan}`;
										})()}
									</span>
								</div>
							)}

							{/* Keterangan */}
							<div>
								<label className="block text-sm font-medium text-gray-700 mb-1">Keterangan</label>
								<input
									value={stokForm.keterangan}
									onChange={(e) => setStokForm({ ...stokForm, keterangan: e.target.value })}
									placeholder="Beli dari supplier X, koreksi stock opname..."
									className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
								/>
							</div>

							{formError && (
								<p className="text-red-600 text-sm">{formError}</p>
							)}
						</div>
						<div className="flex gap-3 p-6 pt-0">
							<button onClick={() => setModal(null)} className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium hover:bg-gray-50">
								Batal
							</button>
							<button
								onClick={saveStok}
								disabled={saving || !stokForm.jumlah}
								className="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white px-4 py-2.5 rounded-xl text-sm font-medium">
								{saving ? "Menyimpan..." : "Simpan"}
							</button>
						</div>
					</div>
				</div>
			)}

			{/* ══ MODAL RIWAYAT MUTASI ═════════════════════════════════════════════ */}
			{modal === "mutasi" && selected && (
				<div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
					<div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl max-h-[85vh] flex flex-col">
						<div className="flex items-center justify-between p-6 border-b border-gray-100 flex-shrink-0">
							<div>
								<h2 className="text-lg font-semibold">Riwayat Mutasi</h2>
								<p className="text-sm text-gray-500 mt-0.5">{selected.nama}</p>
							</div>
							<button onClick={() => setModal(null)} className="p-2 hover:bg-gray-100 rounded-lg">
								<X size={18} />
							</button>
						</div>
						<div className="overflow-y-auto flex-1">
							{mutasiList.length === 0 ? (
								<div className="text-center py-12 text-gray-400">Belum ada riwayat</div>
							) : (
								<table className="w-full text-sm">
									<thead className="bg-gray-50 border-b border-gray-100 sticky top-0">
										<tr>
											<th className="text-left px-5 py-2.5 text-xs font-semibold text-gray-500">Tipe</th>
											<th className="text-right px-5 py-2.5 text-xs font-semibold text-gray-500">Jumlah</th>
											<th className="text-right px-5 py-2.5 text-xs font-semibold text-gray-500">Sesudah</th>
											<th className="text-left px-5 py-2.5 text-xs font-semibold text-gray-500">Keterangan</th>
											<th className="text-left px-5 py-2.5 text-xs font-semibold text-gray-500">Tanggal</th>
										</tr>
									</thead>
									<tbody className="divide-y divide-gray-50">
										{mutasiList.map((m) => (
											<tr key={m.id} className="hover:bg-gray-50">
												<td className="px-5 py-3">
													<span className={`flex items-center gap-1 text-xs font-semibold ${
														m.tipe === "masuk" ? "text-green-600" : m.tipe === "keluar" ? "text-red-600" : "text-orange-600"
													}`}>
														{m.tipe === "masuk" ? <TrendingUp size={12} /> : m.tipe === "keluar" ? <TrendingDown size={12} /> : null}
														{m.tipe}
													</span>
												</td>
												<td className="px-5 py-3 text-right font-medium">
													{m.tipe === "masuk" ? "+" : m.tipe === "keluar" ? "-" : "→"}{m.jumlah % 1 === 0 ? m.jumlah : parseFloat(m.jumlah).toFixed(3)}
												</td>
												<td className="px-5 py-3 text-right text-gray-600">
													{m.stok_sesudah % 1 === 0 ? m.stok_sesudah : parseFloat(m.stok_sesudah).toFixed(3)}
												</td>
												<td className="px-5 py-3 text-gray-500 max-w-[140px] truncate">{m.keterangan || "-"}</td>
												<td className="px-5 py-3 text-gray-400 text-xs whitespace-nowrap">{formatDate(m.created_at)}</td>
											</tr>
										))}
									</tbody>
								</table>
							)}
						</div>
					</div>
				</div>
			)}
		</div>
	);
}
