import test from 'node:test';
import assert from 'node:assert/strict';
import { INITIAL_UMKM_LISTINGS } from '../data/cisagaData';
import {
  buildWhatsAppUrl,
  createAdminListingEntry,
  createFreeListingEntry,
  cycleListingStatus,
  deleteListingById,
  filterAndSortListings,
  formatRupiah,
  getListingAllImages,
  getPremiumTopListings,
  isDeveloperAdminPath,
  toggleListingTier,
  updateAdminListingEntry,
  validateAdminUmkmForm,
  validateContactMessageForm,
  validateFreeRegistrationForm,
} from './umkmLogic';

test('getPremiumTopListings returns only active premium listings and featured sort places premium first', () => {
  const premium = getPremiumTopListings(INITIAL_UMKM_LISTINGS);
  assert.equal(premium.length, 3);
  assert.ok(premium.every((item) => item.tier === 'premium' && item.status === 'Aktif'));

  const sortedAll = filterAndSortListings(INITIAL_UMKM_LISTINGS, {
    category: 'Semua',
    tierFilter: 'all',
    village: 'Semua Desa',
    query: '',
    sortBy: 'featured',
  });
  assert.equal(sortedAll[0].tier, 'premium');
  assert.equal(sortedAll[2].tier, 'premium');
  assert.equal(sortedAll[3].tier, 'reguler');
});

test('admin tier toggle, status toggle, and delete update listings accurately', () => {
  const saleItem = INITIAL_UMKM_LISTINGS.find((i) => i.id === 'sale-pisang-wangunjaya')!;
  assert.equal(saleItem.tier, 'reguler');

  // Upgrade reguler to premium -> now appears in getPremiumTopListings
  const upgraded = toggleListingTier(INITIAL_UMKM_LISTINGS, saleItem.id);
  assert.equal(getPremiumTopListings(upgraded).length, 4);

  // Deactivate an active item -> excluded from public active premium list
  const deactivated = cycleListingStatus(upgraded, saleItem.id);
  assert.equal(getPremiumTopListings(deactivated).length, 3);

  // Delete removes item completely
  const afterDelete = deleteListingById(deactivated, saleItem.id);
  assert.equal(afterDelete.length, INITIAL_UMKM_LISTINGS.length - 1);
});

test('admin and free registration forms validate inputs and create proper tier entries', () => {
  const invalidAdmin = validateAdminUmkmForm({
    businessName: '',
    ownerName: 'A',
    productName: 'K',
    category: 'Kuliner',
    village: '',
    whatsapp: '123',
    tier: 'premium',
    status: 'Aktif',
    price: '500',
    unitLabel: '',
    shortDescription: 'Pendek',
    image: '',
  });
  assert.ok(invalidAdmin.businessName);
  assert.ok(invalidAdmin.village);
  assert.ok(invalidAdmin.whatsapp);
  assert.ok(invalidAdmin.price);
  assert.ok(invalidAdmin.shortDescription);

  const createdAdmin = createAdminListingEntry({
    businessName: 'Opak Ketan Cisaga',
    ownerName: 'H. Rahmat',
    productName: 'Opak Bakar Khas Cisaga',
    category: 'Kuliner',
    village: 'Desa Cisaga',
    whatsapp: '081322445566',
    tier: 'premium',
    status: 'Aktif',
    price: '25000',
    unitLabel: 'Bungkus 250g',
    shortDescription: 'Opak ketan gurih dibakar di atas bara arang kelapa tradisional.',
    image: '',
  });
  assert.equal(createdAdmin.tier, 'premium');
  assert.equal(createdAdmin.status, 'Aktif');
  assert.equal(createdAdmin.price, 25000);

  const invalidFree = validateFreeRegistrationForm({
    businessName: 'AB',
    ownerName: 'C',
    village: '',
    category: 'Kuliner',
    whatsapp: '081',
    signatureProduct: 'Ku',
    estimatedPrice: '100',
  });
  assert.ok(invalidFree.businessName);
  assert.ok(invalidFree.estimatedPrice);

  const createdFree = createFreeListingEntry({
    businessName: 'Kerupuk Melarat Cisaga',
    ownerName: 'Ibu Nani',
    village: 'Desa Wangunjaya',
    category: 'Kuliner',
    whatsapp: '085211334455',
    signatureProduct: 'Kerupuk Pasir Warna',
    estimatedPrice: '15000',
  });
  assert.equal(createdFree.tier, 'reguler');
  assert.equal(createdFree.status, 'Menunggu Verifikasi');
});

