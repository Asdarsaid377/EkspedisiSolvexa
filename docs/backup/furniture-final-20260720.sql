--
-- PostgreSQL database dump
--

\restrict OKc3mN8naMLK2G8r6QISpE3vip8qVSL1Tj647MPFt4OtBs2N40gXAV9g9fYGSb7

-- Dumped from database version 17.6
-- Dumped by pg_dump version 17.6

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: audit_log; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.audit_log (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tipe text NOT NULL,
    catatan text,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT audit_log_tipe_check CHECK ((tipe = ANY (ARRAY['audit_nota'::text, 'stock_opname'::text])))
);


ALTER TABLE public.audit_log OWNER TO postgres;

--
-- Name: mutasi_stok; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.mutasi_stok (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    produk_id uuid NOT NULL,
    tipe text NOT NULL,
    jumlah integer NOT NULL,
    stok_sebelum integer NOT NULL,
    stok_sesudah integer NOT NULL,
    keterangan text,
    referensi_id uuid,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT mutasi_stok_tipe_check CHECK ((tipe = ANY (ARRAY['masuk'::text, 'keluar'::text, 'koreksi'::text])))
);


ALTER TABLE public.mutasi_stok OWNER TO postgres;

--
-- Name: owner_reminders; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.owner_reminders (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tipe text NOT NULL,
    judul text NOT NULL,
    status text DEFAULT 'pending'::text,
    due_date date,
    periode text,
    selesai_at timestamp with time zone,
    catatan text,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT owner_reminders_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'selesai'::text, 'terlewat'::text]))),
    CONSTRAINT owner_reminders_tipe_check CHECK ((tipe = ANY (ARRAY['audit_nota'::text, 'stock_opname'::text, 'checklist_manual'::text, 'catatan_kebijakan'::text])))
);


ALTER TABLE public.owner_reminders OWNER TO postgres;

--
-- Name: penjualan; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.penjualan (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    nomor_faktur text NOT NULL,
    reseller_id uuid,
    tanggal timestamp with time zone DEFAULT now(),
    total_harga_katalog numeric(15,2) DEFAULT 0,
    total_harga_jual numeric(15,2) DEFAULT 0,
    total_ongkir numeric(15,2) DEFAULT 0,
    total_bonus numeric(15,2) DEFAULT 0,
    total_laba numeric(15,2) DEFAULT 0,
    uang_dp numeric(15,2) DEFAULT 0,
    status_bayar text DEFAULT 'lunas'::text,
    metode_bayar text DEFAULT 'transfer'::text,
    tujuan text,
    catatan text,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    bonus_terbayar numeric(15,2) DEFAULT 0,
    sopir text,
    bonus_owner numeric(15,2) DEFAULT 0,
    catatan_bonus_owner text,
    telepon_sopir text,
    nama_customer text,
    telepon_customer text,
    nomor_resi text,
    po_id uuid,
    milestone text DEFAULT 'diproses'::text,
    status_pencocokan text DEFAULT 'belum_dicocokkan'::text,
    dicocokkan_oleh uuid,
    dicocokkan_at timestamp with time zone,
    catatan_pencocokan text,
    catatan_internal text,
    bonus_disetujui_reseller boolean DEFAULT false,
    bonus_disetujui_at timestamp with time zone,
    CONSTRAINT penjualan_metode_bayar_check CHECK ((metode_bayar = ANY (ARRAY['transfer'::text, 'cod'::text, 'cash'::text]))),
    CONSTRAINT penjualan_milestone_check CHECK ((milestone = ANY (ARRAY['diproses'::text, 'diproduksi'::text, 'dikirim'::text, 'selesai'::text]))),
    CONSTRAINT penjualan_status_bayar_check CHECK ((status_bayar = ANY (ARRAY['lunas'::text, 'dp'::text, 'belum_bayar'::text]))),
    CONSTRAINT penjualan_status_pencocokan_check CHECK ((status_pencocokan = ANY (ARRAY['belum_dicocokkan'::text, 'cocok'::text, 'selisih'::text])))
);


ALTER TABLE public.penjualan OWNER TO postgres;

--
-- Name: penjualan_item; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.penjualan_item (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    penjualan_id uuid NOT NULL,
    produk_id uuid NOT NULL,
    jumlah integer DEFAULT 1 NOT NULL,
    harga_modal numeric(15,2) NOT NULL,
    harga_katalog numeric(15,2) NOT NULL,
    harga_jual numeric(15,2) NOT NULL,
    ongkir numeric(15,2) DEFAULT 0,
    bonus numeric(15,2) DEFAULT 0,
    created_at timestamp with time zone DEFAULT now(),
    laba numeric(15,2) DEFAULT 0
);


ALTER TABLE public.penjualan_item OWNER TO postgres;

--
-- Name: penjualan_pembayaran; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.penjualan_pembayaran (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    penjualan_id uuid NOT NULL,
    jumlah numeric(15,2) NOT NULL,
    metode text NOT NULL,
    catatan text,
    created_at timestamp with time zone DEFAULT now(),
    foto_url text,
    CONSTRAINT penjualan_pembayaran_metode_check CHECK ((metode = ANY (ARRAY['transfer'::text, 'cod'::text, 'cash'::text])))
);


ALTER TABLE public.penjualan_pembayaran OWNER TO postgres;

--
-- Name: produk; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.produk (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    nama text NOT NULL,
    kategori text,
    satuan text DEFAULT 'unit'::text,
    harga_modal numeric(15,2) DEFAULT 0 NOT NULL,
    harga_katalog numeric(15,2) DEFAULT 0 NOT NULL,
    stok integer DEFAULT 0 NOT NULL,
    stok_minimum integer DEFAULT 0,
    deskripsi text,
    aktif boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    foto_url text
);


ALTER TABLE public.produk OWNER TO postgres;

--
-- Name: produk_foto; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.produk_foto (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    produk_id uuid,
    url text NOT NULL,
    urutan integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.produk_foto OWNER TO postgres;

--
-- Name: purchase_order_items; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.purchase_order_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    po_id uuid,
    produk_id uuid,
    nama_produk text NOT NULL,
    jumlah integer DEFAULT 1 NOT NULL,
    satuan text DEFAULT 'unit'::text,
    keterangan text,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.purchase_order_items OWNER TO postgres;

--
-- Name: purchase_orders; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.purchase_orders (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    nomor_po text NOT NULL,
    tipe_pemohon text NOT NULL,
    reseller_id uuid,
    nama_customer text,
    telepon_customer text,
    tanggal_po date DEFAULT CURRENT_DATE NOT NULL,
    tanggal_estimasi date,
    status text DEFAULT 'pending'::text NOT NULL,
    catatan text,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    prioritas text DEFAULT 'normal'::text,
    foto_url text,
    kategori_po text,
    nama_tukang text,
    CONSTRAINT purchase_orders_kategori_po_check CHECK ((kategori_po = ANY (ARRAY['pabrik'::text, 'premium'::text, 'semi_premium'::text, 'jati'::text]))),
    CONSTRAINT purchase_orders_prioritas_check CHECK ((prioritas = ANY (ARRAY['rendah'::text, 'normal'::text, 'tinggi'::text, 'urgent'::text]))),
    CONSTRAINT purchase_orders_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'proses'::text, 'selesai'::text, 'batal'::text]))),
    CONSTRAINT purchase_orders_tipe_pemohon_check CHECK ((tipe_pemohon = ANY (ARRAY['reseller'::text, 'customer'::text])))
);


ALTER TABLE public.purchase_orders OWNER TO postgres;

--
-- Name: reseller_reviews; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.reseller_reviews (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    penjualan_id uuid,
    reseller_id uuid,
    tipe text,
    isi text NOT NULL,
    resolved boolean DEFAULT false,
    status text,
    resolved_at timestamp with time zone,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT reseller_reviews_tipe_check CHECK ((tipe = ANY (ARRAY['komplain'::text, 'pujian'::text, 'catatan'::text])))
);


ALTER TABLE public.reseller_reviews OWNER TO postgres;

--
-- Name: resellers; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.resellers (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    nama text NOT NULL,
    telepon text,
    alamat text,
    kota text,
    catatan text,
    aktif boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    token text,
    koreksi_admin numeric(15,2) DEFAULT 0,
    koreksi_asisten numeric(15,2) DEFAULT 0,
    sedekah_mimbar numeric(15,2) DEFAULT 0,
    nama_bank text,
    no_rekening text
);


ALTER TABLE public.resellers OWNER TO postgres;

--
-- Name: tracking_progress; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.tracking_progress (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    penjualan_id uuid NOT NULL,
    milestone text NOT NULL,
    persentase integer,
    catatan text,
    foto_url text,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT tracking_progress_milestone_check CHECK ((milestone = ANY (ARRAY['diproses'::text, 'diproduksi'::text, 'dikirim'::text, 'selesai'::text]))),
    CONSTRAINT tracking_progress_persentase_check CHECK (((persentase >= 0) AND (persentase <= 100)))
);


ALTER TABLE public.tracking_progress OWNER TO postgres;

--
-- Data for Name: audit_log; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.audit_log (id, tipe, catatan, created_by, created_at) FROM stdin;
\.


--
-- Data for Name: mutasi_stok; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.mutasi_stok (id, produk_id, tipe, jumlah, stok_sebelum, stok_sesudah, keterangan, referensi_id, created_by, created_at) FROM stdin;
7870d00d-2004-49fe-b252-0734d439b90e	9217ae4b-68c2-4b8f-8909-2812abdb999a	keluar	1	1	0	Penjualan INV-20260626-0007	76545966-9176-474d-af51-74b210c71685	\N	2026-06-26 15:25:32.418512+00
e1239407-db35-409c-b65b-78a6a40360c8	aeeab3d9-13b0-4c52-9dec-80a0129c6001	keluar	1	1	0	Penjualan INV-20260626-0008	4b39188c-c3bf-46aa-8919-205299244b88	\N	2026-06-26 15:39:36.432059+00
9d947a3e-70d5-43e8-b982-7df691e24ab2	aeeab3d9-13b0-4c52-9dec-80a0129c6001	masuk	1	0	1	Pembatalan penjualan	\N	\N	2026-06-26 15:45:31.380352+00
fa56b6c8-211d-4b90-ae22-612a8fb16faa	aeeab3d9-13b0-4c52-9dec-80a0129c6001	keluar	1	1	0	Penjualan INV-20260626-0009	313356f4-9281-4523-94a2-a83daa5447c9	\N	2026-06-26 15:46:43.220333+00
5d1f8127-6643-4d2b-b04e-c990317b831b	bf77b94b-cddc-47ce-8f0a-c3bc4512b239	keluar	1	1	0	Penjualan INV-20260626-0010	80f500ed-08e2-41c5-a3d0-47eced2361f4	\N	2026-06-26 15:52:43.414595+00
370201e8-6b21-469f-855e-1fa8d9df36e6	d59a37fe-ecbb-4572-bc88-f8b8250a6304	keluar	1	1	0	Penjualan INV-20260626-0011	8d337b7e-be5d-4005-af25-90e3eb9e2dcb	\N	2026-06-26 16:19:14.499152+00
ef261d75-d32a-43d6-9508-607175b3cc8b	b2547990-dd93-4bf4-abfe-36465a46d8c9	masuk	1	0	1	Stok awal	\N	\N	2026-06-26 16:48:58.405026+00
9e823982-b334-4314-93e4-6eec8aaeb9f0	0b996cea-99f1-484f-92c0-05f6fd40f278	keluar	1	1	0	Penjualan INV-20260627-0012	7001f090-5304-444d-9b56-51c05f381fdc	\N	2026-06-27 15:42:17.749159+00
6f33ff33-3140-41ca-96fb-bc16d1eed17e	34fefb75-a56c-499a-8b52-fc69a7887b3a	masuk	1	1	2	Tambahan	\N	\N	2026-06-28 07:13:30.339835+00
f6b2605f-e30e-46d5-97ea-1d7e598eb919	34fefb75-a56c-499a-8b52-fc69a7887b3a	koreksi	1	2	1	Penyesuaian	\N	\N	2026-06-28 07:13:49.564892+00
754fe611-2857-4ccc-a116-5133b3173bed	ecff8477-4c30-4f46-9445-17aefcaecf8b	masuk	1	0	1	Stok awal	\N	\N	2026-06-28 08:34:20.669101+00
40ed9149-6b3d-457a-b4c9-f81216c3a84c	ecff8477-4c30-4f46-9445-17aefcaecf8b	masuk	1	1	2	Dari Gudang	\N	\N	2026-06-28 08:36:13.957397+00
9334341c-837e-4ded-a47e-ae32d71c77dd	ecff8477-4c30-4f46-9445-17aefcaecf8b	keluar	1	2	1	Penjualan INV-20260628-0013	5096a889-91de-4e8e-8387-7021ab7b0870	\N	2026-06-28 08:45:38.22922+00
8cfa17d3-c12c-4175-95d5-128a599fb1d4	34fefb75-a56c-499a-8b52-fc69a7887b3a	keluar	1	1	0	Penjualan INV-20260628-0014	19a8fdb7-0778-4409-86ce-400613553af8	\N	2026-06-28 08:48:31.208675+00
021be400-020b-43ba-900b-054dab6c7ec0	49899fd9-cbfd-408d-a56a-a890634ded18	keluar	1	1	0	Penjualan INV-20260628-0014	19a8fdb7-0778-4409-86ce-400613553af8	\N	2026-06-28 08:48:31.579035+00
bbec12f2-6deb-4263-97c3-977a7efc69dc	34fefb75-a56c-499a-8b52-fc69a7887b3a	masuk	1	0	1	Pembatalan penjualan	\N	\N	2026-06-28 10:12:56.506105+00
d4783654-e8a8-4850-af64-ab0c18f13ac9	49899fd9-cbfd-408d-a56a-a890634ded18	masuk	1	0	1	Pembatalan penjualan	\N	\N	2026-06-28 10:12:56.852693+00
062d242b-1f9b-474a-a6bb-68a21b7bd47d	ecff8477-4c30-4f46-9445-17aefcaecf8b	masuk	1	1	2	Pembatalan penjualan	\N	\N	2026-06-28 10:13:16.788703+00
6b143ff3-2dc7-4403-a39b-5f4ebb04c9d2	aeeab3d9-13b0-4c52-9dec-80a0129c6001	masuk	1	0	1	Pembatalan penjualan	\N	\N	2026-06-28 10:56:54.145568+00
f35799c3-d884-4364-aac0-9bb9cb8e820e	bf77b94b-cddc-47ce-8f0a-c3bc4512b239	masuk	1	0	1	Pembatalan penjualan	\N	\N	2026-06-28 10:56:58.147904+00
d58a7de0-1742-439f-8f43-fc20f4d245d1	d59a37fe-ecbb-4572-bc88-f8b8250a6304	masuk	1	0	1	Pembatalan penjualan	\N	\N	2026-06-28 10:57:02.518954+00
244245c5-2440-4439-aa27-a0495d656b10	0b996cea-99f1-484f-92c0-05f6fd40f278	masuk	1	0	1	Pembatalan penjualan	\N	\N	2026-06-28 10:57:05.637302+00
608bacae-8d42-4375-8e07-44d3e88133f7	9217ae4b-68c2-4b8f-8909-2812abdb999a	masuk	1	0	1	Pembatalan penjualan	\N	\N	2026-06-28 12:00:57.787134+00
5629adf0-2e23-4f0a-93e2-75a17d056632	0b996cea-99f1-484f-92c0-05f6fd40f278	keluar	1	1	0	Penjualan INV-20260628-0015	21ca98d8-f36b-459d-a17a-5fdbde56bab5	\N	2026-06-28 12:01:39.962379+00
31ab0d05-7752-4594-b8fd-f6087bdd9f38	0b996cea-99f1-484f-92c0-05f6fd40f278	masuk	1	0	1		\N	\N	2026-06-28 12:02:55.456327+00
bcf4df7c-2f8d-46c7-85d5-dd644a291b66	0b996cea-99f1-484f-92c0-05f6fd40f278	keluar	1	1	0	Penjualan INV-20260628-0016	3896e11e-d733-4d1d-a0f9-008b722b5104	\N	2026-06-28 12:04:22.162011+00
ee845551-443e-4dfd-9511-fb5ec9f7e407	0b996cea-99f1-484f-92c0-05f6fd40f278	masuk	1	0	1	Pembatalan penjualan	\N	\N	2026-06-28 12:26:08.187584+00
f6050c17-e0fd-4bb4-aaa5-b3c54a7eb8f1	0b996cea-99f1-484f-92c0-05f6fd40f278	masuk	1	1	2	Pembatalan penjualan	\N	\N	2026-06-28 12:26:19.429316+00
8060e80b-9463-4796-8922-76e0dbf8ea30	c4b71aa8-e7ef-4087-b3ba-7e59bd238ffd	masuk	1	0	1	Stok awal	\N	\N	2026-06-28 12:29:17.735311+00
7bfa95d4-32a6-427f-8a3a-4089f9481adc	ddd1faf3-4959-40bb-9a53-ba3703f0e845	keluar	1	1	0	Penjualan INV-20260628-0017	c605c1c3-3154-4ebd-ad96-7456ea8829cf	\N	2026-06-28 12:31:55.922918+00
42fe67ac-3b15-4050-a094-60b53522a66e	49899fd9-cbfd-408d-a56a-a890634ded18	keluar	1	1	0	Penjualan INV-20260628-0018	ca1676ab-710f-4141-bda9-e924a272f83e	\N	2026-06-28 16:24:18.629513+00
72617ee9-cf3e-4ab9-bf4b-3624a6dce35d	aeeab3d9-13b0-4c52-9dec-80a0129c6001	keluar	1	1	0	Penjualan INV-20260628-0019	79bf2df8-70ac-4f72-9eec-bf3331eb1c77	\N	2026-06-28 16:46:55.867377+00
d081e0db-c10a-4620-b100-93df6d64dd8e	d59a37fe-ecbb-4572-bc88-f8b8250a6304	keluar	1	1	0	Penjualan INV-20260628-0020	60bc0f05-0214-4067-b020-a4a6f8d9336b	\N	2026-06-28 17:07:13.655184+00
bc1af55c-298f-42b0-91a6-03d0d776c223	edd7b36c-43cf-444f-b6cd-f0865549cbb8	masuk	1	1	2	Tambahan	\N	\N	2026-06-28 23:42:12.707512+00
2b4127ec-1988-44c1-bb73-cde9f4a7fbbc	023a968c-4ba4-4be8-bb95-9b09b7281801	masuk	1	0	1	Penerimaan PO PO-20260629-0002	\N	64dc3274-0701-416c-bee5-1c6f831ecf5f	2026-06-29 01:15:08.259767+00
84487eb4-0f9d-426d-ba00-6a7a2c33eb26	34fefb75-a56c-499a-8b52-fc69a7887b3a	keluar	1	1	0	Penjualan INV-20260629-0021	0a70ea48-ac44-4221-8998-1800d9e3673a	\N	2026-06-29 01:35:45.790191+00
edea4274-dee2-4333-9a8e-1140c88a9027	f0e94741-80ae-4c65-8a36-6f7c13000103	keluar	0	2	2		\N	\N	2026-06-29 07:50:05.205434+00
2df74309-1047-4478-9b91-80736f30b308	f0e94741-80ae-4c65-8a36-6f7c13000103	keluar	2	2	0		\N	\N	2026-06-29 07:50:19.448922+00
5dc1a513-eb41-4491-ab58-ef9bb48c0491	4f6d31ba-c2cf-46a2-903d-929f7d1e4bd4	keluar	1	1	0		\N	\N	2026-06-29 07:50:49.121912+00
2512d940-56f6-4aa1-a8fc-f07f1ecd4d0a	eaffd37e-6587-42b9-8f84-2e2e453b54c1	keluar	1	1	0		\N	\N	2026-06-29 07:51:21.282693+00
82168587-abeb-403a-b904-1e69e14d5b4e	29ca7e81-9c9a-4f32-ac00-9e9240f16a65	keluar	1	1	0		\N	\N	2026-06-29 07:51:35.041717+00
1b1d140d-d667-422c-a572-0b411966c607	d7d67c45-176c-48ac-aba9-bd86ffae0878	keluar	1	1	0		\N	\N	2026-06-29 07:52:45.103331+00
9214bc1a-752b-4ef0-9771-f1bb7e23ddbd	f9e4976e-8894-4e8e-a0cb-a5be21ed2f63	masuk	1	0	1	Stok awal	\N	\N	2026-06-29 07:56:11.522837+00
72933ad2-4662-4e95-9bbe-0db025ffbfae	c1119760-37cd-47a3-8c80-28464ba0d594	masuk	3	1	4		\N	\N	2026-06-29 08:03:18.025784+00
93bbcbe2-bde2-4006-8e42-deba28bb22cd	c1119760-37cd-47a3-8c80-28464ba0d594	keluar	3	4	1		\N	\N	2026-06-29 08:03:29.595989+00
a41081ce-cd86-403c-b198-1f940e180197	023a968c-4ba4-4be8-bb95-9b09b7281801	keluar	1	1	0	Penjualan INV-20260629-0022	0f6339a3-6198-4d8e-b0ee-7f43667e7b0b	\N	2026-06-29 08:11:57.388313+00
9b208228-e605-4d3d-9c8e-4b6b2352fa47	6f4a47b7-d8aa-4746-829d-1157de1bbf00	keluar	1	1	0	Penjualan INV-20260629-0023	7db659eb-5a7a-4fd4-a89f-84ccd4c1e7ae	\N	2026-06-29 08:13:18.734121+00
36ed9423-fb49-44af-a03b-f4d4bd1a1779	bf77b94b-cddc-47ce-8f0a-c3bc4512b239	keluar	1	1	0	Penjualan INV-20260629-0024	92209c91-601f-423e-bc28-6f59464c0d06	\N	2026-06-29 08:16:02.492854+00
72811d32-a3fa-4793-a45d-8bdd583bb5fd	0b996cea-99f1-484f-92c0-05f6fd40f278	keluar	1	2	1		\N	\N	2026-06-29 08:26:42.51215+00
ab363128-840f-4b14-8019-27ad67c724b5	edd7b36c-43cf-444f-b6cd-f0865549cbb8	keluar	1	2	1		\N	\N	2026-06-29 08:26:53.415167+00
52ef1e5c-13bd-4b44-ad22-ae2b9c71a76c	34fefb75-a56c-499a-8b52-fc69a7887b3a	masuk	1	0	1		\N	\N	2026-06-29 08:28:30.5828+00
ba2f8a63-2cf3-4253-92a4-bbe737049779	c2dd5aca-10a4-433b-8163-36cc679cf8d4	masuk	1	0	1		\N	\N	2026-06-29 08:29:01.043608+00
53c03172-64bd-4c49-9f3f-2a1a6a4f877e	293d149e-c109-4c69-9e95-3a45f7630df7	keluar	1	4	3		\N	\N	2026-06-29 08:34:19.297321+00
a14ae360-3703-4ad3-94ea-d82361521c00	1ae8c4b2-622a-4f48-85f1-994fbff30f1b	keluar	1	1	0		\N	\N	2026-06-29 08:34:44.37797+00
0b4e54d0-2917-42e6-8cf8-48429266ad09	edaa95dd-8aac-43eb-9106-8607281f5f51	keluar	1	1	0		\N	\N	2026-06-29 08:35:07.380275+00
912884db-fe2e-463d-91b2-bd052bbc1513	e6fb0a21-4d92-4640-a7ad-2c1da6738f37	masuk	1	0	1		\N	\N	2026-06-29 08:39:27.769473+00
c46d68b0-80d7-437f-9120-8e72c0b705d1	41c51212-5ca0-4974-af37-b0e85a234dfc	keluar	1	4	3		\N	\N	2026-06-29 08:41:08.35966+00
e3abc2b7-b72f-4c96-a8f0-4d32297301f6	1f922685-3964-4541-8e69-0c7df4a31b2b	keluar	1	1	0		\N	\N	2026-06-29 08:42:33.926198+00
07b2984f-eea5-4b75-88b1-d75fd3338cdb	7c550656-5584-43b4-8fb9-a60e4264bf49	keluar	2	2	0		\N	\N	2026-06-29 08:44:08.593762+00
5955ed59-c1d9-4400-9831-50cc0f218a89	b898575d-0f68-4524-8a21-0c3958e5b54e	keluar	5	5	0		\N	\N	2026-06-29 08:44:26.025068+00
139c5427-8c10-4c80-8e72-b79c039c514f	b898575d-0f68-4524-8a21-0c3958e5b54e	masuk	4	0	4		\N	\N	2026-06-29 08:45:22.154385+00
0ab9c7aa-fe7a-4455-a8ec-49ecf4a60396	3501e2b8-e77e-4570-b7fd-125890106033	keluar	1	1	0		\N	\N	2026-06-29 08:46:02.502846+00
a76c58e0-5ccc-404e-b23b-88434266487f	b9f5db83-c509-47bf-987b-a94e97875714	keluar	1	1	0		\N	\N	2026-06-29 08:47:14.186884+00
fdbbc22a-4604-4175-8456-081ffce8616d	ecff8477-4c30-4f46-9445-17aefcaecf8b	keluar	2	2	0		\N	\N	2026-06-29 08:49:56.071299+00
683c20e4-aa3b-4ffc-971d-4e9a163583aa	8f2cff30-63e2-45f9-84d0-0cd5fa78a686	keluar	1	1	0		\N	\N	2026-06-29 08:56:36.266525+00
f7e2f451-7ada-47ff-b0eb-6bbea6f2af93	b6d6d5d5-0601-439a-ae72-41f67baa6219	keluar	1	1	0		\N	\N	2026-06-29 09:11:48.066998+00
65df07bf-1612-44e3-9e3c-c4b8eec74b5f	49c8105b-f335-4542-98b4-38922eeb216d	keluar	1	1	0		\N	\N	2026-06-29 09:11:54.585393+00
375d4dd3-543b-48ef-bec6-31ceb6736c6f	dc969510-69aa-48e2-badd-72458d2ee39e	keluar	1	1	0		\N	\N	2026-06-29 09:12:17.1913+00
37fd0268-75c6-4f90-983f-52991046c46c	2311893b-3b1f-4f2c-9521-c587e5dd59a1	keluar	1	1	0		\N	\N	2026-06-29 09:12:47.473363+00
78df498e-50b6-4f69-b2a8-47e49145a645	27ba83fb-7d07-4ade-aafb-b6c75b255f97	keluar	1	1	0		\N	\N	2026-06-29 09:12:57.558897+00
efb7867f-6a62-4d9b-8372-8b10001f8fea	8264ad7a-2b65-45d3-a43b-3984ac3fbfeb	masuk	1	0	1		\N	\N	2026-06-29 09:13:39.037163+00
2621fa6d-04f5-450c-a23d-1cdcda970f48	9217ae4b-68c2-4b8f-8909-2812abdb999a	keluar	1	1	0		\N	\N	2026-06-29 09:19:34.465435+00
741fd4ac-69bd-4b67-bf4e-b1a8453d8f6f	fa076acc-ded7-42b8-b93d-8ef31450871d	keluar	1	1	0		\N	\N	2026-06-29 09:19:44.442157+00
6b33800e-f808-4c5b-93f9-66dba7ee1d26	eb93dba0-7cc9-47e7-82bf-8754ecc44fb6	keluar	1	1	0		\N	\N	2026-06-29 09:19:55.314801+00
b4f6bf73-acfb-40d4-b726-99aa3ea3ce1b	1af1a16f-c20c-4283-a102-ca79a5e3196f	keluar	1	1	0		\N	\N	2026-06-29 09:20:25.9103+00
c14c4482-6dc9-4016-8595-bba80acdcfc1	1af1a16f-c20c-4283-a102-ca79a5e3196f	masuk	1	0	1		\N	\N	2026-06-29 09:21:24.745718+00
72dfe6bd-034f-4197-9834-649905d3924e	767195e9-fed8-4511-90a9-8b504e1a5ad0	keluar	1	1	0		\N	\N	2026-06-29 09:21:53.010715+00
ccd2fef9-fd53-4537-8836-d79763d9e2f0	d4db6bb9-e10f-486f-bbad-48a9ed8813e8	keluar	1	1	0		\N	\N	2026-06-29 09:22:00.37812+00
a2796e3a-22ed-41ce-8c0e-327e867c6b24	023a968c-4ba4-4be8-bb95-9b09b7281801	masuk	1	0	1	Penerimaan PO PO-20260629-0004	\N	64dc3274-0701-416c-bee5-1c6f831ecf5f	2026-06-29 13:59:59.456743+00
92477795-b990-417c-a703-ebe31606db3c	023a968c-4ba4-4be8-bb95-9b09b7281801	keluar	1	1	0		\N	\N	2026-06-29 14:30:48.883818+00
6c76bec9-29f3-4412-80ef-814a5c3cd555	95c4990d-5994-4468-a8a6-05e89e116524	masuk	1	0	1		\N	\N	2026-06-30 03:12:45.679817+00
4088ca06-0401-4e92-9fbd-e470307ccf91	ab41f151-2c93-4aa7-8033-b8556c655820	masuk	1	0	1		\N	\N	2026-06-30 03:12:51.473348+00
57cf7f8e-c768-4508-8033-a3992bdb1e19	ab41f151-2c93-4aa7-8033-b8556c655820	keluar	1	1	0	Penjualan INV-20260630-0025	1e0e3043-05b8-4a5a-b6b8-541cd78915be	\N	2026-06-30 03:14:55.772072+00
afcddb0c-5698-46d5-a87a-ee0b719fbc8b	ab41f151-2c93-4aa7-8033-b8556c655820	masuk	1	0	1	Pembatalan penjualan	\N	\N	2026-06-30 03:22:21.747829+00
a9d468ef-c4d6-4394-b4ea-25bb0b344afa	34fefb75-a56c-499a-8b52-fc69a7887b3a	masuk	1	1	2	Penerimaan PO PO-20260630-0001	\N	64dc3274-0701-416c-bee5-1c6f831ecf5f	2026-06-30 03:30:00.831456+00
28570357-5b55-4211-b2c5-5707964e9edc	34fefb75-a56c-499a-8b52-fc69a7887b3a	keluar	1	2	1	Penjualan INV-20260630-0026	ad1a3f3e-8820-4d57-b6c9-a8a6949d6093	\N	2026-06-30 03:31:35.70176+00
02de6e75-3316-476b-ba65-e0bd99f680e7	aeeab3d9-13b0-4c52-9dec-80a0129c6001	masuk	1	0	1	Pembatalan penjualan	\N	\N	2026-06-30 03:36:41.522754+00
b1f21bb2-e92d-4076-9dd5-2726c3f8acdf	49899fd9-cbfd-408d-a56a-a890634ded18	masuk	1	0	1	Pembatalan penjualan	\N	\N	2026-06-30 03:36:43.719793+00
06b5b66f-a217-4016-8b78-9ba4c7114c0f	d59a37fe-ecbb-4572-bc88-f8b8250a6304	masuk	1	0	1	Pembatalan penjualan	\N	\N	2026-06-30 03:36:45.53575+00
c67198d2-0be3-4f03-9a41-4eca82932309	34fefb75-a56c-499a-8b52-fc69a7887b3a	masuk	1	1	2	Pembatalan penjualan	\N	\N	2026-06-30 03:36:47.63217+00
aac092f0-18bd-4b9c-bbeb-9d19e5c2df53	023a968c-4ba4-4be8-bb95-9b09b7281801	masuk	1	0	1	Pembatalan penjualan	\N	\N	2026-06-30 03:36:49.218192+00
9c2deea3-91b7-4408-85bb-472766cd80af	6f4a47b7-d8aa-4746-829d-1157de1bbf00	masuk	1	0	1	Pembatalan penjualan	\N	\N	2026-06-30 03:36:51.031996+00
fbcddb9c-4eb2-400f-9bf0-d2030f9e240f	bf77b94b-cddc-47ce-8f0a-c3bc4512b239	masuk	1	0	1	Pembatalan penjualan	\N	\N	2026-06-30 03:36:52.799502+00
b5520206-b8f1-4b21-ad8e-d8274a90d73d	ddd1faf3-4959-40bb-9a53-ba3703f0e845	masuk	1	0	1	Pembatalan penjualan	\N	\N	2026-06-30 03:36:54.860182+00
1d6932d4-b935-4ead-8d57-7c00f9e255bf	dc969510-69aa-48e2-badd-72458d2ee39e	masuk	1	0	1		\N	\N	2026-06-30 07:30:29.066815+00
84750bfe-3204-4556-9b3f-5ca8d06d87e5	dc969510-69aa-48e2-badd-72458d2ee39e	keluar	1	1	0	Penjualan INV-20260630-0027	fc3f4d8b-b098-4158-a5b1-d9f1ec97332c	\N	2026-06-30 07:31:56.852932+00
1029c2fb-2974-4f16-af17-d71409034db7	90159552-8b47-41f1-b0cd-de4fd8002774	masuk	1	0	1		\N	\N	2026-06-30 07:35:21.200977+00
a2c441e9-6965-4b36-907b-e76d41943f63	90159552-8b47-41f1-b0cd-de4fd8002774	keluar	1	1	0	Penjualan INV-20260630-0028	eefcdb6a-59eb-4ff8-8246-a6b39647ac38	\N	2026-06-30 07:37:08.523791+00
e0efd7c7-be7e-4bf6-913b-f4d90db21851	8ae4f3e2-7802-4e39-97f2-aa7cee615352	masuk	1	0	1		\N	\N	2026-06-30 07:39:51.194482+00
434568e7-9712-490d-9fc9-c1e654bd9274	0c2afa49-f55b-45e2-a0dc-9dfd5f30b766	masuk	1	0	1	Stok awal	\N	\N	2026-06-30 09:07:41.11381+00
c23796f9-4e1d-4fda-a25a-b8edff8dbec2	95c4990d-5994-4468-a8a6-05e89e116524	keluar	1	1	0		\N	\N	2026-06-30 09:12:27.823116+00
18a706c1-1174-4e4e-9b26-f06989104c75	8ae4f3e2-7802-4e39-97f2-aa7cee615352	keluar	1	1	0		\N	\N	2026-06-30 09:12:56.33899+00
b7304744-dfbf-47ff-ba9a-cbc4392bf4f8	aeeab3d9-13b0-4c52-9dec-80a0129c6001	keluar	1	1	0		\N	\N	2026-06-30 09:13:37.445462+00
a8cfc7bc-a069-4a25-81d2-b53f41a891ef	023a968c-4ba4-4be8-bb95-9b09b7281801	keluar	1	1	0		\N	\N	2026-06-30 09:13:47.543954+00
e47f5b44-bd53-418f-ba0e-85645bc83e71	d59a37fe-ecbb-4572-bc88-f8b8250a6304	keluar	1	1	0		\N	\N	2026-06-30 09:14:00.291544+00
bdcb683f-591e-4b39-90fe-c2307d4a5d1f	6f4a47b7-d8aa-4746-829d-1157de1bbf00	keluar	1	1	0		\N	\N	2026-06-30 09:14:17.037693+00
c69e917e-1f57-42bb-b3a1-04a0f4a1066a	0639c160-5f47-4894-ac58-77b1d1ed5458	masuk	1	0	1	Stok awal	\N	\N	2026-06-30 09:15:19.354205+00
851c2fa7-bd8c-4c82-9cfc-4ba93ab583a9	d0babede-b7cf-4138-bcce-d3d9a4151949	masuk	1	0	1	Stok awal	\N	\N	2026-06-30 09:16:57.327818+00
603e875a-40c6-4d5c-bdcd-34fff6e08b8f	74043623-578c-49a6-970f-1614e16c7723	masuk	1	0	1	Stok awal	\N	\N	2026-06-30 09:17:40.484807+00
3624eb28-a44d-46c0-8c9b-b14677ee8486	e4498b56-adff-42ec-85e8-feb0d206d622	masuk	1	0	1	Stok awal	\N	\N	2026-06-30 09:20:30.508914+00
7755f7da-4448-4ec1-9463-1c9aa2c69f3a	c4b71aa8-e7ef-4087-b3ba-7e59bd238ffd	keluar	1	1	0		\N	\N	2026-06-30 09:21:30.621397+00
8640b365-149d-4c73-bc15-78a8162f9087	91237d66-7fdb-45a7-a1b6-dd59335e5ebb	masuk	1	0	1	Stok awal	\N	\N	2026-06-30 09:22:47.996941+00
2ae596b2-6c11-487d-81dc-547a462100c7	e46a4119-14cc-47a9-b7ac-a74dcf7c5138	masuk	1	0	1	Stok awal	\N	\N	2026-06-30 09:24:03.497953+00
2f3ad57f-76ac-4a36-a8b3-ced55331c0ec	5386430d-38a3-47de-8467-aa2fa1ace678	masuk	1	0	1	Stok awal	\N	\N	2026-06-30 09:25:53.749566+00
3068c24c-e54e-45c4-bbd9-87baf08f57ff	31b268c9-d467-4a88-b0ae-ac96b16f7629	masuk	1	0	1	Stok awal	\N	\N	2026-06-30 09:26:38.128837+00
89af8643-96a5-4241-bb12-af93fe561b5b	dc969510-69aa-48e2-badd-72458d2ee39e	masuk	1	0	1	Pembatalan penjualan	\N	\N	2026-06-30 09:27:14.146079+00
bfb20ba4-0fdf-4109-a73b-977dd3a49ff7	90159552-8b47-41f1-b0cd-de4fd8002774	masuk	1	0	1	Pembatalan penjualan	\N	\N	2026-06-30 09:27:16.801223+00
3693003e-d1f9-4e29-94c1-b2acda315449	34fefb75-a56c-499a-8b52-fc69a7887b3a	masuk	1	2	3	Pembatalan penjualan	\N	\N	2026-06-30 09:27:20.171935+00
f8f69670-3cc0-4d12-8947-4c45ff9fed15	23b9749b-e1d8-42c3-98c9-ccb4d3c79b7c	masuk	1	0	1	Stok awal	\N	\N	2026-06-30 09:29:23.340576+00
056f01f5-6b9d-43b5-8853-d6dc20309b20	34fefb75-a56c-499a-8b52-fc69a7887b3a	keluar	2	3	1		\N	\N	2026-06-30 09:31:10.96532+00
ebc2e672-6a85-4127-9444-fa1eb9f7a79f	edd7b36c-43cf-444f-b6cd-f0865549cbb8	keluar	1	1	0		\N	\N	2026-06-30 09:31:34.97973+00
dc5c855b-4f5c-4abc-9fbb-2a736e135278	8f1037fa-5841-4310-b208-eeab681f7dd7	masuk	1	1	2		\N	\N	2026-06-30 11:44:35.492975+00
dcb1ab18-22ef-4408-a6d6-d477d0d4b504	34fefb75-a56c-499a-8b52-fc69a7887b3a	keluar	1	1	0	Penjualan INV-20260630-0029	0308f458-8995-46d1-a9bb-a95546c696c0	\N	2026-06-30 13:26:40.186423+00
6491732d-42d5-48ed-97a2-7c4225400cc2	34fefb75-a56c-499a-8b52-fc69a7887b3a	masuk	1	0	1	Pembatalan penjualan	\N	\N	2026-06-30 13:26:49.448214+00
77b1f4aa-0b34-4aba-8c0f-f62b0882d93f	c2dd5aca-10a4-433b-8163-36cc679cf8d4	keluar	1	1	0	Penjualan INV-20260630-0030	b92844d0-89b5-4517-a00f-8688cb3c0fb6	\N	2026-06-30 13:28:53.353997+00
05067ce9-34b4-4279-9611-49e3c65c071b	74043623-578c-49a6-970f-1614e16c7723	masuk	1	1	2	Penerimaan PO PO-20260630-0001	\N	64dc3274-0701-416c-bee5-1c6f831ecf5f	2026-06-30 13:45:48.565597+00
9cd067b8-500c-4b22-97cd-7d5024b1d63b	74043623-578c-49a6-970f-1614e16c7723	keluar	1	2	1	Penjualan INV-20260630-0031	97cb2410-ce00-4ed7-9141-9dc62148de9b	\N	2026-06-30 13:47:27.462655+00
ecca93a1-7b4e-482c-b344-7c9e45faae41	e6fb0a21-4d92-4640-a7ad-2c1da6738f37	masuk	1	1	2		\N	\N	2026-07-01 08:07:47.829062+00
5d520415-8cc1-4243-a1ff-9546f637bcd2	3b81c90e-a925-48e1-9f4d-494fddd0f5b2	masuk	1	0	1	Stok awal	\N	\N	2026-07-01 08:12:41.462622+00
ffeac683-02d8-47a7-9148-3cb1c33d1245	74043623-578c-49a6-970f-1614e16c7723	masuk	1	1	2	Pembatalan penjualan	\N	\N	2026-07-01 08:23:43.248838+00
cb35c0e3-59d2-4739-86d4-c01bd4b4447a	c2dd5aca-10a4-433b-8163-36cc679cf8d4	masuk	1	0	1	Pembatalan penjualan	\N	\N	2026-07-01 08:23:46.972754+00
f4057bf3-f864-43a4-88ef-697b7e267818	7fb56c17-01b3-46f1-9c43-d897d3ef9644	masuk	1	0	1	Stok awal	\N	\N	2026-07-01 08:25:39.640345+00
a7e41247-3351-4ce8-bd91-6d901f14417b	7b92628a-4f55-4d38-90da-ebdc074264da	masuk	1	0	1	Stok awal	\N	\N	2026-07-01 08:28:32.880514+00
a31727be-11da-44d8-bb4a-ea33062a0d75	6a366d28-af38-4364-85a4-b4c4f0e7c64f	masuk	1	0	1	Stok awal	\N	\N	2026-07-01 08:29:54.4104+00
de341f61-d010-4f82-8229-1c9dd08e356e	0e779dd7-facf-4857-ad0f-3ea4b2411f5e	masuk	1	0	1	Stok awal	\N	\N	2026-07-01 08:30:41.54782+00
df8fb9ff-5152-4b81-8b8f-c17c53e5858d	b9f5db83-c509-47bf-987b-a94e97875714	masuk	2	0	2		\N	\N	2026-07-01 08:34:04.575856+00
6668f0c6-be9a-440e-ab1c-6d45634e7a58	3ef11dd2-24f7-4df5-b57e-a27fbe7a39a3	masuk	2	0	2	Stok awal	\N	\N	2026-07-01 08:34:55.390983+00
91baff37-23d6-4c7f-991d-92572ef383ed	0d220e68-b324-41c8-8dce-c7ac72efe169	masuk	1	0	1	Stok awal	\N	\N	2026-07-01 08:36:37.709891+00
868873e8-d07d-43b3-9e25-0aab96419502	90159552-8b47-41f1-b0cd-de4fd8002774	masuk	1	0	1		\N	\N	2026-07-01 08:38:09.230572+00
faf108d1-703c-45dd-9002-543046787a62	dc969510-69aa-48e2-badd-72458d2ee39e	keluar	1	1	0		\N	\N	2026-07-01 08:40:26.231597+00
262934c7-b4de-4fcc-9c9e-9ee9cb2a7087	2311893b-3b1f-4f2c-9521-c587e5dd59a1	masuk	1	0	1		\N	\N	2026-07-01 08:40:58.431688+00
147e0949-bf3a-4218-8d17-20f8a9f94986	359c2837-18f0-466a-b592-cf33fad21126	masuk	1	0	1		\N	\N	2026-07-01 08:41:19.88906+00
da038e03-feee-44d7-90cb-2b5c13acb627	bb27b946-5706-483f-bc1b-65b29a1f8024	masuk	1	0	1	Stok awal	\N	\N	2026-07-01 08:43:46.249698+00
1da6940f-57fe-47b9-baa7-eff6016f0d38	f04cf6e2-18f8-4785-a981-05f9129792cd	masuk	1	0	1	Stok awal	\N	\N	2026-07-01 08:45:03.121095+00
ad68da85-f21b-4864-b5e7-bca952e8d4d9	3b3e5b0f-e4e5-4576-a461-731e5daadd46	masuk	2	0	2	Stok awal	\N	\N	2026-07-01 08:52:18.390134+00
b6730cf5-c890-4cea-8659-b53937d34ad1	aeeab3d9-13b0-4c52-9dec-80a0129c6001	masuk	1	0	1	Penerimaan PO PO-20260701-0001	\N	64dc3274-0701-416c-bee5-1c6f831ecf5f	2026-07-01 09:22:53.617763+00
135c9d60-0db3-4e24-83e9-0493fe425fde	dc969510-69aa-48e2-badd-72458d2ee39e	masuk	1	0	1		\N	\N	2026-07-01 09:42:31.407057+00
1e2bb837-1f73-47d1-995d-7f8f917db5ba	5f144ff7-1856-4bc8-9ae1-2d29e19d3b62	koreksi	6	0	6		\N	\N	2026-07-01 09:50:54.384174+00
cd38b287-3994-4784-904b-b13dfd279e65	6e556179-e9ee-42f4-926f-864c61022ae2	masuk	1	0	1	Stok awal	\N	\N	2026-07-01 09:52:38.299812+00
56e60c2e-da74-47cb-ac18-aa1c3b80d406	6e556179-e9ee-42f4-926f-864c61022ae2	masuk	1	1	2		\N	\N	2026-07-01 09:53:04.031681+00
bc484a2c-51d7-481a-8d47-0e0fa17c483b	18a74238-b7a5-4b74-9799-12bc3d730803	masuk	1	0	1	Stok awal	\N	\N	2026-07-01 09:53:39.613652+00
42f3070f-c82d-447d-9b1c-41712e983d77	d600e7ae-987c-4ff3-a832-c6d53363f0f8	masuk	1	0	1	Stok awal	\N	\N	2026-07-01 09:55:18.926577+00
52a6f06a-3b61-4abd-9a7d-85a777b82a72	74043623-578c-49a6-970f-1614e16c7723	keluar	1	2	1		\N	\N	2026-07-01 09:57:30.929407+00
0066e65d-1bf2-4d64-a79c-fa6dbd7bf09a	ba33ee60-a9e7-4677-a838-8f075f68ee49	masuk	1	0	1	Stok awal	\N	\N	2026-07-01 09:58:00.148329+00
ab37e040-f338-48d4-b383-04b1e23ea05d	dc969510-69aa-48e2-badd-72458d2ee39e	keluar	1	1	0	Penjualan INV-20260701-0032	71329321-428a-4f6d-a7c0-93c542f8c55c	\N	2026-07-01 10:00:27.537881+00
aeef4789-fe66-4edf-bd4a-dd3b33384182	d600e7ae-987c-4ff3-a832-c6d53363f0f8	keluar	1	1	0	Penjualan INV-20260701-0033	eb67e178-ca70-4335-a186-b2a4b3e2f5d6	\N	2026-07-01 10:04:23.717282+00
ad1a649d-b131-4040-b80c-83e12aefbc25	ba33ee60-a9e7-4677-a838-8f075f68ee49	keluar	1	1	0	Penjualan INV-20260701-0034	8370e2c0-fec8-4374-b8c0-6db96a0d7bde	\N	2026-07-01 10:08:17.30483+00
627ddc63-746b-4589-9875-8b7c5de4fb37	5f144ff7-1856-4bc8-9ae1-2d29e19d3b62	keluar	1	6	5	Penjualan INV-20260701-0035	2ec99276-fe9c-4215-ad41-e244043b53e5	\N	2026-07-01 10:19:06.204935+00
caefecab-5e57-43eb-bb9e-7d0a96c91c2f	6e556179-e9ee-42f4-926f-864c61022ae2	keluar	1	2	1	Penjualan INV-20260701-0035	2ec99276-fe9c-4215-ad41-e244043b53e5	\N	2026-07-01 10:19:06.665241+00
f829e4d6-82a1-41b0-977e-b539b7049a78	5f144ff7-1856-4bc8-9ae1-2d29e19d3b62	keluar	3	5	2	Penjualan INV-20260701-0036	2996bb77-722b-4665-9c22-1393ef8ffa7e	\N	2026-07-01 10:31:26.995166+00
b51c12bf-4daf-49ab-b505-588838cfd014	6e556179-e9ee-42f4-926f-864c61022ae2	keluar	1	1	0	Penjualan INV-20260701-0036	2996bb77-722b-4665-9c22-1393ef8ffa7e	\N	2026-07-01 10:31:27.320393+00
5ddaa970-ca3a-4023-a0b0-08a359841911	5f144ff7-1856-4bc8-9ae1-2d29e19d3b62	koreksi	2	2	0		\N	\N	2026-07-01 10:33:26.121024+00
8f104b60-448d-428d-8a38-7dacb16d58c7	34fefb75-a56c-499a-8b52-fc69a7887b3a	keluar	1	1	0	Penjualan INV-20260701-0037	2ca15761-e46b-4431-bceb-900d1109772d	\N	2026-07-01 10:41:50.124771+00
12ac8d4a-6b23-4305-a011-e5d97ec0e5df	aeeab3d9-13b0-4c52-9dec-80a0129c6001	keluar	1	1	0	Penjualan INV-20260701-0038	4e174d0e-8a08-4172-b42f-f3caab6268c8	\N	2026-07-01 10:43:31.150439+00
9095ba04-cf6c-447f-b33a-7183c68fd57b	aeeab3d9-13b0-4c52-9dec-80a0129c6001	masuk	1	0	1	Pembatalan penjualan	\N	\N	2026-07-01 10:50:15.06423+00
77d12aae-d539-411d-977d-1be1e514fab8	34fefb75-a56c-499a-8b52-fc69a7887b3a	masuk	1	0	1	Pembatalan penjualan	\N	\N	2026-07-01 10:54:43.813269+00
c8537568-28f1-4917-9bd3-065e0cc1255b	49899fd9-cbfd-408d-a56a-a890634ded18	keluar	1	1	0	Penjualan INV-20260701-0039	fdd41e55-a993-4327-814e-a7c70a452a33	\N	2026-07-01 11:22:41.689298+00
81e1466b-07eb-4e38-9f22-826218756e51	49899fd9-cbfd-408d-a56a-a890634ded18	masuk	1	0	1	Pembatalan penjualan	\N	\N	2026-07-01 11:48:54.203095+00
f124e45b-421b-4d36-91a1-0e775b847402	aeeab3d9-13b0-4c52-9dec-80a0129c6001	keluar	1	1	0		\N	\N	2026-07-01 13:53:24.91707+00
c7388a9d-9b7c-4adf-a48e-3d020d969060	41c51212-5ca0-4974-af37-b0e85a234dfc	keluar	1	3	2	Penjualan INV-20260702-0040	c09c3819-fac6-4087-88f2-b5907ac64d7d	\N	2026-07-02 01:07:02.189837+00
7c9f7122-3863-4807-ae10-bd9e08960cd6	3b81c90e-a925-48e1-9f4d-494fddd0f5b2	keluar	1	1	0	Penjualan INV-20260702-0041	0220951d-f77f-49a9-ae44-4ea1f576e59f	\N	2026-07-02 07:36:24.264559+00
f91d5745-d404-4ce5-bdc9-6e898803fd28	e6fb0a21-4d92-4640-a7ad-2c1da6738f37	keluar	1	2	1	Penjualan INV-20260702-0042	96e37eb6-10d8-425c-81ff-101bc580fac1	\N	2026-07-02 08:41:23.083869+00
58c55971-2e1b-4711-a55f-2fb30da5621d	d4a7b770-2937-4615-b974-e2138f43e22c	keluar	1	1	0	Penjualan INV-20260703-0043	f8625d3e-cf1f-4ce5-8984-579329034220	\N	2026-07-03 05:12:04.198532+00
fd28952a-d92e-4ed1-b6fc-8ea674f58ff2	f7b48160-8677-49e2-8f4c-145be2156fc2	keluar	1	1	0	Penjualan INV-20260703-0043	f8625d3e-cf1f-4ce5-8984-579329034220	\N	2026-07-03 05:12:04.650816+00
ea5a51ea-a8f4-4871-82ee-0e0a4f93eb5e	317886a5-7737-47a3-99d2-dbda3a4c8a82	masuk	1	0	1	Stok awal	\N	\N	2026-07-03 07:02:15.753151+00
a2fb25b0-c1d0-467c-bb83-5d6b18db2b35	5ceaacb6-d7b5-4216-ac40-c4d8b3e9aa3c	masuk	1	0	1	Stok awal	\N	\N	2026-07-03 07:08:16.144862+00
a58686ef-8776-4a17-9228-cdd455aed999	d0babede-b7cf-4138-bcce-d3d9a4151949	keluar	1	1	0		\N	\N	2026-07-03 07:13:58.755234+00
72c2972e-b334-4ff5-a174-256840140372	21bfd29f-0436-43d0-b450-172eafe6b43f	masuk	1	0	1	Stok awal	\N	\N	2026-07-03 07:18:16.111083+00
01fa2b3e-3420-41e8-933b-e3d3738d1600	2311893b-3b1f-4f2c-9521-c587e5dd59a1	keluar	1	1	0		\N	\N	2026-07-03 07:24:07.263878+00
be4f692e-c6c6-4a77-b4f1-0d82c558a7ca	18a74238-b7a5-4b74-9799-12bc3d730803	keluar	1	1	0		\N	\N	2026-07-03 08:09:28.159282+00
3f68b9c6-5902-4c8e-8b28-f790c079cdf7	41c51212-5ca0-4974-af37-b0e85a234dfc	keluar	1	2	1		\N	\N	2026-07-03 08:18:13.109273+00
c6922433-d022-4608-b70f-9a229e46b124	3ef11dd2-24f7-4df5-b57e-a27fbe7a39a3	keluar	2	2	0		\N	\N	2026-07-03 09:01:12.256213+00
bd907c93-6df7-4bf5-8930-b09b98fa3838	5bd7fbef-47a9-4866-a94e-cd260bb872ab	masuk	1	0	1	Stok awal	\N	\N	2026-07-03 11:10:18.175721+00
68828422-b836-4247-bac2-572eabc70220	781796a5-862f-4fc5-bc92-b5c7eba0c495	masuk	1	0	1	Stok awal	\N	\N	2026-07-03 11:10:53.244689+00
ceb167f0-8419-4dd9-b286-5d50b4137272	711d3ead-4764-4c86-a639-00f374e01d26	masuk	1	0	1	Stok awal	\N	\N	2026-07-03 11:11:11.737662+00
96b68401-42cf-489e-91d3-56858a4e5838	c731b160-33f3-4909-89f0-57b692bbcdfa	masuk	1	0	1	Stok awal	\N	\N	2026-07-03 11:11:49.038955+00
d2caa532-2a12-42a3-a5b4-6a358e01ac94	da5e3449-60e0-4595-8f85-0a06ad00221e	masuk	1	0	1	Stok awal	\N	\N	2026-07-03 12:55:47.258942+00
108c8f7b-228c-4ecc-a4fe-0ca6cbb24f09	da5e3449-60e0-4595-8f85-0a06ad00221e	keluar	1	1	0	Penjualan INV-20260703-0044	7e2844da-9037-4cbb-83b8-7f2cc41b66f4	\N	2026-07-03 13:04:55.833946+00
a4c03d7c-35e8-437a-b7f5-dfed9217795e	0e779dd7-facf-4857-ad0f-3ea4b2411f5e	keluar	1	1	0	Penjualan INV-20260703-0045	e200df92-5876-4bb2-96cf-7f1e944cc134	\N	2026-07-03 13:12:52.83232+00
8c7761aa-25ae-4b19-8ed2-2cede0a49c2e	3b3e5b0f-e4e5-4576-a461-731e5daadd46	keluar	1	2	1	Penjualan INV-20260703-0046	c6cf85db-32e7-4e3d-9339-3a07e7e4a15f	\N	2026-07-03 13:14:41.988436+00
7d3feca7-61c3-4790-bbf1-e8c6bcc63150	88bda3a2-a6e2-406e-907a-ec7f0fdf11d4	keluar	1	4	3	Penjualan INV-20260703-0047	7d17b14b-e2b5-4d17-bf50-31aae6977812	\N	2026-07-03 13:18:10.09546+00
8ad1fd0a-04b2-4b65-91ec-c833baad248f	6d8b5b5f-bf75-4f21-b375-a28a6a502099	keluar	2	1	-1		\N	\N	2026-07-04 03:15:47.134095+00
9810e85a-110e-4566-8b28-062b5c76f28b	6d8b5b5f-bf75-4f21-b375-a28a6a502099	masuk	3	-1	2		\N	\N	2026-07-04 03:17:04.498603+00
447a6504-0241-4c20-a7d1-a5f79a06dd15	e6fb0a21-4d92-4640-a7ad-2c1da6738f37	keluar	1	1	0	Penjualan INV-20260704-0048	69f11956-9f1f-4618-89b6-44ddba45fca8	\N	2026-07-04 07:37:24.11846+00
2c7694c8-93f1-478a-9dca-d636d94c2032	6d8b5b5f-bf75-4f21-b375-a28a6a502099	keluar	1	2	1	Penjualan INV-20260704-0049	45549a4f-0075-43d1-8772-fef88ba1d0d4	\N	2026-07-04 07:41:17.724001+00
c078cd16-f2e1-43d7-8f1d-62e7c6b69edb	34fefb75-a56c-499a-8b52-fc69a7887b3a	keluar	1	1	0	Penjualan INV-20260704-0050	1df5098b-8cf4-4dd4-bfaa-b9354f0f956f	\N	2026-07-04 12:52:15.643625+00
0d42d850-d3a8-4180-8cb8-d0452380cced	88bda3a2-a6e2-406e-907a-ec7f0fdf11d4	masuk	1	3	4	Pembatalan penjualan INV-20260703-0047	7d17b14b-e2b5-4d17-bf50-31aae6977812	64dc3274-0701-416c-bee5-1c6f831ecf5f	2026-07-05 02:03:12.367988+00
22f90377-e3fe-498d-9457-b4613847588a	e6fb0a21-4d92-4640-a7ad-2c1da6738f37	masuk	1	0	1		\N	\N	2026-07-05 02:17:19.376724+00
33f1fe74-7aaf-43cb-bf74-3700431db338	88bda3a2-a6e2-406e-907a-ec7f0fdf11d4	koreksi	2	4	2		\N	\N	2026-07-05 02:34:02.628285+00
c2dd162a-3ba9-4dd1-86a3-17ca3c2a264e	36c68a39-6ad6-459f-b133-8bbd12db0343	koreksi	1	6	7		\N	\N	2026-07-05 02:34:42.054485+00
d115f253-f131-4ceb-b032-492a196fc0f0	478f4d15-3bcb-4bf0-b6dd-34a9a519277e	koreksi	3	6	3		\N	\N	2026-07-05 02:35:00.79675+00
8b14cb9c-57b1-4e31-99be-4b11fb25afe7	439244eb-9d02-4ade-9530-c0d5a23ba2e5	koreksi	2	6	4		\N	\N	2026-07-05 02:35:16.229978+00
8dbebe3f-73ef-48bf-a229-7e067f9348f7	d09fe919-25fa-4c6a-98ab-e372d4c9cd58	koreksi	4	10	6		\N	\N	2026-07-05 02:35:55.639864+00
8528533c-9ce7-404f-98d3-1b9c762a3a6f	3fc3e296-6d08-4012-9d73-cdf6ddce42ff	koreksi	2	3	5		\N	\N	2026-07-05 02:39:14.012093+00
6c81e373-f58b-4a07-8935-f038b7780869	c731b160-33f3-4909-89f0-57b692bbcdfa	keluar	1	1	0	Penjualan INV-20260705-0051	4e0e7ab3-2454-474d-bf69-cc28f0f28996	\N	2026-07-05 02:40:35.170288+00
34a4af85-19bf-4ec2-ab2b-a1dd7b6adebf	88bda3a2-a6e2-406e-907a-ec7f0fdf11d4	keluar	1	4	3	Penjualan INV-20260705-0051	4e0e7ab3-2454-474d-bf69-cc28f0f28996	\N	2026-07-05 02:40:35.835603+00
865046e8-ec3d-48e2-89cc-330be8f5d87f	7c550656-5584-43b4-8fb9-a60e4264bf49	koreksi	1	0	1		\N	\N	2026-07-05 02:44:40.203476+00
4f294b07-590b-4522-b5c5-4f6d6852ea70	dfb5eeaa-9977-475d-bc30-33806efc81bd	masuk	1	0	1	Stok awal	\N	\N	2026-07-05 02:47:15.949823+00
76d256ae-9d22-41c5-bf52-7029a7c63a5b	023e06fb-e740-4a7c-be34-85d1a0e1c625	keluar	1	1	0	Penjualan INV-20260705-0052	b2a87156-5268-4901-a21c-a713b4f91821	\N	2026-07-05 02:51:24.203596+00
ae739802-3b12-4c64-9971-d819830a89fb	7d75df80-5c8c-41d6-bb11-5e9496b12bbe	masuk	1	0	1	Stok awal	\N	\N	2026-07-05 02:54:49.103963+00
50704e89-f796-4363-9978-dc1ae93bc91a	4c884ee4-b3f7-4018-a37f-094ae6a5d299	masuk	1	0	1	Stok awal	\N	\N	2026-07-05 02:57:40.601678+00
80b0e3e7-3641-414b-9fe0-efb7c73db073	71e0e32a-a563-447d-ad19-1a6ba0747954	masuk	1	0	1	Stok awal	\N	\N	2026-07-05 02:59:33.150096+00
b4fc757a-cbe5-4b47-94b6-92cf0ad2d5dc	dfb5eeaa-9977-475d-bc30-33806efc81bd	keluar	1	1	0	Penjualan INV-20260705-0053	0b24453b-6a12-404f-8341-b6d091bb985c	\N	2026-07-05 03:00:26.904109+00
632ebbdd-7b4e-4399-bd2a-16d8a8cd55b8	c8bfd892-0983-425d-a55b-e07cd233bb00	masuk	1	0	1	Stok awal	\N	\N	2026-07-05 03:01:20.456661+00
81a1ce4c-e25f-4497-8a30-70c146c29b57	c12db099-d6f7-4c08-a330-c24a493bae24	masuk	1	0	1	Stok awal	\N	\N	2026-07-05 03:04:51.815544+00
2cce89ec-b687-43fb-b73f-f70c96ce7db9	51368464-da6f-4c27-8a9e-b4af03eda252	masuk	1	0	1	Stok awal	\N	\N	2026-07-05 03:09:33.361679+00
14fc2099-e25a-40d1-847c-8598b98543a4	0d8d9824-6586-4b48-a3e3-88369cf3ba40	koreksi	1	0	1		\N	\N	2026-07-05 09:32:08.854888+00
ce3f9ab6-531c-4939-b816-3ba0c334f0af	7c550656-5584-43b4-8fb9-a60e4264bf49	keluar	1	1	0	Penjualan INV-20260705-0054	e07971a5-6a8a-4f74-a8ff-76c56bc67324	\N	2026-07-05 09:35:45.839169+00
fd0a463b-12e1-4d38-83ef-9ce205922cce	0d8d9824-6586-4b48-a3e3-88369cf3ba40	keluar	1	1	0	Penjualan INV-20260705-0054	e07971a5-6a8a-4f74-a8ff-76c56bc67324	\N	2026-07-05 09:35:46.254777+00
cf79a15f-df72-4ec9-aebb-88be0fd403e3	8264ad7a-2b65-45d3-a43b-3984ac3fbfeb	keluar	1	1	0	Penjualan INV-20260705-0055	ee983ed9-9a79-4d1c-964d-ff895913bf18	\N	2026-07-05 09:38:01.520753+00
addaef17-09fd-4a92-9463-965dc23fa096	34fefb75-a56c-499a-8b52-fc69a7887b3a	masuk	1	0	1		\N	\N	2026-07-06 04:26:12.666738+00
bd15d2c7-8fb5-4d6d-be5a-61d7d0d38ed5	e5ad4024-fd0c-4b67-bf61-65b3dc509955	masuk	1	0	1	Penerimaan PO PO-20260706-0001	\N	4f192b7f-a33a-4c6e-8857-5649a7665412	2026-07-06 05:01:14.727694+00
e312c6a0-59e6-430d-a7be-6bf2f55d15d4	e5ad4024-fd0c-4b67-bf61-65b3dc509955	masuk	1	1	2	Penerimaan PO PO-20260706-0002	\N	4f192b7f-a33a-4c6e-8857-5649a7665412	2026-07-06 05:06:57.593832+00
4ddaf3d3-944d-4f5c-9dad-c00aa48d120a	e5ad4024-fd0c-4b67-bf61-65b3dc509955	koreksi	1	2	1		\N	\N	2026-07-06 05:09:13.136965+00
ada4fe57-109b-4de7-a930-896e742da8a7	4bbec497-db20-4b22-99d6-4be071217f6c	masuk	1	0	1	Penerimaan PO PO-20260706-0001	\N	64dc3274-0701-416c-bee5-1c6f831ecf5f	2026-07-06 06:25:19.294135+00
c5a77b0a-6f92-4150-a369-af0e0f6be595	2dfe11b6-0b4f-44bf-a6af-9e955061c635	masuk	1	0	1		\N	\N	2026-07-07 01:12:40.501005+00
726b71b0-296d-4327-bcf0-f6f93bf7988d	4cc2ff8c-67cd-4db3-9555-838788360a18	masuk	1	0	1		\N	\N	2026-07-07 01:20:41.383714+00
8cbc80b1-a64c-43d1-bb89-74ee78a633cd	4cc2ff8c-67cd-4db3-9555-838788360a18	masuk	1	1	2		\N	\N	2026-07-07 01:22:01.210794+00
bda6b5b8-42fa-4c65-b6ba-f7864b3697d8	4cc2ff8c-67cd-4db3-9555-838788360a18	keluar	1	2	1		\N	\N	2026-07-07 01:22:13.769836+00
c5892b93-fa5c-4fb5-b9c1-14efae2b480a	2dfe11b6-0b4f-44bf-a6af-9e955061c635	keluar	1	1	0	Penjualan INV-20260707-0056	cc4e43f5-aaae-40a7-99b3-4e32ee88286b	\N	2026-07-07 01:23:18.216988+00
b27c5621-5e28-40b6-955b-b3d0ada4a0f1	4cc2ff8c-67cd-4db3-9555-838788360a18	keluar	1	1	0	Penjualan INV-20260707-0057	41f7ca97-334a-498a-a729-6f478fa5d249	\N	2026-07-07 01:24:02.900923+00
be24ab3d-0f98-4822-b7bb-3c1f5a52349a	2dfe11b6-0b4f-44bf-a6af-9e955061c635	masuk	1	0	1	Pembatalan penjualan INV-20260707-0056	cc4e43f5-aaae-40a7-99b3-4e32ee88286b	64dc3274-0701-416c-bee5-1c6f831ecf5f	2026-07-07 04:19:51.303319+00
7dc2da89-5d7c-46ef-a4ce-dad9939682d1	2dfe11b6-0b4f-44bf-a6af-9e955061c635	keluar	1	1	0	Penjualan INV-20260707-0058	dd9f3c81-324e-4730-a3ce-447a5b0a101f	\N	2026-07-07 04:23:27.215107+00
216c8d2e-9468-4116-b2b8-1df25d59975e	4bbec497-db20-4b22-99d6-4be071217f6c	keluar	1	1	0	Penjualan INV-20260707-0059	a8a5cd23-76bf-4c91-a4eb-e30d39221331	\N	2026-07-07 05:27:31.904634+00
2a72dd11-ba90-4611-bad4-195478fd7d86	4bbec497-db20-4b22-99d6-4be071217f6c	masuk	1	0	1	Pembatalan penjualan	\N	\N	2026-07-07 05:35:54.014538+00
1ac4f647-5988-4154-887f-f0acbd525454	5b5fadbb-46c1-4d51-ad7a-99a83bd5b9f8	masuk	1	0	1	Stok awal	\N	\N	2026-07-07 07:47:15.437163+00
50a8af81-ac04-425f-adca-7cbcddb98016	5b5fadbb-46c1-4d51-ad7a-99a83bd5b9f8	keluar	1	1	0	Penjualan INV-20260707-0060	ad7dab05-1db9-480b-9c9d-eab151f8f444	\N	2026-07-07 07:48:29.77812+00
f8e84dfb-3baa-4de3-b18b-e555b3fdeda0	7e4acc65-d363-4335-85df-0647f967fae8	masuk	1	0	1	Stok awal	\N	\N	2026-07-07 09:33:33.760153+00
39df1ac2-526d-4b50-b60f-82a66a395b11	4d88d4c9-b8ec-4583-af04-9d45f97053fb	masuk	1	0	1	Stok awal	\N	\N	2026-07-07 09:34:25.970801+00
39d1905d-719b-4403-b8d5-676cded102bb	317886a5-7737-47a3-99d2-dbda3a4c8a82	keluar	1	1	0	Penjualan INV-20260707-0061	ddd28a81-2837-4bae-a431-b639d4c768a2	\N	2026-07-07 09:44:03.546909+00
d78ea051-656b-4f32-9396-a0b07fb481b6	4bbec497-db20-4b22-99d6-4be071217f6c	keluar	1	1	0		\N	\N	2026-07-08 06:27:42.378193+00
6ff365de-0b1d-4301-a134-dc79bcdb32f9	e6fb0a21-4d92-4640-a7ad-2c1da6738f37	keluar	1	1	0	Penjualan INV-20260708-0062	4bf61dc3-93a7-4f2b-b3c2-2c1780567c68	\N	2026-07-08 08:47:32.402032+00
e7c82afe-ebc6-49ec-b1bb-79d5c29cb5dd	5b5fadbb-46c1-4d51-ad7a-99a83bd5b9f8	masuk	1	0	1	Pembatalan penjualan	\N	\N	2026-07-08 09:05:34.24344+00
c7400c1b-8ab8-4889-bdd3-dd57124a6600	3b3e5b0f-e4e5-4576-a461-731e5daadd46	masuk	1	1	2	Pembatalan penjualan	\N	\N	2026-07-08 09:06:54.949711+00
cb3891bf-7af0-493b-b9fd-6ccd46d88054	5b5fadbb-46c1-4d51-ad7a-99a83bd5b9f8	keluar	1	1	0	Penjualan INV-20260708-0063	78f0d5ea-91d0-4ff9-a4f1-f2b799e226e6	\N	2026-07-08 10:38:06.631377+00
977d00a8-53cf-416e-a56b-c6e7c38fb721	fda626aa-9d8f-44f5-b8ed-ea34672a4012	masuk	1	0	1	Penerimaan PO PO-20260706-0001	\N	82604f2e-aaa5-4990-a325-2e9966902e03	2026-07-08 12:30:25.393684+00
41a84e16-9c9c-454e-b61e-ddb7455a5898	5386430d-38a3-47de-8467-aa2fa1ace678	keluar	1	1	0	Penjualan INV-20260709-0064	ad00589c-49e7-4c2b-a74a-8341f59e4e82	\N	2026-07-09 01:41:13.630034+00
e1dcce9e-9b32-41d1-81e7-3c7359ae49f1	3fc3e296-6d08-4012-9d73-cdf6ddce42ff	keluar	1	5	4	Penjualan INV-20260709-0065	6a6ee084-5a30-4830-be83-709bb2ddb06e	\N	2026-07-09 09:10:20.602495+00
5ee1c907-6e81-4d52-ade1-da1260e5cdaa	7b92628a-4f55-4d38-90da-ebdc074264da	keluar	1	1	0	Penjualan INV-20260710-0066	a7869a6c-9b0e-404c-87ad-e6f17f58e30f	\N	2026-07-10 02:04:17.487427+00
add22247-67b7-4c24-9ba7-ba9e2f1eded3	88bda3a2-a6e2-406e-907a-ec7f0fdf11d4	keluar	1	3	2	Penjualan INV-20260710-0066	a7869a6c-9b0e-404c-87ad-e6f17f58e30f	\N	2026-07-10 02:04:17.617616+00
9253b3fd-582e-4a63-8b34-b73437c40eb8	6822128e-261a-4e88-8f42-aecfaea19a72	masuk	1	0	1	Penerimaan PO PO-20260707-0001	\N	82604f2e-aaa5-4990-a325-2e9966902e03	2026-07-10 03:37:59.994164+00
7302c4fb-b4ed-4d81-bd74-e74370b0dc4b	33675935-9993-404c-842e-3cc836eefc01	masuk	1	0	1	Penerimaan PO PO-20260707-0024	\N	82604f2e-aaa5-4990-a325-2e9966902e03	2026-07-10 03:48:34.426621+00
3c86d7a5-7598-4d12-b465-07e7acb6b799	8d75d5dc-8b50-4b99-8004-8eea2c358271	masuk	1	0	1	Penerimaan PO PO-20260707-0044	\N	82604f2e-aaa5-4990-a325-2e9966902e03	2026-07-10 03:56:21.464504+00
688c89cb-9fdd-4bee-8b11-f192e772a912	986f79f7-702e-457d-a092-2e433c6c9be6	masuk	1	0	1	Penerimaan PO PO-20260707-0006	\N	82604f2e-aaa5-4990-a325-2e9966902e03	2026-07-10 03:59:06.397804+00
a95c2949-0856-4a52-99d2-702013e45816	6822128e-261a-4e88-8f42-aecfaea19a72	keluar	1	1	0	Penjualan INV-20260710-0067	62298a25-df7a-47c6-8cc8-7570396c4b32	\N	2026-07-10 09:25:56.295583+00
43e2c63e-d12b-493a-9c26-175512d8d935	52ec033d-7958-4bc4-bec9-020114328e80	keluar	1	1	0	Penjualan INV-20260711-0068	2d082807-2704-442a-a2ab-963355c9e593	\N	2026-07-11 01:55:52.854114+00
be027f86-c02a-4995-9558-018179e9a3a2	33675935-9993-404c-842e-3cc836eefc01	keluar	1	1	0	Penjualan INV-20260711-0069	93bedef9-467f-4cf0-b6cd-02fbfc5a3e1c	\N	2026-07-11 01:58:51.877173+00
4a3ef6d0-d775-49f3-a620-c66f66cfb07e	c96a6773-ac4c-431f-a4aa-f86cabe7ba55	masuk	1	0	1	Penerimaan PO PO-20260707-0022	\N	82604f2e-aaa5-4990-a325-2e9966902e03	2026-07-11 02:01:26.994724+00
bd17004d-dcf6-4229-852c-b4eec2b53cf4	bd306e99-ffe2-4034-947a-ee59be8efb69	masuk	1	0	1	Penerimaan PO PO-20260707-0021	\N	82604f2e-aaa5-4990-a325-2e9966902e03	2026-07-11 02:01:33.538047+00
c592b85c-f401-4c4d-8cf4-39172fa906ce	b5837887-d08a-41f4-8920-af2e6b89cf71	masuk	1	0	1	Penerimaan PO PO-20260707-0032	\N	82604f2e-aaa5-4990-a325-2e9966902e03	2026-07-11 02:02:26.519646+00
72ac6dd0-c2aa-42c7-8bd4-b8c8a997f800	155dfc98-a1bb-46a8-abfe-5fcad54bc6b8	masuk	1	0	1	Penerimaan PO PO-20260707-0034	\N	82604f2e-aaa5-4990-a325-2e9966902e03	2026-07-11 02:02:42.105902+00
70aa92db-4dd8-4a42-bf60-4a858bd77e1d	1ab176c0-fec1-4f0f-9d5f-e903410b713b	masuk	1	0	1	Penerimaan PO PO-20260707-0013	\N	82604f2e-aaa5-4990-a325-2e9966902e03	2026-07-11 02:03:56.435312+00
742b9063-2ccc-4e7c-9a46-a3a2c6c9dd58	eaffd37e-6587-42b9-8f84-2e2e453b54c1	masuk	1	0	1	Penerimaan PO PO-20260707-0040	\N	82604f2e-aaa5-4990-a325-2e9966902e03	2026-07-11 02:04:24.785541+00
4097a0df-953b-4108-8d1f-20917c5eb324	a67d3788-c33e-4c00-b29c-b4d1706a8d23	masuk	1	0	1	Penerimaan PO PO-20260707-0041	\N	82604f2e-aaa5-4990-a325-2e9966902e03	2026-07-11 02:04:40.693928+00
d9a58db4-ab18-4ad6-916b-01fbcc7b8bfe	e6fb0a21-4d92-4640-a7ad-2c1da6738f37	masuk	1	0	1	Penerimaan PO PO-20260711-0001	\N	82604f2e-aaa5-4990-a325-2e9966902e03	2026-07-11 02:48:33.885114+00
cf99a141-8f16-4fa1-b291-ebb728246ec0	9b3049bf-0763-4f61-aaf3-9c13380a2c97	masuk	1	0	1	Penerimaan PO PO-20260707-0039	\N	82604f2e-aaa5-4990-a325-2e9966902e03	2026-07-11 04:01:25.247577+00
d141b038-6f66-4fec-8721-382e8b845adf	965777c5-eeda-4a18-9e21-3f9315c28441	masuk	1	0	1	Penerimaan PO PO-20260707-0012	\N	82604f2e-aaa5-4990-a325-2e9966902e03	2026-07-11 04:05:07.680902+00
c4f59e32-2c9f-48b2-b95c-db0fbd9ee1c5	e830c89c-2982-4f22-9fd9-49740fe9d219	masuk	1	0	1	Penerimaan PO PO-20260707-0020	\N	82604f2e-aaa5-4990-a325-2e9966902e03	2026-07-11 04:05:09.963615+00
4adf5684-d96d-4b6a-b1e4-c9c7b39cfcc3	a67d3788-c33e-4c00-b29c-b4d1706a8d23	keluar	1	1	0	Penjualan INV-20260711-0070	40349857-4a5c-444b-b6b5-b543672e341d	\N	2026-07-11 05:17:54.449488+00
1d6ba89b-cf24-4aae-8fb5-2e8461e26314	eaffd37e-6587-42b9-8f84-2e2e453b54c1	keluar	1	1	0	Penjualan INV-20260711-0070	40349857-4a5c-444b-b6b5-b543672e341d	\N	2026-07-11 05:17:54.610326+00
20c9ff2d-8639-4f9f-b67b-1e61991116f2	e6b63f52-d76c-477a-a20c-c2d341785a43	masuk	1	0	1	Penerimaan PO PO-20260707-0055	\N	82604f2e-aaa5-4990-a325-2e9966902e03	2026-07-11 05:21:16.666378+00
2fb7613b-5186-4045-8620-626a79aaf14d	b5837887-d08a-41f4-8920-af2e6b89cf71	keluar	1	1	0	Penjualan INV-20260711-0071	c1f316de-4fcc-4ae3-acf9-f1a81f839b55	\N	2026-07-11 06:07:03.505577+00
cba7d04e-7360-4eb3-804e-808215fd98be	023e06fb-e740-4a7c-be34-85d1a0e1c625	masuk	1	0	1	Penerimaan PO PO-20260707-0056	\N	82604f2e-aaa5-4990-a325-2e9966902e03	2026-07-11 11:29:37.205398+00
0d285601-aa43-48c2-8d21-d2abd904bdf2	564b2832-7476-4972-afee-6dd5c63e4446	masuk	1	0	1		\N	\N	2026-07-11 13:53:03.811993+00
d5a1f3fc-42a7-4fb3-8f5b-98bcf1f098dd	564b2832-7476-4972-afee-6dd5c63e4446	keluar	1	1	0	Penjualan INV-20260711-0072	6eb90ac9-2cc2-4542-8f0e-bba3f7c321a5	\N	2026-07-11 13:56:35.854232+00
6c140505-a069-4dad-b796-14c8ff53c4b8	c7baf1c1-accc-4456-a8b5-da6a31df5d5b	masuk	1	0	1	Stok awal	\N	\N	2026-07-11 14:09:42.495241+00
0ac3c2fd-5756-4009-a09e-3cbee1846b46	c7baf1c1-accc-4456-a8b5-da6a31df5d5b	keluar	1	1	0	Penjualan INV-20260711-0073	4057ece0-8242-40b0-bd76-2579d6d9ace6	\N	2026-07-11 14:26:45.834705+00
d8c43fe1-62b9-4855-8aff-26de26a6d225	41c51212-5ca0-4974-af37-b0e85a234dfc	keluar	1	1	0	Penjualan INV-20260711-0073	4057ece0-8242-40b0-bd76-2579d6d9ace6	\N	2026-07-11 14:26:46.112937+00
cc4dcf36-2e86-4653-ab0c-1064670102d3	c9cfdccf-96c7-442a-a0f2-ac5e7eb2e95f	masuk	1	0	1	Stok awal	\N	\N	2026-07-11 14:28:05.806692+00
99ee7bdd-dfee-413a-a2cc-9656100c6979	bd306e99-ffe2-4034-947a-ee59be8efb69	keluar	1	1	0	Penjualan INV-20260711-0074	1bc96b57-5481-4d0b-82ab-049694881d0c	\N	2026-07-11 14:36:21.228709+00
2f2a957b-a3f3-4234-9504-e3fdfca179f0	c9cfdccf-96c7-442a-a0f2-ac5e7eb2e95f	keluar	1	1	0	Penjualan INV-20260711-0074	1bc96b57-5481-4d0b-82ab-049694881d0c	\N	2026-07-11 14:36:21.875141+00
1cbcac2a-7f55-4137-9ab0-d3197426d60d	023e06fb-e740-4a7c-be34-85d1a0e1c625	keluar	1	1	0	Penjualan INV-20260711-0075	c6d4f560-03a0-43b7-80f2-9998439e57c1	\N	2026-07-11 14:43:58.546737+00
23de1a40-8533-4ff8-9faf-f82f82672c62	83526983-ae26-4d28-9da9-d1c45960f855	masuk	1	0	1	Stok awal	\N	\N	2026-07-11 14:47:11.857164+00
52fe6f92-0393-48ec-9e90-409fe833cf78	83526983-ae26-4d28-9da9-d1c45960f855	keluar	1	1	0	Penjualan INV-20260711-0076	f6320716-1003-4f43-9edb-02dc7c71b61f	\N	2026-07-11 15:18:16.754065+00
241e6ca0-1c6b-44f6-827f-c420fe688f0e	293d149e-c109-4c69-9e95-3a45f7630df7	keluar	1	3	2	Penjualan INV-20260711-0076	f6320716-1003-4f43-9edb-02dc7c71b61f	\N	2026-07-11 15:18:17.083228+00
796e2661-d1da-4ba0-a6ab-241fb4bcdc35	bd306e99-ffe2-4034-947a-ee59be8efb69	masuk	1	0	1	Pembatalan penjualan	\N	\N	2026-07-11 15:25:41.019554+00
4e7ac099-5f41-44b5-97df-dacb346a61eb	c9cfdccf-96c7-442a-a0f2-ac5e7eb2e95f	masuk	1	0	1	Pembatalan penjualan	\N	\N	2026-07-11 15:25:42.38459+00
c09265be-978b-4efb-a205-45f4254782a8	16a59e17-cc58-42f9-91b0-ffc6cc16bec4	masuk	1	0	1	Penerimaan PO PO-20260707-0029	\N	4f192b7f-a33a-4c6e-8857-5649a7665412	2026-07-12 03:12:35.579628+00
2fcbe487-4617-408a-a755-803872edcf31	dfde7bc2-cadc-49fc-b559-751fc3e0e5e4	keluar	1	1	0	Penjualan INV-20260712-0077	b5042b42-35a6-4571-9c5f-154e361dab2a	\N	2026-07-12 03:29:52.884078+00
8c7a213c-ec67-49d1-8f07-796c8109b674	2db4df0a-1520-4053-8238-2c8dad1699f0	masuk	4	0	4	Stok awal	\N	\N	2026-07-12 03:50:16.065762+00
d44e84d7-4780-4c91-993e-11a4b32b301a	c96a6773-ac4c-431f-a4aa-f86cabe7ba55	keluar	1	1	0	Penjualan INV-20260712-0078	c32a696d-08bc-428e-a7f6-dae05c47367a	\N	2026-07-12 06:04:29.84217+00
f13f7b06-58e1-4a3f-bf24-7b086c670185	bd306e99-ffe2-4034-947a-ee59be8efb69	keluar	1	1	0	Penjualan INV-20260712-0078	c32a696d-08bc-428e-a7f6-dae05c47367a	\N	2026-07-12 06:04:29.997294+00
eeaf90f6-f092-4fa4-9fc9-2424310bfae5	2db4df0a-1520-4053-8238-2c8dad1699f0	keluar	2	4	2	Penjualan INV-20260712-0079	93b3c33e-2b78-4419-8a87-f4ded55aceb7	\N	2026-07-12 08:50:32.491894+00
4b0da08a-95f3-46f5-8787-c46882933bf2	478f4d15-3bcb-4bf0-b6dd-34a9a519277e	keluar	1	3	2	Penjualan INV-20260713-0080	a9a2846a-a5dc-4da5-ba63-1bbc979affc4	\N	2026-07-13 03:30:04.445604+00
5006cb04-7f47-446b-a1e1-32de798652df	f9e4976e-8894-4e8e-a0cb-a5be21ed2f63	keluar	1	1	0	Penjualan INV-20260713-0081	3132178e-478b-423f-931b-663978e078ff	\N	2026-07-13 03:32:59.811719+00
423cdad6-737f-4ced-aea6-b7b6316c53b8	5bd7fbef-47a9-4866-a94e-cd260bb872ab	keluar	1	1	0	Penjualan INV-20260713-0082	26dee3f0-359b-4087-87ef-7fc2ac3f9259	\N	2026-07-13 03:41:23.804641+00
554d58bf-7ba6-4e2b-ba46-9a78874aa19b	9b3049bf-0763-4f61-aaf3-9c13380a2c97	keluar	1	1	0	Penjualan INV-20260713-0083	fcec19b5-d203-45dd-abcf-60ee458f6624	\N	2026-07-13 03:48:11.689344+00
267b8269-b1c0-447a-b64c-1b5fd31716dc	22217fc3-5a69-4f3b-a200-b17046d70311	masuk	2	1	3		\N	\N	2026-07-13 08:35:39.247952+00
d7c46011-6fbd-49ec-b43f-2f6d06866eba	22217fc3-5a69-4f3b-a200-b17046d70311	keluar	1	3	2		\N	\N	2026-07-13 08:35:47.877795+00
bb41ef53-ce71-43e5-80c7-5b8a1cc9fdf5	3b3e5b0f-e4e5-4576-a461-731e5daadd46	masuk	1	2	3		\N	\N	2026-07-13 08:35:59.216927+00
2eecf41d-6da8-43bb-9a17-e14c03f8a325	3b3e5b0f-e4e5-4576-a461-731e5daadd46	keluar	2	3	1		\N	\N	2026-07-13 08:36:04.969507+00
418daf31-32c6-4940-9b5b-9ce680506332	22217fc3-5a69-4f3b-a200-b17046d70311	keluar	1	2	1	Penjualan INV-20260713-0084	70c0c8d3-7fbd-4523-9c4f-337e21e2abff	\N	2026-07-13 08:38:02.954397+00
18e62a76-50aa-4ff3-bc01-010f6f3c47ea	781796a5-862f-4fc5-bc92-b5c7eba0c495	keluar	1	1	0	Penjualan INV-20260713-0085	e1dd50c5-00d6-4b7c-9d18-0137ba53a4ca	\N	2026-07-13 09:05:01.558409+00
ee6bd0df-3367-465d-9f88-1b7b261d6e65	df191515-db04-4f36-a664-78e4d84852d3	koreksi	1	0	1		\N	\N	2026-07-13 09:05:11.192466+00
023b1c55-0ffb-4bbf-935e-d9c59732f55a	df191515-db04-4f36-a664-78e4d84852d3	keluar	1	1	0	Penjualan INV-20260713-0086	6a664274-b373-499d-a7a8-aaeff93b639f	\N	2026-07-13 09:09:45.583+00
832eefbe-1b0b-4417-9f3d-616d92ebb377	b7675f90-bc8d-4cf4-a47f-4bf900671f33	masuk	1	0	1	Penerimaan PO PO-20260707-0025	\N	82604f2e-aaa5-4990-a325-2e9966902e03	2026-07-14 02:25:40.236136+00
a07eeddb-b392-45f2-b62b-3260d699a053	c8e767db-9844-4393-b8ee-63e034b338ca	masuk	1	0	1	Penerimaan PO PO-20260707-0023	\N	82604f2e-aaa5-4990-a325-2e9966902e03	2026-07-14 02:25:43.04553+00
9ad11bc0-3c2a-4597-ab20-b6bbfaa5074b	27de36ab-ae58-45a7-a6ab-034f3c336da0	masuk	1	0	1	Penerimaan PO PO-20260707-0015	\N	82604f2e-aaa5-4990-a325-2e9966902e03	2026-07-14 02:25:53.218108+00
f64cf6a5-52ce-453f-9fff-7a450d5efbcc	f0fcc68b-9b21-4f5d-8b19-4b3526b9a0c7	masuk	1	0	1	Penerimaan PO PO-20260707-0011	\N	82604f2e-aaa5-4990-a325-2e9966902e03	2026-07-14 02:26:05.867572+00
7dc59061-2b07-4e45-9a2a-3551c6edf048	7e1b90ee-1e5a-426c-bdcd-674aca21f9ea	masuk	1	0	1	Penerimaan PO PO-20260706-0005	\N	82604f2e-aaa5-4990-a325-2e9966902e03	2026-07-14 02:29:26.581851+00
c95d7e83-dbac-40d4-96f6-32726306882d	42a7b3be-04e8-4f9c-a027-2b53605685f5	masuk	1	0	1	Penerimaan PO PO-20260708-0014	\N	82604f2e-aaa5-4990-a325-2e9966902e03	2026-07-14 03:14:28.330727+00
ee9b670b-b826-4504-9ccc-731e9bcf704b	5f144ff7-1856-4bc8-9ae1-2d29e19d3b62	masuk	1	0	1	Penerimaan PO PO-20260707-0047	\N	82604f2e-aaa5-4990-a325-2e9966902e03	2026-07-14 03:14:31.424404+00
8641f8bc-acad-438f-aa05-9a63247e92b3	65e6bf9d-0a1c-4c28-82b2-3191955ad56a	masuk	1	0	1	Penerimaan PO PO-20260707-0036	\N	82604f2e-aaa5-4990-a325-2e9966902e03	2026-07-14 03:14:33.928969+00
109ed470-b44a-4e99-8b65-d4bf7280fdee	b5837887-d08a-41f4-8920-af2e6b89cf71	masuk	1	0	1	Penerimaan PO PO-20260707-0033	\N	82604f2e-aaa5-4990-a325-2e9966902e03	2026-07-14 03:14:36.099361+00
1fbb0858-2509-43c0-bcd6-fefbc3f956a3	268cff99-b57e-43eb-92db-5ee249846524	masuk	1	0	1	Penerimaan PO PO-20260707-0030	\N	82604f2e-aaa5-4990-a325-2e9966902e03	2026-07-14 03:14:40.925362+00
61efe914-ae05-4f55-bd27-4b940dd726cb	5f144ff7-1856-4bc8-9ae1-2d29e19d3b62	koreksi	1	1	0		\N	\N	2026-07-14 03:25:37.210567+00
a3659662-b45e-4f72-88fe-f135fe132c3b	268cff99-b57e-43eb-92db-5ee249846524	koreksi	0	1	1		\N	\N	2026-07-14 03:37:14.516236+00
86a3c4ae-29d7-485d-aaea-eae89cb44e8b	268cff99-b57e-43eb-92db-5ee249846524	koreksi	1	1	0		\N	\N	2026-07-14 03:37:34.446324+00
09dc550c-4897-4adb-b213-59fac6a4f364	155dfc98-a1bb-46a8-abfe-5fcad54bc6b8	keluar	1	1	0	Penjualan INV-20260714-0087	640b4798-032b-4b39-8813-1bda1aae7c19	\N	2026-07-14 03:43:11.565626+00
9f732ef6-6dcf-4393-a698-4577e44e3d6c	b5837887-d08a-41f4-8920-af2e6b89cf71	keluar	1	1	0	Penjualan INV-20260714-0087	640b4798-032b-4b39-8813-1bda1aae7c19	\N	2026-07-14 03:43:11.711916+00
594f4f2f-ba42-4867-97a9-6d77cebdd009	65e6bf9d-0a1c-4c28-82b2-3191955ad56a	koreksi	1	1	2		\N	\N	2026-07-14 03:51:43.929274+00
700010e7-4e6f-4bba-9e51-6f0d5e803092	65e6bf9d-0a1c-4c28-82b2-3191955ad56a	keluar	1	2	1	Penjualan INV-20260714-0088	0be9b805-d16c-4f34-8a3a-07dabb0ee7c9	\N	2026-07-14 03:54:35.569031+00
51f23f25-7043-495c-9059-bc20624830e5	c7baf1c1-accc-4456-a8b5-da6a31df5d5b	masuk	1	0	1	Pembatalan penjualan	\N	\N	2026-07-14 06:00:23.191187+00
9ffd617a-efcd-4d7f-b650-67cd3922b8ea	41c51212-5ca0-4974-af37-b0e85a234dfc	masuk	1	0	1	Pembatalan penjualan	\N	\N	2026-07-14 06:00:23.379183+00
484384fd-b594-41c5-9cbc-e0a66a8fd710	c7baf1c1-accc-4456-a8b5-da6a31df5d5b	keluar	1	1	0	Penjualan INV-20260714-0089	6346f186-a186-4888-a08f-9834032b2f0d	\N	2026-07-14 06:06:48.721765+00
2956d670-7100-4f59-9a59-c66475fd53e4	41c51212-5ca0-4974-af37-b0e85a234dfc	keluar	1	1	0	Penjualan INV-20260714-0089	6346f186-a186-4888-a08f-9834032b2f0d	\N	2026-07-14 06:06:48.869525+00
8313410e-6acc-4dc0-9b76-0e6a771daa18	42a7b3be-04e8-4f9c-a027-2b53605685f5	keluar	1	1	0	Penjualan INV-20260714-0090	3eb6c9be-4ffc-4d0f-9a96-ee4dc1d0630e	\N	2026-07-14 10:07:14.86608+00
3027180d-d2d1-4d17-935b-173744e989d5	4bbec497-db20-4b22-99d6-4be071217f6c	masuk	1	0	1		\N	\N	2026-07-14 12:51:18.45147+00
f03901f5-ef6f-46e7-ad55-5f9c20ad5d34	3b81c90e-a925-48e1-9f4d-494fddd0f5b2	masuk	1	0	1		\N	\N	2026-07-14 12:52:14.324847+00
2c25c58d-68dd-4537-adc4-738296499d07	3b81c90e-a925-48e1-9f4d-494fddd0f5b2	keluar	1	1	0	Penjualan INV-20260714-0091	0a7083a8-130c-4b7e-875c-8d142ea8f416	\N	2026-07-14 12:54:40.275684+00
70f3c70d-a587-4197-8f10-a3a277a3a89d	b7675f90-bc8d-4cf4-a47f-4bf900671f33	keluar	1	1	0	Penjualan INV-20260715-0092	9eb222d2-5125-46cc-aa77-f1fa8d78c44d	\N	2026-07-15 02:12:08.087694+00
66abe9cc-b9f8-43ef-81af-a855ca6e8876	65e6bf9d-0a1c-4c28-82b2-3191955ad56a	masuk	1	1	2	Pembatalan penjualan INV-20260714-0088	0be9b805-d16c-4f34-8a3a-07dabb0ee7c9	82604f2e-aaa5-4990-a325-2e9966902e03	2026-07-15 02:15:28.38735+00
93e08d08-164c-41fd-8e7d-2313ec178dd7	65e6bf9d-0a1c-4c28-82b2-3191955ad56a	keluar	1	2	1	Penjualan INV-20260715-0093	56ba6c7f-ba25-4064-9fb9-803589cb2305	\N	2026-07-15 02:21:23.882426+00
51f69437-25bb-45a5-97d3-ecef2c60cd86	972aa697-a04d-4185-bda5-0cbd95b48754	masuk	1	0	1	Stok awal	\N	\N	2026-07-15 02:29:32.933174+00
44cad243-2024-46f3-bcdc-cf36eac14697	972aa697-a04d-4185-bda5-0cbd95b48754	keluar	1	1	0	Penjualan INV-20260715-0094	7414fdc0-6470-4ed3-808f-6f7c882979c6	\N	2026-07-15 02:32:19.786366+00
1d3400dc-ae71-4952-9491-fb992b773bd0	6a4f6bb3-9c89-46ab-b75c-a27df9ffa2d4	masuk	1	0	1	Penerimaan PO PO-20260709-0003	\N	82604f2e-aaa5-4990-a325-2e9966902e03	2026-07-15 03:07:06.904225+00
ea442c0f-b9bf-4eb2-b1ea-9b2448e1ff9f	ff476b2e-db89-4fbd-96aa-94c3c3546939	masuk	1	0	1	Penerimaan PO PO-20260707-0048	\N	82604f2e-aaa5-4990-a325-2e9966902e03	2026-07-15 03:07:47.983794+00
64a0de6d-3557-4c89-bb83-18ea11b9c546	65e6bf9d-0a1c-4c28-82b2-3191955ad56a	masuk	1	1	2	Penerimaan PO PO-20260706-0002	\N	82604f2e-aaa5-4990-a325-2e9966902e03	2026-07-15 03:09:26.931865+00
55cbbb5e-87c3-4c3c-b7ca-fa8e2a0a0b2f	bec88103-8294-4cd6-b9d3-b83d4f0729eb	masuk	1	0	1	Penerimaan PO PO-20260707-0002	\N	82604f2e-aaa5-4990-a325-2e9966902e03	2026-07-15 03:10:43.343872+00
0ad65d27-075b-4492-b2e9-92c6bcbcd195	e6fb0a21-4d92-4640-a7ad-2c1da6738f37	masuk	1	1	2	Penerimaan PO PO-20260710-0001	\N	64dc3274-0701-416c-bee5-1c6f831ecf5f	2026-07-15 03:36:01.389565+00
d13145d2-6051-4c5c-8f02-644de94c67bc	f0fcc68b-9b21-4f5d-8b19-4b3526b9a0c7	keluar	1	1	0	Penjualan INV-20260715-0095	2e1f47dc-06db-4000-a0b1-92a3bd98a07b	\N	2026-07-15 04:39:38.339472+00
19ff58a5-5f26-4853-b3c2-cd504cf1fa3f	84c27d0f-e8c4-49f9-8dee-4bcf280dcf53	masuk	1	0	1	Stok awal	\N	\N	2026-07-15 04:44:52.407772+00
04415454-0c1f-4225-8715-5c9dc1c3cda5	95c4990d-5994-4468-a8a6-05e89e116524	masuk	1	0	1		\N	\N	2026-07-15 04:48:00.76268+00
1b34fcd5-8d05-44c6-9968-e829877b246b	34fefb75-a56c-499a-8b52-fc69a7887b3a	keluar	1	1	0	Penjualan INV-20260715-0096	aab94dc8-ef63-4069-ae80-c9b5a2a4ce33	\N	2026-07-15 04:51:59.987683+00
25469e1b-a90d-4805-9c03-69d231af765c	95c4990d-5994-4468-a8a6-05e89e116524	keluar	1	1	0	Penjualan INV-20260715-0096	aab94dc8-ef63-4069-ae80-c9b5a2a4ce33	\N	2026-07-15 04:52:00.207071+00
bb03f4c1-369b-4136-8c78-b7af1cd6ed1c	34fefb75-a56c-499a-8b52-fc69a7887b3a	masuk	1	0	1	Pembatalan penjualan	\N	\N	2026-07-15 04:56:13.012927+00
c51fde4e-2403-489b-9443-59c0ff4123ac	95c4990d-5994-4468-a8a6-05e89e116524	masuk	1	0	1	Pembatalan penjualan	\N	\N	2026-07-15 04:56:13.200405+00
f2ed1c51-1a9b-4ea3-8141-9bd34b54a3b4	95c4990d-5994-4468-a8a6-05e89e116524	keluar	1	1	0	Penjualan INV-20260715-0097	b6dc25f4-a7e7-4bcd-a41b-c8f8af1349d5	\N	2026-07-15 05:24:42.46186+00
5691c4e3-9f03-4f30-8208-143c87558f87	95c4990d-5994-4468-a8a6-05e89e116524	masuk	1	0	1	Pembatalan penjualan	\N	\N	2026-07-15 05:25:02.269665+00
e783d4e6-6b4a-4c9d-bdfd-9b42a30cadd8	95c4990d-5994-4468-a8a6-05e89e116524	keluar	1	1	0	Penjualan INV-20260715-0098	1016a67d-35de-4cd5-843c-d38a6b0a36f5	\N	2026-07-15 05:28:35.63734+00
08df4f4c-7edd-49d0-aa88-74e262f48667	1f9a5e3e-f5d2-4348-bc64-39321bce1f14	masuk	1	0	1	Penerimaan PO PO-20260707-0031	\N	82604f2e-aaa5-4990-a325-2e9966902e03	2026-07-15 06:22:33.799017+00
a30d7cd1-9607-49a9-9d2d-642595261a5d	1f9a5e3e-f5d2-4348-bc64-39321bce1f14	keluar	1	1	0	Penjualan INV-20260715-0099	73e3ae74-a28b-4748-b165-a5f4aef93bef	\N	2026-07-15 06:27:47.38691+00
e5b3591a-f2cc-4e5c-a528-2512ed6c13e5	8ae4f3e2-7802-4e39-97f2-aa7cee615352	masuk	1	0	1	Penerimaan PO PO-20260707-0035	\N	82604f2e-aaa5-4990-a325-2e9966902e03	2026-07-16 01:14:01.752171+00
b1bb0d71-15c6-4018-880e-44c1ac091c69	7e67cb99-9efd-4629-860a-950dbf366db9	masuk	1	0	1	Penerimaan PO PO-20260707-0019	\N	82604f2e-aaa5-4990-a325-2e9966902e03	2026-07-16 01:14:27.563896+00
709816f7-b1f1-448b-98cf-be0724ab14e8	95c4990d-5994-4468-a8a6-05e89e116524	masuk	1	0	1	Pembatalan penjualan	\N	\N	2026-07-16 01:21:49.073778+00
319545c0-bb38-4905-8902-29589f83d691	84c27d0f-e8c4-49f9-8dee-4bcf280dcf53	keluar	1	1	0	Penjualan INV-20260716-0100	4aa021a7-a48b-4274-add9-b2fb9f51fa46	\N	2026-07-16 01:23:22.648484+00
98b04086-9038-472a-947c-04f3ab3aeeef	84c27d0f-e8c4-49f9-8dee-4bcf280dcf53	masuk	1	0	1	Pembatalan penjualan	\N	\N	2026-07-16 01:23:55.40984+00
53022bbd-d88f-45d2-938f-482a821ecade	84c27d0f-e8c4-49f9-8dee-4bcf280dcf53	keluar	1	1	0	Penjualan INV-20260716-0101	9496e4f7-efa6-45ac-a00f-094ecb1edf66	\N	2026-07-16 01:24:43.081299+00
3ffdf22d-4f75-4ab8-81f7-0e37a7e5fa1f	84c27d0f-e8c4-49f9-8dee-4bcf280dcf53	masuk	1	0	1	Pembatalan penjualan INV-20260716-0101	9496e4f7-efa6-45ac-a00f-094ecb1edf66	82604f2e-aaa5-4990-a325-2e9966902e03	2026-07-16 01:25:20.089571+00
0f682995-756b-4321-a572-6fb562a07a16	84c27d0f-e8c4-49f9-8dee-4bcf280dcf53	keluar	1	1	0	Penjualan INV-20260716-0102	74a3522e-c330-4a16-b2cc-659cac8c0dae	\N	2026-07-16 01:27:51.837206+00
45848634-b726-42e0-9b45-56a1746522cb	b4077288-a2aa-467f-b68f-b3e778972409	masuk	1	0	1	Stok awal	\N	\N	2026-07-16 01:30:19.148447+00
7a45aaec-7a02-4960-b0ca-0367277f7e69	7a2ce8f9-e0bd-4be8-9476-4cfb916c89ce	masuk	1	0	1	Stok awal	\N	\N	2026-07-16 03:23:13.806439+00
8b08ec4f-2002-4245-bb3c-e5b3f1dda610	7a2ce8f9-e0bd-4be8-9476-4cfb916c89ce	keluar	1	1	0	Penjualan INV-20260716-0103	4d43acf8-453e-48d2-a487-5bca0f71794b	\N	2026-07-16 03:32:46.032139+00
6e0febee-9640-45b2-b21e-06338baf9ac7	f0fcc68b-9b21-4f5d-8b19-4b3526b9a0c7	masuk	1	0	1	Pembatalan penjualan	\N	\N	2026-07-16 05:15:27.802478+00
37bd5b19-f816-430f-bd43-20394e26ecf7	95c4990d-5994-4468-a8a6-05e89e116524	keluar	1	1	0		\N	\N	2026-07-16 05:19:32.035631+00
48b35078-3a24-449b-9302-d32d5a9c5b08	f0fcc68b-9b21-4f5d-8b19-4b3526b9a0c7	keluar	1	1	0		\N	\N	2026-07-16 05:19:43.59388+00
2160939e-06a3-4052-97c8-d446d41fbd00	316e8813-4623-4740-8c9d-8b20f3dcea9c	masuk	1	0	1	Stok awal	\N	\N	2026-07-16 05:21:02.384039+00
853c3bdb-d124-47db-b873-006ce0e96de7	316e8813-4623-4740-8c9d-8b20f3dcea9c	keluar	1	1	0	Penjualan INV-20260716-0104	9d836a7d-c3fa-47e8-8551-ac4c842e8c91	\N	2026-07-16 05:23:37.639391+00
e08e66fa-08b1-4eff-9681-0f6abc3ba965	4bbec497-db20-4b22-99d6-4be071217f6c	keluar	1	1	0	Penjualan INV-20260716-0105	a03d0ea6-adc7-4330-b036-30c349489536	\N	2026-07-16 05:59:35.756681+00
d5ef3eb7-2eeb-4bba-9bfd-b9511d077f64	4bbec497-db20-4b22-99d6-4be071217f6c	masuk	1	0	1	Pembatalan penjualan	\N	\N	2026-07-16 06:12:19.647548+00
58b91280-2999-4dd1-9102-f1475712d9c5	78245a88-fafb-4fdc-bff4-eee6fd7a3061	masuk	2	0	2	Stok awal	\N	\N	2026-07-16 07:14:45.45949+00
a38e15b6-57d4-41e1-9079-aed7d0557bd6	706d5532-5497-4383-95d1-b10517a654c3	masuk	1	0	1	Stok awal	\N	\N	2026-07-16 07:23:57.446523+00
96994743-eb2e-4b7d-92d5-6f61d5478ec4	78245a88-fafb-4fdc-bff4-eee6fd7a3061	keluar	1	2	1	Penjualan INV-20260716-0106	86d6f891-ecde-46c6-b035-7b3ea1f843bc	\N	2026-07-16 07:38:01.03309+00
bd0ddb0e-28bf-4310-9efc-5cc5283f4353	706d5532-5497-4383-95d1-b10517a654c3	keluar	1	1	0	Penjualan INV-20260716-0106	86d6f891-ecde-46c6-b035-7b3ea1f843bc	\N	2026-07-16 07:38:01.219489+00
a773fc72-e3a8-4a3b-b385-0fa449ddd358	78245a88-fafb-4fdc-bff4-eee6fd7a3061	masuk	1	1	2	Pembatalan penjualan	\N	\N	2026-07-16 07:43:19.577393+00
e30b2655-cc95-4823-aea9-c08ccbe15b48	706d5532-5497-4383-95d1-b10517a654c3	masuk	1	0	1	Pembatalan penjualan	\N	\N	2026-07-16 07:43:19.744625+00
906c9000-2637-48be-82c9-e7928ecdcf6f	78245a88-fafb-4fdc-bff4-eee6fd7a3061	keluar	1	2	1	Penjualan INV-20260716-0107	92caf0d3-5e69-4a23-bf83-d7fbe1b33f98	\N	2026-07-16 07:45:24.593814+00
5f1cceed-3d6a-4f77-867b-0207e1f3637a	706d5532-5497-4383-95d1-b10517a654c3	keluar	1	1	0	Penjualan INV-20260716-0107	92caf0d3-5e69-4a23-bf83-d7fbe1b33f98	\N	2026-07-16 07:45:24.77769+00
a0fea7a1-2ce8-45df-86f8-1b699a48d6ee	78245a88-fafb-4fdc-bff4-eee6fd7a3061	masuk	1	1	2	Pembatalan penjualan	\N	\N	2026-07-16 07:45:46.429465+00
93c3b9be-f548-4986-9fb5-ae049a6c2f67	706d5532-5497-4383-95d1-b10517a654c3	masuk	1	0	1	Pembatalan penjualan	\N	\N	2026-07-16 07:45:46.585642+00
ec5a3d5f-1357-45a9-bbb2-34abc5ac7081	78245a88-fafb-4fdc-bff4-eee6fd7a3061	keluar	1	2	1	Penjualan INV-20260716-0108	85e9a72d-7090-427b-af77-82a698898810	\N	2026-07-16 07:47:26.569735+00
1ab9cf8b-062e-4d53-8e0e-9728ef599b2e	706d5532-5497-4383-95d1-b10517a654c3	keluar	1	1	0	Penjualan INV-20260716-0108	85e9a72d-7090-427b-af77-82a698898810	\N	2026-07-16 07:47:26.714093+00
8d9c887e-2ab9-4b77-aa8d-f13fa4f757e4	5f144ff7-1856-4bc8-9ae1-2d29e19d3b62	masuk	1	0	1	Pembatalan penjualan	\N	\N	2026-07-16 07:49:03.514337+00
30966293-f4c1-4cc5-9e3a-48e406c68b72	6e556179-e9ee-42f4-926f-864c61022ae2	masuk	1	0	1	Pembatalan penjualan	\N	\N	2026-07-16 07:49:03.655363+00
2941e24e-0362-4e60-8b97-dd9cd4faa4e1	1ab176c0-fec1-4f0f-9d5f-e903410b713b	keluar	1	1	0	Penjualan INV-20260716-0109	7fe60d15-962f-4d6e-9fa1-5717352a72e6	\N	2026-07-16 10:49:08.672022+00
a533aa40-3afc-44c5-ba91-6b1c1cee9247	78245a88-fafb-4fdc-bff4-eee6fd7a3061	keluar	1	1	0	Penjualan INV-20260716-0109	7fe60d15-962f-4d6e-9fa1-5717352a72e6	\N	2026-07-16 10:49:08.830828+00
97dce38e-ddfc-446f-945b-8998cc13d65f	b4077288-a2aa-467f-b68f-b3e778972409	keluar	1	1	0	Penjualan INV-20260716-0110	b0f764f1-77d8-44ee-b91a-74cd3da82e9f	\N	2026-07-16 10:52:01.067485+00
aadbe28e-8e62-410b-acbe-442b51a7fa8d	965777c5-eeda-4a18-9e21-3f9315c28441	keluar	1	1	0	Penjualan INV-20260716-0111	aa5c53a8-54e0-4628-94a6-0c50a6681163	\N	2026-07-16 11:11:38.789729+00
0e69bbca-4302-4ebf-8864-8cb0296a8175	c4a174a9-30ac-4b95-b0ec-3b599ebc9014	masuk	1	0	1	Penerimaan PO PO-20260712-0003	\N	82604f2e-aaa5-4990-a325-2e9966902e03	2026-07-17 01:50:31.651668+00
48ec174e-b61c-4f9e-9dc2-2ba40536361c	c91cde3c-81b0-4d83-ac7e-0f09a71513d1	masuk	1	0	1	Penerimaan PO PO-20260707-0010	\N	82604f2e-aaa5-4990-a325-2e9966902e03	2026-07-17 01:51:36.303344+00
\.


--
-- Data for Name: owner_reminders; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.owner_reminders (id, tipe, judul, status, due_date, periode, selesai_at, catatan, created_by, created_at) FROM stdin;
806a8633-cc7c-4824-986f-56b3edaa65c2	stock_opname	Stock Opname — siklus 30 hari terlewat	selesai	2026-06-30	\N	2026-06-30 13:50:43.294+00	\N	64dc3274-0701-416c-bee5-1c6f831ecf5f	2026-06-30 09:03:42.79696+00
463d2fdb-200a-4dc1-8a69-fc30d7b6a76a	audit_nota	Audit Nota — siklus 14 hari terlewat	selesai	2026-06-30	\N	2026-06-30 13:51:08.188+00	\N	64dc3274-0701-416c-bee5-1c6f831ecf5f	2026-06-30 09:03:42.7977+00
41d01d00-914d-49b4-861a-7b7e87aa97ea	stock_opname	Stock Opname — siklus 30 hari terlewat	selesai	2026-06-30	\N	2026-06-30 13:50:43.294+00	\N	64dc3274-0701-416c-bee5-1c6f831ecf5f	2026-06-30 09:03:42.93911+00
5fffb228-39f4-4100-ba8b-8909a684e4d1	audit_nota	Audit Nota — siklus 14 hari terlewat	selesai	2026-06-30	\N	2026-06-30 13:51:08.188+00	\N	64dc3274-0701-416c-bee5-1c6f831ecf5f	2026-06-30 09:03:42.939683+00
9d70da7a-1030-453f-bef6-48285ddc6b4f	stock_opname	Stock Opname — siklus 1 hari terlewat	terlewat	2026-07-01	\N	\N	\N	64dc3274-0701-416c-bee5-1c6f831ecf5f	2026-07-01 08:23:16.914239+00
5b0d17af-68ed-47f5-9ed7-fed9d7be6bc9	audit_nota	Audit Nota — siklus 1 hari terlewat	terlewat	2026-07-01	\N	\N	\N	64dc3274-0701-416c-bee5-1c6f831ecf5f	2026-07-01 08:23:16.85902+00
2dc61dcb-b1c6-4de8-91f9-c2625c96ab6b	stock_opname	Stock Opname — siklus 1 hari terlewat	terlewat	2026-07-01	\N	\N	\N	64dc3274-0701-416c-bee5-1c6f831ecf5f	2026-07-01 08:23:16.859075+00
d54bc1b4-c185-4826-8df8-97e4c519f4aa	audit_nota	Audit Nota — siklus 1 hari terlewat	terlewat	2026-07-01	\N	\N	\N	64dc3274-0701-416c-bee5-1c6f831ecf5f	2026-07-01 08:23:16.914208+00
84fecea2-2ff4-4e75-bc3d-94dd661b0cba	catatan_kebijakan	Dilarang merokok	selesai	\N	\N	\N	\N	64dc3274-0701-416c-bee5-1c6f831ecf5f	2026-07-08 06:56:32.642225+00
fdce1b66-e818-4a10-a854-fb4722142283	catatan_kebijakan	Karyawan Datang Harus On time	selesai	\N	\N	\N	\N	64dc3274-0701-416c-bee5-1c6f831ecf5f	2026-07-08 06:57:02.981572+00
\.


--
-- Data for Name: penjualan; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.penjualan (id, nomor_faktur, reseller_id, tanggal, total_harga_katalog, total_harga_jual, total_ongkir, total_bonus, total_laba, uang_dp, status_bayar, metode_bayar, tujuan, catatan, created_by, created_at, updated_at, bonus_terbayar, sopir, bonus_owner, catatan_bonus_owner, telepon_sopir, nama_customer, telepon_customer, nomor_resi, po_id, milestone, status_pencocokan, dicocokkan_oleh, dicocokkan_at, catatan_pencocokan, catatan_internal, bonus_disetujui_reseller, bonus_disetujui_at) FROM stdin;
9d836a7d-c3fa-47e8-8551-ac4c842e8c91	INV-20260716-0104	b296e5f9-33ae-44a7-abc9-35a385b0ac1b	2026-07-16 05:23:37.297343+00	2700000.00	2700000.00	0.00	0.00	2700000.00	0.00	lunas	transfer	Makassar		\N	2026-07-16 05:23:37.297343+00	2026-07-16 05:23:37.297343+00	0.00	YAHYA	0.00	\N	087844324708	ANDIN	082393907864	BNG-YSJU3WDW	\N	diproses	belum_dicocokkan	\N	\N	\N	\N	f	\N
85e9a72d-7090-427b-af77-82a698898810	INV-20260716-0108	2da0eb31-9d05-4b80-8b3b-57b43c71ed1e	2026-07-16 07:47:26.294976+00	5000000.00	6700000.00	600000.00	1100000.00	5000000.00	0.00	lunas	transfer	Mamuju		\N	2026-07-16 07:47:26.294976+00	2026-07-16 08:00:03.275922+00	0.00	DEDI	0.00	\N	\N	Muhtar	085255777017	BNG-JWV2DA5G	\N	diproses	belum_dicocokkan	\N	\N	\N	\N	t	2026-07-16 08:00:02.913+00
4bf61dc3-93a7-4f2b-b3c2-2c1780567c68	INV-20260708-0062	dbfa7ed2-f20e-46ab-9ea9-96cf677f0195	2026-07-08 08:47:31.699543+00	4000000.00	4300000.00	50000.00	250000.00	1450000.00	4300000.00	lunas	cod	Makassar 		\N	2026-07-08 08:47:31.699543+00	2026-07-15 11:34:42.216742+00	0.00	BENDA	0.00	\N	087750491760	ILMI	081355955369	BNG-ZPQB4Q58	\N	selesai	belum_dicocokkan	\N	\N	\N	\N	f	\N
78f0d5ea-91d0-4ff9-a4f1-f2b799e226e6	INV-20260708-0063	2688e521-b2c2-4d0e-bffa-37946fa5f325	2026-07-08 10:38:05.887208+00	3150000.00	3700000.00	50000.00	500000.00	3150000.00	1700000.00	dp	transfer	Makassar		\N	2026-07-08 10:38:05.887208+00	2026-07-15 11:34:42.216742+00	0.00	Benda	0.00	\N	087750491760	Baso	081228001658	BNG-F3XNW827	\N	diproses	belum_dicocokkan	\N	\N	\N	\N	f	\N
eb67e178-ca70-4335-a186-b2a4b3e2f5d6	INV-20260701-0033	f906a7de-4839-4c5f-902c-71790c84568d	2026-07-01 10:04:22.77129+00	5500000.00	5500000.00	0.00	0.00	5500000.00	4300000.00	dp	transfer	Morowali		\N	2026-07-01 10:04:22.77129+00	2026-07-15 11:34:42.216742+00	0.00	Junaedy	0.00	\N	\N	Nur	\N	BNG-E7394BLS	\N	diproses	belum_dicocokkan	\N	\N	\N	\N	f	\N
6a6ee084-5a30-4830-be83-709bb2ddb06e	INV-20260709-0065	6fabea03-1649-4853-a286-015b38071866	2026-07-09 09:10:19.928427+00	1700000.00	1700000.00	0.00	0.00	525000.00	1700000.00	lunas	transfer	Luwu		\N	2026-07-09 09:10:19.928427+00	2026-07-15 11:34:42.216742+00	0.00	Di jemput	0.00	\N	\N	Nikma	085340091512	BNG-TX3SDY9E	\N	selesai	belum_dicocokkan	\N	\N	\N	\N	f	\N
71329321-428a-4f6d-a7c0-93c542f8c55c	INV-20260701-0032	62db9dfc-46e9-4a44-bb84-ced1cf7d86c3	2026-07-01 10:00:26.6778+00	6500000.00	6500000.00	0.00	0.00	6500000.00	6500000.00	lunas	transfer	Luwu		\N	2026-07-01 10:00:26.6778+00	2026-07-15 11:34:42.216742+00	0.00	Jemput sendiri	0.00	\N	.	Masamba	\N	BNG-AV6ZM6GC	\N	diproses	belum_dicocokkan	\N	\N	\N	\N	f	\N
7fe60d15-962f-4d6e-9fa1-5717352a72e6	INV-20260716-0109	ec6cae31-d953-4806-af1e-aa1031982918	2026-07-16 10:49:08.327404+00	5100000.00	5400000.00	50000.00	250000.00	3150000.00	0.00	lunas	transfer	Kolaka		\N	2026-07-16 10:49:08.327404+00	2026-07-17 01:47:23.596251+00	250000.00	DEDI	0.00	\N	085394238405	Lina	082224089989	BNG-U9J4HP6X	\N	diproses	belum_dicocokkan	\N	\N	\N	\N	f	\N
8370e2c0-fec8-4374-b8c0-6db96a0d7bde	INV-20260701-0034	4ef7eed5-4f7e-4400-b7db-d5164b303632	2026-07-01 10:08:16.11174+00	5000000.00	5000000.00	0.00	0.00	5000000.00	1400000.00	dp	transfer	Morowali		\N	2026-07-01 10:08:16.11174+00	2026-07-15 11:34:42.216742+00	0.00	Dg suro	0.00	\N	\N	Wati	\N	BNG-9QHNJDBM	\N	diproses	belum_dicocokkan	\N	\N	\N	\N	f	\N
96e37eb6-10d8-425c-81ff-101bc580fac1	INV-20260702-0042	\N	2026-07-02 08:41:21.891507+00	4000000.00	4300000.00	50000.00	250000.00	1450000.00	0.00	lunas	cash	Makassar 		\N	2026-07-02 08:41:21.891507+00	2026-07-15 11:34:42.216742+00	0.00	Benda	0.00	\N	87750491760	Adnan	085823359786	BNG-AXYQQJB8	\N	diproses	belum_dicocokkan	\N	\N	\N	\N	f	\N
b5042b42-35a6-4571-9c5f-154e361dab2a	INV-20260712-0077	6fabea03-1649-4853-a286-015b38071866	2026-07-12 03:29:51.93664+00	3000000.00	3200000.00	50000.00	150000.00	3000000.00	3200000.00	lunas	cod	Makassar		\N	2026-07-12 03:29:51.93664+00	2026-07-16 06:01:18.547312+00	150000.00	YAHYA	0.00	\N	087844324708	Ina	0887436339866	BNG-ZRT6DNT4	4489d72e-36d6-4b21-a176-afdf2a256cb8	selesai	belum_dicocokkan	\N	\N	\N	\N	f	\N
ddd28a81-2837-4bae-a431-b639d4c768a2	INV-20260707-0061	6fabea03-1649-4853-a286-015b38071866	2026-07-07 09:44:02.820363+00	2450000.00	3100000.00	250000.00	400000.00	650000.00	3100000.00	lunas	cod	Wajo		\N	2026-07-07 09:44:02.820363+00	2026-07-16 06:01:38.848016+00	400000.00	Putra	0.00	\N	0895335659638	HJ.NENI	085242486895	BNG-H23YU2G3	\N	selesai	belum_dicocokkan	\N	\N	\N	\N	f	\N
93b3c33e-2b78-4419-8a87-f4ded55aceb7	INV-20260712-0079	0081aa4f-41f1-4ebf-aa39-33e35654e5c2	2026-07-12 08:50:31.546253+00	700000.00	900000.00	0.00	200000.00	350000.00	0.00	lunas	transfer			\N	2026-07-12 08:50:31.546253+00	2026-07-17 01:46:31.149964+00	200000.00		0.00	\N	\N	\N	\N	BNG-LLHQ98BM	\N	selesai	belum_dicocokkan	\N	\N	\N	\N	f	\N
f8625d3e-cf1f-4ce5-8984-579329034220	INV-20260703-0043	528dda68-e05b-48cf-b29d-5ee1c95a64c4	2026-07-03 05:12:02.573403+00	4350000.00	5500000.00	50000.00	1100000.00	850000.00	0.00	lunas	transfer	Makassar 		\N	2026-07-03 05:12:02.573403+00	2026-07-17 01:46:43.985414+00	1100000.00	Dedi	0.00	\N	085394238405	Dara	085825045860	BNG-FFD4HUPA	\N	diproses	belum_dicocokkan	\N	\N	\N	\N	f	\N
74a3522e-c330-4a16-b2cc-659cac8c0dae	INV-20260716-0102	2d42e356-4219-46cc-b62e-6acb53845fdc	2026-07-16 01:27:50.785638+00	2300000.00	2850000.00	50000.00	500000.00	2300000.00	0.00	lunas	transfer	Kolaka		\N	2026-07-16 01:27:50.785638+00	2026-07-17 01:46:55.890049+00	500000.00	YAHYA	0.00	\N	\N	Mariam	082348468962	BNG-6UUP9BEX	\N	diproses	belum_dicocokkan	\N	\N	\N	\N	f	\N
e07971a5-6a8a-4f74-a8ff-76c56bc67324	INV-20260705-0054	2688e521-b2c2-4d0e-bffa-37946fa5f325	2026-07-05 09:35:44.23647+00	7100000.00	8050000.00	75000.00	875000.00	7100000.00	0.00	lunas	transfer	GOWA		\N	2026-07-05 09:35:44.23647+00	2026-07-15 11:34:42.216742+00	0.00	DEDI	0.00	\N	085394238405	RANNU	082194559909	BNG-WT8F4UQQ	\N	selesai	belum_dicocokkan	\N	\N	\N	\N	f	\N
b0f764f1-77d8-44ee-b91a-74cd3da82e9f	INV-20260716-0110	ec6cae31-d953-4806-af1e-aa1031982918	2026-07-16 10:52:00.71444+00	3500000.00	4100000.00	75000.00	525000.00	3500000.00	0.00	lunas	transfer			\N	2026-07-16 10:52:00.71444+00	2026-07-17 01:47:18.079371+00	525000.00		0.00	\N	\N	\N	\N	BNG-MFZLMS6C	\N	diproses	belum_dicocokkan	\N	\N	\N	\N	f	\N
7e2844da-9037-4cbb-83b8-7f2cc41b66f4	INV-20260703-0044	6fabea03-1649-4853-a286-015b38071866	2026-07-03 13:04:53.810517+00	2400000.00	2400000.00	0.00	0.00	2400000.00	0.00	lunas	cod	Bulukumba		\N	2026-07-03 13:04:53.810517+00	2026-07-15 11:34:42.216742+00	0.00		0.00	\N	085751606357	Darmi	082344389488	BNG-ASDPKLX8	\N	diproses	belum_dicocokkan	\N	\N	\N	\N	f	\N
1df5098b-8cf4-4dd4-bfaa-b9354f0f956f	INV-20260704-0050	\N	2026-07-04 12:52:14.799322+00	2200000.00	2200000.00	0.00	0.00	500000.00	0.00	lunas	transfer			\N	2026-07-04 12:52:14.799322+00	2026-07-15 11:34:42.216742+00	0.00		0.00	\N	\N	Budi Testing	081234567890	BNG-GKB8Z3CT	\N	diproses	belum_dicocokkan	\N	\N	\N	\N	f	\N
2996bb77-722b-4665-9c22-1393ef8ffa7e	INV-20260701-0036	a18c22b6-16aa-4239-ab66-4687982813f0	2026-07-01 10:31:26.281528+00	10100000.00	10100000.00	0.00	0.00	1500000.00	10100000.00	lunas	transfer	Kolaka		\N	2026-07-01 10:31:26.281528+00	2026-07-15 11:34:42.216742+00	0.00	Expedisi 	0.00	\N	\N	Naura	085397907151	BNG-NRKCMGSP	\N	diproses	belum_dicocokkan	\N	\N	\N	\N	f	\N
0b24453b-6a12-404f-8341-b6d091bb985c	INV-20260705-0053	a18c22b6-16aa-4239-ab66-4687982813f0	2026-07-05 03:00:25.711123+00	4000000.00	4000000.00	0.00	0.00	4000000.00	4000000.00	lunas	transfer	Kolaka		\N	2026-07-05 03:00:25.711123+00	2026-07-15 11:34:42.216742+00	0.00	Expedisi	0.00	\N	\N	Naura	085397907151	BNG-WFCRPXNH	\N	selesai	belum_dicocokkan	\N	\N	\N	\N	f	\N
a7869a6c-9b0e-404c-87ad-e6f17f58e30f	INV-20260710-0066	564c929f-39a3-47a7-87ef-533522a9a6c1	2026-07-10 02:04:16.251027+00	4900000.00	4900000.00	50000.00	0.00	3325000.00	0.00	lunas	transfer			\N	2026-07-10 02:04:16.251027+00	2026-07-15 11:34:42.216742+00	0.00		0.00	\N	\N	\N	\N	BNG-2XZHYACC	\N	selesai	belum_dicocokkan	\N	\N	\N	\N	f	\N
6a664274-b373-499d-a7a8-aaeff93b639f	INV-20260713-0086	770fa9ba-5aaf-480d-89b6-b152a0592be0	2026-07-13 09:09:45.281112+00	4300000.00	4300000.00	0.00	0.00	650000.00	4300000.00	lunas	transfer	Polman		\N	2026-07-13 09:09:45.281112+00	2026-07-15 11:34:42.216742+00	0.00	DEDI	0.00	\N	085394238405	Ibu jaya	082319564740	BNG-ZBQL9EBN	\N	selesai	belum_dicocokkan	\N	\N	\N	\N	f	\N
2d082807-2704-442a-a2ab-963355c9e593	INV-20260711-0068	50aca5d8-0067-4fe1-99e0-21654255e980	2026-07-11 01:55:52.527068+00	1700000.00	1700000.00	0.00	0.00	525000.00	1700000.00	lunas	transfer			\N	2026-07-11 01:55:52.527068+00	2026-07-15 11:34:42.216742+00	0.00		0.00	\N	\N	\N	\N	BNG-9AGXJLK6	\N	selesai	belum_dicocokkan	\N	\N	\N	\N	f	\N
40349857-4a5c-444b-b6b5-b543672e341d	INV-20260711-0070	7036472f-cb44-453d-be7c-a56799991e3e	2026-07-11 05:17:53.367635+00	5100000.00	5150000.00	50000.00	0.00	1200000.00	5150000.00	lunas	transfer	Kolaka		\N	2026-07-11 05:17:53.367635+00	2026-07-15 11:34:42.216742+00	0.00	DEDI	0.00	\N	085394238405	TOKO BUANA INDAH	085340674788	BNG-3E7H35UJ	\N	selesai	belum_dicocokkan	\N	\N	\N	\N	f	\N
c1f316de-4fcc-4ae3-acf9-f1a81f839b55	INV-20260711-0071	dbfa7ed2-f20e-46ab-9ea9-96cf677f0195	2026-07-11 06:07:03.249959+00	2550000.00	2800000.00	50000.00	200000.00	2550000.00	2800000.00	lunas	transfer	Luwuk banggai		\N	2026-07-11 06:07:03.249959+00	2026-07-15 11:34:42.216742+00	0.00	DEDI	0.00	\N	085394238405	IBI IMA SOFIA	082237851788	BNG-4SBHBMUQ	\N	selesai	belum_dicocokkan	\N	\N	\N	\N	f	\N
dd9f3c81-324e-4730-a3ce-447a5b0a101f	INV-20260707-0058	6843890f-e7ea-4314-a5b8-f99ee9e2a6d7	2026-07-07 04:23:26.238458+00	2500000.00	2650000.00	50000.00	100000.00	2500000.00	0.00	lunas	transfer	Makassar 		\N	2026-07-07 04:23:26.238458+00	2026-07-15 11:34:42.216742+00	100000.00	Yahya	0.00	\N	087844324708	Fandy	085326817637	BNG-TZN2MBCS	\N	selesai	belum_dicocokkan	\N	\N	\N	\N	f	\N
62298a25-df7a-47c6-8cc8-7570396c4b32	INV-20260710-0067	ee180db1-0511-4639-9ba7-ab72f06d788a	2026-07-10 09:25:55.990304+00	5600000.00	5600000.00	50000.00	0.00	5600000.00	0.00	lunas	cod	Gowa		\N	2026-07-10 09:25:55.990304+00	2026-07-15 11:34:42.216742+00	0.00	Dedi	0.00	\N	085394238405	Ros	082148238134	BNG-UYZ6B6VK	\N	selesai	belum_dicocokkan	\N	\N	\N	\N	f	\N
41f7ca97-334a-498a-a729-6f478fa5d249	INV-20260707-0057	ac095562-294c-41c0-85db-57085ca3f28c	2026-07-07 01:24:02.238829+00	2650000.00	2650000.00	0.00	0.00	450000.00	0.00	lunas	transfer			\N	2026-07-07 01:24:02.238829+00	2026-07-15 11:34:42.216742+00	0.00		0.00	Pedagang	\N	\N	\N	BNG-HB6CJH4W	\N	selesai	belum_dicocokkan	\N	\N	\N	\N	f	\N
e200df92-5876-4bb2-96cf-7f1e944cc134	INV-20260703-0045	6fabea03-1649-4853-a286-015b38071866	2026-07-03 13:12:51.942873+00	2450000.00	2450000.00	50000.00	0.00	400000.00	2450000.00	lunas	cod	Bulukumba		\N	2026-07-03 13:12:51.942873+00	2026-07-15 11:34:42.216742+00	0.00	Nandi	0.00	\N	085751606357	Wati	082310555270	BNG-3JBWN9KA	\N	selesai	belum_dicocokkan	\N	\N	\N	\N	f	\N
26dee3f0-359b-4087-87ef-7fc2ac3f9259	INV-20260713-0082	2d42e356-4219-46cc-b62e-6acb53845fdc	2026-07-13 03:41:23.521886+00	2550000.00	3650000.00	500000.00	600000.00	600000.00	0.00	belum_bayar	cod	Pasangkayu		\N	2026-07-13 03:41:23.521886+00	2026-07-15 11:34:42.216742+00	0.00	DEDI	0.00	\N	085394238405	Alpionita	082296458143	BNG-CMSPUMLY	\N	dikirim	belum_dicocokkan	\N	\N	\N	\N	f	\N
3132178e-478b-423f-931b-663978e078ff	INV-20260713-0081	6fabea03-1649-4853-a286-015b38071866	2026-07-13 03:32:59.59538+00	2550000.00	2550000.00	0.00	0.00	600000.00	2550000.00	lunas	transfer	Polman		\N	2026-07-13 03:32:59.59538+00	2026-07-15 11:34:42.216742+00	0.00	DEDI	0.00	\N	085394238405	Nahidah	082395285889	BNG-64VEGDQ7	\N	selesai	belum_dicocokkan	\N	\N	\N	\N	f	\N
e1dd50c5-00d6-4b7c-9d18-0137ba53a4ca	INV-20260713-0085	ac095562-294c-41c0-85db-57085ca3f28c	2026-07-13 09:05:01.166488+00	2650000.00	2650000.00	0.00	0.00	2650000.00	2650000.00	lunas	transfer	Kolaka		\N	2026-07-13 09:05:01.166488+00	2026-07-15 11:34:42.216742+00	0.00	DEDI	0.00	\N	085394238405	Dea	085756027077	BNG-89RTHHQN	\N	selesai	belum_dicocokkan	\N	\N	\N	\N	f	\N
70c0c8d3-7fbd-4523-9c4f-337e21e2abff	INV-20260713-0084	0d44b851-aead-4765-bbf0-cb32a8e0c0e9	2026-07-13 08:38:02.64193+00	3050000.00	3400000.00	75000.00	275000.00	550000.00	3400000.00	lunas	cod	Gowa		\N	2026-07-13 08:38:02.64193+00	2026-07-15 11:34:42.216742+00	0.00	YAHYA	0.00	\N	087844324708	NURMIATI	085242551734	BNG-AA7DP6K7	\N	selesai	belum_dicocokkan	\N	\N	\N	\N	f	\N
fcec19b5-d203-45dd-abcf-60ee458f6624	INV-20260713-0083	7036472f-cb44-453d-be7c-a56799991e3e	2026-07-13 03:48:11.421251+00	2450000.00	2450000.00	0.00	0.00	2450000.00	2450000.00	lunas	transfer	Kolaka		\N	2026-07-13 03:48:11.421251+00	2026-07-15 11:34:42.216742+00	0.00	DEDI	0.00	\N	085394238405	Toko buana indah 	085340674788	BNG-VZWJL5DW	\N	selesai	belum_dicocokkan	\N	\N	\N	\N	f	\N
a9a2846a-a5dc-4da5-ba63-1bbc979affc4	INV-20260713-0080	6fabea03-1649-4853-a286-015b38071866	2026-07-13 03:30:04.11668+00	2450000.00	2500000.00	50000.00	0.00	221000.00	0.00	lunas	transfer	Makassar		\N	2026-07-13 03:30:04.11668+00	2026-07-15 11:34:42.216742+00	0.00	NANDI	0.00	\N	085751606357	Hermansyah	081342588188	BNG-XCM48JMK	\N	selesai	belum_dicocokkan	\N	\N	\N	\N	f	\N
c32a696d-08bc-428e-a7f6-dae05c47367a	INV-20260712-0078	\N	2026-07-12 06:04:29.611031+00	8350000.00	9250000.00	450000.00	450000.00	8350000.00	9250000.00	lunas	cod	Luwu		\N	2026-07-12 06:04:29.611031+00	2026-07-15 11:34:42.216742+00	0.00	Benda	0.00	\N	087750491760	Nira	082279009851	BNG-PXUKQCPP	\N	selesai	belum_dicocokkan	\N	\N	\N	\N	f	\N
7414fdc0-6470-4ed3-808f-6f7c882979c6	INV-20260715-0094	6f6a7b40-5387-4bac-9815-c79e31999a05	2026-07-15 02:32:19.55092+00	2250000.00	3100000.00	75000.00	775000.00	500000.00	3100000.00	lunas	cod	Gowa		\N	2026-07-15 02:32:19.55092+00	2026-07-17 01:43:53.508019+00	775000.00	DEDI	0.00	\N	085394238405	Irfan	081241522978	BNG-UQ3RD2FS	\N	diproses	belum_dicocokkan	\N	\N	\N	\N	f	\N
c6d4f560-03a0-43b7-80f2-9998439e57c1	INV-20260711-0075	6fabea03-1649-4853-a286-015b38071866	2026-07-11 14:43:58.11699+00	3950000.00	4350000.00	350000.00	50000.00	1050000.00	4350000.00	lunas	cod	Luwu		\N	2026-07-11 14:43:58.11699+00	2026-07-16 06:01:27.367897+00	50000.00	BENDA	0.00	\N	087750491760	PAK SABAR	085657177696	BNG-CZX88X2J	\N	selesai	belum_dicocokkan	\N	\N	\N	\N	f	\N
69f11956-9f1f-4618-89b6-44ddba45fca8	INV-20260704-0048	e80dbcc5-71e6-484e-be75-ccb91fe04799	2026-07-04 07:37:22.166124+00	4000000.00	4700000.00	0.00	700000.00	1450000.00	0.00	lunas	transfer	Majene		\N	2026-07-04 07:37:22.166124+00	2026-07-17 01:45:58.931313+00	700000.00	Expedisi	0.00	\N	\N	Icha	082190278317	BNG-WBNHRHPQ	\N	selesai	belum_dicocokkan	\N	\N	\N	\N	f	\N
0220951d-f77f-49a9-ae44-4ea1f576e59f	INV-20260702-0041	c563651a-caaf-4f2d-82e2-caa0e514f509	2026-07-02 07:36:22.736138+00	1550000.00	2200000.00	250000.00	400000.00	1550000.00	2200000.00	lunas	transfer	Majene		\N	2026-07-02 07:36:22.736138+00	2026-07-17 01:46:21.60894+00	400000.00	Mia expedisi	0.00	\N	082388881258	Yuli	085126761881	BNG-4URKSUPM	\N	selesai	belum_dicocokkan	\N	\N	\N	\N	t	2026-07-16 07:10:43.235+00
6eb90ac9-2cc2-4542-8f0e-bba3f7c321a5	INV-20260711-0072	2d42e356-4219-46cc-b62e-6acb53845fdc	2026-07-11 13:56:35.239224+00	4300000.00	4650000.00	75000.00	275000.00	4300000.00	0.00	lunas	transfer	Maros		\N	2026-07-11 13:56:35.239224+00	2026-07-17 01:47:03.926049+00	275000.00	Dedi	0.00	\N	085394238405	NUR JIHAN	085398555848	BNG-F7FEHD5Z	\N	selesai	belum_dicocokkan	\N	\N	\N	\N	f	\N
ad00589c-49e7-4c2b-a74a-8341f59e4e82	INV-20260709-0064	a18c22b6-16aa-4239-ab66-4687982813f0	2026-07-09 01:41:12.950228+00	2450000.00	2450000.00	0.00	0.00	500000.00	2450000.00	lunas	transfer	KOLAKA		\N	2026-07-09 01:41:12.950228+00	2026-07-16 07:34:19.730947+00	0.00	DEDI	0.00	\N	085394238405	MIKA	085211086398	BNG-66ENRQ34	\N	selesai	belum_dicocokkan	\N	\N	\N	\N	f	\N
4e0e7ab3-2454-474d-bf69-cc28f0f28996	INV-20260705-0051	b1440561-acf0-4e0b-bc0f-fffdbde3a1a3	2026-07-05 02:40:34.158497+00	5300000.00	6000000.00	450000.00	250000.00	3725000.00	6000000.00	lunas	cod	BULUKUMBA		\N	2026-07-05 02:40:34.158497+00	2026-07-17 01:48:12.353175+00	250000.00	Nandi	0.00	\N	085751606357	ANTI	082188694489	BNG-EV34GNTW	\N	selesai	belum_dicocokkan	\N	\N	\N	\N	f	\N
6346f186-a186-4888-a08f-9834032b2f0d	INV-20260714-0089	b296e5f9-33ae-44a7-abc9-35a385b0ac1b	2026-07-14 06:06:48.363259+00	7500000.00	9300000.00	700000.00	1100000.00	4000000.00	0.00	lunas	transfer	Luwu		\N	2026-07-14 06:06:48.363259+00	2026-07-16 09:31:31.561378+00	0.00	BENDA	0.00	\N	087750491760	Armika	085397406808	BNG-G995PYWG	\N	selesai	belum_dicocokkan	\N	\N	\N	\N	f	\N
f6320716-1003-4f43-9edb-02dc7c71b61f	INV-20260711-0076	ec6cae31-d953-4806-af1e-aa1031982918	2026-07-11 15:18:15.591248+00	4550000.00	5600000.00	600000.00	450000.00	2900000.00	5600000.00	lunas	transfer	Luwu		\N	2026-07-11 15:18:15.591248+00	2026-07-17 01:47:39.655672+00	450000.00	Benda	0.00	\N	087750491760	Firdha	0882021663974	BNG-55JBAQSS	\N	selesai	belum_dicocokkan	\N	\N	\N	\N	f	\N
0a7083a8-130c-4b7e-875c-8d142ea8f416	INV-20260714-0091	6843890f-e7ea-4314-a5b8-f99ee9e2a6d7	2026-07-14 12:54:39.47951+00	1550000.00	1800000.00	50000.00	200000.00	1550000.00	0.00	lunas	transfer	Gowa		\N	2026-07-14 12:54:39.47951+00	2026-07-17 01:43:23.416237+00	200000.00	YAHYA	0.00	\N	087844324708	Idin	085256084565	BNG-69VFA5CV	\N	selesai	belum_dicocokkan	\N	\N	\N	\N	f	\N
73e3ae74-a28b-4748-b165-a5f4aef93bef	INV-20260715-0099	6f6a7b40-5387-4bac-9815-c79e31999a05	2026-07-15 06:27:46.937922+00	3200000.00	4500000.00	150000.00	1150000.00	3200000.00	4500000.00	lunas	cod	PANGKEP		\N	2026-07-15 06:27:46.937922+00	2026-07-17 01:43:45.840893+00	1150000.00	DEDI	0.00	\N	085394238405	HADRI	0882242614207	BNG-NEET5NDU	\N	diproses	belum_dicocokkan	\N	\N	\N	\N	f	\N
ee983ed9-9a79-4d1c-964d-ff895913bf18	INV-20260705-0055	6f6a7b40-5387-4bac-9815-c79e31999a05	2026-07-05 09:38:00.458418+00	4650000.00	5100000.00	50000.00	400000.00	750000.00	0.00	lunas	transfer	Makassar		\N	2026-07-05 09:38:00.458418+00	2026-07-17 01:44:06.497235+00	400000.00	Yahya	0.00	\N	087844324708	PAK SULAIMAN	085396971967	BNG-RKQ5ZUA4	\N	selesai	belum_dicocokkan	\N	\N	\N	\N	f	\N
c09c3819-fac6-4087-88f2-b5907ac64d7d	INV-20260702-0040	6f6a7b40-5387-4bac-9815-c79e31999a05	2026-07-02 01:07:01.025863+00	4150000.00	4600000.00	50000.00	400000.00	650000.00	0.00	lunas	cash	Makassar		\N	2026-07-02 01:07:01.025863+00	2026-07-17 01:44:14.816957+00	400000.00	Benda	0.00	\N	087750491760	Marsuki	08876312860	BNG-YXRXM4YX	\N	diproses	belum_dicocokkan	\N	\N	\N	\N	f	\N
93bedef9-467f-4cf0-b6cd-02fbfc5a3e1c	INV-20260711-0069	c563651a-caaf-4f2d-82e2-caa0e514f509	2026-07-11 01:58:51.598421+00	2650000.00	3500000.00	300000.00	550000.00	2650000.00	3500000.00	lunas	cod	Bone		\N	2026-07-11 01:58:51.598421+00	2026-07-17 01:46:15.481523+00	550000.00	Putra	0.00	\N	0895335659638	Ochie	085246996554	BNG-MTMJET94	\N	selesai	belum_dicocokkan	\N	\N	\N	\N	t	2026-07-16 07:10:36.313+00
b2a87156-5268-4901-a21c-a713b4f91821	INV-20260705-0052	ec6cae31-d953-4806-af1e-aa1031982918	2026-07-05 02:51:22.765782+00	3950000.00	4100000.00	75000.00	75000.00	1050000.00	0.00	lunas	transfer	Maros		\N	2026-07-05 02:51:22.765782+00	2026-07-17 01:47:48.453485+00	75000.00	Benda	0.00	\N	087750491760	Palisi	083853773469	BNG-WET7N626	\N	selesai	belum_dicocokkan	\N	\N	\N	\N	t	2026-07-16 09:55:53.94+00
45549a4f-0075-43d1-8772-fef88ba1d0d4	INV-20260704-0049	45e07261-1904-4f0c-ad68-771bc70d0411	2026-07-04 07:41:16.308905+00	2650000.00	3000000.00	75000.00	275000.00	500000.00	0.00	lunas	transfer	Gowa		\N	2026-07-04 07:41:16.308905+00	2026-07-17 01:48:30.883732+00	275000.00	Yahya	0.00	\N	087744324708	Indah	085657353025	BNG-RDX7EN62	\N	selesai	belum_dicocokkan	\N	\N	\N	\N	f	\N
640b4798-032b-4b39-8813-1bda1aae7c19	INV-20260714-0087	\N	2026-07-14 03:43:11.277191+00	5000000.00	5400000.00	50000.00	350000.00	5000000.00	5400000.00	lunas	transfer	Bombana		\N	2026-07-14 03:43:11.277191+00	2026-07-15 11:34:42.216742+00	0.00	DEDI	0.00	\N	085394238405	Lina	082224089989	BNG-6NC65QPV	\N	diproses	belum_dicocokkan	\N	\N	\N	\N	f	\N
9eb222d2-5125-46cc-aa77-f1fa8d78c44d	INV-20260715-0092	2976b58d-9f3f-45c4-8725-5c804eab604c	2026-07-15 02:12:07.765806+00	1950000.00	1950000.00	0.00	0.00	400000.00	0.00	lunas	transfer			\N	2026-07-15 02:12:07.765806+00	2026-07-15 11:34:42.216742+00	0.00		0.00	\N	\N	\N	\N	BNG-5HC3NFAX	\N	diproses	belum_dicocokkan	\N	\N	\N	\N	f	\N
56ba6c7f-ba25-4064-9fb9-803589cb2305	INV-20260715-0093	c59082b9-b1d7-4c5c-a218-6aac883df51c	2026-07-15 02:21:23.613699+00	2450000.00	3450000.00	500000.00	500000.00	500000.00	3450000.00	lunas	cod	Sulawesi barat		\N	2026-07-15 02:21:23.613699+00	2026-07-16 06:53:15.590857+00	0.00	DEDI	0.00	\N	085394238405	Dhea	087812237235	BNG-RFG5ZDMT	\N	diproses	belum_dicocokkan	\N	\N	\N	\N	f	\N
aa5c53a8-54e0-4628-94a6-0c50a6681163	INV-20260716-0111	6fabea03-1649-4853-a286-015b38071866	2026-07-16 11:11:38.410643+00	6000000.00	6500000.00	50000.00	450000.00	6000000.00	0.00	lunas	transfer	Mamasa		\N	2026-07-16 11:11:38.410643+00	2026-07-17 01:43:09.191226+00	450000.00	DEDI	0.00	\N	085394238405	Rosina	085341999439	BNG-E2WWU5EW	\N	selesai	belum_dicocokkan	\N	\N	\N	\N	f	\N
4d43acf8-453e-48d2-a487-5bca0f71794b	INV-20260716-0103	e80dbcc5-71e6-484e-be75-ccb91fe04799	2026-07-16 03:32:45.518594+00	4300000.00	4700000.00	0.00	400000.00	4300000.00	0.00	lunas	transfer			\N	2026-07-16 03:32:45.518594+00	2026-07-17 01:45:53.103267+00	400000.00		0.00	\N	\N	\N	\N	BNG-AS4CKNSR	\N	diproses	belum_dicocokkan	\N	\N	\N	\N	f	\N
3eb6c9be-4ffc-4d0f-9a96-ee4dc1d0630e	INV-20260714-0090	c9d9e7b7-60f4-499f-ace5-2318b967ebd6	2026-07-14 10:07:14.545464+00	1950000.00	2400000.00	50000.00	400000.00	400000.00	2400000.00	lunas	transfer	Tikke		\N	2026-07-14 10:07:14.545464+00	2026-07-17 01:48:21.126861+00	400000.00	DEDI	0.00	\N	085394238405	Toko nurul jaya	085242290927	BNG-HHDFJCBN	\N	selesai	belum_dicocokkan	\N	\N	\N	\N	f	\N
\.


--
-- Data for Name: penjualan_item; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.penjualan_item (id, penjualan_id, produk_id, jumlah, harga_modal, harga_katalog, harga_jual, ongkir, bonus, created_at, laba) FROM stdin;
2e0c3d40-291e-4a75-9967-cf4c688c7601	4d43acf8-453e-48d2-a487-5bca0f71794b	7a2ce8f9-e0bd-4be8-9476-4cfb916c89ce	1	0.00	4300000.00	4700000.00	0.00	400000.00	2026-07-16 03:32:45.828558+00	0.00
c7bb5adc-cb08-4c35-a9b8-cf84da5fe328	7fe60d15-962f-4d6e-9fa1-5717352a72e6	1ab176c0-fec1-4f0f-9d5f-e903410b713b	1	1950000.00	2550000.00	2700000.00	50000.00	100000.00	2026-07-16 10:49:08.511529+00	0.00
bdc2a833-8172-49e6-b847-7bb5b8db1abf	7fe60d15-962f-4d6e-9fa1-5717352a72e6	78245a88-fafb-4fdc-bff4-eee6fd7a3061	1	0.00	2550000.00	2700000.00	0.00	150000.00	2026-07-16 10:49:08.511529+00	0.00
0ca3126b-db0b-4262-b78d-860755ad74ad	9d836a7d-c3fa-47e8-8551-ac4c842e8c91	316e8813-4623-4740-8c9d-8b20f3dcea9c	1	0.00	2700000.00	2700000.00	0.00	0.00	2026-07-16 05:23:37.462742+00	0.00
34120a4f-582a-43a0-8e42-db3f96c554cf	b0f764f1-77d8-44ee-b91a-74cd3da82e9f	b4077288-a2aa-467f-b68f-b3e778972409	1	0.00	3500000.00	4100000.00	75000.00	525000.00	2026-07-16 10:52:00.889153+00	0.00
edec91c2-2a3d-43ff-89cb-24f968692f89	74a3522e-c330-4a16-b2cc-659cac8c0dae	84c27d0f-e8c4-49f9-8dee-4bcf280dcf53	1	0.00	2300000.00	2850000.00	50000.00	500000.00	2026-07-16 01:27:51.419601+00	0.00
e12f613b-cc5c-438a-a968-f6c86d89b545	85e9a72d-7090-427b-af77-82a698898810	78245a88-fafb-4fdc-bff4-eee6fd7a3061	1	0.00	2550000.00	3350000.00	300000.00	500000.00	2026-07-16 07:47:26.43106+00	0.00
e33e18b2-0a0d-41c8-8855-402e9cebc707	85e9a72d-7090-427b-af77-82a698898810	706d5532-5497-4383-95d1-b10517a654c3	1	0.00	2450000.00	3350000.00	300000.00	600000.00	2026-07-16 07:47:26.43106+00	0.00
7725f818-735a-435d-b1f2-58ec2cda3906	aa5c53a8-54e0-4628-94a6-0c50a6681163	965777c5-eeda-4a18-9e21-3f9315c28441	1	0.00	6000000.00	6500000.00	50000.00	450000.00	2026-07-16 11:11:38.587902+00	0.00
db95b538-0d4f-408b-b144-bbc003c1ff8e	45549a4f-0075-43d1-8772-fef88ba1d0d4	6d8b5b5f-bf75-4f21-b375-a28a6a502099	1	2150000.00	2650000.00	3000000.00	75000.00	275000.00	2026-07-04 07:41:17.046445+00	500000.00
4a48b3a5-9770-49f9-9a6b-27c7a0d71da7	f8625d3e-cf1f-4ce5-8984-579329034220	f7b48160-8677-49e2-8f4c-145be2156fc2	1	2050000.00	2450000.00	3200000.00	50000.00	700000.00	2026-07-03 05:12:03.457322+00	400000.00
315cff1d-e684-4167-a4d7-2de94de3894b	640b4798-032b-4b39-8813-1bda1aae7c19	b5837887-d08a-41f4-8920-af2e6b89cf71	1	0.00	2550000.00	2700000.00	0.00	150000.00	2026-07-14 03:43:11.381971+00	2550000.00
bcf41191-4d6b-44ff-9625-a6afbfe84184	c1f316de-4fcc-4ae3-acf9-f1a81f839b55	b5837887-d08a-41f4-8920-af2e6b89cf71	1	0.00	2550000.00	2800000.00	50000.00	200000.00	2026-07-11 06:07:03.344036+00	2550000.00
4c46efb4-1ec2-4cf1-b4b6-0d6e82d920ee	640b4798-032b-4b39-8813-1bda1aae7c19	155dfc98-a1bb-46a8-abfe-5fcad54bc6b8	1	0.00	2450000.00	2700000.00	50000.00	200000.00	2026-07-14 03:43:11.381971+00	2450000.00
9b2b21f1-1098-4c61-9e28-9ff70dd40303	fcec19b5-d203-45dd-abcf-60ee458f6624	9b3049bf-0763-4f61-aaf3-9c13380a2c97	1	0.00	2450000.00	2450000.00	0.00	0.00	2026-07-13 03:48:11.508958+00	2450000.00
f7ffa21b-2283-450a-a215-06d5c6f98c86	1df5098b-8cf4-4dd4-bfaa-b9354f0f956f	34fefb75-a56c-499a-8b52-fc69a7887b3a	1	1700000.00	2200000.00	2200000.00	0.00	0.00	2026-07-04 12:52:15.231562+00	500000.00
5c537da0-2613-4253-8cc6-0a4e1aa5641f	dd9f3c81-324e-4730-a3ce-447a5b0a101f	2dfe11b6-0b4f-44bf-a6af-9e955061c635	1	0.00	2500000.00	2650000.00	50000.00	100000.00	2026-07-07 04:23:26.78688+00	2500000.00
644b341e-e48b-4238-a33d-c23200fb101e	f8625d3e-cf1f-4ce5-8984-579329034220	d4a7b770-2937-4615-b974-e2138f43e22c	1	1450000.00	1900000.00	2300000.00	0.00	400000.00	2026-07-03 05:12:03.457322+00	450000.00
893e5364-4fa0-4e3a-9dfa-69d72d7c40a5	e07971a5-6a8a-4f74-a8ff-76c56bc67324	7c550656-5584-43b4-8fb9-a60e4264bf49	1	0.00	4150000.00	4650000.00	75000.00	425000.00	2026-07-05 09:35:45.130547+00	4150000.00
215e548e-3f9b-4a16-8986-5018bfdd7754	6a6ee084-5a30-4830-be83-709bb2ddb06e	3fc3e296-6d08-4012-9d73-cdf6ddce42ff	1	1175000.00	1700000.00	1700000.00	0.00	0.00	2026-07-09 09:10:20.216348+00	525000.00
5ac64cf3-a0d0-49ce-9e01-85b6863b2846	2d082807-2704-442a-a2ab-963355c9e593	52ec033d-7958-4bc4-bec9-020114328e80	1	1175000.00	1700000.00	1700000.00	0.00	0.00	2026-07-11 01:55:52.654454+00	525000.00
c94d5887-d228-48ee-bfc2-8021aabf57f4	6346f186-a186-4888-a08f-9834032b2f0d	41c51212-5ca0-4974-af37-b0e85a234dfc	1	3500000.00	4150000.00	5050000.00	350000.00	550000.00	2026-07-14 06:06:48.558321+00	650000.00
62c00db4-0037-4991-a63b-5a4a982e2a99	c09c3819-fac6-4087-88f2-b5907ac64d7d	41c51212-5ca0-4974-af37-b0e85a234dfc	1	3500000.00	4150000.00	4600000.00	50000.00	400000.00	2026-07-02 01:07:01.649331+00	650000.00
cab29b2c-6dcf-4591-9b1a-73ebfec4222b	c6d4f560-03a0-43b7-80f2-9998439e57c1	023e06fb-e740-4a7c-be34-85d1a0e1c625	1	2900000.00	3950000.00	4350000.00	350000.00	50000.00	2026-07-11 14:43:58.289542+00	1050000.00
0ac2d3ad-4cb3-4408-85ca-2af330b2447b	b2a87156-5268-4901-a21c-a713b4f91821	023e06fb-e740-4a7c-be34-85d1a0e1c625	1	2900000.00	3950000.00	4100000.00	75000.00	75000.00	2026-07-05 02:51:23.698818+00	1050000.00
6c706d3c-51d4-49f4-820e-23fc6ca352b6	71329321-428a-4f6d-a7c0-93c542f8c55c	dc969510-69aa-48e2-badd-72458d2ee39e	1	0.00	6500000.00	6500000.00	0.00	0.00	2026-07-01 10:00:26.994836+00	6500000.00
b196eac5-2f7b-445d-bc39-5fba865ae6fc	3132178e-478b-423f-931b-663978e078ff	f9e4976e-8894-4e8e-a0cb-a5be21ed2f63	1	1950000.00	2550000.00	2550000.00	0.00	0.00	2026-07-13 03:32:59.671774+00	600000.00
79c52717-9d41-4ae8-9b73-7189ce2808e3	f6320716-1003-4f43-9edb-02dc7c71b61f	293d149e-c109-4c69-9e95-3a45f7630df7	1	1650000.00	2200000.00	2500000.00	300000.00	0.00	2026-07-11 15:18:16.485329+00	550000.00
bd5808cf-7f7d-4f0d-82fd-dd724e8b7320	70c0c8d3-7fbd-4523-9c4f-337e21e2abff	22217fc3-5a69-4f3b-a200-b17046d70311	1	2500000.00	3050000.00	3400000.00	75000.00	275000.00	2026-07-13 08:38:02.751178+00	550000.00
d085fd44-b397-4e4d-8723-e4056d1cdd4c	ee983ed9-9a79-4d1c-964d-ff895913bf18	8264ad7a-2b65-45d3-a43b-3984ac3fbfeb	1	3900000.00	4650000.00	5100000.00	50000.00	400000.00	2026-07-05 09:38:00.968693+00	750000.00
fc5e6a11-6e6c-4b62-a0e9-e896e70b3b33	4e0e7ab3-2454-474d-bf69-cc28f0f28996	c731b160-33f3-4909-89f0-57b692bbcdfa	1	0.00	3400000.00	3950000.00	400000.00	150000.00	2026-07-05 02:40:34.568828+00	3400000.00
165c9f85-b5e8-422e-8c4a-ca4f4e88a8f2	e07971a5-6a8a-4f74-a8ff-76c56bc67324	0d8d9824-6586-4b48-a3e3-88369cf3ba40	1	0.00	2950000.00	3400000.00	0.00	450000.00	2026-07-05 09:35:45.130547+00	2950000.00
2166bde2-a600-46d2-86c6-37940ceaf460	0b24453b-6a12-404f-8341-b6d091bb985c	dfb5eeaa-9977-475d-bc30-33806efc81bd	1	0.00	4000000.00	4000000.00	0.00	0.00	2026-07-05 03:00:25.999166+00	4000000.00
f0d759aa-78df-4fbf-b38e-4fc5f47a029a	eb67e178-ca70-4335-a186-b2a4b3e2f5d6	d600e7ae-987c-4ff3-a832-c6d53363f0f8	1	0.00	5500000.00	5500000.00	0.00	0.00	2026-07-01 10:04:23.31971+00	5500000.00
b1310879-cec7-41ad-bed7-44fa90da6a60	8370e2c0-fec8-4374-b8c0-6db96a0d7bde	ba33ee60-a9e7-4677-a838-8f075f68ee49	1	0.00	5000000.00	5000000.00	0.00	0.00	2026-07-01 10:08:16.73886+00	5000000.00
513a744e-9bfc-4d2f-95b2-bc4fdfb17992	a9a2846a-a5dc-4da5-ba63-1bbc979affc4	478f4d15-3bcb-4bf0-b6dd-34a9a519277e	1	2229000.00	2450000.00	2500000.00	50000.00	0.00	2026-07-13 03:30:04.292559+00	221000.00
965dfa07-c7ad-4879-af0a-872828fe6d3f	40349857-4a5c-444b-b6b5-b543672e341d	eaffd37e-6587-42b9-8f84-2e2e453b54c1	1	1950000.00	2550000.00	2550000.00	0.00	0.00	2026-07-11 05:17:54.252948+00	600000.00
d4f9ee9a-0928-4aa3-8765-18c64dbebfe1	2996bb77-722b-4665-9c22-1393ef8ffa7e	5f144ff7-1856-4bc8-9ae1-2d29e19d3b62	3	1550000.00	2550000.00	2550000.00	0.00	0.00	2026-07-01 10:31:26.645302+00	1000000.00
282ddc6b-6941-433b-9ce0-58ec3e0db4f7	56ba6c7f-ba25-4064-9fb9-803589cb2305	65e6bf9d-0a1c-4c28-82b2-3191955ad56a	1	1950000.00	2450000.00	3450000.00	500000.00	500000.00	2026-07-15 02:21:23.714744+00	500000.00
41f9590a-c4d9-45dd-a4f8-340ff9ffc1e4	7e2844da-9037-4cbb-83b8-7f2cc41b66f4	da5e3449-60e0-4595-8f85-0a06ad00221e	1	0.00	2400000.00	2400000.00	0.00	0.00	2026-07-03 13:04:54.852193+00	2400000.00
235305ad-a69a-44d3-b5f4-8d016a325a3a	ddd28a81-2837-4bae-a431-b639d4c768a2	317886a5-7737-47a3-99d2-dbda3a4c8a82	1	1800000.00	2450000.00	3100000.00	250000.00	400000.00	2026-07-07 09:44:03.114185+00	650000.00
f910784e-a7e6-4813-8ee6-b8fbeb7ca4c9	ad00589c-49e7-4c2b-a74a-8341f59e4e82	5386430d-38a3-47de-8467-aa2fa1ace678	1	1950000.00	2450000.00	2450000.00	0.00	0.00	2026-07-09 01:41:13.287315+00	500000.00
1962d2b3-8b05-4fd9-b38c-a5ace258cbc3	c32a696d-08bc-428e-a7f6-dae05c47367a	c96a6773-ac4c-431f-a4aa-f86cabe7ba55	1	0.00	2100000.00	2100000.00	0.00	0.00	2026-07-12 06:04:29.687643+00	2100000.00
1e704425-b14a-4b8c-b384-35d577f8d54c	26dee3f0-359b-4087-87ef-7fc2ac3f9259	5bd7fbef-47a9-4866-a94e-cd260bb872ab	1	1950000.00	2550000.00	3650000.00	500000.00	600000.00	2026-07-13 03:41:23.623332+00	600000.00
fac0e473-d3fe-40ad-b99b-0e28f96a0a76	c32a696d-08bc-428e-a7f6-dae05c47367a	bd306e99-ffe2-4034-947a-ee59be8efb69	1	0.00	6250000.00	7150000.00	450000.00	450000.00	2026-07-12 06:04:29.687643+00	6250000.00
7d0f1174-6fdd-43d4-87cb-6419ee598a17	e1dd50c5-00d6-4b7c-9d18-0137ba53a4ca	781796a5-862f-4fc5-bc92-b5c7eba0c495	1	0.00	2650000.00	2650000.00	0.00	0.00	2026-07-13 09:05:01.278904+00	2650000.00
ac45c3a0-1cea-40bd-9160-feecc39c030b	2996bb77-722b-4665-9c22-1393ef8ffa7e	6e556179-e9ee-42f4-926f-864c61022ae2	1	1950000.00	2450000.00	2450000.00	0.00	0.00	2026-07-01 10:31:26.645302+00	500000.00
e73d78bb-41e5-4304-92e4-9167d8ac58a9	0a7083a8-130c-4b7e-875c-8d142ea8f416	3b81c90e-a925-48e1-9f4d-494fddd0f5b2	1	0.00	1550000.00	1800000.00	50000.00	200000.00	2026-07-14 12:54:39.786628+00	1550000.00
e2abfc72-663a-47f3-a2f9-476ea405fde8	0220951d-f77f-49a9-ae44-4ea1f576e59f	3b81c90e-a925-48e1-9f4d-494fddd0f5b2	1	0.00	1550000.00	2200000.00	250000.00	400000.00	2026-07-02 07:36:23.303803+00	1550000.00
36a7aa3b-28fa-42d8-be4d-5971f9c24f16	e200df92-5876-4bb2-96cf-7f1e944cc134	0e779dd7-facf-4857-ad0f-3ea4b2411f5e	1	2050000.00	2450000.00	2450000.00	50000.00	0.00	2026-07-03 13:12:52.243308+00	400000.00
7b32bf03-affe-4fdc-8061-67971508115e	78f0d5ea-91d0-4ff9-a4f1-f2b799e226e6	5b5fadbb-46c1-4d51-ad7a-99a83bd5b9f8	1	0.00	3150000.00	3700000.00	50000.00	500000.00	2026-07-08 10:38:06.302541+00	3150000.00
b2158eed-e157-4a88-b574-b7cfce2a08a6	a7869a6c-9b0e-404c-87ad-e6f17f58e30f	7b92628a-4f55-4d38-90da-ebdc074264da	1	0.00	3000000.00	3000000.00	50000.00	0.00	2026-07-10 02:04:17.316082+00	3000000.00
8bf2cb89-94bf-4b24-9c4d-78e6a2f5cee3	6eb90ac9-2cc2-4542-8f0e-bba3f7c321a5	564b2832-7476-4972-afee-6dd5c63e4446	1	0.00	4300000.00	4650000.00	75000.00	275000.00	2026-07-11 13:56:35.527838+00	4300000.00
3915efa0-1157-4588-b262-6c69a7947cba	62298a25-df7a-47c6-8cc8-7570396c4b32	6822128e-261a-4e88-8f42-aecfaea19a72	1	0.00	5600000.00	5600000.00	50000.00	0.00	2026-07-10 09:25:56.146374+00	5600000.00
ba8129c4-18a8-4a18-9261-807fc741d579	93bedef9-467f-4cf0-b6cd-02fbfc5a3e1c	33675935-9993-404c-842e-3cc836eefc01	1	0.00	2650000.00	3500000.00	300000.00	550000.00	2026-07-11 01:58:51.708886+00	2650000.00
1eea92b6-1190-407b-9654-b0bdd64b78cb	93b3c33e-2b78-4419-8a87-f4ded55aceb7	2db4df0a-1520-4053-8238-2c8dad1699f0	2	0.00	350000.00	450000.00	0.00	100000.00	2026-07-12 08:50:32.009734+00	350000.00
83e0d4cd-e1ea-4dad-a218-44c1d804fb5a	f6320716-1003-4f43-9edb-02dc7c71b61f	83526983-ae26-4d28-9da9-d1c45960f855	1	0.00	2350000.00	3100000.00	300000.00	450000.00	2026-07-11 15:18:16.485329+00	2350000.00
5a8a8d5d-ba49-4177-b240-fb57119bb399	b5042b42-35a6-4571-9c5f-154e361dab2a	dfde7bc2-cadc-49fc-b559-751fc3e0e5e4	1	0.00	3000000.00	3200000.00	50000.00	150000.00	2026-07-12 03:29:52.289995+00	3000000.00
30584849-5357-4f45-83b5-710fe1c3db3b	a7869a6c-9b0e-404c-87ad-e6f17f58e30f	88bda3a2-a6e2-406e-907a-ec7f0fdf11d4	1	1575000.00	1900000.00	1900000.00	0.00	0.00	2026-07-10 02:04:17.316082+00	325000.00
4bf9996b-5066-48df-aaf7-bb74d064a19c	4e0e7ab3-2454-474d-bf69-cc28f0f28996	88bda3a2-a6e2-406e-907a-ec7f0fdf11d4	1	1575000.00	1900000.00	2050000.00	50000.00	100000.00	2026-07-05 02:40:34.568828+00	325000.00
bf22316b-633a-40b1-94a8-e3eb2187d4d9	6a664274-b373-499d-a7a8-aaeff93b639f	df191515-db04-4f36-a664-78e4d84852d3	1	3650000.00	4300000.00	4300000.00	0.00	0.00	2026-07-13 09:09:45.372558+00	650000.00
d8f4a362-f929-4a4f-9680-24886e7d286c	6346f186-a186-4888-a08f-9834032b2f0d	c7baf1c1-accc-4456-a8b5-da6a31df5d5b	1	0.00	3350000.00	4250000.00	350000.00	550000.00	2026-07-14 06:06:48.558321+00	3350000.00
f0110880-0999-4937-9a93-43b577b45ea8	3eb6c9be-4ffc-4d0f-9a96-ee4dc1d0630e	42a7b3be-04e8-4f9c-a027-2b53605685f5	1	1550000.00	1950000.00	2400000.00	50000.00	400000.00	2026-07-14 10:07:14.689005+00	400000.00
11aa5fd5-840b-4191-8936-d9397c304818	96e37eb6-10d8-425c-81ff-101bc580fac1	e6fb0a21-4d92-4640-a7ad-2c1da6738f37	1	2550000.00	4000000.00	4300000.00	50000.00	250000.00	2026-07-02 08:41:22.636276+00	1450000.00
8aa4c3c5-d824-44b6-8377-60687fb4d829	69f11956-9f1f-4618-89b6-44ddba45fca8	e6fb0a21-4d92-4640-a7ad-2c1da6738f37	1	2550000.00	4000000.00	4700000.00	0.00	700000.00	2026-07-04 07:37:23.160192+00	1450000.00
8cbdb8ff-bde7-479f-af58-9326ee5a1a06	4bf61dc3-93a7-4f2b-b3c2-2c1780567c68	e6fb0a21-4d92-4640-a7ad-2c1da6738f37	1	2550000.00	4000000.00	4300000.00	50000.00	250000.00	2026-07-08 08:47:32.008028+00	1450000.00
59b22928-7eea-491a-9bb0-63dbf4c54651	41f7ca97-334a-498a-a729-6f478fa5d249	4cc2ff8c-67cd-4db3-9555-838788360a18	1	2200000.00	2650000.00	2650000.00	0.00	0.00	2026-07-07 01:24:02.595291+00	450000.00
80f889bb-90d5-403e-baf7-363a4bd9ee06	40349857-4a5c-444b-b6b5-b543672e341d	a67d3788-c33e-4c00-b29c-b4d1706a8d23	1	1950000.00	2550000.00	2600000.00	50000.00	0.00	2026-07-11 05:17:54.252948+00	600000.00
522df369-b5a4-407d-94c6-c981f198592e	9eb222d2-5125-46cc-aa77-f1fa8d78c44d	b7675f90-bc8d-4cf4-a47f-4bf900671f33	1	1550000.00	1950000.00	1950000.00	0.00	0.00	2026-07-15 02:12:07.932794+00	400000.00
e73d4734-3c29-4a2f-b628-d63880b11ad2	7414fdc0-6470-4ed3-808f-6f7c882979c6	972aa697-a04d-4185-bda5-0cbd95b48754	1	1750000.00	2250000.00	3100000.00	75000.00	775000.00	2026-07-15 02:32:19.635189+00	500000.00
3d7a9e22-cbe7-4d23-8af4-f2e9afed04bb	73e3ae74-a28b-4748-b165-a5f4aef93bef	1f9a5e3e-f5d2-4348-bc64-39321bce1f14	1	0.00	3200000.00	4500000.00	150000.00	1150000.00	2026-07-15 06:27:47.082763+00	3200000.00
\.


--
-- Data for Name: penjualan_pembayaran; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.penjualan_pembayaran (id, penjualan_id, jumlah, metode, catatan, created_at, foto_url) FROM stdin;
cecaf43d-6292-48ef-9ac9-58846d2af60c	eb67e178-ca70-4335-a186-b2a4b3e2f5d6	4300000.00	transfer	DP awal	2026-07-01 10:04:23.14079+00	\N
d7ae15d7-4d66-46a2-8f07-b42315745c3b	8370e2c0-fec8-4374-b8c0-6db96a0d7bde	1400000.00	transfer	DP awal	2026-07-01 10:08:16.367557+00	\N
48faec20-855c-424a-bb01-dff3223eae9e	c09c3819-fac6-4087-88f2-b5907ac64d7d	4600000.00	cash	\N	2026-07-02 01:07:01.375986+00	\N
6cb458e2-ff27-4f51-a331-408d7e2ba513	96e37eb6-10d8-425c-81ff-101bc580fac1	4300000.00	cash	\N	2026-07-02 08:41:22.409801+00	\N
9ba39731-150b-4271-8b1c-d56392bff6b0	f8625d3e-cf1f-4ce5-8984-579329034220	5500000.00	transfer	\N	2026-07-03 05:12:03.108368+00	\N
224c4207-1fef-4499-b2da-bd73415598c3	7e2844da-9037-4cbb-83b8-7f2cc41b66f4	2400000.00	cod	\N	2026-07-03 13:04:54.284366+00	\N
e8fd24c1-5e29-4e47-8b8e-8da4e6de32d6	69f11956-9f1f-4618-89b6-44ddba45fca8	4700000.00	transfer	\N	2026-07-04 07:37:22.691285+00	\N
f1e45c98-98fe-4e86-97f9-dcff7ebefeed	45549a4f-0075-43d1-8772-fef88ba1d0d4	3000000.00	transfer	\N	2026-07-04 07:41:16.654153+00	\N
f476d85a-2832-4909-8dee-51c59902606e	1df5098b-8cf4-4dd4-bfaa-b9354f0f956f	2200000.00	transfer	\N	2026-07-04 12:52:15.037328+00	\N
949d3849-80a6-4876-aaf9-392dec37f42c	b2a87156-5268-4901-a21c-a713b4f91821	4100000.00	transfer	\N	2026-07-05 02:51:23.490076+00	\N
84bd1a32-6c86-4a47-b872-d6a15eabb91a	2996bb77-722b-4665-9c22-1393ef8ffa7e	10100000.00	transfer	\N	2026-07-05 04:47:00.304503+00	\N
fb5ef1a9-ecd7-416f-b557-50e0e1a70dd6	0220951d-f77f-49a9-ae44-4ea1f576e59f	2200000.00	transfer	\N	2026-07-05 04:47:45.252664+00	\N
66296f04-5111-48e3-bd0c-938f523221df	e200df92-5876-4bb2-96cf-7f1e944cc134	2450000.00	transfer	\N	2026-07-05 04:51:08.392673+00	\N
5936b823-1ddf-45b4-a978-ae8c9da0bec4	e07971a5-6a8a-4f74-a8ff-76c56bc67324	8050000.00	transfer	\N	2026-07-05 09:35:44.632093+00	\N
333a49bb-f6e1-496f-8d88-8928203d55b5	ee983ed9-9a79-4d1c-964d-ff895913bf18	5100000.00	transfer	\N	2026-07-05 09:38:00.710756+00	\N
65a61324-a9f4-482b-ae5e-a614e9e2f91e	4e0e7ab3-2454-474d-bf69-cc28f0f28996	6000000.00	cod	Pelunasan	2026-07-05 12:50:38.351639+00	\N
f9d593a3-2d60-4ed6-a851-b57b4ec5e605	41f7ca97-334a-498a-a729-6f478fa5d249	2650000.00	transfer	\N	2026-07-07 01:24:02.42713+00	\N
366de08e-1dd9-4baa-b6b2-4f5d118e8deb	dd9f3c81-324e-4730-a3ce-447a5b0a101f	2650000.00	transfer	\N	2026-07-07 04:23:26.55358+00	\N
c1d12b4b-8af7-4de1-aa43-bff7ca4c392a	ddd28a81-2837-4bae-a431-b639d4c768a2	3100000.00	transfer	\N	2026-07-08 03:45:12.918074+00	\N
e90076dc-a142-4b8a-9643-7d89f3740a9b	78f0d5ea-91d0-4ff9-a4f1-f2b799e226e6	1700000.00	transfer	DP awal	2026-07-08 10:38:06.132788+00	\N
48668a3d-55fc-4fe3-a65f-4a9ec9deb0c9	4bf61dc3-93a7-4f2b-b3c2-2c1780567c68	4300000.00	transfer	\N	2026-07-09 01:29:20.278242+00	\N
7486fd2e-575a-4ae5-a0a6-38e430711c0b	0b24453b-6a12-404f-8341-b6d091bb985c	4000000.00	transfer	Pelunasan	2026-07-09 04:12:48.99235+00	\N
d96ab5f8-ae87-4e80-b122-bda3e9557a5f	a7869a6c-9b0e-404c-87ad-e6f17f58e30f	4900000.00	transfer	\N	2026-07-10 02:04:17.229037+00	\N
e388d3b5-1460-4b0b-8ccb-997bdda4469f	62298a25-df7a-47c6-8cc8-7570396c4b32	5600000.00	cod	\N	2026-07-10 09:25:56.073986+00	\N
47277da1-beeb-4ab5-84af-4e88167099d1	93bedef9-467f-4cf0-b6cd-02fbfc5a3e1c	3500000.00	transfer	\N	2026-07-11 02:46:04.794095+00	\N
6222a4fb-c25f-4ad4-a657-d6931fa9625a	40349857-4a5c-444b-b6b5-b543672e341d	5150000.00	transfer	\N	2026-07-11 11:21:26.392603+00	\N
5669cbdd-b0a5-49c7-9416-63f40bbdfd6a	c1f316de-4fcc-4ae3-acf9-f1a81f839b55	2800000.00	transfer	Pelunasan	2026-07-11 13:40:18.485189+00	\N
9e612a5f-dbb9-4f00-9ac0-f31386d7465c	2d082807-2704-442a-a2ab-963355c9e593	1700000.00	transfer	\N	2026-07-11 13:43:07.020525+00	\N
bc75cc32-46c7-4377-839a-4ba23e25bd5f	6eb90ac9-2cc2-4542-8f0e-bba3f7c321a5	4650000.00	transfer	\N	2026-07-11 13:56:35.386044+00	\N
d57e6abf-7617-4710-9b75-cbb62b31991e	f6320716-1003-4f43-9edb-02dc7c71b61f	4000000.00	transfer	DP awal	2026-07-11 15:18:16.3526+00	\N
f6a53499-b48f-4872-9a59-85b08855b215	b5042b42-35a6-4571-9c5f-154e361dab2a	3200000.00	cod	Pelunasan	2026-07-12 05:45:42.567868+00	\N
c8252c25-ada5-476c-be67-89b078f4aecf	f6320716-1003-4f43-9edb-02dc7c71b61f	1600000.00	transfer	\N	2026-07-12 07:24:05.514734+00	\N
06db6210-7786-42ed-afff-db52929eb1e1	93b3c33e-2b78-4419-8a87-f4ded55aceb7	900000.00	transfer	\N	2026-07-12 08:50:31.769998+00	\N
ba27d805-b0a3-4246-9411-ae141fb5ffb3	a9a2846a-a5dc-4da5-ba63-1bbc979affc4	2500000.00	transfer	\N	2026-07-13 03:30:04.213351+00	\N
7d8b7f09-623c-4a75-9b16-48a7e6538234	6a6ee084-5a30-4830-be83-709bb2ddb06e	1700000.00	transfer	\N	2026-07-13 09:30:42.678312+00	\N
c752b55f-5401-49a4-90d4-4f680f28ae32	6a664274-b373-499d-a7a8-aaeff93b639f	4300000.00	transfer	\N	2026-07-13 12:25:51.670127+00	\N
6bd938cd-f8f4-4e00-ad77-54e47b8b24ef	fcec19b5-d203-45dd-abcf-60ee458f6624	2450000.00	transfer	\N	2026-07-13 12:26:02.689764+00	\N
af97765a-c630-4988-ae0e-0e253b00a454	c6d4f560-03a0-43b7-80f2-9998439e57c1	4350000.00	transfer	\N	2026-07-13 12:26:21.200245+00	\N
57a0f810-593c-4d36-990e-26ca6714d459	70c0c8d3-7fbd-4523-9c4f-337e21e2abff	3400000.00	cod	\N	2026-07-14 05:30:50.507038+00	\N
34525385-439d-4900-92e4-4b604aeda3d5	c32a696d-08bc-428e-a7f6-dae05c47367a	9250000.00	cod	\N	2026-07-14 05:31:05.081749+00	\N
0da229f6-07bd-4d99-a5e5-a7b3ccab0598	6346f186-a186-4888-a08f-9834032b2f0d	9300000.00	transfer	\N	2026-07-14 06:06:48.461085+00	\N
f84c88ef-be12-4f8c-aef4-04146681cc2f	3eb6c9be-4ffc-4d0f-9a96-ee4dc1d0630e	2400000.00	transfer	Pelunasan	2026-07-14 10:07:39.715482+00	\N
757b1a4c-28e2-47fd-97e4-8e89c135eb5e	3132178e-478b-423f-931b-663978e078ff	2550000.00	transfer	\N	2026-07-14 12:11:46.73131+00	\N
908f5505-66e3-484d-87b1-b06b789cdd31	e1dd50c5-00d6-4b7c-9d18-0137ba53a4ca	2650000.00	transfer	\N	2026-07-14 12:12:56.862599+00	\N
793bea8b-3a5a-43f6-8ffa-f88642b37cd6	0a7083a8-130c-4b7e-875c-8d142ea8f416	1800000.00	transfer	\N	2026-07-14 12:54:39.629239+00	\N
60b1f22d-bc42-4b13-9467-d17c095cfa7c	71329321-428a-4f6d-a7c0-93c542f8c55c	6500000.00	transfer	Pelunasan	2026-07-14 16:05:41.700562+00	\N
c832e1a0-b409-4d11-a6ed-ac00058c1f75	640b4798-032b-4b39-8813-1bda1aae7c19	5400000.00	transfer	\N	2026-07-15 02:10:59.638629+00	\N
da129bef-338a-4f8e-abe6-d2fe1143f57a	9eb222d2-5125-46cc-aa77-f1fa8d78c44d	1950000.00	transfer	\N	2026-07-15 02:12:07.853518+00	\N
d3b37ab9-a301-48ab-b4c3-d2125b105ff3	7414fdc0-6470-4ed3-808f-6f7c882979c6	3100000.00	cod	\N	2026-07-15 05:29:16.938815+00	\N
ba6a673d-c570-4d29-bf81-aefa11ffc451	74a3522e-c330-4a16-b2cc-659cac8c0dae	2850000.00	transfer	\N	2026-07-16 01:27:51.184633+00	\N
05548cdd-36ff-4f7b-bb60-e1669ff599b6	73e3ae74-a28b-4748-b165-a5f4aef93bef	4500000.00	transfer	\N	2026-07-16 02:53:34.335639+00	\N
88b8e3fa-0c1f-4489-9d16-34de5595ee67	4d43acf8-453e-48d2-a487-5bca0f71794b	4700000.00	transfer	\N	2026-07-16 03:32:45.699869+00	\N
1ca61dee-aacd-4c08-bfb3-972eb8811a74	9d836a7d-c3fa-47e8-8551-ac4c842e8c91	2700000.00	transfer	\N	2026-07-16 05:23:37.383752+00	\N
94955501-fc86-47dc-8777-a42f4575e647	56ba6c7f-ba25-4064-9fb9-803589cb2305	3450000.00	transfer	\N	2026-07-16 06:53:15.680827+00	\N
6465ac99-d649-4d61-9103-7de76cc5c44e	ad00589c-49e7-4c2b-a74a-8341f59e4e82	2450000.00	transfer	\N	2026-07-16 07:34:19.823746+00	\N
227c0462-dcde-4e9c-8ad7-feacaa17a3b6	85e9a72d-7090-427b-af77-82a698898810	6700000.00	transfer	\N	2026-07-16 07:47:26.360339+00	\N
9b47dd2a-03e1-4b1e-81fd-ef8ae60c9fde	7fe60d15-962f-4d6e-9fa1-5717352a72e6	5400000.00	transfer	\N	2026-07-16 10:49:08.428505+00	\N
19f4b2ef-d0d8-40cd-a344-853791c607a1	b0f764f1-77d8-44ee-b91a-74cd3da82e9f	4100000.00	transfer	\N	2026-07-16 10:52:00.801021+00	\N
45504d7d-42ec-4c0d-9038-70b5a27767bb	aa5c53a8-54e0-4628-94a6-0c50a6681163	6500000.00	transfer	\N	2026-07-16 11:11:38.504998+00	\N
\.


--
-- Data for Name: produk; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.produk (id, nama, kategori, satuan, harga_modal, harga_katalog, stok, stok_minimum, deskripsi, aktif, created_at, updated_at, foto_url) FROM stdin;
68ed7d49-0cef-459c-bafb-43769043bbf2	DIVAN MEWAH EKSLUSIF NO1 SANDARAN 250 - PINK	DIVAN	unit	0.00	3100000.00	0	0	\N	t	2026-06-26 14:23:59.244211+00	2026-06-26 14:23:59.244211+00	\N
c4b1604b-a903-4229-a2cf-d32caf7dd1f1	DIVAN MEWAH EXSLUSIF 200 - CREAM	DIVAN	unit	0.00	4000000.00	0	0	\N	t	2026-06-26 14:23:59.244211+00	2026-06-26 14:23:59.244211+00	\N
7bf65892-b56f-4d60-92be-6bd23a8cf5df	DIVAN MEWAH KOLAM NO 2 - ABU-ABU	DIVAN	unit	0.00	3100000.00	0	0	\N	t	2026-06-26 14:23:59.244211+00	2026-06-26 14:23:59.244211+00	\N
f07c599e-f4fb-4785-8e96-65f4a7237650	DIVAN MEWAH LIST GOLD NO 1 - MERAH	DIVAN	unit	0.00	2550000.00	0	0	\N	t	2026-06-26 14:23:59.244211+00	2026-06-26 14:23:59.244211+00	\N
ab41f151-2c93-4aa7-8033-b8556c655820	DIVAN KOLAM NO  1 - ABU-ABU	DIVAN	unit	2150000.00	3200000.00	1	0		t	2026-06-26 14:23:59.244211+00	2026-07-05 03:12:17.699095+00	\N
d59a37fe-ecbb-4572-bc88-f8b8250a6304	AYUNAN SEDANG - PUTIH MERAH	AYUNAN ROTAN	unit	1250000.00	1700000.00	0	0		t	2026-06-26 14:23:59.244211+00	2026-07-09 01:55:01.103731+00	\N
c2dd5aca-10a4-433b-8163-36cc679cf8d4	AYUNAN SEDANG PUTIH	AYUNAN ROTAN	unit	1250000.00	1700000.00	1	0		t	2026-06-26 14:23:59.244211+00	2026-07-03 07:35:42.555056+00	\N
ce78e6f5-3dce-4f3c-9c3e-0516e66b0c5d	BUFFET TV MULTIPLEKS - PUTIH	BUFFET TV	unit	0.00	2400000.00	0	0		t	2026-06-26 14:23:59.244211+00	2026-07-09 02:08:10.990268+00	\N
29ca7e81-9c9a-4f32-ac00-9e9240f16a65	DIVAN MEWAH NO 2 LACI - ABU-ABU	DIVAN	unit	0.00	2750000.00	0	0	\N	t	2026-06-26 14:23:59.244211+00	2026-06-29 07:51:34.806049+00	\N
6f4a47b7-d8aa-4746-829d-1157de1bbf00	AYUNAN SEDANG - UNGU	AYUNAN ROTAN	unit	1250000.00	1700000.00	0	0		t	2026-06-26 14:23:59.244211+00	2026-07-09 01:55:14.264965+00	\N
4f6d31ba-c2cf-46a2-903d-929f7d1e4bd4	DIVAN JEPARA NO 1 - MERAH	DIVAN	unit	0.00	2900000.00	0	0		t	2026-06-26 14:23:59.244211+00	2026-07-09 04:15:18.133586+00	\N
6d8b5b5f-bf75-4f21-b375-a28a6a502099	DIVAN KOLAM NO 2 - COJKLAT	DIVAN	unit	2150000.00	2650000.00	1	0		t	2026-06-26 14:23:59.244211+00	2026-07-04 07:41:17.349947+00	\N
c1119760-37cd-47a3-8c80-28464ba0d594	DIVAN MEWAH EKSLUSIF NO 1 TINGGI 250 CM - CREAM	DIVAN	unit	2500000.00	3100000.00	1	0		t	2026-06-26 14:23:59.244211+00	2026-07-05 03:42:13.383415+00	\N
441b3658-d473-4687-93b8-f1c5a170d1ea	BUFFET TV MDF LECET	BUFFET TV	unit	1000000.00	1000000.00	1	0		t	2026-06-26 14:23:59.244211+00	2026-07-03 07:37:26.783359+00	\N
b9f5db83-c509-47bf-987b-a94e97875714	LEMARI HIAS PINK	LEMARI	unit	1000000.00	1000000.00	2	0		t	2026-06-26 14:23:59.244211+00	2026-07-05 01:54:51.841998+00	\N
0b996cea-99f1-484f-92c0-05f6fd40f278	AYUNAN SEDANG - COKLAT	AYUNAN ROTAN	unit	1250000.00	1700000.00	1	0		t	2026-06-26 14:23:59.244211+00	2026-07-03 07:33:44.954489+00	\N
b20bd760-1bac-4c93-b6ec-b227792e0fb7	DIVAN KOLAM RATA 200X200 - ABU-ABU	DIVAN	unit	2150000.00	2900000.00	1	0		t	2026-06-26 14:23:59.244211+00	2026-07-03 08:12:49.423705+00	\N
8c09110b-c9cc-4298-b97e-7fe9100530a7	DIPAN SANDARAN LURUS NO1 PUTIH	DIVAN	unit	0.00	2350000.00	0	0		t	2026-06-26 14:23:59.244211+00	2026-07-09 05:35:15.092939+00	\N
edd7b36c-43cf-444f-b6cd-f0865549cbb8	AYUNAN SEDANG - PUTIH	AYUNAN ROTAN	unit	1250000.00	1700000.00	0	0		t	2026-06-26 14:23:59.244211+00	2026-07-09 01:54:49.708953+00	\N
8f1037fa-5841-4310-b208-eeab681f7dd7	LEMARI HIAS  - UNGU	LEMARI	unit	1000000.00	1000000.00	2	0		t	2026-06-26 14:23:59.244211+00	2026-07-05 01:54:39.999896+00	\N
f0e94741-80ae-4c65-8a36-6f7c13000103	DIVAN JEPARA NO 1 - PINK FANTA	DIVAN	unit	0.00	2900000.00	0	0		t	2026-06-26 14:23:59.244211+00	2026-07-09 04:14:56.352034+00	\N
f7b48160-8677-49e2-8f4c-145be2156fc2	BOXI BNAIK NO 1 - ABU ABU	BOXY	unit	2050000.00	2450000.00	0	0		t	2026-06-26 14:23:59.244211+00	2026-07-09 02:01:44.608865+00	\N
49899fd9-cbfd-408d-a56a-a890634ded18	AYUNAN SEDANG MERAH 	AYUNAN ROTAN	unit	1250000.00	1700000.00	1	0		t	2026-06-26 14:23:59.244211+00	2026-07-03 07:34:51.290062+00	\N
bd500403-2dd4-456b-9496-46552eb853aa	DIVAN KOLAM NO 3 - PINK	DIVAN	unit	1700000.00	2350000.00	1	0		t	2026-06-26 14:23:59.244211+00	2026-07-05 03:41:53.70863+00	\N
023a968c-4ba4-4be8-bb95-9b09b7281801	AYUNAN JUMBO - PUTIH	AYUNAN ROTAN	unit	1700000.00	2200000.00	0	0		t	2026-06-26 14:23:59.244211+00	2026-07-09 01:54:25.840925+00	\N
48a2d447-8c9e-48dc-a272-29dea9ed125e	DIPAN MEWAH HELLO KITTY NO1	DIVAN	unit	0.00	2550000.00	0	0		t	2026-06-26 14:23:59.244211+00	2026-07-09 03:52:29.531368+00	\N
5143fe8b-4e73-45a8-8b74-8652955b912a	DIVAN KOLAM NO  1 - COKLAT	DIVAN	unit	0.00	3200000.00	0	0		t	2026-06-26 14:23:59.244211+00	2026-07-09 05:32:26.821934+00	\N
97db2a81-faaf-4703-937c-9ab671259d1d	DIVAN KOLAM NO 1 - CREAM	DIVAN	unit	0.00	3200000.00	0	0		t	2026-06-26 14:23:59.244211+00	2026-07-09 05:36:14.736914+00	\N
6220d4fa-e2d5-4243-8d8d-8a2a3d183d52	DIVAN KOLAM NO 2 - COKLAT 	DIVAN	unit	0.00	2650000.00	0	0		t	2026-06-26 14:23:59.244211+00	2026-07-09 05:37:01.301356+00	\N
a1777a39-a8a3-4e6e-947f-d455c6cc1909	DIVAN SANDARAN LURUS BIRU NO1	DIVAN	unit	0.00	2350000.00	0	0		t	2026-06-26 14:23:59.244211+00	2026-07-09 05:38:50.145502+00	\N
d850794e-233f-4737-a999-e3e9d8eb8607	DIPAN SANDARAN LURUS UNGU NO1	DIVAN	unit	0.00	2350000.00	0	0		t	2026-06-26 14:23:59.244211+00	2026-07-09 05:40:08.250152+00	\N
869835be-0736-49c1-922a-01cafd24c0a2	DIVAN MEWAH EKSLUSIF NO 1 - CREAM	DIVAN	unit	0.00	2700000.00	0	0		t	2026-06-26 14:23:59.244211+00	2026-07-09 08:36:42.673704+00	\N
10fb5901-8f71-48f5-b4a0-a25b2d6e085e	DIVAN KOLAM RATA NO 2 - ABU-ABU	DIVAN	unit	0.00	2650000.00	0	0		t	2026-06-26 14:23:59.244211+00	2026-07-09 08:36:12.833539+00	\N
e4ea3486-defb-49ee-9324-1dabc7ea5e70	DIVAN MEWAH NO 1 - BIRU TUA	DIVAN	unit	0.00	2550000.00	0	0		t	2026-06-26 14:23:59.244211+00	2026-07-09 08:38:01.701717+00	\N
52445455-520d-4ef7-a67f-7d7a6f5c68cf	DIVAN MEWAH NO 1 - COKLAT	DIVAN	unit	0.00	2550000.00	0	0		t	2026-06-26 14:23:59.244211+00	2026-07-09 08:39:25.715762+00	\N
9f57cc47-7248-4bbd-86ad-d494c3292501	DIVAN MEWAH NO 1 - CREAM	DIVAN	unit	0.00	2550000.00	0	0		t	2026-06-26 14:23:59.244211+00	2026-07-09 08:43:05.37583+00	\N
d50dde9e-e5b8-448a-b5ba-2721bec91ae3	DIVAN MEWAH NO 1 - PINK FANTA	DIVAN	unit	0.00	2550000.00	0	0		t	2026-06-26 14:23:59.244211+00	2026-07-09 08:45:18.332215+00	\N
c01b4832-00fa-47a6-b4e7-45881104eaba	DIVAN MEWAH NO 1 - SILVER	DIVAN	unit	0.00	2550000.00	0	0		t	2026-06-26 14:23:59.244211+00	2026-07-09 08:46:09.366196+00	\N
1882e29f-d7a6-4eb3-a7f0-376a9e018ec6	DIVAN MEWAH NO 2 - CREAM	DIVAN	unit	0.00	2450000.00	0	0		t	2026-06-26 14:23:59.244211+00	2026-07-09 08:47:34.652013+00	\N
9721b833-731c-4406-a3b4-fc7f41b7f5d2	DIVAN MEWAH NO 2 - MERAH	DIVAN	unit	0.00	2450000.00	0	0		t	2026-06-26 14:23:59.244211+00	2026-07-09 08:48:04.599548+00	\N
75e588a0-612e-44a7-b451-13500d0aaf72	DIVAN MEWAH NO 2 - PINK	DIVAN	unit	0.00	2450000.00	0	0		t	2026-06-26 14:23:59.244211+00	2026-07-09 08:48:52.279164+00	\N
200d5b09-a57b-4474-aa0f-e8b9a54e7737	DIVAN MEWAH NO 2 - PUTIH	DIVAN	unit	0.00	2450000.00	0	0		t	2026-06-26 14:23:59.244211+00	2026-07-09 08:49:15.737961+00	\N
8eeb043d-6cbc-486b-a12e-741f29dcb6e6	DIVAN MINIMALIS NO 1 - COKLAT	DIVAN	unit	0.00	1950000.00	0	0		t	2026-06-26 14:23:59.244211+00	2026-07-09 08:57:10.396061+00	\N
2062d0f7-6131-4d75-b39a-8a5c7fc65fbd	DIVAN MINIMALIS NO 1 - CREAM	DIVAN	unit	0.00	1950000.00	0	0		t	2026-06-26 14:23:59.244211+00	2026-07-09 08:57:37.743571+00	\N
0341b9b7-e7c6-44b3-b910-a75364a3e1ca	DIVAN MINIMALIS NO 1 - GOLD	DIVAN	unit	0.00	1950000.00	0	0		t	2026-06-26 14:23:59.244211+00	2026-07-09 08:58:20.012017+00	\N
3b368920-c622-4d10-b2d7-0fae53baeb12	DIVAN MINIMALIS NO 1 PAKAI LACI - GOLD	DIVAN	unit	0.00	2250000.00	0	0	\N	t	2026-06-26 14:23:59.244211+00	2026-06-26 14:23:59.244211+00	\N
292b0924-8b47-4a1d-ab29-827ed9abb341	DIVAN MINIMALIS OSCAR NO 2 - PINK	DIVAN	unit	0.00	1850000.00	0	0	\N	t	2026-06-26 14:23:59.244211+00	2026-06-26 14:23:59.244211+00	\N
29a8b157-c204-4ab0-8c5b-15d33acf911d	DIVAN SANDARAN EXSLUSIF NO 1 LACI - PINK FANTA	DIVAN	unit	0.00	2750000.00	0	0	\N	t	2026-06-26 14:23:59.244211+00	2026-06-26 14:23:59.244211+00	\N
2c63919d-7358-4aa5-9510-a58f2a96a6af	LEMARI BESI 2 PINTU - PUTIH	LEMARI BESI	unit	0.00	2100000.00	0	0	\N	t	2026-06-26 14:23:59.244211+00	2026-06-26 14:23:59.244211+00	\N
34930d76-f816-47a6-b256-bf5e07b6ee72	AYUNAN JUMBO - MERAH	AYUNAN ROTAN	unit	1700000.00	2200000.00	0	0		t	2026-06-26 14:23:59.244211+00	2026-07-11 07:46:08.507475+00	\N
b5837887-d08a-41f4-8920-af2e6b89cf71	DIVAN MEWAH NO 1 - PINK	DIVAN	unit	0.00	2550000.00	0	0		t	2026-06-26 14:23:59.244211+00	2026-07-14 03:43:11.639587+00	\N
4bbec497-db20-4b22-99d6-4be071217f6c	AYUNAN JUMBO - BIRU	AYUNAN ROTAN	unit	1700000.00	2200000.00	1	0		t	2026-06-26 14:23:59.244211+00	2026-07-16 06:12:19.549586+00	\N
155dfc98-a1bb-46a8-abfe-5fcad54bc6b8	DIVAN MEWAH NO 1 - MERAH	DIVAN	unit	0.00	2450000.00	0	0		t	2026-06-26 14:23:59.244211+00	2026-07-14 03:43:11.474963+00	\N
9a2e9f88-c9c4-4fe7-a63d-f6b5cc824bcf	BOXI  COMFORTA NO 2 - PUTIH	BOXY	unit	2400000.00	2950000.00	0	0		t	2026-06-26 14:23:59.244211+00	2026-07-11 07:50:52.125703+00	\N
9b3049bf-0763-4f61-aaf3-9c13380a2c97	DIVAN MEWAH NO 2 - ABU-ABU	DIVAN	unit	0.00	2450000.00	0	0		t	2026-06-26 14:23:59.244211+00	2026-07-13 03:48:11.615212+00	\N
470a813e-e80b-4f26-a147-324fdaa316db	DIPAN MINIMALIS GARIS GARIS PUTIH NO1	DIVAN	unit	1550000.00	1950000.00	0	0		t	2026-06-26 14:23:59.244211+00	2026-07-15 03:50:28.150125+00	\N
e67307cd-3880-46bb-8bf6-27c68e0b65cf	DIVAN MEWAH LIST GOLD NO 2 - MERAH	DIVAN	unit	1950000.00	2450000.00	0	0		t	2026-06-26 14:23:59.244211+00	2026-07-15 04:02:47.065149+00	\N
8ae4f3e2-7802-4e39-97f2-aa7cee615352	DIVAN MINIMALIS NO 1 - PUTIH	DIVAN	unit	0.00	1950000.00	1	0		t	2026-06-26 14:23:59.244211+00	2026-07-16 01:14:01.65595+00	\N
34fefb75-a56c-499a-8b52-fc69a7887b3a	AYUNAN JUMBO - HIJAU	AYUNAN ROTAN	unit	1700000.00	2200000.00	1	0		t	2026-06-26 14:23:59.244211+00	2026-07-16 10:30:10.773172+00	\N
95c4990d-5994-4468-a8a6-05e89e116524	DIPAN EXPKLUSIF PINK BEBY NO1	DIVAN	unit	2150000.00	2300000.00	0	0		t	2026-06-26 14:23:59.244211+00	2026-07-16 05:19:31.93703+00	\N
8059d0f8-4f08-42ef-ba5f-a22f0e80085c	LEMARI BESI 3 PINTU - PUTIH	LEMARI BESI	unit	0.00	2400000.00	0	0	\N	t	2026-06-26 14:23:59.244211+00	2026-06-26 14:23:59.244211+00	\N
c0f432aa-2fb6-4c42-82e8-9a706b102bb1	MATRAS COMFORTA NO 2 - COKLAT	MATRAS	unit	0.00	2400000.00	0	0	\N	t	2026-06-26 14:23:59.244211+00	2026-06-26 14:23:59.244211+00	\N
42437d8b-bbeb-4e9f-baa9-a9f3381182de	MATRAS COMFORTA NO 2 - PUTIH	MATRAS	unit	0.00	2400000.00	0	0	\N	t	2026-06-26 14:23:59.244211+00	2026-06-26 14:23:59.244211+00	\N
ee2ef5ab-785c-4db6-a382-bf4d13b9026c	MATRAS MURAKI NO 1 - MERAH	MATRAS	unit	0.00	1700000.00	0	0	\N	t	2026-06-26 14:23:59.244211+00	2026-06-26 14:23:59.244211+00	\N
e5f16156-ac9f-4331-844f-49fd4319e3a3	MATRAS PROCELLA NO 1 PILLOW - COKLAT	MATRAS	unit	0.00	2500000.00	0	0	\N	t	2026-06-26 14:23:59.244211+00	2026-06-26 14:23:59.244211+00	\N
0b0930ab-00c8-4308-b4b4-21a40ce27fa5	MATRAS PROCELLA NO 1 PILLOW - MERAH	MATRAS	unit	0.00	2500000.00	0	0	\N	t	2026-06-26 14:23:59.244211+00	2026-06-26 14:23:59.244211+00	\N
9b28a840-a92b-446f-af08-6d79e9c60cd5	MEJA KANTOR INFORMA BEKAS - COKLAT	MEJA KANTOR	unit	0.00	1500000.00	0	0	\N	t	2026-06-26 14:23:59.244211+00	2026-06-26 14:23:59.244211+00	\N
e5911521-8c78-4219-8fca-6178a109873d	MEJA MAKAN ROTAN 4 KURSI - ABU-ABU	MEJA MAKAN ROTAN	unit	0.00	1700000.00	0	0	\N	t	2026-06-26 14:23:59.244211+00	2026-06-26 14:23:59.244211+00	\N
acd0989b-6843-4653-aac4-a9de26256c7e	MEJA MAKAN ROTAN 4 KURSI - HITAM	MEJA MAKAN ROTAN	unit	0.00	1700000.00	0	0	\N	t	2026-06-26 14:23:59.244211+00	2026-06-26 14:23:59.244211+00	\N
48397e3b-2e37-41e5-9649-b273c545cf67	JEPARA SUDUT MAWAR - COKLAT	KURSI JATI	unit	0.00	4000000.00	0	0		t	2026-06-26 14:23:59.244211+00	2026-06-29 08:37:57.887157+00	\N
39fc0817-fae5-4e63-ae7e-b20a26da0129	KURSI JEPARA SUDUT MAHKOTA - COKLAT GOLD	KURSI JATI	unit	0.00	4000000.00	0	0		t	2026-06-26 14:23:59.244211+00	2026-06-29 08:38:06.92151+00	\N
c96d81cf-fe54-45eb-ac99-47baff455a38	KURSI JEPARA SUDUT MAWAR - COKLAT GOLD	KURSI JATI	unit	0.00	4000000.00	0	0		t	2026-06-26 14:23:59.244211+00	2026-06-29 08:38:16.912731+00	\N
1d3a7f10-1d8b-4fcf-a174-49dc4a999b7a	KURSI SUDUT JEPARA - COKLAT	KURSI JATI	unit	0.00	4000000.00	0	0		t	2026-06-26 14:23:59.244211+00	2026-06-29 08:38:25.665838+00	\N
439244eb-9d02-4ade-9530-c0d5a23ba2e5	MEJA MAKAN GRANIT 4 KURSI IMPORTA - COFFE	MEJA MAKAN	unit	2229000.00	2450000.00	4	0		t	2026-06-26 14:23:59.244211+00	2026-07-05 02:35:16.038345+00	\N
d09fe919-25fa-4c6a-98ab-e372d4c9cd58	MEJA MAKAN GRANIT 4 KURSI IVORY - HITAM BEIGE	MEJA MAKAN	unit	1350000.00	1550000.00	6	0		t	2026-06-26 14:23:59.244211+00	2026-07-05 02:36:57.250669+00	\N
3501e2b8-e77e-4570-b7fd-125890106033	KURSI TERAS ROTAN GENTONG - UNGU	KURSI ROTAN	unit	0.00	2350000.00	0	0	\N	t	2026-06-26 14:23:59.244211+00	2026-06-29 08:46:02.218004+00	\N
1f922685-3964-4541-8e69-0c7df4a31b2b	KURSI SMOTH 3111 - HITAM COKLAT	KURSI JATI	unit	0.00	4150000.00	0	0		t	2026-06-26 14:23:59.244211+00	2026-06-29 08:43:14.307698+00	\N
2dfe11b6-0b4f-44bf-a6af-9e955061c635	MATRAS COMFORTA NO 1 - COKLAT	MATRAS	unit	0.00	2500000.00	0	0	\N	t	2026-06-26 14:23:59.244211+00	2026-07-07 04:23:27.000112+00	\N
14695941-5e9e-466f-95a1-36b8f45cbca1	MEJA MAKAN ROTAN 6 KURSI - UNGU	MEJA MAKAN ROTAN	unit	1550000.00	2150000.00	4	0		t	2026-06-26 14:23:59.244211+00	2026-07-05 02:41:17.589566+00	\N
9d8d5fc8-cb97-4880-ae4b-f5968ce3a475	DIVAN MINIMALIS NO 3 - COKLAT	DIVAN	unit	0.00	1550000.00	1	0		t	2026-06-26 14:23:59.244211+00	2026-07-03 08:15:30.613157+00	\N
aaf9c09e-2eda-4d15-bfd5-59ee377de8eb	DIVAN MINIMALIS NO 1 - PINK	DIVAN	unit	0.00	1950000.00	0	0		t	2026-06-26 14:23:59.244211+00	2026-07-09 08:58:49.259918+00	\N
7c4e414d-69c1-4ea6-84ff-55103e656736	MEJA MAKAN MARMER 6 KURSI - HITAM GOLD	MEJA MAKAN	unit	0.00	0.00	0	0		t	2026-06-26 14:23:59.244211+00	2026-06-29 08:51:43.832757+00	\N
1921ee16-b171-4645-b4a2-b692684f6e2c	MEJA MAKAN JATI JEPARA 6 KURSI - GOLD	MEJA MAKAN	unit	0.00	8500000.00	0	0		t	2026-06-26 14:23:59.244211+00	2026-06-29 08:52:08.071072+00	\N
3f79bace-96c4-465d-8c10-7f24a6a098b3	MEJA MAKAN JEPARA MINIMALIS 6 KURSI - COKLAT GOLD	MEJA MAKAN	unit	0.00	3200000.00	0	0		t	2026-06-26 14:23:59.244211+00	2026-06-29 08:52:25.434586+00	\N
416aa7fe-8ed6-440f-abaa-f4c7c15b0846	DIVAN MNINIMALIS NO 3 - PINK	DIVAN	unit	0.00	1550000.00	1	0		t	2026-06-26 14:23:59.244211+00	2026-07-03 08:16:01.26335+00	\N
1e03356c-0bf4-4c66-859a-c1c8db77f094	MEJA MAKAN ROTAN 4 KURSI - MERAH	MEJA MAKAN ROTAN	unit	1175000.00	1700000.00	1	0		t	2026-06-26 14:23:59.244211+00	2026-07-05 02:38:05.060231+00	\N
45c279fe-1e3a-423f-8302-e6739a98cc6d	KULKAS 2 PINTU - BIRU	ELETRONIK 	unit	0.00	3400000.00	0	0		t	2026-06-26 14:23:59.244211+00	2026-06-30 09:30:12.12031+00	\N
8d66a995-ff1a-4dfa-9ade-79797cb91fb5	BUNGA JAM JEPARA - GOLD	JAM	unit	2150000.00	2900000.00	1	0		t	2026-06-26 14:23:59.244211+00	2026-07-03 07:38:39.641983+00	\N
db4718bb-10a3-4e2b-bc2f-353c893fceb4	KURSI PLASTIK - BIRU	KURSI PLASTIK	unit	65000.00	95000.00	22	0		t	2026-06-26 14:23:59.244211+00	2026-06-30 09:39:01.111903+00	\N
6ab79fc5-d683-46dc-9599-8f17c6294e55	CERMIN RIAS - GOLD	MEJA RIAS DAN BELAJAR	unit	850000.00	1350000.00	1	0		t	2026-06-26 14:23:59.244211+00	2026-07-03 08:09:06.509186+00	\N
ca24de1c-88c7-4d1e-9a4e-43be5d46f91a	MEJA MAKAN ROTAN 6 KURSI - MERAH HITAM	MEJA MAKAN ROTAN	unit	1550000.00	2150000.00	1	0		t	2026-06-26 14:23:59.244211+00	2026-07-05 02:39:45.770812+00	\N
d4a7b770-2937-4615-b974-e2138f43e22c	LEMARI BESI 2 PINTU - COKLAT	LEMARI BESI	unit	1450000.00	1900000.00	0	0		t	2026-06-26 14:23:59.244211+00	2026-07-03 05:12:03.733434+00	\N
49fadd57-dcfd-47c7-b550-aca93e25b520	DIVAN MINIMALIS NO 2 - ABU-ABU OSCAR	DIVAN	unit	1550000.00	1850000.00	1	0		t	2026-06-26 14:23:59.244211+00	2026-07-03 08:14:57.380611+00	\N
b898575d-0f68-4524-8a21-0c3958e5b54e	KURSI SUDUT SMOTH - COKLAT	KURSI JATI	unit	3450000.00	4150000.00	4	0		t	2026-06-26 14:23:59.244211+00	2026-07-03 09:00:47.870777+00	\N
540ac7a1-d008-46f5-8736-cba7a5893dc4	MEJA MAKAN ROTAN 6 KURSI - MERAH PUTIH	MEJA MAKAN ROTAN	unit	1550000.00	2150000.00	1	0		t	2026-06-26 14:23:59.244211+00	2026-07-05 02:40:29.201565+00	\N
df4a2abe-4fd4-4925-84dd-2c56ac77a6cd	DIVAN MINIMALIS NO 2 - GOLD	DIVAN	unit	0.00	1850000.00	0	0		t	2026-06-26 14:23:59.244211+00	2026-07-09 09:00:32.397455+00	\N
36c68a39-6ad6-459f-b133-8bbd12db0343	MEJA MAKAN GRANIT 4 KURSI IMPORTA - BEIGE	MEJA MAKAN	unit	2229000.00	2450000.00	7	0		t	2026-06-26 14:23:59.244211+00	2026-07-05 02:34:41.664419+00	\N
7c550656-5584-43b4-8fb9-a60e4264bf49	KURSI SMOTH 3111 - COKLAT	KURSI JATI	unit	0.00	4150000.00	0	0		t	2026-06-26 14:23:59.244211+00	2026-07-05 09:35:45.627097+00	\N
70c39f25-8bd4-4b26-a3de-a73a7bacf480	DIVAN MINIMALIS NO 2 - CREAM	DIVAN	unit	0.00	1850000.00	0	0		t	2026-06-26 14:23:59.244211+00	2026-07-09 09:00:05.502551+00	\N
3fc3e296-6d08-4012-9d73-cdf6ddce42ff	MEJA MAKAN ROTAN 4 KURSI - UNGU	MEJA MAKAN ROTAN	unit	1175000.00	1700000.00	4	0		t	2026-06-26 14:23:59.244211+00	2026-07-09 09:10:20.402044+00	\N
b378f31a-088d-43cd-b471-3e285719db0f	SOFA PERAHU - ABU-ABU	SOFA PERAHU	unit	0.00	1050000.00	0	0	\N	t	2026-06-26 14:23:59.244211+00	2026-06-26 14:23:59.244211+00	\N
c446e204-6654-46e0-a18f-773588f605f1	SOFA PERAHU - CREAM	SOFA PERAHU	unit	0.00	1050000.00	0	0	\N	t	2026-06-26 14:23:59.244211+00	2026-06-26 14:23:59.244211+00	\N
f9e5d41c-f73c-41ba-a9bb-62611ebc898c	SOFA PERAHU - GOLD	SOFA PERAHU	unit	0.00	1050000.00	0	0	\N	t	2026-06-26 14:23:59.244211+00	2026-06-26 14:23:59.244211+00	\N
69e805f9-ecd9-4949-98c6-5ebacf55b447	SOFA PERAHU - HIJAU	SOFA PERAHU	unit	0.00	1050000.00	0	0	\N	t	2026-06-26 14:23:59.244211+00	2026-06-26 14:23:59.244211+00	\N
92348bb5-a839-4d79-8087-e1f3c5c58dbf	SOFA PERAHU - HITAM	SOFA PERAHU	unit	0.00	1050000.00	0	0	\N	t	2026-06-26 14:23:59.244211+00	2026-06-26 14:23:59.244211+00	\N
988ea996-955d-4b12-ae2c-23fbacdb9930	SOFA IMPOR 321 - CREAM	SOPA PREMIUM 	unit	0.00	6250000.00	0	0		t	2026-06-26 14:23:59.244211+00	2026-06-29 09:07:51.990285+00	\N
99c0c6d0-c960-4fb8-a9ca-c3f4ec38a988	MEJA BELAJAR JATI - PUTIH	MEJA RIAS DAN BELAJAR	unit	1250000.00	2500000.00	1	0		t	2026-06-26 14:23:59.244211+00	2026-07-05 01:58:34.422445+00	\N
1ae8c4b2-622a-4f48-85f1-994fbff30f1b	MEJA RIAS MUYLTIPLEX - PUTIH	MEJA RIAS DAN BELAJAR	unit	0.00	3500000.00	0	0	\N	t	2026-06-26 14:23:59.244211+00	2026-06-29 08:34:44.169833+00	\N
edaa95dd-8aac-43eb-9106-8607281f5f51	MEJA RIAS SERBUK - PUTIH GOLD	MEJA RIAS DAN BELAJAR	unit	0.00	1850000.00	0	0	\N	t	2026-06-26 14:23:59.244211+00	2026-06-29 08:35:07.124525+00	\N
aa1d7960-744b-4376-af48-f7a645e613ea	SOFA MINIMALIS 321 - PUTIH	SOPA SEMI PREMIUM 	unit	0.00	2650000.00	0	0		t	2026-06-26 14:23:59.244211+00	2026-06-29 09:17:57.800885+00	\N
02bc98e6-73e1-490b-ae2a-532ec8adfa6b	SOFA MINIMALIS 321 - COKLAT	SOPA SEMI PREMIUM 	unit	0.00	2650000.00	0	0		t	2026-06-26 14:23:59.244211+00	2026-06-29 09:17:47.739293+00	\N
10f5e68c-50d3-43df-bfdc-831fc0750f76	SOFA MINIMALIS 321 - HITAM	SOPA SEMI PREMIUM 	unit	0.00	2650000.00	0	0		t	2026-06-26 14:23:59.244211+00	2026-06-29 09:17:52.07516+00	\N
48cb2f27-9773-499b-8f27-6cdbac76cd11	SOFA MINIMALIS 321 + STOLL - ABU ABU	SOPA SEMI PREMIUM 	unit	0.00	3350000.00	0	0		t	2026-06-26 14:23:59.244211+00	2026-06-29 09:18:02.193637+00	\N
52ec033d-7958-4bc4-bec9-020114328e80	MEJA MAKAN ROTAN 4 KURSI - HIJAU	MEJA MAKAN ROTAN	unit	1175000.00	1700000.00	0	0		t	2026-06-26 14:23:59.244211+00	2026-07-11 01:55:52.753609+00	\N
e6b63f52-d76c-477a-a20c-c2d341785a43	KURSI SUDUT JEPARA - COKLAT GOLD	KURSI JATI	unit	0.00	4000000.00	1	0		t	2026-06-26 14:23:59.244211+00	2026-07-11 05:21:16.597595+00	\N
41c51212-5ca0-4974-af37-b0e85a234dfc	KURSI KOPER - COKLAT	KURSI JATI	unit	3500000.00	4150000.00	0	0		t	2026-06-26 14:23:59.244211+00	2026-07-14 06:06:48.795521+00	\N
023e06fb-e740-4a7c-be34-85d1a0e1c625	KURSI JARI JARI - COKLAT	KURSI JATI	unit	2900000.00	3950000.00	0	0		t	2026-06-26 14:23:59.244211+00	2026-07-11 14:43:58.425533+00	\N
1dff28ea-693d-4972-8c59-09e0a3da023a	SOFA MINIMALIS 321 + STOLL - ABU-ABU	SOPA SEMI PREMIUM 	unit	0.00	3350000.00	0	0		t	2026-06-26 14:23:59.244211+00	2026-06-29 09:18:08.24172+00	\N
767195e9-fed8-4511-90a9-8b504e1a5ad0	SOFA BERANAK OSCAR BLUDRU - PUTIH ABU	SOPA SEMI PREMIUM	unit	0.00	2900000.00	0	0		t	2026-06-26 14:23:59.244211+00	2026-06-29 09:21:52.755683+00	\N
eb93dba0-7cc9-47e7-82bf-8754ecc44fb6	SOFA MINIMALIS 321 + STOLL - HIJAU	SOPA SEMI PREMIUM 	unit	0.00	3350000.00	0	0		t	2026-06-26 14:23:59.244211+00	2026-06-29 09:19:54.897462+00	\N
d69f063a-2bc1-4ea6-8d1b-b4e68e763bc5	SOFA MINIMALIS 321 BLUDRU - COKLAT	SOPA SEMI PREMIUM 	unit	0.00	3050000.00	0	0		t	2026-06-26 14:23:59.244211+00	2026-06-29 09:18:22.652492+00	\N
3bf21379-92e7-4228-baa9-c5c99a393488	SOFA MINIMALIS 321 BLUDRU - MERAH	SOPA SEMI PREMIUM 	unit	0.00	3050000.00	0	0		t	2026-06-26 14:23:59.244211+00	2026-06-29 09:18:26.437692+00	\N
df6692fe-3040-44a2-b990-dac738bce758	SOFA MINIMALIS 321 OSCAR - HITAM	SOPA SEMI PREMIUM 	unit	0.00	2650000.00	0	0		t	2026-06-26 14:23:59.244211+00	2026-06-29 09:18:30.802342+00	\N
fa076acc-ded7-42b8-b93d-8ef31450871d	SOFA MINIMALIS 321 + STOLL - MERAH	SOPA SEMI PREMIUM 	unit	0.00	3350000.00	0	0		t	2026-06-26 14:23:59.244211+00	2026-06-29 09:19:44.203672+00	\N
cba5386e-9d14-4406-a99a-55c903f556fe	SOFA BED BOHAI - MERAH	SOPA PREMIUM 	unit	0.00	2450000.00	0	0		t	2026-06-26 14:23:59.244211+00	2026-06-29 09:16:03.454924+00	\N
d5babcfd-2cc6-40a9-809e-853793e4824d	SOFA BED PREMIUM - COKLAT	SOPA PREMIUM 	unit	0.00	1550000.00	0	0		t	2026-06-26 14:23:59.244211+00	2026-06-29 09:16:08.559858+00	\N
80414137-b207-48bf-a009-2e92a2b1410c	SOFA BED PREMIUM - MERAH	SOPA PREMIUM 	unit	0.00	1550000.00	0	0		t	2026-06-26 14:23:59.244211+00	2026-06-29 09:16:15.26731+00	\N
8f2cff30-63e2-45f9-84d0-0cd5fa78a686	SOFA  MINIMALIS 321 OSCAR - COKLAT	SOPA SEMI PREMIUM 	unit	0.00	2650000.00	0	0		t	2026-06-26 14:23:59.244211+00	2026-06-29 09:17:41.641145+00	\N
dc51d7fe-8d0d-46ca-952f-9147a3042ce7	SOFA BERABAK OSCAR BLUDRU HALUS - HITAM ABU	SOPA SEMI PREMIUM 	unit	0.00	3200000.00	0	0		t	2026-06-26 14:23:59.244211+00	2026-06-29 09:00:08.960131+00	\N
91065251-13c2-4f7f-92a8-15ba49fe7fff	SOFA BERANAK FULL BLUDRU - HITAM ABU	SOPA SEMI PREMIUM	unit	0.00	3000000.00	0	0		t	2026-06-26 14:23:59.244211+00	2026-06-29 09:00:15.246131+00	\N
b83c6f63-b294-48ff-bc21-f0c5e4820f40	SOFA BERANAK LATER U - ABU	SOPA SEMI PREMIUM	unit	0.00	6500000.00	0	0		t	2026-06-26 14:23:59.244211+00	2026-06-29 09:00:29.726956+00	\N
5e335578-d04b-4741-828d-9799a4947b18	SOFA BERANAK OSCAR BLUDRU - ABU PUTIH	SOPA SEMI PREMIUM	unit	0.00	2900000.00	0	0		t	2026-06-26 14:23:59.244211+00	2026-06-29 09:00:36.081681+00	\N
8cdfae35-3882-4938-a1e3-d68c3e8d354d	SOFA BERANAK OSCAR BLUDRU - COKLAT COKLAT	SOPA SEMI PREMIUM	unit	0.00	2900000.00	0	0		t	2026-06-26 14:23:59.244211+00	2026-06-29 09:00:43.016559+00	\N
d884c1af-ee18-4708-b8e7-1c4aada7eda2	SOFA BERANAK OSCAR BLUDRU - CREAM COKLAT	SOPA SEMI PREMIUM	unit	0.00	2900000.00	0	0		t	2026-06-26 14:23:59.244211+00	2026-06-29 09:00:54.374845+00	\N
1335de1f-58c6-420d-b5bc-7c9d6827cbd1	SOFA BERANAK OSCAR BLUDRU - HITAM HIAJU	SOPA SEMI PREMIUM	unit	0.00	2900000.00	0	0		t	2026-06-26 14:23:59.244211+00	2026-06-29 09:01:00.437777+00	\N
d4db6bb9-e10f-486f-bbad-48a9ed8813e8	SOFA BERANAK OSCAR BLUDRU HALUS - PUTIH BIRU	SOPA SEMI PREMIUM	unit	0.00	3200000.00	0	0		t	2026-06-26 14:23:59.244211+00	2026-06-29 09:22:00.171833+00	\N
f48e09bb-5483-40b5-9ddb-e01a8a306337	SOFA BERANAK OSCAR BLUDRU - PUTIH ABU LIST GOLD	SOPA SEMI PREMIUM	unit	0.00	3050000.00	0	0		t	2026-06-26 14:23:59.244211+00	2026-06-29 09:01:14.885627+00	\N
a6b78a9d-f472-4d85-b1d7-ea40d674ca8b	SOFA BERANAK OSCAR BLUDRU HALUS - ABU GELAP	SOPA SEMI PREMIUM	unit	0.00	3200000.00	0	0		t	2026-06-26 14:23:59.244211+00	2026-06-29 09:01:21.271805+00	\N
dff95bb1-bca3-485d-8dba-b042f3ae4187	SOFA JAGUAR - ABU-ABU	SOPA JAGUAR	unit	5000000.00	7500000.00	0	0		t	2026-06-26 14:23:59.244211+00	2026-06-29 15:57:03.452106+00	\N
2145b92f-c432-487e-a8b7-56caf824ff88	SOFA LAMBADA - MERAH MAROON	SOPA SEMI PREMIUM	unit	0.00	3650000.00	0	0		t	2026-06-26 14:23:59.244211+00	2026-06-29 09:05:34.519314+00	\N
ae377a71-1c78-46e0-85e7-316a55c10460	SOFA LAMBORGINI 211 KAGAWA - ABU-ABU	SOPA PREMIUM 	unit	0.00	3800000.00	0	0		t	2026-06-26 14:23:59.244211+00	2026-06-29 09:06:40.966164+00	\N
27ba83fb-7d07-4ade-aafb-b6c75b255f97	SOFA IMPOR 321 - MERAH MAROON	SOPA PREMIUM 	unit	0.00	6250000.00	0	0		t	2026-06-26 14:23:59.244211+00	2026-06-29 09:12:57.328893+00	\N
019799de-f3df-4bb3-907b-0699d11379a5	SOFA LAMBORGINI 321 - ABU-ABU	SOPA PREMIUM 	unit	0.00	5000000.00	0	0		t	2026-06-26 14:23:59.244211+00	2026-06-29 09:06:55.505886+00	\N
e2003c9a-c57d-42e6-83a0-26c1a9cb75c6	SOFA LAMBORGINI 321 - COKLAT TEAK	SOPA PREMIUM 	unit	0.00	5000000.00	0	0		t	2026-06-26 14:23:59.244211+00	2026-06-29 09:07:05.060735+00	\N
359c2837-18f0-466a-b592-cf33fad21126	SOFA LAMBORGINI 321 - MERAH	SOPA PREMIUM 	unit	3900000.00	5000000.00	1	0		t	2026-06-26 14:23:59.244211+00	2026-07-05 03:47:29.509732+00	\N
ddd1faf3-4959-40bb-9a53-ba3703f0e845	SOFA IMPOR 321 - COKLAT	SOPA PREMIUM 	unit	4650000.00	6250000.00	1	0		t	2026-06-26 14:23:59.244211+00	2026-07-05 02:48:13.635903+00	\N
dbc93d4f-da88-4647-ae04-ad67383ee125	SOFA IMPOR 321 - GOLD	SOPA PREMIUM 	unit	0.00	6250000.00	0	0		t	2026-06-26 14:23:59.244211+00	2026-06-29 09:08:04.631146+00	\N
129bea54-175a-468c-9083-7e77d31a6aa6	SOFA IMPOR 321 - HIJAU	SOPA PREMIUM 	unit	5200000.00	6250000.00	1	0		t	2026-06-26 14:23:59.244211+00	2026-07-05 03:47:08.332752+00	\N
d91eddb1-cf4e-4c23-81eb-d17130a88ae0	SOFA IMPOR 321 - HITAM	SOPA PREMIUM 	unit	0.00	6250000.00	0	0		t	2026-06-26 14:23:59.244211+00	2026-06-29 09:08:21.996871+00	\N
8c06c439-9d27-4051-80f6-eac45e6c7357	SOFA IMPOR 321 - MERAH	SOPA PREMIUM 	unit	0.00	6200000.00	0	0		t	2026-06-26 14:23:59.244211+00	2026-06-29 09:08:35.141889+00	\N
a67996a5-f266-4cb3-beb8-6854377dff39	SOFA SUDUT IMPOR - COKLAT	SOPA PREMIUM 	unit	0.00	6250000.00	0	0		t	2026-06-26 14:23:59.244211+00	2026-06-29 09:08:47.69938+00	\N
08bddd85-12bd-45f7-b258-292edad4d596	SOFA SUDUT IMPOR + STOOL - UNGU	SOPA PREMIUM 	unit	0.00	6700000.00	0	0		t	2026-06-26 14:23:59.244211+00	2026-06-29 09:09:12.394593+00	\N
b6d6d5d5-0601-439a-ae72-41f67baa6219	SOFA PERAHU - MERAH	SOFA PERAHU	unit	0.00	1050000.00	0	0	\N	t	2026-06-26 14:23:59.244211+00	2026-06-29 09:11:47.791952+00	\N
49c8105b-f335-4542-98b4-38922eeb216d	SOFA PERAHU - PINK	SOFA PERAHU	unit	0.00	1050000.00	0	0	\N	t	2026-06-26 14:23:59.244211+00	2026-06-29 09:11:54.381634+00	\N
876affe6-2186-485c-aa82-94e7cbed9b00	SOFA BED BOHAI - ABU-ABU	SOPA PREMIUM 	unit	0.00	2450000.00	0	0		t	2026-06-26 14:23:59.244211+00	2026-06-29 09:15:58.124181+00	\N
4def8b8f-baf2-4e4f-9288-f6719aff6e8b	MEJA RIAS JATI JEPARA - PUTIH	MEJA RIAS DAN BELAJAR	unit	1700000.00	3000000.00	1	0		t	2026-06-26 14:23:59.244211+00	2026-07-05 02:07:38.262571+00	\N
b2547990-dd93-4bf4-abfe-36465a46d8c9	AYUNAN JUMBO - BIRU#2	Testing	unit	3000000.00	3200000.00	1	1		f	2026-06-26 16:48:58.201102+00	2026-06-26 16:49:10.645731+00	\N
5b3a11ff-5322-487a-83ed-1e77cd2569fc	SOFA RETRO TIPE 11111 - MERAH	SOPA PREMIUM 	unit	0.00	5500000.00	1	0		t	2026-06-26 14:23:59.244211+00	2026-07-05 02:49:33.016027+00	\N
bf77b94b-cddc-47ce-8f0a-c3bc4512b239	BED SORONG PROCELLA - PINK	BED SORONG	unit	2000000.00	2850000.00	1	0		f	2026-06-26 14:23:59.244211+00	2026-06-30 09:07:34.729162+00	\N
4d491fdb-782e-448e-8576-c31ed7e1221f	LEMARI BESI 4 PINTU	LEMARI	1	0.00	3050000.00	0	1		t	2026-06-29 00:58:15.873711+00	2026-06-29 00:58:15.873711+00	\N
b6fee1e1-7060-4ac2-a762-f1e72a5a500e	MEJA MAKAN JATI OVAL 6 KURSI - COKLAT	MEJA MAKAN	unit	0.00	3500000.00	0	0		t	2026-06-26 14:23:59.244211+00	2026-06-29 08:52:16.830011+00	\N
eda33a04-1e4f-4bf5-af32-ccec479a67c0	DIVAN MEWAH NO1-HITAM	DIVAN	1	0.00	2550000.00	0	1		t	2026-06-29 07:54:27.768821+00	2026-07-09 08:53:06.604972+00	\N
ecff8477-4c30-4f46-9445-17aefcaecf8b	MEJA MAKAN SULTAN	MEJA MAKAN	unit	0.00	9500000.00	0	3		t	2026-06-28 08:34:20.413946+00	2026-06-29 08:49:55.84138+00	\N
dc969510-69aa-48e2-badd-72458d2ee39e	SOFA SYAHRINI - PINK	SOPA PREMIUM 	unit	0.00	6500000.00	0	0		t	2026-06-26 14:23:59.244211+00	2026-07-01 10:00:27.175477+00	\N
b55e5995-94c1-499c-89ba-74bcc63fd0bf	SOFA BERANAK FULL OSCAR - CREAM BIS GOLD	SOPA SEMI PREMIUM	unit	0.00	2950000.00	0	0		t	2026-06-26 14:23:59.244211+00	2026-06-29 09:00:22.504937+00	\N
1af1a16f-c20c-4283-a102-ca79a5e3196f	SOFA SUDUT SEMI SET STOLL - BIRU	SOPA SEMI PREMIUM	unit	0.00	3000000.00	1	0		t	2026-06-26 14:23:59.244211+00	2026-07-03 07:11:43.639585+00	\N
91a0183a-16fe-4de2-85e0-56acd3ae79eb	SOPA SUDUT BLDURU - MAROON	SOPA SEMI PREMIUM 	unit	0.00	2950000.00	0	0		t	2026-06-29 09:23:00.506789+00	2026-06-29 09:23:00.506789+00	\N
68651eb5-c79f-4373-be65-bb280c6ec214	SOFA L + STOLL - GOLD	SOPA SEMI PREMIUM	unit	0.00	3200000.00	0	0		t	2026-06-26 14:23:59.244211+00	2026-06-29 09:03:16.125349+00	\N
8e76ce7f-2c9d-4d44-8698-671f80207dec	SOFA L SEMI - BIRU	SOPA SEMI PREMIUM	unit	0.00	2950000.00	0	0		t	2026-06-26 14:23:59.244211+00	2026-06-29 09:03:27.182157+00	\N
f9e4976e-8894-4e8e-a0cb-a5be21ed2f63	DIVAN MEWAH NO1 - HITAM 	DIVAN	Unit	1950000.00	2550000.00	0	0		t	2026-06-29 07:56:11.287393+00	2026-07-13 03:32:59.73897+00	\N
293d149e-c109-4c69-9e95-3a45f7630df7	MEJA RIAS MULTIPLEX - PUTIH	MEJA RIAS DAN BELAJAR	unit	1650000.00	2200000.00	2	0		t	2026-06-26 14:23:59.244211+00	2026-07-11 15:18:16.881674+00	\N
22217fc3-5a69-4f3b-a200-b17046d70311	LEMARI BESI 4 PINTU - PUTIH	LEMARI BESI	unit	2500000.00	3050000.00	1	0		t	2026-06-26 14:23:59.244211+00	2026-07-13 08:38:02.852035+00	\N
fd88ba08-bd4b-4eaa-a4f5-d140a817cc94	DIPAN MEWAH ORANGE NO1	DIVAN	unit	1950000.00	2550000.00	0	0		t	2026-06-26 14:23:59.244211+00	2026-07-15 03:51:48.858497+00	\N
f923ba2f-6bec-460a-bbe1-2fdfcb1e34ba	SOFA L SEMI BLUDRU - COKLAT	SOPA SEMI PREMIUM	unit	0.00	3200000.00	0	0		t	2026-06-26 14:23:59.244211+00	2026-06-29 09:03:42.719376+00	\N
9f95ed14-dc54-4322-898c-2f362385cec3	SOFA L SEMI BLUDRU + STOLL - HITAM	SOPA SEMI PREMIUM	unit	0.00	3200000.00	0	0		t	2026-06-26 14:23:59.244211+00	2026-06-29 09:03:50.680244+00	\N
1ffb35c1-2f2b-4391-b617-f8e9d58ca4d9	SOFA L SEMI OSCAR BLUDRU - CREAM COKLAT	SOPA SEMI PREMIUM	unit	0.00	2650000.00	0	0		t	2026-06-26 14:23:59.244211+00	2026-06-29 09:04:00.47223+00	\N
2f54e52a-8dc3-49df-84bd-8c6989e0de9a	SOFA SUDUT PREMIUM - ABU-ABU	SOPA SEMI PREMIUM	unit	0.00	4650000.00	0	0		t	2026-06-26 14:23:59.244211+00	2026-06-29 09:04:06.251908+00	\N
706089bb-f9df-47a3-b4ca-b13d37403841	SOFA SUDUT PREMIUM - COKLAT	SOPA SEMI PREMIUM	unit	0.00	4200000.00	0	0		t	2026-06-26 14:23:59.244211+00	2026-06-29 09:04:14.277069+00	\N
267f0cd0-aef3-46d6-96c6-6fa7c07023dc	SOFA SUDUT PREMIUM + STOLL - COKLAT TEAK	SOPA SEMI PREMIUM	unit	0.00	4500000.00	0	0		t	2026-06-26 14:23:59.244211+00	2026-06-29 09:04:20.316727+00	\N
496d8036-b9ea-4fbe-ac3c-393ed3969171	SOFA SUDUT PREMIUM BLUDRU - PUTIH	SOPA SEMI PREMIUM	unit	0.00	41000000.00	0	0		t	2026-06-26 14:23:59.244211+00	2026-06-29 09:04:27.259676+00	\N
bb7e9507-de05-458b-a8fc-bc930f9fc2b8	SOFA SUDUT SEMI - COKLAT	SOPA SEMI PREMIUM	unit	0.00	2950000.00	0	0		t	2026-06-26 14:23:59.244211+00	2026-06-29 09:04:33.068872+00	\N
6ca4af5e-2f97-44e2-8cf4-eb721724cbb3	SOFA SUDUT SEMI - HITAM BIRU	SOPA SEMI PREMIUM	unit	0.00	2650000.00	0	0		t	2026-06-26 14:23:59.244211+00	2026-06-29 09:04:43.693548+00	\N
7b7b8d28-a05c-4ff0-9cbc-229244ce115f	SOFA SUDUT SEMI +STOLL - CREAM	SOPA SEMI PREMIUM	unit	0.00	3200000.00	0	0		t	2026-06-26 14:23:59.244211+00	2026-06-29 09:04:53.3093+00	\N
4303be89-12d2-4d31-aeda-86f73cd322b6	SOFA SUDUT SEMI +STOLL - CREAM BIRU	SOPA SEMI PREMIUM	unit	0.00	3200000.00	0	0		t	2026-06-26 14:23:59.244211+00	2026-06-29 09:05:01.359731+00	\N
2503740d-c971-402a-85f3-b22cdf9ab2a7	SOFA SUDUT SEMI BLUDRU - COKLAT	SOPA SEMI PREMIUM	unit	0.00	2950000.00	0	0		t	2026-06-26 14:23:59.244211+00	2026-06-29 09:05:07.501062+00	\N
10f50604-13f9-4442-8e99-a5e67ac715ac	SOFA SUDUT SEMI OSCAR BLUDRU - COKLAT CREAM	SOPA SEMI PREMIUM	unit	0.00	2650000.00	0	0		t	2026-06-26 14:23:59.244211+00	2026-06-29 09:05:14.541181+00	\N
8d4378c2-8d4c-4240-b77e-9faf76700d9b	SOFA SUDUT SEMI OSCAR BLUDRU - PUTIH COKLAT	SOPA SEMI PREMIUM	unit	0.00	2650000.00	0	0		t	2026-06-26 14:23:59.244211+00	2026-06-29 09:05:20.952296+00	\N
d484d7fc-5e06-4847-860a-b8719206c764	SOFA PRABU - HITAM	SOPA SEMI PREMIUM	unit	0.00	2650000.00	0	0		t	2026-06-26 14:23:59.244211+00	2026-06-29 09:06:10.778826+00	\N
90e842ff-93c4-4d1c-a6c6-fa3578e92cdd	SOFA PRABU - MERAH MAROON	SOPA SEMI PREMIUM	unit	0.00	2650000.00	0	0		t	2026-06-26 14:23:59.244211+00	2026-06-29 09:06:16.997936+00	\N
672a8c23-5654-4a06-9e5d-29a062d02ca6	SOFA IMPOR 321 - ABU-ABU	SOPA PREMIUM 	unit	0.00	6200000.00	0	0		t	2026-06-26 14:23:59.244211+00	2026-06-29 09:07:35.954063+00	\N
2249a9fc-45e4-4fdf-8455-4eb88a520b07	SOFA RETRO 321 - COKLAT	SOPA PREMIUM 	unit	0.00	4650000.00	0	0		t	2026-06-26 14:23:59.244211+00	2026-06-29 09:09:36.69848+00	\N
1165da73-38b9-4301-a31f-c5b7baf0cb20	SOFA SYAHRINI - HIJAU	SOPA PREMIUM 	unit	0.00	6500000.00	0	0		t	2026-06-26 14:23:59.244211+00	2026-06-29 09:09:54.888837+00	\N
2311893b-3b1f-4f2c-9521-c587e5dd59a1	SOFA LAMBORGINI 2111 - MERAH	SOPA PREMIUM 	unit	0.00	0.00	0	0		t	2026-06-26 14:23:59.244211+00	2026-07-03 07:24:07.11562+00	\N
6c31cf43-c171-4bc3-bde9-e4f12c9e3aa4	SOFA TURKI 321 - ABU-ABU	SOPA PREMIUM 	unit	0.00	4650000.00	0	0		t	2026-06-26 14:23:59.244211+00	2026-06-29 09:10:21.513186+00	\N
c26a44d3-c563-4831-a95c-e0833fc3d98a	SOFA TURKI 321 - COKLAT	SOPA PREMIUM 	unit	0.00	4650000.00	0	0		t	2026-06-26 14:23:59.244211+00	2026-06-29 09:10:27.274207+00	\N
c72ac259-00b0-4730-9209-c5c883e52d23	SOFA TURKI 321 - DARK BROWN	SOPA PREMIUM 	unit	0.00	4650000.00	0	0		t	2026-06-26 14:23:59.244211+00	2026-06-29 09:10:33.012187+00	\N
65cc01b3-7b88-45f3-8dc2-53b282c56491	SOFA TURKI 321 - GOLD	SOPA PREMIUM 	unit	0.00	4650000.00	0	0		t	2026-06-26 14:23:59.244211+00	2026-06-29 09:10:38.521447+00	\N
44814167-71c5-4618-9326-b41d5913b2a1	SOFA TURKI 321 - MERAH	SOPA PREMIUM 	unit	0.00	4650000.00	0	0		t	2026-06-26 14:23:59.244211+00	2026-06-29 09:10:44.730448+00	\N
0c2afa49-f55b-45e2-a0dc-9dfd5f30b766	SOPA SUDUT - MAROON	SOPA SEMI PREMIUM	unit	2050000.00	2950000.00	1	0		t	2026-06-30 09:07:40.775447+00	2026-07-05 03:54:25.768108+00	\N
5330a7ab-2583-4ba9-95d0-76b2930abe0d	SOFA TURKI 321 OSCAR - MERAH	SOPA PREMIUM 	unit	0.00	4650000.00	0	0		t	2026-06-26 14:23:59.244211+00	2026-06-29 09:10:56.97367+00	\N
9d70a53a-0051-4cb4-bcfb-c7ec60e5eb02	SOFA TUMGGAL TIPE 3 BLUDRU - CREAM	SOPA SEMI PREMIUM 	unit	0.00	3000000.00	0	0		t	2026-06-26 14:23:59.244211+00	2026-06-29 09:11:20.491924+00	\N
8264ad7a-2b65-45d3-a43b-3984ac3fbfeb	SOFA TURKI 321 - ABU ABU	SOPA PREMIUM 	unit	3900000.00	4650000.00	0	0		t	2026-06-26 14:23:59.244211+00	2026-07-05 09:38:01.301891+00	\N
c719d131-4fbe-46ff-8d4a-0dc73ef5abe0	SOFA SUDUT SEMI OSCAR BLUDRU - CREAM ABU	SOPA SEMI PREMIUM	unit	1850000.00	2650000.00	1	0		t	2026-06-26 14:23:59.244211+00	2026-07-05 03:49:56.406781+00	\N
9217ae4b-68c2-4b8f-8909-2812abdb999a	SOFA TUMGGAL TIPE 3 KAGAWA - CREAM	SOPA SEMI PREMIUM 	unit	2000000.00	3000000.00	0	0		t	2026-06-26 14:23:59.244211+00	2026-06-29 09:19:34.106394+00	\N
3cff9a13-cf75-46bd-8c02-f77527d40fd6	SOPA SUDUT BLUDRU - MAROON	SOPA SEMI PREMIUM 	unit	0.00	2950000.00	0	0		t	2026-06-29 09:25:58.54804+00	2026-06-29 09:25:58.54804+00	\N
aeeab3d9-13b0-4c52-9dec-80a0129c6001	AYUNAN JUMBO - KUNING	AYUNAN ROTAN	unit	1700000.00	2200000.00	0	0		t	2026-06-26 14:23:59.244211+00	2026-07-09 01:51:39.644007+00	\N
c4b71aa8-e7ef-4087-b3ba-7e59bd238ffd	SOFA IMPOR COKLAT	SOPA PREMIUM 	unit	0.00	6250000.00	0	0		t	2026-06-28 12:29:17.51574+00	2026-06-30 09:21:30.313953+00	\N
3ae8b422-c230-49a3-82ec-64253695718e	SOFA TURKI 321 - PINK FANTA	SOPA PREMIUM 	unit	3900000.00	4650000.00	1	0		t	2026-06-26 14:23:59.244211+00	2026-07-03 07:26:12.771494+00	\N
d7d67c45-176c-48ac-aba9-bd86ffae0878	DIVAN SANDARAN LURUS NO 1 - CREAM	DIVAN	unit	0.00	2550000.00	0	0		t	2026-06-26 14:23:59.244211+00	2026-07-09 09:01:07.060019+00	\N
91237d66-7fdb-45a7-a1b6-dd59335e5ebb	SOPA MINIMALIS TIPE 1	SOPA SEMI PREMIUM 	unit	500000.00	700000.00	1	0		t	2026-06-30 09:22:47.760147+00	2026-07-03 07:16:32.276101+00	\N
c731b160-33f3-4909-89f0-57b692bbcdfa	SOPA BERANAK HITAM OSCAR BLUDRU	SOPA SEMI PREMIUM 	unit	0.00	3400000.00	0	0		t	2026-07-03 11:11:48.555471+00	2026-07-05 02:40:34.879851+00	\N
6a366d28-af38-4364-85a4-b4c4f0e7c64f	SOPA MINIMALIS ABU	SOPA SEMI PREMIUM 	unit	0.00	3000000.00	1	0		t	2026-07-01 08:29:54.176328+00	2026-07-03 07:17:19.434039+00	\N
90159552-8b47-41f1-b0cd-de4fd8002774	SOPA TUNGGAL CREAM	SOPA PREMIUM 	unit	0.00	3500000.00	1	0		t	2026-06-30 07:34:38.676372+00	2026-07-03 07:23:44.544293+00	\N
f04cf6e2-18f8-4785-a981-05f9129792cd	SOPA L JUMBO	SOPA PREMIUM 	unit	0.00	9000000.00	1	0		t	2026-07-01 08:45:02.754881+00	2026-07-05 02:50:52.860111+00	\N
bb27b946-5706-483f-bc1b-65b29a1f8024	SOPA LATER U CREAM	SOPA PREMIUM 	unit	0.00	9000000.00	1	0		t	2026-07-01 08:43:46.030461+00	2026-07-05 02:52:02.755051+00	\N
0d8d9824-6586-4b48-a3e3-88369cf3ba40	SOFA L FULL BLUDRU - ABU²	SOPA SEMI PREMIUM 	1 unit 	0.00	2950000.00	0	1		t	2026-07-05 08:59:04.973296+00	2026-07-05 09:35:46.052859+00	\N
71e0e32a-a563-447d-ad19-1a6ba0747954	SOPA RETRO TIPE 111 MERAH	SOPA PREMIUM 	unit	0.00	3300000.00	1	0		t	2026-07-05 02:59:32.881715+00	2026-07-05 02:59:32.881715+00	\N
dfb5eeaa-9977-475d-bc30-33806efc81bd	SOPA LAMBORGHINI ABU 31+PERAHU 	SOPA PREMIUM 	unit	0.00	4000000.00	0	0		t	2026-07-05 02:47:15.691959+00	2026-07-05 03:00:26.485274+00	\N
d600e7ae-987c-4ff3-a832-c6d53363f0f8	SOPA IMPOR ABU	SOPA PREMIUM 	unit	0.00	5500000.00	0	0		t	2026-07-01 09:55:18.358223+00	2026-07-01 10:04:23.552432+00	\N
ba33ee60-a9e7-4677-a838-8f075f68ee49	MEJA MAKAN GENTONG 6KURSI	MEJA MAKAN	unit	0.00	5000000.00	0	0		t	2026-07-01 09:57:59.432333+00	2026-07-01 10:08:17.122194+00	\N
23b9749b-e1d8-42c3-98c9-ccb4d3c79b7c	SPEAKER BMB BEKAS 12"	ELETRONIK	unit	4000000.00	4000000.00	1	0		t	2026-06-30 09:29:23.099395+00	2026-07-03 08:33:58.660318+00	\N
c8bfd892-0983-425d-a55b-e07cd233bb00	SOPA LAMBORGHINI TIPE 111	SOPA PREMIUM 	unit	0.00	3300000.00	1	0		t	2026-07-05 03:01:20.145308+00	2026-07-05 03:01:20.145308+00	\N
51368464-da6f-4c27-8a9e-b4af03eda252	SOPA RETRO TIPE 32 DANS TOOL	SOPA SEMI PREMIUM 	unit	0.00	3200000.00	1	0		t	2026-07-05 03:09:32.920284+00	2026-07-05 03:09:32.920284+00	\N
31b268c9-d467-4a88-b0ae-ac96b16f7629	DIVAN MEWAH NO2 PINK	DIVAN	unit	1950000.00	2450000.00	1	0		t	2026-06-30 09:26:37.907833+00	2026-07-05 03:14:17.724936+00	\N
478f4d15-3bcb-4bf0-b6dd-34a9a519277e	MEJA MAKAN GRANIT 4 KURSI IMPORTA - BROWN	MEJA MAKAN	unit	2229000.00	2450000.00	2	0		t	2026-06-26 14:23:59.244211+00	2026-07-13 03:30:04.371129+00	\N
5f144ff7-1856-4bc8-9ae1-2d29e19d3b62	DIPAN MINIMALIS NO1 CREAM	DIVAN	Unit	1550000.00	1950000.00	1	0		t	2026-06-29 07:47:39.653698+00	2026-07-16 07:49:03.448586+00	\N
2972f34c-a8f2-4831-b272-14979903e6f6	BOXY BNAIK NO2 ABU	BOXY	unit	2050000.00	2450000.00	0	0		t	2026-07-06 07:47:33.317971+00	2026-07-14 16:09:23.151073+00	\N
eaffd37e-6587-42b9-8f84-2e2e453b54c1	DIVAN MEWAH NO 1 - ABU-ABU	DIVAN	unit	1950000.00	2550000.00	0	0		t	2026-06-26 14:23:59.244211+00	2026-07-15 04:02:55.685851+00	\N
b383f379-72e6-407e-987b-fe5e8a1502ee	DIPAN MEWAH NO1 PUTIH	DIVAN	unit	1950000.00	2550000.00	0	0		t	2026-07-06 07:48:20.55895+00	2026-07-15 03:55:13.939713+00	\N
65e6bf9d-0a1c-4c28-82b2-3191955ad56a	DIPAN MEWAH COKLAT NO2	DIVAN	unit	1950000.00	2450000.00	2	0		t	2026-07-06 07:44:46.263111+00	2026-07-15 03:57:53.531895+00	\N
c2f6e44b-6c95-4ec9-b747-1efe204c0f45	SOPABED BLUDRU TEAK	SOPA BED	unit	0.00	1550000.00	0	0		t	2026-07-06 08:14:26.427079+00	2026-07-06 08:14:26.427079+00	\N
d0babede-b7cf-4138-bcce-d3d9a4151949	SOPA SUDUT ABU PUTIH	SOPA SEMI PREMIUM 	unit	0.00	2650000.00	0	0		t	2026-06-30 09:16:57.111231+00	2026-07-03 07:13:58.377073+00	\N
0639c160-5f47-4894-ac58-77b1d1ed5458	SOPA BERANAK COKLAT OSCAR BLUDRU	SOPA SEMI PREMIUM 	unit	0.00	2900000.00	1	0		t	2026-06-30 09:15:18.920657+00	2026-07-03 07:14:44.784222+00	\N
7fb56c17-01b3-46f1-9c43-d897d3ef9644	SOPA BERANAK HIJAU HITAM	SOPA SEMI PREMIUM 	unit	0.00	3200000.00	1	0		t	2026-07-01 08:25:39.256746+00	2026-07-03 07:15:37.907308+00	\N
3ef11dd2-24f7-4df5-b57e-a27fbe7a39a3	LEMARI HIAS PUTIH	LEMARI	unit	0.00	1000000.00	0	0		t	2026-07-01 08:34:55.086444+00	2026-07-03 09:01:12.032588+00	\N
e4498b56-adff-42ec-85e8-feb0d206d622	MEJA KONSUL	BARANG CAMPURAN	unit	750000.00	1250000.00	1	0		t	2026-06-30 09:20:30.166141+00	2026-07-03 09:01:40.952783+00	\N
74043623-578c-49a6-970f-1614e16c7723	MEJA MAKAN GENTONG	MEJA MAKAN	unit	4200000.00	5150000.00	1	0		t	2026-06-30 09:17:40.07714+00	2026-07-03 09:02:04.170737+00	\N
da5e3449-60e0-4595-8f85-0a06ad00221e	MATRAS PROCELLA NO.1 DOBEL BED - COKLAT	Matras	unit	0.00	2400000.00	0	0		t	2026-07-03 12:55:45.342131+00	2026-07-03 13:04:55.402297+00	\N
fda626aa-9d8f-44f5-b8ed-ea34672a4012	DIPAN MINIMALIS NO3 LACI BIRU	DIVAN	unit	0.00	1850000.00	1	0		t	2026-07-06 07:43:58.027406+00	2026-07-08 12:30:25.053369+00	\N
c12db099-d6f7-4c08-a330-c24a493bae24	SO0A SUDUT COKLAT BLUDRU	SOPA SEMI PREMIUM 	unit	2050000.00	2950000.00	1	0		t	2026-07-05 03:04:51.518168+00	2026-07-05 03:46:49.92788+00	\N
4c884ee4-b3f7-4018-a37f-094ae6a5d299	SOPA IMPOR 21 +PUK	SOPA PREMIUM 	unit	4000000.00	5000000.00	1	0		t	2026-07-05 02:57:40.343264+00	2026-07-05 03:53:11.254139+00	\N
711d3ead-4764-4c86-a639-00f374e01d26	SOPA LAMBORGHINI ABU	SOPA PREMIUM 	unit	3900000.00	5000000.00	1	0		t	2026-07-03 11:11:11.538431+00	2026-07-05 03:53:29.921574+00	\N
0d220e68-b324-41c8-8dce-c7ac72efe169	LEMARI DAPUR UNGU	LEMARI	unit	1400000.00	1500000.00	1	0		t	2026-07-01 08:36:37.39801+00	2026-07-05 01:54:24.005359+00	\N
e46a4119-14cc-47a9-b7ac-a74dcf7c5138	MEJA MAKAN JATI 4 KURSI	MEJA MAKAN	unit	2000000.00	2800000.00	1	0		t	2026-06-30 09:24:03.132158+00	2026-07-05 01:59:04.667273+00	\N
21bfd29f-0436-43d0-b450-172eafe6b43f	SOPA SUDUT BLUDRU MERAH	SOPA SEMI PREMIUM 	unit	2050000.00	2950000.00	1	0		t	2026-07-03 07:18:15.799738+00	2026-07-05 03:54:38.334228+00	\N
7d75df80-5c8c-41d6-bb11-5e9496b12bbe	SOPA TURKI 321 MERAH BLUDRU	SOPA PREMIUM 	unit	3900000.00	4650000.00	1	0		t	2026-07-05 02:54:48.805611+00	2026-07-05 03:56:34.488873+00	\N
5ceaacb6-d7b5-4216-ac40-c4d8b3e9aa3c	SOPABED BOHAY MERAH	SOPA BED	unit	1800000.00	2450000.00	1	0		t	2026-07-03 07:08:15.924064+00	2026-07-05 03:56:54.831511+00	\N
e5ad4024-fd0c-4b67-bf61-65b3dc509955	ABCD	TEST	unit	0.00	100000.00	1	0		f	2026-07-06 04:59:45.959844+00	2026-07-06 05:41:33.62872+00	\N
317886a5-7737-47a3-99d2-dbda3a4c8a82	SOPABED BOHAY BIRU	SOPA BED	unit	1800000.00	2450000.00	0	0		t	2026-07-03 07:02:15.406832+00	2026-07-07 09:44:03.335654+00	\N
5386430d-38a3-47de-8467-aa2fa1ace678	DIVAN MEWAH NO2 CREAM	DIVAN	unit	1950000.00	2450000.00	0	0		t	2026-06-30 09:25:53.117702+00	2026-07-09 01:41:13.456266+00	\N
f92f7959-4a58-445d-9c3c-09e715ed4387	DIPAN EXKLUSIF NO1 ABU	DIVAN	unit	0.00	2700000.00	0	0		t	2026-07-06 08:05:44.045012+00	2026-07-09 02:14:38.726465+00	\N
1a78657a-2738-4e5a-8cf5-06603e1e304f	DIPAN JEPARA VIBER NO1 HIJAU	DIVAN	unit	0.00	2900000.00	0	0		t	2026-07-06 09:12:52.660093+00	2026-07-09 02:24:05.173168+00	\N
377c52d1-5c3d-4493-a389-d712ae2350d2	SOPABED BOHAY COKLAT	SOPA BED	unit	0.00	2450000.00	0	0		t	2026-07-06 09:36:02.014476+00	2026-07-06 09:36:02.014476+00	\N
a6ca55a4-432b-4056-87dc-605e0cfa71a5	SOPA LATER U HITAM/SILVER KAGAWA	SOPA PREMIUM 	unit	0.00	9000000.00	0	0		t	2026-07-06 09:44:13.61018+00	2026-07-06 09:44:13.61018+00	\N
d37b58e1-c66b-42f4-afc2-77cc3363fa75	SOPA SIERRA HITAM	SOPA PREMIUM 	unit	0.00	5000000.00	0	0		t	2026-07-06 09:44:59.603082+00	2026-07-06 09:44:59.603082+00	\N
b7977168-08a5-4146-ac65-daf70d2d583f	MEJA MAKAN JEPARA 6K	MEJA MAKAN	unit	0.00	8500000.00	0	0		t	2026-07-06 09:53:14.409925+00	2026-07-06 09:53:14.409925+00	\N
e516a6b2-e47c-4cab-b71e-3252499812de	MEJA MAKAN JATI  MOTIF MARMER	MEJA MAKAN	unit	0.00	3350000.00	0	0		t	2026-07-06 09:53:49.497411+00	2026-07-06 09:53:49.497411+00	\N
85c19172-8c31-4863-b84d-c9554275af77	MATRAS CONFORTA NO1 COKLAT 	MATRAS	unit	0.00	2500000.00	0	0		t	2026-07-06 09:54:52.523897+00	2026-07-06 09:54:52.523897+00	\N
5672474a-b20b-45f2-8b51-59aaa807a73e	SOPA BERANAK HITAM ABU	SOPA SEMI PREMIUM 	unit	0.00	2850000.00	0	0		t	2026-07-07 09:40:09.377767+00	2026-07-07 09:40:09.377767+00	\N
24c45edf-4b91-4469-8a89-789c648cee11	SOPA L ABU	SOPA SEMI PREMIUM 	unit	0.00	3200000.00	0	0		t	2026-07-07 09:42:07.720665+00	2026-07-07 09:42:07.720665+00	\N
9f79576d-ee5f-45b9-adb5-033b9de1362c	SOPA L SEMI ABU 	SOPA SEMI PREMIUM 	unit	0.00	3200000.00	0	0		t	2026-07-07 09:44:03.554232+00	2026-07-07 09:44:03.554232+00	\N
13e608f9-1171-41c4-8d35-a275628cea82	SOPA KACANG + 1	BARANG CAMPURAN	unit	0.00	10500000.00	0	0		t	2026-07-07 09:48:16.014898+00	2026-07-07 09:48:16.014898+00	\N
45d39a8a-7aba-4fcd-8d2d-8fa2681e2e04	MEJA MAKAN JATI KOTAK 6K	MEJA MAKAN	unit	0.00	3350000.00	0	0		t	2026-07-08 02:45:10.71335+00	2026-07-08 02:45:10.71335+00	\N
f3c97cb7-eab3-4a23-ae59-4f440a79933a	SOPABED BOHAY ABU TUA 	SOPA BED	unit	0.00	2450000.00	0	0		t	2026-07-07 01:56:12.105415+00	2026-07-07 01:56:39.623125+00	\N
56d75333-b168-404f-b96d-af514e0ec42c	SOPABED PREMIUM ABU TUA	SOPA BED	unit	0.00	1550000.00	0	0		t	2026-07-07 02:11:33.312147+00	2026-07-07 02:11:33.312147+00	\N
612cf487-8787-42d1-b18b-03ef558c2e06	SOPA LAMBORGHINI 311 COKLAT 	SOPA PREMIUM 	unit	0.00	5700000.00	0	0		t	2026-07-07 04:32:24.333611+00	2026-07-07 04:32:24.333611+00	\N
04782a28-bc7f-4328-ade7-7741be4cda68	SOPA RETRO 321 ABU GELAP	SOPA PREMIUM 	unit	0.00	4650000.00	0	0		t	2026-07-07 04:34:17.182191+00	2026-07-07 04:34:17.182191+00	\N
9572feac-d9db-45e3-a75e-449edbf04f7e	DIPAN JEPARA SULTAN NO1 MERAH	DIVAN	unit	0.00	6000000.00	0	0		t	2026-07-08 02:46:39.198699+00	2026-07-09 02:18:42.593715+00	\N
bc82fb57-8c09-43b7-874b-fe8c21763267	MEJA MAKAN MARMER 6K COKLAT 	MEJA MAKAN	unit	0.00	6500000.00	0	0		t	2026-07-09 04:02:49.928431+00	2026-07-09 04:02:49.928431+00	\N
9dbbfe24-f995-45da-8cc4-98c7274ecabe	KURSI MADURA MATAHARI 3211	KURSI JATI	unit	0.00	6150000.00	0	0		t	2026-07-06 09:52:42.525523+00	2026-07-07 09:12:15.883705+00	\N
8d75d5dc-8b50-4b99-8004-8eea2c358271	DIPAN SANDARAN LURUS NO2 CREAM.	DIVAN	unit	0.00	2250000.00	1	0		t	2026-07-06 08:06:43.617434+00	2026-07-10 03:56:21.387164+00	\N
986f79f7-702e-457d-a092-2e433c6c9be6	SOPABED ABU TUA	DIVAN	unit	0.00	2450000.00	1	0		t	2026-07-06 09:04:47.400947+00	2026-07-10 03:59:06.329639+00	\N
c96a6773-ac4c-431f-a4aa-f86cabe7ba55	SOPA PERAHU STOOL UNGU	SOPA PREMIUM 	unit	0.00	2100000.00	0	0		t	2026-07-06 09:40:37.922175+00	2026-07-12 06:04:29.765198+00	\N
5bd7fbef-47a9-4866-a94e-cd260bb872ab	DIPAN MEWAH NO1 PINK	DIVAN	unit	1950000.00	2550000.00	0	0		t	2026-07-03 11:10:17.741992+00	2026-07-13 03:41:23.720155+00	\N
bd306e99-ffe2-4034-947a-ee59be8efb69	SOPA IMPOR UNGU	SOPA PREMIUM 	unit	0.00	6250000.00	0	0		t	2026-07-06 09:39:56.912841+00	2026-07-12 06:04:29.919535+00	\N
16a59e17-cc58-42f9-91b0-ffc6cc16bec4	DIPAN EXPKLUSIF NO 2 CREAM S250 	DIVAN EXKLUSIF NO2 CREAM S250	unit	0.00	3000000.00	1	0		t	2026-07-06 09:46:19.251018+00	2026-07-12 03:20:48.204683+00	\N
781796a5-862f-4fc5-bc92-b5c7eba0c495	SOPA MINIMALIS COKLAT OSCAR	SOPA SEMI PREMIUM 	unit	0.00	2650000.00	0	0		t	2026-07-03 11:10:52.75119+00	2026-07-13 09:05:01.417955+00	\N
3b3e5b0f-e4e5-4576-a461-731e5daadd46	LEMARI BESI 2 PINTU	LEMARI BESI	unit	1525000.00	1900000.00	1	0		t	2026-07-01 08:52:18.212534+00	2026-07-13 08:36:04.892607+00	\N
c91cde3c-81b0-4d83-ac7e-0f09a71513d1	DIPAN MINIMALIS PINK BIS GOLD NO1	DIVAN	unit	0.00	1950000.00	1	0		t	2026-07-06 09:16:26.674586+00	2026-07-17 01:51:36.214666+00	\N
18a74238-b7a5-4b74-9799-12bc3d730803	DIPAN MEWAH BIRU TUA NO1	DIVAN	unit	1950000.00	2550000.00	0	0		t	2026-07-01 09:53:39.392403+00	2026-07-15 03:58:29.036017+00	\N
f0fcc68b-9b21-4f5d-8b19-4b3526b9a0c7	DIPAN KOLAM EXPKLUSIF NO1 PINK	DIVAN	unit	0.00	2700000.00	0	0		t	2026-07-06 09:41:43.855663+00	2026-07-16 05:19:43.496806+00	\N
3b81c90e-a925-48e1-9f4d-494fddd0f5b2	SOPABED	SOPA BED	unit	0.00	1550000.00	0	0		t	2026-07-01 08:12:41.186153+00	2026-07-14 12:54:40.07113+00	\N
0e779dd7-facf-4857-ad0f-3ea4b2411f5e	BOXY BNAIK NO2 HIJAU	BOXY	unit	2050000.00	2450000.00	0	0		t	2026-07-01 08:30:41.278483+00	2026-07-14 16:09:58.591155+00	\N
bec88103-8294-4cd6-b9d3-b83d4f0729eb	BED SORONG SATELIT NO1 PINK	BED SORONG 	unit	2675000.00	3000000.00	1	0		t	2026-07-06 08:22:37.669096+00	2026-07-15 03:10:43.280044+00	\N
859553f1-eaa1-417d-811d-83db1874f33f	DIPAN MEWAH NO1 ABU	DIVAN	unit	1950000.00	2550000.00	0	0		t	2026-07-06 07:48:54.889515+00	2026-07-15 03:55:25.860555+00	\N
7e1b90ee-1e5a-426c-bdcd-674aca21f9ea	DIPAN MEWAH GOLD NO1 	DIVAN	unit	1950000.00	2550000.00	1	0		t	2026-07-06 08:03:51.304397+00	2026-07-15 03:57:27.540936+00	\N
e1c2fbf4-94a0-4a96-b336-9eb47214492f	DIPAN MINIMALIS HIJAU TOSCA NO1	DIVAN	unit	1550000.00	1950000.00	0	0		t	2026-07-06 08:18:19.370702+00	2026-07-15 04:00:27.04222+00	\N
268cff99-b57e-43eb-92db-5ee249846524	DIPAN MINIMALIS PUTIH NO1	DIVAN	unit	1550000.00	1950000.00	0	0		t	2026-07-06 07:46:42.252738+00	2026-07-15 04:02:17.243911+00	\N
0f62b6f4-2336-49d7-a416-5eb99e053c84	DIPAN EXKLUSIF NO1 	DIVAN	unit	0.00	2700000.00	0	0		t	2026-07-06 09:03:24.648535+00	2026-07-16 01:16:45.21494+00	\N
6e556179-e9ee-42f4-926f-864c61022ae2	DIPAN MEWAH UNGU NO1 OSCAR	DIVAN	unit	1950000.00	2550000.00	1	0		t	2026-07-01 09:52:38.047506+00	2026-07-16 07:49:03.577844+00	\N
c1169f85-c293-4ea2-9fd2-ac681d9f94be	SOPA MINIMALIS TANGAN B ABU	SOPA SEMI PREMIUM 	unit	0.00	2650000.00	0	0		t	2026-07-07 09:31:13.748393+00	2026-07-07 09:31:13.748393+00	\N
7e4acc65-d363-4335-85df-0647f967fae8	SOPA BERANAK HITAM CREAM	SOPA SEMI PREMIUM 	unit	0.00	3200000.00	1	0		t	2026-07-07 09:33:33.506863+00	2026-07-07 09:33:33.506863+00	\N
4d88d4c9-b8ec-4583-af04-9d45f97053fb	SOPA L COKLAT	SOPA SEMI PREMIUM 	unit	0.00	2650000.00	1	0		t	2026-07-07 09:34:25.782051+00	2026-07-07 09:34:25.782051+00	\N
77c590eb-8f35-4abe-8239-ffb8bb8e0ca9	SOPA MINIMALIS UNGU 3322	SOPA SEMI PREMIUM 	unit	0.00	4200000.00	0	0		t	2026-07-07 09:38:27.056984+00	2026-07-07 09:38:27.056984+00	\N
ca3a1a29-60df-433e-ba88-59ec3138e8bf	SOPA JAGWAR ABU	SOPA JAGWAR	unit	0.00	7500000.00	0	0		t	2026-07-07 09:39:05.137886+00	2026-07-07 09:39:05.137886+00	\N
330c48c5-3769-4e41-a79d-1f6f8b84d0b0	SOPA MINIMALIS UNGU HITAM	SOPA SEMI PREMIUM 	unit	0.00	2650000.00	0	0		t	2026-07-08 02:47:08.32567+00	2026-07-08 02:47:08.32567+00	\N
e6eceae8-225a-4186-bfe6-50667b142890	DIPAN JEPARA VIBER NO1 PUTIH	DIVAN	unit	0.00	2900000.00	0	0		t	2026-07-06 09:37:21.093065+00	2026-07-09 02:23:48.053781+00	\N
5b5fadbb-46c1-4d51-ad7a-99a83bd5b9f8	MEJA RIAS MDF	MEJA RIAS	unit	0.00	3150000.00	0	0		t	2026-07-07 07:47:14.797168+00	2026-07-08 10:38:06.473085+00	\N
6ca87f2f-ec91-4c3f-aa2a-339bfd7670ed	DIPAN EXKLUSIF NO1 CREAM	DIVAN	unit	0.00	2700000.00	0	0		t	2026-07-06 09:14:41.410879+00	2026-07-09 02:14:11.920868+00	\N
441f0964-4951-425f-92ab-6f0146810c08	DIPAN KOLAM JUMBO NO1 PUTIH	DIVAN	unit	0.00	3200000.00	0	0		t	2026-07-07 04:33:18.436939+00	2026-07-09 02:31:58.279415+00	\N
af2b2ecb-bc0a-4a62-8c3c-2ee9eef0ce77	MEJA MAKAN MARMER 6K HITAM	MEJA MAKAN	unit	0.00	6500000.00	0	0		t	2026-07-09 04:00:26.740546+00	2026-07-09 04:00:26.740546+00	\N
9ca477ba-c3f8-4245-bf08-01db8c9608ff	SOPA LAMBORJINI 32 + PUK UNGU	SOPA PREMIUM 	unit	0.00	6000000.00	0	0		t	2026-07-09 04:05:20.495884+00	2026-07-09 04:05:20.495884+00	\N
7b92628a-4f55-4d38-90da-ebdc074264da	SOPA MINIMALIS HIJAU	SOPA SEMI PREMIUM 	unit	0.00	3000000.00	0	0		t	2026-07-01 08:28:32.615368+00	2026-07-10 02:04:17.407544+00	\N
564b2832-7476-4972-afee-6dd5c63e4446	KURSI SUDUT JEPARA COKLAT GOLD SET BANTAL	KURSI JATI	1 unit	0.00	4300000.00	0	0		t	2026-07-11 13:50:37.095446+00	2026-07-11 13:56:35.670315+00	\N
495b0b7a-30de-488d-a0eb-47b3669ba633	DIPAN SANDARAN LURUS NO1 CREAM	DIVAN	unit	0.00	2350000.00	0	0		t	2026-07-09 04:16:16.317671+00	2026-07-10 03:54:36.987317+00	\N
6822128e-261a-4e88-8f42-aecfaea19a72	DIPAN UKURAN KHUSUS	DIVAN	unit	0.00	5600000.00	0	0		t	2026-06-26 14:23:59.244211+00	2026-07-10 09:25:56.221307+00	\N
33675935-9993-404c-842e-3cc836eefc01	DIPAN KOLAM GARIS NO2 ABU	DIVAN	unit	0.00	2650000.00	0	0		t	2026-07-06 09:24:08.100842+00	2026-07-11 01:58:51.793383+00	\N
9f2f1cf1-846c-42f0-9852-056ad6026ad5	DIPAN MEWAH HIJAU NO1	DIVAN	unit	1950000.00	2550000.00	0	0		t	2026-07-06 09:38:26.908484+00	2026-07-15 03:57:03.538+00	\N
e830c89c-2982-4f22-9fd9-49740fe9d219	DIPAN KOLAM JUMBO NO1 COKLAT GELAP	DIVAN	unit	0.00	3100000.00	1	0		t	2026-07-06 09:39:33.204405+00	2026-07-11 04:05:09.897074+00	\N
c8e767db-9844-4393-b8ee-63e034b338ca	DIPAN MINIMALIS NO1 GOLD	DIVAN	unit	1550000.00	1950000.00	1	0		t	2026-07-06 09:41:02.346599+00	2026-07-15 04:01:45.706173+00	\N
9bcc0ee3-cd10-4be0-a1f4-c3c30c7ac080	BELLAGIO KOPER 3211	KURSI BELLAGIO	unit	17000000.00	25000000.00	0	0		t	2026-07-08 02:48:57.96318+00	2026-07-11 07:49:37.008732+00	\N
1293ab5b-f55c-4f94-8dfa-a526e9c8c9a8	DIPAN MINIMALIS 200X200	DIVAN	unit	0.00	2150000.00	0	0		t	2026-07-15 07:32:54.680806+00	2026-07-15 07:32:54.680806+00	\N
2db4df0a-1520-4053-8238-2c8dad1699f0	MEJA TAMU KACA	MEJA TAMU	unit	0.00	350000.00	2	350000		t	2026-07-12 03:50:15.990719+00	2026-07-12 08:50:32.23557+00	\N
83526983-ae26-4d28-9da9-d1c45960f855	DIPAN SANDARAN LURUS NO 1 - cream	DIVAN	1 unit	0.00	2350000.00	0	0		t	2026-07-11 14:47:11.741721+00	2026-07-11 15:18:16.620337+00	\N
c9cfdccf-96c7-442a-a0f2-ac5e7eb2e95f	SOFA PERAHU SET STOLL - UNGU	SOPA PREMIUM	1 unit	0.00	2100000.00	1	0		t	2026-07-11 14:28:05.650541+00	2026-07-11 15:25:41.831956+00	\N
dfde7bc2-cadc-49fc-b559-751fc3e0e5e4	DIPAN EXKLUSIF NO2 CREAM S250	DIVAN	unit	0.00	3000000.00	0	0		t	2026-07-12 03:26:26.173193+00	2026-07-12 03:29:52.580675+00	\N
88bda3a2-a6e2-406e-907a-ec7f0fdf11d4	MEJA MAKAN GRANIT 6 KURSI IVORY	MEJA MAKAN	unit	1575000.00	2200000.00	2	0		t	2026-06-26 14:23:59.244211+00	2026-07-12 03:53:56.545934+00	\N
40950298-f3f7-452d-9528-77519e40382a	SOPA SUDUT	SOPA SEMI PREMIUM 	unit	0.00	2950000.00	0	0		t	2026-07-12 04:06:12.370615+00	2026-07-12 04:06:12.370615+00	\N
4366f0c6-3077-42cd-a531-3ea1f1aa9993	SOPABED PREMIUM	SOPABED	unit	0.00	1550000.00	0	0		t	2026-07-12 04:12:38.119307+00	2026-07-12 04:12:38.119307+00	\N
5ce9ce94-2175-4291-b86c-92acfab8efe2	DIPAN MEWAH BIRU NO1	DIVAN	unit	1950000.00	2550000.00	0	0		t	2026-07-07 07:50:09.969043+00	2026-07-15 03:58:49.471716+00	\N
57047e7a-0e75-4ba6-a7f0-dbe2d281b27e	DIPAN MINIMALIS BIRU NO1	DIVAN	unit	1550000.00	1950000.00	0	0		t	2026-07-06 09:45:37.909077+00	2026-07-15 03:50:53.653387+00	\N
df191515-db04-4f36-a664-78e4d84852d3	BEDA SORONG CONFORTA NO3 BIRU	BED SORONG	unit	3650000.00	4300000.00	0	1		t	2026-07-06 09:55:36.229397+00	2026-07-13 09:09:45.46794+00	\N
c7baf1c1-accc-4456-a8b5-da6a31df5d5b	MEJA MAKAN JATI 6 KURSI	MEJA MAKAN	1 unit	0.00	3350000.00	0	0		t	2026-07-11 14:09:42.345663+00	2026-07-14 06:06:48.649962+00	\N
b8301067-acdd-43a5-81b3-ce893804371d	DIPAN MEWAH NO 1 SET 2 NAKAS	DIVAN	unit	2950000.00	3550000.00	0	0		t	2026-07-12 04:00:43.779087+00	2026-07-15 03:56:18.796254+00	\N
e99f7289-22d6-43b4-8318-d2ff20cbfef8	BOXY CONFORTA NO1	BOXY	unit	2550000.00	3150000.00	0	0		t	2026-07-13 07:06:52.100905+00	2026-07-14 16:11:03.143189+00	\N
42a7b3be-04e8-4f9c-a027-2b53605685f5	DIPAN MINIMALIS ABU NO1	DIVAN	unit	1550000.00	1950000.00	0	0		t	2026-07-08 12:27:13.147184+00	2026-07-15 03:51:11.44254+00	\N
ff476b2e-db89-4fbd-96aa-94c3c3546939	DIPAN MINIMALIS PINK FANTA NO1	DIVAN	unit	0.00	1950000.00	1	0		t	2026-07-06 09:51:05.23781+00	2026-07-15 03:07:47.91868+00	\N
1208c054-9794-4862-a001-4d4fa5c1686e	DIPAN JEPARA VIBER NO2	DIVAN	unit	0.00	2850000.00	0	0		t	2026-07-15 03:12:51.698592+00	2026-07-15 03:12:51.698592+00	\N
e6fb0a21-4d92-4640-a7ad-2c1da6738f37	JEPARA SUDUT 	KURSI JATI	unit	2550000.00	4000000.00	2	0		t	2026-06-29 08:33:26.642882+00	2026-07-15 03:36:01.316874+00	\N
4cc2ff8c-67cd-4db3-9555-838788360a18	BOXY HAWAI NO.1 - BIRU	Boxy	unit	2200000.00	2650000.00	0	0		t	2026-07-07 01:14:35.487709+00	2026-07-15 03:42:58.547264+00	\N
a67d3788-c33e-4c00-b29c-b4d1706a8d23	DIPAN MEWAH UNGU NO1	DIVAN	unit	1950000.00	2550000.00	0	0		t	2026-07-06 08:00:39.861866+00	2026-07-15 03:51:37.715029+00	\N
9447a82d-2448-4c2f-a0e6-cb4324f62c9b	BOXY PROCELLA DOBELBED NO1	BOXY	unit	2995000.00	3500000.00	0	0		t	2026-07-13 07:06:20.973342+00	2026-07-15 03:44:08.810884+00	\N
6a4f6bb3-9c89-46ab-b75c-a27df9ffa2d4	DIPAN MINIMALIS GOLD NO1	DIVAN	unit	1550000.00	1950000.00	1	0		t	2026-07-06 09:49:21.222602+00	2026-07-15 03:49:24.172995+00	\N
b7675f90-bc8d-4cf4-a47f-4bf900671f33	DIPAN MINIMALIS COKLAT NO1	DIVAN	unit	1550000.00	1950000.00	0	0		t	2026-07-06 09:42:08.088365+00	2026-07-15 03:50:39.77744+00	\N
78245a88-fafb-4fdc-bff4-eee6fd7a3061	DIPAN MEWAH NO1	DIVAN	unit	0.00	2550000.00	0	0		t	2026-07-16 07:14:45.347679+00	2026-07-16 10:49:08.751777+00	\N
820abaee-ba19-43f1-a9ad-56c8a5571201	DIPAN MEWAH MARON NO1	DIVAN	unit	1950000.00	2550000.00	0	0		t	2026-07-06 09:48:41.69029+00	2026-07-15 03:56:51.691027+00	\N
27de36ab-ae58-45a7-a6ab-034f3c336da0	DIPAN MEWAH CREAM NO1	DIVAN	unit	1950000.00	2550000.00	1	0		t	2026-07-06 09:36:46.245609+00	2026-07-15 03:57:39.044995+00	\N
8378ae37-5be0-47f2-8829-12305f88f347	DIPAN KOLAM NO1 CREAM	DIVAN	unit	2150000.00	2750000.00	0	0		t	2026-07-06 09:46:56.752006+00	2026-07-15 03:59:08.837348+00	\N
e9a4686f-b441-4ede-9d5e-8545f1f66885	DIPAN MINIMALIS MAROON NO1	DIVAN	unit	1550000.00	1950000.00	0	0		t	2026-07-09 04:06:03.15289+00	2026-07-15 04:00:37.083015+00	\N
972aa697-a04d-4185-bda5-0cbd95b48754	DIPAN MINIMALIS NO 1 PAKAI LACI	DIVAN	1 unit	1750000.00	2250000.00	0	0		t	2026-07-15 02:29:32.855646+00	2026-07-15 04:01:11.870788+00	\N
1f9a5e3e-f5d2-4348-bc64-39321bce1f14	DIPAN KOLAM JUMBO NO1 COKLAT 	DIVAN	unit	0.00	3200000.00	0	0		t	2026-07-06 09:47:30.017534+00	2026-07-15 06:27:47.236724+00	\N
7e67cb99-9efd-4629-860a-950dbf366db9	DIPAN KOLAM JUMBO NO1 CREAM	DIVAN	unit	0.00	3200000.00	1	0		t	2026-07-06 09:39:05.05753+00	2026-07-16 01:14:27.498758+00	\N
84c27d0f-e8c4-49f9-8dee-4bcf280dcf53	DIPAN SANDARAN EXKLUSIF NO 1 pink	DIVAN	1 unit	0.00	2300000.00	0	0		t	2026-07-15 04:44:52.319317+00	2026-07-16 01:27:51.516959+00	\N
965777c5-eeda-4a18-9e21-3f9315c28441	SOPA LAMBORJINI ORANGE 321 + STOOL	SOPA PREMIUM 	unit	0.00	6000000.00	0	0		t	2026-07-06 09:27:28.111738+00	2026-07-16 11:11:38.689835+00	\N
7a2ce8f9-e0bd-4be8-9476-4cfb916c89ce	JEPARA SUDUT PAKE BANTAL	KURSI JATI	unit	0.00	4300000.00	0	0		t	2026-07-16 03:23:13.703431+00	2026-07-16 03:32:45.93253+00	\N
316e8813-4623-4740-8c9d-8b20f3dcea9c	DIPAN MEWAH EXKLUSIF NO 1	DIVAN	1 unit	0.00	2700000.00	0	0		t	2026-07-16 05:21:02.296798+00	2026-07-16 05:23:37.553399+00	\N
1ab176c0-fec1-4f0f-9d5f-e903410b713b	DIPAN MEWAH MERAH NO1	DIVAN	unit	1950000.00	2550000.00	0	0		t	2026-07-06 09:34:41.079198+00	2026-07-16 10:49:08.591221+00	\N
b4077288-a2aa-467f-b68f-b3e778972409	KURSI PENGANTIN TIPE 2	KURSI JATI	unit	0.00	3500000.00	0	0		t	2026-07-16 01:30:19.056978+00	2026-07-16 10:52:00.978852+00	\N
c4a174a9-30ac-4b95-b0ec-3b599ebc9014	DIPAN MEWAH NO1 SET PERAHU	DIVAN	unit	2750000.00	3550000.00	1	0		t	2026-07-12 03:59:31.064377+00	2026-07-17 01:50:31.517314+00	\N
706d5532-5497-4383-95d1-b10517a654c3	DIPAN MEWAH NO2	DIVAN	unit	0.00	2450000.00	0	0		t	2026-07-16 07:23:57.313512+00	2026-07-16 07:47:26.64336+00	\N
\.


--
-- Data for Name: produk_foto; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.produk_foto (id, produk_id, url, urutan, created_at) FROM stdin;
690bb24f-fa77-4864-afde-4b31b78909fa	b4077288-a2aa-467f-b68f-b3e778972409	https://supabase.solvexaerp.tech/storage/v1/object/public/BungaNaik/b4077288-a2aa-467f-b68f-b3e778972409/1784165628369-m48obtg3f2.jpeg	0	2026-07-16 01:33:48.985792+00
1f7b25dc-4df7-4a34-9db2-94eef6b5958d	bd500403-2dd4-456b-9496-46552eb853aa	https://supabase.solvexaerp.tech/storage/v1/object/public/BungaNaik/bd500403-2dd4-456b-9496-46552eb853aa/1783221193880-7le9ymf96dk.jpg	0	2026-07-05 03:13:59.606051+00
b304162a-e783-4ced-a094-d31d4e42f89e	31b268c9-d467-4a88-b0ae-ac96b16f7629	https://supabase.solvexaerp.tech/storage/v1/object/public/BungaNaik/31b268c9-d467-4a88-b0ae-ac96b16f7629/1783221258049-tvv8s6ofpn.jpg	0	2026-07-05 03:15:05.52085+00
46148430-cc8c-4aef-a492-9f3309a7b427	0d8d9824-6586-4b48-a3e3-88369cf3ba40	https://supabase.solvexaerp.tech/storage/v1/object/public/BungaNaik/0d8d9824-6586-4b48-a3e3-88369cf3ba40/1783241910366-1n581g7kse2.jpg	0	2026-07-05 08:59:12.227674+00
d6c0822c-719d-40a9-b426-680a57e1d313	4bbec497-db20-4b22-99d6-4be071217f6c	https://supabase.solvexaerp.tech/storage/v1/object/public/BungaNaik/4bbec497-db20-4b22-99d6-4be071217f6c/1783561760019-ybbps6wkmkp.jpg	0	2026-07-09 01:49:28.794221+00
88ce3d74-0a5d-4989-9633-d3fd69eac591	859553f1-eaa1-417d-811d-83db1874f33f	https://supabase.solvexaerp.tech/storage/v1/object/public/BungaNaik/859553f1-eaa1-417d-811d-83db1874f33f/1783564977941-msamm3t4r3.jpg	0	2026-07-09 02:42:59.927546+00
0e2560a6-194d-4842-ad3d-23e8868bb17f	1ab176c0-fec1-4f0f-9d5f-e903410b713b	https://supabase.solvexaerp.tech/storage/v1/object/public/BungaNaik/1ab176c0-fec1-4f0f-9d5f-e903410b713b/1783565010478-wvrhj2gurhh.jpg	0	2026-07-09 02:43:32.070865+00
9a0b41f9-1c76-405f-af07-e292d7779212	7e1b90ee-1e5a-426c-bdcd-674aca21f9ea	https://supabase.solvexaerp.tech/storage/v1/object/public/BungaNaik/7e1b90ee-1e5a-426c-bdcd-674aca21f9ea/1783565038491-vjkxuc94m7.jpg	0	2026-07-09 02:44:00.7653+00
4629707f-a5d9-4b87-a53d-34eb997ede4d	820abaee-ba19-43f1-a9ad-56c8a5571201	https://supabase.solvexaerp.tech/storage/v1/object/public/BungaNaik/820abaee-ba19-43f1-a9ad-56c8a5571201/1783565066830-37mqg1dyyr7.jpg	0	2026-07-09 02:44:28.936428+00
b48eb3d0-481a-48ae-be92-3555d653f8b5	c7baf1c1-accc-4456-a8b5-da6a31df5d5b	https://supabase.solvexaerp.tech/storage/v1/object/public/BungaNaik/c7baf1c1-accc-4456-a8b5-da6a31df5d5b/1783778982754-sup10fzvvn8.jpeg	0	2026-07-11 14:09:44.908689+00
e0cd0299-c7fe-4296-a226-00c70a7b5ee9	c96a6773-ac4c-431f-a4aa-f86cabe7ba55	https://supabase.solvexaerp.tech/storage/v1/object/public/BungaNaik/c96a6773-ac4c-431f-a4aa-f86cabe7ba55/1783835865714-j7c86yi4lxj.jpg	0	2026-07-12 05:57:47.504051+00
a65a932e-bb64-4ebc-b3a3-497e82dd3e56	3b81c90e-a925-48e1-9f4d-494fddd0f5b2	https://supabase.solvexaerp.tech/storage/v1/object/public/BungaNaik/3b81c90e-a925-48e1-9f4d-494fddd0f5b2/1782893561891-j2ev5qkhf1.jpg	0	2026-07-01 08:12:43.560193+00
3b54d7d9-a9cd-416d-8e98-47a3abf0fd96	3b81c90e-a925-48e1-9f4d-494fddd0f5b2	https://supabase.solvexaerp.tech/storage/v1/object/public/BungaNaik/3b81c90e-a925-48e1-9f4d-494fddd0f5b2/1782893563748-e0gxtekiem6.jpg	1	2026-07-01 08:12:46.829178+00
fbe89d5c-9e71-4e0d-8940-fa9f966813a7	7b92628a-4f55-4d38-90da-ebdc074264da	https://supabase.solvexaerp.tech/storage/v1/object/public/BungaNaik/7b92628a-4f55-4d38-90da-ebdc074264da/1782894513388-cooaltkv266.jpg	0	2026-07-01 08:28:35.754649+00
396fe67f-9369-4e4c-882f-0133ef15e2fd	317886a5-7737-47a3-99d2-dbda3a4c8a82	https://supabase.solvexaerp.tech/storage/v1/object/public/BungaNaik/317886a5-7737-47a3-99d2-dbda3a4c8a82/1783062137136-3ml6hmfxpma.jpg	0	2026-07-03 07:02:21.49876+00
7d5a7f45-457d-4da7-bfc5-fb7d87dd1719	5ceaacb6-d7b5-4216-ac40-c4d8b3e9aa3c	https://supabase.solvexaerp.tech/storage/v1/object/public/BungaNaik/5ceaacb6-d7b5-4216-ac40-c4d8b3e9aa3c/1783062497396-bjgarirdm3u.jpg	0	2026-07-03 07:08:21.978883+00
86c4aaad-dfc0-4bc0-be7b-90924ff6ddc3	c719d131-4fbe-46ff-8d4a-0dc73ef5abe0	https://supabase.solvexaerp.tech/storage/v1/object/public/BungaNaik/c719d131-4fbe-46ff-8d4a-0dc73ef5abe0/1783062652385-rxnw5yza4ia.jpg	0	2026-07-03 07:10:57.612767+00
1a2ca274-ce6b-4ed2-9ae7-50284079569f	1af1a16f-c20c-4283-a102-ca79a5e3196f	https://supabase.solvexaerp.tech/storage/v1/object/public/BungaNaik/1af1a16f-c20c-4283-a102-ca79a5e3196f/1783062704183-qw7bh6353kr.jpg	0	2026-07-03 07:11:51.612724+00
c0555eb6-ad0c-4c1c-9d83-a5bd9b609536	0c2afa49-f55b-45e2-a0dc-9dfd5f30b766	https://supabase.solvexaerp.tech/storage/v1/object/public/BungaNaik/0c2afa49-f55b-45e2-a0dc-9dfd5f30b766/1783062799165-2jvav8svfhk.jpg	0	2026-07-03 07:13:21.937638+00
75d871a4-19ed-46b9-b4d9-a97869fb99dc	0639c160-5f47-4894-ac58-77b1d1ed5458	https://supabase.solvexaerp.tech/storage/v1/object/public/BungaNaik/0639c160-5f47-4894-ac58-77b1d1ed5458/1783062885309-vn6goo2scy.jpg	0	2026-07-03 07:14:53.079636+00
0951b112-4a82-4490-928f-e44fbf719d23	7fb56c17-01b3-46f1-9c43-d897d3ef9644	https://supabase.solvexaerp.tech/storage/v1/object/public/BungaNaik/7fb56c17-01b3-46f1-9c43-d897d3ef9644/1783062938396-tshyi7pxse9.jpg	0	2026-07-03 07:15:46.015433+00
8a2f3437-40aa-4b35-b077-5902b1206add	91237d66-7fdb-45a7-a1b6-dd59335e5ebb	https://supabase.solvexaerp.tech/storage/v1/object/public/BungaNaik/91237d66-7fdb-45a7-a1b6-dd59335e5ebb/1783062992787-1x1uoyaee3w.jpg	0	2026-07-03 07:16:37.61288+00
0772931b-49de-4629-85d4-f0fbb931d7ab	6a366d28-af38-4364-85a4-b4c4f0e7c64f	https://supabase.solvexaerp.tech/storage/v1/object/public/BungaNaik/6a366d28-af38-4364-85a4-b4c4f0e7c64f/1783063039940-tomyj0609ap.jpg	0	2026-07-03 07:17:25.682321+00
c814b2e2-c6ba-4719-aea2-bc04ba3378ef	21bfd29f-0436-43d0-b450-172eafe6b43f	https://supabase.solvexaerp.tech/storage/v1/object/public/BungaNaik/21bfd29f-0436-43d0-b450-172eafe6b43f/1783063096660-za1ghpsbrn.jpg	0	2026-07-03 07:18:22.569434+00
d34b1bc7-7663-470b-a93c-ef69ec5dae2c	2311893b-3b1f-4f2c-9521-c587e5dd59a1	https://supabase.solvexaerp.tech/storage/v1/object/public/BungaNaik/2311893b-3b1f-4f2c-9521-c587e5dd59a1/1783063305713-1uvaoarbtn3.jpg	0	2026-07-03 07:21:50.922018+00
97107f13-c44f-4093-be81-5a7f5bc53238	359c2837-18f0-466a-b592-cf33fad21126	https://supabase.solvexaerp.tech/storage/v1/object/public/BungaNaik/359c2837-18f0-466a-b592-cf33fad21126/1783063333606-26xr2f4atjw.jpg	0	2026-07-03 07:22:20.023897+00
a1d93b74-6773-4172-8095-eb78d45c3e19	5b3a11ff-5322-487a-83ed-1e77cd2569fc	https://supabase.solvexaerp.tech/storage/v1/object/public/BungaNaik/5b3a11ff-5322-487a-83ed-1e77cd2569fc/1783063370019-kgg2soci2y.jpg	0	2026-07-03 07:22:55.329427+00
30d18c6a-d0cf-4a95-ada5-2b08b8288bf8	90159552-8b47-41f1-b0cd-de4fd8002774	https://supabase.solvexaerp.tech/storage/v1/object/public/BungaNaik/90159552-8b47-41f1-b0cd-de4fd8002774/1783063425093-or7d4upgv9q.jpg	0	2026-07-03 07:23:52.699972+00
40ec7455-bc5b-49ec-8741-44899932b899	129bea54-175a-468c-9083-7e77d31a6aa6	https://supabase.solvexaerp.tech/storage/v1/object/public/BungaNaik/129bea54-175a-468c-9083-7e77d31a6aa6/1783063469949-4kbgetxpi7u.jpg	0	2026-07-03 07:24:35.000666+00
76ff2bb9-0fbb-47ce-8e89-a1b3445a67f5	3ae8b422-c230-49a3-82ec-64253695718e	https://supabase.solvexaerp.tech/storage/v1/object/public/BungaNaik/3ae8b422-c230-49a3-82ec-64253695718e/1783063573295-xgtf0lgk8fl.jpg	0	2026-07-03 07:26:18.033693+00
0852d17e-c8a2-44d2-8d34-8731b1a9dd9b	34fefb75-a56c-499a-8b52-fc69a7887b3a	https://supabase.solvexaerp.tech/storage/v1/object/public/BungaNaik/34fefb75-a56c-499a-8b52-fc69a7887b3a/1783063928895-biurprvd0u.jpg	0	2026-07-03 07:32:23.661469+00
d5b35c32-ebda-4ad8-9e57-eaebf506afcb	0b996cea-99f1-484f-92c0-05f6fd40f278	https://supabase.solvexaerp.tech/storage/v1/object/public/BungaNaik/0b996cea-99f1-484f-92c0-05f6fd40f278/1783064025686-lcuedv9n48b.jpg	0	2026-07-03 07:33:58.139757+00
4762def5-859a-4a11-bfe4-f84ca4ac2425	49899fd9-cbfd-408d-a56a-a890634ded18	https://supabase.solvexaerp.tech/storage/v1/object/public/BungaNaik/49899fd9-cbfd-408d-a56a-a890634ded18/1783064091823-e1g4sygibsa.jpg	0	2026-07-03 07:34:59.338387+00
d4a6dd0d-fa7a-4ad8-b454-248b441e6c9a	c2dd5aca-10a4-433b-8163-36cc679cf8d4	https://supabase.solvexaerp.tech/storage/v1/object/public/BungaNaik/c2dd5aca-10a4-433b-8163-36cc679cf8d4/1783064143052-7fhp2w7i79w.jpg	0	2026-07-03 07:35:53.412915+00
81983674-7dd4-4ef4-8471-83d7676418e7	0e779dd7-facf-4857-ad0f-3ea4b2411f5e	https://supabase.solvexaerp.tech/storage/v1/object/public/BungaNaik/0e779dd7-facf-4857-ad0f-3ea4b2411f5e/1783064199920-nn3ng3jwdg8.jpg	0	2026-07-03 07:36:43.272487+00
5f4e7c6a-0dae-4443-8b1a-2678c9464e5f	441b3658-d473-4687-93b8-f1c5a170d1ea	https://supabase.solvexaerp.tech/storage/v1/object/public/BungaNaik/441b3658-d473-4687-93b8-f1c5a170d1ea/1783064247289-bpxn4mnxoh6.jpg	0	2026-07-03 07:37:32.632622+00
acc31c5b-48e7-48bb-81b0-9a3c9861cb69	8d66a995-ff1a-4dfa-9ade-79797cb91fb5	https://supabase.solvexaerp.tech/storage/v1/object/public/BungaNaik/8d66a995-ff1a-4dfa-9ade-79797cb91fb5/1783064320604-f72y8hhgwy.jpg	0	2026-07-03 07:39:12.139088+00
e4c20ede-413f-462e-95df-3351de56a96e	6ab79fc5-d683-46dc-9599-8f17c6294e55	https://supabase.solvexaerp.tech/storage/v1/object/public/BungaNaik/6ab79fc5-d683-46dc-9599-8f17c6294e55/1783066147089-gtr2pydjjlk.jpg	0	2026-07-03 08:09:11.170109+00
17a1cd76-807f-426c-a8be-7484a8d47c14	6d8b5b5f-bf75-4f21-b375-a28a6a502099	https://supabase.solvexaerp.tech/storage/v1/object/public/BungaNaik/6d8b5b5f-bf75-4f21-b375-a28a6a502099/1783066332211-zc18s62he5i.jpg	0	2026-07-03 08:12:16.786103+00
86dfd756-11db-4b90-837c-5198329e92c1	b20bd760-1bac-4c93-b6ec-b227792e0fb7	https://supabase.solvexaerp.tech/storage/v1/object/public/BungaNaik/b20bd760-1bac-4c93-b6ec-b227792e0fb7/1783066369981-ef5wwjxe0t.jpg	0	2026-07-03 08:12:53.108425+00
a5b0a358-e5f8-40b9-9aa4-acb009a4429a	c1119760-37cd-47a3-8c80-28464ba0d594	https://supabase.solvexaerp.tech/storage/v1/object/public/BungaNaik/c1119760-37cd-47a3-8c80-28464ba0d594/1783066404673-3i4lbosgitm.jpg	0	2026-07-03 08:13:31.361132+00
4f96a7c1-88b8-4484-ace1-d4fa14f10bd1	f9e4976e-8894-4e8e-a0cb-a5be21ed2f63	https://supabase.solvexaerp.tech/storage/v1/object/public/BungaNaik/f9e4976e-8894-4e8e-a0cb-a5be21ed2f63/1783066428057-qabuvrih2s.jpg	0	2026-07-03 08:13:52.919177+00
29c42c4f-0cd3-493e-9c9b-c869b2a00888	5386430d-38a3-47de-8467-aa2fa1ace678	https://supabase.solvexaerp.tech/storage/v1/object/public/BungaNaik/5386430d-38a3-47de-8467-aa2fa1ace678/1783066458647-slbqdnqdf88.jpg	0	2026-07-03 08:14:21.200442+00
2fd4827f-3f73-40d0-ba7b-81e2590f280a	49fadd57-dcfd-47c7-b550-aca93e25b520	https://supabase.solvexaerp.tech/storage/v1/object/public/BungaNaik/49fadd57-dcfd-47c7-b550-aca93e25b520/1783066497971-8lecbhzk288.jpg	0	2026-07-03 08:15:01.654884+00
86b60b1b-fca4-4146-b8de-282ae49eef06	9d8d5fc8-cb97-4880-ae4b-f5968ce3a475	https://supabase.solvexaerp.tech/storage/v1/object/public/BungaNaik/9d8d5fc8-cb97-4880-ae4b-f5968ce3a475/1783066531158-n04qyu981ff.jpg	0	2026-07-03 08:15:33.154623+00
0873b64c-9eb0-477b-9fd0-0c054e2fc0d3	416aa7fe-8ed6-440f-abaa-f4c7c15b0846	https://supabase.solvexaerp.tech/storage/v1/object/public/BungaNaik/416aa7fe-8ed6-440f-abaa-f4c7c15b0846/1783066561871-xltuqx01a18.jpg	0	2026-07-03 08:16:04.502869+00
029ba259-f969-4257-95c7-bdcac8bd6d65	023e06fb-e740-4a7c-be34-85d1a0e1c625	https://supabase.solvexaerp.tech/storage/v1/object/public/BungaNaik/023e06fb-e740-4a7c-be34-85d1a0e1c625/1783066627137-o1eaetsodi8.jpg	0	2026-07-03 08:17:12.072027+00
89cba9b6-9bcd-4109-8c17-4be555557bab	41c51212-5ca0-4974-af37-b0e85a234dfc	https://supabase.solvexaerp.tech/storage/v1/object/public/BungaNaik/41c51212-5ca0-4974-af37-b0e85a234dfc/1783066664480-0ii7a0rzhmxi.jpg	0	2026-07-03 08:17:48.455276+00
4eda5a98-3bc3-4853-a86f-d84faf85b5dc	22217fc3-5a69-4f3b-a200-b17046d70311	https://supabase.solvexaerp.tech/storage/v1/object/public/BungaNaik/22217fc3-5a69-4f3b-a200-b17046d70311/1783067203801-jh5654sa9qc.jpg	0	2026-07-03 08:26:47.470781+00
1435677d-f66f-48ca-9ada-c87aa549c0d5	8f1037fa-5841-4310-b208-eeab681f7dd7	https://supabase.solvexaerp.tech/storage/v1/object/public/BungaNaik/8f1037fa-5841-4310-b208-eeab681f7dd7/1783067369346-9od59ukn7be.jpg	0	2026-07-03 08:29:33.794836+00
4eb452ab-6f94-450f-8fe9-b98cf7efb12e	b9f5db83-c509-47bf-987b-a94e97875714	https://supabase.solvexaerp.tech/storage/v1/object/public/BungaNaik/b9f5db83-c509-47bf-987b-a94e97875714/1783067406879-nsmxeef4p2e.jpg	0	2026-07-03 08:30:11.533071+00
468d63a5-68c8-41f3-94a3-9acdb7b6233d	23b9749b-e1d8-42c3-98c9-ccb4d3c79b7c	https://supabase.solvexaerp.tech/storage/v1/object/public/BungaNaik/23b9749b-e1d8-42c3-98c9-ccb4d3c79b7c/1783067639265-f15qmfg6mbm.jpg	0	2026-07-03 08:34:06.925517+00
ffa6f1dd-ee06-4581-b8ce-69ba9fda797b	293d149e-c109-4c69-9e95-3a45f7630df7	https://supabase.solvexaerp.tech/storage/v1/object/public/BungaNaik/293d149e-c109-4c69-9e95-3a45f7630df7/1783067723900-qj251tvb0cl.jpg	0	2026-07-03 08:35:31.11874+00
e0df11f3-8dd1-4b14-8484-7af6d604c672	3b3e5b0f-e4e5-4576-a461-731e5daadd46	https://supabase.solvexaerp.tech/storage/v1/object/public/BungaNaik/3b3e5b0f-e4e5-4576-a461-731e5daadd46/1783069214615-r8b4kt0pyk.jpg	0	2026-07-03 09:00:16.896794+00
c3c9038d-42d1-48f8-acaa-794cae9f8fab	b898575d-0f68-4524-8a21-0c3958e5b54e	https://supabase.solvexaerp.tech/storage/v1/object/public/BungaNaik/b898575d-0f68-4524-8a21-0c3958e5b54e/1783069248446-rg2pul4879.jpg	0	2026-07-03 09:00:54.296092+00
873e794f-07b9-445b-a3e8-fa1d6d8b617b	e4498b56-adff-42ec-85e8-feb0d206d622	https://supabase.solvexaerp.tech/storage/v1/object/public/BungaNaik/e4498b56-adff-42ec-85e8-feb0d206d622/1783069301574-yijm9toabl.jpg	0	2026-07-03 09:01:50.422401+00
16d2b34b-83ee-4aca-a259-24f0a53d0d79	74043623-578c-49a6-970f-1614e16c7723	https://supabase.solvexaerp.tech/storage/v1/object/public/BungaNaik/74043623-578c-49a6-970f-1614e16c7723/1783069324792-9acnji6fy2.jpg	0	2026-07-03 09:02:15.400993+00
53cee383-ad53-4be9-af20-f05a7b28f6d8	36c68a39-6ad6-459f-b133-8bbd12db0343	https://supabase.solvexaerp.tech/storage/v1/object/public/BungaNaik/36c68a39-6ad6-459f-b133-8bbd12db0343/1783069449341-e4ts8y9mn25.jpg	0	2026-07-03 09:04:16.326189+00
8f3d12a2-1014-480b-8e60-40701af74423	478f4d15-3bcb-4bf0-b6dd-34a9a519277e	https://supabase.solvexaerp.tech/storage/v1/object/public/BungaNaik/478f4d15-3bcb-4bf0-b6dd-34a9a519277e/1783069469307-33o4na6bw9y.jpg	0	2026-07-03 09:04:34.52243+00
45d902a3-cc6c-4855-a48f-2d662a6f4b96	439244eb-9d02-4ade-9530-c0d5a23ba2e5	https://supabase.solvexaerp.tech/storage/v1/object/public/BungaNaik/439244eb-9d02-4ade-9530-c0d5a23ba2e5/1783069516728-ffmhbp4rfq.jpg	0	2026-07-03 09:05:22.06627+00
c296320e-06ac-48db-9d5d-1f8a733cf761	5bd7fbef-47a9-4866-a94e-cd260bb872ab	https://supabase.solvexaerp.tech/storage/v1/object/public/BungaNaik/5bd7fbef-47a9-4866-a94e-cd260bb872ab/1783159168060-aeaqvniqbb.jpg	0	2026-07-04 09:59:40.991526+00
6623a1fd-706f-49b0-bc56-3dd9a41e8188	0d220e68-b324-41c8-8dce-c7ac72efe169	https://supabase.solvexaerp.tech/storage/v1/object/public/BungaNaik/0d220e68-b324-41c8-8dce-c7ac72efe169/1783159242356-ciwq5ysbp6w.jpg	0	2026-07-04 10:00:50.7682+00
cf5f43d2-bd0b-4b70-8f0b-aa1997316c02	e46a4119-14cc-47a9-b7ac-a74dcf7c5138	https://supabase.solvexaerp.tech/storage/v1/object/public/BungaNaik/e46a4119-14cc-47a9-b7ac-a74dcf7c5138/1783159342392-oudi99qxo2d.jpg	0	2026-07-04 10:02:42.165863+00
e47608dc-e475-4d25-8f08-f3edb96dbddb	e6fb0a21-4d92-4640-a7ad-2c1da6738f37	https://supabase.solvexaerp.tech/storage/v1/object/public/BungaNaik/e6fb0a21-4d92-4640-a7ad-2c1da6738f37/1783218373277-pdaazftomab.jpg	0	2026-07-05 02:26:28.170497+00
0221681e-ffdd-469d-a9ac-ea388242c180	e6fb0a21-4d92-4640-a7ad-2c1da6738f37	https://supabase.solvexaerp.tech/storage/v1/object/public/BungaNaik/e6fb0a21-4d92-4640-a7ad-2c1da6738f37/1783218388169-fprn9fdekba.jpg	1	2026-07-05 02:27:13.324499+00
4c2c7252-8088-4991-97a5-075137178e68	88bda3a2-a6e2-406e-907a-ec7f0fdf11d4	https://supabase.solvexaerp.tech/storage/v1/object/public/BungaNaik/88bda3a2-a6e2-406e-907a-ec7f0fdf11d4/1783218819771-5gu89macefd.jpg	0	2026-07-05 02:33:47.4398+00
fb1ffd8c-03fe-40ca-92f7-037a51e4fb08	d09fe919-25fa-4c6a-98ab-e372d4c9cd58	https://supabase.solvexaerp.tech/storage/v1/object/public/BungaNaik/d09fe919-25fa-4c6a-98ab-e372d4c9cd58/1783219017539-ym3hpakfvlr.jpg	0	2026-07-05 02:37:04.007633+00
77db3d1e-b961-4140-8283-d4abd8900f73	52ec033d-7958-4bc4-bec9-020114328e80	https://supabase.solvexaerp.tech/storage/v1/object/public/BungaNaik/52ec033d-7958-4bc4-bec9-020114328e80/1783219052087-ba11odvday.jpg	0	2026-07-05 02:37:42.621267+00
604a945b-7d12-4c2d-82f3-27fc9f3c445b	1e03356c-0bf4-4c66-859a-c1c8db77f094	https://supabase.solvexaerp.tech/storage/v1/object/public/BungaNaik/1e03356c-0bf4-4c66-859a-c1c8db77f094/1783219085315-b072d5x2k2i.jpg	0	2026-07-05 02:38:11.188742+00
fdc93451-fc4a-4c4e-bfc5-c3003c5b05f2	3fc3e296-6d08-4012-9d73-cdf6ddce42ff	https://supabase.solvexaerp.tech/storage/v1/object/public/BungaNaik/3fc3e296-6d08-4012-9d73-cdf6ddce42ff/1783219132578-fqq44z3f2mj.jpg	0	2026-07-05 02:38:57.886+00
7f6f132b-795a-4206-bb1a-108e5b5c908b	ca24de1c-88c7-4d1e-9a4e-43be5d46f91a	https://supabase.solvexaerp.tech/storage/v1/object/public/BungaNaik/ca24de1c-88c7-4d1e-9a4e-43be5d46f91a/1783219186043-fdovwvje0bd.jpg	0	2026-07-05 02:39:57.099979+00
6aa898b7-68a7-40ae-8863-136daccd3ab0	540ac7a1-d008-46f5-8736-cba7a5893dc4	https://supabase.solvexaerp.tech/storage/v1/object/public/BungaNaik/540ac7a1-d008-46f5-8736-cba7a5893dc4/1783219229487-mlyntj0ma3o.jpg	0	2026-07-05 02:40:41.953772+00
64ff3863-bc09-438d-9481-cb8214015d23	14695941-5e9e-466f-95a1-36b8f45cbca1	https://supabase.solvexaerp.tech/storage/v1/object/public/BungaNaik/14695941-5e9e-466f-95a1-36b8f45cbca1/1783219278087-hybk6q1pvau.jpg	0	2026-07-05 02:41:24.337888+00
e09fef89-ce03-4dd1-a22f-04a449c92e78	7c550656-5584-43b4-8fb9-a60e4264bf49	https://supabase.solvexaerp.tech/storage/v1/object/public/BungaNaik/7c550656-5584-43b4-8fb9-a60e4264bf49/1783219510198-pji13dokvz9.jpg	0	2026-07-05 02:45:21.113152+00
e3d79260-073b-4bf5-a3d8-fea2ac331d9f	ddd1faf3-4959-40bb-9a53-ba3703f0e845	https://supabase.solvexaerp.tech/storage/v1/object/public/BungaNaik/ddd1faf3-4959-40bb-9a53-ba3703f0e845/1783219694063-gpcngobf0gd.jpg	0	2026-07-05 02:48:35.929431+00
f3d367dd-fce3-4c5d-861a-8b78d4967c0e	8264ad7a-2b65-45d3-a43b-3984ac3fbfeb	https://supabase.solvexaerp.tech/storage/v1/object/public/BungaNaik/8264ad7a-2b65-45d3-a43b-3984ac3fbfeb/1783219799259-jafcozlqemi.jpg	0	2026-07-05 02:50:15.449594+00
24a3474a-0dbc-4cc3-a539-bab0b9530285	f04cf6e2-18f8-4785-a981-05f9129792cd	https://supabase.solvexaerp.tech/storage/v1/object/public/BungaNaik/f04cf6e2-18f8-4785-a981-05f9129792cd/1783219853166-n1wfqzmvygr.jpg	0	2026-07-05 02:51:28.297297+00
f9f6a6d5-b1ab-49c8-8e50-9364f8cec2e3	bb27b946-5706-483f-bc1b-65b29a1f8024	https://supabase.solvexaerp.tech/storage/v1/object/public/BungaNaik/bb27b946-5706-483f-bc1b-65b29a1f8024/1783219923038-e53floabbnl.jpg	0	2026-07-05 02:52:34.461272+00
c3d2d2a2-127e-4866-b6d3-06147e9b6c7b	7d75df80-5c8c-41d6-bb11-5e9496b12bbe	https://supabase.solvexaerp.tech/storage/v1/object/public/BungaNaik/7d75df80-5c8c-41d6-bb11-5e9496b12bbe/1783220089440-17f0lw5obif.jpg	0	2026-07-05 02:55:17.415887+00
8c703099-4aa0-48de-ac9a-e03b182c55a6	4c884ee4-b3f7-4018-a37f-094ae6a5d299	https://supabase.solvexaerp.tech/storage/v1/object/public/BungaNaik/4c884ee4-b3f7-4018-a37f-094ae6a5d299/1783220260917-1t1xf67pwxz.jpg	0	2026-07-05 02:58:08.667361+00
899c82a3-18f8-43a8-8d61-ac23a54b1078	71e0e32a-a563-447d-ad19-1a6ba0747954	https://supabase.solvexaerp.tech/storage/v1/object/public/BungaNaik/71e0e32a-a563-447d-ad19-1a6ba0747954/1783220373485-u5t90za5h8.jpg	0	2026-07-05 03:00:31.610601+00
71e4139b-91d7-4723-807a-d6e306e994c5	c8bfd892-0983-425d-a55b-e07cd233bb00	https://supabase.solvexaerp.tech/storage/v1/object/public/BungaNaik/c8bfd892-0983-425d-a55b-e07cd233bb00/1783220480830-s1s20w39qk.jpg	0	2026-07-05 03:02:18.078207+00
9becafbf-3e10-440f-b3a0-bb27b078ac6b	c12db099-d6f7-4c08-a330-c24a493bae24	https://supabase.solvexaerp.tech/storage/v1/object/public/BungaNaik/c12db099-d6f7-4c08-a330-c24a493bae24/1783220692366-jlyvtqef0xf.jpg	0	2026-07-05 03:08:40.919725+00
12bc6d1e-da26-44ac-bc0b-1d1f6ae813a2	51368464-da6f-4c27-8a9e-b4af03eda252	https://supabase.solvexaerp.tech/storage/v1/object/public/BungaNaik/51368464-da6f-4c27-8a9e-b4af03eda252/1783220973821-lmqoqwnwefh.jpg	0	2026-07-05 03:11:03.376026+00
d50c8e93-aab3-43ef-b4b2-affe5e7d4b0c	ab41f151-2c93-4aa7-8033-b8556c655820	https://supabase.solvexaerp.tech/storage/v1/object/public/BungaNaik/ab41f151-2c93-4aa7-8033-b8556c655820/1783221138093-5tngf0hn2wi.jpg	0	2026-07-05 03:12:37.596191+00
bec03d36-fc7c-45bf-8edd-220395e34906	aeeab3d9-13b0-4c52-9dec-80a0129c6001	https://supabase.solvexaerp.tech/storage/v1/object/public/BungaNaik/aeeab3d9-13b0-4c52-9dec-80a0129c6001/1783561900146-xg5sliyzms.jpg	0	2026-07-09 01:51:42.377851+00
781e7cf0-d377-4ffe-bfa1-4940963d4c53	34930d76-f816-47a6-b256-bf5e07b6ee72	https://supabase.solvexaerp.tech/storage/v1/object/public/BungaNaik/34930d76-f816-47a6-b256-bf5e07b6ee72/1783562032797-sin52phl9wk.jpg	0	2026-07-09 01:53:55.43636+00
631865a0-d308-4dc5-8ab9-d7b5fe6afa63	023a968c-4ba4-4be8-bb95-9b09b7281801	https://supabase.solvexaerp.tech/storage/v1/object/public/BungaNaik/023a968c-4ba4-4be8-bb95-9b09b7281801/1783562066130-f9q0ggy2dst.jpg	0	2026-07-09 01:54:28.323402+00
1c5687d7-9268-4af8-a3c3-a60d364baf3e	edd7b36c-43cf-444f-b6cd-f0865549cbb8	https://supabase.solvexaerp.tech/storage/v1/object/public/BungaNaik/edd7b36c-43cf-444f-b6cd-f0865549cbb8/1783562089983-b93az5lrq1.jpg	0	2026-07-09 01:54:52.258591+00
3294164b-f278-4a88-9c6e-ec97fc92fdcd	d59a37fe-ecbb-4572-bc88-f8b8250a6304	https://supabase.solvexaerp.tech/storage/v1/object/public/BungaNaik/d59a37fe-ecbb-4572-bc88-f8b8250a6304/1783562101369-ywxm3re9yzf.jpg	0	2026-07-09 01:55:02.928102+00
2dd7e622-6db7-4272-8601-b8e632f358d9	6f4a47b7-d8aa-4746-829d-1157de1bbf00	https://supabase.solvexaerp.tech/storage/v1/object/public/BungaNaik/6f4a47b7-d8aa-4746-829d-1157de1bbf00/1783562114740-mr9wy7km06d.jpg	0	2026-07-09 01:55:17.152737+00
d8c5f4e4-1da9-4e55-8348-9fdfe32869ce	df191515-db04-4f36-a664-78e4d84852d3	https://supabase.solvexaerp.tech/storage/v1/object/public/BungaNaik/df191515-db04-4f36-a664-78e4d84852d3/1783562382321-njodo7mgsdo.jpg	0	2026-07-09 01:59:45.53379+00
cc1f5fd5-49da-4c6d-b0c3-4c7bf1873dc6	9bcc0ee3-cd10-4be0-a1f4-c3c30c7ac080	https://supabase.solvexaerp.tech/storage/v1/object/public/BungaNaik/9bcc0ee3-cd10-4be0-a1f4-c3c30c7ac080/1783562460023-886gdobtvom.jpg	0	2026-07-09 02:01:02.948959+00
7e53b5d2-2c0d-4405-89eb-5fcc0dd44b2c	9a2e9f88-c9c4-4fe7-a63d-f6b5cc824bcf	https://supabase.solvexaerp.tech/storage/v1/object/public/BungaNaik/9a2e9f88-c9c4-4fe7-a63d-f6b5cc824bcf/1783562473629-w6jhbc184so.jpg	0	2026-07-09 02:01:14.904779+00
03063a94-6e32-4c20-bf5d-2ae44e4a678e	f7b48160-8677-49e2-8f4c-145be2156fc2	https://supabase.solvexaerp.tech/storage/v1/object/public/BungaNaik/f7b48160-8677-49e2-8f4c-145be2156fc2/1783562504912-vfd7srtmw9.jpg	0	2026-07-09 02:01:47.074995+00
3923c1f0-dff5-49e3-b0aa-81a6282eba04	2972f34c-a8f2-4831-b272-14979903e6f6	https://supabase.solvexaerp.tech/storage/v1/object/public/BungaNaik/2972f34c-a8f2-4831-b272-14979903e6f6/1783562517104-xvbfio80gah.jpg	0	2026-07-09 02:01:59.644778+00
8fc4003b-a5f3-44ce-99f6-4f06fd34a017	ce78e6f5-3dce-4f3c-9c3e-0516e66b0c5d	https://supabase.solvexaerp.tech/storage/v1/object/public/BungaNaik/ce78e6f5-3dce-4f3c-9c3e-0516e66b0c5d/1783562891325-spiiso3rve.jpg	0	2026-07-09 02:08:13.163488+00
dfe4a2bb-22ba-4d07-9146-fa1cc3d3c888	4cc2ff8c-67cd-4db3-9555-838788360a18	https://supabase.solvexaerp.tech/storage/v1/object/public/BungaNaik/4cc2ff8c-67cd-4db3-9555-838788360a18/1783562919116-86gqg461qo.jpg	0	2026-07-09 02:08:42.684085+00
8d5b35ac-22fe-40da-bcc4-a275ecaa9408	bec88103-8294-4cd6-b9d3-b83d4f0729eb	https://supabase.solvexaerp.tech/storage/v1/object/public/BungaNaik/bec88103-8294-4cd6-b9d3-b83d4f0729eb/1783563062792-a7p8fxhalcc.jpg	0	2026-07-09 02:11:05.547925+00
2ed2c309-5729-4921-a7f1-37b22a72fc93	6ca87f2f-ec91-4c3f-aa2a-339bfd7670ed	https://supabase.solvexaerp.tech/storage/v1/object/public/BungaNaik/6ca87f2f-ec91-4c3f-aa2a-339bfd7670ed/1783563252300-cqzacv66jvi.jpg	0	2026-07-09 02:14:13.302535+00
5a49a9ff-61aa-4320-85c2-fb83559fb700	f92f7959-4a58-445d-9c3c-09e715ed4387	https://supabase.solvexaerp.tech/storage/v1/object/public/BungaNaik/f92f7959-4a58-445d-9c3c-09e715ed4387/1783563279026-w3oskenx21.jpg	0	2026-07-09 02:14:41.273427+00
32dde37a-84d9-42e7-9955-b07b89de0959	0f62b6f4-2336-49d7-a416-5eb99e053c84	https://supabase.solvexaerp.tech/storage/v1/object/public/BungaNaik/0f62b6f4-2336-49d7-a416-5eb99e053c84/1783563311025-iq7d43bqr8k.jpg	0	2026-07-09 02:15:12.757552+00
1bc77f50-1613-49ef-9499-52a7aa39d896	9572feac-d9db-45e3-a75e-449edbf04f7e	https://supabase.solvexaerp.tech/storage/v1/object/public/BungaNaik/9572feac-d9db-45e3-a75e-449edbf04f7e/1783563522881-wh9kllt3if.jpg	0	2026-07-09 02:18:44.095516+00
ab9566a3-78d2-453a-b840-1d8c0a2f998f	e6eceae8-225a-4186-bfe6-50667b142890	https://supabase.solvexaerp.tech/storage/v1/object/public/BungaNaik/e6eceae8-225a-4186-bfe6-50667b142890/1783563828422-xcb6os54hjn.jpg	0	2026-07-09 02:23:50.383043+00
0c989f3a-2ca2-4b1a-8ba0-6d8831d582ec	1a78657a-2738-4e5a-8cf5-06603e1e304f	https://supabase.solvexaerp.tech/storage/v1/object/public/BungaNaik/1a78657a-2738-4e5a-8cf5-06603e1e304f/1783563845463-gb86a5r8cfd.jpg	0	2026-07-09 02:24:07.62731+00
9c9d4393-16c0-4f54-8c9a-97386e9269eb	1f9a5e3e-f5d2-4348-bc64-39321bce1f14	https://supabase.solvexaerp.tech/storage/v1/object/public/BungaNaik/1f9a5e3e-f5d2-4348-bc64-39321bce1f14/1783563958252-zh85vqakj7.jpg	0	2026-07-09 02:26:00.070828+00
52a11752-0c45-4939-9824-309ba1162dfe	8378ae37-5be0-47f2-8829-12305f88f347	https://supabase.solvexaerp.tech/storage/v1/object/public/BungaNaik/8378ae37-5be0-47f2-8829-12305f88f347/1783563980387-zkekn7uj8ae.jpg	0	2026-07-09 02:26:21.743896+00
da8cc5a0-ce10-40f6-b5c9-c7ab6523c633	7e67cb99-9efd-4629-860a-950dbf366db9	https://supabase.solvexaerp.tech/storage/v1/object/public/BungaNaik/7e67cb99-9efd-4629-860a-950dbf366db9/1783564018394-mzhz21ptt8g.jpg	0	2026-07-09 02:27:00.194182+00
54be972f-c06d-4772-8d59-72970f467d6b	e830c89c-2982-4f22-9fd9-49740fe9d219	https://supabase.solvexaerp.tech/storage/v1/object/public/BungaNaik/e830c89c-2982-4f22-9fd9-49740fe9d219/1783564211372-rj1rmiywze.jpg	0	2026-07-09 02:30:14.393772+00
8b22261f-b314-429d-86b4-bad9034dcc30	441f0964-4951-425f-92ab-6f0146810c08	https://supabase.solvexaerp.tech/storage/v1/object/public/BungaNaik/441f0964-4951-425f-92ab-6f0146810c08/1783564318475-sis2au9zds8.jpg	0	2026-07-09 02:32:00.315178+00
7f65a907-f863-4327-aee5-dffbd71dbc1f	5ce9ce94-2175-4291-b86c-92acfab8efe2	https://supabase.solvexaerp.tech/storage/v1/object/public/BungaNaik/5ce9ce94-2175-4291-b86c-92acfab8efe2/1783564834684-37eiux8c769.jpg	0	2026-07-09 02:40:36.380434+00
1f5d65e5-3e76-4806-9899-722eb4cb3427	18a74238-b7a5-4b74-9799-12bc3d730803	https://supabase.solvexaerp.tech/storage/v1/object/public/BungaNaik/18a74238-b7a5-4b74-9799-12bc3d730803/1783564863168-46r3rql9hjd.jpg	0	2026-07-09 02:41:05.188123+00
bf0568ad-a029-423f-83ed-58b215003347	27de36ab-ae58-45a7-a6ab-034f3c336da0	https://supabase.solvexaerp.tech/storage/v1/object/public/BungaNaik/27de36ab-ae58-45a7-a6ab-034f3c336da0/1783564892834-l6jzxp4ymdf.jpg	0	2026-07-09 02:41:34.62912+00
fa66ec08-5194-42cf-8510-495c194f8269	9f2f1cf1-846c-42f0-9852-056ad6026ad5	https://supabase.solvexaerp.tech/storage/v1/object/public/BungaNaik/9f2f1cf1-846c-42f0-9852-056ad6026ad5/1783564928951-snot37aws8.jpg	0	2026-07-09 02:42:11.017872+00
3c9b619d-851f-4878-930e-2f2bf3b1f0ce	6e556179-e9ee-42f4-926f-864c61022ae2	https://supabase.solvexaerp.tech/storage/v1/object/public/BungaNaik/6e556179-e9ee-42f4-926f-864c61022ae2/1783565119289-5as4xoboli9.jpg	0	2026-07-09 02:45:21.077021+00
5ed22c08-5cc2-4912-b106-a28929ec099b	b383f379-72e6-407e-987b-fe5e8a1502ee	https://supabase.solvexaerp.tech/storage/v1/object/public/BungaNaik/b383f379-72e6-407e-987b-fe5e8a1502ee/1783565150235-n8al58jq46g.jpg	0	2026-07-09 02:45:52.096857+00
c2964211-4629-415d-ab1b-5b5970cb6e86	6a4f6bb3-9c89-46ab-b75c-a27df9ffa2d4	https://supabase.solvexaerp.tech/storage/v1/object/public/BungaNaik/6a4f6bb3-9c89-46ab-b75c-a27df9ffa2d4/1783565275582-8n4ss9lme97.jpg	0	2026-07-09 02:47:57.801156+00
cf29d2c3-480f-4afa-815f-23c2e6a37a53	c8e767db-9844-4393-b8ee-63e034b338ca	https://supabase.solvexaerp.tech/storage/v1/object/public/BungaNaik/c8e767db-9844-4393-b8ee-63e034b338ca/1783565563887-i838rqpkc6q.jpg	0	2026-07-09 02:52:46.122683+00
1d0b5c44-6211-4734-aa0f-fe16371ee275	b7675f90-bc8d-4cf4-a47f-4bf900671f33	https://supabase.solvexaerp.tech/storage/v1/object/public/BungaNaik/b7675f90-bc8d-4cf4-a47f-4bf900671f33/1783565588711-90ircwpx6ae.jpg	0	2026-07-09 02:53:10.143882+00
674bc1f5-52c8-4887-b161-ef92d852f645	5f144ff7-1856-4bc8-9ae1-2d29e19d3b62	https://supabase.solvexaerp.tech/storage/v1/object/public/BungaNaik/5f144ff7-1856-4bc8-9ae1-2d29e19d3b62/1783565618724-sx6z4plmtr8.jpg	0	2026-07-09 02:53:40.075769+00
7af971f6-8b93-47bf-9299-2fa6a9c7c4ef	c91cde3c-81b0-4d83-ac7e-0f09a71513d1	https://supabase.solvexaerp.tech/storage/v1/object/public/BungaNaik/c91cde3c-81b0-4d83-ac7e-0f09a71513d1/1783565662610-uae6vc6uscf.jpg	0	2026-07-09 02:54:25.239598+00
11a2d6fd-a406-419f-8320-0e6a9c4fcb6d	ff476b2e-db89-4fbd-96aa-94c3c3546939	https://supabase.solvexaerp.tech/storage/v1/object/public/BungaNaik/ff476b2e-db89-4fbd-96aa-94c3c3546939/1783565716192-27byrdz4bjm.jpg	0	2026-07-09 02:55:17.875289+00
b033df67-2430-48c2-a441-c8104c32cad0	57047e7a-0e75-4ba6-a7f0-dbe2d281b27e	https://supabase.solvexaerp.tech/storage/v1/object/public/BungaNaik/57047e7a-0e75-4ba6-a7f0-dbe2d281b27e/1783565767278-1gzlwzx641g.jpg	0	2026-07-09 02:56:09.807574+00
196625e5-f547-4548-b033-b057b0d1a1da	268cff99-b57e-43eb-92db-5ee249846524	https://supabase.solvexaerp.tech/storage/v1/object/public/BungaNaik/268cff99-b57e-43eb-92db-5ee249846524/1783565808960-uyzhlzlzaq.jpg	0	2026-07-09 02:56:50.603141+00
f9e68042-ff70-4b48-a19e-7e9038698733	e1c2fbf4-94a0-4a96-b336-9eb47214492f	https://supabase.solvexaerp.tech/storage/v1/object/public/BungaNaik/e1c2fbf4-94a0-4a96-b336-9eb47214492f/1783565894826-xqg9b7f0jkp.jpg	0	2026-07-09 02:58:17.451005+00
e6e34383-d307-422e-ac27-9d6b9e06364c	470a813e-e80b-4f26-a147-324fdaa316db	https://supabase.solvexaerp.tech/storage/v1/object/public/BungaNaik/470a813e-e80b-4f26-a147-324fdaa316db/1783565949722-zlop7usies9.jpg	0	2026-07-09 02:59:11.722822+00
ea6f7b37-f0f2-429f-a949-b3130452f141	48a2d447-8c9e-48dc-a272-29dea9ed125e	https://supabase.solvexaerp.tech/storage/v1/object/public/BungaNaik/48a2d447-8c9e-48dc-a272-29dea9ed125e/1783569150063-l2mde5xvizc.jpg	0	2026-07-09 03:52:32.457782+00
f72c261e-846f-440b-b2ce-849731dc8365	fd88ba08-bd4b-4eaa-a4f5-d140a817cc94	https://supabase.solvexaerp.tech/storage/v1/object/public/BungaNaik/fd88ba08-bd4b-4eaa-a4f5-d140a817cc94/1783569221997-wxy5p6krhbe.jpg	0	2026-07-09 03:53:44.597926+00
4aa5102f-9121-4d3a-b02d-d083b41a6823	f0e94741-80ae-4c65-8a36-6f7c13000103	https://supabase.solvexaerp.tech/storage/v1/object/public/BungaNaik/f0e94741-80ae-4c65-8a36-6f7c13000103/1783570496681-m6e6hpvz9r.jpg	0	2026-07-09 04:14:59.70506+00
b01a560b-9096-4ae6-b8af-565d06679db9	4f6d31ba-c2cf-46a2-903d-929f7d1e4bd4	https://supabase.solvexaerp.tech/storage/v1/object/public/BungaNaik/4f6d31ba-c2cf-46a2-903d-929f7d1e4bd4/1783570518436-qd4bd0txden.jpg	0	2026-07-09 04:15:21.05166+00
162e4ac3-eeab-4ae2-97fa-7d368f3ea024	5143fe8b-4e73-45a8-8b74-8652955b912a	https://supabase.solvexaerp.tech/storage/v1/object/public/BungaNaik/5143fe8b-4e73-45a8-8b74-8652955b912a/1783575147294-6wdslxeq7l4.jpg	0	2026-07-09 05:32:28.357771+00
808bc7fe-e057-4f0c-929a-2029a0a49344	95c4990d-5994-4468-a8a6-05e89e116524	https://supabase.solvexaerp.tech/storage/v1/object/public/BungaNaik/95c4990d-5994-4468-a8a6-05e89e116524/1783575225375-xi6ugjdo7ph.jpg	0	2026-07-09 05:33:47.88537+00
5a4f0d9d-411c-47bc-b180-6beec4fab5d3	8c09110b-c9cc-4298-b97e-7fe9100530a7	https://supabase.solvexaerp.tech/storage/v1/object/public/BungaNaik/8c09110b-c9cc-4298-b97e-7fe9100530a7/1783575315396-ewhqxe3xkql.jpg	0	2026-07-09 05:35:17.933926+00
3ba65569-6a86-4f86-b0e6-132053ad27dd	97db2a81-faaf-4703-937c-9ab671259d1d	https://supabase.solvexaerp.tech/storage/v1/object/public/BungaNaik/97db2a81-faaf-4703-937c-9ab671259d1d/1783575379334-gm0kxszz6yc.jpg	0	2026-07-09 05:36:21.052115+00
396be66e-b42c-4d0a-9706-b99a02550fd7	6220d4fa-e2d5-4243-8d8d-8a2a3d183d52	https://supabase.solvexaerp.tech/storage/v1/object/public/BungaNaik/6220d4fa-e2d5-4243-8d8d-8a2a3d183d52/1783575421826-vkin8mbff9q.jpg	0	2026-07-09 05:37:03.862172+00
016ba3c8-8156-44b8-a675-aaff4a177f64	a1777a39-a8a3-4e6e-947f-d455c6cc1909	https://supabase.solvexaerp.tech/storage/v1/object/public/BungaNaik/a1777a39-a8a3-4e6e-947f-d455c6cc1909/1783575530393-5ujrm4jv2si.jpg	0	2026-07-09 05:38:52.514625+00
b58a271e-34cd-4b89-93f4-34ae115af076	d850794e-233f-4737-a999-e3e9d8eb8607	https://supabase.solvexaerp.tech/storage/v1/object/public/BungaNaik/d850794e-233f-4737-a999-e3e9d8eb8607/1783575608519-0lworxwbwumn.jpg	0	2026-07-09 05:40:11.509308+00
c08b49e1-222b-45d2-b761-3bda63d759bf	10fb5901-8f71-48f5-b4a0-a25b2d6e085e	https://supabase.solvexaerp.tech/storage/v1/object/public/BungaNaik/10fb5901-8f71-48f5-b4a0-a25b2d6e085e/1783586173060-cdddgli859h.jpg	0	2026-07-09 08:36:16.943362+00
c387d743-a852-416c-880b-ed0910ccd9da	869835be-0736-49c1-922a-01cafd24c0a2	https://supabase.solvexaerp.tech/storage/v1/object/public/BungaNaik/869835be-0736-49c1-922a-01cafd24c0a2/1783586202986-63ed6v84bvl.jpg	0	2026-07-09 08:36:46.004372+00
6c572e08-337f-4206-b173-6ab0d6d0cda1	eaffd37e-6587-42b9-8f84-2e2e453b54c1	https://supabase.solvexaerp.tech/storage/v1/object/public/BungaNaik/eaffd37e-6587-42b9-8f84-2e2e453b54c1/1783586259755-dzezcfjq29j.jpg	0	2026-07-09 08:37:44.441554+00
4c486877-d3a7-4ded-8ba4-b2d14a13734e	e4ea3486-defb-49ee-9324-1dabc7ea5e70	https://supabase.solvexaerp.tech/storage/v1/object/public/BungaNaik/e4ea3486-defb-49ee-9324-1dabc7ea5e70/1783586281987-smyxae1c3gf.jpg	0	2026-07-09 08:38:06.067141+00
7af08344-0a82-463b-9286-e8799141207e	52445455-520d-4ef7-a67f-7d7a6f5c68cf	https://supabase.solvexaerp.tech/storage/v1/object/public/BungaNaik/52445455-520d-4ef7-a67f-7d7a6f5c68cf/1783586366238-p5vlluyd8bd.jpg	0	2026-07-09 08:39:52.677509+00
341a39ab-8836-4e36-bfe7-0a21a252014f	9f57cc47-7248-4bbd-86ad-d494c3292501	https://supabase.solvexaerp.tech/storage/v1/object/public/BungaNaik/9f57cc47-7248-4bbd-86ad-d494c3292501/1783586585766-o3566je9mai.jpg	0	2026-07-09 08:43:10.674782+00
2d92f7a4-04f4-48c9-a0d7-b3d39219b7c1	155dfc98-a1bb-46a8-abfe-5fcad54bc6b8	https://supabase.solvexaerp.tech/storage/v1/object/public/BungaNaik/155dfc98-a1bb-46a8-abfe-5fcad54bc6b8/1783586651311-i9gbi4ur8p.jpg	0	2026-07-09 08:44:21.805923+00
b2666e02-0006-4c78-912f-8964d98ccc1f	b5837887-d08a-41f4-8920-af2e6b89cf71	https://supabase.solvexaerp.tech/storage/v1/object/public/BungaNaik/b5837887-d08a-41f4-8920-af2e6b89cf71/1783586690728-ljy42tb97am.jpg	0	2026-07-09 08:44:58.708653+00
7e4b2df6-257f-4f90-8afb-83b2fd242dd0	d50dde9e-e5b8-448a-b5ba-2721bec91ae3	https://supabase.solvexaerp.tech/storage/v1/object/public/BungaNaik/d50dde9e-e5b8-448a-b5ba-2721bec91ae3/1783586718753-7j9u5fulmc6.jpg	0	2026-07-09 08:45:29.250463+00
c91595d6-3e65-435c-9283-6501f605b3d6	c01b4832-00fa-47a6-b4e7-45881104eaba	https://supabase.solvexaerp.tech/storage/v1/object/public/BungaNaik/c01b4832-00fa-47a6-b4e7-45881104eaba/1783586770027-1zk7b6w2frr.jpg	0	2026-07-09 08:46:34.44038+00
1dcc1fed-33d7-48d3-bb53-8a6608c9be15	9b3049bf-0763-4f61-aaf3-9c13380a2c97	https://supabase.solvexaerp.tech/storage/v1/object/public/BungaNaik/9b3049bf-0763-4f61-aaf3-9c13380a2c97/1783586832083-m148qos2up.jpg	0	2026-07-09 08:47:19.903112+00
0121d469-f07a-4b9e-a748-ff342af40f07	1882e29f-d7a6-4eb3-a7f0-376a9e018ec6	https://supabase.solvexaerp.tech/storage/v1/object/public/BungaNaik/1882e29f-d7a6-4eb3-a7f0-376a9e018ec6/1783586854950-x08qd6av1a.jpg	0	2026-07-09 08:47:39.732296+00
bde68a3c-e22e-48e3-8df2-288f15492183	9721b833-731c-4406-a3b4-fc7f41b7f5d2	https://supabase.solvexaerp.tech/storage/v1/object/public/BungaNaik/9721b833-731c-4406-a3b4-fc7f41b7f5d2/1783586885751-el3md5atcb4.jpg	0	2026-07-09 08:48:16.634228+00
b312d819-4e5f-43ae-849e-93ab25a82768	75e588a0-612e-44a7-b451-13500d0aaf72	https://supabase.solvexaerp.tech/storage/v1/object/public/BungaNaik/75e588a0-612e-44a7-b451-13500d0aaf72/1783586932624-dmfl37n7s7t.jpg	0	2026-07-09 08:48:57.035452+00
2f5f45c9-c55a-470e-8611-66d7408ba4f6	200d5b09-a57b-4474-aa0f-e8b9a54e7737	https://supabase.solvexaerp.tech/storage/v1/object/public/BungaNaik/200d5b09-a57b-4474-aa0f-e8b9a54e7737/1783586956069-ascmcgpahae.jpg	0	2026-07-09 08:49:20.179599+00
f65b20f6-da8c-48c1-9a0b-a63bee302cf8	eda33a04-1e4f-4bf5-af32-ccec479a67c0	https://supabase.solvexaerp.tech/storage/v1/object/public/BungaNaik/eda33a04-1e4f-4bf5-af32-ccec479a67c0/1783587187156-8elwzsmo6jl.jpg	0	2026-07-09 08:56:34.846515+00
fdf21010-6527-4c1c-ab43-845761b13363	8eeb043d-6cbc-486b-a12e-741f29dcb6e6	https://supabase.solvexaerp.tech/storage/v1/object/public/BungaNaik/8eeb043d-6cbc-486b-a12e-741f29dcb6e6/1783587430903-sho5dsc74qm.jpg	0	2026-07-09 08:57:14.81612+00
d8ad509f-f63f-4212-87c9-6cf92d96910f	2062d0f7-6131-4d75-b39a-8a5c7fc65fbd	https://supabase.solvexaerp.tech/storage/v1/object/public/BungaNaik/2062d0f7-6131-4d75-b39a-8a5c7fc65fbd/1783587458250-s0cysioiut.jpg	0	2026-07-09 08:57:43.442372+00
a4dee711-2866-4982-84c7-47a7d09bc6bb	0341b9b7-e7c6-44b3-b910-a75364a3e1ca	https://supabase.solvexaerp.tech/storage/v1/object/public/BungaNaik/0341b9b7-e7c6-44b3-b910-a75364a3e1ca/1783587500461-j2bt3wx5wo.jpg	0	2026-07-09 08:58:25.192978+00
3b7ed3ff-dfcf-4077-a466-d113db9eceab	aaf9c09e-2eda-4d15-bfd5-59ee377de8eb	https://supabase.solvexaerp.tech/storage/v1/object/public/BungaNaik/aaf9c09e-2eda-4d15-bfd5-59ee377de8eb/1783587529522-tn9b10zgysc.jpg	0	2026-07-09 08:58:58.253314+00
cf65fed9-e496-44f1-ad42-20365bdaf48e	8ae4f3e2-7802-4e39-97f2-aa7cee615352	https://supabase.solvexaerp.tech/storage/v1/object/public/BungaNaik/8ae4f3e2-7802-4e39-97f2-aa7cee615352/1783587574584-24ezgbs1ve6i.jpg	0	2026-07-09 08:59:37.231721+00
7f3adcbd-c05f-4db5-847b-faa595bcf6b3	70c39f25-8bd4-4b26-a3de-a73a7bacf480	https://supabase.solvexaerp.tech/storage/v1/object/public/BungaNaik/70c39f25-8bd4-4b26-a3de-a73a7bacf480/1783587605773-5t79mugudva.jpg	0	2026-07-09 09:00:07.639935+00
9fc02673-23bf-4c76-9e38-c3504b29637f	df4a2abe-4fd4-4925-84dd-2c56ac77a6cd	https://supabase.solvexaerp.tech/storage/v1/object/public/BungaNaik/df4a2abe-4fd4-4925-84dd-2c56ac77a6cd/1783587632720-xnpbnbber4.jpg	0	2026-07-09 09:00:34.603471+00
b419e616-c9b8-4a03-855f-e815eeaf4496	d7d67c45-176c-48ac-aba9-bd86ffae0878	https://supabase.solvexaerp.tech/storage/v1/object/public/BungaNaik/d7d67c45-176c-48ac-aba9-bd86ffae0878/1783587667395-lica8glnuq9.jpg	0	2026-07-09 09:01:08.906558+00
\.


--
-- Data for Name: purchase_order_items; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.purchase_order_items (id, po_id, produk_id, nama_produk, jumlah, satuan, keterangan, created_at) FROM stdin;
32174b23-0f25-4523-b6c8-79cf912c79df	27fc6bd8-3b29-44ff-91f8-ee221866c643	65e6bf9d-0a1c-4c28-82b2-3191955ad56a	DIPAN MEWAH NO 2 COKLAT	1	unit	\N	2026-07-10 07:33:51.145626+00
18e74820-a913-4993-92e7-fcdd03855a24	95938e92-b006-4d07-b27f-f40e938a3c6a	e6fb0a21-4d92-4640-a7ad-2c1da6738f37	JEPARA SUDUT 	1	unit	\N	2026-07-11 02:08:08.499786+00
e991cb0d-c994-4a60-a476-87b81c1fbd76	6cee2e97-be9b-4dbc-a8e7-486831771481	b8301067-acdd-43a5-81b3-ce893804371d	DIPAN MEWAH NO 1 SET 2 NAKAS	1	unit	\N	2026-07-12 04:15:10.978785+00
cedb47dd-1669-4dea-a92b-8609e993cb05	c43c2d4c-b176-4e15-8708-5bc5c9f3884b	e99f7289-22d6-43b4-8318-d2ff20cbfef8	BOXY CONFORTA NO1	1	unit	\N	2026-07-15 03:37:41.506896+00
c730fa81-051a-47ae-94b3-e829c0430756	9023d26e-205a-4f8b-bb3c-ac6099bee2fb	377c52d1-5c3d-4493-a389-d712ae2350d2	SOPABED BOHAY COKLAT	1	unit	\N	2026-07-07 07:39:22.242554+00
a5d6fa55-2c20-4364-8979-abe64c2f8b0a	a9af406c-bede-4e82-a4e7-decf3b349b27	d4a7b770-2937-4615-b974-e2138f43e22c	LEMARI BESI 2 PINTU - COKLAT	1	unit	\N	2026-07-10 07:25:27.453014+00
769c098d-c42e-46d8-92f3-84d904849a3d	a4a4d145-3b8f-429d-8dfd-3ac03c89e31a	7c4e414d-69c1-4ea6-84ff-55103e656736	MEJA MAKAN MARMER 6 KURSI - HITAM GOLD	1	unit	\N	2026-07-10 07:25:38.843835+00
e0c02f1e-add6-42db-852f-9bec56621e6b	41b58501-63c8-4bde-ac74-9a219091c48f	bc82fb57-8c09-43b7-874b-fe8c21763267	MEJA MAKAN MARMER 6K COKLAT 	1	unit	\N	2026-07-10 07:25:45.427083+00
b2e9bb5b-c0bf-4d74-99a5-5e5f2447374d	2b75b486-fb88-4d41-8cf8-8d530a231324	6a4f6bb3-9c89-46ab-b75c-a27df9ffa2d4	DIPAN MINIMALIS GOLD NO1	1	unit	\N	2026-07-10 07:25:53.772334+00
58b800bb-ef4a-4269-b79c-c7719a8b13de	093e891c-d678-4a0f-98d9-535754116b8c	9ca477ba-c3f8-4245-bf08-01db8c9608ff	SOPA LAMBORJINI 32 + PUK UNGU	1	unit	\N	2026-07-10 07:26:02.425525+00
6f29f49c-b05e-4c8f-9537-5993f81484ed	42aac3bd-b5dd-40bc-bce6-62a3bd835a41	495b0b7a-30de-488d-a0eb-47b3669ba633	DIPAN MINIMALIS NO2 PINK BEBY	1	unit	\N	2026-07-10 07:26:09.951215+00
64e8c9cb-07ab-42d3-8be5-25800a8c44a8	0ce38f7d-0bf5-4d12-9743-055081ec02ca	42a7b3be-04e8-4f9c-a027-2b53605685f5	DIPAN MINIMALIS NO1 COKLAT	1	unit	\N	2026-07-10 07:26:16.295276+00
0c88347b-a602-408e-9e01-d4db8bc7cff6	1feedc03-6fa9-4dee-8e14-c45ff587a78c	45d39a8a-7aba-4fcd-8d2d-8fa2681e2e04	MEJA MAKAN JATI KOTAK 6K	1	unit	\N	2026-07-10 07:26:33.170054+00
7f0cbf3d-c6b1-4d63-a02b-1cfe69f76048	cbe40fd9-72dc-42a1-bd2b-1050deb3d5d0	b7977168-08a5-4146-ac65-daf70d2d583f	MEJA MAKAN JEPARA 6K	1	unit	\N	2026-07-10 07:26:38.330515+00
6ab0f9ff-ae88-43aa-b6e6-2b9ef3a4ce9e	11b3d966-cff6-4113-a856-f6ca11258fa7	9572feac-d9db-45e3-a75e-449edbf04f7e	DIPAN JEPARA SULTAN	1	unit	\N	2026-07-10 07:26:43.474624+00
7a185302-4813-428f-8e29-70f927e32df9	5e20ff9f-4c8e-4428-806f-9cd84dea4fb8	9bcc0ee3-cd10-4be0-a1f4-c3c30c7ac080	BELLAGIO KOPER 3211	1	unit	\N	2026-07-10 07:26:48.039474+00
435cb663-61a8-4efb-9a3b-fbdfb77f473f	9a7b435e-5e45-4c93-8607-2d4f09bf2920	c1169f85-c293-4ea2-9fd2-ac681d9f94be	SOPA MINIMALIS TANGAN B ABU	1	unit	\N	2026-07-10 07:26:52.135313+00
12466bf5-c44f-4e46-b9cf-bf77794561d8	0997f044-50e8-42bb-9204-df92a7ec5f4c	7fb56c17-01b3-46f1-9c43-d897d3ef9644	SOPA BERANAK HIJAU HITAM	1	unit	\N	2026-07-10 07:26:57.065161+00
0ca39db4-107d-46dd-871b-324484cd3d31	4afe3653-4b77-4dd3-8e33-d0abd93cf4d3	77c590eb-8f35-4abe-8239-ffb8bb8e0ca9	SOPA MINIMALIS UNGU 3322	1	unit	\N	2026-07-10 07:27:02.092767+00
cd8ad541-63a3-4c90-a289-4ddf9e342d89	be50b774-3d4b-4b0f-bda4-3c76f7a7ce02	ca3a1a29-60df-433e-ba88-59ec3138e8bf	SOPA JAGWAR ABU	1	unit	\N	2026-07-10 07:27:06.772199+00
0fca62a8-631b-40db-89c3-142395af5135	5c6f496d-7b57-4c26-bb9d-406de0354802	5672474a-b20b-45f2-8b51-59aaa807a73e	SOPA BERANAK HITAM ABU	1	unit	\N	2026-07-10 07:27:11.203085+00
3b3f2811-ba40-4908-a62b-bf6bc333cfc3	1704f8a3-1289-4415-8fd1-a6097dd8e90f	9f79576d-ee5f-45b9-adb5-033b9de1362c	SOPA L SEMI ABU 	1	unit	\N	2026-07-10 07:27:14.896141+00
0364362e-d504-47f9-bb38-5d43a655b06f	dbca4076-690d-4993-ac8f-24ed505c8d0a	330c48c5-3769-4e41-a79d-1f6f8b84d0b0	SOPA MINIMALIS UNGU HITAM	1	unit	\N	2026-07-10 07:27:18.903597+00
bc7d9342-d7e1-4560-9410-eef1ea42bc19	c169c00f-6683-4dd3-b60d-1f0ef70cc1f7	9f79576d-ee5f-45b9-adb5-033b9de1362c	SOPA L SEMI ABU 	1	unit	\N	2026-07-10 07:27:24.294659+00
b41931ab-1005-4ccd-9663-17e4e49880d0	ce6ba994-021d-45d4-b5b7-a97838522a01	023e06fb-e740-4a7c-be34-85d1a0e1c625	KURSI JARI JARI - COKLAT	1	unit	\N	2026-07-10 07:27:54.860275+00
abe70d39-4f4d-45da-b88e-b2c6ac3e0471	551fa4cc-eb39-4f08-826e-1a1addb83b41	e6b63f52-d76c-477a-a20c-c2d341785a43	KURSI SUDUT JEPARA - COKLAT GOLD	1	unit	\N	2026-07-10 07:28:40.027848+00
8ca02d17-ab3a-43ae-961d-e5120db14bef	12977d75-bbe5-416f-bd90-550f6bcd03a5	e516a6b2-e47c-4cab-b71e-3252499812de	MEJA MAKAN JATI  MOTIF MARMER	1	unit	\N	2026-07-10 07:28:44.679077+00
c1e5e83d-be9a-44e4-a407-d9032560607e	14e79edf-bbd1-49a4-a464-54187091b69e	b7977168-08a5-4146-ac65-daf70d2d583f	MEJA MAKAN JEPARA 6K	1	unit	\N	2026-07-10 07:28:49.404012+00
d227c831-9206-4863-bcd1-60d64b44459e	42a97d05-0d94-4615-aeea-8dbe3f703351	9dbbfe24-f995-45da-8cc4-98c7274ecabe	KURSI MADURA MATAHARI 3211	1	unit	\N	2026-07-10 07:29:01.082407+00
e0cb6dcd-b51c-4ce0-a7d5-d0f15d25c0de	b4231661-7042-4485-87f9-3a2368c47db7	5143fe8b-4e73-45a8-8b74-8652955b912a	DIVAN KOLAM NO  1 - COKLAT	1	unit	\N	2026-07-10 07:29:14.174694+00
4c43d89e-939b-4a17-8cbc-a2cd4861d598	f7c50b4f-0a6d-4167-8037-1c7e07691e05	612cf487-8787-42d1-b18b-03ef558c2e06	SOPA LAMBORGHINI 311 COKLAT 	1	unit	\N	2026-07-10 07:29:23.787356+00
4854d7ad-1bf7-4300-8ae8-bd8c81b83a22	9b4a47d4-f97c-44da-9357-ecd607b04eaf	04782a28-bc7f-4328-ade7-7741be4cda68	SOPA RETRO 321 ABU GELAP	1	unit	\N	2026-07-10 07:29:27.860393+00
e9e420be-4859-4c69-bbd0-fcbb85b6de19	042350f9-6237-458a-b37f-70b3ad17e312	ff476b2e-db89-4fbd-96aa-94c3c3546939	DIPAN SANDARAN EXKLUSIF NO1 PINK	1	unit	\N	2026-07-10 07:29:33.588885+00
148255f1-3861-452e-abf4-3b2fa8a44929	2fb83b7c-2402-4f1e-9a47-2647bd922ad0	5f144ff7-1856-4bc8-9ae1-2d29e19d3b62	DIPAN MINIMALIS NO1ABU	1	Unit	\N	2026-07-10 07:29:46.675966+00
8e34ac59-7b6e-4b5e-990d-2b285ad9c24d	017cdbf0-6eca-4415-8e8c-3fc8a2246f21	1ab176c0-fec1-4f0f-9d5f-e903410b713b	DIPAN MEWAH NO1 COKLAT 	1	unit	\N	2026-07-10 07:29:52.071041+00
e5c33640-0f80-4719-966a-faad0fd5d155	364ede94-336d-4078-8ae4-376195a7a6c1	c2f6e44b-6c95-4ec9-b747-1efe204c0f45	SOPABED BLUDRU TEAK	1	unit	\N	2026-07-10 07:29:58.030433+00
30e5788a-eb4a-4bee-9db0-ab9ce1e20238	74445d68-ae1f-48f9-9a6c-60d5037379bd	8d75d5dc-8b50-4b99-8004-8eea2c358271	DIPAN SANDARAN LURUS NO2 CREAM	1	unit	\N	2026-07-10 07:30:36.11576+00
8dc1ce86-18d8-4725-a7a6-4a3c554c6c0d	93ab8181-6334-4716-8999-b75efe44bfd4	0f62b6f4-2336-49d7-a416-5eb99e053c84	DIPAN EXKLUSIF NO1 PINK	1	unit	\N	2026-07-10 07:30:40.911998+00
2274550b-41a9-40ff-830c-fd0a7a42e64f	8832414c-d781-419b-bea1-eb43550ae2ab	a67d3788-c33e-4c00-b29c-b4d1706a8d23	DIPAN MEWAH UNGU NO1	1	unit	\N	2026-07-10 07:30:52.624929+00
f6fd957d-85c3-4247-bda4-75fce2085be9	fe89053f-4884-4d02-a2ef-faeb8d0ec55b	eaffd37e-6587-42b9-8f84-2e2e453b54c1	DIVAN MEWAH NO 1 - ABU-ABU	1	unit	\N	2026-07-10 07:30:58.375327+00
014c5100-10a2-4f09-b58a-de30c42acaa0	a87f112e-59a0-4e60-a889-3ba26db5e708	9b3049bf-0763-4f61-aaf3-9c13380a2c97	DIVAN MEWAH NO 2 - ABU-ABU	1	unit	\N	2026-07-10 07:31:13.281061+00
33916397-ff00-4476-bbe8-fb787be0a443	cb875e1b-6297-4bad-9da6-cdf39f62d546	2972f34c-a8f2-4831-b272-14979903e6f6	BOXY BNAIK NO2 ABU	1	unit	\N	2026-07-10 07:31:18.339734+00
8ea7deb7-cb50-428c-ba56-3c72deee315b	f15e5867-efb7-40f6-abda-cef8ef12ecf9	65e6bf9d-0a1c-4c28-82b2-3191955ad56a	DIPAN MEWAH NO 2 COKLAT	1	unit	\N	2026-07-10 07:31:23.09992+00
aadde9fc-f4d8-4c0b-977c-533b44f189fb	833d074a-cb92-4d4a-959d-d699844f2b48	65e6bf9d-0a1c-4c28-82b2-3191955ad56a	DIPAN MEWAH NO 2 COKLAT	1	unit	\N	2026-07-10 07:31:27.398775+00
d26bcad6-4fe0-4fc5-b9af-591f3849cc28	fe29584f-688c-4eaf-b723-abe2bfbbc83c	8ae4f3e2-7802-4e39-97f2-aa7cee615352	DIVAN MINIMALIS NO 1 - PUTIH	1	unit	\N	2026-07-10 07:31:31.722186+00
c8ac2cf7-1c25-425c-9b17-64f324dd5c73	c4adfa49-3276-4beb-a930-78d934da259c	155dfc98-a1bb-46a8-abfe-5fcad54bc6b8	DIVAN MEWAH NO 1 - MERAH	1	unit	\N	2026-07-10 07:31:35.542918+00
ba01cdff-afdd-497a-951a-c291e1d875e9	9fbd8cc8-287a-469b-b4e0-c9baccfd3567	b5837887-d08a-41f4-8920-af2e6b89cf71	DIVAN MEWAH NO 1 - PINK	1	unit	\N	2026-07-10 07:31:39.212817+00
3d01b15b-5434-4ec6-a2ce-8745cf8db815	07661a86-fd4a-4901-b62f-6c3ca79ef3e6	b5837887-d08a-41f4-8920-af2e6b89cf71	DIVAN MEWAH NO 1 - PINK	1	unit	\N	2026-07-10 07:31:44.60538+00
b6870fc1-348b-459f-96ca-7416d67cd4bc	3bc5aeac-4872-456d-8967-b22979d56d6f	1f9a5e3e-f5d2-4348-bc64-39321bce1f14	DIPAN KOLAM NO1 COKLAT 	1	unit	\N	2026-07-10 07:31:48.474363+00
0f28715c-c2eb-4214-9652-3af8ae3802cc	dd787097-c8ca-4e2b-a1a0-c4fe26be45a0	268cff99-b57e-43eb-92db-5ee249846524	DIPAN SANDARAN LURUS NO1 CREAM	1	unit	\N	2026-07-10 07:31:53.334476+00
87fdf1d7-414e-45d1-8e10-36beb9ab11af	4489d72e-36d6-4b21-a176-afdf2a256cb8	16a59e17-cc58-42f9-91b0-ffc6cc16bec4	DIPAN EXKLUSIF NO2 CREAM SANDARAN 250CM	1	unit	\N	2026-07-10 07:31:58.93249+00
b3781fb8-5236-4552-94cc-ce9f772f9485	1d8b80b7-0109-4bfd-988d-0d3c2e102206	268cff99-b57e-43eb-92db-5ee249846524	DIPAN SANDARAN LURUS NO1 CREAM	1	unit	\N	2026-07-10 07:32:04.972106+00
92aa3ed0-4e3c-472a-8a5e-d893dcd5b8cb	db03c40d-02ed-468d-94b2-bc9332a1860d	d37b58e1-c66b-42f4-afc2-77cc3363fa75	SOPA SIERRA HITAM	1	unit	\N	2026-07-10 07:32:11.404387+00
f4f04257-1470-4615-96c0-40a88959b5fe	5c603ffd-2ddb-4a3e-8420-4dd98b663747	a6ca55a4-432b-4056-87dc-605e0cfa71a5	SOPA LATER U HITAM/SILVER KAGAWA	1	unit	\N	2026-07-10 07:32:15.60042+00
2ac6d2b7-f479-4de4-962d-fd94aaf02cd4	d69b6cc1-40f8-4e71-984c-c1b0c34e893b	b7675f90-bc8d-4cf4-a47f-4bf900671f33	DIPAN MINIMALIS NO1 UNGU OSCAR	1	unit	\N	2026-07-10 07:32:19.247561+00
9f35904c-338e-43fa-9f95-2ea39550889b	61fa5fb3-e977-43ab-8368-36a0ec356f70	33675935-9993-404c-842e-3cc836eefc01	DIPAN KOLAM GARIS NO 2 ABU	1	unit	\N	2026-07-10 07:32:23.622349+00
1c19ebf1-3905-4533-8a62-ee514de7b652	5f6d9b08-efd3-438e-915f-fb37af9fd600	c8e767db-9844-4393-b8ee-63e034b338ca	DIPAN MINIMALIS NO1 GOLD	1	unit	\N	2026-07-10 07:32:27.964588+00
693ed755-4c94-4979-9af1-b2322fabf230	170b90b0-954b-43b8-a1f9-3b7029cd30f8	c96a6773-ac4c-431f-a4aa-f86cabe7ba55	SOPA PERAHU STOOL UNGU	1	unit	\N	2026-07-10 07:32:31.568763+00
b852a875-788a-456a-85e9-7e8a478456a9	b2d51174-d5ae-4bca-879c-ab751ed18b52	bd306e99-ffe2-4034-947a-ee59be8efb69	SOPA IMPOR UNGU	1	unit	\N	2026-07-10 07:32:35.008484+00
23ed3252-b208-4160-92e1-92c5ed45f847	8f8d9d17-0aed-4c4e-82a0-3e06771221dc	e830c89c-2982-4f22-9fd9-49740fe9d219	DIPAN KOLAM NO2 PINK	1	unit	\N	2026-07-10 07:32:39.323388+00
eca26ae9-dee4-4224-8523-4563d910a606	10a48fe7-8744-4023-842d-0fb86b4e9209	7e67cb99-9efd-4629-860a-950dbf366db9	DIPAN KOLAM NO1 HITAM	1	unit	\N	2026-07-10 07:32:42.749206+00
b0ed66ff-fc42-448b-accb-1de91f9685e0	7230300f-de3f-415a-9458-91cbe0b57283	9f2f1cf1-846c-42f0-9852-056ad6026ad5	DIPAN MEWAH GARIS NO1 UNGU	1	unit	\N	2026-07-10 07:32:46.238859+00
8dd170e7-5098-4d1f-907f-a5f82398156b	c258612a-db07-4d05-9a46-0a1025525d60	e6eceae8-225a-4186-bfe6-50667b142890	DIPAN JEPARA VIBER NO1	1	unit	\N	2026-07-10 07:32:51.72064+00
30b2f980-85fb-4a69-bc59-3aadb53d3f35	5d7d9fb0-7c45-44e1-b48b-fd185c726f34	27de36ab-ae58-45a7-a6ab-034f3c336da0	DIPAN MEWAH CREAM NO1	1	unit	\N	2026-07-10 07:32:55.286618+00
4d329ece-ee1a-4a25-bbc5-1f82b541c05e	5b37cfb6-1c78-4f6a-ae87-825c597a89af	377c52d1-5c3d-4493-a389-d712ae2350d2	SOPABED BOHAY COKLAT	1	unit	\N	2026-07-10 07:33:00.029413+00
41f8c029-8fbe-431b-8ac4-5f7e5d6e5c38	fc079031-763d-464f-a67f-8afd713af185	1ab176c0-fec1-4f0f-9d5f-e903410b713b	DIPAN MEWAH NO1 COKLAT 	1	unit	\N	2026-07-10 07:33:03.288699+00
90e46928-5a63-4fcc-9463-d3059208b67a	8004dbb3-3c97-4c54-925b-484ea359ff68	965777c5-eeda-4a18-9e21-3f9315c28441	SOPA LAMBORJINI ORANGE 321 + STOOL	1	unit	\N	2026-07-10 07:33:06.516107+00
d67a6acc-de80-40ae-9bd9-d69cdc229448	470b4a0f-7ad0-4e8c-b488-0c9f97dd12c5	f0fcc68b-9b21-4f5d-8b19-4b3526b9a0c7	DIPAN KOLAM NO2 ABU	1	unit	\N	2026-07-10 07:33:10.201436+00
121b11ae-0d1d-48ba-8fc5-f0b724632fec	e7a52e8b-b240-4dcf-a514-a3b26a3fcb13	c91cde3c-81b0-4d83-ac7e-0f09a71513d1	DIPAN MINIMALIS NO2 LACI PINK OSCAR	1	unit	\N	2026-07-10 07:33:13.249675+00
95b376d0-b98e-45e1-8eca-847d26545747	8044f9dc-c6c9-477f-b0d0-65e86335789f	0f62b6f4-2336-49d7-a416-5eb99e053c84	DIPAN EXKLUSIF NO1 PINK	1	unit	\N	2026-07-10 07:33:20.613388+00
e15a9ae7-47d5-4623-b531-f501d82105de	b680f280-4581-410d-b841-98203299918a	fda626aa-9d8f-44f5-b8ed-ea34672a4012	DIPAN MINIMALIS NO3 LACI BIRU	1	unit	\N	2026-07-10 07:34:00.609086+00
675dd2a6-abaa-4b7a-bfdb-97771b7fc193	1bc9cc20-216d-4c39-93cb-ff5fa4a78bfc	88bda3a2-a6e2-406e-907a-ec7f0fdf11d4	MEJA MAKAN GRANIT 6 KURSI IVORY	1	unit	\N	2026-07-12 03:58:05.349506+00
d05b38bb-af47-47a2-ae68-8275707d4fe3	6f3d4820-3c89-4eba-b1f0-dbbc9a0baed7	3b81c90e-a925-48e1-9f4d-494fddd0f5b2	SOPABED	1	unit	\N	2026-07-12 04:16:14.131194+00
944c90e0-919e-4302-8ce8-bf6e61b28f8a	24385c92-8936-4556-a99b-cdc89601cfe2	9447a82d-2448-4c2f-a0e6-cb4324f62c9b	BOXY PROCELLA DOBELBED NO1	1	unit	\N	2026-07-15 03:38:24.478996+00
87d8bf49-4c5d-4c4e-9832-681286be0097	0a3ebcf7-748e-4705-ba00-22642c1eebc3	c2f6e44b-6c95-4ec9-b747-1efe204c0f45	SOPABED BLUDRU TEAK	1	unit	\N	2026-07-10 07:33:17.268395+00
4c1bc34e-7af0-4727-81fb-c8b7877f4c46	faaf8a20-b948-48c0-b3e7-e609d6e7ef89	e6eceae8-225a-4186-bfe6-50667b142890	DIPAN JEPARA VIBER NO1	1	unit	\N	2026-07-10 07:33:26.604536+00
5aea315e-7f67-4ba3-8ec2-bfa88189cb48	9a788d3b-8167-4092-9b75-37737295d724	6822128e-261a-4e88-8f42-aecfaea19a72	DIVAN KOLAM 200 X 360 CM - CREAM	1	unit	\N	2026-07-10 07:33:40.01691+00
5e1f7ba7-8946-444b-8862-58f6ebe15a5a	348c9b3b-3d82-4963-93eb-baeeb7013ac3	268cff99-b57e-43eb-92db-5ee249846524	DIPAN SANDARAN LURUS NO1 CREAM	1	unit	\N	2026-07-10 07:33:46.289252+00
bb9f66c4-0edc-4aee-9d78-b66fb45af757	4dc642e1-8534-4db9-a310-0d44e1dbbccf	986f79f7-702e-457d-a092-2e433c6c9be6	SOPABED ABU TUA	1	unit	\N	2026-07-10 07:34:40.632059+00
19ee602c-e543-4e00-9408-d868d86e0d1b	08371078-cd88-4ada-b9a7-ac60e2828351	e99f7289-22d6-43b4-8318-d2ff20cbfef8	BOXY CONFORTA NO1	1	unit	\N	2026-07-13 07:08:12.011474+00
cd5151ee-c306-46e8-ac5f-836181706607	aee86742-efc8-4e81-8eb1-4b0e8c48b8b5	1293ab5b-f55c-4f94-8dfa-a526e9c8c9a8	DIPAN MINIMALIS 200X200	1	unit	\N	2026-07-15 07:33:54.051025+00
ab3cc814-222e-4219-8f19-56bf303df86c	07176de1-3315-4e6e-ba32-29c3afdcfc2a	bec88103-8294-4cd6-b9d3-b83d4f0729eb	DIPAN BED SORONG NO PINK	1	unit	\N	2026-07-10 07:33:31.653606+00
97a22b0e-7dd4-4f61-b0b1-ba26a636ce78	ff72cafd-6dbc-439f-a5c3-c937bd8e946c	7e1b90ee-1e5a-426c-bdcd-674aca21f9ea	DIPAN MEWAH NO1 GOLD	1	unit	\N	2026-07-10 07:33:43.156626+00
c27a52eb-0e10-4e5d-ba93-bf9d42a671c4	9a567b56-f0b2-4443-bb5c-b860bffd09ed	0f62b6f4-2336-49d7-a416-5eb99e053c84	DIPAN EXKLUSIF NO1 PINK	1	unit	\N	2026-07-10 07:34:44.74774+00
bc72831c-466b-4c8e-9c21-bc178874446b	d0b298c8-aa7f-461e-8988-9834723854d6	40950298-f3f7-452d-9528-77519e40382a	SOPA SUDUT	1	unit	\N	2026-07-12 04:11:32.11134+00
9e313c8c-f3a6-45e8-83e1-e08f2f0afdb5	386dd8e0-c26b-485c-93f9-1d0779a083f4	9447a82d-2448-4c2f-a0e6-cb4324f62c9b	BOXY PROCELLA DOBELBED NO1	1	unit	\N	2026-07-13 07:08:51.21411+00
559e2c41-0337-45a1-b445-609bde94792d	7f62f563-f516-4c69-871f-58840ab66c77	859553f1-eaa1-417d-811d-83db1874f33f	DIPAN MEWAH NO1 ABU	1	unit	\N	2026-07-10 07:33:36.159249+00
955c6e3f-d92f-4960-8ed8-7772f59683dd	e87dbdf0-9303-4605-ab79-b8ed0126e6d9	e6fb0a21-4d92-4640-a7ad-2c1da6738f37	JEPARA SUDUT	1	unit	\N	2026-07-10 07:39:23.729582+00
dbc7ff16-e107-4243-bbd3-24793f851e27	672aeb55-f649-4158-8f49-6db06e24fc6f	c4a174a9-30ac-4b95-b0ec-3b599ebc9014	DIPAN MEWAH NO1 SET PERAHU	1	unit	\N	2026-07-12 04:14:38.485003+00
37ff1736-b89d-4b55-886a-fe652fdc1334	d82fa788-4363-41ea-bd2f-58699b7a57ad	1208c054-9794-4862-a001-4d4fa5c1686e	DIPAN JEPARA VIBER NO2	1	unit	\N	2026-07-15 03:13:53.444409+00
\.


--
-- Data for Name: purchase_orders; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.purchase_orders (id, nomor_po, tipe_pemohon, reseller_id, nama_customer, telepon_customer, tanggal_po, tanggal_estimasi, status, catatan, created_by, created_at, updated_at, prioritas, foto_url, kategori_po, nama_tukang) FROM stdin;
3bc5aeac-4872-456d-8967-b22979d56d6f	PO-20260707-0031	reseller	6f6a7b40-5387-4bac-9815-c79e31999a05	\N	\N	2026-07-07	\N	selesai	Keterangan\n1.MODEL DIPAN KOLAM SESUAI DI GAMBAR NOMOR 1\n2.KEDALAMAN KOLAM 10 CM SAJA\n3.TINGGI SANDARAN 140 CM\n4.WARNA COKLAT KAIN BELUDRU\n5.BAGIAN YG DI TANDAI 10 CM,KRENA KASUR TEBAL 20 CM( TENGGELAM 10 CM TIMBUL 10 CM ),SUPAYA TIDAK MENGGANGGU MOTIF SANDARAN SAAT DI PASANGI KASUR	4f192b7f-a33a-4c6e-8857-5649a7665412	2026-07-07 08:37:41.561825+00	2026-07-07 08:37:41.561825+00	normal	https://supabase.solvexaerp.tech/storage/v1/object/public/BungaNaik/po-foto/3bc5aeac-4872-456d-8967-b22979d56d6f/1783413461715.jpeg	premium	\N
5f6d9b08-efd3-438e-915f-fb37af9fd600	PO-20260707-0023	reseller	391ecf3e-3893-4716-9821-c8f7937c8878	\N	\N	2026-07-07	\N	selesai	\N	4f192b7f-a33a-4c6e-8857-5649a7665412	2026-07-07 08:10:55.725619+00	2026-07-07 08:10:55.725619+00	normal	https://supabase.solvexaerp.tech/storage/v1/object/public/BungaNaik/po-foto/5f6d9b08-efd3-438e-915f-fb37af9fd600/1783411855908.jpeg	premium	Emmang
9023d26e-205a-4f8b-bb3c-ac6099bee2fb	PO-20260707-0017	reseller	ed501fc6-6a2c-450d-89dd-e4eae2e3a40c	\N	\N	2026-07-07	2026-07-07	proses	\N	4f192b7f-a33a-4c6e-8857-5649a7665412	2026-07-07 07:39:22.065937+00	2026-07-07 07:39:22.065937+00	normal	https://supabase.solvexaerp.tech/storage/v1/object/public/BungaNaik/po-foto/9023d26e-205a-4f8b-bb3c-ac6099bee2fb/1784085878952.jpeg	premium	Emmang
9a567b56-f0b2-4443-bb5c-b860bffd09ed	PO-20260707-0005	reseller	2688e521-b2c2-4d0e-bffa-37946fa5f325	\N	\N	2026-07-07	\N	pending	\N	4f192b7f-a33a-4c6e-8857-5649a7665412	2026-07-07 06:44:14.427573+00	2026-07-07 06:44:14.427573+00	urgent	https://supabase.solvexaerp.tech/storage/v1/object/public/BungaNaik/po-foto/9a567b56-f0b2-4443-bb5c-b860bffd09ed/1783406654667.jpeg	premium	\N
aee86742-efc8-4e81-8eb1-4b0e8c48b8b5	PO-20260715-0004	reseller	7180b053-40a4-4228-90e6-ada30b745edc	\N	\N	2026-07-15	2026-07-20	pending	\N	82604f2e-aaa5-4990-a325-2e9966902e03	2026-07-15 07:33:53.850897+00	2026-07-15 07:33:53.850897+00	normal	https://supabase.solvexaerp.tech/storage/v1/object/public/BungaNaik/po-foto/aee86742-efc8-4e81-8eb1-4b0e8c48b8b5/1784100859121.jpg	premium	\N
093e891c-d678-4a0f-98d9-535754116b8c	PO-20260709-0002	reseller	e80dbcc5-71e6-484e-be75-ccb91fe04799	\N	\N	2026-07-09	\N	proses	\N	82604f2e-aaa5-4990-a325-2e9966902e03	2026-07-09 04:22:26.630654+00	2026-07-09 04:22:26.630654+00	normal	https://supabase.solvexaerp.tech/storage/v1/object/public/BungaNaik/po-foto/093e891c-d678-4a0f-98d9-535754116b8c/1784086113736.jpeg	premium	Produksi Premium
a87f112e-59a0-4e60-a889-3ba26db5e708	PO-20260707-0039	reseller	7036472f-cb44-453d-be7c-a56799991e3e	\N	\N	2026-07-07	\N	selesai	\N	4f192b7f-a33a-4c6e-8857-5649a7665412	2026-07-07 08:54:23.583763+00	2026-07-07 08:54:23.583763+00	normal	https://supabase.solvexaerp.tech/storage/v1/object/public/BungaNaik/po-foto/a87f112e-59a0-4e60-a889-3ba26db5e708/1783414463773.jpeg	premium	\N
364ede94-336d-4078-8ae4-376195a7a6c1	PO-20260707-0045	reseller	6fabea03-1649-4853-a286-015b38071866	\N	\N	2026-07-07	\N	pending	\N	4f192b7f-a33a-4c6e-8857-5649a7665412	2026-07-07 09:06:51.487162+00	2026-07-07 09:06:51.487162+00	normal	https://supabase.solvexaerp.tech/storage/v1/object/public/BungaNaik/po-foto/364ede94-336d-4078-8ae4-376195a7a6c1/1783415211779.jpeg	premium	\N
93ab8181-6334-4716-8999-b75efe44bfd4	PO-20260707-0043	reseller	2da0eb31-9d05-4b80-8b3b-57b43c71ed1e	\N	\N	2026-07-07	\N	pending	\N	4f192b7f-a33a-4c6e-8857-5649a7665412	2026-07-07 09:05:18.570263+00	2026-07-07 09:05:18.570263+00	normal	https://supabase.solvexaerp.tech/storage/v1/object/public/BungaNaik/po-foto/93ab8181-6334-4716-8999-b75efe44bfd4/1783415118734.jpeg	premium	\N
5d7d9fb0-7c45-44e1-b48b-fd185c726f34	PO-20260707-0015	reseller	ec6cae31-d953-4806-af1e-aa1031982918	\N	\N	2026-07-07	\N	selesai	\N	4f192b7f-a33a-4c6e-8857-5649a7665412	2026-07-07 07:37:51.360874+00	2026-07-07 07:37:51.360874+00	normal	https://supabase.solvexaerp.tech/storage/v1/object/public/BungaNaik/po-foto/5d7d9fb0-7c45-44e1-b48b-fd185c726f34/1783409871579.jpeg	premium	Emmang
ff72cafd-6dbc-439f-a5c3-c937bd8e946c	PO-20260706-0005	reseller	2da0eb31-9d05-4b80-8b3b-57b43c71ed1e	\N	\N	2026-07-06	\N	selesai	\N	4f192b7f-a33a-4c6e-8857-5649a7665412	2026-07-06 08:10:22.377349+00	2026-07-06 08:10:22.377349+00	normal	https://supabase.solvexaerp.tech/storage/v1/object/public/BungaNaik/po-foto/ff72cafd-6dbc-439f-a5c3-c937bd8e946c/1783325422555.jpeg	premium	Emmang
dd787097-c8ca-4e2b-a1a0-c4fe26be45a0	PO-20260707-0030	reseller	ec6cae31-d953-4806-af1e-aa1031982918	\N	\N	2026-07-07	\N	selesai	\N	4f192b7f-a33a-4c6e-8857-5649a7665412	2026-07-07 08:36:02.889282+00	2026-07-07 08:36:02.889282+00	normal	https://supabase.solvexaerp.tech/storage/v1/object/public/BungaNaik/po-foto/dd787097-c8ca-4e2b-a1a0-c4fe26be45a0/1783413363092.jpeg	premium	Emmang
d69b6cc1-40f8-4e71-984c-c1b0c34e893b	PO-20260707-0025	reseller	dbfa7ed2-f20e-46ab-9ea9-96cf677f0195	\N	\N	2026-07-07	\N	selesai	\N	4f192b7f-a33a-4c6e-8857-5649a7665412	2026-07-07 08:12:48.132324+00	2026-07-07 08:12:48.132324+00	normal	https://supabase.solvexaerp.tech/storage/v1/object/public/BungaNaik/po-foto/d69b6cc1-40f8-4e71-984c-c1b0c34e893b/1783411968322.jpeg	premium	Emmang
41b58501-63c8-4bde-ac74-9a219091c48f	PO-20260709-0004	reseller	4ea93c14-5d67-4c1a-97fc-6c8dbf10e6cb	\N	\N	2026-07-09	\N	proses	\N	82604f2e-aaa5-4990-a325-2e9966902e03	2026-07-09 04:25:08.245336+00	2026-07-09 04:25:08.245336+00	normal	https://supabase.solvexaerp.tech/storage/v1/object/public/BungaNaik/po-foto/41b58501-63c8-4bde-ac74-9a219091c48f/1784086051246.jpeg	pabrik	\N
a4a4d145-3b8f-429d-8dfd-3ac03c89e31a	PO-20260709-0005	reseller	e80dbcc5-71e6-484e-be75-ccb91fe04799	\N	\N	2026-07-09	\N	proses	\N	82604f2e-aaa5-4990-a325-2e9966902e03	2026-07-09 04:25:47.099568+00	2026-07-09 04:25:47.099568+00	normal	https://supabase.solvexaerp.tech/storage/v1/object/public/BungaNaik/po-foto/a4a4d145-3b8f-429d-8dfd-3ac03c89e31a/1784086019256.jpeg	pabrik	Suplayer Ivory
0ce38f7d-0bf5-4d12-9743-055081ec02ca	PO-20260708-0014	reseller	2976b58d-9f3f-45c4-8725-5c804eab604c	\N	\N	2026-07-08	2026-07-12	selesai	No1 coklat bludru	82604f2e-aaa5-4990-a325-2e9966902e03	2026-07-08 12:28:34.595966+00	2026-07-08 12:28:34.595966+00	urgent	https://supabase.solvexaerp.tech/storage/v1/object/public/BungaNaik/po-foto/0ce38f7d-0bf5-4d12-9743-055081ec02ca/1783835521270.jpg	premium	Emmang
42aac3bd-b5dd-40bc-bce6-62a3bd835a41	PO-20260709-0001	reseller	dbfa7ed2-f20e-46ab-9ea9-96cf677f0195	\N	\N	2026-07-09	\N	proses	\N	82604f2e-aaa5-4990-a325-2e9966902e03	2026-07-09 04:20:44.628276+00	2026-07-09 04:20:44.628276+00	normal	https://supabase.solvexaerp.tech/storage/v1/object/public/BungaNaik/po-foto/42aac3bd-b5dd-40bc-bce6-62a3bd835a41/1784086172601.jpeg	premium	Produksi Premium
ce6ba994-021d-45d4-b5b7-a97838522a01	PO-20260707-0056	reseller	6fabea03-1649-4853-a286-015b38071866	\N	\N	2026-07-07	\N	selesai	\N	4f192b7f-a33a-4c6e-8857-5649a7665412	2026-07-07 09:26:31.811996+00	2026-07-07 09:26:31.811996+00	normal	https://supabase.solvexaerp.tech/storage/v1/object/public/BungaNaik/po-foto/ce6ba994-021d-45d4-b5b7-a97838522a01/1783416391995.jpeg	jati	\N
6cee2e97-be9b-4dbc-a8e7-486831771481	PO-20260712-0004	reseller	7180b053-40a4-4228-90e6-ada30b745edc	\N	\N	2026-07-12	\N	proses	\N	82604f2e-aaa5-4990-a325-2e9966902e03	2026-07-12 04:15:10.886215+00	2026-07-12 04:15:10.886215+00	normal	https://supabase.solvexaerp.tech/storage/v1/object/public/BungaNaik/po-foto/6cee2e97-be9b-4dbc-a8e7-486831771481/1783829710970.jpeg	premium	Emmang
d82fa788-4363-41ea-bd2f-58699b7a57ad	PO-20260715-0001	reseller	7180b053-40a4-4228-90e6-ada30b745edc	\N	\N	2026-07-15	\N	pending	\N	82604f2e-aaa5-4990-a325-2e9966902e03	2026-07-15 03:13:53.343734+00	2026-07-15 03:13:53.343734+00	normal	https://supabase.solvexaerp.tech/storage/v1/object/public/BungaNaik/po-foto/d82fa788-4363-41ea-bd2f-58699b7a57ad/1784085295342.jpeg	premium	\N
10a48fe7-8744-4023-842d-0fb86b4e9209	PO-20260707-0019	reseller	6fabea03-1649-4853-a286-015b38071866	\N	\N	2026-07-07	\N	selesai	\N	4f192b7f-a33a-4c6e-8857-5649a7665412	2026-07-07 07:41:17.173848+00	2026-07-07 07:41:17.173848+00	urgent	https://supabase.solvexaerp.tech/storage/v1/object/public/BungaNaik/po-foto/10a48fe7-8744-4023-842d-0fb86b4e9209/1783410077414.jpeg	premium	Emmang
672aeb55-f649-4158-8f49-6db06e24fc6f	PO-20260712-0003	reseller	dbfa7ed2-f20e-46ab-9ea9-96cf677f0195	\N	\N	2026-07-12	\N	selesai	\N	82604f2e-aaa5-4990-a325-2e9966902e03	2026-07-12 04:14:38.4021+00	2026-07-12 04:14:38.4021+00	normal	https://supabase.solvexaerp.tech/storage/v1/object/public/BungaNaik/po-foto/672aeb55-f649-4158-8f49-6db06e24fc6f/1783829678472.jpeg	premium	Emmang
d0b298c8-aa7f-461e-8988-9834723854d6	PO-20260712-0002	customer	\N	Ibu aji	082362316387	2026-07-12	\N	pending	\N	82604f2e-aaa5-4990-a325-2e9966902e03	2026-07-12 04:11:32.034229+00	2026-07-12 04:11:32.034229+00	normal	https://supabase.solvexaerp.tech/storage/v1/object/public/BungaNaik/po-foto/d0b298c8-aa7f-461e-8988-9834723854d6/1784085928530.jpeg	semi_premium	\N
b4231661-7042-4485-87f9-3a2368c47db7	PO-20260707-0051	reseller	a18c22b6-16aa-4239-ab66-4687982813f0	\N	\N	2026-07-07	\N	pending	\N	4f192b7f-a33a-4c6e-8857-5649a7665412	2026-07-07 09:13:04.518625+00	2026-07-07 09:13:04.518625+00	normal	https://supabase.solvexaerp.tech/storage/v1/object/public/BungaNaik/po-foto/b4231661-7042-4485-87f9-3a2368c47db7/1783415584705.jpeg	premium	\N
1bc9cc20-216d-4c39-93cb-ff5fa4a78bfc	PO-20260712-0001	reseller	8171f9dd-255b-4822-aa54-aeb4ec5becf4	\N	\N	2026-07-12	\N	proses	\N	82604f2e-aaa5-4990-a325-2e9966902e03	2026-07-12 03:58:05.280468+00	2026-07-12 03:58:05.280468+00	normal	https://supabase.solvexaerp.tech/storage/v1/object/public/BungaNaik/po-foto/1bc9cc20-216d-4c39-93cb-ff5fa4a78bfc/1784085971047.jpeg	pabrik	Suplayer Ivory
6f3d4820-3c89-4eba-b1f0-dbbc9a0baed7	PO-20260712-0005	reseller	9f4186e0-de64-4d49-9d8a-dad78107503c	\N	\N	2026-07-12	\N	pending	\N	82604f2e-aaa5-4990-a325-2e9966902e03	2026-07-12 04:16:14.048338+00	2026-07-12 04:16:14.048338+00	normal	https://supabase.solvexaerp.tech/storage/v1/object/public/BungaNaik/po-foto/6f3d4820-3c89-4eba-b1f0-dbbc9a0baed7/1783829774120.jpeg	premium	\N
95938e92-b006-4d07-b27f-f40e938a3c6a	PO-20260711-0001	reseller	2d42e356-4219-46cc-b62e-6acb53845fdc	\N	\N	2026-07-11	\N	selesai	Sesuai gambar	82604f2e-aaa5-4990-a325-2e9966902e03	2026-07-11 02:08:08.407076+00	2026-07-11 02:08:08.407076+00	normal	\N	pabrik	\N
a9af406c-bede-4e82-a4e7-decf3b349b27	PO-20260708-0013	reseller	e80dbcc5-71e6-484e-be75-ccb91fe04799	\N	\N	2026-07-08	\N	proses	\N	4f192b7f-a33a-4c6e-8857-5649a7665412	2026-07-08 05:48:23.72576+00	2026-07-08 05:48:23.72576+00	normal	https://supabase.solvexaerp.tech/storage/v1/object/public/BungaNaik/po-foto/a9af406c-bede-4e82-a4e7-decf3b349b27/1784086224863.jpeg	pabrik	\N
c43c2d4c-b176-4e15-8708-5bc5c9f3884b	PO-20260715-0002	reseller	c9d9e7b7-60f4-499f-ace5-2318b967ebd6	\N	\N	2026-07-15	\N	pending	\N	82604f2e-aaa5-4990-a325-2e9966902e03	2026-07-15 03:37:41.428221+00	2026-07-15 03:37:41.428221+00	normal	https://supabase.solvexaerp.tech/storage/v1/object/public/BungaNaik/po-foto/c43c2d4c-b176-4e15-8708-5bc5c9f3884b/1784086661459.jpeg	pabrik	\N
e87dbdf0-9303-4605-ab79-b8ed0126e6d9	PO-20260710-0001	reseller	e80dbcc5-71e6-484e-be75-ccb91fe04799	\N	\N	2026-07-10	2026-07-06	selesai	Sesuai gambar	82604f2e-aaa5-4990-a325-2e9966902e03	2026-07-10 07:39:23.646905+00	2026-07-10 07:39:23.646905+00	normal	https://supabase.solvexaerp.tech/storage/v1/object/public/BungaNaik/po-foto/e87dbdf0-9303-4605-ab79-b8ed0126e6d9/1783769178882.jpg	jati	\N
386dd8e0-c26b-485c-93f9-1d0779a083f4	PO-20260713-0002	reseller	c9d9e7b7-60f4-499f-ace5-2318b967ebd6	\N	\N	2026-07-13	2026-07-17	proses	\N	82604f2e-aaa5-4990-a325-2e9966902e03	2026-07-13 07:08:51.010539+00	2026-07-13 07:08:51.010539+00	normal	https://supabase.solvexaerp.tech/storage/v1/object/public/BungaNaik/po-foto/386dd8e0-c26b-485c-93f9-1d0779a083f4/1783926591982.jpg	pabrik	Suplayer pancar
08371078-cd88-4ada-b9a7-ac60e2828351	PO-20260713-0001	reseller	c9d9e7b7-60f4-499f-ace5-2318b967ebd6	\N	\N	2026-07-13	2026-07-17	proses	\N	82604f2e-aaa5-4990-a325-2e9966902e03	2026-07-13 07:08:11.74879+00	2026-07-13 07:08:11.74879+00	normal	https://supabase.solvexaerp.tech/storage/v1/object/public/BungaNaik/po-foto/08371078-cd88-4ada-b9a7-ac60e2828351/1783926608355.jpg	pabrik	Suplayer Comforta
24385c92-8936-4556-a99b-cdc89601cfe2	PO-20260715-0003	reseller	c9d9e7b7-60f4-499f-ace5-2318b967ebd6	\N	\N	2026-07-15	\N	pending	\N	82604f2e-aaa5-4990-a325-2e9966902e03	2026-07-15 03:38:24.388043+00	2026-07-15 03:38:24.388043+00	normal	https://supabase.solvexaerp.tech/storage/v1/object/public/BungaNaik/po-foto/24385c92-8936-4556-a99b-cdc89601cfe2/1784086704431.jpeg	pabrik	\N
170b90b0-954b-43b8-a1f9-3b7029cd30f8	PO-20260707-0022	reseller	17735721-7e89-4628-ac8c-2f5bfd31adfc	\N	\N	2026-07-07	\N	selesai	\N	4f192b7f-a33a-4c6e-8857-5649a7665412	2026-07-07 08:10:19.741147+00	2026-07-07 08:10:19.741147+00	normal	https://supabase.solvexaerp.tech/storage/v1/object/public/BungaNaik/po-foto/170b90b0-954b-43b8-a1f9-3b7029cd30f8/1783411819905.jpeg	premium	\N
b2d51174-d5ae-4bca-879c-ab751ed18b52	PO-20260707-0021	reseller	17735721-7e89-4628-ac8c-2f5bfd31adfc	\N	\N	2026-07-07	\N	selesai	\N	4f192b7f-a33a-4c6e-8857-5649a7665412	2026-07-07 08:09:46.060758+00	2026-07-07 08:09:46.060758+00	normal	https://supabase.solvexaerp.tech/storage/v1/object/public/BungaNaik/po-foto/b2d51174-d5ae-4bca-879c-ab751ed18b52/1783411786432.jpeg	premium	\N
8004dbb3-3c97-4c54-925b-484ea359ff68	PO-20260707-0012	reseller	6fabea03-1649-4853-a286-015b38071866	\N	\N	2026-07-07	\N	selesai	\N	4f192b7f-a33a-4c6e-8857-5649a7665412	2026-07-07 07:34:50.487238+00	2026-07-07 07:34:50.487238+00	normal	https://supabase.solvexaerp.tech/storage/v1/object/public/BungaNaik/po-foto/8004dbb3-3c97-4c54-925b-484ea359ff68/1783409690698.jpeg	premium	\N
74445d68-ae1f-48f9-9a6c-60d5037379bd	PO-20260707-0044	reseller	a3b257a5-a534-4832-b45e-46921b32e80f	\N	\N	2026-07-07	\N	selesai	\N	4f192b7f-a33a-4c6e-8857-5649a7665412	2026-07-07 09:06:11.000873+00	2026-07-07 09:06:11.000873+00	normal	https://supabase.solvexaerp.tech/storage/v1/object/public/BungaNaik/po-foto/74445d68-ae1f-48f9-9a6c-60d5037379bd/1783415171178.jpeg	premium	\N
7230300f-de3f-415a-9458-91cbe0b57283	PO-20260707-0018	reseller	ed501fc6-6a2c-450d-89dd-e4eae2e3a40c	\N	\N	2026-07-07	\N	pending	\N	4f192b7f-a33a-4c6e-8857-5649a7665412	2026-07-07 07:40:04.779522+00	2026-07-07 07:40:04.779522+00	normal	https://supabase.solvexaerp.tech/storage/v1/object/public/BungaNaik/po-foto/7230300f-de3f-415a-9458-91cbe0b57283/1783410004995.jpeg	premium	\N
c258612a-db07-4d05-9a46-0a1025525d60	PO-20260707-0016	reseller	ed501fc6-6a2c-450d-89dd-e4eae2e3a40c	\N	\N	2026-07-07	\N	pending	\N	4f192b7f-a33a-4c6e-8857-5649a7665412	2026-07-07 07:38:28.842018+00	2026-07-07 07:38:28.842018+00	normal	https://supabase.solvexaerp.tech/storage/v1/object/public/BungaNaik/po-foto/c258612a-db07-4d05-9a46-0a1025525d60/1783409909066.jpeg	premium	\N
5b37cfb6-1c78-4f6a-ae87-825c597a89af	PO-20260707-0014	reseller	05de7108-60a2-4d6e-a6db-633849816dfa	\N	\N	2026-07-07	\N	pending	\N	4f192b7f-a33a-4c6e-8857-5649a7665412	2026-07-07 07:37:12.572924+00	2026-07-07 07:37:12.572924+00	normal	https://supabase.solvexaerp.tech/storage/v1/object/public/BungaNaik/po-foto/5b37cfb6-1c78-4f6a-ae87-825c597a89af/1783409832844.jpeg	premium	\N
fc079031-763d-464f-a67f-8afd713af185	PO-20260707-0013	reseller	55aa002c-39b3-4aeb-a7b0-9b094ebd3bbd	\N	\N	2026-07-07	\N	selesai	\N	4f192b7f-a33a-4c6e-8857-5649a7665412	2026-07-07 07:36:21.886877+00	2026-07-07 07:36:21.886877+00	normal	https://supabase.solvexaerp.tech/storage/v1/object/public/BungaNaik/po-foto/fc079031-763d-464f-a67f-8afd713af185/1783409782417.jpeg	premium	\N
470b4a0f-7ad0-4e8c-b488-0c9f97dd12c5	PO-20260707-0011	reseller	2d42e356-4219-46cc-b62e-6acb53845fdc	\N	\N	2026-07-07	\N	selesai	\N	4f192b7f-a33a-4c6e-8857-5649a7665412	2026-07-07 07:33:58.610928+00	2026-07-07 07:33:58.610928+00	normal	https://supabase.solvexaerp.tech/storage/v1/object/public/BungaNaik/po-foto/470b4a0f-7ad0-4e8c-b488-0c9f97dd12c5/1783409638858.jpeg	premium	Emmang
0a3ebcf7-748e-4705-ba00-22642c1eebc3	PO-20260707-0009	reseller	6e01862b-8ecc-44a3-9990-cfb78401dd96	\N	\N	2026-07-07	\N	pending	\N	4f192b7f-a33a-4c6e-8857-5649a7665412	2026-07-07 07:31:35.140997+00	2026-07-07 07:31:35.140997+00	normal	https://supabase.solvexaerp.tech/storage/v1/object/public/BungaNaik/po-foto/0a3ebcf7-748e-4705-ba00-22642c1eebc3/1783409495366.jpeg	premium	\N
8044f9dc-c6c9-477f-b0d0-65e86335789f	PO-20260707-0008	reseller	6fabea03-1649-4853-a286-015b38071866	\N	\N	2026-07-07	\N	pending	\N	4f192b7f-a33a-4c6e-8857-5649a7665412	2026-07-07 07:27:51.870226+00	2026-07-07 07:27:51.870226+00	normal	https://supabase.solvexaerp.tech/storage/v1/object/public/BungaNaik/po-foto/8044f9dc-c6c9-477f-b0d0-65e86335789f/1783409272087.jpeg	premium	\N
faaf8a20-b948-48c0-b3e7-e609d6e7ef89	PO-20260707-0007	reseller	2688e521-b2c2-4d0e-bffa-37946fa5f325	\N	\N	2026-07-07	\N	pending	\N	4f192b7f-a33a-4c6e-8857-5649a7665412	2026-07-07 07:27:11.020013+00	2026-07-07 07:27:11.020013+00	normal	https://supabase.solvexaerp.tech/storage/v1/object/public/BungaNaik/po-foto/faaf8a20-b948-48c0-b3e7-e609d6e7ef89/1783409231324.jpeg	premium	\N
07176de1-3315-4e6e-ba32-29c3afdcfc2a	PO-20260707-0002	reseller	45e07261-1904-4f0c-ad68-771bc70d0411	\N	\N	2026-07-07	\N	selesai	\N	4f192b7f-a33a-4c6e-8857-5649a7665412	2026-07-07 01:37:28.724929+00	2026-07-07 01:37:28.724929+00	tinggi	https://supabase.solvexaerp.tech/storage/v1/object/public/BungaNaik/po-foto/07176de1-3315-4e6e-ba32-29c3afdcfc2a/1783388248916.jpeg	premium	Emmang
7f62f563-f516-4c69-871f-58840ab66c77	PO-20260707-0004	reseller	45e07261-1904-4f0c-ad68-771bc70d0411	\N	\N	2026-07-07	\N	pending	\N	4f192b7f-a33a-4c6e-8857-5649a7665412	2026-07-07 01:40:06.657412+00	2026-07-07 01:40:06.657412+00	normal	https://supabase.solvexaerp.tech/storage/v1/object/public/BungaNaik/po-foto/7f62f563-f516-4c69-871f-58840ab66c77/1783388406907.jpeg	premium	\N
27fc6bd8-3b29-44ff-91f8-ee221866c643	PO-20260706-0002	reseller	c59082b9-b1d7-4c5c-a218-6aac883df51c	\N	\N	2026-07-06	\N	selesai	\N	4f192b7f-a33a-4c6e-8857-5649a7665412	2026-07-06 07:56:58.625078+00	2026-07-06 07:56:58.625078+00	urgent	https://supabase.solvexaerp.tech/storage/v1/object/public/BungaNaik/po-foto/27fc6bd8-3b29-44ff-91f8-ee221866c643/1783324618896.jpeg	premium	Emmang
b680f280-4581-410d-b841-98203299918a	PO-20260706-0001	reseller	4ef7eed5-4f7e-4400-b7db-d5164b303632	\N	\N	2026-07-06	\N	selesai	\N	4f192b7f-a33a-4c6e-8857-5649a7665412	2026-07-06 07:48:16.745881+00	2026-07-06 07:48:16.745881+00	urgent	https://supabase.solvexaerp.tech/storage/v1/object/public/BungaNaik/po-foto/b680f280-4581-410d-b841-98203299918a/1783324096923.jpeg	premium	\N
4dc642e1-8534-4db9-a310-0d44e1dbbccf	PO-20260707-0006	reseller	391ecf3e-3893-4716-9821-c8f7937c8878	\N	\N	2026-07-07	\N	selesai	\N	4f192b7f-a33a-4c6e-8857-5649a7665412	2026-07-07 07:03:37.427827+00	2026-07-07 07:03:37.427827+00	urgent	https://supabase.solvexaerp.tech/storage/v1/object/public/BungaNaik/po-foto/4dc642e1-8534-4db9-a310-0d44e1dbbccf/1783407818049.jpeg	premium	\N
8f8d9d17-0aed-4c4e-82a0-3e06771221dc	PO-20260707-0020	reseller	6fabea03-1649-4853-a286-015b38071866	\N	\N	2026-07-07	\N	selesai	\N	4f192b7f-a33a-4c6e-8857-5649a7665412	2026-07-07 08:08:32.719214+00	2026-07-07 08:08:32.719214+00	urgent	https://supabase.solvexaerp.tech/storage/v1/object/public/BungaNaik/po-foto/8f8d9d17-0aed-4c4e-82a0-3e06771221dc/1783411713003.jpeg	premium	\N
8832414c-d781-419b-bea1-eb43550ae2ab	PO-20260707-0041	reseller	7036472f-cb44-453d-be7c-a56799991e3e	\N	\N	2026-07-07	\N	selesai	\N	4f192b7f-a33a-4c6e-8857-5649a7665412	2026-07-07 09:00:50.980709+00	2026-07-07 09:00:50.980709+00	urgent	https://supabase.solvexaerp.tech/storage/v1/object/public/BungaNaik/po-foto/8832414c-d781-419b-bea1-eb43550ae2ab/1783414851226.jpeg	premium	\N
fe89053f-4884-4d02-a2ef-faeb8d0ec55b	PO-20260707-0040	reseller	7036472f-cb44-453d-be7c-a56799991e3e	\N	\N	2026-07-07	\N	selesai	\N	4f192b7f-a33a-4c6e-8857-5649a7665412	2026-07-07 08:55:18.08398+00	2026-07-07 08:55:18.08398+00	normal	https://supabase.solvexaerp.tech/storage/v1/object/public/BungaNaik/po-foto/fe89053f-4884-4d02-a2ef-faeb8d0ec55b/1783414518269.jpeg	premium	\N
cb875e1b-6297-4bad-9da6-cdf39f62d546	PO-20260707-0038	reseller	ec6cae31-d953-4806-af1e-aa1031982918	\N	\N	2026-07-07	\N	pending	\N	4f192b7f-a33a-4c6e-8857-5649a7665412	2026-07-07 08:53:39.912506+00	2026-07-07 08:53:39.912506+00	normal	https://supabase.solvexaerp.tech/storage/v1/object/public/BungaNaik/po-foto/cb875e1b-6297-4bad-9da6-cdf39f62d546/1783414420166.jpeg	premium	\N
833d074a-cb92-4d4a-959d-d699844f2b48	PO-20260707-0036	reseller	c59082b9-b1d7-4c5c-a218-6aac883df51c	\N	\N	2026-07-07	\N	selesai	\N	4f192b7f-a33a-4c6e-8857-5649a7665412	2026-07-07 08:49:22.275962+00	2026-07-07 08:49:22.275962+00	normal	https://supabase.solvexaerp.tech/storage/v1/object/public/BungaNaik/po-foto/833d074a-cb92-4d4a-959d-d699844f2b48/1783414162700.jpeg	premium	Emmang
f15e5867-efb7-40f6-abda-cef8ef12ecf9	PO-20260707-0037	reseller	6f6a7b40-5387-4bac-9815-c79e31999a05	\N	\N	2026-07-07	\N	pending	Keterangan\n1.Model dipan dan sandarannya sesuai di gambar kecuali pinggiran sandarannya mau di ubah lurus saja sampai ke atas ( seperti gambar di bawah )\n2.Tinggi sandaran 150 cm\n3.Tinggi batas kasur yg di tandai warna hijau 35 cm ( tinggi kasurnya 35 cm )\n4.Bahan kain Oscar Hummer Warna innova	4f192b7f-a33a-4c6e-8857-5649a7665412	2026-07-07 08:52:30.193803+00	2026-07-07 08:52:30.193803+00	normal	https://supabase.solvexaerp.tech/storage/v1/object/public/BungaNaik/po-foto/f15e5867-efb7-40f6-abda-cef8ef12ecf9/1783414350561.jpeg	premium	\N
c4adfa49-3276-4beb-a930-78d934da259c	PO-20260707-0034	reseller	ec6cae31-d953-4806-af1e-aa1031982918	\N	\N	2026-07-07	\N	selesai	\N	4f192b7f-a33a-4c6e-8857-5649a7665412	2026-07-07 08:46:14.139036+00	2026-07-07 08:46:14.139036+00	normal	https://supabase.solvexaerp.tech/storage/v1/object/public/BungaNaik/po-foto/c4adfa49-3276-4beb-a930-78d934da259c/1783413974376.jpeg	premium	\N
fe29584f-688c-4eaf-b723-abe2bfbbc83c	PO-20260707-0035	reseller	6f6a7b40-5387-4bac-9815-c79e31999a05	\N	\N	2026-07-07	\N	selesai	\N	4f192b7f-a33a-4c6e-8857-5649a7665412	2026-07-07 08:47:46.384568+00	2026-07-07 08:47:46.384568+00	normal	https://supabase.solvexaerp.tech/storage/v1/object/public/BungaNaik/po-foto/fe29584f-688c-4eaf-b723-abe2bfbbc83c/1783414066748.jpeg	premium	Emmang
e7a52e8b-b240-4dcf-a514-a3b26a3fcb13	PO-20260707-0010	reseller	de016405-6b7a-476d-ab03-aa0e22e27d37	\N	\N	2026-07-07	\N	selesai	\N	4f192b7f-a33a-4c6e-8857-5649a7665412	2026-07-07 07:32:43.345987+00	2026-07-07 07:32:43.345987+00	normal	https://supabase.solvexaerp.tech/storage/v1/object/public/BungaNaik/po-foto/e7a52e8b-b240-4dcf-a514-a3b26a3fcb13/1783409563556.jpeg	premium	Emman
07661a86-fd4a-4901-b62f-6c3ca79ef3e6	PO-20260707-0032	reseller	dbfa7ed2-f20e-46ab-9ea9-96cf677f0195	\N	\N	2026-07-07	\N	selesai	\N	4f192b7f-a33a-4c6e-8857-5649a7665412	2026-07-07 08:42:04.44548+00	2026-07-07 08:42:04.44548+00	tinggi	https://supabase.solvexaerp.tech/storage/v1/object/public/BungaNaik/po-foto/07661a86-fd4a-4901-b62f-6c3ca79ef3e6/1783413724809.jpeg	premium	\N
1d8b80b7-0109-4bfd-988d-0d3c2e102206	PO-20260707-0028	reseller	564c929f-39a3-47a7-87ef-533522a9a6c1	\N	\N	2026-07-07	\N	pending	\N	4f192b7f-a33a-4c6e-8857-5649a7665412	2026-07-07 08:22:56.847448+00	2026-07-07 08:22:56.847448+00	normal	https://supabase.solvexaerp.tech/storage/v1/object/public/BungaNaik/po-foto/1d8b80b7-0109-4bfd-988d-0d3c2e102206/1783412576990.jpeg	premium	\N
db03c40d-02ed-468d-94b2-bc9332a1860d	PO-20260707-0027	reseller	2d42e356-4219-46cc-b62e-6acb53845fdc	\N	\N	2026-07-07	\N	pending	\N	4f192b7f-a33a-4c6e-8857-5649a7665412	2026-07-07 08:22:06.519652+00	2026-07-07 08:22:06.519652+00	normal	https://supabase.solvexaerp.tech/storage/v1/object/public/BungaNaik/po-foto/db03c40d-02ed-468d-94b2-bc9332a1860d/1783412526697.jpeg	pabrik	\N
5c603ffd-2ddb-4a3e-8420-4dd98b663747	PO-20260707-0026	reseller	6fabea03-1649-4853-a286-015b38071866	\N	\N	2026-07-07	\N	pending	\N	4f192b7f-a33a-4c6e-8857-5649a7665412	2026-07-07 08:19:44.190563+00	2026-07-07 08:19:44.190563+00	normal	https://supabase.solvexaerp.tech/storage/v1/object/public/BungaNaik/po-foto/5c603ffd-2ddb-4a3e-8420-4dd98b663747/1783412384668.jpeg	premium	\N
9fbd8cc8-287a-469b-b4e0-c9baccfd3567	PO-20260707-0033	reseller	ec6cae31-d953-4806-af1e-aa1031982918	\N	\N	2026-07-07	\N	selesai	\N	4f192b7f-a33a-4c6e-8857-5649a7665412	2026-07-07 08:42:47.593287+00	2026-07-07 08:42:47.593287+00	normal	https://supabase.solvexaerp.tech/storage/v1/object/public/BungaNaik/po-foto/9fbd8cc8-287a-469b-b4e0-c9baccfd3567/1783413767769.jpeg	premium	Emmang
2fb83b7c-2402-4f1e-9a47-2647bd922ad0	PO-20260707-0047	reseller	c9d9e7b7-60f4-499f-ace5-2318b967ebd6	\N	\N	2026-07-07	\N	selesai	\N	4f192b7f-a33a-4c6e-8857-5649a7665412	2026-07-07 09:10:04.21772+00	2026-07-07 09:10:04.21772+00	normal	https://supabase.solvexaerp.tech/storage/v1/object/public/BungaNaik/po-foto/2fb83b7c-2402-4f1e-9a47-2647bd922ad0/1783415404405.jpeg	premium	Emmang
cbe40fd9-72dc-42a1-bd2b-1050deb3d5d0	PO-20260708-0011	reseller	e80dbcc5-71e6-484e-be75-ccb91fe04799	\N	\N	2026-07-08	\N	pending	\N	4f192b7f-a33a-4c6e-8857-5649a7665412	2026-07-08 05:29:34.757119+00	2026-07-08 05:29:34.757119+00	normal	https://supabase.solvexaerp.tech/storage/v1/object/public/BungaNaik/po-foto/cbe40fd9-72dc-42a1-bd2b-1050deb3d5d0/1783488575041.jpeg	jati	\N
11b3d966-cff6-4113-a856-f6ca11258fa7	PO-20260708-0010	reseller	e80dbcc5-71e6-484e-be75-ccb91fe04799	\N	\N	2026-07-08	\N	pending	\N	4f192b7f-a33a-4c6e-8857-5649a7665412	2026-07-08 05:28:38.234238+00	2026-07-08 05:28:38.234238+00	normal	https://supabase.solvexaerp.tech/storage/v1/object/public/BungaNaik/po-foto/11b3d966-cff6-4113-a856-f6ca11258fa7/1783488518489.jpeg	jati	\N
5e20ff9f-4c8e-4428-806f-9cd84dea4fb8	PO-20260708-0009	reseller	e80dbcc5-71e6-484e-be75-ccb91fe04799	\N	\N	2026-07-08	\N	pending	\N	4f192b7f-a33a-4c6e-8857-5649a7665412	2026-07-08 05:28:08.659283+00	2026-07-08 05:28:08.659283+00	normal	https://supabase.solvexaerp.tech/storage/v1/object/public/BungaNaik/po-foto/5e20ff9f-4c8e-4428-806f-9cd84dea4fb8/1783488488960.jpeg	jati	\N
12977d75-bbe5-416f-bd90-550f6bcd03a5	PO-20260707-0054	reseller	771dc959-2a97-493d-9cc1-a32bcf4fd165	\N	\N	2026-07-07	\N	pending	\N	4f192b7f-a33a-4c6e-8857-5649a7665412	2026-07-07 09:24:58.537714+00	2026-07-07 09:24:58.537714+00	normal	https://supabase.solvexaerp.tech/storage/v1/object/public/BungaNaik/po-foto/12977d75-bbe5-416f-bd90-550f6bcd03a5/1783416298730.jpeg	jati	\N
9a7b435e-5e45-4c93-8607-2d4f09bf2920	PO-20260708-0008	reseller	6fabea03-1649-4853-a286-015b38071866	\N	\N	2026-07-08	\N	pending	\N	4f192b7f-a33a-4c6e-8857-5649a7665412	2026-07-08 05:27:15.319043+00	2026-07-08 05:27:15.319043+00	normal	https://supabase.solvexaerp.tech/storage/v1/object/public/BungaNaik/po-foto/9a7b435e-5e45-4c93-8607-2d4f09bf2920/1783488435597.jpeg	semi_premium	\N
0997f044-50e8-42bb-9204-df92a7ec5f4c	PO-20260708-0007	reseller	6fabea03-1649-4853-a286-015b38071866	\N	\N	2026-07-08	\N	pending	\N	4f192b7f-a33a-4c6e-8857-5649a7665412	2026-07-08 05:26:26.969486+00	2026-07-08 05:26:26.969486+00	urgent	https://supabase.solvexaerp.tech/storage/v1/object/public/BungaNaik/po-foto/0997f044-50e8-42bb-9204-df92a7ec5f4c/1783488387245.jpeg	semi_premium	\N
4afe3653-4b77-4dd3-8e33-d0abd93cf4d3	PO-20260708-0006	reseller	dbfa7ed2-f20e-46ab-9ea9-96cf677f0195	\N	\N	2026-07-08	\N	pending	\N	4f192b7f-a33a-4c6e-8857-5649a7665412	2026-07-08 05:25:50.387382+00	2026-07-08 05:25:50.387382+00	normal	https://supabase.solvexaerp.tech/storage/v1/object/public/BungaNaik/po-foto/4afe3653-4b77-4dd3-8e33-d0abd93cf4d3/1783488350673.jpeg	semi_premium	\N
be50b774-3d4b-4b0f-bda4-3c76f7a7ce02	PO-20260708-0005	reseller	9f4186e0-de64-4d49-9d8a-dad78107503c	\N	\N	2026-07-08	\N	pending	\N	4f192b7f-a33a-4c6e-8857-5649a7665412	2026-07-08 05:24:46.508536+00	2026-07-08 05:24:46.508536+00	urgent	https://supabase.solvexaerp.tech/storage/v1/object/public/BungaNaik/po-foto/be50b774-3d4b-4b0f-bda4-3c76f7a7ce02/1783488286795.jpeg	semi_premium	\N
5c6f496d-7b57-4c26-bb9d-406de0354802	PO-20260708-0004	reseller	45e07261-1904-4f0c-ad68-771bc70d0411	\N	\N	2026-07-08	\N	pending	\N	4f192b7f-a33a-4c6e-8857-5649a7665412	2026-07-08 05:23:54.859563+00	2026-07-08 05:23:54.859563+00	normal	https://supabase.solvexaerp.tech/storage/v1/object/public/BungaNaik/po-foto/5c6f496d-7b57-4c26-bb9d-406de0354802/1783488235149.jpeg	semi_premium	\N
1704f8a3-1289-4415-8fd1-a6097dd8e90f	PO-20260708-0003	reseller	ed501fc6-6a2c-450d-89dd-e4eae2e3a40c	\N	\N	2026-07-08	\N	pending	\N	4f192b7f-a33a-4c6e-8857-5649a7665412	2026-07-08 05:22:32.383228+00	2026-07-08 05:22:32.383228+00	normal	https://supabase.solvexaerp.tech/storage/v1/object/public/BungaNaik/po-foto/1704f8a3-1289-4415-8fd1-a6097dd8e90f/1783488152785.jpeg	semi_premium	\N
dbca4076-690d-4993-ac8f-24ed505c8d0a	PO-20260708-0002	reseller	ae36b9d1-e877-40cb-84bb-1e2fbe6a2e30	\N	\N	2026-07-08	\N	pending	\N	4f192b7f-a33a-4c6e-8857-5649a7665412	2026-07-08 02:59:12.855322+00	2026-07-08 02:59:12.855322+00	normal	https://supabase.solvexaerp.tech/storage/v1/object/public/BungaNaik/po-foto/dbca4076-690d-4993-ac8f-24ed505c8d0a/1783479553129.jpeg	semi_premium	\N
c169c00f-6683-4dd3-b60d-1f0ef70cc1f7	PO-20260708-0001	reseller	6fabea03-1649-4853-a286-015b38071866	\N	\N	2026-07-08	\N	pending	\N	4f192b7f-a33a-4c6e-8857-5649a7665412	2026-07-08 02:48:48.744847+00	2026-07-08 02:48:48.744847+00	urgent	https://supabase.solvexaerp.tech/storage/v1/object/public/BungaNaik/po-foto/c169c00f-6683-4dd3-b60d-1f0ef70cc1f7/1783478929024.jpeg	semi_premium	\N
1feedc03-6fa9-4dee-8e14-c45ff587a78c	PO-20260708-0012	reseller	fee6dcc4-4251-4c90-b3ce-6921271c7444	\N	\N	2026-07-08	\N	proses	\N	4f192b7f-a33a-4c6e-8857-5649a7665412	2026-07-08 05:33:19.490176+00	2026-07-08 05:33:19.490176+00	normal	https://supabase.solvexaerp.tech/storage/v1/object/public/BungaNaik/po-foto/1feedc03-6fa9-4dee-8e14-c45ff587a78c/1783488799854.jpeg	jati	\N
14e79edf-bbd1-49a4-a464-54187091b69e	PO-20260707-0053	reseller	ed501fc6-6a2c-450d-89dd-e4eae2e3a40c	\N	\N	2026-07-07	\N	pending	\N	4f192b7f-a33a-4c6e-8857-5649a7665412	2026-07-07 09:21:24.788024+00	2026-07-07 09:21:24.788024+00	normal	https://supabase.solvexaerp.tech/storage/v1/object/public/BungaNaik/po-foto/14e79edf-bbd1-49a4-a464-54187091b69e/1783416085044.jpeg	jati	\N
551fa4cc-eb39-4f08-826e-1a1addb83b41	PO-20260707-0055	reseller	2d42e356-4219-46cc-b62e-6acb53845fdc	\N	\N	2026-07-07	\N	selesai	\N	4f192b7f-a33a-4c6e-8857-5649a7665412	2026-07-07 09:25:56.568471+00	2026-07-07 09:25:56.568471+00	normal	https://supabase.solvexaerp.tech/storage/v1/object/public/BungaNaik/po-foto/551fa4cc-eb39-4f08-826e-1a1addb83b41/1783416356757.jpeg	semi_premium	\N
42a97d05-0d94-4615-aeea-8dbe3f703351	PO-20260707-0052	reseller	565a624f-2db8-4012-847a-a3763ef36f31	\N	\N	2026-07-07	\N	pending	\N	4f192b7f-a33a-4c6e-8857-5649a7665412	2026-07-07 09:20:22.934505+00	2026-07-07 09:20:22.934505+00	normal	https://supabase.solvexaerp.tech/storage/v1/object/public/BungaNaik/po-foto/42a97d05-0d94-4615-aeea-8dbe3f703351/1783416023393.jpeg	jati	\N
9b4a47d4-f97c-44da-9357-ecd607b04eaf	PO-20260707-0049	reseller	dbfa7ed2-f20e-46ab-9ea9-96cf677f0195	\N	\N	2026-07-07	\N	pending	\N	4f192b7f-a33a-4c6e-8857-5649a7665412	2026-07-07 09:11:45.530141+00	2026-07-07 09:11:45.530141+00	normal	https://supabase.solvexaerp.tech/storage/v1/object/public/BungaNaik/po-foto/9b4a47d4-f97c-44da-9357-ecd607b04eaf/1783415505882.jpeg	premium	\N
2b75b486-fb88-4d41-8cf8-8d530a231324	PO-20260709-0003	reseller	dbfa7ed2-f20e-46ab-9ea9-96cf677f0195	\N	\N	2026-07-09	2026-07-12	selesai	\N	82604f2e-aaa5-4990-a325-2e9966902e03	2026-07-09 04:23:16.214785+00	2026-07-09 04:23:16.214785+00	normal	https://supabase.solvexaerp.tech/storage/v1/object/public/BungaNaik/po-foto/2b75b486-fb88-4d41-8cf8-8d530a231324/1783570996418.jpeg	premium	Emmang
4489d72e-36d6-4b21-a176-afdf2a256cb8	PO-20260707-0029	reseller	6fabea03-1649-4853-a286-015b38071866	\N	\N	2026-07-07	\N	selesai	\N	4f192b7f-a33a-4c6e-8857-5649a7665412	2026-07-07 08:35:05.189779+00	2026-07-07 08:35:05.189779+00	normal	https://supabase.solvexaerp.tech/storage/v1/object/public/BungaNaik/po-foto/4489d72e-36d6-4b21-a176-afdf2a256cb8/1783413305398.jpeg	premium	Emmang
f7c50b4f-0a6d-4167-8037-1c7e07691e05	PO-20260707-0050	reseller	5c127fc6-0f0c-42fc-b918-a0d30e6c8e4a	\N	\N	2026-07-07	\N	pending	\N	4f192b7f-a33a-4c6e-8857-5649a7665412	2026-07-07 09:12:25.394572+00	2026-07-07 09:12:25.394572+00	normal	https://supabase.solvexaerp.tech/storage/v1/object/public/BungaNaik/po-foto/f7c50b4f-0a6d-4167-8037-1c7e07691e05/1783415545683.jpeg	premium	\N
042350f9-6237-458a-b37f-70b3ad17e312	PO-20260707-0048	reseller	2d42e356-4219-46cc-b62e-6acb53845fdc	\N	\N	2026-07-07	\N	selesai	\N	4f192b7f-a33a-4c6e-8857-5649a7665412	2026-07-07 09:10:53.832746+00	2026-07-07 09:10:53.832746+00	normal	https://supabase.solvexaerp.tech/storage/v1/object/public/BungaNaik/po-foto/042350f9-6237-458a-b37f-70b3ad17e312/1783415454062.jpeg	premium	Emmang
017cdbf0-6eca-4415-8e8c-3fc8a2246f21	PO-20260707-0046	reseller	6f6a7b40-5387-4bac-9815-c79e31999a05	\N	\N	2026-07-07	\N	pending	Keterangan PO :\n\n1.Model dipan sesuai di gambar nomor satu (1)\n2.Pakai laci,Lacinya sebelah kanan\n3.Warna coklat kain beludru\n4.Model sandaran melebar kesamping sesuai di gambar\n5.model pinggiran sandaran melengkung seperti yg di lingkari warna merah pakai list golf	4f192b7f-a33a-4c6e-8857-5649a7665412	2026-07-07 09:09:16.550264+00	2026-07-07 09:09:16.550264+00	normal	https://supabase.solvexaerp.tech/storage/v1/object/public/BungaNaik/po-foto/017cdbf0-6eca-4415-8e8c-3fc8a2246f21/1783415356736.jpeg	premium	\N
61fa5fb3-e977-43ab-8368-36a0ec356f70	PO-20260707-0024	reseller	c563651a-caaf-4f2d-82e2-caa0e514f509	\N	\N	2026-07-07	\N	selesai	\N	4f192b7f-a33a-4c6e-8857-5649a7665412	2026-07-07 08:12:07.947629+00	2026-07-07 08:12:07.947629+00	normal	https://supabase.solvexaerp.tech/storage/v1/object/public/BungaNaik/po-foto/61fa5fb3-e977-43ab-8368-36a0ec356f70/1783411928111.jpeg	premium	\N
9a788d3b-8167-4092-9b75-37737295d724	PO-20260707-0001	reseller	ee180db1-0511-4639-9ba7-ab72f06d788a	\N	\N	2026-07-07	\N	selesai	\N	4f192b7f-a33a-4c6e-8857-5649a7665412	2026-07-07 01:36:50.721047+00	2026-07-07 01:36:50.721047+00	normal	https://supabase.solvexaerp.tech/storage/v1/object/public/BungaNaik/po-foto/9a788d3b-8167-4092-9b75-37737295d724/1783388210927.jpeg	premium	\N
348c9b3b-3d82-4963-93eb-baeeb7013ac3	PO-20260706-0003	reseller	6f6a7b40-5387-4bac-9815-c79e31999a05	\N	\N	2026-07-06	\N	pending	Keterangan\n\n1.Model dipan dan sandarannya sesuai di gambar kecuali pinggiran sandarannya mau di ubah lurus saja sampai ke atas ( seperti gambar di bawah )\n2.Tinggi sandaran 150 cm\n3.Tinggi batas kasur yg di tandai warna hijau 35 cm ( tinggi kasurnya 35 cm )\n4.Bahan kain Oscar Hummer Warna innova	4f192b7f-a33a-4c6e-8857-5649a7665412	2026-07-06 08:02:28.349884+00	2026-07-06 08:02:28.349884+00	urgent	https://supabase.solvexaerp.tech/storage/v1/object/public/BungaNaik/po-foto/348c9b3b-3d82-4963-93eb-baeeb7013ac3/1783324948788.jpeg	premium	\N
\.


--
-- Data for Name: reseller_reviews; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.reseller_reviews (id, penjualan_id, reseller_id, tipe, isi, resolved, status, resolved_at, created_by, created_at) FROM stdin;
630ceb74-969f-40e4-987c-9d9063f8adc5	0b24453b-6a12-404f-8341-b6d091bb985c	a18c22b6-16aa-4239-ab66-4687982813f0	pujian	Mantapp	f	\N	\N	\N	2026-07-08 16:34:12.422624+00
\.


--
-- Data for Name: resellers; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.resellers (id, nama, telepon, alamat, kota, catatan, aktif, created_at, updated_at, token, koreksi_admin, koreksi_asisten, sedekah_mimbar, nama_bank, no_rekening) FROM stdin;
ed501fc6-6a2c-450d-89dd-e4eae2e3a40c	KAK ARMANDO	81398736491	\N	\N	\N	t	2026-06-26 14:55:10.973415+00	2026-06-26 14:55:10.973415+00	\N	0.00	0.00	0.00	\N	\N
7036472f-cb44-453d-be7c-a56799991e3e	KAK ARNI	82351372022	\N	\N	\N	t	2026-06-26 14:55:10.973415+00	2026-06-26 14:55:10.973415+00	\N	0.00	0.00	0.00	\N	\N
064fea70-2de2-4923-bfa1-592534c3b173	KAK ASRIADI	82195730828	\N	\N	\N	t	2026-06-26 14:55:10.973415+00	2026-06-26 14:55:10.973415+00	\N	0.00	0.00	0.00	\N	\N
de016405-6b7a-476d-ab03-aa0e22e27d37	KAK ATTI	81355773554	\N	\N	\N	t	2026-06-26 14:55:10.973415+00	2026-06-26 14:55:10.973415+00	\N	0.00	0.00	0.00	\N	\N
ac095562-294c-41c0-85db-57085ca3f28c	KAK AULIA	85813022114	\N	\N	\N	t	2026-06-26 14:55:10.973415+00	2026-06-26 14:55:10.973415+00	\N	0.00	0.00	0.00	\N	\N
9f4186e0-de64-4d49-9d8a-dad78107503c	KAK AYU ANDIRA	81243396735	\N	\N	\N	t	2026-06-26 14:55:10.973415+00	2026-06-26 14:55:10.973415+00	\N	0.00	0.00	0.00	\N	\N
ead0185b-617d-4175-bb9e-a46b276f55a9	KAK AYU ARIF	85341450625	\N	\N	\N	t	2026-06-26 14:55:10.973415+00	2026-06-26 14:55:10.973415+00	\N	0.00	0.00	0.00	\N	\N
564c929f-39a3-47a7-87ef-533522a9a6c1	KAK AYU WANDA	85191524795	\N	\N	\N	t	2026-06-26 14:55:10.973415+00	2026-06-26 14:55:10.973415+00	\N	0.00	0.00	0.00	\N	\N
e7375baa-ca09-4264-9209-fac0962c0ba9	KAK BAYA	81343616447	\N	\N	\N	t	2026-06-26 14:55:10.973415+00	2026-06-26 14:55:10.973415+00	\N	0.00	0.00	0.00	\N	\N
07195b97-2ab4-4ce6-a73d-208d0f3f19c8	KAK EKA	82346698760	\N	\N	\N	t	2026-06-26 14:55:10.973415+00	2026-06-26 14:55:10.973415+00	\N	0.00	0.00	0.00	\N	\N
2e98fb54-db42-4861-94ec-5e4da67e7c09	KAK ERNA ADI	82137362989	\N	\N	\N	t	2026-06-26 14:55:10.973415+00	2026-06-26 14:55:10.973415+00	\N	0.00	0.00	0.00	\N	\N
73416110-357d-444a-b63e-dee1bfda94be	KAK FIRA	81380917151	\N	\N	\N	t	2026-06-26 14:55:10.973415+00	2026-06-26 14:55:10.973415+00	\N	0.00	0.00	0.00	\N	\N
723530e6-c75d-4d6d-88c1-a5d96f51eb7b	KAK HARDIANTI	85225364333	\N	\N	\N	t	2026-06-26 14:55:10.973415+00	2026-06-26 14:55:10.973415+00	\N	0.00	0.00	0.00	\N	\N
ba6f6be2-4c83-4ae0-af66-5c3bae660789	KAK HARDIANTY	895620166816	\N	\N	\N	t	2026-06-26 14:55:10.973415+00	2026-06-26 14:55:10.973415+00	\N	0.00	0.00	0.00	\N	\N
48f82177-5ca2-4eb7-996f-bd4ac183ad46	KAK HARIYATI	87865534005	\N	\N	\N	t	2026-06-26 14:55:10.973415+00	2026-06-26 14:55:10.973415+00	\N	0.00	0.00	0.00	\N	\N
565a624f-2db8-4012-847a-a3763ef36f31	KAK HASWA	85824115128	\N	\N	\N	t	2026-06-26 14:55:10.973415+00	2026-06-26 14:55:10.973415+00	\N	0.00	0.00	0.00	\N	\N
63a33cc9-44f1-4de9-954c-e7e109d55e48	KAK HERLINA	\N	\N	\N	\N	t	2026-06-26 14:55:10.973415+00	2026-06-26 14:55:10.973415+00	\N	0.00	0.00	0.00	\N	\N
0ef33b2a-8239-4411-af96-8195031387a3	KAK HIKMA	853340091512	\N	\N	\N	t	2026-06-26 14:55:10.973415+00	2026-06-26 14:55:10.973415+00	\N	0.00	0.00	0.00	\N	\N
05568cef-3a83-415d-8206-2dbf68ac31d6	KAK ICAL	89580666726	\N	\N	\N	t	2026-06-26 14:55:10.973415+00	2026-06-26 14:55:10.973415+00	\N	0.00	0.00	0.00	\N	\N
0215793e-dc21-451b-8fae-483a33c81dab	KAK IKBAL	82194543887	\N	\N	\N	t	2026-06-26 14:55:10.973415+00	2026-06-26 14:55:10.973415+00	\N	0.00	0.00	0.00	\N	\N
7180b053-40a4-4228-90e6-ada30b745edc	KAK IKEN	895510139918	\N	\N	\N	t	2026-06-26 14:55:10.973415+00	2026-06-26 14:55:10.973415+00	\N	0.00	0.00	0.00	\N	\N
40de6ec7-8493-40c6-b014-b61bd97cc0af	KAK ILHAM	\N	\N	\N	\N	t	2026-06-26 14:55:10.973415+00	2026-06-26 14:55:10.973415+00	\N	0.00	0.00	0.00	\N	\N
5d9e0976-1036-4946-b478-87f32817e782	KAK ILHAM K	85821031341	\N	\N	\N	t	2026-06-26 14:55:10.973415+00	2026-06-26 14:55:10.973415+00	\N	0.00	0.00	0.00	\N	\N
7126ab5e-213c-4d8b-bbf3-b5c1e28d2f54	KAK INDI	\N	\N	\N	\N	t	2026-06-26 14:55:10.973415+00	2026-06-26 14:55:10.973415+00	\N	0.00	0.00	0.00	\N	\N
90cc0050-e21d-43ad-9fe4-348b9fac48bd	KAK INDRI	81355522555	\N	\N	\N	t	2026-06-26 14:55:10.973415+00	2026-06-26 14:55:10.973415+00	\N	0.00	0.00	0.00	\N	\N
fb8a629a-add2-40e6-8562-c5a77ab12dc9	KAK IPUNG	\N	\N	\N	\N	t	2026-06-26 14:55:10.973415+00	2026-06-26 14:55:10.973415+00	\N	0.00	0.00	0.00	\N	\N
d60aca06-aa7f-4a71-941f-5b4816642151	KAK IRMA	85232090151	\N	\N	\N	t	2026-06-26 14:55:10.973415+00	2026-06-26 14:55:10.973415+00	\N	0.00	0.00	0.00	\N	\N
42d6f44f-40f4-43a1-9f5a-7c83973318a2	KAK IRMAWATI	85756242932	\N	\N	\N	t	2026-06-26 14:55:10.973415+00	2026-06-26 14:55:10.973415+00	\N	0.00	0.00	0.00	\N	\N
0bc48d33-23fb-4cf4-840e-a20d2bfeedb0	KAK JUMRIAH	85215558190	\N	\N	\N	t	2026-06-26 14:55:10.973415+00	2026-06-26 14:55:10.973415+00	\N	0.00	0.00	0.00	\N	\N
9ca09046-ca27-4dd1-840e-c82d58a1a73f	KAK JUMRIANA	\N	\N	\N	\N	t	2026-06-26 14:55:10.973415+00	2026-06-26 14:55:10.973415+00	\N	0.00	0.00	0.00	\N	\N
05de7108-60a2-4d6e-a6db-633849816dfa	KAK JUSRA	85255625426	\N	\N	\N	t	2026-06-26 14:55:10.973415+00	2026-06-26 14:55:10.973415+00	\N	0.00	0.00	0.00	\N	\N
6c07e30c-f9e9-4b71-8a22-bce44910a180	KAK LENI	\N	\N	\N	\N	t	2026-06-26 14:55:10.973415+00	2026-06-26 14:55:10.973415+00	\N	0.00	0.00	0.00	\N	\N
c24fe8d2-dbc0-4e86-ad63-275121ac3d73	KAK MANDA	\N	\N	\N	\N	t	2026-06-26 14:55:10.973415+00	2026-06-26 14:55:10.973415+00	\N	0.00	0.00	0.00	\N	\N
db94acc6-62b9-408d-a59e-d0877ffd184f	KAK MAWARDI	81523773911	\N	\N	\N	t	2026-06-26 14:55:10.973415+00	2026-06-26 14:55:10.973415+00	\N	0.00	0.00	0.00	\N	\N
2976b58d-9f3f-45c4-8725-5c804eab604c	KAK MELONA	92260209722	\N	\N	\N	t	2026-06-26 14:55:10.973415+00	2026-06-26 14:55:10.973415+00	\N	0.00	0.00	0.00	\N	\N
ae36b9d1-e877-40cb-84bb-1e2fbe6a2e30	KAK MIA	82388881258	\N	\N	\N	t	2026-06-26 14:55:10.973415+00	2026-06-26 14:55:10.973415+00	\N	0.00	0.00	0.00	\N	\N
1b48ade7-21bc-43b0-9f08-ca59a3027be1	KAK MILDAWATI	85315164446	\N	\N	\N	t	2026-06-26 14:55:10.973415+00	2026-06-26 14:55:10.973415+00	\N	0.00	0.00	0.00	\N	\N
e9a8f31e-0390-48e2-a5ab-dd6a1bf5d33e	KAK NAHIDA	\N	\N	\N	\N	t	2026-06-26 14:55:10.973415+00	2026-06-26 14:55:10.973415+00	\N	0.00	0.00	0.00	\N	\N
5c127fc6-0f0c-42fc-b918-a0d30e6c8e4a	KAK NANI	85821223384	\N	\N	\N	t	2026-06-26 14:55:10.973415+00	2026-06-26 14:55:10.973415+00	\N	0.00	0.00	0.00	\N	\N
a18c22b6-16aa-4239-ab66-4687982813f0	KAK NAURA	85397907151	\N	\N	\N	t	2026-06-26 14:55:10.973415+00	2026-06-26 14:55:10.973415+00	\N	0.00	0.00	0.00	\N	\N
c1068229-ae1b-4ed8-b1cb-f988e66a872c	KAK NIAR	82345660660	\N	\N	\N	t	2026-06-26 14:55:10.973415+00	2026-06-26 14:55:10.973415+00	\N	0.00	0.00	0.00	\N	\N
17735721-7e89-4628-ac8c-2f5bfd31adfc	KAK NIARA	85342993272	\N	\N	\N	t	2026-06-26 14:55:10.973415+00	2026-06-26 14:55:10.973415+00	\N	0.00	0.00	0.00	\N	\N
55aa002c-39b3-4aeb-a7b0-9b094ebd3bbd	KAK NIKMA	\N	\N	\N	\N	t	2026-06-26 14:55:10.973415+00	2026-06-26 14:55:10.973415+00	\N	0.00	0.00	0.00	\N	\N
ab0a94f4-04ec-401f-a435-6093aba4a74d	KAK NINGSI	8232417162	\N	\N	\N	t	2026-06-26 14:55:10.973415+00	2026-06-26 14:55:10.973415+00	\N	0.00	0.00	0.00	\N	\N
1df0283d-cf9d-4e71-be3a-f559cfa84595	KAK NIRA	85255838612	\N	\N	\N	t	2026-06-26 14:55:10.973415+00	2026-06-26 14:55:10.973415+00	\N	0.00	0.00	0.00	\N	\N
f906a7de-4839-4c5f-902c-71790c84568d	KAK NUR	82271421344	\N	\N	\N	t	2026-06-26 14:55:10.973415+00	2026-06-26 14:55:10.973415+00	\N	0.00	0.00	0.00	\N	\N
f0f50628-59f0-4035-b126-bc77a1af061b	KAK NURUL	85298962949	\N	\N	\N	t	2026-06-26 14:55:10.973415+00	2026-06-26 14:55:10.973415+00	\N	0.00	0.00	0.00	\N	\N
391ecf3e-3893-4716-9821-c8f7937c8878	KAK RAHMANIAR	85298526083	\N	\N	\N	t	2026-06-26 14:55:10.973415+00	2026-06-26 14:55:10.973415+00	\N	0.00	0.00	0.00	\N	\N
770fa9ba-5aaf-480d-89b6-b152a0592be0	KAK RAHMATAN	82296135546	\N	\N	\N	t	2026-06-26 14:55:10.973415+00	2026-06-26 14:55:10.973415+00	\N	0.00	0.00	0.00	\N	\N
d684909a-b4ea-4de3-9c7e-f72409fb1e72	KAK RANISWAR	82196715901	\N	\N	\N	t	2026-06-26 14:55:10.973415+00	2026-06-26 14:55:10.973415+00	\N	0.00	0.00	0.00	\N	\N
4734d658-7423-4abe-bf5e-d98c8e66a87c	KAK RIDA	82260851820	\N	\N	\N	t	2026-06-26 14:55:10.973415+00	2026-06-26 14:55:10.973415+00	\N	0.00	0.00	0.00	\N	\N
9652a429-08d9-4459-a3f5-24c61b60266b	KAK RISKA	\N	\N	\N	\N	t	2026-06-26 14:55:10.973415+00	2026-06-26 14:55:10.973415+00	\N	0.00	0.00	0.00	\N	\N
b6f606a8-9d3c-48b8-b209-6117bfb4753f	KAK RISKI	81355231423	\N	\N	\N	t	2026-06-26 14:55:10.973415+00	2026-06-26 14:55:10.973415+00	\N	0.00	0.00	0.00	\N	\N
ee180db1-0511-4639-9ba7-ab72f06d788a	KAK ROS	82148238134	\N	\N	\N	t	2026-06-26 14:55:10.973415+00	2026-06-26 14:55:10.973415+00	\N	0.00	0.00	0.00	\N	\N
4ea93c14-5d67-4c1a-97fc-6c8dbf10e6cb	KAK SATRIANI	859196253303	\N	\N	\N	t	2026-06-26 14:55:10.973415+00	2026-06-26 14:55:10.973415+00	\N	0.00	0.00	0.00	\N	\N
e79acee3-6228-4832-b9d8-79e8f897d6cc	KAK SRI	82187619066	\N	\N	\N	t	2026-06-26 14:55:10.973415+00	2026-06-26 14:55:10.973415+00	\N	0.00	0.00	0.00	\N	\N
d78288e5-4a84-4efa-9290-771a7e76d423	KAK SUMARNI	82363868027	\N	\N	\N	t	2026-06-26 14:55:10.973415+00	2026-06-26 14:55:10.973415+00	\N	0.00	0.00	0.00	\N	\N
dafe2135-bcef-404b-b73a-8b69e72706f2	KAK UCY	\N	\N	\N	\N	t	2026-06-26 14:55:10.973415+00	2026-06-26 14:55:10.973415+00	\N	0.00	0.00	0.00	\N	\N
ce831e5c-0e50-470f-ad49-d4af18436760	KAK UFRA	\N	\N	\N	\N	t	2026-06-26 14:55:10.973415+00	2026-06-26 14:55:10.973415+00	\N	0.00	0.00	0.00	\N	\N
89a3456c-6a36-4bad-9b92-c5c1b6d40771	KAK UMMU	82344922552	\N	\N	\N	t	2026-06-26 14:55:10.973415+00	2026-06-26 14:55:10.973415+00	\N	0.00	0.00	0.00	\N	\N
ed305f41-2d99-49d9-a796-8da1bf3815d2	KAK VINA	81347372269	\N	\N	\N	t	2026-06-26 14:55:10.973415+00	2026-06-26 14:55:10.973415+00	\N	0.00	0.00	0.00	\N	\N
4ef7eed5-4f7e-4400-b7db-d5164b303632	KAK WATI	81357548605	\N	\N	\N	t	2026-06-26 14:55:10.973415+00	2026-06-26 14:55:10.973415+00	\N	0.00	0.00	0.00	\N	\N
3f8f7338-4501-4f05-9ded-bf3286ba7e08	KAK ASRIN	89504974783	\N	\N	\N	t	2026-06-26 14:55:10.973415+00	2026-07-16 07:25:41.049325+00	5XT2NSABGW	0.00	0.00	0.00	\N	\N
2da0eb31-9d05-4b80-8b3b-57b43c71ed1e	KAK ERNA	85255422278	\N	\N	\N	t	2026-06-26 14:55:10.973415+00	2026-07-16 07:52:05.52465+00	9RB8RV56PJ	60000.00	55000.00	85000.00	\N	\N
2688e521-b2c2-4d0e-bffa-37946fa5f325	KAK NASIR	82143281509	\N	\N	\N	t	2026-06-26 14:55:10.973415+00	2026-07-16 07:53:21.641551+00	GMWM3R7WGN	0.00	0.00	0.00	\N	\N
c59082b9-b1d7-4c5c-a218-6aac883df51c	KAK FAMMY	85753382071	\N	\N	\N	t	2026-06-26 14:55:10.973415+00	2026-07-16 09:10:22.936861+00	D3U2H5DAQR	0.00	0.00	0.00	\N	\N
dbfa7ed2-f20e-46ab-9ea9-96cf677f0195	KAK KAILA	83863470223	\N	\N	\N	t	2026-06-26 14:55:10.973415+00	2026-07-16 07:54:24.934636+00	JFEKVKGVJW	25000.00	25000.00	0.00	\N	\N
b296e5f9-33ae-44a7-abc9-35a385b0ac1b	KAK FANI	82315096749	\N	\N	\N	t	2026-06-26 14:55:10.973415+00	2026-07-16 09:11:39.627188+00	RQZ5VRFP57	0.00	0.00	0.00	\N	\N
0081aa4f-41f1-4ebf-aa39-33e35654e5c2	KAK FARIDA	89563102792	\N	\N	\N	t	2026-06-26 14:55:10.973415+00	2026-07-16 09:12:13.053202+00	84RMFAJMJF	0.00	0.00	0.00	\N	\N
ec6cae31-d953-4806-af1e-aa1031982918	KAK SALMA	852980885828	\N	\N	\N	t	2026-06-26 14:55:10.973415+00	2026-07-16 09:17:38.159745+00	MN4BLZJB27	0.00	0.00	0.00	\N	\N
c9d9e7b7-60f4-499f-ace5-2318b967ebd6	KAK TANWIR	85212322112	\N	\N	\N	t	2026-06-26 14:55:10.973415+00	2026-07-16 09:18:46.277974+00	3EVRS87FTF	0.00	0.00	0.00	\N	\N
0e959281-3b2a-4f7d-9e08-b3bc8f08b13b	KAK ECY	773507930	\N	\N	\N	t	2026-06-26 14:55:10.973415+00	2026-07-16 10:12:27.439515+00	7C3JUDSXUN	0.00	0.00	0.00	\N	\N
a3b257a5-a534-4832-b45e-46921b32e80f	KAK WIWI	81369703011	\N	\N	\N	t	2026-06-26 14:55:10.973415+00	2026-06-26 14:55:10.973415+00	\N	0.00	0.00	0.00	\N	\N
06531fc8-a503-4e2e-91bd-374a2f8fd7a2	PAMERAN	82378199199	\N	\N	\N	t	2026-06-26 14:55:10.973415+00	2026-06-26 14:55:10.973415+00	\N	0.00	0.00	0.00	\N	\N
2d4d00b3-1aa3-4001-b96d-19808f676b1a	Asdar	089630085814	Bantaeng	Bantaeng	Admin	f	2026-06-26 11:06:00.929492+00	2026-06-26 14:55:44.335142+00	\N	0.00	0.00	0.00	\N	\N
62db9dfc-46e9-4a44-bb84-ced1cf7d86c3	TOKO MASAMBA			Masamba		t	2026-06-26 14:55:10.973415+00	2026-06-30 07:33:07.623561+00	\N	0.00	0.00	0.00	\N	\N
0343e68b-03e2-4d43-86ff-7800e9ef4d52	KAK ANDIN	08291276761				f	2026-06-26 14:55:10.973415+00	2026-06-30 07:25:37.455124+00	\N	0.00	0.00	0.00	\N	\N
bfce7655-c574-4284-a296-827bd39f1007	KAK APLEZ	85351295462	\N	\N	\N	f	2026-06-26 14:55:10.973415+00	2026-07-01 07:40:40.357988+00	\N	0.00	0.00	0.00	\N	\N
57075390-0c4a-4eb6-932e-09636d4378aa	KAK AMERA	02928781781				f	2026-06-26 14:55:10.973415+00	2026-06-29 08:05:15.2434+00	\N	0.00	0.00	0.00	\N	\N
73615e01-4287-4704-8307-5ff50a42060d	TOKO MEGA BARRU	85396468660		Barru		t	2026-06-26 14:55:10.973415+00	2026-06-28 11:00:29.098512+00	\N	0.00	0.00	0.00	\N	\N
c473436e-8df7-48a6-aeec-35a243602253	KAK ARKANIA	\N	\N	\N	\N	t	2026-06-26 14:55:10.973415+00	2026-07-06 06:27:50.197056+00	ZS9M2UWFEG	0.00	0.00	0.00	\N	\N
514917b7-7178-4ed5-9208-86f00daa0411	TOKO BARRU	85340641171	\N	\N	\N	t	2026-06-26 14:55:10.973415+00	2026-06-26 14:55:10.973415+00	\N	0.00	0.00	0.00	\N	\N
bd549621-0fa9-441f-ae32-6a3361057f13	Ardi	082615212321	Pare Pare	Pare Pare	Reseller Pare	f	2026-06-26 13:40:59.86118+00	2026-06-26 14:55:39.048137+00	\N	0.00	0.00	0.00	\N	\N
848a45d8-57d4-4885-a86b-c64d7b3be9db	KAK ALAM	85656566916		Makassar		f	2026-06-26 14:55:10.973415+00	2026-06-29 08:05:12.806291+00	\N	0.00	0.00	0.00	\N	\N
45e07261-1904-4f0c-ad68-771bc70d0411	Sosmed		\N	\N	\N	t	2026-07-02 07:48:50.068383+00	2026-07-02 07:48:50.068383+00	\N	0.00	0.00	0.00	\N	\N
4b9d65b7-191d-4d54-91bf-1f63b6c62417	cs toko		\N	\N	\N	f	2026-07-03 12:48:50.525873+00	2026-07-04 13:15:04.379724+00	\N	0.00	0.00	0.00	\N	\N
6e01862b-8ecc-44a3-9990-cfb78401dd96	KAK MASNA	085258608952				t	2026-07-07 07:30:10.911688+00	2026-07-07 07:30:10.911688+00	\N	0.00	0.00	0.00	\N	\N
771dc959-2a97-493d-9cc1-a32bcf4fd165	KAK RAFINA	085299036299				t	2026-07-07 09:23:53.674019+00	2026-07-07 09:23:53.674019+00	\N	0.00	0.00	0.00	\N	\N
fee6dcc4-4251-4c90-b3ce-6921271c7444	Kak iin	082191326167				t	2026-07-07 09:27:37.368074+00	2026-07-07 09:27:37.368074+00	\N	0.00	0.00	0.00	\N	\N
50aca5d8-0067-4fe1-99e0-21654255e980	Kak Elis sidrap	085846086048	\N	\N	\N	t	2026-07-11 01:54:32.915386+00	2026-07-11 01:54:32.915386+00	\N	0.00	0.00	0.00	\N	\N
8171f9dd-255b-4822-aa54-aeb4ec5becf4	SELVI M	085255801662				t	2026-07-12 03:57:27.831621+00	2026-07-12 03:57:27.831621+00	\N	0.00	0.00	0.00		
6f6a7b40-5387-4bac-9815-c79e31999a05	KAK AMMAR	85242267058				t	2026-06-26 14:55:10.973415+00	2026-07-16 03:00:16.837484+00	BBF2UMKJZR	100000.00	95000.00	105000.00		
e80dbcc5-71e6-484e-be75-ccb91fe04799	KAK ARIF	81228101569	\N	\N	\N	t	2026-06-26 14:55:10.973415+00	2026-07-16 03:33:39.990756+00	AX5KZJBM52	60000.00	55000.00	85000.00	\N	\N
2d42e356-4219-46cc-b62e-6acb53845fdc	KAK RAHMAWATI	85211897142	\N	\N	\N	t	2026-06-26 14:55:10.973415+00	2026-07-16 03:44:52.145753+00	4UTYJ7AZSM	0.00	0.00	0.00	\N	\N
6fabea03-1649-4853-a286-015b38071866	CS TOKO				Tolong dicek bonusnya	t	2026-07-03 12:53:10.535898+00	2026-07-16 06:46:52.519953+00	ZXJ3LFKTW9	0.00	0.00	0.00		
c563651a-caaf-4f2d-82e2-caa0e514f509	KAK ENJEL	85256486464	\N	\N	\N	t	2026-06-26 14:55:10.973415+00	2026-07-16 07:07:32.25511+00	C793KM99SF	50000.00	50000.00	50000.00	\N	\N
0d44b851-aead-4765-bbf0-cb32a8e0c0e9	KAK NINI	85399889991	\N	\N	\N	t	2026-06-26 14:55:10.973415+00	2026-07-16 09:14:56.033986+00	3HKQFD6KNG	0.00	0.00	0.00	\N	\N
528dda68-e05b-48cf-b29d-5ee1c95a64c4	KAK NURLIANTI		\N	\N	\N	t	2026-07-03 05:08:19.613432+00	2026-07-16 09:15:48.362356+00	HUYT6WBUDR	0.00	0.00	0.00	\N	\N
b1440561-acf0-4e0b-bc0f-fffdbde3a1a3	KAK SRI WAHYUNI		\N	\N	\N	t	2026-07-03 13:15:26.132862+00	2026-07-16 09:18:13.764547+00	SE6RWPSQAT	0.00	0.00	0.00	\N	\N
6843890f-e7ea-4314-a5b8-f99ee9e2a6d7	KAK ALAM	087887898787			Kakak Alam Semangatki	t	2026-07-07 04:20:56.587418+00	2026-07-16 09:59:20.952108+00	LZRX34536R	0.00	0.00	0.00		
\.


--
-- Data for Name: tracking_progress; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.tracking_progress (id, penjualan_id, milestone, persentase, catatan, foto_url, created_by, created_at) FROM stdin;
710700b2-b63d-47a0-8b75-8295dde9422d	0220951d-f77f-49a9-ae44-4ea1f576e59f	dikirim	\N	\N	\N	64dc3274-0701-416c-bee5-1c6f831ecf5f	2026-07-05 04:00:00.248898+00
a4522330-0122-490c-bc59-d00fb4a6f7e0	0b24453b-6a12-404f-8341-b6d091bb985c	dikirim	\N	Dikirim	\N	4f192b7f-a33a-4c6e-8857-5649a7665412	2026-07-06 06:27:11.328137+00
70a14565-8ef8-4992-a9cb-a9c833db1aca	0b24453b-6a12-404f-8341-b6d091bb985c	selesai	\N	\N	\N	f1251d4e-a418-4f23-9bbf-86e2661f05f9	2026-07-08 16:30:39.346198+00
7a0ba533-9d10-41a9-b175-97602e3d3705	4bf61dc3-93a7-4f2b-b3c2-2c1780567c68	dikirim	\N	\N	\N	4f192b7f-a33a-4c6e-8857-5649a7665412	2026-07-09 01:31:02.056443+00
29fe6a2d-60c8-482a-8197-92136d001d92	4bf61dc3-93a7-4f2b-b3c2-2c1780567c68	selesai	\N	\N	\N	4f192b7f-a33a-4c6e-8857-5649a7665412	2026-07-09 01:31:10.573043+00
807cde38-2e7b-4075-854c-e52f4d36545e	a7869a6c-9b0e-404c-87ad-e6f17f58e30f	dikirim	\N	\N	\N	4f192b7f-a33a-4c6e-8857-5649a7665412	2026-07-10 02:05:43.220496+00
6146eade-5f4d-4538-a670-6ef7548960ae	a7869a6c-9b0e-404c-87ad-e6f17f58e30f	selesai	\N	\N	\N	4f192b7f-a33a-4c6e-8857-5649a7665412	2026-07-10 02:05:44.887418+00
9ad36d74-c8e3-41c2-bcc1-6d78f9ac07a5	c1f316de-4fcc-4ae3-acf9-f1a81f839b55	dikirim	\N	\N	https://supabase.solvexaerp.tech/storage/v1/object/public/BungaNaik/tracking/c1f316de-4fcc-4ae3-acf9-f1a81f839b55/1783759745749.png	f1251d4e-a418-4f23-9bbf-86e2661f05f9	2026-07-11 08:49:07.075961+00
7d85e73c-8c37-4e80-b2e8-023bb7996a5c	2d082807-2704-442a-a2ab-963355c9e593	dikirim	\N	\N	\N	4f192b7f-a33a-4c6e-8857-5649a7665412	2026-07-11 11:23:13.57569+00
a933a9a9-85c4-4868-9cf8-5daeaf27b012	2d082807-2704-442a-a2ab-963355c9e593	selesai	\N	\N	\N	4f192b7f-a33a-4c6e-8857-5649a7665412	2026-07-11 11:23:23.527192+00
2ab2aaf8-49f7-4a6a-adbc-8941b0e280c4	c1f316de-4fcc-4ae3-acf9-f1a81f839b55	selesai	\N	\N	\N	4f192b7f-a33a-4c6e-8857-5649a7665412	2026-07-11 13:40:14.579443+00
5f0ca44e-473f-49b4-8e47-d1cf73d7d227	e07971a5-6a8a-4f74-a8ff-76c56bc67324	dikirim	\N	\N	https://supabase.solvexaerp.tech/storage/v1/object/public/BungaNaik/tracking/e07971a5-6a8a-4f74-a8ff-76c56bc67324/1783783360788.png	f1251d4e-a418-4f23-9bbf-86e2661f05f9	2026-07-11 15:22:41.353514+00
6cec3116-3f4c-4d31-a939-8acc0b63c2dc	c6d4f560-03a0-43b7-80f2-9998439e57c1	dikirim	\N	\N	https://supabase.solvexaerp.tech/storage/v1/object/public/BungaNaik/tracking/c6d4f560-03a0-43b7-80f2-9998439e57c1/1783784032688.jpg	82604f2e-aaa5-4990-a325-2e9966902e03	2026-07-11 15:34:55.867401+00
c17e090d-bd90-45aa-ae56-854b205a58c5	b5042b42-35a6-4571-9c5f-154e361dab2a	dikirim	\N	\N	https://supabase.solvexaerp.tech/storage/v1/object/public/BungaNaik/tracking/b5042b42-35a6-4571-9c5f-154e361dab2a/1783835089178.jpg	82604f2e-aaa5-4990-a325-2e9966902e03	2026-07-12 05:44:57.578566+00
23e0292c-ce2c-48df-b227-725a3a680d18	b5042b42-35a6-4571-9c5f-154e361dab2a	selesai	\N	\N	https://supabase.solvexaerp.tech/storage/v1/object/public/BungaNaik/tracking/b5042b42-35a6-4571-9c5f-154e361dab2a/1783835127911.jpg	82604f2e-aaa5-4990-a325-2e9966902e03	2026-07-12 05:45:28.887127+00
98a9a0aa-df8f-47d4-adea-49695642076f	f6320716-1003-4f43-9edb-02dc7c71b61f	dikirim	\N	\N	https://supabase.solvexaerp.tech/storage/v1/object/public/BungaNaik/tracking/f6320716-1003-4f43-9edb-02dc7c71b61f/1783835232910.jpg	82604f2e-aaa5-4990-a325-2e9966902e03	2026-07-12 05:47:14.19863+00
87e8ef5c-5949-40f9-8961-a47227ccdf1e	6eb90ac9-2cc2-4542-8f0e-bba3f7c321a5	dikirim	\N	\N	https://supabase.solvexaerp.tech/storage/v1/object/public/BungaNaik/tracking/6eb90ac9-2cc2-4542-8f0e-bba3f7c321a5/1783835312508.jpg	82604f2e-aaa5-4990-a325-2e9966902e03	2026-07-12 05:48:38.385251+00
cce4c005-8e4b-4897-90d9-68ac532fc797	fcec19b5-d203-45dd-abcf-60ee458f6624	dikirim	\N	\N	https://supabase.solvexaerp.tech/storage/v1/object/public/BungaNaik/tracking/fcec19b5-d203-45dd-abcf-60ee458f6624/1783914754100.jpg	82604f2e-aaa5-4990-a325-2e9966902e03	2026-07-13 03:52:38.960572+00
2145d5d6-9eba-4980-87fa-866b06802e4d	26dee3f0-359b-4087-87ef-7fc2ac3f9259	dikirim	\N	\N	https://supabase.solvexaerp.tech/storage/v1/object/public/BungaNaik/tracking/26dee3f0-359b-4087-87ef-7fc2ac3f9259/1783914787647.jpg	82604f2e-aaa5-4990-a325-2e9966902e03	2026-07-13 03:53:12.038569+00
6239baca-a312-4292-a778-804d760e2366	3132178e-478b-423f-931b-663978e078ff	dikirim	\N	\N	https://supabase.solvexaerp.tech/storage/v1/object/public/BungaNaik/tracking/3132178e-478b-423f-931b-663978e078ff/1783914812765.jpg	82604f2e-aaa5-4990-a325-2e9966902e03	2026-07-13 03:53:36.780674+00
11d1c199-a7ca-4772-887b-a0728117af7e	a9a2846a-a5dc-4da5-ba63-1bbc979affc4	dikirim	\N	\N	https://supabase.solvexaerp.tech/storage/v1/object/public/BungaNaik/tracking/a9a2846a-a5dc-4da5-ba63-1bbc979affc4/1783914888376.jpg	82604f2e-aaa5-4990-a325-2e9966902e03	2026-07-13 03:54:50.227949+00
eb9b0f53-14b8-4ed2-b28c-32e634c0d924	70c0c8d3-7fbd-4523-9c4f-337e21e2abff	dikirim	\N	\N	https://supabase.solvexaerp.tech/storage/v1/object/public/BungaNaik/tracking/70c0c8d3-7fbd-4523-9c4f-337e21e2abff/1783933281867.jpg	82604f2e-aaa5-4990-a325-2e9966902e03	2026-07-13 09:01:26.101312+00
e46121bb-6100-431f-9dfa-c185a9ef7fee	70c0c8d3-7fbd-4523-9c4f-337e21e2abff	selesai	\N	\N	\N	4f192b7f-a33a-4c6e-8857-5649a7665412	2026-07-14 08:05:47.927629+00
b4e7ca31-6502-43f4-a9e9-35166b344751	fcec19b5-d203-45dd-abcf-60ee458f6624	selesai	\N	\N	\N	4f192b7f-a33a-4c6e-8857-5649a7665412	2026-07-14 08:06:07.870464+00
22659423-7135-426a-8747-be2164c35123	a9a2846a-a5dc-4da5-ba63-1bbc979affc4	selesai	\N	\N	\N	4f192b7f-a33a-4c6e-8857-5649a7665412	2026-07-14 08:06:50.784855+00
43973953-00b8-4f26-b918-eb8d80aa6ecb	f6320716-1003-4f43-9edb-02dc7c71b61f	selesai	\N	\N	\N	4f192b7f-a33a-4c6e-8857-5649a7665412	2026-07-14 08:07:18.577166+00
8fa0fe5f-50cd-4de3-b121-f6cb735bc82d	c6d4f560-03a0-43b7-80f2-9998439e57c1	selesai	\N	\N	\N	4f192b7f-a33a-4c6e-8857-5649a7665412	2026-07-14 08:07:40.223368+00
bbf340e7-02eb-4a7e-bcd3-65c1fbcb43c3	6eb90ac9-2cc2-4542-8f0e-bba3f7c321a5	selesai	\N	\N	\N	4f192b7f-a33a-4c6e-8857-5649a7665412	2026-07-14 08:07:55.163403+00
000a61e5-d4b2-43f8-b4a6-9e6489447ddf	e07971a5-6a8a-4f74-a8ff-76c56bc67324	selesai	\N	\N	\N	4f192b7f-a33a-4c6e-8857-5649a7665412	2026-07-14 08:08:15.63312+00
afed0074-8488-4d02-bfe0-e8e7fa5482b6	0220951d-f77f-49a9-ae44-4ea1f576e59f	selesai	\N	\N	\N	4f192b7f-a33a-4c6e-8857-5649a7665412	2026-07-14 08:08:30.612238+00
a1c50871-7cde-4a0e-9422-45e62e6bdc17	6a664274-b373-499d-a7a8-aaeff93b639f	dikirim	\N	\N	\N	4f192b7f-a33a-4c6e-8857-5649a7665412	2026-07-14 08:09:25.779352+00
0dd8e286-2818-4f1c-900c-fa4150706462	6a664274-b373-499d-a7a8-aaeff93b639f	selesai	\N	\N	\N	4f192b7f-a33a-4c6e-8857-5649a7665412	2026-07-14 08:09:27.999835+00
a0fb9720-e79a-4756-b3a3-9dcc0487dfb7	e1dd50c5-00d6-4b7c-9d18-0137ba53a4ca	dikirim	\N	\N	\N	4f192b7f-a33a-4c6e-8857-5649a7665412	2026-07-14 08:10:12.759745+00
a313e630-52cf-4136-9c0b-c20123fe3ff4	93b3c33e-2b78-4419-8a87-f4ded55aceb7	dikirim	\N	\N	\N	4f192b7f-a33a-4c6e-8857-5649a7665412	2026-07-14 08:10:31.179814+00
46d4b6e3-8c72-437a-afa6-f6188659f45b	93b3c33e-2b78-4419-8a87-f4ded55aceb7	selesai	\N	\N	\N	4f192b7f-a33a-4c6e-8857-5649a7665412	2026-07-14 08:10:33.746575+00
a31caf80-73e2-4246-abf2-079cc315b86a	40349857-4a5c-444b-b6b5-b543672e341d	dikirim	\N	\N	\N	4f192b7f-a33a-4c6e-8857-5649a7665412	2026-07-14 08:10:53.087235+00
609e064b-dc42-44f0-9141-017806fd5be7	40349857-4a5c-444b-b6b5-b543672e341d	selesai	\N	\N	\N	4f192b7f-a33a-4c6e-8857-5649a7665412	2026-07-14 08:10:54.673471+00
2514b664-6d14-446e-8c68-ecaad5e174d7	c32a696d-08bc-428e-a7f6-dae05c47367a	dikirim	\N	\N	\N	4f192b7f-a33a-4c6e-8857-5649a7665412	2026-07-14 08:11:15.598314+00
00e43f03-784e-4273-8b07-0b5dd759e445	c32a696d-08bc-428e-a7f6-dae05c47367a	selesai	\N	\N	\N	4f192b7f-a33a-4c6e-8857-5649a7665412	2026-07-14 08:11:17.724872+00
d6b9d1ae-d9e8-4d52-addc-82d598f5b63a	62298a25-df7a-47c6-8cc8-7570396c4b32	dikirim	\N	\N	\N	4f192b7f-a33a-4c6e-8857-5649a7665412	2026-07-14 08:11:36.310012+00
4657185b-8799-4467-bdb6-9092e6bbb097	62298a25-df7a-47c6-8cc8-7570396c4b32	selesai	\N	\N	\N	4f192b7f-a33a-4c6e-8857-5649a7665412	2026-07-14 08:11:37.740161+00
a8ebef8d-fc78-45c2-8a26-573f7b6ac14e	6a6ee084-5a30-4830-be83-709bb2ddb06e	dikirim	\N	\N	\N	4f192b7f-a33a-4c6e-8857-5649a7665412	2026-07-14 08:11:54.129686+00
c712304b-c954-45e1-bc13-a340e0d4281a	6a6ee084-5a30-4830-be83-709bb2ddb06e	selesai	\N	\N	\N	4f192b7f-a33a-4c6e-8857-5649a7665412	2026-07-14 08:11:55.661137+00
8bbbb5f8-a89f-4602-b348-2c5dfaa3701b	6346f186-a186-4888-a08f-9834032b2f0d	dikirim	\N	\N	\N	4f192b7f-a33a-4c6e-8857-5649a7665412	2026-07-14 08:12:15.06841+00
8c77dd90-0602-4b0b-80aa-62279f642068	6346f186-a186-4888-a08f-9834032b2f0d	selesai	\N	\N	\N	4f192b7f-a33a-4c6e-8857-5649a7665412	2026-07-14 08:12:16.718741+00
662290df-25a8-4aab-a60e-6fa69b109a98	93bedef9-467f-4cf0-b6cd-02fbfc5a3e1c	dikirim	\N	\N	\N	4f192b7f-a33a-4c6e-8857-5649a7665412	2026-07-14 08:13:25.505825+00
215191e9-3ca8-4b2b-a807-6fb31e76a4d2	93bedef9-467f-4cf0-b6cd-02fbfc5a3e1c	selesai	\N	\N	\N	4f192b7f-a33a-4c6e-8857-5649a7665412	2026-07-14 08:13:27.250352+00
f0d9bcc1-95e0-4ba7-acf7-15a7b8224d40	ad00589c-49e7-4c2b-a74a-8341f59e4e82	dikirim	\N	\N	\N	4f192b7f-a33a-4c6e-8857-5649a7665412	2026-07-14 08:13:59.691445+00
894d0902-9254-43dd-9402-e6868d9f7132	ad00589c-49e7-4c2b-a74a-8341f59e4e82	selesai	\N	\N	\N	4f192b7f-a33a-4c6e-8857-5649a7665412	2026-07-14 08:14:02.177348+00
e396978d-17e9-4dec-b8e1-5dfe3f61f641	dd9f3c81-324e-4730-a3ce-447a5b0a101f	dikirim	\N	\N	\N	4f192b7f-a33a-4c6e-8857-5649a7665412	2026-07-14 08:14:30.508764+00
b42cf3d5-e2a5-48d6-972f-d7152d83f08d	dd9f3c81-324e-4730-a3ce-447a5b0a101f	selesai	\N	\N	\N	4f192b7f-a33a-4c6e-8857-5649a7665412	2026-07-14 08:14:31.955236+00
20a793dd-b0f3-4e00-829d-42bd1e91a117	41f7ca97-334a-498a-a729-6f478fa5d249	dikirim	\N	\N	\N	4f192b7f-a33a-4c6e-8857-5649a7665412	2026-07-14 08:14:56.165345+00
b0c43b80-1a6e-492b-8870-ca395971f316	41f7ca97-334a-498a-a729-6f478fa5d249	selesai	\N	\N	\N	4f192b7f-a33a-4c6e-8857-5649a7665412	2026-07-14 08:14:57.868674+00
f1943fe8-c750-43cb-81a2-fae5e2c9604b	ee983ed9-9a79-4d1c-964d-ff895913bf18	dikirim	\N	\N	\N	4f192b7f-a33a-4c6e-8857-5649a7665412	2026-07-14 08:15:14.853013+00
bf30bd7f-8f17-45be-b100-e549abacf020	ee983ed9-9a79-4d1c-964d-ff895913bf18	selesai	\N	\N	\N	4f192b7f-a33a-4c6e-8857-5649a7665412	2026-07-14 08:15:16.196827+00
b161cabf-8318-4485-8563-5e1b20f48719	b2a87156-5268-4901-a21c-a713b4f91821	dikirim	\N	\N	\N	4f192b7f-a33a-4c6e-8857-5649a7665412	2026-07-14 08:15:28.678209+00
84c59282-2f8b-4e18-bf16-5d5e7811dabc	b2a87156-5268-4901-a21c-a713b4f91821	selesai	\N	\N	\N	4f192b7f-a33a-4c6e-8857-5649a7665412	2026-07-14 08:15:30.103825+00
d6cbaaba-c39e-440f-87c3-36899365e334	4e0e7ab3-2454-474d-bf69-cc28f0f28996	dikirim	\N	\N	\N	4f192b7f-a33a-4c6e-8857-5649a7665412	2026-07-14 08:15:47.177594+00
b6c98fa0-99be-4e9c-857b-497f4ac98242	4e0e7ab3-2454-474d-bf69-cc28f0f28996	selesai	\N	\N	\N	4f192b7f-a33a-4c6e-8857-5649a7665412	2026-07-14 08:15:49.912466+00
f50952c9-d6e8-47e8-90d4-821bda61e36a	45549a4f-0075-43d1-8772-fef88ba1d0d4	dikirim	\N	\N	\N	4f192b7f-a33a-4c6e-8857-5649a7665412	2026-07-14 08:16:43.130812+00
63f6859c-4d69-4e1e-8a27-803b4f45c536	45549a4f-0075-43d1-8772-fef88ba1d0d4	selesai	\N	\N	\N	4f192b7f-a33a-4c6e-8857-5649a7665412	2026-07-14 08:16:44.484036+00
27b46d47-5dc4-4bd0-a575-0605e21231e3	69f11956-9f1f-4618-89b6-44ddba45fca8	dikirim	\N	\N	\N	4f192b7f-a33a-4c6e-8857-5649a7665412	2026-07-14 08:17:03.215678+00
61b27b5d-7206-417c-ac09-5bc57cb454de	69f11956-9f1f-4618-89b6-44ddba45fca8	selesai	\N	\N	\N	4f192b7f-a33a-4c6e-8857-5649a7665412	2026-07-14 08:17:05.475891+00
253fdd89-b93a-4bbb-81e4-0906ca32805c	e200df92-5876-4bb2-96cf-7f1e944cc134	dikirim	\N	\N	\N	4f192b7f-a33a-4c6e-8857-5649a7665412	2026-07-14 08:17:24.815476+00
e154ed12-3d87-4773-b96d-e76e3bc7e66a	e200df92-5876-4bb2-96cf-7f1e944cc134	selesai	\N	\N	\N	4f192b7f-a33a-4c6e-8857-5649a7665412	2026-07-14 08:17:26.473855+00
efeeb1e8-16a3-43e4-b3f4-29f3eae52fc6	3eb6c9be-4ffc-4d0f-9a96-ee4dc1d0630e	dikirim	\N	\N	\N	4f192b7f-a33a-4c6e-8857-5649a7665412	2026-07-14 10:07:43.130075+00
1fb56a43-48b7-44fd-a172-1c005ed08cac	3eb6c9be-4ffc-4d0f-9a96-ee4dc1d0630e	selesai	\N	\N	\N	4f192b7f-a33a-4c6e-8857-5649a7665412	2026-07-14 10:07:44.574387+00
f821517f-3ac7-4448-aea5-e28e2d431c16	3132178e-478b-423f-931b-663978e078ff	selesai	\N	\N	\N	4f192b7f-a33a-4c6e-8857-5649a7665412	2026-07-14 12:11:55.779774+00
ae6d1d12-58d4-4b30-8846-61ac4296a89f	e1dd50c5-00d6-4b7c-9d18-0137ba53a4ca	selesai	\N	\N	\N	4f192b7f-a33a-4c6e-8857-5649a7665412	2026-07-14 12:13:02.866261+00
e40bf0ea-5463-4730-9a34-36806a831aea	0a7083a8-130c-4b7e-875c-8d142ea8f416	dikirim	\N	\N	\N	82604f2e-aaa5-4990-a325-2e9966902e03	2026-07-14 12:54:59.635995+00
be221a38-db8d-4d3f-a6a7-6b0b55c5a471	0a7083a8-130c-4b7e-875c-8d142ea8f416	selesai	\N	\N	\N	82604f2e-aaa5-4990-a325-2e9966902e03	2026-07-14 12:55:10.005742+00
c8672180-a88c-4bdd-a4b0-ea11acc78d3d	ddd28a81-2837-4bae-a431-b639d4c768a2	dikirim	\N	Barang siap untuk dikirim	https://supabase.solvexaerp.tech/storage/v1/object/public/BungaNaik/tracking/ddd28a81-2837-4bae-a431-b639d4c768a2/1783492420283.jpeg	64dc3274-0701-416c-bee5-1c6f831ecf5f	2026-07-08 06:33:42.384191+00
394921fc-5a9f-46b7-9426-770a1c863dd6	ddd28a81-2837-4bae-a431-b639d4c768a2	selesai	\N	Barang Selesai	https://supabase.solvexaerp.tech/storage/v1/object/public/BungaNaik/tracking/ddd28a81-2837-4bae-a431-b639d4c768a2/1783492782900.png	64dc3274-0701-416c-bee5-1c6f831ecf5f	2026-07-08 06:39:44.559704+00
537d8351-6971-4507-8a99-b7137266add5	aa5c53a8-54e0-4628-94a6-0c50a6681163	dikirim	\N	\N	\N	4f192b7f-a33a-4c6e-8857-5649a7665412	2026-07-16 11:20:56.00441+00
bb647e19-c849-49ba-b600-7be2d54364e6	aa5c53a8-54e0-4628-94a6-0c50a6681163	selesai	\N	\N	\N	4f192b7f-a33a-4c6e-8857-5649a7665412	2026-07-16 11:20:57.503532+00
\.


--
-- Name: audit_log audit_log_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.audit_log
    ADD CONSTRAINT audit_log_pkey PRIMARY KEY (id);


--
-- Name: mutasi_stok mutasi_stok_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.mutasi_stok
    ADD CONSTRAINT mutasi_stok_pkey PRIMARY KEY (id);


--
-- Name: owner_reminders owner_reminders_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.owner_reminders
    ADD CONSTRAINT owner_reminders_pkey PRIMARY KEY (id);


--
-- Name: penjualan_item penjualan_item_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.penjualan_item
    ADD CONSTRAINT penjualan_item_pkey PRIMARY KEY (id);


--
-- Name: penjualan penjualan_nomor_faktur_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.penjualan
    ADD CONSTRAINT penjualan_nomor_faktur_key UNIQUE (nomor_faktur);


--
-- Name: penjualan penjualan_nomor_resi_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.penjualan
    ADD CONSTRAINT penjualan_nomor_resi_key UNIQUE (nomor_resi);


--
-- Name: penjualan_pembayaran penjualan_pembayaran_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.penjualan_pembayaran
    ADD CONSTRAINT penjualan_pembayaran_pkey PRIMARY KEY (id);


--
-- Name: penjualan penjualan_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.penjualan
    ADD CONSTRAINT penjualan_pkey PRIMARY KEY (id);


--
-- Name: produk_foto produk_foto_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.produk_foto
    ADD CONSTRAINT produk_foto_pkey PRIMARY KEY (id);


--
-- Name: produk produk_nama_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.produk
    ADD CONSTRAINT produk_nama_unique UNIQUE (nama);


--
-- Name: produk produk_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.produk
    ADD CONSTRAINT produk_pkey PRIMARY KEY (id);


--
-- Name: purchase_order_items purchase_order_items_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.purchase_order_items
    ADD CONSTRAINT purchase_order_items_pkey PRIMARY KEY (id);


--
-- Name: purchase_orders purchase_orders_nomor_po_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.purchase_orders
    ADD CONSTRAINT purchase_orders_nomor_po_key UNIQUE (nomor_po);


--
-- Name: purchase_orders purchase_orders_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.purchase_orders
    ADD CONSTRAINT purchase_orders_pkey PRIMARY KEY (id);


--
-- Name: reseller_reviews reseller_reviews_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.reseller_reviews
    ADD CONSTRAINT reseller_reviews_pkey PRIMARY KEY (id);


--
-- Name: resellers resellers_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.resellers
    ADD CONSTRAINT resellers_pkey PRIMARY KEY (id);


--
-- Name: resellers resellers_token_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.resellers
    ADD CONSTRAINT resellers_token_key UNIQUE (token);


--
-- Name: tracking_progress tracking_progress_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tracking_progress
    ADD CONSTRAINT tracking_progress_pkey PRIMARY KEY (id);


--
-- Name: idx_penjualan_nomor_resi; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_penjualan_nomor_resi ON public.penjualan USING btree (nomor_resi);


--
-- Name: idx_reseller_reviews_penjualan; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_reseller_reviews_penjualan ON public.reseller_reviews USING btree (penjualan_id);


--
-- Name: penjualan set_nomor_faktur; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER set_nomor_faktur BEFORE INSERT ON public.penjualan FOR EACH ROW EXECUTE FUNCTION public.generate_nomor_faktur();


--
-- Name: penjualan update_penjualan_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_penjualan_updated_at BEFORE UPDATE ON public.penjualan FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();


--
-- Name: produk update_produk_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_produk_updated_at BEFORE UPDATE ON public.produk FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();


--
-- Name: resellers update_resellers_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_resellers_updated_at BEFORE UPDATE ON public.resellers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();


--
-- Name: audit_log audit_log_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.audit_log
    ADD CONSTRAINT audit_log_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id);


--
-- Name: mutasi_stok mutasi_stok_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.mutasi_stok
    ADD CONSTRAINT mutasi_stok_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id);


--
-- Name: mutasi_stok mutasi_stok_produk_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.mutasi_stok
    ADD CONSTRAINT mutasi_stok_produk_id_fkey FOREIGN KEY (produk_id) REFERENCES public.produk(id) ON DELETE CASCADE;


--
-- Name: owner_reminders owner_reminders_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.owner_reminders
    ADD CONSTRAINT owner_reminders_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id);


--
-- Name: penjualan penjualan_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.penjualan
    ADD CONSTRAINT penjualan_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id);


--
-- Name: penjualan penjualan_dicocokkan_oleh_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.penjualan
    ADD CONSTRAINT penjualan_dicocokkan_oleh_fkey FOREIGN KEY (dicocokkan_oleh) REFERENCES public.profiles(id);


--
-- Name: penjualan_item penjualan_item_penjualan_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.penjualan_item
    ADD CONSTRAINT penjualan_item_penjualan_id_fkey FOREIGN KEY (penjualan_id) REFERENCES public.penjualan(id) ON DELETE CASCADE;


--
-- Name: penjualan_item penjualan_item_produk_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.penjualan_item
    ADD CONSTRAINT penjualan_item_produk_id_fkey FOREIGN KEY (produk_id) REFERENCES public.produk(id);


--
-- Name: penjualan_pembayaran penjualan_pembayaran_penjualan_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.penjualan_pembayaran
    ADD CONSTRAINT penjualan_pembayaran_penjualan_id_fkey FOREIGN KEY (penjualan_id) REFERENCES public.penjualan(id) ON DELETE CASCADE;


--
-- Name: penjualan penjualan_po_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.penjualan
    ADD CONSTRAINT penjualan_po_id_fkey FOREIGN KEY (po_id) REFERENCES public.purchase_orders(id);


--
-- Name: penjualan penjualan_reseller_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.penjualan
    ADD CONSTRAINT penjualan_reseller_id_fkey FOREIGN KEY (reseller_id) REFERENCES public.resellers(id);


--
-- Name: produk_foto produk_foto_produk_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.produk_foto
    ADD CONSTRAINT produk_foto_produk_id_fkey FOREIGN KEY (produk_id) REFERENCES public.produk(id) ON DELETE CASCADE;


--
-- Name: purchase_order_items purchase_order_items_po_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.purchase_order_items
    ADD CONSTRAINT purchase_order_items_po_id_fkey FOREIGN KEY (po_id) REFERENCES public.purchase_orders(id) ON DELETE CASCADE;


--
-- Name: purchase_order_items purchase_order_items_produk_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.purchase_order_items
    ADD CONSTRAINT purchase_order_items_produk_id_fkey FOREIGN KEY (produk_id) REFERENCES public.produk(id);


--
-- Name: purchase_orders purchase_orders_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.purchase_orders
    ADD CONSTRAINT purchase_orders_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id);


--
-- Name: purchase_orders purchase_orders_reseller_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.purchase_orders
    ADD CONSTRAINT purchase_orders_reseller_id_fkey FOREIGN KEY (reseller_id) REFERENCES public.resellers(id);


--
-- Name: reseller_reviews reseller_reviews_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.reseller_reviews
    ADD CONSTRAINT reseller_reviews_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id);


--
-- Name: reseller_reviews reseller_reviews_penjualan_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.reseller_reviews
    ADD CONSTRAINT reseller_reviews_penjualan_id_fkey FOREIGN KEY (penjualan_id) REFERENCES public.penjualan(id) ON DELETE CASCADE;


--
-- Name: reseller_reviews reseller_reviews_reseller_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.reseller_reviews
    ADD CONSTRAINT reseller_reviews_reseller_id_fkey FOREIGN KEY (reseller_id) REFERENCES public.resellers(id);


--
-- Name: tracking_progress tracking_progress_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tracking_progress
    ADD CONSTRAINT tracking_progress_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id);


--
-- Name: tracking_progress tracking_progress_penjualan_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tracking_progress
    ADD CONSTRAINT tracking_progress_penjualan_id_fkey FOREIGN KEY (penjualan_id) REFERENCES public.penjualan(id) ON DELETE CASCADE;


--
-- Name: produk anon_read_produk_aktif; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY anon_read_produk_aktif ON public.produk FOR SELECT TO anon USING ((aktif = true));


--
-- Name: produk_foto anon_read_produk_foto; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY anon_read_produk_foto ON public.produk_foto FOR SELECT TO anon USING (true);


--
-- Name: tracking_progress anon_read_tracking; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY anon_read_tracking ON public.tracking_progress FOR SELECT TO anon USING (true);


--
-- Name: audit_log; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

--
-- Name: purchase_order_items auth_access; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY auth_access ON public.purchase_order_items TO authenticated USING ((auth.uid() IS NOT NULL)) WITH CHECK ((auth.uid() IS NOT NULL));


--
-- Name: purchase_orders auth_access; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY auth_access ON public.purchase_orders TO authenticated USING ((auth.uid() IS NOT NULL)) WITH CHECK ((auth.uid() IS NOT NULL));


--
-- Name: audit_log auth_all_audit_log; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY auth_all_audit_log ON public.audit_log USING ((auth.uid() IS NOT NULL));


--
-- Name: owner_reminders auth_all_owner_reminders; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY auth_all_owner_reminders ON public.owner_reminders USING ((auth.uid() IS NOT NULL));


--
-- Name: produk_foto auth_all_produk_foto; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY auth_all_produk_foto ON public.produk_foto USING ((auth.uid() IS NOT NULL));


--
-- Name: purchase_order_items auth_all_purchase_order_items; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY auth_all_purchase_order_items ON public.purchase_order_items USING ((auth.uid() IS NOT NULL));


--
-- Name: purchase_orders auth_all_purchase_orders; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY auth_all_purchase_orders ON public.purchase_orders USING ((auth.uid() IS NOT NULL));


--
-- Name: reseller_reviews auth_all_reseller_reviews; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY auth_all_reseller_reviews ON public.reseller_reviews USING ((auth.uid() IS NOT NULL));


--
-- Name: tracking_progress auth_all_tracking; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY auth_all_tracking ON public.tracking_progress USING ((auth.uid() IS NOT NULL));


--
-- Name: mutasi_stok mutasi_all; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY mutasi_all ON public.mutasi_stok USING ((auth.uid() IS NOT NULL));


--
-- Name: mutasi_stok; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.mutasi_stok ENABLE ROW LEVEL SECURITY;

--
-- Name: owner_reminders; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.owner_reminders ENABLE ROW LEVEL SECURITY;

--
-- Name: penjualan_pembayaran pembayaran_all; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY pembayaran_all ON public.penjualan_pembayaran USING ((auth.uid() IS NOT NULL));


--
-- Name: penjualan; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.penjualan ENABLE ROW LEVEL SECURITY;

--
-- Name: penjualan penjualan_all; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY penjualan_all ON public.penjualan USING ((auth.uid() IS NOT NULL));


--
-- Name: penjualan_item; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.penjualan_item ENABLE ROW LEVEL SECURITY;

--
-- Name: penjualan_item penjualan_item_all; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY penjualan_item_all ON public.penjualan_item USING ((auth.uid() IS NOT NULL));


--
-- Name: penjualan_item penjualan_item_service_role; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY penjualan_item_service_role ON public.penjualan_item TO service_role USING (true) WITH CHECK (true);


--
-- Name: penjualan_pembayaran; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.penjualan_pembayaran ENABLE ROW LEVEL SECURITY;

--
-- Name: produk; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.produk ENABLE ROW LEVEL SECURITY;

--
-- Name: produk produk_all; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY produk_all ON public.produk USING ((auth.uid() IS NOT NULL));


--
-- Name: produk_foto; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.produk_foto ENABLE ROW LEVEL SECURITY;

--
-- Name: purchase_order_items; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.purchase_order_items ENABLE ROW LEVEL SECURITY;

--
-- Name: purchase_orders; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.purchase_orders ENABLE ROW LEVEL SECURITY;

--
-- Name: reseller_reviews; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.reseller_reviews ENABLE ROW LEVEL SECURITY;

--
-- Name: resellers; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.resellers ENABLE ROW LEVEL SECURITY;

--
-- Name: resellers resellers_all; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY resellers_all ON public.resellers USING ((auth.uid() IS NOT NULL));


--
-- Name: tracking_progress; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.tracking_progress ENABLE ROW LEVEL SECURITY;

--
-- Name: TABLE audit_log; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.audit_log TO anon;
GRANT ALL ON TABLE public.audit_log TO authenticated;
GRANT ALL ON TABLE public.audit_log TO service_role;


--
-- Name: TABLE mutasi_stok; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.mutasi_stok TO anon;
GRANT ALL ON TABLE public.mutasi_stok TO authenticated;
GRANT ALL ON TABLE public.mutasi_stok TO service_role;


--
-- Name: TABLE owner_reminders; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.owner_reminders TO anon;
GRANT ALL ON TABLE public.owner_reminders TO authenticated;
GRANT ALL ON TABLE public.owner_reminders TO service_role;


--
-- Name: TABLE penjualan; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.penjualan TO anon;
GRANT ALL ON TABLE public.penjualan TO authenticated;
GRANT ALL ON TABLE public.penjualan TO service_role;


--
-- Name: TABLE penjualan_item; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.penjualan_item TO anon;
GRANT ALL ON TABLE public.penjualan_item TO authenticated;
GRANT ALL ON TABLE public.penjualan_item TO service_role;


--
-- Name: TABLE penjualan_pembayaran; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.penjualan_pembayaran TO anon;
GRANT ALL ON TABLE public.penjualan_pembayaran TO authenticated;
GRANT ALL ON TABLE public.penjualan_pembayaran TO service_role;


--
-- Name: TABLE produk; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.produk TO anon;
GRANT ALL ON TABLE public.produk TO authenticated;
GRANT ALL ON TABLE public.produk TO service_role;


--
-- Name: TABLE produk_foto; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.produk_foto TO anon;
GRANT ALL ON TABLE public.produk_foto TO authenticated;
GRANT ALL ON TABLE public.produk_foto TO service_role;


--
-- Name: TABLE purchase_order_items; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.purchase_order_items TO anon;
GRANT ALL ON TABLE public.purchase_order_items TO authenticated;
GRANT ALL ON TABLE public.purchase_order_items TO service_role;


--
-- Name: TABLE purchase_orders; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.purchase_orders TO anon;
GRANT ALL ON TABLE public.purchase_orders TO authenticated;
GRANT ALL ON TABLE public.purchase_orders TO service_role;


--
-- Name: TABLE reseller_reviews; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.reseller_reviews TO anon;
GRANT ALL ON TABLE public.reseller_reviews TO authenticated;
GRANT ALL ON TABLE public.reseller_reviews TO service_role;


--
-- Name: TABLE resellers; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.resellers TO anon;
GRANT ALL ON TABLE public.resellers TO authenticated;
GRANT ALL ON TABLE public.resellers TO service_role;


--
-- Name: TABLE tracking_progress; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.tracking_progress TO anon;
GRANT ALL ON TABLE public.tracking_progress TO authenticated;
GRANT ALL ON TABLE public.tracking_progress TO service_role;


--
-- PostgreSQL database dump complete
--

\unrestrict OKc3mN8naMLK2G8r6QISpE3vip8qVSL1Tj647MPFt4OtBs2N40gXAV9g9fYGSb7

