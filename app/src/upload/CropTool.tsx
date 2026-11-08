import { useEffect, useRef, useState, type PointerEvent as RPointerEvent } from 'react';
import type { PendingFigure } from '@kairos/core';
import { Button, SelectField } from '../components/ui';
import { HANDLES, dragRect, initialRect, rectToPercent, type CropResult, type CropToWebp, type Handle, type Rect } from './crop';
import type { PageImage } from './pages';

export function useObjectUrl(blob: Blob | undefined): string | undefined {
  const [url, setUrl] = useState<string>();
  useEffect(() => {
    if (!blob || typeof URL.createObjectURL !== 'function') { setUrl(undefined); return; }
    const u = URL.createObjectURL(blob);
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [blob]);
  return url;
}

const HANDLE_POS: Record<Exclude<Handle, 'move'>, [number, number]> = {
  nw: [0, 0], n: [50, 0], ne: [100, 0], e: [100, 50], se: [100, 100], s: [50, 100], sw: [0, 100], w: [0, 50],
};

export interface CropToolProps {
  figure: PendingFigure;
  pages: readonly PageImage[];
  cropToWebp: CropToWebp;
  onSave(res: CropResult): void | Promise<void>;
  onNeedPages?(): void;
}

/** Page image with the AI's bbox pre-drawn; drag the box or its handles (pointer events: mouse, pen, touch). */
export function CropTool({ figure, pages, cropToWebp, onSave, onNeedPages }: CropToolProps) {
  const first = pages.find((p) => p.n === figure.page) ?? pages[0];
  const [pageN, setPageN] = useState(first?.n ?? figure.page);
  const page = pages.find((p) => p.n === pageN);
  const url = useObjectUrl(page?.blob);
  const [rect, setRect] = useState<Rect | null>(() => (page ? initialRect(figure.bbox, page.w, page.h) : null));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const box = useRef<HTMLDivElement>(null);
  const drag = useRef<{ h: Handle; x: number; y: number; start: Rect } | null>(null);

  useEffect(() => {
    if (page) setRect(initialRect(figure.bbox, page.w, page.h));
  }, [page, figure.bbox]);

  if (!page || !rect) {
    return (
      <div className="stack-label">
        <p className="text-small">
          {pages.length === 0
            ? `This figure is on page ${figure.page} of your paper. Add your pages in step 3 to crop it.`
            : `Page ${figure.page} is not among your pages. Pick another page.`}
        </p>
        {onNeedPages && <Button size="sm" variant="secondary" onClick={onNeedPages}>Add pages</Button>}
        {pages.length > 0 && (
          <SelectField label="Page" value="" onChange={(e) => setPageN(Number(e.target.value))}>
            <option value="" disabled>Choose a page</option>
            {pages.map((p) => <option key={p.n} value={p.n}>Page {p.n}</option>)}
          </SelectField>
        )}
      </div>
    );
  }

  const down = (h: Handle) => (e: RPointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
    drag.current = { h, x: e.clientX, y: e.clientY, start: rect };
  };
  const move = (e: RPointerEvent) => {
    const d = drag.current;
    const el = box.current;
    if (!d || !el) return;
    const k = page.w / el.clientWidth; // screen px -> image px
    setRect(dragRect(d.start, d.h, (e.clientX - d.x) * k, (e.clientY - d.y) * k, { w: page.w, h: page.h }));
  };
  const up = () => { drag.current = null; };
  const pos = rectToPercent(rect, page);

  const save = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await cropToWebp(page.blob, rect);
      await onSave(res);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save the crop.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="stack-card">
      <p className="text-small text-slate">Drag the box over the figure, or pull its handles. Figure: {figure.alt}</p>
      <div ref={box} className="u-crop" data-testid="crop-area" onPointerMove={move} onPointerUp={up} onPointerCancel={up}>
        {url ? <img src={url} alt={`Page ${page.n} of your paper`} width={page.w} height={page.h} /> : <div style={{ aspectRatio: `${page.w} / ${page.h}` }} />}
        <div className="u-crop-box" data-testid="crop-box" style={pos} onPointerDown={down('move')}>
          {HANDLES.map((h) => (
            <span
              key={h}
              aria-hidden="true"
              data-h={h}
              className="u-crop-h"
              style={{ left: `${HANDLE_POS[h as Exclude<Handle, 'move'>][0]}%`, top: `${HANDLE_POS[h as Exclude<Handle, 'move'>][1]}%` }}
              onPointerDown={down(h)}
            />
          ))}
        </div>
      </div>
      <div className="row-actions">
        {pages.length > 1 && (
          <SelectField label="Page" value={String(pageN)} onChange={(e) => setPageN(Number(e.target.value))}>
            {pages.map((p) => <option key={p.n} value={p.n}>Page {p.n}</option>)}
          </SelectField>
        )}
        <Button onClick={() => void save()} loading={busy}>Save crop</Button>
        <Button variant="ghost" onClick={() => setRect(initialRect(figure.bbox, page.w, page.h))}>Reset box</Button>
      </div>
      {error && <p role="alert" className="text-small text-accent-ink">{error}</p>}
    </div>
  );
}
