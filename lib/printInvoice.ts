export function printInvoice(data: {
	nomor_faktur: string;
	tanggal: string;
	status_bayar: string;
	metode_bayar: string;
	total_harga_jual: number;
	total_ongkir?: number;
	uang_dp?: number;
	catatan?: string;
	tujuan?: string;
	sopir?: string;
	telepon_sopir?: string;
	nama_customer: string;
	telepon_customer?: string;
	reseller?: { nama?: string; telepon?: string } | null;
	items?: Array<{
		jumlah: number;
		harga_jual: number;
		ongkir?: number;
		produk?: { nama?: string; satuan?: string } | null;
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

	const statusLabel =
		data.status_bayar === "lunas"
			? "LUNAS"
			: data.status_bayar === "dp"
				? "DP"
				: "BELUM BAYAR";
	const grandTotal = data.total_harga_jual;
	const sisa = grandTotal - (data.uang_dp || 0);

	const itemRowsNota = (data.items || [])
		.map(
			(item, i) => `
		<tr>
			<td class="tc">${i + 1}</td>
			<td>${item.produk?.nama || "-"}</td>
			<td class="tc">${item.jumlah} ${item.produk?.satuan || ""}</td>
			<td class="tr">${fmt(item.harga_jual - item.ongkir!)}</td>
			<td class="tr">${(item.ongkir || 0) > 0 ? fmt(item.ongkir!) : "-"}</td>
			<td class="tr"><b>${fmt(item.harga_jual * item.jumlah)}</b></td>
		</tr>`,
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

	const totalUnit = (data.items || []).reduce((s, i) => s + i.jumlah, 0);

	const w = window.open("", "_blank");
	if (!w) return;
	w.document.write(`<!DOCTYPE html><html lang="id"><head>
<title>Invoice ${data.nomor_faktur}</title>
<style>
/*
  Target hardware: printer dot-matrix Epson LX-310, kertas continuous form
  9.5 x 13 inci, dibagi 2 bagian sama besar (masing-masing 9.5 x 6.5 inci):
  bagian atas = Nota Penjualan, bagian bawah = Surat Jalan. @page di bawah
  mendefinisikan satu unit lembar (9.5x13in) — kalau driver printer/print
  dialog browser juga di-set ke ukuran kertas custom yang sama, halaman
  akan align pas dengan garis perforasi kertas continuous form.
  Kalau margin cetak fisik printer Anda beda, cukup ubah --pg-ml/--pg-mr/--pg-my.
*/
:root{--pg-w:9.5in;--pg-h:13in;--pg-half:6.5in;--pg-ml:.75in;--pg-mr:1.5in;--pg-my:.15in}
@page{size:var(--pg-w) var(--pg-h);margin:0}
*{box-sizing:border-box;margin:0;padding:0;-webkit-print-color-adjust:exact;print-color-adjust:exact}
html,body{width:var(--pg-w)}
/*
  Dot-matrix (impact) tidak bisa cetak abu-abu asli — cuma hitam solid atau
  dithering (titik jarang) yang kelihatan pudar/blur. Karena itu SEMUA teks &
  garis di bawah ini sengaja #000 solid, bukan abu-abu. Font & border dibuat
  lebih besar/tebal + tabel & field pakai border kotak penuh (gaya faktur
  cetak klasik) supaya hasil dot-matrix lebih tegas & mudah dibaca.

  --pg-mr sengaja jauh lebih besar dari --pg-ml — hasil cetak fisik LX-310
  ternyata bergeser ke kanan dibanding preview browser (kalibrasi print head,
  bukan salah hitung CSS), jadi seluruh konten digeser ke kiri dengan kasih
  jarak ekstra khusus di kanan.
*/
body{font-family:"Courier New",Courier,monospace;font-size:13px;font-weight:700;color:#000}
.page{width:var(--pg-w)}
.half{position:relative;width:100%;min-height:var(--pg-half);padding:var(--pg-my) var(--pg-mr) var(--pg-my) var(--pg-ml);overflow-x:hidden}
/*
  Bagian pertama (paling atas lembar) butuh padding-top ekstra — baris
  pertama cetak dot-matrix kadang sedikit terpotong karena posisi print head
  belum stabil di awal lembar. Bagian kedua (Surat Jalan, mulai dari tengah
  kertas) TIDAK disentuh — posisinya sudah pas dengan garis potong fisik.
*/
.half.first{border-bottom:2px dashed #000;padding-top:.3in}
.cut-label{position:absolute;bottom:-8px;left:50%;transform:translateX(-50%);background:#fff;padding:0 6px;font-size:9px;font-weight:700;color:#000;letter-spacing:1.5px}
/*
  min-width:0 WAJIB di sini — default flexbox MENOLAK menyusutkan child yang
  isinya teks tak terputus (mis. nomor faktur "INV-20260713-0083", tanpa
  spasi), jadi walau parent-nya sempit, teks itu tetap maksa lebar sendiri
  dan bisa "nembus" ke luar kertas. Dengan min-width:0 + word-break di
  .doc-no, kalau kepanjangan dia WAJIB wrap ke baris baru, bukan kepotong.
*/
.row-header{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2.5px solid #000;padding-bottom:7px;margin-bottom:7px;gap:10px}
.row-header>div{min-width:0}
.row-header>div:last-child{text-align:right;flex-shrink:1}
.brand{font-size:19px;font-weight:900;letter-spacing:.5px}
.brand-sub{font-size:11px;color:#000;font-weight:700;margin-top:1px}
.doc-label{font-size:16px;font-weight:900;text-align:right;overflow-wrap:break-word;word-break:break-word}
.doc-no{font-size:10.5px;color:#000;font-weight:700;text-align:right;margin-top:2px;overflow-wrap:break-word;word-break:break-all}
.info{display:grid;grid-template-columns:80px 1fr;gap:4px 8px;align-items:center;margin-bottom:8px;font-size:12.5px}
.lbl{color:#000;font-weight:700}
.val{display:inline-block;border:1.5px solid #000;border-radius:4px;padding:2px 9px;font-weight:800}
.badge{display:inline-block;border:2px solid #000;border-radius:3px;padding:2px 8px;font-size:11px;font-weight:800}
/*
  table-layout:fixed WAJIB — tanpa ini, kolom angka (Harga Jual/Subtotal) yang
  kepanjangan buat font tebal akan memaksa seluruh tabel melebar sampai
  kepotong di luar kertas fisik. Lebar tiap kolom dihitung eksplisit di HTML
  (atribut style width) supaya pas dengan font 12px bold; kolom Nama Barang
  sengaja TIDAK dikasih width — otomatis kebagian sisa ruang yang ada.
*/
table{width:100%;table-layout:fixed;border-collapse:collapse;font-size:12px;margin:6px 0}
th{background:none;border:1.5px solid #000;padding:5px 6px;font-weight:900;text-align:left;overflow:hidden}
td{border:1.5px solid #000;padding:5px 6px;vertical-align:top;font-weight:700;overflow-wrap:break-word;word-break:break-word}
.tc{text-align:center}.tr{text-align:right}
.totals{margin-top:6px;padding-top:2px}
.tot-row{display:flex;justify-content:space-between;align-items:center;padding:2px 0;font-size:12.5px;font-weight:700}
.tot-val{display:inline-block;border:1.5px solid #000;border-radius:14px;padding:2px 14px;min-width:110px;text-align:right;font-weight:800}
.tot-final{border-top:2.5px solid #000;margin-top:5px;padding-top:6px;font-size:14.5px;font-weight:900}
.tot-final .tot-val{border-width:2.5px;font-size:14.5px}
.catatan{margin-top:6px;padding:5px 8px;border:1.5px dashed #000;font-size:11.5px;font-weight:700;color:#000}
.sign-row{display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin-top:14px;text-align:center;font-size:11px}
.sign-box .title{font-weight:800;margin-bottom:24px}
.sign-box .line{border-top:1.5px solid #000;padding-top:3px;color:#000;font-weight:700}
.note{font-size:10px;font-weight:700;color:#000;margin-top:4px}
@media print{button{display:none}}
</style>
</head><body>

<div class="page">

<!-- ======== BAGIAN 1: NOTA PENJUALAN (atas, 6.5in) ======== -->
<div class="half first">
	<div class="row-header">
		<div>
			<div class="brand">Bunganaik</div>
			<div class="brand-sub">Anda Punya Ruang Bunganaik Solusinya</div>
		</div>
		<div>
			<div class="doc-label">NOTA PENJUALAN</div>
			<div class="doc-no">No: <b>${data.nomor_faktur}</b></div>
			<div class="doc-no">Tgl: ${fmtDate(data.tanggal)}</div>
			<div class="doc-no">Customer: <b>${data.nama_customer || "-"}</b></div>
			${data.telepon_customer ? `<div class="doc-no">Telp: ${data.telepon_customer}</div>` : ""}
			<div class="doc-no" style="margin-top:3px"><span class="badge">${statusLabel}</span></div>
		</div>
	</div>

	<div class="info">
		<span class="lbl">Tujuan</span><span class="val">${data.tujuan || "-"}</span>
		<span class="lbl">Metode</span><span class="val" style="text-transform:capitalize">${data.metode_bayar}</span>
		${data.sopir ? `<span class="lbl">Sopir</span><span class="val">${data.sopir}</span>` : ""}
	</div>

	<table>
		<thead><tr>
			<th class="tc" style="width:30px">No</th>
			<th>Nama Barang</th>
			<th class="tc" style="width:62px">Qty</th>
			<th class="tr" style="width:110px">Harga Jual</th>
			<th class="tr" style="width:92px">Ongkir</th>
			<th class="tr" style="width:118px">Subtotal</th>
		</tr></thead>
		<tbody>${itemRowsNota}</tbody>
	</table>

	<div class="totals">
		<div class="tot-row"><span>Total Harga Jual</span><span class="tot-val">${fmt(data.total_harga_jual - data.total_ongkir!)}</span></div>
		${(data.total_ongkir || 0) > 0 ? `<div class="tot-row"><span>Total Ongkir (info)</span><span class="tot-val">${fmt(data.total_ongkir!)}</span></div>` : ""}
		<div class="tot-row tot-final"><span>GRAND TOTAL</span><span class="tot-val">${fmt(grandTotal)}</span></div>
		${(data.uang_dp || 0) > 0 ? `<div class="tot-row"><span>DP Terbayar</span><span class="tot-val">${fmt(data.uang_dp!)}</span></div>` : ""}
		${sisa > 0 ? `<div class="tot-row"><span>Sisa Tagihan</span><span class="tot-val">${fmt(sisa)}</span></div>` : ""}
	</div>
	${data.catatan ? `<div class="catatan">Catatan: ${data.catatan}</div>` : ""}

	
</div>

<!-- ======== BAGIAN 2: SURAT JALAN (bawah, 6.5in) ======== -->
<div class="half">
	<div class="row-header">
		<div>
			<div class="brand">Bunganaik</div>
			<div class="brand-sub">Anda Punya Ruang Bunganaik Solusinya</div>
		</div>
		<div>
			<div class="doc-label">SURAT JALAN</div>
			<div class="doc-no">No: <b>${data.nomor_faktur}</b></div>
			<div class="doc-no">Tgl: ${fmtDate(data.tanggal)}</div>
			<div class="doc-no">Customer: <b>${data.nama_customer || "-"}</b></div>
			${data.telepon_customer ? `<div class="doc-no">Telp: ${data.telepon_customer}</div>` : ""}
		</div>
	</div>

	<div class="info">
		<span class="lbl">Tujuan</span><span class="val">${data.tujuan || "-"}</span>
		${data.sopir ? `<span class="lbl">Sopir</span><span class="val">${data.sopir}</span>` : ""}
		${data.telepon_sopir ? `<span class="lbl">Telp Sopir</span><span class="val">${data.telepon_sopir}</span>` : ""}
	</div>

	<table>
		<thead><tr>
			<th class="tc" style="width:30px">No</th>
			<th>Nama Barang</th>
			<th class="tc" style="width:56px">Qty</th>
			<th class="tc" style="width:68px">Satuan</th>
			<th style="width:130px">Keterangan</th>
		</tr></thead>
		<tbody>${itemRowsSJ}</tbody>
		<tfoot><tr>
			<td colspan="2" style="font-weight:800">TOTAL</td>
			<td class="tc" style="font-weight:900">${totalUnit}</td>
			<td colspan="2"></td>
		</tr></tfoot>
	</table>

	<div class="sign-row">
		<div class="sign-box"><div class="title">Pengirim</div><div class="line">( ........................... )</div></div>
		<div class="sign-box"><div class="title">Sopir / Kurir</div><div class="line">( ........................... )</div></div>
		<div class="sign-box"><div class="title">Penerima</div><div class="line">( ........................... )</div></div>
	</div>
	<div class="note" style="margin-top:6px">Barang diterima dalam kondisi baik dan lengkap.</div>
	<div class="note" style="margin-top:3px">*Barang yang sudah diterima dan dicek tidak bisa dikembalikan</div>
	<div class="note" style="margin-top:3px">*Komplen hanya untuk perbaikan unit dan penukaran unit bukan pengembalian uang</div>
</div>

</div>

<script>window.onload=function(){window.print();setTimeout(function(){window.close()},800)}</script>
</body></html>`);
	w.document.close();
}
