import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import type { UserQuestion } from '@kairos/core';
import { BankContext } from '../store/bankHooks';
import { createMemoryKv } from '../store/bankDb';
import { LocalBankStore } from '../store/bankLocal';
import { REPLY } from './fixtures';
import type { CropToWebp } from './crop';
import type { Rasterizer } from './pages';
import { Wizard } from './Wizard';

const rasterizer: Rasterizer = {
  async image(f) { return { blob: new Blob(['x']), thumb: new Blob(['t']), w: 1200, h: 1600, source: f.name }; },
  async pdf() { throw new Error('no pdf in jsdom'); },
};
const cropToWebp: CropToWebp = async () => ({ bytes: new Uint8Array([82, 73, 70, 70, 1, 2, 3]), w: 400, h: 300 });

function setup(store = new LocalBankStore(createMemoryKv())) {
  const user = userEvent.setup();
  render(
    <MemoryRouter>
      <BankContext.Provider value={{ store, isGuest: true }}>
        <Wizard pagesKv={createMemoryKv()} rasterizer={rasterizer} cropToWebp={cropToWebp} />
      </BankContext.Provider>
    </MemoryRouter>,
  );
  return { user, store };
}

async function toPaste(user: ReturnType<typeof userEvent.setup>, withPage = true) {
  await user.click(screen.getByRole('button', { name: /JEE Main/ }));
  await user.click(screen.getByRole('button', { name: /Next/ }));
  expect(screen.getByRole('heading', { name: /Copy the prompt for JEE Main/ })).toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: /Next/ }));
  if (withPage) {
    await user.upload(screen.getByLabelText('Choose PDF or image files'), new File(['x'], 'p1.png', { type: 'image/png' }));
    await screen.findByText('Page 1', { selector: 'img' }).catch(() => null);
    await waitFor(() => expect(screen.getByText(/1 page/)).toBeInTheDocument());
  }
  await user.click(screen.getByRole('button', { name: /Next|Skip/ }));
  const box = screen.getByLabelText('AI reply');
  await user.click(box);
  await user.paste(REPLY);
}

describe('upload wizard', () => {
  beforeAll(() => { window.scrollTo = vi.fn(); });

  // Real PDF rendering needs canvas + the pdf.js worker, neither exists in jsdom: verified manually in a browser only.
  it.skip('renders PDF pages with pdf.js (browser only)', () => {});

  it('goes from paste to review, fixes problems, crops a figure and saves', async () => {
    const { user, store } = setup();
    await toPaste(user);
    await user.click(screen.getByRole('button', { name: 'Check my questions' }));
    expect((await screen.findByTestId('summary')).textContent).toBe('2 ready · 1 needs an answer · 2 have a problem');

    // editor: choose a chapter for Q4 -> re-validated after the debounce
    const q4 = screen.getByRole('article', { name: 'Question 4' });
    await user.click(within(q4).getByRole('button', { name: 'Edit' }));
    await user.selectOptions(within(q4).getByLabelText('Chapter'), 'PHY.LOM');
    await waitFor(() => expect(screen.getByTestId('summary').textContent).toBe('3 ready · 1 needs an answer · 1 has a problem'));

    // save is blocked while a selected question has an error
    await user.click(within(q4).getByLabelText('Select question 4'));
    const q2 = screen.getByRole('article', { name: 'Question 2' });
    await user.click(within(q2).getByLabelText('Select question 2'));
    expect(screen.getByRole('button', { name: /Save/ })).toBeDisabled();

    // crop figure 1 of Q2 using the injected cropper
    await user.click(within(q2).getByRole('button', { name: 'Crop figure 1' }));
    await user.click(within(q2).getByRole('button', { name: 'Save crop' }));
    await waitFor(() => expect(screen.getByTestId('summary').textContent).toBe('4 ready · 1 needs an answer'));
    expect(within(q2).queryByRole('button', { name: 'Crop figure 1' })).toBeNull();

    await user.click(screen.getByRole('button', { name: 'Accept all that are ok' }));
    await user.click(screen.getByRole('button', { name: /Save 5 to my bank/ }));
    expect(await screen.findByText(/Saved 5 questions to your bank/)).toBeInTheDocument();
    expect(screen.getByText(/Saved on this device/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Sign in' })).toHaveAttribute('href', '/signin');

    const saved = await store.listQuestions();
    expect(saved).toHaveLength(5);
    expect(saved.filter((q) => q.status === 'needs_answer')).toHaveLength(1);
    const withFig = saved.find((q) => q.n === 2)!;
    expect(withFig.images).toHaveLength(1);
    expect(withFig.stem).toContain(`img:${withFig.images[0]!.id}`);
    expect(await store.getMedia(withFig.images[0]!.id)).toMatch(/^data:image\/webp;base64,/);
  });

  it('shows a plain-language hint for a truncated reply', async () => {
    const { user } = setup();
    await toPaste(user, false);
    const box = screen.getByLabelText('AI reply') as HTMLTextAreaElement;
    await user.clear(box);
    await user.click(box);
    await user.paste(REPLY.slice(0, REPLY.indexOf('"n": 3')));
    await user.click(screen.getByRole('button', { name: 'Check my questions' }));
    expect(await screen.findByText(/The reply was cut off/)).toBeInTheDocument();
    expect(screen.getByText(/Block 1, line \d+, col \d+/)).toBeInTheDocument();
  });

  it('blocks saving past the daily cap and shows what is left', async () => {
    const store = new LocalBankStore(createMemoryKv());
    const filler = Array.from({ length: 298 }, (_, i) => ({
      id: 'u_' + String(i).padStart(12, '0'), type: 'SCQ', stem: 's' + i, options: [{ key: 'A', text: 'a' }, { key: 'B', text: 'b' }],
      answer: { keys: ['A'] }, solution: null, solution_source: 'user', tax: { subject: 'PHY', chapter: 'PHY.ROT' }, appearances: [],
      source: { kind: 'user' }, images: [], status: 'user_ok', n: i, confidence: 'high', exam: 'JEE_MAIN', created_at: Date.now(), pending_figures: [],
    })) as UserQuestion[];
    await store.putQuestions(filler);
    const { user } = setup(store);
    await toPaste(user, false);
    await user.click(screen.getByRole('button', { name: 'Check my questions' }));
    await screen.findByTestId('summary');
    await user.click(screen.getByRole('button', { name: /Save 3 to my bank/ }));
    expect(await screen.findByText(/At most 300 new questions per day/)).toBeInTheDocument();
    expect(screen.getByText(/Remaining: 1702 questions/)).toBeInTheDocument();
    expect(await store.listQuestions()).toHaveLength(298);
  });
});
