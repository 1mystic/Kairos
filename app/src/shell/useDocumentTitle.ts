import { useEffect } from 'react';

export const SITE_NAME = 'Kairos';

/** Sets `document.title` to "<title> | Kairos" while the calling page is mounted (restores the previous title after). */
export function useDocumentTitle(title: string | null | undefined): void {
  useEffect(() => {
    if (!title) return;
    const prev = document.title;
    document.title = `${title} | ${SITE_NAME}`;
    return () => { document.title = prev; };
  }, [title]);
}
