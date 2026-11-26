import type { User } from 'firebase/auth';
import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  where,
  writeBatch,
  type DocumentData,
  type Unsubscribe,
} from 'firebase/firestore';
import {
  CISAGA_VILLAGES,
  INITIAL_UMKM_LISTINGS,
  UMKM_IMAGE_PRESETS,
} from '../data/cisagaData';
import { db, handleFirestoreError, OperationType } from '../firebase';
import type {
  AdminUmkmFormData,
  BusinessCategory,
  ContactMessage,
  ContactMessageFormData,
  ContactMessageStatus,
  FreeRegistrationFormData,
  ProductVariant,
  UmkmListing,
  UmkmStatus,
  UmkmTier,
} from '../types/umkm';
import { validateContactMessageForm } from '../utils/umkmLogic';

export const BOOTSTRAPPED_ADMIN_EMAIL = 'herzz@smkn2banjar-jabar.sch.id';

const VALID_CATEGORIES = new Set<BusinessCategory>([
  'Kuliner',
  'Kerajinan',
  'Agribisnis',
  'Busana',
]);
const VALID_TIERS = new Set<UmkmTier>(['premium', 'reguler']);
const VALID_STATUSES = new Set<UmkmStatus>(['Aktif', 'Menunggu Verifikasi', 'Nonaktif']);
const VALID_VILLAGES = new Set(CISAGA_VILLAGES.map((v) => v.name));
const ALLOWED_IMAGE_PRESETS = new Set(UMKM_IMAGE_PRESETS.map((p) => p.url));

const recentClientContactDigests = new Map<string, number>();
const CLIENT_DUPLICATE_COOLDOWN_MS = 10_000;

