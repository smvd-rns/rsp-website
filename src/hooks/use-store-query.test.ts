import { renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import * as idb from "@/lib/idb";
import { createQueryWrapper } from "@/test-utils";
import { createSortedStoreQuery } from "./use-store-query";

describe("createSortedStoreQuery", () => {
  it("should fetch items from IDB and sort by updated_at descending", async () => {
    const mockItems = [
      { id: 1, name: "Old", updated_at: "2026-01-01" },
      { id: 2, name: "New", updated_at: "2026-02-01" },
    ];
    vi.spyOn(idb, "getDB").mockResolvedValue({
      getAll: vi.fn().mockResolvedValue(mockItems),
    } as any);

    const useTestStore = createSortedStoreQuery<{
      id: number;
      name: string;
      updated_at: string;
    }>("test_store");
    const { result } = renderHook(() => useTestStore(), {
      wrapper: createQueryWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data?.[0].id).toBe(2);
    expect(result.current.data?.[1].id).toBe(1);
  });

  it("should return empty array if db is null", async () => {
    vi.spyOn(idb, "getDB").mockResolvedValue(null);

    const useTestStore = createSortedStoreQuery("test_store");
    const { result } = renderHook(() => useTestStore(), {
      wrapper: createQueryWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual([]);
  });
});
