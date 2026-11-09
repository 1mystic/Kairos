import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import { App } from './App';
import { installTelemetry } from './telemetry';
import { loadHostingConfig } from './lib/firebase';

// Production: fetch the public Firebase web config from Hosting's reserved /__/firebase/init.json first (no-op when the
// build already has it, in emulator mode, or in dev), then render. Nothing touches Firebase before this resolves.
void loadHostingConfig().finally(() => {
  installTelemetry();
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
});
