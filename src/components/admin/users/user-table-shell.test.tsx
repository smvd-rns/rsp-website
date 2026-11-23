import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { UserTableShell } from "./user-table-shell";

describe("UserTableShell", () => {
  const mockUsers = [
    {
      id: "u1",
      email: "user1@example.com",
      name: "User One",
      phone: "1234567890",
      ashram: "Brahmachari",
      temple: "NVCC",
      purpose: "Service",
      authority_name: "Leader",
      roles: { name: "Admin" },
      created_at: "2026-01-01T00:00:00Z",
    },
    {
      id: "u2",
      email: "user2@example.com",
      name: null,
      phone: null,
      ashram: null,
      temple: null,
      purpose: null,
      authority_name: null,
      roles: null,
      created_at: null,
    },
  ];

  it("should render table with users and profile badges", () => {
    render(
      <UserTableShell
        title="Test Users"
        description="Testing shell description"
        searchPlaceholder="Search..."
        search=""
        onSearchChange={vi.fn()}
        onSearchSubmit={vi.fn()}
        isLoading={false}
        users={mockUsers as any}
        count={2}
        page={1}
        limit={10}
        onPageChange={vi.fn()}
        dateColumnHeader="Joined"
        renderActions={() => <button type="button">Action</button>}
        emptyMessage="No users"
      />,
    );

    expect(screen.getByText("Test Users")).toBeDefined();
    expect(screen.getByText("user1@example.com")).toBeDefined();
    expect(screen.getByText("User One")).toBeDefined();
    expect(screen.getByText("Admin")).toBeDefined();
    expect(screen.getByText("Default")).toBeDefined();
  });

  it("should show loading indicator when isLoading is true", () => {
    render(
      <UserTableShell
        title="Test Users"
        description="Testing shell description"
        searchPlaceholder="Search..."
        search=""
        onSearchChange={vi.fn()}
        onSearchSubmit={vi.fn()}
        isLoading={true}
        users={[]}
        count={0}
        page={1}
        limit={10}
        onPageChange={vi.fn()}
        dateColumnHeader="Joined"
        renderActions={() => null}
        emptyMessage="No users"
      />,
    );

    expect(screen.getByText("Loading users...")).toBeDefined();
  });

  it("should show empty message when no users exist", () => {
    render(
      <UserTableShell
        title="Test Users"
        description="Testing shell description"
        searchPlaceholder="Search..."
        search=""
        onSearchChange={vi.fn()}
        onSearchSubmit={vi.fn()}
        isLoading={false}
        users={[]}
        count={0}
        page={1}
        limit={10}
        onPageChange={vi.fn()}
        dateColumnHeader="Joined"
        renderActions={() => null}
        emptyMessage="Custom empty message"
      />,
    );

    expect(screen.getByText("Custom empty message")).toBeDefined();
  });
});
