import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@supabase/supabase-js";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const supabase = createClient(
	process.env.NEXT_PUBLIC_SUPABASE_URL!,
	process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

// ============ KONFIGURASI ============
const MAX_PESAN_PER_JAM = 20; // rate limit per sesi
const MAX_PANJANG_PESAN = 150; // karakter
const MAX_TOOL_LOOP = 3;

const SYSTEM_PROMPT = `Kamu adalah customer service BungaNaik, toko furniture no. 1 di Makassar (katalog: https://bunganaik.solvexaerp.tech/toko dan https://bunganaik.solvexaerp.tech/etalase).

Tugasmu: jawab pertanyaan calon pembeli dengan ramah, singkat, dan jelas dalam Bahasa Indonesia. Maksimal 3-4 kalimat, tanpa format markdown.

GAYA BAHASA (dialek Makassar, secukupnya):
- Sapaan pembuka: "Iye' kak" / "Siap kak" / "Tabe' kak" (tabe' khusus kabar kurang enak/koreksi).
- Partikel: ji (hanya/pelunak), mi (sudah/penegas), ki (sapaan halus di akhir kata kerja: "chat ki", "mau ki"), ta' (milik Anda), pi (nanti/baru), iye' (selalu, jangan "iya").
- Maksimal 2-3 partikel per kalimat — natural, bukan parodi. Harga, angka aturan (DP 25%, tempo 3/6/9/12 bulan), dan link tetap baku dan jelas.
- Jangan pakai kata kasar; jangan mengarang info; jangan menjanjikan kirim foto (arahkan ke katalog).
- Kamu bertugas mengedampankan membangun emosional positif ke customer untuk tujuan emosional selling

CONTOH POLA (ikuti gayanya, isi jawaban selalu dari aturan & hasil tool):
P: "Kasur 160x200 ada?"
J: [panggil cek_stok_produk dulu] "Iye' kak, adaji kasur 160x200 — [nama produk] tersedia ji, harganya Rp X. Mau ki dibantu checkout?"

P: "Divan pink masih ada?"
J: [hasil tool: stok 0] "Tabe' kak, divan pink lagi kosong stoknya. Tapi bisaji dipesan lewat PO — produksi sekitar 7 hari ji, DP 25%. Mau ki?"

P: "Bisa nego?"
J: "Tabe' kak, kalau harga saya tidak bisa bantu nego. Langsung ki chat tim CS di 0821447715 dan 082335439635, siapa tahu ada penawaran."

P: "Ada garansi?"
J: "Tabe' kak, produk kami tidak ada garansi. Tapi kalau ada kendala unit, bisaji ajukan komplain di halaman detail resi ta' untuk perbaikan atau penukaran unit."

P: "Terima kasih"
J: "Sama-sama kak. Kalau ada lagi mau ditanyakan, chat ki saja disini, saya siap bantu ki."

P: "Saya pikir-pikir dulu"
J: "Siap kak, tidak apa-apa ji. Kalau sudahmi cocok, kabari ki saja."

TOKO & CARA PESAN:
- BungaNaik toko furniture no 1 di makassar yang beralamat di Alamat: Jl. Tamangapa Raya No. 51 Depan Alfamart, pas depan gerbang jalur dua masuk perumahan dosen Unhas, samping gerbang perumahan Gapura jingga, Bangkala, Kec. Manggala, Kota Makassar, Sulawesi Selatan 90235.
- Cara pesan: pilih produk di katalog → masukkan keranjang → checkout via WhatsApp.

ONGKIR & PENGIRIMAN:
- Khusus area Makassar: GRATIS ONGKIR.
- Barang ready stock dalam kota Makassar: bisa dikirim instant/sameday.
- Di luar Makassar: ongkir dan estimasi ditanyakan langsung ke tim CS via WhatsApp — jangan menebak angka ongkir.

PEMBAYARAN & CICILAN:
- Metode: Transfer Bank, COD (area tertentu), atau cicilan.
- Cicilan: DP minimal 25% dari harga, tempo pelunasan pilihan 3, 6, 9, atau 12 bulan.
- Jika ditanya apakah barang dikirim setelah DP atau setelah lunas: arahkan ke tim CS, jangan menjawab sendiri.

CUSTOM / PO:
- Kirim detail (ukuran, bahan, jumlah, desain) via WhatsApp, tim akan buatkan Purchase Order.
- Waktu produksi sekitar 7 hari setelah barang di-keep/di-PO, DP minimal 25%.

GARANSI, KOMPLAIN & RETUR:
- Tidak ada garansi produk.
- Komplain diajukan lewat website pada halaman detail resi pesanan.
- Pastikan barang diterima dalam kondisi baik dan lengkap saat serah terima. Barang yang sudah diterima dan dicek TIDAK bisa dikembalikan.
- Komplain hanya untuk perbaikan unit atau penukaran unit — TIDAK ada pengembalian uang. Sampaikan aturan ini apa adanya, jangan menjanjikan refund.

TOOLS:
- Selalu pakai tool cek_stok_produk saat ditanya stok/harga/ketersediaan — jangan pernah menebak.
- Pakai tool cek_resi saat pelanggan menanyakan status pesanan/pengiriman dengan nomor resi (format BNG-XXXXXXXX). Jika pelanggan tidak menyebut nomor resi, minta nomornya dulu.
- Pelanggan sering typo nama barang (mis. "dipan" untuk divan, "sopa" untuk sofa) — tetap carikan, dan boleh tawarkan produk lain dalam kategori yang sama bila nama persisnya tidak ketemu.
- Bedakan tiga kondisi hasil cek stok: "stok habis" (produk ada tapi stok 0), "tidak terdaftar di katalog", dan "error sistem" — jangan pernah menyebut stok habis kecuali tool secara eksplisit mengatakan stok habis.

ESKALASI:
- Jika tidak yakin, di luar topik toko, atau pelanggan minta hal yang tidak bisa kamu proses (nego harga, ubah pesanan, komplain aktif): arahkan ke tim CS WhatsApp 0821447715 dan 082335439635. Jam layanan CS: Senin–Minggu 08.00–18.00 WITA. Chat AI ini aktif 24 jam.
- Jangan pernah menyebut harga modal, margin, atau data internal. Jangan menyebut jumlah unit stok persis — cukup "tersedia" atau "stok habis".`;

