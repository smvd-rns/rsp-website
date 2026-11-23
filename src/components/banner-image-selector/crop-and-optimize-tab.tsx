"use client";

import { useQueryClient } from "@tanstack/react-query";
import {
  CheckCircle2,
  Info,
  Layers,
  Loader2,
  Monitor,
  Save,
  Smartphone,
  Upload,
  Wand2,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { Area, Point } from "react-easy-crop";
import {
  prepareBannerImageUpload,
  saveBannerImageDriveIds,
  uploadBannerMediaFile,
} from "@/app/actions/homepage-actions";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  BANNER_DESKTOP_HEIGHT,
  BANNER_DESKTOP_WIDTH,
  BANNER_MOBILE_HEIGHT,
  BANNER_MOBILE_WIDTH,
  STORE,
} from "@/constants";
import { BANNER_IMAGES_QUERY_KEY } from "@/hooks/use-banner-images";
import { uploadImageToDrive } from "@/lib/drive-upload";
import {
  type BannerAssets,
  type CanvasExtensionAlignment,
  type CanvasExtensionMode,
  createExtendedCanvasImage,
  generateBannerAssets,
  getCroppedImg,
  type PixelCrop,
} from "@/lib/image-utils";
import { toast } from "@/lib/toast";
import { cleanFilenameToTitle, triggerSync } from "@/lib/utils";
import { CropCard } from "./crop-card";

export interface AspectRatioOption {
  label: string;
  ratio: number | undefined;
  width: number;
  height: number;
}

export const DESKTOP_ASPECT_PRESETS: AspectRatioOption[] = [
  {
    label: "16:1 (Default Ultra-Wide)",
    ratio: 16 / 1,
    width: 1440,
    height: 90,
  },
  { label: "12:1 (Wide Strip)", ratio: 12 / 1, width: 1440, height: 120 },
  { label: "8:1 (Medium Banner)", ratio: 8 / 1, width: 1440, height: 180 },
  { label: "6:1 (Tall Ribbon)", ratio: 6 / 1, width: 1440, height: 240 },
  { label: "4:1 (Showcase)", ratio: 4 / 1, width: 1440, height: 360 },
  { label: "Freeform / Custom", ratio: undefined, width: 1440, height: 90 },
];

export const MOBILE_ASPECT_PRESETS: AspectRatioOption[] = [
  { label: "6:1 (Default Compact)", ratio: 6 / 1, width: 768, height: 128 },
  { label: "4:1 (Standard)", ratio: 4 / 1, width: 768, height: 192 },
  { label: "3:1 (Prominent Card)", ratio: 3 / 1, width: 768, height: 256 },
  { label: "2:1 (Bold Hero)", ratio: 2 / 1, width: 768, height: 384 },
  { label: "16:9 (Video Frame)", ratio: 16 / 9, width: 768, height: 432 },
  { label: "Freeform / Custom", ratio: undefined, width: 768, height: 128 },
];

interface CropAndOptimizeTabProps {
  onSuccess: (bannerImageId: number) => void;
  bannerHeight?: number;
  focalPoint?: { x: number; y: number };
  onPreviewUpdate?: (
    previewUrl: string | null,
    variant?: "desktop" | "mobile",
  ) => void;
}

