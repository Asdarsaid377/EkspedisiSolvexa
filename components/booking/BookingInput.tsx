"use client";

import { forwardRef } from "react";
import { cn } from "@/lib/utils";

// Input filled-style (bg-booking-border, radius-xl) dipakai semua form
// /booking/*. Presentational murni — value/onChange/required/validasi
// tetap 100% dikendalikan oleh halaman pemanggil, komponen ini tidak
// pernah menyimpan state atau memvalidasi apapun sendiri. `error` cuma
// tempat MENAMPILKAN pesan yang sudah divalidasi di tempat lain (pola
// setFormError yang sudah ada) — bukan sumber validasi baru.

interface BookingInputProps
	extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "className"> {
	label?: string;
	error?: string;
	leftIcon?: React.ReactNode;
	rightElement?: React.ReactNode;
	multiline?: false;
	containerClassName?: string;
}

interface BookingTextareaProps
	extends Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, "className"> {
	label?: string;
	error?: string;
	multiline: true;
	containerClassName?: string;
}

const fieldClass =
	"w-full rounded-xl bg-booking-border/60 px-4 py-3.5 text-sm text-booking-text placeholder:text-booking-muted focus:outline-none focus:ring-2 focus:ring-booking-primary/40 disabled:opacity-60 disabled:cursor-not-allowed";

const BookingInput = forwardRef<
	HTMLInputElement | HTMLTextAreaElement,
	BookingInputProps | BookingTextareaProps
>(function BookingInput(props, ref) {
	const { label, error, containerClassName } = props;

	return (
		<div className={containerClassName}>
			{label && (
				<label className="mb-1.5 block text-sm font-medium text-booking-text">
					{label}
				</label>
			)}
			{props.multiline ? (
				(() => {
					const { label, error, containerClassName, multiline, ...rest } =
						props as BookingTextareaProps;
					return (
						<textarea
							{...rest}
							ref={ref as React.Ref<HTMLTextAreaElement>}
							className={cn(fieldClass, "resize-none")}
						/>
					);
				})()
			) : (
				(() => {
					const {
						label,
						error,
						containerClassName,
						leftIcon,
						rightElement,
						multiline,
						...rest
					} = props as BookingInputProps;
					return (
						<div className="relative">
							{leftIcon && (
								<div className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-booking-muted">
									{leftIcon}
								</div>
							)}
							<input
								{...rest}
								ref={ref as React.Ref<HTMLInputElement>}
								className={cn(
									fieldClass,
									leftIcon && "pl-11",
									rightElement && "pr-12",
								)}
							/>
							{rightElement && (
								<div className="absolute right-3 top-1/2 -translate-y-1/2">
									{rightElement}
								</div>
							)}
						</div>
					);
				})()
			)}
			{error && <p className="mt-1.5 text-xs text-red-600">{error}</p>}
		</div>
	);
});

export default BookingInput;
