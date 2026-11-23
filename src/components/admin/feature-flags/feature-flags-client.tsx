"use client";

import { Edit, Flag, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import {
  deleteFeatureFlag,
  toggleFeatureFlag,
} from "@/app/actions/feature-flag-actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { STORE } from "@/constants";
import { useFeatureFlags } from "@/hooks/use-feature-flags";
import { useRoles } from "@/hooks/use-roles";
import { getDB } from "@/lib/idb";
import { toast } from "@/lib/toast";
import { triggerSync } from "@/lib/utils";
import type { FeatureFlag } from "@/types";
import { FlagDialog } from "./flag-dialog";

export const FeatureFlagsClient = () => {
  const { data: flags = [], refetch } = useFeatureFlags();
  const { data: roles = [] } = useRoles();

  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedFlag, setSelectedFlag] = useState<FeatureFlag | null>(null);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  const roleNameMap = new Map(roles.map((r) => [r.id, r.name]));

  const filteredFlags = flags.filter(
    (f) =>
      f.name.toLowerCase().includes(search.toLowerCase()) ||
      f.id.toLowerCase().includes(search.toLowerCase()) ||
      f.description?.toLowerCase().includes(search.toLowerCase()),
  );

  const handleToggle = async (flag: FeatureFlag) => {
    try {
      const nextState = !flag.is_enabled;
      const res = await toggleFeatureFlag(flag.id, nextState);
      if (!res.success) throw new Error(res.error);
      toast.success(
        `Flag "${flag.name}" ${nextState ? "enabled" : "disabled"}.`,
      );
      await triggerSync(["feature_flags"]);
      refetch();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to toggle flag.",
      );
    }
  };

  const handleDelete = async (flag: FeatureFlag) => {
    if (
      !confirm(
        `Are you sure you want to delete feature flag "${flag.name}" (${flag.id})?`,
      )
    ) {
      return;
    }
    setIsDeleting(flag.id);
    try {
      const res = await deleteFeatureFlag(flag.id);
      if (!res.success) throw new Error(res.error);
      const db = await getDB();
      if (db) {
        await db.delete(STORE.FEATURE_FLAGS, flag.id);
      }
      toast.success("Feature flag deleted.");
      await triggerSync(["feature_flags"]);
      refetch();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to delete flag.",
      );
    } finally {
      setIsDeleting(null);
    }
  };

  const handleOpenEdit = (flag: FeatureFlag) => {
    setSelectedFlag(flag);
    setDialogOpen(true);
  };

  const handleOpenNew = () => {
    setSelectedFlag(null);
    setDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-heading flex items-center gap-2">
            <Flag className="w-6 h-6 text-primary" />
            Feature Flags
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Control feature availability, beta rollouts, role permissions, and
            individual email whitelists.
          </p>
        </div>

        <Button onClick={handleOpenNew} className="cursor-pointer gap-2">
          <Plus className="w-4 h-4" />
          Create Flag
        </Button>
      </div>

      <div className="flex items-center gap-3">
        <Input
          placeholder="Filter feature flags by key, name, or description..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-md"
        />
      </div>

      <div className="rounded-xl border bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12 text-center">Status</TableHead>
              <TableHead>Flag Key & Name</TableHead>
              <TableHead>Rollout Scope</TableHead>
              <TableHead>Targeting Details</TableHead>
              <TableHead className="w-24 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredFlags.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="h-32 text-center text-muted-foreground"
                >
                  No feature flags found. Create your first feature flag to
                  begin rollout.
                </TableCell>
              </TableRow>
            ) : (
              filteredFlags.map((flag) => (
                <TableRow key={flag.id}>
                  <TableCell className="text-center">
                    <Checkbox
                      checked={flag.is_enabled}
                      onCheckedChange={() => handleToggle(flag)}
                      aria-label={`Toggle ${flag.name}`}
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-0.5">
                      <span className="font-semibold text-sm">{flag.name}</span>
                      <span className="font-mono text-xs text-muted-foreground">
                        {flag.id}
                      </span>
                      {flag.description && (
                        <span className="text-xs text-muted-foreground line-clamp-1">
                          {flag.description}
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {flag.is_ga ? (
                      <Badge
                        variant="secondary"
                        className="bg-emerald-500/10 text-emerald-600 border-emerald-200"
                      >
                        General Availability (All Users)
                      </Badge>
                    ) : (
                      <Badge
                        variant="outline"
                        className="text-amber-600 border-amber-200 bg-amber-500/10"
                      >
                        Targeted Rollout
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {flag.is_ga ? (
                      <span className="text-xs text-muted-foreground">
                        All visitors & users
                      </span>
                    ) : (
                      <div className="flex flex-col gap-1 text-xs text-muted-foreground">
                        {flag.allowed_roles &&
                          flag.allowed_roles.length > 0 && (
                            <div>
                              <span className="font-semibold">Roles: </span>
                              {flag.allowed_roles
                                .map(
                                  (id) => roleNameMap.get(id) || `Role #${id}`,
                                )
                                .join(", ")}
                            </div>
                          )}
                        {flag.allowed_emails &&
                          flag.allowed_emails.length > 0 && (
                            <div>
                              <span className="font-semibold">Emails: </span>
                              {flag.allowed_emails.slice(0, 3).join(", ")}
                              {flag.allowed_emails.length > 3 &&
                                ` +${flag.allowed_emails.length - 3} more`}
                            </div>
                          )}
                        {(!flag.allowed_roles ||
                          flag.allowed_roles.length === 0) &&
                          (!flag.allowed_emails ||
                            flag.allowed_emails.length === 0) && (
                            <span className="text-amber-500 italic">
                              No targets specified (effectively off)
                            </span>
                          )}
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleOpenEdit(flag)}
                        aria-label={`Edit ${flag.name}`}
                        className="cursor-pointer h-8 w-8"
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleDelete(flag)}
                        disabled={isDeleting === flag.id}
                        aria-label={`Delete ${flag.name}`}
                        className="cursor-pointer h-8 w-8 text-destructive hover:text-destructive"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <FlagDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        flag={selectedFlag}
        onSuccess={() => refetch()}
      />
    </div>
  );
};
