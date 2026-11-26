import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import {
  createSessionToken,
  extractBearerToken,
  hashPassword,
  verifyScryptPassword,
  verifySessionToken,
} from './authUtils.ts';
import { createServerStore, resolveWritableDataDir } from './store.ts';

test('scrypt password hashing and verification succeed only for matching password', () => {
  const hashed = hashPassword('CisagaDev#2026');
  assert.equal(verifyScryptPassword('CisagaDev#2026', hashed), true);
  assert.equal(verifyScryptPassword('salah-password', hashed), false);
  assert.equal(verifyScryptPassword('CisagaDev#2026', 'malformed'), false);
});

test('HMAC session token creation, verification, and expiration checks work cleanly', () => {
  const secret = 'test-signing-secret-key';
  const token = createSessionToken('admin', secret, 60_000);

  const verified = verifySessionToken(token, secret, 'admin');
  assert.ok(verified);
  assert.equal(verified.sub, 'admin');
  assert.equal(verified.role, 'developer_admin');

  assert.equal(verifySessionToken(token, 'wrong-secret', 'admin'), null);
  assert.equal(verifySessionToken(`${token}tamper`, secret, 'admin'), null);
  assert.equal(verifySessionToken(token, secret, 'otheruser'), null);

  const expiredToken = createSessionToken('admin', secret, -1000);
  assert.equal(verifySessionToken(expiredToken, secret, 'admin'), null);

  assert.equal(extractBearerToken(`Bearer ${token}`), token);
  assert.equal(extractBearerToken('Basic abc123'), null);
});

test('server store handles one-time developer setup, login verification, and env override', () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'hera-auth-test-'));
  try {
    const store = createServerStore(tempDir);

    // Unclaimed without env password -> setup mode
    const initialConfig = store.getAuthConfig(undefined, undefined);
    assert.equal(initialConfig.mode, 'setup');
    assert.equal(initialConfig.username, 'admin');

    // Claiming with non-admin username fails
    assert.throws(
      () => store.claimInitialPassword('bukanadmin', 'Rahasia123', 'Rahasia123', undefined, undefined),
      /Username developer harus "admin"/
    );

    // Valid one-time claim succeeds and locks further setup
    const claimed = store.claimInitialPassword('admin', 'Rahasia123', 'Rahasia123', undefined, undefined);
    assert.equal(claimed.username, 'admin');
    assert.equal(store.getAuthConfig(undefined, undefined).mode, 'login');

    assert.throws(
      () => store.claimInitialPassword('admin', 'BaruLagi123', 'BaruLagi123', undefined, undefined),
      /sudah diaktivasi/
    );

    // Login verifies claimed hash
    const loggedIn = store.verifyLogin('admin', 'Rahasia123', undefined, undefined);
    assert.equal(loggedIn.username, 'admin');
    assert.throws(
      () => store.verifyLogin('admin', 'SalahPassword', undefined, undefined),
      /tidak sesuai/
    );

    // Configured env password always overrides claimed fallback hash
    assert.equal(store.getAuthConfig('admin', 'EnvSecret999').mode, 'login');
    assert.equal(store.verifyLogin('admin', 'EnvSecret999', 'admin', 'EnvSecret999').username, 'admin');
    assert.throws(
      () => store.verifyLogin('admin', 'Rahasia123', 'admin', 'EnvSecret999'),
      /tidak sesuai/
    );
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});

test('server store enforces public active filtering vs admin CRUD operations', () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'hera-store-test-'));
  try {
    const store = createServerStore(tempDir);
    assert.equal(store.getPublicActiveListings().length, 6);

    // Public free registration creates Reguler + Menunggu Verifikasi (hidden from public until admin activates)
    const pendingFree = store.createFreeRegistration({
      businessName: 'Keripik Cisaga',
      ownerName: 'Ibu Ani',
      village: 'Desa Cisaga',
      category: 'Kuliner',
      whatsapp: '081234567890',
      signatureProduct: 'Keripik Talas Renyah',
      estimatedPrice: '15000',
    });
    assert.equal(pendingFree.tier, 'reguler');
    assert.equal(pendingFree.status, 'Menunggu Verifikasi');
    assert.equal(store.getAllListings().length, 7);
    assert.equal(store.getPublicActiveListings().length, 6);

    // Admin activates pending free listing and upgrades to premium
    const activated = store.cycleStatus(pendingFree.id);
    assert.equal(activated.status, 'Aktif');
    assert.equal(store.getPublicActiveListings().length, 7);

    const promoted = store.toggleTier(pendingFree.id);
    assert.equal(promoted.tier, 'premium');

    // Admin deletes listing
    store.deleteListing(pendingFree.id);
    assert.equal(store.getAllListings().length, 6);
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});

