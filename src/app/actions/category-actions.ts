"use server";

import { verifyAdmin } from "@/lib/auth-utils";
import { query } from "@/lib/db";
import { revalidateCategoryPaths, revalidateUrlPaths } from "@/lib/revalidate";
import { syncCategoryFolders, untrashCategory } from "@/lib/upload-service";
import { buildCategoryUrlPath, pathToUrlPath } from "@/lib/utils";
import type { Category } from "@/types";

const formatCategoryRow = (row: Record<string, unknown>): Category => {
  const r = row as Record<string, unknown>;
  return {
    ...r,
    id: Number(r["id"]),
    img: r["img"] ? Number(r["img"]) : null,
    img_id: r["img"] ? Number(r["img"]) : null,
    parent_id: r["parentid"]
      ? Number(r["parentid"])
      : r["parent_id"]
        ? Number(r["parent_id"])
        : null,
    order_ind: Number(r["orderind"] ?? r["order_ind"] ?? 0),
    allowed_roles: Array.isArray(r["allowed_roles"])
      ? (r["allowed_roles"] as (number | string)[]).map(Number)
      : [],
    path: String(r["path"] || ""),
    url_path: String(r["url_path"] || ""),
  } as Category;
};

export const createCategory = async (data: {
  name: string;
  parent?: Category;
  roles: number[];
  imgId: number;
}) => {
  await verifyAdmin();
  const url_path = buildCategoryUrlPath(data.name, data.parent?.url_path);
  const path = data.parent
    ? `${data.parent.path as string}.${data.parent.id}`.replace(/^\./, "")
    : "";
  const parentId = data.parent?.id ? Number(data.parent.id) : null;

  // Check unique url_path
  const existingRes = await query(
    "SELECT id FROM rsp.categories WHERE url_path = $1 LIMIT 1;",
    [url_path],
  );
  if (existingRes.rows.length > 0) {
    return {
      success: false,
      error: "A category with this URL path already exists.",
    };
  }

  // Calculate orderind
  const maxOrderRes = await query(
    "SELECT COALESCE(MAX(orderind), -1) + 1 AS next_order FROM rsp.categories WHERE path = $1;",
    [path],
  );
  const newOrderInd = Number(maxOrderRes.rows[0].next_order);

  // Generate next id
  const nextIdRes = await query(
    "SELECT COALESCE(MAX(id), 0) + 1 AS next_id FROM rsp.categories;",
  );
  const newId = Number(nextIdRes.rows[0].next_id);

  // Insert into rsp.categories
  const insertRes = await query(
    `INSERT INTO rsp.categories (
       id, name, url_path, path, img, allowed_roles, orderind, parentid
     ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING *;`,
    [
      newId,
      data.name,
      url_path,
      path,
      data.imgId,
      data.roles,
      newOrderInd,
      parentId,
    ],
  );

  const category = formatCategoryRow(insertRes.rows[0]);

  try {
    const syncRes = await syncCategoryFolders({
      id: category.id,
      parent_id: parentId || undefined,
      name: data.name,
    });
    if (syncRes.success && syncRes.metadata) {
      await query(
        "UPDATE rsp.categories SET gdriveid = $1, videogdriveid = $2 WHERE id = $3;",
        [
          syncRes.metadata.folderId,
          syncRes.metadata.videoFolderId,
          category.id,
        ],
      );
      category.gdriveid = syncRes.metadata.folderId;
      category.videogdriveid = syncRes.metadata.videoFolderId;
    }
  } catch (err) {
    console.error("Failed to sync category folders:", err);
  }

  revalidateUrlPaths([url_path, data.parent?.url_path]);
  return { success: true, category };
};

