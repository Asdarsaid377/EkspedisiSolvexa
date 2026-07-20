import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { getBookingCustomerId } from "@/lib/bookingAuth";
import { lookupTarifOngkir } from "@/lib/tarifAksi";
import type { JenisLayanan } from "@/lib/types";

const JENIS_LAYANAN_VALUES: JenisLayanan[] = ["reguler", "express", "kargo"];

function truncate(value: string, max: number): string {
	return value.slice(0, max);
}

type NumResult = { ok: true; value: number | null } | { ok: false };

function validateNumber(
	value: unknown,
	opts: { min: number; max: number; requireValue: boolean; exclusiveMin?: boolean },
): NumResult {
	const isEmpty = value === undefined || value === null || value === "";
	if (isEmpty) {
		return opts.requireValue ? { ok: false } : { ok: true, value: null };
	}
	const n = Number(value);
	if (!Number.isFinite(n)) return { ok: false };
	if (opts.exclusiveMin ? n <= opts.min : n < opts.min) return { ok: false };
	if (n > opts.max) return { ok: false };
	return { ok: true, value: n };
}

export async function POST(req: NextRequest) {
	try {
		// §4.1 poin 1 — customer_id HANYA dari cookie JWT terverifikasi,
		// TIDAK PERNAH dari body request (booking_request.customer_id di
		// bawah selalu memakai variabel ini, bukan field apapun dari `body`).
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

		const jenisLayanan = typeof body.jenis_layanan === "string" ? body.jenis_layanan : "";
		if (!JENIS_LAYANAN_VALUES.includes(jenisLayanan as JenisLayanan)) {
			return NextResponse.json({ error: "Jenis layanan tidak valid" }, { status: 400 });
		}

		const penerimaNama =
			typeof body.penerima_nama === "string" ? body.penerima_nama.trim() : "";
		if (penerimaNama.length < 2 || penerimaNama.length > 200) {
			return NextResponse.json(
				{ error: "Nama penerima wajib diisi (2-200 karakter)" },
				{ status: 400 },
			);
		}
		const penerimaTelepon =
			typeof body.penerima_telepon === "string"
				? truncate(body.penerima_telepon.trim(), 50) || null
				: null;
		const penerimaAlamat =
			typeof body.penerima_alamat === "string"
				? truncate(body.penerima_alamat.trim(), 2000) || null
				: null;
		const penerimaKota =
			typeof body.penerima_kota === "string"
				? truncate(body.penerima_kota.trim(), 200) || null
				: null;
		const isiBarang =
			typeof body.isi_barang === "string"
				? truncate(body.isi_barang.trim(), 2000) || null
				: null;
		const catatan =
			typeof body.catatan === "string" ? truncate(body.catatan.trim(), 2000) || null : null;

		// §4.1 poin 5 — validasi batas di server, bukan cuma di form.
		const berat = validateNumber(body.berat_kg, {
			min: 0,
			max: 10000,
			requireValue: true,
			exclusiveMin: true,
		});
		if (!berat.ok) {
			return NextResponse.json(
				{ error: "Berat harus lebih dari 0 dan maksimal 10000 kg" },
				{ status: 400 },
			);
		}
		const panjang = validateNumber(body.panjang_cm, {
			min: 0,
			max: 1000,
			requireValue: false,
			exclusiveMin: true,
		});
		const lebar = validateNumber(body.lebar_cm, {
			min: 0,
			max: 1000,
			requireValue: false,
			exclusiveMin: true,
		});
		const tinggi = validateNumber(body.tinggi_cm, {
			min: 0,
			max: 1000,
			requireValue: false,
			exclusiveMin: true,
		});
		if (!panjang.ok || !lebar.ok || !tinggi.ok) {
			return NextResponse.json(
				{ error: "Dimensi tidak valid (harus lebih dari 0, maksimal 1000 cm)" },
				{ status: 400 },
			);
		}
		const nilaiBarang = validateNumber(body.nilai_barang, {
			min: 0,
			max: 1_000_000_000_000,
			requireValue: false,
		});
		if (!nilaiBarang.ok) {
			return NextResponse.json({ error: "Nilai barang tidak valid" }, { status: 400 });
		}

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

		// Pengirim = snapshot dari profil customer SAAT INI, diambil
		// server-side dari tabel `customer` (BUKAN dari body request) — form
		// booking sengaja tidak membuat field pengirim editable (spec §6),
		// jadi tidak ada alasan mempercayai nilai kiriman client untuk field
		// ini juga. Ini juga menutup celah customer mengaku sebagai pengirim
		// lain dengan mengirim pengirim_nama palsu di body.
		const { data: customer } = await adminClient
			.from("customer")
			.select("nama, telepon, alamat, kota")
			.eq("id", customerId)
			.maybeSingle();

		if (!customer) {
			return NextResponse.json({ error: "Akun tidak ditemukan" }, { status: 401 });
		}

		// Estimasi ongkir (formula Fase 2) — kargo selalu manual quote staf
		// nanti, tidak pernah lookup tarif_zona (konsisten aturan Fase 1 &
		// form staf). lookupTarifOngkir() dipanggil dengan adminClient
		// (service role) karena RLS tarif_zona staff-only — customer TIDAK
		// PERNAH bisa query tabel itu langsung dengan cara apapun.
		let ongkirEstimasi: number | null = null;
		if (jenisLayanan !== "kargo" && customer.kota && penerimaKota) {
			const tarif = await lookupTarifOngkir(adminClient, {
				jenisLayanan: jenisLayanan as JenisLayanan,
				kotaAsal: customer.kota,
				kotaTujuan: penerimaKota,
				beratKg: berat.value as number,
				panjangCm: panjang.value ?? undefined,
				lebarCm: lebar.value ?? undefined,
				tinggiCm: tinggi.value ?? undefined,
			});
			if (tarif.found) ongkirEstimasi = tarif.ongkir;
		}

		const { data: created, error } = await adminClient
			.from("booking_request")
			.insert({
				customer_id: customerId,
				jenis_layanan: jenisLayanan,
				pengirim_nama: customer.nama,
				pengirim_telepon: customer.telepon,
				pengirim_alamat: customer.alamat,
				pengirim_kota: customer.kota,
				penerima_nama: penerimaNama,
				penerima_telepon: penerimaTelepon,
				penerima_alamat: penerimaAlamat,
				penerima_kota: penerimaKota,
				berat_kg: berat.value,
				panjang_cm: panjang.value,
				lebar_cm: lebar.value,
				tinggi_cm: tinggi.value,
				isi_barang: isiBarang,
				nilai_barang: nilaiBarang.value ?? 0,
				ongkir_estimasi: ongkirEstimasi,
				catatan,
			})
			// §4.1 poin 2 — allowlist eksplisit, bukan select("*") — respons ke
			// customer cuma berisi ringkasan booking miliknya sendiri.
			.select(
				"id, jenis_layanan, penerima_nama, penerima_kota, berat_kg, ongkir_estimasi, status, created_at",
			)
			.single();

		if (error || !created) {
			return NextResponse.json(
				{ error: "Gagal mengirim booking, coba lagi" },
				{ status: 500 },
			);
		}

		return NextResponse.json({ success: true, booking: created });
	} catch {
		return NextResponse.json(
			{ error: "Gagal mengirim booking, coba lagi" },
			{ status: 500 },
		);
	}
}
