"use client";

import Link from "next/link";
import { useState } from "react";
import { ChevronRight } from "lucide-react";
import { getCategoryImageUrl } from "@/lib/storage";
import { categoryPath } from "@/lib/utils";
import type { Category } from "@/types";

interface CategoryCardProps {
  cat: Category;
  onKeyDown?: React.KeyboardEventHandler<HTMLAnchorElement>;
  priority?: boolean;
}

export const CategoryCard = ({
  cat,
  onKeyDown,
  priority,
}: CategoryCardProps) => {
  const base36 = cat.img ? Number(cat.img).toString(36) : undefined;
  const customImg = (cat as any).image_url || (base36 ? `/category-images/${base36}.webp` : undefined);
  const imgUrl = customImg || getCategoryImageUrl(cat, "webp");
  const href = categoryPath(cat.url_path);
  const [failed, setFailed] = useState(false);

  return (
    <Link
      href={href}
      onKeyDown={onKeyDown}
      prefetch={false}
      data-category-item
      className="group relative flex flex-col justify-end overflow-hidden rounded-2xl border border-stone-200/90 dark:border-stone-800 bg-card shadow-xs hover:shadow-lg hover:border-primary/50 focus:ring-2 focus:ring-primary focus:outline-none transition-all duration-300 active:scale-[0.98] cursor-pointer"
      style={{ height: "14.5rem" }}
    >
      {/* Background Category Image */}
      <div className="absolute inset-0 w-full h-full bg-muted overflow-hidden">
        <img
          src={failed ? "/rsp.webp" : (imgUrl || "/rsp.webp")}
          alt={cat.name}
          loading={priority ? "eager" : "lazy"}
          fetchPriority={priority ? "high" : undefined}
          onError={(e) => {
            const img = e.currentTarget;
            setFailed(true);
            if (!img.src.endsWith("/rsp.webp")) {
              img.src = "/rsp.webp";
            }
          }}
          className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
        />
      </div>

      {/* Gentle Scrim strictly at the bottom to never cover upper/middle artwork text */}
      <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-black/90 via-black/50 to-transparent pointer-events-none" />

      {/* Category Bottom Info */}
      <div className="relative z-10 p-3.5 sm:p-4 flex items-center justify-between gap-2 w-full">
        <h3 className="text-sm sm:text-base font-bold font-heading text-white leading-snug drop-shadow-md line-clamp-2 group-hover:text-amber-200 transition-colors">
          {cat.name}
        </h3>
        <div className="w-7 h-7 rounded-full bg-black/40 backdrop-blur-md border border-white/15 flex items-center justify-center shrink-0 group-hover:bg-primary group-hover:border-transparent transition-all">
          <ChevronRight className="w-4 h-4 text-white group-hover:text-primary-foreground group-hover:translate-x-0.5 transition-transform" />
        </div>
      </div>
    </Link>
  );
};
