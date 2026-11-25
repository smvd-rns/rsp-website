"use client";

import Link from "next/link";
import { useState } from "react";
import { ChevronRight } from "lucide-react";
import { DEFAULT_FALLBACK_IMAGE_URL, getCategoryImageUrl } from "@/lib/storage";
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
    if (parentUrl && parentUrl !== "/rsp.webp" && parentUrl !== DEFAULT_FALLBACK_IMAGE_URL) {
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
    directImg && directImg !== "/rsp.webp" && directImg !== DEFAULT_FALLBACK_IMAGE_URL
      ? directImg
      : (parentImg || directImg || DEFAULT_FALLBACK_IMAGE_URL);

  const href = categoryPath(cat.url_path);

  return (
    <Link
      href={href}
      onKeyDown={onKeyDown}
      prefetch={false}
      data-category-item
      className="group relative flex flex-col overflow-hidden rounded-2xl border-[1.5px] border-[#8b5a2b]/35 dark:border-amber-600/40 bg-linear-to-b from-[#fffbf4] via-[#fff7ec] to-[#fff1df] dark:from-[#241911] dark:via-[#1e140d] dark:to-[#18100a] shadow-[0_2px_10px_-2px_rgba(0,0,0,0.06),0_1px_3px_0_rgba(0,0,0,0.04)] hover:scale-[1.018] hover:border-[#8b5a2b] dark:hover:border-amber-500 hover:shadow-[0_12px_28px_-6px_rgba(139,90,43,0.18)] active:scale-[0.98] focus:ring-2 focus:ring-primary focus:outline-none transition-all duration-300 ease-out cursor-pointer"
    >
      {/* Category Artwork Image Container with crisp framing boundary */}
      <div className="p-2.5 sm:p-3 pb-1.5">
        <div className="relative w-full aspect-[16/9] rounded-xl bg-muted/40 overflow-hidden border border-border/70 dark:border-border/50 shadow-xs">
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

      {/* Category Bottom Footer - Title placed clearly below the image with harmonious text */}
      <div className="relative z-10 px-3.5 py-3 sm:px-4 sm:py-3.5 flex items-center justify-between gap-3 min-h-[3.75rem]">
        <h3 className="text-sm sm:text-[0.9375rem] font-bold font-heading text-amber-950 dark:text-amber-100 leading-snug line-clamp-2 group-hover:text-primary transition-colors">
          {cat.name}
        </h3>
        <div className="w-6 h-6 rounded-full bg-orange-500/15 text-orange-600 dark:text-orange-400 flex items-center justify-center shrink-0 group-hover:bg-primary group-hover:text-white group-hover:translate-x-0.5 transition-all">
          <ChevronRight className="w-3.5 h-3.5" />
        </div>
      </div>
    </Link>
  );
};
