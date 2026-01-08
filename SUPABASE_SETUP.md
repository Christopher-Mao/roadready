# Supabase Setup Checklist for RoadReady

This document provides step-by-step instructions for setting up your Supabase project, creating tables, and configuring Row Level Security (RLS).

## Phase 1: Create Supabase Project

### Step 1: Create Project
1. Go to https://app.supabase.com
2. Click "New Project"
3. Fill in:
   - **Name:** RoadReady
   - **Database Password:** (generate a strong password and save it securely)
   - **Region:** Choose closest to your users
4. Click "Create new project"
5. Wait for project to finish setting up (~2 minutes)

### Step 2: Get API Credentials
1. Go to Project Settings → API
2. Copy the following values to your `.env.local`:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon/public key** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role key** → `SUPABASE_SERVICE_ROLE_KEY` (⚠️ Keep secret!)

### Step 3: Enable Email Auth
1. Go to Authentication → Providers
2. Ensure "Email" is enabled
3. Configure email settings (can use default for MVP)

---

## Phase 2: Create Database Tables

Go to **SQL Editor** in your Supabase dashboard and run these SQL commands in order:

### Table 1: fleets

```sql
-- Fleets table: represents a trucking company/fleet
CREATE TABLE fleets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for faster lookups
CREATE INDEX idx_fleets_owner_id ON fleets(owner_id);

-- Enable RLS
ALTER TABLE fleets ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only see their own fleets
CREATE POLICY "Users can view their own fleets"
  ON fleets FOR SELECT
  USING (auth.uid() = owner_id);

-- RLS Policy: Users can create fleets
CREATE POLICY "Users can create fleets"
  ON fleets FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

-- RLS Policy: Users can update their own fleets
CREATE POLICY "Users can update their own fleets"
  ON fleets FOR UPDATE
  USING (auth.uid() = owner_id);

-- RLS Policy: Users can delete their own fleets
CREATE POLICY "Users can delete their own fleets"
  ON fleets FOR DELETE
  USING (auth.uid() = owner_id);
```

### Table 2: drivers

```sql
-- Drivers table: represents truck drivers
CREATE TABLE drivers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fleet_id UUID NOT NULL REFERENCES fleets(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  cdl_number TEXT,
  status TEXT DEFAULT 'green' CHECK (status IN ('green', 'yellow', 'red')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_drivers_fleet_id ON drivers(fleet_id);
CREATE INDEX idx_drivers_status ON drivers(status);

-- Enable RLS
ALTER TABLE drivers ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only see drivers in their fleets
CREATE POLICY "Users can view drivers in their fleets"
  ON drivers FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM fleets
      WHERE fleets.id = drivers.fleet_id
      AND fleets.owner_id = auth.uid()
    )
  );

-- RLS Policy: Users can create drivers in their fleets
CREATE POLICY "Users can create drivers in their fleets"
  ON drivers FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM fleets
      WHERE fleets.id = drivers.fleet_id
      AND fleets.owner_id = auth.uid()
    )
  );

-- RLS Policy: Users can update drivers in their fleets
CREATE POLICY "Users can update drivers in their fleets"
  ON drivers FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM fleets
      WHERE fleets.id = drivers.fleet_id
      AND fleets.owner_id = auth.uid()
    )
  );

-- RLS Policy: Users can delete drivers in their fleets
CREATE POLICY "Users can delete drivers in their fleets"
  ON drivers FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM fleets
      WHERE fleets.id = drivers.fleet_id
      AND fleets.owner_id = auth.uid()
    )
  );
```

### Table 3: vehicles

```sql
-- Vehicles table: represents trucks/vehicles
CREATE TABLE vehicles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fleet_id UUID NOT NULL REFERENCES fleets(id) ON DELETE CASCADE,
  unit_number TEXT NOT NULL,
  vin TEXT,
  make TEXT,
  model TEXT,
  year INTEGER,
  status TEXT DEFAULT 'green' CHECK (status IN ('green', 'yellow', 'red')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_vehicles_fleet_id ON vehicles(fleet_id);
CREATE INDEX idx_vehicles_status ON vehicles(status);

-- Enable RLS
ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only see vehicles in their fleets
CREATE POLICY "Users can view vehicles in their fleets"
  ON vehicles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM fleets
      WHERE fleets.id = vehicles.fleet_id
      AND fleets.owner_id = auth.uid()
    )
  );

-- RLS Policy: Users can create vehicles in their fleets
CREATE POLICY "Users can create vehicles in their fleets"
  ON vehicles FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM fleets
      WHERE fleets.id = vehicles.fleet_id
      AND fleets.owner_id = auth.uid()
    )
  );

-- RLS Policy: Users can update vehicles in their fleets
CREATE POLICY "Users can update vehicles in their fleets"
  ON vehicles FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM fleets
      WHERE fleets.id = vehicles.fleet_id
      AND fleets.owner_id = auth.uid()
    )
  );

-- RLS Policy: Users can delete vehicles in their fleets
CREATE POLICY "Users can delete vehicles in their fleets"
  ON vehicles FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM fleets
      WHERE fleets.id = vehicles.fleet_id
      AND fleets.owner_id = auth.uid()
    )
  );
```

### Table 4: documents

