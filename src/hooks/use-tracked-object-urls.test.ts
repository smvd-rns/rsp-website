import { renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useTrackedObjectURLs } from "./use-tracked-object-urls";

describe("useTrackedObjectURLs", () => {
  let createdUrls: string[] = [];
  let revokedUrls: string[] = [];

  beforeEach(() => {
    createdUrls = [];
    revokedUrls = [];

    let counter = 0;
    global.URL.createObjectURL = vi.fn((_blob: Blob | File) => {
      const url = `blob:http://localhost/mock-blob-${++counter}`;
      createdUrls.push(url);
      return url;
    });

    global.URL.revokeObjectURL = vi.fn((url: string) => {
      revokedUrls.push(url);
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("creates and tracks object URLs", () => {
    const { result } = renderHook(() => useTrackedObjectURLs());
    const blob1 = new Blob(["hello"], { type: "text/plain" });
    const blob2 = new Blob(["world"], { type: "text/plain" });

    const url1 = result.current.createTrackedObjectURL(blob1);
    const url2 = result.current.createTrackedObjectURL(blob2);

    expect(url1).toBe("blob:http://localhost/mock-blob-1");
    expect(url2).toBe("blob:http://localhost/mock-blob-2");
    expect(result.current.objectUrlsRef.current).toEqual([url1, url2]);
  });

  it("revokes all URLs on unmount", () => {
    const { result, unmount } = renderHook(() => useTrackedObjectURLs());
    const blob = new Blob(["test"], { type: "text/plain" });

    const url = result.current.createTrackedObjectURL(blob);
    expect(revokedUrls).toHaveLength(0);

    unmount();
    expect(revokedUrls).toContain(url);
  });

  it("revokes all URLs when revokeAllTrackedUrls is called manually", () => {
    const { result } = renderHook(() => useTrackedObjectURLs());
    const blob = new Blob(["test"], { type: "text/plain" });

    const url = result.current.createTrackedObjectURL(blob);
    result.current.revokeAllTrackedUrls();

    expect(revokedUrls).toContain(url);
    expect(result.current.objectUrlsRef.current).toHaveLength(0);
  });
});
