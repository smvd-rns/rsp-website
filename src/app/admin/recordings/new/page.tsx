"use client";

import { useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, FileAudio } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import {
  createRecording,
  prepareRecordingUploadFolders,
} from "@/app/actions/recording-actions";
import { FormErrorAlert } from "@/components/admin/form-error-alert";
import {
  type FileProgressItem,
  RecordingForm,
  type UploadProgressInfo,
} from "@/components/admin/recording-form";
import { Button } from "@/components/ui/button";
import { QUERY_KEY, STORE } from "@/constants";
import { useCategories } from "@/hooks/use-categories";
import { useDictionaries } from "@/hooks/use-dictionaries";
import { uploadFileToDrive } from "@/lib/drive-upload";
import { getDB } from "@/lib/idb";
import { toast } from "@/lib/toast";
import {
  categoryPath,
  createLimiter,
  formatRecordingAudioFilename,
  parseYoutubeUrlOrToast,
  pathToUrlPath,
  triggerSync,
} from "@/lib/utils";
import { useRecordingForm } from "./use-recording-form";

export default function NewRecordingPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  const rawP = searchParams.get("p");
  const preselectedPath = rawP ? pathToUrlPath(rawP) : null;
  const { data: categories, isLoading: isLoadingCats } = useCategories();
  const {
    speakers,
    languages,
    contentTypes,
    venues,
    events,
    isLoading: isLoadingDicts,
  } = useDictionaries();

  const [isUploadingAudio, setIsUploadingAudio] = useState(false);
  const [isUploadingMaterials, setIsUploadingMaterials] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] =
    useState<UploadProgressInfo | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const { form, updateField, resetForm } = useRecordingForm({
    categories,
    isLoadingCats,
    speakers,
    languages,
    contentTypes,
    isLoadingDicts,
    preselectedPath,
  });

  const selectedParent =
    categories?.find((c) => c.id === form.selectedParentId) || null;

  const handleReset = () => {
    resetForm();
    toast.success("Form cleared successfully!");
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg(null);

    if (!form.name.trim()) {
      toast.error("Recording title is required.");
      setIsSubmitting(false);
      return;
    }

    if (!selectedParent) {
      toast.error("You must select a category for this recording.");
      setIsSubmitting(false);
      return;
    }

    const { valid, ytId } = parseYoutubeUrlOrToast(
      form.youtubeUrl,
      toast.error,
    );
    if (!valid) {
      setIsSubmitting(false);
      return;
    }

    const activeAudio = form.audios.find(
      (a) => !a.deleted && (a.id || a.localFile),
    );
    if (!activeAudio) {
      toast.error("Please select an audio file.");
      setIsSubmitting(false);
      return;
    }

    try {
      // 1. Prepare dedicated recording folders in Google Drive under both trees
      setUploadProgress({
        active: true,
        phase: "preparing",
        filename: `rec_${form.name.trim()}`,
        percent: 10,
      });
      const { folderId: recFolderId, videoFolderId: recVideoFolderId } =
        await prepareRecordingUploadFolders(
          selectedParent.id,
          form.name.trim(),
        );

      // Resolve human-readable taxonomy names for audio naming and database
      const venueObj = venues?.find(
        (v) => String(v.id) === String(form.selectedVenue),
      );
      const venueName = venueObj?.name || "";

      const langObjs = languages?.filter((l) =>
        form.selectedLanguages.includes(String(l.id)),
      );
      const languageName =
        langObjs && langObjs.length > 0
          ? langObjs.map((l) => l.name).join(", ")
          : "English";

      const speakerObjs = speakers?.filter((s) =>
        form.selectedSpeakers.includes(String(s.id)),
      );
      const speakerName =
        speakerObjs && speakerObjs.length > 0
          ? speakerObjs.map((s) => s.name).join(", ")
          : "HG Radheshyam Das";

      // 2. Upload audio file if selected locally into the recording folder
      let resolvedAudioId = activeAudio.id;
      let resolvedAudioSize = activeAudio.size || null;
      let resolvedAudioName = activeAudio.fileName;
      let resolvedAudioMime = activeAudio.mimeType || "audio/mpeg";

      if (activeAudio.localFile) {
        const eventObj = events?.find(
          (e) => String(e.id) === String(form.selectedEvent),
        );
        const typeObj = contentTypes?.find(
          (t) => String(t.id) === String(form.selectedType),
        );
        const eventOrTypeShortName =
          eventObj?.short_name ||
          (eventObj as unknown as { shortname?: string })?.shortname ||
          eventObj?.name ||
          typeObj?.name ||
          "Lec";

        const ext =
          activeAudio.localFile.name.split(".").pop()?.toLowerCase() || "mp3";

        const formattedAudioName = formatRecordingAudioFilename({
          recordedAt: form.recordedAt,
          venueName,
          languageName,
          eventOrTypeShortName,
          title: form.name.trim(),
          speakerName,
          extension: ext,
        });

        setUploadProgress({
          active: true,
          phase: "audio",
          filename: formattedAudioName,
          percent: 0,
          loadedBytes: 0,
          totalBytes: activeAudio.localFile.size,
        });

        resolvedAudioId = await uploadFileToDrive(
          activeAudio.localFile,
          (percent, loaded, total) => {
            setUploadProgress({
              active: true,
              phase: "audio",
              filename: formattedAudioName,
              percent,
              loadedBytes: loaded,
              totalBytes: total,
            });
          },
          selectedParent.id,
          recFolderId,
          formattedAudioName,
        );
        resolvedAudioSize = activeAudio.localFile.size;
        resolvedAudioName = formattedAudioName;
        resolvedAudioMime = activeAudio.localFile.type || "audio/mpeg";
      }

      // 3. Upload any local material files into the recording folder (Parallel Concurrency: 3)
      const localMaterials = form.materials.filter(
        (m) => !m.deleted && m.localFile,
      );

      const itemsMap = new Map<string, FileProgressItem>();
      for (const mat of localMaterials) {
        if (!mat.localFile) continue;
        const fileId = `${mat.name}-${mat.localFile.size}`;
        itemsMap.set(fileId, {
          id: fileId,
          name: mat.name,
          status: "queued",
          percent: 0,
          loadedBytes: 0,
          totalBytes: mat.localFile.size,
        });
      }

      const updateAggregateProgress = () => {
        const items = Array.from(itemsMap.values());
        const totalBytes = items.reduce(
          (sum, item) => sum + item.totalBytes,
          0,
        );
        const loadedBytes = items.reduce(
          (sum, item) => sum + item.loadedBytes,
          0,
        );
        const percent =
          totalBytes > 0
            ? Math.min(100, Math.round((loadedBytes / totalBytes) * 100))
            : 0;
        const activeCount = items.filter(
          (i) => i.status === "uploading",
        ).length;
        const doneCount = items.filter((i) => i.status === "completed").length;

        setUploadProgress({
          active: true,
          phase: "material",
          filename: `Uploading study materials (${doneCount}/${items.length} completed, ${activeCount} active in parallel)`,
          percent,
          loadedBytes,
          totalBytes,
          items,
        });
      };

      if (localMaterials.length > 0) {
        updateAggregateProgress();
      }

      const limit = createLimiter(3);

      const uploadPromises = form.materials.map(async (mat) => {
        if (mat.deleted) return null;
        if (!mat.localFile) {
          return {
            id: typeof mat.id === "number" ? mat.id : undefined,
            name: mat.name,
            storage_key: mat.storage_key,
            mime_type: mat.mime_type || "application/octet-stream",
            size: mat.size ?? null,
            is_generic: mat.is_generic || false,
            deleted: false,
            is_link: mat.is_link || false,
          };
        }

        const matFile = mat.localFile;
        const fileId = `${mat.name}-${matFile.size}`;

        return limit(async () => {
          const currentItem = itemsMap.get(fileId);
          if (currentItem) {
            currentItem.status = "uploading";
            updateAggregateProgress();
          }

          try {
            const driveKey = await uploadFileToDrive(
              matFile,
              (percent, loaded, total) => {
                const item = itemsMap.get(fileId);
                if (item) {
                  item.percent = percent;
                  item.loadedBytes = loaded;
                  item.totalBytes = total;
                  updateAggregateProgress();
                }
              },
              selectedParent.id,
              recFolderId,
            );

            const item = itemsMap.get(fileId);
            if (item) {
              item.status = "completed";
              item.percent = 100;
              item.loadedBytes = item.totalBytes;
              updateAggregateProgress();
            }

            return {
              id: typeof mat.id === "number" ? mat.id : undefined,
              name: mat.name,
              storage_key: driveKey,
              mime_type: mat.mime_type || "application/octet-stream",
              size: mat.size ?? null,
              is_generic: mat.is_generic || false,
              deleted: false,
              is_link: mat.is_link || false,
            };
          } catch (uploadErr) {
            const item = itemsMap.get(fileId);
            if (item) {
              item.status = "error";
              updateAggregateProgress();
            }
            throw uploadErr;
          }
        });
      });

      const results = await Promise.all(uploadPromises);
      const uploadedMaterials = results.filter(
        (m): m is NonNullable<typeof m> => m !== null,
      );

      setUploadProgress({
        active: true,
        phase: "saving",
        filename: "Saving recording and metadata to database...",
        percent: 100,
      });

      const data = {
        name: form.name.trim(),
        category_id: selectedParent.id,
        category_url_path: selectedParent.url_path,
        speaker_ids: form.selectedSpeakers.map(Number).filter(Boolean),
        lang_ids: form.selectedLanguages.map(Number).filter(Boolean),
        venues_id: form.selectedVenue ? Number(form.selectedVenue) : null,
        event_id: form.selectedEvent ? Number(form.selectedEvent) : null,
        type_id: form.selectedType ? Number(form.selectedType) : null,
        speaker_name: speakerName,
        language_name: languageName,
        venue_name: venueName,
        audio_id: resolvedAudioId,
        audio_size: resolvedAudioSize,
        audio_file_name: resolvedAudioName,
        audio_mime_type: resolvedAudioMime,
        recorded_at: form.recordedAt
          ? new Date(form.recordedAt).toISOString()
          : null,
        yt_id: ytId,
        materials: uploadedMaterials,
        gdriveid: recFolderId || null,
        videogdriveid: recVideoFolderId || null,
        audios: [
          {
            id: resolvedAudioId,
            fileName: resolvedAudioName,
            mimeType: resolvedAudioMime,
            size: resolvedAudioSize,
            deleted: false,
          },
        ],
      };

      const res = await createRecording(data);
      if (res?.recording) {
        const db = await getDB();
        if (db) {
          await db.put(STORE.RECORDINGS, res.recording);
          if (res?.materials && Array.isArray(res.materials)) {
            for (const mat of res.materials) {
              await db.put(STORE.MATERIALS, mat);
            }
          }
        }
      }
      queryClient.invalidateQueries({
        queryKey: [QUERY_KEY.CATEGORY_PAGE, selectedParent.url_path],
      });
      queryClient.invalidateQueries({ queryKey: [STORE.RECORDINGS] });
      queryClient.invalidateQueries({ queryKey: [STORE.MATERIALS] });
      triggerSync([STORE.RECORDINGS, STORE.MATERIALS]);
      toast.success("Recording created successfully");
      sessionStorage.removeItem("new_recording_form_session");
      router.push(
        `/admin/content/${categoryPath(selectedParent.url_path as string)}`,
      );
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Failed to create recording";
      setErrorMsg(msg);
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
      setUploadProgress(null);
    }
  };

  const cancelHref = preselectedPath
    ? `/admin/content/${categoryPath(preselectedPath)}`
    : "/admin/content";

  return (
    <div className="mx-auto max-w-5xl w-full flex flex-col gap-6 pb-12">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-5 sm:p-6 rounded-2xl bg-card border border-border/80 shadow-xs relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-full bg-gradient-to-l from-orange-500/5 via-amber-500/5 to-transparent pointer-events-none" />
        <div className="flex items-center gap-4 relative">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-orange-500 to-amber-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-orange-500/20">
            <FileAudio className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground font-heading">
                Upload & Create Recording
              </h1>
              <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/20 hidden sm:inline-block">
                Discourse Engine
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Add audio discourses, link video streams, attach study notes, and
              assign taxonomies.
            </p>
          </div>
        </div>

        <Button
          variant="outline"
          size="sm"
          asChild
          className="rounded-xl border-border/80 text-xs font-semibold cursor-pointer shrink-0 hover:bg-muted relative"
        >
          <Link
            href={cancelHref}
            prefetch={false}
            className="flex items-center gap-1.5"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Content</span>
          </Link>
        </Button>
      </div>

      <FormErrorAlert error={errorMsg} />

      <RecordingForm
        mode="create"
        formState={form}
        onChangeField={updateField}
        onSubmit={handleSubmit}
        onReset={handleReset}
        isSubmitting={isSubmitting}
        uploadProgress={uploadProgress}
        isUploadingAudio={isUploadingAudio}
        setIsUploadingAudio={setIsUploadingAudio}
        isUploadingMaterials={isUploadingMaterials}
        setIsUploadingMaterials={setIsUploadingMaterials}
      />
    </div>
  );
}
