import type { RouteObject } from 'react-router';
import { BankProvider } from '../store/bankHooks';
import { PracticePicker } from './Picker';
import { SessionScreen } from './SessionScreen';
import { SummaryScreen } from './Summary';
import { TodaySessionScreen } from './today/TodaySessionScreen';

/** Mount inside the authenticated/guest AppLayout route in App.tsx. */
export const practiceRoutes: RouteObject[] = [
  { path: '/practice', element: <BankProvider><PracticePicker /></BankProvider> },
  { path: '/practice/summary/:sessionId', element: <BankProvider><SummaryScreen /></BankProvider> },
  // must stay before /practice/:exam/:chapter (that pattern needs two segments, but keep the order explicit)
  { path: '/practice/today', element: <BankProvider><TodaySessionScreen /></BankProvider> },
  { path: '/practice/:exam/:chapter', element: <BankProvider><SessionScreen /></BankProvider> },
];
