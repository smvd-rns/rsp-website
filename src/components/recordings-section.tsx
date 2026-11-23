"use client";

import { Music } from "lucide-react";
import { useMemo, useState } from "react";
import { naturalSortByName, sortByDate, sortByOrderInd } from "@/lib/utils";
import type { EnrichedRecording } from "@/types";
import { DownloadRecordingsModal } from "./download-recordings-modal";
import { RecordingCards } from "./recording-cards";
import {
  RecordingSortControls,
  type SortOption,
} from "./recording-sort-controls";

interface RecordingListProps {
  recordings: EnrichedRecording[];
  categoryName: string;
}

export const RecordingsSection = ({
  recordings,
  categoryName,
}: RecordingListProps) => {
  "use no memo";
  const [sortBy, setSortBy] = useState<SortOption>("name");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [isDownloadModalOpen, setIsDownloadModalOpen] = useState(false);

  const sortedRecordings = useMemo(() => {
    const order = sortOrder === "asc" ? 1 : -1;
    switch (sortBy) {
      case "name":
        return recordings.toSorted(naturalSortByName(order));
      case "date":
        return recordings.toSorted(
          sortByDate(order, "created_at" as keyof EnrichedRecording),
        );
      case "order_ind":
        return recordings.toSorted((a, b) => {
          const diff = (a.order_ind ?? 0) - (b.order_ind ?? 0);
          if (diff !== 0) return order * diff;
          return naturalSortByName(order)(a, b);
        });
    }
  }, [recordings, sortBy, sortOrder]);

  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-xl font-bold font-heading flex items-center gap-2">
        <Music className="w-5 h-5 text-primary" />
        Discourses & Recordings
      </h2>
      <div className="flex flex-col gap-4">
        <RecordingSortControls
          sortBy={sortBy}
          setSortBy={setSortBy}
          sortOrder={sortOrder}
          setSortOrder={setSortOrder}
          totalCount={recordings.length}
          onOpenDownloadModal={() => setIsDownloadModalOpen(true)}
          viewMode={viewMode}
          setViewMode={setViewMode}
        />

        <RecordingCards {...{ sortedRecordings, viewMode }} />
      </div>

      {isDownloadModalOpen && (
        <DownloadRecordingsModal
          isOpen={isDownloadModalOpen}
          onClose={() => setIsDownloadModalOpen(false)}
          recordings={sortedRecordings}
          categoryName={categoryName}
        />
      )}
    </section>
  );
};
