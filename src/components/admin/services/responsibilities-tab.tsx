"use client";

import { Edit2, Trash2 } from "lucide-react";
import { useState } from "react";
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
import type { ResponsibilityWithDetails } from "@/hooks/use-services";
import { ServiceTabHeader } from "./service-tab-header";

interface ResponsibilitiesTabProps {
  responsibilities: ResponsibilityWithDetails[];
  onEdit?: (resp: ResponsibilityWithDetails) => void;
  onDeleteClick?: (resp: ResponsibilityWithDetails) => void;
  onAddClick?: () => void;
  services?: unknown[];
  setResponsibilities?: (resp: unknown[]) => void;
}

export const ResponsibilitiesTab = ({
  responsibilities,
  onEdit,
  onDeleteClick,
  onAddClick,
}: ResponsibilitiesTabProps) => {
  const [search, setSearch] = useState("");

  const filteredResponsibilities = responsibilities.filter((item) => {
    const userMatch =
      item.users?.email.toLowerCase().includes(search.toLowerCase()) ||
      (item.users?.name || "").toLowerCase().includes(search.toLowerCase()) ||
      (item.title || "").toLowerCase().includes(search.toLowerCase()) ||
      (item.scope || "").toLowerCase().includes(search.toLowerCase());
    return userMatch;
  });

  return (
    <div className="space-y-4">
      <Card>
        <ServiceTabHeader
          title="General Responsibilities"
          addButtonLabel={onAddClick ? "Add Responsibility" : undefined}
          onAddClick={onAddClick}
          description="Manage high-level roles and administrative responsibilities."
          search={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search title, scope, or user..."
        />
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-6">Assignee</TableHead>
                <TableHead>Responsibility Title</TableHead>
                <TableHead>Scope</TableHead>
                <TableHead>Dates</TableHead>
                <TableHead className="w-[100px] text-right pr-6">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredResponsibilities.length > 0 ? (
                filteredResponsibilities.map((resp) => (
                  <TableRow
                    key={resp.id}
                    className="group hover:bg-muted/50/50"
                  >
                    <TableCell className="pl-6">
                      <div className="flex flex-col">
                        <span className="font-semibold text-foreground">
                          {resp.users?.name || "No name"}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {resp.users?.email}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="font-medium text-foreground">
                      {resp.title}
                    </TableCell>
                    <TableCell>{resp.scope || "-"}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      <div className="flex flex-col">
                        <span>
                          Start:{" "}
                          {resp.started_at
                            ? new Date(resp.started_at).toLocaleDateString()
                            : "-"}
                        </span>
                        {resp.ended_at && (
                          <span>
                            End: {new Date(resp.ended_at).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right pr-6">
                      <div className="flex justify-end gap-1">
                        {onEdit && (
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-muted-foreground hover:text-foreground"
                            onClick={() => onEdit(resp)}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                        )}
                        {onDeleteClick && (
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-muted-foreground hover:text-danger hover:bg-danger/5"
                            onClick={() => onDeleteClick(resp)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="text-center py-8 text-muted-foreground"
                  >
                    No responsibilities found.
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