// ============ TOOLS ============
const TOOLS: Anthropic.Tool[] = [
	{
		name: "cek_stok_produk",
		description:
			"Cek stok dan harga produk BungaNaik berdasarkan nama produk atau kategori (boleh sebagian nama, tidak case-sensitive). Gunakan setiap kali pelanggan menanyakan ketersediaan, stok, atau harga produk.",
		input_schema: {
			type: "object",
			properties: {
				query: {
					type: "string",
					description: "Nama produk, sebagian nama, atau kategori yang dicari",
				},
			},
			required: ["query"],
		},
		cache_control: { type: "ephemeral" }, // cache breakpoint di tool terakhir
	},
	{
		name: "cek_resi",
		description:
			"Cek status pesanan berdasarkan nomor resi (format BNG-XXXXXXXX). Gunakan saat pelanggan menanyakan status atau posisi pesanannya.",
		input_schema: {
			type: "object",
			properties: {
				nomor: {
					type: "string",
					description: "Nomor resi pesanan, contoh BNG-A1B2C3D4",
				},
			},
			required: ["nomor"],
		},
	},
];

// ============ HANDLER TOOLS ============
const ALIAS: Record<string, string> = {
	dipan: "divan",
	sopa: "sofa",
};

function normalisasi(q: string): string {
	return q
		.toLowerCase()
		.replace(/[,().%]/g, " ") // buang karakter yang merusak sintaks filter or()
		.split(/\s+/)
		.filter(Boolean)
		.map((w) => ALIAS[w] ?? w)
		.join(" ");
}

