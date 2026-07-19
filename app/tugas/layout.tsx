"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { LogOut, LayoutDashboard } from "lucide-react";
import Link from "next/link";
import { TUGAS_ROLES } from "@/lib/roles";

// Layout ringan khusus /tugas — TANPA Sidebar, mobile-first. Auth boundary
// terpisah dari /dashboard/layout.tsx (spec 07 KT #1: route terpisah).

export default function TugasLayout({ children }: { children: React.ReactNode }) {
	const { user, profile, role, loading, signOut } = useAuth();
	const router = useRouter();

	useEffect(() => {
		if (loading) return;
		if (!user) {
			router.push("/login");
			return;
		}
		if (!TUGAS_ROLES.includes(role ?? "")) {
			router.push("/dashboard");
		}
	}, [user, role, loading, router]);

	if (loading) {
		return (
			<div className="min-h-screen flex items-center justify-center bg-gray-50">
				<div className="text-center">
					<div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
					<p className="text-gray-500 text-sm">Memuat...</p>
				</div>
			</div>
		);
	}

	if (!user || !TUGAS_ROLES.includes(role ?? "")) return null;

	return (
		<div className="min-h-screen bg-gray-50">
			<header className="sticky top-0 z-40 bg-white border-b border-gray-100 px-4 py-3 flex items-center justify-between">
				<div className="min-w-0">
					<p className="text-sm font-semibold text-gray-900 truncate">
						{profile?.name || "Tugas Saya"}
					</p>
					<Link
						href="/dashboard"
						className="flex items-center gap-1 text-xs text-indigo-600 hover:underline">
						<LayoutDashboard size={11} /> Buka Dashboard Lengkap
					</Link>
				</div>
				<button
					onClick={signOut}
					className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition flex-shrink-0"
					title="Keluar">
					<LogOut size={18} />
				</button>
			</header>
			<main className="max-w-lg mx-auto px-4 py-4">{children}</main>
		</div>
	);
}
