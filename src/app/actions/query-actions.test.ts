import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as adminServer from "@/lib/admin-server";
import * as authUtils from "@/lib/auth-utils";
import * as revalidateModule from "@/lib/revalidate";
import {
  createQueryReply,
  forwardQueryEmailAction,
  updateQueryStatus,
} from "./query-actions";

vi.mock("@/lib/revalidate", () => ({
  revalidateQueries: vi.fn().mockResolvedValue(undefined),
}));

const mockResendSend = vi
  .fn()
  .mockResolvedValue({ data: { id: "msg_123" }, error: null });
vi.mock("resend", () => ({
  Resend: class {
    emails = {
      send: mockResendSend,
    };
  },
}));

describe("query-actions", () => {
  let mockAdminClient: any;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.RESEND_API_KEY = "test_key";
    vi.spyOn(authUtils, "verifyAdmin").mockResolvedValue({
      id: "admin-1",
    } as any);

    mockAdminClient = {
      from: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      insert: vi.fn().mockResolvedValue({ error: null }),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: { status: "open" } }),
      eq: vi.fn().mockImplementation(() => mockAdminClient),
    };

    vi.spyOn(adminServer, "createAdminClient").mockReturnValue(mockAdminClient);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should update query status and trigger revalidation", async () => {
    const res = await updateQueryStatus("q1", "resolved");
    expect(res.success).toBe(true);
    expect(revalidateModule.revalidateQueries).toHaveBeenCalled();
  });

  it("should create query reply, auto-transition open query to in_progress, and trigger revalidation", async () => {
    const res = await createQueryReply("q1", "Here is an answer");
    expect(res.success).toBe(true);
    expect(mockAdminClient.from).toHaveBeenCalledWith("query_replies");
    expect(revalidateModule.revalidateQueries).toHaveBeenCalled();
  });

  it("should pass attachments to query_replies insert", async () => {
    const attachments = [
      {
        type: "link" as const,
        title: "Study Link",
        uri: "https://example.com/verse",
      },
    ];
    const res = await createQueryReply("q1", "Here is an answer", attachments);
    expect(res.success).toBe(true);
    expect(mockAdminClient.insert).toHaveBeenCalledWith({
      query_id: "q1",
      user_id: "admin-1",
      message: "Here is an answer",
      attachments,
    });
  });

  describe("forwardQueryEmailAction", () => {
    it("fails when recipient emails are empty or invalid", async () => {
      const res = await forwardQueryEmailAction({
        query: { id: "q1" } as any,
        recipientEmails: ["invalid-email"],
      });
      expect(res.success).toBe(false);
      expect(res.error).toMatch(/valid recipient email/i);
    });

    it("fails when RESEND_API_KEY is missing", async () => {
      delete process.env.RESEND_API_KEY;
      const res = await forwardQueryEmailAction({
        query: { id: "q1" } as any,
        recipientEmails: ["user@example.com"],
      });
      expect(res.success).toBe(false);
      expect(res.error).toMatch(/Resend API key is not configured/i);
    });

    it("forwards email with deep link, replyTo, and note", async () => {
      const mockQueryData = {
        id: "q-xyz",
        subject: "Spiritual practice inquiry",
        message: "How many rounds should I chant?",
        category: "spiritual_query",
        status: "open",
        created_at: new Date().toISOString(),
        guest_name: "Bhakta John",
        guest_email: "john@example.com",
        attachments: [],
        users: null,
      };

      const res = await forwardQueryEmailAction({
        query: mockQueryData as any,
        recipientEmails: ["preacher@iskcon.org"],
        note: "Please help guide this seeker.",
      });

      expect(res.success).toBe(true);
      expect(res.forwardRecord).toBeDefined();
      expect(res.forwardRecord?.forwarded_to).toEqual(["preacher@iskcon.org"]);
      expect(res.forwardRecord?.note).toBe("Please help guide this seeker.");
      expect(mockResendSend).toHaveBeenCalledTimes(1);

      const callArgs = mockResendSend.mock.calls[0][0];
      expect(callArgs.from).toBe("RSP Admin <noreply@radheshyamdas.com>");
      expect(callArgs.to).toEqual(["preacher@iskcon.org"]);
      expect(callArgs.replyTo).toBe("Bhakta John <john@example.com>");
      expect(callArgs.subject).toContain("Spiritual practice inquiry");
      expect(callArgs.html).toContain("queries?id=q-xyz");
      expect(callArgs.html).toContain("Please help guide this seeker.");
      expect(callArgs.html).toContain("noreply@radheshyamdas.com");
      expect(callArgs.html).toContain("Option 1: Reply via Admin Dashboard");
      expect(callArgs.html).toContain("Option 2: Reply directly via Email");
      expect(callArgs.html).toContain("typing <code>@</code>");
      expect(mockAdminClient.from).toHaveBeenCalledWith("user_queries");
      expect(mockAdminClient.update).toHaveBeenCalled();
    });

    it("renders attachments properly when attachments is a JSON string", async () => {
      const mockQueryData = {
        id: "q-att",
        subject: "Photo question",
        message: "Check this photo",
        category: "general",
        status: "open",
        created_at: new Date().toISOString(),
        guest_name: "John",
        guest_email: "john@example.com",
        attachments: JSON.stringify([
          {
            type: "image",
            name: "deity.jpg",
            uri: "drive-img-123",
            mime_type: "image/jpeg",
          },
        ]),
        users: null,
      };

      const res = await forwardQueryEmailAction({
        query: mockQueryData as any,
        recipientEmails: ["admin@iskcon.org"],
      });

      expect(res.success).toBe(true);
      const callArgs = mockResendSend.mock.calls[0][0];
      expect(callArgs.html).toContain("Attached Resources (1)");
      expect(callArgs.html).toContain("deity.jpg");
      expect(callArgs.html).toContain(
        "drive.google.com/file/d/drive-img-123/view",
      );
    });

    it("handles invalid or empty string attachments gracefully", async () => {
      const mockQueryData = {
        id: "q-invalid-att",
        subject: "Malformed attachment question",
        message: "No crash please",
        category: "general",
        status: "open",
        created_at: new Date().toISOString(),
        guest_name: "John",
        guest_email: "john@example.com",
        attachments: "invalid-json{",
        users: null,
      };

      const res = await forwardQueryEmailAction({
        query: mockQueryData as any,
        recipientEmails: ["admin@iskcon.org"],
      });

      expect(res.success).toBe(true);
      const callArgs = mockResendSend.mock.calls[0][0];
      expect(callArgs.html).not.toContain("Attached Resources");
    });
  });
});
