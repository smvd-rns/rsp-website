"use server";

import type { Json } from "@/database.types";
import { createAdminClient } from "@/lib/admin-server";
import { verifyAdmin } from "@/lib/auth-utils";
import { revalidateQueries } from "@/lib/revalidate";
import {
  createQueryAttachmentUploadSession,
  resolveQueryAttachmentFileId,
} from "@/lib/upload-service";
import {
  categoryPath,
  escapeHtml,
  getURL,
  normalizeForwardHistory,
  normalizeQueryAttachments,
} from "@/lib/utils";
import type {
  QueryAttachment,
  QueryForwardRecord,
  UserQueryWithUser,
} from "@/types";

export const getQueryAttachmentUploadSession = async (
  fileName: string,
  mimeType: string,
  rawOrigin?: string,
) => {
  try {
    await verifyAdmin();
    let origin: string | undefined;
    if (rawOrigin) {
      try {
        const parsed = new URL(rawOrigin);
        origin = parsed.origin;
      } catch {
        origin = rawOrigin;
      }
    }
    return await createQueryAttachmentUploadSession(fileName, mimeType, origin);
  } catch (err) {
    console.error(
      "[query-actions] getQueryAttachmentUploadSession error:",
      err,
    );
    throw err;
  }
};

export const resolveQueryAttachment = async (fileName: string) => {
  try {
    await verifyAdmin();
    return await resolveQueryAttachmentFileId(fileName);
  } catch (err) {
    console.error("[query-actions] resolveQueryAttachment error:", err);
    throw err;
  }
};

