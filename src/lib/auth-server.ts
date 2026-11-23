import crypto from "node:crypto";
import { type NextRequest, NextResponse } from "next/server";
import { SignJWT, jwtVerify } from "jose";

const JWT_SECRET_STRING =
  process.env.JWT_SECRET || "dev_jwt_secret_change_in_production";
const secretKey = new TextEncoder().encode(JWT_SECRET_STRING);

export const COOKIE_NAME = "session_token";

export interface AuthSessionUser {
  userId: string;
  email: string;
  name: string;
  role: number;
  avatarUrl?: string | null;
  provider?: "google" | "credentials";
}

/**
 * Sign JWT session token valid for 7 days
 */
export async function signSessionToken(payload: AuthSessionUser): Promise<string> {
  return new SignJWT({
    userId: payload.userId,
    email: payload.email,
    name: payload.name,
    role: payload.role,
    avatarUrl: payload.avatarUrl || null,
    provider: payload.provider || "credentials",
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secretKey);
}

/**
 * Verify JWT session token
 */
export async function verifySessionToken(token: string): Promise<AuthSessionUser | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey);
    return {
      userId: String(payload.userId || payload.sub),
      email: String(payload.email || ""),
      name: String(payload.name || ""),
      role: Number(payload.role || 1),
      avatarUrl: (payload.avatarUrl as string) || null,
      provider: (payload.provider as any) || "credentials",
    };
  } catch {
    return null;
  }
}

/**
 * Attach HTTP-only session cookie to response
 */
export function setSessionCookie(response: NextResponse, token: string) {
  response.cookies.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: "/",
  });
}

/**
 * Expire session cookie
 */
export function clearSessionCookie(response: NextResponse) {
  response.cookies.set(COOKIE_NAME, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 0,
    path: "/",
  });
}

/**
 * Read session from NextRequest cookies
 */
export async function getSessionFromRequest(
  req: NextRequest
): Promise<AuthSessionUser | null> {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifySessionToken(token);
}

/**
 * Hash password securely with salt using Node.js crypto.scryptSync
 */
export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto
    .scryptSync(password, salt, 64)
    .toString("hex");
  return `${salt}:${hash}`;
}

/**
 * Verify password against stored hash
 */
export function verifyPassword(password: string, storedHash?: string | null): boolean {
  if (!storedHash || !storedHash.includes(":")) return false;
  const [salt, key] = storedHash.split(":");
  const keyBuffer = Buffer.from(key, "hex");
  const derivedKey = crypto.scryptSync(password, salt, 64);
  return crypto.timingSafeEqual(keyBuffer, derivedKey);
}

