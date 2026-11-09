import { ExamCalendar, type ExamCalendar as Calendar } from '@kairos/core';
import { parseRoadmapConfig, type RoadmapConfig } from '../roadmap/model';

/** Remote calendar merged over the bundled one by exam + session (remote wins; bundled fills gaps). Null when the remote doc is unusable. */
export function parseRemoteCalendar(raw: Record<string, unknown> | null, bundled: Calendar): Calendar | null {
  if (!raw || !Array.isArray(raw.entries) || raw.entries.length === 0) return null;
  const r = ExamCalendar.safeParse(raw.entries);
  if (!r.success) return null;
  const key = (e: { exam: string; session: number }) => `${e.exam}#${e.session}`;
  const remote = new Map(r.data.map((e) => [key(e), e]));
  return [...r.data, ...bundled.filter((e) => !remote.has(key(e)))];
}

export interface Announcement {
  active: boolean;
  title: string;
  body: string;
  link: string | null;
  tone: 'info' | 'important';
  /** epoch ms or null */
  expiresAt: number | null;
  /** epoch ms, used as the dismiss key */
  updatedAt: number;
}

export function parseAnnouncement(raw: Record<string, unknown> | null): Announcement | null {
  if (!raw || typeof raw.title !== 'string' || typeof raw.body !== 'string') return null;
  const link = typeof raw.link === 'string' && /^https?:\/\//.test(raw.link) ? raw.link.slice(0, 300) : null;
  return {
    active: raw.active === true,
    title: raw.title.slice(0, 80),
    body: raw.body.slice(0, 400),
    link,
    tone: raw.tone === 'important' ? 'important' : 'info',
    expiresAt: typeof raw.expiresAt === 'number' ? raw.expiresAt : null,
    updatedAt: typeof raw.updatedAt === 'number' ? raw.updatedAt : 0,
  };
}

export const announcementLive = (a: Announcement | null, now: number): a is Announcement =>
  !!a && a.active && a.title.length > 0 && (a.expiresAt === null || a.expiresAt > now);

export const parseRoadmapDefaults = (raw: Record<string, unknown> | null): RoadmapConfig | null => parseRoadmapConfig(raw);
