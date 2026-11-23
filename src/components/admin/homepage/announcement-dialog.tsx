"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { Announcement } from "@/types";
import { AnnouncementForm } from "./announcement-form";

interface AnnouncementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  announcement?: Announcement | null;
  onSuccess: () => void;
}

export const AnnouncementDialog = ({
  open,
  onOpenChange,
  announcement,
  onSuccess,
}: AnnouncementDialogProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-6xl w-[95vw] max-h-[92vh] overflow-y-auto p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">
            {announcement
              ? "Edit Announcement Banner"
              : "New Announcement Banner"}
          </DialogTitle>
          <DialogDescription className="text-xs">
            Configure top announcement bar, festival banners, and guidance
            spotlights with live multi-viewport preview.
          </DialogDescription>
        </DialogHeader>

        <AnnouncementForm
          announcement={announcement}
          onSuccess={() => {
            onSuccess();
            onOpenChange(false);
          }}
          isModal={true}
        />
      </DialogContent>
    </Dialog>
  );
};
