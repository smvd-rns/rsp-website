"use client";

import { Home } from "lucide-react";
import { HomepageClient } from "@/components/admin/homepage/homepage-client";
import Loading from "@/components/loading";
import { useHomepage } from "@/hooks/use-homepage";

export default function HomepageManagementPage() {
  const { data, isLoading } = useHomepage();

  if (isLoading) {
    return <Loading />;
  }

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto w-full pb-12">
      {/* Google-like Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-5 rounded-2xl bg-card border border-border/80 shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 flex items-center justify-center shrink-0 border border-cyan-500/20 shadow-2xs">
            <Home className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground font-heading">
              Homepage Layout & Announcements
            </h1>
            <p className="text-xs text-muted-foreground">
              Configure active homepage sections, broadcast notification banners, and feature selected playlists.
            </p>
          </div>
        </div>
      </div>

      <HomepageClient
        sections={data?.sections || []}
        items={data?.items || []}
        categories={data?.categories || []}
        recordings={data?.recordings || []}
        announcements={data?.announcements || []}
      />
    </div>
  );
}
