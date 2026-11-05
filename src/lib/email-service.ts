import nodemailer, { type Transporter } from "nodemailer";
import { Resend } from "resend";
import { formatDate, toBengaliDigits } from "./date-utils";

export interface EmailTaskData {
  id: string;
  taskCode?: string | null;
  title: string;
  description?: string | null;
  taskType?: string;
  priority?: number | null;
  priorityNote?: string | null;
  dueDate?: Date | string | null;
  department?: string;
  territory?: string | null;
  remarks?: string | null;
  assignedByName?: string | null;
}

export interface SendEmailOptions {
  to: string;
  toName: string;
  subject: string;
  html: string;
}

export interface SendEmailResult {
  success: boolean;
  messageId?: string;
  provider?: "resend" | "smtp" | "ethereal" | "mock";
  previewUrl?: string;
  error?: string;
}

// Cached Ethereal test transporter for development session
let cachedEtherealTransporter: Transporter | null = null;
let cachedEtherealUser: string | null = null;

/**
 * Universal email dispatcher:
 * 1. Prioritizes Resend if RESEND_API_KEY is configured in .env.
 * 2. Falls back to Nodemailer SMTP if SMTP_HOST, SMTP_USER, and SMTP_PASS are set in .env.
 * 3. In development / testing (when neither is configured), dispatches via an Ethereal SMTP test account
 *    with a real clickable web preview link, or falls back to console mock.
 */
export async function sendEmail({
  to,
  toName,
  subject,
  html,
}: SendEmailOptions): Promise<SendEmailResult> {
  // Read environment variables dynamically so any runtime changes to .env are instantly applied
  const resendApiKey = process.env.RESEND_API_KEY?.trim();
  const smtpHost = process.env.SMTP_HOST?.trim();
  const smtpPort = Number(process.env.SMTP_PORT || 587);
  const smtpUser = process.env.SMTP_USER?.trim();
  const smtpPass = process.env.SMTP_PASS?.trim();
  const fromEmail =
    process.env.SMTP_FROM?.trim() ||
    process.env.RESEND_FROM?.trim() ||
    "Sales Tracker <no-reply@salestracker.com>";

  try {
    // 1. Send with Resend if API key is configured
    if (resendApiKey) {
      const resendClient = new Resend(resendApiKey);
      const resendFrom = process.env.RESEND_FROM?.trim() || "onboarding@resend.dev";
      const response = await resendClient.emails.send({
        from: resendFrom,
        to: `${toName} <${to}>`,
        subject,
        html,
      });

      if (response.error) {
        console.error(`❌ [Resend Error] Failed sending to ${to}:`, response.error);
        return {
          success: false,
          provider: "resend",
          error: response.error.message,
        };
      }

      console.log(`✓ [Resend] Live email sent to ${to} (Subject: "${subject}", ID: ${response.data?.id})`);
      return {
        success: true,
        messageId: response.data?.id,
        provider: "resend",
      };
    }

    // 2. Send with Nodemailer SMTP if SMTP credentials are configured
    if (smtpHost && smtpUser && smtpPass) {
      const smtpTransporter = nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: smtpPort === 465,
        auth: {
          user: smtpUser,
          pass: smtpPass,
        },
      });

      const info = await smtpTransporter.sendMail({
        from: fromEmail,
        to: `"${toName}" <${to}>`,
        subject,
        html,
      });

      console.log(`✓ [SMTP] Live email sent to ${to} (Subject: "${subject}", MessageID: ${info.messageId})`);
      return {
        success: true,
        messageId: info.messageId,
        provider: "smtp",
      };
    }

    // 3. Ethereal Test Account Mode (when live credentials are not yet entered in .env)
    // Allows full end-to-end verification with a clickable web preview of the real rendered email.
    try {
      if (!cachedEtherealTransporter) {
        const testAccount = await nodemailer.createTestAccount();
        cachedEtherealUser = testAccount.user;
        cachedEtherealTransporter = nodemailer.createTransport({
          host: testAccount.smtp.host,
          port: testAccount.smtp.port,
          secure: testAccount.smtp.secure,
          auth: {
            user: testAccount.user,
            pass: testAccount.pass,
          },
        });
      }

      const info = await cachedEtherealTransporter.sendMail({
        from: `"Daily Sells & Activities Tracker" <${cachedEtherealUser}>`,
        to: `"${toName}" <${to}>`,
        subject,
        html,
      });

      const previewUrl = nodemailer.getTestMessageUrl(info) || undefined;
      console.log(
        `\n============================================================\n` +
        `📬 [TEST EMAIL DISPATCHED VIA ETHEREAL SMTP]\n` +
        `To: ${toName} <${to}>\n` +
        `Subject: ${subject}\n` +
        `Message ID: ${info.messageId}\n` +
        (previewUrl
          ? `🔗 CLICK HERE TO VIEW RENDERED EMAIL IN BROWSER:\n👉 ${previewUrl}\n`
          : "") +
        `------------------------------------------------------------\n` +
        `ℹ️ Notice: To deliver live emails directly into your real Gmail or Outlook inbox,\n` +
        `   add RESEND_API_KEY or SMTP_USER & SMTP_PASS in your .env file.\n` +
        `============================================================\n`
      );

      return {
        success: true,
        messageId: info.messageId,
        previewUrl,
        provider: "ethereal",
      };
    } catch (etherealErr: any) {
      // Fallback to safe console mock if Ethereal network unreachable
      console.log(
        `\n------------------------------------------------------------\n` +
        `📨 [EMAIL SIMULATED / MOCK DELIVERY]\n` +
        `To: ${toName} <${to}>\n` +
        `From: ${fromEmail}\n` +
        `Subject: ${subject}\n` +
        `Notice: Add RESEND_API_KEY or SMTP_USER/PASS in .env to deliver live emails.\n` +
        `------------------------------------------------------------\n`
      );
      return {
        success: true,
        messageId: `mock-${Date.now()}`,
        provider: "mock",
      };
    }
  } catch (error: any) {
    console.error(`❌ Failed to send email to ${to}:`, error.message || error);
    return {
      success: false,
      error: error.message || String(error),
    };
  }
}

