import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { STORE } from "@/constants";
import * as idb from "@/lib/idb";
import { createQueryWrapper } from "@/test-utils";
import {
  useServiceAssignments,
  useServiceInterests,
  useServicesList,
  useUserResponsibilities,
  useUsersList,
} from "./use-services";

describe("use-services hooks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should fetch sorted services list", async () => {
    const mockServices = [
      { id: 2, order_ind: 2, name: "Cleaning" },
      { id: 1, order_ind: 1, name: "Cooking" },
    ];
    const mockDb = {
      getAll: vi.fn().mockImplementation((store) => {
        if (store === STORE.SERVICES) return Promise.resolve(mockServices);
        return Promise.resolve([]);
      }),
    };
    vi.spyOn(idb, "getDB").mockResolvedValue(mockDb as any);

    const { result } = renderHook(() => useServicesList(), {
      wrapper: createQueryWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.[0].id).toBe(1);
  });

  it("should fetch enriched service assignments, interests, responsibilities, and users list", async () => {
    const mockUsers = [
      { id: "u1", name: "Alice", email: "alice@test.com", role_id: 1 },
    ];
    const mockServices = [{ id: 1, name: "Cooking" }];
    const mockAssignments = [
      { id: "a1", user_id: "u1", service_id: 1, started_at: "2026-01-01" },
    ];
    const mockInterests = [
      { id: "i1", user_id: "u1", service_id: 1, created_at: "2026-01-01" },
    ];
    const mockResp = [{ id: "r1", user_id: "u1", started_at: "2026-01-01" }];

    const mockDb = {
      getAll: vi.fn().mockImplementation((store) => {
        if (store === STORE.USERS) return Promise.resolve(mockUsers);
        if (store === STORE.SERVICES) return Promise.resolve(mockServices);
        if (store === STORE.USER_SERVICE_ASSIGNMENTS)
          return Promise.resolve(mockAssignments);
        if (store === STORE.USER_SERVICE_INTERESTS)
          return Promise.resolve(mockInterests);
        if (store === STORE.USER_RESPONSIBILITIES)
          return Promise.resolve(mockResp);
        return Promise.resolve([]);
      }),
    };
    vi.spyOn(idb, "getDB").mockResolvedValue(mockDb as any);

    const { result: aRes } = renderHook(() => useServiceAssignments(), {
      wrapper: createQueryWrapper(),
    });
    const { result: iRes } = renderHook(() => useServiceInterests(), {
      wrapper: createQueryWrapper(),
    });
    const { result: rRes } = renderHook(() => useUserResponsibilities(), {
      wrapper: createQueryWrapper(),
    });
    const { result: uRes } = renderHook(() => useUsersList(), {
      wrapper: createQueryWrapper(),
    });

    await waitFor(() => expect(aRes.current.isSuccess).toBe(true));
    expect(aRes.current.data?.[0].users?.name).toBe("Alice");
    expect(iRes.current.data?.[0].services?.name).toBe("Cooking");
    expect(rRes.current.data?.[0].users?.name).toBe("Alice");
    expect(uRes.current.data?.[0].name).toBe("Alice");
  });
});
