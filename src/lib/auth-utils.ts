import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ADMIN_ROLE_ID } from "@/constants";
import { createAdminClient } from "@/lib/admin-server";
import { query } from "@/lib/db";
import { createClient } from "@/lib/server";
import { verifySessionToken } from "./auth-server";

/**
 * Server-side utility to verify that the current user is an admin.
 * Supports self-hosted session tokens, direct PostgreSQL role checks,
 * and standard Supabase mocks during testing.
 */
export const verifyAdmin = async (shouldRedirect = false) => {
  // 1. Check self-hosted session cookie in live runtime first
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("session_token")?.value;
    if (token) {
      const session = await verifySessionToken(token);
      if (session) {
        const isNumeric = /^\d+$/.test(String(session.userId));
        const res = isNumeric
          ? await query(
              "SELECT id, email, name, role FROM rsp.users WHERE id = $1 LIMIT 1;",
              [session.userId],
            )
          : await query(
              "SELECT id, email, name, role FROM rsp.users WHERE LOWER(email) = LOWER($1) LIMIT 1;",
              [session.email],
            );
        const dbUser = res.rows[0];
        const role = Number(dbUser?.role ?? session.role);
        if (role === ADMIN_ROLE_ID || role === 1) {
          return {
            id: String(dbUser?.id ?? session.userId),
            email: dbUser?.email ?? session.email,
            name: dbUser?.name ?? session.name,
            role,
          };
        }
        if (shouldRedirect) redirect("/");
        throw new Error("Unauthorized: Admin role required");
      }
    }
  } catch (e: any) {
    if (
      e?.digest?.startsWith?.("NEXT_REDIRECT") ||
      e.message?.startsWith?.("Unauthorized")
    ) {
      throw e;
    }
  }

  // 2. Check mocked or client auth (used in vitest / mock environments and legacy auth)
  try {
    const supabase = await createClient();
    const { data: userData, error: authError } = await supabase.auth.getUser();

    if (userData?.user && !authError) {
      const metaRoleId = userData.user.app_metadata?.role_id;
      if (metaRoleId === ADMIN_ROLE_ID) {
        return userData.user;
      }

      const adminClient = createAdminClient();
      const { data: userProfile, error: profileError } = await adminClient
        .from("users")
        .select("*")
        .eq("id", userData.user.id)
        .single();

      if (profileError) {
        throw new Error("Service unavailable: could not verify admin role");
      }

      const isAdminRole = userProfile?.role_id === ADMIN_ROLE_ID;
      if (!isAdminRole) {
        if (shouldRedirect) redirect("/unauthorized");
        throw new Error("Unauthorized: Admin role required");
      }

      return userData.user;
    }

    if (authError || !userData?.user) {
      if (shouldRedirect) redirect("/auth/login");
      throw new Error("Unauthorized: Not logged in");
    }
  } catch (e: any) {
    if (
      e?.digest?.startsWith?.("NEXT_REDIRECT") ||
      e.message?.startsWith?.("Unauthorized") ||
      e.message?.startsWith?.("Service unavailable")
    ) {
      throw e;
    }
  }

  if (shouldRedirect) {
    redirect("/");
  }
  throw new Error("Unauthorized: Admin role required");
};

/**
 * Lightweight check for API routes that returns a boolean instead of throwing.
 */
export const isAdmin = async (): Promise<boolean> => {
  try {
    await verifyAdmin();
    return true;
  } catch {
    return false;
  }
};
