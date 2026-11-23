import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as idb from "@/lib/idb";
import { createQueryWrapper } from "@/test-utils";
import { CategoryTable } from "./category-table";
import { RecordingsTable } from "./recordings-table";

vi.mock("@/app/actions/category-actions", () => ({
  reorderCategories: vi.fn().mockResolvedValue({ success: true }),
  softDeleteCategory: vi.fn().mockResolvedValue(undefined),
  restoreCategory: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/app/actions/recording-actions", () => ({
  reorderRecordings: vi.fn().mockResolvedValue({ success: true }),
  softDeleteRecording: vi.fn().mockResolvedValue(undefined),
  restoreRecording: vi.fn().mockResolvedValue(undefined),
}));

describe("CategoryTable and RecordingsTable", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    document.body.innerHTML = "";
    (global as any).indexedDB = {};
    const mockDb = {
      getAll: vi.fn().mockResolvedValue([]),
    };
    vi.spyOn(idb, "getDB").mockResolvedValue(mockDb as any);
  });

  afterEach(() => {
    cleanup();
    document.body.innerHTML = "";
    vi.restoreAllMocks();
  });

  it("CategoryTable should render category rows and show empty state when empty", () => {
    const { unmount } = render(<CategoryTable categories={[]} />, {
      wrapper: createQueryWrapper(),
    });
    expect(screen.getByText(/no categories found/i)).toBeDefined();
    unmount();

    const mockCategories = [
      { id: 1, name: "Philosophy", url_path: "philosophy", order_ind: 1 },
      { id: 2, name: "Science", url_path: "science", order_ind: 2 },
    ];
    render(<CategoryTable categories={mockCategories as any} />, {
      wrapper: createQueryWrapper(),
    });
    expect(screen.getByText("Philosophy")).toBeDefined();
    expect(screen.getByText("Science")).toBeDefined();
  });

  it("RecordingsTable should render recording rows and show empty state when empty", () => {
    const { unmount } = render(<RecordingsTable recordings={[]} />, {
      wrapper: createQueryWrapper(),
    });
    expect(screen.getByText(/no recordings found/i)).toBeDefined();
    unmount();

    const mockRecordings = [
      { id: 101, name: "Lecture 1", order_ind: 1 },
      { id: 102, name: "Lecture 2", order_ind: 2 },
    ];
    render(<RecordingsTable recordings={mockRecordings as any} />, {
      wrapper: createQueryWrapper(),
    });
    expect(screen.getByText("Lecture 1")).toBeDefined();
    expect(screen.getByText("Lecture 2")).toBeDefined();
  });
});
