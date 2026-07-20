import { cn } from "@/lib/utils";

// Wrapper kartu putih radius-16 + soft shadow (pola berulang di semua
// mockup Stitch — section "Informasi Pengirim", kartu ringkasan booking,
// dst). Murni pembungkus visual, tidak menyimpan/mengambil data apapun.

interface BookingCardProps extends React.HTMLAttributes<HTMLDivElement> {
	padded?: boolean;
}

export default function BookingCard({
	padded = true,
	className,
	children,
	...props
}: BookingCardProps) {
	return (
		<div
			{...props}
			className={cn(
				"rounded-2xl bg-white shadow-booking",
				padded && "p-4",
				className,
			)}>
			{children}
		</div>
	);
}
