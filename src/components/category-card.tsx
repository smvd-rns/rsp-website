"use client";

import Link from "next/link";
import { useState } from "react";
import { ChevronRight } from "lucide-react";
import { getCategoryImageUrl } from "@/lib/storage";
import { categoryPath } from "@/lib/utils";
import { useCategories } from "@/hooks/use-categories";
import type { Category } from "@/types";

interface CategoryCardProps {
  cat: Category;
  onKeyDown?: React.KeyboardEventHandler<HTMLAnchorElement>;
  priority?: boolean;
}

const findParentCategoryArtwork = (
  current: Category,
  allCategories?: Category[]
): string | undefined => {
  if (!allCategories || allCategories.length === 0) return undefined;

  const visited = new Set<number>([Number(current.id)]);
  let node: Category | undefined = current;

  while (node) {
    const rawPid =
      (node as any).parentid ??
      (node as any).parent_id ??
      (node.path && String(node.path).includes(".")
        ? Number(String(node.path).split(".").pop())
        : Number(node.path) || null);

    const pid = Number(rawPid);
    if (!pid || isNaN(pid) || visited.has(pid)) break;
    visited.add(pid);

    const parent = allCategories.find((c) => Number(c.id) === pid);
    if (!parent) break;

    const parentUrl = getCategoryImageUrl(parent, "webp");
    if (parentUrl && parentUrl !== "/rsp.webp") {
      return parentUrl;
    }
    node = parent;
  }

  return undefined;
};

export const CategoryCard = ({
  cat,
  onKeyDown,
  priority,
}: CategoryCardProps) => {
  const { data: allCategories } = useCategories();
  const [failed, setFailed] = useState(false);
  const [triedParent, setTriedParent] = useState(false);

  const directImg = getCategoryImageUrl(cat, "webp");
  const parentImg = findParentCategoryArtwork(cat, allCategories);

  // If category has its own custom artwork, use it; otherwise fall back to parent artwork
  const primaryImg =
    directImg && directImg !== "/rsp.webp" ? directImg : (parentImg || "/rsp.webp");

  const href = categoryPath(cat.url_path);

  return (
    <Link
      href={href}
      onKeyDown={onKeyDown}
      prefetch={false}
      data-category-item
      className="group relative flex flex-col overflow-hidden rounded-2xl border border-stone-200/90 dark:border-stone-800 bg-card shadow-xs hover:shadow-lg hover:border-primary/50 focus:ring-2 focus:ring-primary focus:outline-none transition-all duration-300 active:scale-[0.98] cursor-pointer"
    >
      {/* Category Artwork Image Container with protective padding & native 16:9 ratio */}
      <div className="p-2.5 sm:p-3 pb-1">
        <div className="relative w-full aspect-[16/9] rounded-xl bg-muted/30 overflow-hidden ring-1 ring-border/40">
          <img
            src={failed ? "/rsp.webp" : primaryImg}
            alt={cat.name}
            loading={priority ? "eager" : "lazy"}
            fetchPriority={priority ? "high" : undefined}
            onError={(e) => {
              const img = e.currentTarget;
              if (!triedParent && parentImg && primaryImg !== parentImg) {
                setTriedParent(true);
                img.src = parentImg;
              } else {
                setFailed(true);
                if (!img.src.endsWith("/rsp.webp")) {
                  img.src = "/rsp.webp";
                }
              }
            }}
            className="w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
          />
        </div>
      </div>

      {/* Category Bottom Footer - Title placed clearly below the image */}
      <div className="relative z-10 px-3.5 py-3 sm:px-4 sm:py-3.5 bg-card flex items-center justify-between gap-3 min-h-[3.75rem]">
        <h3 className="text-sm sm:text-[0.9375rem] font-semibold font-heading text-card-foreground leading-snug line-clamp-2 group-hover:text-primary transition-colors">
          {cat.name}
        </h3>
        <div className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0 group-hover:bg-primary group-hover:text-primary-foreground group-hover:translate-x-0.5 transition-all">
          <ChevronRight className="w-3.5 h-3.5" />
        </div>
      </div>
    </Link>
  );
};
