import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import * as XLSX from "xlsx";

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}

// Rekap Titipan Tiap Pencairan — referensi koreksi berdasarkan interval bonus kotor.
// Titipan (kolom acuan) = admin + asisten + team, disimpan sebagai koreksi_admin,
// koreksi_asisten, sedekah_mimbar.
export const BONUS_KOREKSI_TABLE: {
	min: number;
	max: number;
	admin: number;
	asisten: number;
	team: number;
}[] = [
	{ min: 300_000, max: 500_000, admin: 25_000, asisten: 25_000, team: 0 },
	{ min: 500_001, max: 750_000, admin: 35_000, asisten: 35_000, team: 0 },
	{
		min: 750_001,
		max: 1_000_000,
		admin: 50_000,
		asisten: 50_000,
		team: 50_000,
	},
	{
		min: 1_000_001,
		max: 1_500_000,
		admin: 60_000,
		asisten: 55_000,
		team: 85_000,
	},
	{
		min: 1_500_001,
		max: 2_000_000,
		admin: 75_000,
		asisten: 70_000,
		team: 105_000,
	},
	{
		min: 2_000_001,
		max: 2_500_000,
		admin: 80_000,
		asisten: 75_000,
		team: 120_000,
	},
	{
		min: 2_500_001,
		max: 3_000_000,
		admin: 100_000,
		asisten: 95_000,
		team: 105_000,
	},
	{
		min: 3_000_001,
		max: 3_500_000,
		admin: 105_000,
		asisten: 100_000,
		team: 130_000,
	},
	{
		min: 3_500_001,
		max: 4_000_000,
		admin: 110_000,
		asisten: 105_000,
		team: 135_000,
	},
	{
		min: 4_000_001,
		max: 4_500_000,
		admin: 130_000,
		asisten: 125_000,
		team: 145_000,
	},
	{
		min: 4_500_001,
		max: 5_000_000,
		admin: 135_000,
		asisten: 130_000,
		team: 160_000,
	},
	{
		min: 5_000_001,
		max: 5_500_000,
		admin: 150_000,
		asisten: 145_000,
		team: 155_000,
	},
	{
		min: 5_500_001,
		max: 6_000_000,
		admin: 155_000,
		asisten: 150_000,
		team: 195_000,
	},
	{
		min: 6_000_001,
		max: 6_500_000,
		admin: 160_000,
		asisten: 155_000,
		team: 210_000,
	},
	{
		min: 6_500_001,
		max: 7_000_000,
		admin: 175_000,
		asisten: 175_000,
		team: 200_000,
	},
	{
		min: 7_000_001,
		max: 7_500_000,
		admin: 200_000,
		asisten: 200_000,
		team: 250_000,
	},
	{
		min: 7_500_001,
		max: 8_000_000,
		admin: 200_000,
		asisten: 200_000,
		team: 250_000,
	},
	{
		min: 8_000_001,
		max: 8_500_000,
		admin: 250_000,
		asisten: 250_000,
		team: 300_000,
	},
	{
		min: 8_500_001,
		max: 9_000_000,
		admin: 250_000,
		asisten: 250_000,
		team: 350_000,
	},
	{
		min: 9_000_001,
		max: 9_500_000,
		admin: 300_000,
		asisten: 300_000,
		team: 300_000,
	},
	{
		min: 9_500_001,
		max: 10_000_000,
		admin: 300_000,
		asisten: 300_000,
		team: 350_000,
	},
	{
		min: 10_000_001,
		max: 10_500_000,
		admin: 350_000,
		asisten: 350_000,
		team: 350_000,
	},
	{
		min: 10_500_001,
		max: 11_000_000,
		admin: 350_000,
		asisten: 350_000,
		team: 450_000,
	},
	{
		min: 11_000_001,
		max: 11_500_000,
		admin: 400_000,
		asisten: 400_000,
		team: 450_000,
	},
	{
		min: 11_500_001,
		max: 12_000_000,
		admin: 450_000,
		asisten: 450_000,
		team: 450_000,
	},
	{
		min: 12_000_001,
		max: 12_500_000,
		admin: 450_000,
		asisten: 450_000,
		team: 550_000,
	},
	{
		min: 12_500_001,
		max: 13_000_000,
		admin: 500_000,
		asisten: 500_000,
		team: 550_000,
	},
	{
		min: 13_000_001,
		max: 13_500_000,
		admin: 550_000,
		asisten: 550_000,
		team: 550_000,
	},
	{
		min: 13_500_001,
		max: 14_000_000,
		admin: 600_000,
		asisten: 600_000,
		team: 550_000,
	},
	{
		min: 14_000_001,
		max: 14_500_000,
		admin: 600_000,
		asisten: 600_000,
		team: 750_000,
	},
	{
		min: 14_500_001,
		max: 15_000_000,
		admin: 650_000,
		asisten: 650_000,
		team: 700_000,
	},
];

