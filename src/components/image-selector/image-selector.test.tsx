import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as idb from "@/lib/idb";
import { createQueryWrapper } from "@/test-utils";
import { BannerImageSelector } from "../banner-image-selector";
import { ImageSelector } from "./index";

describe("ImageSelector and BannerImageSelector", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    const mockDb = {
      getAll: vi.fn().mockResolvedValue([]),
    };
    vi.spyOn(idb, "getDB").mockResolvedValue(mockDb as any);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should render ImageSelector trigger button", () => {
    render(<ImageSelector onSelect={vi.fn()} />, {
      wrapper: createQueryWrapper(),
    });
    expect(screen.getByRole("button")).toBeDefined();
  });

  it("should render BannerImageSelector trigger", () => {
    render(
      <BannerImageSelector
        open={true}
        onOpenChange={vi.fn()}
        onSelect={vi.fn()}
      />,
      {
        wrapper: createQueryWrapper(),
      },
    );
    expect(screen.getByRole("dialog")).toBeDefined();
  });
});
