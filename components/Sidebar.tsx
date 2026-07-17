"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import {
	LayoutDashboard,
	Package,
	Users,
	ShoppingCart,
	BarChart2,
	Clock,
	FileText,
	Trophy,
	BoxesIcon,
	LogOut,
	ChevronRight,
	ChevronDown,
	Settings,
	Menu,
	X,
	Target,
	Wallet,
	TrendingUp,
	Receipt,
	Store,
	ExternalLink,
	ClipboardList,
	Truck,
	MessageSquare,
	UserCircle,
	Factory,
	Layers,
	ShoppingBag,
	GitBranch,
	CheckSquare,
	Award,
	ScanFace,
	MapPin,
	Megaphone,
	Wrench,
	Navigation,
	Briefcase,
	UserCog,
	PackageCheck,
	DollarSign,
	ShieldAlert,
} from "lucide-react";
import { useState } from "react";
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
		roles: ["superadmin", "kasir", "keuangan", "cs", "gudang", "kurir", "sopir"],
	},
	// Furniture-specific — tidak dibutuhkan untuk expedisi
	// {
	// 	href: "/dashboard/gudang/workspace",
	// 	label: "Meja Kerja Gudang",
	// 	icon: Briefcase,
	// 	roles: ["superadmin", "gudang"],
	// },
	// {
	// 	href: "/dashboard/produk",
	// 	label: "Produk & Stok",
	// 	icon: Package,
	// 	roles: ["superadmin", "gudang", "kasir", "cs"],
	// },
];

const ownerItems = [
	{ href: "/dashboard/owner/workspace", label: "Meja Kerja Owner", icon: Layers },
	{ href: "/dashboard/owner/asisten", label: "Meja Kerja Asisten Owner", icon: UserCog },
];

const penjualanItems = [
	{
		href: "/dashboard/penjualan",
		label: "Penjualan",
		icon: ShoppingCart,
		roles: ["superadmin", "keuangan", "kurir", "sopir", "kasir", "gudang"],
	},
	// Furniture retail — tidak dibutuhkan untuk expedisi
	// {
	// 	href: "/dashboard/pos",
	// 	label: "Kasir (POS)",
	// 	icon: Store,
	// 	roles: ["superadmin", "keuangan", "kurir", "sopir", "kasir", "gudang"],
	// },
];

// Model reseller/pelanggan furniture — tidak dibutuhkan untuk expedisi
const resellerItems: {
	href: string;
	label: string;
	icon: any;
	roles: string[];
}[] = [
	// {
	// 	href: "/dashboard/reseller",
	// 	label: "Reseller",
	// 	icon: Users,
	// 	roles: ["superadmin", "keuangan", "cs", "kasir", "gudang", "kurir"],
	// },
	// {
	// 	href: "/dashboard/pengumuman",
	// 	label: "Pengumuman Reseller",
	// 	icon: Megaphone,
	// 	roles: ["superadmin"],
	// },
	// {
	// 	href: "/dashboard/pelanggan",
	// 	label: "Pelanggan",
	// 	icon: UserCircle,
	// 	roles: ["superadmin", "cs", "kasir"],
	// },
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
		roles: ["superadmin", "gudang", "sopir", "kurir", "cs", "keuangan", "kasir"],
	},
	// Custom order furniture — tidak dibutuhkan untuk expedisi
	// {
	// 	href: "/dashboard/po",
	// 	label: "Purchase Order",
	// 	icon: ClipboardList,
	// 	roles: ["superadmin", "cs", "gudang", "kurir", "keuangan", "kasir"],
	// },
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
		roles: ["superadmin", "cs", "kasir", "keuangan", "gudang", "kurir", "sopir"],
	},
];

// Kontrol penjualan retail furniture — tidak dibutuhkan untuk expedisi
const kontrolItems: {
	href: string;
	label: string;
	icon: any;
	roles: string[];
}[] = [
	// {
	// 	href: "/dashboard/target",
	// 	label: "Target Penjualan",
	// 	icon: Target,
	// 	roles: ["superadmin"],
	// },
	// {
	// 	href: "/dashboard/pencocokan",
	// 	label: "Pencocokan Nota",
	// 	icon: CheckSquare,
	// 	roles: ["superadmin"],
	// },
];

