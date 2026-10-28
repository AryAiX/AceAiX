/**
 * Profile cover crop.
 *
 * The header draws the cover as a full-width band. The editor has to crop to
 * that same shape: iOS ImagePicker's `allowsEditing` ignores `aspect` and
 * always returns a square, which is how heads were getting cut off.
 *
 * Coordinates: `scale` 1 draws the image so it just covers the frame, and 3
 * draws it three times that large. `offsetX` / `offsetY` are the pan in frame
 * points. (0, 0) is centred. Positive offset moves the image right and down,
 * so the frame shows more of the top-left of the picture.
 */

export const COVER_ASPECT = 2.4;

/** Zoom 1 is "the image just fills the frame". */
export const COVER_MIN_ZOOM = 1;
export const COVER_MAX_ZOOM = 3;

/** Long edge of the JPEG written before upload. */
export const COVER_EXPORT_WIDTH = 1500;
export const COVER_JPEG_QUALITY = 0.85;

export interface CoverSize {
  width: number;
  height: number;
}

export interface CoverCropRect {
  originX: number;
  originY: number;
  width: number;
  height: number;
}

export interface CoverCropInput {
  imageWidth: number;
  imageHeight: number;
  frameWidth: number;
  frameHeight: number;
  /** 1 = the image just fills the frame. */
  scale: number;
  offsetX: number;
  offsetY: number;
}

/** Points per image pixel when the picture just covers the frame. */
export function coverBaseScale(image: CoverSize, frame: CoverSize): number {
  'worklet';
  if (image.width <= 0 || image.height <= 0 || frame.width <= 0 || frame.height <= 0) {
    return 0;
  }
  return Math.max(frame.width / image.width, frame.height / image.height);
}

export function clampCoverZoom(zoom: number): number {
  'worklet';
  if (!Number.isFinite(zoom)) return COVER_MIN_ZOOM;
  return Math.min(COVER_MAX_ZOOM, Math.max(COVER_MIN_ZOOM, zoom));
}

/**
 * Largest pan that still leaves the frame completely covered.
 * The limits are in frame points, centred on zero.
 */
export function clampCoverOffset(
  offsetX: number,
  offsetY: number,
  zoom: number,
  image: CoverSize,
  frame: CoverSize,
): { x: number; y: number } {
  'worklet';
  const z = clampCoverZoom(zoom);
  const base = coverBaseScale(image, frame);
  const dispW = image.width * base * z;
  const dispH = image.height * base * z;
  const limitX = Math.max(0, (dispW - frame.width) / 2);
  const limitY = Math.max(0, (dispH - frame.height) / 2);
  const x = Number.isFinite(offsetX) ? offsetX : 0;
  const y = Number.isFinite(offsetY) ? offsetY : 0;
  return {
    x: Math.min(limitX, Math.max(-limitX, x)),
    y: Math.min(limitY, Math.max(-limitY, y)),
  };
}

/**
 * The frame that fits inside a stage while keeping {@link COVER_ASPECT}.
 * Width and height are in the same unit as the stage.
 */
export function coverFrameSize(stageWidth: number, stageHeight: number): CoverSize {
  const sw = Number.isFinite(stageWidth) ? Math.max(0, stageWidth) : 0;
  const sh = Number.isFinite(stageHeight) ? Math.max(0, stageHeight) : 0;
  if (sw === 0 || sh === 0) return { width: 0, height: 0 };
  const width = Math.min(sw, sh * COVER_ASPECT);
  return { width, height: width / COVER_ASPECT };
}

