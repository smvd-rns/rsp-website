"use client";

import { useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { use, useCallback, useEffect, useState } from "react";
import {
  getRecording,
  prepareRecordingUploadFolders,
  updateRecording,
} from "@/app/actions/recording-actions";
import { FormErrorAlert } from "@/components/admin/form-error-alert";
import type { MaterialFile } from "@/components/admin/materials-upload";
import {
  type FileProgressItem,
  RecordingForm,
  type RecordingFormState,
  type UploadProgressInfo,
} from "@/components/admin/recording-form";
import Loading from "@/components/loading";
import { Button } from "@/components/ui/button";
import { QUERY_KEY, STORE } from "@/constants";
import { useCategories } from "@/hooks/use-categories";
import { useDictionaries } from "@/hooks/use-dictionaries";
import { uploadFileToDrive } from "@/lib/drive-upload";
import { getDB } from "@/lib/idb";
import { toast } from "@/lib/toast";
import {
  createLimiter,
  formatRecordingAudioFilename,
  parseYoutubeUrlOrToast,
} from "@/lib/utils";
import type { Recording, Tables } from "@/types";

type DbRecording = Recording & {
  materials?: Tables<"materials">[];
};

export default function EditRecordingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: rawId } = use(params);
  const id = Number(rawId);
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnTo = searchParams.get("returnTo") || "/admin/content";
  const queryClient = useQueryClient();
  const { data: categories } = useCategories();
  const { speakers, languages, contentTypes, venues, events } =
    useDictionaries();

  const [isLoading, setIsLoading] = useState(true);
  const [isUploadingAudio, setIsUploadingAudio] = useState(false);
  const [isUploadingMaterials, setIsUploadingMaterials] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] =
    useState<UploadProgressInfo | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [form, setForm] = useState<RecordingFormState>({
    name: "",
    selectedParentId: null,
    selectedSpeakers: [],
    selectedLanguages: [],
    selectedVenue: "",
    selectedEvent: "",
    selectedType: "",
    audios: [],
    materials: [],
    recordedAt: "",
    youtubeUrl: "",
  });

  const [dbRecording, setDbRecording] = useState<DbRecording | null>(null);

  const updateField = <K extends keyof RecordingFormState>(
    field: K,
    value:
      | RecordingFormState[K]
      | ((prev: RecordingFormState[K]) => RecordingFormState[K]),
  ) => {
    setForm((prev) => ({
      ...prev,
      [field]:
        typeof value === "function"
          ? (value as (prev: RecordingFormState[K]) => RecordingFormState[K])(
              prev[field],
            )
          : value,
    }));
  };

  // Helper to build a unified form state whether from PostgreSQL or IndexedDB
  const buildInitialForm = useCallback(
    (recording: DbRecording): RecordingFormState => {
      const recAny = recording as unknown as {
        speaker?: string;
        language?: string;
        venue?: string;
        recdatetime?: string;
        parentid?: number;
        audioid?: string;
        videoid?: string;
        materials?: Tables<"materials">[];
      };

      // Speakers: map ids, or match speaker string to dictionary
      let spkIds: string[] = (recording.speaker_ids || []).map(String);
      if (spkIds.length === 0 && recAny.speaker && speakers) {
        const sName = recAny.speaker.toLowerCase();
        const matched = speakers.filter((s) =>
          sName.includes(s.name.toLowerCase()),
        );
        if (matched.length > 0) spkIds = matched.map((s) => String(s.id));
      }

      // Languages: map ids, or match language string to dictionary
      let lIds: string[] = (recording.lang_ids || []).map(String);
      if (lIds.length === 0 && recAny.language && languages) {
        const lName = recAny.language.toLowerCase();
        const matched = languages.filter((l) =>
          lName.includes(l.name.toLowerCase()),
        );
        if (matched.length > 0) lIds = matched.map((l) => String(l.id));
      }

      // Venues: map id, or match venue string to dictionary
      let vId = recording.venues_id ? String(recording.venues_id) : "";
      if (!vId && recAny.venue && venues) {
        const vName = recAny.venue.toLowerCase();
        const matched = venues.find((v) => v.name.toLowerCase() === vName);
        if (matched) vId = String(matched.id);
      }

      // Date
      const rawDate = recording.recorded_at || recAny.recdatetime;
      let dateStr = "";
      if (rawDate) {
        try {
          dateStr = new Date(rawDate).toISOString().split("T")[0];
        } catch {
          dateStr = "";
        }
      }

      const audioId = recording.audio_id || recAny.audioid;
      const ytId = recording.yt_id || recAny.videoid;
      const parentCatId =
        recording.category_id ??
        (recAny.parentid ? Number(recAny.parentid) : null);

      return {
        name: recording.name,
        selectedParentId: parentCatId,
        selectedSpeakers: spkIds,
        selectedLanguages: lIds,
        selectedVenue: vId,
        selectedEvent: recording.event_id ? String(recording.event_id) : "",
        selectedType: recording.type_id ? String(recording.type_id) : "",
        audios: audioId
          ? [
              {
                id: audioId,
                fileName: recording.name,
                mimeType: "audio/mpeg",
                deleted: false,
              },
            ]
          : [],
        materials: (
          (recording.materials ||
            recAny.materials ||
            []) as Tables<"materials">[]
        ).map(
          (m: Tables<"materials">): MaterialFile => ({
            id: m.id,
            name: m.name,
            storage_key: m.uri,
            is_link: String(m.uri || "").startsWith("http"),
            is_generic: m.is_generic ?? false,
            deleted: false,
          }),
        ),
        recordedAt: dateStr,
        youtubeUrl: ytId || "",
      };
    },
    [speakers, languages, venues],
  );

  // 1. Instant load from IndexedDB + parallel background refresh from Server
  useEffect(() => {
    let isMounted = true;

    const loadRecording = async () => {
      // Step A: Instant retrieval from local IndexedDB (sub-5ms, zero blank screen)
      try {
        const db = await getDB();
        if (db && isMounted) {
          const localRec = (await db.get(STORE.RECORDINGS, id)) as
            | DbRecording
            | undefined;
          if (localRec && isMounted) {
            setDbRecording(localRec);
            setForm(buildInitialForm(localRec));
            setIsLoading(false);
          }
        }
      } catch (idbErr) {
        console.warn("[EditRecordingPage] IDB fast-load error:", idbErr);
      }

      // Step B: Authoritative fetch from PostgreSQL
      try {
        const recording = (await getRecording(id)) as DbRecording;
        if (isMounted) {
          setDbRecording(recording);
          setForm(buildInitialForm(recording));
          setIsLoading(false);
        }
      } catch (err) {
        console.error(err);
        if (isMounted) {
          toast.error("Failed to load recording");
          router.push("/admin/content");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadRecording();

    return () => {
      isMounted = false;
    };
  }, [id, router, buildInitialForm]);

  const handleReset = () => {
    if (!dbRecording) return;
    setForm(buildInitialForm(dbRecording));
    sessionStorage.removeItem(`edit_recording_form_session_${id}`);
    toast.success("Form reset to original recording details!");
  };

  const selectedParent =
    categories?.find((c) => c.id === form.selectedParentId) || null;

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg(null);

    if (!form.name.trim()) {
      toast.error("Recording title is required.");
      setIsSubmitting(false);
      return;
    }

    if (!form.selectedParentId || !selectedParent) {
      toast.error("You must select a valid category.");
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

    if (!dbRecording) return;

    const { valid, ytId } = parseYoutubeUrlOrToast(
      form.youtubeUrl,
      toast.error,
    );
    if (!valid) {
      setIsSubmitting(false);
      return;
    }

    try {
      let recFolderId = (dbRecording as unknown as { gdriveid?: string })
        ?.gdriveid;
      const needsUpload =
        Boolean(activeAudio.localFile) ||
        form.materials.some((m) => !m.deleted && Boolean(m.localFile));
      if (needsUpload && !recFolderId) {
        setUploadProgress({
          active: true,
          phase: "preparing",
          filename: `rec_${form.name.trim()}`,
          percent: 10,
        });
        const res = await prepareRecordingUploadFolders(
          form.selectedParentId,
          form.name.trim(),
        );
        recFolderId = res.folderId;
      }

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

      // 1. Upload audio if new local file was chosen
      let resolvedAudioId = activeAudio.id;
      let resolvedAudioSize = activeAudio.size || null;
      let resolvedAudioName = activeAudio.fileName;
      let resolvedAudioMime = activeAudio.mimeType || "audio/mpeg";

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

      const ext = activeAudio.localFile
        ? activeAudio.localFile.name.split(".").pop()?.toLowerCase() || "mp3"
        : activeAudio.fileName?.split(".").pop()?.toLowerCase() || "mp3";

      const formattedAudioName = formatRecordingAudioFilename({
        recordedAt: form.recordedAt,
        venueName,
        languageName,
        eventOrTypeShortName,
        title: form.name.trim(),
        speakerName,
        extension: ext,
      });

      if (activeAudio.localFile) {
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
          form.selectedParentId,
          recFolderId,
          formattedAudioName,
        );
        resolvedAudioSize = activeAudio.localFile.size;
        resolvedAudioName = formattedAudioName;
        resolvedAudioMime = activeAudio.localFile.type || "audio/mpeg";
      } else if (activeAudio.id) {
        resolvedAudioName = formattedAudioName;
      }

      // 2. Upload any new local materials in parallel (up to 3 concurrent)
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
        if (mat.deleted) {
          return {
            id: typeof mat.id === "number" ? mat.id : undefined,
            name: mat.name,
            storage_key: mat.storage_key,
            mime_type: mat.mime_type || "application/octet-stream",
            size: mat.size ?? null,
            is_generic: mat.is_generic || false,
            deleted: true,
            is_link: mat.is_link || false,
          };
        }
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
              form.selectedParentId,
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

      // Diff fields
      const data: Record<string, unknown> = {};

      if (form.name.trim() !== dbRecording.name) data.name = form.name.trim();
      if (form.selectedParentId !== dbRecording.category_id) {
        data.category_id = form.selectedParentId;
      }

      if (ytId !== dbRecording.yt_id) {
        data.yt_id = ytId;
      }

      // Speakers
      const newSpeakers = form.selectedSpeakers.map(Number).filter(Boolean);
      const oldSpeakers = dbRecording.speaker_ids || [];
      if (
        JSON.stringify(newSpeakers.sort()) !==
        JSON.stringify(oldSpeakers.sort())
      ) {
        data.speaker_ids = newSpeakers;
        data.speaker_name = speakerName;
      }

      // Languages
      const newLangs = form.selectedLanguages.map(Number).filter(Boolean);
      const oldLangs = dbRecording.lang_ids || [];
      if (JSON.stringify(newLangs.sort()) !== JSON.stringify(oldLangs.sort())) {
        data.lang_ids = newLangs;
        data.language_name = languageName;
      }

      // Venue
      const newVenue = form.selectedVenue ? Number(form.selectedVenue) : null;
      if (newVenue !== dbRecording.venues_id) {
        data.venues_id = newVenue;
        data.venue_name = venueName;
      }

      // Event
      const newEvent = form.selectedEvent ? Number(form.selectedEvent) : null;
      if (newEvent !== dbRecording.event_id) {
        data.event_id = newEvent;
      }

      // Type
      const newType = form.selectedType ? Number(form.selectedType) : null;
      if (newType !== dbRecording.type_id) {
        data.type_id = newType;
      }

      // Date
      const oldDateStr = dbRecording.recorded_at
        ? new Date(dbRecording.recorded_at).toISOString().split("T")[0]
        : "";
      if (form.recordedAt !== oldDateStr) {
        data.recorded_at = form.recordedAt
          ? new Date(form.recordedAt).toISOString()
          : null;
      }

      // Audio - attach updated formatted filename whenever metadata or audio file changes
      if (
        resolvedAudioId &&
        (resolvedAudioId !== dbRecording.audio_id ||
          resolvedAudioName !== activeAudio.fileName ||
          data.name !== undefined ||
          data.event_id !== undefined ||
          data.venues_id !== undefined ||
          data.recorded_at !== undefined ||
          data.speaker_ids !== undefined ||
          data.lang_ids !== undefined)
      ) {
        data.audio_id = resolvedAudioId;
        data.audio_size = resolvedAudioSize;
        data.audio_file_name = resolvedAudioName || null;
        data.audio_mime_type = resolvedAudioMime || null;
        data.audios = [
          {
            id: resolvedAudioId,
            fileName: resolvedAudioName || "",
            mimeType: resolvedAudioMime,
            size: resolvedAudioSize,
            deleted: false,
          },
        ];
      }

      // Materials
      data.materials = uploadedMaterials;

      if (Object.keys(data).length === 0) {
        toast.info("No changes made.");
        await router.push(returnTo);
        setIsSubmitting(false);
        setUploadProgress(null);
        return;
      }

      setUploadProgress({
        active: true,
        phase: "saving",
        filename: "Saving updates to database...",
        percent: 100,
      });

      const updateRes = await updateRecording(
        id,
        data as unknown as Parameters<typeof updateRecording>[1],
      );
      if (updateRes?.recording) {
        const db = await getDB();
        if (db) {
          await db.put(STORE.RECORDINGS, updateRes.recording);
        }
      }
      queryClient.invalidateQueries({ queryKey: [STORE.RECORDINGS] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY.SYNC] });
      toast.success("Recording updated successfully");
      sessionStorage.removeItem(`edit_recording_form_session_${id}`);
      await router.push(returnTo);
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Failed to update recording";
      setErrorMsg(msg);
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
      setUploadProgress(null);
    }
  };

  if (isLoading) {
    return <Loading />;
  }

  return (
    <div className="mx-auto max-w-3xl w-full flex flex-col gap-6 pb-12">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Edit Recording
          </h1>
          <p className="text-sm text-muted-foreground">
            Modify recording details and materials.
          </p>
        </div>
        <Button variant="outline" asChild>
          <Link href={returnTo} prefetch={true}>
            Cancel
          </Link>
        </Button>
      </div>

      <FormErrorAlert error={errorMsg} title="Error" />

      <RecordingForm
        mode="edit"
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
