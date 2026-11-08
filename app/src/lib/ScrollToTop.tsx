import { useEffect } from 'react';
import { useLocation } from 'react-router';

/** Opens every new page at its top. Hash links (e.g. /privacy#contact) scroll to their anchor instead. */
export function ScrollToTop() {
  const { pathname, hash } = useLocation();
  useEffect(() => {
    if (hash) {
      document.getElementById(hash.slice(1))?.scrollIntoView();
      return;
    }
    if (typeof window.scrollTo === 'function') window.scrollTo(0, 0);
  }, [pathname, hash]);
  return null;
}
