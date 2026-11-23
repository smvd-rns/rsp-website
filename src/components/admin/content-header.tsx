"use client";

import { FileAudio, FolderTree, Plus } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ContentSearchBar } from "@/components/admin/search/content-search-bar";
import { Button } from "@/components/ui/button";

export const ContentHeader = () => {
  const pathname = usePathname();
  // Extract path from /admin/content/[...path] or /content/[...path]
  let contentPath = "";
  if (pathname.startsWith("/admin/content/")) {
    contentPath = pathname.replace("/admin/content/", "");
  } else if (pathname.startsWith("/content/")) {
    contentPath = pathname.replace("/content/", "");
  }

  const newCategoryHref = contentPath
    ? `/admin/categories/new?p=${contentPath}`
    : "/admin/categories/new";

  const newRecordingHref = contentPath
    ? `/admin/recordings/new?p=${contentPath}`
    : "/admin/recordings/new";

  return (
    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 p-5 rounded-2xl bg-card border border-border/80 shadow-2xs">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 border border-blue-500/20 shadow-2xs">
          <FolderTree className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground font-heading">
            Content Management
          </h1>
          <p className="text-xs text-muted-foreground">
            Explore hierarchy, organize spiritual discourses, and manage
            category permissions.
          </p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-1 lg:max-w-2xl justify-end">
        <div className="w-full sm:w-[280px] md:w-[340px]">
          <ContentSearchBar />
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="outline"
            size="sm"
            asChild
            className="h-9 px-3 text-xs font-semibold rounded-xl border-border/90 hover:bg-muted/70 cursor-pointer"
          >
            <Link href={newRecordingHref} prefetch={false}>
              <FileAudio className="mr-1.5 h-3.5 w-3.5 text-blue-600" />
              <span>Add Recording</span>
            </Link>
          </Button>
          <Button
            size="sm"
            asChild
            className="h-9 px-3.5 text-xs font-semibold rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground shadow-xs cursor-pointer"
          >
            <Link href={newCategoryHref} prefetch={false}>
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              <span>Add Category</span>
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
};
