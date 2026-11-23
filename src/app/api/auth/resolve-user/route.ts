import { type NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";

export async function POST(request: NextRequest) {
  try {
    const { identifier } = await request.json();
    if (!identifier || typeof identifier !== "string") {
      return NextResponse.json({ error: "Identifier required" }, { status: 400 });
    }

    const trimmed = identifier.trim().toLowerCase();
    if (trimmed.includes("@")) {
      return NextResponse.json({ email: trimmed });
    }

    // Exact username match only to prevent user enumeration
    const result = await pool.query(
      `SELECT email FROM rsp.users 
       WHERE LOWER(name) = $1 
       LIMIT 1`,
      [trimmed]
    );

    if (result.rows.length > 0 && result.rows[0].email) {
      return NextResponse.json({ email: result.rows[0].email });
    }

    return NextResponse.json({ error: "User not found" }, { status: 404 });
  } catch (err) {
    console.error("Resolve user error:", err);
    return NextResponse.json({ error: "Failed to resolve user" }, { status: 500 });
  }
}
