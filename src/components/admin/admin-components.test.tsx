import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as providers from "@/components/providers";
import { createQueryWrapper } from "@/test-utils";
import { CategoryCombobox } from "./category-combobox";
import { Combobox } from "./combobox";
import { ContentHeader } from "./content-header";
import { UserNav } from "./user-nav";

describe("Admin core UI components", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    document.body.innerHTML = "";
    vi.spyOn(providers, "useSession").mockReturnValue({
      session: {
        user: { user_metadata: { full_name: "Admin User" } },
      } as any,
      isLoading: false,
    } as any);
  });

  afterEach(() => {
    cleanup();
    document.body.innerHTML = "";
    vi.restoreAllMocks();
  });

  it("ContentHeader should render content management header and links", () => {
    const Wrapper = createQueryWrapper();
    render(
      <Wrapper>
        <ContentHeader />
      </Wrapper>,
    );
    expect(screen.getByText("Content Management")).toBeDefined();
    expect(screen.getByText(/Add Recording/i)).toBeDefined();
    expect(screen.getByText(/Add Category/i)).toBeDefined();
  });

  it("UserNav should render user avatar trigger", () => {
    render(<UserNav />);
    expect(screen.getByRole("button")).toBeDefined();
    expect(screen.getByText("AU")).toBeDefined();
  });

  it("Combobox should display selected value and placeholder", () => {
    const items = [
      { value: "1", label: "Option One" },
      { value: "2", label: "Option Two" },
    ];
    const onChange = vi.fn();

    render(
      <Combobox
        items={items}
        value="1"
        onValueChange={onChange}
        placeholder="Select option..."
      />,
    );
    expect(screen.getByText("Option One")).toBeDefined();
  });

  it("CategoryCombobox should display selected category and render include url path checkbox", () => {
    const categories = [
      { id: 10, name: "Category 1", url_path: "cat_1", path: "0" },
      { id: 20, name: "Category 2", url_path: "cat_2", path: "0.10" },
    ];
    const onChange = vi.fn();

    render(
      <CategoryCombobox
        categories={categories as any}
        value={10}
        onChange={onChange}
      />,
    );
    const trigger = screen.getByTestId("category-combobox");
    expect(trigger).toBeDefined();
    expect(screen.getByText("Category 1")).toBeDefined();
    expect(screen.getByText("cat_1/")).toBeDefined();
  });
});
