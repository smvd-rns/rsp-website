import { useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { type Dispatch, type SetStateAction, useState } from "react";
import { updateImageDescription } from "@/app/actions/image-actions";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { IMAGES_QUERY_KEY } from "@/hooks/use-images";
import { toast } from "@/lib/toast";
import { Button } from "../ui/button";
import { Input } from "../ui/input";

interface ImageEditDescriptionDialogProps {
  editingImageId: number | null;
  setEditingImageId: Dispatch<SetStateAction<number | null>>;
  editingDescription: string;
  setEditingDescription: Dispatch<SetStateAction<string>>;
}

export const ImageEditDescriptionDialog = ({
  editingDescription,
  setEditingDescription,
  editingImageId,
  setEditingImageId,
}: ImageEditDescriptionDialogProps) => {
  const queryClient = useQueryClient();
  const [isUpdatingDescription, setIsUpdatingDescription] = useState(false);

  const handleUpdateDescription = async () => {
    if (editingImageId === null || !editingDescription.trim()) return;
    setIsUpdatingDescription(true);
    try {
      const res = await updateImageDescription(
        editingImageId,
        editingDescription,
      );
      if (res && !res.success) {
        throw new Error(res.error);
      }
      toast.success("Description updated successfully!");
      await queryClient.invalidateQueries({ queryKey: IMAGES_QUERY_KEY });
      setEditingImageId(null);
      setEditingDescription("");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to update description",
      );
    } finally {
      setIsUpdatingDescription(false);
    }
  };

  return (
    <Dialog
      open={editingImageId !== null}
      onOpenChange={(o) => !o && setEditingImageId(null)}
    >
      <DialogContent
        className="sm:max-w-md"
        onClick={(e) => e.stopPropagation()}
      >
        <DialogHeader>
          <DialogTitle>Edit Image Description</DialogTitle>
          <DialogDescription>
            Update the description for this image in the library.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <Input
            placeholder="Image description..."
            value={editingDescription}
            onChange={(e) => setEditingDescription(e.target.value)}
            className="bg-muted/50 border-border"
            onKeyDown={(e) => {
              if (
                e.key === "Enter" &&
                editingDescription.trim() &&
                !isUpdatingDescription
              ) {
                handleUpdateDescription();
              }
            }}
          />
        </div>
        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => setEditingImageId(null)}
            disabled={isUpdatingDescription}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleUpdateDescription}
            disabled={isUpdatingDescription || !editingDescription.trim()}
          >
            {isUpdatingDescription ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              "Save Changes"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
