import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  clearTrashAction,
  deleteCategoryPermanentlyAction,
  deleteRecordingPermanentlyAction,
} from "./trash-actions";

vi.mock("@/lib/auth-utils", () => ({
  verifyAdmin: vi.fn().mockResolvedValue(true),
}));

const mockDeleteCategoryPermanently = vi
  .fn()
  .mockResolvedValue({ success: true });
const mockDeleteRecordingPermanently = vi
  .fn()
  .mockResolvedValue({ success: true });
const mockClearTrashService = vi.fn().mockResolvedValue({
  success: true,
  deletedDriveCount: 2,
  deletedRecordingsCount: 1,
  deletedCategoriesCount: 1,
});

vi.mock("@/lib/upload-service", () => ({
  deleteCategoryPermanently: (id: number) => mockDeleteCategoryPermanently(id),
  deleteRecordingPermanently: (id: number) =>
    mockDeleteRecordingPermanently(id),
  clearTrashService: () => mockClearTrashService(),
}));

describe("trash-actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should prevent deleting root trash category (id: 1)", async () => {
    await expect(deleteCategoryPermanentlyAction(1)).rejects.toThrow(
      "Root trash category cannot be deleted.",
    );
    expect(mockDeleteCategoryPermanently).not.toHaveBeenCalled();
  });

  it("should delete category permanently", async () => {
    const res = await deleteCategoryPermanentlyAction(42);
    expect(mockDeleteCategoryPermanently).toHaveBeenCalledWith(42);
    expect(res).toEqual({ success: true });
  });

  it("should delete recording permanently", async () => {
    const res = await deleteRecordingPermanentlyAction(108);
    expect(mockDeleteRecordingPermanently).toHaveBeenCalledWith(108);
    expect(res).toEqual({ success: true });
  });

  it("should clear trash", async () => {
    const res = await clearTrashAction();
    expect(mockClearTrashService).toHaveBeenCalled();
    expect(res).toEqual({
      success: true,
      deletedDriveCount: 2,
      deletedRecordingsCount: 1,
      deletedCategoriesCount: 1,
    });
  });
});
