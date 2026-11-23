import { NextResponse, type NextRequest } from "next/server";
import { jwtVerify } from "jose";

const JWT_SECRET_STRING =
  process.env.JWT_SECRET || "dev_jwt_secret_change_in_production";
const secretKey = new TextEncoder().encode(JWT_SECRET_STRING);
const COOKIE_NAME = "session_token";

interface AuthSessionUser {
  userId: string;
  email: string;
  name: string;
  role: number;
}

async function verifyToken(token: string): Promise<AuthSessionUser | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey);
    return {
      userId: String(payload.userId || payload.sub),
      email: String(payload.email || ""),
      name: String(payload.name || ""),
      role: Number(payload.role || 1),
    };
  } catch {
    return null;
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Protect Admin Pages & Admin API Endpoints (/admin/*, /api/admin/*)
  const isAdminPath = pathname.startsWith("/admin");
  const isAdminApi = pathname.startsWith("/api/admin");

  if (isAdminPath || isAdminApi) {
    const token = request.cookies.get(COOKIE_NAME)?.value;
    const session = token ? await verifyToken(token) : null;
    const role = Number(session?.role || 0);
    const hasAdminAccess = Boolean(session && (role === 1 || role === 8)); // 1: Administrator, 8: Manager

    if (!hasAdminAccess) {
      if (isAdminApi) {
        return NextResponse.json(
          { error: "Forbidden: Admin privileges required" },
          { status: 403 },
        );
      }
      // Redirect unauthorized user or intruder back to homepage
      const url = request.nextUrl.clone();
      url.pathname = "/";
      url.search = "";
      return NextResponse.redirect(url);
    }
  }

  // 2. Protect Authenticated User Pages (/profile, /settings, /queries)
  const isUserProtectedPath =
    pathname.startsWith("/profile") ||
    pathname.startsWith("/settings") ||
    pathname.startsWith("/queries");

  if (isUserProtectedPath) {
    const token = request.cookies.get(COOKIE_NAME)?.value;
    const session = token ? await verifyToken(token) : null;

    if (!session) {
      const url = request.nextUrl.clone();
      url.pathname = "/";
      url.search = "";
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/admin/:path*",
    "/api/admin/:path*",
    "/profile/:path*",
    "/settings/:path*",
    "/queries/:path*",
  ],
};
