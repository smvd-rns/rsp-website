import { useQuery } from "@tanstack/react-query";
import { QUERY_KEY } from "@/constants";
import type { Category } from "@/types";

export const useCategories = () =>
  useQuery({
    queryKey: [QUERY_KEY.ALL_CATEGORIES],
    queryFn: async (): Promise<Category[]> => {
      try {
        const res = await fetch("/api/admin/categories", {
          cache: "no-store",
          headers: {
            "Cache-Control": "no-cache",
          },
        });
        if (res.ok) {
          const json = await res.json();
          if (Array.isArray(json.categories)) {
            return json.categories as Category[];
          }
        }
      } catch (err) {
        console.warn("[useCategories] Live fetch failed:", err);
      }
      return [];
    },
    staleTime: 0,
    refetchOnWindowFocus: true,
  });
