import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/database.types";

/**
 * Note: This client uses the service role key and bypasses RLS.
 * ONLY use this in secure server-side contexts (API routes, Server Actions)
 * AFTER verifying the user is an admin or in system services.
 */
export const createAdminClient = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secretKey = process.env.SUPABASE_SECRET_KEY;

  if (!supabaseUrl || !secretKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY in server environment",
    );
  }

  return createClient<Database>(supabaseUrl, secretKey, {
    db: {
      schema: "prod",
    },
  });
};
