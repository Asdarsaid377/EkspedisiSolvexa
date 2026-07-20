"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Plus_Jakarta_Sans } from "next/font/google";
import { LogOut, Package, Plus, User as UserIcon } from "lucide-react";
import { BookingAuthProvider, useBookingAuth } from "@/contexts/BookingAuthContext";
import { cn } from "@/lib/utils";

// Font khusus /booking/* (redesain Stitch, 20 Jul 2026) — SCOPED ke route
// ini lewat CSS variable, TIDAK menyentuh font global app/layout.tsx yang
// dipakai dashboard/tugas. `--font-booking` dikonsumsi oleh
// `fontFamily.booking` di tailwind.config.js.
const plusJakartaSans = Plus_Jakarta_Sans({
	subsets: ["latin"],
	weight: ["400", "500", "600", "700", "800"],
	variable: "--font-booking",
	fallback: ["Inter", "system-ui", "sans-serif"],
});

// Layout khusus /booking — TANPA Sidebar, mobile-first (pola sama
// app/tugas/layout.tsx), tapi auth boundary-nya beda sumber total: bukan
// Supabase Auth (lihat contexts/BookingAuthContext.tsx). Proteksi di sini
// murni UX (redirect) — benteng keamanan sesungguhnya ada di tiap API
// route (§2/§4.1), bukan di layout ini.
//
// middleware.ts SENGAJA TIDAK didaftarkan untuk /booking — beda dari
// /dashboard & /tugas. updateSession() di situ cuma cek sesi Supabase Auth
// staf; customer booking TIDAK PERNAH punya sesi itu, jadi mendaftarkan
// /booking ke situ akan salah redirect semua pengunjung ke /login (login
// staf) walau mereka customer yang benar-benar sudah login.

const PUBLIC_PATHS = ["/booking/login", "/booking/register"];

function BookingLayoutInner({ children }: { children: React.ReactNode }) {
	const { customer, loading, logout } = useBookingAuth();
	const pathname = usePathname();
	const router = useRouter();
	const isPublicPath = PUBLIC_PATHS.includes(pathname);

	useEffect(() => {
		if (loading) return;
		if (!customer && !isPublicPath) {
			router.push("/booking/login");
			return;
		}
		if (customer && isPublicPath) {
			router.push("/booking");
		}
	}, [customer, loading, isPublicPath, router]);

	if (loading) {
		return (
			<div
				className={cn(
					plusJakartaSans.variable,
					"font-booking min-h-screen flex items-center justify-center bg-gray-50",
				)}>
				<div className="text-center">
					<div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
					<p className="text-gray-500 text-sm">Memuat...</p>
				</div>
			</div>
		);
	}

	// Hindari flash konten yang salah selagi redirect di atas berjalan.
	if (!customer && !isPublicPath) return null;
	if (customer && isPublicPath) return null;

	if (isPublicPath) {
		return (
			<div className={cn(plusJakartaSans.variable, "font-booking")}>
				{children}
			</div>
		);
	}

	return (
		<div className={cn(plusJakartaSans.variable, "font-booking min-h-screen bg-gray-50")}>
			<header className="sticky top-0 z-40 bg-white border-b border-gray-100 px-4 py-3 flex items-center justify-between">
				<div className="min-w-0">
					<p className="text-sm font-semibold text-gray-900 truncate">
						{customer?.nama}
					</p>
					<p className="text-xs text-gray-400 truncate">{customer?.email}</p>
				</div>
				<button
					onClick={async () => {
						await logout();
						router.push("/booking/login");
					}}
					className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition flex-shrink-0"
					title="Keluar">
					<LogOut size={18} />
				</button>
			</header>
			<main className="max-w-lg mx-auto px-4 py-4 pb-24">{children}</main>
			<nav className="fixed bottom-0 inset-x-0 bg-white border-t border-gray-100 flex items-center justify-around py-2 z-40">
				<Link
					href="/booking"
					className="flex flex-col items-center gap-0.5 px-4 py-1 text-gray-500 hover:text-indigo-600">
					<Package size={20} />
					<span className="text-[10px]">Riwayat</span>
				</Link>
				<Link
					href="/booking/baru"
					className="flex flex-col items-center gap-0.5 px-4 py-1 text-gray-500 hover:text-indigo-600">
					<Plus size={20} />
					<span className="text-[10px]">Booking Baru</span>
				</Link>
				<Link
					href="/booking/profil"
					className="flex flex-col items-center gap-0.5 px-4 py-1 text-gray-500 hover:text-indigo-600">
					<UserIcon size={20} />
					<span className="text-[10px]">Profil</span>
				</Link>
			</nav>
		</div>
	);
}

export default function BookingLayout({ children }: { children: React.ReactNode }) {
	return (
		<BookingAuthProvider>
			<BookingLayoutInner>{children}</BookingLayoutInner>
		</BookingAuthProvider>
	);
}
