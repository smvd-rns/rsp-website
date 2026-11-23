import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { STORE } from "@/constants";
import * as idb from "@/lib/idb";
import { createQueryWrapper } from "@/test-utils";
import {
  useActiveQueriesCount,
  usePendingRequestsCount,
  useServiceInterestsCount,
} from "./use-counts";

describe("use-counts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should count pending user edit requests", async () => {
    const mockRequests = [
      { id: "1", status: "pending" },
      { id: "2", status: "approved" },
      { id: "3", status: "pending" },
    ];
    const mockDb = {
      getAll: vi.fn().mockImplementation((store) => {
        if (store === STORE.USER_EDIT_REQUESTS)
          return Promise.resolve(mockRequests);
        return Promise.resolve([]);
      }),
    };
    vi.spyOn(idb, "getDB").mockResolvedValue(mockDb as any);

    const { result } = renderHook(() => usePendingRequestsCount(), {
      wrapper: createQueryWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toBe(2);
  });

  it("should count active open/in_progress user queries", async () => {
    const mockQueries = [
      { id: "1", status: "open" },
      { id: "2", status: "resolved" },
      { id: "3", status: "in_progress" },
      { id: "4", status: "closed" },
    ];
    const mockDb = {
      getAll: vi.fn().mockImplementation((store) => {
        if (store === STORE.USER_QUERIES) return Promise.resolve(mockQueries);
        return Promise.resolve([]);
      }),
    };
    vi.spyOn(idb, "getDB").mockResolvedValue(mockDb as any);

    const { result } = renderHook(() => useActiveQueriesCount(), {
      wrapper: createQueryWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toBe(2);
  });

  it("should count user service interests", async () => {
    const mockInterests = [{ id: "1" }, { id: "2" }, { id: "3" }];
    const mockDb = {
      getAll: vi.fn().mockImplementation((store) => {
        if (store === STORE.USER_SERVICE_INTERESTS)
          return Promise.resolve(mockInterests);
        return Promise.resolve([]);
      }),
    };
    vi.spyOn(idb, "getDB").mockResolvedValue(mockDb as any);

    const { result } = renderHook(() => useServiceInterestsCount(), {
      wrapper: createQueryWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toBe(3);
  });
});
