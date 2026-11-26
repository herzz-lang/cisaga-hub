import { UMKM_IMAGE_PRESETS } from '../data/cisagaData';
import type {
  AdminUmkmFormData,
  BusinessCategory,
  ContactMessage,
  ContactMessageFormData,
  ContactTopic,
  FreeRegistrationFormData,
  ProductCategory,
  PromoInquiryFormData,
  SavedPromoItem,
  SortOption,
  UmkmListing,
  UmkmTier,
} from '../types/umkm';

export function formatRupiah(amount: number): string {
  const rounded = Math.round(amount);
  return `Rp${rounded.toLocaleString('id-ID')}`;
}

export function getStartingPrice(listing: UmkmListing): number {
  if (listing.variants.length === 0) return listing.price;
  return Math.min(...listing.variants.map((v) => v.price));
}

export function isSafeUmkmImagePath(url: string): boolean {
  const trimmed = url.trim();
  if (trimmed === '') return false;
  if (UMKM_IMAGE_PRESETS.some((p) => p.url === trimmed)) return true;
  return /^\/uploads\/umkm-[a-zA-Z0-9_-]+\.(jpg|png|webp)$/.test(trimmed);
}

export function getListingAllImages(listing: UmkmListing): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  const pushIfUnique = (img?: string) => {
    const trimmed = (img ?? '').trim();
    if (!trimmed || seen.has(trimmed)) return;
    seen.add(trimmed);
    result.push(trimmed);
  };

  pushIfUnique(listing.image);
  for (const img of listing.galleryImages ?? []) {
    pushIfUnique(img);
  }
  for (const variant of listing.variants) {
    pushIfUnique(variant.image);
  }
  return result;
}

export function buildWhatsAppUrl(phone: string, message: string): string {
  const digits = phone.replace(/[^0-9]/g, '');
  let normalized = digits;
  if (digits.startsWith('0')) {
    normalized = `62${digits.slice(1)}`;
  } else if (digits.startsWith('8')) {
    normalized = `62${digits}`;
  }
  return `https://wa.me/${normalized}?text=${encodeURIComponent(message)}`;
}

export function getPremiumTopListings(listings: UmkmListing[]): UmkmListing[] {
  return listings.filter((item) => item.status === 'Aktif' && item.tier === 'premium');
}

export interface ListingFilterParams {
  category: ProductCategory;
  tierFilter: 'all' | UmkmTier;
  village: string;
  query: string;
  sortBy: SortOption;
  includeUnverified?: boolean;
}

export function filterAndSortListings(
  listings: UmkmListing[],
  params: ListingFilterParams
): UmkmListing[] {
  const normalizedQuery = params.query.trim().toLowerCase();

  const filtered = listings.filter((item) => {
    if (!params.includeUnverified && item.status !== 'Aktif') {
      return false;
    }

    const matchesCategory =
      params.category === 'Semua' || item.category === params.category;
    const matchesTier = params.tierFilter === 'all' || item.tier === params.tierFilter;
    const matchesVillage =
      params.village === 'Semua Desa' || item.village === params.village;
    const matchesQuery =
      normalizedQuery === '' ||
      item.productName.toLowerCase().includes(normalizedQuery) ||
      item.businessName.toLowerCase().includes(normalizedQuery) ||
      item.ownerName.toLowerCase().includes(normalizedQuery) ||
      item.village.toLowerCase().includes(normalizedQuery) ||
      item.shortDescription.toLowerCase().includes(normalizedQuery) ||
      item.variants.some((v) => v.label.toLowerCase().includes(normalizedQuery));

    return matchesCategory && matchesTier && matchesVillage && matchesQuery;
  });

  if (params.sortBy === 'price-asc') {
    return [...filtered].sort((a, b) => getStartingPrice(a) - getStartingPrice(b));
  }
  if (params.sortBy === 'price-desc') {
    return [...filtered].sort((a, b) => getStartingPrice(b) - getStartingPrice(a));
  }

  // Default 'featured' sort: Premium always appears first, Reguler after
  return [...filtered].sort((a, b) => {
    if (a.tier === b.tier) return 0;
    return a.tier === 'premium' ? -1 : 1;
  });
}

export function isListingSaved(
  savedItems: SavedPromoItem[],
  listingId: string,
  variantId?: string
): boolean {
  if (variantId) {
    return savedItems.some(
      (item) => item.listingId === listingId && item.variantId === variantId
    );
  }
  return savedItems.some((item) => item.listingId === listingId);
}

