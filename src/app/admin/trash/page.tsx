"use client";

import { useQueryClient } from "@tanstack/react-query";
import { Loader2, Trash2 } from "lucide-react";
import { useState } from "react";
import { clearTrashAction } from "@/app/actions/trash-actions";
import { CategoryTable } from "@/components/admin/category-table";
import { RecordingsTable } from "@/components/admin/recordings-table";
import Loading from "@/components/loading";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { QUERY_KEY } from "@/constants";
import { useTrashPage } from "@/hooks/use-trash";
import { localClearTrash } from "@/lib/idb";
import { toast } from "@/lib/toast";
import type { EnrichedRecording } from "@/types";

const TrashPage = () => {
  const queryClient = useQueryClient();
  const { data, isLoading } = useTrashPage();
  const [isClearing, setIsClearing] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  if (isLoading) {
    return <Loading />;
  }

  if (data?.initialized === false) {
    return (
      <div className="rounded-md border p-4 bg-card text-muted-foreground text-center py-8">
        Trash system not initialized.
      </div>
    );
  }

  const categories = data?.categories || [];
  const recordings = (data?.recordings as EnrichedRecording[]) || [];
  const totalCount = categories.length + recordings.length;

  const handleClearTrash = async () => {
    setIsClearing(true);
    const toastId = toast.loading("Emptying trash...");
    try {
      await clearTrashAction();

      await localClearTrash();

      queryClient.invalidateQueries({ queryKey: ["trash"] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY.ALL_CATEGORIES] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY.CATEGORY_PAGE] });

      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("trigger-sync"));
      }

      toast.success("Trash emptied successfully", { id: toastId });
      setDialogOpen(false);
    } catch (err: unknown) {
      toast.error(
        (err as { message?: string }).message || "Failed to empty trash",
        { id: toastId },
      );
    } finally {
      setIsClearing(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto w-full pb-12">
      {/* Google-like Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-5 rounded-2xl bg-card border border-border/80 shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-500/10 text-slate-600 dark:text-slate-400 flex items-center justify-center shrink-0 border border-slate-500/20 shadow-2xs">
            <Trash2 className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground font-heading">
              Trash & Archive
            </h1>
            <p className="text-xs text-muted-foreground">
              Soft-deleted categories and recordings. Restore items or purge them permanently.
            </p>
          </div>
        </div>

        <AlertDialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <AlertDialogTrigger asChild>
            <Button
              variant="destructive"
              size="sm"
              disabled={totalCount === 0 || isClearing}
              className="rounded-xl h-9 px-4 text-xs font-semibold cursor-pointer shadow-xs"
            >
              {isClearing ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
              ) : (
                <Trash2 className="h-3.5 w-3.5 mr-1.5" />
              )}
              <span>Empty Trash</span>
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent className="rounded-2xl border border-border/80">
            <AlertDialogHeader>
              <AlertDialogTitle>Empty Trash Permanently?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete all {categories.length} category
                {categories.length === 1 ? "" : "ies"} and {recordings.length}{" "}
                recording{recordings.length === 1 ? "" : "s"} from the database
                and move their files to Google Drive trash. This action cannot
                be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isClearing} className="rounded-xl">
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={(e) => {
                  e.preventDefault();
                  handleClearTrash();
                }}
                disabled={isClearing}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-xl"
              >
                {isClearing ? "Emptying..." : "Yes, Empty Trash"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      <Card className="border border-border/80 rounded-2xl shadow-2xs overflow-hidden bg-card">
        <CardHeader className="border-b border-border/60 bg-muted/20 px-6 py-4">
          <CardTitle className="text-sm font-bold tracking-tight text-foreground">
            Items in Trash ({totalCount})
          </CardTitle>
          <CardDescription className="text-xs text-muted-foreground">
            Items can be restored with a single click or permanently purged.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6 space-y-8">
          <CategoryTable categories={categories} isTrash />
          <RecordingsTable recordings={recordings} isTrash />
        </CardContent>
      </Card>
    </div>
  );
};

export default TrashPage;
