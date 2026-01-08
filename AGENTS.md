# AGENTS.md - Master Plan for RoadReady

## 🎯 Project Overview
**App:** RoadReady  
**Tagline:** Know who’s road-ready. Every day.  
**Goal:** A compliance command center that turns messy driver/vehicle paperwork into a single truth: who’s legal to operate today, what’s expiring soon, and what to fix next — with audit-ready evidence and no alert spam.  
**Primary User:** “Dave” (Safety Manager at a 20–40 truck fleet)  
**Stack:** Next.js + Supabase (DB/Auth/Storage) + Vercel + Resend (email) + Twilio (SMS)  
**Current Phase:** Phase 1 — Foundation (Ship a working end-to-end flow fast)

## 🧠 How I Should Think
1. **Understand Intent First**: Before answering, identify what the user actually needs.
2. **Ask If Unsure**: If critical info is missing, ask before proceeding.
3. **Plan Before Coding**: Outline approach, get approval, then implement.
4. **Test After Changes**: Verify each change works before moving on.
5. **Explain Trade-offs**: When recommending something, mention alternatives.

## 📁 Context Files (load only when needed)
- `agent_docs/product_requirements.md`: Full PRD scope + definitions
- `agent_docs/tech_stack.md`: Exact stack setup + services + env vars
- `agent_docs/code_patterns.md`: Folder structure + patterns + “how we build”
- `agent_docs/testing.md`: Testing strategy + manual checks (MVP)

## 🔄 Current State (Update This!)
**Last Updated:** 2026-01-07  
**Working On:** Phase 1 — repo setup + Supabase wiring + basic CRUD  
**Recently Completed:** Instruction system created (AGENTS + docs)  
**Blocked By:** None

## 🚀 Roadmap

### Phase 1: Foundation (MVP skeleton)
- [ ] Initialize Next.js repo + UI kit + lint/test baseline
- [ ] Create Supabase project + tables + RLS
- [ ] Auth: email/password login
- [ ] Core entities: fleets, drivers, vehicles CRUD
- [ ] Storage bucket for uploads (private) + signed URL access

### Phase 2: Core Features (MVP value)
- [ ] Document upload (PDF/images) + attach to driver/vehicle
- [ ] Document “understanding” (MVP-safe): manual entry first, AI suggests later
- [ ] Green/Yellow/Red dashboard with filters (drivers/vehicles, expiring, expired)
- [ ] Alerts: email + SMS (Dave-only to start)
- [ ] Audit-ready export: per driver/vehicle (CSV + doc list + timestamps)

### Phase 3: Trust Hardening (still MVP)
- [ ] Review Queue for low-confidence extraction (no auto-red from low confidence)
- [ ] Audit trail (document changes + alert logs)
- [ ] Retry logic for background job + basic monitoring

## ✅ MVP Definitions (Truth & Safety Rules)

### Status mapping
- **Green:** RoadReady (no missing required docs + nothing expiring soon)
- **Yellow:** Expiring Soon (within configurable window, default 30 days)
- **Red:** Not RoadReady (expired OR missing required doc)

### Non-negotiable trust rule
- **Low-confidence AI must NOT change compliance status automatically.**
- If unsure: mark “Needs Review” and keep status based on last confirmed fields.

### Explicitly NOT in MVP
- Driver mobile app
- ELD/TMS integrations
- Dispatch blocking logic
- Advanced permissions/workflows
- Predictive AI features

## ⚠️ What NOT To Do
- Do NOT delete files without explicit confirmation
- Do NOT modify database schemas without a clear migration plan
- Do NOT add features not in the current phase
- Do NOT skip tests for "simple" changes
- Do NOT allow low-confidence AI to set Red automatically

## 🧰 What “done” looks like (end-to-end smoke test)
A safety manager can:
1) sign up/login → 2) create fleet → 3) add driver + vehicle →  
4) upload a document + set doc type + expiration →  
5) dashboard shows correct status →  
6) a cron job sends an email/SMS for expiring/expired →  
7) export a driver/vehicle packet (CSV + doc list + timestamps)