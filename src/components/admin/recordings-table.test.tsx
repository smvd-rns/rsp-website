import { cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createQueryWrapper } from "@/test-utils";
import type { EnrichedRecording } from "@/types";
import { RecordingsTable } from "./recordings-table";

let mockSearchParams = new URLSearchParams();

vi.mock("next/navigation", () => ({
  useSearchParams: () => mockSearchParams,
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
  }),
}));

vi.mock("@/hooks/use-dictionaries", () => ({
  useDictionaries: () => ({
    speakers: [{ id: 1, name: "Speaker One" }],
    languages: [{ id: 1, name: "English", native_name: "English" }],
    contentTypes: [{ id: 1, name: "Class" }],
    venues: [{ id: 1, name: "Temple" }],
    events: [],
    isLoading: false,
  }),
}));

describe("RecordingsTable deeplinking and highlighting", () => {
  const dummyRecordings: EnrichedRecording[] = [
    {
      id: 42,
      name: "Lecture 42 on Gita",
      category_id: 10,
      speaker_ids: [1],
      lang_ids: [1],
      type_id: 1,
      venues_id: 1,
      event_id: null,
      audio_id: null,
      yt_id: null,
      size: null,
      created_at: null,
      updated_at: null,
      recorded_at: "2026-01-01T00:00:00Z",
      order_ind: 1,
      allowed_roles: [],
      materials: [
        {
          id: 105,
          name: "Study Material PDF",
          recording_id: 42,
          uri: "test.pdf",
          type: "application/pdf",
          size: 1024,
          is_generic: false,
          updated_at: null,
          allowed_roles: [],
        },
      ],
    },
    {
      id: 43,
      name: "Lecture 43 on Bhagavatam",
      category_id: 10,
      speaker_ids: [1],
      lang_ids: [1],
      type_id: 1,
      venues_id: 1,
      event_id: null,
      audio_id: null,
      yt_id: null,
      size: null,
      created_at: null,
      updated_at: null,
      recorded_at: "2026-01-02T00:00:00Z",
      order_ind: 2,
      allowed_roles: [],
      materials: [],
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    document.body.innerHTML = "";
    mockSearchParams = new URLSearchParams();
  });

  afterEach(() => {
    cleanup();
    document.body.innerHTML = "";
  });

  it("renders recordings and applies id attributes", () => {
    const Wrapper = createQueryWrapper();
    render(
      <Wrapper>
        <RecordingsTable recordings={dummyRecordings} />
      </Wrapper>,
    );

    const row42 = document.getElementById("recording-42");
    const row43 = document.getElementById("recording-43");
    expect(row42).toBeDefined();
    expect(row43).toBeDefined();
    expect(row42?.className).not.toContain("ring-primary");
  });

  it("highlights target recording when q matches", () => {
    mockSearchParams = new URLSearchParams("q=42");
    const Wrapper = createQueryWrapper();
    render(
      <Wrapper>
        <RecordingsTable recordings={dummyRecordings} />
      </Wrapper>,
    );

    const row42 = document.getElementById("recording-42");
    expect(row42?.className).toContain("ring-primary");
    expect(row42?.className).toContain("bg-primary/10");
  });

  it("auto-expands and highlights target material when m is also present", () => {
    mockSearchParams = new URLSearchParams("q=42&m=105");
    const Wrapper = createQueryWrapper();
    render(
      <Wrapper>
        <RecordingsTable recordings={dummyRecordings} />
      </Wrapper>,
    );

    const matElement = document.getElementById("material-105");
    expect(matElement).toBeDefined();
    expect(matElement?.className).toContain("ring-primary");
    expect(matElement?.className).toContain("bg-primary/20");
  });
});
