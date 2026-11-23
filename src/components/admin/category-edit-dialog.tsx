"use client";

import { Folder } from "lucide-react";
import { CategoryEditForm } from "@/components/admin/category-edit-form";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { categoryPath } from "@/lib/utils";
import type { Category } from "@/types";

interface CategoryEditDialogProps {
  category: Category | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export const CategoryEditDialog = ({
  category,
  open,
  onOpenChange,
  onSuccess,
}: CategoryEditDialogProps) => {
  if (!category) return null;

  const initialRoles = category.allowed_roles || [];
  const cleanPath = categoryPath(category.url_path as string);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-3xl max-h-[90vh] overflow-y-auto p-0 rounded-3xl border border-border/80 bg-background shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Colorful Gradient Header */}
        <div className="relative overflow-hidden border-b border-border/60 bg-gradient-to-r from-amber-500/15 via-orange-500/10 to-primary/10 p-5 sm:p-6 pr-12">
          <div className="absolute top-0 right-0 -mt-6 -mr-6 w-32 h-32 rounded-full bg-amber-500/10 blur-2xl pointer-events-none" />

          <DialogHeader className="flex flex-col gap-2.5">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge
                variant="outline"
                className="bg-amber-500/15 text-amber-800 dark:text-amber-200 border-amber-500/30 text-xs font-semibold px-2.5 py-0.5 rounded-full"
              >
                <Folder className="w-3 h-3 mr-1 text-amber-600 dark:text-amber-400" />
                Category #{category.id}
              </Badge>
              {cleanPath && (
                <Badge
                  variant="outline"
                  className="bg-muted/80 text-muted-foreground text-xs font-mono px-2.5 py-0.5 rounded-full border-border/70 max-w-md truncate"
                >
                  {cleanPath}
                </Badge>
              )}
            </div>

            <DialogTitle className="text-xl sm:text-2xl font-bold font-heading text-foreground flex items-center gap-2 flex-wrap">
              <span>Edit Category</span>
              <span className="text-primary font-semibold">
                &ldquo;{category.name}&rdquo;
              </span>
            </DialogTitle>

            <DialogDescription className="text-xs text-muted-foreground leading-relaxed max-w-xl">
              Modify folder name, move category to another branch, change cover
              artwork, and manage role security. All changes automatically sync
              to Google Drive.
            </DialogDescription>
          </DialogHeader>
        </div>

        {/* Modal Body with Form */}
        <div className="p-5 sm:p-7">
          <CategoryEditForm
            category={category}
            initialRoles={initialRoles}
            onSuccess={() => {
              onSuccess?.();
              onOpenChange(false);
            }}
            onCancel={() => {
              onOpenChange(false);
            }}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
};
