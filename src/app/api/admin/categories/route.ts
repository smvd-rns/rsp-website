import { type NextRequest, NextResponse } from "next/server";
import pool, { query } from "@/lib/db";
import { revalidateUrlPaths } from "@/lib/revalidate";
import { syncCategoryFolders } from "@/lib/upload-service";
import { buildCategoryUrlPath } from "@/lib/utils";
import type { Category } from "@/types";

export async function GET() {
  try {
    const res = await pool.query(
      `SELECT id, name, img, image_url, path, orderind, parentid, allowed_roles, url_path, gdriveid, videogdriveid
       FROM rsp.categories
       WHERE url_path != 'trash' AND url_path NOT LIKE 'trash.%'
       ORDER BY orderind ASC NULLS LAST, id ASC;`,
    );

    const categories = res.rows.map((r: Record<string, unknown>) => ({
      id: Number(r.id),
      name: String(r.name || ""),
      img: r.img ? Number(r.img) : null,
      img_id: r.img ? Number(r.img) : null,
      image_url: (r.image_url as string) || null,
      path: String(r.path || ""),
      url_path: String(r.url_path || ""),
      parent_id:
        r.parentid !== null && r.parentid !== undefined
          ? Number(r.parentid)
          : null,
      order_ind: Number(r.orderind ?? 0),
      allowed_roles: Array.isArray(r.allowed_roles)
        ? (r.allowed_roles as (number | string)[]).map(Number)
        : [],
      gdriveid: (r.gdriveid as string) || null,
      videogdriveid: (r.videogdriveid as string) || null,
    }));

    return NextResponse.json(
      { categories },
      {
        headers: {
          "Cache-Control":
            "no-store, no-cache, must-revalidate, proxy-revalidate",
        },
      },
    );
  } catch (err: unknown) {
    console.error("[Admin Categories API] DB query error:", err);
    return NextResponse.json(
      { error: "Failed to fetch categories" },
      { status: 500 },
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, name, parent, roles, imgId } = body as {
      id: number;
      name: string;
      parent?: Category;
      roles?: number[];
      imgId?: number | null;
    };

    if (!id || !name?.trim()) {
      return NextResponse.json(
        { success: false, error: "Category ID and Name are required." },
        { status: 400 },
      );
    }

    const existingRes = await query(
      "SELECT id, name, path, url_path, orderind, parentid, gdriveid, videogdriveid, allowed_roles, img FROM rsp.categories WHERE id = $1 LIMIT 1;",
      [id],
    );
    const existingCategory = existingRes.rows[0];

    if (!existingCategory) {
      return NextResponse.json(
        { success: false, error: "Category not found." },
        { status: 404 },
      );
    }

    const trimmedName = name.trim();
    const cleanImgId =
      imgId !== undefined
        ? imgId
          ? Number(imgId)
          : null
        : existingCategory.img
          ? Number(existingCategory.img)
          : null;
    const allowedRoles = Array.isArray(roles)
      ? roles.map(Number)
      : existingCategory.allowed_roles || [0];

    let newPath = (existingCategory.path as string) || "";
    let parentId = existingCategory.parentid
      ? Number(existingCategory.parentid)
      : null;
    let parentUrlPath = existingCategory.url_path?.includes(".")
      ? existingCategory.url_path.substring(
          0,
          existingCategory.url_path.lastIndexOf("."),
        )
      : undefined;

    if (parent !== undefined) {
      parentId = parent?.id ? Number(parent.id) : null;
      parentUrlPath = parent?.url_path as string;
      newPath = parent
        ? `${parent.path as string}.${parent.id}`.replace(/^\./, "")
        : "";
    }

    const newUrlPath = buildCategoryUrlPath(trimmedName, parentUrlPath);

    // Check unique url_path if changed
    if (existingCategory.url_path !== newUrlPath) {
      const dupRes = await query(
        "SELECT id FROM rsp.categories WHERE url_path = $1 AND id != $2 LIMIT 1;",
        [newUrlPath, id],
      );
      if (dupRes.rows.length > 0) {
        return NextResponse.json(
          {
            success: false,
            error: "A category with this URL path already exists.",
          },
          { status: 400 },
        );
      }
    }

    let orderInd = Number(existingCategory.orderind ?? 0);
    if (existingCategory.path !== newPath) {
      const maxOrderRes = await query(
        "SELECT COALESCE(MAX(orderind), -1) + 1 AS next_order FROM rsp.categories WHERE path = $1;",
        [newPath],
      );
      orderInd = Number(maxOrderRes.rows[0].next_order);
    }

    await query(
      `UPDATE rsp.categories
       SET name = $1, url_path = $2, path = $3, img = $4, allowed_roles = $5, orderind = $6, parentid = $7
       WHERE id = $8;`,
      [
        trimmedName,
        newUrlPath,
        newPath,
        cleanImgId,
        allowedRoles,
        orderInd,
        parentId,
        id,
      ],
    );

    const nameChanged = existingCategory.name !== trimmedName;
    const parentChanged = existingCategory.path !== newPath;

    const oldDescendantUrls: string[] = [];
    const newDescendantUrls: string[] = [];
    if (existingCategory.url_path && (nameChanged || parentChanged)) {
      const descRes = await query(
        "SELECT id, url_path, path FROM rsp.categories WHERE url_path LIKE $1;",
        [`${existingCategory.url_path}.%`],
      );
      const oldPrefix = existingCategory.path
        ? `${existingCategory.path}.${id}`
        : `${id}`;
      const newPrefix = newPath ? `${newPath}.${id}` : `${id}`;

      for (const d of descRes.rows) {
        const oldUrl = d.url_path;
        const newUrl = `${newUrlPath}${oldUrl.slice(existingCategory.url_path.length)}`;
        let updatedChildPath = d.path;
        if (parentChanged) {
          if (d.path === oldPrefix) {
            updatedChildPath = newPrefix;
          } else if (d.path.startsWith(`${oldPrefix}.`)) {
            updatedChildPath = `${newPrefix}${d.path.slice(oldPrefix.length)}`;
          }
        }
        await query(
          "UPDATE rsp.categories SET url_path = $1, path = $2 WHERE id = $3;",
          [newUrl, updatedChildPath, d.id],
        );
        oldDescendantUrls.push(oldUrl);
        newDescendantUrls.push(newUrl);
      }
    }

    // Google Drive sync
    if (nameChanged || parentChanged) {
      try {
        const syncRes = await syncCategoryFolders({
          id,
          parent_id: parent?.id,
          name: trimmedName,
          nameChanged,
          parentChanged,
          existingFolderId: existingCategory.gdriveid,
          existingVideoFolderId: existingCategory.videogdriveid,
        });
        if (syncRes.success && syncRes.metadata?.folderId) {
          await query(
            "UPDATE rsp.categories SET gdriveid = $1, videogdriveid = $2 WHERE id = $3;",
            [syncRes.metadata.folderId, syncRes.metadata.videoFolderId, id],
          );
        }
      } catch (syncErr) {
        console.warn(
          "[Admin Categories API] Google Drive sync warning:",
          syncErr,
        );
      }
    }

    const oldUrlPath = existingCategory.url_path ?? undefined;
    const oldParentUrlPath = oldUrlPath?.includes(".")
      ? oldUrlPath.substring(0, oldUrlPath.lastIndexOf("."))
      : undefined;

    revalidateUrlPaths([
      oldUrlPath,
      oldParentUrlPath,
      newUrlPath,
      parent?.url_path as string,
      ...oldDescendantUrls,
      ...newDescendantUrls,
    ]);

    return NextResponse.json({
      success: true,
      category: {
        id,
        name: trimmedName,
        url_path: newUrlPath,
        path: newPath,
        img: cleanImgId,
        allowed_roles: allowedRoles,
        parent_id: parentId,
      },
    });
  } catch (err: unknown) {
    console.error("[Admin Categories API] Update category error:", err);
    return NextResponse.json(
      {
        success: false,
        error: err instanceof Error ? err.message : "Failed to update category",
      },
      { status: 500 },
    );
  }
}
