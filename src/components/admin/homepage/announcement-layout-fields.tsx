"use client";

import { SlidersHorizontal } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export interface AnnouncementLayoutFieldsProps {
  layoutStack: boolean;
  onLayoutStackChange: (stack: boolean) => void;
  layoutMaxWidth: "sm" | "md" | "lg" | "full";
  onLayoutMaxWidthChange: (maxW: "sm" | "md" | "lg" | "full") => void;
  disabled?: boolean;
}

export const AnnouncementLayoutFields = ({
  layoutStack,
  onLayoutStackChange,
  layoutMaxWidth,
  onLayoutMaxWidthChange,
  disabled = false,
}: AnnouncementLayoutFieldsProps) => {
  return (
    <div className="p-3.5 rounded-xl border border-border/80 bg-card space-y-3">
      <div className="flex items-center justify-between">
        <span className="font-semibold text-xs sm:text-sm text-foreground flex items-center gap-1.5">
          <SlidersHorizontal className="w-4 h-4 text-primary" />
          Text Width & Multi-line Display
        </span>
        <Badge
          variant="secondary"
          className="text-[10px] sm:text-xs px-2 py-0.5"
        >
          Hierarchy
        </Badge>
      </div>

      <div className="space-y-3">
        {/* Stack Multi-Line Toggle */}
        <div className="flex items-center justify-between p-2 rounded-lg bg-muted/30 border border-border/50">
          <div className="space-y-0.5">
            <Label
              htmlFor="layout-stack-toggle"
              className="text-xs font-semibold cursor-pointer text-foreground"
            >
              Multi-line Stack (Title over Subtitle)
            </Label>
            <p className="text-[11px] text-muted-foreground">
              When disabled, title and subtitle render inline on one single row
            </p>
          </div>
          <Checkbox
            id="layout-stack-toggle"
            checked={layoutStack}
            onCheckedChange={(checked) => onLayoutStackChange(!!checked)}
            disabled={disabled}
            className="cursor-pointer"
          />
        </div>

        {/* Content Width Boundary */}
        <div className="space-y-1.5">
          <Label
            htmlFor="layout-maxwidth-select"
            className="text-xs font-semibold text-foreground"
          >
            Content Text Safe Boundary
          </Label>
          <Select
            value={layoutMaxWidth}
            onValueChange={(val) =>
              onLayoutMaxWidthChange(val as "sm" | "md" | "lg" | "full")
            }
            disabled={disabled}
          >
            <SelectTrigger
              id="layout-maxwidth-select"
              className="h-8 text-xs w-full"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="sm" className="text-xs">
                Compact (420px max)
              </SelectItem>
              <SelectItem value="md" className="text-xs">
                Medium (600px max)
              </SelectItem>
              <SelectItem value="lg" className="text-xs">
                Wide (840px max)
              </SelectItem>
              <SelectItem value="full" className="text-xs">
                Full Available Width
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
};
