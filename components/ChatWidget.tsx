"use client";

import { useEffect, useRef, useState } from "react";
import { MessageCircle, X, Send, Phone } from "lucide-react";

const WA_NUMBER = process.env.NEXT_PUBLIC_WA_TOKO || "6289630085814";
const waChatLink = (msg: string) =>
	`https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(msg)}`;

const SESSION_STORAGE_KEY = "bng_chat_session";

const CS_NAMES = ["Jenny BungaNaik", "Raya BungaNaik"];

type Msg = { role: "bot" | "user"; text: string };

const QUICK_REPLIES = [
	"Cara Pesan",
	"Cek Stok Barang",
	"Ongkir & Pengiriman",
	"Custom / PO",
	"Lokasi Toko",
];

function getSessionKey(): string {
	let key = localStorage.getItem(SESSION_STORAGE_KEY);
	if (!key) {
		key = crypto.randomUUID();
		localStorage.setItem(SESSION_STORAGE_KEY, key);
	}
	return key;
}

async function askAI(sessionKey: string, message: string): Promise<string> {
	const res = await fetch("/api/chat", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ sessionKey, message }),
	});
	if (!res.ok) {
		return "Maaf, chat AI sedang bermasalah 🙏. Silakan lanjut chat dengan tim CS kami via WhatsApp.";
	}
	const data = await res.json();
	return (
		data.reply ||
		"Maaf, saya belum bisa menjawab pertanyaan ini. Silakan lanjut chat via WhatsApp."
	);
}

const ACCENTS = {
	indigo: {
		bubble: "bg-indigo-600 hover:bg-indigo-700",
		header: "bg-indigo-600",
		userBubble: "bg-indigo-600 text-white",
		chip: "border-indigo-200 text-indigo-700 hover:bg-indigo-50",
		ring: "focus:ring-indigo-500",
	},
	amber: {
		bubble: "bg-amber-500 hover:bg-amber-600",
		header: "bg-amber-500",
		userBubble: "bg-amber-500 text-white",
		chip: "border-amber-200 text-amber-700 hover:bg-amber-50",
		ring: "focus:ring-amber-500",
	},
};

