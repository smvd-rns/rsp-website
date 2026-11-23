"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { setRedirectUrl } from "@/lib/auth-redirect";

export const RouteTracker = () => {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (!pathname) return;
    const query = searchParams?.toString();
    const fullPath = query ? `${pathname}?${query}` : pathname;
    setRedirectUrl(fullPath);
  }, [pathname, searchParams]);

  return null;
};
