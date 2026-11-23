"use client";

import { useCallback, useEffect, useState } from "react";
import type { Area, Point } from "react-easy-crop";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs } from "@/components/ui/tabs";
import { getCroppedImg } from "@/lib/image-utils";
import { toast } from "@/lib/toast";
import { cleanFilenameToTitle } from "@/lib/utils";
import { BrowseTabContent } from "./browse-tab-content";
import { EditTabContent } from "./edit-tab-content";
import { TabNavigation } from "./tab-navigation";
import { UploadTabContent } from "./upload-tab-content";

export interface SelectedImageResult {
  id?: number;
  file?: File;
  previewUrl?: string;
  description?: string;
}

interface ImageSelectorProps {
  onSelect: (selection: SelectedImageResult) => void;
  currentImageId?: number | null;
  triggerText?: string;
}

export const ImageSelector = ({
  onSelect,
  currentImageId,
  triggerText,
}: ImageSelectorProps) => {
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<string>("browse");

  // Core State
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [description, setDescription] = useState("");
  const [processedSize, setProcessedSize] = useState<number | null>(null);

  const onCropComplete = useCallback((_croppedArea: Area, pixels: Area) => {
    setCroppedAreaPixels(pixels);
  }, []);

  // Size preview debouncing
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    if (imageSrc && croppedAreaPixels) {
      timeoutId = setTimeout(async () => {
        try {
          const blob = await getCroppedImg(
            imageSrc,
            croppedAreaPixels,
            rotation,
          );
          if (blob) setProcessedSize(blob.size);
        } catch (e) {
          console.error("Size preview error", e);
        }
      }, 300);
    }
    return () => clearTimeout(timeoutId);
  }, [imageSrc, croppedAreaPixels, rotation]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      if (!description) setDescription(cleanFilenameToTitle(file.name));
      const reader = new FileReader();
      reader.onload = () => {
        setImageSrc(reader.result as string);
        setActiveTab("edit");
      };
      reader.readAsDataURL(file);
    }
  };

  /**
   * Stage the cropped image locally.
   * Does NOT upload to Google Drive immediately!
   * Staged file is passed to parent form and uploaded when user clicks Save Category.
   */
  const handleUseCroppedImage = async () => {
    if (!imageSrc || !croppedAreaPixels || !selectedFile) return;
    setIsProcessing(true);
    try {
      const croppedBlob = await getCroppedImg(
        imageSrc,
        croppedAreaPixels,
        rotation,
      );
      if (!croppedBlob) throw new Error("Failed to crop image");

      const webpFile = new File(
        [croppedBlob],
        selectedFile.name.replace(/\.[^/.]+$/, ".webp"),
        { type: "image/webp" },
      );
      const previewUrl = URL.createObjectURL(croppedBlob);

      setOpen(false);
      onSelect({
        file: webpFile,
        previewUrl,
        description: description || selectedFile.name,
      });

      toast.success(
        "Image selected! It will be uploaded to Google Drive when you save the category.",
      );
      resetState();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to process image",
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const resetState = () => {
    setSelectedFile(null);
    setImageSrc(null);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setRotation(0);
    setCroppedAreaPixels(null);
    setDescription("");
    setActiveTab("browse");
    setProcessedSize(null);
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / k ** i).toFixed(2))} ${sizes[i]}`;
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className="w-full flex items-center gap-2 cursor-pointer"
        >
          {triggerText || (currentImageId ? "Change Image" : "Select Image")}
        </Button>
      </DialogTrigger>
      <DialogContent className="lg:max-w-5xl md:max-w-4xl h-[85vh] flex flex-col p-0 gap-0">
        <DialogHeader className="px-6 py-4 border-b">
          <DialogTitle>Image Library</DialogTitle>
          <DialogDescription>
            Choose an existing image or crop and stage a new image for upload.
          </DialogDescription>
        </DialogHeader>

        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="flex-1 flex flex-col overflow-hidden"
        >
          <TabNavigation hasImageSrc={!!imageSrc} />

          <BrowseTabContent
            currentImageId={currentImageId}
            onSelectImage={(id, url) => {
              setOpen(false);
              onSelect({ id, previewUrl: url });
            }}
          />

          <UploadTabContent onFileChange={handleFileChange} />

          {imageSrc && (
            <EditTabContent
              imageSrc={imageSrc}
              crop={crop}
              setCrop={setCrop}
              zoom={zoom}
              setZoom={setZoom}
              rotation={rotation}
              setRotation={setRotation}
              onCropComplete={onCropComplete}
              description={description}
              setDescription={setDescription}
              selectedFile={selectedFile}
              processedSize={processedSize}
              formatSize={formatSize}
              handleUseImage={handleUseCroppedImage}
              resetState={resetState}
              isProcessing={isProcessing}
              hasValidCrop={!!croppedAreaPixels}
            />
          )}
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
