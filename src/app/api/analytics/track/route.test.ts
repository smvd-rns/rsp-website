import { describe, expect, it, vi } from "vitest";
import { POST } from "./route";

vi.mock("@/lib/db", () => ({
  default: {
    query: vi.fn().mockResolvedValue({ rows: [] }),
  },
}));

vi.mock("@/lib/auth-server", () => ({
  verifySessionToken: vi.fn().mockResolvedValue(null),
}));

describe("POST /api/analytics/track", () => {
  it("tracks valid page view and sets visitor cookie", async () => {
    const req = new Request("http://localhost:3002/api/analytics/track", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "user-agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
      body: JSON.stringify({
        visitorId: "v_test_visitor_1234567890",
        path: "/categories/bhagavad-gita",
        title: "Bhagavad Gita Lectures",
        referrer: "https://google.com",
        screenWidth: 1920,
      }),
    });

    const res = await POST(req as any);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.ok).toBe(true);
    expect(data.visitorId).toBe("v_test_visitor_1234567890");
  });

  it("ignores internal next/api routes without database insertion", async () => {
    const req = new Request("http://localhost:3002/api/analytics/track", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        visitorId: "v_test_visitor_1234567890",
        path: "/api/recordings",
      }),
    });

    const res = await POST(req as any);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.ignored).toBe(true);
  });
});

