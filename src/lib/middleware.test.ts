import { createServerClient } from "@supabase/ssr";
import type { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { updateSession } from "./middleware";

vi.mock("@supabase/ssr", () => ({
  createServerClient: vi.fn(),
}));

describe("middleware updateSession", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.clearAllMocks();
  });

  it("should throw if environment variables are missing", async () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    const req = {
      cookies: { getAll: vi.fn().mockReturnValue([]) },
      nextUrl: {
        pathname: "/dashboard",
        clone: () => new URL("http://localhost:3000/dashboard"),
      },
    } as unknown as NextRequest;

    await expect(updateSession(req)).rejects.toThrow(
      "Missing Supabase environment variables",
    );
  });

  it("should redirect unauthenticated users away from protected routes", async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "test-key";

    vi.mocked(createServerClient).mockReturnValue({
      auth: {
        getClaims: vi.fn().mockResolvedValue({ data: null }),
      },
    } as unknown as ReturnType<typeof createServerClient>);

    const req = {
      cookies: { getAll: vi.fn().mockReturnValue([]), set: vi.fn() },
      nextUrl: {
        pathname: "/categories",
        clone: () => new URL("http://localhost:3000/categories"),
      },
    } as unknown as NextRequest;

    const res = await updateSession(req);
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toContain("/auth/login");
    expect(res.headers.get("location")).toContain("redirect_to=%2Fcategories");
  });

  it("should preserve path and search params in redirect_to when redirecting to login", async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "test-key";

    vi.mocked(createServerClient).mockReturnValue({
      auth: {
        getClaims: vi.fn().mockResolvedValue({ data: null }),
      },
    } as unknown as ReturnType<typeof createServerClient>);

    const req = {
      cookies: { getAll: vi.fn().mockReturnValue([]), set: vi.fn() },
      nextUrl: {
        pathname: "/queries",
        search: "?id=q-10",
        clone: () => new URL("http://localhost:3000/queries?id=q-10"),
      },
    } as unknown as NextRequest;

    const res = await updateSession(req);
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toContain(
      "/auth/login?redirect_to=%2Fqueries%3Fid%3Dq-10",
    );
  });

  it("should allow unauthenticated users to access /auth routes", async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "test-key";

    vi.mocked(createServerClient).mockReturnValue({
      auth: {
        getClaims: vi.fn().mockResolvedValue({ data: null }),
      },
    } as unknown as ReturnType<typeof createServerClient>);

    const req = {
      cookies: { getAll: vi.fn().mockReturnValue([]), set: vi.fn() },
      nextUrl: {
        pathname: "/auth/login",
        clone: () => new URL("http://localhost:3000/auth/login"),
      },
    } as unknown as NextRequest;

    const res = await updateSession(req);
    expect(res.status).toBe(200);
  });

  it("should allow authenticated users on protected routes and handle cookie setting", async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "test-key";

    let cookieSetter: (cookies: any) => void = () => {};
    vi.mocked(createServerClient).mockImplementation(
      (_url: any, _key: any, options: any) => {
        if (options.cookies?.setAll) {
          cookieSetter = options.cookies.setAll;
        }
        return {
          auth: {
            getClaims: vi.fn().mockResolvedValue({
              data: {
                claims: {
                  app_metadata: { role_id: 1 },
                },
              },
            }),
          },
        } as unknown as ReturnType<typeof createServerClient>;
      },
    );

    const cookieMap = new Map();
    const req = {
      cookies: {
        getAll: vi.fn().mockReturnValue([]),
        set: vi.fn((name, val) => cookieMap.set(name, val)),
      },
      nextUrl: {
        pathname: "/categories",
        clone: () => new URL("http://localhost:3000/categories"),
      },
    } as unknown as NextRequest;

    const res = await updateSession(req);
    expect(res.status).toBe(200);

    cookieSetter([{ name: "sb-auth", value: "tok" }]);
    expect(req.cookies.set).toHaveBeenCalledWith("sb-auth", "tok");
  });

  it("should fail closed and redirect to login when Supabase returns a 5xx error", async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "test-key";

    vi.mocked(createServerClient).mockReturnValue({
      auth: {
        getClaims: vi.fn().mockResolvedValue({
          data: null,
          error: { status: 500, message: "Internal Server Error" },
        }),
      },
    } as unknown as ReturnType<typeof createServerClient>);

    const req = {
      cookies: { getAll: vi.fn().mockReturnValue([]), set: vi.fn() },
      nextUrl: {
        pathname: "/categories",
        clone: () => new URL("http://localhost:3000/categories"),
      },
    } as unknown as NextRequest;

    const res = await updateSession(req);
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toContain("/auth/login");
  });
});
