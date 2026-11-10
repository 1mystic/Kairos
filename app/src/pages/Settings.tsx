import { useEffect, useState } from 'react';
import { useAuth } from '../auth/AuthProvider';
import { CheckIcon } from '../components/icons';
import { ThemeToggle } from '../components/ThemeToggle';
import { Button, Chip, Input, LinkButton, Modal, Page, PageHeader, SettingRow, SettingsSection, StickySideNav, TwoColumnPage, type SideNavItem } from '../components/ui';
import { useIsAdmin } from '../admin/useIsAdmin';
import { ExamPlanRows } from '../roadmap/ExamPlanSettings';
import { exportStore } from '../store/exportData';
import { useClearLocalData, useGuest, useLocalStore, useMigration, useStore } from '../store/StoreProvider';

const SECTIONS: SideNavItem[] = [
  { id: 'account', label: 'Account' },
  { id: 'plan', label: 'Exam and plan' },
  { id: 'appearance', label: 'Appearance' },
  { id: 'data', label: 'Storage and data' },
  { id: 'notifications', label: 'Notifications', soon: true },
  { id: 'about', label: 'About' },
];

export function Settings() {
  const { user, profile } = useAuth();
  const [tab, setTab] = useState('account');
  const { isGuest, signOutToGuest } = useGuest();
  const store = useStore();
  const local = useLocalStore();
  const clearLocalData = useClearLocalData();
  const [confirm, setConfirm] = useState(false);
  const [msg, setMsg] = useState('');
  const isAdmin = useIsAdmin();
  const { migration, retry } = useMigration();
  const [pending, setPending] = useState(false);
  const uid = user?.uid;
  const [name, setName] = useState('');
  const [nameMsg, setNameMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [savingName, setSavingName] = useState(false);
  const shownName = profile?.displayName ?? '';
  useEffect(() => { setName(shownName); }, [shownName]);
  // signed in, this device still holds progress that was never added to the account (the prompt was postponed)
  useEffect(() => {
    let live = true;
    if (!uid || migration.phase !== 'idle') { setPending(false); return; }
    void Promise.all([local.hasData(), local.getMeta()]).then(([has, meta]) => { if (live) setPending(has && meta.migratedTo !== uid); }).catch(() => { if (live) setPending(false); });
    return () => { live = false; };
  }, [uid, migration.phase, local]);

  async function saveName() {
    const v = name.trim();
    if (v.length < 1 || v.length > 80) { setNameMsg({ ok: false, text: 'Use 1 to 80 characters.' }); return; }
    if (v === shownName) { setNameMsg(null); return; }
    setSavingName(true);
    setNameMsg(null);
    try {
      await store.saveProfile({ displayName: v }); // the cloud store mirrors the write into the in-memory profile
      setNameMsg({ ok: true, text: 'Name saved.' });
    } catch {
      setNameMsg({ ok: false, text: 'We could not save your name. Check your connection and try again.' });
    } finally {
      setSavingName(false);
    }
  }

  async function download() {
    try {
      const data = await exportStore(store);
      const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = 'kairos-data.json';
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 10_000); // revoking at once cancels the download in some browsers
      setMsg('Your data has been downloaded.');
    } catch {
      setMsg('We could not prepare the download. Check your connection and try again.');
    }
  }

  return (
    <Page>
      <PageHeader title="Settings" subtitle="Your account, look and data." />
      <TwoColumnPage nav={<StickySideNav label="Settings sections" items={SECTIONS} active={tab} onSelect={setTab} />}>
        <SettingsSection id="account" title="Account" description="Who you are on Kairos." active={tab === 'account'}>
          {user ? (
            <SettingRow label="Name" description="Shown on Home and in your account menu.">
              <form className="row-inline" onSubmit={(e) => { e.preventDefault(); void saveName(); }}>
                <Input aria-label="Display name" value={name} maxLength={80} autoComplete="name" invalid={nameMsg?.ok === false} onChange={(e) => { setName(e.target.value); setNameMsg(null); }} />
                <Button type="submit" variant="secondary" loading={savingName} disabled={name.trim() === shownName}>Save name</Button>
              </form>
              {nameMsg && <p role={nameMsg.ok ? 'status' : 'alert'} className={`text-small ${nameMsg.ok ? 'text-status-good' : 'text-status-bad'}`}>{nameMsg.text}</p>}
            </SettingRow>
          ) : (
            <SettingRow label="Name" description="Guest" />
          )}
          <SettingRow label="Email" description={user?.email ?? 'No email: you are using Kairos as a guest.'} />
          {user ? (
            <SettingRow label="Sign out" description="You can keep practising as a guest afterwards.">
              <Button variant="secondary" onClick={() => void signOutToGuest()}>Sign out</Button>
            </SettingRow>
          ) : (
            <SettingRow label="Save your progress" description="Create an account to keep it safe and reach it from any device.">
              <LinkButton to="/signup">Create account</LinkButton>
            </SettingRow>
          )}
        </SettingsSection>

        <SettingsSection id="plan" title="Exam and plan" description="Your exams, their dates and how Kairos paces you." active={tab === 'plan'}>
          <ExamPlanRows />
        </SettingsSection>

        <SettingsSection id="appearance" title="Appearance" description="Kairos works in light and dark." active={tab === 'appearance'}>
          <SettingRow label="Theme" description="Dark is easier on the eyes at night."><ThemeToggle /></SettingRow>
        </SettingsSection>

        <SettingsSection id="data" title="Storage and data" description="Where your progress lives." active={tab === 'data'}>
          <SettingRow
            label="Stored on"
            description={store.kind === 'local'
              ? 'Your progress stays in this browser. Clearing browser data or switching device would lose it, so sign in whenever you like to keep it safe.'
              : 'Your progress is saved to your account and is there on any device you sign in on.'}
          >
            <Chip tone="primary">{store.kind === 'local' ? 'This device' : 'Your account'}</Chip>
          </SettingRow>
          <SettingRow label="Export" description="Download everything we hold for you as a JSON file.">
            <Button variant="secondary" onClick={() => void download()}>
              {store.kind === 'local' ? 'Export local data (JSON)' : 'Export my data (JSON)'}
            </Button>
          </SettingRow>
          {user && pending && (
            <SettingRow label="Add this device's progress to your account" description="This device has practice you did before signing in. Add it so it is saved with your account.">
              <Button variant="secondary" onClick={retry}>Add progress</Button>
            </SettingRow>
          )}
          {isGuest && (
            <SettingRow label="Clear local data" description="Removes sessions, mocks, plans and your uploaded questions (with their images) from this device.">
              <Button variant="danger-ghost" onClick={() => setConfirm(true)}>Clear local data</Button>
            </SettingRow>
          )}
          {msg && <p role="status" className="row-inline text-small text-status-good"><CheckIcon width={16} height={16} className="shrink-0" />{msg}</p>}
        </SettingsSection>

        <SettingsSection id="notifications" title="Notifications" description="Daily reminders are not built yet." active={tab === 'notifications'}>
          <SettingRow label="Daily reminder" description="A nudge at the time you choose."><Chip>soon</Chip></SettingRow>
        </SettingsSection>

        <SettingsSection id="about" title="About" active={tab === 'about'}>
          <SettingRow label="Kairos" description="The right question, at the right time." />
          <SettingRow label="Anonymous totals" description="We count anonymous totals like sessions per day to improve Kairos. No individual attempts are shared." />
          {isAdmin && (
            <SettingRow label="Kairos admin" description="Exam dates, announcements and app insights.">
              <LinkButton to="/admin" variant="secondary" size="sm">Open admin console</LinkButton>
            </SettingRow>
          )}
          <SettingRow label="Legal" description="Drafts, to be reviewed before launch.">
            <LinkButton to="/privacy" variant="ghost" size="sm">Privacy</LinkButton>
            <LinkButton to="/terms" variant="ghost" size="sm">Terms</LinkButton>
          </SettingRow>
        </SettingsSection>
      </TwoColumnPage>
      {confirm && (
        <Modal title="Clear all data on this device?" onClose={() => setConfirm(false)} dismissLabel="Keep my data">
          <p className="text-slate">This removes your sessions, mocks, plans and uploaded questions (with their images) from this device.</p>
          <p className="text-status-bad">It cannot be undone.</p>
          <div className="row-actions justify-end">
            <Button variant="secondary" onClick={() => setConfirm(false)}>Keep my data</Button>
            <Button variant="danger" onClick={() => void clearLocalData().then(() => { setConfirm(false); setMsg('Local data cleared.'); }, () => { setConfirm(false); setMsg('We could not clear local data. Try again.'); })}>Clear data</Button>
          </div>
        </Modal>
      )}
    </Page>
  );
}
