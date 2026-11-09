import { useEffect, useMemo, useState } from 'react';
import type { MasteryDoc } from '@kairos/core';
import { Banner, Button, Columns, EmptyState, LinkButton, Page, PageHeader, PageSkeleton } from '../components/ui';
import { buildPreview, rhoWords } from '../onboarding/preview';
import { useOnboardingProfile } from '../onboarding/useOnboardingProfile';
import { planDate } from '../onboarding/profileModel';
import { loadTaxonomy, type Taxonomy } from '../practice/taxonomy';
import { useStore } from '../store';
import { DEFAULT_ROADMAP, toScheduleConfig, validateRoadmap, type RoadmapConfig } from './model';
import { RoadmapChoice, type RoadmapMode } from './RoadmapChoice';
import { RoadmapForm, SchedulePreview } from './RoadmapForm';
import { customStart, useRoadmap } from './useRoadmap';

/** /roadmap: default (Kairos / admin numbers) or the student's own roadmap, with a live preview. One write per save. */
export function RoadmapPage({ taxonomy, today: todayProp }: { taxonomy?: Taxonomy; today?: string } = {}) {
  const store = useStore();
  const api = useRoadmap();
  const { loading, profile } = useOnboardingProfile();
  const today = todayProp ?? planDate(new Date());
  const [mode, setMode] = useState<RoadmapMode | null>(null);
  const [draft, setDraft] = useState<RoadmapConfig | null>(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [mastery, setMastery] = useState<MasteryDoc | null>(null);
  const [tax, setTax] = useState<Taxonomy | null>(taxonomy ?? null);

  useEffect(() => {
    let live = true;
    store.getState('mastery').then((m) => live && setMastery(m as MasteryDoc | null), () => {});
    if (!taxonomy) loadTaxonomy().then((t) => live && setTax(t), () => {});
    return () => {
      live = false;
    };
  }, [store, taxonomy]);

  const curMode: RoadmapMode = mode ?? api.mode;
  const curDraft: RoadmapConfig = draft ?? customStart(api);
  const { config: clean, errors } = validateRoadmap(curDraft);
  const shown = curMode === 'custom' ? clean : api.mode === 'custom' ? (api.adminDefaults ?? DEFAULT_ROADMAP) : api.config;
  const primary = profile.exams[0];

  const pace = useMemo(() => {
    if (!primary || !tax || !mastery || Object.keys(mastery).length === 0) return null;
    const setup = { exams: profile.exams, ambition: profile.ambition, minutesPerWeekday: profile.minutesPerWeekday, offDay: profile.offDay, chaptersDone: profile.chaptersDone };
    try {
      return buildPreview({ setup, tax, mastery, today, scheduleConfig: toScheduleConfig(shown) });
    } catch {
      return null;
    }
  }, [primary, tax, mastery, profile, today, shown]);

  if (loading || api.loading) return <PageSkeleton width="form" cards={2} cols={1} />;

  async function save() {
    setSaving(true);
    setMsg('');
    try {
      await api.save(curMode, curMode === 'custom' ? clean : undefined);
      setMsg(curMode === 'custom' ? 'Saved. Your plan now follows your roadmap.' : 'Saved. Your plan follows the default roadmap.');
    } catch {
      setMsg('We could not save that. Try again.');
    } finally {
      setSaving(false);
    }
  }

  const side = primary ? (
    <div className="stack gap-section">
      <SchedulePreview config={shown} examDate={primary.date} today={today} minutesPerWeekday={profile.minutesPerWeekday} offDay={profile.offDay} />
      {pace && <p className="text-small text-slate">{rhoWords(pace.bundle.pace.status, pace.bundle.pace.rho)}</p>}
    </div>
  ) : (
    <EmptyState title="Set your exam date first" action={<LinkButton to="/onboarding">Set exam date</LinkButton>}>The preview needs your exam date and weekly time.</EmptyState>
  );

  return (
    <Page>
      <PageHeader title="Your roadmap" subtitle="Choose how Kairos paces you towards exam day." />
      <Columns ratio="main-side" side={side}>
        <div className="stack gap-section">
          <RoadmapChoice value={curMode} onChange={(m) => { setMode(m); setMsg(''); if (m === 'custom' && !draft) setDraft(customStart(api)); }} />
          {curMode === 'custom' && (
            <>
              <div className="row-actions">
                <Button variant="secondary" size="sm" onClick={() => setDraft(DEFAULT_ROADMAP)}>Reset to default</Button>
                {api.adminDefaults && <Button variant="secondary" size="sm" onClick={() => setDraft(api.adminDefaults ?? DEFAULT_ROADMAP)}>Use admin defaults</Button>}
              </div>
              <RoadmapForm value={curDraft} onChange={(c) => { setDraft(c); setMsg(''); }} />
            </>
          )}
          {msg && <Banner role="status">{msg}</Banner>}
          <div className="row-actions">
            <Button loading={saving} disabled={curMode === 'custom' && errors.length > 0} onClick={() => void save()}>Save roadmap</Button>
            <LinkButton to="/plan" variant="ghost">Back to my plan</LinkButton>
          </div>
        </div>
      </Columns>
    </Page>
  );
}
