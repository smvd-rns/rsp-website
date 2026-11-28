import { type NextRequest, NextResponse } from "next/server";
import type { Json } from "@/database.types";
import { withApiLogging } from "@/lib/axiom-logger";
import pool from "@/lib/db";
import {
  getSupabaseServerClient,
  handleMutationResult,
} from "@/lib/supabase-server";
import type { QueryAttachment } from "@/types";
import { validateQueryAttachments } from "./query-utils";

interface QueryRequestBody {
  guest_name?: string | null;
  guest_email?: string | null;
  user_id?: string | null;
  category: string;
  subject: string;
  message: string;
  attachments?: QueryAttachment[];
}

// In-memory IP rate limiter: max 5 requests per 5 minutes per IP
interface RateLimitRecord {
  count: number;
  resetAt: number;
}
const rateLimitMap = new Map<string, RateLimitRecord>();

const checkRateLimit = (ip: string, limit = 5, windowMs = 5 * 60 * 1000): boolean => {
  if (!ip || ip === "unknown") return true;
  const now = Date.now();
  const record = rateLimitMap.get(ip);
  if (!record || now > record.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + windowMs });
    if (rateLimitMap.size > 1000) {
      for (const [key, val] of rateLimitMap.entries()) {
        if (now > val.resetAt) rateLimitMap.delete(key);
      }
    }
    return true;
  }
  if (record.count >= limit) {
    return false;
  }
  record.count += 1;
  return true;
};

export const POST = withApiLogging("/api/queries", async (req: NextRequest) => {
  try {
    // 1. IP Rate Limiting (Anti-Spam / Hacker Bot Protection)
    const clientIp =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("x-real-ip") ||
      "unknown";

    if (!checkRateLimit(clientIp, 5, 5 * 60 * 1000)) {
      return NextResponse.json(
        { error: "Too many submissions. Please wait a few minutes before trying again." },
        { status: 429 },
      );
    }

    const body = (await req.json()) as QueryRequestBody;

    if (!body.category || !body.subject || !body.message) {
      return NextResponse.json(
        { error: "Missing required fields (category, subject, message)" },
        { status: 400 },
      );
    }

    // 2. Strict Input Length Caps & Sanitization
    const guestName = (body.guest_name ?? "").trim().slice(0, 100) || null;
    const guestEmail = (body.guest_email ?? "").trim().slice(0, 100) || null;
    const subject = body.subject.trim().slice(0, 200);
    const message = body.message.trim().slice(0, 5000);
    const category = body.category.trim().slice(0, 50);

    if (guestEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(guestEmail)) {
      return NextResponse.json(
        { error: "Please enter a valid email address." },
        { status: 400 },
      );
    }

    const attachmentError = await validateQueryAttachments(
      body.attachments,
      body.user_id,
    );
    if (attachmentError) {
      return attachmentError;
    }

    // Primary: Insert into PostgreSQL (rsp_db) using parameterized SQL ($1, $2...)
    // This completely prevents SQL injection
    try {
      const pgRes = await pool.query(
        `INSERT INTO rsp.user_queries (guest_name, guest_email, user_id, category, subject, message, attachments)
         VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb)
         RETURNING id, guest_name, guest_email, user_id, category, subject, message, status, attachments, created_at, updated_at;`,
        [
          guestName,
          guestEmail,
          body.user_id ?? null,
          category,
          subject,
          message,
          JSON.stringify(body.attachments ?? []),
        ],
      );

      if (pgRes.rows?.[0]) {
        return NextResponse.json({ data: pgRes.rows[0] });
      }
    } catch (pgError) {
      console.warn("[API Queries] Direct PG insertion failed, attempting fallback:", pgError);
    }

    const supabase = getSupabaseServerClient();

    const { data, error } = await supabase
      .from("user_queries")
      .insert({
        guest_name: guestName,
        guest_email: guestEmail,
        user_id: body.user_id ?? null,
        category: category,
        subject: subject,
        message: message,
        attachments: (body.attachments ?? []) as unknown as Json,
      })
      .select()
      .single();

    return handleMutationResult(data, error, "insert user query on server");
  } catch (err: unknown) {
    console.error("Error processing query submit route:", err);
    throw err;
  }
});

interface QueryPatchRequestBody {
  query_id: string;
  status: "open" | "in_progress" | "resolved" | "closed";
  user_id?: string | null;
}

const ALLOWED_STATUSES = new Set(["open", "in_progress", "resolved", "closed"]);

export const PATCH = withApiLogging(
  "/api/queries",
  async (req: NextRequest) => {
    try {
      const body = (await req.json()) as QueryPatchRequestBody;

      if (
        !body.query_id ||
        !body.status ||
        !ALLOWED_STATUSES.has(body.status)
      ) {
        return NextResponse.json(
          { error: "Invalid query_id or status" },
          { status: 400 },
        );
      }

      const supabase = getSupabaseServerClient();
      let query = supabase
        .from("user_queries")
        .update({
          status: body.status,
          updated_at: new Date().toISOString(),
        })
        .eq("id", body.query_id);

      if (body.user_id) {
        query = query.eq("user_id", body.user_id);
      }

      const { data, error } = await query.select().single();

      return handleMutationResult(data, error, "update user query status");
    } catch (err: unknown) {
      console.error("Error updating query status:", err);
      throw err;
    }
  },
);
