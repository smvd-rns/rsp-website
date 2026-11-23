"use client";

import { Sparkles } from "lucide-react";
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
import { MOTIF_REGISTRY } from "@/lib/motif-registry";

export interface AnnouncementThemeFieldsProps {
  motifId: string;
  onMotifIdChange: (id: string) => void;
  overlayTheme: "none" | "pushpa_vrishti" | "deepotsava" | "celestial_dust";
  onOverlayThemeChange: (
    theme: "none" | "pushpa_vrishti" | "deepotsava" | "celestial_dust",
  ) => void;
  floatingGreetingEnabled: boolean;
  onFloatingGreetingEnabledChange: (enabled: boolean) => void;
  floatingGreetingIcon: string;
  onFloatingGreetingIconChange: (icon: string) => void;
  floatingGreetingText: string;
  onFloatingGreetingTextChange: (text: string) => void;
  disabled?: boolean;
}

export const AnnouncementThemeFields = ({
  motifId,
  onMotifIdChange,
  overlayTheme,
  onOverlayThemeChange,
  floatingGreetingEnabled,
  onFloatingGreetingEnabledChange,
  floatingGreetingIcon,
  onFloatingGreetingIconChange,
  floatingGreetingText,
  onFloatingGreetingTextChange,
  disabled = false,
}: AnnouncementThemeFieldsProps) => {
  return (
    <div className="p-3.5 rounded-xl border border-border/80 bg-card space-y-3">
      <div className="flex items-center justify-between">
        <span className="font-semibold text-xs sm:text-sm text-foreground flex items-center gap-1.5">
          <Sparkles className="w-4 h-4 text-primary" />
          Atmosphere, Motifs & Floating Greeting
        </span>
      </div>

      {/* Sacred Decorative Motif Selector */}
      <div className="space-y-1.5">
        <Label htmlFor="motif-select" className="text-xs font-semibold">
          Sacred Decorative Motif / Symbol
        </Label>
        <Select
          value={motifId}
          onValueChange={onMotifIdChange}
          disabled={disabled}
        >
          <SelectTrigger id="motif-select" className="h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {MOTIF_REGISTRY.map((m) => (
              <SelectItem key={m.id} value={m.id} className="text-xs">
                {m.name} ({m.description})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Ambient Particle Overlay Theme */}
      <div className="space-y-1.5">
        <Label htmlFor="overlay-select" className="text-xs font-semibold">
          Ambient Particle Overlay Theme
        </Label>
        <Select
          value={overlayTheme}
          onValueChange={(val) =>
            onOverlayThemeChange(
              val as
                | "none"
                | "pushpa_vrishti"
                | "deepotsava"
                | "celestial_dust",
            )
          }
          disabled={disabled}
        >
          <SelectTrigger id="overlay-select" className="h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none" className="text-xs">
              None (Clean original banner)
            </SelectItem>
            <SelectItem value="pushpa_vrishti" className="text-xs">
              🌸 Pushpa Vrishti (Falling flower petals)
            </SelectItem>
            <SelectItem value="deepotsava" className="text-xs">
              🪔 Deepotsava (Floating ghee lamps)
            </SelectItem>
            <SelectItem value="celestial_dust" className="text-xs">
              ✨ Celestial Dust (Twinkling gold starlight)
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Floating Greeting Pill Configuration */}
      <div className="pt-2 border-t border-border/60 space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label
              htmlFor="floating-greeting-toggle"
              className="text-xs font-semibold cursor-pointer text-foreground"
            >
              Floating Devotional Badge / Greeting Pill
            </Label>
            <p className="text-[11px] text-muted-foreground">
              Displays a gentle levitating pill badge (e.g. &apos;Radhe
              Radhe&apos; or &apos;Hare Krishna&apos;) anchored to the banner
            </p>
          </div>
          <Checkbox
            id="floating-greeting-toggle"
            checked={floatingGreetingEnabled}
            onCheckedChange={(checked) =>
              onFloatingGreetingEnabledChange(!!checked)
            }
            disabled={disabled}
            className="cursor-pointer"
          />
        </div>

        {floatingGreetingEnabled && (
          <div className="grid sm:grid-cols-3 gap-2.5 pt-1 bg-muted/20 p-2.5 rounded-lg border border-border/50">
            <div className="space-y-1">
              <Label className="text-[11px] font-medium text-muted-foreground">
                Icon / Emoji
              </Label>
              <Input
                value={floatingGreetingIcon}
                onChange={(e) => onFloatingGreetingIconChange(e.target.value)}
                placeholder="🌸 or 🙏"
                className="h-8 text-xs"
                disabled={disabled}
              />
            </div>
            <div className="sm:col-span-2 space-y-1">
              <Label className="text-[11px] font-medium text-muted-foreground">
                Greeting Text / Sacred Phrase
              </Label>
              <Input
                value={floatingGreetingText}
                onChange={(e) => onFloatingGreetingTextChange(e.target.value)}
                placeholder="e.g. राधे राधे • Shubh Janmashtami"
                className="h-8 text-xs"
                disabled={disabled}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
