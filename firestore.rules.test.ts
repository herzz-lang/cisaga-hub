import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const rulesSource = fs.readFileSync(path.resolve(process.cwd(), 'firestore.rules'), 'utf8');
const blueprint = JSON.parse(
  fs.readFileSync(path.resolve(process.cwd(), 'firebase-blueprint.json'), 'utf8')
) as {
  entities: Record<string, { required?: string[]; properties: Record<string, unknown> }>;
  firestore: Record<string, unknown>;
};

test('firestore.rules includes default deny catch-all, strict ID checks, and zero open read/write', () => {
  assert.match(rulesSource, /rules_version = '2';/);
  assert.match(rulesSource, /match \/\{document=\*\*\} \{\s*allow read, write: if false;\s*\}/);
  assert.doesNotMatch(rulesSource, /allow\s+(read|write)\s*:\s*if\s+true\s*;/);
  assert.match(rulesSource, /email_verified == true/);
});

test('firestore.rules covers every collection declared in firebase-blueprint.json', () => {
  assert.ok(blueprint.firestore['/contacts/{contactId}']);
  assert.ok(blueprint.firestore['/umkm_listings/{listingId}']);
  assert.ok(blueprint.firestore['/admins/{userId}']);

  assert.match(rulesSource, /match \/contacts\/\{contactId\}/);
  assert.match(rulesSource, /match \/umkm_listings\/\{listingId\}/);
  assert.match(rulesSource, /match \/admins\/\{userId\}/);
});

test('firestore.rules enforces Dirty Dozen security invariants on contacts and umkm_listings', () => {
  // 1. Contacts reads restricted to admin only (no public PII leak)
  assert.match(rulesSource, /allow get:\s*if isValidId\(contactId\) && isAdmin\(\);/);
  assert.match(rulesSource, /allow list:\s*if isBootstrappedAdmin\(\);/);

  // 2. Contacts create enforces unread status and request.time
  assert.match(rulesSource, /data\.status == 'unread'/);
  assert.match(rulesSource, /data\.created_at == request\.time/);

  // 3. Contacts update restricts mutated fields to status only
  assert.match(rulesSource, /data\.diff\(prev\)\.affectedKeys\(\)\.hasOnly\(\['status'\]\)/);

  // 4. Public umkm_listings list enforces active status or bootstrapped admin without get()/exists()
  assert.match(rulesSource, /allow list:\s*if resource\.data\.status == 'Aktif' \|\| isBootstrappedAdmin\(\);/);

  // 5. Public umkm_listings create enforces reguler + Menunggu Verifikasi
  assert.match(
    rulesSource,
    /\(incoming\(\)\.tier == 'reguler' && incoming\(\)\.status == 'Menunggu Verifikasi'\)/
  );

  // 6. Strict single-Google-account admin lock (no /admins delegation escalation)
  assert.match(rulesSource, /request\.auth\.token\.email == 'herzz@smkn2banjar-jabar\.sch\.id'/);
  assert.match(rulesSource, /function isAdmin\(\) \{\s*return isBootstrappedAdmin\(\);\s*\}/);
  assert.match(rulesSource, /match \/admins\/\{userId\} \{\s*allow read, write: if false;\s*\}/);
});
