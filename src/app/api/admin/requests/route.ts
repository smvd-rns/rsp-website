import { type NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/auth-server";
import pool from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const session = await getSessionFromRequest(req);
    const role = Number(session?.role || 0);
    const isAdmin = role === 1 || role === 8;
    if (!session || !isAdmin) {
      return NextResponse.json(
        { error: "Unauthorized: Admin access required" },
        { status: 403 },
      );
    }

    const res = await pool.query(`
      SELECT 
        r.id,
        r.user_id,
        r.name,
        r.phone,
        r.ashram,
        r.temple,
        r.purpose,
        r.authority_name,
        r.authority_email,
        r.authority_relationship,
        r.requested_role_id,
        r.reason,
        r.status,
        r.review_comment,
        r.reviewed_at,
        r.reviewed_by,
        r.requested_at,
        r.created_at,
        r.updated_at,
        u.email AS user_email,
        ro.name AS role_name,
        rev.email AS reviewer_email
      FROM rsp.user_edit_requests r
      LEFT JOIN rsp.users u ON CAST(u.id AS TEXT) = CAST(r.user_id AS TEXT)
      LEFT JOIN rsp.roles ro ON ro.id = r.requested_role_id
      LEFT JOIN rsp.users rev ON CAST(rev.id AS TEXT) = CAST(r.reviewed_by AS TEXT)
      ORDER BY r.requested_at DESC
    `);

    const requests = res.rows.map((row) => ({
      id: String(row.id),
      user_id: String(row.user_id),
      name: row.name,
      phone: row.phone,
      ashram: row.ashram,
      temple: row.temple,
      purpose: row.purpose,
      authority_name: row.authority_name,
      authority_email: row.authority_email,
      authority_relationship: row.authority_relationship,
      requested_role_id: row.requested_role_id ? Number(row.requested_role_id) : null,
      reason: row.reason,
      status: row.status,
      review_comment: row.review_comment,
      reviewed_at: row.reviewed_at ? new Date(row.reviewed_at).toISOString() : null,
      reviewed_by: row.reviewed_by ? String(row.reviewed_by) : null,
      requested_at: row.requested_at ? new Date(row.requested_at).toISOString() : null,
      created_at: row.created_at ? new Date(row.created_at).toISOString() : null,
      updated_at: row.updated_at ? new Date(row.updated_at).toISOString() : null,
      users: row.user_email ? { email: row.user_email } : null,
      roles: row.role_name ? { name: row.role_name } : null,
      reviewer: row.reviewer_email ? { email: row.reviewer_email } : null,
    }));

    return NextResponse.json({ success: true, requests });
  } catch (err: unknown) {
    console.error("[Admin Requests GET Error]", err);
    return NextResponse.json(
      { error: (err as Error)?.message || "Failed to fetch user requests" },
      { status: 500 },
    );
  }
}

