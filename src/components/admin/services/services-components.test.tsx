import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type {
  AssignmentWithDetails,
  InterestWithDetails,
  ResponsibilityWithDetails,
} from "@/hooks/use-services";
import { createQueryWrapper } from "@/test-utils";
import type { Service } from "@/types";
import { AssignmentDialog } from "./assignment-dialog";
import { AssignmentsTab } from "./assignments-tab";
import { InterestsTab } from "./interests-tab";
import { ResponsibilitiesTab } from "./responsibilities-tab";
import { ResponsibilityDialog } from "./responsibility-dialog";
import { ServiceCatalogTab } from "./service-catalog-tab";
import { ServiceTabHeader } from "./service-tab-header";

describe("Services Admin Components", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  const mockService: Service = {
    id: 1,
    name: "Audio Editing",
    description: "Editing audio recordings",
    is_public: true,
    type: "seva",
    order_ind: 1,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const mockAssignment: AssignmentWithDetails = {
    id: "assign-1",
    service_id: 1,
    user_id: "user-1",
    role: "Lead Editor",
    assigned_by: null,
    started_at: null,
    ended_at: null,
    notes: null,
    status: "active",
    updated_at: new Date().toISOString(),
    users: { id: "user-1", email: "editor@example.com", name: "Editor Bob" },
    services: mockService,
  };

  const mockInterest: InterestWithDetails = {
    id: "interest-1",
    service_id: 1,
    user_id: "user-2",
    notes: "I want to help",
    level: "intermediate",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    users: {
      id: "user-2",
      email: "volunteer@example.com",
      name: "Volunteer Jane",
    },
    services: mockService,
  };

  const mockResponsibility: ResponsibilityWithDetails = {
    id: "resp-1",
    user_id: "user-1",
    assigned_by: null,
    title: "Master Audio Files",
    scope: "audio",
    started_at: new Date().toISOString(),
    ended_at: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    users: { id: "user-1", email: "editor@example.com", name: "Editor Bob" },
  };

  it("renders ServiceCatalogTab", () => {
    render(
      <ServiceCatalogTab services={[mockService]} setServices={vi.fn()} />,
      {
        wrapper: createQueryWrapper(),
      },
    );
    expect(screen.getByText("Audio Editing")).toBeDefined();
  });

  it("renders AssignmentsTab with data", () => {
    render(
      <AssignmentsTab
        assignments={[mockAssignment]}
        onEdit={vi.fn()}
        onDeleteClick={vi.fn()}
        onAddClick={vi.fn()}
      />,
      { wrapper: createQueryWrapper() },
    );
    expect(screen.getByText("Editor Bob")).toBeDefined();
    expect(screen.getByText("Lead Editor")).toBeDefined();
  });

  it("renders InterestsTab with data", () => {
    render(
      <InterestsTab interests={[mockInterest]} onDeleteClick={vi.fn()} />,
      { wrapper: createQueryWrapper() },
    );
    expect(screen.getByText("Volunteer Jane")).toBeDefined();
    expect(screen.getByText("I want to help")).toBeDefined();
  });

  it("renders ResponsibilitiesTab with data", () => {
    render(
      <ResponsibilitiesTab
        responsibilities={[mockResponsibility]}
        onEdit={vi.fn()}
        onDeleteClick={vi.fn()}
        onAddClick={vi.fn()}
      />,
      { wrapper: createQueryWrapper() },
    );
    expect(screen.getByText("Master Audio Files")).toBeDefined();
  });

  it("renders AssignmentDialog and ResponsibilityDialog", () => {
    const { rerender } = render(
      <AssignmentDialog
        open={true}
        onOpenChange={vi.fn()}
        assignment={null}
        services={[mockService]}
        users={[{ id: "user-1", email: "user@example.com", name: "User One" }]}
        onSuccess={vi.fn()}
      />,
      { wrapper: createQueryWrapper() },
    );
    expect(screen.getByText("Assign User to Service")).toBeDefined();

    rerender(
      <ResponsibilityDialog
        open={true}
        onOpenChange={vi.fn()}
        responsibility={null}
        users={[{ id: "user-1", email: "user@example.com", name: "User One" }]}
        onSuccess={vi.fn()}
      />,
    );
    expect(screen.getByText("Add General Responsibility")).toBeDefined();
  });

  it("renders ServiceTabHeader", () => {
    render(
      <ServiceTabHeader
        title="Test Header"
        description="Test description"
        search=""
        onSearchChange={vi.fn()}
        onAddClick={vi.fn()}
        addButtonLabel="Add New"
      />,
      { wrapper: createQueryWrapper() },
    );
    expect(screen.getByText("Test Header")).toBeDefined();
    expect(screen.getByText("Add New")).toBeDefined();
  });
});
