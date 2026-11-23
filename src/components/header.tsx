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
      className="w-full border-b px-3 sm:px-6 py-2.5 flex items-center justify-between gap-2 sm:gap-4 shadow-md transition-colors"
      style={{
        background: "var(--header-bg, linear-gradient(135deg, #c2410c 0%, #ea580c 50%, #d97706 100%))",
        borderColor: "var(--header-border, rgba(180, 83, 9, 0.4))",
        color: "var(--header-foreground, #ffffff)",
        zIndex: 30,
        top: 0,
        position: "sticky",
      }}
    >
      <div className="flex items-center gap-1 sm:gap-2">
        <MobileDrawer />

        {/* Brand */}
        <Link
          href="/"
          className="flex items-center gap-1.5 sm:gap-2 transition-all shrink-0"
          aria-label="Home"
          prefetch={false}
        >
          <div className="w-8 h-8 rounded-full overflow-hidden shrink-0 ring-2 ring-white/30 shadow-xs hidden md:flex">
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
          <div className="hidden sm:flex flex-col">
            <span className="font-bold text-sm font-heading leading-tight text-white drop-shadow-xs">
              Radheshyam Das
            </span>
            <span className="text-xxs text-white/80 font-medium leading-none">
              Spiritual Discourses
            </span>
          </div>
        </Link>
      </div>

      {/* Search */}
      <SearchBar />

      {/* Actions */}
      <HeaderActions />
    </header>
  );
}
