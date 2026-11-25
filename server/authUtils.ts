import crypto from 'node:crypto';

export interface SessionPayload {
  sub: string;
  role: 'developer_admin';
  iat: number;
  exp: number;
}

const DEFAULT_TTL_MS = 8 * 60 * 60 * 1000; // 8 hours

export function constantTimeEqual(a: string, b: string): boolean {
  const hashA = crypto.createHash('sha256').update(a).digest();
  const hashB = crypto.createHash('sha256').update(b).digest();
  return crypto.timingSafeEqual(hashA, hashB);
}

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${derived}`;
}

export function verifyScryptPassword(password: string, storedHash: string): boolean {
  const parts = storedHash.split(':');
  if (parts.length !== 2) return false;
  const [salt, keyHex] = parts;
  if (!salt || !keyHex || keyHex.length % 2 !== 0) return false;

  const expectedBuffer = Buffer.from(keyHex, 'hex');
  const derivedBuffer = crypto.scryptSync(password, salt, expectedBuffer.length);
  if (expectedBuffer.length !== derivedBuffer.length) return false;
  return crypto.timingSafeEqual(expectedBuffer, derivedBuffer);
}

export function createSessionToken(
  username: string,
  secret: string,
  ttlMs = DEFAULT_TTL_MS
): string {
  const now = Date.now();
  const payload: SessionPayload = {
    sub: username,
    role: 'developer_admin',
    iat: now,
    exp: now + ttlMs,
  };
  const encodedPayload = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
  const signature = crypto
    .createHmac('sha256', secret)
    .update(encodedPayload)
    .digest('base64url');
  return `${encodedPayload}.${signature}`;
}

export function verifySessionToken(
  token: string,
  secret: string,
  expectedUsername?: string
): SessionPayload | null {
  if (!token || !secret) return null;
  const segments = token.split('.');
  if (segments.length !== 2) return null;

  const [encodedPayload, providedSig] = segments;
  if (!encodedPayload || !providedSig) return null;

  const expectedSig = crypto
    .createHmac('sha256', secret)
    .update(encodedPayload)
    .digest('base64url');

  if (!constantTimeEqual(providedSig, expectedSig)) {
    return null;
  }

  try {
    const rawJson = Buffer.from(encodedPayload, 'base64url').toString('utf8');
    const parsed = JSON.parse(rawJson) as Partial<SessionPayload>;
    if (
      typeof parsed.sub !== 'string' ||
      parsed.role !== 'developer_admin' ||
      typeof parsed.iat !== 'number' ||
      typeof parsed.exp !== 'number'
    ) {
      return null;
    }
    if (Date.now() >= parsed.exp) {
      return null;
    }
    if (
      expectedUsername &&
      !constantTimeEqual(parsed.sub.toLowerCase(), expectedUsername.toLowerCase())
    ) {
      return null;
    }
    return {
      sub: parsed.sub,
      role: 'developer_admin',
      iat: parsed.iat,
      exp: parsed.exp,
    };
  } catch {
    return null;
  }
}

export function extractBearerToken(authHeader: string | undefined): string | null {
  if (!authHeader) return null;
  const trimmed = authHeader.trim();
  if (!trimmed.toLowerCase().startsWith('bearer ')) return null;
  const token = trimmed.slice(7).trim();
  return token.length > 0 ? token : null;
}

export function validateLoginCredentialsInput(username: string, password: string): string | null {
  if (username.trim().length === 0) {
    return 'Masukkan username admin.';
  }
  if (password.length === 0) {
    return 'Masukkan password admin.';
  }
  return null;
}

export function validateSetupPasswordInput(
  username: string,
  password: string,
  confirmPassword: string,
  expectedUsername: string
): string | null {
  if (!constantTimeEqual(username.trim().toLowerCase(), expectedUsername.toLowerCase())) {
    return `Username developer harus "${expectedUsername}".`;
  }
  if (password.length < 8) {
    return 'Password developer minimal 8 karakter.';
  }
  if (password !== confirmPassword) {
    return 'Konfirmasi password tidak cocok.';
  }
  return null;
}