/**
 * Base styling wrapper for responsive HTML emails
 */
function renderEmailShell(contentHtml: string, title: string): string {
  return `
<!DOCTYPE html>
<html lang="bn">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f1f5f9; margin: 0; padding: 0; }
    .wrapper { max-width: 600px; margin: 20px auto; background: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e2e8f0; }
    .header { background-color: #0f172a; padding: 24px 28px; text-align: left; border-bottom: 3px solid #059669; }
    .header h1 { margin: 0; font-size: 20px; font-weight: 700; color: #ffffff; }
    .header p { margin: 4px 0 0; font-size: 13px; color: #94a3b8; }
    .body { padding: 28px; color: #1e293b; line-height: 1.6; }
    .card { background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 20px; margin: 18px 0; }
    .badge { display: inline-block; padding: 4px 10px; border-radius: 9999px; font-size: 12px; font-weight: 600; }
    .badge-ongoing { background-color: #dcfce7; color: #166534; }
    .badge-urgent { background-color: #fee2e2; color: #991b1b; }
    .badge-priority { background-color: #fef3c7; color: #92400e; }
    .table-info { width: 100%; border-collapse: collapse; margin-top: 10px; }
    .table-info td { padding: 6px 0; font-size: 13px; }
    .table-info td.label { width: 130px; font-weight: 600; color: #64748b; }
    .table-info td.val { color: #0f172a; font-weight: 500; }
    .button-wrap { text-align: center; margin: 26px 0 14px; }
    .btn { display: inline-block; background-color: #059669; color: #ffffff !important; text-decoration: none; font-weight: 700; font-size: 14px; padding: 12px 28px; border-radius: 8px; }
    .footer { background-color: #f8fafc; padding: 18px 28px; text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px solid #e2e8f0; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="header">
      <h1>দৈনিক কার্যক্রম ও টাস্ক ট্র্যাকার</h1>
      <p>Daily Sells & Activities Task Tracker</p>
    </div>
    <div class="body">
      ${contentHtml}
    </div>
    <div class="footer">
      <p>এটি একটি স্বয়ংক্রিয় নোটিফিকেশন ইমেইল। এই ঠিকানায় কোনো ফিরতি ইমেইল পাঠাবেন না।</p>
      <p>© ${new Date().getFullYear()} Office Task Management System. All rights reserved.</p>
    </div>
  </div>
</body>
</html>`;
}

