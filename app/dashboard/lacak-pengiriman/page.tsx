"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { formatDate } from "@/lib/utils";
import {
	Navigation,
	BatteryLow,
	Battery,
	BatteryFull,
	Radio,
} from "lucide-react";
import type { SopirPosisi } from "@/components/SopirTrackingMap";

// react-leaflet menyentuh `window` saat load — wajib dimatikan SSR-nya
const SopirTrackingMap = dynamic(
	() => import("@/components/SopirTrackingMap"),
	{
		ssr: false,
		loading: () => (
			<div className="w-full h-full rounded-2xl bg-gray-100 animate-pulse" />
		),
	},
);

// const ALLOWED_ROLES = ["superadmin", "cs", "gudang", "kurir"];
const ALLOWED_ROLES = ["superadmin"];
const POLLING_MS = 15_000;
const ONLINE_THRESHOLD_MIN = 5;
const IDLE_THRESHOLD_MIN = 30;

function hitungStatus(recordedAt: string | null): SopirPosisi["statusOnline"] {
	if (!recordedAt) return "offline";
	const menit = (Date.now() - new Date(recordedAt).getTime()) / 60_000;
	if (menit <= ONLINE_THRESHOLD_MIN) return "online";
	if (menit <= IDLE_THRESHOLD_MIN) return "idle";
	return "offline";
}

const STATUS_BADGE: Record<SopirPosisi["statusOnline"], string> = {
	online: "bg-green-100 text-green-700",
	idle: "bg-yellow-100 text-yellow-700",
	offline: "bg-gray-100 text-gray-500",
};

const STATUS_LABEL: Record<SopirPosisi["statusOnline"], string> = {
	online: "Online",
	idle: "Idle",
	offline: "Offline",
};

function IconBaterai({ persen }: { persen: number | null }) {
	if (persen === null) return null;
	const Icon = persen <= 20 ? BatteryLow : persen <= 60 ? Battery : BatteryFull;
	return (
		<Icon
			size={14}
			className={persen <= 20 ? "text-red-500" : "text-gray-400"}
		/>
	);
}

