import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Table, TableBody } from "@/components/ui/table";
import {
  AdminRowActions,
  TableEmptyRow,
  TableLoadingRow,
} from "./table-shell-rows";

describe("table-shell-rows", () => {
  it("renders TableLoadingRow with default and custom message", () => {
    const { rerender } = render(
      <Table>
        <TableBody>
          <TableLoadingRow colSpan={3} />
        </TableBody>
      </Table>,
    );
    expect(screen.getByText("Loading...")).toBeDefined();

    rerender(
      <Table>
        <TableBody>
          <TableLoadingRow colSpan={3} message="Fetching records..." />
        </TableBody>
      </Table>,
    );
    expect(screen.getByText("Fetching records...")).toBeDefined();
  });

  it("renders TableEmptyRow with default and custom message", () => {
    const { rerender } = render(
      <Table>
        <TableBody>
          <TableEmptyRow colSpan={3} />
        </TableBody>
      </Table>,
    );
    expect(screen.getByText("No items found.")).toBeDefined();

    rerender(
      <Table>
        <TableBody>
          <TableEmptyRow colSpan={3} message="No results matched search." />
        </TableBody>
      </Table>,
    );
    expect(screen.getByText("No results matched search.")).toBeDefined();
  });

  it("renders AdminRowActions trigger button", () => {
    const onEdit = vi.fn();
    const onDelete = vi.fn();

    const { container } = render(
      <AdminRowActions
        onEdit={onEdit}
        onDelete={onDelete}
        editLabel="Edit Item"
        deleteLabel="Trash Item"
      />,
    );

    expect(container).toBeDefined();
    expect(screen.getByRole("button", { name: /open menu/i })).toBeDefined();
  });
});