export default function ChatWidget({
	accent = "indigo",
}: {
	accent?: "indigo" | "amber";
}) {
	const c = ACCENTS[accent];
	const [open, setOpen] = useState(false);
	const [csName, setCsName] = useState("CS BungaNaik");
	const [messages, setMessages] = useState<Msg[]>([
		{
			role: "bot",
			text: "Halo! 👋 Saya CS BungaNaik. Siap bantu 24 jam untuk pertanyaan seputar produk, pemesanan, dan pengiriman. Silakan pilih topik atau ketik pertanyaan Anda.",
		},
	]);
	const [input, setInput] = useState("");
	const [typing, setTyping] = useState(false);
	const scrollRef = useRef<HTMLDivElement>(null);
	const sessionKeyRef = useRef<string | null>(null);

	useEffect(() => {
		sessionKeyRef.current = getSessionKey();
		// Nama CS acak — beda tiap kali widget dimuat, biar tidak selalu sama
		const name = CS_NAMES[Math.floor(Math.random() * CS_NAMES.length)];
		setCsName(name);
		setMessages([
			{
				role: "bot",
				text: `Halo! 👋 Saya ${name}, CS BungaNaik. Siap bantu 24 jam untuk pertanyaan seputar produk, pemesanan, dan pengiriman. Silakan pilih topik atau ketik pertanyaan Anda.`,
			},
		]);
	}, []);

	useEffect(() => {
		scrollRef.current?.scrollTo({
			top: scrollRef.current.scrollHeight,
			behavior: "smooth",
		});
	}, [messages, open, typing]);

	const send = async (text: string) => {
		if (!text.trim() || typing) return;
		setInput("");
		setMessages((prev) => [...prev, { role: "user", text }]);
		setTyping(true);

		const sessionKey = sessionKeyRef.current || getSessionKey();
		const replyText = await askAI(sessionKey, text);

		setMessages((prev) => [...prev, { role: "bot", text: replyText }]);
		setTyping(false);
	};

	return (
		<>
			{/* Tombol bubble */}
			<div className="fixed bottom-6 left-4 z-40 flex items-center gap-2.5">
				<button
					onClick={() => setOpen((o) => !o)}
					className={`relative w-14 h-14 rounded-full ${c.bubble} text-white shadow-lg flex items-center justify-center transition flex-shrink-0`}
					aria-label="Chat CS">
					{open ? <X size={22} /> : <MessageCircle size={22} />}
					{!open && (
						<span className="absolute top-0 right-0 w-3.5 h-3.5 bg-green-400 border-2 border-white rounded-full" />
					)}
				</button>
				{!open && (
					<span className="bg-white text-gray-700 text-sm font-semibold px-4 py-2.5 rounded-full shadow-lg border border-gray-100 whitespace-nowrap">
						Ngobrol dengan CS Bunganaik Furniture
					</span>
				)}
			</div>

			{/* Panel chat */}
			{open && (
				<div className="fixed bottom-24 left-4 z-40 w-[calc(100vw-2rem)] max-w-sm h-[70vh] max-h-[520px] bg-white rounded-2xl shadow-2xl border border-gray-100 flex flex-col overflow-hidden">
					<div
						className={`${c.header} text-white px-4 py-3 flex items-center justify-between flex-shrink-0`}>
						<div>
							<p className="font-semibold text-sm">{csName}</p>
							<p className="text-xs text-white/80 flex items-center gap-1">
								<span className="w-1.5 h-1.5 bg-green-300 rounded-full" />{" "}
								CS BungaNaik · Online 24 Jam
							</p>
						</div>
						<button
							onClick={() => setOpen(false)}
							className="p-1 hover:bg-white/10 rounded-lg">
							<X size={18} />
						</button>
					</div>

					<div
						ref={scrollRef}
						className="flex-1 overflow-y-auto p-3 space-y-2.5 bg-gray-50">
						{messages.map((m, i) => (
							<div
								key={i}
								className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
								<div
									className={`max-w-[80%] px-3 py-2 rounded-2xl text-sm leading-relaxed whitespace-pre-line ${
										m.role === "user"
											? `${c.userBubble} rounded-br-sm`
											: "bg-white border border-gray-100 text-gray-700 rounded-bl-sm shadow-sm"
									}`}>
									{m.text}
								</div>
							</div>
						))}
						{typing && (
							<div className="flex justify-start">
								<div className="bg-white border border-gray-100 text-gray-400 rounded-2xl rounded-bl-sm shadow-sm px-3.5 py-2.5 flex items-center gap-1">
									<span className="w-1.5 h-1.5 bg-gray-300 rounded-full animate-bounce [animation-delay:-0.3s]" />
									<span className="w-1.5 h-1.5 bg-gray-300 rounded-full animate-bounce [animation-delay:-0.15s]" />
									<span className="w-1.5 h-1.5 bg-gray-300 rounded-full animate-bounce" />
								</div>
							</div>
						)}
					</div>

					<div className="px-3 pt-2 flex flex-wrap gap-1.5 flex-shrink-0 border-t border-gray-100">
						{QUICK_REPLIES.map((q) => (
							<button
								key={q}
								disabled={typing}
								onClick={() => send(q)}
								className={`text-xs px-2.5 py-1.5 rounded-full border ${c.chip} transition disabled:opacity-40 disabled:cursor-not-allowed`}>
								{q}
							</button>
						))}
					</div>

					<div className="p-3 flex items-center gap-2 flex-shrink-0">
						<input
							value={input}
							onChange={(e) => setInput(e.target.value)}
							onKeyDown={(e) => e.key === "Enter" && send(input)}
							disabled={typing}
							placeholder="Ketik pertanyaan..."
							className={`flex-1 px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 ${c.ring} disabled:opacity-60`}
						/>
						<button
							disabled={typing}
							onClick={() => send(input)}
							className={`p-2 rounded-xl ${c.bubble} text-white transition disabled:opacity-50 disabled:cursor-not-allowed`}
							aria-label="Kirim">
							<Send size={16} />
						</button>
					</div>

					<a
						href={waChatLink("Halo, saya butuh bantuan CS BungaNaik")}
						target="_blank"
						rel="noopener noreferrer"
						className="flex items-center justify-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 py-2 border-t border-gray-100 flex-shrink-0">
						<Phone size={12} /> Lanjut chat dengan CS via WhatsApp
					</a>
				</div>
			)}
		</>
	);
}
