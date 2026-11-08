import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { createMemoryAttemptStore } from './attemptStore';
import { ExamFlow } from './ExamFlow';
import { loadAnswerMap, loadSampleModel } from './fixtures';
import { newAttempt, type MockAnalysis } from './model';
import { MockResultSummary } from './MockResultSummary';
import type { MockDoc } from '../store';

const model = loadSampleModel();
const answers = loadAnswerMap(model.exam);
const T0 = 1_700_000_000_000;

function setup(opts: { attempts?: ReturnType<typeof createMemoryAttemptStore>; now?: () => number } = {}) {
  const attempts = opts.attempts ?? createMemoryAttemptStore();
  const saved: MockDoc[] = [];
  const onFinished = vi.fn();
  const onNudge = vi.fn();
  const clock = opts.now ?? now;
  const ui = render(
    <MemoryRouter>
      <ExamFlow
        model={model}
        loadAnswers={async () => answers}
        attempts={attempts}
        store={{ putMock: async (_id, d) => void saved.push(d) }}
        candidateName="Asha"
        clock={clock}
        onFinished={onFinished}
        onNudge={onNudge}
        requestFullscreen={() => {}}
      />
    </MemoryRouter>,
  );
  return { attempts, saved, onFinished, onNudge, ...ui };
}

async function start() {
  fireEvent.click(await screen.findByLabelText(/I have read/));
  fireEvent.click(screen.getByRole('button', { name: 'Start' }));
  await screen.findByTestId('exam-screen');
}
const legend = (k: string) => screen.getByTestId(`legend-${k}`).textContent;
const click = (name: string | RegExp) => fireEvent.click(screen.getByRole('button', { name }));

// the clock is injected: tests move `offset`, the component's real 250ms poll picks it up
let offset = 0;
const now = () => T0 + offset;
beforeEach(() => { offset = 0; });

describe('instructions gate', () => {
  it('Start is disabled until the checkbox is ticked', async () => {
    setup();
    const startBtn = await screen.findByRole('button', { name: 'Start' });
    expect(startBtn).toBeDisabled();
    fireEvent.click(screen.getByLabelText(/I have read/));
    expect(startBtn).toBeEnabled();
    expect(screen.getByText(/Marking scheme/)).toBeInTheDocument();
  });
});

describe('palette wiring', () => {
  it('palette click does not save; Save & Next answers; review states', async () => {
    setup();
    await start();
    expect(legend('not_visited')).toBe('8');
    // select A on Q1 then jump to Q3 through the palette: nothing saved
    fireEvent.click(screen.getAllByRole('radio')[0]!);
    click('Question 3, Not Visited');
    expect(legend('answered')).toBe('0');
    click(/Question 1,/);
    expect(screen.getAllByRole('radio')[0]).not.toBeChecked();
    // select + Save & Next
    fireEvent.click(screen.getAllByRole('radio')[0]!);
    click('Save & Next');
    expect(legend('answered')).toBe('1');
    expect(screen.getByText(/Question 2/, { selector: 'b' })).toBeInTheDocument();
    // Mark for review & next without answer -> marked
    click('Mark for Review & Next');
    expect(legend('marked')).toBe('1');
    // back to Q2, answer it and Save & Mark -> answered+marked
    click(/Question 2,/);
    fireEvent.click(screen.getAllByRole('radio')[1]!);
    click('Save & Mark for Review');
    expect(legend('answered_marked')).toBe('1');
    // Clear Response on Q1 reverts it to not answered
    click(/Question 1,/);
    click('Clear Response');
    expect(legend('answered')).toBe('0');
  });

  it('submit confirm shows counts and grades', async () => {
    const { saved, onFinished, onNudge, attempts } = setup();
    await start();
    fireEvent.click(screen.getAllByRole('radio')[0]!);
    click('Save & Next');
    click('Submit');
    const dlg = screen.getByRole('dialog', { name: 'Submit your paper?' });
    expect(within(dlg).getByTestId('sum-answered').textContent).toBe('1');
    expect(within(dlg).getByTestId('sum-not-visited').textContent).toBe('7');
    fireEvent.click(within(dlg).getByRole('button', { name: 'Yes, submit' }));
    await waitFor(() => expect(onFinished).toHaveBeenCalled());
    expect(saved).toHaveLength(1);
    expect(onNudge).toHaveBeenCalledTimes(1);
    expect(saved[0]!.score).toBeTruthy();
    expect(attempts.map.size).toBe(0);
    expect((saved[0]!.analysis as MockAnalysis).submitReason).toBe('manual');
  });
});

