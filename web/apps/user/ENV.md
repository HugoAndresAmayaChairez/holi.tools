# apps/user environment flags

## Passphrase encryption (DEV ONLY)

This repo includes an optional **dev-only** passphrase-based encryption mode which derives the session key via **PAKE (SPAKE2)**.

- Default: **disabled** (no non-PAKE password gate in normal builds)
- Enable (dev/test only): set `PUBLIC_HOLI_ENABLE_PASSPHRASE_ENCRYPTION=true`

Example:
- `PUBLIC_HOLI_ENABLE_PASSPHRASE_ENCRYPTION=true pnpm -C apps/user dev`

Notes:
- This is still gated behind a flag to avoid shipping any “password gate” UX by default.
- When disabled, the Encryption UI is hidden and all sessions run plaintext (until PAKE lands).

## Debug logging (recommended for dev only)

Set `PUBLIC_HOLI_DEBUG=1` to enable additional console logging.

Notes:
- Logs are intended to be **redacted** (no secrets, no room IDs, no raw signaling payloads), but still avoid enabling this in production.
- Default: off.
