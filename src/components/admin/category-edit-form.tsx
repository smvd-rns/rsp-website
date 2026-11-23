"use client";

import { useQueryClient } from "@tanstack/react-query";
import {
  CheckCircle2,
  CloudUpload,
  FolderTree,
  Globe,
  Image as ImageIcon,
  Loader2,
  Lock,
  Shield,
  Sparkles,
  Trash2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import {
  restoreCategory,
  softDeleteCategory,
  updateCategory,
} from "@/app/actions/category-actions";
import { deleteCategoryPermanentlyAction } from "@/app/actions/trash-actions";
import { CategoryCombobox } from "@/components/admin/category-combobox";
import { FormErrorAlert } from "@/components/admin/form-error-alert";
import {
  ImageSelector,
  type SelectedImageResult,
} from "@/components/image-selector";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { QUERY_KEY, STORE } from "@/constants";
import { useCategories } from "@/hooks/use-categories";
import { useImages } from "@/hooks/use-images";
import { useRoles } from "@/hooks/use-roles";
import { getDB, localDeleteCategory, localTrashCategory } from "@/lib/idb";
import { getImageUrl } from "@/lib/image-utils";
import { toast } from "@/lib/toast";
import { buildCategoryUrlPath, categoryPath } from "@/lib/utils";
import type { Category } from "@/types";

const getRoleStyling = (roleName: string) => {
  const lower = roleName.toLowerCase();
  if (lower.includes("admin")) {
    return {
      activeBorder:
        "border-purple-400/80 bg-purple-500/10 text-purple-900 dark:text-purple-200 shadow-purple-500/10",
      accent: "text-purple-600 dark:text-purple-400",
      dot: "bg-purple-500",
    };
  }
  if (lower.includes("student")) {
    return {
      activeBorder:
        "border-sky-400/80 bg-sky-500/10 text-sky-900 dark:text-sky-200 shadow-sky-500/10",
      accent: "text-sky-600 dark:text-sky-400",
      dot: "bg-sky-500",
    };
  }
  if (lower.includes("brahmacari")) {
    return {
      activeBorder:
        "border-amber-400/80 bg-amber-500/10 text-amber-900 dark:text-amber-200 shadow-amber-500/10",
      accent: "text-amber-600 dark:text-amber-400",
      dot: "bg-amber-500",
    };
  }
  if (lower.includes("leader") || lower.includes("manager")) {
    return {
      activeBorder:
        "border-indigo-400/80 bg-indigo-500/10 text-indigo-900 dark:text-indigo-200 shadow-indigo-500/10",
      accent: "text-indigo-600 dark:text-indigo-400",
      dot: "bg-indigo-500",
    };
  }
  if (lower.includes("visitor")) {
    return {
      activeBorder:
        "border-emerald-400/80 bg-emerald-500/10 text-emerald-900 dark:text-emerald-200 shadow-emerald-500/10",
      accent: "text-emerald-600 dark:text-emerald-400",
      dot: "bg-emerald-500",
    };
  }
  return {
    activeBorder:
      "border-rose-400/80 bg-rose-500/10 text-rose-900 dark:text-rose-200 shadow-rose-500/10",
    accent: "text-rose-600 dark:text-rose-400",
    dot: "bg-rose-500",
  };
};

interface CategoryEditFormProps {
  category: Category;
  initialRoles?: number[];
  onSuccess?: () => void;
  onCancel?: () => void;
}

export const CategoryEditForm = ({
  category,
  initialRoles = [],
  onSuccess,
  onCancel,
}: CategoryEditFormProps) => {
  const queryClient = useQueryClient();
  const router = useRouter();
  const { data: categories } = useCategories();
  const { data: roles } = useRoles();
  const { data: allImages = [] } = useImages();
  const [selectedRoles, setSelectedRoles] = useState<number[]>(initialRoles);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [parentRoles, setParentRoles] = useState<number[] | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittingStep, setSubmittingStep] = useState<string>("");
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  // Image Selection State (Supports Local Staged File or Library ID)
  const [selectedImageId, setSelectedImageId] = useState<number | null>(
    category.img_id
      ? Number(category.img_id)
      : category.img
        ? Number(category.img)
        : null,
  );
  const [stagedImageFile, setStagedImageFile] = useState<File | null>(null);
  const [stagedPreviewUrl, setStagedPreviewUrl] = useState<string | null>(null);
  const [stagedDescription, setStagedDescription] = useState<string>("");

  const [selectedParent, setSelectedParent] = useState<Category>();
  const [name, setName] = useState(category.name);
  const [isInitialized, setIsInitialized] = useState(false);

  const handleParentChange = useCallback((parent?: Category) => {
    if (!parent) {
      setParentRoles(null);
      return;
    }
    if (parent.allowed_roles) {
      setParentRoles(parent.allowed_roles);
    }
  }, []);

  useEffect(() => {
    if (categories && !isInitialized) {
      const pathStr = category.path as string;
      if (pathStr) {
        const parts = pathStr.split(".");
        const parentId = parseInt(parts[parts.length - 1], 10);
        const parent = categories.find((c) => c.id === parentId);
        if (parent) {
          setSelectedParent(parent);
          handleParentChange(parent);
        }
      }
      setIsInitialized(true);
    }
  }, [categories, isInitialized, category, handleParentChange]);

  const toggleRole = (roleId: number) => {
    if (parentRoles && !parentRoles.includes(roleId)) {
      return;
    }
    setSelectedRoles((prev) =>
      prev.includes(roleId)
        ? prev.filter((id) => id !== roleId)
        : [...prev, roleId],
    );
  };

  const handleImageSelect = (result: SelectedImageResult) => {
    if (result.file) {
      setStagedImageFile(result.file);
      setStagedPreviewUrl(result.previewUrl || null);
      setStagedDescription(result.description || result.file.name);
    } else if (result.id) {
      setSelectedImageId(result.id);
      setStagedImageFile(null);
      setStagedPreviewUrl(result.previewUrl || null);
      setStagedDescription("");
    }
  };

  async function handleDelete() {
    setIsSubmitting(true);
    const isInTrash = (category.url_path as string).startsWith("trash");
    const toastId = toast.loading(
      isInTrash
        ? "Deleting category permanently..."
        : "Moving category to Trash...",
    );
    try {
      if (isInTrash) {
        await deleteCategoryPermanentlyAction(category.id);
      } else {
        await softDeleteCategory(category.id);
      }

      if (isInTrash) {
        await localDeleteCategory(category.id);
      } else {
        await localTrashCategory(category.id);
      }

      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("trigger-sync"));
      }

      toast.success(
        isInTrash ? "Category permanently deleted" : "Category moved to Trash",
        { id: toastId },
      );

      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: [QUERY_KEY.ALL_CATEGORIES] });
        queryClient.invalidateQueries({ queryKey: [QUERY_KEY.CATEGORY_PAGE] });
        queryClient.invalidateQueries({ queryKey: ["trash"] });
      }, 100);

      if (onSuccess) {
        onSuccess();
      } else {
        let targetUrl = "/admin/content";
        if (isInTrash) {
          targetUrl = "/admin/trash";
        } else {
          const urlPath = category.url_path as string;
          const parentUrlPath = urlPath.includes(".")
            ? urlPath.substring(0, urlPath.lastIndexOf("."))
            : "";
          targetUrl = parentUrlPath
            ? `/admin/content/${categoryPath(parentUrlPath)}`
            : "/admin/content";
        }

        router.push(targetUrl);
      }
    } catch (err: unknown) {
      toast.error(
        (err as { message?: string }).message || "Failed to delete category",
        { id: toastId },
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg(null);

    const trimmedName = name.trim();

    if (trimmedName.includes(".") || trimmedName.includes("/")) {
      const errorMessage = `Category name "${trimmedName}" cannot contain "." or "/"`;
      setErrorMsg(errorMessage);
      toast.error(errorMessage);
      setIsSubmitting(false);
      return;
    }

    try {
      let finalImgId = selectedImageId;

      // 1. If an image was staged locally, upload it to Google Drive now!
      if (stagedImageFile) {
        setSubmittingStep("Uploading image to Google Drive...");
        const uploadToast = toast.loading(
          "Uploading banner image to Google Drive...",
        );

        try {
          const uploadData = new FormData();
          uploadData.append("file", stagedImageFile);
          uploadData.append("description", stagedDescription || trimmedName);
          uploadData.append("action", "upload-image");

          const res = await fetch("/api/upload/google-drive", {
            method: "POST",
            body: uploadData,
          });

          const json = await res.json();
          if (!res.ok || !json.success) {
            throw new Error(
              json.error || "Failed to upload image to Google Drive",
            );
          }

          finalImgId = Number(json.id || json.data?.id);
          toast.success("Image uploaded to Google Drive successfully!", {
            id: uploadToast,
          });
        } catch (uploadErr) {
          const uploadMsg =
            uploadErr instanceof Error
              ? uploadErr.message
              : "Failed to upload image";
          toast.error(uploadMsg, { id: uploadToast });
          setErrorMsg(uploadMsg);
          setIsSubmitting(false);
          setSubmittingStep("");
          return;
        }
      }

      setSubmittingStep("Updating category and syncing Google Drive...");

      // Local IndexedDB optimistic update
      const db = await getDB();
      if (db) {
        try {
          const tx = db.transaction([STORE.CATEGORIES], "readwrite");
          const store = tx.objectStore(STORE.CATEGORIES);
          const existing = await store.get(category.id);
          if (existing) {
            existing.name = trimmedName;
            existing.img_id = finalImgId;
            existing.allowed_roles = selectedRoles;

            const newPath = selectedParent
              ? `${selectedParent.path as string}.${selectedParent.id}`.replace(
                  /^\./,
                  "",
                )
              : "";
            existing.path = newPath;

            const newUrlPath = buildCategoryUrlPath(
              trimmedName,
              selectedParent?.url_path as string,
            );
            existing.url_path = newUrlPath;

            await store.put(existing);
          }
          await tx.done;
        } catch (idbErr) {
          console.warn("Optimistic IDB update skipped:", idbErr);
        }
      }

      // Invalidate relevant React Query keys
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY.ALL_CATEGORIES] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY.CATEGORY_PAGE] });

      let updateSuccess = false;
      let updateError = "";

      try {
        const patchRes = await fetch("/api/admin/categories", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: category.id,
            name: trimmedName,
            parent: selectedParent,
            roles: selectedRoles,
            imgId: finalImgId,
          }),
        });
        const patchJson = await patchRes.json();
        if (patchRes.ok && patchJson.success) {
          updateSuccess = true;
        } else {
          updateError = patchJson.error || "Failed to update category";
        }
      } catch {
        // Fallback to server action
        try {
          const res = await updateCategory(category.id, {
            name: trimmedName,
            parent: selectedParent,
            roles: selectedRoles,
            imgId: finalImgId,
          });
          if (res?.success) {
            updateSuccess = true;
          } else {
            updateError = res?.error || "Failed to update category";
          }
        } catch (actionErr: unknown) {
          updateError =
            actionErr instanceof Error
              ? actionErr.message
              : "Failed to update category";
        }
      }

      if (!updateSuccess) {
        setErrorMsg(updateError || "Failed to update category");
        toast.error(updateError || "Failed to update category");
        setIsSubmitting(false);
        setSubmittingStep("");
        return;
      }

      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("trigger-sync"));
      }

      toast.success("Category updated successfully");
      if (onSuccess) {
        onSuccess();
      } else {
        router.push(
          selectedParent
            ? `/admin/content/${categoryPath(selectedParent.url_path as string)}`
            : "/admin/content",
        );
      }
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Failed to update category";
      setErrorMsg(msg);
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
      setSubmittingStep("");
    }
  }

  const hasImage = Boolean(stagedPreviewUrl || selectedImageId);
  const currentLibraryImage = allImages.find(
    (img) => img.id === selectedImageId,
  );
  const resolvedBannerUrl =
    stagedPreviewUrl ||
    currentLibraryImage?.url ||
    (currentLibraryImage?.webp && !/^\d+$/.test(currentLibraryImage.webp)
      ? `https://lh3.googleusercontent.com/d/${currentLibraryImage.webp}=s1600`
      : null) ||
    (selectedImageId ? getImageUrl("img", selectedImageId, "webp") : null);

  const liveUrlPath = name.trim()
    ? buildCategoryUrlPath(name, selectedParent?.url_path as string)
    : (selectedParent?.url_path as string) || "";

  return (
    <form onSubmit={handleSubmit} className="space-y-7">
      <FormErrorAlert error={errorMsg} title="Error" />

      {/* ------------------------------------------------------------- */}
      {/* 1. CARD 1: BANNER ARTWORK (EMERALD ACCENT)                    */}
      {/* ------------------------------------------------------------- */}
      <Card className="border border-emerald-500/25 hover:border-emerald-500/40 rounded-3xl shadow-sm hover:shadow-md transition-all overflow-hidden bg-card">
        <CardHeader className="border-b border-emerald-500/15 bg-gradient-to-r from-emerald-500/10 via-teal-500/5 to-transparent px-6 py-4.5 flex flex-row items-center gap-3.5">
          <div className="w-9 h-9 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/25 shadow-2xs">
            <ImageIcon className="h-4.5 w-4.5" />
          </div>
          <div>
            <CardTitle className="text-base font-bold tracking-tight text-foreground flex items-center gap-2">
              <span>Category Banner Artwork</span>
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
              Shown across portal discourse listings and mobile cards.
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="p-6 sm:p-7">
          {hasImage ? (
            <div className="flex flex-col md:flex-row items-center justify-between gap-5 p-5 rounded-2xl border border-emerald-500/25 bg-emerald-500/5 shadow-2xs">
              <div className="flex items-center gap-4 w-full md:w-auto">
                <div className="relative h-22 w-40 rounded-xl overflow-hidden border border-emerald-500/30 shrink-0 shadow-md bg-muted/40 group">
                  <img
                    src={resolvedBannerUrl || "/rsp.webp"}
                    alt={currentLibraryImage?.description || "Category Banner"}
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                    onError={(e) => {
                      if (!e.currentTarget.src.endsWith("/rsp.webp")) {
                        e.currentTarget.src = "/rsp.webp";
                      }
                    }}
                  />
                </div>

                <div className="flex flex-col gap-1.5 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-bold text-foreground">
                      {stagedImageFile
                        ? "Staged Local Banner"
                        : "Library Banner"}
                    </span>
                    {stagedImageFile ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-blue-500/15 text-blue-700 dark:text-blue-300 border border-blue-500/25">
                        <CloudUpload className="w-3.5 h-3.5" />
                        Ready to Upload on Save
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/25">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Asset #{selectedImageId}
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground truncate max-w-sm">
                    {stagedImageFile
                      ? stagedDescription || stagedImageFile.name
                      : currentLibraryImage?.description ||
                        "Current active banner artwork"}
                  </span>
                </div>
              </div>

              <div className="w-full md:w-auto shrink-0 flex items-center justify-end">
                <ImageSelector
                  onSelect={handleImageSelect}
                  currentImageId={selectedImageId}
                  triggerText="Change Banner"
                />
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center border-2 border-dashed border-emerald-500/35 hover:border-emerald-500/60 rounded-2xl p-8 bg-gradient-to-b from-emerald-500/5 via-card to-card transition-all text-center">
              <ImageIcon className="h-8 w-8 text-emerald-600 mb-2" />
              <p className="text-xs font-semibold text-foreground mb-3">
                No banner assigned
              </p>
              <ImageSelector
                onSelect={handleImageSelect}
                currentImageId={selectedImageId}
                triggerText="Select Banner"
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* ------------------------------------------------------------- */}
      {/* 2. CARD 2: DETAILS & HIERARCHY (AMBER ACCENT)                 */}
      {/* ------------------------------------------------------------- */}
      <Card className="border border-amber-500/25 hover:border-amber-500/40 rounded-3xl shadow-sm hover:shadow-md transition-all overflow-hidden bg-card">
        <CardHeader className="border-b border-amber-500/15 bg-gradient-to-r from-amber-500/10 via-orange-500/5 to-transparent px-6 py-4.5 flex flex-row items-center gap-3.5">
          <div className="w-9 h-9 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 border border-amber-500/25 shadow-2xs">
            <FolderTree className="h-4.5 w-4.5" />
          </div>
          <div>
            <CardTitle className="text-base font-bold tracking-tight text-foreground flex items-center gap-2">
              <span>Category Title & Location</span>
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
              Modify category title or move it to a different parent folder.
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="p-6 sm:p-7 space-y-6">
          <div className="space-y-2">
            <Label
              htmlFor="edit-name"
              className="text-xs font-bold text-foreground uppercase tracking-wider"
            >
              Category Name
            </Label>
            <Input
              id="edit-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="h-11 rounded-xl border-border/90 bg-background text-sm font-medium focus-visible:ring-primary shadow-2xs"
            />

            <div className="flex items-center gap-2 p-2.5 rounded-xl bg-muted/40 border border-border/70 text-xs text-muted-foreground">
              <Globe className="w-3.5 h-3.5 text-primary shrink-0" />
              <span className="font-semibold text-foreground">Live URL:</span>
              <span className="font-mono text-primary text-[11px] break-all">
                /content/{liveUrlPath ? `${liveUrlPath}/` : "..."}
              </span>
            </div>
          </div>

          <div className="space-y-2 pt-2 border-t border-border/50">
            <Label className="text-xs font-bold text-foreground uppercase tracking-wider">
              Parent Category (Folder Tree Location)
            </Label>
            <CategoryCombobox
              categories={
                categories?.filter(
                  (c) =>
                    !(c.url_path as string).startsWith(
                      category.url_path as string,
                    ),
                ) || []
              }
              value={selectedParent?.id || null}
              onChange={(id) => {
                const cat = categories?.find((c) => c.id === id);
                setSelectedParent(cat);
                handleParentChange(cat);
              }}
              excludeId={category.id}
            />
          </div>
        </CardContent>
      </Card>

      {/* ------------------------------------------------------------- */}
      {/* 3. CARD 3: ROLE PERMISSIONS (PURPLE ACCENT)                   */}
      {/* ------------------------------------------------------------- */}
      <Card className="border border-purple-500/25 hover:border-purple-500/40 rounded-3xl shadow-sm hover:shadow-md transition-all overflow-hidden bg-card">
        <CardHeader className="border-b border-purple-500/15 bg-gradient-to-r from-purple-500/10 via-pink-500/5 to-transparent px-6 py-4.5 flex flex-row items-center gap-3.5">
          <div className="w-9 h-9 rounded-xl bg-purple-500/15 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0 border border-purple-500/25 shadow-2xs">
            <Shield className="h-4.5 w-4.5" />
          </div>
          <div>
            <CardTitle className="text-base font-bold tracking-tight text-foreground flex items-center gap-2">
              <span>Access Control Permissions</span>
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
              Select which groups have access to discourses in this category.
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="p-6 sm:p-7">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3.5">
            {!roles ? (
              <div className="col-span-4 p-8 text-center text-xs text-muted-foreground">
                Loading roles...
              </div>
            ) : (
              roles.map((role) => {
                const isDisabled =
                  parentRoles !== null && !parentRoles.includes(role.id);
                const isChecked = selectedRoles.includes(role.id);
                const style = getRoleStyling(role.name);

                return (
                  <label
                    key={role.id}
                    htmlFor={`edit-role-${role.id}`}
                    className={`relative flex items-center gap-3 p-3.5 rounded-2xl border transition-all cursor-pointer select-none group shadow-2xs ${
                      isChecked
                        ? `${style.activeBorder} shadow-sm scale-[1.01]`
                        : "border-border/80 bg-muted/20 hover:bg-muted/40 hover:border-border"
                    } ${isDisabled ? "opacity-40 cursor-not-allowed pointer-events-none" : ""}`}
                  >
                    <Checkbox
                      id={`edit-role-${role.id}`}
                      checked={isChecked}
                      onCheckedChange={() => toggleRole(role.id)}
                      disabled={isDisabled}
                      className="rounded-lg h-4.5 w-4.5"
                    />
                    <div className="flex flex-col min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className={`w-2 h-2 rounded-full ${style.dot}`} />
                        <span className="text-xs font-bold leading-tight capitalize truncate text-foreground">
                          {role.name}
                        </span>
                      </div>
                      <span className="text-[10px] text-muted-foreground">
                        {isChecked ? "Access Granted" : "Restricted"}
                      </span>
                    </div>

                    {isDisabled && (
                      <Lock className="w-3.5 h-3.5 text-muted-foreground/60 ml-auto shrink-0" />
                    )}
                  </label>
                );
              })
            )}
          </div>
        </CardContent>
      </Card>

      {/* ------------------------------------------------------------- */}
      {/* 4. FOOTER ACTIONS                                             */}
      {/* ------------------------------------------------------------- */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-5 rounded-3xl bg-card border border-border/80 shadow-sm">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <AlertDialog
            open={showDeleteDialog}
            onOpenChange={setShowDeleteDialog}
          >
            <AlertDialogTrigger asChild>
              <Button
                type="button"
                variant="destructive"
                disabled={isSubmitting}
                className="rounded-xl text-xs font-semibold cursor-pointer"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                {(category.url_path as string).startsWith("trash")
                  ? "Delete Permanently"
                  : "Move to Trash"}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  {(category.url_path as string).startsWith("trash")
                    ? "Are you sure you want to PERMANENTLY delete this category, all its subcategories, and all recordings inside it? This action cannot be undone."
                    : "Moving this category to Trash will also move all its subcategories and all recordings inside it to Trash both on the site and in Google Drive. You can restore them later from the Trash page."}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDelete}
                  className="bg-danger hover:bg-danger text-white"
                >
                  {(category.url_path as string).startsWith("trash")
                    ? "Delete"
                    : "Move to Trash"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          {(category.url_path as string).startsWith("trash") && (
            <Button
              type="button"
              variant="outline"
              disabled={isSubmitting}
              className="rounded-xl text-xs font-semibold"
              onClick={async () => {
                setIsSubmitting(true);
                const toastId = toast.loading("Restoring category...");
                try {
                  await restoreCategory(category.id);
                  toast.success("Category restored", { id: toastId });
                  router.push("/content");
                } catch (err: unknown) {
                  toast.error(
                    (err as { message?: string }).message ||
                      "Failed to restore category",
                    { id: toastId },
                  );
                } finally {
                  setIsSubmitting(false);
                }
              }}
            >
              Restore Category
            </Button>
          )}
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
          {onCancel && (
            <Button
              type="button"
              variant="outline"
              disabled={isSubmitting}
              onClick={onCancel}
              className="rounded-xl text-xs font-semibold cursor-pointer h-10 px-4"
            >
              Cancel
            </Button>
          )}

          <Button
            type="submit"
            disabled={isSubmitting}
            className="w-full sm:w-auto rounded-xl bg-gradient-to-r from-amber-500 via-orange-500 to-primary hover:from-amber-600 hover:via-orange-600 hover:to-primary text-white font-bold px-7 h-10 shadow-lg shadow-orange-500/25 hover:shadow-orange-500/40 hover:-translate-y-0.5 active:translate-y-0 transition-all text-xs sm:text-sm flex items-center justify-center gap-2 cursor-pointer min-w-[170px]"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                <span>{submittingStep || "Saving Changes..."}</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>Save Changes</span>
              </>
            )}
          </Button>
        </div>
      </div>
    </form>
  );
};
