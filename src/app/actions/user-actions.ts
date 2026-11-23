"use server";

import { Resend } from "resend";
import type { UserProfileFields } from "@/components/admin/users/user-utils";
import { ADMIN_ROLE_ID } from "@/constants";
import { createAdminClient } from "@/lib/admin-server";
import { verifyAdmin } from "@/lib/auth-utils";
import pool from "@/lib/db";
import { escapeHtml, getURL } from "@/lib/utils";

const ADMIN_EMAIL_SUBJECT = "Welcome to RSP Admin";
const ADMIN_EMAIL_BODY = `Welcome!

You have been whitelisted as an Admin for the RSP Admin dashboard.
Please sign up or log in using your Google account with the email: {email}

Click the link below to access the dashboard:
{login_url}

Best regards,
The RSP Admin Team`;

const USER_EMAIL_SUBJECT = "Welcome to Radheshyam Das Portal";
const USER_EMAIL_BODY = `Welcome!

You have been whitelisted as a {role} for the Radheshyam Das Portal.
Please sign up or log in using your Google account with the email: {email}

Click the link below to access the portal:
{login_url}

Best regards,
The RSP Team`;

export interface AdminCreateUserInput extends UserProfileFields {
  email: string;
  roleId: number;
  sendEmail: boolean;
  emailSubject?: string;
  emailBody?: string;
  forceUpdate?: boolean;
}

