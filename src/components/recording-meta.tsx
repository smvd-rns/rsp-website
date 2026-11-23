import {
  Calendar,
  Download,
  ExternalLink,
  Globe,
  MapPin,
  Sparkles,
  User,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { PHILOSOPHICAL_CONCEPTS } from "@/constants";
import { useCategories } from "@/hooks/use-categories";
import { useIsMobile } from "@/hooks/use-is-mobile";
import { useMetadata } from "@/hooks/use-metadata";
import { categoryPath, cn } from "@/lib/utils";
import type { EnrichedRecording } from "@/types";
import { MaterialBadge } from "./material-badge";
import { MaterialsPopover } from "./materials-popover";
import { Skeleton } from "./ui/skeleton";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";

interface RecordingMetaProps {
  rec: EnrichedRecording;
  m?: string | null;
  sm?: boolean;
  showLink?: boolean;
}

export const RecordingMeta = ({ rec, m, sm, showLink }: RecordingMetaProps) => {
  const { venues } = useMetadata();
  const isMobile = useIsMobile();
  const nMaterialPills = isMobile ? 1 : 2;
  const { data: categories } = useCategories();

  const rawVenue = (rec as any).venue || venues.find((v) => v.id === rec.venues_id)?.name;
  const venue = rawVenue === "Hyd" ? "Hyderabad" : (rawVenue || "NVCC");
  const rawDate = rec.recorded_at || (rec as any).recdatetime;

  const href = showLink
    ? `${categoryPath(categories?.find((c) => c?.id === rec.category_id)?.url_path)}?q=${rec.id}`
    : "";

  const materials = rec.materials ?? [];

  return (
    <div className={cn("flex-1 flex flex-col", sm ? "gap-1" : "gap-1.5")}>
      <h3
        className={cn(
          "leading-snug group-hover:text-primary transition-all flex items-center justify-between gap-2 font-bold text-sm",
          sm && "font-semibold",
        )}
      >
        <span
          className="line-clamp-2"
          title={rec.name}
        >
          {rec.name}
        </span>
        {href && (
          <Link
            href={href}
            prefetch={false}
            className="inline-flex items-center text-muted-foreground hover:text-primary transition-all cursor-pointer rounded-md p-1 hover:bg-accent shrink-0"
            title="Navigate to recording details"
          >
            <ExternalLink className="w-3 h-3" />
          </Link>
        )}
      </h3>

      {/* Date & Place Only */}
      <div
        className={cn(
          "flex items-center gap-2 text-muted-foreground font-medium",
          sm ? "text-xxs" : "text-xs",
        )}
      >
        {rawDate && (
          <span
            className="flex items-center gap-1 shrink-0"
            suppressHydrationWarning
            key="date"
          >
            <Calendar className="w-3 h-3 text-muted-foreground/80 shrink-0" />
            <span>
              {new Date(rawDate).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </span>
          </span>
        )}
        {rawDate && venue && (
          <span className="text-muted-foreground/40 shrink-0">•</span>
        )}
        {venue && (
          <span className="flex items-center gap-1 shrink-0" key="venue">
            <MapPin className="w-3 h-3 text-muted-foreground/80 shrink-0" />
            <span>{venue}</span>
          </span>
        )}
      </div>

      {/* Materials Row (Only if materials exist) */}
      {materials.length > 0 && !sm && !showLink && (
        <div className="pt-1.5 border-t border-border/50 flex items-center gap-1.5 flex-wrap">
          {materials.slice(0, nMaterialPills).map((mat) => {
            const isMaterialHighlighted = m != null && Number(m) === mat.id;
            return (
              <MaterialBadge
                key={mat.id}
                mat={mat}
                isHighlighted={isMaterialHighlighted}
              />
            );
          })}
          {materials.length > nMaterialPills ? (
            <MaterialsPopover
              materials={materials}
              m={m}
              rec={rec}
              trigger={
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="text-xxs font-semibold h-6 px-1.5 shrink-0 cursor-pointer rounded-md"
                >
                  +{materials.length - nMaterialPills} more
                </Button>
              }
            />
          ) : (
            <MaterialsPopover
              materials={materials}
              m={m}
              rec={rec}
              trigger={
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="text-xxs font-semibold h-6 px-1.5 shrink-0 cursor-pointer rounded-md"
                  title="View & download materials"
                >
                  <Download className="w-3 h-3 text-muted-foreground" />
                </Button>
              }
            />
          )}
        </div>
      )}
    </div>
  );
};
