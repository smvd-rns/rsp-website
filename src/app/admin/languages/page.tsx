"use client";

import Loading from "@/components/loading";
import { useLanguages } from "@/hooks/use-languages";

export default function LanguagesPage() {
  const { data: languages, isLoading } = useLanguages();

  return (
    <div className="mx-auto max-w-4xl w-full flex flex-col gap-6 pb-12">
      <h1 className="text-2xl font-bold tracking-tight text-foreground">
        Languages
      </h1>
      <div className="rounded-md border p-4 bg-card">
        {isLoading ? (
          <Loading />
        ) : languages?.length ? (
          <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
            {languages.map((l) => (
              <li key={l.id}>
                {l.name}{" "}
                {l.native_name && (
                  <span className="text-sm opacity-70">({l.native_name})</span>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-muted-foreground">No languages found.</p>
        )}
      </div>
    </div>
  );
}
