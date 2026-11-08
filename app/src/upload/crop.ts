import { bboxToPixels, imageRefFromBlobMeta, sha256Hex, type ImageRef, type PendingFigure, type PixelRect } from '@kairos/core';

export type Rect = PixelRect;
export type Handle = 'move' | 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw';
export const HANDLES: Handle[] = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'];
export const MIN_CROP = 24;
export const MAX_OUT_W = 960;
export const WEBP_TARGET_BYTES = 80_000;

/** The AI's bbox as a pixel rect on the page image (padded 2% per side by core). */
export function initialRect(bbox: PendingFigure['bbox'], pageW: number, pageH: number): Rect {
  return bboxToPixels(bbox, pageW, pageH);
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/**
 * Drag math. `start` is the rect when the gesture began, dx/dy the pointer travel in IMAGE pixels.
 * The result always stays inside `bounds` and at least `min` pixels in each direction.
 */
export function dragRect(start: Rect, handle: Handle, dx: number, dy: number, bounds: { w: number; h: number }, min = MIN_CROP): Rect {
  const m = Math.min(min, bounds.w, bounds.h);
  if (handle === 'move') {
    return {
      x: clamp(start.x + dx, 0, bounds.w - start.w),
      y: clamp(start.y + dy, 0, bounds.h - start.h),
      w: start.w,
      h: start.h,
    };
  }
  let x0 = start.x;
  let y0 = start.y;
  let x1 = start.x + start.w;
  let y1 = start.y + start.h;
  if (handle.includes('w')) x0 = clamp(x0 + dx, 0, x1 - m);
  if (handle.includes('e')) x1 = clamp(x1 + dx, x0 + m, bounds.w);
  if (handle.includes('n')) y0 = clamp(y0 + dy, 0, y1 - m);
  if (handle.includes('s')) y1 = clamp(y1 + dy, y0 + m, bounds.h);
  return { x: Math.round(x0), y: Math.round(y0), w: Math.round(x1 - x0), h: Math.round(y1 - y0) };
}

/** Output size of the saved image: at most `maxW` wide, aspect kept, never upscaled. */
export function outputSize(rect: Pick<Rect, 'w' | 'h'>, maxW = MAX_OUT_W): { w: number; h: number } {
  const scale = Math.min(1, maxW / rect.w);
  return { w: Math.max(1, Math.round(rect.w * scale)), h: Math.max(1, Math.round(rect.h * scale)) };
}

/** CSS percentages for an overlay box on the displayed page image. */
export function rectToPercent(rect: Rect, page: { w: number; h: number }) {
  return {
    left: `${(rect.x / page.w) * 100}%`,
    top: `${(rect.y / page.h) * 100}%`,
    width: `${(rect.w / page.w) * 100}%`,
    height: `${(rect.h / page.h) * 100}%`,
  };
}

export interface CropResult {
  bytes: Uint8Array;
  w: number;
  h: number;
}
/** Injectable so tests (and jsdom, which has no canvas) can fake it. */
export type CropToWebp = (page: Blob, rect: Rect) => Promise<CropResult>;

/** Canvas crop -> webp q0.8; retry q0.6 above 80 KB; shrink further if the base64 would break the 120k-char cap. */
export const canvasCropToWebp: CropToWebp = async (page, rect) => {
  const bmp = await createImageBitmap(page);
  try {
    let { w, h } = outputSize(rect);
    for (let attempt = 0; attempt < 4; attempt++) {
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas is not available in this browser.');
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, w, h);
      ctx.drawImage(bmp, rect.x, rect.y, rect.w, rect.h, 0, 0, w, h);
      const toBlob = (q: number) =>
        new Promise<Blob>((res, rej) => canvas.toBlob((b) => (b ? res(b) : rej(new Error('Could not encode the image.'))), 'image/webp', q));
      let blob = await toBlob(0.8);
      if (blob.size > WEBP_TARGET_BYTES) blob = await toBlob(0.6);
      if (blob.size <= 88_000) return { bytes: new Uint8Array(await blob.arrayBuffer()), w, h };
      w = Math.max(64, Math.round(w * 0.75));
      h = Math.max(1, Math.round(h * 0.75));
    }
    throw new Error('This figure is too detailed to store. Crop a smaller area.');
  } finally {
    bmp.close?.();
  }
};

/** id = first 16 hex of sha256(webp bytes). */
export function imageIdOf(bytes: Uint8Array): string {
  return sha256Hex(bytes).slice(0, 16);
}

export function imageRefOf(res: CropResult, alt: string): ImageRef {
  return imageRefFromBlobMeta({ idHex: imageIdOf(res.bytes), w: res.w, h: res.h, alt });
}
