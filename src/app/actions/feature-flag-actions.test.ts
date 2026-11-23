import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  createFeatureFlag,
  deleteFeatureFlag,
  getFeatureFlags,
  toggleFeatureFlag,
  updateFeatureFlag,
} from "./feature-flag-actions";

vi.mock("@/lib/auth-utils", () => ({
  verifyAdmin: vi.fn().mockResolvedValue(true),
}));

const mockInsert = vi.fn();
const mockUpdate = vi.fn();
const mockDelete = vi.fn();
const mockSelect = vi.fn();
const mockOrder = vi.fn();
const mockEq = vi.fn();

vi.mock("@/lib/admin-server", () => ({
  createAdminClient: () => ({
    from: (table: string) => {
      if (table === "feature_flags") {
        return {
          select: mockSelect.mockReturnValue({
            order: mockOrder.mockResolvedValue({
              data: [
                {
                  id: "test_flag",
                  name: "Test Flag",
                  is_enabled: true,
                  is_ga: false,
                  allowed_roles: [1],
                  allowed_emails: ["user@example.com"],
                },
              ],
              error: null,
            }),
          }),
          insert: mockInsert.mockResolvedValue({ error: null }),
          update: mockUpdate.mockReturnValue({
            eq: mockEq.mockResolvedValue({ error: null }),
          }),
          delete: mockDelete.mockReturnValue({
            eq: mockEq.mockResolvedValue({ error: null }),
          }),
        };
      }
      return {};
    },
  }),
}));

describe("feature-flag-actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fetches feature flags successfully", async () => {
    const res = await getFeatureFlags();
    expect(res.success).toBe(true);
    expect(res.data).toHaveLength(1);
    expect(res.data?.[0].id).toBe("test_flag");
  });

  it("creates a new feature flag", async () => {
    const res = await createFeatureFlag({
      id: "NEW_FEATURE",
      name: "New Feature",
      description: "Description",
      is_enabled: true,
      is_ga: true,
      allowed_roles: [1, 2],
      allowed_emails: ["A@B.COM"],
    });
    expect(res.success).toBe(true);
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "new_feature",
        name: "New Feature",
        is_ga: true,
        allowed_emails: ["a@b.com"],
      }),
    );
  });

  it("updates an existing feature flag", async () => {
    const res = await updateFeatureFlag("test_flag", {
      name: "Updated Name",
      is_enabled: false,
    });
    expect(res.success).toBe(true);
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "Updated Name",
        is_enabled: false,
      }),
    );
  });

  it("toggles a feature flag", async () => {
    const res = await toggleFeatureFlag("test_flag", false);
    expect(res.success).toBe(true);
    expect(mockUpdate).toHaveBeenCalledWith({ is_enabled: false });
  });

  it("deletes a feature flag", async () => {
    const res = await deleteFeatureFlag("test_flag");
    expect(res.success).toBe(true);
    expect(mockDelete).toHaveBeenCalled();
  });
});
