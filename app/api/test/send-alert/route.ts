import { NextRequest, NextResponse } from "next/server";
import { sendEmailAlert } from "@/lib/notifications/email";
import { sendSMSAlert } from "@/lib/notifications/sms";

/**
 * POST /api/test/send-alert
 * 
 * Test endpoint to actually send a test alert.
 * 
 * Body:
 * {
 *   "email": "your-email@example.com",
 *   "phone": "+1234567890",  // Optional
 *   "testType": "email" | "sms" | "both"
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, phone, testType = "email" } = body;

    if (!email && testType !== "sms") {
      return NextResponse.json(
        { error: "Email address is required" },
        { status: 400 }
      );
    }

    const results: any = {
      timestamp: new Date().toISOString(),
      email: null,
      sms: null,
      errors: [],
    };

    // Test email
    if (testType === "email" || testType === "both") {
      if (!email) {
        results.errors.push("Email address required for email test");
      } else {
        const emailResult = await sendEmailAlert({
          to: email,
          subject: "RoadReady Test Alert - Expired Document",
          body: "This is a test alert from RoadReady",
          entityType: "driver",
          entityName: "Test Driver",
          documentType: "CDL",
          expirationDate: new Date().toISOString(),
          reason: "expired",
        });

        results.email = emailResult;

        if (!emailResult.success) {
          results.errors.push(`Email failed: ${emailResult.error}`);
        }
      }
    }

    // Test SMS
    if (testType === "sms" || testType === "both") {
      if (!phone) {
        results.errors.push("Phone number required for SMS test");
      } else {
        const smsResult = await sendSMSAlert({
          to: phone,
          entityType: "driver",
          entityName: "Test Driver",
          documentType: "CDL",
          expirationDate: new Date().toISOString(),
          reason: "expired",
        });

        results.sms = smsResult;

        if (!smsResult.success) {
          results.errors.push(`SMS failed: ${smsResult.error}`);
        }
      }
    }

    return NextResponse.json(results, {
      status: results.errors.length > 0 ? 200 : 200, // Show results even if errors
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        error: error.message || "Internal server error",
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
