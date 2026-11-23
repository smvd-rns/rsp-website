"use client";

import {
  AtSign,
  FileText,
  Folder,
  Headphones,
  Loader2,
  Search,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  type MentionEntity,
  type MentionFilterScope,
  useMentionSearch,
} from "@/hooks/use-mention-search";

interface MentionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectMention: (entity: MentionEntity) => void;
  onDismissLiteralAt?: () => void;
  onDismissSpaceAt?: () => void;
  onCancel?: () => void;
  isOpenViaAt?: boolean;
}

export const MentionDialog = ({
  open,
  onOpenChange,
  onSelectMention,
  onDismissLiteralAt,
  onDismissSpaceAt,
  onCancel,
  isOpenViaAt,
}: MentionDialogProps) => {
  const {
    mentionQuery,
    setMentionQuery,
    mentionFilterScope,
    setMentionFilterScope,
    searchingMentions,
    filteredMentionResults,
    recCount,
    catCount,
    matCount,
    totalCount,
  } = useMentionSearch(open);

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      if (onDismissLiteralAt) {
        onDismissLiteralAt();
      } else {
        onOpenChange(false);
      }
    } else {
      onOpenChange(true);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[520px] p-0 overflow-hidden gap-0">
        <DialogHeader className="p-4 border-b border-border/40 bg-muted/20 flex flex-row items-center justify-between">
          <DialogTitle className="text-base font-bold flex items-center gap-2">
            <AtSign className="h-4 w-4 text-primary" />
            <span>Mention Content Attachment</span>
          </DialogTitle>
          {onDismissLiteralAt && isOpenViaAt && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onDismissLiteralAt}
              className="h-6 px-2 text-xxs text-muted-foreground hover:text-foreground cursor-pointer"
              title="Press Esc to dismiss and insert literal '@'"
            >
              Insert literal &apos;@&apos; (Esc)
            </Button>
          )}
        </DialogHeader>

        <div className="p-3 border-b border-border/40 flex flex-col gap-2.5">
          <div className="relative flex items-center">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground opacity-60" />
            <Input
              type="text"
              placeholder={`Search lectures, categories, materials...${isOpenViaAt ? " (Esc to dismiss and insert literal @)" : ""}`}
              value={mentionQuery}
              onChange={(e) => setMentionQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Escape") {
                  e.preventDefault();
                  onDismissLiteralAt?.();
                  return;
                }
                if (e.key === " " && !mentionQuery.trim()) {
                  e.preventDefault();
                  onDismissSpaceAt?.();
                  return;
                }
                if (e.key === "Backspace" && !mentionQuery) {
                  e.preventDefault();
                  onCancel?.();
                  return;
                }
              }}
              className="pl-8 pr-8 text-xs h-9"
              autoFocus
            />
            {searchingMentions && (
              <Loader2 className="absolute right-2.5 top-2.5 h-4 w-4 animate-spin text-primary" />
            )}
          </div>

          <Tabs
            value={mentionFilterScope}
            onValueChange={(val) =>
              setMentionFilterScope(val as MentionFilterScope)
            }
          >
            <TabsList className="flex w-full h-8">
              <TabsTrigger
                value="all"
                className="flex-1 text-xs cursor-pointer gap-1"
              >
                <span>All</span>
                {totalCount > 0 && (
                  <span className="text-[10px] px-1 py-0 rounded bg-muted text-muted-foreground font-semibold">
                    {totalCount}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger
                value="recordings"
                className="flex-1 text-xs cursor-pointer gap-1"
              >
                <span>Lectures</span>
                {recCount > 0 && (
                  <span className="text-[10px] px-1 py-0 rounded bg-primary/10 text-primary font-bold">
                    {recCount}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger
                value="categories"
                className="flex-1 text-xs cursor-pointer gap-1"
              >
                <span>Categories</span>
                {catCount > 0 && (
                  <span className="text-[10px] px-1 py-0 rounded bg-muted text-muted-foreground font-semibold">
                    {catCount}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger
                value="materials"
                className="flex-1 text-xs cursor-pointer gap-1"
              >
                <span>Materials</span>
                {matCount > 0 && (
                  <span className="text-[10px] px-1 py-0 rounded bg-muted text-muted-foreground font-semibold">
                    {matCount}
                  </span>
                )}
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        <div className="max-h-[300px] overflow-y-auto divide-y divide-border/30">
          {searchingMentions ? (
            <div className="p-6 text-center text-xs text-muted-foreground flex items-center justify-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
              <span>Searching Orama index...</span>
            </div>
          ) : filteredMentionResults.length === 0 ? (
            <div className="p-6 text-center text-xs text-muted-foreground">
              {mentionQuery.trim()
                ? "No matching content found for this category."
                : "Type above to search lectures, categories, or study materials."}
            </div>
          ) : (
            filteredMentionResults.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectMention(item)}
                className="w-full text-left p-3 hover:bg-muted/60 transition-colors flex items-center justify-between gap-3 cursor-pointer group"
              >
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  {item.type === "recording" && (
                    <Headphones className="h-4 w-4 text-primary shrink-0" />
                  )}
                  {item.type === "category" && (
                    <Folder className="h-4 w-4 text-blue-500 shrink-0" />
                  )}
                  {item.type === "material" && (
                    <FileText className="h-4 w-4 text-amber-500 shrink-0" />
                  )}
                  <div className="flex flex-col min-w-0">
                    <span className="text-xs font-semibold truncate group-hover:text-primary transition-colors">
                      {item.name}
                    </span>
                    {item.subtitle && (
                      <span className="text-xxs text-muted-foreground truncate">
                        {item.subtitle}
                      </span>
                    )}
                  </div>
                </div>

                <Badge
                  variant="outline"
                  className="capitalize text-xxs shrink-0"
                >
                  {item.type === "recording" ? "lecture" : item.type}
                </Badge>
              </button>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