```sql
-- Documents table: stores uploaded compliance documents
CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fleet_id UUID NOT NULL REFERENCES fleets(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('driver', 'vehicle')),
  entity_id UUID NOT NULL,
  doc_type TEXT NOT NULL,
  file_path TEXT NOT NULL,
  expires_on DATE,
  status TEXT DEFAULT 'green' CHECK (status IN ('green', 'yellow', 'red')),
  needs_review BOOLEAN DEFAULT FALSE,
  uploaded_by UUID REFERENCES auth.users(id),
  uploaded_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_documents_fleet_id ON documents(fleet_id);
CREATE INDEX idx_documents_entity ON documents(entity_type, entity_id);
CREATE INDEX idx_documents_expires_on ON documents(expires_on);
CREATE INDEX idx_documents_status ON documents(status);
CREATE INDEX idx_documents_needs_review ON documents(needs_review) WHERE needs_review = TRUE;

-- Enable RLS
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only see documents in their fleets
CREATE POLICY "Users can view documents in their fleets"
  ON documents FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM fleets
      WHERE fleets.id = documents.fleet_id
      AND fleets.owner_id = auth.uid()
    )
  );

-- RLS Policy: Users can create documents in their fleets
CREATE POLICY "Users can create documents in their fleets"
  ON documents FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM fleets
      WHERE fleets.id = documents.fleet_id
      AND fleets.owner_id = auth.uid()
    )
  );

-- RLS Policy: Users can update documents in their fleets
CREATE POLICY "Users can update documents in their fleets"
  ON documents FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM fleets
      WHERE fleets.id = documents.fleet_id
      AND fleets.owner_id = auth.uid()
    )
  );

-- RLS Policy: Users can delete documents in their fleets
CREATE POLICY "Users can delete documents in their fleets"
  ON documents FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM fleets
      WHERE fleets.id = documents.fleet_id
      AND fleets.owner_id = auth.uid()
    )
  );
```

### Table 5: alerts

```sql
-- Alerts table: tracks sent notifications
CREATE TABLE alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fleet_id UUID NOT NULL REFERENCES fleets(id) ON DELETE CASCADE,
  channel TEXT NOT NULL CHECK (channel IN ('email', 'sms')),
  to_address TEXT NOT NULL,
  reason TEXT NOT NULL,
  entity_type TEXT CHECK (entity_type IN ('driver', 'vehicle')),
  entity_id UUID,
  document_id UUID REFERENCES documents(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'queued' CHECK (status IN ('queued', 'sent', 'failed')),
  error TEXT,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_alerts_fleet_id ON alerts(fleet_id);
CREATE INDEX idx_alerts_status ON alerts(status);
CREATE INDEX idx_alerts_created_at ON alerts(created_at DESC);

-- Enable RLS
ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only see alerts for their fleets
CREATE POLICY "Users can view alerts for their fleets"
  ON alerts FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM fleets
      WHERE fleets.id = alerts.fleet_id
      AND fleets.owner_id = auth.uid()
    )
  );

-- RLS Policy: System can create alerts (service role only)
CREATE POLICY "Service role can create alerts"
  ON alerts FOR INSERT
  WITH CHECK (TRUE);
```

---

## Phase 3: Create Storage Bucket

### Step 1: Create Bucket
1. Go to **Storage** in Supabase dashboard
2. Click "Create a new bucket"
3. Name: `uploads`
4. Make it **private** (not public)
5. Click "Create bucket"

### Step 2: Set Storage Policies
1. Click on the `uploads` bucket
2. Go to "Policies" tab
3. Create the following policies:

**Policy 1: Users can upload to their fleet folder**
```sql
CREATE POLICY "Users can upload to their fleet folder"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'uploads' AND
  auth.uid()::text = (storage.foldername(name))[1]
);
```

**Policy 2: Users can read their fleet files**
```sql
CREATE POLICY "Users can read their fleet files"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'uploads' AND
  auth.uid()::text = (storage.foldername(name))[1]
);
```

**Policy 3: Users can delete their fleet files**
```sql
CREATE POLICY "Users can delete their fleet files"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'uploads' AND
  auth.uid()::text = (storage.foldername(name))[1]
);
```

---

## Phase 4: Verify Setup

### Checklist
- [ ] Supabase project created
- [ ] API credentials copied to `.env.local`
- [ ] Email auth enabled
- [ ] `fleets` table created with RLS policies
- [ ] `drivers` table created with RLS policies
- [ ] `vehicles` table created with RLS policies
- [ ] `documents` table created with RLS policies
- [ ] `alerts` table created with RLS policies
- [ ] `uploads` storage bucket created (private)
- [ ] Storage policies configured

### Test Your Setup
1. Run `npm install` in your project
2. Run `npm run dev`
3. Visit http://localhost:3000
4. Try to access the login page
5. Once you add auth functionality, test creating a user

---

## Notes

- **RLS (Row Level Security)** ensures users can only access their own fleet data
- The `service_role` key bypasses RLS - use it carefully only in API routes
- All timestamps use `TIMESTAMPTZ` for timezone awareness
- Status values are constrained to 'green', 'yellow', 'red' for consistency
- Document file paths should follow pattern: `{user_id}/{fleet_id}/{entity_type}/{entity_id}/{filename}`

---

## Troubleshooting

**Problem:** RLS policies not working
- **Solution:** Make sure you're using the anon key (not service role) in client-side code

**Problem:** Can't insert data
- **Solution:** Check that your user is authenticated and the fleet_id exists

**Problem:** Storage upload fails
- **Solution:** Verify storage policies are created and file path matches policy pattern
