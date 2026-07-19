import { SupabaseClient } from "@supabase/supabase-js";

// Logika bersama alur "tambah kiriman ke manifest" (Fase 3) + scan QR
// (spec 08) — dipakai BERSAMA `/dashboard/manifest/[id]` (search manual +
// overlay scan) DAN `/tugas` (tombol "Scan untuk Muat", spec 08 Step 4).
// JANGAN duplikasi query exclude dobel-manifest/milestone eligible ini di
// tempat lain — satu sumber kebenaran, lihat spec 08 §3.

export interface KandidatKiriman {
	id: string;
	nomor_faktur: string;
	nomor_resi: string | null;
	penerima_nama: string;
	penerima_kota: string | null;
	milestone: string;
	berat_kg: number;
}

interface EligibleResult {
	eligible: KandidatKiriman[];
	takenManifest: Map<string, string>;
	alreadyInThis: Set<string>;
}

// Sumber tunggal aturan exclude dobel-manifest & milestone eligible (Fase
// 3). `manifestId` = manifest yang SEDANG diisi (dikecualikan dari cek
// "manifest lain" terhadap dirinya sendiri).
export async function findEligibleCandidates(
	supabase: SupabaseClient,
	manifestId: string,
	q: string,
): Promise<EligibleResult> {
	// Kiriman yang sudah ada di manifest lain yang masih aktif (draft/berangkat) — dikecualikan
	const { data: taken } = await supabase
		.from("manifest_item")
		.select("pengiriman_id, manifest:manifest(status, nomor_manifest)")
		.neq("manifest_id", manifestId);
	const takenManifest = new Map<string, string>();
	for (const t of (taken || []) as any[]) {
		if (t.manifest?.status === "draft" || t.manifest?.status === "berangkat") {
			takenManifest.set(t.pengiriman_id, t.manifest.nomor_manifest);
		}
	}

	const { data: inThis } = await supabase
		.from("manifest_item")
		.select("pengiriman_id")
		.eq("manifest_id", manifestId);
	const alreadyInThis = new Set((inThis || []).map((r: any) => r.pengiriman_id as string));

	const { data: found } = await supabase
		.from("pengiriman")
		.select("id, nomor_faktur, nomor_resi, penerima_nama, penerima_kota, milestone, berat_kg")
		.in("milestone", ["diproses", "dijemput", "gagal_kirim"])
		.or(`nomor_faktur.ilike.%${q}%,nomor_resi.ilike.%${q}%,penerima_nama.ilike.%${q}%`)
		.limit(20);

	const eligible = ((found || []) as KandidatKiriman[]).filter(
		(p) => !takenManifest.has(p.id) && !alreadyInThis.has(p.id),
	);
	return { eligible, takenManifest, alreadyInThis };
}

export type ScanLookupResult =
	| { status: "eligible"; pengirimanId: string }
	| { status: "already_in_this"; pengirimanId: string }
	| { status: "rejected"; reason: string };

// Lookup dari hasil scan QR — resi berupa nomor_resi POLOS (§2 spec 08,
// format QR tidak berubah/tidak disentuh). Validasi eligibility HANYA
// lewat findEligibleCandidates() (reuse); query pengiriman kedua di bawah
// murni untuk menyusun alasan toast yang jelas saat tidak eligible, BUKAN
// jalur validasi/insert terpisah.
//
// "already_in_this" DIPISAH dari "rejected" biasa — dipakai pemanggil untuk
// titik (b) checklist §1/§3 spec 08: scan ulang resi yang sudah ada di
// manifest INI menandainya "sudah dicek" (state lokal di sisi pemanggil),
// bukan diperlakukan sebagai error.
export async function scanLookupManifest(
	supabase: SupabaseClient,
	manifestId: string,
	resi: string,
): Promise<ScanLookupResult> {
	const { eligible, takenManifest, alreadyInThis } = await findEligibleCandidates(
		supabase,
		manifestId,
		resi,
	);
	const match = eligible.find((p) => p.nomor_resi === resi);
	if (match) return { status: "eligible", pengirimanId: match.id };

	const { data: row } = await supabase
		.from("pengiriman")
		.select("id, milestone")
		.eq("nomor_resi", resi)
		.maybeSingle();

	if (!row) return { status: "rejected", reason: `Resi ${resi} tidak ditemukan` };
	if (alreadyInThis.has(row.id)) return { status: "already_in_this", pengirimanId: row.id };
	if (takenManifest.has(row.id)) {
		return { status: "rejected", reason: `Sudah ada di manifest ${takenManifest.get(row.id)}` };
	}
	return {
		status: "rejected",
		reason: `Status kiriman tidak sesuai (milestone: ${row.milestone})`,
	};
}

// Satu-satunya jalur INSERT manifest_item (Fase 3) — dipanggil baik dari
// klik kandidat search manual maupun dari hasil scan QR. JANGAN insert
// manifest_item langsung di tempat lain.
export async function addManifestItem(
	supabase: SupabaseClient,
	manifestId: string,
	pengirimanId: string,
): Promise<{ error: string | null }> {
	const { count } = await supabase
		.from("manifest_item")
		.select("id", { count: "exact", head: true })
		.eq("manifest_id", manifestId);

	const { error } = await supabase.from("manifest_item").insert({
		manifest_id: manifestId,
		pengiriman_id: pengirimanId,
		urutan: count ?? 0,
	});

	return { error: error?.message ?? null };
}
