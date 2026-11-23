"use client";

import { useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  BookOpen,
  Calendar,
  CheckCircle2,
  Clock,
  FileText,
  FolderTree,
  Globe,
  Headphones,
  Loader2,
  MapPin,
  Mic,
  RotateCcw,
  Sparkles,
  Video,
} from "lucide-react";
import {
  createContentType,
  createEvent,
  createLanguage,
  createSpeaker,
  createVenue,
} from "@/app/actions/dictionary-actions";
import { type AudioFile, AudioUpload } from "@/components/admin/audio-upload";
import { CategoryCombobox } from "@/components/admin/category-combobox";
import { Combobox } from "@/components/admin/combobox";
import type { MaterialFile } from "@/components/admin/materials-upload";
import { MaterialsUpload } from "@/components/admin/materials-upload";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { STORE } from "@/constants";
import { useCategories } from "@/hooks/use-categories";
import { useDictionaries } from "@/hooks/use-dictionaries";
import { getDB } from "@/lib/idb";
import {
  cleanFilenameToTitle,
  extractYoutubeId,
  formatBytes,
} from "@/lib/utils";
import type {
  Category,
  ContentType,
  Event,
  Language,
  Speaker,
  Venue,
} from "@/types";

export interface RecordingFormState {
  name: string;
  selectedParentId: number | null;
  selectedSpeakers: string[];
  selectedLanguages: string[];
  selectedVenue: string;
  selectedEvent: string;
  selectedType: string;
  audios: AudioFile[];
  materials: MaterialFile[];
  recordedAt: string;
  youtubeUrl: string;
}

export interface FileProgressItem {
  id: string;
  name: string;
  status: "queued" | "uploading" | "completed" | "error";
  percent: number;
  loadedBytes: number;
  totalBytes: number;
}

export interface UploadProgressInfo {
  active: boolean;
  phase: "preparing" | "audio" | "material" | "saving";
  filename: string;
  percent: number;
  loadedBytes?: number;
  totalBytes?: number;
  items?: FileProgressItem[];
}

interface RecordingFormProps {
  mode: "create" | "edit";
  formState: RecordingFormState;
  onChangeField: <K extends keyof RecordingFormState>(
    field: K,
    value: RecordingFormState[K],
  ) => void;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  onReset: () => void;
  isSubmitting: boolean;
  uploadProgress?: UploadProgressInfo | null;
  isUploadingAudio: boolean;
  setIsUploadingAudio: (val: boolean) => void;
  isUploadingMaterials: boolean;
  setIsUploadingMaterials: (val: boolean) => void;
  categories?: Category[];
  speakers?: Speaker[];
  languages?: Language[];
  contentTypes?: ContentType[];
  venues?: Venue[];
  events?: Event[];
  isLoadingCats?: boolean;
  isLoadingDicts?: boolean;
}

