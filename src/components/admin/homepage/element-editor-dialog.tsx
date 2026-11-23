"use client";

import { Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  type AssetCategory,
  type AssetItem,
  type BannerElement,
  type ElementEnterAnimation,
  type ElementIdleAnimation,
  type ElementPlacement,
  getAssetById,
  getAssetsByCategory,
} from "@/lib/asset-registry";

export interface ElementEditorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingElement?: BannerElement | null;
  defaultDelay?: number;
  onSave: (element: BannerElement) => void;
}

export const ElementEditorDialog = ({
  open,
  onOpenChange,
  editingElement,
  defaultDelay = 0,
  onSave,
}: ElementEditorDialogProps) => {
  const [categoryTab, setCategoryTab] = useState<AssetCategory>("sacred");
  const [selectedAssetId, setSelectedAssetId] = useState<string>("conch");
  const [placement, setPlacement] = useState<ElementPlacement>("float-left");
  const [customX, setCustomX] = useState<number>(50);
  const [customY, setCustomY] = useState<number>(50);
  const [size, setSize] = useState<"xs" | "sm" | "md" | "lg" | "xl">("md");
  const [layer, setLayer] = useState<"foreground" | "background">("foreground");
  const [opacity, setOpacity] = useState<number>(1);
  const [enterAnimation, setEnterAnimation] =
    useState<ElementEnterAnimation>("float-in-left");
  const [idleAnimation, setIdleAnimation] =
    useState<ElementIdleAnimation>("floating-bob");
  const [animationDuration, setAnimationDuration] = useState<number>(1);
  const [animationDelay, setAnimationDelay] = useState<number>(0);

  useEffect(() => {
    if (!open) return;
    if (editingElement) {
      setSelectedAssetId(editingElement.assetId);
      const asset = getAssetById(editingElement.assetId);
      setCategoryTab(asset?.category || "sacred");
      setPlacement(editingElement.placement);
      setCustomX(editingElement.customPosition?.x ?? 50);
      setCustomY(editingElement.customPosition?.y ?? 50);
      setSize(
        (typeof editingElement.size === "string"
          ? editingElement.size
          : "md") as "xs" | "sm" | "md" | "lg" | "xl",
      );
      setLayer(editingElement.layer || "foreground");
      setOpacity(editingElement.opacity ?? 1);
      setEnterAnimation(editingElement.enterAnimation || "none");
      setIdleAnimation(editingElement.idleAnimation || "none");
      setAnimationDuration(editingElement.animationDuration ?? 1);
      setAnimationDelay(editingElement.animationDelay ?? 0);
    } else {
      setSelectedAssetId("conch");
      const asset = getAssetById("conch");
      setPlacement("float-left");
      setCustomX(50);
      setCustomY(50);
      setSize("md");
      setLayer("foreground");
      setOpacity(1);
      setEnterAnimation(asset?.recommendedEnter || "float-in-left");
      setIdleAnimation(asset?.recommendedIdle || "floating-bob");
      setAnimationDuration(1);
      setAnimationDelay(defaultDelay);
      setCategoryTab("sacred");
    }
  }, [open, editingElement, defaultDelay]);

  const handleSelectAsset = (asset: AssetItem) => {
    setSelectedAssetId(asset.id);
    if (!editingElement) {
      if (asset.recommendedEnter) setEnterAnimation(asset.recommendedEnter);
      if (asset.recommendedIdle) setIdleAnimation(asset.recommendedIdle);
    }
  };

  const handleSave = () => {
    const asset = getAssetById(selectedAssetId);
    const elementData: BannerElement = {
      id: editingElement
        ? editingElement.id
        : `elem_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      assetId: selectedAssetId,
      label: asset?.name,
      placement,
      customPosition:
        placement === "custom" ? { x: customX, y: customY } : undefined,
      size,
      layer,
      opacity,
      enterAnimation,
      idleAnimation,
      animationDuration,
      animationDelay,
    };
    onSave(elementData);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto p-6">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            {editingElement ? "Edit Decorative Layer" : "Add Decorative Layer"}
          </DialogTitle>
          <DialogDescription className="text-xs">
            Pick a sacred emblem, motif, or accent to enrich the banner
            atmosphere.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-3">
          {/* Step 1: Asset Selector */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold">
              1. Select Motif / Accent
            </Label>
            <Tabs
              value={categoryTab}
              onValueChange={(val) => setCategoryTab(val as AssetCategory)}
            >
              <TabsList className="grid grid-cols-4 h-8">
                <TabsTrigger value="sacred" className="text-[11px]">
                  Sacred
                </TabsTrigger>
                <TabsTrigger value="characters" className="text-[11px]">
                  Characters
                </TabsTrigger>
                <TabsTrigger value="vignettes" className="text-[11px]">
                  Vignettes
                </TabsTrigger>
                <TabsTrigger value="stickers" className="text-[11px]">
                  Stickers
                </TabsTrigger>
              </TabsList>

              {(
                [
                  "sacred",
                  "characters",
                  "vignettes",
                  "stickers",
                ] as AssetCategory[]
              ).map((cat) => (
                <TabsContent key={cat} value={cat} className="mt-3">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 max-h-48 overflow-y-auto p-1">
                    {getAssetsByCategory(cat).map((item) => {
                      const isSelected = selectedAssetId === item.id;
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => handleSelectAsset(item)}
                          className={`flex flex-col items-center gap-1.5 p-2 rounded-lg border text-center transition-all ${
                            isSelected
                              ? "border-primary bg-primary/10 ring-1 ring-primary shadow-xs"
                              : "border-border hover:border-border/80 hover:bg-muted/40"
                          }`}
                        >
                          <div className="w-12 h-12 flex items-center justify-center p-1">
                            <img
                              src={item.assetPath}
                              alt={item.name}
                              className="w-full h-full object-contain filter drop-shadow-xs"
                            />
                          </div>
                          <span className="text-[11px] font-medium leading-tight truncate w-full text-foreground">
                            {item.name}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </TabsContent>
              ))}
            </Tabs>
          </div>

          {/* Step 2: Placement & Layout */}
          <div className="grid sm:grid-cols-2 gap-4 pt-2 border-t border-border">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">
                2. Placement & Flow
              </Label>
              <Select
                value={placement}
                onValueChange={(val) => setPlacement(val as ElementPlacement)}
              >
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="float-left">
                    Float Left (Leading)
                  </SelectItem>
                  <SelectItem value="float-right">
                    Float Right (Trailing)
                  </SelectItem>
                  <SelectItem value="dual-opposite">
                    Dual Flanking (Left & Right)
                  </SelectItem>
                  <SelectItem value="corner-top-left">
                    Top-Left Corner
                  </SelectItem>
                  <SelectItem value="corner-top-right">
                    Top-Right Corner
                  </SelectItem>
                  <SelectItem value="custom">Custom Canvas Position</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Scale / Size</Label>
              <Select
                value={size}
                onValueChange={(val) =>
                  setSize(val as "xs" | "sm" | "md" | "lg" | "xl")
                }
              >
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="xs">Tiny (24px)</SelectItem>
                  <SelectItem value="sm">Small (36px)</SelectItem>
                  <SelectItem value="md">
                    Medium (48px - Recommended)
                  </SelectItem>
                  <SelectItem value="lg">Large (64px)</SelectItem>
                  <SelectItem value="xl">Display / Huge (96px)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {placement === "custom" && (
            <div className="p-3 bg-muted/40 rounded-lg space-y-3 border border-border">
              <span className="text-[11px] font-semibold text-muted-foreground block">
                Custom Coordinates (%)
              </span>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <div className="flex justify-between text-[11px]">
                    <span>Horizontal (X)</span>
                    <span className="font-mono">{customX}%</span>
                  </div>
                  <Slider
                    value={[customX]}
                    min={0}
                    max={100}
                    step={1}
                    onValueChange={(val) => setCustomX(val[0])}
                  />
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between text-[11px]">
                    <span>Vertical (Y)</span>
                    <span className="font-mono">{customY}%</span>
                  </div>
                  <Slider
                    value={[customY]}
                    min={0}
                    max={100}
                    step={1}
                    onValueChange={(val) => setCustomY(val[0])}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Motion & Animation */}
          <div className="grid sm:grid-cols-2 gap-4 pt-2 border-t border-border">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">
                3. Entry Animation (Intro)
              </Label>
              <Select
                value={enterAnimation}
                onValueChange={(val) =>
                  setEnterAnimation(val as ElementEnterAnimation)
                }
              >
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None (Static)</SelectItem>
                  <SelectItem value="fade-scale">Fade Scale</SelectItem>
                  <SelectItem value="float-in-left">
                    Float In from Left
                  </SelectItem>
                  <SelectItem value="float-in-right">
                    Float In from Right
                  </SelectItem>
                  <SelectItem value="float-in-bottom">
                    Float In from Bottom
                  </SelectItem>
                  <SelectItem value="spin-in">Spin & Expand</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">
                Continuous Idle Motion
              </Label>
              <Select
                value={idleAnimation}
                onValueChange={(val) =>
                  setIdleAnimation(val as ElementIdleAnimation)
                }
              >
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None (Stationary)</SelectItem>
                  <SelectItem value="floating-bob">
                    Gentle Floating (Levitation)
                  </SelectItem>
                  <SelectItem value="gentle-pulse">
                    Pulsing Aura (Breathe)
                  </SelectItem>
                  <SelectItem value="subtle-wavy">Subtle Wave</SelectItem>
                  <SelectItem value="sway-pendulum">Sway Pendulum</SelectItem>
                  <SelectItem value="slow-spin">
                    Sacred Rotation (Spin)
                  </SelectItem>
                  <SelectItem value="shimmer-shine">
                    Golden Shimmer (Flash)
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Animation Duration & Delay */}
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-semibold">
                <span>Animation Speed / Cycle</span>
                <span className="text-primary font-mono">
                  {animationDuration}s
                </span>
              </div>
              <Slider
                value={[animationDuration]}
                min={0.5}
                max={5}
                step={0.25}
                onValueChange={(val) => setAnimationDuration(val[0])}
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-semibold">
                <span>Intro Delay</span>
                <span className="text-primary font-mono">
                  {animationDelay}s
                </span>
              </div>
              <Slider
                value={[animationDelay]}
                min={0}
                max={3}
                step={0.1}
                onValueChange={(val) => setAnimationDelay(val[0])}
              />
            </div>
          </div>

          {/* Layer & Opacity */}
          <div className="grid sm:grid-cols-2 gap-4 pt-2 border-t border-border">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Z-Index Layer</Label>
              <Select
                value={layer}
                onValueChange={(val) =>
                  setLayer(val as "foreground" | "background")
                }
              >
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="foreground">
                    Foreground (Crisp Accent)
                  </SelectItem>
                  <SelectItem value="background">
                    Background (Behind Content / Watermark)
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-semibold">
                <span>Opacity</span>
                <span className="text-primary font-mono">
                  {Math.round(opacity * 100)}%
                </span>
              </div>
              <Slider
                value={[opacity * 100]}
                min={15}
                max={100}
                step={5}
                onValueChange={(val) => setOpacity(val[0] / 100)}
              />
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0 pt-3 border-t border-border">
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button type="button" onClick={handleSave}>
            {editingElement ? "Save Changes" : "Add to Banner"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
