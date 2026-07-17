"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { imgUrl, downloadImage, downloadFilename } from "@/lib/image";
import {
	ArrowLeft,
	ShoppingCart,
	Plus,
	Minus,
	Package,
	ChevronLeft,
	ChevronRight,
	MessageCircle,
	X,
	Trash2,
	Tag,
	ClipboardList,
	Download,
} from "lucide-react";

const WA_TOKO = process.env.NEXT_PUBLIC_WA_TOKO || "6289630085814";
const CART_KEY = "bng_etalase_cart";

function hargaEtalase(hargaKatalog: number): number {
	return Math.ceil(hargaKatalog * 1.35);
}
function formatRp(n: number): string {
	return new Intl.NumberFormat("id-ID", {
		style: "currency",
		currency: "IDR",
		minimumFractionDigits: 0,
	}).format(n);
}

interface CartItem {
	id: string;
	nama: string;
	harga: number;
	satuan: string;
	foto?: string | null;
	qty: number;
	custom?: boolean;
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
	"from-amber-100 to-amber-200 text-amber-300",
	"from-indigo-100 to-indigo-200 text-indigo-300",
	"from-rose-100 to-rose-200 text-rose-300",
	"from-emerald-100 to-emerald-200 text-emerald-300",
	"from-sky-100 to-sky-200 text-sky-300",
];
function pickGradient(name: string) {
	let h = 0;
	for (let i = 0; i < name.length; i++) {
		h = (h << 5) - h + name.charCodeAt(i);
		h |= 0;
	}
	return GRADIENTS[Math.abs(h) % GRADIENTS.length];
}