export const updateCategory = async (
  id: number,
  data: {
    name: string;
    parent?: Category;
    roles: number[];
    imgId?: number | null;
  },
) => {
  await verifyAdmin();
  const imgId: number | null = data.imgId || null;
  const newUrlPath = buildCategoryUrlPath(data.name, data.parent?.url_path);
  const newPath = data.parent
    ? `${data.parent.path as string}.${data.parent.id}`.replace(/^\./, "")
    : "";
  const parentId = data.parent?.id ? Number(data.parent.id) : null;

  const existingRes = await query(
    "SELECT id, name, path, url_path, orderind, gdriveid, videogdriveid FROM rsp.categories WHERE id = $1 LIMIT 1;",
    [id],
  );
  const existingCategory = existingRes.rows[0];

  if (!existingCategory) {
    return { success: false, error: "Category not found." };
  }

  // Check unique url_path if changed
  if (existingCategory.url_path !== newUrlPath) {
    const dupRes = await query(
      "SELECT id FROM rsp.categories WHERE url_path = $1 AND id != $2 LIMIT 1;",
      [newUrlPath, id],
    );
    if (dupRes.rows.length > 0) {
      return {
        success: false,
        error: "A category with this URL path already exists.",
      };
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
    [data.name, newUrlPath, newPath, imgId, data.roles, orderInd, parentId, id],
  );

  const nameChanged = existingCategory.name !== data.name;
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

  if (nameChanged || parentChanged) {
    try {
      const syncRes = await syncCategoryFolders({
        id,
        parent_id: data.parent?.id,
        name: data.name,
        nameChanged: nameChanged ?? true,
        parentChanged: parentChanged ?? true,
        existingFolderId: existingCategory.gdriveid,
        existingVideoFolderId: existingCategory.videogdriveid,
      });
      if (syncRes.success && syncRes.metadata?.folderId) {
        await query(
          "UPDATE rsp.categories SET gdriveid = $1, videogdriveid = $2 WHERE id = $3;",
          [syncRes.metadata.folderId, syncRes.metadata.videoFolderId, id],
        );
      }
    } catch (err) {
      console.error("Failed to sync category folders:", err);
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
    data.parent?.url_path,
    ...oldDescendantUrls,
    ...newDescendantUrls,
  ]);
  return { success: true };
};

const getCategoryAndParentPaths = (urlPath: string): string[] => {
  const parentUrlPath = urlPath.includes(".")
    ? urlPath.substring(0, urlPath.lastIndexOf("."))
    : undefined;
  return parentUrlPath ? [urlPath, parentUrlPath] : [urlPath];
};

const revalidateCategoryAndParent = (urlPath?: string | null) => {
  if (!urlPath) return;
  revalidateUrlPaths(getCategoryAndParentPaths(urlPath));
};

export const revalidateCategoryAction = async (urlPath?: string | null) => {
  await verifyAdmin();
  if (urlPath) {
    await revalidateCategoryPaths(getCategoryAndParentPaths(urlPath));
  }
  return { success: true };
};

export const deleteCategoryWithContents = async (
  id: number,
  options: { permanent?: boolean } = {},
) => {
  await verifyAdmin();

  if (id === 1) {
    throw new Error("Root trash category cannot be deleted.");
  }

  // 1. Fetch category
  const res = await query(
    "SELECT id, name, path, url_path, gdriveid, videogdriveid FROM rsp.categories WHERE id = $1 LIMIT 1;",
    [id],
  );
  const category = res.rows[0];
  if (!category) {
    return { success: false, error: "Category not found." };
  }

  // 2. Fetch all descendant categories
  const descRes = await query(
    "SELECT id, name, path, url_path, gdriveid, videogdriveid FROM rsp.categories WHERE url_path = $1 OR url_path LIKE $2;",
    [category.url_path, `${category.url_path}.%`],
  );
  const allCategoryIds = descRes.rows.map((r) => Number(r.id));

  // 3. Fetch all recordings in these categories
  const recRes = await query(
    "SELECT id, name, gdriveid, videogdriveid FROM rsp.recordings WHERE parentid = ANY($1::bigint[]);",
    [allCategoryIds],
  );
  const allRecordingIds = recRes.rows.map((r) => Number(r.id));

  if (options.permanent) {
    // Permanent Deletion: delete recordings, materials, metadata, categories
    if (allRecordingIds.length > 0) {
      await query(
        "DELETE FROM rsp.materials WHERE recording_id = ANY($1::bigint[]);",
        [allRecordingIds],
      );
      await query("DELETE FROM rsp.rec_meta WHERE id = ANY($1::bigint[]);", [
        allRecordingIds,
      ]);
      await query("DELETE FROM rsp.recordings WHERE id = ANY($1::bigint[]);", [
        allRecordingIds,
      ]);
    }

    await query("DELETE FROM rsp.cat_meta WHERE id = ANY($1::bigint[]);", [
      allCategoryIds,
    ]);
    await query("DELETE FROM rsp.categories WHERE id = ANY($1::bigint[]);", [
      allCategoryIds,
    ]);

    try {
      const { deleteCategoryPermanently } = await import(
        "@/lib/upload-service"
      );
      await deleteCategoryPermanently(id);
    } catch (gdriveErr) {
      console.warn(
        "Failed to permanently delete category Google Drive folders:",
        gdriveErr,
      );
    }
  } else {
    // Soft Delete (Move to Trash)
    const trashRes = await query(
      "SELECT id FROM rsp.categories WHERE url_path = 'trash' LIMIT 1;",
    );
    const trashId = trashRes.rows[0]?.id ? Number(trashRes.rows[0].id) : 1;

    const trashUrlPath = `trash.${category.url_path.replace(/\./g, "-")}`;
    await query(
      "UPDATE rsp.categories SET parentid = $1, path = $2, url_path = $3 WHERE id = $4;",
      [trashId, String(trashId), trashUrlPath, id],
    );

    for (const d of descRes.rows) {
      if (Number(d.id) !== id) {
        const subTrashUrl = `trash.${d.url_path.replace(/\./g, "-")}`;
        await query("UPDATE rsp.categories SET url_path = $1 WHERE id = $2;", [
          subTrashUrl,
          d.id,
        ]);
      }
    }

    try {
      const { trashCategory } = await import("@/lib/upload-service");
      await trashCategory(id);
    } catch (gdriveErr) {
      console.warn("Failed to trash Google Drive category folders:", gdriveErr);
    }
  }

  revalidateCategoryAndParent(category.url_path as string);
  return {
    success: true,
    deletedCategoriesCount: allCategoryIds.length,
    deletedRecordingsCount: allRecordingIds.length,
  };
};

export const softDeleteCategory = async (id: number) => {
  return deleteCategoryWithContents(id, { permanent: false });
};

export const restoreCategory = async (id: number) => {
  await verifyAdmin();
  await untrashCategory(id);

  const res = await query(
    "SELECT url_path FROM rsp.categories WHERE id = $1 LIMIT 1;",
    [id],
  );
  const category = res.rows[0];

  if (category?.url_path) {
    revalidateCategoryAndParent(category.url_path as string);
  }
};

export const reorderCategories = async (
  items: { id: number; order_ind: number }[],
) => {
  await verifyAdmin();
  for (const item of items) {
    await query("UPDATE rsp.categories SET orderind = $1 WHERE id = $2;", [
      item.order_ind,
      item.id,
    ]);
  }

  if (items.length > 0) {
    const ids = items.map((item) => item.id);
    const res = await query(
      "SELECT url_path FROM rsp.categories WHERE id = ANY($1::bigint[]);",
      [ids],
    );

    const pathsToRevalidate: string[] = [];
    for (const cat of res.rows) {
      if (cat.url_path) {
        pathsToRevalidate.push(
          ...getCategoryAndParentPaths(cat.url_path as string),
        );
      }
    }
    revalidateCategoryPaths(pathsToRevalidate);
  }
};

export const getCategoryByPath = async (urlPath: string) => {
  await verifyAdmin();
  const res = await query(
    "SELECT * FROM rsp.categories WHERE url_path = $1 LIMIT 1;",
    [pathToUrlPath(urlPath)],
  );
  if (res.rows.length === 0) return null;
  return formatCategoryRow(res.rows[0]);
};

export const getAllCategoriesForAdmin = async (): Promise<Category[]> => {
  await verifyAdmin();
  const res = await query(
    `SELECT id, name, img, image_url, path, orderind, parentid, allowed_roles, url_path, gdriveid, videogdriveid
     FROM rsp.categories
     WHERE url_path != 'trash' AND url_path NOT LIKE 'trash.%'
     ORDER BY orderind ASC NULLS LAST, id ASC;`,
  );
  return res.rows.map(formatCategoryRow);
};
