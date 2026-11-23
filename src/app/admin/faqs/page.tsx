"use client";

import { HelpCircle } from "lucide-react";
import { FaqsClient } from "@/components/admin/faqs/faqs-client";
import Loading from "@/components/loading";
import { useFaqs } from "@/hooks/use-faqs";

export default function FaqsPage() {
  const { data, isLoading } = useFaqs();

  if (isLoading) {
    return <Loading />;
  }

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto w-full pb-12">
      {/* Google-like Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-5 rounded-2xl bg-card border border-border/80 shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0 border border-rose-500/20 shadow-2xs">
            <HelpCircle className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground font-heading">
              FAQ Knowledgebase Engine
            </h1>
            <p className="text-xs text-muted-foreground">
              Manage categorized frequently asked spiritual questions, answers, and guide materials.
            </p>
          </div>
        </div>
      </div>

      <FaqsClient categories={data?.categories || []} faqs={data?.faqs || []} />
    </div>
  );
}
