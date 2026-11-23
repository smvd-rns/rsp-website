"use client";

import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Clock,
  Database,
  Eye,
  Globe,
  Headphones,
  Monitor,
  RefreshCw,
  RotateCcw,
  Search,
  ShieldCheck,
  Smartphone,
  Tablet,
  Users,
  X,
  Zap,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";

interface VisitorStats {
  totalVisitors: number;
  guestVisitors: number;
  loggedInVisitors: number;
  totalPageviews: number;
  discourseVisitors: number;
  donateVisitors: number;
}

interface PageStat {
  path: string;
  views: number;
  visitors: number;
  guestVisitors: number;
  loggedInVisitors: number;
}

interface DeviceStat {
  device: string;
  count: number;
}

interface RecentVisit {
  id: string;
  created_at: string;
  visitor_id: string;
  page_path: string;
  page_title: string | null;
  is_logged_in: boolean;
  user_email: string | null;
  user_role: string | null;
  device_type: string;
  browser: string;
  os: string;
  referrer: string | null;
}

interface PaginationInfo {
  page: number;
  limit: number;
  totalCount: number;
  guestCount?: number;
  memberCount?: number;
  totalPages: number;
}

export default function InsightsPage() {
  const [period, setPeriod] = useState<"today" | "7d" | "30d" | "all">("7d");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(15);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | "guest" | "member">(
    "all",
  );
  const [deviceFilter, setDeviceFilter] = useState<
    "all" | "mobile" | "desktop" | "tablet"
  >("all");
  const [pathFilter, setPathFilter] = useState<string>("");

  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<VisitorStats | null>(null);
  const [topPages, setTopPages] = useState<PageStat[]>([]);
  const [devices, setDevices] = useState<DeviceStat[]>([]);
  const [recentVisits, setRecentVisits] = useState<RecentVisit[]>([]);
  const [tableSize, setTableSize] = useState<string>("under 1 MB");
  const [pagination, setPagination] = useState<PaginationInfo>({
    page: 1,
    limit: 15,
    totalCount: 0,
    guestCount: 0,
    memberCount: 0,
    totalPages: 1,
  });

  const searchDebounceRef = useRef<NodeJS.Timeout | null>(null);

  const fetchAnalytics = useCallback(
    async (
      targetPage = page,
      targetLimit = limit,
      targetSearch = search,
      targetType = typeFilter,
      targetDevice = deviceFilter,
      targetPath = pathFilter,
    ) => {
      try {
        setLoading(true);
        const params = new URLSearchParams({
          period,
          page: String(targetPage),
          limit: String(targetLimit),
        });

        if (targetSearch.trim()) params.append("search", targetSearch.trim());
        if (targetType !== "all") params.append("type", targetType);
        if (targetDevice !== "all") params.append("device", targetDevice);
        if (targetPath.trim()) params.append("path", targetPath.trim());

        const res = await fetch(`/api/admin/insights?${params.toString()}`);
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || "Failed to load telemetry insights");
        }
        setStats(data.stats);
        setTopPages(data.topPages || []);
        setDevices(data.devices || []);
        setRecentVisits(data.recentVisits || []);
        setTableSize(data.tableSize || "under 1 MB");
        if (data.pagination) {
          setPagination(data.pagination);
        }
      } catch (err) {
        const msg =
          err instanceof Error
            ? err.message
            : "Error loading visitor telemetry";
        toast.error(msg);
      } finally {
        setLoading(false);
      }
    },
    [period, page, limit, search, typeFilter, deviceFilter, pathFilter],
  );

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  const handleSearchChange = (value: string) => {
    setSearch(value);
    setPage(1);
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(() => {
      fetchAnalytics(1, limit, value, typeFilter, deviceFilter, pathFilter);
    }, 350);
  };

  const handleClearFilters = () => {
    setSearch("");
    setTypeFilter("all");
    setDeviceFilter("all");
    setPathFilter("");
    setPage(1);
    fetchAnalytics(1, limit, "", "all", "all", "");
  };

  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || newPage > pagination.totalPages) return;
    setPage(newPage);
  };

  const handlePeriodChange = (newPeriod: "today" | "7d" | "30d" | "all") => {
    setPeriod(newPeriod);
    setPage(1);
  };

  const isFiltered = Boolean(
    search.trim() ||
      typeFilter !== "all" ||
      deviceFilter !== "all" ||
      pathFilter.trim(),
  );

  const cards = [
    {
      title: "Real Unique Visitors",
      value: stats?.totalVisitors ?? 0,
      desc: "Unique devices browsing portal",
      icon: Users,
      badgeText: "Unique Devices",
    },
    {
      title: "Guests & Listeners",
      value: stats?.guestVisitors ?? 0,
      desc: "Public unauthenticated viewers",
      icon: Globe,
      badgeText: "Public Traffic",
    },
    {
      title: "Logged-in Devotees",
      value: stats?.loggedInVisitors ?? 0,
      desc: "Registered & verified devotee accounts",
      icon: ShieldCheck,
      badgeText: "Devotee Accounts",
    },
    {
      title: "Discourse & Category Views",
      value: stats?.discourseVisitors ?? 0,
      desc: "Explored lectures & recordings",
      icon: Headphones,
      badgeText: "Spiritual Content",
    },
  ];

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto w-full pb-16">
      {/* Top Header Card */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-5 sm:p-6 rounded-2xl bg-card border border-border shadow-2xs">
        <div className="flex items-center gap-3.5">
          <Link
            href="/admin"
            className="p-2.5 rounded-xl bg-muted/60 hover:bg-muted text-muted-foreground hover:text-foreground transition border border-border shadow-2xs"
            title="Back to Admin Dashboard"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-black text-foreground tracking-tight font-heading">
                Platform Insights & Telemetry
              </h1>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20 shadow-2xs">
                <Zap className="w-3 h-3 text-primary" />
                Self-Hosted Live
              </span>
              <span
                className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-muted text-muted-foreground border border-border"
                title="PostgreSQL relation storage footprint"
              >
                <Database className="w-3 h-3" />
                DB Space:{" "}
                <strong className="text-foreground font-semibold">
                  {tableSize}
                </strong>
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Zero third-party tracking. Real-time telemetry on visitors, guest
              explorers, registered devotees, and discourse reach.
            </p>
          </div>
        </div>

        {/* Time Filter & Refresh Button */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <div className="inline-flex rounded-xl bg-muted/80 p-1 border border-border text-xs font-medium">
            {(["today", "7d", "30d", "all"] as const).map((p) => (
              <button
                type="button"
                key={p}
                onClick={() => handlePeriodChange(p)}
                className={`px-3 py-1 rounded-lg transition capitalize text-xs ${
                  period === p
                    ? "bg-card text-foreground shadow-2xs border border-border font-bold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {p === "today"
                  ? "Today"
                  : p === "7d"
                    ? "Last 7 Days"
                    : p === "30d"
                      ? "30 Days"
                      : "All Time"}
              </button>
            ))}
          </div>

          <Button
            variant="outline"
            size="icon"
            onClick={() => fetchAnalytics(page, limit)}
            disabled={loading}
            className="rounded-xl h-9 w-9 cursor-pointer"
            title="Refresh Telemetry"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 text-muted-foreground ${loading ? "animate-spin" : ""}`}
            />
          </Button>
        </div>
      </div>

      {/* 4 KPI Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((c) => {
          const Icon = c.icon;
          return (
            <Card
              key={c.title}
              className="rounded-2xl border border-border bg-card shadow-2xs hover:border-primary/40 transition-all duration-200"
            >
              <CardContent className="p-5 flex flex-col justify-between h-full">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    {c.title}
                  </span>
                  <div className="p-2 rounded-xl bg-primary/10 text-primary border border-primary/20">
                    <Icon className="w-4 h-4" />
                  </div>
                </div>

                <div>
                  <div className="text-2xl sm:text-3xl font-black text-foreground tracking-tight font-heading">
                    {loading ? (
                      <span className="animate-pulse text-muted-foreground">
                        ...
                      </span>
                    ) : (
                      c.value.toLocaleString()
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{c.desc}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Middle Grid: Top Pages (2 cols) & Devices (1 col) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Most Visited Pages Table */}
        <Card className="lg:col-span-2 rounded-2xl border border-border bg-card shadow-2xs">
          <CardHeader className="border-b border-border/60 p-5 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
                <Eye className="w-4 h-4 text-primary" />
                Most Visited Pages
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                Distribution between public guests and authenticated devotees
              </CardDescription>
            </div>
            <Badge variant="outline" className="text-xs font-medium">
              Total Pageviews:{" "}
              <strong className="ml-1 text-foreground">
                {stats?.totalPageviews || 0}
              </strong>
            </Badge>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-muted/40 text-[11px] uppercase font-bold text-muted-foreground border-b border-border">
                <tr>
                  <th className="px-4 py-3">Page Path</th>
                  <th className="px-4 py-3 text-right">Views</th>
                  <th className="px-4 py-3 text-right">Unique Visitors</th>
                  <th className="px-4 py-3 text-right">Guest vs Devotee</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {topPages.length === 0 ? (
                  <tr>
                    <td
                      colSpan={4}
                      className="py-8 text-center text-muted-foreground text-xs font-medium"
                    >
                      No visits recorded yet for this time window.
                    </td>
                  </tr>
                ) : (
                  topPages.map((pageItem) => (
                    <tr
                      key={pageItem.path}
                      className="hover:bg-muted/30 transition"
                    >
                      <td className="px-4 py-3 font-mono text-xs font-semibold text-foreground">
                        <button
                          type="button"
                          onClick={() => {
                            setPathFilter(pageItem.path);
                            setPage(1);
                          }}
                          className="inline-block px-2 py-0.5 rounded bg-muted/60 hover:bg-primary/10 hover:text-primary border border-border max-w-[220px] sm:max-w-xs truncate transition text-left cursor-pointer"
                          title={`Click to filter live stream by ${pageItem.path}`}
                        >
                          {pageItem.path}
                        </button>
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-foreground">
                        {pageItem.views}
                      </td>
                      <td className="px-4 py-3 text-right font-extrabold text-primary">
                        {pageItem.visitors}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="inline-flex items-center gap-1.5 text-xs">
                          <span className="px-2 py-0.5 rounded-md bg-muted text-muted-foreground border border-border font-semibold text-[11px]">
                            {pageItem.guestVisitors} Guest
                          </span>
                          <span className="px-2 py-0.5 rounded-md bg-primary/10 text-primary border border-primary/20 font-semibold text-[11px]">
                            {pageItem.loggedInVisitors} Devotee
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </CardContent>
        </Card>

        {/* Device Breakdown */}
        <Card className="rounded-2xl border border-border bg-card shadow-2xs flex flex-col justify-between">
          <div>
            <CardHeader className="border-b border-border/60 p-5">
              <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-primary" />
                Visitor Devices
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                Distribution across mobile, desktop, and tablets
              </CardDescription>
            </CardHeader>
            <CardContent className="p-5 space-y-4">
              {devices.length === 0 ? (
                <p className="text-xs text-muted-foreground py-6 text-center">
                  No device data yet.
                </p>
              ) : (
                devices.map((d) => {
                  const total =
                    devices.reduce((acc, curr) => acc + curr.count, 0) || 1;
                  const pct = Math.round((d.count / total) * 100);
                  const Icon =
                    d.device === "mobile"
                      ? Smartphone
                      : d.device === "tablet"
                        ? Tablet
                        : Monitor;
                  return (
                    <div
                      key={d.device}
                      className="p-3 rounded-xl bg-muted/40 border border-border/80 transition"
                    >
                      <div className="flex items-center justify-between text-xs mb-2">
                        <span className="capitalize font-semibold text-foreground flex items-center gap-2">
                          <Icon className="w-3.5 h-3.5 text-muted-foreground" />
                          {d.device}
                        </span>
                        <span className="font-bold text-foreground">
                          {d.count}{" "}
                          <span className="text-muted-foreground font-normal">
                            ({pct}%)
                          </span>
                        </span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                        <div
                          className="bg-primary h-2 rounded-full transition-all duration-500"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })
              )}
            </CardContent>
          </div>

          <div className="p-5 pt-0">
            <div className="p-3 rounded-xl bg-muted/30 border border-border/60 text-[11px] text-muted-foreground leading-relaxed">
              <span className="font-semibold text-foreground block mb-0.5">
                Privacy Classification:
              </span>
              <strong>Guest:</strong> Anonymous reader exploring discourses or
              portal.
              <br />
              <strong>Devotee:</strong> Signed-in member with active session.
            </div>
          </div>
        </Card>
      </div>

      {/* Live Visitor Activity Stream with Search & Filters */}
      <Card className="rounded-2xl border border-border bg-card shadow-2xs">
        <CardHeader className="border-b border-border/60 p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
              <Clock className="w-4 h-4 text-primary" />
              Live Visitor Activity Stream
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
              Paginated real-time log of visits with instant search and filters
            </CardDescription>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span>Rows:</span>
              <select
                value={limit}
                onChange={(e) => {
                  setLimit(Number(e.target.value));
                  setPage(1);
                }}
                className="bg-muted text-foreground border border-border rounded-lg px-2 py-1 text-xs outline-none cursor-pointer"
              >
                <option value={10}>10</option>
                <option value={15}>15</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
              </select>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-5 space-y-4">
          {/* Filters Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="relative flex-1">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search by path, email, or referrer..."
                value={search}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="pl-8 text-xs rounded-xl h-9"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => handleSearchChange("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {/* Type Filter */}
              <select
                value={typeFilter}
                onChange={(e) => {
                  setTypeFilter(e.target.value as "all" | "guest" | "member");
                  setPage(1);
                }}
                className="bg-muted text-foreground border border-border rounded-xl px-3 py-1.5 text-xs outline-none cursor-pointer h-9"
              >
                <option value="all">All Visitors</option>
                <option value="guest">Guests Only</option>
                <option value="member">Devotees Only</option>
              </select>

              {/* Device Filter */}
              <select
                value={deviceFilter}
                onChange={(e) => {
                  setDeviceFilter(
                    e.target.value as "all" | "mobile" | "desktop" | "tablet",
                  );
                  setPage(1);
                }}
                className="bg-muted text-foreground border border-border rounded-xl px-3 py-1.5 text-xs outline-none cursor-pointer h-9"
              >
                <option value="all">All Devices</option>
                <option value="mobile">Mobile</option>
                <option value="desktop">Desktop</option>
                <option value="tablet">Tablet</option>
              </select>

              {isFiltered && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClearFilters}
                  className="h-9 px-2.5 text-xs text-muted-foreground hover:text-foreground gap-1 cursor-pointer"
                  title="Reset all filters"
                >
                  <RotateCcw className="w-3 h-3" />
                  Reset
                </Button>
              )}
            </div>
          </div>

          {pathFilter && (
            <div className="flex items-center gap-2 p-2 rounded-xl bg-primary/10 border border-primary/20 text-xs text-primary">
              <span>
                Filtered by path: <strong>{pathFilter}</strong>
              </span>
              <button
                type="button"
                onClick={() => setPathFilter("")}
                className="ml-auto hover:opacity-80 p-0.5"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Table */}
          <div className="rounded-xl border border-border overflow-hidden overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/50 text-[11px] uppercase font-bold text-muted-foreground border-b border-border">
                <tr>
                  <th className="px-3.5 py-3">Time</th>
                  <th className="px-3.5 py-3">User</th>
                  <th className="px-3.5 py-3">Page & Title</th>
                  <th className="px-3.5 py-3">Device & Browser</th>
                  <th className="px-3.5 py-3">Referrer</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {recentVisits.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="py-10 text-center text-muted-foreground text-xs"
                    >
                      {loading
                        ? "Loading telemetry stream..."
                        : "No visit entries match your active criteria."}
                    </td>
                  </tr>
                ) : (
                  recentVisits.map((v) => {
                    const formattedDate = new Date(v.created_at).toLocaleString(
                      "en-IN",
                      {
                        day: "2-digit",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                        second: "2-digit",
                      },
                    );

                    return (
                      <tr key={v.id} className="hover:bg-muted/30 transition">
                        <td className="px-3.5 py-2.5 text-muted-foreground font-mono whitespace-nowrap">
                          {formattedDate}
                        </td>
                        <td className="px-3.5 py-2.5 whitespace-nowrap">
                          {v.is_logged_in ? (
                            <div className="flex items-center gap-1.5">
                              <Badge
                                variant="outline"
                                className="border-primary/30 text-primary bg-primary/5 text-[10px] font-semibold"
                              >
                                Devotee
                              </Badge>
                              <span className="font-medium text-foreground max-w-[140px] truncate">
                                {v.user_email ||
                                  `ID #${v.visitor_id.slice(0, 8)}`}
                              </span>
                            </div>
                          ) : (
                            <span className="px-2 py-0.5 rounded bg-muted text-muted-foreground text-[10px] font-medium border border-border">
                              Guest ({v.visitor_id.slice(0, 6)})
                            </span>
                          )}
                        </td>
                        <td className="px-3.5 py-2.5 max-w-xs">
                          <div className="font-mono font-semibold text-foreground truncate">
                            {v.page_path}
                          </div>
                          {v.page_title && (
                            <div className="text-[11px] text-muted-foreground truncate">
                              {v.page_title}
                            </div>
                          )}
                        </td>
                        <td className="px-3.5 py-2.5 whitespace-nowrap">
                          <span className="capitalize font-medium text-foreground">
                            {v.device_type}
                          </span>{" "}
                          <span className="text-muted-foreground">
                            ({v.browser || "Unknown"} on {v.os || "OS"})
                          </span>
                        </td>
                        <td className="px-3.5 py-2.5 text-muted-foreground max-w-[180px] truncate">
                          {v.referrer ? (
                            <a
                              href={v.referrer}
                              target="_blank"
                              rel="noreferrer"
                              className="hover:underline text-primary"
                            >
                              {v.referrer.replace(/^https?:\/\//, "")}
                            </a>
                          ) : (
                            <span className="text-muted-foreground/60 italic">
                              Direct / Bookmark
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between pt-2">
            <span className="text-xs text-muted-foreground">
              Showing page{" "}
              <strong className="text-foreground">{pagination.page}</strong> of{" "}
              <strong className="text-foreground">
                {pagination.totalPages}
              </strong>{" "}
              ({pagination.totalCount.toLocaleString()} total logged events)
            </span>

            <div className="flex items-center gap-1.5">
              <Button
                variant="outline"
                size="sm"
                disabled={pagination.page <= 1 || loading}
                onClick={() => handlePageChange(pagination.page - 1)}
                className="h-8 px-2.5 text-xs rounded-lg cursor-pointer"
              >
                <ChevronLeft className="w-3.5 h-3.5 mr-1" />
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={pagination.page >= pagination.totalPages || loading}
                onClick={() => handlePageChange(pagination.page + 1)}
                className="h-8 px-2.5 text-xs rounded-lg cursor-pointer"
              >
                Next
                <ChevronRight className="w-3.5 h-3.5 ml-1" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
