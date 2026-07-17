"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { formatDateOnly } from "@/lib/utils";
import Link from "next/link";
import {
	Plus,
	Search,
	X,
	Trash2,
	Eye,
	Truck,
	User,
	MapPin,
	Calendar,
	Package,
} from "lucide-react";

const STATUS_CFG: Record<string, { label: string; color: string }> = {
	draft: { label: "Draft", color: "bg-gray-100 text-gray-600" },
	berangkat: { label: "Berangkat", color: "bg-indigo-100 text-indigo-700" },
	selesai: { label: "Selesai", color: "bg-green-100 text-green-700" },
	batal: { label: "Batal", color: "bg-red-100 text-red-700" },
};

const emptyForm = {
	armada_id: "",
	sopir_id: "",
	rute: "",
	tanggal_berangkat: "",
	catatan: "",
};

export default function ManifestPage() {
	const { isSuperAdmin, role, loading: authLoading } = useAuth();
	const router = useRouter();
	const supabase = createClient();

	const canManage = isSuperAdmin || role === "gudang";

	const [list, setList] = useState<any[]>([]);
	const [armadaList, setArmadaList] = useState<any[]>([]);
	const [sopirList, setSopirList] = useState<any[]>([]);
	const [loading, setLoading] = useState(true);
	const [search, setSearch] = useState("");
	const [filterStatus, setFilterStatus] = useState<string>("semua");
	const [modal, setModal] = useState<"form" | null>(null);
	const [form, setForm] = useState(emptyForm);
	const [saving, setSaving] = useState(false);

	useEffect(() => {
		if (authLoading) return;
		loadAll();
	}, [authLoading]);

	if (authLoading) return null;

	const loadAll = async () => {
		const [{ data }, { data: armada }, { data: sopir }] = await Promise.all([
			supabase
				.from("manifest")
				.select(
					"*, armada:armada(plat_nomor, jenis_kendaraan), sopir:profiles!sopir_id(name), items:manifest_item(id)",
				)
				.order("created_at", { ascending: false }),
			supabase
				.from("armada")
				.select("id, plat_nomor, jenis_kendaraan, sopir_id")
				.eq("aktif", true)
				.order("plat_nomor"),
			supabase
				.from("profiles")
				.select("id, name, role")
				.in("role", ["sopir", "kurir"])
				.order("name"),
		]);
		setList(data || []);
		setArmadaList(armada || []);
		setSopirList(sopir || []);
		setLoading(false);
	};

	const openForm = () => {
		setForm(emptyForm);
		setModal("form");
	};

	const handleArmadaSelect = (armadaId: string) => {
		const a = armadaList.find((x) => x.id === armadaId);
		setForm((f) => ({
			...f,
			armada_id: armadaId,
			sopir_id: a?.sopir_id || f.sopir_id,
		}));
	};

	const saveForm = async () => {
		setSaving(true);
		const { data, error } = await supabase
			.from("manifest")
			.insert({
				armada_id: form.armada_id || null,
				sopir_id: form.sopir_id || null,
				rute: form.rute || null,
				tanggal_berangkat: form.tanggal_berangkat || null,
				catatan: form.catatan || null,
			})
			.select()
			.single();
		setSaving(false);
		if (error || !data) return;
		setModal(null);
		router.push(`/dashboard/manifest/${data.id}`);
	};

	const hapus = async (id: string, status: string) => {
		if (status !== "draft" && status !== "batal") {
			alert("Hanya manifest berstatus Draft/Batal yang bisa dihapus.");
			return;
		}
		if (!confirm("Hapus manifest ini?")) return;
		await supabase.from("manifest").delete().eq("id", id);
		loadAll();
	};

	const filtered = list
		.filter((m) => (filterStatus === "semua" ? true : m.status === filterStatus))
		.filter(
			(m) =>
				m.nomor_manifest.toLowerCase().includes(search.toLowerCase()) ||
				(m.rute || "").toLowerCase().includes(search.toLowerCase()) ||
				(m.armada?.plat_nomor || "").toLowerCase().includes(search.toLowerCase()) ||
				(m.sopir?.name || "").toLowerCase().includes(search.toLowerCase()),
		);

	return (
		<div>
			<div className="flex items-center justify-between mb-6">
				<div>
					<h1 className="text-2xl font-bold text-gray-900">Manifest</h1>
					<p className="text-gray-500 mt-1">{list.length} perjalanan</p>
				</div>
				{canManage && (
					<button
						onClick={openForm}
						className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition">
						<Plus size={16} /> Manifest Baru
					</button>
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
						placeholder="Cari nomor manifest, rute, plat, sopir..."
						className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
					/>
				</div>
				<div className="flex rounded-xl border border-gray-200 overflow-hidden">
					{["semua", "draft", "berangkat", "selesai", "batal"].map((s) => (
						<button
							key={s}
							onClick={() => setFilterStatus(s)}
							className={`px-3.5 py-2.5 text-sm font-medium transition capitalize ${filterStatus === s ? "bg-indigo-600 text-white" : "bg-white text-gray-600 hover:bg-gray-50"}`}>
							{s === "semua" ? "Semua" : STATUS_CFG[s]?.label}
						</button>
					))}
				</div>
			</div>

			<div className="space-y-3">
				{loading ? (
					<div className="text-center py-12 text-gray-400">Memuat...</div>
				) : filtered.length === 0 ? (
					<div className="text-center py-12 text-gray-400">Belum ada manifest</div>
				) : (
					filtered.map((m) => {
						const st = STATUS_CFG[m.status] || STATUS_CFG.draft;
						return (
							<div
								key={m.id}
								className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 transition hover:shadow-md">
								<div className="flex items-start justify-between gap-3">
									<div className="flex-1 min-w-0">
										<div className="flex items-center gap-2 flex-wrap">
											<Link
												href={`/dashboard/manifest/${m.id}`}
												className="font-bold text-gray-900 hover:text-indigo-600 hover:underline font-mono">
												{m.nomor_manifest}
											</Link>
											<span
												className={`text-xs px-2 py-0.5 rounded-full font-semibold ${st.color}`}>
												{st.label}
											</span>
										</div>
										<div className="flex items-center gap-4 mt-2 flex-wrap text-sm text-gray-600">
											{m.armada?.plat_nomor && (
												<span className="flex items-center gap-1.5">
													<Truck size={13} className="text-indigo-500" />
													{m.armada.plat_nomor}
												</span>
											)}
											{m.sopir?.name && (
												<span className="flex items-center gap-1.5">
													<User size={13} className="text-gray-400" />
													{m.sopir.name}
												</span>
											)}
											{m.rute && (
												<span className="flex items-center gap-1.5">
													<MapPin size={13} className="text-rose-500" />
													{m.rute}
												</span>
											)}
											{m.tanggal_berangkat && (
												<span className="flex items-center gap-1.5 text-gray-500">
													<Calendar size={13} /> {formatDateOnly(m.tanggal_berangkat)}
												</span>
											)}
											<span className="flex items-center gap-1.5 text-gray-500">
												<Package size={13} /> {m.items?.length || 0} kiriman
											</span>
										</div>
									</div>
									<div className="flex items-center gap-1 flex-shrink-0">
										<Link
											href={`/dashboard/manifest/${m.id}`}
											className="p-2 hover:bg-indigo-50 rounded-lg text-indigo-600 transition">
											<Eye size={15} />
										</Link>
										{canManage && (
											<button
												onClick={() => hapus(m.id, m.status)}
												className="p-2 hover:bg-red-50 rounded-lg text-red-500 transition">
												<Trash2 size={15} />
											</button>
										)}
									</div>
								</div>
							</div>
						);
					})
				)}
			</div>

			{modal === "form" && (
				<div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
					<div className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
						<div className="flex items-center justify-between p-6 border-b border-gray-100">
							<h2 className="text-lg font-semibold">Manifest Baru</h2>
							<button
								onClick={() => setModal(null)}
								className="p-2 hover:bg-gray-100 rounded-lg">
								<X size={18} />
							</button>
						</div>
						<div className="p-6 space-y-4">
							<div>
								<label className="block text-sm font-medium text-gray-700 mb-1">
									Armada
								</label>
								<select
									value={form.armada_id}
									onChange={(e) => handleArmadaSelect(e.target.value)}
									className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
									<option value="">— Pilih Armada —</option>
									{armadaList.map((a) => (
										<option key={a.id} value={a.id}>
											{a.plat_nomor} {a.jenis_kendaraan ? `(${a.jenis_kendaraan})` : ""}
										</option>
									))}
								</select>
							</div>
							<div>
								<label className="block text-sm font-medium text-gray-700 mb-1">
									Sopir / Kurir
								</label>
								<select
									value={form.sopir_id}
									onChange={(e) => setForm({ ...form, sopir_id: e.target.value })}
									className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
									<option value="">— Pilih Sopir/Kurir —</option>
									{sopirList.map((s) => (
										<option key={s.id} value={s.id}>
											{s.name} ({s.role})
										</option>
									))}
								</select>
							</div>
							<div>
								<label className="block text-sm font-medium text-gray-700 mb-1">
									Rute
								</label>
								<input
									value={form.rute}
									onChange={(e) => setForm({ ...form, rute: e.target.value })}
									placeholder="Makassar - Jakarta"
									className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
								/>
							</div>
							<div>
								<label className="block text-sm font-medium text-gray-700 mb-1">
									Tanggal Berangkat
								</label>
								<input
									type="date"
									value={form.tanggal_berangkat}
									onChange={(e) =>
										setForm({ ...form, tanggal_berangkat: e.target.value })
									}
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
							<p className="text-xs text-gray-400">
								Setelah dibuat (status Draft), kamu bisa menambahkan kiriman ke
								manifest ini dari halaman detail.
							</p>
						</div>
						<div className="flex gap-3 p-6 pt-0">
							<button
								onClick={() => setModal(null)}
								className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium hover:bg-gray-50">
								Batal
							</button>
							<button
								onClick={saveForm}
								disabled={saving}
								className="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white px-4 py-2.5 rounded-xl text-sm font-medium">
								{saving ? "Menyimpan..." : "Buat Manifest"}
							</button>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}
