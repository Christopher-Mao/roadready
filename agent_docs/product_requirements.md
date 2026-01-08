# Product Requirements — RoadReady MVP

## Product Overview
- App Name RoadReady
- Tagline Know who’s road-ready. Every day.
- Launch Goal Replace spreadsheets for one real fleet and secure the first paying customer
- Target Launch Demo-ready in ~3 weeks
- Platform Web (desktop-first, mobile-friendly)
- Performance Page load  3 seconds
- Design Vibe Calm, trustworthy, simple, boring-in-a-good-way

## Primary User “Dave” (Safety Manager)
Dave manages compliance for a 20–40 truck fleet. Compliance lives in spreadsheetsemailfolders; expirations sneak up; audits cause scramble.
He needs one screen that answers “Is this driver and truck legal to be on the road today”

## Example User Story (exact)
 Meet Dave, a safety manager who never fully trusts his spreadsheets. Every day he worries something expired without him noticing. He needs one reliable place that tells him who’s road-ready today so he can stop checking paperwork and sleep better at night.

## MVP Features

### Must Have for Launch (P0)
1) Document Upload
- Upload PDFs or photos for driver and vehicle documents
- Attach docs to drivers or vehicles

2) Automatic Document Understanding
- Detect document type
- Extract expiration date
- Low-confidence items flagged for review (must not auto-change compliance status)

3) Compliance Dashboard (GreenYellowRed)
- Loads in 3 seconds
- Updates when docs change
- Status mapping
  - Green RoadReady
  - Yellow Expiring Soon
  - Red Not RoadReady

4) Expiration Alerts (EmailSMS)
- Alerts sent at configurable intervals
- Red = immediate alert

5) Audit-Ready Export
- Export by driver or vehicle
- Includes document list and timestamps
- Output as PDF or CSV (MVP can start with CSV + downloadable files list)

## NOT in MVP (exact)
- Driver mobile app
- ELD  TMS integrations
- Dispatch blocking logic
- Advanced permissions and workflows
- Predictive AI features

## Launch Success Metrics (First 30 Days)
- Spreadsheet replacement YesNo (Dave stops using spreadsheets)
- Missed expirations 0 (No expired docs without alerts)
- User feedback Positive (“Saved me hours every week”)

## Quality Standards (non-negotiables)
- No placeholder content in production
- No low-confidence AI changing compliance status automatically
- No broken features hidden behind UI
- Must test on mobile before launch