"use client";

import { ChevronDown, FolderOpen, Upload, X } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getImageUrl } from "@/lib/image-utils";
import { cn } from "@/lib/utils";
import { BrowseTab } from "./browse-tab";
import { CropAndOptimizeTab } from "./crop-and-optimize-tab";

interface BannerArtworkAccordionProps {
  selectedBannerId?: number | null;
  mediaPath?: string | null;
  bannerHeight?: number;
  focalPoint?: { x: number; y: number };
  onSelect: (bannerId: number, filename: string) => void;
  onClear: () => void;
  onLivePreviewUpdate?: (
    src: string | null,
    variant?: "desktop" | "mobile",
  ) => void;
  disabled?: boolean;
}

export const BannerArtworkAccordion = ({
  selectedBannerId,
  mediaPath,
  bannerHeight = 56,
  focalPoint,
  onSelect,
  onClear,
  onLivePreviewUpdate,
  disabled = false,
}: BannerArtworkAccordionProps) => {
  const [openSection, setOpenSection] = useState<"browse" | "upload" | null>(
    null,
  );

  const toggleSection = (section: "browse" | "upload") => {
    if (disabled) return;
    setOpenSection((prev) => {
      const next = prev === section ? null : section;
      if (next !== "upload") {
        onLivePreviewUpdate?.(null);
      }
      return next;
    });
  };

  const handleSelectBanner = (bannerId: number) => {
    const filename = `bnr-${bannerId.toString(36)}`;
    onLivePreviewUpdate?.(null);
    onSelect(bannerId, filename);
    setOpenSection(null); // Close accordion on selection
  };

  const handleNewArtworkCreated = (bannerId: number) => {
    const filename = `bnr-${bannerId.toString(36)}`;
    onLivePreviewUpdate?.(null);
    onSelect(bannerId, filename);
    setOpenSection(null);
  };

  const resolvedBannerId =
    selectedBannerId ??
    (mediaPath?.startsWith("bnr-")
      ? parseInt(mediaPath.slice(4), 36)
      : mediaPath && /^\d+$/.test(mediaPath)
        ? Number(mediaPath)
        : null);

  const artworkThumbSrc =
    mediaPath &&
    (mediaPath.startsWith("http")
      ? mediaPath
      : resolvedBannerId && !Number.isNaN(resolvedBannerId)
        ? getImageUrl("bnr", resolvedBannerId, "desktop_webp")
        : null);

  return (
    <div className="space-y-2.5">
      {/* Active Selected Artwork Card */}
      {mediaPath && (
        <div className="flex items-center justify-between p-2 rounded-lg border border-primary/30 bg-primary/5">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-14 h-8 rounded-md bg-muted/80 border overflow-hidden shrink-0">
              {artworkThumbSrc ? (
                <img
                  src={artworkThumbSrc}
                  alt=""
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-muted flex items-center justify-center text-[10px] text-muted-foreground">
                  N/A
                </div>
              )}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-foreground truncate">
                  {mediaPath}
                </span>
                <Badge
                  variant="secondary"
                  className="text-[9px] px-1 py-0 font-mono"
                >
                  Active Artwork
                </Badge>
              </div>
              <span className="text-[10px] text-muted-foreground block truncate">
                Serving Desktop 16:1 (-d) & Mobile/Tablet 6:1 (-m)
              </span>
            </div>
          </div>

          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="h-7 text-xs text-muted-foreground hover:text-destructive cursor-pointer"
            onClick={() => {
              onLivePreviewUpdate?.(null);
              onClear();
            }}
            disabled={disabled}
          >
            <X className="w-3.5 h-3.5 mr-1" />
            Remove
          </Button>
        </div>
      )}

      {/* Accordion / Expandable Panels for Image Selection & Creation */}
      <div className="w-full rounded-lg border border-border/80 bg-card overflow-hidden divide-y divide-border/80">
        {/* Section 2: Upload & Crop New Artwork Side-by-Side */}
        <div>
          <button
            type="button"
            onClick={() => toggleSection("upload")}
            disabled={disabled}
            className={cn(
              "w-full flex items-center justify-between py-2.5 px-3 text-left transition-colors cursor-pointer select-none",
              openSection === "upload" ? "bg-muted/30" : "hover:bg-muted/10",
              disabled && "opacity-50 pointer-events-none",
            )}
          >
            <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
              <Upload className="w-3.5 h-3.5 text-primary" />
              <span>Upload & Crop New Artwork (Side-by-Side 16:1 & 6:1)</span>
            </div>
            <ChevronDown
              className={cn(
                "w-3.5 h-3.5 text-muted-foreground transition-transform duration-200",
                openSection === "upload" && "rotate-180",
              )}
            />
          </button>
          <div
            className={cn(
              "px-3 pt-1.5 pb-3 transition-all",
              openSection === "upload" ? "block" : "hidden",
            )}
          >
            <CropAndOptimizeTab
              onSuccess={handleNewArtworkCreated}
              bannerHeight={bannerHeight}
              focalPoint={focalPoint}
              onPreviewUpdate={onLivePreviewUpdate}
            />
          </div>
        </div>
        {/* Section 1: Browse Existing Library */}
        <div>
          <button
            type="button"
            onClick={() => toggleSection("browse")}
            disabled={disabled}
            className={cn(
              "w-full flex items-center justify-between py-2.5 px-3 text-left transition-colors cursor-pointer select-none",
              openSection === "browse" ? "bg-muted/30" : "hover:bg-muted/10",
              disabled && "opacity-50 pointer-events-none",
            )}
          >
            <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
              <FolderOpen className="w-3.5 h-3.5 text-primary" />
              <span>Choose From Artwork Library</span>
            </div>
            <ChevronDown
              className={cn(
                "w-3.5 h-3.5 text-muted-foreground transition-transform duration-200",
                openSection === "browse" && "rotate-180",
              )}
            />
          </button>
          <div
            className={cn(
              "px-3 pt-1.5 pb-3 transition-all",
              openSection === "browse" ? "block" : "hidden",
            )}
          >
            <BrowseTab
              selectedBannerId={selectedBannerId}
              onSelectBanner={handleSelectBanner}
              onGoToUpload={() => setOpenSection("upload")}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
