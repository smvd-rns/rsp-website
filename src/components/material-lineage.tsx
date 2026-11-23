import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface MaterialLineageProps {
  category?: { name: string } | null;
  recording?: { name: string } | null;
  className?: string;
}

export const MaterialLineage = ({
  category,
  recording,
  className,
}: MaterialLineageProps) => {
  if (!category && !recording) return null;

  return (
    <div
      className={cn(
        "text-[11px] text-muted-foreground/75 flex items-center gap-1.5 font-normal truncate",
        className,
      )}
    >
      {category && (
        <span className="shrink-0 max-w-[45%] truncate font-medium text-muted-foreground">
          {category.name}
        </span>
      )}
      {category && recording && (
        <ChevronRight className="w-3 h-3 text-muted-foreground/50 shrink-0" />
      )}
      {recording && (
        <span className="truncate text-muted-foreground/80">
          {recording.name}
        </span>
      )}
    </div>
  );
};
