"use client";

import { useState } from "react";
import Link from "next/link";
import ChatWidget from "@/components/ChatWidget";
import {
	ClipboardList,
	Wallet,
	Palette,
	Truck,
	ShoppingBag,
	ShieldCheck,
	MessageCircle,
	ArrowRight,
	CheckCircle2,
	Sparkles,
	Menu,
	X,
	MapPin,
	Star,
} from "lucide-react";

const WA_NUMBER = process.env.NEXT_PUBLIC_WA_TOKO || "6289630085814";
const waLink = (msg: string) =>
	`https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(msg)}`;

const FEATURES = [
	{
		icon: ClipboardList,
		title: "Layani Purchase Order",
		desc: "Punya kebutuhan khusus dalam jumlah tertentu? Ajukan PO dan tim kami proses sesuai spesifikasi — cocok untuk kebutuhan rumah, kantor, hingga proyek.",
		color: "bg-indigo-50 text-indigo-600",
	},
	{
		icon: Wallet,
		title: "Bisa Dicicil",
		desc: "Tidak perlu bayar lunas di awal. Cukup DP untuk mulai proses, lalu lunasi bertahap sampai pesanan selesai dan diterima.",
		color: "bg-emerald-50 text-emerald-600",
	},
	{
		icon: Palette,
		title: "100% Bisa Custom",
		desc: "Ukuran, warna, bahan, sampai desain — semua bisa disesuaikan dengan kebutuhan ruangan dan selera Anda, bukan sekadar pilih dari katalog.",
		color: "bg-rose-50 text-rose-600",
	},
	{
		icon: Truck,
		title: "Pengantaran Cepat",
		desc: "Begitu produksi selesai, tim pengiriman kami langsung bergerak mengantar pesanan Anda secepat mungkin ke lokasi tujuan.",
		color: "bg-amber-50 text-amber-600",
	},
	{
		icon: ShoppingBag,
		title: "Etalase Belanja Online",
		desc: "Tidak mau menunggu proses custom? Pilih langsung dari koleksi ready stock kami di Etalase — lihat, pilih, checkout via WhatsApp.",
		color: "bg-violet-50 text-violet-600",
	},
	{
		icon: ShieldCheck,
		title: "Kualitas Terjamin",
		desc: "Setiap produk melalui pengecekan kualitas sebelum dikirim, memastikan Anda menerima furniture terbaik sesuai pesanan.",
		color: "bg-sky-50 text-sky-600",
	},
];

const STEPS = [
	{
		n: "01",
		title: "Konsultasi",
		desc: "Hubungi kami via WhatsApp atau ajukan Purchase Order untuk kebutuhan custom Anda.",
	},
	{
		n: "02",
		title: "DP & Konfirmasi",
		desc: "Bayar uang muka untuk mulai proses — sisanya bisa dicicil sampai lunas.",
	},
	{
		n: "03",
		title: "Diproses",
		desc: "Tim kami mengerjakan pesanan Anda, lengkap dengan update progress berkala.",
	},
	{
		n: "04",
		title: "Kirim & Lacak",
		desc: "Pesanan selesai, kami antar cepat — pantau status pengirimannya lewat nomor resi Anda sendiri.",
	},
];

const TRUST = [
	"Transparan, tidak ada biaya tersembunyi",
	"Proses jelas dan bisa dipantau lewat resi",
	"Fleksibel — custom & cicilan sesuai kebutuhan",
	"Respon cepat lewat WhatsApp",
];

const TESTIMONI = [
	{
		nama: "Dewi Anggraini",
		lokasi: "Makassar",
		avatar: "bg-rose-500",
		isi: "Sofa custom saya jadi pas banget sama ukuran ruang tamu yang mungil. Bisa DP dulu juga jadi nggak berat di awal — proses dari pesan sampai jadi jelas terus.",
	},
	{
		nama: "Budi Santoso",
		lokasi: "Morowali",
		avatar: "bg-indigo-500",
		isi: "Pesan set meja kursi buat toko lewat Purchase Order, jumlahnya lumayan banyak tapi tetap dikerjain sesuai spesifikasi yang saya minta. Recommended buat kebutuhan usaha.",
	},
	{
		nama: "Siti Rahmawati",
		lokasi: "Luwu",
		avatar: "bg-amber-500",
		isi: "Awalnya ragu karena pesan dari luar kota, ternyata pengirimannya cepat dan barang sampai dengan rapi. Bisa pantau statusnya sendiri pakai nomor resi, jadi tenang.",
	},
	{
		nama: "Ahmad Fauzi",
		lokasi: "Mamuju",
		avatar: "bg-emerald-500",
		isi: "Belanja di Etalase-nya gampang banget, tinggal pilih terus checkout via WhatsApp. Kualitas barangnya juga sesuai foto, nggak mengecewakan.",
	},
	{
		nama: "Rina Kartika",
		lokasi: "Sidrap",
		avatar: "bg-violet-500",
		isi: "Pertama kali coba custom furniture dan hasilnya di luar ekspektasi. Timnya sabar banget jawab pertanyaan dan kasih rekomendasi desain.",
	},
	{
		nama: "Hendra Wijaya",
		lokasi: "Palopo",
		avatar: "bg-sky-500",
		isi: "Cicilannya fleksibel, saya lunasi bertahap sampai barang selesai diproduksi. Komunikasinya juga enak, selalu update progress pesanan.",
	},
];

