"use client";

import {
  AlertCircle,
  AlignCenter,
  AlignLeft,
  AlignRight,
  AlignVerticalJustifyCenter,
  AlignVerticalJustifyEnd,
  AlignVerticalJustifyStart,
  ArrowDown,
  ArrowLeft,
  Calendar,
  Check,
  Columns,
  CornerDownRight,
  Crosshair,
  Image as ImageIcon,
  Loader2,
  Palette,
  PanelRight,
  Save,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import {
  createAnnouncement,
  updateAnnouncement,
  uploadBannerMediaFile,
} from "@/app/actions/homepage-actions";
import { BannerArtworkAccordion } from "@/components/banner-image-selector";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { STORE } from "@/constants";
import { useRoles } from "@/hooks/use-roles";
import type { BannerElement } from "@/lib/asset-registry";
import { getImageUrl } from "@/lib/image-utils";
import { getMotifById } from "@/lib/motif-registry";
import { toast } from "@/lib/toast";
import { cn, triggerSync } from "@/lib/utils";
import type { Announcement, ResponsiveBannerHeights } from "@/types";
import { AdditiveElementsComposer } from "./additive-elements-composer";
import { AnnouncementHeightFields } from "./announcement-height-fields";
import { AnnouncementLayoutFields } from "./announcement-layout-fields";
import { AnnouncementPreview } from "./announcement-preview";
import { AnnouncementThemeFields } from "./announcement-theme-fields";

interface AnnouncementFormProps {
  announcement?: Announcement | null;
  onSuccess?: () => void;
  isModal?: boolean;
}

const getBannerIdFromPath = (path: string | null): number | null => {
  if (!path) return null;
  if (/^\d+$/.test(path)) return Number(path);
  if (path.startsWith("bnr-")) {
    const raw = path.slice(4);
    const parsed36 = parseInt(raw, 36);
    return Number.isNaN(parsed36) ? null : parsed36;
  }
  return null;
};

const DEFAULT_HEIGHTS: ResponsiveBannerHeights = {
  mobile: 64,
  tablet: 56,
  desktop: 56,
  ultrawide: 64,
};

const GRADIENT_PRESETS = [
  { label: "None (Clean Original Artwork - Zero Overlay)", value: "none" },
  {
    label: "Dark Vignette / Text Contrast (Black)",
    value: "black_vignette",
  },
  {
    label: "Saffron / Gold (Warm Devotional)",
    value: "from-amber-600/90 via-orange-600/80 to-amber-700/90",
  },
  {
    label: "Royal Indigo (Wisdom & Reflection)",
    value: "from-indigo-700/90 via-purple-700/80 to-indigo-900/90",
  },
  {
    label: "Emerald Devotion (Vrindavan Green)",
    value: "from-emerald-700/90 via-teal-700/80 to-green-900/90",
  },
  {
    label: "Sunset Crimson (Camp Energy)",
    value: "from-rose-700/90 via-amber-600/80 to-red-800/90",
  },
  {
    label: "Night Blue (Deep Philosophy)",
    value: "from-blue-900/90 via-slate-800/90 to-blue-950/90",
  },
];

export const AnnouncementForm = ({
  announcement,
  onSuccess,
  isModal = false,
}: AnnouncementFormProps) => {
  const router = useRouter();
  const { data: roles = [] } = useRoles();
  const [isPending, startTransition] = useTransition();

  // Basic Form State
  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [badgeText, setBadgeText] = useState("");
  const [category, setCategory] = useState<
    | "event"
    | "fundraising"
    | "book_distribution"
    | "guidance_spotlight"
    | "general"
  >("event");
  const [ctaLabel, setCtaLabel] = useState("");
  const [ctaUrl, setCtaUrl] = useState("");
  const [bgGradient, setBgGradient] = useState("none");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [isAnnualRecurring, setIsAnnualRecurring] = useState(false);
  const [isActive, setIsActive] = useState(true);
  const [selectedRoles, setSelectedRoles] = useState<number[]>([1]);

  // Preview Mode State (Mobile 390px, Tablet 768px, Desktop 1280px, Ultra-Wide 1920px+)
  const [previewViewport, setPreviewViewport] = useState<
    "mobile" | "tablet" | "desktop" | "ultrawide"
  >("desktop");

  // Per-Viewport Responsive Banner Heights & Linking
  const [bannerHeights, setBannerHeights] =
    useState<ResponsiveBannerHeights>(DEFAULT_HEIGHTS);
  const [linkHeights, setLinkHeights] = useState<boolean>(true);
  const [altText, setAltText] = useState<string>("");

  const activeHeight = bannerHeights[previewViewport];

  // Live real-time preview URLs from the cropper
  const [liveDesktopPreviewSrc, setLiveDesktopPreviewSrc] = useState<
    string | null
  >(null);
  const [liveMobilePreviewSrc, setLiveMobilePreviewSrc] = useState<
    string | null
  >(null);

  // Media Settings
  const [mediaType, setMediaType] = useState<"image" | "video" | "gif">(
    "image",
  );
  const [mediaPath, setMediaPath] = useState<string | null>(null);
  const [selectedBannerImageId, setSelectedBannerImageId] = useState<
    number | null
  >(null);
  const [videoOrGifFile, setVideoOrGifFile] = useState<File | null>(null);

  // Additive Decorative Motion Elements (ui_props.elements)
  const [elements, setElements] = useState<BannerElement[]>([]);
  const [replayTrigger, setReplayTrigger] = useState(0);

  // Motifs & Overlays (ui_props)
  const [motifId, setMotifId] = useState<string>("none");
  const [_motifPlacement, setMotifPlacement] = useState<
    "badge_prefix" | "banner_right" | "floating_edge"
  >("badge_prefix");
  const [overlayTheme, setOverlayTheme] = useState<
    "none" | "pushpa_vrishti" | "deepotsava" | "celestial_dust"
  >("none");
  const [eventKey, setEventKey] = useState<string>("");
  const [floatingGreetingEnabled, setFloatingGreetingEnabled] =
    useState<boolean>(false);
  const [floatingGreetingText, setFloatingGreetingText] = useState<string>("");
  const [floatingGreetingIcon, setFloatingGreetingIcon] =
    useState<string>("🌸");
  const [floatingGreetingAction, setFloatingGreetingAction] =
    useState<string>("Learn More");
  const [videoPoster, setVideoPoster] = useState<string>("");
  const [focalPoint, setFocalPoint] = useState<{ x: number; y: number }>({
    x: 50,
    y: 50,
  });
  const [showFocalReticle, setShowFocalReticle] = useState(false);

  // Content Layout State (ui_props.layout)
  const [layoutStack, setLayoutStack] = useState<boolean>(false);
  const [layoutAlign, setLayoutAlign] = useState<"left" | "center" | "right">(
    "left",
  );
  const [layoutValign, setLayoutValign] = useState<"top" | "center" | "bottom">(
    "center",
  );
  const [layoutCta, setLayoutCta] = useState<
    "auto" | "below" | "right" | "bottom_right"
  >("auto");
  const [layoutMaxWidth, setLayoutMaxWidth] = useState<
    "sm" | "md" | "lg" | "full"
  >("full");

  // Populate state when editing existing announcement
  useEffect(() => {
    if (announcement) {
      setTitle(
        announcement.title === "Announcement" ? "" : announcement.title || "",
      );
      setSubtitle(announcement.subtitle || "");
      setBadgeText(announcement.badge_text || "");
      setCategory(announcement.category || "event");
      setCtaLabel(announcement.cta_label || "");
      setCtaUrl(announcement.cta_url || "");
      setBgGradient(announcement.bg_gradient || "none");
      setStartDate(announcement.start_date || "");
      setEndDate(announcement.end_date || "");
      setIsAnnualRecurring(announcement.is_annual_recurring ?? false);
      setIsActive(announcement.is_active ?? true);
      setSelectedRoles(
        announcement.allowed_roles && announcement.allowed_roles.length > 0
          ? announcement.allowed_roles
          : [1],
      );
      setMediaType(announcement.media_type || "image");
      setMediaPath(announcement.media_path || null);
      if (announcement.media_path) {
        setSelectedBannerImageId(getBannerIdFromPath(announcement.media_path));
      }

      if (announcement.ui_props) {
        const p = announcement.ui_props;
        if (p.banner_height) {
          if (typeof p.banner_height === "number") {
            const h = p.banner_height;
            setBannerHeights({
              mobile: Math.max(48, Math.round(h * 1.15)),
              tablet: h,
              desktop: h,
              ultrawide: Math.round(h * 1.15),
            });
          } else if (typeof p.banner_height === "object") {
            setBannerHeights({
              mobile: p.banner_height.mobile ?? DEFAULT_HEIGHTS.mobile,
              tablet: p.banner_height.tablet ?? DEFAULT_HEIGHTS.tablet,
              desktop: p.banner_height.desktop ?? DEFAULT_HEIGHTS.desktop,
              ultrawide: p.banner_height.ultrawide ?? DEFAULT_HEIGHTS.ultrawide,
            });
          }
        }
        if (p.alt_text) setAltText(p.alt_text);
        if (p.motif_id) setMotifId(p.motif_id);
        if (p.motif_placement) {
          setMotifPlacement(
            p.motif_placement === "banner_right"
              ? "banner_right"
              : "badge_prefix",
          );
        }
        if (p.overlay_theme) setOverlayTheme(p.overlay_theme);
        if (p.event_key) setEventKey(p.event_key);
        if (p.floating_greeting?.enabled) {
          setFloatingGreetingEnabled(true);
          setFloatingGreetingText(p.floating_greeting.text || "");
          setFloatingGreetingIcon(p.floating_greeting.icon || "🌸");
          setFloatingGreetingAction(p.floating_greeting.action_label || "");
        }
        if (p.video_poster) setVideoPoster(p.video_poster);
        if (p.focal_point) setFocalPoint(p.focal_point);
        if (p.layout) {
          setLayoutStack(Boolean(p.layout.stack));
          if (p.layout.align) setLayoutAlign(p.layout.align);
          if (p.layout.valign) setLayoutValign(p.layout.valign);
          if (p.layout.cta) setLayoutCta(p.layout.cta);
          if (p.layout.maxWidth) setLayoutMaxWidth(p.layout.maxWidth);
        }
        if (p.elements && Array.isArray(p.elements)) {
          setElements(p.elements);
        }
      }
    } else {
      // Defaults for brand new announcement
      setTitle("");
      setSubtitle("");
      setBadgeText("");
      setCategory("event");
      setCtaLabel("");
      setCtaUrl("");
      setBgGradient("none");
      setStartDate("");
      setEndDate("");
      setIsAnnualRecurring(false);
      setIsActive(true);
      setSelectedRoles([1]);
      setMediaType("image");
      setMediaPath(null);
      setSelectedBannerImageId(null);
      setBannerHeights(DEFAULT_HEIGHTS);
      setLinkHeights(true);
      setAltText("");
      setElements([]);
      setMotifId("none");
      setOverlayTheme("none");
      setFloatingGreetingEnabled(false);
      setLayoutStack(false);
      setLayoutAlign("left");
      setLayoutValign("center");
      setLayoutCta("auto");
      setLayoutMaxWidth("full");
    }
  }, [announcement]);

  const toggleRole = (roleId: number) => {
    setSelectedRoles((prev) =>
      prev.includes(roleId)
        ? prev.filter((r) => r !== roleId)
        : [...prev, roleId],
    );
  };

  const handleLivePreviewUpdate = (
    src: string | null,
    variant?: "desktop" | "mobile",
  ) => {
    if (!variant || variant === "desktop") {
      setLiveDesktopPreviewSrc(src);
    }
    if (!variant || variant === "mobile") {
      setLiveMobilePreviewSrc(src);
    }
  };

  const handleVideoOrGifUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setVideoOrGifFile(file);
  };

  const updateActiveHeight = (newVal: number) => {
    if (linkHeights) {
      const current = bannerHeights[previewViewport];
      const delta = newVal - current;
      setBannerHeights((prev) => ({
        mobile: Math.max(36, Math.min(160, prev.mobile + delta)),
        tablet: Math.max(36, Math.min(160, prev.tablet + delta)),
        desktop: Math.max(36, Math.min(160, prev.desktop + delta)),
        ultrawide: Math.max(36, Math.min(160, prev.ultrawide + delta)),
      }));
    } else {
      setBannerHeights((prev) => ({
        ...prev,
        [previewViewport]: newVal,
      }));
    }
  };

  const applyHeightPreset = (presetHeights: ResponsiveBannerHeights) => {
    setBannerHeights({ ...presetHeights });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedTitle = title.trim();
    const finalTitle = trimmedTitle;

    startTransition(async () => {
      try {
        let announcementId: number | undefined = announcement?.id;
        const payload = {
          title: finalTitle,
          subtitle,
          badge_text: badgeText,
          category,
          cta_label: ctaLabel,
          cta_url: ctaUrl,
          bg_gradient: bgGradient === "none" ? null : bgGradient,
          start_date: startDate || null,
          end_date: endDate || null,
          is_annual_recurring: isAnnualRecurring,
          is_active: isActive,
          allowed_roles: selectedRoles,
          media_type: mediaType,
          media_path: mediaPath,
          ui_props: {
            banner_height: bannerHeights,
            alt_text: altText.trim() || null,
            focal_point: focalPoint,
            layout:
              layoutStack ||
              layoutAlign !== "left" ||
              layoutValign !== "center" ||
              layoutCta !== "auto" ||
              layoutMaxWidth !== "full"
                ? {
                    stack: layoutStack || undefined,
                    align: layoutAlign !== "left" ? layoutAlign : undefined,
                    valign:
                      layoutValign !== "center" ? layoutValign : undefined,
                    cta: layoutCta !== "auto" ? layoutCta : undefined,
                    maxWidth:
                      layoutMaxWidth !== "full" ? layoutMaxWidth : undefined,
                  }
                : null,
            elements: elements.length > 0 ? elements : null,
            motif_id:
              elements[0]?.assetId || (motifId === "none" ? null : motifId),
            motif_placement:
              elements[0]?.placement === "float-right"
                ? ("banner_right" as const)
                : ("badge_prefix" as const),
            overlay_theme: overlayTheme,
            event_key: eventKey || null,
            floating_greeting: floatingGreetingEnabled
              ? {
                  enabled: true,
                  text: floatingGreetingText,
                  icon: floatingGreetingIcon,
                  action_label: floatingGreetingAction,
                }
              : null,
            video_poster: videoPoster || null,
          },
        };

        if (announcement) {
          const res = await updateAnnouncement(announcement.id, payload);
          if (!res.success) {
            toast.error(res.error || "Failed to update banner");
            return;
          }
        } else {
          const res = await createAnnouncement(payload);
          if (!res.success || !res.id) {
            toast.error(res.error || "Failed to create banner");
            return;
          }
          announcementId = res.id;
        }

        // If experimental video or GIF uploaded
        if (
          (mediaType === "video" || mediaType === "gif") &&
          videoOrGifFile &&
          announcementId
        ) {
          const ext =
            videoOrGifFile.name.split(".").pop() ||
            (mediaType === "video" ? "mp4" : "gif");
          const filename = `bnr-${announcementId.toString(36)}.${ext}`;
          const fd = new FormData();
          fd.append("file", videoOrGifFile);
          await uploadBannerMediaFile(filename, fd);

          await updateAnnouncement(announcementId, {
            title: finalTitle,
            media_path: filename,
            media_type: mediaType,
          });
        }

        toast.success(
          announcement
            ? "Announcement banner updated successfully"
            : "Announcement banner created successfully",
        );
        triggerSync([STORE.ANNOUNCEMENTS]);

        if (onSuccess) {
          onSuccess();
        } else {
          router.push("/homepage");
          router.refresh();
        }
      } catch (err) {
        console.error("Banner save error:", err);
        toast.error("An error occurred while saving banner");
      }
    });
  };

  const getDesktopPreviewImg = () => {
    if (liveDesktopPreviewSrc) return liveDesktopPreviewSrc;
    if (!mediaPath) return null;
    if (mediaPath.startsWith("http://") || mediaPath.startsWith("https://")) {
      return mediaPath;
    }
    if (mediaType === "image") {
      const bannerId = selectedBannerImageId ?? getBannerIdFromPath(mediaPath);
      if (bannerId) {
        return getImageUrl("bnr", bannerId, "desktop_webp");
      }
    }
    return mediaPath;
  };

  const getMobilePreviewImg = () => {
    if (liveMobilePreviewSrc) return liveMobilePreviewSrc;
    if (!mediaPath) return null;
    if (mediaPath.startsWith("http://") || mediaPath.startsWith("https://")) {
      return mediaPath;
    }
    if (mediaType === "image") {
      const bannerId = selectedBannerImageId ?? getBannerIdFromPath(mediaPath);
      if (bannerId) {
        return getImageUrl("bnr", bannerId, "mobile_webp");
      }
    }
    return mediaPath;
  };

  const currentPreviewImage =
    previewViewport === "mobile"
      ? getMobilePreviewImg()
      : getDesktopPreviewImg();

  const _selectedMotif = getMotifById(motifId);

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Top Header / Action Bar (Only on standalone page) */}
      {!isModal && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-border/70">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground cursor-pointer"
                asChild
              >
                <Link href="/homepage">
                  <ArrowLeft className="w-3.5 h-3.5 mr-1" />
                  Homepage
                </Link>
              </Button>
              <span className="text-muted-foreground">/</span>
              <span className="text-xs font-semibold text-foreground">
                {announcement ? "Edit Banner" : "New Announcement"}
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
              {announcement
                ? "Edit Announcement Banner"
                : "Create Announcement Banner"}
            </h1>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 text-xs cursor-pointer"
              asChild
            >
              <Link href="/homepage">Cancel</Link>
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isPending}
              className="h-8 text-xs cursor-pointer bg-primary text-primary-foreground font-semibold"
            >
              {isPending ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5 mr-1.5" />
                  {announcement ? "Update Banner" : "Publish Banner"}
                </>
              )}
            </Button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* STICKY SECTION: LIVE FINAL RENDERED BANNER PREVIEW (ALWAYS VISIBLE)       */}
      {/* ========================================================================= */}
      <div className="sticky top-13 z-30 bg-background/95 backdrop-blur-md pb-3 pt-1 border-b border-border/80 shadow-xs space-y-2">
        <AnnouncementPreview
          previewViewport={previewViewport}
          onViewportChange={setPreviewViewport}
          activeHeight={activeHeight}
          bannerHeights={bannerHeights}
          currentPreviewImage={currentPreviewImage}
          showFocalReticle={showFocalReticle}
          onToggleFocalReticle={() => setShowFocalReticle((prev) => !prev)}
          replayTrigger={replayTrigger}
          onTriggerReplay={() => setReplayTrigger((prev) => prev + 1)}
          focalPoint={focalPoint}
          onFocalPointChange={setFocalPoint}
          overlayTheme={overlayTheme}
          bgGradient={bgGradient}
          elements={elements}
          title={title}
          subtitle={subtitle}
          badgeText={badgeText}
          ctaLabel={ctaLabel}
          layoutStack={layoutStack}
          layoutAlign={layoutAlign}
          layoutValign={layoutValign}
          layoutCta={layoutCta}
          layoutMaxWidth={layoutMaxWidth}
          floatingGreetingEnabled={floatingGreetingEnabled}
          floatingGreetingIcon={floatingGreetingIcon}
          floatingGreetingText={floatingGreetingText}
        />
      </div>

      {/* ========================================================================= */}
      {/* 1. ARTWORK                                                                */}
      {/* ========================================================================= */}
      <div className="p-3.5 rounded-xl border border-border/80 bg-card space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="space-y-0.5">
            <span className="font-semibold text-xs sm:text-sm text-foreground flex items-center gap-1.5">
              <ImageIcon className="w-4 h-4 text-primary" />
              1. Artwork
            </span>
            <p className="text-[11px] text-muted-foreground">
              Select existing graphics from library or upload new artwork with
              side-by-side Desktop (16:1) & Mobile/Tablet (6:1) croppers.
            </p>
          </div>

          <Select
            value={mediaType}
            onValueChange={(val: "image" | "video" | "gif") =>
              setMediaType(val)
            }
            disabled={isPending}
          >
            <SelectTrigger className="w-[130px] h-7 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="image">Image (WebP/AVIF)</SelectItem>
              <SelectItem value="video">Video (MP4 Loop)</SelectItem>
              <SelectItem value="gif">Animated GIF</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Image Mode with Full-Width BannerArtworkAccordion */}
        {mediaType === "image" && (
          <BannerArtworkAccordion
            selectedBannerId={selectedBannerImageId}
            mediaPath={mediaPath}
            bannerHeight={activeHeight}
            focalPoint={focalPoint}
            onSelect={(bannerId, filename) => {
              setSelectedBannerImageId(bannerId);
              setMediaPath(filename);
              setLiveDesktopPreviewSrc(null);
              setLiveMobilePreviewSrc(null);
            }}
            onClear={() => {
              setSelectedBannerImageId(null);
              setMediaPath(null);
              setLiveDesktopPreviewSrc(null);
              setLiveMobilePreviewSrc(null);
            }}
            onLivePreviewUpdate={handleLivePreviewUpdate}
            disabled={isPending}
          />
        )}

        {/* Video / GIF Experimental Upload with Guidance */}
        {(mediaType === "video" || mediaType === "gif") && (
          <div className="space-y-2 pt-2 border-t border-border/80">
            <Alert className="bg-amber-500/10 border-amber-500/30 text-amber-950 dark:text-amber-200 py-2">
              <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              <AlertTitle className="text-xs font-bold">
                Experimental Format Notice
              </AlertTitle>
              <AlertDescription className="text-[11px]">
                Animated {mediaType.toUpperCase()} is an experimental
                placeholder. Silent MP4 video is recommended over GIF for ~90%
                smaller file sizes.
              </AlertDescription>
            </Alert>

            <Label htmlFor="b-media-file" className="text-xs font-semibold">
              Upload {mediaType === "video" ? "MP4 Video" : "Animated GIF"}
            </Label>
            <Input
              id="b-media-file"
              type="file"
              accept={
                mediaType === "video" ? "video/mp4,video/webm" : "image/gif"
              }
              onChange={handleVideoOrGifUpload}
              disabled={isPending}
              className="text-xs h-8"
            />
            {videoOrGifFile && (
              <p className="text-xs text-muted-foreground">
                Selected file: {videoOrGifFile.name} (
                {(videoOrGifFile.size / 1024).toFixed(1)} KB)
              </p>
            )}
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* 2. CONTENT & 3. APPEARANCE (2-COLUMN GRID ON LG SCREENS)                  */}
      {/* ========================================================================= */}
      <div className="grid lg:grid-cols-2 gap-3.5 items-start">
        {/* ========================================================================= */}
        {/* 2. CONTENT                                                                */}
        {/* ========================================================================= */}
        <div className="p-3.5 rounded-xl border border-border/80 bg-card space-y-3">
          <span className="font-semibold text-xs sm:text-sm text-foreground flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-primary" />
            2. Content
          </span>

          <div className="grid gap-2.5">
            <div className="grid gap-1">
              <div className="flex items-center justify-between">
                <Label htmlFor="b-title" className="text-xs font-semibold">
                  Banner Title
                </Label>
                <span className="text-[10px] text-muted-foreground">
                  (Optional if text baked into artwork)
                </span>
              </div>
              <Input
                id="b-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Janmashtami Mahotsav 2026 (or leave blank)"
                disabled={isPending}
                className="text-xs h-8"
              />
            </div>

            <div className="grid gap-1">
              <Label htmlFor="b-subtitle" className="text-xs font-semibold">
                Subtitle / Description
              </Label>
              <Input
                id="b-subtitle"
                value={subtitle}
                onChange={(e) => setSubtitle(e.target.value)}
                placeholder="e.g. Join hundreds of seekers for a transformative spiritual experience."
                disabled={isPending}
                className="text-xs h-8"
              />
            </div>

            <div className="grid sm:grid-cols-2 gap-2.5">
              <div className="grid gap-1">
                <Label htmlFor="b-badge" className="text-xs font-semibold">
                  Badge / Tag (Optional)
                </Label>
                <Input
                  id="b-badge"
                  value={badgeText}
                  onChange={(e) => setBadgeText(e.target.value)}
                  placeholder="e.g. Upcoming Festival, Special Camp"
                  disabled={isPending}
                  className="text-xs h-8"
                />
              </div>

              <div className="grid gap-1">
                <Label htmlFor="b-category" className="text-xs font-semibold">
                  Campaign Category
                </Label>
                <Select
                  value={category}
                  onValueChange={(
                    val:
                      | "event"
                      | "fundraising"
                      | "book_distribution"
                      | "guidance_spotlight"
                      | "general",
                  ) => setCategory(val)}
                  disabled={isPending}
                >
                  <SelectTrigger id="b-category" className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="event">Event (Camp / Yatra)</SelectItem>
                    <SelectItem value="fundraising">
                      Fundraising (Janmashtami)
                    </SelectItem>
                    <SelectItem value="book_distribution">
                      Book Marathon
                    </SelectItem>
                    <SelectItem value="guidance_spotlight">
                      Guidance Spotlight
                    </SelectItem>
                    <SelectItem value="general">
                      General Announcement
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-1">
              <Label htmlFor="b-alt-text" className="text-xs font-semibold">
                Screen-Reader Alt Text
              </Label>
              <Input
                id="b-alt-text"
                value={altText}
                onChange={(e) => setAltText(e.target.value)}
                placeholder="e.g. Grand Janmashtami Celebrations at ISKCON"
                disabled={isPending}
                className="text-xs h-8"
              />
              <span className="text-[10px] text-muted-foreground">
                Used for accessibility and SEO when graphic has baked-in
                typography.
              </span>
            </div>

            {/* Simple Call to Action (CTA) Configuration */}
            <div className="pt-2 border-t border-border/70 space-y-2">
              <span className="text-xs font-semibold text-foreground">
                Action Button (CTA)
              </span>
              <div className="grid sm:grid-cols-2 gap-2.5">
                <div className="grid gap-1">
                  <Label
                    htmlFor="b-cta-label"
                    className="text-[11px] font-medium text-muted-foreground"
                  >
                    Button Text
                  </Label>
                  <Input
                    id="b-cta-label"
                    value={ctaLabel}
                    onChange={(e) => setCtaLabel(e.target.value)}
                    placeholder="e.g. Register Now"
                    disabled={isPending}
                    className="text-xs h-8"
                  />
                </div>

                <div className="grid gap-1">
                  <Label
                    htmlFor="b-cta-url"
                    className="text-[11px] font-medium text-muted-foreground"
                  >
                    Button Link URL
                  </Label>
                  <Input
                    id="b-cta-url"
                    value={ctaUrl}
                    onChange={(e) => setCtaUrl(e.target.value)}
                    placeholder="e.g. /contact-us or https://..."
                    disabled={isPending}
                    className="text-xs h-8"
                  />
                </div>
              </div>
            </div>

            {/* Advanced Layout & Alignment Accordion (Collapsed by Default) */}
            <Accordion type="multiple" className="w-full pt-1">
              <AccordionItem
                value="advanced-layout"
                className="border rounded-lg px-3 bg-muted/20 border-border/60"
              >
                <AccordionTrigger className="py-2 text-xs font-semibold text-muted-foreground hover:text-foreground">
                  Advanced Layout & Alignment
                </AccordionTrigger>
                <AccordionContent className="pt-2 pb-2 space-y-3">
                  {/* Alignment dropdowns */}
                  <div className="grid grid-cols-2 gap-2.5 p-2 rounded-lg bg-background border border-border/60">
                    <div className="grid gap-1">
                      <Label
                        htmlFor="b-layout-align"
                        className="text-[11px] font-semibold text-foreground"
                      >
                        Horizontal Text
                      </Label>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div>
                              <Select
                                value={layoutAlign}
                                onValueChange={(val) =>
                                  setLayoutAlign(
                                    val as "left" | "center" | "right",
                                  )
                                }
                                disabled={isPending}
                              >
                                <SelectTrigger
                                  id="b-layout-align"
                                  className="h-8 text-xs w-full"
                                >
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem
                                    value="left"
                                    className="text-xs flex items-center gap-2"
                                  >
                                    <AlignLeft className="w-3.5 h-3.5 text-muted-foreground mr-1.5 inline" />
                                    <span>Align Left</span>
                                  </SelectItem>
                                  <SelectItem
                                    value="center"
                                    className="text-xs flex items-center gap-2"
                                  >
                                    <AlignCenter className="w-3.5 h-3.5 text-muted-foreground mr-1.5 inline" />
                                    <span>Align Center</span>
                                  </SelectItem>
                                  <SelectItem
                                    value="right"
                                    className="text-xs flex items-center gap-2"
                                  >
                                    <AlignRight className="w-3.5 h-3.5 text-muted-foreground mr-1.5 inline" />
                                    <span>Align Right</span>
                                  </SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent side="top">
                            <span>
                              Horizontal text alignment: {layoutAlign}
                            </span>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>

                    <div className="grid gap-1">
                      <Label
                        htmlFor="b-layout-valign"
                        className="text-[11px] font-semibold text-foreground"
                      >
                        Vertical Content
                      </Label>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div>
                              <Select
                                value={layoutValign}
                                onValueChange={(val) =>
                                  setLayoutValign(
                                    val as "top" | "center" | "bottom",
                                  )
                                }
                                disabled={isPending}
                              >
                                <SelectTrigger
                                  id="b-layout-valign"
                                  className="h-8 text-xs w-full"
                                >
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem
                                    value="top"
                                    className="text-xs flex items-center gap-2"
                                  >
                                    <AlignVerticalJustifyStart className="w-3.5 h-3.5 text-muted-foreground mr-1.5 inline" />
                                    <span>Top Aligned</span>
                                  </SelectItem>
                                  <SelectItem
                                    value="center"
                                    className="text-xs flex items-center gap-2"
                                  >
                                    <AlignVerticalJustifyCenter className="w-3.5 h-3.5 text-muted-foreground mr-1.5 inline" />
                                    <span>Middle Centered</span>
                                  </SelectItem>
                                  <SelectItem
                                    value="bottom"
                                    className="text-xs flex items-center gap-2"
                                  >
                                    <AlignVerticalJustifyEnd className="w-3.5 h-3.5 text-muted-foreground mr-1.5 inline" />
                                    <span>Bottom Aligned</span>
                                  </SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent side="top">
                            <span>
                              Vertical banner alignment: {layoutValign}
                            </span>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  </div>

                  {/* Optional CTA Placement in Advanced */}
                  <div className="grid gap-1 p-2 rounded-lg bg-background border border-border/60">
                    <Label
                      htmlFor="b-cta-placement"
                      className="text-[11px] font-semibold text-foreground"
                    >
                      Button Placement
                    </Label>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div>
                            <Select
                              value={layoutCta}
                              onValueChange={(val) =>
                                setLayoutCta(
                                  val as
                                    | "auto"
                                    | "below"
                                    | "right"
                                    | "bottom_right",
                                )
                              }
                              disabled={isPending}
                            >
                              <SelectTrigger
                                id="b-cta-placement"
                                className="h-8 text-xs w-full"
                              >
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem
                                  value="auto"
                                  className="text-xs flex items-center gap-2"
                                >
                                  <Columns className="w-3.5 h-3.5 text-muted-foreground mr-1.5 inline" />
                                  <span>Beside Text (Adaptive Inline)</span>
                                </SelectItem>
                                <SelectItem
                                  value="below"
                                  className="text-xs flex items-center gap-2"
                                >
                                  <ArrowDown className="w-3.5 h-3.5 text-muted-foreground mr-1.5 inline" />
                                  <span>Stacked Below Subtitle</span>
                                </SelectItem>
                                <SelectItem
                                  value="right"
                                  className="text-xs flex items-center gap-2"
                                >
                                  <PanelRight className="w-3.5 h-3.5 text-muted-foreground mr-1.5 inline" />
                                  <span>Flank Right Edge</span>
                                </SelectItem>
                                <SelectItem
                                  value="bottom_right"
                                  className="text-xs flex items-center gap-2"
                                >
                                  <CornerDownRight className="w-3.5 h-3.5 text-muted-foreground mr-1.5 inline" />
                                  <span>Right Flank + Bottom Aligned</span>
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent side="top">
                          <span>CTA Placement: {layoutCta}</span>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>

                  <AnnouncementLayoutFields
                    layoutStack={layoutStack}
                    onLayoutStackChange={setLayoutStack}
                    layoutMaxWidth={layoutMaxWidth}
                    onLayoutMaxWidthChange={setLayoutMaxWidth}
                    disabled={isPending}
                  />
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 3. APPEARANCE                                                             */}
        {/* ========================================================================= */}
        <div className="space-y-3.5">
          {/* Banner Height & Responsive Sizing */}
          <AnnouncementHeightFields
            bannerHeights={bannerHeights}
            activeHeight={activeHeight}
            previewViewport={previewViewport}
            heightsLinked={linkHeights}
            onHeightsLinkedToggle={() => setLinkHeights((prev) => !prev)}
            onHeightChange={(vp, val) => {
              setPreviewViewport(vp);
              updateActiveHeight(val);
            }}
            onApplyPreset={applyHeightPreset}
            disabled={isPending}
          />

          {/* Gradient Overlay Theme */}
          <div className="p-3.5 rounded-xl border border-border/80 bg-card space-y-2">
            <span className="font-semibold text-xs sm:text-sm text-foreground flex items-center gap-1.5">
              <Palette className="w-4 h-4 text-primary" />
              Gradient Overlay Theme
            </span>
            <Select
              value={bgGradient}
              onValueChange={setBgGradient}
              disabled={isPending}
            >
              <SelectTrigger id="b-gradient" className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {GRADIENT_PRESETS.map((p) => (
                  <SelectItem key={p.value} value={p.value}>
                    {p.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Advanced Visual Effects Accordion (Collapsed by Default) */}
          <Accordion type="multiple" className="w-full">
            <AccordionItem
              value="advanced-appearance"
              className="border rounded-xl px-3.5 bg-card border-border/80"
            >
              <AccordionTrigger className="py-2.5 text-xs sm:text-sm font-semibold text-muted-foreground hover:text-foreground">
                <span className="flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-primary" />
                  Advanced Visual Effects (Focal point, motifs & motion)
                </span>
              </AccordionTrigger>
              <AccordionContent className="pt-2 pb-3 space-y-3.5">
                {/* Image Focal Point & Subject Alignment Card */}
                <div className="p-3 rounded-lg border border-border/70 bg-muted/20 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-xs text-foreground flex items-center gap-1.5">
                      <Crosshair className="w-3.5 h-3.5 text-primary" />
                      Image Focal Point
                    </span>
                    <Badge
                      variant="outline"
                      className="font-mono text-[10px] font-semibold text-primary bg-primary/10 border-primary/20 px-2 py-0.5"
                    >
                      X: {focalPoint.x}% | Y: {focalPoint.y}%
                    </Badge>
                  </div>

                  <p className="text-[11px] text-muted-foreground">
                    Guarantees this coordinate remains visible across responsive
                    viewports when the image is cropped or scaled.
                  </p>

                  {/* Quick Position Anchors */}
                  <div className="space-y-1 pt-0.5">
                    <span className="text-[10px] uppercase font-semibold tracking-wider text-muted-foreground">
                      Quick Anchors
                    </span>
                    <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5">
                      {[
                        { label: "Center", x: 50, y: 50 },
                        { label: "Right Focus", x: 80, y: 50 },
                        { label: "Left Focus", x: 20, y: 50 },
                        { label: "Top Anchor", x: 50, y: 20 },
                        { label: "Bottom", x: 50, y: 80 },
                      ].map((anchor) => {
                        const isMatch =
                          focalPoint.x === anchor.x &&
                          focalPoint.y === anchor.y;
                        return (
                          <Button
                            key={anchor.label}
                            type="button"
                            size="sm"
                            variant={isMatch ? "default" : "outline"}
                            className="h-6 text-[11px] px-2 cursor-pointer font-medium"
                            onClick={() =>
                              setFocalPoint({ x: anchor.x, y: anchor.y })
                            }
                            disabled={isPending}
                          >
                            {anchor.label}
                          </Button>
                        );
                      })}
                    </div>
                  </div>

                  {/* X and Y Axis Sliders */}
                  <div className="grid sm:grid-cols-2 gap-3 pt-1 border-t border-border/70">
                    <div className="space-y-1">
                      <div className="flex justify-between text-[11px]">
                        <span className="text-muted-foreground font-medium">
                          Horizontal (X-Axis)
                        </span>
                        <span className="font-mono text-foreground font-bold">
                          {focalPoint.x}%
                        </span>
                      </div>
                      <Slider
                        min={0}
                        max={100}
                        step={1}
                        value={[focalPoint.x]}
                        onValueChange={([val]) =>
                          setFocalPoint((prev) => ({ ...prev, x: val }))
                        }
                        disabled={isPending}
                        className="py-1 cursor-pointer"
                      />
                    </div>

                    <div className="space-y-1">
                      <div className="flex justify-between text-[11px]">
                        <span className="text-muted-foreground font-medium">
                          Vertical (Y-Axis)
                        </span>
                        <span className="font-mono text-foreground font-bold">
                          {focalPoint.y}%
                        </span>
                      </div>
                      <Slider
                        min={0}
                        max={100}
                        step={1}
                        value={[focalPoint.y]}
                        onValueChange={([val]) =>
                          setFocalPoint((prev) => ({ ...prev, y: val }))
                        }
                        disabled={isPending}
                        className="py-1 cursor-pointer"
                      />
                    </div>
                  </div>
                </div>

                {/* Festive Atmosphere & Overlays Card */}
                <AnnouncementThemeFields
                  motifId={motifId}
                  onMotifIdChange={setMotifId}
                  overlayTheme={overlayTheme}
                  onOverlayThemeChange={setOverlayTheme}
                  floatingGreetingEnabled={floatingGreetingEnabled}
                  onFloatingGreetingEnabledChange={setFloatingGreetingEnabled}
                  floatingGreetingIcon={floatingGreetingIcon}
                  onFloatingGreetingIconChange={setFloatingGreetingIcon}
                  floatingGreetingText={floatingGreetingText}
                  onFloatingGreetingTextChange={setFloatingGreetingText}
                  disabled={isPending}
                />

                {/* Additive Decorative Layers & Motion Composer */}
                <div className="p-3 rounded-lg border border-border/70 bg-muted/20 space-y-2">
                  <AdditiveElementsComposer
                    elements={elements}
                    onChange={setElements}
                    disabled={isPending}
                  />
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 4. PUBLISHING & SCHEDULE                                                  */}
      {/* ========================================================================= */}
      <div className="p-3.5 rounded-xl border border-border/80 bg-card space-y-3">
        <span className="font-semibold text-xs sm:text-sm text-foreground flex items-center gap-1.5">
          <Calendar className="w-4 h-4 text-primary" />
          4. Publishing & Schedule
        </span>

        <div className="grid sm:grid-cols-2 gap-2.5">
          <div className="grid gap-1">
            <Label htmlFor="b-start-date" className="text-xs font-semibold">
              Start Date (Optional)
            </Label>
            <Input
              id="b-start-date"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              disabled={isPending}
              className="text-xs h-8"
            />
          </div>

          <div className="grid gap-1">
            <Label htmlFor="b-end-date" className="text-xs font-semibold">
              End Date (Optional)
            </Label>
            <Input
              id="b-end-date"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              disabled={isPending}
              className="text-xs h-8"
            />
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <Checkbox
            id="b-recurring"
            checked={isAnnualRecurring}
            onCheckedChange={(c) => setIsAnnualRecurring(Boolean(c))}
            disabled={isPending}
          />
          <Label
            htmlFor="b-recurring"
            className="text-xs font-medium cursor-pointer"
          >
            Annual Recurring Campaign (e.g. Janmashtami)
          </Label>
        </div>

        <div className="space-y-1.5 pt-1 border-t border-border/80">
          <Label className="text-xs font-semibold">Target User Roles</Label>
          <div className="flex flex-wrap gap-1.5">
            {roles.map((r) => {
              const isSelected = selectedRoles.includes(r.id);
              return (
                <Badge
                  key={r.id}
                  variant={isSelected ? "default" : "outline"}
                  className={cn(
                    "cursor-pointer text-xs px-2.5 py-0.5 select-none transition-all",
                    isSelected
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-muted",
                  )}
                  onClick={() => !isPending && toggleRole(r.id)}
                >
                  {isSelected && <Check className="w-3 h-3 mr-1" />}
                  {r.name}
                </Badge>
              );
            })}
          </div>
        </div>

        <div className="flex items-center space-x-2 pt-1">
          <Checkbox
            id="b-active"
            checked={isActive}
            onCheckedChange={(c) => setIsActive(Boolean(c))}
            disabled={isPending}
          />
          <Label
            htmlFor="b-active"
            className="text-xs font-semibold cursor-pointer"
          >
            Active (Display on live website)
          </Label>
        </div>
      </div>

      {/* Bottom Sticky/Floating Action Bar */}
      <div className="flex items-center justify-between p-3 rounded-xl border border-border/80 bg-card shadow-xs">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="text-xs cursor-pointer"
          asChild
        >
          <Link href="/homepage">Cancel</Link>
        </Button>

        <Button
          type="submit"
          size="sm"
          disabled={isPending}
          className="text-xs px-4 h-9 cursor-pointer bg-primary text-primary-foreground font-semibold"
        >
          {isPending ? (
            <>
              <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="w-3.5 h-3.5 mr-1.5" />
              {announcement ? "Update Banner" : "Publish Banner"}
            </>
          )}
        </Button>
      </div>
    </form>
  );
};
