import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Category } from "@/types";
import { useRecordingForm } from "./use-recording-form";

describe("useRecordingForm hook", () => {
  const mockCategories: Category[] = [
    {
      id: 1,
      name: "Bhagavad Gita",
      url_path: "gita",
      path: "1",
      order_ind: 1,
      allowed_roles: [1],
      img_id: null,
      created_at: "2026-01-01",
      updated_at: "2026-01-01",
    },
    {
      id: 2,
      name: "Chapter 1",
      url_path: "ch1",
      path: "1.2",
      order_ind: 1,
      allowed_roles: [1],
      img_id: null,
      created_at: "2026-01-01",
      updated_at: "2026-01-01",
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
  });

  it("initializes default state and auto-selects defaults", () => {
    const { result } = renderHook(() =>
      useRecordingForm({
        categories: mockCategories,
        isLoadingCats: false,
        speakers: [{ id: 10, name: "Radheshyam Das" }],
        languages: [{ id: 20, name: "English" }],
        contentTypes: [{ id: 30, name: "Lecture" }],
        isLoadingDicts: false,
        preselectedPath: "ch1",
      }),
    );

    expect(result.current.form.selectedParentId).toBe(2);
    expect(result.current.form.selectedSpeakers).toContain("10");
    expect(result.current.form.selectedLanguages).toContain("20");
    expect(result.current.form.selectedType).toBe("30");
  });

  it("updates individual form fields and persists to sessionStorage", () => {
    const { result } = renderHook(() =>
      useRecordingForm({
        categories: mockCategories,
        isLoadingCats: false,
        speakers: [],
        languages: [],
        contentTypes: [],
        isLoadingDicts: false,
        preselectedPath: null,
      }),
    );

    act(() => {
      result.current.updateField("name", "New Discourse");
      result.current.updateField(
        "youtubeUrl",
        "https://youtube.com/watch?v=123",
      );
    });

    expect(result.current.form.name).toBe("New Discourse");
    expect(result.current.form.youtubeUrl).toBe(
      "https://youtube.com/watch?v=123",
    );

    act(() => {
      result.current.resetForm();
    });

    expect(result.current.form.name).toBe("");
  });
});
