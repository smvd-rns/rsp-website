"use client";

import { useQueryClient } from "@tanstack/react-query";
import {
  ArrowDownAZ,
  ArrowUpZA,
  ChevronDown,
  ChevronRight,
  Folder,
  FolderOpen,
  FolderTree,
  Maximize2,
  Minimize2,
  Pencil,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { softDeleteCategory } from "@/app/actions/category-actions";
import { deleteCategoryPermanentlyAction } from "@/app/actions/trash-actions";
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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { QUERY_KEY } from "@/constants";
import { localDeleteCategory, localTrashCategory } from "@/lib/idb";
import { toast } from "@/lib/toast";
import { categoryPath, cn } from "@/lib/utils";
import type { Category } from "@/types";

interface CategoryTreeViewProps {
  categories: Category[];
  selectedCategoryId?: number | null;
  onSelectCategory?: (category: Category | null) => void;
  onEditCategory?: (category: Category) => void;
  showActions?: boolean;
}

interface TreeNode {
  category: Category;
  children: TreeNode[];
  fullPathNames: string[];
  fullPathDisplay: string;
}

const getParentId = (cat: Category): number | null => {
  const pid =
    cat.parent_id !== undefined && cat.parent_id !== null
      ? Number(cat.parent_id)
      : cat.parentid !== undefined && cat.parentid !== null
        ? Number(cat.parentid)
        : null;

  if (pid !== null && pid > 0) {
    return pid;
  }

  const pathStr = String(cat.path || "").trim();
  if (!pathStr) return null;
  const parts = pathStr.split(".").filter(Boolean);
  if (parts.length === 0) return null;
  const num = Number.parseInt(parts[parts.length - 1], 10);
  return Number.isNaN(num) || num <= 0 ? null : num;
};

export const CategoryTreeView = ({
  categories,
  selectedCategoryId,
  onSelectCategory,
  onEditCategory: onEditCategoryProp,
  showActions = true,
}: CategoryTreeViewProps) => {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc" | "subcategories">(
    "asc",
  );
  const [expandedIds, setExpandedNodeIds] = useState<Set<number>>(new Set());
  const [isFullHeight, setIsFullHeight] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Category | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // 1. Build and natural sort tree
  const { rootNodes, allNodesMap } = useMemo(() => {
    const nodeMap = new Map<number, TreeNode>();
    const validCats = categories.filter((c) => {
      const url = String(c.url_path || "");
      return url !== "trash" && !url.startsWith("trash.");
    });

    for (const cat of validCats) {
      nodeMap.set(Number(cat.id), {
        category: cat,
        children: [],
        fullPathNames: [],
        fullPathDisplay: "",
      });
    }

    const roots: TreeNode[] = [];
    for (const node of nodeMap.values()) {
      const pId = getParentId(node.category);
      if (pId !== null && nodeMap.has(pId)) {
        nodeMap.get(pId)?.children.push(node);
      } else {
        roots.push(node);
      }
    }

    // Natural A-Z sort with numbers (1, 2, 3 ... 9, 10, 11) or Z-A or subcategories count
    const sortRecursive = (nodes: TreeNode[]) => {
      nodes.sort((a, b) => {
        if (sortOrder === "desc") {
          return b.category.name.localeCompare(a.category.name, undefined, {
            numeric: true,
            sensitivity: "base",
          });
        }
        if (sortOrder === "subcategories") {
          const diff = b.children.length - a.children.length;
          if (diff !== 0) return diff;
        }
        return a.category.name.localeCompare(b.category.name, undefined, {
          numeric: true,
          sensitivity: "base",
        });
      });
      for (const n of nodes) {
        if (n.children.length > 0) sortRecursive(n.children);
      }
    };
    sortRecursive(roots);

    const assignPathNames = (n: TreeNode, parentNames: string[]) => {
      const cur = [...parentNames, n.category.name];
      n.fullPathNames = cur;
      n.fullPathDisplay = cur.join(" / ");
      for (const child of n.children) {
        assignPathNames(child, cur);
      }
    };
    for (const r of roots) assignPathNames(r, []);

    return { rootNodes: roots, allNodesMap: nodeMap };
  }, [categories, sortOrder]);

  // Toggle expand for single node
  const toggleExpand = (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedNodeIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleExpandAll = () => {
    const allIds = new Set<number>();
    for (const id of allNodesMap.keys()) {
      allIds.add(id);
    }
    setExpandedNodeIds(allIds);
  };

  const handleCollapseAll = () => {
    setExpandedNodeIds(new Set());
  };

  // Delete Category handlers
  const handleSoftDelete = async (cat: Category) => {
    setIsDeleting(true);
    const toastId = toast.loading(
      `Moving "${cat.name}" and recordings to Trash...`,
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
      setDeleteTarget(null);
    } catch (err: unknown) {
      toast.error(
        (err as { message?: string }).message || "Failed to delete category",
        { id: toastId },
      );
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeletePermanently = async (cat: Category) => {
    setIsDeleting(true);
    const toastId = toast.loading(
      `Deleting "${cat.name}" and all contents permanently...`,
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
      setDeleteTarget(null);
    } catch (err: unknown) {
      toast.error(
        (err as { message?: string }).message || "Failed to delete category",
        { id: toastId },
      );
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      {/* Top Toolbar */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 p-3 bg-muted/20 border border-border/70 rounded-2xl">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search hierarchy tree by name or path..."
            className="pl-9 pr-8 h-9 text-xs rounded-xl bg-background border-border/80"
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

        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          {/* Natural Sort selector */}
          <div className="flex items-center gap-1 bg-muted/60 p-0.5 rounded-xl border border-border/60">
            <Button
              type="button"
              variant={sortOrder === "asc" ? "default" : "ghost"}
              size="sm"
              onClick={() => setSortOrder("asc")}
              className={cn(
                "h-7 px-2.5 text-xs rounded-lg gap-1 transition-all",
                sortOrder === "asc"
                  ? "bg-amber-600 hover:bg-amber-700 text-white shadow-2xs"
                  : "text-muted-foreground hover:text-foreground",
              )}
              title="Sort A to Z (Natural numeric 1, 2, ... 9, 10, 11)"
            >
              <ArrowDownAZ className="w-3.5 h-3.5" />
              <span>A–Z</span>
            </Button>
            <Button
              type="button"
              variant={sortOrder === "desc" ? "default" : "ghost"}
              size="sm"
              onClick={() => setSortOrder("desc")}
              className={cn(
                "h-7 px-2.5 text-xs rounded-lg gap-1 transition-all",
                sortOrder === "desc"
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
              variant={sortOrder === "subcategories" ? "default" : "ghost"}
              size="sm"
              onClick={() => setSortOrder("subcategories")}
              className={cn(
                "h-7 px-2.5 text-xs rounded-lg gap-1 transition-all",
                sortOrder === "subcategories"
                  ? "bg-amber-600 hover:bg-amber-700 text-white shadow-2xs"
                  : "text-muted-foreground hover:text-foreground",
              )}
              title="Sort by Most Subcategories"
            >
              <FolderTree className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Subfolders</span>
            </Button>
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleExpandAll}
            className="h-8 text-xs rounded-xl gap-1.5 cursor-pointer"
            title="Expand all branches in the hierarchy"
          >
            <Maximize2 className="w-3.5 h-3.5" />
            <span>Expand All ({allNodesMap.size})</span>
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleCollapseAll}
            className="h-8 text-xs rounded-xl gap-1.5 cursor-pointer"
            title="Collapse all branches"
          >
            <Minimize2 className="w-3.5 h-3.5" />
            <span>Collapse All</span>
          </Button>
          <Button
            type="button"
            variant={isFullHeight ? "secondary" : "outline"}
            size="sm"
            onClick={() => setIsFullHeight(!isFullHeight)}
            className="h-8 text-xs rounded-xl gap-1.5 cursor-pointer hidden sm:flex"
            title={
              isFullHeight
                ? "Switch to scrollable view"
                : "Expand container to view all without scrolling"
            }
          >
            <span>{isFullHeight ? "Compact View" : "Full View"}</span>
          </Button>
        </div>
      </div>

      {/* Tree Information Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-3.5 py-2 rounded-2xl bg-gradient-to-r from-amber-500/10 via-orange-500/5 to-transparent border border-amber-500/20 text-xs">
        <div className="flex items-center gap-2 flex-wrap text-foreground font-medium">
          <span className="font-bold text-amber-900 dark:text-amber-200">
            {allNodesMap.size} Total Categories
          </span>
          <span className="text-muted-foreground/60">•</span>
          <span className="text-muted-foreground">
            {rootNodes.length} Root Folders
          </span>
          {expandedIds.size > 0 && (
            <>
              <span className="text-muted-foreground/60">•</span>
              <span className="text-primary font-semibold">
                {expandedIds.size} folders expanded
              </span>
            </>
          )}
          {search && (
            <>
              <span className="text-muted-foreground/60">•</span>
              <span className="text-amber-700 dark:text-amber-300 font-semibold">
                Filtering by &quot;{search}&quot;
              </span>
            </>
          )}
        </div>
        <div className="flex items-center gap-2 text-muted-foreground text-[11px]">
          <span>Natural A–Z Sort Active</span>
        </div>
      </div>

      {/* Tree View Canvas */}
      <div
        className={cn(
          "p-3 sm:p-4 rounded-2xl border border-border/80 bg-card shadow-2xs space-y-0.5 transition-all",
          isFullHeight
            ? "min-h-[480px]"
            : "min-h-[460px] max-h-[75vh] overflow-y-auto",
        )}
      >
        {rootNodes.length === 0 ? (
          <div className="py-12 text-center text-xs text-muted-foreground">
            No categories found.
          </div>
        ) : (
          rootNodes.map((node) => (
            <TreeItemRow
              key={node.category.id}
              node={node}
              selectedCategoryId={selectedCategoryId}
              onSelectCategory={onSelectCategory}
              expandedIds={expandedIds}
              onToggleExpand={toggleExpand}
              searchFilter={search.trim().toLowerCase()}
              showActions={showActions}
              onEditCategory={(cat) => {
                if (onEditCategoryProp) {
                  onEditCategoryProp(cat);
                } else {
                  const slug = categoryPath(cat.url_path as string).replace(
                    /^\/+/,
                    "",
                  );
                  router.push(`/admin/content/${slug}`);
                }
              }}
              onDeleteCategory={(cat) => setDeleteTarget(cat)}
            />
          ))
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <AlertDialog
          open={Boolean(deleteTarget)}
          onOpenChange={(open) => !open && setDeleteTarget(null)}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                Delete &ldquo;{deleteTarget.name}&rdquo; and All Contents?
              </AlertDialogTitle>
              <AlertDialogDescription>
                Deleting this category will also{" "}
                <strong>
                  delete all subcategories and all recordings inside it
                </strong>{" "}
                from both the database and Google Drive.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isDeleting}>
                Cancel
              </AlertDialogCancel>
              <Button
                variant="outline"
                disabled={isDeleting}
                onClick={() => handleSoftDelete(deleteTarget)}
                className="border-amber-500/40 text-amber-700 dark:text-amber-300 hover:bg-amber-500/10 cursor-pointer"
              >
                Move to Trash
              </Button>
              <AlertDialogAction
                disabled={isDeleting}
                onClick={() => handleDeletePermanently(deleteTarget)}
                className="bg-destructive hover:bg-destructive text-white cursor-pointer"
              >
                Delete Permanently
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
};

interface TreeItemRowProps {
  node: TreeNode;
  selectedCategoryId?: number | null;
  onSelectCategory?: (category: Category | null) => void;
  expandedIds: Set<number>;
  onToggleExpand: (id: number, e: React.MouseEvent) => void;
  searchFilter: string;
  showActions: boolean;
  onEditCategory: (cat: Category) => void;
  onDeleteCategory: (cat: Category) => void;
  depth?: number;
}

const TreeItemRow = ({
  node,
  selectedCategoryId,
  onSelectCategory,
  expandedIds,
  onToggleExpand,
  searchFilter,
  showActions,
  onEditCategory,
  onDeleteCategory,
  depth = 0,
}: TreeItemRowProps) => {
  const id = Number(node.category.id);
  const hasChildren = node.children.length > 0;
  const isExpanded = expandedIds.has(id);
  const isSelected = selectedCategoryId === id;

  const matchesSearch =
    !searchFilter ||
    node.category.name.toLowerCase().includes(searchFilter) ||
    node.fullPathDisplay.toLowerCase().includes(searchFilter);

  const hasMatchingDescendant = (n: TreeNode): boolean => {
    if (
      n.category.name.toLowerCase().includes(searchFilter) ||
      n.fullPathDisplay.toLowerCase().includes(searchFilter)
    ) {
      return true;
    }
    return n.children.some((c) => hasMatchingDescendant(c));
  };

  if (searchFilter && !matchesSearch && !hasMatchingDescendant(node)) {
    return null;
  }

  return (
    <div className="select-none py-0.5">
      <div
        className={cn(
          "flex items-center justify-between py-1.5 px-2.5 rounded-xl transition-all text-xs group border",
          depth === 0
            ? "border-amber-500/25 bg-amber-500/5 hover:bg-amber-500/15"
            : depth === 1
              ? "border-emerald-500/20 bg-emerald-500/5 hover:bg-emerald-500/15"
              : "border-sky-500/15 bg-sky-500/5 hover:bg-sky-500/15",
          isSelected && "ring-2 ring-primary font-bold bg-primary/10",
        )}
        style={{ marginLeft: `${depth * 18}px` }}
      >
        <div className="flex items-center gap-2 min-w-0 flex-1 pr-2">
          {hasChildren ? (
            <button
              type="button"
              onClick={(e) => onToggleExpand(id, e)}
              className={cn(
                "p-1 rounded-md transition-colors cursor-pointer shrink-0",
                depth === 0
                  ? "hover:bg-amber-500/20 text-amber-700 dark:text-amber-300"
                  : depth === 1
                    ? "hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300"
                    : "hover:bg-sky-500/20 text-sky-700 dark:text-sky-300",
              )}
              title={isExpanded ? "Collapse branch" : "Expand branch"}
            >
              {isExpanded ? (
                <ChevronDown className="w-4 h-4" />
              ) : (
                <ChevronRight className="w-4 h-4" />
              )}
            </button>
          ) : (
            <span className="w-6 shrink-0" />
          )}

          <button
            type="button"
            onClick={(e) => {
              if (hasChildren) {
                onToggleExpand(id, e);
              } else if (onSelectCategory) {
                onSelectCategory(node.category);
              }
            }}
            className="flex items-center gap-2.5 min-w-0 flex-1 text-left bg-transparent border-0 cursor-pointer p-0"
          >
            {depth === 0 ? (
              isExpanded ? (
                <FolderOpen className="w-4.5 h-4.5 text-amber-500 fill-amber-500/30 shrink-0" />
              ) : (
                <Folder className="w-4.5 h-4.5 text-amber-600 dark:text-amber-400 fill-amber-500/20 shrink-0" />
              )
            ) : depth === 1 ? (
              isExpanded ? (
                <FolderOpen className="w-4 h-4 text-emerald-500 fill-emerald-500/30 shrink-0" />
              ) : (
                <Folder className="w-4 h-4 text-emerald-600 dark:text-emerald-400 fill-emerald-500/20 shrink-0" />
              )
            ) : isExpanded ? (
              <FolderOpen className="w-4 h-4 text-sky-500 fill-sky-500/30 shrink-0" />
            ) : (
              <Folder className="w-4 h-4 text-sky-600 dark:text-sky-400 fill-sky-500/20 shrink-0" />
            )}

            <span
              className={cn(
                "truncate font-semibold text-foreground",
                isSelected && "text-primary font-bold",
                searchFilter &&
                  matchesSearch &&
                  "underline decoration-amber-500 font-bold",
              )}
            >
              {node.category.name}
            </span>

            {hasChildren ? (
              <span
                className={cn(
                  "text-[10px] font-bold px-2 py-0.5 rounded-full border shrink-0",
                  depth === 0
                    ? "bg-amber-500/20 text-amber-900 dark:text-amber-200 border-amber-500/35"
                    : depth === 1
                      ? "bg-emerald-500/20 text-emerald-900 dark:text-emerald-200 border-emerald-500/35"
                      : "bg-sky-500/20 text-sky-900 dark:text-sky-200 border-sky-500/35",
                )}
              >
                {node.children.length}{" "}
                {node.children.length === 1 ? "subfolder" : "subfolders"}
              </span>
            ) : (
              <span className="text-[10px] font-mono text-muted-foreground/60 hidden sm:inline truncate max-w-[200px]">
                /{categoryPath(node.category.url_path as string)}
              </span>
            )}
          </button>
        </div>

        {showActions && (
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-7 w-7 rounded-lg text-blue-600 dark:text-blue-400 hover:text-blue-700 hover:bg-blue-500/15 cursor-pointer"
              title="Edit Category (Name, Path, Artwork)"
              onClick={(e) => {
                e.stopPropagation();
                onEditCategory(node.category);
              }}
            >
              <Pencil className="w-3.5 h-3.5" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-7 w-7 rounded-lg text-rose-600 dark:text-rose-400 hover:text-rose-700 hover:bg-rose-500/15 cursor-pointer"
              title="Delete Category & Contents"
              onClick={(e) => {
                e.stopPropagation();
                onDeleteCategory(node.category);
              }}
            >
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          </div>
        )}
      </div>

      {hasChildren && isExpanded && (
        <div className="border-l-2 border-dashed border-amber-500/30 ml-4 pl-1 mt-0.5 space-y-0.5">
          {node.children.map((child) => (
            <TreeItemRow
              key={child.category.id}
              node={child}
              selectedCategoryId={selectedCategoryId}
              onSelectCategory={onSelectCategory}
              expandedIds={expandedIds}
              onToggleExpand={onToggleExpand}
              searchFilter={searchFilter}
              showActions={showActions}
              onEditCategory={onEditCategory}
              onDeleteCategory={onDeleteCategory}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
};
