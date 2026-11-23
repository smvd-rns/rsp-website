import { createBrowserClient } from "@supabase/ssr";
import { describe, expect, it, vi } from "vitest";
import { createClient } from "./client";

vi.mock("@supabase/ssr", () => ({
  createBrowserClient: vi.fn().mockReturnValue({ auth: {} }),
}));

describe("client createClient", () => {
  it("should create browser client and cache singleton", () => {
    const c1 = createClient();
    const c2 = createClient();
    expect(c1).toBe(c2);
    expect(createBrowserClient).toHaveBeenCalledTimes(1);
  });
});
