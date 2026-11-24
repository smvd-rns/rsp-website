"use client";

import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export const PageTransition = ({ children }: { children: React.ReactNode }) => {
  const pathname = usePathname();
  const isFullWidthPage = pathname === "/about" || pathname === "/queries";

  return (
    <main
      key={pathname}
      className={cn(
        "flex-1 w-full flex flex-col pb-20 md:pb-6",
        !isFullWidthPage && "max-w-7xl mx-auto px-3 sm:px-6 py-4 sm:py-6",
        pathname === "/queries" && "h-full overflow-hidden",
      )}
      style={{
        animation: "fadeIn 0.2s ease-out forwards",
        willChange: "opacity",
        ...(pathname === "/queries"
          ? { height: "calc(100dvh - 3.75rem)" }
          : {}),
      }}
    >
      {children}
    </main>
  );
};
