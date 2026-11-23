"use client";

import { FileText, Folder, Headphones, Sparkles } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import type { SearchFieldKey } from "@/hooks/use-search-settings";
import { trackEvent } from "@/lib/analytics";
import { getCategoryImageUrl } from "@/lib/storage";
import { categoryPath, cn } from "@/lib/utils";
import type {
  Category,
  EnrichedMaterialSearchResult,
  EnrichedRecording,
  Recording,
} from "@/types";
import { MaterialLineage } from "../material-lineage";
import { RecordingMeta } from "../recording-meta";

const SEARCH_FIELD_ITEMS: { id: SearchFieldKey; label: string }[] = [
  { id: "name", label: "Titles" },
  { id: "speaker_names", label: "Speakers" },
  { id: "event_name", label: "Events" },
  { id: "venue_name", label: "Venues" },
];

type SearchTypeTab = "all" | "recordings" | "categories" | "materials";

interface SearchResultsProps {
  categories: Category[];
  recordings: EnrichedRecording[];
  materials: EnrichedMaterialSearchResult[];
  onSelectCategory: (cat: Category) => void;
  onSelectRecording: (rec: Recording) => void;
  onSelectMaterial: (mat: EnrichedMaterialSearchResult) => void;
  term: string;
  hasCategoryContext: boolean;
  searchFields?: SearchFieldKey[];
  toggleSearchField?: (field: SearchFieldKey) => void;
}

