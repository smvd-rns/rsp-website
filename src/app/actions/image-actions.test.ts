import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as adminServer from "@/lib/admin-server";
import * as authUtils from "@/lib/auth-utils";
import * as cloudflareKv from "@/lib/cloudflare-kv";
import * as uploadService from "@/lib/upload-service";
import {
  deleteImage,
  getImageUploadSessionUrl,
  prepareImageUpload,
  saveImageDriveIds,
  updateImageDescription,
} from "./image-actions";

describe("image-actions", () => {
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
      delete: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: { id: 10 }, error: null }),
      eq: vi.fn().mockResolvedValue({ error: null }),
      storage: {
        from: vi.fn().mockReturnValue({
          remove: vi.fn().mockResolvedValue({ error: null }),
        }),
      },
    };

    vi.spyOn(adminServer, "createAdminClient").mockReturnValue(mockAdminClient);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("prepares image upload successfully", async () => {
    const res = await prepareImageUpload("Test Description");
    expect(res.success).toBe(true);
    expect(res.id).toBe(10);
  });

  it("updates image description", async () => {
    const res = await updateImageDescription(10, "Updated Description");
    expect(res.success).toBe(true);
  });

  it("deletes image and removes from storage and KV", async () => {
    const deleteKvSpy = vi
      .spyOn(cloudflareKv, "deleteKvKey")
      .mockResolvedValue({ success: true });

    const res = await deleteImage(10);
    expect(res.success).toBe(true);
    expect(mockAdminClient.storage.from).toHaveBeenCalledWith("images");
    expect(deleteKvSpy).toHaveBeenCalledWith("img:10");
  });

  it("saves image drive IDs and updates KV", async () => {
    const setKvSpy = vi
      .spyOn(cloudflareKv, "setKvKey")
      .mockResolvedValue({ success: true });

    const res = await saveImageDriveIds(10, {
      webp: "webp-id",
      avif: "avif-id",
      webp_2x: "webp2x-id",
      avif_2x: "avif2x-id",
    });
    expect(res.success).toBe(true);
    expect(setKvSpy).toHaveBeenCalledWith("img:10", {
      webp: "webp-id",
      avif: "avif-id",
      webp_2x: "webp2x-id",
      avif_2x: "avif2x-id",
    });
  });

  it("gets image upload session url", async () => {
    vi.spyOn(uploadService, "createImageUploadSession").mockResolvedValue({
      sessionUrl: "https://upload.example.com/session-abc",
    });

    const res = await getImageUploadSessionUrl("10.webp", "image/webp");
    expect(res.sessionUrl).toBe("https://upload.example.com/session-abc");
    expect(uploadService.createImageUploadSession).toHaveBeenCalledWith(
      "10.webp",
      "image/webp",
      undefined,
    );
  });
});
