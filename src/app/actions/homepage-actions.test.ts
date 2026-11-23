import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as adminServer from "@/lib/admin-server";
import * as authUtils from "@/lib/auth-utils";
import * as cloudflareKv from "@/lib/cloudflare-kv";

import {
  createAnnouncement,
  createFeaturedItem,
  createFeaturedSection,
  deleteAnnouncement,
  deleteBannerImage,
  deleteFeaturedItem,
  deleteFeaturedSection,
  prepareBannerImageUpload,
  reorderAnnouncements,
  reorderFeaturedItems,
  reorderFeaturedSections,
  saveBannerImageDriveIds,
  updateAnnouncement,
  updateBannerImageDescription,
  updateFeaturedSection,
  uploadBannerMediaFile,
} from "./homepage-actions";

describe("homepage-actions", () => {
  let mockAdminClient: any;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(authUtils, "verifyAdmin").mockResolvedValue({
      id: "admin-1",
    } as any);

    mockAdminClient = {
      from: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      upsert: vi.fn().mockResolvedValue({ error: null }),
      delete: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: { id: 100 }, error: null }),
      eq: vi.fn().mockResolvedValue({ error: null }),
      rpc: vi.fn().mockResolvedValue({ error: null }),
      storage: {
        from: vi.fn().mockReturnValue({
          upload: vi.fn().mockResolvedValue({ error: null }),
          remove: vi.fn().mockResolvedValue({ error: null }),
        }),
      },
    };

    vi.spyOn(adminServer, "createAdminClient").mockReturnValue(mockAdminClient);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should create, update, delete, and reorder featured sections", async () => {
    const resCreate = await createFeaturedSection({
      title: "Spotlight",
      layout: "carousel",
    });
    expect(resCreate.success).toBe(true);

    const resUpdate = await updateFeaturedSection(1, {
      title: "Spotlight 2",
      layout: "grid",
    });
    expect(resUpdate.success).toBe(true);

    const resDelete = await deleteFeaturedSection(1);
    expect(resDelete.success).toBe(true);

    const resReorder = await reorderFeaturedSections([{ id: 1, order_ind: 1 }]);
    expect(resReorder.success).toBe(true);
  });

  it("should create, delete, and reorder featured items", async () => {
    const resCreate = await createFeaturedItem({
      section_id: 1,
      entity_type: "category",
      entity_id: 10,
    });
    expect(resCreate.success).toBe(true);

    const resDelete = await deleteFeaturedItem(100);
    expect(resDelete.success).toBe(true);

    const resReorder = await reorderFeaturedItems([{ id: 1, order_ind: 1 }]);
    expect(resReorder.success).toBe(true);
  });

  it("should manage announcements, media upload, and banner images", async () => {
    const resAnn = await createAnnouncement({ title: "Festival" });
    expect(resAnn.success).toBe(true);
    expect(resAnn.id).toBe(100);

    const resUpAnn = await updateAnnouncement(100, {
      title: "Festival Updated",
    });
    expect(resUpAnn.success).toBe(true);

    const resDelAnn = await deleteAnnouncement(100);
    expect(resDelAnn.success).toBe(true);

    const resReorderAnn = await reorderAnnouncements([
      { id: 100, order_ind: 1 },
    ]);
    expect(resReorderAnn.success).toBe(true);

    const formData = new FormData();
    formData.append(
      "file",
      new File(["bytes"], "banner.png", { type: "image/png" }),
    );
    const resUpload = await uploadBannerMediaFile("bnr-1.png", formData);
    expect(resUpload.success).toBe(true);

    const resPrep = await prepareBannerImageUpload("New Banner");
    expect(resPrep.success).toBe(true);

    const resDesc = await updateBannerImageDescription(
      100,
      "Updated description",
    );
    expect(resDesc.success).toBe(true);

    const setKvSpy = vi
      .spyOn(cloudflareKv, "setKvKey")
      .mockResolvedValue({ success: true });
    const deleteKvSpy = vi
      .spyOn(cloudflareKv, "deleteKvKey")
      .mockResolvedValue({ success: true });

    const resDriveIds = await saveBannerImageDriveIds(100, {
      desktop_webp: "d-webp-id",
    });
    expect(resDriveIds.success).toBe(true);
    expect(setKvSpy).toHaveBeenCalledWith("bnr:100", {
      desktop_webp: "d-webp-id",
      desktop_avif: "",
      mobile_webp: "",
      mobile_avif: "",
    });

    const resDelBnr = await deleteBannerImage(100);
    expect(resDelBnr.success).toBe(true);
    expect(deleteKvSpy).toHaveBeenCalledWith("bnr:100");
  });
});
