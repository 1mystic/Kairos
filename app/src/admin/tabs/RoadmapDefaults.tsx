import { useEffect, useState } from 'react';
import { Button, Columns, Section, Skeleton } from '../../components/ui';
import { StatusBanner } from '../Status';
import { addDays } from '@kairos/core';
import { DEFAULT_ROADMAP, parseRoadmapConfig, toDefaultsDoc, validateRoadmap, type RoadmapConfig } from '../../roadmap/model';
import { RoadmapForm, SchedulePreview } from '../../roadmap/RoadmapForm';
import { useAdminData } from '../data';

/** Defaults every student without a custom roadmap follows. Preview: a sample student, 120 days out, 2 h a day. */
export function RoadmapDefaultsTab({ uid, today }: { uid: string; today: string }) {
  const data = useAdminData();
  const [cfg, setCfg] = useState<RoadmapConfig | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  useEffect(() => {
    let live = true;
    data.getConfig('roadmap_defaults').then((r) => live && setCfg(parseRoadmapConfig(r) ?? DEFAULT_ROADMAP), () => live && setCfg(DEFAULT_ROADMAP));
    return () => {
      live = false;
    };
  }, [data]);
  if (!cfg) return <Skeleton className="h-s8 w-full" />;
  const { config, errors } = validateRoadmap(cfg);

  async function publish() {
    setBusy(true);
    setErr('');
    try {
      await data.publishConfig('roadmap_defaults', toDefaultsDoc(config), uid);
      setMsg('Published. Students on the default roadmap get these numbers on their next open.');
    } catch {
      setErr('Publishing failed. Check your connection and that you are signed in as an admin.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Section title="Roadmap defaults">
      <Columns ratio="main-side" side={<SchedulePreview config={config} today={today} examDate={addDays(today, 120)} note="Sample student: exam in 120 days, 2 hours a day." />}>
        <div className="stack gap-section">
          <div className="row-actions"><Button variant="secondary" size="sm" onClick={() => { setCfg(DEFAULT_ROADMAP); setMsg(''); }}>Reset to core defaults</Button></div>
          <RoadmapForm value={cfg} onChange={(c) => { setCfg(c); setMsg(''); }} />
          {msg && <StatusBanner ok>{msg}</StatusBanner>}
          {err && <StatusBanner ok={false}>{err}</StatusBanner>}
          <div><Button loading={busy} disabled={errors.length > 0} onClick={() => void publish()}>Publish defaults</Button></div>
        </div>
      </Columns>
    </Section>
  );
}
