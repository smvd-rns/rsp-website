import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as adminServer from "@/lib/admin-server";
import * as authUtils from "@/lib/auth-utils";
import {
  createFaq,
  createFaqCategory,
  deleteFaq,
  deleteFaqCategory,
  reorderFaqCategories,
  reorderFaqs,
  updateFaq,
  updateFaqCategory,
} from "./faq-actions";

describe("faq-actions", () => {
  let mockAdminClient: any;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(authUtils, "verifyAdmin").mockResolvedValue({
      id: "admin-1",
    } as any);

    mockAdminClient = {
      from: vi.fn().mockReturnThis(),
      insert: vi.fn().mockResolvedValue({ error: null }),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({ error: null }),
      rpc: vi.fn().mockResolvedValue({ error: null }),
    };

    vi.spyOn(adminServer, "createAdminClient").mockReturnValue(mockAdminClient);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should create, update, delete, and reorder faq categories", async () => {
    const resCreate = await createFaqCategory({
      name: "General",
      slug: "general",
    });
    expect(resCreate.success).toBe(true);

    const resUpdate = await updateFaqCategory(1, {
      name: "General Updated",
      slug: "general",
    });
    expect(resUpdate.success).toBe(true);

    const resDelete = await deleteFaqCategory(1);
    expect(resDelete.success).toBe(true);

    const resReorder = await reorderFaqCategories([{ id: 1, order_ind: 1 }]);
    expect(resReorder.success).toBe(true);
  });

  it("should create, update, delete, and reorder faqs", async () => {
    const resCreate = await createFaq({
      category_id: 1,
      question: "Q1",
      answer: "A1",
    });
    expect(resCreate.success).toBe(true);

    const resUpdate = await updateFaq(10, {
      category_id: 1,
      question: "Q1 updated",
      answer: "A1",
    });
    expect(resUpdate.success).toBe(true);

    const resDelete = await deleteFaq(10);
    expect(resDelete.success).toBe(true);

    const resReorder = await reorderFaqs([{ id: 10, order_ind: 2 }]);
    expect(resReorder.success).toBe(true);
  });
});
