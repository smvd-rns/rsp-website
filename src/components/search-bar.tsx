"use client";

import { Loader2, Search, SlidersHorizontal, X } from "lucide-react";
import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { useSearchBar } from "@/hooks/use-search-bar";

export type SearchScope = "full" | "current" | "sub";

const SearchBarDropdownContent = dynamic(
  () =>
    import("./search-bar-dropdown").then((mod) => mod.SearchBarDropdownContent),
  { ssr: false },
);

export const SearchBar = () => {
  const searchBarState = useSearchBar();
  const { term, setTerm, searching, showDropdown, setShowDropdown, filters } =
    searchBarState;

  const [showFilters, setShowFilters] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const hasActiveFilters =
    (filters.speaker_ids && filters.speaker_ids.length > 0) ||
    (filters.lang_ids && filters.lang_ids.length > 0) ||
    filters.venues_id !== undefined ||
    filters.date_start !== "" ||
    filters.date_end !== "";

  // Global keyboard shortcut to open search spotlight (Ctrl+K, Cmd+K, or /)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        (e.key === "k" && (e.metaKey || e.ctrlKey)) ||
        (e.key === "/" &&
          !["INPUT", "TEXTAREA"].includes(
            (document.activeElement as HTMLElement)?.tagName || "",
          ))
      ) {
        e.preventDefault();
        setShowDropdown(true);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [setShowDropdown]);

  // Focus input when dialog opens
  useEffect(() => {
    if (showDropdown) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    }
  }, [showDropdown]);

  return (
    <div className="relative w-full max-w-md">
      {/* Header Search Trigger Capsule */}
      <button
        type="button"
        onClick={() => setShowDropdown(true)}
        className="w-full h-9 px-3.5 rounded-full bg-white/20 hover:bg-white/30 text-white placeholder:text-white/75 border border-white/30 flex items-center justify-between text-xs backdrop-blur-md transition-all shadow-inner group cursor-pointer focus:outline-none focus:ring-2 focus:ring-white/50"
        aria-label="Search discourses, categories, and study materials"
      >
        <div className="flex items-center gap-2 truncate">
          <Search className="w-4 h-4 text-white/90 group-hover:text-white shrink-0" />
          <span className="text-white/90 group-hover:text-white truncate font-medium">
            {term ? term : "Search discourses, categories, materials..."}
          </span>
        </div>
        <div className="hidden sm:flex items-center gap-1 shrink-0">
          <kbd className="px-1.5 py-0.5 text-[10px] font-semibold bg-black/25 text-white/90 rounded border border-white/20 font-mono">
            Ctrl K
          </kbd>
        </div>
      </button>

      {/* Modern Spotlight Command Modal Dialog */}
      <Dialog open={showDropdown} onOpenChange={setShowDropdown}>
        <DialogContent
          maxW="48rem"
          showCloseButton={false}
          className="p-0 overflow-hidden bg-card rounded-2xl shadow-2xl border border-border/80 gap-0 z-50"
        >
          <DialogTitle className="sr-only">
            Search Spiritual Discourses
          </DialogTitle>

          {/* Large Spotlight Search Input Header */}
          <div className="flex items-center gap-3 px-4 py-3.5 border-b border-border/70 bg-card">
            <Search className="w-5 h-5 text-primary shrink-0" />
            <input
              ref={inputRef}
              type="text"
              value={term}
              onChange={(e) => setTerm(e.target.value)}
              placeholder="Search 12,000+ discourses, categories, materials, topics..."
              className="flex-1 bg-transparent border-none outline-none text-sm sm:text-base text-foreground placeholder:text-muted-foreground/60 font-medium"
            />
            {searching && (
              <Loader2 className="w-4 h-4 text-primary animate-spin shrink-0" />
            )}
            {term && (
              <button
                type="button"
                onClick={() => setTerm("")}
                className="p-1 hover:bg-muted rounded-full text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
                aria-label="Clear search"
              >
                <X className="w-4 h-4" />
              </button>
            )}
            <Button
              type="button"
              variant={showFilters ? "secondary" : "outline"}
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
              className="h-8 gap-1.5 text-xs font-semibold px-2.5 cursor-pointer shrink-0 border-border/70"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Filters</span>
              {hasActiveFilters && (
                <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              )}
            </Button>
            <button
              type="button"
              onClick={() => setShowDropdown(false)}
              className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted text-xs font-mono border border-border/60 transition-colors cursor-pointer"
              aria-label="Close search"
            >
              ESC
            </button>
          </div>

          {/* Main Body: Collapsible Filters + Results */}
          <div className="flex flex-col max-h-[65vh] overflow-hidden">
            <SearchBarDropdownContent
              showFilters={showFilters}
              hasActiveFilters={hasActiveFilters}
              inDialog={true}
              {...searchBarState}
            />
          </div>

          {/* Modal Footer with Keyboard Shortcuts and Branding */}
          <div className="px-4 py-2.5 bg-muted/40 border-t border-border/60 flex items-center justify-between text-[11px] text-muted-foreground select-none">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 rounded bg-card border border-border font-mono text-[10px] shadow-2xs">
                  ↑↓
                </kbd>
                <span>Navigate</span>
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 rounded bg-card border border-border font-mono text-[10px] shadow-2xs">
                  ↵
                </kbd>
                <span>Select</span>
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 rounded bg-card border border-border font-mono text-[10px] shadow-2xs">
                  ESC
                </kbd>
                <span>Dismiss</span>
              </span>
            </div>
            <span className="font-semibold text-primary hidden sm:inline">
              Spiritual Vani Archive
            </span>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
