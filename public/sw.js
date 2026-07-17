// Service worker minimal — hanya untuk memenuhi syarat "installable" PWA.
// Sengaja TIDAK melakukan cache apapun: semua data (stok, harga, penjualan)
// harus selalu fresh dari network, tidak boleh ada versi stale ter-cache.

self.addEventListener("install", () => {
	self.skipWaiting();
});

self.addEventListener("activate", (event) => {
	event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", () => {
	// no-op: biarkan browser handle fetch seperti biasa (passthrough network)
});
