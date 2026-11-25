import nodemailer from "nodemailer";
import pool from "@/lib/db";

const getTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === "true",
    auth: {
      user: process.env.SMTP_USER || "manager@voicepune.com",
      pass: process.env.SMTP_PASS || "",
    },
  });
};

const FROM_EMAIL =
  process.env.SMTP_FROM_EMAIL ||
  '"Radheshyam Das Media" <manager@voicepune.com>';

const SITE_URL =
  process.env.NEXT_PUBLIC_APP_URL ||
  process.env.NEXT_PUBLIC_SITE_URL ||
  "https://radheshyamdas.com";

const escapeHtml = (str: string | null | undefined): string => {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
};

/**
 * 1. Notify Admins when a user submits a Role Upgrade Request
 */
export async function sendNewRoleRequestEmailToAdmins(details: {
  userName: string;
  userEmail: string;
  phone?: string | null;
  temple?: string | null;
  ashram?: string | null;
  requestedRoleName?: string | null;
  purpose?: string | null;
  authorityName?: string | null;
  authorityEmail?: string | null;
  authorityRelationship?: string | null;
}) {
  try {
    // 1. Fetch all admin emails from rsp.users where role IN (1, 8)
    const adminRes = await pool.query(
      `SELECT email, name FROM rsp.users WHERE role IN (1, 8) AND email IS NOT NULL;`
    );

    const adminEmails = adminRes.rows
      .map((r: { email: string }) => r.email?.trim())
      .filter((e: string) => Boolean(e) && e.includes("@"));

    // Add manager email fallback if not in list
    if (
      process.env.SMTP_USER &&
      !adminEmails.includes(process.env.SMTP_USER)
    ) {
      adminEmails.push(process.env.SMTP_USER);
    }

    if (adminEmails.length === 0) {
      console.warn("[EmailService] No admin emails found to send notification.");
      return;
    }

    const transporter = getTransporter();
    const adminUrl = `${SITE_URL}/admin/users`;

    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>New Role Upgrade Request</title>
</head>
<body style="margin: 0; padding: 0; background-color: #fdfaf6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #2d1810;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #fdfaf6; padding: 24px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width: 600px; background-color: #ffffff; border-radius: 16px; border: 1.5px solid rgba(139, 90, 43, 0.25); overflow: hidden; box-shadow: 0 4px 20px -2px rgba(139, 90, 43, 0.08);">
          
          <!-- Top Accent Bar -->
          <tr>
            <td style="height: 6px; background: linear-gradient(90deg, #c2410c 0%, #ea580c 50%, #d97706 100%);"></td>
          </tr>

          <!-- Header -->
          <tr>
            <td style="padding: 28px 28px 20px; background: linear-gradient(180deg, #fff9f2 0%, #ffffff 100%); border-bottom: 1px solid #f3e8dc; text-align: center;">
              <h1 style="margin: 0 0 6px 0; font-size: 22px; font-weight: 800; color: #9a3412; letter-spacing: -0.5px;">
                New Role Upgrade Request
              </h1>
              <p style="margin: 0; font-size: 13px; color: #78350f; font-weight: 500;">
                HG Radheshyam Das Spiritual Discourses • Admin Portal
              </p>
            </td>
          </tr>

          <!-- Body Content -->
          <tr>
            <td style="padding: 24px 28px;">
              <p style="margin: 0 0 16px 0; font-size: 15px; line-height: 1.6; color: #3c1e11;">
                Hare Krishna Admins,
              </p>
              <p style="margin: 0 0 20px 0; font-size: 14px; line-height: 1.6; color: #5c321e;">
                A devotee has submitted a request for role or ashram upgrade on the portal. Please review the details below:
              </p>

              <!-- Devotee Details Card -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #fdf8f3; border-radius: 12px; border: 1px solid #fed7aa; margin-bottom: 24px;">
                <tr>
                  <td style="padding: 16px;">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="6" border="0">
                      <tr>
                        <td width="38%" style="font-size: 12px; font-weight: bold; color: #9a3412; text-transform: uppercase;">Devotee Name</td>
                        <td style="font-size: 14px; font-weight: 700; color: #1c1917;">${escapeHtml(details.userName)}</td>
                      </tr>
                      <tr>
                        <td style="font-size: 12px; font-weight: bold; color: #9a3412; text-transform: uppercase;">Email Address</td>
                        <td style="font-size: 13px; color: #1c1917;">${escapeHtml(details.userEmail)}</td>
                      </tr>
                      ${details.phone ? `
                      <tr>
                        <td style="font-size: 12px; font-weight: bold; color: #9a3412; text-transform: uppercase;">Phone Number</td>
                        <td style="font-size: 13px; color: #1c1917;">${escapeHtml(details.phone)}</td>
                      </tr>` : ""}
                      ${details.temple ? `
                      <tr>
                        <td style="font-size: 12px; font-weight: bold; color: #9a3412; text-transform: uppercase;">Temple / Center</td>
                        <td style="font-size: 13px; color: #1c1917;">${escapeHtml(details.temple)}</td>
                      </tr>` : ""}
                      <tr>
                        <td style="font-size: 12px; font-weight: bold; color: #9a3412; text-transform: uppercase;">Requested Role</td>
                        <td style="font-size: 14px; font-weight: 700; color: #c2410c;">
                          <span style="background-color: #ffedd5; padding: 3px 8px; border-radius: 6px; border: 1px solid #fdba74;">
                            ${escapeHtml(details.requestedRoleName || details.ashram || "Elevated Access")}
                          </span>
                        </td>
                      </tr>
                      ${details.ashram ? `
                      <tr>
                        <td style="font-size: 12px; font-weight: bold; color: #9a3412; text-transform: uppercase;">Ashram Status</td>
                        <td style="font-size: 13px; color: #1c1917;">${escapeHtml(details.ashram)}</td>
                      </tr>` : ""}
                      ${details.authorityName ? `
                      <tr>
                        <td style="font-size: 12px; font-weight: bold; color: #9a3412; text-transform: uppercase;">Spiritual Mentor</td>
                        <td style="font-size: 13px; color: #1c1917;">
                          ${escapeHtml(details.authorityName)} ${details.authorityRelationship ? `(${escapeHtml(details.authorityRelationship)})` : ""}
                          ${details.authorityEmail ? `<br><span style="font-size: 11px; color: #78350f;">${escapeHtml(details.authorityEmail)}</span>` : ""}
                        </td>
                      </tr>` : ""}
                      ${details.purpose ? `
                      <tr>
                        <td style="font-size: 12px; font-weight: bold; color: #9a3412; text-transform: uppercase;">Reason / Purpose</td>
                        <td style="font-size: 13px; color: #44403c; line-height: 1.5;">${escapeHtml(details.purpose)}</td>
                      </tr>` : ""}
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Call to Action Button -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin: 28px 0 16px;">
                <tr>
                  <td align="center">
                    <a href="${adminUrl}" target="_blank" style="display: inline-block; background: linear-gradient(135deg, #ea580c 0%, #c2410c 100%); color: #ffffff; text-decoration: none; font-size: 14px; font-weight: 700; padding: 13px 32px; border-radius: 9999px; box-shadow: 0 4px 14px -1px rgba(194, 65, 12, 0.4); text-align: center;">
                      Review &amp; Approve in Admin Portal &rarr;
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 20px 28px; background-color: #faf5ee; border-top: 1px solid #f3e8dc; text-align: center; font-size: 11px; color: #854d0e; line-height: 1.5;">
              This notification was generated automatically by the Radheshyam Das Media Access Control System.<br>
              &copy; ${new Date().getFullYear()} Radheshyam Das Spiritual Discourses. All rights reserved.
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `;

    await transporter.sendMail({
      from: FROM_EMAIL,
      to: adminEmails,
      subject: `New Role Upgrade Request: ${details.userName} (${details.requestedRoleName || details.ashram || "Access Request"})`,
      html,
    });

    console.log(
      `[EmailService] Sent new role request alert to ${adminEmails.length} admin(s).`
    );
  } catch (err: unknown) {
    console.error("[EmailService] Failed to send admin role request email:", err);
  }
}

/**
 * 2. Notify User when Admin Approves their Role Access Request
 */
export async function sendRoleApprovedEmailToUser(details: {
  recipientEmail: string;
  recipientName: string;
  approvedRoleName: string;
  ashram?: string | null;
  reviewComment?: string | null;
}) {
  try {
    if (!details.recipientEmail || !details.recipientEmail.includes("@")) {
      console.warn("[EmailService] Invalid recipient email for approval notice.");
      return;
    }

    const transporter = getTransporter();
    const portalUrl = `${SITE_URL}/profile`;

    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Role Access Approved</title>
</head>
<body style="margin: 0; padding: 0; background-color: #fdfaf6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #2d1810;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #fdfaf6; padding: 24px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width: 600px; background-color: #ffffff; border-radius: 16px; border: 1.5px solid rgba(139, 90, 43, 0.25); overflow: hidden; box-shadow: 0 4px 20px -2px rgba(139, 90, 43, 0.08);">
          
          <!-- Top Accent Bar -->
          <tr>
            <td style="height: 6px; background: linear-gradient(90deg, #16a34a 0%, #22c55e 50%, #15803d 100%);"></td>
          </tr>

          <!-- Header -->
          <tr>
            <td style="padding: 32px 28px 24px; background: linear-gradient(180deg, #f0fdf4 0%, #ffffff 100%); border-bottom: 1px solid #dcfce7; text-align: center;">
              <div style="display: inline-block; width: 56px; height: 56px; line-height: 56px; border-radius: 50%; background-color: #dcfce7; border: 2px solid #86efac; color: #16a34a; font-size: 28px; margin-bottom: 12px;">
                &#10003;
              </div>
              <h1 style="margin: 0 0 6px 0; font-size: 23px; font-weight: 800; color: #166534; letter-spacing: -0.5px;">
                Access Request Approved!
              </h1>
              <p style="margin: 0; font-size: 13px; color: #15803d; font-weight: 500;">
                HG Radheshyam Das Spiritual Discourses
              </p>
            </td>
          </tr>

          <!-- Body Content -->
          <tr>
            <td style="padding: 28px;">
              <p style="margin: 0 0 16px 0; font-size: 16px; line-height: 1.6; color: #1c1917;">
                Hare Krishna <strong>${escapeHtml(details.recipientName || "Devotee")}</strong>,
              </p>
              <p style="margin: 0 0 20px 0; font-size: 14px; line-height: 1.6; color: #44403c;">
                Please accept our humble obeisances. All glories to Srila Prabhupada.
              </p>
              <p style="margin: 0 0 20px 0; font-size: 14px; line-height: 1.6; color: #44403c;">
                We are pleased to inform you that your role upgrade request has been <strong>reviewed and approved</strong> by the administrative committee.
              </p>

              <!-- Approval Summary Box -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #f0fdf4; border-radius: 12px; border: 1.5px solid #bbf7d0; margin-bottom: 24px;">
                <tr>
                  <td style="padding: 18px;">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="6" border="0">
                      <tr>
                        <td width="36%" style="font-size: 12px; font-weight: bold; color: #166534; text-transform: uppercase;">Assigned Role</td>
                        <td style="font-size: 15px; font-weight: 800; color: #15803d;">
                          <span style="background-color: #dcfce7; padding: 4px 10px; border-radius: 6px; border: 1px solid #86efac;">
                            ${escapeHtml(details.approvedRoleName)}
                          </span>
                        </td>
                      </tr>
                      ${details.ashram ? `
                      <tr>
                        <td style="font-size: 12px; font-weight: bold; color: #166534; text-transform: uppercase;">Ashram Status</td>
                        <td style="font-size: 14px; font-weight: 600; color: #1c1917;">${escapeHtml(details.ashram)}</td>
                      </tr>` : ""}
                      ${details.reviewComment ? `
                      <tr>
                        <td style="font-size: 12px; font-weight: bold; color: #166534; text-transform: uppercase;">Admin Note</td>
                        <td style="font-size: 13px; color: #44403c; line-height: 1.5;">${escapeHtml(details.reviewComment)}</td>
                      </tr>` : ""}
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Unlocked Access Benefits -->
              <div style="background-color: #fff9f2; border-left: 4px solid #ea580c; border-radius: 4px; padding: 14px 16px; margin-bottom: 28px;">
                <p style="margin: 0 0 6px 0; font-size: 13px; font-weight: 700; color: #9a3412;">
                  Unlocked Spiritual Access
                </p>
                <p style="margin: 0; font-size: 12.5px; color: #78350f; line-height: 1.5;">
                  You now have access to confidential seminar recordings, study guides, and leadership archives corresponding to your role. Your session will refresh automatically upon next login.
                </p>
              </div>

              <!-- Call to Action Button -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin: 28px 0 16px;">
                <tr>
                  <td align="center">
                    <a href="${portalUrl}" target="_blank" style="display: inline-block; background: linear-gradient(135deg, #16a34a 0%, #15803d 100%); color: #ffffff; text-decoration: none; font-size: 14px; font-weight: 700; padding: 14px 34px; border-radius: 9999px; box-shadow: 0 4px 14px -1px rgba(22, 163, 74, 0.4); text-align: center;">
                      Explore Discourses Now &rarr;
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Spiritual Footer -->
          <tr>
            <td style="padding: 24px 28px; background-color: #faf5ee; border-top: 1px solid #f3e8dc; text-align: center; font-size: 12px; color: #854d0e; line-height: 1.6;">
              <em>&ldquo;Hearing spiritual sound vibrations purifies the heart and awakens eternal love for the Supreme Lord.&rdquo;</em><br>
              <span style="font-weight: 700;">— HG Radheshyam Das</span><br><br>
              <span style="font-size: 11px; color: #a16207;">&copy; ${new Date().getFullYear()} Radheshyam Das Spiritual Discourses. All rights reserved.</span>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `;

    await transporter.sendMail({
      from: FROM_EMAIL,
      to: details.recipientEmail,
      subject: `Your Role Access Has Been Approved: ${details.approvedRoleName}`,
      html,
    });

    console.log(
      `[EmailService] Sent approval confirmation email to ${details.recipientEmail}`
    );
  } catch (err: unknown) {
    console.error("[EmailService] Failed to send approval email to user:", err);
  }
}

/**
 * 3. Send custom or system email (e.g. from Admin User Management)
 */
export async function sendSystemEmail(options: {
  to: string;
  subject: string;
  html: string;
}) {
  const transporter = getTransporter();
  return transporter.sendMail({
    from: FROM_EMAIL,
    to: options.to,
    subject: options.subject,
    html: options.html,
  });
}
