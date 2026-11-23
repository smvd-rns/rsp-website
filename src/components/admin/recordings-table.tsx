"use client";

import {
  closestCenter,
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { restrictToVerticalAxis } from "@dnd-kit/modifiers";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useQueryClient } from "@tanstack/react-query";
import {
  ChevronDown,
  Edit2,
  ExternalLink,
  FileText,
  GripVertical,
  RotateCw,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import {
  reorderRecordings,
  restoreRecording,
  softDeleteRecording,
} from "@/app/actions/recording-actions";
import { deleteRecordingPermanentlyAction } from "@/app/actions/trash-actions";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { QUERY_KEY } from "@/constants";
import { useDictionaries } from "@/hooks/use-dictionaries";
import { localDeleteRecording, localTrashRecording } from "@/lib/idb";
import { reorderItems } from "@/lib/reorder-utils";
import { getAssetUrl } from "@/lib/storage";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";
import type { EnrichedRecording } from "@/types";

interface DictionaryData {
  speakers: { id: number; name: string }[];
  languages: { id: number; name: string; native_name: string | null }[];
  contentTypes: { id: number; name: string }[];
  venues: { id: number; name: string }[];
  isLoading: boolean;
}

interface RecordingsTableProps {
  recordings: EnrichedRecording[];
  isTrash?: boolean;
  categoryUrlPath?: string;
}

interface SortableRowProps {
  rec: EnrichedRecording;
  isTrash?: boolean;
  dicts: DictionaryData;
  targetQ?: string | null;
  targetM?: string | null;
  categoryUrlPath?: string;
}

const SortableRow = ({
  rec,
  isTrash,
  dicts,
  targetQ,
  targetM,
  categoryUrlPath,
}: SortableRowProps) => {
  const queryClient = useQueryClient();
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: rec.id });

  const isHighlighted = Boolean(targetQ && Number(targetQ) === rec.id);
  const shouldAutoExpand = Boolean(isHighlighted && targetM);

  const [isExpanded, setIsExpanded] = useState(shouldAutoExpand);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (shouldAutoExpand) {
      setIsExpanded(true);
    }
  }, [shouldAutoExpand]);
  const [confirmAction, setConfirmAction] = useState<"delete" | "trash" | null>(
    null,
  );

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 1 : 0,
  };

  const recAny = rec as unknown as {
    speaker?: string;
    language?: string;
    venue?: string;
    recdatetime?: string;
  };

  const rawDate = rec.recorded_at || recAny.recdatetime;
  const formattedDate = rawDate ? new Date(rawDate).toLocaleDateString() : "—";

  const speakerNames =
    recAny.speaker?.trim() ||
    (rec.speaker_ids || [])
      .map((id) => dicts.speakers.find((s) => s.id === id)?.name)
      .filter(Boolean)
      .join(", ") ||
    "—";

  const typeName = rec.type_id
    ? dicts.contentTypes.find((t) => t.id === rec.type_id)?.name
    : "";

  const venueName =
    recAny.venue?.trim() ||
    (rec.venues_id
      ? dicts.venues.find((v) => v.id === rec.venues_id)?.name
      : "") ||
    "";

  const handleConfirmAction = async () => {
    if (confirmAction === "delete") {
      setIsProcessing(true);
      const toastId = toast.loading("Deleting recording permanently...");
      try {
        await deleteRecordingPermanentlyAction(rec.id);

        await localDeleteRecording(rec.id);

        queryClient.invalidateQueries({ queryKey: [QUERY_KEY.CATEGORY_PAGE] });
        queryClient.invalidateQueries({ queryKey: ["trash"] });

        if (typeof window !== "undefined") {
          window.dispatchEvent(new Event("trigger-sync"));
        }

        toast.success("Recording deleted", { id: toastId });
      } catch (err) {
        toast.error("Failed to delete recording", { id: toastId });
        console.error(err);
        setIsProcessing(false);
      }
    } else if (confirmAction === "trash") {
      setIsProcessing(true);
      const toastId = toast.loading("Moving recording to trash...");
      try {
        await softDeleteRecording(rec.id, rec.category_id, categoryUrlPath);

        await localTrashRecording(rec.id);

        queryClient.invalidateQueries({ queryKey: [QUERY_KEY.CATEGORY_PAGE] });
        queryClient.invalidateQueries({ queryKey: ["trash"] });

        if (typeof window !== "undefined") {
          window.dispatchEvent(new Event("trigger-sync"));
        }

        toast.success("Recording moved to trash", { id: toastId });
      } catch (err) {
        toast.error("Failed to move to trash", { id: toastId });
        console.error(err);
        setIsProcessing(false);
      }
    }
  };

  return (
    <>
      <TableRow
        id={`recording-${rec.id}`}
        ref={setNodeRef}
        style={style}
        className={cn(
          "group transition-colors relative overflow-hidden",
          isHighlighted && "bg-primary/10 ring-1 ring-primary",
          isExpanded
            ? "bg-muted/50/40"
            : !isHighlighted &&
                "hover:bg-muted/50/50 text-primary-foreground/20",
          isProcessing &&
            "opacity-50 pointer-events-none select-none bg-muted/50 ",
        )}
      >
        <TableCell className="w-[50px]">
          {!isTrash && (
            <div
              {...attributes}
              {...listeners}
              className="cursor-grab active:cursor-grabbing p-2"
            >
              <GripVertical className="h-4 w-4 text-muted-foreground/80 group-hover:text-muted-foreground" />
            </div>
          )}
        </TableCell>
        <TableCell
          className="font-medium cursor-pointer"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <div className="flex items-center gap-2 text-muted-foreground">
            <ChevronDown
              className={cn(
                "h-4 w-4 text-muted-foreground/80 transition-transform",
                isExpanded && "rotate-180",
              )}
            />
            {rec.name}
            {rec.materials && rec.materials.length > 0 && (
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-muted text-[10px] text-muted-foreground">
                {rec.materials.length}
              </span>
            )}
          </div>
        </TableCell>
        <TableCell className="text-muted-foreground hidden sm:table-cell">
          {speakerNames}
        </TableCell>
        <TableCell className="text-muted-foreground hidden md:table-cell">
          {formattedDate}
        </TableCell>
        <TableCell className="text-muted-foreground hidden lg:table-cell">
          {typeName}
        </TableCell>
        <TableCell className="text-muted-foreground hidden lg:table-cell">
          {venueName}
        </TableCell>
        <TableCell className="w-[80px]">
          <div className="flex items-center justify-end gap-2">
            {isTrash ? (
              <>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  disabled={isProcessing}
                  onClick={async (e) => {
                    e.stopPropagation();
                    setIsProcessing(true);
                    const toastId = toast.loading("Restoring recording...");
                    try {
                      await restoreRecording(rec.id);

                      await localDeleteRecording(rec.id);

                      queryClient.invalidateQueries({
                        queryKey: [QUERY_KEY.CATEGORY_PAGE],
                      });
                      queryClient.invalidateQueries({ queryKey: ["trash"] });

                      if (typeof window !== "undefined") {
                        window.dispatchEvent(new Event("trigger-sync"));
                      }

                      toast.success("Recording restored", { id: toastId });
                    } catch (err) {
                      toast.error("Failed to restore recording", {
                        id: toastId,
                      });
                      console.error(err);
                      setIsProcessing(false);
                    }
                  }}
                  title="Restore"
                >
                  <RotateCw className="h-4 w-4" />
                </Button>
                <Button
                  variant="destructive"
                  size="icon"
                  className="h-8 w-8"
                  disabled={isProcessing}
                  onClick={(e) => {
                    e.stopPropagation();
                    setConfirmAction("delete");
                  }}
                  title="Delete Permanently"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </>
            ) : (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  asChild
                  className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity text-blue-600 dark:text-blue-400 hover:text-blue-700 hover:bg-blue-500/15 rounded-lg"
                  disabled={isProcessing}
                  title="Edit Recording"
                >
                  <Link
                    href={
                      categoryUrlPath
                        ? `/admin/recordings/${rec.id}/edit?returnTo=${encodeURIComponent(`/admin/content/${categoryUrlPath}`)}`
                        : `/admin/recordings/${rec.id}/edit?returnTo=/admin/content`
                    }
                    prefetch={true}
                  >
                    <Edit2 className="h-4 w-4" />
                  </Link>
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                  disabled={isProcessing}
                  onClick={(e) => {
                    e.stopPropagation();
                    setConfirmAction("trash");
                  }}
                  title="Move to Trash"
                >
                  <Trash2 className="h-4 w-4 text-muted-foreground/80 hover:text-danger" />
                </Button>
              </>
            )}
          </div>
        </TableCell>
        {isProcessing && (
          <td className="absolute inset-0 p-0 pointer-events-none z-10 col-span-7">
            <div className="w-full h-full bg-gradient-to-r from-transparent via-primary/10 to-transparent animate-shimmer" />
          </td>
        )}
      </TableRow>
      {isExpanded && (
        <TableRow className="bg-muted/50/30 text-primary-foreground/10 border-t-0">
          <TableCell colSpan={7} className="p-0">
            <div className="px-14 py-6 animate-in fade-in slide-in-from-top-1 duration-200">
              <div className="grid gap-8 md:grid-cols-3">
                <div className="space-y-4">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Details
                  </h4>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                    <div className="text-muted-foreground">Language(s):</div>
                    <div className="font-medium">
                      {(rec.lang_ids || [])
                        .map(
                          (id) =>
                            dicts.languages.find((l) => l.id === id)?.name,
                        )
                        .filter(Boolean)
                        .join(", ") || "N/A"}
                    </div>
                    <div className="text-muted-foreground">Recorded At:</div>
                    <div className="font-medium">
                      {rec.recorded_at
                        ? new Date(rec.recorded_at).toLocaleString()
                        : "N/A"}
                    </div>
                    <div className="text-muted-foreground">Venue:</div>
                    <div className="font-medium">{venueName || "N/A"}</div>
                    <div className="text-muted-foreground">Type:</div>
                    <div className="font-medium">{typeName || "N/A"}</div>
                    <div className="text-muted-foreground">Audio ID:</div>
                    <div className="font-mono text-xs">
                      {rec.audio_id || "None"}
                    </div>
                  </div>
                  <div className="pt-2">
                    <Button variant="secondary" size="sm" asChild>
                      <Link
                        href={
                          categoryUrlPath
                            ? `/admin/recordings/${rec.id}/edit?returnTo=${encodeURIComponent(`/admin/content/${categoryUrlPath}`)}`
                            : `/admin/recordings/${rec.id}/edit?returnTo=/admin/content`
                        }
                        prefetch={true}
                      >
                        <Edit2 className="mr-2 h-3.5 w-3.5" />
                        Edit Full Details
                      </Link>
                    </Button>
                  </div>
                </div>

                <div className="space-y-4 col-span-2">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Materials
                  </h4>
                  {rec.materials && rec.materials.length > 0 ? (
                    <div className="flex flex-col gap-2">
                      {rec.materials.map((mat) => {
                        const isMaterialHighlighted = Boolean(
                          targetM && Number(targetM) === mat.id,
                        );

                        return (
                          <div
                            key={mat.id}
                            id={`material-${mat.id}`}
                            className={cn(
                              "flex items-center rounded-md border p-2.5 text-sm gap-2 transition-colors",
                              isMaterialHighlighted
                                ? "border-primary bg-primary/20 ring-1 ring-primary text-foreground"
                                : "border-border bg-muted text-muted-foreground",
                            )}
                          >
                            <FileText
                              className={cn(
                                "h-4 w-4 shrink-0",
                                isMaterialHighlighted
                                  ? "text-primary"
                                  : "text-info",
                              )}
                            />
                            <span className="font-medium truncate">
                              {mat.name}
                            </span>
                            <span className="grow" />
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              asChild
                            >
                              <a
                                href={
                                  mat.uri.startsWith("http")
                                    ? mat.uri
                                    : getAssetUrl(mat.uri)
                                }
                                target="_blank"
                                rel="noreferrer"
                              >
                                <ExternalLink className="h-3.5 w-3.5" />
                              </a>
                            </Button>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground/80 italic">
                      No materials associated with this recording.
                    </p>
                  )}
                </div>
              </div>
            </div>
          </TableCell>
        </TableRow>
      )}
      <AlertDialog
        open={confirmAction !== null}
        onOpenChange={(open) => !open && setConfirmAction(null)}
      >
        <AlertDialogContent onClick={(e) => e.stopPropagation()}>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              {confirmAction === "delete"
                ? "Are you sure you want to PERMANENTLY delete this recording? This action cannot be undone."
                : "Are you sure you want to move this recording to trash?"}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={(e) => {
                e.stopPropagation();
                setConfirmAction(null);
              }}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={async (e) => {
                e.stopPropagation();
                await handleConfirmAction();
                setConfirmAction(null);
              }}
              className="bg-danger hover:bg-danger text-white"
            >
              {confirmAction === "delete"
                ? "Delete Permanently"
                : "Move to Trash"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export const RecordingsTable = ({
  recordings: initialRecordings,
  isTrash = false,
  categoryUrlPath,
}: RecordingsTableProps) => {
  const searchParams = useSearchParams();
  const targetQ = searchParams?.get("q") ?? null;
  const targetM = searchParams?.get("m") ?? null;

  const [recordings, setRecordings] = useState(initialRecordings);
  const [hasChanges, setHasChanges] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [searchQuery, setSearchQuery] = useState("");

  const dicts = useDictionaries();

  useEffect(() => {
    if (!targetQ) return;

    let timer: NodeJS.Timeout;
    let timer2: NodeJS.Timeout;
    const animFrame = requestAnimationFrame(() => {
      const element = targetM
        ? document.getElementById(`material-${targetM}`) ||
          document.getElementById(`recording-${targetQ}`)
        : document.getElementById(`recording-${targetQ}`);

      if (!element) return;
      const scrollToEl = () => {
        element.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
      };

      scrollToEl();
      timer = setTimeout(scrollToEl, 250);
      timer2 = setTimeout(scrollToEl, 500);
    });

    return () => {
      animFrame && cancelAnimationFrame(animFrame);
      timer && clearTimeout(timer);
      timer2 && clearTimeout(timer2);
    };
  }, [targetQ, targetM]);

  useEffect(() => {
    setRecordings(initialRecordings);
    setHasChanges(false);
  }, [initialRecordings]);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setRecordings(initialRecordings);
      return;
    }

    const query = searchQuery.toLowerCase().trim();
    const filtered = initialRecordings.filter((r) => {
      const speakerNames = (r.speaker_ids || [])
        .map((id) => dicts.speakers.find((s) => s.id === id)?.name)
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return (
        r.name.toLowerCase().includes(query) || speakerNames.includes(query)
      );
    });
    setRecordings(filtered);
  }, [searchQuery, initialRecordings, dicts.speakers]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    if (searchQuery.trim() || isTrash) return; // Disable reorder while searching or in trash

    const { active, over } = event;
    if (over && active.id !== over.id) {
      setRecordings((items) => reorderItems(items, active.id, over.id));
      setHasChanges(true);
    }
  };

  const handleSaveReorder = async () => {
    startTransition(async () => {
      try {
        const items = recordings
          .map((rec, index) => {
            const newOrderInd = recordings.length - 1 - index;
            return {
              id: rec.id,
              order_ind: rec.order_ind === newOrderInd ? -1 : newOrderInd,
            };
          })
          .filter((item) => item.order_ind !== -1);
        await reorderRecordings(items, categoryUrlPath ?? "");
        setHasChanges(false);
        toast.success("Order saved successfully.");
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to save order.";
        toast.error(message);
      }
    });
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Recordings</h3>
        <div className="flex items-center gap-2">
          <Input
            placeholder="Search recordings..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-64"
          />
          {hasChanges && (
            <Button onClick={handleSaveReorder} disabled={isPending} size="sm">
              {isPending ? "Saving..." : "Save Reorder"}
            </Button>
          )}
        </div>
      </div>
      <div className="rounded-xl border border-border/80 overflow-hidden shadow-2xs bg-card">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
          modifiers={[restrictToVerticalAxis]}
        >
          <Table>
            <TableHeader>
              <TableRow>
                {!isTrash && <TableHead className="w-[50px]"></TableHead>}
                <TableHead>Title</TableHead>
                <TableHead className="hidden sm:table-cell">Speaker</TableHead>
                <TableHead className="hidden md:table-cell">Date</TableHead>
                <TableHead className="hidden lg:table-cell">Type</TableHead>
                <TableHead className="hidden lg:table-cell">Venue</TableHead>
                <TableHead className="w-[80px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <SortableContext
                items={recordings.map((r) => r.id)}
                strategy={verticalListSortingStrategy}
              >
                {recordings.length > 0 ? (
                  recordings.map((rec) => (
                    <SortableRow
                      key={rec.id}
                      {...{
                        rec,
                        dicts,
                        isTrash,
                        targetM,
                        targetQ,
                        categoryUrlPath,
                      }}
                    />
                  ))
                ) : (
                  <TableRow>
                    <TableCell
                      colSpan={7}
                      className="text-center py-8 text-muted-foreground"
                    >
                      {searchQuery
                        ? "No recordings matched your search."
                        : "No recordings found in this section."}
                    </TableCell>
                  </TableRow>
                )}
              </SortableContext>
            </TableBody>
          </Table>
        </DndContext>
      </div>
    </div>
  );
};
