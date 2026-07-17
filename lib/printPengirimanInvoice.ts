export function printPengirimanInvoice(data: {
	nomor_faktur: string;
	tanggal: string;
	status_bayar: string;
	metode_bayar: string;
	jenis_layanan: string;
	total_tagihan: number;
	ongkir?: number;
	biaya_asuransi?: number;
	uang_dp?: number;
	catatan?: string;
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
	const grandTotal = data.total_tagihan;
	const sisa = grandTotal - (data.uang_dp || 0);
	const jenisLabel =
		data.jenis_layanan === "express"
			? "EXPRESS"
			: data.jenis_layanan === "kargo"
				? "KARGO"
				: "REGULER";

	const w = window.open("", "_blank");
	if (!w) return;
	w.document.write(`<!DOCTYPE html><html lang="id"><head>
<title>Invoice ${data.nomor_faktur}</title>
<style>
/*
  Target hardware: printer dot-matrix Epson LX-310, kertas continuous form
  9.5 x 13 inci, dibagi 2 bagian sama besar (masing-masing 9.5 x 6.5 inci):
  bagian atas = Invoice Pengiriman, bagian bawah = Surat Jalan. @page di bawah
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
.addr-block{border:1.5px solid #000;border-radius:4px;padding:8px 10px;margin-bottom:8px}
.addr-lbl{font-size:9px;font-weight:900;letter-spacing:1.5px;color:#000;margin-bottom:2px}
.addr-name{font-size:13px;font-weight:900}
.addr-line{font-size:11px;font-weight:700;margin-top:2px}
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

<!-- ======== BAGIAN 1: INVOICE PENGIRIMAN (atas, 6.5in) ======== -->
<div class="half first">
	<div class="row-header">
		<div>
			<div class="brand">ExpedisiBunganaik</div>
			<div class="brand-sub">Jasa Pengiriman & Kargo</div>
		</div>
		<div>
			<div class="doc-label">INVOICE PENGIRIMAN</div>
			<div class="doc-no">No: <b>${data.nomor_faktur}</b></div>
			<div class="doc-no">Tgl: ${fmtDate(data.tanggal)}</div>
			<div class="doc-no" style="margin-top:3px"><span class="badge">${statusLabel}</span> <span class="badge">${jenisLabel}</span></div>
		</div>
	</div>

	<div class="addr-block">
		<div class="addr-lbl">PENGIRIM</div>
		<div class="addr-name">${data.pengirim_nama}</div>
		${data.pengirim_telepon ? `<div class="addr-line">${data.pengirim_telepon}</div>` : ""}
		${data.pengirim_alamat ? `<div class="addr-line">${data.pengirim_alamat}${data.pengirim_kota ? ", " + data.pengirim_kota : ""}</div>` : ""}
	</div>

	<div class="addr-block">
		<div class="addr-lbl">PENERIMA</div>
		<div class="addr-name">${data.penerima_nama}</div>
		${data.penerima_telepon ? `<div class="addr-line">${data.penerima_telepon}</div>` : ""}
		${data.penerima_alamat ? `<div class="addr-line">${data.penerima_alamat}${data.penerima_kota ? ", " + data.penerima_kota : ""}</div>` : ""}
	</div>

	<div class="info">
		<span class="lbl">Berat</span><span class="val">${data.berat_kg ?? 0} kg</span>
		<span class="lbl">Isi Barang</span><span class="val">${data.isi_barang || "-"}</span>
		<span class="lbl">Metode</span><span class="val" style="text-transform:capitalize">${data.metode_bayar}</span>
	</div>

	<div class="totals">
		<div class="tot-row"><span>Ongkir</span><span class="tot-val">${fmt(data.ongkir || 0)}</span></div>
		${(data.biaya_asuransi || 0) > 0 ? `<div class="tot-row"><span>Biaya Asuransi</span><span class="tot-val">${fmt(data.biaya_asuransi!)}</span></div>` : ""}
		<div class="tot-row tot-final"><span>TOTAL TAGIHAN</span><span class="tot-val">${fmt(grandTotal)}</span></div>
		${(data.uang_dp || 0) > 0 ? `<div class="tot-row"><span>DP Terbayar</span><span class="tot-val">${fmt(data.uang_dp!)}</span></div>` : ""}
		${sisa > 0 ? `<div class="tot-row"><span>Sisa Tagihan</span><span class="tot-val">${fmt(sisa)}</span></div>` : ""}
	</div>
	${data.catatan ? `<div class="catatan">Catatan: ${data.catatan}</div>` : ""}
</div>

<!-- ======== BAGIAN 2: SURAT JALAN (bawah, 6.5in) ======== -->
<div class="half">
	<div class="row-header">
		<div>
			<div class="brand">ExpedisiBunganaik</div>
			<div class="brand-sub">Jasa Pengiriman & Kargo</div>
		</div>
		<div>
			<div class="doc-label">SURAT JALAN</div>
			<div class="doc-no">No: <b>${data.nomor_faktur}</b></div>
			<div class="doc-no">Tgl: ${fmtDate(data.tanggal)}</div>
		</div>
	</div>

	<div class="addr-block">
		<div class="addr-lbl">PENGIRIM</div>
		<div class="addr-name">${data.pengirim_nama}</div>
		${data.pengirim_alamat ? `<div class="addr-line">${data.pengirim_alamat}${data.pengirim_kota ? ", " + data.pengirim_kota : ""}</div>` : ""}
	</div>

	<div class="addr-block">
		<div class="addr-lbl">PENERIMA</div>
		<div class="addr-name">${data.penerima_nama}</div>
		${data.penerima_alamat ? `<div class="addr-line">${data.penerima_alamat}${data.penerima_kota ? ", " + data.penerima_kota : ""}</div>` : ""}
	</div>

	<div class="info">
		<span class="lbl">Berat</span><span class="val">${data.berat_kg ?? 0} kg</span>
		${data.petugas_nama ? `<span class="lbl">Kurir/Sopir</span><span class="val">${data.petugas_nama}</span>` : ""}
		${data.petugas_telepon ? `<span class="lbl">Telp</span><span class="val">${data.petugas_telepon}</span>` : ""}
	</div>

	<div class="sign-row">
		<div class="sign-box"><div class="title">Pengirim</div><div class="line">( ........................... )</div></div>
		<div class="sign-box"><div class="title">Kurir / Sopir</div><div class="line">( ........................... )</div></div>
		<div class="sign-box"><div class="title">Penerima</div><div class="line">( ........................... )</div></div>
	</div>
	<div class="note" style="margin-top:6px">Barang diterima dalam kondisi baik dan lengkap.</div>
</div>

</div>

<script>window.onload=function(){window.print();setTimeout(function(){window.close()},800)}</script>
</body></html>`);
	w.document.close();
}
