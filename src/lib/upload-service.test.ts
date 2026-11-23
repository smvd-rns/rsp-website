import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as jwt from "./jwt";
import {
  clearTrashService,
  createResumableSession,
  deleteCategoryPermanently,
  deleteDriveFolder,
  deleteRecordingPermanently,
  processRecordingUploads,
  syncCategoryFolders,
  trashCategory,
  trashDriveItem,
  trashRecording,
  untrashCategory,
  untrashDriveItem,
  untrashRecording,
} from "./upload-service";

describe("upload-service", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    vi.spyOn(jwt, "generateM2MToken").mockResolvedValue("mock-jwt");
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  it("should throw if UPLOAD_SERVICE_ENDPOINT is missing", async () => {
    delete process.env.UPLOAD_SERVICE_ENDPOINT;
    await expect(
      createResumableSession("test.mp3", "audio/mp3"),
    ).rejects.toThrow("UPLOAD_SERVICE_ENDPOINT is not configured.");
  });

  it("should create resumable session via POST", async () => {
    process.env.UPLOAD_SERVICE_ENDPOINT = "https://uploads.example.com";
    const fetchSpy = vi.spyOn(global, "fetch").mockImplementation(() =>
      Promise.resolve(
        new Response(
          JSON.stringify({
            sessionUrl: "https://gcs/session",
            uniqueFileName: "u123.mp3",
          }),
          { status: 200 },
        ),
      ),
    );

    const res = await createResumableSession(
      "test.mp3",
      "audio/mp3",
      "http://origin",
    );
    expect(res).toEqual({
      sessionUrl: "https://gcs/session",
      uniqueFileName: "u123.mp3",
    });
    expect(fetchSpy).toHaveBeenCalledWith(
      "https://uploads.example.com/api/files/upload-session",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: "Bearer mock-jwt",
        }),
      }),
    );
  });

  it("should sync category folders", async () => {
    process.env.UPLOAD_SERVICE_ENDPOINT = "https://uploads.example.com";
    vi.spyOn(global, "fetch").mockImplementation(() =>
      Promise.resolve(
        new Response(
          JSON.stringify({
            success: true,
            metadata: { folderId: "f1", videoFolderId: "vf1" },
          }),
          { status: 200 },
        ),
      ),
    );

    const res = await syncCategoryFolders({
      id: 1,
      name: "Cat",
      nameChanged: true,
    });
    expect(res.success).toBe(true);
    expect(res.metadata.folderId).toBe("f1");
  });

  it("should process recording uploads", async () => {
    process.env.UPLOAD_SERVICE_ENDPOINT = "https://uploads.example.com";
    vi.spyOn(global, "fetch").mockImplementation(() =>
      Promise.resolve(
        new Response(
          JSON.stringify({
            success: true,
            metadata: { folderId: "rf1", videoFolderId: "rvf1" },
          }),
          { status: 200 },
        ),
      ),
    );

    const res = await processRecordingUploads({
      recordingId: 10,
      categoryId: 2,
      audios: [{ id: "a1", fileName: "a1.mp3", mimeType: "audio/mp3" }],
      materials: [],
    });
    expect(res.success).toBe(true);
  });

  it("should handle trash/untrash operations", async () => {
    process.env.UPLOAD_SERVICE_ENDPOINT = "https://uploads.example.com";
    vi.spyOn(global, "fetch").mockImplementation(() =>
      Promise.resolve(
        new Response(JSON.stringify({ success: true }), { status: 200 }),
      ),
    );

    await trashCategory(1);
    await untrashCategory(1);
    await trashRecording(2);
    await untrashRecording(2);
    await trashDriveItem("d1");
    await untrashDriveItem("d1");
    await deleteDriveFolder("df1");
    await deleteCategoryPermanently(1);
    await deleteRecordingPermanently(2);
    const clearRes = await clearTrashService();
    expect(clearRes.success).toBe(true);
  });

  it("should throw on API errors with response text", async () => {
    process.env.UPLOAD_SERVICE_ENDPOINT = "https://uploads.example.com";
    vi.spyOn(global, "fetch").mockImplementation(() =>
      Promise.resolve(new Response("Internal error details", { status: 500 })),
    );

    await expect(trashCategory(1)).rejects.toThrow(
      "Upload service error (500): Internal error details",
    );
  });
});
