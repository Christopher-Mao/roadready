import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export interface EmailAlertParams {
  to: string;
  subject: string;
  body: string;
  entityType?: "driver" | "vehicle";
  entityName?: string;
  documentType?: string;
  expirationDate?: string;
  reason: "expired" | "expiring_soon";
}

/**
 * Send an email alert about document expiration
 */
export async function sendEmailAlert(params: EmailAlertParams): Promise<{
  success: boolean;
  messageId?: string;
  error?: string;
}> {
  if (!process.env.RESEND_API_KEY) {
    console.error("RESEND_API_KEY not configured");
    return {
      success: false,
      error: "Email service not configured",
    };
  }

  try {
    // Build email body with HTML formatting
    const htmlBody = buildEmailBody(params);
    const textBody = buildEmailText(params);

    const { data, error } = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || "RoadReady <onboarding@resend.dev>",
      to: params.to,
      subject: params.subject,
      html: htmlBody,
      text: textBody,
    });

    if (error) {
      console.error("Resend API error:", error);
      return {
        success: false,
        error: error.message || "Failed to send email",
      };
    }

    return {
      success: true,
      messageId: data?.id,
    };
  } catch (error: any) {
    console.error("Email send error:", error);
    return {
      success: false,
      error: error.message || "Failed to send email",
    };
  }
}

