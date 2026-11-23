"use client";

import { Search } from "lucide-react";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { TabsContent } from "@/components/ui/tabs";
import { useImages } from "@/hooks/use-images";
import { getImageUrl } from "@/lib/image-utils";
import { ImageCard } from "./image-card";
import { ImageDeleteDialog } from "./image-delete-dialog";
import { ImageEditDescriptionDialog } from "./image-edit-description-dialog";

interface BrowseTabContentProps {
  currentImageId?: number | null;
  onSelectImage: (id: number, url?: string) => void;
}

export const BrowseTabContent = ({
  currentImageId,
  onSelectImage,
}: BrowseTabContentProps) => {
  const { data: images, isLoading } = useImages();
  const [search, setSearch] = useState("");

  const [isDeleting, setIsDeleting] = useState<number | null>(null);
  const [imageToDelete, setImageToDelete] = useState<number | null>(null);

  const [editingImageId, setEditingImageId] = useState<number | null>(null);
  const [editingDescription, setEditingDescription] = useState("");

  const filteredImages = images?.filter((img) =>
    String(img.description || "")
      .toLowerCase()
      .includes(search.toLowerCase()),
  );

  return (
    <>
      <TabsContent
        value="browse"
        className="flex-1 overflow-hidden m-0 flex flex-col"
      >
        <div className="p-4 border-b">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search images..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-6">
          {isLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {Array.from({ length: 10 }).map((_, idx) => (
                // biome-ignore lint/suspicious/noArrayIndexKey: ok for skeleton
                <Skeleton key={idx} className="aspect-video rounded-lg" />
              ))}
            </div>
          ) : filteredImages?.length ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {filteredImages.map((img) => {
                const url =
                  img.url ||
                  (img.webp?.startsWith("http")
                    ? img.webp
                    : img.webp
                      ? `https://lh3.googleusercontent.com/d/${img.webp}=s400`
                      : getImageUrl("img", img.id, "webp"));
                const avifUrl = img.url || getImageUrl("img", img.id, "avif");
                return (
                  <ImageCard
                    key={img.id}
                    url={url}
                    avifUrl={avifUrl}
                    description={img.description}
                    isSelected={currentImageId === img.id}
                    isDeleting={isDeleting === img.id}
                    onSelect={() => onSelectImage(img.id, url)}
                    onEditClick={() => {
                      setEditingImageId(img.id);
                      setEditingDescription(img.description || "");
                    }}
                    onDeleteClick={() => setImageToDelete(img.id)}
                  />
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
              <p>No images found</p>
            </div>
          )}
        </div>
      </TabsContent>

      <ImageDeleteDialog
        imageToDelete={imageToDelete}
        setImageToDelete={setImageToDelete}
        isDeleting={isDeleting}
        setIsDeleting={setIsDeleting}
      />

      <ImageEditDescriptionDialog
        editingImageId={editingImageId}
        setEditingImageId={setEditingImageId}
        editingDescription={editingDescription}
        setEditingDescription={setEditingDescription}
      />
    </>
  );
};
