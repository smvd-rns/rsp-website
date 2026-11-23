import { createBrowserClient } from "@supabase/ssr";
import {
  ADMIN_COOKIE_OPTIONS,
  SUPABASE_PUBLISHABLE_KEY,
  SUPABASE_URL,
} from "@/constants";
import type { Database } from "@/database.types";

let supabaseClient: ReturnType<typeof createBrowserClient<Database>> | null =
  null;

export const createClient = (accessToken?: string) => {
  if (!supabaseClient) {
    supabaseClient = createBrowserClient<Database>(
      SUPABASE_URL,
      SUPABASE_PUBLISHABLE_KEY,
      {
        db: {
          schema: "prod",
        },
        cookieOptions: ADMIN_COOKIE_OPTIONS,
        global: accessToken
          ? { headers: { Authorization: `Bearer ${accessToken}` } }
          : undefined,
      },
    );
  }
  return supabaseClient;
};