function clampInt(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/**
 * Round a crop into image pixels and keep it inside the bitmap.
 * An edge the continuous rect is already touching stays on that edge —
 * rounding otherwise pulls a full-bleed crop a pixel inside the photo.
 */
function integerCrop(
  x: number,
  y: number,
  width: number,
  height: number,
  imageWidth: number,
  imageHeight: number,
): CoverCropRect {
  const maxW = Math.max(1, Math.round(imageWidth));
  const maxH = Math.max(1, Math.round(imageHeight));
  let w = clampInt(Math.round(width), 1, maxW);
  let h = clampInt(Math.round(height), 1, maxH);
  let originX = Math.round(x);
  let originY = Math.round(y);

  if (x <= 0.5) originX = 0;
  if (y <= 0.5) originY = 0;
  if (x + width >= imageWidth - 0.5) originX = maxW - w;
  if (y + height >= imageHeight - 0.5) originY = maxH - h;

  if (originX < 0) originX = 0;
  if (originY < 0) originY = 0;
  if (originX + w > maxW) originX = maxW - w;
  if (originY + h > maxH) originY = maxH - h;
  if (originX < 0) {
    originX = 0;
    w = maxW;
  }
  if (originY < 0) {
    originY = 0;
    h = maxH;
  }
  return { originX, originY, width: w, height: h };
}

/** Crop rectangle in image pixels. Integers, inside the image. */
export function coverCropRect(input: CoverCropInput): CoverCropRect {
  const image = { width: input.imageWidth, height: input.imageHeight };
  const frame = { width: input.frameWidth, height: input.frameHeight };
  if (image.width <= 0 || image.height <= 0) {
    return { originX: 0, originY: 0, width: 1, height: 1 };
  }
  const scale = clampCoverZoom(input.scale);
  const base = coverBaseScale(image, frame);
  if (base <= 0) {
    return integerCrop(0, 0, image.width, image.height, image.width, image.height);
  }
  const offset = clampCoverOffset(input.offsetX, input.offsetY, scale, image, frame);
  const pointsPerPixel = base * scale;
  const cropW = frame.width / pointsPerPixel;
  const cropH = frame.height / pointsPerPixel;
  const cropX = (image.width - cropW) / 2 - offset.x / pointsPerPixel;
  const cropY = (image.height - cropH) / 2 - offset.y / pointsPerPixel;
  return integerCrop(cropX, cropY, cropW, cropH, image.width, image.height);
}

/** EXIF Orientation tag, 1–8, when the picker actually sent one. */
export function exifOrientation(
  exif: Record<string, unknown> | null | undefined,
): number | null {
  if (!exif) return null;
  const raw = exif.Orientation ?? exif.orientation;
  const value = typeof raw === 'number' ? raw : typeof raw === 'string' ? Number(raw) : Number.NaN;
  if (!Number.isInteger(value) || value < 1 || value > 8) return null;
  return value;
}

/**
 * Stored file pixels → the picture as it is shown.
 * Orientations 5–8 are rotated 90°, so width and height trade places.
 * ImagePicker's own width/height are already visual; only a raw decode
 * (no size on the asset) should pass through here.
 */
export function storedPixelsToVisual(
  width: number,
  height: number,
  orientation: number | null,
): CoverSize {
  const w = Math.max(0, Math.round(width));
  const h = Math.max(0, Math.round(height));
  const turned = orientation != null && orientation >= 5 && orientation <= 8;
  return turned ? { width: h, height: w } : { width: w, height: h };
}

/**
 * Which pixel size the crop should trust.
 *
 * `reported` is what the picker said. `loaded` is the bitmap actually drawn
 * (EXIF already applied). A 90° orientation that the picker forgot makes the
 * two aspects reciprocals — use the drawn size. A decode that is the same
 * picture with more pixels (points vs pixels) wins too. A smaller decode of
 * the same aspect is a downscale, and the crop still wants the full file.
 */
export function resolvedCoverPixels(reported: CoverSize, loaded: CoverSize): CoverSize {
  const rw = Math.round(reported.width);
  const rh = Math.round(reported.height);
  const lw = Math.round(loaded.width);
  const lh = Math.round(loaded.height);
  if (lw <= 0 || lh <= 0) return { width: Math.max(0, rw), height: Math.max(0, rh) };
  if (rw <= 0 || rh <= 0) return { width: lw, height: lh };

  const aspectDrift = Math.abs(Math.log(lw / lh / (rw / rh)));
  if (aspectDrift > Math.log(1.2)) return { width: lw, height: lh };
  if (lw > rw * 1.2 && lh > rh * 1.2) return { width: lw, height: lh };
  return { width: rw, height: rh };
}

export interface RenderCoverOptions {
  /**
   * Also return the JPEG body. Profile covers upload the file URI and leave
   * this off; club covers upload base64 through the existing avatar helper.
   */
  base64?: boolean;
}

/** Crop to the frame, then a 1500px-wide JPEG. Orientation is baked by the manipulator before the crop. */
export async function renderCoverCrop(
  uri: string,
  crop: CoverCropRect,
  options?: RenderCoverOptions,
): Promise<{ uri: string; width: number; height: number; base64?: string }> {
  const { ImageManipulator, SaveFormat } = await import('expo-image-manipulator');
  const context = ImageManipulator.manipulate(uri);
  try {
    context.crop({
      originX: crop.originX,
      originY: crop.originY,
      width: crop.width,
      height: crop.height,
    });
    context.resize({ width: COVER_EXPORT_WIDTH });
    const rendered = await context.renderAsync();
    try {
      const saved = await rendered.saveAsync({
        compress: COVER_JPEG_QUALITY,
        format: SaveFormat.JPEG,
        ...(options?.base64 ? { base64: true } : {}),
      });
      return {
        uri: saved.uri,
        width: saved.width,
        height: saved.height,
        ...(options?.base64 && saved.base64 ? { base64: saved.base64 } : {}),
      };
    } finally {
      rendered.release();
    }
  } finally {
    context.release();
  }
}
