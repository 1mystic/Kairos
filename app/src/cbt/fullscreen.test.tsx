import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createMemoryAttemptStore } from './attemptStore';
import { ExamFlow } from './ExamFlow';
import { loadAnswerMap, loadSampleModel } from './fixtures';
import { exitFullscreen } from './fullscreen';

const model = loadSampleModel();
const answers = loadAnswerMap(model.exam);
const exitSpy = vi.fn(() => Promise.resolve());
let fsEl: Element | null = null;

beforeEach(() => {
  fsEl = document.documentElement;
  exitSpy.mockClear();
  Object.defineProperty(document, 'fullscreenElement', { configurable: true, get: () => fsEl });
  Object.defineProperty(document, 'exitFullscreen', { configurable: true, writable: true, value: exitSpy });
});
afterEach(() => {
  delete (document as unknown as Record<string, unknown>).fullscreenElement;
  delete (document as unknown as Record<string, unknown>).exitFullscreen;
});

function mount() {
  return render(
    <MemoryRouter>
      <ExamFlow
        model={model}
        loadAnswers={async () => answers}
        attempts={createMemoryAttemptStore()}
        store={{ putMock: async () => {} }}
        candidateName="Asha"
        onFinished={vi.fn()}
        requestFullscreen={() => {}}
      />
    </MemoryRouter>,
  );
}
async function start() {
  fireEvent.click(await screen.findByLabelText(/I have read/));
  fireEvent.click(screen.getByRole('button', { name: 'Start' }));
  await screen.findByTestId('exam-screen');
}

describe('exitFullscreen helper', () => {
  it('exits when in fullscreen, no-ops otherwise, never throws', () => {
    exitFullscreen();
    expect(exitSpy).toHaveBeenCalledTimes(1);
    fsEl = null;
    exitFullscreen();
    expect(exitSpy).toHaveBeenCalledTimes(1);
    fsEl = document.documentElement;
    exitSpy.mockImplementationOnce(() => Promise.reject(new Error('no')));
    expect(() => exitFullscreen()).not.toThrow();
  });
  it('falls back to the webkit prefix', () => {
    const wk = vi.fn();
    Object.defineProperty(document, 'exitFullscreen', { configurable: true, value: undefined });
    (document as unknown as Record<string, unknown>).webkitExitFullscreen = wk;
    exitFullscreen();
    expect(wk).toHaveBeenCalled();
    delete (document as unknown as Record<string, unknown>).webkitExitFullscreen;
  });
});

describe('exam flow and full screen', () => {
  it('exits full screen when the exam is submitted', async () => {
    mount();
    await start();
    fireEvent.click(screen.getByRole('button', { name: 'Submit' }));
    fireEvent.click(screen.getByRole('button', { name: 'Yes, submit' }));
    await waitFor(() => expect(exitSpy).toHaveBeenCalled());
  });

  it('exits full screen when leaving the exam route mid-exam', async () => {
    const ui = mount();
    await start();
    exitSpy.mockClear();
    ui.unmount();
    expect(exitSpy).toHaveBeenCalled();
  });

  it('Esc out of full screen keeps the exam running and offers a way back', async () => {
    mount();
    await start();
    expect(screen.queryByText(/You left full screen/)).toBeNull();
    fsEl = null;
    act(() => void document.dispatchEvent(new Event('fullscreenchange')));
    expect(screen.getByText('You left full screen. You can go back in.')).toBeInTheDocument();
    expect(screen.getByTestId('exam-screen')).toBeInTheDocument();
    const req = vi.fn(() => Promise.resolve());
    Object.defineProperty(document.documentElement, 'requestFullscreen', { configurable: true, value: req });
    fireEvent.click(screen.getByRole('button', { name: 'Go full screen' }));
    expect(req).toHaveBeenCalled();
    fsEl = document.documentElement;
    act(() => void document.dispatchEvent(new Event('fullscreenchange')));
    expect(screen.queryByText(/You left full screen/)).toBeNull();
  });
});
