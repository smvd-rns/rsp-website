"use client";

import { useQuery } from "@tanstack/react-query";
import { QUERY_KEY } from "@/constants";
import { pathToUrlPath } from "@/lib/utils";
import type { Category, EnrichedRecording } from "@/types";

export interface CategoryPageData {
  category?: Category;
  subcategories: Category[];
  recordings: EnrichedRecording[];
  redirectTo?: string;
  breadcrumbs?: Array<{ label: string; href: string }>;
}

const loadCategoryPage = async (
  urlPath: string,
  initialData?: CategoryPageData | null,
): Promise<CategoryPageData | null> => {
  if (
    initialData?.category ||
    (initialData?.subcategories && initialData.subcategories.length > 0)
  ) {
    return initialData;
  }

  try {
    const res = await fetch(
      `/api/category?path=${encodeURIComponent(urlPath || "")}`,
      {
        cache: "no-store",
        headers: {
          "Cache-Control": "no-cache",
        },
      },
    );
    if (res.ok) {
      const data = await res.json();
      return data;
    }
  } catch (err) {
    console.error("[useCategoryPage] fetch error:", err);
  }

  return initialData || null;
};

export const useCategoryPage = (
  pathname: string,
  initialData?: CategoryPageData,
  requestedPath?: string,
) => {
  const currentPath = pathToUrlPath(pathname);

  const isValidInitialData = currentPath
    ? Boolean(
        initialData?.category &&
          (currentPath === requestedPath ||
            currentPath === initialData.category.url_path),
      )
    : !initialData?.category && Boolean(initialData?.subcategories?.length);

  const queryInitialData = isValidInitialData ? initialData : undefined;
  const urlPath =
    isValidInitialData && initialData?.category?.url_path
      ? initialData.category.url_path
      : currentPath;

  return useQuery({
    queryKey: [QUERY_KEY.CATEGORY_PAGE, urlPath || "~"],
    queryFn: () => loadCategoryPage(urlPath, queryInitialData || initialData),
    initialData: queryInitialData || initialData,
    initialDataUpdatedAt: 0,
    staleTime: 0,
    refetchOnWindowFocus: true,
  });
};
