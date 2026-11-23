import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  createImage,
  generateBannerAssets,
  getImageUrl,
  getJSquashCroppedImg,
  getRadianAngle,
  rotateSize,
} from "./image-utils";

vi.mock("@jsquash/webp", () => ({
  encode: vi.fn().mockResolvedValue(new ArrayBuffer(8)),
}));

vi.mock("@jsquash/avif", () => ({
  encode: vi.fn().mockResolvedValue(new ArrayBuffer(8)),
}));

describe("image-utils", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should convert degrees to radians", () => {
    expect(getRadianAngle(180)).toBeCloseTo(Math.PI);
    expect(getRadianAngle(90)).toBeCloseTo(Math.PI / 2);
    expect(getRadianAngle(0)).toBe(0);
  });

  it("should calculate rotated bounding box dimensions", () => {
    const size = rotateSize(100, 50, 90);
    expect(size.width).toBeCloseTo(50);
    expect(size.height).toBeCloseTo(100);
  });

  it("should generate image url from number ID and format", () => {
    expect(getImageUrl("img", 100, "webp")).toMatch(/\/img\/100\/webp\?v2$/);
    expect(getImageUrl("bnr", 42, "desktop_webp")).toMatch(
      /\/bnr\/42\/desktop_webp\?v2$/,
    );
  });

  it("should create HTMLImageElement on load", async () => {
    const origImage = global.Image;
    class MockImage {
      src = "";
      listeners: Record<string, () => void> = {};
      addEventListener(event: string, cb: () => void) {
        this.listeners[event] = cb;
      }
      setAttribute() {}
      constructor() {
        setTimeout(() => {
          this.listeners.load?.();
        }, 10);
      }
    }
    // @ts-expect-error test mock
    global.Image = MockImage;

    const img = await createImage("https://example.com/test.png");
    expect(img).toBeDefined();

    global.Image = origImage;
  });

  it("should reject on image load error", async () => {
    const origImage = global.Image;
    class MockImageError {
      src = "";
      listeners: Record<string, (err?: unknown) => void> = {};
      addEventListener(event: string, cb: (err?: unknown) => void) {
        this.listeners[event] = cb;
      }
      setAttribute() {}
      constructor() {
        setTimeout(() => {
          this.listeners.error?.(new Error("Failed to load"));
        }, 10);
      }
    }
    // @ts-expect-error test mock
    global.Image = MockImageError;

    await expect(createImage("https://example.com/bad.png")).rejects.toThrow();

    global.Image = origImage;
  });

  it("should crop and encode image using jSquash", async () => {
    const origCreateElement = document.createElement.bind(document);
    const mockCtx = {
      translate: vi.fn(),
      rotate: vi.fn(),
      scale: vi.fn(),
      drawImage: vi.fn(),
      getImageData: vi.fn().mockReturnValue({ data: new Uint8ClampedArray(4) }),
      putImageData: vi.fn(),
    };

    const origImage = global.Image;
    class MockImage {
      src = "";
      width = 200;
      height = 200;
      listeners: Record<string, () => void> = {};
      addEventListener(event: string, cb: () => void) {
        this.listeners[event] = cb;
      }
      setAttribute() {}
      constructor() {
        setTimeout(() => {
          this.listeners.load?.();
        }, 5);
      }
    }
    // @ts-expect-error test mock
    global.Image = MockImage;

    vi.spyOn(document, "createElement").mockImplementation((tag: string) => {
      if (tag === "canvas") {
        return {
          getContext: vi.fn().mockReturnValue(mockCtx),
          width: 100,
          height: 100,
          toBlob: vi.fn((cb) => cb(new Blob(["test"], { type: "image/webp" }))),
        } as unknown as HTMLElement;
      }
      return origCreateElement(tag);
    });

    const crop = { x: 0, y: 0, width: 100, height: 100 };
    const blobWebp = await getJSquashCroppedImg(
      "test.jpg",
      crop,
      0,
      { horizontal: false, vertical: false },
      100,
      100,
      "webp",
    );
    expect(blobWebp).toBeInstanceOf(Blob);

    const blobAvif = await getJSquashCroppedImg(
      "test.jpg",
      crop,
      0,
      { horizontal: false, vertical: false },
      100,
      100,
      "avif",
    );
    expect(blobAvif).toBeInstanceOf(Blob);

    const bannerAssets = await generateBannerAssets(
      "desktop.jpg",
      crop,
      "mobile.jpg",
      crop,
    );
    expect(bannerAssets).not.toBeNull();
    expect(bannerAssets?.desktopWebp).toBeInstanceOf(Blob);

    global.Image = origImage;
  });
});