export const CropAndOptimizeTab = ({
  onSuccess,
  bannerHeight = 56,
  focalPoint,
  onPreviewUpdate,
}: CropAndOptimizeTabProps) => {
  const queryClient = useQueryClient();

  // Source files & images
  const [, setSelectedFile] = useState<File | null>(null);
  const [rawDesktopSrc, setRawDesktopSrc] = useState<string | null>(null);
  const [rawMobileSrc, setRawMobileSrc] = useState<string | null>(null);
  const [desktopImageSrc, setDesktopImageSrc] = useState<string | null>(null);
  const [mobileImageSrc, setMobileImageSrc] = useState<string | null>(null);
  const [useSeparateMobile, setUseSeparateMobile] = useState(false);
  const [description, setDescription] = useState("");
  const [skipCrop, setSkipCrop] = useState(false);

  // Aspect Ratio Presets State
  const [desktopAspectKey, setDesktopAspectKey] = useState(
    "16:1 (Default Ultra-Wide)",
  );
  const [desktopAspect, setDesktopAspect] = useState<number | undefined>(
    16 / 1,
  );
  const [desktopTargetDims, setDesktopTargetDims] = useState({
    width: BANNER_DESKTOP_WIDTH,
    height: BANNER_DESKTOP_HEIGHT,
  });

  const [mobileAspectKey, setMobileAspectKey] = useState(
    "6:1 (Default Compact)",
  );
  const [mobileAspect, setMobileAspect] = useState<number | undefined>(6 / 1);
  const [mobileTargetDims, setMobileTargetDims] = useState({
    width: BANNER_MOBILE_WIDTH,
    height: BANNER_MOBILE_HEIGHT,
  });

  // Canvas Extension Settings (Fit to aspect without severe cropping)
  const [extensionMode, setExtensionMode] =
    useState<CanvasExtensionMode>("direct");
  const [extensionAlignment, setExtensionAlignment] =
    useState<CanvasExtensionAlignment>("center");

  // Desktop Crop states
  const [desktopCrop, setDesktopCrop] = useState<Point>({ x: 0, y: 0 });
  const [desktopZoom, setDesktopZoom] = useState(1);
  const [desktopRotation, setDesktopRotation] = useState(0);
  const [desktopAreaPixels, setDesktopAreaPixels] = useState<Area | null>(null);
  const [desktopAreaPercentage, setDesktopAreaPercentage] =
    useState<Area | null>(null);

  // Mobile Crop states
  const [mobileCrop, setMobileCrop] = useState<Point>({ x: 0, y: 0 });
  const [mobileZoom, setMobileZoom] = useState(1);
  const [mobileRotation, setMobileRotation] = useState(0);
  const [mobileAreaPixels, setMobileAreaPixels] = useState<Area | null>(null);
  const [mobileAreaPercentage, setMobileAreaPercentage] = useState<Area | null>(
    null,
  );

  // Safe Zone Visibility Toggle (allows disabling if distracting during cropping)
  const [showSafeZone, setShowSafeZone] = useState(false);

  // Scroll to Zoom & Pinch Toggle (defaults to false to prevent accidental zooming while scrolling page)
  const [zoomWithScroll, setZoomWithScroll] = useState(false);

  // Real-time canvas size calculation
  const [desktopCanvasSize, setDesktopCanvasSize] = useState<number | null>(
    null,
  );
  const [mobileCanvasSize, setMobileCanvasSize] = useState<number | null>(null);

  // Natural image dimensions for skipCrop
  const [naturalDimensions, setNaturalDimensions] = useState<{
    width: number;
    height: number;
  }>({ width: 1440, height: 90 });

  // Optimized assets state
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [optimizedAssets, setOptimizedAssets] = useState<BannerAssets | null>(
    null,
  );
  const [isSaving, setIsSaving] = useState(false);

  // Preview object URL refs for clean memory lifecycle
  const prevDesktopUrlRef = useRef<string | null>(null);
  const prevMobileUrlRef = useRef<string | null>(null);

  useEffect(() => {
    return () => {
      if (prevDesktopUrlRef.current) {
        URL.revokeObjectURL(prevDesktopUrlRef.current);
      }
      if (prevMobileUrlRef.current) {
        URL.revokeObjectURL(prevMobileUrlRef.current);
      }
    };
  }, []);

  // Re-run extension processing when extension mode or alignment changes
  useEffect(() => {
    // Helper to re-process image extension when mode, alignment, or aspect changes
    const processExtension = async (
      rawDesktop: string | null,
      rawMobile: string | null,
      mode: CanvasExtensionMode,
      align: CanvasExtensionAlignment,
      dRatio?: number,
      mRatio?: number,
    ) => {
      if (rawDesktop) {
        const dTargetRatio = dRatio ?? desktopAspect ?? 16 / 1;
        const extD = await createExtendedCanvasImage(
          rawDesktop,
          dTargetRatio,
          mode,
          align,
        );
        setDesktopImageSrc(extD);
        if (!useSeparateMobile && !rawMobile) {
          const mTargetRatio = mRatio ?? mobileAspect ?? 6 / 1;
          const extM = await createExtendedCanvasImage(
            rawDesktop,
            mTargetRatio,
            mode,
            align,
          );
          setMobileImageSrc(extM);
        }
      }
      if (rawMobile) {
        const mTargetRatio = mRatio ?? mobileAspect ?? 6 / 1;
        const extM = await createExtendedCanvasImage(
          rawMobile,
          mTargetRatio,
          mode,
          align,
        );
        setMobileImageSrc(extM);
      }
    };
    if (rawDesktopSrc) {
      processExtension(
        rawDesktopSrc,
        rawMobileSrc,
        extensionMode,
        extensionAlignment,
        desktopAspect,
        mobileAspect,
      );
    }
  }, [
    extensionMode,
    extensionAlignment,
    mobileAspect,
    rawMobileSrc,
    rawDesktopSrc,
    desktopAspect,
    useSeparateMobile,
  ]);

  // Track previous crop pixel bounds to avoid regenerating blobs if area hasn't actually changed
  const prevDesktopPixelsRef = useRef<string | null>(null);
  const prevMobilePixelsRef = useRef<string | null>(null);

  // Debounced desktop crop size & live preview update (300ms)
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    if (desktopImageSrc && desktopAreaPixels && !skipCrop) {
      const areaKey = `${desktopAreaPixels.x},${desktopAreaPixels.y},${desktopAreaPixels.width},${desktopAreaPixels.height},${desktopRotation},${desktopTargetDims.width},${desktopTargetDims.height}`;
      if (prevDesktopPixelsRef.current === areaKey) {
        return;
      }
      timeoutId = setTimeout(async () => {
        try {
          const blob = await getCroppedImg(
            desktopImageSrc,
            desktopAreaPixels,
            desktopRotation,
            { horizontal: false, vertical: false },
            desktopTargetDims.width,
            desktopTargetDims.height,
          );
          if (blob) {
            prevDesktopPixelsRef.current = areaKey;
            setDesktopCanvasSize(blob.size);
            const previewUrl = URL.createObjectURL(blob);
            if (prevDesktopUrlRef.current) {
              URL.revokeObjectURL(prevDesktopUrlRef.current);
            }
            prevDesktopUrlRef.current = previewUrl;
            if (onPreviewUpdate) {
              onPreviewUpdate(previewUrl, "desktop");
            }
          }
        } catch (e) {
          console.error("Desktop crop preview error", e);
        }
      }, 300);
    }
    return () => clearTimeout(timeoutId);
  }, [
    desktopImageSrc,
    desktopAreaPixels,
    desktopRotation,
    desktopTargetDims,
    skipCrop,
    onPreviewUpdate,
  ]);

  // Debounced mobile crop size & live preview update (300ms)
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    const src = mobileImageSrc || desktopImageSrc;
    if (src && mobileAreaPixels && !skipCrop) {
      const areaKey = `${mobileAreaPixels.x},${mobileAreaPixels.y},${mobileAreaPixels.width},${mobileAreaPixels.height},${mobileRotation},${mobileTargetDims.width},${mobileTargetDims.height}`;
      if (prevMobilePixelsRef.current === areaKey) {
        return;
      }
      timeoutId = setTimeout(async () => {
        try {
          const blob = await getCroppedImg(
            src,
            mobileAreaPixels,
            mobileRotation,
            { horizontal: false, vertical: false },
            mobileTargetDims.width,
            mobileTargetDims.height,
          );
          if (blob) {
            prevMobilePixelsRef.current = areaKey;
            setMobileCanvasSize(blob.size);
            const previewUrl = URL.createObjectURL(blob);
            if (prevMobileUrlRef.current) {
              URL.revokeObjectURL(prevMobileUrlRef.current);
            }
            prevMobileUrlRef.current = previewUrl;
            if (onPreviewUpdate) {
              onPreviewUpdate(previewUrl, "mobile");
            }
          }
        } catch (e) {
          console.error("Mobile crop preview error", e);
        }
      }, 300);
    }
    return () => clearTimeout(timeoutId);
  }, [
    mobileImageSrc,
    desktopImageSrc,
    mobileAreaPixels,
    mobileRotation,
    mobileTargetDims,
    skipCrop,
    onPreviewUpdate,
  ]);

  // Immediate sync when skipCrop is enabled
  useEffect(() => {
    if (skipCrop && desktopImageSrc) {
      setDesktopCanvasSize(null);
      setMobileCanvasSize(null);
      if (onPreviewUpdate) {
        onPreviewUpdate(desktopImageSrc, "desktop");
        onPreviewUpdate(mobileImageSrc || desktopImageSrc, "mobile");
      }
    }
  }, [skipCrop, desktopImageSrc, mobileImageSrc, onPreviewUpdate]);

  // Cleanup object URLs on unmount
  useEffect(() => {
    return () => {
      if (prevDesktopUrlRef.current) {
        URL.revokeObjectURL(prevDesktopUrlRef.current);
      }
      if (prevMobileUrlRef.current) {
        URL.revokeObjectURL(prevMobileUrlRef.current);
      }
    };
  }, []);

  // Invalidate previous optimization results when crop coordinates change
  // biome-ignore lint/correctness/useExhaustiveDependencies: Invalidate optimizations on crop change
  useEffect(() => {
    setOptimizedAssets(null);
  }, [
    desktopCrop,
    desktopZoom,
    desktopRotation,
    desktopAspect,
    mobileCrop,
    mobileZoom,
    mobileRotation,
    mobileAspect,
    extensionMode,
    extensionAlignment,
    skipCrop,
  ]);

  const handleDesktopFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedFile(file);
    if (!description) setDescription(cleanFilenameToTitle(file.name));
    const reader = new FileReader();
    reader.onload = async () => {
      const src = reader.result as string;
      setRawDesktopSrc(src);

      // Apply initial canvas extension if active
      const dTargetRatio = desktopAspect ?? 16 / 1;
      const extD = await createExtendedCanvasImage(
        src,
        dTargetRatio,
        extensionMode,
        extensionAlignment,
      );
      setDesktopImageSrc(extD);

      if (!useSeparateMobile) {
        const mTargetRatio = mobileAspect ?? 6 / 1;
        const extM = await createExtendedCanvasImage(
          src,
          mTargetRatio,
          extensionMode,
          extensionAlignment,
        );
        setMobileImageSrc(extM);
      }

      if (onPreviewUpdate) {
        onPreviewUpdate(extD);
      }

      // Load natural dimensions
      const img = new Image();
      img.onload = () => {
        setNaturalDimensions({
          width: img.naturalWidth,
          height: img.naturalHeight,
        });
      };
      img.src = src;
    };
    reader.readAsDataURL(file);
  };

  const handleResetImage = () => {
    if (prevDesktopUrlRef.current) {
      URL.revokeObjectURL(prevDesktopUrlRef.current);
      prevDesktopUrlRef.current = null;
    }
    if (prevMobileUrlRef.current) {
      URL.revokeObjectURL(prevMobileUrlRef.current);
      prevMobileUrlRef.current = null;
    }
    setSelectedFile(null);
    setRawDesktopSrc(null);
    setRawMobileSrc(null);
    setDesktopImageSrc(null);
    setMobileImageSrc(null);
    setOptimizedAssets(null);
    setDesktopCanvasSize(null);
    setMobileCanvasSize(null);
    if (onPreviewUpdate) {
      onPreviewUpdate(null);
    }
  };

  const handleMobileFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      const src = reader.result as string;
      setRawMobileSrc(src);
      const mTargetRatio = mobileAspect ?? 6 / 1;
      const extM = await createExtendedCanvasImage(
        src,
        mTargetRatio,
        extensionMode,
        extensionAlignment,
      );
      setMobileImageSrc(extM);
    };
    reader.readAsDataURL(file);
  };

  const handleDesktopAspectSelect = async (val: string) => {
    setDesktopAspectKey(val);
    const opt = DESKTOP_ASPECT_PRESETS.find((p) => p.label === val);
    if (opt) {
      setDesktopAspect(opt.ratio);
      setDesktopTargetDims({ width: opt.width, height: opt.height });
      if (rawDesktopSrc) {
        const extD = await createExtendedCanvasImage(
          rawDesktopSrc,
          opt.ratio ?? 16 / 1,
          extensionMode,
          extensionAlignment,
        );
        setDesktopImageSrc(extD);
      }
    }
  };

  const handleMobileAspectSelect = async (val: string) => {
    setMobileAspectKey(val);
    const opt = MOBILE_ASPECT_PRESETS.find((p) => p.label === val);
    if (opt) {
      setMobileAspect(opt.ratio);
      setMobileTargetDims({ width: opt.width, height: opt.height });
      const srcToUse = rawMobileSrc || rawDesktopSrc;
      if (srcToUse) {
        const extM = await createExtendedCanvasImage(
          srcToUse,
          opt.ratio ?? 6 / 1,
          extensionMode,
          extensionAlignment,
        );
        setMobileImageSrc(extM);
      }
    }
  };

  const handleOptimizeAndProcess = async () => {
    if (!desktopImageSrc) {
      toast.error("Please upload an image first.");
      return;
    }

    setIsOptimizing(true);
    try {
      let dCrop: PixelCrop;
      let mCrop: PixelCrop;

      if (skipCrop) {
        dCrop = {
          x: 0,
          y: 0,
          width: naturalDimensions.width,
          height: naturalDimensions.height,
        };
        mCrop = {
          x: 0,
          y: 0,
          width: naturalDimensions.width,
          height: naturalDimensions.height,
        };
      } else {
        dCrop = desktopAreaPixels || {
          x: 0,
          y: 0,
          width: desktopTargetDims.width,
          height: desktopTargetDims.height,
        };
        mCrop = mobileAreaPixels || {
          x: 0,
          y: 0,
          width: mobileTargetDims.width,
          height: mobileTargetDims.height,
        };
      }

      const assets = await generateBannerAssets(
        desktopImageSrc,
        dCrop,
        mobileImageSrc || desktopImageSrc,
        mCrop,
        {
          desktopWidth: desktopTargetDims.width,
          desktopHeight: desktopTargetDims.height,
          mobileWidth: mobileTargetDims.width,
          mobileHeight: mobileTargetDims.height,
        },
      );

      if (!assets) {
        throw new Error("WASM optimization failed to produce output files.");
      }

      setOptimizedAssets(assets);
      toast.success("Optimization complete! Ready to save to library.");
    } catch (err) {
      console.error("Banner optimization error:", err);
      toast.error(err instanceof Error ? err.message : "Optimization failed");
    } finally {
      setIsOptimizing(false);
    }
  };

  const handleSaveToLibrary = async () => {
    if (!optimizedAssets) {
      toast.error("Please run the WASM optimization first.");
      return;
    }
    if (!description.trim()) {
      toast.error("Please provide a description for the banner image.");
      return;
    }

    setIsSaving(true);
    try {
      // 1. Prepare record in banner_images table
      const prepRes = await prepareBannerImageUpload(description.trim());
      if (!prepRes.success || !prepRes.id) {
        throw new Error(
          prepRes.error || "Failed to create banner image record",
        );
      }
      const bannerId = prepRes.id;
      const bnrCode = bannerId.toString(36);

      // 2. Upload all 4 variants to Supabase storage and Google Drive in parallel
      const fdDW = new FormData();
      fdDW.append("file", optimizedAssets.desktopWebp);

      const fdDA = new FormData();
      fdDA.append("file", optimizedAssets.desktopAvif);

      const fdMW = new FormData();
      fdMW.append("file", optimizedAssets.mobileWebp);

      const fdMA = new FormData();
      fdMA.append("file", optimizedAssets.mobileAvif);

      const [
        resDW,
        resDA,
        resMW,
        resMA,
        driveDWId,
        driveDAId,
        driveMWId,
        driveMAId,
      ] = await Promise.all([
        uploadBannerMediaFile(`bnr-${bnrCode}-d.webp`, fdDW),
        uploadBannerMediaFile(`bnr-${bnrCode}-d.avif`, fdDA),
        uploadBannerMediaFile(`bnr-${bnrCode}-m.webp`, fdMW),
        uploadBannerMediaFile(`bnr-${bnrCode}-m.avif`, fdMA),
        uploadImageToDrive(
          optimizedAssets.desktopWebp,
          `bnr-${bnrCode}-d.webp`,
          "image/webp",
        ),
        uploadImageToDrive(
          optimizedAssets.desktopAvif,
          `bnr-${bnrCode}-d.avif`,
          "image/avif",
        ),
        uploadImageToDrive(
          optimizedAssets.mobileWebp,
          `bnr-${bnrCode}-m.webp`,
          "image/webp",
        ),
        uploadImageToDrive(
          optimizedAssets.mobileAvif,
          `bnr-${bnrCode}-m.avif`,
          "image/avif",
        ),
      ]);

      if (!resDW.success)
        throw new Error(resDW.error || "Failed to upload desktop WebP");
      if (!resDA.success)
        throw new Error(resDA.error || "Failed to upload desktop AVIF");
      if (!resMW.success)
        throw new Error(resMW.error || "Failed to upload mobile WebP");
      if (!resMA.success)
        throw new Error(resMA.error || "Failed to upload mobile AVIF");

      await saveBannerImageDriveIds(bannerId, {
        desktop_webp: driveDWId,
        desktop_avif: driveDAId,
        mobile_webp: driveMWId,
        mobile_avif: driveMAId,
      });

      toast.success("Banner artwork saved to library & assigned!");
      await triggerSync([STORE.BANNER_IMAGES]);
      queryClient.invalidateQueries({ queryKey: BANNER_IMAGES_QUERY_KEY });

      onSuccess(bannerId);
    } catch (err) {
      console.error("Save banner image error:", err);
      toast.error(
        err instanceof Error ? err.message : "Failed to save banner image",
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-3">
      {/* Step 1: Upload / Source Selection */}
      {!desktopImageSrc ? (
        <div className="p-5 border-2 border-dashed border-border rounded-xl text-center space-y-2 bg-muted/20">
          <div className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto">
            <Upload className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-foreground">
              Select Banner Artwork
            </h4>
            <p className="text-[11px] text-muted-foreground">
              Landscape artwork or photo (PNG, JPEG, WebP)
            </p>
          </div>
          <Input
            type="file"
            accept="image/*"
            onChange={handleDesktopFileChange}
            className="max-w-xs mx-auto text-xs cursor-pointer"
          />
        </div>
      ) : (
        <div className="space-y-3">
          {/* Header Controls Bar */}
          <div className="flex flex-wrap items-center justify-end gap-2 p-2 -mt-11 mr-4">
            <div className="flex items-center gap-3">
              {/* Skip Crop Toggle */}
              <div className="flex items-center space-x-1.5">
                <Checkbox
                  id="b-skip-crop"
                  checked={skipCrop}
                  onCheckedChange={(c) => setSkipCrop(!!c)}
                />
                <Label
                  htmlFor="b-skip-crop"
                  className="text-xs font-medium cursor-pointer"
                >
                  Skip Crop (Full image)
                </Label>
              </div>

              {/* Upload Separate Mobile Toggle */}
              {!skipCrop && (
                <div className="flex items-center space-x-1.5">
                  <Checkbox
                    id="b-custom-mobile"
                    checked={useSeparateMobile}
                    onCheckedChange={(c) => setUseSeparateMobile(!!c)}
                  />
                  <Label
                    htmlFor="b-custom-mobile"
                    className="text-xs font-medium cursor-pointer"
                  >
                    Separate mobile
                  </Label>
                </div>
              )}

              {/* Change / Replace Image Button */}
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-7 text-xs px-2 cursor-pointer text-muted-foreground hover:text-foreground"
                onClick={handleResetImage}
              >
                Change Image
              </Button>
            </div>
          </div>

          {/* STEP 2: Side-by-Side Croppers (Or Skip Crop View) */}
          {skipCrop ? (
            <div className="p-3 rounded-xl border border-border/80 bg-card space-y-2">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Info className="w-3.5 h-3.5 text-primary shrink-0" />
                <span>
                  Cropping bypassed. Image encoded as-is to WebP and AVIF.
                </span>
              </div>
              <div className="relative w-full max-h-48 rounded-lg overflow-hidden border bg-black/40 flex items-center justify-center p-2">
                <img
                  src={desktopImageSrc}
                  alt=""
                  className="max-h-44 max-w-full object-contain"
                />
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Canvas Fit & Background Extension Bar */}
              <div className="p-2.5 rounded-lg border border-border/80 bg-muted/30 flex flex-wrap items-center justify-between gap-2.5 text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-foreground flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-primary" />
                    Canvas Fit Extension:
                  </span>
                  <div className="flex items-center gap-1">
                    {(
                      [
                        { key: "direct", label: "Direct Crop" },
                        { key: "blurred", label: "Blurred Glow" },
                        { key: "black", label: "Solid Black" },
                        { key: "white", label: "Solid White" },
                      ] as const
                    ).map((m) => (
                      <Button
                        key={m.key}
                        type="button"
                        size="sm"
                        variant={
                          extensionMode === m.key ? "default" : "outline"
                        }
                        className="h-6 px-2 text-[11px] cursor-pointer"
                        onClick={() => setExtensionMode(m.key)}
                      >
                        {m.label}
                      </Button>
                    ))}
                  </div>
                </div>

                {extensionMode !== "direct" && (
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] text-muted-foreground font-medium">
                      Subject Alignment:
                    </span>
                    <div className="flex items-center gap-1">
                      {(
                        [
                          { key: "left", label: "Left" },
                          { key: "center", label: "Center" },
                          { key: "right", label: "Right" },
                        ] as const
                      ).map((a) => (
                        <Button
                          key={a.key}
                          type="button"
                          size="sm"
                          variant={
                            extensionAlignment === a.key ? "default" : "ghost"
                          }
                          className="h-6 px-2 text-[11px] cursor-pointer"
                          onClick={() => setExtensionAlignment(a.key)}
                        >
                          {a.label}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="grid lg:grid-cols-2 gap-3">
                {/* LEFT COLUMN: Desktop Cropper */}
                <CropCard
                  title="Desktop"
                  aspectPresets={DESKTOP_ASPECT_PRESETS}
                  selectedPreset={desktopAspectKey}
                  onPresetChange={handleDesktopAspectSelect}
                  targetDims={desktopTargetDims}
                  canvasSize={desktopCanvasSize}
                  imageSrc={desktopImageSrc}
                  crop={desktopCrop}
                  zoom={desktopZoom}
                  rotation={desktopRotation}
                  aspect={desktopAspect}
                  cropAreaPercentage={desktopAreaPercentage}
                  onCropChange={setDesktopCrop}
                  onZoomChange={setDesktopZoom}
                  onRotationChange={setDesktopRotation}
                  onCropComplete={(croppedArea, croppedPixels) => {
                    setDesktopAreaPercentage(croppedArea);
                    setDesktopAreaPixels(croppedPixels);
                  }}
                  zoomWithScroll={zoomWithScroll}
                  onToggleZoomWithScroll={() =>
                    setZoomWithScroll((prev) => !prev)
                  }
                  showSafeZone={showSafeZone}
                  onToggleSafeZone={() => setShowSafeZone((prev) => !prev)}
                  bannerHeight={bannerHeight}
                  focalPoint={focalPoint}
                  onCenterCrop={() => setDesktopCrop({ x: 0, y: 0 })}
                  onResetCrop={() => {
                    setDesktopCrop({ x: 0, y: 0 });
                    setDesktopZoom(1);
                    setDesktopRotation(0);
                  }}
                  onCenterFocalPoint={
                    focalPoint
                      ? () => {
                          const offsetX = (focalPoint.x - 50) * 4;
                          const offsetY = (focalPoint.y - 50) * 4;
                          setDesktopCrop({ x: offsetX, y: offsetY });
                        }
                      : undefined
                  }
                  icon={<Monitor className="w-3.5 h-3.5 text-primary" />}
                />

                {/* RIGHT COLUMN: Mobile & Tablet Cropper */}
                <CropCard
                  title="Mobile / Tablet"
                  aspectPresets={MOBILE_ASPECT_PRESETS}
                  selectedPreset={mobileAspectKey}
                  onPresetChange={handleMobileAspectSelect}
                  targetDims={mobileTargetDims}
                  canvasSize={mobileCanvasSize}
                  imageSrc={mobileImageSrc || desktopImageSrc}
                  crop={mobileCrop}
                  zoom={mobileZoom}
                  rotation={mobileRotation}
                  aspect={mobileAspect}
                  cropAreaPercentage={mobileAreaPercentage}
                  onCropChange={setMobileCrop}
                  onZoomChange={setMobileZoom}
                  onRotationChange={setMobileRotation}
                  onCropComplete={(croppedArea, croppedPixels) => {
                    setMobileAreaPercentage(croppedArea);
                    setMobileAreaPixels(croppedPixels);
                  }}
                  zoomWithScroll={zoomWithScroll}
                  onToggleZoomWithScroll={() =>
                    setZoomWithScroll((prev) => !prev)
                  }
                  showSafeZone={showSafeZone}
                  onToggleSafeZone={() => setShowSafeZone((prev) => !prev)}
                  bannerHeight={bannerHeight}
                  focalPoint={focalPoint}
                  onCenterCrop={() => setMobileCrop({ x: 0, y: 0 })}
                  onResetCrop={() => {
                    setMobileCrop({ x: 0, y: 0 });
                    setMobileZoom(1);
                    setMobileRotation(0);
                  }}
                  onCenterFocalPoint={
                    focalPoint
                      ? () => {
                          const offsetX = (focalPoint.x - 50) * 4;
                          const offsetY = (focalPoint.y - 50) * 4;
                          setMobileCrop({ x: offsetX, y: offsetY });
                        }
                      : undefined
                  }
                  icon={<Smartphone className="w-3.5 h-3.5 text-primary" />}
                  headerExtra={
                    useSeparateMobile ? (
                      <div className="p-1.5 border rounded-md bg-muted/40 flex items-center justify-between text-xs gap-2">
                        <Label className="text-[11px] font-medium shrink-0">
                          Mobile Artwork File:
                        </Label>
                        <Input
                          type="file"
                          accept="image/*"
                          onChange={handleMobileFileChange}
                          className="text-xs h-7 py-0.5"
                        />
                      </div>
                    ) : undefined
                  }
                />
              </div>
            </div>
          )}

          {/* STEP 3: Bottom Controls & Optimization Strip */}
          <div className="p-3 rounded-xl border border-border bg-muted/20 space-y-3">
            <div className="grid sm:grid-cols-12 gap-3 items-end">
              <div className="sm:col-span-8 space-y-1">
                <Label htmlFor="b-img-desc" className="text-xs font-semibold">
                  Artwork Title / Description (for Library)
                </Label>
                <Input
                  id="b-img-desc"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g. Sri Radha Ashtami 2026 Vrindavan Garden"
                  className="text-xs"
                />
              </div>

              <div className="sm:col-span-4 flex items-center gap-2">
                {!optimizedAssets ? (
                  <Button
                    type="button"
                    onClick={handleOptimizeAndProcess}
                    disabled={isOptimizing}
                    className="w-full text-xs h-9 cursor-pointer"
                  >
                    {isOptimizing ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                        Optimizing...
                      </>
                    ) : (
                      <>
                        <Wand2 className="w-3.5 h-3.5 mr-1.5 text-primary" />
                        Optimize Variants
                      </>
                    )}
                  </Button>
                ) : (
                  <Button
                    type="button"
                    onClick={handleSaveToLibrary}
                    disabled={isSaving}
                    className="w-full text-xs h-9 cursor-pointer bg-green-600 hover:bg-green-700 text-white"
                  >
                    {isSaving ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="w-3.5 h-3.5 mr-1.5" />
                        Save & Assign
                      </>
                    )}
                  </Button>
                )}
              </div>
            </div>

            {optimizedAssets && (
              <div className="flex items-center gap-2 text-xs text-green-600 font-medium">
                <CheckCircle2 className="w-4 h-4" />
                <span>
                  All 4 WebP/AVIF variants generated! Click "Save & Assign" to
                  add to banner.
                </span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