export const SearchResults = ({
  categories,
  recordings,
  materials,
  onSelectCategory,
  onSelectRecording,
  onSelectMaterial,
  term,
  hasCategoryContext,
  searchFields,
  toggleSearchField,
}: SearchResultsProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeTab, setActiveTab] = useState<SearchTypeTab>("all");

  const totalCount = recordings.length + categories.length + materials.length;
  const hasResults = totalCount > 0;

  // Keyboard navigation within search results
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!containerRef.current) return;

      const items = Array.from(
        containerRef.current.querySelectorAll<HTMLElement>(
          "[data-search-item]",
        ),
      );

      if (items.length === 0) return;

      const currentIndex = items.indexOf(document.activeElement as HTMLElement);

      if (e.key === "ArrowDown") {
        e.preventDefault();
        const nextIndex = (currentIndex + 1) % items.length;
        items[nextIndex]?.focus();
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        const prevIndex = (currentIndex - 1 + items.length) % items.length;
        items[prevIndex]?.focus();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  if (!term.trim()) {
    return (
      <div className="py-8 px-4 text-center flex flex-col items-center gap-2">
        <Sparkles className="w-5 h-5 text-primary/60" />
        <p className="text-xs text-muted-foreground">
          Type to search across discourses, categories, study materials, and events
        </p>
      </div>
    );
  }

  const searchingInTags = toggleSearchField && searchFields && (
    <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 text-xxs px-3 py-1.5 bg-muted/40 border-b border-border/40">
      <span className="font-semibold text-muted-foreground whitespace-nowrap">
        Searching in:
      </span>
      <div className="flex flex-wrap items-center gap-2">
        {SEARCH_FIELD_ITEMS.map((field) => {
          const isChecked = searchFields.includes(field.id);
          return (
            <label
              key={field.id}
              htmlFor={`search-field-${field.id}`}
              className="flex items-center gap-1 cursor-pointer select-none text-xxs text-foreground font-medium"
            >
              <Checkbox
                id={`search-field-${field.id}`}
                checked={isChecked}
                onCheckedChange={() => toggleSearchField(field.id)}
                className="size-3.5"
              />
              <span>{field.label}</span>
            </label>
          );
        })}
      </div>
    </div>
  );

  if (!hasResults) {
    return (
      <div className="py-8 px-4 flex flex-col items-center gap-3 text-center">
        <p className="text-sm font-medium text-foreground">
          No matching results for &ldquo;{term}&rdquo;
        </p>
        <p className="text-xs text-muted-foreground max-w-xs">
          Try checking for spelling, broadening search terms, or adjusting the active filters.
        </p>
        {searchingInTags}
      </div>
    );
  }

  const showRecordings =
    (activeTab === "all" || activeTab === "recordings") &&
    recordings.length > 0;
  const showCategories =
    (activeTab === "all" || activeTab === "categories") &&
    categories.length > 0;
  const showMaterials =
    (activeTab === "all" || activeTab === "materials") &&
    materials.length > 0;

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      {/* Category / Type Filter Selector Bar */}
      <div className="flex items-center gap-1 px-3 py-2 border-b border-border bg-card overflow-x-auto no-scrollbar shrink-0">
        <button
          type="button"
          onClick={() => setActiveTab("all")}
          className={cn(
            "px-2.5 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer shrink-0 flex items-center gap-1.5",
            activeTab === "all"
              ? "bg-primary text-primary-foreground shadow-xs"
              : "text-muted-foreground hover:text-foreground hover:bg-muted",
          )}
        >
          <span>All</span>
          <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-black/10 dark:bg-white/20 font-bold">
            {totalCount}
          </span>
        </button>

        {recordings.length > 0 && (
          <button
            type="button"
            onClick={() => setActiveTab("recordings")}
            className={cn(
              "px-2.5 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer shrink-0 flex items-center gap-1.5",
              activeTab === "recordings"
                ? "bg-primary text-primary-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground hover:bg-muted",
            )}
          >
            <Headphones className="w-3 h-3 shrink-0" />
            <span>Discourses</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-black/10 dark:bg-white/20 font-bold">
              {recordings.length}
            </span>
          </button>
        )}

        {categories.length > 0 && (
          <button
            type="button"
            onClick={() => setActiveTab("categories")}
            className={cn(
              "px-2.5 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer shrink-0 flex items-center gap-1.5",
              activeTab === "categories"
                ? "bg-primary text-primary-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground hover:bg-muted",
            )}
          >
            <Folder className="w-3 h-3 shrink-0" />
            <span>Categories</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-black/10 dark:bg-white/20 font-bold">
              {categories.length}
            </span>
          </button>
        )}

        {materials.length > 0 && (
          <button
            type="button"
            onClick={() => setActiveTab("materials")}
            className={cn(
              "px-2.5 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer shrink-0 flex items-center gap-1.5",
              activeTab === "materials"
                ? "bg-primary text-primary-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground hover:bg-muted",
            )}
          >
            <FileText className="w-3 h-3 shrink-0" />
            <span>Materials</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-black/10 dark:bg-white/20 font-bold">
              {materials.length}
            </span>
          </button>
        )}
      </div>

      {searchingInTags}

      {/* Results Scroll Container */}
      <div
        ref={containerRef}
        className="overflow-y-auto flex-1 p-2 flex flex-col gap-3"
      >
        {/* Categories Section */}
        {showCategories && (
          <div className="flex flex-col gap-1">
            <div className="px-2 py-1 text-[11px] font-bold tracking-wider uppercase text-muted-foreground flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Folder className="w-3.5 h-3.5 text-primary" />
                <span>Categories</span>
              </span>
              <span>{categories.length}</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
              {categories.map((cat, idx) => {
                const imgUrl = getCategoryImageUrl(cat, "webp") ?? "/rsp.webp";
                return (
                  <button
                    key={cat.id}
                    type="button"
                    data-search-item
                    onClick={() => {
                      trackEvent("search_result_clicked", {
                        query_term: term,
                        clicked_slug: categoryPath(cat.url_path),
                        position_index: idx,
                      });
                      onSelectCategory(cat);
                    }}
                    className="w-full text-left flex items-center gap-2.5 p-2 rounded-xl border border-border/60 bg-card hover:bg-accent/60 hover:border-primary/40 focus:bg-accent focus:outline-none transition-all cursor-pointer group shadow-2xs"
                  >
                    <img
                      src={imgUrl}
                      alt=""
                      width={36}
                      height={36}
                      className="h-9 w-9 rounded-lg object-cover shrink-0 border border-border/40"
                      loading="lazy"
                    />
                    <div className="flex flex-col min-w-0">
                      <span className="truncate font-semibold text-xs text-foreground group-hover:text-primary transition-colors">
                        {cat.name}
                      </span>
                      <span className="text-[10px] text-muted-foreground truncate">
                        Browse collection
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Discourse Recordings Section */}
        {showRecordings && (
          <div className="flex flex-col gap-1">
            <div className="px-2 py-1 text-[11px] font-bold tracking-wider uppercase text-muted-foreground flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Headphones className="w-3.5 h-3.5 text-primary" />
                <span>Discourses & Lectures</span>
              </span>
              <span>{recordings.length}</span>
            </div>
            <div className="flex flex-col gap-1">
              {recordings.map((rec, idx) => (
                <button
                  key={rec.id}
                  type="button"
                  data-search-item
                  onClick={() => {
                    trackEvent("search_result_clicked", {
                      query_term: term,
                      clicked_slug: rec.category
                        ? `${categoryPath(rec.category.url_path)}?q=${rec.id}`
                        : `?q=${rec.id}`,
                      position_index: idx,
                    });
                    onSelectRecording(rec);
                  }}
                  className="relative w-full text-left flex gap-2.5 px-3 py-2 rounded-xl border border-transparent hover:border-border hover:bg-accent/60 focus:bg-accent focus:outline-none transition-all cursor-pointer group"
                >
                  <Headphones className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <RecordingMeta rec={rec} sm />
                  </div>
                  {rec.category && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted font-medium text-muted-foreground shrink-0 self-start group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                      {rec.category.name}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Study Materials Section */}
        {showMaterials && (
          <div className="flex flex-col gap-1">
            <div className="px-2 py-1 text-[11px] font-bold tracking-wider uppercase text-muted-foreground flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-primary" />
                <span>Study Materials & References</span>
              </span>
              <span>{materials.length}</span>
            </div>
            <div className="flex flex-col gap-1">
              {materials.map((mat, idx) => (
                <button
                  key={mat.id}
                  type="button"
                  data-search-item
                  onClick={() => {
                    trackEvent("search_result_clicked", {
                      query_term: term,
                      clicked_slug: mat.category
                        ? `${categoryPath(mat.category.url_path)}?q=${mat.recording_id}&m=${mat.id}`
                        : `?q=${mat.recording_id}&m=${mat.id}`,
                      position_index: idx,
                    });
                    onSelectMaterial(mat);
                  }}
                  className="w-full text-left flex flex-col gap-1 px-3 py-2 rounded-xl border border-border/50 bg-card hover:bg-accent/60 hover:border-primary/40 focus:bg-accent focus:outline-none transition-all cursor-pointer group shadow-2xs"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <FileText className="w-4 h-4 text-primary shrink-0" />
                      <span className="font-semibold text-xs text-foreground group-hover:text-primary transition-colors truncate">
                        {mat.name}
                      </span>
                    </div>
                    {mat.type && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted font-mono font-medium text-muted-foreground uppercase shrink-0">
                        {mat.type}
                      </span>
                    )}
                  </div>
                  <MaterialLineage
                    category={mat.category}
                    recording={mat.recording}
                  />
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
