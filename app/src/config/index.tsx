import { useEffect, useMemo, useState } from 'react';
import type { ExamCalendar } from '@kairos/core';
import { CALENDAR } from '../onboarding/calendarData';
import type { RoadmapConfig } from '../roadmap/model';
import { announcementLive, parseAnnouncement, parseRemoteCalendar, parseRoadmapDefaults, type Announcement } from './parse';
import { cachedConfigDoc, configStamp, isFresh, refreshConfigDoc, subscribeConfig } from './remote';

export * from './parse';
export { CONFIG_CACHE_KEY, CONFIG_TTL_MS, fetchConfigDoc, setConfigEnv } from './remote';

/** Reads the cache synchronously, refreshes in the background when stale, never blocks rendering. */
function useConfig<T>(id: string, parse: (raw: Record<string, unknown> | null) => T | null, enabled = true): { value: T | null; loading: boolean } {
  const [ver, bump] = useState(0);
  const [loading, setLoading] = useState(enabled && !isFresh(id));
  useEffect(() => {
    if (!enabled) return;
    let live = true;
    const off = subscribeConfig(() => live && bump((n) => n + 1));
    if (!isFresh(id)) {
      setLoading(true);
      void refreshConfigDoc(id).then(() => live && setLoading(false));
    } else setLoading(false);
    return () => {
      live = false;
      off();
    };
  }, [id, enabled]);
  const stamp = configStamp(id);
  // eslint-disable-next-line react-hooks/exhaustive-deps -- parse is a module-level function; the stamp/ver identify the cached doc
  const value = useMemo(() => { const raw = cachedConfigDoc(id); return raw === undefined ? null : parse(raw); }, [id, stamp, ver]);
  return { value, loading };
}

export interface ExamCalendarState {
  calendar: ExamCalendar;
  source: 'remote' | 'bundled';
  loading: boolean;
}

/** The exam calendar: admin-published (config/exam_calendar) merged over content/exam_calendar.json. */
export function useExamCalendar(): ExamCalendarState {
  const { value, loading } = useConfig('exam_calendar', (raw) => parseRemoteCalendar(raw, CALENDAR));
  return useMemo(() => ({ calendar: value ?? CALENDAR, source: value ? 'remote' : 'bundled', loading }), [value, loading]);
}

export function useAnnouncement(now: number = Date.now()): { announcement: Announcement | null; live: Announcement | null; loading: boolean } {
  const { value, loading } = useConfig('announcement', parseAnnouncement);
  return { announcement: value, live: announcementLive(value, now) ? value : null, loading };
}

export function useRoadmapDefaults(): { defaults: RoadmapConfig | null; loading: boolean } {
  const { value, loading } = useConfig('roadmap_defaults', parseRoadmapDefaults);
  return { defaults: value, loading };
}
