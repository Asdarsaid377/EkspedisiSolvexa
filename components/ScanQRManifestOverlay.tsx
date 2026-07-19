"use client";

// Overlay scan QR fullscreen — dipakai BERSAMA `/dashboard/manifest/[id]`
// (Step 2 spec 08) dan `/tugas` (Step 4, tombol "Scan untuk Muat"). Logika
// eligibility/insert TIDAK ada di sini — semuanya lewat lib/manifestAksi.ts
// (reuse), komponen ini murni kamera + feedback + lifecycle.

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { BrowserQRCodeReader, IScannerControls } from "@zxing/browser";
import { scanLookupManifest, addManifestItem } from "@/lib/manifestAksi";
import { X } from "lucide-react";

interface ScanQRManifestOverlayProps {
	open: boolean;
	manifestId: string;
	onClose: () => void;
	// Dipanggil setelah kiriman berhasil ditambahkan — parent refresh datanya
	// sendiri (mis. load()), tidak ada state manifest yang disimpan di sini.
	onItemAdded: (pengirimanId: string) => void;
	// Opsional — titik (b) checklist §1/§3 spec 08. Kalau parent tidak
	// menampilkan list kiriman (mis. /tugas), boleh diabaikan; overlay tetap
	// kasih toast feedback "sudah dicek" tanpa perlu ini.
	onItemChecked?: (pengirimanId: string) => void;
}

