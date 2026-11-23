"use client";

import { Check, Loader2, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ImageCardProps {
  url: string;
  avifUrl?: string;
  description: string;
  isSelected: boolean;
  isDeleting: boolean;
  onSelect: () => void;
  onEditClick: () => void;
  onDeleteClick: (e: React.MouseEvent) => void;
}

export const ImageCard = ({
  url,
  avifUrl,
  description,
  isSelected,
  isDeleting,
  onSelect,
  onEditClick,
  onDeleteClick,
}: ImageCardProps) => {
  return (
    <div className="relative group">
      <button
        type="button"
        onClick={onSelect}
        className={`w-full relative aspect-video rounded-lg overflow-hidden border-2 transition-all hover:border-primary ${
          isSelected ? "border-primary" : "border-transparent"
        }`}
      >
        <picture>
          {avifUrl && <source srcSet={avifUrl} type="image/avif" />}
          <img
            src={url}
            alt={description}
            className="h-full w-full object-cover transition-transform group-hover:scale-105"
            loading="lazy"
          />
        </picture>
        {isSelected && (
          <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
            <div className="bg-primary text-white rounded-full p-1">
              <Check className="h-4 w-4" />
            </div>
          </div>
        )}
        <div className="absolute inset-x-0 bottom-0 bg-black/60 p-2 translate-y-full group-hover:translate-y-0 transition-transform">
          <p className="text-[10px] text-white truncate">{description}</p>
        </div>
      </button>

      <Button
        type="button"
        size="icon"
        variant="secondary"
        className="absolute top-1 right-8 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity z-10 bg-primary text-primary-foreground/80 hover:bg-primary/90 border-none"
        onClick={(e) => {
          e.stopPropagation();
          onEditClick();
        }}
      >
        <Pencil className="h-3 w-3" />
      </Button>

      <Button
        size="icon"
        variant="destructive"
        className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity z-10"
        onClick={onDeleteClick}
        disabled={isDeleting}
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
