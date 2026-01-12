import { NextResponse } from "next/server";
import { sendEmailAlert } from "@/lib/notifications/email";
import { sendSMSAlert } from "@/lib/notifications/sms";

/**
 * GET /api/test/notifications
 * 
 * Test endpoint to check if notification services are configured correctly
 * and can send test alerts.
 * 
 * This endpoint helps debug environment variable issues.
 */
export async function GET() {
  const diagnostics = {
    timestamp: new Date().toISOString(),
    environment: {
      nodeEnv: process.env.NODE_ENV,
      hasResendKey: !!process.env.RESEND_API_KEY,
      hasResendFromEmail: !!process.env.RESEND_FROM_EMAIL,
      hasTwilioSid: !!process.env.TWILIO_ACCOUNT_SID,
      hasTwilioToken: !!process.env.TWILIO_AUTH_TOKEN,
      hasTwilioFromNumber: !!process.env.TWILIO_FROM_NUMBER,
      hasAppUrl: !!process.env.NEXT_PUBLIC_APP_URL,
    },
    resendKeyLength: process.env.RESEND_API_KEY?.length || 0,
    resendKeyPrefix: process.env.RESEND_API_KEY?.substring(0, 3) || "N/A",
    errors: [] as string[],
    tests: {
      email: null as any,
      sms: null as any,
    },
  };

  // Test email configuration
  if (!process.env.RESEND_API_KEY) {
    diagnostics.errors.push("RESEND_API_KEY is not set");
  } else {
    // Try to send a test email (but don't actually send unless test=true)
    const testEmail = process.env.TEST_EMAIL || "test@example.com";
    try {
      // Just check if Resend client can be created
      const { Resend } = await import("resend");
      const resend = new Resend(process.env.RESEND_API_KEY);
      diagnostics.tests.email = {
        clientCreated: true,
        message: "Resend client created successfully",
      };
    } catch (error: any) {
      diagnostics.errors.push(`Email client error: ${error.message}`);
      diagnostics.tests.email = {
        clientCreated: false,
        error: error.message,
      };
    }
  }

  // Test SMS configuration
  if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN || !process.env.TWILIO_FROM_NUMBER) {
    diagnostics.errors.push("Twilio credentials are not fully configured");
  } else {
    try {
      // Just check if Twilio client can be created
      const twilio = (await import("twilio")).default;
      const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
      diagnostics.tests.sms = {
        clientCreated: true,
        message: "Twilio client created successfully",
      };
    } catch (error: any) {
      diagnostics.errors.push(`SMS client error: ${error.message}`);
      diagnostics.tests.sms = {
        clientCreated: false,
        error: error.message,
      };
    }
  }

  return NextResponse.json(diagnostics, {
    status: diagnostics.errors.length > 0 ? 200 : 200, // Still return 200 to show diagnostics
  });
}
