"use client";

import { Edit2, Trash2 } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { AssignmentWithDetails } from "@/hooks/use-services";
import { ServiceTabHeader } from "./service-tab-header";

import { matchesServiceUser } from "./service-utils";

interface AssignmentsTabProps {
  assignments: AssignmentWithDetails[];
  onEdit: (assignment: AssignmentWithDetails) => void;
  onDeleteClick: (assignment: AssignmentWithDetails) => void;
  onAddClick: () => void;
}

export const AssignmentsTab = ({
  assignments,
  onEdit,
  onDeleteClick,
  onAddClick,
}: AssignmentsTabProps) => {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const filteredAssignments = assignments.filter((item) => {
    const userMatch = matchesServiceUser(item, search, item.role);
    const statusMatch = statusFilter === "all" || item.status === statusFilter;
    return userMatch && statusMatch;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return (
          <Badge className="bg-success/5 text-success border-success/20">
            Active
          </Badge>
        );
      case "completed":
        return (
          <Badge className="bg-muted text-muted-foreground border-border">
            Completed
          </Badge>
        );
      case "paused":
        return (
          <Badge className="bg-warning/5 text-warning border-warning/20">
            Paused
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <ServiceTabHeader
          title="Service Assignments"
          addButtonLabel="Add Assignment"
          onAddClick={onAddClick}
          description="List of users assigned to active and past seva roles."
          search={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search volunteer or role..."
          statusFilter={statusFilter}
          onStatusFilterChange={setStatusFilter}
          filterOptions={[
            { value: "all", label: "All Statuses" },
            { value: "active", label: "Active" },
            { value: "paused", label: "Paused" },
            { value: "completed", label: "Completed" },
          ]}
        />
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-6">Volunteer</TableHead>
                <TableHead>Service</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Dates</TableHead>
                <TableHead className="w-[100px] text-right pr-6">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAssignments.length > 0 ? (
                filteredAssignments.map((assign) => (
                  <TableRow
                    key={assign.id}
                    className="group hover:bg-muted/50/50"
                  >
                    <TableCell className="pl-6">
                      <div className="flex flex-col">
                        <span className="font-semibold text-foreground">
                          {assign.users?.name || "No name"}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {assign.users?.email}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="font-medium text-foreground">
                      {assign.services?.name || "Unknown Service"}
                    </TableCell>
                    <TableCell>{assign.role || "-"}</TableCell>
                    <TableCell>
                      {getStatusBadge(assign.status || "active")}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      <div className="flex flex-col">
                        <span>
                          Start:{" "}
                          {assign.started_at
                            ? new Date(assign.started_at).toLocaleDateString()
                            : "-"}
                        </span>
                        {assign.ended_at && (
                          <span>
                            End:{" "}
                            {new Date(assign.ended_at).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right pr-6">
                      <div className="flex justify-end gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-muted-foreground hover:text-foreground"
                          onClick={() => onEdit(assign)}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-muted-foreground hover:text-danger hover:bg-danger/5"
                          onClick={() => onDeleteClick(assign)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="text-center py-8 text-muted-foreground"
                  >
                    No assignments found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};
