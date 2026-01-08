# RoadReady

**Know who's road-ready. Every day.**

A compliance command center that turns messy driver/vehicle paperwork into a single truth: who's legal to operate today, what's expiring soon, and what to fix next — with audit-ready evidence and no alert spam.

## 🚀 Tech Stack

- **Framework:** Next.js 14 (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS
- **Database/Auth/Storage:** Supabase
- **Hosting:** Vercel
- **Email:** Resend
- **SMS:** Twilio

## 📋 Getting Started

### Prerequisites

- Node.js 18+ installed
- A Supabase account (free tier works)
- Git

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-username/roadready.git
   cd roadready
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up Supabase**
   - Follow the complete guide in `SUPABASE_SETUP.md`
   - Create your Supabase project
   - Run all SQL commands to create tables
   - Set up storage bucket and policies

4. **Configure environment variables**
   - See `ENV_SETUP.md` for required variables
   - Create a `.env.local` file in the root directory
   - Add your Supabase credentials

5. **Run the development server**
   ```bash
   npm run dev
   ```

6. **Open your browser**
   - Navigate to [http://localhost:3000](http://localhost:3000)
   - You should see the RoadReady home page

## 📁 Project Structure

```
roadready/
├── app/                      # Next.js App Router
│   ├── (auth)/              # Auth-related pages (login, signup)
│   ├── (app)/               # Main app pages (dashboard, drivers, vehicles)
│   ├── api/                 # API routes
│   ├── globals.css          # Global styles
│   ├── layout.tsx           # Root layout
│   └── page.tsx             # Home page
├── components/              # Reusable UI components
├── lib/                     # Utility functions and clients
│   └── supabase/           # Supabase client configurations
│       ├── client.ts       # Browser client
│       ├── server.ts       # Server client
│       └── admin.ts        # Admin client (service role)
├── agent_docs/             # AI agent documentation
├── docs/                   # Product documentation
├── AGENTS.md               # Master plan for AI agents
├── SUPABASE_SETUP.md       # Complete Supabase setup guide
└── ENV_SETUP.md            # Environment variables guide
```

## 🎯 Current Phase: Phase 1 - Foundation

### Completed
- ✅ Next.js app initialized with TypeScript and Tailwind
- ✅ Basic folder structure set up
- ✅ Supabase client utilities created (browser, server, admin)
- ✅ Login placeholder page
- ✅ Dashboard placeholder page
- ✅ Supabase schema documentation

### Next Steps
1. Complete Supabase project setup (follow `SUPABASE_SETUP.md`)
2. Implement real authentication with Supabase Auth
3. Build CRUD operations for fleets, drivers, and vehicles
4. Add document upload functionality
5. Implement status computation logic

## 🧪 Testing Locally

### Manual Test Checklist

1. **Home Page**
   - [ ] Visit http://localhost:3000
   - [ ] Verify "RoadReady" title displays
   - [ ] Click "Login" button → should navigate to /login
   - [ ] Click "Dashboard (Preview)" → should navigate to /dashboard

2. **Login Page**
   - [ ] Visit http://localhost:3000/login
   - [ ] Verify form displays with email and password fields
   - [ ] Enter test credentials and click "Sign in"
   - [ ] Should see placeholder alert (auth not yet implemented)

3. **Dashboard Page**
   - [ ] Visit http://localhost:3000/dashboard
   - [ ] Verify status cards display (Green: 12, Yellow: 3, Red: 2)
   - [ ] Verify quick action buttons display
   - [ ] Verify placeholder message displays

## 📚 Documentation

- **`AGENTS.md`** - Master plan and project overview
- **`SUPABASE_SETUP.md`** - Complete database setup guide
- **`ENV_SETUP.md`** - Environment variables configuration
- **`agent_docs/`** - Detailed documentation for AI agents
  - `product_requirements.md` - Full PRD
  - `tech_stack.md` - Stack details and service setup
  - `code_patterns.md` - Code structure and patterns
  - `testing.md` - Testing strategy

## 🔐 Security Notes

- Never commit `.env.local` to version control
- The `SUPABASE_SERVICE_ROLE_KEY` bypasses Row Level Security - use only in API routes
- All user data is protected by RLS policies
- Storage bucket is private by default

## 🚢 Deployment

Deployment instructions will be added once Phase 1 is complete.

## 📝 License

Private project - All rights reserved

## 🤝 Contributing

This is a private MVP project. Contribution guidelines will be added later.

---

**Built with ❤️ for fleet managers who deserve better tools**
