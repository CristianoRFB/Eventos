# F6 — Rewrap progress and competing-branch checkpoint (2026-10-27)

**This file records an independent, isolated implementation branch.**
Do not merge automatically while another Codex cycle changes the same forms files.

## Baseline and delivered code

- Started from verified parent `7ede723ebe3b5e94e8b325be0c3d910803473dfd`
  (existing `0008_private_cipher_rewraps.sql` and Drizzle schema).
- Added internal `app/services/forms-rewrap.server.ts` for authenticated
  rewrap v1/v2 with a dry-run option, org/source scoping and CAS updates.
- Staff reads/export/staging now prefer a rewrapped envelope only if its
  SHA-256 source hash still matches the original. Originals remain encrypted
  in the unmodified legacy columns until retention or withdrawal.
- Added `0009_rewrap_audit.sql` with immutable non-PII key-id events.
- Added `tests/unit/forms-rewrap.test.ts` (v1→v2, subsequent key rotation,
  idempotency, A×B, withdrawal, reply, immutable originals and audit).

**Critical limitation:** The original ciphertext is intentionally preserved
for rollback. Key usage inventory will still count v1 originals, and legacy
key retirement is NOT safe. A subsequent separate schema change and atomic
redaction policy are required; the existing 0008 triggers remove the shadow
on source nullification, so direct source redaction would LOSE DATA.
Do not bypass existing triggers or call this a complete re-encryption.

## Safety and execution gates

- No public rewrap API, cron, R2/D1 remote mutation, secret or production action.
- `rewrapPrivateCipher` can only be called from trusted internal code. It
  refuses to operate unless an active v2 key is configured in memory.
- Migrating real ciphertext requires migration review, verified encrypted
  backup, explicit authorization, per-tenant dry run, monitoring and rollback.
- Feature/GOAL state remains F6 PARTIAL until these gates pass.
- The other active branch `chat/eventos77-f6-retention-20261027` moved
  after baseline and altered overlapping files. PR #2 targets a pinned base
  `chat/eventos77-rewrap-base-20261027` only to test independent code.
  Reconcile branch changes before merge; never force-push.

## Next step

Check PR #2 CI and repair failures. Then reconcile with active branch,
design safe key retirement without deleting the only rewrapped copy, and
proceed to F7 fake custom-hostname lifecycle and its A×B tests.