export default function LacakPengirimanPage() {
	const supabase = createClient();
	const router = useRouter();
	const { role, loading: authLoading } = useAuth();
	const [posisi, setPosisi] = useState<SopirPosisi[]>([]);
	const [loading, setLoading] = useState(true);
	const [selected, setSelected] = useState<string | null>(null);
	const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

	useEffect(() => {
		if (authLoading) return;
		if (!ALLOWED_ROLES.includes(role ?? "")) {
			router.replace("/dashboard");
			return;
		}
		load();
		intervalRef.current = setInterval(load, POLLING_MS);
		return () => {
			if (intervalRef.current) clearInterval(intervalRef.current);
		};
	}, [role, authLoading]);

	const load = async () => {
		const { data: devices } = await supabase
			.from("sopir_devices")
			.select("device_id, nama_sopir")
			.eq("aktif", true);

		if (!devices || devices.length === 0) {
			setPosisi([]);
			setLoading(false);
			return;
		}

		const deviceIds = devices.map((d) => d.device_id);
		const { data: tracks } = await supabase
			.from("tracking_sopir")
			.select("device_id, lat, lng, accuracy, battery, recorded_at")
			.in("device_id", deviceIds)
			.order("recorded_at", { ascending: false })
			.limit(1000);

		type TrackRow = {
			device_id: string;
			lat: number;
			lng: number;
			accuracy: number | null;
			battery: number | null;
			recorded_at: string;
		};

		// Aggregasi client-side: baris pertama per device_id = posisi terbaru (sudah ORDER BY DESC)
		const terbaruPerDevice = new Map<string, TrackRow>();
		for (const t of tracks ?? []) {
			if (!terbaruPerDevice.has(t.device_id))
				terbaruPerDevice.set(t.device_id, t);
		}

		const hasil: SopirPosisi[] = devices
			.map((d) => {
				const t = terbaruPerDevice.get(d.device_id);
				if (!t) return null;
				return {
					deviceId: d.device_id,
					namaSopir: d.nama_sopir,
					lat: t.lat,
					lng: t.lng,
					accuracy: t.accuracy,
					battery: t.battery,
					recordedAt: t.recorded_at,
					statusOnline: hitungStatus(t.recorded_at),
				};
			})
			.filter((x): x is SopirPosisi => x !== null);

		setPosisi(hasil);
		setLoading(false);
	};

	if (authLoading || !ALLOWED_ROLES.includes(role ?? "")) return null;

	const totalOnline = posisi.filter((p) => p.statusOnline === "online").length;
	const totalIdle = posisi.filter((p) => p.statusOnline === "idle").length;
	const totalOffline = posisi.filter(
		(p) => p.statusOnline === "offline",
	).length;

	const toggleSelect = (deviceId: string) =>
		setSelected((prev) => (prev === deviceId ? null : deviceId));

	return (
		<div className="space-y-6">
			<div className="flex items-center gap-3">
				<div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center">
					<Navigation size={20} className="text-white" />
				</div>
				<div>
					<h1 className="text-xl font-bold text-gray-900">Lacak Pengiriman</h1>
					<p className="text-sm text-gray-500">
						Live tracking lokasi sopir dari GPS Traccar Client
					</p>
				</div>
			</div>

			<div className="grid grid-cols-3 gap-4">
				<div className="bg-white rounded-2xl border border-gray-100 p-4">
					<p className="text-xs text-gray-500 mb-1">Online</p>
					<p className="text-2xl font-bold text-green-600">{totalOnline}</p>
				</div>
				<div className="bg-white rounded-2xl border border-gray-100 p-4">
					<p className="text-xs text-gray-500 mb-1">Idle</p>
					<p className="text-2xl font-bold text-yellow-600">{totalIdle}</p>
				</div>
				<div className="bg-white rounded-2xl border border-gray-100 p-4">
					<p className="text-xs text-gray-500 mb-1">Offline</p>
					<p className="text-2xl font-bold text-gray-500">{totalOffline}</p>
				</div>
			</div>

			<div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
				<div className="lg:col-span-1 bg-white rounded-2xl border border-gray-100 p-4 space-y-2 max-h-[560px] overflow-y-auto">
					<div className="flex items-center justify-between mb-2">
						<p className="text-sm font-semibold text-gray-700">Daftar Sopir</p>
						<span className="flex items-center gap-1 text-xs text-gray-400">
							<Radio size={12} className="animate-pulse" /> live
						</span>
					</div>
					{loading && <p className="text-sm text-gray-400 px-2">Memuat...</p>}
					{!loading && posisi.length === 0 && (
						<p className="text-sm text-gray-400 px-2">
							Belum ada data posisi. Pastikan device sopir sudah mengirim GPS.
						</p>
					)}
					{posisi.map((p) => (
						<button
							key={p.deviceId}
							onClick={() => toggleSelect(p.deviceId)}
							className={`w-full text-left p-3 rounded-xl border transition ${
								selected === p.deviceId
									? "border-indigo-400 bg-indigo-50"
									: "border-gray-100 hover:bg-gray-50"
							}`}>
							<div className="flex items-center justify-between">
								<p className="text-sm font-medium text-gray-900">
									{p.namaSopir}
								</p>
								<span
									className={`text-xs px-2 py-0.5 rounded-full ${STATUS_BADGE[p.statusOnline]}`}>
									{STATUS_LABEL[p.statusOnline]}
								</span>
							</div>
							<div className="flex items-center gap-2 mt-1 text-xs text-gray-400">
								<span>{formatDate(p.recordedAt)}</span>
								{p.battery !== null && (
									<span className="flex items-center gap-0.5">
										<IconBaterai persen={p.battery} /> {p.battery}%
									</span>
								)}
							</div>
						</button>
					))}
				</div>

				<div className="lg:col-span-2 h-[560px] bg-white rounded-2xl border border-gray-100 overflow-hidden">
					<SopirTrackingMap
						posisi={posisi}
						selectedDeviceId={selected}
						onSelectDevice={toggleSelect}
					/>
				</div>
			</div>
		</div>
	);
}
