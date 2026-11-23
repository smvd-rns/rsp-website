"use client";
import { type BannerElement, getAssetById } from "@/lib/asset-registry";
import { cn } from "@/lib/utils";

interface BannerElementRendererProps {
  elements?: BannerElement[] | null;
  replayTrigger?: number;
}

const getSizePixels = (
  size?: "xs" | "sm" | "md" | "lg" | "xl" | number,
): number => {
  if (typeof size === "number") return size;
  switch (size) {
    case "xs":
      return 24;
    case "sm":
      return 34;
    case "md":
      return 46;
    case "lg":
      return 62;
    case "xl":
      return 80;
    default:
      return 46;
  }
};

export const BannerElementRenderer = ({
  elements,
  replayTrigger = 0,
}: BannerElementRendererProps) => {
  if (!elements || elements.length === 0) return null;

  return (
    <>
      <style>{`
        @keyframes rsp-float-in-left {
          0% {
            transform: translate3d(-100px, 0, 0) scale(0.85);
            opacity: 0;
          }
          100% {
            transform: translate3d(0, 0, 0) scale(1);
            opacity: 1;
          }
        }
        @keyframes rsp-float-in-right {
          0% {
            transform: translate3d(100px, 0, 0) scale(0.85);
            opacity: 0;
          }
          100% {
            transform: translate3d(0, 0, 0) scale(1);
            opacity: 1;
          }
        }
        @keyframes rsp-float-in-bottom {
          0% {
            transform: translate3d(0, 50px, 0) scale(0.85);
            opacity: 0;
          }
          100% {
            transform: translate3d(0, 0, 0) scale(1);
            opacity: 1;
          }
        }
        @keyframes rsp-fade-scale {
          0% {
            transform: scale3d(0.6, 0.6, 1);
            opacity: 0;
          }
          100% {
            transform: scale3d(1, 1, 1);
            opacity: 1;
          }
        }
        @keyframes rsp-spin-in {
          0% {
            transform: translate3d(60px, 0, 0) rotate(-220deg) scale3d(0.4, 0.4, 1);
            opacity: 0;
          }
          100% {
            transform: translate3d(0, 0, 0) rotate(0deg) scale3d(1, 1, 1);
            opacity: 1;
          }
        }
        @keyframes rsp-subtle-wavy {
          0%, 100% {
            transform: rotate(0deg) translateY(0);
          }
          25% {
            transform: rotate(4deg) translateY(-2px);
          }
          75% {
            transform: rotate(-3deg) translateY(1px);
          }
        }
        @keyframes rsp-gentle-pulse {
          0%, 100% {
            transform: scale(1);
            filter: drop-shadow(0 0 2px rgba(251, 191, 36, 0.35));
          }
          50% {
            transform: scale(1.08);
            filter: drop-shadow(0 0 8px rgba(251, 191, 36, 0.75));
          }
        }
        @keyframes rsp-floating-bob {
          0%, 100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-5px);
          }
        }
        @keyframes rsp-slow-spin {
          0% {
            transform: rotate(0deg);
          }
          100% {
            transform: rotate(360deg);
          }
        }
        @keyframes rsp-sway-pendulum {
          0%, 100% {
            transform: rotate(0deg);
            transform-origin: top center;
          }
          25% {
            transform: rotate(7deg);
          }
          75% {
            transform: rotate(-7deg);
          }
        }
        @keyframes rsp-shimmer-shine {
          0%, 100% {
            opacity: 0.85;
            filter: brightness(1);
          }
          50% {
            opacity: 1;
            filter: brightness(1.2) drop-shadow(0 0 6px rgba(254, 240, 138, 0.7));
          }
        }
        @media (prefers-reduced-motion: reduce) {
          .rsp-motion-element {
            animation: none !important;
          }
        }
      `}</style>

      {elements.map((elem, idx) => {
        const asset = getAssetById(elem.assetId);
        if (!asset) return null;

        const sizePx = getSizePixels(elem.size);
        const opacity = elem.opacity ?? 1;
        const isBackground = elem.layer === "background";
        const zIndex = isBackground ? 1 : 15;

        let positionStyle: React.CSSProperties = {
          position: "absolute",
          zIndex,
          pointerEvents: "none",
          userSelect: "none",
        };

        if (elem.placement === "float-left") {
          positionStyle = {
            ...positionStyle,
            top: "50%",
            left: "1rem",
            transform: "translateY(-50%)",
          };
        } else if (elem.placement === "float-right") {
          positionStyle = {
            ...positionStyle,
            top: "50%",
            right: "3rem",
            transform: "translateY(-50%)",
          };
        } else if (elem.placement === "corner-top-left") {
          positionStyle = {
            ...positionStyle,
            top: "0px",
            left: "0px",
          };
        } else if (elem.placement === "corner-top-right") {
          positionStyle = {
            ...positionStyle,
            top: "0px",
            right: "0px",
            transform: "scaleX(-1)",
          };
        } else if (elem.placement === "custom" && elem.customPosition) {
          positionStyle = {
            ...positionStyle,
            top: `${elem.customPosition.y}%`,
            left: `${elem.customPosition.x}%`,
            transform: "translate(-50%, -50%)",
          };
        }

        const enterAnim =
          elem.enterAnimation || asset.recommendedEnter || "none";
        const idleAnim = elem.idleAnimation || asset.recommendedIdle || "none";
        const duration = elem.animationDuration || 1;
        const delay = elem.animationDelay || idx * 0.15;

        const enterAnimCss =
          enterAnim !== "none"
            ? `rsp-${enterAnim} ${duration}s cubic-bezier(0.16, 1, 0.3, 1) ${delay}s both`
            : "none";

        const idleAnimCss =
          idleAnim !== "none"
            ? `rsp-${idleAnim} ${idleAnim === "slow-spin" ? "12s" : "3.5s"} ease-in-out ${
                delay + (enterAnim !== "none" ? duration : 0)
              }s infinite`
            : "none";

        const renderElementNode = (
          customStyle: React.CSSProperties = {},
          className?: string,
        ) => (
          <div
            className={cn("rsp-motion-element", className)}
            style={{
              ...positionStyle,
              ...customStyle,
              animation: enterAnimCss !== "none" ? enterAnimCss : undefined,
            }}
          >
            <div
              className="rsp-motion-element"
              style={{
                animation: idleAnimCss !== "none" ? idleAnimCss : undefined,
                opacity,
              }}
            >
              <img
                src={asset.assetPath}
                alt=""
                style={{
                  width: `${sizePx}px`,
                  height: `${sizePx}px`,
                  objectFit: "contain",
                }}
                aria-hidden="true"
              />
            </div>
          </div>
        );

        if (elem.placement === "dual-opposite") {
          return (
            <div key={`${elem.id}-${replayTrigger}`}>
              {renderElementNode(
                { top: "50%", left: "1rem", transform: "translateY(-50%)" },
                "hidden sm:block",
              )}
              {renderElementNode(
                { top: "50%", right: "3rem", transform: "translateY(-50%)" },
                "hidden sm:block",
              )}
            </div>
          );
        }

        return (
          <div key={`${elem.id}-${replayTrigger}`}>{renderElementNode()}</div>
        );
      })}
    </>
  );
};
