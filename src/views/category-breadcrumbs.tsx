import { ChevronRight, Home } from "lucide-react";
import Link from "next/link";
import { useCategories } from "@/hooks/use-categories";
import { categoryPath, cn } from "@/lib/utils";
import type { Category } from "@/types";

interface CategoryBreadcrumbsProps {
  category?: Category;
  breadcrumbs?: Array<{ label: string; href: string }>;
}

export const CategoryBreadcrumbs = ({
  category,
  breadcrumbs: initialBreadcrumbs,
}: CategoryBreadcrumbsProps) => {
  const { data: categories } = useCategories();

  // If breadcrumbs were pre-computed by the server, use them directly
  const breadcrumbs =
    initialBreadcrumbs && initialBreadcrumbs.length > 0
      ? initialBreadcrumbs
      : (() => {
          const slugCategories = (category?.path.split(".") ?? [])
            .map((id) => categories?.find((c) => c.id === Number(id)))
            .concat(category)
            .filter(Boolean);

          return slugCategories.map((cat) => ({
            label: cat?.name || "",
            href: categoryPath(cat?.url_path ?? ""),
          }));
        })();

  return (
    <nav className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground opacity-80 overflow-x-auto whitespace-nowrap py-1">
      <Link
        href="/"
        className="hover:transition-all flex items-center gap-1"
        prefetch={false}
      >
        <Home className="w-3 h-3" />
        <span>Home</span>
      </Link>
      {breadcrumbs.map((crumb, idx) => (
        <div key={crumb.href} className="flex items-center gap-1.5">
          <ChevronRight className="w-3 h-3 text-muted-foreground opacity-60 shrink-0" />
          <Link
            prefetch={false}
            href={crumb.href}
            className={cn(
              "hover:transition-all",
              idx === breadcrumbs.length - 1 ? "font-bold" : "",
            )}
          >
            {crumb.label}
          </Link>
        </div>
      ))}
    </nav>
  );
};
