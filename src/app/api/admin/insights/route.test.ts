import { describe, expect, it, vi } from "vitest";
import { GET } from "./route";

vi.mock("@/lib/auth-server", () => ({
  getSessionFromRequest: vi.fn().mockResolvedValue({
    userId: "1",
    email: "admin@rsp.com",
    name: "Admin",
    role: 1,
  }),
}));

vi.mock("@/lib/db", () => ({
  default: {
    query: vi.fn().mockImplementation((sql: string) => {
      if (sql.includes("COUNT(DISTINCT visitor_id)")) {
        return Promise.resolve({
          rows: [
            {
              total_visitors: 42,
              guest_visitors: 30,
              logged_in_visitors: 12,
              total_pageviews: 150,
              discourse_visitors: 25,
              donate_visitors: 5,
            },
          ],
        });
      }
      if (sql.includes("TO_CHAR(DATE_TRUNC")) {
        return Promise.resolve({
          rows: [
            {
              date: "2026-11-23",
              visitors: 42,
              guest_visitors: 30,
              logged_in_visitors: 12,
              pageviews: 150,
            },
          ],
        });
      }
      if (sql.includes("GROUP BY page_path")) {
        return Promise.resolve({
          rows: [
            {
              page_path: "/categories/gita",
              views: 50,
              unique_visitors: 20,
              guest_visitors: 15,
              logged_in_visitors: 5,
            },
          ],
        });
      }
      if (sql.includes("GROUP BY device_type")) {
        return Promise.resolve({
          rows: [
            { device: "desktop", count: 30 },
            { device: "mobile", count: 12 },
          ],
        });
      }
      if (sql.includes("pg_size_pretty")) {
        return Promise.resolve({
          rows: [{ size: "48 kB" }],
        });
      }
      return Promise.resolve({ rows: [] });
    }),
  },
}));

describe("GET /api/admin/insights", () => {
  it("returns calculated platform telemetry stats for admin", async () => {
    const req = new Request(
      "http://localhost:3002/api/admin/insights?period=7d",
      {
        method: "GET",
      },
    );

    const res = await GET(req as any);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.stats.totalVisitors).toBe(42);
    expect(data.stats.guestVisitors).toBe(30);
    expect(data.stats.loggedInVisitors).toBe(12);
    expect(data.tableSize).toBe("48 kB");
  });
});
