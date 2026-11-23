import { toast as sonnerToast } from "sonner";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { formatToastTimestamp, toast } from "./toast";

vi.mock("sonner", () => {
  const mockSonner = Object.assign(vi.fn(), {
    error: vi.fn(),
    warning: vi.fn(),
    success: vi.fn(),
    info: vi.fn(),
  });
  return {
    toast: mockSonner,
  };
});

describe("toast", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("formatToastTimestamp formats dates correctly", () => {
    const fixedDate = new Date("2026-09-04T10:15:30");
    const formatted = formatToastTimestamp(fixedDate);
    expect(formatted).toMatch(/10:15:30/);
  });

  it("should call sonnerToast with timestamp in description for default toast", () => {
    toast("Default notification");
    expect(sonnerToast).toHaveBeenCalledWith(
      "Default notification",
      expect.objectContaining({
        description: expect.stringMatching(/\d{1,2}:\d{2}:\d{2}\s?(AM|PM)/i),
      }),
    );
  });

  it("should append timestamp to existing description for default toast", () => {
    toast("Default notification", { description: "Custom info" });
    expect(sonnerToast).toHaveBeenCalledWith(
      "Default notification",
      expect.objectContaining({
        description: expect.stringMatching(
          /^Custom info • \d{1,2}:\d{2}:\d{2}\s?(AM|PM)/i,
        ),
      }),
    );
  });

  it("should wrap success toast with timestamp", () => {
    toast.success("Action succeeded");
    expect(sonnerToast.success).toHaveBeenCalledWith(
      "Action succeeded",
      expect.objectContaining({
        description: expect.stringMatching(/\d{1,2}:\d{2}:\d{2}\s?(AM|PM)/i),
      }),
    );
  });

  it("should wrap info toast with timestamp", () => {
    toast.info("Notice");
    expect(sonnerToast.info).toHaveBeenCalledWith(
      "Notice",
      expect.objectContaining({
        description: expect.stringMatching(/\d{1,2}:\d{2}:\d{2}\s?(AM|PM)/i),
      }),
    );
  });

  it("should wrap error toast with Infinity duration, closeButton, and timestamp", () => {
    toast.error("An error occurred");
    expect(sonnerToast.error).toHaveBeenCalledWith(
      "An error occurred",
      expect.objectContaining({
        duration: Infinity,
        closeButton: true,
        description: expect.stringMatching(/\d{1,2}:\d{2}:\d{2}\s?(AM|PM)/i),
      }),
    );
  });

  it("should merge custom options into error toast while appending timestamp", () => {
    toast.error("Custom error", { description: "Extra detail" });
    expect(sonnerToast.error).toHaveBeenCalledWith(
      "Custom error",
      expect.objectContaining({
        duration: Infinity,
        closeButton: true,
        description: expect.stringMatching(
          /^Extra detail • \d{1,2}:\d{2}:\d{2}\s?(AM|PM)/i,
        ),
      }),
    );
  });

  it("should wrap warning toast with Infinity duration, closeButton, and timestamp", () => {
    toast.warning("Warning message");
    expect(sonnerToast.warning).toHaveBeenCalledWith(
      "Warning message",
      expect.objectContaining({
        duration: Infinity,
        closeButton: true,
        description: expect.stringMatching(/\d{1,2}:\d{2}:\d{2}\s?(AM|PM)/i),
      }),
    );
  });
});
