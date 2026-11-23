"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import {
  createServiceAssignment,
  updateServiceAssignment,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { STORE } from "@/constants";
import type { AssignmentWithDetails, UserListItem } from "@/hooks/use-services";
import { toast } from "@/lib/toast";
import type { Service } from "@/types";
import { ServiceUserSelect } from "./service-user-select";

interface AssignmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  assignment: AssignmentWithDetails | null;
  users: UserListItem[];
  services: Service[];
  prefilledUserId?: string;
  prefilledServiceId?: string;
  prefilledNotes?: string;
  onSuccess: () => void;
}

type AssignmentStatus = "active" | "completed" | "paused";

export const AssignmentDialog = ({
  open,
  onOpenChange,
  assignment,
  users,
  services,
  prefilledUserId = "",
  prefilledServiceId = "",
  prefilledNotes = "",
  onSuccess,
}: AssignmentDialogProps) => {
  const queryClient = useQueryClient();
  const [userId, setUserId] = useState("");
  const [serviceId, setServiceId] = useState("");
  const [role, setRole] = useState("");
  const [status, setStatus] = useState<AssignmentStatus>("active");
  const [startedAt, setStartedAt] = useState("");
  const [endedAt, setEndedAt] = useState("");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      if (assignment) {
        setUserId(assignment.user_id || "");
        setServiceId(
          assignment.service_id ? assignment.service_id.toString() : "",
        );
        setRole(assignment.role || "");
        setStatus((assignment.status as AssignmentStatus) || "active");
        setStartedAt(
          assignment.started_at ? assignment.started_at.split("T")[0] : "",
        );
        setEndedAt(
          assignment.ended_at ? assignment.ended_at.split("T")[0] : "",
        );
        setNotes(assignment.notes || "");
      } else {
        setUserId(prefilledUserId);
        setServiceId(prefilledServiceId);
        setRole(prefilledUserId ? "Volunteer" : "");
        setStatus("active");
        setStartedAt(new Date().toISOString().split("T")[0]);
        setEndedAt("");
        setNotes(prefilledNotes);
      }
    }
  }, [open, assignment, prefilledUserId, prefilledServiceId, prefilledNotes]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId || !serviceId || !role || !startedAt) {
      toast.error("Please fill in all required fields.");
      return;
    }

    setIsSubmitting(true);
    try {
      if (assignment) {
        // Edit Mode
        await updateServiceAssignment(assignment.id, {
          role,
          status,
          startedAt: new Date(startedAt).toISOString(),
          endedAt: endedAt ? new Date(endedAt).toISOString() : null,
          notes,
        });
        toast.success("Assignment updated successfully.");
      } else {
        // Add Mode
        await createServiceAssignment({
          userId,
          serviceId: parseInt(serviceId, 10),
          role,
          status,
          startedAt: new Date(startedAt).toISOString(),
          endedAt: endedAt ? new Date(endedAt).toISOString() : null,
          notes,
        });
        toast.success("User assigned to service successfully.");
      }
      queryClient.invalidateQueries({
        queryKey: [STORE.USER_SERVICE_ASSIGNMENTS],
      });
      onSuccess();
      onOpenChange(false);
      // biome-ignore lint/suspicious/noExplicitAny: catch block
    } catch (err: any) {
      toast.error(err?.message || "Failed to save assignment.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>
            {assignment ? "Edit Service Assignment" : "Assign User to Service"}
          </DialogTitle>
          <DialogDescription>
            Provide assignment details. Form fields marked with * are required.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <ServiceUserSelect
            currentUser={assignment?.users}
            users={users}
            value={userId}
            onChange={setUserId}
            placeholder="Select a volunteer..."
          />

          <div className="grid gap-2">
            <Label htmlFor="assign-service">Voluntary Service (Seva) *</Label>
            {assignment ? (
              <div className="text-sm font-semibold p-2 bg-muted rounded">
                {assignment.services?.name}
              </div>
            ) : (
              <Select value={serviceId} onValueChange={setServiceId}>
                <SelectTrigger id="assign-service">
                  <SelectValue placeholder="Select a service..." />
                </SelectTrigger>
                <SelectContent>
                  {services.map((s) => (
                    <SelectItem key={s.id} value={s.id.toString()}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="assign-role">Assigned Role / Title *</Label>
            <Input
              id="assign-role"
              placeholder="e.g. Lead Coordinator, Assistant, Speaker"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="assign-status">Status</Label>
              <Select
                value={status}
                onValueChange={(val) => setStatus(val as AssignmentStatus)}
              >
                <SelectTrigger id="assign-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="paused">Paused</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="assign-start">Start Date *</Label>
              <Input
                id="assign-start"
                type="date"
                value={startedAt}
                onChange={(e) => setStartedAt(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="assign-end">End Date (Optional)</Label>
            <Input
              id="assign-end"
              type="date"
              value={endedAt}
              onChange={(e) => setEndedAt(e.target.value)}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="assign-notes">Notes</Label>
            <Textarea
              id="assign-notes"
              placeholder="Specific scope, handovers, or details..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          <DialogActionFooter
            onCancel={() => onOpenChange(false)}
            isSubmitting={isSubmitting}
            submitText="Save Assignment"
          />
        </form>
      </DialogContent>
    </Dialog>
  );
};
