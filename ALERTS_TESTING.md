# Testing Alerts - Complete Guide

This guide explains how to test email and SMS alerts in RoadReady.

## Prerequisites

### 1. Environment Variables

Make sure your `.env.local` file has these configured:

```bash
# Required for Email Alerts
RESEND_API_KEY=re_...
RESEND_FROM_EMAIL=noreply@yourdomain.com  # Optional, defaults to Resend domain
NEXT_PUBLIC_APP_URL=http://localhost:3000  # Or your production URL

# Required for SMS Alerts
TWILIO_ACCOUNT_SID=AC...
TWILIO_AUTH_TOKEN=...
TWILIO_FROM_NUMBER=+1234567890

# Optional: For protecting cron endpoint
CRON_SECRET=your-secret-key
```

### 2. Setup Resend Account
1. Sign up at https://resend.com
2. Get your API key from https://resend.com/api-keys
3. For development, you can use Resend's default domain
4. For production, verify your domain in Resend dashboard

### 3. Setup Twilio Account
1. Sign up at https://www.twilio.com
2. Get Account SID and Auth Token from console
3. Buy a phone number (or use trial number for testing)
4. Note: Trial accounts can only send to verified numbers

## Testing Methods

### Method 1: Manual Test Endpoint (Recommended for Development)

We've created a test endpoint that you can call manually:

**Endpoint:** `GET /api/jobs/check-expirations`

#### Option A: Using Browser
1. Start your dev server: `npm run dev`
2. Open browser to: `http://localhost:3000/api/jobs/check-expirations`
3. Check the response JSON for results

#### Option B: Using cURL
```bash
curl http://localhost:3000/api/jobs/check-expirations
```

#### Option C: Using Postman/Thunder Client
- Method: GET
- URL: `http://localhost:3000/api/jobs/check-expirations`
- Headers: (optional) `Authorization: Bearer your-cron-secret`

### Method 2: Creating Test Data

To test alerts, you need documents with expiration dates:

#### Step 1: Create a Test Driver
1. Go to Dashboard → "Add Driver"
2. Create a driver (e.g., "Test Driver")
3. Note the driver ID

#### Step 2: Upload Test Documents

**For EXPIRED Alert:**
1. Go to driver detail page
2. Click "Upload Document"
3. Upload a file
4. Set Document Type: "CDL" (or "Medical Card")
5. Set Expiration Date: **Yesterday** (or any past date)
6. Click "Upload Document"

**For EXPIRING SOON Alert:**
1. Upload another document
2. Set Document Type: "Insurance" (or any document)
3. Set Expiration Date: **15 days from today** (within 30 days)
4. Click "Upload Document"

#### Step 3: Trigger Alert Check
1. Open browser to: `http://localhost:3000/api/jobs/check-expirations`
2. Check response for:
   ```json
   {
     "success": true,
     "processed": 1,
     "alertsSent": 2,
     "errors": [],
     "timestamp": "..."
   }
   ```
3. Check your email inbox for alerts
4. Check your phone for SMS (if configured)

### Method 3: Check Alert Logs in Database

All alerts are logged in the `alerts` table. Check them in Supabase:

1. Go to Supabase Dashboard → Table Editor → `alerts`
2. Filter by your `fleet_id`
3. Check:
   - `status`: "sent" or "failed"
   - `channel`: "email" or "sms"
   - `sent_at`: timestamp when sent
   - `error`: error message if failed

### Method 4: Using Test Script (Advanced)

Create a test script to trigger alerts programmatically:

```bash
# Save as test-alerts.sh
#!/bin/bash
curl -X GET http://localhost:3000/api/jobs/check-expirations | jq
```

## What to Expect

### Email Alerts

**For Expired Documents:**
- Subject: `RoadReady: Driver "Test Driver" - CDL Expired`
- HTML email with red alert banner
- Details: Driver name, document type, expiration date
- Link to dashboard

**For Expiring Soon:**
- Daily digest email (if multiple documents)
- Subject: `RoadReady Daily Digest: 0 Expired, 1 Expiring Soon`
- Table with all expiring documents
- Days remaining for each

### SMS Alerts

