import net from "net";
import tls from "tls";
import axios from "axios";
import { generatePreBookingPdfBuffer, PreBookingReportData } from "./pdfGenerator";

export interface SendPreBookingEmailParams {
  bookingId: string;
  userName: string;
  userEmail: string;
  mobileNumber: string;
  cropName: string;
  quantity: string | number;
  unit: string;
  referencePrice: string | number;
  bookingDate: string;
  bookingTime: string;
  bookingStatus: string;
  preferredLocation?: string;
  notes?: string;
  t_booking_saved?: number;
  t_email_job_started?: number;
}

export interface SendEmailResult {
  success: boolean;
  messageId?: string;
  resendEmailId?: string | null;
  error?: string;
  provider?: "resend" | "smtp";
  details?: any;
  timing?: {
    t_booking_saved?: number;
    t_email_job_started?: number;
    t_backend_received?: number;
    t_pdf_gen_started?: number;
    t_pdf_gen_completed?: number;
    t_pdf_attachment_ready?: number;
    t_resend_req_started?: number;
    t_resend_resp_received?: number;
    t_resend_id_received?: number;
    backend_received_after_ms?: number;
    pdf_gen_time_ms: number;
    attachment_prep_time_ms: number;
    resend_req_time_ms: number;
    total_email_proc_time_ms: number;
  };
}

/**
 * Sends a simple test email via Resend (Step 4 & Step 6 debugging).
 */
export async function sendSimpleTestEmail(toEmail: string, includePdf = false): Promise<SendEmailResult> {
  console.log(`\n================ [AGRINEX SIMPLE TEST EMAIL] ================`);
  console.log(`- Recipient email: ${toEmail || "MISSING"}`);
  console.log(`- RESEND_API_KEY configured: ${Boolean(process.env.RESEND_API_KEY) ? "YES" : "NO"}`);
  console.log(`- Include PDF attachment: ${includePdf ? "YES" : "NO"}`);

  if (!toEmail) {
    const errorMsg = "Recipient email is missing.";
    console.error(`- Resend response status: FAILED (${errorMsg})`);
    return { success: false, error: errorMsg };
  }

  const resendApiKey = process.env.RESEND_API_KEY;
  if (!resendApiKey) {
    const errorMsg = "RESEND_API_KEY is not configured in server environment.";
    console.error(`- Resend response status: FAILED (${errorMsg})`);
    return { success: false, error: errorMsg };
  }

  let attachments: any[] = [];
  if (includePdf) {
    try {
      const pdfBuffer = generatePreBookingPdfBuffer({
        bookingId: "AGR-TEST-123",
        userName: "AgriNex Tester",
        userEmail: toEmail,
        mobileNumber: "+91 9999999999",
        cropName: "Organic Test Crop",
        quantity: "10",
        unit: "kg",
        referencePrice: "100",
        bookingDate: new Date().toISOString().split("T")[0],
        bookingTime: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        bookingStatus: "Test Verified",
      });
      console.log(`- PDF generated: YES (${pdfBuffer.length} bytes)`);
      attachments.push({
        filename: "AgriNex_PreBooking_Test.pdf",
        content: pdfBuffer.toString("base64"),
      });
    } catch (e: any) {
      console.error(`- PDF generated: NO (${e?.message || e})`);
      return { success: false, error: `PDF generation failed: ${e?.message || e}` };
    }
  }

  const resendFrom = process.env.RESEND_FROM || "AgriNex <onboarding@resend.dev>";
  const subject = includePdf ? "AgriNex Pre-Booking PDF Test" : "AgriNex Email Test";
  const textBody = includePdf 
    ? "This is a test email with PDF confirmation from AgriNex.\n\nSmart Farming • Better Tomorrow"
    : "This is a test email from AgriNex.\n\nSmart Farming • Better Tomorrow";

  try {
    const response = await axios.post(
      "https://api.resend.com/emails",
      {
        from: resendFrom,
        to: [toEmail],
        subject,
        text: textBody,
        html: `<div style="font-family: Arial, sans-serif; padding: 20px; color: #1B4332;"><h2>AgriNex Email Verification</h2><p>${textBody.replace(/\n/g, "<br>")}</p></div>`,
        ...(attachments.length > 0 ? { attachments } : {})
      },
      {
        headers: {
          Authorization: `Bearer ${resendApiKey.trim()}`,
          "Content-Type": "application/json",
        },
        timeout: 10000,
      }
    );

    console.log(`- Resend response status: SUCCESS (${response.status} OK - ID: ${response.data?.id || "sent"})`);
    console.log(`- Test email sent: YES`);
    console.log(`=============================================================\n`);
    return { success: true, messageId: response.data?.id, resendEmailId: response.data?.id, provider: "resend" };
  } catch (err: any) {
    const status = err.response?.status || 500;
    const errorMsg = err.response?.data?.message || err.message || String(err);
    console.error(`- Resend response status: FAILED (HTTP ${status})`);
    console.error(`- Exact error message if failed: ${errorMsg}`);
    console.log(`- Test email sent: NO`);
    console.log(`=============================================================\n`);
    return { success: false, error: `Resend error: ${errorMsg}`, provider: "resend", details: err.response?.data };
  }
}

