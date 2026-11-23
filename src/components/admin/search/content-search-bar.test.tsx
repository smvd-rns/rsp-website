import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createQueryWrapper } from "@/test-utils";
import { ContentSearchBar } from "./content-search-bar";

vi.mock("next/navigation", () => ({
  usePathname: () => "/content/spiritual_discourses",
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
  }),
}));

describe("ContentSearchBar component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    document.body.innerHTML = "";
  });

  afterEach(() => {
    cleanup();
    document.body.innerHTML = "";
  });

  it("renders search input with placeholder", () => {
    const Wrapper = createQueryWrapper();
    render(
      <Wrapper>
        <ContentSearchBar />
      </Wrapper>,
    );

    const input = screen.getByRole("combobox");
    expect(input).toBeDefined();
    expect(input.getAttribute("placeholder")).toBe(
      "Search recordings, categories, materials...",
    );
  });
});
