import { useEffect, useState } from "react";
import type { AudioFile } from "@/components/admin/audio-upload";
import type { MaterialFile } from "@/components/admin/materials-upload";
import type { Category } from "@/types";

const STORAGE_KEY = "new_recording_form_session";

const today = () => new Date().toLocaleDateString("sv-SE");

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

const createEmptyForm = (): RecordingFormState => ({
  name: "",
  selectedParentId: null,
  selectedSpeakers: [],
  selectedLanguages: [],
  selectedVenue: "",
  selectedEvent: "",
  selectedType: "",
  audios: [],
  materials: [],
  recordedAt: today(),
  youtubeUrl: "",
});

interface DictionariesProps {
  categories: Category[] | undefined;
  isLoadingCats: boolean;
  speakers: { id: number; name: string }[];
  languages: { id: number; name: string }[];
  contentTypes: { id: number; name: string }[];
  isLoadingDicts: boolean;
  preselectedPath: string | null;
}

export const useRecordingForm = ({
  categories,
  isLoadingCats,
  speakers,
  languages,
  contentTypes,
  isLoadingDicts,
  preselectedPath,
}: DictionariesProps) => {
  const [form, setForm] = useState<RecordingFormState>(createEmptyForm);
  const [hasInitialized, setHasInitialized] = useState(false);

  // Clear any legacy session storage on mount
  useEffect(() => {
    try {
      sessionStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    if (isLoadingCats || isLoadingDicts || hasInitialized) return;
    if (!categories) return;

    const initialForm = createEmptyForm();

    const defaultSpeaker = speakers.find((s) =>
      s.name.toLowerCase().includes("radheshyam das"),
    );
    if (defaultSpeaker) {
      initialForm.selectedSpeakers = [String(defaultSpeaker.id)];
    }

    const defaultLang = languages.find(
      (l) => l.name.toLowerCase() === "english",
    );
    if (defaultLang) {
      initialForm.selectedLanguages = [String(defaultLang.id)];
    }

    const defaultType = contentTypes.find(
      (t) => t.name.toLowerCase() === "lecture",
    );
    if (defaultType) {
      initialForm.selectedType = String(defaultType.id);
    }

    if (preselectedPath) {
      const parent = categories.find((c) => c.url_path === preselectedPath);
      if (parent) {
        initialForm.selectedParentId = parent.id;
      }
    }

    setForm(initialForm);
    setHasInitialized(true);
  }, [
    categories,
    isLoadingCats,
    speakers,
    languages,
    contentTypes,
    isLoadingDicts,
    preselectedPath,
    hasInitialized,
  ]);

  const updateField = <K extends keyof RecordingFormState>(
    field: K,
    value:
      | RecordingFormState[K]
      | ((prev: RecordingFormState[K]) => RecordingFormState[K]),
  ) => {
    setForm((prev) => ({
      ...prev,
      [field]: typeof value === "function" ? value(prev[field]) : value,
    }));
  };

  const updateMaterials = (
    newMaterials: MaterialFile[] | ((prev: MaterialFile[]) => MaterialFile[]),
  ) => {
    setForm((prev) => ({
      ...prev,
      materials:
        typeof newMaterials === "function"
          ? newMaterials(prev.materials)
          : newMaterials,
    }));
  };

  const resetForm = () => {
    setForm(createEmptyForm());
    try {
      sessionStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
  };

  return {
    form,
    updateField,
    updateMaterials,
    resetForm,
    hasRestored: hasInitialized,
  };
};
