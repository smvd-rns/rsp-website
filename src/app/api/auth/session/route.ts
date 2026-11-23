import { type NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";
import { getSessionFromRequest } from "@/lib/auth-server";

export async function GET(req: NextRequest) {
  try {
    const session = await getSessionFromRequest(req);
    if (!session) {
      return NextResponse.json({ session: null });
    }

    // Refresh role & user info from database
    const dbRes = await pool.query(
      `SELECT id, email, name, role, status, avatar_url FROM rsp.users WHERE id = $1 LIMIT 1`,
      [session.userId]
    );

    const user = dbRes.rows[0] || session;

    return NextResponse.json({
      session: {
        user: {
          id: String(user.id || session.userId),
          email: user.email || session.email,
          user_metadata: {
            name: user.name || session.name,
            role: Number(user.role || session.role || 1),
            avatar_url: user.avatar_url || session.avatarUrl,
          },
          app_metadata: {
            role_id: Number(user.role || session.role || 1),
          },
        },
      },
    });
  } catch (error) {
    console.error("[Session API Error]", error);
    return NextResponse.json({ session: null });
  }
}
