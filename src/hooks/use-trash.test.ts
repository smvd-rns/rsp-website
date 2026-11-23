import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { STORE } from "@/constants";
import * as idb from "@/lib/idb";
import { createQueryWrapper } from "@/test-utils";
import { useTrashPage } from "./use-trash";

describe("useTrashPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should return empty arrays when trash category does not exist", async () => {
    const mockDb = {
      getAll: vi.fn().mockResolvedValue([]),
    };
    vi.spyOn(idb, "getDB").mockResolvedValue(mockDb as any);

    const { result } = renderHook(() => useTrashPage(), {
      wrapper: createQueryWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.initialized).toBe(false);
  });

  it("should return categories and recordings in trash", async () => {
    const mockCategories = [
      { id: 999, url_path: "trash", path: "0" },
      { id: 10, path: "999", name: "Trashed Category" },
      { id: 20, path: "0", name: "Active Category" },
    ];
    const mockRecordings = [
      { id: 50, category_id: 999, title: "Trashed Recording" },
      { id: 60, category_id: 20, title: "Active Recording" },
    ];

    const mockDb = {
      getAll: vi.fn().mockImplementation((store) => {
        if (store === STORE.CATEGORIES) return Promise.resolve(mockCategories);
        if (store === STORE.RECORDINGS) return Promise.resolve(mockRecordings);
        return Promise.resolve([]);
      }),
    };
    vi.spyOn(idb, "getDB").mockResolvedValue(mockDb as any);

    const { result } = renderHook(() => useTrashPage(), {
      wrapper: createQueryWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.initialized).toBe(true);
    expect(result.current.data?.categories).toHaveLength(1);
    expect(result.current.data?.recordings).toHaveLength(1);
  });
});
