import type { UmkmListing, VillageInfo } from '../types/umkm';

export interface ImagePreset {
  label: string;
  url: string;
}

export const UMKM_IMAGE_PRESETS: ImagePreset[] = [
  {
    label: 'Gula Aren & Kemasan Kaca',
    url: '/src/assets/images/prod_gula_aren_1795525158657.jpg',
  },
  {
    label: 'Sale Pisang & Keripik Kuliner',
    url: '/src/assets/images/prod_sale_pisang_1795525159243.jpg',
  },
  {
    label: 'Anyaman Bambu & Kerajinan',
    url: '/src/assets/images/prod_anyaman_bambu_1795525159061.jpg',
  },
  {
    label: 'Kain Batik & Busana Daerah',
    url: '/src/assets/images/prod_batik_ciamis_1795525160680.jpg',
  },
  {
    label: 'Kopi Sangrai & Hasil Bumi',
    url: '/src/assets/images/prod_kopi_cisaga_1795525161174.jpg',
  },
  {
    label: 'Paket Hantaran & Etalase Sentra',
    url: '/src/assets/images/hero_cisaga_umkm_1795525158488.jpg',
  },
];

export const CISAGA_VILLAGES: VillageInfo[] = [
  {
    name: 'Desa Cisaga',
    commodityFocus: 'Pusat Pemerintahan Kec. · Kuliner & Hantaran',
    description:
      'Pusat pemerintahan Kecamatan Cisaga sekaligus etalase bersama produk olahan pangan, bingkisan oleh-oleh daerah, dan pusat temu mitra usaha lokal.',
    baseUmkmCount: 12,
    coordinatesLabel: '7°20′S 108°30′E',
  },
  {
    name: 'Desa Bangunharja',
    commodityFocus: 'Gula Aren Organik & Olahan Nira',
    description:
      'Sentra penderes nira aren lereng perbukitan yang memproduksi gula semut kristal dan gula aren cetak alami khas Cisaga.',
    baseUmkmCount: 9,
    coordinatesLabel: '7°19′S 108°31′E',
  },
  {
    name: 'Desa Danasari',
    commodityFocus: 'Pangan Olahan & Hasil Pertanian',
    description:
      'Sentra usaha rumahan pengolah aneka keripik singkong, rengginang, serta hasil pertanian segar yang dipasarkan ke pasar rakyat Cisaga.',
    baseUmkmCount: 5,
    coordinatesLabel: '7°21′S 108°30′E',
  },
  {
    name: 'Desa Girimukti',
    commodityFocus: 'Komoditas Perbukitan & Kriya Kayu',
    description:
      'Kawasan perbukitan hijau dengan potensi hasil kebun, olahan rempah tradisional, serta kerajinan perkakas kayu dan bambu.',
    baseUmkmCount: 5,
    coordinatesLabel: '7°18′S 108°32′E',
  },
  {
    name: 'Desa Karyamulya',
    commodityFocus: 'Kuliner Tradisional & Jasa Kreatif',
    description:
      'Sentra pelaku kuliner tradisional, kue basah, serta usaha konveksi dan jasa kreatif keluarga di koridor timur Cisaga.',
    baseUmkmCount: 6,
    coordinatesLabel: '7°20′S 108°32′E',
  },
  {
    name: 'Desa Kepel',
    commodityFocus: 'Kopi Lokal & Hasil Perkebunan',
    description:
      'Kelompok tani dan penyangrai kopi rakyat dataran tinggi Cisaga dengan proses pascapanen natural dan semi-washed.',
    baseUmkmCount: 6,
    coordinatesLabel: '7°18′S 108°28′E',
  },
  {
    name: 'Desa Mekarmukti',
    commodityFocus: 'Batik Ciamisan & Wastra Lokal',
    description:
      'Kelompok pembatik tulis dan cap bermotif flora lokal seperti daun sukun, rereng parang, serta corak khas tatar Galuh.',
    baseUmkmCount: 6,
    coordinatesLabel: '7°20′S 108°33′E',
  },
  {
    name: 'Desa Sidamulya',
    commodityFocus: 'Agribisnis Terpadu & Olahan Pangan',
    description:
      'Desa agraris dengan penggerak UMKM olahan hasil kebun, madu ternak, dan usaha pangan kemasan untuk oleh-oleh daerah.',
    baseUmkmCount: 5,
    coordinatesLabel: '7°21′S 108°32′E',
  },
  {
    name: 'Desa Sukahurip',
    commodityFocus: 'Beras Lokal, Jamur & Kuliner Desa',
    description:
      'Sentra pertanian produktif penghasil beras sehat, budidaya jamur tiram, dan aneka olahan camilan kering skala rumah tangga.',
    baseUmkmCount: 5,
    coordinatesLabel: '7°19′S 108°29′E',
  },
  {
    name: 'Desa Tanjungjaya',
    commodityFocus: 'Anyaman Bambu & Kriya Rumah Tangga',
    description:
      'Komunitas pengrajin turun-temurun penghasil besek, nampan saji, kap lampu, dan keranjang bambu dengan anyaman halus bernilai ekspor.',
    baseUmkmCount: 8,
    coordinatesLabel: '7°21′S 108°29′E',
  },
  {
    name: 'Desa Wangunjaya',
    commodityFocus: 'Sale Pisang Asap & Camilan Tradisional',
    description:
      'Sentra pengolahan pisang ambon dan pisang siem menjadi sale asap renyah serta aneka keripik khas Priangan Timur.',
    baseUmkmCount: 7,
    coordinatesLabel: '7°22′S 108°31′E',
  },
];