export function sanitizeClientText(raw: unknown, allowMultiline = false): string {
  if (typeof raw !== 'string') return '';
  const withoutControlChars = raw
    .replace(/\u0000/g, '')
    .replace(/[\u0001-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
    .replace(/<[^>]*>/g, '')
    .replace(/[<>]/g, '');
  if (allowMultiline) {
    return withoutControlChars
      .replace(/\r\n/g, '\n')
      .replace(/[ \t]+/g, ' ')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }
  return withoutControlChars.replace(/\s+/g, ' ').trim();
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

function isAllowedImageValue(url: string): boolean {
  const trimmed = url.trim();
  if (ALLOWED_IMAGE_PRESETS.has(trimmed)) return true;
  if (/^\/uploads\/umkm-[a-zA-Z0-9._-]+\.(?:jpg|jpeg|png|webp)$/.test(trimmed)) return true;
  if (
    /^data:image\/(?:jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(trimmed) &&
    trimmed.length <= 260_000
  ) {
    return true;
  }
  return false;
}

function resolveSafeImage(imageInput: string | undefined, category: BusinessCategory): string {
  const trimmed = (imageInput ?? '').trim();
  if (isAllowedImageValue(trimmed)) {
    return trimmed;
  }
  return getDefaultImageForCategory(category);
}

function resolveSafeOptionalImage(imageInput: unknown): string | undefined {
  if (typeof imageInput !== 'string') return undefined;
  const trimmed = imageInput.trim();
  return isAllowedImageValue(trimmed) ? trimmed : undefined;
}

function resolveSafeGalleryImages(rawGallery: unknown, primaryImage: string): string[] {
  if (!Array.isArray(rawGallery)) return [];
  const seen = new Set<string>([primaryImage]);
  const result: string[] = [];
  for (const item of rawGallery) {
    const safeUrl = resolveSafeOptionalImage(item);
    if (!safeUrl || seen.has(safeUrl)) continue;
    seen.add(safeUrl);
    result.push(safeUrl);
    if (result.length >= 6) break;
  }
  return result;
}

function timestampToIso(raw: unknown): string {
  if (raw instanceof Timestamp) {
    return raw.toDate().toISOString();
  }
  if (raw && typeof raw === 'object' && 'toDate' in raw && typeof (raw as { toDate?: () => Date }).toDate === 'function') {
    return (raw as { toDate: () => Date }).toDate().toISOString();
  }
  if (typeof raw === 'string' && !Number.isNaN(Date.parse(raw))) {
    return raw;
  }
  return new Date().toISOString();
}

function mapDocToListing(id: string, data: DocumentData): UmkmListing {
  const variantsRaw = Array.isArray(data.variants) ? data.variants : [];
  const variants: ProductVariant[] = variantsRaw.map((v, idx) => ({
    id: typeof v?.id === 'string' ? v.id : `${id}-v${idx + 1}`,
    label: typeof v?.label === 'string' ? v.label : 'Kemasan Standar',
    price: typeof v?.price === 'number' ? v.price : Number(v?.price) || 1000,
    availabilityNote:
      typeof v?.availabilityNote === 'string' ? v.availabilityNote : 'Tersedia',
    ...(typeof v?.image === 'string' && v.image.trim() ? { image: v.image } : {}),
  }));

  return {
    id: typeof data.id === 'string' ? data.id : id,
    businessName: String(data.businessName ?? ''),
    ownerName: String(data.ownerName ?? ''),
    productName: String(data.productName ?? ''),
    category: VALID_CATEGORIES.has(data.category as BusinessCategory)
      ? (data.category as BusinessCategory)
      : 'Kuliner',
    village: String(data.village ?? ''),
    whatsapp: String(data.whatsapp ?? ''),
    tier: VALID_TIERS.has(data.tier as UmkmTier) ? (data.tier as UmkmTier) : 'reguler',
    status: VALID_STATUSES.has(data.status as UmkmStatus)
      ? (data.status as UmkmStatus)
      : 'Aktif',
    price: typeof data.price === 'number' ? data.price : Number(data.price) || 1000,
    unitLabel: String(data.unitLabel ?? 'Kemasan Standar'),
    shortDescription: String(data.shortDescription ?? ''),
    fullDescription: String(data.fullDescription ?? ''),
    image: String(data.image ?? getDefaultImageForCategory('Kuliner')),
    galleryImages: Array.isArray(data.galleryImages)
      ? data.galleryImages.filter((u): u is string => typeof u === 'string')
      : [],
    createdAt: String(data.createdAt ?? new Date().toISOString().slice(0, 10)),
    variants:
      variants.length > 0
        ? variants
        : [
            {
              id: `${id}-std`,
              label: String(data.unitLabel ?? 'Kemasan Standar'),
              price: typeof data.price === 'number' ? data.price : 1000,
              availabilityNote: 'Tersedia',
            },
          ],
  };
}

function mapDocToContact(id: string, data: DocumentData): ContactMessage {
  const statusRaw = data.status;
  const status: ContactMessageStatus =
    statusRaw === 'read' || statusRaw === 'replied' ? statusRaw : 'unread';

  return {
    id: typeof data.id === 'string' ? data.id : id,
    name: String(data.name ?? ''),
    email: String(data.email ?? ''),
    whatsapp: String(data.whatsapp ?? ''),
    subject: String(data.subject ?? 'Pertanyaan Umum'),
    message: String(data.message ?? ''),
    status,
    created_at: timestampToIso(data.created_at),
  };
}

export function isSingleAuthorizedGoogleAccount(user: User | null): boolean {
  if (!user || !user.email) return false;
  return (
    user.email.trim().toLowerCase() === BOOTSTRAPPED_ADMIN_EMAIL.toLowerCase() &&
    Boolean(user.emailVerified)
  );
}

export async function isAuthorizedAdminUser(user: User | null): Promise<boolean> {
  return isSingleAuthorizedGoogleAccount(user);
}

export function subscribePublicActiveListings(
  onData: (listings: UmkmListing[]) => void
): Unsubscribe {
  const q = query(collection(db, 'umkm_listings'), where('status', '==', 'Aktif'));
  return onSnapshot(
    q,
    (snapshot) => {
      if (snapshot.empty) {
        onData(INITIAL_UMKM_LISTINGS.filter((item) => item.status === 'Aktif'));
        return;
      }
      const items = snapshot.docs.map((d) => mapDocToListing(d.id, d.data()));
      onData(items);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, 'umkm_listings');
    }
  );
}

export async function seedInitialListingsIfEmpty(): Promise<void> {
  try {
    const existingSnap = await getDocs(collection(db, 'umkm_listings'));
    if (!existingSnap.empty) return;

    const batch = writeBatch(db);
    for (const item of INITIAL_UMKM_LISTINGS) {
      batch.set(doc(db, 'umkm_listings', item.id), {
        ...item,
        galleryImages: item.galleryImages ?? [],
        serverCreatedAt: serverTimestamp(),
      });
    }
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'umkm_listings');
  }
}

export function subscribeAllListingsAdmin(
  onData: (listings: UmkmListing[]) => void
): Unsubscribe {
  return onSnapshot(
    collection(db, 'umkm_listings'),
    (snapshot) => {
      const items = snapshot.docs
        .map((d) => mapDocToListing(d.id, d.data()))
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      onData(items);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, 'umkm_listings');
    }
  );
}

export function subscribeAllContactsAdmin(
  onData: (messages: ContactMessage[]) => void
): Unsubscribe {
  const q = query(collection(db, 'contacts'), orderBy('created_at', 'desc'));
  return onSnapshot(
    q,
    (snapshot) => {
      const items = snapshot.docs.map((d) => mapDocToContact(d.id, d.data()));
      onData(items);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, 'contacts');
    }
  );
}

