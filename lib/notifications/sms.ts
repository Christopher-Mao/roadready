import twilio from "twilio";

export interface SMSAlertParams {
  to: string;
  entityType: "driver" | "vehicle";
  entityName: string;
  documentType: string;
  expirationDate: string;
  reason: "expired" | "expiring_soon";
  daysUntilExpiration?: number;
}

/**
 * Send an SMS alert about document expiration
 */
export async function sendSMSAlert(params: SMSAlertParams): Promise<{
  success: boolean;
  messageId?: string;
  error?: string;
}> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromNumber = process.env.TWILIO_FROM_NUMBER;

  if (!accountSid || !authToken || !fromNumber) {
    console.warn("Twilio credentials not configured - SMS will not be sent, but alert will be logged");
    return {
      success: false,
      error: "SMS service not configured",
    };
  }

  try {
    const client = twilio(accountSid, authToken);

    const message = buildSMSMessage(params);

    const result = await client.messages.create({
      body: message,
      from: fromNumber,
      to: params.to,
    });

    return {
      success: true,
      messageId: result.sid,
    };
  } catch (error: any) {
    console.error("SMS send error:", error);
    return {
      success: false,
      error: error.message || "Failed to send SMS",
    };
  }
}

function buildSMSMessage(params: SMSAlertParams): string {
  const { entityName, documentType, expirationDate, reason, daysUntilExpiration } = params;
  const isExpired = reason === "expired";
  const entityLabel = params.entityType === "driver" ? "Driver" : "Vehicle";

  if (isExpired) {
    return `🚨 RoadReady ALERT: ${entityLabel} "${entityName}" - ${documentType} EXPIRED on ${new Date(expirationDate).toLocaleDateString()}. Not road-ready. Action required. ${process.env.NEXT_PUBLIC_APP_URL || ""}/dashboard`;
  } else {
    const daysText = daysUntilExpiration === 1 ? "1 day" : `${daysUntilExpiration} days`;
    return `⏰ RoadReady: ${entityLabel} "${entityName}" - ${documentType} expires in ${daysText} (${new Date(expirationDate).toLocaleDateString()}). Renew soon. ${process.env.NEXT_PUBLIC_APP_URL || ""}/dashboard`;
  }
}
