"use client";

import { AlertTriangle, ArrowLeft, RotateCw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const router = useRouter();

  useEffect(() => {
    console.error("Dashboard render error:", error);
  }, [error]);

  return (
    <div className="flex flex-1 flex-col items-center justify-center min-h-[400px] text-center p-8 space-y-6 max-w-lg mx-auto">
      <div className="p-4 bg-destructive/10 text-destructive rounded-full">
        <AlertTriangle className="h-12 w-12" />
      </div>

      <div className="space-y-2">
        <h2 className="text-2xl font-bold tracking-tight">
          Something went wrong!
        </h2>
        <p className="text-muted-foreground text-sm">
          An unexpected error occurred in this view. Please try reloading the
          content or navigate back.
        </p>
      </div>

      {error.message && (
        <div className="p-3 bg-muted rounded-md text-left text-xs font-mono w-full overflow-auto max-h-[150px] border border-border text-muted-foreground">
          {error.message}
        </div>
      )}

      <div className="flex items-center gap-3 w-full justify-center">
        <Button onClick={() => reset()} className="gap-2">
          <RotateCw className="h-4 w-4" /> Try again
        </Button>
        <Button
          variant="outline"
          onClick={() => router.back()}
          className="gap-2"
        >
          <ArrowLeft className="h-4 w-4" /> Go Back
        </Button>
      </div>
    </div>
  );
}
