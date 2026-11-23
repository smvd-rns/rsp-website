"use client";

import { AlignCenter, Check, Loader2, RotateCw } from "lucide-react";
import Cropper, { type Area, type Point } from "react-easy-crop";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { IMAGE_BASE_HEIGHT, IMAGE_BASE_WIDTH } from "@/constants";
import { TabsContent } from "../ui/tabs";

interface EditTabContentProps {
  imageSrc: string;
  crop: Point;
  setCrop: (p: Point) => void;
  zoom: number;
  setZoom: (z: number) => void;
  rotation: number;
  setRotation: (r: number) => void;
  onCropComplete: (croppedArea: Area, croppedAreaPixels: Area) => void;
  description: string;
  setDescription: (d: string) => void;
  selectedFile: File | null;
  processedSize: number | null;
  formatSize: (b: number) => string;
  handleUseImage: () => void;
  resetState: () => void;
  isProcessing: boolean;
  hasValidCrop: boolean;
}

export const EditTabContent = ({
  imageSrc,
  crop,
  setCrop,
  zoom,
  setZoom,
  rotation,
  setRotation,
  onCropComplete,
  description,
  setDescription,
  selectedFile,
  processedSize,
  formatSize,
  handleUseImage,
  resetState,
  isProcessing,
  hasValidCrop,
}: EditTabContentProps) => {
  const isOverSizeLimit = processedSize
    ? processedSize > 10 * 1024 * 1024
    : false; // 10MB limit

  return (
    <TabsContent
      value="edit"
      className="flex-1 overflow-hidden m-0 flex flex-col lg:flex-row relative"
    >
      <div className="flex-1 relative bg-black/90 min-h-[300px] flex items-center justify-center overflow-hidden">
        <Cropper
          image={imageSrc}
          crop={crop}
          zoom={zoom}
          rotation={rotation}
          aspect={IMAGE_BASE_WIDTH / IMAGE_BASE_HEIGHT}
          onCropChange={setCrop}
          onCropComplete={onCropComplete}
          onZoomChange={setZoom}
          onRotationChange={setRotation}
          minZoom={1}
        />
        <div className="absolute top-4 right-4 flex flex-col gap-2">
          <Button
            type="button"
            size="icon"
            variant="secondary"
            onClick={() => setCrop({ x: 0, y: 0 })}
            title="Center Image"
          >
            <AlignCenter className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            size="icon"
            variant="secondary"
            onClick={() => {
              setCrop({ x: 0, y: 0 });
              setZoom(1);
              setRotation(0);
            }}
            title="Reset All"
          >
            <RotateCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="w-full lg:w-[350px] p-6 bg-card border-t lg:border-t-0 lg:border-l border-border flex flex-col gap-5 overflow-y-auto">
        <div className="space-y-6">
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="font-medium text-foreground">Zoom</span>
              <span className="text-muted-foreground font-mono">
                {zoom.toFixed(1)}x
              </span>
            </div>
            <input
              type="range"
              min={1}
              max={3}
              step={0.1}
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
              className="w-full h-1.5 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
            />
          </div>
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="font-medium text-foreground">Rotation</span>
              <span className="text-muted-foreground font-mono">
                {rotation}°
              </span>
            </div>
            <input
              type="range"
              min={-180}
              max={180}
              step={1}
              value={rotation}
              onChange={(e) => setRotation(Number(e.target.value))}
              className="w-full h-1.5 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
            />
          </div>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <span className="text-sm font-medium text-foreground">
              Description / Name
            </span>
            <Input
              placeholder="Image title or description..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="bg-muted/50 border-border"
            />
          </div>

          <div className="rounded-xl bg-muted/40 p-4 border border-border/60">
            <div className="flex flex-col gap-2 text-xs">
              <div className="flex justify-between items-center text-muted-foreground">
                <span>Original File</span>
                <span className="font-mono text-foreground font-medium">
                  {selectedFile ? formatSize(selectedFile.size) : "-"}
                </span>
              </div>
              <div className="flex justify-between items-center text-muted-foreground">
                <span>Optimized WebP</span>
                <span className="font-mono text-primary font-semibold">
                  {processedSize ? formatSize(processedSize) : "Calculating..."}
                </span>
              </div>
              {isOverSizeLimit && (
                <p className="text-[11px] text-destructive mt-1">
                  Image exceeds maximum size limit.
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-2 mt-auto pt-4">
          <Button
            type="button"
            onClick={handleUseImage}
            disabled={isProcessing || !hasValidCrop || isOverSizeLimit}
            className="w-full shadow-lg shadow-primary/20 cursor-pointer"
          >
            {isProcessing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Preparing Image...
              </>
            ) : (
              <>
                <Check className="mr-2 h-4 w-4" />
                Use This Image
              </>
            )}
          </Button>
          <p className="text-[11px] text-muted-foreground text-center">
            Will be uploaded to Google Drive when you save the category.
          </p>
          <Button
            type="button"
            variant="ghost"
            onClick={resetState}
            disabled={isProcessing}
            className="w-full text-muted-foreground hover:text-foreground cursor-pointer"
          >
            Cancel
          </Button>
        </div>
      </div>
    </TabsContent>
  );
};
