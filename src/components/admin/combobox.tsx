"use client";

import { Check, ChevronsUpDown, Plus } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export interface ComboboxItem {
  value: string;
  label: string;
}

interface ComboboxProps<T extends string | string[]> {
  items: ComboboxItem[];
  value: T;
  onValueChange: (value: T) => void;
  isMulti?: boolean;
  placeholder?: string;
  emptyText?: string;
  onQuickAdd?: (name: string) => Promise<ComboboxItem | undefined>;
}

export const Combobox = <T extends string | string[]>({
  items,
  value,
  onValueChange,
  isMulti = false,
  placeholder = "Select item...",
  emptyText = "No item found.",
  onQuickAdd,
}: ComboboxProps<T>) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [isAdding, setIsAdding] = useState(false);

  const selectedValues: string[] = useMemo(() => {
    if (isMulti) {
      return Array.isArray(value) ? (value as string[]) : [];
    }
    return typeof value === "string" ? [value as string] : [];
  }, [value, isMulti]);

  const handleSelect = (currentValue: string) => {
    if (isMulti) {
      const newValues = selectedValues.includes(currentValue)
        ? selectedValues.filter((v) => v !== currentValue)
        : [...selectedValues, currentValue];
      onValueChange(newValues as T);
    } else {
      onValueChange((currentValue === value ? "" : currentValue) as T);
      setOpen(false);
    }
  };

  const handleQuickAdd = async () => {
    if (!onQuickAdd || !search.trim()) return;
    try {
      setIsAdding(true);
      const newItem = await onQuickAdd(search.trim());
      if (newItem) {
        if (isMulti) {
          onValueChange([...selectedValues, newItem.value] as T);
        } else {
          onValueChange(newItem.value as T);
          setOpen(false);
        }
        setSearch("");
      }
    } finally {
      setIsAdding(false);
    }
  };

  const showQuickAdd = useMemo(() => {
    if (!onQuickAdd || !search.trim()) return false;
    const normalizedSearch = search.trim().toLowerCase();
    return !items.some((item) => item.label.toLowerCase() === normalizedSearch);
  }, [onQuickAdd, search, items]);

  const displayValue = useMemo(() => {
    if (isMulti) {
      if (selectedValues.length === 0) return placeholder;
      const selectedLabels = selectedValues
        .map((val) => items.find((item) => item.value === val)?.label)
        .filter(Boolean) as string[];

      if (selectedLabels.length <= 3) {
        return selectedLabels.join(", ");
      }
      return `${selectedLabels.slice(0, 3).join(", ")} +${selectedLabels.length - 3} more`;
    }
    return items.find((item) => item.value === value)?.label || placeholder;
  }, [isMulti, selectedValues, items, value, placeholder]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
        >
          {displayValue}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="p-0"
        align="start"
        style={{ width: "var(--radix-popover-trigger-width)" }}
      >
        <Command>
          <CommandInput
            placeholder={`Search...`}
            value={search}
            onValueChange={setSearch}
          />
          <CommandList>
            <CommandEmpty>
              <div className="flex flex-col items-center justify-center p-4 text-sm">
                <p className="text-muted-foreground">{emptyText}</p>
              </div>
            </CommandEmpty>
            <CommandGroup>
              {items.map((item) => (
                <CommandItem
                  key={item.value}
                  value={item.label}
                  onSelect={() => handleSelect(item.value)}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      selectedValues.includes(item.value)
                        ? "opacity-100"
                        : "opacity-0",
                    )}
                  />
                  {item.label}
                </CommandItem>
              ))}
            </CommandGroup>
            {showQuickAdd && (
              <CommandGroup>
                <CommandItem
                  value={search}
                  onSelect={handleQuickAdd}
                  disabled={isAdding}
                  className="text-primary font-medium cursor-pointer"
                >
                  <Plus className="mr-2 h-4 w-4 shrink-0" />
                  <span>
                    {isAdding ? "Adding..." : `Create "${search.trim()}"`}
                  </span>
                </CommandItem>
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};