export async function createContactMessageInFirestore(
  raw: ContactMessageFormData
): Promise<ContactMessage> {
  const honeypot = typeof raw.website === 'string' ? raw.website.trim() : '';
  if (honeypot.length > 0) {
    throw new Error('Permintaan ditolak oleh sistem proteksi spam.');
  }

  const sanitized: ContactMessageFormData = {
    name: sanitizeClientText(raw.name, false).slice(0, 80),
    email: sanitizeClientText(raw.email, false).slice(0, 120),
    whatsapp: typeof raw.whatsapp === 'string' ? raw.whatsapp.replace(/[^0-9]/g, '').slice(0, 20) : '',
    subject: (sanitizeClientText(raw.subject, false) || 'Pertanyaan Umum').slice(0, 120),
    message: sanitizeClientText(raw.message, true).slice(0, 1500),
    website: '',
  };

  const validationErrors = validateContactMessageForm(sanitized);
  const firstError = Object.values(validationErrors).find(Boolean);
  if (firstError) {
    throw new Error(firstError);
  }

  const now = Date.now();
  for (const [key, exp] of recentClientContactDigests.entries()) {
    if (now >= exp) recentClientContactDigests.delete(key);
  }
  const digest = `${sanitized.email.toLowerCase()}|${sanitized.subject}|${sanitized.message}`;
  const blockedUntil = recentClientContactDigests.get(digest);
  if (blockedUntil && now < blockedUntil) {
    throw new Error('Pesan yang sama baru saja dikirim. Mohon tunggu beberapa detik sebelum mengirim ulang.');
  }

  const id = `cnt-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  const docPath = `contacts/${id}`;

  try {
    await setDoc(doc(db, 'contacts', id), {
      id,
      name: sanitized.name,
      email: sanitized.email,
      whatsapp: sanitized.whatsapp,
      subject: sanitized.subject,
      message: sanitized.message,
      status: 'unread',
      created_at: serverTimestamp(),
    });
    recentClientContactDigests.set(digest, Date.now() + CLIENT_DUPLICATE_COOLDOWN_MS);
    return {
      id,
      name: sanitized.name,
      email: sanitized.email,
      whatsapp: sanitized.whatsapp,
      subject: sanitized.subject,
      message: sanitized.message,
      status: 'unread',
      created_at: new Date().toISOString(),
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, docPath);
  }
}

export async function updateContactStatusInFirestore(
  id: string,
  status: ContactMessageStatus
): Promise<void> {
  const docPath = `contacts/${id}`;
  try {
    await updateDoc(doc(db, 'contacts', id), { status });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, docPath);
  }
}

export async function deleteContactInFirestore(id: string): Promise<void> {
  const docPath = `contacts/${id}`;
  try {
    await deleteDoc(doc(db, 'contacts', id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, docPath);
  }
}

export async function createFreeRegistrationInFirestore(
  raw: FreeRegistrationFormData
): Promise<UmkmListing> {
  const businessName = sanitizeClientText(raw.businessName, false).slice(0, 100);
  const ownerName = sanitizeClientText(raw.ownerName, false).slice(0, 80);
  const village = sanitizeClientText(raw.village, false);
  const category = VALID_CATEGORIES.has(raw.category) ? raw.category : null;
  const whatsappDigits =
    typeof raw.whatsapp === 'string' ? raw.whatsapp.replace(/[^0-9]/g, '').slice(0, 15) : '';
  const signatureProduct = sanitizeClientText(raw.signatureProduct, false).slice(0, 120);
  const parsedPrice = Math.min(100_000_000, Math.round(Number(raw.estimatedPrice)));

  if (businessName.length < 3 || ownerName.length < 3) {
    throw new Error('Nama usaha dan nama pemilik minimal 3 karakter.');
  }
  if (!VALID_VILLAGES.has(village)) {
    throw new Error('Pilih desa asal yang valid di Kecamatan Cisaga.');
  }
  if (!category) {
    throw new Error('Kategori usaha tidak valid.');
  }
  if (
    whatsappDigits.length < 10 ||
    whatsappDigits.length > 15 ||
    (!whatsappDigits.startsWith('08') && !whatsappDigits.startsWith('62'))
  ) {
    throw new Error('Masukkan nomor WhatsApp aktif yang valid.');
  }
  if (signatureProduct.length < 4) {
    throw new Error('Produk unggulan minimal 4 karakter.');
  }
  if (Number.isNaN(parsedPrice) || parsedPrice < 1000) {
    throw new Error('Kisaran harga minimal Rp1.000.');
  }

  const id = `umkm-free-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`;
  const createdAt = new Date().toISOString().slice(0, 10);
  const listing: UmkmListing = {
    id,
    businessName,
    ownerName,
    productName: signatureProduct,
    category,
    village,
    whatsapp: whatsappDigits,
    tier: 'reguler',
    status: 'Menunggu Verifikasi',
    price: parsedPrice,
    unitLabel: 'Kemasan Standar',
    shortDescription: `Produk lokal ${village} dari ${businessName} kategori ${category}.`.slice(
      0,
      300
    ),
    fullDescription: `${signatureProduct} diproduksi langsung oleh ${businessName} (${ownerName}) di ${village}, Kecamatan Cisaga.`.slice(
      0,
      1000
    ),
    image: getDefaultImageForCategory(category),
    galleryImages: [],
    createdAt,
    variants: [
      {
        id: `${id}-std`,
        label: 'Kemasan Standar',
        price: parsedPrice,
        availabilityNote: 'Terdaftar Gratis',
      },
    ],
  };

  const docPath = `umkm_listings/${id}`;
  try {
    await setDoc(doc(db, 'umkm_listings', id), {
      ...listing,
      serverCreatedAt: serverTimestamp(),
    });
    return listing;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, docPath);
  }
}

function buildValidatedAdminListingFields(raw: AdminUmkmFormData, baseId: string) {
  const businessName = sanitizeClientText(raw.businessName, false).slice(0, 100);
  const ownerName = sanitizeClientText(raw.ownerName, false).slice(0, 80);
  const productName = sanitizeClientText(raw.productName, false).slice(0, 120);
  const village = sanitizeClientText(raw.village, false);
  const category = VALID_CATEGORIES.has(raw.category) ? raw.category : null;
  const tier = VALID_TIERS.has(raw.tier) ? raw.tier : null;
  const status = VALID_STATUSES.has(raw.status) ? raw.status : null;
  const whatsappDigits =
    typeof raw.whatsapp === 'string' ? raw.whatsapp.replace(/[^0-9]/g, '').slice(0, 15) : '';
  const parsedPrice = Math.min(100_000_000, Math.round(Number(raw.price)));
  const unitLabel =
    sanitizeClientText(raw.unitLabel, false).slice(0, 80) || 'Kemasan Standar';
  const shortDescription = sanitizeClientText(raw.shortDescription, false).slice(0, 300);

  if (businessName.length < 3 || ownerName.length < 3 || productName.length < 3) {
    throw new Error('Nama usaha, pemilik, dan produk minimal 3 karakter.');
  }
  if (!VALID_VILLAGES.has(village)) {
    throw new Error('Desa asal harus berada di wilayah Kecamatan Cisaga.');
  }
  if (!category || !tier || !status) {
    throw new Error('Kategori, paket promosi, atau status publikasi tidak valid.');
  }
  if (
    whatsappDigits.length < 10 ||
    whatsappDigits.length > 15 ||
    (!whatsappDigits.startsWith('08') && !whatsappDigits.startsWith('62'))
  ) {
    throw new Error('Masukkan nomor WhatsApp aktif yang valid.');
  }
  if (Number.isNaN(parsedPrice) || parsedPrice < 1000) {
    throw new Error('Harga kisaran minimal Rp1.000.');
  }
  if (shortDescription.length < 10) {
    throw new Error('Deskripsi singkat minimal 10 karakter.');
  }

  const safeImage = resolveSafeImage(raw.image, category);
  const safeGallery = resolveSafeGalleryImages(raw.galleryImages, safeImage);

  const rawVariants = Array.isArray(raw.variants) ? raw.variants.slice(0, 25) : [];
  const variants: ProductVariant[] =
    rawVariants.length > 0
      ? rawVariants.map((item, idx) => {
          const label = sanitizeClientText(item?.label, false).slice(0, 80);
          const itemPrice = Math.min(100_000_000, Math.round(Number(item?.price)));
          if (label.length < 2) {
            throw new Error('Setiap nama menu atau layanan harus 2–80 karakter.');
          }
          if (Number.isNaN(itemPrice) || itemPrice < 1000) {
            throw new Error('Setiap harga menu atau layanan minimal Rp1.000.');
          }
          const availabilityNote =
            sanitizeClientText(item?.availabilityNote, false).slice(0, 60) || 'Tersedia';
          const safeVariantImage = resolveSafeOptionalImage(item?.image);
          return {
            id:
              typeof item?.id === 'string' && /^[a-zA-Z0-9_-]{1,80}$/.test(item.id.trim())
                ? item.id.trim()
                : `${baseId}-v${idx + 1}`,
            label,
            price: itemPrice,
            availabilityNote,
            ...(safeVariantImage ? { image: safeVariantImage } : {}),
          };
        })
      : [
          {
            id: `${baseId}-v1`,
            label: unitLabel,
            price: parsedPrice,
            availabilityNote: tier === 'premium' ? 'Mitra Premium' : 'Siap Dipromosikan',
          },
        ];

  return {
    businessName,
    ownerName,
    productName,
    category,
    village,
    whatsapp: whatsappDigits,
    tier,
    status,
    price: variants[0]?.price ?? parsedPrice,
    unitLabel: variants[0]?.label ?? unitLabel,
    shortDescription,
    fullDescription: `${shortDescription} Dikelola oleh ${businessName} (${ownerName}) di ${village}, Kecamatan Cisaga.`.slice(
      0,
      1000
    ),
    image: safeImage,
    galleryImages: safeGallery,
    variants,
  };
}

export async function createAdminListingInFirestore(
  raw: AdminUmkmFormData
): Promise<UmkmListing> {
  const id = `umkm-adm-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`;
  const valid = buildValidatedAdminListingFields(raw, id);
  const createdAt = new Date().toISOString().slice(0, 10);
  const listing: UmkmListing = {
    id,
    ...valid,
    createdAt,
  };
  const docPath = `umkm_listings/${id}`;
  try {
    await setDoc(doc(db, 'umkm_listings', id), {
      ...listing,
      serverCreatedAt: serverTimestamp(),
    });
    return listing;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, docPath);
  }
}

export async function updateAdminListingInFirestore(
  existing: UmkmListing,
  raw: AdminUmkmFormData
): Promise<void> {
  const valid = buildValidatedAdminListingFields(raw, existing.id);
  const docPath = `umkm_listings/${existing.id}`;
  try {
    await updateDoc(doc(db, 'umkm_listings', existing.id), valid);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, docPath);
  }
}

export async function toggleListingTierInFirestore(existing: UmkmListing): Promise<UmkmTier> {
  const nextTier: UmkmTier = existing.tier === 'premium' ? 'reguler' : 'premium';
  const docPath = `umkm_listings/${existing.id}`;
  try {
    await updateDoc(doc(db, 'umkm_listings', existing.id), { tier: nextTier });
    return nextTier;
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, docPath);
  }
}

export async function toggleListingStatusInFirestore(existing: UmkmListing): Promise<UmkmStatus> {
  const nextStatus: UmkmStatus = existing.status === 'Aktif' ? 'Nonaktif' : 'Aktif';
  const docPath = `umkm_listings/${existing.id}`;
  try {
    await updateDoc(doc(db, 'umkm_listings', existing.id), { status: nextStatus });
    return nextStatus;
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, docPath);
  }
}

export async function deleteListingInFirestore(id: string): Promise<void> {
  const docPath = `umkm_listings/${id}`;
  try {
    await deleteDoc(doc(db, 'umkm_listings', id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, docPath);
  }
}
