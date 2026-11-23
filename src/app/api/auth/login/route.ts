import { type NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";
import {
  hashPassword,
  setSessionCookie,
  signSessionToken,
  verifyPassword,
} from "@/lib/auth-server";

// In-memory rate limiting against brute force password attacks
const loginAttempts = new Map<string, { count: number; lockedUntil: number }>();

function checkRateLimit(ip: string): { allowed: boolean; remainingSeconds?: number } {
  const record = loginAttempts.get(ip);
  if (!record) return { allowed: true };
  if (record.lockedUntil > Date.now()) {
    const remainingSeconds = Math.ceil((record.lockedUntil - Date.now()) / 1000);
    return { allowed: false, remainingSeconds };
  }
  return { allowed: true };
}

function recordFailedAttempt(ip: string) {
  const now = Date.now();
  const record = loginAttempts.get(ip) || { count: 0, lockedUntil: 0 };
  record.count += 1;
  // If 5 or more failures in succession, lock IP out for 5 minutes
  if (record.count >= 5) {
    record.lockedUntil = now + 5 * 60 * 1000;
  }
  loginAttempts.set(ip, record);
}

function clearAttempts(ip: string) {
  loginAttempts.delete(ip);
}

export async function POST(req: NextRequest) {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "127.0.0.1";

  const rateLimit = checkRateLimit(ip);
  if (!rateLimit.allowed) {
    return NextResponse.json(
      {
        error: `Too many failed login attempts. Please wait ${rateLimit.remainingSeconds} seconds before trying again.`,
      },
      { status: 429 }
    );
  }

  try {
    const body = await req.json();
    const { identifier, password } = body;

    if (!identifier || !password) {
      return NextResponse.json(
        { error: "Username/Email and Password are required." },
        { status: 400 }
      );
    }

    const trimmed = String(identifier).trim().toLowerCase();

    // Find user by email or name
    const result = await pool.query(
      `SELECT * FROM rsp.users WHERE LOWER(email) = $1 OR LOWER(name) = $1 LIMIT 1`,
      [trimmed]
    );

    if (result.rows.length === 0) {
      recordFailedAttempt(ip);
      return NextResponse.json(
        { error: "Invalid username/email or password." },
        { status: 401 }
      );
    }

    const user = result.rows[0];

    // Check password
    if (user.password_hash) {
      const isValid = verifyPassword(password, user.password_hash);
      if (!isValid) {
        recordFailedAttempt(ip);
        return NextResponse.json(
          { error: "Invalid username/email or password." },
          { status: 401 }
        );
      }
    } else {
      // First-time password set for existing legacy user
      const newHash = hashPassword(password);
      await pool.query(
        `UPDATE rsp.users SET password_hash = $1 WHERE id = $2`,
        [newHash, user.id]
      );
    }

    // Login successful: clear any failure counter for this IP
    clearAttempts(ip);

    // Sign session token
    const token = await signSessionToken({
      userId: String(user.id),
      email: user.email,
      name: user.name,
      role: Number(user.role || 1),
      avatarUrl: user.avatar_url || null,
      provider: "credentials",
    });

    const response = NextResponse.json({
      success: true,
      user: {
        id: String(user.id),
        email: user.email,
        name: user.name,
        role: Number(user.role || 1),
      },
    });

    setSessionCookie(response, token);
    return response;
  } catch (error: any) {
    console.error("[Login API Error]", error);
    return NextResponse.json(
      { error: error?.message || "Internal server error" },
      { status: 500 }
    );
  }
}
