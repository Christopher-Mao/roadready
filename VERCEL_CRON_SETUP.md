# Vercel Cron Setup Guide

This guide explains how to set up Vercel Cron jobs for RoadReady's background tasks.

## 📋 Background Jobs

RoadReady has two background jobs that need to run on a schedule:

1. **Check Expirations** (`/api/jobs/check-expirations`)
   - Checks for expiring/expired documents
   - Sends email and SMS alerts
   - Should run **daily** (recommended: 7am UTC)

2. **Retry Failed Alerts** (`/api/jobs/retry-failed-alerts`)
   - Retries failed alerts from the last 24 hours
   - Should run **hourly** (recommended: every hour)

---

## 🚀 Setup Steps

### Step 1: Create `vercel.json`

Create a `vercel.json` file in your project root:

```json
{
  "crons": [
    {
      "path": "/api/jobs/check-expirations",
      "schedule": "0 7 * * *"
    },
    {
      "path": "/api/jobs/retry-failed-alerts",
      "schedule": "0 * * * *"
    }
  ]
}
```

### Step 2: Set CRON_SECRET Environment Variable

For security, set a `CRON_SECRET` environment variable:

1. Go to your Vercel project dashboard
2. Navigate to **Settings** → **Environment Variables**
3. Add a new variable:
   - **Name:** `CRON_SECRET`
   - **Value:** Generate a secure random string (e.g., use `openssl rand -hex 32`)
   - **Environment:** Production, Preview, Development (all)

**Generate a secure secret:**
```bash
# On macOS/Linux
openssl rand -hex 32

# Or use an online generator
# https://randomkeygen.com/
```

**Example value:**
```
a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6
```

### Step 3: Update Cron Configuration with Authorization

Update your `vercel.json` to include authorization headers:

```json
{
  "crons": [
    {
      "path": "/api/jobs/check-expirations",
      "schedule": "0 7 * * *",
      "headers": {
        "Authorization": "Bearer YOUR_CRON_SECRET_HERE"
      }
    },
    {
      "path": "/api/jobs/retry-failed-alerts",
      "schedule": "0 * * * *",
      "headers": {
        "Authorization": "Bearer YOUR_CRON_SECRET_HERE"
      }
    }
  ]
}
```

**⚠️ Important:** Replace `YOUR_CRON_SECRET_HERE` with your actual `CRON_SECRET` value.

**Better approach:** Use Vercel's environment variable reference (recommended):

```json
{
  "crons": [
    {
      "path": "/api/jobs/check-expirations",
      "schedule": "0 7 * * *"
    },
    {
      "path": "/api/jobs/retry-failed-alerts",
      "schedule": "0 * * * *"
    }
  ]
}
```

Then in Vercel dashboard, when configuring the cron job, add the Authorization header manually, or the code will read `process.env.CRON_SECRET` from environment variables.

### Step 4: Deploy to Vercel

1. Commit and push your `vercel.json` file:
   ```bash
   git add vercel.json
   git commit -m "Add Vercel Cron configuration"
   git push
   ```

2. Vercel will automatically detect the cron jobs on deployment

3. Verify in Vercel Dashboard:
   - Go to **Settings** → **Cron Jobs**
   - You should see both cron jobs listed
   - Check their schedules and status

---

## 📅 Cron Schedule Examples

### Daily at 7am UTC
```
0 7 * * *
```

### Every Hour
```
0 * * * *
```

### Every 30 Minutes
```
*/30 * * * *
```

### Every Day at 9am EST (UTC-5)
```
0 14 * * *  (9am EST = 2pm UTC)
```

### Every Monday at 8am UTC
```
0 8 * * 1
```

### Cron Schedule Format
```
┌───────────── minute (0 - 59)
│ ┌───────────── hour (0 - 23)
│ │ ┌───────────── day of month (1 - 31)
│ │ │ ┌───────────── month (1 - 12)
│ │ │ │ ┌───────────── day of week (0 - 6) (Sunday to Saturday)
│ │ │ │ │
* * * * *
```

---

## 🧪 Testing Cron Jobs

### Test Locally (Development)

In development, you can manually trigger the cron jobs:

```bash
# Test check-expirations
curl http://localhost:3000/api/jobs/check-expirations

# Test retry-failed-alerts
curl http://localhost:3000/api/jobs/retry-failed-alerts
```

Or visit in browser:
- `http://localhost:3000/api/jobs/check-expirations`
- `http://localhost:3000/api/jobs/retry-failed-alerts`

**Note:** In development, these endpoints work without authentication when running on localhost.

### Test in Production

