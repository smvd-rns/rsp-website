import type { User } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";
import { resolveCategoryUrlPath } from "./legacy-url-map";
import { getQueryClient } from "./query-client";
import { getAssetProxyUrl, getAssetUrl } from "./storage";
import {
  cn,
  createLimiter,
  errorMessage,
  getUserDisplayName,
  naturalSortByName,
  pathToUrlPath,
  slugToLabel,
  sortByDate,
  sortByOrderInd,
  toRoleId,
} from "./utils";

describe.concurrent("utils.ts suite", () => {
  it.concurrent("cn merges class names and handles tailwind conflicts", () => {
    expect(
      cn("px-2 py-1", "bg-red-500", {
        "text-white": true,
        "opacity-50": false,
      }),
    ).toBe("px-2 py-1 bg-red-500 text-white");
    expect(cn("p-4", "p-2")).toBe("p-2");
  });

  it.concurrent("slugToLabel transforms underscore and hyphen separated slugs into capitalized words", () => {
    expect(slugToLabel("bhagavad_gita")).toBe("Bhagavad Gita");
    expect(slugToLabel("bhagavad-gita")).toBe("Bhagavad Gita");
    expect(slugToLabel("srimad_bhagavatam_canto_1")).toBe(
      "Srimad Bhagavatam Canto 1",
    );
    expect(slugToLabel("")).toBe("");
  });

  it.concurrent("errorMessage extracts error message from Error instances or strings", () => {
    expect(errorMessage(new Error("Database disconnected"))).toBe(
      "Database disconnected",
    );
    expect(errorMessage("Raw string error")).toBe("Raw string error");
    expect(errorMessage({ code: 500 })).toBe("[object Object]");
    expect(errorMessage(404)).toBe("404");
    expect(errorMessage(null)).toBe("null");
    expect(errorMessage(undefined)).toBe("undefined");
  });

  it.concurrent("getUserDisplayName retrieves name from metadata, email, or fallback", () => {
    const userWithName = {
      user_metadata: { full_name: "Radha Krishna Das" },
      email: "rkdas@example.com",
    } as unknown as User;
    expect(getUserDisplayName(userWithName)).toBe("Radha Krishna Das");

    const userWithEmail = {
      user_metadata: {},
      email: "bhakta_john@example.com",
    } as unknown as User;
    expect(getUserDisplayName(userWithEmail)).toBe("bhakta_john");

    expect(getUserDisplayName(undefined)).toBe("User");
    expect(getUserDisplayName(undefined, "Guest")).toBe("Guest");
  });

  it.concurrent("createLimiter limits concurrent async task executions", async () => {
    const limit = createLimiter(2);
    let activeCount = 0;
    let maxActiveObserved = 0;

    const makeTask = (delayMs: number, resultVal: string) => () =>
      limit(
        () =>
          new Promise<string>((resolve) => {
            activeCount++;
            if (activeCount > maxActiveObserved) {
              maxActiveObserved = activeCount;
            }
            setTimeout(() => {
              activeCount--;
              resolve(resultVal);
            }, delayMs);
          }),
      );

    const results = await Promise.all([
      makeTask(30, "A")(),
      makeTask(20, "B")(),
      makeTask(10, "C")(),
      makeTask(10, "D")(),
    ]);

    expect(results).toEqual(["A", "B", "C", "D"]);
    expect(maxActiveObserved).toBeLessThanOrEqual(2);
  });

  it.concurrent("createLimiter propagates promise rejection and continues processing queue", async () => {
    const limit = createLimiter(1);
    const failingTask = () =>
      limit(() => Promise.reject(new Error("Task failure")));
    const succeedingTask = () =>
      limit(() => Promise.resolve("Success after fail"));

    await expect(failingTask()).rejects.toThrow("Task failure");
    const nextResult = await succeedingTask();
    expect(nextResult).toBe("Success after fail");
  });

  it.concurrent("sortByOrderInd sorts objects by order_ind ascending or descending", () => {
    const items = [
      { order_ind: 10, name: "C" },
      { order_ind: 1, name: "A" },
      { order_ind: null, name: "Null" },
      { order_ind: 5, name: "B" },
    ];
    items.sort(sortByOrderInd(1));
    expect(items.map((i) => i.name)).toEqual(["Null", "A", "B", "C"]);

    items.sort(sortByOrderInd(-1));
    expect(items.map((i) => i.name)).toEqual(["C", "B", "A", "Null"]);
  });

  it.concurrent("sortByDate sorts by date ascending or descending", () => {
    const items = [
      { id: 1, updated_at: "2026-02-01T00:00:00Z" },
      { id: 2, updated_at: "2026-01-01T00:00:00Z" },
      { id: 3, updated_at: null },
    ];
    items.sort(sortByDate(1));
    expect(items.map((i) => i.id)).toEqual([3, 2, 1]);

    const recs = [
      { id: 1, recorded_at: "2025-05-01T00:00:00Z" },
      { id: 2, recorded_at: "2026-05-01T00:00:00Z" },
      { id: 3, recorded_at: "2024-05-01T00:00:00Z" },
    ];
    recs.sort(sortByDate(-1, "recorded_at"));
    expect(recs.map((i) => i.id)).toEqual([2, 1, 3]);

    const courses = [
      { name: "Course 10 - REGULATIVE PRINCIPLES" },
      { name: "Course 9 - DESTROY DOUBTS" },
      { name: "Course 1 – REINCARNATION" },
      { name: "Course 2 - BLOSSOM LOVE" },
      { name: "GAME Open Book" },
    ];
    courses.sort(naturalSortByName());
    expect(courses.map((c) => c.name)).toEqual([
      "Course 1 – REINCARNATION",
      "Course 2 - BLOSSOM LOVE",
      "Course 9 - DESTROY DOUBTS",
      "Course 10 - REGULATIVE PRINCIPLES",
      "GAME Open Book",
    ]);

    const recordings = [
      { name: "Chatur Sloki BG - 10-11" },
      { name: "Chatur Sloki BG 10-10" },
      { name: "Chatur Sloki BG - 10-9" },
      { name: "Chatur Sloki BG - 10-8" },
    ];
    recordings.sort(naturalSortByName());
    expect(recordings.map((r) => r.name)).toEqual([
      "Chatur Sloki BG - 10-8",
      "Chatur Sloki BG - 10-9",
      "Chatur Sloki BG 10-10",
      "Chatur Sloki BG - 10-11",
    ]);

    const sessions = [
      { name: "Session 10 - Deep Questions" },
      { name: "Session 2 - Control" },
      { name: "Session 1 - Foundation" },
    ];
    sessions.sort(naturalSortByName());
    expect(sessions.map((s) => s.name)).toEqual([
      "Session 1 - Foundation",
      "Session 2 - Control",
      "Session 10 - Deep Questions",
    ]);

    const parts = [
      { name: "Part - 10" },
      { name: "Part - 1" },
      { name: "Part - 2" },
      { name: "Part - 9" },
    ];
    parts.sort(naturalSortByName(-1));
    expect(parts.map((p) => p.name)).toEqual([
      "Part - 10",
      "Part - 9",
      "Part - 2",
      "Part - 1",
    ]);
  });

  it.concurrent("pathToUrlPath converts paths and slug arrays to ltree format preserving hyphens", () => {
    expect(pathToUrlPath("/spiritual-discourses")).toBe("spiritual-discourses");
    expect(pathToUrlPath("/spiritual-discourses/bg")).toBe(
      "spiritual-discourses.bg",
    );
    expect(pathToUrlPath(["spiritual-discourses", "bg"])).toBe(
      "spiritual-discourses.bg",
    );
    expect(pathToUrlPath("/library/spiritual-discourses/bg")).toBe(
      "spiritual-discourses.bg",
    );
    expect(pathToUrlPath(["library", "spiritual-discourses", "bg"])).toBe(
      "spiritual-discourses.bg",
    );
    expect(pathToUrlPath("/library")).toBe("");
    expect(pathToUrlPath(["library"])).toBe("");
    expect(pathToUrlPath("///spiritual-discourses//bg/")).toBe(
      "spiritual-discourses.bg",
    );
    expect(pathToUrlPath("")).toBe("");
    expect(pathToUrlPath("/")).toBe("");
    expect(pathToUrlPath([])).toBe("");
  });

  it.concurrent("resolveCategoryUrlPath returns mapped value or fallback to original", () => {
    expect(resolveCategoryUrlPath("any_unmapped_path")).toBe(
      "any_unmapped_path",
    );
  });

  it.concurrent("toRoleId extracts integer role ids safely", () => {
    expect(toRoleId(1)).toBe(1);
    expect(toRoleId(0)).toBe(0);
    expect(toRoleId(108)).toBe(108);
    expect(toRoleId(1.5)).toBeUndefined();
    expect(toRoleId("1")).toBeUndefined();
    expect(toRoleId(null)).toBeUndefined();
    expect(toRoleId(undefined)).toBeUndefined();
  });

  it.concurrent("storage generates URLs for assets, audio, and category images", () => {
    expect(getAssetUrl("https://external.cdn/image.jpg")).toBe(
      "https://external.cdn/image.jpg",
    );
    expect(getAssetUrl("assets/file.pdf")).toContain("assets/file.pdf");
    expect(getAssetProxyUrl("audio_123.mp3")).toContain("audio_123.mp3");
  });

  it.concurrent("getQueryClient returns configured singleton", () => {
    const client1 = getQueryClient();
    const client2 = getQueryClient();
    expect(client1).toBe(client2);
    expect(client1.getDefaultOptions().queries?.retry).toBe(false);
    expect(client1.getDefaultOptions().queries?.networkMode).toBe("always");
  });

  it.concurrent("audioEngine manages audio snapshot and controls", async () => {
    const { audioEngine } = await import("./audio-engine");
    const listener = vi.fn();
    const unsubscribe = audioEngine.subscribe(listener);

    expect(audioEngine.getSnapshot().isPlaying).toBe(false);

    audioEngine.setVolume(0.5);
    expect(audioEngine.getSnapshot().volume).toBe(0.5);

    audioEngine.setRate(1.5);
    expect(audioEngine.getSnapshot().playbackRate).toBe(1.5);

    audioEngine.seek(60);
    audioEngine.togglePlay();
    audioEngine.dismiss();

    unsubscribe();
  });

  it.concurrent("idb getDB returns promise or null when indexedDB is checked", async () => {
    const { getDB } = await import("./idb");
    const db = getDB();
    expect(db).toBeDefined();
  });

  it.concurrent("isValidCategoryPath accepts valid paths and rejects assets/extensions", async () => {
    const { isValidCategoryPath } = await import("./utils");
    expect(isValidCategoryPath("spiritual-discourses.bg")).toBe(true);
    expect(isValidCategoryPath("gita")).toBe(true);
    expect(isValidCategoryPath("canto-1.chapter-1")).toBe(true);
    // Rejects static assets and file extensions
    expect(isValidCategoryPath("apple-icon-57x57.png")).toBe(false);
    expect(isValidCategoryPath("apple-icon-114x114.png")).toBe(false);
    expect(isValidCategoryPath("favicon.ico")).toBe(false);
    expect(isValidCategoryPath("robots.txt")).toBe(false);
    expect(isValidCategoryPath("site.webmanifest")).toBe(false);
    expect(isValidCategoryPath("image.webp")).toBe(false);
    // Rejects internal or invalid paths
    expect(isValidCategoryPath("_next/static")).toBe(false);
    expect(isValidCategoryPath("invalid/path/with/slashes")).toBe(false);
    // Rejects exploit patterns
    expect(
      isValidCategoryPath(
        "htthttp-.196-188-187-159-9080ps-.www-bing-com.search",
      ),
    ).toBe(false);
    expect(
      isValidCategoryPath(
        "www-gov-cn-govweb-zhengce-202610-content-7083845-htm",
      ),
    ).toBe(false);
  });

  it.concurrent("hasStaticFileExtension detects files with static extensions in segments", async () => {
    const { hasStaticFileExtension } = await import("./utils");
    expect(hasStaticFileExtension(["meta.json"])).toBe(true);
    expect(hasStaticFileExtension(["favicon.ico"])).toBe(true);
    expect(hasStaticFileExtension(["library", "sitemap.xml"])).toBe(true);
    expect(hasStaticFileExtension(["spiritual-discourses", "bg"])).toBe(false);
    expect(hasStaticFileExtension([])).toBe(false);
  });

  it.concurrent("formatRecordingAudioFilename formats audio files per specified standard", async () => {
    const { formatRecordingAudioFilename, formatDateToRecordingPrefix } =
      await import("./utils");

    expect(formatDateToRecordingPrefix("2019-10-20")).toBe("2019-Oct-20");

    const sample = formatRecordingAudioFilename({
      recordedAt: "2019-10-20",
      venueName: "Silicon Valley",
      languageName: "English",
      eventOrTypeShortName: "Lec",
      title: "Silicon Valley Kids Q and A",
      speakerName: "Radheshyam Das",
      extension: "mp3",
    });
    expect(sample).toBe(
      "2019-Oct-20_Silicon Valley_English_Lec_Silicon Valley Kids Q and A_Radheshyam Das.mp3",
    );
  });
});
