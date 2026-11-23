"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

interface BannerEditDescriptionDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  description: string;
  onSave: (newDesc: string) => Promise<void>;
}

export const BannerEditDescriptionDialog = ({
  isOpen,
  onOpenChange,
  description,
  onSave,
}: BannerEditDescriptionDialogProps) => {
  const [val, setVal] = useState(description);
  const [loading, setLoading] = useState(false);

  const handleOpenChange = (open: boolean) => {
    if (open) setVal(description);
    onOpenChange(open);
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      await onSave(val);
      onOpenChange(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Banner Artwork Description</DialogTitle>
          <DialogDescription>
            Update the title/description used to identify this banner image.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <Input
            value={val}
            onChange={(e) => setVal(e.target.value)}
            placeholder="e.g. Janmashtami 2026 Golden Lotus Banner"
            disabled={loading}
          />
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={loading || !val.trim()}>
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
