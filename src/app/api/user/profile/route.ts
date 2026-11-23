import { type NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";
import { getSessionFromRequest } from "@/lib/auth-server";

export async function GET(req: NextRequest) {
  try {
    const session = await getSessionFromRequest(req);
    if (!session?.userId && !session?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const isNumericId = session?.userId && /^\d+$/.test(String(session.userId));
    const res = isNumericId
      ? await pool.query(
          `SELECT 
            id,
            name,
            email,
            phone,
            ashram,
            temple,
            purpose,
            authorityname AS authority_name,
            authorityemail AS authority_email,
            authorityrelationship AS authority_relationship,
            role AS role_id,
            status,
            avatar_url
           FROM rsp.users 
           WHERE id = $1 LIMIT 1`,
          [session.userId]
        )
      : await pool.query(
          `SELECT 
            id,
            name,
            email,
            phone,
            ashram,
            temple,
            purpose,
            authorityname AS authority_name,
            authorityemail AS authority_email,
            authorityrelationship AS authority_relationship,
            role AS role_id,
            status,
            avatar_url
           FROM rsp.users 
           WHERE LOWER(email) = LOWER($1) LIMIT 1`,
          [session.email]
        );

    if (res.rows.length === 0) {
      return NextResponse.json({
        profile: {
          id: String(session?.userId || "0"),
          name: session?.name || session?.email?.split("@")[0] || "",
          email: session?.email,
          phone: null,
          ashram: "Visitor",
          temple: null,
          purpose: null,
          authority_name: null,
          authority_email: null,
          authority_relationship: null,
          role_id: session?.role || 1,
          status: "verified",
          avatar_url: session?.avatarUrl || null,
        },
      });
    }

    const row = res.rows[0];
    return NextResponse.json({
      profile: {
        id: String(row.id),
        name: row.name || session.name || "",
        email: row.email || session.email,
        phone: row.phone || null,
        ashram: row.ashram || "Visitor",
        temple: row.temple || null,
        purpose: row.purpose || null,
        authority_name: row.authority_name || null,
        authority_email: row.authority_email || null,
        authority_relationship: row.authority_relationship || null,
        role_id: Number(row.role_id || 1),
        status: row.status || "verified",
        avatar_url: row.avatar_url || session.avatarUrl || null,
      },
    });
  } catch (err: any) {
    console.error("[Profile API Error]", err);
    return NextResponse.json(
      { error: err?.message || "Failed to fetch profile" },
      { status: 500 }
    );
  }
}

