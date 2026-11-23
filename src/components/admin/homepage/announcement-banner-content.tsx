import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface AnnouncementBannerContentProps {
  title: string;
  subtitle?: string;
  badgeText?: string;
  ctaLabel?: string;
  layoutStack?: boolean;
  layoutAlign?: "left" | "center" | "right";
  layoutValign?: "top" | "center" | "bottom";
  layoutCta?: "auto" | "below" | "right" | "bottom_right";
  layoutMaxWidth?: "sm" | "md" | "lg" | "full";
  containerMaxWidth?: string;
  containerMinWidth?: string;
}

export const AnnouncementBannerContent = ({
  title,
  subtitle,
  badgeText,
  ctaLabel,
  layoutStack = false,
  layoutAlign = "left",
  layoutValign = "center",
  layoutCta = "auto",
  layoutMaxWidth = "full",
  containerMaxWidth = "1440px",
  containerMinWidth,
}: AnnouncementBannerContentProps) => {
  const maxWStyle =
    layoutMaxWidth === "sm"
      ? "420px"
      : layoutMaxWidth === "md"
        ? "600px"
        : layoutMaxWidth === "lg"
          ? "840px"
          : "100%";

  // Vertical alignment within the banner height
  const vAlignClass =
    layoutValign === "top"
      ? "justify-start pt-2.5 sm:pt-3.5"
      : layoutValign === "bottom"
        ? "justify-end pb-2.5 sm:pb-3.5"
        : "justify-center py-2";

  // Horizontal text block alignment
  const textJustifyClass =
    layoutAlign === "center"
      ? "justify-center"
      : layoutAlign === "right"
        ? "justify-end"
        : "justify-start";

  const isCtaBelow = layoutCta === "below";
  const isCtaBottomRight = layoutCta === "bottom_right";
  const isCtaRight = layoutCta === "right";

  const ctaButtonNode = ctaLabel ? (
    <div
      className={
        isCtaBottomRight
          ? "absolute right-4 sm:right-6 bottom-2.5 sm:bottom-3.5 z-20 shrink-0"
          : isCtaRight
            ? "shrink-0 ml-auto self-center"
            : isCtaBelow
              ? "shrink-0 mt-1.5"
              : "shrink-0"
      }
    >
      <Button
        type="button"
        size="sm"
        className="font-semibold text-xs transition-all hover:opacity-95 cursor-pointer bg-white text-zinc-900 px-3.5 py-1 h-7 sm:h-8 shadow-xs"
      >
        <span>{ctaLabel}</span>
      </Button>
    </div>
  ) : null;

  return (
    <div
      className="relative z-10 flex flex-col w-full h-full min-h-[inherit]"
      style={{
        maxWidth: containerMaxWidth,
        minWidth: containerMinWidth,
        margin: "0 auto",
      }}
    >
      <div
        className={`flex w-full h-full min-h-[inherit] gap-3 text-white ${vAlignClass} ${
          layoutStack || isCtaBelow
            ? "flex-col"
            : "flex-col sm:flex-row sm:items-center justify-between"
        }`}
        style={{
          alignItems:
            layoutAlign === "center"
              ? "center"
              : layoutAlign === "right"
                ? "flex-end"
                : isCtaBelow || layoutStack
                  ? "flex-start"
                  : undefined,
          textAlign: layoutAlign,
        }}
      >
        <div
          className="space-y-1"
          style={{
            maxWidth: maxWStyle,
            width: layoutStack ? "100%" : undefined,
          }}
        >
          <div
            className={`flex flex-wrap items-center gap-2 ${textJustifyClass}`}
          >
            {badgeText ? (
              <span
                className="inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full backdrop-blur-xs"
                style={{
                  backgroundColor: "rgba(255,255,255,0.15)",
                }}
              >
                <Sparkles className="h-3 w-3 text-primary" />
                {badgeText}
              </span>
            ) : null}
            {title.trim() ? (
              <span className="text-xs sm:text-sm font-bold font-heading tracking-tight truncate">
                {title}
              </span>
            ) : null}
            {!layoutStack && subtitle && (
              <span
                className="text-xs truncate"
                style={{ color: "rgba(255,255,255,0.85)" }}
              >
                • {subtitle}
              </span>
            )}
          </div>

          {layoutStack && subtitle && (
            <p
              className="text-xs sm:text-sm leading-relaxed"
              style={{
                color: "rgba(255,255,255,0.9)",
                textAlign: layoutAlign,
              }}
            >
              {subtitle}
            </p>
          )}
        </div>

        {!isCtaBottomRight && ctaButtonNode}
      </div>

      {isCtaBottomRight && ctaButtonNode}
    </div>
  );
};