export const adminCreateUser = async (data: AdminCreateUserInput) => {
  await verifyAdmin();
  const emailLower = data.email.toLowerCase().trim();

  const existingRes = await pool.query(
    `SELECT id, email, role, name, phone, ashram, temple, purpose, authorityname, authorityrelationship, authorityemail FROM rsp.users WHERE lower(email) = $1 LIMIT 1`,
    [emailLower],
  );
  const existingUser = existingRes.rows[0];

  if (existingUser && !data.forceUpdate) {
    return {
      success: false,
      exists: true,
      type: "users",
      message: `A user with email ${data.email} already exists in the system. Do you want to update their role and profile information?`,
    };
  }

  const roleId =
    !Number.isNaN(Number(data.roleId)) && Number(data.roleId) > 0
      ? Number(data.roleId)
      : Number(existingUser?.role || 2);

  if (existingUser) {
    await pool.query(
      `UPDATE rsp.users SET
        role = $1,
        name = $2,
        phone = $3,
        ashram = $4,
        temple = $5,
        purpose = $6,
        authorityname = $7,
        authorityrelationship = $8,
        authorityemail = $9
       WHERE lower(email) = $10`,
      [
        roleId,
        data.name !== undefined ? data.name : existingUser.name,
        data.phone !== undefined ? data.phone : existingUser.phone,
        data.ashram !== undefined ? data.ashram : existingUser.ashram,
        data.temple !== undefined ? data.temple : existingUser.temple,
        data.purpose !== undefined ? data.purpose : existingUser.purpose,
        data.authorityName !== undefined
          ? data.authorityName
          : existingUser.authorityname,
        data.authorityRelationship !== undefined
          ? data.authorityRelationship
          : existingUser.authorityrelationship,
        data.authorityEmail !== undefined
          ? data.authorityEmail
          : existingUser.authorityemail,
        emailLower,
      ],
    );
  } else {
    const idRes = await pool.query(
      `SELECT COALESCE(MAX(id), 0) + 1 AS next_id FROM rsp.users`,
    );
    const nextId = Number(idRes.rows[0]?.next_id || 1);

    await pool.query(
      `INSERT INTO rsp.users (
        id, email, name, role, phone, ashram, temple, purpose,
        authorityname, authorityrelationship, authorityemail, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'verified')`,
      [
        nextId,
        emailLower,
        data.name || emailLower.split("@")[0],
        roleId,
        data.phone || null,
        data.ashram || null,
        data.temple || null,
        data.purpose || null,
        data.authorityName || null,
        data.authorityRelationship || null,
        data.authorityEmail || null,
      ],
    );
  }

  let emailSent = false;
  let emailError: string | undefined;

  if (data.sendEmail) {
    if (!process.env.RESEND_API_KEY) {
      emailError = "Resend API key is not configured in environment variables.";
    } else {
      try {
        const { Resend } = await import("resend");
        const resend = new Resend(process.env.RESEND_API_KEY);

        const roleRes = await pool.query(
          `SELECT name FROM rsp.roles WHERE id = $1 LIMIT 1`,
          [roleId],
        );
        const roleName = roleRes.rows[0]?.name || "User";
        const isAdmin = roleId === ADMIN_ROLE_ID;
        const loginUrl = isAdmin
          ? `${getURL()}auth/login`
          : "https://radheshyamdas.com/";
        const portalHeader = isAdmin ? "RSP Admin" : "Radheshyam Das Portal";
        const portalButtonText = isAdmin
          ? "Login to Dashboard"
          : "Access Portal";
        const portalFooter = isAdmin ? "RSP Admin" : "Radheshyam Das Portal";

        let subject =
          data.emailSubject ||
          (isAdmin ? ADMIN_EMAIL_SUBJECT : USER_EMAIL_SUBJECT);
        let body =
          data.emailBody || (isAdmin ? ADMIN_EMAIL_BODY : USER_EMAIL_BODY);

        const replacePlaceholders = (text: string) =>
          text
            .replaceAll("{role}", roleName)
            .replaceAll("{email}", data.email)
            .replaceAll("{login_url}", loginUrl);

        subject = replacePlaceholders(subject);
        body = replacePlaceholders(body);

        const formattedBody = body
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;")
          .replace(/\n/g, "<br />");

        const htmlContent = `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 32px; border: 1px solid #e4e4e7; border-radius: 12px; background-color: #ffffff; color: #18181b;">
            <h2 style="color: #0f172a; margin-top: 0; font-size: 20px; font-weight: 700; border-bottom: 1px solid #e2e8f0; padding-bottom: 16px; font-family: inherit;">${portalHeader}</h2>
            <div style="margin-top: 24px; font-size: 15px; line-height: 1.6; color: #3f3f46; font-family: inherit;">${formattedBody}</div>
            <div style="margin-top: 32px; margin-bottom: 32px; text-align: center;">
              <a href="${loginUrl}" style="background-color: #18181b; color: #ffffff; padding: 12px 28px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 14px; display: inline-block; font-family: inherit;">${portalButtonText}</a>
            </div>
            <hr style="border: 0; border-top: 1px solid #f4f4f5; margin: 32px 0;" />
            <p style="font-size: 12px; color: #71717a; text-align: center; margin: 0; font-family: inherit;">This is an automated message from the ${portalFooter} team. Please do not reply.</p>
          </div>
        `;

        const sendResult = await resend.emails.send({
          from: "Radheshyam Das Tech Team <noreply@radheshyamdas.com>",
          to: data.email,
          subject,
          html: htmlContent,
        });

        if (sendResult.error) {
          emailError = sendResult.error.message;
        } else {
          emailSent = true;
        }
      } catch (err) {
        console.error("Error sending welcome email via Resend:", err);
        emailError =
          err instanceof Error ? err.message : "Unknown mail delivery error";
      }
    }
  }

  return { success: true, emailSent, emailError };
};

