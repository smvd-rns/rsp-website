import {
  ASSET_PROXY,
  BANNER_DESKTOP_HEIGHT,
  BANNER_DESKTOP_WIDTH,
  BANNER_MOBILE_HEIGHT,
  BANNER_MOBILE_WIDTH,
  IMAGE_BASE_HEIGHT,
  IMAGE_BASE_WIDTH,
} from "@/constants";

export interface PixelCrop {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface BannerAssets {
  desktopWebp: Blob;
  desktopAvif: Blob;
  mobileWebp: Blob;
  mobileAvif: Blob;
}

export const createImage = (url: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener("load", () => resolve(image));
    image.addEventListener("error", (error) => reject(error));
    image.setAttribute("crossOrigin", "anonymous");
    image.src = url;
  });

export const getRadianAngle = (degreeValue: number) => {
  return (degreeValue * Math.PI) / 180;
};

export const rotateSize = (width: number, height: number, rotation: number) => {
  const rotRad = getRadianAngle(rotation);

  return {
    width:
      Math.abs(Math.cos(rotRad) * width) + Math.abs(Math.sin(rotRad) * height),
    height:
      Math.abs(Math.sin(rotRad) * width) + Math.abs(Math.cos(rotRad) * height),
  };
};

const getCroppedCanvas = async (
  imageSrc: string,
  pixelCrop: PixelCrop,
  rotation = 0,
  flip = { horizontal: false, vertical: false },
  targetWidth = 640,
  targetHeight = 360,
): Promise<HTMLCanvasElement | null> => {
  const image = await createImage(imageSrc);
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");

  if (!ctx) {
    return null;
  }

  const rotRad = getRadianAngle(rotation);
  const { width: bBoxWidth, height: bBoxHeight } = rotateSize(
    image.width,
    image.height,
    rotation,
  );

  canvas.width = bBoxWidth;
  canvas.height = bBoxHeight;

  ctx.translate(bBoxWidth / 2, bBoxHeight / 2);
  ctx.rotate(rotRad);
  ctx.scale(flip.horizontal ? -1 : 1, flip.vertical ? -1 : 1);
  ctx.translate(-image.width / 2, -image.height / 2);

  ctx.drawImage(image, 0, 0);

  const data = ctx.getImageData(
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
  );

  canvas.width = pixelCrop.width;
  canvas.height = pixelCrop.height;
  ctx.putImageData(data, 0, 0);

  const finalCanvas = document.createElement("canvas");
  finalCanvas.width = targetWidth;
  finalCanvas.height = targetHeight;
  const finalCtx = finalCanvas.getContext("2d");

  if (!finalCtx) return null;

  finalCtx.drawImage(
    canvas,
    0,
    0,
    canvas.width,
    canvas.height,
    0,
    0,
    targetWidth,
    targetHeight,
  );

  return finalCanvas;
};

export const getCroppedImg = async (
  imageSrc: string,
  pixelCrop: PixelCrop,
  rotation = 0,
  flip = { horizontal: false, vertical: false },
  targetWidth = 640,
  targetHeight = 360,
): Promise<Blob | null> => {
  const finalCanvas = await getCroppedCanvas(
    imageSrc,
    pixelCrop,
    rotation,
    flip,
    targetWidth,
    targetHeight,
  );
  if (!finalCanvas) return null;

  return new Promise((resolve) => {
    finalCanvas.toBlob(
      (file) => {
        resolve(file);
      },
      "image/webp",
      0.8,
    );
  });
};

export const getCroppedImageData = async (
  imageSrc: string,
  pixelCrop: PixelCrop,
  rotation = 0,
  flip = { horizontal: false, vertical: false },
  targetWidth = 640,
  targetHeight = 360,
): Promise<ImageData | null> => {
  const finalCanvas = await getCroppedCanvas(
    imageSrc,
    pixelCrop,
    rotation,
    flip,
    targetWidth,
    targetHeight,
  );
  if (!finalCanvas) return null;

  const finalCtx = finalCanvas.getContext("2d");
  if (!finalCtx) return null;

  return finalCtx.getImageData(0, 0, targetWidth, targetHeight);
};

let webpEncoderPromise: Promise<typeof import("@jsquash/webp")> | null = null;
let avifEncoderPromise: Promise<typeof import("@jsquash/avif")> | null = null;

const getEncoder = (format: "webp" | "avif") => {
  if (format === "webp") {
    webpEncoderPromise ??= import("@jsquash/webp");
    return webpEncoderPromise;
  }

  avifEncoderPromise ??= import("@jsquash/avif");
  return avifEncoderPromise;
};

export const getJSquashCroppedImg = async (
  imageSrc: string,
  pixelCrop: PixelCrop,
  rotation = 0,
  flip = { horizontal: false, vertical: false },
  targetWidth = IMAGE_BASE_WIDTH,
  targetHeight = IMAGE_BASE_HEIGHT,
  targetFormat: "webp" | "avif" = "webp",
): Promise<Blob | null> => {
  const imageData = await getCroppedImageData(
    imageSrc,
    pixelCrop,
    rotation,
    flip,
    targetWidth,
    targetHeight,
  );
  if (!imageData) return null;

  try {
    const { encode } = await getEncoder(targetFormat);
    const arrayBuffer = await encode(imageData);
    return new Blob([arrayBuffer], { type: `image/${targetFormat}` });
  } catch (error) {
    console.error(`jSquash ${targetFormat} encoding failed:`, error);
    return null;
  }
};

