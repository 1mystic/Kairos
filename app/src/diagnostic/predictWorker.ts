/// <reference lib="webworker" />
import { runPredict, type PredictInput } from './predicted';

self.onmessage = (e: MessageEvent<PredictInput>) => {
  try {
    (self as unknown as Worker).postMessage({ ok: true, band: runPredict(e.data) });
  } catch (err) {
    (self as unknown as Worker).postMessage({ ok: false, error: String(err) });
  }
};
