import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as userActions from "@/app/actions/user-actions";
import * as idb from "@/lib/idb";
import { createQueryWrapper } from "@/test-utils";
import { EditUserDialog } from "./edit-user-dialog";
import { RequestsTab } from "./requests-tab";
import { ReviewRequestDialog } from "./review-request-dialog";
import type { ActiveUser, UserEditRequestWithUser } from "./types";
import { UserFormFields } from "./user-form-fields";

describe("Users admin dialogs and requests tab", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    document.body.innerHTML = "";
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

  const mockUser: ActiveUser = {
    id: "user-123",
    email: "testuser@example.com",
    name: "Test User",
    phone: "1234567890",
    ashram: "Vrindavan",
    temple: "ISKCON",
    purpose: "Study",
    authority_name: "Admin",
    authority_relationship: "Manager",
    authority_email: "admin@example.com",
    role_id: 2,
    created_at: new Date().toISOString(),
    roles: {
      name: "Editor",
    },
  };

  const mockRequest: UserEditRequestWithUser = {
    id: "req-1",
    user_id: "user-123",
    status: "pending",
    name: "New Name",
    requested_role_id: 1,
    phone: null,
    ashram: null,
    temple: null,
    purpose: null,
    authority_name: null,
    authority_relationship: null,
    authority_email: null,
    reason: "Need admin rights",
    review_comment: null,
    actor_id: null,
    actor_type: null,
    requested_at: null,
    reviewed_at: null,
    reviewed_by: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    users: {
      email: "testuser@example.com",
    },
    roles: {
      name: "Admin",
    },
    reviewer: null,
  };

  it("renders EditUserDialog with user data and handles submission", async () => {
    vi.spyOn(userActions, "adminCreateUser").mockResolvedValue({
      success: true,
    } as any);
    const onUserUpdated = vi.fn();
    const onClose = vi.fn();

    render(
      <EditUserDialog
        isOpen={true}
        onClose={onClose}
        user={mockUser}
        onUserUpdated={onUserUpdated}
      />,
      { wrapper: createQueryWrapper() },
    );

    expect(screen.getByText("Edit User Profile")).toBeDefined();
    expect(screen.getByDisplayValue("Test User")).toBeDefined();
    expect(screen.getByDisplayValue("1234567890")).toBeDefined();

    const saveBtn = screen.getByRole("button", { name: /save changes/i });
    fireEvent.click(saveBtn);

    expect(userActions.adminCreateUser).toHaveBeenCalledWith(
      expect.objectContaining({
        email: "testuser@example.com",
        name: "Test User",
      }),
    );
  });

  it("renders ReviewRequestDialog with request data and handles approval", () => {
    const onApprove = vi.fn();
    const onClose = vi.fn();

    render(
      <ReviewRequestDialog
        isOpen={true}
        onClose={onClose}
        request={mockRequest}
        onApprove={onApprove}
      />,
      { wrapper: createQueryWrapper() },
    );

    expect(screen.getByText("Review Profile Update Request")).toBeDefined();
    expect(screen.getByText(/submitted by/i)).toBeDefined();

    const approveBtn = screen.getByRole("button", { name: /approve changes/i });
    fireEvent.click(approveBtn);

    expect(onApprove).toHaveBeenCalledWith(
      "req-1",
      expect.objectContaining({
        name: "New Name",
      }),
    );
  });

  it("renders UserFormFields standalone", () => {
    const formData = {
      name: "Form Name",
      phone: "555-5555",
      ashram: "Mayapur",
      temple: "Temple",
      purpose: "Seva",
      authorityName: "Authority",
      authorityRelationship: "Guru",
      authorityEmail: "guru@example.com",
    };
    const onChange = vi.fn();

    const { container } = render(
      <UserFormFields formData={formData} onChange={onChange} />,
    );

    expect(container).toBeDefined();
    expect(screen.getByDisplayValue("Form Name")).toBeDefined();
    expect(screen.getByDisplayValue("Mayapur")).toBeDefined();
  });

  it("renders RequestsTab", () => {
    const { container } = render(<RequestsTab onStatusUpdated={vi.fn()} />, {
      wrapper: createQueryWrapper(),
    });
    expect(container.textContent).toContain("User Requests");
  });
});
