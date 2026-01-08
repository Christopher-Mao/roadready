# Technical Design Document: RoadReady (FleetCheck) MVP

**Goal (MVP):** Replace spreadsheets for **one real fleet** by giving the safety manager a single “today I’m compliant / I’m not” dashboard, plus proactive alerts.
**Constraints:** **ASAP (1–2 weeks)**, **AI writes all code**, **don’t get stuck**, **<$200/mo**, **super simple to build**.

---

## 🛠 How We’ll Build It

### 🏆 Primary Recommendation (fastest + least “getting stuck”)

**Web app (desktop-first, mobile-friendly) using:**

* **Frontend + Backend:** **Next.js** (single codebase)
* **Database + Auth + File Storage:** **Supabase**
* **Hosting:** **Vercel**
* **Email:** **Resend**
* **SMS:** **Twilio**
* **Background checks (expirations):** Daily cron job (Vercel Cron → API route)

Why this combo works for you:

* You avoid “DevOps rabbit holes” (managed DB, managed auth, managed deploy).
* One codebase can ship in days.
* Easy to iterate with ChatGPT + a template.

---

## Alternative Options Compared (Web MVP)

| Option                                        | Pros                                                  | Cons                                                               | Cost       | Time to MVP            |
| --------------------------------------------- | ----------------------------------------------------- | ------------------------------------------------------------------ | ---------- | ---------------------- |
| **Next.js + Supabase + Vercel (Recommended)** | Fast, all-in-one, simple mental model, huge community | Some “glue code” for SMS/email/jobs                                | ~ $0–$100+ | **1–2 weeks**          |
| **Firebase (Auth/DB/Storage) + Web**          | Very fast to start, great docs                        | Data modeling can get weird; costs can surprise later              | ~ $0–$100+ | 1–2 weeks              |
| **Airtable + Softr/Retool**                   | “No real backend,” fastest CRUD                       | Harder for doc processing, audit trails, scaling; can feel “hacky” | $0–$200+   | 3–7 days (but limited) |

---

## 📋 Project Setup Checklist (ASAP Path)

### Day 1 — Accounts

* [ ] Supabase project (DB, Auth, Storage)
* [ ] Vercel account (deploy)
* [ ] Resend account (email) — Free tier exists; Pro starts at **$20/mo** ([Resend][1])
* [ ] Twilio account (SMS) — US SMS starts around **$0.0083** per message ([twilio.com][2])

### Day 1 — Repo + Deploy Loop

* [ ] Create Next.js app (or use a starter template)
* [ ] Push to GitHub
* [ ] Connect GitHub → Vercel (auto-deploy on push)

### Day 2 — Supabase wiring

* [ ] Enable Auth (email/password)
* [ ] Create tables (fleets, drivers, vehicles, documents, alerts)
* [ ] Enable Storage bucket for uploads
* [ ] Turn on Row Level Security (RLS) policies (simple “user owns fleet” rules)

---

## 🏗 Core Architecture (Simple & MVP-Ready)

### How the MVP works (plain English)

1. Dave logs in
2. Dave adds drivers + trucks (manual entry)
3. Dave uploads documents (PDF/photo)
4. System stores the file + metadata (what it is, who it belongs to, expiration date)
5. Dashboard shows **Green / Yellow / Red**
6. Daily job checks what’s expiring and sends alerts

### “Keep-it-simple” Principle

For MVP: **manual data entry is allowed** whenever AI extraction is unreliable.
Your first “wow” can be: “Everything is in one place + color-coded + alerts.”

---

## 📊 Database & Data Storage

### Option 1 (Recommended): Supabase Postgres

**Why:** It’s a real database, easy to query for “what expires in 14 days?”, and supports auth/storage in one place.
Supabase Pro is **$25/mo** ([Supabase][3])

### Option 2: Firebase

**Why:** Very fast to start.
**Trade-off:** data model + complex queries can become painful.

### Option 3: Airtable

**Why:** fastest CRUD.
**Trade-off:** doc processing + audit logs become awkward.

### Minimal schema (MVP)

* `users`
* `fleets` (Dave’s company)
* `drivers`
* `vehicles`
* `documents`

  * `entity_type` (“driver” | “vehicle”)
  * `entity_id` (driver_id or vehicle_id)
  * `doc_type` (CDL, Med Card, Insurance, Registration, IFTA, etc.)
  * `expires_on` (date)
  * `file_url`
  * `status` (green/yellow/red)
* `alerts` (queued + sent logs)

---

## 🧩 Feature Build Plan (MVP)

### Feature 1: Login + Fleet Setup

**Complexity:** ⭐⭐☆☆☆
**Build:** Supabase Auth + simple onboarding screen (create fleet, invite later)

**MVP rule:** No team invites on day 1 unless you truly need it.

---

### Feature 2: Driver & Vehicle Lists (CRUD)

**Complexity:** ⭐⭐☆☆☆
**Build:** simple tables + “Add Driver” / “Add Truck” forms

**Key fields (MVP):**

* Driver: name, phone, email (optional), CDL number (optional)
* Vehicle: unit number, VIN (optional)

---

### Feature 3: Document Upload + Metadata Entry

**Complexity:** ⭐⭐⭐☆☆
**Build approach (MVP-fast):**

* Upload file → store in Supabase Storage
* Show a form: **Doc Type + Expiration Date + Assign To (driver/truck)**

**Why this is smart:** It eliminates the “AI extraction must work perfectly” problem while still delivering value immediately.

#### Optional “AI helper” (Phase 1.5)

After upload, try to **suggest** (not auto-write) the doc type + expiration date:

* If AI fails → Dave just enters it manually.

---

### Feature 4: Compliance Dashboard (Green/Yellow/Red)