test('admin menu/service items and uploaded gallery photos are preserved and searchable', () => {
  const created = createAdminListingEntry({
    businessName: 'Warung Liwet Cisaga',
    ownerName: 'Teh Sari',
    productName: 'Aneka Masakan Sunda & Catering',
    category: 'Kuliner',
    village: 'Desa Cisaga',
    whatsapp: '081234567890',
    tier: 'premium',
    status: 'Aktif',
    price: '22000',
    unitLabel: 'Paket Liwet Pribadi',
    shortDescription: 'Sajian liwet kastrol autentik dengan pilihan lauk dan paket prasmanan.',
    image: '/uploads/umkm-12345-abcdef.jpg',
    galleryImages: [
      '/uploads/umkm-12345-gallery1.png',
      'javascript:alert(1)', // unsafe URL must be ignored
    ],
    variants: [
      {
        label: 'Paket Nasi Liwet Ayam Bakar',
        price: '28000',
        availabilityNote: 'Tersedia Harian',
        image: '/uploads/umkm-12345-menu1.webp',
      },
      {
        label: 'Layanan Catering Rapat 20 Porsi',
        price: '450000',
        availabilityNote: 'Pre-order 1 Hari',
      },
    ],
  });

  assert.equal(created.image, '/uploads/umkm-12345-abcdef.jpg');
  assert.deepEqual(created.galleryImages, ['/uploads/umkm-12345-gallery1.png']);
  assert.equal(created.variants.length, 2);
  assert.equal(created.variants[1].label, 'Layanan Catering Rapat 20 Porsi');
  assert.equal(created.variants[1].price, 450000);

  const allPhotos = getListingAllImages(created);
  assert.deepEqual(allPhotos, [
    '/uploads/umkm-12345-abcdef.jpg',
    '/uploads/umkm-12345-gallery1.png',
    '/uploads/umkm-12345-menu1.webp',
  ]);

  // Search by menu/service name finds the listing
  const searchMatch = filterAndSortListings([created], {
    category: 'Semua',
    tierFilter: 'all',
    village: 'Semua Desa',
    query: 'Catering Rapat',
    sortBy: 'featured',
  });
  assert.equal(searchMatch.length, 1);

  // Updating listing preserves edited menu items
  const updated = updateAdminListingEntry(created, {
    businessName: created.businessName,
    ownerName: created.ownerName,
    productName: created.productName,
    category: created.category,
    village: created.village,
    whatsapp: created.whatsapp,
    tier: created.tier,
    status: created.status,
    price: '30000',
    unitLabel: 'Paket Nasi Liwet Ayam Bakar',
    shortDescription: created.shortDescription,
    image: created.image,
    galleryImages: [],
    variants: [
      { label: 'Paket Nasi Liwet Ayam Bakar', price: '30000', availabilityNote: 'Siap Antar' },
      { label: 'Jasa Nasi Box Syukuran', price: '25000', availabilityNote: 'Minimal 10 Box' },
      { label: 'Sambal Dadak Botolan', price: '18000', availabilityNote: 'Ready Stok' },
    ],
  });
  assert.equal(updated.variants.length, 3);
  assert.equal(updated.variants[2].label, 'Sambal Dadak Botolan');
});

test('formatRupiah and buildWhatsAppUrl format cleanly', () => {
  assert.equal(formatRupiah(165000), 'Rp165.000');
  assert.equal(
    buildWhatsAppUrl('0812-3456-7890', 'Tes'),
    'https://wa.me/6281234567890?text=Tes'
  );
  assert.equal(
    buildWhatsAppUrl('81234567890', 'Halo'),
    'https://wa.me/6281234567890?text=Halo'
  );
});

test('validateContactMessageForm validates name, email, optional whatsapp, subject, and message length', () => {
  const invalid = validateContactMessageForm({
    name: 'A',
    email: 'bukan-email',
    whatsapp: '123',
    subject: 'X',
    message: 'A',
  });
  assert.ok(invalid.name);
  assert.ok(invalid.email);
  assert.ok(invalid.whatsapp);
  assert.ok(invalid.subject);
  assert.ok(invalid.message);

  const missingEmail = validateContactMessageForm({
    name: 'Dede',
    email: '',
    whatsapp: '081234567890',
    subject: 'Pertanyaan Umum',
    message: 'Tes',
  });
  assert.ok(missingEmail.email);

  const validEmailOnly = validateContactMessageForm({
    name: 'Siti Rahma',
    email: 'siti@contoh.id',
    whatsapp: '',
    subject: 'Permintaan Kemitraan Produk',
    message: 'Halo admin',
  });
  assert.deepEqual(validEmailOnly, {});

  const validWithOptionalWhatsapp = validateContactMessageForm({
    name: 'Dede Kurniawan',
    email: 'dede@contoh.id',
    whatsapp: '81234567890',
    subject: 'Promosi UMKM Premium',
    message: 'Tes pesan singkat',
  });
  assert.deepEqual(validWithOptionalWhatsapp, {});
});

test('isDeveloperAdminPath grants admin view entry only on dedicated developer paths', () => {
  assert.equal(isDeveloperAdminPath('/'), false);
  assert.equal(isDeveloperAdminPath('/katalog'), false);
  assert.equal(isDeveloperAdminPath('/admin'), true);
  assert.equal(isDeveloperAdminPath('/admin/'), true);
  assert.equal(isDeveloperAdminPath('/portal-developer'), true);
});

