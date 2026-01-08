# Code Patterns & Structure — RoadReady (Cursor-friendly)

## Project structure (recommended)
- `app/`
  - `(auth)/login`
  - `(app)/dashboard`
  - `(app)/drivers`
  - `(app)/vehicles`
  - `(app)/documents`
  - `(app)/exports`
- `app/api/`
  - `documents/upload` (POST)
  - `exports/driver/[id]` (GET)
  - `exports/vehicle/[id]` (GET)
  - `jobs/check-expirations` (GET)  <-- called by Vercel Cron
- `lib/`
  - `supabaseClient.ts` (browser client)
  - `supabaseAdmin.ts` (server client w/ service role)
  - `statusEngine.ts` (compute green/yellow/red)
  - `notifications/` (resend + twilio helpers)
- `components/`
  - reusable UI components (tables, badges, status chips)

## “Vibe-coder safe” rules
1) **Start manual-first.** Do not block MVP on OCR/AI.
2) **One feature at a time.** Each PR should change one thing.
3) **Status engine is deterministic.** No AI decides “legal to drive.”
4) **Log everything important** (doc uploads, edits, alerts sent).

## Data model reminders (minimum)
- `fleets`
- `drivers` (fleet_id, name, phone?, email?, cdl_number?)
- `vehicles` (fleet_id, unit_number, vin?)
- `documents`
  - `fleet_id`
  - `entity_type` = 'driver' | 'vehicle'
  - `entity_id`
  - `doc_type` (string enum-like)
  - `expires_on` (date nullable)
  - `file_path` (storage path)
  - `status` = 'green' | 'yellow' | 'red'
  - `needs_review` (boolean)  <-- for any uncertain extraction (future)
  - `uploaded_by`, `uploaded_at`
- `alerts`
  - `fleet_id`
  - `channel` = 'email' | 'sms'
  - `to` (string)
  - `reason` (e.g., "expired", "expiring_soon")
  - `entity_type`, `entity_id`, `document_id?`
  - `sent_at`, `status` ('queued'|'sent'|'failed'), `error?`

## Status computation (simple and correct)
- Yellow if any required doc expires within `YELLOW_DAYS` (default 30)
- Red if any required doc is missing OR expired
- Green otherwise
- For MVP, required docs list can be hardcoded for the first fleet (config later)

## Background job (Vercel Cron)
`/api/jobs/check-expirations` does:
1) Query documents expiring soon / expired
2) Update document statuses and entity rollups
3) Send alerts (Dave-only):
   - expired => immediate email + sms
   - expiring soon => email daily digest (SMS optional later)

## Error handling pattern (example)
- All API routes must:
  - validate input (basic checks)
  - try/catch
  - return clear error messages
  - never leak secrets to client

## UI vibe
- Calm + boring + clear.
- Big status badges.
- “What’s wrong + what to do next” always visible.
