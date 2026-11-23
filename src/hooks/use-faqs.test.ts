import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { STORE } from "@/constants";
import * as idb from "@/lib/idb";
import { createQueryWrapper } from "@/test-utils";
import { useFaqs } from "./use-faqs";

describe("useFaqs", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should fetch sorted faq categories and faqs", async () => {
    const mockCategories = [
      { id: 2, order_ind: 2, name: "General" },
      { id: 1, order_ind: 1, name: "Account" },
    ];
    const mockFaqs = [
      { id: 20, order_ind: 2, question: "Q2" },
      { id: 10, order_ind: 1, question: "Q1" },
    ];

    const mockDb = {
      getAll: vi.fn().mockImplementation((store) => {
        if (store === STORE.FAQ_CATEGORIES)
          return Promise.resolve(mockCategories);
        if (store === STORE.FAQS) return Promise.resolve(mockFaqs);
        return Promise.resolve([]);
      }),
    };
    vi.spyOn(idb, "getDB").mockResolvedValue(mockDb as any);

    const { result } = renderHook(() => useFaqs(), {
      wrapper: createQueryWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.categories[0].id).toBe(1);
    expect(result.current.data?.faqs[0].id).toBe(10);
  });
});
