"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
	Megaphone,
	Plus,
	X,
	Pencil,
	Trash2,
	Eye,
	EyeOff,
} from "lucide-react";

const PENGUMUMAN_ROLES = ["superadmin"];

function fmtTanggal(s: string) {
	return new Date(s).toLocaleDateString("id-ID", {
		day: "numeric",
		month: "short",
		year: "numeric",
		hour: "2-digit",
		minute: "2-digit",
	});
}

export default function PengumumanPage() {
	const { profile, role, loading: authLoading } = useAuth();
	const router = useRouter();
	const supabase = createClient();

	useEffect(() => {
		if (!authLoading && !PENGUMUMAN_ROLES.includes(role ?? "")) router.replace("/dashboard");
	}, [role, authLoading, router]);

	const [list, setList] = useState<any[]>([]);
	const [loading, setLoading] = useState(true);
	const [modal, setModal] = useState<"form" | "edit" | null>(null);
	const [editingId, setEditingId] = useState<string | null>(null);
	const [saving, setSaving] = useState(false);
	const [formError, setFormError] = useState("");

	const [formJudul, setFormJudul] = useState("");
	const [formIsi, setFormIsi] = useState("");
	const [formAktif, setFormAktif] = useState(true);

	const load = useCallback(async () => {
		const { data } = await supabase
			.from("pengumuman")
			.select("*, creator:profiles(name)")
			.order("created_at", { ascending: false });
		setList(data || []);
		setLoading(false);
	}, []);

	useEffect(() => {
		load();
	}, [load]);

	if (authLoading || !PENGUMUMAN_ROLES.includes(role ?? "")) return null;

	const openForm = () => {
		setEditingId(null);
		setFormJudul("");
		setFormIsi("");
		setFormAktif(true);
		setFormError("");
		setModal("form");
	};

	const openEdit = (p: any) => {
		setEditingId(p.id);
		setFormJudul(p.judul);
		setFormIsi(p.isi);
		setFormAktif(p.aktif);
		setFormError("");
		setModal("edit");
	};

	const save = async () => {
		if (!formJudul.trim()) { setFormError("Judul wajib diisi"); return; }
		if (!formIsi.trim()) { setFormError("Isi pengumuman wajib diisi"); return; }
		setSaving(true);

		if (modal === "edit" && editingId) {
			const { error } = await supabase
				.from("pengumuman")
				.update({
					judul: formJudul.trim(),
					isi: formIsi.trim(),
					aktif: formAktif,
					updated_at: new Date().toISOString(),
				})
				.eq("id", editingId);
			if (error) { setFormError("Gagal menyimpan: " + error.message); setSaving(false); return; }
		} else {
			const { error } = await supabase.from("pengumuman").insert({
				judul: formJudul.trim(),
				isi: formIsi.trim(),
				aktif: formAktif,
				created_by: profile?.id,
			});
			if (error) { setFormError("Gagal menyimpan: " + error.message); setSaving(false); return; }
		}

		setSaving(false);
		setModal(null);
		load();
	};

	const toggleAktif = async (p: any) => {
		await supabase.from("pengumuman").update({ aktif: !p.aktif }).eq("id", p.id);
		setList((prev) => prev.map((x) => (x.id === p.id ? { ...x, aktif: !p.aktif } : x)));
	};

	const hapus = async (id: string) => {
		if (!confirm("Hapus pengumuman ini?")) return;
		await supabase.from("pengumuman").delete().eq("id", id);
		setList((prev) => prev.filter((x) => x.id !== id));
	};

	return (
		<div>
			<div className="flex items-center justify-between mb-6">
				<div>
					<h1 className="text-2xl font-bold text-gray-900">Pengumuman Reseller</h1>
					<p className="text-gray-500 mt-1">
						Pengumuman aktif akan tampil ke semua reseller saat membuka portal (<code className="text-xs bg-gray-100 px-1 py-0.5 rounded">/r/[token]</code>)
					</p>
				</div>
				<button
					onClick={openForm}
					className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition">
					<Plus size={16} /> Buat Pengumuman
				</button>
			</div>

			<div className="space-y-3">
				{loading ? (
					<div className="text-center py-12 text-gray-400">Memuat...</div>
				) : list.length === 0 ? (
					<div className="text-center py-16">
						<Megaphone size={40} className="mx-auto text-gray-300 mb-3" />
						<p className="text-gray-500 font-medium">Belum ada pengumuman</p>
						<p className="text-sm text-gray-400 mt-1">Buat pengumuman pertama untuk reseller Anda</p>
					</div>
				) : (
					list.map((p) => (
						<div
							key={p.id}
							className={`bg-white rounded-2xl p-5 shadow-sm border transition ${
								p.aktif ? "border-gray-100" : "border-gray-100 opacity-60"
							}`}>
							<div className="flex items-start justify-between gap-3">
								<div className="flex-1 min-w-0">
									<div className="flex items-center gap-2 flex-wrap">
										<h3 className="font-bold text-gray-900">{p.judul}</h3>
										<span
											className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
												p.aktif ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
											}`}>
											{p.aktif ? "Aktif" : "Nonaktif"}
										</span>
									</div>
									<p className="text-sm text-gray-600 mt-1.5 whitespace-pre-line">{p.isi}</p>
									<p className="text-xs text-gray-400 mt-2">
										{fmtTanggal(p.created_at)}
										{p.creator?.name && <> · dibuat oleh {p.creator.name}</>}
									</p>
								</div>
								<div className="flex items-center gap-1.5 flex-shrink-0">
									<button
										onClick={() => toggleAktif(p)}
										title={p.aktif ? "Nonaktifkan" : "Aktifkan"}
										className="p-2 hover:bg-gray-100 rounded-lg text-gray-500 transition">
										{p.aktif ? <EyeOff size={15} /> : <Eye size={15} />}
									</button>
									<button
										onClick={() => openEdit(p)}
										title="Edit"
										className="p-2 hover:bg-gray-100 rounded-lg text-gray-500 transition">
										<Pencil size={15} />
									</button>
									<button
										onClick={() => hapus(p.id)}
										title="Hapus"
										className="p-2 hover:bg-red-50 rounded-lg text-red-500 transition">
										<Trash2 size={15} />
									</button>
								</div>
							</div>
						</div>
					))
				)}
			</div>

			{(modal === "form" || modal === "edit") && (
				<div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
					<div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl">
						<div className="flex items-center justify-between p-6 border-b border-gray-100">
							<h2 className="text-lg font-semibold">
								{modal === "edit" ? "Edit Pengumuman" : "Buat Pengumuman Baru"}
							</h2>
							<button onClick={() => setModal(null)} className="p-2 hover:bg-gray-100 rounded-lg">
								<X size={18} />
							</button>
						</div>

						<div className="p-6 space-y-4">
							<div>
								<label className="block text-sm font-medium text-gray-700 mb-1">Judul *</label>
								<input
									value={formJudul}
									onChange={(e) => setFormJudul(e.target.value)}
									placeholder="Contoh: Libur Hari Raya"
									className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
								/>
							</div>
							<div>
								<label className="block text-sm font-medium text-gray-700 mb-1">Isi Pengumuman *</label>
								<textarea
									value={formIsi}
									onChange={(e) => setFormIsi(e.target.value)}
									rows={5}
									placeholder="Tulis isi pengumuman untuk semua reseller..."
									className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
								/>
							</div>
							<button
								onClick={() => setFormAktif(!formAktif)}
								className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border-2 transition ${
									formAktif ? "border-green-500 bg-green-50" : "border-gray-200 bg-gray-50"
								}`}>
								<div className="text-left">
									<p className={`text-sm font-semibold ${formAktif ? "text-green-800" : "text-gray-600"}`}>
										Tampilkan ke reseller
									</p>
									<p className="text-xs text-gray-400 mt-0.5">
										Jika aktif, pengumuman ini langsung tampil di portal semua reseller
									</p>
								</div>
								<div className={`w-11 h-6 rounded-full transition-colors flex-shrink-0 ${formAktif ? "bg-green-500" : "bg-gray-300"}`}>
									<div className={`w-5 h-5 bg-white rounded-full shadow-sm mt-0.5 transition-transform ${formAktif ? "translate-x-5" : "translate-x-0.5"}`} />
								</div>
							</button>

							{formError && (
								<div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2.5 rounded-xl text-sm">
									{formError}
								</div>
							)}
						</div>

						<div className="flex gap-3 px-6 pb-6">
							<button
								onClick={() => setModal(null)}
								className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition">
								Batal
							</button>
							<button
								onClick={save}
								disabled={saving}
								className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white rounded-xl text-sm font-semibold transition">
								{saving ? "Menyimpan..." : "Simpan"}
							</button>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}
