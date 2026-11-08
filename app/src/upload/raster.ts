import { MAX_SIDE, type RasterPage, type Rasterizer } from './pages';

const THUMB_SIDE = 240;

function canvasBlob(c: HTMLCanvasElement, type: string, q: number): Promise<Blob> {
  return new Promise((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error('Could not encode the page image.'))), type, q));
}

async function fromCanvas(src: CanvasImageSource, sw: number, sh: number, source: string): Promise<RasterPage> {
  const make = async (side: number, q: number) => {
    const k = Math.min(1, side / Math.max(sw, sh));
    const c = document.createElement('canvas');
    c.width = Math.max(1, Math.round(sw * k));
    c.height = Math.max(1, Math.round(sh * k));
    const ctx = c.getContext('2d');
    if (!ctx) throw new Error('Canvas is not available in this browser.');
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, c.width, c.height);
    ctx.drawImage(src, 0, 0, c.width, c.height);
    return { blob: await canvasBlob(c, 'image/jpeg', q), w: c.width, h: c.height };
  };
  const full = await make(MAX_SIDE, 0.85);
  const thumb = await make(THUMB_SIDE, 0.7);
  return { blob: full.blob, thumb: thumb.blob, w: full.w, h: full.h, source };
}

async function imageFileToPage(file: File): Promise<RasterPage> {
  const bmp = await createImageBitmap(file);
  try {
    return await fromCanvas(bmp, bmp.width, bmp.height, file.name);
  } finally {
    bmp.close?.();
  }
}

/** Real rasterizer: images via canvas, PDFs via pdf.js (loaded on first use, worker emitted by Vite). */
export async function defaultRasterizer(): Promise<Rasterizer> {
  return {
    image: imageFileToPage,
    async pdf(file, onPage) {
      const pdfjs = await import('pdfjs-dist');
      const worker = (await import('pdfjs-dist/build/pdf.worker.min.mjs?url')).default;
      pdfjs.GlobalWorkerOptions.workerSrc = worker;
      const task = pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) });
      const doc = await task.promise;
      try {
        for (let i = 1; i <= doc.numPages; i++) {
          const page = await doc.getPage(i);
          const base = page.getViewport({ scale: 1 });
          const scale = MAX_SIDE / Math.max(base.width, base.height);
          const vp = page.getViewport({ scale });
          const canvas = document.createElement('canvas');
          canvas.width = Math.round(vp.width);
          canvas.height = Math.round(vp.height);
          const ctx = canvas.getContext('2d');
          if (!ctx) throw new Error('Canvas is not available in this browser.');
          ctx.fillStyle = 'white';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          await page.render({ canvasContext: ctx, canvas, viewport: vp }).promise;
          page.cleanup();
          await onPage(await fromCanvas(canvas, canvas.width, canvas.height, `${file.name} p${i}`), i - 1, doc.numPages);
        }
      } finally {
        void task.destroy();
      }
    },
  };
}