test('server store preserves registered UMKM data while migrating built-in HERA seed name to CISAGA HUB', () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cisagahub-migrate-test-'));
  try {
    const seedStore = createServerStore(tempDir);
    const customListing = seedStore.createFreeRegistration({
      businessName: 'Usaha Terdaftar Lama',
      ownerName: 'Pak Budi',
      village: 'Desa Bangunharja',
      category: 'Agribisnis',
      whatsapp: '081299887766',
      signatureProduct: 'Madu Hutan Asli',
      estimatedPrice: '65000',
    });

    // Simulate legacy persisted seed brand name on built-in entry
    const listingsFile = path.join(tempDir, 'umkm-listings.json');
    const saved = JSON.parse(fs.readFileSync(listingsFile, 'utf8')) as Array<{
      id: string;
      businessName: string;
    }>;
    const updatedSeed = saved.map((item) =>
      item.id === 'hampers-karya-cisaga'
        ? { ...item, businessName: 'Sentra Promosi HERA Cisaga' }
        : item
    );
    fs.writeFileSync(listingsFile, JSON.stringify(updatedSeed, null, 2), 'utf8');

    const reloadedStore = createServerStore(tempDir);
    const allListings = reloadedStore.getAllListings();
    assert.equal(allListings.length, 7);
    assert.equal(
      allListings.find((i) => i.id === 'hampers-karya-cisaga')?.businessName,
      'Sentra Promosi CISAGA HUB'
    );
    assert.equal(
      allListings.find((i) => i.id === customListing.id)?.businessName,
      'Usaha Terdaftar Lama'
    );
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});

import {
  resolveSafeUploadFilePath,
  saveValidatedImageUpload,
} from './uploadUtils.ts';

test('uploadUtils validates image magic bytes, rejects SVG/XSS, and enforces path confinement', () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cisaga-upload-test-'));
  try {
    // Valid 1x1 PNG binary
    const pngBase64 =
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
    const saved = saveValidatedImageUpload(`data:image/png;base64,${pngBase64}`, tempDir);
    assert.match(saved.url, /^\/uploads\/umkm-.*\.png$/);
    assert.equal(saved.contentType, 'image/png');

    const resolved = resolveSafeUploadFilePath(saved.filename, tempDir);
    assert.ok(resolved);
    assert.equal(resolved.contentType, 'image/png');

    // Reject path traversal
    assert.equal(resolveSafeUploadFilePath('../umkm-listings.json', tempDir), null);
    assert.equal(resolveSafeUploadFilePath('umkm-abc.svg', tempDir), null);

    // Reject SVG or spoofed bytes claiming to be PNG
    assert.throws(() => saveValidatedImageUpload('data:image/svg+xml;base64,PHN2Zz48L3N2Zz4=', tempDir));
    const fakePngBase64 = Buffer.from('not-actually-a-png-header').toString('base64');
    assert.throws(() => saveValidatedImageUpload(`data:image/png;base64,${fakePngBase64}`, tempDir));
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});

test('server store persists uploaded photo paths, gallery images, and menu/service variants safely', () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cisaga-menu-store-test-'));
  try {
    const store = createServerStore(tempDir);
    const created = store.createAdminListing({
      businessName: 'Kedai & Jahit Sukahurip',
      ownerName: 'Ibu Tuti',
      productName: 'Layanan Jahit & Aneka Kue Basah',
      category: 'Busana',
      village: 'Desa Sukahurip',
      whatsapp: '081355667788',
      tier: 'premium',
      status: 'Aktif',
      price: '35000',
      unitLabel: 'Permak Pakaian',
      shortDescription: 'Melayani jahit busana harian serta menerima pesanan kue basah desa.',
      image: '/uploads/umkm-1001-aabbcc.jpg',
      galleryImages: ['/uploads/umkm-1002-ddeeff.png', 'https://evil.example/x.png'],
      variants: [
        {
          label: 'Jasa Permak & Potong Celana',
          price: '20000',
          availabilityNote: 'Selesai 1 Hari',
          image: '/uploads/umkm-1003-112233.webp',
        },
        {
          label: 'Layanan Jahit Gamis Kustom',
          price: '125000',
          availabilityNote: 'Estimasi 4 Hari',
        },
      ],
    });

    assert.equal(created.image, '/uploads/umkm-1001-aabbcc.jpg');
    assert.deepEqual(created.galleryImages, ['/uploads/umkm-1002-ddeeff.png']);
    assert.equal(created.variants.length, 2);
    assert.equal(created.variants[0].image, '/uploads/umkm-1003-112233.webp');

    const updated = store.updateAdminListing(created.id, {
      businessName: created.businessName,
      ownerName: created.ownerName,
      productName: created.productName,
      category: created.category,
      village: created.village,
      whatsapp: created.whatsapp,
      tier: created.tier,
      status: created.status,
      price: '25000',
      unitLabel: 'Jasa Permak & Potong Celana',
      shortDescription: created.shortDescription,
      image: 'javascript:alert(1)', // rejected -> falls back cleanly
      galleryImages: ['/uploads/umkm-1002-ddeeff.png'],
      variants: [
        {
          label: 'Jasa Permak & Potong Celana',
          price: '25000',
          availabilityNote: 'Tersedia',
        },
      ],
    });
    assert.equal(updated.variants.length, 1);
    assert.equal(updated.variants[0].price, 25000);
    assert.notEqual(updated.image, 'javascript:alert(1)');
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});