/**
 * Sends pre-booking confirmation email with PDF attachment.
 * Measures and logs bottleneck performance across all 9 precise execution steps.
 */
export async function sendPreBookingReportEmail(params: SendPreBookingEmailParams): Promise<SendEmailResult> {
  const t_backend_received = Date.now();
  const { bookingId, userName, userEmail, cropName, t_booking_saved, t_email_job_started } = params;

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const validEmail = typeof userEmail === "string" && emailRegex.test(userEmail.trim());

  console.log(`\n================ [AGRINEX PRE-BOOKING EMAIL DISPATCH] ================`);
  console.log(`- Booking ID: ${bookingId}`);
  console.log(`- Logged-in user email detected: ${validEmail ? "YES" : "NO"}`);
  console.log(`- Recipient email source: Firebase authenticated user`);
  console.log(`1. Booking successfully saved: ${t_booking_saved ? t_booking_saved + "ms" : "N/A"}`);
  console.log(`2. Email job started: ${t_email_job_started ? t_email_job_started + "ms" : "N/A"}`);
  console.log(`3. Backend API request received: ${t_backend_received}ms`);

  if (!validEmail) {
    const errorMsg = "Recipient email is missing or has an invalid format.";
    console.error(`- PDF generation status: FAILED (${errorMsg})`);
    console.log(`Resend response received: FAILED (${errorMsg})`);
    console.log(`======================================================================\n`);
    return { success: false, error: errorMsg };
  }

  // 4. PDF Generation Start
  const t_pdf_gen_started = Date.now();
  console.log(`4. PDF generation started: ${t_pdf_gen_started}ms`);
  
  let pdfBuffer: Buffer;
  try {
    pdfBuffer = generatePreBookingPdfBuffer(params);
  } catch (pdfErr: any) {
    const pdfErrMsg = pdfErr?.message || String(pdfErr);
    console.error(`- PDF generation FAILED: ${pdfErrMsg}`);
    console.log(`==================================================================================\n`);
    return { success: false, error: `PDF generation failed: ${pdfErrMsg}` };
  }
  
  // 5. PDF Generation Completed
  const t_pdf_gen_completed = Date.now();
  const pdf_gen_time_ms = t_pdf_gen_completed - t_pdf_gen_started;
  console.log(`5. PDF generation completed: ${t_pdf_gen_completed}ms (Duration: ${pdf_gen_time_ms}ms, Size: ${pdfBuffer.length} bytes)`);

  // 6. PDF Converted to Attachment
  const t_attach_prep_start = Date.now();
  const base64Attachment = pdfBuffer.toString("base64");
  const t_pdf_attachment_ready = Date.now();
  const attachment_prep_time_ms = t_pdf_attachment_ready - t_attach_prep_start;
  console.log(`6. PDF converted to attachment: ${t_pdf_attachment_ready}ms (Duration: ${attachment_prep_time_ms}ms)`);

  const filename = `AgriNex_PreBooking_${bookingId}.pdf`;
  const subject = `AgriNex Pre-Booking Confirmation - ${bookingId}`;

  const textBody = `Hello ${userName || "Farmer"},

Your AgriNex Pre-Booking has been successfully submitted.

Booking ID: ${bookingId}
Crop: ${cropName}
Status: Pre-Booked

Your Pre-Booking confirmation report is attached as a PDF.

Thank you for using AgriNex.

Smart Farming • Better Tomorrow`;

  const htmlBody = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: Arial, sans-serif; color: #1B4332; line-height: 1.6; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #F8FCF9;">
  <div style="background-color: #1B4332; color: #ffffff; padding: 24px; border-radius: 16px; text-align: center;">
    <h1 style="margin: 0; font-size: 26px; font-weight: 800; letter-spacing: 0.5px;">AgriNex</h1>
    <p style="margin: 6px 0 0 0; font-size: 13px; color: #D8F3DC;">Smart Farming • Better Tomorrow</p>
  </div>
  <div style="background-color: #ffffff; padding: 28px; border: 1px solid #E2E8F0; border-radius: 16px; margin-top: 16px; box-shadow: 0 4px 12px rgba(0,0,0,0.03);">
    <p style="font-size: 16px; color: #2D3748;">Hello <strong>${userName || "Farmer"}</strong>,</p>
    <p style="color: #4A5568;">Your AgriNex Pre-Booking has been successfully submitted.</p>
    
    <div style="background-color: #F0F7F4; border-left: 4px solid #2D6A4F; padding: 16px; margin: 20px 0; border-radius: 8px;">
      <p style="margin: 4px 0; color: #1B4332;"><strong>Booking ID:</strong> ${bookingId}</p>
      <p style="margin: 4px 0; color: #1B4332;"><strong>Crop:</strong> ${cropName}</p>
      <p style="margin: 4px 0; color: #1B4332;"><strong>Quantity:</strong> ${params.quantity} ${params.unit}</p>
      <p style="margin: 4px 0; color: #1B4332;"><strong>Status:</strong> <span style="color: #2D6A4F; font-weight: bold; background: #D8F3DC; padding: 2px 8px; border-radius: 12px; font-size: 12px;">Pre-Booked</span></p>
    </div>

    <p style="color: #4A5568;">Your official Pre-Booking confirmation report is attached to this email as a PDF (<strong>${filename}</strong>).</p>
    
    <hr style="border: none; border-top: 1px solid #EDF2F7; margin: 24px 0;" />
    
    <p style="color: #718096; font-size: 13px; margin: 0;">Thank you for using AgriNex.<br><strong style="color: #2D6A4F;">Smart Farming • Better Tomorrow</strong></p>
  </div>
</body>
</html>`;

  // 7. Resend API Request Started
  const resendApiKey = process.env.RESEND_API_KEY;
  if (resendApiKey) {
    const t_resend_req_started = Date.now();
    console.log(`7. Resend API request started: ${t_resend_req_started}ms (URL: https://api.resend.com/emails)`);
    const resendFrom = process.env.RESEND_FROM || "AgriNex <onboarding@resend.dev>";

    try {
      const resendResponse = await axios.post(
        "https://api.resend.com/emails",
        {
          from: resendFrom,
          to: [userEmail],
          subject: subject,
          text: textBody,
          html: htmlBody,
          attachments: [
            {
              filename: filename,
              content: base64Attachment,
            },
          ],
        },
        {
          headers: {
            Authorization: `Bearer ${resendApiKey.trim()}`,
            "Content-Type": "application/json",
          },
          timeout: 10000,
        }
      );

      // 8 & 9. Resend Response & Email ID Received
      const t_resend_resp_received = Date.now();
      const t_resend_id_received = t_resend_resp_received;
      const resendData = resendResponse.data;
      const resendEmailId = resendData?.id || null;

      const backend_received_after_ms = t_booking_saved ? (t_backend_received - t_booking_saved) : 0;
      const resend_req_time_ms = t_resend_resp_received - t_resend_req_started;
      const total_email_proc_time_ms = t_resend_resp_received - (t_booking_saved || t_backend_received);

      console.log(`8. Resend API response received: ${t_resend_resp_received}ms (Duration: ${resend_req_time_ms}ms, HTTP ${resendResponse.status} OK)`);
      console.log(`9. Resend email ID received: ${t_resend_id_received}ms (Email ID: ${resendEmailId})`);
      console.log(`==================================================================================\n`);

      return {
        success: true,
        messageId: resendEmailId,
        resendEmailId,
        provider: "resend",
        timing: {
          t_booking_saved,
          t_email_job_started,
          t_backend_received,
          t_pdf_gen_started,
          t_pdf_gen_completed,
          t_pdf_attachment_ready,
          t_resend_req_started,
          t_resend_resp_received,
          t_resend_id_received,
          backend_received_after_ms,
          pdf_gen_time_ms,
          attachment_prep_time_ms,
          resend_req_time_ms,
          total_email_proc_time_ms,
        },
      };
    } catch (resendError: any) {
      const t_resend_resp_received = Date.now();
      const resend_req_time_ms = t_resend_resp_received - t_resend_req_started;
      const total_email_proc_time_ms = t_resend_resp_received - (t_booking_saved || t_backend_received);
      const status = resendError.response?.status || 500;
      const errorMsg = resendError.response?.data?.message || resendError.message || String(resendError);

      console.error(`8. Resend API response returned in ${resend_req_time_ms}ms: FAILED (HTTP ${status})`);
      console.error(`- Exact Error: ${errorMsg}`);
      console.log(`9. Resend email ID received: NONE (Failed)`);
      console.log(`==================================================================================\n`);

      return {
        success: false,
        error: `Resend error: ${errorMsg}`,
        provider: "resend",
        details: resendError.response?.data,
        timing: {
          t_booking_saved,
          t_email_job_started,
          t_backend_received,
          t_pdf_gen_started,
          t_pdf_gen_completed,
          t_pdf_attachment_ready,
          t_resend_req_started,
          t_resend_resp_received,
          backend_received_after_ms: t_booking_saved ? (t_backend_received - t_booking_saved) : 0,
          pdf_gen_time_ms,
          attachment_prep_time_ms,
          resend_req_time_ms,
          total_email_proc_time_ms,
        },
      };
    }
  }

  // 3. Fallback to SMTP if Resend is not configured
  const smtpHost = process.env.EMAIL_HOST || "smtp.gmail.com";
  const smtpPort = parseInt(process.env.EMAIL_PORT || "587", 10);
  const smtpUser = process.env.EMAIL_USER || "";
  const smtpPassword = process.env.EMAIL_PASSWORD || "";
  const smtpFrom = process.env.EMAIL_FROM || (smtpUser ? `AgriNex <${smtpUser}>` : "AgriNex <no-reply@agrinex.com>");

  if (smtpUser && smtpPassword) {
    try {
      console.log(`  - Dispatching via SMTP (${smtpHost}:${smtpPort}) to: ${userEmail}`);
      await sendSmtpMessage({
        host: smtpHost,
        port: smtpPort,
        user: smtpUser,
        password: smtpPassword,
        from: smtpFrom,
        to: userEmail,
        subject,
        textBody,
        htmlBody,
        attachment: {
          filename,
          content: pdfBuffer,
          contentType: "application/pdf",
        },
      });

      console.log(`[AgriNex Email Backend] SMTP delivery status: SUCCESS`);
      return { success: true, provider: "smtp" };
    } catch (smtpErr: any) {
      const errDetail = smtpErr?.message || String(smtpErr);
      console.error(`[AgriNex Email Backend] SMTP delivery status: FAILED - ${errDetail}`);
      return { success: false, error: `SMTP error: ${errDetail}`, provider: "smtp" };
    }
  }

  const noConfigMsg = "Neither RESEND_API_KEY nor SMTP credentials configured in environment.";
  console.warn(`[AgriNex Email Warning] ${noConfigMsg}`);
  return { success: false, error: noConfigMsg };
}

