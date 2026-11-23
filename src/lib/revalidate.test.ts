import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as jwt from "./jwt";
import { revalidateCategoryPaths } from "./revalidate";

describe("revalidate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should do nothing if paths array is empty or contains only null/undefined", async () => {
    const fetchSpy = vi.spyOn(global, "fetch");
    await revalidateCategoryPaths([]);
    await revalidateCategoryPaths([null, undefined, ""]);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("should format paths, generate token, and post to public sites without tag", async () => {
    vi.spyOn(jwt, "generateM2MToken").mockResolvedValue("mock-jwt-token");
    const fetchSpy = vi.spyOn(global, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ revalidated: true }), {
        status: 200,
      }),
    );

    await revalidateCategoryPaths(["news.daily", "/tech/ai_ml", "science"]);

    expect(fetchSpy).toHaveBeenCalled();
    const calls = fetchSpy.mock.calls;
    expect(calls.length).toBeGreaterThan(0);

    const [firstUrl, firstInit] = calls[0];
    expect(firstUrl.toString()).toContain("/api/revalidate");
    expect(firstInit?.headers).toEqual(
      expect.objectContaining({
        Authorization: "Bearer mock-jwt-token",
        "Content-Type": "application/json",
      }),
    );

    const body = JSON.parse(firstInit?.body as string);
    expect(body.paths).toContain("/news/daily");
    expect(body.paths).toContain("/tech/ai-ml");
    expect(body.paths).toContain("/science");
    expect(body.tag).toBeUndefined();
  });

  it("should post tag: url-paths when calling revalidateUrlPaths", async () => {
    vi.spyOn(jwt, "generateM2MToken").mockResolvedValue("mock-jwt-token");
    const fetchSpy = vi.spyOn(global, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ revalidated: true }), {
        status: 200,
      }),
    );

    const { revalidateUrlPaths } = await import("./revalidate");
    await expect(revalidateUrlPaths(["category.sub"])).resolves.not.toThrow();

    expect(fetchSpy).toHaveBeenCalled();
    const [firstUrl, firstInit] = fetchSpy.mock.calls[0];
    expect(firstUrl.toString()).toContain("/api/revalidate");
    const body = JSON.parse(firstInit?.body as string);
    expect(body.paths).toContain("/category/sub");
    expect(body.tag).toBe("url-paths");
  });

  it("should handle fetch failures gracefully without throwing", async () => {
    vi.spyOn(jwt, "generateM2MToken").mockResolvedValue("mock-jwt-token");
    vi.spyOn(global, "fetch").mockResolvedValue(
      new Response("Server Error", { status: 500 }),
    );

    await expect(revalidateCategoryPaths(["path.one"])).resolves.not.toThrow();
  });

  it("should post tag: feature-flags when calling revalidateFeatureFlags", async () => {
    vi.spyOn(jwt, "generateM2MToken").mockResolvedValue("mock-jwt-token");
    const fetchSpy = vi.spyOn(global, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ revalidated: true }), {
        status: 200,
      }),
    );

    const { revalidateFeatureFlags } = await import("./revalidate");
    await expect(revalidateFeatureFlags()).resolves.not.toThrow();

    expect(fetchSpy).toHaveBeenCalled();
    const [firstUrl, firstInit] = fetchSpy.mock.calls[0];
    expect(firstUrl.toString()).toContain("/api/revalidate");
    const body = JSON.parse(firstInit?.body as string);
    expect(body.tag).toBe("feature-flags");
  });

  it("should post queries paths and tags when calling revalidateQueries", async () => {
    vi.spyOn(jwt, "generateM2MToken").mockResolvedValue("mock-jwt-token");
    const fetchSpy = vi.spyOn(global, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ revalidated: true }), {
        status: 200,
      }),
    );

    const { revalidateQueries } = await import("./revalidate");
    await expect(revalidateQueries()).resolves.not.toThrow();

    expect(fetchSpy).toHaveBeenCalled();
    const [firstUrl, firstInit] = fetchSpy.mock.calls[0];
    expect(firstUrl.toString()).toContain("/api/revalidate");
    const body = JSON.parse(firstInit?.body as string);
    expect(body.paths).toContain("/queries");
  });
});
