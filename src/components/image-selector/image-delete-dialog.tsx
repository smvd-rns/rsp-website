import { useQueryClient } from "@tanstack/react-query";
import type { Dispatch, SetStateAction } from "react";
import { deleteImage } from "@/app/actions/image-actions";
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
import { STORE } from "@/constants";
import { IMAGES_QUERY_KEY } from "@/hooks/use-images";
import { getDB } from "@/lib/idb";
import { toast } from "@/lib/toast";

interface ImageDeleteDialogProps {
  setIsDeleting: Dispatch<SetStateAction<number | null>>;
  imageToDelete: number | null;
  setImageToDelete: Dispatch<SetStateAction<number | null>>;
}

export const ImageDeleteDialog = ({
  setIsDeleting,
  imageToDelete,
  setImageToDelete,
}: ImageDeleteDialogProps) => {
  const queryClient = useQueryClient();
  const confirmDeleteImage = async (id: number) => {
    setIsDeleting(id);
    try {
      const res = await deleteImage(id);
      if (res && !res.success) {
        throw new Error(res.error);
      }
      const db = await getDB();
      if (db) {
        await db.delete(STORE.IMAGES, id);
      }
      toast.success("Image deleted");
      await queryClient.invalidateQueries({ queryKey: IMAGES_QUERY_KEY });
    } catch (error) {
      toast.error(
        `Failed to delete: ${error instanceof Error ? error.message : "An error occurred"}`,
      );
    } finally {
      setIsDeleting(null);
    }
  };

  return (
    <AlertDialog
      open={imageToDelete !== null}
      onOpenChange={(o) => !o && setImageToDelete(null)}
    >
      <AlertDialogContent onClick={(e) => e.stopPropagation()}>
        <AlertDialogHeader>
          <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete this image? This action cannot be
            undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel
            onClick={(e) => {
              e.stopPropagation();
              setImageToDelete(null);
            }}
          >
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            className="bg-danger hover:bg-danger text-white"
            onClick={async (e) => {
              e.stopPropagation();
              if (imageToDelete !== null) {
                await confirmDeleteImage(imageToDelete);
                setImageToDelete(null);
              }
            }}
          >
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
