"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { HeaderActions } from "./header-actions";
import { MobileDrawer } from "./mobile-drawer";
import { SearchBar } from "./search-bar";

export function Header() {
  const pathname = usePathname();

  // Do not render public website header on admin dashboard
  if (pathname?.startsWith("/admin")) {
    return null;
  }

  return (
    <header
      className="sticky top-0 z-50 w-full border-b px-3 sm:px-6 py-2 sm:py-2.5 flex items-center justify-between gap-2 sm:gap-4 shadow-md transition-colors"
      style={{
        background: "var(--header-bg, linear-gradient(135deg, #c2410c 0%, #ea580c 50%, #d97706 100%))",
        borderColor: "var(--header-border, rgba(180, 83, 9, 0.4))",
        color: "var(--header-foreground, #ffffff)",
      }}
    >
      <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
        {/* Brand */}
        <Link
          href="/"
          className="flex items-center gap-2 transition-all shrink-0"
          aria-label="Home"
          prefetch={false}
        >
          <div className="w-8 h-8 rounded-full overflow-hidden shrink-0 ring-2 ring-white/30 shadow-xs flex">
            <picture>
              <source srcSet="/icon-192x192.avif" type="image/avif" />
              <img
                src="/icon-192x192.webp"
                alt="Radheshyam Das"
                width={32}
                height={32}
                className="w-full h-full object-cover"
                loading="eager"
                fetchPriority="high"
              />
            </picture>
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-xs sm:text-sm font-heading leading-tight text-white drop-shadow-xs">
              Radheshyam Das
            </span>
            <span className="text-[10px] text-white/80 font-medium leading-none">
              Spiritual Discourses
            </span>
          </div>
        </Link>
      </div>

      {/* Search on Desktop */}
      <div className="hidden md:flex flex-1 max-w-md mx-4">
        <SearchBar />
      </div>

      {/* Actions */}
      <HeaderActions />
    </header>
  );
}
