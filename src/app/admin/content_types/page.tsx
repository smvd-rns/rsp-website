"use client";

import Loading from "@/components/loading";
import { useContentTypes } from "@/hooks/use-content-types";

export default function ContentTypesPage() {
  const { data: types, isLoading } = useContentTypes();

  return (
    <div className="mx-auto max-w-4xl w-full flex flex-col gap-6 pb-12">
      <h1 className="text-2xl font-bold tracking-tight text-foreground">
        Content Types
      </h1>
      <div className="rounded-md border p-4 bg-card">
        {isLoading ? (
          <Loading />
        ) : types?.length ? (
          <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
            {types.map((t) => (
              <li key={t.id}>{t.name}</li>
            ))}
          </ul>
        ) : (
          <p className="text-muted-foreground">No content types found.</p>
        )}
      </div>
    </div>
  );
}
