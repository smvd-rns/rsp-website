"use client";

import Loading from "@/components/loading";
import { useSpeakers } from "@/hooks/use-speakers";

export default function SpeakersPage() {
  const { data: speakers, isLoading } = useSpeakers();

  return (
    <div className="mx-auto max-w-4xl w-full flex flex-col gap-6 pb-12">
      <h1 className="text-2xl font-bold tracking-tight text-foreground">
        Speakers
      </h1>
      <div className="rounded-md border p-4 bg-card">
        {isLoading ? (
          <Loading />
        ) : speakers?.length ? (
          <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
            {speakers.map((s) => (
              <li key={s.id}>{s.name}</li>
            ))}
          </ul>
        ) : (
          <p className="text-muted-foreground">No speakers found.</p>
        )}
      </div>
    </div>
  );
}