interface SmtpOptions {
  host: string;
  port: number;
  user: string;
  password: string;
  from: string;
  to: string;
  subject: string;
  textBody: string;
  htmlBody: string;
  attachment: {
    filename: string;
    content: Buffer;
    contentType: string;
  };
}

/**
 * Standard RFC 5321 SMTP Client over TCP/TLS with STARTTLS support.
 */
function sendSmtpMessage(opts: SmtpOptions): Promise<void> {
  return new Promise((resolve, reject) => {
    const isSecure = opts.port === 465;
    let socket: net.Socket | tls.TLSSocket;
    let buffer = "";

    const cleanUp = () => {
      if (socket && !socket.destroyed) {
        socket.destroy();
      }
    };

    const timeout = setTimeout(() => {
      cleanUp();
      reject(new Error(`SMTP Connection timeout (${opts.host}:${opts.port})`));
    }, 20000);

    const onConnect = () => {
      // Socket connected
    };

    if (isSecure) {
      socket = tls.connect(opts.port, opts.host, { rejectUnauthorized: false }, onConnect);
    } else {
      socket = net.createConnection(opts.port, opts.host, onConnect);
    }

    let step = "GREETING";

    const sendLine = (line: string) => {
      socket.write(line + "\r\n");
    };

    const extractEmail = (fromStr: string) => {
      const match = fromStr.match(/<([^>]+)>/);
      return match ? match[1] : fromStr.trim();
    };

    const senderEmail = extractEmail(opts.from);
    const recipientEmail = extractEmail(opts.to);

    const boundary = "==_AgrinexBoundary_" + Date.now().toString(16);
    const boundaryAlt = "==_AgrinexAltBoundary_" + Date.now().toString(16);

    const rawMime = [
      `From: ${opts.from}`,
      `To: ${opts.to}`,
      `Subject: ${opts.subject}`,
      `Date: ${new Date().toUTCString()}`,
      `MIME-Version: 1.0`,
      `Content-Type: multipart/mixed; boundary="${boundary}"`,
      ``,
      `--${boundary}`,
      `Content-Type: multipart/alternative; boundary="${boundaryAlt}"`,
      ``,
      `--${boundaryAlt}`,
      `Content-Type: text/plain; charset=utf-8`,
      `Content-Transfer-Encoding: 7bit`,
      ``,
      opts.textBody,
      ``,
      `--${boundaryAlt}`,
      `Content-Type: text/html; charset=utf-8`,
      `Content-Transfer-Encoding: 7bit`,
      ``,
      opts.htmlBody,
      ``,
      `--${boundaryAlt}--`,
      ``,
      `--${boundary}`,
      `Content-Type: ${opts.attachment.contentType}; name="${opts.attachment.filename}"`,
      `Content-Disposition: attachment; filename="${opts.attachment.filename}"`,
      `Content-Transfer-Encoding: base64`,
      ``,
      opts.attachment.content.toString("base64").match(/.{1,76}/g)?.join("\r\n") || opts.attachment.content.toString("base64"),
      ``,
      `--${boundary}--`,
      `.`
    ].join("\r\n");

    const handleResponses = (dataStr: string) => {
      buffer += dataStr;
      const lines = buffer.split("\r\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        if (!line.trim()) continue;
        const code = parseInt(line.substring(0, 3), 10);
        const isMulti = line.charAt(3) === "-";
        if (isMulti) continue;

        if (code >= 400) {
          cleanUp();
          clearTimeout(timeout);
          return reject(new Error(`SMTP Error [${step}]: ${line}`));
        }

        switch (step) {
          case "GREETING":
            step = "EHLO_1";
            sendLine(`EHLO localhost`);
            break;

          case "EHLO_1":
            if (!isSecure && opts.port !== 25 && line.includes("250")) {
              step = "STARTTLS";
              sendLine("STARTTLS");
            } else {
              step = "AUTH_LOGIN";
              sendLine("AUTH LOGIN");
            }
            break;

          case "STARTTLS":
            if (code === 220) {
              const tlsSocket = tls.connect({
                socket: socket,
                rejectUnauthorized: false
              }, () => {
                step = "EHLO_2";
                sendLine(`EHLO localhost`);
              });

              socket.removeAllListeners("data");
              socket = tlsSocket;
              socket.on("data", (d) => handleResponses(d.toString()));
              socket.on("error", (e) => {
                clearTimeout(timeout);
                reject(e);
              });
            } else {
              step = "AUTH_LOGIN";
              sendLine("AUTH LOGIN");
            }
            break;

          case "EHLO_2":
            step = "AUTH_LOGIN";
            sendLine("AUTH LOGIN");
            break;

          case "AUTH_LOGIN":
            if (code === 334) {
              step = "AUTH_USER";
              sendLine(Buffer.from(opts.user).toString("base64"));
            }
            break;

          case "AUTH_USER":
            if (code === 334) {
              step = "AUTH_PASS";
              sendLine(Buffer.from(opts.password).toString("base64"));
            }
            break;

          case "AUTH_PASS":
            if (code === 235 || code === 250) {
              step = "MAIL_FROM";
              sendLine(`MAIL FROM:<${senderEmail}>`);
            }
            break;

          case "MAIL_FROM":
            if (code === 250) {
              step = "RCPT_TO";
              sendLine(`RCPT TO:<${recipientEmail}>`);
            }
            break;

          case "RCPT_TO":
            if (code === 250) {
              step = "DATA";
              sendLine("DATA");
            }
            break;

          case "DATA":
            if (code === 354) {
              step = "SEND_CONTENT";
              socket.write(rawMime + "\r\n");
            }
            break;

          case "SEND_CONTENT":
            if (code === 250) {
              step = "QUIT";
              sendLine("QUIT");
              clearTimeout(timeout);
              cleanUp();
              return resolve();
            }
            break;

          case "QUIT":
            clearTimeout(timeout);
            cleanUp();
            return resolve();
        }
      }
    };

    socket.on("data", (data) => {
      handleResponses(data.toString());
    });

    socket.on("error", (err) => {
      clearTimeout(timeout);
      cleanUp();
      reject(err);
    });

    socket.on("close", () => {
      clearTimeout(timeout);
    });
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Generic Notification Email (Booking Confirmed / Status / Rain / Price / PDF)
// ─────────────────────────────────────────────────────────────────────────────

export type NotificationEmailType =
  | "booking_confirmed"
  | "booking_status"
  | "rain_alert"
  | "price_alert"
  | "pdf_report";

export interface NotificationEmailParams {
  type: NotificationEmailType;
  toEmail: string;
  userName: string;
  title: string;
  message: string;
  payload?: Record<string, any>;
}

function buildNotificationHtml(params: NotificationEmailParams): { subject: string; html: string; text: string } {
  const { type, userName, title, message, payload = {} } = params;

  const header = `
    <div style="background-color:#1B4332;color:#ffffff;padding:24px;border-radius:16px 16px 0 0;text-align:center;">
      <h1 style="margin:0;font-size:24px;font-weight:800;">🌱 AgriNex</h1>
      <p style="margin:6px 0 0;font-size:12px;color:#D8F3DC;">Smart Farming • Better Tomorrow</p>
    </div>`;

  const footer = `
    <hr style="border:none;border-top:1px solid #EDF2F7;margin:24px 0;" />
    <p style="color:#718096;font-size:12px;margin:0;">Thank you for using AgriNex.<br><strong style="color:#2D6A4F;">Smart Farming • Better Tomorrow</strong></p>`;

  const wrap = (inner: string) => `
    <!DOCTYPE html><html><head><meta charset="utf-8"></head>
    <body style="font-family:Arial,sans-serif;background:#F8FCF9;margin:0;padding:20px;">
      <div style="max-width:600px;margin:0 auto;">
        ${header}
        <div style="background:#fff;padding:28px;border:1px solid #E2E8F0;border-radius:0 0 16px 16px;box-shadow:0 4px 12px rgba(0,0,0,0.03);">
          <p style="font-size:15px;color:#2D3748;">Hello <strong>${userName || "Farmer"}</strong>,</p>
          ${inner}
          ${footer}
        </div>
      </div>
    </body></html>`;

  const infoBox = (rows: string[]) => `
    <div style="background:#F0F7F4;border-left:4px solid #2D6A4F;padding:16px;margin:20px 0;border-radius:8px;">
      ${rows.map(r => `<p style="margin:4px 0;color:#1B4332;">${r}</p>`).join("")}
    </div>`;

  const pill = (text: string, color = "#2D6A4F") =>
    `<span style="background:${color};color:#fff;padding:3px 10px;border-radius:12px;font-size:12px;font-weight:bold;">${text}</span>`;

  switch (type) {
    case "booking_confirmed": {
      const subject = "AgriNex - Your Booking Has Been Confirmed ✅";
      const inner = `
        <p style="color:#4A5568;">Your pre-booking has been <strong>confirmed</strong> on AgriNex.</p>
        ${infoBox([
          `<strong>Booking ID:</strong> ${payload.bookingId || "—"}`,
          `<strong>Crop Name:</strong> ${payload.cropName || "—"}`,
          `<strong>Quantity:</strong> ${payload.quantity || "—"} ${payload.unit || ""}`,
          `<strong>Status:</strong> ${pill("Confirmed")}`,
        ])}
        <p style="color:#4A5568;">You will receive further updates as your order progresses.</p>`;
      return {
        subject,
        html: wrap(inner),
        text: `Hello ${userName},\n\nYour booking ${payload.bookingId} for ${payload.cropName} has been confirmed.\nQuantity: ${payload.quantity} ${payload.unit}\n\nSmart Farming • Better Tomorrow`,
      };
    }

    case "booking_status": {
      const subject = "AgriNex - Booking Status Updated 🔄";
      const statusColors: Record<string, string> = {
        Confirmed: "#2563EB", Processing: "#7C3AED", Completed: "#059669", Cancelled: "#DC2626", Pending: "#D97706",
      };
      const newColor = statusColors[payload.status] || "#2D6A4F";
      const inner = `
        <p style="color:#4A5568;">Your booking status has been updated.</p>
        ${infoBox([
          `<strong>Booking ID:</strong> ${payload.bookingId || "—"}`,
          `<strong>Crop:</strong> ${payload.cropName || "—"}`,
          `<strong>Previous Status:</strong> ${payload.prevStatus || "—"}`,
          `<strong>New Status:</strong> ${pill(payload.status || "Updated", newColor)}`,
        ])}
        <p style="color:#4A5568;">Log in to AgriNex to view your updated booking details.</p>`;
      return {
        subject,
        html: wrap(inner),
        text: `Hello ${userName},\n\nYour booking ${payload.bookingId} status changed:\nPrevious: ${payload.prevStatus}\nNew: ${payload.status}\n\nSmart Farming • Better Tomorrow`,
      };
    }

    case "rain_alert": {
      const subject = "AgriNex Rain Alert ⛈️";
      const statusEmoji = payload.rainStatus === "heavy" ? "🌧️" : "🌦️";
      const statusLabel = payload.rainStatus === "heavy" ? "Heavy Rain Expected" : "Light Rain Possible";
      const inner = `
        <p style="color:#4A5568;">A rain alert has been detected for <strong>${payload.location || "your selected location"}</strong>.</p>
        <div style="background:#EFF6FF;border-left:4px solid #2563EB;padding:16px;margin:20px 0;border-radius:8px;">
          <h2 style="margin:0 0 12px;color:#1E40AF;font-size:18px;">${statusEmoji} ${statusLabel}</h2>
          <p style="margin:4px 0;color:#1E3A8A;"><strong>Rain Probability:</strong> ${payload.rainProb ?? 0}%</p>
          <p style="margin:4px 0;color:#1E3A8A;"><strong>Expected Rainfall:</strong> ${payload.expectedRain ?? 0} mm</p>
          ${payload.farmerAlert ? `<p style="margin:12px 0 0;color:#1E3A8A;font-style:italic;">${payload.farmerAlert}</p>` : ""}
        </div>
        <p style="color:#4A5568;font-size:13px;">This alert is based on real-time meteorological data. Plan your farming activities accordingly.</p>`;
      return {
        subject,
        html: wrap(inner),
        text: `Hello ${userName},\n\nRain Alert for ${payload.location}.\nRain Probability: ${payload.rainProb}%\nExpected Rainfall: ${payload.expectedRain} mm\n\n${payload.farmerAlert || ""}\n\nSmart Farming • Better Tomorrow`,
      };
    }

    case "price_alert": {
      const subject = "AgriNex Market Price Alert 📈";
      const increased = (payload.newPrice || 0) > (payload.prevPrice || 0);
      const arrow = increased ? "📈 Increased" : "📉 Decreased";
      const arrowColor = increased ? "#059669" : "#DC2626";
      const inner = `
        <p style="color:#4A5568;">There has been a market price update in AgriNex.</p>
        ${infoBox([
          `<strong>Commodity:</strong> ${payload.commodity || "—"}`,
          `<strong>Previous Price:</strong> ₹${payload.prevPrice || "—"} ${payload.priceUnit || ""}`,
          `<strong>Current Price:</strong> ₹${payload.newPrice || "—"} ${payload.priceUnit || ""}`,
          `<strong>Change:</strong> <span style="color:${arrowColor};font-weight:bold;">${arrow}</span>`,
        ])}
        <p style="color:#4A5568;">Visit AgriNex Marketplace for the latest crop prices.</p>`;
      return {
        subject,
        html: wrap(inner),
        text: `Hello ${userName},\n\n${payload.commodity} price changed.\nPrevious: ₹${payload.prevPrice}\nCurrent: ₹${payload.newPrice}\n\nSmart Farming • Better Tomorrow`,
      };
    }

    case "pdf_report": {
      const subject = "AgriNex - Your Pre-Booking Report 📄";
      const inner = `
        <p style="color:#4A5568;">Your AgriNex pre-booking report is ready.</p>
        ${infoBox([
          `<strong>Booking ID:</strong> ${payload.bookingId || "—"}`,
          `<strong>Crop:</strong> ${payload.cropName || "—"}`,
          `<strong>Status:</strong> ${pill(payload.status || "Pre-Booked")}`,
        ])}
        <p style="color:#4A5568;">Your detailed PDF confirmation has been sent as a separate attachment email.</p>`;
      return {
        subject,
        html: wrap(inner),
        text: `Hello ${userName},\n\nYour pre-booking report for ${payload.cropName} (${payload.bookingId}) is ready. The PDF report is attached to your email.\n\nSmart Farming • Better Tomorrow`,
      };
    }

    default: {
      const subject = `AgriNex Notification: ${title}`;
      const inner = `<p style="color:#4A5568;">${message}</p>`;
      return {
        subject,
        html: wrap(inner),
        text: `Hello ${userName},\n\n${message}\n\nSmart Farming • Better Tomorrow`,
      };
    }
  }
}

/**
 * Sends a notification email for any of the 5 event types via Resend.
 * Used by /api/send-notification-email backend route.
 */
export async function sendNotificationEmail(params: NotificationEmailParams): Promise<SendEmailResult> {
  const { toEmail, type } = params;
  console.log(`\n[AgriNex Notification Email] type=${type} to=${toEmail}`);

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!toEmail || !emailRegex.test(toEmail)) {
    return { success: false, error: "Invalid or missing recipient email." };
  }

  const resendApiKey = process.env.RESEND_API_KEY;
  if (!resendApiKey) {
    return { success: false, error: "RESEND_API_KEY not configured." };
  }

  const { subject, html, text } = buildNotificationHtml(params);
  const resendFrom = process.env.RESEND_FROM || "AgriNex <onboarding@resend.dev>";

  try {
    const response = await axios.post(
      "https://api.resend.com/emails",
      { from: resendFrom, to: [toEmail], subject, text, html },
      {
        headers: { Authorization: `Bearer ${resendApiKey.trim()}`, "Content-Type": "application/json" },
        timeout: 10000,
      }
    );
    const emailId = response.data?.id || null;
    console.log(`[AgriNex Notification Email] SUCCESS — ID: ${emailId}`);
    return { success: true, resendEmailId: emailId, messageId: emailId, provider: "resend" };
  } catch (err: any) {
    const errorMsg = err.response?.data?.message || err.message || String(err);
    console.error(`[AgriNex Notification Email] FAILED — ${errorMsg}`);
    return { success: false, error: errorMsg, provider: "resend", details: err.response?.data };
  }
}