function buildEmailBody(params: EmailAlertParams): string {
  const { entityName, documentType, expirationDate, reason } = params;
  const isExpired = reason === "expired";
  const urgencyColor = isExpired ? "#dc2626" : "#f59e0b"; // Red or yellow
  const urgencyText = isExpired ? "URGENT" : "Warning";

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #1e40af; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background-color: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; }
          .alert { background-color: ${urgencyColor}; color: white; padding: 15px; border-radius: 4px; margin: 20px 0; text-align: center; font-weight: bold; }
          .details { background-color: white; padding: 15px; border-radius: 4px; margin: 15px 0; }
          .detail-row { margin: 10px 0; }
          .label { font-weight: bold; color: #6b7280; }
          .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>RoadReady Alert</h1>
          </div>
          <div class="content">
            <div class="alert">
              ${urgencyText}: ${isExpired ? "Document Expired" : "Document Expiring Soon"}
            </div>
            <div class="details">
              ${entityName ? `<div class="detail-row"><span class="label">${params.entityType === "driver" ? "Driver" : "Vehicle"}:</span> ${entityName}</div>` : ""}
              ${documentType ? `<div class="detail-row"><span class="label">Document Type:</span> ${documentType}</div>` : ""}
              ${expirationDate ? `<div class="detail-row"><span class="label">Expiration Date:</span> ${new Date(expirationDate).toLocaleDateString()}</div>` : ""}
              <div class="detail-row">
                <span class="label">Status:</span> 
                ${isExpired ? "⚠️ EXPIRED - Not Road Ready" : "⏰ Expiring Soon"}
              </div>
            </div>
            <p style="margin-top: 20px;">
              ${isExpired 
                ? "This document has expired. The driver/vehicle is not road-ready until this is resolved." 
                : "This document will expire soon. Please renew before the expiration date."}
            </p>
            <p style="margin-top: 15px;">
              <a href="${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/dashboard" style="background-color: #1e40af; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; display: inline-block;">
                View Dashboard
              </a>
            </p>
          </div>
          <div class="footer">
            <p>This is an automated alert from RoadReady</p>
            <p>Know who's road-ready. Every day.</p>
          </div>
        </div>
      </body>
    </html>
  `;
}

function buildEmailText(params: EmailAlertParams): string {
  const { entityName, documentType, expirationDate, reason } = params;
  const isExpired = reason === "expired";

  return `
RoadReady Alert: ${isExpired ? "Document Expired" : "Document Expiring Soon"}

${entityName ? `${params.entityType === "driver" ? "Driver" : "Vehicle"}: ${entityName}\n` : ""}
${documentType ? `Document Type: ${documentType}\n` : ""}
${expirationDate ? `Expiration Date: ${new Date(expirationDate).toLocaleDateString()}\n` : ""}
Status: ${isExpired ? "EXPIRED - Not Road Ready" : "Expiring Soon"}

${isExpired 
  ? "This document has expired. The driver/vehicle is not road-ready until this is resolved." 
  : "This document will expire soon. Please renew before the expiration date."}

View Dashboard: ${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/dashboard

---
This is an automated alert from RoadReady
Know who's road-ready. Every day.
  `.trim();
}

/**
 * Send a daily digest email with all expiring/expired items
 */
export async function sendDailyDigest(
  to: string,
  items: Array<{
    entityType: "driver" | "vehicle";
    entityName: string;
    documentType: string;
    expirationDate: string;
    reason: "expired" | "expiring_soon";
    daysUntilExpiration?: number;
  }>
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  if (!process.env.RESEND_API_KEY) {
    return {
      success: false,
      error: "Email service not configured",
    };
  }

  if (items.length === 0) {
    // No items to report
    return { success: true };
  }

  try {
    const expiredItems = items.filter((i) => i.reason === "expired");
    const expiringItems = items.filter((i) => i.reason === "expiring_soon");

    const subject = `RoadReady Daily Digest: ${expiredItems.length} Expired, ${expiringItems.length} Expiring Soon`;

    const htmlBody = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #1e40af; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background-color: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; }
            .section { margin: 20px 0; }
            .section-title { font-size: 18px; font-weight: bold; margin-bottom: 10px; color: #1e40af; }
            .item { background-color: white; padding: 15px; border-radius: 4px; margin: 10px 0; border-left: 4px solid #dc2626; }
            .item.warning { border-left-color: #f59e0b; }
            table { width: 100%; border-collapse: collapse; margin: 15px 0; }
            th { background-color: #f3f4f6; padding: 10px; text-align: left; font-weight: bold; }
            td { padding: 10px; border-bottom: 1px solid #e5e7eb; }
            .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>RoadReady Daily Digest</h1>
            </div>
            <div class="content">
              ${expiredItems.length > 0 ? `
                <div class="section">
                  <div class="section-title">⚠️ Expired Documents (${expiredItems.length})</div>
                  <table>
                    <tr>
                      <th>Type</th>
                      <th>Name</th>
                      <th>Document</th>
                      <th>Expired</th>
                    </tr>
                    ${expiredItems.map(item => `
                      <tr>
                        <td>${item.entityType === "driver" ? "Driver" : "Vehicle"}</td>
                        <td>${item.entityName}</td>
                        <td>${item.documentType}</td>
                        <td>${new Date(item.expirationDate).toLocaleDateString()}</td>
                      </tr>
                    `).join("")}
                  </table>
                </div>
              ` : ""}
              ${expiringItems.length > 0 ? `
                <div class="section">
                  <div class="section-title">⏰ Expiring Soon (${expiringItems.length})</div>
                  <table>
                    <tr>
                      <th>Type</th>
                      <th>Name</th>
                      <th>Document</th>
                      <th>Expires</th>
                      <th>Days Left</th>
                    </tr>
                    ${expiringItems.map(item => `
                      <tr>
                        <td>${item.entityType === "driver" ? "Driver" : "Vehicle"}</td>
                        <td>${item.entityName}</td>
                        <td>${item.documentType}</td>
                        <td>${new Date(item.expirationDate).toLocaleDateString()}</td>
                        <td>${item.daysUntilExpiration || "N/A"}</td>
                      </tr>
                    `).join("")}
                  </table>
                </div>
              ` : ""}
              <p style="margin-top: 20px;">
                <a href="${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/dashboard" style="background-color: #1e40af; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; display: inline-block;">
                  View Dashboard
                </a>
              </p>
            </div>
            <div class="footer">
              <p>This is an automated digest from RoadReady</p>
              <p>Know who's road-ready. Every day.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    const { data, error } = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || "RoadReady <onboarding@resend.dev>",
      to,
      subject,
      html: htmlBody,
    });

    if (error) {
      return {
        success: false,
        error: error.message || "Failed to send email",
      };
    }

    return {
      success: true,
      messageId: data?.id,
    };
  } catch (error: any) {
    console.error("Daily digest send error:", error);
    return {
      success: false,
      error: error.message || "Failed to send email",
    };
    }
}
