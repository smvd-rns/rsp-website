import { describe, expect, it, vi } from "vitest";

vi.mock("@/hooks/use-is-mobile", () => ({ useIsMobile: () => true }));
vi.mock("@/hooks/use-online-status", () => ({ useOnlineStatus: () => true }));
vi.mock("@/lib/supabase-browser", () => ({
  getSupabaseClient: () => ({
    auth: {
      signOut: () => Promise.resolve(),
    },
  }),
}));
vi.mock("next/navigation", () => ({
  usePathname: () => "/",
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));
vi.mock("./providers", () => ({
  useSession: () => ({ session: null, isLoading: false }),
}));

describe.concurrent("src/components/bottom-nav.tsx suite", () => {
  it.concurrent("exports BottomNav component", async () => {
    const { BottomNav } = await import("./bottom-nav");
    expect(typeof BottomNav).toBe("function");
  });
});

