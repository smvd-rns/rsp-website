"use client";

import { ChevronRight, FileText, Folder, Headphones, Sparkles } from "lucide-react";
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
    <div className="flex items-center gap-1.5 px-3 py-1.5 bg-muted/25 border-b border-border/50 overflow-x-auto no-scrollbar text-xxs">
      <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider shrink-0 mr-0.5">
        Search in:
      </span>
      <div className="flex items-center gap-1">
        {SEARCH_FIELD_ITEMS.map((field) => {
          const isChecked = searchFields.includes(field.id);
          return (
            <button
              key={field.id}
              type="button"
              onClick={() => toggleSearchField(field.id)}
              className={cn(
                "px-2 py-0.5 rounded-md text-[11px] font-medium transition-all cursor-pointer border select-none shrink-0",
                isChecked
                  ? "bg-primary/10 text-primary border-primary/25 font-semibold shadow-2xs"
                  : "bg-background text-muted-foreground border-border/50 hover:text-foreground opacity-60",
              )}
            >
              {field.label}
            </button>
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
      <div className="flex items-center gap-2 px-3 py-2 border-b border-border/60 bg-muted/30 overflow-x-auto no-scrollbar shrink-0">
        <button
          type="button"
          onClick={() => setActiveTab("all")}
          className={cn(
            "px-3 py-1 text-xs font-bold rounded-full transition-all cursor-pointer shrink-0 flex items-center gap-1.5 shadow-2xs border",
            activeTab === "all"
              ? "bg-slate-900 text-white border-slate-900 shadow-xs"
              : "bg-card text-muted-foreground border-border/60 hover:text-foreground hover:bg-muted/70",
          )}
        >
          <span>All</span>
          <span
            className={cn(
              "text-[10px] px-1.5 py-0.2 rounded-full font-bold",
              activeTab === "all"
                ? "bg-white/20 text-white"
                : "bg-muted text-muted-foreground",
            )}
          >
            {totalCount}
          </span>
        </button>

        {recordings.length > 0 && (
          <button
            type="button"
            onClick={() => setActiveTab("recordings")}
            className={cn(
              "px-3 py-1 text-xs font-bold rounded-full transition-all cursor-pointer shrink-0 flex items-center gap-1.5 border shadow-2xs",
              activeTab === "recordings"
                ? "bg-orange-600 text-white border-orange-600 shadow-xs"
                : "bg-card text-orange-800 border-orange-200/80 hover:bg-orange-50",
            )}
          >
            <Headphones className="w-3 h-3 shrink-0" />
            <span>Discourses</span>
            <span
              className={cn(
                "text-[10px] px-1.5 py-0.2 rounded-full font-bold",
                activeTab === "recordings"
                  ? "bg-white/20 text-white"
                  : "bg-orange-100 text-orange-800",
              )}
            >
              {recordings.length}
            </span>
          </button>
        )}

        {categories.length > 0 && (
          <button
            type="button"
            onClick={() => setActiveTab("categories")}
            className={cn(
              "px-3 py-1 text-xs font-bold rounded-full transition-all cursor-pointer shrink-0 flex items-center gap-1.5 border shadow-2xs",
              activeTab === "categories"
                ? "bg-emerald-600 text-white border-emerald-600 shadow-xs"
                : "bg-card text-emerald-800 border-emerald-200/80 hover:bg-emerald-50",
            )}
          >
            <Folder className="w-3 h-3 shrink-0" />
            <span>Categories</span>
            <span
              className={cn(
                "text-[10px] px-1.5 py-0.2 rounded-full font-bold",
                activeTab === "categories"
                  ? "bg-white/20 text-white"
                  : "bg-emerald-100 text-emerald-800",
              )}
            >
              {categories.length}
            </span>
          </button>
        )}

        {materials.length > 0 && (
          <button
            type="button"
            onClick={() => setActiveTab("materials")}
            className={cn(
              "px-3 py-1 text-xs font-bold rounded-full transition-all cursor-pointer shrink-0 flex items-center gap-1.5 border shadow-2xs",
              activeTab === "materials"
                ? "bg-blue-600 text-white border-blue-600 shadow-xs"
                : "bg-card text-blue-800 border-blue-200/80 hover:bg-blue-50",
            )}
          >
            <FileText className="w-3 h-3 shrink-0" />
            <span>Materials</span>
            <span
              className={cn(
                "text-[10px] px-1.5 py-0.2 rounded-full font-bold",
                activeTab === "materials"
                  ? "bg-white/20 text-white"
                  : "bg-blue-100 text-blue-800",
              )}
            >
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
        {/* Categories Section (Emerald Themed) */}
        {showCategories && (
          <div className="flex flex-col gap-1.5">
            <div className="px-3 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/25 text-emerald-900 flex items-center justify-between text-xs font-bold uppercase tracking-wider">
              <span className="flex items-center gap-1.5">
                <Folder className="w-3.5 h-3.5 text-emerald-600" />
                <span>Categories</span>
              </span>
              <span className="text-[10px] px-2 py-0.2 rounded-full bg-emerald-600 text-white font-bold shadow-2xs">{categories.length}</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
              {categories.map((cat, idx) => (
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
                  className="w-full text-left flex items-center gap-2.5 p-2.5 rounded-xl border border-emerald-200/80 bg-emerald-50/40 hover:bg-emerald-50/90 hover:border-emerald-400 focus:bg-emerald-100/60 focus:outline-none transition-all cursor-pointer group shadow-2xs"
                >
                  <div className="w-8 h-8 rounded-lg bg-linear-to-br from-emerald-500 to-teal-600 text-white flex items-center justify-center shrink-0 shadow-2xs group-hover:scale-105 transition-transform">
                    <Folder className="w-4 h-4 text-white" />
                  </div>
                  <div className="flex flex-col min-w-0 flex-1">
                    <span className="truncate font-semibold text-xs text-foreground group-hover:text-emerald-700 transition-colors">
                      {cat.name}
                    </span>
                    <span className="text-[10px] text-emerald-700/80 font-medium truncate">
                      Browse collection
                    </span>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-emerald-600/70 group-hover:text-emerald-700 group-hover:translate-x-0.5 transition-all shrink-0 ml-auto" />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Discourse Recordings Section (Saffron / Orange Themed) */}
        {showRecordings && (
          <div className="flex flex-col gap-1.5">
            <div className="px-3 py-1 rounded-lg bg-orange-500/10 border border-orange-500/25 text-orange-900 flex items-center justify-between text-xs font-bold uppercase tracking-wider">
              <span className="flex items-center gap-1.5">
                <Headphones className="w-3.5 h-3.5 text-orange-600" />
                <span>Discourses & Lectures</span>
              </span>
              <span className="text-[10px] px-2 py-0.2 rounded-full bg-orange-600 text-white font-bold shadow-2xs">{recordings.length}</span>
            </div>
            <div className="flex flex-col gap-1.5">
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
                  className="relative w-full text-left flex items-center gap-2.5 p-2.5 rounded-xl border border-orange-200/80 bg-orange-50/30 hover:bg-orange-50/80 hover:border-orange-400 focus:bg-orange-100/60 focus:outline-none transition-all cursor-pointer group shadow-2xs"
                >
                  <div className="w-8 h-8 rounded-lg bg-linear-to-br from-orange-500 to-amber-600 text-white flex items-center justify-center shrink-0 shadow-2xs group-hover:scale-105 transition-transform">
                    <Headphones className="w-4 h-4 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <RecordingMeta rec={rec} sm />
                  </div>
                  {rec.category && (
                    <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-orange-500/10 border border-orange-300/60 font-semibold text-orange-800 shrink-0 self-center group-hover:bg-orange-500/20 group-hover:text-orange-900 transition-colors max-w-[130px] sm:max-w-[190px] truncate shadow-2xs">
                      {rec.category.name}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Study Materials Section (Royal Blue Themed) */}
        {showMaterials && (
          <div className="flex flex-col gap-1.5">
            <div className="px-3 py-1 rounded-lg bg-blue-500/10 border border-blue-500/25 text-blue-900 flex items-center justify-between text-xs font-bold uppercase tracking-wider">
              <span className="flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-blue-600" />
                <span>Study Materials & References</span>
              </span>
              <span className="text-[10px] px-2 py-0.2 rounded-full bg-blue-600 text-white font-bold shadow-2xs">{materials.length}</span>
            </div>
            <div className="flex flex-col gap-1.5">
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
                  className="w-full text-left flex flex-col gap-1.5 p-2.5 rounded-xl border border-blue-200/80 bg-blue-50/30 hover:bg-blue-50/80 hover:border-blue-400 focus:bg-blue-100/60 focus:outline-none transition-all cursor-pointer group shadow-2xs"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-linear-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center shrink-0 shadow-2xs group-hover:scale-105 transition-transform">
                        <FileText className="w-4 h-4 text-white" />
                      </div>
                      <span className="font-semibold text-xs text-foreground group-hover:text-blue-700 transition-colors truncate">
                        {mat.name}
                      </span>
                    </div>
                    {mat.type && (
                      <span className="text-[10px] px-2 py-0.5 rounded-md bg-blue-600 text-white font-mono font-bold uppercase tracking-wider shrink-0 shadow-2xs">
                        {mat.type}
                      </span>
                    )}
                  </div>
                  <MaterialLineage
                    category={mat.category}
                    recording={mat.recording}
                    className="pl-10"
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
