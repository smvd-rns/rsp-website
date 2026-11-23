"use client";

import { ChevronRight, Edit2, FileText, Folder, Music } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef } from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import type {
  Category,
  EnrichedMaterialSearchResult,
  EnrichedRecording,
  Recording,
} from "@/types";

interface ContentSearchResultsProps {
  categories: Category[];
  recordings: EnrichedRecording[];
  materials: EnrichedMaterialSearchResult[];
  onSelectCategory: (cat: Category) => void;
  onSelectRecording: (rec: Recording) => void;
  onSelectMaterial: (mat: EnrichedMaterialSearchResult) => void;
  term: string;
  hasCategoryContext: boolean;
}

export const ContentSearchResults = ({
  categories,
  recordings,
  materials,
  onSelectCategory,
  onSelectRecording,
  onSelectMaterial,
  term,
  hasCategoryContext,
}: ContentSearchResultsProps) => {
  const containerRef = useRef<HTMLDivElement>(null);

  const hasResults =
    categories.length > 0 || recordings.length > 0 || materials.length > 0;

  // Keyboard navigation within search results
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!containerRef.current) return;

      const items = Array.from(
        containerRef.current.querySelectorAll<HTMLElement>(
          "[data-search-item]",
        ),
      ).filter((item) => !item.closest('[data-state="closed"]'));

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
      <p className="py-4 text-center text-xs text-muted-foreground">
        Type something to search{" "}
        {hasCategoryContext ? "within selected scope" : ""}
      </p>
    );
  }

  if (!hasResults) {
    return (
      <p className="py-6 text-center text-sm text-muted-foreground">
        No matching results found
      </p>
    );
  }

  return (
    <div
      ref={containerRef}
      className="overflow-y-auto flex-1 p-2 flex flex-col max-h-[380px]"
    >
      <Accordion
        type="single"
        defaultValue={
          recordings.length
            ? "recordings"
            : categories.length
              ? "categories"
              : "materials"
        }
        className="w-full"
        collapsible
        key={`${recordings.length}-${categories.length}-${materials.length}`}
      >
        {/* Categories Section */}
        {categories.length > 0 && (
          <AccordionItem value="categories" key="categories">
            <AccordionTrigger className="hover:no-underline py-2 px-2 text-xs font-bold tracking-wider uppercase text-muted-foreground opacity-80 hover:transition-all">
              Categories ({categories.length})
            </AccordionTrigger>
            <AccordionContent className="pb-2">
              <div className="flex flex-col gap-1">
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    data-search-item
                    onClick={() => onSelectCategory(cat)}
                    className="w-full text-left justify-between gap-2 flex items-center px-3 py-2 rounded-lg text-sm hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground focus:outline-none transition-all cursor-pointer"
                  >
                    <div className="flex items-center gap-2 truncate">
                      <Folder className="w-4 h-4 text-primary shrink-0" />
                      <span className="truncate font-medium">{cat.name}</span>
                    </div>
                    <span className="text-xs text-muted-foreground truncate">
                      /{cat.url_path ? cat.url_path.replace(/\./g, "/") : ""}
                    </span>
                  </button>
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>
        )}

        {/* Recordings Section */}
        {recordings.length > 0 && (
          <AccordionItem value="recordings" key="recordings">
            <AccordionTrigger className="hover:no-underline py-2 px-2 text-xs font-bold tracking-wider uppercase text-muted-foreground opacity-80 hover:transition-all">
              Recordings ({recordings.length})
            </AccordionTrigger>
            <AccordionContent className="pb-2">
              <div className="flex flex-col gap-1">
                {recordings.map((rec) => (
                  <div
                    key={rec.id}
                    className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg text-sm hover:bg-accent hover:text-accent-foreground group focus-within:bg-accent focus-within:text-accent-foreground transition-all"
                  >
                    <button
                      type="button"
                      data-search-item
                      onClick={() => onSelectRecording(rec)}
                      className="flex-1 text-left flex items-start gap-2 truncate cursor-pointer focus:outline-none"
                    >
                      <Music className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                      <div className="flex flex-col truncate">
                        <span className="font-medium truncate">{rec.name}</span>
                        {rec.category && (
                          <span className="text-xs text-muted-foreground truncate">
                            {rec.category.name}
                          </span>
                        )}
                      </div>
                    </button>
                    <Button
                      variant="ghost"
                      size="icon"
                      asChild
                      className="h-7 w-7 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity shrink-0"
                      title="Edit Recording"
                    >
                      <Link
                        href={`/recordings/${rec.id}/edit`}
                        prefetch={false}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Edit2 className="h-3.5 w-3.5 text-muted-foreground hover:text-primary" />
                      </Link>
                    </Button>
                  </div>
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>
        )}

        {/* Materials Section */}
        {materials.length > 0 && (
          <AccordionItem value="materials" key="materials">
            <AccordionTrigger className="hover:no-underline py-2 px-2 text-xs font-bold tracking-wider uppercase text-muted-foreground opacity-80 hover:transition-all">
              Materials ({materials.length})
            </AccordionTrigger>
            <AccordionContent className="pb-2">
              <div className="flex flex-col gap-1">
                {materials.map((mat) => (
                  <button
                    key={mat.id}
                    type="button"
                    data-search-item
                    onClick={() => onSelectMaterial(mat)}
                    className="w-full text-left flex flex-col gap-1 px-3 py-2 rounded-lg text-sm hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground focus:outline-none transition-all cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-warning shrink-0" />
                      <span className="font-semibold truncate">{mat.name}</span>
                    </div>
                    {(mat.category || mat.recording) && (
                      <div className="text-xs text-muted-foreground pl-6 flex items-center gap-1 font-medium truncate">
                        {mat.category && <span>{mat.category.name}</span>}
                        {mat.category && mat.recording && (
                          <ChevronRight className="w-3 h-3 shrink-0" />
                        )}
                        {mat.recording && (
                          <span className="truncate">{mat.recording.name}</span>
                        )}
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>
        )}
      </Accordion>
    </div>
  );
};
