-- ============================================================
-- Data contoh/demo (18 Jul 2026) — pengiriman, customer, armada,
-- manifest, cod_setoran, klaim, masing-masing +35 baris, mirip data
-- operasional asli (nama, kota, produk, nominal realistis).
--
-- ⚠️ TIDAK didaftarkan di config.toml [db.seed] sql_paths — file ini
-- SENGAJA tidak otomatis jalan saat `supabase db reset`. Alasannya:
-- baris di bawah mereferensikan profiles.id (sopir/kurir/superadmin)
-- dan cabang.id yang dibuat INTERAKTIF (lewat signup/app), bukan lewat
-- migration — UUID-nya TIDAK deterministik dan tidak akan ada lagi
-- persis sama setelah `db reset` fresh. Kalau dipaksa auto-run, akan
-- gagal dengan FK violation begitu database di-reset dari nol.
--
-- Cara pakai: jalankan manual setelah `supabase db reset` ATAU di DB
-- yang sudah berjalan (idempotent, ON CONFLICT (id) DO NOTHING):
--   psql "$(supabase status -o env | grep DB_URL | cut -d= -f2- | tr -d '\"')" -f supabase/seed-demo-data.sql
-- Kalau UUID profiles/cabang di DB Anda beda dari yang di-hardcode di
-- sini (mis. 1093e2c3-...=Sopir Bunga Naik, 7df2b6bf-...=Pengiriman
-- Bunga Naik, 4a00c436-...=Cabang Makassar, f1251d4e-...=superadmin),
-- sesuaikan dulu ID-nya via query manual sebelum menjalankan file ini.
-- ============================================================

