"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { haversineDistanceMeters, getCurrentPosition } from "@/lib/geo";
import {
	loadFaceModels,
	startCamera,
	stopCamera,
	captureFaceDescriptor,
	captureAveragedDescriptor,
	descriptorDistance,
	FACE_MATCH_THRESHOLD,
} from "@/lib/faceapi";
import {
	ScanFace,
	MapPin,
	CheckCircle2,
	AlertCircle,
	LogIn,
	LogOut,
	History,
	Users,
	Settings,
	Loader2,
	Camera,
} from "lucide-react";

type Tab = "absen" | "riwayat" | "semua" | "pengaturan";

function fmtJam(iso: string | null) {
	if (!iso) return "-";
	return new Date(iso).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
}

function fmtTanggal(iso: string) {
	return new Date(iso).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
}

function todayStartISO() {
	const d = new Date();
	d.setHours(0, 0, 0, 0);
	return d.toISOString();
}

export default function AbsensiPage() {
	const { profile, role } = useAuth();
	const supabase = createClient();
	const isSuperadmin = role === "superadmin";

	const [tab, setTab] = useState<Tab>("absen");
	const videoRef = useRef<HTMLVideoElement>(null);
	const streamRef = useRef<MediaStream | null>(null);

	const [officeLoc, setOfficeLoc] = useState<{ lat: number; lng: number; radius: number } | null>(null);
	const [loadingInit, setLoadingInit] = useState(true);

	const [enrolled, setEnrolled] = useState<boolean | null>(null);
	const [enrollBusy, setEnrollBusy] = useState(false);
	const [enrollMsg, setEnrollMsg] = useState("");

	const [geoBusy, setGeoBusy] = useState(false);
	const [distance, setDistance] = useState<number | null>(null);
	const [absenBusy, setAbsenBusy] = useState(false);
	const [absenMsg, setAbsenMsg] = useState<{ type: "info" | "error" | "success"; text: string } | null>(null);
	const [cameraOn, setCameraOn] = useState(false);

	const [todayMasuk, setTodayMasuk] = useState<string | null>(null);
	const [todayPulang, setTodayPulang] = useState<string | null>(null);

	const [riwayat, setRiwayat] = useState<any[]>([]);

	// Superadmin: semua karyawan
	const [semuaList, setSemuaList] = useState<any[]>([]);
	const [semuaTanggal, setSemuaTanggal] = useState(new Date().toISOString().split("T")[0]);

	// Superadmin: pengaturan lokasi
	const [settingLat, setSettingLat] = useState("");
	const [settingLng, setSettingLng] = useState("");
	const [settingRadius, setSettingRadius] = useState("100");
	const [settingSaving, setSettingSaving] = useState(false);
	const [settingMsg, setSettingMsg] = useState("");

	const nextAction: "masuk" | "pulang" | "selesai" =
		!todayMasuk ? "masuk" : !todayPulang ? "pulang" : "selesai";

	const loadOfficeLoc = useCallback(async () => {
		const { data } = await supabase
			.from("owner_settings")
			.select("key, value")
			.in("key", ["absensi_lat", "absensi_lng", "absensi_radius_meter"]);
		const map: Record<string, string> = {};
		(data || []).forEach((r: any) => (map[r.key] = r.value));
		if (map.absensi_lat && map.absensi_lng) {
			const loc = {
				lat: parseFloat(map.absensi_lat),
				lng: parseFloat(map.absensi_lng),
				radius: parseFloat(map.absensi_radius_meter || "100"),
			};
			setOfficeLoc(loc);
			setSettingLat(map.absensi_lat);
			setSettingLng(map.absensi_lng);
			setSettingRadius(map.absensi_radius_meter || "100");
		} else {
			setOfficeLoc(null);
		}
	}, []);

	const loadEnrollStatus = useCallback(async () => {
		if (!profile?.id) return;
		const { data } = await supabase
			.from("face_enrollment")
			.select("profile_id")
			.eq("profile_id", profile.id)
			.maybeSingle();
		setEnrolled(!!data);
	}, [profile?.id]);

	const loadToday = useCallback(async () => {
		if (!profile?.id) return;
		const { data } = await supabase
			.from("absensi")
			.select("tipe, waktu")
			.eq("profile_id", profile.id)
			.gte("waktu", todayStartISO())
			.order("waktu", { ascending: true });
		const masuk = (data || []).find((r: any) => r.tipe === "masuk");
		const pulang = (data || []).find((r: any) => r.tipe === "pulang");
		setTodayMasuk(masuk?.waktu ?? null);
		setTodayPulang(pulang?.waktu ?? null);
	}, [profile?.id]);

	const loadRiwayat = useCallback(async () => {
		if (!profile?.id) return;
		const { data } = await supabase
			.from("absensi")
			.select("*")
			.eq("profile_id", profile.id)
			.order("waktu", { ascending: false })
			.limit(30);
		setRiwayat(data || []);
	}, [profile?.id]);

	const loadSemua = useCallback(async () => {
		const dayStart = new Date(semuaTanggal);
		dayStart.setHours(0, 0, 0, 0);
		const dayEnd = new Date(semuaTanggal);
		dayEnd.setHours(23, 59, 59, 999);
		const { data } = await supabase
			.from("absensi")
			.select("*, karyawan:profiles(name, role)")
			.gte("waktu", dayStart.toISOString())
			.lte("waktu", dayEnd.toISOString())
			.order("waktu", { ascending: true });
		setSemuaList(data || []);
	}, [semuaTanggal]);

	useEffect(() => {
		(async () => {
			await Promise.all([loadOfficeLoc(), loadEnrollStatus(), loadToday(), loadRiwayat()]);
			setLoadingInit(false);
		})();
	}, [loadOfficeLoc, loadEnrollStatus, loadToday, loadRiwayat]);

	useEffect(() => {
		if (tab === "semua" && isSuperadmin) loadSemua();
	}, [tab, isSuperadmin, loadSemua]);

	useEffect(() => {
		return () => stopCamera(streamRef.current);
	}, []);

	const handleEnroll = async () => {
		if (!profile?.id || !videoRef.current) return;
		setEnrollMsg("");
		setEnrollBusy(true);
		setCameraOn(true);
		try {
			setEnrollMsg("Memuat model wajah...");
			await loadFaceModels();
			setEnrollMsg("Mengaktifkan kamera, arahkan wajah ke kamera...");
			streamRef.current = await startCamera(videoRef.current);
			await new Promise((r) => setTimeout(r, 500));
			setEnrollMsg("Merekam data wajah, tahan posisi...");
			const descriptor = await captureAveragedDescriptor(videoRef.current);
			stopCamera(streamRef.current);
			streamRef.current = null;
			setCameraOn(false);

			if (!descriptor) {
				setEnrollMsg("Wajah tidak terdeteksi. Pastikan pencahayaan cukup dan coba lagi.");
				setEnrollBusy(false);
				return;
			}

			const { error } = await supabase.from("face_enrollment").upsert({
				profile_id: profile.id,
				descriptor: Array.from(descriptor),
				updated_at: new Date().toISOString(),
			});
			if (error) {
				setEnrollMsg("Gagal menyimpan data wajah: " + error.message);
				setEnrollBusy(false);
				return;
			}
			setEnrollMsg("Wajah berhasil didaftarkan.");
			setEnrolled(true);
		} catch (e: any) {
			setEnrollMsg("Gagal mengakses kamera: " + (e?.message || "unknown error"));
			stopCamera(streamRef.current);
			streamRef.current = null;
			setCameraOn(false);
		}
		setEnrollBusy(false);
	};

	const handleAbsen = async () => {
		if (!profile?.id || !videoRef.current || nextAction === "selesai") return;
		setAbsenMsg(null);
		setAbsenBusy(true);
		setGeoBusy(true);

		try {
			if (!officeLoc) {
				setAbsenMsg({ type: "error", text: "Lokasi kantor belum diatur. Hubungi superadmin." });
				setAbsenBusy(false);
				setGeoBusy(false);
				return;
			}

			setAbsenMsg({ type: "info", text: "Mendeteksi lokasi Anda..." });
			const pos = await getCurrentPosition();
			const userLat = pos.coords.latitude;
			const userLng = pos.coords.longitude;
			const dist = haversineDistanceMeters(userLat, userLng, officeLoc.lat, officeLoc.lng);
			setDistance(dist);
			setGeoBusy(false);

			if (dist > officeLoc.radius) {
				setAbsenMsg({
					type: "error",
					text: `Anda berada ${Math.round(dist)}m dari lokasi absensi (maks. ${officeLoc.radius}m). Absen hanya bisa dilakukan di lokasi yang ditentukan.`,
				});
				setAbsenBusy(false);
				return;
			}

			const { data: faceRow } = await supabase
				.from("face_enrollment")
				.select("descriptor")
				.eq("profile_id", profile.id)
				.maybeSingle();
			if (!faceRow?.descriptor) {
				setAbsenMsg({ type: "error", text: "Anda belum mendaftarkan wajah." });
				setAbsenBusy(false);
				return;
			}

			setAbsenMsg({ type: "info", text: "Memuat model wajah..." });
			await loadFaceModels();
			setAbsenMsg({ type: "info", text: "Mengaktifkan kamera, arahkan wajah ke kamera..." });
			setCameraOn(true);
			streamRef.current = await startCamera(videoRef.current);
			await new Promise((r) => setTimeout(r, 500));

			let captured: Float32Array | null = null;
			for (let i = 0; i < 4 && !captured; i++) {
				captured = await captureFaceDescriptor(videoRef.current);
				if (!captured) await new Promise((r) => setTimeout(r, 400));
			}

			stopCamera(streamRef.current);
			streamRef.current = null;
			setCameraOn(false);

			if (!captured) {
				setAbsenMsg({ type: "error", text: "Wajah tidak terdeteksi. Pastikan wajah terlihat jelas oleh kamera." });
				setAbsenBusy(false);
				return;
			}

			const d = descriptorDistance(faceRow.descriptor, captured);
			if (d > FACE_MATCH_THRESHOLD) {
				setAbsenMsg({ type: "error", text: "Wajah tidak cocok dengan data terdaftar. Silakan coba lagi." });
				setAbsenBusy(false);
				return;
			}

			const { error } = await supabase.from("absensi").insert({
				profile_id: profile.id,
				tipe: nextAction,
				lat: userLat,
				lng: userLng,
				jarak_meter: Math.round(dist * 100) / 100,
			});
			if (error) {
				setAbsenMsg({ type: "error", text: "Gagal menyimpan absensi: " + error.message });
				setAbsenBusy(false);
				return;
			}

			setAbsenMsg({
				type: "success",
				text: nextAction === "masuk" ? "Absen masuk berhasil!" : "Absen pulang berhasil!",
			});
			await loadToday();
			await loadRiwayat();
		} catch (e: any) {
			setAbsenMsg({ type: "error", text: e?.message || "Gagal memproses absensi. Pastikan izin lokasi & kamera diaktifkan." });
			stopCamera(streamRef.current);
			streamRef.current = null;
			setCameraOn(false);
			setGeoBusy(false);
		}
		setAbsenBusy(false);
	};

	const saveSetting = async () => {
		setSettingSaving(true);
		setSettingMsg("");
		const lat = parseFloat(settingLat);
		const lng = parseFloat(settingLng);
		const radius = parseFloat(settingRadius);
		if (isNaN(lat) || isNaN(lng) || isNaN(radius) || radius <= 0) {
			setSettingMsg("Isi lokasi & radius dengan angka yang valid.");
			setSettingSaving(false);
			return;
		}
		await Promise.all([
			supabase.from("owner_settings").upsert({ key: "absensi_lat", value: String(lat), updated_by: profile?.id }),
			supabase.from("owner_settings").upsert({ key: "absensi_lng", value: String(lng), updated_by: profile?.id }),
			supabase.from("owner_settings").upsert({ key: "absensi_radius_meter", value: String(radius), updated_by: profile?.id }),
		]);
		setOfficeLoc({ lat, lng, radius });
		setSettingMsg("Lokasi absensi berhasil disimpan.");
		setSettingSaving(false);
	};

	const useCurrentAsOffice = async () => {
		setSettingMsg("Mendeteksi lokasi Anda...");
		try {
			const pos = await getCurrentPosition();
			setSettingLat(pos.coords.latitude.toFixed(7));
			setSettingLng(pos.coords.longitude.toFixed(7));
			setSettingMsg("Lokasi saat ini terisi otomatis. Klik Simpan untuk konfirmasi.");
		} catch (e: any) {
			setSettingMsg("Gagal mendapatkan lokasi: " + (e?.message || ""));
		}
	};

	const tabs: { key: Tab; label: string; icon: any }[] = [
		{ key: "absen", label: "Absen", icon: ScanFace },
		{ key: "riwayat", label: "Riwayat Saya", icon: History },
		...(isSuperadmin
			? ([
					{ key: "semua", label: "Semua Karyawan", icon: Users },
					{ key: "pengaturan", label: "Pengaturan Lokasi", icon: Settings },
				] as { key: Tab; label: string; icon: any }[])
			: []),
	];

	return (
		<div className="max-w-3xl mx-auto">
			<div className="mb-6">
				<h1 className="text-2xl font-bold text-gray-900">Absensi Karyawan</h1>
				<p className="text-gray-500 mt-1">Verifikasi wajah + lokasi, tanpa perlu upload foto</p>
			</div>

			<div className="flex gap-2 mb-6 flex-wrap">
				{tabs.map((t) => (
					<button
						key={t.key}
						onClick={() => setTab(t.key)}
						className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition ${
							tab === t.key ? "bg-indigo-600 text-white" : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
						}`}>
						<t.icon size={14} />
						{t.label}
					</button>
				))}
			</div>

			{/* Video capture (hanya tampil saat proses berlangsung) — <video> selalu ter-mount
			    supaya videoRef & MediaStream tidak putus saat cameraOn berubah; yang di-toggle
			    hanya visibility wrapper-nya */}
			<div
				className={
					cameraOn
						? "fixed inset-0 bg-black/60 z-[80] flex items-center justify-center p-4"
						: "hidden"
				}>
				<div className="bg-white rounded-2xl p-5 shadow-2xl max-w-xs w-full text-center">
					<video ref={videoRef} muted playsInline className="w-full rounded-xl bg-black scale-x-[-1]" />
					<p className="text-sm text-gray-500 mt-3 flex items-center justify-center gap-1.5">
						<Camera size={14} className="animate-pulse text-indigo-500" />
						Memproses...
					</p>
				</div>
			</div>

			{loadingInit ? (
				<div className="text-center py-16 text-gray-400">Memuat...</div>
			) : tab === "absen" ? (
				<div className="space-y-5">
					{!officeLoc && (
						<div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-2xl px-5 py-4 text-sm flex items-center gap-2">
							<AlertCircle size={16} /> Lokasi absensi belum diatur oleh superadmin. Absen belum bisa dilakukan.
						</div>
					)}

					{enrolled === false && (
						<div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 text-center">
							<ScanFace size={36} className="mx-auto text-indigo-400 mb-3" />
							<h2 className="font-semibold text-gray-900 mb-1">Daftarkan Wajah Anda</h2>
							<p className="text-sm text-gray-500 mb-4">
								Sebelum bisa absen, daftarkan wajah Anda sekali. Data wajah disimpan sebagai
								representasi angka (bukan foto) untuk verifikasi absensi berikutnya.
							</p>
							<button
								onClick={handleEnroll}
								disabled={enrollBusy}
								className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition">
								{enrollBusy ? <Loader2 size={15} className="animate-spin" /> : <ScanFace size={15} />}
								{enrollBusy ? "Memproses..." : "Mulai Pendaftaran Wajah"}
							</button>
							{enrollMsg && <p className="text-xs text-gray-500 mt-3">{enrollMsg}</p>}
						</div>
					)}

					{enrolled === true && (
						<>
							<div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
								<div className="grid grid-cols-2 gap-4 text-center">
									<div className="p-4 rounded-xl bg-gray-50">
										<p className="text-xs text-gray-400 mb-1 flex items-center justify-center gap-1">
											<LogIn size={12} /> Masuk
										</p>
										<p className="text-xl font-bold text-gray-900">{fmtJam(todayMasuk)}</p>
									</div>
									<div className="p-4 rounded-xl bg-gray-50">
										<p className="text-xs text-gray-400 mb-1 flex items-center justify-center gap-1">
											<LogOut size={12} /> Pulang
										</p>
										<p className="text-xl font-bold text-gray-900">{fmtJam(todayPulang)}</p>
									</div>
								</div>
							</div>

							<div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 text-center">
								{nextAction === "selesai" ? (
									<>
										<CheckCircle2 size={36} className="mx-auto text-green-500 mb-3" />
										<p className="font-semibold text-gray-900">Absensi hari ini sudah lengkap</p>
										<p className="text-sm text-gray-500 mt-1">Sampai jumpa besok!</p>
									</>
								) : (
									<>
										<MapPin size={30} className="mx-auto text-indigo-400 mb-3" />
										<p className="text-sm text-gray-500 mb-4">
											Pastikan Anda berada di lokasi yang ditentukan, lalu tekan tombol di bawah untuk
											verifikasi lokasi + wajah secara otomatis.
										</p>
										<button
											onClick={handleAbsen}
											disabled={absenBusy || !officeLoc}
											className={`inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold transition text-white disabled:opacity-50 ${
												nextAction === "masuk" ? "bg-green-600 hover:bg-green-700" : "bg-orange-600 hover:bg-orange-700"
											}`}>
											{absenBusy ? (
												<Loader2 size={16} className="animate-spin" />
											) : nextAction === "masuk" ? (
												<LogIn size={16} />
											) : (
												<LogOut size={16} />
											)}
											{absenBusy
												? geoBusy
													? "Mendeteksi lokasi..."
													: "Memverifikasi wajah..."
												: nextAction === "masuk"
													? "Absen Masuk"
													: "Absen Pulang"}
										</button>
									</>
								)}

								{absenMsg && (
									<div
										className={`mt-4 text-sm rounded-xl px-4 py-3 flex items-center gap-2 justify-center ${
											absenMsg.type === "error"
												? "bg-red-50 text-red-700 border border-red-200"
												: absenMsg.type === "success"
													? "bg-green-50 text-green-700 border border-green-200"
													: "bg-blue-50 text-blue-700 border border-blue-200"
										}`}>
										{absenMsg.type === "error" ? (
											<AlertCircle size={14} />
										) : absenMsg.type === "success" ? (
											<CheckCircle2 size={14} />
										) : (
											<Loader2 size={14} className="animate-spin" />
										)}
										{absenMsg.text}
									</div>
								)}

								{distance !== null && officeLoc && (
									<p className="text-xs text-gray-400 mt-3">
										Jarak terakhir terdeteksi: {Math.round(distance)}m (radius diizinkan {officeLoc.radius}m)
									</p>
								)}
							</div>
						</>
					)}
				</div>
			) : tab === "riwayat" ? (
				<div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
					<div className="divide-y divide-gray-100">
						{riwayat.length === 0 ? (
							<div className="text-center py-12 text-gray-400 text-sm">Belum ada riwayat absensi</div>
						) : (
							riwayat.map((r) => (
								<div key={r.id} className="flex items-center justify-between px-5 py-3.5">
									<div className="flex items-center gap-3">
										<div
											className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
												r.tipe === "masuk" ? "bg-green-50 text-green-600" : "bg-orange-50 text-orange-600"
											}`}>
											{r.tipe === "masuk" ? <LogIn size={14} /> : <LogOut size={14} />}
										</div>
										<div>
											<p className="text-sm font-medium text-gray-800 capitalize">{r.tipe}</p>
											<p className="text-xs text-gray-400">{fmtTanggal(r.waktu)}</p>
										</div>
									</div>
									<div className="text-right">
										<p className="text-sm font-semibold text-gray-900">{fmtJam(r.waktu)}</p>
										{r.jarak_meter != null && (
											<p className="text-xs text-gray-400">{Math.round(r.jarak_meter)}m dari lokasi</p>
										)}
									</div>
								</div>
							))
						)}
					</div>
				</div>
			) : tab === "semua" && isSuperadmin ? (
				<div className="space-y-4">
					<input
						type="date"
						value={semuaTanggal}
						onChange={(e) => setSemuaTanggal(e.target.value)}
						className="px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
					/>
					<div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
						<div className="divide-y divide-gray-100">
							{semuaList.length === 0 ? (
								<div className="text-center py-12 text-gray-400 text-sm">Tidak ada data absensi pada tanggal ini</div>
							) : (
								semuaList.map((r) => (
									<div key={r.id} className="flex items-center justify-between px-5 py-3.5">
										<div className="flex items-center gap-3">
											<div
												className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
													r.tipe === "masuk" ? "bg-green-50 text-green-600" : "bg-orange-50 text-orange-600"
												}`}>
												{r.tipe === "masuk" ? <LogIn size={14} /> : <LogOut size={14} />}
											</div>
											<div>
												<p className="text-sm font-medium text-gray-800">{r.karyawan?.name || "-"}</p>
												<p className="text-xs text-gray-400 capitalize">{r.karyawan?.role} · {r.tipe}</p>
											</div>
										</div>
										<div className="text-right">
											<p className="text-sm font-semibold text-gray-900">{fmtJam(r.waktu)}</p>
											{r.jarak_meter != null && (
												<p className="text-xs text-gray-400">{Math.round(r.jarak_meter)}m dari lokasi</p>
											)}
										</div>
									</div>
								))
							)}
						</div>
					</div>
				</div>
			) : tab === "pengaturan" && isSuperadmin ? (
				<div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 max-w-md space-y-4">
					<p className="text-sm text-gray-500">
						Karyawan hanya bisa absen jika berada dalam radius dari titik koordinat ini.
					</p>
					<div className="grid grid-cols-2 gap-3">
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-1">Latitude</label>
							<input
								value={settingLat}
								onChange={(e) => setSettingLat(e.target.value)}
								placeholder="-6.200000"
								className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
							/>
						</div>
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-1">Longitude</label>
							<input
								value={settingLng}
								onChange={(e) => setSettingLng(e.target.value)}
								placeholder="106.816666"
								className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
							/>
						</div>
					</div>
					<div>
						<label className="block text-sm font-medium text-gray-700 mb-1">Radius (meter)</label>
						<input
							type="number"
							value={settingRadius}
							onChange={(e) => setSettingRadius(e.target.value)}
							className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
						/>
					</div>
					<button
						onClick={useCurrentAsOffice}
						className="w-full flex items-center justify-center gap-1.5 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition">
						<MapPin size={14} /> Gunakan Lokasi Saya Saat Ini
					</button>
					{settingMsg && <p className="text-xs text-gray-500">{settingMsg}</p>}
					<button
						onClick={saveSetting}
						disabled={settingSaving}
						className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white rounded-xl text-sm font-semibold transition">
						{settingSaving ? "Menyimpan..." : "Simpan Lokasi"}
					</button>
				</div>
			) : null}
		</div>
	);
}
