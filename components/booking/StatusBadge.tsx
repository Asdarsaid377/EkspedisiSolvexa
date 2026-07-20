import { Check, Clock, X } from "lucide-react";
import type { BookingStatus } from "@/lib/types";

// Satu sumber label+warna status booking_request untuk semua halaman
// /booking/*. Label sengaja identik dengan yang sudah dipakai
// app/booking/page.tsx sebelum restyling — cuma tampilannya yang baru.

const CFG: Record<BookingStatus, { label: string; className: string; icon: any }> = {
	pending: {
		label: "Menunggu Konfirmasi",
		className: "bg-amber-100 text-amber-700",
		icon: Clock,
	},
	dikonfirmasi: {
		label: "Dikonfirmasi",
		className: "bg-green-100 text-green-700",
		icon: Check,
	},
	ditolak: {
		label: "Ditolak",
		className: "bg-red-100 text-red-700",
		icon: X,
	},
};

export default function StatusBadge({ status }: { status: BookingStatus }) {
	const cfg = CFG[status];
	const Icon = cfg.icon;
	return (
		<span
			className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${cfg.className}`}>
			<Icon size={12} strokeWidth={3} />
			{cfg.label}
		</span>
	);
}
