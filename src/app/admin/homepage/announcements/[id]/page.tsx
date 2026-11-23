"use client";

import { notFound } from "next/navigation";
import { use } from "react";
import { AnnouncementForm } from "@/components/admin/homepage/announcement-form";
import Loading from "@/components/loading";
import { useHomepage } from "@/hooks/use-homepage";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function EditAnnouncementPage({ params }: PageProps) {
  const { id } = use(params);
  const { data, isLoading } = useHomepage();

  if (isLoading) {
    return <Loading />;
  }

  const announcement = data?.announcements.find((a) => a.id === Number(id));

  if (!announcement) {
    notFound();
  }

  return (
    <div className="max-w-7xl mx-auto w-full pb-10">
      <AnnouncementForm announcement={announcement} />
    </div>
  );
}
