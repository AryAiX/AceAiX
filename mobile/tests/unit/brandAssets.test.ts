import { describe, expect, it } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

import app from '../../app.json';

/*
 * The icons, checked where a mistake is still cheap.
 *
 * Every failure this file catches is one that otherwise surfaces late and
 * unhelpfully:
 *
 * - A path in app.json that points at nothing fails the *build*, on EAS,
 *   several minutes in, with a message naming a temporary directory.
 * - An icon with an alpha channel fails at App Store *upload*, after the build
 *   has succeeded, with "Invalid large app icon" and no file name. That one has
 *   cost people a release day.
 * - An Android adaptive icon whose artwork runs past the mask's safe zone does
 *   not fail anything at all. It ships, and the logo has its corners cut off on
 *   every phone with round icons.
 *
 * The assets come from `tools/brand/build-brand-assets.py`. If one of these
 * fails, re-run that rather than editing a PNG.
 */

const MOBILE = resolve(__dirname, '../..');

/** Minimal PNG header reader — enough for size and colour type. */
function png(path: string) {
  const buf = readFileSync(path);
  expect(buf.subarray(0, 8).toString('hex')).toBe('89504e470d0a1a0a'); // PNG magic
  // IHDR is always the first chunk: length(4) type(4) w(4) h(4) depth(1) colour(1)
  return {
    width: buf.readUInt32BE(16),
    height: buf.readUInt32BE(20),
    /** 4 = grey+alpha, 6 = truecolour+alpha. 0/2/3 carry no alpha channel. */
    colourType: buf.readUInt8(25),
    bytes: buf.length,
  };
}

const hasAlpha = (colourType: number) => colourType === 4 || colourType === 6;

/** Every image path app.json references, as it references it. */
const referenced: [label: string, path: string][] = [
  ['icon', app.expo.icon],
  ['android.adaptiveIcon.foregroundImage', app.expo.android.adaptiveIcon.foregroundImage],
  ['web.favicon', app.expo.web.favicon],
];

/*
 * Plugin entries are either a bare name or `[name, config]`. TypeScript infers
 * a union of every literal shape in the file from the JSON import, so reading
 * `.image` off the result of a `find` does not compile however the predicate is
 * written. One cast, at the boundary, and the rest of the file stays readable.
 */
type PluginEntry = string | [string, Record<string, unknown>];

function pluginConfig(name: string): Record<string, unknown> {
  const entry = (app.expo.plugins as unknown as PluginEntry[]).find(
    (p) => Array.isArray(p) && p[0] === name
  );
  expect(entry, `app.json has no ${name} plugin`).toBeDefined();
  return (entry as [string, Record<string, unknown>])[1];
}

const splash = pluginConfig('expo-splash-screen') as {
  image: string;
  backgroundColor: string;
  dark: { image: string; backgroundColor: string };
};

const notifications = pluginConfig('expo-notifications') as { icon: string };

describe('brand assets', () => {
  it('every image app.json names exists', () => {
    for (const [label, path] of referenced) {
      expect(path, `${label} is not set`).toBeTruthy();
      expect(existsSync(resolve(MOBILE, path)), `${label} → ${path}`).toBe(true);
    }
  });

  it('the app icon has no alpha channel', () => {
    // Apple rejects the upload, not the build, and does not say which file.
    const icon = png(resolve(MOBILE, app.expo.icon));
    expect(hasAlpha(icon.colourType), 'icon.png has an alpha channel').toBe(false);
    expect(icon.width).toBe(1024);
    expect(icon.height).toBe(1024);
  });

  it('the App Store icon matches the app icon, byte for byte', () => {
    // Two files, one artwork. If they drift, the store listing and the home
    // screen show different logos and nothing warns anybody.
    const a = readFileSync(resolve(MOBILE, app.expo.icon));
    const b = readFileSync(resolve(MOBILE, '../store-assets/app-store/icon-1024.png'));
    expect(b.equals(a)).toBe(true);
  });

  it('the Play icon is 512 square', () => {
    const play = png(resolve(MOBILE, '../store-assets/play/icon-512.png'));
    expect([play.width, play.height]).toEqual([512, 512]);
  });

  describe('the Android adaptive icon', () => {
    const fg = png(resolve(MOBILE, app.expo.android.adaptiveIcon.foregroundImage));

    it('is square and carries transparency', () => {
      expect(fg.width).toBe(fg.height);
      expect(hasAlpha(fg.colourType), 'the foreground must be transparent').toBe(true);
    });

    it('sits on the app background, not a default', () => {
      // A foreground on transparency with no background colour renders on
      // white, which this mark is not drawn for.
      expect(app.expo.android.adaptiveIcon.backgroundColor).toBe('#0B0A16');
    });
  });

  describe('the splash', () => {
    it('has a different image for each scheme', () => {
      // The wordmark in the lockup is white. Using the same file on the light
      // background launched the app to what looked like a bare triangle.
      expect(splash.image).toBeTruthy();
      expect(splash.dark.image).toBeTruthy();
      expect(splash.image).not.toBe(splash.dark.image);
    });

    it('points at files that exist', () => {
      expect(existsSync(resolve(MOBILE, splash.image))).toBe(true);
      expect(existsSync(resolve(MOBILE, splash.dark.image))).toBe(true);
    });

    it('launches onto the colours the app itself uses', () => {
      // A splash background that is not the app's background shows as a flash
      // of a different colour at the handover.
      expect(splash.backgroundColor).toBe('#F7F6FD'); // light `bg` in theme/tokens.ts
      expect(splash.dark.backgroundColor).toBe('#0B0A16'); // dark `bg`
      expect(app.expo.backgroundColor).toBe('#0B0A16');
    });
  });

  describe('the notification icon', () => {
    const path = notifications.icon;

    it('exists and is transparent', () => {
      expect(existsSync(resolve(MOBILE, path))).toBe(true);
      expect(hasAlpha(png(resolve(MOBILE, path)).colourType)).toBe(true);
    });

    it('is a small silhouette, not the colour lockup', () => {
      // Android keeps the alpha channel and throws every colour away, then
      // tints what is left. A full-colour lockup here renders as a white
      // blob — and a big file is the tell that somebody has pasted one in.
      const icon = png(resolve(MOBILE, path));
      expect(icon.width).toBeLessThanOrEqual(192);
      expect(icon.bytes).toBeLessThan(20_000);
    });
  });
});