-- 35 customer tambahan — mix umum/korporat, realistis mirip data existing
INSERT INTO customer (id, nama, tipe, telepon, alamat, kota, pic_nama, pic_telepon, term_hari, catatan, aktif) VALUES
('40000000-0000-0000-0001-000000000001', 'Andi Wijaya', 'umum', '081234500001', 'Jl. Perintis Kemerdekaan No. 12', 'Makassar', NULL, NULL, 0, NULL, true),
('40000000-0000-0000-0001-000000000002', 'CV Karya Mandiri', 'korporat', '081234500002', 'Jl. Veteran Selatan No. 45', 'Makassar', 'Hendra Gunawan', '081298760002', 14, 'Langganan tetap, kirim tiap minggu', true),
('40000000-0000-0000-0001-000000000003', 'Siti Nurhaliza', 'umum', '081234500003', 'Jl. Sultan Alauddin No. 88', 'Makassar', NULL, NULL, 0, NULL, true),
('40000000-0000-0000-0001-000000000004', 'Toko Bangunan Jaya', 'korporat', '081234500004', 'Jl. Poros Sinjai No. 3', 'Sinjai', 'Budi Santoso', '081298760004', 7, NULL, true),
('40000000-0000-0000-0001-000000000005', 'Rina Amalia', 'umum', '081234500005', 'Jl. Pengayoman Blok C No. 5', 'Makassar', NULL, NULL, 0, NULL, true),
('40000000-0000-0000-0001-000000000006', 'PT Cahaya Abadi', 'korporat', '081234500006', 'Jl. Ahmad Yani No. 100', 'Palopo', 'Dedi Setiawan', '081298760006', 30, 'Kontrak tahunan, tagih akhir bulan', true),
('40000000-0000-0000-0001-000000000007', 'Dedi Kurniawan', 'umum', '081234500007', 'Jl. Emmy Saelan No. 21', 'Makassar', NULL, NULL, 0, NULL, true),
('40000000-0000-0000-0001-000000000008', 'UD Sumber Rezeki', 'korporat', '081234500008', 'Jl. Pasar Sentral No. 7', 'Bantaeng', 'Fitri Handayani', '081298760008', 7, NULL, true),
('40000000-0000-0000-0001-000000000009', 'Fitri Handayani', 'umum', '081234500009', 'Jl. Boulevard No. 9', 'Makassar', NULL, NULL, 0, NULL, true),
('40000000-0000-0000-0001-000000000010', 'Apotek Sehat Selalu', 'korporat', '081234500010', 'Jl. Pengayoman No. 55', 'Makassar', 'Nur Aisyah', '081298760010', 14, 'Prioritaskan pengiriman pagi', true),
('40000000-0000-0000-0001-000000000011', 'Agus Salim', 'umum', '081234500011', 'Jl. Poros Maros No. 15', 'Maros', NULL, NULL, 0, NULL, true),
('40000000-0000-0000-0001-000000000012', 'PT Mitra Usaha', 'korporat', '081234500012', 'Jl. Gatot Subroto No. 200', 'Surabaya', 'Hendra Gunawan', '081298760012', 30, NULL, true),
('40000000-0000-0000-0001-000000000013', 'Nur Aisyah', 'umum', '081234500013', 'Jl. Toddopuli Raya No. 33', 'Makassar', NULL, NULL, 0, NULL, true),
('40000000-0000-0000-0001-000000000014', 'CV Bintang Timur', 'korporat', '081234500014', 'Jl. Cendrawasih No. 8', 'Pare-Pare', 'Rudi Hartono', '081298760014', 14, NULL, true),
('40000000-0000-0000-0001-000000000015', 'Hendra Gunawan', 'umum', '081234500015', 'Jl. Rappocini Raya No. 41', 'Makassar', NULL, NULL, 0, NULL, false),
('40000000-0000-0000-0001-000000000016', 'Toko Sembako Barokah', 'korporat', '081234500016', 'Jl. Pasar Terong No. 2', 'Makassar', 'Yuni Kartika', '081298760016', 7, 'Sering minta COD', true),
('40000000-0000-0000-0001-000000000017', 'Yuni Kartika', 'umum', '081234500017', 'Jl. Adhyaksa Baru No. 17', 'Makassar', NULL, NULL, 0, NULL, true),
('40000000-0000-0000-0001-000000000018', 'PT Berkah Sentosa', 'korporat', '081234500018', 'Jl. Diponegoro No. 60', 'Bandung', 'Bambang Prasetyo', '081298760018', 30, 'Kirim rutin akhir bulan', true),
('40000000-0000-0000-0001-000000000019', 'Rudi Hartono', 'umum', '081234500019', 'Jl. Poros Gowa No. 25', 'Gowa', NULL, NULL, 0, NULL, true),
('40000000-0000-0000-0001-000000000020', 'Grosir Elektronik Makmur', 'korporat', '081234500020', 'Jl. Sam Ratulangi No. 30', 'Manado', 'Dewi Anggraini', '081298760020', 21, NULL, true),
('40000000-0000-0000-0001-000000000021', 'Lestari Wulandari', 'umum', '081234500021', 'Jl. Hertasning Baru No. 9', 'Makassar', NULL, NULL, 0, NULL, true),
('40000000-0000-0000-0001-000000000022', 'Bambang Prasetyo', 'umum', '081234500022', 'Jl. Poros Bulukumba No. 4', 'Bulukumba', NULL, NULL, 0, NULL, true),
('40000000-0000-0000-0001-000000000023', 'CV Anugerah Sejahtera', 'korporat', '081234500023', 'Jl. Yos Sudarso No. 18', 'Palembang', 'Irwan Setiadi', '081298760023', 14, NULL, true),
('40000000-0000-0000-0001-000000000024', 'Dewi Anggraini', 'umum', '081234500024', 'Jl. Aroepala No. 6', 'Makassar', NULL, NULL, 0, NULL, true),
('40000000-0000-0000-0001-000000000025', 'Toko Fashion Trendy', 'korporat', '081234500025', 'Jl. Nusantara No. 22', 'Makassar', 'Sri Wahyuni', '081298760025', 7, 'Barang mudah rusak, packing extra', true),
('40000000-0000-0000-0001-000000000026', 'Irwan Setiadi', 'umum', '081234500026', 'Jl. Poros Takalar No. 11', 'Takalar', NULL, NULL, 0, NULL, true),
('40000000-0000-0000-0001-000000000027', 'Sri Wahyuni', 'umum', '081234500027', 'Jl. Skarda N No. 3', 'Makassar', NULL, NULL, 0, NULL, true),
('40000000-0000-0000-0001-000000000028', 'PT Distribusi Timur Raya', 'korporat', '081234500028', 'Jl. Diponegoro No. 77', 'Manado', 'Muh. Yusuf', '081298760028', 21, NULL, true),
('40000000-0000-0000-0001-000000000029', 'Muh. Yusuf', 'umum', '081234500029', 'Jl. Antang Raya No. 14', 'Makassar', NULL, NULL, 0, NULL, true),
('40000000-0000-0000-0001-000000000030', 'Ayu Lestari', 'umum', '081234500030', 'Jl. Poros Jeneponto No. 8', 'Jeneponto', NULL, NULL, 0, NULL, true),
('40000000-0000-0000-0001-000000000031', 'UD Berkah Jaya Motor', 'korporat', '081234500031', 'Jl. Urip Sumoharjo No. 90', 'Makassar', 'Zainal Abidin', '081298760031', 14, 'Sparepart motor, kirim mingguan', true),
('40000000-0000-0000-0001-000000000032', 'Zainal Abidin', 'umum', '081234500032', 'Jl. Tamalanrea Raya No. 19', 'Makassar', NULL, NULL, 0, NULL, true),
('40000000-0000-0000-0001-000000000033', 'Wahyu Ramadhan', 'umum', '081234500033', 'Jl. Poros Palopo No. 5', 'Palopo', NULL, NULL, 0, NULL, true),
('40000000-0000-0000-0001-000000000034', 'PT Karya Boga Nusantara', 'korporat', '081234500034', 'Jl. Metro Tanjung Bunga No. 40', 'Makassar', 'Ratna Sari', '081298760034', 30, 'Makanan beku, wajib prioritas', true),
('40000000-0000-0000-0001-000000000035', 'Fajar Nugroho', 'umum', '081234500035', 'Jl. Poros Denpasar No. 2', 'Denpasar', NULL, NULL, 0, NULL, true)
ON CONFLICT (id) DO NOTHING;
-- 35 armada tambahan — variasi jenis kendaraan, status, plat sesuai kota rute
INSERT INTO armada (id, plat_nomor, jenis_kendaraan, kapasitas_kg, kapasitas_m3, status, sopir_id, catatan, aktif, cabang_id) VALUES
('40000000-0000-0000-0002-000000000001', 'DD 1023 AB', 'Mobil Box', 1200, 22, 'tersedia', '1093e2c3-040c-4438-9697-dc17f72ebdcb', NULL, true, '4a00c436-d431-42dc-a7b3-c1392ca9d6aa'),
('40000000-0000-0000-0002-000000000002', 'DD 2044 CD', 'Pick Up', 800, 10, 'tersedia', '7df2b6bf-9420-46f8-9d48-246878cf4243', NULL, true, '4a00c436-d431-42dc-a7b3-c1392ca9d6aa'),
('40000000-0000-0000-0002-000000000003', 'DD 3155 EF', 'Truk Engkel', 2500, 30, 'tersedia', NULL, NULL, true, '4a00c436-d431-42dc-a7b3-c1392ca9d6aa'),
('40000000-0000-0000-0002-000000000004', 'DD 4066 GH', 'Van', 600, 8, 'maintenance', NULL, 'Ganti kampas rem', true, '4a00c436-d431-42dc-a7b3-c1392ca9d6aa'),
('40000000-0000-0000-0002-000000000005', 'DD 5177 IJ', 'Motor Box', 100, 1.5, 'tersedia', '1093e2c3-040c-4438-9697-dc17f72ebdcb', NULL, true, '4a00c436-d431-42dc-a7b3-c1392ca9d6aa'),
('40000000-0000-0000-0002-000000000006', 'DD 6288 KL', 'Mobil Box', 1200, 22, 'tersedia', NULL, NULL, true, '4a00c436-d431-42dc-a7b3-c1392ca9d6aa'),
('40000000-0000-0000-0002-000000000007', 'DD 7399 MN', 'Truk Fuso', 5000, 45, 'tersedia', '7df2b6bf-9420-46f8-9d48-246878cf4243', 'Khusus rute kargo antar kota', true, '4a00c436-d431-42dc-a7b3-c1392ca9d6aa'),
('40000000-0000-0000-0002-000000000008', 'DD 8410 OP', 'Pick Up', 800, 10, 'nonaktif', NULL, 'Dijual, menunggu STNK baru pemilik', false, '4a00c436-d431-42dc-a7b3-c1392ca9d6aa'),
('40000000-0000-0000-0002-000000000009', 'DD 9521 QR', 'Truk Engkel', 2500, 30, 'tersedia', NULL, NULL, true, '4a00c436-d431-42dc-a7b3-c1392ca9d6aa'),
('40000000-0000-0000-0002-000000000010', 'DD 1632 ST', 'Van', 600, 8, 'tersedia', '1093e2c3-040c-4438-9697-dc17f72ebdcb', NULL, true, '4a00c436-d431-42dc-a7b3-c1392ca9d6aa'),
('40000000-0000-0000-0002-000000000011', 'DD 2743 UV', 'Motor Box', 100, 1.5, 'tersedia', NULL, NULL, true, '4a00c436-d431-42dc-a7b3-c1392ca9d6aa'),
('40000000-0000-0000-0002-000000000012', 'DD 3854 WX', 'Mobil Box', 1200, 22, 'maintenance', NULL, 'Servis rutin 20.000 km', true, '4a00c436-d431-42dc-a7b3-c1392ca9d6aa'),
('40000000-0000-0000-0002-000000000013', 'DD 4965 YZ', 'Pick Up', 800, 10, 'tersedia', '7df2b6bf-9420-46f8-9d48-246878cf4243', NULL, true, '4a00c436-d431-42dc-a7b3-c1392ca9d6aa'),
('40000000-0000-0000-0002-000000000014', 'DD 5076 AA', 'Truk CDD', 8000, 60, 'tersedia', NULL, 'Khusus rute Jakarta-Surabaya', true, '4a00c436-d431-42dc-a7b3-c1392ca9d6aa'),
('40000000-0000-0000-0002-000000000015', 'DD 6187 BB', 'Motor Box', 100, 1.5, 'tersedia', NULL, NULL, true, '4a00c436-d431-42dc-a7b3-c1392ca9d6aa'),
('40000000-0000-0000-0002-000000000016', 'B 1298 CC', 'Truk Fuso', 5000, 45, 'tersedia', NULL, 'Armada cabang Jakarta', true, NULL),
('40000000-0000-0000-0002-000000000017', 'B 2309 DD', 'Van', 600, 8, 'tersedia', NULL, NULL, true, NULL),
('40000000-0000-0000-0002-000000000018', 'B 3410 EE', 'Mobil Box', 1200, 22, 'nonaktif', NULL, 'Kecelakaan ringan, menunggu asuransi', false, NULL),
('40000000-0000-0000-0002-000000000019', 'L 4521 FF', 'Pick Up', 800, 10, 'tersedia', NULL, 'Armada cabang Surabaya', true, NULL),
('40000000-0000-0000-0002-000000000020', 'L 5632 GG', 'Truk Engkel', 2500, 30, 'tersedia', NULL, NULL, true, NULL),
('40000000-0000-0000-0002-000000000021', 'D 6743 HH', 'Van', 600, 8, 'tersedia', NULL, 'Armada cabang Bandung', true, NULL),
('40000000-0000-0000-0002-000000000022', 'H 7854 II', 'Mobil Box', 1200, 22, 'maintenance', NULL, 'Ganti ban belakang', true, NULL),
('40000000-0000-0000-0002-000000000023', 'AB 8965 JJ', 'Pick Up', 800, 10, 'tersedia', NULL, 'Armada cabang Yogyakarta', true, NULL),
('40000000-0000-0000-0002-000000000024', 'BK 9076 KK', 'Truk Engkel', 2500, 30, 'tersedia', NULL, 'Armada cabang Medan', true, NULL),
('40000000-0000-0000-0002-000000000025', 'DK 1187 LL', 'Van', 600, 8, 'tersedia', NULL, 'Armada cabang Denpasar', true, NULL),
('40000000-0000-0000-0002-000000000026', 'DD 2298 MM', 'Mobil Box', 1200, 22, 'tersedia', NULL, NULL, true, '4a00c436-d431-42dc-a7b3-c1392ca9d6aa'),
('40000000-0000-0000-0002-000000000027', 'DD 3309 NN', 'Motor Box', 100, 1.5, 'tersedia', '1093e2c3-040c-4438-9697-dc17f72ebdcb', NULL, true, '4a00c436-d431-42dc-a7b3-c1392ca9d6aa'),
('40000000-0000-0000-0002-000000000028', 'DD 4410 OO', 'Pick Up', 800, 10, 'nonaktif', NULL, 'Dijual, sudah tua', false, '4a00c436-d431-42dc-a7b3-c1392ca9d6aa'),
('40000000-0000-0000-0002-000000000029', 'DD 5521 PP', 'Truk Engkel', 2500, 30, 'tersedia', NULL, NULL, true, '4a00c436-d431-42dc-a7b3-c1392ca9d6aa'),
('40000000-0000-0000-0002-000000000030', 'DD 6632 QQ', 'Van', 600, 8, 'tersedia', '7df2b6bf-9420-46f8-9d48-246878cf4243', NULL, true, '4a00c436-d431-42dc-a7b3-c1392ca9d6aa'),
('40000000-0000-0000-0002-000000000031', 'DD 7743 RR', 'Mobil Box', 1200, 22, 'tersedia', NULL, NULL, true, '4a00c436-d431-42dc-a7b3-c1392ca9d6aa'),
('40000000-0000-0000-0002-000000000032', 'DD 8854 SS', 'Motor Box', 100, 1.5, 'maintenance', NULL, 'Ganti oli & rantai', true, '4a00c436-d431-42dc-a7b3-c1392ca9d6aa'),
('40000000-0000-0000-0002-000000000033', 'KT 9965 TT', 'Truk Fuso', 5000, 45, 'tersedia', NULL, 'Armada cabang Balikpapan', true, NULL),
('40000000-0000-0000-0002-000000000034', 'DB 1076 UU', 'Pick Up', 800, 10, 'tersedia', NULL, 'Armada cabang Manado', true, NULL),
('40000000-0000-0000-0002-000000000035', 'BG 2187 VV', 'Van', 600, 8, 'tersedia', NULL, 'Armada cabang Palembang', true, NULL)
ON CONFLICT (id) DO NOTHING;
-- 35 pengiriman tambahan — variasi milestone/status_bayar/jenis_layanan realistis
INSERT INTO pengiriman (
  id, nomor_resi, tanggal, jenis_layanan,
  pengirim_nama, pengirim_telepon, pengirim_alamat, pengirim_kota,
  penerima_nama, penerima_telepon, penerima_alamat, penerima_kota,
  berat_kg, isi_barang, nilai_barang, ongkir, biaya_asuransi, total_tagihan,
  status_bayar, metode_bayar, uang_dp, milestone, jumlah_gagal,
  pod_penerima_nama, pod_foto_url,
  petugas_id, petugas_nama, petugas_telepon, estimasi_hari,
  catatan, customer_id, cabang_id
) VALUES
-- selesai + lunas (dgn POD)
('40000000-0000-0000-0003-000000000001','BNG-SEED0021','2026-05-02 08:30:00+00','reguler','Andi Wijaya','081234500001','Jl. Perintis Kemerdekaan No. 12','Makassar','Nurdin Saleh','081355511101','Jl. Poros Sinjai No. 20','Sinjai',2,'Dokumen Penting',150000,35000,0,35000,'lunas','transfer',35000,'selesai',0,'Nurdin Saleh','https://placehold.co/400x300?text=POD','1093e2c3-040c-4438-9697-dc17f72ebdcb','Sopir Bunga Naik','081200000001',2,NULL,'40000000-0000-0000-0001-000000000001','4a00c436-d431-42dc-a7b3-c1392ca9d6aa'),
('40000000-0000-0000-0003-000000000002','BNG-SEED0022','2026-05-05 09:15:00+00','reguler','CV Karya Mandiri','081234500002','Jl. Veteran Selatan No. 45','Makassar','Toko Bangunan Jaya','081234500004','Jl. Poros Sinjai No. 3','Sinjai',15,'Sparepart Motor',800000,45000,10000,55000,'lunas','transfer',55000,'selesai',0,'Budi Santoso','https://placehold.co/400x300?text=POD','7df2b6bf-9420-46f8-9d48-246878cf4243','Pengiriman Bunga Naik','081200000002',2,NULL,'40000000-0000-0000-0001-000000000002','4a00c436-d431-42dc-a7b3-c1392ca9d6aa'),
('40000000-0000-0000-0003-000000000003','BNG-SEED0023','2026-05-08 10:00:00+00','express','PT Distribusi Nusantara','081399990000','Jl. Ahmad Yani No. 100','Jakarta','Kantor Cabang Makassar','081234567800','Jl. Boulevard No. 1','Makassar',3,'Dokumen Penting',200000,95000,0,95000,'lunas','transfer',95000,'selesai',0,'Fitri Handayani','https://placehold.co/400x300?text=POD',NULL,'Kurir Harian Rudi',NULL,2,NULL,NULL,'4a00c436-d431-42dc-a7b3-c1392ca9d6aa'),
('40000000-0000-0000-0003-000000000004','BNG-SEED0024','2026-05-10 08:00:00+00','kargo','PT Karya Boga Nusantara','081234500034','Jl. Metro Tanjung Bunga No. 40','Makassar','Grosir Elektronik Makmur','081234500020','Jl. Sam Ratulangi No. 30','Manado',250,'Makanan Beku',5000000,1800000,50000,1850000,'lunas','transfer',1850000,'selesai',0,'Dewi Anggraini','https://placehold.co/400x300?text=POD','1093e2c3-040c-4438-9697-dc17f72ebdcb','Sopir Bunga Naik','081200000001',5,'Wajib pakai cold box','40000000-0000-0000-0001-000000000034','4a00c436-d431-42dc-a7b3-c1392ca9d6aa'),
('40000000-0000-0000-0003-000000000005','BNG-SEED0025','2026-05-12 11:00:00+00','reguler','Siti Nurhaliza','081234500003','Jl. Sultan Alauddin No. 88','Makassar','Rina Amalia','081234500005','Jl. Pengayoman Blok C No. 5','Makassar',1,'Pakaian',120000,25000,0,25000,'lunas','cash',25000,'selesai',0,'Rina Amalia','https://placehold.co/400x300?text=POD','7df2b6bf-9420-46f8-9d48-246878cf4243','Pengiriman Bunga Naik','081200000002',1,NULL,'40000000-0000-0000-0001-000000000003','4a00c436-d431-42dc-a7b3-c1392ca9d6aa'),
-- selesai + dp (masih ada sisa, contoh korporat term)
('40000000-0000-0000-0003-000000000006','BNG-SEED0026','2026-05-15 09:00:00+00','reguler','PT Cahaya Abadi','081234500006','Jl. Ahmad Yani No. 100','Palopo','Toko Fashion Trendy','081234500025','Jl. Nusantara No. 22','Makassar',8,'Kain/Tekstil',600000,90000,0,90000,'dp','transfer',50000,'selesai',0,'Sri Wahyuni','https://placehold.co/400x300?text=POD',NULL,'Budi Ekspedisi',NULL,3,'Sisa dibayar akhir bulan (term 30 hari)','40000000-0000-0000-0001-000000000006','4a00c436-d431-42dc-a7b3-c1392ca9d6aa'),
('40000000-0000-0000-0003-000000000007','BNG-SEED0027','2026-05-18 10:30:00+00','reguler','Dedi Kurniawan','081234500007','Jl. Emmy Saelan No. 21','Makassar','Wahyu Ramadhan','081234500033','Jl. Poros Palopo No. 5','Palopo',4,'Elektronik',900000,80000,15000,95000,'dp','transfer',40000,'selesai',0,'Wahyu Ramadhan','https://placehold.co/400x300?text=POD','1093e2c3-040c-4438-9697-dc17f72ebdcb','Sopir Bunga Naik','081200000001',3,NULL,'40000000-0000-0000-0001-000000000007',NULL),
-- dikirim (dalam perjalanan)
('40000000-0000-0000-0003-000000000008','BNG-SEED0028','2026-07-05 08:00:00+00','reguler','UD Sumber Rezeki','081234500008','Jl. Pasar Sentral No. 7','Bantaeng','Agus Salim','081234500011','Jl. Poros Maros No. 15','Maros',6,'Peralatan Rumah Tangga',400000,50000,0,50000,'lunas','transfer',50000,'dikirim',0,NULL,NULL,'7df2b6bf-9420-46f8-9d48-246878cf4243','Pengiriman Bunga Naik','081200000002',2,NULL,'40000000-0000-0000-0001-000000000008',NULL),
('40000000-0000-0000-0003-000000000009','BNG-SEED0029','2026-07-08 09:00:00+00','express','PT Mitra Usaha','081234500012','Jl. Gatot Subroto No. 200','Surabaya','Nur Aisyah','081234500013','Jl. Toddopuli Raya No. 33','Makassar',2,'Dokumen Penting',100000,120000,0,120000,'lunas','transfer',120000,'dikirim',0,NULL,NULL,NULL,'Kurir Harian Rudi',NULL,2,NULL,'40000000-0000-0000-0001-000000000012',NULL),
('40000000-0000-0000-0003-000000000010','BNG-SEED0030','2026-07-10 10:00:00+00','reguler','CV Bintang Timur','081234500014','Jl. Cendrawasih No. 8','Pare-Pare','Ayu Lestari','081234500030','Jl. Poros Jeneponto No. 8','Jeneponto',5,'Buku & Alat Tulis',250000,60000,0,60000,'belum_bayar','transfer',0,'dikirim',0,NULL,NULL,'1093e2c3-040c-4438-9697-dc17f72ebdcb','Sopir Bunga Naik','081200000001',3,NULL,'40000000-0000-0000-0001-000000000014',NULL),
-- dijemput
('40000000-0000-0000-0003-000000000011','BNG-SEED0031','2026-07-12 08:00:00+00','reguler','Toko Sembako Barokah','081234500016','Jl. Pasar Terong No. 2','Makassar','Muh. Yusuf','081234500029','Jl. Antang Raya No. 14','Makassar',10,'Bahan Bangunan Ringan',300000,30000,0,30000,'lunas','cod',30000,'dijemput',0,NULL,NULL,'7df2b6bf-9420-46f8-9d48-246878cf4243','Pengiriman Bunga Naik','081200000002',1,NULL,'40000000-0000-0000-0001-000000000016',NULL),
('40000000-0000-0000-0003-000000000012','BNG-SEED0032','2026-07-13 09:30:00+00','reguler','Yuni Kartika','081234500017','Jl. Adhyaksa Baru No. 17','Makassar','Zainal Abidin','081234500032','Jl. Tamalanrea Raya No. 19','Makassar',1,'Kosmetik',80000,25000,0,25000,'belum_bayar','cash',0,'dijemput',0,NULL,NULL,NULL,'Sopir Harian Amir',NULL,1,NULL,'40000000-0000-0000-0001-000000000017',NULL),
('40000000-0000-0000-0003-000000000013','BNG-SEED0033','2026-07-14 08:15:00+00','kargo','PT Berkah Sentosa','081234500018','Jl. Diponegoro No. 60','Bandung','UD Berkah Jaya Motor','081234500031','Jl. Urip Sumoharjo No. 90','Makassar',180,'Suku Cadang Mobil',3500000,1400000,40000,1440000,'dp','transfer',500000,'dijemput',0,NULL,NULL,'1093e2c3-040c-4438-9697-dc17f72ebdcb','Sopir Bunga Naik','081200000001',5,NULL,'40000000-0000-0000-0001-000000000018',NULL),
-- diproses (baru masuk)
('40000000-0000-0000-0003-000000000014','BNG-SEED0034','2026-07-15 08:00:00+00','reguler','Rudi Hartono','081234500019','Jl. Poros Gowa No. 25','Gowa','Lestari Wulandari','081234500021','Jl. Hertasning Baru No. 9','Makassar',3,'Mainan Anak',150000,25000,0,25000,'belum_bayar','transfer',0,'diproses',0,NULL,NULL,NULL,NULL,NULL,1,NULL,'40000000-0000-0000-0001-000000000019',NULL),
('40000000-0000-0000-0003-000000000015','BNG-SEED0035','2026-07-15 10:00:00+00','reguler','Grosir Elektronik Makmur','081234500020','Jl. Sam Ratulangi No. 30','Manado','Bambang Prasetyo','081234500022','Jl. Poros Bulukumba No. 4','Bulukumba',2,'Elektronik',700000,110000,20000,130000,'belum_bayar','transfer',0,'diproses',0,NULL,NULL,NULL,NULL,NULL,4,'Barang fragile, handle with care',NULL,NULL),
('40000000-0000-0000-0003-000000000016','BNG-SEED0036','2026-07-16 09:00:00+00','reguler','Lestari Wulandari','081234500021','Jl. Hertasning Baru No. 9','Makassar','CV Anugerah Sejahtera','081234500023','Jl. Yos Sudarso No. 18','Palembang',7,'Tas & Aksesoris',350000,140000,0,140000,'belum_bayar','transfer',0,'diproses',0,NULL,NULL,NULL,NULL,NULL,4,NULL,'40000000-0000-0000-0001-000000000021',NULL),
('40000000-0000-0000-0003-000000000017','BNG-SEED0037','2026-07-16 11:00:00+00','express','Bambang Prasetyo','081234500022','Jl. Poros Bulukumba No. 4','Bulukumba','Dewi Anggraini','081234500024','Jl. Aroepala No. 6','Makassar',1,'Dokumen Penting',50000,45000,0,45000,'lunas','transfer',45000,'diproses',0,NULL,NULL,NULL,NULL,NULL,1,NULL,'40000000-0000-0000-0001-000000000022',NULL),
('40000000-0000-0000-0003-000000000018','BNG-SEED0038','2026-07-17 08:30:00+00','reguler','CV Anugerah Sejahtera','081234500023','Jl. Yos Sudarso No. 18','Palembang','Toko Fashion Trendy','081234500025','Jl. Nusantara No. 22','Makassar',9,'Kain/Tekstil',500000,150000,0,150000,'belum_bayar','transfer',0,'diproses',0,NULL,NULL,NULL,NULL,NULL,4,NULL,'40000000-0000-0000-0001-000000000023',NULL),
-- gagal_kirim (masih menunggu keputusan)
('40000000-0000-0000-0003-000000000019','BNG-SEED0039','2026-06-20 08:00:00+00','reguler','Irwan Setiadi','081234500026','Jl. Poros Takalar No. 11','Takalar','Sri Wahyuni','081234500027','Jl. Skarda N No. 3','Makassar',2,'Peralatan Rumah Tangga',180000,30000,0,30000,'lunas','transfer',30000,'gagal_kirim',1,NULL,NULL,'1093e2c3-040c-4438-9697-dc17f72ebdcb','Sopir Bunga Naik','081200000001',1,NULL,'40000000-0000-0000-0001-000000000026',NULL),
('40000000-0000-0000-0003-000000000020','BNG-SEED0040','2026-06-25 09:00:00+00','reguler','PT Distribusi Timur Raya','081234500028','Jl. Diponegoro No. 77','Manado','Muh. Yusuf','081234500029','Jl. Antang Raya No. 14','Makassar',5,'Buku & Alat Tulis',300000,120000,0,120000,'lunas','transfer',120000,'gagal_kirim',2,NULL,NULL,'7df2b6bf-9420-46f8-9d48-246878cf4243','Pengiriman Bunga Naik','081200000002',4,'Sudah 2x gagal, dijadwalkan retur','40000000-0000-0000-0001-000000000028',NULL),
-- retur (terminal)
('40000000-0000-0000-0003-000000000021','BNG-SEED0041','2026-06-01 08:00:00+00','reguler','Ayu Lestari','081234500030','Jl. Poros Jeneponto No. 8','Jeneponto','UD Berkah Jaya Motor','081234500031','Jl. Urip Sumoharjo No. 90','Makassar',3,'Sparepart Motor',400000,40000,0,40000,'lunas','transfer',40000,'retur',3,NULL,NULL,'1093e2c3-040c-4438-9697-dc17f72ebdcb','Sopir Bunga Naik','081200000001',2,'Alamat tidak ditemukan setelah 3x percobaan','40000000-0000-0000-0001-000000000031',NULL),
('40000000-0000-0000-0003-000000000022','BNG-SEED0042','2026-06-05 09:00:00+00','reguler','Zainal Abidin','081234500032','Jl. Tamalanrea Raya No. 19','Makassar','Wahyu Ramadhan','081234500033','Jl. Poros Palopo No. 5','Palopo',2,'Kosmetik',90000,90000,0,90000,'belum_bayar','transfer',0,'retur',1,NULL,NULL,NULL,'Budi Ekspedisi',NULL,3,'Penerima menolak barang','40000000-0000-0000-0001-000000000032',NULL),
-- lebih banyak selesai (isi mayoritas realistis)
('40000000-0000-0000-0003-000000000023','BNG-SEED0043','2026-06-08 08:00:00+00','reguler','PT Karya Boga Nusantara','081234500034','Jl. Metro Tanjung Bunga No. 40','Makassar','Fajar Nugroho','081234500035','Jl. Poros Denpasar No. 2','Denpasar',12,'Makanan Beku',600000,220000,10000,230000,'lunas','transfer',230000,'selesai',0,'Fajar Nugroho','https://placehold.co/400x300?text=POD','1093e2c3-040c-4438-9697-dc17f72ebdcb','Sopir Bunga Naik','081200000001',4,NULL,'40000000-0000-0000-0001-000000000034',NULL),
('40000000-0000-0000-0003-000000000024','BNG-SEED0044','2026-06-10 09:00:00+00','reguler','Andi Wijaya','081234500001','Jl. Perintis Kemerdekaan No. 12','Makassar','CV Karya Mandiri','081234500002','Jl. Veteran Selatan No. 45','Makassar',4,'Alat Elektronik Rumah Tangga',450000,30000,0,30000,'lunas','cash',30000,'selesai',0,'Hendra Gunawan','https://placehold.co/400x300?text=POD','7df2b6bf-9420-46f8-9d48-246878cf4243','Pengiriman Bunga Naik','081200000002',1,NULL,'40000000-0000-0000-0001-000000000001','4a00c436-d431-42dc-a7b3-c1392ca9d6aa'),
('40000000-0000-0000-0003-000000000025','BNG-SEED0045','2026-06-12 10:00:00+00','express','Toko Bangunan Jaya','081234500004','Jl. Poros Sinjai No. 3','Sinjai','Siti Nurhaliza','081234500003','Jl. Sultan Alauddin No. 88','Makassar',1,'Dokumen Penting',80000,55000,0,55000,'lunas','transfer',55000,'selesai',0,'Siti Nurhaliza','https://placehold.co/400x300?text=POD',NULL,'Kurir Harian Rudi',NULL,1,NULL,'40000000-0000-0000-0001-000000000004','4a00c436-d431-42dc-a7b3-c1392ca9d6aa'),
('40000000-0000-0000-0003-000000000026','BNG-SEED0046','2026-06-14 08:30:00+00','reguler','Rina Amalia','081234500005','Jl. Pengayoman Blok C No. 5','Makassar','PT Cahaya Abadi','081234500006','Jl. Ahmad Yani No. 100','Palopo',6,'Perlengkapan Bayi',350000,90000,0,90000,'lunas','transfer',90000,'selesai',0,'Dedi Setiawan','https://placehold.co/400x300?text=POD','1093e2c3-040c-4438-9697-dc17f72ebdcb','Sopir Bunga Naik','081200000001',3,NULL,'40000000-0000-0000-0001-000000000005',NULL),
('40000000-0000-0000-0003-000000000027','BNG-SEED0047','2026-06-16 09:00:00+00','reguler','PT Cahaya Abadi','081234500006','Jl. Ahmad Yani No. 100','Palopo','Dedi Kurniawan','081234500007','Jl. Emmy Saelan No. 21','Makassar',3,'Furniture Kecil',280000,90000,0,90000,'dp','transfer',60000,'selesai',0,'Dedi Kurniawan','https://placehold.co/400x300?text=POD','7df2b6bf-9420-46f8-9d48-246878cf4243','Pengiriman Bunga Naik','081200000002',3,NULL,'40000000-0000-0000-0001-000000000006',NULL),
('40000000-0000-0000-0003-000000000028','BNG-SEED0048','2026-06-18 08:00:00+00','reguler','UD Sumber Rezeki','081234500008','Jl. Pasar Sentral No. 7','Bantaeng','Fitri Handayani','081234500009','Jl. Boulevard No. 9','Makassar',2,'Obat-obatan',120000,35000,0,35000,'lunas','transfer',35000,'selesai',0,'Fitri Handayani','https://placehold.co/400x300?text=POD','1093e2c3-040c-4438-9697-dc17f72ebdcb','Sopir Bunga Naik','081200000001',2,NULL,'40000000-0000-0000-0001-000000000008',NULL),
('40000000-0000-0000-0003-000000000029','BNG-SEED0049','2026-06-20 09:30:00+00','reguler','Apotek Sehat Selalu','081234500010','Jl. Pengayoman No. 55','Makassar','Agus Salim','081234500011','Jl. Poros Maros No. 15','Maros',1,'Obat-obatan',60000,25000,0,25000,'lunas','transfer',25000,'selesai',0,'Agus Salim','https://placehold.co/400x300?text=POD','7df2b6bf-9420-46f8-9d48-246878cf4243','Pengiriman Bunga Naik','081200000002',1,'Prioritas pagi','40000000-0000-0000-0001-000000000010',NULL),
('40000000-0000-0000-0003-000000000030','BNG-SEED0050','2026-06-22 08:00:00+00','kargo','PT Mitra Usaha','081234500012','Jl. Gatot Subroto No. 200','Surabaya','Nur Aisyah','081234500013','Jl. Toddopuli Raya No. 33','Makassar',120,'Hasil Kerajinan Tangan',2500000,850000,25000,875000,'lunas','transfer',875000,'selesai',0,'Nur Aisyah','https://placehold.co/400x300?text=POD','1093e2c3-040c-4438-9697-dc17f72ebdcb','Sopir Bunga Naik','081200000001',4,NULL,'40000000-0000-0000-0001-000000000012',NULL),
('40000000-0000-0000-0003-000000000031','BNG-SEED0051','2026-06-24 09:00:00+00','reguler','CV Bintang Timur','081234500014','Jl. Cendrawasih No. 8','Pare-Pare','Hendra Gunawan','081234500015','Jl. Rappocini Raya No. 41','Makassar',3,'Produk UMKM',150000,60000,0,60000,'lunas','cash',60000,'selesai',0,'Hendra Gunawan','https://placehold.co/400x300?text=POD','7df2b6bf-9420-46f8-9d48-246878cf4243','Pengiriman Bunga Naik','081200000002',3,NULL,'40000000-0000-0000-0001-000000000014',NULL),
('40000000-0000-0000-0003-000000000032','BNG-SEED0052','2026-06-26 08:30:00+00','reguler','Toko Sembako Barokah','081234500016','Jl. Pasar Terong No. 2','Makassar','Yuni Kartika','081234500017','Jl. Adhyaksa Baru No. 17','Makassar',8,'Bahan Bangunan Ringan',200000,25000,0,25000,'lunas','cod',25000,'selesai',0,'Yuni Kartika','https://placehold.co/400x300?text=POD','1093e2c3-040c-4438-9697-dc17f72ebdcb','Sopir Bunga Naik','081200000001',1,NULL,'40000000-0000-0000-0001-000000000016',NULL),
('40000000-0000-0000-0003-000000000033','BNG-SEED0053','2026-06-28 09:00:00+00','reguler','PT Berkah Sentosa','081234500018','Jl. Diponegoro No. 60','Bandung','Rudi Hartono','081234500019','Jl. Poros Gowa No. 25','Gowa',5,'Suku Cadang Mobil',400000,180000,0,180000,'dp','transfer',100000,'selesai',0,'Rudi Hartono','https://placehold.co/400x300?text=POD','7df2b6bf-9420-46f8-9d48-246878cf4243','Pengiriman Bunga Naik','081200000002',5,NULL,'40000000-0000-0000-0001-000000000018',NULL),
('40000000-0000-0000-0003-000000000034','BNG-SEED0054','2026-06-30 08:00:00+00','reguler','Grosir Elektronik Makmur','081234500020','Jl. Sam Ratulangi No. 30','Manado','Lestari Wulandari','081234500021','Jl. Hertasning Baru No. 9','Makassar',2,'Elektronik',350000,120000,15000,135000,'lunas','transfer',135000,'selesai',0,'Lestari Wulandari','https://placehold.co/400x300?text=POD','1093e2c3-040c-4438-9697-dc17f72ebdcb','Sopir Bunga Naik','081200000001',4,NULL,'40000000-0000-0000-0001-000000000020',NULL),
('40000000-0000-0000-0003-000000000035','BNG-SEED0055','2026-07-02 09:00:00+00','reguler','Bambang Prasetyo','081234500022','Jl. Poros Bulukumba No. 4','Bulukumba','PT Distribusi Timur Raya','081234500028','Jl. Diponegoro No. 77','Manado',10,'Hasil Kerajinan Tangan',450000,200000,0,200000,'belum_bayar','transfer',0,'selesai',0,'Muh. Yusuf','https://placehold.co/400x300?text=POD','7df2b6bf-9420-46f8-9d48-246878cf4243','Pengiriman Bunga Naik','081200000002',4,'Belum bayar, follow up keuangan','40000000-0000-0000-0001-000000000028',NULL)
ON CONFLICT (id) DO NOTHING;
-- Riwayat pembayaran utk 27 pengiriman baru yang sudah lunas/dp — 1 baris
-- pembayaran per kiriman, tanggal sama dengan tanggal kiriman (kasus umum:
-- bayar penuh/DP di muka saat order dibuat), jumlah = uang_dp
INSERT INTO pengiriman_pembayaran (id, pengiriman_id, jumlah, metode, created_at)
SELECT
  ('50000000-0000-0000-0001-' || lpad((row_number() over (order by id))::text, 12, '0'))::uuid,
  id, uang_dp, metode_bayar, tanggal
