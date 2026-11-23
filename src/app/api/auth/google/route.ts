import { type NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";
import { setSessionCookie, signSessionToken } from "@/lib/auth-server";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const code = searchParams.get("code");
    const nextPath = searchParams.get("state") || "/";

    const fallbackHost =
      req.headers.get("x-forwarded-host") || req.headers.get("host");
    let fallbackProto = req.headers.get("x-forwarded-proto") || "http";
    if (
      fallbackHost &&
      !fallbackHost.includes("localhost") &&
      !fallbackHost.includes("127.0.0.1")
    ) {
      fallbackProto = "https";
    }
    let origin = fallbackHost
      ? `${fallbackProto}://${fallbackHost}`
      : req.nextUrl.origin;
    if (origin.includes("127.0.0.1")) {
      origin = origin.replace("127.0.0.1", "localhost");
    }

    if (!code) {
      const googleError = searchParams.get("error");
      const errParam = googleError
        ? `?error=oauth_error&details=${encodeURIComponent(googleError)}`
        : "?error=no_code";
      return NextResponse.redirect(new URL(errParam, origin));
    }

    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const redirectUri = `${origin}/api/auth/google`;

    // 1. Exchange OAuth code for tokens
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: clientId || "",
        client_secret: clientSecret || "",
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });

    if (!tokenRes.ok) {
      const errText = await tokenRes.text();
      console.error("[Google OAuth Token Error]", errText);
      const encodedErr = encodeURIComponent(errText.substring(0, 100));
      return NextResponse.redirect(
        new URL(`/?auth_error=token_exchange_failed&details=${encodedErr}`, origin)
      );
    }

    const tokens = await tokenRes.json();
    const accessToken = tokens.access_token;

    // 2. Fetch User profile from Google
    const userRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!userRes.ok) {
      return NextResponse.redirect(
        new URL("/?auth_error=profile_fetch_failed", origin)
      );
    }

    const googleUser = await userRes.json();
    const email = googleUser.email?.toLowerCase()?.trim();
    const name = googleUser.name || email?.split("@")[0] || "Devotee";
    const profileImage = googleUser.picture || null;

    if (!email) {
      return NextResponse.redirect(new URL("/?auth_error=no_email", origin));
    }

    // 3. Find or Create User in local PostgreSQL (rsp.users)
    let userResDb = await pool.query(
      `SELECT * FROM rsp.users WHERE LOWER(email) = LOWER($1) LIMIT 1`,
      [email]
    );

    let user;
    if (userResDb.rows.length === 0) {
      const idRes = await pool.query(
        `SELECT COALESCE(MAX(id), 0) + 1 AS next_id FROM rsp.users`
      );
      const nextId = Number(idRes.rows[0].next_id);

      await pool.query(
        `INSERT INTO rsp.users (id, email, name, role, status, avatar_url)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [nextId, email, name, 1, "verified", profileImage]
      );

      userResDb = await pool.query(
        `SELECT * FROM rsp.users WHERE id = $1`,
        [nextId]
      );
    } else if (profileImage && !userResDb.rows[0].avatar_url) {
      // Update avatar if missing
      await pool.query(
        `UPDATE rsp.users SET avatar_url = $1 WHERE id = $2`,
        [profileImage, userResDb.rows[0].id]
      );
    }

    user = userResDb.rows[0];

    // 4. Create Session JWT
    const sessionToken = await signSessionToken({
      userId: String(user.id),
      email: user.email,
      name: user.name,
      role: Number(user.role || 1),
      avatarUrl: user.avatar_url || profileImage,
      provider: "google",
    });

    // 5. Set Cookie and Redirect back to origin destination
    const targetPath = nextPath && nextPath.startsWith("/") ? nextPath : "/";
    const response = NextResponse.redirect(new URL(targetPath, origin));
    setSessionCookie(response, sessionToken);

    return response;
  } catch (error: any) {
    console.error("[Google OAuth Callback Exception]", error);
    const details = encodeURIComponent(error?.message || "Unknown server exception");
    return NextResponse.redirect(new URL(`/?auth_error=${details}`, req.nextUrl.origin));
  }
}