const keuanganItems = [
	{
		href: "/dashboard/keuangan/workspace",
		label: "Meja Kerja Keuangan",
		icon: Briefcase,
	},
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
	{ href: "/dashboard/laporan", label: "Laporan Penjualan", icon: FileText },
	// { href: "/dashboard/laporan/reseller", label: "Top Reseller", icon: Trophy },
	// { href: "/dashboard/reseller/tier", label: "Tier Reseller", icon: Award },
	// { href: "/dashboard/laporan/produk", label: "Laporan Produk", icon: BoxesIcon },
	// { href: "/dashboard/stock-aging", label: "Usia Barang", icon: Clock },
	{ href: "/dashboard/laporan/sopir", label: "Laporan Sopir", icon: Truck },
	// { href: "/dashboard/laporan/tukang", label: "Laporan Tukang", icon: Wrench },
	{ href: "/dashboard/laporan/wilayah", label: "Laporan Wilayah", icon: MapPin },
	{ href: "/dashboard/laporan/review", label: "Kritik & Saran", icon: MessageSquare },
];

// Modul HPP produksi furniture — tidak dibutuhkan untuk expedisi
const hppItems: { href: string; label: string; icon: any }[] = [
	// { href: "/dashboard/hpp/bahan-baku", label: "Bahan Baku", icon: Layers },
	// {
	// 	href: "/dashboard/hpp/pembelian",
	// 	label: "Pembelian BB",
	// 	icon: ShoppingBag,
	// },
	// { href: "/dashboard/hpp/bom", label: "Bill of Materials", icon: GitBranch },
	// { href: "/dashboard/hpp/batch", label: "Batch Produksi", icon: Factory },
	// { href: "/dashboard/hpp/laporan", label: "Laporan HPP", icon: BarChart2 },
];

const adminItems = [
	{ href: "/dashboard/pengguna", label: "Pengguna", icon: Settings },
	{ href: "/dashboard/tarif-zona", label: "Tarif Zona", icon: DollarSign },
];

