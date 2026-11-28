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
        q.id,
        q.guest_name,
        q.guest_email,
        q.user_id,
        q.category,
        q.subject,
        q.message,
        q.status,
        q.attachments,
        q.created_at,
        q.updated_at,
        u.name AS user_name,
        u.email AS user_email
      FROM rsp.user_queries q
      LEFT JOIN rsp.users u ON CAST(u.id AS TEXT) = CAST(q.user_id AS TEXT)
      ORDER BY q.created_at DESC
    `);

    const queries = res.rows.map((row) => ({
      id: String(row.id),
      guest_name: row.guest_name,
      guest_email: row.guest_email,
      user_id: row.user_id ? String(row.user_id) : null,
      category: row.category,
      subject: row.subject,
      message: row.message,
      status: row.status || "open",
      attachments: row.attachments || [],
      created_at: row.created_at ? new Date(row.created_at).toISOString() : null,
      updated_at: row.updated_at ? new Date(row.updated_at).toISOString() : null,
      users: row.user_id
        ? {
            name: row.user_name || null,
            email: row.user_email || null,
          }
        : null,
    }));

    return NextResponse.json({ data: queries });
  } catch (err: unknown) {
    console.error("Error fetching admin queries:", err);
    return NextResponse.json(
      { error: "Failed to fetch queries" },
      { status: 500 },
    );
  }
}
