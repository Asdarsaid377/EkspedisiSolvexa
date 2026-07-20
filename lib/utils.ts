import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import * as XLSX from "xlsx";

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
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