test('server store creates, sanitizes, sorts, updates status (unread/read/replied), and deletes contacts safely', () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cisaga-contact-test-'));
  try {
    const store = createServerStore(tempDir);
    assert.equal(store.listContactMessages().length, 0);

    // Rejects invalid email, missing subject, invalid optional whatsapp, and honeypot spam trap
    assert.throws(
      () =>
        store.createContactMessage({
          name: 'Rina',
          email: 'invalid-email',
          whatsapp: '081234567890',
          subject: 'Pertanyaan Umum',
          message: 'Halo admin',
        }),
      /alamat email/
    );

    assert.throws(
      () =>
        store.createContactMessage({
          name: 'Rina',
          email: 'rina@contoh.id',
          whatsapp: '123',
          subject: 'Pertanyaan Umum',
          message: 'Halo admin',
        }),
      /8–15 digit/
    );

    assert.throws(
      () =>
        store.createContactMessage({
          name: 'Bot',
          email: 'bot@spam.id',
          whatsapp: '',
          subject: 'Promo',
          message: 'Spam link',
          website: 'https://spam.example',
        }),
      /spam/
    );

    // Allows email-only submission without WhatsApp & strips dangerous HTML tags
    const emailOnlyMsg = store.createContactMessage({
      name: 'Dewi',
      email: 'dewi@contoh.id',
      whatsapp: '',
      subject: 'Bantuan Pendaftaran',
      message: '<script>alert(1)</script>Mohon bantuannya',
    });
    assert.equal(emailOnlyMsg.whatsapp, '');
    assert.equal(emailOnlyMsg.email, 'dewi@contoh.id');
    assert.equal(emailOnlyMsg.status, 'unread');
    assert.equal(emailOnlyMsg.message, 'alert(1)Mohon bantuannya');

    const created = store.createContactMessage({
      name: 'Hendra Wijaya',
      email: 'hendra@contoh.id',
      whatsapp: '0812-3456-7890',
      subject: 'Kemitraan & Reseller',
      message: 'Halo admin CISAGA HUB, saya tertarik menjadi reseller produk gula semut Cisaga.',
    });
    assert.equal(created.status, 'unread');
    assert.equal(created.whatsapp, '081234567890');
    assert.ok(created.created_at);
    assert.equal(store.listContactMessages().length, 2);

    // Re-opening store preserves persisted contacts in contacts.json sorted newest-first
    const reloaded = createServerStore(tempDir);
    assert.equal(reloaded.listContactMessages().length, 2);
    assert.equal(reloaded.listContactMessages()[0].name, 'Hendra Wijaya');

    const markedRead = reloaded.updateContactMessageStatus(created.id, 'read');
    assert.equal(markedRead.status, 'read');

    const markedReplied = reloaded.updateContactMessageStatus(created.id, 'replied');
    assert.equal(markedReplied.status, 'replied');

    assert.throws(
      () => reloaded.updateContactMessageStatus(created.id, 'StatusNgawur'),
      /Status pesan tidak valid/
    );

    reloaded.deleteContactMessage(created.id);
    assert.equal(reloaded.listContactMessages().length, 1);
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});

test('resolveWritableDataDir falls back to writable directory when preferred path is unwritable', () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'cisaga-dir-fallback-'));
  try {
    const blockedPreferred = path.join(tempRoot, 'blocked-file');
    fs.writeFileSync(blockedPreferred, 'read-only-placeholder', 'utf8');
    const fallbackDir = path.join(tempRoot, 'writable-fallback');

    const resolved = resolveWritableDataDir(blockedPreferred, fallbackDir);
    assert.equal(resolved, fallbackDir);
    assert.equal(fs.existsSync(fallbackDir), true);

    const store = createServerStore(blockedPreferred);
    assert.ok(store.getPublicActiveListings().length >= 6);
  } finally {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
});