/**
 * 1. Template: New Task Assignment Email
 */
export async function sendTaskAssignedEmail(
  recipient: { email: string; name: string },
  task: EmailTaskData
) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const taskLink = `${appUrl}/?taskId=${task.id}`;

  let dueDateDisplay = "চলমান (Ongoing / নো ডেডলাইন)";
  if (task.taskType !== "ONGOING" && task.dueDate) {
    dueDateDisplay = formatDate(task.dueDate, "bn");
  }

  const priorityDisplay = task.priority
    ? `⭐ ${toBengaliDigits(task.priority)} / ১০`
    : task.priorityNote || "সাধারণ (Regular)";

  const content = `
    <h2 style="margin-top: 0; color: #0f172a; font-size: 18px;">
      প্রিয় ${recipient.name},
    </h2>
    <p style="font-size: 14px; color: #334155;">
      আপনাকে একটি নতুন কাজের দায়িত্ব অর্পণ করা হয়েছে${
        task.assignedByName ? ` (${task.assignedByName} কর্তৃক)` : ""
      }। বিস্তারিত নিচে দেখুন:
    </p>

    <div class="card">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
        <span style="font-family: monospace; font-size: 11px; background: #e2e8f0; padding: 2px 6px; border-radius: 4px; font-weight: 600;">
          ${task.taskCode || "TASK"}
        </span>
        ${
          task.taskType === "ONGOING"
            ? `<span class="badge badge-ongoing">চলমান কাজ</span>`
            : ""
        }
      </div>

      <h3 style="margin: 6px 0 12px; color: #1e293b; font-size: 16px; font-weight: 700;">
        ${task.title}
      </h3>

      ${
        task.description
          ? `<p style="font-size: 13px; color: #475569; margin: 0 0 14px; background: #ffffff; padding: 10px; border-radius: 6px; border: 1px solid #e2e8f0;">${task.description}</p>`
          : ""
      }

      <table class="table-info">
        <tr>
          <td class="label">বিভাগ (Department):</td>
          <td class="val">${task.department || "Business Operations"}</td>
        </tr>
        <tr>
          <td class="label">অগ্রাধিকার (Priority):</td>
          <td class="val"><span class="badge badge-priority">${priorityDisplay}</span></td>
        </tr>
        <tr>
          <td class="label">শেষ তারিখ (Due Date):</td>
          <td class="val" style="color: #1e293b; font-weight: 600;">${dueDateDisplay}</td>
        </tr>
        ${
          task.territory
            ? `<tr><td class="label">এলাকা/টেরিটরি:</td><td class="val">${task.territory}</td></tr>`
            : ""
        }
        ${
          task.remarks
            ? `<tr><td class="label">নোট/মন্তব্য:</td><td class="val" style="color: #64748b; font-style: italic;">${task.remarks}</td></tr>`
            : ""
        }
      </table>
    </div>

    <div class="button-wrap">
      <a href="${taskLink}" class="btn" target="_blank">
        টাস্কটি অ্যাপে খুলুন (View Task) →
      </a>
    </div>

    <p style="font-size: 12px; color: #64748b; text-align: center; margin-top: 16px;">
      সরাসরি লিঙ্ক: <a href="${taskLink}" style="color: #059669; font-weight: 600;">${taskLink}</a>
    </p>
  `;

  const html = renderEmailShell(content, `নতুন কাজের দায়িত্ব: ${task.title}`);

  return sendEmail({
    to: recipient.email,
    toName: recipient.name,
    subject: `[টাস্ক অ্যাসাইনমেন্ট] ${task.title} (${task.taskCode || "TSK"})`,
    html,
  });
}

