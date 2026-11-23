"use client";

import {
  AlignCenter,
  Crosshair,
  Eye,
  EyeOff,
  RotateCw,
  ZoomIn,
} from "lucide-react";
import type { Area } from "react-easy-crop";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";

export interface CropSlidersProps {
  zoom: number;
  onZoomChange: (val: number) => void;
  rotation: number;
  onRotationChange: (val: number) => void;
}

export const CropSliders = ({
  zoom,
  onZoomChange,
  rotation,
  onRotationChange,
}: CropSlidersProps) => (
  <div className="grid sm:grid-cols-2 gap-2 pt-1">
    <div className="space-y-1">
      <div className="flex justify-between text-[11px]">
        <span className="font-medium text-muted-foreground flex items-center gap-1">
          <ZoomIn className="w-3 h-3" /> Zoom
        </span>
        <span className="font-mono text-[10px]">{zoom.toFixed(2)}x</span>
      </div>
      <Slider
        value={[zoom]}
        min={1}
        max={3}
        step={0.05}
        onValueChange={([val]) => onZoomChange(val)}
      />
    </div>

    <div className="space-y-1">
      <div className="flex justify-between text-[11px]">
        <span className="font-medium text-muted-foreground">Rotation</span>
        <span className="font-mono text-[10px]">{rotation}°</span>
      </div>
      <Slider
        value={[rotation]}
        min={-180}
        max={180}
        step={1}
        onValueChange={([val]) => onRotationChange(val)}
      />
    </div>
  </div>
);

export interface CropOverlayControlsProps {
  onCenterCrop: () => void;
  onReset: () => void;
  onCenterFocalPoint?: () => void;
  showSafeZone?: boolean;
  onToggleSafeZone?: () => void;
  zoomWithScroll?: boolean;
  onToggleZoomWithScroll?: () => void;
  resetTitle: string;
}

export const CropOverlayControls = ({
  onCenterCrop,
  onReset,
  onCenterFocalPoint,
  showSafeZone = true,
  onToggleSafeZone,
  zoomWithScroll = false,
  onToggleZoomWithScroll,
  resetTitle,
}: CropOverlayControlsProps) => (
  <div className="absolute top-2 right-2 flex flex-col gap-1 z-20">
    {onToggleSafeZone && (
      <Button
        type="button"
        size="icon"
        variant="secondary"
        className={cn(
          "h-6 w-6 bg-background/80 hover:bg-background shadow-xs cursor-pointer",
          showSafeZone
            ? "text-amber-500 font-bold"
            : "text-muted-foreground opacity-70",
        )}
        onClick={onToggleSafeZone}
        title={
          showSafeZone ? "Hide Safe Zone Overlay" : "Show Safe Zone Overlay"
        }
      >
        {showSafeZone ? (
          <Eye className="w-3 h-3" />
        ) : (
          <EyeOff className="w-3 h-3" />
        )}
      </Button>
    )}
    {onToggleZoomWithScroll && (
      <Button
        type="button"
        size="icon"
        variant="secondary"
        className={cn(
          "h-6 w-6 bg-background/80 hover:bg-background shadow-xs cursor-pointer",
          zoomWithScroll
            ? "text-primary font-bold bg-primary/15"
            : "text-muted-foreground opacity-70",
        )}
        onClick={onToggleZoomWithScroll}
        title={
          zoomWithScroll
            ? "Scroll-to-Zoom & Pinch Enabled (Click to disable to prevent accidental zoom)"
            : "Scroll-to-Zoom & Pinch Disabled (Click to enable)"
        }
      >
        <ZoomIn className="w-3 h-3" />
      </Button>
    )}
    {onCenterFocalPoint && (
      <Button
        type="button"
        size="icon"
        variant="secondary"
        className="h-6 w-6 bg-background/80 hover:bg-background shadow-xs cursor-pointer text-primary"
        onClick={onCenterFocalPoint}
        title="Center Crop on Focal Point"
      >
        <Crosshair className="w-3 h-3" />
      </Button>
    )}
    <Button
      type="button"
      size="icon"
      variant="secondary"
      className="h-6 w-6 bg-background/80 hover:bg-background shadow-xs cursor-pointer"
      onClick={onCenterCrop}
      title="Center Crop"
    >
      <AlignCenter className="w-3 h-3" />
    </Button>
    <Button
      type="button"
      size="icon"
      variant="secondary"
      className="h-6 w-6 bg-background/80 hover:bg-background shadow-xs cursor-pointer"
      onClick={onReset}
      title={resetTitle}
    >
      <RotateCw className="w-3 h-3" />
    </Button>
  </div>
);

