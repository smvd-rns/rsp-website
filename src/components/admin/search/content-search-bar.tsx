"use client";

import { ContentSearchResults } from "@/components/admin/search/content-search-results";
import { SearchInput } from "@/components/admin/search/search-input";
import { SearchScopeTabs } from "@/components/admin/search/search-scope-tabs";
import {
  Popover,
  PopoverAnchor,
  PopoverContent,
} from "@/components/ui/popover";
import { useContentSearchBar } from "@/hooks/use-content-search-bar";

export const ContentSearchBar = () => {
  const {
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
  } = useContentSearchBar();

  return (
    <div className="relative w-full max-w-md">
      <Popover open={showDropdown} onOpenChange={setShowDropdown}>
        <PopoverAnchor asChild>
          <div className="flex gap-2 items-center w-full">
            <SearchInput
              term={term}
              onChange={setTerm}
              onFocus={() => setShowDropdown(true)}
              searching={searching}
              role="combobox"
              aria-expanded={showDropdown}
              aria-haspopup="dialog"
            />
          </div>
        </PopoverAnchor>

        <PopoverContent
          className="p-0 bg-card border border-border shadow-md rounded-xl overflow-hidden z-50 flex flex-col w-[var(--radix-popover-trigger-width)] min-w-[320px] max-h-[420px]"
          align="start"
          onOpenAutoFocus={(e) => e.preventDefault()}
          onInteractOutside={(e) => {
            const target = e.target as HTMLElement;
            if (target.closest("#search-input-container")) {
              e.preventDefault();
            }
          }}
        >
          {currentCategory && (
            <SearchScopeTabs
              scope={scope}
              setScope={setScope}
              currentCategory={currentCategory}
            />
          )}
          <ContentSearchResults
            categories={results.categories}
            recordings={results.recordings}
            materials={results.materials}
            onSelectCategory={handleSelectCategory}
            onSelectRecording={handleSelectRecording}
            onSelectMaterial={handleSelectMaterial}
            term={term}
            hasCategoryContext={Boolean(currentCategory)}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
};
