import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createClient } from "./server";

vi.mock("@supabase/ssr", () => ({
  createServerClient: vi.fn().mockReturnValue({ auth: {} }),
}));

describe("server createClient", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should create server client with cookies and prod schema", async () => {
    const mockCookieStore = {
      getAll: vi.fn().mockReturnValue([{ name: "test", value: "val" }]),
      set: vi.fn(),
    };
    vi.mocked(cookies).mockResolvedValue(
      mockCookieStore as unknown as Awaited<ReturnType<typeof cookies>>,
    );

    await createClient();

    expect(createServerClient).toHaveBeenCalledWith(
      expect.any(String),
      expect.any(String),
      expect.objectContaining({
        db: { schema: "prod" },
      }),
    );

    // Test cookies wrapper methods
    const optionsPassed = vi.mocked(createServerClient).mock.calls[0][2] as any;
    expect(optionsPassed.cookies?.getAll?.()).toEqual([
      { name: "test", value: "val" },
    ]);

    optionsPassed.cookies?.setAll?.([
      { name: "session", value: "token", options: {} },
    ]);
    expect(mockCookieStore.set).toHaveBeenCalledWith("session", "token", {});
  });
});