**Complexity:** ⭐⭐⭐☆☆
**Logic (simple):**

* Green: no required docs missing + none expiring soon
* Yellow: expires within X days (e.g., 30)
* Red: expired OR missing required doc

**UI (Dave-language):**

* Big banner: “Today: ✅ 28 compliant / ⚠️ 3 expiring / ⛔ 1 non-compliant”
* Filters: Drivers / Trucks / Expiring soon / Expired

---

### Feature 5: Alerts (Email + SMS)

**Complexity:** ⭐⭐⭐⭐☆
**MVP scope:** only **one recipient** (Dave) to start.

#### Email: Resend

* Free tier exists; Pro is **$20/mo** ([Resend][1])

#### SMS: Twilio

* US SMS pricing starts around **$0.0083** per message ([twilio.com][2])
  *(There can be additional fees depending on sender type/number—start simple with a long code.)* ([twilio.com][4])

---

## ⏰ Background Jobs (Expiration Checking)

### Option 1 (Recommended, simplest): Vercel Cron → Next.js API Route

* Daily at 7am: cron hits `/api/jobs/check-expirations`
* That route:

  1. queries DB for docs expiring soon / expired
  2. updates status fields
  3. sends alerts via Resend/Twilio

### Option 2: Supabase scheduled functions / cron in DB

* Fewer moving parts once configured
* Slightly more “platform learning”

### Option 3: Queue system (Upstash/QStash)

* Best long-term reliability
* Overkill for day-1 MVP

---

## 🔐 Security & “Not Getting Burned”

MVP security that matters:

* **Auth required** for everything
* **Row Level Security** in Supabase so one fleet can’t see another
* Store files in private bucket; serve via signed URLs
* Audit trail: keep `alerts` table + document change history (basic)

**Trade-off:** This is not SOC2/HIPAA. You’re handling business compliance docs; still treat as private.

---

## 🎨 UI/UX Implementation Notes (Dave-proof)

* “Traffic light” UI everywhere
* Always show: **what** is wrong + **what to do next**

  * Example: “Med Card expires in 12 days → upload new one”
* One-click “Show me only Reds”
* Use a clean UI kit (shadcn/ui) so AI can generate consistent components

---

## 🤖 AI Assistance Strategy (so you never get stuck)

### Your working loop (PER: Plan → Execute → Review)

1. **Plan**: “What’s the smallest version of this feature?”
2. **Execute**: Generate code for *one screen or one API route*
3. **Review**: Run it locally, test 3 cases, commit

### Copy/paste prompt templates

**Build a feature**

```
You are my senior engineer.
We are building RoadReady MVP: Next.js + Supabase + Vercel.
Create the smallest working version of: [feature].

Requirements:
- Must be simple and reliable
- Include basic error handling
- Include a test checklist
Return: files to create + exact code + where to paste it.
```

**Debug**

```
I got this error:
[paste error]

What I expected:
[expected]

What happened:
[actual]

Stack: Next.js + Supabase
Please identify the cause, give the fix, and tell me how to prevent it.
```

---

## 🚀 Deployment Plan

### Option 1 (Recommended): Vercel

* Fastest deploy; Git push = live
* Note: Pro plan billing is usage-based with a platform fee and credits, so costs can vary with usage ([Vercel][5])

### Option 2: Cloudflare Pages / Workers

* Often cheaper at scale
* Slightly more setup

### Option 3: Railway / Render

* Very simple for full-stack
* Can be a bit slower to scale; pricing varies

---

## 💰 Cost Breakdown (Typical Early MVP)

### Likely monthly (first fleet)

* **Supabase:** $0–$25 (Pro is **$25/mo**) ([Supabase][3])
* **Vercel:** $0 (Hobby) → Pro if needed; pricing varies by usage ([Vercel][6])
* **Resend:** $0 (Free) → **$20/mo Pro** ([Resend][1])
* **Twilio SMS:** pay-per-message (US starts around **$0.0083**) ([twilio.com][2])

**Total for MVP:** commonly **$25–$75/mo**, comfortably under $200.

---

## 📈 Scaling Path (Only when you earn it)

**After 1 paying fleet:**

* Add multi-user invites + roles (Safety Manager vs Admin)
* Improve doc extraction (auto-suggest more fields)
* Add “audit export” (PDF/CSV of compliance + docs)

**After 10 fleets:**

* Queue + retries for alerts
* Stronger monitoring (Sentry)
* More granular permissions

---

## ⚠️ Honest Limitations (MVP reality)

1. **AI doc extraction won’t be perfect** on day 1.

   * Workaround: manual entry + AI “suggestions,” not autopilot.

2. **Compliance rules vary by fleet/state/doc type.**

   * Workaround: start with a **fixed required-doc checklist** for your first fleet, then generalize.

3. **SMS deliverability can have hidden complexity** (sender types, fees, compliance). ([twilio.com][4])

   * Workaround: start with **Dave-only alerts**, keep volume low, add more later.

---

## ✅ Success Checklist (Technical)

Before launch:

* [ ] Can create fleet + add driver/truck
* [ ] Can upload doc + set expiration
* [ ] Dashboard shows green/yellow/red correctly
* [ ] Daily cron runs and sends at least one email alert
* [ ] SMS alert works for Dave
* [ ] RLS verified: another user cannot see anything

---

## Self-Verification Checklist

| Required Section                     | Present? |
| ------------------------------------ | -------- |
| Platform/approach clearly chosen     | ✅        |
| Alternatives compared with pros/cons | ✅        |
| Tech stack fully specified           | ✅        |
| Trade-offs honestly acknowledged     | ✅        |
| Cost breakdown included              | ✅        |
| Timeline realistic                   | ✅        |
| AI assistance strategy defined       | ✅        |
