"use client";

import {
  closestCenter,
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { restrictToVerticalAxis } from "@dnd-kit/modifiers";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useQueryClient } from "@tanstack/react-query";
import {
  ArrowDownAZ,
  ArrowUpZA,
  ChevronLeft,
  ChevronRight,
  Folder,
  FolderTree,
  GripVertical,
  List,
  Pencil,
  RotateCw,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import {
  reorderCategories,
  restoreCategory,
  softDeleteCategory,
} from "@/app/actions/category-actions";
import { deleteCategoryPermanentlyAction } from "@/app/actions/trash-actions";
import { CategoryEditDialog } from "@/components/admin/category-edit-dialog";
import { CategoryTreeView } from "@/components/admin/category-tree-view";
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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { QUERY_KEY } from "@/constants";
import { localDeleteCategory, localTrashCategory } from "@/lib/idb";
import { reorderItems, toReorderPayload } from "@/lib/reorder-utils";
import { toast } from "@/lib/toast";
import { categoryPath, cn } from "@/lib/utils";
import type { Category } from "@/types";

interface CategoryTableProps {
  categories: Category[];
  allCategories?: Category[];
  isTrash?: boolean;
}

const SortableRow = ({
  cat,
  subCount = 0,
  isTrash,
  onOpenInTree,
  onEditCategory,
}: {
  cat: Category;
  subCount?: number;
  isTrash?: boolean;
  onOpenInTree?: (cat: Category) => void;
  onEditCategory?: (cat: Category) => void;
}) => {
  const queryClient = useQueryClient();
  const router = useRouter();
  const [isProcessing, setIsProcessing] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: cat.id });

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 1 : 0,
  };

  const handleRestore = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsProcessing(true);
    const toastId = toast.loading("Restoring category...");
    try {
      await restoreCategory(cat.id);

      await localDeleteCategory(cat.id);

      queryClient.invalidateQueries({ queryKey: [QUERY_KEY.ALL_CATEGORIES] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY.CATEGORY_PAGE] });
      queryClient.invalidateQueries({ queryKey: ["trash"] });

      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("trigger-sync"));
      }

      toast.success("Category restored", { id: toastId });
    } catch (err: unknown) {
      toast.error(
        (err as { message?: string }).message || "Failed to restore category",
        { id: toastId },
      );
      setIsProcessing(false);
    }
  };

  const handleSoftDelete = async () => {
    setIsProcessing(true);
    const toastId = toast.loading(
      "Moving category and all recordings to Trash...",
    );
    try {
      await softDeleteCategory(cat.id);
      await localTrashCategory(cat.id);

      queryClient.invalidateQueries({ queryKey: [QUERY_KEY.ALL_CATEGORIES] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY.CATEGORY_PAGE] });
      queryClient.invalidateQueries({ queryKey: ["trash"] });

      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("trigger-sync"));
      }

      toast.success("Category and recordings moved to Trash", { id: toastId });
    } catch (err: unknown) {
      toast.error(
        (err as { message?: string }).message || "Failed to delete category",
        { id: toastId },
      );
      setIsProcessing(false);
    }
  };

  const handleDeletePermanently = async () => {
    setIsProcessing(true);
    const toastId = toast.loading(
      "Deleting category and all recordings permanently...",
    );
    try {
      await deleteCategoryPermanentlyAction(cat.id);

      await localDeleteCategory(cat.id);

      queryClient.invalidateQueries({ queryKey: [QUERY_KEY.ALL_CATEGORIES] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY.CATEGORY_PAGE] });
      queryClient.invalidateQueries({ queryKey: ["trash"] });

      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("trigger-sync"));
      }

      toast.success("Category and recordings permanently deleted", {
        id: toastId,
      });
    } catch (err: unknown) {
      toast.error(
        (err as { message?: string }).message || "Failed to delete category",
        { id: toastId },
      );
      setIsProcessing(false);
    }
  };

  return (
    <>
      <TableRow
        ref={setNodeRef}
        style={style}
        className={cn(
          "transition-colors relative overflow-hidden",
          isTrash
            ? "hover:bg-muted/50/50 text-primary-foreground/20"
            : "cursor-pointer hover:bg-muted/50 text-primary-foreground",
          isProcessing &&
            "opacity-50 pointer-events-none select-none bg-muted/50 ",
        )}
        onClick={() => {
          if (!isTrash) {
            onOpenInTree?.(cat);
          }
        }}
      >
        <TableCell className="w-[50px]" onClick={(e) => e.stopPropagation()}>
          {!isTrash && (
            <div
              {...attributes}
              {...listeners}
              className="cursor-grab active:cursor-grabbing p-2"
            >
              <GripVertical className="h-4 w-4 text-muted-foreground/80 group-hover:text-muted-foreground" />
            </div>
          )}
        </TableCell>
        <TableCell className="font-semibold text-foreground">
          <div className="flex items-center gap-2">
            <Folder className="w-4 h-4 text-amber-500 fill-amber-500/20 shrink-0" />
            <span className="truncate max-w-[280px]">{cat.name}</span>
            {subCount > 0 && (
              <Badge
                variant="outline"
                className="text-[10px] font-bold bg-amber-500/15 text-amber-800 dark:text-amber-200 border-amber-500/30 px-2 py-0 rounded-full shrink-0"
              >
                {subCount} {subCount === 1 ? "subfolder" : "subfolders"}
              </Badge>
            )}
          </div>
        </TableCell>
        <TableCell className="text-muted-foreground hidden sm:table-cell font-mono text-xs">
          {categoryPath(cat.url_path as string)}
        </TableCell>

        {/* Actions Column (Visible for both Normal & Trash views) */}
        <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
          {isTrash ? (
            <div className="flex items-center justify-end gap-2">
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                disabled={isProcessing}
                onClick={handleRestore}
                title="Restore"
              >
                <RotateCw className="h-4 w-4" />
              </Button>
              <Button
                variant="destructive"
                size="icon"
                className="h-8 w-8"
                disabled={isProcessing}
                onClick={() => setShowDeleteConfirm(true)}
                title="Delete Permanently"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <div className="flex items-center justify-end gap-1.5">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-blue-600 dark:text-blue-400 hover:text-blue-700 hover:bg-blue-500/15 rounded-lg cursor-pointer"
                title="Edit Category (Name, Path, Artwork)"
                onClick={(e) => {
                  e.stopPropagation();
                  if (onEditCategory) {
                    onEditCategory(cat);
                  } else {
                    const cleanSlug = categoryPath(
                      cat.url_path as string,
                    ).replace(/^\/+/, "");
                    router.push(`/admin/content/${cleanSlug}`);
                  }
                }}
              >
                <Pencil className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-rose-500 hover:text-rose-600 hover:bg-rose-500/10 rounded-lg cursor-pointer"
                title="Delete Category & All Recordings"
                disabled={isProcessing}
                onClick={(e) => {
                  e.stopPropagation();
                  setShowDeleteConfirm(true);
                }}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          )}
        </TableCell>

        {isProcessing && (
          <td className="absolute inset-0 p-0 pointer-events-none z-10 col-span-4">
            <div className="w-full h-full bg-gradient-to-r from-transparent via-primary/10 to-transparent animate-shimmer" />
          </td>
        )}
      </TableRow>

      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent onClick={(e) => e.stopPropagation()}>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {isTrash
                ? "Permanently Delete Category?"
                : `Delete "${cat.name}" and all contents?`}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {isTrash ? (
                "Are you sure you want to PERMANENTLY delete this category, all its subcategories, and all recordings inside it? This cannot be undone."
              ) : (
                <span>
                  Deleting this category will also{" "}
                  <strong>
                    delete all subcategories and all recordings inside it
                  </strong>{" "}
                  from both the website and Google Drive.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={(e) => {
                e.stopPropagation();
                setShowDeleteConfirm(false);
              }}
            >
              Cancel
            </AlertDialogCancel>
            {!isTrash ? (
              <>
                <Button
                  variant="outline"
                  onClick={async (e) => {
                    e.stopPropagation();
                    setShowDeleteConfirm(false);
                    await handleSoftDelete();
                  }}
                  className="border-amber-500/40 text-amber-700 dark:text-amber-300 hover:bg-amber-500/10"
                >
                  Move to Trash
                </Button>
                <AlertDialogAction
                  onClick={async (e) => {
                    e.stopPropagation();
                    setShowDeleteConfirm(false);
                    await handleDeletePermanently();
                  }}
                  className="bg-destructive hover:bg-destructive text-white"
                >
                  Delete Permanently
                </AlertDialogAction>
              </>
            ) : (
              <AlertDialogAction
                onClick={async (e) => {
                  e.stopPropagation();
                  setShowDeleteConfirm(false);
                  await handleDeletePermanently();
                }}
                className="bg-destructive hover:bg-destructive text-white"
              >
                Delete Permanently
              </AlertDialogAction>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export const CategoryTable = ({
  categories: initialCategories,
  allCategories,
  isTrash = false,
}: CategoryTableProps) => {
  const [categories, setCategories] = useState(initialCategories);
  const [hasChanges, setHasChanges] = useState(false);
  const [isPending, startTransition] = useTransition();

  // Search, Pagination, View Mode state (Tree View is default as requested)
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<"table" | "tree">("tree");
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [tableSort, setTableSort] = useState<
    "natural" | "desc" | "subcategories" | "custom"
  >("natural");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(10);

  // Update local state when initialCategories change
  useEffect(() => {
    setCategories(initialCategories);
    setHasChanges(false);
  }, [initialCategories]);

  // Subcategory count map from all categories
  const subcategoryCountMap = useMemo(() => {
    const map = new Map<number, number>();
    const pool = allCategories?.length ? allCategories : categories;
    for (const c of pool) {
      let pId: number | null = null;
      if (c.parent_id !== undefined && c.parent_id !== null) {
        pId = Number(c.parent_id);
      } else if (c.parentid !== undefined && c.parentid !== null) {
        pId = Number(c.parentid);
      } else {
        const parts = String(c.path || "")
          .split(".")
          .filter(Boolean);
        if (parts.length > 0) {
          const num = Number.parseInt(parts[parts.length - 1], 10);
          if (!Number.isNaN(num)) pId = num;
        }
      }
      if (pId !== null) {
        map.set(pId, (map.get(pId) || 0) + 1);
      }
    }
    return map;
  }, [allCategories, categories]);

  // Filtered and sorted categories for Table View
  const filteredCategories = useMemo(() => {
    const q = search.trim().toLowerCase();
    let res = categories;
    if (q) {
      res = res.filter((cat) => {
        const name = String(cat.name || "").toLowerCase();
        const url = String(cat.url_path || "").toLowerCase();
        return name.includes(q) || url.includes(q);
      });
    }

    if (tableSort === "natural") {
      return [...res].sort((a, b) =>
        a.name.localeCompare(b.name, undefined, {
          numeric: true,
          sensitivity: "base",
        }),
      );
    }
    if (tableSort === "desc") {
      return [...res].sort((a, b) =>
        b.name.localeCompare(a.name, undefined, {
          numeric: true,
          sensitivity: "base",
        }),
      );
    }
    if (tableSort === "subcategories") {
      return [...res].sort(
        (a, b) =>
          (subcategoryCountMap.get(b.id) || 0) -
          (subcategoryCountMap.get(a.id) || 0),
      );
    }
    return res;
  }, [categories, search, tableSort, subcategoryCountMap]);

  // Paginated categories for Table View
  const paginatedCategories = useMemo(() => {
    if (pageSize >= 999) return filteredCategories;
    const start = (currentPage - 1) * pageSize;
    return filteredCategories.slice(start, start + pageSize);
  }, [filteredCategories, currentPage, pageSize]);

  const totalPages = Math.max(
    1,
    Math.ceil(
      filteredCategories.length /
        (pageSize >= 999 ? filteredCategories.length || 1 : pageSize),
    ),
  );

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setCategories((items) => reorderItems(items, active.id, over.id));
      setHasChanges(true);
    }
  };

  const handleSaveReorder = async () => {
    startTransition(async () => {
      try {
        await reorderCategories(toReorderPayload(categories));
        setHasChanges(false);
        toast.success("Order saved successfully.");
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to save order.";
        toast.error(message);
      }
    });
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Header bar with View Mode Switcher and Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-1 border-b border-border/50">
        <div className="flex items-center gap-3">
          <h3 className="text-base sm:text-lg font-bold font-heading text-foreground">
            {isTrash
              ? "Deleted Categories"
              : viewMode === "tree"
                ? "Category Tree Hierarchy"
                : "Sub-categories"}
          </h3>
          <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-800 dark:text-amber-200 border border-amber-500/30">
            {viewMode === "tree"
              ? `${allCategories?.length || categories.length} Total Categories (${categories.length} Root)`
              : `${filteredCategories.length} ${filteredCategories.length === 1 ? "Folder" : "Folders"}`}
          </span>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {!isTrash && (
            <div className="flex items-center p-0.5 bg-muted/60 border border-border/80 rounded-xl text-xs">
              <button
                type="button"
                onClick={() => setViewMode("table")}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1 rounded-lg font-semibold transition-all cursor-pointer",
                  viewMode === "table"
                    ? "bg-card text-foreground shadow-2xs font-bold"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <List className="w-3.5 h-3.5" />
                <span>Table</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode("tree")}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1 rounded-lg font-semibold transition-all cursor-pointer",
                  viewMode === "tree"
                    ? "bg-card text-foreground shadow-2xs font-bold"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <FolderTree className="w-3.5 h-3.5" />
                <span>Tree View</span>
              </button>
            </div>
          )}

          {hasChanges && !isTrash && viewMode === "table" && (
            <Button
              onClick={handleSaveReorder}
              disabled={isPending}
              size="sm"
              className="h-8 text-xs font-bold rounded-xl bg-primary text-primary-foreground shadow-xs cursor-pointer"
            >
              {isPending ? "Saving..." : "Save Reorder"}
            </Button>
          )}
        </div>
      </div>

      {/* VIEW MODE 1: TREE VIEW */}
      {viewMode === "tree" && !isTrash ? (
        <CategoryTreeView
          categories={allCategories?.length ? allCategories : categories}
          onEditCategory={(cat) => setEditingCategory(cat)}
        />
      ) : (
        /* VIEW MODE 2: TABLE VIEW WITH SEARCH & PAGINATION */
        <div className="flex flex-col gap-3">
          {/* Search bar, Sort & Page Size toolbar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 bg-muted/20 border border-border/70 rounded-2xl">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search categories by name or path..."
                className="pl-9 pr-8 h-8 text-xs rounded-xl bg-background border-border/80"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-2 flex-wrap self-end sm:self-auto text-xs text-muted-foreground">
              {/* Sort selector for Table View */}
              <div className="flex items-center gap-1 bg-muted/60 p-0.5 rounded-xl border border-border/60">
                <Button
                  type="button"
                  variant={tableSort === "natural" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setTableSort("natural")}
                  className={cn(
                    "h-7 px-2 text-xs rounded-lg gap-1 transition-all",
                    tableSort === "natural"
                      ? "bg-amber-600 hover:bg-amber-700 text-white shadow-2xs"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                  title="Sort A to Z"
                >
                  <ArrowDownAZ className="w-3.5 h-3.5" />
                  <span>A–Z</span>
                </Button>
                <Button
                  type="button"
                  variant={tableSort === "desc" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setTableSort("desc")}
                  className={cn(
                    "h-7 px-2 text-xs rounded-lg gap-1 transition-all",
                    tableSort === "desc"
                      ? "bg-amber-600 hover:bg-amber-700 text-white shadow-2xs"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                  title="Sort Z to A"
                >
                  <ArrowUpZA className="w-3.5 h-3.5" />
                  <span>Z–A</span>
                </Button>
                <Button
                  type="button"
                  variant={tableSort === "subcategories" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setTableSort("subcategories")}
                  className={cn(
                    "h-7 px-2 text-xs rounded-lg gap-1 transition-all",
                    tableSort === "subcategories"
                      ? "bg-amber-600 hover:bg-amber-700 text-white shadow-2xs"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                  title="Sort by Subfolder count"
                >
                  <FolderTree className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Subfolders</span>
                </Button>
              </div>

              <div className="flex items-center gap-1.5 ml-1">
                <span>Show</span>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="h-8 px-2 rounded-lg bg-background border border-border/80 text-foreground text-xs cursor-pointer focus:outline-hidden"
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={9999}>All</option>
                </select>
                <span>per page</span>
              </div>
            </div>
          </div>

          {/* Table Canvas */}
          <div className="rounded-2xl border border-border/80 overflow-hidden shadow-2xs bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  {!isTrash && <TableHead className="w-[50px]"></TableHead>}
                  <TableHead>Name</TableHead>
                  <TableHead className="hidden sm:table-cell">
                    URL Path
                  </TableHead>
                  <TableHead className="w-[100px] text-right">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd}
                  modifiers={[restrictToVerticalAxis]}
                >
                  <SortableContext
                    items={paginatedCategories.map((c) => c.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    {paginatedCategories.length > 0 ? (
                      paginatedCategories.map((cat) => (
                        <SortableRow
                          key={cat.id}
                          cat={cat}
                          subCount={subcategoryCountMap.get(cat.id) || 0}
                          isTrash={isTrash}
                          onOpenInTree={() => setViewMode("tree")}
                          onEditCategory={(c) => setEditingCategory(c)}
                        />
                      ))
                    ) : (
                      <TableRow>
                        <TableCell
                          colSpan={4}
                          className="text-center py-10 text-muted-foreground text-xs"
                        >
                          {search
                            ? `No categories match "${search}".`
                            : "No categories found in this section."}
                        </TableCell>
                      </TableRow>
                    )}
                  </SortableContext>
                </DndContext>
              </TableBody>
            </Table>
          </div>

          {/* Pagination Controls Footer */}
          {filteredCategories.length > 0 && pageSize < 999 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-2 py-2 text-xs text-muted-foreground">
              <div>
                Showing{" "}
                <strong className="text-foreground">
                  {(currentPage - 1) * pageSize + 1}
                </strong>{" "}
                to{" "}
                <strong className="text-foreground">
                  {Math.min(currentPage * pageSize, filteredCategories.length)}
                </strong>{" "}
                of{" "}
                <strong className="text-foreground">
                  {filteredCategories.length}
                </strong>{" "}
                categories
              </div>

              {totalPages > 1 && (
                <div className="flex items-center gap-1.5">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={currentPage <= 1}
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    className="h-8 px-2.5 rounded-lg text-xs gap-1"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                    <span>Prev</span>
                  </Button>

                  <div className="flex items-center gap-1">
                    {Array.from({ length: totalPages }, (_, i) => i + 1)
                      .filter((p) => {
                        return (
                          p === 1 ||
                          p === totalPages ||
                          Math.abs(p - currentPage) <= 1
                        );
                      })
                      .map((p, idx, arr) => {
                        const prev = arr[idx - 1];
                        return (
                          <div key={p} className="flex items-center">
                            {prev && p - prev > 1 && (
                              <span className="px-1 text-muted-foreground">
                                ...
                              </span>
                            )}
                            <button
                              type="button"
                              onClick={() => setCurrentPage(p)}
                              className={cn(
                                "w-7 h-7 rounded-lg text-xs font-semibold transition-all cursor-pointer",
                                currentPage === p
                                  ? "bg-primary text-primary-foreground font-bold shadow-2xs"
                                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
                              )}
                            >
                              {p}
                            </button>
                          </div>
                        );
                      })}
                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={currentPage >= totalPages}
                    onClick={() =>
                      setCurrentPage((p) => Math.min(totalPages, p + 1))
                    }
                    className="h-8 px-2.5 rounded-lg text-xs gap-1"
                  >
                    <span>Next</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* In-Page Edit Category Modal - Zero Page Refresh */}
      <CategoryEditDialog
        category={editingCategory}
        open={Boolean(editingCategory)}
        onOpenChange={(open) => {
          if (!open) setEditingCategory(null);
        }}
        onSuccess={() => {
          setEditingCategory(null);
        }}
      />
    </div>
  );
};