export function cariKoreksiOtomatis(totalBonusKotor: number) {
	return (
		BONUS_KOREKSI_TABLE.find(
			(r) => totalBonusKotor >= r.min && totalBonusKotor <= r.max,
		) || null
	);
}

export function formatRupiah(amount: number): string {
	return new Intl.NumberFormat("id-ID", {
		style: "currency",
		currency: "IDR",
		minimumFractionDigits: 0,
		maximumFractionDigits: 0,
	}).format(amount);
}

export function formatDate(date: string): string {
	return new Intl.DateTimeFormat("id-ID", {
		day: "2-digit",
		month: "short",
		year: "numeric",
		hour: "2-digit",
		minute: "2-digit",
	}).format(new Date(date));
}

export function formatDateOnly(date: string): string {
	return new Intl.DateTimeFormat("id-ID", {
		day: "2-digit",
		month: "short",
		year: "numeric",
	}).format(new Date(date));
}

export function waLink(telepon: string): string {
	const digits = telepon.replace(/\D/g, "");
	const normalized = digits.startsWith("62")
		? digits
		: digits.startsWith("0")
			? "62" + digits.slice(1)
			: "62" + digits;
	return `https://wa.me/${normalized}`;
}

const RESI_CHARSET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // exclude O,0,I,1

export function generateNomorResi(): string {
	let code = "";
	const array = new Uint8Array(8);
	crypto.getRandomValues(array);
	for (let i = 0; i < 8; i++) {
		code += RESI_CHARSET[array[i] % RESI_CHARSET.length];
	}
	return `BNG-${code}`;
}

export function exportToExcel(
	filename: string,
	sheetName: string,
	rows: Record<string, any>[],
) {
	const ws = XLSX.utils.json_to_sheet(rows);
	const wb = XLSX.utils.book_new();
	XLSX.utils.book_append_sheet(wb, ws, sheetName);
	XLSX.writeFile(wb, `${filename}.xlsx`);
}

export async function insertPenjualanWithResi(
	supabase: any,
	payload: Record<string, any>,
	maxRetry = 5,
): Promise<{ data: any; error: any }> {
	for (let i = 0; i < maxRetry; i++) {
		const nomor_resi = generateNomorResi();
		const { data, error } = await supabase
			.from("penjualan")
			.insert({ ...payload, nomor_resi })
			.select()
			.single();

		if (!error) return { data, error: null };

		// 23505 = unique_violation — coba resi baru
		if (error.code === "23505" && error.message?.includes("nomor_resi"))
			continue;

		// Error lain langsung return
		return { data: null, error };
	}
	return {
		data: null,
		error: { message: "Gagal generate nomor resi unik setelah 5 percobaan" },
	};
}

export async function insertPengirimanWithResi(
	supabase: any,
	payload: Record<string, any>,
	maxRetry = 5,
): Promise<{ data: any; error: any }> {
	for (let i = 0; i < maxRetry; i++) {
		const nomor_resi = generateNomorResi();
		const { data, error } = await supabase
			.from("pengiriman")
			.insert({ ...payload, nomor_resi })
			.select()
			.single();

		if (!error) return { data, error: null };

		// 23505 = unique_violation — coba resi baru
		if (error.code === "23505" && error.message?.includes("nomor_resi"))
			continue;

		// Error lain langsung return
		return { data: null, error };
	}
	return {
		data: null,
		error: { message: "Gagal generate nomor resi unik setelah 5 percobaan" },
	};
}
