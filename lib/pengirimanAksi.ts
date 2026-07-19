import { SupabaseClient } from "@supabase/supabase-js";
import { AlasanGagal } from "./types";

// Logika bersama aksi Gagal Kirim & Selesai (POD) — dipakai
// /dashboard/pengiriman/[id] (spec 01) DAN /tugas (spec 07). JANGAN
// duplikasi jadi implementasi terpisah di masing-masing halaman — kalau
// aturan bisnis berubah (mis. validasi wajib), cukup ubah di sini.

export interface AksiResult {
  ok: boolean;
  error?: string;
  fotoUrl?: string;
}

export interface GagalKirimParams {
  pengirimanId: string;
  jumlahGagalSebelum: number;
  alasan: AlasanGagal | "";
  catatan: string;
  fotoFile: File | null;
  createdBy: string | null | undefined;
}

// Transisi dikirim -> gagal_kirim. Alasan WAJIB (5 pilihan spec 01) —
// jangan dilonggarkan. Increment jumlah_gagal +1 (counter kejadian, bukan
// status akhir — lihat CLAUDE.md §Gagal Kirim, Retur & POD).
export async function submitGagalKirim(
  supabase: SupabaseClient,
  params: GagalKirimParams,
): Promise<AksiResult> {
  const { pengirimanId, jumlahGagalSebelum, alasan, catatan, fotoFile, createdBy } = params;

  if (!alasan) {
    return { ok: false, error: "Alasan gagal wajib dipilih." };
  }

  let foto_url: string | null = null;
  if (fotoFile) {
    const ext = fotoFile.name.split(".").pop();
    const path = `pengiriman-tracking/${pengirimanId}/${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage
      .from("BungaNaik")
      .upload(path, fotoFile);
    if (upErr) {
      return { ok: false, error: "Gagal upload foto: " + upErr.message };
    }
    const { data: urlData } = supabase.storage
      .from("BungaNaik")
      .getPublicUrl(path);
    foto_url = urlData.publicUrl;
  }

  await supabase.from("pengiriman_tracking").insert({
    pengiriman_id: pengirimanId,
    milestone: "gagal_kirim",
    alasan_gagal: alasan,
    catatan: catatan.trim() || null,
    foto_url,
    created_by: createdBy,
  });

  await supabase
    .from("pengiriman")
    .update({
      milestone: "gagal_kirim",
      jumlah_gagal: (jumlahGagalSebelum || 0) + 1,
    })
    .eq("id", pengirimanId);

  return { ok: true, fotoUrl: foto_url ?? undefined };
}

export interface SelesaiPodParams {
  pengirimanId: string;
  podNama: string;
  podCatatan: string;
  podFotoFile: File | null;
  createdBy: string | null | undefined;
}

// Transisi dikirim -> selesai. POD (nama penerima aktual min. 2 karakter +
// foto) WAJIB — jangan dilonggarkan. Di-enforce app-level (bukan DB
// CHECK), lihat CLAUDE.md §Known Issues #15.
export async function submitSelesaiPOD(
  supabase: SupabaseClient,
  params: SelesaiPodParams,
): Promise<AksiResult> {
  const { pengirimanId, podNama, podCatatan, podFotoFile, createdBy } = params;

  if (podNama.trim().length < 2) {
    return { ok: false, error: "Nama penerima wajib diisi (minimal 2 karakter)." };
  }
  if (!podFotoFile) {
    return { ok: false, error: "Foto bukti serah terima (POD) wajib diupload." };
  }

  const ext = podFotoFile.name.split(".").pop();
  const path = `pengiriman-tracking/${pengirimanId}/${Date.now()}.${ext}`;
  const { error: upErr } = await supabase.storage
    .from("BungaNaik")
    .upload(path, podFotoFile);
  if (upErr) {
    return { ok: false, error: "Gagal upload foto: " + upErr.message };
  }
  const { data: urlData } = supabase.storage
    .from("BungaNaik")
    .getPublicUrl(path);
  const foto_url = urlData.publicUrl;

  await supabase.from("pengiriman_tracking").insert({
    pengiriman_id: pengirimanId,
    milestone: "selesai",
    catatan: podCatatan.trim() || null,
    foto_url,
    created_by: createdBy,
  });

  await supabase
    .from("pengiriman")
    .update({
      milestone: "selesai",
      pod_penerima_nama: podNama.trim(),
      pod_foto_url: foto_url,
    })
    .eq("id", pengirimanId);

  return { ok: true, fotoUrl: foto_url };
}
