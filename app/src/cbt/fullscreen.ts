/** Fullscreen helpers with webkit fallbacks. Every call is safe to make when unsupported or refused. */
type FsDoc = Document & { webkitFullscreenElement?: Element | null; webkitExitFullscreen?: () => Promise<void> | void };
type FsEl = HTMLElement & { webkitRequestFullscreen?: () => Promise<void> | void };

export function isFullscreen(doc: Document = document): boolean {
  const d = doc as FsDoc;
  return !!(d.fullscreenElement ?? d.webkitFullscreenElement);
}

const swallow = (r: unknown) => {
  if (r && typeof (r as Promise<void>).catch === 'function') void (r as Promise<void>).catch(() => {});
};

export function enterFullscreen(): void {
  try {
    const el = document.documentElement as FsEl;
    swallow(el.requestFullscreen ? el.requestFullscreen() : el.webkitRequestFullscreen?.());
  } catch {
    /* denied: fine */
  }
}

/** Leave fullscreen if we are in it. Never throws, never re-enters. */
export function exitFullscreen(): void {
  try {
    if (!isFullscreen()) return;
    const d = document as FsDoc;
    if (typeof d.exitFullscreen === 'function') swallow(d.exitFullscreen());
    else swallow(d.webkitExitFullscreen?.());
  } catch {
    /* ignore */
  }
}
