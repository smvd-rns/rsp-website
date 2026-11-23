"use server";

import type { Json } from "@/database.types";
import { createAdminClient } from "@/lib/admin-server";
import { verifyAdmin } from "@/lib/auth-utils";
import { executeParallelReorder } from "@/lib/reorder-utils";
import { revalidateCategoryPaths } from "@/lib/revalidate";

// ------------------------------------------------------------------
// FEATURED SECTIONS
// ------------------------------------------------------------------

export const createFeaturedSection = async (data: {
  title: string;
  layout: "carousel" | "grid" | "list";
  order_ind?: number;
  is_active?: boolean;
  allowed_roles?: number[];
}) => {
  await verifyAdmin();
  const adminClient = createAdminClient();

  const { error } = await adminClient.from("featured_sections").insert({
    title: data.title,
    layout: data.layout,
    order_ind: data.order_ind || 0,
    is_active: data.is_active !== undefined ? data.is_active : true,
    allowed_roles: data.allowed_roles ?? [],
  });

  if (error) {
    console.error("Error creating featured section:", error);
    return { success: false, error: error.message };
  }

  revalidateCategoryPaths(["/"]);
  return { success: true };
};

export const updateFeaturedSection = async (
  id: number,
  data: {
    title: string;
    layout: "carousel" | "grid" | "list";
    order_ind?: number;
    is_active?: boolean;
    allowed_roles?: number[];
  },
) => {
  await verifyAdmin();
  const adminClient = createAdminClient();

  const { error } = await adminClient
    .from("featured_sections")
    .update({
      title: data.title,
      layout: data.layout,
      order_ind: data.order_ind !== undefined ? data.order_ind : 0,
      is_active: data.is_active !== undefined ? data.is_active : true,
      ...(data.allowed_roles !== undefined
        ? { allowed_roles: data.allowed_roles }
        : {}),
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) {
    console.error("Error updating featured section:", error);
    return { success: false, error: error.message };
  }

  revalidateCategoryPaths(["/"]);
  return { success: true };
};

export const deleteFeaturedSection = async (id: number) => {
  await verifyAdmin();
  const adminClient = createAdminClient();

  const { error } = await adminClient
    .from("featured_sections")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("Error deleting featured section:", error);
    return { success: false, error: error.message };
  }

  const now = new Date().toISOString();
  await adminClient.from("sync_meta").upsert([
    { id: "featured_sections", updated_at: now },
    { id: "deleted_records", updated_at: now },
  ]);

  revalidateCategoryPaths(["/"]);
  return { success: true };
};

export const reorderFeaturedSections = async (
  items: { id: number; order_ind: number }[],
) => {
  await verifyAdmin();
  const adminClient = createAdminClient();
  const res = await executeParallelReorder(
    adminClient,
    "featured_sections",
    items,
  );
  if (!res.success) {
    console.error("Error reordering featured sections:", res.error);
  } else {
    revalidateCategoryPaths(["/"]);
  }
  return res;
};

// ------------------------------------------------------------------
// FEATURED ITEMS
// ------------------------------------------------------------------

export const createFeaturedItem = async (data: {
  section_id: number;
  entity_type: "category" | "recording";
  entity_id: number;
  order_ind?: number;
  allowed_roles?: number[];
}) => {
  await verifyAdmin();
  const adminClient = createAdminClient();

  const { data: inserted, error } = await adminClient
    .from("featured_items")
    .insert({
      section_id: data.section_id,
      entity_type: data.entity_type,
      entity_id: data.entity_id,
      order_ind: data.order_ind || 0,
      allowed_roles: data.allowed_roles ?? [],
    })
    .select("id")
    .single();

  if (error) {
    console.error("Error creating featured item:", error);
    return { success: false, error: error.message };
  }

  revalidateCategoryPaths(["/"]);
  return { success: true, id: inserted?.id };
};

export const deleteFeaturedItem = async (id: number) => {
  await verifyAdmin();
  const adminClient = createAdminClient();

  const { error } = await adminClient
    .from("featured_items")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("Error deleting featured item:", error);
    return { success: false, error: error.message };
  }

  const now = new Date().toISOString();
  await adminClient.from("sync_meta").upsert([
    { id: "featured_items", updated_at: now },
    { id: "deleted_records", updated_at: now },
  ]);

  revalidateCategoryPaths(["/"]);
  return { success: true };
};

