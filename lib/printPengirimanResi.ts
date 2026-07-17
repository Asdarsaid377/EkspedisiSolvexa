export function printPengirimanResi(data: {
	nomor_faktur: string;
	nomor_resi: string;
	tanggal: string;
	jenis_layanan: string;
	status_bayar: string;
	total_tagihan: number;
	uang_dp?: number;
	pengirim_nama: string;
	pengirim_telepon?: string;
	pengirim_alamat?: string;
	pengirim_kota?: string;
	penerima_nama: string;
	penerima_telepon?: string;
	penerima_alamat?: string;
	penerima_kota?: string;
	berat_kg?: number;
	isi_barang?: string;
	petugas_nama?: string;
	petugas_telepon?: string;
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

	const sisa = data.total_tagihan - (data.uang_dp || 0);
	const badgeLabel =
		data.status_bayar === "lunas"
			? "LUNAS"
			: data.status_bayar === "dp"
				? "DP"
				: "BELUM BAYAR";
	const jenisLabel =
		data.jenis_layanan === "express"
			? "EXPRESS"
			: data.jenis_layanan === "kargo"
				? "KARGO"
				: "REGULER";
	const resiUrl = `${window.location.origin}/resi/${data.nomor_resi}`;

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
.addr-line{font-size:9.5px;color:#222;margin-top:3px;line-height:1.4}
.barang{font-size:10px;color:#333}
.sign{margin-top:10px;font-size:9px;color:#444;display:flex;justify-content:space-between}
.sign .box{border-top:1px solid #000;width:110px;text-align:center;padding-top:3px;margin-top:26px}
.note{font-size:8.5px;color:#888;text-align:center;padding:6px;background:#fafafa}
@media print{body{padding:4px}}
</style>
</head><body>

<!-- ======== LABEL RESI ======== -->
<div class="label">
	<div class="head">
		<div>
			<div class="brand">EXPEDISI</div>
			<div class="brand-sub">BUNGANAIK GROUP</div>
		</div>
		<div class="cod-tag">${jenisLabel}</div>
	</div>

	<div class="qr-row">
		<img src="${data.qrDataUrl}" />
		<div>
			<div class="resi-lbl">NO. RESI</div>
			<div class="resi-no">${data.nomor_resi}</div>
			<div class="meta">
				Faktur: ${data.nomor_faktur}<br/>
				Tanggal: ${fmtDate(data.tanggal)}<br/>
				Status: <b>${badgeLabel}</b>
				${(data.uang_dp || 0) > 0 ? `<br/>DP Terbayar: ${fmt(data.uang_dp || 0)}` : ""}
				${sisa > 0 ? `<br/><b>Sisa Pembayaran: ${fmt(sisa)}</b>` : ""}
			</div>
		</div>
	</div>

	<div class="block">
		<div class="addr-lbl">PENERIMA</div>
		<div class="addr-name">${data.penerima_nama}</div>
		${data.penerima_telepon ? `<div class="addr-phone">${data.penerima_telepon}</div>` : ""}
		<div class="addr-line">${data.penerima_alamat || "-"}${data.penerima_kota ? ", " + data.penerima_kota : ""}</div>
	</div>

	<div class="block">
		<div class="addr-lbl">PENGIRIM</div>
		<div class="addr-name">${data.pengirim_nama}</div>
		${data.pengirim_telepon ? `<div class="addr-phone">${data.pengirim_telepon}</div>` : ""}
		<div class="addr-line">${data.pengirim_alamat || "-"}${data.pengirim_kota ? ", " + data.pengirim_kota : ""}</div>
	</div>

	<div class="block barang">
		<div class="addr-lbl">BARANG</div>
		${data.isi_barang || "-"} &middot; ${data.berat_kg ?? 0} kg
	</div>

	${
		data.petugas_nama
			? `<div class="block barang">
		<div class="addr-lbl">KURIR / SOPIR</div>
		${data.petugas_nama}${data.petugas_telepon ? ` &middot; ${data.petugas_telepon}` : ""}
	</div>`
			: ""
	}

	<div class="block">
		<div class="sign">
			<div class="box">Kurir/Sopir</div>
			<div class="box">Penerima</div>
		</div>
	</div>

	<div class="note">Lacak paket: ${resiUrl}</div>
</div>

<script>window.onload=function(){window.print();setTimeout(function(){window.close()},800)}</script>
</body></html>`);
	w.document.close();
}