export const updateQueryStatus = async (
  id: string,
  status: "open" | "in_progress" | "resolved" | "closed",
) => {
  await verifyAdmin();
  const adminClient = createAdminClient();

  const { error } = await adminClient
    .from("user_queries")
    .update({
      status,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) {
    console.error("Error updating query status:", error);
    return { success: false, error: error.message };
  }

  await revalidateQueries();

  return { success: true };
};

export const createQueryReply = async (
  queryId: string,
  message: string,
  attachments: QueryAttachment[] = [],
  currentStatus?: string,
) => {
  const user = await verifyAdmin();
  const adminClient = createAdminClient();

  // Insert reply
  const { error: replyError } = await adminClient.from("query_replies").insert({
    query_id: queryId,
    user_id: user.id,
    message,
    attachments: attachments as unknown as Json,
  });

  if (replyError) {
    console.error("Error creating query reply:", replyError);
    return { success: false, error: replyError.message };
  }

  // Auto-set status to 'in_progress' if currently 'open' (avoid DB query if status provided by client)
  let statusToCheck: string | null | undefined = currentStatus;
  if (!statusToCheck) {
    const { data: query } = await adminClient
      .from("user_queries")
      .select("status")
      .eq("id", queryId)
      .single();
    statusToCheck = query ? query.status : null;
  }

  if (statusToCheck === "open") {
    await adminClient
      .from("user_queries")
      .update({
        status: "in_progress",
        updated_at: new Date().toISOString(),
      })
      .eq("id", queryId);
  } else {
    await adminClient
      .from("user_queries")
      .update({
        updated_at: new Date().toISOString(),
      })
      .eq("id", queryId);
  }

  await revalidateQueries();

  return { success: true };
};

export interface ForwardQueryEmailInput {
  query: UserQueryWithUser;
  recipientEmails: string[];
  note?: string;
}

export const forwardQueryEmailAction = async ({
  query,
  recipientEmails,
  note,
}: ForwardQueryEmailInput): Promise<{
  success: boolean;
  error?: string;
  forwardRecord?: QueryForwardRecord;
}> => {
  const user = await verifyAdmin();

  if (!query?.id?.trim()) {
    return { success: false, error: "Query is required." };
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const cleanRecipientEmails = (recipientEmails || [])
    .map((e) => e.trim())
    .filter((e) => Boolean(e) && emailRegex.test(e));

  if (cleanRecipientEmails.length === 0) {
    return {
      success: false,
      error: "Please provide at least one valid recipient email address.",
    };
  }

  if (!process.env.RESEND_API_KEY) {
    return {
      success: false,
      error: "Resend API key is not configured in environment variables.",
    };
  }

  const enquirerName = query.users?.name || query.guest_name || "Enquirer";
  const enquirerEmail = query.users?.email || query.guest_email || "";

  if (!enquirerEmail) {
    return {
      success: false,
      error: "The inquiry does not have a valid sender email address.",
    };
  }
  const baseUrl = getURL();
  const deepLink = `${baseUrl}queries?id=${encodeURIComponent(query.id)}`;

  const attachments = normalizeQueryAttachments(query.attachments);
  const attachmentsHtml =
    attachments.length > 0
      ? `
      <div style="margin-top: 16px; border-top: 1px solid #e2e8f0; padding-top: 12px;">
        <p style="margin: 0 0 8px 0; font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px;">Attached Resources (${attachments.length})</p>
        <ul style="margin: 0; padding-left: 20px; font-size: 13px; color: #2563eb; line-height: 1.6;">
          ${attachments
            .map((att) => {
              let label = "Attachment";
              let href: string | undefined;

              switch (att.type) {
                case "image":
                  label = att.name;
                  href = `https://drive.google.com/file/d/${att.uri}/view`;
                  break;
                case "pdf":
                  label = att.name;
                  href = `https://drive.google.com/file/d/${att.uri}/preview`;
                  break;
                case "link":
                  label = att.title || att.uri;
                  href = att.uri;
                  break;
                case "category": {
                  label = `Category: ${att.name}`;
                  const catSlug = att.url_path
                    ? categoryPath(att.url_path)
                    : "";
                  href = catSlug
                    ? `${baseUrl}content/${catSlug}`
                    : `${baseUrl}content`;
                  break;
                }
                case "recording": {
                  label = `Lecture: ${att.name}`;
                  const catSlug = att.category_path
                    ? categoryPath(att.category_path)
                    : "";
                  href = catSlug
                    ? `${baseUrl}content/${catSlug}?q=${att.id}`
                    : `${baseUrl}content?q=${att.id}`;
                  break;
                }
                case "material": {
                  label = `Material: ${att.name}`;
                  const catSlug = att.category_path
                    ? categoryPath(att.category_path)
                    : "";
                  href = catSlug
                    ? `${baseUrl}content/${catSlug}?q=${att.recording_id}&m=${att.id}`
                    : `${baseUrl}content?q=${att.recording_id}&m=${att.id}`;
                  break;
                }
                default:
                  break;
              }

              if (href) {
                return `<li><a href="${escapeHtml(href)}" target="_blank" rel="noopener noreferrer" style="color: #2563eb; text-decoration: underline;">${escapeHtml(label)}</a></li>`;
              }
              return `<li style="color: #475569;">${escapeHtml(label)}</li>`;
            })
            .join("")}
        </ul>
      </div>
    `
      : "";

  const adminNoteHtml = note?.trim()
    ? `
      <div style="background-color: #eff6ff; border-left: 4px solid #3b82f6; padding: 14px 16px; margin-bottom: 24px; border-radius: 4px;">
        <p style="margin: 0 0 4px 0; font-size: 11px; font-weight: 700; color: #1e40af; text-transform: uppercase; letter-spacing: 0.5px;">Note from Administrator</p>
        <p style="margin: 0; font-size: 14px; color: #1e293b; line-height: 1.5; white-space: pre-wrap;">${escapeHtml(note.trim())}</p>
      </div>
    `
    : "";

  const formattedDate = query.created_at
    ? new Date(query.created_at).toLocaleString("en-US", {
        dateStyle: "medium",
        timeStyle: "short",
      })
    : "Recently";

  const htmlContent = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 620px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff; color: #0f172a;">
      <div style="border-bottom: 2px solid #0f172a; padding-bottom: 16px; margin-bottom: 20px;">
        <span style="font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 1px; display: block; margin-bottom: 4px;">RSP Admin Portal</span>
        <h2 style="margin: 0; font-size: 20px; font-weight: 700; color: #0f172a;">Forwarded Inquiry</h2>
      </div>

      ${adminNoteHtml}

      <div style="background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 18px; margin-bottom: 24px;">
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 14px; font-size: 13px;">
          <tr>
            <td style="padding: 3px 0; color: #64748b; width: 80px; font-weight: 600;">From:</td>
            <td style="padding: 3px 0; color: #0f172a;"><strong>${escapeHtml(enquirerName)}</strong> &lt;<a href="mailto:${escapeHtml(enquirerEmail)}" style="color: #2563eb; text-decoration: none;">${escapeHtml(enquirerEmail)}</a>&gt;</td>
          </tr>
          <tr>
            <td style="padding: 3px 0; color: #64748b; font-weight: 600;">Category:</td>
            <td style="padding: 3px 0; color: #0f172a; text-transform: capitalize;">${escapeHtml((query.category || "general").replace("_", " "))}</td>
          </tr>
          <tr>
            <td style="padding: 3px 0; color: #64748b; font-weight: 600;">Received:</td>
            <td style="padding: 3px 0; color: #0f172a;">${formattedDate}</td>
          </tr>
        </table>

        <div style="border-top: 1px solid #f1f5f9; padding-top: 12px;">
          <h3 style="margin: 0 0 10px 0; font-size: 16px; font-weight: 700; color: #0f172a;">
            ${escapeHtml(query.subject)}
          </h3>
          <div style="background-color: #f8fafc; border-radius: 6px; padding: 14px; font-size: 14px; line-height: 1.6; color: #334155; white-space: pre-wrap; font-family: inherit;">${escapeHtml(query.message)}</div>
          ${attachmentsHtml}
        </div>
      </div>

      <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 18px; margin-bottom: 24px;">
        <h4 style="margin: 0 0 14px 0; font-size: 12px; font-weight: 700; color: #334155; text-transform: uppercase; letter-spacing: 0.5px;">
          How to Respond
        </h4>

        <div style="margin-bottom: 16px;">
          <p style="margin: 0 0 4px 0; font-size: 14px; font-weight: 600; color: #0f172a;">
            Option 1: Reply via Admin Dashboard (Recommended)
          </p>
          <p style="margin: 0 0 12px 0; font-size: 13px; color: #475569; line-height: 1.5;">
            Manage and respond directly through the Admin Dashboard. The integrated editor enables you to search and embed website resources (such as audio lectures, categories, and study materials) into your reply by typing <code>@</code>.
          </p>
          <div>
            <a href="${deepLink}" style="background-color: #0f172a; color: #ffffff; padding: 10px 20px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 13px; display: inline-block;">
              Open &amp; Reply in Admin Dashboard &rarr;
            </a>
          </div>
        </div>

        <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 16px 0;" />

        <div>
          <p style="margin: 0 0 4px 0; font-size: 14px; font-weight: 600; color: #0f172a;">
            Option 2: Reply directly via Email
          </p>
          <p style="margin: 0; font-size: 13px; color: #475569; line-height: 1.5;">
            You can also respond by replying directly to this email message. Your reply will be delivered straight to <strong>${escapeHtml(enquirerName)}</strong> (${escapeHtml(enquirerEmail)}).
            <br />
            <span style="font-size: 12px; color: #64748b; font-style: italic; display: inline-block; margin-top: 4px;">
              Note: Replies sent via direct email are handled outside the portal and will not update or appear in the Admin Dashboard query thread.
            </span>
          </p>
        </div>
      </div>

      <div style="text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px solid #f1f5f9; padding-top: 16px;">
        Forwarded from RSP Admin Portal &bull; <a href="${deepLink}" style="color: #64748b; text-decoration: underline;">Ticket #${escapeHtml(query.id.slice(0, 8))}</a>
        <br />
        <span style="display: inline-block; margin-top: 6px; color: #94a3b8;">
          This email was sent from an unmonitored mailbox (noreply@radheshyamdas.com). Direct email replies will be delivered to the enquirer (${escapeHtml(enquirerEmail)}).
        </span>
      </div>
    </div>
  `;

  try {
    const { Resend } = await import("resend");
    const resend = new Resend(process.env.RESEND_API_KEY);

    const sendResult = await resend.emails.send({
      from: "RSP Admin <noreply@radheshyamdas.com>",
      to: cleanRecipientEmails,
      replyTo: enquirerName
        ? `${enquirerName} <${enquirerEmail}>`
        : enquirerEmail,
      subject: `Fwd: [Query #${query.id.slice(0, 8)}] ${query.subject}`,
      html: htmlContent,
    });

    if (sendResult.error) {
      console.error("Resend error forwarding query email:", sendResult.error);
      return { success: false, error: sendResult.error.message };
    }

    const adminName =
      (user.user_metadata?.name as string | undefined) ||
      (user.user_metadata?.full_name as string | undefined) ||
      (user.email ? user.email.split("@")[0] : "Admin");

    const forwardRecord: QueryForwardRecord = {
      forwarded_by: user.id,
      forwarded_by_name: adminName,
      forwarded_by_email: user.email || null,
      forwarded_to: cleanRecipientEmails,
      forwarded_at: new Date().toISOString(),
      note: note?.trim() || null,
    };

    const adminClient = createAdminClient();
    const { data: currentQuery } = await adminClient
      .from("user_queries")
      .select("forward_history")
      .eq("id", query.id)
      .single();

    const existingHistory = normalizeForwardHistory(
      currentQuery?.forward_history,
    );
    const updatedHistory = [...existingHistory, forwardRecord];

    await adminClient
      .from("user_queries")
      .update({
        forward_history: updatedHistory as unknown as Json,
        updated_at: new Date().toISOString(),
      })
      .eq("id", query.id);

    await revalidateQueries();

    return { success: true, forwardRecord };
  } catch (err) {
    console.error("Error executing query forward email:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to forward email",
    };
  }
};
