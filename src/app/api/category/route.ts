import { type NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/auth-server";
import { getCategoryPageDataFromDb } from "@/lib/data-service";
import { pathToUrlPath } from "@/lib/utils";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const rawPath = searchParams.get("path") || "";
    const cleanPath = rawPath.includes("/") ? pathToUrlPath(rawPath) : rawPath;

    const session = await getSessionFromRequest(request);
    const roleId = session?.role ? Number(session.role) : 0;

    const data = await getCategoryPageDataFromDb(cleanPath, roleId);

    return NextResponse.json(data, {
      headers: {
        "Cache-Control":
          "no-store, no-cache, must-revalidate, proxy-revalidate",
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