function hargaPublik(hargaKatalog: number): string {
	const h = Math.ceil((hargaKatalog * 1.25) / 1000) * 1000;
	return "Rp " + h.toLocaleString("id-ID");
}

async function cekStokProduk(query: string): Promise<string> {
	const q = normalisasi(query);
	if (!q) return "Kata kunci pencarian kosong.";

	const { data, error } = await supabase
		.from("produk")
		.select("nama, stok, harga_katalog, kategori")
		.eq("aktif", true)
		.or(`nama.ilike.%${q}%,kategori.ilike.%${q}%`)
		.limit(15);

	console.log("cekStokProduk:", {
		q,
		error: error?.message,
		jumlah: data?.length,
		data,
	});

	if (error) {
		console.error("cekStokProduk error:", error.message);
		return "TERJADI ERROR SISTEM saat cek katalog (bukan stok habis). Sampaikan ke pelanggan sedang ada kendala teknis dan arahkan ke tim CS WhatsApp.";
	}
	if (!data || data.length === 0) {
		return `Produk "${query}" TIDAK TERDAFTAR di katalog (bukan stok habis). Tawarkan cek katalog /toko atau tanya CS.`;
	}
	return data
		.map(
			(p) =>
				`${p.nama}: ${
					p.stok > 0
						? "tersedia"
						: "stok kosong, tapi BISA DIPESAN via PO — produksi ±7 hari, DP 25%"
				}, harga ${hargaPublik(p.harga_katalog)}`,
		)
		.join("; ");
}

const LABEL_MILESTONE: Record<string, string> = {
	diproses: "sedang diproses",
	diproduksi: "sedang diproduksi",
	dikirim: "dalam pengiriman",
	selesai: "sudah diterima/selesai",
};

async function cekResi(nomor: string): Promise<string> {
	const resi = nomor.trim().toUpperCase();
	if (!/^BNG-[A-Z0-9]{8}$/.test(resi)) {
		return "Format nomor resi tidak valid. Minta pelanggan cek kembali nomornya (format BNG-XXXXXXXX).";
	}
	const { data, error } = await supabase
		.from("penjualan")
		.select("nomor_resi, milestone")
		.eq("nomor_resi", resi)
		.maybeSingle();

	if (error)
		return "Terjadi kendala saat mengecek resi. Arahkan pelanggan ke tim CS.";
	if (!data)
		return `Nomor resi ${resi} tidak ditemukan. Minta pelanggan memastikan nomornya benar.`;
	return `Pesanan ${resi}: status ${
		LABEL_MILESTONE[data.milestone] ?? data.milestone
	}. Detail lengkap dan riwayat foto: https://bunganaik.solvexaerp.tech/resi/${resi}`;
}

// ============ SESI & RATE LIMIT ============
type HistoryMsg = { role: "user" | "assistant"; content: string };

async function getOrCreateSession(sessionKey: string): Promise<string> {
	const { data: existing } = await supabase
		.from("chat_ai_sessions")
		.select("id")
		.eq("session_key", sessionKey)
		.maybeSingle();

	if (existing) return existing.id;

	const { data: created, error } = await supabase
		.from("chat_ai_sessions")
		.insert({ session_key: sessionKey })
		.select("id")
		.single();

	if (error || !created)
		throw new Error(error?.message || "Gagal membuat sesi chat");
	return created.id;
}

async function cekRateLimit(sessionId: string): Promise<boolean> {
	const sejamLalu = new Date(Date.now() - 3600_000).toISOString();
	const { count } = await supabase
		.from("chat_ai_messages")
		.select("id", { count: "exact", head: true })
		.eq("session_id", sessionId)
		.eq("role", "user")
		.gte("created_at", sejamLalu);

	return (count ?? 0) < MAX_PESAN_PER_JAM;
}

