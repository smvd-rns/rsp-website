"use client";

import {
  Link2,
  Maximize2,
  Monitor,
  Sliders,
  Smartphone,
  Tablet,
  Unlink,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";
import type { ResponsiveBannerHeights } from "@/types";

export const HEIGHT_TIER_PRESETS = [
  {
    label: "Compact (44px)",
    heights: { mobile: 52, tablet: 48, desktop: 44, ultrawide: 48 },
  },
  {
    label: "Standard (56px)",
    heights: { mobile: 64, tablet: 56, desktop: 56, ultrawide: 64 },
  },
  {
    label: "Prominent (76px)",
    heights: { mobile: 84, tablet: 76, desktop: 76, ultrawide: 84 },
  },
  {
    label: "Hero (96px)",
    heights: { mobile: 110, tablet: 96, desktop: 96, ultrawide: 110 },
  },
];

export interface AnnouncementHeightFieldsProps {
  bannerHeights: ResponsiveBannerHeights;
  activeHeight: number;
  previewViewport: "mobile" | "tablet" | "desktop" | "ultrawide";
  heightsLinked: boolean;
  onHeightsLinkedToggle: () => void;
  onHeightChange: (
    viewport: "mobile" | "tablet" | "desktop" | "ultrawide",
    value: number,
  ) => void;
  onApplyPreset: (heights: ResponsiveBannerHeights) => void;
  disabled?: boolean;
}

export const AnnouncementHeightFields = ({
  bannerHeights,
  activeHeight,
  previewViewport,
  heightsLinked,
  onHeightsLinkedToggle,
  onHeightChange,
  onApplyPreset,
  disabled = false,
}: AnnouncementHeightFieldsProps) => {
  return (
    <div className="p-3.5 rounded-xl border border-border/80 bg-card space-y-3">
      <div className="flex items-center justify-between">
        <span className="font-semibold text-xs sm:text-sm text-foreground flex items-center gap-1.5">
          <Sliders className="w-4 h-4 text-primary" />
          Banner Height & Sizing
        </span>
        <div className="flex items-center gap-2">
          <Badge
            variant="outline"
            className="font-mono text-[10px] sm:text-xs text-primary bg-primary/10 border-primary/20 px-1.5 py-0"
          >
            {activeHeight}px active
          </Badge>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className={cn(
              "h-6 px-1.5 text-xs gap-1 cursor-pointer",
              heightsLinked
                ? "text-primary font-medium"
                : "text-muted-foreground",
            )}
            onClick={onHeightsLinkedToggle}
            title={
              heightsLinked
                ? "Break proportional lock to customize each breakpoint independently"
                : "Lock proportional scaling across breakpoints"
            }
            disabled={disabled}
          >
            {heightsLinked ? (
              <>
                <Link2 className="w-3 h-3" />
                <span className="text-[10px] hidden sm:inline">Linked</span>
              </>
            ) : (
              <>
                <Unlink className="w-3 h-3" />
                <span className="text-[10px] hidden sm:inline">Unlinked</span>
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Preset Buttons */}
      <div className="flex flex-wrap gap-1.5">
        {HEIGHT_TIER_PRESETS.map((preset) => {
          const isSelected =
            bannerHeights.desktop === preset.heights.desktop &&
            bannerHeights.mobile === preset.heights.mobile;
          return (
            <Button
              key={preset.label}
              type="button"
              variant={isSelected ? "default" : "outline"}
              size="sm"
              className="h-6 text-[11px] px-2 cursor-pointer"
              onClick={() => onApplyPreset(preset.heights)}
              disabled={disabled}
            >
              {preset.label}
            </Button>
          );
        })}
      </div>

      {/* Responsive Viewport Sliders */}
      <div className="space-y-2.5 pt-1">
        {(
          [
            {
              key: "mobile",
              label: "Mobile (<640px)",
              min: 44,
              max: 130,
              icon: Smartphone,
            },
            {
              key: "tablet",
              label: "Tablet (640-1024px)",
              min: 44,
              max: 120,
              icon: Tablet,
            },
            {
              key: "desktop",
              label: "Desktop (1024-1440px)",
              min: 40,
              max: 120,
              icon: Monitor,
            },
            {
              key: "ultrawide",
              label: "Ultra-Wide (>1440px)",
              min: 40,
              max: 130,
              icon: Maximize2,
            },
          ] as const
        ).map(({ key, label, min, max, icon: Icon }) => {
          const isCurrentViewport = previewViewport === key;
          const val = bannerHeights[key];

          return (
            <div
              key={key}
              className={cn(
                "p-2 rounded-lg transition-colors",
                isCurrentViewport
                  ? "bg-primary/5 border border-primary/20"
                  : "hover:bg-muted/30",
              )}
            >
              <div className="flex items-center justify-between text-xs mb-1">
                <span
                  className={cn(
                    "flex items-center gap-1.5 font-medium",
                    isCurrentViewport
                      ? "text-primary font-semibold"
                      : "text-muted-foreground",
                  )}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {label}
                  {isCurrentViewport && (
                    <span className="text-[10px] bg-primary/20 text-primary px-1 rounded font-normal">
                      Previewing
                    </span>
                  )}
                </span>
                <span className="font-mono text-xs font-semibold text-foreground">
                  {val}px
                </span>
              </div>
              <Slider
                value={[val]}
                min={min}
                max={max}
                step={2}
                onValueChange={([newVal]) => onHeightChange(key, newVal)}
                disabled={disabled}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
};
