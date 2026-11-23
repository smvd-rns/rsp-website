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

    const searchParams = req.nextUrl.searchParams;
    const page = Math.max(1, Number(searchParams.get("page")) || 1);
    const limit = Math.max(
      5,
      Math.min(100, Number(searchParams.get("limit")) || 10),
    );
    const search = (searchParams.get("search") || "").trim().toLowerCase();
    const roleParam = searchParams.get("role") || "";
    const offset = (page - 1) * limit;

    const whereClauses: string[] = [];
    const params: any[] = [];

    if (search) {
      params.push(`%${search}%`);
      whereClauses.push(
        `(lower(u.email) LIKE $${params.length} OR lower(u.name) LIKE $${params.length} OR COALESCE(u.phone, '') LIKE $${params.length})`,
      );
    }

    if (roleParam && roleParam !== "all") {
      params.push(Number(roleParam));
      whereClauses.push(`u.role = $${params.length}`);
    }

    const whereSql =
      whereClauses.length > 0 ? `WHERE ${whereClauses.join(" AND ")}` : "";

    // 1. Get total count for current query
    const countRes = await pool.query(
      `SELECT count(u.id) AS total FROM rsp.users u ${whereSql}`,
      params,
    );
    const totalCount = Number(countRes.rows[0]?.total || 0);

    // 2. Fetch paginated users with joined role names (uses idx_users_id for fast paging)
    const queryParams = [...params, limit, offset];
    const limitIdx = queryParams.length - 1;
    const offsetIdx = queryParams.length;

    const usersRes = await pool.query(
      `
      SELECT 
        u.id,
        u.email,
        u.name,
        u.phone,
        u.ashram,
        u.temple,
        u.purpose,
        u.authorityname AS authority_name,
        CASE 
          WHEN u.authorityrelationship LIKE '%@%' THEN u.authorityrelationship
          ELSE u.authorityemail
        END AS authority_email,
        CASE 
          WHEN u.authorityrelationship LIKE '%@%' THEN u.authorityemail
          ELSE u.authorityrelationship
        END AS authority_relationship,
        COALESCE(u.role, 2) AS role_id,
        COALESCE(r.name, 'User') AS role_name,
        u.avatar_url
      FROM rsp.users u
      LEFT JOIN rsp.roles r ON r.id = u.role
      ${whereSql}
      ORDER BY LOWER(COALESCE(NULLIF(u.name, ''), u.email)) ASC
      LIMIT $${limitIdx} OFFSET $${offsetIdx}
    `,
      queryParams,
    );

    const users = usersRes.rows.map((row: any) => ({
      id: row.id != null ? String(row.id) : "",
      email: row.email,
      name: row.name || null,
      phone: row.phone || null,
      ashram: row.ashram || null,
      temple: row.temple || null,
      purpose: row.purpose || null,
      authority_name: row.authority_name || null,
      authority_email: row.authority_email || null,
      authority_relationship: row.authority_relationship || null,
      role_id: Number(row.role_id),
      created_at: new Date().toISOString(),
      avatar_url: row.avatar_url || null,
      roles: {
        name: row.role_name,
      },
    }));

    return NextResponse.json({
      users,
      count: totalCount,
      page,
      limit,
    });
  } catch (err: any) {
    console.error("[Admin Users API Error]", err);
    return NextResponse.json(
      { error: err?.message || "Failed to fetch users" },
      { status: 500 },
    );
  }
}
