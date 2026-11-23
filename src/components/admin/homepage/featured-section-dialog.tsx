"use client";

import { useEffect, useState, useTransition } from "react";
import {
  createFeaturedSection,
  updateFeaturedSection,
} from "@/app/actions/homepage-actions";
import { AdminDialogShell } from "@/components/admin/admin-dialog-shell";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { STORE } from "@/constants";
import { useRoles } from "@/hooks/use-roles";
import { toast } from "@/lib/toast";
import { triggerSync } from "@/lib/utils";

interface FeaturedSectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  section?: {
    id: number;
    title: string;
    layout: string | null;
    order_ind: number | null;
    is_active: boolean | null;
    allowed_roles?: number[] | null;
  } | null;
  onSuccess: () => void;
}

export const FeaturedSectionDialog = ({
  open,
  onOpenChange,
  section,
  onSuccess,
}: FeaturedSectionDialogProps) => {
  const { data: roles = [] } = useRoles();
  const [title, setTitle] = useState("");
  const [layout, setLayout] = useState<"carousel" | "grid" | "list">("grid");
  const [selectedRoles, setSelectedRoles] = useState<number[]>([]);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (section) {
      setTitle(section.title);
      setLayout((section.layout as "carousel" | "grid" | "list") || "grid");
      setSelectedRoles(section.allowed_roles || []);
    } else {
      setTitle("");
      setLayout("grid");
      setSelectedRoles([]);
    }
  }, [section]);

  const handleRoleToggle = (roleId: number) => {
    setSelectedRoles((prev) =>
      prev.includes(roleId)
        ? prev.filter((r) => r !== roleId)
        : [...prev, roleId],
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.error("Title is required");
      return;
    }

    startTransition(async () => {
      const res = section
        ? await updateFeaturedSection(section.id, {
            title,
            layout,
            allowed_roles: selectedRoles,
          })
        : await createFeaturedSection({
            title,
            layout,
            allowed_roles: selectedRoles,
          });

      if (res.success) {
        toast.success(
          section
            ? "Featured Section updated successfully"
            : "Featured Section created successfully",
        );
        triggerSync([STORE.FEATURED_SECTIONS]);
        onSuccess();
        onOpenChange(false);
      } else {
        toast.error(res.error || "Something went wrong");
      }
    });
  };

  return (
    <AdminDialogShell
      open={open}
      onOpenChange={onOpenChange}
      title={section ? "Edit Featured Section" : "Add Featured Section"}
      description="Configure a homepage row to showcase categories or recordings."
      onSubmit={handleSubmit}
      submitText={section ? "Save Changes" : "Create Section"}
      isPending={isPending}
    >
      <div className="grid gap-2">
        <Label htmlFor="sec-title">Section Title</Label>
        <Input
          id="sec-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Recommended Philosophy Lectures"
          disabled={isPending}
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="sec-layout">Layout Style</Label>
        <Select
          value={layout}
          onValueChange={(val: "carousel" | "grid" | "list") => setLayout(val)}
          disabled={isPending}
        >
          <SelectTrigger id="sec-layout">
            <SelectValue placeholder="Select Layout" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="grid">Grid</SelectItem>
            <SelectItem value="carousel">Carousel</SelectItem>
            <SelectItem value="list">List</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="grid gap-2 pt-2 border-t">
        <div>
          <Label className="text-xs font-semibold uppercase text-muted-foreground">
            Target User Roles
          </Label>
          <p className="text-xs text-muted-foreground mt-0.5">
            Select who can see this section. Leave unchecked for Public (All
            Users).
          </p>
        </div>
        <div className="grid grid-cols-2 gap-2 mt-1">
          {roles.map((role) => (
            <div
              key={role.id}
              className="flex items-center space-x-2 bg-muted/30 p-2 rounded-lg border border-border/50"
            >
              <Checkbox
                id={`sec-role-${role.id}`}
                checked={selectedRoles.includes(role.id)}
                onCheckedChange={() => handleRoleToggle(role.id)}
                disabled={isPending}
              />
              <Label
                htmlFor={`sec-role-${role.id}`}
                className="text-xs cursor-pointer select-none font-medium"
              >
                {role.name}
              </Label>
            </div>
          ))}
        </div>
      </div>
    </AdminDialogShell>
  );
};
