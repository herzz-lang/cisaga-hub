import 'dotenv/config';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import express, { type NextFunction, type Request, type Response } from 'express';
import {
  createSessionToken,
  extractBearerToken,
  verifySessionToken,
} from './server/authUtils.ts';
import { createServerStore, StoreHttpError } from './server/store.ts';
import { resolveSafeUploadFilePath, saveValidatedImageUpload } from './server/uploadUtils.ts';

const PORT = Number(process.env.PORT) || 3000;
const DATA_DIR =
  process.env.DATA_DIR && process.env.DATA_DIR.trim().length > 0
    ? path.resolve(process.cwd(), process.env.DATA_DIR.trim())
    : undefined;
const store = createServerStore(DATA_DIR);
const RESOLVED_DATA_DIR = store.getDataDir();
const UPLOADS_DIR = path.join(RESOLVED_DATA_DIR, 'uploads');

function resolveSessionSecret(dataDir: string): string {
  const explicitSecret = process.env.ADMIN_SESSION_SECRET?.trim();
  if (explicitSecret) {
    return explicitSecret;
  }

  const envPassword = process.env.ADMIN_PASSWORD?.trim();
  if (envPassword) {
    const envUsername = (process.env.ADMIN_USERNAME ?? '').trim() || 'admin';
    return crypto
      .createHmac('sha256', 'cisagahub-derived-session-key-v1')
      .update(`${envUsername.toLowerCase()}:${envPassword}`)
      .digest('hex');
  }

  const secretPath = path.join(dataDir, '.session-secret');
  try {
    if (fs.existsSync(secretPath)) {
      const existing = fs.readFileSync(secretPath, 'utf8').trim();
      if (existing.length >= 32) {
        return existing;
      }
    }
    const generated = crypto.randomBytes(32).toString('hex');
    fs.mkdirSync(dataDir, { recursive: true });
    fs.writeFileSync(secretPath, generated, { encoding: 'utf8', mode: 0o600 });
    return generated;
  } catch {
    return crypto.randomBytes(32).toString('hex');
  }
}

const SESSION_SECRET = resolveSessionSecret(RESOLVED_DATA_DIR);
const revokedTokens = new Set<string>();

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const authAttempts = new Map<string, RateLimitEntry>();
const RATE_WINDOW_MS = 5 * 60 * 1000;
const MAX_AUTH_ATTEMPTS = 10;

function checkAuthRateLimit(ipKey: string): boolean {
  const now = Date.now();
  const entry = authAttempts.get(ipKey);
  if (!entry || now >= entry.resetAt) {
    return true;
  }
  return entry.count < MAX_AUTH_ATTEMPTS;
}

function recordFailedAuthAttempt(ipKey: string): void {
  const now = Date.now();
  const entry = authAttempts.get(ipKey);
  if (!entry || now >= entry.resetAt) {
    authAttempts.set(ipKey, { count: 1, resetAt: now + RATE_WINDOW_MS });
  } else {
    entry.count += 1;
  }
}

function clearAuthAttempts(ipKey: string): void {
  authAttempts.delete(ipKey);
}

const contactSubmissions = new Map<string, RateLimitEntry>();
const MAX_CONTACT_SUBMISSIONS = 60;
const recentContactDigests = new Map<string, number>();
const DUPLICATE_COOLDOWN_MS = 15 * 1000;

