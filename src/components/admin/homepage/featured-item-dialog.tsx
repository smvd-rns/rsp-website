"use client";

import { useEffect, useState, useTransition } from "react";
import { createFeaturedItem } from "@/app/actions/homepage-actions";
import { AdminDialogShell } from "@/components/admin/admin-dialog-shell";
import { Combobox } from "@/components/admin/combobox";
import { Checkbox } from "@/components/ui/checkbox";
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

interface FeaturedItemDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sectionId: number;
  categories: { id: number; name: string }[];
  recordings: { id: number; name: string }[];
  onSuccess: () => void;
}

export const FeaturedItemDialog = ({
  open,
  onOpenChange,
  sectionId,
  categories,
  recordings,
  onSuccess,
}: FeaturedItemDialogProps) => {
  const { data: roles = [] } = useRoles();
  const [entityType, setEntityType] = useState<"category" | "recording">(
    "recording",
  );
  const [entityId, setEntityId] = useState("");
  const [selectedRoles, setSelectedRoles] = useState<number[]>([]);
  const [isPending, startTransition] = useTransition();

  // biome-ignore lint/correctness/useExhaustiveDependencies: Reset selected item when type or open state changes
  useEffect(() => {
    setEntityId("");
    setSelectedRoles([]);
  }, [entityType, open]);

  const handleRoleToggle = (roleId: number) => {
    setSelectedRoles((prev) =>
      prev.includes(roleId)
        ? prev.filter((r) => r !== roleId)
        : [...prev, roleId],
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!entityId) {
      toast.error("Please select an item to feature");
      return;
    }

    startTransition(async () => {
      const res = await createFeaturedItem({
        section_id: sectionId,
        entity_type: entityType,
        entity_id: Number(entityId),
        allowed_roles: selectedRoles,
      });

      if (res.success) {
        toast.success("Item added to featured section");
        triggerSync([STORE.FEATURED_ITEMS]);
        onSuccess();
        onOpenChange(false);
      } else {
        toast.error(res.error || "Something went wrong");
      }
    });
  };

  const comboboxItems =
    entityType === "category"
      ? categories.map((cat) => ({ value: String(cat.id), label: cat.name }))
      : recordings.map((rec) => ({ value: String(rec.id), label: rec.name }));

  return (
    <AdminDialogShell
      open={open}
      onOpenChange={onOpenChange}
      title="Add Featured Item"
      description="Select a category or specific recording to display in this section."
      onSubmit={handleSubmit}
      submitText="Add Item"
      isPending={isPending}
      maxWidthClass="sm:max-w-[450px]"
    >
      <div className="grid gap-2">
        <Label htmlFor="item-type">Item Type</Label>
        <Select
          value={entityType}
          onValueChange={(val: "category" | "recording") => setEntityType(val)}
          disabled={isPending}
        >
          <SelectTrigger id="item-type">
            <SelectValue placeholder="Select Item Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="recording">
              Recording (Lecture / Seminar)
            </SelectItem>
            <SelectItem value="category">Category (Folder)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-2">
        <Label htmlFor="item-selector">
          Select {entityType === "category" ? "Category" : "Recording"}
        </Label>
        <Combobox
          items={comboboxItems}
          value={entityId}
          onValueChange={setEntityId}
          placeholder={`Search for a ${entityType}...`}
          emptyText={`No ${entityType} found.`}
        />
      </div>

      <div className="grid gap-2 pt-2 border-t">
        <div>
          <Label className="text-xs font-semibold uppercase text-muted-foreground">
            Target User Roles
          </Label>
          <p className="text-xs text-muted-foreground mt-0.5">
            Restrict this specific item to roles. Leave unchecked to inherit
            section roles.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-2 mt-1">
          {roles.map((role) => (
            <div
              key={role.id}
              className="flex items-center space-x-2 bg-muted/30 p-2 rounded-lg border border-border/50"
            >
              <Checkbox
                id={`item-role-${role.id}`}
                checked={selectedRoles.includes(role.id)}
                onCheckedChange={() => handleRoleToggle(role.id)}
                disabled={isPending}
              />
              <Label
                htmlFor={`item-role-${role.id}`}
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
