"use client";

import { Check, Loader2, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getImageUrl } from "@/lib/image-utils";

interface BannerCardProps {
  bannerId: number;
  description: string;
  isSelected: boolean;
  isDeleting: boolean;
  onSelect: () => void;
  onEditClick: () => void;
  onDeleteClick: (e: React.MouseEvent) => void;
}

export const BannerCard = ({
  bannerId,
  description,
  isSelected,
  isDeleting,
  onSelect,
  onEditClick,
  onDeleteClick,
}: BannerCardProps) => {
  const desktopUrl = getImageUrl("bnr", bannerId, "desktop_webp");
  const desktopAvifUrl = getImageUrl("bnr", bannerId, "desktop_avif");

  return (
    <div className="relative group">
      <button
        type="button"
        onClick={onSelect}
        className={`w-full relative aspect-[4/1] rounded-xl overflow-hidden border-2 transition-all hover:border-primary cursor-pointer bg-muted shadow-xs ${
          isSelected ? "border-primary ring-2 ring-primary" : "border-border"
        }`}
      >
        <picture>
          <source srcSet={desktopAvifUrl} type="image/avif" />
          <img
            src={desktopUrl}
            alt={description}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            loading="lazy"
          />
        </picture>

        {isSelected && (
          <div className="absolute inset-0 bg-primary/25 flex items-center justify-center">
            <div className="bg-primary text-white rounded-full p-1.5 shadow-md">
              <Check className="h-4 w-4" />
            </div>
          </div>
        )}

        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-2.5 translate-y-full group-hover:translate-y-0 transition-transform duration-200">
          <p className="text-xs text-white font-medium truncate drop-shadow-xs">
            {description}
          </p>
        </div>
      </button>

      <Button
        type="button"
        size="icon"
        variant="secondary"
        className="absolute top-2 right-9 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity z-10 bg-primary text-primary-foreground hover:bg-primary/90 cursor-pointer shadow-sm"
        onClick={(e) => {
          e.stopPropagation();
          onEditClick();
        }}
        title="Edit Description"
      >
        <Pencil className="h-3 w-3" />
      </Button>

      <Button
        type="button"
        size="icon"
        variant="destructive"
        className="absolute top-2 right-2 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity z-10 cursor-pointer shadow-sm"
        onClick={(e) => {
          e.stopPropagation();
          onDeleteClick(e);
        }}
        disabled={isDeleting}
        title="Delete Banner Image"
      >
        {isDeleting ? (
          <Loader2 className="h-3 w-3 animate-spin" />
        ) : (
          <Trash2 className="h-3 w-3" />
        )}
      </Button>
    </div>
  );
};
