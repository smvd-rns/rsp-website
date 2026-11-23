"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import {
  createResponsibility,
  updateResponsibility,
} from "@/app/actions/service-actions";
import { DialogActionFooter } from "@/components/admin/admin-dialog-shell";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type {
  ResponsibilityWithDetails,
  UserListItem,
} from "@/hooks/use-services";
import { toast } from "@/lib/toast";
import { ServiceUserSelect } from "./service-user-select";

interface ResponsibilityDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  responsibility: ResponsibilityWithDetails | null;
  users: UserListItem[];
  onSuccess: () => void;
}

export const ResponsibilityDialog = ({
  open,
  onOpenChange,
  responsibility,
  users,
  onSuccess,
}: ResponsibilityDialogProps) => {
  const queryClient = useQueryClient();
  const [userId, setUserId] = useState("");
  const [title, setTitle] = useState("");
  const [scope, setScope] = useState("");
  const [startedAt, setStartedAt] = useState("");
  const [endedAt, setEndedAt] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      if (responsibility) {
        setUserId(responsibility.user_id || "");
        setTitle(responsibility.title || "");
        setScope(responsibility.scope || "");
        setStartedAt(
          responsibility.started_at
            ? responsibility.started_at.split("T")[0]
            : "",
        );
        setEndedAt(
          responsibility.ended_at ? responsibility.ended_at.split("T")[0] : "",
        );
      } else {
        setUserId("");
        setTitle("");
        setScope("");
        setStartedAt(new Date().toISOString().split("T")[0]);
        setEndedAt("");
      }
    }
  }, [open, responsibility]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId || !title) {
      toast.error("Please fill in all required fields.");
      return;
    }

    setIsSubmitting(true);
    try {
      if (responsibility) {
        await updateResponsibility(responsibility.id, {
          title,
          scope,
          startedAt: startedAt ? new Date(startedAt).toISOString() : null,
          endedAt: endedAt ? new Date(endedAt).toISOString() : null,
        });
        toast.success("Responsibility updated successfully.");
      } else {
        await createResponsibility({
          userId,
          title,
          scope,
          startedAt: startedAt ? new Date(startedAt).toISOString() : null,
          endedAt: endedAt ? new Date(endedAt).toISOString() : null,
        });
        toast.success("Responsibility assigned successfully.");
      }
      queryClient.invalidateQueries({ queryKey: ["user_responsibilities"] });
      onSuccess();
      onOpenChange(false);
      // biome-ignore lint/suspicious/noExplicitAny: catch block
    } catch (err: any) {
      toast.error(err?.message || "Failed to save responsibility.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>
            {responsibility
              ? "Edit Responsibility"
              : "Add General Responsibility"}
          </DialogTitle>
          <DialogDescription>
            Create general administrative responsibilities for user profiles.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <ServiceUserSelect
            id="resp-user"
            currentUser={responsibility?.users}
            users={users}
            value={userId}
            onChange={setUserId}
            placeholder="Select a user..."
          />

          <div className="grid gap-2">
            <Label htmlFor="resp-title">Responsibility Title *</Label>
            <Input
              id="resp-title"
              placeholder="e.g. Temple President, Tech Lead, Coordinator"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="resp-scope">Scope</Label>
            <Input
              id="resp-scope"
              placeholder="e.g. Local temple, specific region, national"
              value={scope}
              onChange={(e) => setScope(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="resp-start">Start Date</Label>
              <Input
                id="resp-start"
                type="date"
                value={startedAt}
                onChange={(e) => setStartedAt(e.target.value)}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="resp-end">End Date</Label>
              <Input
                id="resp-end"
                type="date"
                value={endedAt}
                onChange={(e) => setEndedAt(e.target.value)}
              />
            </div>
          </div>

          <DialogActionFooter
            onCancel={() => onOpenChange(false)}
            isSubmitting={isSubmitting}
            submitText="Save Responsibility"
          />
        </form>
      </DialogContent>
    </Dialog>
  );
};
