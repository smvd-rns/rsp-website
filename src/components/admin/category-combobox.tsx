"use client";

import {
  ArrowLeft,
  Check,
  ChevronDown,
  ChevronRight,
  ChevronsUpDown,
  Folder,
  FolderOpen,
  FolderTree,
  Search,
  X,
} from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import type { Category } from "@/types";

interface CategoryComboboxProps {
  id?: string;
  value?: number | null;
  onChange: (value: number | null) => void;
  placeholder?: string;
  categories: Category[];
  excludeId?: number;
  defaultExcludeDump?: boolean;
  allowRoot?: boolean;
  compact?: boolean;
}

interface TreeNode {
  category: Category;
  children: TreeNode[];
  fullPathNames: string[];
  fullPathDisplay: string;
  formattedUrlPath: string;
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

export const CategoryCombobox = ({
  id = "parent_id",
  value,
  onChange,
  placeholder = "Select parent category...",
  categories,
  excludeId,
  defaultExcludeDump = false,
  allowRoot = true,
  compact = false,
}: CategoryComboboxProps) => {
  const [open, setOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"drilldown" | "tree">("drilldown");
  const [search, setSearch] = useState("");
  const [currentDrillParentId, setCurrentDrillParentId] = useState<
    number | null
  >(null);
  const [excludeDump, setExcludeDump] = useState(defaultExcludeDump);
  const [expandedNodeIds, setExpandedNodeIds] = useState<Set<number>>(
    new Set(),
  );

  // 1. Filter out trash, dump, and circular references (excludeId & its descendants)
  const filteredCategories = useMemo(() => {
    return categories.filter((cat) => {
      const urlPath = (cat.url_path as string) || "";
      if (urlPath === "trash" || urlPath.startsWith("trash.")) return false;
      if (excludeDump && /^all[-_]category[-_]dump($|\.)/i.test(urlPath))
        return false;

      if (excludeId) {
        const excludeCat = categories.find((c) => c.id === excludeId);
        if (excludeCat) {
          return (
            cat.id !== excludeId &&
            !urlPath.startsWith(`${excludeCat.url_path as string}.`)
          );
        }
      }
      return true;
    });
  }, [categories, excludeDump, excludeId]);

  // 2. Fast Map of categories by ID
  const categoryMap = useMemo(() => {
    const map = new Map<number, Category>();
    for (const cat of filteredCategories) {
      map.set(Number(cat.id), cat);
    }
    return map;
  }, [filteredCategories]);

  // 3. Helper to resolve ancestors chain [Root, ..., Parent, Current]
  const getAncestorCategories = useMemo(() => {
    return (targetId: number | null): Category[] => {
      if (!targetId) return [];
      const chain: Category[] = [];
      const visited = new Set<number>();
      let curId: number | null = targetId;

      while (curId !== null && !visited.has(curId)) {
        visited.add(curId);
        const cat = categoryMap.get(curId);
        if (!cat) break;
        chain.unshift(cat);
        curId = getParentId(cat);
      }
      return chain;
    };
  }, [categoryMap]);

  // Selected category & full breadcrumb display
  const selectedCategory = categoryMap.get(Number(value));
  const selectedAncestors = useMemo(() => {
    return getAncestorCategories(value ?? null);
  }, [getAncestorCategories, value]);

  const selectedFullPathString = useMemo(() => {
    if (!selectedAncestors.length) return "Root (Top Level)";
    return selectedAncestors.map((c) => c.name).join(" / ");
  }, [selectedAncestors]);

  // 4. Build Tree Structure
  const { rootNodes, treeMap } = useMemo(() => {
    const nodeMap = new Map<number, TreeNode>();

    // Initial pass: create tree node skeletons
    for (const cat of filteredCategories) {
      const id = Number(cat.id);
      const urlPath = (cat.url_path as string) || "";
      const formattedUrlPath = `${urlPath.replace(/\./g, "/")}/`;
      nodeMap.set(id, {
        category: cat,
        children: [],
        fullPathNames: [],
        fullPathDisplay: "",
        formattedUrlPath,
      });
    }

    const roots: TreeNode[] = [];

    // Second pass: link parents & children
    for (const node of nodeMap.values()) {
      const cat = node.category;
      const parentId = getParentId(cat);

      if (parentId !== null && nodeMap.has(parentId)) {
        nodeMap.get(parentId)?.children.push(node);
      } else {
        roots.push(node);
      }
    }

    // Natural alphanumeric sorting: A-Z with natural numbers (1, 2, 3 ... 9, 10, 11)
    const compareCategories = (catA: Category, catB: Category): number => {
      return catA.name.localeCompare(catB.name, undefined, {
        numeric: true,
        sensitivity: "base",
      });
    };

    const sortNodes = (nodes: TreeNode[]) => {
      nodes.sort((a, b) => compareCategories(a.category, b.category));
      for (const n of nodes) {
        if (n.children.length > 0) sortNodes(n.children);
      }
    };
    sortNodes(roots);

    // Compute full path names for each node
    const assignPaths = (node: TreeNode, parentPathNames: string[]) => {
      const curPath = [...parentPathNames, node.category.name];
      node.fullPathNames = curPath;
      node.fullPathDisplay = curPath.join(" / ");
      for (const child of node.children) {
        assignPaths(child, curPath);
      }
    };
    for (const r of roots) {
      assignPaths(r, []);
    }

    return { rootNodes: roots, treeMap: nodeMap };
  }, [filteredCategories]);

  // 5. Active Drilldown Path Breadcrumbs
  const drilldownAncestors = useMemo(() => {
    return getAncestorCategories(currentDrillParentId);
  }, [getAncestorCategories, currentDrillParentId]);

  // 6. Direct Children for Current Drilldown Level
  const currentDrillChildren = useMemo(() => {
    if (currentDrillParentId === null) {
      return rootNodes;
    }
    const node = treeMap.get(currentDrillParentId);
    return node ? node.children : [];
  }, [currentDrillParentId, rootNodes, treeMap]);

  // 7. Search Results across all categories (when user types in search bar)
  const searchResults = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return [];

    const results: TreeNode[] = [];
    for (const node of treeMap.values()) {
      const nameMatch = node.category.name.toLowerCase().includes(q);
      const pathMatch = node.fullPathDisplay.toLowerCase().includes(q);
      const urlMatch = node.formattedUrlPath.toLowerCase().includes(q);

      if (nameMatch || pathMatch || urlMatch) {
        results.push(node);
      }
    }

    results.sort((a, b) => {
      return a.category.name.localeCompare(b.category.name, undefined, {
        numeric: true,
        sensitivity: "base",
      });
    });

    return results.slice(0, 50); // limit to top 50 matches for performance
  }, [search, treeMap]);

