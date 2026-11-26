# Security Specification — CISAGA HUB Firestore Rules

## 1. Data Invariants
- `/contacts/{contactId}` contains visitor PII (`name`, `email`, `whatsapp`, `message`) and MUST only be readable (`get`, `list`), updatable (`status`), and deletable by verified admins. Public visitors may only `create` new messages with `status == 'unread'` and `created_at == request.time`.
- `/umkm_listings/{listingId}` allows public `get`/`list` ONLY for documents where `status == 'Aktif'`. Public visitors may `create` new free registrations ONLY with `tier == 'reguler'`, `status == 'Menunggu Verifikasi'`, and `serverCreatedAt == request.time`. Only verified admins may create/read non-active listings, update listings, toggle tier/status, or delete listings.
- `/admins/{userId}` is locked (`allow read, write: if false`) so only the single verified owner Google account (`herzz@smkn2banjar-jabar.sch.id`) can ever hold admin access.
- All unmatched paths are explicitly denied (`allow read, write: if false`).

## 2. Dirty Dozen Adversarial Payloads (Expected: PERMISSION_DENIED)
1. Public `list` or `get` on `/contacts/{contactId}` without admin authentication.
2. Public `create` on `/contacts/{contactId}` with `status: 'replied'` (state shortcutting).
3. Public `create` on `/contacts/{contactId}` with client-forged `created_at` string instead of `request.time`.
4. Public `create` on `/contacts/{contactId}` with shadow field `isAdmin: true`.
5. Public `create` on `/contacts/{contactId}` with malformed email (`"not-an-email"`).
6. Public `create` on `/contacts/{contactId}` with oversized message (`> 1500` chars).
7. Non-admin `update` on `/contacts/{contactId}` trying to alter `status`.
8. Admin `update` on `/contacts/{contactId}` trying to mutate immutable fields (`email` or `message`).
9. Public `create` on `/umkm_listings/{listingId}` trying to claim `tier: 'premium'` or `status: 'Aktif'`.
10. Public `list` or `get` on `/umkm_listings/{listingId}` where `status == 'Menunggu Verifikasi'`.
11. Unverified email admin spoof (`email: 'herzz@smkn2banjar-jabar.sch.id'`, `email_verified: false`).
12. Document ID path poisoning (`contactId` > 128 chars or containing invalid characters).
