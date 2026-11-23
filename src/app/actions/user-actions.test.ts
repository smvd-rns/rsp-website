import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as adminServer from "@/lib/admin-server";
import * as authUtils from "@/lib/auth-utils";
import {
  deleteWhitelistUser,
  updateUserEditRequestStatus,
} from "./user-actions";

const mockResendSend = vi
  .fn()
  .mockResolvedValue({ data: { id: "msg_user_123" }, error: null });

vi.mock("resend", () => ({
  Resend: class {
    emails = {
      send: mockResendSend,
    };
  },
}));

describe("user-actions", () => {
  let mockAdminClient: any;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.RESEND_API_KEY = "test_resend_key";
    vi.spyOn(authUtils, "verifyAdmin").mockResolvedValue({
      id: "admin-uid-1",
      email: "admin@radheshyamdas.com",
    } as any);

    const qb: any = {
      from: vi.fn(() => qb),
      select: vi.fn(() => qb),
      insert: vi.fn().mockResolvedValue({ error: null }),
      update: vi.fn(() => qb),
      delete: vi.fn(() => qb),
      eq: vi.fn(() => qb),
      maybeSingle: vi.fn().mockResolvedValue({
        data: null,
        error: null,
      }),
      single: vi.fn().mockResolvedValue({
        data: null,
        error: null,
      }),
      then: (resolve: any) =>
        resolve({
          data: [{ id: "req-1", status: "updated" }],
          error: null,
        }),
    };

    mockAdminClient = qb;
    vi.spyOn(adminServer, "createAdminClient").mockReturnValue(mockAdminClient);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("updateUserEditRequestStatus", () => {
    it("updates status to approved and sends email notification from noreply@radheshyamdas.com with logout/login note", async () => {
      // Setup mock queries:
      mockAdminClient.maybeSingle
        .mockResolvedValueOnce({
          // 1. fetch requestData
          data: {
            id: "req-1",
            user_id: "user-1",
            requested_role_id: 2,
            name: "Bhakta Ramesh",
            review_comment: "Welcome to the volunteer team!",
          },
          error: null,
        })
        .mockResolvedValueOnce({
          // 2. fetch targetUser
          data: {
            id: "user-1",
            email: "ramesh@example.com",
            name: "Bhakta Ramesh",
            role_id: 1,
          },
          error: null,
        })
        .mockResolvedValueOnce({
          // 3. fetch roleRow
          data: {
            id: 2,
            name: "Volunteer",
          },
          error: null,
        });

      const res = await updateUserEditRequestStatus("req-1", "approved", {
        requested_role_id: 2,
        review_comment: "Welcome to the volunteer team!",
      });

      expect(res).toBeDefined();
      expect(mockAdminClient.from).toHaveBeenCalledWith("user_edit_requests");
      expect(mockAdminClient.update).toHaveBeenCalled();

      // Check email sent via Resend
      expect(mockResendSend).toHaveBeenCalledTimes(1);
      const emailArgs = mockResendSend.mock.calls[0][0];

      expect(emailArgs.to).toBe("ramesh@example.com");
      expect(emailArgs.from).toBe("RSP Admin <noreply@radheshyamdas.com>");
      expect(emailArgs.subject).toContain("Approved");
      expect(emailArgs.html).toContain("Volunteer");
      expect(emailArgs.html).toContain("log out and log in again");
      expect(emailArgs.html).toContain("Welcome to the volunteer team!");
      expect(emailArgs.html).toContain("noreply@radheshyamdas.com");
      expect(emailArgs.html).toContain("This email is not monitored");
    });

    it("updates status to rejected and sends email notification with reviewer note", async () => {
      mockAdminClient.maybeSingle
        .mockResolvedValueOnce({
          data: {
            id: "req-2",
            user_id: "user-2",
            requested_role_id: 3,
            name: "Candidate",
            review_comment: "Please complete the prerequisites first.",
          },
          error: null,
        })
        .mockResolvedValueOnce({
          data: {
            id: "user-2",
            email: "candidate@example.com",
            name: "Candidate",
            role_id: 1,
          },
          error: null,
        });

      const res = await updateUserEditRequestStatus("req-2", "rejected", {
        review_comment: "Please complete the prerequisites first.",
      });

      expect(res).toBeDefined();
      expect(mockResendSend).toHaveBeenCalledTimes(1);
      const emailArgs = mockResendSend.mock.calls[0][0];

      expect(emailArgs.to).toBe("candidate@example.com");
      expect(emailArgs.from).toBe("RSP Admin <noreply@radheshyamdas.com>");
      expect(emailArgs.subject).toContain("Update on Your Profile Request");
      expect(emailArgs.html).toContain("not approved");
      expect(emailArgs.html).toContain(
        "Please complete the prerequisites first.",
      );
      expect(emailArgs.html).toContain("noreply@radheshyamdas.com");
      expect(emailArgs.html).toContain("This email is not monitored");
    });

    it("does not fail request update if email sending encounters an error", async () => {
      mockAdminClient.maybeSingle.mockResolvedValueOnce({
        data: {
          id: "req-3",
          user_id: "user-3",
        },
        error: null,
      });

      mockResendSend.mockRejectedValueOnce(new Error("Network timeout"));

      const res = await updateUserEditRequestStatus("req-3", "approved");
      expect(res).toBeDefined();
    });
  });

  describe("deleteWhitelistUser", () => {
    it("deletes user from whitelist", async () => {
      mockAdminClient.delete.mockReturnThis();
      mockAdminClient.eq.mockResolvedValue({ error: null });

      const res = await deleteWhitelistUser("test@example.com");
      expect(res.success).toBe(true);
      expect(mockAdminClient.from).toHaveBeenCalledWith("user_whitelist");
    });
  });
});
