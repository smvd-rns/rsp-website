import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as adminServer from "@/lib/admin-server";
import {
  createCategory,
  reorderCategories,
  restoreCategory,
  softDeleteCategory,
  updateCategory,
} from "./category-actions";
import {
  createContentType,
  createEvent,
  createLanguage,
  createSpeaker,
  createVenue,
  updateEvent,
} from "./dictionary-actions";
import {
  deleteImage,
  prepareImageUpload,
  updateImageDescription,
} from "./image-actions";
import {
  createRecording,
  reorderRecordings,
  restoreRecording,
  softDeleteRecording,
  updateRecording,
} from "./recording-actions";
import {
  createRedirect,
  deleteRedirect,
  updateRedirect,
} from "./redirect-actions";
import { createService, reorderServices } from "./service-actions";
import {
  adminCreateUser,
  deleteWhitelistUser,
  updateUserEditRequestStatus,
} from "./user-actions";

vi.mock("@/lib/auth-utils", () => ({
  verifyAdmin: vi.fn().mockResolvedValue({ id: "admin-1" }),
}));

vi.mock("@/lib/revalidate", () => ({
  revalidateCategoryPaths: vi.fn(),
}));

vi.mock("@/lib/upload-service", () => ({
  syncCategoryFolders: vi.fn().mockResolvedValue({ success: true }),
  trashCategory: vi.fn().mockResolvedValue({ success: true }),
  untrashCategory: vi.fn().mockResolvedValue({ success: true }),
  trashRecording: vi.fn().mockResolvedValue({ success: true }),
  untrashRecording: vi.fn().mockResolvedValue({ success: true }),
  createResumableSession: vi
    .fn()
    .mockResolvedValue({ sessionUrl: "s", uniqueFileName: "u" }),
  processRecordingUploads: vi.fn().mockResolvedValue({ success: true }),
}));

describe("admin actions", () => {
  let mockAdminClient: any;

  beforeEach(() => {
    vi.clearAllMocks();

    const qb: any = {
      select: vi.fn(() => qb),
      insert: vi.fn(() => qb),
      update: vi.fn(() => qb),
      delete: vi.fn(() => qb),
      eq: vi.fn(() => qb),
      like: vi.fn(() => qb),
      in: vi.fn(() => qb),
      order: vi.fn(() => qb),
      limit: vi.fn(() => qb),
      maybeSingle: vi
        .fn()
        .mockResolvedValue({ data: { order_ind: 0 }, error: null }),
      single: vi.fn().mockResolvedValue({
        data: {
          id: 10,
          url_path: "meditation",
          webp_file: "a.webp",
          avif_file: "a.avif",
        },
        error: null,
      }),
      then: (resolve: any) =>
        resolve({
          data: [
            {
              id: 10,
              url_path: "meditation",
              webp_file: "a.webp",
              avif_file: "a.avif",
            },
          ],
          error: null,
        }),
    };

    mockAdminClient = {
      from: vi.fn().mockReturnValue(qb),
      rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
      storage: {
        from: vi.fn().mockReturnValue({
          upload: vi.fn().mockResolvedValue({ error: null }),
          remove: vi.fn().mockResolvedValue({ error: null }),
        }),
      },
      auth: {
        admin: {
          createUser: vi.fn().mockResolvedValue({
            data: { user: { id: "u-new" } },
            error: null,
          }),
        },
      },
    };

    vi.spyOn(adminServer, "createAdminClient").mockReturnValue(mockAdminClient);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should create, update, softDelete, restore, and reorder categories", async () => {
    const resCreate = await createCategory({
      name: "Meditation",
      roles: [1],
      imgId: 1,
    });
    expect(resCreate.success).toBe(true);

    const resUpdate = await updateCategory(10, {
      name: "Meditation Advanced",
      roles: [1],
      imgId: 1,
    });
    expect(resUpdate.success).toBe(true);

    await softDeleteCategory(10);
    await restoreCategory(10);
    await reorderCategories([{ id: 10, order_ind: 1 }]);
  });

  it("should create, update, softDelete, restore, and reorder recordings", async () => {
    await createRecording({
      category_id: 10,
      category_url_path: "meditation",
      name: "Guided Meditation",
      speaker_ids: [1],
      audio_id: "audio_test_1",
    });

    await updateRecording(100, {
      name: "Guided Meditation 2",
      category_id: 10,
      speaker_ids: [1],
    });

    await softDeleteRecording(100, 10, "meditation");
    await restoreRecording(100);
    await reorderRecordings([{ id: 100, order_ind: 1 }], "meditation");
  });

  it("should manage speakers, venues, events, languages, content types, redirects, and services", async () => {
    expect((await createSpeaker("Speaker")).id).toBe(10);
    expect((await createVenue("Venue")).id).toBe(10);
    expect((await createEvent("Event")).id).toBe(10);
    await updateEvent("1", { name: "Event 2" });
    expect((await createLanguage("Lang", "en")).id).toBe(10);
    expect((await createContentType("Type")).id).toBe(10);
    await createRedirect({ from_path: "/old", to_path: "/new" });
    await updateRedirect({ id: "old", to_path: "/new-updated" });
    await updateRedirect({
      id: "old",
      from_path: "/old-renamed",
      to_path: "/new-renamed",
    });
    await deleteRedirect("old_renamed");
    await createService({
      name: "Service",
      description: "Desc",
      is_public: true,
    });
    await reorderServices([{ id: 1, order_ind: 1 }]);

    expect((await prepareImageUpload("img")).success).toBe(true);
    expect((await updateImageDescription(1, "updated img")).success).toBe(true);
    const delImgRes = await deleteImage(1);
    expect(delImgRes.success).toBe(true);
    expect(await updateUserEditRequestStatus("req1", "approved")).toBeDefined();
    expect((await deleteWhitelistUser("a@b.com")).success).toBe(true);

    const userRes = await adminCreateUser({
      name: "New User",
      email: "new@test.com",
      phone: "123456",
      roleId: 1,
      sendEmail: false,
      forceUpdate: true,
    });
    expect(userRes.success).toBe(true);
  });
});
