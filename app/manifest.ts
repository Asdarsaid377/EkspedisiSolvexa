import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
	return {
		name: "BungaNaik Group",
		short_name: "BungaNaik",
		description: "BungaNaik Group - Toko Furniture No 1 Di Makassar",
		start_url: "/dashboard",
		display: "standalone",
		background_color: "#ffffff",
		theme_color: "#4f46e5",
		orientation: "portrait-primary",
		icons: [
			{ src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
			{ src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
			{ src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
		],
	};
}
