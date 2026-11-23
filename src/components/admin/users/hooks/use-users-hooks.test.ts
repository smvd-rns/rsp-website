import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as userActions from "@/app/actions/user-actions";
import { STORE } from "@/constants";
import * as idb from "@/lib/idb";
import { createQueryWrapper } from "@/test-utils";
import { useActiveUsers } from "./use-active-users";
import { useRequests } from "./use-requests";
import { useWhitelist } from "./use-whitelist";

vi.mock("@/app/actions/user-actions", () => ({
  updateUserEditRequestStatus: vi.fn().mockResolvedValue(undefined),
  deleteWhitelistUser: vi.fn().mockResolvedValue(undefined),
}));

describe("user management hooks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("useActiveUsers should paginate and search active users", async () => {
    const mockUsers = [
      { id: "u1", name: "Alice", email: "alice@test.com", role_id: 1 },
      { id: "u2", name: "Bob", email: "bob@test.com", role_id: 2 },
    ];
    const mockRoles = [
      { id: 1, name: "Admin" },
      { id: 2, name: "User" },
    ];

    const mockDb = {
      getAll: vi.fn().mockImplementation((store) => {
        if (store === STORE.USERS) return Promise.resolve(mockUsers);
        if (store === STORE.ROLES) return Promise.resolve(mockRoles);
        return Promise.resolve([]);
      }),
    };
    vi.spyOn(idb, "getDB").mockResolvedValue(mockDb as any);

    const { result } = renderHook(() => useActiveUsers(), {
      wrapper: createQueryWrapper(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.activeUsers).toHaveLength(2);
    expect(result.current.activeUsers[0].roles?.name).toBe("Admin");

    act(() => {
      result.current.handleActiveSearchSubmit({
        preventDefault: vi.fn(),
      } as any);
    });
    expect(result.current.activePage).toBe(1);
  });

  it("useRequests should handle status update approval/rejection", async () => {
    const mockRequests = [
      {
        id: "r1",
        user_id: "u1",
        requested_role_id: 1,
        requested_at: "2026-01-01",
      },
    ];
    const mockUsers = [{ id: "u1", email: "user@test.com" }];
    const mockRoles = [{ id: 1, name: "Admin" }];

    const mockDb = {
      getAll: vi.fn().mockImplementation((store) => {
        if (store === STORE.USER_EDIT_REQUESTS)
          return Promise.resolve(mockRequests);
        if (store === STORE.USERS) return Promise.resolve(mockUsers);
        if (store === STORE.ROLES) return Promise.resolve(mockRoles);
        return Promise.resolve([]);
      }),
    };
    vi.spyOn(idb, "getDB").mockResolvedValue(mockDb as any);

    const onUpdate = vi.fn();
    const { result } = renderHook(() => useRequests(onUpdate), {
      wrapper: createQueryWrapper(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.requests).toHaveLength(1);

    await act(async () => {
      await result.current.updateStatus("r1", "approved", "u1");
    });
    expect(userActions.updateUserEditRequestStatus).toHaveBeenCalledWith(
      "r1",
      "approved",
      undefined,
    );
    expect(onUpdate).toHaveBeenCalled();
  });

  it("useWhitelist should handle search submit and deleting whitelisted user", async () => {
    const mockWhitelist = [
      { id: "w1", email: "whitelisted@test.com", role_id: 1 },
    ];
    const mockRoles = [{ id: 1, name: "Admin" }];

    const mockDb = {
      getAll: vi.fn().mockImplementation((store) => {
        if (store === STORE.USER_WHITELIST)
          return Promise.resolve(mockWhitelist);
        if (store === STORE.ROLES) return Promise.resolve(mockRoles);
        return Promise.resolve([]);
      }),
      delete: vi.fn().mockResolvedValue(undefined),
    };
    vi.spyOn(idb, "getDB").mockResolvedValue(mockDb as any);

    const { result } = renderHook(() => useWhitelist(), {
      wrapper: createQueryWrapper(),
    });

    await waitFor(() => expect(result.current.isWhitelistLoading).toBe(false));
    expect(result.current.whitelistUsers).toHaveLength(1);

    act(() => {
      result.current.handleSearchSubmit({ preventDefault: vi.fn() } as any);
    });

    await act(async () => {
      await result.current.confirmDeleteWhitelist("whitelisted@test.com");
    });
    expect(userActions.deleteWhitelistUser).toHaveBeenCalledWith(
      "whitelisted@test.com",
    );
  });
});
