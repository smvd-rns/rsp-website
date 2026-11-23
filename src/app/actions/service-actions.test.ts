import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as adminServer from "@/lib/admin-server";
import * as authUtils from "@/lib/auth-utils";
import {
  createResponsibility,
  createServiceAssignment,
  deleteResponsibility,
  deleteServiceAssignment,
  deleteServiceInterest,
  updateResponsibility,
  updateServiceAssignment,
} from "./service-actions";

describe("service-actions", () => {
  let mockAdminClient: any;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(authUtils, "verifyAdmin").mockResolvedValue({
      id: "admin-1",
    } as any);

    mockAdminClient = {
      from: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      select: vi
        .fn()
        .mockResolvedValue({ data: [{ id: "res1" }], error: null }),
      eq: vi.fn().mockImplementation(() => mockAdminClient),
    };

    vi.spyOn(adminServer, "createAdminClient").mockReturnValue(mockAdminClient);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should create, update, and delete service assignments", async () => {
    const resCreate = await createServiceAssignment({
      userId: "u1",
      serviceId: 1,
      role: "Lead",
      status: "active",
      startedAt: "2026-01-01",
    });
    expect(resCreate).toBeDefined();

    const resUpdate = await updateServiceAssignment("a1", {
      role: "Member",
      status: "completed",
      startedAt: "2026-01-01",
    });
    expect(resUpdate).toBeDefined();

    const resDelete = await deleteServiceAssignment("a1");
    expect(resDelete.success).toBe(true);
  });

  it("should delete service interest", async () => {
    const res = await deleteServiceInterest("u1", 1);
    expect(res.success).toBe(true);
  });

  it("should create, update, and delete responsibilities", async () => {
    const resCreate = await createResponsibility({
      userId: "u1",
      title: "Audio Tech",
      startedAt: "2026-01-01",
    });
    expect(resCreate).toBeDefined();

    const resUpdate = await updateResponsibility("r1", {
      title: "Senior Audio Tech",
    });
    expect(resUpdate).toBeDefined();

    const resDelete = await deleteResponsibility("r1");
    expect(resDelete.success).toBe(true);
  });
});
