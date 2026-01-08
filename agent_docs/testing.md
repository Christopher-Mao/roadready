# Testing Strategy — RoadReady MVP

## Automated tests (keep it light for MVP)
- Start with basic unit tests for:
  - status engine (green/yellow/red)
  - “days until expiration” helper
- Optional later: Playwright E2E for the main flow

## Manual checks (required before demo)
### Auth + access
- [ ] Can sign up / log in
- [ ] Logged-out users cannot access dashboard
- [ ] User A cannot see User B fleet data (RLS check)

### CRUD
- [ ] Add driver, edit driver, list drivers
- [ ] Add vehicle, edit vehicle, list vehicles

### Docs
- [ ] Upload PDF
- [ ] Upload image
- [ ] Attach to driver/vehicle
- [ ] Set doc type + expiration
- [ ] File can be downloaded/viewed via signed URL

### Dashboard logic
- [ ] Shows correct counts of green/yellow/red
- [ ] Status updates when expiration date changes
- [ ] Filters work (drivers vs vehicles; expiring; expired)

### Alerts + cron
- [ ] Running the job route manually sends an email for an expired doc
- [ ] SMS sends to Dave number
- [ ] Duplicate alerts are not spammy (at minimum: don’t send twice in same day for same doc)

### Export
- [ ] Export driver packet (CSV + doc list + timestamps)
- [ ] Export vehicle packet (CSV + doc list + timestamps)

## “Definition of Done” demo script
1) Create fleet → add driver + vehicle
2) Upload doc expiring in 10 days → dashboard shows Yellow
3) Change expires_on to yesterday → dashboard shows Red
4) Run check-expirations → Dave receives email/SMS
5) Export driver packet → download works