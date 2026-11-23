import { type NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/auth-server";
import { getCategoryPageDataFromDb } from "@/lib/data-service";
import { pathToUrlPath } from "@/lib/utils";

// Fast in-memory cache for public category views (reduces droplet DB queries by 80%+)
interface CategoryCacheEntry {
  data: any;
  expires: number;
}

const categoryCache = new Map<string, CategoryCacheEntry>();

if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of categoryCache.entries()) {
      if (entry.expires < now) {
        categoryCache.delete(key);
      }
    }
  }, 180000);
}

export function clearCategoryCache() {
  categoryCache.clear();
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const rawPath = searchParams.get("path") || "";
    const cleanPath = rawPath.includes("/") ? pathToUrlPath(rawPath) : rawPath;

    const session = await getSessionFromRequest(request);
    const roleId = session?.role ? Number(session.role) : 0;
    const isAdmin = roleId === 1 || roleId === 8;

    // Admins always bypass cache for real-time live updates
    if (!isAdmin) {
      const cacheKey = `${cleanPath}:${roleId}`;
      const now = Date.now();
      const cached = categoryCache.get(cacheKey);

      if (cached && cached.expires > now) {
        return NextResponse.json(cached.data, {
          headers: {
            "Cache-Control": "public, max-age=15, stale-while-revalidate=60",
            "X-Cache": "HIT",
          },
        });
      }

      const data = await getCategoryPageDataFromDb(cleanPath, roleId);

      categoryCache.set(cacheKey, {
        data,
        expires: now + 45000, // 45 seconds cache for public readers
      });

      return NextResponse.json(data, {
        headers: {
          "Cache-Control": "public, max-age=15, stale-while-revalidate=60",
          "X-Cache": "MISS",
        },
      });
    }

    // Direct live query for Admins
    const data = await getCategoryPageDataFromDb(cleanPath, roleId);
    return NextResponse.json(data, {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
        "X-Cache": "BYPASS",
      },
    });
  } catch (error) {
    console.error("API /api/category error:", error);
    return NextResponse.json(
      { error: "Failed to fetch category" },
      { status: 500 },
    );
  }
}