export const updateUserEditRequestStatus = async (
  id: string,
  action: "approved" | "rejected",
  edits?: {
    requested_role_id?: number;
    name?: string | null;
    ashram?: string | null;
    temple?: string | null;
    purpose?: string | null;
    authority_name?: string | null;
    authority_relationship?: string | null;
    authority_email?: string | null;
    phone?: string | null;
    review_comment?: string | null;
  },
) => {
  const user = await verifyAdmin();
  const adminClient = createAdminClient();

  // Fetch the existing request to know the user and requested details
  const { data: requestData } = await adminClient
    .from("user_edit_requests")
    .select("id, user_id, requested_role_id, name, review_comment")
    .eq("id", id)
    .maybeSingle();

  const updatePayload: Database["prod"]["Tables"]["user_edit_requests"]["Update"] =
    {
      status: action,
      reviewed_at: new Date().toISOString(),
      reviewed_by: user.id,
    };

  if (edits) {
    if (edits.requested_role_id !== undefined)
      updatePayload.requested_role_id = edits.requested_role_id;
    if (edits.name !== undefined) updatePayload.name = edits.name;
    if (edits.ashram !== undefined) updatePayload.ashram = edits.ashram;
    if (edits.temple !== undefined) updatePayload.temple = edits.temple;
    if (edits.purpose !== undefined) updatePayload.purpose = edits.purpose;
    if (edits.authority_name !== undefined)
      updatePayload.authority_name = edits.authority_name;
    if (edits.authority_relationship !== undefined)
      updatePayload.authority_relationship = edits.authority_relationship;
    if (edits.authority_email !== undefined)
      updatePayload.authority_email = edits.authority_email;
    if (edits.phone !== undefined) updatePayload.phone = edits.phone;
    if (edits.review_comment !== undefined)
      updatePayload.review_comment = edits.review_comment;
  }

  const { data, error } = await adminClient
    .from("user_edit_requests")
    .update(updatePayload)
    .eq("id", id)
    .select();

  if (error) throw new Error(error.message);

  // Send email notification to user
  const targetUserId = requestData?.user_id;
  if (targetUserId && process.env.RESEND_API_KEY) {
    try {
      const { data: targetUser } = await adminClient
        .from("users")
        .select("id, email, name, role_id")
        .eq("id", targetUserId)
        .maybeSingle();

      const recipientEmail = targetUser?.email;
      if (recipientEmail) {
        const resend = new Resend(process.env.RESEND_API_KEY);

        const recipientName =
          targetUser.name || requestData?.name || edits?.name || "";

        const isApproved = action === "approved";
        const reviewComment =
          edits?.review_comment !== undefined
            ? edits.review_comment
            : requestData?.review_comment;

        const subject = isApproved
          ? "Your Profile & Role Update Request Has Been Approved"
          : "Update on Your Profile Request";

        const greeting = `Hare Krishna${recipientName ? ` ${escapeHtml(recipientName)}` : ""},`;

        const statusMessage = isApproved
          ? `<p style="margin: 0 0 16px 0; font-size: 15px; color: #1e293b; line-height: 1.6;">
              Your profile update request has been <strong>approved</strong> by the administrator.
            </p>`
          : `<p style="margin: 0 0 16px 0; font-size: 15px; color: #1e293b; line-height: 1.6;">
              Your recent profile update request has been reviewed and was <strong>not approved</strong> at this time.
            </p>`;

        const sessionNotice = isApproved
          ? `
            <div style="background-color: #f0fdf4; border-left: 4px solid #22c55e; padding: 14px 16px; margin: 20px 0; border-radius: 4px;">
              <p style="margin: 0 0 6px 0; font-size: 13px; font-weight: 700; color: #15803d;">
                Session &amp; Permissions Note
              </p>
              <p style="margin: 0; font-size: 13px; color: #166534; line-height: 1.5;">
                In case of any issues with access or updated permissions, please <strong>log out and log in again</strong> to refresh your account session. (Roles mostly sync automatically, but logging out and back in ensures your updated role and token refresh immediately).
              </p>
            </div>
          `
          : "";

        const reviewerNoteBlock = reviewComment?.trim()
          ? `
            <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 14px 16px; margin: 18px 0;">
              <p style="margin: 0 0 6px 0; font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px;">
                Reviewer Note / Reason
              </p>
              <p style="margin: 0; font-size: 13px; color: #334155; line-height: 1.5; white-space: pre-wrap;">${escapeHtml(reviewComment.trim())}</p>
            </div>
          `
          : "";

        const portalUrl = "https://radheshyamdas.com/";

        const htmlContent = `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 32px 24px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff; color: #0f172a;">
            <div style="border-bottom: 2px solid #0f172a; padding-bottom: 16px; margin-bottom: 24px;">
              <span style="font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 1px; display: block; margin-bottom: 4px;">Radheshyam Das Portal</span>
              <h2 style="margin: 0; font-size: 20px; font-weight: 700; color: #0f172a;">
                ${isApproved ? "Profile Request Approved" : "Profile Request Status Update"}
              </h2>
            </div>

            <p style="font-size: 15px; margin: 0 0 16px 0; color: #0f172a;">
              ${greeting}
            </p>

            ${statusMessage}
            ${reviewerNoteBlock}
            ${sessionNotice}

            <div style="margin: 28px 0; text-align: center;">
              <a href="${portalUrl}" style="background-color: #0f172a; color: #ffffff; padding: 12px 28px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 14px; display: inline-block;">
                Access Radheshyam Das Portal &rarr;
              </a>
            </div>

            <hr style="border: 0; border-top: 1px solid #f1f5f9; margin: 28px 0 16px;" />

            <div style="text-align: center; font-size: 11px; color: #94a3b8; line-height: 1.5;">
              <p style="margin: 0 0 4px 0;">This email was sent from an automated notifications address.</p>
              <p style="margin: 0; font-weight: 600; color: #64748b;">
                Please note: This email is not monitored &mdash; do not reply. (noreply@radheshyamdas.com)
              </p>
            </div>
          </div>
        `;

        await resend.emails.send({
          from: "Radheshyam Das Tech Team <noreply@radheshyamdas.com>",
          to: recipientEmail,
          subject,
          html: htmlContent,
        });
      }
    } catch (emailErr) {
      console.error(
        "Error sending user edit request notification email via Resend:",
        emailErr,
      );
    }
  }

  return data;
};

