"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { QueriesClient } from "@/components/admin/queries/queries-client";
import Loading from "@/components/loading";
import { useQueries } from "@/hooks/use-queries";

const QueriesContent = () => {
  const searchParams = useSearchParams();
  const selectedId = searchParams.get("id") || undefined;
  const { data: queries, isLoading } = useQueries();

  if (isLoading) {
    return <Loading />;
  }

  return (
    <QueriesClient queries={queries || []} initialSelectedId={selectedId} />
  );
};

export default function QueriesPage() {
  return (
    <Suspense fallback={<Loading />}>
      <QueriesContent />
    </Suspense>
  );
}
