"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { createClient } from "@/lib/supabase/client";
import {
	LayoutDashboard,
	Package,
	Users,
	BarChart2,
	Clock,
	LogOut,
	ChevronRight,
	ChevronDown,
	Settings,
	Menu,
	X,
	Wallet,
	TrendingUp,
	Receipt,
	ClipboardList,
	Truck,
	ScanFace,
	Navigation,
	PackageCheck,
	DollarSign,
	ShieldAlert,
	Building2,
	Inbox,
} from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

const navItems = [
	{
		href: "/dashboard",
		label: "Dashboard",
		icon: LayoutDashboard,
		roles: ["superadmin", "keuangan", "kasir"],
	},
	{
		href: "/dashboard/absensi",
		label: "Absensi",
		icon: ScanFace,
		roles: [
			"superadmin",
			"kasir",
			"keuangan",
			"cs",
			"gudang",
			"kurir",
			"sopir",
		],
	},
];

// Grup "Operasional Armada" — GPS live sopir/kurir + manajemen armada + manifest (Fase 3).
// Nama section sengaja dibedakan dari nav flat "Pengiriman" (Fase 1) biar tidak rancu.
const pengirimanItems = [
	{
		href: "/dashboard/lacak-pengiriman",
		label: "Lacak GPS Sopir",
		icon: Navigation,
		roles: ["superadmin", "cs", "gudang", "kurir"],
	},
	{
		href: "/dashboard/armada",
		label: "Armada",
		icon: Truck,
		roles: ["superadmin", "gudang"],
	},
	{
		href: "/dashboard/manifest",
		label: "Manifest",
		icon: ClipboardList,
		roles: [
			"superadmin",
			"gudang",
			"sopir",
			"kurir",
			"cs",
			"keuangan",
			"kasir",
		],
	},
];

// Grup "COD & Klaim" (Fase 4) — ledger setoran COD per sopir/kurir + proses klaim barang hilang/rusak
const codKlaimItems = [
	{
		href: "/dashboard/cod",
		label: "Setoran COD",
		icon: Wallet,
		roles: ["superadmin", "keuangan", "kasir", "gudang", "kurir", "sopir"],
	},
	{
		href: "/dashboard/klaim",
		label: "Klaim",
		icon: ShieldAlert,
		roles: ["superadmin", "keuangan", "cs", "gudang", "kurir", "sopir"],
	},
];

// Entitas Pengiriman (Fase 1) — order/resi/tracking, pengganti Penjualan+Produk furniture
const pengirimanEntitasItems = [
	{
		href: "/dashboard/pengiriman",
		label: "Pengiriman",
		icon: PackageCheck,
		roles: [
			"superadmin",
			"cs",
			"kasir",
			"keuangan",
			"gudang",
			"kurir",
			"sopir",
		],
	},
	{
		href: "/dashboard/customer",
		label: "Customer",
		icon: Users,
		roles: ["superadmin", "cs", "kasir", "keuangan"],
	},
	{
		// Booking mandiri (spec 10) — sama role dengan CRUD customer (§5).
		href: "/dashboard/booking",
		label: "Booking Masuk",
		icon: Inbox,
		roles: ["superadmin", "cs", "kasir", "keuangan"],
	},
];

// Grup Keuangan — "Meja Kerja Keuangan" sengaja tidak dimasukkan (18 Jul 2026,
// atas permintaan eksplisit), hanya Laporan Keuangan + Pengeluaran (spec 06)
const keuanganItems = [
	{
		href: "/dashboard/keuangan/laporan",
		label: "Laporan Keuangan",
		icon: TrendingUp,
	},
	{
		href: "/dashboard/keuangan/pengeluaran",
		label: "Pengeluaran",
		icon: Receipt,
	},
];

const laporanItems = [
	{ href: "/dashboard/laporan/sopir", label: "Laporan Petugas", icon: Truck },
	{
		href: "/dashboard/piutang",
		label: "Piutang",
		icon: Receipt,
	},
	{
		href: "/dashboard/laporan/keterlambatan",
		label: "Keterlambatan",
		icon: Clock,
	},
	{
		href: "/dashboard/laporan/laba-trip",
		label: "Laba per Trip",
		icon: TrendingUp,
	},
];

