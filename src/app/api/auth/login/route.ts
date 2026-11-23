import { type NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";
import {
  hashPassword,
  setSessionCookie,
  signSessionToken,
  verifyPassword,
} from "@/lib/auth-server";

export async function POST(req: NextRequest) {
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
      return NextResponse.json(
        { error: "User not found with this username or email." },
        { status: 401 }
      );
    }

    const user = result.rows[0];

    // Check password
    if (user.password_hash) {
      const isValid = verifyPassword(password, user.password_hash);
      if (!isValid) {
        return NextResponse.json(
          { error: "Incorrect password. Please try again." },
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
