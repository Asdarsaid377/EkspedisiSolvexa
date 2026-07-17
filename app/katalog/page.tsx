"use client";

import { useEffect, useState, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { formatRupiah } from "@/lib/utils";
import { imgUrl } from "@/lib/image";
import Link from "next/link";
import ChatWidget from "@/components/ChatWidget";
import CatalogToolbar, {
	type CatalogGridCols,
	type CatalogSortBy,
	GRID_COLS_CLASS,
	sortProdukByHarga,
} from "@/components/CatalogToolbar";
import {
	ShoppingCart,
	Search,
	X,
	Plus,
	Minus,
	Trash2,
	MessageCircle,
	Package,
} from "lucide-react";

// ⬇️ Ganti dengan nomor WhatsApp toko (format: 62xxx tanpa + atau spasi)
const WA_TOKO = process.env.NEXT_PUBLIC_WA_TOKO || "+6289630085814";

const CART_KEY = "bunganik_cart";

const GRADIENTS = [
	"from-indigo-100 to-indigo-200 text-indigo-400",
	"from-violet-100 to-violet-200 text-violet-400",
	"from-sky-100 to-sky-200 text-sky-400",
	"from-emerald-100 to-emerald-200 text-emerald-400",
	"from-amber-100 to-amber-200 text-amber-400",
	"from-rose-100 to-rose-200 text-rose-400",
	"from-teal-100 to-teal-200 text-teal-400",
	"from-orange-100 to-orange-200 text-orange-400",
	"from-pink-100 to-pink-200 text-pink-400",
	"from-cyan-100 to-cyan-200 text-cyan-400",
];

function pickGradient(name: string) {
	let h = 0;
	for (let i = 0; i < name.length; i++) {
		h = (h << 5) - h + name.charCodeAt(i);
		h |= 0;
	}
	return GRADIENTS[Math.abs(h) % GRADIENTS.length];
}

interface CartItem {
	id: string;
	nama: string;
	harga_katalog: number;
	satuan: string;
	foto_url?: string | null;
	qty: number;
}

function loadCart(): CartItem[] {
	try {
		return JSON.parse(localStorage.getItem(CART_KEY) || "[]");
	} catch {
		return [];
	}
}

function saveCart(items: CartItem[]) {
	localStorage.setItem(CART_KEY, JSON.stringify(items));
}

export default function KatalogPage() {
	const supabase = createClient();
	const [produk, setProduk] = useState<any[]>([]);
	const [produkFotos, setProdukFotos] = useState<Record<string, string>>({});
	const [loading, setLoading] = useState(true);
	const [search, setSearch] = useState("");
	const [activeKat, setActiveKat] = useState("");
	const [sortBy, setSortBy] = useState<CatalogSortBy>("nama");
	const [gridCols, setGridCols] = useState<CatalogGridCols>(4);
	const [cart, setCart] = useState<CartItem[]>([]);
	const [cartOpen, setCartOpen] = useState(false);
	const [addedId, setAddedId] = useState<string | null>(null);

	useEffect(() => {
		setCart(loadCart());
		load();
	}, []);

	const load = async () => {
		const [produkRes, fotoRes] = await Promise.all([
			supabase
				.from("produk")
				.select(
					"id, nama, kategori, satuan, harga_katalog, stok, foto_url, deskripsi",
				)
				.eq("aktif", true)
				.gt("stok", 0)
				.order("nama"),
			supabase.from("produk_foto").select("produk_id, url").order("urutan"),
		]);
		setProduk(produkRes.data || []);
		const fotoMap: Record<string, string> = {};
		for (const f of fotoRes.data || []) {
			if (!fotoMap[f.produk_id]) fotoMap[f.produk_id] = f.url;
		}
		setProdukFotos(fotoMap);
		setLoading(false);
	};

	const kategoriList = useMemo(
		() =>
			Array.from(
				new Set(produk.map((p) => p.kategori).filter(Boolean)),
			).sort() as string[],
		[produk],
	);

	const filtered = useMemo(() => {
		const list = produk
			.filter((p) => !activeKat || p.kategori === activeKat)
			.filter(
				(p) =>
					!search ||
					p.nama.toLowerCase().includes(search.toLowerCase()) ||
					(p.kategori || "").toLowerCase().includes(search.toLowerCase()),
			);
		return sortProdukByHarga(list, sortBy);
	}, [produk, activeKat, search, sortBy]);

	const addToCart = (p: any) => {
		setCart((prev) => {
			const next = prev.find((i) => i.id === p.id)
				? prev.map((i) => (i.id === p.id ? { ...i, qty: i.qty + 1 } : i))
				: [
						...prev,
						{
							id: p.id,
							nama: p.nama,
							harga_katalog: p.harga_katalog,
							satuan: p.satuan,
							foto_url: p.foto_url,
							qty: 1,
						},
					];
			saveCart(next);
			return next;
		});
		setAddedId(p.id);
		setTimeout(() => setAddedId(null), 1000);
	};

	const updateQty = (id: string, delta: number) => {
		setCart((prev) => {
			const next = prev
				.map((i) => (i.id === id ? { ...i, qty: i.qty + delta } : i))
				.filter((i) => i.qty > 0);
			saveCart(next);
			return next;
		});
	};

	const removeItem = (id: string) => {
		setCart((prev) => {
			const next = prev.filter((i) => i.id !== id);
			saveCart(next);
			return next;
		});
	};

	const clearCart = () => {
		setCart([]);
		saveCart([]);
	};

	const totalItems = cart.reduce((s, i) => s + i.qty, 0);
	const totalHarga = cart.reduce((s, i) => s + i.harga_katalog * i.qty, 0);

	const handleCheckout = () => {
		if (cart.length === 0) return;
		const fmt = (n: number) =>
			new Intl.NumberFormat("id-ID", {
				style: "currency",
				currency: "IDR",
				minimumFractionDigits: 0,
			}).format(n);
		const lines = cart
			.map(
				(i, idx) =>
					`${idx + 1}. ${i.nama} × ${i.qty} ${i.satuan} = ${fmt(i.harga_katalog * i.qty)}`,
			)
			.join("\n");
		const msg = `Halo Admin BungaNaik! 👋\n\nSaya ingin memesan:\n\n${lines}\n\n*Total: ${fmt(totalHarga)}*\n\nMohon konfirmasi ketersediaan dan info pengirimannya. Terima kasih 🙏`;
		window.open(
			`https://wa.me/${WA_TOKO}?text=${encodeURIComponent(msg)}`,
			"_blank",
		);
	};

	return (
		<div className="min-h-screen bg-gray-50">
			{/* ─── HEADER ─── */}
			<header className="sticky top-0 z-40 bg-white border-b border-gray-100 shadow-sm">
				<div className="max-w-7xl mx-auto px-4">
					{/* Top row */}
					<div className="flex items-center gap-3 py-3">
						{/* Logo */}
						<Link
							href="/katalog"
							className="flex items-center gap-2.5 flex-shrink-0">
							<div className="w-9 h-9 bg-indigo-600 rounded-xl flex items-center justify-center shadow-sm">
								<Package size={18} className="text-white" />
							</div>
							<div className="hidden sm:block">
								<p className="font-bold text-gray-900 text-sm leading-tight">
									BungaNaik
								</p>
								<p className="text-[11px] text-gray-400 leading-tight">
									Furniture Store
								</p>
							</div>
						</Link>

						{/* Search */}
						<div className="flex-1 relative">
							<Search
								size={15}
								className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
							/>
							<input
								value={search}
								onChange={(e) => setSearch(e.target.value)}
								placeholder="Cari produk furniture..."
								className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition"
							/>
							{search && (
								<button
									onClick={() => setSearch("")}
									className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
									<X size={14} />
								</button>
							)}
						</div>

						{/* Cart */}
						<button
							onClick={() => setCartOpen(true)}
							className="relative flex items-center gap-2 px-3 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-medium transition flex-shrink-0">
							<ShoppingCart size={17} />
							<span className="hidden sm:inline">Keranjang</span>
							{totalItems > 0 && (
								<span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center shadow-sm">
									{totalItems > 9 ? "9+" : totalItems}
								</span>
							)}
						</button>
					</div>

					{/* Toolbar kategori + sort + grid — semua dropdown, tidak ada pills scroll/wrap */}
					<div className="pb-3">
						<CatalogToolbar
							kategoriOptions={["Semua", ...kategoriList]}
							activeKategori={activeKat || "Semua"}
							onKategoriChange={(v) => setActiveKat(v === "Semua" ? "" : v)}
							sortBy={sortBy}
							onSortChange={setSortBy}
							gridCols={gridCols}
							onGridColsChange={setGridCols}
							accent="indigo"
						/>
					</div>
				</div>
			</header>

			{/* ─── MAIN CONTENT ─── */}
			<main className="max-w-7xl mx-auto px-4 py-6">
				{/* Result count */}
				{!loading && (
					<p className="text-sm text-gray-500 mb-5">
						<span className="font-semibold text-gray-800">
							{filtered.length}
						</span>{" "}
						produk
						{activeKat ? ` · ${activeKat}` : ""}
						{search ? ` · "${search}"` : ""}
					</p>
				)}

				{loading ? (
					/* Skeleton */
					<div className={`grid ${GRID_COLS_CLASS[gridCols]} gap-4`}>
						{Array.from({ length: 10 }).map((_, i) => (
							<div
								key={i}
								className="bg-white rounded-2xl overflow-hidden shadow-sm animate-pulse">
								<div className="h-44 bg-gray-100" />
								<div className="p-3 space-y-2">
									<div className="h-3 bg-gray-100 rounded-full w-3/4" />
									<div className="h-3 bg-gray-100 rounded-full w-1/2" />
									<div className="h-5 bg-gray-100 rounded-full w-2/3 mt-1" />
									<div className="h-9 bg-gray-100 rounded-xl mt-2" />
								</div>
							</div>
						))}
					</div>
				) : filtered.length === 0 ? (
					<div className="text-center py-24">
						<div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
							<Package size={36} className="text-gray-300" />
						</div>
						<p className="text-gray-600 font-semibold text-lg">
							Produk tidak ditemukan
						</p>
						<p className="text-sm text-gray-400 mt-1 mb-5">
							Coba kata kunci atau kategori lain
						</p>
						<button
							onClick={() => {
								setSearch("");
								setActiveKat("");
							}}
							className="px-5 py-2 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 transition">
							Reset Filter
						</button>
					</div>
				) : (
					<div className={`grid ${GRID_COLS_CLASS[gridCols]} gap-4`}>
						{filtered.map((p) => {
							const inCart = cart.find((i) => i.id === p.id);
							const justAdded = addedId === p.id;
							const grad = pickGradient(p.nama);
							const [gradClass, textClass] = [
								grad.split(" ").slice(0, 2).join(" "),
								grad.split(" ")[2],
							];
							const fotoUrl = produkFotos[p.id] || p.foto_url || null;

							return (
								<div
									key={p.id}
									className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-lg transition-all duration-200 group flex flex-col">
									{/* Image area */}
									<Link
										href={`/produk/${p.id}`}
										className="block flex-shrink-0">
										<div
											className={`relative h-44 bg-gradient-to-br ${gradClass} overflow-hidden`}>
											{fotoUrl ? (
												<img
													src={imgUrl(fotoUrl, 500)}
													alt={p.nama}
													loading="lazy"
													className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
												/>
											) : (
												<div className="w-full h-full flex items-center justify-center">
													<Package
														size={44}
														className={`${textClass} opacity-50`}
													/>
												</div>
											)}
											{p.kategori && (
												<span className="absolute top-2 left-2 bg-white/85 backdrop-blur-sm text-gray-700 text-[10px] font-semibold px-2 py-0.5 rounded-full shadow-sm">
													{p.kategori}
												</span>
											)}
											{inCart && (
												<span className="absolute top-2 right-2 bg-indigo-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm">
													{inCart.qty} di keranjang
												</span>
											)}
										</div>
									</Link>

									{/* Info */}
									<div className="p-3 flex flex-col flex-1">
										<Link href={`/produk/${p.id}`} className="flex-1">
											<p className="font-semibold text-gray-900 text-sm leading-snug line-clamp-2 hover:text-indigo-600 transition mb-1">
												{p.nama}
											</p>
										</Link>
										<p className="text-indigo-600 font-bold text-base mb-2.5">
											{formatRupiah(p.harga_katalog)}
											<span className="text-gray-400 font-normal text-xs ml-1">
												/{p.satuan}
											</span>
										</p>

										{inCart ? (
											<div className="flex items-center justify-between bg-indigo-50 border border-indigo-100 rounded-xl px-2 py-1.5">
												<button
													onClick={() => updateQty(p.id, -1)}
													className="w-7 h-7 flex items-center justify-center hover:bg-indigo-100 rounded-lg text-indigo-600 transition">
													<Minus size={14} />
												</button>
												<span className="text-sm font-bold text-indigo-700 w-6 text-center">
													{inCart.qty}
												</span>
												<button
													onClick={() => updateQty(p.id, 1)}
													className="w-7 h-7 flex items-center justify-center hover:bg-indigo-100 rounded-lg text-indigo-600 transition">
													<Plus size={14} />
												</button>
											</div>
										) : (
											<button
												onClick={() => addToCart(p)}
												className={`w-full py-2 rounded-xl text-xs font-bold transition-all ${
													justAdded
														? "bg-green-500 text-white scale-95"
														: "bg-indigo-600 hover:bg-indigo-700 text-white active:scale-95"
												}`}>
												{justAdded ? "✓ Ditambahkan!" : "+ Keranjang"}
											</button>
										)}
									</div>
								</div>
							);
						})}
					</div>
				)}
			</main>

			{/* ─── FOOTER ─── */}
			{!loading && filtered.length > 0 && (
				<footer className="border-t border-gray-100 bg-white mt-12 py-8 text-center text-sm text-gray-400">
					<p className="font-semibold text-gray-600">BungaNaik Furniture</p>
					<p className="mt-1">
						Harga dapat berubah sewaktu-waktu. Hubungi kami untuk konfirmasi.
					</p>
				</footer>
			)}

			{/* ─── CART DRAWER ─── */}
			{cartOpen && (
				<div className="fixed inset-0 z-50 flex">
					{/* Backdrop */}
					<div
						className="flex-1 bg-black/40 backdrop-blur-sm"
						onClick={() => setCartOpen(false)}
					/>

					{/* Drawer */}
					<div className="w-full max-w-sm bg-white shadow-2xl flex flex-col">
						{/* Header */}
						<div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
							<div className="flex items-center gap-2.5">
								<ShoppingCart size={18} className="text-indigo-600" />
								<h2 className="font-bold text-gray-900">Keranjang</h2>
								{totalItems > 0 && (
									<span className="bg-indigo-100 text-indigo-700 text-xs font-bold px-2 py-0.5 rounded-full">
										{totalItems} item
									</span>
								)}
							</div>
							<div className="flex items-center gap-1">
								{cart.length > 0 && (
									<button
										onClick={clearCart}
										className="text-xs text-red-400 hover:text-red-600 px-2 py-1 rounded-lg hover:bg-red-50 transition">
										Hapus Semua
									</button>
								)}
								<button
									onClick={() => setCartOpen(false)}
									className="p-2 hover:bg-gray-100 rounded-lg transition">
									<X size={18} />
								</button>
							</div>
						</div>

						{cart.length === 0 ? (
							/* Empty cart */
							<div className="flex-1 flex flex-col items-center justify-center gap-3 text-center px-8">
								<div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center">
									<ShoppingCart size={32} className="text-gray-300" />
								</div>
								<div>
									<p className="font-semibold text-gray-600">
										Keranjang kosong
									</p>
									<p className="text-sm text-gray-400 mt-1">
										Tambahkan produk dari katalog
									</p>
								</div>
								<button
									onClick={() => setCartOpen(false)}
									className="mt-2 px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 transition">
									Lihat Katalog
								</button>
							</div>
						) : (
							<>
								{/* Items list */}
								<div className="flex-1 overflow-y-auto p-4 space-y-3">
									{cart.map((item) => {
										const [gc, tc] = pickGradient(item.nama)
											.split(" ")
											.reduce(
												(a, c, i) => (i < 2 ? [[...a[0], c], a[1]] : [a[0], c]),
												[[] as string[], ""] as [string[], string],
											);
										return (
											<div
												key={item.id}
												className="flex gap-3 bg-gray-50 rounded-2xl p-3 border border-gray-100">
												{/* Thumbnail */}
												<div
													className={`w-16 h-16 rounded-xl bg-gradient-to-br ${gc.join(" ")} flex-shrink-0 overflow-hidden`}>
													{item.foto_url ? (
														<img
															src={imgUrl(item.foto_url, 120)}
															alt={item.nama}
															loading="lazy"
															className="w-full h-full object-cover"
														/>
													) : (
														<div className="w-full h-full flex items-center justify-center">
															<Package
																size={22}
																className={`${tc} opacity-50`}
															/>
														</div>
													)}
												</div>

												<div className="flex-1 min-w-0">
													<p className="font-semibold text-gray-900 text-sm leading-snug line-clamp-2">
														{item.nama}
													</p>
													<p className="text-indigo-600 font-bold text-sm mt-0.5">
														{formatRupiah(item.harga_katalog)}
														<span className="text-gray-400 font-normal text-xs ml-1">
															/{item.satuan}
														</span>
													</p>
													<div className="flex items-center gap-2 mt-2">
														<div className="flex items-center bg-white border border-gray-200 rounded-lg overflow-hidden">
															<button
																onClick={() => updateQty(item.id, -1)}
																className="px-2 py-1 hover:bg-gray-50 text-gray-600 transition">
																<Minus size={12} />
															</button>
															<span className="px-3 text-sm font-bold text-gray-800">
																{item.qty}
															</span>
															<button
																onClick={() => updateQty(item.id, 1)}
																className="px-2 py-1 hover:bg-gray-50 text-gray-600 transition">
																<Plus size={12} />
															</button>
														</div>
														<button
															onClick={() => removeItem(item.id)}
															className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition">
															<Trash2 size={13} />
														</button>
													</div>
												</div>

												<p className="text-sm font-bold text-gray-900 flex-shrink-0 pt-0.5">
													{formatRupiah(item.harga_katalog * item.qty)}
												</p>
											</div>
										);
									})}
								</div>

								{/* Checkout */}
								<div className="p-4 border-t border-gray-100 bg-white space-y-3">
									<div className="flex items-center justify-between">
										<span className="text-sm text-gray-500">
											Total{" "}
											<span className="text-gray-700 font-medium">
												({totalItems} item)
											</span>
										</span>
										<span className="text-xl font-bold text-gray-900">
											{formatRupiah(totalHarga)}
										</span>
									</div>
									<button
										onClick={handleCheckout}
										className="w-full py-3.5 bg-green-500 hover:bg-green-600 active:scale-[0.98] text-white rounded-2xl font-bold text-sm flex items-center justify-center gap-2.5 transition-all shadow-sm shadow-green-200">
										<MessageCircle size={18} />
										Pesan via WhatsApp
									</button>
									<p className="text-center text-xs text-gray-400 leading-relaxed">
										Anda akan diarahkan ke WhatsApp untuk konfirmasi pesanan &
										pengiriman
									</p>
								</div>
							</>
						)}
					</div>
				</div>
			)}

			<ChatWidget />
		</div>
	);
}
