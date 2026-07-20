import type { SupabaseClient } from "@supabase/supabase-js";
import type { JenisLayanan } from "./types";

// Diekstrak dari app/dashboard/pengiriman/page.tsx (Fase 2, useEffect lookup
// tarif_zona) — spec 10 (booking mandiri) §7: satu sumber logika dipakai
// BERSAMA form staf (`/dashboard/pengiriman`) dan form booking publik
// (`/booking/baru`, Step 5), pola sama seperti pengirimanAksi.ts/
// manifestAksi.ts.

export function hitungBeratEfektif(
	beratKg: number | string,
	panjangCm?: number | string,
	lebarCm?: number | string,
	tinggiCm?: number | string,
): number {
	const beratAktual = Number(beratKg) || 0;
	const beratVolumetrik =
		panjangCm && lebarCm && tinggiCm
			? (Number(panjangCm) * Number(lebarCm) * Number(tinggiCm)) / 6000
			: 0;
	return Math.max(beratAktual, beratVolumetrik);
}

export type TarifLookupResult =
	| { found: false }
	| { found: true; ongkir: number; estimasi_hari: number | null };

/**
 * Lookup tarif_zona + hitung ongkir untuk SATU pasangan kota+jenis layanan.
 *
 * Pemanggil WAJIB sudah memastikan sendiri (di luar fungsi ini) bahwa
 * `jenisLayanan` bukan `kargo` dan kedua kota terisi, SEBELUM memanggil —
 * skip-condition itu sengaja TIDAK dipindah ke dalam fungsi ini supaya
 * caller (form staf) tetap kontrol penuh kapan state loading di-set true,
 * persis perilaku sebelum diekstrak (regresi check Step 3, lihat
 * docs/spec/10-booking-mandiri.md §7-8). Kalau tetap dipanggil dengan
 * `kargo`, fungsi ini tidak akan crash — tarif_zona.jenis_layanan CHECK
 * constraint cuma reguler/express, jadi query akan wajar-wajar saja
 * mengembalikan `{ found: false }` — tapi itu query sia-sia yang harusnya
 * dicegah caller lebih dulu.
 *
 * Formula (Fase 2): berat_efektif = max(berat_kg, berat_volumetrik),
 * ongkir = max(harga_per_kg × berat_efektif, harga_flat_min), dibulatkan.
 */
export async function lookupTarifOngkir(
	supabase: SupabaseClient,
	params: {
		jenisLayanan: JenisLayanan;
		kotaAsal: string;
		kotaTujuan: string;
		beratKg: number | string;
		panjangCm?: number | string;
		lebarCm?: number | string;
		tinggiCm?: number | string;
	},
): Promise<TarifLookupResult> {
	const { data } = await supabase
		.from("tarif_zona")
		.select("harga_per_kg, harga_flat_min, estimasi_hari")
		.ilike("kota_asal", params.kotaAsal.trim())
		.ilike("kota_tujuan", params.kotaTujuan.trim())
		.eq("jenis_layanan", params.jenisLayanan)
		.eq("aktif", true)
		.maybeSingle();

	if (!data) return { found: false };

	const beratEfektif = hitungBeratEfektif(
		params.beratKg,
		params.panjangCm,
		params.lebarCm,
		params.tinggiCm,
	);
	const ongkir = Math.round(
		Math.max(data.harga_per_kg * beratEfektif, data.harga_flat_min),
	);

	return { found: true, ongkir, estimasi_hari: data.estimasi_hari };
}
