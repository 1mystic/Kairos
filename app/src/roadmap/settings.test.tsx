import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { LocalStore, createMemoryLocalDb } from '../store';
import { Harness } from '../plan/harness.test-util';
import { setConfigEnv } from '../config';
import { Settings } from '../pages/Settings';
import { MemoryRouter } from 'react-router';
import { AuthContext } from '../auth/AuthProvider';
import { authValue } from '../plan/harness.test-util';
import { StoreProvider } from '../store';
import { createMemoryKv } from '../store/bankDb';
import { fakeFs } from '../store/testUtils';

describe('Settings > Exam and plan', () => {
  it('shows exam, date source (toggle rewrites .N <-> .0) and roadmap rows; lists the telemetry note', async () => {
    setConfigEnv({ fetchDoc: async () => null, storage: null });
    const db = createMemoryLocalDb();
    await new LocalStore(db).saveProfile({ kind: 'guest', displayName: 'G', createdAt: 1, exam: 'JEE_MAIN.1', examDate: '2027-01-22', onboarded: true });
    render(<Harness localDb={db}><Settings /></Harness>);
    await userEvent.click(screen.getByRole('button', { name: 'Exam and plan' }));
    expect(await screen.findByText(/JEE Main.*22 Jan 2027/)).toBeInTheDocument();
    expect(screen.getByText(/Follows the official calendar/)).toBeInTheDocument();
    expect(screen.getByText(/Default: follows the exam calendar/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Edit roadmap' })).toHaveAttribute('href', '/roadmap');
    await userEvent.click(screen.getByRole('button', { name: 'Use my own date' }));
    await waitFor(async () => expect(await new LocalStore(db).getProfile()).toMatchObject({ exam: 'JEE_MAIN.0', examDate: '2027-01-22' }));
    await userEvent.click(screen.getByRole('button', { name: 'About' }));
    expect(screen.getByText(/We count anonymous totals like sessions per day/)).toBeInTheDocument();
  });
});

describe('Settings > account and data', () => {
  it('Clear local data also empties the guest question bank', async () => {
    setConfigEnv({ fetchDoc: async () => null, storage: null });
    localStorage.setItem('kairos-guest', '1');
    const kv = createMemoryKv();
    await kv.put('questions', 'u_000000000001', { id: 'u_000000000001' });
    render(
      <AuthContext.Provider value={authValue(null)}>
        <StoreProvider localDb={createMemoryLocalDb()} bankDb={kv}><MemoryRouter><Settings /></MemoryRouter></StoreProvider>
      </AuthContext.Provider>,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Storage and data' }));
    await userEvent.click(screen.getByRole('button', { name: 'Clear local data' }));
    expect(screen.getByText(/uploaded questions/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Clear data' }));
    await waitFor(async () => expect(await kv.getAll('questions')).toHaveLength(0));
  });

  it('signed-in users can rename themselves (trimmed, 1 to 80 chars) through saveProfile({displayName})', async () => {
    setConfigEnv({ fetchDoc: async () => null, storage: null });
    const f = fakeFs({ 'users/u1': { displayName: 'Asha' } });
    render(
      <AuthContext.Provider value={authValue('u1')}>
        <StoreProvider localDb={createMemoryLocalDb()} fsAdapter={f.adapter} bankDb={createMemoryKv()}><MemoryRouter><Settings /></MemoryRouter></StoreProvider>
      </AuthContext.Provider>,
    );
    const box = await screen.findByLabelText('Display name');
    await userEvent.clear(box);
    await userEvent.type(box, '   Asha K  ');
    await userEvent.click(screen.getByRole('button', { name: 'Save name' }));
    await waitFor(() => expect(f.docs.get('users/u1')).toMatchObject({ displayName: 'Asha K' }));
    await userEvent.clear(box);
    await userEvent.click(screen.getByRole('button', { name: 'Save name' }));
    expect(await screen.findByText('Use 1 to 80 characters.')).toBeInTheDocument();
  });
});
