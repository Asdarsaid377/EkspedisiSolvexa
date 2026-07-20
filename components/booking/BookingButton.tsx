"use client";

import { cn } from "@/lib/utils";

// Komponen presentational murni — TIDAK ADA logic di sini (tidak ada
// fetch, tidak ada validasi). Setiap halaman /booking/* tetap yang
// memanggil onClick/type="submit" seperti biasa; komponen ini cuma
// membungkus tampilan pill sesuai desain Stitch (register.png,
// kirim-paket.png, dst — tombol CTA utama & tombol outline "Google"/
// "Hubungi Kami").

interface BookingButtonProps
	extends React.ButtonHTMLAttributes<HTMLButtonElement> {
	variant?: "primary" | "outline" | "ghost";
	loading?: boolean;
	fullWidth?: boolean;
}

export default function BookingButton({
	variant = "primary",
	loading = false,
	fullWidth = true,
	disabled,
	className,
	children,
	...props
}: BookingButtonProps) {
	return (
		<button
			{...props}
			disabled={disabled || loading}
			className={cn(
				"inline-flex items-center justify-center gap-2 rounded-full px-6 py-3.5 text-sm font-semibold transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60",
				fullWidth && "w-full",
				variant === "primary" &&
					"bg-booking-primary text-white shadow-booking hover:brightness-95",
				variant === "outline" &&
					"border border-booking-border bg-white text-booking-text hover:bg-booking-tint",
				variant === "ghost" &&
					"text-booking-primary hover:bg-booking-tint",
				className,
			)}>
			{loading && (
				<span
					className={cn(
						"h-4 w-4 animate-spin rounded-full border-2",
						variant === "primary"
							? "border-white/40 border-t-white"
							: "border-booking-border border-t-booking-primary",
					)}
				/>
			)}
			{children}
		</button>
	);
}
