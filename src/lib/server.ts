import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { ADMIN_COOKIE_OPTIONS } from "@/constants";
import type { Database } from "@/database.types";

/**
 * If using Fluid compute: Don't put this client in a global variable. Always create a new client within each
 * function when using it.
 */
export const createClient = async () => {
  const cookieStore = await cookies();

  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  ) {
    throw new Error("Missing Supabase URL or Publishable Key");
  }
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
      cookieOptions: ADMIN_COOKIE_OPTIONS,
      db: {
        schema: "prod",
      },
    },
  );
};
