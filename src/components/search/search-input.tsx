"use client";

import { Loader2, Search, X } from "lucide-react";
import type { ComponentProps } from "react";
import { Input } from "@/components/ui/input";

interface SearchInputProps
  extends Omit<ComponentProps<typeof Input>, "onChange"> {
  term: string;
  onChange: (value: string) => void;
  searching: boolean;
}

export function SearchInput({
  term,
  onChange,
  searching,
  placeholder = "Search discourses, categories, materials, events...",
  className,
  ...props
}: SearchInputProps) {
  return (
    <div
      className="relative flex items-center w-full"
      id="search-input-container"
    >
      <Search className="absolute left-3 w-4 h-4 text-muted-foreground pointer-events-none" />
      <Input
        type="text"
        value={term}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="pl-9 pr-10 h-9.5 w-full bg-card border-border shadow-2xs focus-visible:border-primary focus-visible:ring-1 focus-visible:ring-primary focus-visible:ring-offset-0 rounded-xl transition-all"
        {...props}
      />
      <div className="absolute right-3 flex items-center gap-1.5">
        {term && (
          <button
            type="button"
            onClick={() => onChange("")}
            className="p-1 hover:bg-muted-foreground/10 rounded-full transition-all cursor-pointer"
            aria-label="Clear search"
          >
            <X className="w-3 h-3 text-muted-foreground" />
          </button>
        )}
        {searching && (
          <Loader2 className="w-4 h-4 text-primary animate-spin shrink-0" />
        )}
      </div>
    </div>
  );
}
