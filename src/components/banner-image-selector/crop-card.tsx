"use client";

import Cropper, { type Area, type Point } from "react-easy-crop";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { PixelCrop } from "@/lib/image-utils";
import type { AspectRatioOption } from "./crop-and-optimize-tab";
import {
  CropOverlayControls,
  CropSliders,
  SafeZoneOverlay,
} from "./safe-zone-overlay";

export interface CropCardProps {
  title: string;
  badge?: string;
  aspectPresets: AspectRatioOption[];
  selectedPreset: string;
  onPresetChange: (val: string) => void;
  targetDims: { width: number; height: number };
  canvasSize?: number | null;
  imageSrc: string | null;
  crop: Point;
  zoom: number;
  rotation: number;
  aspect?: number;
  cropAreaPercentage?: Area | null;
  onCropChange: (crop: Point) => void;
  onZoomChange: (zoom: number) => void;
  onRotationChange: (rotation: number) => void;
  onCropComplete: (croppedArea: Area, croppedPixels: PixelCrop) => void;
  zoomWithScroll: boolean;
  onToggleZoomWithScroll: () => void;
  showSafeZone: boolean;
  onToggleSafeZone: () => void;
  bannerHeight: number;
  focalPoint?: { x: number; y: number } | null;
  onCenterCrop: () => void;
  onResetCrop: () => void;
  onCenterFocalPoint?: () => void;
  icon?: React.ReactNode;
  headerExtra?: React.ReactNode;
}

export const CropCard = ({
  title,
  badge,
  aspectPresets,
  selectedPreset,
  onPresetChange,
  targetDims,
  canvasSize,
  imageSrc,
  crop,
  zoom,
  rotation,
  aspect,
  cropAreaPercentage,
  onCropChange,
  onZoomChange,
  onRotationChange,
  onCropComplete,
  zoomWithScroll,
  onToggleZoomWithScroll,
  showSafeZone,
  onToggleSafeZone,
  bannerHeight,
  focalPoint,
  onCenterCrop,
  onResetCrop,
  onCenterFocalPoint,
  icon,
  headerExtra,
}: CropCardProps) => {
  return (
    <div className="space-y-2 p-2.5 rounded-xl border border-border/80 bg-card">
      <div className="flex items-center justify-between text-xs gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          {icon}
          <Select value={selectedPreset} onValueChange={onPresetChange}>
            <SelectTrigger className="h-6 text-[11px] font-semibold min-w-[140px] max-w-[170px] border-none shadow-none p-0 focus:ring-0">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {aspectPresets.map((p) => (
                <SelectItem key={p.label} value={p.label} className="text-xs">
                  {p.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {badge && (
            <Badge variant="secondary" className="text-[10px] px-1 py-0">
              {badge}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="font-mono text-[10px] text-muted-foreground">
            {targetDims.width}×{targetDims.height}
          </span>
          <Badge
            variant="outline"
            className="font-mono text-[10px] font-semibold text-primary bg-primary/10 border-primary/20 px-1.5 py-0"
          >
            {canvasSize
              ? `~${Math.round(canvasSize / 1024)} KB`
              : "Calculating..."}
          </Badge>
        </div>
      </div>

      {headerExtra}

      <div className="relative w-full h-48 sm:h-52 rounded-lg overflow-hidden border bg-black shadow-inner">
        {imageSrc && (
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            rotation={rotation}
            aspect={aspect}
            zoomWithScroll={zoomWithScroll}
            onCropChange={onCropChange}
            onZoomChange={onZoomChange}
            onRotationChange={onRotationChange}
            onCropComplete={onCropComplete}
          />
        )}
        {showSafeZone && (
          <SafeZoneOverlay
            bannerHeight={bannerHeight}
            masterHeight={targetDims.height}
            label={`${title} Safe Zone`}
            cropAreaPercentage={cropAreaPercentage}
            focalPoint={focalPoint}
          />
        )}
        <CropOverlayControls
          onCenterCrop={onCenterCrop}
          showSafeZone={showSafeZone}
          onToggleSafeZone={onToggleSafeZone}
          zoomWithScroll={zoomWithScroll}
          onToggleZoomWithScroll={onToggleZoomWithScroll}
          onCenterFocalPoint={onCenterFocalPoint}
          onReset={onResetCrop}
          resetTitle={`Reset ${title} Crop`}
        />
      </div>

      <CropSliders
        zoom={zoom}
        onZoomChange={onZoomChange}
        rotation={rotation}
        onRotationChange={onRotationChange}
      />
    </div>
  );
};
