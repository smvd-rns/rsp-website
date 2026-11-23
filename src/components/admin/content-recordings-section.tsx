"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowUpDown,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Edit2,
  FileAudio,
  Folder,
  Globe,
  RotateCcw,
  Search,
  Trash2,
  User,
  X,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useMemo, useState } from "react";
import { getAllCategoriesForAdmin } from "@/app/actions/category-actions";
import { softDeleteRecording } from "@/app/actions/recording-actions";
import { deleteRecordingPermanentlyAction } from "@/app/actions/trash-actions";
import { CategoryCombobox } from "@/components/admin/category-combobox";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { QUERY_KEY, STORE } from "@/constants";
import { useCategories } from "@/hooks/use-categories";
import { useDictionaries } from "@/hooks/use-dictionaries";
import { getDB, localDeleteRecording, localTrashRecording } from "@/lib/idb";
import { toast } from "@/lib/toast";
import { categoryPath, cn } from "@/lib/utils";
import type { Category, EnrichedRecording, Recording } from "@/types";

export const ContentRecordingsSection = () => {
  const _router = useRouter();
  const queryClient = useQueryClient();
  const { data: dbCategories } = useQuery({
    queryKey: ["admin", "categories", "all"],
    queryFn: () => getAllCategoriesForAdmin(),
    staleTime: 1000 * 60 * 5,
  });
  const { data: idbCategories = [] } = useCategories();
  const categories =
    dbCategories && dbCategories.length > 0 ? dbCategories : idbCategories;
  const dicts = useDictionaries();

  // 1. Fetch all recordings from IndexedDB
  const { data: rawRecordings = [], isLoading: isLoadingRecordings } = useQuery(
    {
      queryKey: [STORE.RECORDINGS],
      queryFn: async (): Promise<Recording[]> => {
        const db = await getDB();
        if (!db) return [];
        const recs = (await db.getAll(STORE.RECORDINGS)) as Recording[];
        return recs || [];
      },
      staleTime: 1000 * 60 * 5,
    },
  );

  // Category map for rapid breadcrumbs
  const categoryMap = useMemo(() => {
    const map = new Map<number, Category>();
    for (const c of categories) {
      map.set(Number(c.id), c);
    }
    return map;
  }, [categories]);

  // Enrich recordings with category path and dictionaries
  const allRecordings: EnrichedRecording[] = useMemo(() => {
    return rawRecordings.map((rec) => {
      const rawRec = rec as unknown as { parentid?: number | null };
      const catId =
        rec.category_id !== undefined && rec.category_id !== null
          ? Number(rec.category_id)
          : rawRec.parentid !== undefined && rawRec.parentid !== null
            ? Number(rawRec.parentid)
            : null;
      const cat = catId !== null ? categoryMap.get(catId) : null;
      return {
        ...rec,
        category_id: catId ?? rec.category_id,
        category: cat || null,
      } as EnrichedRecording;
    });
  }, [rawRecordings, categoryMap]);

  // Robust field getters supporting both PostgreSQL direct columns and Supabase/IDB schema
  const getSpeakerName = useCallback(
    (rec: EnrichedRecording | Recording): string => {
      const r = rec as unknown as { speaker?: string; speaker_ids?: number[] };
      if (r.speaker?.trim()) return r.speaker.trim();
      if (Array.isArray(r.speaker_ids) && r.speaker_ids.length > 0) {
        const names = r.speaker_ids
          .map((id) => dicts.speakers.find((s) => s.id === Number(id))?.name)
          .filter(Boolean)
          .join(", ");
        if (names) return names;
      }
      return "";
    },
    [dicts.speakers],
  );

  const getLanguageName = useCallback(
    (rec: EnrichedRecording | Recording): string => {
      const r = rec as unknown as { language?: string; lang_ids?: number[] };
      if (r.language?.trim()) return r.language.trim();
      if (Array.isArray(r.lang_ids) && r.lang_ids.length > 0) {
        const names = r.lang_ids
          .map((id) => dicts.languages.find((l) => l.id === Number(id))?.name)
          .filter(Boolean)
          .join(", ");
        if (names) return names;
      }
      return "";
    },
    [dicts.languages],
  );

  const getFormattedDate = useCallback(
    (rec: EnrichedRecording | Recording): string => {
      const r = rec as unknown as {
        recorded_at?: string | null;
        recdatetime?: string | null;
      };
      const raw = r.recorded_at || r.recdatetime;
      if (!raw) return "";
      try {
        const d = new Date(raw);
        if (!Number.isNaN(d.getTime())) {
          return d.toLocaleDateString(undefined, {
            year: "numeric",
            month: "short",
            day: "numeric",
          });
        }
      } catch {
        return "";
      }
      return "";
    },
    [],
  );

  // Search, Filter & Sort State
  const [search, setSearch] = useState("");
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(
    null,
  );
  const [selectedSpeakerId, setSelectedSpeakerId] = useState<string>("all");
  const [selectedLanguageId, setSelectedLanguageId] = useState<string>("all");
  const [sortOrder, setSortOrder] = useState<
    "title_asc" | "title_desc" | "date_desc" | "date_asc"
  >("title_asc");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(10);

  // Deletion Modal State
  const [deleteTarget, setDeleteTarget] = useState<EnrichedRecording | null>(
    null,
  );
  const [isDeleting, setIsDeleting] = useState(false);

  // Filtered & Sorted recordings
  const filteredRecordings = useMemo(() => {
    let result = allRecordings;

    // Filter by selected category (and its descendants)
    if (selectedCategoryId !== null) {
      const selCat = categoryMap.get(selectedCategoryId);
      if (selCat) {
        const selUrl = String(selCat.url_path || "");
        result = result.filter((r) => {
          if (r.category_id === selectedCategoryId) return true;
          const rCat = categoryMap.get(Number(r.category_id));
          if (!rCat) return false;
          const rUrl = String(rCat.url_path || "");
          return rUrl.startsWith(`${selUrl}.`);
        });
      }
    }

    // Filter by speaker (supports both ID matching and name matching)
    if (selectedSpeakerId !== "all") {
      const selSpk = dicts.speakers.find(
        (s) => String(s.id) === selectedSpeakerId,
      );
      const selName = selSpk?.name?.toLowerCase();
      const spkNum = Number(selectedSpeakerId);
      result = result.filter((r) => {
        const spk = getSpeakerName(r).toLowerCase();
        if (selName && spk.includes(selName)) return true;
        return (
          Array.isArray(r.speaker_ids) &&
          r.speaker_ids.map(Number).includes(spkNum)
        );
      });
    }

    // Filter by language (supports both ID matching and name matching)
    if (selectedLanguageId !== "all") {
      const selLang = dicts.languages.find(
        (l) => String(l.id) === selectedLanguageId,
      );
      const selName = selLang?.name?.toLowerCase();
      const langNum = Number(selectedLanguageId);
      result = result.filter((r) => {
        const lang = getLanguageName(r).toLowerCase();
        if (selName && lang.includes(selName)) return true;
        return (
          Array.isArray(r.lang_ids) && r.lang_ids.map(Number).includes(langNum)
        );
      });
    }

    // Filter by search term across title, category, speaker, and language
    const q = search.trim().toLowerCase();
    if (q) {
      result = result.filter((r) => {
        const title = String(r.name || "").toLowerCase();
        const catName = String(r.category?.name || "").toLowerCase();
        const spk = getSpeakerName(r).toLowerCase();
        const lang = getLanguageName(r).toLowerCase();
        return (
          title.includes(q) ||
          catName.includes(q) ||
          spk.includes(q) ||
          lang.includes(q)
        );
      });
    }

    // Sort
    const sorted = [...result];
    if (sortOrder === "title_asc") {
      sorted.sort((a, b) =>
        String(a.name || "").localeCompare(String(b.name || ""), undefined, {
          numeric: true,
          sensitivity: "base",
        }),
      );
    } else if (sortOrder === "title_desc") {
      sorted.sort((a, b) =>
        String(b.name || "").localeCompare(String(a.name || ""), undefined, {
          numeric: true,
          sensitivity: "base",
        }),
      );
    } else if (sortOrder === "date_desc") {
      sorted.sort((a, b) => {
        const rawA =
          a.recorded_at ||
          (a as unknown as { recdatetime?: string }).recdatetime;
        const rawB =
          b.recorded_at ||
          (b as unknown as { recdatetime?: string }).recdatetime;
        const da = rawA ? new Date(rawA).getTime() : 0;
        const db = rawB ? new Date(rawB).getTime() : 0;
        return db - da;
      });
    } else if (sortOrder === "date_asc") {
      sorted.sort((a, b) => {
        const rawA =
          a.recorded_at ||
          (a as unknown as { recdatetime?: string }).recdatetime;
        const rawB =
          b.recorded_at ||
          (b as unknown as { recdatetime?: string }).recdatetime;
        const da = rawA ? new Date(rawA).getTime() : 0;
        const db = rawB ? new Date(rawB).getTime() : 0;
        return da - db;
      });
    }

    return sorted;
  }, [
    allRecordings,
    selectedCategoryId,
    selectedSpeakerId,
    selectedLanguageId,
    search,
    sortOrder,
    categoryMap,
    dicts.speakers,
    dicts.languages,
    getSpeakerName,
    getLanguageName,
  ]);

  // Paginated recordings
  const paginatedRecordings = useMemo(() => {
    if (pageSize >= 9999) return filteredRecordings;
    const start = (currentPage - 1) * pageSize;
    return filteredRecordings.slice(start, start + pageSize);
  }, [filteredRecordings, currentPage, pageSize]);

  const totalPages = Math.max(
    1,
    Math.ceil(
      filteredRecordings.length /
        (pageSize >= 9999 ? filteredRecordings.length || 1 : pageSize),
    ),
  );

  // Deletion Actions
  const handleSoftDelete = async (rec: EnrichedRecording) => {
    setIsDeleting(true);
    const toastId = toast.loading(`Moving "${rec.name}" to Trash...`);
    try {
      await softDeleteRecording(rec.id);
      await localTrashRecording(rec.id);

      queryClient.invalidateQueries({ queryKey: [STORE.RECORDINGS] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY.CATEGORY_PAGE] });
      queryClient.invalidateQueries({ queryKey: ["trash"] });

      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("trigger-sync"));
      }

      toast.success("Recording moved to Trash", { id: toastId });
      setDeleteTarget(null);
    } catch (err: unknown) {
      toast.error(
        (err as { message?: string }).message || "Failed to delete recording",
        { id: toastId },
      );
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeletePermanently = async (rec: EnrichedRecording) => {
    setIsDeleting(true);
    const toastId = toast.loading(`Deleting "${rec.name}" permanently...`);
    try {
      await deleteRecordingPermanentlyAction(rec.id);
      await localDeleteRecording(rec.id);

      queryClient.invalidateQueries({ queryKey: [STORE.RECORDINGS] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY.CATEGORY_PAGE] });
      queryClient.invalidateQueries({ queryKey: ["trash"] });

      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("trigger-sync"));
      }

      toast.success("Recording permanently deleted", { id: toastId });
      setDeleteTarget(null);
    } catch (err: unknown) {
      toast.error(
        (err as { message?: string }).message || "Failed to delete recording",
        { id: toastId },
      );
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="flex flex-col gap-5">
      {/* Search & Filter Bar */}
      <div className="flex flex-col gap-3.5 p-4 sm:p-5 bg-card border border-border/80 rounded-2xl shadow-xs">
        {/* Top: Prominent, high-contrast Search Input with clear typing visibility */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-blue-500 pointer-events-none" />
            <Input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Search recordings by discourse title, speaker, or category..."
              className="pl-10.5 pr-10 h-11 text-sm font-semibold rounded-xl bg-background border-border/80 text-foreground placeholder:text-muted-foreground/60 focus-visible:ring-2 focus-visible:ring-blue-500/30 focus-visible:border-blue-500 shadow-2xs transition-all"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer p-1 rounded-full hover:bg-muted transition-colors"
                title="Clear search"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {(search ||
            selectedCategoryId !== null ||
            selectedSpeakerId !== "all" ||
            selectedLanguageId !== "all") && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSearch("");
                setSelectedCategoryId(null);
                setSelectedSpeakerId("all");
                setSelectedLanguageId("all");
                setCurrentPage(1);
              }}
              className="h-11 rounded-xl text-xs font-semibold text-muted-foreground hover:text-foreground cursor-pointer shrink-0 border-dashed hover:bg-muted transition-all"
            >
              <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
              Reset Filters
            </Button>
          )}
        </div>

        {/* Bottom: Dedicated 4-column filter grid (Category, Speaker, Language, Sort) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 pt-1">
          {/* Category Tree Picker Filter */}
          <div className="w-full">
            <CategoryCombobox
              value={selectedCategoryId}
              onChange={(val) => {
                setSelectedCategoryId(val);
                setCurrentPage(1);
              }}
              categories={categories}
              placeholder="All Categories"
              compact={true}
              allowRoot={false}
            />
          </div>

          {/* Speaker Filter */}
          <div className="relative w-full">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-orange-500">
              <User className="w-4 h-4" />
            </div>
            <select
              value={selectedSpeakerId}
              onChange={(e) => {
                setSelectedSpeakerId(e.target.value);
                setCurrentPage(1);
              }}
              className="h-10 pl-9 pr-3 rounded-xl bg-background border border-border/80 text-foreground text-xs font-medium w-full cursor-pointer focus:outline-hidden focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 transition-all shadow-2xs"
            >
              <option value="all">All Speakers</option>
              {dicts.speakers.map((spk) => (
                <option key={spk.id} value={String(spk.id)}>
                  {spk.name}
                </option>
              ))}
            </select>
          </div>

          {/* Language Filter */}
          <div className="relative w-full">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-sky-500">
              <Globe className="w-4 h-4" />
            </div>
            <select
              value={selectedLanguageId}
              onChange={(e) => {
                setSelectedLanguageId(e.target.value);
                setCurrentPage(1);
              }}
              className="h-10 pl-9 pr-3 rounded-xl bg-background border border-border/80 text-foreground text-xs font-medium w-full cursor-pointer focus:outline-hidden focus:ring-2 focus:ring-sky-500/30 focus:border-sky-500 transition-all shadow-2xs"
            >
              <option value="all">All Languages</option>
              {dicts.languages.map((lang) => (
                <option key={lang.id} value={String(lang.id)}>
                  {lang.name}
                </option>
              ))}
            </select>
          </div>

          {/* Sort Selector */}
          <div className="relative w-full">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-indigo-500">
              <ArrowUpDown className="w-4 h-4" />
            </div>
            <select
              value={sortOrder}
              onChange={(e) => {
                setSortOrder(
                  e.target.value as
                    | "title_asc"
                    | "title_desc"
                    | "date_desc"
                    | "date_asc",
                );
                setCurrentPage(1);
              }}
              className="h-10 pl-9 pr-3 rounded-xl bg-background border border-border/80 text-foreground text-xs font-semibold w-full cursor-pointer focus:outline-hidden focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition-all shadow-2xs"
            >
              <option value="title_asc">Sort: Title (A → Z)</option>
              <option value="title_desc">Sort: Title (Z → A)</option>
              <option value="date_desc">Sort: Newest Date</option>
              <option value="date_asc">Sort: Oldest Date</option>
            </select>
          </div>
        </div>
      </div>

      {/* Info & Page Size */}
      <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span>
            Found{" "}
            <strong className="text-foreground">
              {filteredRecordings.length}
            </strong>{" "}
            recordings
          </span>
          {selectedCategoryId !== null && (
            <Badge
              variant="secondary"
              className="text-[11px] font-semibold gap-1 pl-2 pr-1 rounded-lg bg-amber-500/15 text-amber-900 dark:text-amber-200 border-amber-500/30"
            >
              <span>{categoryMap.get(selectedCategoryId)?.name}</span>
              <button
                type="button"
                onClick={() => setSelectedCategoryId(null)}
                className="hover:text-foreground cursor-pointer"
              >
                <X className="w-3 h-3" />
              </button>
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-2">
          <span>Show</span>
          <select
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setCurrentPage(1);
            }}
            className="h-8 px-2.5 rounded-lg bg-background border border-border/80 text-foreground text-xs cursor-pointer focus:outline-hidden shadow-2xs"
          >
            <option value={10}>10</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
            <option value={9999}>All</option>
          </select>
          <span>per page</span>
        </div>
      </div>

      {/* Recordings Table */}
      <div className="rounded-2xl border border-border/80 overflow-x-auto shadow-xs bg-card">
        <Table className="min-w-[760px] w-full">
          <TableHeader>
            <TableRow className="bg-muted/40 hover:bg-muted/40 border-b border-border/80">
              <TableHead className="font-bold text-xs uppercase tracking-wider text-muted-foreground py-3.5 pl-4 w-[34%]">
                Discourse Title
              </TableHead>
              <TableHead className="font-bold text-xs uppercase tracking-wider text-muted-foreground py-3.5 hidden md:table-cell w-[18%]">
                Category
              </TableHead>
              <TableHead className="font-bold text-xs uppercase tracking-wider text-muted-foreground py-3.5 hidden sm:table-cell w-[15%]">
                Speaker
              </TableHead>
              <TableHead className="font-bold text-xs uppercase tracking-wider text-muted-foreground py-3.5 hidden xl:table-cell w-[11%]">
                Language
              </TableHead>
              <TableHead className="font-bold text-xs uppercase tracking-wider text-muted-foreground py-3.5 hidden lg:table-cell w-[11%]">
                Date
              </TableHead>
              <TableHead className="font-bold text-xs uppercase tracking-wider text-muted-foreground py-3.5 pr-4 w-[110px] text-right">
                Actions
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoadingRecordings ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="text-center py-16 text-xs text-muted-foreground"
                >
                  <div className="flex flex-col items-center justify-center gap-2">
                    <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                    <span>Loading recordings...</span>
                  </div>
                </TableCell>
              </TableRow>
            ) : paginatedRecordings.length > 0 ? (
              paginatedRecordings.map((rec) => {
                const spkName = getSpeakerName(rec);
                const langName = getLanguageName(rec);
                const dateDisplay = getFormattedDate(rec);

                return (
                  <TableRow
                    key={rec.id}
                    className="hover:bg-muted/40 transition-colors border-b border-border/60"
                  >
                    <TableCell className="font-semibold text-foreground text-xs py-3 pl-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500/20 via-indigo-500/15 to-violet-500/20 text-blue-600 dark:text-blue-400 border border-blue-500/30 flex items-center justify-center shrink-0 shadow-2xs">
                          <FileAudio className="w-4.5 h-4.5" />
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span
                            className="truncate max-w-[260px] sm:max-w-[360px] font-bold text-sm text-foreground hover:text-primary transition-colors cursor-pointer"
                            title={rec.name}
                          >
                            {rec.name}
                          </span>
                          <span className="text-[10px] text-muted-foreground font-mono">
                            ID #{rec.id}
                          </span>
                        </div>
                      </div>
                    </TableCell>

                    <TableCell className="hidden md:table-cell text-xs">
                      {rec.category ? (
                        <span
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-amber-500/15 text-amber-900 dark:text-amber-200 border border-amber-500/30 max-w-[220px] truncate shadow-2xs"
                          title={categoryPath(rec.category.url_path as string)}
                        >
                          <Folder className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                          <span className="truncate">{rec.category.name}</span>
                        </span>
                      ) : (
                        <span className="text-muted-foreground/50 text-xs italic">
                          Unassigned
                        </span>
                      )}
                    </TableCell>

                    <TableCell className="hidden sm:table-cell text-xs">
                      {spkName ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-orange-500/15 text-orange-900 dark:text-orange-200 border border-orange-500/30 shadow-2xs">
                          <User className="w-3.5 h-3.5 text-orange-600 dark:text-orange-400 shrink-0" />
                          <span className="truncate max-w-[150px]">
                            {spkName}
                          </span>
                        </span>
                      ) : (
                        <span className="text-muted-foreground/40 font-mono text-xs">
                          —
                        </span>
                      )}
                    </TableCell>

                    <TableCell className="hidden xl:table-cell text-xs">
                      {langName ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-sky-500/15 text-sky-900 dark:text-sky-200 border border-sky-500/30 shadow-2xs">
                          <Globe className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400 shrink-0" />
                          <span>{langName}</span>
                        </span>
                      ) : (
                        <span className="text-muted-foreground/40 font-mono text-xs">
                          —
                        </span>
                      )}
                    </TableCell>

                    <TableCell className="hidden lg:table-cell text-xs text-muted-foreground">
                      {dateDisplay ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-500/15 text-emerald-900 dark:text-emerald-200 border border-emerald-500/30 shadow-2xs">
                          <Calendar className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                          <span>{dateDisplay}</span>
                        </span>
                      ) : (
                        <span className="text-muted-foreground/40 font-mono text-xs">
                          —
                        </span>
                      )}
                    </TableCell>

                    <TableCell className="text-right pr-4">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          variant="ghost"
                          size="sm"
                          asChild
                          className="h-8 px-2.5 text-blue-600 dark:text-blue-400 hover:text-blue-700 hover:bg-blue-500/15 rounded-xl cursor-pointer border border-transparent hover:border-blue-500/30 gap-1 text-xs font-bold transition-all"
                          title="Edit Recording & Move Category (Syncs Google Drive)"
                        >
                          <Link
                            href={`/admin/recordings/${rec.id}/edit?returnTo=/admin/content`}
                            prefetch={true}
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                            <span>Edit</span>
                          </Link>
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-rose-600 dark:text-rose-400 hover:text-rose-700 hover:bg-rose-500/15 rounded-xl cursor-pointer border border-transparent hover:border-rose-500/30 transition-all"
                          title="Delete Recording"
                          onClick={() => setDeleteTarget(rec)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            ) : (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="text-center py-12 text-xs text-muted-foreground"
                >
                  {search
                    ? `No recordings found matching "${search}".`
                    : "No recordings found for the selected filter."}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination Controls Footer */}
      {filteredRecordings.length > 0 && pageSize < 9999 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-2 py-2 text-xs text-muted-foreground">
          <div>
            Showing{" "}
            <strong className="text-foreground">
              {(currentPage - 1) * pageSize + 1}
            </strong>{" "}
            to{" "}
            <strong className="text-foreground">
              {Math.min(currentPage * pageSize, filteredRecordings.length)}
            </strong>{" "}
            of{" "}
            <strong className="text-foreground">
              {filteredRecordings.length}
            </strong>{" "}
            recordings
          </div>

          {totalPages > 1 && (
            <div className="flex items-center gap-1.5">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="h-8 px-2.5 rounded-lg text-xs gap-1 cursor-pointer"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Prev</span>
              </Button>

              <div className="flex items-center gap-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter((p) => {
                    return (
                      p === 1 ||
                      p === totalPages ||
                      Math.abs(p - currentPage) <= 1
                    );
                  })
                  .map((p, idx, arr) => {
                    const prev = arr[idx - 1];
                    return (
                      <div key={p} className="flex items-center">
                        {prev && p - prev > 1 && (
                          <span className="px-1 text-muted-foreground">
                            ...
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={() => setCurrentPage(p)}
                          className={cn(
                            "w-7 h-7 rounded-lg text-xs font-semibold transition-all cursor-pointer",
                            currentPage === p
                              ? "bg-primary text-primary-foreground font-bold shadow-2xs"
                              : "text-muted-foreground hover:bg-muted hover:text-foreground",
                          )}
                        >
                          {p}
                        </button>
                      </div>
                    );
                  })}
              </div>

              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={currentPage >= totalPages}
                onClick={() =>
                  setCurrentPage((p) => Math.min(totalPages, p + 1))
                }
                className="h-8 px-2.5 rounded-lg text-xs gap-1 cursor-pointer"
              >
                <span>Next</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Delete Recording Confirmation */}
      {deleteTarget && (
        <AlertDialog
          open={Boolean(deleteTarget)}
          onOpenChange={(open) => !open && setDeleteTarget(null)}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Recording?</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete &ldquo;{deleteTarget.name}
                &rdquo;?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isDeleting}>
                Cancel
              </AlertDialogCancel>
              <Button
                variant="outline"
                disabled={isDeleting}
                onClick={() => handleSoftDelete(deleteTarget)}
                className="border-amber-500/40 text-amber-700 dark:text-amber-300 hover:bg-amber-500/10 cursor-pointer"
              >
                Move to Trash
              </Button>
              <AlertDialogAction
                disabled={isDeleting}
                onClick={() => handleDeletePermanently(deleteTarget)}
                className="bg-destructive hover:bg-destructive text-white cursor-pointer"
              >
                Delete Permanently
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
};
