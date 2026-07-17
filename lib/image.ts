const OBJECT_PATH = "/storage/v1/object/public/";
const RENDER_PATH = "/storage/v1/render/image/public/";

/**
 * Ubah URL foto Supabase Storage jadi URL hasil transformasi imgproxy
 * (resize + compress + auto webp/avif via Accept header).
 * URL non-Supabase (mis. sudah placeholder) dikembalikan apa adanya.
 */
export function imgUrl(url: string | null | undefined, width?: number, quality = 60): string {
	if (!url) return "";
	if (!url.includes(OBJECT_PATH)) return url;
	const transformed = url.replace(OBJECT_PATH, RENDER_PATH);
	const sep = transformed.includes("?") ? "&" : "?";
	// Tanpa width: resolusi asli dipertahankan (dipakai utk foto detail produk
	// yang mau ditampilkan sebagus mungkin), tapi tetap dikompres ulang lewat
	// imgproxy (quality + auto webp/avif) jadi tidak sebesar file upload asli.
	if (!width) return `${transformed}${sep}quality=${quality}`;
	// resize=contain (bukan default "cover") — tanpa height, default endpoint
	// tetap cover dan memaksa crop persegi duluan sebelum CSS object-cover
	// meng-crop lagi (double-crop/kelihatan di-zoom), terutama di container
	// yang bukan aspect-square (mis. /katalog yang h-44 tapi lebar dinamis).
	// contain = gambar di-scale utuh tanpa dipotong sama sekali, crop
	// sepenuhnya diserahkan ke CSS object-cover di tiap halaman.
	return `${transformed}${sep}width=${width}&quality=${quality}&resize=contain`;
}

/**
 * Download foto ke device pengguna (bukan cuma buka tab baru). Selalu pakai
 * URL ASLI (bukan hasil imgUrl()) supaya file yang tersimpan kualitas penuh.
 */
export async function downloadImage(url: string, filename: string) {
	try {
		const res = await fetch(url);
		if (!res.ok) throw new Error("fetch gagal");
		const blob = await res.blob();
		const objectUrl = URL.createObjectURL(blob);
		const a = document.createElement("a");
		a.href = objectUrl;
		a.download = filename;
		document.body.appendChild(a);
		a.click();
		a.remove();
		URL.revokeObjectURL(objectUrl);
	} catch {
		// Fallback kalau fetch gagal (mis. CORS belum diizinkan di server) —
		// minimal tetap bisa dibuka lalu disimpan manual oleh pengguna.
		window.open(url, "_blank");
	}
}

/** Nama file unduhan dari nama produk + urutan foto, ekstensi ikut URL asli. */
export function downloadFilename(namaProduk: string, url: string, index = 0): string {
	const ext = url.split(".").pop()?.split("?")[0]?.slice(0, 4) || "jpg";
	const slug = namaProduk
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/(^-|-$)/g, "");
	return `${slug || "produk"}-${index + 1}.${ext}`;
}
