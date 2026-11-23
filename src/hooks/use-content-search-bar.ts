"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { SearchScope } from "@/components/admin/search/search-scope-tabs";
import { INDEX, STORE } from "@/constants";
import { useCategories } from "@/hooks/use-categories";
import { useSearch } from "@/hooks/use-search";
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

interface FilteredHits {
  categories: Category[];
  recordings: EnrichedRecording[];
  materials: EnrichedMaterialSearchResult[];
}

export const useContentSearchBar = () => {
  const router = useRouter();
  const pathname = usePathname();
  const { searchAll } = useSearch();
  const { data: allCategories = [] } = useCategories();

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

  // Determine current category from URL pathname (/content/[...path])
  useEffect(() => {
    const loadCurrentCategory = async () => {
      if (!pathname.startsWith("/admin/content") && !pathname.startsWith("/content")) {
        setCurrentCategory(null);
        setScope("full");
        return;
      }

      const urlPath = pathToUrlPath(pathname);
      if (!urlPath) {
        setCurrentCategory(null);
        setScope("full");
        return;
      }
      const db = await getDB();
      if (!db) return;

      const cat = await db.getFromIndex(
        STORE.CATEGORIES,
        INDEX.BY_URL,
        urlPath,
      );
      setCurrentCategory(cat ?? null);
    };

    loadCurrentCategory();
  }, [pathname]);

  // Execute scoped search when term or scope changes
  useEffect(() => {
    const delayDebounce = setTimeout(async () => {
      if (!term.trim()) {
        setResults({ categories: [], recordings: [], materials: [] });
        return;
      }

      setSearching(true);
      try {
        const filters: RecordingSearchFilters = {};

        if (currentCategory) {
          if (scope === "current") {
            filters.category_id = currentCategory.id;
            filters.category_path =
              `${currentCategory.path ?? ""}.${currentCategory.id}`.replace(
                /^\./,
                "",
              );
          } else if (scope === "sub") {
            const currentUrl = currentCategory.url_path;
            const subCatIds = (allCategories || [])
              .filter(
                (c) =>
                  c.url_path === currentUrl ||
                  c.url_path.startsWith(`${currentUrl}.`),
              )
              .map((c) => c.id);
            filters.category_ids = subCatIds;
          }
        }

        const rawResults = await searchAll(term, filters);
        const db = await getDB();
        if (!db) return;

        let recHits: RecordingSearchDocument[] = [];
        let catHits: CategorySearchDocument[] = [];
        let matHits: MaterialSearchDocument[] = [];

        for (const res of rawResults) {
          if (res.target === STORE.RECORDINGS)
            recHits = res.hits as RecordingSearchDocument[];
          if (res.target === STORE.CATEGORIES)
            catHits = res.hits as CategorySearchDocument[];
          if (res.target === STORE.MATERIALS)
            matHits = res.hits as MaterialSearchDocument[];
        }

        const catMap = new Map<number, Category>();
        for (const cat of allCategories || []) {
          catMap.set(cat.id, cat);
        }

        const filteredCats = catHits
          .map((h) => catMap.get(Number(h.id)))
          .filter((c): c is Category => c !== undefined);

        const recIds = recHits.map((h) => Number(h.id));
        const fullRecs = (
          await Promise.all(recIds.map((id) => db.get(STORE.RECORDINGS, id)))
        ).filter((r): r is Recording => r !== undefined);

        const enrichedRecordings: EnrichedRecording[] = fullRecs.map((rec) => ({
          ...rec,
          category: catMap.get(rec.category_id) ?? null,
        }));

        const enrichedMaterials: EnrichedMaterialSearchResult[] =
          await Promise.all(
            matHits.map(async (h) => {
              const mat = await db.get(STORE.MATERIALS, Number(h.id));
              if (!mat) {
                return {
                  id: Number(h.id),
                  name: h.name,
                  recording_id: h.recording_id,
                  allowed_roles: [],
                  type: "",
                  size: null,
                  uri: "",
                  recording: null,
                  category: null,
                } as unknown as EnrichedMaterialSearchResult;
              }
              const rec = await db.get(STORE.RECORDINGS, mat.recording_id);
              const cat = rec ? (catMap.get(rec.category_id) ?? null) : null;
              return {
                ...mat,
                recording: rec ?? null,
                category: cat,
              };
            }),
          );

        setResults({
          categories: filteredCats,
          recordings: enrichedRecordings,
          materials: enrichedMaterials,
        });
      } catch (err) {
        console.error("Search error:", err);
      } finally {
        setSearching(false);
      }
    }, 250);

    return () => clearTimeout(delayDebounce);
  }, [term, scope, currentCategory, searchAll, allCategories]);

  const handleSelectCategory = (cat: Category) => {
    const slug = cat.url_path ? categoryPath(cat.url_path).replace(/^\/+/, "") : "";
    router.push(`/admin/content/${slug}`);
    setTerm("");
    setShowDropdown(false);
  };

  const handleSelectRecording = async (rec: Recording) => {
    if (rec.category_id) {
      const db = await getDB();
      if (db) {
        const cat = await db.get(STORE.CATEGORIES, rec.category_id);
        if (cat) {
          const slug = categoryPath(cat.url_path).replace(/^\/+/, "");
          router.push(`/admin/content/${slug}?q=${rec.id}`);
          setTerm("");
          setShowDropdown(false);
          return;
        }
      }
    }
    router.push(`/admin/recordings/${rec.id}/edit`);
    setTerm("");
    setShowDropdown(false);
  };

  const handleSelectMaterial = (mat: EnrichedMaterialSearchResult) => {
    if (mat.recording && mat.category) {
      const slug = categoryPath(mat.category.url_path).replace(/^\/+/, "");
      router.push(`/admin/content/${slug}?q=${mat.recording_id}&m=${mat.id}`);
    } else if (mat.recording_id) {
      router.push(`/admin/recordings/${mat.recording_id}/edit`);
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
    handleSelectCategory,
    handleSelectRecording,
    handleSelectMaterial,
  };
};
