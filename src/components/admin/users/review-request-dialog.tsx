"use client";

import { Check, Info, Shield, X } from "lucide-react";
import { useEffect, useState } from "react";
import type { updateUserEditRequestStatus } from "@/app/actions/user-actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useRoles } from "@/hooks/use-roles";
import type { UserEditRequestWithUser } from "./types";
import { UserFormFields, UserRoleSelectField } from "./user-form-fields";

interface ReviewRequestDialogProps {
  request: UserEditRequestWithUser | null;
  isOpen: boolean;
  onOpenChange?: (open: boolean) => void;
  onClose?: () => void;
  onApprove?: (
    id: string,
    userId: string,
    edits: Parameters<typeof updateUserEditRequestStatus>[2],
  ) => void;
  onReject?: (
    id: string,
    userId: string,
    edits: Parameters<typeof updateUserEditRequestStatus>[2],
  ) => void;
  onStatusUpdated?: () => void;
}

export const ReviewRequestDialog = ({
  request,
  isOpen,
  onOpenChange,
  onClose,
  onApprove,
  onReject,
  onStatusUpdated,
}: ReviewRequestDialogProps) => {
  const { data: roles } = useRoles();
  const [formData, setFormData] = useState({
    requestedRoleId: "",
    name: "",
    phone: "",
    ashram: "",
    temple: "",
    purpose: "",
    authorityName: "",
    authorityRelationship: "",
    authorityEmail: "",
    reason: "",
    reviewComment: "",
  });

  useEffect(() => {
    if (request) {
      let authRel = request.authority_relationship || "";
      let authEmail = request.authority_email || "";

      // Normalize if database had email stored in relationship and relationship in email
      if (authRel.includes("@") && !authEmail?.includes("@")) {
        const temp = authEmail;
        authEmail = authRel;
        authRel = temp;
      }

      setFormData({
        requestedRoleId: request.requested_role_id?.toString() || "",
        name: request.name || "",
        phone: request.phone || "",
        ashram: request.ashram || "",
        temple: request.temple || "",
        purpose: request.purpose || "",
        authorityName: request.authority_name || "",
        authorityRelationship: authRel,
        authorityEmail: authEmail,
        reason: request.reason || "",
        reviewComment: request.review_comment || "",
      });
    }
  }, [request]);

  const handleClose = (open: boolean) => {
    if (onOpenChange) onOpenChange(open);
    if (!open && onClose) onClose();
  };

  const handleApproveSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!request) return;
    handleClose(false);
    if (onApprove) {
      onApprove(request.id, request.user_id, {
        requested_role_id: parseInt(formData.requestedRoleId, 10) || undefined,
        name: formData.name || null,
        phone: formData.phone || null,
        ashram: formData.ashram || null,
        temple: formData.temple || null,
        purpose: formData.purpose || null,
        authority_name: formData.authorityName || null,
        authority_relationship: formData.authorityRelationship || null,
        authority_email: formData.authorityEmail || null,
        review_comment: formData.reviewComment || null,
      });
    }
    if (onStatusUpdated) onStatusUpdated();
  };

  const handleRejectSubmit = () => {
    if (!request) return;
    handleClose(false);
    if (onReject) {
      onReject(request.id, request.user_id, {
        review_comment: formData.reviewComment || null,
      });
    }
    if (onStatusUpdated) onStatusUpdated();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent
        maxW="52rem"
        className="sm:max-w-3xl lg:max-w-4xl w-full max-h-[95vh] overflow-y-auto overflow-x-hidden p-0 gap-0 rounded-2xl border-border/80 shadow-2xl"
      >
        {/* Header */}
        <div className="p-6 pb-4 border-b border-border/60 bg-muted/20">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 shrink-0 shadow-2xs">
                <Shield className="size-5" />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold text-foreground">
                  Review Profile Update Request
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                  Review and optionally edit the details submitted by{" "}
                  <span className="font-semibold text-foreground">
                    {request?.users?.email}
                  </span>{" "}
                  before approving.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {formData.reason && (
            <div className="mt-4 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs flex gap-2.5">
              <Info className="size-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <span className="font-bold text-[10px] uppercase text-amber-700 dark:text-amber-300 block tracking-wider">
                  User's Stated Reason
                </span>
                <p className="text-foreground/90 italic">
                  &ldquo;{formData.reason}&rdquo;
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Form Body */}
        <form onSubmit={handleApproveSubmit} className="p-6 space-y-6">
          <div className="rounded-2xl border border-border/70 bg-muted/10 p-4 shadow-2xs">
            <UserRoleSelectField
              value={formData.requestedRoleId}
              onChange={(val) =>
                setFormData({ ...formData, requestedRoleId: val })
              }
              roles={roles}
              label="Requested Role"
            />
          </div>

          <UserFormFields formData={formData} onChange={setFormData} />

          <div className="space-y-2 pt-2">
            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">
              Reviewer Internal Comment / Note
            </Label>
            <Textarea
              value={formData.reviewComment}
              onChange={(e) =>
                setFormData({ ...formData, reviewComment: e.target.value })
              }
              placeholder="Add optional internal comments or rejection reason..."
              className="min-h-20 text-sm rounded-xl bg-card border-border/80 focus-visible:ring-primary/20"
            />
          </div>

          <DialogFooter className="pt-4 border-t border-border/60 flex items-center justify-between sm:justify-between w-full gap-2">
            <Button
              type="button"
              variant="destructive"
              onClick={handleRejectSubmit}
              className="rounded-xl h-10 px-4 gap-1.5"
            >
              <X className="size-4" />
              <span>Reject Request</span>
            </Button>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => handleClose(false)}
                className="rounded-xl h-10 px-4"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="rounded-xl h-10 px-5 gap-2 shadow-2xs"
              >
                <Check className="size-4 stroke-[2.5]" />
                <span>Approve Changes</span>
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
