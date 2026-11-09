/** Readable labels for CBT subjects, sections and marks. Pure, no React. */
import type { Blueprint } from '@kairos/core';

const SUBJECT_TITLES: Record<string, string> = { GA: 'General Aptitude', DA: 'Technical' };
const TYPE_NAMES: Record<string, string> = { SCQ: 'MCQ', MSQ: 'MSQ', NVQ: 'NAT', INT: 'Integer' };

/** Tab / palette heading for a blueprint subject code. Unknown codes (PHY, CHE, ...) stay as they are. */
export const subjectTitle = (code: string): string => SUBJECT_TITLES[code] ?? code;

export const typeName = (type: string): string => TYPE_NAMES[type] ?? type;

const MINUS = '−';

/** Marks as text: integers and 1-decimal values as-is, thirds as -1/3, -2/3 (any other value up to 2 decimals). */
export function fmtMarks(n: number): string {
  if (Number.isInteger(n)) return String(n);
  const sign = n < 0 ? MINUS : '';
  const a = Math.abs(n);
  const k = Math.round(a * 3);
  if (k > 0 && Math.abs(a * 3 - k) < 0.001) return `${sign}${k}/3`;
  return `${sign}${String(Number(a.toFixed(2)))}`;
}

/** "No negative marking" for a wrong answer worth 0. */
export const wrongText = (wrong: number): string => (wrong === 0 ? 'No negative marking' : fmtMarks(wrong));

interface SecLike {
  sectionId: string;
  type: string;
  marks: { correct: number };
}

/**
 * Section heading. Single-letter ids keep the classic "Section A". Other ids (GATE: GA1, T1M-MCQ)
 * read as "1 mark" for General Aptitude and "1 mark · NAT" for technical sections.
 */
export function sectionTitle(subject: string, s: SecLike): string {
  if (/^[A-Z]$/.test(s.sectionId)) return `Section ${s.sectionId}`;
  const m = `${fmtMarks(s.marks.correct)} mark${s.marks.correct === 1 ? '' : 's'}`;
  return subject === 'GA' ? m : `${m} · ${typeName(s.type)}`;
}

/** Full label with the subject, e.g. "General Aptitude · 1 mark", "Technical · 2 marks · NAT". */
export function sectionFullLabel(subject: string, s: SecLike): string {
  return /^[A-Z]$/.test(s.sectionId) ? `${subject} - Section ${s.sectionId}` : `${subjectTitle(subject)} · ${sectionTitle(subject, s)}`;
}

/** Optional blueprint flag `calculator: true` (the schema is loose). Defaults to false. */
export const wantsCalculator = (bp: Blueprint | undefined): boolean =>
  !!bp && (bp as unknown as { calculator?: unknown }).calculator === true;
