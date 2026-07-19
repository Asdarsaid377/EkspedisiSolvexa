export function printTagihanCustomer(data: {
	customer_nama: string;
	customer_tipe?: string;
	customer_telepon?: string;
	customer_alamat?: string;
	kiriman: Array<{
		nomor_faktur: string;
		nomor_resi?: string;
		tanggal: string;
		penerima_kota?: string;
		total_tagihan: number;
		uang_dp: number;
	}>;
}) {
	const fmt = (n: number) =>
		new Intl.NumberFormat("id-ID", {
			style: "currency",
			currency: "IDR",
			minimumFractionDigits: 0,
		}).format(n);
	const fmtDate = (s: string) =>
		new Date(s).toLocaleDateString("id-ID", {
			day: "numeric",
			month: "long",
			year: "numeric",
		});

	const tanggalCetak = fmtDate(new Date().toISOString());
	const grandTotalSisa = data.kiriman.reduce(
		(s, k) => s + (k.total_tagihan - k.uang_dp),
		0,
	);
	const tipeLabel = data.customer_tipe === "korporat" ? "Korporat" : "Umum";

	const rows = data.kiriman
		.map((k, i) => {
			const sisa = k.total_tagihan - k.uang_dp;
			return `<tr>
			<td class="c">${i + 1}</td>
			<td>${k.nomor_resi || k.nomor_faktur}</td>
			<td>${fmtDate(k.tanggal)}</td>
			<td>${k.penerima_kota || "-"}</td>
			<td class="r">${fmt(k.total_tagihan)}</td>
			<td class="r">${fmt(k.uang_dp)}</td>
			<td class="r b">${fmt(sisa)}</td>
		</tr>`;
		})
		.join("");

	const w = window.open("", "_blank");
	if (!w) return;
	w.document.write(`<!DOCTYPE html><html lang="id"><head>
<title>Rekap Tagihan - ${data.customer_nama}</title>
<style>
@page{size:A4;margin:1.5cm}
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#111}
.header{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid #111;padding-bottom:10px;margin-bottom:16px}
.brand{font-size:18px;font-weight:800}
.brand-sub{font-size:11px;color:#444;margin-top:2px}
.doc-label{font-size:15px;font-weight:800;text-align:right}
.doc-sub{font-size:11px;color:#444;text-align:right;margin-top:2px}
.cust-block{border:1px solid #ccc;border-radius:6px;padding:10px 14px;margin-bottom:16px}
.cust-name{font-size:14px;font-weight:700}
.badge{display:inline-block;font-size:10px;font-weight:700;border:1px solid #666;border-radius:10px;padding:1px 8px;margin-left:6px}
.cust-line{font-size:11px;color:#444;margin-top:3px}
table{width:100%;border-collapse:collapse;margin-bottom:16px}
th,td{border:1px solid #ccc;padding:6px 8px;font-size:11.5px}
th{background:#f3f3f3;text-align:left;font-weight:700}
.c{text-align:center}
.r{text-align:right}
.b{font-weight:700}
.total-row{display:flex;justify-content:flex-end;gap:12px;font-size:14px;font-weight:800;border-top:2px solid #111;padding-top:10px}
.footer-note{margin-top:24px;font-size:10.5px;color:#666}
@media print{button{display:none}}
</style>
</head><body>

<div class="header">
	<div>
		<div class="brand">ExpedisiBunganaik</div>
		<div class="brand-sub">Jasa Pengiriman &amp; Kargo</div>
	</div>
	<div>
		<div class="doc-label">REKAP TAGIHAN</div>
		<div class="doc-sub">Dicetak: ${tanggalCetak}</div>
	</div>
</div>

<div class="cust-block">
	<div class="cust-name">${data.customer_nama}<span class="badge">${tipeLabel}</span></div>
	${data.customer_telepon ? `<div class="cust-line">${data.customer_telepon}</div>` : ""}
	${data.customer_alamat ? `<div class="cust-line">${data.customer_alamat}</div>` : ""}
</div>

<table>
	<thead>
		<tr>
			<th class="c">#</th>
			<th>Resi</th>
			<th>Tanggal</th>
			<th>Tujuan</th>
			<th class="r">Total Tagihan</th>
			<th class="r">Terbayar</th>
			<th class="r">Sisa</th>
		</tr>
	</thead>
	<tbody>
		${rows}
	</tbody>
</table>

<div class="total-row">
	<span>GRAND TOTAL SISA</span>
	<span>${fmt(grandTotalSisa)}</span>
</div>

<div class="footer-note">
	Rekap ini mencakup seluruh kiriman berstatus belum lunas per tanggal cetak di atas.
</div>

<script>window.onload=function(){window.print();setTimeout(function(){window.close()},800)}</script>
</body></html>`);
	w.document.close();
}