export const INITIAL_UMKM_LISTINGS: UmkmListing[] = [
  {
    id: 'gula-aren-bangunharja',
    businessName: 'KUB Nira Lestari',
    ownerName: 'H. Dadang Kurniawan',
    productName: 'Gula Aren Semut & Cetak Bangunharja',
    category: 'Agribisnis',
    village: 'Desa Bangunharja',
    whatsapp: '081322450112',
    tier: 'premium',
    status: 'Aktif',
    price: 24000,
    unitLabel: 'Toples Semut 250g',
    shortDescription:
      'Nira aren murni lereng Bangunharja dengan aroma karamel alami tanpa campuran.',
    fullDescription:
      'Dipanen setiap pagi oleh petani penderes Desa Bangunharja dan diolah higienis menggunakan wajan tradisional. Terbuka untuk pembelian eceran, pasokan kedai kopi, maupun kemitraan reseller.',
    image: '/src/assets/images/prod_gula_aren_1795525158657.jpg',
    createdAt: '2026-09-10',
    variants: [
      { id: 'ga-250', label: 'Toples Semut 250g', price: 24000, availabilityNote: 'Produksi Harian' },
      { id: 'ga-500', label: 'Toples Semut 500g', price: 45000, availabilityNote: 'Siap Kirim' },
      { id: 'ga-cetak', label: 'Cetak Daun 1 kg', price: 52000, availabilityNote: 'Siap Kirim' },
    ],
  },
  {
    id: 'batik-ciamis-mekarmukti',
    businessName: 'Batik Galuh Mekar',
    ownerName: 'Rina Rahmawati',
    productName: 'Kain Batik Cap Motif Rereng Sukun',
    category: 'Busana',
    village: 'Desa Mekarmukti',
    whatsapp: '081224903371',
    tier: 'premium',
    status: 'Aktif',
    price: 165000,
    unitLabel: 'Lembaran 200 × 115 cm',
    shortDescription:
      'Katun primisima halus dengan pewarnaan hijau rimba dan sogan khas Priangan.',
    fullDescription:
      'Motif rereng daun sukun dan sulur Galuh dicap dengan malam lebah alami di Desa Mekarmukti. Tersedia untuk seragam instansi, komunitas, maupun busana acara resmi.',
    image: '/src/assets/images/prod_batik_ciamis_1795525160680.jpg',
    createdAt: '2026-09-14',
    variants: [
      { id: 'bt-200', label: 'Lembaran 200 × 115 cm', price: 165000, availabilityNote: 'Siap Kirim' },
      { id: 'bt-250', label: 'Lembaran Premium 250 × 115 cm', price: 210000, availabilityNote: 'Stok Terbatas' },
    ],
  },
  {
    id: 'hampers-karya-cisaga',
    businessName: 'Sentra Promosi CISAGA HUB',
    ownerName: 'Yanti Suryani',
    productName: 'Paket Hantaran Karya Asli Cisaga',
    category: 'Kuliner',
    village: 'Desa Cisaga',
    whatsapp: '081395661402',
    tier: 'premium',
    status: 'Aktif',
    price: 145000,
    unitLabel: 'Paket Reguler (3 Produk)',
    shortDescription:
      'Keranjang bambu berisi kopi Kepel, gula semut Bangunharja, dan sale Wangunjaya.',
    fullDescription:
      'Kolaborasi lintas pelaku UMKM binaan Kecamatan Cisaga untuk bingkisan tamu kedinasan, suvenir kegiatan, maupun oleh-oleh keluarga dalam kemasan anyaman bambu.',
    image: '/src/assets/images/hero_cisaga_umkm_1795525158488.jpg',
    createdAt: '2026-09-18',
    variants: [
      { id: 'hm-reg', label: 'Paket Reguler (3 Produk)', price: 145000, availabilityNote: 'Siap Dipesan' },
      { id: 'hm-eks', label: 'Paket Eksklusif (+ Selendang Batik)', price: 285000, availabilityNote: 'Pre-order 2 Hari' },
    ],
  },
  {
    id: 'sale-pisang-wangunjaya',
    businessName: 'Dapur Ibu Enok',
    ownerName: 'Enok Suryati',
    productName: 'Sale Pisang Asap Renyah Wangunjaya',
    category: 'Kuliner',
    village: 'Desa Wangunjaya',
    whatsapp: '085223819044',
    tier: 'reguler',
    status: 'Aktif',
    price: 18000,
    unitLabel: 'Kemasan 200g',
    shortDescription:
      'Pisang pilihan diasap tradisional lalu dipanggang hingga manis legit dan renyah.',
    fullDescription:
      'Dibuat dari pisang siem matang pohon tanpa pemanis buatan. Proses pengasapan kayu rambutan menjaga tekstur kenyal sekaligus renyah di bagian luar, cocok untuk oleh-oleh khas Cisaga.',
    image: '/src/assets/images/prod_sale_pisang_1795525159243.jpg',
    createdAt: '2026-10-02',
    variants: [
      { id: 'sp-200', label: 'Kemasan 200g', price: 18000, availabilityNote: 'Siap Kirim' },
      { id: 'sp-450', label: 'Kemasan Keluarga 450g', price: 36000, availabilityNote: 'Siap Kirim' },
    ],
  },
  {
    id: 'anyaman-bambu-tanjungjaya',
    businessName: 'Sanggar Kriya Sauyunan',
    ownerName: 'Ujang Komara',
    productName: 'Nampan & Kap Lampu Anyaman Bambu Tali',
    category: 'Kerajinan',
    village: 'Desa Tanjungjaya',
    whatsapp: '082117648830',
    tier: 'reguler',
    status: 'Aktif',
    price: 78000,
    unitLabel: 'Nampan Saji 32cm',
    shortDescription:
      'Anyaman bambu tali pilihan dengan finishing vernis aman pangan dan tahan lembap.',
    fullDescription:
      'Setiap bilah bambu diserut manual hingga seragam oleh pengrajin senior Desa Tanjungjaya. Menerima pesanan satuan maupun pengadaan dekorasi kafe, hotel, dan suvenir acara.',
    image: '/src/assets/images/prod_anyaman_bambu_1795525159061.jpg',
    createdAt: '2026-10-05',
    variants: [
      { id: 'ab-nampan', label: 'Nampan Saji 32cm', price: 78000, availabilityNote: 'Siap Kirim' },
      { id: 'ab-kap', label: 'Kap Lampu Silinder', price: 135000, availabilityNote: 'Pre-order 3 Hari' },
      { id: 'ab-set', label: 'Set Nampan + Kap Lampu', price: 198000, availabilityNote: 'Pre-order 4 Hari' },
    ],
  },
  {
    id: 'kopi-kepel-cisaga',
    businessName: 'Roastery Tani Kepel',
    ownerName: 'Asep Herdiana',
    productName: 'Kopi Robusta & Arabika Sangrai Kepel',
    category: 'Agribisnis',
    village: 'Desa Kepel',
    whatsapp: '085314772209',
    tier: 'reguler',
    status: 'Aktif',
    price: 58000,
    unitLabel: 'Biji Utuh 250g',
    shortDescription:
      'Biji kopi petik merah dataran tinggi Kepel dengan profil sangrai medium-dark.',
    fullDescription:
      'Menghadirkan cita rasa cokelat hitam, gula aren, dan keasaman lembut khas kebun rakyat Desa Kepel. Tersedia untuk penikmat rumahan dan pasokan kedai kopi.',
    image: '/src/assets/images/prod_kopi_cisaga_1795525161174.jpg',
    createdAt: '2026-10-12',
    variants: [
      { id: 'kp-biji', label: 'Biji Utuh 250g', price: 58000, availabilityNote: 'Fresh Roast' },
      { id: 'kp-halus', label: 'Giling Tubruk Halus 250g', price: 58000, availabilityNote: 'Fresh Roast' },
      { id: 'kp-v60', label: 'Giling Sedang Pour-Over 250g', price: 62000, availabilityNote: 'Fresh Roast' },
    ],
  },
];