// ============ ROUTE ============
export async function POST(req: NextRequest) {
	try {
		const { sessionKey, message } = await req.json();

		if (
			typeof sessionKey !== "string" ||
			!sessionKey ||
			typeof message !== "string" ||
			!message.trim()
		) {
			return NextResponse.json(
				{ error: "sessionKey dan message wajib diisi" },
				{ status: 400 },
			);
		}

		if (message.length > MAX_PANJANG_PESAN) {
			return NextResponse.json({
				reply:
					"Pesan terlalu panjang. Mohon ringkas pertanyaannya ya, atau lanjut chat dengan tim CS kami via WhatsApp di 0896-3008-5814.",
			});
		}

		const sessionId = await getOrCreateSession(sessionKey);

		// rate limit per sesi per jam
		const boleh = await cekRateLimit(sessionId);
		if (!boleh) {
			return NextResponse.json({
				reply:
					"Sesi chat sudah mencapai batas untuk sementara. Silakan lanjut chat dengan tim CS kami via WhatsApp di https://wa.me/6289630085814 ya 😊",
			});
		}

		const { data: history } = await supabase
			.from("chat_ai_messages")
			.select("role, content")
			.eq("session_id", sessionId)
			.order("created_at", { ascending: false }) // ambil yang TERBARU
			.limit(8);

		const riwayat = ((history as HistoryMsg[] | null) ?? []).reverse();

		await supabase.from("chat_ai_messages").insert({
			session_id: sessionId,
			role: "user",
			content: message,
		});

		const messages: Anthropic.MessageParam[] = [
			...((history as HistoryMsg[] | null) ?? []).map((h) => ({
				role: h.role,
				content: h.content,
			})),
			{ role: "user", content: message },
		];

		let reply = "";
		for (let i = 0; i < MAX_TOOL_LOOP; i++) {
			const response = await anthropic.messages.create({
				model: "claude-haiku-4-5",
				max_tokens: 1024,
				// prompt caching: system prompt + tools di-cache, hemat ~90% di request berikutnya
				system: [
					{
						type: "text",
						text: SYSTEM_PROMPT,
						cache_control: { type: "ephemeral" },
					},
				],
				tools: TOOLS,
				messages,
			});

			if (response.stop_reason !== "tool_use") {
				const textBlock = response.content.find((b) => b.type === "text");
				reply = textBlock?.type === "text" ? textBlock.text : "";
				break;
			}
			// setelah dapat reply final
			await supabase.from("chat_ai_usage").insert({
				session_id: sessionId,
				input_tokens: response.usage.input_tokens,
				output_tokens: response.usage.output_tokens,
				cache_read: response.usage.cache_read_input_tokens ?? 0,
			});

			messages.push({ role: "assistant", content: response.content });

			const toolResults: Anthropic.ToolResultBlockParam[] = [];
			for (const block of response.content) {
				if (block.type !== "tool_use") continue;

				let result = "Tool tidak dikenali.";
				if (block.name === "cek_stok_produk") {
					const query = (block.input as { query?: string }).query || "";
					result = await cekStokProduk(query);
				} else if (block.name === "cek_resi") {
					const nomor = (block.input as { nomor?: string }).nomor || "";
					result = await cekResi(nomor);
				}
				toolResults.push({
					type: "tool_result",
					tool_use_id: block.id,
					content: result,
				});
			}
			messages.push({ role: "user", content: toolResults });
		}

		if (!reply) {
			reply =
				"Maaf, saya belum bisa menjawab pertanyaan ini sekarang. Silakan lanjut chat dengan tim CS kami via WhatsApp di https://wa.me/6289630085814 ya.";
		}

		await supabase.from("chat_ai_messages").insert({
			session_id: sessionId,
			role: "assistant",
			content: reply,
		});

		return NextResponse.json({ reply });
	} catch (err) {
		console.error("chat-ai error:", err);
		const detail = err instanceof Error ? err.message : String(err);
		return NextResponse.json(
			{
				error: "Terjadi kesalahan pada server. Silakan coba lagi.",
				...(process.env.NODE_ENV !== "production" ? { detail } : {}),
			},
			{ status: 500 },
		);
	}
}