export const RecordingForm = ({
  mode,
  formState,
  onChangeField,
  onSubmit,
  onReset,
  isSubmitting,
  uploadProgress,
  isUploadingAudio,
  setIsUploadingAudio,
  isUploadingMaterials,
  setIsUploadingMaterials,
  categories,
  speakers,
  languages,
  contentTypes,
  venues,
  events,
}: RecordingFormProps) => {
  const queryClient = useQueryClient();
  const catsData = useCategories();
  const dictsData = useDictionaries();

  const activeCategories = categories ?? catsData.data ?? [];
  const activeSpeakers = speakers ?? dictsData.speakers;
  const activeLanguages = languages ?? dictsData.languages;
  const activeContentTypes = contentTypes ?? dictsData.contentTypes;
  const activeVenues = venues ?? dictsData.venues;
  const activeEvents = events ?? dictsData.events;

  const isUploading = isUploadingAudio || isUploadingMaterials;

  const handleQuickAdd = async <T extends { id: number; name: string }>(
    storeName: string,
    createFn: (name: string) => Promise<T>,
    name: string,
    sortKeyFn?: (item: T) => string,
  ) => {
    const item = await createFn(name);
    const db = await getDB();
    if (db) {
      await db.put(storeName, item);
    }
    queryClient.setQueryData<T[]>([storeName], (old) => {
      if (!old) return [item];
      return [...old, item].sort((a, b) => {
        const valA = sortKeyFn ? sortKeyFn(a) : a.name;
        const valB = sortKeyFn ? sortKeyFn(b) : b.name;
        return valA.localeCompare(valB);
      });
    });
    return { value: String(item.id), label: item.name };
  };

  const setFileNameBasedOnFile = (fileName: string) => {
    if (mode === "create" && !formState.name) {
      onChangeField("name", cleanFilenameToTitle(fileName));
    }
  };

  let submitButtonText =
    mode === "create" ? "Create Recording" : "Update Recording";
  if (isSubmitting) {
    if (uploadProgress?.active) {
      if (uploadProgress.phase === "preparing") {
        submitButtonText = "Creating Folders...";
      } else if (uploadProgress.phase === "audio") {
        submitButtonText = `Uploading Audio (${uploadProgress.percent}%)...`;
      } else if (uploadProgress.phase === "material") {
        submitButtonText = `Uploading Notes (${uploadProgress.percent}%)...`;
      } else {
        submitButtonText = "Saving...";
      }
    } else {
      submitButtonText =
        mode === "create" ? "Uploading & Creating..." : "Saving Updates...";
    }
  }

  const resetButtonText = mode === "create" ? "Clear Form" : "Reset Form";

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      {/* 1. Media Upload Card - Sky / Blue Accent */}
      <Card className="border border-sky-500/25 hover:border-sky-500/50 rounded-2xl shadow-xs transition-all overflow-hidden bg-card/80 backdrop-blur-xs">
        <CardHeader className="border-b border-sky-500/15 bg-sky-500/[0.04] px-6 py-4 flex flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-sky-500/15 text-sky-600 dark:text-sky-400 flex items-center justify-center shrink-0 border border-sky-500/25 shadow-2xs">
              <Headphones className="h-4.5 w-4.5" />
            </div>
            <div>
              <CardTitle className="text-sm font-bold tracking-tight text-foreground flex items-center gap-2">
                <span>Discourse Audio</span>
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                Upload the discourse audio file for Google Drive storage.
              </CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="text-[10px] font-semibold px-2.5 py-1 rounded-full bg-sky-500/15 text-sky-700 dark:text-sky-300 border border-sky-500/25">
              Audio File
            </span>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <AudioUpload
            audios={formState.audios}
            onChange={(audios) => onChangeField("audios", audios)}
            isUploading={isUploadingAudio}
            setIsUploading={setIsUploadingAudio}
            onUploadStart={setFileNameBasedOnFile}
            onUploadSuccess={setFileNameBasedOnFile}
          />
        </CardContent>
      </Card>

      {/* 2. Recording Details Card - Amber / Orange Accent */}
      <Card className="border border-amber-500/25 hover:border-amber-500/50 rounded-2xl shadow-xs transition-all overflow-hidden bg-card/80 backdrop-blur-xs">
        <CardHeader className="border-b border-amber-500/15 bg-amber-500/[0.04] px-6 py-4 flex flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 border border-amber-500/25 shadow-2xs">
              <BookOpen className="h-4.5 w-4.5" />
            </div>
            <div>
              <CardTitle className="text-sm font-bold tracking-tight text-foreground">
                Title & Video
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                Enter discourse title and optional YouTube video link.
              </CardDescription>
            </div>
          </div>
          <span className="text-[10px] font-semibold px-2.5 py-1 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/25 shrink-0">
            Basic Info
          </span>
        </CardHeader>
        <CardContent className="p-6 space-y-5">
          {/* Title */}
          <div className="space-y-1.5">
            <Label
              htmlFor="name"
              className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5"
            >
              <span>Discourse Title</span>
              <span className="text-destructive font-black">*</span>
            </Label>
            <Input
              id="name"
              name="name"
              required
              placeholder="e.g. BG 02.13 - Dehino 'smin Yatha Dehe (Pune, 2024)"
              value={formState.name}
              onChange={(e) => onChangeField("name", e.target.value)}
              className="h-11 rounded-xl border-border/80 focus-visible:ring-amber-500/30 text-sm font-medium bg-background"
            />
          </div>

          {/* YouTube Video Link */}
          <div className="space-y-1.5 pt-1">
            <div className="flex items-center justify-between">
              <Label
                htmlFor="youtubeUrl"
                className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5"
              >
                <Video className="w-3.5 h-3.5 text-rose-600" />
                <span>YouTube Video Link or Video ID</span>
              </Label>
              <span className="text-[10px] font-semibold text-rose-600 dark:text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded-md border border-rose-500/20">
                Optional
              </span>
            </div>
            <Input
              id="youtubeUrl"
              name="youtubeUrl"
              placeholder="e.g. https://www.youtube.com/watch?v=dQw4w9WgXcQ or Video ID"
              value={formState.youtubeUrl}
              onChange={(e) => {
                const val = e.target.value;
                const extractedId = extractYoutubeId(val);
                onChangeField("youtubeUrl", extractedId || val);
              }}
              className="h-10 rounded-xl border-border/80 text-xs bg-background"
            />
            {(() => {
              const extractedId = extractYoutubeId(formState.youtubeUrl);
              if (extractedId) {
                return (
                  <div className="mt-3 aspect-video w-full max-w-lg overflow-hidden rounded-xl border border-rose-500/30 bg-black shadow-md relative group">
                    <iframe
                      width="100%"
                      height="100%"
                      src={`https://www.youtube-nocookie.com/embed/${extractedId}?rel=0`}
                      title="YouTube video player"
                      frameBorder="0"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                      referrerPolicy="strict-origin-when-cross-origin"
                      allowFullScreen
                      className="h-full w-full"
                    />
                  </div>
                );
              }
              return null;
            })()}
          </div>
        </CardContent>
      </Card>

      {/* 3. Category & Details Card - Violet / Purple Accent */}
      <Card className="border border-violet-500/25 hover:border-violet-500/50 rounded-2xl shadow-xs transition-all overflow-hidden bg-card/80 backdrop-blur-xs">
        <CardHeader className="border-b border-violet-500/15 bg-violet-500/[0.04] px-6 py-4 flex flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-violet-500/15 text-violet-600 dark:text-violet-400 flex items-center justify-center shrink-0 border border-violet-500/25 shadow-2xs">
              <FolderTree className="h-4.5 w-4.5" />
            </div>
            <div>
              <CardTitle className="text-sm font-bold tracking-tight text-foreground">
                Category & Details
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                Select category folder, format, date, speaker, language, and
                venue.
              </CardDescription>
            </div>
          </div>
          <span className="text-[10px] font-semibold px-2.5 py-1 rounded-full bg-violet-500/15 text-violet-700 dark:text-violet-300 border border-violet-500/25 shrink-0">
            Category & Info
          </span>
        </CardHeader>
        <CardContent className="p-6 space-y-5">
          {/* Parent Category */}
          <div className="space-y-1.5">
            <Label
              htmlFor="parent_id"
              className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5"
            >
              <FolderTree className="w-3.5 h-3.5 text-violet-600" />
              <span>Select Category</span>
              <span className="text-destructive font-black">*</span>
            </Label>
            <CategoryCombobox
              categories={activeCategories}
              value={formState.selectedParentId}
              onChange={(id) => onChangeField("selectedParentId", id)}
              allowRoot={false}
            />
            <p className="text-[11px] text-muted-foreground/80 pl-1">
              Select the category where this recording belongs.
            </p>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            {/* Content Format / Type */}
            <div className="space-y-1.5">
              <Label
                htmlFor="type"
                className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5"
              >
                <Mic className="w-3.5 h-3.5 text-violet-600" />
                <span>Content Format / Type</span>
              </Label>
              <Combobox
                items={activeContentTypes.map((t) => ({
                  value: String(t.id),
                  label: t.name,
                }))}
                value={formState.selectedType}
                onValueChange={(selectedType) =>
                  onChangeField("selectedType", selectedType)
                }
                placeholder="Select Type (e.g. Lecture, Seminar)..."
                onQuickAdd={(name) =>
                  handleQuickAdd(STORE.CONTENT_TYPES, createContentType, name)
                }
              />
            </div>

            {/* Date Recorded */}
            <div className="space-y-1.5">
              <Label
                htmlFor="recorded_at"
                className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5"
              >
                <Calendar className="w-3.5 h-3.5 text-violet-600" />
                <span>Date Recorded</span>
              </Label>
              <Input
                id="recorded_at"
                name="recorded_at"
                type="date"
                value={formState.recordedAt}
                onChange={(e) => onChangeField("recordedAt", e.target.value)}
                className="h-10 rounded-xl border-border/80 bg-background text-xs"
              />
            </div>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            {/* Speakers */}
            <div className="space-y-1.5">
              <Label
                htmlFor="speaker"
                className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5"
              >
                <Mic className="w-3.5 h-3.5 text-violet-600" />
                <span>Speaker(s)</span>
              </Label>
              <Combobox
                items={activeSpeakers.map((s) => ({
                  value: String(s.id),
                  label: s.name,
                }))}
                value={formState.selectedSpeakers}
                onValueChange={(selectedSpeakers) =>
                  onChangeField("selectedSpeakers", selectedSpeakers)
                }
                isMulti
                placeholder="Select Speaker(s)..."
                onQuickAdd={(name) =>
                  handleQuickAdd(STORE.SPEAKERS, createSpeaker, name)
                }
              />
            </div>

            {/* Languages */}
            <div className="space-y-1.5">
              <Label
                htmlFor="language"
                className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5"
              >
                <Globe className="w-3.5 h-3.5 text-violet-600" />
                <span>Language(s)</span>
              </Label>
              <Combobox
                items={activeLanguages.map((l) => ({
                  value: String(l.id),
                  label: l.native_name
                    ? `${l.name} (${l.native_name})`
                    : l.name,
                }))}
                value={formState.selectedLanguages}
                onValueChange={(selectedLanguages) =>
                  onChangeField("selectedLanguages", selectedLanguages)
                }
                isMulti
                placeholder="Select Language(s)..."
                onQuickAdd={(name) =>
                  handleQuickAdd(STORE.LANGUAGES, createLanguage, name)
                }
              />
            </div>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            {/* Venue */}
            <div className="space-y-1.5">
              <Label
                htmlFor="venue"
                className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5"
              >
                <MapPin className="w-3.5 h-3.5 text-violet-600" />
                <span>Venue / City</span>
              </Label>
              <Combobox
                items={activeVenues.map((v) => ({
                  value: String(v.id),
                  label: v.name,
                }))}
                value={formState.selectedVenue}
                onValueChange={(selectedVenue) =>
                  onChangeField("selectedVenue", selectedVenue)
                }
                placeholder="Select Venue..."
                onQuickAdd={(name) =>
                  handleQuickAdd(STORE.VENUES, createVenue, name)
                }
              />
            </div>

            {/* Event / Occasion */}
            <div className="space-y-1.5">
              <Label
                htmlFor="event"
                className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5"
              >
                <Calendar className="w-3.5 h-3.5 text-violet-600" />
                <span>Event / Festival</span>
              </Label>
              <Combobox
                items={activeEvents.map((e) => ({
                  value: String(e.id),
                  label: e.short_name ? `${e.name} (${e.short_name})` : e.name,
                }))}
                value={formState.selectedEvent}
                onValueChange={(selectedEvent) =>
                  onChangeField("selectedEvent", selectedEvent)
                }
                placeholder="Select Event..."
                onQuickAdd={(name) =>
                  handleQuickAdd(
                    STORE.EVENTS,
                    createEvent,
                    name,
                    (a) => a.short_name || a.name,
                  )
                }
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 4. Materials Upload Card - Emerald / Teal Accent */}
      <Card className="border border-emerald-500/25 hover:border-emerald-500/50 rounded-2xl shadow-xs transition-all overflow-hidden bg-card/80 backdrop-blur-xs">
        <CardHeader className="border-b border-emerald-500/15 bg-emerald-500/[0.04] px-6 py-4 flex flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/25 shadow-2xs">
              <FileText className="h-4.5 w-4.5" />
            </div>
            <div>
              <CardTitle className="text-sm font-bold tracking-tight text-foreground">
                Study Materials & Notes
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                Attach lecture notes, presentation slides, or reference
                documents.
              </CardDescription>
            </div>
          </div>
          <span className="text-[10px] font-semibold px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/25 shrink-0">
            Optional Files
          </span>
        </CardHeader>
        <CardContent className="p-6">
          <MaterialsUpload
            materials={formState.materials}
            onChange={(val) =>
              onChangeField("materials", val as MaterialFile[])
            }
            isUploading={isUploadingMaterials}
            setIsUploading={setIsUploadingMaterials}
          />
        </CardContent>
      </Card>

      {/* Real-time Upload Progress Bar */}
      {uploadProgress?.active && (
        <div className="p-4 sm:p-5 rounded-2xl bg-card border-2 border-primary/30 shadow-lg flex flex-col gap-3.5 animate-in fade-in-50 duration-200">
          <div className="flex items-center justify-between text-xs font-semibold">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-primary animate-pulse" />
              <span className="text-foreground font-semibold">
                {uploadProgress.phase === "preparing" &&
                  "Preparing Google Drive Folders..."}
                {uploadProgress.phase === "audio" &&
                  "Uploading Discourse Audio Stream..."}
                {uploadProgress.phase === "material" &&
                  (uploadProgress.filename || "Uploading Study Materials...")}
                {uploadProgress.phase === "saving" &&
                  "Saving recording and metadata to database..."}
              </span>
            </div>
            <span className="font-mono text-primary font-bold text-sm">
              {uploadProgress.percent}%
            </span>
          </div>

          <Progress
            value={uploadProgress.percent}
            className="h-2.5 rounded-full"
          />

          <div className="flex items-center justify-between text-[11px] text-muted-foreground font-mono">
            <span
              className="truncate max-w-[65%]"
              title={uploadProgress.filename}
            >
              {uploadProgress.items && uploadProgress.items.length > 0
                ? `${uploadProgress.items.filter((i) => i.status === "completed").length} of ${uploadProgress.items.length} files finished`
                : uploadProgress.filename}
            </span>
            {uploadProgress.totalBytes ? (
              <span className="shrink-0 font-medium text-foreground/80">
                {formatBytes(uploadProgress.loadedBytes || 0)} /{" "}
                {formatBytes(uploadProgress.totalBytes)}
              </span>
            ) : null}
          </div>

          {/* Individual Per-File Progress Queue */}
          {uploadProgress.items && uploadProgress.items.length > 0 && (
            <div className="mt-1 pt-3 border-t border-border/60 flex flex-col gap-2 max-h-56 overflow-y-auto pr-1">
              {uploadProgress.items.map((item) => (
                <div
                  key={item.id}
                  className="flex flex-col gap-1.5 p-2.5 rounded-xl border border-border/60 bg-muted/30 text-xs"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      {item.status === "completed" && (
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                      )}
                      {item.status === "uploading" && (
                        <Loader2 className="w-4 h-4 text-sky-500 animate-spin shrink-0" />
                      )}
                      {item.status === "queued" && (
                        <Clock className="w-4 h-4 text-amber-500/80 shrink-0" />
                      )}
                      {item.status === "error" && (
                        <AlertCircle className="w-4 h-4 text-destructive shrink-0" />
                      )}
                      <span
                        className="font-medium text-foreground truncate max-w-[200px] sm:max-w-[340px]"
                        title={item.name}
                      >
                        {item.name}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[10px] text-muted-foreground font-mono">
                        {formatBytes(item.loadedBytes)} /{" "}
                        {formatBytes(item.totalBytes)}
                      </span>
                      {item.status === "completed" && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25">
                          Completed
                        </span>
                      )}
                      {item.status === "uploading" && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-sky-500/15 text-sky-600 dark:text-sky-400 border border-sky-500/25 font-mono">
                          {item.percent}%
                        </span>
                      )}
                      {item.status === "queued" && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/25">
                          In Queue
                        </span>
                      )}
                      {item.status === "error" && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-destructive/15 text-destructive border border-destructive/25">
                          Failed
                        </span>
                      )}
                    </div>
                  </div>

                  {item.status === "uploading" && (
                    <Progress
                      value={item.percent}
                      className="h-1.5 rounded-full bg-sky-500/20"
                    />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 5. Sticky / Action Bar */}
      <div className="sticky bottom-4 z-30 p-4 rounded-2xl bg-card/95 backdrop-blur-md border border-border/80 shadow-lg flex items-center justify-between gap-4">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onReset}
          disabled={isSubmitting || isUploading}
          className="rounded-xl border-border/80 text-xs font-semibold cursor-pointer hover:bg-muted"
        >
          <RotateCcw className="w-3.5 h-3.5 mr-1.5 text-muted-foreground" />
          <span>{resetButtonText}</span>
        </Button>

        <Button
          type="submit"
          size="default"
          disabled={
            isSubmitting ||
            catsData.isLoading ||
            dictsData.isLoading ||
            isUploading
          }
          className="rounded-xl bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white font-bold h-11 px-8 text-sm cursor-pointer shadow-md shadow-orange-500/25 transition-all"
        >
          <Sparkles className="w-4 h-4 mr-2" />
          <span>{submitButtonText}</span>
        </Button>
      </div>
    </form>
  );
};
