"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { formatRupiah } from "@/lib/utils";
import { Search } from "lucide-react";

type AgeStatus = "segar" | "normal" | "perhatian" | "kritis";

interface StockAgingItem {
	id: string;
	nama: string;
	kategori?: string;
	satuan: string;
	stok: number;
	harga_modal: number;
	lastMove: string;
	hari: number;
	status: AgeStatus;
}

const AGE_CONFIG: Record<
	AgeStatus,
	{ label: string; badge: string; range: string; card: string }
> = {
	segar: {
		label: "Segar",
		badge: "bg-green-100 text-green-700",
		range: "0–30 hari",
		card: "bg-green-50 border-green-200",
	},
	normal: {
		label: "Normal",
		badge: "bg-blue-100 text-blue-700",
		range: "31–60 hari",
		card: "bg-blue-50 border-blue-200",
	},
	perhatian: {
		label: "Perhatian",
		badge: "bg-yellow-100 text-yellow-700",
		range: "61–90 hari",
		card: "bg-yellow-50 border-yellow-200",
	},
	kritis: {
		label: "Kritis",
		badge: "bg-red-100 text-red-700",
		range: "> 90 hari",
		card: "bg-red-50 border-red-200",
	},
};

function getStatus(hari: number): AgeStatus {
	if (hari <= 30) return "segar";
	if (hari <= 60) return "normal";
	if (hari <= 90) return "perhatian";
	return "kritis";
}

