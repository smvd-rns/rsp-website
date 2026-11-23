"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef } from "react";

function getOrCreateVisitorId(): string {
  try {
    const KEY = "rsp_visitor_id";
    let vid = localStorage.getItem(KEY);
    if (!vid || vid.length < 10) {
      vid = `v_${Math.random().toString(36).substring(2, 12)}_${Date.now().toString(36)}`;
      localStorage.setItem(KEY, vid);
    }
    return vid;
  } catch {
    return `v_${Math.random().toString(36).substring(2, 12)}`;
  }
}

function VisitorTrackerInner() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const lastTracked = useRef<string>("");

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Build current route string
    const fullPath = pathname || "/";
    const trackingKey = `${fullPath}_${Date.now() - (Date.now() % 30000)}`; // 30s window on client

    if (lastTracked.current === trackingKey) return;
    lastTracked.current = trackingKey;

    const track = () => {
      try {
        const visitorId = getOrCreateVisitorId();
        const payload = {
          visitorId,
          path: fullPath,
          title: typeof document !== "undefined" ? document.title : "",
          referrer: typeof document !== "undefined" ? document.referrer : "",
          utm_source: searchParams?.get("utm_source") || null,
          utm_medium: searchParams?.get("utm_medium") || null,
          utm_campaign: searchParams?.get("utm_campaign") || null,
          screenWidth: window.innerWidth,
        };

        const jsonStr = JSON.stringify(payload);

        // Prefer sendBeacon for zero-impact background submission
        if (
          typeof navigator !== "undefined" &&
          typeof navigator.sendBeacon === "function"
        ) {
          const blob = new Blob([jsonStr], { type: "application/json" });
          const sent = navigator.sendBeacon("/api/analytics/track", blob);
          if (sent) return;
        }

        // Fallback to fetch with keepalive
        fetch("/api/analytics/track", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: jsonStr,
          keepalive: true,
        }).catch(() => {
          // Silent catch to prevent any user disruption
        });
      } catch {
        // Silent catch
      }
    };

    // Use idle callback so tracking never blocks interactions or UI render
    if ("requestIdleCallback" in window) {
      (
        window as unknown as {
          requestIdleCallback: (
            cb: () => void,
            opts: { timeout: number },
          ) => void;
        }
      ).requestIdleCallback(track, { timeout: 2000 });
    } else {
      setTimeout(track, 300);
    }
  }, [pathname, searchParams]);

  return null;
}

export function VisitorTracker() {
  return (
    <Suspense fallback={null}>
      <VisitorTrackerInner />
    </Suspense>
  );
}

export default VisitorTracker;
