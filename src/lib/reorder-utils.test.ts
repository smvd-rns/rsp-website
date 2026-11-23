import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";
import type { Database } from "@/database.types";
import {
  executeParallelReorder,
  reorderItems,
  swapAndReorder,
  toReorderPayload,
} from "./reorder-utils";

describe("reorder-utils", () => {
  describe("reorderItems", () => {
    it("moves items within array correctly", () => {
      const items = [{ id: 1 }, { id: 2 }, { id: 3 }];
      const reordered = reorderItems(items, 1, 3);
      expect(reordered.map((i) => i.id)).toEqual([2, 3, 1]);
    });

    it("returns unchanged array if active or over id not found", () => {
      const items = [{ id: 1 }, { id: 2 }];
      expect(reorderItems(items, 999, 1)).toEqual(items);
      expect(reorderItems(items, 1, 999)).toEqual(items);
    });
  });

  describe("toReorderPayload", () => {
    it("generates correct order_ind mapping", () => {
      const items = [
        { id: 10, order_ind: 1 },
        { id: 20, order_ind: 2 },
        { id: 30, order_ind: 0 },
      ];
      expect(toReorderPayload(items)).toEqual([
        { id: 10, order_ind: 0 },
        { id: 20, order_ind: 1 },
        { id: 30, order_ind: 2 },
      ]);
    });
  });

  describe("swapAndReorder", () => {
    it("swaps up correctly", () => {
      const items = [
        { id: 10, order_ind: 0 },
        { id: 20, order_ind: 1 },
        { id: 30, order_ind: 2 },
      ];
      const payload = swapAndReorder(items, 1, "up");
      expect(payload).toEqual([
        { id: 20, order_ind: 0 },
        { id: 10, order_ind: 1 },
      ]);
    });

    it("swaps down correctly", () => {
      const items = [
        { id: 10, order_ind: 0 },
        { id: 20, order_ind: 1 },
        { id: 30, order_ind: 2 },
      ];
      const payload = swapAndReorder(items, 1, "down");
      expect(payload).toEqual([
        { id: 30, order_ind: 1 },
        { id: 20, order_ind: 2 },
      ]);
    });

    it("returns null on out-of-bounds swap", () => {
      const items = [
        { id: 10, order_ind: 0 },
        { id: 20, order_ind: 1 },
      ];
      expect(swapAndReorder(items, 0, "up")).toBeNull();
      expect(swapAndReorder(items, 1, "down")).toBeNull();
    });
  });

  describe("executeParallelReorder", () => {
    it("executes parallel updates successfully", async () => {
      const mockRpc = vi.fn().mockResolvedValue({ error: null });
      const client = { rpc: mockRpc } as unknown as SupabaseClient<
        Database,
        "prod",
        "prod"
      >;

      const res = await executeParallelReorder(client, "test_table", [
        { id: 1, order_ind: 0 },
        { id: 2, order_ind: 1 },
      ]);

      expect(res.success).toBe(true);
      expect(mockRpc).toHaveBeenCalledWith("reorder_items", {
        p_table_name: "test_table",
        p_items: [
          { id: 1, order_ind: 0 },
          { id: 2, order_ind: 1 },
        ],
      });
    });

    it("returns failure when an update errors", async () => {
      const mockRpc = vi
        .fn()
        .mockResolvedValue({ error: { message: "DB Error" } });
      const client = { rpc: mockRpc } as unknown as SupabaseClient<
        Database,
        "prod",
        "prod"
      >;

      const res = await executeParallelReorder(client, "test_table", [
        { id: 1, order_ind: 0 },
      ]);

      expect(res.success).toBe(false);
      expect(res.error).toBe("DB Error");
    });
  });
});
