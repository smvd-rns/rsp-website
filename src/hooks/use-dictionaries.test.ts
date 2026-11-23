import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { STORE } from "@/constants";
import * as idb from "@/lib/idb";
import { createQueryWrapper } from "@/test-utils";
import { useDictionaries } from "./use-dictionaries";
import { useMaterials } from "./use-materials";
import { useRedirects } from "./use-redirects";
import { useRoles } from "./use-roles";

describe("dictionaries and simple entity hooks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should fetch speakers, languages, content types, venues, events via useDictionaries", async () => {
    const mockDb = {
      getAll: vi.fn().mockImplementation((store) => {
        if (store === STORE.SPEAKERS)
          return Promise.resolve([{ id: 1, name: "Speaker 1" }]);
        if (store === STORE.LANGUAGES)
          return Promise.resolve([{ id: 1, name: "English" }]);
        if (store === STORE.CONTENT_TYPES)
          return Promise.resolve([{ id: 1, name: "Audio" }]);
        if (store === STORE.VENUES)
          return Promise.resolve([{ id: 1, name: "Main Hall" }]);
        if (store === STORE.EVENTS)
          return Promise.resolve([{ id: 1, name: "Annual Meet" }]);
        return Promise.resolve([]);
      }),
    };
    vi.spyOn(idb, "getDB").mockResolvedValue(mockDb as any);

    const { result } = renderHook(() => useDictionaries(), {
      wrapper: createQueryWrapper(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.speakers).toHaveLength(1);
    expect(result.current.languages).toHaveLength(1);
    expect(result.current.contentTypes).toHaveLength(1);
    expect(result.current.venues).toHaveLength(1);
    expect(result.current.events).toHaveLength(1);
  });

  it("should fetch materials, roles, and redirects", async () => {
    const mockDb = {
      getAll: vi.fn().mockImplementation((store) => {
        if (store === STORE.MATERIALS)
          return Promise.resolve([{ id: 1, title: "Book" }]);
        if (store === STORE.ROLES)
          return Promise.resolve([{ id: 2 }, { id: 1 }]);
        if (store === STORE.REDIRECTS)
          return Promise.resolve([
            { id: "r1", updated_at: "2026-01-01" },
            { id: "r2", updated_at: "2026-02-01" },
          ]);
        return Promise.resolve([]);
      }),
    };
    vi.spyOn(idb, "getDB").mockResolvedValue(mockDb as any);

    const { result: matResult } = renderHook(() => useMaterials(), {
      wrapper: createQueryWrapper(),
    });
    const { result: rolesResult } = renderHook(() => useRoles(), {
      wrapper: createQueryWrapper(),
    });
    const { result: redResult } = renderHook(() => useRedirects(), {
      wrapper: createQueryWrapper(),
    });

    await waitFor(() => expect(matResult.current.isSuccess).toBe(true));
    expect(matResult.current.data).toHaveLength(1);

    await waitFor(() => expect(rolesResult.current.isSuccess).toBe(true));
    expect(rolesResult.current.data?.[0].id).toBe(1);

    await waitFor(() => expect(redResult.current.isSuccess).toBe(true));
    expect(redResult.current.data?.[0].id).toBe("r2");
  });
});
