import { NextResponse } from "next/server";
import pool from "@/lib/db";

const DEFAULT_ROLES = [
  { id: 1, name: "Administrator" },
  { id: 2, name: "Student" },
  { id: 3, name: "Leader" },
  { id: 4, name: "Brahmacari" },
  { id: 5, name: "BVP" },
  { id: 6, name: "Visitor" },
  { id: 7, name: "aspBrahmacari" },
  { id: 8, name: "Manager" },
];

export async function GET() {
  try {
    const res = await pool.query(
      "SELECT id, name FROM rsp.roles ORDER BY id ASC",
    );
    if (res.rows.length > 0) {
      return NextResponse.json({
        roles: res.rows.map((r: any) => ({
          id: Number(r.id),
          name: r.name,
        })),
      });
    }
    return NextResponse.json({ roles: DEFAULT_ROLES });
  } catch (err: any) {
    console.warn("[Admin Roles API] DB query error, using defaults:", err);
    return NextResponse.json({ roles: DEFAULT_ROLES });
  }
}

