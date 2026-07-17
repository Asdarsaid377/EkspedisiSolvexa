"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { imgUrl } from "@/lib/image";
import ChatWidget from "@/components/ChatWidget";
import CatalogToolbar, {
	type CatalogGridCols,
	type CatalogSortBy,
	GRID_COLS_CLASS,
	sortProdukByHarga,
} from "@/components/CatalogToolbar";
import {
	Search,
	ShoppingCart,
	X,
	ChevronRight,
	Package,
	MessageCircle,
	Minus,
	Plus,
	Trash2,
} from "lucide-react";

const WA_TOKO = process.env.NEXT_PUBLIC_WA_TOKO || "6289630085814";
const CART_KEY = "bng_toko_cart";

// Harga publik = harga_katalog × 1.25, dibulatkan ke atas
function hargaUmum(hargaKatalog: number): number {
	return Math.ceil(hargaKatalog * 1.25);
}

function formatRp(n: number): string {
	return new Intl.NumberFormat("id-ID", {
		style: "currency",
		currency: "IDR",
		minimumFractionDigits: 0,
	}).format(n);
}

interface Produk {
	id: string;
	nama: string;
	kategori: string | null;
	satuan: string;
	harga_katalog: number;
	stok: number;
	foto_url: string | null;
	deskripsi: string | null;
	thumb?: string | null;
}

