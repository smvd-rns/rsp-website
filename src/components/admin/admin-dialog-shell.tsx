"use client";

import type React from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface AdminDialogShellProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  onSubmit: (e: React.FormEvent) => void;
  submitText: string;
  isPending?: boolean;
  children: React.ReactNode;
  maxWidthClass?: string;
}

export const AdminDialogShell = ({
  open,
  onOpenChange,
  title,
  description,
  onSubmit,
  submitText,
  isPending = false,
  children,
  maxWidthClass = "sm:max-w-[425px]",
}: AdminDialogShellProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={maxWidthClass}>
        <form onSubmit={onSubmit}>
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>{description}</DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">{children}</div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Saving..." : submitText}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export const DialogActionFooter = ({
  onCancel,
  isSubmitting,
  submitText,
  cancelText = "Cancel",
  submittingText = "Saving...",
  className = "pt-4",
}: {
  onCancel: () => void;
  isSubmitting: boolean;
  submitText: string;
  cancelText?: string;
  submittingText?: string;
  className?: string;
}) => (
  <DialogFooter className={className}>
    <Button
      type="button"
      variant="outline"
      onClick={onCancel}
      disabled={isSubmitting}
    >
      {cancelText}
    </Button>
    <Button type="submit" disabled={isSubmitting}>
      {isSubmitting ? submittingText : submitText}
    </Button>
  </DialogFooter>
);