export const reorderFeaturedItems = async (
  items: { id: number; order_ind: number }[],
) => {
  await verifyAdmin();
  const adminClient = createAdminClient();
  const res = await executeParallelReorder(
    adminClient,
    "featured_items",
    items,
  );
  if (!res.success) {
    console.error("Error reordering featured items:", res.error);
  } else {
    revalidateCategoryPaths(["/"]);
  }
  return res;
};

// ------------------------------------------------------------------
// ANNOUNCEMENTS & BANNERS
// ------------------------------------------------------------------

import type { AnnouncementCategory, AnnouncementUIProps } from "@/types";

export type { AnnouncementCategory, AnnouncementUIProps };

export interface AnnouncementInput {
  title: string;
  subtitle?: string | null;
  badge_text?: string | null;
  category?: AnnouncementCategory;
  cta_label?: string | null;
  cta_url?: string | null;
  media_path?: string | null;
  media_type?: "image" | "video" | "gif";
  bg_gradient?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  is_annual_recurring?: boolean;
  is_active?: boolean;
  allowed_roles?: number[];
  order_ind?: number;
  ui_props?: AnnouncementUIProps | null;
}

const mapAnnouncementFields = (data: AnnouncementInput) => ({
  title: data.title,
  subtitle: data.subtitle || null,
  badge_text: data.badge_text || null,
  category: data.category || "event",
  cta_label: data.cta_label || null,
  cta_url: data.cta_url || null,
  media_path: data.media_path || null,
  media_type: data.media_type || "image",
  bg_gradient: data.bg_gradient || null,
  start_date: data.start_date || null,
  end_date: data.end_date || null,
  is_annual_recurring: data.is_annual_recurring ?? false,
  is_active: data.is_active ?? true,
  allowed_roles: data.allowed_roles ?? [],
  order_ind: data.order_ind ?? 0,
  ...(data.ui_props !== undefined
    ? { ui_props: data.ui_props as unknown as Json }
    : {}),
});

export const createAnnouncement = async (data: AnnouncementInput) => {
  await verifyAdmin();
  const adminClient = createAdminClient();

  const { data: inserted, error } = await adminClient
    .from("announcements")
    .insert(mapAnnouncementFields(data))
    .select("id")
    .single();

  if (error) {
    console.error("Error creating announcement:", error);
    return { success: false, error: error.message };
  }

  revalidateCategoryPaths(["/"]);
  return { success: true, id: inserted?.id };
};

export const updateAnnouncement = async (
  id: number,
  data: AnnouncementInput,
) => {
  await verifyAdmin();
  const adminClient = createAdminClient();

  const fields = mapAnnouncementFields(data);
  const { error } = await adminClient
    .from("announcements")
    .update({
      ...fields,
      media_path: data.media_path !== undefined ? data.media_path : undefined,
      is_active: data.is_active !== undefined ? data.is_active : true,
      allowed_roles: data.allowed_roles !== undefined ? data.allowed_roles : [],
      order_ind: data.order_ind !== undefined ? data.order_ind : 0,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) {
    console.error("Error updating announcement:", error);
    return { success: false, error: error.message };
  }

  revalidateCategoryPaths(["/"]);
  return { success: true };
};

export const deleteAnnouncement = async (id: number) => {
  await verifyAdmin();
  const adminClient = createAdminClient();

  // Remove announcement row
  const { error } = await adminClient
    .from("announcements")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("Error deleting announcement:", error);
    return { success: false, error: error.message };
  }

  // Attempt cleanup of media files from images bucket
  const id36 = id.toString(36);
  const filesToDelete = [
    `bnr-${id36}-d.webp`,
    `bnr-${id36}-d.avif`,
    `bnr-${id36}-m.webp`,
    `bnr-${id36}-m.avif`,
    `bnr-${id36}.mp4`,
    `bnr-${id36}.webm`,
    `bnr-${id36}.gif`,
    // Legacy support
    `bnr-${id}-d.webp`,
    `bnr-${id}-d.avif`,
    `bnr-${id}-m.webp`,
    `bnr-${id}-m.avif`,
    `bnr-${id}.mp4`,
    `bnr-${id}.webm`,
    `bnr-${id}.gif`,
  ];
  await adminClient.storage.from("images").remove(filesToDelete);

  const now = new Date().toISOString();
  await adminClient.from("sync_meta").upsert([
    { id: "announcements", updated_at: now },
    { id: "deleted_records", updated_at: now },
  ]);

  revalidateCategoryPaths(["/"]);
  return { success: true };
};

