import { Asset } from 'expo-asset';
import { Directory, File, Paths } from 'expo-file-system';

const LOGO = require('../assets/images/logo-mark.png');

export type BrandedKind = 'story' | 'post';

export interface BrandedImageInput {
  kind: BrandedKind;
  /** Signed photo, or a video's signed thumbnail. */
  imageUrl: string;
  isVideo: boolean;
  name: string;
  /** Already translated. Empty when the post has no sport. */
  sport: string;
}

export interface BrandedCardSpec {
  kind: BrandedKind;
  photoBase64: string;
  logoBase64: string;
  isVideo: boolean;
  name: string;
  sport: string;
}

type Renderer = (spec: BrandedCardSpec) => Promise<string>;

let renderer: Renderer | null = null;

/** The off-screen card registers this while it is mounted. */
export function setBrandedRenderer(next: Renderer | null) {
  renderer = next;
}

/**
 * Caption pasted alongside the image.
 *
 * The post text is kept to 120 characters, cut on a word. Then a blank line,
 * the "find me" line with the post link, then the tags.
 */
export function brandedShareCaption(input: {
  caption: string;
  link: string;
  sportKey: string | null;
  findMePrefix: string;
}): string {
  const clipped = clipCaption(input.caption.trim(), 120);
  const sport = input.sportKey?.trim() ?? '';
  const tags = sport ? `#AceAiX #${sport.replace(/\s+/g, '')}` : '#AceAiX';
  const lines = clipped ? [clipped, '', `${input.findMePrefix}${input.link}`, tags] : [`${input.findMePrefix}${input.link}`, tags];
  return lines.join('\n');
}

function clipCaption(text: string, max: number): string {
  if (!text || text.length <= max) return text;
  const slice = text.slice(0, max);
  const space = slice.lastIndexOf(' ');
  const cut = space > 0 ? slice.slice(0, space) : slice;
  return `${cut.trimEnd()}…`;
}

/**
 * Download the photo, draw the card, and leave a PNG in the cache.
 * Nothing is uploaded.
 */
export async function buildBrandedImage(input: BrandedImageInput): Promise<string> {
  const draw = renderer;
  if (!draw) throw new Error('Branded card is not on screen');

  const folder = new Directory(Paths.cache, 'branded');
  if (!folder.exists) folder.create({ intermediates: true });

  const source = new File(folder, 'source.jpg');
  if (source.exists) source.delete();
  const downloaded = await File.downloadFileAsync(input.imageUrl, source);

  const photoBase64 = await jpegBase64(downloaded.uri);
  const logoBase64 = await logoBase64FromAsset();
  const png = await draw({
    kind: input.kind,
    photoBase64,
    logoBase64,
    isVideo: input.isVideo,
    name: input.name,
    sport: input.sport,
  });

  const file = new File(folder, `aceaix-share-${input.kind}.png`);
  file.create({ overwrite: true });
  file.write(Uint8Array.from(atob(png.replace(/^data:image\/\w+;base64,/, '')), (c) => c.charCodeAt(0)));
  return file.uri;
}

/** Cap the width at 1080px and return a JPEG body, base64, with no data-URL prefix. */
async function jpegBase64(uri: string): Promise<string> {
  const { ImageManipulator, SaveFormat } = await import('expo-image-manipulator');
  const context = ImageManipulator.manipulate(uri);
  context.resize({ width: 1080 });
  const rendered = await context.renderAsync();
  try {
    const saved = await rendered.saveAsync({
      compress: 0.86,
      format: SaveFormat.JPEG,
      base64: true,
    });
    if (!saved.base64) throw new Error('Resized image had no data');
    return saved.base64;
  } finally {
    rendered.release();
  }
}

async function logoBase64FromAsset(): Promise<string> {
  const asset = Asset.fromModule(LOGO);
  if (!asset.localUri) await asset.downloadAsync();
  const uri = asset.localUri ?? asset.uri;
  if (!uri) throw new Error('Logo asset is unavailable');
  return new File(uri).base64();
}
