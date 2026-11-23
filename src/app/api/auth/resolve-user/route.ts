import { type NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";

export async function POST(request: NextRequest) {
  try {
    const { identifier } = await request.json();
    if (!identifier || typeof identifier !== "string") {
      return NextResponse.json({ error: "Identifier required" }, { status: 400 });
    }

    const trimmed = identifier.trim();
    if (trimmed.includes("@")) {
      return NextResponse.json({ email: trimmed });
    }

    // Try finding email by username or name in local users table
    const result = await pool.query(
      `SELECT email FROM rsp.users 
       WHERE name ILIKE $1 
          OR email ILIKE $1 || '@%' 
          OR email ILIKE '%' || $1 || '%'
       LIMIT 1`,
      [trimmed]
    );

    if (result.rows.length > 0 && result.rows[0].email) {
      return NextResponse.json({ email: result.rows[0].email });
    }

    // Default fallback
    return NextResponse.json({ email: trimmed });
  } catch (err) {
    console.error("Resolve user error:", err);
    return NextResponse.json({ error: "Failed to resolve user" }, { status: 500 });
  }
}