1. **Manual Trigger (Vercel Dashboard):**
   - Go to **Settings** → **Cron Jobs**
   - Click on a cron job
   - Click "Run Now" to test

2. **Check Logs:**
   - Go to **Deployments** → Select latest deployment
   - Click "Functions" tab
   - Find your cron job function
   - Check logs for execution results

3. **Verify Results:**
   - Check Supabase `alerts` table for new entries
   - Check email/SMS delivery
   - Check audit trail for logged changes

---

## 🔍 Monitoring Cron Jobs

### Vercel Dashboard

1. **Cron Jobs Status:**
   - Go to **Settings** → **Cron Jobs**
   - See last run time, next run time, and status

2. **Function Logs:**
   - Go to **Deployments** → Select deployment
   - Click "Functions" tab
   - View logs for each cron execution

### Health Check Endpoint

Use the health check endpoint to monitor system status:

```bash
curl https://your-app.vercel.app/api/health
```

Response includes:
- System status (healthy/degraded/unhealthy)
- Service statuses (database, storage, email, SMS)
- Metrics (pending reviews, failed alerts, etc.)

### Set Up External Monitoring (Optional)

Use services like:
- **UptimeRobot** - Monitor health endpoint
- **Pingdom** - Monitor cron job endpoints
- **Better Uptime** - Monitor with alerts

---

## 🐛 Troubleshooting

### Cron Job Not Running

1. **Check Vercel Dashboard:**
   - Go to **Settings** → **Cron Jobs**
   - Verify cron jobs are listed and enabled
   - Check last run time

2. **Check Environment Variables:**
   - Verify `CRON_SECRET` is set in Vercel
   - Check it matches the value in your code

3. **Check Function Logs:**
   - Look for errors in function execution logs
   - Check for authentication failures

4. **Verify Schedule:**
   - Ensure cron schedule syntax is correct
   - Use a cron validator: https://crontab.guru/

### Authentication Errors

If you see "Unauthorized" errors:

1. **Check CRON_SECRET:**
   - Verify it's set in Vercel environment variables
   - Ensure it matches in `vercel.json` headers (if used)

2. **Check Authorization Header:**
   - Vercel automatically adds headers from `vercel.json`
   - Or manually configure in Vercel dashboard

3. **Development vs Production:**
   - Development allows localhost without auth
   - Production requires `CRON_SECRET`

### Cron Job Running But No Results

1. **Check Function Logs:**
   - Look for errors in execution
   - Check database connection issues

2. **Verify Data:**
   - Check if there are documents to process
   - Verify fleet owners have email addresses
   - Check alert configuration

3. **Check Service Status:**
   - Use `/api/health` endpoint
   - Verify email/SMS services are configured

---

## 📝 Example `vercel.json` (Complete)

Here's a complete example with both cron jobs:

```json
{
  "crons": [
    {
      "path": "/api/jobs/check-expirations",
      "schedule": "0 7 * * *"
    },
    {
      "path": "/api/jobs/retry-failed-alerts",
      "schedule": "0 * * * *"
    }
  ]
}
```

**Note:** The authorization header is handled by the code reading `process.env.CRON_SECRET`. If you want to set it in `vercel.json`, you can use:

```json
{
  "crons": [
    {
      "path": "/api/jobs/check-expirations",
      "schedule": "0 7 * * *",
      "headers": {
        "Authorization": "Bearer ${CRON_SECRET}"
      }
    },
    {
      "path": "/api/jobs/retry-failed-alerts",
      "schedule": "0 * * * *",
      "headers": {
        "Authorization": "Bearer ${CRON_SECRET}"
      }
    }
  ]
}
```

However, Vercel doesn't support environment variable substitution in `vercel.json`. The better approach is to let the code handle it (which it already does).

---

## ✅ Checklist

- [ ] Created `vercel.json` with cron jobs
- [ ] Set `CRON_SECRET` environment variable in Vercel
- [ ] Deployed to Vercel
- [ ] Verified cron jobs appear in Vercel dashboard
- [ ] Tested cron jobs manually
- [ ] Checked function logs for errors
- [ ] Verified alerts are being sent
- [ ] Set up monitoring (optional)

---

## 🎯 Recommended Schedule

For RoadReady MVP:

- **Check Expirations:** Daily at 7am UTC (when fleet managers start their day)
- **Retry Failed Alerts:** Every hour (to catch any missed alerts quickly)

Adjust based on your timezone and needs!

---

## 📚 Additional Resources

- [Vercel Cron Jobs Documentation](https://vercel.com/docs/cron-jobs)
- [Cron Schedule Generator](https://crontab.guru/)
- [Vercel Environment Variables](https://vercel.com/docs/concepts/projects/environment-variables)
