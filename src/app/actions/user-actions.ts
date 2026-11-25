"use server";

import {
  sendRoleApprovedEmailToUser,
  sendSystemEmail,
} from "@/lib/email-service";
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
    try {
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
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 32px; border: 1.5px solid rgba(139, 90, 43, 0.25); border-radius: 16px; background-color: #ffffff; color: #18181b;">
          <h2 style="color: #9a3412; margin-top: 0; font-size: 20px; font-weight: 700; border-bottom: 1px solid #f3e8dc; padding-bottom: 16px;">${portalHeader}</h2>
          <div style="margin-top: 24px; font-size: 15px; line-height: 1.6; color: #3f3f46;">${formattedBody}</div>
          <div style="margin-top: 32px; margin-bottom: 32px; text-align: center;">
            <a href="${loginUrl}" style="background-color: #c2410c; color: #ffffff; padding: 12px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 14px; display: inline-block;">${portalButtonText}</a>
          </div>
          <hr style="border: 0; border-top: 1px solid #f4f4f5; margin: 32px 0;" />
          <p style="font-size: 12px; color: #71717a; text-align: center; margin: 0;">This is an automated message from the ${portalFooter} team.</p>
        </div>
      `;

      await sendSystemEmail({
        to: data.email,
        subject,
        html: htmlContent,
      });

      emailSent = true;
    } catch (err) {
      console.error("Error sending user notification email via SMTP:", err);
      emailError =
        err instanceof Error ? err.message : "Unknown mail delivery error";
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

  // 1. Fetch existing request from rsp.user_edit_requests
  const reqRes = await pool.query(
    `SELECT * FROM rsp.user_edit_requests WHERE id = $1 LIMIT 1`,
    [id],
  );
  const requestData = reqRes.rows[0];

  // 2. Update rsp.user_edit_requests status
  await pool.query(
    `UPDATE rsp.user_edit_requests SET
      status = $1,
      review_comment = COALESCE($2, review_comment),
      reviewed_by = $3,
      reviewed_at = NOW(),
      updated_at = NOW()
     WHERE id = $4`,
    [action, edits?.review_comment || null, user.id, id],
  );

  // 3. If approved, apply the updates to rsp.users
  const targetUserId = requestData?.user_id;
  const roleToAssign = edits?.requested_role_id || requestData?.requested_role_id;

  if (action === "approved" && targetUserId) {
    await pool.query(
      `UPDATE rsp.users SET
        role = COALESCE($1, role),
        ashram = COALESCE($2, ashram),
        name = COALESCE($3, name),
        phone = COALESCE($4, phone),
        temple = COALESCE($5, temple),
        purpose = COALESCE($6, purpose),
        authorityname = COALESCE($7, authorityname),
        authorityemail = COALESCE($8, authorityemail),
        authorityrelationship = COALESCE($9, authorityrelationship),
        updated_at = NOW()
       WHERE CAST(id AS TEXT) = $10`,
      [
        roleToAssign,
        edits?.ashram || requestData?.ashram || null,
        edits?.name || requestData?.name || null,
        edits?.phone || requestData?.phone || null,
        edits?.temple || requestData?.temple || null,
        edits?.purpose || requestData?.purpose || null,
        edits?.authority_name || requestData?.authority_name || null,
        edits?.authority_email || requestData?.authority_email || null,
        edits?.authority_relationship || requestData?.authority_relationship || null,
        String(targetUserId),
      ],
    );
  }

  // 4. Resolve role name & send notification email
  let approvedRoleName = "Devotee";
  if (roleToAssign) {
    const roleRes = await pool.query(
      `SELECT name FROM rsp.roles WHERE id = $1 LIMIT 1`,
      [roleToAssign],
    );
    if (roleRes.rows[0]?.name) {
      approvedRoleName = roleRes.rows[0].name;
    }
  }

  // Fetch recipient email from rsp.users
  let recipientEmail = "";
  let recipientName = edits?.name || requestData?.name || "";
  if (targetUserId) {
    const uRes = await pool.query(
      `SELECT email, name FROM rsp.users WHERE CAST(id AS TEXT) = $1 LIMIT 1`,
      [String(targetUserId)],
    );
    if (uRes.rows[0]) {
      recipientEmail = uRes.rows[0].email;
      if (!recipientName) recipientName = uRes.rows[0].name || "";
    }
  }

  if (recipientEmail && action === "approved") {
    try {
      await sendRoleApprovedEmailToUser({
        recipientEmail,
        recipientName: recipientName || "Devotee",
        approvedRoleName,
        ashram: edits?.ashram || requestData?.ashram,
        reviewComment: edits?.review_comment || requestData?.review_comment,
      });
    } catch (emailErr) {
      console.error("[updateUserEditRequestStatus] Failed to send approval email:", emailErr);
    }
  }

  // Also sync prod Supabase table in background if configured
  try {
    const adminClient = createAdminClient();
    await adminClient
      .from("user_edit_requests")
      .update({
        status: action,
        reviewed_at: new Date().toISOString(),
        reviewed_by: user.id,
      })
      .eq("id", id);
  } catch {}

  return { success: true };
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