interface CartItem {
	id: string;
	nama: string;
	harga: number;
	satuan: string;
	foto?: string | null;
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

const GRADIENTS = [
	"from-indigo-100 to-indigo-200 text-indigo-300",
	"from-violet-100 to-violet-200 text-violet-300",
	"from-sky-100 to-sky-200 text-sky-300",
	"from-emerald-100 to-emerald-200 text-emerald-300",
	"from-amber-100 to-amber-200 text-amber-300",
	"from-rose-100 to-rose-200 text-rose-300",
];
function pickGradient(name: string) {
	let h = 0;
	for (let i = 0; i < name.length; i++) {
		h = (h << 5) - h + name.charCodeAt(i);
		h |= 0;
	}
	return GRADIENTS[Math.abs(h) % GRADIENTS.length];
}

export default function TokoPage() {
	const router = useRouter();
	const supabase = createClient();

	const [produkList, setProdukList] = useState<Produk[]>([]);
	const [loading, setLoading] = useState(true);
	const [search, setSearch] = useState("");
	const [kategori, setKategori] = useState("Semua");
	const [sortBy, setSortBy] = useState<CatalogSortBy>("nama");
	const [gridCols, setGridCols] = useState<CatalogGridCols>(4);
	const [cart, setCart] = useState<CartItem[]>([]);
	const [cartOpen, setCartOpen] = useState(false);

	const kategoriList = [
		"Semua",
		...Array.from(
			new Set(produkList.map((p) => p.kategori).filter(Boolean) as string[]),
		),
	];
	const totalItem = cart.reduce((s, i) => s + i.qty, 0);
	const totalHarga = cart.reduce((s, i) => s + i.harga * i.qty, 0);

	useEffect(() => {
		setCart(loadCart());
		load();
	}, []);

	const load = async () => {
		const { data: produk } = await supabase
			.from("produk")
			.select(
				"id, nama, kategori, satuan, harga_katalog, stok, foto_url, deskripsi",
			)
			.eq("aktif", true)
			.order("nama");

		// Ambil foto pertama per produk. Sengaja TANPA .in("produk_id", ids) —
		// dengan banyak produk, URL query .in() jadi sangat panjang (semua UUID
		// digabung di query string) dan bisa kena limit ukuran URI di reverse
		// proxy (muncul sebagai "Error CORS" di browser karena preflight gagal
		// 414, bukan CORS beneran). Ambil semua baris sekalian, sama seperti /katalog.
		const { data: fotos } = await supabase
			.from("produk_foto")
			.select("produk_id, url")
			.order("urutan");

		const fotoMap: Record<string, string> = {};
		(fotos || []).forEach((f: any) => {
			if (!fotoMap[f.produk_id]) fotoMap[f.produk_id] = f.url;
		});

		setProdukList(
			(produk || []).map((p: any) => ({
				...p,
				thumb: fotoMap[p.id] || p.foto_url || null,
			})),
		);
		setLoading(false);
	};

	const filtered = sortProdukByHarga(
		produkList.filter((p) => {
			if (kategori !== "Semua" && p.kategori !== kategori) return false;
			if (search) return p.nama.toLowerCase().includes(search.toLowerCase());
			return true;
		}),
		sortBy,
	);

	const addToCart = (p: Produk) => {
		const harga = hargaUmum(p.harga_katalog);
		setCart((prev) => {
			const next = prev.find((i) => i.id === p.id)
				? prev.map((i) => (i.id === p.id ? { ...i, qty: i.qty + 1 } : i))
				: [
						...prev,
						{
							id: p.id,
							nama: p.nama,
							harga,
							satuan: p.satuan,
							foto: p.thumb,
							qty: 1,
						},
					];
			saveCart(next);
			return next;
		});
	};

	const changeQty = (id: string, delta: number) => {
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

	const checkout = () => {
		if (!cart.length) return;
		const lines = cart
			.map(
				(i, idx) =>
					`${idx + 1}. ${i.nama} × ${i.qty} ${i.satuan} = ${formatRp(i.harga * i.qty)}`,
			)
			.join("\n");
		const msg = `Halo BungaNaik! 👋\n\nSaya ingin memesan:\n\n${lines}\n\n*Total: ${formatRp(totalHarga)}*\n\nMohon konfirmasi ketersediaan dan info pengirimannya. Terima kasih 🙏`;
		window.open(
			`https://wa.me/${WA_TOKO}?text=${encodeURIComponent(msg)}`,
			"_blank",
		);
	};

	return (
		<div className="min-h-screen bg-gray-50">
			{/* ── Header ── */}
			<header className="sticky top-0 z-30 bg-white border-b border-gray-100 shadow-sm">
				<div className="max-w-5xl mx-auto px-4 py-3 flex items-center gap-3">
					{/* Branding */}
					<div className="flex-shrink-0">
						<p className="text-xs text-gray-400 leading-none">Toko Furniture</p>
						<p className="text-base font-bold text-indigo-700 leading-tight">
							BungaNaik
						</p>
					</div>

					{/* Search */}
					<div className="relative flex-1">
						<Search
							size={15}
							className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
						/>
						<input
							value={search}
							onChange={(e) => setSearch(e.target.value)}
							placeholder="Cari produk..."
							className="w-full pl-9 pr-8 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-gray-50"
						/>
						{search && (
							<button
								onClick={() => setSearch("")}
								className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400">
								<X size={14} />
							</button>
						)}
					</div>

					{/* Cart button */}
					<button
						onClick={() => setCartOpen(true)}
						className="relative flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-600 transition">
						<ShoppingCart size={20} />
						{totalItem > 0 && (
							<span className="absolute -top-1 -right-1 w-5 h-5 bg-indigo-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
								{totalItem > 9 ? "9+" : totalItem}
							</span>
						)}
					</button>
				</div>

				{/* Toolbar kategori + sort + grid — semua dropdown, tidak ada pills scroll/wrap */}
				<div className="max-w-5xl mx-auto px-4 pb-3">
					<CatalogToolbar
						kategoriOptions={kategoriList}
						activeKategori={kategori}
						onKategoriChange={setKategori}
						sortBy={sortBy}
						onSortChange={setSortBy}
						gridCols={gridCols}
						onGridColsChange={setGridCols}
						accent="indigo"
					/>
				</div>
			</header>

			{/* ── Product Grid ── */}
			<main className="max-w-5xl mx-auto px-4 py-5">
				{loading ? (
					<div className="text-center py-20 text-gray-400">
						Memuat produk...
					</div>
				) : filtered.length === 0 ? (
					<div className="text-center py-20 text-gray-400">
						<Package size={40} className="mx-auto mb-3 text-gray-200" />
						<p>Produk tidak ditemukan</p>
					</div>
				) : (
					<div className={`grid ${GRID_COLS_CLASS[gridCols]} gap-3 sm:gap-4`}>
						{filtered.map((p) => {
							const harga = hargaUmum(p.harga_katalog);
							const inCart = cart.find((i) => i.id === p.id);
							const habis = p.stok <= 0;
							const grad = pickGradient(p.nama);
							return (
								<div
									key={p.id}
									className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col">
									{/* Foto */}
									<div
										onClick={() => router.push(`/toko/${p.id}`)}
										className="relative cursor-pointer">
										{p.thumb ? (
											<img
												src={imgUrl(p.thumb, 500)}
												alt={p.nama}
												loading="lazy"
												className="w-full aspect-square object-cover"
											/>
										) : (
											<div
												className={`w-full aspect-square bg-gradient-to-br ${grad} flex items-center justify-center`}>
												<Package size={36} />
											</div>
										)}
										{habis && (
											<div className="absolute inset-0 bg-black/40 flex items-center justify-center">
												<span className="bg-white/90 text-gray-800 text-xs font-bold px-3 py-1 rounded-full">
													Habis
												</span>
											</div>
										)}
									</div>

									{/* Info */}
									<div className="p-3 flex flex-col flex-1">
										<button
											onClick={() => router.push(`/toko/${p.id}`)}
											className="text-left flex-1">
											<p className="text-sm font-semibold text-gray-900 leading-tight line-clamp-2">
												{p.nama}
											</p>
											{p.kategori && (
												<p className="text-xs text-gray-400 mt-0.5">
													{p.kategori}
												</p>
											)}
										</button>
										<div className="mt-2 flex items-center justify-between gap-1">
											<p className="text-sm font-bold text-indigo-700">
												{formatRp(harga)}
											</p>
											<span className="text-xs text-gray-400">/{p.satuan}</span>
										</div>

										{/* Tombol tambah */}
										{!habis &&
											(inCart ? (
												<div className="mt-2 flex items-center justify-between bg-indigo-50 rounded-xl px-2 py-1">
													<button
														onClick={() => changeQty(p.id, -1)}
														className="w-7 h-7 flex items-center justify-center text-indigo-600 hover:bg-white rounded-lg transition">
														<Minus size={14} />
													</button>
													<span className="text-sm font-bold text-indigo-700">
														{inCart.qty}
													</span>
													<button
														onClick={() => changeQty(p.id, 1)}
														className="w-7 h-7 flex items-center justify-center text-indigo-600 hover:bg-white rounded-lg transition">
														<Plus size={14} />
													</button>
												</div>
											) : (
												<button
													onClick={() => addToCart(p)}
													className="mt-2 w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl transition flex items-center justify-center gap-1">
													<ShoppingCart size={13} /> Tambah
												</button>
											))}
									</div>
								</div>
							);
						})}
					</div>
				)}
			</main>

			{/* ── Cart Slide-over ── */}
			{cartOpen && (
				<div className="fixed inset-0 z-50 flex justify-end">
					<div
						className="absolute inset-0 bg-black/40"
						onClick={() => setCartOpen(false)}
					/>
					<div className="relative w-full max-w-sm bg-white h-full flex flex-col shadow-2xl">
						{/* Cart Header */}
						<div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 flex-shrink-0">
							<div className="flex items-center gap-2">
								<ShoppingCart size={18} className="text-indigo-600" />
								<h2 className="font-semibold text-gray-900">Keranjang</h2>
								{totalItem > 0 && (
									<span className="bg-indigo-100 text-indigo-700 text-xs font-bold px-2 py-0.5 rounded-full">
										{totalItem}
									</span>
								)}
							</div>
							<button
								onClick={() => setCartOpen(false)}
								className="p-2 hover:bg-gray-100 rounded-xl">
								<X size={18} />
							</button>
						</div>

						{/* Cart Items */}
						<div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
							{cart.length === 0 ? (
								<div className="text-center py-16 text-gray-400">
									<ShoppingCart
										size={40}
										className="mx-auto mb-3 text-gray-200"
									/>
									<p className="text-sm">Keranjang masih kosong</p>
								</div>
							) : (
								cart.map((item) => (
									<div
										key={item.id}
										className="flex items-center gap-3 bg-gray-50 rounded-2xl p-3">
										{item.foto ? (
											<img
												src={imgUrl(item.foto, 120)}
												alt={item.nama}
												loading="lazy"
												className="w-14 h-14 object-cover rounded-xl flex-shrink-0"
											/>
										) : (
											<div className="w-14 h-14 bg-gray-200 rounded-xl flex-shrink-0 flex items-center justify-center">
												<Package size={20} className="text-gray-400" />
											</div>
										)}
										<div className="flex-1 min-w-0">
											<p className="text-sm font-semibold text-gray-900 line-clamp-1">
												{item.nama}
											</p>
											<p className="text-xs text-indigo-600 font-bold mt-0.5">
												{formatRp(item.harga)}
											</p>
											<div className="flex items-center gap-2 mt-1.5">
												<button
													onClick={() => changeQty(item.id, -1)}
													className="w-6 h-6 flex items-center justify-center bg-white border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50">
													<Minus size={12} />
												</button>
												<span className="text-sm font-bold text-gray-900 w-5 text-center">
													{item.qty}
												</span>
												<button
													onClick={() => changeQty(item.id, 1)}
													className="w-6 h-6 flex items-center justify-center bg-white border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50">
													<Plus size={12} />
												</button>
												<button
													onClick={() => removeItem(item.id)}
													className="ml-auto p-1 text-red-400 hover:text-red-600">
													<Trash2 size={14} />
												</button>
											</div>
										</div>
									</div>
								))
							)}
						</div>

						{/* Cart Footer */}
						{cart.length > 0 && (
							<div className="px-5 py-4 border-t border-gray-100 space-y-3 flex-shrink-0">
								<div className="flex justify-between items-center">
									<span className="text-sm text-gray-500">Total</span>
									<span className="text-lg font-bold text-gray-900">
										{formatRp(totalHarga)}
									</span>
								</div>
								<button
									onClick={checkout}
									className="w-full flex items-center justify-center gap-2 py-3.5 bg-green-600 hover:bg-green-700 text-white rounded-2xl font-semibold text-sm transition">
									<MessageCircle size={18} />
									Pesan via WhatsApp
								</button>
								<p className="text-xs text-center text-gray-400">
									Anda akan diarahkan ke WhatsApp untuk konfirmasi pesanan
								</p>
							</div>
						)}
					</div>
				</div>
			)}

			{/* Floating cart button (mobile) */}
			{totalItem > 0 && !cartOpen && (
				<button
					onClick={() => setCartOpen(true)}
					className="fixed bottom-6 right-4 z-40 flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-3 rounded-2xl shadow-lg shadow-indigo-200 transition">
					<ShoppingCart size={18} />
					<span className="font-semibold text-sm">{totalItem} item</span>
					<span className="text-indigo-200">·</span>
					<span className="text-sm font-bold">{formatRp(totalHarga)}</span>
				</button>
			)}

			<ChatWidget accent="indigo" />
		</div>
	);
}