export const reorderAnnouncements = async (
  items: { id: number; order_ind: number }[],
) => {
  await verifyAdmin();
  const adminClient = createAdminClient();

  const updates = items.map((item) =>
    adminClient
      .from("announcements")
      .update({ order_ind: item.order_ind })
      .eq("id", item.id),
  );

  const results = await Promise.all(updates);
  const error = results.find((r) => r.error)?.error;
  if (error) {
    console.error("Error reordering announcements:", error);
    return { success: false, error: error.message };
  }

  revalidateCategoryPaths(["/"]);
  return { success: true };
};

export const uploadBannerMediaFile = async (
  filename: string,
  formData: FormData,
) => {
  await verifyAdmin();
  const adminClient = createAdminClient();

  const file = formData.get("file") as File;
  if (!file) {
    return { success: false, error: "No file provided" };
  }

  const { error } = await adminClient.storage
    .from("images")
    .upload(filename, file, {
      upsert: true,
      contentType: file.type,
    });

  if (error) {
    console.error("Error uploading banner media:", error);
    return { success: false, error: error.message };
  }

  return { success: true };
};

// ------------------------------------------------------------------
// BANNER IMAGES LIBRARY
// ------------------------------------------------------------------

export const prepareBannerImageUpload = async (description: string) => {
  await verifyAdmin();
  const adminClient = createAdminClient();

  const { data, error } = await adminClient
    .from("banner_images")
    .insert({ description })
    .select("id")
    .single();

  if (error) {
    console.error("Error creating banner_image record:", error);
    return { success: false, error: error.message };
  }

  return { success: true, id: data.id };
};

export const updateBannerImageDescription = async (
  id: number,
  description: string,
) => {
  await verifyAdmin();
  const adminClient = createAdminClient();

  const { error } = await adminClient
    .from("banner_images")
    .update({ description, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) {
    console.error("Error updating banner_image description:", error);
    return { success: false, error: error.message };
  }

  return { success: true };
};

export const deleteBannerImage = async (id: number) => {
  await verifyAdmin();
  const adminClient = createAdminClient();

  const { error } = await adminClient
    .from("banner_images")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("Error deleting banner_image record:", error);
    return { success: false, error: error.message };
  }

  // Remove all variants from storage
  const id36 = id.toString(36);
  const filesToDelete = [
    `bnr-${id36}-d.webp`,
    `bnr-${id36}-d.avif`,
    `bnr-${id36}-m.webp`,
    `bnr-${id36}-m.avif`,
    // Legacy support
    `bnr-${id}-d.webp`,
    `bnr-${id}-d.avif`,
    `bnr-${id}-m.webp`,
    `bnr-${id}-m.avif`,
  ];
  await adminClient.storage.from("images").remove(filesToDelete);

  const { deleteKvKey } = await import("@/lib/cloudflare-kv");
  await deleteKvKey(`bnr:${id}`);

  return { success: true };
};

export const saveBannerImageDriveIds = async (
  id: number,
  driveIds: {
    desktop_webp?: string | null;
    desktop_avif?: string | null;
    mobile_webp?: string | null;
    mobile_avif?: string | null;
  },
) => {
  await verifyAdmin();
  const adminClient = createAdminClient();

  const { error } = await adminClient
    .from("banner_images")
    .update({
      ...driveIds,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) {
    console.error("Error saving banner_image drive IDs:", error);
    return { success: false, error: error.message };
  }

  const { setKvKey } = await import("@/lib/cloudflare-kv");
  await setKvKey(`bnr:${id}`, {
    desktop_webp: driveIds.desktop_webp || "",
    desktop_avif: driveIds.desktop_avif || "",
    mobile_webp: driveIds.mobile_webp || "",
    mobile_avif: driveIds.mobile_avif || "",
  });

  return { success: true };
};
