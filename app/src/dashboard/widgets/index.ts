import type { ComponentType } from 'react';
import type { WidgetId } from '../registry';
import { Activity } from './Activity';
import { Chapters } from './Chapters';
import { Mistakes } from './Mistakes';
import { NextMock } from './NextMock';
import { Plan } from './Plan';
import { Readiness } from './Readiness';
import type { WidgetProps } from './shared';
import { Stats } from './Stats';
import { Tip } from './Tip';
import { Trend } from './Trend';
import { Upload } from './Upload';

export const WIDGET_COMPONENTS: Record<WidgetId, ComponentType<WidgetProps>> = {
  readiness: Readiness, trend: Trend, stats: Stats, chapters: Chapters, plan: Plan, activity: Activity, tip: Tip, nextmock: NextMock, mistakes: Mistakes, upload: Upload,
};
export type { WidgetCtx, WidgetProps } from './shared';
