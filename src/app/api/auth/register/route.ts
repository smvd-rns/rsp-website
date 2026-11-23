import { type NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";
import {
  hashPassword,
  setSessionCookie,
  signSessionToken,
} from "@/lib/auth-server";

// Rate limiting against automated bot account creation (max 5 accounts per IP per hour)
const registrationsByIp = new Map<string, { count: number; resetAt: number }>();

export async function POST(req: NextRequest) {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "127.0.0.1";

  const now = Date.now();
  const regRecord = registrationsByIp.get(ip) || { count: 0, resetAt: now + 3600 * 1000 };
  if (regRecord.resetAt < now) {
    regRecord.count = 0;
    regRecord.resetAt = now + 3600 * 1000;
  }
  if (regRecord.count >= 5) {
    return NextResponse.json(
      { error: "Too many accounts created from this network. Please try again later." },
      { status: 429 }
    );
  }

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
       VALUES ($1, $2, $3, 2, 'verified', $4)`,
      [nextId, cleanEmail, cleanName, pwdHash]
    );

    regRecord.count += 1;
    registrationsByIp.set(ip, regRecord);

    const token = await signSessionToken({
      userId: String(nextId),
      email: cleanEmail,
      name: cleanName,
      role: 2,
      provider: "credentials",
    });

    const response = NextResponse.json({
      success: true,
      user: {
        id: String(nextId),
        email: cleanEmail,
        name: cleanName,
        role: 2,
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
