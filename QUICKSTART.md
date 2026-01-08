# 🚀 Quick Start Guide - RoadReady

Get RoadReady running locally in 5 steps.

---

## Step 1: Install Dependencies

```bash
npm install
```

**Expected result:** All packages installed without errors.

---

## Step 2: Set Up Supabase (15-20 minutes)

### 2.1 Create Project
1. Go to https://app.supabase.com
2. Click "New Project"
3. Name: `RoadReady`
4. Choose a region and set a strong database password
5. Click "Create new project" and wait ~2 minutes

### 2.2 Get API Credentials
1. Go to **Project Settings** → **API**
2. Copy these values:
   - **Project URL**
   - **anon/public key**
   - **service_role key** (keep this secret!)

### 2.3 Create Database Tables
1. Go to **SQL Editor** in Supabase
2. Open `SUPABASE_SETUP.md` in this project
3. Copy and run each SQL block in order:
   - Table 1: fleets
   - Table 2: drivers
   - Table 3: vehicles
   - Table 4: documents
   - Table 5: alerts

### 2.4 Create Storage Bucket
1. Go to **Storage** in Supabase
2. Click "Create a new bucket"
3. Name: `uploads`
4. Make it **private**
5. Go to **Policies** tab and run the 3 storage policy SQL commands from `SUPABASE_SETUP.md`

### 2.5 Enable Email Auth
1. Go to **Authentication** → **Providers**
2. Ensure "Email" is enabled

---

## Step 3: Configure Environment Variables

Create a file named `.env.local` in the project root:

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here

# Resend (optional for now)
RESEND_API_KEY=

# Twilio (optional for now)
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_FROM_NUMBER=
```

**Replace the values** with your actual Supabase credentials from Step 2.2.

---

## Step 4: Start Development Server

```bash
npm run dev
```

**Expected result:** 
```
▲ Next.js 14.2.0
- Local: http://localhost:3000
✓ Ready in 2.5s
```

---

## Step 5: Test the App

### Test 1: Home Page
1. Open http://localhost:3000
2. ✅ Should see "RoadReady" title
3. Click "Login" → navigates to login page
4. Click "Dashboard (Preview)" → navigates to dashboard

### Test 2: Login Page
1. Go to http://localhost:3000/login
2. ✅ Form displays with email/password fields
3. Enter any credentials and click "Sign in"
4. ✅ Should see placeholder alert

### Test 3: Dashboard
1. Go to http://localhost:3000/dashboard
2. ✅ Should see status cards (Green: 12, Yellow: 3, Red: 2)
3. ✅ Should see quick action buttons
4. ✅ Should see placeholder message

---

## ✅ Success!

If all tests pass, you're ready to continue with Phase 1:

**Next steps:**
1. Implement real Supabase authentication (replace placeholder)
2. Build fleet management CRUD
3. Build driver management CRUD
4. Build vehicle management CRUD

---

## 🐛 Troubleshooting

### Error: "Module not found"
```bash
npm install
```

### Error: "Invalid Supabase URL"
- Check `.env.local` file exists
- Verify credentials are correct (no extra spaces)
- Restart dev server: `Ctrl+C` then `npm run dev`

### Error: "Failed to fetch"
- Make sure Supabase project is fully initialized (wait 2-3 minutes after creation)
- Check that RLS policies are created
- Verify anon key is correct

### Page shows blank/white screen
- Open browser console (F12) to see errors
- Check that dev server is running
- Try hard refresh: `Ctrl+Shift+R`

---

## 📚 Full Documentation

- **`README.md`** - Complete project overview
- **`SUPABASE_SETUP.md`** - Detailed database setup (with all SQL)
- **`ENV_SETUP.md`** - Environment variables reference
- **`PHASE1_IMPLEMENTATION.md`** - What was built and why
- **`AGENTS.md`** - Master plan and roadmap

---

## 🎯 What's Working Now

- ✅ Next.js app with TypeScript
- ✅ Tailwind CSS styling
- ✅ Supabase client plumbing
- ✅ Login page (placeholder)
- ✅ Dashboard page (placeholder)
- ✅ Responsive design
- ⏳ Real authentication (coming next)
- ⏳ Database CRUD operations (coming next)

---

**Time to complete:** ~20-30 minutes (mostly Supabase setup)

**Questions?** Check `PHASE1_IMPLEMENTATION.md` for detailed implementation notes.
