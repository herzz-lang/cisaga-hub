export type ProductCategory = 'Semua' | 'Kuliner' | 'Kerajinan' | 'Agribisnis' | 'Busana';

export type BusinessCategory = Exclude<ProductCategory, 'Semua'>;

export type UmkmTier = 'premium' | 'reguler';

export type UmkmStatus = 'Aktif' | 'Menunggu Verifikasi' | 'Nonaktif';

export type SortOption = 'featured' | 'price-asc' | 'price-desc';

export interface ProductVariant {
  id: string;
  label: string;
  price: number;
  availabilityNote: string;
  image?: string;
}

export interface UmkmListing {
  id: string;
  businessName: string;
  ownerName: string;
  productName: string;
  category: BusinessCategory;
  village: string;
  whatsapp: string;
  tier: UmkmTier;
  status: UmkmStatus;
  price: number;
  unitLabel: string;
  shortDescription: string;
  fullDescription: string;
  image: string;
  galleryImages?: string[];
  variants: ProductVariant[];
  createdAt: string;
}

export interface AdminVariantFormItem {
  id?: string;
  label: string;
  price: string;
  availabilityNote: string;
  image?: string;
}

export interface SavedPromoItem {
  listingId: string;
  variantId: string;
  productName: string;
  variantLabel: string;
  businessName: string;
  whatsapp: string;
  village: string;
  tier: UmkmTier;
  estimatedPrice: number;
  image: string;
}

export interface VillageInfo {
  name: string;
  commodityFocus: string;
  description: string;
  baseUmkmCount: number;
  coordinatesLabel: string;
}

export interface PromoInquiryFormData {
  requesterName: string;
  whatsapp: string;
  organizationOrAddress: string;
  inquiryPurpose:
    | 'Pemesanan Kolektif / Oleh-Oleh'
    | 'Kemitraan Reseller / Toko'
    | 'Informasi Bazar & Pameran';
  notes: string;
}

export interface FreeRegistrationFormData {
  businessName: string;
  ownerName: string;
  village: string;
  category: BusinessCategory;
  whatsapp: string;
  signatureProduct: string;
  estimatedPrice: string;
}

export interface AdminUmkmFormData {
  businessName: string;
  ownerName: string;
  productName: string;
  category: BusinessCategory;
  village: string;
  whatsapp: string;
  tier: UmkmTier;
  status: UmkmStatus;
  price: string;
  unitLabel: string;
  shortDescription: string;
  image: string;
  galleryImages?: string[];
  variants?: AdminVariantFormItem[];
}

export interface InquiryReceipt {
  inquiryCode: string;
  createdAt: string;
  requesterName: string;
  whatsapp: string;
  organizationOrAddress: string;
  inquiryPurpose: string;
  items: SavedPromoItem[];
}

export type ContactMessageStatus = 'unread' | 'read' | 'replied';

export type ContactTopic =
  | 'Pertanyaan Umum'
  | 'Promosi UMKM Premium'
  | 'Kemitraan & Reseller'
  | 'Bantuan Pendaftaran'
  | 'Saran & Masukan';

export interface ContactMessageFormData {
  name: string;
  email: string;
  whatsapp: string;
  subject: string;
  message: string;
  website?: string;
}

export interface ContactMessage {
  id: string;
  name: string;
  email: string;
  whatsapp: string;
  subject: string;
  message: string;
  status: ContactMessageStatus;
  created_at: string;
}

