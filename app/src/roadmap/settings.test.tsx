import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { LocalStore, createMemoryLocalDb } from '../store';
import { Harness } from '../plan/harness.test-util';
import { setConfigEnv } from '../config';
import { Settings } from '../pages/Settings';

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
