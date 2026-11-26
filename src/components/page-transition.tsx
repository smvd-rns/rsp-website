"use client";

import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export const PageTransition = ({ children }: { children: React.ReactNode }) => {
  const pathname = usePathname();
  const isQueries = pathname === "/queries";
  const isFullWidthPage = pathname === "/about" || isQueries;

  return (
    <main
      key={pathname}
      className={cn(
        "flex-1 w-full flex flex-col",
        !isFullWidthPage && "max-w-7xl mx-auto px-3 sm:px-6 pt-3 sm:pt-6",
        isFullWidthPage && !isQueries && "pt-0",
        isQueries
          ? "h-full overflow-hidden"
          : "pb-[calc(7.5rem+env(safe-area-inset-bottom,0px))] md:pb-12",
      )}
      style={{
        animation: "fadeIn 0.2s ease-out forwards",
        willChange: "opacity",
        ...(isQueries
          ? { height: "calc(100dvh - 3.75rem)" }
          : {}),
      }}
    >
      {children}
    </main>
  );
};
