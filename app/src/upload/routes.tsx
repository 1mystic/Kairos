import { lazy, Suspense } from 'react';
import type { RouteObject } from 'react-router';
import { Skeleton } from '../components/ui';
import { BankProvider } from '../store/bankHooks';

// pdf.js is only imported when a PDF is added (dynamic import in ./raster), and these screens are code-split.
const Wizard = lazy(() => import('./Wizard').then((m) => ({ default: m.Wizard })));
const BankPage = lazy(() => import('./BankPage').then((m) => ({ default: m.BankPage })));

const fallback = <div className="page"><Skeleton className="h-s8 w-full" /></div>;

/** Mount inside the AppLayout route in App.tsx (guest + signed-in). */
export const uploadRoutes: RouteObject[] = [
  { path: '/upload', element: <BankProvider><Suspense fallback={fallback}><Wizard /></Suspense></BankProvider> },
  { path: '/bank', element: <BankProvider><Suspense fallback={fallback}><BankPage /></Suspense></BankProvider> },
];
