import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createIdbKv, type KvDb } from '../store/bankDb';

export const PAGES_DB = 'kairos-upload-pages';
export const PAGE_STORES = ['pages'] as const;
export const MAX_SIDE = 1600;
export const MAX_PAGES = 200;
export const MAX_FILE_BYTES = 80 * 1024 * 1024;

/** A page of the student's paper. `n` is the 1-based number the prompt's "page" field refers to. */
export interface PageImage {
  n: number;
  w: number;
  h: number;
  blob: Blob;
  thumb: Blob;
  source: string;
}
export type RasterPage = Omit<PageImage, 'n'>;

/** Turns files into pages. The real one needs canvas/pdf.js; tests inject a fake. */
export interface Rasterizer {
  image(file: File): Promise<RasterPage>;
  pdf(file: File, onPage: (p: RasterPage, i: number, total: number) => Promise<void> | void): Promise<void>;
}

export type FileKind = 'pdf' | 'image' | 'other';
export function fileKind(f: Pick<File, 'name' | 'type'>): FileKind {
  if (f.type === 'application/pdf' || /\.pdf$/i.test(f.name)) return 'pdf';
  if (f.type.startsWith('image/') || /\.(png|jpe?g|webp|gif|bmp|heic)$/i.test(f.name)) return 'image';
  return 'other';
}

const key = (n: number) => `p${String(n).padStart(4, '0')}`;

/** Pages for this browser session: memory + IndexedDB `kairos-upload-pages`. Never uploaded. */
export class PageStore {
  constructor(private kv: KvDb) {}
  async list(): Promise<PageImage[]> {
    const rows = await this.kv.getAll('pages');
    return rows.map((r) => r.value as PageImage).sort((a, b) => a.n - b.n);
  }
  put(p: PageImage) {
    return this.kv.put('pages', key(p.n), p);
  }
  clear() {
    return this.kv.clear('pages');
  }
}

export interface PagesApi {
  pages: PageImage[];
  busy: boolean;
  /** "Rendering page 3 of 12" */
  progress: string | null;
  errors: string[];
  addFiles(files: File[]): Promise<void>;
  clear(): Promise<void>;
}

export function usePages(opts: { kv?: KvDb; rasterizer?: Rasterizer | (() => Promise<Rasterizer>) } = {}): PagesApi {
  const store = useMemo(() => new PageStore(opts.kv ?? createIdbKv(PAGES_DB, PAGE_STORES)), [opts.kv]);
  const [pages, setPages] = useState<PageImage[]>([]);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<string | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const count = useRef(0);
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    void store.list().then((p) => { if (alive.current) { count.current = p.length; setPages(p); } }).catch(() => {});
    return () => { alive.current = false; };
  }, [store]);

  const append = useCallback(async (p: RasterPage) => {
    if (count.current >= MAX_PAGES) throw new Error(`Up to ${MAX_PAGES} pages at a time.`);
    const page: PageImage = { ...p, n: count.current + 1 };
    count.current = page.n;
    try { await store.put(page); } catch { /* storage full or blocked: keep it in memory for this session */ }
    if (alive.current) setPages((cur) => [...cur, page]);
  }, [store]);

  const rasterizerOpt = opts.rasterizer;
  const addFiles = useCallback(async (files: File[]) => {
    setBusy(true);
    setErrors([]);
    const errs: string[] = [];
    try {
      const rz = typeof rasterizerOpt === 'function' ? await rasterizerOpt() : (rasterizerOpt ?? (await (await import('./raster')).defaultRasterizer()));
      for (const f of files) {
        const kind = fileKind(f);
        if (kind === 'other') { errs.push(`${f.name}: only PDF and image files can be added.`); continue; }
        if (f.size > MAX_FILE_BYTES) { errs.push(`${f.name}: file is larger than 80 MB.`); continue; }
        try {
          if (kind === 'image') {
            setProgress(`Adding ${f.name}`);
            await append(await rz.image(f));
          } else {
            await rz.pdf(f, async (p, i, total) => {
              setProgress(`Rendering ${f.name}: page ${i + 1} of ${total}`);
              await append(p);
            });
          }
        } catch (e) {
          errs.push(`${f.name}: ${e instanceof Error ? e.message : 'could not be read.'}`);
        }
      }
    } catch (e) {
      errs.push(e instanceof Error ? e.message : 'Could not start the page reader.');
    } finally {
      if (alive.current) { setErrors(errs); setBusy(false); setProgress(null); }
    }
  }, [append, rasterizerOpt]);

  const clear = useCallback(async () => {
    await store.clear();
    count.current = 0;
    setPages([]);
  }, [store]);

  return { pages, busy, progress, errors, addFiles, clear };
}
