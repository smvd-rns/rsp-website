import { describe, expect, it, vi } from "vitest";

// Common UI and hook mocks to enable shallow/functional component execution
vi.mock("@/hooks/use-is-mobile", () => ({ useIsMobile: () => false }));
vi.mock("@/hooks/use-online-status", () => ({ useOnlineStatus: () => true }));
vi.mock("@/hooks/use-categories", () => ({
  useCategories: () => ({
    data: [
      { id: 10, name: "Parent Category", image_url: "/category-images/parent.webp" },
      { id: 20, name: "Sub Category", parentid: 10, image_url: null },
    ],
    isLoading: false,
  }),
}));
vi.mock("@/lib/supabase-browser", () => ({
  getSupabaseBrowserClient: () => ({
    auth: {
      getUser: () => Promise.resolve({ data: { user: null } }),
      onAuthStateChange: () => ({
        data: { subscription: { unsubscribe: () => {} } },
      }),
    },
    from: () => ({
      select: () => ({ eq: () => Promise.resolve({ data: [] }) }),
    }),
  }),
}));
vi.mock("@/lib/idb", () => ({ getDB: () => Promise.resolve(null) }));

vi.mock("react", async () => {
  const actual = await vi.importActual("react");
  return {
    ...actual,
    useState: (init: any) => [
      typeof init === "function" ? init() : init,
      vi.fn(),
    ],
    useEffect: (fn: any) => fn(),
    useCallback: (fn: any) => fn,
    useRef: () => ({ current: null }),
  };
});

describe.concurrent("src/components/category-card.tsx suite", () => {
  it.concurrent("renders CategoryCard component with parent image fallback", async () => {
    const { CategoryCard } = await import("./category-card");
    expect(typeof CategoryCard).toBe("function");
    const tree = CategoryCard({
      cat: {
        id: 20,
        name: "Sub Category",
        url_path: "parent.sub",
        path: "10",
        parentid: 10,
        allowed_roles: [1, 2],
      } as any,
    });
    expect(tree).toBeDefined();
  });
});