export interface SafeZoneOverlayProps {
  bannerHeight: number;
  masterHeight: number;
  label: string;
  cropAreaPercentage?: Area | null;
  focalPoint?: { x: number; y: number } | null;
}

export const SafeZoneOverlay = ({
  bannerHeight,
  masterHeight,
  label,
  cropAreaPercentage,
  focalPoint,
}: SafeZoneOverlayProps) => {
  // If crop area percentage is available from react-easy-crop, use its actual bounding box
  const cropBox = cropAreaPercentage || {
    x: 0,
    y: 0,
    width: 100,
    height: 100,
  };

  // Calculate vertical visibility percentage of this bannerHeight relative to master crop height
  const verticalRatio = Math.min(1, Math.max(0.2, bannerHeight / masterHeight));
  const safeHeightPct = cropBox.height * verticalRatio;

  // Position safe band vertically anchored around focalPoint.y (default 50% = center)
  const focalYRatio = Math.max(0, Math.min(1, (focalPoint?.y ?? 50) / 100));
  const availableOverflow = cropBox.height - safeHeightPct;
  const safeTopPct = cropBox.y + availableOverflow * focalYRatio;
  const safeBottomPct = 100 - (safeTopPct + safeHeightPct);

  return (
    <div className="absolute inset-0 pointer-events-none z-10 select-none overflow-hidden">
      {/* Dimmed Area Inside Crop Box: Top portion above safe zone */}
      {safeTopPct > cropBox.y && (
        <div
          className="absolute bg-black/45 backdrop-blur-[0.5px] border-b border-white/20 transition-all duration-200"
          style={{
            left: `${cropBox.x}%`,
            width: `${cropBox.width}%`,
            top: `${cropBox.y}%`,
            height: `${safeTopPct - cropBox.y}%`,
          }}
        />
      )}

      {/* Active Central Safe Band Inside the Crop Window */}
      <div
        className="absolute border-y border-dashed border-amber-400 bg-amber-400/15 flex items-start justify-between px-2 pt-1 transition-all duration-200 shadow-xs"
        style={{
          left: `${cropBox.x}%`,
          width: `${cropBox.width}%`,
          top: `${safeTopPct}%`,
          bottom: `${safeBottomPct}%`,
        }}
      >
        <span className="text-[9px] font-bold tracking-tight text-amber-300 bg-black/85 px-1.5 py-0.5 rounded shadow-xs">
          {label}
        </span>
        <span className="text-[8px] font-mono text-amber-200/90 bg-black/75 px-1 py-0.5 rounded">
          {bannerHeight}px Visible Band
        </span>
      </div>

      {/* Dimmed Area Inside Crop Box: Bottom portion below safe zone */}
      {safeBottomPct > 100 - (cropBox.y + cropBox.height) && (
        <div
          className="absolute bg-black/45 backdrop-blur-[0.5px] border-t border-white/20 transition-all duration-200"
          style={{
            left: `${cropBox.x}%`,
            width: `${cropBox.width}%`,
            bottom: `${100 - (cropBox.y + cropBox.height)}%`,
            height: `${
              cropBox.y + cropBox.height - (safeTopPct + safeHeightPct)
            }%`,
          }}
        />
      )}

      {/* Center Reticle Guideline */}
      <div
        className="absolute left-0 right-0 border-t border-amber-300/40 pointer-events-none"
        style={{ top: `${safeTopPct + safeHeightPct / 2}%` }}
      />
    </div>
  );
};
