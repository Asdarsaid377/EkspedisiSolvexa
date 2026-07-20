import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { getBookingCustomerId } from "@/lib/bookingAuth";

function truncate(value: string, max: number): string {
	return value.slice(0, max);
}

// Ditambah di Step 5 (di luar checklist awal spec 10 §8, dikonfirmasi
// eksplisit dengan user sebelum ditulis) — supaya /booking/profil beneran
// bisa dipakai edit, bukan cuma tampilan statis. Rigor sama dengan semua
// endpoint booking lain (§4.1).
export async function PATCH(req: NextRequest) {
	try {
		// customer_id HANYA dari JWT (§4.1 poin 1) — endpoint ini SELALU
		// mengubah baris customer milik pemilik sesi, tidak pernah menerima
		// id target dari body. Tidak ada cara buat customer A mengedit
		// profil customer B lewat endpoint ini.
		const customerId = await getBookingCustomerId(req);
		if (!customerId) {
			return NextResponse.json(
				{ error: "Silakan login terlebih dahulu" },
				{ status: 401 },
			);
		}

		const body = await req.json().catch(() => null);
		if (!body || typeof body !== "object") {
			return NextResponse.json({ error: "Data tidak valid" }, { status: 400 });
		}

		const nama = typeof body.nama === "string" ? body.nama.trim() : "";
		if (nama.length < 2 || nama.length > 200) {
			return NextResponse.json(
				{ error: "Nama wajib diisi (2-200 karakter)" },
				{ status: 400 },
			);
		}
		const telepon =
			typeof body.telepon === "string" ? truncate(body.telepon.trim(), 50) || null : null;
		const alamat =
			typeof body.alamat === "string" ? truncate(body.alamat.trim(), 2000) || null : null;
		const kota =
			typeof body.kota === "string" ? truncate(body.kota.trim(), 200) || null : null;

		const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
		if (!serviceKey) {
			return NextResponse.json(
				{ error: "Konfigurasi server belum lengkap" },
				{ status: 500 },
			);
		}
		const adminClient = createClient(
			process.env.NEXT_PUBLIC_SUPABASE_URL!,
			serviceKey,
		);

		// Hanya 4 kolom ini yang bisa diubah lewat endpoint ini — objek
		// update literal (BUKAN spread `body`), supaya tidak ada field liar
		// (email, password_hash, tipe, aktif, term_hari, dst) yang bisa
		// lolos lewat body yang dimanipulasi.
		const { data: updated, error } = await adminClient
			.from("customer")
			.update({ nama, telepon, alamat, kota })
			.eq("id", customerId)
			.select("id, nama, email, telepon, alamat, kota")
			.single();

		if (error || !updated) {
			return NextResponse.json(
				{ error: "Gagal memperbarui profil" },
				{ status: 500 },
			);
		}

		return NextResponse.json({ success: true, customer: updated });
	} catch {
		return NextResponse.json(
			{ error: "Gagal memperbarui profil" },
			{ status: 500 },
		);
	}
}
