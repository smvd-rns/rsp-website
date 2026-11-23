"use client";

import { useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  CheckCircle2,
  CloudUpload,
  FolderTree,
  Globe,
  HardDrive,
  Image as ImageIcon,
  Loader2,
  Lock,
  Shield,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { createCategory } from "@/app/actions/category-actions";
import { CategoryCombobox } from "@/components/admin/category-combobox";
import { FormErrorAlert } from "@/components/admin/form-error-alert";
import {
  ImageSelector,
  type SelectedImageResult,
} from "@/components/image-selector";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ADMIN_ROLE_ID, QUERY_KEY, STORE } from "@/constants";
import { useCategories } from "@/hooks/use-categories";
import { useImages } from "@/hooks/use-images";
import { useRoles } from "@/hooks/use-roles";
import { getDB } from "@/lib/idb";
import { getImageUrl } from "@/lib/image-utils";
import { toast } from "@/lib/toast";
import {
  buildCategoryUrlPath,
  categoryPath,
  pathToUrlPath,
  triggerSync,
} from "@/lib/utils";
import type { Category } from "@/types";

const getRoleStyling = (roleName: string) => {
  const lower = roleName.toLowerCase();
  if (lower.includes("admin")) {
    return {
      activeBorder:
        "border-purple-400/80 bg-purple-500/10 text-purple-900 dark:text-purple-200 shadow-purple-500/10",
      chip: "bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300 border-purple-200",
      accent: "text-purple-600 dark:text-purple-400",
      dot: "bg-purple-500",
    };
  }
  if (lower.includes("student")) {
    return {
      activeBorder:
        "border-sky-400/80 bg-sky-500/10 text-sky-900 dark:text-sky-200 shadow-sky-500/10",
      chip: "bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300 border-sky-200",
      accent: "text-sky-600 dark:text-sky-400",
      dot: "bg-sky-500",
    };
  }
  if (lower.includes("brahmacari")) {
    return {
      activeBorder:
        "border-amber-400/80 bg-amber-500/10 text-amber-900 dark:text-amber-200 shadow-amber-500/10",
      chip: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300 border-amber-200",
      accent: "text-amber-600 dark:text-amber-400",
      dot: "bg-amber-500",
    };
  }
  if (lower.includes("leader") || lower.includes("manager")) {
    return {
      activeBorder:
        "border-indigo-400/80 bg-indigo-500/10 text-indigo-900 dark:text-indigo-200 shadow-indigo-500/10",
      chip: "bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 border-indigo-200",
      accent: "text-indigo-600 dark:text-indigo-400",
      dot: "bg-indigo-500",
    };
  }
  if (lower.includes("visitor")) {
    return {
      activeBorder:
        "border-emerald-400/80 bg-emerald-500/10 text-emerald-900 dark:text-emerald-200 shadow-emerald-500/10",
      chip: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-200",
      accent: "text-emerald-600 dark:text-emerald-400",
      dot: "bg-emerald-500",
    };
  }
  return {
    activeBorder:
      "border-rose-400/80 bg-rose-500/10 text-rose-900 dark:text-rose-200 shadow-rose-500/10",
    chip: "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300 border-rose-200",
    accent: "text-rose-600 dark:text-rose-400",
    dot: "bg-rose-500",
  };
};

