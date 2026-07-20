"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
	Plus,
	Package,
	Zap,
	Truck,
	Clock,
	CheckCircle2,
	XCircle,
	ExternalLink,
} from "lucide-react";
import { formatRupiah, formatDate, formatDateOnly } from "@/lib/utils";
import type { BookingRequest, BookingStatus, JenisLayanan, MilestonePengiriman } from "@/lib/types";

const JENIS_LAYANAN_CFG: Record<JenisLayanan, { label: string; icon: any }> = {
	reguler: { label: "Reguler", icon: Package },
	express: { label: "Express", icon: Zap },
	kargo: { label: "Kargo", icon: Truck },
};

const BOOKING_STATUS_CFG: Record<BookingStatus, { label: string; color: string; icon: any }> = {
	pending: { label: "Menunggu Konfirmasi", color: "bg-amber-100 text-amber-700", icon: Clock },
	dikonfirmasi: {
		label: "Dikonfirmasi",
		color: "bg-green-100 text-green-700",
		icon: CheckCircle2,
	},
	ditolak: { label: "Ditolak", color: "bg-red-100 text-red-700", icon: XCircle },
};

const MILESTONE_LABEL: Record<MilestonePengiriman, string> = {
	diproses: "Diproses",
	dijemput: "Dijemput",
	dikirim: "Dikirim",
	gagal_kirim: "Gagal Kirim",
	retur: "Retur",
	selesai: "Selesai",
};

type PengirimanRingkas = {
	nomor_resi: string;
	milestone: MilestonePengiriman;
	jenis_layanan: JenisLayanan;
	tanggal: string;
	penerima_nama: string;
	penerima_kota?: string;
	isi_barang?: string;
	berat_kg: number;
	total_tagihan: number;
	status_bayar: string;
};

export default function BookingDashboardPage() {
	const [bookingRequests, setBookingRequests] = useState<BookingRequest[]>([]);
	const [pengiriman, setPengiriman] = useState<PengirimanRingkas[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState("");

	useEffect(() => {
		const load = async () => {
			setLoading(true);
			setError("");
			try {
				const res = await fetch("/api/booking/riwayat", { cache: "no-store" });
				const data = await res.json();
				if (!res.ok) {
					setError(data.error || "Gagal memuat riwayat");
					return;
				}
				setBookingRequests(data.bookingRequests ?? []);
				setPengiriman(data.pengiriman ?? []);
			} catch {
				setError("Gagal memuat riwayat");
			} finally {
				setLoading(false);
			}
		};
		load();
	}, []);

	if (loading) {
		return (
			<div className="text-center py-12 text-gray-400 text-sm">Memuat riwayat...</div>
		);
	}

	return (
		<div className="space-y-6">
			<div className="flex items-center justify-between">
				<h1 className="text-lg font-bold text-gray-900">Riwayat Saya</h1>
				<Link
					href="/booking/baru"
					className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold px-3.5 py-2 rounded-xl transition">
					<Plus size={16} /> Booking Baru
				</Link>
			</div>

			{error && (
				<div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl text-sm">
					{error}
				</div>
			)}

			{pengiriman.length > 0 && (
				<section>
					<h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
						Kiriman Aktif
					</h2>
					<div className="space-y-2">
						{pengiriman.map((p) => {
							const cfg = JENIS_LAYANAN_CFG[p.jenis_layanan];
							const Icon = cfg?.icon ?? Package;
							return (
								<Link
									key={p.nomor_resi}
									href={`/resi/${p.nomor_resi}`}
									target="_blank"
									className="block bg-white border border-gray-100 rounded-2xl p-4 hover:border-indigo-200 transition">
									<div className="flex items-start justify-between gap-2">
										<div className="min-w-0">
											<p className="text-sm font-semibold text-gray-900 flex items-center gap-1.5">
												<Icon size={14} className="text-gray-400" />
												{p.nomor_resi}
												<ExternalLink size={12} className="text-gray-300" />
											</p>
											<p className="text-xs text-gray-500 mt-0.5 truncate">
												{p.penerima_nama} · {p.penerima_kota || "-"}
											</p>
										</div>
										<span className="text-xs font-medium bg-blue-50 text-blue-700 px-2 py-1 rounded-lg whitespace-nowrap">
											{MILESTONE_LABEL[p.milestone]}
										</span>
									</div>
									<div className="flex items-center justify-between mt-2 text-xs text-gray-400">
										<span>{formatDateOnly(p.tanggal)}</span>
										<span className="font-medium text-gray-600">
											{formatRupiah(p.total_tagihan)}
										</span>
									</div>
								</Link>
							);
						})}
					</div>
				</section>
			)}

			<section>
				<h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
					Pengajuan Booking
				</h2>
				{bookingRequests.length === 0 ? (
					<div className="text-center py-10 text-gray-400 text-sm bg-white border border-gray-100 rounded-2xl">
						Belum ada pengajuan booking.
						<br />
						Tekan &ldquo;Booking Baru&rdquo; untuk mulai.
					</div>
				) : (
					<div className="space-y-2">
						{bookingRequests.map((b) => {
							const cfg = JENIS_LAYANAN_CFG[b.jenis_layanan];
							const Icon = cfg?.icon ?? Package;
							const statusCfg = BOOKING_STATUS_CFG[b.status];
							const StatusIcon = statusCfg.icon;
							return (
								<div
									key={b.id}
									className="bg-white border border-gray-100 rounded-2xl p-4">
									<div className="flex items-start justify-between gap-2">
										<div className="min-w-0">
											<p className="text-sm font-semibold text-gray-900 flex items-center gap-1.5">
												<Icon size={14} className="text-gray-400" />
												{cfg?.label ?? b.jenis_layanan}
											</p>
											<p className="text-xs text-gray-500 mt-0.5 truncate">
												Ke: {b.penerima_nama}
												{b.penerima_kota ? ` · ${b.penerima_kota}` : ""}
											</p>
										</div>
										<span
											className={`flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-lg whitespace-nowrap ${statusCfg.color}`}>
											<StatusIcon size={12} /> {statusCfg.label}
										</span>
									</div>
									{b.status === "ditolak" && b.catatan_penolakan && (
										<p className="text-xs text-red-600 bg-red-50 rounded-lg px-2 py-1.5 mt-2">
											Alasan: {b.catatan_penolakan}
										</p>
									)}
									<div className="flex items-center justify-between mt-2 text-xs text-gray-400">
										<span>{formatDate(b.created_at)}</span>
										{b.ongkir_estimasi != null && (
											<span className="font-medium text-gray-600">
												Estimasi {formatRupiah(b.ongkir_estimasi)}
											</span>
										)}
									</div>
								</div>
							);
						})}
					</div>
				)}
			</section>
		</div>
	);
}