// Didefinisikan di luar komponen agar referensi fungsi stabil — cegah unmount/remount tiap re-render
function NavLink({
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
	const active = pathname === href || (href !== "/dashboard" && pathname.startsWith(href));
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
			{active && <ChevronRight size={14} className="ml-auto" />}
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

export default function Sidebar({ overlayMode = false }: { overlayMode?: boolean }) {
	const pathname = usePathname();
	const { profile, signOut, isSuperAdmin, role } = useAuth();
	const visibleNavItems = navItems.filter((item) =>
		item.roles.includes(role ?? ""),
	);
	const canSeeReports = ["superadmin", "keuangan", "gudang"].includes(role ?? "");
	const canSeeKeuangan = ["superadmin", "keuangan"].includes(role ?? "");
	const visiblePenjualanItems = penjualanItems.filter((item) =>
		item.roles.includes(role ?? ""),
	);
	const visibleResellerItems = resellerItems.filter((item) =>
		item.roles.includes(role ?? ""),
	);
	const visiblePengirimanItems = pengirimanItems.filter((item) =>
		item.roles.includes(role ?? ""),
	);
	const visiblePengirimanEntitasItems = pengirimanEntitasItems.filter((item) =>
		item.roles.includes(role ?? ""),
	);
	const visibleCodKlaimItems = codKlaimItems.filter((item) =>
		item.roles.includes(role ?? ""),
	);
	const visibleKontrolItems = kontrolItems.filter((item) =>
		item.roles.includes(role ?? ""),
	);
	const [open, setOpen] = useState(false);
	const isOwnerActive = ownerItems.some((i) => pathname.startsWith(i.href));
	const [ownerOpen, setOwnerOpen] = useState(isOwnerActive);
	const isLaporanActive = laporanItems.some((i) => pathname.startsWith(i.href));
	const [laporanOpen, setLaporanOpen] = useState(isLaporanActive);
	const isKeuanganActive = keuanganItems.some((i) =>
		pathname.startsWith(i.href),
	);
	const [keuanganOpen, setKeuanganOpen] = useState(isKeuanganActive);
	const isPenjualanActive = penjualanItems.some((i) =>
		pathname.startsWith(i.href),
	);
	const [penjualanOpen, setPenjualanOpen] = useState(isPenjualanActive);
	const isResellerActive = resellerItems.some((i) => pathname.startsWith(i.href));
	const [resellerOpen, setResellerOpen] = useState(isResellerActive);
	const isPengirimanActive = pengirimanItems.some((i) =>
		pathname.startsWith(i.href),
	);
	const [pengirimanOpen, setPengirimanOpen] = useState(isPengirimanActive);
	const isCodKlaimActive = codKlaimItems.some((i) => pathname.startsWith(i.href));
	const [codKlaimOpen, setCodKlaimOpen] = useState(isCodKlaimActive);
	const isKontrolActive = kontrolItems.some((i) => pathname.startsWith(i.href));
	const [kontrolOpen, setKontrolOpen] = useState(isKontrolActive);
	const isHppActive = hppItems.some((i) => pathname.startsWith(i.href));
	const [hppOpen, setHppOpen] = useState(isHppActive);
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
					<NavLink key={item.href} {...item} pathname={pathname} onClose={closeMenu} />
				))}

				{/* Entitas Pengiriman (Fase 1) — order/resi/tracking expedisi */}
				{visiblePengirimanEntitasItems.map((item) => (
					<NavLink key={item.href} {...item} pathname={pathname} onClose={closeMenu} />
				))}

				{/* Collapsible Owner — superadmin only */}
				{isSuperAdmin && (
					<div>
						<button
							onClick={() => setOwnerOpen(!ownerOpen)}
							className={cn(
								"w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all",
								isOwnerActive
									? "bg-indigo-50 text-indigo-700"
									: "text-gray-600 hover:bg-gray-100 hover:text-gray-900",
							)}>
							<Layers size={18} />
							<span className="flex-1 text-left">Owner</span>
							{ownerOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
						</button>
						{ownerOpen && (
							<div className="mt-1 ml-2 pl-3 border-l-2 border-gray-100 space-y-0.5">
								{ownerItems.map((item) => (
									<SubNavLink key={item.href} {...item} pathname={pathname} onClose={closeMenu} />
								))}
							</div>
						)}
					</div>
				)}

				{/* Collapsible Penjualan & POS */}
				{visiblePenjualanItems.length > 0 && (
					<div>
						<button
							onClick={() => setPenjualanOpen(!penjualanOpen)}
							className={cn(
								"w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all",
								isPenjualanActive
									? "bg-indigo-50 text-indigo-700"
									: "text-gray-600 hover:bg-gray-100 hover:text-gray-900",
							)}>
							<ShoppingCart size={18} />
							<span className="flex-1 text-left">Penjualan</span>
							{penjualanOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
						</button>
						{penjualanOpen && (
							<div className="mt-1 ml-2 pl-3 border-l-2 border-gray-100 space-y-0.5">
								{visiblePenjualanItems.map((item) => (
									<SubNavLink key={item.href} {...item} pathname={pathname} onClose={closeMenu} />
								))}
							</div>
						)}
					</div>
				)}

				{/* Collapsible Reseller & Pelanggan */}
				{visibleResellerItems.length > 0 && (
					<div>
						<button
							onClick={() => setResellerOpen(!resellerOpen)}
							className={cn(
								"w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all",
								isResellerActive
									? "bg-indigo-50 text-indigo-700"
									: "text-gray-600 hover:bg-gray-100 hover:text-gray-900",
							)}>
							<Users size={18} />
							<span className="flex-1 text-left">Reseller & Pelanggan</span>
							{resellerOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
						</button>
						{resellerOpen && (
							<div className="mt-1 ml-2 pl-3 border-l-2 border-gray-100 space-y-0.5">
								{visibleResellerItems.map((item) => (
									<SubNavLink key={item.href} {...item} pathname={pathname} onClose={closeMenu} />
								))}
							</div>
						)}
					</div>
				)}

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
							{pengirimanOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
						</button>
						{pengirimanOpen && (
							<div className="mt-1 ml-2 pl-3 border-l-2 border-gray-100 space-y-0.5">
								{visiblePengirimanItems.map((item) => (
									<SubNavLink key={item.href} {...item} pathname={pathname} onClose={closeMenu} />
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
							{codKlaimOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
						</button>
						{codKlaimOpen && (
							<div className="mt-1 ml-2 pl-3 border-l-2 border-gray-100 space-y-0.5">
								{visibleCodKlaimItems.map((item) => (
									<SubNavLink key={item.href} {...item} pathname={pathname} onClose={closeMenu} />
								))}
							</div>
						)}
					</div>
				)}

				{/* Collapsible Kontrol Penjualan — superadmin only */}
				{visibleKontrolItems.length > 0 && (
					<div>
						<button
							onClick={() => setKontrolOpen(!kontrolOpen)}
							className={cn(
								"w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all",
								isKontrolActive
									? "bg-indigo-50 text-indigo-700"
									: "text-gray-600 hover:bg-gray-100 hover:text-gray-900",
							)}>
							<Target size={18} />
							<span className="flex-1 text-left">Kontrol Penjualan</span>
							{kontrolOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
						</button>
						{kontrolOpen && (
							<div className="mt-1 ml-2 pl-3 border-l-2 border-gray-100 space-y-0.5">
								{visibleKontrolItems.map((item) => (
									<SubNavLink key={item.href} {...item} pathname={pathname} onClose={closeMenu} />
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
							{laporanOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
						</button>
						{laporanOpen && (
							<div className="mt-1 ml-2 pl-3 border-l-2 border-gray-100 space-y-0.5">
								{laporanItems.map((item) => (
									<SubNavLink key={item.href} {...item} pathname={pathname} onClose={closeMenu} />
								))}
							</div>
						)}
					</div>
				)}

				{/* Collapsible Keuangan */}
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
							{keuanganOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
						</button>
						{keuanganOpen && (
							<div className="mt-1 ml-2 pl-3 border-l-2 border-gray-100 space-y-0.5">
								{keuanganItems.map((item) => (
									<SubNavLink key={item.href} {...item} pathname={pathname} onClose={closeMenu} />
								))}
							</div>
						)}
					</div>
				)}

				{/* Collapsible HPP — superadmin only, disembunyikan otomatis saat hppItems kosong */}
				{isSuperAdmin && hppItems.length > 0 && (
					<div>
						<button
							onClick={() => setHppOpen(!hppOpen)}
							className={cn(
								"w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all",
								isHppActive
									? "bg-indigo-50 text-indigo-700"
									: "text-gray-600 hover:bg-gray-100 hover:text-gray-900",
							)}>
							<Factory size={18} />
							<span className="flex-1 text-left">HPP Produksi</span>
							{hppOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
						</button>
						{hppOpen && (
							<div className="mt-1 ml-2 pl-3 border-l-2 border-gray-100 space-y-0.5">
								{hppItems.map((item) => (
									<SubNavLink key={item.href} {...item} pathname={pathname} onClose={closeMenu} />
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
							<NavLink key={item.href} {...item} pathname={pathname} onClose={closeMenu} />
						))}
					</>
				)}
			</nav>

			<div className="p-4 border-t border-gray-100">
				{/* Katalog publik reseller furniture — tidak dibutuhkan untuk expedisi */}
				{/* <a
					href="/katalog"
					target="_blank"
					rel="noopener noreferrer"
					className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium text-indigo-600 hover:bg-indigo-50 transition mb-1">
					<Store size={18} />
					Lihat Katalog Publik
					<ExternalLink size={13} className="ml-auto text-indigo-400" />
				</a> */}
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
					className={cn("fixed inset-0 bg-black/30 z-40", !overlayMode && "lg:hidden")}
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
