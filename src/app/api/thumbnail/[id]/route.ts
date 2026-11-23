import { type NextRequest, NextResponse } from "next/server";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  if (!id || !/^[\w-]{6,15}$/.test(id)) {
    return new NextResponse("Invalid ID", { status: 400 });
  }

  const urls = [
    `https://i.ytimg.com/vi/${id}/mqdefault.jpg`,
    `https://img.youtube.com/vi/${id}/mqdefault.jpg`,
    `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
  ];

  for (const url of urls) {
    try {
      const response = await fetch(url, {
        next: { revalidate: 604800 }, // Cache 7 days
      });

      if (response.ok) {
        const imageBuffer = await response.arrayBuffer();
        return new NextResponse(imageBuffer, {
          headers: {
            "Content-Type": response.headers.get("Content-Type") || "image/jpeg",
            "Cache-Control": "public, max-age=604800, stale-while-revalidate=86400",
          },
        });
      }
    } catch {
      // Try next url
    }
  }

  return NextResponse.redirect(new URL("/rsp.webp", _request.url), 302);
}