export function saveListingToPromo(
  savedItems: SavedPromoItem[],
  listing: UmkmListing,
  variantId?: string
): SavedPromoItem[] {
  const variant =
    (variantId ? listing.variants.find((v) => v.id === variantId) : undefined) ??
    listing.variants[0];

  const resolvedVariantId = variant?.id ?? `${listing.id}-default`;
  const resolvedLabel = variant?.label ?? listing.unitLabel;
  const resolvedPrice = variant?.price ?? listing.price;

  const exists = savedItems.some(
    (item) => item.listingId === listing.id && item.variantId === resolvedVariantId
  );
  if (exists) return savedItems;

  return [
    ...savedItems,
    {
      listingId: listing.id,
      variantId: resolvedVariantId,
      productName: listing.productName,
      variantLabel: resolvedLabel,
      businessName: listing.businessName,
      whatsapp: listing.whatsapp,
      village: listing.village,
      tier: listing.tier,
      estimatedPrice: resolvedPrice,
      image: listing.image,
    },
  ];
}

export function toggleQuickSaveListing(
  savedItems: SavedPromoItem[],
  listing: UmkmListing
): SavedPromoItem[] {
  if (isListingSaved(savedItems, listing.id)) {
    return savedItems.filter((item) => item.listingId !== listing.id);
  }
  return saveListingToPromo(savedItems, listing);
}

export function removeSavedPromoItem(
  savedItems: SavedPromoItem[],
  listingId: string,
  variantId: string
): SavedPromoItem[] {
  return savedItems.filter(
    (item) => !(item.listingId === listingId && item.variantId === variantId)
  );
}

export function isValidIndonesianPhone(phone: string): boolean {
  const digits = phone.replace(/[^0-9]/g, '');
  return (
    digits.length >= 10 &&
    digits.length <= 15 &&
    (digits.startsWith('08') || digits.startsWith('62'))
  );
}

export function validatePromoInquiryForm(
  form: PromoInquiryFormData
): Partial<Record<keyof PromoInquiryFormData, string>> {
  const errors: Partial<Record<keyof PromoInquiryFormData, string>> = {};

  if (form.requesterName.trim().length < 3) {
    errors.requesterName = 'Nama lengkap minimal 3 karakter.';
  }
  if (!isValidIndonesianPhone(form.whatsapp)) {
    errors.whatsapp = 'Masukkan nomor WhatsApp aktif (contoh: 081234567890).';
  }
  if (form.organizationOrAddress.trim().length < 4) {
    errors.organizationOrAddress = 'Tuliskan nama instansi, usaha, atau wilayah Anda.';
  }

  return errors;
}

export function validateFreeRegistrationForm(
  form: FreeRegistrationFormData
): Partial<Record<keyof FreeRegistrationFormData, string>> {
  const errors: Partial<Record<keyof FreeRegistrationFormData, string>> = {};

  if (form.businessName.trim().length < 3) {
    errors.businessName = 'Nama usaha minimal 3 karakter.';
  }
  if (form.ownerName.trim().length < 3) {
    errors.ownerName = 'Nama pemilik minimal 3 karakter.';
  }
  if (form.village.trim() === '') {
    errors.village = 'Pilih desa asal di Kecamatan Cisaga.';
  }
  if (!isValidIndonesianPhone(form.whatsapp)) {
    errors.whatsapp = 'Masukkan nomor WhatsApp aktif (contoh: 081234567890).';
  }
  if (form.signatureProduct.trim().length < 4) {
    errors.signatureProduct = 'Sebutkan minimal satu produk unggulan usaha Anda.';
  }
  const parsedPrice = Number(form.estimatedPrice);
  if (Number.isNaN(parsedPrice) || parsedPrice < 1000) {
    errors.estimatedPrice = 'Masukkan kisaran harga mulai (minimal Rp1.000).';
  }

  return errors;
}

