import { describe, expect, it } from "vitest";
import {
  getMaterialExtension,
  guessExtensionFromBytesAndMime,
  mimeToExtension,
  normalizeTypeToExtension,
  resolveMaterialFileName,
} from "./material-utils";

describe("material-utils", () => {
  describe("mimeToExtension", () => {
    it("maps common document and media mimes correctly", () => {
      expect(mimeToExtension("application/pdf")).toBe(".pdf");
      expect(mimeToExtension("video/mp4")).toBe(".mp4");
      expect(mimeToExtension("video/webm")).toBe(".webm");
      expect(mimeToExtension("audio/mpeg")).toBe(".mp3");
      expect(mimeToExtension("audio/mp4")).toBe(".m4a");
      expect(
        mimeToExtension(
          "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        ),
      ).toBe(".pptx");
      expect(
        mimeToExtension(
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        ),
      ).toBe(".docx");
    });

    it("handles mime types with parameters e.g. text/html; charset=utf-8", () => {
      expect(mimeToExtension("text/html; charset=utf-8")).toBe(".html");
      expect(mimeToExtension("application/pdf; charset=binary")).toBe(".pdf");
    });

    it("returns empty string for unknown mimes", () => {
      expect(mimeToExtension("application/octet-stream")).toBe("");
      expect(mimeToExtension("")).toBe("");
      expect(mimeToExtension(null)).toBe("");
    });
  });

  describe("normalizeTypeToExtension", () => {
    it("converts mime types or raw extensions cleanly", () => {
      expect(normalizeTypeToExtension("application/pdf")).toBe(".pdf");
      expect(normalizeTypeToExtension("pdf")).toBe(".pdf");
      expect(normalizeTypeToExtension(".pdf")).toBe(".pdf");
      expect(normalizeTypeToExtension("video/mp4")).toBe(".mp4");
      expect(normalizeTypeToExtension("mp4")).toBe(".mp4");
      expect(normalizeTypeToExtension("audio/mpeg")).toBe(".mp3");
      expect(normalizeTypeToExtension("mp3")).toBe(".mp3");
    });

    it("rejects generic category words that could become bogus folders", () => {
      expect(normalizeTypeToExtension("application")).toBe("");
      expect(normalizeTypeToExtension("video")).toBe("");
      expect(normalizeTypeToExtension("audio")).toBe("");
      expect(normalizeTypeToExtension("binary")).toBe("");
      expect(normalizeTypeToExtension("file")).toBe("");
    });

    it("never returns a slash or backslash", () => {
      expect(normalizeTypeToExtension("application/vnd.custom/sub")).toBe("");
      expect(normalizeTypeToExtension("foo/bar")).toBe("");
    });
  });

  describe("getMaterialExtension & resolveMaterialFileName", () => {
    it("resolves extensions for database materials with mime types without creating slashes", () => {
      const pdfMat = {
        id: 1,
        recording_id: 100,
        name: "4146484409",
        type: "application/pdf",
        uri: "drive_file_id_123",
      };
      expect(getMaterialExtension(pdfMat as any)).toBe(".pdf");
      expect(resolveMaterialFileName(pdfMat as any)).toBe("4146484409.pdf");

      const videoMat = {
        id: 2,
        recording_id: 100,
        name: "Whats App Video 2026-10-12 at 9.37.46 PM",
        type: "video/mp4",
        uri: "drive_video_id_456",
      };
      expect(getMaterialExtension(videoMat as any)).toBe(".mp4");
      expect(resolveMaterialFileName(videoMat as any)).toBe(
        "Whats App Video 2026-10-12 at 9.37.46 PM.mp4",
      );

      const audioMat = {
        id: 3,
        recording_id: 100,
        name: "YM Bhajans - Govindam Adi Purusam-Original",
        type: "audio/mpeg",
        uri: "drive_audio_id_789",
      };
      expect(getMaterialExtension(audioMat as any)).toBe(".mp3");
      expect(resolveMaterialFileName(audioMat as any)).toBe(
        "YM Bhajans - Govindam Adi Purusam-Original.mp3",
      );
    });

    it("does not duplicate extension if already present in filename", () => {
      const mat = {
        id: 4,
        recording_id: 100,
        name: "StudyGuide.pdf",
        type: "application/pdf",
        uri: "drive_file_id_999",
      };
      expect(resolveMaterialFileName(mat as any)).toBe("StudyGuide.pdf");
    });

    it("guesses extension from MP4 magic bytes when type metadata is absent", () => {
      const mat = {
        id: 5,
        recording_id: 100,
        name: "Whats App Video 2026-10-07 at 19.09.20",
        type: null,
        uri: "drive_raw_video",
      };
      // MP4 ftyp header
      const mp4Bytes = new Uint8Array([
        0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70, 0x69, 0x73, 0x6f, 0x6d,
      ]);
      const fileRes = { data: mp4Bytes, mimeType: "video/mp4" };
      expect(
        guessExtensionFromBytesAndMime(mp4Bytes, "video/mp4", mat as any),
      ).toBe(".mp4");
      expect(resolveMaterialFileName(mat as any, fileRes)).toBe(
        "Whats App Video 2026-10-07 at 19.09.20.mp4",
      );
    });
  });
});