  const toggleExpand = (nodeId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedNodeIds((prev) => {
      const next = new Set(prev);
      if (next.has(nodeId)) {
        next.delete(nodeId);
      } else {
        next.add(nodeId);
      }
      return next;
    });
  };

  const handleSelect = (categoryId: number | null) => {
    onChange(categoryId);
    setOpen(false);
  };

  // When expanding all matching nodes during tree search
  const expandMatchingTreeNodes = () => {
    if (!search.trim()) return;
    const q = search.trim().toLowerCase();
    const toExpand = new Set<number>();

    for (const node of treeMap.values()) {
      if (
        node.category.name.toLowerCase().includes(q) ||
        node.fullPathDisplay.toLowerCase().includes(q)
      ) {
        // Expand all its ancestors
        const chain = getAncestorCategories(Number(node.category.id));
        for (const ancestor of chain) {
          toExpand.add(Number(ancestor.id));
        }
      }
    }
    setExpandedNodeIds(toExpand);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          data-testid="category-combobox"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "w-full justify-between font-normal text-left transition-all cursor-pointer",
            compact
              ? "h-10 py-1.5 px-3 rounded-xl bg-background border border-border/80 hover:bg-muted/40 shadow-2xs text-xs font-medium text-foreground"
              : "h-auto py-2.5 px-3.5 min-h-[50px] bg-card border border-amber-500/30 hover:border-amber-500/60 rounded-2xl shadow-2xs hover:shadow-xs group",
          )}
        >
          {compact ? (
            <div className="flex items-center gap-2 min-w-0 flex-1 mr-1">
              <FolderTree className="w-4 h-4 text-amber-500 shrink-0" />
              <span
                className={cn(
                  "truncate text-xs",
                  selectedCategory
                    ? "font-semibold text-foreground"
                    : "text-muted-foreground",
                )}
              >
                {selectedCategory
                  ? selectedCategory.name
                  : placeholder || "All Categories"}
              </span>
            </div>
          ) : selectedCategory ? (
            <div className="flex flex-col items-start text-left w-full min-w-0 pr-2">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800 dark:text-amber-200 bg-amber-500/15 border border-amber-500/25 px-2 py-0.5 rounded-full">
                  Parent Folder
                </span>
                <span className="text-xs font-bold text-foreground truncate max-w-[420px]">
                  {selectedFullPathString}
                </span>
              </div>
              <span className="text-[11px] font-mono text-muted-foreground break-all mt-1">
                {(selectedCategory.url_path as string).replace(/\./g, "/")}/
              </span>
            </div>
          ) : value === null ? (
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 border border-amber-500/25">
                <Folder className="w-4 h-4 fill-amber-500/20" />
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-bold text-foreground">
                  None (Root Category)
                </span>
                <span className="text-[10px] text-muted-foreground">
                  Discourse folder will be created directly at top-level
                </span>
              </div>
            </div>
          ) : (
            <span className="text-xs text-muted-foreground">{placeholder}</span>
          )}

          <div className="flex items-center gap-1 shrink-0 ml-1">
            {value !== null && value !== undefined && (
              // biome-ignore lint/a11y/useSemanticElements: parent trigger is already a button, HTML forbids nested buttons
              <span
                role="button"
                tabIndex={0}
                onClick={(e) => {
                  e.stopPropagation();
                  onChange(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.stopPropagation();
                    onChange(null);
                  }
                }}
                title={
                  compact
                    ? "Clear category filter"
                    : "Clear and set as Root Category"
                }
                className="p-1 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </span>
            )}
            <ChevronsUpDown className="h-3.5 w-3.5 opacity-50" />
          </div>
        </Button>
      </PopoverTrigger>

      <PopoverContent
        className="w-[min(94vw,620px)] p-0 rounded-2xl border-border shadow-2xl bg-card overflow-hidden"
        align="start"
        sideOffset={6}
      >
        {/* Header Tabs: Drilldown vs Tree Diagram */}
        <div className="flex items-center justify-between p-3 border-b border-border/80 bg-muted/30">
          <div className="flex items-center gap-1 bg-muted/60 p-1 rounded-xl border border-border/50">
            <button
              type="button"
              onClick={() => setViewMode("drilldown")}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer",
                viewMode === "drilldown"
                  ? "bg-card text-foreground shadow-2xs border border-border/60"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <FolderOpen className="w-3.5 h-3.5 text-primary" />
              <span>Path & Subcategories</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setViewMode("tree");
                expandMatchingTreeNodes();
              }}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer",
                viewMode === "tree"
                  ? "bg-card text-foreground shadow-2xs border border-border/60"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <FolderTree className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>Tree Diagram</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <label
              htmlFor="combobox-dump-toggle"
              className="hidden sm:flex items-center gap-1.5 text-[11px] text-muted-foreground cursor-pointer hover:text-foreground select-none"
            >
              <Checkbox
                id="combobox-dump-toggle"
                checked={excludeDump}
                onCheckedChange={(c) => setExcludeDump(Boolean(c))}
                className="w-3.5 h-3.5 rounded"
              />
              <span>Hide dump</span>
            </label>
          </div>
        </div>

        {/* Search Bar */}
        <div className="p-3 border-b border-border/60 bg-muted/10">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={
                viewMode === "drilldown"
                  ? "Search by name or path (e.g. 'hindi', 'gita', 'youth')..."
                  : "Filter hierarchy tree..."
              }
              className="pl-9 pr-8 h-9 text-xs rounded-xl border-border/80 bg-background"
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
        </div>

        {/* ------------------------------------------------------------- */}
        {/* VIEW MODE 1: PATH DRILLDOWN & SUBCATEGORY NAVIGATOR           */}
        {/* ------------------------------------------------------------- */}
        {viewMode === "drilldown" && (
          <div className="flex flex-col max-h-[380px] overflow-hidden">
            {/* Breadcrumb Path Bar */}
            {!search && (
              <div className="flex items-center gap-1 px-3 py-2 bg-muted/20 border-b border-border/60 text-xs overflow-x-auto whitespace-nowrap scrollbar-thin">
                <button
                  type="button"
                  onClick={() => setCurrentDrillParentId(null)}
                  className={cn(
                    "px-2 py-1 rounded-md font-medium cursor-pointer transition-colors flex items-center gap-1",
                    currentDrillParentId === null
                      ? "bg-primary/10 text-primary font-bold"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/50",
                  )}
                >
                  <Folder className="w-3.5 h-3.5" />
                  <span>Root</span>
                </button>

                {drilldownAncestors.map((crumb, idx) => {
                  const isLast = idx === drilldownAncestors.length - 1;
                  return (
                    <div
                      key={crumb.id}
                      className="flex items-center gap-1 shrink-0"
                    >
                      <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/60 shrink-0" />
                      <button
                        type="button"
                        onClick={() =>
                          setCurrentDrillParentId(Number(crumb.id))
                        }
                        className={cn(
                          "px-2 py-1 rounded-md font-medium cursor-pointer transition-colors max-w-[180px] truncate",
                          isLast
                            ? "bg-primary/10 text-primary font-bold"
                            : "text-muted-foreground hover:text-foreground hover:bg-muted/50",
                        )}
                      >
                        {crumb.name}
                      </button>
                    </div>
                  );
                })}

                {currentDrillParentId !== null && (
                  <button
                    type="button"
                    onClick={() => {
                      if (drilldownAncestors.length <= 1) {
                        setCurrentDrillParentId(null);
                      } else {
                        const parent =
                          drilldownAncestors[drilldownAncestors.length - 2];
                        setCurrentDrillParentId(Number(parent.id));
                      }
                    }}
                    title="Go up one folder"
                    className="ml-auto flex items-center gap-1 text-[11px] font-semibold text-muted-foreground hover:text-foreground px-2 py-0.5 rounded hover:bg-muted/60 cursor-pointer shrink-0"
                  >
                    <ArrowLeft className="w-3 h-3" />
                    <span>Back</span>
                  </button>
                )}
              </div>
            )}

            {/* Quick Action: Select Current Folder as Parent */}
            {!search && (
              <div className="flex items-center justify-between px-3.5 py-2 bg-primary/5 border-b border-primary/20">
                <div className="flex items-center gap-2 min-w-0 pr-2">
                  <Check className="w-3.5 h-3.5 text-primary shrink-0" />
                  <span className="text-xs font-semibold text-foreground truncate">
                    {currentDrillParentId === null
                      ? "Make this a Root Category (No parent)"
                      : `Set "${categoryMap.get(currentDrillParentId)?.name}" as Parent`}
                  </span>
                </div>
                {allowRoot || currentDrillParentId !== null ? (
                  <Button
                    type="button"
                    size="sm"
                    variant={
                      value === currentDrillParentId ? "default" : "secondary"
                    }
                    className="h-7 text-xs font-semibold rounded-lg px-3 cursor-pointer shrink-0"
                    onClick={() => handleSelect(currentDrillParentId)}
                  >
                    {value === currentDrillParentId
                      ? "Selected ✓"
                      : "Select Here"}
                  </Button>
                ) : null}
              </div>
            )}

            {/* List Content: Search Results OR Subcategories of Current Level */}
            <div className="overflow-y-auto p-2 divide-y divide-border/40">
              {search.trim() ? (
                // 1. Search Results List
                searchResults.length > 0 ? (
                  searchResults.map((node) => {
                    const isSelected = value === Number(node.category.id);
                    return (
                      <div
                        key={node.category.id}
                        className={cn(
                          "flex items-center justify-between p-2 rounded-xl transition-all hover:bg-muted/50 gap-2 group",
                          isSelected &&
                            "bg-primary/10 border border-primary/30",
                        )}
                      >
                        <button
                          type="button"
                          className="flex items-start gap-2.5 min-w-0 flex-1 text-left bg-transparent border-0 cursor-pointer p-1"
                          onClick={() => handleSelect(Number(node.category.id))}
                        >
                          <Folder className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                          <div className="flex flex-col min-w-0">
                            <span className="text-xs font-semibold text-foreground truncate">
                              {node.category.name}
                            </span>
                            <span className="text-[11px] text-muted-foreground truncate">
                              {node.fullPathDisplay}
                            </span>
                            <span className="text-[10px] font-mono text-muted-foreground/70">
                              {node.formattedUrlPath}
                            </span>
                          </div>
                        </button>

                        <div className="flex items-center gap-1.5 shrink-0">
                          {node.children.length > 0 && (
                            <button
                              type="button"
                              onClick={() => {
                                setCurrentDrillParentId(
                                  Number(node.category.id),
                                );
                                setSearch("");
                              }}
                              className="text-[10px] font-semibold text-primary hover:bg-primary/10 px-2 py-1 rounded-md border border-primary/20 transition-colors flex items-center gap-1 cursor-pointer"
                              title="Browse subfolders"
                            >
                              <span>{node.children.length} subfolders</span>
                              <ChevronRight className="w-3 h-3" />
                            </button>
                          )}
                          <Button
                            type="button"
                            size="sm"
                            variant={isSelected ? "default" : "outline"}
                            className="h-6 text-[11px] px-2 rounded-md"
                            onClick={() =>
                              handleSelect(Number(node.category.id))
                            }
                          >
                            {isSelected ? "Selected" : "Select"}
                          </Button>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="p-8 text-center text-xs text-muted-foreground">
                    No categories found matching &quot;{search}&quot;.
                  </div>
                )
              ) : // 2. Current Level Subcategories List
              currentDrillChildren.length > 0 ? (
                currentDrillChildren.map((node) => {
                  const isSelected = value === Number(node.category.id);
                  const hasSubfolders = node.children.length > 0;
                  return (
                    <div
                      key={node.category.id}
                      className={cn(
                        "flex items-center justify-between p-2 rounded-xl transition-all hover:bg-muted/50 gap-2 group",
                        isSelected && "bg-primary/10 border border-primary/30",
                      )}
                    >
                      <button
                        type="button"
                        className="flex items-center gap-2.5 min-w-0 flex-1 cursor-pointer py-1 text-left bg-transparent border-0"
                        onClick={() => {
                          if (hasSubfolders) {
                            setCurrentDrillParentId(Number(node.category.id));
                          } else {
                            handleSelect(Number(node.category.id));
                          }
                        }}
                      >
                        <Folder className="w-4 h-4 text-primary shrink-0" />
                        <div className="flex flex-col min-w-0">
                          <span className="text-xs font-semibold text-foreground truncate">
                            {node.category.name}
                          </span>
                          <span className="text-[10px] font-mono text-muted-foreground/80 truncate">
                            {node.formattedUrlPath}
                          </span>
                        </div>
                      </button>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {hasSubfolders && (
                          <button
                            type="button"
                            onClick={() =>
                              setCurrentDrillParentId(Number(node.category.id))
                            }
                            className="text-[10px] font-semibold text-muted-foreground hover:text-foreground bg-muted/60 hover:bg-muted px-2 py-1 rounded-md transition-colors flex items-center gap-1 cursor-pointer"
                          >
                            <span>{node.children.length} sub</span>
                            <ChevronRight className="w-3 h-3" />
                          </button>
                        )}
                        <Button
                          type="button"
                          size="sm"
                          variant={isSelected ? "default" : "outline"}
                          className="h-7 text-xs px-2.5 rounded-lg cursor-pointer"
                          onClick={() => handleSelect(Number(node.category.id))}
                        >
                          {isSelected ? "Selected" : "Select"}
                        </Button>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="p-8 text-center text-xs text-muted-foreground">
                  <p className="font-semibold text-foreground mb-1">
                    No subcategories inside this folder.
                  </p>
                  <p className="text-[11px]">
                    Click &quot;Select Here&quot; above to place your category
                    here.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* VIEW MODE 2: VISUAL HIERARCHY TREE DIAGRAM                    */}
        {/* ------------------------------------------------------------- */}
        {viewMode === "tree" && (
          <div className="max-h-[380px] overflow-y-auto p-3">
            {/* Root Selection Node */}
            {allowRoot && (
              <button
                type="button"
                className={cn(
                  "w-full flex items-center justify-between p-2 rounded-xl border border-dashed border-border hover:bg-muted/40 transition-colors cursor-pointer mb-2 text-left bg-transparent",
                  value === null && "bg-primary/10 border-primary/40",
                )}
                onClick={() => handleSelect(null)}
              >
                <div className="flex items-center gap-2">
                  <Folder className="w-4 h-4 text-primary" />
                  <span className="text-xs font-bold text-foreground">
                    📁 None (Root / Top-Level Category)
                  </span>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant={value === null ? "default" : "outline"}
                  className="h-6 text-[11px] px-2 rounded-md"
                >
                  {value === null ? "Selected ✓" : "Select Root"}
                </Button>
              </button>
            )}

            {/* Tree Nodes Renderer */}
            <div className="space-y-0.5">
              {rootNodes.map((node) => (
                <TreeItem
                  key={node.category.id}
                  node={node}
                  selectedId={value ?? null}
                  onSelect={handleSelect}
                  expandedIds={expandedNodeIds}
                  onToggleExpand={toggleExpand}
                  searchFilter={search.trim().toLowerCase()}
                />
              ))}
            </div>
          </div>
        )}

        {/* Footer info */}
        <div className="px-3.5 py-2 border-t border-border/60 bg-muted/30 flex items-center justify-between text-[11px] text-muted-foreground">
          <span className="truncate pr-2">
            Selected Parent:{" "}
            <strong className="text-foreground">
              {selectedFullPathString}
            </strong>
          </span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setOpen(false)}
            className="h-6 text-xs px-2 cursor-pointer shrink-0"
          >
            Close
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
};

// Recursive Tree Row Component for Tree View
interface TreeItemProps {
  node: TreeNode;
  selectedId: number | null;
  onSelect: (id: number) => void;
  expandedIds: Set<number>;
  onToggleExpand: (id: number, e: React.MouseEvent) => void;
  searchFilter: string;
  depth?: number;
}

const TreeItem = ({
  node,
  selectedId,
  onSelect,
  expandedIds,
  onToggleExpand,
  searchFilter,
  depth = 0,
}: TreeItemProps) => {
  const id = Number(node.category.id);
  const hasChildren = node.children.length > 0;
  const isExpanded = expandedIds.has(id);
  const isSelected = selectedId === id;

  // Filter check
  const matchesSearch =
    !searchFilter ||
    node.category.name.toLowerCase().includes(searchFilter) ||
    node.fullPathDisplay.toLowerCase().includes(searchFilter);

  // If search filter is active and this node nor any descendant matches, hide it
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
    <div className="select-none">
      <div
        className={cn(
          "flex items-center justify-between py-1 px-1.5 rounded-lg transition-colors hover:bg-muted/60 text-xs group",
          isSelected && "bg-primary/10 font-semibold border border-primary/20",
        )}
        style={{ paddingLeft: `${depth * 16 + 6}px` }}
      >
        <div className="flex items-center gap-1.5 min-w-0 flex-1 pr-2">
          {hasChildren ? (
            <button
              type="button"
              onClick={(e) => onToggleExpand(id, e)}
              className="p-0.5 rounded hover:bg-muted/80 text-muted-foreground hover:text-foreground transition-colors cursor-pointer shrink-0"
            >
              {isExpanded ? (
                <ChevronDown className="w-3.5 h-3.5" />
              ) : (
                <ChevronRight className="w-3.5 h-3.5" />
              )}
            </button>
          ) : (
            <span className="w-4.5 shrink-0" />
          )}

          <button
            type="button"
            onClick={() => onSelect(id)}
            className="flex items-center gap-2 min-w-0 flex-1 text-left bg-transparent border-0 cursor-pointer p-0"
          >
            {depth === 0 ? (
              isExpanded ? (
                <FolderOpen className="w-3.5 h-3.5 text-amber-500 fill-amber-500/20 shrink-0" />
              ) : (
                <Folder className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 fill-amber-500/15 shrink-0" />
              )
            ) : depth === 1 ? (
              isExpanded ? (
                <FolderOpen className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 fill-emerald-500/20 shrink-0" />
              ) : (
                <Folder className="w-3.5 h-3.5 text-emerald-600/90 dark:text-emerald-400/90 fill-emerald-500/15 shrink-0" />
              )
            ) : isExpanded ? (
              <FolderOpen className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400 fill-sky-500/20 shrink-0" />
            ) : (
              <Folder className="w-3.5 h-3.5 text-sky-600/90 dark:text-sky-400/90 fill-sky-500/15 shrink-0" />
            )}

            <span
              className={cn(
                "truncate font-medium text-foreground",
                isSelected && "text-primary font-bold",
                searchFilter &&
                  matchesSearch &&
                  "underline decoration-primary font-bold",
              )}
            >
              {node.category.name}
            </span>

            {hasChildren && (
              <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded-full bg-primary/10 text-primary shrink-0">
                {node.children.length}
              </span>
            )}
          </button>
        </div>

        <Button
          type="button"
          size="sm"
          variant={isSelected ? "default" : "ghost"}
          className="h-6 text-[10px] px-2 rounded-md opacity-0 group-hover:opacity-100 transition-opacity shrink-0 cursor-pointer"
          onClick={() => onSelect(id)}
        >
          {isSelected ? "Selected" : "Select"}
        </Button>
      </div>

      {hasChildren && isExpanded && (
        <div className="border-l border-border/40 ml-3.5">
          {node.children.map((child) => (
            <TreeItem
              key={child.category.id}
              node={child}
              selectedId={selectedId}
              onSelect={onSelect}
              expandedIds={expandedIds}
              onToggleExpand={onToggleExpand}
              searchFilter={searchFilter}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
};
