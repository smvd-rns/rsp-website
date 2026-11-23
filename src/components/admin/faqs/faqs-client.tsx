"use client";

import { useQueryClient } from "@tanstack/react-query";
import {
  ArrowDown,
  ArrowUp,
  Edit2,
  Eye,
  EyeOff,
  Plus,
  Trash,
} from "lucide-react";
import { useState, useTransition } from "react";
import {
  deleteFaq,
  deleteFaqCategory,
  reorderFaqCategories,
  reorderFaqs,
  updateFaq,
} from "@/app/actions/faq-actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { STORE } from "@/constants";
import { getDB } from "@/lib/idb";
import { swapAndReorder } from "@/lib/reorder-utils";
import { toast } from "@/lib/toast";
import { triggerSync } from "@/lib/utils";
import { FaqCategoryDialog } from "./faq-category-dialog";
import { FaqDialog } from "./faq-dialog";

interface FAQ {
  id: number;
  category_id: number;
  question: string;
  answer: string;
  order_ind: number | null;
  is_published: boolean | null;
  created_at: string | null;
  updated_at: string | null;
}

interface FAQCategory {
  id: number;
  name: string;
  slug: string;
  order_ind: number | null;
  created_at: string | null;
  updated_at: string | null;
  faqs?: FAQ[];
}

interface FaqsClientProps {
  categories: FAQCategory[];
  faqs: FAQ[];
}