const adminItems = [
	{ href: "/dashboard/pengguna", label: "Pengguna", icon: Settings },
	{ href: "/dashboard/tarif-zona", label: "Tarif Zona", icon: DollarSign },
	{ href: "/dashboard/cabang", label: "Cabang", icon: Building2 },
];

// Didefinisikan di luar komponen agar referensi fungsi stabil — cegah unmount/remount tiap re-render
function NavLink({
	href,
	label,
	icon: Icon,
	pathname,
	onClose,
	badge,
}: {
	href: string;
	label: string;
	icon: any;
	pathname: string;
	onClose: () => void;
	badge?: number;
}) {
	const active =
		pathname === href || (href !== "/dashboard" && pathname.startsWith(href));
	return (
		<Link
			href={href}
			onClick={onClose}
			className={cn(
				"flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all",
				active
					? "bg-indigo-600 text-white shadow-sm"
					: "text-gray-600 hover:bg-gray-100 hover:text-gray-900",
			)}>
			<Icon size={18} />
			{label}
			{!!badge && (
				<span className="ml-auto bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
					{badge}
				</span>
			)}
			{active && !badge && <ChevronRight size={14} className="ml-auto" />}
		</Link>
	);
}

function SubNavLink({
	href,
	label,
	icon: Icon,
	pathname,
	onClose,
}: {
	href: string;
	label: string;
	icon: any;
	pathname: string;
	onClose: () => void;
}) {
	const active = pathname === href;
	return (
		<Link
			href={href}
			onClick={onClose}
			className={cn(
				"flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-all",
				active
					? "bg-indigo-600 text-white shadow-sm"
					: "text-gray-500 hover:bg-gray-100 hover:text-gray-800",
			)}>
			<Icon size={15} />
			{label}
			{active && <ChevronRight size={12} className="ml-auto" />}
		</Link>
	);
}

