"use client";

import { useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  ChevronRight,
  FileAudio,
  Folder,
  FolderOpen,
  FolderPlus,
  FolderTree,
  Home,
  Pencil,
  Plus,
  RefreshCw,
  Shield,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { use, useState } from "react";
import { revalidateCategoryAction } from "@/app/actions/category-actions";
import { CategoryEditDialog } from "@/components/admin/category-edit-dialog";
import { CategoryTable } from "@/components/admin/category-table";
import { RecordingsTable } from "@/components/admin/recordings-table";
import Loading from "@/components/loading";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { QUERY_KEY } from "@/constants";
import { useCategoryPage } from "@/hooks/use-category-page";
import { useImages } from "@/hooks/use-images";
import { useRoles } from "@/hooks/use-roles";
import { getImageUrl } from "@/lib/image-utils";
import { toast } from "@/lib/toast";
import { categoryPath } from "@/lib/utils";

export default function CategoryPage({
  params,
}: {
  params: Promise<{ path: string[] }>;
}) {
  const { path: pathSegments } = use(params);
  const router = useRouter();
  const queryClient = useQueryClient();
  const [isRevalidating, setIsRevalidating] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const pathString = Array.isArray(pathSegments)
    ? pathSegments.join("/")
    : pathSegments || "";
  const { data, isLoading } = useCategoryPage(pathString);
  const { data: allRoles = [] } = useRoles();
  const { data: allImages = [] } = useImages();

  // Handle redirects client-side
  if (data?.redirectTo) {
    router.replace(data.redirectTo);
    return null;
  }

  if (isLoading) {
    return <Loading />;
  }

  if (!data?.category) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center p-8 space-y-4">
        <h2 className="text-2xl font-bold">Category Not Found</h2>
        <p className="text-muted-foreground text-sm max-w-sm">
          The category you are looking for does not exist, has been trashed, or
          is currently loading.
        </p>
        <Button onClick={() => router.push("/admin/content")}>
          Go back to Content
        </Button>
      </div>
    );
  }

  const { category, subcategories = [], recordings = [] } = data;

  const handleRevalidate = async () => {
    setIsRevalidating(true);
    const toastId = toast.loading("Revalidating category...");
    try {
      await revalidateCategoryAction(category.url_path);
      queryClient.invalidateQueries({
        queryKey: [QUERY_KEY.CATEGORY_PAGE, category.url_path],
      });
      toast.success("Category revalidated successfully", { id: toastId });
    } catch {
      toast.error("Failed to revalidate category", { id: toastId });
    } finally {
      setIsRevalidating(false);
    }
  };

  // Breadcrumbs
  const breadcrumbs = pathSegments?.map((seg, i) => {
    const path = pathSegments?.slice(0, i + 1).join("/");
    return { name: seg, path: `/admin/content/${path}` };
  });

  const bannerImgId = category.img_id || category.img;
  const bannerImage = allImages.find((img) => img.id === Number(bannerImgId));
  const bannerUrl =
    bannerImage?.url ||
    (bannerImage?.webp && !/^\d+$/.test(bannerImage.webp)
      ? `https://lh3.googleusercontent.com/d/${bannerImage.webp}=s1600`
      : null) ||
    (bannerImgId ? getImageUrl("img", Number(bannerImgId), "webp") : null);

  const allowedRoleNames = allRoles
    .filter((r) => category.allowed_roles?.includes(r.id))
    .map((r) => r.name);

  return (
    <div className="space-y-6">
      {/* Top Breadcrumb & Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <nav className="flex items-center space-x-1.5 text-xs text-muted-foreground overflow-x-auto py-1">
          <Link
            href="/admin/content"
            className="flex items-center hover:text-foreground font-medium transition-colors shrink-0"
            prefetch={false}
          >
            <ArrowLeft className="h-3.5 w-3.5 mr-1" /> All Categories
          </Link>
          <span className="text-muted-foreground/40">/</span>
          <Link
            href="/admin/content"
            className="flex items-center hover:text-foreground transition-colors shrink-0"
            prefetch={false}
          >
            <Home className="h-3.5 w-3.5 mr-1" /> Root
          </Link>
          {breadcrumbs.map((bc, i) => (
            <div key={bc.path} className="flex items-center shrink-0">
              <ChevronRight className="h-3.5 w-3.5 mx-1 text-muted-foreground/40 shrink-0" />
              <Link
                href={bc.path}
                className={`hover:text-foreground transition-colors ${
                  i === breadcrumbs.length - 1
                    ? "font-bold text-foreground"
                    : ""
                }`}
                prefetch={false}
              >
                {bc.name}
              </Link>
            </div>
          ))}
        </nav>

        <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRevalidate}
            disabled={isRevalidating}
            className="h-8 text-xs rounded-xl gap-1.5 cursor-pointer"
          >
            <RefreshCw
              className={`h-3.5 w-3.5 ${isRevalidating ? "animate-spin" : ""}`}
            />
            <span>{isRevalidating ? "Revalidating..." : "Revalidate"}</span>
          </Button>
        </div>
      </div>

      {/* Vibrant Hero Header Card */}
      <Card className="border border-amber-500/30 rounded-3xl shadow-sm overflow-hidden bg-card">
        <div className="relative overflow-hidden bg-gradient-to-r from-amber-500/15 via-orange-500/10 to-primary/10 p-6 sm:p-7">
          <div className="absolute top-0 right-0 -mt-8 -mr-8 w-48 h-48 rounded-full bg-amber-500/10 blur-3xl pointer-events-none" />

          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-5 relative z-10">
            {/* Category Avatar / Banner & Details */}
            <div className="flex items-start sm:items-center gap-4.5">
              <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-2xl overflow-hidden border-2 border-amber-500/30 bg-muted/40 shrink-0 shadow-md flex items-center justify-center">
                {bannerImgId ? (
                  <img
                    src={bannerUrl || "/rsp.webp"}
                    alt={category.name}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      if (!e.currentTarget.src.endsWith("/rsp.webp")) {
                        e.currentTarget.src = "/rsp.webp";
                      }
                    }}
                  />
                ) : (
                  <FolderOpen className="w-8 h-8 text-amber-600 dark:text-amber-400" />
                )}
              </div>

              <div className="space-y-1.5 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge
                    variant="outline"
                    className="bg-amber-500/20 text-amber-800 dark:text-amber-200 border-amber-500/35 text-xs font-bold px-2.5 py-0.5 rounded-full"
                  >
                    Folder #{category.id}
                  </Badge>
                  <Badge
                    variant="outline"
                    className="bg-muted/70 text-muted-foreground text-xs font-mono px-2.5 py-0.5 rounded-full border-border/70"
                  >
                    /{categoryPath(category.url_path as string)}
                  </Badge>
                </div>

                <h1 className="text-2xl sm:text-3xl font-extrabold font-heading text-foreground tracking-tight">
                  {category.name}
                </h1>

                {/* Role access badges & counts */}
                <div className="flex items-center gap-2 flex-wrap text-xs text-muted-foreground pt-0.5">
                  <span className="font-semibold text-foreground">
                    {subcategories.length}{" "}
                    {subcategories.length === 1 ? "Subfolder" : "Subfolders"}
                  </span>
                  <span>•</span>
                  <span className="font-semibold text-foreground">
                    {recordings.length}{" "}
                    {recordings.length === 1 ? "Discourse" : "Discourses"}
                  </span>

                  {allowedRoleNames.length > 0 && (
                    <>
                      <span>•</span>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <Shield className="w-3.5 h-3.5 text-primary shrink-0" />
                        {allowedRoleNames.map((role) => (
                          <span
                            key={role}
                            className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-primary/10 text-primary border border-primary/20 capitalize"
                          >
                            {role}
                          </span>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2.5 w-full md:w-auto justify-end flex-wrap">
              <Button
                onClick={() => setIsEditing(true)}
                className="rounded-xl h-10 px-4 text-xs font-bold bg-gradient-to-r from-amber-500 via-orange-500 to-primary text-white shadow-md shadow-orange-500/20 hover:shadow-orange-500/35 transition-all gap-2 cursor-pointer"
              >
                <Pencil className="w-3.5 h-3.5" />
                <span>Edit Category</span>
              </Button>

              <Button
                variant="outline"
                asChild
                className="rounded-xl h-10 px-4 text-xs font-semibold gap-1.5"
              >
                <Link
                  href={`/admin/recordings/create?category=${category.id}`}
                  prefetch={false}
                >
                  <Plus className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                  <span>Add Recording</span>
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {/* Main Content Sections: Sub-categories and Recordings */}
      <div className="grid gap-6">
        {/* Section 1: Sub-categories */}
        <Card className="border border-border/80 rounded-3xl shadow-xs overflow-hidden bg-card">
          <CardHeader className="border-b border-border/60 bg-muted/20 px-6 py-4 flex flex-row items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 border border-amber-500/20 shadow-2xs">
                <FolderTree className="w-4 h-4" />
              </div>
              <div>
                <CardTitle className="text-base font-bold tracking-tight text-foreground flex items-center gap-2">
                  <span>Sub-categories</span>
                  <Badge
                    variant="secondary"
                    className="text-xxs font-semibold px-2 py-0 rounded-md bg-amber-500/10 text-amber-800 dark:text-amber-300 border border-amber-500/20"
                  >
                    {subcategories.length}
                  </Badge>
                </CardTitle>
                <CardDescription className="text-xs text-muted-foreground">
                  Folders nested directly under {category.name}.
                </CardDescription>
              </div>
            </div>

            <Button
              variant="outline"
              size="sm"
              asChild
              className="h-8 text-xs rounded-xl gap-1.5"
            >
              <Link
                href={`/admin/categories/create?parent=${category.id}`}
                prefetch={false}
              >
                <FolderPlus className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                <span>New Subcategory</span>
              </Link>
            </Button>
          </CardHeader>

          <CardContent className="p-4 sm:p-6">
            {subcategories.length > 0 ? (
              <CategoryTable categories={subcategories} />
            ) : (
              <div className="flex flex-col items-center justify-center py-10 px-4 text-center rounded-2xl border-2 border-dashed border-border/70 bg-muted/10 space-y-2.5">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-600 dark:text-amber-400">
                  <Folder className="w-5 h-5" />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-bold text-foreground">
                    No sub-categories yet
                  </p>
                  <p className="text-xs text-muted-foreground max-w-sm">
                    This folder currently has no child categories. You can
                    create a nested folder or upload discourses directly.
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  asChild
                  className="rounded-xl text-xs gap-1.5 mt-2"
                >
                  <Link
                    href={`/admin/categories/create?parent=${category.id}`}
                    prefetch={false}
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Create Sub-folder</span>
                  </Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Section 2: Recordings */}
        <Card className="border border-border/80 rounded-3xl shadow-xs overflow-hidden bg-card">
          <CardHeader className="border-b border-border/60 bg-muted/20 px-6 py-4 flex flex-row items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 border border-blue-500/20 shadow-2xs">
                <FileAudio className="w-4 h-4" />
              </div>
              <div>
                <CardTitle className="text-base font-bold tracking-tight text-foreground flex items-center gap-2">
                  <span>Recordings & Discourses</span>
                  <Badge
                    variant="secondary"
                    className="text-xxs font-semibold px-2 py-0 rounded-md bg-blue-500/10 text-blue-800 dark:text-blue-300 border border-blue-500/20"
                  >
                    {recordings.length}
                  </Badge>
                </CardTitle>
                <CardDescription className="text-xs text-muted-foreground">
                  Spiritual audio and video discourses in this folder.
                </CardDescription>
              </div>
            </div>

            <Button
              variant="outline"
              size="sm"
              asChild
              className="h-8 text-xs rounded-xl gap-1.5"
            >
              <Link
                href={`/admin/recordings/create?category=${category.id}`}
                prefetch={false}
              >
                <Plus className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                <span>Upload Recording</span>
              </Link>
            </Button>
          </CardHeader>

          <CardContent className="p-4 sm:p-6">
            {recordings.length > 0 ? (
              <RecordingsTable
                recordings={recordings}
                categoryUrlPath={category.url_path}
              />
            ) : (
              <div className="flex flex-col items-center justify-center py-10 px-4 text-center rounded-2xl border-2 border-dashed border-border/70 bg-muted/10 space-y-2.5">
                <div className="w-10 h-10 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-600 dark:text-blue-400">
                  <FileAudio className="w-5 h-5" />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-bold text-foreground">
                    No recordings found in this category
                  </p>
                  <p className="text-xs text-muted-foreground max-w-sm">
                    Upload audio, video, or lecture notes directly to this
                    folder with Google Drive sync.
                  </p>
                </div>
                <Button
                  size="sm"
                  asChild
                  className="rounded-xl text-xs gap-1.5 mt-2 bg-primary text-primary-foreground"
                >
                  <Link
                    href={`/admin/recordings/create?category=${category.id}`}
                    prefetch={false}
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Upload First Recording</span>
                  </Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* In-Page Edit Modal */}
      <CategoryEditDialog
        category={category}
        open={isEditing}
        onOpenChange={setIsEditing}
        onSuccess={() => {
          setIsEditing(false);
          queryClient.invalidateQueries({
            queryKey: [QUERY_KEY.CATEGORY_PAGE, category.url_path],
          });
        }}
      />
    </div>
  );
}
