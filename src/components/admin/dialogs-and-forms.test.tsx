import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as idb from "@/lib/idb";
import { createQueryWrapper } from "@/test-utils";
import type { Category } from "@/types";
import { AudioUpload } from "./audio-upload";
import { CategoryEditForm } from "./category-edit-form";
import { MaterialsUpload } from "./materials-upload";
import { NewUserForm } from "./new-user-form";
import { RecordingForm } from "./recording-form";
import { RedirectDeleteDialog } from "./redirect-delete-dialog";
import { RedirectDialog } from "./redirect-dialog";

vi.mock("@/app/actions/redirect-actions", () => ({
  createRedirect: vi.fn().mockResolvedValue(undefined),
  updateRedirect: vi.fn().mockResolvedValue(undefined),
  deleteRedirect: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/app/actions/category-actions", () => ({
  updateCategory: vi.fn().mockResolvedValue({ success: true }),
  softDeleteCategory: vi.fn().mockResolvedValue(undefined),
  restoreCategory: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/app/actions/dictionary-actions", () => ({
  createSpeaker: vi.fn().mockResolvedValue({ id: 1, name: "Speaker 1" }),
  createVenue: vi.fn().mockResolvedValue({ id: 1, name: "Venue 1" }),
  createEvent: vi.fn().mockResolvedValue({ id: 1, name: "Event 1" }),
  createLanguage: vi.fn().mockResolvedValue({ id: 1, name: "English" }),
  createContentType: vi.fn().mockResolvedValue({ id: 1, name: "Audio" }),
}));

vi.mock("@/app/actions/user-actions", () => ({
  adminCreateUser: vi.fn().mockResolvedValue({ success: true }),
}));

const mockCategory: Category = {
  id: 1,
  name: "Gita Study",
  url_path: "gita_study",
  path: "1",
  order_ind: 1,
  allowed_roles: [1],
  img_id: 10,
  created_at: "2026-01-01",
  updated_at: "2026-01-01",
};

describe("Admin Dialogs and Forms", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    document.body.innerHTML = "";
    (global as any).indexedDB = {};
    const mockDb = {
      getAll: vi.fn().mockResolvedValue([]),
      get: vi.fn().mockResolvedValue(null),
    };
    vi.spyOn(idb, "getDB").mockResolvedValue(mockDb as any);
  });

  afterEach(() => {
    cleanup();
    document.body.innerHTML = "";
    vi.restoreAllMocks();
  });

  it("should render and interact with CategoryEditForm", () => {
    const { container } = render(
      <CategoryEditForm category={mockCategory} initialRoles={[1]} />,
      { wrapper: createQueryWrapper() },
    );
    expect(container.textContent).toContain("Save Changes");
    const saveBtn = screen.getByRole("button", { name: /save changes/i });
    fireEvent.click(saveBtn);
  });

  it("should render and interact with RecordingForm in create and edit mode", () => {
    const defaultFormState = {
      name: "",
      selectedParentId: null,
      selectedSpeakers: [],
      selectedLanguages: [],
      selectedVenue: "",
      selectedEvent: "",
      selectedType: "",
      audios: [],
      materials: [],
      recordedAt: "",
      youtubeUrl: "",
    };

    const { container, unmount } = render(
      <RecordingForm
        mode="create"
        categories={[mockCategory]}
        speakers={[{ id: 1, name: "Radheshyam Das", updated_at: null }]}
        languages={[
          { id: 1, name: "English", native_name: "English", updated_at: null },
        ]}
        venues={[{ id: 1, name: "NVCC Pune", updated_at: null }]}
        events={[
          { id: 1, name: "Sunday Feast", short_name: null, updated_at: null },
        ]}
        contentTypes={[{ id: 1, name: "Lecture", updated_at: null }]}
        formState={defaultFormState}
        onChangeField={vi.fn()}
        onSubmit={vi.fn()}
        onReset={vi.fn()}
        isSubmitting={false}
        isUploadingAudio={false}
        setIsUploadingAudio={vi.fn()}
        isUploadingMaterials={false}
        setIsUploadingMaterials={vi.fn()}
      />,
      { wrapper: createQueryWrapper() },
    );
    expect(container.textContent).toContain("Create Recording");
    unmount();

    const { container: editContainer } = render(
      <RecordingForm
        mode="edit"
        categories={[mockCategory]}
        speakers={[{ id: 1, name: "Radheshyam Das", updated_at: null }]}
        languages={[
          { id: 1, name: "English", native_name: "English", updated_at: null },
        ]}
        venues={[{ id: 1, name: "NVCC Pune", updated_at: null }]}
        events={[
          { id: 1, name: "Sunday Feast", short_name: null, updated_at: null },
        ]}
        contentTypes={[{ id: 1, name: "Lecture", updated_at: null }]}
        formState={{ ...defaultFormState, name: "Gita Chapter 1" }}
        onChangeField={vi.fn()}
        onSubmit={vi.fn()}
        onReset={vi.fn()}
        isSubmitting={false}
        isUploadingAudio={false}
        setIsUploadingAudio={vi.fn()}
        isUploadingMaterials={false}
        setIsUploadingMaterials={vi.fn()}
      />,
      { wrapper: createQueryWrapper() },
    );
    expect(editContainer.textContent).toContain("Update Recording");
  });

  it("should render AudioUpload and MaterialsUpload", () => {
    const { container: audioContainer, unmount } = render(
      <AudioUpload
        audios={[]}
        onChange={vi.fn()}
        isUploading={false}
        setIsUploading={vi.fn()}
      />,
      { wrapper: createQueryWrapper() },
    );
    expect(audioContainer.textContent).toContain("Select Audio/Video File");
    unmount();

    const { container: matContainer } = render(
      <MaterialsUpload
        materials={[]}
        onChange={vi.fn()}
        isUploading={false}
        setIsUploading={vi.fn()}
      />,
      { wrapper: createQueryWrapper() },
    );
    expect(matContainer.textContent).toContain("Upload Files");
  });

  it("should render and interact with NewUserForm", () => {
    const { container } = render(<NewUserForm />, {
      wrapper: createQueryWrapper(),
    });
    expect(container.textContent).toContain("Email Address");
    expect(container.textContent).toContain("Role");
  });

  it("should render RedirectDialog in create and edit modes", () => {
    const { rerender } = render(
      <RedirectDialog open={true} onOpenChange={vi.fn()} redirect={null} />,
      { wrapper: createQueryWrapper() },
    );
    expect(screen.getByText("New Redirect")).toBeDefined();
    expect(screen.getByText("From Category")).toBeDefined();
    expect(screen.getByText("To Destination")).toBeDefined();

    rerender(
      <RedirectDialog
        open={true}
        onOpenChange={vi.fn()}
        redirect={{
          id: "test_category",
          to_path: "/destination",
          updated_at: "2026-01-01",
        }}
      />,
    );
    expect(screen.getByText("Edit Redirect")).toBeDefined();
    expect(screen.getByDisplayValue("/destination")).toBeDefined();
  });

  it("should render RedirectDeleteDialog and handle cancel/delete", () => {
    const onOpenChange = vi.fn();
    render(
      <RedirectDeleteDialog
        open={true}
        onOpenChange={onOpenChange}
        redirect={{
          id: "gita_study",
          to_path: "/new-path",
          updated_at: "2026-01-01",
        }}
      />,
      { wrapper: createQueryWrapper() },
    );
    expect(screen.getByText("Delete Redirect")).toBeDefined();
    expect(screen.getByText("gita_study")).toBeDefined();
  });
});
