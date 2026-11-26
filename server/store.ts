import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  CISAGA_VILLAGES,
  INITIAL_UMKM_LISTINGS,
  UMKM_IMAGE_PRESETS,
} from '../src/data/cisagaData.ts';
import type {
  AdminUmkmFormData,
  BusinessCategory,
  ContactMessage,
  ContactMessageFormData,
  ContactMessageStatus,
  ContactTopic,
  FreeRegistrationFormData,
  ProductVariant,
  UmkmListing,
  UmkmStatus,
  UmkmTier,
} from '../src/types/umkm.ts';
import {
  constantTimeEqual,
  hashPassword,
  validateLoginCredentialsInput,
  validateSetupPasswordInput,
  verifyScryptPassword,
} from './authUtils.ts';
import { UPLOAD_URL_PATH_REGEX } from './uploadUtils.ts';

interface ClaimedAdminRecord {
  username: string;
  passwordHash: string;
  claimedAt: string;
}

export class StoreHttpError extends Error {
  statusCode: number;

  constructor(statusCode: number, message: string) {
    super(message);
    this.statusCode = statusCode;
  }
}

const VALID_CATEGORIES: BusinessCategory[] = ['Kuliner', 'Kerajinan', 'Agribisnis', 'Busana'];
const VALID_TIERS: UmkmTier[] = ['premium', 'reguler'];
const VALID_STATUSES: UmkmStatus[] = ['Aktif', 'Menunggu Verifikasi', 'Nonaktif'];
const VALID_CONTACT_STATUSES: ContactMessageStatus[] = ['unread', 'read', 'replied'];
const VALID_VILLAGES = new Set(CISAGA_VILLAGES.map((v) => v.name));
const ALLOWED_IMAGE_URLS = new Set(UMKM_IMAGE_PRESETS.map((p) => p.url));