export default function ScanQRManifestOverlay({
	open,
	manifestId,
	onClose,
	onItemAdded,
	onItemChecked,
}: ScanQRManifestOverlayProps) {
	const supabase = createClient();

	const videoRef = useRef<HTMLVideoElement>(null);
	const scanControlsRef = useRef<IScannerControls | null>(null);
	const lastScanRef = useRef<{ text: string; at: number } | null>(null);
	const scanProcessingRef = useRef(false);
	const checkedThisSessionRef = useRef<Set<string>>(new Set());

	const [cameraError, setCameraError] = useState("");
	const [addedCount, setAddedCount] = useState(0);
	const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(
		null,
	);
	const [flash, setFlash] = useState<"success" | "error" | null>(null);

	const vibrate = (pattern: number | number[]) => {
		if (typeof navigator !== "undefined" && navigator.vibrate) navigator.vibrate(pattern);
	};

	const playBeep = (ok: boolean) => {
		try {
			const Ctx = window.AudioContext || (window as any).webkitAudioContext;
			const ctx = new Ctx();
			const osc = ctx.createOscillator();
			const gain = ctx.createGain();
			osc.connect(gain);
			gain.connect(ctx.destination);
			osc.frequency.value = ok ? 880 : 320;
			gain.gain.setValueAtTime(0.15, ctx.currentTime);
			osc.start();
			osc.stop(ctx.currentTime + 0.12);
			osc.onended = () => ctx.close();
		} catch {
			// Audio API tidak tersedia/diblokir — getar + flash visual tetap
			// jadi feedback utama, suara cuma pelengkap.
		}
	};

	const showFeedback = (type: "success" | "error", message: string) => {
		setToast({ type, message });
		setFlash(type);
		vibrate(type === "success" ? 60 : [40, 60, 40]);
		playBeep(type === "success");
		window.setTimeout(() => {
			setToast(null);
			setFlash(null);
		}, 1400);
	};

	const handleScanResult = async (text: string) => {
		const resi = text.trim();
		if (!resi) return;
		const now = Date.now();
		if (
			lastScanRef.current &&
			lastScanRef.current.text === resi &&
			now - lastScanRef.current.at < 2000
		) {
			return; // Debounce §3 — resi sama ter-scan ulang <2 detik, abaikan
		}
		if (scanProcessingRef.current) return; // satu scan diproses dulu sampai selesai
		scanProcessingRef.current = true;
		lastScanRef.current = { text: resi, at: now };

		try {
			const result = await scanLookupManifest(supabase, manifestId, resi);
			if (result.status === "eligible") {
				const { error } = await addManifestItem(supabase, manifestId, result.pengirimanId);
				if (error) {
					showFeedback("error", `Gagal menambahkan ${resi}: ${error}`);
				} else {
					setAddedCount((c) => c + 1);
					onItemAdded(result.pengirimanId);
					showFeedback("success", `${resi} ditambahkan`);
				}
			} else if (result.status === "already_in_this") {
				// Titik (b) checklist §1/§3 spec 08 — scan ulang resi yang sudah
				// ada di manifest ini = tandai "sudah dicek" (state lokal sesi,
				// TIDAK sentuh milestone/tabel apa pun).
				if (checkedThisSessionRef.current.has(result.pengirimanId)) {
					showFeedback("success", `${resi} sudah dicek sebelumnya`);
				} else {
					checkedThisSessionRef.current.add(result.pengirimanId);
					onItemChecked?.(result.pengirimanId);
					showFeedback("success", `${resi} ditandai sudah dicek`);
				}
			} else {
				showFeedback("error", result.reason);
			}
		} finally {
			scanProcessingRef.current = false;
		}
	};

	// Callback zxing didaftarkan SEKALI saat overlay dibuka — tanpa
	// indirection lewat ref ini, closure-nya stale terhadap `manifestId`/
	// callback props kalau overlay di-reuse tanpa remount di antara sesi.
	const handleScanResultRef = useRef(handleScanResult);
	useEffect(() => {
		handleScanResultRef.current = handleScanResult;
	});

	useEffect(() => {
		if (!open) return;
		let cancelled = false;
		setCameraError("");
		setAddedCount(0);
		setToast(null);
		setFlash(null);
		checkedThisSessionRef.current = new Set();

		const reader = new BrowserQRCodeReader();
		reader
			.decodeFromVideoDevice(undefined, videoRef.current!, (result) => {
				if (cancelled || !result) return;
				handleScanResultRef.current(result.getText());
			})
			.then((controls) => {
				if (cancelled) {
					controls.stop();
					return;
				}
				scanControlsRef.current = controls;
			})
			.catch((e: any) => {
				setCameraError(e?.message || "Gagal mengakses kamera. Pastikan izin kamera diizinkan.");
			});

		return () => {
			cancelled = true;
			scanControlsRef.current?.stop();
			scanControlsRef.current = null;
		};
	}, [open, manifestId]);

	if (!open) return null;

	return (
		<div className="fixed inset-0 bg-black z-50 flex flex-col">
			<div className="flex items-center justify-between px-4 py-3 text-white">
				<div>
					<p className="text-sm font-semibold">Scan QR Resi</p>
					<p className="text-xs text-gray-300">{addedCount} kiriman ditambahkan sesi ini</p>
				</div>
				<button onClick={onClose} className="p-2 hover:bg-white/10 rounded-lg transition">
					<X size={20} />
				</button>
			</div>

			<div className="flex-1 relative overflow-hidden bg-black">
				<video
					ref={videoRef}
					className="absolute inset-0 w-full h-full object-cover"
					muted
					playsInline
				/>
				<div className="absolute inset-0 flex items-center justify-center pointer-events-none">
					<div
						className={`w-64 h-64 border-4 rounded-2xl transition-colors duration-150 ${
							flash === "success"
								? "border-green-400"
								: flash === "error"
									? "border-red-400"
									: "border-white/50"
						}`}
					/>
				</div>

				{cameraError && (
					<div className="absolute inset-x-4 top-4 bg-red-600 text-white text-sm px-4 py-3 rounded-xl">
						{cameraError} Tutup overlay ini dan gunakan pencarian manual sebagai gantinya.
					</div>
				)}

				{toast && (
					<div
						className={`absolute bottom-6 inset-x-4 px-4 py-3 rounded-xl text-sm font-semibold text-white text-center ${
							toast.type === "success" ? "bg-green-600" : "bg-red-600"
						}`}>
						{toast.message}
					</div>
				)}
			</div>

			<div className="p-4">
				<button
					onClick={onClose}
					className="w-full py-3.5 bg-white text-gray-900 rounded-xl font-semibold">
					Selesai Scan
				</button>
			</div>
		</div>
	);
}
