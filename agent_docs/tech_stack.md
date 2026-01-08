# Tech Stack & Tools — RoadReady MVP (Vibe-coder friendly)

## Stack (single repo)
- **Framework:** Next.js (frontend + backend in one codebase)
- **Database/Auth/Storage:** Supabase (Postgres + Auth + Storage)
- **Hosting:** Vercel
- **Email:** Resend
- **SMS:** Twilio
- **Background job:** Vercel Cron → hit a Next.js API route daily

## Why this stack
- Minimal DevOps.
- Managed database/auth/storage.
- Fast iteration for a solo founder with AI writing code.

## Services Setup Checklist (Day 1–2)
### Supabase
- Create project
- Enable Auth: email/password
- Create tables: fleets, drivers, vehicles, documents, alerts (+ optional doc_events)
- Create Storage bucket: `uploads` (private)
- Enable RLS and simple policies (user can only access their fleet)

### Vercel
- Connect GitHub repo
- Configure env vars
- Set Vercel Cron to call `GET /api/jobs/check-expirations` daily (e.g., 7am)

### Resend
- Get API key
- Verify domain when ready (can start with Resend-provided domain for MVP)
- Send email from server-side route only

### Twilio
- Buy a phone number (or use messaging service)
- Store credentials in env vars
- Send SMS only to “Dave” initially (single recipient to keep complexity low)

## Environment Variables (typical)
(Exact names can be chosen, but keep consistent)

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (server-only)
- `RESEND_API_KEY`
- `TWILIO_ACCOUNT_SID`
- `TWILIO_AUTH_TOKEN`
- `TWILIO_FROM_NUMBER`

## OCR / “Doc Understanding” Strategy (MVP-safe)
Phase 1 (ship fast): **manual entry required**
- After upload, user fills: doc type, expires_on, attach to driver/vehicle

Phase 1.5 (optional): AI suggestion
- Use OCR text + simple extraction to suggest doc_type and expires_on
- If confidence is low → show “Needs Review”, do NOT auto-set status to Red

## Cost Constraints
- Operating budget: **<$200/month**
- Expect early MVP to run ~$25–$75/month (depends on SMS volume)