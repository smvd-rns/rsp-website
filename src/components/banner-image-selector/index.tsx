"use client";

import { FolderOpen, Sparkles, Upload } from "lucide-react";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BrowseTab } from "./browse-tab";
import { CropAndOptimizeTab } from "./crop-and-optimize-tab";

interface BannerImageSelectorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedBannerId?: number | null;
  onSelect: (bannerId: number) => void;
}

export const BannerImageSelector = ({
  open,
  onOpenChange,
  selectedBannerId,
  onSelect,
}: BannerImageSelectorProps) => {
  const [activeTab, setActiveTab] = useState<string>("browse");

  const handleSelectBanner = (bannerId: number) => {
    onSelect(bannerId);
    onOpenChange(false);
  };

  const handleNewArtworkCreated = (bannerId: number) => {
    onSelect(bannerId);
    onOpenChange(false);
    setActiveTab("browse");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-5xl w-[95vw] max-h-[90vh] overflow-y-auto p-6">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            Banner Artwork Library
          </DialogTitle>
          <DialogDescription>
            Choose from existing banner artwork or upload, dual-crop, and
            optimize new high-resolution graphics.
          </DialogDescription>
        </DialogHeader>

        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="w-full space-y-4 pt-2"
        >
          <TabsList className="grid w-full grid-cols-2 max-w-sm">
            <TabsTrigger
              value="browse"
              className="text-xs flex items-center gap-1.5 cursor-pointer"
            >
              <FolderOpen className="w-3.5 h-3.5" />
              Browse Banner Library
            </TabsTrigger>
            <TabsTrigger
              value="upload"
              className="text-xs flex items-center gap-1.5 cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5" />
              Upload & Crop New
            </TabsTrigger>
          </TabsList>

          <TabsContent value="browse" className="outline-none">
            <BrowseTab
              selectedBannerId={selectedBannerId}
              onSelectBanner={handleSelectBanner}
              onGoToUpload={() => setActiveTab("upload")}
            />
          </TabsContent>

          <TabsContent value="upload" className="outline-none">
            <CropAndOptimizeTab onSuccess={handleNewArtworkCreated} />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export { BannerArtworkAccordion } from "./banner-artwork-accordion";
