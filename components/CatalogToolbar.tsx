"use client";

import { useState } from "react";
import {
	ChevronDown,
	SlidersHorizontal,
	Tag,
	Grid2X2,
	Grid3X3,
	LayoutGrid,
} from "lucide-react";
import { cn } from "@/lib/utils";

export type CatalogSortBy = "nama" | "harga_asc" | "harga_desc";
export type CatalogGridCols = 2 | 3 | 4;

const SORT_OPTIONS: { value: CatalogSortBy; label: string }[] = [
	{ value: "nama", label: "Nama A–Z" },
	{ value: "harga_asc", label: "Harga Terendah" },
	{ value: "harga_desc", label: "Harga Tertinggi" },
];

const GRID_OPTIONS: {
	value: CatalogGridCols;
	icon: typeof Grid2X2;
	label: string;
}[] = [
	{ value: 2, icon: Grid2X2, label: "2 kolom" },
	{ value: 3, icon: Grid3X3, label: "3 kolom" },
	{ value: 4, icon: LayoutGrid, label: "4 kolom" },
];

// Kelas grid dibuat generik (tidak terikat lebar kontainer per halaman) supaya
// satu sumber kebenaran ini bisa dipakai konsisten di /katalog, /toko, /etalase
export const GRID_COLS_CLASS: Record<CatalogGridCols, string> = {
	2: "grid-cols-2",
	3: "grid-cols-2 sm:grid-cols-3",
	4: "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4",
};

// Sort berdasarkan harga_katalog (basis harga mentah) — valid untuk /toko & /etalase
// juga karena harga tampil di sana adalah transformasi naik-monoton (× konstanta,
// dibulatkan ke atas) dari harga_katalog, jadi urutannya tetap sama.
export function sortProdukByHarga<
	T extends { nama: string; harga_katalog: number },
>(list: T[], sortBy: CatalogSortBy): T[] {
	if (sortBy === "harga_asc")
		return [...list].sort((a, b) => a.harga_katalog - b.harga_katalog);
	if (sortBy === "harga_desc")
		return [...list].sort((a, b) => b.harga_katalog - a.harga_katalog);
	return [...list].sort((a, b) => a.nama.localeCompare(b.nama));
}

const ACCENT_TEXT: Record<"indigo" | "amber", string> = {
	indigo: "text-indigo-600 font-semibold",
	amber: "text-amber-600 font-semibold",
};

const ACCENT_ACTIVE_CHIP: Record<"indigo" | "amber", string> = {
	indigo: "bg-indigo-600 text-white shadow-sm",
	amber: "bg-amber-500 text-white shadow-sm",
};

// Dropdown generik dengan gaya seragam — dipakai untuk Kategori & Urutkan
function ToolbarDropdown({
	label,
	icon: Icon,
	options,
	activeValue,
	onChange,
	accent,
	align = "left",
}: {
	label: string;
	icon: typeof Tag;
	options: { value: string; label: string }[];
	activeValue: string;
	onChange: (v: string) => void;
	accent: "indigo" | "amber";
	align?: "left" | "right";
}) {
	const [open, setOpen] = useState(false);
	const activeLabel =
		options.find((o) => o.value === activeValue)?.label ?? label;

	return (
		<div className="relative">
			<button
				onClick={() => setOpen(!open)}
				className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 rounded-full text-xs font-medium text-gray-600 hover:bg-gray-50 transition max-w-[160px]">
				<Icon size={12} className="flex-shrink-0" />
				<span className="truncate">{activeLabel}</span>
				<ChevronDown
					size={12}
					className={cn("flex-shrink-0 transition", open && "rotate-180")}
				/>
			</button>
			{open && (
				<>
					<div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
					<div
						className={cn(
							"absolute top-8 z-20 bg-white border border-gray-200 rounded-xl shadow-lg py-1 w-48 max-h-64 overflow-y-auto text-sm",
							align === "right" ? "right-0" : "left-0",
						)}>
						{options.map((opt) => (
							<button
								key={opt.value}
								onClick={() => {
									onChange(opt.value);
									setOpen(false);
								}}
								className={cn(
									"w-full text-left px-4 py-2 hover:bg-gray-50 transition truncate",
									activeValue === opt.value
										? ACCENT_TEXT[accent]
										: "text-gray-700",
								)}>
								{activeValue === opt.value && "✓ "}
								{opt.label}
							</button>
						))}
					</div>
				</>
			)}
		</div>
	);
}

export default function CatalogToolbar({
	kategoriOptions,
	activeKategori,
	onKategoriChange,
	sortBy,
	onSortChange,
	gridCols,
	onGridColsChange,
	accent = "indigo",
}: {
	kategoriOptions: string[];
	activeKategori: string;
	onKategoriChange: (v: string) => void;
	sortBy: CatalogSortBy;
	onSortChange: (v: CatalogSortBy) => void;
	gridCols: CatalogGridCols;
	onGridColsChange: (v: CatalogGridCols) => void;
	accent?: "indigo" | "amber";
}) {
	return (
		<div className="flex items-center justify-between gap-2 flex-wrap">
			{/* Kategori dropdown */}
			<ToolbarDropdown
				label="Kategori"
				icon={Tag}
				options={kategoriOptions.map((k) => ({ value: k, label: k }))}
				activeValue={activeKategori}
				onChange={onKategoriChange}
				accent={accent}
				align="left"
			/>

			<div className="flex items-center gap-2 flex-shrink-0">
				{/* Grid density toggle */}
				<div className="flex items-center gap-0.5 bg-gray-100 rounded-full p-1">
					{GRID_OPTIONS.map((opt) => (
						<button
							key={opt.value}
							onClick={() => onGridColsChange(opt.value)}
							title={opt.label}
							aria-label={opt.label}
							className={cn(
								"w-7 h-7 flex items-center justify-center rounded-full transition",
								gridCols === opt.value
									? ACCENT_ACTIVE_CHIP[accent]
									: "text-gray-400 hover:text-gray-600",
							)}>
							<opt.icon size={14} />
						</button>
					))}
				</div>

				{/* Sort dropdown */}
				<ToolbarDropdown
					label="Urutkan"
					icon={SlidersHorizontal}
					options={SORT_OPTIONS.map((o) => ({
						value: o.value,
						label: o.label,
					}))}
					activeValue={sortBy}
					onChange={(v) => onSortChange(v as CatalogSortBy)}
					accent={accent}
					align="right"
				/>
			</div>
		</div>
	);
}
