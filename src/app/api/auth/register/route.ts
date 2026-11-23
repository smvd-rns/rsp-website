import { type NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";
import {
  hashPassword,
  setSessionCookie,
  signSessionToken,
} from "@/lib/auth-server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required." },
        { status: 400 }
      );
    }

    const cleanEmail = String(email).trim().toLowerCase();
    const cleanName = String(name || cleanEmail.split("@")[0]).trim();

    if (password.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters." },
        { status: 400 }
      );
    }

    // Check if user already exists
    const existing = await pool.query(
      `SELECT id FROM rsp.users WHERE LOWER(email) = $1 LIMIT 1`,
      [cleanEmail]
    );

    if (existing.rows.length > 0) {
      return NextResponse.json(
        { error: "An account with this email already exists. Please sign in." },
        { status: 409 }
      );
    }

    const idRes = await pool.query(
      `SELECT COALESCE(MAX(id), 0) + 1 AS next_id FROM rsp.users`
    );
    const nextId = Number(idRes.rows[0].next_id);
    const pwdHash = hashPassword(password);

    await pool.query(
      `INSERT INTO rsp.users (id, email, name, role, status, password_hash)
       VALUES ($1, $2, $3, 1, 'verified', $4)`,
      [nextId, cleanEmail, cleanName, pwdHash]
    );

    const token = await signSessionToken({
      userId: String(nextId),
      email: cleanEmail,
      name: cleanName,
      role: 1,
      provider: "credentials",
    });

    const response = NextResponse.json({
      success: true,
      user: {
        id: String(nextId),
        email: cleanEmail,
        name: cleanName,
        role: 1,
      },
    });

    setSessionCookie(response, token);
    return response;
  } catch (error: any) {
    console.error("[Register API Error]", error);
    return NextResponse.json(
      { error: error?.message || "Registration failed" },
      { status: 500 }
    );
  }
}
