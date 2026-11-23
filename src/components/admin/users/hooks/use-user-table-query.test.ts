import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { STORE } from "@/constants";
import * as idb from "@/lib/idb";
import { createQueryWrapper } from "@/test-utils";
import {
  fetchPaginatedUserList,
  useUserTableQuery,
} from "./use-user-table-query";

describe("useUserTableQuery & fetchPaginatedUserList", () => {
  const mockUsers = [
    {
      id: "1",
      email: "alice@example.com",
      name: "Alice",
      role_id: 1,
      created_at: "2026-01-01",
    },
    {
      id: "2",
      email: "bob@example.com",
      name: "Bob",
      role_id: 2,
      created_at: "2026-01-02",
    },
  ];

  const mockRoles = [
    { id: 1, name: "Admin" },
    { id: 2, name: "User" },
  ];

  it("should fetch paginated users and map roles", async () => {
    vi.spyOn(idb, "getDB").mockResolvedValue({
      getAll: vi.fn().mockImplementation((store) => {
        if (store === STORE.USERS) return Promise.resolve(mockUsers);
        if (store === STORE.ROLES) return Promise.resolve(mockRoles);
        return Promise.resolve([]);
      }),
    } as any);

    const res = await fetchPaginatedUserList<any>(STORE.USERS, 1, "", 10);
    expect(res.count).toBe(2);
    expect(res.users[0].roles.name).toBe("User");
    expect(res.users[1].roles.name).toBe("Admin");
  });

  it("should filter by search query", async () => {
    vi.spyOn(idb, "getDB").mockResolvedValue({
      getAll: vi.fn().mockImplementation((store) => {
        if (store === STORE.USERS) return Promise.resolve(mockUsers);
        if (store === STORE.ROLES) return Promise.resolve(mockRoles);
        return Promise.resolve([]);
      }),
    } as any);

    const res = await fetchPaginatedUserList<any>(STORE.USERS, 1, "alice", 10);
    expect(res.count).toBe(1);
    expect(res.users[0].name).toBe("Alice");
  });

  it("useUserTableQuery hook should manage page and search", async () => {
    vi.spyOn(idb, "getDB").mockResolvedValue({
      getAll: vi.fn().mockImplementation((store) => {
        if (store === STORE.USERS) return Promise.resolve(mockUsers);
        if (store === STORE.ROLES) return Promise.resolve(mockRoles);
        return Promise.resolve([]);
      }),
    } as any);

    const { result } = renderHook(() => useUserTableQuery(STORE.USERS), {
      wrapper: createQueryWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.users.length).toBe(2);
    act(() => {
      result.current.setPage(2);
    });
    expect(result.current.page).toBe(2);

    act(() => {
      result.current.setSearch("bob");
    });
    expect(result.current.search).toBe("bob");
  });
});
