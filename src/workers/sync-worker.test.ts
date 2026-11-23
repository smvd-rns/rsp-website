import { beforeEach, describe, expect, it, vi } from "vitest";
import { STORE, WORKER_MSG } from "@/constants";
import * as idb from "@/lib/idb";
import * as workerUtils from "./utils";

describe("sync worker (sync.ts)", () => {
  let mockPostMessage: any;
  let mockDb: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockPostMessage = vi.fn();
    (globalThis as any).postMessage = mockPostMessage;
    (globalThis as any).self = {
      location: { origin: "http://localhost:3000" },
      postMessage: mockPostMessage,
    };

    mockDb = {
      getAll: vi.fn().mockResolvedValue([]),
      get: vi.fn().mockResolvedValue({ url_path: "meditation" }),
      transaction: vi.fn().mockReturnValue({
        store: { put: vi.fn().mockResolvedValue(undefined) },
        done: Promise.resolve(),
      }),
    };

    vi.spyOn(idb, "getDB").mockResolvedValue(mockDb as any);
  });

  it("should handle start sync event and process payload", async () => {
    vi.spyOn(workerUtils, "isDatabaseStale").mockResolvedValue(false);
    vi.spyOn(workerUtils, "seedIndexedDB").mockResolvedValue(undefined as any);
    vi.spyOn(workerUtils, "applyDeltaTable").mockResolvedValue(
      undefined as any,
    );
    vi.spyOn(workerUtils, "applyDeletedRecords").mockResolvedValue(
      undefined as any,
    );

    const mockFetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes("/api/admin/sync/meta")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ categories: "2026-08-30T00:00:00Z" }),
        });
      }
      return Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            changed: true,
            sync_meta: { categories: "2026-08-30T00:00:00Z" },
            deltas: {
              [STORE.CATEGORIES]: [{ id: 10, name: "Meditation" }],
              [STORE.DELETED_RECORDS]: [
                { table_name: "recordings", record_id: "99" },
              ],
            },
          }),
      });
    });
    globalThis.fetch = mockFetch as any;

    await import("./sync");

    const messageHandler = (globalThis as any).self.onmessage;
    expect(typeof messageHandler).toBe("function");

    // Ignored message
    await messageHandler({ data: { type: "OTHER_EVENT" } });

    // Start sync message
    await messageHandler({
      data: {
        type: WORKER_MSG.START_SYNC,
        targetTables: [STORE.CATEGORIES],
      },
    });

    expect(mockPostMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        type: WORKER_MSG.SUCCESS,
      }),
    );
  });
});
