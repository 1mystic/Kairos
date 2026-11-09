import { useEffect, useState } from 'react';
import { AnnouncementView } from '../../config/AnnouncementBanner';
import { Button, Card, Field, Section, SelectField, Skeleton, TextareaField } from '../../components/ui';
import { StatusBanner } from '../Status';
import { useAdminData } from '../data';

export interface AnnouncementDraft { active: boolean; title: string; body: string; link: string; tone: 'info' | 'important'; /** YYYY-MM-DD or '' */ expiry: string }
export const EMPTY_ANNOUNCEMENT: AnnouncementDraft = { active: false, title: '', body: '', link: '', tone: 'info', expiry: '' };

export function announcementErrors(d: AnnouncementDraft): { title?: string; body?: string; link?: string; expiry?: string } {
  const e: { title?: string; body?: string; link?: string; expiry?: string } = {};
  if (d.title.length > 80) e.title = 'Up to 80 characters.';
  else if (d.active && !d.title.trim()) e.title = 'A live announcement needs a title.';
  if (d.body.length > 400) e.body = 'Up to 400 characters.';
  if (d.link && (!/^https?:\/\//.test(d.link) || d.link.length > 300)) e.link = 'Start with http:// or https://, up to 300 characters.';
  if (d.expiry && Number.isNaN(Date.parse(`${d.expiry}T23:59:59`))) e.expiry = 'Not a valid date.';
  return e;
}

/** The contract document (server fields are added by stampDoc). Expiry = end of that day, local time. */
export function buildAnnouncementDoc(d: AnnouncementDraft): { active: boolean; title: string; body: string; link: string | null; tone: 'info' | 'important'; expiresAt: Date | null } {
  return { active: d.active, title: d.title.trim(), body: d.body.trim(), link: d.link.trim() || null, tone: d.tone, expiresAt: d.expiry ? new Date(`${d.expiry}T23:59:59`) : null };
}

const toDraft = (raw: Record<string, unknown> | null): AnnouncementDraft => {
  if (!raw) return EMPTY_ANNOUNCEMENT;
  const exp = typeof raw.expiresAt === 'number' ? new Date(raw.expiresAt) : null;
  const p = (n: number) => String(n).padStart(2, '0');
  return {
    active: raw.active === true,
    title: typeof raw.title === 'string' ? raw.title : '',
    body: typeof raw.body === 'string' ? raw.body : '',
    link: typeof raw.link === 'string' ? raw.link : '',
    tone: raw.tone === 'important' ? 'important' : 'info',
    expiry: exp ? `${exp.getFullYear()}-${p(exp.getMonth() + 1)}-${p(exp.getDate())}` : '',
  };
};

export function AnnouncementTab({ uid }: { uid: string }) {
  const data = useAdminData();
  const [d, setD] = useState<AnnouncementDraft | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  useEffect(() => {
    let live = true;
    data.getConfig('announcement').then((r) => live && setD(toDraft(r)), () => live && setD(EMPTY_ANNOUNCEMENT));
    return () => {
      live = false;
    };
  }, [data]);
  if (!d) return <Skeleton className="h-s8 w-full" />;
  const errs = announcementErrors(d);
  const bad = Object.keys(errs).length > 0;
  const set = (p: Partial<AnnouncementDraft>) => { setD({ ...d, ...p }); setMsg(''); };

  async function publish(next: AnnouncementDraft) {
    setBusy(true);
    setErr('');
    try {
      await data.publishConfig('announcement', buildAnnouncementDoc(next), uid);
      setD(next);
      setMsg(next.active ? 'Published. Users see it on Home.' : 'Cleared. Users no longer see an announcement.');
    } catch {
      setErr('Publishing failed. Check your connection and that you are signed in as an admin.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="stack gap-section">
      <Section title="Announcement">
        <Card>
          <div className="stack gap-base">
            <label className="row gap-tight">
              <input type="checkbox" checked={d.active} onChange={(e) => set({ active: e.target.checked })} />
              <span className="text-body font-semibold">Show this announcement on Home</span>
            </label>
            <Field label="Title" value={d.title} maxLength={80} error={errs.title} onChange={(e) => set({ title: e.target.value })} />
            <TextareaField label="Message" value={d.body} maxLength={400} rows={4} error={errs.body} hint={`${d.body.length} of 400 characters`} onChange={(e) => set({ body: e.target.value })} />
            <Field label="Link (optional)" value={d.link} error={errs.link} onChange={(e) => set({ link: e.target.value })} />
            <SelectField label="Tone" value={d.tone} onChange={(e) => set({ tone: e.target.value as AnnouncementDraft['tone'] })}>
              <option value="info">Info</option>
              <option value="important">Important</option>
            </SelectField>
            <Field label="Hide after (optional)" type="date" value={d.expiry} error={errs.expiry} hint="The announcement disappears at the end of this day." onChange={(e) => set({ expiry: e.target.value })} />
          </div>
        </Card>
        {msg && <StatusBanner ok>{msg}</StatusBanner>}
        {err && <StatusBanner ok={false}>{err}</StatusBanner>}
        <div className="row-actions">
          <Button loading={busy} disabled={bad} onClick={() => void publish(d)}>Publish</Button>
          <Button variant="secondary" disabled={busy} onClick={() => void publish({ ...d, active: false })}>Clear announcement</Button>
        </div>
      </Section>
      <Section title="Preview">
        {d.title ? <AnnouncementView a={{ title: d.title, body: d.body, link: d.link || null, tone: d.tone }} /> : <p className="text-slate">Type a title to see how it looks on Home.</p>}
      </Section>
    </div>
  );
}