export function validateAdminUmkmForm(
  form: AdminUmkmFormData
): Partial<Record<keyof AdminUmkmFormData, string>> {
  const errors: Partial<Record<keyof AdminUmkmFormData, string>> = {};

  if (form.businessName.trim().length < 3) {
    errors.businessName = 'Nama usaha minimal 3 karakter.';
  }
  if (form.ownerName.trim().length < 3) {
    errors.ownerName = 'Nama pemilik minimal 3 karakter.';
  }
  if (form.productName.trim().length < 3) {
    errors.productName = 'Nama produk unggulan minimal 3 karakter.';
  }
  if (form.village.trim() === '') {
    errors.village = 'Pilih desa asal di Kecamatan Cisaga.';
  }
  if (!isValidIndonesianPhone(form.whatsapp)) {
    errors.whatsapp = 'Masukkan nomor WhatsApp aktif (contoh: 081234567890).';
  }
  const parsedPrice = Number(form.price);
  if (Number.isNaN(parsedPrice) || parsedPrice < 1000) {
    errors.price = 'Harga kisaran minimal Rp1.000.';
  }
  if (form.shortDescription.trim().length < 10) {
    errors.shortDescription = 'Deskripsi singkat minimal 10 karakter.';
  }

  if (form.variants && form.variants.length > 0) {
    for (const item of form.variants) {
      if (item.label.trim().length < 2) {
        errors.variants = 'Setiap nama menu atau layanan minimal 2 karakter.';
        break;
      }
      const itemPrice = Number(item.price);
      if (Number.isNaN(itemPrice) || itemPrice < 1000) {
        errors.variants = 'Setiap harga menu atau layanan minimal Rp1.000.';
        break;
      }
    }
  }

  return errors;
}

function getDefaultImageForCategory(category: BusinessCategory): string {
  switch (category) {
    case 'Agribisnis':
      return UMKM_IMAGE_PRESETS[0].url;
    case 'Kuliner':
      return UMKM_IMAGE_PRESETS[1].url;
    case 'Kerajinan':
      return UMKM_IMAGE_PRESETS[2].url;
    case 'Busana':
      return UMKM_IMAGE_PRESETS[3].url;
    default:
      return UMKM_IMAGE_PRESETS[5].url;
  }
}

export function createFreeListingEntry(form: FreeRegistrationFormData): UmkmListing {
  const id = `umkm-free-${Date.now()}`;
  const price = Math.round(Number(form.estimatedPrice));
  const productName = form.signatureProduct.trim();
  return {
    id,
    businessName: form.businessName.trim(),
    ownerName: form.ownerName.trim(),
    productName,
    category: form.category,
    village: form.village,
    whatsapp: form.whatsapp.replace(/[^0-9]/g, ''),
    tier: 'reguler',
    status: 'Menunggu Verifikasi',
    price,
    unitLabel: 'Kemasan Standar',
    shortDescription: `Produk lokal ${form.village} dari ${form.businessName.trim()} kategori ${form.category}.`,
    fullDescription: `${productName} diproduksi langsung oleh ${form.businessName.trim()} (${form.ownerName.trim()}) di ${form.village}, Kecamatan Cisaga.`,
    image: getDefaultImageForCategory(form.category),
    createdAt: new Date().toISOString().slice(0, 10),
    variants: [
      {
        id: `${id}-std`,
        label: 'Kemasan Standar',
        price,
        availabilityNote: 'Terdaftar Gratis',
      },
    ],
  };
}

function buildNormalizedVariantsFromForm(
  baseId: string,
  form: AdminUmkmFormData,
  fallbackPrice: number,
  fallbackUnitLabel: string
) {
  if (form.variants && form.variants.length > 0) {
    return form.variants.map((item, idx) => {
      const parsedItemPrice = Math.round(Number(item.price));
      const safeImage = item.image && isSafeUmkmImagePath(item.image) ? item.image.trim() : undefined;
      return {
        id: item.id && item.id.trim().length > 0 ? item.id.trim() : `${baseId}-v${idx + 1}`,
        label: item.label.trim(),
        price: Number.isFinite(parsedItemPrice) && parsedItemPrice >= 1000 ? parsedItemPrice : fallbackPrice,
        availabilityNote: item.availabilityNote.trim() || 'Tersedia',
        ...(safeImage ? { image: safeImage } : {}),
      };
    });
  }

  return [
    {
      id: `${baseId}-v1`,
      label: fallbackUnitLabel,
      price: fallbackPrice,
      availabilityNote: form.tier === 'premium' ? 'Mitra Premium' : 'Siap Dipromosikan',
    },
  ];
}