export default function LandingPage() {
	const [navOpen, setNavOpen] = useState(false);

	const ctaMsg =
		"Halo BungaNaik! 👋\n\nSaya ingin tanya-tanya soal pemesanan furniture. Bisa dibantu?";

	return (
		<div className="min-h-screen bg-white text-gray-900">
			{/* ── Nav ── */}
			<header className="sticky top-0 z-40 bg-white/90 backdrop-blur border-b border-gray-100">
				<div className="max-w-6xl mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between">
					<div>
						<p className="text-lg font-extrabold text-indigo-700 leading-none">
							BungaNaik
						</p>
						<p className="text-[11px] text-gray-400 leading-none mt-0.5">
							Furniture Store
						</p>
					</div>

					<nav className="hidden md:flex items-center gap-7 text-sm font-medium text-gray-600">
						<a href="#layanan" className="hover:text-indigo-600 transition">
							Layanan
						</a>
						<a href="#cara-kerja" className="hover:text-indigo-600 transition">
							Cara Kerja
						</a>
						<a href="#kenapa-kami" className="hover:text-indigo-600 transition">
							Kenapa Kami
						</a>
						<a href="#ulasan" className="hover:text-indigo-600 transition">
							Ulasan
						</a>
						<Link href="/etalase" className="hover:text-indigo-600 transition">
							Etalase
						</Link>
					</nav>

					<div className="hidden md:flex items-center gap-2">
						<Link
							href="/etalase"
							className="px-4 py-2 text-sm font-semibold text-indigo-600 hover:bg-indigo-50 rounded-xl transition">
							Lihat Etalase
						</Link>
						<a
							href={waLink(ctaMsg)}
							target="_blank"
							rel="noopener noreferrer"
							className="flex items-center gap-1.5 px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold rounded-xl transition">
							<MessageCircle size={15} /> Chat WhatsApp
						</a>
					</div>

					<button
						onClick={() => setNavOpen(!navOpen)}
						className="md:hidden p-2 text-gray-600">
						{navOpen ? <X size={22} /> : <Menu size={22} />}
					</button>
				</div>

				{navOpen && (
					<div className="md:hidden border-t border-gray-100 px-4 py-4 space-y-3 bg-white">
						<a
							href="#layanan"
							onClick={() => setNavOpen(false)}
							className="block text-sm font-medium text-gray-600">
							Layanan
						</a>
						<a
							href="#cara-kerja"
							onClick={() => setNavOpen(false)}
							className="block text-sm font-medium text-gray-600">
							Cara Kerja
						</a>
						<a
							href="#kenapa-kami"
							onClick={() => setNavOpen(false)}
							className="block text-sm font-medium text-gray-600">
							Kenapa Kami
						</a>
						<a
							href="#ulasan"
							onClick={() => setNavOpen(false)}
							className="block text-sm font-medium text-gray-600">
							Ulasan
						</a>
						<Link
							href="/etalase"
							className="block text-sm font-medium text-indigo-600">
							Lihat Etalase →
						</Link>
						<a
							href={waLink(ctaMsg)}
							target="_blank"
							rel="noopener noreferrer"
							className="flex items-center justify-center gap-1.5 py-2.5 bg-green-600 text-white text-sm font-semibold rounded-xl">
							<MessageCircle size={15} /> Chat WhatsApp
						</a>
					</div>
				)}
			</header>

			{/* ── Hero ── */}
			<section className="relative overflow-hidden bg-gradient-to-b from-indigo-50 via-white to-white">
				<div className="max-w-6xl mx-auto px-4 sm:px-6 pt-14 pb-20 sm:pt-20 sm:pb-28">
					<div className="max-w-2xl">
						<span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-indigo-100 text-indigo-700 text-xs font-semibold mb-5">
							<Sparkles size={12} /> Furniture custom, tanpa ribet
						</span>
						<h1 className="text-4xl sm:text-5xl font-extrabold leading-tight tracking-tight text-gray-900">
							Furniture Sesuai Kebutuhan Anda,{" "}
							<span className="text-indigo-600">Bayar Bisa Dicicil</span>
						</h1>
						<p className="mt-5 text-base sm:text-lg text-gray-500 leading-relaxed">
							Dari pesanan custom lewat Purchase Order sampai belanja langsung
							di Etalase kami — BungaNaik melayani kebutuhan furniture Anda
							dengan proses jelas, cicilan fleksibel, dan pengantaran cepat.
						</p>
						<div className="mt-8 flex flex-wrap items-center gap-3">
							<a
								href={waLink(ctaMsg)}
								target="_blank"
								rel="noopener noreferrer"
								className="flex items-center gap-2 px-6 py-3.5 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-2xl shadow-lg shadow-green-100 transition">
								<MessageCircle size={18} /> Chat via WhatsApp
							</a>
							<Link
								href="/etalase"
								className="flex items-center gap-2 px-6 py-3.5 bg-white border-2 border-indigo-200 hover:border-indigo-400 text-indigo-700 font-semibold rounded-2xl transition">
								Lihat Etalase <ArrowRight size={16} />
							</Link>
						</div>
					</div>
				</div>

				{/* Floating feature badges */}
				<div className="hidden lg:block">
					<div className="absolute top-24 right-10 bg-white rounded-2xl shadow-xl border border-gray-100 px-4 py-3 rotate-3">
						<p className="text-xs text-gray-400">Bisa Dicicil</p>
						<p className="text-sm font-bold text-emerald-600 flex items-center gap-1">
							<Wallet size={14} /> DP + Bertahap
						</p>
					</div>
					<div className="absolute top-56 right-40 bg-white rounded-2xl shadow-xl border border-gray-100 px-4 py-3 -rotate-2">
						<p className="text-xs text-gray-400">Pengantaran</p>
						<p className="text-sm font-bold text-amber-600 flex items-center gap-1">
							<Truck size={14} /> Cepat & Terlacak
						</p>
					</div>
					<div className="absolute top-8 right-56 bg-white rounded-2xl shadow-xl border border-gray-100 px-4 py-3 rotate-2">
						<p className="text-xs text-gray-400">Desain</p>
						<p className="text-sm font-bold text-rose-600 flex items-center gap-1">
							<Palette size={14} /> 100% Custom
						</p>
					</div>
				</div>
			</section>

			{/* ── Layanan / Features ── */}
			<section
				id="layanan"
				className="max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-20">
				<div className="max-w-xl mx-auto text-center mb-12">
					<h2 className="text-2xl sm:text-3xl font-extrabold text-gray-900">
						Semua Kebutuhan Furniture, Satu Tempat
					</h2>
					<p className="mt-3 text-gray-500">
						Baik pesanan custom skala besar maupun belanja satuan langsung —
						kami sediakan caranya.
					</p>
				</div>
				<div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
					{FEATURES.map((f) => (
						<div
							key={f.title}
							className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 hover:shadow-md transition">
							<div
								className={`w-11 h-11 rounded-xl flex items-center justify-center mb-4 ${f.color}`}>
								<f.icon size={20} />
							</div>
							<h3 className="font-bold text-gray-900 mb-1.5">{f.title}</h3>
							<p className="text-sm text-gray-500 leading-relaxed">{f.desc}</p>
						</div>
					))}
				</div>
			</section>

			{/* ── Cara Kerja ── */}
			<section id="cara-kerja" className="bg-gray-50 border-y border-gray-100">
				<div className="max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-20">
					<div className="max-w-xl mx-auto text-center mb-12">
						<h2 className="text-2xl sm:text-3xl font-extrabold text-gray-900">
							Cara Kerjanya Mudah
						</h2>
						<p className="mt-3 text-gray-500">
							Empat langkah sederhana dari konsultasi sampai furniture sampai di
							tangan Anda.
						</p>
					</div>
					<div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
						{STEPS.map((s, i) => (
							<div key={s.n} className="relative">
								<div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 h-full">
									<p className="text-3xl font-extrabold text-indigo-100 mb-2">
										{s.n}
									</p>
									<h3 className="font-bold text-gray-900 mb-1.5">{s.title}</h3>
									<p className="text-sm text-gray-500 leading-relaxed">
										{s.desc}
									</p>
								</div>
								{i < STEPS.length - 1 && (
									<div className="hidden lg:flex absolute top-1/2 -right-3 -translate-y-1/2 text-gray-300">
										<ArrowRight size={18} />
									</div>
								)}
							</div>
						))}
					</div>
				</div>
			</section>

			{/* ── Kenapa Kami ── */}
			<section
				id="kenapa-kami"
				className="max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-20">
				<div className="grid lg:grid-cols-2 gap-10 items-center">
					<div>
						<span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-100 text-amber-700 text-xs font-semibold mb-4">
							<Star size={12} /> Kenapa Pilih BungaNaik
						</span>
						<h2 className="text-2xl sm:text-3xl font-extrabold text-gray-900 mb-4">
							Kami Bangun Kepercayaan Lewat Proses yang Jelas
						</h2>
						<p className="text-gray-500 leading-relaxed mb-6">
							Bukan cuma soal produk — kami pastikan setiap pesanan Anda mudah
							dipantau, pembayarannya fleksibel, dan komunikasinya cepat.
						</p>
						<div className="space-y-3">
							{TRUST.map((t) => (
								<div key={t} className="flex items-center gap-3">
									<CheckCircle2
										size={18}
										className="text-emerald-500 flex-shrink-0"
									/>
									<span className="text-sm text-gray-700">{t}</span>
								</div>
							))}
						</div>
					</div>
					<div className="bg-gradient-to-br from-indigo-600 to-indigo-800 rounded-3xl p-8 sm:p-10 text-white">
						<MapPin size={28} className="text-indigo-200 mb-4" />
						<p className="text-lg font-semibold leading-relaxed">
							"Setiap pesanan punya nomor resi sendiri — Anda bisa pantau
							statusnya kapan saja, dari diproses sampai barangnya sampai di
							tangan Anda."
						</p>
						<p className="text-indigo-200 text-sm mt-4">
							Transparansi proses, bagian dari komitmen kami.
						</p>
					</div>
				</div>
			</section>

			{/* ── Testimoni ── */}
			<section id="ulasan" className="bg-gray-50 border-y border-gray-100">
				<div className="max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-20">
					<div className="max-w-xl mx-auto text-center mb-12">
						<span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-indigo-100 text-indigo-700 text-xs font-semibold mb-4">
							<Star size={12} /> Ulasan Pelanggan
						</span>
						<h2 className="text-2xl sm:text-3xl font-extrabold text-gray-900">
							Apa Kata Mereka
						</h2>
						<p className="mt-3 text-gray-500">
							Cerita dari pelanggan yang sudah merasakan proses pemesanan di
							BungaNaik.
						</p>
					</div>
					<div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
						{TESTIMONI.map((t) => (
							<div
								key={t.nama}
								className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 flex flex-col">
								<div className="flex items-center gap-0.5 mb-3">
									{Array.from({ length: 5 }).map((_, i) => (
										<Star
											key={i}
											size={14}
											className="text-amber-400 fill-amber-400"
										/>
									))}
								</div>
								<p className="text-sm text-gray-600 leading-relaxed flex-1">
									"{t.isi}"
								</p>
								<div className="flex items-center gap-3 mt-5">
									<div
										className={`w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0 ${t.avatar}`}>
										{t.nama
											.split(" ")
											.map((w) => w[0])
											.slice(0, 2)
											.join("")}
									</div>
									<div>
										<p className="text-sm font-bold text-gray-900">{t.nama}</p>
										<p className="text-xs text-gray-400">{t.lokasi}</p>
									</div>
								</div>
							</div>
						))}
					</div>
				</div>
			</section>

			{/* ── CTA Banner ── */}
			<section className="max-w-6xl mx-auto px-4 sm:px-6 pb-16 sm:pb-20">
				<div className="bg-gradient-to-r from-indigo-600 to-violet-600 rounded-3xl px-6 sm:px-12 py-12 sm:py-16 text-center text-white">
					<h2 className="text-2xl sm:text-3xl font-extrabold mb-3">
						Siap Wujudkan Furniture Impian Anda?
					</h2>
					<p className="text-indigo-100 max-w-xl mx-auto mb-8">
						Konsultasikan kebutuhan Anda sekarang, atau langsung jelajahi
						koleksi ready stock kami di Etalase.
					</p>
					<div className="flex flex-wrap items-center justify-center gap-3">
						<a
							href={waLink(ctaMsg)}
							target="_blank"
							rel="noopener noreferrer"
							className="flex items-center gap-2 px-6 py-3.5 bg-white text-indigo-700 font-semibold rounded-2xl hover:bg-indigo-50 transition">
							<MessageCircle size={18} /> Chat via WhatsApp
						</a>
						<Link
							href="/etalase"
							className="flex items-center gap-2 px-6 py-3.5 border-2 border-white/40 hover:border-white text-white font-semibold rounded-2xl transition">
							Lihat Etalase <ArrowRight size={16} />
						</Link>
					</div>
				</div>
			</section>

			{/* ── Footer ── */}
			<footer className="border-t border-gray-100 py-10">
				<div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
					<div className="text-center sm:text-left">
						<p className="font-extrabold text-indigo-700">BungaNaik</p>
						<p className="text-xs text-gray-400 mt-0.5">
							Furniture custom & ready stock — proses jelas, bayar fleksibel.
						</p>
					</div>
					<p className="text-xs text-gray-400">
						© {new Date().getFullYear()} BungaNaik. Semua hak dilindungi.
					</p>
				</div>
			</footer>

			<ChatWidget />
		</div>
	);
}
