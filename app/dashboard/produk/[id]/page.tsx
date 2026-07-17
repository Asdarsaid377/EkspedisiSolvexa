"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Produk } from "@/lib/types";
import { formatRupiah, formatDate } from "@/lib/utils";
import {
	ArrowLeft,
	ChevronLeft,
	ChevronRight,
	X,
	ImageIcon,
	Package,
	TrendingUp,
	TrendingDown,
	Layers,
	Clock,
} from "lucide-react";

const GRADIENTS = [
	"from-indigo-100 to-indigo-200 text-indigo-400",
	"from-violet-100 to-violet-200 text-violet-400",
	"from-sky-100 to-sky-200 text-sky-400",
	"from-emerald-100 to-emerald-200 text-emerald-400",
	"from-amber-100 to-amber-200 text-amber-400",
	"from-rose-100 to-rose-200 text-rose-400",
	"from-teal-100 to-teal-200 text-teal-400",
	"from-orange-100 to-orange-200 text-orange-400",
];

function pickGradient(name: string) {
	let h = 0;
	for (let i = 0; i < name.length; i++) {
		h = (h << 5) - h + name.charCodeAt(i);
		h |= 0;
	}
	return GRADIENTS[Math.abs(h) % GRADIENTS.length];
}

type AgeStatus = "segar" | "normal" | "perhatian" | "kritis";

const AGE_CONFIG: Record<AgeStatus, { label: string; badge: string; card: string }> = {
	segar: { label: "Segar", badge: "bg-green-100 text-green-700", card: "bg-green-50 border-green-200" },
	normal: { label: "Normal", badge: "bg-blue-100 text-blue-700", card: "bg-blue-50 border-blue-200" },
	perhatian: { label: "Perhatian", badge: "bg-yellow-100 text-yellow-700", card: "bg-yellow-50 border-yellow-200" },
	kritis: { label: "Kritis", badge: "bg-red-100 text-red-700", card: "bg-red-50 border-red-200" },
};

function getAgeStatus(hari: number): AgeStatus {
	if (hari <= 30) return "segar";
	if (hari <= 60) return "normal";
	if (hari <= 90) return "perhatian";
	return "kritis";
}

