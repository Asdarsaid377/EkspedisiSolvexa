"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { formatRupiah, formatDate } from "@/lib/utils";
import {
	CheckCircle2,
	AlertTriangle,
	Clock,
	X,
	ExternalLink,
	StickyNote,
} from "lucide-react";

type StatusPencocokan = "belum_dicocokkan" | "cocok" | "selisih";

interface Nota {
	id: string;
	nomor_faktur: string;
	tanggal: string;
	total_harga_jual: number;
	status_bayar: string;
	status_pencocokan: StatusPencocokan;
	catatan_internal: string | null;
	catatan_pencocokan: string | null;
	dicocokkan_at: string | null;
	reseller: { nama: string } | null;
}

type ModalMode = "cocok" | "selisih" | null;

export default function PencocokanPage() {
	const { isSuperAdmin, loading: authLoading, profile } = useAuth();
	const router = useRouter();
	const supabase = createClient();

	const [loading, setLoading] = useState(true);
	const [notaBelum, setNotaBelum] = useState<Nota[]>([]);
	const [ringkasan, setRingkasan] = useState({ belum: 0, cocok: 0, selisih: 0 });

	// Modal state
	const [modalMode, setModalMode] = useState<ModalMode>(null);
	const [modalNota, setModalNota] = useState<Nota | null>(null);
	const [cekSuratJalan, setCekSuratJalan] = useState(false);
	const [cekRekening, setCekRekening] = useState(false);
	const [catatanInput, setCatatanInput] = useState("");
	const [saving, setSaving] = useState(false);
	const [formError, setFormError] = useState("");

	useEffect(() => {
		if (authLoading) return;
		if (!isSuperAdmin) { router.replace("/dashboard"); return; }
		load();
	}, [isSuperAdmin, authLoading]);

	if (authLoading || !isSuperAdmin) return null;

	const load = async () => {
		setLoading(true);
		const bulanIni = new Date();
		bulanIni.setDate(1);
		bulanIni.setHours(0, 0, 0, 0);

		const [belumRes, ringkasanRes] = await Promise.all([
			supabase
				.from("penjualan")
				.select("id, nomor_faktur, tanggal, total_harga_jual, status_bayar, status_pencocokan, catatan_internal, catatan_pencocokan, dicocokkan_at, reseller:resellers(nama)")
				.eq("status_pencocokan", "belum_dicocokkan")
				.order("created_at", { ascending: true }),
			supabase
				.from("penjualan")
				.select("status_pencocokan")
				.gte("created_at", bulanIni.toISOString()),
		]);

		setNotaBelum((belumRes.data || []) as unknown as Nota[]);

		const rows = ringkasanRes.data || [];
		setRingkasan({
			belum:   rows.filter(r => r.status_pencocokan === "belum_dicocokkan").length,
			cocok:   rows.filter(r => r.status_pencocokan === "cocok").length,
			selisih: rows.filter(r => r.status_pencocokan === "selisih").length,
		});
		setLoading(false);
	};

	const openModal = (nota: Nota, mode: ModalMode) => {
		setModalNota(nota);
		setModalMode(mode);
		setCekSuratJalan(false);
		setCekRekening(false);
		setCatatanInput("");
		setFormError("");
	};

	const closeModal = () => {
		setModalMode(null);
		setModalNota(null);
	};

	const submit = async () => {
		if (!modalNota || !profile) return;
		if (modalMode === "selisih" && !catatanInput.trim()) {
			setFormError("Catatan wajib diisi untuk status Selisih — jelaskan selisihnya.");
			return;
		}
		setSaving(true);
		setFormError("");

		const { error } = await supabase
			.from("penjualan")
			.update({
				status_pencocokan: modalMode,
				dicocokkan_oleh: profile.id,
				dicocokkan_at: new Date().toISOString(),
				catatan_pencocokan: catatanInput.trim() || null,
			})
			.eq("id", modalNota.id);

		if (error) {
			setFormError("Gagal menyimpan: " + error.message);
			setSaving(false);
			return;
		}

		setSaving(false);
		closeModal();
		load();
	};

	const statusBadge = (s: string) => {
		if (s === "lunas") return <span className="text-xs font-medium text-green-700 bg-green-100 px-2 py-0.5 rounded-full">Lunas</span>;
		if (s === "dp")    return <span className="text-xs font-medium text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">DP</span>;
		return <span className="text-xs font-medium text-red-700 bg-red-100 px-2 py-0.5 rounded-full">Belum Bayar</span>;
	};

	return (
		<div>
			{/* Header */}
			<div className="mb-6">
				<h1 className="text-2xl font-bold text-gray-900">Pencocokan Nota</h1>
				<p className="text-gray-500 mt-1 text-sm">
					Cocokkan nota penjualan dengan surat jalan fisik dan mutasi rekening
				</p>
			</div>

			{/* Ringkasan bulan berjalan */}
			<div className="grid grid-cols-3 gap-4 mb-8">
				<div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
					<div className="flex items-center gap-3">
						<div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center">
							<Clock size={18} className="text-gray-500" />
						</div>
						<div>
							<p className="text-2xl font-bold text-gray-900">{ringkasan.belum}</p>
							<p className="text-xs text-gray-500">Belum Dicocokkan</p>
						</div>
					</div>
				</div>
				<div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
					<div className="flex items-center gap-3">
						<div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
							<CheckCircle2 size={18} className="text-green-600" />
						</div>
						<div>
							<p className="text-2xl font-bold text-green-700">{ringkasan.cocok}</p>
							<p className="text-xs text-gray-500">Cocok (Bulan Ini)</p>
						</div>
					</div>
				</div>
				<div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
					<div className="flex items-center gap-3">
						<div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center">
							<AlertTriangle size={18} className="text-red-600" />
						</div>
						<div>
							<p className="text-2xl font-bold text-red-700">{ringkasan.selisih}</p>
							<p className="text-xs text-gray-500">Selisih (Bulan Ini)</p>
						</div>
					</div>
				</div>
			</div>

			{/* Tabel nota belum dicocokkan */}
			<div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
				<div className="px-6 py-4 border-b border-gray-100">
					<h2 className="font-semibold text-gray-900">Nota Belum Dicocokkan</h2>
					<p className="text-xs text-gray-500 mt-0.5">Diurutkan dari yang paling lama dibuat</p>
				</div>

				{loading ? (
					<div className="text-center py-16 text-gray-400">Memuat...</div>
				) : notaBelum.length === 0 ? (
					<div className="text-center py-16">
						<CheckCircle2 size={40} className="text-green-300 mx-auto mb-3" />
						<p className="text-gray-500 font-medium">Semua nota sudah dicocokkan</p>
					</div>
				) : (
					<table className="w-full text-sm">
						<thead className="bg-gray-50 border-b border-gray-100">
							<tr>
								<th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Nota</th>
								<th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Reseller</th>
								<th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Tanggal</th>
								<th className="text-right px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Grand Total</th>
								<th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Status Bayar</th>
								<th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Catatan Internal</th>
								<th className="px-6 py-3"></th>
							</tr>
						</thead>
						<tbody className="divide-y divide-gray-50">
							{notaBelum.map((nota) => (
								<tr key={nota.id} className="hover:bg-gray-50 transition">
									<td className="px-6 py-4">
										<Link
											href={`/dashboard/penjualan/${nota.id}`}
											className="font-mono font-semibold text-indigo-600 hover:text-indigo-800 hover:underline flex items-center gap-1">
											{nota.nomor_faktur}
											<ExternalLink size={11} />
										</Link>
									</td>
									<td className="px-6 py-4 text-gray-700">
										{nota.reseller?.nama || <span className="text-gray-400 italic">Umum</span>}
									</td>
									<td className="px-6 py-4 text-gray-500 text-xs">
										{new Date(nota.tanggal).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}
									</td>
									<td className="px-6 py-4 text-right font-semibold text-gray-900">
										{formatRupiah(nota.total_harga_jual)}
									</td>
									<td className="px-6 py-4">
										{statusBadge(nota.status_bayar)}
									</td>
									<td className="px-6 py-4 max-w-[200px]">
										{nota.catatan_internal ? (
											<p className="text-xs text-gray-600 truncate" title={nota.catatan_internal}>
												<StickyNote size={11} className="inline mr-1 text-amber-500" />
												{nota.catatan_internal}
											</p>
										) : (
											<span className="text-gray-300 text-xs">—</span>
										)}
									</td>
									<td className="px-6 py-4">
										<div className="flex items-center gap-2 justify-end">
											<button
												onClick={() => openModal(nota, "cocok")}
												className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-xs font-medium transition">
												<CheckCircle2 size={13} /> Cocok
											</button>
											<button
												onClick={() => openModal(nota, "selisih")}
												className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white rounded-lg text-xs font-medium transition">
												<AlertTriangle size={13} /> Selisih
											</button>
										</div>
									</td>
								</tr>
							))}
						</tbody>
					</table>
				)}
			</div>

			{/* Modal Cocok */}
			{modalMode === "cocok" && modalNota && (
				<div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
					<div className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
						<div className="flex items-center justify-between p-6 border-b border-gray-100">
							<div className="flex items-center gap-2.5">
								<CheckCircle2 size={20} className="text-green-600" />
								<h2 className="text-base font-semibold text-gray-900">Tandai Cocok</h2>
							</div>
							<button onClick={closeModal} className="p-1.5 hover:bg-gray-100 rounded-lg">
								<X size={16} />
							</button>
						</div>
						<div className="p-6 space-y-4">
							<div className="bg-gray-50 rounded-xl px-4 py-3 text-sm">
								<span className="font-mono font-semibold text-indigo-600">{modalNota.nomor_faktur}</span>
								<span className="text-gray-500 ml-2">— {formatRupiah(modalNota.total_harga_jual)}</span>
							</div>

							<label className="flex items-start gap-3 cursor-pointer">
								<input
									type="checkbox"
									checked={cekSuratJalan}
									onChange={(e) => setCekSuratJalan(e.target.checked)}
									className="mt-0.5 w-4 h-4 accent-green-600 cursor-pointer flex-shrink-0"
								/>
								<span className="text-sm text-gray-700">
									Surat jalan fisik sudah diperiksa dan sesuai dengan nota
								</span>
							</label>
							<label className="flex items-start gap-3 cursor-pointer">
								<input
									type="checkbox"
									checked={cekRekening}
									onChange={(e) => setCekRekening(e.target.checked)}
									className="mt-0.5 w-4 h-4 accent-green-600 cursor-pointer flex-shrink-0"
								/>
								<span className="text-sm text-gray-700">
									Sudah dicocokkan dengan mutasi rekening pribadi
								</span>
							</label>

							<div>
								<label className="block text-xs font-medium text-gray-600 mb-1">
									Catatan (opsional)
								</label>
								<textarea
									value={catatanInput}
									onChange={(e) => setCatatanInput(e.target.value)}
									rows={2}
									placeholder="Misal: transfer masuk 28 Jun pukul 10:15"
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
							<button onClick={closeModal} className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium hover:bg-gray-50">
								Batal
							</button>
							<button
								onClick={submit}
								disabled={saving || !cekSuratJalan || !cekRekening}
								className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-green-300 text-white px-4 py-2.5 rounded-xl text-sm font-medium flex items-center justify-center gap-2 transition">
								{saving ? "Menyimpan..." : <><CheckCircle2 size={15} /> Tandai Cocok</>}
							</button>
						</div>
					</div>
				</div>
			)}

			{/* Modal Selisih */}
			{modalMode === "selisih" && modalNota && (
				<div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
					<div className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
						<div className="flex items-center justify-between p-6 border-b border-gray-100">
							<div className="flex items-center gap-2.5">
								<AlertTriangle size={20} className="text-red-500" />
								<h2 className="text-base font-semibold text-gray-900">Tandai Selisih</h2>
							</div>
							<button onClick={closeModal} className="p-1.5 hover:bg-gray-100 rounded-lg">
								<X size={16} />
							</button>
						</div>
						<div className="p-6 space-y-4">
							<div className="bg-gray-50 rounded-xl px-4 py-3 text-sm">
								<span className="font-mono font-semibold text-indigo-600">{modalNota.nomor_faktur}</span>
								<span className="text-gray-500 ml-2">— {formatRupiah(modalNota.total_harga_jual)}</span>
							</div>
							<div>
								<label className="block text-xs font-medium text-gray-600 mb-1">
									Keterangan Selisih <span className="text-red-500">*</span>
								</label>
								<textarea
									value={catatanInput}
									onChange={(e) => { setCatatanInput(e.target.value); setFormError(""); }}
									rows={3}
									placeholder="Jelaskan selisihnya, misal: surat jalan tidak ketemu, uang masuk rekening tidak sesuai nominal, dll."
									className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-400 resize-none"
								/>
							</div>
							{formError && (
								<div className="bg-red-50 border border-red-200 text-red-600 px-4 py-2.5 rounded-xl text-sm">
									{formError}
								</div>
							)}
						</div>
						<div className="flex gap-3 p-6 pt-0">
							<button onClick={closeModal} className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium hover:bg-gray-50">
								Batal
							</button>
							<button
								onClick={submit}
								disabled={saving || !catatanInput.trim()}
								className="flex-1 bg-red-500 hover:bg-red-600 disabled:bg-red-300 text-white px-4 py-2.5 rounded-xl text-sm font-medium flex items-center justify-center gap-2 transition">
								{saving ? "Menyimpan..." : <><AlertTriangle size={15} /> Tandai Selisih</>}
							</button>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}
