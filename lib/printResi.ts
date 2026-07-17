export function printResi(data: {
	nomor_faktur: string;
	nomor_resi: string;
	tanggal: string;
	tujuan?: string;
	sopir?: string;
	telepon_sopir?: string;
	nama_customer: string;
	telepon_customer?: string;
	status_bayar: string;
	total_harga_jual: number;
	uang_dp?: number;
	reseller?: { nama?: string; telepon?: string } | null;
	items?: Array<{
		jumlah: number;
		produk?: { nama?: string; satuan?: string } | null;
	}>;
	qrDataUrl: string;
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

	const sisa = data.total_harga_jual - (data.uang_dp || 0);
	const badgeLabel =
		data.status_bayar === "lunas"
			? "LUNAS"
			: data.status_bayar === "dp"
				? "DP"
				: "BELUM BAYAR";
	const totalUnit = (data.items || []).reduce((s, i) => s + i.jumlah, 0);
	const resiUrl = `${window.location.origin}/resi/${data.nomor_resi}`;

	const itemRows = (data.items || [])
		.map(
			(item) =>
				`<li>${item.produk?.nama || "-"} <b>x${item.jumlah}</b> ${item.produk?.satuan || ""}</li>`,
		)
		.join("");

	const itemRowsSJ = (data.items || [])
		.map(
			(item, i) => `
		<tr>
			<td class="tc">${i + 1}</td>
			<td>${item.produk?.nama || "-"}</td>
			<td class="tc"><b>${item.jumlah}</b></td>
			<td class="tc">${item.produk?.satuan || "unit"}</td>
			<td></td>
		</tr>`,
		)
		.join("");

	const w = window.open("", "_blank");
	if (!w) return;
	w.document.write(`<!DOCTYPE html><html lang="id"><head>
<title>Resi ${data.nomor_resi}</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:Arial,sans-serif;font-size:11px;color:#000;padding:16px;display:flex;flex-direction:column;align-items:center;gap:16px}
.label{width:380px;border:2px solid #000;border-radius:6px;overflow:hidden}
.head{display:flex;justify-content:space-between;align-items:center;background:#000;color:#fff;padding:8px 12px}
.brand{font-size:16px;font-weight:900;letter-spacing:.5px}
.brand-sub{font-size:8px;letter-spacing:2px;color:#ddd}
.cod-tag{background:#fff;color:#000;font-size:10px;font-weight:800;padding:3px 8px;border-radius:4px}
.qr-row{display:flex;gap:10px;padding:12px;border-bottom:1.5px dashed #000;align-items:center}
.qr-row img{width:84px;height:84px;flex-shrink:0}
.resi-no{font-size:15px;font-weight:900;letter-spacing:1px;font-family:'Courier New',monospace}
.resi-lbl{font-size:8px;color:#666;letter-spacing:1px;margin-bottom:1px}
.meta{font-size:9.5px;color:#333;margin-top:4px;line-height:1.5}
.block{padding:10px 12px;border-bottom:1.5px dashed #000}
.block:last-child{border-bottom:none}
.addr-lbl{font-size:8.5px;font-weight:800;letter-spacing:1.5px;color:#555;margin-bottom:3px}
.addr-name{font-size:13px;font-weight:800}
.addr-phone{font-size:11px;font-weight:600;margin-top:1px}
.addr-line{font-size:5.5px;color:#222;margin-top:3px;line-height:1.4}
.addr-line2{font-size:5.5px;color:#222;margin-top:3px;line-height:1.4;font-style:italic}
.items ul{list-style:none;font-size:10px;line-height:1.6}
.items .total{margin-top:4px;font-weight:800;font-size:10.5px;border-top:1px solid #ccc;padding-top:4px}
.sopir{font-size:10px;color:#333}
.sign{margin-top:10px;font-size:9px;color:#444;display:flex;justify-content:space-between}
.sign .box{border-top:1px solid #000;width:110px;text-align:center;padding-top:3px;margin-top:26px}
.note{font-size:8.5px;color:#888;text-align:center;padding:6px;background:#fafafa}
@media print{body{padding:4px}}

/* ==== Surat Jalan ==== */
.sj{width:420px;border:1.5px solid #000;padding:14px;border-radius:4px}
.sj-header{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:1.5px solid #000;padding-bottom:10px;margin-bottom:10px}
.sj-doc-label{font-size:13px;font-weight:800;text-align:right}
.sj-doc-no{font-size:10px;color:#333;text-align:right;margin-top:2px}
.sj-info{display:grid;grid-template-columns:70px 1fr;gap:3px 6px;margin-bottom:10px;font-size:10.5px}
.sj-lbl{color:#555}
.sj-val{font-weight:600}
.sj table{width:100%;border-collapse:collapse;font-size:10.5px;margin:8px 0}
.sj th{background:#e8e8e8;border:1px solid #bbb;padding:4px 6px;font-weight:700}
.sj td{border:1px solid #d0d0d0;padding:4px 6px;vertical-align:top}
.sj .tc{text-align:center}.sj .tr{text-align:right}
.sj-sign{display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;margin-top:18px;text-align:center;font-size:10px}
.sj-sign .title{font-weight:700;margin-bottom:36px}
.sj-sign .line{border-top:1px solid #000;padding-top:3px;color:#444}
.sj-note{font-size:9px;color:#888;margin-top:6px}
</style>
</head><body>

<!-- ======== LABEL RESI ======== -->
<div class="label">
	<div class="head">
		<div>
			<div class="brand">BUNGANAIK</div>
			<div class="brand-sub">GROUP EXPRESS</div>
		</div>
		<div class="cod-tag">${badgeLabel}</div>
	</div>

	<div class="qr-row">
		<img src="${data.qrDataUrl}" />
		<div>
			<div class="resi-lbl">NO. RESI</div>
			<div class="resi-no">${data.nomor_resi}</div>
			<div class="meta">
				Faktur: ${data.nomor_faktur}<br/>
				Tanggal: ${fmtDate(data.tanggal)}
				${(data.uang_dp || 0) > 0 ? `<br/>DP Terbayar: ${fmt(data.uang_dp || 0)}` : ""}
				${sisa > 0 ? `<br/><b>Sisa Pembayaran: ${fmt(sisa)}</b>` : ""}
			</div>
		</div>
	</div>

	<div class="block">
		<div class="addr-lbl">PENERIMA</div>
		<div class="addr-name">${data.nama_customer || "-"}</div>
		${data.telepon_customer ? `<div class="addr-phone">${data.telepon_customer}</div>` : ""}
		<div class="addr-line">${data.tujuan || "-"}</div>
	</div>

	<div class="block">
		<div class="addr-lbl">PENGIRIM</div>
		<div class="addr-name" style="font-size:11px">Bunganaik Furniture</div>
		<div class="addr-line">Anda Punya Ruang,Bunganaik Solusinya</div>
		<div class="addr-line2">-Bunganaik Selamanya di hati-</div>
	</div>

	${
		itemRows
			? `<div class="block items">
		<div class="addr-lbl">RINGKASAN BARANG</div>
		<ul>${itemRows}</ul>
		<div class="total">Total: ${totalUnit} pcs</div>
	</div>`
			: ""
	}

	${
		data.sopir
			? `<div class="block sopir">
		<div class="addr-lbl">SOPIR / KURIR</div>
		${data.sopir}${data.telepon_sopir ? ` &middot; ${data.telepon_sopir}` : ""}
	</div>`
			: ""
	}

	<div class="block">
		<div class="sign">
			<div class="box">Sopir</div>
			<div class="box">Penerima</div>
		</div>
	</div>

	<div class="note">Lacak paket: ${resiUrl}</div>
</div>

<!-- ======== SURAT JALAN ======== -->
<div class="sj">
	<div class="sj-header">
		<div>
			<div class="brand" style="color:#000">Bunganaik</div>
			<div class="brand-sub" style="color:#555">Toko Furniture No 1 Dimakassar</div>
		</div>
		<div>
			<div class="sj-doc-label">SURAT JALAN</div>
			<div class="sj-doc-no">No: <b>${data.nomor_faktur}</b></div>
			<div class="sj-doc-no">Resi: <b>${data.nomor_resi}</b></div>
			<div class="sj-doc-no">Tgl: ${fmtDate(data.tanggal)}</div>
		</div>
	</div>

	<div class="sj-info">
		<span class="sj-lbl">Kepada</span><span class="sj-val">${data.nama_customer || "-"}</span>
		<span class="sj-lbl">Tujuan</span><span class="sj-val">${data.tujuan || "-"}</span>
		${data.sopir ? `<span class="sj-lbl">Sopir</span><span class="sj-val">${data.sopir}</span>` : ""}
		${data.telepon_sopir ? `<span class="sj-lbl">Telp Sopir</span><span class="sj-val">${data.telepon_sopir}</span>` : ""}
	</div>

	<table>
		<thead><tr>
			<th class="tc" style="width:28px">No</th>
			<th>Nama Barang</th>
			<th class="tc" style="width:50px">Qty</th>
			<th class="tc" style="width:60px">Satuan</th>
			<th>Keterangan</th>
		</tr></thead>
		<tbody>${itemRowsSJ}</tbody>
		<tfoot><tr>
			<td colspan="2" style="font-weight:700">TOTAL</td>
			<td class="tc" style="font-weight:800">${totalUnit}</td>
			<td colspan="2"></td>
		</tr></tfoot>
	</table>

	<div class="sj-sign">
		<div><div class="title">Pengirim</div><div class="line">( ........................... )</div></div>
		<div><div class="title">Sopir / Kurir</div><div class="line">( ........................... )</div></div>
		<div><div class="title">Penerima</div><div class="line">( ........................... )</div></div>
	</div>
	<div class="sj-note" style="margin-top:10px">Barang diterima dalam kondisi baik dan lengkap.</div>
	<div class="sj-note" style="margin-top:4px">*Barang yang sudah diterima dan dicek tidak bisa dikembalikan</div>
	<div class="sj-note" style="margin-top:4px">*Komplen hanya untuk perbaikan unit dan penukaran unit bukan pengembalian uang</div>
</div>

<script>window.onload=function(){window.print();setTimeout(function(){window.close()},800)}</script>
</body></html>`);
	w.document.close();
}