export default function EtalaseDetailPage() {
	const { id } = useParams<{ id: string }>();
	const router = useRouter();
	const supabase = createClient();

	const [produk, setProduk] = useState<any>(null);
	const [fotos, setFotos] = useState<string[]>([]);
	const [activeIdx, setActiveIdx] = useState(0);
	const [loading, setLoading] = useState(true);
	const [qty, setQty] = useState(1);
	const [cart, setCart] = useState<CartItem[]>([]);
	const [cartOpen, setCartOpen] = useState(false);
	const [lightbox, setLightbox] = useState(false);
	const [justAdded, setJustAdded] = useState(false);

	useEffect(() => {
		setCart(loadCart());
		load();
	}, [id]);

	const load = async () => {
		setLoading(true);
		const [produkRes, fotoRes] = await Promise.all([
			supabase
				.from("produk")
				.select(
					"id, nama, kategori, satuan, harga_katalog, stok, foto_url, deskripsi",
				)
				.eq("id", id)
				.eq("aktif", true)
				.single(),
			supabase
				.from("produk_foto")
				.select("url")
				.eq("produk_id", id)
				.order("urutan"),
		]);
		setProduk(produkRes.data);
		const urls: string[] =
			fotoRes.data && fotoRes.data.length > 0
				? fotoRes.data.map((f: any) => f.url)
				: produkRes.data?.foto_url
					? [produkRes.data.foto_url]
					: [];
		setFotos(urls);
		setLoading(false);
	};

	const inCart = cart.find((i) => i.id === id);
	const totalItem = cart.reduce((s, i) => s + i.qty, 0);
	const totalHarga = cart.reduce((s, i) => s + i.harga * i.qty, 0);

	const addToCart = () => {
		if (!produk) return;
		const harga = hargaEtalase(produk.harga_katalog);
		const custom = produk.stok <= 0;
		setCart((prev) => {
			const next = prev.find((i) => i.id === produk.id)
				? prev.map((i) => (i.id === produk.id ? { ...i, qty: i.qty + qty } : i))
				: [
						...prev,
						{
							id: produk.id,
							nama: produk.nama,
							harga,
							satuan: produk.satuan,
							foto: fotos[0] || null,
							qty,
							custom,
						},
					];
			saveCart(next);
			return next;
		});
		setJustAdded(true);
		setTimeout(() => setJustAdded(false), 1500);
	};

	const changeQty = (cartId: string, delta: number) => {
		setCart((prev) => {
			const next = prev
				.map((i) => (i.id === cartId ? { ...i, qty: i.qty + delta } : i))
				.filter((i) => i.qty > 0);
			saveCart(next);
			return next;
		});
	};

	const removeItem = (cartId: string) => {
		setCart((prev) => {
			const next = prev.filter((i) => i.id !== cartId);
			saveCart(next);
			return next;
		});
	};

	const checkout = () => {
		if (!cart.length) return;
		const adaCustom = cart.some((i) => i.custom);
		const lines = cart
			.map(
				(i, idx) =>
					`${idx + 1}. ${i.nama} × ${i.qty} ${i.satuan} = ${formatRp(i.harga * i.qty)}${i.custom ? " (PO/Custom — stok kosong)" : ""}`,
			)
			.join("\n");
		const msg = `Halo BungaNaik! 👋\n\nSaya ingin memesan dari Etalase:\n\n${lines}\n\n*Total: ${formatRp(totalHarga)}*\n\n${adaCustom ? "Untuk item PO/Custom, mohon info estimasi proses & waktu selesainya. " : ""}Mohon konfirmasi ketersediaan dan info pengirimannya. Terima kasih 🙏`;
		window.open(
			`https://wa.me/${WA_TOKO}?text=${encodeURIComponent(msg)}`,
			"_blank",
		);
	};

	if (loading) {
		return (
			<div className="min-h-screen bg-gray-50 flex items-center justify-center">
				<div className="text-gray-400 text-sm">Memuat produk...</div>
			</div>
		);
	}
	if (!produk) {
		return (
			<div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center gap-4">
				<Package size={48} className="text-gray-200" />
				<p className="text-gray-500">Produk tidak ditemukan</p>
				<button
					onClick={() => router.push("/etalase")}
					className="px-5 py-2.5 bg-amber-500 text-white rounded-xl text-sm font-medium">
					Kembali ke Etalase
				</button>
			</div>
		);
	}

	const harga = hargaEtalase(produk.harga_katalog);
	const habis = produk.stok <= 0;
	const grad = pickGradient(produk.nama);

	return (
		<div className="min-h-screen bg-gray-50">
			<div className="sticky top-0 z-30 bg-white border-b border-gray-100 shadow-sm">
				<div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
					<button
						onClick={() => router.push("/etalase")}
						className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900 transition">
						<ArrowLeft size={18} />
						Kembali
					</button>
					<button
						onClick={() => setCartOpen(true)}
						className="relative flex items-center gap-1.5 text-sm text-amber-600 font-medium">
						<ShoppingCart size={18} />
						{totalItem > 0 && (
							<span className="absolute -top-2 -right-2 w-4 h-4 bg-amber-600 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
								{totalItem}
							</span>
						)}
					</button>
				</div>
			</div>

			<div className="max-w-2xl mx-auto">
				<div className="relative bg-white">
					{fotos.length > 0 ? (
						<>
							<img
								src={imgUrl(fotos[activeIdx])}
								alt={produk.nama}
								onClick={() => setLightbox(true)}
								className="w-full aspect-square object-cover cursor-zoom-in"
							/>
							<button
								onClick={(e) => {
									e.stopPropagation();
									downloadImage(fotos[activeIdx], downloadFilename(produk.nama, fotos[activeIdx], activeIdx));
								}}
								className="absolute top-3 right-3 w-9 h-9 bg-white/80 hover:bg-white rounded-full flex items-center justify-center shadow-sm transition"
								aria-label="Simpan foto"
								title="Simpan foto">
								<Download size={16} />
							</button>
							{fotos.length > 1 && (
								<>
									<button
										onClick={() =>
											setActiveIdx((i) => (i - 1 + fotos.length) % fotos.length)
										}
										className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 bg-white/80 hover:bg-white rounded-full flex items-center justify-center shadow-sm transition">
										<ChevronLeft size={18} />
									</button>
									<button
										onClick={() => setActiveIdx((i) => (i + 1) % fotos.length)}
										className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 bg-white/80 hover:bg-white rounded-full flex items-center justify-center shadow-sm transition">
										<ChevronRight size={18} />
									</button>
									<div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
										{fotos.map((_, i) => (
											<button
												key={i}
												onClick={() => setActiveIdx(i)}
												className={`rounded-full transition ${i === activeIdx ? "w-4 h-1.5 bg-white" : "w-1.5 h-1.5 bg-white/50"}`}
											/>
										))}
									</div>
								</>
							)}
							{habis && (
								<div className="absolute inset-0 bg-black/40 flex items-center justify-center">
									<span className="bg-white text-gray-800 font-bold px-4 py-2 rounded-xl">
										Stok Habis · Bisa PO
									</span>
								</div>
							)}
						</>
					) : (
						<div
							className={`w-full aspect-square bg-gradient-to-br ${grad} flex items-center justify-center`}>
							<Package size={64} />
						</div>
					)}

					{fotos.length > 1 && (
						<div className="flex gap-2 px-4 py-3 overflow-x-auto border-t border-gray-50">
							{fotos.map((url, i) => (
								<button
									key={i}
									onClick={() => setActiveIdx(i)}
									className={`w-14 h-14 flex-shrink-0 rounded-xl overflow-hidden border-2 transition ${i === activeIdx ? "border-amber-500" : "border-gray-200"}`}>
									<img
										src={imgUrl(url, 120)}
										alt=""
										loading="lazy"
										className="w-full h-full object-cover"
									/>
								</button>
							))}
						</div>
					)}
				</div>

				<div className="bg-white mt-2 px-5 py-5 space-y-4">
					{produk.kategori && (
						<span className="inline-flex items-center gap-1 text-xs text-amber-600 bg-amber-50 px-2.5 py-1 rounded-full font-medium">
							<Tag size={11} /> {produk.kategori}
						</span>
					)}
					<h1 className="text-xl font-bold text-gray-900 leading-tight">
						{produk.nama}
					</h1>

					<div className="bg-amber-50 rounded-2xl px-4 py-4">
						<p className="text-xs text-amber-500 font-medium mb-1">Harga</p>
						<p className="text-3xl font-bold text-amber-600">
							{formatRp(harga)}
						</p>
						<p className="text-xs text-amber-400 mt-1">per {produk.satuan}</p>
					</div>

					<div className="flex items-center gap-2">
						<div
							className={`w-2 h-2 rounded-full ${habis ? "bg-red-400" : "bg-green-400"}`}
						/>
						<span
							className={`text-sm font-medium ${habis ? "text-red-500" : "text-green-600"}`}>
							{habis ? "Stok habis" : "Tersedia"}
						</span>
					</div>

					{produk.deskripsi && (
						<div>
							<p className="text-sm font-semibold text-gray-700 mb-1.5">
								Deskripsi
							</p>
							<p className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap">
								{produk.deskripsi}
							</p>
						</div>
					)}
				</div>

				<div className="bg-white mt-2 px-5 py-5 space-y-4">
						{habis && (
							<div className="flex items-center gap-2 bg-amber-50 border border-amber-100 text-amber-700 text-xs font-medium px-3 py-2.5 rounded-xl">
								<ClipboardList size={14} className="flex-shrink-0" />
								Stok sedang kosong — pesan sebagai PO/Custom, tim kami akan proses dan konfirmasi lewat WhatsApp.
							</div>
						)}
						<div className="flex items-center gap-4">
							<p className="text-sm font-medium text-gray-700">Jumlah</p>
							<div className="flex items-center gap-3 bg-gray-50 rounded-xl px-3 py-2">
								<button
									onClick={() => setQty((q) => Math.max(1, q - 1))}
									className="w-7 h-7 flex items-center justify-center hover:bg-white rounded-lg transition text-gray-600">
									<Minus size={14} />
								</button>
								<span className="text-base font-bold text-gray-900 w-8 text-center">
									{qty}
								</span>
								<button
									onClick={() => setQty((q) => q + 1)}
									className="w-7 h-7 flex items-center justify-center hover:bg-white rounded-lg transition text-gray-600">
									<Plus size={14} />
								</button>
							</div>
							<p className="text-sm text-gray-400">{produk.satuan}</p>
						</div>
						<p className="text-sm text-gray-500">
							Subtotal:{" "}
							<span className="font-bold text-gray-900">
								{formatRp(harga * qty)}
							</span>
						</p>
						<button
							onClick={addToCart}
							className={`w-full py-4 rounded-2xl font-semibold text-sm flex items-center justify-center gap-2 transition ${
								justAdded
									? "bg-green-500 text-white"
									: habis
										? "bg-white border-2 border-amber-400 text-amber-600 hover:bg-amber-50"
										: "bg-amber-500 hover:bg-amber-600 text-white"
							}`}>
							{habis ? <ClipboardList size={18} /> : <ShoppingCart size={18} />}
							{justAdded
								? "Ditambahkan!"
								: inCart
									? `Tambah lagi (${inCart.qty} di keranjang)`
									: habis
										? "Pesan Custom/PO"
										: "Tambah ke Keranjang"}
						</button>
				</div>

				<div className="bg-white mt-2 px-5 py-5 mb-8">
					<button
						onClick={() => {
							const msg = `Halo BungaNaik! 👋\n\nSaya tertarik dengan produk:\n*${produk.nama}*\n\nBoleh info ketersediaan dan cara pemesanannya? Terima kasih 🙏`;
							window.open(
								`https://wa.me/${WA_TOKO}?text=${encodeURIComponent(msg)}`,
								"_blank",
							);
						}}
						className="w-full flex items-center justify-center gap-2 py-3.5 border-2 border-green-500 text-green-600 hover:bg-green-50 rounded-2xl font-semibold text-sm transition">
						<MessageCircle size={18} />
						Tanya via WhatsApp
					</button>
				</div>
			</div>

			{lightbox && fotos.length > 0 && (
				<div
					className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center"
					onClick={() => setLightbox(false)}>
					<button className="absolute top-4 right-4 text-white/70 hover:text-white">
						<X size={28} />
					</button>
					<button
						onClick={(e) => {
							e.stopPropagation();
							downloadImage(fotos[activeIdx], downloadFilename(produk.nama, fotos[activeIdx], activeIdx));
						}}
						className="absolute top-4 left-4 text-white/70 hover:text-white"
						aria-label="Simpan foto"
						title="Simpan foto">
						<Download size={24} />
					</button>
					<img
						src={imgUrl(fotos[activeIdx])}
						alt=""
						className="max-w-full max-h-full object-contain"
					/>
				</div>
			)}

			{cartOpen && (
				<div className="fixed inset-0 z-50 flex justify-end">
					<div
						className="absolute inset-0 bg-black/40"
						onClick={() => setCartOpen(false)}
					/>
					<div className="relative w-full max-w-sm bg-white h-full flex flex-col shadow-2xl">
						<div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 flex-shrink-0">
							<div className="flex items-center gap-2">
								<ShoppingCart size={18} className="text-amber-600" />
								<h2 className="font-semibold text-gray-900">Keranjang</h2>
								{totalItem > 0 && (
									<span className="bg-amber-100 text-amber-700 text-xs font-bold px-2 py-0.5 rounded-full">
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
											<div className="flex items-center gap-1.5">
												<p className="text-sm font-semibold text-gray-900 line-clamp-1">
													{item.nama}
												</p>
												{item.custom && (
													<span className="flex-shrink-0 text-[10px] font-bold text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded-full">
														PO/Custom
													</span>
												)}
											</div>
											<p className="text-xs text-amber-600 font-bold mt-0.5">
												{formatRp(item.harga)}
											</p>
											<div className="flex items-center gap-2 mt-1.5">
												<button
													onClick={() => changeQty(item.id, -1)}
													className="w-6 h-6 flex items-center justify-center bg-white border border-gray-200 rounded-lg">
													<Minus size={12} />
												</button>
												<span className="text-sm font-bold w-5 text-center">
													{item.qty}
												</span>
												<button
													onClick={() => changeQty(item.id, 1)}
													className="w-6 h-6 flex items-center justify-center bg-white border border-gray-200 rounded-lg">
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
						{cart.length > 0 && (
							<div className="px-5 py-4 border-t border-gray-100 space-y-3 flex-shrink-0">
								<div className="flex justify-between">
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
							</div>
						)}
					</div>
				</div>
			)}
		</div>
	);
}
