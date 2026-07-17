"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { formatRupiah } from "@/lib/utils";
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
	Lock,
	Eye,
	EyeOff,
	Download,
} from "lucide-react";

const ACCESS_KEY = "bng_access_verified";

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

export default function ProdukDetailPage() {
	const { id } = useParams<{ id: string }>();
	const router = useRouter();
	const supabase = createClient();

	// Gate state
	const [unlocked, setUnlocked] = useState(false);
	const [kodeInput, setKodeInput] = useState("");
	const [kodeError, setKodeError] = useState("");
	const [kodeLoading, setKodeLoading] = useState(false);
	const [showKode, setShowKode] = useState(false);

	const [produk, setProduk] = useState<any>(null);
	const [fotos, setFotos] = useState<string[]>([]);
	const [activeIdx, setActiveIdx] = useState(0);
	const [loading, setLoading] = useState(true);
	const [qty, setQty] = useState(1);
	const [cart, setCart] = useState<CartItem[]>([]);
	const [cartOpen, setCartOpen] = useState(false);
	const [justAdded, setJustAdded] = useState(false);
	const [lightbox, setLightbox] = useState(false);

	useEffect(() => {
		// Cek apakah sesi ini sudah terverifikasi
		if (sessionStorage.getItem(ACCESS_KEY) === "1") {
			setUnlocked(true);
		}
		setCart(loadCart());
		load();
	}, [id]);

	const verifyKode = async () => {
		if (!kodeInput.trim()) {
			setKodeError("Masukkan kode akses terlebih dahulu.");
			return;
		}
		setKodeLoading(true);
		setKodeError("");
		try {
			const res = await fetch("/api/verify-kode", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ kode: kodeInput }),
			});
			if (res.ok) {
				sessionStorage.setItem(ACCESS_KEY, "1");
				setUnlocked(true);
			} else {
				setKodeError("Kode salah. Silakan coba lagi.");
			}
		} catch {
			setKodeError("Gagal memverifikasi. Periksa koneksi internet.");
		}
		setKodeLoading(false);
	};

	const load = async () => {
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
	const totalItems = cart.reduce((s, i) => s + i.qty, 0);
	const totalHarga = cart.reduce((s, i) => s + i.harga_katalog * i.qty, 0);

	const addToCart = () => {
		if (!produk) return;
		setCart((prev) => {
			const exists = prev.find((i) => i.id === produk.id);
			const next = exists
				? prev.map((i) => (i.id === produk.id ? { ...i, qty: i.qty + qty } : i))
				: [
						...prev,
						{
							id: produk.id,
							nama: produk.nama,
							harga_katalog: produk.harga_katalog,
							satuan: produk.satuan,
							foto_url: fotos[0] || null,
							qty,
						},
					];
			saveCart(next);
			return next;
		});
		setJustAdded(true);
		setTimeout(() => setJustAdded(false), 1500);
	};

	const updateQty = (cartId: string, delta: number) => {
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
		const msg = `Halo Bunganaik! 👋\n\nSaya ingin memesan:\n\n${lines}\n\n*Total: ${fmt(totalHarga)}*\n\nMohon konfirmasi ketersediaan dan info pengirimannya. Terima kasih 🙏`;
		window.open(
			`https://wa.me/${WA_TOKO}?text=${encodeURIComponent(msg)}`,
			"_blank",
		);
	};

	if (loading) {
		return (
			<div className="min-h-screen bg-gray-50 flex items-center justify-center">
				<div className="text-gray-400">Memuat produk...</div>
			</div>
		);
	}

	// ── Gate: kode internal wajib diisi sebelum lihat detail ─────────────────
	if (!unlocked) {
		return (
			<div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex flex-col items-center justify-center px-5">
				<div className="w-full max-w-sm">
					{/* Logo / Branding */}
					<div className="text-center mb-8">
						<div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-indigo-200">
							<Lock size={28} className="text-white" />
						</div>
						<h1 className="text-xl font-bold text-gray-900">
							BungaNaik Furniture
						</h1>
						<p className="text-sm text-gray-500 mt-1">
							Masukkan kode akses untuk melihat detail produk
						</p>
					</div>

					{/* Card */}
					<div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 space-y-4">
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-1.5">
								Kode Akses
							</label>
							<div className="relative">
								<input
									type={showKode ? "text" : "password"}
									value={kodeInput}
									onChange={(e) => {
										setKodeInput(e.target.value);
										setKodeError("");
									}}
									onKeyDown={(e) => {
										if (e.key === "Enter") verifyKode();
									}}
									placeholder="Masukkan kode..."
									autoFocus
									className="w-full px-4 py-3 border border-gray-200 rounded-2xl text-sm pr-11 focus:outline-none focus:ring-2 focus:ring-indigo-500 tracking-widest font-mono"
								/>
								<button
									type="button"
									onClick={() => setShowKode(!showKode)}
									className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1">
									{showKode ? <EyeOff size={16} /> : <Eye size={16} />}
								</button>
							</div>
							{kodeError && (
								<p className="text-sm text-red-500 mt-1.5 flex items-center gap-1">
									<X size={13} /> {kodeError}
								</p>
							)}
						</div>

						<button
							onClick={verifyKode}
							disabled={kodeLoading || !kodeInput.trim()}
							className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white rounded-2xl text-sm font-semibold transition">
							{kodeLoading ? "Memverifikasi..." : "Masuk"}
						</button>
					</div>

					<p className="text-center text-xs text-gray-400 mt-6">
						Hubungi staff BungaNaik jika tidak memiliki kode akses.
					</p>
				</div>
			</div>
		);
	}

	if (!produk) {
		return (
			<div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center gap-4">
				<Package size={48} className="text-gray-300" />
				<p className="text-gray-500">Produk tidak ditemukan</p>
				<button
					onClick={() => router.push("/katalog")}
					className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 transition">
					Kembali ke Katalog
				</button>
			</div>
		);
	}

	const grad = pickGradient(produk.nama);
	const gradClass = grad.split(" ").slice(0, 2).join(" ");
	const textClass = grad.split(" ")[2];
	const mainFoto = fotos[activeIdx];

	return (
		<div className="min-h-screen bg-gray-50">
			{/* ─── HEADER ─── */}
			<header className="sticky top-0 z-40 bg-white border-b border-gray-100 shadow-sm">
				<div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between gap-3">
					<button
						onClick={() => router.back()}
						className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900 transition">
						<ArrowLeft size={16} />
						<span className="hidden sm:inline">Kembali</span>
					</button>
					<p className="font-semibold text-gray-900 text-sm truncate flex-1 text-center px-4">
						{produk.nama}
					</p>
					<button
						onClick={() => setCartOpen(true)}
						className="relative flex items-center gap-2 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-medium transition flex-shrink-0">
						<ShoppingCart size={16} />
						<span className="hidden sm:inline">Keranjang</span>
						{totalItems > 0 && (
							<span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center shadow-sm">
								{totalItems > 9 ? "9+" : totalItems}
							</span>
						)}
					</button>
				</div>
			</header>

			{/* ─── CONTENT ─── */}
			<main className="max-w-5xl mx-auto px-4 py-6">
				<div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
					{/* ─── GALLERY ─── */}
					<div>
						{/* Main photo */}
						<div
							className={`relative w-full aspect-square rounded-2xl overflow-hidden bg-gradient-to-br ${gradClass} cursor-pointer`}
							onClick={() => fotos.length > 0 && setLightbox(true)}>
							{mainFoto ? (
								<img
									src={imgUrl(mainFoto)}
									alt={produk.nama}
									className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
								/>
							) : (
								<div className="w-full h-full flex items-center justify-center">
									<Package size={72} className={`${textClass} opacity-40`} />
								</div>
							)}
							{/* Tombol simpan foto */}
							{mainFoto && (
								<button
									onClick={(e) => {
										e.stopPropagation();
										downloadImage(mainFoto, downloadFilename(produk.nama, mainFoto, activeIdx));
									}}
									className="absolute top-3 right-3 w-9 h-9 bg-white/80 backdrop-blur-sm rounded-full flex items-center justify-center shadow hover:bg-white transition"
									aria-label="Simpan foto"
									title="Simpan foto">
									<Download size={16} />
								</button>
							)}
							{/* Arrow navigasi */}
							{fotos.length > 1 && (
								<>
									<button
										onClick={(e) => {
											e.stopPropagation();
											setActiveIdx(
												(i) => (i - 1 + fotos.length) % fotos.length,
											);
										}}
										className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 bg-white/80 backdrop-blur-sm rounded-full flex items-center justify-center shadow hover:bg-white transition">
										<ChevronLeft size={18} />
									</button>
									<button
										onClick={(e) => {
											e.stopPropagation();
											setActiveIdx((i) => (i + 1) % fotos.length);
										}}
										className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 bg-white/80 backdrop-blur-sm rounded-full flex items-center justify-center shadow hover:bg-white transition">
										<ChevronRight size={18} />
									</button>
									<div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
										{fotos.map((_, i) => (
											<button
												key={i}
												onClick={(e) => {
													e.stopPropagation();
													setActiveIdx(i);
												}}
												className={`w-2 h-2 rounded-full transition ${i === activeIdx ? "bg-white" : "bg-white/50"}`}
											/>
										))}
									</div>
								</>
							)}
							{fotos.length > 0 && (
								<span className="absolute top-3 right-3 bg-black/40 backdrop-blur-sm text-white text-[10px] px-2 py-0.5 rounded-full">
									{activeIdx + 1}/{fotos.length}
								</span>
							)}
							{fotos.length > 0 && (
								<span className="absolute bottom-3 right-3 bg-black/40 backdrop-blur-sm text-white text-[10px] px-2 py-0.5 rounded-full">
									Tap untuk perbesar
								</span>
							)}
						</div>

						{/* Thumbnails strip */}
						{fotos.length > 1 && (
							<div className="flex gap-2 mt-3 overflow-x-auto pb-1">
								{fotos.map((url, i) => (
									<button
										key={i}
										onClick={() => setActiveIdx(i)}
										className={`flex-shrink-0 w-16 h-16 rounded-xl overflow-hidden border-2 transition ${
											i === activeIdx
												? "border-indigo-500"
												: "border-transparent opacity-70 hover:opacity-100"
										}`}>
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

					{/* ─── INFO ─── */}
					<div className="flex flex-col gap-4">
						{produk.kategori && (
							<span className="self-start bg-indigo-50 text-indigo-600 text-xs font-semibold px-3 py-1 rounded-full">
								{produk.kategori}
							</span>
						)}
						<h1 className="text-2xl font-bold text-gray-900 leading-snug">
							{produk.nama}
						</h1>
						<div className="space-y-1.5">
							<p className="text-3xl font-bold text-indigo-600">
								{formatRupiah(produk.harga_katalog)}
							</p>
							<p className="text-sm text-gray-400">per {produk.satuan}</p>
							<div className="inline-flex items-center gap-2 bg-orange-50 border border-orange-100 rounded-xl px-3 py-2 mt-1">
								<span className="text-xs text-orange-500 font-medium">
									Rek. harga jual (+25%)
								</span>
								<span className="text-base font-bold text-orange-700">
									{formatRupiah(Math.ceil(produk.harga_katalog * 1.25))}
								</span>
							</div>
						</div>

						<div className="flex items-center gap-2">
							<span
								className={`w-2 h-2 rounded-full ${produk.stok > 0 ? "bg-green-500" : "bg-red-500"}`}
							/>
							<span
								className={`text-sm font-medium ${produk.stok > 0 ? "text-green-700" : "text-red-600"}`}>
								{produk.stok > 0
									? `Stok tersedia (${produk.stok} ${produk.satuan})`
									: "Stok habis"}
							</span>
						</div>

						{produk.deskripsi && (
							<div className="bg-gray-50 rounded-2xl p-4">
								<p className="text-sm font-semibold text-gray-700 mb-2">
									Deskripsi
								</p>
								<p className="text-sm text-gray-600 leading-relaxed whitespace-pre-line">
									{produk.deskripsi}
								</p>
							</div>
						)}

						{produk.stok > 0 && (
							<div className="space-y-3 pt-2">
								<div className="flex items-center gap-3">
									<p className="text-sm font-medium text-gray-700">Jumlah:</p>
									<div className="flex items-center bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
										<button
											onClick={() => setQty((q) => Math.max(1, q - 1))}
											className="px-3 py-2 hover:bg-gray-50 text-gray-600 transition">
											<Minus size={14} />
										</button>
										<span className="px-4 py-2 text-sm font-bold text-gray-900 min-w-[2.5rem] text-center">
											{qty}
										</span>
										<button
											onClick={() =>
												setQty((q) => Math.min(produk.stok, q + 1))
											}
											className="px-3 py-2 hover:bg-gray-50 text-gray-600 transition">
											<Plus size={14} />
										</button>
									</div>
									{inCart && (
										<span className="text-xs text-indigo-600 font-medium">
											{inCart.qty} di keranjang
										</span>
									)}
								</div>

								<button
									onClick={addToCart}
									className={`w-full py-3.5 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition-all ${
										justAdded
											? "bg-green-500 text-white scale-[0.98]"
											: "bg-indigo-600 hover:bg-indigo-700 text-white active:scale-[0.98]"
									}`}>
									<ShoppingCart size={17} />
									{justAdded
										? "✓ Ditambahkan ke Keranjang!"
										: "+ Masukkan Keranjang"}
								</button>

								{inCart && (
									<button
										onClick={() => setCartOpen(true)}
										className="w-full py-3 rounded-2xl font-semibold text-sm border-2 border-indigo-200 text-indigo-600 hover:bg-indigo-50 transition flex items-center justify-center gap-2">
										<ShoppingCart size={15} />
										Lihat Keranjang ({totalItems} item)
									</button>
								)}
							</div>
						)}

						<p className="text-xs text-gray-400 text-center pt-2">
							Harga dapat berubah sewaktu-waktu. Hubungi kami untuk konfirmasi.
						</p>
					</div>
				</div>
			</main>

			{/* ─── LIGHTBOX ─── */}
			{lightbox && fotos.length > 0 && (
				<div
					className="fixed inset-0 z-50 bg-black/92 flex items-center justify-center p-4"
					onClick={() => setLightbox(false)}>
					<button
						onClick={() => setLightbox(false)}
						className="absolute top-4 right-4 w-10 h-10 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center text-white transition">
						<X size={20} />
					</button>
					<button
						onClick={(e) => {
							e.stopPropagation();
							downloadImage(fotos[activeIdx], downloadFilename(produk.nama, fotos[activeIdx], activeIdx));
						}}
						className="absolute top-4 left-4 w-10 h-10 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center text-white transition"
						aria-label="Simpan foto"
						title="Simpan foto">
						<Download size={18} />
					</button>
					{fotos.length > 1 && (
						<>
							<button
								onClick={(e) => {
									e.stopPropagation();
									setActiveIdx((i) => (i - 1 + fotos.length) % fotos.length);
								}}
								className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center text-white transition">
								<ChevronLeft size={20} />
							</button>
							<button
								onClick={(e) => {
									e.stopPropagation();
									setActiveIdx((i) => (i + 1) % fotos.length);
								}}
								className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center text-white transition">
								<ChevronRight size={20} />
							</button>
						</>
					)}
					<img
						src={imgUrl(fotos[activeIdx])}
						alt=""
						onClick={(e) => e.stopPropagation()}
						className="max-h-[85vh] max-w-full object-contain rounded-xl shadow-2xl"
					/>
					{fotos.length > 1 && (
						<div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2">
							{fotos.map((_, i) => (
								<button
									key={i}
									onClick={(e) => {
										e.stopPropagation();
										setActiveIdx(i);
									}}
									className={`w-2 h-2 rounded-full transition ${i === activeIdx ? "bg-white" : "bg-white/40"}`}
								/>
							))}
						</div>
					)}
				</div>
			)}

			{/* ─── CART DRAWER ─── */}
			{cartOpen && (
				<div className="fixed inset-0 z-50 flex">
					<div
						className="flex-1 bg-black/40 backdrop-blur-sm"
						onClick={() => setCartOpen(false)}
					/>
					<div className="w-full max-w-sm bg-white shadow-2xl flex flex-col">
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
							<button
								onClick={() => setCartOpen(false)}
								className="p-2 hover:bg-gray-100 rounded-lg transition">
								<X size={18} />
							</button>
						</div>

						{cart.length === 0 ? (
							<div className="flex-1 flex flex-col items-center justify-center gap-3 text-center px-8">
								<div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center">
									<ShoppingCart size={32} className="text-gray-300" />
								</div>
								<p className="font-semibold text-gray-600">Keranjang kosong</p>
								<button
									onClick={() => setCartOpen(false)}
									className="mt-2 px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 transition">
									Lanjut Belanja
								</button>
							</div>
						) : (
							<>
								<div className="flex-1 overflow-y-auto p-4 space-y-3">
									{cart.map((item) => {
										const gc = pickGradient(item.nama)
											.split(" ")
											.slice(0, 2)
											.join(" ");
										const tc = pickGradient(item.nama).split(" ")[2];
										return (
											<div
												key={item.id}
												className="flex gap-3 bg-gray-50 rounded-2xl p-3 border border-gray-100">
												<div
													className={`w-14 h-14 rounded-xl bg-gradient-to-br ${gc} flex-shrink-0 overflow-hidden`}>
													{item.foto_url ? (
														<img
															src={imgUrl(item.foto_url, 120)}
															alt=""
															loading="lazy"
															className="w-full h-full object-cover"
														/>
													) : (
														<div className="w-full h-full flex items-center justify-center">
															<Package
																size={20}
																className={`${tc} opacity-50`}
															/>
														</div>
													)}
												</div>
												<div className="flex-1 min-w-0">
													<p className="font-semibold text-gray-900 text-sm line-clamp-1">
														{item.nama}
													</p>
													<p className="text-indigo-600 font-bold text-sm">
														{formatRupiah(item.harga_katalog)}
													</p>
													<div className="flex items-center gap-2 mt-1.5">
														<div className="flex items-center bg-white border border-gray-200 rounded-lg overflow-hidden">
															<button
																onClick={() => updateQty(item.id, -1)}
																className="px-2 py-1 hover:bg-gray-50 text-gray-600">
																<Minus size={12} />
															</button>
															<span className="px-3 text-sm font-bold text-gray-800">
																{item.qty}
															</span>
															<button
																onClick={() => updateQty(item.id, 1)}
																className="px-2 py-1 hover:bg-gray-50 text-gray-600">
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
								<div className="p-4 border-t border-gray-100 bg-white space-y-3">
									<div className="flex items-center justify-between">
										<span className="text-sm text-gray-500">
											Total ({totalItems} item)
										</span>
										<span className="text-xl font-bold text-gray-900">
											{formatRupiah(totalHarga)}
										</span>
									</div>
									<button
										onClick={handleCheckout}
										className="w-full py-3.5 bg-green-500 hover:bg-green-600 text-white rounded-2xl font-bold text-sm flex items-center justify-center gap-2.5 transition-all shadow-sm shadow-green-200">
										<MessageCircle size={18} />
										Pesan via WhatsApp
									</button>
								</div>
							</>
						)}
					</div>
				</div>
			)}
		</div>
	);
}