export default function StockAgingPage() {
	const supabase = createClient();
	const { isSuperAdmin } = useAuth();
	const [items, setItems] = useState<StockAgingItem[]>([]);
	const [loading, setLoading] = useState(true);
	const [search, setSearch] = useState("");
	const [filterStatus, setFilterStatus] = useState<AgeStatus | "semua">(
		"semua",
	);
	const [filterKategori, setFilterKategori] = useState("");

	useEffect(() => {
		load();
	}, []);

	const load = async () => {
		const { data: produkList } = await supabase
			.from("produk")
			.select("id, nama, kategori, satuan, stok, harga_modal, created_at")
			.eq("aktif", true)
			.gt("stok", 0)
			.order("nama");

		if (!produkList) {
			setLoading(false);
			return;
		}

		const { data: mutasiList } = await supabase
			.from("mutasi_stok")
			.select("produk_id, created_at")
			.order("created_at", { ascending: false });

		// Ambil tanggal pergerakan terakhir per produk
		const lastMoveMap: Record<string, string> = {};
		for (const m of mutasiList || []) {
			if (!lastMoveMap[m.produk_id]) lastMoveMap[m.produk_id] = m.created_at;
		}

		const now = new Date();
		const result: StockAgingItem[] = produkList.map((p) => {
			const lastMove = lastMoveMap[p.id] || p.created_at;
			const hari = Math.floor(
				(now.getTime() - new Date(lastMove).getTime()) / (1000 * 60 * 60 * 24),
			);
			return {
				id: p.id,
				nama: p.nama,
				kategori: p.kategori,
				satuan: p.satuan,
				stok: p.stok,
				harga_modal: p.harga_modal,
				lastMove,
				hari,
				status: getStatus(hari),
			};
		});

		result.sort((a, b) => b.hari - a.hari);
		setItems(result);
		setLoading(false);
	};

	const kategoriList = Array.from(
		new Set(items.map((i) => i.kategori).filter(Boolean)),
	) as string[];

	const filtered = items.filter((i) => {
		if (filterStatus !== "semua" && i.status !== filterStatus) return false;
		if (filterKategori && i.kategori !== filterKategori) return false;
		if (search && !i.nama.toLowerCase().includes(search.toLowerCase()))
			return false;
		return true;
	});

	const countByStatus = (s: AgeStatus) =>
		items.filter((i) => i.status === s).length;

	const totalNilaiModal = filtered.reduce(
		(sum, i) => sum + i.stok * i.harga_modal,
		0,
	);

	const colSpan = isSuperAdmin ? 7 : 6;

	return (
		<div>
			<div className="mb-8">
				<h1 className="text-2xl font-bold text-gray-900">Usia Barang</h1>
				<p className="text-gray-500 mt-1">
					Analisis usia stok berdasarkan pergerakan terakhir
				</p>
			</div>

			{/* Summary cards */}
			<div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
				{(["segar", "normal", "perhatian", "kritis"] as AgeStatus[]).map(
					(s) => {
						const cfg = AGE_CONFIG[s];
						const count = countByStatus(s);
						const active = filterStatus === s;
						return (
							<button
								key={s}
								onClick={() => setFilterStatus(active ? "semua" : s)}
								className={`p-4 rounded-2xl border-2 text-left transition ${
									active
										? "border-indigo-500 shadow-md bg-white"
										: `border ${cfg.card} hover:shadow-md`
								}`}>
								<span
									className={`text-xs font-semibold px-2 py-0.5 rounded-full ${cfg.badge}`}>
									{cfg.label}
								</span>
								<p className="text-3xl font-bold text-gray-900 mt-2">{count}</p>
								<p className="text-xs text-gray-500 mt-0.5">{cfg.range}</p>
							</button>
						);
					},
				)}
			</div>

			{/* Filters */}
			<div className="flex flex-wrap gap-3 mb-6">
				<div className="relative flex-1 min-w-48">
					<Search
						size={16}
						className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
					/>
					<input
						value={search}
						onChange={(e) => setSearch(e.target.value)}
						placeholder="Cari nama produk..."
						className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
					/>
				</div>
				{kategoriList.length > 0 && (
					<select
						value={filterKategori}
						onChange={(e) => setFilterKategori(e.target.value)}
						className="px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white">
						<option value="">Semua Kategori</option>
						{kategoriList.map((k) => (
							<option key={k} value={k}>
								{k}
							</option>
						))}
					</select>
				)}
			</div>

			{/* Table */}
			<div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
				<div className="px-6 py-3 bg-gray-50 border-b border-gray-100 flex justify-between items-center text-sm">
					<span className="text-gray-500">{filtered.length} produk</span>
					{isSuperAdmin && (
						<span className="text-gray-700">
							Total nilai modal:{" "}
							<span className="text-indigo-600 font-bold">
								{formatRupiah(totalNilaiModal)}
							</span>
						</span>
					)}
				</div>
				<div className="overflow-x-auto">
					<table className="w-full text-sm">
						<thead>
							<tr className="text-left border-b border-gray-100 bg-gray-50/50">
								<th className="px-6 py-4 font-medium text-gray-500">Produk</th>
								<th className="px-6 py-4 font-medium text-gray-500">
									Kategori
								</th>
								<th className="px-6 py-4 font-medium text-gray-500 text-right">
									Stok
								</th>
								{isSuperAdmin && (
									<th className="px-6 py-4 font-medium text-gray-500 text-right">
										Nilai Modal
									</th>
								)}
								<th className="px-6 py-4 font-medium text-gray-500">
									Pergerakan Terakhir
								</th>
								<th className="px-6 py-4 font-medium text-gray-500 text-center">
									Usia Stok
								</th>
								<th className="px-6 py-4 font-medium text-gray-500 text-center">
									Status
								</th>
							</tr>
						</thead>
						<tbody>
							{loading ? (
								<tr>
									<td
										colSpan={colSpan}
										className="text-center py-12 text-gray-400">
										Memuat...
									</td>
								</tr>
							) : filtered.length === 0 ? (
								<tr>
									<td
										colSpan={colSpan}
										className="text-center py-12 text-gray-400">
										Tidak ada data
									</td>
								</tr>
							) : (
								filtered.map((item) => {
									const cfg = AGE_CONFIG[item.status];
									return (
										<tr
											key={item.id}
											className="border-b border-gray-50 hover:bg-gray-50 transition">
											<td className="px-6 py-4 font-medium text-gray-900">
												{item.nama}
											</td>
											<td className="px-6 py-4 text-gray-500">
												{item.kategori || (
													<span className="text-gray-300">—</span>
												)}
											</td>
											<td className="px-6 py-4 text-right font-medium text-gray-900">
												{item.stok}{" "}
												<span className="text-gray-400 font-normal text-xs">
													{item.satuan}
												</span>
											</td>
											{isSuperAdmin && (
												<td className="px-6 py-4 text-right text-gray-700">
													{formatRupiah(item.stok * item.harga_modal)}
												</td>
											)}
											<td className="px-6 py-4 text-gray-500">
												{new Date(item.lastMove).toLocaleDateString("id-ID", {
													day: "numeric",
													month: "short",
													year: "numeric",
												})}
											</td>
											<td className="px-6 py-4 text-center font-bold text-gray-900">
												{item.hari}{" "}
												<span className="font-normal text-gray-400 text-xs">
													hari
												</span>
											</td>
											<td className="px-6 py-4 text-center">
												<span
													className={`text-xs font-semibold px-2.5 py-1 rounded-full ${cfg.badge}`}>
													{cfg.label}
												</span>
											</td>
										</tr>
									);
								})
							)}
						</tbody>
					</table>
				</div>
			</div>
		</div>
	);
}
