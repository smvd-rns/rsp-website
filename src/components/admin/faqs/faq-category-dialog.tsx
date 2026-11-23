"use client";

import { useEffect, useState, useTransition } from "react";
import {
  createFaqCategory,
  updateFaqCategory,
} from "@/app/actions/faq-actions";
import { AdminDialogShell } from "@/components/admin/admin-dialog-shell";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/lib/toast";

interface FaqCategoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  category?: {
    id: number;
    name: string;
    slug: string;
    order_ind: number | null;
  } | null;
  onSuccess: () => void;
}

export const FaqCategoryDialog = ({
  open,
  onOpenChange,
  category,
  onSuccess,
}: FaqCategoryDialogProps) => {
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (category) {
      setName(category.name);
      setSlug(category.slug);
    } else {
      setName("");
      setSlug("");
    }
  }, [category]);

  const handleNameChange = (val: string) => {
    setName(val);
    if (!category) {
      setSlug(
        val
          .toLowerCase()
          .replace(/\s+/g, "-")
          .replace(/[^a-z0-9-]+/g, ""),
      );
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !slug.trim()) {
      toast.error("Name and slug are required");
      return;
    }

    startTransition(async () => {
      const res = category
        ? await updateFaqCategory(category.id, { name, slug })
        : await createFaqCategory({ name, slug });

      if (res.success) {
        toast.success(
          category
            ? "FAQ Category updated successfully"
            : "FAQ Category created successfully",
        );
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
      title={category ? "Edit FAQ Category" : "Add FAQ Category"}
      description={
        category
          ? "Update the details for this FAQ category."
          : "Create a new category to group related FAQs."
      }
      onSubmit={handleSubmit}
      submitText={category ? "Save Changes" : "Create Category"}
      isPending={isPending}
    >
      <div className="grid gap-2">
        <Label htmlFor="cat-name">Category Name</Label>
        <Input
          id="cat-name"
          value={name}
          onChange={(e) => handleNameChange(e.target.value)}
          placeholder="e.g. General Information"
          disabled={isPending}
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="cat-slug">URL Slug</Label>
        <Input
          id="cat-slug"
          value={slug}
          onChange={(e) => setSlug(e.target.value)}
          placeholder="e.g. general-info"
          disabled={isPending}
        />
      </div>
    </AdminDialogShell>
  );
};
