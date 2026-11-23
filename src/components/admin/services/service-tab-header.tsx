"use client";

import { Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CardDescription, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface FilterOption {
  value: string;
  label: string;
}

interface ServiceTabHeaderProps {
  title: string;
  addButtonLabel?: string;
  onAddClick?: () => void;
  description: string;
  search: string;
  onSearchChange: (search: string) => void;
  searchPlaceholder?: string;
  statusFilter?: string;
  onStatusFilterChange?: (filter: string) => void;
  filterOptions?: FilterOption[];
}

export const ServiceTabHeader = ({
  title,
  addButtonLabel,
  onAddClick,
  description,
  search,
  onSearchChange,
  searchPlaceholder = "Search...",
  statusFilter,
  onStatusFilterChange,
  filterOptions,
}: ServiceTabHeaderProps) => {
  return (
    <>
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
        <h2 className="text-xl font-bold">{title}</h2>
        {addButtonLabel && onAddClick && (
          <Button onClick={onAddClick}>
            <Plus className="mr-2 h-4 w-4" /> {addButtonLabel}
          </Button>
        )}
      </div>

      <CardHeader className="pb-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <CardDescription>{description}</CardDescription>

          <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={searchPlaceholder}
                value={search}
                onChange={(e) => onSearchChange(e.target.value)}
                className="pl-8 h-9"
              />
            </div>

            {statusFilter !== undefined &&
              onStatusFilterChange &&
              filterOptions && (
                <Select
                  value={statusFilter}
                  onValueChange={onStatusFilterChange}
                >
                  <SelectTrigger className="w-full sm:w-36 h-9">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    {filterOptions.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
          </div>
        </div>
      </CardHeader>
    </>
  );
};
