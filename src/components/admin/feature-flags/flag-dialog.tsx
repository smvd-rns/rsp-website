"use client";

import { useEffect, useState } from "react";
import {
  createFeatureFlag,
  updateFeatureFlag,
} from "@/app/actions/feature-flag-actions";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useRoles } from "@/hooks/use-roles";
import { toast } from "@/lib/toast";
import { triggerSync } from "@/lib/utils";
import type { FeatureFlag } from "@/types";

interface FlagDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  flag: FeatureFlag | null;
  onSuccess: () => void;
}

export const FlagDialog = ({
  open,
  onOpenChange,
  flag,
  onSuccess,
}: FlagDialogProps) => {
  const { data: roles = [] } = useRoles();

  const [id, setId] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isEnabled, setIsEnabled] = useState(false);
  const [isGa, setIsGa] = useState(false);
  const [selectedRoles, setSelectedRoles] = useState<number[]>([]);
  const [allowedEmailsText, setAllowedEmailsText] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (flag) {
      setId(flag.id);
      setName(flag.name);
      setDescription(flag.description || "");
      setIsEnabled(flag.is_enabled);
      setIsGa(flag.is_ga);
      setSelectedRoles(flag.allowed_roles || []);
      setAllowedEmailsText((flag.allowed_emails || []).join("\n"));
    } else {
      setId("");
      setName("");
      setDescription("");
      setIsEnabled(false);
      setIsGa(false);
      setSelectedRoles([]);
      setAllowedEmailsText("");
    }
  }, [flag]);

  const handleRoleToggle = (roleId: number) => {
    setSelectedRoles((prev) =>
      prev.includes(roleId)
        ? prev.filter((r) => r !== roleId)
        : [...prev, roleId],
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id.trim() || !name.trim()) {
      toast.error("Please enter a valid key/id and name.");
      return;
    }

    setIsSaving(true);
    try {
      const allowed_emails = allowedEmailsText
        .split(/[\n,]+/)
        .map((e) => e.trim().toLowerCase())
        .filter(Boolean);

      if (flag) {
        const res = await updateFeatureFlag(flag.id, {
          name,
          description,
          is_enabled: isEnabled,
          is_ga: isGa,
          allowed_roles: selectedRoles,
          allowed_emails,
        });
        if (!res.success) throw new Error(res.error);
        toast.success("Feature flag updated successfully.");
      } else {
        const res = await createFeatureFlag({
          id,
          name,
          description,
          is_enabled: isEnabled,
          is_ga: isGa,
          allowed_roles: selectedRoles,
          allowed_emails,
        });
        if (!res.success) throw new Error(res.error);
        toast.success("Feature flag created successfully.");
      }

      await triggerSync(["feature_flags"]);
      onSuccess();
      onOpenChange(false);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to save feature flag.",
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit} className="space-y-4">
          <DialogHeader>
            <DialogTitle>
              {flag ? "Edit Feature Flag" : "New Feature Flag"}
            </DialogTitle>
            <DialogDescription>
              Configure feature rollout, General Availability (GA), role
              targeting, or user email allowlists.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div>
              <Label htmlFor="flag-id">Flag Key / Slug</Label>
              <Input
                id="flag-id"
                value={id}
                onChange={(e) => setId(e.target.value)}
                placeholder="e.g. youtube_marquee"
                disabled={Boolean(flag)}
                required
              />
              <p className="text-[11px] text-muted-foreground mt-1">
                Unique identifier accessed via code (e.g. useFeatureFlag(&quot;
                {id || "key"}&quot;)).
              </p>
            </div>

            <div>
              <Label htmlFor="flag-name">Display Name</Label>
              <Input
                id="flag-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. YouTube Video Marquee"
                required
              />
            </div>

            <div>
              <Label htmlFor="flag-desc">Description</Label>
              <Input
                id="flag-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Optional purpose of this flag"
              />
            </div>

            <div className="flex items-center space-x-2 pt-2">
              <Checkbox
                id="is-enabled"
                checked={isEnabled}
                onCheckedChange={(c) => setIsEnabled(Boolean(c))}
              />
              <Label
                htmlFor="is-enabled"
                className="cursor-pointer font-semibold"
              >
                Master Switch (Enabled)
              </Label>
            </div>

            <div className="flex items-center space-x-2 border rounded-lg p-3 bg-muted/30">
              <Checkbox
                id="is-ga"
                checked={isGa}
                onCheckedChange={(c) => setIsGa(Boolean(c))}
              />
              <div className="space-y-0.5">
                <Label
                  htmlFor="is-ga"
                  className="cursor-pointer font-semibold text-sm"
                >
                  General Availability (GA)
                </Label>
                <p className="text-xs text-muted-foreground">
                  When enabled, this feature is available to all users
                  (including unauthenticated visitors).
                </p>
              </div>
            </div>

            {!isGa && (
              <div className="space-y-3 border rounded-lg p-3 bg-muted/10">
                <div>
                  <Label className="text-xs font-semibold uppercase text-muted-foreground">
                    Target User Roles
                  </Label>
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    {roles.map((role) => (
                      <div
                        key={role.id}
                        className="flex items-center space-x-2"
                      >
                        <Checkbox
                          id={`role-${role.id}`}
                          checked={selectedRoles.includes(role.id)}
                          onCheckedChange={() => handleRoleToggle(role.id)}
                        />
                        <Label
                          htmlFor={`role-${role.id}`}
                          className="text-xs cursor-pointer"
                        >
                          {role.name}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <Label
                    htmlFor="allowed-emails"
                    className="text-xs font-semibold uppercase text-muted-foreground"
                  >
                    Allowed User Emails (One per line or comma-separated)
                  </Label>
                  <Textarea
                    id="allowed-emails"
                    value={allowedEmailsText}
                    onChange={(e) => setAllowedEmailsText(e.target.value)}
                    placeholder="user1@example.com&#10;user2@example.com"
                    rows={3}
                    className="text-xs font-mono mt-1"
                  />
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving ? "Saving..." : flag ? "Save Changes" : "Create Flag"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