function normalizeGalleryImages(galleryImages: string[] | undefined, primaryImage: string): string[] {
  if (!Array.isArray(galleryImages)) return [];
  const seen = new Set<string>([primaryImage]);
  const cleaned: string[] = [];
  for (const raw of galleryImages) {
    const trimmed = typeof raw === 'string' ? raw.trim() : '';
    if (!trimmed || seen.has(trimmed) || !isSafeUmkmImagePath(trimmed)) continue;
    seen.add(trimmed);
    cleaned.push(trimmed);
    if (cleaned.length >= 6) break;
  }
  return cleaned;
}

export function createAdminListingEntry(form: AdminUmkmFormData): UmkmListing {
  const id = `umkm-adm-${Date.now()}`;
  const price = Math.round(Number(form.price));
  const unitLabel = form.unitLabel.trim() || 'Kemasan Standar';
  const shortDesc = form.shortDescription.trim();
  const primaryImage = isSafeUmkmImagePath(form.image)
    ? form.image.trim()
    : getDefaultImageForCategory(form.category);
  const variants = buildNormalizedVariantsFromForm(id, form, price, unitLabel);
  const galleryImages = normalizeGalleryImages(form.galleryImages, primaryImage);

  return {
    id,
    businessName: form.businessName.trim(),
    ownerName: form.ownerName.trim(),
    productName: form.productName.trim(),
    category: form.category,
    village: form.village,
    whatsapp: form.whatsapp.replace(/[^0-9]/g, ''),
    tier: form.tier,
    status: form.status,
    price: variants[0]?.price ?? price,
    unitLabel: variants[0]?.label ?? unitLabel,
    shortDescription: shortDesc,
    fullDescription: `${shortDesc} Dikelola oleh ${form.businessName.trim()} (${form.ownerName.trim()}) di ${form.village}, Kecamatan Cisaga.`,
    image: primaryImage,
    ...(galleryImages.length > 0 ? { galleryImages } : {}),
    createdAt: new Date().toISOString().slice(0, 10),
    variants,
  };
}

export function updateAdminListingEntry(
  existing: UmkmListing,
  form: AdminUmkmFormData
): UmkmListing {
  const price = Math.round(Number(form.price));
  const unitLabel = form.unitLabel.trim() || existing.unitLabel;
  const shortDesc = form.shortDescription.trim();
  const primaryImage = isSafeUmkmImagePath(form.image) ? form.image.trim() : existing.image;
  const variants =
    form.variants && form.variants.length > 0
      ? buildNormalizedVariantsFromForm(existing.id, form, price, unitLabel)
      : existing.variants.map((v, idx) =>
          idx === 0 ? { ...v, label: unitLabel, price } : v
        );
  const galleryImages = normalizeGalleryImages(form.galleryImages, primaryImage);

  return {
    ...existing,
    businessName: form.businessName.trim(),
    ownerName: form.ownerName.trim(),
    productName: form.productName.trim(),
    category: form.category,
    village: form.village,
    whatsapp: form.whatsapp.replace(/[^0-9]/g, ''),
    tier: form.tier,
    status: form.status,
    price: variants[0]?.price ?? price,
    unitLabel: variants[0]?.label ?? unitLabel,
    shortDescription: shortDesc,
    fullDescription: `${shortDesc} Dikelola oleh ${form.businessName.trim()} (${form.ownerName.trim()}) di ${form.village}, Kecamatan Cisaga.`,
    image: primaryImage,
    galleryImages,
    variants,
  };
}

export function toggleListingTier(listings: UmkmListing[], id: string): UmkmListing[] {
  return listings.map((item) =>
    item.id === id
      ? { ...item, tier: item.tier === 'premium' ? 'reguler' : 'premium' }
      : item
  );
}

export function cycleListingStatus(listings: UmkmListing[], id: string): UmkmListing[] {
  return listings.map((item) => {
    if (item.id !== id) return item;
    const nextStatus = item.status === 'Aktif' ? 'Nonaktif' : 'Aktif';
    return { ...item, status: nextStatus };
  });
}

export function deleteListingById(listings: UmkmListing[], id: string): UmkmListing[] {
  return listings.filter((item) => item.id !== id);
}

export function generateInquiryCode(
  seedNumber = Math.floor(1000 + Math.random() * 9000)
): string {
  return `PRM-${seedNumber}`;
}

export const CONTACT_TOPICS: ContactTopic[] = [
  'Pertanyaan Umum',
  'Promosi UMKM Premium',
  'Kemitraan & Reseller',
  'Bantuan Pendaftaran',
  'Saran & Masukan',
];

