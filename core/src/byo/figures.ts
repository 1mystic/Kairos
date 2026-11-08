import { imageRefSchema, type ImageRef } from '../question';
import type { Bbox } from './schema';

const clamp01 = (x: number) => Math.min(1, Math.max(0, Number.isFinite(x) ? x : 0));
const MIN_EXTENT = 0.01;

/** Clamp to [0,1], fix inverted corners and enforce a minimum 1% box so it stays croppable. */
export function clampBbox(b: readonly [number, number, number, number]): Bbox {
  let x0 = clamp01(Math.min(b[0], b[2]));
  let x1 = clamp01(Math.max(b[0], b[2]));
  let y0 = clamp01(Math.min(b[1], b[3]));
  let y1 = clamp01(Math.max(b[1], b[3]));
  if (x1 - x0 < MIN_EXTENT) {
    if (x0 + MIN_EXTENT <= 1) x1 = x0 + MIN_EXTENT;
    else x0 = x1 - MIN_EXTENT;
  }
  if (y1 - y0 < MIN_EXTENT) {
    if (y0 + MIN_EXTENT <= 1) y1 = y0 + MIN_EXTENT;
    else y0 = y1 - MIN_EXTENT;
  }
  return [x0, y0, x1, y1];
}

export interface PixelRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Fractional bbox -> integer pixel rect on a page, padded by `pad` (fraction of page size) per side. */
export function bboxToPixels(
  bbox: readonly [number, number, number, number],
  pageW: number,
  pageH: number,
  pad = 0.02,
): PixelRect {
  const [x0, y0, x1, y1] = clampBbox([bbox[0] - pad, bbox[1] - pad, bbox[2] + pad, bbox[3] + pad]);
  const x = Math.floor(x0 * pageW);
  const y = Math.floor(y0 * pageH);
  return {
    x,
    y,
    w: Math.max(1, Math.min(Math.ceil(x1 * pageW), Math.round(pageW)) - x),
    h: Math.max(1, Math.min(Math.ceil(y1 * pageH), Math.round(pageH)) - y),
  };
}

/** Next unused `fig-N` name given names already taken. */
export function nextImageName(existing: Iterable<string>, prefix = 'fig'): string {
  const taken = new Set(existing);
  let n = 1;
  while (taken.has(`${prefix}-${n}`)) n++;
  return `${prefix}-${n}`;
}

/** ImageRef for a stored webp blob: id = first 16 hex of the sha256, one variant. */
export function imageRefFromBlobMeta(m: { idHex: string; w: number; h: number; alt: string }): ImageRef {
  const alt = m.alt.replace(/[\][]/g, ' ').replace(/\s+/g, ' ').trim();
  return imageRefSchema.parse({
    id: m.idHex.toLowerCase().slice(0, 16),
    w: m.w,
    h: m.h,
    alt,
    variants: [m.w],
  });
}
