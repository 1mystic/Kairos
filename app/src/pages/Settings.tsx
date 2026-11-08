import { useState } from 'react';
import { useAuth } from '../auth/AuthProvider';
import { ThemeToggle } from '../components/ThemeToggle';
import { Modal } from '../components/ui';
import { exportStore } from '../store/exportData';
import { useGuest, useLocalStore, useStore } from '../store/StoreProvider';

export function Settings() {
  const { user } = useAuth();
  const { isGuest, signOutToGuest } = useGuest();
  const store = useStore();
  const local = useLocalStore();
  const [confirm, setConfirm] = useState(false);
  const [msg, setMsg] = useState('');

  async function download() {
    const data = await exportStore(store);
    const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = 'kairos-data.json';
    a.click();
    URL.revokeObjectURL(url);
    setMsg('Your data has been downloaded.');
  }

  return (
    <main className="mx-auto max-w-3xl space-y-6 px-4 py-8">
      <h1 className="text-2xl">Settings</h1>
      <section className="card space-y-3" aria-labelledby="st-h">
        <h2 id="st-h" className="text-lg">Where your progress is stored</h2>
        <p><strong>{store.kind === 'local' ? 'This device' : 'Your account'}</strong></p>
        <p className="text-sm text-slate">
          {store.kind === 'local'
            ? 'Your progress stays in this browser. Clearing browser data or switching device would lose it, so sign in whenever you like to keep it safe.'
            : 'Your progress is saved to your account and is there on any device you sign in on.'}
        </p>
        <div className="flex flex-wrap gap-2">
          <button type="button" className="btn btn-secondary" onClick={() => void download()}>
            {store.kind === 'local' ? 'Export local data (JSON)' : 'Export my data (JSON)'}
          </button>
          {isGuest && <button type="button" className="btn btn-secondary" onClick={() => setConfirm(true)}>Clear local data</button>}
        </div>
        {msg && <p role="status" className="text-sm text-slate">{msg}</p>}
      </section>
      <section className="card flex items-center justify-between gap-3" aria-labelledby="th-h">
        <h2 id="th-h" className="text-lg">Theme</h2>
        <ThemeToggle />
      </section>
      <section className="card space-y-3" aria-labelledby="ac-h">
        <h2 id="ac-h" className="text-lg">Account</h2>
        {user ? (
          <button type="button" className="btn btn-secondary" onClick={() => void signOutToGuest()}>Sign out</button>
        ) : (
          <p className="text-sm text-slate">You are using Kairos as a guest.</p>
        )}
      </section>
      {confirm && (
        <Modal title="Clear all data on this device?" onClose={() => setConfirm(false)} dismissLabel="Keep my data">
          <p className="text-slate">This removes your sessions, mocks and plans from this device. It cannot be undone.</p>
          <div className="flex flex-col gap-2 sm:flex-row-reverse">
            <button type="button" className="btn btn-primary" onClick={() => void local.clearData().then(() => { setConfirm(false); setMsg('Local data cleared.'); })}>Clear data</button>
            <button type="button" className="btn btn-secondary" onClick={() => setConfirm(false)}>Keep my data</button>
          </div>
        </Modal>
      )}
    </main>
  );
}
