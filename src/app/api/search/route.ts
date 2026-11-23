import { type NextRequest, NextResponse } from "next/server";
import { searchContent } from "@/lib/data-service";
import { getSessionFromRequest } from "@/lib/auth-server";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get("q") || "";
    const language = searchParams.get("lang") || undefined;
    const limit = Number(searchParams.get("limit")) || 20;

    if (!query.trim()) {
      return NextResponse.json({ categories: [], recordings: [], materials: [] });
    }

    const session = await getSessionFromRequest(request);
    const roleId = session?.role ? Number(session.role) : 0;

    const results = await searchContent(query, language, limit, roleId);

    return NextResponse.json({
      categories: results.categories,
      recordings: results.recordings,
      materials: results.materials || [],
    });
  } catch (error) {
    console.error("API /api/search error:", error);
    return NextResponse.json(
      { error: "Search failed" },
      { status: 500 }
    );
  }
}