describe('numeric keypad', () => {
  it('only the on-screen keypad edits the answer; keyboard is blocked', async () => {
    setup();
    await start();
    click(/Question 3,/);
    const field = screen.getByLabelText('Your answer') as HTMLInputElement;
    expect(field).toHaveAttribute('readonly');
    expect(fireEvent.keyDown(field, { key: '5' })).toBe(false); // preventDefault called
    click('4');
    click('2');
    click('-');
    expect(field.value).toBe('-42');
    click('Backspace');
    expect(field.value).toBe('-4');
    click('Save & Next');
    expect(legend('answered')).toBe('1');
  });
});

describe('timer and auto-submit', () => {
  it('shows a countdown and submits automatically at 00:00', async () => {
    const { saved, onFinished } = setup();
    await start();
    expect(screen.getByRole('timer')).toHaveTextContent('00:22:00');
    offset = 60_000;
    await waitFor(() => expect(screen.getByRole('timer')).toHaveTextContent('00:21:00'));
    offset = 22 * 60_000 + 500;
    await waitFor(() => expect(onFinished).toHaveBeenCalled());
    expect((saved[0]!.analysis as MockAnalysis).submitReason).toBe('auto');
  });
});

describe('resume', () => {
  it('offers Resume, restores state, and the clock kept running', async () => {
    const attempts = createMemoryAttemptStore();
    const first = setup({ attempts });
    await start();
    fireEvent.click(screen.getAllByRole('radio')[2]!);
    click('Save & Next');
    offset = 5 * 60_000;
    first.unmount(); // flushes
    expect(attempts.map.size).toBe(1);

    setup({ attempts });
    fireEvent.click(await screen.findByRole('button', { name: 'Resume attempt' }));
    expect(await screen.findByTestId('exam-screen')).toBeInTheDocument();
    expect(legend('answered')).toBe('1');
    expect(screen.getByText(/Question 2/, { selector: 'b' })).toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole('timer')).toHaveTextContent('00:17:00'));
    click(/Question 1,/);
    expect(screen.getAllByRole('radio')[2]).toBeChecked();
  });

  it('auto-submits on load when time expired while away', async () => {
    const attempts = createMemoryAttemptStore();
    await attempts.put(newAttempt(model, T0 - 60 * 60_000, 'en'));
    const { saved, onFinished } = setup({ attempts });
    await waitFor(() => expect(onFinished).toHaveBeenCalled());
    const a = saved[0]!.analysis as MockAnalysis;
    expect(a.submitReason).toBe('auto');
    expect(a.usedMs).toBe(model.durationMs);
    expect(attempts.map.size).toBe(0);
  });
});

describe('result summary', () => {
  it('renders score, breakdown and the lost-unsaved nudge', async () => {
    const { saved, onFinished } = setup();
    await start();
    fireEvent.click(screen.getAllByRole('radio')[0]!); // unsaved
    click('Next');
    click('Submit');
    fireEvent.click(screen.getByRole('button', { name: 'Yes, submit' }));
    await waitFor(() => expect(onFinished).toHaveBeenCalled());
    render(<MockResultSummary mock={saved[0]!} />);
    expect(screen.getByTestId('score')).toHaveTextContent('0 / 36');
    expect(screen.getByTestId('lost-unsaved')).toHaveTextContent('You lost 1 answer by navigating without saving');
    expect(screen.getByText('Physics')).toBeInTheDocument();
  });
  it('shows Result pending when ungraded', () => {
    const doc = { id: 'x', paperId: 'p', score: null, analysis: { v: 1, pending: true, usedMs: 1, durationMs: 2, submitReason: 'manual', subjectScores: {}, sectionScores: {}, maxBySubject: {}, maxBySection: {}, counts: { answered: 0, answered_marked: 0, correct: 0, wrong: 0, blank: 0, partial: 0 }, lostUnsaved: 0, focusLog: [], questions: [] } } as unknown as MockDoc;
    render(<MockResultSummary mock={doc} />);
    expect(screen.getByTestId('score')).toHaveTextContent('Result pending');
  });
});
