import { createClient } from "@supabase/supabase-js";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createAdminClient } from "./admin-server";

vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn().mockReturnValue({}),
}));

describe("admin-server createAdminClient", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should create Supabase client using secret key and prod schema", () => {
    createAdminClient();

    expect(createClient).toHaveBeenCalledWith(
      expect.any(String),
      expect.any(String),
      {
        db: {
          schema: "prod",
        },
      },
    );
  });
});
