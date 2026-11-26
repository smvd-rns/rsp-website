"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/admin-server";
import { verifyAdmin } from "@/lib/auth-utils";
import { DEFAULT_CALENDAR_URL, getCalendarViewerUrls } from "@/lib/calendar-utils";
import { query } from "@/lib/db";

const CALENDAR_REDIRECT_KEY = "calendar_doc_url";

/**
 * Fetches the current HG RSP Calendar document link from the database.
 * Falls back gracefully to DEFAULT_CALENDAR_URL if not yet configured.
 */
export const getCalendarConfig = async () => {
  try {
    // 1. Try querying via pg pool
    const result = await query(
      "SELECT to_path, updated_at FROM prod.redirects WHERE id = $1 LIMIT 1;",
      [CALENDAR_REDIRECT_KEY],
    );

    if (result.rows?.[0]?.to_path) {
      const url = result.rows[0].to_path as string;
      const urls = getCalendarViewerUrls(url);
      return {
        ...urls,
        updatedAt: result.rows[0].updated_at
          ? new Date(result.rows[0].updated_at).toISOString()
          : null,
      };
    }
  } catch (pgError) {
    // 2. Fallback to Supabase admin client if pg pool is unreachable
    try {
      const adminClient = createAdminClient();
      const { data } = await adminClient
        .from("redirects")
        .select("to_path, updated_at")
        .eq("id", CALENDAR_REDIRECT_KEY)
        .maybeSingle();

      if (data?.to_path) {
        const urls = getCalendarViewerUrls(data.to_path);
        return {
          ...urls,
          updatedAt: data.updated_at || null,
        };
      }
    } catch {
      // Ignore and use default
    }
  }

  // Fallback to default
  const defaultUrls = getCalendarViewerUrls(DEFAULT_CALENDAR_URL);
  return {
    ...defaultUrls,
    updatedAt: null,
  };
};

/**
 * Updates the HG RSP Calendar document link in the database.
 * Requires Admin verification and revalidates all calendar pages.
 */
export const updateCalendarConfig = async (newUrl: string) => {
  await verifyAdmin();

  const trimmed = newUrl?.trim();
  if (!trimmed) {
    throw new Error("Calendar document URL cannot be empty.");
  }

  const { fileId } = getCalendarViewerUrls(trimmed);
  if (!trimmed.startsWith("http://") && !trimmed.startsWith("https://")) {
    throw new Error("Please provide a valid web URL starting with http:// or https://");
  }

  const now = new Date().toISOString();

  // 1. Upsert via pg pool
  try {
    await query(
      `INSERT INTO prod.redirects (id, to_path, updated_at)
       VALUES ($1, $2, NOW())
       ON CONFLICT (id) DO UPDATE
       SET to_path = EXCLUDED.to_path, updated_at = NOW();`,
      [CALENDAR_REDIRECT_KEY, trimmed],
    );
  } catch {
    // 2. Fallback to Supabase admin client
    const adminClient = createAdminClient();
    const { error } = await adminClient.from("redirects").upsert(
      {
        id: CALENDAR_REDIRECT_KEY,
        to_path: trimmed,
        updated_at: now,
      },
      { onConflict: "id" },
    );

    if (error) {
      throw new Error(`Failed to save calendar link: ${error.message}`);
    }
  }

  // Revalidate public and admin calendar views
  revalidatePath("/calendar");
  revalidatePath("/admin/calendar");

  return { success: true, url: trimmed, fileId };
};
