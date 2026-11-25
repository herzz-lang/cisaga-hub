import type { UmkmListing, VillageInfo } from '../types/umkm';

export interface CisagaProfileSlide {
  id: string;
  indexLabel: string;
  shortLabel: string;
  title: string;
  subtitle: string;
  description: string;
  coordinatesLabel: string;
  umkmCount: number;
  featuredSector: string;
  image: string;
  imageAlt: string;
  villageFilterTarget: string | null;
}

const VILLAGE_SLIDE_MEDIA: Record<string, { image: string; shortLabel: string; sector: string }> = {
  'Desa Cisaga': {
    image: '/src/assets/images/hero_cisaga_umkm_1795525158488.jpg',
    shortLabel: 'Ds. Cisaga',
    sector: 'Pusat Kec. & Hantaran',
  },
  'Desa Bangunharja': {
    image: '/src/assets/images/prod_gula_aren_1795525158657.jpg',
    shortLabel: 'Bangunharja',
    sector: 'Gula Aren & Agribisnis',
  },
  'Desa Danasari': {
    image: '/src/assets/images/prod_sale_pisang_1795525159243.jpg',
    shortLabel: 'Danasari',
    sector: 'Pangan & Pertanian',
  },
  'Desa Girimukti': {
    image: '/src/assets/images/wilayah_cisaga_panorama_1795577810682.jpg',
    shortLabel: 'Girimukti',
    sector: 'Perbukitan & Kriya',
  },
  'Desa Karyamulya': {
    image: '/src/assets/images/prod_batik_ciamis_1795525160680.jpg',
    shortLabel: 'Karyamulya',
    sector: 'Kuliner & Kreatif',
  },
  'Desa Kepel': {
    image: '/src/assets/images/prod_kopi_cisaga_1795525161174.jpg',
    shortLabel: 'Kepel',
    sector: 'Kopi & Perkebunan',
  },
  'Desa Mekarmukti': {
    image: '/src/assets/images/prod_batik_ciamis_1795525160680.jpg',
    shortLabel: 'Mekarmukti',
    sector: 'Batik & Wastra',
  },
  'Desa Sidamulya': {
    image: '/src/assets/images/prod_gula_aren_1795525158657.jpg',
    shortLabel: 'Sidamulya',
    sector: 'Agribisnis & Olahan',
  },
  'Desa Sukahurip': {
    image: '/src/assets/images/prod_kopi_cisaga_1795525161174.jpg',
    shortLabel: 'Sukahurip',
    sector: 'Pertanian & Camilan',
  },
  'Desa Tanjungjaya': {
    image: '/src/assets/images/prod_anyaman_bambu_1795525159061.jpg',
    shortLabel: 'Tanjungjaya',
    sector: 'Anyaman & Kriya',
  },
  'Desa Wangunjaya': {
    image: '/src/assets/images/prod_sale_pisang_1795525159243.jpg',
    shortLabel: 'Wangunjaya',
    sector: 'Sale & Camilan',
  },
};

export function buildCisagaProfileSlides(
  villages: VillageInfo[],
  listings: UmkmListing[],
  totalPartnerCount: number
): CisagaProfileSlide[] {
  const activeListings = listings.filter((item) => item.status === 'Aktif');

  const overviewSlide: CisagaProfileSlide = {
    id: 'wilayah-kecamatan-cisaga',
    indexLabel: '01',
    shortLabel: 'Kec. Cisaga',
    title: 'Profil Wilayah Kecamatan Cisaga',
    subtitle: `Kabupaten Ciamis, Jawa Barat · ${villages.length} Desa Terhubung`,
    description:
      'Koridor ekonomi kreatif Priangan Timur yang menghubungkan seluruh 11 desa di Kecamatan Cisaga dari pusat pemerintahan hingga sentra agribisnis, kuliner, kriya, dan batik.',
    coordinatesLabel: '7°20′S 108°30′E',
    umkmCount: totalPartnerCount,
    featuredSector: '4 Sektor Unggulan',
    image: '/src/assets/images/wilayah_cisaga_panorama_1795577810682.jpg',
    imageAlt:
      'Panorama wilayah Kecamatan Cisaga, Kabupaten Ciamis dengan perbukitan hijau, permukiman desa, dan sentra ekonomi lokal',
    villageFilterTarget: null,
  };

  const villageSlides: CisagaProfileSlide[] = villages.map((village, idx) => {
    const media = VILLAGE_SLIDE_MEDIA[village.name];
    const activeInVillage = activeListings.filter((item) => item.village === village.name);
    const firstActiveImage = activeInVillage[0]?.image;
    const computedCount = Math.max(village.baseUmkmCount, activeInVillage.length);

    return {
      id: village.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      indexLabel: String(idx + 2).padStart(2, '0'),
      shortLabel: media?.shortLabel ?? village.name.replace(/^Desa\s+/i, ''),
      title: village.name,
      subtitle: village.commodityFocus,
      description: village.description,
      coordinatesLabel: village.coordinatesLabel,
      umkmCount: computedCount,
      featuredSector: media?.sector ?? 'UMKM Lokal',
      image: media?.image ?? firstActiveImage ?? '/src/assets/images/hero_cisaga_umkm_1795525158488.jpg',
      imageAlt: `Profil potensi ${village.name}, Kecamatan Cisaga: ${village.commodityFocus}`,
      villageFilterTarget: village.name,
    };
  });

  return [overviewSlide, ...villageSlides];
}

export function getNextSlideIndex(
  currentIndex: number,
  direction: 'prev' | 'next',
  totalSlides: number
): number {
  if (totalSlides <= 0) return 0;
  const safeCurrent = ((currentIndex % totalSlides) + totalSlides) % totalSlides;
  if (direction === 'next') {
    return (safeCurrent + 1) % totalSlides;
  }
  return (safeCurrent - 1 + totalSlides) % totalSlides;
}
