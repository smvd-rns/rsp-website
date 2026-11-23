import { Edit2, MoreVertical, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { TableCell, TableRow } from "@/components/ui/table";

export const TableLoadingRow = ({
  colSpan,
  message = "Loading...",
}: {
  colSpan: number;
  message?: string;
}) => (
  <TableRow>
    <TableCell
      colSpan={colSpan}
      className="text-center py-8 text-muted-foreground"
    >
      {message}
    </TableCell>
  </TableRow>
);

export const TableEmptyRow = ({
  colSpan,
  message = "No items found.",
}: {
  colSpan: number;
  message?: string;
}) => (
  <TableRow>
    <TableCell
      colSpan={colSpan}
      className="text-center py-8 text-muted-foreground"
    >
      {message}
    </TableCell>
  </TableRow>
);

export interface AdminRowActionsProps {
  onEdit?: () => void;
  onDelete?: () => void;
  editLabel?: string;
  deleteLabel?: string;
}

export const AdminRowActions = ({
  onEdit,
  onDelete,
  editLabel = "Edit",
  deleteLabel = "Delete",
}: AdminRowActionsProps) => (
  <DropdownMenu>
    <DropdownMenuTrigger asChild>
      <Button variant="ghost" className="h-8 w-8 p-0">
        <span className="sr-only">Open menu</span>
        <MoreVertical className="h-4 w-4" />
      </Button>
    </DropdownMenuTrigger>
    <DropdownMenuContent align="end">
      <DropdownMenuLabel>Actions</DropdownMenuLabel>
      {onEdit && (
        <>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={onEdit}>
            <Edit2 className="mr-2 h-4 w-4" /> {editLabel}
          </DropdownMenuItem>
        </>
      )}
      {onDelete && (
        <>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="text-danger focus:text-danger focus:bg-danger/5"
            onClick={onDelete}
          >
            <Trash2 className="mr-2 h-4 w-4" /> {deleteLabel}
          </DropdownMenuItem>
        </>
      )}
    </DropdownMenuContent>
  </DropdownMenu>
);
