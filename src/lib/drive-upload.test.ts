import axios from "axios";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as recordingActions from "@/app/actions/recording-actions";
import { uploadFileToDrive } from "./drive-upload";

vi.mock("axios");

describe("uploadFileToDrive", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("uploads file and returns response.data.id when provided", async () => {
    vi.spyOn(recordingActions, "getUploadSessionUrl").mockResolvedValue({
      sessionUrl: "https://upload.example.com/session-123",
      uniqueFileName: "unique-audio.mp3",
    });

    vi.mocked(axios.put).mockResolvedValue({
      data: { id: "google-drive-file-id-999" },
    });

    const file = new File(["dummy content"], "audio.mp3", {
      type: "audio/mpeg",
    });
    const onProgress = vi.fn();

    const result = await uploadFileToDrive(file, onProgress);

    expect(result).toBe("google-drive-file-id-999");
    expect(recordingActions.getUploadSessionUrl).toHaveBeenCalledWith(
      "audio.mp3",
      "audio/mpeg",
      window.location.origin,
    );
    expect(axios.put).toHaveBeenCalledWith(
      "https://upload.example.com/session-123",
      file,
      expect.objectContaining({
        headers: { "Content-Type": "audio/mpeg" },
      }),
    );
  });

  it("triggers onProgress during upload", async () => {
    vi.spyOn(recordingActions, "getUploadSessionUrl").mockResolvedValue({
      sessionUrl: "https://upload.example.com/session-123",
      uniqueFileName: "unique-audio.mp3",
    });

    vi.mocked(axios.put).mockImplementation(
      async (_url, _data, config?: any) => {
        if (config?.onUploadProgress) {
          config.onUploadProgress({ loaded: 50, total: 100 });
          config.onUploadProgress({ loaded: 100, total: 100 });
        }
        return { data: {} } as any;
      },
    );

    const file = new File(["dummy"], "audio.mp3", { type: "audio/mpeg" });
    const onProgress = vi.fn();

    const result = await uploadFileToDrive(file, onProgress);

    expect(result).toBe("unique-audio.mp3");
    expect(onProgress).toHaveBeenCalledWith(50);
    expect(onProgress).toHaveBeenCalledWith(100);
  });

  it("ignores error if uploadPercent is 100% (CORS fallback) and returns uniqueFileName", async () => {
    vi.spyOn(recordingActions, "getUploadSessionUrl").mockResolvedValue({
      sessionUrl: "https://upload.example.com/session-123",
      uniqueFileName: "unique-audio.mp3",
    });

    const consoleWarnSpy = vi
      .spyOn(console, "warn")
      .mockImplementation(() => {});

    vi.mocked(axios.put).mockImplementation(
      async (_url, _data, config?: any) => {
        if (config?.onUploadProgress) {
          config.onUploadProgress({ loaded: 100, total: 100 });
        }
        throw new Error("Network Error");
      },
    );

    const file = new File(["dummy"], "audio.mp3", { type: "audio/mpeg" });
    const onProgress = vi.fn();

    const result = await uploadFileToDrive(file, onProgress);

    expect(result).toBe("unique-audio.mp3");
    expect(consoleWarnSpy).toHaveBeenCalled();
  });

  it("rethrows error when upload fails before 100%", async () => {
    vi.spyOn(recordingActions, "getUploadSessionUrl").mockResolvedValue({
      sessionUrl: "https://upload.example.com/session-123",
      uniqueFileName: "unique-audio.mp3",
    });

    vi.mocked(axios.put).mockImplementation(
      async (_url, _data, config?: any) => {
        if (config?.onUploadProgress) {
          config.onUploadProgress({ loaded: 30, total: 100 });
        }
        throw new Error("Connection reset");
      },
    );

    const file = new File(["dummy"], "audio.mp3", { type: "audio/mpeg" });
    const onProgress = vi.fn();

    await expect(uploadFileToDrive(file, onProgress)).rejects.toThrow(
      "Connection reset",
    );
  });
});

describe("uploadImageToDrive", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("uploads image to drive using session url and returns id", async () => {
    const imageActions = await import("@/app/actions/image-actions");
    vi.spyOn(imageActions, "getImageUploadSessionUrl").mockResolvedValue({
      sessionUrl: "https://upload.example.com/img-session-1",
    });

    vi.mocked(axios.put).mockResolvedValue({
      data: { id: "drive-img-file-id" },
    });

    const blob = new Blob(["image data"], { type: "image/webp" });
    const { uploadImageToDrive } = await import("./drive-upload");

    const result = await uploadImageToDrive(blob, "test.webp", "image/webp");
    expect(result).toBe("drive-img-file-id");
    expect(imageActions.getImageUploadSessionUrl).toHaveBeenCalledWith(
      "test.webp",
      "image/webp",
      window.location.origin,
    );
  });
});
