"use client";

import { useQuery } from "@tanstack/react-query";
import { FileAudio, FolderTree } from "lucide-react";
import { useMemo } from "react";
import { getAllCategoriesForAdmin } from "@/app/actions/category-actions";
import { CategoryTable } from "@/components/admin/category-table";
import { ContentRecordingsSection } from "@/components/admin/content-recordings-section";
import Loading from "@/components/loading";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCategories } from "@/hooks/use-categories";

export default function ContentPage() {
  const { data: dbCategories, isLoading: isLoadingDb } = useQuery({
    queryKey: ["admin", "categories", "all"],
    queryFn: async () => {
      try {
        const res = await fetch("/api/admin/categories");
        if (res.ok) {
          const json = await res.json();
          if (Array.isArray(json.categories) && json.categories.length > 0) {
            return json.categories as Category[];
          }
        }
      } catch (e) {
        console.warn("[ContentPage] Fetch /api/admin/categories failed:", e);
      }
      return getAllCategoriesForAdmin();
    },
    staleTime: 0,
    refetchOnMount: true,
  });
  const { data: idbCategories = [] } = useCategories();

  const allCategories =
    dbCategories && dbCategories.length > 0 ? dbCategories : idbCategories;

  const validCategories = useMemo(() => {
    return allCategories.filter((c) => {
      const u = String(c.url_path || "");
      return u !== "trash" && !u.startsWith("trash.");
    });
  }, [allCategories]);

  // Root categories for table view
  const rootCategories = useMemo(() => {
    return validCategories.filter((c) => {
      const rawCat = c as unknown as { parentid?: number | null };
      const pid =
        c.parent_id !== undefined && c.parent_id !== null
          ? Number(c.parent_id)
          : rawCat.parentid !== undefined && rawCat.parentid !== null
            ? Number(rawCat.parentid)
            : null;
      if (pid !== null && pid > 0) return false;
      const pathStr = String(c.path || "").trim();
      return !pathStr;
    });
  }, [validCategories]);

  if (isLoadingDb && allCategories.length === 0) {
    return <Loading />;
  }

  return (
    <Tabs defaultValue="categories" className="w-full space-y-5">
      <div className="flex items-center justify-between">
        <TabsList className="p-1 bg-muted/70 rounded-2xl border border-border/80 h-11">
          <TabsTrigger
            value="categories"
            className="rounded-xl px-4 sm:px-5 py-2 text-xs font-bold gap-2 data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-2xs cursor-pointer"
          >
            <FolderTree className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            <span>Categories ({validCategories.length})</span>
          </TabsTrigger>
          <TabsTrigger
            value="recordings"
            className="rounded-xl px-4 sm:px-5 py-2 text-xs font-bold gap-2 data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-2xs cursor-pointer"
          >
            <FileAudio className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span>Recordings & Discourses</span>
          </TabsTrigger>
        </TabsList>
      </div>

      {/* 1. CATEGORIES TAB */}
      <TabsContent
        value="categories"
        className="m-0 focus-visible:outline-hidden"
      >
        <Card className="border border-border/80 rounded-3xl shadow-xs overflow-hidden bg-card">
          <CardHeader className="border-b border-border/60 bg-muted/20 px-6 py-4.5 flex flex-row items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 border border-amber-500/20 shadow-2xs">
                <FolderTree className="w-4.5 h-4.5" />
              </div>
              <div>
                <CardTitle className="text-base font-bold tracking-tight text-foreground flex items-center gap-2">
                  <span>Category Hierarchy</span>
                  <Badge
                    variant="secondary"
                    className="text-xxs font-semibold px-2 py-0 rounded-md bg-amber-500/10 text-amber-800 dark:text-amber-300 border border-amber-500/20"
                  >
                    {validCategories.length} Categories ({rootCategories.length}{" "}
                    Root)
                  </Badge>
                </CardTitle>
                <CardDescription className="text-xs text-muted-foreground mt-0.5">
                  Explore full hierarchy tree, search subcategories, and manage
                  spiritual discourse categories.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-4 sm:p-6">
            <CategoryTable
              categories={rootCategories}
              allCategories={validCategories}
            />
          </CardContent>
        </Card>
      </TabsContent>

      {/* 2. RECORDINGS TAB */}
      <TabsContent
        value="recordings"
        className="m-0 focus-visible:outline-hidden"
      >
        <Card className="border border-border/80 rounded-3xl shadow-xs overflow-hidden bg-card">
          <CardHeader className="border-b border-border/60 bg-gradient-to-r from-blue-500/[0.05] via-indigo-500/[0.02] to-transparent px-6 py-5 flex flex-row items-center justify-between">
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-blue-500/20">
                <FileAudio className="w-5 h-5" />
              </div>
              <div>
                <CardTitle className="text-base sm:text-lg font-bold tracking-tight text-foreground flex items-center gap-2">
                  <span>Discourses & Recordings Management</span>
                  <Badge
                    variant="secondary"
                    className="text-xxs font-bold px-2.5 py-0.5 rounded-full bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-500/20"
                  >
                    Audio & Video Engine
                  </Badge>
                </CardTitle>
                <CardDescription className="text-xs text-muted-foreground mt-0.5">
                  Filter by category tree, search by title, and edit or move
                  recordings with full dual Google Drive sync.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-4 sm:p-6">
            <ContentRecordingsSection />
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}
