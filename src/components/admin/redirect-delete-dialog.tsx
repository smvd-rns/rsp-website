"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { deleteRedirect } from "@/app/actions/redirect-actions";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { STORE } from "@/constants";
import { toast } from "@/lib/toast";
import { triggerSync } from "@/lib/utils";
import type { Redirect } from "@/types";

interface RedirectDeleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  redirect: Redirect | null;
  onSuccess?: () => void;
}

export const RedirectDeleteDialog = ({
  open,
  onOpenChange,
  redirect,
  onSuccess,
}: RedirectDeleteDialogProps) => {
  const queryClient = useQueryClient();
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (!redirect) return;
    setIsDeleting(true);
    try {
      await deleteRedirect(redirect.id);
      await triggerSync([STORE.REDIRECTS]);
      queryClient.invalidateQueries({ queryKey: [STORE.REDIRECTS] });
      toast.success("Redirect deleted successfully.");
      onSuccess?.();
      onOpenChange(false);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to delete redirect.",
      );
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="sm:max-w-lg">
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Redirect</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete the redirect for{" "}
            <span className="font-mono font-semibold text-foreground">
              {redirect?.id}
            </span>
            ? This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={isDeleting}
            className="bg-danger text-danger-foreground hover:bg-danger/90"
          >
            {isDeleting ? "Deleting..." : "Delete"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
