"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Plus, Search, X, Trash2, Edit3, Building2, Power } from "lucide-react";

const emptyForm = {
	nama: "",
	kota: "",
	alamat: "",
	telepon: "",
	catatan: "",
	aktif: true,
};

export default function CabangPage() {
	const { isSuperAdmin, loading: authLoading } = useAuth();
	const router = useRouter();
	const supabase = createClient();

	const [list, setList] = useState<any[]>([]);
	const [loading, setLoading] = useState(true);
	const [search, setSearch] = useState("");
	const [modal, setModal] = useState<"form" | null>(null);
	const [editingId, setEditingId] = useState<string | null>(null);
	const [form, setForm] = useState(emptyForm);
	const [saving, setSaving] = useState(false);
	const [formError, setFormError] = useState("");
	const [listError, setListError] = useState("");

	useEffect(() => {
		if (authLoading) return;
		if (!isSuperAdmin) {
			router.replace("/dashboard");
			return;
		}
		loadAll();
	}, [isSuperAdmin, authLoading]);

	if (authLoading || !isSuperAdmin) return null;

	const loadAll = async () => {
		const { data } = await supabase.from("cabang").select("*").order("nama");
		setList(data || []);
		setLoading(false);
	};

	const openForm = (row?: any) => {
		setFormError("");
		if (row) {
			setEditingId(row.id);
			setForm({
				nama: row.nama,
				kota: row.kota || "",
				alamat: row.alamat || "",
				telepon: row.telepon || "",
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
			kota: form.kota || null,
			alamat: form.alamat || null,
			telepon: form.telepon || null,
			catatan: form.catatan || null,
			aktif: form.aktif,
		};

		const { error } = editingId
			? await supabase.from("cabang").update(payload).eq("id", editingId)
			: await supabase.from("cabang").insert(payload);

		if (error) {
			setFormError(
				error.code === "23505"
					? "Nama cabang ini sudah ada."
					: "Gagal menyimpan: " + error.message,
			);
			setSaving(false);
			return;
		}

		setSaving(false);
		setModal(null);
		loadAll();
	};

	const toggleAktif = async (row: any) => {
		await supabase.from("cabang").update({ aktif: !row.aktif }).eq("id", row.id);
		loadAll();
	};

	const hapus = async (id: string) => {
		if (!confirm("Hapus cabang ini?")) return;
		setListError("");
		const { error } = await supabase.from("cabang").delete().eq("id", id);
		if (error) {
			setListError(
				error.code === "23503"
					? "Cabang ini masih dipakai oleh pengiriman/armada/manifest — nonaktifkan saja, jangan dihapus."
					: "Gagal menghapus: " + error.message,
			);
			return;
		}
		loadAll();
	};

	const filtered = list.filter(
		(r) =>
			r.nama.toLowerCase().includes(search.toLowerCase()) ||
			(r.kota || "").toLowerCase().includes(search.toLowerCase()),
	);

	return (
		<div>
			<div className="flex items-center justify-between mb-6">
				<div>
					<h1 className="text-2xl font-bold text-gray-900">Cabang</h1>
					<p className="text-gray-500 mt-1">
						{list.length} cabang — dipakai sebagai label/filter di pengiriman,
						armada, dan manifest
					</p>
				</div>
				<button
					onClick={() => openForm()}
					className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition">
					<Plus size={16} /> Cabang Baru
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
					placeholder="Cari nama / kota..."
					className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
				/>
			</div>

			<div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
				{loading ? (
					<div className="text-center py-12 text-gray-400">Memuat...</div>
				) : filtered.length === 0 ? (
					<div className="text-center py-12 text-gray-400">Belum ada cabang</div>
				) : (
					<table className="w-full text-sm">
						<thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
							<tr>
								<th className="text-left px-5 py-3">Nama</th>
								<th className="text-left px-5 py-3">Kota</th>
								<th className="text-left px-5 py-3">Telepon</th>
								<th className="text-center px-5 py-3">Status</th>
								<th className="text-right px-5 py-3">Aksi</th>
							</tr>
						</thead>
						<tbody className="divide-y divide-gray-50">
							{filtered.map((r) => (
								<tr key={r.id} className={!r.aktif ? "opacity-50" : ""}>
									<td className="px-5 py-3">
										<div className="flex items-center gap-1.5 font-medium text-gray-900">
											<Building2 size={13} className="text-gray-400" />
											{r.nama}
										</div>
									</td>
									<td className="px-5 py-3 text-gray-600">{r.kota || "-"}</td>
									<td className="px-5 py-3 text-gray-600">{r.telepon || "-"}</td>
									<td className="px-5 py-3 text-center">
										<button
											onClick={() => toggleAktif(r)}
											className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-semibold transition ${
												r.aktif
													? "bg-green-100 text-green-700 hover:bg-green-200"
													: "bg-gray-100 text-gray-500 hover:bg-gray-200"
											}`}>
											<Power size={10} /> {r.aktif ? "Aktif" : "Nonaktif"}
										</button>
									</td>
									<td className="px-5 py-3">
										<div className="flex items-center justify-end gap-1">
											<button
												onClick={() => openForm(r)}
												className="p-1.5 hover:bg-indigo-50 rounded-lg text-indigo-600 transition">
												<Edit3 size={14} />
											</button>
											<button
												onClick={() => hapus(r.id)}
												className="p-1.5 hover:bg-red-50 rounded-lg text-red-500 transition">
												<Trash2 size={14} />
											</button>
										</div>
									</td>
								</tr>
							))}
						</tbody>
					</table>
				)}
			</div>

			{modal === "form" && (
				<div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
					<div className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
						<div className="flex items-center justify-between p-6 border-b border-gray-100">
							<h2 className="text-lg font-semibold">
								{editingId ? "Edit Cabang" : "Cabang Baru"}
							</h2>
							<button
								onClick={() => setModal(null)}
								className="p-2 hover:bg-gray-100 rounded-lg">
								<X size={18} />
							</button>
						</div>
						<div className="p-6 space-y-4">
							<div>
								<label className="block text-sm font-medium text-gray-700 mb-1">
									Nama Cabang
								</label>
								<input
									value={form.nama}
									onChange={(e) => setForm({ ...form, nama: e.target.value })}
									placeholder="Hub Jakarta"
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
							<div>
								<label className="block text-sm font-medium text-gray-700 mb-1">
									Telepon
								</label>
								<input
									value={form.telepon}
									onChange={(e) => setForm({ ...form, telepon: e.target.value })}
									placeholder="Opsional"
									className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
								/>
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
						<div className="flex gap-3 p-6 pt-0">
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
		</div>
	);
}
