# Environment Variables Setup

Create a `.env.local` file in the root directory with the following variables:

```bash
# Supabase Configuration
# Get these from your Supabase project settings: https://app.supabase.com/project/_/settings/api
NEXT_PUBLIC_SUPABASE_URL=your-project-url.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# Supabase Service Role Key (server-side only - NEVER expose to client)
# Use this for admin operations that bypass RLS
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Resend (Email notifications)
# Get your API key from: https://resend.com/api-keys
RESEND_API_KEY=re_your_api_key

# Twilio (SMS notifications)
# Get these from: https://console.twilio.com/
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_FROM_NUMBER=+1234567890
```

## Setup Instructions

1. Copy the above content into a new file named `.env.local`
2. Replace all placeholder values with your actual credentials
3. Never commit `.env.local` to git (it's already in .gitignore)
