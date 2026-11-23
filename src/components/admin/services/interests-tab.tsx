"use client";

import { Trash2 } from "lucide-react";
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
import type { InterestWithDetails } from "@/hooks/use-services";
import { ServiceTabHeader } from "./service-tab-header";

import { matchesServiceUser } from "./service-utils";

interface InterestsTabProps {
  interests: InterestWithDetails[];
  onConvert?: (interest: InterestWithDetails) => void;
  onDeleteClick?: (interest: InterestWithDetails) => void;
  services?: unknown[];
  users?: unknown[];
}

export const InterestsTab = ({
  interests,
  onConvert,
  onDeleteClick,
}: InterestsTabProps) => {
  const [search, setSearch] = useState("");
  const [levelFilter, setLevelFilter] = useState("all");

  const filteredInterests = interests.filter((item) => {
    const userMatch = matchesServiceUser(item, search, item.notes);
    const levelMatch = levelFilter === "all" || item.level === levelFilter;
    return userMatch && levelMatch;
  });

  const getLevelBadge = (level: string) => {
    switch (level) {
      case "committed":
        return (
          <Badge className="bg-danger/5 text-danger border-danger/20">
            Committed
          </Badge>
        );
      case "interested":
        return (
          <Badge className="bg-info/5 text-info border-info/20">
            Interested
          </Badge>
        );
      case "curious":
        return (
          <Badge className="bg-muted text-muted-foreground border-border">
            Curious
          </Badge>
        );
      default:
        return <Badge variant="outline">{level}</Badge>;
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <ServiceTabHeader
          title="Volunteer Interests"
          description="Review seva expressions of interest submitted by users. Convert them to active assignments when approved."
          search={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search volunteer or service..."
          statusFilter={levelFilter}
          onStatusFilterChange={setLevelFilter}
          filterOptions={[
            { value: "all", label: "All Levels" },
            { value: "curious", label: "Curious" },
            { value: "interested", label: "Interested" },
            { value: "committed", label: "Committed" },
          ]}
        />
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-6">Volunteer</TableHead>
                <TableHead>Requested Seva</TableHead>
                <TableHead>Interest Level</TableHead>
                <TableHead>Notes</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="w-[180px] text-right pr-6">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredInterests.length > 0 ? (
                filteredInterests.map((interest) => (
                  <TableRow
                    key={interest.id}
                    className="group hover:bg-muted/50/50"
                  >
                    <TableCell className="pl-6">
                      <div className="flex flex-col">
                        <span className="font-semibold text-foreground">
                          {interest.users?.name || "No name"}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {interest.users?.email}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="font-medium text-foreground">
                      {interest.services?.name || "Unknown Service"}
                    </TableCell>
                    <TableCell>
                      {getLevelBadge(interest.level || "curious")}
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate text-sm text-muted-foreground">
                      {interest.notes || "-"}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                      {interest.created_at
                        ? new Date(interest.created_at).toLocaleDateString()
                        : "-"}
                    </TableCell>
                    <TableCell className="text-right pr-6">
                      <div className="flex justify-end gap-2">
                        {onConvert && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 border-success/20 text-success hover:text-success hover:bg-success/5"
                            onClick={() => onConvert(interest)}
                          >
                            Assign
                          </Button>
                        )}
                        {onDeleteClick && (
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-muted-foreground hover:text-danger hover:bg-danger/5"
                            onClick={() => onDeleteClick(interest)}
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
                    colSpan={6}
                    className="text-center py-8 text-muted-foreground"
                  >
                    No volunteer interest expressions found.
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
