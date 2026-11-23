"use client";

import {
  Crosshair,
  Eye,
  Maximize2,
  Monitor,
  Play,
  Smartphone,
  Tablet,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { BannerElement } from "@/lib/asset-registry";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";
import type { ResponsiveBannerHeights } from "@/types";
import { AnnouncementBannerContent } from "./announcement-banner-content";
import { BannerElementRenderer } from "./banner-element-renderer";

export interface AnnouncementPreviewProps {
  previewViewport: "mobile" | "tablet" | "desktop" | "ultrawide";
  onViewportChange: (vp: "mobile" | "tablet" | "desktop" | "ultrawide") => void;
  activeHeight: number;
  bannerHeights: ResponsiveBannerHeights;
  currentPreviewImage: string | null;
  showFocalReticle: boolean;
  onToggleFocalReticle: () => void;
  replayTrigger: number;
  onTriggerReplay: () => void;
  focalPoint: { x: number; y: number };
  onFocalPointChange: (pt: { x: number; y: number }) => void;
  overlayTheme?: string;
  bgGradient?: string;
  elements: BannerElement[];
  title: string;
  subtitle?: string;
  badgeText?: string;
  ctaLabel?: string;
  layoutStack?: boolean;
  layoutAlign?: "left" | "center" | "right";
  layoutValign?: "top" | "center" | "bottom";
  layoutCta?: "auto" | "below" | "right" | "bottom_right";
  layoutMaxWidth?: "sm" | "md" | "lg" | "full";
  floatingGreetingEnabled?: boolean;
  floatingGreetingIcon?: string;
  floatingGreetingText?: string;
}

const BannerGradientOverlay = ({ bgGradient }: { bgGradient?: string }) => {
  if (!bgGradient || bgGradient === "none") return null;

  if (bgGradient === "black_vignette") {
    return (
      <div
        className="absolute inset-0 transition-opacity duration-300"
        style={{
          background:
            "linear-gradient(to right, rgba(0,0,0,0.85), rgba(0,0,0,0.5), rgba(0,0,0,0.2))",
          opacity: 1,
        }}
      />
    );
  }

  return (
    <div
      className={`absolute inset-0 bg-gradient-to-r ${bgGradient} opacity-85 mix-blend-multiply`}
    />
  );
};

export const AnnouncementPreview = ({
  previewViewport,
  onViewportChange,
  activeHeight,
  bannerHeights,
  currentPreviewImage,
  showFocalReticle,
  onToggleFocalReticle,
  replayTrigger,
  onTriggerReplay,
  focalPoint,
  onFocalPointChange,
  overlayTheme = "none",
  bgGradient = "none",
  elements,
  title,
  subtitle,
  badgeText,
  ctaLabel,
  layoutStack = false,
  layoutAlign = "left",
  layoutValign = "center",
  layoutCta = "auto",
  layoutMaxWidth = "full",
  floatingGreetingEnabled = false,
  floatingGreetingIcon = "🌸",
  floatingGreetingText = "",
}: AnnouncementPreviewProps) => {
  return (
    <div className="p-3.5 rounded-xl border border-border/80 bg-card space-y-3">
      {/* Viewport & Preview Header Controls */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-xs sm:text-sm text-foreground flex items-center gap-1.5">
            <Eye className="w-4 h-4 text-primary" />
            Live Banner Preview
          </span>
          <Badge
            variant="outline"
            className="font-mono text-[10px] text-primary bg-primary/10 border-primary/20 px-1.5 py-0"
          >
            {activeHeight}px ({previewViewport})
          </Badge>
        </div>

        {/* Viewport Selectors */}
        <div className="flex items-center gap-1 bg-muted/60 p-0.5 rounded-lg border border-border">
          <Button
            type="button"
            size="sm"
            variant={previewViewport === "mobile" ? "default" : "ghost"}
            className="h-6 px-2 text-[11px] gap-1 cursor-pointer"
            onClick={() => onViewportChange("mobile")}
          >
            <Smartphone className="w-3 h-3" />
            <span>Mobile</span>
          </Button>
          <Button
            type="button"
            size="sm"
            variant={previewViewport === "tablet" ? "default" : "ghost"}
            className="h-6 px-2 text-[11px] gap-1 cursor-pointer"
            onClick={() => onViewportChange("tablet")}
          >
            <Tablet className="w-3 h-3" />
            <span>Tablet</span>
          </Button>
          <Button
            type="button"
            size="sm"
            variant={previewViewport === "desktop" ? "default" : "ghost"}
            className="h-6 px-2 text-[11px] gap-1 cursor-pointer"
            onClick={() => onViewportChange("desktop")}
          >
            <Monitor className="w-3 h-3" />
            <span>Desktop</span>
          </Button>
          <Button
            type="button"
            size="sm"
            variant={previewViewport === "ultrawide" ? "default" : "ghost"}
            className="h-6 px-2 text-[11px] gap-1 cursor-pointer"
            onClick={() => onViewportChange("ultrawide")}
            title="21:9 Scaled Simulation with feathered peripheral wings"
          >
            <Maximize2 className="w-3 h-3" />
            <span>Ultra-Wide</span>
          </Button>

          {/* Focal Reticle Pinning Toggle */}
          <Button
            type="button"
            size="sm"
            variant={showFocalReticle ? "default" : "ghost"}
            className="h-6 px-2 text-[11px] gap-1 cursor-pointer"
            onClick={onToggleFocalReticle}
            title="Toggle interactive focal point reticle"
          >
            <Crosshair className="w-3 h-3" />
            <span>Focal Pin</span>
          </Button>

          {/* Replay Additive Animations Trigger */}
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="h-6 w-6 ml-0.5 cursor-pointer text-muted-foreground hover:text-foreground"
            onClick={onTriggerReplay}
            title="Replay entry animations"
          >
            <Play className="w-3 h-3" />
          </Button>
        </div>
      </div>

      {/* Live Browser & Simulated Viewport Canvas */}
      {previewViewport === "ultrawide" ? (
        /* Scaled 21:9 Ultra-Wide Simulator */
        <div
          className="w-full relative overflow-hidden rounded-lg border border-border/80 bg-neutral-950 flex flex-col justify-center"
          style={{
            height: `${Math.max(
              70,
              Math.round((bannerHeights.ultrawide + 32) * 0.62) + 4,
            )}px`,
          }}
        >
          <div
            className="origin-top-left pointer-events-none"
            style={{
              width: "1800px",
              transform: "scale(0.62)",
            }}
          >
            {/* Browser Header Bar */}
            <div className="bg-muted/80 px-3 py-1 border-b border-border flex items-center justify-between text-[11px] text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-red-400 inline-block" />
                <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />
                <span className="w-2 h-2 rounded-full bg-green-400 inline-block" />
                <span className="ml-2 font-mono text-[10px]">
                  radheshyamdas.com (Ultra-Wide 1800px Simulated Viewport)
                </span>
              </div>
              <span className="text-[10px] font-mono text-primary font-bold">
                Scale: 62% • Central 12:1 Mask
              </span>
            </div>

            {/* Ultra-Wide Scaled Banner */}
            <div
              className="relative w-full overflow-hidden flex flex-col justify-center px-4 sm:px-6"
              style={{
                minHeight: `${bannerHeights.ultrawide}px`,
                background:
                  "radial-gradient(ellipse at center, #1e1b4b 0%, #030712 100%)",
              }}
            >
              {/* 1440px Centered Media with feathered edge mask */}
              {currentPreviewImage ? (
                <div
                  className="absolute inset-0 w-full h-full"
                  style={{
                    maxWidth: "1440px",
                    margin: "0 auto",
                    maskImage:
                      "linear-gradient(to right, transparent 0%, black 7%, black 93%, transparent 100%)",
                    WebkitMaskImage:
                      "linear-gradient(to right, transparent 0%, black 7%, black 93%, transparent 100%)",
                  }}
                >
                  <img
                    src={currentPreviewImage}
                    alt=""
                    className="w-full h-full object-cover"
                    style={{
                      objectPosition: `${focalPoint.x}% ${focalPoint.y}%`,
                    }}
                  />
                </div>
              ) : (
                <div
                  className="absolute inset-0 w-full h-full bg-muted/40"
                  style={{ maxWidth: "1440px", margin: "0 auto" }}
                />
              )}

              {/* Gradient Overlay */}
              <BannerGradientOverlay bgGradient={bgGradient} />

              {/* Banner Text Content using extracted component */}
              <AnnouncementBannerContent
                title={title}
                subtitle={subtitle}
                badgeText={badgeText}
                ctaLabel={ctaLabel}
                layoutStack={layoutStack}
                layoutAlign={layoutAlign}
                layoutValign={layoutValign}
                layoutCta={layoutCta}
                layoutMaxWidth={layoutMaxWidth}
                containerMaxWidth="1440px"
              />
            </div>
          </div>
        </div>
      ) : (
        /* Standard Viewport Preview (Mobile, Tablet, Desktop) */
        <div
          className={cn(
            "w-full mx-auto relative overflow-hidden rounded-lg border border-border/80 transition-all duration-300 shadow-md",
            previewViewport === "mobile" && "max-w-[420px]",
            previewViewport === "tablet" && "max-w-[768px]",
            previewViewport === "desktop" && "max-w-full",
          )}
        >
          {/* Simulated Browser Header */}
          <div className="bg-muted/80 px-3 py-1.5 border-b border-border flex items-center justify-between text-[11px] text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-red-400 inline-block" />
              <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />
              <span className="w-2 h-2 rounded-full bg-green-400 inline-block" />
              <span className="ml-2 font-mono text-[10px]">
                radheshyamdas.com ({previewViewport} viewport)
              </span>
            </div>
            <span className="text-[10px] font-mono text-primary font-bold">
              Height: {activeHeight}px
            </span>
          </div>

          {/* Viewport Scroll Wrapper for Mobile/Tablet */}
          <div className="w-full overflow-x-auto">
            {/* Banner Container */}
            {/* biome-ignore lint/a11y/noStaticElementInteractions: visual focal point picker requires mouse coordinates */}
            {/* biome-ignore lint/a11y/useKeyWithClickEvents: visual focal point picker requires mouse coordinates */}
            <div
              className="relative w-full overflow-hidden flex flex-col justify-center px-4 sm:px-6 cursor-crosshair group"
              style={{
                minHeight: `${activeHeight}px`,
                background:
                  "radial-gradient(ellipse at center, #1e1b4b 0%, #030712 100%)",
              }}
              onClick={(e) => {
                if (!showFocalReticle) return;
                const rect = e.currentTarget.getBoundingClientRect();
                const clickX = Math.round(
                  ((e.clientX - rect.left) / rect.width) * 100,
                );
                const clickY = Math.round(
                  ((e.clientY - rect.top) / rect.height) * 100,
                );
                onFocalPointChange({
                  x: Math.max(0, Math.min(100, clickX)),
                  y: Math.max(0, Math.min(100, clickY)),
                });
                toast.success(`Focal point pinned to (${clickX}%, ${clickY}%)`);
              }}
            >
              {/* Background Image Layer */}
              {currentPreviewImage ? (
                <img
                  src={currentPreviewImage}
                  alt=""
                  className="absolute inset-0 w-full h-full object-cover select-none pointer-events-none transition-all duration-300"
                  style={{
                    objectPosition: `${focalPoint.x}% ${focalPoint.y}%`,
                  }}
                />
              ) : (
                <div className="absolute inset-0 bg-muted/40 flex items-center justify-center pointer-events-none">
                  <span className="text-xs text-muted-foreground italic">
                    No Artwork Assigned Yet
                  </span>
                </div>
              )}

              {/* Particle Overlay Theme Simulation */}
              {overlayTheme !== "none" && (
                <div className="absolute inset-0 pointer-events-none overflow-hidden select-none">
                  {overlayTheme === "pushpa_vrishti" && (
                    <div className="absolute inset-0 bg-[radial-gradient(#f43f5e_1px,transparent_1px)] [background-size:20px_20px] opacity-35 animate-pulse" />
                  )}
                  {overlayTheme === "deepotsava" && (
                    <div className="absolute inset-0 bg-[radial-gradient(#f59e0b_1.5px,transparent_1.5px)] [background-size:24px_24px] opacity-40 animate-pulse" />
                  )}
                  {overlayTheme === "celestial_dust" && (
                    <div className="absolute inset-0 bg-[radial-gradient(#fbbf24_1px,transparent_1px)] [background-size:14px_14px] opacity-50" />
                  )}
                </div>
              )}

              {/* Interactive Focal Point Reticle Overlay */}
              {showFocalReticle && (
                <div className="absolute inset-0 pointer-events-none z-30">
                  {/* Horizontal guide line */}
                  <div
                    className="absolute left-0 right-0 border-t border-amber-400/60 border-dashed"
                    style={{ top: `${focalPoint.y}%` }}
                  />
                  {/* Vertical guide line */}
                  <div
                    className="absolute top-0 bottom-0 border-l border-amber-400/60 border-dashed"
                    style={{ left: `${focalPoint.x}%` }}
                  />
                  {/* Target Circle */}
                  <div
                    className="absolute w-6 h-6 -ml-3 -mt-3 rounded-full border-2 border-amber-400 bg-amber-400/20 shadow-md flex items-center justify-center animate-pulse"
                    style={{
                      left: `${focalPoint.x}%`,
                      top: `${focalPoint.y}%`,
                    }}
                  >
                    <div className="w-1.5 h-1.5 rounded-full bg-amber-300" />
                  </div>
                  {/* Coordinate Label */}
                  <div
                    className="absolute font-mono text-[9px] font-bold text-amber-300 bg-black/80 px-1.5 py-0.5 rounded shadow-md pointer-events-none -translate-x-1/2"
                    style={{
                      left: `${focalPoint.x}%`,
                      top: `${Math.min(85, focalPoint.y + 12)}%`,
                    }}
                  >
                    {focalPoint.x}%, {focalPoint.y}%
                  </div>
                </div>
              )}

              {/* Gradient Overlay */}
              <BannerGradientOverlay bgGradient={bgGradient} />

              {/* Dynamic Additive Elements & Motion Layers */}
              <BannerElementRenderer
                elements={elements}
                replayTrigger={replayTrigger}
              />

              {/* Banner Text Content using extracted component */}
              <AnnouncementBannerContent
                title={title}
                subtitle={subtitle}
                badgeText={badgeText}
                ctaLabel={ctaLabel}
                layoutStack={layoutStack}
                layoutAlign={layoutAlign}
                layoutValign={layoutValign}
                layoutCta={layoutCta}
                layoutMaxWidth={layoutMaxWidth}
                containerMaxWidth="1440px"
                containerMinWidth={
                  previewViewport === "mobile" ? "320px" : undefined
                }
              />

              {/* Floating Greeting Pill */}
              {floatingGreetingEnabled && (
                <div
                  className="absolute right-3 top-2.5 z-20 hidden sm:flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-black/60 backdrop-blur-md border border-white/20 text-white shadow-lg pointer-events-none animate-bounce"
                  style={{ animationDuration: "3s" }}
                >
                  <span className="text-xs">{floatingGreetingIcon}</span>
                  <span className="text-[11px] font-semibold text-amber-200 tracking-wide">
                    {floatingGreetingText || "राधे राधे"}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
