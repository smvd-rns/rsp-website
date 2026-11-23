import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Tabs } from "@/components/ui/tabs";
import { createQueryWrapper } from "@/test-utils";
import { ImageCard } from "./image-card";
import { ImageDeleteDialog } from "./image-delete-dialog";
import { ImageEditDescriptionDialog } from "./image-edit-description-dialog";
import { TabNavigation } from "./tab-navigation";

describe("Image Selector Components", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("renders ImageCard", () => {
    render(
      <ImageCard
        url="https://example.com/test.jpg"
        description="A beautiful temple"
        isSelected={false}
        isDeleting={false}
        onSelect={vi.fn()}
        onEditClick={vi.fn()}
        onDeleteClick={vi.fn()}
      />,
    );
    expect(screen.getByText("A beautiful temple")).toBeDefined();
  });

  it("renders ImageDeleteDialog", () => {
    render(
      <ImageDeleteDialog
        setIsDeleting={vi.fn()}
        imageToDelete={10}
        setImageToDelete={vi.fn()}
      />,
      { wrapper: createQueryWrapper() },
    );
    expect(screen.getByText("Are you absolutely sure?")).toBeDefined();
  });

  it("renders ImageEditDescriptionDialog", () => {
    render(
      <ImageEditDescriptionDialog
        editingImageId={10}
        setEditingImageId={vi.fn()}
        editingDescription="Old Description"
        setEditingDescription={vi.fn()}
      />,
      { wrapper: createQueryWrapper() },
    );
    expect(screen.getByText("Edit Image Description")).toBeDefined();
    expect(screen.getByDisplayValue("Old Description")).toBeDefined();
  });

  it("renders TabNavigation within Tabs", () => {
    render(
      <Tabs defaultValue="browse">
        <TabNavigation hasImageSrc={true} />
      </Tabs>,
    );
    expect(screen.getByText("Browse")).toBeDefined();
    expect(screen.getByText("Upload New")).toBeDefined();
    expect(screen.getByText("Edit & Crop")).toBeDefined();
  });
});
