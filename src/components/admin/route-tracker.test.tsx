import { render } from "@testing-library/react";
import * as navigation from "next/navigation";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AUTH_REDIRECT_STORAGE_KEY } from "@/lib/auth-redirect";
import { RouteTracker } from "./route-tracker";

describe("RouteTracker", () => {
  beforeEach(() => {
    window.sessionStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    window.sessionStorage.clear();
  });

  it("stores the current pathname and search params in sessionStorage", () => {
    vi.spyOn(navigation, "usePathname").mockReturnValue("/queries");
    vi.spyOn(navigation, "useSearchParams").mockReturnValue(
      new URLSearchParams("id=q-10") as any,
    );

    render(<RouteTracker />);

    expect(window.sessionStorage.getItem(AUTH_REDIRECT_STORAGE_KEY)).toBe(
      "/queries?id=q-10",
    );
  });

  it("stores pathname without search params when query is empty", () => {
    vi.spyOn(navigation, "usePathname").mockReturnValue("/content/categories");
    vi.spyOn(navigation, "useSearchParams").mockReturnValue(
      new URLSearchParams() as any,
    );

    render(<RouteTracker />);

    expect(window.sessionStorage.getItem(AUTH_REDIRECT_STORAGE_KEY)).toBe(
      "/content/categories",
    );
  });
});
