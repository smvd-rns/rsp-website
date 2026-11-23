"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { SearchScope } from "@/components/search-bar";
import { INDEX, STORE } from "@/constants";
import { useSearch } from "@/hooks/use-search";
import { trackEvent } from "@/lib/analytics";
import { getDB } from "@/lib/idb";
import { categoryPath, pathToUrlPath } from "@/lib/utils";
import type {
  Category,
  CategorySearchDocument,
  EnrichedMaterialSearchResult,
  EnrichedRecording,
  MaterialSearchDocument,
  Recording,
  RecordingSearchDocument,
  RecordingSearchFilters,
} from "@/types";
import { useCategories } from "./use-categories";
import { useSearchSettings } from "./use-search-settings";

interface FilteredHits {
  categories: Category[];
  recordings: EnrichedRecording[];
  materials: EnrichedMaterialSearchResult[];
}

export const useSearchBar = () => {
  const router = useRouter();
  const pathname = usePathname();
  const { searchAll } = useSearch();
  const { data: allCategories = [] } = useCategories();
  const {
    effectiveTolerance,
    tolerance,
    setTolerance,
    searchFields,
    setSearchFields,
    toggleSearchField,
    exactMatch,
    setExactMatch,
  } = useSearchSettings();

  const [term, setTerm] = useState("");
  const [scope, setScope] = useState<SearchScope>("full");
  const [currentCategory, setCurrentCategory] = useState<Category | null>(null);
  const [results, setResults] = useState<FilteredHits>({
    categories: [],
    recordings: [],
    materials: [],
  });
  const [searching, setSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

  // Filter States
  const [filters, setFilters] = useState<RecordingSearchFilters>({
    speaker_ids: [],
    lang_ids: [],
    venues_id: undefined,
    date_start: "",
    date_end: "",
  });

  // Determine current category from URL pathname
  useEffect(() => {
    const loadCurrentCategory = async () => {
      const slug = pathname.split("/").filter(Boolean);
      if (
        slug.length === 0 ||
        slug[0] === "services" ||
        slug[0] === "about" ||
        slug[0] === "contact-us"
      ) {
        setCurrentCategory(null);
        setScope("full");
        return;
      }
      const db = await getDB();
      if (!db) return;
      const cat = await db.getFromIndex(
        STORE.CATEGORIES,
        INDEX.BY_URL,
        pathToUrlPath(slug),
      );
      setCurrentCategory(cat ?? null);
    };
    loadCurrentCategory();
  }, [pathname]);

  // Execute search via high-speed API when term changes
  useEffect(() => {
    const delayDebounce = setTimeout(async () => {
      const trimmed = term.trim();
      if (!trimmed) {
        setResults({ categories: [], recordings: [], materials: [] });
        setSearching(false);
        return;
      }

      setSearching(true);
      try {
        const langParam = filters.lang_ids && filters.lang_ids.length > 0 ? `&lang=${filters.lang_ids[0]}` : "";
        const res = await fetch(`/api/search?q=${encodeURIComponent(trimmed)}${langParam}&limit=20`);
        if (res.ok) {
          const data = await res.json();
          setResults({
            categories: data.categories || [],
            recordings: data.recordings || [],
            materials: data.materials || [],
          });
        }
      } catch (err) {
        console.error("Search API error:", err);
      } finally {
        setSearching(false);
      }
    }, 200);

    return () => clearTimeout(delayDebounce);
  }, [term, filters.lang_ids]);

  const handleSelectCategory = (cat: Category) => {
    router.push(categoryPath(cat.url_path));
    setTerm("");
    setShowDropdown(false);
  };

  const handleSelectRecording = (rec: any) => {
    const catUrl = rec.category?.url_path;
    if (catUrl) {
      router.push(`${categoryPath(catUrl)}?q=${rec.id}`);
    } else if (rec.category_id) {
      const found = allCategories.find((c) => c.id === rec.category_id);
      if (found?.url_path) {
        router.push(`${categoryPath(found.url_path)}?q=${rec.id}`);
      } else {
        router.push(`/?q=${rec.id}`);
      }
    }
    setTerm("");
    setShowDropdown(false);
  };

  const handleSelectMaterial = (mat: EnrichedMaterialSearchResult) => {
    if (mat.recording && mat.category) {
      router.push(
        `${categoryPath(mat.category.url_path)}?q=${mat.recording_id}&m=${mat.id}`,
      );
    }
    setTerm("");
    setShowDropdown(false);
  };

  return {
    term,
    setTerm,
    scope,
    setScope,
    currentCategory,
    results,
    searching,
    showDropdown,
    setShowDropdown,
    filters,
    setFilters,
    handleSelectCategory,
    handleSelectRecording,
    handleSelectMaterial,
    tolerance,
    setTolerance,
    effectiveTolerance,
    exactMatch,
    setExactMatch,
    searchFields,
    setSearchFields,
    toggleSearchField,
  };
};