function checkAndRecordContactRateLimit(ipKey: string): boolean {
  const now = Date.now();
  const entry = contactSubmissions.get(ipKey);
  if (!entry || now >= entry.resetAt) {
    contactSubmissions.set(ipKey, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return true;
  }
  if (entry.count >= MAX_CONTACT_SUBMISSIONS) {
    return false;
  }
  entry.count += 1;
  return true;
}

function buildContactDigest(ipKey: string, body: Record<string, unknown>): string {
  return crypto
    .createHash('sha256')
    .update(
      `${ipKey}|${String(body.email ?? '').trim().toLowerCase()}|${String(body.subject ?? '').trim()}|${String(body.message ?? '').trim()}`
    )
    .digest('hex');
}

function isDuplicateContactBurst(ipKey: string, body: Record<string, unknown>): boolean {
  const now = Date.now();
  for (const [key, exp] of recentContactDigests.entries()) {
    if (now >= exp) recentContactDigests.delete(key);
  }
  const digest = buildContactDigest(ipKey, body);
  const expiresAt = recentContactDigests.get(digest);
  return Boolean(expiresAt && now < expiresAt);
}

function recordDuplicateContactDigest(ipKey: string, body: Record<string, unknown>): void {
  const digest = buildContactDigest(ipKey, body);
  recentContactDigests.set(digest, Date.now() + DUPLICATE_COOLDOWN_MS);
}

function getEnvCredentials() {
  return {
    username: process.env.ADMIN_USERNAME,
    password: process.env.ADMIN_PASSWORD,
  };
}

function isValidListingId(id: string): boolean {
  return typeof id === 'string' && /^[a-zA-Z0-9_-]{2,80}$/.test(id);
}

function requireDeveloperAuth(req: Request, res: Response, next: NextFunction): void {
  const token = extractBearerToken(req.headers.authorization);
  if (!token || revokedTokens.has(token)) {
    res.status(401).json({ error: 'Sesi admin developer diperlukan. Silakan login terlebih dahulu.' });
    return;
  }

  const { username } = getEnvCredentials();
  const expectedUsername = (username ?? '').trim() || 'admin';
  const payload = verifySessionToken(token, SESSION_SECRET, expectedUsername);
  if (!payload) {
    res.status(401).json({ error: 'Sesi admin tidak valid atau sudah berakhir. Silakan login ulang.' });
    return;
  }

  next();
}

function handleApiError(err: unknown, res: Response): void {
  if (err instanceof StoreHttpError) {
    res.status(err.statusCode).json({ error: err.message });
    return;
  }
  res.status(500).json({ error: 'Terjadi kesalahan pada server.' });
}

async function startServer() {
  const app = express();
  app.set('trust proxy', 2);
  app.use(express.json({ limit: '4mb' }));

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true });
  });

  // Serve validated uploaded UMKM images safely before SPA fallback
  app.get('/uploads/:filename', (req, res) => {
    const resolved = resolveSafeUploadFilePath(req.params.filename, UPLOADS_DIR);
    if (!resolved) {
      res.status(404).send('Foto tidak ditemukan.');
      return;
    }
    res.setHeader('Content-Type', resolved.contentType);
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    res.sendFile(resolved.filePath);
  });

  // Public listings (only active UMKMs)
  app.get('/api/listings', (_req, res) => {
    try {
      const listings = store.getPublicActiveListings();
      res.json({ listings });
    } catch (err) {
      handleApiError(err, res);
    }
  });

  // Public Free UMKM registration (always creates tier: 'reguler', status: 'Menunggu Verifikasi')
  app.post('/api/registrations/free', (req, res) => {
    try {
      const created = store.createFreeRegistration(req.body ?? {});
      res.status(201).json({ listing: created });
    } catch (err) {
      handleApiError(err, res);
    }
  });

  // Public "Hubungi Saya" message submission -> persisted to contacts store for Admin Portal
  const handlePublicContactSubmit = (req: Request, res: Response) => {
    const ipKey = req.ip || 'local';
    if (!checkAndRecordContactRateLimit(ipKey)) {
      res.status(429).json({
        error: 'Terlalu banyak pesan dikirim dalam waktu singkat. Coba lagi beberapa menit lagi.',
      });
      return;
    }
    const payload =
      req.body && typeof req.body === 'object' ? (req.body as Record<string, unknown>) : {};
    if (isDuplicateContactBurst(ipKey, payload)) {
      res.status(429).json({
        error: 'Pesan yang sama baru saja dikirim. Mohon tunggu 15 detik sebelum mengirim ulang.',
      });
      return;
    }
    try {
      const created = store.createContactMessage(payload);
      recordDuplicateContactDigest(ipKey, payload);
      res.status(201).json({ contact: created, message: created });
    } catch (err) {
      handleApiError(err, res);
    }
  };

  app.post('/api/contacts', handlePublicContactSubmit);
  app.post('/api/contact-messages', handlePublicContactSubmit);

  // Developer Auth status
  app.get('/api/admin/auth/status', (req, res) => {
    const { username, password } = getEnvCredentials();
    const config = store.getAuthConfig(username, password);
    const token = extractBearerToken(req.headers.authorization);
    const authenticated = Boolean(
      token &&
        !revokedTokens.has(token) &&
        verifySessionToken(token, SESSION_SECRET, config.username)
    );

    res.json({
      mode: config.mode,
      username: config.username,
      authenticated,
    });
  });

  // One-time developer password setup (locked once claimed or when ADMIN_PASSWORD env is set)
  app.post('/api/admin/auth/setup', (req, res) => {
    const ipKey = req.ip || 'local';
    if (!checkAuthRateLimit(ipKey)) {
      res.status(429).json({
        error: 'Terlalu banyak percobaan. Tunggu beberapa menit sebelum mencoba lagi.',
      });
      return;
    }

    try {
      const { username: envUsername, password: envPassword } = getEnvCredentials();
      const body = req.body ?? {};
      const inputUsername = typeof body.username === 'string' ? body.username : '';
      const inputPassword = typeof body.password === 'string' ? body.password : '';
      const inputConfirm = typeof body.confirmPassword === 'string' ? body.confirmPassword : '';

      const claimed = store.claimInitialPassword(
        inputUsername,
        inputPassword,
        inputConfirm,
        envUsername,
        envPassword
      );
      clearAuthAttempts(ipKey);
      const token = createSessionToken(claimed.username, SESSION_SECRET);
      res.status(201).json({ token, username: claimed.username });
    } catch (err) {
      recordFailedAuthAttempt(ipKey);
      handleApiError(err, res);
    }
  });

  // Developer login
  app.post('/api/admin/auth/login', (req, res) => {
    const ipKey = req.ip || 'local';
    if (!checkAuthRateLimit(ipKey)) {
      res.status(429).json({
        error: 'Terlalu banyak percobaan login gagal. Coba lagi dalam beberapa menit.',
      });
      return;
    }

    try {
      const { username: envUsername, password: envPassword } = getEnvCredentials();
      const body = req.body ?? {};
      const inputUsername = typeof body.username === 'string' ? body.username : '';
      const inputPassword = typeof body.password === 'string' ? body.password : '';

      const verified = store.verifyLogin(inputUsername, inputPassword, envUsername, envPassword);
      clearAuthAttempts(ipKey);
      const token = createSessionToken(verified.username, SESSION_SECRET);
      res.json({ token, username: verified.username });
    } catch (err) {
      recordFailedAuthAttempt(ipKey);
      handleApiError(err, res);
    }
  });

  // Developer logout (revokes current Bearer token immediately)
  app.post('/api/admin/auth/logout', (req, res) => {
    const token = extractBearerToken(req.headers.authorization);
    if (token) {
      revokedTokens.add(token);
    }
    res.json({ ok: true });
  });

  // Protected Developer Admin image upload
  app.post('/api/admin/uploads', requireDeveloperAuth, (req, res) => {
    try {
      const dataUrl = typeof req.body?.dataUrl === 'string' ? req.body.dataUrl : '';
      const saved = saveValidatedImageUpload(dataUrl, UPLOADS_DIR);
      res.status(201).json({ url: saved.url, sizeBytes: saved.sizeBytes });
    } catch (err) {
      res.status(400).json({
        error: err instanceof Error ? err.message : 'Gagal mengunggah foto.',
      });
    }
  });

  // Protected Developer Admin CRUD routes
  app.get('/api/admin/listings', requireDeveloperAuth, (_req, res) => {
    try {
      const listings = store.getAllListings();
      res.json({ listings });
    } catch (err) {
      handleApiError(err, res);
    }
  });

  app.post('/api/admin/listings', requireDeveloperAuth, (req, res) => {
    try {
      const created = store.createAdminListing(req.body ?? {});
      res.status(201).json({ listing: created });
    } catch (err) {
      handleApiError(err, res);
    }
  });

  app.put('/api/admin/listings/:id', requireDeveloperAuth, (req, res) => {
    const id = req.params.id;
    if (!isValidListingId(id)) {
      res.status(400).json({ error: 'ID UMKM tidak valid.' });
      return;
    }
    try {
      const updated = store.updateAdminListing(id, req.body ?? {});
      res.json({ listing: updated });
    } catch (err) {
      handleApiError(err, res);
    }
  });

  app.patch('/api/admin/listings/:id/tier', requireDeveloperAuth, (req, res) => {
    const id = req.params.id;
    if (!isValidListingId(id)) {
      res.status(400).json({ error: 'ID UMKM tidak valid.' });
      return;
    }
    try {
      const updated = store.toggleTier(id);
      res.json({ listing: updated });
    } catch (err) {
      handleApiError(err, res);
    }
  });

  app.patch('/api/admin/listings/:id/status', requireDeveloperAuth, (req, res) => {
    const id = req.params.id;
    if (!isValidListingId(id)) {
      res.status(400).json({ error: 'ID UMKM tidak valid.' });
      return;
    }
    try {
      const updated = store.cycleStatus(id);
      res.json({ listing: updated });
    } catch (err) {
      handleApiError(err, res);
    }
  });

  app.delete('/api/admin/listings/:id', requireDeveloperAuth, (req, res) => {
    const id = req.params.id;
    if (!isValidListingId(id)) {
      res.status(400).json({ error: 'ID UMKM tidak valid.' });
      return;
    }
    try {
      store.deleteListing(id);
      res.json({ ok: true });
    } catch (err) {
      handleApiError(err, res);
    }
  });

  // Protected Developer Admin Contact Inbox routes
  const handleAdminListContacts = (_req: Request, res: Response) => {
    try {
      const contacts = store.listContactMessages();
      const unreadCount = contacts.filter((c) => c.status === 'unread').length;
      res.json({ contacts, messages: contacts, unreadCount });
    } catch (err) {
      handleApiError(err, res);
    }
  };

  const handleAdminUpdateContactStatus = (req: Request, res: Response) => {
    const id = req.params.id;
    if (!isValidListingId(id)) {
      res.status(400).json({ error: 'ID pesan tidak valid.' });
      return;
    }
    try {
      const updated = store.updateContactMessageStatus(id, req.body?.status);
      res.json({ contact: updated, message: updated });
    } catch (err) {
      handleApiError(err, res);
    }
  };

  const handleAdminDeleteContact = (req: Request, res: Response) => {
    const id = req.params.id;
    if (!isValidListingId(id)) {
      res.status(400).json({ error: 'ID pesan tidak valid.' });
      return;
    }
    try {
      store.deleteContactMessage(id);
      res.json({ ok: true });
    } catch (err) {
      handleApiError(err, res);
    }
  };

  app.get('/api/admin/contacts', requireDeveloperAuth, handleAdminListContacts);
  app.get('/api/admin/messages', requireDeveloperAuth, handleAdminListContacts);
  app.patch('/api/admin/contacts/:id/status', requireDeveloperAuth, handleAdminUpdateContactStatus);
  app.patch('/api/admin/messages/:id/status', requireDeveloperAuth, handleAdminUpdateContactStatus);
  app.delete('/api/admin/contacts/:id', requireDeveloperAuth, handleAdminDeleteContact);
  app.delete('/api/admin/messages/:id', requireDeveloperAuth, handleAdminDeleteContact);

  // Never fall through to SPA HTML on unknown /api/* endpoints
  app.all('/api/*', (_req, res) => {
    res.status(404).json({ error: 'Endpoint API tidak ditemukan.' });
  });

  app.use((err: unknown, req: Request, res: Response, next: NextFunction) => {
    if (req.path.startsWith('/api/')) {
      if (
        err &&
        typeof err === 'object' &&
        'type' in err &&
        (err as { type?: string }).type === 'entity.parse.failed'
      ) {
        res.status(400).json({ error: 'Format data permintaan JSON tidak valid.' });
        return;
      }
      res.status(500).json({ error: 'Terjadi kesalahan pada server.' });
      return;
    }
    next(err);
  });

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      const indexPath = path.join(distDir, 'index.html');
      if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
      } else {
        res.status(404).send('Build output not found.');
      }
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`CISAGA HUB server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start CISAGA HUB server:', err);
  process.exit(1);
});
