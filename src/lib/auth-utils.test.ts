import { redirect } from "next/navigation";
import { beforeEach, describe, expect, it, vi } from "vitest";
import * as adminServer from "./admin-server";
import { isAdmin, verifyAdmin } from "./auth-utils";
import * as server from "./server";

vi.mock("next/navigation", () => ({
  redirect: vi.fn(),
}));

describe("auth-utils", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("verifyAdmin", () => {
    it("should redirect or throw if user is not authenticated", async () => {
      const mockSupabase = {
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: null },
            error: new Error("No user"),
          }),
        },
      };
      vi.spyOn(server, "createClient").mockResolvedValue(
        mockSupabase as unknown as Awaited<
          ReturnType<typeof server.createClient>
        >,
      );

      await expect(verifyAdmin()).rejects.toThrow(
        "Unauthorized: Not logged in",
      );

      await expect(verifyAdmin(true)).rejects.toThrow();
      expect(redirect).toHaveBeenCalledWith("/auth/login");
    });

    it("should return user if app_metadata role_id is 1 (fast path)", async () => {
      const mockUser = {
        id: "user-123",
        app_metadata: { role_id: 1 },
      };
      const mockSupabase = {
        auth: {
          getUser: vi
            .fn()
            .mockResolvedValue({ data: { user: mockUser }, error: null }),
        },
      };
      vi.spyOn(server, "createClient").mockResolvedValue(
        mockSupabase as unknown as Awaited<
          ReturnType<typeof server.createClient>
        >,
      );

      const user = await verifyAdmin();
      expect(user).toBe(mockUser);
    });

    it("should query database profile if JWT role_id is not 1", async () => {
      const mockUser = {
        id: "user-123",
        app_metadata: { role_id: 2 },
      };
      const mockSupabase = {
        auth: {
          getUser: vi
            .fn()
            .mockResolvedValue({ data: { user: mockUser }, error: null }),
        },
      };
      vi.spyOn(server, "createClient").mockResolvedValue(
        mockSupabase as unknown as Awaited<
          ReturnType<typeof server.createClient>
        >,
      );

      const singleMock = vi.fn().mockResolvedValue({
        data: { id: "user-123", role_id: 1 },
        error: null,
      });
      const eqMock = vi.fn().mockReturnValue({ single: singleMock });
      const selectMock = vi.fn().mockReturnValue({ eq: eqMock });
      const fromMock = vi.fn().mockReturnValue({ select: selectMock });
      const mockAdminClient = { from: fromMock };

      vi.spyOn(adminServer, "createAdminClient").mockReturnValue(
        mockAdminClient as unknown as ReturnType<
          typeof adminServer.createAdminClient
        >,
      );

      const user = await verifyAdmin();
      expect(user).toBe(mockUser);
    });

    it("should throw if database profile does not have admin role_id", async () => {
      const mockUser = {
        id: "user-123",
        app_metadata: {},
      };
      const mockSupabase = {
        auth: {
          getUser: vi
            .fn()
            .mockResolvedValue({ data: { user: mockUser }, error: null }),
        },
      };
      vi.spyOn(server, "createClient").mockResolvedValue(
        mockSupabase as unknown as Awaited<
          ReturnType<typeof server.createClient>
        >,
      );

      const singleMock = vi.fn().mockResolvedValue({
        data: { id: "user-123", role_id: 2 },
        error: null,
      });
      const eqMock = vi.fn().mockReturnValue({ single: singleMock });
      const selectMock = vi.fn().mockReturnValue({ eq: eqMock });
      const fromMock = vi.fn().mockReturnValue({ select: selectMock });
      const mockAdminClient = { from: fromMock };

      vi.spyOn(adminServer, "createAdminClient").mockReturnValue(
        mockAdminClient as unknown as ReturnType<
          typeof adminServer.createAdminClient
        >,
      );

      await expect(verifyAdmin()).rejects.toThrow(
        "Unauthorized: Admin role required",
      );

      await expect(verifyAdmin(true)).rejects.toThrow();
      expect(redirect).toHaveBeenCalledWith("/unauthorized");
    });
  });

  describe("isAdmin", () => {
    it("should return true when verifyAdmin succeeds", async () => {
      const mockUser = {
        id: "user-123",
        app_metadata: { role_id: 1 },
      };
      const mockSupabase = {
        auth: {
          getUser: vi
            .fn()
            .mockResolvedValue({ data: { user: mockUser }, error: null }),
        },
      };
      vi.spyOn(server, "createClient").mockResolvedValue(
        mockSupabase as unknown as Awaited<
          ReturnType<typeof server.createClient>
        >,
      );

      const result = await isAdmin();
      expect(result).toBe(true);
    });

    it("should return false when verifyAdmin fails", async () => {
      const mockSupabase = {
        auth: {
          getUser: vi
            .fn()
            .mockResolvedValue({ data: { user: null }, error: new Error() }),
        },
      };
      vi.spyOn(server, "createClient").mockResolvedValue(
        mockSupabase as unknown as Awaited<
          ReturnType<typeof server.createClient>
        >,
      );

      const result = await isAdmin();
      expect(result).toBe(false);
    });
  });
});
