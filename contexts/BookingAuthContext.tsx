"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";

// Auth customer booking mandiri (spec 10) — pola SEPINTAS mirip
// contexts/AuthContext.tsx (staf), tapi mekanismenya beda total: TIDAK ADA
// Supabase Auth di sini sama sekali. Status login diketahui semata-mata
// dari fetch ke /api/booking-auth/me, yang membaca cookie JWT
// booking_session di server (§2 — auth customer 100% terpisah).

export interface BookingCustomer {
	id: string;
	nama: string;
	email: string;
	telepon?: string | null;
	alamat?: string | null;
	kota?: string | null;
}

interface BookingAuthContextType {
	customer: BookingCustomer | null;
	loading: boolean;
	refresh: () => Promise<void>;
	logout: () => Promise<void>;
}

const BookingAuthContext = createContext<BookingAuthContextType>({
	customer: null,
	loading: true,
	refresh: async () => {},
	logout: async () => {},
});

export function BookingAuthProvider({ children }: { children: React.ReactNode }) {
	const [customer, setCustomer] = useState<BookingCustomer | null>(null);
	const [loading, setLoading] = useState(true);

	const refresh = useCallback(async () => {
		setLoading(true);
		try {
			const res = await fetch("/api/booking-auth/me", { cache: "no-store" });
			const data = await res.json();
			setCustomer(data.authenticated ? data.customer : null);
		} catch {
			setCustomer(null);
		} finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => {
		refresh();
	}, [refresh]);

	const logout = useCallback(async () => {
		await fetch("/api/booking-auth/logout", { method: "POST" });
		setCustomer(null);
	}, []);

	return (
		<BookingAuthContext.Provider value={{ customer, loading, refresh, logout }}>
			{children}
		</BookingAuthContext.Provider>
	);
}

export const useBookingAuth = () => useContext(BookingAuthContext);