export default function DetailProdukPage() {
	const { id } = useParams<{ id: string }>();
	const router = useRouter();
	const supabase = createClient();
	const { isSuperAdmin } = useAuth();

	const [produk, setProduk] = useState<Produk | null>(null);
	const [fotos, setFotos] = useState<string[]>([]);
	const [activeIdx, setActiveIdx] = useState(0);
	const [lightbox, setLightbox] = useState(false);
	const [mutasiList, setMutasiList] = useState<any[]>([]);
	const [bomItems, setBomItems] = useState<any[]>([]);
	const [aging, setAging] = useState<{ hari: number; lastMove: string; status: AgeStatus } | null>(null);
	const [loading, setLoading] = useState(true);
	const [notFound, setNotFound] = useState(false);

	useEffect(() => {
		if (!id) return;
		load();
	}, [id]);

	const load = async () => {
		setLoading(true);
		const [{ data: p }, { data: fotoRows }, { data: mutasi }, { data: bom }, { data: lastMutasi }] =
			await Promise.all([
				supabase.from("produk").select("*").eq("id", id).single(),
				supabase.from("produk_foto").select("url").eq("produk_id", id).order("urutan"),
				supabase
					.from("mutasi_stok")
					.select("*, profiles(name)")
					.eq("produk_id", id)
					.order("created_at", { ascending: false })
					.limit(20),
				supabase
					.from("bom")
					.select("*, bahan_baku:bahan_baku(nama, satuan, harga_beli_terakhir)")
					.eq("produk_id", id)
					.order("created_at"),
				supabase
					.from("mutasi_stok")
					.select("created_at")
					.eq("produk_id", id)
					.order("created_at", { ascending: false })
					.limit(1),
			]);

		if (!p) {
			setNotFound(true);
			setLoading(false);
			return;
		}

		setProduk(p);
		setFotos((fotoRows || []).map((f: any) => f.url));
		setMutasiList(mutasi || []);
		setBomItems(bom || []);

		const lastMoveDate = lastMutasi?.[0]?.created_at || p.created_at;
		const hari = Math.floor((Date.now() - new Date(lastMoveDate).getTime()) / (1000 * 60 * 60 * 24));
		setAging({ hari, lastMove: lastMoveDate, status: getAgeStatus(hari) });
		setLoading(false);
	};

	if (loading) {
		return (
			<div className="flex items-center justify-center min-h-[60vh]">
				<p className="text-gray-400">Memuat detail produk...</p>
			</div>
		);
	}

	if (notFound || !produk) {
		return (
			<div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
				<p className="text-gray-500 font-medium">Produk tidak ditemukan</p>
				<button
					onClick={() => router.push("/dashboard/produk")}
					className="text-sm text-indigo-600 hover:underline">
					← Kembali ke Produk &amp; Stok
				</button>
			</div>
		);
	}

	const mainFoto = fotos[activeIdx];
	const gradClass = pickGradient(produk.nama);
	const textClass = gradClass.split(" ").find((c) => c.startsWith("text-")) || "text-gray-400";
	const stokMenipis = produk.stok <= produk.stok_minimum;
	const hargaRekomendasi = Math.ceil(produk.harga_katalog * 1.25);
	const bomTotal = bomItems.reduce(
		(s, b) => s + (b.jumlah_standar || 0) * (b.bahan_baku?.harga_beli_terakhir || 0),
		0,
	);

	return (
		<div className="max-w-6xl mx-auto">
			{/* Header */}
			<div className="mb-6">
				<div className="flex items-start gap-3 mb-1">
					<button
						onClick={() => router.back()}
						className="mt-0.5 p-2 hover:bg-gray-100 rounded-xl transition text-gray-500 flex-shrink-0">
						<ArrowLeft size={18} />
					</button>
					<div className="min-w-0">
						<h1 className="text-xl font-bold text-gray-900">{produk.nama}</h1>
						<div className="flex items-center gap-2 flex-wrap mt-1.5">
							<span className="text-xs px-2.5 py-1 rounded-full font-semibold bg-gray-100 text-gray-600">
								{produk.kategori || "Tanpa Kategori"}
							</span>
							<span className="text-xs px-2.5 py-1 rounded-full font-semibold bg-gray-100 text-gray-600">
								{produk.satuan}
							</span>
							{!produk.aktif && (
								<span className="text-xs px-2.5 py-1 rounded-full font-semibold bg-red-100 text-red-600">
									Nonaktif
								</span>
							)}
							{stokMenipis && (
								<span className="text-xs px-2.5 py-1 rounded-full font-semibold bg-yellow-100 text-yellow-700">
									Stok Menipis
								</span>
							)}
						</div>
					</div>
				</div>
			</div>

			{/* Gallery + Info */}
			<div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-6">
				{/* Gallery */}
				<div>
					<div
						className={`relative w-full aspect-square rounded-2xl overflow-hidden bg-gradient-to-br ${gradClass} ${fotos.length > 0 ? "cursor-pointer" : ""}`}
						onClick={() => fotos.length > 0 && setLightbox(true)}>
						{mainFoto ? (
							<img
								src={mainFoto}
								alt={produk.nama}
								className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
							/>
						) : (
							<div className="w-full h-full flex items-center justify-center">
								<ImageIcon size={72} className={`${textClass} opacity-40`} />
							</div>
						)}
						{fotos.length > 1 && (
							<>
								<button
									onClick={(e) => {
										e.stopPropagation();
										setActiveIdx((i) => (i - 1 + fotos.length) % fotos.length);
									}}
									className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 bg-white/80 backdrop-blur-sm rounded-full flex items-center justify-center shadow hover:bg-white transition">
									<ChevronLeft size={18} />
								</button>
								<button
									onClick={(e) => {
										e.stopPropagation();
										setActiveIdx((i) => (i + 1) % fotos.length);
									}}
									className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 bg-white/80 backdrop-blur-sm rounded-full flex items-center justify-center shadow hover:bg-white transition">
									<ChevronRight size={18} />
								</button>
								<div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
									{fotos.map((_, i) => (
										<button
											key={i}
											onClick={(e) => {
												e.stopPropagation();
												setActiveIdx(i);
											}}
											className={`w-2 h-2 rounded-full transition ${i === activeIdx ? "bg-white" : "bg-white/50"}`}
										/>
									))}
								</div>
							</>
						)}
						{fotos.length > 0 && (
							<span className="absolute top-3 right-3 bg-black/40 backdrop-blur-sm text-white text-[10px] px-2 py-0.5 rounded-full">
								{activeIdx + 1}/{fotos.length}
							</span>
						)}
						{fotos.length > 0 && (
							<span className="absolute bottom-3 right-3 bg-black/40 backdrop-blur-sm text-white text-[10px] px-2 py-0.5 rounded-full">
								Klik untuk perbesar
							</span>
						)}
					</div>
					{fotos.length > 1 && (
						<div className="flex gap-2 mt-3 overflow-x-auto pb-1">
							{fotos.map((url, i) => (
								<button
									key={i}
									onClick={() => setActiveIdx(i)}
									className={`flex-shrink-0 w-16 h-16 rounded-xl overflow-hidden border-2 transition ${
										i === activeIdx ? "border-indigo-500" : "border-transparent opacity-70 hover:opacity-100"
									}`}>
									<img src={url} alt="" className="w-full h-full object-cover" />
								</button>
							))}
						</div>
					)}
				</div>

				{/* Info */}
				<div className="space-y-4">
					<div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
						<div className="grid grid-cols-2 gap-4">
							<div>
								<p className="text-xs text-gray-400 mb-1">Harga Katalog</p>
								<p className="text-lg font-bold text-gray-900">{formatRupiah(produk.harga_katalog)}</p>
							</div>
							<div>
								<p className="text-xs text-gray-400 mb-1">Rekomendasi Harga Jual (+25%)</p>
								<p className="text-lg font-bold text-orange-600">{formatRupiah(hargaRekomendasi)}</p>
							</div>
							{isSuperAdmin && (
								<div>
									<p className="text-xs text-gray-400 mb-1">Harga Modal</p>
									<p className="text-sm font-semibold text-gray-700">{formatRupiah(produk.harga_modal)}</p>
								</div>
							)}
							{isSuperAdmin && (
								<div>
									<p className="text-xs text-gray-400 mb-1">Keuntungan / Unit</p>
									<p className="text-sm font-semibold text-green-600">
										{formatRupiah(produk.harga_katalog - produk.harga_modal)}
									</p>
								</div>
							)}
						</div>

						<div className="border-t border-gray-100 pt-4 grid grid-cols-2 gap-4">
							<div>
								<p className="text-xs text-gray-400 mb-1">Stok Saat Ini</p>
								<p className={`text-lg font-bold ${stokMenipis ? "text-red-600" : "text-gray-900"}`}>
									{produk.stok} <span className="text-sm font-normal text-gray-400">{produk.satuan}</span>
								</p>
							</div>
							<div>
								<p className="text-xs text-gray-400 mb-1">Stok Minimum</p>
								<p className="text-sm font-semibold text-gray-700">
									{produk.stok_minimum} {produk.satuan}
								</p>
							</div>
						</div>

						{produk.deskripsi && (
							<div className="border-t border-gray-100 pt-4">
								<p className="text-xs text-gray-400 mb-1.5">Deskripsi</p>
								<p className="text-sm text-gray-600 leading-relaxed">{produk.deskripsi}</p>
							</div>
						)}
					</div>

					{/* Usia Stok */}
					{aging && (
						<div className={`rounded-2xl border p-5 ${AGE_CONFIG[aging.status].card}`}>
							<div className="flex items-center justify-between mb-1.5">
								<p className="text-sm font-semibold text-gray-700 flex items-center gap-2">
									<Clock size={15} /> Usia Stok
								</p>
								<span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${AGE_CONFIG[aging.status].badge}`}>
									{AGE_CONFIG[aging.status].label}
								</span>
							</div>
							<p className="text-sm text-gray-600">
								{aging.hari} hari sejak pergerakan stok terakhir ({formatDate(aging.lastMove)})
							</p>
						</div>
					)}
				</div>
			</div>

			{/* Riwayat Mutasi Stok */}
			<div className="bg-white rounded-2xl border border-gray-100 shadow-sm mb-6">
				<div className="p-5 border-b border-gray-100">
					<h2 className="text-sm font-semibold text-gray-900">Riwayat Mutasi Stok</h2>
				</div>
				<div className="p-5">
					{mutasiList.length === 0 ? (
						<p className="text-center text-gray-400 py-6 text-sm">Belum ada mutasi stok</p>
					) : (
						mutasiList.map((m) => (
							<div key={m.id} className="flex items-center gap-4 py-3 border-b border-gray-50 last:border-0">
								<div
									className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
										m.tipe === "masuk" ? "bg-green-100" : m.tipe === "keluar" ? "bg-red-100" : "bg-yellow-100"
									}`}>
									{m.tipe === "masuk" ? (
										<TrendingUp size={14} className="text-green-600" />
									) : m.tipe === "keluar" ? (
										<TrendingDown size={14} className="text-red-600" />
									) : (
										<Package size={14} className="text-yellow-600" />
									)}
								</div>
								<div className="flex-1">
									<p className="text-sm font-medium capitalize text-gray-900">
										{m.tipe} {m.jumlah} unit
									</p>
									<p className="text-xs text-gray-500">
										{m.keterangan || "-"} · {formatDate(m.created_at)}
										{m.profiles?.name ? ` · ${m.profiles.name}` : ""}
									</p>
								</div>
								<div className="text-right text-sm">
									<p className="text-gray-500">
										{m.stok_sebelum} → <span className="font-semibold text-gray-900">{m.stok_sesudah}</span>
									</p>
								</div>
							</div>
						))
					)}
				</div>
			</div>

			{/* Bahan Baku (BOM) */}
			{bomItems.length > 0 && (
				<div className="bg-white rounded-2xl border border-gray-100 shadow-sm mb-6">
					<div className="p-5 border-b border-gray-100 flex items-center justify-between">
						<h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
							<Layers size={15} className="text-gray-400" /> Bahan Baku (BOM)
						</h2>
						{isSuperAdmin && (
							<span className="text-xs text-gray-400">Estimasi biaya/unit: {formatRupiah(bomTotal)}</span>
						)}
					</div>
					<div className="overflow-x-auto">
						<table className="w-full text-sm">
							<thead className="bg-gray-50 border-b border-gray-100">
								<tr>
									<th className="text-left px-5 py-2.5 text-xs font-semibold text-gray-500 uppercase">Bahan</th>
									<th className="text-right px-5 py-2.5 text-xs font-semibold text-gray-500 uppercase">
										Jumlah Standar
									</th>
									{isSuperAdmin && (
										<th className="text-right px-5 py-2.5 text-xs font-semibold text-gray-500 uppercase">
											Subtotal
										</th>
									)}
								</tr>
							</thead>
							<tbody className="divide-y divide-gray-50">
								{bomItems.map((b) => (
									<tr key={b.id}>
										<td className="px-5 py-3 text-gray-900">{b.bahan_baku?.nama || "-"}</td>
										<td className="px-5 py-3 text-right text-gray-600">
											{b.jumlah_standar} {b.bahan_baku?.satuan}
										</td>
										{isSuperAdmin && (
											<td className="px-5 py-3 text-right text-gray-600">
												{formatRupiah((b.jumlah_standar || 0) * (b.bahan_baku?.harga_beli_terakhir || 0))}
											</td>
										)}
									</tr>
								))}
							</tbody>
						</table>
					</div>
				</div>
			)}

			{/* Lightbox */}
			{lightbox && fotos.length > 0 && (
				<div
					className="fixed inset-0 z-50 bg-black/92 flex items-center justify-center p-4"
					onClick={() => setLightbox(false)}>
					<button
						onClick={() => setLightbox(false)}
						className="absolute top-4 right-4 w-10 h-10 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center text-white transition">
						<X size={20} />
					</button>
					{fotos.length > 1 && (
						<>
							<button
								onClick={(e) => {
									e.stopPropagation();
									setActiveIdx((i) => (i - 1 + fotos.length) % fotos.length);
								}}
								className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center text-white transition">
								<ChevronLeft size={20} />
							</button>
							<button
								onClick={(e) => {
									e.stopPropagation();
									setActiveIdx((i) => (i + 1) % fotos.length);
								}}
								className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center text-white transition">
								<ChevronRight size={20} />
							</button>
						</>
					)}
					<img
						src={fotos[activeIdx]}
						alt=""
						onClick={(e) => e.stopPropagation()}
						className="max-h-[85vh] max-w-full object-contain rounded-xl shadow-2xl"
					/>
					{fotos.length > 1 && (
						<div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2">
							{fotos.map((_, i) => (
								<button
									key={i}
									onClick={(e) => {
										e.stopPropagation();
										setActiveIdx(i);
									}}
									className={`w-2 h-2 rounded-full transition ${i === activeIdx ? "bg-white" : "bg-white/40"}`}
								/>
							))}
						</div>
					)}
				</div>
			)}
		</div>
	);
}