const NewCategoryPage = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedPath = searchParams.get("p");
  const preselectedUrlPath = preselectedPath
    ? pathToUrlPath(preselectedPath)
    : null;
  const queryClient = useQueryClient();
  const { data: categories, isLoading: isLoadingCats } = useCategories();
  const { data: roles } = useRoles();
  const { data: allImages = [] } = useImages();
  const [selectedRoles, setSelectedRoles] = useState<number[]>([ADMIN_ROLE_ID]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [parentRoles, setParentRoles] = useState<number[] | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittingStep, setSubmittingStep] = useState<string>("");

  // Category Name State for Live Slug Preview
  const [categoryName, setCategoryName] = useState<string>("");

  // Image Selection State (Supports Local Staged File or Library ID)
  const [selectedImageId, setSelectedImageId] = useState<number | null>(null);
  const [stagedImageFile, setStagedImageFile] = useState<File | null>(null);
  const [stagedPreviewUrl, setStagedPreviewUrl] = useState<string | null>(null);
  const [stagedDescription, setStagedDescription] = useState<string>("");

  const [selectedParent, setSelectedParent] = useState<Category | null>(null);

  const handleParentChange = useCallback((parent: Category | null) => {
    if (!parent) {
      setParentRoles(null);
      setSelectedRoles([ADMIN_ROLE_ID]);
      return;
    }

    if (parent.allowed_roles) {
      setParentRoles(parent.allowed_roles);
      setSelectedRoles(parent.allowed_roles);
    }
  }, []);

  useEffect(() => {
    if (categories && preselectedUrlPath && !selectedParent) {
      const parent = categories.find((c) => c.url_path === preselectedUrlPath);
      if (parent) {
        setSelectedParent(parent);
        handleParentChange(parent);
      }
    }
  }, [categories, preselectedUrlPath, selectedParent, handleParentChange]);

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
      setSelectedImageId(null);
    } else if (result.id) {
      setSelectedImageId(result.id);
      setStagedImageFile(null);
      setStagedPreviewUrl(result.previewUrl || null);
      setStagedDescription("");
    }
  };

  // Compute live URL slug preview
  const liveUrlPath = categoryName.trim()
    ? buildCategoryUrlPath(categoryName, selectedParent?.url_path as string)
    : (selectedParent?.url_path as string) || "";

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

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg(null);

    const name = categoryName.trim();

    if (!selectedImageId && !stagedImageFile) {
      setErrorMsg("Please select or crop an image banner for this category");
      setIsSubmitting(false);
      return;
    }

    if (!name) {
      setErrorMsg("Please enter a category name");
      setIsSubmitting(false);
      return;
    }

    if (name.includes(".") || name.includes("/")) {
      const errorMessage = `Category name "${name}" cannot contain "." or "/"`;
      setErrorMsg(errorMessage);
      toast.error(errorMessage);
      setIsSubmitting(false);
      return;
    }

    try {
      let finalImgId = selectedImageId;

      // 1. If an image was staged locally, upload it to Google Drive now!
      if (stagedImageFile) {
        setSubmittingStep("Uploading banner to Google Drive...");
        const uploadToast = toast.loading(
          "Uploading banner image to Google Drive...",
        );

        try {
          const uploadData = new FormData();
          uploadData.append("file", stagedImageFile);
          uploadData.append("description", stagedDescription || name);
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

      if (!finalImgId) {
        setErrorMsg("Image ID could not be determined");
        setIsSubmitting(false);
        setSubmittingStep("");
        return;
      }

      // 2. Create the category and its Google Drive dual folder trees
      setSubmittingStep("Creating category and Google Drive dual folders...");
      const res = await createCategory({
        name,
        parent: selectedParent || undefined,
        roles: selectedRoles,
        imgId: finalImgId,
      });

      if (res && !res.success) {
        setErrorMsg(res.error || "Failed to create category");
        toast.error(res.error || "Failed to create category");
        setIsSubmitting(false);
        setSubmittingStep("");
        return;
      }

      // 3. Update local IndexedDB cache optimistically
      if (res.category) {
        const db = await getDB();
        if (db) {
          try {
            await db.put(STORE.CATEGORIES, res.category);
          } catch (idbErr) {
            console.warn("Could not put category into IDB cache:", idbErr);
          }
        }
      }

      toast.success(
        "Category created and Google Drive dual folders synced successfully!",
      );
      const parentUrlPath = (selectedParent?.url_path as string) || "";
      const targetPath = parentUrlPath
        ? `/admin/content/${categoryPath(parentUrlPath)}`
        : "/admin/content";

      queryClient.invalidateQueries({
        queryKey: [QUERY_KEY.CATEGORY_PAGE, parentUrlPath || "~"],
      });
      queryClient.invalidateQueries({
        queryKey: [QUERY_KEY.ALL_CATEGORIES],
      });
      queryClient.invalidateQueries({ queryKey: [STORE.CATEGORIES] });
      triggerSync([STORE.CATEGORIES]);

      router.push(targetPath);
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Failed to create category";
      setErrorMsg(msg);
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
      setSubmittingStep("");
    }
  }

  const cancelHref = preselectedUrlPath
    ? `/admin/content/${categoryPath(preselectedUrlPath)}`
    : "/admin/content";

  const hasImage = Boolean(stagedPreviewUrl || selectedImageId);

  return (
    <div className="mx-auto max-w-4xl w-full flex flex-col gap-7 pb-16">
      {/* ------------------------------------------------------------- */}
      {/* 1. VIBRANT HERO HEADER BANNER                                 */}
      {/* ------------------------------------------------------------- */}
      <div className="relative overflow-hidden rounded-3xl p-6 sm:p-7 border border-amber-500/25 bg-gradient-to-br from-amber-500/12 via-orange-500/8 to-emerald-500/10 shadow-sm backdrop-blur-xs">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-5 relative z-10">
          <div className="flex items-start sm:items-center gap-4">
            <div className="w-13 h-13 rounded-2xl bg-gradient-to-br from-amber-500 via-orange-500 to-primary text-white flex items-center justify-center shrink-0 shadow-md shadow-orange-500/20 border border-white/20">
              <FolderTree className="w-6 h-6" />
            </div>
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-bold uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-primary/15 text-primary border border-primary/20">
                  Category Studio
                </span>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20 flex items-center gap-1">
                  <HardDrive className="w-2.5 h-2.5" />
                  Dual-Drive Sync
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground font-heading">
                Create Discourse Category
              </h1>
              <p className="text-xs text-muted-foreground max-w-xl">
                Organize spiritual lectures, stage banner artwork, configure
                hierarchical paths, and protect audience permissions.
              </p>
            </div>
          </div>

          <Button
            variant="outline"
            size="sm"
            asChild
            className="rounded-xl border-border/80 hover:bg-card/80 text-xs font-semibold cursor-pointer shadow-2xs shrink-0 self-start sm:self-center"
          >
            <Link href={cancelHref} prefetch={false}>
              <ArrowLeft className="w-3.5 h-3.5 mr-1.5" />
              <span>Back to Content</span>
            </Link>
          </Button>
        </div>
      </div>

      <FormErrorAlert error={errorMsg} />

      <form onSubmit={handleSubmit} className="space-y-7">
        {/* ------------------------------------------------------------- */}
        {/* 2. CARD 1: BANNER ARTWORK & IDENTITY (EMERALD / TEAL ACCENT)  */}
        {/* ------------------------------------------------------------- */}
        <Card className="border border-emerald-500/25 hover:border-emerald-500/40 rounded-3xl shadow-sm hover:shadow-md transition-all overflow-hidden bg-card">
          <CardHeader className="border-b border-emerald-500/15 bg-gradient-to-r from-emerald-500/10 via-teal-500/5 to-transparent px-6 py-4.5 flex flex-row items-center gap-3.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/25 shadow-2xs">
              <ImageIcon className="h-4.5 w-4.5" />
            </div>
            <div>
              <CardTitle className="text-base font-bold tracking-tight text-foreground flex items-center gap-2">
                <span>Category Banner Artwork</span>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20">
                  Required
                </span>
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                High-resolution 16:9 banner displayed across portal discourses
                and playlists.
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
                      alt={
                        currentLibraryImage?.description ||
                        "Selected Banner from Library"
                      }
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
                        : "Selected from existing cloud media gallery"}
                    </span>
                    {stagedImageFile && (
                      <div className="flex items-center gap-2 text-xxs font-mono text-muted-foreground">
                        <span className="px-1.5 py-0.5 rounded bg-muted/80">
                          WebP 16:9
                        </span>
                        <span>
                          {(stagedImageFile.size / 1024).toFixed(1)} KB
                        </span>
                      </div>
                    )}
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
              <div className="flex flex-col items-center justify-center border-2 border-dashed border-emerald-500/35 hover:border-emerald-500/60 rounded-2xl p-9 bg-gradient-to-b from-emerald-500/5 via-card to-card hover:bg-emerald-500/8 transition-all text-center">
                <div className="w-14 h-14 rounded-2xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-3.5 shadow-sm border border-emerald-500/25">
                  <ImageIcon className="h-7 w-7" />
                </div>
                <h3 className="text-sm font-bold text-foreground mb-1">
                  No Cover Banner Selected
                </h3>
                <p className="text-xs text-muted-foreground mb-5 max-w-sm">
                  Choose from 400+ library assets or crop a new photo from your
                  device. Upload happens seamlessly when you save.
                </p>
                <div className="w-52">
                  <ImageSelector
                    onSelect={handleImageSelect}
                    triggerText="Select or Crop Image"
                  />
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* ------------------------------------------------------------- */}
        {/* 3. CARD 2: DETAILS & HIERARCHICAL TREE (AMBER & BLUE ACCENT)   */}
        {/* ------------------------------------------------------------- */}
        <Card className="border border-amber-500/25 hover:border-amber-500/40 rounded-3xl shadow-sm hover:shadow-md transition-all overflow-hidden bg-card">
          <CardHeader className="border-b border-amber-500/15 bg-gradient-to-r from-amber-500/10 via-orange-500/5 to-transparent px-6 py-4.5 flex flex-row items-center gap-3.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 border border-amber-500/25 shadow-2xs">
              <FolderTree className="h-4.5 w-4.5" />
            </div>
            <div>
              <CardTitle className="text-base font-bold tracking-tight text-foreground flex items-center gap-2">
                <span>Category Name & Hierarchy</span>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20">
                  Folder Structure
                </span>
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                Set the category title and pick its exact parent in the folder
                tree.
              </CardDescription>
            </div>
          </CardHeader>

          <CardContent className="p-6 sm:p-7 space-y-6">
            {/* Input: Category Name */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label
                  htmlFor="name"
                  className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5"
                >
                  <span>Category Title</span>
                  <span className="text-destructive">*</span>
                </Label>
                <span className="text-[11px] text-muted-foreground">
                  Cannot contain &quot;.&quot; or &quot;/&quot;
                </span>
              </div>
              <Input
                id="name"
                name="name"
                required
                value={categoryName}
                onChange={(e) => setCategoryName(e.target.value)}
                placeholder="e.g. Bhagavad Gita Chapter 02 In-Depth"
                className="h-11 rounded-xl border-border/90 bg-background text-sm font-medium focus-visible:ring-primary shadow-2xs"
              />

              {/* Real-time URL Path Preview Badge */}
              <div className="flex items-center gap-2 p-2.5 rounded-xl bg-muted/40 border border-border/70 text-xs text-muted-foreground">
                <Globe className="w-3.5 h-3.5 text-primary shrink-0" />
                <span className="font-semibold text-foreground">
                  URL Path Preview:
                </span>
                <span className="font-mono text-primary text-[11px] break-all">
                  /content/{liveUrlPath ? `${liveUrlPath}/` : "..."}
                </span>
              </div>
            </div>

            {/* Input: Parent Category Combobox */}
            <div className="space-y-2 pt-2 border-t border-border/50">
              <div className="flex items-center justify-between">
                <Label
                  htmlFor="parent_id"
                  className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5"
                >
                  <span>Parent Category (Location in Hierarchy)</span>
                </Label>
                <span className="text-[11px] text-muted-foreground">
                  Select Tree Diagram to browse all folders
                </span>
              </div>
              <CategoryCombobox
                categories={categories || []}
                value={selectedParent?.id || null}
                onChange={(id) => {
                  const cat = categories?.find((c) => c.id === id) || null;
                  setSelectedParent(cat);
                  handleParentChange(cat);
                }}
              />
            </div>
          </CardContent>
        </Card>

        {/* ------------------------------------------------------------- */}
        {/* 4. CARD 3: ROLE PERMISSIONS (ROYAL PURPLE / INDIGO ACCENT)    */}
        {/* ------------------------------------------------------------- */}
        <Card className="border border-purple-500/25 hover:border-purple-500/40 rounded-3xl shadow-sm hover:shadow-md transition-all overflow-hidden bg-card">
          <CardHeader className="border-b border-purple-500/15 bg-gradient-to-r from-purple-500/10 via-pink-500/5 to-transparent px-6 py-4.5 flex flex-row items-center gap-3.5">
            <div className="w-9 h-9 rounded-xl bg-purple-500/15 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0 border border-purple-500/25 shadow-2xs">
              <Shield className="h-4.5 w-4.5" />
            </div>
            <div>
              <CardTitle className="text-base font-bold tracking-tight text-foreground flex items-center gap-2">
                <span>Access Permissions</span>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-700 dark:text-purple-300 border border-purple-500/20">
                  Role Protection
                </span>
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                Control which audience groups are allowed to listen and download
                materials.
              </CardDescription>
            </div>
          </CardHeader>

          <CardContent className="p-6 sm:p-7">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3.5">
              {!roles ? (
                <div className="col-span-4 p-8 text-center text-xs text-muted-foreground">
                  Loading role permissions...
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
                      htmlFor={`role-${role.id}`}
                      className={`relative flex items-center gap-3 p-3.5 rounded-2xl border transition-all cursor-pointer select-none group shadow-2xs ${
                        isChecked
                          ? `${style.activeBorder} shadow-sm scale-[1.01]`
                          : "border-border/80 bg-muted/20 hover:bg-muted/40 hover:border-border"
                      } ${isDisabled ? "opacity-40 cursor-not-allowed pointer-events-none" : ""}`}
                    >
                      <Checkbox
                        id={`role-${role.id}`}
                        checked={isChecked}
                        onCheckedChange={() => toggleRole(role.id)}
                        disabled={isDisabled}
                        className="rounded-lg h-4.5 w-4.5"
                      />
                      <div className="flex flex-col min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`w-2 h-2 rounded-full ${style.dot}`}
                          />
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

          {/* ------------------------------------------------------------- */}
          {/* 5. RADIANT FOOTER ACTIONS                                     */}
          {/* ------------------------------------------------------------- */}
          <CardFooter className="bg-gradient-to-r from-muted/40 via-muted/20 to-muted/40 px-6 sm:px-7 py-4.5 border-t border-border/70 flex items-center justify-between gap-4">
            <Button
              variant="outline"
              size="sm"
              asChild
              className="rounded-xl border-border/80 cursor-pointer text-xs font-semibold px-4"
            >
              <Link href={cancelHref} prefetch={false}>
                Cancel
              </Link>
            </Button>

            <Button
              type="submit"
              size="lg"
              className="rounded-2xl bg-gradient-to-r from-amber-500 via-orange-500 to-primary hover:from-amber-600 hover:via-orange-600 hover:to-primary text-white font-bold px-7 py-2.5 shadow-lg shadow-orange-500/25 hover:shadow-orange-500/40 hover:-translate-y-0.5 active:translate-y-0 transition-all text-xs sm:text-sm flex items-center gap-2 cursor-pointer min-w-[170px]"
              disabled={isSubmitting || isLoadingCats}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>{submittingStep || "Creating..."}</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Save Category</span>
                </>
              )}
            </Button>
          </CardFooter>
        </Card>
      </form>
    </div>
  );
};

export default NewCategoryPage;
