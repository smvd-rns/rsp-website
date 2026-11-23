"use client";

import { useQuery } from "@tanstack/react-query";
import { QUERY_KEY } from "@/constants";
import type { Announcement, EnrichedFeaturedSection } from "@/types";

export interface HomepageData {
  announcements: Announcement[];
  spotlights: Announcement[];
  featuredSections: EnrichedFeaturedSection[];
}

export const useHomepage = () =>
  useQuery<HomepageData>({
    queryKey: [QUERY_KEY.HOMEPAGE],
    queryFn: async (): Promise<HomepageData> => {
      try {
        const res = await fetch("/api/homepage", {
          cache: "no-store",
          headers: {
            "Cache-Control": "no-cache",
          },
        });
        if (res.ok) {
          const json = await res.json();
          return {
            announcements: json.announcements || [],
            spotlights: json.spotlights || [],
            featuredSections: json.featuredSections || [],
          };
        }
      } catch (err) {
        console.warn("[useHomepage] Live fetch failed:", err);
      }
      return {
        announcements: [],
        spotlights: [],
        featuredSections: [],
      };
    },
    staleTime: 0,
    refetchOnWindowFocus: true,
  });