export default function Sidebar({
	overlayMode = false,
}: {
	overlayMode?: boolean;
}) {
	const pathname = usePathname();
	const { profile, signOut, isSuperAdmin, role } = useAuth();
	const visibleNavItems = navItems.filter((item) =>
		item.roles.includes(role ?? ""),
	);
	const canSeeReports = ["superadmin", "keuangan", "gudang"].includes(
		role ?? "",
	);
	const canSeeKeuangan = ["superadmin", "keuangan"].includes(role ?? "");
	const visiblePengirimanItems = pengirimanItems.filter((item) =>
		item.roles.includes(role ?? ""),
	);
	const visiblePengirimanEntitasItems = pengirimanEntitasItems.filter((item) =>
		item.roles.includes(role ?? ""),
	);
	const visibleCodKlaimItems = codKlaimItems.filter((item) =>
		item.roles.includes(role ?? ""),
	);
	// Badge "Booking Masuk" (spec 10) — jumlah booking_request status pending.
	// Fetch sekali per mount/role, BUKAN polling — cukup untuk v1, konsisten
	// "sengaja sederhana". Cuma query kalau role ini memang bisa lihat nav
	// item-nya (samakan dengan roles di pengirimanEntitasItems).
	const [pendingBookingCount, setPendingBookingCount] = useState(0);
	useEffect(() => {
		if (!["superadmin", "cs", "kasir", "keuangan"].includes(role ?? "")) return;
		const supabase = createClient();
		supabase
			.from("booking_request")
			.select("id", { count: "exact", head: true })
			.eq("status", "pending")
			.then(({ count }) => setPendingBookingCount(count ?? 0));
	}, [role]);

	const [open, setOpen] = useState(false);
	const isLaporanActive = laporanItems.some((i) => pathname.startsWith(i.href));
	const [laporanOpen, setLaporanOpen] = useState(isLaporanActive);
	const isKeuanganActive = keuanganItems.some((i) =>
		pathname.startsWith(i.href),
	);
	const [keuanganOpen, setKeuanganOpen] = useState(isKeuanganActive);
	const isPengirimanActive = pengirimanItems.some((i) =>
		pathname.startsWith(i.href),
	);
	const [pengirimanOpen, setPengirimanOpen] = useState(isPengirimanActive);
	const isCodKlaimActive = codKlaimItems.some((i) =>
		pathname.startsWith(i.href),
	);
	const [codKlaimOpen, setCodKlaimOpen] = useState(isCodKlaimActive);
	const closeMenu = () => setOpen(false);

	// JSX biasa (bukan sub-component) agar tidak ada unmount/remount tiap render
	const sidebarContent = (
		<div className="flex flex-col h-full">
			<div className="p-6 border-b border-gray-100">
				<div className="flex items-center gap-3">
					<div className="w-9 h-9 bg-indigo-600 rounded-xl flex items-center justify-center">
						<Package size={18} className="text-white" />
					</div>
					<div>
						<p className="font-bold text-gray-900 text-sm">BungaNaik</p>
						<p className="text-xs text-gray-500 capitalize">{profile?.role}</p>
					</div>
				</div>
			</div>

			<nav className="flex-1 p-4 space-y-1 overflow-y-auto">
				<p className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-4 mb-2">
					Menu
				</p>
				{visibleNavItems.map((item) => (
					<NavLink
						key={item.href}
						{...item}
						pathname={pathname}
						onClose={closeMenu}
					/>
				))}

				{/* Entitas Pengiriman (Fase 1) — order/resi/tracking expedisi */}
				{visiblePengirimanEntitasItems.map((item) => (
					<NavLink
						key={item.href}
						{...item}
						pathname={pathname}
						onClose={closeMenu}
						badge={
							item.href === "/dashboard/booking" ? pendingBookingCount : undefined
						}
					/>
				))}

				{/* Collapsible Operasional Armada — Lacak GPS, Armada, Manifest */}
				{visiblePengirimanItems.length > 0 && (
					<div>
						<button
							onClick={() => setPengirimanOpen(!pengirimanOpen)}
							className={cn(
								"w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all",
								isPengirimanActive
									? "bg-indigo-50 text-indigo-700"
									: "text-gray-600 hover:bg-gray-100 hover:text-gray-900",
							)}>
							<Truck size={18} />
							<span className="flex-1 text-left">Operasional Armada</span>
							{pengirimanOpen ? (
								<ChevronDown size={14} />
							) : (
								<ChevronRight size={14} />
							)}
						</button>
						{pengirimanOpen && (
							<div className="mt-1 ml-2 pl-3 border-l-2 border-gray-100 space-y-0.5">
								{visiblePengirimanItems.map((item) => (
									<SubNavLink
										key={item.href}
										{...item}
										pathname={pathname}
										onClose={closeMenu}
									/>
								))}
							</div>
						)}
					</div>
				)}

				{/* Collapsible COD & Klaim (Fase 4) */}
				{visibleCodKlaimItems.length > 0 && (
					<div>
						<button
							onClick={() => setCodKlaimOpen(!codKlaimOpen)}
							className={cn(
								"w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all",
								isCodKlaimActive
									? "bg-indigo-50 text-indigo-700"
									: "text-gray-600 hover:bg-gray-100 hover:text-gray-900",
							)}>
							<Wallet size={18} />
							<span className="flex-1 text-left">COD & Klaim</span>
							{codKlaimOpen ? (
								<ChevronDown size={14} />
							) : (
								<ChevronRight size={14} />
							)}
						</button>
						{codKlaimOpen && (
							<div className="mt-1 ml-2 pl-3 border-l-2 border-gray-100 space-y-0.5">
								{visibleCodKlaimItems.map((item) => (
									<SubNavLink
										key={item.href}
										{...item}
										pathname={pathname}
										onClose={closeMenu}
									/>
								))}
							</div>
						)}
					</div>
				)}

				{/* Collapsible Laporan */}
				{canSeeReports && (
					<div>
						<button
							onClick={() => setLaporanOpen(!laporanOpen)}
							className={cn(
								"w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all",
								isLaporanActive
									? "bg-indigo-50 text-indigo-700"
									: "text-gray-600 hover:bg-gray-100 hover:text-gray-900",
							)}>
							<BarChart2 size={18} />
							<span className="flex-1 text-left">Laporan</span>
							{laporanOpen ? (
								<ChevronDown size={14} />
							) : (
								<ChevronRight size={14} />
							)}
						</button>
						{laporanOpen && (
							<div className="mt-1 ml-2 pl-3 border-l-2 border-gray-100 space-y-0.5">
								{laporanItems.map((item) => (
									<SubNavLink
										key={item.href}
										{...item}
										pathname={pathname}
										onClose={closeMenu}
									/>
								))}
							</div>
						)}
					</div>
				)}

				{/* Collapsible Keuangan — Laporan Keuangan + Pengeluaran (spec 06), "Meja
					Kerja Keuangan" sengaja tidak ditampilkan */}
				{canSeeKeuangan && (
					<div>
						<button
							onClick={() => setKeuanganOpen(!keuanganOpen)}
							className={cn(
								"w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all",
								isKeuanganActive
									? "bg-indigo-50 text-indigo-700"
									: "text-gray-600 hover:bg-gray-100 hover:text-gray-900",
							)}>
							<Wallet size={18} />
							<span className="flex-1 text-left">Keuangan</span>
							{keuanganOpen ? (
								<ChevronDown size={14} />
							) : (
								<ChevronRight size={14} />
							)}
						</button>
						{keuanganOpen && (
							<div className="mt-1 ml-2 pl-3 border-l-2 border-gray-100 space-y-0.5">
								{keuanganItems.map((item) => (
									<SubNavLink
										key={item.href}
										{...item}
										pathname={pathname}
										onClose={closeMenu}
									/>
								))}
							</div>
						)}
					</div>
				)}

				{isSuperAdmin && (
					<>
						<p className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-4 mb-2 mt-6">
							Admin
						</p>
						{adminItems.map((item) => (
							<NavLink
								key={item.href}
								{...item}
								pathname={pathname}
								onClose={closeMenu}
							/>
						))}
					</>
				)}
			</nav>

			<div className="p-4 border-t border-gray-100">
				<div className="flex items-center gap-3 px-4 py-3 mb-2">
					<div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center text-xs font-bold text-gray-600">
						{profile?.name?.charAt(0).toUpperCase()}
					</div>
					<div className="flex-1 min-w-0">
						<p className="text-sm font-medium text-gray-900 truncate">
							{profile?.name}
						</p>
						<p className="text-xs text-gray-500 capitalize">{profile?.role}</p>
					</div>
				</div>
				<button
					onClick={signOut}
					className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium text-red-600 hover:bg-red-50 transition">
					<LogOut size={18} />
					Keluar
				</button>
			</div>
		</div>
	);

	return (
		<>
			{/* Mobile toggle (selalu tampil di semua ukuran layar saat overlayMode) */}
			<button
				onClick={() => setOpen(!open)}
				className={cn(
					"fixed top-4 left-4 z-50 p-2 bg-white rounded-xl shadow-md",
					!overlayMode && "lg:hidden",
				)}>
				{open ? <X size={20} /> : <Menu size={20} />}
			</button>

			{/* Mobile overlay */}
			{open && (
				<div
					className={cn(
						"fixed inset-0 bg-black/30 z-40",
						!overlayMode && "lg:hidden",
					)}
					onClick={() => setOpen(false)}
				/>
			)}

			{/* Mobile sidebar (dipakai juga sebagai satu-satunya sidebar saat overlayMode) */}
			<aside
				className={cn(
					"fixed left-0 top-0 h-full w-64 bg-white shadow-xl z-40 transition-transform duration-300",
					!overlayMode && "lg:hidden",
					open ? "translate-x-0" : "-translate-x-full",
				)}>
				{sidebarContent}
			</aside>

			{/* Desktop sidebar — tidak dirender saat overlayMode (mis. halaman POS) */}
			{!overlayMode && (
				<aside className="hidden lg:flex flex-col w-64 min-h-screen bg-white border-r border-gray-100 fixed left-0 top-0">
					{sidebarContent}
				</aside>
			)}
		</>
	);
}
