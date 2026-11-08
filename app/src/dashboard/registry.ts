/** Widget catalogue: metadata only (components live in widgets/index.ts so layout.ts stays free of React). */
export type Size = 's' | 'm' | 'l';
export const SIZE_LABEL: Record<Size, string> = { s: 'Small', m: 'Medium', l: 'Large' };
export type OptionValue = string | string[];

export interface OptionChoice { value: string; label: string }
export interface OptionSpec {
  key: string;
  label: string;
  kind: 'select' | 'multi';
  choices: readonly OptionChoice[];
  /** multi only */
  max?: number;
  default: OptionValue;
}

export type WidgetId = 'readiness' | 'trend' | 'stats' | 'chapters' | 'plan' | 'activity' | 'tip' | 'nextmock' | 'mistakes' | 'upload';

export interface WidgetMeta {
  id: WidgetId;
  title: string;
  description: string;
  /** desktop column from 1280px: the main (2fr) or side (1fr) column */
  zone: 'main' | 'side';
  sizes: readonly Size[];
  defaultSize: Size;
  defaultVisible: boolean;
  tone: 'default' | 'primary' | 'accent';
  options: readonly OptionSpec[];
}

export const STAT_CHOICES: readonly OptionChoice[] = [
  { value: 'questions', label: 'Questions solved' },
  { value: 'accuracy', label: 'Accuracy' },
  { value: 'time', label: 'Study time' },
  { value: 'streak', label: 'Active days and streak' },
  { value: 'mocks', label: 'Mocks taken' },
  { value: 'bestMock', label: 'Best mock score' },
  { value: 'backlog', label: 'Backlog size' },
  { value: 'buffer', label: 'Buffer days left' },
  { value: 'weakest', label: 'Weakest chapter' },
  { value: 'band', label: 'Predicted band' },
  { value: 'silly', label: 'Silly-mistake rate' },
  { value: 'avgTime', label: 'Avg time per question' },
];

export const TREND_METRICS: readonly OptionChoice[] = [
  { value: 'questions', label: 'Questions solved' },
  { value: 'accuracy', label: 'Accuracy %' },
  { value: 'minutes', label: 'Study minutes' },
  { value: 'mastery', label: 'Mastery' },
];

export const REGISTRY: readonly WidgetMeta[] = [
  { id: 'plan', title: 'Plan and pace', description: 'Days to your exam, phase and pace.', zone: 'side', sizes: ['s', 'm', 'l'], defaultSize: 'm', defaultVisible: true, tone: 'default', options: [] },
  {
    id: 'readiness', title: 'Readiness', description: 'Overall mastery or predicted score band.', zone: 'main', sizes: ['m', 'l'], defaultSize: 'm', defaultVisible: true, tone: 'primary',
    options: [{ key: 'view', label: 'Show', kind: 'select', choices: [{ value: 'mastery', label: 'Mastery %' }, { value: 'band', label: 'Predicted score band' }], default: 'mastery' }],
  },
  {
    id: 'stats', title: 'Stats', description: 'Up to four tiles of your choice.', zone: 'main', sizes: ['m', 'l'], defaultSize: 'l', defaultVisible: true, tone: 'default',
    options: [{ key: 'tiles', label: 'Tiles (up to 4)', kind: 'multi', choices: STAT_CHOICES, max: 4, default: ['questions', 'accuracy', 'time', 'streak'] }],
  },
  {
    id: 'trend', title: 'Trend', description: 'Bar chart by day.', zone: 'main', sizes: ['m', 'l'], defaultSize: 'l', defaultVisible: true, tone: 'default',
    options: [{ key: 'metric', label: 'Default metric', kind: 'select', choices: TREND_METRICS, default: 'questions' }],
  },
  { id: 'chapters', title: 'Top chapters', description: 'Where your time went.', zone: 'main', sizes: ['s', 'm', 'l'], defaultSize: 'm', defaultVisible: true, tone: 'default', options: [] },
  { id: 'activity', title: 'Activity', description: 'Practice, mocks and mastery changes.', zone: 'side', sizes: ['m', 'l'], defaultSize: 'm', defaultVisible: true, tone: 'default', options: [] },
  { id: 'tip', title: 'Try this', description: 'One suggestion from your own patterns.', zone: 'side', sizes: ['s', 'm'], defaultSize: 's', defaultVisible: true, tone: 'accent', options: [] },
  { id: 'nextmock', title: 'Next mock', description: 'Your next full-length practice.', zone: 'side', sizes: ['s', 'm'], defaultSize: 's', defaultVisible: false, tone: 'default', options: [] },
  { id: 'mistakes', title: 'Where questions slip', description: 'Questions by mistake type.', zone: 'main', sizes: ['s', 'm', 'l'], defaultSize: 'm', defaultVisible: false, tone: 'default', options: [] },
  { id: 'upload', title: 'Your own questions', description: 'Add questions and see your usage.', zone: 'side', sizes: ['s', 'm'], defaultSize: 's', defaultVisible: false, tone: 'default', options: [] },
];

export const WIDGET_IDS: readonly WidgetId[] = REGISTRY.map((w) => w.id);
export const metaOf = (id: string): WidgetMeta | undefined => REGISTRY.find((w) => w.id === id);
export const defaultOptions = (m: WidgetMeta): Record<string, OptionValue> => Object.fromEntries(m.options.map((o) => [o.key, Array.isArray(o.default) ? [...o.default] : o.default]));