export function isValidEmailAddress(email: string): boolean {
  const trimmed = email.trim();
  if (!trimmed) return false;
  if (trimmed.length > 120) return false;
  return /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(trimmed);
}

export function isValidContactPhone(phone: string): boolean {
  const digits = phone.replace(/[^0-9]/g, '');
  return digits.length >= 8 && digits.length <= 15;
}

export function getContactStatusLabel(status: string): string {
  switch (status) {
    case 'unread':
    case 'Baru':
      return 'Belum Dibaca';
    case 'read':
    case 'Dibaca':
      return 'Sudah Dibaca';
    case 'replied':
    case 'Selesai':
      return 'Sudah Dibalas';
    default:
      return status;
  }
}

export function validateContactMessageForm(
  form: ContactMessageFormData
): Partial<Record<keyof ContactMessageFormData, string>> {
  const errors: Partial<Record<keyof ContactMessageFormData, string>> = {};
  const name = form.name.trim();
  const email = form.email.trim();
  const whatsappDigits = form.whatsapp.replace(/[^0-9]/g, '');
  const subject = form.subject.trim();
  const message = form.message.trim();

  if (name.length < 2 || name.length > 80) {
    errors.name = 'Masukkan nama lengkap Anda (2–80 karakter).';
  }
  if (!isValidEmailAddress(email)) {
    errors.email = 'Masukkan alamat email yang valid (contoh: nama@contoh.id).';
  }
  if (whatsappDigits.length > 0 && !isValidContactPhone(form.whatsapp)) {
    errors.whatsapp = 'Nomor WhatsApp harus berisi 8–15 digit angka jika diisi.';
  }
  if (subject.length < 2 || subject.length > 120) {
    errors.subject = 'Masukkan subjek pesan (2–120 karakter).';
  }
  if (message.length < 2 || message.length > 1500) {
    errors.message = 'Isi pesan minimal 2 karakter (maksimal 1.500 karakter).';
  }

  return errors;
}

export function formatContactDate(isoTimestamp: string): string {
  const parsed = new Date(isoTimestamp);
  if (Number.isNaN(parsed.getTime())) return isoTimestamp;
  return parsed.toLocaleString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function isDeveloperAdminPath(pathname: string): boolean {
  const normalized = pathname.replace(/\/+$/, '').toLowerCase();
  return normalized === '/admin' || normalized === '/portal-developer';
}

export type AdminFilterTab = 'all' | 'premium' | 'reguler' | 'pending';

export interface AdminPortalSummary {
  activeUmkmCount: number;
  unreadMessagesCount: number;
  premiumUmkmCount: number;
}

export function getAdminPortalSummary(
  listings: UmkmListing[],
  messages: ContactMessage[]
): AdminPortalSummary {
  return {
    activeUmkmCount: listings.filter((item) => item.status === 'Aktif').length,
    unreadMessagesCount: messages.filter((msg) => msg.status === 'unread').length,
    premiumUmkmCount: listings.filter((item) => item.tier === 'premium').length,
  };
}

export function filterAdminListings(
  listings: UmkmListing[],
  filterTab: AdminFilterTab,
  searchQuery: string
): UmkmListing[] {
  const q = searchQuery.trim().toLowerCase();

  const tabFiltered = listings.filter((item) => {
    if (filterTab === 'premium' && item.tier !== 'premium') return false;
    if (filterTab === 'reguler' && item.tier !== 'reguler') return false;
    if (filterTab === 'pending' && item.status !== 'Menunggu Verifikasi') return false;
    return true;
  });

  if (q === '') {
    return tabFiltered;
  }

  const scored: { item: UmkmListing; rank: number }[] = [];
  for (const item of tabFiltered) {
    const businessLower = item.businessName.toLowerCase();
    if (businessLower.startsWith(q)) {
      scored.push({ item, rank: 0 });
    } else if (businessLower.includes(q)) {
      scored.push({ item, rank: 1 });
    } else if (
      item.productName.toLowerCase().includes(q) ||
      item.ownerName.toLowerCase().includes(q) ||
      item.village.toLowerCase().includes(q)
    ) {
      scored.push({ item, rank: 2 });
    }
  }

  scored.sort((a, b) => a.rank - b.rank);
  return scored.map((entry) => entry.item);
}
