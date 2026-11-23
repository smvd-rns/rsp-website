"use client";

import {
  Award,
  BookOpen,
  ChevronFirst,
  ChevronLast,
  ChevronLeft,
  ChevronRight,
  Flame,
  GraduationCap,
  Home,
  MapPin,
  Phone,
  Search,
  Shield,
  UserCheck,
  X,
} from "lucide-react";
import type React from "react";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { ActiveUser, WhitelistUser } from "./types";

interface UserTableShellProps<T extends ActiveUser | WhitelistUser> {
  title: string;
  description: string;
  searchPlaceholder: string;
  search: string;
  onSearchChange: (val: string) => void;
  onSearchSubmit: (e: React.FormEvent) => void;
  isLoading: boolean;
  users: T[];
  count: number;
  page: number;
  limit: number;
  onPageChange: (page: number) => void;
  onLimitChange?: (limit: number) => void;
  roleFilter?: string;
  onRoleFilterChange?: (role: string) => void;
  dateColumnHeader: string;
  renderActions: (user: T) => React.ReactNode;
  emptyMessage: string;
}

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

export const UserTableShell = <T extends ActiveUser | WhitelistUser>({
  title,
  description,
  searchPlaceholder,
  search,
  onSearchChange,
  onSearchSubmit,
  isLoading,
  users,
  count,
  page,
  limit,
  onPageChange,
  onLimitChange,
  roleFilter,
  onRoleFilterChange,
  dateColumnHeader,
  renderActions,
  emptyMessage,
}: UserTableShellProps<T>) => {
  const totalPages = Math.ceil(count / limit) || 1;

  const renderRoleBadge = (roleName: string) => {
    const lower = roleName.toLowerCase();
    if (lower.includes("admin")) {
      return (
        <Badge
          variant="outline"
          className="text-[11px] font-semibold px-2 py-0.5 gap-1.5 bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/30 shadow-2xs"
        >
          <Shield className="w-3 h-3 text-purple-600 dark:text-purple-400 shrink-0" />
          <span>{roleName}</span>
        </Badge>
      );
    }
    if (lower.includes("leader")) {
      return (
        <Badge
          variant="outline"
          className="text-[11px] font-semibold px-2 py-0.5 gap-1.5 bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/30 shadow-2xs"
        >
          <Award className="w-3 h-3 text-blue-600 dark:text-blue-400 shrink-0" />
          <span>{roleName}</span>
        </Badge>
      );
    }
    if (lower.includes("brahmacari") || lower.includes("brahmachari")) {
      return (
        <Badge
          variant="outline"
          className="text-[11px] font-semibold px-2 py-0.5 gap-1.5 bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30 shadow-2xs"
        >
          <Flame className="w-3 h-3 text-amber-600 dark:text-amber-400 shrink-0" />
          <span>{roleName}</span>
        </Badge>
      );
    }
    if (lower.includes("student")) {
      return (
        <Badge
          variant="outline"
          className="text-[11px] font-semibold px-2 py-0.5 gap-1.5 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 shadow-2xs"
        >
          <GraduationCap className="w-3 h-3 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span>{roleName}</span>
        </Badge>
      );
    }
    return (
      <Badge
        variant="outline"
        className="text-[11px] font-semibold px-2 py-0.5 gap-1.5 bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-500/30 shadow-2xs"
      >
        <BookOpen className="w-3 h-3 text-slate-500 shrink-0" />
        <span>{roleName}</span>
      </Badge>
    );
  };

  const renderProfileBadges = (user: T) => {
    const hasProfile =
      user.ashram ||
      user.temple ||
      user.purpose ||
      user.authority_name ||
      user.phone;

    if (!hasProfile) {
      return (
        <span className="text-muted-foreground/60 text-xs italic">Default</span>
      );
    }

    return (
      <div className="flex flex-wrap items-center gap-1.5 max-w-sm">
        {user.phone && (
          <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-md bg-muted/60 text-foreground border border-border/60">
            <Phone className="w-2.5 h-2.5 text-muted-foreground shrink-0" />
            <span>{user.phone}</span>
          </span>
        )}
        {user.ashram && (
          <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-800 dark:text-amber-300 border border-amber-500/20">
            <Home className="w-2.5 h-2.5 text-amber-600 dark:text-amber-400 shrink-0" />
            <span>{user.ashram}</span>
          </span>
        )}
        {user.temple && (
          <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-800 dark:text-blue-300 border border-blue-500/20">
            <MapPin className="w-2.5 h-2.5 text-blue-600 dark:text-blue-400 shrink-0" />
            <span>{user.temple}</span>
          </span>
        )}
        {user.authority_name && (
          <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-md bg-purple-500/10 text-purple-800 dark:text-purple-300 border border-purple-500/20">
            <UserCheck className="w-2.5 h-2.5 text-purple-600 dark:text-purple-400 shrink-0" />
            <span>{user.authority_name}</span>
          </span>
        )}
        {user.purpose && (
          <span
            title={user.purpose}
            className="inline-flex items-center text-[11px] text-muted-foreground truncate max-w-[140px] px-1.5 py-0.5 bg-muted/40 rounded border border-border/40"
          >
            {user.purpose}
          </span>
        )}
      </div>
    );
  };

  const getInitials = (name?: string | null, email?: string | null) => {
    if (name?.trim()) {
      const parts = name.trim().split(" ");
      if (parts.length >= 2) {
        return (parts[0][0] + parts[1][0]).toUpperCase();
      }
      return name.trim().slice(0, 2).toUpperCase();
    }
    if (email) {
      return email.slice(0, 2).toUpperCase();
    }
    return "U";
  };

  return (
    <Card className="border border-border/80 shadow-2xs rounded-2xl bg-card overflow-hidden">
      <CardHeader className="p-5 sm:p-6 border-b border-border/60 bg-muted/20">
        <div>
          <div className="flex items-center gap-2.5">
            <CardTitle className="text-lg font-bold font-heading tracking-tight">
              {title}
            </CardTitle>
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
              {count.toLocaleString()} devotees
            </span>
          </div>
          <CardDescription className="text-xs text-muted-foreground mt-1">
            {description}
          </CardDescription>
        </div>

        {/* Toolbar: Search input and Role filter */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pt-4">
          <form
            onSubmit={onSearchSubmit}
            className="flex items-center gap-2 max-w-md w-full"
          >
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={searchPlaceholder}
                value={search}
                onChange={(e) => onSearchChange(e.target.value)}
                className="pl-9 pr-8 h-9 text-xs rounded-xl border-border/80 bg-background shadow-2xs focus-visible:ring-1"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => {
                    onSearchChange("");
                    onSearchSubmit({ preventDefault: () => {} } as any);
                  }}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            <Button
              type="submit"
              size="sm"
              className="h-9 px-4 rounded-xl text-xs font-semibold cursor-pointer shrink-0 shadow-2xs"
            >
              Search
            </Button>
          </form>

          {/* Role Filter Pills */}
          {onRoleFilterChange && (
            <div className="flex items-center gap-1 overflow-x-auto pb-1 md:pb-0">
              {[
                { label: "All Roles", value: "all" },
                { label: "Admin", value: "1" },
                { label: "Leaders", value: "3" },
                { label: "Brahmacari", value: "4" },
                { label: "Students", value: "2" },
              ].map((rf) => (
                <button
                  key={rf.value}
                  type="button"
                  onClick={() => onRoleFilterChange(rf.value)}
                  className={`text-[11px] font-semibold px-2.5 py-1 rounded-lg border transition-all cursor-pointer whitespace-nowrap ${
                    (roleFilter || "all") === rf.value
                      ? "bg-foreground text-background border-foreground shadow-2xs"
                      : "bg-background text-muted-foreground border-border/70 hover:text-foreground hover:border-border"
                  }`}
                >
                  {rf.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-muted/40">
              <TableRow className="border-b border-border/70 hover:bg-transparent">
                <TableHead className="text-xs font-bold uppercase tracking-wider text-muted-foreground h-10 px-4">
                  Devotee / Email
                </TableHead>
                <TableHead className="text-xs font-bold uppercase tracking-wider text-muted-foreground h-10 px-4">
                  Role
                </TableHead>
                <TableHead className="text-xs font-bold uppercase tracking-wider text-muted-foreground h-10 px-4">
                  Profile Details
                </TableHead>
                <TableHead className="text-xs font-bold uppercase tracking-wider text-muted-foreground h-10 px-4">
                  {dateColumnHeader}
                </TableHead>
                <TableHead className="text-xs font-bold uppercase tracking-wider text-muted-foreground h-10 px-4 text-right">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="text-center py-14 text-muted-foreground"
                  >
                    <div className="flex flex-col items-center justify-center gap-2">
                      <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                      <span className="text-xs font-medium">Loading users...</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : users.length > 0 ? (
                users.map((user) => {
                  const key = "id" in user && user.id ? user.id : user.email;
                  const roleName = user.roles?.name || "User";
                  const avatarUrl = (user as any).avatar_url;

                  return (
                    <TableRow
                      key={key}
                      className="border-b border-border/50 hover:bg-muted/30 transition-colors"
                    >
                      {/* User & Avatar */}
                      <TableCell className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          {avatarUrl ? (
                            <img
                              src={avatarUrl}
                              alt={user.name || user.email}
                              className="w-9 h-9 rounded-full object-cover shrink-0 border border-border/80 shadow-2xs"
                            />
                          ) : (
                            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary/15 to-primary/5 text-primary border border-primary/20 flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs">
                              {getInitials(user.name, user.email)}
                            </div>
                          )}
                          <div className="flex flex-col min-w-0">
                            <span className="font-semibold text-xs text-foreground truncate max-w-[220px]">
                              {user.name || user.email.split("@")[0]}
                            </span>
                            <span className="text-[11px] text-muted-foreground truncate max-w-[220px]">
                              {user.email}
                            </span>
                          </div>
                        </div>
                      </TableCell>

                      {/* Role Badge */}
                      <TableCell className="px-4 py-3 whitespace-nowrap">
                        {renderRoleBadge(roleName)}
                      </TableCell>

                      {/* Profile Badges */}
                      <TableCell className="px-4 py-3">
                        {renderProfileBadges(user)}
                      </TableCell>

                      {/* Date */}
                      <TableCell className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                        {user.created_at
                          ? new Date(user.created_at).toLocaleDateString(undefined, {
                              year: "numeric",
                              month: "short",
                              day: "numeric",
                            })
                          : "-"}
                      </TableCell>

                      {/* Actions */}
                      <TableCell className="px-4 py-3 text-right">
                        {renderActions(user)}
                      </TableCell>
                    </TableRow>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="text-center py-14 text-muted-foreground"
                  >
                    <div className="flex flex-col items-center justify-center gap-1.5">
                      <Search className="w-6 h-6 text-muted-foreground/60" />
                      <span className="text-xs font-semibold">{emptyMessage}</span>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {/* Enhanced Pagination Controls */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 border-t border-border/70 bg-muted/10">
          <div className="text-xs text-muted-foreground order-2 sm:order-1">
            Showing{" "}
            <span className="font-semibold text-foreground">
              {count > 0 ? (page - 1) * limit + 1 : 0}
            </span>{" "}
            to{" "}
            <span className="font-semibold text-foreground">
              {Math.min(page * limit, count)}
            </span>{" "}
            of{" "}
            <span className="font-semibold text-foreground">
              {count.toLocaleString()}
            </span>{" "}
            devotees
          </div>

          <div className="flex items-center gap-4 order-1 sm:order-2 w-full sm:w-auto justify-between sm:justify-end">
            {/* Page Size selector */}
            {onLimitChange && (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <span className="hidden sm:inline">Per page:</span>
                <div className="inline-flex rounded-lg border border-border/80 bg-background p-0.5 shadow-2xs">
                  {PAGE_SIZE_OPTIONS.map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => onLimitChange(opt)}
                      className={`px-2 py-0.5 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                        limit === opt
                          ? "bg-foreground text-background shadow-2xs"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Pagination Navigation */}
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="icon-sm"
                className="h-8 w-8 rounded-lg cursor-pointer"
                onClick={() => onPageChange(1)}
                disabled={page <= 1}
                title="First Page"
              >
                <ChevronFirst className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="outline"
                size="icon-sm"
                className="h-8 w-8 rounded-lg cursor-pointer"
                onClick={() => onPageChange(Math.max(page - 1, 1))}
                disabled={page <= 1}
                title="Previous Page"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </Button>

              <span className="text-xs font-semibold px-2 text-foreground whitespace-nowrap">
                {page} / {totalPages}
              </span>

              <Button
                variant="outline"
                size="icon-sm"
                className="h-8 w-8 rounded-lg cursor-pointer"
                onClick={() => onPageChange(Math.min(page + 1, totalPages))}
                disabled={page >= totalPages}
                title="Next Page"
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="outline"
                size="icon-sm"
                className="h-8 w-8 rounded-lg cursor-pointer"
                onClick={() => onPageChange(totalPages)}
                disabled={page >= totalPages}
                title="Last Page"
              >
                <ChevronLast className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
