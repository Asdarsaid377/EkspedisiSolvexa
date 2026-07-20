import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { getBookingCustomerId } from "@/lib/bookingAuth";

// Kolom booking_request yang aman ditampilkan ke customer sendiri — TIDAK
// termasuk customer_id (redundan, sudah scoped by definition) maupun
// processed_by (FK internal ke profiles staf, bukan urusan customer).
const BOOKING_REQUEST_COLUMNS =
	"id, jenis_layanan, penerima_nama, penerima_telepon, penerima_alamat, penerima_kota, berat_kg, panjang_cm, lebar_cm, tinggi_cm, isi_barang, nilai_barang, ongkir_estimasi, catatan, status, catatan_penolakan, pengiriman_id, created_at";

// §4.1 poin 2 — allowlist eksplisit PERSIS seperti yang didaftarkan di
// spec 10 §4.1: nomor_resi, milestone, jenis_layanan, tanggal,
// penerima_nama, penerima_kota, isi_barang, berat_kg, total_tagihan,
// status_bayar. TIDAK PERNAH: catatan_internal, petugas_*, breakdown
// ongkir/asuransi, nomor_faktur — sama seperti larangan view
// pengiriman_publik.
const PENGIRIMAN_COLUMNS =
	"nomor_resi, milestone, jenis_layanan, tanggal, penerima_nama, penerima_kota, isi_barang, berat_kg, total_tagihan, status_bayar";

// Beda dari /api/booking-auth/me (selalu 200, itu endpoint cek status) —
// ini endpoint ambil data terproteksi, jadi 401 kalau tidak login adalah
// respons yang benar, bukan payload kosong bersembunyi di balik 200.
export async function GET(req: NextRequest) {
	// customer_id HANYA dari cookie JWT terverifikasi (§4.1 poin 1).
	const customerId = await getBookingCustomerId(req);
	if (!customerId) {
		return NextResponse.json(
			{ error: "Silakan login terlebih dahulu" },
			{ status: 401 },
		);
	}

	const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
	if (!serviceKey) {
		return NextResponse.json(
			{ error: "Konfigurasi server belum lengkap" },
			{ status: 500 },
		);
	}
	// Service role — RLS booking_request/pengiriman TIDAK berlaku ke jalur
	// ini sama sekali. `.eq("customer_id", customerId)` di kedua query di
	// bawah adalah SATU-SATUNYA hal yang mencegah satu customer membaca
	// data customer lain — wajib selalu ada di setiap query di endpoint ini.
	const adminClient = createClient(
		process.env.NEXT_PUBLIC_SUPABASE_URL!,
		serviceKey,
	);

	// Dua query terpisah, di-merge di RESPONSE (bukan UNION di database) —
	// pola sama seperti /resi/[nomor] (spec 09).
	const [bookingResult, pengirimanResult] = await Promise.all([
		adminClient
			.from("booking_request")
			.select(BOOKING_REQUEST_COLUMNS)
			.eq("customer_id", customerId)
			.order("created_at", { ascending: false }),
		adminClient
			.from("pengiriman")
			.select(PENGIRIMAN_COLUMNS)
			.eq("customer_id", customerId)
			.order("tanggal", { ascending: false }),
	]);

	return NextResponse.json({
		bookingRequests: bookingResult.data ?? [],
		pengiriman: pengirimanResult.data ?? [],
	});
}
