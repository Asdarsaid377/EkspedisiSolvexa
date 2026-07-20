import { SupabaseClient } from "@supabase/supabase-js";

export type AksiLog =
	| "delete_pengiriman"
	| "rollback_pembayaran"
	| "approve_klaim"
	| "tolak_klaim"
	| "edit_setoran_cod"
	| "hapus_setoran_cod"
	| "edit_tarif"
	| "hapus_tarif"
	| "edit_biaya_trip"
	| "hapus_biaya_trip"
	| "konfirmasi_booking"
	| "tolak_booking";

// Dipanggil SETELAH aksi sensitif sukses. Tidak pernah throw — gagal log
// tidak boleh membatalkan aksi utama, cukup console.error (lihat spec 05 §3).
// PENTING: insert TANPA .select() — SELECT aktivitas_log dibatasi
// superadmin/keuangan, jadi RETURNING akan gagal utk role lain (lihat §2 spec).
export async function logAktivitas(
	supabase: SupabaseClient,
	params: {
		aksi: AksiLog;
		entitas: string;
		entitas_id?: string | null;
		ref?: string | null;
		detail?: Record<string, any> | null;
		created_by: string | null | undefined;
	},
) {
	try {
		const { error } = await supabase.from("aktivitas_log").insert({
			aksi: params.aksi,
			entitas: params.entitas,
			entitas_id: params.entitas_id ?? null,
			ref: params.ref ?? null,
			detail: params.detail ?? null,
			created_by: params.created_by ?? null,
		});
		if (error) console.error("Gagal mencatat aktivitas:", error);
	} catch (e) {
		console.error("Gagal mencatat aktivitas:", e);
	}
}