export const deleteWhitelistUser = async (email: string) => {
  await verifyAdmin();
  const adminClient = createAdminClient();
  const { error } = await adminClient
    .from("user_whitelist")
    .delete()
    .eq("id", email.toLowerCase());
  if (error) throw new Error(error.message);
  return { success: true };
};

export const adminDeleteActiveUser = async (
  userId?: string | null,
  email?: string | null,
) => {
  await verifyAdmin();
  const emailLower = email ? email.toLowerCase().trim() : "";

  const numericId =
    userId && userId !== "null" && userId !== "undefined"
      ? Number(userId)
      : Number.NaN;
  const isValidNumericId = !Number.isNaN(numericId) && numericId > 0;

  // 1. Delete from PostgreSQL local rsp.users table
  if (isValidNumericId && emailLower) {
    await pool.query(
      "DELETE FROM rsp.users WHERE id = $1 OR LOWER(email) = $2",
      [numericId, emailLower],
    );
  } else if (isValidNumericId) {
    await pool.query("DELETE FROM rsp.users WHERE id = $1", [numericId]);
  } else if (emailLower) {
    await pool.query("DELETE FROM rsp.users WHERE LOWER(email) = $1", [
      emailLower,
    ]);
  } else {
    throw new Error("Cannot delete user: Missing valid user ID or email.");
  }

  // 2. Also remove from user_whitelist if pre-approved
  if (emailLower) {
    try {
      const adminClient = createAdminClient();
      await adminClient.from("user_whitelist").delete().eq("id", emailLower);
    } catch (err) {
      console.warn("[adminDeleteActiveUser] whitelist cleanup notice:", err);
    }
  }

  // 3. Clean up any pending edit requests for this user
  try {
    if (emailLower) {
      await pool.query(
        "DELETE FROM rsp.user_edit_requests WHERE LOWER(email) = $1",
        [emailLower],
      );
    }
    if (isValidNumericId) {
      await pool.query(
        "DELETE FROM rsp.user_edit_requests WHERE user_id = $1",
        [String(numericId)],
      );
    }
  } catch (err) {
    console.warn(
      "[adminDeleteActiveUser] user_edit_requests cleanup notice:",
      err,
    );
  }

  // 4. Also sync delete with Supabase if present
  if (emailLower) {
    try {
      const adminClient = createAdminClient();
      await adminClient.from("users").delete().eq("email", emailLower);
    } catch (err) {
      console.warn(
        "[adminDeleteActiveUser] Supabase sync cleanup notice:",
        err,
      );
    }
  }

  return { success: true };
};
