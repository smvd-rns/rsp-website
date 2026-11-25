import { type NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import pool from "@/lib/db";
import { getSessionFromRequest, setSessionCookie, signSessionToken } from "@/lib/auth-server";
import { sendNewRoleRequestEmailToAdmins } from "@/lib/email-service";

interface EditRequestBody {
  user_id?: string;
  name: string;
  phone?: string | null;
  temple?: string | null;
  ashram?: string | null;
  purpose?: string | null;
  authority_name?: string | null;
  authority_email?: string | null;
  authority_relationship?: string | null;
  requested_role_id?: number | null;
  reason?: string | null;
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSessionFromRequest(req);
    if (!session?.userId && !session?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await req.json()) as EditRequestBody;
    const isAdmin = Number(session.role) === 1 || Number(session.role) === 8;
    let targetUserId = (!isAdmin || !body.user_id) ? session.userId : body.user_id;

    if (!targetUserId && session?.email) {
      const uRes = await pool.query(
        `SELECT id FROM rsp.users WHERE LOWER(email) = LOWER($1) LIMIT 1`,
        [session.email]
      );
      if (uRes.rows.length > 0) {
        targetUserId = String(uRes.rows[0].id);
      }
    }

    if (!targetUserId || !body.name) {
      return NextResponse.json(
        { error: "Missing required fields (name or valid user identification)" },
        { status: 400 },
      );
    }

    // 1. If not admin (or user is requesting a new role / upgrade), log the request in rsp.user_edit_requests and notify admins
    if (!isAdmin || body.requested_role_id) {
      const requestId = crypto.randomUUID();
      try {
        await pool.query(
          `INSERT INTO rsp.user_edit_requests (
            id, user_id, name, phone, ashram, temple, purpose,
            authority_name, authority_email, authority_relationship,
            requested_role_id, reason, status, requested_at, created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'pending', NOW(), NOW(), NOW())`,
          [
            requestId,
            String(targetUserId),
            body.name.trim(),
            body.phone || null,
            body.ashram || null,
            body.temple || null,
            body.purpose || null,
            body.authority_name || null,
            body.authority_email || null,
            body.authority_relationship || null,
            body.requested_role_id || null,
            body.reason || null,
          ]
        );

        // Resolve requested role name for email
        let requestedRoleName = body.ashram || "Member";
        if (body.requested_role_id) {
          const roleRes = await pool.query(
            `SELECT name FROM rsp.roles WHERE id = $1 LIMIT 1`,
            [body.requested_role_id]
          );
          if (roleRes.rows[0]?.name) {
            requestedRoleName = roleRes.rows[0].name;
          }
        }

        // Send email to all admins in background
        sendNewRoleRequestEmailToAdmins({
          userName: body.name.trim(),
          userEmail: session?.email || "",
          phone: body.phone,
          temple: body.temple,
          ashram: body.ashram,
          requestedRoleName,
          purpose: body.purpose,
          authorityName: body.authority_name,
          authorityEmail: body.authority_email,
          authorityRelationship: body.authority_relationship,
        }).catch((err) => {
          console.error("[Edit-Request Route] Admin notification email failed:", err);
        });
      } catch (insertErr) {
        console.error("[Edit-Request Route] Failed to insert request record:", insertErr);
      }
    }

    // 2. Update user profile details in rsp.users
    const isNumericId = /^\d+$/.test(String(targetUserId));
    let updateRes;
    if (isNumericId) {
      updateRes = await pool.query(
        `UPDATE rsp.users SET
          name = $1,
          phone = $2,
          temple = $3,
          ashram = $4,
          purpose = $5,
          authorityname = $6,
          authorityemail = $7,
          authorityrelationship = $8
         WHERE id = $9
         RETURNING *`,
        [
          body.name.trim(),
          body.phone || null,
          body.temple || null,
          body.ashram || "Visitor",
          body.purpose || null,
          body.authority_name || null,
          body.authority_email || null,
          body.authority_relationship || null,
          targetUserId,
        ]
      );
    } else {
      updateRes = await pool.query(
        `UPDATE rsp.users SET
          name = $1,
          phone = $2,
          temple = $3,
          ashram = $4,
          purpose = $5,
          authorityname = $6,
          authorityemail = $7,
          authorityrelationship = $8
         WHERE LOWER(email) = LOWER($9)
         RETURNING *`,
        [
          body.name.trim(),
          body.phone || null,
          body.temple || null,
          body.ashram || "Visitor",
          body.purpose || null,
          body.authority_name || null,
          body.authority_email || null,
          body.authority_relationship || null,
          session?.email || targetUserId,
        ]
      );
    }

    const updatedUser = updateRes.rows[0];

    // 3. Refresh session token if name or role updated
    const response = NextResponse.json({
      success: true,
      data: {
        id: String(targetUserId),
        name: body.name,
        phone: body.phone || null,
        temple: body.temple || null,
        ashram: body.ashram || "Visitor",
        purpose: body.purpose || null,
        authority_name: body.authority_name || null,
        authority_email: body.authority_email || null,
        authority_relationship: body.authority_relationship || null,
        role_id: updatedUser ? Number(updatedUser.role || 1) : 1,
        status: updatedUser?.status || "verified",
      },
    });

    if (session) {
      const newToken = await signSessionToken({
        userId: session.userId,
        email: session.email,
        name: body.name.trim(),
        role: updatedUser ? Number(updatedUser.role || 1) : session.role,
        avatarUrl: updatedUser?.avatar_url || session.avatarUrl,
        provider: session.provider,
      });
      setSessionCookie(response, newToken);
    }

    return response;
  } catch (err: any) {
    console.error("[Edit-Request Route Error]", err);
    return NextResponse.json(
      { error: err?.message || "Failed to submit settings update." },
      { status: 500 }
    );
  }
}
