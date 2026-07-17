"use client";

import { useEffect, useRef } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { formatDate } from "@/lib/utils";

export interface SopirPosisi {
	deviceId: string;
	namaSopir: string;
	lat: number;
	lng: number;
	accuracy: number | null;
	battery: number | null;
	recordedAt: string;
	statusOnline: "online" | "idle" | "offline";
}

const STATUS_COLOR: Record<SopirPosisi["statusOnline"], string> = {
	online: "#16a34a",
	idle: "#ca8a04",
	offline: "#6b7280",
};

const SLIDE_DURATION_MS = 900;
const FOCUS_ZOOM = 16;

function buatIconSopir(warna: string, terpilih: boolean) {
	const ukuran = terpilih ? 26 : 18;
	const border = terpilih ? 4 : 3;
	return L.divIcon({
		className: "",
		html: `<div style="
			width: ${ukuran}px; height: ${ukuran}px; border-radius: 9999px;
			background: ${warna}; border: ${border}px solid white;
			box-shadow: 0 1px 6px rgba(0,0,0,0.45);
		"></div>`,
		iconSize: [ukuran, ukuran],
		iconAnchor: [ukuran / 2, ukuran / 2],
		popupAnchor: [0, -ukuran / 2],
	});
}

// Marker yang geser halus ke posisi baru (bukan lompat instan) tiap kali `position` berubah
function AnimatedMarker({
	position,
	icon,
	onClick,
	children,
}: {
	position: [number, number];
	icon: L.DivIcon;
	onClick?: () => void;
	children?: React.ReactNode;
}) {
	const markerRef = useRef<L.Marker>(null);
	const initialPosition = useRef(position);
	const displayedPosition = useRef(position);
	const rafRef = useRef<number | null>(null);

	useEffect(() => {
		const marker = markerRef.current;
		if (!marker) return;

		const from = displayedPosition.current;
		const to = position;
		if (from[0] === to[0] && from[1] === to[1]) return;

		if (rafRef.current) cancelAnimationFrame(rafRef.current);
		const start = performance.now();
		const [startLat, startLng] = from;
		const deltaLat = to[0] - startLat;
		const deltaLng = to[1] - startLng;

		const step = (now: number) => {
			const t = Math.min(1, (now - start) / SLIDE_DURATION_MS);
			const eased = 1 - Math.pow(1 - t, 3); // ease-out cubic
			const lat = startLat + deltaLat * eased;
			const lng = startLng + deltaLng * eased;
			marker.setLatLng([lat, lng]);
			displayedPosition.current = [lat, lng];
			if (t < 1) rafRef.current = requestAnimationFrame(step);
		};
		rafRef.current = requestAnimationFrame(step);

		return () => {
			if (rafRef.current) cancelAnimationFrame(rafRef.current);
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [position[0], position[1]]);

	return (
		<Marker
			ref={markerRef}
			position={initialPosition.current}
			icon={icon}
			eventHandlers={onClick ? { click: onClick } : undefined}>
			{children}
		</Marker>
	);
}

// Auto pan+zoom ke lokasi sopir yang dipilih — ikut mengikuti tiap posisi terbaru selama masih terpilih
function FlyToController({ target }: { target: [number, number] | null }) {
	const map = useMap();

	useEffect(() => {
		if (!target) return;
		map.flyTo(target, Math.max(map.getZoom(), FOCUS_ZOOM), { duration: 1.2 });
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [target?.[0], target?.[1]]);

	return null;
}

const DEFAULT_CENTER: [number, number] = [-5.147, 119.432];

export default function SopirTrackingMap({
	posisi,
	selectedDeviceId,
	onSelectDevice,
}: {
	posisi: SopirPosisi[];
	selectedDeviceId?: string | null;
	onSelectDevice?: (deviceId: string) => void;
}) {
	const center: [number, number] =
		posisi.length > 0 ? [posisi[0].lat, posisi[0].lng] : DEFAULT_CENTER;

	const target = selectedDeviceId
		? posisi.find((p) => p.deviceId === selectedDeviceId)
		: null;
	const focusTarget: [number, number] | null = target ? [target.lat, target.lng] : null;

	return (
		<MapContainer
			center={center}
			zoom={13}
			scrollWheelZoom
			className="w-full h-full rounded-2xl"
			style={{ zIndex: 0 }}>
			<TileLayer
				attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
				url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
			/>
			<FlyToController target={focusTarget} />
			{posisi.map((p) => (
				<AnimatedMarker
					key={p.deviceId}
					position={[p.lat, p.lng]}
					icon={buatIconSopir(STATUS_COLOR[p.statusOnline], p.deviceId === selectedDeviceId)}
					onClick={onSelectDevice ? () => onSelectDevice(p.deviceId) : undefined}>
					<Popup>
						<div className="text-sm">
							<p className="font-semibold">{p.namaSopir}</p>
							<p className="text-gray-500">Update: {formatDate(p.recordedAt)}</p>
							{p.battery !== null && <p className="text-gray-500">Baterai: {p.battery}%</p>}
							{p.accuracy !== null && (
								<p className="text-gray-500">Akurasi: ±{Math.round(p.accuracy)}m</p>
							)}
						</div>
					</Popup>
				</AnimatedMarker>
			))}
		</MapContainer>
	);
}
