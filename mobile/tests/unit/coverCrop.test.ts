import { describe, expect, it } from 'vitest';

import {
  COVER_ASPECT,
  coverCropRect,
  resolvedCoverPixels,
  storedPixelsToVisual,
  type CoverCropInput,
} from '@/lib/coverCrop';

/** 240×100 is exactly COVER_ASPECT, so the frame math stays in round numbers. */
const FRAME = { frameWidth: 240, frameHeight: 100 };

function crop(partial: Omit<CoverCropInput, 'frameWidth' | 'frameHeight'> & Partial<CoverCropInput>) {
  return coverCropRect({ ...FRAME, ...partial });
}

describe('coverCropRect', () => {
  it('uses a wide frame close to the old 168pt band', () => {
    expect(COVER_ASPECT).toBe(2.4);
    // 390 / 2.4 = 162.5, against the previous fixed 168.
    expect(390 / COVER_ASPECT).toBeCloseTo(162.5, 5);
  });

  it('centres a landscape image that is wider than the frame', () => {
    // 4000×1000 is 4:1. At zoom 1 the height fills and the sides are cropped.
    expect(
      crop({
        imageWidth: 4000,
        imageHeight: 1000,
        scale: 1,
        offsetX: 0,
        offsetY: 0,
      }),
    ).toEqual({ originX: 800, originY: 0, width: 2400, height: 1000 });
  });

  it('centres a portrait image', () => {
    // 1200×3000. At zoom 1 the width fills and the top and bottom are cropped.
    expect(
      crop({
        imageWidth: 1200,
        imageHeight: 3000,
        scale: 1,
        offsetX: 0,
        offsetY: 0,
      }),
    ).toEqual({ originX: 0, originY: 1250, width: 1200, height: 500 });
  });

  it('drags a wide image to the left and right edges', () => {
    const image = { imageWidth: 4000, imageHeight: 1000, scale: 1, offsetY: 0 };
    // limitX = (400 − 240) / 2 = 80. Positive offset moves the image right.
    expect(crop({ ...image, offsetX: 80 })).toEqual({
      originX: 0,
      originY: 0,
      width: 2400,
      height: 1000,
    });
    expect(crop({ ...image, offsetX: -80 })).toEqual({
      originX: 1600,
      originY: 0,
      width: 2400,
      height: 1000,
    });
  });

  it('drags a tall image to the top and bottom edges', () => {
    const image = { imageWidth: 1200, imageHeight: 3000, scale: 1, offsetX: 0 };
    // limitY = (600 − 100) / 2 = 250.
    expect(crop({ ...image, offsetY: 250 })).toEqual({
      originX: 0,
      originY: 0,
      width: 1200,
      height: 500,
    });
    expect(crop({ ...image, offsetY: -250 })).toEqual({
      originX: 0,
      originY: 2500,
      width: 1200,
      height: 500,
    });
  });

  it('keeps a pan past the edge inside the image', () => {
    expect(
      crop({
        imageWidth: 4000,
        imageHeight: 1000,
        scale: 1,
        offsetX: 10_000,
        offsetY: -10_000,
      }),
    ).toEqual({ originX: 0, originY: 0, width: 2400, height: 1000 });
  });

  it('crops a smaller centred rectangle when zoomed', () => {
    expect(
      crop({
        imageWidth: 4000,
        imageHeight: 3000,
        scale: 2,
        offsetX: 0,
        offsetY: 0,
      }),
    ).toEqual({ originX: 1000, originY: 1083, width: 2000, height: 833 });
  });

  it('reaches every edge of a zoomed image', () => {
    const image = { imageWidth: 4000, imageHeight: 3000, scale: 2 };
    expect(crop({ ...image, offsetX: 120, offsetY: 0 })).toMatchObject({ originX: 0 });
    expect(crop({ ...image, offsetX: -120, offsetY: 0 })).toMatchObject({
      originX: 2000,
      width: 2000,
    });
    expect(crop({ ...image, offsetX: 0, offsetY: 130 })).toMatchObject({ originY: 0 });
    const bottom = crop({ ...image, offsetX: 0, offsetY: -130 });
    expect(bottom.originY + bottom.height).toBe(3000);
  });

  it('caps zoom at 3× the fill size', () => {
    const atMax = crop({
      imageWidth: 4000,
      imageHeight: 1000,
      scale: 3,
      offsetX: 0,
      offsetY: 0,
    });
    const pastMax = crop({
      imageWidth: 4000,
      imageHeight: 1000,
      scale: 9,
      offsetX: 0,
      offsetY: 0,
    });
    expect(atMax).toEqual(pastMax);
    expect(atMax.width).toBeLessThan(2400);
  });

  it('returns integers that stay inside the bitmap', () => {
    const rect = coverCropRect({
      imageWidth: 1234,
      imageHeight: 5678,
      frameWidth: 390,
      frameHeight: 390 / COVER_ASPECT,
      scale: 2.2,
      offsetX: 40,
      offsetY: -15,
    });
    expect(Number.isInteger(rect.originX)).toBe(true);
    expect(Number.isInteger(rect.originY)).toBe(true);
    expect(Number.isInteger(rect.width)).toBe(true);
    expect(Number.isInteger(rect.height)).toBe(true);
    expect(rect.originX).toBeGreaterThanOrEqual(0);
    expect(rect.originY).toBeGreaterThanOrEqual(0);
    expect(rect.originX + rect.width).toBeLessThanOrEqual(1234);
    expect(rect.originY + rect.height).toBeLessThanOrEqual(5678);
    expect(rect.width).toBeGreaterThan(0);
    expect(rect.height).toBeGreaterThan(0);
  });
});

describe('cover pixel size', () => {
  it('swaps stored pixels for a 90° EXIF orientation', () => {
    expect(storedPixelsToVisual(4032, 3024, 6)).toEqual({ width: 3024, height: 4032 });
    expect(storedPixelsToVisual(4032, 3024, 1)).toEqual({ width: 4032, height: 3024 });
    expect(storedPixelsToVisual(4032, 3024, 8)).toEqual({ width: 3024, height: 4032 });
  });

  it('trusts the drawn bitmap when the reported size is sideways or in points', () => {
    expect(resolvedCoverPixels({ width: 4032, height: 3024 }, { width: 3024, height: 4032 })).toEqual({
      width: 3024,
      height: 4032,
    });
    // Same aspect, more pixels: the picker reported points.
    expect(resolvedCoverPixels({ width: 1000, height: 750 }, { width: 3000, height: 2250 })).toEqual({
      width: 3000,
      height: 2250,
    });
    // Same aspect, fewer pixels: a downscaled decode. Keep the file size.
    expect(resolvedCoverPixels({ width: 4000, height: 3000 }, { width: 800, height: 600 })).toEqual({
      width: 4000,
      height: 3000,
    });
  });
});
