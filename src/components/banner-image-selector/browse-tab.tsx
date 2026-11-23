"use client";

import { useQueryClient } from "@tanstack/react-query";
import { Plus, Search } from "lucide-react";
import { useState } from "react";
import {
  deleteBannerImage,
  updateBannerImageDescription,
} from "@/app/actions/homepage-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { STORE } from "@/constants";
import {
  BANNER_IMAGES_QUERY_KEY,
  useBannerImages,
} from "@/hooks/use-banner-images";
import { getDB } from "@/lib/idb";
import { toast } from "@/lib/toast";
import { triggerSync } from "@/lib/utils";
import { BannerCard } from "./banner-card";
import { BannerDeleteDialog } from "./banner-delete-dialog";
import { BannerEditDescriptionDialog } from "./banner-edit-description-dialog";

interface BrowseTabProps {
  selectedBannerId?: number | null;
  onSelectBanner: (bannerId: number) => void;
  onGoToUpload: () => void;
}

export const BrowseTab = ({
  selectedBannerId,
  onSelectBanner,
  onGoToUpload,
}: BrowseTabProps) => {
  const { data: bannerImages, isLoading } = useBannerImages();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");

  const [isDeleting, setIsDeleting] = useState<number | null>(null);
  const [bannerToDelete, setBannerToDelete] = useState<number | null>(null);

  const [editingBannerId, setEditingBannerId] = useState<number | null>(null);
  const [editingDescription, setEditingDescription] = useState("");

  const filteredImages = bannerImages?.filter((img) =>
    String(img.description).toLowerCase().includes(search.toLowerCase()),
  );

  const handleDelete = async (id: number) => {
    setIsDeleting(id);
    try {
      const res = await deleteBannerImage(id);
      if (!res.success) {
        toast.error(res.error || "Failed to delete banner image");
        return;
      }
      const db = await getDB();
      if (db) {
        await db.delete(STORE.BANNER_IMAGES, id);
      }
      toast.success("Banner image deleted successfully");
      await triggerSync([STORE.BANNER_IMAGES]);
      queryClient.invalidateQueries({ queryKey: BANNER_IMAGES_QUERY_KEY });
    } catch (err) {
      console.error(err);
      toast.error("Failed to delete banner image");
    } finally {
      setIsDeleting(null);
      setBannerToDelete(null);
    }
  };

  const handleUpdateDescription = async (newDesc: string) => {
    if (!editingBannerId) return;
    try {
      const res = await updateBannerImageDescription(editingBannerId, newDesc);
      if (!res.success) {
        toast.error(res.error || "Failed to update description");
        return;
      }
      toast.success("Description updated");
      await triggerSync([STORE.BANNER_IMAGES]);
      queryClient.invalidateQueries({ queryKey: BANNER_IMAGES_QUERY_KEY });
    } catch (err) {
      console.error(err);
      toast.error("Failed to update description");
    }
  };

  return (
    <div className="flex flex-col h-full space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search banner artworks library..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9 text-sm"
          />
        </div>

        <Button
          type="button"
          size="sm"
          onClick={onGoToUpload}
          className="h-9 gap-1.5 font-semibold cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4" />
          Upload & Crop New Artwork
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto min-h-[280px] max-h-[420px] p-1">
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, idx) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: skeleton
              <Skeleton key={idx} className="aspect-[4/1] rounded-xl" />
            ))}
          </div>
        ) : filteredImages?.length ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredImages.map((img) => (
              <BannerCard
                key={img.id}
                bannerId={img.id}
                description={img.description}
                isSelected={selectedBannerId === img.id}
                isDeleting={isDeleting === img.id}
                onSelect={() => onSelectBanner(img.id)}
                onEditClick={() => {
                  setEditingBannerId(img.id);
                  setEditingDescription(img.description);
                }}
                onDeleteClick={() => setBannerToDelete(img.id)}
              />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-16 text-center space-y-3 border-2 border-dashed border-border rounded-xl bg-muted/20">
            <p className="text-sm text-muted-foreground font-medium">
              No banner artworks found in library.
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onGoToUpload}
              className="gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Upload First Banner Artwork
            </Button>
          </div>
        )}
      </div>

      <BannerDeleteDialog
        isOpen={!!bannerToDelete}
        onOpenChange={(open) => !open && setBannerToDelete(null)}
        onConfirm={() => bannerToDelete && handleDelete(bannerToDelete)}
        isDeleting={isDeleting === bannerToDelete}
      />

      <BannerEditDescriptionDialog
        isOpen={!!editingBannerId}
        onOpenChange={(open) => !open && setEditingBannerId(null)}
        description={editingDescription}
        onSave={handleUpdateDescription}
      />
    </div>
  );
};
