import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Service role: bypass RLS, tabel tracking tidak boleh writable dari client biasa
const supabase = createClient(
	process.env.NEXT_PUBLIC_SUPABASE_URL!,
	process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

async function handle(req: NextRequest) {
	const p = req.nextUrl.searchParams;

	// 1. Auth via token di URL
	if (req.method === "POST") {
		const bodyText = await req.text();
		if (bodyText) {
			new URLSearchParams(bodyText).forEach((v, k) => {
				if (!p.has(k)) p.set(k, v);
			});
		}
	}

	const deviceId = p.get("id");
	const lat = parseFloat(p.get("lat") ?? "");
	const lng = parseFloat(p.get("lon") ?? "");
	const ts = parseInt(p.get("timestamp") ?? "", 10);
	const tsRaw = p.get("timestamp") ?? "";
	const tsNum = parseInt(tsRaw, 10);
	const recordedAt =
		!isNaN(tsNum) && tsRaw === String(tsNum)
			? new Date(tsNum * 1000)
			: new Date(tsRaw); // fallback ISO string

	if (!deviceId || isNaN(lat) || isNaN(lng) || isNaN(recordedAt.getTime())) {
		return new NextResponse("bad request", { status: 400 });
	}

	if (!deviceId || isNaN(lat) || isNaN(lng) || isNaN(ts)) {
		return new NextResponse("bad request", { status: 400 });
	}

	// 2. Device harus terdaftar & aktif
	const { data: device } = await supabase
		.from("sopir_devices")
		.select("device_id")
		.eq("device_id", deviceId)
		.eq("aktif", true)
		.single();

	if (!device) return new NextResponse("unknown device", { status: 403 });

	// 3. Insert; abaikan duplikat dari buffering offline
	const { error } = await supabase.from("tracking_sopir").upsert(
		{
			device_id: deviceId,
			lat,
			lng,
			accuracy: parseFloat(p.get("accuracy") ?? "") || null,
			battery: parseInt(p.get("batt") ?? "", 10) || null,
			recorded_at: new Date(ts * 1000).toISOString(), // pakai waktu perangkat
		},
		{ onConflict: "device_id,recorded_at", ignoreDuplicates: true },
	);

	if (error) return new NextResponse("db error", { status: 500 });
	return new NextResponse("OK", { status: 200 }); // Traccar cuma butuh 200
}

// Traccar Client bisa kirim GET atau POST tergantung versi
export const GET = handle;
export const POST = handle;