type ImageFormat = "avif" | "webp" | "avif_2x" | "webp_2x";
type BannerImageFormat =
  | "desktop_avif"
  | "desktop_webp"
  | "mobile_avif"
  | "mobile_webp";

export const getImageUrl = (
  type: "img" | "bnr",
  id: number,
  format: ImageFormat | BannerImageFormat,
) => {
  const base = ASSET_PROXY || "https://assets.radheshyamdas.com";
  return `${base}/${type}/${id}/${format}?v2`;
};

export const generateBannerAssets = async (
  desktopSrc: string,
  desktopCrop: PixelCrop,
  mobileSrc: string,
  mobileCrop: PixelCrop,
  customDimensions?: {
    desktopWidth?: number;
    desktopHeight?: number;
    mobileWidth?: number;
    mobileHeight?: number;
  },
): Promise<BannerAssets | null> => {
  const dWidth = customDimensions?.desktopWidth ?? BANNER_DESKTOP_WIDTH;
  const dHeight = customDimensions?.desktopHeight ?? BANNER_DESKTOP_HEIGHT;
  const mWidth = customDimensions?.mobileWidth ?? BANNER_MOBILE_WIDTH;
  const mHeight = customDimensions?.mobileHeight ?? BANNER_MOBILE_HEIGHT;

  const [dWebp, dAvif, mWebp, mAvif] = await Promise.all([
    getJSquashCroppedImg(
      desktopSrc,
      desktopCrop,
      0,
      { horizontal: false, vertical: false },
      dWidth,
      dHeight,
      "webp",
    ),
    getJSquashCroppedImg(
      desktopSrc,
      desktopCrop,
      0,
      { horizontal: false, vertical: false },
      dWidth,
      dHeight,
      "avif",
    ),
    getJSquashCroppedImg(
      mobileSrc,
      mobileCrop,
      0,
      { horizontal: false, vertical: false },
      mWidth,
      mHeight,
      "webp",
    ),
    getJSquashCroppedImg(
      mobileSrc,
      mobileCrop,
      0,
      { horizontal: false, vertical: false },
      mWidth,
      mHeight,
      "avif",
    ),
  ]);

  if (!dWebp || !dAvif || !mWebp || !mAvif) {
    return null;
  }

  return {
    desktopWebp: dWebp,
    desktopAvif: dAvif,
    mobileWebp: mWebp,
    mobileAvif: mAvif,
  };
};

export type CanvasExtensionMode = "direct" | "blurred" | "black" | "white";
export type CanvasExtensionAlignment = "center" | "right" | "left";

export const createExtendedCanvasImage = async (
  imageSrc: string,
  targetAspect: number,
  extensionMode: CanvasExtensionMode = "blurred",
  alignment: CanvasExtensionAlignment = "center",
): Promise<string> => {
  if (extensionMode === "direct") return imageSrc;

  const image = await createImage(imageSrc);
  const srcWidth = image.naturalWidth || image.width;
  const srcHeight = image.naturalHeight || image.height;
  const srcAspect = srcWidth / srcHeight;

  // If the source image is already equal to or wider than the target aspect, no extension needed
  if (srcAspect >= targetAspect) {
    return imageSrc;
  }

  // Calculate target canvas dimensions matching target aspect
  const canvasHeight = srcHeight;
  const canvasWidth = Math.round(canvasHeight * targetAspect);

  const canvas = document.createElement("canvas");
  canvas.width = canvasWidth;
  canvas.height = canvasHeight;
  const ctx = canvas.getContext("2d");
  if (!ctx) return imageSrc;

  // 1. Draw Extended Background
  if (extensionMode === "black") {
    ctx.fillStyle = "#000000";
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);
  } else if (extensionMode === "white") {
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);
  } else if (extensionMode === "blurred") {
    // Fill base
    ctx.fillStyle = "#050505";
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    // Save and draw heavily blurred cover
    ctx.save();
    ctx.filter = "blur(28px) brightness(0.65)";
    const scale = Math.max(canvasWidth / srcWidth, canvasHeight / srcHeight);
    const coverW = srcWidth * scale;
    const coverH = srcHeight * scale;
    const coverX = (canvasWidth - coverW) / 2;
    const coverY = (canvasHeight - coverH) / 2;
    ctx.drawImage(image, coverX, coverY, coverW, coverH);
    ctx.restore();

    // Dark vignette on left and right edges for smooth blending
    const gradient = ctx.createLinearGradient(0, 0, canvasWidth, 0);
    gradient.addColorStop(0, "rgba(0,0,0,0.5)");
    gradient.addColorStop(0.12, "rgba(0,0,0,0)");
    gradient.addColorStop(0.88, "rgba(0,0,0,0)");
    gradient.addColorStop(1, "rgba(0,0,0,0.5)");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);
  }

  // 2. Draw Foreground Intact Original Image
  let drawX = 0;
  const drawY = 0;
  const drawW = srcWidth;
  const drawH = srcHeight;

  if (alignment === "center") {
    drawX = (canvasWidth - drawW) / 2;
  } else if (alignment === "right") {
    drawX = canvasWidth - drawW;
  } else if (alignment === "left") {
    drawX = 0;
  }

  ctx.drawImage(image, drawX, drawY, drawW, drawH);

  return canvas.toDataURL("image/png");
};
