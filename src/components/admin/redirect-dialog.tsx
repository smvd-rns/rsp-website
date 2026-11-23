"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { createRedirect, updateRedirect } from "@/app/actions/redirect-actions";
import { CategoryCombobox } from "@/components/admin/category-combobox";
import { Button } from "@/components/ui/button";
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
import { STORE } from "@/constants";
import { useCategories } from "@/hooks/use-categories";
import { toast } from "@/lib/toast";
import { triggerSync } from "@/lib/utils";
import type { Redirect } from "@/types";

interface RedirectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  redirect: Redirect | null;
  onSuccess?: () => void;
}

export const RedirectDialog = ({
  open,
  onOpenChange,
  redirect,
  onSuccess,
}: RedirectDialogProps) => {
  const queryClient = useQueryClient();
  const { data: categories = [] } = useCategories();

  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(
    null,
  );
  const [toPath, setToPath] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (redirect) {
      const matched = categories.find((c) => c.url_path === redirect.id);
      setSelectedCategoryId(matched ? matched.id : null);
      setToPath(redirect.to_path);
    } else {
      setSelectedCategoryId(null);
      setToPath("");
    }
  }, [redirect, categories]);

  const selectedCategory = categories.find((c) => c.id === selectedCategoryId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const fromPath =
      selectedCategory?.url_path || (redirect ? redirect.id : "");
    const trimmedToPath = toPath.trim();

    if (!fromPath) {
      toast.error("Please select a category.");
      return;
    }

    if (!trimmedToPath) {
      toast.error("Please enter a destination path.");
      return;
    }

    setIsSaving(true);
    try {
      if (redirect) {
        await updateRedirect({
          id: redirect.id,
          from_path: selectedCategory?.url_path,
          to_path: trimmedToPath,
        });
        toast.success("Redirect updated successfully.");
      } else {
        await createRedirect({
          from_path: fromPath,
          to_path: trimmedToPath,
        });
        toast.success("Redirect created successfully.");
      }

      await triggerSync([STORE.REDIRECTS]);
      queryClient.invalidateQueries({ queryKey: [STORE.REDIRECTS] });
      onSuccess?.();
      onOpenChange(false);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to save redirect.",
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <form onSubmit={handleSubmit} className="space-y-4">
          <DialogHeader>
            <DialogTitle>
              {redirect ? "Edit Redirect" : "New Redirect"}
            </DialogTitle>
            <DialogDescription>
              {redirect
                ? "Update destination forwarding rule for this category."
                : "Select a category and specify where visits should be redirected."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="redirect-category">
                From Category <span className="text-danger">*</span>
              </Label>
              <CategoryCombobox
                id="redirect-category"
                value={selectedCategoryId}
                onChange={setSelectedCategoryId}
                placeholder="Select category..."
                categories={categories}
                allowRoot={false}
              />
              {selectedCategory?.url_path ? (
                <p className="text-xs font-mono text-muted-foreground break-all">
                  From Path:{" "}
                  <span className="text-foreground font-medium">
                    {selectedCategory.url_path}
                  </span>
                </p>
              ) : redirect?.id ? (
                <p className="text-xs font-mono text-muted-foreground break-all">
                  Current From Path:{" "}
                  <span className="text-foreground font-medium">
                    {redirect.id}
                  </span>
                </p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor="to_path">
                To Destination <span className="text-danger">*</span>
              </Label>
              <Input
                id="to_path"
                value={toPath}
                onChange={(e) => setToPath(e.target.value)}
                placeholder="e.g. /new-page or https://external.com"
                required
              />
            </div>
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
              {isSaving
                ? "Saving..."
                : redirect
                  ? "Save Changes"
                  : "Create Redirect"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
