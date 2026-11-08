import type { RouteObject } from 'react-router';
import { BankProvider } from '../store/bankHooks';
import { PracticePicker } from './Picker';
import { SessionScreen } from './SessionScreen';
import { SummaryScreen } from './Summary';

/** Mount inside the authenticated/guest AppLayout route in App.tsx. */
export const practiceRoutes: RouteObject[] = [
  { path: '/practice', element: <BankProvider><PracticePicker /></BankProvider> },
  { path: '/practice/summary/:sessionId', element: <BankProvider><SummaryScreen /></BankProvider> },
  { path: '/practice/:exam/:chapter', element: <BankProvider><SessionScreen /></BankProvider> },
];
