import { type NextRequest, NextResponse } from "next/server";
import { searchContent } from "@/lib/data-service";
import { getSessionFromRequest } from "@/lib/auth-server";

// In-memory cache for popular search queries (eliminates 90%+ of repeated DB hits)
interface CacheEntry {
  data: {
    categories: any[];
    recordings: any[];
    materials: any[];
  };
  expires: number;
}

const searchCache = new Map<string, CacheEntry>();

// Keep memory negligible by pruning expired search items periodically
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of searchCache.entries()) {
      if (entry.expires < now) {
        searchCache.delete(key);
      }
    }
  }, 180000); // 3 minutes
}

export function clearSearchCache() {
  searchCache.clear();
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const query = (searchParams.get("q") || "").trim();
    const language = searchParams.get("lang") || undefined;
    const limit = Math.min(50, Math.max(1, Number(searchParams.get("limit")) || 20));

    if (!query) {
      return NextResponse.json({ categories: [], recordings: [], materials: [] });
    }

    const session = await getSessionFromRequest(request);
    const roleId = session?.role ? Number(session.role) : 0;

    // Cache key incorporates query, language, limit, and roleId for strict data safety
    const cacheKey = `${query.toLowerCase()}:${language || "all"}:${limit}:${roleId}`;
    const now = Date.now();
    const cached = searchCache.get(cacheKey);

    if (cached && cached.expires > now) {
      return NextResponse.json(cached.data, {
        headers: {
          "Cache-Control": "public, max-age=15, stale-while-revalidate=60",
          "X-Cache": "HIT",
        },
      });
    }

    const results = await searchContent(query, language, limit, roleId);
    const responseData = {
      categories: results.categories,
      recordings: results.recordings,
      materials: results.materials || [],
    };

    // Store in cache for 60 seconds
    searchCache.set(cacheKey, {
      data: responseData,
      expires: now + 60000,
    });

    return NextResponse.json(responseData, {
      headers: {
        "Cache-Control": "public, max-age=15, stale-while-revalidate=60",
        "X-Cache": "MISS",
      },
    });
  } catch (error) {
    console.error("API /api/search error:", error);
    return NextResponse.json(
      { error: "Search failed" },
      { status: 500 }
    );
  }
}