FROM pengiriman
WHERE id::text LIKE '40000000-0000-0000-0003-%' AND uang_dp > 0
ON CONFLICT (id) DO NOTHING;
-- 1 baris riwayat tracking per pengiriman baru, merefleksikan milestone saat ini
INSERT INTO pengiriman_tracking (id, pengiriman_id, milestone, catatan, alasan_gagal, created_at)
SELECT
  ('50000000-0000-0000-0002-' || lpad((row_number() over (order by id))::text, 12, '0'))::uuid,
  id,
  milestone,
  CASE milestone
    WHEN 'retur' THEN 'Diputuskan retur setelah beberapa kali percobaan gagal'
    WHEN 'selesai' THEN NULL
    ELSE NULL
  END,
  CASE milestone
    WHEN 'gagal_kirim' THEN (ARRAY['alamat_salah','tidak_bisa_dihubungi','penerima_tidak_ada'])[1 + (('x' || substr(md5(id::text),1,4))::bit(16)::int % 3)]
    ELSE NULL
  END,
  tanggal + interval '3 hours'
FROM pengiriman
WHERE id::text LIKE '40000000-0000-0000-0003-%'
ON CONFLICT (id) DO NOTHING;
-- 35 manifest tambahan — draft(8)/berangkat(5)/selesai(18)/batal(4)
INSERT INTO manifest (id, armada_id, sopir_id, rute, tanggal_berangkat, status, catatan, cabang_id) VALUES
-- draft (8) — utk kiriman diproses/dijemput
('40000000-0000-0000-0004-000000000001','40000000-0000-0000-0002-000000000001','1093e2c3-040c-4438-9697-dc17f72ebdcb','Makassar - Gowa','2026-07-19','draft',NULL,'4a00c436-d431-42dc-a7b3-c1392ca9d6aa'),
('40000000-0000-0000-0004-000000000002','40000000-0000-0000-0002-000000000002','7df2b6bf-9420-46f8-9d48-246878cf4243','Makassar - Manado','2026-07-19','draft',NULL,'4a00c436-d431-42dc-a7b3-c1392ca9d6aa'),
('40000000-0000-0000-0004-000000000003','40000000-0000-0000-0002-000000000006',NULL,'Makassar - Palembang','2026-07-20','draft',NULL,'4a00c436-d431-42dc-a7b3-c1392ca9d6aa'),
('40000000-0000-0000-0004-000000000004','40000000-0000-0000-0002-000000000009',NULL,'Palembang - Makassar','2026-07-20','draft',NULL,NULL),
('40000000-0000-0000-0004-000000000005','40000000-0000-0000-0002-000000000010','1093e2c3-040c-4438-9697-dc17f72ebdcb','Makassar - Makassar (dalam kota)','2026-07-19','draft',NULL,'4a00c436-d431-42dc-a7b3-c1392ca9d6aa'),
('40000000-0000-0000-0004-000000000006','40000000-0000-0000-0002-000000000011','7df2b6bf-9420-46f8-9d48-246878cf4243','Makassar - Makassar (dalam kota)','2026-07-19','draft',NULL,'4a00c436-d431-42dc-a7b3-c1392ca9d6aa'),
('40000000-0000-0000-0004-000000000007','40000000-0000-0000-0002-000000000013',NULL,'Bandung - Makassar (Kargo)','2026-07-21','draft',NULL,NULL),
('40000000-0000-0000-0004-000000000008','40000000-0000-0000-0002-000000000026','1093e2c3-040c-4438-9697-dc17f72ebdcb','Gowa - Makassar','2026-07-19','draft',NULL,'4a00c436-d431-42dc-a7b3-c1392ca9d6aa'),
-- berangkat (5) — utk kiriman dikirim/gagal_kirim (retry)
('40000000-0000-0000-0004-000000000009','40000000-0000-0000-0002-000000000003','7df2b6bf-9420-46f8-9d48-246878cf4243','Bantaeng - Maros','2026-07-05','berangkat',NULL,'4a00c436-d431-42dc-a7b3-c1392ca9d6aa'),
('40000000-0000-0000-0004-000000000010','40000000-0000-0000-0002-000000000019',NULL,'Surabaya - Makassar','2026-07-08','berangkat',NULL,NULL),
('40000000-0000-0000-0004-000000000011','40000000-0000-0000-0002-000000000020',NULL,'Pare-Pare - Jeneponto','2026-07-10','berangkat',NULL,NULL),
('40000000-0000-0000-0004-000000000012','40000000-0000-0000-0002-000000000027','1093e2c3-040c-4438-9697-dc17f72ebdcb','Takalar - Makassar (kirim ulang)','2026-06-21','berangkat','Percobaan ke-2 setelah gagal pertama','4a00c436-d431-42dc-a7b3-c1392ca9d6aa'),
('40000000-0000-0000-0004-000000000013','40000000-0000-0000-0002-000000000030','7df2b6bf-9420-46f8-9d48-246878cf4243','Manado - Makassar (kirim ulang)','2026-06-26','berangkat','Percobaan ke-3 setelah 2x gagal','4a00c436-d431-42dc-a7b3-c1392ca9d6aa'),
-- selesai (18) — trip yang sudah tuntas
('40000000-0000-0000-0004-000000000014','40000000-0000-0000-0002-000000000001','1093e2c3-040c-4438-9697-dc17f72ebdcb','Makassar - Sinjai','2026-05-02','selesai',NULL,'4a00c436-d431-42dc-a7b3-c1392ca9d6aa'),
('40000000-0000-0000-0004-000000000015','40000000-0000-0000-0002-000000000002','7df2b6bf-9420-46f8-9d48-246878cf4243','Makassar - Sinjai','2026-05-05','selesai',NULL,'4a00c436-d431-42dc-a7b3-c1392ca9d6aa'),
('40000000-0000-0000-0004-000000000016','40000000-0000-0000-0002-000000000016',NULL,'Jakarta - Makassar (Express)','2026-05-08','selesai',NULL,NULL),
('40000000-0000-0000-0004-000000000017','40000000-0000-0000-0002-000000000007','1093e2c3-040c-4438-9697-dc17f72ebdcb','Makassar - Manado (Kargo)','2026-05-10','selesai','Bawa cold box khusus frozen food','4a00c436-d431-42dc-a7b3-c1392ca9d6aa'),
('40000000-0000-0000-0004-000000000018','40000000-0000-0000-0002-000000000005','7df2b6bf-9420-46f8-9d48-246878cf4243','Makassar - Makassar (dalam kota)','2026-05-12','selesai',NULL,'4a00c436-d431-42dc-a7b3-c1392ca9d6aa'),
('40000000-0000-0000-0004-000000000019','40000000-0000-0000-0002-000000000012','1093e2c3-040c-4438-9697-dc17f72ebdcb','Palopo - Makassar','2026-05-15','selesai',NULL,'4a00c436-d431-42dc-a7b3-c1392ca9d6aa'),
('40000000-0000-0000-0004-000000000020','40000000-0000-0000-0002-000000000029',NULL,'Makassar - Palopo','2026-05-18','selesai',NULL,'4a00c436-d431-42dc-a7b3-c1392ca9d6aa'),
('40000000-0000-0000-0004-000000000021','40000000-0000-0000-0002-000000000014',NULL,'Makassar - Denpasar (Kargo)','2026-06-08','selesai',NULL,NULL),
('40000000-0000-0000-0004-000000000022','40000000-0000-0000-0002-000000000031','1093e2c3-040c-4438-9697-dc17f72ebdcb','Makassar - Makassar (dalam kota)','2026-06-10','selesai',NULL,'4a00c436-d431-42dc-a7b3-c1392ca9d6aa'),
('40000000-0000-0000-0004-000000000023','40000000-0000-0000-0002-000000000006',NULL,'Sinjai - Makassar (Express)','2026-06-12','selesai',NULL,'4a00c436-d431-42dc-a7b3-c1392ca9d6aa'),
('40000000-0000-0000-0004-000000000024','40000000-0000-0000-0002-000000000009','7df2b6bf-9420-46f8-9d48-246878cf4243','Makassar - Palopo','2026-06-14','selesai',NULL,'4a00c436-d431-42dc-a7b3-c1392ca9d6aa'),
('40000000-0000-0000-0004-000000000025','40000000-0000-0000-0002-000000000010','1093e2c3-040c-4438-9697-dc17f72ebdcb','Palopo - Makassar','2026-06-16','selesai',NULL,'4a00c436-d431-42dc-a7b3-c1392ca9d6aa'),
('40000000-0000-0000-0004-000000000026','40000000-0000-0000-0002-000000000021',NULL,'Makassar - Maros','2026-06-18','selesai',NULL,NULL),
('40000000-0000-0000-0004-000000000027','40000000-0000-0000-0002-000000000023',NULL,'Makassar - Maros','2026-06-20','selesai',NULL,NULL),
('40000000-0000-0000-0004-000000000028','40000000-0000-0000-0002-000000000024',NULL,'Surabaya - Makassar (Kargo)','2026-06-22','selesai',NULL,NULL),
('40000000-0000-0000-0004-000000000029','40000000-0000-0000-0002-000000000025','7df2b6bf-9420-46f8-9d48-246878cf4243','Pare-Pare - Makassar','2026-06-24','selesai',NULL,'4a00c436-d431-42dc-a7b3-c1392ca9d6aa'),
('40000000-0000-0000-0004-000000000030','40000000-0000-0000-0002-000000000032','1093e2c3-040c-4438-9697-dc17f72ebdcb','Makassar - Makassar (dalam kota)','2026-06-26','selesai',NULL,'4a00c436-d431-42dc-a7b3-c1392ca9d6aa'),
('40000000-0000-0000-0004-000000000031','40000000-0000-0000-0002-000000000033',NULL,'Bandung - Gowa (Kargo)','2026-06-28','selesai',NULL,NULL),
-- batal (4)
('40000000-0000-0000-0004-000000000032','40000000-0000-0000-0002-000000000004',NULL,'Makassar - Bulukumba (Batal, armada maintenance)','2026-06-05','batal','Dibatalkan, armada masuk bengkel mendadak','4a00c436-d431-42dc-a7b3-c1392ca9d6aa'),
('40000000-0000-0000-0004-000000000033','40000000-0000-0000-0002-000000000008',NULL,'Makassar - Takalar (Batal)','2026-06-10','batal','Sopir sakit, trip ditunda lalu dibatalkan','4a00c436-d431-42dc-a7b3-c1392ca9d6aa'),
('40000000-0000-0000-0004-000000000034','40000000-0000-0000-0002-000000000012','1093e2c3-040c-4438-9697-dc17f72ebdcb','Makassar - Jeneponto (Batal, mogok)','2026-06-15','batal','Kendaraan mogok di jalan','4a00c436-d431-42dc-a7b3-c1392ca9d6aa'),
('40000000-0000-0000-0004-000000000035','40000000-0000-0000-0002-000000000028',NULL,'Makassar - Bulukumba (Batal)','2026-06-20','batal','Kiriman dibatalkan pengirim sebelum berangkat','4a00c436-d431-42dc-a7b3-c1392ca9d6aa')
ON CONFLICT (id) DO NOTHING;
-- Link 35 pengiriman baru ke 31 manifest baru (draft/berangkat/selesai),
-- status milestone kiriman konsisten dgn status trip-nya
INSERT INTO manifest_item (id, manifest_id, pengiriman_id, urutan) VALUES
-- draft (diproses/dijemput)
('40000000-0000-0000-0005-000000000001','40000000-0000-0000-0004-000000000001','40000000-0000-0000-0003-000000000014',0),
('40000000-0000-0000-0005-000000000002','40000000-0000-0000-0004-000000000002','40000000-0000-0000-0003-000000000015',0),
('40000000-0000-0000-0005-000000000003','40000000-0000-0000-0004-000000000003','40000000-0000-0000-0003-000000000016',0),
('40000000-0000-0000-0005-000000000004','40000000-0000-0000-0004-000000000004','40000000-0000-0000-0003-000000000017',0),
('40000000-0000-0000-0005-000000000005','40000000-0000-0000-0004-000000000005','40000000-0000-0000-0003-000000000018',0),
('40000000-0000-0000-0005-000000000006','40000000-0000-0000-0004-000000000006','40000000-0000-0000-0003-000000000011',0),
('40000000-0000-0000-0005-000000000007','40000000-0000-0000-0004-000000000007','40000000-0000-0000-0003-000000000012',0),
('40000000-0000-0000-0005-000000000008','40000000-0000-0000-0004-000000000008','40000000-0000-0000-0003-000000000013',0),
-- berangkat (dikirim / gagal_kirim retry)
('40000000-0000-0000-0005-000000000009','40000000-0000-0000-0004-000000000009','40000000-0000-0000-0003-000000000008',0),
('40000000-0000-0000-0005-000000000010','40000000-0000-0000-0004-000000000010','40000000-0000-0000-0003-000000000009',0),
('40000000-0000-0000-0005-000000000011','40000000-0000-0000-0004-000000000011','40000000-0000-0000-0003-000000000010',0),
('40000000-0000-0000-0005-000000000012','40000000-0000-0000-0004-000000000012','40000000-0000-0000-0003-000000000019',0),
('40000000-0000-0000-0005-000000000013','40000000-0000-0000-0004-000000000013','40000000-0000-0000-0003-000000000020',0),
-- selesai (1 item)
('40000000-0000-0000-0005-000000000014','40000000-0000-0000-0004-000000000014','40000000-0000-0000-0003-000000000001',0),
('40000000-0000-0000-0005-000000000015','40000000-0000-0000-0004-000000000015','40000000-0000-0000-0003-000000000002',0),
('40000000-0000-0000-0005-000000000016','40000000-0000-0000-0004-000000000016','40000000-0000-0000-0003-000000000003',0),
('40000000-0000-0000-0005-000000000017','40000000-0000-0000-0004-000000000017','40000000-0000-0000-0003-000000000004',0),
('40000000-0000-0000-0005-000000000018','40000000-0000-0000-0004-000000000018','40000000-0000-0000-0003-000000000005',0),
('40000000-0000-0000-0005-000000000019','40000000-0000-0000-0004-000000000019','40000000-0000-0000-0003-000000000006',0),
('40000000-0000-0000-0005-000000000020','40000000-0000-0000-0004-000000000020','40000000-0000-0000-0003-000000000007',0),
('40000000-0000-0000-0005-000000000021','40000000-0000-0000-0004-000000000021','40000000-0000-0000-0003-000000000023',0),
('40000000-0000-0000-0005-000000000022','40000000-0000-0000-0004-000000000022','40000000-0000-0000-0003-000000000024',0),
('40000000-0000-0000-0005-000000000023','40000000-0000-0000-0004-000000000023','40000000-0000-0000-0003-000000000025',0),
('40000000-0000-0000-0005-000000000024','40000000-0000-0000-0004-000000000024','40000000-0000-0000-0003-000000000026',0),
('40000000-0000-0000-0005-000000000025','40000000-0000-0000-0004-000000000025','40000000-0000-0000-0003-000000000027',0),
('40000000-0000-0000-0005-000000000026','40000000-0000-0000-0004-000000000026','40000000-0000-0000-0003-000000000028',0),
('40000000-0000-0000-0005-000000000027','40000000-0000-0000-0004-000000000027','40000000-0000-0000-0003-000000000029',0),
-- selesai (2 item, termasuk retur yg berasal dari trip ini)
('40000000-0000-0000-0005-000000000028','40000000-0000-0000-0004-000000000028','40000000-0000-0000-0003-000000000030',0),
('40000000-0000-0000-0005-000000000029','40000000-0000-0000-0004-000000000028','40000000-0000-0000-0003-000000000031',1),
('40000000-0000-0000-0005-000000000030','40000000-0000-0000-0004-000000000029','40000000-0000-0000-0003-000000000032',0),
('40000000-0000-0000-0005-000000000031','40000000-0000-0000-0004-000000000029','40000000-0000-0000-0003-000000000033',1),
('40000000-0000-0000-0005-000000000032','40000000-0000-0000-0004-000000000030','40000000-0000-0000-0003-000000000034',0),
('40000000-0000-0000-0005-000000000033','40000000-0000-0000-0004-000000000030','40000000-0000-0000-0003-000000000021',1),
('40000000-0000-0000-0005-000000000034','40000000-0000-0000-0004-000000000031','40000000-0000-0000-0003-000000000035',0),
('40000000-0000-0000-0005-000000000035','40000000-0000-0000-0004-000000000031','40000000-0000-0000-0003-000000000022',1)
ON CONFLICT (id) DO NOTHING;
-- 35 setoran COD tambahan — cycle 2 sopir/kurir existing, tanggal tersebar
INSERT INTO cod_setoran (id, sopir_id, jumlah, tanggal_setor, catatan) VALUES
('40000000-0000-0000-0006-000000000001','1093e2c3-040c-4438-9697-dc17f72ebdcb',150000,'2026-05-03',NULL),
('40000000-0000-0000-0006-000000000002','7df2b6bf-9420-46f8-9d48-246878cf4243',95000,'2026-05-04',NULL),
('40000000-0000-0000-0006-000000000003','1093e2c3-040c-4438-9697-dc17f72ebdcb',220000,'2026-05-06','Setoran gabungan 2 hari'),
('40000000-0000-0000-0006-000000000004','7df2b6bf-9420-46f8-9d48-246878cf4243',180000,'2026-05-09',NULL),
('40000000-0000-0000-0006-000000000005','1093e2c3-040c-4438-9697-dc17f72ebdcb',75000,'2026-05-11',NULL),
('40000000-0000-0000-0006-000000000006','7df2b6bf-9420-46f8-9d48-246878cf4243',300000,'2026-05-13','Setoran akhir minggu'),
('40000000-0000-0000-0006-000000000007','1093e2c3-040c-4438-9697-dc17f72ebdcb',120000,'2026-05-16',NULL),
('40000000-0000-0000-0006-000000000008','7df2b6bf-9420-46f8-9d48-246878cf4243',90000,'2026-05-19',NULL),
('40000000-0000-0000-0006-000000000009','1093e2c3-040c-4438-9697-dc17f72ebdcb',250000,'2026-05-21',NULL),
('40000000-0000-0000-0006-000000000010','7df2b6bf-9420-46f8-9d48-246878cf4243',60000,'2026-05-23',NULL),
('40000000-0000-0000-0006-000000000011','1093e2c3-040c-4438-9697-dc17f72ebdcb',175000,'2026-05-26',NULL),
('40000000-0000-0000-0006-000000000012','7df2b6bf-9420-46f8-9d48-246878cf4243',140000,'2026-05-28','Ada 1 paket dibatalkan, uang dikembalikan ke pengirim'),
('40000000-0000-0000-0006-000000000013','1093e2c3-040c-4438-9697-dc17f72ebdcb',85000,'2026-05-30',NULL),
('40000000-0000-0000-0006-000000000014','7df2b6bf-9420-46f8-9d48-246878cf4243',310000,'2026-06-02',NULL),
('40000000-0000-0000-0006-000000000015','1093e2c3-040c-4438-9697-dc17f72ebdcb',100000,'2026-06-04',NULL),
('40000000-0000-0000-0006-000000000016','7df2b6bf-9420-46f8-9d48-246878cf4243',65000,'2026-06-06',NULL),
('40000000-0000-0000-0006-000000000017','1093e2c3-040c-4438-9697-dc17f72ebdcb',190000,'2026-06-09',NULL),
('40000000-0000-0000-0006-000000000018','7df2b6bf-9420-46f8-9d48-246878cf4243',225000,'2026-06-11','Setoran gabungan 3 hari'),
('40000000-0000-0000-0006-000000000019','1093e2c3-040c-4438-9697-dc17f72ebdcb',130000,'2026-06-13',NULL),
('40000000-0000-0000-0006-000000000020','7df2b6bf-9420-46f8-9d48-246878cf4243',80000,'2026-06-15',NULL),
('40000000-0000-0000-0006-000000000021','1093e2c3-040c-4438-9697-dc17f72ebdcb',270000,'2026-06-17',NULL),
('40000000-0000-0000-0006-000000000022','7df2b6bf-9420-46f8-9d48-246878cf4243',110000,'2026-06-19',NULL),
('40000000-0000-0000-0006-000000000023','1093e2c3-040c-4438-9697-dc17f72ebdcb',195000,'2026-06-21',NULL),
('40000000-0000-0000-0006-000000000024','7df2b6bf-9420-46f8-9d48-246878cf4243',145000,'2026-06-23',NULL),
('40000000-0000-0000-0006-000000000025','1093e2c3-040c-4438-9697-dc17f72ebdcb',88000,'2026-06-25',NULL),
('40000000-0000-0000-0006-000000000026','7df2b6bf-9420-46f8-9d48-246878cf4243',260000,'2026-06-27','Setoran akhir minggu'),
('40000000-0000-0000-0006-000000000027','1093e2c3-040c-4438-9697-dc17f72ebdcb',155000,'2026-06-29',NULL),
('40000000-0000-0000-0006-000000000028','7df2b6bf-9420-46f8-9d48-246878cf4243',72000,'2026-07-01',NULL),
('40000000-0000-0000-0006-000000000029','1093e2c3-040c-4438-9697-dc17f72ebdcb',210000,'2026-07-03',NULL),
('40000000-0000-0000-0006-000000000030','7df2b6bf-9420-46f8-9d48-246878cf4243',135000,'2026-07-05',NULL),
('40000000-0000-0000-0006-000000000031','1093e2c3-040c-4438-9697-dc17f72ebdcb',95000,'2026-07-07',NULL),
('40000000-0000-0000-0006-000000000032','7df2b6bf-9420-46f8-9d48-246878cf4243',280000,'2026-07-09','Setoran gabungan 2 hari'),
('40000000-0000-0000-0006-000000000033','1093e2c3-040c-4438-9697-dc17f72ebdcb',160000,'2026-07-11',NULL),
('40000000-0000-0000-0006-000000000034','7df2b6bf-9420-46f8-9d48-246878cf4243',105000,'2026-07-13',NULL),
('40000000-0000-0000-0006-000000000035','1093e2c3-040c-4438-9697-dc17f72ebdcb',230000,'2026-07-15',NULL)
ON CONFLICT (id) DO NOTHING;
-- 35 klaim tambahan — pending(10)/disetujui(8)/ditolak(5)/selesai(12)
INSERT INTO klaim (
  id, pengiriman_id, pengiriman_nomor_resi, pengiriman_penerima_nama,
  tipe, status, nilai_klaim, nilai_disetujui, kronologi, catatan_approval,
  created_by, approved_by, approved_at, selesai_at, created_at, updated_at
) VALUES
-- pending (10) — belum diproses
('40000000-0000-0000-0007-000000000001','40000000-0000-0000-0003-000000000011','BNG-SEED0031','Muh. Yusuf','rusak','pending',600000,NULL,'Bahan bangunan pecah saat bongkar muat, penerima komplain via telepon',NULL,'1093e2c3-040c-4438-9697-dc17f72ebdcb',NULL,NULL,NULL,'2026-06-25 10:00:00+00','2026-06-25 10:00:00+00'),
('40000000-0000-0000-0007-000000000002','16e5927d-e074-4a03-9a87-ff6dd298da2b','BNG-SEED0002','Sari Dewi','hilang','pending',300000,NULL,'Paket tidak sampai ke penerima, dicek di gudang transit belum ketemu',NULL,'7df2b6bf-9420-46f8-9d48-246878cf4243',NULL,NULL,NULL,'2026-06-28 09:00:00+00','2026-06-28 09:00:00+00'),
('40000000-0000-0000-0007-000000000003','40000000-0000-0000-0003-000000000028','BNG-SEED0048','Fitri Handayani','rusak','pending',150000,NULL,'Botol obat pecah, isi tumpah',NULL,'1093e2c3-040c-4438-9697-dc17f72ebdcb',NULL,NULL,NULL,'2026-06-29 11:00:00+00','2026-06-29 11:00:00+00'),
('40000000-0000-0000-0007-000000000004','63e628d7-21db-4e28-84a4-219f2087e57f','BNG-BTVRHXLW','Nurdin','rusak','pending',80000,NULL,'Kemasan penyok, isi masih utuh tapi penerima minta klaim',NULL,'7df2b6bf-9420-46f8-9d48-246878cf4243',NULL,NULL,NULL,'2026-07-01 08:00:00+00','2026-07-01 08:00:00+00'),
('40000000-0000-0000-0007-000000000005','5caaf000-16e6-45ea-a1ad-d21e77312635','BNG-SEED0001','Budi Santoso','hilang','pending',1000000,NULL,'Kiriman tercatat selesai tapi penerima mengaku belum terima',NULL,'1093e2c3-040c-4438-9697-dc17f72ebdcb',NULL,NULL,NULL,'2026-07-03 10:00:00+00','2026-07-03 10:00:00+00'),
('40000000-0000-0000-0007-000000000006','40000000-0000-0000-0003-000000000008','BNG-SEED0028','Agus Salim','rusak','pending',200000,NULL,'Peralatan rumah tangga tergores saat pengangkutan',NULL,'7df2b6bf-9420-46f8-9d48-246878cf4243',NULL,NULL,NULL,'2026-07-06 09:00:00+00','2026-07-06 09:00:00+00'),
('40000000-0000-0000-0007-000000000007','40000000-0000-0000-0003-000000000033','BNG-SEED0053','Rudi Hartono','hilang','pending',400000,NULL,'Sebagian sparepart hilang dari kemasan, tidak lengkap',NULL,'1093e2c3-040c-4438-9697-dc17f72ebdcb',NULL,NULL,NULL,'2026-07-10 08:00:00+00','2026-07-10 08:00:00+00'),
('40000000-0000-0000-0007-000000000008','40000000-0000-0000-0003-000000000034','BNG-SEED0054','Lestari Wulandari','rusak','pending',135000,NULL,'Barang elektronik tidak menyala setelah diterima, diduga rusak saat pengiriman',NULL,'7df2b6bf-9420-46f8-9d48-246878cf4243',NULL,NULL,NULL,'2026-07-11 09:00:00+00','2026-07-11 09:00:00+00'),
('40000000-0000-0000-0007-000000000009','10684d26-37c9-45a4-b255-56e3809884b9','BNG-SEED0007','Gudang Sentral','hilang','pending',2000000,NULL,'Selisih jumlah barang antara manifest dan yang diterima gudang',NULL,'1093e2c3-040c-4438-9697-dc17f72ebdcb',NULL,NULL,NULL,'2026-07-14 10:00:00+00','2026-07-14 10:00:00+00'),
('40000000-0000-0000-0007-000000000010',NULL,'BNG-OLD00021','Hendra Susanto','rusak','pending',250000,NULL,'Klaim lama, pengiriman induk sudah dihapus dari sistem',NULL,'7df2b6bf-9420-46f8-9d48-246878cf4243',NULL,NULL,NULL,'2026-07-16 08:00:00+00','2026-07-16 08:00:00+00'),
-- disetujui (8) — sudah di-approve, belum ditutup
('40000000-0000-0000-0007-000000000011','66615be4-77e2-4640-8b47-ca1b291ae9a1','BNG-SEED0008','Kantor Cabang Jakpus','rusak','disetujui',500000,450000,'Dus penyok berat, sebagian isi rusak','Disetujui sebagian, sesuai kondisi barang di foto bukti','1093e2c3-040c-4438-9697-dc17f72ebdcb','f1251d4e-a418-4f23-9bbf-86e2661f05f9','2026-06-05 10:00:00+00',NULL,'2026-06-01 09:00:00+00','2026-06-05 10:00:00+00'),
('40000000-0000-0000-0007-000000000012','40000000-0000-0000-0003-000000000022','BNG-SEED0042','Wahyu Ramadhan','hilang','disetujui',90000,90000,'Barang tidak sampai, sudah dikonfirmasi hilang di gudang transit','Disetujui penuh, bukti CCTV gudang mendukung','7df2b6bf-9420-46f8-9d48-246878cf4243','f1251d4e-a418-4f23-9bbf-86e2661f05f9','2026-06-10 09:00:00+00',NULL,'2026-06-06 08:00:00+00','2026-06-10 09:00:00+00'),
('40000000-0000-0000-0007-000000000013','40000000-0000-0000-0003-000000000013','BNG-SEED0033','UD Berkah Jaya Motor','rusak','disetujui',1440000,1200000,'Beberapa sparepart penyok akibat guncangan','Disetujui sebagian, sisa dianggap masih layak jual','1093e2c3-040c-4438-9697-dc17f72ebdcb','f1251d4e-a418-4f23-9bbf-86e2661f05f9','2026-06-15 10:00:00+00',NULL,'2026-06-12 08:00:00+00','2026-06-15 10:00:00+00'),
('40000000-0000-0000-0007-000000000014','fecabb13-b2fa-4484-8c10-977853f7e492','BNG-SEED0015','Pak Herman','hilang','disetujui',350000,350000,'Paket hilang total, tidak ditemukan setelah pelacakan','Disetujui penuh','7df2b6bf-9420-46f8-9d48-246878cf4243','f1251d4e-a418-4f23-9bbf-86e2661f05f9','2026-06-18 09:00:00+00',NULL,'2026-06-14 08:00:00+00','2026-06-18 09:00:00+00'),
('40000000-0000-0000-0007-000000000015','40000000-0000-0000-0003-000000000029','BNG-SEED0049','Agus Salim','rusak','disetujui',60000,60000,'Obat tumpah karena kemasan bocor','Disetujui penuh, nilai kecil','1093e2c3-040c-4438-9697-dc17f72ebdcb','f1251d4e-a418-4f23-9bbf-86e2661f05f9','2026-06-22 10:00:00+00',NULL,'2026-06-20 09:00:00+00','2026-06-22 10:00:00+00'),
('40000000-0000-0000-0007-000000000016','edc7a823-a963-46eb-835c-3b2a87a3e0c5','BNG-SEED0018','Pak Anton','rusak','disetujui',180000,150000,'Sepatu kotor terkena oli saat pengangkutan','Disetujui sebagian, potong biaya cuci','7df2b6bf-9420-46f8-9d48-246878cf4243','f1251d4e-a418-4f23-9bbf-86e2661f05f9','2026-06-26 09:00:00+00',NULL,'2026-06-23 08:00:00+00','2026-06-26 09:00:00+00'),
('40000000-0000-0000-0007-000000000017','ae0d08a8-e895-4566-9f18-d5eabb9cba7d','BNG-SEED0011','Toko Baju Rapi','rusak','disetujui',220000,220000,'Pakaian basah kena hujan, kemasan tidak waterproof','Disetujui penuh, evaluasi SOP packing hujan','1093e2c3-040c-4438-9697-dc17f72ebdcb','f1251d4e-a418-4f23-9bbf-86e2661f05f9','2026-06-29 10:00:00+00',NULL,'2026-06-26 09:00:00+00','2026-06-29 10:00:00+00'),
('40000000-0000-0000-0007-000000000018','40000000-0000-0000-0003-000000000016','BNG-SEED0036','CV Anugerah Sejahtera','hilang','disetujui',140000,100000,'Sebagian tas hilang dari total kiriman','Disetujui sebagian sesuai jumlah yang hilang','7df2b6bf-9420-46f8-9d48-246878cf4243','f1251d4e-a418-4f23-9bbf-86e2661f05f9','2026-07-02 09:00:00+00',NULL,'2026-06-29 08:00:00+00','2026-07-02 09:00:00+00'),
-- ditolak (5) — tidak disetujui
('40000000-0000-0000-0007-000000000019','40000000-0000-0000-0003-000000000009','BNG-SEED0029','Nur Aisyah','rusak','ditolak',80000,NULL,'Klaim dokumen sobek sedikit di sudut','Ditolak, kerusakan minor tidak mempengaruhi isi dokumen','1093e2c3-040c-4438-9697-dc17f72ebdcb','f1251d4e-a418-4f23-9bbf-86e2661f05f9','2026-06-08 10:00:00+00',NULL,'2026-06-05 09:00:00+00','2026-06-08 10:00:00+00'),
('40000000-0000-0000-0007-000000000020','40000000-0000-0000-0003-000000000012','BNG-SEED0032','Zainal Abidin','hilang','ditolak',80000,NULL,'Penerima klaim kosmetik hilang','Ditolak, POD sudah ditandatangani penerima sendiri dgn jumlah lengkap','7df2b6bf-9420-46f8-9d48-246878cf4243','f1251d4e-a418-4f23-9bbf-86e2661f05f9','2026-06-12 09:00:00+00',NULL,'2026-06-09 08:00:00+00','2026-06-12 09:00:00+00'),
('40000000-0000-0000-0007-000000000021','40000000-0000-0000-0003-000000000004','BNG-SEED0024','Grosir Elektronik Makmur','rusak','ditolak',700000,NULL,'Klaim barang rusak tanpa foto bukti pendukung','Ditolak, tidak ada bukti foto saat serah terima','1093e2c3-040c-4438-9697-dc17f72ebdcb','f1251d4e-a418-4f23-9bbf-86e2661f05f9','2026-06-16 10:00:00+00',NULL,'2026-06-13 09:00:00+00','2026-06-16 10:00:00+00'),
('40000000-0000-0000-0007-000000000022','40000000-0000-0000-0003-000000000005','BNG-SEED0025','Rina Amalia','rusak','ditolak',120000,NULL,'Klaim diajukan 2 minggu setelah barang diterima','Ditolak, melewati batas waktu klaim wajar','7df2b6bf-9420-46f8-9d48-246878cf4243','f1251d4e-a418-4f23-9bbf-86e2661f05f9','2026-06-20 09:00:00+00',NULL,'2026-06-17 08:00:00+00','2026-06-20 09:00:00+00'),
('40000000-0000-0000-0007-000000000023','76c9df18-b3fb-4c94-a70a-481b3783d5c5','BNG-SEED0010','Kedai Kopi Malam','hilang','ditolak',150000,NULL,'Klaim barang hilang, ternyata sudah diambil pihak lain di alamat','Ditolak, barang sudah diterima orang di lokasi (bukti CCTV toko)','1093e2c3-040c-4438-9697-dc17f72ebdcb','f1251d4e-a418-4f23-9bbf-86e2661f05f9','2026-06-24 10:00:00+00',NULL,'2026-06-21 09:00:00+00','2026-06-24 10:00:00+00'),
-- selesai (12) — sudah dibayar/ditutup
('40000000-0000-0000-0007-000000000024','40000000-0000-0000-0003-000000000026','BNG-SEED0046','PT Cahaya Abadi','rusak','selesai',350000,300000,'Perlengkapan bayi basah karena bocor saat hujan','Disetujui sebagian, ganti rugi sudah ditransfer','1093e2c3-040c-4438-9697-dc17f72ebdcb','f1251d4e-a418-4f23-9bbf-86e2661f05f9','2026-05-20 10:00:00+00','2026-05-25 09:00:00+00','2026-05-15 09:00:00+00','2026-05-25 09:00:00+00'),
('40000000-0000-0000-0007-000000000025','40000000-0000-0000-0003-000000000018','BNG-SEED0038','Toko Fashion Trendy','hilang','selesai',150000,150000,'Kain hilang saat transit di gudang Palembang','Disetujui penuh, sudah ganti rugi tunai','7df2b6bf-9420-46f8-9d48-246878cf4243','f1251d4e-a418-4f23-9bbf-86e2661f05f9','2026-05-22 09:00:00+00','2026-05-27 10:00:00+00','2026-05-18 08:00:00+00','2026-05-27 10:00:00+00'),
('40000000-0000-0000-0007-000000000026','2cea2386-3872-4177-bd6b-943d2e438686','BNG-SEED0004','PT Maju Bersama','rusak','selesai',120000,100000,'Kemasan sobek, sebagian barang basah','Disetujui sebagian, sudah dibayar via transfer','1093e2c3-040c-4438-9697-dc17f72ebdcb','f1251d4e-a418-4f23-9bbf-86e2661f05f9','2026-05-25 10:00:00+00','2026-05-30 09:00:00+00','2026-05-20 09:00:00+00','2026-05-30 09:00:00+00'),
('40000000-0000-0000-0007-000000000027','40000000-0000-0000-0003-000000000006','BNG-SEED0026','Toko Fashion Trendy','hilang','selesai',600000,600000,'Kain hilang total dari pengiriman','Disetujui penuh, ganti rugi lunas','7df2b6bf-9420-46f8-9d48-246878cf4243','f1251d4e-a418-4f23-9bbf-86e2661f05f9','2026-05-28 09:00:00+00','2026-06-02 10:00:00+00','2026-05-23 08:00:00+00','2026-06-02 10:00:00+00'),
('40000000-0000-0000-0007-000000000028','40000000-0000-0000-0003-000000000014','BNG-SEED0034','Lestari Wulandari','rusak','selesai',150000,120000,'Mainan anak pecah bagian roda','Disetujui sebagian, sudah selesai','1093e2c3-040c-4438-9697-dc17f72ebdcb','f1251d4e-a418-4f23-9bbf-86e2661f05f9','2026-05-30 10:00:00+00','2026-06-04 09:00:00+00','2026-05-26 09:00:00+00','2026-06-04 09:00:00+00'),
('40000000-0000-0000-0007-000000000029','40000000-0000-0000-0003-000000000024','BNG-SEED0044','CV Karya Mandiri','hilang','selesai',450000,450000,'Alat elektronik hilang dari kemasan','Disetujui penuh, sudah ditransfer','7df2b6bf-9420-46f8-9d48-246878cf4243','f1251d4e-a418-4f23-9bbf-86e2661f05f9','2026-06-02 09:00:00+00','2026-06-07 10:00:00+00','2026-05-28 08:00:00+00','2026-06-07 10:00:00+00'),
('40000000-0000-0000-0007-000000000030','40000000-0000-0000-0003-000000000001','BNG-SEED0021','Nurdin Saleh','rusak','selesai',150000,100000,'Dokumen basah sedikit di ujung','Disetujui sebagian, kasus ditutup','1093e2c3-040c-4438-9697-dc17f72ebdcb','f1251d4e-a418-4f23-9bbf-86e2661f05f9','2026-06-06 10:00:00+00','2026-06-11 09:00:00+00','2026-06-01 09:00:00+00','2026-06-11 09:00:00+00'),
('40000000-0000-0000-0007-000000000031','40000000-0000-0000-0003-000000000003','BNG-SEED0023','Kantor Cabang Makassar','hilang','selesai',200000,200000,'Sebagian dokumen tidak ditemukan saat serah terima','Disetujui penuh, sudah selesai','7df2b6bf-9420-46f8-9d48-246878cf4243','f1251d4e-a418-4f23-9bbf-86e2661f05f9','2026-06-09 09:00:00+00','2026-06-14 10:00:00+00','2026-06-04 08:00:00+00','2026-06-14 10:00:00+00'),
('40000000-0000-0000-0007-000000000032','40000000-0000-0000-0003-000000000032','BNG-SEED0052','Yuni Kartika','rusak','selesai',180000,150000,'Bahan bangunan sebagian pecah','Disetujui sebagian, kasus ditutup','1093e2c3-040c-4438-9697-dc17f72ebdcb','f1251d4e-a418-4f23-9bbf-86e2661f05f9','2026-06-30 10:00:00+00','2026-07-05 09:00:00+00','2026-06-26 09:00:00+00','2026-07-05 09:00:00+00'),
('40000000-0000-0000-0007-000000000033','40000000-0000-0000-0003-000000000007','BNG-SEED0027','Wahyu Ramadhan','rusak','selesai',95000,95000,'Elektronik tergores, masih berfungsi tapi minta ganti rugi kosmetik','Disetujui penuh, nilai kecil','7df2b6bf-9420-46f8-9d48-246878cf4243','f1251d4e-a418-4f23-9bbf-86e2661f05f9','2026-05-24 09:00:00+00','2026-05-29 10:00:00+00','2026-05-19 08:00:00+00','2026-05-29 10:00:00+00'),
('40000000-0000-0000-0007-000000000034','40000000-0000-0000-0003-000000000035','BNG-SEED0055','PT Distribusi Timur Raya','hilang','selesai',450000,400000,'Sebagian kerajinan tangan hilang dari total kiriman','Disetujui sebagian, sudah dibayar','1093e2c3-040c-4438-9697-dc17f72ebdcb','f1251d4e-a418-4f23-9bbf-86e2661f05f9','2026-07-07 10:00:00+00','2026-07-12 09:00:00+00','2026-07-03 09:00:00+00','2026-07-12 09:00:00+00'),
('40000000-0000-0000-0007-000000000035',NULL,'BNG-OLD00099','Toko Lama Sejahtera','rusak','selesai',300000,250000,'Klaim lama, pengiriman induk sudah dihapus dari sistem','Disetujui sebagian, kasus lama sudah ditutup','7df2b6bf-9420-46f8-9d48-246878cf4243','f1251d4e-a418-4f23-9bbf-86e2661f05f9','2026-05-15 09:00:00+00','2026-05-20 10:00:00+00','2026-05-10 08:00:00+00','2026-05-20 10:00:00+00')
ON CONFLICT (id) DO NOTHING;