/**
 * 2. Template: Approaching Due Date Reminder Email (Sent within 24h of deadline)
 */
export async function sendTaskDueReminderEmail(
  recipient: { email: string; name: string },
  task: EmailTaskData
) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const taskLink = `${appUrl}/?taskId=${task.id}`;

  const dueDateFormatted = task.dueDate ? formatDate(task.dueDate, "bn") : "শীঘ্রই";
  const priorityDisplay = task.priority
    ? `⭐ ${toBengaliDigits(task.priority)} / ১০`
    : "সাধারণ";

  const content = `
    <div style="background-color: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 12px 16px; margin-bottom: 20px;">
      <p style="margin: 0; color: #991b1b; font-weight: 700; font-size: 14px;">
        ⏰ কাজের সময়সীমা আসন্ন (Due Date Approaching in 24 Hours)
      </p>
    </div>

    <h2 style="margin-top: 0; color: #0f172a; font-size: 18px;">
      প্রিয় ${recipient.name},
    </h2>
    <p style="font-size: 14px; color: #334155;">
      আপনার দায়িত্বপ্রাপ্ত নিম্নোক্ত কাজের শেষ সময়সীমা আগামী <strong>২৪ ঘণ্টার মধ্যে</strong> শেষ হতে যাচ্ছে। অনুগ্রহ করে সময়মতো কাজটি সম্পন্ন করুন।
    </p>

    <div class="card" style="border-left: 4px solid #ef4444;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
        <span style="font-family: monospace; font-size: 11px; background: #fee2e2; color: #991b1b; padding: 2px 6px; border-radius: 4px; font-weight: 700;">
          ${task.taskCode || "TASK"}
        </span>
        <span class="badge badge-urgent">মেয়াদ শেষ: ২৪ ঘণ্টার মধ্যে</span>
      </div>

      <h3 style="margin: 8px 0 12px; color: #1e293b; font-size: 16px; font-weight: 700;">
        ${task.title}
      </h3>

      <table class="table-info">
        <tr>
          <td class="label">শেষ তারিখ (Deadline):</td>
          <td class="val" style="color: #dc2626; font-weight: 700; font-size: 14px;">
            ${dueDateFormatted}
          </td>
        </tr>
        <tr>
          <td class="label">বিভাগ (Department):</td>
          <td class="val">${task.department || "Business Operations"}</td>
        </tr>
        <tr>
          <td class="label">অগ্রাধিকার (Priority):</td>
          <td class="val">${priorityDisplay}</td>
        </tr>
        ${
          task.remarks
            ? `<tr><td class="label">মন্তব্য/অগ্রগতি:</td><td class="val">${task.remarks}</td></tr>`
            : ""
        }
      </table>
    </div>

    <div class="button-wrap">
      <a href="${taskLink}" class="btn" style="background-color: #dc2626;" target="_blank">
        কাজটি চেক করুন ও সম্পন্ন করুন (View & Complete) →
      </a>
    </div>

    <p style="font-size: 12px; color: #64748b; text-align: center; margin-top: 16px;">
      টাস্ক লিঙ্ক: <a href="${taskLink}" style="color: #dc2626;">${taskLink}</a>
    </p>
  `;

  const html = renderEmailShell(content, `জরুরি রিমাইন্ডার: ${task.title}`);

  return sendEmail({
    to: recipient.email,
    toName: recipient.name,
    subject: `[রিমাইন্ডার] আগামী ২৪ ঘণ্টার মধ্যে কাজ সম্পন্ন করুন: ${task.title}`,
    html,
  });
}