function sanitizeTextInput(raw: unknown, allowMultiline = false): string {
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

function normalizeContactStatus(raw: unknown): ContactMessageStatus | null {
  switch (raw) {
    case 'unread':
    case 'Baru':
      return 'unread';
    case 'read':
    case 'Dibaca':
      return 'read';
    case 'replied':
    case 'Selesai':
      return 'replied';
    default:
      return null;
  }
}

function isValidEmailAddress(email: string): boolean {
  if (!email || email.length > 120) return false;
  return /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(email);
}

function isValidIndonesianPhone(phone: string): boolean {
  const digits = phone.replace(/[^0-9]/g, '');
  return (
    digits.length >= 10 &&
    digits.length <= 15 &&
    (digits.startsWith('08') || digits.startsWith('62'))
  );
}

function isValidContactPhone(phone: string): boolean {
  const digits = phone.replace(/[^0-9]/g, '');
  return digits.length >= 8 && digits.length <= 15;
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

function isAllowedImageUrl(url: string): boolean {
  const trimmed = url.trim();
  return ALLOWED_IMAGE_URLS.has(trimmed) || UPLOAD_URL_PATH_REGEX.test(trimmed);
}

function resolveSafeImage(imageInput: string | undefined, category: BusinessCategory): string {
  const trimmed = (imageInput ?? '').trim();
  if (isAllowedImageUrl(trimmed)) {
    return trimmed;
  }
  return getDefaultImageForCategory(category);
}

function resolveSafeOptionalImage(imageInput: unknown): string | undefined {
  if (typeof imageInput !== 'string') return undefined;
  const trimmed = imageInput.trim();
  if (isAllowedImageUrl(trimmed)) {
    return trimmed;
  }
  return undefined;
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

export function isDirectoryWritable(dirPath: string): boolean {
  try {
    fs.mkdirSync(dirPath, { recursive: true });
    const probeFile = path.join(
      dirPath,
      `.write-probe-${process.pid}-${crypto.randomBytes(4).toString('hex')}`
    );
    fs.writeFileSync(probeFile, 'ok', 'utf8');
    fs.unlinkSync(probeFile);
    return true;
  } catch {
    return false;
  }
}

export function resolveWritableDataDir(
  preferredDir = path.resolve(process.cwd(), '.data'),
  fallbackDir = path.join(os.tmpdir(), 'cisagahub-data')
): string {
  if (isDirectoryWritable(preferredDir)) {
    return preferredDir;
  }
  if (isDirectoryWritable(fallbackDir)) {
    // Seed read-only data files into writable fallback once if not present yet
    try {
      for (const fileName of ['umkm-listings.json', 'contacts.json', 'contact-messages.json', 'admin-auth.json']) {
        const src = path.join(preferredDir, fileName);
        const dest = path.join(fallbackDir, fileName);
        if (fs.existsSync(src) && !fs.existsSync(dest)) {
          fs.copyFileSync(src, dest);
        }
      }
    } catch {
      // Seed copy failure falls back cleanly to built-in seeds
    }
    return fallbackDir;
  }
  return preferredDir;
}

export function createServerStore(dataDirInput = path.resolve(process.cwd(), '.data')) {
  const dataDir = resolveWritableDataDir(dataDirInput);
  const listingsPath = path.join(dataDir, 'umkm-listings.json');
  const authPath = path.join(dataDir, 'admin-auth.json');
  const contactsPath = path.join(dataDir, 'contacts.json');
  const legacyMessagesPath = path.join(dataDir, 'contact-messages.json');

  let memoryListings: UmkmListing[] | null = null;
  let memoryMessages: ContactMessage[] | null = null;
  let memoryClaimedAuth: ClaimedAdminRecord | null = null;

  const ensureDataDir = () => {
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
  };

  const writeJsonAtomic = (filePath: string, payload: unknown) => {
    try {
      ensureDataDir();
      const serialized = JSON.stringify(payload, null, 2);
      const tmpPath = `${filePath}.${process.pid}.${Date.now()}.tmp`;
      fs.writeFileSync(tmpPath, serialized, 'utf8');
      try {
        fs.renameSync(tmpPath, filePath);
      } catch {
        fs.writeFileSync(filePath, serialized, 'utf8');
        try {
          fs.unlinkSync(tmpPath);
        } catch {
          // Ignore tmp cleanup error
        }
      }
    } catch {
      // Keep in-memory state consistent even if disk write fails in constrained runtimes
    }
  };

  const readListings = (): UmkmListing[] => {
    try {
      if (fs.existsSync(listingsPath)) {
        const raw = fs.readFileSync(listingsPath, 'utf8');
        const parsed = JSON.parse(raw) as unknown;
        if (Array.isArray(parsed)) {
          let migrated = false;
          const items = (parsed as UmkmListing[]).map((item) => {
            if (
              item &&
              item.id === 'hampers-karya-cisaga' &&
              item.businessName === 'Sentra Promosi HERA Cisaga'
            ) {
              migrated = true;
              return { ...item, businessName: 'Sentra Promosi CISAGA HUB' };
            }
            return item;
          });
          if (migrated) {
            writeJsonAtomic(listingsPath, items);
          }
          memoryListings = items;
          return items;
        }
      }
    } catch {
      // Fall back to memory or seed data if file is missing or unreadable
    }
    if (memoryListings) return memoryListings;
    const seeded = [...INITIAL_UMKM_LISTINGS];
    memoryListings = seeded;
    writeJsonAtomic(listingsPath, seeded);
    return seeded;
  };

  const writeListings = (listings: UmkmListing[]) => {
    memoryListings = listings;
    writeJsonAtomic(listingsPath, listings);
  };

  const normalizeContactRecord = (raw: unknown): ContactMessage | null => {
    if (!raw || typeof raw !== 'object') return null;
    const obj = raw as Record<string, unknown>;
    const id = typeof obj.id === 'string' && obj.id.trim() ? obj.id.trim() : '';
    const name = sanitizeTextInput(obj.name ?? obj.senderName, false);
    const email = sanitizeTextInput(obj.email, false);
    const whatsapp = typeof obj.whatsapp === 'string' ? obj.whatsapp.replace(/[^0-9]/g, '') : '';
    const subject = sanitizeTextInput(obj.subject, false) || 'Pertanyaan Umum';
    const message = sanitizeTextInput(obj.message, true);
    const status = normalizeContactStatus(obj.status) ?? 'unread';
    const createdAtRaw = obj.created_at ?? obj.createdAt;
    const created_at =
      typeof createdAtRaw === 'string' && !Number.isNaN(Date.parse(createdAtRaw))
        ? createdAtRaw
        : new Date().toISOString();

    if (!id || !name || !message) return null;
    return {
      id,
      name,
      email,
      whatsapp,
      subject,
      message,
      status,
      created_at,
    };
  };

  const readMessages = (): ContactMessage[] => {
    try {
      const targetPath = fs.existsSync(contactsPath)
        ? contactsPath
        : fs.existsSync(legacyMessagesPath)
          ? legacyMessagesPath
          : null;
      if (targetPath) {
        const raw = fs.readFileSync(targetPath, 'utf8');
        const parsed = JSON.parse(raw) as unknown;
        if (Array.isArray(parsed)) {
          const normalized = parsed
            .map(normalizeContactRecord)
            .filter((item): item is ContactMessage => item !== null)
            .sort(
              (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
            );
          if (targetPath === legacyMessagesPath && !fs.existsSync(contactsPath)) {
            writeJsonAtomic(contactsPath, normalized);
          }
          memoryMessages = normalized;
          return normalized;
        }
      }
    } catch {
      // Return memory or empty inbox if file is missing or unreadable
    }
    return memoryMessages ?? [];
  };

  const writeMessages = (messages: ContactMessage[]) => {
    memoryMessages = messages;
    writeJsonAtomic(contactsPath, messages);
  };

  const readClaimedAuth = (): ClaimedAdminRecord | null => {
    try {
      if (!fs.existsSync(authPath)) return memoryClaimedAuth;
      const raw = fs.readFileSync(authPath, 'utf8');
      const parsed = JSON.parse(raw) as Partial<ClaimedAdminRecord>;
      if (
        typeof parsed.username === 'string' &&
        typeof parsed.passwordHash === 'string' &&
        parsed.passwordHash.includes(':')
      ) {
        const record: ClaimedAdminRecord = {
          username: parsed.username,
          passwordHash: parsed.passwordHash,
          claimedAt: typeof parsed.claimedAt === 'string' ? parsed.claimedAt : '',
        };
        memoryClaimedAuth = record;
        return record;
      }
      return memoryClaimedAuth;
    } catch {
      return memoryClaimedAuth;
    }
  };

  const resolveExpectedUsername = (envUsername?: string): string => {
    const trimmed = (envUsername ?? '').trim();
    return trimmed.length > 0 ? trimmed : 'admin';
  };

  const getAuthConfig = (envUsername?: string, envPassword?: string) => {
    const username = resolveExpectedUsername(envUsername);
    const hasEnvPassword = typeof envPassword === 'string' && envPassword.trim().length > 0;
    if (hasEnvPassword) {
      return { mode: 'login' as const, username, source: 'env' as const };
    }
    const claimed = readClaimedAuth();
    if (claimed) {
      return { mode: 'login' as const, username, source: 'claimed' as const };
    }
    return { mode: 'setup' as const, username, source: 'unclaimed' as const };
  };

  const claimInitialPassword = (
    username: string,
    password: string,
    confirmPassword: string,
    envUsername?: string,
    envPassword?: string
  ): { username: string } => {
    const config = getAuthConfig(envUsername, envPassword);
    if (config.mode !== 'setup') {
      throw new StoreHttpError(
        409,
        'Akun admin developer sudah diaktivasi sebelumnya. Silakan login.'
      );
    }

    const validationError = validateSetupPasswordInput(
      username,
      password,
      confirmPassword,
      config.username
    );
    if (validationError) {
      throw new StoreHttpError(400, validationError);
    }

    const record: ClaimedAdminRecord = {
      username: config.username,
      passwordHash: hashPassword(password),
      claimedAt: new Date().toISOString(),
    };
    memoryClaimedAuth = record;
    writeJsonAtomic(authPath, record);
    return { username: config.username };
  };

  const verifyLogin = (
    username: string,
    password: string,
    envUsername?: string,
    envPassword?: string
  ): { username: string } => {
    const validationError = validateLoginCredentialsInput(username, password);
    if (validationError) {
      throw new StoreHttpError(400, validationError);
    }

    const expectedUsername = resolveExpectedUsername(envUsername);
    const usernameMatches = constantTimeEqual(
      username.trim().toLowerCase(),
      expectedUsername.toLowerCase()
    );

    const hasEnvPassword = typeof envPassword === 'string' && envPassword.trim().length > 0;
    if (hasEnvPassword) {
      const passwordMatches = constantTimeEqual(password, envPassword.trim());
      if (!usernameMatches || !passwordMatches) {
        throw new StoreHttpError(401, 'Username atau password admin tidak sesuai.');
      }
      return { username: expectedUsername };
    }

    const claimed = readClaimedAuth();
    if (!claimed) {
      throw new StoreHttpError(
        409,
        'Password admin developer belum diaktivasi. Silakan buat password terlebih dahulu.'
      );
    }

    const passwordMatches = verifyScryptPassword(password, claimed.passwordHash);
    if (!usernameMatches || !passwordMatches) {
      throw new StoreHttpError(401, 'Username atau password admin tidak sesuai.');
    }

    return { username: expectedUsername };
  };

  const getAllListings = (): UmkmListing[] => readListings();

  const getPublicActiveListings = (): UmkmListing[] =>
    readListings().filter((item) => item.status === 'Aktif');

  const createFreeRegistration = (raw: Partial<FreeRegistrationFormData>): UmkmListing => {
    const businessName = typeof raw.businessName === 'string' ? raw.businessName.trim() : '';
    const ownerName = typeof raw.ownerName === 'string' ? raw.ownerName.trim() : '';
    const village = typeof raw.village === 'string' ? raw.village.trim() : '';
    const category = VALID_CATEGORIES.includes(raw.category as BusinessCategory)
      ? (raw.category as BusinessCategory)
      : null;
    const whatsapp = typeof raw.whatsapp === 'string' ? raw.whatsapp.trim() : '';
    const signatureProduct =
      typeof raw.signatureProduct === 'string' ? raw.signatureProduct.trim() : '';
    const parsedPrice = Number(raw.estimatedPrice);

    if (businessName.length < 3 || ownerName.length < 3) {
      throw new StoreHttpError(400, 'Nama usaha dan nama pemilik minimal 3 karakter.');
    }
    if (!VALID_VILLAGES.has(village)) {
      throw new StoreHttpError(400, 'Pilih desa asal yang valid di Kecamatan Cisaga.');
    }
    if (!category) {
      throw new StoreHttpError(400, 'Kategori usaha tidak valid.');
    }
    if (!isValidIndonesianPhone(whatsapp)) {
      throw new StoreHttpError(400, 'Masukkan nomor WhatsApp aktif yang valid.');
    }
    if (signatureProduct.length < 4) {
      throw new StoreHttpError(400, 'Produk unggulan minimal 4 karakter.');
    }
    if (Number.isNaN(parsedPrice) || parsedPrice < 1000) {
      throw new StoreHttpError(400, 'Kisaran harga minimal Rp1.000.');
    }

    const id = `umkm-free-${Date.now()}`;
    const price = Math.round(parsedPrice);
    const created: UmkmListing = {
      id,
      businessName,
      ownerName,
      productName: signatureProduct,
      category,
      village,
      whatsapp: whatsapp.replace(/[^0-9]/g, ''),
      tier: 'reguler',
      status: 'Menunggu Verifikasi',
      price,
      unitLabel: 'Kemasan Standar',
      shortDescription: `Produk lokal ${village} dari ${businessName} kategori ${category}.`,
      fullDescription: `${signatureProduct} diproduksi langsung oleh ${businessName} (${ownerName}) di ${village}, Kecamatan Cisaga.`,
      image: getDefaultImageForCategory(category),
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

    const current = readListings();
    writeListings([created, ...current]);
    return created;
  };

  const validateAdminPayload = (raw: Partial<AdminUmkmFormData>) => {
    const businessName = typeof raw.businessName === 'string' ? raw.businessName.trim() : '';
    const ownerName = typeof raw.ownerName === 'string' ? raw.ownerName.trim() : '';
    const productName = typeof raw.productName === 'string' ? raw.productName.trim() : '';
    const village = typeof raw.village === 'string' ? raw.village.trim() : '';
    const category = VALID_CATEGORIES.includes(raw.category as BusinessCategory)
      ? (raw.category as BusinessCategory)
      : null;
    const tier = VALID_TIERS.includes(raw.tier as UmkmTier) ? (raw.tier as UmkmTier) : null;
    const status = VALID_STATUSES.includes(raw.status as UmkmStatus)
      ? (raw.status as UmkmStatus)
      : null;
    const whatsapp = typeof raw.whatsapp === 'string' ? raw.whatsapp.trim() : '';
    const parsedPrice = Number(raw.price);
    const unitLabel =
      typeof raw.unitLabel === 'string' && raw.unitLabel.trim().length > 0
        ? raw.unitLabel.trim()
        : 'Kemasan Standar';
    const shortDescription =
      typeof raw.shortDescription === 'string' ? raw.shortDescription.trim() : '';

    if (businessName.length < 3 || ownerName.length < 3 || productName.length < 3) {
      throw new StoreHttpError(400, 'Nama usaha, pemilik, dan produk minimal 3 karakter.');
    }
    if (!VALID_VILLAGES.has(village)) {
      throw new StoreHttpError(400, 'Desa asal harus berada di wilayah Kecamatan Cisaga.');
    }
    if (!category || !tier || !status) {
      throw new StoreHttpError(400, 'Kategori, paket promosi, atau status publikasi tidak valid.');
    }
    if (!isValidIndonesianPhone(whatsapp)) {
      throw new StoreHttpError(400, 'Masukkan nomor WhatsApp aktif yang valid.');
    }
    if (Number.isNaN(parsedPrice) || parsedPrice < 1000) {
      throw new StoreHttpError(400, 'Harga kisaran minimal Rp1.000.');
    }
    if (shortDescription.length < 10) {
      throw new StoreHttpError(400, 'Deskripsi singkat minimal 10 karakter.');
    }

    const safePrimaryImage = resolveSafeImage(raw.image, category);
    const safeGalleryImages = resolveSafeGalleryImages(raw.galleryImages, safePrimaryImage);

    let parsedVariants: Array<{
      id?: string;
      label: string;
      price: number;
      availabilityNote: string;
      image?: string;
    }> | null = null;

    if (Array.isArray(raw.variants) && raw.variants.length > 0) {
      if (raw.variants.length > 25) {
        throw new StoreHttpError(400, 'Maksimal 25 item menu atau layanan per UMKM.');
      }
      parsedVariants = raw.variants.map((item) => {
        const label = typeof item?.label === 'string' ? item.label.trim() : '';
        const itemPrice = Number(item?.price);
        const availabilityNote =
          typeof item?.availabilityNote === 'string' && item.availabilityNote.trim().length > 0
            ? item.availabilityNote.trim().slice(0, 60)
            : 'Tersedia';
        const rawVariantId =
          typeof item?.id === 'string' && /^[a-zA-Z0-9_-]{1,80}$/.test(item.id.trim())
            ? item.id.trim()
            : undefined;
        const safeVariantImage = resolveSafeOptionalImage(item?.image);

        if (label.length < 2 || label.length > 80) {
          throw new StoreHttpError(400, 'Setiap nama menu atau layanan harus 2–80 karakter.');
        }
        if (Number.isNaN(itemPrice) || itemPrice < 1000) {
          throw new StoreHttpError(400, 'Setiap harga menu atau layanan minimal Rp1.000.');
        }

        return {
          id: rawVariantId,
          label,
          price: Math.round(itemPrice),
          availabilityNote,
          ...(safeVariantImage ? { image: safeVariantImage } : {}),
        };
      });
    }

    return {
      businessName,
      ownerName,
      productName,
      village,
      category,
      tier,
      status,
      whatsapp: whatsapp.replace(/[^0-9]/g, ''),
      price: Math.round(parsedPrice),
      unitLabel,
      shortDescription,
      image: safePrimaryImage,
      galleryImages: safeGalleryImages,
      variants: parsedVariants,
    };
  };

  const createAdminListing = (raw: Partial<AdminUmkmFormData>): UmkmListing => {
    const valid = validateAdminPayload(raw);
    const id = `umkm-adm-${Date.now()}`;
    const variants: ProductVariant[] =
      valid.variants && valid.variants.length > 0
        ? valid.variants.map((item, idx) => ({
            id: item.id ?? `${id}-v${idx + 1}`,
            label: item.label,
            price: item.price,
            availabilityNote: item.availabilityNote,
            ...(item.image ? { image: item.image } : {}),
          }))
        : [
            {
              id: `${id}-v1`,
              label: valid.unitLabel,
              price: valid.price,
              availabilityNote: valid.tier === 'premium' ? 'Mitra Premium' : 'Siap Dipromosikan',
            },
          ];

    const created: UmkmListing = {
      id,
      businessName: valid.businessName,
      ownerName: valid.ownerName,
      productName: valid.productName,
      category: valid.category,
      village: valid.village,
      whatsapp: valid.whatsapp,
      tier: valid.tier,
      status: valid.status,
      price: variants[0]?.price ?? valid.price,
      unitLabel: variants[0]?.label ?? valid.unitLabel,
      shortDescription: valid.shortDescription,
      fullDescription: `${valid.shortDescription} Dikelola oleh ${valid.businessName} (${valid.ownerName}) di ${valid.village}, Kecamatan Cisaga.`,
      image: valid.image,
      ...(valid.galleryImages.length > 0 ? { galleryImages: valid.galleryImages } : {}),
      createdAt: new Date().toISOString().slice(0, 10),
      variants,
    };

    const current = readListings();
    writeListings([created, ...current]);
    return created;
  };

  const updateAdminListing = (id: string, raw: Partial<AdminUmkmFormData>): UmkmListing => {
    const current = readListings();
    const existing = current.find((item) => item.id === id);
    if (!existing) {
      throw new StoreHttpError(404, 'Data UMKM tidak ditemukan.');
    }

    const valid = validateAdminPayload(raw);
    const variants: ProductVariant[] =
      valid.variants && valid.variants.length > 0
        ? valid.variants.map((item, idx) => ({
            id: item.id ?? `${existing.id}-v${idx + 1}`,
            label: item.label,
            price: item.price,
            availabilityNote: item.availabilityNote,
            ...(item.image ? { image: item.image } : {}),
          }))
        : existing.variants.map((v, idx) =>
            idx === 0 ? { ...v, label: valid.unitLabel, price: valid.price } : v
          );

    const updated: UmkmListing = {
      ...existing,
      businessName: valid.businessName,
      ownerName: valid.ownerName,
      productName: valid.productName,
      category: valid.category,
      village: valid.village,
      whatsapp: valid.whatsapp,
      tier: valid.tier,
      status: valid.status,
      price: variants[0]?.price ?? valid.price,
      unitLabel: variants[0]?.label ?? valid.unitLabel,
      shortDescription: valid.shortDescription,
      fullDescription: `${valid.shortDescription} Dikelola oleh ${valid.businessName} (${valid.ownerName}) di ${valid.village}, Kecamatan Cisaga.`,
      image: valid.image,
      galleryImages: valid.galleryImages,
      variants,
    };

    writeListings(current.map((item) => (item.id === id ? updated : item)));
    return updated;
  };

  const toggleTier = (id: string): UmkmListing => {
    const current = readListings();
    const existing = current.find((item) => item.id === id);
    if (!existing) {
      throw new StoreHttpError(404, 'Data UMKM tidak ditemukan.');
    }
    const updated: UmkmListing = {
      ...existing,
      tier: existing.tier === 'premium' ? 'reguler' : 'premium',
    };
    writeListings(current.map((item) => (item.id === id ? updated : item)));
    return updated;
  };

  const cycleStatus = (id: string): UmkmListing => {
    const current = readListings();
    const existing = current.find((item) => item.id === id);
    if (!existing) {
      throw new StoreHttpError(404, 'Data UMKM tidak ditemukan.');
    }
    const nextStatus: UmkmStatus = existing.status === 'Aktif' ? 'Nonaktif' : 'Aktif';
    const updated: UmkmListing = {
      ...existing,
      status: nextStatus,
    };
    writeListings(current.map((item) => (item.id === id ? updated : item)));
    return updated;
  };

  const deleteListing = (id: string): void => {
    const current = readListings();
    if (!current.some((item) => item.id === id)) {
      throw new StoreHttpError(404, 'Data UMKM tidak ditemukan.');
    }
    writeListings(current.filter((item) => item.id !== id));
  };

  const listContactMessages = (): ContactMessage[] => readMessages();

  const createContactMessage = (
    raw: Partial<ContactMessageFormData> & { senderName?: unknown }
  ): ContactMessage => {
    const honeypot = typeof raw.website === 'string' ? raw.website.trim() : '';
    if (honeypot.length > 0) {
      throw new StoreHttpError(400, 'Permintaan ditolak oleh sistem proteksi spam.');
    }

    const name = sanitizeTextInput(raw.name ?? raw.senderName, false);
    const email = sanitizeTextInput(raw.email, false);
    const whatsappRaw = typeof raw.whatsapp === 'string' ? raw.whatsapp.trim() : '';
    const whatsappDigits = whatsappRaw.replace(/[^0-9]/g, '');
    const subject = sanitizeTextInput(raw.subject, false);
    const message = sanitizeTextInput(raw.message, true);

    if (name.length < 2 || name.length > 80) {
      throw new StoreHttpError(400, 'Nama pengirim harus 2–80 karakter.');
    }
    if (!isValidEmailAddress(email)) {
      throw new StoreHttpError(400, 'Masukkan alamat email yang valid.');
    }
    if (whatsappDigits.length > 0 && !isValidContactPhone(whatsappRaw)) {
      throw new StoreHttpError(400, 'Nomor WhatsApp harus berisi 8–15 digit angka jika diisi.');
    }
    if (subject.length < 2 || subject.length > 120) {
      throw new StoreHttpError(400, 'Subjek pesan harus 2–120 karakter.');
    }
    if (message.length < 2 || message.length > 1500) {
      throw new StoreHttpError(400, 'Isi pesan harus 2–1.500 karakter.');
    }

    const randomSuffix = Math.random().toString(36).slice(2, 6);
    const created: ContactMessage = {
      id: `cnt-${Date.now()}-${randomSuffix}`,
      name,
      email,
      whatsapp: whatsappDigits,
      subject,
      message,
      status: 'unread',
      created_at: new Date().toISOString(),
    };

    const current = readMessages();
    writeMessages([created, ...current].slice(0, 500));
    return created;
  };

  const updateContactMessageStatus = (id: string, rawStatus: unknown): ContactMessage => {
    const status = normalizeContactStatus(rawStatus);
    if (!status || !VALID_CONTACT_STATUSES.includes(status)) {
      throw new StoreHttpError(400, 'Status pesan tidak valid.');
    }
    const current = readMessages();
    const existing = current.find((item) => item.id === id);
    if (!existing) {
      throw new StoreHttpError(404, 'Pesan tidak ditemukan.');
    }
    const updated: ContactMessage = { ...existing, status };
    writeMessages(current.map((item) => (item.id === id ? updated : item)));
    return updated;
  };

  const deleteContactMessage = (id: string): void => {
    const current = readMessages();
    if (!current.some((item) => item.id === id)) {
      throw new StoreHttpError(404, 'Pesan tidak ditemukan.');
    }
    writeMessages(current.filter((item) => item.id !== id));
  };

  return {
    getDataDir: () => dataDir,
    getAuthConfig,
    claimInitialPassword,
    verifyLogin,
    getAllListings,
    getPublicActiveListings,
    createFreeRegistration,
    createAdminListing,
    updateAdminListing,
    toggleTier,
    cycleStatus,
    deleteListing,
    listContactMessages,
    createContactMessage,
    updateContactMessageStatus,
    deleteContactMessage,
  };
}
