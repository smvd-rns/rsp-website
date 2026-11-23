import { NextResponse } from "next/server";
import { query } from "@/lib/db";

export async function GET() {
  try {
    const res = await query(
      `SELECT id, description, gdrive_id, url
       FROM rsp.images
       ORDER BY id DESC;`,
    );

    const images = res.rows.map(
      (row: {
        id: string | number;
        description?: string;
        gdrive_id?: string;
        url?: string;
      }) => ({
        id: Number(row.id),
        description: row.description || "",
        webp: row.gdrive_id || null,
        url:
          row.url ||
          (row.gdrive_id
            ? `https://lh3.googleusercontent.com/d/${row.gdrive_id}=s1600`
            : null),
      }),
    );

    return NextResponse.json(images);
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Failed to fetch images";
    console.error("[api/images] Error fetching images:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
