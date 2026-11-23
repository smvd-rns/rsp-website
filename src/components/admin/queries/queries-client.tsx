"use client";

import { Inbox, Loader2, MessageSquare, Search, X } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useIsMobile } from "@/hooks/use-mobile";
import { useQueryDetail } from "@/hooks/use-queries";
import {
  createQueriesIndex,
  type QueriesOramaDB,
  searchQueriesWithOrama,
} from "@/lib/search/queries-orama";
import { formatRelativeTime } from "@/lib/utils";
import type { UserQueryWithUser } from "@/types";
import {
  categoryLabels,
  type QueryCategory,
  type QueryStatus,
  statusColors,
} from "./query-constants";
import { QueryDetailClient } from "./query-detail-client";

interface QueriesClientProps {
  queries: UserQueryWithUser[];
  initialSelectedId?: string;
}

export const QueriesClient = ({
  queries,
  initialSelectedId,
}: QueriesClientProps) => {
  const isMobile = useIsMobile();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const urlQueryId = searchParams?.get("id") ?? initialSelectedId ?? null;

  const [selectedQueryId, setSelectedQueryId] = useState<string | null>(
    urlQueryId,
  );

  const [activeTab, setActiveTab] = useState<"all" | "active" | "closed">(
    "active",
  );
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  // Sync selection and tab whenever urlQueryId or queries change
  useEffect(() => {
    if (!urlQueryId || queries.length === 0) return;

    const target = queries.find((q) => q.id === urlQueryId);
    if (target) {
      setSelectedQueryId(target.id);
      // Automatically switch to closed or active tab based on query's status
      if (target.status === "closed" || target.status === "resolved") {
        setActiveTab("closed");
      } else {
        setActiveTab("active");
      }
      // If the category filter is hiding the target query, reset it
      setCategoryFilter((prev) =>
        prev !== "all" && prev !== target.category ? "all" : prev,
      );
    }
  }, [urlQueryId, queries]);

  const handleSelectQuery = (id: string | null) => {
    setSelectedQueryId(id);
    const params = new URLSearchParams(
      searchParams ? searchParams.toString() : "",
    );
    if (id) {
      params.set("id", id);
    } else {
      params.delete("id");
    }
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };

  // Orama database state
  const [oramaDb, setOramaDb] = useState<QueriesOramaDB | null>(null);
  const [oramaMatchIds, setOramaMatchIds] = useState<Set<string> | null>(null);
  const [isSearching, setIsSearching] = useState(false);

  // Initialize and update Orama index whenever queries change
  useEffect(() => {
    let isMounted = true;
    createQueriesIndex(queries)
      .then((db) => {
        if (isMounted) setOramaDb(db);
      })
      .catch((err) => {
        console.error("Failed to build queries Orama index:", err);
      });

    return () => {
      isMounted = false;
    };
  }, [queries]);

  // Debounced Orama search
  useEffect(() => {
    if (!searchTerm.trim()) {
      setOramaMatchIds(null);
      setIsSearching(false);
      return;
    }

    if (!oramaDb) return;

    let isMounted = true;
    setIsSearching(true);

    const timer = setTimeout(async () => {
      try {
        const matches = await searchQueriesWithOrama(oramaDb, searchTerm);
        if (isMounted) {
          setOramaMatchIds(matches);
        }
      } catch (err) {
        console.error("Orama query search failed:", err);
      } finally {
        if (isMounted) setIsSearching(false);
      }
    }, 150);

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [searchTerm, oramaDb]);

  // Filter queries based on tab, category, and Orama search matches
  const filteredQueries = useMemo(() => {
    return queries.filter((q) => {
      // Orama search match
      if (oramaMatchIds !== null && !oramaMatchIds.has(q.id)) {
        return false;
      }

      // Status tab match
      if (activeTab === "active") {
        if (q.status !== "open" && q.status !== "in_progress") return false;
      } else if (activeTab === "closed") {
        if (q.status !== "resolved" && q.status !== "closed") return false;
      }

      // Category match
      if (categoryFilter !== "all" && q.category !== categoryFilter) {
        return false;
      }

      return true;
    });
  }, [queries, oramaMatchIds, activeTab, categoryFilter]);

  // Auto-select first query on desktop if none selected
  const activeQueryId =
    selectedQueryId ?? (!isMobile ? (filteredQueries[0]?.id ?? null) : null);

  // Load detail for selected query
  const { data: detailData, isLoading: detailLoading } =
    useQueryDetail(activeQueryId);

  const activeCount = queries.filter(
    (q) => q.status === "open" || q.status === "in_progress",
  ).length;
  const closedCount = queries.filter(
    (q) => q.status === "resolved" || q.status === "closed",
  ).length;

  return (
    <div className="w-full flex flex-col md:flex-row border-2 border-border/80 rounded-2xl overflow-hidden bg-card shadow-2xs h-[calc(100vh-7.5rem)] min-h-[580px]">
      {/* Left Sidebar: Filters & Ticket List */}
      <div
        className={`w-full md:w-[360px] lg:w-[410px] shrink-0 flex flex-col h-full overflow-hidden border-r border-border ${
          activeQueryId && isMobile ? "hidden" : "flex"
        }`}
      >
        {/* Top Search & Filter Bar */}
        <div className="p-3 border-b border-border/50 bg-muted/20 flex flex-col gap-2.5 shrink-0">
          {/* Search Input with Orama */}
          <div className="relative">
            {isSearching ? (
              <Loader2 className="absolute left-2.5 top-2.5 h-4 w-4 animate-spin text-primary" />
            ) : (
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground opacity-60" />
            )}
            <Input
              type="text"
              placeholder="Search subject, name, email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 pr-8 text-xs h-9"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm("")}
                className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Status Tabs */}
          <Tabs
            value={activeTab}
            onValueChange={(val) =>
              setActiveTab(val as "all" | "active" | "closed")
            }
            className="w-full"
          >
            <TabsList className="grid w-full grid-cols-3 h-8">
              <TabsTrigger
                value="active"
                className="text-xs gap-1 cursor-pointer"
              >
                <span>Active</span>
                <span className="text-[10px] px-1 py-0 rounded bg-primary/10 text-primary font-bold">
                  {activeCount}
                </span>
              </TabsTrigger>
              <TabsTrigger
                value="closed"
                className="text-xs gap-1 cursor-pointer"
              >
                <span>Closed</span>
                <span className="text-[10px] px-1 py-0 rounded bg-muted text-muted-foreground font-semibold">
                  {closedCount}
                </span>
              </TabsTrigger>
              <TabsTrigger value="all" className="text-xs cursor-pointer">
                All ({queries.length})
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Category Filter */}
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-full h-8 text-xs cursor-pointer bg-background">
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {Object.entries(categoryLabels).map(([catKey, label]) => (
                <SelectItem key={catKey} value={catKey}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Scrollable Ticket List */}
        <div className="flex-1 overflow-y-auto divide-y divide-border/40">
          {filteredQueries.length === 0 ? (
            <div className="p-8 text-center flex flex-col items-center justify-center gap-2 text-muted-foreground">
              <Inbox className="h-8 w-8 opacity-40" />
              <p className="text-xs font-semibold">
                No support tickets match criteria
              </p>
              <p className="text-xxs">
                Try clearing search or changing filters.
              </p>
              {(searchTerm ||
                categoryFilter !== "all" ||
                activeTab !== "active") && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSearchTerm("");
                    setCategoryFilter("all");
                    setActiveTab("active");
                  }}
                  className="mt-2 text-xs h-7"
                >
                  Reset Filters
                </Button>
              )}
            </div>
          ) : (
            filteredQueries.map((q) => {
              const isSelected = q.id === activeQueryId;
              const sender = q.users?.name || q.guest_name || "Guest";
              const email = q.users?.email || q.guest_email || "";

              return (
                <button
                  key={q.id}
                  type="button"
                  onClick={() => handleSelectQuery(q.id)}
                  className={`w-full text-left p-3.5 flex flex-col gap-1.5 transition-all cursor-pointer border-l-[3px] ${
                    isSelected
                      ? "bg-muted/80 border-l-primary"
                      : "hover:bg-muted/40 border-l-transparent"
                  }`}
                >
                  {/* Top row: Category + Time */}
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-bold text-primary uppercase tracking-wider bg-primary/5 px-2 py-0.5 rounded truncate">
                      {categoryLabels[q.category as QueryCategory] ||
                        q.category}
                    </span>
                    <span className="text-xxs text-muted-foreground shrink-0">
                      {formatRelativeTime(q.created_at || "")}
                    </span>
                  </div>

                  {/* Subject */}
                  <span className="text-sm font-semibold text-foreground truncate leading-snug">
                    {q.subject}
                  </span>

                  {/* Message snippet */}
                  <p className="text-xs text-muted-foreground truncate leading-relaxed">
                    {q.message}
                  </p>

                  {/* Bottom row: Sender info & Status */}
                  <div className="flex items-center justify-between gap-2 mt-1">
                    <span className="text-xxs text-muted-foreground truncate">
                      {sender} {email ? `• ${email}` : ""}
                    </span>
                    <Badge
                      variant="outline"
                      className={`text-[10px] px-1.5 py-0 capitalize shrink-0 ${
                        statusColors[q.status as QueryStatus] || ""
                      }`}
                    >
                      {(q.status || "").replace("_", " ")}
                    </Badge>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Right Detail Pane */}
      <div
        className={`flex-1 flex flex-col h-full overflow-hidden ${
          !activeQueryId && isMobile ? "hidden" : "flex"
        }`}
      >
        {detailLoading ? (
          <div className="flex-1 flex items-center justify-center p-8 text-center text-xs text-muted-foreground gap-2">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
            <span>Loading ticket details...</span>
          </div>
        ) : detailData?.query ? (
          <div className="flex-1 overflow-y-auto p-4 md:p-6">
            <QueryDetailClient
              query={detailData.query}
              replies={detailData.replies}
              onBack={() => handleSelectQuery(null)}
              showBackLink={false}
            />
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center gap-3 text-muted-foreground">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-primary">
              <MessageSquare className="w-8 h-8" />
            </div>
            <h3 className="font-bold text-lg text-foreground">
              No Ticket Selected
            </h3>
            <p className="text-xs max-w-xs">
              Select a ticket from the left sidebar to inspect the inquiry, view
              attachments, and reply using the rich editor.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
