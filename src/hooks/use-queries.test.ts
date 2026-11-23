import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { STORE } from "@/constants";
import * as idb from "@/lib/idb";
import { createQueryWrapper } from "@/test-utils";
import { useQueries, useQueryDetail } from "./use-queries";

describe("useQueries and useQueryDetail", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should fetch all user queries joined with user data sorted by created_at desc", async () => {
    const mockQueries = [
      {
        id: "q1",
        user_id: "u1",
        created_at: "2026-01-01T00:00:00Z",
        subject: "S1",
      },
      {
        id: "q2",
        user_id: "u2",
        created_at: "2026-02-01T00:00:00Z",
        subject: "S2",
      },
    ];
    const mockUsers = [
      { id: "u1", name: "Alice", email: "alice@test.com" },
      { id: "u2", name: "Bob", email: "bob@test.com" },
    ];

    const mockDb = {
      getAll: vi.fn().mockImplementation((store) => {
        if (store === STORE.USER_QUERIES) return Promise.resolve(mockQueries);
        if (store === STORE.USERS) return Promise.resolve(mockUsers);
        return Promise.resolve([]);
      }),
    };
    vi.spyOn(idb, "getDB").mockResolvedValue(mockDb as any);

    const { result } = renderHook(() => useQueries(), {
      wrapper: createQueryWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.[0].id).toBe("q2");
    expect(result.current.data?.[0].users?.name).toBe("Bob");
  });

  it("should fetch query detail and associated replies", async () => {
    const mockQuery = { id: "q1", user_id: "u1", subject: "Subject 1" };
    const mockReplies = [
      {
        id: "r1",
        query_id: "q1",
        user_id: "u2",
        message: "Reply 1",
        updated_at: "2026-01-02T00:00:00Z",
      },
      { id: "r2", query_id: "other", user_id: "u1", message: "Other" },
    ];
    const mockUsers = [
      { id: "u1", name: "Alice", email: "alice@test.com" },
      { id: "u2", name: "Bob", email: "bob@test.com" },
    ];

    const mockDb = {
      get: vi.fn().mockResolvedValue(mockQuery),
      getAll: vi.fn().mockImplementation((store) => {
        if (store === STORE.QUERY_REPLIES) return Promise.resolve(mockReplies);
        if (store === STORE.USERS) return Promise.resolve(mockUsers);
        return Promise.resolve([]);
      }),
    };
    vi.spyOn(idb, "getDB").mockResolvedValue(mockDb as any);

    const { result } = renderHook(() => useQueryDetail("q1"), {
      wrapper: createQueryWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.query.subject).toBe("Subject 1");
    expect(result.current.data?.replies).toHaveLength(1);
    expect(result.current.data?.replies[0].message).toBe("Reply 1");
  });

  it("should normalize stringified attachments from IndexedDB into arrays", async () => {
    const mockQueries = [
      {
        id: "q-str",
        user_id: "u1",
        created_at: "2026-03-01T00:00:00Z",
        subject: "With string attachment",
        attachments: JSON.stringify([
          {
            type: "image",
            name: "art.jpg",
            uri: "uri-99",
            mime_type: "image/jpeg",
          },
        ]),
      },
    ];
    const mockDb = {
      getAll: vi.fn().mockImplementation((store) => {
        if (store === STORE.USER_QUERIES) return Promise.resolve(mockQueries);
        return Promise.resolve([]);
      }),
    };
    vi.spyOn(idb, "getDB").mockResolvedValue(mockDb as any);

    const { result } = renderHook(() => useQueries(), {
      wrapper: createQueryWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.[0].attachments).toEqual([
      {
        type: "image",
        name: "art.jpg",
        uri: "uri-99",
        mime_type: "image/jpeg",
      },
    ]);
  });
});