export interface PasswordResetEmailOptions {
  recipient: {
    name: string;
    email: string;
  };
  resetUrl: string;
  locale?: "bn" | "en";
}

export async function sendPasswordResetEmail({
  recipient,
  resetUrl,
  locale = "bn",
}: PasswordResetEmailOptions): Promise<SendEmailResult> {
  const isBn = locale === "bn";
  const subject = isBn
    ? `[পাসওয়ার্ড রিসেট] আপনার অ্যাকাউন্ট পাসওয়ার্ড রিসেট করুন (Reset Password)`
    : `[Password Reset] Reset your account password`;

  const content = `
    <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 12px 16px; margin-bottom: 20px;">
      <p style="margin: 0; color: #166534; font-weight: 700; font-size: 14px;">
        🔐 ${isBn ? "পাসওয়ার্ড রিসেটের অনুরোধ (Password Reset Request)" : "Password Reset Request"}
      </p>
    </div>

    <h2 style="margin-top: 0; color: #0f172a; font-size: 18px;">
      ${isBn ? `প্রিয় ${recipient.name},` : `Hello ${recipient.name},`}
    </h2>
    <p style="font-size: 14px; color: #334155; line-height: 1.6;">
      ${
        isBn
          ? "আপনার সেলস ট্র্যাকার অ্যাকাউন্টের পাসওয়ার্ড রিসেট করার জন্য একটি অনুরোধ পাওয়া গেছে। নিচের বাটনে ক্লিক করে নতুন পাসওয়ার্ড নির্ধারণ করুন:"
          : "We received a request to reset the password for your Sales Tracker account. Click the button below to choose a new password:"
      }
    </p>

    <div class="button-wrap" style="text-align: center; margin: 28px 0;">
      <a href="${resetUrl}" class="btn" style="background-color: #059669; color: #ffffff; padding: 12px 28px; font-weight: 700; border-radius: 8px; text-decoration: none; display: inline-block;" target="_blank">
        ${isBn ? "পাসওয়ার্ড পরিবর্তন করুন (Reset Password) →" : "Reset Password →"}
      </a>
    </div>

    <div style="background: #f8fafc; border-radius: 8px; padding: 14px; margin-top: 20px; border: 1px solid #e2e8f0;">
      <p style="margin: 0 0 8px; font-size: 12px; color: #475569; font-weight: 600;">
        ${isBn ? "বাটনটি কাজ না করলে নিচের লিঙ্কটি ব্রাউজারে পেস্ট করুন:" : "If the button above does not work, copy and paste this link into your browser:"}
      </p>
      <p style="margin: 0; font-size: 12px; word-break: break-all;">
        <a href="${resetUrl}" style="color: #059669; text-decoration: underline;">${resetUrl}</a>
      </p>
    </div>

    <div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid #e2e8f0; font-size: 12px; color: #64748b; line-height: 1.5;">
      <p style="margin: 0 0 6px;">
        ⏳ <strong>${isBn ? "মেয়াদ:" : "Expires in:"}</strong> ${isBn ? "এই লিঙ্কটি আগামী ৩০ মিনিটের জন্য কার্যকর থাকবে।" : "This link will expire in 30 minutes."}
      </p>
      <p style="margin: 0;">
        🛡️ <strong>${isBn ? "নিরাপত্তা তথ্য:" : "Security notice:"}</strong> ${
          isBn
            ? "যদি আপনি এই পাসওয়ার্ড রিসেটের অনুরোধ না করে থাকেন, তবে এই ইমেইলটি উপেক্ষা করুন। আপনার পাসওয়ার্ড অপরিবর্তিত থাকবে।"
            : "If you did not request a password reset, please ignore this email. Your password will remain unchanged."
        }
      </p>
    </div>
  `;

  const html = renderEmailShell(content, isBn ? "পাসওয়ার্ড রিসেট" : "Password Reset");

  return sendEmail({
    to: recipient.email,
    toName: recipient.name,
    subject,
    html,
  });
}
