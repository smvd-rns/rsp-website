import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { STORE } from "@/constants";
import * as idb from "@/lib/idb";
import { createQueryWrapper } from "@/test-utils";
import { useBannerImages } from "./use-banner-images";
import { useImages } from "./use-images";

describe("useImages and useBannerImages", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should fetch sorted images by updated_at descending", async () => {
    const mockImages = [
      { id: 1, updated_at: "2026-01-01T00:00:00Z" },
      { id: 2, updated_at: "2026-02-01T00:00:00Z" },
    ];
    const mockDb = {
      getAll: vi.fn().mockImplementation((store) => {
        if (store === STORE.IMAGES) return Promise.resolve(mockImages);
        return Promise.resolve([]);
      }),
    };
    vi.spyOn(idb, "getDB").mockResolvedValue(mockDb as any);

    const { result } = renderHook(() => useImages(), {
      wrapper: createQueryWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.[0].id).toBe(2);
  });

  it("should fetch sorted banner images by updated_at descending", async () => {
    const mockBanners = [
      { id: 10, updated_at: "2026-01-10T00:00:00Z" },
      { id: 20, updated_at: "2026-03-10T00:00:00Z" },
    ];
    const mockDb = {
      getAll: vi.fn().mockImplementation((store) => {
        if (store === STORE.BANNER_IMAGES) return Promise.resolve(mockBanners);
        return Promise.resolve([]);
      }),
    };
    vi.spyOn(idb, "getDB").mockResolvedValue(mockDb as any);

    const { result } = renderHook(() => useBannerImages(), {
      wrapper: createQueryWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.[0].id).toBe(20);
  });
});