export const FaqsClient = ({
  categories: initialCategories,
  faqs: initialFaqs,
}: FaqsClientProps) => {
  const queryClient = useQueryClient();
  const [activeCategoryId, setActiveCategoryId] = useState<number | null>(
    initialCategories.length > 0 ? initialCategories[0].id : null,
  );

  // Dialog States
  const [isCatDialogOpen, setIsCatDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<FAQCategory | null>(
    null,
  );

  const [isFaqDialogOpen, setIsFaqDialogOpen] = useState(false);
  const [editingFaq, setEditingFaq] = useState<FAQ | null>(null);

  const [isPending, startTransition] = useTransition();

  // Find active category and its FAQs
  const activeCategory = initialCategories.find(
    (c) => c.id === activeCategoryId,
  );
  const activeFaqs = initialFaqs
    .filter((f) => f.category_id === activeCategoryId)
    .sort((a, b) => (a.order_ind || 0) - (b.order_ind || 0));

  const handleEditCategory = (cat: FAQCategory) => {
    setEditingCategory(cat);
    setIsCatDialogOpen(true);
  };

  const handleAddCategory = () => {
    setEditingCategory(null);
    setIsCatDialogOpen(true);
  };

  const handleDeleteCategory = (id: number) => {
    if (
      !confirm(
        "Are you sure you want to delete this FAQ category? All FAQs in it will also be deleted.",
      )
    ) {
      return;
    }
    startTransition(async () => {
      const res = await deleteFaqCategory(id);
      if (res.success) {
        const db = await getDB();
        if (db) {
          await db.delete(STORE.FAQ_CATEGORIES, id);
        }
        toast.success("Category deleted successfully");
        triggerSync([STORE.FAQ_CATEGORIES]);
        queryClient.invalidateQueries({ queryKey: [STORE.FAQ_CATEGORIES] });
        if (activeCategoryId === id) {
          const remaining = initialCategories.filter((c) => c.id !== id);
          setActiveCategoryId(remaining.length > 0 ? remaining[0].id : null);
        }
      } else {
        toast.error(res.error || "Failed to delete category");
      }
    });
  };

  const handleAddFaq = () => {
    setEditingFaq(null);
    setIsFaqDialogOpen(true);
  };

  const handleEditFaq = (faq: FAQ) => {
    setEditingFaq(faq);
    setIsFaqDialogOpen(true);
  };

  const handleDeleteFaq = (id: number) => {
    if (!confirm("Are you sure you want to delete this FAQ item?")) {
      return;
    }
    startTransition(async () => {
      const res = await deleteFaq(id);
      if (res.success) {
        const db = await getDB();
        if (db) {
          await db.delete(STORE.FAQS, id);
        }
        toast.success("FAQ item deleted successfully");
        triggerSync([STORE.FAQS]);
        queryClient.invalidateQueries({ queryKey: [STORE.FAQS] });
      } else {
        toast.error(res.error || "Failed to delete FAQ");
      }
    });
  };

  const handleTogglePublish = (faq: FAQ) => {
    startTransition(async () => {
      const res = await updateFaq(faq.id, {
        category_id: faq.category_id,
        question: faq.question,
        answer: faq.answer,
        is_published: !faq.is_published,
      });
      if (res.success) {
        toast.success(
          faq.is_published ? "FAQ draft saved" : "FAQ published successfully",
        );
      } else {
        toast.error(res.error || "Failed to update FAQ publish status");
      }
    });
  };

  // Reordering
  const handleMoveCategory = (index: number, direction: "up" | "down") => {
    const sortedCats = [...initialCategories].sort(
      (a, b) => (a.order_ind || 0) - (b.order_ind || 0),
    );
    const payload = swapAndReorder(sortedCats, index, direction);
    if (!payload) return;

    startTransition(async () => {
      const res = await reorderFaqCategories(payload);
      if (!res.success) {
        toast.error(res.error || "Failed to reorder categories");
      }
    });
  };

  const handleMoveFaq = (index: number, direction: "up" | "down") => {
    const payload = swapAndReorder(activeFaqs, index, direction);
    if (!payload) return;

    startTransition(async () => {
      const res = await reorderFaqs(payload);
      if (!res.success) {
        toast.error(res.error || "Failed to reorder FAQs");
      }
    });
  };

  const sortedCats = [...initialCategories].sort(
    (a, b) => (a.order_ind || 0) - (b.order_ind || 0),
  );

  return (
    <div className="grid gap-6 md:grid-cols-[260px_1fr]">
      {/* Category Sidebar */}
      <Card className="h-fit">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-lg font-bold">Categories</CardTitle>
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8"
            onClick={handleAddCategory}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent className="p-2 space-y-1">
          {sortedCats.length === 0 ? (
            <div className="text-center p-4 text-sm text-muted-foreground">
              No categories found
            </div>
          ) : (
            sortedCats.map((cat, idx) => {
              const isActive = cat.id === activeCategoryId;
              return (
                <button
                  key={cat.id}
                  type="button"
                  className={`w-full text-left flex items-center justify-between group rounded-md px-3 py-2 text-sm font-medium transition-colors cursor-pointer ${
                    isActive
                      ? "bg-warning/5 text-warning "
                      : "text-foreground/80 hover:bg-muted hover:text-foreground "
                  }`}
                  onClick={() => setActiveCategoryId(cat.id)}
                >
                  <span className="truncate mr-2">{cat.name}</span>
                  <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-6 w-6"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleMoveCategory(idx, "up");
                      }}
                      disabled={idx === 0 || isPending}
                    >
                      <ArrowUp className="h-3 w-3" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-6 w-6"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleMoveCategory(idx, "down");
                      }}
                      disabled={idx === sortedCats.length - 1 || isPending}
                    >
                      <ArrowDown className="h-3 w-3" />
                    </Button>
                  </div>
                </button>
              );
            })
          )}
        </CardContent>
      </Card>

      {/* FAQs List Area */}
      <div className="space-y-6">
        {activeCategory ? (
          <Card>
            <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4">
              <div>
                <CardTitle className="text-xl font-bold flex items-center gap-2 text-foreground">
                  {activeCategory.name}
                  <Badge variant="outline" className="font-mono text-xs">
                    /{activeCategory.slug}
                  </Badge>
                </CardTitle>
                <CardDescription>
                  Manage the frequently asked questions in this category.
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleEditCategory(activeCategory)}
                >
                  <Edit2 className="h-4 w-4 mr-2" />
                  Edit Category
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-destructive hover:bg-destructive/10"
                  onClick={() => handleDeleteCategory(activeCategory.id)}
                >
                  <Trash className="h-4 w-4 mr-2" />
                  Delete
                </Button>
                <Button size="sm" onClick={handleAddFaq}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add FAQ
                </Button>
              </div>
            </CardHeader>
            <Separator />
            <CardContent className="pt-6 space-y-4">
              {activeFaqs.length === 0 ? (
                <div className="text-center py-12 text-sm text-muted-foreground border-2 border-dashed border-border rounded-lg">
                  No FAQ questions created in this category yet.
                </div>
              ) : (
                activeFaqs.map((faq, idx) => (
                  <div
                    key={faq.id}
                    className="p-4 border border-border rounded-lg bg-muted/50/50 text-primary-foreground/10 flex flex-col sm:flex-row justify-between items-start gap-4 transition-all hover:border-input"
                  >
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-semibold text-foreground">
                          {faq.question}
                        </h4>
                        {!faq.is_published && (
                          <Badge
                            variant="secondary"
                            className="bg-muted text-muted-foreground"
                          >
                            Draft
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                        {faq.answer}
                      </p>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8"
                        onClick={() => handleTogglePublish(faq)}
                        title={faq.is_published ? "Unpublish" : "Publish"}
                        disabled={isPending}
                      >
                        {faq.is_published ? (
                          <Eye className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <EyeOff className="h-4 w-4 text-muted-foreground/80" />
                        )}
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8"
                        onClick={() => handleMoveFaq(idx, "up")}
                        disabled={idx === 0 || isPending}
                        title="Move Up"
                      >
                        <ArrowUp className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8"
                        onClick={() => handleMoveFaq(idx, "down")}
                        disabled={idx === activeFaqs.length - 1 || isPending}
                        title="Move Down"
                      >
                        <ArrowDown className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-muted-foreground hover:text-foreground"
                        onClick={() => handleEditFaq(faq)}
                        title="Edit FAQ"
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => handleDeleteFaq(faq.id)}
                        title="Delete FAQ"
                        disabled={isPending}
                      >
                        <Trash className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="text-center p-12 text-sm text-muted-foreground border border-border rounded-lg">
            Create or select a category to start managing FAQs.
          </div>
        )}
      </div>

      {/* Dialogs */}
      <FaqCategoryDialog
        open={isCatDialogOpen}
        onOpenChange={setIsCatDialogOpen}
        category={editingCategory}
        onSuccess={() => {}}
      />
      {activeCategoryId && (
        <FaqDialog
          open={isFaqDialogOpen}
          onOpenChange={setIsFaqDialogOpen}
          faq={editingFaq}
          categoryId={activeCategoryId}
          categories={initialCategories.map((c) => ({
            id: c.id,
            name: c.name,
          }))}
          onSuccess={() => {}}
        />
      )}
    </div>
  );
};
