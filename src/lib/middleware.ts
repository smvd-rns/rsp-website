import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";
import { ADMIN_COOKIE_OPTIONS, ADMIN_ROLE_ID } from "@/constants";

export const updateSession = async (request: NextRequest) => {
  let supabaseResponse = NextResponse.next({
    request,
  });

  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  ) {
    throw new Error("Missing Supabase environment variables");
  }

  // With Fluid compute, don't put this client in a global environment
  // variable. Always create a new one on each request.
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value);
          });
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) => {
            supabaseResponse.cookies.set(name, value, options);
          });
        },
      },
      cookieOptions: ADMIN_COOKIE_OPTIONS,
    },
  );

  // Do not run code between createServerClient and
  // supabase.auth.getClaims(). A simple mistake could make it very hard to debug
  // issues with users being randomly logged out.

  const { data } = await supabase.auth.getClaims();

  if (
    data?.claims.app_metadata?.role_id !== ADMIN_ROLE_ID &&
    !request.nextUrl.pathname.startsWith("/auth") &&
    !request.nextUrl.pathname.startsWith("/unauthorized")
  ) {
    // no user, respond by redirecting the user to the login page
    const redirectUrl = `${request.nextUrl.pathname}${request.nextUrl.search || ""}`;
    const url = request.nextUrl.clone();
    url.pathname = "/auth/login";
    url.search = "";
    if (redirectUrl && redirectUrl !== "/") {
      url.searchParams.set("redirect_to", redirectUrl);
    }
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
};