**For Expired:**
```
🚨 RoadReady ALERT: Driver "Test Driver" - CDL EXPIRED on 1/15/2024. Not road-ready. Action required. http://localhost:3000/dashboard
```

**For Expiring Soon:**
```
⏰ RoadReady: Driver "Test Driver" - Insurance expires in 15 days (1/30/2024). Renew soon. http://localhost:3000/dashboard
```

## Troubleshooting

### Emails Not Sending

1. **Check Resend API Key:**
   ```bash
   # In your terminal/console
   echo $RESEND_API_KEY
   ```
   Should show your API key

2. **Check Resend Dashboard:**
   - Go to https://resend.com/emails
   - Check if emails appear in "Sent" or "Failed"
   - Check error messages

3. **Check Server Logs:**
   - Look at terminal running `npm run dev`
   - Check for error messages like "Email service not configured"

4. **Check Alert Status in Database:**
   - Query `alerts` table
   - Look for `status = 'failed'`
   - Check `error` field for details

### SMS Not Sending

1. **Check Twilio Credentials:**
   - Verify Account SID, Auth Token, and From Number in `.env.local`

2. **Trial Account Limitations:**
   - Twilio trial accounts can only send to verified numbers
   - Verify your phone number in Twilio Console
   - Or upgrade to paid account

3. **Check Phone Number Format:**
   - Must be in E.164 format: `+1234567890`
   - Include country code

4. **Check Twilio Console:**
   - Go to https://console.twilio.com/monitor/logs/sms
   - Check for failed messages and errors

### No Alerts Being Sent

1. **Check Documents:**
   - Ensure documents have expiration dates set
   - Check expiration dates are in past (expired) or within 30 days (expiring soon)

2. **Check Alert Duplication Prevention:**
   - Alerts won't be sent if already sent within 24 hours
   - Delete old alerts in database to test again:
     ```sql
     DELETE FROM alerts WHERE created_at < NOW() - INTERVAL '1 day';
     ```

3. **Check Fleet Owner Email:**
   - Ensure user account has an email address
   - Check in Supabase Auth dashboard

4. **Check Job Response:**
   - Look at the JSON response from `/api/jobs/check-expirations`
   - Check `errors` array for specific issues

### Alerts Being Sent but Not Received

1. **Check Spam Folder:**
   - Emails might be in spam/junk folder

2. **Check Email Address:**
   - Verify the email address in your user account is correct
   - Check in Supabase Auth dashboard

3. **Resend Domain Reputation:**
   - If using Resend's default domain, emails might be filtered
   - Consider verifying your own domain for production

4. **SMS Delivery:**
   - Check Twilio logs for delivery status
   - Some carriers may block messages from unverified numbers

## Production Testing

### Before Going Live

1. **Test with Real Credentials:**
   - Use production Resend API key
   - Use production Twilio account

2. **Verify Domain (Resend):**
   - Add SPF and DKIM records to your domain
   - Verify domain in Resend dashboard

3. **Set Up Vercel Cron:**
   - Create `vercel.json`:
   ```json
   {
     "crons": [{
       "path": "/api/jobs/check-expirations",
       "schedule": "0 7 * * *"
     }]
   }
   ```
   - This runs daily at 7am UTC

4. **Set CRON_SECRET:**
   - Generate a secure random string
   - Add to Vercel environment variables
   - Add `Authorization: Bearer your-secret` header in Vercel Cron config

5. **Monitor Logs:**
   - Check Vercel function logs
   - Check Supabase `alerts` table regularly
   - Set up error alerting

## Quick Test Checklist

- [ ] Environment variables configured
- [ ] Resend API key working
- [ ] Twilio credentials working (optional)
- [ ] Test driver/vehicle created
- [ ] Test document with expired date uploaded
- [ ] Test document with expiring soon date uploaded
- [ ] Alert job endpoint called successfully
- [ ] Email received (check spam folder)
- [ ] SMS received (if configured)
- [ ] Alert logged in database with "sent" status
- [ ] No errors in response or logs

## Next Steps

Once alerts are working:
1. Set up Vercel Cron for automatic daily checks
2. Monitor alert delivery rates
3. Adjust alert thresholds if needed (currently 30 days)
4. Consider adding more notification channels (Slack, etc.)
